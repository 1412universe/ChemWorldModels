import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

SRC = "/Users/fenglongli/Downloads/unilabWorld/data/OCM_master.xlsx"

wb = openpyxl.load_workbook(SRC)
if "载体描述符" in wb.sheetnames:
    del wb["载体描述符"]
ws = wb.create_sheet("载体描述符")

headers = [
    "载体候选", "化学式", "材料类别", "标称粒径(nm)",
    "Eg典型值(eV)", "Eg文献范围(eV)",
    "CB典型值(V vs NHE)", "VB典型值(V vs NHE)",
    "晶相", "光吸收范围",
    "电子迁移率(cm²/V·s)", "BET比表面积(m²/g)",
    "能带测量条件/备注", "文献来源",
]

# 能带位置统一为 pH=0 vs NHE 典型值；不同文献/测量方法差异写进备注。
# 无可靠公开值的粒径/BET/迁移率留空并标注“待实测”，不编造。
rows = [
    [
        "P25", "TiO2", "钛氧化物·商用混晶", "20–40（典型~21）",
        3.2, "锐钛矿3.2 / 金红石3.0",
        -0.1, 3.1,
        "锐钛矿80%/金红石20%", "紫外（λ<387nm）",
        None, "~50（35–65）",
        "锐钛矿能带；商用P25为混晶，有效带隙约3.2eV",
        "PMC10013126；MDPI Fluids 2023,7(2):27；Semantic Scholar photosensitization综述",
    ],
    [
        "Nb2O5", "Nb2O5", "铌氧化物·n型", "待实测（供应商）",
        3.4, "3.2–3.4",
        -0.69, 2.71,
        "正交/单斜(T相)", "紫外（λ<365nm）",
        None, "待实测（供应商BET）",
        "CB/VB为pH=7 vs NHE（MDPI综述）；pH=0需+0.059×7换算；另一文pH0估ECB=0.16/EVB=3.42",
        "MDPI Catalysts 2026,12(9):311；CJIC 2021.060",
    ],
    [
        "ZnO（70±30nm）", "ZnO", "锌氧化物·n型", "70±30",
        3.37, "3.2–3.37",
        -0.35, 2.9,
        "纤锌矿六方", "紫外（λ<388nm）",
        None, "待实测（供应商BET）",
        "直接带隙；VB顶文献约+2.70~+2.89 V vs NHE；CB主流实测-0.31~-0.44、pH0表-0.2~-0.25，取-0.35",
        "PMC10228492(CB-0.31/VB2.89)；ACS Omega 2021,1c03259(-0.35/+2.93)；PMC11534062(pH0表)",
    ],
    [
        "ZnO（30±10nm）", "ZnO", "锌氧化物·n型", "30±10",
        3.37, "3.2–3.37",
        -0.35, 2.9,
        "纤锌矿六方", "紫外（λ<388nm）",
        None, "待实测（供应商BET）",
        "同物质不同粒径，能带本征值一致；粒径仅影响比表面积/量子限域；CB取-0.35同70nm版",
        "PMC10228492(CB-0.31/VB2.89)；ACS Omega 2021,1c03259(-0.35/+2.93)",
    ],
    [
        "WO3（<100nm）", "WO3", "钨氧化物·n型·可见光", "<100",
        2.75, "2.6–2.8",
        0.5, 3.2,
        "单斜", "可见光（λ<460nm）",
        "~12", "待实测（供应商BET）",
        "CB/VB为pH=0 vs SHE（Chem Rev）；另一文CB≈+0.1；CB较正、还原能力弱，偏氧化侧",
        "Chem. Rev. 2018,118(10):.7b00286；MDPI Nanomaterials 2020,10(9):1871",
    ],
    [
        "SrTiO3（100nm）", "SrTiO3", "钙钛矿·n型", "100",
        3.25, "3.18–3.4",
        -0.8, 2.45,
        "立方钙钛矿", "紫外（λ<380nm）",
        None, "待实测（供应商BET）",
        "实验CBM比SHE高约0.8eV(即-0.8V)；DFT算得CB=-1.17/VB=+2.05；VB由Eg+CB推得",
        "RSC J. Mater. Chem. A 2013,1:4221；PMC9058650(DFT)",
    ],
    [
        "CeO2", "CeO2", "铈氧化物·萤石·氧化还原", "待实测（供应商）",
        3.1, "3.0–3.2",
        -0.44, 2.56,
        "立方萤石", "紫外（λ<410nm）",
        None, "待实测（供应商BET）",
        "光学带隙3.0–3.2eV(O2p→Ce4f/5d)；本体O2p→Ce5d约6eV，含Ce4f局域隙态",
        "PMC5385822(CB=-0.44/VB=2.56)；MDPI Catalysts 2020,10(12):1435",
    ],
    [
        "SnO2（50–70nm）", "SnO2", "锡氧化物·n型·高迁移率", "50–70",
        3.55, "3.5–3.6",
        -0.2, 3.35,
        "金红石四方", "紫外（λ<345nm）",
        "100–200", "待实测（供应商BET）",
        "XPS实测VB约3.21~3.35（非3.8）；CB文献分散(-0.5~-0.1)取-0.2；还原能力弱、氧化能力强",
        "ACS Omega 2021,1c04215(XPS VB3.21)；RSC Adv.2023,13:32457(CB-0.16/VB3.35)；PMC8708904(CB≈-0.05,pH7)",
    ],
    [
        "In2O3", "In2O3", "铟氧化物·n型", "待实测（供应商）",
        2.8, "2.7–2.9(部分2.09)",
        -0.49, 2.4,
        "立方bixbyite", "近UV/可见（λ<460nm）",
        None, "待实测（供应商BET）",
        "CB=-0.49(Nat Commun In2O3/Nb2O5)；另一文CB=-0.62/VB=2.18；带隙随形貌2.09–2.9",
        "PMC11153544(NC)；CJIC 2016.045(CB=-0.62/VB=2.18)",
    ],
]

# 表头
header_fill = PatternFill("solid", fgColor="3370FF")
header_font = Font(name="微软雅黑", bold=True, color="FFFFFF", size=10)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left = Alignment(horizontal="left", vertical="center", wrap_text=True)
thin = Side(style="thin", color="B8C7D9")
border = Border(bottom=thin)

for j, h in enumerate(headers, 1):
    c = ws.cell(row=1, column=j, value=h)
    c.fill = header_fill
    c.font = header_font
    c.alignment = center
    c.border = border

body_font = Font(name="微软雅黑", size=10)
for i, row in enumerate(rows, 2):
    for j, v in enumerate(row, 1):
        c = ws.cell(row=i, column=j, value=v)
        c.font = body_font
        c.alignment = left if j in (1, 2, 3, 9, 10, 13, 14) else center

# 列宽
widths = {1:16, 2:9, 3:16, 4:15, 5:11, 6:16, 7:13, 8:13, 9:15, 10:16, 11:15, 12:15, 13:34, 14:30}
for col, w in widths.items():
    ws.column_dimensions[get_column_letter(col)].width = w

ws.freeze_panes = "A2"

wb.save(SRC)
print("saved, sheets:", wb.sheetnames)
