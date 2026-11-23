# -*- coding: utf-8 -*-
"""一页式结论汇总：负载-产率曲线、数据缺口、下一步建议。

只做统计，不调模型。目的是让「数据现在能得出什么结论、还缺什么」一屏说完。
"""
from __future__ import annotations

import statistics
from pathlib import Path
from typing import Any, Dict, List

import openpyxl

_DATA = Path(__file__).resolve().parents[2] / "data"
MASTER = _DATA / "OCM_master.xlsx"

# 判据：少于这个条数的负载档视为不可信
MIN_N = 5
# 计划要做的负载点（用户提的 0.5 / 1 / 2 / 3，加已知最优和断崖点）
PLANNED = [0.05, 0.1, 0.5, 1.0, 2.0, 3.0]


def _num(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


def _load_points() -> List[Dict[str, Any]]:
    """读主表 Pd-P25 有效点。"""
    if not MASTER.exists():
        return []
    wb = openpyxl.load_workbook(MASTER, data_only=True, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return []

    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}

    def col(*names):
        for nm in names:
            if nm in ix:
                return ix[nm]
        return None

    i_metal = col("金属")
    i_sup = col("载体 (sub)")
    i_load = col("负载量/wt% (Pd%)")
    i_y = col("p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)")
    i_sel = col("C2+选择性/% (sel_C2+)")
    i_light = col("光强/(mW·cm⁻²) (light_intensity)")
    if None in (i_metal, i_sup, i_load, i_y):
        return []

    out = []
    for r in rows[1:]:
        if "Pd" not in str(r[i_metal] or "") or "P25" not in str(r[i_sup] or ""):
            continue
        load = _num(r[i_load])
        y = _num(r[i_y])
        if load is None or y is None or y <= 0:
            continue
        out.append({
            "load": load,
            "y": y,
            "sel": _num(r[i_sel]) if i_sel is not None else None,
            "lpd": _num(r[i_light]) if i_light is not None else None,
        })
    return out


def _quant(sorted_vals: List[float], f: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    return sorted_vals[int(f * (len(sorted_vals) - 1))]


def brief_payload() -> Dict[str, Any]:
    pts = _load_points()
    if not pts:
        return {"ok": False, "error": "主表无可用 Pd–P25 数据"}

    by_load: Dict[float, List[Dict[str, Any]]] = {}
    for p in pts:
        by_load.setdefault(p["load"], []).append(p)

    curve = []
    for load in sorted(by_load):
        vals = sorted(x["y"] for x in by_load[load])
        sels = [x["sel"] for x in by_load[load] if x["sel"] is not None]
        lpds = [x["lpd"] for x in by_load[load] if x["lpd"] is not None]
        curve.append({
            "load": load,
            "n": len(vals),
            "median": round(statistics.median(vals), 0),
            "max": round(vals[-1], 0),
            "q25": round(_quant(vals, 0.25), 0),
            "q75": round(_quant(vals, 0.75), 0),
            "sel_median": round(statistics.median(sels), 1) if sels else None,
            "sel_max": round(max(sels), 1) if sels else None,
            "lpd_min": round(min(lpds), 0) if lpds else None,
            "lpd_max": round(max(lpds), 0) if lpds else None,
            "thin": len(vals) < MIN_N,
        })

    # 峰值点：中位产率最高且样本够的
    solid = [c for c in curve if c["n"] >= MIN_N]
    peak = max(solid, key=lambda c: c["median"]) if solid else None
    # 历史最高产率（任意点）
    best = max(pts, key=lambda p: p["y"])
    best_group = next((c for c in curve if c["load"] == best["load"]), None)

    # 缺口：计划点里 n 不足的
    gaps = []
    for load in PLANNED:
        c = next((x for x in curve if abs(x["load"] - load) < 1e-9), None)
        n = c["n"] if c else 0
        if n >= MIN_N:
            continue
        gaps.append({
            "load": load,
            "n": n,
            "need": max(0, MIN_N - n),
            "median": c["median"] if c else None,
            "reason": (
                "完全没有数据，平坦区缺中间锚点"
                if n == 0 else
                f"只有 {n} 条，低于可信下限 {MIN_N} 条"
            ),
        })

    # 如果按用户原计划（0.5/1/2/3）做会怎样：给出这四档的现状对比
    plan_check = []
    for load in [0.5, 1.0, 2.0, 3.0]:
        c = next((x for x in curve if abs(x["load"] - load) < 1e-9), None)
        plan_check.append({
            "load": load,
            "n": c["n"] if c else 0,
            "median": c["median"] if c else None,
            "reliable": bool(c and c["n"] >= MIN_N),
        })
    pc_vals = [x["median"] for x in plan_check if x["median"]]
    plan_span = None
    if len(pc_vals) >= 2:
        plan_span = {
            "min": round(min(pc_vals), 0),
            "max": round(max(pc_vals), 0),
            "ratio": round(max(pc_vals) / min(pc_vals), 2),
        }

    # 断崖判断：峰值点 → 下一个「计划内」更重负载（结论要能对上实验安排）
    cliff = None
    if peak:
        heavier = [
            c for c in curve
            if c["load"] > peak["load"]
            and c["median"] > 0
            and any(abs(c["load"] - pl) < 1e-9 for pl in PLANNED)
        ]
        if heavier:
            nxt = min(heavier, key=lambda c: c["load"])
            drop = 1.0 - nxt["median"] / peak["median"]
            cliff = {
                "from_load": peak["load"],
                "to_load": nxt["load"],
                "from_median": peak["median"],
                "to_median": nxt["median"],
                "drop_pct": round(drop * 100, 1),
                "n_next": nxt["n"],
                "reliable": nxt["n"] >= MIN_N,
            }

    # 光强集中度：最多那个光强占多少
    lpd_counter: Dict[int, int] = {}
    for p in pts:
        if p["lpd"]:
            k = int(round(p["lpd"]))
            lpd_counter[k] = lpd_counter.get(k, 0) + 1
    top_lpd = max(lpd_counter.items(), key=lambda kv: kv[1]) if lpd_counter else None
    lpd_share = round(100.0 * top_lpd[1] / len(pts), 1) if top_lpd else None

    return {
        "ok": True,
        "n_total": len(pts),
        "n_thin": sum(c["n"] for c in curve if c["thin"]),
        "n_solid": sum(c["n"] for c in curve if not c["thin"]),
        "curve": curve,
        "peak": peak,
        "best": {
            "load": best["load"],
            "y": round(best["y"], 0),
            "sel": round(best["sel"], 1) if best["sel"] is not None else None,
            "top_sel": round(best_group["sel_max"], 1) if best_group and best_group["sel_max"] else None,
        },
        "cliff": cliff,
        "gaps": gaps,
        "plan_check": plan_check,
        "plan_span": plan_span,
        "min_n": MIN_N,
        "planned": PLANNED,
        "light": {
            "top_lpd": top_lpd[0] if top_lpd else None,
            "share_pct": lpd_share,
        },
    }
