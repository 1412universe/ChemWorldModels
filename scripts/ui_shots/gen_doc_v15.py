# -*- coding: utf-8 -*-
"""ChemWorldModels 使用说明 v1.1：15 张真实界面截图 + 人工口吻正文。"""
import os
import re
import zipfile
from xml.sax.saxutils import escape

from PIL import Image

OUT_PROJECT = "/Users/fenglongli/Downloads/ChemWorldModel/软著V1.0/ChemWorldModels-使用说明.docx"
OUT_DESKTOP = "/Users/fenglongli/Downloads/ChemWorldModel/ChemWorldModels-使用说明.docx"
FIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
SRC_DOCX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tpl", "base.docx")

EMU_PER_CM = 360000
_NEXT_RID = [900]
IMAGE_RELS = []
FIG = {}


def image_xml(key, filename, width_cm, desc=""):
    path = os.path.join(FIG_DIR, filename)
    with Image.open(path) as im:
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
        "<pic:pic>"
        '<pic:nvPicPr><pic:cNvPr id="%d" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
        % (cx, cy, _NEXT_RID[0], key, desc, _NEXT_RID[0], key, rid, cx, cy)
    )
    return xml, rel


# 15 张图（全部来自真实界面截图 / 截图裁切）
IMAGES = [
    ("fig01", "fig01_ocm_panel.png", 10.5),
    ("fig02", "fig02_hcho_panel.png", 10.5),
    ("fig03", "fig03_wm_results.png", 12.5),
    ("fig04", "fig04_charts.png", 15.0),
    ("fig05", "fig13_overview_idle.png", 14.5),
    ("fig06", "fig14_overview_running.png", 14.5),
    ("fig07", "fig07_topnav.png", 14.5),
    ("fig08", "fig08_left_loop.png", 7.0),
    ("fig09", "fig09_center_3d.png", 12.0),
    ("fig10", "fig10_right_agent.png", 8.5),
    ("fig11", "fig11_bottom_charts.png", 14.5),
    ("fig12", "fig12_header_controls.png", 14.5),
    ("fig13", "fig15_loop_and_agent.png", 13.0),
    ("fig14", "fig05_overview_photo_full.png", 14.5),
    ("fig15", "fig07_index_510.png", 14.5),
]

for _key, _fn, _w in IMAGES:
    assert os.path.isfile(os.path.join(FIG_DIR, _fn)), _fn
    _xml, _rel = image_xml(_key, _fn, _w)
    FIG[_key] = _xml
    IMAGE_RELS.append((_fn, _rel))


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
    return p("2", t, extra_ppr='<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>')


def body(t):
    return p("af0", t)


def caption(t):
    return p("a3", t)


def table(rows, widths, header=True, border=True):
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


def cover_cell(paras):
    return (
        '<w:tc><w:tcPr><w:tcW w:w="9285" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>'
        + paras
        + "</w:tc>"
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
    + cover_cell(big("ChemWorldModels") + big("使用说明") + meta("") + meta("版本") + meta("1.0"))
    + "</w:tr>"
    + "".join(
        '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="511"/></w:trPr>%s</w:tr>'
        % cover_cell(meta(t))
        for t in [
            "文档状态：正式",
            "作者：李逢龙、李思扬、李子艺",
            "负责人：李逢龙",
            "创建日期：2026 年 11 月 14 日",
            "更新日期：2026 年 11 月 18 日",
        ]
    )
    + "</w:tbl>"
)

hist = table(
    [
        ["日期", "版本", "修改者", "描述"],
        ["2026-11-03", "0.6", "李逢龙", "整理系统模块与实验运行记录相关功能"],
        ["2026-11-05", "0.8", "李逢龙", "补充世界模型、消融实验与 Pd–P25 条件级 BO 说明"],
        ["2026-11-13", "0.9", "李思扬", "补充分层世界模型、HCHO 场景与推理日志说明"],
        ["2026-11-14", "1.0", "李子艺", "完成全书结构统一，按使用说明体例定稿"],
        ["2026-11-18", "1.0", "李逢龙", "增补界面截图至 15 张，按实际页面操作路径整理说明"],
    ],
    [2370, 1440, 2160, 3132],
)

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


# ---------------- 正文（口吻偏现场说明，少套话） ----------------
D = []
A = D.append

A(h1("简介"))
A(body(
    "ChemWorldModels 用来把「看文献 → 猜条件 → 做实验 → 回填数据」这条链路收在一个浏览器工作台里。"
    "后端是 FastAPI，模型侧有微动力学先验、XGBoost 代理模型和分层残差校准；"
    "前端是原生 JS + Three.js，不另起 Node 工程。"
))
A(body(
    "现在日常用的是两条线。一条是甲烷偶联（OCM），主表里 Pd–P25 条件点最多，跑 BO / 主动学习也最熟；"
    "另一条是 ZnO 掺 FeCl₃ 制甲醛（HCHO），这一轮先把 15 维探索空间和首轮补点表摆出来，"
    "产物列等实测回来再填，先验机理单独备着，还没接进代码。"
))

A(h2("1.1 编写目的"))
A(body(
    "写这份说明是为了让实验同学、算法同学和项目负责人能按同一套口径打开页面、读懂输出、"
    "知道数据从哪来、接口怎么调。不是宣传材料，按操作手册写。"
))

A(h2("1.2 使用对象"))
A(body(
    "主要读者三类：① 现场做光催化或产线跑样的人；② 改模型、改 BO、改约束的人；"
    "③ 需要核对数据口径和能力边界的负责人。"
))

A(h2("1.3 产品范围"))
A(body(
    "入口是浏览器。打开后能做：查催化剂池和文献锚点、按条件预演产率/选择性、主动学习挑下一组、"
    "纯 BO 扫网格、导出配方 CSV/JSON、看运行 datalog。硬件驱动在仓库里另有模块，"
    "本说明只覆盖世界模型工作室页面；真机下发另见工站文档。"
))
A(body(
    "注意：界面上的数字再好看，也只是建议。没回填实测、没过约束校验的配方，不要直接当工艺定稿。"
))

A(h2("1.4 术语与缩写"))
A(table(
    [
        ["术语", "含义"],
        ["OCM", "甲烷氧化偶联；本系统里主要指光热催化制 C2 烃"],
        ["HCHO", "甲醛；对应 ZnO 体系上甲烷选择性氧化那条线"],
        ["C2+", "碳数 ≥2 的烃，常见是乙烷、乙烯"],
        ["世界模型", "机理先验 + 数据残差拼起来的可推演模型"],
        ["代理模型（Surrogate）", "描述符进、产率/选择性出的机器学习回归"],
        ["主动学习（AL）", "按不确定度挑下一批实验点"],
        ["贝叶斯优化（BO）", "代理模型 + 采集函数搜条件"],
        ["UCB", "置信上界：μ + β·σ"],
        ["DFT", "密度泛函，给吸附能、能垒一类描述符"],
        ["AQY", "表观量子产率"],
    ],
    [2100, 7002],
))

A(h1("产品概述"))
A(body(
    "布局比较固定：顶栏导航、左侧闭环步骤和采集策略、中间 3D 实验室、右侧 AI Agent、"
    "底下一排产率/选择性/能垒/能带/火山图。条件一改，右侧和底部会跟着刷新；"
    "点「运行」之后，右侧开始按轮次往下推。"
))
A(FIG["fig05"])
A(caption("图 1  总览-光催化闭环设计（空闲态整页）"))
A(FIG["fig07"])
A(caption("图 2  顶部导航：总览-510 / 光催化闭环 / 工作流编辑器"))

A(h2("2.1 总体架构"))
A(table(
    [
        ["层次", "组成", "职责"],
        ["交互层", "总览、表征、DFT、配方、datalog 等页", "改条件、看结果、导出"],
        ["服务层", "FastAPI 路由", "预测、约束、选点、BO、日志"],
        ["模型层", "代理模型 / 微动力学 / 分层 WM / BO", "μ、σ、适用域、推荐表"],
        ["数据层", "主表、催化剂 CSV、laws.csv", "统一数据源，不各写一份"],
    ],
    [1500, 3900, 3702],
))
A(body(
    "模型层一直坚持一件事：先验只给趋势和相对量级，绝对值靠实测锚。"
    "条件跑出训练凸包时，残差权重会往下压，σ 放大，页面上会标成域外——别当高精度用。"
))

A(h2("2.2 页面导航"))
A(body(
    "顶栏三个入口：总览-510、总览-光催化闭环设计、工作流编辑器。"
    "本说明不展开工作流编辑器（节点多、协议细节另文）；其余页可从总览点进，也可直接敲地址。"
))
A(table(
    [
        ["页面", "访问地址", "主要用途"],
        ["总览-光催化闭环设计", "/overview_photo.html", "OCM / HCHO 两条线的主工作台"],
        ["总览-510", "/index.html", "金四面体/MOF 产线视角总览"],
        ["表征分析", "/char.html", "谱图与关键数值对照"],
        ["理论计算", "/dft.html", "DFT、能带、路径示意"],
        ["配方方案", "/recipe.html", "用量与合成步骤"],
        ["数据日志", "/datalog.html", "按工作流归档的运行明细"],
    ],
    [2400, 2500, 4202],
))
A(FIG["fig12"])
A(caption("图 3  工具条：运行 / 世界模型 / 纯 BO / 配方导出 / 采集策略"))

A(h2("2.3 总览-光催化闭环设计"))
A(body(
    "这是光催化线的主页。右上角有「甲烷偶联 OCM」和「ZnO 制 HCHO」两个标签；"
    "切标签时，右侧参数区、补点表和产物口径一起换。左侧是四步闭环（文献→虚拟合成→真实反馈→主动学习），"
    "中间是设备三维场景，底部是本轮曲线。"
))
A(FIG["fig08"])
A(caption("图 4  左侧：世界模型闭环四步与采集策略 β 退火"))
A(FIG["fig09"])
A(caption("图 5  中间：3D 实验室与设备标签（合成 / 反应 / 表征分区）"))
A(body(
    "约束区会把当前候选扫一遍，分成可做、高风险、别做。约束阈值都在 data/laws.csv，"
    "改阈值不用改 Python。"
))
A(FIG["fig06"])
A(caption("图 6  运行中整页：迭代推进后左侧评价与右侧决策同步更新"))

A(h2("2.4 表征分析"))
A(body(
    "表征页把 XRD、UV-Vis、PL、EPR 一类结果按样品收在一起，方便和文献里同体系对照。"
    "结论会回写到候选卡片，推演时能看见，不当主目标用，当旁证。"
))

A(h2("2.5 理论计算"))
A(body(
    "DFT 页看吸附能、能垒剖面、能带。Pd(111) 相关输入在 wm_model/dft_pd111/，"
    "批量提交脚本在 OCM_DFT_batch/。算出来的量主要进微动力学描述符，不直接当产率。"
))

A(h2("2.6 配方方案"))
A(body(
    "配方页把推荐条件落成可照着配的表：金属/载体、负载、前驱体量、溶剂、焙烧。"
    "导出 CSV 或 JSON，字段尽量跟实验记录表对齐，少做一次手工抄写。"
))

A(h2("2.7 数据日志"))
A(body(
    "每次工作流运行会落到 data/Datalog_Workflow/ 下的 xlsx：一个工作流一份表，一行一次运行。"
    "datalog 页左侧选批次，右侧看节点耗时、称量、移液、报错。对账时以这份表为准。"
))

A(h1("核心功能"))
A(body(
    "下面按实际点按钮的顺序写。数据是一份，模型是一套——新回填的点会影响后面所有推荐，"
    "所以别在主表里随手改历史行。"
))
A(FIG["fig13"])
A(caption("图 7  左侧闭环与右侧 Agent 对照（运行态裁切）"))

A(h2("3.1 AI Agent 实时推演"))
A(body(
    "右侧栏就是 Agent。跑起来之后能看见：本轮选了谁、策略是 explore / exploit / balance、"
    "约束过没过、跟上轮差在哪。本地 qwen2.5:7b 只允许从候选池里挑 id，"
    "幻觉出来的 id 在 /api/next 会被丢掉，回退到确定性 UCB。"
))
A(FIG["fig01"])
A(caption("图 8  OCM 场景右侧面板：7B 决策来源、候选卡片与机理摘要"))
A(FIG["fig10"])
A(caption("图 9  运行态右侧 Agent 区域裁切"))
A(body(
    "栏里也可以问「这条约束为什么挂了」「这个选择性怎么来的」。"
    "回答只能依据当前上下文，不会去编 DOI。"
))

A(h2("3.2 世界模型预演"))
A(body(
    "点工具条「世界模型」。输入金属、载体、CH4/O2/Ar、进料氧、负载、光照；"
    "输出 p_C2+、sel_C2+、区间，以及可做/高风险/别做。"
))
A(body("结果按三层并排，方便对打："))
A(table(
    [
        ["层次", "作用", "怎么读"],
        ["经验层", "主表邻近点加权", "做过的条件贴近实测；没做过就是邻域插值"],
        ["世界模型层", "微动力学特征 + 物理约束", "出凸包也能给方向，别当精确值"],
        ["主动学习层", "高不确定度补点", "告诉你下一枪往哪打更值"],
    ],
    [1700, 4300, 3102],
))
A(FIG["fig03"])
A(caption("图 10  世界模型预演弹层：三层结论与物理约束"))
A(body(
    "三层打架时听约束的。约束不过，预测再高也提示别做。"
    "弹层里会列出邻近实测点，方便你自己核对。"
))

A(h2("3.3 分层世界模型与消融实验"))
A(body(
    "分层模型把链路拆开：气路（设定→实际流量）、光照（功率→相对光功率）、"
    "反应器（先验 Ridge + 残差 GBDT）、最后换算成时空产率。每层带版本和 σ，"
    "以后单独标定气路/光照时不用整网重训。"
))
A(body(
    "反应器是 prior + residual：先拟合粗趋势，再学 log y 残差；"
    "离训练点越远，残差混得越少。消融接口会按负载留出，对比 table_knn / prior_only / prior_residual，"
    "指标写进 data/layered_wm_ablation.json。"
))
A(caption("表 1  消融三种对照"))
A(table(
    [
        ["做法", "说明", "我们观察到的表现"],
        ["纯邻近插值", "只找相似条件加权", "密区还行，新负载区误差明显变大"],
        ["仅机理先验", "不学残差", "外推稳一点，但系统性偏差去不掉"],
        ["先验加残差", "按距离收缩残差", "外推和局部精度折中最好用"],
    ],
    [1900, 4200, 3002],
))

A(h2("3.4 纯 BO 闭环推荐"))
A(body(
    "勾上「纯 BO 模式」或调 /api/bo/closed-loop。在流量、功率、负载、质量网格上扫一遍，"
    "按 UCB 排序，把「还有可能掀翻当前最优」的点列出来。Pd–P25 还有条件级推荐："
    "选择性硬门槛（默认 μ_sel≥60）过不了直接剔，再用产率排序。"
))
A(body(
    "推荐表分利用和探索。利用钉在已证实高产区；探索把负载×流量×光功率×质量拉开。"
    "文件一般是 data/bo_recommendations.xlsx。"
))
A(FIG["fig04"])
A(caption("图 11  底部图表区：产率、选择性、能垒、能带、火山"))
A(FIG["fig11"])
A(caption("图 12  底部图表区整页裁切（运行态）"))

A(h2("3.5 配方调制与导出"))
A(body(
    "导出前会再跑一遍约束。温度、压力、用量越界的会在文件里标出来，"
    "避免把明显做不了的单子带进台面。"
))

A(h2("3.6 模型推理日志"))
A(body(
    "每次 /api/next 落一条记录，产物在 data/log/：时间线 HTML、候选对比 HTML、周报 CSV。"
    "HTML 自包含，拷走也能打开。用来看同一候选多轮预测有没有漂。"
))

A(h2("3.7 HCHO 场景"))
A(body(
    "切到「ZnO 制 HCHO」。光源固定 365 nm。页面上能看到 15 个自变量的范围、单位、档位，"
    "以及首轮 15 条补点（data/HCHO_round1_design.xlsx）。这一轮故意不接预测模型——"
    "没产物回流硬拟合没有意义。"
))
A(FIG["fig02"])
A(caption("图 13  HCHO 场景：探索空间与首轮 15 条补点表"))
A(body(
    "机理上跟 OCM 不是同一套：主路径偏甲基单分子氧化到甲醛，后面还有连续氧化到 CO/CO₂，"
    "旁路才是偶联出乙烷。先验备选方案写在仓库根目录的 Markdown 里，拍板后再进代码。"
))

A(h2("3.8 本地大模型对话"))
A(body(
    "默认 Ollama + qwen2.5:7b，走本机，不依赖外网。对话解释结论、整理思路可以；"
    "改实验条件仍要你在界面上点确认。Ollama 没开时，相关入口变红，其他页面照常用。"
))

A(h1("数据与接口"))
A(h2("4.1 数据目录"))
A(body(
    "运行时数据统一在项目根 data/。后端 app/data.py 解析顺序："
    "环境变量 WM_DATA_DIR → 项目根 data/ → 旧的 wm_backend/data。"
))
A(table(
    [
        ["文件或目录", "内容"],
        ["OCM_master.xlsx", "实验主表（流量、光强、p_C2+、sel 等）"],
        ["catalysts.csv", "催化剂池（优先于 json 回退）"],
        ["laws.csv", "约束阈值与最优条件系数，单一真相源"],
        ["HCHO_round1_design.xlsx", "HCHO 首轮补点"],
        ["bo_recommendations.xlsx", "BO 推荐结果"],
        ["layered_wm_ablation.json", "分层模型消融"],
        ["Datalog_Workflow/", "工作流运行 xlsx"],
        ["log/", "推理日志 HTML / CSV"],
    ],
    [2900, 6202],
))

A(h2("4.2 主要接口"))
A(body("常用 REST 如下（完整列表以路由代码为准）："))
A(table(
    [
        ["接口", "方法", "说明"],
        ["/api/health", "GET", "健康检查 + 本地模型状态"],
        ["/api/state", "GET", "候选池、语料计数"],
        ["/api/predict", "POST", "产率 / 不确定度"],
        ["/api/constraints", "POST", "物理约束校验"],
        ["/api/next", "POST", "主动学习选下一个"],
        ["/api/bo/run", "POST", "BO 推荐表"],
        ["/api/bo/closed-loop", "POST", "网格闭环证明"],
        ["/api/worldmodel/preview", "POST", "三层预演"],
        ["/api/worldmodel/layered/predict", "POST", "分层校准预测"],
        ["/api/worldmodel/layered/ablation", "GET", "留出消融"],
        ["/api/hcho/space", "GET", "HCHO 空间定义"],
        ["/api/hcho/design", "GET", "HCHO 首轮补点"],
        ["/api/chat", "POST", "本地大模型问答"],
        ["/api/datalog", "GET", "运行记录列表"],
    ],
    [3300, 1200, 4602],
))

A(h2("4.3 启动方式"))
A(table(
    [
        ["步骤", "命令", "说明"],
        ["1", "pip install -r wm_backend/requirements.txt", "装后端依赖"],
        ["2", "ollama pull qwen2.5:7b && ollama serve", "只要对话/7B 策略才必须"],
        ["3", "cd wm_backend && ./run.sh", "默认 127.0.0.1:8000"],
        ["4", "浏览器打开 http://127.0.0.1:8000", "进首页"],
    ],
    [1000, 4400, 3702],
))
A(body(
    "不启后端也能双击打开部分静态页看布局，但预测和对话会挂。"
    "若公司代理把 localhost 拦了，浏览器会报 ERR_CONNECTION_REFUSED，"
    "把 127.0.0.1 加进代理旁路再试。"
))
A(FIG["fig14"])
A(caption("图 14  光催化闭环总览整页（空闲态，后端已连接时）"))
A(FIG["fig15"])
A(caption("图 15  总览页另一视角整页截图（含运行过程中的状态条）"))

A(h1("运行维护与注意事项"))
A(h2("5.1 环境依赖"))
A(body(
    "Python 建议 3.11+。重活（网格 BO、消融）别堵在事件循环里硬扛；"
    "前端图表脚本若现场没外网，提前下到 static/assets/vendor/。"
))

A(h2("5.2 常见问题"))
A(table(
    [
        ["现象", "可能原因", "处理"],
        ["提示后端未连接", "uvicorn 没起 / 端口占用 / 代理拦 localhost", "看 /api/health；旁路 127.0.0.1"],
        ["AI 对话无响应", "Ollama 没起或没拉模型", "ollama serve；ollama list 确认"],
        ["图表空白", "vendor 脚本没加载到", "检查网络或改本地引用"],
        ["预演提示无数据", "该金属/载体主表几乎没点", "先按补点表做一批再回填"],
        ["消融波动大", "留出区间太稀", "补该负载的点，或放宽留出"],
    ],
    [2600, 3200, 3302],
))

A(h1("附录"))
A(h2("6.1 目录结构"))
A(table(
    [
        ["目录", "说明"],
        ["wm_backend/", "FastAPI + 静态前端 + gn_adapter"],
        ["wm_model/", "动力学、分层 WM、BO、回流脚本"],
        ["wm_action/", "GN 510 OPC UA 设备驱动"],
        ["scripts/", "MP/OQMD 拉取、界面截图与文档生成"],
        ["data/", "主表、法则、推荐表、日志（默认不进 git）"],
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

_toc_pages = {
    "1 简介": 4, "1.1 编写目的": 4, "1.2 使用对象": 4, "1.3 产品范围": 4, "1.4 术语与缩写": 4,
    "2 产品概述": 5, "2.1 总体架构": 5, "2.2 页面导航": 6,
    "2.3 总览-光催化闭环设计": 6, "2.4 表征分析": 8, "2.5 理论计算": 8,
    "2.6 配方方案": 8, "2.7 数据日志": 8,
    "3 核心功能": 9, "3.1 AI Agent 实时推演": 9, "3.2 世界模型预演": 10,
    "3.3 分层世界模型与消融实验": 11, "3.4 纯 BO 闭环推荐": 12, "3.5 配方调制与导出": 13,
    "3.6 模型推理日志": 13, "3.7 HCHO 场景": 13, "3.8 本地大模型对话": 14,
    "4 数据与接口": 14, "4.1 数据目录": 14, "4.2 主要接口": 15,
    "4.3 启动方式": 15, "5 运行维护与注意事项": 16, "5.1 环境依赖": 16,
    "5.2 常见问题": 16, "6 附录": 16, "6.1 目录结构": 16,
}
toc_cached = "".join(toc_entry(lv, t, _toc_pages.get(t, 1)) for lv, t in TOC_ENTRIES)
toc_field = (
    '<w:p><w:pPr><w:pStyle w:val="TOC"/></w:pPr>'
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r>'
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    "</w:p>"
    + toc_cached
    + '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
)

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


def write_docx(path):
    if os.path.exists(path):
        os.remove(path)
    zin = zipfile.ZipFile(SRC_DOCX)
    zout = zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED)
    for item in zin.infolist():
        name = item.filename
        if name == "word/document.xml":
            zout.writestr(name, document.encode("utf-8"))
        elif name == "word/settings.xml":
            s = zin.read(name).decode("utf-8")
            if "<w:updateFields" not in s:
                s = re.sub(r"(<w:settings[^>]*>)", r'\1<w:updateFields w:val="true"/>', s, count=1)
            zout.writestr(name, s.encode("utf-8"))
        elif name == "word/_rels/document.xml.rels":
            s = zin.read(name).decode("utf-8")
            s = re.sub(r"<Relationship[^>]*relationships/image[^>]*/>", "", s)
            extra = "".join(rel for _fn, rel in IMAGE_RELS)
            s = s.replace("</Relationships>", extra + "</Relationships>")
            zout.writestr(name, s.encode("utf-8"))
        elif name.startswith("word/header"):
            s = zin.read(name).decode("utf-8")
            s = s.replace("<w:t>云曦日历</w:t>", "<w:t>ChemWorldModels</w:t>")
            s = s.replace("<w:t>2</w:t>", "<w:t>1</w:t>")
            zout.writestr(name, s.encode("utf-8"))
        elif name.startswith("word/media/"):
            continue
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
    for _fn, _rel in IMAGE_RELS:
        with open(os.path.join(FIG_DIR, _fn), "rb") as f:
            zout.writestr("word/media/%s" % _fn, f.read())
    zout.close()
    with zipfile.ZipFile(path) as z:
        bad = z.testzip()
        assert bad is None, bad
    print("written", path, os.path.getsize(path))


write_docx(OUT_PROJECT)
try:
    write_docx(OUT_DESKTOP)
except Exception as e:
    print("desktop write failed:", e)
    # fallback copy
    import shutil
    try:
        shutil.copy2(OUT_PROJECT, OUT_DESKTOP)
        print("copied to desktop", OUT_DESKTOP)
    except Exception as e2:
        print("copy failed:", e2)

print("figures", len(IMAGES))
