# -*- coding: utf-8 -*-
"""分层可校准世界模型（Pd–P25 MVP）

合成链路（本文件实现反应器核心；气路/光照先做可版本化透传+完整度标记）：
  设定 → gas/light 层（透传 + σ/完整度）
       → 反应器：动力学先验(wm_kinetics 特征 + Ridge) + 条件残差
       → 输出 μ_y, μ_sel, σ, in_domain, layers…

消融：table_knn / prior_only / prior_residual
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

try:
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
except ImportError as e:  # pragma: no cover
    raise ImportError("layered_wm 需要 scikit-learn") from e

try:
    import wm_kinetics as wm
    import lamp_calib as CAL
except ImportError:
    from pathlib import Path
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import wm_kinetics as wm  # type: ignore
    import lamp_calib as CAL  # type: ignore

PD_EN, PD_WF = 2.20, 5.60
P25_BAND = (3.20, -0.10, 3.10)  # Eg, CB, VB


def _num(v: Any) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        x = float(v)
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    except (TypeError, ValueError):
        return None


def gas_layer(ch4: float, o2: float, ar: float) -> Dict[str, Any]:
    """气路层 MVP：设定即输出；预留增益标定接口。"""
    return {
        "name": "gas",
        "version": "passthrough-v1",
        "set": {"ch4": ch4, "o2": o2, "ar": ar},
        "actual": {"ch4": ch4, "o2": o2, "ar": ar},
        "sigma_rel": 0.02,
        "note": "未接流量计标定时透传设定值",
    }


def light_layer(
    power_or_lpd: Optional[float],
    lpd_ref: float,
    unit: Optional[str] = None,
) -> Dict[str, Any]:
    """光照层：按实验灯标定表换算，并统一到训练用的相对光功率口径。

    标定五档：20/40/60/80/100 W → 62.4/113.4/163.1/211.5/257.3 mW/cm2。
    power_pct = LPD / lpd_ref × 100，lpd_ref 是训练点的最大光强（可能高于灯上限 257.3，
    历史数据里有 433.9 的点），保证训练与预测同一把尺子。
    lamp_pct 是相对灯本身满量程的百分比，只用于显示。
    """
    incomplete = power_or_lpd is None or float(power_or_lpd or 0) <= 0
    ref = float(lpd_ref or CAL.LPD_MAX)
    if incomplete:
        return {
            "name": "light",
            "version": "calib-v1",
            "lpd_or_power": None,
            "lpd_ref": ref,
            "power_pct": 50.0,
            "lamp_pct": 50.0,
            "power_w": None,
            "lpd": None,
            "incomplete": True,
            "sigma_rel": 0.15,
            "note": "缺光强，暂按 50% 填充",
        }
    norm = CAL.normalize(power_or_lpd, unit)
    lpd = float(norm["lpd"])
    rel = CAL.rel_from_lpd_ref(lpd, ref)
    return {
        "name": "light",
        "version": "calib-v1",
        "lpd_or_power": float(power_or_lpd),
        "lpd_ref": ref,
        "power_pct": float(rel if rel is not None else 50.0),
        "lamp_pct": round(float(norm["lamp_pct"]), 1),
        "power_w": round(float(norm["power_w"]), 1),
        "display_w": round(float(CAL.display_from_power(norm["power_w"])), 3),
        "lpd": round(lpd, 2),
        "incomplete": False,
        "sigma_rel": 0.05,
        "note": "灯标定：100 W→257.3 mW/cm2；power_pct 以训练最大光强为满量程",
    }


def _kin_feats(ch4: float, o2: float, ar: float) -> Dict[str, float]:
    f = wm.worldmodel_predict(PD_EN, PD_WF, support=P25_BAND, flows=(ch4, o2, ar))
    return {
        "act": float(f["act"]),
        "red": float(f["red"]),
        "absorb": float(f["absorb"]),
        "h_sel": float(f["h_sel"]),
        "flow_sel": float(f["flow_sel"]),
        "pCH4": float(f["pCH4"]),
        "pO2": float(f["pO2"]),
    }


def _cond_feats(p: Dict[str, Any], lpd_ref: float) -> np.ndarray:
    ch4 = float(p.get("ch4") or 0.0)
    o2 = float(p.get("o2") or 0.0)
    ar = float(p.get("ar") or 0.0)
    load = max(float(p.get("load") or 1e-3), 1e-3)
    o2_in = p.get("o2_in")
    tot = max(ch4 + o2 + ar, 1e-6)
    if o2_in is None:
        o2_in = 100.0 * o2 / tot
    has_lpd = p.get("lpd") is not None
    light = light_layer(
        p.get("lpd") if has_lpd else p.get("power"),
        lpd_ref,
        unit="lpd" if has_lpd else "rel",
    )
    return np.array([
        math.log10(load),
        ch4 / 100.0,
        o2 / 100.0,
        ar / 100.0,
        float(o2_in) / 10.0,
        light["power_pct"] / 100.0,
        0.0 if light["incomplete"] else 1.0,
    ], dtype=float)


def _prior_feats(p: Dict[str, Any]) -> np.ndarray:
    ch4 = float(p.get("ch4") or 0.0)
    o2 = float(p.get("o2") or 0.0)
    ar = float(p.get("ar") or 0.0)
    load = max(float(p.get("load") or 1e-3), 1e-3)
    k = _kin_feats(ch4, o2, ar)
    return np.array([
        k["act"], k["red"], k["absorb"], k["h_sel"], k["flow_sel"],
        k["pCH4"], k["pO2"], math.log10(load),
    ], dtype=float)


def _lpd_ref(points: Sequence[Dict[str, Any]]) -> float:
    """相对光功率的满量程：取训练点最大 LPD，不低于灯标定 100 W 的 257.3。"""
    lpds = [float(p["lpd"]) for p in points if _num(p.get("lpd")) and float(p["lpd"]) > 0]
    return max(float(max(lpds)) if lpds else 0.0, float(CAL.LPD_MAX))


def _sample_weight(p: Dict[str, Any]) -> float:
    w = 1.0
    if _num(p.get("lpd")) is None or float(p.get("lpd") or 0) <= 0:
        w *= 0.5
    if _num(p.get("m_cat")) is None:
        w *= 0.85
    return w


@dataclass
class LayeredWorldModel:
    """Pd–P25 prior + residual。"""

    lpd_ref: float = float(CAL.LPD_MAX)
    prior_y: Any = None
    prior_s: Any = None
    prior_scaler: Any = None
    res_y: Any = None
    res_s: Any = None
    res_scaler: Any = None
    train_X_cond: Optional[np.ndarray] = None
    train_meta: Dict[str, Any] = field(default_factory=dict)

    def fit(self, points: List[Dict[str, Any]]) -> "LayeredWorldModel":
        pts = [p for p in points if _num(p.get("y")) and _num(p.get("sel")) and float(p["y"]) > 0]
        if len(pts) < 8:
            raise ValueError(f"训练点过少：{len(pts)}")
        self.lpd_ref = _lpd_ref(pts)
        Xp = np.vstack([_prior_feats(p) for p in pts])
        Xc = np.vstack([_cond_feats(p, self.lpd_ref) for p in pts])
        y_log = np.log10(np.array([float(p["y"]) for p in pts], dtype=float))
        y_sel = np.array([float(p["sel"]) for p in pts], dtype=float)
        w = np.array([_sample_weight(p) for p in pts], dtype=float)

        self.prior_scaler = StandardScaler().fit(Xp)
        Xs = self.prior_scaler.transform(Xp)
        self.prior_y = Ridge(alpha=1.0).fit(Xs, y_log, sample_weight=w)
        self.prior_s = Ridge(alpha=1.0).fit(Xs, y_sel, sample_weight=w)

        prior_log = self.prior_y.predict(Xs)
        prior_sel = self.prior_s.predict(Xs)
        resid_log = y_log - prior_log
        resid_sel = y_sel - prior_sel

        self.res_scaler = StandardScaler().fit(Xc)
        Xrs = self.res_scaler.transform(Xc)
        # 残差用浅 GBDT，点少时比深网稳
        self.res_y = GradientBoostingRegressor(
            random_state=0, max_depth=2, n_estimators=80, learning_rate=0.08
        ).fit(Xrs, resid_log, sample_weight=w)
        self.res_s = GradientBoostingRegressor(
            random_state=0, max_depth=2, n_estimators=80, learning_rate=0.08
        ).fit(Xrs, resid_sel, sample_weight=w)

        self.train_X_cond = Xc
        loads = sorted({round(float(p["load"]), 3) for p in pts})
        self.train_meta = {
            "n_train": len(pts),
            "n_incomplete_light": sum(
                1 for p in pts if _num(p.get("lpd")) is None or float(p.get("lpd") or 0) <= 0
            ),
            "n_missing_mass": sum(1 for p in pts if _num(p.get("m_cat")) is None),
            "loads": loads,
            "lpd_ref": self.lpd_ref,
            "y_min": float(min(float(p["y"]) for p in pts)),
            "y_max": float(max(float(p["y"]) for p in pts)),
        }
        return self

    def _domain(self, x_cond: np.ndarray) -> Dict[str, Any]:
        if self.train_X_cond is None or len(self.train_X_cond) == 0:
            return {"in_domain": False, "d_min": 9.0, "score": 0.0}
        d = np.linalg.norm(self.train_X_cond - x_cond[None, :], axis=1)
        d_min = float(d.min())
        # 经验阈值：条件向量 L2
        in_dom = d_min <= 0.85
        score = float(math.exp(-d_min / 0.4))
        return {"in_domain": in_dom, "d_min": round(d_min, 4), "score": round(score, 4)}

    def predict(self, query: Dict[str, Any], mode: str = "prior_residual") -> Dict[str, Any]:
        """mode: prior_only | prior_residual | table_knn（knn 需外部传入 pool 时另用）"""
        ch4 = float(query.get("ch4") or 0.0)
        o2 = float(query.get("o2") or 0.0)
        ar = float(query.get("ar") or 0.0)
        gas = gas_layer(ch4, o2, ar)
        light = light_layer(
            query.get("lpd") if query.get("lpd") is not None else query.get("power"),
            self.lpd_ref,
            unit="lpd" if query.get("lpd") is not None else "rel",
        )
        q = {
            "load": float(query.get("load") or query.get("loading") or 0.05),
            "ch4": gas["actual"]["ch4"],
            "o2": gas["actual"]["o2"],
            "ar": gas["actual"]["ar"],
            "lpd": query.get("lpd"),
            "power": light["power_pct"],
            "o2_in": query.get("o2_in"),
            "m_cat": query.get("m_cat"),
        }
        xp = _prior_feats(q).reshape(1, -1)
        xc = _cond_feats(q, self.lpd_ref)
        xps = self.prior_scaler.transform(xp)
        prior_log = float(self.prior_y.predict(xps)[0])
        prior_sel = float(self.prior_s.predict(xps)[0])
        prior_y = 10 ** prior_log

        dom = self._domain(xc)
        if mode == "prior_only":
            mu_y, mu_s = prior_y, prior_sel
            sigma = 0.25 * mu_y * (1.2 if light["incomplete"] else 1.0)
            tag = "prior_only"
            blend = 0.0
        else:
            xrs = self.res_scaler.transform(xc.reshape(1, -1))
            eps_log = float(self.res_y.predict(xrs)[0])
            eps_sel = float(self.res_s.predict(xrs)[0])
            # 域内多用残差，域外回退先验（避免稠密低负载把高负载带飞）
            blend = float(dom["score"])
            if not dom["in_domain"]:
                blend *= 0.35
            log_mu = prior_log + blend * eps_log
            mu_y = 10 ** log_mu
            mu_s = prior_sel + blend * eps_sel
            sigma = (0.12 + 0.28 * (1.0 - blend)) * mu_y
            if light["incomplete"]:
                sigma *= 1.3
            tag = "prior_residual"

        mu_s = float(max(0.0, min(100.0, mu_s)))
        mu_y = float(max(1.0, mu_y))
        kin = _kin_feats(ch4, o2, ar)
        return {
            "ok": True,
            "mode": tag,
            "y": round(mu_y, 1),
            "sel": round(mu_s, 2),
            "unc": round(float(sigma), 1),
            "y_lo": round(max(0.0, mu_y - sigma), 1),
            "y_hi": round(mu_y + sigma, 1),
            "in_domain": dom["in_domain"],
            "domain": dom,
            "prior": {"y": round(prior_y, 1), "sel": round(prior_sel, 2)},
            "residual_blend": round(float(blend if mode != "prior_only" else 0.0), 3),
            "kinetics": kin,
            "layers": {
                "gas": gas,
                "light": light,
                "reactor": {
                    "name": "reactor",
                    "version": "prior+residual-v1",
                    "mode": tag,
                    "prior_y": round(prior_y, 1),
                    "prior_sel": round(prior_sel, 2),
                    "residual_blend": round(float(blend if mode != "prior_only" else 0.0), 3),
                },
            },
            "train_meta": self.train_meta,
        }


def knn_predict(points: List[Dict[str, Any]], query: Dict[str, Any], k: int = 8) -> Dict[str, Any]:
    """表模型基线：条件 kNN。"""
    if not points:
        return {"y": None, "sel": None, "unc": None, "n_local": 0}
    ref = _lpd_ref(points)
    q = _cond_feats(query, ref)
    scored = []
    for p in points:
        d = float(np.linalg.norm(q - _cond_feats(p, ref)))
        scored.append((d, p))
    scored.sort(key=lambda x: x[0])
    nn = scored[: max(1, min(k, len(scored)))]
    dists = np.array([d for d, _ in nn], dtype=float)
    scale = max(float(np.median(dists)), 0.08)
    w = np.exp(-(dists / scale) ** 2)
    w = w / max(float(w.sum()), 1e-12)
    ys = np.array([float(p["y"]) for _, p in nn])
    ss = np.array([float(p["sel"]) for _, p in nn])
    mu_y = float(np.dot(w, ys))
    mu_s = float(np.dot(w, ss))
    unc = float(math.sqrt(max(float(np.dot(w, (ys - mu_y) ** 2)), 0.0)) + 0.05 * mu_y)
    return {
        "y": mu_y,
        "sel": mu_s,
        "unc": unc,
        "n_local": len(nn),
        "d_min": float(dists[0]),
        "mode": "table_knn",
    }


def _metrics(y_true: np.ndarray, y_pred: np.ndarray, sel_true: np.ndarray, sel_pred: np.ndarray) -> Dict[str, float]:
    err_y = y_pred - y_true
    err_s = sel_pred - sel_true
    mae_y = float(np.mean(np.abs(err_y)))
    mae_log = float(np.mean(np.abs(np.log10(np.maximum(y_pred, 1.0)) - np.log10(np.maximum(y_true, 1.0)))))
    mae_s = float(np.mean(np.abs(err_s)))
    # R2 on log y
    yt = np.log10(np.maximum(y_true, 1.0))
    yp = np.log10(np.maximum(y_pred, 1.0))
    ss_res = float(np.sum((yt - yp) ** 2))
    ss_tot = float(np.sum((yt - yt.mean()) ** 2)) + 1e-12
    r2 = 1.0 - ss_res / ss_tot
    return {
        "mae_y": round(mae_y, 1),
        "mae_log10_y": round(mae_log, 4),
        "mae_sel": round(mae_s, 2),
        "r2_log10_y": round(r2, 4),
        "n": int(len(y_true)),
    }


def ablation_holdout(
    points: List[Dict[str, Any]],
    hold_loads: Optional[Sequence[float]] = None,
) -> Dict[str, Any]:
    """按负载组留出：默认留出 load≥1.0（稀有高负载），对比三种模式。"""
    pts = [p for p in points if _num(p.get("y")) and _num(p.get("sel")) and float(p["y"]) > 0]
    if hold_loads is None:
        hold_set = {round(float(p["load"]), 3) for p in pts if float(p["load"]) >= 1.0}
        if not hold_set:
            # 退化为留出出现次数最少的两个负载
            from collections import Counter
            c = Counter(round(float(p["load"]), 3) for p in pts)
            hold_set = {x for x, _ in c.most_common()[-2:]}
    else:
        hold_set = {round(float(x), 3) for x in hold_loads}

    train = [p for p in pts if round(float(p["load"]), 3) not in hold_set]
    test = [p for p in pts if round(float(p["load"]), 3) in hold_set]
    if len(train) < 8 or len(test) < 3:
        # 随机 20% holdout
        rng = np.random.default_rng(0)
        idx = np.arange(len(pts))
        rng.shuffle(idx)
        n_te = max(3, int(0.2 * len(pts)))
        te_i = set(idx[:n_te].tolist())
        train = [p for i, p in enumerate(pts) if i not in te_i]
        test = [p for i, p in enumerate(pts) if i in te_i]
        hold_set = {"random20%"}

    model = LayeredWorldModel().fit(train)
    modes = ["table_knn", "prior_only", "prior_residual"]
    out_modes: Dict[str, Any] = {}
    for mode in modes:
        ys, ps, ss, sps = [], [], [], []
        for p in test:
            if mode == "table_knn":
                pr = knn_predict(train, p)
            else:
                pr = model.predict(p, mode=mode)
            if pr.get("y") is None:
                continue
            ys.append(float(p["y"]))
            ps.append(float(pr["y"]))
            ss.append(float(p["sel"]))
            sps.append(float(pr["sel"]))
        out_modes[mode] = _metrics(
            np.array(ys), np.array(ps), np.array(ss), np.array(sps)
        ) if ys else {"n": 0}

    return {
        "hold_loads": sorted(hold_set) if hold_set != {"random20%"} else ["random20%"],
        "n_train": len(train),
        "n_test": len(test),
        "modes": out_modes,
        "train_meta": model.train_meta,
        "winner": max(
            out_modes.items(),
            key=lambda kv: (kv[1].get("r2_log10_y", -9), -kv[1].get("mae_sel", 99)),
        )[0] if out_modes else None,
    }


def design_fill_points(n: int = 80) -> List[Dict[str, Any]]:
    """下一轮补点：负载 × 质量 × 灯功率 × 流量交叉铺开。

    灯功率按标定表 20/40/60/80/100 W，同时给出对应 LPD 与相对光功率%，
    现场照功率旋钮设即可。
    """
    loads = [0.01, 0.03, 0.05, 0.1, 0.5, 1.0, 2.0, 3.0]
    masses = [1, 5, 10, 15, 20]
    lamp_w = [20, 40, 60, 80, 100]
    flows = [
        (69, 1, 10),
        (50, 1, 20),
        (30, 1, 40),
        (80, 2, 10),
        (40, 5, 20),
        (20, 1, 50),
        (60, 10, 10),
        (100, 1, 0),
    ]
    out = []
    i = 0
    while len(out) < n:
        load = loads[i % len(loads)]
        mass = masses[(i // len(loads)) % len(masses)]
        watt = lamp_w[(i // (len(loads) * len(masses))) % len(lamp_w)]
        ch4, o2, ar = flows[(i * 3) % len(flows)]
        lpd = CAL.lpd_from_power(watt)
        out.append({
            "rank": len(out) + 1,
            "metal": "Pd",
            "support": "P25",
            "load": load,
            "m_cat": mass,
            "lamp_w": watt,
            "power_pct": round(100.0 * lpd / CAL.LPD_MAX, 1),
            "lpd": round(lpd, 1),
            "ch4": ch4,
            "o2": o2,
            "ar": ar,
            "o2_in": round(100.0 * o2 / max(ch4 + o2 + ar, 1e-6), 2),
            "why": "负载/质量/灯功率/流量交叉铺开",
        })
        i += 1
    return out


def write_design_xlsx(path: str, rows: Optional[List[Dict[str, Any]]] = None) -> str:
    import openpyxl
    from openpyxl.styles import Font

    rows = rows or design_fill_points(80)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "补点设计"
    hdr = ["rank", "metal", "support", "load", "m_cat", "lamp_w", "power_pct", "lpd", "ch4", "o2", "ar", "o2_in", "why"]
    ws.append(hdr)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append([r.get(h) for h in hdr])
    wb.save(path)
    return path
