"""
世界模型 BO：微动力学世界模型特征(act/red/absorb/h_sel/flow_sel) + 金属/载体描述符，
用实测锚点 Ridge 校准 log10(产率) 与 sel_C2；实测点覆盖实测均值，未测组合用模型预测。
选 Top4（金属硬去重、载体软分散），并对每种催化剂6组条件做世界模型条件推演。
"""
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
_DATA = _ROOT / "data"
_WM = Path(__file__).resolve().parent
import json
import numpy as np
import openpyxl
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from collections import defaultdict
import wm_kinetics as wm

XLSX = str(_DATA / "OCM_master.xlsx")

METALS = {
    'Pt': (2.28, 5.65), 'Pd': (2.20, 5.60), 'Au': (2.54, 5.10),
    'Ag': (1.93, 4.26), 'Ru': (2.20, 4.71), 'Cu': (1.90, 4.65),
    'Rh': (2.28, 4.98), 'Ir': (2.20, 5.60), 'Ni': (1.91, 5.15),
    'Co': (1.88, 5.00), 'Fe': (1.83, 4.50), 'Zn': (1.65, 4.33),
}
SUPPORTS = {
    'P25(TiO2)': (3.20, -0.10, 3.10), 'Nb2O5': (3.40, -0.69, 2.71),
    'ZnO(70±30nm)': (3.37, -0.35, 2.90), 'ZnO(30±10nm)': (3.37, -0.35, 2.90),
    'WO3(<100nm)': (2.75, 0.50, 3.20), 'SrTiO3(100nm)': (3.25, -0.80, 2.45),
    'CeO2': (3.10, -0.44, 2.56), 'SnO2(50-70nm)': (3.55, -0.20, 3.35),
    'In2O3': (2.80, -0.49, 2.40),
}
SUP_MAP = {
    'tio2': 'P25(TiO2)', 'zno': 'ZnO(70±30nm)', 'wo3': 'WO3(<100nm)',
    'ceo2': 'CeO2', 'nb2o5': 'Nb2O5', 'in2o3': 'In2O3',
    'srtio3': 'SrTiO3(100nm)', 'sno2': 'SnO2(50-70nm)',
}
BASE_FLOW = (69.0, 1.0, 10.0)


def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def feat(en, wf, Eg, CB, VB, flows=BASE_FLOW):
    p = wm.worldmodel_predict(en, wf, support=(Eg, CB, VB), flows=flows)
    return [en, wf, Eg, CB, VB, p['act'], p['red'], p['absorb'], p['h_sel'], p['flow_sel']]


# ---------- 实测锚点 ----------
wb = openpyxl.load_workbook(XLSX, read_only=True)
raw = defaultdict(list)
Xrows, ylog, ysel = [], [], []
for r in wb['催化剂池'].iter_rows(min_row=2, values_only=True):
    m, sup, y, sel = r[2], r[4], r[8], r[10]
    if not m or not sup:
        continue
    mk = str(m).lower()
    metal_key = next((k for k in METALS if k.lower() == mk), None)
    sk = SUP_MAP.get(str(sup).lower())
    if metal_key is None or sk is None:
        continue
    yv, sv = fnum(y), fnum(sel)
    if yv is None or yv <= 0:
        continue
    en, wf = METALS[metal_key]
    Eg, CB, VB = SUPPORTS[sk]
    Xrows.append(feat(en, wf, Eg, CB, VB))
    ylog.append(np.log10(yv))
    ysel.append(sv if sv is not None else 85.0)
    raw[(metal_key, sk)].append((yv, sv))

X = np.array(Xrows)
scaler = StandardScaler().fit(X)
Xs = scaler.transform(X)
gy = Ridge(alpha=1.0).fit(Xs, ylog)
gs = Ridge(alpha=1.0).fit(Xs, ysel)
resid = ylog - gy.predict(Xs)
sd_pool = float(np.std(resid))
print(f"实测锚点: {len(Xrows)} 条；Ridge log10y 残差sd={sd_pool:.3f}")


def predict(m, s, flows=BASE_FLOW):
    en, wf = METALS[m]
    Eg, CB, VB = SUPPORTS[s]
    f = scaler.transform([feat(en, wf, Eg, CB, VB, flows)])
    mu_y = float(gy.predict(f)[0])
    mu_s = float(gs.predict(f)[0])
    key = (m, s)
    n_obs = 0
    if key in raw:
        ys = [v[0] for v in raw[key]]
        ss = [v[1] for v in raw[key] if v[1] is not None]
        n_obs = len(ys)
        mu_y = np.log10(np.mean(ys))
        sd_y = 0.15 / np.sqrt(n_obs)
        if ss:
            mu_s = float(np.mean(ss))
        tag = f"实测n={n_obs}"
        explore = 0.30 * sd_y
    else:
        sd_y = 0.30  # 保守模型不确定度，不取全残差幅
        tag = "世界模型预测"
        explore = 0.10 * sd_y  # 未测组合弱探索，不反超实测明星
    ucb = mu_y + 0.55 * (mu_s / 100.0) + explore
    return dict(metal=m, sup=s, en=en, wf=wf, Eg=Eg, CB=CB, VB=VB,
                mu_y=mu_y, sd_y=sd_y, mu_s=mu_s, ucb=ucb, tag=tag, n_obs=n_obs)


# ---------- 遍历12×9，贪心Top4 ----------
rows = [predict(m, s) for m in METALS for s in SUPPORTS]
chosen, used_m, used_sbase = [], set(), set()
remaining = list(rows)
while len(chosen) < 4 and remaining:
    best = None
    for d in remaining:
        sbase = d['sup'].split('(')[0]
        score = d['ucb']
        if d['metal'] in used_m:
            score -= 1.5
        if sbase in used_sbase:
            score -= 0.5
        if d['n_obs'] == 0:   # 无实测外推先验折扣，不作骨干
            score -= 0.5
        d = dict(d); d['score'] = score
        if best is None or score > best['score']:
            best = d
    chosen.append(best)
    used_m.add(best['metal'])
    used_sbase.add(best['sup'].split('(')[0])
    remaining = [d for d in remaining if d is not best]

print("\n===== 世界模型 BO Top4 =====")
for i, d in enumerate(chosen, 1):
    yhat = 10 ** d['mu_y']
    print(f"[{i}] {d['metal']}/{d['sup']} ({d['tag']})  log10y={d['mu_y']:.2f} "
          f"~{yhat:.0f}, sel={d['mu_s']:.0f}%, UCB={d['ucb']:.2f}")

# ---------- 每种催化剂6组条件（mL/min，各自不同；单变量步进，温度/光强锁） ----------
CONDITIONS = {
    ("Pd", "ZnO(70±30nm)"): [
        ("E1", "基线", 69, 1.0, 10, 80), ("E2", "CH4↓", 60, 1.0, 19, 80),
        ("E3", "CH4↑", 76, 1.0, 3, 80), ("E4", "O2↓", 69, 0.6, 10.4, 80),
        ("E5", "O2↑", 69, 1.6, 9.4, 80), ("E6", "Ar稀释↑", 69, 1.0, 25, 95),
    ],
    ("Ag", "P25(TiO2)"): [
        ("E1", "基线", 69, 1.0, 10, 80), ("E2", "CH4↓", 55, 1.0, 24, 80),
        ("E3", "CH4↑", 75, 1.0, 4, 80), ("E4", "O2↓", 69, 0.5, 10.5, 80),
        ("E5", "O2↑", 69, 2.0, 9, 80), ("E6", "Ar稀释↑", 69, 1.0, 30, 100),
    ],
    ("Au", "CeO2"): [
        ("E1", "基线", 69, 1.0, 10, 80), ("E2", "CH4↓", 62, 1.0, 18, 80),
        ("E3", "CH4↑", 72, 1.0, 6, 80), ("E4", "O2↓", 69, 0.7, 10.3, 80),
        ("E5", "O2↑", 69, 1.8, 9.2, 80), ("E6", "Ar稀释↑", 69, 1.0, 22, 92),
    ],
    ("Cu", "SrTiO3(100nm)"): [
        ("E1", "基线", 69, 1.0, 10, 80), ("E2", "CH4↓", 62, 1.0, 18, 80),
        ("E3", "CH4↑", 73, 1.0, 6, 80), ("E4", "O2↓", 69, 0.6, 10.4, 80),
        ("E5", "O2↑", 69, 1.8, 9.2, 80), ("E6", "Ar稀释↑", 69, 1.0, 23, 93),
    ],
}

# ---------- 24点世界模型条件推演 ----------
# 锚定基线E1（实测点=实测均值，未测点=Ridge预测），E2-E6乘世界模型条件响应因子
FS0, PCH4_0 = 0.914, 69.0 / 80.0
points = []
exp_no = 1
for d in chosen:
    base = predict(d['metal'], d['sup'], BASE_FLOW)
    base_y = 10 ** base['mu_y']
    base_sel = base['mu_s']
    for inner, step, ch4, o2, ar, tot in CONDITIONS[(d['metal'], d['sup'])]:
        flows = (ch4, o2, ar)
        wmf = wm.worldmodel_predict(d['en'], d['wf'],
                                    support=(d['Eg'], d['CB'], d['VB']), flows=flows)
        fs, pch4 = wmf['flow_sel'], wmf['pCH4']
        if inner == 'E1':
            pred_y, pred_sel = base_y, base_sel
        else:
            # 弱氧(flow_sel↑)升C2选择；CH4分压升提绝对产率；响应为世界模型估算
            pred_sel = min(99.0, base_sel * (fs / FS0))
            pred_y = base_y * (pch4 / PCH4_0) * (fs / FS0) ** 0.5
        points.append(dict(
            exp=exp_no, metal=d['metal'], sup=d['sup'], inner=inner, step=step,
            ch4=ch4, o2=o2, ar=ar, tot=tot,
            pred_y=round(pred_y), pred_sel=round(pred_sel, 1),
            n_obs=d['n_obs'], tag=base['tag'],
            act=wmf['act'], red=wmf['red'], absorb=wmf['absorb'],
            h_sel=wmf['h_sel'], flow_sel=fs, pCH4=round(pch4, 3),
        ))
        exp_no += 1

with open(_WM / "_bo_result.json", "w") as f:
    json.dump(dict(anchors=len(Xrows), chosen=chosen, points=points),
              f, ensure_ascii=False, indent=2, default=float)

print("\n===== 24点世界模型推演（节选基线）=====")
for p in points:
    if p['inner'] == 'E1':
        print(f"{p['metal']}/{p['sup']} E1 预测y~{p['pred_y']} sel={p['pred_sel']}% "
              f"act={p['act']} red={p['red']} fs={p['flow_sel']}")
