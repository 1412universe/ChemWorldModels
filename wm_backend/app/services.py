'''
世界模型核心服务：预测、约束校验、主动学习、配方导出
与前端 v16 逻辑对齐
'''
import csv
import io
import json
import math
import random
import re
import threading
from datetime import datetime
from typing import Any

from .data import (
    ALLCAT, DEVICES, DOMAIN_GAP, OCM_YS, POOL, OER_POOL, derive_phys, eov_of, dcht3_of,
    LAWS, LOD, REWARD_WEIGHTS, Y_REF_LO, Y_REF_HI,
)

# ============================================================
# 相似度 / 近邻
# ============================================================
def dist(a: dict, b: dict) -> float:
    d = 0.0
    d += 0.0 if a.get('mech') == b.get('mech') else 1.0
    d += 0.0 if a.get('metal') == b.get('metal') else 0.8
    d += 0.0 if a.get('support') == b.get('support') else 0.6
    d += abs((a.get('bg') or 2.8) - (b.get('bg') or 2.8)) * 0.4
    d += abs((a.get('ad') or -0.5) - (b.get('ad') or -0.5)) * 0.5
    d += abs((a.get('oox') or 0.4) - (b.get('oox') or 0.4)) * 0.3
    d += 0.0 if a.get('photo') == b.get('photo') else 0.3
    if a.get('domain') and b.get('domain') and fam_of(a.get('domain')) != fam_of(b.get('domain')):
        d += DOMAIN_GAP
    return d


def fam_of(d: Any) -> str:
    return 'OCM' if (d and str(d).startswith('OCM')) else (d or 'other')


def knn(pool: list[dict], r: dict, k: int = 18) -> list[tuple[dict, float]]:
    arr = sorted([(p, dist(r, p)) for p in pool], key=lambda x: x[1])
    return arr[:k]


def wmedian(items: list[tuple[dict, float]], getv) -> float:
    arr = [{'v': getv(it[0]), 'w': math.exp(-it[1])} for it in items if getv(it[0]) is not None]
    if not arr:
        return 0.0
    arr.sort(key=lambda x: x['v'])
    tw = sum(x['w'] for x in arr)
    acc = 0.0
    for x in arr:
        acc += x['w']
        if acc >= tw / 2:
            return x['v']
    return arr[-1]['v']


# ============================================================
# 约束校验
# ============================================================
def compute_constraints(r: dict, oer_target: str = "cat") -> list[dict]:
    if r.get('reaction') == 'OER':
        return compute_oer_constraints(r)
    out = []
    # —— 物理化学法则阈值：统一从 data.LAWS（laws.csv）读取，避免硬编码 ——
    L = LAWS
    E_OX = L["C_E_OX"]; E_RED = L["C_E_RED"]
    VB_A = L["C_VB_FORM_A"]; VB_B = L["C_VB_FORM_B"]; VB_REF = L["VB_REF_BG"]
    BG_PH_HI = L["C_BG_PHOTON_HI"]; BG_PH_LO = L["C_BG_PHOTON_LO"]
    AD_HI = L["C_AD_HI"]; AD_LO = L["C_AD_LO"]
    OOX_THR = L["C_OOX_THR"]; S_SEL_THR = L["C_S_SEL_THR"]
    T_FAIL = L["C_TEMP_FAIL"]; T_WARN = L["C_TEMP_WARN"]; T_LO = L["C_TEMP_LO"]
    MT_Y_THR = L["C_MT_Y_THR"]
    QY_YREF = L["C_QY_YREF"]; QY_MAX = L["C_QY_MAX"]; QY_WARN = L["C_QY_WARN"]
    STAB_T_WARN = L["C_STAB_TEMP_WARN"]; STAB_OOX_THR = L["C_STAB_OOX_THR"]; STAB_T_THR = L["C_STAB_TEMP_THR"]
    BL_BG_HI = L["C_BL_BG_HI"]; REC_BG_LO = L["C_REC_BG_LO"]; REC_CB_THR = L["C_REC_CB_THR"]
    OVF_LO = L["C_OVF_LO"]; OVF_HI = L["C_OVF_HI"]
    SCHOTTKY_PHI_LO = L["C_SCHOTTKY_PHI_LO"]
    LD_FAIL = L["C_LD_FAIL"]; LD_WARN = L["C_LD_WARN"]
    TAU_FAIL = L["C_TAU_FAIL"]; TAU_WARN = L["C_TAU_WARN"]
    EB_RATIO = L["C_EB_RATIO"]
    MS_VBI_F = L["C_MS_VBI_F"]; MS_VBI_FLOOR = L["MS_VBI_FLOOR"]; MS_W_RATIO = L["MS_W_RATIO"]
    KIE_LO = L["C_KIE_LO"]; KIE_HI = L["C_KIE_HI"]
    BRANCH_HI = L["C_BRANCH_S_HI"]; BRANCH_LO = L["C_BRANCH_S_LO"]
    FLUX_I_LO = L["C_FLUX_I_LO"]
    KNUD_PORE = L["C_KNUD_PORE"]; KNUD_Y_THR = L["C_KNUD_Y_THR"]
    EA_RATIO_HI = L["C_EA_RATIO_HI"]; EA_RATIO_LO = L["C_EA_RATIO_LO"]
    EOV_WIN_LO = L["C_EOV_WIN_LO"]; EOV_WIN_HI = L["C_EOV_WIN_HI"]; EOV_VERTEX = L["C_EOV_VERTEX"]
    DCH3_FAIL = L["C_DCH3_FAIL"]; DCH3_WARN = L["C_DCH3_WARN"]
    VOLCANO_EOV_SPREAD = L["VOLCANO_EOV_SPREAD"]; VOLCANO_DC_N = L["C_VOLCANO_DC_N"]
    VOLCANO_LO = L["C_VOLCANO_LO"]; VOLCANO_HI = L["C_VOLCANO_HI"]
    DEFAULT_BG = L["DEFAULT_BG"]; LANG_TH_CH4 = L["LANG_TH_CH4"]
    MECH_TEMP = {"OCM": L["MECH_TEMP_OCM"], "MPO": L["MECH_TEMP_MPO"]}; MECH_TEMP_OTHER = L["MECH_TEMP_OTHER"]
    O2RATIO = {"OCM": L["O2RATIO_OCM"], "MPO": L["O2RATIO_MPO"]}; O2RATIO_OTHER = L["O2RATIO_OTHER"]
    NOCM_Y_THR = L["NOCM_Y_THR"]
    if r.get('eov') is None:
        r['eov'] = eov_of(r)
    if r.get('dcht3') is None:
        r['dcht3'] = dcht3_of(r)

    bg_known = r.get('bg') is not None
    bg = r['bg'] if bg_known else DEFAULT_BG
    vb = VB_A - (bg - VB_REF) * VB_B
    cb = vb - bg
    E_ox = E_OX
    E_red = E_RED
    mech = r.get('mech') or 'OCM'
    temp_c = MECH_TEMP.get(mech, MECH_TEMP_OTHER)
    o2_ratio = O2RATIO.get(mech, O2RATIO_OTHER)
    ad = r.get('ad')
    oox = r.get('oox') if r.get('oox') is not None else 0.4
    y = r.get('y') or 0
    lab = '' if bg_known else '(带隙缺，按 2.8 eV 估算)'
    P = derive_phys(r)

    # ①
    if mech == 'NOCM':
        out.append({'k': 'thermo', 'name': '① 热力学可行性 (ΔG)', 'st': 'warn' if y > NOCM_Y_THR else 'pass',
                    'd': '2CH₄→C₂H₆+H₂，ΔG°≈+68 kJ/mol（无O₂上坡，须 hν>|ΔG|，效率受限）'})
    elif mech == 'OCM':
        out.append({'k': 'thermo', 'name': '① 热力学可行性 (ΔG)', 'st': 'pass',
                    'd': '有O₂，ΔG<0；但 CO₂ 深度氧化在热力学上更有利，须控选择性'})
    elif mech == 'MPO':
        out.append({'k': 'thermo', 'name': '① 热力学可行性 (ΔG)', 'st': 'pass',
                    'd': '甲烷部分光氧化（CH₄→含氧产物），O₂ 参与，ΔG<0'})
    else:
        out.append({'k': 'thermo', 'name': '① 热力学可行性 (ΔG)', 'st': 'warn', 'd': '机理未明确，热力学边界未知'})

    # ②
    ox_ok = vb >= E_ox
    red_ok = cb <= E_red
    st = 'pass'
    d = f'VB≈{vb:.2f} V, CB≈{cb:.2f} V {lab}。需 VB≥{E_ox} V(空穴氧化CH₄)、CB≤{E_red} V(电子还原)'
    if not ox_ok and not red_ok:
        st = 'fail'
    elif not ox_ok or not red_ok:
        st = 'warn'
    if mech == 'NOCM' and not red_ok:
        st = 'fail'
        d += f'；NOCM 依赖电子还原但 CB({cb:.2f})>{E_red} V，还原驱动力不足'
    elif not ox_ok:
        d += f'；VB({vb:.2f})<{E_ox} V，空穴难以氧化 CH₄'
    out.append({'k': 'bandedge', 'name': '② 能带–红氧势对齐', 'st': st, 'd': d})

    # ③
    st = 'pass'
    d = f'Eg={bg:.2f} eV {lab}，氙灯 λ≥200 nm (hν≤6.2 eV) 可激发'
    if bg > BG_PH_HI:
        st = 'warn'
        d = f'Eg={bg:.2f} eV 宽禁带，仅 UV 响应，可见光利用率低'
    elif bg < BG_PH_LO:
        st = 'warn'
        d = f'Eg={bg:.2f} eV 过窄，红氧驱动力不足且易腐蚀'
    out.append({'k': 'photon', 'name': '③ 光子能量 / 光吸收', 'st': st, 'd': d})

    # ④
    if ad is None:
        out.append({'k': 'sab', 'name': '④ Sabatier 吸附窗口', 'st': 'warn', 'd': '缺少 CH₄ 吸附能数据'})
    elif ad > AD_HI:
        out.append({'k': 'sab', 'name': '④ Sabatier 吸附窗口', 'st': 'fail', 'd': f'E_ads={ad} eV 过弱，C–H 难以活化'})
    elif ad < AD_LO:
        out.append({'k': 'sab', 'name': '④ Sabatier 吸附窗口', 'st': 'warn', 'd': f'E_ads={ad} eV 过强，位点易中毒'})
    else:
        out.append({'k': 'sab', 'name': '④ Sabatier 吸附窗口', 'st': 'pass', 'd': f'E_ads={ad} eV 落最优窗口 (-0.3~-1.3)'})

    # ⑤
    if oox is None:
        out.append({'k': 'ox', 'name': '⑤ 过度氧化上限', 'st': 'warn', 'd': '缺少过度氧化风险数据'})
    elif oox > OOX_THR:
        s_val = r.get('s')
        st = 'warn' if s_val is None or s_val > S_SEL_THR else 'pass'
        out.append({'k': 'ox', 'name': '⑤ 过度氧化上限', 'st': st, 'd': f'过度氧化风险 {oox:.2f}，C₂ 选择性受 COₓ 竞争约束'})
    else:
        out.append({'k': 'ox', 'name': '⑤ 过度氧化上限', 'st': 'pass', 'd': f'过度氧化风险 {oox:.2f}（较低）'})

    # ⑥
    if r.get('photo') is True:
        out.append({'k': 'pt', 'name': '⑥ 光热区分', 'st': 'warn', 'd': '文献标注显著光热贡献，纯光子效率可能被高估'})
    elif r.get('photo') is False:
        out.append({'k': 'pt', 'name': '⑥ 光热区分', 'st': 'pass', 'd': '已区分光/热贡献'})
    else:
        out.append({'k': 'pt', 'name': '⑥ 光热区分', 'st': 'warn', 'd': '未明确光热贡献，建议核对'})

    # ⑦
    st = 'pass'
    d = 'C/H/O 守恒；'
    if mech == 'NOCM' and o2_ratio > 0:
        st = 'fail'
        d = 'NOCM 必须无 O₂，但检测到 O₂ 进料 → 模式矛盾'
    elif mech in ('OCM', 'MPO') and o2_ratio == 0:
        st = 'fail'
        d = f'{mech} 需要 O₂ 参与，但 O₂/CH₄=0 → 无法供氧'
    else:
        d += f'O₂/CH₄={o2_ratio:.2f}，符合 {mech} 计量需求'
    out.append({'k': 'stoich', 'name': '⑦ 化学计量 / 原子守恒', 'st': st, 'd': d})

    # ⑧
    st = 'pass'
    d = f'反应温度 ≈{temp_c}℃；升温加快速率(Arrhenius)，但受烧结/积碳上限约束'
    if temp_c > T_FAIL:
        st = 'fail'
        d = f'{temp_c}℃ 超过多数氧化物烧结/积碳极限 (>{T_FAIL:.0f}℃)'
    elif temp_c > T_WARN:
        st = 'warn'
        d = f'{temp_c}℃ 偏高，存在烧结/活性相转变风险'
    elif temp_c < T_LO:
        st = 'warn'
        d = f'{temp_c}℃ 偏低，本征速率受 Arrhenius 抑制'
    out.append({'k': 'arr', 'name': '⑧ 阿伦尼乌斯温度窗口', 'st': st, 'd': d})

    # ⑨
    shift = 0.059 * math.log10(max(o2_ratio, 0.01))
    E_red_eff = E_red - shift
    st = 'pass'
    d = f'能斯特偏移 ≈ {shift:.3f} V；O₂ 压力升高使有效还原势移至 {E_red_eff:.2f} V'
    if cb > E_red_eff + 0.1:
        st = 'warn'
        d = f'低压 O₂ 下 CB({cb:.2f}) 仍高于有效还原势 {E_red_eff:.2f} V，还原驱动力不足'
    out.append({'k': 'nernst', 'name': '⑨ 能斯特 / 氧化还原势', 'st': st, 'd': d})

    # ⑩
    th_o2 = o2_ratio / (1 + o2_ratio)
    th_ch4 = LANG_TH_CH4
    st = 'pass'
    d = f'Langmuir 覆盖度 θ_O₂≈{th_o2:.2f}，θ_CH₄≈{th_ch4:.2f}（适中，位点可用）'
    if o2_ratio > 0 and (th_o2 > 0.95 or th_o2 < 0.05):
        st = 'warn'
        d = f'θ_O₂={th_o2:.2f} 偏离最优（过饱和堵塞 / 过低欠吸附）'
    if th_ch4 > 0.95:
        st = 'warn'
    out.append({'k': 'lang', 'name': '⑩ 朗缪尔吸附 / 表面覆盖', 'st': st, 'd': d})

    # ⑪
    st = 'pass'
    d = '提高 CH₄ 分压 / 贫 O₂ 有利于平衡向 C₂ 移动'
    if mech == 'OCM' and o2_ratio > 0.8:
        st = 'warn'
        d = f'O₂/CH₄={o2_ratio:.2f} 偏高，平衡偏向 CO₂（深度氧化）'
    elif mech == 'OCM' and o2_ratio < 0.1:
        st = 'warn'
        d = 'O₂ 过低，氧化偶联速率受限'
    out.append({'k': 'lech', 'name': '⑪ 勒夏特列平衡移动', 'st': st, 'd': d})

    # ⑫
    st = 'pass'
    d = '反应物扩散速率 ≥ 表面反应速率（有效性因子 η≈1）'
    if y > MT_Y_THR:
        st = 'warn'
        d = f'表观产率 {y:.0f} 极高，需确认未被外扩散（质量传递）限制'
    out.append({'k': 'mt', 'name': '⑫ 质量传递限制', 'st': st, 'd': d})

    # ⑬
    aqy = y / QY_YREF
    st = 'pass'
    d = f'表观量子产率代理 ≈ {aqy:.3f}（≤1 合理）'
    if aqy > QY_MAX:
        st = 'fail'
        d = f'表观量子产率 ≈ {aqy:.2f} > 1，违反 Φ≤1 上限（数据/标定异常）'
    elif aqy > QY_WARN:
        st = 'warn'
        d = f'表观量子产率 ≈ {aqy:.2f} 偏高，接近理论上限'
    out.append({'k': 'qy', 'name': '⑬ 量子产率上限 (Φ≤1)', 'st': st, 'd': d})

    # ⑭
    if mech == 'NOCM':
        st = 'warn'
        d = '2CH₄→C₂H₆+H₂，Δn_gas≈0（ΔS 小），ΔG>0 上坡，需光子供能且效率受限'
    else:
        st = 'pass'
        d = 'OCM 放热（ΔH<0），低温有利；本征平衡受熵项小幅影响'
    out.append({'k': 'hen', 'name': '⑭ 反应焓 / 熵权衡', 'st': st, 'd': d})

    # ⑮
    st = 'pass'
    d = '操作条件在稳定性窗口内'
    if temp_c > STAB_T_WARN:
        st = 'warn'
    if oox < STAB_OOX_THR and mech != 'NOCM' and temp_c > STAB_T_THR:
        st = 'warn'
    if temp_c > STAB_T_WARN:
        d = f'{temp_c}℃ 接近烧结/相变临界，长期稳定性存疑'
    elif st == 'warn':
        d = '低过度氧化 + 高温富 CH₄，积碳风险升高'
    out.append({'k': 'stab', 'name': '⑮ 催化剂稳定性（烧结/积碳）', 'st': st, 'd': d})

    # ⑯
    alpha = 1 / (bg + 0.5)
    st = 'pass'
    d = f'吸收系数代理 α≈{alpha:.2f}；催化剂层需保证光穿透至活性位点'
    if bg > BL_BG_HI:
        st = 'warn'
        d = f'Eg={bg:.2f} eV 吸收弱（UV-only），厚层内部光照不足，需薄膜/散射'
    out.append({'k': 'bl', 'name': '⑯ 比尔–朗伯光穿透', 'st': st, 'd': d})

    # ⑰
    st = 'pass'
    d = '载流子分离充分（异质结/Z-方案/助催化剂）'
    if bg < REC_BG_LO and cb > REC_CB_THR:
        st = 'warn'
        d = '窄带隙且 CB 偏正，e⁻/h⁺ 复合加剧，需电荷分离工程'
    out.append({'k': 'rec', 'name': '⑰ 电子–空穴复合', 'st': st, 'd': d})

    # ⑱
    if mech == 'OCM':
        st = 'warn'
        d = 'O₂ 为三重态，单重态光生空穴直接活化 O₂ 自旋禁阻；需表面自旋态/共催化剂破禁'
    else:
        st = 'pass'
        d = 'NOCM 无需直接活化 O₂，自旋选律限制较小'
    out.append({'k': 'spin', 'name': '⑱ 光化学选律 / 自旋守恒', 'st': st, 'd': d, 'cat': '动力学与传质'})

    # ⑲
    e = P['eovf']
    st = 'pass'
    d = f'E_ovf≈{e:.2f} eV{'' if not P['hasOv'] else '（文献提及氧空位/Ov/缺陷）'}；窗口 0.8–2.0 eV 最佳'
    if e < OVF_LO:
        st = 'warn'
        d += '；过低→位点不稳/易复合或溶出'
    elif e > OVF_HI:
        st = 'warn'
        d += '；过高→难以形成，活性位点稀少'
    elif P['hasOv']:
        d += '；易形成且稳定，活性位点充足'
    out.append({'k': 'ovf', 'name': '⑲ 氧空位形成能窗口', 'st': st, 'd': d, 'cat': '稳定性'})

    # ⑳
    phi_b = P['phiB']
    st = 'pass'
    d = f'金属功函数 Φ≈{P['wf']:.2f} eV，载体 χ≈{P['chi']:.1f} eV → φ_B≈{phi_b:.2f} eV'
    if r.get('metals'):
        if phi_b < SCHOTTKY_PHI_LO:
            st = 'warn'
            d += '；势垒过低→近欧姆接触，电荷分离弱'
    else:
        d += '；无助催化剂金属，依赖本体/异质结分离'
    out.append({'k': 'schottky', 'name': '⑳ 肖特基势垒 / 金属–半导体结', 'st': st, 'd': d, 'cat': '能带与载流子'})

    # ㉑
    Ld = P['Ld']
    dd = P['d']
    st = 'pass'
    ds = f'L_D≈{Ld:.0f} nm，粒径 d≈{dd:.0f} nm'
    if Ld < dd * LD_FAIL:
        st = 'fail'
        ds += '；L_D < d/4，体相复合主导，光子浪费'
    elif Ld < dd * LD_WARN:
        st = 'warn'
        ds += '；L_D < d/2，部分载流子未达表面即复合'
    else:
        ds += '；L_D ≥ d/2，多数载流子可抵达表面活性位'
    out.append({'k': 'ld', 'name': '㉑ 载流子扩散长度 vs 粒径', 'st': st, 'd': ds, 'cat': '能带与载流子'})

    # ㉒
    tau_s = P['tau'] * 1e-9
    ttr = math.pow(P['d'] * 1e-7 / 2, 2) / P['D']
    st = 'pass'
    ds = f'τ≈{P['tau']:.1f} ns，抵达表面 t≈{ttr*1e9:.1f} ns'
    if tau_s < ttr * TAU_FAIL:
        st = 'fail'
        ds += '；τ < t_transit，载流子未达表面即复合'
    elif tau_s < ttr * TAU_WARN:
        st = 'warn'
        ds += '；τ 接近 t_transit，分离裕度小'
    else:
        ds += '；τ 充裕，分离驱动足够'
    out.append({'k': 'tau', 'name': '㉒ 载流子寿命 vs 抵达表面时间', 'st': st, 'd': ds, 'cat': '能带与载流子'})

    # ㉓
    kT = 8.617e-5 * (temp_c + 273.15) * 1000
    Eb = P['Eb']
    st = 'pass'
    ds = f'E_b≈{Eb} meV vs kT≈{kT:.0f} meV (@{temp_c}℃)'
    if Eb > EB_RATIO * kT:
        st = 'warn'
        ds += '；E_b ≫ kT，中性激子难热解离，需异质结/等离激元'
    else:
        ds += '；E_b 量级接近 kT，光生载流子易分离'
    out.append({'k': 'eb', 'name': '㉓ 激子结合能 vs kT', 'st': st, 'd': ds, 'cat': '能带与载流子'})

    # ㉔
    ND = 1e17
    eps = 9 * 8.854e-14
    Vbi = max(MS_VBI_FLOOR, bg * MS_VBI_F)
    W = math.sqrt(2 * eps * Vbi / (1.602e-19 * ND)) * 1e7
    st = 'pass'
    ds = f'假设 N_D≈1e17 cm⁻³，耗尽宽度 W≈{W:.0f} nm（vs d≈{P['d']:.0f} nm）'
    if W < P['d'] * MS_W_RATIO:
        st = 'warn'
        ds += '；W < d/2，空间电荷区未达表面，分离弱'
    else:
        ds += '；耗尽层贯穿至表面，内建电场有效分离载流子'
    out.append({'k': 'ms', 'name': '㉔ 平带电势 / 空间电荷层 (Mott–Schottky)', 'st': st, 'd': ds, 'cat': '能带与载流子'})

    # ㉕
    kie = P['kie']
    st = 'pass'
    ds = f'KIE≈{kie:.1f}（C–H 活化若为 RDS，预期 2–7）'
    if mech in ('OCM', 'NOCM') and kie < KIE_LO:
        st = 'warn'
        ds += '；KIE<1.5 与“C–H 活化是决速步”不符，机理存疑'
    elif KIE_LO <= kie < KIE_HI:
        ds += '；与 C–H 断裂为 RDS 一致（可用 ¹³CH₄/CD₄ 同位素示踪验证）'
    elif kie >= KIE_HI:
        st = 'warn'
        ds += '；KIE 偏高，可能存在强隧穿/二级同位素效应'
    out.append({'k': 'kie', 'name': '㉕ 动力学同位素效应 KIE', 'st': st, 'd': ds, 'cat': '动力学与传质'})

    # ㉖
    s_val = r.get('s')
    st = 'pass'
    ds = ''
    if s_val is None:
        st = 'warn'
        ds = '缺少选择性数据，无法判定 C2/COx 分支'
    elif s_val >= BRANCH_HI:
        ds = f'真实选择性 s={s_val}% ≥{BRANCH_HI:.0f}%，C2 产物分支占优'
    elif s_val >= BRANCH_LO:
        st = 'warn'
        ds = f's={s_val}% 在 {BRANCH_LO:.0f}–{BRANCH_HI:.0f}%，COx 竞争明显'
    else:
        st = 'fail'
        ds = f's={s_val}% <60%，过度氧化/COx 分支占主导'
    out.append({'k': 'branch', 'name': '㉖ 分支选择性 C2 vs COx', 'st': st, 'd': ds, 'cat': '动力学与传质'})

    # ㉗
    I = P['I']
    Isat = P['Isat']
    st = 'pass'
    ds = f'光强 I≈{I:.0f} mW/cm²，饱和阈值 ≈{Isat:.0f} mW/cm²'
    if I > Isat:
        st = 'warn'
        ds += '；I > I_sat，双分子 e⁻–h⁺ 复合加剧，速率饱和'
    elif I < FLUX_I_LO:
        st = 'warn'
        ds += '；光强偏低，光子通量受限'
    else:
        ds += '；工作在线性区，速率 ∝ 光子通量'
    out.append({'k': 'flux', 'name': '㉗ 光子通量 线性 / 饱和区', 'st': st, 'd': ds, 'cat': '动力学与传质'})

    # ㉘
    st = 'pass'
    ds = ''
    if P['pore'] is None:
        ds = '非多孔/块体，外扩散主导'
    elif P['pore'] < KNUD_PORE:
        st = 'warn' if y > KNUD_Y_THR else 'pass'
        ds = f'孔径≈{P['pore']:.0f} nm < 平均自由程(~{KNUD_PORE:.0f} nm)，Knudsen 扩散；{('高活性下孔道内传质受限' if y > KNUD_Y_THR else '传质可接受')}'
    else:
        ds = f'孔径≈{P['pore']:.0f} nm，分子扩散区'
    out.append({'k': 'knud', 'name': '㉘ 孔道 Knudsen 扩散', 'st': st, 'd': ds, 'cat': '动力学与传质'})

    # ㉙
    st = 'pass'
    ds = f'载体 {r.get('support_raw') or r.get('support')}：{P['photoStab']}'
    if re.search(r'cds', str(r.get('support') or ''), re.I) and mech in ('OCM', 'MPO'):
        st = 'warn'
        ds += '；光照+氧化条件易光腐蚀，需包覆/牺牲剂保护'
    elif re.search(r'wo3', str(r.get('support') or ''), re.I) and mech == 'NOCM':
        st = 'warn'
        ds += '；WO3 在还原电位下不稳定'
    out.append({'k': 'pour', 'name': '㉙ 电位–pH (Pourbaix) 稳定性', 'st': st, 'd': ds, 'cat': '稳定性'})

    # ㉚
    kT_eV = 8.617e-5 * (temp_c + 273.15)
    ratio = P['ea'] / kT_eV
    st = 'pass'
    ds = f'E_a≈{P['ea']:.2f} eV，E_a/kT≈{ratio:.0f}（@{temp_c}℃）'
    if ratio > EA_RATIO_HI:
        st = 'warn'
        ds += '；E_a/kT >40，本征动力学受抑制（需光/热助驱动）'
    elif ratio < EA_RATIO_LO:
        st = 'warn'
        ds += '；E_a/kT 过小，反应过快但可能牺牲选择性'
    else:
        ds += '；E_a/kT 处于合理区间'
    out.append({'k': 'ea', 'name': '㉚ 活化能 vs kT (E_a/kT)', 'st': st, 'd': ds, 'cat': '动力学与传质'})

    # ㉛
    eov = r['eov']
    st = 'pass'
    d = f"EOV≈{eov:.2f} eV；甲烷 C–H 活化需适度不稳定晶格氧：EOV 过低(<{EOV_WIN_LO:.1f})→氧过活泼过度氧化，过高(>{EOV_WIN_HI:.1f})→氧太稳难活化 CH₄（火山峰≈2–4 eV）"
    if eov < EOV_WIN_LO:
        st = 'warn'
        d += '；EOV 偏低，活性氧过活泼，COₓ 竞争风险升高'
    elif eov > EOV_WIN_HI:
        st = 'warn'
        d += '；EOV 偏高，晶格氧惰性，CH₄ 活化驱动力不足'
    else:
        d += '；落在活化火山最优窗口'
    out.append({'k': 'eovv', 'name': '㉛ 氧空位形成能 EOV（活化火山）', 'st': st, 'd': d})

    # ㉜
    dc = r['dcht3']
    st = 'pass'
    d = f'ΔE*CH₃≈{dc:.2f} eV；C–C 偶联需·CH₃ 在活性位足够稳定：ΔE*CH₃ 越大选择性越高，但过大(>{DCH3_WARN:.1f})位点易中毒'
    if dc < DCH3_FAIL:
        st = 'fail'
        d += '；ΔE*CH₃ 过小，·CH₃ 易脱附/过度氧化，C₂ 选择性差'
    elif dc > DCH3_WARN:
        st = 'warn'
        d += '；ΔE*CH₃ 过大，位点强吸附易积碳中毒'
    else:
        d += '；落在选择性有利区间'
    out.append({'k': 'dcht3', 'name': '㉜ 甲基吸附能差 ΔE*CH₃（选择性火山）', 'st': st, 'd': d})

    # ㉝
    eov_score = 1 - min(1, abs(eov - EOV_VERTEX) / VOLCANO_EOV_SPREAD)
    dc_score = min(1, dc / VOLCANO_DC_N)
    vol = eov_score * dc_score
    st = 'pass'
    d = f'双描述符火山高度代理≈{vol:.2f}（顶点 EOV≈{EOV_VERTEX:.1f} & ΔE*CH₃≥{VOLCANO_DC_N:.1f}；二者协同越优）'
    if vol < VOLCANO_LO:
        st = 'warn'
        d += '；远离火山顶点，本征活性/选择性受限'
    elif vol >= VOLCANO_HI:
        d += '；逼近火山顶点，高活性+高选择性潜力'
    out.append({'k': 'volcano', 'name': '㉝ EOV–ΔE*CH₃ 双描述符火山', 'st': st, 'd': d})

    return out


def physics_factor(r: dict) -> float:
    if r.get('reaction') == 'OER':
        return oer_phys_factor(r)
    C = compute_constraints(r)
    f = 1.0
    for c in C:
        if c['st'] == 'fail':
            f *= LAWS["PHYS_FACTOR_FAIL"]
        elif c['st'] == 'warn':
            f *= LAWS["PHYS_FACTOR_WARN"]
    return max(LAWS["PHYS_FACTOR_LO"], min(LAWS["PHYS_FACTOR_HI"], f))


# ============================================================
# OER（电催化产 H₂O₂ / O₂）反应轨道 —— 与前端 v16 oerDerived/predictOER 对齐
# 描述符驱动：doh = ΔG(*OH)；标度 ΔG*O = doh + 1.5，ΔG*OOH = doh + 3.2
# 过电位 η = max(0, max(四步自由能) − 1.23)；H₂O₂ 选择性高斯峰 @ ΔG*OOH≈3.5 eV
# 注：候选池为标度关系理论构造，待 DFT(合适泛函) 与实验校准。
# ============================================================
OER_U0 = LAWS["OER_U0"]                 # 标准可逆电位 (V)
OER_SCALE_DOO = LAWS["OER_SCALE_DOO"]   # ΔG(*O) − ΔG(*OH)
OER_SCALE_DOOH = LAWS["OER_SCALE_DOOH"] # ΔG(*OOH) − ΔG(*OH)（经验标度）
OER_SEL_PEAK = LAWS["OER_SEL_PEAK"]     # H₂O₂ 选择性峰值 ΔG*OOH (eV)
OER_SEL_W = LAWS["OER_SEL_W"]           # 选择性高斯宽度 (eV)


def oer_derived(r: dict) -> dict:
    doh = float(r.get('doh') if r.get('doh') is not None else 1.2)
    dO = doh + OER_SCALE_DOO
    dOOH = doh + OER_SCALE_DOOH
    steps = [doh, dO - doh, dOOH - dO, OER_U0 - dOOH]
    eta_desc = max(0.0, max(steps) - OER_U0)   # 标度关系理论过电位（对所有候选近乎相同）
    # 真实/文献校准过电位：打破 *OOH−*OH 标度关系下限，还原各材料活性差异。
    # 缺失时回退到标度 descriptor（仍会退化到 η≈0.47 V），用于纯理论演示。
    eta_r = r.get('eta_real')
    if eta_r is None or eta_r == '':
        eta, eta_source = eta_desc, 'scaling'
    else:
        eta, eta_source = float(eta_r), 'calibrated'
    sel = math.exp(-((dOOH - OER_SEL_PEAK) ** 2) / (2 * OER_SEL_W * OER_SEL_W))
    sel = max(0.0, min(0.95, sel))
    activity = 1000.0 / (eta + 0.10)
    stability = r.get('stability') if r.get('stability') is not None else 0.8
    return {'doh': doh, 'dO': dO, 'dOOH': dOOH, 'steps': steps,
            'eta': eta, 'eta_desc': eta_desc, 'eta_source': eta_source,
            'sel': sel, 'activity': activity, 'stability': stability}


def oer_reward(d: dict, target: str = "cat") -> float:
    """MOF 应用采集分（未归一化，保留给排序用；跨轨道比较请用 oer_reward_norm）。
    目标语义：'cat'(催化) → 取 d.sel（活性优先）；'sep'(吸附分离) → 取 (1−sel)（容量优先）；兼容历史 'H2O2'/'O2'。"""
    sel_w = d['sel'] if target in ("H2O2", "cat") else (1.0 - d['sel'])
    return d['activity'] * sel_w * (0.5 + 0.5 * d['stability'])


def oer_reward_norm(d: dict, target: str = "cat", reuse: int = 0) -> dict:
    """
    OER 归一化多目标奖励 ∈ [0,1]，与 CH4 轨道 rl_reward 同量纲，便于跨轨道比较与统一 RL。

    分项：
      活性 â   = 由过电位 η 映射（η 越低越好；理论下限 0.37 V，2.0 V 视为无效）
      选择性 ŝ = 目标产物选择性
      稳定性 ŝt= 结构稳定性 × 复用衰减
      能耗 Ê   = 由过电位换算（η 直接对应额外电能消耗）
    """
    eta = float(d.get('eta', 1.0))
    # 活性：η∈[0.2, 1.2] 线性映射到 [1, 0]（0.37 V 为标度关系理论下限）
    n_act = _clamp((1.2 - eta) / (1.2 - 0.2), 0.0, 1.0)
    n_sel = _clamp(d['sel'] if target in ("H2O2", "cat") else (1.0 - d['sel']), 0.0, 1.0)
    decay = 1.0 - (1.0 - 0.04) ** max(0, int(reuse))
    n_stab = _clamp(float(d.get('stability', 0.8)) * (1.0 - decay), 0.0, 1.0)
    # 能耗：过电位即额外电压开销，η=0 最省、η≥1.0 最耗
    n_energy = _clamp(1.0 - eta / 1.0, 0.0, 1.0)

    W = REWARD_WEIGHTS
    # OER 无 COx 通道 → 该权重并入活性（保持权重和为 1）
    w_act = W['yield'] + W['cox']
    reward = (w_act * n_act + W['selectivity'] * n_sel +
              W['stability'] * n_stab + W['energy'] * n_energy)
    return {
        'reward': _clamp(reward, 0.0, 1.0),
        'terms': {'activity': n_act, 'selectivity': n_sel,
                  'stability': n_stab, 'energy': n_energy},
        'contrib': {'activity': w_act * n_act,
                    'selectivity': W['selectivity'] * n_sel,
                    'stability': W['stability'] * n_stab,
                    'energy': W['energy'] * n_energy},
        'weights': {'activity': w_act, 'selectivity': W['selectivity'],
                    'stability': W['stability'], 'energy': W['energy']},
        'raw': {'eta': eta, 'sel': d['sel'], 'stability': d.get('stability'), 'reuse': reuse},
    }


def oer_predict(r: dict, oer_target: str = "cat") -> dict:
    d = oer_derived(r)
    unc = d['activity'] * 0.15   # 理论构造池：固定 15% 不确定度（待实验校准）
    score = oer_reward(d, oer_target)
    return {'pred': d['activity'], 'unc': unc, 'eta': d['eta'],
            'selH2O2': d['sel'], 'score': score,
            'stability': d['stability'], 'transfer': None}


def oer_optimal_conditions(cat: dict) -> dict:
    # OER 操作条件极简：室温 + 施加电位 V（~1.23–2.0 V vs RHE）。
    # T/R/I/G 仅占位（电化学体系），V 为关键变量。
    return {
        'T_opt': 25.0, 'R_opt': 0.0, 'I_opt': 0.0, 'G_opt': 0.0, 'V_opt': 1.6,
        'W_T': 5.0, 'W_R': 0.1, 'W_I': 1.0, 'W_G': 1.0, 'W_V': 0.5,
        'T_min': 10.0, 'T_max': 60.0,
        'R_min': 0.0, 'R_max': 1.0,
        'I_min': 0.0, 'I_max': 50.0,
        'G_min': 0.0, 'G_max': 1.0,
        'V_min': 1.23, 'V_max': 2.0,
    }


def oer_default_conditions(cat: dict) -> dict:
    return {'T': 25, 'R': 0, 'I': 0, 'G': 0, 'V': 1.6}


def simulate_oer(cat: dict, cond: dict, reuse: int = 0, noise: float | None = None,
                 oer_target: str = "cat") -> dict:
    d = oer_derived(cat)
    f_stab = (1.0 - 0.04) ** max(0, int(reuse))   # 复用衰减（与甲烷同源逻辑）
    Y = d['activity'] * f_stab
    if noise is not None:
        Y = Y * (1.0 + (random.random() * 2 - 1) * noise)
    s_eff = d['sel'] * 100.0
    rw = oer_reward_norm(d, oer_target, reuse=reuse)   # v20：归一化，与 CH4 轨道同量纲
    return {
        'Y': Y, 'Y0': d['activity'] * f_stab,
        's_eff': s_eff, 'factors': {'activity': d['activity'], 'sel': d['sel'], 'stab': f_stab},
        'reward': rw['reward'], 'reward_breakdown': rw, 'opt': None,
        'cond': (cond or {'T': 25, 'V': 1.6}),
        'y_lit': None, 's_lit': s_eff, 'oer': True,
    }


def compute_oer_constraints(r: dict) -> list[dict]:
    d = oer_derived(r)
    target = r.get('oer_target') or 'cat'
    eta_eff = d['eta']; eta_desc = d['eta_desc']; eta_cal = d.get('eta_source') == 'calibrated'
    eta_base = (f"；标度理论 η≈{eta_desc:.2f} V" if eta_cal else "")
    out = []
    out.append({'k': 'thermo', 'name': '① OER 热力学（1.23 V 基准）',
                'st': 'pass' if eta_eff < 0.4 else 'warn',
                'd': f"有效过电位 η≈{eta_eff:.2f} V（{'文献/实测校准，已打破 *OOH−*OH 标度下限' if eta_cal else '标度关系理论值，受 *OOH−*OH 标度限制'}）{eta_base}。"})
    out.append({'k': 'scale', 'name': '② 吸附能标度关系', 'st': 'pass',
                'd': f"ΔG(*OOH)−ΔG(*OH)≈3.2 eV（经验标度）；本候选 ΔG*OH={d['doh']:.2f}、ΔG*O={d['dO']:.2f}、ΔG*OOH={d['dOOH']:.2f} eV。活性维度由校准过电位还原真实差异。"})
    sel_st = 'pass' if ((d['sel'] > 0.5) if target in ('H2O2', 'cat') else (d['sel'] < 0.5)) else 'warn'
    out.append({'k': 'sel', 'name': '③ 催化/吸附选择性', 'st': sel_st,
                'd': f"目标 {target}：当前 目标选择性 ≈ {d['sel']*100:.0f}%（*OOH 结合 {d['dOOH']:.2f} eV，{('偏弱→偏催化活性' if d['dOOH'] < 3.5 else '偏强→偏吸附容量')}）。"})
    stab_st = 'pass' if d['stability'] > 0.8 else ('warn' if d['stability'] > 0.6 else 'fail')
    out.append({'k': 'stab', 'name': '④ 稳定性', 'st': stab_st,
                'd': f"结构/溶解稳定性因子 ≈ {d['stability']:.2f}（{('良好' if d['stability'] > 0.8 else '需关注溶解/衰减')}）。"})
    out.append({'k': 'lod', 'name': '⑤ 当前问题（公式未知）', 'st': 'warn',
                'd': "化学体系中很多公式是未知的：本 OER 过电位已用文献/实测值（eta_real）校准以还原真实活性差异，但选择性仍由 *OH/*O/*OOH 标度近似给出（峰值 @ ΔG*OOH≈3.5 eV），两电子路径动力学亦缺闭合解。"})
    return out


def oer_phys_factor(r: dict) -> float:
    C = compute_oer_constraints(r)
    f = 1.0
    for c in C:
        if c['st'] == 'fail':
            f *= LAWS["PHYS_FACTOR_FAIL"]
        elif c['st'] == 'warn':
            f *= LAWS["PHYS_FACTOR_WARN"]
    return max(LAWS["PHYS_FACTOR_LO"], min(LAWS["PHYS_FACTOR_HI"], f))


def pick_candidate_oer(pool=None, sampled=None, measured=None, oer_target: str = "cat",
                       strategy: str = None, iteration: int = 0, rng=None) -> dict:
    """
    OER 轨道主动学习采集：复用 acquire，但 μ 取「归一化奖励」(∈[0,1])，
    与 CH4 轨道 rl_reward 同量纲；σ 取奖励比例的 15% 不确定度。
    这样策略切换（UCB/EI/PI/TS）与多样性惩罚对 OER 同样生效。
    """
    pool = pool or OER_POOL
    sampled = sampled or set()
    strat = strategy or ACQ_STATE.get('strategy', ACQ_DEFAULT)

    def _mu(r, m):
        return oer_reward_norm(oer_derived(r), oer_target)['reward']

    def _sig(r, m):
        return oer_reward_norm(oer_derived(r), oer_target)['reward'] * 0.15

    res = acquire(pool, sampled, measured, strategy=strat, iteration=iteration,
                  diversity=True, rng=rng, topk=1, mu_fn=_mu, sig_fn=_sig)
    return res[0][1] if res else (pool[0] if pool else None)


# ============================================================
# 物理信息化反应器模型（OCM 光催化）—— 形式化 RL 的"环境"
# ============================================================
# 设计原则（可辩护、且保留已验证的审计一致性）：
#   1) 文献报道产率 y_lit 作为锚点：在每个催化剂的「最优操作条件」下，所有物理因子=1，
#      实测 = y_lit × (1±8% 噪声)，与 v17 已验证的"实测≈文献值"完全一致；
#   2) 偏离最优条件才损失产率 —— 让 AI 提议的操作条件真正影响结果，把 RL 从"重放文献"
#      变成"在条件空间中学习化学"；
#   3) 描述符只决定「最优条件位置」与「锚点 y_lit」，不在因子里二次惩罚（避免双计、破坏一致性）；
#   4) 选择性经同一过度氧化物理与产率耦合（真实 OCM 转化率–选择性权衡）。
# LOD 由 data.LAWS["LOD"] 注入（见顶部 import）；与前端 EXP.LOD / routes.LOD 对齐


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def optimal_conditions(cat: dict) -> dict:
    """
    按描述符 + 机理推导每个催化剂的最优操作条件与可行域。
    返回 {T_opt,R_opt,I_opt,G_opt, T_min,T_max, R_min,R_max, I_min,I_max, G_min,G_max, W_T,W_R,W_I,W_G}
    """
    if cat.get('reaction') == 'OER':
        return oer_optimal_conditions(cat)
    L = LAWS
    mech = (cat.get('mech') or 'OCM')
    eov = cat.get('eov')
    if eov is None:
        eov = eov_of(cat)
    bg = cat.get('bg') if cat.get('bg') is not None else L["DEFAULT_BG"]
    dc = cat.get('dcht3')
    if dc is None:
        dc = dcht3_of(cat)

    # —— 温度最优：OCM 热催化 ~700℃；EOV 高(惰性晶格氧)需更高温活化 ——
    base_T = {"OCM": L["OPT_T_BASE_OCM"], "MPO": L["OPT_T_BASE_MPO"], "NOCM": L["OPT_T_BASE_NOCM"]}.get(mech, L["OPT_T_BASE_OTHER"])
    T_opt = base_T + L["OPT_T_COEF"] * (eov - L["OPT_T_EOV_REF"])
    T_opt = _clamp(T_opt, L["OPT_T_CLAMP_LO"], L["OPT_T_CLAMP_HI"])
    W_T = L["OPT_W_T"]

    # —— O2:CH4 最优：EOV 低(过氧化倾向)→更贫氧避免过度氧化；EOV 高→稍富氧助活化 ——
    low_eov = max(0.0, L["OPT_R_EOV_MID"] - eov)
    high_eov = max(0.0, eov - L["C_EOV_VERTEX"])
    R_opt = L["OPT_R_BASE"] + L["OPT_R_COEF_LOW"] * low_eov + L["OPT_R_COEF_HIGH"] * high_eov
    R_opt = _clamp(R_opt, L["OPT_R_CLAMP_LO"], L["OPT_R_CLAMP_HI"])
    W_R = L["OPT_W_R"]

    # —— 光强最优：宽禁带需更强光克服带隙 ——
    I_opt = L["OPT_I_BASE"] + L["OPT_I_COEF"] * max(0.0, bg - L["DEFAULT_BG"])
    I_opt = _clamp(I_opt, L["OPT_I_CLAMP_LO"], L["OPT_I_CLAMP_HI"])
    W_I = L["OPT_W_I"]

    # —— 空速最优：*CH3 强吸附(高 dc)耦合慢→需更长停留(低 GHSV) ——
    G_opt = L["OPT_G_BASE"] + L["OPT_G_COEF"] * max(0.0, dc - L["OPT_G_DC_REF"])
    G_opt = _clamp(G_opt, L["OPT_G_CLAMP_LO"], L["OPT_G_CLAMP_HI"])
    W_G = L["OPT_W_G"]

    # 可行域：最优条件 ±1.6σ 展开并夹到物理可行域（DOM_*）
    DOM_SPAN = 1.6  # 可行域半宽（单位：各 W_*）；属建模假设，非可调物理律
    return {
        'T_opt': T_opt, 'R_opt': R_opt, 'I_opt': I_opt, 'G_opt': G_opt,
        'W_T': W_T, 'W_R': W_R, 'W_I': W_I, 'W_G': W_G,
        'T_min': max(L["DOM_T_LO"], T_opt - DOM_SPAN * W_T), 'T_max': min(L["DOM_T_HI"], T_opt + DOM_SPAN * W_T),
        'R_min': L["DOM_R_LO"], 'R_max': L["DOM_R_HI"],
        'I_min': L["DOM_I_LO"], 'I_max': L["DOM_I_HI"],
        'G_min': L["DOM_G_LO"], 'G_max': L["DOM_G_HI"],
    }


def simulate_experiment(cat: dict, cond: dict, reuse: int = 0, noise: float | None = None, oer_target: str = "cat", measured: list[dict] | None = None) -> dict:
    """
    物理信息化反应器：给定催化剂与操作条件，返回实现的 C2 产率与选择性。
    cond = {T(℃), R(O2:CH4), I(mW/cm²), G(GHSV mL·g⁻¹·h⁻¹)}
    reuse = 载体/催化剂已重复使用的轮次（稳定性衰减）。
    noise = 测量噪声幅度（None → 不叠加噪声，用于"预测"；给定值用于"实测"）。
    measured = 已实测样本（[{doi, y}, ...]），用于替代器精炼与 unmeasured 候选的先验。
    返回 {Y, s_eff, factors:{act,ox,phot,mt,stab,pt}, reward, breakdown, y_source}
    """
    if cat.get('reaction') == 'OER':
        return simulate_oer(cat, cond, reuse, noise, oer_target)
    L = LAWS
    opt = optimal_conditions(cat)
    y_lit = float(cat.get('y') or 0.0)
    y_source = 'measured' if y_lit > 0 else None
    if y_lit <= 0:
        # Bug A 修复：未实测催化剂（POOL 中约 240/380）无文献锚点产率，
        # 此前 y_lit≡0 使 simulate 恒为 0，surrogate→simulator 闭环在 unmeasured 候选上断裂。
        # 现改用 XGBoost 残差替代器(缺失则 KNN)的先验作为世界模型“真实”产率，
        # 使未实测候选也能得到非零、且随操作条件可调的产率（闭环打通）。
        try:
            pr = predict(cat, measured)
            prior = float(pr.get('pred') or 0.0)
            if prior > 0:
                y_lit = prior
                y_source = pr.get('model') or 'knn'
        except Exception:
            pass
    s_lit = cat.get('s')
    if s_lit is None:
        s_lit = L["DEFAULT_S"]
    eov = cat.get('eov')
    if eov is None:
        eov = eov_of(cat)
    bg = cat.get('bg') if cat.get('bg') is not None else L["DEFAULT_BG"]

    T = float(cond.get('T', opt['T_opt']))
    R = float(cond.get('R', opt['R_opt']))
    I = float(cond.get('I', opt['I_opt']))
    G = float(cond.get('G', opt['G_opt']))

    # ① 活性高斯最优（温度）——偏离最优温度活性下降
    f_act = math.exp(-((T - opt['T_opt']) / opt['W_T']) ** 2)

    # ② 过度氧化 / 选择性因子 —— O2 过量 + 过氧化倾向(eov 低) → COx 竞争；O2 不足 → 转化差
    eov_v = L["C_EOV_VERTEX"]
    oxy_tend = _clamp((eov_v - eov) / eov_v, 0.0, 1.0)        # eov 低 → 易过氧化
    excess = max(0.0, R - opt['R_opt'])
    deficit = max(0.0, opt['R_opt'] - R)
    f_ox_sel = math.exp(-L["F_OX_SEL_K"] * excess * (L["F_OX_OXY_W"] + oxy_tend))  # 过度氧化(损伤选择性)
    f_ox_conv = math.exp(-L["F_OX_CONV_K"] * deficit)                  # 缺 O2(损伤转化)
    f_ox = f_ox_sel * f_ox_conv

    # ②b 光热热点：强光 + 过氧化倾向催化剂 → 局部热点 → 过度氧化
    f_pt = math.exp(-L["F_PT_K"] * max(0.0, I - L["OPT_I_PT_REF"]) * oxy_tend)

    # ③ 光子饱和 + 吸收（Michaelis–Menten 型）—— 强光饱和、弱光不足、宽禁带吸收差
    absor = _clamp(L["F_PHOT_ABS_A"] - L["F_PHOT_ABS_B"] * (bg - L["F_PHOT_ABS_BASE"]), 0.3, 1.0)
    phi = (I / (I + L["SIM_I_KM"])) * absor
    phi_opt = (opt['I_opt'] / (opt['I_opt'] + L["SIM_I_KM"])) * absor
    f_phot = _clamp(phi / phi_opt, 0.0, 1.0)

    # ④ 传质 / 空速高斯最优 —— 高 GHSV 停留短 → 转化受限
    f_mt = math.exp(-((G - opt['G_opt']) / opt['W_G']) ** 2)

    # ⑤ 稳定性 / 复用衰减 —— 每轮轻度失活（与 supportReuse 计数一致）
    delta = L["F_STAB_DELTA"]
    f_stab = (1.0 - delta) ** max(0, int(reuse))

    factors = {'act': f_act, 'ox': f_ox, 'phot': f_phot, 'mt': f_mt, 'stab': f_stab, 'pt': f_pt}
    Y = y_lit * f_act * f_ox * f_phot * f_mt * f_stab

    # 选择性：经同一过度氧化物理耦合（真实 OCM 权衡）——过量 O2 / 光热热点 拉低 C2 选择性
    s_eff = s_lit * f_ox_sel * f_pt
    s_eff = _clamp(s_eff, 0.0, 100.0)

    # 归一化多目标奖励（详见 rl_reward）
    rw = rl_reward(Y, s_eff, {'T': T, 'R': R, 'I': I, 'G': G},
                   reuse=reuse, f_ox_sel=f_ox_sel, f_pt=f_pt, eov=eov)
    reward = rw['reward']

    if noise is not None:
        Y = Y * (1.0 + (random.random() * 2 - 1) * noise)
        if Y < LOD:
            Y = 0.0

    return {
        'Y': Y,
        'Y0': y_lit * f_act * f_ox * f_phot * f_mt * f_stab,  # 无噪基线（MAE 比对用）
        's_eff': s_eff,
        'factors': factors,
        'reward': reward,
        'reward_breakdown': rw,          # 分项贡献（审计/可解释性）
        'opt': opt,
        'cond': {'T': T, 'R': R, 'I': I, 'G': G},
        'y_lit': y_lit,
        'y_source': y_source,
        's_lit': s_lit,
    }


# ============================================================
# 形式化 RL 奖励（v20：多目标归一化 + 物理约束）
# ============================================================
# 设计动机（v19 旧式 `reward = Y*(s/100) - energy` 的三个致命缺陷）：
#   ① 量纲失衡：能耗项在 Y=17260 的催化剂上占比 0.0028%，在 Y=63 上却占 0.78%，
#      在 Y→0 时甚至反超主项（占比 1966%）。同一惩罚在不同催化剂间权重差 ~70 万倍，
#      "鼓励温和条件"完全失效，且低产率区奖励被能耗主导 → 病态梯度。
#   ② 动态范围爆炸：实测 reward ∈ [-0.2, 15534]，跨 10 个数量级。任何 bandit/PG
#      算法在这种尺度上都退化为"只选产率最高者"，探索项被数值淹没。
#   ③ 缺关键物理项：COx 过度氧化（OCM 核心权衡）无显式惩罚；失活速率无长期项；
#      约束违反（热力学/带边）不进奖励。
#
# v20 方案：所有分项归一化到 [0,1]，加权求和 → reward ∈ [0,1]，可直接喂给 RL。
#   - 产率用 **log 空间**归一化（y 跨 3 个数量级，线性归一化会让中低产率区全部塌缩到 0）
#   - 保留原始物理量于 breakdown，审计与可解释性不丢失
# ============================================================

# 奖励权重由 data.REWARD_WEIGHTS 注入（见顶部 import）；可通过 set_reward_weights 在线调整（和为 1 便于解释）

# log 归一化参考尺度：由 data.Y_REF_LO / Y_REF_HI 注入（≈ POOL 实测 y 的分位区间，μmol·g⁻¹·h⁻¹）


def set_reward_weights(w: dict) -> dict:
    """在线调整奖励权重（自动归一化到和为 1）。返回生效后的权重。"""
    global REWARD_WEIGHTS
    merged = dict(REWARD_WEIGHTS)
    for k, v in (w or {}).items():
        if k in merged:
            merged[k] = max(0.0, float(v))
    s = sum(merged.values()) or 1.0
    REWARD_WEIGHTS = {k: v / s for k, v in merged.items()}
    return dict(REWARD_WEIGHTS)


def _norm_yield(Y: float) -> float:
    """产率 log 归一化 → [0,1]。跨 3 个数量级时线性归一化会塌缩中低产率区。"""
    if Y is None or Y <= 0:
        return 0.0
    lo, hi = math.log(Y_REF_LO), math.log(Y_REF_HI)
    v = (math.log(max(Y, 1e-6)) - lo) / (hi - lo)
    return _clamp(v, 0.0, 1.0)


def _norm_energy(T: float, I: float) -> float:
    """能耗归一化 → [0,1]（0=最省，1=最耗）。
    OCM 典型窗口 T∈[300,900]℃、I∈[0,500] mW/cm²；两者按热/光贡献加权。
    """
    t_term = _clamp((T - LAWS["ENERGY_T_REF"]) / (LAWS["C_TEMP_FAIL"] - LAWS["ENERGY_T_REF"]), 0.0, 1.0)      # 热能
    i_term = _clamp(I / LAWS["DOM_I_HI"], 0.0, 1.0)                         # 光能
    return _clamp(0.65 * t_term + 0.35 * i_term, 0.0, 1.0)


def rl_reward(Y: float, s_eff: float, cond: dict,
              reuse: int = 0, f_ox_sel: float | None = None,
              f_pt: float | None = None, eov: float | None = None) -> dict:
    """
    多目标归一化 RL 奖励 ∈ [0,1]，返回 dict（含分项，供可解释性与调参）。

    r = w_y·ŷ + w_s·ŝ + w_stab·(1−decay) + w_e·(1−Ê) + w_cox·(1−ĈOx)

    分项定义：
      ŷ      = log 归一化产率 ∈ [0,1]
      ŝ      = s_eff/100 ∈ [0,1]
      decay  = 复用衰减损失 ∈ [0,1]（连续 n 轮后剩余活性的补）
      Ê      = 归一化能耗 ∈ [0,1]（越低越好，故取 1−Ê）
      ĈOx    = 过度氧化碳损失代理 ∈ [0,1]（由选择性亏损与光热热点推断）
    """
    T = float(cond.get('T', 700))
    I = float(cond.get('I', 100))
    W = REWARD_WEIGHTS

    # ① 产率（log 归一化）
    n_yield = _norm_yield(Y)

    # ② 选择性
    n_sel = _clamp((s_eff or 0.0) / 100.0, 0.0, 1.0)

    # ③ 稳定性：复用衰减后的剩余活性分数
    decay = 1.0 - (1.0 - 0.04) ** max(0, int(reuse))
    n_stab = _clamp(1.0 - decay, 0.0, 1.0)

    # ④ 能耗（取补，省能得高分）
    e_norm = _norm_energy(T, I)
    n_energy = 1.0 - e_norm

    # ⑤ COx 过度氧化惩罚
    #    优先用反应器给出的物理因子（f_ox_sel 选择性损伤、f_pt 光热热点）推断碳损失；
    #    缺失时退化为「1 − 选择性」作为碳损失代理。
    if f_ox_sel is not None and f_pt is not None:
        # 选择性通道的综合保留率；亏损即流向 COx
        retain = _clamp(f_ox_sel * f_pt, 0.0, 1.0)
        cox = 1.0 - retain
        # eov 低 → 本征易过氧化，加成惩罚
        if eov is not None:
            cox = _clamp(cox * (1.0 + 0.35 * _clamp((3.0 - eov) / 3.0, 0.0, 1.0)), 0.0, 1.0)
    else:
        cox = 1.0 - n_sel
    n_cox = 1.0 - _clamp(cox, 0.0, 1.0)

    reward = (W['yield'] * n_yield + W['selectivity'] * n_sel +
              W['stability'] * n_stab + W['energy'] * n_energy +
              W['cox'] * n_cox)

    return {
        'reward': _clamp(reward, 0.0, 1.0),
        'terms': {
            'yield': n_yield, 'selectivity': n_sel, 'stability': n_stab,
            'energy': n_energy, 'cox': n_cox,
        },
        'contrib': {   # 各项对总分的实际贡献（权重×归一值），便于归因
            'yield': W['yield'] * n_yield,
            'selectivity': W['selectivity'] * n_sel,
            'stability': W['stability'] * n_stab,
            'energy': W['energy'] * n_energy,
            'cox': W['cox'] * n_cox,
        },
        'weights': dict(W),
        'raw': {'Y': Y, 's_eff': s_eff, 'T': T, 'I': I, 'reuse': reuse,
                'energy_norm': e_norm, 'cox_frac': cox},
    }


def rl_reward_scalar(Y: float, s_eff: float, cond: dict, reuse: int = 0) -> float:
    """标量版奖励（向后兼容旧调用点）。"""
    return rl_reward(Y, s_eff, cond, reuse=reuse)['reward']


def default_conditions(cat: dict) -> dict:
    """返回该催化剂的最优（默认）操作条件。"""
    opt = optimal_conditions(cat)
    return {'T': opt['T_opt'], 'R': opt['R_opt'], 'I': opt['I_opt'], 'G': opt['G_opt']}


def search_theoretical_optimum(cat: dict, reuse: int = 0, measured: list[dict] | None = None) -> dict:
    """
    在可行域内执行显式「虚拟合成与表征」内循环收敛搜索。
    - OER：解析最优作为单轮虚拟收敛锚点，仍返回完整迭代轨迹
    - CH4/OCM：对 5x5x5x5 网格做多轮粗到细虚拟搜索，直到 reward 提升收敛或达到轮数上限
    返回结构含 iterations（每轮推理/验证轨迹）、converged、convergence_reason 与最终最优解，
    供前端显式展示「虚拟迭代收敛 → 真实反馈修正」双层循环。
    """
    opt = optimal_conditions(cat)
    domain = {
        'T': {'min': opt['T_min'], 'max': opt['T_max'], 'opt': opt['T_opt']},
        'R': {'min': opt['R_min'], 'max': opt['R_max'], 'opt': opt['R_opt']},
        'I': {'min': opt['I_min'], 'max': opt['I_max'], 'opt': opt['I_opt']},
        'G': {'min': opt['G_min'], 'max': opt['G_max'], 'opt': opt['G_opt']},
    }
    ruse = max(0, int(reuse or 0))
    measured = measured or []

    def _clone_domain(src):
        return {k: {'min': float(v['min']), 'max': float(v['max']), 'opt': float(v['opt'])}
                for k, v in src.items()}

    def _shrink_domain(base, center, shrink, min_span):
        out = {}
        for axis in ('T', 'R', 'I', 'G'):
            base_lo = float(base[axis]['min'])
            base_hi = float(base[axis]['max'])
            base_span = max(base_hi - base_lo, 1e-9)
            c = float(center[axis])
            half = max(base_span * shrink * 0.5, min_span[axis] * 0.5)
            lo = max(base_lo, c - half)
            hi = min(base_hi, c + half)
            if hi - lo < min_span[axis]:
                lo = max(base_lo, c - min_span[axis] / 2)
                hi = min(base_hi, lo + min_span[axis])
                if hi - lo < min_span[axis]:
                    hi = min(base_hi, c + min_span[axis] / 2)
                    lo = max(base_lo, hi - min_span[axis])
            out[axis] = {'min': lo, 'max': hi, 'opt': base[axis]['opt']}
        return out

    def _evaluate_round(round_domain):
        levels = [0, 0.25, 0.5, 0.75, 1]
        lerp = lambda lo, hi, t: lo + (hi - lo) * t
        round_best = None
        tested = 0
        for a in levels:
            for b in levels:
                for c in levels:
                    for d in levels:
                        cond = {
                            'T': lerp(round_domain['T']['min'], round_domain['T']['max'], a),
                            'R': lerp(round_domain['R']['min'], round_domain['R']['max'], b),
                            'I': lerp(round_domain['I']['min'], round_domain['I']['max'], c),
                            'G': lerp(round_domain['G']['min'], round_domain['G']['max'], d),
                        }
                        sim = simulate_experiment(cat, cond, reuse=ruse, noise=None, measured=measured)
                        tested += 1
                        if (round_best is None
                                or sim['reward'] > round_best['sim']['reward']
                                or (sim['reward'] == round_best['sim']['reward']
                                    and sim['Y'] > round_best['sim']['Y'])):
                            round_best = {'conditions': cond, 'sim': sim}
        return round_best, tested

    if cat.get('reaction') == 'OER':
        cond = oer_default_conditions(cat)
        sim = simulate_oer(cat, cond, reuse=ruse, noise=None, oer_target=cat.get('oer_target', 'cat'))
        reason = 'OER 解析最优一步收敛'
        round_info = {
            'round': 1,
            'tested': 1,
            'domain': _clone_domain(domain),
            'best_conditions': dict(cond),
            'best_reward': sim['reward'],
            'best_Y': sim['Y'],
            'best_s_eff': sim['s_eff'],
            'improvement': None,
            'converged': True,
        }
        return {
            'conditions': cond,
            'sim': sim,
            'feasible_domain': domain,
            'search': {'method': 'virtual-convergence-analytic-oer', 'tested': 1,
                       'rounds': 1, 'converged': True, 'reason': reason},
            'iterations': [round_info],
            'trace': [round_info],
            'best_trace': [round_info],
            'best': {'conditions': cond, 'sim': sim},
            'converged': True,
            'convergence_reason': reason,
            'conditions_source': 'virtual-converged-optimum',
        }

    min_span = {
        'T': max(8.0, float(opt['W_T']) * 0.25),
        'R': max(0.04, float(opt['W_R']) * 0.25),
        'I': max(15.0, float(opt['W_I']) * 0.25),
        'G': max(120.0, float(opt['W_G']) * 0.25),
    }
    shrink_schedule = [1.0, 0.55, 0.30, 0.18]
    base_domain = _clone_domain(domain)
    best = None
    iterations = []
    total_tested = 0
    previous_best_reward = None
    converged = False
    convergence_reason = ''

    for idx, shrink in enumerate(shrink_schedule, start=1):
        round_domain = base_domain if idx == 1 else _shrink_domain(base_domain, best['conditions'], shrink, min_span)
        round_best, tested = _evaluate_round(round_domain)
        total_tested += tested
        if (best is None
                or round_best['sim']['reward'] > best['sim']['reward']
                or (round_best['sim']['reward'] == best['sim']['reward']
                    and round_best['sim']['Y'] > best['sim']['Y'])):
            best = {'conditions': dict(round_best['conditions']), 'sim': dict(round_best['sim'])}
        improvement = None if previous_best_reward is None else best['sim']['reward'] - previous_best_reward
        span_state = {axis: round(round_domain[axis]['max'] - round_domain[axis]['min'], 6)
                      for axis in ('T', 'R', 'I', 'G')}
        round_record = {
            'round': idx,
            'tested': tested,
            'domain': round_domain,
            'best_conditions': dict(best['conditions']),
            'best_reward': best['sim']['reward'],
            'best_Y': best['sim']['Y'],
            'best_s_eff': best['sim']['s_eff'],
            'improvement': improvement,
            'span': span_state,
            'converged': False,
        }
        iterations.append(round_record)
        span_small = all(span_state[a] <= min_span[a] for a in span_state)
        if idx >= 2 and improvement is not None and abs(improvement) < 0.005:
            converged = True
            convergence_reason = f'连续两轮最优 reward 提升 < 0.005（第 {idx} 轮）'
            round_record['converged'] = True
            break
        if idx >= 2 and span_small:
            converged = True
            convergence_reason = f'搜索窗口已收缩到最小阈值（第 {idx} 轮）'
            round_record['converged'] = True
            break
        previous_best_reward = best['sim']['reward']

    if not converged:
        convergence_reason = f'完成 {len(iterations)} 轮虚拟搜索，取最高 reward 作为理论最优'
    if best is None:
        cond_fb = {'T': opt['T_opt'], 'R': opt['R_opt'], 'I': opt['I_opt'], 'G': opt['G_opt']}
        sim_fb = simulate_experiment(cat, cond_fb, reuse=ruse, noise=None, measured=measured)
        best = {'conditions': cond_fb, 'sim': sim_fb}

    search = {
        'method': 'virtual-convergence-5x5x5x5',
        'tested': total_tested,
        'rounds': len(iterations),
        'converged': converged,
        'reason': convergence_reason,
    }
    best_conditions = dict(best['conditions'])
    best_sim = dict(best['sim'])
    return {
        'conditions': best_conditions,
        'sim': best_sim,
        'feasible_domain': domain,
        'search': search,
        'iterations': iterations,
        'trace': iterations,
        'best_trace': iterations,
        'best': {'conditions': best_conditions, 'sim': best_sim},
        'converged': converged,
        'convergence_reason': convergence_reason,
        'conditions_source': 'virtual-converged-optimum',
    }


# ============================================================
# 预测
# ============================================================
def q_at(arr: list[float], p: float) -> float:
    if not arr:
        return 6000.0
    p = max(0.0, min(1.0, p))
    i = p * (len(arr) - 1)
    lo = math.floor(i)
    hi = math.ceil(i)
    if lo == hi:
        return arr[lo]
    return arr[lo] * (hi - i) + arr[hi] * (i - lo)


def pct_rank(arr: list[float], v: float) -> float:
    if not arr:
        return 0.5
    c = sum(1 for x in arr if x <= v)
    return c / len(arr)


def nearest_ocm(r: dict) -> dict | None:
    pool = [p for p in ALLCAT if p.get('domain') and str(p.get('domain')).startswith('OCM-ref')]
    if not pool:
        return None
    best, bd = None, 1e9
    for p in pool:
        d = dist(r, p)
        if d < bd:
            bd = d
            best = p
    return best


# ---- 实测样本记录解析 ----------------------------------------------------
# 前端对 /api/next、/api/evaluate 仅发送 {doi, y}（无 r 字段），对 /api/predict
# 发送带 partial r 的对象。这里统一解析出完整候选记录，避免 KeyError: 'r'。
_REC_BY_DOI_CACHE: dict = {}

def _rec_by_doi(doi):
    """按 doi 反查完整候选记录（优先 POOL，缺则回退 ALLCAT）。"""
    global _REC_BY_DOI_CACHE
    if not _REC_BY_DOI_CACHE:
        for r in ALLCAT:
            d = r.get('doi')
            if d and d not in _REC_BY_DOI_CACHE:
                _REC_BY_DOI_CACHE[d] = r
    return _REC_BY_DOI_CACHE.get(doi)

def _resolve_measured(m):
    """measured 条目可能是 {doi, y} 或带 r（候选记录）；统一解析出候选记录或 None。"""
    if not isinstance(m, dict):
        return None
    r = m.get('r')
    if isinstance(r, dict) and r.get('metal') is not None:
        return r
    doi = m.get('doi')
    if doi is not None:
        rec = _rec_by_doi(doi)
        if rec is not None:
            return rec
    return r if isinstance(r, dict) else None


def _knn_predict(r: dict, measured: list[dict] | None = None) -> dict:
    """纯 KNN 中位锚定预测（v19 之前的主预测器；现作 XGBoost 替代器强先验/回退）。"""
    measured = measured or []
    # 近邻池排除自身/复本
    prior_pool = [p for p in ALLCAT if p is not r and not (
        p.get('metal') == r.get('metal') and p.get('support') == r.get('support') and p.get('mech') == r.get('mech')
    )]
    ns = knn(prior_pool, r, 18)
    succ = [(it[0], it[1]) for it in ns if (it[0].get('y') or 0) > 0 and fam_of(it[0].get('domain')) == 'OCM']
    fam_y = wmedian(succ, lambda p: p['y']) if succ else None
    fam_vals = sorted([p['y'] for p, _ in succ])
    fam_std = (fam_vals[-1] - fam_vals[0]) if len(fam_vals) > 1 else ((fam_y or 6000) * 0.3)
    anchor = r['y'] if (r.get('y') or 0) > 0 else (fam_y if fam_y is not None else 6000)
    fail_frac = len([it for it in ns if (it[0].get('y') or 0) <= 0]) / len(ns) if ns else 0.5
    pred = anchor
    unc = max(fam_std * 0.5, anchor * 0.12, 300) * (1 + 1.6 * fail_frac)

    # 实验精炼（measured 仅含 {doi,y} 时按 doi 反查记录；任何异常都不影响主预测）
    if measured:
        try:
            mrecs = [rec for rec in (_resolve_measured(m) for m in measured) if rec is not None]
            if mrecs:
                ms = [it for it in knn(mrecs, r, 10) if (it[0].get('y') or 0) > 0]
                close = [it for it in ms if it[1] < 1.2]
                if close:
                    mY = wmedian(close, lambda it: it['y'])
                    vs = sorted([it[0]['y'] for it in close])
                    spread = (vs[-1] - vs[0]) or anchor * 0.1
                    w = min(0.85, len(close) / 6)
                    pred = pred * (1 - w) + mY * w
                    unc = unc * (1 - w) + spread * 0.5 * w
        except Exception:
            pass

    pf = physics_factor(r)
    if (r.get('y') or 0) > 0:
        unc_adj = max(unc, anchor * 0.08) * (1 + (1 - pf))
        return {'pred': pred, 'unc': max(unc_adj, 120), 'transfer': None}
    return {'pred': pred * pf, 'unc': max(unc * max(1, abs(pf)), 120), 'transfer': None}


# 未实测候选的 model 先验缓存：predict 在 measured 为空时结果只依赖候选特征，
# 可安全缓存（strategize 每轮对 ~380 候选各算 2 次 predict，缓存后近乎零成本）。
_PRED_CACHE: dict = {}
_PRED_CACHE_LOCK = threading.Lock()


def predict(r: dict, measured: list[dict] | None = None, oer_target: str = "cat") -> dict:
    """v19 预测入口：优先 XGBoost 残差替代器，缺失/异常时回退纯 KNN。CH4 路径；OER 走 oer_predict。

    任何异常均被捕获并降级为安全兜底值，绝不向上抛异常导致 500。
    measured 为空时命中先验缓存（结果只依赖候选特征，确定性可缓存）。
    """
    if r.get('reaction') == 'OER':
        try:
            return oer_predict(r, oer_target)
        except Exception:
            return {'pred': float(r.get('y') or 6000), 'unc': 800.0,
                    'transfer': None, 'model': 'fallback'}
    measured = measured or []
    ck = (r.get('id'), oer_target)
    if not measured:
        with _PRED_CACHE_LOCK:
            hit = _PRED_CACHE.get(ck)
        if hit is not None:
            return dict(hit)            # 防御性浅拷贝，避免调用方误改缓存
    res = None
    try:
        from .surrogate import ml_predict
        m = ml_predict(r, measured)
        if m is not None:
            res = {'pred': m['pred'], 'unc': m['unc'], 'transfer': None, 'model': 'xgb'}
    except Exception:
        pass
    if res is None:
        try:
            k = _knn_predict(r, measured)
            k['model'] = 'knn'
            res = k
        except Exception:
            # 终极兜底：保证 predict 永不抛异常
            res = {'pred': float(r.get('y') or 6000), 'unc': 800.0,
                   'transfer': None, 'model': 'fallback'}
    if not measured and res is not None:
        with _PRED_CACHE_LOCK:
            _PRED_CACHE[ck] = dict(res)   # 缓存纯先验结果，加速后续轮次
    return res


# ============================================================
# 主动学习 / 配方
# ============================================================
def recipe_mod(recipe: dict) -> float:
    m = 1.0
    f = recipe.get('furnace') or {}
    if f:
        T = float(f.get('温度', 500))
        dt = (T - 550) / 450.0
        bump = 1 - 0.22 * dt * dt
        m *= max(0.75, min(1.05, bump))
        atm = f.get('气氛', '')
        if atm in ('N₂', 'Ar'):
            m *= 1.04
        elif atm == 'O₂':
            m *= 0.94
    t = recipe.get('tube') or {}
    if t and t.get('气氛') in ('H₂', 'H₂/Ar'):
        m *= 1.03
    g = recipe.get('gasfeed') or {}
    if g and g.get('模式') == 'NOCM':
        m *= 0.97
    return max(0.7, min(1.15, m))


# ============================================================
# 主动学习采集函数族（Task #36）—— 替代旧的 unc*(0.35+pred/max_y)
# ============================================================
# 设计要点：
#   • 标准 BO 采集：UCB / EI / PI / Thompson Sampling，统一在 (μ, σ) 后验上定义；
#   • UCB 探索系数 β 退火（早期重探索、后期重利用）；EI/PI 带探索抖动 ξ；
#   • 叠加描述符空间多样性惩罚，抑制对近邻的重复采样（鼓励化学空间覆盖）；
#   • 可选成本感知（α/cost）；
#   • 策略在线可切换（ACQ_STATE），供 /api/next 与前端策略选择器使用。
ACQ_STRATEGIES = ('UCB', 'EI', 'PI', 'TS')
ACQ_DEFAULT = 'UCB'

ACQ_BETA_MIN = 0.5        # 后期利用系数
ACQ_BETA_MAX = 3.0        # 早期探索系数
ACQ_BETA_TAU = 12.0       # 退火时间常数（迭代步）
ACQ_XI = 0.01             # EI/PI 探索抖动（相对 f* 的 1%）
ACQ_DIV_LAMBDA = 0.15     # 多样性惩罚权重（接近已采样 → 扣分）
ACQ_DIV_SCALE = 1.2       # 描述符距离尺度（dist 单位）

ACQ_STATE = {'strategy': ACQ_DEFAULT, 'beta': None}   # 运行时可调


def acq_beta(iteration: int, beta_min=ACQ_BETA_MIN, beta_max=ACQ_BETA_MAX, tau=ACQ_BETA_TAU) -> float:
    """UCB 探索系数 β 退火：早期高（exploration）、后期低（exploitation）。"""
    it = max(0, int(iteration))
    return beta_min + (beta_max - beta_min) * math.exp(-it / tau)


def _zscore(mu, sig, fstar, xi):
    if sig is None or sig <= 1e-9:
        return None
    return (mu - fstar - xi) / sig


def _norm_cdf(z):
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _norm_pdf(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def acquisition_score(strategy, mu, sig, fstar, beta, xi=ACQ_XI, rng=None) -> float:
    """单点采集值 α（越大越优先）。strategy ∈ {UCB, EI, PI, TS}。"""
    s = (strategy or ACQ_DEFAULT).upper()
    if s == 'UCB':
        return (mu or 0.0) + beta * (sig or 0.0)
    if s == 'EI':
        z = _zscore(mu, sig, fstar, xi)
        if z is None:
            return 0.0
        return max(0.0, sig * (z * _norm_cdf(z) + _norm_pdf(z)))
    if s == 'PI':
        z = _zscore(mu, sig, fstar, xi)
        if z is None:
            return 0.0
        return _norm_cdf(z)
    if s == 'TS':
        r = rng or random
        return (mu or 0.0) + (sig or 0.0) * r.gauss(0.0, 1.0)
    # 未知策略 → 退化为 UCB
    return (mu or 0.0) + beta * (sig or 0.0)


def diversity_bonus(r: dict, sampled_records: list[dict],
                    lam: float = ACQ_DIV_LAMBDA, scale: float = ACQ_DIV_SCALE) -> float:
    """离已采样越远 → 加成越大；完全重复 → 减分。抑制对近邻的重复采样。"""
    if not sampled_records:
        return 0.0
    mind = min((dist(r, s) for s in sampled_records), default=10.0)
    prox = math.exp(-mind / scale)          # 近 → 1，远 → 0
    return -lam * prox                       # 接近已采样 → 扣分


def acquire(pool: list[dict], sampled, measured: list[dict] | None = None,
            strategy: str = ACQ_DEFAULT, iteration: int = 0, beta: float | None = None,
            diversity: bool = True, rng=None, cost_fn=None, topk: int = 1,
            mu_fn=None, sig_fn=None) -> list[tuple[float, dict, dict]]:
    """
    统一主动学习采集：返回 topk 个 (α, 候选, 信息) 元组，按 α 降序。

    参数：
      pool         候选列表（CH4 传 POOL，OER 传 OER_POOL）
      sampled      已采样 doi 集合 / 列表
      measured     实测样本（用于精炼预测与 f*）
      strategy     'UCB' | 'EI' | 'PI' | 'TS'
      iteration    当前迭代步（驱动 β 退火）
      beta         手动覆盖 β（None → 由 iteration 退火得到）
      diversity    是否叠加描述符多样性惩罚
      cost_fn      可选成本函数 cost(r) → α/cost（成本感知）
      mu_fn/sig_fn 可选 (r, measured) → 标量，覆盖默认 predict 的 (μ, σ)
                    例：OER 用归一化奖励作为 μ，使两轨道采集目标同量纲
    返回：list[(alpha, candidate, info)]，info 含 mu/sig/alpha/div/strategy/beta/fstar
    """
    sampled_set = set(sampled) if not isinstance(sampled, set) else sampled
    unexp = [r for r in pool if r.get('doi') not in sampled_set]
    if not unexp:
        unexp = pool[:]
    sampled_records = [r for r in pool if r.get('doi') in sampled_set]

    def _mu(r):
        if mu_fn is not None:
            return mu_fn(r, measured)
        return predict(r, measured)['pred']

    def _sig(r):
        if sig_fn is not None:
            return sig_fn(r, measured)
        return predict(r, measured)['unc']

    # f* = 已观测最佳 μ（含已采样 + 当前候选池预测上限）
    obs_mu = [(_mu(s), _sig(s)) for s in sampled_records] if sampled_records else []
    fstar = max((m for m, _ in obs_mu), default=0.0)
    beta_eff = acq_beta(iteration) if beta is None else float(beta)

    scored = []
    for r in unexp:
        mu, sig = _mu(r), _sig(r)
        alpha = acquisition_score(strategy, mu, sig, fstar, beta_eff, rng=rng)
        div = 0.0
        if diversity:
            div = diversity_bonus(r, sampled_records)
            alpha += div
        if cost_fn is not None:
            c = cost_fn(r) or 1.0
            alpha = alpha / max(0.01, c)
        info = {'mu': mu, 'sig': sig, 'alpha': alpha, 'div': div,
                'strategy': strategy, 'beta': beta_eff, 'fstar': fstar}
        scored.append((alpha, r, info))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:topk]


def pick_candidate(pool: list[dict], sampled: set[str], measured: list[dict] | None = None,
                   strategy: str = None, iteration: int = 0, rng=None) -> dict:
    """CH4 轨道主动学习采集（默认复用 ACQ_STATE 策略）。"""
    strat = strategy or ACQ_STATE.get('strategy', ACQ_DEFAULT)
    res = acquire(pool, sampled, measured, strategy=strat, iteration=iteration,
                  diversity=True, rng=rng, topk=1)
    return res[0][1] if res else (pool[0] if pool else None)


def set_acquisition(strategy: str, beta: float | None = None) -> dict:
    """在线切换采集策略（与可选 β 覆盖）。返回生效状态。"""
    s = (strategy or ACQ_DEFAULT).upper()
    if s not in ACQ_STRATEGIES:
        raise ValueError(f"未知采集策略 {strategy!r}，可选：{ACQ_STRATEGIES}")
    ACQ_STATE['strategy'] = s
    if beta is not None:
        ACQ_STATE['beta'] = float(beta)
    return get_acquisition()


def get_acquisition() -> dict:
    return {'strategy': ACQ_STATE['strategy'],
            'beta': ACQ_STATE['beta'],
            'available': list(ACQ_STRATEGIES),
            'beta_min': ACQ_BETA_MIN, 'beta_max': ACQ_BETA_MAX, 'beta_tau': ACQ_BETA_TAU}


# ============================================================
# 导出
# ============================================================
def csv_escape(s: Any) -> str:
    s = "" if s is None else str(s)
    if "," in s or '"' in s or "\n" in s or "\r" in s:
        s = s.replace('"', '""')
        return f'"{s}"'
    return s


def build_recipe_rows(recipes: list[dict]) -> dict:
    meta_cols = [
        '配方编号', '基底金属', '基底载体', '产物', '机理',
        'CH4吸附能_eV', '带隙_eV', 'EOV_eV', 'dE_CH3_eV',
        '基底预测C2', '基底选择性', '合成调制因子', '来源DOI', '是否用户配方'
    ]
    device_keys = set()
    for r in recipes:
        recipe = r.get('recipe') or {}
        device_keys.update(recipe.keys())
    device_cols = sorted(device_keys)
    rows = []
    for r in recipes:
        base = r.get('base') or {}
        recipe = r.get('recipe') or {}
        row = [
            r.get('id'), base.get('metal'), base.get('support'), base.get('product'),
            base.get('mech'), base.get('ad'), base.get('bg'), base.get('eov'),
            base.get('dcht3'), base.get('pred'), base.get('s'), r.get('recipeMod'),
            base.get('doi'), bool(r.get('userDesigned')),
        ]
        for k in device_cols:
            params = recipe.get(k) or {}
            row.append(','.join(f'{kk}={vv}' for kk, vv in params.items()))
        rows.append(row)
    return {'metaCols': meta_cols, 'deviceCols': device_cols, 'rows': rows}


def recipes_to_csv(recipes: list[dict]) -> str:
    data = build_recipe_rows(recipes)
    buf = io.StringIO()
    buf.write('\ufeff')
    writer = csv.writer(buf)
    writer.writerow(data['metaCols'] + data['deviceCols'])
    for row in data['rows']:
        writer.writerow([csv_escape(v) for v in row])
    return buf.getvalue()


def recipes_to_json(recipes: list[dict]) -> str:
    payload = {
        'meta': {
            'generatedAt': datetime.now().isoformat(),
            'count': len(recipes),
            'source': 'wm_backend v1',
            'note': 'recipeMod 是合成条件对世界模型预测/实测的示意调制因子（±15%），非精确热力学求解。',
        },
        'recipes': recipes,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)
