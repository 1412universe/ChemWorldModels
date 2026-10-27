"""
数据加载与全局数据结构
与前端 v15/v16 保持一致
"""
import json
import csv
import math
import os
import re
from pathlib import Path
from typing import Any

# ============================================================
# 中央数据目录解析
# 单一数据来源：<项目根>/data （即 ChemWorld/data）。
# - 优先环境变量 WM_DATA_DIR
# - 否则项目根 data/（wm_backend 的上一级）
# - 若不存在则回退到旧位置 wm_backend/data（兼容过渡）
# 所有实验数据、化学法则 CSV、替代器模型均从此目录加载。
# ============================================================
def _resolve_data_dir() -> Path:
    env = os.environ.get("WM_DATA_DIR")
    if env:
        p = Path(env)
        if p.exists():
            return p
    root = Path(__file__).resolve().parent.parent.parent   # ChemWorld/
    central = root / "data"
    if central.exists():
        return central
    legacy = Path(__file__).resolve().parent.parent / "data"  # wm_backend/data
    return legacy


DATA_DIR = _resolve_data_dir()

# ============================================================
# RealData 目录：存放用户真实世界的实验数据文件（.tif/.csv/.xlsx 等）
# 统一落盘到 <DATA_DIR>/RealData。
# - 优先环境变量 WM_REALDATA_DIR
# - 否则 <DATA_DIR>/RealData（DATA_DIR=ChemWorld/data 时即 ChemWorld/data/RealData）
# - 若 DATA_DIR 为回退的 wm_backend/data，则 <wm_backend>/data/RealData
# 前端在「真实实验反馈」阶段弹窗，让用户拖拽/点选上传，或选择已存文件，
# 解析后把真实实测值作为真实实验反馈（替代模拟噪声值）。
# ============================================================
def _resolve_realdata_dir() -> Path:
    env = os.environ.get("WM_REALDATA_DIR")
    if env:
        p = Path(env)
        p.mkdir(parents=True, exist_ok=True)
        return p
    rd = DATA_DIR / "RealData"
    rd.mkdir(parents=True, exist_ok=True)   # 确保目录存在（首次运行自动建）
    return rd


REALDATA_DIR = _resolve_realdata_dir()

# 与 JS 对齐的物理/化学常量
DOMAIN_GAP = 1.6

SUPPORT_CHI = {
    "tio2": 4.2, "zno": 4.5, "ceo2": 4.0, "wo3": 4.0, "gc3n4": 4.0,
    "bivo4": 4.0, "cds": 4.5, "sio2": 3.8, "mgo": 2.0, "other": 4.2,
    "tin": 4.0, "cnt": 4.0, "carbon": 4.0,
}
SUPPORT_EB = {
    "tio2": 60, "zno": 55, "ceo2": 50, "wo3": 45, "gc3n4": 120,
    "bivo4": 60, "cds": 40, "sio2": 30, "mgo": 30, "other": 50,
    "tin": 50, "cnt": 30, "carbon": 30,
}
SUPPORT_PHOTO = {
    "tio2": "稳定", "zno": "稳定", "ceo2": "稳定", "wo3": "稳定(氧化侧)",
    "gc3n4": "稳定", "bivo4": "稳定", "cds": "光照下光腐蚀(需保护)",
    "sio2": "稳定", "mgo": "稳定", "other": "稳定", "tin": "稳定",
    "cnt": "稳定", "carbon": "稳定",
}

METAL_WF = {
    "pd": 5.12, "pt": 5.65, "au": 5.10, "ag": 4.26, "cu": 4.65, "ni": 5.15,
    "rh": 4.98, "ru": 4.71, "ir": 5.27, "co": 5.0, "fe": 4.5, "w": 4.55,
    "mo": 4.6, "cr": 4.5, "zn": 4.3, "ti": 4.33, "in": 4.09, "ga": 4.32,
    "ce": 2.9, "mg": 3.6, "al": 4.06, "bi": 4.22, "ta": 4.25, "sn": 4.42,
    "cd": 4.22, "re": 4.72, "cs": 2.14, "er": 3.2, "pb": 4.25,
}

OX_EOV = {
    "tio2": 4.6, "zno": 3.1, "nio": 3.2, "ceo2": 2.0, "wo3": 4.8, "sno2": 3.8,
    "al2o3": 5.2, "sio2": 6.0, "zro2": 4.0, "in2o3": 3.6, "ga2o3": 4.2,
    "mgo": 6.5, "caco3": 6.8, "cds": 3.0, "c3n4": 3.4, "biob3": 4.5,
    "mof": 3.0, "other": 4.0,
}
METAL_EOV_MOD = {
    "pd": -0.6, "pt": -0.8, "au": -0.7, "ag": -0.5, "ru": -0.4, "rh": -0.5,
    "ir": -0.6, "cu": -0.3, "ni": -0.2, "co": -0.2, "fe": -0.1, "ce": -1.0,
    "mo": -0.3, "w": -0.3, "ti": 0.1, "zn": 0.0, "in": -0.2, "ga": -0.2,
    "sn": -0.1, "re": -0.4,
}
OX_DCH3 = {
    "tio2": 0.9, "zno": 0.7, "nio": 0.6, "ceo2": 1.1, "wo3": 0.5, "sno2": 0.6,
    "al2o3": 0.3, "sio2": 0.2, "zro2": 0.8, "in2o3": 0.5, "ga2o3": 0.4,
    "mgo": 0.1, "caco3": 0.1, "cds": 0.4, "c3n4": 0.6, "biob3": 0.5,
    "mof": 0.7, "other": 0.5,
}
METAL_DCH3_MOD = {
    "pd": 0.8, "pt": 0.7, "au": 0.6, "ag": 0.5, "ru": 0.9, "rh": 0.8,
    "ir": 0.7, "cu": 0.4, "ni": 0.5, "co": 0.5, "fe": 0.4, "ce": 0.3,
    "mo": 0.6, "w": 0.6, "ti": 0.3, "zn": 0.2, "in": 0.4, "ga": 0.3,
    "sn": 0.3, "re": 0.9,
}

# 实验设备清单（与前端 v16 对齐）
DEVICES = [
    {"key": "literature", "name": "文献库", "stage": 0, "x": 120, "y": 90, "w": 120, "h": 70, "specs": {"条目": "380 篇真实 OCM 催化剂", "来源": "DOI + design_principles"}, "readOnly": True},
    {"key": "balance", "name": "电子天平", "stage": 1, "x": 120, "y": 220, "w": 80, "h": 60, "specs": {"量程": "0.01 mg–220 g", "精度": "±0.01 mg"}, "params": {"质量": {"min": 1, "max": 1000, "value": 50, "unit": "mg"}}},
    {"key": "sonic", "name": "超声清洗", "stage": 1, "x": 120, "y": 320, "w": 80, "h": 60, "specs": {"频率": "40 kHz", "功率": "100 W"}, "params": {"时间": {"min": 5, "max": 60, "value": 30, "unit": "min"}}},
    {"key": "stirrer", "name": "磁力搅拌", "stage": 1, "x": 120, "y": 420, "w": 80, "h": 60, "specs": {"转速": "0–1500 rpm", "温度": "RT–200 ℃"}, "params": {"转速": {"min": 100, "max": 1500, "value": 600, "unit": "rpm"}, "时间": {"min": 10, "max": 1440, "value": 120, "unit": "min"}}},
    {"key": "furnace", "name": "马弗炉", "stage": 1, "x": 280, "y": 220, "w": 90, "h": 70, "specs": {"最高温度": "1500 ℃", "升温速率": "≤30 ℃/min", "气氛": "空气/N₂/O₂/Ar"}, "params": {"温度": {"min": 50, "max": 1500, "value": 500, "unit": "℃"}, "时间": {"min": 0.5, "max": 24, "value": 4, "unit": "h"}, "气氛": {"options": ["空气/静态", "N₂", "O₂", "Ar"], "value": "空气/静态"}}},
    {"key": "tube", "name": "管式炉", "stage": 1, "x": 280, "y": 320, "w": 90, "h": 70, "specs": {"最高温度": "1200 ℃", "气氛": "H₂/Ar/N₂/O₂"}, "params": {"温度": {"min": 50, "max": 1200, "value": 400, "unit": "℃"}, "时间": {"min": 0.5, "max": 12, "value": 2, "unit": "h"}, "气氛": {"options": ["N₂", "Ar", "H₂", "H₂/Ar", "O₂"], "value": "N₂"}}},
    {"key": "vacuumoven", "name": "真空干燥箱", "stage": 1, "x": 280, "y": 420, "w": 90, "h": 70, "specs": {"最高温度": "250 ℃", "真空度": "≤10 Pa"}, "params": {"温度": {"min": 30, "max": 250, "value": 80, "unit": "℃"}, "时间": {"min": 1, "max": 48, "value": 12, "unit": "h"}, "真空": {"options": ["开", "关"], "value": "开"}}},
    {"key": "glovebox", "name": "手套箱", "stage": 2, "x": 120, "y": 520, "w": 90, "h": 70, "specs": {"气氛": "N₂/Ar", "H₂O/O₂": "<1 ppm"}, "readOnly": True},
    {"key": "gasfeed", "name": "气体进料", "stage": 2, "x": 420, "y": 220, "w": 90, "h": 70, "specs": {"CH₄": "0–100 mL/min", "O₂": "0–20 mL/min"}, "params": {"CH₄": {"min": 0, "max": 100, "value": 30, "unit": "mL/min"}, "O₂": {"min": 0, "max": 20, "value": 6, "unit": "mL/min"}, "模式": {"options": ["OCM", "NOCM", "MPO"], "value": "OCM"}}},
    {"key": "reactor", "name": "光反应器", "stage": 2, "x": 540, "y": 220, "w": 110, "h": 80, "specs": {"光源": "300 W 氙灯", "波长": "200–1100 nm", "温度": "RT–200 ℃"}, "params": {"功率": {"min": 50, "max": 500, "value": 300, "unit": "mW/cm²"}, "时间": {"min": 0.5, "max": 24, "value": 3, "unit": "h"}}},
    {"key": "centrifuge", "name": "离心机", "stage": 3, "x": 720, "y": 220, "w": 80, "h": 60, "specs": {"转速": "0–10000 rpm", "时间": "≤30 min"}, "params": {"转速": {"min": 1000, "max": 10000, "value": 5000, "unit": "rpm"}, "时间": {"min": 1, "max": 60, "value": 10, "unit": "min"}}},
    {"key": "gc", "name": "气相色谱 GC", "stage": 4, "x": 850, "y": 220, "w": 90, "h": 70, "specs": {"检测限": "C₂ ≥80 μmol/g/h", "误差": "±8%"}, "readOnly": True},
    {"key": "ms", "name": "质谱 MS", "stage": 4, "x": 850, "y": 320, "w": 90, "h": 70, "specs": {"质量范围": "1–500 amu", "分辨率": "≤1 ppm"}, "readOnly": True},
    {"key": "drifts", "name": "DRIFTS", "stage": 4, "x": 850, "y": 420, "w": 90, "h": 70, "specs": {"范围": "4000–400 cm⁻¹", "温度": "RT–500 ℃"}, "readOnly": True},
    {"key": "xrd", "name": "XRD", "stage": 4, "x": 720, "y": 420, "w": 80, "h": 70, "specs": {"2θ": "5–80°", "速率": "5°/min"}, "readOnly": True},
    {"key": "robot", "name": "机械臂", "stage": 0, "x": 500, "y": 90, "w": 80, "h": 70, "specs": {"自由度": "6-DOF", "重复精度": "±0.05 mm"}, "readOnly": True},
    {"key": "ai", "name": "AI 中心", "stage": 0, "x": 360, "y": 90, "w": 100, "h": 70, "specs": {"模型": "XGBoost 残差替代器 + KNN 兜底", "参考库": "6658 条"}, "readOnly": True},
]


def _load_json(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def eov_of(r: dict) -> float:
    sp = (r.get("support") or "").lower()
    base = OX_EOV["other"]
    for k, v in OX_EOV.items():
        if k != "other" and k in sp:
            base = v
            break
    mod = 0.0
    ms = (r.get("metal") or "").lower()
    for k, v in METAL_EOV_MOD.items():
        if k in ms:
            mod += v
    return max(1.0, base + mod)


def dcht3_of(r: dict) -> float:
    sp = (r.get("support") or "").lower()
    base = OX_DCH3["other"]
    for k, v in OX_DCH3.items():
        if k != "other" and k in sp:
            base = v
            break
    mod = 0.0
    ms = (r.get("metal") or "").lower()
    for k, v in METAL_DCH3_MOD.items():
        if k in ms:
            mod += v
    return max(0.1, base + mod)


def avg_wf(metals: list[str]) -> float:
    if not metals:
        return 4.5
    vals = [METAL_WF.get(m.lower(), 4.5) for m in metals]
    return sum(vals) / len(vals)


# 与 JS MurmurHash 风格 seed 兼容的简化 hash（仅用于稳定 RNG）
def hash_seed(s: str) -> int:
    h = 2166136261
    for ch in str(s or "x"):
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class _Rng:
    def __init__(self, seed: int):
        self.a = seed & 0xFFFFFFFF

    def __call__(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((self.a ^ (self.a >> 15)) * (1 | self.a)) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) ^ t)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def derive_phys(r: dict) -> dict:
    seed = hash_seed(r.get("doi") or r.get("metal") or "x")
    R = _Rng(seed)
    wf = avg_wf(r.get("metals") or [])
    sup = str(r.get("support") or "other").lower()
    chi = SUPPORT_CHI.get(sup, 4.2)
    phi_b = max(0.05, wf - chi)
    txt = " ".join(str(r.get(k) or "") for k in ["why", "sel_driver", "mech_text", "title", "support_raw"])
    has_ov = bool(re.search(r"oxygen vacan|\bov\b|defect|vacancy|氧空位|空位|氧缺陷", txt, re.I))
    eovf = (0.9 + 0.7 * R()) if has_ov else (1.9 + 0.9 * R())
    morph = str(r.get("morphology") or "").lower()
    if re.search(r"nanowire|nanorod|nanotube|wire|rod|tube", morph):
        d = 18 + 34 * R()
    elif re.search(r"sheet|plate|flake|2d|layer|nanosheet", morph):
        d = 4 + 8 * R()
    elif re.search(r"porous|mesoporous|foam|hierarchical", morph):
        d = 12 + 20 * R()
    elif re.search(r"bulk|monolith", morph):
        d = 40 + 60 * R()
    else:
        d = 8 + 20 * R()
    tau = 0.6 + 40 * R()
    D = 0.006 + 0.05 * R()
    Ld = math.sqrt(D * (tau * 1e-9)) * 1e7
    I = 40 + 260 * R()
    Isat = 170 + 90 * R()
    pH = 4 + 5 * R()
    pore = (2 + 22 * R()) if re.search(r"porous|mesoporous|hierarchical", morph) else None
    mech = r.get("mechanism") or "OCM"
    kie = (2.2 + 4.6 * R()) if mech in ("OCM", "NOCM") else (1.4 + 3 * R())
    ea = {"OCM": 0.72, "NOCM": 0.95}.get(mech, 0.6) + 0.2 * (1 - R())
    Eb = SUPPORT_EB.get(sup, 50)
    photo_stab = SUPPORT_PHOTO.get(sup, "稳定")
    return {
        "wf": wf, "chi": chi, "phiB": phi_b, "hasOv": has_ov, "eovf": eovf,
        "d": d, "tau": tau, "D": D, "Ld": Ld, "I": I, "Isat": Isat,
        "pH": pH, "pore": pore, "kie": kie, "ea": ea, "Eb": Eb, "photoStab": photo_stab,
    }


def prettify_support(s: str) -> str:
    """把载体写法规范化为可读展示名（化学式下标化）。"""
    if not s:
        return ""
    s = s.strip()
    low = s.lower()
    MAP = {
        "sio2": "SiO₂", "tio2": "TiO₂", "zno": "ZnO", "al2o3": "Al₂O₃",
        "ceo2": "CeO₂", "zro2": "ZrO₂", "mgo": "MgO", "wo3": "WO₃",
        "ga2o3": "Ga₂O₃", "nb2o5": "Nb₂O₅", "in2o3": "In₂O₃", "fe2o3": "Fe₂O₃",
        "sno2": "SnO₂", "zns": "ZnS", "cds": "CdS", "srtio3": "SrTiO₃",
        "moo3": "MoO₃", "biobr": "BiOBr", "bivo4": "BiVO₄", "mos2": "MoS₂",
        "g-c3n4": "g-C₃N₄", "g-c3n4": "g-C₃N₄", "c3n4": "C₃N₄",
        "carbon nitride": "Carbon nitride", "graphene": "Graphene",
        "cnt": "CNT", "tin": "Tin", "mwc": "MWCNT",
    }
    if low in MAP:
        return MAP[low]
    return s[0].upper() + s[1:] if s else s


def norm_support(raw: str | None, sup: str | None) -> str:
    """统一候选/文献的载体展示名：优先用可读 raw，否则规范 sup；缺失则标「未指明载体」。"""
    raw = (raw or "").strip()
    if raw and raw.lower() not in ("other", "unknown", "none"):
        return prettify_support(raw)
    sup = (sup or "").strip().lower()
    if sup in ("other", "unknown", "none", ""):
        return "未指明载体"
    return prettify_support(sup)


def _norm_kb(x: dict) -> dict:
    metals = x.get("metals") or []
    return {
        "id": x.get("id"),
        "title": x.get("title") or "",
        "metal": "/".join(metals) if metals else (x.get("metal") or "无金属"),
        "support": x.get("support_raw") or x.get("support") or "other",
        "support_display": norm_support(x.get("support_raw"), x.get("support")),
        "bg": x.get("eg"),
        "ad": x.get("ead"),
        "y": x.get("y"),
        "s": x.get("s"),
        "mech": x.get("mechanism"),
        "oox": x.get("oox"),
        "photo": bool(x.get("photothermal")),
        "domain": x.get("domain"),
        "recon": bool(x.get("recon")),
        "yunit": x.get("yunit") or None,
        "product": (x.get("product") or "").lower(),
        "doi": x.get("doi") or None,
        "why": x.get("why") or "",
        "metals": metals,
        "ypct": x.get("ypct"),
        "spct": x.get("spct"),
        "T_C": x.get("T_C"),
        "ch4conv": x.get("ch4conv"),
        "src": x.get("src") or "",
    }


# ============================================================
# CSV 加载层（实验数据 + 化学/物理法则），统一从 DATA_DIR（ChemWorld/data）读取。
# 设计：任一 CSV 缺失时回退到内置默认 / 原始 JSON，保证向后兼容与可编辑性。
# 用户修改 data/*.csv 即可调整法则与数据，无需改代码。
# ============================================================
def _read_csv(name: str) -> list[dict]:
    p = DATA_DIR / name
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _to_float(v, default=None):
    if v is None or v == "":
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


# ---------------- 标量法则常数 LAWS（laws.csv）----------------
_LAWS_DEFAULT = {
    "LOD": 80.0, "Y_REF_LO": 50.0, "Y_REF_HI": 20000.0,
    "F_OX_SEL_K": 1.3, "F_OX_OXY_W": 0.4, "F_OX_CONV_K": 0.8, "F_PT_K": 0.0008,
    "F_PHOT_ABS_A": 1.2, "F_PHOT_ABS_B": 0.25, "F_PHOT_ABS_BASE": 2.0, "F_STAB_DELTA": 0.04,
    "OPT_T_BASE_OCM": 700.0, "OPT_T_BASE_MPO": 400.0, "OPT_T_BASE_NOCM": 350.0, "OPT_T_BASE_OTHER": 520.0,
    "OPT_T_COEF": 70.0, "OPT_T_CLAMP_LO": 450.0, "OPT_T_CLAMP_HI": 850.0, "OPT_W_T": 130.0,
    "OPT_R_BASE": 0.5, "OPT_R_COEF_LOW": -0.12, "OPT_R_COEF_HIGH": 0.06,
    "OPT_R_CLAMP_LO": 0.2, "OPT_R_CLAMP_HI": 1.0, "OPT_W_R": 0.35,
    "OPT_I_BASE": 100.0, "OPT_I_COEF": 60.0, "OPT_I_CLAMP_LO": 60.0, "OPT_I_CLAMP_HI": 300.0, "OPT_W_I": 120.0,
    "OPT_G_BASE": 6000.0, "OPT_G_COEF": 2000.0, "OPT_G_CLAMP_LO": 3000.0, "OPT_G_CLAMP_HI": 12000.0, "OPT_W_G": 5000.0,
    "OPT_G_DC_REF": 1.5,
    "DOM_T_LO": 300.0, "DOM_T_HI": 950.0, "DOM_R_LO": 0.1, "DOM_R_HI": 2.0,
    "DOM_I_LO": 0.0, "DOM_I_HI": 500.0, "DOM_G_LO": 1000.0, "DOM_G_HI": 30000.0,
    "C_VB_FORM_A": 2.8, "C_VB_FORM_B": 0.3, "C_E_OX": 1.7, "C_E_RED": -0.4,
    "C_BG_PHOTON_HI": 3.2, "C_BG_PHOTON_LO": 1.5, "C_AD_HI": -0.3, "C_AD_LO": -1.3,
    "C_OOX_THR": 0.6, "C_S_SEL_THR": 90.0, "C_TEMP_FAIL": 900.0, "C_TEMP_WARN": 700.0, "C_TEMP_LO": 200.0,
    "C_MT_Y_THR": 20000.0, "C_QY_MAX": 1.0, "C_QY_WARN": 0.5, "C_QY_YREF": 32000.0,
    "C_STAB_TEMP_WARN": 850.0, "C_STAB_OOX_THR": 0.15, "C_STAB_TEMP_THR": 600.0, "C_BL_BG_HI": 3.2,
    "C_REC_BG_LO": 1.6, "C_REC_CB_THR": -0.2, "C_OVF_LO": 0.7, "C_OVF_HI": 2.4,
    "C_OVF_WIN_LO": 0.8, "C_OVF_WIN_HI": 2.0, "C_SCHOTTKY_PHI_LO": 0.3,
    "C_LD_FAIL": 0.25, "C_LD_WARN": 0.5, "C_TAU_FAIL": 1.0, "C_TAU_WARN": 2.0, "C_EB_RATIO": 5.0,
    "C_MS_VBI_F": 0.3, "C_KIE_LO": 1.5, "C_KIE_HI": 8.0,
    "C_BRANCH_S_HI": 85.0, "C_BRANCH_S_LO": 60.0, "C_FLUX_I_LO": 60.0,
    "C_KNUD_PORE": 65.0, "C_KNUD_Y_THR": 12000.0, "C_EA_RATIO_HI": 40.0, "C_EA_RATIO_LO": 6.0,
    "C_EOV_WIN_LO": 1.8, "C_EOV_WIN_HI": 4.5, "C_EOV_VERTEX": 3.0,
    "C_DCH3_FAIL": 0.4, "C_DCH3_WARN": 2.5, "C_VOLCANO_EOV_V": 3.0, "C_VOLCANO_DC_N": 1.8,
    "C_VOLCANO_LO": 0.35, "C_VOLCANO_HI": 0.8,
    "OER_U0": 1.23, "OER_SCALE_DOO": 1.5, "OER_SCALE_DOOH": 3.2, "OER_SEL_PEAK": 3.5, "OER_SEL_W": 0.7,
    "MECH_TEMP_OCM": 740.0, "MECH_TEMP_MPO": 400.0, "MECH_TEMP_OTHER": 320.0,
    "O2RATIO_OCM": 0.5, "O2RATIO_MPO": 1.0, "O2RATIO_OTHER": 0.0, "NOCM_Y_THR": 4000.0,
    # —— 参考基准 / 建模枢轴（约束与反应器公式的枢轴点，统一外部化）——
    "DEFAULT_BG": 2.8, "VB_REF_BG": 2.5, "LANG_TH_CH4": 0.5,
    "MS_VBI_FLOOR": 0.1, "MS_W_RATIO": 0.5,
    "OPT_T_EOV_REF": 2.5, "OPT_R_EOV_MID": 2.6, "OPT_I_PT_REF": 250.0,
    "SIM_I_KM": 50.0, "DEFAULT_S": 60.0, "VOLCANO_EOV_SPREAD": 2.5,
    "ENERGY_T_REF": 25.0,
    # —— 物理因子惩罚（约束违规 → 产率折扣）——
    "PHYS_FACTOR_FAIL": 0.72, "PHYS_FACTOR_WARN": 0.96,
    "PHYS_FACTOR_LO": 0.55, "PHYS_FACTOR_HI": 1.08,
}
LAWS: dict = dict(_LAWS_DEFAULT)
for _lrow in _read_csv("laws.csv"):
    try:
        LAWS[_lrow["key"]] = float(_lrow["value"])
    except (KeyError, ValueError, TypeError):
        pass


# ---------------- 实验数据：催化剂池 ----------------
def _load_catalysts() -> list[dict]:
    rows = _read_csv("catalysts.csv")
    if rows:
        cats = []
        for r in rows:
            metals = [m for m in (r.get("metals") or "").split(";") if m] if r.get("metals") else []
            rec = {
                "id": r.get("id"), "doi": r.get("doi") or None, "metal": r.get("metal") or "无金属",
                "metals": metals, "support": r.get("support") or "other", "support_raw": r.get("support_raw"),
                "eg": _to_float(r.get("eg")), "ead": _to_float(r.get("ead")),
                "y": _to_float(r.get("y"), 0.0), "orig_y": _to_float(r.get("orig_y")),
                "s": _to_float(r.get("s")), "mechanism": r.get("mechanism") or "OCM",
                "mech_text": r.get("mech_text") or "", "product": r.get("product") or "",
                "why": r.get("why") or "", "sel_driver": r.get("sel_driver") or "",
                "oox": _to_float(r.get("oox")), "act": _to_float(r.get("act")),
                "act_mechanism": r.get("act_mechanism") or "", "photothermal": (r.get("photothermal") == "True"),
                "morphology": r.get("morphology") or "", "year": r.get("year") or "",
                "yunit": r.get("yunit") or None, "active": (r.get("active") != "False"),
                "review_status": r.get("review_status") or "", "review_note": r.get("review_note") or "",
                "conditions": json.loads(r["conditions"]) if r.get("conditions") else None,
                "recipe": json.loads(r["recipe"]) if r.get("recipe") else None,
            }
            rec["eov"] = _to_float(r.get("eov")) if _to_float(r.get("eov")) is not None else eov_of(rec)
            rec["dcht3"] = _to_float(r.get("dcht3")) if _to_float(r.get("dcht3")) is not None else dcht3_of(rec)
            cats.append(rec)
        return cats
    return _load_json(DATA_DIR / "catalysts_v6.json")  # 回退 JSON


CATALYSTS: list[dict] = _load_catalysts()
POOL: list[dict] = []
_pid = 0
for r in CATALYSTS:
    if r.get("active") is False:
        continue
    metals = r.get("metals") or []
    POOL.append({
        "id": _pid,
        "metal": "/".join(metals) if metals else (r.get("metal") or "无金属"),
        "support": r.get("support_raw") or r.get("support") or "other",
        "support_display": norm_support(r.get("support_raw"), r.get("support")),
        "loading": None,
        "light": "UV 主导" if (r.get("eg") is not None and r.get("eg") > 3.2) else "UV/可见",
        "bg": r.get("eg"),
        "dband": None,
        "ad": r.get("ead"),
        "y": r.get("y"),
        "s": r.get("s"),
        "mech": r.get("mechanism"),
        "mechText": r.get("mech_text") or "",
        "product": r.get("product") or "",
        "why": r.get("why") or "（文献未详述）",
        "seldrv": r.get("sel_driver") or "（文献未详述）",
        "innov": "",
        "oox": r.get("oox"),
        "act": r.get("act"),
        "photo": r.get("photothermal"),
        "doi": r.get("doi"),
        "title": r.get("title") or "",
        "eov": r.get("eov"),
        "dcht3": r.get("dcht3"),
        "domain": "OCM",
    })
    _pid += 1


# ---------------- 实验数据：文献知识库 ----------------
def _load_kb() -> list[dict]:
    rows = _read_csv("literature_kb.csv")
    if rows:
        kb = []
        for r in rows:
            kb.append({
                "id": r.get("id"), "title": r.get("title") or "", "metal": r.get("metal") or "无金属",
                "support": r.get("support") or "other",
                "support_display": r.get("support_display") or r.get("support") or "other",
                "bg": _to_float(r.get("bg")), "ad": _to_float(r.get("ad")), "y": _to_float(r.get("y")),
                "s": _to_float(r.get("s")), "mech": r.get("mech") or "OCM",
                "oox": _to_float(r.get("oox")), "photo": (r.get("photo") == "True"),
                "domain": r.get("domain") or "OCM", "recon": (r.get("recon") == "True"),
                "yunit": r.get("yunit") or None, "product": (r.get("product") or "").lower(),
                "doi": r.get("doi") or None, "why": r.get("why") or "",
                "metals": [m for m in (r.get("metals") or "").split(";") if m],
                "ypct": _to_float(r.get("ypct")), "spct": _to_float(r.get("spct")),
                "T_C": _to_float(r.get("T_C")), "ch4conv": _to_float(r.get("ch4conv")),
                "src": r.get("src") or "",
            })
        return kb
    kb_extra = _load_json(DATA_DIR / "kb_extra.json")
    return [_norm_kb(x) for x in kb_extra if x.get("domain") != "CO2RR"]  # CO2RR 跨域脏数据已剔除


KB_EXTRA: list[dict] = []
KB_ALL: list[dict] = _load_kb()
ALLCAT: list[dict] = POOL + KB_ALL

OCM_YS = sorted([p["y"] for p in POOL if p.get("y", 0) > 0])


# ---------------- OER 候选池（csv 优先，内置兜底）----------------
def _load_oer() -> list[dict]:
    rows = _read_csv("oer_pool.csv")
    if rows:
        return [{
            "id": int(r["id"]), "doi": r.get("doi"), "metal": r.get("metal"),
            "support": r.get("support"), "support_display": r.get("support_display"),
            "reaction": r.get("reaction") or "OER", "doh": _to_float(r.get("doh")),
            "stability": _to_float(r.get("stability")), "eg": _to_float(r.get("eg")),
            "eta_real": _to_float(r.get("eta_real")),
            "name": r.get("name"), "note": r.get("note"),
        } for r in rows]
    # eta_real：文献/实测过电位（V @10 mA/cm²），打破 *OOH−*OH 标度关系下限，
    # 还原各材料真实活性差异（标度理论对所有候选给出近乎相同的 η≈0.47 V）。
    # 两电子材料（N-C / Fe-N-C）过电位偏高但 H₂O₂ 选择性高 → 与四电子贵金属形成活性/选择性权衡。
    return [
        {"id": 9001, "doi": "oer:IrO2", "metal": "IrO₂", "support": "IrO₂", "support_display": "IrO₂", "reaction": "OER", "doh": 1.55, "stability": 0.95, "eg": 2.0, "eta_real": 0.29, "name": "IrO₂", "note": "基准贵金属 OER：实测 η≈0.29 V，四电子主导（低 H₂O₂ 选择性）。"},
        {"id": 9002, "doi": "oer:RuO2", "metal": "RuO₂", "support": "RuO₂", "support_display": "RuO₂", "reaction": "OER", "doh": 1.45, "stability": 0.55, "eg": 1.9, "eta_real": 0.22, "name": "RuO₂", "note": "最高活性但 Ru 溶解严重，稳定性差。"},
        {"id": 9003, "doi": "oer:SrIrO3", "metal": "SrIrO₃", "support": "SrIrO₃", "support_display": "SrIrO₃", "reaction": "OER", "doh": 1.50, "stability": 0.90, "eg": 1.7, "eta_real": 0.30, "name": "SrIrO₃", "note": "钙钛矿铱酸盐：活性近 RuO₂ 且更稳定。"},
        {"id": 9004, "doi": "oer:BSCF", "metal": "BSCF", "support": "BSCF", "support_display": "Ba₀.₅Sr₀.₅Co₀.₈Fe₀.₂O₃", "reaction": "OER", "doh": 1.62, "stability": 0.80, "eg": 1.6, "eta_real": 0.35, "name": "BSCF", "note": "高活性钙钛矿，Co/Fe 溶解限制稳定性。"},
        {"id": 9005, "doi": "oer:LaCoO3", "metal": "LaCoO₃", "support": "LaCoO₃", "support_display": "LaCoO₃", "reaction": "OER", "doh": 1.70, "stability": 0.82, "eg": 1.5, "eta_real": 0.40, "name": "LaCoO₃", "note": "钴酸盐钙钛矿，析氧活性中等。"},
        {"id": 9006, "doi": "oer:LaMnO3", "metal": "LaMnO₃", "support": "LaMnO₃", "support_display": "LaMnO₃", "reaction": "OER", "doh": 1.95, "stability": 0.85, "eg": 1.4, "eta_real": 0.46, "name": "LaMnO₃", "note": "锰酸盐，活性偏低。"},
        {"id": 9007, "doi": "oer:Co3O4", "metal": "Co₃O₄", "support": "Co₃O₄", "support_display": "Co₃O₄", "reaction": "OER", "doh": 1.80, "stability": 0.88, "eg": 1.6, "eta_real": 0.39, "name": "Co₃O₄", "note": "尖晶石钴氧化物，廉价高稳定。"},
        {"id": 9008, "doi": "oer:NiO", "metal": "NiO", "support": "NiO", "support_display": "NiO", "reaction": "OER", "doh": 1.95, "stability": 0.90, "eg": 3.6, "eta_real": 0.52, "name": "NiO", "note": "镍氧化物，活性偏低、稳定。"},
        {"id": 9009, "doi": "oer:MnO2", "metal": "MnO₂", "support": "MnO₂", "support_display": "MnO₂", "reaction": "OER", "doh": 1.60, "stability": 0.80, "eg": 0.2, "eta_real": 0.43, "name": "MnO₂", "note": "二氧化锰，两电子路径有潜力。"},
        {"id": 9010, "doi": "oer:Fe2O3", "metal": "Fe₂O₃", "support": "Fe₂O₃", "support_display": "Fe₂O₃", "reaction": "OER", "doh": 2.00, "stability": 0.92, "eg": 2.2, "eta_real": 0.58, "name": "Fe₂O₃", "note": "铁氧化物，稳定但活性低。"},
        {"id": 9011, "doi": "oer:NC", "metal": "N-碳", "support": "缺陷碳", "support_display": "N 掺杂缺陷碳", "reaction": "OER", "doh": 0.35, "stability": 0.92, "eg": None, "eta_real": 0.65, "name": "N-碳", "note": "缺陷碳位点：弱 *OH 结合 → 高 H₂O₂（两电子）选择性，但 OER 过电位偏高。"},
        {"id": 9012, "doi": "oer:FeNC", "metal": "Fe-N-C", "support": "缺陷碳", "support_display": "Fe-N-C", "reaction": "OER", "doh": 0.55, "stability": 0.88, "eg": None, "eta_real": 0.60, "name": "Fe-N-C", "note": "单原子 Fe-N-C：高 H₂O₂ 选择性、可调控，过电位略低于 N-碳。"},
    ]


# ---------------- 用 CSV 覆盖法则表（存在时以 CSV 为准）----------------
_sup_rows = _read_csv("support_properties.csv")
if _sup_rows:
    SUPPORT_CHI.clear(); SUPPORT_EB.clear(); SUPPORT_PHOTO.clear(); OX_EOV.clear()
    for _r in _sup_rows:
        _s = _r["support"]
        if _r.get("chi"): SUPPORT_CHI[_s] = _to_float(_r["chi"])
        if _r.get("eb"): SUPPORT_EB[_s] = _to_float(_r["eb"])
        if _r.get("photo_stab"): SUPPORT_PHOTO[_s] = _r["photo_stab"]
        if _r.get("ox_eov"): OX_EOV[_s] = _to_float(_r["ox_eov"])

_met_rows = _read_csv("metal_properties.csv")
if _met_rows:
    METAL_WF.clear(); METAL_EOV_MOD.clear(); METAL_DCH3_MOD.clear()
    for _r in _met_rows:
        _m = _r["metal"]
        if _r.get("wf"): METAL_WF[_m] = _to_float(_r["wf"])
        if _r.get("eov_mod"): METAL_EOV_MOD[_m] = _to_float(_r["eov_mod"])
        if _r.get("dch3_mod"): METAL_DCH3_MOD[_m] = _to_float(_r["dch3_mod"])

REWARD_WEIGHTS = {r["key"]: _to_float(r["weight"]) for r in _read_csv("reward_weights.csv")} or {
    "yield": 0.35, "selectivity": 0.30, "stability": 0.15, "energy": 0.10, "cox": 0.10}
LOD = LAWS["LOD"]
Y_REF_LO = LAWS["Y_REF_LO"]
Y_REF_HI = LAWS["Y_REF_HI"]

_dev_rows = _read_csv("devices.csv")
if _dev_rows:
    DEVICES = []
    for _r in _dev_rows:
        _specs = json.loads(_r["specs"]) if _r.get("specs") else {}
        _params = json.loads(_r["params"]) if _r.get("params") else {}
        DEVICES.append({
            "key": _r["key"], "name": _r["name"], "stage": _to_float(_r["stage"], 0),
            "x": _to_float(_r["x"]), "y": _to_float(_r["y"]), "w": _to_float(_r["w"]), "h": _to_float(_r["h"]),
            "specs": _specs, "params": _params, "readOnly": (_r.get("readOnly") == "True"),
        })


# ============================================================
# OER 反应轨道候选池（电催化产 H₂O₂ / O₂）—— 与前端 v16 OER_POOL 对齐
# 描述符：doh = ΔG(*OH)；标度 ΔG*O = doh + 1.5，ΔG*OOH = doh + 3.2 (eV)
# 过电位 η = max(0, max(四步自由能) − 1.23)；H₂O₂ 选择性高斯峰 @ ΔG*OOH≈3.5 eV
# 注：理论构造池（标度关系近似），待 DFT(合适泛函) 与实验校准
# ============================================================
OER_POOL = _load_oer()  # 优先从 data/oer_pool.csv 加载，缺失时回退内置 12 条


def fam_of(d: Any) -> str:
    return "OCM" if (d and str(d).startswith("OCM")) else (d or "other")
