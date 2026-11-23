# -*- coding: utf-8 -*-
"""HCHO 场景（ZnO 掺 FeCl3 光热催化 CH4 制甲醛）BO 空间定义与首轮补点。

本轮边界（纯 BO 骨架，模型层留空）：
- 只提供探索空间定义（变量 / 范围 / 单位 / 精度 / 离散档位 / 固定值）；
- 读取首轮 15 条分层档位组合补点表（data/HCHO_round1_design.xlsx）；
- 不接预测模型、不出 μ/σ；产物列待实测回流后回填。

先验机理见项目根《HCHO_先验机理_备选方案.md》，本轮不实现。
"""
from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from .data import DATA_DIR

# ------------------------------------------------------------
# 探索空间定义（范围 / 单位 / 精度 / 档位，已与用户确认）
# ------------------------------------------------------------
SPACE: List[Dict[str, Any]] = [
    {"key": "m_sub",        "label": "前驱体质量 m(ZnC₂O₄·2H₂O)", "unit": "mg",      "lo": 100,  "hi": 5000, "step": 10,  "kind": "continuous"},
    {"key": "omega",        "label": "共催化剂掺量 ω_cocat",       "unit": "wt% ZnO", "lo": 0,    "hi": 5,    "step": 0.05, "kind": "discrete",
     "levels": [0, 0.05, 0.1, 0.2, 0.5, 1]},
    {"key": "r_hf",         "label": "焙烧升温速率 r_HF",           "unit": "℃/min",   "lo": 30,   "hi": 350,  "step": 1,   "kind": "continuous"},
    {"key": "T_calc",       "label": "焙烧温度 T",                  "unit": "℃",       "lo": 350,  "hi": 1000, "step": 1,   "kind": "continuous"},
    {"key": "t_calc",       "label": "焙烧时间 t",                 "unit": "min",     "lo": 60,   "hi": 1440, "step": 1,   "kind": "continuous"},
    {"key": "m_cat",        "label": "装样量 m_cat",                "unit": "mg",      "lo": 2,    "hi": 100,  "step": 1,   "kind": "continuous"},
    {"key": "Q_dry",        "label": "干 CH₄ 流量 Q_dry",           "unit": "mL/min",  "lo": 0,    "hi": 100,  "step": 1,   "kind": "continuous"},
    {"key": "Q_wet",        "label": "湿 CH₄ 流量 Q_wet",           "unit": "mL/min",  "lo": 0,    "hi": 50,   "step": 1,   "kind": "continuous"},
    {"key": "Q_air",        "label": "空气流量 Q_air",              "unit": "mL/min",  "lo": 0,    "hi": 100,  "step": 1,   "kind": "continuous"},
    {"key": "Q_ar",         "label": "Ar 流量 Q_Ar",                "unit": "mL/min",  "lo": 0,    "hi": 100,  "step": 1,   "kind": "continuous"},
    {"key": "T1",           "label": "水浴温度 T₁",                "unit": "℃",       "lo": 25,   "hi": 90,   "step": 1,   "kind": "continuous"},
    {"key": "power",        "label": "光功率 power",                "unit": "W",       "lo": 20,   "hi": 100,  "step": 20,  "kind": "discrete",
     "levels": [20, 40, 60, 80, 100], "lpd": {20: 62.4, 40: 113.4, 60: 163.1, 80: 211.5, 100: 257.3}},
    {"key": "T3",           "label": "外部加热温度 T₃",            "unit": "℃",       "lo": 25,   "hi": 250,  "step": 1,   "kind": "continuous"},
    {"key": "T2",           "label": "进料温度 T₂",                 "unit": "℃",       "lo": 25,   "hi": 150,  "step": 1,   "kind": "continuous"},
    {"key": "A_cat",        "label": "催化剂面积 A_cat",            "unit": "cm²",     "kind": "discrete",
     "levels": [{"d": d, "area": round(math.pi * (d / 2) ** 2, 3)} for d in (1, 2, 3, 4)]},
]

FIXED: Dict[str, Any] = {
    "wavelength": 365,
    "wavelength_unit": "nm",
    "light_source": "LED100C",
    "cocat": "FeCl3",
}

# 产物口径（待实测回填）
OUTPUTS: List[Dict[str, str]] = [
    {"key": "c_HCHO",  "label": "c_HCHO",  "unit": "ppm"},
    {"key": "c_CO",    "label": "c_CO",    "unit": "ppm"},
    {"key": "c_CO2",   "label": "c_CO2",   "unit": "ppm"},
    {"key": "c_C2H6",  "label": "c_C2H6",  "unit": "ppm"},
    {"key": "r_HCHO",  "label": "r_HCHO",  "unit": "μmol·h⁻¹"},
    {"key": "p_HCHO",  "label": "p_HCHO",  "unit": "μmol·g⁻¹·h⁻¹"},
    {"key": "sel_C2+", "label": "sel_C2+", "unit": "%"},
    {"key": "AQY",     "label": "AQY",     "unit": "%"},
]

# xlsx 表头 → 空间 key 映射（与 data/HCHO_round1_design.xlsx 列对齐）
_XLSX_COL = {
    "m_sub": "m(ZnC2O4·2H2O)",
    "omega": "cocat_amount",
    "r_hf": "calcination_heating_rate",
    "T_calc": "calcination_temperature",
    "t_calc": "calcination_time",
    "m_cat": "catalyst_amount",
    "Q_dry": "flow_CH4_dry",
    "Q_wet": "flow_CH4_wet",
    "Q_air": "flow_air",
    "Q_ar": "flow_Ar",
    "T1": "water_temperature",
    "power": "power",
    "T3": "external_heating_temperature",
    "T2": "feed_temperature T2",
    "d": "catalyst_area_d(cm)",
    "A_cat": "catalyst_area(cm2)",
}

DESIGN_FILE = DATA_DIR / "HCHO_round1_design.xlsx"


def space_definition() -> Dict[str, Any]:
    """返回 HCHO 场景探索空间定义（供前端渲染参数区 / 校验范围）。"""
    return {
        "scene": "hcho",
        "name": "ZnO 光热催化 CH₄ 制 HCHO",
        "fixed": FIXED,
        "space": SPACE,
        "outputs": OUTPUTS,
        "model_ready": False,
        "note": "纯 BO 首轮空间填充；预测模型待实测数据回流后接入。",
    }


@lru_cache(maxsize=1)
def _read_design() -> List[Dict[str, Any]]:
    """读取首轮 15 条补点表；文件缺失时返回空列表（前端优雅降级）。"""
    if not DESIGN_FILE.exists():
        return []
    import openpyxl
    wb = openpyxl.load_workbook(DESIGN_FILE, data_only=True)
    ws = wb["HCHO首轮补点设计"] if "HCHO首轮补点设计" in wb.sheetnames else wb.worksheets[0]
    hdr = [c.value for c in ws[1]]
    idx = {h: i for i, h in enumerate(hdr)}
    rows: List[Dict[str, Any]] = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        if r[0] is None:
            continue

        def g(key: str):
            col = _XLSX_COL.get(key)
            j = idx.get(col) if col else None
            return r[j] if j is not None else None

        rows.append({
            "rank": r[0],
            "m_sub": g("m_sub"),
            "omega": g("omega"),
            "r_hf": g("r_hf"),
            "T_calc": g("T_calc"),
            "t_calc": g("t_calc"),
            "m_cat": g("m_cat"),
            "Q_dry": g("Q_dry"),
            "Q_wet": g("Q_wet"),
            "Q_air": g("Q_air"),
            "Q_ar": g("Q_ar"),
            "T1": g("T1"),
            "power": g("power"),
            "T3": g("T3"),
            "T2": g("T2"),
            "d": g("d"),
            "A_cat": g("A_cat"),
            "why": r[idx.get("why")] if idx.get("why") is not None else "",
        })
    return rows


def design_points() -> Dict[str, Any]:
    """首轮补点设计表（15 条探索点）+ 空间定义。"""
    pts = _read_design()
    out = space_definition()
    out["points"] = pts
    out["n_points"] = len(pts)
    return out
