"""
OCM 微动力学世界模型（最小可行版）
=====================================
基元反应网络：
  R1: CH4(g) + *  -> CH3* + H*      C-H 活化
  R2: CH3* -> CH3(g) + *            甲基脱附
  R3: CH3(g) + CH3(g) -> C2H6(g)    气相偶联
  R4: C2H6(g) + * -> C2H4(g) + H2   乙烷脱氢
  R5: CH3* + 3O* -> CO2(g) + 3H*    深度氧化副反应
  R6: O2(g) + 2* -> 2O*             氧活化

给定催化剂描述符（电负性、功函数）→ 插值每步能垒 → Arrhenius 算 k → ODE 解稳态产物分布。
"""
import numpy as np
from scipy.integrate import odeint

# ========== 物理常数 ==========
R = 8.314e-3  # kJ/mol/K
T = 298        # K（室温光催化）

# ========== 基元反应定义 ==========
# 每步: (名称, 指前因子 A, 基础能垒 Ea0 kJ/mol, 描述符敏感度)
# 描述符敏感度：Ea = Ea0 + sensitivity * (metal_elec_neg - 2.0)
REACTIONS = [
    # name,       log10_A, Ea0, sens_elec, sens_wf
    ('C-H活化',    13.0,   80,  -5.0,  -2.0),   # 电负性高→CH4吸附强→能垒低
    ('甲基脱附',    12.0,   40,   3.0,   1.0),   # 金属-甲基键强→脱附难
    ('C-C偶联',     9.0,   20,   0.0,   0.0),   # 气相反应，与催化剂无关
    ('乙烷脱氢',   11.0,   60,  -2.0,  -1.0),
    ('深度氧化',   12.0,   50,   4.0,   3.0),   # 电负性高/O强→深度氧化快
    ('氧活化',     12.5,   35,  -3.0,  -2.0),
]

def support_gain(cb, vb, ref_cb=-0.1, ref_vb=3.1):
    """载体光生载流子增益（以P25为基准）。
    CB越负→还原电子越强(助O2活化/C-H)；VB越正→氧化空穴越强(助C-H、也促深度氧化)。
    返回 (red_gain, ox_gain)，系数克制，避免数量级漂移。"""
    red = 1.0 + 0.15 * ((-cb) - (-ref_cb))
    ox = 1.0 + 0.10 * (vb - ref_vb)
    return max(red, 0.3), max(ox, 0.3)


def get_rates(elec_neg, work_func, temp=T, support=None):
    """根据金属描述符算每步速率常数；support=(Eg,CB,VB)时叠加载体光生载流子调制。"""
    rates = []
    red_gain = ox_gain = 1.0
    if support is not None:
        _, cb, vb = support
        red_gain, ox_gain = support_gain(cb, vb)
    for idx, (name, logA, Ea0, s_en, s_wf) in enumerate(REACTIONS):
        Ea = Ea0 + s_en * (elec_neg - 2.0) + s_wf * (work_func - 5.0)
        k = 10**logA * np.exp(-Ea / (R * temp))
        if idx == 0:      # R1 C-H活化：e-/h+共同协助
            k *= red_gain * ox_gain
        elif idx == 4:    # R5 深度氧化：空穴促进
            k *= ox_gain
        elif idx == 5:    # R6 O2活化：还原电子促进
            k *= red_gain
        rates.append(k)
    return rates

def odes(y, t, rates, c_CH4_in, c_O2_in):
    """ODE: y = [CH3_g, C2H6, C2H4, CO2, O_star, CH3_star]"""
    CH3g, C2H6, C2H4, CO2, Ost, CH3st = y
    k1,k2,k3,k4,k5,k6 = rates

    # R1: CH4(g) + * -> CH3* + H*
    r1 = k1 * c_CH4_in * (1 - Ost - CH3st)
    # R2: CH3* -> CH3(g)
    r2 = k2 * CH3st
    # R3: 2 CH3(g) -> C2H6
    r3 = k3 * CH3g**2
    # R4: C2H6 -> C2H4
    r4 = k4 * C2H6
    # R5: CH3* + 3O* -> CO2
    r5 = k5 * CH3st * Ost**3
    # R6: O2 -> 2O*
    r6 = k6 * c_O2_in * (1 - Ost - CH3st)

    d_CH3g  = r2 - 2*r3
    d_C2H6  = r3 - r4
    d_C2H4  = r4
    d_CO2   = r5
    d_Ost   = 2*r6 - 3*r5
    d_CH3st = r1 - r2 - r5

    return [d_CH3g, d_C2H6, d_C2H4, d_CO2, d_Ost, d_CH3st]

def simulate(elec_neg, work_func, c_CH4=0.5, c_O2=0.15, temp=T, t_max=100,
             support=None, flows=None):
    """
    输入：金属电负性、功函数、进气浓度；support=(Eg,CB,VB)载体描述符；
          flows=(ch4,o2,ar) mL/min，给出时按总流量归一为分压浓度。
    输出：稳态产物 dict
    """
    if flows is not None:
        ch4, o2, ar = flows
        tot = ch4 + o2 + ar
        c_CH4 = 0.5 * ch4 / tot if tot > 0 else 0.5
        c_O2 = o2 / tot if tot > 0 else 0.15
    rates = get_rates(elec_neg, work_func, temp, support=support)
    y0 = [0, 0, 0, 0, 0, 0]
    t = np.linspace(0, t_max, 200)
    sol = odeint(odes, y0, t, args=(rates, c_CH4, c_O2))
    # 取稳态（最后一段均值）
    ss = sol[-20:].mean(axis=0)
    CH3g, C2H6, C2H4, CO2, Ost, CH3st = ss

    C2_total = C2H6 + C2H4
    total_products = C2_total + CO2
    x_CH4 = total_products / c_CH4 * 100 if c_CH4 > 0 else 0
    sel_C2 = C2_total / total_products * 100 if total_products > 0 else 0
    sel_C2H6 = C2H6 / total_products * 100 if total_products > 0 else 0
    sel_C2H4 = C2H4 / total_products * 100 if total_products > 0 else 0
    sel_CO2 = CO2 / total_products * 100 if total_products > 0 else 0

    return {
        'CH3_g': CH3g, 'C2H6': C2H6, 'C2H4': C2H4, 'CO2': CO2,
        'x_CH4_%': round(x_CH4, 2),
        'sel_C2_%': round(sel_C2, 1),
        'sel_C2H6_%': round(sel_C2H6, 1),
        'sel_C2H4_%': round(sel_C2H4, 1),
        'sel_CO2_%': round(sel_CO2, 1),
    }

def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def worldmodel_predict(en, wf, support=None, flows=None, c_CH4=0.5, c_O2=0.15):
    """半经验微动力学世界模型特征：金属描述符 + 载体能带 + 流量 → 物理特征向量。
    物理结构对应6步竞争：C-H活化(R1)、CH3脱附(R2)、C-C偶联(R3)、乙烷脱氢(R4)、
    深度氧化(R5)、O2活化(R6)。本函数只给无量纲特征，绝对产率/选择性由BO用实测
    锚点回归校准，不臆造绝对值。support=(Eg,CB,VB)；flows=(ch4,o2,ar) mL/min。"""
    import math
    if flows is not None:
        ch4, o2, ar = flows
        tot = ch4 + o2 + ar
        pCH4 = ch4 / tot if tot > 0 else c_CH4
        pO2 = o2 / tot if tot > 0 else c_O2
    else:
        pCH4, pO2 = c_CH4, c_O2

    Eg = CB = VB = None
    if support is not None:
        Eg, CB, VB = support

    # R1 C-H活化描述符：电负性与功函数联合（适中区给分，不臆造单峰绝对值）
    act_en = _clamp(1.0 - abs(en - 2.1) / 0.6)
    act_wf = _clamp(1.0 - abs(wf - 5.0) / 1.2)
    act = act_en * act_wf
    # R6 O2活化/还原电子：CB越负还原越强
    red = _clamp(1.0 + 0.30 * ((-CB) - 0.1), 0.5, 1.4) if CB is not None else 1.0
    # 载流子吸光：Eg~3.1eV最佳
    absorb = _clamp(math.exp(-0.5 * ((Eg - 3.1) / 0.5) ** 2)) if Eg is not None else 1.0
    # R5 深度氧化抑制：VB过高(高空穴)促CO2
    h_sel = _clamp(1.0 - 0.12 * (VB - 3.0), 0.5, 1.2) if VB is not None else 1.0
    # 流量：弱氧富CH4利于C2偶联
    o2_ratio = pO2 / (pCH4 + pO2 + 1e-9)
    flow_sel = _clamp(1.0 - 6.0 * o2_ratio, 0.5, 1.0)

    return {
        'act': round(act, 4), 'red': round(red, 3), 'absorb': round(absorb, 3),
        'h_sel': round(h_sel, 3), 'flow_sel': round(flow_sel, 3),
        'pCH4': round(pCH4, 3), 'pO2': round(pO2, 4),
        'en': en, 'wf': wf, 'Eg': Eg, 'CB': CB, 'VB': VB,
    }


# ========== 对比测试 ==========
if __name__ == '__main__':
    metals = {
        'Pd':  (2.20, 5.60),
        'Pt':  (2.28, 5.65),
        'Au':  (2.54, 5.10),
        'Ag':  (1.93, 4.26),
        'Ru':  (2.20, 4.71),
        'Rh':  (2.28, 4.98),
        'Ni':  (1.91, 5.15),
    }
    print(f"{'金属':<6} {'x_CH4%':>8} {'sel_C2%':>9} {'sel_C2H6%':>11} {'sel_C2H4%':>11} {'sel_CO2%':>9}")
    print('-'*60)
    for m, (en, wf) in metals.items():
        r = simulate(en, wf)
        print(f"{m:<6} {r['x_CH4_%']:>8.2f} {r['sel_C2_%']:>9.1f} {r['sel_C2H6_%']:>11.1f} {r['sel_C2H4_%']:>11.1f} {r['sel_CO2_%']:>9.1f}")
