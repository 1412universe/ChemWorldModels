# -*- coding: utf-8 -*-
"""Pd–P25 条件级 BO：3 条理论最优 + 27 条未知空间探索。

目标（在可行域内）：score 排序，冲高产率（宜 > Y_TARGET，当前最高约 40077）。
  1) 硬门槛：μ_sel < SEL_MIN → 直接剔除
  2) score = μ_y × (μ_sel / 100)
  3) 结构：3 条利用（高产实测锚定）+ 27 条探索
  4) 探索同时拉开负载量 × CH4/O2/Ar/光功率，先把未知空间铺开

可行域硬约束（推荐不得突破）：
  CH4 / 1%O2 / Ar 流速 ∈ [0, 100] mL/min
  催化剂质量 ∈ [1, 20] mg（整数）
  相对光功率 ∈ [0, 100]%（由历史光强 / Pd-P25 最大光强换算）
  进料氧锚定 1%
"""
from __future__ import annotations

import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import openpyxl

KAPPA = 1.96  # 仅用于计算 UCB 参考列，不参与排序
SEL_MIN = 60.0  # 硬门槛：预测选择性低于此直接剔除
Y_TARGET = 40000.0  # 产率宜超过此值（主表当前最高约 40077）
N_EXPLOIT = 3        # 理论最优 / 利用锚定
N_EXPLORE = 27       # 未知空间探索（含负载量）
N_TOTAL = N_EXPLOIT + N_EXPLORE
METAL = "Pd"
SUPPORT_KEY = "P25"  # 载体名含 P25 即视为同族

# 实验可行域（硬约束，推荐不得突破）
FLOW_LO, FLOW_HI = 0.0, 100.0          # CH4 / 1%O2 / Ar 流速 mL/min
MASS_LO, MASS_HI = 1, 20               # 催化剂质量 mg，整数
POWER_LO, POWER_HI = 0.0, 100.0        # 相对光功率 %
INLET_O2_TARGET = 1.0                  # 推荐锚定进料氧 1%

_DATA = Path(__file__).resolve().parents[2] / "data"
MASTER = str(_DATA / "OCM_master.xlsx")


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def _clip_flow(v: Any) -> float:
    return round(_clamp(float(v), FLOW_LO, FLOW_HI), 1)


def _clip_power(v: Any) -> float:
    return round(_clamp(float(v), POWER_LO, POWER_HI), 1)


def _clip_mass(v: Any) -> int:
    return int(round(_clamp(float(v), MASS_LO, MASS_HI)))


def _in_flow_dom(ch4: float, o2: float, ar: float) -> bool:
    return (
        FLOW_LO <= ch4 <= FLOW_HI
        and FLOW_LO <= o2 <= FLOW_HI
        and FLOW_LO <= ar <= FLOW_HI
    )


def _in_dom(cond: Dict[str, Any]) -> bool:
    try:
        ch4, o2, ar = float(cond["ch4"]), float(cond["o2"]), float(cond["ar"])
        power = float(cond["power"])
        mass = int(cond.get("mass") or MASS_LO)
    except (KeyError, TypeError, ValueError):
        return False
    return (
        _in_flow_dom(ch4, o2, ar)
        and POWER_LO <= power <= POWER_HI
        and MASS_LO <= mass <= MASS_HI
    )


def _spread_masses(n: int = N_TOTAL) -> List[int]:
    """推荐在 1–20 mg 拉开整数质量。"""
    if n <= 1:
        return [5]
    out = []
    for i in range(n):
        out.append(int(round(MASS_LO + i * (MASS_HI - MASS_LO) / (n - 1))))
    for i in range(1, len(out)):
        if out[i] <= out[i - 1]:
            out[i] = min(MASS_HI, out[i - 1] + 1)
    return out


def _attach_power(points: List[Dict[str, Any]]) -> float:
    """历史光强 mW/cm² → 相对光功率% = lpd / Pd-P25 最大光强 × 100。"""
    lpds = [p["lpd"] for p in points if p.get("lpd") is not None and p["lpd"] > 0]
    ref = float(max(lpds)) if lpds else 1.0
    for p in points:
        if p.get("lpd") is not None and ref > 0:
            p["power"] = _clip_power(100.0 * float(p["lpd"]) / ref)
        else:
            p["power"] = None
    return ref


def _clean_sup(s: Any) -> str:
    return re.sub(r"-\d+$", "", str(s or "").strip())


def _num(v: Any) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, str):
        t = v.strip()
        if t in ("", "NA", "ΝΑ", "室温") or t.startswith("="):
            return None
        try:
            return float(t)
        except ValueError:
            return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _col(hdr: List[Any], name: str) -> int:
    for i, h in enumerate(hdr):
        if not h:
            continue
        hs = str(h)
        if hs == name or hs.startswith(name + " (") or hs.startswith(name + "("):
            return i
    # 宽松：前缀
    for i, h in enumerate(hdr):
        if h and str(h).startswith(name):
            return i
    raise KeyError(name)


def _is_p25(sup: Any) -> bool:
    s = _clean_sup(sup).lower()
    return "p25" in s or s.replace(" ", "") in ("tio2", "a-tio2", "anatase")


def _sel_weight(mu_sel: float) -> float:
    """线性选择性权重 μ_sel/100。"""
    return float(max(0.0, float(mu_sel)) / 100.0)


def _score(mu_y: float, mu_sel: float, sel_min: float = SEL_MIN) -> Optional[float]:
    """综合分 score = μ_y × (μ_sel / 100)。硬门槛不通过返回 None。"""
    if mu_sel < sel_min:
        return None
    return float(mu_y) * _sel_weight(mu_sel)


def _rank_key_score(score: Optional[float], mu_y: float = 0.0):
    """按 score 降序；同分时产率高者优先（便于冲 Y_TARGET）。"""
    return (-(score if score is not None else -1.0), -float(mu_y))


def _round_load(x: float) -> float:
    """负载量化到常见精度，便于分组。"""
    if x <= 0:
        return x
    # 0.01 精度，常见 0.02/0.025/0.05/0.1
    r = round(x * 1000) / 1000.0
    if abs(r - 0.025) < 1e-6:
        return 0.025
    return round(x * 100) / 100.0


def _compute_from_inputs(ch4, o2, ar, c_o2_in, c_co, c_co2, c_c2h4, c_c2h6, m_cat):
    """公式未缓存时，补算 p_C2+ / sel_C2+ / 分量产率与选择性。"""
    empty = (None, None, None, None, None, None)
    if None in (ch4, o2, ar, c_c2h4, c_c2h6, m_cat) or m_cat <= 0:
        return empty
    gas_flow = ch4 + o2 + ar
    if gas_flow <= 0:
        return empty
    q = 60.0
    s = 8.314 * 298.15 / 101325 * 1e6
    r_c2h4 = gas_flow * q / s * c_c2h4
    r_c2h6 = gas_flow * q / s * c_c2h6
    r_co2 = gas_flow * q / s * c_co2 if c_co2 is not None else 0.0
    r_co = gas_flow * q / s * c_co if c_co is not None else 0.0
    r_total = r_c2h4 * 2 + r_c2h6 * 2 + r_co2 + r_co
    p_c2h4 = r_c2h4 / m_cat * 1000.0
    p_c2h6 = r_c2h6 / m_cat * 1000.0
    p_c2 = p_c2h4 + p_c2h6
    if r_total <= 0:
        return p_c2, None, p_c2h4, p_c2h6, None, None
    sel_c2h4 = r_c2h4 * 2 / r_total * 100.0
    sel_c2h6 = r_c2h6 * 2 / r_total * 100.0
    sel = sel_c2h4 + sel_c2h6
    return p_c2, sel, p_c2h4, p_c2h6, sel_c2h4, sel_c2h6


def _split_yields(y: float, sel: float, sel_c2h4: Optional[float], sel_c2h6: Optional[float]):
    """用分量选择性把 p_C2+ 拆成 p_C2H4 / p_C2H6。"""
    if y is None or y <= 0:
        return None, None
    s4 = sel_c2h4 if sel_c2h4 is not None else 0.0
    s6 = sel_c2h6 if sel_c2h6 is not None else 0.0
    denom = s4 + s6
    if denom <= 1e-9 and sel and sel > 0:
        # 无分量时先不拆
        return None, None
    if denom <= 1e-9:
        return None, None
    return float(y) * s4 / denom, float(y) * s6 / denom


def load_pd_p25_points(master_path: str = MASTER) -> List[Dict[str, Any]]:
    """读主表，抽出 Pd–P25 有效点（尽量补算公式空值）。"""
    wb = openpyxl.load_workbook(master_path, data_only=True)
    ws = wb["主表"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])
    # 无缓存时再读公式簿补输入列
    wb_f = openpyxl.load_workbook(master_path, data_only=False)
    rows_f = list(wb_f["主表"].iter_rows(values_only=True))

    def C(name: str) -> int:
        return _col(hdr, name)

    ix = {
        "metal": C("金属"),
        "load": C("负载量/wt%"),
        "sup": C("载体"),
        "lpd": C("光强/(mW·cm⁻²)"),
        "ch4": C("CH4流量/(mL·min⁻¹)"),
        "o2": C("O2流量/(mL·min⁻¹)"),
        "ar": C("Ar流量/(mL·min⁻¹)"),
        "y": C("p_C2+时空产率"),
        "sel": C("C2+选择性/%"),
        "sel_c2h4": C("C2H4选择性/%"),
        "sel_c2h6": C("C2H6选择性/%"),
        "c2h4": C("C2H4浓度/ppm"),
        "c2h6": C("C2H6浓度/ppm"),
        "co2": C("CO2浓度/ppm"),
        "o2_in": C("c_O2/%（进料）"),
    }
    # optional
    try:
        ix["m_cat"] = C("催化剂质量/mg")
    except KeyError:
        ix["m_cat"] = None
    try:
        ix["c_co"] = C("CO浓度/ppm")
    except KeyError:
        ix["c_co"] = None

    points = []
    for ri, (r, rf) in enumerate(zip(rows[1:], rows_f[1:]), start=2):
        metal = str(r[ix["metal"]] or "").strip()
        if metal != METAL:
            continue
        if not _is_p25(r[ix["sup"]]):
            continue
        load = _num(r[ix["load"]])
        if load is None:
            load = _num(rf[ix["load"]])
        if load is None or load <= 0:
            continue

        def take(key):
            v = _num(r[ix[key]]) if key in ix and ix[key] is not None else None
            if v is None and key in ix and ix[key] is not None:
                v = _num(rf[ix[key]])
            return v

        y = take("y")
        sel = take("sel")
        sel_c2h4, sel_c2h6 = take("sel_c2h4"), take("sel_c2h6")
        ch4, o2, ar = take("ch4"), take("o2"), take("ar")
        lpd = take("lpd")
        c2h4, c2h6, co2 = take("c2h4"), take("c2h6"), take("co2")
        o2_in = take("o2_in")
        m_cat = take("m_cat") if ix.get("m_cat") is not None else None
        c_co = take("c_co") if ix.get("c_co") is not None else None
        p_c2h4 = p_c2h6 = None

        if y is None or sel is None or sel_c2h4 is None or sel_c2h6 is None:
            cy, cs, py4, py6, ss4, ss6 = _compute_from_inputs(
                ch4, o2, ar, o2_in, c_co, co2, c2h4, c2h6, m_cat or 5.0
            )
            if y is None:
                y = cy
            if sel is None:
                sel = cs
            if sel_c2h4 is None:
                sel_c2h4 = ss4
            if sel_c2h6 is None:
                sel_c2h6 = ss6
            p_c2h4, p_c2h6 = py4, py6

        if y is None or y <= 0 or sel is None or sel <= 0:
            continue
        if ch4 is None or ch4 <= 0:
            continue
        if p_c2h4 is None or p_c2h6 is None:
            p_c2h4, p_c2h6 = _split_yields(y, sel, sel_c2h4, sel_c2h6)

        points.append({
            "load": _round_load(load),
            "ch4": ch4,
            "o2": o2 if o2 is not None else 0.0,
            "ar": ar if ar is not None else 0.0,
            "lpd": lpd,
            "o2_in": o2_in,
            "y": float(y),
            "sel": float(sel),
            "sel_c2h4": float(sel_c2h4) if sel_c2h4 is not None else None,
            "sel_c2h6": float(sel_c2h6) if sel_c2h6 is not None else None,
            "p_c2h4": float(p_c2h4) if p_c2h4 is not None else None,
            "p_c2h6": float(p_c2h6) if p_c2h6 is not None else None,
            "c2h4": c2h4,
            "c2h6": c2h6,
            "co2": co2,
            "m_cat": m_cat,
            "row": ri,
        })
    wb.close()
    wb_f.close()
    return points


def _group_stats(pts: List[Dict[str, Any]], pooled_sigma: Optional[float] = None) -> Dict[str, Any]:
    ys = np.array([p["y"] for p in pts], dtype=float)
    ss = np.array([p["sel"] for p in pts], dtype=float)
    n = len(ys)
    mu = float(ys.mean())
    if n >= 2:
        sigma = float(ys.std(ddof=1))
    else:
        # 单点：用全局池化 σ，避免 UCB 虚高抢走名额
        sigma = float(pooled_sigma) if pooled_sigma and pooled_sigma > 0 else max(mu * 0.25, 1.0)
    mu_sel = float(ss.mean())
    sig_sel = float(ss.std(ddof=1)) if n >= 2 else 8.0
    # 小样本：用 n_eff≥3 压探索项，避免 n=1 压过 n=200
    n_eff = max(float(n), 3.0)
    se = sigma / math.sqrt(n_eff)
    ucb = mu + KAPPA * se

    # 条件统计优先：可行域内 → 选择性过门槛 → 进料氧≈1%
    # 避免被「1%进料但 sel 极低」的点把中位条件拉飞
    dom = [p for p in pts if _in_flow_dom(p["ch4"], p["o2"], p["ar"])]
    base = dom if dom else pts
    hi_sel = [p for p in base if p["sel"] >= SEL_MIN]
    pool = hi_sel if hi_sel else base
    inlet = [
        p for p in pool
        if p.get("o2_in") is not None and abs(float(p["o2_in"]) - INLET_O2_TARGET) <= 0.05
    ]
    cond_pts = inlet if inlet else pool

    o2_pos = [p["o2"] for p in cond_pts if p["o2"] and p["o2"] > 0]
    o2_lo = float(min(o2_pos)) if o2_pos else 1.0
    o2_hi = float(max(p["o2"] for p in cond_pts))
    o2_med = float(np.median(o2_pos)) if o2_pos else float(np.median([p["o2"] for p in cond_pts]))
    # 相对光功率统计
    pw = [p["power"] for p in cond_pts if p.get("power") is not None]
    if not pw:
        pw = [p["power"] for p in pts if p.get("power") is not None]
    power_med = float(np.median(pw)) if pw else 50.0
    power_lo = float(min(pw)) if pw else 0.0
    power_hi = float(max(pw)) if pw else 100.0
    # 利用点：可行域内按 score=μ_y×(μ_sel/100)，同分偏高产率
    best = max(
        cond_pts,
        key=lambda p: (_score(p["y"], p["sel"]) or -1.0, p["y"]),
    )
    # 负载排序用锚点子集成绩，避免被域外/低 sel 点拉低
    mu_rank = float(np.mean([p["y"] for p in cond_pts]))
    mu_sel_rank = float(np.mean([p["sel"] for p in cond_pts]))
    return {
        "n": n,
        "mu": mu,
        "sigma": sigma,
        "se": se,
        "ucb": ucb,
        "mu_sel": mu_sel,
        "mu_rank": mu_rank,
        "mu_sel_rank": mu_sel_rank,
        "sig_sel": sig_sel,
        "pts": pts,
        "cond_pts": cond_pts,
        "ch4_med": float(np.median([p["ch4"] for p in cond_pts])),
        "o2_med": o2_med,
        "ar_med": float(np.median([p["ar"] for p in cond_pts])),
        "power_med": power_med,
        "ch4_lo": float(min(p["ch4"] for p in cond_pts)),
        "ch4_hi": float(max(p["ch4"] for p in cond_pts)),
        "o2_lo": o2_lo,
        "o2_hi": o2_hi,
        "ar_lo": float(min(p["ar"] for p in cond_pts)),
        "ar_hi": float(max(p["ar"] for p in cond_pts)),
        "power_lo": power_lo,
        "power_hi": power_hi,
        "best": best,
    }


def select_three_loadings(by_load: Dict[float, Dict[str, Any]]) -> List[float]:
    """选 3 个负载：硬门槛内按 score 排；优先样本够、log 负载拉开；偏好高产率档。"""
    MIN_N = 2
    scored = []
    for load, st in by_load.items():
        sc = _score(st.get("mu_rank", st["mu"]), st.get("mu_sel_rank", st["mu_sel"]))
        scored.append((load, st, sc))

    def rank_key(t):
        L, st, sc = t
        n_pen = 1.0 if st["n"] >= MIN_N else 0.35
        my = st.get("mu_rank", st["mu"])
        y_bonus = 1.15 if my >= Y_TARGET else 1.0
        return (-((sc or -1) * n_pen * y_bonus), -my, -st["n"])

    ok = [t for t in scored if t[2] is not None]
    ok.sort(key=rank_key)

    chosen: List[float] = []

    def far_enough(L: float) -> bool:
        if not chosen:
            return True
        # log10 负载至少差 ~0.3（约 2×）
        return all(abs(math.log10(max(L, 1e-4)) - math.log10(max(c, 1e-4))) >= 0.25 for c in chosen)

    # 先尽量拉开 + 样本够
    for prefer_n in (True, False):
        for L, st, sc in ok:
            if L in chosen:
                continue
            if prefer_n and st["n"] < MIN_N:
                continue
            if not far_enough(L):
                continue
            chosen.append(L)
            if len(chosen) >= 3:
                return chosen[:3]

    # 放宽距离
    for L, st, sc in ok:
        if L not in chosen:
            chosen.append(L)
        if len(chosen) >= 3:
            break
    if len(chosen) < 3:
        rest = sorted(scored, key=lambda t: (-t[1]["n"], -t[1]["mu"]))
        for L, _, _ in rest:
            if L not in chosen:
                chosen.append(L)
            if len(chosen) >= 3:
                break
    for d in (0.02, 0.05, 0.1, 0.5):
        if len(chosen) >= 3:
            break
        if d not in chosen:
            chosen.append(d)
    return chosen[:3]


def _make_cond(kind: str, mode: str, ch4, o2, ar, power, mass: int = 5) -> Dict[str, Any]:
    """生成并钳到可行域的条件。"""
    return {
        "kind": kind,
        "mode": mode,
        "ch4": _clip_flow(ch4),
        "o2": _clip_flow(o2),
        "ar": _clip_flow(ar),
        "power": _clip_power(power),
        "mass": _clip_mass(mass),
        "o2_in": INLET_O2_TARGET,
    }


def _cond_key(c: Dict[str, Any]) -> Tuple:
    load = float(c.get("loading") if c.get("loading") is not None else -1.0)
    return (load, float(c["ch4"]), float(c["o2"]), float(c["ar"]), float(c["power"]))


def _explore_loadings(known_loads: List[float]) -> List[float]:
    """已知负载 + 几何插值/扩展，把负载探索点铺开。"""
    extras = [
        0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.075,
        0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0,
    ]
    out = set(float(x) for x in known_loads) | set(extras)
    # 相邻已知负载的几何中点
    ks = sorted(x for x in known_loads if x and x > 0)
    for a, b in zip(ks, ks[1:]):
        mid = math.sqrt(a * b)
        if mid not in out:
            out.add(round(mid, 4))
    return sorted(out)


def _st_for_load(
    load: float,
    by_load: Dict[float, Dict[str, Any]],
    global_st: Dict[str, Any],
) -> Dict[str, Any]:
    """取该负载后验；无样本则借最近负载，再退全局。"""
    if load in by_load and by_load[load]["n"] >= 1:
        return by_load[load]
    if not by_load:
        return global_st
    nearest = min(
        by_load.keys(),
        key=lambda L: abs(math.log10(max(L, 1e-4)) - math.log10(max(load, 1e-4))),
    )
    return by_load[nearest]


def _exploit_from_measured(st: Dict[str, Any], n: int = N_EXPLOIT) -> List[Dict[str, Any]]:
    """从高产负载的实测里取 n 条互异条件作利用锚定（按 score）。"""
    pts = list(st.get("cond_pts") or st["pts"])
    pts = sorted(pts, key=lambda p: (_score(p["y"], p["sel"]) or -1.0, p["y"]), reverse=True)
    out = []
    seen = set()
    for i, p in enumerate(pts):
        pw = p["power"] if p.get("power") is not None else st.get("power_med", 100.0)
        kind = "利用·峰值实测" if i == 0 else f"利用·次优实测#{i}"
        c = _make_cond(kind, "exploit", p["ch4"], max(p["o2"], 1.0), p["ar"], pw)
        if not _in_dom(c):
            continue
        key = _cond_key(c)
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
        if len(out) >= n:
            break
    return out


def _wide_explore_candidates(
    anchor: Dict[str, Any],
    loadings: List[float],
    load_star: float,
    by_load: Optional[Dict[float, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """负载量 × 条件大步网格，铺开未知探索空间。"""
    a_ch4 = float(anchor["ch4"])
    a_o2 = max(float(anchor["o2"]), 1.0)
    a_ar = float(anchor["ar"])
    a_pw = float(anchor.get("power") if anchor.get("power") is not None else 100.0)
    by_load = by_load or {}

    # 全局代表性条件
    cond_templates = [
        (a_ch4, a_o2, a_ar, a_pw, "锚点条件"),
        (100, a_o2, a_ar, a_pw, "甲烷拉满"),
        (70, a_o2, a_ar, a_pw, "甲烷下调"),
        (50, a_o2, a_ar, a_pw, "低甲烷"),
        (a_ch4, 2.5, a_ar, a_pw, "强贫氧"),
        (a_ch4, 5, a_ar, a_pw, "贫氧"),
        (a_ch4, 20, a_ar, a_pw, "中富氧"),
        (a_ch4, 40, a_ar, a_pw, "高富氧"),
        (a_ch4, a_o2, 35, a_pw, "补氩"),
        (a_ch4, a_o2, 50, a_pw, "高氩"),
        (a_ch4, a_o2, a_ar, 60, "光功率60"),
        (a_ch4, a_o2, a_ar, 40, "光功率40"),
        (a_ch4, a_o2, a_ar, 100, "满功率"),
        (100, 5, 0, 100, "高甲烷贫氧满功率"),
        (100, 20, 0, 80, "高甲烷中氧"),
        (70, 30, 35, 80, "中甲烷富氧带氩"),
        (60, 10, 0, 100, "中低甲烷峰值邻域"),
        (90, 15, 0, 100, "峰值扩氧"),
        (50, 10, 35, 60, "低甲烷稀释"),
        (100, 10, 35, 100, "高甲烷带氩"),
        (50, 15, 35, 100, "经典稀释满功率"),
        (50, 15, 35, 50, "经典稀释半功率"),
    ]

    cands = []
    seen = set()

    def _add(load, ch4, o2, ar, pw, tag):
        if (
            abs(load - load_star) < 1e-9
            and abs(ch4 - a_ch4) < 1e-6
            and abs(o2 - a_o2) < 1e-6
            and abs(ar - a_ar) < 1e-6
            and abs(pw - a_pw) < 0.6
        ):
            return
        c = _make_cond(f"探索·{load:g}%·{tag}", "explore", ch4, max(o2, 1.0), ar, pw)
        c["loading"] = float(load)
        if not _in_dom(c):
            return
        key = _cond_key(c)
        if key in seen:
            return
        seen.add(key)
        cands.append(c)

    for load in loadings:
        templates = list(cond_templates)
        # 该负载自身实测条件优先加入，保证小样本档也能出候选
        st = by_load.get(load)
        if st:
            own = sorted(
                st.get("cond_pts") or st["pts"],
                key=lambda p: (_score(p["y"], p["sel"]) or -1.0, p["y"]),
                reverse=True,
            )[:4]
            for i, p in enumerate(own):
                pw = p["power"] if p.get("power") is not None else a_pw
                templates.append((p["ch4"], max(p["o2"], 1.0), p["ar"], pw, f"本载实测#{i+1}"))
        for ch4, o2, ar, pw, tag in templates:
            _add(load, ch4, o2, ar, pw, tag)
    return cands


def _cond_dist_flow(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    """仅流量/光功率距离。"""
    return math.sqrt(
        ((a["ch4"] - b["ch4"]) / 100.0) ** 2
        + ((a["o2"] - b["o2"]) / 100.0) ** 2
        + ((a["ar"] - b["ar"]) / 100.0) ** 2
        + ((a["power"] - b["power"]) / 100.0) ** 2
    )


def _cond_dist(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    """负载+条件归一化距离（探索多样性）。"""
    la = float(a.get("loading") or 0.05)
    lb = float(b.get("loading") or 0.05)
    d_load = abs(math.log10(max(la, 1e-4)) - math.log10(max(lb, 1e-4))) / 2.0
    return math.sqrt(d_load ** 2 + _cond_dist_flow(a, b) ** 2)


def _loads_too_close(a: Dict[str, Any], b: Dict[str, Any], thr: float = 0.12) -> bool:
    la = float(a.get("loading") or 0.05)
    lb = float(b.get("loading") or 0.05)
    return abs(math.log10(max(la, 1e-4)) - math.log10(max(lb, 1e-4))) < thr


def _pick_ok(item: Tuple, picked: List[Tuple], min_dist: float) -> bool:
    """新点相对已选：总距离够，且近负载时条件必须明显不同。"""
    c = item[1]
    for p in picked:
        if _cond_dist(c, p[1]) < min_dist:
            return False
        if _loads_too_close(c, p[1]) and _cond_dist_flow(c, p[1]) < min_dist * 0.85:
            return False
    return True


def _pick_diverse(
    scored: List[Tuple],
    n: int,
    min_dist: float = 0.22,
    min_loads: int = 8,
    prefer_loads: Optional[List[float]] = None,
) -> List[Tuple]:
    """按采集分贪心选 n 条；优先覆盖 prefer_loads / 不同负载，再拉开条件。"""
    if not scored:
        return []
    picked: List[Tuple] = []
    used_loads = set()

    # 第 0 轮：优先给主表已有负载各留 1 席（真正拉开负载抽样）
    if prefer_loads:
        by_load_best: Dict[float, Tuple] = {}
        for item in scored:
            L = float(item[1].get("loading") or -1)
            if L not in prefer_loads:
                continue
            prev = by_load_best.get(L)
            if prev is None or item[0] > prev[0]:
                by_load_best[L] = item
        for L in sorted(prefer_loads):
            if len(picked) >= n:
                break
            item = by_load_best.get(L)
            if item is None:
                continue
            if picked and not _pick_ok(item, picked, min_dist * 0.5):
                continue
            picked.append(item)
            used_loads.add(L)

    # 第一轮：其它负载各 1 席
    for item in scored:
        if len(picked) >= n:
            break
        load = float(item[1].get("loading") or -1)
        if load in used_loads:
            continue
        if picked and not _pick_ok(item, picked, min_dist * 0.55):
            continue
        picked.append(item)
        used_loads.add(load)
        if len(used_loads) >= min_loads:
            break

    # 第二轮：全局多样性补齐
    for thr in (min_dist, min_dist * 0.55, min_dist * 0.35):
        for item in scored:
            if len(picked) >= n:
                break
            if item in picked:
                continue
            if _pick_ok(item, picked, thr):
                picked.append(item)
        if len(picked) >= n:
            break
    for item in scored:
        if len(picked) >= n:
            break
        if item not in picked:
            picked.append(item)
    return picked[:n]


def _wavg(pts, weights, key):
    num = 0.0
    den = 0.0
    for w, p in zip(weights, pts):
        v = p.get(key)
        if v is None:
            continue
        num += w * float(v)
        den += w
    if den <= 1e-12:
        return None
    return num / den


def _predict_at(st: Dict[str, Any], cond: Dict[str, Any]) -> Dict[str, float]:
    """在负载组后验上，按与实测点的条件距离做局部加权估计。"""
    pts = st["pts"]
    scales = {
        "ch4": max(st["ch4_hi"] - st["ch4_lo"], 10.0),
        "o2": max(st["o2_hi"] - st["o2_lo"], 1.0),
        "ar": max(st["ar_hi"] - st["ar_lo"], 5.0),
        "power": max(st["power_hi"] - st["power_lo"], 10.0),
    }

    def dist(p):
        d2 = 0.0
        for k in ("ch4", "o2", "ar"):
            d2 += ((p[k] - cond[k]) / scales[k]) ** 2
        pw = p["power"] if p.get("power") is not None else st["power_med"]
        d2 += ((pw - cond["power"]) / scales["power"]) ** 2
        return math.sqrt(d2)

    dists = [dist(p) for p in pts]
    dmin = min(dists) if dists else 1.0
    # 条件几乎贴合实测时：同条件多条取 score 最高，避免核平滑冲掉 >40000 的峰
    near = [p for p, d in zip(pts, dists) if d < 0.08]
    if near:
        p_star = max(near, key=lambda p: (_score(p["y"], p["sel"]) or -1.0, p["y"]))
        mu_y = float(p_star["y"])
        mu_sel = float(p_star["sel"])
        mu_sel_c2h4 = p_star.get("sel_c2h4")
        mu_sel_c2h6 = p_star.get("sel_c2h6")
        mu_p_c2h4, mu_p_c2h6 = _split_yields(mu_y, mu_sel, mu_sel_c2h4, mu_sel_c2h6)
        sigma = max(st["sigma"] * 0.25, 1.0)
        n_eff = float(st["n"])
        ucb = mu_y + KAPPA * sigma / math.sqrt(max(n_eff, 3.0))
    else:
        weights = [math.exp(-((d / 0.45) ** 2)) for d in dists]
        # 距离过大导致权重下溢时，退回 k 近邻 / 组均值，避免 μ→0
        if max(weights) < 1e-15:
            order = sorted(range(len(pts)), key=lambda i: dists[i])
            k = min(3, len(order))
            nn = [pts[i] for i in order[:k]]
            mu_y = float(np.mean([p["y"] for p in nn]))
            mu_sel = float(np.mean([p["sel"] for p in nn]))
            mu_sel_c2h4 = float(np.mean([p["sel_c2h4"] for p in nn if p.get("sel_c2h4") is not None])) if any(p.get("sel_c2h4") is not None for p in nn) else None
            mu_sel_c2h6 = float(np.mean([p["sel_c2h6"] for p in nn if p.get("sel_c2h6") is not None])) if any(p.get("sel_c2h6") is not None for p in nn) else None
            mu_p_c2h4, mu_p_c2h6 = _split_yields(mu_y, mu_sel, mu_sel_c2h4, mu_sel_c2h6)
            sigma = st["sigma"] * (1.0 + 1.2 * dmin)
            n_eff = float(k)
        else:
            wsum = sum(weights) + 1e-12
            mu_y = sum(w * p["y"] for w, p in zip(weights, pts)) / wsum
            mu_sel = sum(w * p["sel"] for w, p in zip(weights, pts)) / wsum
            mu_sel_c2h4 = _wavg(pts, weights, "sel_c2h4")
            mu_sel_c2h6 = _wavg(pts, weights, "sel_c2h6")
            if (mu_sel_c2h4 is None or mu_sel_c2h6 is None) and mu_sel:
                a4 = _wavg(pts, weights, "p_c2h4")
                a6 = _wavg(pts, weights, "p_c2h6")
                tot = (a4 or 0) + (a6 or 0)
                if tot > 0:
                    mu_sel_c2h4 = mu_sel * (a4 or 0) / tot
                    mu_sel_c2h6 = mu_sel * (a6 or 0) / tot
            mu_p_c2h4, mu_p_c2h6 = _split_yields(mu_y, mu_sel, mu_sel_c2h4, mu_sel_c2h6)
            sigma = st["sigma"] * (1.0 + 0.8 * dmin)
            n_eff = max(1.0, sum(weights))
        if cond["mode"] == "exploit":
            ucb = mu_y + KAPPA * sigma / math.sqrt(max(n_eff, st["n"]))
        else:
            ucb = mu_y + KAPPA * sigma
    return {
        "mu_y": float(mu_y),
        "mu_sel": float(mu_sel),
        "mu_sel_c2h4": float(mu_sel_c2h4) if mu_sel_c2h4 is not None else None,
        "mu_sel_c2h6": float(mu_sel_c2h6) if mu_sel_c2h6 is not None else None,
        "mu_p_c2h4": float(mu_p_c2h4) if mu_p_c2h4 is not None else None,
        "mu_p_c2h6": float(mu_p_c2h6) if mu_p_c2h6 is not None else None,
        "sigma": float(sigma),
        "ucb": float(ucb),
        "n_eff": float(n_eff),
    }


def recommend_3x3(master_path: str = MASTER, sel_min: float = SEL_MIN) -> Dict[str, Any]:
    points = load_pd_p25_points(master_path)
    if not points:
        return {
            "ok": False,
            "error": "主表里没有可用的 Pd–P25 实测（需负载、流量、产率/选择性）。",
            "top": [],
            "groups": [],
            "proof": {},
        }

    lpd_ref = _attach_power(points)

    by_load_pts: Dict[float, List[Dict[str, Any]]] = defaultdict(list)
    for p in points:
        by_load_pts[p["load"]].append(p)
    ys_all = np.array([p["y"] for p in points], dtype=float)
    pooled_sigma = float(ys_all.std(ddof=1)) if len(ys_all) >= 2 else float(ys_all.mean() * 0.25)
    by_load = {L: _group_stats(v, pooled_sigma=pooled_sigma) for L, v in by_load_pts.items()}
    global_st = _group_stats(points, pooled_sigma=pooled_sigma)

    # 锚定高产负载做 3 条理论最优；探索在多负载 × 条件空间铺 27 条
    load_rank = sorted(
        by_load.items(),
        key=lambda t: _rank_key_score(
            _score(t[1].get("mu_rank", t[1]["mu"]), t[1].get("mu_sel_rank", t[1]["mu_sel"])),
            t[1].get("mu_rank", t[1]["mu"]),
        ),
    )
    if not load_rank:
        return {
            "ok": False,
            "error": "没有可用负载统计。",
            "top": [],
            "groups": [],
            "proof": {},
        }
    load_star, st_star = load_rank[0]
    use_st = st_star
    load_space = _explore_loadings(list(by_load.keys()))

    def _build_row(rank_i, load, sc, c, pred, acq_note: str):
        mass = masses[min(rank_i - 1, len(masses) - 1)]
        c = dict(c)
        c["mass"] = mass
        c["loading"] = float(load)
        assert _in_dom(c), "DOM violated: %s" % c
        hard_ok = pred["mu_sel"] >= sel_min
        sw = _sel_weight(pred["mu_sel"]) if hard_ok else 0.0
        lpd = round(float(c["power"]) / 100.0 * lpd_ref, 1) if lpd_ref else None
        y_note = "产率≥目标" if pred["mu_y"] >= Y_TARGET else f"产率<{Y_TARGET:g}"
        reason = (
            f"{c['kind']}；{acq_note}；负载 {load:g}%；"
            f"μ_y={pred['mu_y']:.0f}，μ_sel={pred['mu_sel']:.1f}%；"
            f"硬门槛{'过' if hard_ok else '未过'}(≥{sel_min:g}%)；"
            f"score=μ_y×(μ_sel/100)={sc:.1f}；{y_note}；"
            f"UCB={pred['ucb']:.0f}；"
            f"可行域 CH4/1%O2/Ar∈[0,100]、质量{MASS_LO}-{MASS_HI}mg、光功率0-100%"
        )
        mu_y = round(pred["mu_y"], 1)
        mu_sel = round(pred["mu_sel"], 2)
        p4 = pred.get("mu_p_c2h4")
        p6 = pred.get("mu_p_c2h6")
        s4 = pred.get("mu_sel_c2h4")
        s6 = pred.get("mu_sel_c2h6")
        return {
            "rank": rank_i,
            "group": f"负载 {load:g}%",
            "loading": load,
            "metal": "Pd",
            "support": "P25",
            "ch4": c["ch4"],
            "o2": c["o2"],
            "ar": c["ar"],
            "o2_in": INLET_O2_TARGET,
            "mass": mass,
            "power": int(round(c["power"])),
            "lpd": lpd,
            "mu_y": mu_y,
            "mu_sel": mu_sel,
            "y": mu_y,
            "sel": mu_sel,
            "ucb": round(pred["ucb"], 1),
            "score": round(sc, 2),
            "p_c2h4": round(p4, 1) if p4 is not None else None,
            "p_c2h6": round(p6, 1) if p6 is not None else None,
            "p_c2": mu_y,
            "sel_c2h4": round(s4, 2) if s4 is not None else None,
            "sel_c2h6": round(s6, 2) if s6 is not None else None,
            "sel_c2": mu_sel,
            "z": None,
            "gap": None,
            "c2h4": round(p4, 1) if p4 is not None else None,
            "c2h6": round(p6, 1) if p6 is not None else None,
            "co2": None,
            "reason": reason,
            "kind": c["kind"],
            "mode": c.get("mode"),
            "sel_weight": round(sw, 3),
            "soft_gate": round(sw, 3),
            "hard_ok": hard_ok,
            "sigma": round(pred["sigma"], 1),
            "dom_ok": True,
        }

    masses = _spread_masses(N_TOTAL)
    picked_items: List[Tuple] = []

    # —— 3 条理论最优：高产负载上 score 最高的互异实测 ——
    exploit_conds = _exploit_from_measured(use_st, n=N_EXPLOIT)
    exploit_scored = []
    for c in exploit_conds:
        c = dict(c)
        c["loading"] = float(load_star)
        pred = _predict_at(use_st, c)
        sc = _score(pred["mu_y"], pred["mu_sel"], sel_min)
        if sc is None:
            continue
        exploit_scored.append((sc, c, pred))
    exploit_scored.sort(key=lambda t: _rank_key_score(t[0], t[2]["mu_y"]))
    picked_items.extend(exploit_scored[:N_EXPLOIT])

    if exploit_scored:
        anchor = exploit_scored[0][1]
    else:
        b = use_st["best"]
        anchor = _make_cond(
            "利用·峰值实测", "exploit",
            b["ch4"], max(b["o2"], 1.0), b["ar"],
            b.get("power") if b.get("power") is not None else use_st["power_med"],
        )
        anchor["loading"] = float(load_star)

    # —— 27 条探索：多负载 × 条件空间，先铺开未知区域 ——
    used_keys = {_cond_key(c) for _, c, _ in picked_items}
    explore_scored = []
    for c in _wide_explore_candidates(anchor, load_space, load_star, by_load=by_load):
        if _cond_key(c) in used_keys:
            continue
        load_i = float(c.get("loading") or load_star)
        st_i = _st_for_load(load_i, by_load, global_st)
        pred = _predict_at(st_i, c)
        sc = _score(pred["mu_y"], pred["mu_sel"], sel_min)
        if sc is None:
            continue
        # 主表已有负载优先覆盖；全新插值负载略抬探索分
        if load_i in by_load:
            novelty = 1.2
        else:
            novelty = 1.05
        acq = novelty * (0.45 * float(sc) + 0.55 * float(pred["ucb"]) * _sel_weight(pred["mu_sel"]))
        explore_scored.append((acq, c, pred, sc))
    explore_scored.sort(key=lambda t: (-t[0], -t[3], -t[2]["mu_y"]))
    # 近负载 + 同条件去重，只留采集分最高的一条
    dedup = {}
    for acq, c, pred, sc in explore_scored:
        L = float(c.get("loading") or load_star)
        bucket = round(math.log10(max(L, 1e-4)) * 5) / 5.0
        key = (bucket, round(c["ch4"], 0), round(c["o2"], 1), round(c["ar"], 0), round(c["power"], 0))
        prev = dedup.get(key)
        if prev is None or acq > prev[0]:
            dedup[key] = (acq, c, pred, sc)
    explore_scored = sorted(dedup.values(), key=lambda t: (-t[0], -t[3], -t[2]["mu_y"]))
    explore_pool = [(sc, c, pred) for acq, c, pred, sc in explore_scored]
    explore_picked = _pick_diverse(
        explore_pool,
        N_EXPLORE,
        min_dist=0.26,
        min_loads=min(14, len(load_space)),
        prefer_loads=sorted(by_load.keys()),
    )
    picked_items.extend(explore_picked)

    exploit_rows = [(sc, c, pred) for sc, c, pred in picked_items if c.get("mode") == "exploit"]
    explore_rows = [(sc, c, pred) for sc, c, pred in picked_items if c.get("mode") != "exploit"]
    exploit_rows.sort(key=lambda t: _rank_key_score(t[0], t[2]["mu_y"]))
    explore_rows.sort(key=lambda t: _rank_key_score(t[0], t[2]["mu_y"]))

    top = []
    rank = 0
    for sc, c, pred in exploit_rows[:N_EXPLOIT]:
        rank += 1
        top.append(_build_row(
            rank, float(c.get("loading") or load_star), sc, c, pred,
            "理论最优·高产实测锚定",
        ))
    for sc, c, pred in explore_rows[:N_EXPLORE]:
        rank += 1
        load_i = float(c.get("loading") or load_star)
        top.append(_build_row(
            rank, load_i, sc, c, pred,
            "未知空间探索（负载×条件）",
        ))
    # 不足则从池中补齐
    if len(top) < N_TOTAL:
        have = {
            (t["loading"], t["ch4"], t["o2"], t["ar"], t["power"])
            for t in top
        }
        for sc, c, pred in explore_pool:
            if len(top) >= N_TOTAL:
                break
            key = (c.get("loading"), c["ch4"], c["o2"], c["ar"], c["power"])
            if key in have:
                continue
            rank += 1
            top.append(_build_row(
                rank, float(c.get("loading") or load_star), sc, c, pred,
                "未知空间探索补位",
            ))
            have.add(key)

    # 按负载汇总
    by_g: Dict[float, List] = defaultdict(list)
    for row in top:
        by_g[float(row["loading"])].append(row)
    groups = [
        {
            "loading": L,
            "n": by_load[L]["n"] if L in by_load else 0,
            "rows": rows,
        }
        for L, rows in sorted(by_g.items())
    ]

    exploit_top = [t for t in top if t.get("mode") == "exploit"]
    explore_top = [t for t in top if t.get("mode") != "exploit"]
    exploit_top.sort(key=lambda r: _rank_key_score(r.get("score"), r.get("mu_y") or 0.0))
    explore_top.sort(key=lambda r: _rank_key_score(r.get("score"), r.get("mu_y") or 0.0))
    top = exploit_top + explore_top
    masses = _spread_masses(max(len(top), 1))
    for i, row in enumerate(top):
        row["rank"] = i + 1
        row["mass"] = masses[min(i, len(masses) - 1)]

    # proof：可行域内按 score 最高的实测（同分取产率更高）
    eligible = [
        p for p in points
        if p["sel"] >= sel_min and _in_flow_dom(p["ch4"], p["o2"], p["ar"])
        and (p.get("power") is None or POWER_LO <= p["power"] <= POWER_HI)
    ]
    if not eligible:
        eligible = [p for p in points if _in_flow_dom(p["ch4"], p["o2"], p["ar"])]
    if not eligible:
        eligible = points
    inlet_ok = [
        p for p in eligible
        if p.get("o2_in") is not None and abs(float(p["o2_in"]) - INLET_O2_TARGET) <= 0.05
    ]
    pool = inlet_ok if inlet_ok else eligible
    star = max(pool, key=lambda p: (_score(p["y"], p["sel"]) or -1.0, p["y"]))
    proof = {
        "ystar": star["y"],
        "load": star["load"],
        "ch4": _clip_flow(star["ch4"]),
        "o2": _clip_flow(star["o2"]),
        "ar": _clip_flow(star["ar"]),
        "power": int(round(star["power"])) if star.get("power") is not None else None,
        "lpd": star["lpd"],
        "mass": _clip_mass(star["m_cat"]) if star.get("m_cat") else 5,
        "selstar": star["sel"],
        "zstar": None,
        "n_open": sum(1 for t in top if t.get("hard_ok")),
        "sel_min": sel_min,
        "n_train": len(points),
        "n_loadings": len(by_load),
        "lpd_ref": lpd_ref,
    }

    n_hi = sum(1 for t in top if (t.get("mu_y") or 0) >= Y_TARGET)
    n_ex = sum(1 for t in top if t.get("mode") == "exploit")
    n_eo = sum(1 for t in top if t.get("mode") != "exploit")
    n_load_out = len({float(t["loading"]) for t in top})
    stop = (
        f"Pd–P25 训练点 {len(points)} 条；理论最优锚定负载 {load_star:g}%（n={use_st['n']}）；"
        f"硬门槛 sel≥{sel_min:g}%；score=μ_y×(μ_sel/100)；"
        f"{n_ex} 条理论最优 + {n_eo} 条未知空间探索；覆盖负载档 {n_load_out}/{len(load_space)}；"
        f"产率目标 >{Y_TARGET:g}，达标 {n_hi}/{len(top)}；"
        f"探索含负载量×CH4/O2/Ar/光功率，按 score/UCB 折中并拉开距离；"
        f"可行域 CH4/1%O2/Ar∈[0,100]、质量 {MASS_LO}-{MASS_HI} mg、光功率 0-100%。"
    )
    return {
        "ok": True,
        "top": top,
        "groups": groups,
        "proof": proof,
        "stop_reason": stop,
        "n_train": len(points),
        "sel_min": sel_min,
    }


def write_bo_xlsx(result: Dict[str, Any], out_path: Optional[str] = None) -> str:
    from openpyxl.styles import Alignment, Font, PatternFill

    out_path = out_path or str(_DATA / "bo_recommendations.xlsx")
    wb = openpyxl.Workbook()
    hdr_fill = PatternFill("solid", fgColor="3370FF")
    hdr_font = Font(bold=True, color="FFFFFF")

    ws = wb.active
    ws.title = "三组Pd-P25"
    cols = [
        "推荐序", "负载wt%", "采集类型", "CH4 mL/min", "1%O2 mL/min", "Ar mL/min",
        "相对光功率%", "进料氧%", "催化剂质量mg",
        "μ_y(p_C2)", "μ_sel(sel_C2)", "UCB", "score",
        "p_C2H4", "p_C2H6", "p_C2",
        "sel_C2H4%", "sel_C2H6%", "sel_C2%",
        "说明",
    ]
    ws.append(cols)
    for c in ws[1]:
        c.font = hdr_font
        c.fill = hdr_fill
        c.alignment = Alignment(horizontal="center", wrap_text=True)
    for row in result.get("top") or []:
        ws.append([
            row.get("rank"), row.get("loading"), row.get("kind"),
            row.get("ch4"), row.get("o2"), row.get("ar"), row.get("power"),
            row.get("o2_in"), row.get("mass"),
            row.get("mu_y"), row.get("mu_sel"), row.get("ucb"), row.get("score"),
            row.get("p_c2h4"), row.get("p_c2h6"), row.get("p_c2"),
            row.get("sel_c2h4"), row.get("sel_c2h6"), row.get("sel_c2"),
            row.get("reason"),
        ])

    # 兼容旧 API：Top4推荐 / 24点排产 镜像
    ws1 = wb.create_sheet("Top4推荐")
    cols1 = [
        "金属", "负载量wt%", "载体", "相对光功率%", "CH4流量mL/min", "1%O2流量mL/min",
        "预测p_C2+均值μmol/g/h", "95%下限", "95%上限", "是否已做过",
        "实测n", "实测均速", "实测均sel%", "UCB(p_C2+)", "综合分",
        "功函数eV", "载体Eg eV", "physfactor", "R_opt(O2:CH4)", "I_opt光功率",
        "O2-TPD", "约束检查", "备注",
    ]
    ws1.append(cols1)
    for c in ws1[1]:
        c.font = hdr_font
        c.fill = hdr_fill
    for g in result.get("groups") or []:
        rows = g.get("rows") or []
        if not rows:
            continue
        r0 = rows[0]
        ws1.append([
            "Pd", g.get("loading"), "P25", r0.get("power"), r0.get("ch4"), r0.get("o2"),
            r0.get("y"), None, None, "部分",
            g.get("n"), r0.get("y"), r0.get("sel"), r0.get("ucb"), r0.get("score"),
            5.6, 3.2, 1.0, None, r0.get("power"),
            "", "可行域+硬sel+软门槛", "Pd-P25 条件级BO",
        ])

    ws2 = wb.create_sheet("24点排产")
    cols2 = [
        "推荐序", "催化剂", "采集类型", "CH4 mL/min", "1%O2 mL/min",
        "Ar mL/min", "相对光功率%", "质量mg",
        "μ_y", "μ_sel", "UCB", "score",
        "p_C2H4", "p_C2H6", "p_C2", "sel_C2H4", "sel_C2H6", "sel_C2",
        "约束状态",
    ]
    ws2.append(cols2)
    for c in ws2[1]:
        c.font = hdr_font
        c.fill = hdr_fill
    for row in result.get("top") or []:
        cstat = "pass" if row.get("dom_ok") and row.get("hard_ok") else ("warn" if row.get("dom_ok") else "fail")
        ws2.append([
            row.get("rank"), f"Pd/{row.get('loading')}%/P25", row.get("kind"),
            row.get("ch4"), row.get("o2"), row.get("ar"), row.get("power"),
            row.get("mass"),
            row.get("mu_y"), row.get("mu_sel"), row.get("ucb"), row.get("score"),
            row.get("p_c2h4"), row.get("p_c2h6"), row.get("p_c2"),
            row.get("sel_c2h4"), row.get("sel_c2h6"), row.get("sel_c2"),
            cstat,
        ])

    wb.save(out_path)
    # bo_input
    in_path = str(_DATA / "bo_input.xlsx")
    in_wb = openpyxl.Workbook()
    in_ws = in_wb.active
    in_ws.title = "训练样本"
    in_ws.append(["金属", "负载wt%", "载体", "实测n", "备注"])
    for g in result.get("groups") or []:
        in_ws.append(["Pd", g.get("loading"), "P25", g.get("n"), "Pd-P25 条件级BO"])
    in_wb.save(in_path)
    return out_path
