"""
用主表实测数据标定微动力学模型参数
"""
import numpy as np
from scipy.optimize import minimize
from scipy.integrate import odeint
import openpyxl
from collections import defaultdict

R = 8.314e-3
T = 473  # 200°C，光热催化实际工作温度

# 金属描述符（电负性, 功函数eV）
METAL_DESC = {
    'Pd': (2.20, 5.60), 'Pt': (2.28, 5.65), 'Au': (2.54, 5.10),
    'Ag': (1.93, 4.26), 'Ru': (2.20, 4.71), 'Cu': (1.90, 4.65),
    'Rh': (2.28, 4.98), 'Ir': (2.20, 5.65), 'Ni': (1.91, 5.15),
    'Co': (1.88, 5.00), 'Fe': (1.83, 4.50),
}

# 基元反应：(logA, Ea0, s_en, s_wf)
# 我们要标定的是 6 步的整体缩放因子，先简化为 3 个全局参数：
#  p[0] = C-H活化能垒偏移（kJ/mol）
#  p[1] = 深度氧化相对速率（乘k5）
#  p[2] = 乙烷脱氢相对速率（乘k4）
#  p[3] = C-C偶联相对速率（乘k3）

def get_rates(elec_neg, work_func, p):
    Ea1 = 80 + p[0]
    Ea2 = 40
    Ea3 = 20
    Ea4 = 60
    Ea5 = 50
    Ea6 = 35
    k1 = 10**13 * np.exp(-Ea1/(R*T))
    k2 = 10**12 * np.exp(-Ea2/(R*T))
    k3 = 10**9  * np.exp(-Ea3/(R*T)) * p[3]
    k4 = 10**11 * np.exp(-Ea4/(R*T)) * p[2]
    k5 = 10**12 * np.exp(-Ea5/(R*T)) * p[1]
    k6 = 10**12.5 * np.exp(-Ea6/(R*T))
    return [k1,k2,k3,k4,k5,k6]

def simulate(elec_neg, work_func, p, c_CH4=0.5, c_O2=0.15):
    rates = get_rates(elec_neg, work_func, p)
    def odes(y, t):
        CH3g, C2H6, C2H4, CO2, Ost, CH3st = y
        k1,k2,k3,k4,k5,k6 = rates
        r1 = k1 * c_CH4 * (1-Ost-CH3st)
        r2 = k2 * CH3st
        r3 = k3 * CH3g**2
        r4 = k4 * C2H6
        r5 = k5 * CH3st * Ost**3
        r6 = k6 * c_O2 * (1-Ost-CH3st)
        return [r2-2*r3, r3-r4, r4, r5, 2*r6-3*r5, r1-r2-r5]
    t = np.linspace(0, 500, 300)
    sol = odeint(odes, [0,0,0,0,0,0], t)
    ss = sol[-30:].mean(axis=0)
    CH3g, C2H6, C2H4, CO2, Ost, CH3st = ss
    C2 = C2H6 + C2H4
    tot = C2 + CO2
    if tot < 1e-12:
        return 0, 0, 0, 0
    x = tot/c_CH4*100
    sC2 = C2/tot*100
    sC2H6 = C2H6/tot*100
    sC2H4 = C2H4/tot*100
    return x, sC2, sC2H6, sC2H4

# 读主表实测
wb = openpyxl.load_workbook('/Users/fenglongli/Downloads/unilabWorld/data/OCM_master.xlsx')
ws = wb['主表']
exp = defaultdict(list)
for row in ws.iter_rows(min_row=2, values_only=True):
    m = row[5]
    x, sC2, s4, s6 = row[18], row[19], row[20], row[21]
    if m and m in METAL_DESC and x is not None and s6 is not None:
        exp[m].append((x, sC2, s4, s6))

# 取均值
exp_avg = {}
for m, rows in exp.items():
    n = len(rows)
    exp_avg[m] = tuple(sum(r[i] for r in rows)/n for i in range(4))
print("实测均值：")
for m,v in exp_avg.items():
    print(f"  {m}: x={v[0]:.2f}%, sel_C2={v[1]:.1f}%, C2H6={v[3]:.1f}%")

# 标定目标函数
def loss(p):
    err = 0
    for m, (xe, sC2e, s4e, s6e) in exp_avg.items():
        en, wf = METAL_DESC[m]
        xp, sC2p, s6p, s4p = simulate(en, wf, p)
        # 权重：sel_C2H6 最重要（实验主产）
        err += (xp - xe)**2 * 0.1
        err += (sC2p - sC2e)**2 * 0.5
        err += (s6p - s6e)**2 * 2.0
        err += (s4p - s4e)**2 * 1.0
    return err

# 初始参数：[Ea1偏移, k5缩放, k4缩放, k3缩放]
p0 = [0, 1.0, 1.0, 1.0]
res = minimize(loss, p0, method='Nelder-Mead', options={'maxiter':2000, 'xatol':1e-4})
print(f"\n标定完成，loss={res.fun:.2f}")
print(f"参数: Ea1偏移={res.x[0]:.2f} kJ/mol, k5缩放={res.x[1]:.3f}, k4缩放={res.x[2]:.3f}, k3缩放={res.x[3]:.3f}")

print("\n标定后预测 vs 实测：")
print(f"{'金属':<6} {'x实':>7} {'x预':>7} {'selC2实':>9} {'selC2预':>9} {'C2H6实':>9} {'C2H6预':>9}")
for m, (xe, sC2e, s4e, s6e) in exp_avg.items():
    en, wf = METAL_DESC[m]
    xp, sC2p, s6p, s4p = simulate(en, wf, res.x)
    print(f"{m:<6} {xe:>7.2f} {xp:>7.2f} {sC2e:>9.1f} {sC2p:>9.1f} {s6e:>9.1f} {s6p:>9.1f}")
