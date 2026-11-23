# -*- coding: utf-8 -*-
"""按《云曦日历-使用说明.docx》的版式生成 ChemWorldModels 使用说明。"""
import os
import re
import zipfile
from xml.sax.saxutils import escape

from PIL import Image

SRC = "/tmp/yx_docx"
OUT = "/Users/fenglongli/Downloads/ChemWorldModel/ChemWorldModels-使用说明.docx"
FIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# ---------------- 图片登记（插入顺序 = 图 1..N） ----------------
FIGS = []          # [(rid, media_name, abs_path, width_cm)]
_rid_seq = [100]


def fig(path_name, width_cm):
    """插入一张居中图片，返回 XML。rid 由 _rid_seq 递增分配。"""
    src = os.path.join(FIG_DIR, path_name)
    w, h = Image.open(src).size
    _rid_seq[0] += 1
    rid = "rIdF%d" % _rid_seq[0]
    media = "image_f%d.png" % _rid_seq[0]
    FIGS.append((rid, media, src, width_cm))
    cx = int(width_cm * 360000)                 # cm → EMU
    cy = int(cx * h / w)
    pid = _rid_seq[0]
    return (
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        '<wp:extent cx="%d" cy="%d"/><wp:docPr id="%d" name="图%d"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic><pic:nvPicPr><pic:cNvPr id="%d" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
        '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
        % (cx, cy, pid, pid, pid, media, rid, cx, cy)
    )



def p(style=None, text="", bold=False, center=False, page_break=False, extra_ppr=""):
    ppr = ""
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    if page_break:
        ppr += "<w:pageBreakBefore/>"
    if center:
        ppr += '<w:jc w:val="center"/>'
    ppr += extra_ppr
    rpr = (
        '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" '
        'w:cs="Times New Roman" w:hint="eastAsia"/>%s</w:rPr>' % ("<w:b/>" if bold else "")
    )
    if text == "":
        return "<w:p><w:pPr>%s</w:pPr></w:p>" % ppr
    runs = "".join(
        '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, escape(t))
        for t in ([text] if isinstance(text, str) else text)
    )
    return "<w:p><w:pPr>%s</w:pPr>%s</w:p>" % (ppr, runs)


def h1(t):
    return p("1", t)


def h2(t):
    # heading 2 样式自带编号，与原文档一致地用 numId=0 关闭，编号由文字自带
    return p("2", t, extra_ppr='<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>')


def body(t):
    return p("af0", t)


def caption(t):
    return p("a3", t)


# ---------------- 插图 ----------------
IMG_DIR = FIG_DIR
IMAGES = [
    ("fig_ocm", "fig1_ocm_panel.png", 11.0),     # 图1 OCM 场景面板
    ("fig_hcho", "fig2_hcho_panel.png", 11.0),   # 图2 HCHO 场景面板
    ("fig_wm", "fig3_wm_results.png", 13.4),     # 图3 世界模型三层结果
    ("fig_charts", "fig4_charts.png", 15.4),     # 图4 底部图表区
]
EMU_PER_CM = 360000
_NEXT_RID = [900]


def image_xml(key, filename, width_cm, desc=""):
    """生成内联图片段落；返回 (xml, rel_entry)。尺寸按原图比例换算。"""
    from PIL import Image as _Im

    path = os.path.join(IMG_DIR, filename)
    with _Im.open(path) as im:
        w_px, h_px = im.size
    cx = int(width_cm * EMU_PER_CM)
    cy = int(cx * h_px / w_px)
    rid = "rId%d" % _NEXT_RID[0]
    _NEXT_RID[0] += 1
    rel = (
        '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/'
        'officeDocument/2006/relationships/image" Target="media/%s"/>' % (rid, filename)
    )
    xml = (
        '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="60"/></w:pPr>'
        "<w:r><w:drawing>"
        '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        '<wp:extent cx="%d" cy="%d"/>'
        '<wp:docPr id="%d" name="%s" descr="%s"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic>'
        '<pic:nvPicPr><pic:cNvPr id="%d" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
        % (cx, cy, _NEXT_RID[0], key, desc, _NEXT_RID[0], key, rid, cx, cy)
    )
    return xml, rel


FIG = {}
IMAGE_RELS = []
for _key, _fn, _w in IMAGES:
    _xml, _rel = image_xml(_key, _fn, _w)
    FIG[_key] = _xml
    IMAGE_RELS.append((_fn, _rel))


def table(rows, widths, header=True, border=True):
    """rows: list[list[str]]，第一行表头。"""
    grid = "".join('<w:gridCol w:w="%d"/>' % w for w in widths)
    if border:
        tblpr = (
            '<w:tblPr><w:tblW w:w="%d" w:type="dxa"/><w:tblInd w:w="78" w:type="dxa"/>'
            "<w:tblBorders>"
            '<w:top w:val="single" w:sz="12" w:space="0" w:color="auto"/>'
            '<w:left w:val="single" w:sz="12" w:space="0" w:color="auto"/>'
            '<w:bottom w:val="single" w:sz="12" w:space="0" w:color="auto"/>'
            '<w:right w:val="single" w:sz="12" w:space="0" w:color="auto"/>'
            '<w:insideH w:val="single" w:sz="6" w:space="0" w:color="auto"/>'
            '<w:insideV w:val="single" w:sz="6" w:space="0" w:color="auto"/>'
            "</w:tblBorders><w:tblLayout w:type=\"fixed\"/><w:tblLook w:val=\"04A0\"/></w:tblPr>"
        ) % sum(widths)
    else:
        tblpr = (
            '<w:tblPr><w:tblW w:w="%d" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
            '<w:tblLook w:val="04A0"/></w:tblPr>'
        ) % sum(widths)

    out = ["<w:tbl>%s<w:tblGrid>%s</w:tblGrid>" % (tblpr, grid)]
    for ri, row in enumerate(rows):
        out.append('<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="420"/></w:trPr>')
        for ci, cell in enumerate(row):
            bold = header and ri == 0
            shd = '<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>' if bold else ""
            out.append(
                '<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s<w:vAlign w:val="center"/></w:tcPr>%s</w:tc>'
                % (widths[ci], shd, p(None, str(cell), bold=bold))
            )
        out.append("</w:tr>")
    out.append("</w:tbl>")
    out.append(p(None, ""))
    return "".join(out)


# ---------------- 封面（同原件：单列 6 行表格） ----------------
def cover_cell(paras):
    return (
        '<w:tc><w:tcPr><w:tcW w:w="9285" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>'
        + paras + "</w:tc>"
    )


def big(t):
    return (
        '<w:p><w:pPr><w:pStyle w:val="af1"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:hint="eastAsia"/>'
        '<w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr><w:t>%s</w:t></w:r></w:p>' % escape(t)
    )


def meta(t):
    return (
        '<w:p><w:pPr><w:pStyle w:val="TabelleStandard"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:hint="eastAsia"/>'
        '<w:sz w:val="21"/></w:rPr><w:t>%s</w:t></w:r></w:p>' % escape(t)
    )


cover = (
    '<w:tbl><w:tblPr><w:tblW w:w="9285" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    '<w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar>'
    '<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="9285"/></w:tblGrid>'
    + '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="3440"/></w:trPr>'
    + cover_cell(
        big("ChemWorldModels") + big("使用说明") + meta("") + meta("版本") + meta("1.0")
    )
    + "</w:tr>"
    + "".join(
        '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="511"/></w:trPr>%s</w:tr>'
        % cover_cell(meta(t))
        for t in [
            "文档状态：编辑",
            "作者：李逢龙、李思扬、李子艺",
            "负责人：李逢龙",
            "创建日期：2026 年 11 月 14 日",
            "更新日期：2026 年 11 月 14 日",
        ]
    )
    + "</w:tbl>"
)

# ---------------- 修订历史 ----------------
hist = table(
    [
        ["日期", "版本", "修改者", "描述"],
        ["2026-11-03", "0.6", "李逢龙", "整理系统模块与实验运行记录相关功能"],
        ["2026-11-05", "0.8", "李逢龙", "补充世界模型、消融实验与 Pd–P25 条件级 BO 说明"],
        ["2026-11-13", "0.9", "李思扬", "补充分层世界模型、HCHO 场景与推理日志说明"],
        ["2026-11-14", "1.0", "李子艺", "完成全书结构统一，按使用说明体例定稿"],
    ],
    [2370, 1440, 2160, 3132],
)

# ---------------- 目录 ----------------
TOC_ENTRIES = [
    (1, "1 简介"),
    (2, "1.1 编写目的"),
    (2, "1.2 使用对象"),
    (2, "1.3 产品范围"),
    (2, "1.4 术语与缩写"),
    (1, "2 产品概述"),
    (2, "2.1 总体架构"),
    (2, "2.2 页面导航"),
    (2, "2.3 总览-光催化闭环设计"),
    (2, "2.4 表征分析"),
    (2, "2.5 理论计算"),
    (2, "2.6 配方方案"),
    (2, "2.7 数据日志"),
    (1, "3 核心功能"),
    (2, "3.1 AI Agent 实时推演"),
    (2, "3.2 世界模型预演"),
    (2, "3.3 分层世界模型与消融实验"),
    (2, "3.4 纯 BO 闭环推荐"),
    (2, "3.5 配方调制与导出"),
    (2, "3.6 模型推理日志"),
    (2, "3.7 HCHO 场景"),
    (2, "3.8 本地大模型对话"),
    (1, "4 数据与接口"),
    (2, "4.1 数据目录"),
    (2, "4.2 主要接口"),
    (2, "4.3 启动方式"),
    (1, "5 运行维护与注意事项"),
    (2, "5.1 环境依赖"),
    (2, "5.2 常见问题"),
    (1, "6 附录"),
    (2, "6.1 目录结构"),
]


def toc_entry(level, text, page):
    """带右对齐点线制表符的目录条目（作为 TOC 域的缓存结果）。"""
    style = "10" if level == 1 else "20"
    indent = "" if level == 1 else '<w:ind w:left="420"/>'
    return (
        '<w:p><w:pPr><w:pStyle w:val="%s"/>%s'
        '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9073"/></w:tabs></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:hint="eastAsia"/></w:rPr>'
        '<w:t xml:space="preserve">%s</w:t></w:r>'
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:hint="eastAsia"/></w:rPr>'
        "<w:tab/></w:r>"
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:hint="eastAsia"/></w:rPr>'
        "<w:t>%s</w:t></w:r></w:p>" % (style, indent, escape(text), page)
    )


# ---------------- 正文 ----------------
D = []
A = D.append

# 1 简介
A(h1("简介"))
A(body(
    "ChemWorldModels 是一套面向化学合成的 AI 世界模型系统。系统把催化剂与条件推荐、反应动力学推演、"
    "贝叶斯优化（BO）与实验数据闭环连接在一起：由本地大模型与代理模型给出候选配方与反应条件，"
    "经物理约束校验后形成可执行的实验方案，实验结果回流后继续修正模型。"
))
A(body(
    "系统目前覆盖两条工艺线：一条是甲烷偶联（OCM）与 Pd–P25 光催化制 C2+ 的条件优化，"
    "另一条是 ZnO 光热催化甲烷制甲醛（HCHO）的条件探索。两条线共用同一套数据目录、"
    "代理模型与优化内核，界面通过顶部导航切换。"
))

A(h2("1.1 编写目的"))
A(body("本文档为 ChemWorldModels 的使用说明，描述系统的功能构成、页面用途、核心算法流程、数据与接口约定，"
       "以及部署与维护注意事项，为系统的使用、测试与二次开发提供依据。"))

A(h2("1.2 使用对象"))
A(body("本文档的使用对象为：实验操作与工艺人员、算法与模型开发人员，"
       "以及需要了解系统能力边界与数据口径的项目管理人员。"))

A(h2("1.3 产品范围"))
A(body(
    "系统以浏览器界面为主要入口，后端采用 FastAPI 提供模型推演与数据服务，前端为原生 JavaScript 实现的"
    "多页面工作台。功能范围包括：历史文献与实验数据库检索、催化剂与条件推荐、"
    "世界模型条件预演、主动学习选点、纯 BO 网格闭环证明、配方导出、实验运行数据记录，"
    "以及本地大模型问答。"
))
A(body(
    "系统的产出为条件建议、预测区间与可执行配方，不包含实验硬件的制造与驱动；"
    "数据口径以主表与文献库为准，模型结论需经实验验证后方可用于工艺决策。"
))

A(h2("1.4 术语与缩写"))
A(table(
    [
        ["术语", "含义"],
        ["OCM", "甲烷氧化偶联，本系统中指光热催化甲烷制 C2 烃类的反应体系"],
        ["HCHO", "甲醛，本系统中指甲烷选择性氧化制甲醛的反应体系"],
        ["C2+", "碳数不小于 2 的烃类产物，主要为乙烷与乙烯"],
        ["世界模型", "由机理先验与数据驱动残差共同构成的可推演模型，用于预测条件变化下的产物分布"],
        ["代理模型（Surrogate）", "以描述符为输入的机器学习回归模型，用于快速近似实验产率与选择性"],
        ["主动学习（AL）", "依据预测不确定度挑选下一组实验条件，用最少实验覆盖未知空间"],
        ["贝叶斯优化（BO）", "在目标函数未知时，用代理模型与采集函数搜索最优条件的优化方法"],
        ["UCB", "置信上界采集函数，按均值加不确定度加权选择候选点"],
        ["DFT", "密度泛函理论计算，用于给出吸附能与能垒等机理量"],
        ["AQY", "表观量子产率，衡量光能到产物的转化效率"],
    ],
    [2100, 7002],
))

# 2 产品概述
A(h1("产品概述"))
A(body(
    "系统采用前后端分离结构：后端负责数据加载、模型推演与优化计算；前端负责场景渲染、"
    "人机交互与结果展示。用户在页面上设定或调整条件，系统即时给出预测产率、选择性、不确定度与物理约束结论；"
    "点击运行后，AI 按条件推进推演，并同步刷新曲线与候选卡片。"
))
A(body(
    "所有页面的顶部为统一导航栏，左侧为模块列表，中间为数据主视图或场景区，"
    "右侧为 AI Agent 实时推演栏，底部为产率、选择性、能垒、能带与火山的图表区。"
))

A(h2("2.1 总体架构"))
A(table(
    [
        ["层次", "组成", "职责"],
        ["交互层", "总览、合成与反应台、表征、理论计算、配方、数据日志等页面", "条件设定、结果查看与导出"],
        ["服务层", "FastAPI 路由与业务服务", "预测、约束校验、选点、优化、导出与日志"],
        ["模型层", "代理模型、微动力学模型、分层世界模型、贝叶斯优化内核", "产率与选择性预测、不确定度估计、条件搜索"],
        ["数据层", "催化剂库、文献语料、实验主表", "提供训练与检索所需的统一数据来源"],
    ],
    [1500, 3900, 3702],
))
A(body(
    "模型层遵循“先验加残差”的原则：机理模型只给出趋势与相对量级，绝对数值由实测数据回归校准，"
    "避免模型凭空给出绝对值；当条件超出已有数据范围时，系统降低残差权重并放大不确定度，"
    "同时在界面上标注为域外推演。"
))

A(h2("2.2 页面导航"))
A(body("顶部导航提供两个入口：总览-光催化闭环设计与工作流编辑器。本文档不涉及工作流编辑器，"
       "其使用方式请参阅该模块的独立说明。其余页面通过总览页内的模块入口或直接地址访问。"))
A(table(
    [
        ["页面", "访问地址", "主要用途"],
        ["总览-光催化闭环设计", "/overview_photo.html", "OCM 与 HCHO 两条光催化线的闭环设计"],
        ["表征分析", "/char.html", "表征数据与谱图结果的查看与关联"],
        ["理论计算", "/dft.html", "DFT 计算结果、能带与反应路径的展示"],
        ["配方方案", "/recipe.html", "候选配方的组成、用量与合成步骤"],
        ["数据日志", "/datalog.html", "实验运行记录与逐次运行明细"],
    ],
    [2400, 2500, 4202],
))

A(h2("2.3 总览-光催化闭环设计"))
A(body(
    "该页面向光催化体系，顶部提供“OCM”与“ZnO 制 HCHO”两个场景标签。OCM 面板给出 Pd–P25 体系的"
    "条件空间、历史锚点与推荐条件；HCHO 面板给出 ZnO 掺 FeCl₃ 制甲醛体系的探索空间定义与首轮补点表。"
))
A(body(
    "场景标签切换时，右侧参数区、补点表与产物口径同步切换；底部图表沿用当前场景对应的口径。"
    "页面同时展示物理约束校验结果，用“可做 / 高风险 / 别做”三档提示当前条件是否值得投入实验。"
))
A(FIG["fig_ocm"])
A(caption("图 1  总览-光催化闭环设计（OCM 场景）"))

A(h2("2.4 表征分析"))
A(body(
    "该页汇总候选材料的表征结果，按样品组织 XRD、UV-Vis、PL、EPR 等图谱与关键数值，"
    "并与文献库中同体系样品的公开数据对照。表征结论会写入候选卡片，作为机理判断的旁证。"
))

A(h2("2.5 理论计算"))
A(body(
    "该页展示 DFT 计算结果，包括吸附能与能垒、态密度与能带结构、反应路径能量剖面。"
    "系统中 Pd(111) 表面相关计算数据以标准输入文件形式存放，结果用于构造微动力学模型的描述符输入，"
    "并作为火山图与能垒示意的数据来源。"
))

A(h2("2.6 配方方案"))
A(body(
    "该页把推荐结果整理为可执行的配方：金属与载体、负载量、前驱体与助剂用量、溶剂与配比、"
    "以及合成步骤的顺序与温控要求。配方可导出为 CSV 与 JSON 两种格式，供实验记录或下游系统使用。"
))

A(h2("2.7 数据日志"))
A(body(
    "该页记录每一次实验运行的明细。左侧为批次清单，右侧为该批次逐次运行的表格，"
    "每次运行一行，包含运行时间、运行模式与各步骤的执行结果。"
    "运行记录同时以 Excel 形式归档，便于后续统计与追溯。"
))

# 3 核心功能
A(h1("核心功能"))
A(body(
    "本章按使用顺序说明系统的核心能力：从条件推演、模型预演、优化选点，到配方生成与运行记录。"
    "各功能之间共享同一份数据与同一套模型，因此任一环节的新数据都会影响后续推荐结果。"
))

A(h2("3.1 AI Agent 实时推演"))
A(body(
    "AI Agent 栏位于各页面右侧，用于展示当前轮次的决策过程：模型选择了哪个候选、依据哪些描述符、"
    "约束校验是否通过、以及本轮与上一轮的差异。推演过程按步骤输出，便于人工复核模型判断是否合理。"
))
A(body(
    "用户可在栏内直接提问，例如询问某个候选的选择性来源、某条约束为何未通过、"
    "或要求按指定条件重新推演。回答由本地大模型生成，模型只读取系统提供的候选与约束数据，"
    "不自行编造实验数值。"
))

A(h2("3.2 世界模型预演"))
A(body(
    "世界模型预演用于回答“如果把这组条件做下去，产物大概是多少、风险在哪”。输入为金属、载体、"
    "甲烷/氧气/氩气流量、进料氧浓度、负载量与光照强度；输出为 C2+ 时空产率与 C2+ 选择性的预测值、"
    "不确定区间以及结论等级。"
))
A(body("预演结果按三层并列展示："))
A(table(
    [
        ["层次", "作用", "结论含义"],
        ["经验层", "在主表中查找同条件或邻近条件的实测点，加权给出估计", "条件做过则接近实测均值；没做过则为邻域插值"],
        ["世界模型层", "以微动力学特征描述反应趋势，结合物理约束判断可行性", "离开已有数据范围时仍给出方向性判断"],
        ["主动学习层", "在不确定度高的位置推荐下一组实验条件", "指出最值得补测的条件，用于提升模型"],
    ],
    [1700, 4300, 3102],
))
A(body(
    "当三层结论不一致时，系统以物理约束为最高优先级：若约束校验不通过，无论预测值多高都提示不要执行。"
    "预演结果同时给出邻近实测点列表，便于人工核对模型依据。"
))

A(h2("3.3 分层世界模型与消融实验"))
A(body(
    "分层世界模型把预测过程拆成若干可独立校准的环节：气路层把设定流量换算为实际流量，"
    "光照层把功率或光强换算为相对光功率，反应器层由机理先验与数据残差共同给出产率与选择性，"
    "最后由产物口径换算为时空产率与选择性。每一层都带有版本号与不确定度，便于单独标定与替换。"
))
A(body(
    "反应器层采用“先验加残差”的结构：先用微动力学特征与实验数据拟合一个粗趋势，"
    "再单独学习实测值与先验之间的偏差；预测时按条件与已有数据的距离决定残差权重，"
    "离训练数据越远，越依赖先验并放大不确定度。"
))
A(body(
    "为验证该结构是否有效，系统提供留出法消融实验：把某个负载区间的数据整体隐藏，"
    "只用其余数据训练，再比较三种做法的预测误差，包括纯邻近插值、仅用机理先验、以及先验加残差。"
    "比较指标为产率对数平均绝对误差、产率对数决定系数与选择性平均绝对误差。"
))
A(caption("表 1  消融实验的三种对照做法"))
A(table(
    [
        ["做法", "说明", "预期表现"],
        ["纯邻近插值", "只用历史数据找最相似的条件加权", "在数据密集区尚可，外推到新负载时误差显著增大"],
        ["仅用机理先验", "只用微动力学特征拟合趋势，不学残差", "外推较稳，但系统性偏差无法修正"],
        ["先验加残差", "在机理先验基础上学习偏差，并按数据距离收缩", "兼顾外推稳定与局部精度"],
    ],
    [1900, 4200, 3002],
))
A(body(
    "消融结果以 JSON 形式归档，包含留出区间、训练与测试样本数、各做法的误差指标与训练元信息，"
    "可直接用于论文中的数据表或补充材料。"
))
A(FIG["fig_wm"])
A(caption("图 2  世界模型预演：三层结论与物理约束校验"))

A(h2("3.4 纯 BO 闭环推荐"))
A(body(
    "纯 BO 闭环用于在离散网格上穷举候选条件，回答“当前最优点是否真的最优”。系统按设定的流量、"
    "功率、负载与质量步长展开网格，用代理模型给出每点的均值与不确定度，按置信上界排序，"
    "并输出仍有可能推翻当前最优的实验清单。"
))
A(body(
    "推荐结果分为利用与探索两类：利用项锚定在已证实的高产区域，探索项拉开负载、流量、"
    "光功率与质量的组合，用于覆盖未知空间。推荐表可直接导出，作为下一轮实验的排产依据。"
))
A(body(
    "对于 Pd–P25 体系，系统还提供条件级推荐：固定载体与金属，只优化负载与反应条件，"
    "在选择性硬门槛下最大化产率，并标注每组推荐属于利用还是探索。"
))
A(FIG["fig_charts"])
A(caption("图 3  底部图表区（产率、选择性、能垒、能带与火山图）"))

A(h2("3.5 配方调制与导出"))
A(body(
    "配方调制把推荐条件转换为具体用量：根据负载量换算金属前驱体质量，按载体比表面积与孔容估算"
    "浸渍或沉积所需的溶剂体积，并给出助剂掺量与焙烧制度建议。导出格式为 CSV 与 JSON，"
    "字段与实验记录表保持一致。"
))
A(body(
    "导出前系统会再次执行约束校验，若配方涉及超出可行范围的温度、压力或用量，会在导出文件中标注提示，"
    "避免把不可执行的配方带入实验环节。"
))

A(h2("3.6 模型推理日志"))
A(body(
    "每次主动学习决策都会生成一条推理记录，内容包括时间、候选、预测值、不确定度、奖励与最终选择理由。"
    "系统按今日、本周、本月三个粒度汇总为时间线视图，并按候选聚合为多轮对比视图，"
    "用于观察同一候选在多轮迭代中的预测走势与实际表现。"
))
A(body(
    "周报可导出为 CSV，便于在表格软件中统计。日志页面为自包含页面，不依赖外部资源，"
    "可单独保存或归档。"
))

A(h2("3.7 HCHO 场景"))
A(body(
    "HCHO 场景面向 ZnO（可掺 FeCl₃）光热催化甲烷制甲醛体系，光源固定为 365 nm。"
    "该场景目前提供探索空间定义与首轮补点表：探索空间包含前驱体质量、助剂掺量、焙烧升温速率、"
    "焙烧温度与时间、装样量、干甲烷、湿甲烷、空气、氩气、水浴温度、光功率、外热温度、进料温度"
    "与催化剂面积共 15 个自变量，并给出各变量的范围、单位与离散档位。"
))
A(body(
    "首轮补点表按分层档位组合给出建议实验点，用于在模型尚未建立时先覆盖条件空间。"
    "产物口径包括甲醛、一氧化碳、二氧化碳与乙烷浓度，以及甲醛生成速率、时空产率、"
    "C2+ 选择性与表观量子产率，待实测数据回流后填入。"
))
A(FIG["fig_hcho"])
A(caption("图 4  HCHO 场景：探索空间与首轮空间填充设计（15 条补点）"))
A(body(
    "该场景的机理先验与 OCM 体系不同：主路径为甲基单分子氧化生成甲醛，并伴随甲醛连续氧化到一氧化碳"
    "与二氧化碳，同时存在甲基偶联生成乙烷的竞争旁路。因此在数据积累到一定规模前，"
    "系统只提供空间定义与补点建议，不输出预测值。"
))

A(h2("3.8 本地大模型对话"))
A(body(
    "系统内置本地大模型接口，默认使用 qwen2.5:7b，通过本地推理服务调用，不依赖外部网络。"
    "对话用于解释模型结论、梳理实验思路与整理文献线索；模型可读取系统提供的候选、约束与历史数据，"
    "但不直接修改实验条件，所有改动仍需用户在界面上确认。"
))
A(body(
    "当本地推理服务未启动时，相关入口会提示未连接，其余功能不受影响。"
))

# 4 数据与接口
A(h1("数据与接口"))
A(h2("4.1 数据目录"))
A(body("所有实验数据、文献语料与模型文件集中在项目根目录的数据文件夹中，由后端统一加载，"
       "前后端不再各自维护副本。主要文件如下："))
A(table(
    [
        ["文件或目录", "内容"],
        ["OCM_master.xlsx", "实验主表，记录催化剂、负载、流量、光强与产物数据"],
        ["catalysts_v6.json", "催化剂库，含金属、载体、描述符与文献来源"],
        ["kb_extra.json", "参考语料，用于检索与机理对照"],
        ["gas-solid_reactions_*.xlsx", "气固反应分时段记录"],
        ["HCHO_round1_design.xlsx", "HCHO 场景首轮补点设计表"],
        ["bo_recommendations.xlsx", "贝叶斯优化推荐结果"],
        ["layered_wm_ablation.json", "分层世界模型消融实验结果"],
    ],
    [2900, 6202],
))

A(h2("4.2 主要接口"))
A(body("后端提供 REST 接口，前端与外部脚本均可调用。常用接口如下："))
A(table(
    [
        ["接口", "方法", "说明"],
        ["/api/health", "GET", "健康检查与本地模型状态"],
        ["/api/state", "GET", "返回候选池、语料与待复核数量"],
        ["/api/predict", "POST", "输入候选与实测值，返回预测产率、不确定度与迁移估计"],
        ["/api/constraints", "POST", "返回该候选的物理与工艺约束校验结果"],
        ["/api/next", "POST", "主动学习：选出下一组最值得做的实验"],
        ["/api/bo/run", "POST", "运行贝叶斯优化，返回推荐条件表"],
        ["/api/bo/closed-loop", "POST", "纯 BO 网格闭环，输出仍可能推翻当前最优的实验"],
        ["/api/worldmodel/preview", "POST", "世界模型预演：条件到产物的三层结论"],
        ["/api/worldmodel/layered/predict", "POST", "分层模型预测，附邻近插值对照"],
        ["/api/worldmodel/layered/ablation", "GET", "运行留出法消融实验"],
        ["/api/worldmodel/layered/design", "POST", "生成下一轮补点设计表"],
        ["/api/hcho/space", "GET", "HCHO 场景探索空间定义"],
        ["/api/hcho/design", "GET", "HCHO 场景首轮补点表"],
        ["/api/chat", "POST", "调用本地大模型问答"],
        ["/api/datalog", "GET", "实验运行记录列表"],
    ],
    [3300, 1200, 4602],
))

A(h2("4.3 启动方式"))
A(body("系统依赖 Python 3.11 及以上版本与 Node 侧无依赖的静态前端。启动步骤如下："))
A(table(
    [
        ["步骤", "命令", "说明"],
        ["1", "pip install -r wm_backend/requirements.txt", "安装后端依赖"],
        ["2", "ollama pull qwen2.5:7b", "拉取本地大模型（仅对话功能需要）"],
        ["3", "ollama serve", "启动本地推理服务"],
        ["4", "cd wm_backend && ./run.sh", "启动后端，默认监听 127.0.0.1:8000"],
        ["5", "浏览器访问 http://127.0.0.1:8000", "进入系统首页"],
    ],
    [1000, 4400, 3702],
))
A(body("若不启动后端，静态页面仍可打开并浏览已内嵌的数据与场景，但模型推演与 AI 对话不可用。"))

# 5 运行维护
A(h1("运行维护与注意事项"))
A(h2("5.1 环境依赖"))
A(body(
    "后端依赖包括 FastAPI 与其服务器组件、数值计算与机器学习库，以及表格读写库。计算量较大的任务"
    "（例如批量网格搜索与模型训练）应放在同步路由或独立线程中执行，避免阻塞主循环。"
))
A(body(
    "前端页面通过内容分发网络加载绘图库。若现场网络受限，需提前把相关脚本下载到本地"
    "并修改页面引用，否则图表无法正常显示，但数据接口仍可正常返回。"
))

A(h2("5.2 常见问题"))
A(table(
    [
        ["现象", "可能原因", "处理方式"],
        ["页面提示后端未连接", "后端未启动或端口被占用", "确认后端进程与端口，重新启动后刷新页面"],
        ["AI 对话无响应", "本地推理服务未启动或模型未拉取", "启动推理服务并确认模型存在"],
        ["图表为空", "外部脚本加载失败", "检查网络或改为本地引用脚本"],
        ["预演提示无可用数据", "该体系在主表中没有有效实测点", "先按补点表完成实验并回填数据"],
        ["消融结果波动较大", "留出区间样本偏少", "扩大留出区间或补充该区间的实验点"],
    ],
    [2600, 3200, 3302],
))

# 6 附录
A(h1("附录"))
A(h2("6.1 目录结构"))
A(table(
    [
        ["目录", "说明"],
        ["wm_backend/", "后端服务与前端静态页面"],
        ["wm_model/", "优化、动力学、分层模型与数据导出脚本"],
        ["scripts/", "外部材料数据库的数据获取脚本"],
        ["data/", "实验数据、文献语料与模型文件"],
    ],
    [2200, 6902],
))

doc_body = "".join(D)

sect = (
    '<w:sectPr><w:headerReference w:type="default" r:id="rId21"/>'
    '<w:footerReference w:type="default" r:id="rId22"/>'
    '<w:headerReference w:type="first" r:id="rId23"/>'
    '<w:pgSz w:w="11907" w:h="16840"/>'
    '<w:pgMar w:top="1412" w:right="1412" w:bottom="1140" w:left="1412" '
    'w:header="720" w:footer="720" w:gutter="0"/>'
    '<w:pgNumType w:start="1"/><w:cols w:space="720"/><w:titlePg/></w:sectPr>'
)

# 目录页：标题 + 带缓存条目的 TOC 域（Word 打开后可右键更新页码）
_toc_pages = {  # 实测页码（含插图后重排）
    "1 简介": 4, "1.1 编写目的": 4, "1.2 使用对象": 4, "1.3 产品范围": 4, "1.4 术语与缩写": 4,
    "2 产品概述": 4, "2.1 总体架构": 4, "2.2 页面导航": 5,
    "2.3 总览-光催化闭环设计": 5, "2.4 表征分析": 6, "2.5 理论计算": 6,
    "2.6 配方方案": 6, "2.7 数据日志": 7,
    "3 核心功能": 7, "3.1 AI Agent 实时推演": 7, "3.2 世界模型预演": 7,
    "3.3 分层世界模型与消融实验": 7, "3.4 纯 BO 闭环推荐": 10, "3.5 配方调制与导出": 10,
    "3.6 模型推理日志": 10, "3.7 HCHO 场景": 10, "3.8 本地大模型对话": 11,
    "4 数据与接口": 11, "4.1 数据目录": 11, "4.2 主要接口": 12,
    "4.3 启动方式": 12, "5 运行维护与注意事项": 13, "5.1 环境依赖": 13,
    "5.2 常见问题": 13, "6 附录": 13, "6.1 目录结构": 13,
}
toc_cached = "".join(
    toc_entry(lv, t, _toc_pages.get(t, 1)) for lv, t in TOC_ENTRIES
)
toc_field = (
    '<w:p><w:pPr><w:pStyle w:val="TOC"/></w:pPr>'
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r>'
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    "</w:p>"
    + toc_cached
    + "<w:p><w:r><w:fldChar w:fldCharType=\"end\"/></w:r></w:p>"
)

# 目录页：标题 + 域
front = (
    cover
    + p(None, "", page_break=True)
    + p("berschrift1noIndex", "修订历史")
    + hist
    + p("TOC", "目录", page_break=True)
    + toc_field
)

document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:ve="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:o="urn:schemas-microsoft-com:office:office" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
    'xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">'
    "<w:body>" + front + doc_body + sect + "</w:body></w:document>"
)

# 组装 docx
if os.path.exists(OUT):
    os.remove(OUT)
src_docx = "/Users/fenglongli/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_ovglq0xqjsls22_190e/msg/file/2026-07/云曦日历-使用说明.docx"
zin = zipfile.ZipFile(src_docx)
zout = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    name = item.filename
    if name == "word/document.xml":
        zout.writestr(name, document.encode("utf-8"))
    elif name == "word/settings.xml":
        s = zin.read(name).decode("utf-8")
        if "<w:updateFields" not in s:
            s = re.sub(r'(<w:settings[^>]*>)', r'\1<w:updateFields w:val="true"/>', s, count=1)
        zout.writestr(name, s.encode("utf-8"))
    elif name == "word/_rels/document.xml.rels":
        s = zin.read(name).decode("utf-8")
        # 移除原模板里指向已删图片的关系，再追加本文档插图关系
        s = re.sub(r'<Relationship[^>]*relationships/image[^>]*/>', "", s)
        extra = "".join(rel for _fn, rel in IMAGE_RELS)
        s = s.replace("</Relationships>", extra + "</Relationships>")
        zout.writestr(name, s.encode("utf-8"))
    elif name.startswith("word/header"):
        s = zin.read(name).decode("utf-8")
        s = s.replace("<w:t>云曦日历</w:t>", "<w:t>ChemWorldModels</w:t>")
        s = s.replace("<w:t>V</w:t>", "<w:t>V</w:t>")
        s = s.replace("<w:t>2</w:t>", "<w:t>1</w:t>")
        s = s.replace('<w:t xml:space="preserve">.0    </w:t>', '<w:t xml:space="preserve">.0    </w:t>')
        zout.writestr(name, s.encode("utf-8"))
    elif name.startswith("word/media/"):
        continue  # 原模板图片不再引用；本项目插图在循环后单独写入
    elif name == "docProps/core.xml":
        s = zin.read(name).decode("utf-8")
        s = re.sub(r"<dc:title>.*?</dc:title>", "<dc:title>ChemWorldModels 使用说明</dc:title>", s, flags=re.S)
        s = re.sub(r"<dc:subject>.*?</dc:subject>", "<dc:subject>使用说明</dc:subject>", s, flags=re.S)
        s = re.sub(r"<dc:creator>.*?</dc:creator>", "<dc:creator>李逢龙、李思扬、李子艺</dc:creator>", s, flags=re.S)
        s = re.sub(r"<cp:lastModifiedBy>.*?</cp:lastModifiedBy>", "<cp:lastModifiedBy>李逢龙</cp:lastModifiedBy>", s, flags=re.S)
        s = re.sub(r"<dc:description>.*?</dc:description>", "", s, flags=re.S)
        s = re.sub(r"<cp:keywords>.*?</cp:keywords>", "", s, flags=re.S)
        zout.writestr(name, s.encode("utf-8"))
    elif name == "docProps/app.xml":
        s = zin.read(name).decode("utf-8")
        s = re.sub(r"<Company>.*?</Company>", "<Company></Company>", s, flags=re.S)
        s = re.sub(r"<TitlesOfParts>.*?</TitlesOfParts>", "", s, flags=re.S)
        zout.writestr(name, s.encode("utf-8"))
    elif name == "docProps/custom.xml":
        continue
    else:
        zout.writestr(item, zin.read(name))

# 写入插图（二进制）
for _fn, _rel in IMAGE_RELS:
    with open(os.path.join(IMG_DIR, _fn), "rb") as f:
        zout.writestr("word/media/%s" % _fn, f.read())

zout.close()

print("written", OUT, os.path.getsize(OUT))
with zipfile.ZipFile(OUT) as z:
    bad = z.testzip()
    print("zip ok" if bad is None else "bad %s" % bad)
    names = z.namelist()
    print("has document.xml:", "word/document.xml" in names)
    print("entries", len(names))
