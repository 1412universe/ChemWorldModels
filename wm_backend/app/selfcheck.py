# -*- coding: utf-8 -*-
"""模型自检：模型在哪些负载档可信、哪些不可信，以及约束如何否决候选。

这块不追求「预测多准」，只回答两个问题：
  1. 模型在已有实测的档位上误差多大、可信度如何
  2. 什么条件下模型会拒绝给结论（域外），什么条件下约束会否决
"""
from __future__ import annotations

import collections
import statistics
from pathlib import Path
from typing import Any, Dict, List, Optional

import openpyxl

_DATA = Path(__file__).resolve().parents[2] / "data"
MASTER = _DATA / "OCM_master.xlsx"

# 自检用的统一条件：Pd–P25、90/10/0 流量、新灯满功率
PROBE = {"ch4": 90.0, "o2": 10.0, "ar": 0.0, "o2_in": 10.0, "light": 257.3}
PROBE_LOADS = [0.01, 0.02, 0.03, 0.05, 0.06, 0.1, 0.5, 1.0, 2.0, 3.0]
# 误差超过这个就判为不可用
ERR_OK = 30.0
ERR_WARN = 60.0


def _measured_by_load() -> Dict[float, List[float]]:
    if not MASTER.exists():
        return {}
    wb = openpyxl.load_workbook(MASTER, data_only=True, read_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return {}
    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}
    i_metal = ix.get("金属")
    i_sup = ix.get("载体 (sub)")
    i_load = ix.get("负载量/wt% (Pd%)")
    i_y = ix.get("p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)")
    if None in (i_metal, i_sup, i_load, i_y):
        return {}
    out: Dict[float, List[float]] = collections.defaultdict(list)
    for r in rows[1:]:
        if "Pd" not in str(r[i_metal] or "") or "P25" not in str(r[i_sup] or ""):
            continue
        load, y = r[i_load], r[i_y]
        if isinstance(load, (int, float)) and isinstance(y, (int, float)) and y > 0:
            out[float(load)].append(float(y))
    return dict(out)


def selfcheck() -> Dict[str, Any]:
    """模型自检：逐档对比实测中位与模型预测。"""
    from . import layered_wm_service as lws

    meas = _measured_by_load()
    rows = []
    for load in PROBE_LOADS:
        vals = meas.get(load, [])
        med = statistics.median(vals) if vals else None
        entry = {
            "load": load,
            "n": len(vals),
            "measured": round(med, 0) if med is not None else None,
            "predicted": None,
            "err_pct": None,
            "in_domain": None,
            "d_min": None,
            "verdict": "no-data",
        }
        try:
            r = lws.predict(
                load=load, ch4=PROBE["ch4"], o2=PROBE["o2"], ar=PROBE["ar"],
                o2_in=PROBE["o2_in"], light=PROBE["light"], light_unit="lpd",
            )
            entry["predicted"] = round(float(r["y"]), 0)
            entry["in_domain"] = bool(r.get("in_domain"))
            entry["d_min"] = round(float((r.get("domain") or {}).get("d_min") or 0), 2)
            entry["unc"] = round(float(r.get("unc") or 0), 0)
            if med and med > 0:
                err = (float(r["y"]) - med) / med * 100.0
                entry["err_pct"] = round(err, 0)
                if abs(err) <= ERR_OK and entry["in_domain"]:
                    entry["verdict"] = "reliable"
                elif abs(err) <= ERR_WARN:
                    entry["verdict"] = "biased"
                else:
                    entry["verdict"] = "off"
            else:
                entry["verdict"] = "extrapolate"
        except Exception as e:  # pragma: no cover
            entry["error"] = str(e)[:120]
        rows.append(entry)

    ok = [r for r in rows if r["verdict"] == "reliable"]
    off = [r for r in rows if r["verdict"] in ("off", "biased")]
    outside = [r for r in rows if r["in_domain"] is False]

    return {
        "ok": True,
        "probe": PROBE,
        "rows": rows,
        "n_reliable": len(ok),
        "n_biased": len(off),
        "n_out_domain": len(outside),
        "thresholds": {"ok": ERR_OK, "warn": ERR_WARN},
        "summary": (
            f"在 {len(rows)} 个探测档位中，模型只在 {len(ok)} 档与实测吻合（误差 ≤{ERR_OK:.0f}%），"
            f"{len(off)} 档偏差超出可用范围，{len(outside)} 档被判为域外。"
        ),
    }


def constraint_cases() -> Dict[str, Any]:
    """挑几个候选，展示约束如何通过 / 否决。"""
    from app import services
    from .data import ALLCAT

    cases = []
    seen = set()
    n_blocked = 0

    def take(cand, tag):
        try:
            cs = services.compute_constraints(cand)
        except Exception:
            return
        fails = [x for x in cs if x.get("st") == "fail"]
        warns = [x for x in cs if x.get("st") == "warn"]
        key = (cand.get("metal"), cand.get("support"))
        if key in seen:
            return
        if tag == "约束否决" and not fails:
            return
        if tag == "仅告警" and (fails or not warns):
            return
        seen.add(key)
        cases.append({
            "tag": tag,
            "metal": cand.get("metal"),
            "support": cand.get("support"),
            "n_total": len(cs),
            "n_fail": len(fails),
            "n_warn": len(warns),
            "blocked": len(fails) > 0,
            "fails": [{"name": x.get("name") or x.get("k"), "why": x.get("d")} for x in fails[:3]],
            "warns": [{"name": x.get("name") or x.get("k"), "why": x.get("d")} for x in warns[:3]],
        })

    # 统计全库被否决的数量（只算一次遍历）
    for c in ALLCAT:
        try:
            cs = services.compute_constraints(c)
        except Exception:
            continue
        if any(x.get("st") == "fail" for x in cs):
            n_blocked += 1

    # 1) 本项目主体系：Pd–P25
    try:
        from .worldmodel_preview import _find_candidate
        take(_find_candidate("Pd", "P25(TiO2)"), "本项目主体系（约束通过）")
    except Exception:
        for c in ALLCAT:
            if c.get("metal") == "Pd" and "P25" in str(c.get("support") or ""):
                take(c, "本项目主体系（约束通过）")
                break

    # 2) 找 3 个被约束硬否决的
    for c in ALLCAT:
        if len([x for x in cases if x["blocked"]]) >= 3:
            break
        take(c, "约束否决")

    # 3) 找 2 个只有告警、没被否决的
    for c in ALLCAT:
        if len([x for x in cases if x["tag"] == "仅告警"]) >= 2:
            break
        take(c, "仅告警")

    return {
        "ok": True,
        "cases": cases,
        "n_total": len(ALLCAT),
        "n_blocked_total": n_blocked,
        "summary": (
            f"全库 {len(ALLCAT)} 个候选里，{n_blocked} 个被物理约束硬否决——"
            f"与预测产率高低无关，是物理上做不到。"
        ),
    }


def flow_model() -> Dict[str, Any]:
    """流量响应模型：拟合质量 + 12 个拟合点对照 + 外推示例。"""
    import wm_kinetics as wm

    rows = []
    errs = []
    sel_errs = []
    for p in wm.FLOW_FIT_POINTS:
        r = wm.predict_flow(p["ch4"], p["o2"], p["ar"])
        err = (r["y"] / p["y"] - 1.0) * 100.0 if p["y"] else 0.0
        serr = (r["sel"] - p["sel"]) if r["sel"] is not None else 0.0
        errs.append(abs(err))
        sel_errs.append(abs(serr))
        rows.append({
            "series": p["series"],
            "flows": f"{p['ch4']:.0f}/{p['o2']:.1f}/{p['ar']:.0f}",
            "measured_y": p["y"],
            "pred_y": r["y"],
            "err_pct": round(err, 1),
            "measured_sel": p["sel"],
            "pred_sel": r["sel"],
            "err_sel": round(serr, 2),
            "theta_o": r["theta_o"],
            "theta_c": r["theta_c"],
        })

    # 外推示例：没测过的条件
    demo = []
    for ch4, o2, ar in [(90, 10, 0), (85, 10, 5), (82, 10, 8), (70, 10, 20), (50, 10, 40)]:
        r = wm.predict_flow(ch4, o2, ar)
        demo.append({
            "flows": f"{ch4}/{o2:.0f}/{ar}",
            "y": r["y"], "sel": r["sel"],
            "theta_o": r["theta_o"], "theta_c": r["theta_c"],
            "in_range": r["in_range"],
        })

    f = wm.FLOW_FIT
    return {
        "ok": True,
        "fit": {
            "Y0": f["Y0"], "K_O": f["K_O"], "K_C": f["K_C"],
            "Q0": f["Q0"], "n": f["n"], "p": f["p"], "q": f["q"],
            "r2_log_y": f["r2_log_y"], "r2_sel": f["r2_sel"],
            "n_points": f["n_points"],
        },
        "range": wm.FLOW_RANGE,
        "rows": rows,
        "demo": demo,
        "mape_y": round(sum(errs) / len(errs), 1),
        "mae_sel": round(sum(sel_errs) / len(sel_errs), 2),
        "summary": (
            f"竞争吸附模型用 {f['n_points']} 个条件点拟合，"
            f"R2(log y)={f['r2_log_y']:.3f}，平均偏差 {sum(errs)/len(errs):.1f}%；"
            f"选择性 R2={f['r2_sel']:.3f}，平均偏差 {sum(sel_errs)/len(sel_errs):.1f} 点。"
        ),
    }


def data_space(load_filter: str = "all") -> Dict[str, Any]:
    """三维数据空间：每条实测点作为 (负载, 光强, CH4比例) 空间中的一点。

    坐标轴：
      x = 负载 wt%（对数映射）
      y = 光强 mW/cm²
      z = CH4 体积分数 %
    颜色 = 产率（对数映射），大小 = 选择性。
    """
    import math as _m

    if not MASTER.exists():
        return {"ok": False, "error": "主表不存在"}

    wb = openpyxl.load_workbook(MASTER, data_only=True, read_only=True)
    src = wb["主表"] if "主表" in wb.sheetnames else wb.active
    rows = list(src.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return {"ok": False, "error": "主表为空"}

    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}

    def col(*names):
        for nm in names:
            if nm in ix:
                return ix[nm]
        return None

    i_metal = col("金属")
    i_load = col("负载量/wt% (Pd%)")
    i_lpd = col("光强/(mW·cm⁻²) (light_intensity)")
    i_ch4 = col("CH4流量/(mL·min⁻¹) (flow_CH4)")
    i_o2 = col("O2流量/(mL·min⁻¹)（同一批次最好是在同样的浓度下） (flow_O2)")
    i_ar = col("Ar流量/(mL·min⁻¹) (flow_Ar)")
    i_y = col("p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)")
    i_sel = col("C2+选择性/% (sel_C2+)")
    i_date = col("实验日期 (date)")
    i_lamp = col("光源批次 (lamp)")

    if None in (i_load, i_lpd, i_y):
        return {"ok": False, "error": "缺少必要列"}

    pts = []
    for r in rows[1:]:
        metal = str(r[i_metal] or "") if i_metal is not None else "Pd"
        if "Pd" not in metal:
            continue
        load = r[i_load]
        lpd = r[i_lpd]
        y = r[i_y]
        if not isinstance(load, (int, float)) or load <= 0:
            continue
        if not isinstance(lpd, (int, float)) or lpd <= 0:
            continue
        if not isinstance(y, (int, float)) or y <= 0:
            continue
        ch4 = r[i_ch4] if i_ch4 is not None and isinstance(r[i_ch4], (int, float)) else 0.0
        o2 = r[i_o2] if i_o2 is not None and isinstance(r[i_o2], (int, float)) else 0.0
        ar = r[i_ar] if i_ar is not None and isinstance(r[i_ar], (int, float)) else 0.0
        tot = ch4 + o2 + ar
        if tot <= 0:
            continue
        x_ch4 = 100.0 * ch4 / tot
        sel = r[i_sel] if i_sel is not None and isinstance(r[i_sel], (int, float)) else None
        pts.append({
            "load": round(float(load), 4),
            "lpd": round(float(lpd), 1),
            "x_ch4": round(x_ch4, 2),
            "y": round(float(y), 1),
            "sel": round(float(sel), 1) if sel is not None else None,
            "date": str(r[i_date])[:10] if i_date is not None and r[i_date] else None,
            "lamp": str(r[i_lamp]) if i_lamp is not None and r[i_lamp] else None,
        })

    if not pts:
        return {"ok": False, "error": "没有可用数据点"}

    ys = [p["y"] for p in pts]
    loads = [p["load"] for p in pts]
    lpds = [p["lpd"] for p in pts]
    xc = [p["x_ch4"] for p in pts]

    return {
        "ok": True,
        "points": pts,
        "n": len(pts),
        "axes": {
            "x": {"label": "负载 wt%", "min": min(loads), "max": max(loads), "scale": "log"},
            "y": {"label": "光强 mW/cm²", "min": min(lpds), "max": max(lpds), "scale": "linear"},
            "z": {"label": "CH₄ 体积分数 %", "min": min(xc), "max": max(xc), "scale": "linear"},
            "color": {"label": "产率", "min": min(ys), "max": max(ys)},
        },
    }


def old_lamp_surface(grid: int = 30) -> Dict[str, Any]:
    """旧灯 434 mW、0.05 wt% 条件下的流量响应曲面。

    只在 (CH4 体积分数, 总流量) 平面上插值，不涉及模型外推。
    插值方式：反距离加权（IDW），并给出每个网格点到最近实测的距离，
    距离过大处标为不可信。
    """
    import math as _m

    if not MASTER.exists():
        return {"ok": False, "error": "主表不存在"}

    wb = openpyxl.load_workbook(MASTER, data_only=True, read_only=True)
    src = wb["主表"] if "主表" in wb.sheetnames else wb.active
    rows = list(src.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return {"ok": False, "error": "主表为空"}

    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}

    def col(*names):
        for nm in names:
            if nm in ix:
                return ix[nm]
        return None

    i_metal = col("金属")
    i_load = col("负载量/wt% (Pd%)")
    i_lpd = col("光强/(mW·cm⁻²) (light_intensity)")
    i_ch4 = col("CH4流量/(mL·min⁻¹) (flow_CH4)")
    i_o2 = col("O2流量/(mL·min⁻¹)（同一批次最好是在同样的浓度下） (flow_O2)")
    i_ar = col("Ar流量/(mL·min⁻¹) (flow_Ar)")
    i_y = col("p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)")
    i_sel = col("C2+选择性/% (sel_C2+)")
    i_date = col("实验日期 (date)")

    pts = []
    for r in rows[1:]:
        if i_metal is not None and "Pd" not in str(r[i_metal] or ""):
            continue
        load = r[i_load]
        lpd = r[i_lpd]
        y = r[i_y]
        if not isinstance(load, (int, float)) or abs(float(load) - 0.05) > 1e-6:
            continue
        if not isinstance(lpd, (int, float)) or lpd <= 400:
            continue
        if not isinstance(y, (int, float)) or y <= 0:
            continue
        ch4 = r[i_ch4] if i_ch4 is not None and isinstance(r[i_ch4], (int, float)) else 0
        o2 = r[i_o2] if i_o2 is not None and isinstance(r[i_o2], (int, float)) else 0
        ar = r[i_ar] if i_ar is not None and isinstance(r[i_ar], (int, float)) else 0
        tot = ch4 + o2 + ar
        if tot <= 0:
            continue
        sel = r[i_sel] if i_sel is not None and isinstance(r[i_sel], (int, float)) else None
        pts.append({
            "x": round(100.0 * ch4 / tot, 2),
            "q": round(tot, 1),
            "y": round(float(y), 1),
            "sel": round(float(sel), 1) if sel is not None else None,
            "date": str(r[i_date])[:10] if i_date is not None and r[i_date] else None,
        })

    if len(pts) < 8:
        return {"ok": False, "error": f"旧灯 0.05% 只有 {len(pts)} 条，不足以插值"}

    xs = [p["x"] for p in pts]
    qs = [p["q"] for p in pts]
    x_lo, x_hi = min(xs), max(xs)
    q_lo, q_hi = min(qs), max(qs)
    # 网格范围略微收在实测范围内，不外推
    n = max(8, min(grid, 40))
    step_x = (x_hi - x_lo) / (n - 1) if n > 1 else 1.0
    step_q = (q_hi - q_lo) / (n - 1) if n > 1 else 1.0

    def idw(gx, gq):
        # 归一化距离，x 与 q 各自量纲差异大，先各自标准化
        sx = max(x_hi - x_lo, 1e-6)
        sq = max(q_hi - q_lo, 1e-6)
        num_y = num_s = 0.0
        w_sel = 0.0
        dmin = 9.0
        for p in pts:
            dx = (p["x"] - gx) / sx
            dq = (p["q"] - gq) / sq
            d = _m.hypot(dx, dq)
            dmin = min(dmin, d)
            if d < 1e-9:
                return p["y"], p["sel"], 0.0, 0
            w = 1.0 / (d ** 2.4)
            num_y += w * p["y"]
            if p["sel"] is not None:
                num_s += w * p["sel"]
                w_sel += w
        return (
            num_y / sum(1.0 / (((p["x"] - gx) / sx) ** 2 + ((p["q"] - gq) / sq) ** 2 + 1e-12) ** 1.2 for p in pts),
            (num_s / w_sel) if w_sel > 0 else None,
            dmin,
            0,
        )

    cells = []
    for i in range(n):
        gx = x_lo + step_x * i
        for j in range(n):
            gq = q_lo + step_q * j
            num = den = 0.0
            num_s = den_s = 0.0
            dmin = 9.0
            sx = max(x_hi - x_lo, 1e-6)
            sq = max(q_hi - q_lo, 1e-6)
            for p in pts:
                d = _m.hypot((p["x"] - gx) / sx, (p["q"] - gq) / sq)
                if d < 1e-9:
                    num = p["y"] * 1e6
                    den = 1e6
                    if p["sel"] is not None:
                        num_s, den_s = p["sel"] * 1e6, 1e6
                    dmin = 0.0
                    break
                w = 1.0 / (d ** 2.4)
                num += w * p["y"]
                den += w
                dmin = min(dmin, d)
                if p["sel"] is not None:
                    num_s += w * p["sel"]
                    den_s += w
            if den <= 0:
                continue
            cells.append({
                "x": round(gx, 2),
                "q": round(gq, 1),
                "y": round(num / den, 0),
                "sel": round(num_s / den_s, 1) if den_s > 0 else None,
                "d": round(dmin, 3),
            })

    # 当前最优点：网格内产率最高、且离实测够近
    good = [c for c in cells if c["d"] <= 0.22 and (c["sel"] is None or c["sel"] >= 60)]
    best = max(good, key=lambda c: c["y"]) if good else None

    return {
        "ok": True,
        "n_points": len(pts),
        "points": pts,
        "cells": cells,
        "grid": n,
        "domain": {
            "x": [round(x_lo, 1), round(x_hi, 1)],
            "q": [round(q_lo, 0), round(q_hi, 0)],
        },
        "best": best,
        "scope": "Pd–P25 · 0.05 wt% · 旧灯 434 mW/cm² · 1% 氧瓶",
    }
