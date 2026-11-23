# -*- coding: utf-8 -*-
"""实验灯标定：输入功率 W → 显示功率 W → 光功率密度 LPD mW/cm2。

标定数据为 20–100 W 五档实测，中间按线性插值。
100 W 对应 257.3 mW/cm2，作为相对光功率 100% 的参考点。
"""

# power_W, display_W, LPD_mW_cm2
CALIB = [
    (20, 0.196, 62.42038),
    (40, 0.356, 113.3758),
    (60, 0.512, 163.0573),
    (80, 0.664, 211.465),
    (100, 0.808, 257.3248),
]

POWER_LO = CALIB[0][0]
POWER_HI = CALIB[-1][0]
LPD_MAX = CALIB[-1][2]


def _interp(x, col_in, col_out, table=None):
    rows = table or CALIB
    xs = [r[col_in] for r in rows]
    ys = [r[col_out] for r in rows]
    if x <= xs[0]:
        return float(ys[0])
    if x >= xs[-1]:
        return float(ys[-1])
    for i in range(1, len(ys)):
        if x <= xs[i]:
            t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
            return float(ys[i - 1] + t * (ys[i] - ys[i - 1]))
    return float(ys[-1])


def clamp_power(power_w):
    return max(POWER_LO, min(POWER_HI, float(power_w)))


def lpd_from_power(power_w):
    """输入功率 W → LPD mW/cm2，超出 20–100 W 按端点截断。"""
    return _interp(clamp_power(power_w), 0, 2)


def display_from_power(power_w):
    """输入功率 W → 灯头显示功率 W。"""
    return _interp(clamp_power(power_w), 0, 1)


def power_from_lpd(lpd):
    """LPD mW/cm2 → 输入功率 W（反查标定表）。"""
    return _interp(float(lpd), 2, 0)


def rel_from_lpd(lpd):
    """LPD → 相对光功率 %，100% 对应 100 W / 257.3 mW/cm2。"""
    if lpd is None or float(lpd) <= 0:
        return None
    return max(0.0, min(100.0, 100.0 * float(lpd) / LPD_MAX))


def lpd_from_rel(pct):
    """相对灯满量程 % → LPD mW/cm2。"""
    return lpd_from_power(clamp_power(POWER_HI * float(pct) / 100.0))


def rel_from_lpd_ref(lpd, ref):
    """LPD 相对某个参考满量程的百分比（用于模型特征/BO 网格，ref 可高于灯上限）。"""
    if lpd is None or float(lpd) <= 0 or not ref:
        return None
    return max(0.0, min(100.0, 100.0 * float(lpd) / float(ref)))


def lpd_from_pct_ref(pct, ref):
    """参考满量程百分比 → LPD。"""
    if ref is None:
        return None
    return float(ref) * float(pct) / 100.0


def power_w_if_in_range(lpd):
    """LPD 落在灯标定范围内时给出对应输入功率 W，否则返回 None。"""
    if lpd is None or float(lpd) <= 0:
        return None
    v = float(lpd)
    if v < CALIB[0][2] or v > CALIB[-1][2]:
        return None
    return round(float(power_from_lpd(v)), 1)


def normalize(value, unit=None):
    """把外部输入统一成 (power_w, lpd, lamp_pct)。

    unit: "w"/"power" 输入功率 / "lpd" 光功率密度 / "rel" 相对光功率% / None 自动判断。
    lamp_pct 是相对灯本身满量程（100 W = 257.3 mW/cm2）的百分比。
    """
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v <= 0:
        return None
    u = (unit or "").strip().lower()
    if u in ("w", "power", "input"):
        pw = clamp_power(v)
        lpd = lpd_from_power(pw)
        return {"power_w": pw, "lpd": lpd, "lamp_pct": 100.0 * lpd / LPD_MAX}
    if u in ("lpd", "mw/cm2", "mw_cm2"):
        pw = power_from_lpd(v)
        return {"power_w": pw, "lpd": v, "lamp_pct": 100.0 * min(v, LPD_MAX) / LPD_MAX}
    if u in ("rel", "%", "pct", "lamp"):
        lpd = lpd_from_rel(v)
        return {"power_w": clamp_power(POWER_HI * v / 100.0), "lpd": lpd, "lamp_pct": v}
    # 自动：超过灯上限当 LPD；命中标定档位当输入功率；其余当相对光功率%
    if v > LPD_MAX:
        return normalize(v, "lpd")
    if v in (p for p, _d, _q in CALIB):
        return normalize(v, "W")
    return normalize(v, "rel")


def table():
    return [
        {"power_w": p, "display_w": d, "lpd": q, "rel_pct": rel_from_lpd(q)}
        for p, d, q in CALIB
    ]
