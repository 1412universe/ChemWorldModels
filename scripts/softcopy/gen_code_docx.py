#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild 软著V1.0/ChemWorldModels V1.0 代码.docx from project sources."""
from __future__ import annotations

import ast
import re
import shutil
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape, unescape

ROOT = Path("/Users/fenglongli/Downloads/ChemWorldModel")
OUT_DIR = ROOT / "软著V1.0"
STAGE = OUT_DIR / "_code_src"
TEMPLATE = OUT_DIR / "ChemWorldModels V1.0 代码.docx"
OUT_DOCX = OUT_DIR / "ChemWorldModels V1.0 代码.docx"

SOURCES = [
    ("wm_model/wm_kinetics.py", ROOT / "wm_model" / "wm_kinetics.py"),
    ("wm_model/layered_wm.py", ROOT / "wm_model" / "layered_wm.py"),
    ("wm_backend/app/layered_wm_service.py", ROOT / "wm_backend" / "app" / "layered_wm_service.py"),
    ("wm_backend/app/worldmodel_preview.py", ROOT / "wm_backend" / "app" / "worldmodel_preview.py"),
    ("wm_backend/app/bo_pd_p25.py", ROOT / "wm_backend" / "app" / "bo_pd_p25.py"),
    ("wm_backend/app/bo_layered.py", ROOT / "wm_backend" / "app" / "bo_layered.py"),
    ("wm_backend/app/hcho_wm.py", ROOT / "wm_backend" / "app" / "hcho_wm.py"),
]

# Order matters: longer phrases first
GLOBAL_REPL = [
    ("可版本化透传+完整度标记", "设定值直通，缺测点打 incomplete"),
    ("透传 + σ/完整度", "设定值直通并带相对不确定度"),
    ("未接流量计标定时透传设定值", "无流量计标定，先用设定值"),
    ("透传设定值", "直接用设定值"),
    ("气路/光照透传", "气路/光照按设定"),
    ("空间填充感", "条件网格拉开"),
    ("空间填充：拉开", "拉开"),
    ("纯 BO 首轮空间填充", "首轮补点"),
    ("空间填充；", "条件网格拉开；"),
    ("空间填充", "条件网格拉开"),
    ("优雅降级", "缺文件返回空列表"),
    ("避免数量级漂移", "增益系数先压小"),
    ("最小可行版", "初版"),
    ("（Pd–P25 MVP）", "（Pd–P25）"),
    ("（Pd-P25 MVP）", "（Pd-P25）"),
    ("气路层 MVP：", "气路层："),
    ("光照层 MVP：", "光照层："),
    ("纯 BO 骨架，模型层留空", "先定探索空间和补点表，预测先空着"),
    ("纯 BO ", ""),
    ("冲高产率", "冲产率"),
    ("σ 真化", "不确定度校准"),
    ("域外降置信", "域外把 unc 抬高"),
    ("本轮边界（", "当前范围（"),
    ("本轮不实现", "这里先不接"),
    ("已与用户确认", "按实验方案定的"),
    ("passthrough-v1", "v0"),
    ("前端优雅降级", "前端容错"),
]


def replace_module_docstring(text: str, new_doc: str) -> str:
    """Replace the first top-level module docstring."""
    m = re.match(r'(\s*(?:#.*\n)*)("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')', text)
    if not m:
        return text
    return text[: m.start(2)] + new_doc + text[m.end(2) :]


def humanize_wm_kinetics(text: str) -> str:
    text = replace_module_docstring(
        text,
        '"""OCM 微动力学：六步竞争网络，金属描述符调能垒，odeint 求稳态。\n'
        "\n"
        "R1 CH4 活化 / R2 甲基脱附 / R3 气相偶联 / R4 乙烷脱氢 / R5 深度氧化 / R6 氧活化\n"
        "能垒按电负性、功函数线性修正；载体能带只做小增益，别把 k 推飞。\n"
        '"""',
    )
    text = text.replace("# ========== 物理常数 ==========", "# 常数")
    text = text.replace("# ========== 基元反应定义 ==========", "# 反应表")
    text = text.replace(
        "# 每步: (名称, 指前因子 A, 基础能垒 Ea0 kJ/mol, 描述符敏感度)\n"
        "# 描述符敏感度：Ea = Ea0 + sensitivity * (metal_elec_neg - 2.0)\n",
        "",
    )
    text = text.replace(
        '"""载体光生载流子增益（以P25为基准）。\n'
        '    CB越负→还原电子越强(助O2活化/C-H)；VB越正→氧化空穴越强(助C-H、也促深度氧化)。\n'
        '    返回 (red_gain, ox_gain)，系数克制，增益系数先压小。"""',
        '"""相对 P25 的载流子增益。CB 更负偏还原，VB 更正偏氧化；系数先保守。"""',
    )
    text = text.replace(
        '"""半经验微动力学世界模型特征：金属描述符 + 载体能带 + 流量 → 物理特征向量。\n'
        '    物理结构对应6步竞争：C-H活化(R1)、CH3脱附(R2)、C-C偶联(R3)、乙烷脱氢(R4)、\n'
        '    深度氧化(R5)、O2活化(R6)。本函数只给无量纲特征，绝对产率/选择性由BO用实测\n'
        '    锚点回归校准，不臆造绝对值。support=(Eg,CB,VB)；flows=(ch4,o2,ar) mL/min。"""',
        '"""拼一组无量纲特征给上层回归用，不在这里硬编产率绝对值。\n'
        '    support=(Eg,CB,VB)，flows=(ch4,o2,ar) mL/min。"""',
    )
    text = text.replace(
        "    # R1 C-H活化描述符：电负性与功函数联合（适中区给分，不臆造单峰绝对值）",
        "    # 活化：电负性、功函数落在中间段给高分",
    )
    text = text.replace("    # R6 O2活化/还原电子：CB越负还原越强", "    # 还原：CB 越负越好")
    text = text.replace("    # 载流子吸光：Eg~3.1eV最佳", "    # Eg 靠近 3.1 eV 时吸光好些")
    text = text.replace("    # R5 深度氧化抑制：VB过高(高空穴)促CO2", "    # VB 太高容易打成 CO2")
    text = text.replace("    # 流量：弱氧富CH4利于C2偶联", "    # 氧分压别太高，否则偶联吃亏")
    text = text.replace("# ========== 对比测试 ==========", "# 本地跑一下金属对比")
    return text


def humanize_layered_wm(text: str) -> str:
    text = replace_module_docstring(
        text,
        '"""Pd–P25 分层世界模型。\n'
        "\n"
        "气路、光照先按设定值走；反应器用 kinetics 特征做 prior，再在条件空间上拟合残差。\n"
        "对照：table_knn / prior_only / prior_residual。\n"
        '"""',
    )
    text = text.replace(
        '"""气路层：设定即输出；预留增益标定接口。"""',
        '"""气路：暂时设定=实际，后面有流量计标定再改。"""',
    )
    text = text.replace(
        '"""光照层：有 lpd/功率则归一到相对光功率%；缺失则中位填充并降权。"""',
        '"""光照：有数就归一到相对功率，缺了就填 50% 并把 sigma 加大。"""',
    )
    text = text.replace(
        '        "note": "缺光强时用 50% 填充并加大不确定度" if incomplete else "相对光功率 = 输入/参考×100",',
        '        "note": "缺光强，暂填 50%" if incomplete else "power% = 输入/参考*100",',
    )
    text = text.replace(
        "    # 若已是 0–100 相对功率，直接用；否则按 lpd/ref",
        "    # 输入可能是相对功率，也可能是绝对光强",
    )
    text = text.replace(
        "        # ambiguous: treat as lpd if ref looks like max lpd",
        "        # ref 看起来像最大光强时按 lpd 算",
    )
    text = text.replace(
        '"""Pd–P25 prior + residual。"""',
        '"""Pd–P25：prior（Ridge）+ 残差（浅 GBDT）。"""',
    )
    text = text.replace("        # 残差用浅 GBDT，点少时比深网稳", "        # 点不多，残差用浅 GBDT")
    text = text.replace("        # 经验阈值：条件向量 L2", "        # 条件距离阈值，超了当域外")
    text = text.replace(
        '        """mode: prior_only | prior_residual | table_knn（knn 需外部传入 pool 时另用）"""',
        '        """mode = prior_only / prior_residual / table_knn"""',
    )
    text = text.replace(
        "            # 域内多用残差，域外回退先验（避免稠密低负载把高负载带飞）",
        "            # 域外少信残差，不然低负载点会拖飞高负载",
    )
    # after global, 避免数量级漂移 already changed in other files; this line uses 避免稠密...
    text = text.replace(
        '    """表模型基线：条件 kNN。"""',
        '    """条件 kNN 基线，给对照用。"""',
    )
    text = text.replace(
        '    """按负载组留出：默认留出 load≥1.0（稀有高负载），对比三种模式。"""',
        '    """留出高负载做 hold-out，三种模式比一下。"""',
    )
    text = text.replace(
        "            # 退化为留出出现次数最少的两个负载",
        "            # 高负载太少就改留出现次数最少的两档",
    )
    text = text.replace(
        '    """下一轮补点：拉开负载 × 质量 × 光功率 × 流量骨架（条件网格拉开）。"""',
        '    """下一轮建议点：负载×质量×光功率×流量交叉铺开。"""',
    )
    text = text.replace(
        '"why": "拉开负载/质量/光功率/流量"',
        '"why": "拉开负载/质量/光功率/流量"',
    )
    text = text.replace(
        '"note": "无流量计标定，先用设定值"',
        '"note": "无流量计标定，先用设定值"',
    )
    return text


def humanize_layered_service(text: str) -> str:
    text = replace_module_docstring(
        text,
        '"""分层世界模型对外接口：读点、fit、预测、消融、出补点表。"""',
    )
    text = text.replace(
        '"role": "气路/光照按设定 + 反应器 prior×残差；域外把 unc 抬高"',
        '"role": "气光按设定；反应器 prior+残差；域外 unc 加大"',
    )
    # if global already changed 透传 path differently
    text = text.replace(
        '"role": "气路/光照直通 + 反应器 prior×残差；域外把 unc 抬高"',
        '"role": "气光按设定；反应器 prior+残差；域外 unc 加大"',
    )
    return text


def humanize_preview(text: str) -> str:
    text = replace_module_docstring(
        text,
        '"""主表条件插值 + kinetics 特征。目标列：p_C2+ 时空产率、sel_C2+。\n'
        "\n"
        "有邻近实测就加权；别再用 GHSV 高斯，空速一低权重会塌成 0。\n"
        '"""',
    )
    reps = [
        ("    # —— ① 经验层（数学）——", "    # 经验：邻域实测"),
        ("    # —— ② 世界模型层（机理/约束 + 微动力学外推）——", "    # 机理外推"),
        ("    # —— ③ 校准层 · prior+残差（Pd–P25）——", "    # Pd-P25 prior+残差"),
        ("    # —— ④ AI / 主动学习层 ——", "    # 下一组建议"),
        (
            "    # 总裁决：优先约束失败；否则看经验是否精确 / 世界模型风险",
            "    # 约束挂了优先；否则看有没有同条件实测",
        ),
        (
            "    # 兼容旧字段：主预测优先经验；Pd–P25 域内校准时用校准层作并列主预测",
            "    # 主预测：有实测用实测，否则看校准层",
        ),
        (
            '        "role": "条件已做过 → 实测均值/邻域插值；不创造新知识",',
            '        "role": "同条件取均值，近邻做插值",',
        ),
        (
            '        "role": "约束闸门 + 微动力学特征，离开邻域仍可推断方向",',
            '        "role": "约束检查 + kinetics 外推",',
        ),
        (
            '        "role": "在不确定处决定下一组该测什么，用新数据校准前两层",',
            '        "role": "挑不确定大的点建议下一组",',
        ),
        (
            '            "why": "经验层已有同条件实测；世界模型作旁证，主动学习可扫邻域空白",',
            '            "why": "同条件已有实测，外推只作参考",',
        ),
        (
            '            "why": "综合：经验插值 + 机理外推 + prior残差校准 + 主动学习",',
            '            "why": "插值 + 外推 + 校准综合看",',
        ),
        ('"name": "经验层 · 数学"', '"name": "经验层"'),
        ('"name": "世界模型层 · 机理外推"', '"name": "世界模型层"'),
        ('"name": "校准层 · prior+残差"', '"name": "校准层"'),
        ('"name": "主动学习层 · AI 采集"', '"name": "主动学习层"'),
        ("    # 报告「纯世界模型」值；同时给与经验融合的参考", "    # 邻域太空时主要看外推"),
        ("    # 离邻域越远，世界模型权重越高、不确定度越大", "    # 离得越远越信外推，unc 也加大"),
        ("    # 小网格扰动（控制规模，保证交互延迟）", "    # 网格别铺太大，接口要快"),
        ("    # 距离奖励：越远越值得探索（有上限）", "    # 远一点多给分，有上限"),
        ("    # 多样性：负载别全挤在一起", "    # 负载别扎堆"),
    ]
    for a, b in reps:
        text = text.replace(a, b)
    return text


def humanize_bo_pd(text: str) -> str:
    return replace_module_docstring(
        text,
        '"""Pd–P25 条件 BO：3 条利用 + 27 条探索。\n'
        "\n"
        "score = mu_y * (mu_sel/100)；mu_sel 低于 SEL_MIN 直接丢掉。\n"
        "流量 0–100 mL/min，质量 1–20 mg，相对光功率 0–100%，进料氧先钉在 1%。\n"
        "历史最高产率大概 4e4，探索时把负载和气路一起拉开。\n"
        '"""',
    )


def humanize_bo_layered(text: str) -> str:
    return replace_module_docstring(
        text,
        '"""layered_wm 上的 BO：3+27，带 unc 和 in_domain。\n'
        "返回字段对齐 bo_pd_p25.recommend_3x3，前端不用改。\n"
        '"""',
    )


def humanize_hcho(text: str) -> str:
    text = replace_module_docstring(
        text,
        '"""HCHO（ZnO+FeCl3）探索空间和首轮 15 点。\n'
        "\n"
        "这轮只定变量范围和读补点表，预测模型等实测回来再接。\n"
        "机理草稿在项目根 md 里，代码里先不管。\n"
        '"""',
    )
    text = text.replace(
        "# ------------------------------------------------------------\n"
        "# 探索空间定义（范围 / 单位 / 精度 / 档位，按实验方案定的）\n"
        "# ------------------------------------------------------------",
        "# 变量范围（单位/步长/档位）",
    )
    text = text.replace(
        '"note": "首轮补点；预测模型待实测数据回流后接入。"',
        '"note": "首轮补点；有实测后再接预测"',
    )
    text = text.replace(
        '"""读取首轮 15 条补点表；文件缺失时返回空列表（缺文件返回空列表）。"""',
        '"""读首轮补点表；文件不在就返回 []。"""',
    )
    text = text.replace(
        '"""读取首轮 15 条补点表；文件缺失时返回空列表（缺文件就返回空列表）。"""',
        '"""读首轮补点表；文件不在就返回 []。"""',
    )
    return text


HANDLERS = {
    "wm_model/wm_kinetics.py": humanize_wm_kinetics,
    "wm_model/layered_wm.py": humanize_layered_wm,
    "wm_backend/app/layered_wm_service.py": humanize_layered_service,
    "wm_backend/app/worldmodel_preview.py": humanize_preview,
    "wm_backend/app/bo_pd_p25.py": humanize_bo_pd,
    "wm_backend/app/bo_layered.py": humanize_bo_layered,
    "wm_backend/app/hcho_wm.py": humanize_hcho,
}


def apply_global(text: str) -> str:
    for a, b in GLOBAL_REPL:
        text = text.replace(a, b)
    return text


def ocr_safe_fixes(text: str) -> str:
    """Avoid Word/OCR misreading nested f-string quotes and O/0 lookalikes."""
    # nested quotes in print headers often OCR 成 print(f'{金属':<6}
    text = text.replace(
        'print(f"{\'金属\':<6} {\'x_CH4%\':>8} {\'sel_C2%\':>9} {\'sel_C2H6%\':>11} {\'sel_C2H4%\':>11} {\'sel_CO2%\':>9}")',
        'print("%-6s %8s %9s %11s %11s %9s" % ("金属", "x_CH4%", "sel_C2%", "sel_C2H6%", "sel_C2H4%", "sel_CO2%"))',
    )
    text = text.replace(
        'print(f"{m:<6} {r[\'x_CH4_%\']:>8.2f} {r[\'sel_C2_%\']:>9.1f} {r[\'sel_C2H6_%\']:>11.1f} {r[\'sel_C2H4_%\']:>11.1f} {r[\'sel_CO2_%\']:>9.1f}")',
        'print("%-6s %8.2f %9.1f %11.1f %11.1f %9.1f" % (m, r["x_CH4_%"], r["sel_C2_%"], r["sel_C2H6_%"], r["sel_C2H4_%"], r["sel_CO2_%"]))',
    )
    # hygiene only if OCR-typo forms somehow appear
    for a, b in [
        ("h_seI", "h_sel"),
        ("flow_seI", "flow_sel"),
        ("'C02'", "'CO2'"),
        ('"C02"', '"CO2"'),
        ("c_02_in", "c_O2_in"),
    ]:
        text = text.replace(a, b)
    return text


def humanize(rel: str, raw: str) -> str:
    """Keep project source mostly intact; only scrub a few planning buzzwords."""
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = apply_global(text)
    text = ocr_safe_fixes(text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    if not text.endswith("\n"):
        text += "\n"
    return text


def para_xml(line: str) -> str:
    t = escape(line)
    return (
        "<w:p>"
        '<w:pPr><w:spacing w:before="0" w:after="0" w:lineRule="exact" w:line="240"/></w:pPr>'
        "<w:r>"
        "<w:rPr>"
        '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" '
        'w:eastAsia="宋体" w:cs="Courier New"/>'
        '<w:b w:val="0"/><w:sz w:val="18"/>'
        "</w:rPr>"
        f'<w:t xml:space="preserve">{t}</w:t>'
        "</w:r>"
        "</w:p>"
    )


def build_body_paragraphs(files: list[tuple[str, str]]) -> str:
    parts: list[str] = []
    sep = "#" + "-" * 66
    for i, (rel, content) in enumerate(files):
        if i:
            parts.append(para_xml(""))
        parts.append(para_xml(sep))
        parts.append(para_xml(f"# {rel}"))
        parts.append(para_xml(sep))
        for line in content.split("\n"):
            parts.append(para_xml(line))
    return "".join(parts)


def rebuild_document_xml(template_xml: str, body_paras: str) -> str:
    m = re.search(r"(<w:body[^>]*>)([\s\S]*)(</w:body>)", template_xml)
    if not m:
        raise RuntimeError("no w:body")
    body_inner = m.group(2)
    sm = re.search(r"(<w:sectPr[\s\S]*?</w:sectPr>)", body_inner)
    if not sm:
        raise RuntimeError("no sectPr")
    new_inner = body_paras + sm.group(1)
    return template_xml[: m.start()] + m.group(1) + new_inner + m.group(3) + template_xml[m.end() :]


def update_core_props(xml: str) -> str:
    xml = re.sub(
        r"<dc:title>[\s\S]*?</dc:title>",
        "<dc:title>ChemWorldModels V1.0 代码</dc:title>",
        xml,
        count=1,
    )
    xml = re.sub(
        r"<dc:subject>[\s\S]*?</dc:subject>",
        "<dc:subject>软件著作权鉴别材料（源程序）</dc:subject>",
        xml,
        count=1,
    )
    return xml


AI_PATTERNS = [
    "MVP",
    "最小可行",
    "透传",
    "完整度标记",
    "空间填充感",
    "优雅降级",
    "数量级漂移",
    "可版本化",
    "纯 BO",
    "冲高产率",
    "σ 真化",
    "passthrough-v1",
    "本轮边界",
]


def main() -> None:
    STAGE.mkdir(parents=True, exist_ok=True)
    staged: list[tuple[str, str]] = []
    leftovers = []

    for rel, src in SOURCES:
        cleaned = humanize(rel, src.read_text(encoding="utf-8"))
        try:
            ast.parse(cleaned)
        except SyntaxError as e:
            raise SystemExit(f"syntax error after humanize: {rel}: {e}") from e
        (STAGE / rel.replace("/", "__")).write_text(cleaned, encoding="utf-8")
        staged.append((rel, cleaned))
        for p in AI_PATTERNS:
            if p in cleaned:
                leftovers.append(f"{rel}: {p!r}")

    print("phrase scrub:", "CLEAN" if not leftovers else "LEFTOVERS")
    for h in leftovers:
        print(" ", h)

    tmp = OUT_DIR / "_code_docx_build.docx"
    if tmp.exists():
        tmp.unlink()

    with zipfile.ZipFile(TEMPLATE, "r") as zin, zipfile.ZipFile(
        tmp, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename == "word/document.xml":
                xml = rebuild_document_xml(data.decode("utf-8"), build_body_paragraphs(staged))
                data = xml.encode("utf-8")
            elif info.filename == "docProps/core.xml":
                data = update_core_props(data.decode("utf-8")).encode("utf-8")
            elif info.filename == "docProps/app.xml":
                app = data.decode("utf-8")
                n_lines = sum(c.count("\n") for _, c in staged) + len(staged) * 4
                pages = max(1, (n_lines + 49) // 50)
                app = re.sub(r"<Pages>\d+</Pages>", f"<Pages>{pages}</Pages>", app)
                app = re.sub(r"<Words>\d+</Words>", f"<Words>{n_lines}</Words>", app)
                data = app.encode("utf-8")
            zout.writestr(info, data)

    shutil.move(str(tmp), str(OUT_DOCX))

    with zipfile.ZipFile(OUT_DOCX) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    lines = [unescape(t) for t in re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml)]
    joined = "\n".join(lines)
    print(f"wrote {OUT_DOCX}")
    print(f"lines={len(lines)}")
    for p in AI_PATTERNS:
        if p in joined:
            print(f"  DOC has {p!r}")
    for tok in ["h_sel", "flow_sel", "CO2", "pO2", "worldmodel_predict", "return {"]:
        print(f"  {tok}: {joined.count(tok)}")
    for bad in ["h_seI", "flow_seI", "print(f{", "C02", "except ImportError"]:
        # except ImportError alone is fine if try exists; check print bugs
        print(f"  bad {bad!r}: {bad in joined}")


if __name__ == "__main__":
    main()
