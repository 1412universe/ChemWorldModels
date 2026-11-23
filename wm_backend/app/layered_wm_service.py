# -*- coding: utf-8 -*-
"""分层世界模型服务：加载 Pd–P25 点、训练、预测、消融、补点表。"""
from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

_ROOT = Path(__file__).resolve().parents[2]
_WM = _ROOT / "wm_model"
_DATA = _ROOT / "data"
if str(_WM) not in sys.path:
    sys.path.insert(0, str(_WM))

import layered_wm as lwm  # type: ignore
import lamp_calib as CAL  # type: ignore

from . import bo_pd_p25


@lru_cache(maxsize=1)
def _fitted() -> lwm.LayeredWorldModel:
    pts = bo_pd_p25.load_pd_p25_points()
    return lwm.LayeredWorldModel().fit(pts)


def reload_model() -> Dict[str, Any]:
    _fitted.cache_clear()
    m = _fitted()
    return {"ok": True, "train_meta": m.train_meta}


def predict(
    load: float = 0.05,
    ch4: float = 69.0,
    o2: float = 1.0,
    ar: float = 10.0,
    o2_in: Optional[float] = 1.0,
    light: float = 257.3,
    m_cat: Optional[float] = None,
    mode: str = "prior_residual",
    light_unit: Optional[str] = None,
) -> Dict[str, Any]:
    """light_unit 可为 W / lpd / rel；不填按灯标定表自动判断。"""
    m = _fitted()
    # 统一换算成 LPD，进入模型的是 mW/cm2
    norm = CAL.normalize(light, light_unit) if CAL else None
    lpd = float(norm["lpd"]) if norm else float(light)
    q = {
        "load": float(load),
        "ch4": float(ch4),
        "o2": float(o2),
        "ar": float(ar),
        "o2_in": o2_in,
        "lpd": lpd,
        "m_cat": m_cat,
    }
    out = m.predict(q, mode=mode)
    # 附带 knn 对照
    pts = bo_pd_p25.load_pd_p25_points()
    knn = lwm.knn_predict(pts, q)
    out["compare"] = {
        "table_knn": {
            "y": None if knn.get("y") is None else round(float(knn["y"]), 1),
            "sel": None if knn.get("sel") is None else round(float(knn["sel"]), 2),
            "unc": None if knn.get("unc") is None else round(float(knn["unc"]), 1),
            "d_min": knn.get("d_min"),
        }
    }
    return out


def run_ablation() -> Dict[str, Any]:
    pts = bo_pd_p25.load_pd_p25_points()
    report = lwm.ablation_holdout(pts)
    report["ok"] = True
    report["n_pool"] = len(pts)
    # 落盘方便直接看
    _DATA.mkdir(parents=True, exist_ok=True)
    out_json = _DATA / "layered_wm_ablation.json"
    out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    report["saved"] = str(out_json)
    return report


def write_design(n: int = 80) -> Dict[str, Any]:
    _DATA.mkdir(parents=True, exist_ok=True)
    path = str(_DATA / "pd_p25_fill_design.xlsx")
    rows = lwm.design_fill_points(n)
    lwm.write_design_xlsx(path, rows)
    return {"ok": True, "path": path, "n": len(rows), "preview": rows[:8]}


def snapshot_for_preview(query: Dict[str, Any]) -> Dict[str, Any]:
    """给 worldmodel_preview 挂一层 calibrated。"""
    raw_light = query.get("lpd") if query.get("lpd") is not None else query.get("light")
    unit = "lpd" if query.get("lpd") is not None else "rel"
    norm = CAL.normalize(raw_light if raw_light is not None else CAL.LPD_MAX, unit)
    try:
        pr = predict(
            load=float(query.get("load") or query.get("loading") or 0.05),
            ch4=float(query.get("ch4") or 69),
            o2=float(query.get("o2") or 1),
            ar=float(query.get("ar") or 10),
            o2_in=query.get("o2_in"),
            light=float(norm["lpd"]) if norm else float(CAL.LPD_MAX),
            light_unit="lpd",
            m_cat=query.get("m_cat"),
            mode="prior_residual",
        )
    except Exception as e:
        return {
            "name": "校准层 · prior+残差",
            "role": "动力学先验 + 条件残差（Pd–P25）",
            "error": str(e)[:200],
            "verdict": {"level": "risk", "label": "不可用", "why": str(e)[:120]},
        }
    dom = pr.get("domain") or {}
    level = "go" if pr.get("in_domain") else "risk"
    return {
        "name": "校准层 · prior+残差",
        "role": "气路/光照按灯标定表换算 + 反应器 prior×残差；域外降置信",
        "verdict": {
            "level": level,
            "label": "域内校准" if pr.get("in_domain") else "域外/外推",
            "why": f"d_min={dom.get('d_min')}；相对 knn 见 compare",
        },
        "predict": {
            "y": pr["y"],
            "sel": pr["sel"],
            "unc": pr["unc"],
            "y_lo": pr["y_lo"],
            "y_hi": pr["y_hi"],
            "model": "prior_residual",
            "in_domain": pr.get("in_domain"),
        },
        "prior": pr.get("prior"),
        "layers": pr.get("layers"),
        "compare": pr.get("compare"),
        "kinetics": pr.get("kinetics"),
        "train_meta": pr.get("train_meta"),
    }
