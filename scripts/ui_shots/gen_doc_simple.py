#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按「云曦日历-使用说明」体例生成 ChemWorldModels 使用说明：短句、配图、版本 1.0。"""
from __future__ import annotations

import os
import re
import shutil
import zipfile
from xml.sax.saxutils import escape

from PIL import Image

ROOT = "/Users/fenglongli/Downloads/ChemWorldModel"
FIG_DIR = os.path.join(ROOT, "scripts/ui_shots/out")
SRC_DOCX = os.path.join(ROOT, "scripts/ui_shots/_tpl/base.docx")
OUT_DOCX = os.path.join(ROOT, "软著V1.0/ChemWorldModels-使用说明.docx")

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
        % (cx, cy, _NEXT_RID[0], key, escape(desc), _NEXT_RID[0], key, rid, cx, cy)
    )
    return xml, rel


# 15 张真实界面图
IMAGES = [
    ("fig01", "fig13_overview_idle.png", 14.0),       # 主界面
    ("fig02", "fig07_topnav.png", 14.0),               # 顶部导航
    ("fig03", "fig12_header_controls.png", 14.0),     # 工具条
    ("fig04", "fig08_left_loop.png", 7.5),             # 左侧闭环
    ("fig05", "fig09_center_3d.png", 12.0),            # 三维实验室
    ("fig06", "fig11_bottom_charts.png", 14.0),        # 底部图表
    ("fig07", "fig01_ocm_panel.png", 10.5),            # OCM
    ("fig08", "fig02_hcho_panel.png", 10.5),           # HCHO
    ("fig09", "fig03_wm_results.png", 12.5),           # 世界模型
    ("fig10", "fig10_right_agent.png", 8.5),           # AI 助手
    ("fig11", "fig14_overview_running.png", 14.0),     # 运行中
    ("fig12", "fig15_loop_and_agent.png", 13.0),       # 闭环+助手
    ("fig13", "fig04_charts.png", 14.0),               # 结果曲线
    ("fig14", "fig05_overview_photo_full.png", 14.0),  # 整页
    ("fig15", "fig07_index_510.png", 14.0),            # 510 总览
]

for _key, _fn, _w in IMAGES:
    assert os.path.isfile(os.path.join(FIG_DIR, _fn)), _fn
    _xml, _rel = image_xml(_key, _fn, _w)
    FIG[_key] = _xml
    IMAGE_RELS.append((_fn, _rel))


def p(style=None, text="", bold=False, center=False, page_break=False, sz=None):
    ppr = ""
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    if page_break:
        ppr += "<w:pageBreakBefore/>"
    if center:
        ppr += '<w:jc w:val="center"/>'
    rpr_extra = "<w:b/>" if bold else ""
    if sz:
        rpr_extra += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (sz, sz)
    rpr = (
        '<w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" '
        'w:cs="宋体" w:hint="eastAsia"/>%s</w:rPr>' % rpr_extra
    )
    if text == "":
        return "<w:p><w:pPr>%s</w:pPr></w:p>" % ppr
    return (
        "<w:p><w:pPr>%s</w:pPr><w:r>%s<w:t xml:space=\"preserve\">%s</w:t></w:r></w:p>"
        % (ppr, rpr, escape(text))
    )


def h1(t, page_break=False):
    return p("1", t, page_break=page_break)


def h2(t):
    return p("2", t)


def body(t):
    # 首行缩进，接近手写说明习惯
    return (
        '<w:p><w:pPr><w:pStyle w:val="af0"/>'
        '<w:ind w:firstLineChars="200" w:firstLine="480"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" '
        'w:cs="宋体" w:hint="eastAsia"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
        '<w:t xml:space="preserve">%s</w:t></w:r></w:p>' % escape(t)
    )


def caption(t):
    return p("a3", t, center=True)


def toc_line(t):
    return p("af0", t)


def table(rows, widths, header=True):
    grid = "".join('<w:gridCol w:w="%d"/>' % w for w in widths)
    tblpr = (
        '<w:tblPr><w:tblW w:w="%d" w:type="dxa"/><w:tblInd w:w="78" w:type="dxa"/>'
        "<w:tblBorders>"
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        "</w:tblBorders><w:tblLayout w:type=\"fixed\"/></w:tblPr>"
    ) % sum(widths)
    out = ["<w:tbl>%s<w:tblGrid>%s</w:tblGrid>" % (tblpr, grid)]
    for ri, row in enumerate(rows):
        out.append("<w:tr>")
        for ci, cell in enumerate(row):
            bold = header and ri == 0
            out.append(
                '<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>%s</w:tc>'
                % (widths[ci], p(None, str(cell), bold=bold, sz=21))
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
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:hint="eastAsia"/>'
        '<w:b/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr><w:t>%s</w:t></w:r></w:p>' % escape(t)
    )


def meta(t):
    return (
        '<w:p><w:pPr><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体" w:hint="eastAsia"/>'
        '<w:sz w:val="21"/></w:rPr><w:t>%s</w:t></w:r></w:p>' % escape(t)
    )


cover = (
    '<w:tbl><w:tblPr><w:tblW w:w="9285" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    '<w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar>'
    "</w:tblPr><w:tblGrid><w:gridCol w:w=\"9285\"/></w:tblGrid>"
    + '<w:tr><w:trPr><w:trHeight w:val="2800"/></w:trPr>'
    + cover_cell(big("ChemWorldModels V1.0") + big("使用说明") + meta("") + meta("版本") + meta("1.0"))
    + "</w:tr>"
    + "".join(
        '<w:tr><w:trPr><w:trHeight w:val="480"/></w:trPr>%s</w:tr>' % cover_cell(meta(t))
        for t in [
            "文档状态：正式",
            "作者：李逢龙、李思扬、李子艺",
            "负责人：李逢龙",
            "创建日期：2026年11月14日",
            "更新日期：2026年11月18日",
        ]
    )
    + "</w:tbl>"
)

hist_title = h1("修订历史", page_break=True)
hist = table(
    [
        ["日期", "版本", "修改者", "描述"],
        ["2026-11-03", "0.6", "李逢龙", "整理系统模块与实验运行记录相关功能"],
        ["2026-11-05", "0.8", "李逢龙", "补充世界模型、消融实验与 Pd–P25 条件级 BO 说明"],
        ["2026-11-13", "0.9", "李思扬", "补充分层世界模型、HCHO 场景与推理日志说明"],
        ["2026-11-14", "1.0", "李子艺", "完成全书结构统一，按使用说明体例定稿"],
        ["2026-11-18", "1.0", "李逢龙", "增补界面截图至 15 张，按实际页面操作路径整理说明"],
    ],
    [2100, 1200, 1800, 4000],
)

toc = (
    h1("目录", page_break=True)
    + toc_line("1 简介")
    + toc_line("    1.1 编写目的")
    + toc_line("    1.2 使用对象")
    + toc_line("    1.3 产品范围")
    + toc_line("2 产品概述")
    + toc_line("    2.1 主界面")
    + toc_line("    2.2 顶部导航")
    + toc_line("    2.3 工具条")
    + toc_line("    2.4 左侧闭环步骤")
    + toc_line("    2.5 中间三维实验室")
    + toc_line("    2.6 底部结果图表")
    + toc_line("3 主要功能")
    + toc_line("    3.1 切换实验场景")
    + toc_line("    3.2 甲烷偶联（OCM）")
    + toc_line("    3.3 制甲醛（HCHO）")
    + toc_line("    3.4 世界模型预演")
    + toc_line("    3.5 AI 助手")
    + toc_line("    3.6 运行推演")
    + toc_line("    3.7 配方导出")
    + toc_line("    3.8 总览-510")
)

body_xml = "".join(
    [
        cover,
        p(None, ""),
        hist_title,
        hist,
        toc,
        # ---- 1 简介 ----
        h1("简介", page_break=True),
        body(
            "ChemWorldModels是一款面向光催化实验的软件。打开后可以在浏览器里查看实验条件，"
            "预估产率和选择性，挑选下一组要做的实验，并把推荐条件导出成配方表。"
        ),
        h2("1.1 编写目的"),
        body("本文档为使用说明文档，为产品的使用与维护提供信息基础。"),
        h2("1.2 使用对象"),
        body("本文档的使用对象主要为产品测试与使用人员。"),
        h2("1.3 产品范围"),
        body(
            "本软件通过浏览器使用。用户可以切换甲烷偶联和制甲醛两条实验线，查看三维实验室场景，"
            "用世界模型预估结果，并根据提示选择下一组实验条件。"
        ),
        # ---- 2 产品概述 ----
        h1("产品概述", page_break=True),
        h2("2.1 主界面："),
        body(
            "启动软件并打开光催化闭环页面后，即可看到主界面。"
            "上方是导航和工具按钮，左边是实验闭环步骤，中间是三维实验室，右边是AI助手，底部是结果图表。"
        ),
        FIG["fig01"],
        caption("图表 1"),
        h2("2.2 顶部导航："),
        body("点击顶部的「总览-510」「总览-光催化闭环设计」或「工作流编辑器」，可以切换不同页面。"),
        FIG["fig02"],
        caption("图表 2"),
        h2("2.3 工具条："),
        body(
            "主界面上方工具条提供常用操作。点击「运行」开始推演，点击「世界模型」查看预估结果，"
            "也可切换纯BO模式或导出配方。"
        ),
        FIG["fig03"],
        caption("图表 3"),
        h2("2.4 左侧闭环步骤："),
        body(
            "左侧按顺序显示文献检索、虚拟合成、真实反馈、主动学习四个步骤。"
            "运行后，当前步骤会高亮，方便查看做到哪一步。"
        ),
        FIG["fig04"],
        caption("图表 4"),
        h2("2.5 中间三维实验室："),
        body("中间区域是三维实验室场景，可旋转查看合成、反应、表征等设备位置。"),
        FIG["fig05"],
        caption("图表 5"),
        h2("2.6 底部结果图表："),
        body("底部显示产率、选择性、能垒、能带等相关图表。条件变化后，这里的曲线会跟着更新。"),
        FIG["fig06"],
        caption("图表 6"),
        # ---- 3 主要功能 ----
        h1("主要功能", page_break=True),
        h2("3.1 切换实验场景："),
        body(
            "在主界面右上角，点击「甲烷偶联 OCM」或「ZnO 制 HCHO」，即可切换实验场景。"
            "切换后，右侧参数区和补点表会一起更换。"
        ),
        h2("3.2 甲烷偶联（OCM）："),
        body(
            "切换到OCM场景后，右侧会显示金属、载体、流量、负载、光照等条件，以及候选结果卡片。"
            "可直接修改条件，或按系统提示选择下一组实验。"
        ),
        FIG["fig07"],
        caption("图表 7"),
        h2("3.3 制甲醛（HCHO）："),
        body(
            "切换到HCHO场景后，可以看到变量范围和首轮补点表。"
            "这一场景先用于安排实验点，产物数据等实测回来后再填写。"
        ),
        FIG["fig08"],
        caption("图表 8"),
        h2("3.4 世界模型预演："),
        body(
            "点击工具条中的「世界模型」，输入或确认实验条件后，即可查看产率和选择性的预估结果。"
            "页面会同时给出经验参考、机理外推和下一组建议，方便对照。"
        ),
        FIG["fig09"],
        caption("图表 9"),
        h2("3.5 AI 助手："),
        body(
            "右侧AI助手会显示本轮选择的候选、是否通过约束，以及简单说明。"
            "也可以在对话框里提问，例如某条约束为什么不通过。"
        ),
        FIG["fig10"],
        caption("图表 10"),
        h2("3.6 运行推演："),
        body(
            "点击「运行」后，左侧步骤和右侧助手会按轮次更新。"
            "可以一边看闭环进度，一边查看当前推荐。"
        ),
        FIG["fig11"],
        caption("图表 11"),
        body("左侧闭环与右侧助手对照如下。"),
        FIG["fig12"],
        caption("图表 12"),
        body("底部结果区在运行过程中也会同步刷新。"),
        FIG["fig13"],
        caption("图表 13"),
        h2("3.7 配方导出："),
        body(
            "确认推荐条件后，点击工具条中的配方导出，即可保存为表格文件，"
            "方便带到实验台对照使用。"
        ),
        FIG["fig14"],
        caption("图表 14"),
        h2("3.8 总览-510："),
        body("如需查看产线总览，可点击顶部「总览-510」进入对应页面。"),
        FIG["fig15"],
        caption("图表 15"),
        p(None, ""),
        body("以上即为ChemWorldModels V1.0的主要使用方法。"),
    ]
)


def rebuild():
    tmp = OUT_DOCX + ".tmp"
    if os.path.exists(tmp):
        os.remove(tmp)

    with zipfile.ZipFile(SRC_DOCX, "r") as zin:
        with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            media_written = set()
            for info in zin.infolist():
                data = zin.read(info.filename)
                name = info.filename

                if name == "word/document.xml":
                    xml = data.decode("utf-8")
                    m = re.search(r"(<w:body[^>]*>)([\s\S]*)(</w:body>)", xml)
                    if not m:
                        raise RuntimeError("no body")
                    sm = re.search(r"(<w:sectPr[\s\S]*?</w:sectPr>)", m.group(2))
                    if not sm:
                        raise RuntimeError("no sectPr")
                    new_body = m.group(1) + body_xml + sm.group(1) + m.group(3)
                    xml = xml[: m.start()] + new_body + xml[m.end() :]
                    # 拼接后再注入：缺 a/pic 时 Word 打开会把图清掉
                    if "xmlns:a=" not in xml:
                        xml = xml.replace(
                            "<w:document ",
                            '<w:document xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                            'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ',
                            1,
                        )
                    if "xmlns:a=" not in xml:
                        raise RuntimeError("failed to inject drawing namespaces")
                    data = xml.encode("utf-8")

                elif name == "word/_rels/document.xml.rels":
                    rels = data.decode("utf-8")
                    parts = re.findall(r"<Relationship[^/]*/>", rels)
                    keep = []
                    for part in parts:
                        if 'Target="media/' in part or "Target='media/" in part:
                            continue
                        keep.append(part)
                    for _fn, rel in IMAGE_RELS:
                        keep.append(rel)
                    inner = "".join(keep)
                    rels = re.sub(
                        r"(<Relationships[^>]*>)[\s\S]*?(</Relationships>)",
                        r"\1" + inner + r"\2",
                        rels,
                    )
                    data = rels.encode("utf-8")

                elif name == "[Content_Types].xml":
                    ct = data.decode("utf-8")
                    if 'Extension="png"' not in ct and "Extension='png'" not in ct:
                        ct = ct.replace(
                            "</Types>",
                            '<Default Extension="png" ContentType="image/png"/></Types>',
                        )
                    data = ct.encode("utf-8")

                elif name.startswith("word/media/"):
                    continue

                elif name == "docProps/core.xml":
                    core = data.decode("utf-8")
                    core = re.sub(
                        r"<dc:title>[\s\S]*?</dc:title>",
                        "<dc:title>ChemWorldModels V1.0 使用说明</dc:title>",
                        core,
                        count=1,
                    )
                    core = re.sub(
                        r"<dc:subject>[\s\S]*?</dc:subject>",
                        "<dc:subject>使用说明</dc:subject>",
                        core,
                        count=1,
                    )
                    data = core.encode("utf-8")

                zout.writestr(info, data)

            for fn, _rel in IMAGE_RELS:
                if fn in media_written:
                    continue
                with open(os.path.join(FIG_DIR, fn), "rb") as f:
                    zout.writestr("word/media/%s" % fn, f.read())
                media_written.add(fn)

    shutil.move(tmp, OUT_DOCX)
    print("wrote", OUT_DOCX, "size", os.path.getsize(OUT_DOCX))


if __name__ == "__main__":
    rebuild()
    # verify
    with zipfile.ZipFile(OUT_DOCX) as z:
        media = [n for n in z.namelist() if n.startswith("word/media/")]
        xml = z.read("word/document.xml").decode("utf-8")
    print("media count", len(media))
    print("图表 count", xml.count("图表 "))
    print("has version 1.0", "1.0" in xml)
    print("no API section", "/api/" not in xml)
    print("no 术语", "术语与缩写" not in xml)
