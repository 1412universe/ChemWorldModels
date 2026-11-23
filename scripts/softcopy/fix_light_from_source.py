#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 gas-solid_reactions_314.xlsx 校正 OCM_master.xlsx 的光强，并补齐新增条件。

规则
----
1. 回流_20261106 那 22 行不动（已按新灯标定表改过）。
2. 其余行光强一律取源文件：有 lpd 列用 lpd，只有 light_intensity(W) 的按该灯
   线性关系 433.86/100 W 换算（这台灯的 100 W 实测就是 433.9）。
3. 主表一行 = 源文件一个条件块的多次注射均值，按「负载+流量」分桶后取产率最接近的块。
4. 源文件里主表没有的条件作为新行追加。
5. 追加 m_cat / AQY / comment 三列。
"""
from __future__ import annotations

import collections
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path("/Users/fenglongli/Downloads/ChemWorldModel")
SRC = Path(
    "/Users/fenglongli/Library/Containers/com.tencent.xinWeChat/Data/Documents/"
    "xwechat_files/wxid_ovglq0xqjsls22_190e/msg/file/2026-10/gas-solid_reactions_314.xlsx"
)
DST = ROOT / "data" / "OCM_master.xlsx"

LAMP_OLD_RATIO = 433.86 / 100.0  # 老灯：100 W = 433.86 mW/cm2（线性）
KEEP_BATCH = "回流_20261106"       # 这批已经按新灯标定改过，不动


def parse_blocks(wb) -> list[dict]:
    """把源文件每个 sheet 切成「条件块」：cat 变化即新块。"""
    blocks: list[dict] = []
    for sn in wb.sheetnames:
        ws = wb[sn]
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 3:
            continue
        hdr = [str(h or "") for h in rows[0]]
        ix = {h: n for n, h in enumerate(hdr)}
        if any(k not in ix for k in ("cat", "flow_CH4", "flow_Ar")):
            continue
        io2 = ix.get("flow_O2", ix.get("flow_0.5%O2"))
        if io2 is None:
            continue
        ip = ix.get("p_C2+")
        isel = ix.get("sel_C2+")
        if ip is None:
            continue

        data = [r for r in rows[2:] if any(v is not None for v in r)]
        groups: list[tuple[str, list]] = []
        cur_cat = None
        buf: list = []
        for r in data:
            cat = r[ix["cat"]]
            if cat not in (None, ""):
                if buf:
                    groups.append((cur_cat, buf))
                cur_cat, buf = str(cat), [r]
            elif buf is not None:
                buf.append(r)
        if buf:
            groups.append((cur_cat, buf))

        for cat, grp in groups:
            if not cat or "Pd" not in cat or "P25" not in cat:
                continue
            ys = [r[ip] for r in grp if isinstance(r[ip], (int, float))]
            if not ys:
                continue
            r0 = next((r for r in grp if isinstance(r[ix["flow_CH4"]], (int, float))), None)
            if r0 is None:
                continue
            lpd = r0[ix["lpd"]] if "lpd" in ix and isinstance(r0[ix["lpd"]], (int, float)) else None
            watt = r0[ix["light_intensity"]] if "light_intensity" in ix else None
            if lpd is None and isinstance(watt, (int, float)):
                lpd = LAMP_OLD_RATIO * float(watt)
            if lpd is None or lpd <= 0:
                continue

            ss = [r[isel] for r in grp if isel is not None and isinstance(r[isel], (int, float))]
            blocks.append({
                "sheet": sn,
                "cat": cat,
                "load": float(cat.split("%")[0]),
                "ch4": float(r0[ix["flow_CH4"]]),
                "o2": float(r0[io2]),
                "ar": float(r0[ix["flow_Ar"]]),
                "lpd": round(float(lpd), 2),
                "watt": watt,
                "y": sum(ys) / len(ys),
                "sel": (sum(ss) / len(ss)) if ss else None,
                "n": len(ys),
                "m_cat": r0[ix["m_cat"]] if "m_cat" in ix else None,
                "AQY": r0[ix["AQY"]] if "AQY" in ix else None,
                "comment": r0[ix["comment"]] if "comment" in ix else None,
                "date": r0[ix["date"]] if "date" in ix else None,
            })
    return blocks


def cond_key(load, ch4, o2, ar):
    return (round(float(load), 4), round(float(ch4), 1), round(float(o2), 1), round(float(ar), 1))


def main() -> None:
    backup = DST.with_name(f"OCM_master.backup_{datetime.now():%Y%m%d_%H%M%S}.xlsx")
    shutil.copy2(DST, backup)
    print("备份:", backup.name)

    swb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
    blocks = parse_blocks(swb)
    swb.close()
    print(f"源文件解析条件块 {len(blocks)} 个，有光强 {sum(1 for b in blocks if b['lpd'])}")

    buckets = collections.defaultdict(list)
    for b in blocks:
        buckets[cond_key(b["load"], b["ch4"], b["o2"], b["ar"])].append(b)

    wb = openpyxl.load_workbook(DST)
    ws = wb.active
    hdr = [str(c.value or "") for c in ws[1]]
    col = {h: n for n, h in enumerate(hdr)}

    i_note = col["文献标题/备注 (comment)"]
    i_light = col["光强/(mW·cm⁻²) (light_intensity)"]
    i_load = col["负载量/wt% (Pd%)"]
    i_sup = col["载体 (sub)"]
    i_metal = col["金属"]
    i_ch4 = col["CH4流量/(mL·min⁻¹) (flow_CH4)"]
    i_o2 = col["O2流量/(mL·min⁻¹)（同一批次最好是在同样的浓度下） (flow_O2)"]
    i_ar = col["Ar流量/(mL·min⁻¹) (flow_Ar)"]
    i_cO2 = col["c_O2/%（进料） (c_O2)"]
    i_y = col["p_C2+时空产率/(μmol·g⁻¹·h⁻¹) (p_C2+)"]
    i_sel = col["C2+选择性/% (sel_C2+)"]
    i_sel4 = col["C2H4选择性/% (sel_C2H4)"]
    i_sel6 = col["C2H6选择性/% (sel_C2H6)"]

    # 追加三列
    extra = ["催化剂质量/mg (m_cat)", "AQY/%", "源文件 (source_sheet)"]
    extra_idx = {}
    next_col = len(hdr) + 1
    for name in extra:
        if name not in col:
            ws.cell(1, next_col).value = name
            extra_idx[name] = next_col
            next_col += 1
        else:
            extra_idx[name] = col[name] + 1
    i_mcat = extra_idx["催化剂质量/mg (m_cat)"]
    i_aqy = extra_idx["AQY/%"]
    i_src = extra_idx["源文件 (source_sheet)"]

    # ---- 1) 逐行校正光强 ----
    changed = 0
    unmatched = []
    used_blocks = set()
    for r in range(2, ws.max_row + 1):
        metal = str(ws.cell(r, i_metal + 1).value or "")
        sup = str(ws.cell(r, i_sup + 1).value or "")
        if "Pd" not in metal or "P25" not in sup:
            continue
        note = str(ws.cell(r, i_note + 1).value or "")
        if KEEP_BATCH in note:
            continue

        load = ws.cell(r, i_load + 1).value
        ch4 = ws.cell(r, i_ch4 + 1).value
        o2 = ws.cell(r, i_o2 + 1).value
        ar = ws.cell(r, i_ar + 1).value
        y = ws.cell(r, i_y + 1).value
        if not all(isinstance(v, (int, float)) for v in (load, ch4, o2, ar)):
            continue

        key = cond_key(load, ch4, o2, ar)
        cand = buckets.get(key) or []
        if not cand:
            unmatched.append((r, note[:26], key))
            continue

        if isinstance(y, (int, float)):
            best = min(cand, key=lambda b: abs(b["y"] - y))
        else:
            best = cand[0]
        used_blocks.add(id(best))

        old = ws.cell(r, i_light + 1).value
        ws.cell(r, i_light + 1).value = best["lpd"]
        if isinstance(old, (int, float)) and abs(float(old) - best["lpd"]) > 0.05:
            changed += 1
        elif old is None:
            changed += 1

        if best["m_cat"] is not None:
            ws.cell(r, i_mcat).value = best["m_cat"]
        if best["AQY"] is not None:
            ws.cell(r, i_aqy).value = best["AQY"]
        ws.cell(r, i_src).value = best["sheet"]

    print(f"光强改写/补填 {changed} 行")

    # ---- 2) 追加源文件里主表没有的条件 ----
    master_cond = set()
    for r in range(2, ws.max_row + 1):
        metal = str(ws.cell(r, i_metal + 1).value or "")
        sup = str(ws.cell(r, i_sup + 1).value or "")
        if "Pd" not in metal or "P25" not in sup:
            continue
        load = ws.cell(r, i_load + 1).value
        ch4 = ws.cell(r, i_ch4 + 1).value
        o2 = ws.cell(r, i_o2 + 1).value
        ar = ws.cell(r, i_ar + 1).value
        if all(isinstance(v, (int, float)) for v in (load, ch4, o2, ar)):
            # 用新光强作指纹，避免把已校正行当成新条件
            lpd = ws.cell(r, i_light + 1).value
            master_cond.add(cond_key(load, ch4, o2, ar) + (round(float(lpd or 0), 1),))

    seq = max(
        (v for v in (ws.cell(r, 1).value for r in range(2, ws.max_row + 1)) if isinstance(v, int)),
        default=0,
    )
    added = 0
    for b in blocks:
        k = cond_key(b["load"], b["ch4"], b["o2"], b["ar"]) + (round(b["lpd"], 1),)
        if k in master_cond:
            continue
        master_cond.add(k)
        seq += 1
        row = ws.max_row + 1
        ws.cell(row, 1).value = seq
        ws.cell(row, col["来源"] + 1).value = "实验"
        ws.cell(row, i_note + 1).value = b["cat"]
        ws.cell(row, col["催化剂名称"] + 1).value = b["cat"]
        ws.cell(row, i_metal + 1).value = "Pd"
        ws.cell(row, i_load + 1).value = b["load"]
        ws.cell(row, i_sup + 1).value = "P25"
        ws.cell(row, col["光源 (light)"] + 1).value = "LED100C"
        ws.cell(row, i_light + 1).value = b["lpd"]
        ws.cell(row, i_ch4 + 1).value = b["ch4"]
        ws.cell(row, i_o2 + 1).value = b["o2"]
        ws.cell(row, i_ar + 1).value = b["ar"]
        tot = b["ch4"] + b["o2"] + b["ar"]
        ws.cell(row, i_cO2 + 1).value = round(100.0 * b["o2"] / tot, 2) if tot else None
        ws.cell(row, i_y + 1).value = round(b["y"], 2)
        if b["sel"] is not None:
            ws.cell(row, i_sel + 1).value = round(b["sel"], 2)
        ws.cell(row, i_mcat).value = b["m_cat"]
        if b["AQY"] is not None:
            ws.cell(row, i_aqy).value = b["AQY"]
        ws.cell(row, i_src).value = b["sheet"]
        added += 1
    print(f"追加新条件 {added} 行")

    wb.save(DST)
    print("已保存", DST)

    if unmatched:
        print(f"\n未能匹配 {len(unmatched)} 行（源文件里没有对应条件，保持原值）：")
        for x in unmatched[:10]:
            print("  ", x)


if __name__ == "__main__":
    main()
