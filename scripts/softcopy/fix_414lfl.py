#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补齐 414-lfl 批次的产率，并修正剩余 9 行光强。

两件事
------
1. gas-solid_414-lfl 那 8 行（2026-10-29 测）光强是 100 W，按老灯线性
   433.86/100 换算成 433.9；同时把源文件里的产率/选择性填进去。
2. 1106 那 22 行光强已按新灯改好，但产率为空；从源文件取三次注射均值填入。
3. 行 581（x_O2 批次、flows 132/102/4.6）源文件里是扫描点、无产率，
   光强标记为缺失，不参与训练。
"""
from __future__ import annotations

import collections
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path("/Users/fenglongli/Downloads/ChemWorldModel")
DST = ROOT / "data" / "OCM_master.xlsx"
WX = Path(
    "/Users/fenglongli/Library/Containers/com.tencent.xinWeChat/Data/Documents/"
    "xwechat_files/wxid_ovglq0xqjsls22_190e/msg/file/2026-11"
)
SRC414 = WX / "gas-solid_reactions_414-lfl（每个时间段的六行代表了间隔26min的时间）.xlsx"

OLD_RATIO = 433.86 / 100.0   # 老灯 100 W = 433.86 mW/cm2


def load_blocks_414():
    """414-lfl 的 0.05%Pd：按条件聚合多次注射。"""
    wb = openpyxl.load_workbook(SRC414, data_only=True, read_only=True)
    ws = wb["0.05%Pd"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}
    groups = collections.defaultdict(list)
    for r in rows[2:]:
        if not isinstance(r[ix["light_intensity"]], (int, float)):
            continue
        if not all(isinstance(r[ix[k]], (int, float)) for k in ("Pd%", "flow_CH4", "flow_O2", "flow_Ar")):
            continue
        key = (
            round(float(r[ix["Pd%"]]), 4),
            round(float(r[ix["flow_CH4"]]), 1),
            round(float(r[ix["flow_O2"]]), 1),
            round(float(r[ix["flow_Ar"]]), 1),
            int(round(float(r[ix["light_intensity"]]))),
        )
        groups[key].append(r)
    out = {}
    for key, grp in groups.items():
        ys = [g[ix["p_C2+"]] for g in grp if isinstance(g[ix["p_C2+"]], (int, float))]
        ss = [g[ix["sel_C2+"]] for g in grp if isinstance(g[ix["sel_C2+"]], (int, float))]
        out[key] = {
            "n": len(grp),
            "y": sum(ys) / len(ys) if ys else None,
            "sel": sum(ss) / len(ss) if ss else None,
            "sheet": "0.05%Pd(414-lfl)",
        }
    wb.close()
    return out


def main() -> None:
    backup = DST.with_name(f"OCM_master.backup_{datetime.now():%Y%m%d_%H%M%S}.xlsx")
    shutil.copy2(DST, backup)
    print("备份:", backup.name)

    blocks = load_blocks_414()
    print(f"414-lfl 条件组 {len(blocks)} 个")

    wb = openpyxl.load_workbook(DST)
    ws = wb.active
    hdr = [str(c.value or "") for c in ws[1]]
    col = {h: n for n, h in enumerate(hdr)}
    i_note = col["文献标题/备注 (comment)"]
    i_light = col["光强/(mW·cm⁻²) (light_intensity)"]
    i_load = col["负载量/wt% (Pd%)"]
    i_metal = col["金属"]
    i_sup = col["载体 (sub)"]
    i_ch4 = col["CH4流量/(mL·min⁻¹) (flow_CH4)"]
    i_o2 = col["O2流量/(mL·min⁻¹)（同一批次最好是在同样的浓度下） (flow_O2)"]
    i_ar = col["Ar流量/(mL·min⁻¹) (flow_Ar)"]
    i_y = col["p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)"]
    i_sel = col["C2+选择性/% (sel_C2+)"]
    i_src = col["源文件 (source_sheet)"] if "源文件 (source_sheet)" in col else None

    fixed_light = filled_y = cleared = 0

    for r in range(2, ws.max_row + 1):
        metal = str(ws.cell(r, i_metal + 1).value or "")
        sup = str(ws.cell(r, i_sup + 1).value or "")
        if "Pd" not in metal or "P25" not in sup:
            continue
        note = str(ws.cell(r, i_note + 1).value or "")
        load = ws.cell(r, i_load + 1).value
        ch4 = ws.cell(r, i_ch4 + 1).value
        o2 = ws.cell(r, i_o2 + 1).value
        ar = ws.cell(r, i_ar + 1).value
        light = ws.cell(r, i_light + 1).value
        y = ws.cell(r, i_y + 1).value

        if not all(isinstance(v, (int, float)) for v in (load, ch4, o2, ar)):
            continue

        # --- x_O2 扫描点：无产率、无光强，标记缺失 ---
        if note.startswith("x_O2"):
            if light == 100 and y is None:
                ws.cell(r, i_light + 1).value = None
                if i_src:
                    ws.cell(r, i_src).value = "x_O2(扫描点,无产率)"
                cleared += 1
            continue

        # --- gas-solid_414-lfl：100 W → 433.9，并补产率 ---
        if note.startswith("gas-solid_414"):
            key = (round(float(load), 4), round(float(ch4), 1), round(float(o2), 1), round(float(ar), 1), 100)
            b = blocks.get(key)
            if b is None:
                print(f"  行{r} 未在 414-lfl 找到 {key}")
                continue
            new_lpd = round(b["y"] and OLD_RATIO * 100 or OLD_RATIO * 100, 2)
            ws.cell(r, i_light + 1).value = round(OLD_RATIO * 100, 2)
            fixed_light += 1
            if b["y"] is not None:
                ws.cell(r, i_y + 1).value = round(b["y"], 2)
            if b["sel"] is not None:
                ws.cell(r, i_sel + 1).value = round(b["sel"], 2)
            if i_src:
                ws.cell(r, i_src).value = b["sheet"]
            filled_y += 1

    # --- 1106：补产率（三次注射均值） ---
    for r in range(2, ws.max_row + 1):
        metal = str(ws.cell(r, i_metal + 1).value or "")
        sup = str(ws.cell(r, i_sup + 1).value or "")
        if "Pd" not in metal or "P25" not in sup:
            continue
        note = str(ws.cell(r, i_note + 1).value or "")
        if "20261106" not in note:
            continue
        load = ws.cell(r, i_load + 1).value
        ch4 = ws.cell(r, i_ch4 + 1).value
        o2 = ws.cell(r, i_o2 + 1).value
        ar = ws.cell(r, i_ar + 1).value
        light = ws.cell(r, i_light + 1).value
        if not all(isinstance(v, (int, float)) for v in (load, ch4, o2, ar, light)):
            continue
        watt = int(round(float(light) / (257.3248 / 100.0)))
        key = (round(float(load), 4), round(float(ch4), 1), round(float(o2), 1), round(float(ar), 1), watt)
        b = blocks.get(key)
        if b and b["y"] is not None and ws.cell(r, i_y + 1).value is None:
            ws.cell(r, i_y + 1).value = round(b["y"], 2)
            if b["sel"] is not None:
                ws.cell(r, i_sel + 1).value = round(b["sel"], 2)
            if i_src:
                ws.cell(r, i_src).value = b["sheet"]
            filled_y += 1

    print(f"414-lfl 光强修正 {fixed_light} 行；补产率 {filled_y} 行；x_O2 扫描点清空 {cleared} 行")
    wb.save(DST)
    print("已保存", DST)


if __name__ == "__main__":
    main()
