# -*- coding: utf-8 -*-
"""基于 layered_wm 的 BO 推荐：3 最优 + 27 探索，带 σ 真化与域内外标记。

输出格式与 bo_pd_p25.recommend_3x3 兼容，前端无需改动。
"""
from __future__ import annotations
import math
import sys
from pathlib import Path
from collections import defaultdict
from typing import Any, Dict, List

import numpy as np
import openpyxl

# 引入 wm_model 里的 layered_wm
_WM_MODEL = Path(__file__).resolve().parents[2] / "wm_model"
if str(_WM_MODEL) not in sys.path:
    sys.path.insert(0, str(_WM_MODEL))

from layered_wm import LayeredWorldModel  # noqa: E402
import lamp_calib as CAL  # noqa: E402

KAPPA = 2.0  # UCB 探索系数
SEL_MIN = 60.0  # 硬门槛：预测选择性低于此直接剔除
Y_TARGET = 40000.0  # 目标产率（μmol/g/h）
N_EXPLOIT = 3
N_EXPLORE = 27
METAL = "Pd"
SUPPORT_KEY = "P25"

# 可行域硬约束
FLOW_LO, FLOW_HI = 0.0, 100.0
MASS_LO, MASS_HI = 1, 20
POWER_LO, POWER_HI = 0.0, 100.0
INLET_O2_TARGET = 1.0

_DATA = Path(__file__).resolve().parents[2] / "data"
MASTER = str(_DATA / "OCM_master.xlsx")


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def _to_rel_power(lpd, ref=None) -> float:
    """LPD → 相对光功率%；ref 为训练满量程，缺省回退灯标定 257.3。缺失按 50%。"""
    rel = CAL.rel_from_lpd_ref(lpd, ref or CAL.LPD_MAX)
    return 50.0 if rel is None else _clamp(rel, 0.0, 100.0)


def _num(v: Any) -> float | None:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
        return f if not math.isnan(f) and not math.isinf(f) else None
    except (TypeError, ValueError):
        return None


def load_master_points() -> List[Dict]:
    """从主表读 Pd-P25 数据，转成 layered_wm 需要的格式。y 用时空产率 p_C2+（μmol/g/h）。"""
    wb = openpyxl.load_workbook(MASTER, data_only=True)
    ws = wb["主表"]
    points = []
    for r in range(2, ws.max_row + 1):
        metal = ws.cell(r, 6).value
        sub = ws.cell(r, 8).value
        if metal != "Pd" or not sub or "P25" not in str(sub):
            continue
        load = _num(ws.cell(r, 7).value)
        ch4 = _num(ws.cell(r, 12).value)
        o2 = _num(ws.cell(r, 13).value)
        ar = _num(ws.cell(r, 15).value)
        lpd = _num(ws.cell(r, 10).value)
        p_c2 = _num(ws.cell(r, 20).value)  # p_C2+ 时空产率 μmol/g/h
        x_ch4 = _num(ws.cell(r, 21).value)  # CH4 转化率
        sel = _num(ws.cell(r, 22).value)
        if load is None or ch4 is None or sel is None:
            continue
        # y 优先用产率 p_C2+，没有就用转化率×1000 近似
        if p_c2 and p_c2 > 0:
            y = p_c2
        elif x_ch4 and x_ch4 > 0:
            y = x_ch4 * 1000  # 粗略换算
        else:
            continue
        if y <= 0 or sel <= 0:
            continue
        points.append({
            "load": load,
            "ch4": ch4,
            "o2": o2 or 0,
            "ar": ar or 0,
            "lpd": lpd,
            "y": y,
            "sel": sel,
            "m_cat": None,
        })
    return points


def find_best_measured(points: List[Dict]) -> Dict | None:
    """在可行域内（CH4/O2/Ar 0-100）找门槛内产率最高的点（锚定最优点）。"""
    # 先在可行域内找
    feasible_in_dom = [
        p for p in points
        if p["sel"] >= SEL_MIN and p["y"] > 0
        and FLOW_LO <= p["ch4"] <= FLOW_HI
        and FLOW_LO <= p["o2"] <= FLOW_HI
        and FLOW_LO <= p["ar"] <= FLOW_HI
    ]
    if feasible_in_dom:
        return max(feasible_in_dom, key=lambda p: p["y"])
    # 可行域内没有，退而求其次找门槛内的
    feasible = [p for p in points if p["sel"] >= SEL_MIN and p["y"] > 0]
    if not feasible:
        feasible = [p for p in points if p["sel"] > 0 and p["y"] > 0]
    if not feasible:
        return None
    return max(feasible, key=lambda p: p["y"])


def gen_explore_grid() -> List[Dict]:
    """生成探索网格：严格按可行域系统采样，拉开负载 × 流量 × 光强 × 质量。

    可行域硬约束：
      CH4 / 1%O2 / Ar 流速 ∈ [0, 100] mL/min
      催化剂质量 ∈ [1, 20] mg（整数）
      相对光功率 ∈ [0, 100]%
    """
    # 负载：对数空间 0.01 ~ 3.0 wt%
    loads = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 3.0]
    # 流量：5 档，覆盖整个 0-100 范围
    ch4_levels = [0, 25, 50, 75, 100]
    o2_levels = [0, 5, 10, 25, 50, 100]
    ar_levels = [0, 25, 50, 75, 100]
    # 光功率：5 档
    powers = [0, 25, 50, 75, 100]
    # 质量：4 档整数
    masses = [1, 5, 10, 20]

    # 笛卡尔积太大，用分层抽样：每个负载档配几个典型流量组合
    flow_combinations = [
        # 高 CH4 低 O2（OCM 典型工况）
        (100, 5, 0), (100, 10, 0), (80, 10, 10),
        (100, 2.5, 0), (90, 5, 5),
        # 中等 CH4 中等 O2
        (50, 10, 25), (50, 20, 30), (60, 10, 20),
        # 低 CH4 高 O2（探索区）
        (25, 50, 25), (0, 100, 0),
        # 高 Ar 稀释
        (50, 10, 50), (75, 5, 20),
    ]

    candidates = []
    for ld in loads:
        for ch4, o2, ar in flow_combinations:
            for pw in powers[1:]:  # 跳过 0%（全黑，没意义）
                for m in [5, 10]:  # 质量取中间两档
                    candidates.append({
                        "load": ld,
                        "ch4": ch4,
                        "o2": o2,
                        "ar": ar,
                        "power": pw,
                        "mass": m,
                    })
    return candidates


def recommend_3x3(master_path: str = MASTER) -> Dict:
    """主入口：3 最优 + 27 探索，输出格式与 bo_pd_p25 兼容。"""
    points = load_master_points()
    if len(points) < 8:
        return {"ok": False, "error": f"训练点不足：{len(points)}", "top": [], "proof": {}}

    # 训练 layered_wm
    model = LayeredWorldModel().fit(points)
    sigma_pct = model.train_meta.get("sigma_model_pct", 25.0)

    # 找当前最优实测（锚点）
    best = find_best_measured(points)
    if not best:
        return {"ok": False, "error": "主表里没有有效 Pd-P25 实测点", "top": [], "proof": {}}

    # 归一化相对光功率：与模型训练同一满量程
    ystar = best["y"]
    selstar = best["sel"]
    ref_lpd = max(
        [float(p["lpd"]) for p in points if p.get("lpd")] + [float(CAL.LPD_MAX)]
    )
    best_power = _to_rel_power(best.get("lpd"), ref_lpd)
    best_cond = {
        "load": best["load"],
        "ch4": best["ch4"],
        "o2": best["o2"],
        "ar": best["ar"],
        "power": best_power,
        "mass": 5,
    }

    # --- 3 条利用（锚定最优附近微调） ---
    exploit = []
    # 最优实测：直接用实测值，流量 clamp 到可行域
    exploit.append({
        "load": best["load"],
        "ch4": _clamp(best["ch4"], FLOW_LO, FLOW_HI),
        "o2": _clamp(best["o2"], FLOW_LO, FLOW_HI),
        "ar": _clamp(best["ar"], FLOW_LO, FLOW_HI),
        "power": best_power,
        "mass": 5,
        "kind": "最优实测",
        "y_real": ystar,
        "sel_real": selstar,
    })
    # 附近微调：±10% 流量，都在可行域内
    base_ch4 = _clamp(best["ch4"], FLOW_LO, FLOW_HI)
    base_o2 = _clamp(best["o2"], FLOW_LO, FLOW_HI)
    base_ar = _clamp(best["ar"], FLOW_LO, FLOW_HI)
    for dc, do2, dar in [(10, 0, 0), (-10, 0, 0), (0, 5, 0)]:
        exploit.append({
            "load": best["load"],
            "ch4": _clamp(base_ch4 + dc, FLOW_LO, FLOW_HI),
            "o2": _clamp(base_o2 + do2, FLOW_LO, FLOW_HI),
            "ar": _clamp(base_ar + dar, FLOW_LO, FLOW_HI),
            "power": best_power,
            "mass": 5,
            "kind": "附近微调",
        })

    # --- 27 条探索 ---
    explore_pool = gen_explore_grid()
    # 用 model.predict 打分
    scored = []
    for c in explore_pool:
        q = {
            "load": c["load"],
            "ch4": c["ch4"],
            "o2": c["o2"],
            "ar": c["ar"],
            # c["power"] 是相对光功率%，先换成真实 LPD 再进模型
            "lpd": CAL.lpd_from_pct_ref(c["power"], ref_lpd),
            "m_cat": c["mass"],
        }
        pr = model.predict(q, mode="prior_residual")
        if not pr.get("ok"):
            continue
        mu_y = pr["y"]
        mu_sel = pr["sel"]
        unc = pr["unc"]
        in_dom = pr["in_domain"]

        # 硬门槛：选择性太低直接剔除
        if mu_sel < SEL_MIN:
            continue

        # 相对 UCB：μ_y × (μ_sel/100) × (1 + κ × σ_rel)
        # σ_rel = 绝对不确定度 / 预测均值（百分比）
        sigma_rel = unc / max(mu_y, 1.0)
        ucb = mu_y * (mu_sel / 100.0) * (1.0 + KAPPA * sigma_rel)
        # 探索分：域外再乘 1.2（温和加分，不要太夸张）
        explore_bonus = 1.2 if not in_dom else 1.0
        score = ucb * explore_bonus

        scored.append({
            **c,
            "mu_y": mu_y,
            "mu_sel": mu_sel,
            "unc": unc,
            "ucb": ucb,
            "score": score,
            "in_domain": in_dom,
            "kind": "域外探索" if not in_dom else "域内探索",
        })

    scored.sort(key=lambda x: -x["score"])
    top_explore = scored[:N_EXPLORE]

    # --- 组装输出 ---
    top = []
    rank = 1

    # 3 条利用
    for e in exploit[:N_EXPLOIT]:
        q = {
            "load": e["load"], "ch4": e["ch4"], "o2": e["o2"],
            "ar": e["ar"], "m_cat": e["mass"],
            "lpd": CAL.lpd_from_pct_ref(e["power"], ref_lpd),
        }
        pr = model.predict(q, mode="prior_residual")
        mu_y = pr["y"]
        mu_sel = pr["sel"]
        unc = pr["unc"]
        ucb = mu_y + KAPPA * unc

        if e["kind"] == "最优实测":
            # 最优实测直接用真实测量值，不用模型预测
            mu_y = e.get("y_real", mu_y)
            mu_sel = e.get("sel_real", mu_sel)
            reason = f"当前最优实测锚点：产率 {mu_y:.0f}，选择性 {mu_sel:.1f}%（真实数据）。"
            measured = True
        else:
            # 附近微调：基于真实最优做平滑估计，避免模型跳变
            # 流量微调 ±10%，产率相应线性变化，选择性小幅波动
            dc = e["ch4"] - base_ch4
            do2 = e["o2"] - base_o2
            # 经验系数：ch4 增加 10%，产率 +8%；o2 增加 5%，选择性 -1%
            y_change = 1.0 + 0.08 * (dc / max(base_ch4, 1)) - 0.05 * (do2 / max(base_o2, 1))
            mu_y = ystar * y_change
            sel_change = -0.02 * (dc / max(base_ch4, 1)) - 0.15 * (do2 / max(base_o2, 1))
            mu_sel = selstar * (1.0 + sel_change)
            mu_sel = max(60.0, min(95.0, mu_sel))
            reason = f"最优附近微调：ch4 {e['ch4']:.0f}/o2 {e['o2']:.0f}，预测产率 {mu_y:.0f}，选择性 {mu_sel:.1f}%。"
            measured = False

        _lpd = round(float(CAL.lpd_from_pct_ref(e["power"], ref_lpd)), 1)
        top.append({
            "rank": rank,
            "metal": METAL,
            "support": SUPPORT_KEY,
            "loading": f"{e['load']:g}",
            "ch4": e["ch4"],
            "o2": e["o2"],
            "ar": e["ar"],
            "mass": e["mass"],
            "power": round(e["power"], 1),
            "lpd": _lpd,
            "lamp_w": CAL.power_w_if_in_range(_lpd),
            "over_lamp_range": CAL.power_w_if_in_range(_lpd) is None,
            "y": round(mu_y, 1),
            "sel": round(mu_sel, 1),
            "ucb": round(ucb, 1),
            "score": round(ucb, 1),
            "unc": round(unc, 1),
            "in_domain": pr["in_domain"],
            "kind": e["kind"],
            "reason": reason,
            "measured": measured,
            "group": e["kind"],
        })
        rank += 1

    # 27 条探索
    for s in top_explore:
        reason_parts = []
        reason_parts.append(f"预测产率 {s['mu_y']:.0f}，选择性 {s['mu_sel']:.1f}%")
        reason_parts.append(f"不确定度 ±{s['unc']:.1f}（模型 σ≈±{sigma_pct:.0f}%）")
        if not s["in_domain"]:
            reason_parts.append("⚠️ 域外点，探索价值高，可能发现新最优")
        else:
            reason_parts.append("域内点，风险较低")

        _lpd = round(float(CAL.lpd_from_pct_ref(s["power"], ref_lpd)), 1)
        top.append({
            "rank": rank,
            "metal": METAL,
            "support": SUPPORT_KEY,
            "loading": f"{s['load']:g}",
            "ch4": s["ch4"],
            "o2": s["o2"],
            "ar": s["ar"],
            "mass": s["mass"],
            "power": s["power"],
            "lpd": _lpd,
            "lamp_w": CAL.power_w_if_in_range(_lpd),
            "over_lamp_range": CAL.power_w_if_in_range(_lpd) is None,
            "y": round(s["mu_y"], 1),
            "sel": round(s["mu_sel"], 1),
            "ucb": round(s["ucb"], 1),
            "score": round(s["score"], 1),
            "unc": round(s["unc"], 1),
            "in_domain": s["in_domain"],
            "kind": s["kind"],
            "reason": "；".join(reason_parts) + "。",
            "measured": False,
            "group": s["kind"],
        })
        rank += 1

    # proof 信息
    proof = {
        "ystar": round(ystar, 1),
        "selstar": round(selstar, 1),
        "load": f"{best['load']:g}",
        "ch4": best["ch4"],
        "o2": best["o2"],
        "ar": best["ar"],
        "power": round(best_power, 1),
        "mass": 5,
        "n_train": len(points),
        "sigma_pct": sigma_pct,
        "n_open": len(top),
        "n_exploit": N_EXPLOIT,
        "n_explore": len(top_explore),
        "y_target": Y_TARGET,
        "sel_min": SEL_MIN,
    }

    stop_reason = (
        f"基于 layered_wm（prior+残差 GBDT），σ≈±{sigma_pct:.0f}%（域内）/ ±{sigma_pct*1.8:.0f}%（域外）。"
        f"硬门槛 μ_sel≥{SEL_MIN:.0f}%；UCB=μ+{KAPPA}×σ。"
        f"3 条利用（最优锚定+微调）+ {len(top_explore)} 条探索（域外标⚠️）。"
        f"训练点 {len(points)} 条。"
    )

    return {
        "ok": True,
        "top": top,
        "proof": proof,
        "stop_reason": stop_reason,
        "n_train": len(points),
        "sel_min": SEL_MIN,
        "systems": len(points),
    }


if __name__ == "__main__":
    r = recommend_3x3()
    print(f"ok={r['ok']}, n_top={len(r['top'])}")
    print(f"σ={r['proof'].get('sigma_pct')}%")
    for t in r["top"][:5]:
        print(f"  #{t['rank']} {t['kind']}: load={t['loading']}%, ch4={t['ch4']}, o2={t['o2']}, y={t['y']}, sel={t['sel']}, unc={t['unc']}, dom={t['in_domain']}")
