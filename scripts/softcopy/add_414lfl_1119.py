#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 data/gas-solid_reactions_414-lfl 里 2026-11-19 新测的负载扫描补进主表。

新增三组条件（Pd–P25、90/10/0 流量、每个条件 3 次注射）：
  3%   100 W
  2%   100 W
  0.5%  90 W

同条件多次注射取均值，一行一个条件；灯功率按标定表换算成 LPD。
"""
from __future__ import annotations

import collections
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path("/Users/fenglongli/Downloads/ChemWorldModel")
SRC = ROOT / "data" / "gas-solid_reactions_414-lfl（每个时间段的六行代表了间隔26min的时间）.xlsx"
DST = ROOT / "data" / "OCM_master.xlsx"

# 新灯标定：20/40/60/80/100 W → 62.42/113.38/163.06/211.47/257.32 mW/cm2
LAMP = [(20, 62.42038), (40, 113.3758), (60, 163.0573), (80, 211.465), (100, 257.3248)]
TARGET_DATE = "2026-11-19"


def lpd_of(watt: float) -> float:
    if watt <= LAMP[0][0]:
        return LAMP[0][1]
    if watt >= LAMP[-1][0]:
        return LAMP[-1][1]
    for i in range(1, len(LAMP)):
        if watt <= LAMP[i][0]:
            w0, l0 = LAMP[i - 1]
            w1, l1 = LAMP[i]
            t = (watt - w0) / (w1 - w0)
            return l0 + t * (l1 - l0)
    return LAMP[-1][1]


def read_new_blocks():
    wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
    ws = wb["0.05%Pd"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    hdr = [str(h or "") for h in rows[0]]
    ix = {h: n for n, h in enumerate(hdr)}

    cur_date = None
    groups = collections.defaultdict(list)
    for r in rows[2:]:
        if not any(v is not None for v in r):
            continue
        if r[ix["date"]] is not None:
            cur_date = str(r[ix["date"]])[:10]
        if cur_date != TARGET_DATE:
            continue
        load = r[ix["Pd%"]]
        watt = r[ix["light_intensity"]]
        ch4, o2, ar = r[ix["flow_CH4"]], r[ix["flow_O2"]], r[ix["flow_Ar"]]
        y = r[ix["p_C2+"]]
        if not all(isinstance(v, (int, float)) for v in (load, watt, ch4, o2, ar)):
            continue
        if not isinstance(y, (int, float)):
            continue
        key = (float(load), float(watt), float(ch4), float(o2), float(ar))
        groups[key].append({
            "y": float(y),
            "sel": r[ix["sel_C2+"]],
            "sel4": r[ix["sel_C2H4"]],
            "sel6": r[ix["sel_C2H6"]],
            "m_cat": r[ix["m_cat"]],
            "cmt": r[ix["comment"]],
            "p4": r[ix["p_C2H4"]],
            "p6": r[ix["p_C2H6"]],
        })

    out = []
    for key, grp in groups.items():
        load, watt, ch4, o2, ar = key
        ys = [g["y"] for g in grp]
        ss = [g["sel"] for g in grp if isinstance(g["sel"], (int, float))]
        out.append({
            "load": load,
            "watt": watt,
            "lpd": round(lpd_of(watt), 1),
            "ch4": ch4,
            "o2": o2,
            "ar": ar,
            "n": len(grp),
            "y": sum(ys) / len(ys),
            "y_max": max(ys),
            "sel": (sum(ss) / len(ss)) if ss else None,
            "m_cat": grp[0]["m_cat"],
        })
    out.sort(key=lambda x: -x["load"])
    return out


def main() -> None:
    blocks = read_new_blocks()
    print(f"{TARGET_DATE} 解析出 {len(blocks)} 个条件：")
    for b in blocks:
        print(f"  {b['load']:>5}%  {b['watt']:>3.0f}W → {b['lpd']:>6.1f} mW/cm²  "
              f"{b['ch4']:.0f}/{b['o2']:.0f}/{b['ar']:.0f}  n={b['n']}  "
              f"y 均值={b['y']:.0f}  最高={b['y_max']:.0f}  sel={b['sel']:.1f}%")

    backup = DST.with_name(f"OCM_master.backup_{datetime.now():%Y%m%d_%H%M%S}.xlsx")
    shutil.copy2(DST, backup)
    print("\n备份:", backup.name)

    wb = openpyxl.load_workbook(DST)
    ws = wb.active
    hdr = [str(c.value or "") for c in ws[1]]
    col = {h: n for n, h in enumerate(hdr)}

    def c(name):
        return col[name] + 1

    i_note = c("文献标题/备注 (comment)")
    i_name = c("催化剂名称")
    i_metal = c("金属")
    i_load = c("负载量/wt% (Pd%)")
    i_sup = c("载体 (sub)")
    i_light_src = c("光源 (light)")
    i_light = c("光强/(mW·cm⁻²) (light_intensity)")
    i_ch4 = c("CH4流量/(mL·min⁻¹) (flow_CH4)")
    i_o2 = c("O2流量/(mL·min⁻¹)（同一批次最好是在同样的浓度下） (flow_O2)")
    i_ar = c("Ar流量/(mL·min⁻¹) (flow_Ar)")
    i_co2 = c("c_O2/%（进料） (c_O2)")
    i_y = c("p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)")
    i_sel = c("C2+选择性/% (sel_C2+)")
    i_sel4 = c("C2H4选择性/% (sel_C2H4)")
    i_sel6 = c("C2H6选择性/% (sel_C2H6)")
    i_mcat = c("催化剂质量/mg (m_cat)") if "催化剂质量/mg (m_cat)" in col else None
    i_srcf = c("源文件 (source_sheet)") if "源文件 (source_sheet)" in col else None

    # 已有条件指纹（负载+流量+光强），避免重复插入
    existing = set()
    seq = 0
    for r in range(2, ws.max_row + 1):
        metal = str(ws.cell(r, i_metal).value or "")
        sup = str(ws.cell(r, i_sup).value or "")
        if "Pd" not in metal or "P25" not in sup:
            continue
        v = ws.cell(r, 1).value
        if isinstance(v, int):
            seq = max(seq, v)
        try:
            existing.add((
                round(float(ws.cell(r, i_load).value), 4),
                round(float(ws.cell(r, i_ch4).value), 1),
                round(float(ws.cell(r, i_o2).value), 1),
                round(float(ws.cell(r, i_ar).value), 1),
                round(float(ws.cell(r, i_light).value), 0),
            ))
        except (TypeError, ValueError):
            continue

    added = 0
    for b in blocks:
        fp = (round(b["load"], 4), round(b["ch4"], 1), round(b["o2"], 1),
              round(b["ar"], 1), round(b["lpd"], 0))
        if fp in existing:
            print(f"  跳过（已存在）：{b['load']}% {b['lpd']} mW/cm²")
            continue
        existing.add(fp)
        seq += 1
        row = ws.max_row + 1
        tot = b["ch4"] + b["o2"] + b["ar"]
        ws.cell(row, 1).value = seq
        ws.cell(row, c("来源")).value = "实验"
        ws.cell(row, i_note).value = f"负载扫描_{TARGET_DATE.replace('-', '')}"
        ws.cell(row, i_name).value = f"{b['load']}%Pd-P25"
        ws.cell(row, i_metal).value = "Pd"
        ws.cell(row, i_load).value = b["load"]
        ws.cell(row, i_sup).value = "P25"
        ws.cell(row, i_light_src).value = "LED100C"
        ws.cell(row, i_light).value = b["lpd"]
        ws.cell(row, i_ch4).value = b["ch4"]
        ws.cell(row, i_o2).value = b["o2"]
        ws.cell(row, i_ar).value = b["ar"]
        ws.cell(row, i_co2).value = round(100.0 * b["o2"] / tot, 2) if tot else None
        ws.cell(row, i_y).value = round(b["y"], 2)
        if b["sel"] is not None:
            ws.cell(row, i_sel).value = round(b["sel"], 2)
            # 估算乙烯/乙烷选择性（按主表既有比例，仅作占位，实测回填后覆盖）
            ws.cell(row, i_sel4).value = None
            ws.cell(row, i_sel6).value = None
        if i_mcat and b["m_cat"] is not None:
            ws.cell(row, i_mcat).value = b["m_cat"]
        if i_srcf:
            ws.cell(row, i_srcf).value = f"0.05%Pd(414-lfl, n={b['n']})"
        added += 1

    wb.save(DST)
    print(f"\n新增 {added} 行，已保存 {DST}")


if __name__ == "__main__":
    main()
