# -*- coding: utf-8 -*-
"""世界模型预演：主表 p_C2+ 时空产率条件插值 + 微动力学特征 + 物理约束。

预测目标明确为：
  p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)
  与 C2+选择性/% (sel_C2+)

条件维：CH4/O2/Ar 流量、进料氧浓、负载量、光照。
对 Pd–P25 等主表有点的体系，用邻近实测加权；不再用会把空速打成 0 的 GHSV 高斯。
"""
from __future__ import annotations

import math
import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import openpyxl

_ROOT = Path(__file__).resolve().parents[2]
_WM = _ROOT / "wm_model"
_DATA = _ROOT / "data"
MASTER = str(_DATA / "OCM_master.xlsx")
if str(_WM) not in sys.path:
    sys.path.insert(0, str(_WM))

from .data import ALLCAT, POOL
from . import services

METALS = {
    "Pt": (2.28, 5.65), "Pd": (2.20, 5.60), "Au": (2.54, 5.10),
    "Ag": (1.93, 4.26), "Ru": (2.20, 4.71), "Cu": (1.90, 4.65),
    "Rh": (2.28, 4.98), "Ir": (2.20, 5.60), "Ni": (1.91, 5.15),
    "Co": (1.88, 5.00), "Fe": (1.83, 4.50), "Zn": (1.65, 4.33),
}
SUPPORTS = {
    "P25(TiO2)": (3.20, -0.10, 3.10),
    "Nb2O5": (3.40, -0.69, 2.71),
    "ZnO(70±30nm)": (3.37, -0.35, 2.90),
    "ZnO(30±10nm)": (3.37, -0.35, 2.90),
    "WO3(<100nm)": (2.75, 0.50, 3.20),
    "SrTiO3(100nm)": (3.25, -0.80, 2.45),
    "CeO2": (3.10, -0.44, 2.56),
    "SnO2(50-70nm)": (3.55, -0.20, 3.35),
    "In2O3": (2.80, -0.49, 2.40),
}

_SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉·₂", "0123456789.2")


def _norm(s: Any) -> str:
    return str(s or "").strip().lower().replace(" ", "").translate(_SUB)


def _metal_key(name: str) -> Optional[str]:
    n = _norm(name)
    head = n.split("/")[0]
    for k in METALS:
        kn = _norm(k)
        if kn == n or kn == head:
            return k
    for k in METALS:
        kn = _norm(k)
        if n.startswith(kn) or kn in n.split("/"):
            return k
    return None


def _support_key(name: str) -> Optional[str]:
    n = _norm(name)
    if "p25" in n or n in ("tio2", "anatase") or "tio2" in n:
        return "P25(TiO2)"
    for k in SUPPORTS:
        kn = _norm(k)
        base = kn.split("(")[0]
        if kn == n or base == n or base in n or n in kn:
            return k
    return None


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
    for i, h in enumerate(hdr):
        if h and str(h).startswith(name):
            return i
    raise KeyError(name)


def _is_p25(sup: Any) -> bool:
    s = re.sub(r"-\d+$", "", str(sup or "").strip()).lower()
    return "p25" in s or s.replace(" ", "") in ("tio2", "a-tio2", "anatase")


def catalog() -> Dict[str, Any]:
    metals = sorted(METALS.keys())
    supports = sorted(SUPPORTS.keys())
    pts = _master_points()
    combos = []
    seen = set()
    for p in pts:
        key = (p["metal"], p["support"])
        if key in seen:
            continue
        seen.add(key)
        combos.append({
            "metal": p["metal"], "support": p["support"],
            "y": p["y"], "s": p["sel"], "n": 1,
        })
    # 聚合 n
    from collections import defaultdict
    bag = defaultdict(list)
    for p in pts:
        bag[(p["metal"], p["support"])].append(p)
    combos = []
    for (m, s), group in bag.items():
        ys = [g["y"] for g in group]
        ss = [g["sel"] for g in group]
        combos.append({
            "metal": m, "support": s,
            "y": float(np.mean(ys)), "s": float(np.mean(ss)),
            "n": len(group), "y_max": float(np.max(ys)),
        })
    combos.sort(key=lambda x: -(x.get("y_max") or 0))
    return {"metals": metals, "supports": supports, "combos": combos[:40]}


@lru_cache(maxsize=1)
def _master_points() -> Tuple[Dict[str, Any], ...]:
    """读 OCM 主表全部有效点（金属×载体×条件 → p_C2+ / sel）。"""
    path = Path(MASTER)
    if not path.exists():
        return tuple()
    wb = openpyxl.load_workbook(MASTER, data_only=True)
    ws = wb["主表"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])
    wb.close()

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
        "o2_in": C("c_O2/%（进料）"),
    }
    out: List[Dict[str, Any]] = []
    for r in rows[1:]:
        metal_raw = str(r[ix["metal"]] or "").strip()
        mk = _metal_key(metal_raw)
        if not mk or _norm(metal_raw) != _norm(mk):
            # 只要纯金属行（排除 Au/Pd 等）
            continue
        sk = _support_key(r[ix["sup"]])
        if not sk:
            continue
        y = _num(r[ix["y"]])
        sel = _num(r[ix["sel"]])
        load = _num(r[ix["load"]])
        ch4 = _num(r[ix["ch4"]])
        o2 = _num(r[ix["o2"]])
        ar = _num(r[ix["ar"]])
        lpd = _num(r[ix["lpd"]])
        o2_in = _num(r[ix["o2_in"]])
        if y is None or y <= 0 or sel is None or sel <= 0:
            continue
        if ch4 is None or ch4 <= 0 or load is None or load <= 0:
            continue
        out.append({
            "metal": mk,
            "support": sk,
            "load": float(load),
            "ch4": float(ch4),
            "o2": float(o2 if o2 is not None else 0.0),
            "ar": float(ar if ar is not None else 0.0),
            "lpd": float(lpd) if lpd is not None else None,
            "o2_in": float(o2_in) if o2_in is not None else None,
            "y": float(y),
            "sel": float(sel),
        })
    return tuple(out)


def _find_candidate(metal: str, support: str) -> Dict[str, Any]:
    mk = _metal_key(metal) or metal
    sk = _support_key(support) or support
    best = None
    best_score = -1.0
    for p in ALLCAT:
        pm = str(p.get("metal") or "")
        ps = str(p.get("support_display") or p.get("support") or "")
        if _norm(pm) != _norm(mk):
            continue
        if _support_key(ps) != sk:
            continue
        score = float(p.get("y") or 0)
        if score > best_score:
            best_score = score
            best = p
    if best:
        cand = dict(best)
    else:
        cand = {
            "id": f"wm-{mk}-{sk}",
            "metal": mk, "support": sk, "support_display": sk,
            "mech": "OCM", "product": "C2",
            "y": None, "s": None, "bg": None, "ad": None, "domain": "OCM",
        }
    if sk in SUPPORTS:
        Eg, CB, VB = SUPPORTS[sk]
        if cand.get("bg") is None:
            cand["bg"] = Eg
        cand["_band"] = {"Eg": Eg, "CB": CB, "VB": VB}
    if mk in METALS:
        en, wf = METALS[mk]
        cand["_metal_desc"] = {"en": en, "wf": wf}
    cand["metal"] = mk
    cand["support"] = sk
    cand["support_display"] = sk
    return cand


def _kinetics(cand: Dict[str, Any], flows: Tuple[float, float, float]) -> Optional[Dict[str, Any]]:
    try:
        import wm_kinetics as wm  # type: ignore
    except Exception:
        return None
    md = cand.get("_metal_desc") or {}
    band = cand.get("_band") or {}
    en, wf = md.get("en"), md.get("wf")
    if en is None or wf is None:
        return None
    support = None
    if band.get("Eg") is not None:
        support = (band["Eg"], band["CB"], band["VB"])
    try:
        return wm.worldmodel_predict(en, wf, support=support, flows=flows)
    except Exception:
        return None


def _cond_vec(p: Dict[str, Any], lpd_ref: float) -> np.ndarray:
    """归一化条件向量：负载、流量、氧浓、相对光强。"""
    tot = max(p["ch4"] + p["o2"] + p["ar"], 1e-6)
    o2_in = p.get("o2_in")
    if o2_in is None:
        o2_in = 100.0 * p["o2"] / tot if tot > 0 else 1.0
    lpd = p.get("lpd")
    rel_i = (float(lpd) / lpd_ref) if (lpd is not None and lpd_ref > 0) else 0.5
    return np.array([
        math.log10(max(p["load"], 1e-3)),
        p["ch4"] / 100.0,
        p["o2"] / 100.0,
        p["ar"] / 100.0,
        o2_in / 10.0,
        rel_i,
    ], dtype=float)


def _knn_predict(
    points: List[Dict[str, Any]],
    query: Dict[str, Any],
    k: int = 8,
) -> Dict[str, Any]:
    if not points:
        return {"y": None, "sel": None, "unc": None, "n_local": 0, "neighbors": []}
    lpds = [p["lpd"] for p in points if p.get("lpd")]
    lpd_ref = float(max(lpds)) if lpds else max(float(query.get("lpd") or 100.0), 1.0)
    q = _cond_vec(query, lpd_ref)
    scored = []
    for p in points:
        v = _cond_vec(p, lpd_ref)
        d = float(np.linalg.norm(q - v))
        scored.append((d, p))
    scored.sort(key=lambda x: x[0])
    d0 = float(scored[0][0]) if scored else 9.0

    # 条件几乎完全重合：直接用实测点（若有多条同条件，取均值）
    EXACT = 0.05
    if d0 <= EXACT:
        exact_pts = [p for d, p in scored if d <= EXACT]
        ys = np.array([p["y"] for p in exact_pts], dtype=float)
        ss = np.array([p["sel"] for p in exact_pts], dtype=float)
        mu_y = float(ys.mean())
        mu_s = float(ss.mean())
        if len(ys) >= 2:
            unc = float(ys.std(ddof=1)) + 0.02 * mu_y
        else:
            unc = 0.08 * mu_y
        w_show = np.ones(min(5, len(exact_pts))) / min(5, len(exact_pts))
        nn_show = [(0.0, p) for p in exact_pts[:5]]
        return {
            "y": mu_y,
            "sel": mu_s,
            "unc": unc,
            "n_local": len(exact_pts),
            "n_pool": len(points),
            "d_min": d0,
            "exact": True,
            "neighbors": [
                {
                    "y": round(p["y"], 1),
                    "sel": round(p["sel"], 1),
                    "load": p["load"],
                    "ch4": p["ch4"],
                    "o2": p["o2"],
                    "ar": p["ar"],
                    "lpd": p.get("lpd"),
                    "o2_in": p.get("o2_in"),
                    "d": round(d, 3),
                    "w": round(float(ww), 3),
                }
                for (d, p), ww in zip(nn_show, w_show)
            ],
        }

    nn = scored[: max(1, min(k, len(scored)))]
    dists = np.array([d for d, _ in nn], dtype=float)
    scale = float(np.median(dists)) if len(dists) else 1.0
    scale = max(scale, 0.08)
    w = np.exp(-(dists / scale) ** 2)
    w = w / max(float(w.sum()), 1e-12)
    ys = np.array([p["y"] for _, p in nn], dtype=float)
    ss = np.array([p["sel"] for _, p in nn], dtype=float)
    mu_y = float(np.dot(w, ys))
    mu_s = float(np.dot(w, ss))
    var = float(np.dot(w, (ys - mu_y) ** 2))
    unc = math.sqrt(max(var, 0.0)) + 0.05 * mu_y
    if d0 > 1.2 * scale:
        global_mu = float(np.mean([p["y"] for p in points]))
        shrink = min(0.45, (d0 / scale - 1.2) * 0.15)
        mu_y = (1 - shrink) * mu_y + shrink * global_mu
        unc *= 1.0 + shrink * 2.0
    return {
        "y": mu_y,
        "sel": mu_s,
        "unc": unc,
        "n_local": len(nn),
        "n_pool": len(points),
        "d_min": d0,
        "exact": False,
        "neighbors": [
            {
                "y": round(p["y"], 1),
                "sel": round(p["sel"], 1),
                "load": p["load"],
                "ch4": p["ch4"],
                "o2": p["o2"],
                "ar": p["ar"],
                "lpd": p.get("lpd"),
                "o2_in": p.get("o2_in"),
                "d": round(d, 3),
                "w": round(float(ww), 3),
            }
            for (d, p), ww in zip(nn[:5], w[:5])
        ],
    }


def _verdict_emp(exact: bool, n_local: int, n_pool: int, d_min: float) -> Dict[str, Any]:
    if n_pool <= 0:
        return {"level": "risk", "label": "无锚点", "why": "主表无该体系实测，经验层不可用"}
    if exact:
        return {
            "level": "go", "label": "实测锚定",
            "why": f"同条件实测 n={n_local}：均值作点估计，离散作不确定度（纯统计）",
        }
    if d_min > 1.5:
        return {"level": "risk", "label": "邻域较远", "why": "最近实测偏远，插值外推成分大"}
    return {"level": "go", "label": "邻域插值", "why": "用邻近实测加权平均（仍是数学）"}


def _verdict_wm(constraints: List[dict], kin: Optional[dict]) -> Dict[str, Any]:
    fails = sum(1 for c in constraints if c.get("st") == "fail")
    warns = sum(1 for c in constraints if c.get("st") == "warn")
    if fails > 0:
        return {
            "level": "reject", "label": "别做",
            "why": f"{fails} 条物理约束失败；机理闸门否决",
            "fails": fails, "warns": warns,
        }
    if warns >= 8:
        return {
            "level": "risk", "label": "高风险",
            "why": f"告警 {warns} 条，描述符/能带需复核",
            "fails": fails, "warns": warns,
        }
    flow = (kin or {}).get("flow_sel")
    tip = ""
    if flow is not None and float(flow) < 0.6:
        tip = "；flow_sel 偏低，氧分压可能促深度氧化"
    return {
        "level": "go", "label": "可外推试",
        "why": f"约束无失败，微动力学特征可用于条件外推{tip}",
        "fails": fails, "warns": warns,
    }


def _wm_extrapolate(
    pool: List[Dict[str, Any]],
    query: Dict[str, Any],
    kin: Optional[dict],
    emp_y: Optional[float],
    emp_s: Optional[float],
    d_min: float,
) -> Dict[str, Any]:
    """世界模型层：以池中位数为锚，用微动力学特征相对调制，体现可外推方向。"""
    if pool:
        y0 = float(np.median([p["y"] for p in pool]))
        s0 = float(np.median([p["sel"] for p in pool]))
        # 相对「典型」条件的特征
        med_ch4 = float(np.median([p["ch4"] for p in pool]))
        med_o2 = float(np.median([p["o2"] for p in pool]))
        med_ar = float(np.median([p["ar"] for p in pool]))
        med_load = float(np.median([p["load"] for p in pool]))
        med_lpd = float(np.median([p["lpd"] for p in pool if p.get("lpd")] or [100]))
    else:
        y0 = float(emp_y or 5000)
        s0 = float(emp_s or 70)
        med_ch4, med_o2, med_ar, med_load, med_lpd = 69.0, 1.0, 10.0, 1.0, 100.0

    kin = kin or {}
    act = float(kin.get("act") or 0.5)
    flow_sel = float(kin.get("flow_sel") or 0.85)
    h_sel = float(kin.get("h_sel") or 1.0)
    absorb = float(kin.get("absorb") or 1.0)

    # 相对中性特征的增益
    f_act = 0.75 + 0.5 * act
    f_flow = 0.7 + 0.4 * flow_sel
    f_h = 0.75 + 0.3 * h_sel
    f_abs = 0.8 + 0.25 * absorb
    # 负载 / 光照相对中位数
    f_load = math.exp(-((math.log10(max(query["load"], 1e-3)) - math.log10(max(med_load, 1e-3))) / 0.85) ** 2)
    f_load = 0.55 + 0.45 * f_load
    f_light = math.exp(-((query["lpd"] - med_lpd) / max(med_lpd * 0.8, 20)) ** 2)
    f_light = 0.55 + 0.45 * f_light

    y_wm = y0 * f_act * f_flow * f_h * f_abs * f_load * f_light
    s_wm = s0 * (0.85 + 0.2 * flow_sel) * (0.9 + 0.15 * h_sel)
    s_wm = max(5.0, min(99.0, s_wm))

    # 离邻域越远，世界模型权重越高、不确定度越大
    blend = min(0.85, 0.15 + 0.35 * max(d_min, 0.0))
    if emp_y is not None:
        # 报告「纯世界模型」值；同时给与经验融合的参考
        y_blend = (1 - blend) * emp_y + blend * y_wm
    else:
        y_blend = y_wm
        blend = 1.0
    unc = 0.18 * y_wm * (1.0 + blend)

    return {
        "y": round(y_wm, 1),
        "sel": round(s_wm, 1),
        "unc": round(unc, 1),
        "y_blend": round(y_blend, 1),
        "blend": round(blend, 3),
        "anchor_y": round(y0, 1),
        "factors": {
            "act": round(f_act, 3),
            "flow": round(f_flow, 3),
            "h_sel": round(f_h, 3),
            "absorb": round(f_abs, 3),
            "load": round(f_load, 3),
            "light": round(f_light, 3),
        },
        "ref_cond": {
            "load": round(med_load, 3),
            "ch4": round(med_ch4, 1),
            "o2": round(med_o2, 1),
            "ar": round(med_ar, 1),
            "lpd": round(med_lpd, 1),
        },
        "note": "以主表中位数为物理锚，用微动力学特征调制；远离邻域时外推权重上升",
    }


def _ai_suggest(
    pool: List[Dict[str, Any]],
    query: Dict[str, Any],
    kappa: float = 1.5,
    topn: int = 3,
) -> Dict[str, Any]:
    """主动学习：在当前邻域扫一小格，UCB = μ + κσ，挑未测过的高不确定点。"""
    if not pool:
        return {"strategy": "UCB", "items": [], "note": "无主表点，无法提采集建议"}

    # 已测条件指纹
    def fp(p):
        return (
            round(float(p["load"]), 3),
            round(float(p["ch4"]), 1),
            round(float(p["o2"]), 1),
            round(float(p["ar"]), 1),
            round(float(p.get("lpd") or 0), 0),
            round(float(p.get("o2_in") or 0), 1),
        )

    seen = {fp(p) for p in pool}
    loads = sorted({round(p["load"], 3) for p in pool})
    # 小网格扰动（控制规模，保证交互延迟）
    base = dict(query)
    load_opts = sorted(set(
        [base["load"]] +
        ([min(loads, key=lambda x: abs(x - base["load"] * r)) for r in (0.5, 0.8, 1.2, 2.0)] if loads else [0.05, 0.1, 0.5, 1.0])
    ))
    cands = []
    for ld in load_opts[:6]:
        for lpd in sorted(set([base["lpd"], max(20, base["lpd"] - 30), base["lpd"] + 30, 60, 100, 150]))[:5]:
            for o2_in in sorted(set([base["o2_in"], 0.5, 1.0, 2.0, 5.0]))[:4]:
                for ch4, o2f, ar in (
                    (base["ch4"], base["o2"], base["ar"]),
                    (100, 1, 10),
                    (100, 100, 20),
                    (50, 1, 50),
                    (80, 50, 20),
                ):
                    cc = {
                        "load": float(ld),
                        "ch4": float(ch4),
                        "o2": float(o2f),
                        "ar": float(ar),
                        "lpd": float(lpd),
                        "o2_in": float(o2_in),
                    }
                    if fp(cc) in seen:
                        continue
                    cands.append(cc)
    uniq = {fp(c): c for c in cands}
    cands = list(uniq.values())

    scored = []
    for c in cands:
        kn = _knn_predict(pool, c, k=6)
        if kn["y"] is None:
            continue
        mu, sig = float(kn["y"]), float(kn["unc"])
        # 距离奖励：越远越值得探索（有上限）
        explore = min(1.2, 0.3 + 0.4 * float(kn.get("d_min") or 0))
        ucb = mu + kappa * sig * explore
        scored.append({
            "load": c["load"],
            "ch4": c["ch4"],
            "o2": c["o2"],
            "ar": c["ar"],
            "lpd": c["lpd"],
            "o2_in": c["o2_in"],
            "mu_y": round(mu, 1),
            "sigma": round(sig, 1),
            "ucb": round(ucb, 1),
            "d_min": round(float(kn.get("d_min") or 0), 3),
            "why": "高不确定 × 邻域外推" if (kn.get("d_min") or 0) > 0.4 else "高 UCB 利用/探索折中",
        })
    scored.sort(key=lambda x: -x["ucb"])
    # 多样性：负载别全挤在一起
    picked = []
    used_load = set()
    for s in scored:
        key = round(s["load"], 2)
        if key in used_load:
            continue
        used_load.add(key)
        picked.append(s)
        if len(picked) >= topn:
            break
    if len(picked) < topn:
        for s in scored:
            if s in picked:
                continue
            picked.append(s)
            if len(picked) >= topn:
                break

    return {
        "strategy": "UCB",
        "kappa": kappa,
        "note": "在未测条件上最大化 μ+κσ，提示下一组该测什么（主动学习）",
        "items": picked,
    }


def preview(
    metal: str = "Pd",
    support: str = "P25(TiO2)",
    ch4: float = 69.0,
    o2: float = 1.0,
    ar: float = 10.0,
    o2_pct: float = 1.0,
    loading: float = 1.0,
    light: float = 100.0,
) -> Dict[str, Any]:
    cand = _find_candidate(metal, support)
    mk, sk = cand.get("metal"), cand.get("support")
    flows = (float(ch4), float(o2), float(ar))
    loading = float(loading)
    light = float(light)
    o2_pct = float(o2_pct)

    all_pts = list(_master_points())
    pool = [p for p in all_pts if p["metal"] == mk and p["support"] == sk]
    query = {
        "load": max(loading, 1e-3),
        "ch4": float(ch4),
        "o2": float(o2),
        "ar": float(ar),
        "lpd": light,
        "o2_in": o2_pct,
    }
    knn = _knn_predict(pool, query, k=8)
    kin = _kinetics(cand, flows)
    constraints = services.compute_constraints(cand)

    # —— ① 经验层（数学）——
    if knn.get("y") is not None:
        emp_y, emp_s, emp_unc = float(knn["y"]), float(knn["sel"]), float(knn["unc"])
        exact = bool(knn.get("exact"))
        if exact:
            emp_tag = f"同条件实测均值 n={knn['n_local']}"
            emp_model = "exact_mean"
        else:
            emp_tag = f"邻近加权插值 局部{knn['n_local']}/{knn['n_pool']}"
            emp_model = "knn"
        hist_y = float(np.mean([p["y"] for p in pool])) if pool else None
        hist_s = float(np.mean([p["sel"] for p in pool])) if pool else None
        hist_max = float(np.max([p["y"] for p in pool])) if pool else None
    else:
        emp_y = emp_s = emp_unc = None
        exact = False
        emp_tag = "主表无点"
        emp_model = "none"
        hist_y = hist_s = hist_max = None
        knn = {"n_pool": 0, "n_local": 0, "d_min": 9.0, "neighbors": [], "exact": False}

    layer_emp = {
        "name": "经验层 · 数学",
        "role": "条件已做过 → 实测均值/邻域插值；不创造新知识",
        "verdict": _verdict_emp(exact, knn.get("n_local") or 0, knn.get("n_pool") or 0, knn.get("d_min") or 9),
        "predict": None if emp_y is None else {
            "y": round(emp_y, 1),
            "unc": round(emp_unc, 1),
            "sel": round(emp_s, 1),
            "y_lo": round(max(0.0, emp_y - emp_unc), 1),
            "y_hi": round(emp_y + emp_unc, 1),
            "model": emp_model,
        },
        "tag": emp_tag,
        "neighbors": knn.get("neighbors") or [],
        "history": {
            "n": knn.get("n_pool") or 0,
            "mean_y": None if hist_y is None else round(hist_y, 1),
            "mean_s": None if hist_s is None else round(hist_s, 1),
            "max_y": None if hist_max is None else round(hist_max, 1),
        },
    }

    # —— ② 世界模型层（机理/约束 + 微动力学外推）——
    wm = _wm_extrapolate(pool, query, kin, emp_y, emp_s, float(knn.get("d_min") or 9))
    layer_wm = {
        "name": "世界模型层 · 机理外推",
        "role": "约束闸门 + 微动力学特征，离开邻域仍可推断方向",
        "verdict": _verdict_wm(constraints, kin),
        "predict": {
            "y": wm["y"],
            "unc": wm["unc"],
            "sel": wm["sel"],
            "y_lo": round(max(0.0, wm["y"] - wm["unc"]), 1),
            "y_hi": round(wm["y"] + wm["unc"], 1),
            "y_blend": wm["y_blend"],
            "blend": wm["blend"],
            "model": "kinetics_extrapolate",
        },
        "kinetics": kin,
        "factors": wm["factors"],
        "anchor_y": wm["anchor_y"],
        "ref_cond": wm["ref_cond"],
        "note": wm["note"],
        "constraints_summary": {
            "fails": sum(1 for c in constraints if c.get("st") == "fail"),
            "warns": sum(1 for c in constraints if c.get("st") == "warn"),
            "n": len(constraints),
        },
    }

    # —— ③ AI / 主动学习层 ——
    ai = _ai_suggest(pool, query)
    layer_ai = {
        "name": "主动学习层 · AI 采集",
        "role": "在不确定处决定下一组该测什么，用新数据校准前两层",
        "strategy": ai["strategy"],
        "note": ai["note"],
        "kappa": ai.get("kappa"),
        "suggestions": ai.get("items") or [],
    }

    # 总裁决：优先约束失败；否则看经验是否精确 / 世界模型风险
    v_wm = layer_wm["verdict"]
    if v_wm.get("level") == "reject":
        verd = dict(v_wm)
    elif exact and emp_y is not None:
        verd = {
            "level": "go", "label": "可做（实测锚定）",
            "why": "经验层已有同条件实测；世界模型作旁证，主动学习可扫邻域空白",
            "fails": v_wm.get("fails", 0), "warns": v_wm.get("warns", 0),
        }
    else:
        verd = {
            "level": v_wm.get("level") or "go",
            "label": v_wm.get("label") or "可做",
            "why": "综合三层：经验插值 + 世界模型外推 + 主动学习建议",
            "fails": v_wm.get("fails", 0), "warns": v_wm.get("warns", 0),
        }

    # 兼容旧字段：主预测优先经验，否则世界模型
    if emp_y is not None:
        main = layer_emp["predict"]
        main_tag = emp_tag
    else:
        main = layer_wm["predict"]
        main_tag = "世界模型外推"

    return {
        "ok": True,
        "metric": {
            "y": "p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)",
            "sel": "C2+选择性/% (sel_C2+)",
        },
        "input": {
            "metal": mk,
            "support": sk,
            "flows": {"ch4": flows[0], "o2": flows[1], "ar": flows[2]},
            "o2_pct": o2_pct,
            "loading": loading,
            "light": light,
            "mech": cand.get("mech") or "OCM",
        },
        "layers": {
            "empirical": layer_emp,
            "world_model": layer_wm,
            "active_learning": layer_ai,
        },
        # 兼容旧 UI
        "history": {**layer_emp["history"], "tag": main_tag},
        "predict": main,
        "factors": layer_wm.get("factors") or {},
        "neighbors": layer_emp.get("neighbors") or [],
        "kinetics": kin,
        "constraints": constraints,
        "verdict": verd,
        "candidate_id": cand.get("id"),
        "doi": cand.get("doi"),
        "title": cand.get("title") or "",
    }
