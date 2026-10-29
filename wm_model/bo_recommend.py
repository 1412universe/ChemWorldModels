"""
BO 推荐：金属 × 载体 二维贝叶斯优化
====================================
- 训练点：催化剂池中已有实测 (metal, support) -> log10(y), sel_C2
- 特征：金属(Pauling电负性 en, 功函数 wf) + 载体(Eg, CB, VB vs NHE)
- 模型：StandardScaler + GP(RBF) 分别拟合 log10(产率) 与选择性
- 采集：UCB = mu_y + kappa*sigma_y，并叠加选择性项；贪心选 Top4 且强制载体/金属分散
- 条件：每个催化剂 6 组，单变量步进（基线 + CH4×2 + O2×2 + Ar×1），温度/光强锁定
"""
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
_DATA = _ROOT / "data"
_WM = Path(__file__).resolve().parent
import numpy as np
import openpyxl
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel, WhiteKernel
from sklearn.preprocessing import StandardScaler
from collections import defaultdict

XLSX = str(_DATA / "OCM_master.xlsx")

# ---------- 1. 金属描述符（金属描述符 sheet） ----------
METALS = {
    # en, wf
    'Pt':  (2.28, 5.65), 'Pd': (2.20, 5.60), 'Au': (2.54, 5.10),
    'Ag':  (1.93, 4.26), 'Ru': (2.20, 4.71), 'Cu': (1.90, 4.65),
    'Rh':  (2.28, 4.98), 'Ir': (2.20, 5.60), 'Ni': (1.91, 5.15),
    'Co':  (1.88, 5.00), 'Fe': (1.83, 4.50), 'Zn': (1.65, 4.33),
}

# ---------- 2. 9 个候选载体（载体描述符 sheet 实查值） ----------
# name: (Eg, CB, VB)  pH=0 vs NHE 典型值
SUPPORTS = {
    'P25(TiO2)':      (3.20, -0.10, 3.10),
    'Nb2O5':          (3.40, -0.69, 2.71),   # CB/VB为pH7，见备注
    'ZnO(70±30nm)':  (3.37, -0.35, 2.90),
    'ZnO(30±10nm)':  (3.37, -0.35, 2.90),
    'WO3(<100nm)':   (2.75,  0.50, 3.20),
    'SrTiO3(100nm)': (3.25, -0.80, 2.45),
    'CeO2':           (3.10, -0.44, 2.56),
    'SnO2(50-70nm)': (3.55, -0.20, 3.35),
    'In2O3':          (2.80, -0.49, 2.40),
}

# 催化剂池载体标准名 -> 候选载体键
SUP_MAP = {
    'tio2': 'P25(TiO2)', 'zno': 'ZnO(70±30nm)', 'wo3': 'WO3(<100nm)',
    'ceo2': 'CeO2', 'nb2o5': 'Nb2O5', 'in2o3': 'In2O3',
    'srtio3': 'SrTiO3(100nm)', 'sno2': 'SnO2(50-70nm)',
}

def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

# ---------- 3. 提取实测锚点 ----------
wb = openpyxl.load_workbook(XLSX, read_only=True)
pool = wb['催化剂池']
anchors = []  # (en, wf, Eg, CB, VB, log10y, sel)
raw = defaultdict(list)
for r in pool.iter_rows(min_row=2, values_only=True):
    m, sup, y, sel = r[2], r[4], r[8], r[10]
    if not m or not sup:
        continue
    mk = str(m).lower()
    metal_key = next((k for k in METALS if k.lower() == mk), None)
    if metal_key is None:
        continue
    sk = SUP_MAP.get(str(sup).lower())
    if sk is None:
        continue
    yv, sv = fnum(y), fnum(sel)
    if yv is None or yv <= 0:
        continue
    en, wf = METALS[metal_key]
    Eg, CB, VB = SUPPORTS[sk]
    anchors.append([en, wf, Eg, CB, VB, np.log10(yv), sv if sv is not None else 85.0])
    raw[(metal_key, sk)].append((yv, sv))

A = np.array(anchors)
Xtr, ytr_log, ytr_sel = A[:, :5], A[:, 5], A[:, 6]
print(f"实测锚点: {len(A)} 条（可映射到9候选载体）")

# ---------- 4. 训练 GP ----------
scaler = StandardScaler().fit(Xtr)
Xs = scaler.transform(Xtr)
kernel_y = ConstantKernel(1.0) * RBF(length_scale=1.0) + WhiteKernel(0.05)
kernel_s = ConstantKernel(1.0) * RBF(length_scale=1.0) + WhiteKernel(3.0)
gpy = GaussianProcessRegressor(kernel=kernel_y, alpha=1e-3, normalize_y=True, n_restarts_optimizer=5).fit(Xs, ytr_log)
gps = GaussianProcessRegressor(kernel=kernel_s, alpha=1e-2, normalize_y=True, n_restarts_optimizer=5).fit(Xs, ytr_sel)

# ---------- 5. 遍历 12×9 候选，UCB 打分 ----------
rows = []
for m, (en, wf) in METALS.items():
    for s, (Eg, CB, VB) in SUPPORTS.items():
        x = scaler.transform([[en, wf, Eg, CB, VB]])
        mu_y, sd_y = gpy.predict(x, return_std=True)
        mu_s, sd_s = gps.predict(x, return_std=True)
        mu_y, sd_y, mu_s, sd_s = mu_y[0], sd_y[0], mu_s[0], sd_s[0]
        # 实测锚点覆盖GP；σ随样本量收缩（n越大越可信）
        key = (m, s)
        n_obs = 0
        if key in raw:
            ys = [v[0] for v in raw[key]]
            ss = [v[1] for v in raw[key] if v[1] is not None]
            n_obs = len(ys)
            mu_y = np.log10(np.mean(ys))
            sd_y = 0.15 / np.sqrt(n_obs)
            if ss:
                mu_s = np.mean(ss)
            tag = f"实测n={n_obs}"
        else:
            tag = "GP外推"
        # UCB：μ主导（实测优先），σ弱探索（κ=0.3），选择性加权
        ucb = mu_y + 0.55 * (mu_s / 100.0) + 0.30 * sd_y
        rows.append(dict(metal=m, sup=s, en=en, wf=wf, Eg=Eg, CB=CB, VB=VB,
                         mu_y=mu_y, sd_y=sd_y, mu_s=mu_s, ucb=ucb, tag=tag, n_obs=n_obs))

# ---------- 6. 贪心选 Top4：金属硬去重，载体材料软分散 ----------
chosen = []
used_m, used_sbase = set(), set()
remaining = list(rows)
while len(chosen) < 4 and remaining:
    best = None
    for d in remaining:
        sbase = d['sup'].split('(')[0]
        score = d['ucb']
        if d['metal'] in used_m:      # 金属不重复（硬）
            score -= 1.5
        if sbase in used_sbase:      # 同材料软分散（ZnO两版等）
            score -= 0.5
        d = dict(d); d['score'] = score
        if best is None or score > best['score']:
            best = d
    chosen.append(best)
    used_m.add(best['metal'])
    used_sbase.add(best['sup'].split('(')[0])
    remaining = [d for d in remaining if d is not best]

# ---------- 7. 打印 Top4 ----------
print("\n===== BO Top4 推荐（UCB，金属/载体已分散）=====")
for i, d in enumerate(chosen, 1):
    yhat = 10 ** d['mu_y']
    print(f"\n[{i}] {d['metal']}/{d['sup']}  ({d['tag']})")
    print(f"    en={d['en']}, wf={d['wf']} eV | Eg={d['Eg']}, CB={d['CB']}, VB={d['VB']}")
    print(f"    预测 log10(y)={d['mu_y']:.2f} (~{yhat:.0f} μmol/g/h), σ={d['sd_y']:.2f}, 预测sel_C2={d['mu_s']:.0f}%, UCB={d['ucb']:.2f}")

# 保存给写表脚本
import json
out = dict(anchors=len(A), chosen=chosen)
with open(_WM / "_bo_result.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=2, default=float)
