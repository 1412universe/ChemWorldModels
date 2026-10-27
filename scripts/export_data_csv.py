"""
导出世界模型的「实验数据」与「化学/物理法则」为多个 CSV，落到 <项目根>/data 下。
- 实验数据：catalysts / literature_kb / oer_pool
- 表格型法则：support_properties / metal_properties / reward_weights / devices
- 标量法则常数：laws.csv（simulate / optimal_conditions / constraints / OER 的全部可调阈值）
之后代码统一从 <项目根>/data 读取这些 CSV（见 app/data.py）。
"""
import sys, os, json, csv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # ChemWorld/
DATA = os.path.join(ROOT, "data")
sys.path.insert(0, os.path.join(ROOT, "wm_backend"))
from app import data as D
from app import services as S


def write_csv(name, rows, fieldnames):
    path = os.path.join(DATA, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"  wrote {name}: {len(rows)} rows")


# ---------------------------------------------------------------- 实验数据
def jd(x):
    return json.dumps(x, ensure_ascii=False) if x is not None else ""


cat_keys = ["id", "doi", "metal", "metals", "support", "support_raw", "eg", "ead",
            "y", "orig_y", "s", "mechanism", "mech_text", "product", "why", "sel_driver",
            "oox", "act", "act_mechanism", "photothermal", "morphology", "year", "yunit",
            "eov", "dcht3", "active", "review_status", "review_note", "conditions", "recipe"]
cat_rows = []
for r in D.CATALYSTS:
    row = {}
    for k in cat_keys:
        v = r.get(k)
        if k == "metals" and isinstance(v, list):
            v = ";".join(v)
        elif k in ("conditions", "recipe"):
            v = jd(v)
        row[k] = v
    cat_rows.append(row)
write_csv("catalysts.csv", cat_rows, cat_keys)


kb_keys = ["id", "title", "metal", "support", "support_display", "bg", "ad", "y", "s",
           "mech", "oox", "photo", "domain", "recon", "yunit", "product", "doi", "why",
           "metals", "ypct", "spct", "T_C", "ch4conv", "src"]
kb_rows = []
for r in D.KB_ALL:
    row = {}
    for k in kb_keys:
        v = r.get(k)
        if k == "metals" and isinstance(v, list):
            v = ";".join(v)
        row[k] = v
    kb_rows.append(row)
write_csv("literature_kb.csv", kb_rows, kb_keys)


oer_keys = ["id", "doi", "metal", "support", "support_display", "reaction", "doh",
            "stability", "eg", "name", "note"]
write_csv("oer_pool.csv", [dict((k, r.get(k)) for k in oer_keys) for r in D.OER_POOL], oer_keys)


# ---------------------------------------------------------------- 表格型法则
sup_keys = ["support", "chi", "eb", "photo_stab", "ox_eov"]
sup_rows = []
all_sup = sorted(set(list(D.SUPPORT_CHI.keys()) + list(D.OX_EOV.keys())))
for s in all_sup:
    sup_rows.append({
        "support": s,
        "chi": D.SUPPORT_CHI.get(s),
        "eb": D.SUPPORT_EB.get(s),
        "photo_stab": D.SUPPORT_PHOTO.get(s),
        "ox_eov": D.OX_EOV.get(s),
    })
write_csv("support_properties.csv", sup_rows, sup_keys)


met_keys = ["metal", "wf", "eov_mod", "dch3_mod"]
met_rows = []
all_met = sorted(set(list(D.METAL_WF.keys()) + list(D.METAL_EOV_MOD.keys()) + list(D.METAL_DCH3_MOD.keys())))
for m in all_met:
    met_rows.append({
        "metal": m,
        "wf": D.METAL_WF.get(m),
        "eov_mod": D.METAL_EOV_MOD.get(m),
        "dch3_mod": D.METAL_DCH3_MOD.get(m),
    })
write_csv("metal_properties.csv", met_rows, met_keys)


rw_keys = ["key", "weight", "description"]
rw_desc = {
    "yield": "C2 产率（log 空间归一化）权重",
    "selectivity": "C2 选择性权重（OCM 核心痛点）",
    "stability": "抗失活（复用衰减）权重",
    "energy": "能耗（温和条件偏好）权重",
    "cox": "COx 过度氧化惩罚权重",
}
write_csv("reward_weights.csv",
          [{"key": k, "weight": v, "description": rw_desc.get(k, "")} for k, v in S.REWARD_WEIGHTS.items()],
          rw_keys)


dev_keys = ["key", "name", "stage", "x", "y", "w", "h", "specs", "params", "readOnly"]
dev_rows = []
for d in D.DEVICES:
    dev_rows.append({
        "key": d.get("key"), "name": d.get("name"), "stage": d.get("stage"),
        "x": d.get("x"), "y": d.get("y"), "w": d.get("w"), "h": d.get("h"),
        "specs": jd(d.get("specs")), "params": jd(d.get("params")),
        "readOnly": d.get("readOnly", False),
    })
write_csv("devices.csv", dev_rows, dev_keys)


# ---------------------------------------------------------------- 标量法则常数 laws.csv
# 汇总 simulate / optimal_conditions / constraints / OER 的全部可调阈值。
LAWS = [
    # 通用 / 检测
    ("LOD", 80.0, "μmol·g⁻¹·h⁻¹", "GC-FID 检测限；产率低于此记为未检出", "general"),
    ("Y_REF_LO", 50.0, "μmol·g⁻¹·h⁻¹", "reward log 归一化下界（约 LOD 量级）", "reward"),
    ("Y_REF_HI", 20000.0, "μmol·g⁻¹·h⁻¹", "reward log 归一化上界（约 POOL 上界）", "reward"),
    # simulate_experiment 物理因子系数
    ("F_OX_SEL_K", 1.3, "", "过度氧化选择性惩罚系数 k_ox_sel", "simulate"),
    ("F_OX_OXY_W", 0.4, "", "过氧化倾向权重 oxy_w", "simulate"),
    ("F_OX_CONV_K", 0.8, "", "缺 O2 转化惩罚系数 k_ox_conv", "simulate"),
    ("F_PT_K", 0.0008, "1/(mW/cm²)", "光热热点系数 k_pt（I 偏离 250 越强）", "simulate"),
    ("F_PHOT_ABS_A", 1.2, "", "吸收公式 absor = A - B*(bg-2.0)", "simulate"),
    ("F_PHOT_ABS_B", 0.25, "", "吸收公式 bg 系数", "simulate"),
    ("F_PHOT_ABS_BASE", 2.0, "eV", "吸收公式基准带隙", "simulate"),
    ("F_STAB_DELTA", 0.04, "", "每轮复用失活系数 delta", "simulate"),
    # optimal_conditions 推导规则
    ("OPT_T_BASE_OCM", 700.0, "℃", "OCM 基准最优温度", "optimal"),
    ("OPT_T_BASE_MPO", 400.0, "℃", "MPO 基准最优温度", "optimal"),
    ("OPT_T_BASE_NOCM", 350.0, "℃", "NOCM 基准最优温度", "optimal"),
    ("OPT_T_BASE_OTHER", 520.0, "℃", "其他机理基准最优温度", "optimal"),
    ("OPT_T_COEF", 70.0, "℃/eV", "T_opt = base + coef*(eov-2.5)", "optimal"),
    ("OPT_T_CLAMP_LO", 450.0, "℃", "T_opt 下限", "optimal"),
    ("OPT_T_CLAMP_HI", 850.0, "℃", "T_opt 上限", "optimal"),
    ("OPT_W_T", 130.0, "℃", "温度高斯宽度 W_T", "optimal"),
    ("OPT_R_BASE", 0.5, "", "R_opt 基准", "optimal"),
    ("OPT_R_COEF_LOW", -0.12, "", "低 EOV 项系数（贫氧）", "optimal"),
    ("OPT_R_COEF_HIGH", 0.06, "", "高 EOV 项系数（富氧）", "optimal"),
    ("OPT_R_CLAMP_LO", 0.2, "", "R_opt 下限", "optimal"),
    ("OPT_R_CLAMP_HI", 1.0, "", "R_opt 上限", "optimal"),
    ("OPT_W_R", 0.35, "", "O2:CH4 高斯宽度 W_R", "optimal"),
    ("OPT_I_BASE", 100.0, "mW/cm²", "I_opt 基准", "optimal"),
    ("OPT_I_COEF", 60.0, "mW/cm² per eV", "I_opt = base + coef*max(0,bg-2.8)", "optimal"),
    ("OPT_I_CLAMP_LO", 60.0, "mW/cm²", "I_opt 下限", "optimal"),
    ("OPT_I_CLAMP_HI", 300.0, "mW/cm²", "I_opt 上限", "optimal"),
    ("OPT_W_I", 120.0, "mW/cm²", "光强高斯宽度 W_I", "optimal"),
    ("OPT_G_BASE", 6000.0, "mL·g⁻¹·h⁻¹", "G_opt 基准", "optimal"),
    ("OPT_G_COEF", 2000.0, "", "G_opt = base + coef*max(0,dc-1.5)", "optimal"),
    ("OPT_G_DC_REF", 1.5, "eV", "G_opt 空速增益 dc 参考点", "optimal"),
    ("OPT_G_CLAMP_LO", 3000.0, "", "G_opt 下限", "optimal"),
    ("OPT_G_CLAMP_HI", 12000.0, "", "G_opt 上限", "optimal"),
    ("OPT_W_G", 5000.0, "", "空速高斯宽度 W_G", "optimal"),
    ("DOM_T_LO", 300.0, "℃", "可行域 T 下限", "optimal"),
    ("DOM_T_HI", 950.0, "℃", "可行域 T 上限", "optimal"),
    ("DOM_R_LO", 0.1, "", "可行域 R 下限", "optimal"),
    ("DOM_R_HI", 2.0, "", "可行域 R 上限", "optimal"),
    ("DOM_I_LO", 0.0, "mW/cm²", "可行域 I 下限", "optimal"),
    ("DOM_I_HI", 500.0, "mW/cm²", "可行域 I 上限", "optimal"),
    ("DOM_G_LO", 1000.0, "", "可行域 G 下限", "optimal"),
    ("DOM_G_HI", 30000.0, "", "可行域 G 上限", "optimal"),
    # constraints 标量阈值
    ("C_VB_FORM_A", 2.8, "V", "VB = a - b*(bg-2.5)", "constraint"),
    ("C_VB_FORM_B", 0.3, "V/eV", "VB 公式 bg 系数", "constraint"),
    ("C_E_OX", 1.7, "V", "价带空穴氧化 CH4 所需最小 VB", "constraint"),
    ("C_E_RED", -0.4, "V", "导带电子还原所需最大 CB", "constraint"),
    ("C_BG_PHOTON_HI", 3.2, "eV", "宽禁带仅 UV 响应阈值", "constraint"),
    ("C_BG_PHOTON_LO", 1.5, "eV", "过窄禁带阈值", "constraint"),
    ("C_AD_HI", -0.3, "eV", "Sabatier 吸附过弱（失败）", "constraint"),
    ("C_AD_LO", -1.3, "eV", "Sabatier 吸附过强（警告）", "constraint"),
    ("C_OOX_THR", 0.6, "", "过度氧化风险阈值", "constraint"),
    ("C_S_SEL_THR", 90.0, "%", "选择性优先阈值", "constraint"),
    ("C_TEMP_FAIL", 900.0, "℃", "烧结/积碳失活硬上限", "constraint"),
    ("C_TEMP_WARN", 700.0, "℃", "高温风险警告", "constraint"),
    ("C_TEMP_LO", 200.0, "℃", "低温 Arrhenius 抑制", "constraint"),
    ("C_MT_Y_THR", 20000.0, "μmol·g⁻¹·h⁻¹", "外扩散限制怀疑阈值", "constraint"),
    ("C_QY_MAX", 1.0, "", "表观量子产率上限 Φ", "constraint"),
    ("C_QY_WARN", 0.5, "", "表观量子产率偏高警告", "constraint"),
    ("C_QY_YREF", 32000.0, "", "表观量子产率代理换算分母 y/ref", "constraint"),
    ("C_STAB_TEMP_WARN", 850.0, "℃", "稳定性温度警告", "constraint"),
    ("C_STAB_OOX_THR", 0.15, "", "低过度氧化+高温积碳风险阈值", "constraint"),
    ("C_STAB_TEMP_THR", 600.0, "℃", "积碳风险温度阈值", "constraint"),
    ("C_BL_BG_HI", 3.2, "eV", "比尔-朗伯吸收弱阈值", "constraint"),
    ("C_REC_BG_LO", 1.6, "eV", "窄带隙复合警告", "constraint"),
    ("C_REC_CB_THR", -0.2, "eV", "CB 偏正复合警告", "constraint"),
    ("C_OVF_LO", 0.7, "eV", "氧空位形成能过低", "constraint"),
    ("C_OVF_HI", 2.4, "eV", "氧空位形成能过高", "constraint"),
    ("C_OVF_WIN_LO", 0.8, "eV", "氧空位窗口下限", "constraint"),
    ("C_OVF_WIN_HI", 2.0, "eV", "氧空位窗口上限", "constraint"),
    ("C_SCHOTTKY_PHI_LO", 0.3, "eV", "肖特基势垒过低警告", "constraint"),
    ("C_LD_FAIL", 0.25, "", "L_D < d*ratio 失败", "constraint"),
    ("C_LD_WARN", 0.5, "", "L_D < d*ratio 警告", "constraint"),
    ("C_TAU_FAIL", 1.0, "", "τ < t_transit 失败", "constraint"),
    ("C_TAU_WARN", 2.0, "", "τ < 2*t_transit 警告", "constraint"),
    ("C_EB_RATIO", 5.0, "", "Eb > ratio*kT 警告", "constraint"),
    ("C_MS_VBI_F", 0.3, "", "耗尽宽度 Vbi = max(0.1, bg*f)", "constraint"),
    ("C_KIE_LO", 1.5, "", "KIE 下限警告", "constraint"),
    ("C_KIE_HI", 8.0, "", "KIE 上限警告", "constraint"),
    ("C_BRANCH_S_HI", 85.0, "%", "C2 分支占优", "constraint"),
    ("C_BRANCH_S_LO", 60.0, "%", "COx 竞争明显", "constraint"),
    ("C_FLUX_I_LO", 60.0, "mW/cm²", "光强偏低阈值", "constraint"),
    ("C_KNUD_PORE", 65.0, "nm", "Knudsen 扩散平均自由程", "constraint"),
    ("C_KNUD_Y_THR", 12000.0, "", "高活性孔道传质受限阈值", "constraint"),
    ("C_EA_RATIO_HI", 40.0, "", "Ea/kT 过高警告", "constraint"),
    ("C_EA_RATIO_LO", 6.0, "", "Ea/kT 过低警告", "constraint"),
    ("C_EOV_WIN_LO", 1.8, "eV", "EOV 活化火山下限", "constraint"),
    ("C_EOV_WIN_HI", 4.5, "eV", "EOV 活化火山上限", "constraint"),
    ("C_EOV_VERTEX", 3.0, "eV", "EOV 火山顶点", "constraint"),
    ("C_DCH3_FAIL", 0.4, "eV", "ΔE*CH3 过小失败", "constraint"),
    ("C_DCH3_WARN", 2.5, "eV", "ΔE*CH3 过大警告", "constraint"),
    ("C_VOLCANO_EOV_V", 3.0, "eV", "双描述符火山 EOV 顶点", "constraint"),
    ("C_VOLCANO_DC_N", 1.8, "eV", "双描述符火山 dc 归一", "constraint"),
    ("C_VOLCANO_LO", 0.35, "", "火山高度偏低警告", "constraint"),
    ("C_VOLCANO_HI", 0.8, "", "火山高度逼近顶点", "constraint"),
    # OER 法则
    ("OER_U0", 1.23, "V", "标准可逆电位", "oer"),
    ("OER_SCALE_DOO", 1.5, "eV", "ΔG(*O)-ΔG(*OH) 标度", "oer"),
    ("OER_SCALE_DOOH", 3.2, "eV", "ΔG(*OOH)-ΔG(*OH) 标度", "oer"),
    ("OER_SEL_PEAK", 3.5, "eV", "H2O2 选择性峰值 ΔG*OOH", "oer"),
    ("OER_SEL_W", 0.7, "eV", "选择性高斯宽度", "oer"),
    # OCM 计量
    ("MECH_TEMP_OCM", 740.0, "℃", "OCM 典型反应温度", "constraint"),
    ("MECH_TEMP_MPO", 400.0, "℃", "MPO 典型反应温度", "constraint"),
    ("MECH_TEMP_OTHER", 320.0, "℃", "其他机理典型温度", "constraint"),
    ("O2RATIO_OCM", 0.5, "", "OCM 典型 O2:CH4", "constraint"),
    ("O2RATIO_MPO", 1.0, "", "MPO 典型 O2:CH4", "constraint"),
    ("O2RATIO_OTHER", 0.0, "", "其他机理 O2:CH4", "constraint"),
    ("NOCM_Y_THR", 4000.0, "", "NOCM 热力学可行性阈值", "constraint"),
    # 参考基准 / 建模枢轴
    ("DEFAULT_BG", 2.8, "eV", "带隙缺省回退值", "general"),
    ("VB_REF_BG", 2.5, "eV", "VB 公式带隙枢轴 (bg-2.5)", "constraint"),
    ("LANG_TH_CH4", 0.5, "", "朗缪尔 CH4 覆盖度基准", "constraint"),
    ("MS_VBI_FLOOR", 0.1, "V", "Mott-Schottky Vbi 下限", "constraint"),
    ("MS_W_RATIO", 0.5, "", "耗尽层 W<d*ratio 阈值", "constraint"),
    ("OPT_T_EOV_REF", 2.5, "eV", "T_opt EOV 枢轴 (eov-2.5)", "optimal"),
    ("OPT_R_EOV_MID", 2.6, "eV", "R_opt 贫氧中点 (2.6-eov)", "optimal"),
    ("OPT_I_PT_REF", 250.0, "mW/cm²", "光热热点 I 枢轴", "simulate"),
    ("SIM_I_KM", 50.0, "mW/cm²", "光子饱和 Michaelis-Menten Km", "simulate"),
    ("DEFAULT_S", 60.0, "%", "选择性缺省回退值", "simulate"),
    ("VOLCANO_EOV_SPREAD", 2.5, "eV", "双描述符火山 EOV 展宽归一", "constraint"),
    ("ENERGY_T_REF", 25.0, "℃", "能耗归一化参考温度(室温)", "reward"),
    # 物理因子惩罚
    ("PHYS_FACTOR_FAIL", 0.72, "", "约束 fail → 产率折扣", "physfactor"),
    ("PHYS_FACTOR_WARN", 0.96, "", "约束 warn → 产率折扣", "physfactor"),
    ("PHYS_FACTOR_LO", 0.55, "", "物理因子下限", "physfactor"),
    ("PHYS_FACTOR_HI", 1.08, "", "物理因子上限", "physfactor"),
]
write_csv("laws.csv",
          [{"key": k, "value": v, "unit": u, "description": d, "group": g} for (k, v, u, d, g) in LAWS],
          ["key", "value", "unit", "description", "group"])

print("DONE. All CSVs written to", DATA)
