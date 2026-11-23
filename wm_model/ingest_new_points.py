# -*- coding: utf-8 -*-
"""
新实验数据回流脚本
- 读 gas-solid_reactions_414-lfl.xlsx 的 0.05%Pd sheet
- 转成主表格式，算 CH4 转化率
- 检测异常点标记 is_failure
- 去重 append 到 OCM_master.xlsx
- 重训 LayeredWorldModel
- 输出下一轮 BO 推荐表
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime
from collections import Counter

_ROOT = Path(__file__).resolve().parent.parent
_DATA = _ROOT / "data"
_WM = Path(__file__).resolve().parent
sys.path.insert(0, str(_WM))

import numpy as np
import openpyxl
from openpyxl.styles import Font, PatternFill

from layered_wm import LayeredWorldModel, design_fill_points

NEW_XLSX = _DATA / "gas-solid_reactions_414-lfl（每个时间段的六行代表了间隔26min的时间）.xlsx"
NEW_SHEET = "0.05%Pd"
MASTER_XLSX = _DATA / "OCM_master.xlsx"
BO_REC_XLSX = _DATA / "bo_recommendations_new.xlsx"

# 主表列索引（1-based）
COL = {
    "seq": 1, "source": 2, "comment": 3, "doi": 4, "cat_name": 5,
    "metal": 6, "load": 7, "sub": 8, "light": 9, "lpd": 10,
    "temp": 11, "flow_ch4": 12, "flow_o2": 13, "c_o2_in": 14, "flow_ar": 15,
    "c_c2h4": 16, "c_c2h6": 17, "c_co2": 18, "c_o2_out": 19, "p_c2": 20,
    "x_ch4": 21, "sel_c2": 22, "sel_c2h4": 23, "sel_c2h6": 24,
}


def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def row_to_master(row: dict) -> dict:
    """把新 xlsx 的一行转成主表 dict。"""
    ch4 = _safe_float(row.get("flow_CH4"))
    o2 = _safe_float(row.get("flow_O2"))
    ar = _safe_float(row.get("flow_Ar"))
    total = ch4 + o2 + ar
    load = _safe_float(row.get("Pd%"))
    sub = row.get("sub") or "P25"
    lpd = _safe_float(row.get("light_intensity"))
    m_cat = _safe_float(row.get("m_cat"))

    # 出口浓度 ppm
    c_co = _safe_float(row.get("c_CO"))
    c_co2 = _safe_float(row.get("c_CO2"))
    c_c2h4 = _safe_float(row.get("c_C2H4"))
    c_c2h6 = _safe_float(row.get("c_C2H6"))

    # CH4 转化率 = (c_CO + c_CO2 + 2*c_C2H4 + 2*c_C2H6) / (入口CH4摩尔分数 * 1e6) * 100
    in_ch4_ppm = (ch4 / total) * 1e6 if total > 0 else 1
    consumed_c = c_co + c_co2 + 2 * c_c2h4 + 2 * c_c2h6
    x_ch4 = consumed_c / in_ch4_ppm * 100 if in_ch4_ppm > 0 else 0

    sel_c2 = _safe_float(row.get("sel_C2+"))
    sel_c2h4 = _safe_float(row.get("sel_C2H4"))
    sel_c2h6 = _safe_float(row.get("sel_C2H6"))

    # 异常检测
    is_failure = False
    fail_reason = []
    if x_ch4 <= 0 or x_ch4 > 50:
        is_failure = True
        fail_reason.append(f"转化率异常({x_ch4:.2f}%)")
    if sel_c2 <= 0 or sel_c2 > 100:
        is_failure = True
        fail_reason.append(f"C2选择性异常({sel_c2:.1f}%)")
    if consumed_c < 1:
        is_failure = True
        fail_reason.append("出口碳信号过低")

    return {
        "metal": "Pd",
        "load": load,
        "sub": sub,
        "light": row.get("light") or "LED100C",
        "lpd": lpd,
        "flow_ch4": ch4,
        "flow_o2": o2,
        "c_o2_in": row.get("c_O2"),
        "flow_ar": ar,
        "c_c2h4": c_c2h4,
        "c_c2h6": c_c2h6,
        "c_co2": c_co2,
        "x_ch4": round(x_ch4, 4),
        "sel_c2": round(sel_c2, 2),
        "sel_c2h4": round(sel_c2h4, 2),
        "sel_c2h6": round(sel_c2h6, 2),
        "m_cat": m_cat,
        "is_failure": is_failure,
        "fail_reason": "; ".join(fail_reason),
    }


def read_new_data() -> list[dict]:
    """读新 xlsx 的 0.05%Pd sheet，返回 dict list。"""
    wb = openpyxl.load_workbook(str(NEW_XLSX), data_only=True)
    ws = wb[NEW_SHEET]
    headers = [c.value for c in ws[1]]
    rows = []
    for r in range(3, ws.max_row + 1):  # row2 是单位行，跳过
        row_dict = {}
        for i, h in enumerate(headers):
            row_dict[h] = ws.cell(r, i + 1).value
        if row_dict.get("Pd%") is None:
            continue
        rows.append(row_dict)
    return rows


def load_master_points() -> list[dict]:
    """从主表读所有有效点，转成 layered_wm 需要的格式。"""
    wb = openpyxl.load_workbook(str(MASTER_XLSX), data_only=True)
    ws = wb["主表"]
    points = []
    for r in range(2, ws.max_row + 1):
        load = ws.cell(r, COL["load"]).value
        ch4 = ws.cell(r, COL["flow_ch4"]).value
        o2 = ws.cell(r, COL["flow_o2"]).value
        ar = ws.cell(r, COL["flow_ar"]).value
        lpd = ws.cell(r, COL["lpd"]).value
        x = ws.cell(r, COL["x_ch4"]).value
        sel = ws.cell(r, COL["sel_c2"]).value
        try:
            load_f = float(load)
            ch4_f = float(ch4 or 0)
            o2_f = float(o2 or 0)
            ar_f = float(ar or 0)
            lpd_f = float(lpd or 0) if lpd else None
            x_f = float(x)
            sel_f = float(sel)
        except (TypeError, ValueError):
            continue
        if x_f <= 0 or sel_f <= 0:
            continue
        points.append({
            "load": load_f,
            "ch4": ch4_f,
            "o2": o2_f,
            "ar": ar_f,
            "lpd": lpd_f,
            "y": x_f,
            "sel": sel_f,
            "m_cat": None,
        })
    return points


def append_to_master(new_rows: list[dict]) -> int:
    """把新行 append 到主表，返回新增行数。"""
    wb = openpyxl.load_workbook(str(MASTER_XLSX))
    ws = wb["主表"]

    # 找当前最大序号
    max_seq = 0
    for r in range(2, ws.max_row + 1):
        v = ws.cell(r, COL["seq"]).value
        if v and isinstance(v, (int, float)):
            max_seq = max(max_seq, int(v))

    # 已有数据指纹（去重用：条件+m_cat+sel 都一样才去重，同一条件重复测量保留）
    existing = set()
    for r in range(2, ws.max_row + 1):
        load = ws.cell(r, COL["load"]).value
        ch4 = ws.cell(r, COL["flow_ch4"]).value
        o2 = ws.cell(r, COL["flow_o2"]).value
        ar = ws.cell(r, COL["flow_ar"]).value
        lpd = ws.cell(r, COL["lpd"]).value
        sel = ws.cell(r, COL["sel_c2"]).value
        try:
            if load is not None:
                # key 包含条件 + 选择性，完全一样才算重复
                key = (round(float(load), 4), float(ch4 or 0), float(o2 or 0),
                       float(ar or 0), float(lpd or 0), round(float(sel or 0), 2))
                existing.add(key)
        except (TypeError, ValueError):
            continue

    added = 0
    fail_fill = PatternFill(start_color="FFE4B5", end_color="FFE4B5", fill_type="solid")
    for row in new_rows:
        key = (round(row["load"], 4), row["flow_ch4"], row["flow_o2"],
               row["flow_ar"], row["lpd"], round(row["sel_c2"], 2))
        if key in existing:
            continue
        max_seq += 1
        r = ws.max_row + 1
        ws.cell(r, COL["seq"]).value = max_seq
        ws.cell(r, COL["source"]).value = "实验"
        ws.cell(r, COL["comment"]).value = f"回流_{datetime.now().strftime('%Y%m%d')}"
        ws.cell(r, COL["metal"]).value = row["metal"]
        ws.cell(r, COL["load"]).value = row["load"]
        ws.cell(r, COL["sub"]).value = row["sub"]
        ws.cell(r, COL["light"]).value = row["light"]
        ws.cell(r, COL["lpd"]).value = row["lpd"]
        ws.cell(r, COL["flow_ch4"]).value = row["flow_ch4"]
        ws.cell(r, COL["flow_o2"]).value = row["flow_o2"]
        ws.cell(r, COL["c_o2_in"]).value = row["c_o2_in"]
        ws.cell(r, COL["flow_ar"]).value = row["flow_ar"]
        ws.cell(r, COL["c_c2h4"]).value = row["c_c2h4"]
        ws.cell(r, COL["c_c2h6"]).value = row["c_c2h6"]
        ws.cell(r, COL["c_co2"]).value = row["c_co2"]
        ws.cell(r, COL["x_ch4"]).value = row["x_ch4"]
        ws.cell(r, COL["sel_c2"]).value = row["sel_c2"]
        ws.cell(r, COL["sel_c2h4"]).value = row["sel_c2h4"]
        ws.cell(r, COL["sel_c2h6"]).value = row["sel_c2h6"]
        if row["is_failure"]:
            for c in range(1, 25):
                ws.cell(r, c).fill = fail_fill
        added += 1
        existing.add(key)

    wb.save(str(MASTER_XLSX))
    return added


def generate_bo_rec(model: LayeredWorldModel, points: list[dict], n: int = 20) -> str:
    """用 UCB 生成下一轮推荐表。"""
    from wm_kinetics import worldmodel_predict

    # 候选条件：负载 × 流量 × 光强
    loads = [0.02, 0.05, 0.1, 0.2, 0.5, 1.0]
    flows = [(100, 10, 0), (100, 20, 0), (100, 5, 10), (80, 10, 20), (60, 15, 25)]
    powers = [60, 80, 100]

    candidates = []
    for ld in loads:
        for ch4, o2, ar in flows:
            for pw in powers:
                q = {
                    "load": ld, "ch4": ch4, "o2": o2, "ar": ar,
                    "lpd": pw, "m_cat": 5,
                }
                pr = model.predict(q, mode="prior_residual")
                if not pr.get("ok"):
                    continue
                mu = pr["y"]
                sigma = pr["unc"]
                kappa = 2.0  # UCB 探索系数
                ucb = mu + kappa * sigma
                candidates.append({
                    "load": ld, "ch4": ch4, "o2": o2, "ar": ar,
                    "power_pct": pw, "m_cat": 5,
                    "pred_y": round(mu, 2), "pred_sel": round(pr["sel"], 1),
                    "unc": round(sigma, 2), "ucb": round(ucb, 2),
                    "in_domain": pr["in_domain"],
                })

    # 按 UCB 排序，取前 n
    candidates.sort(key=lambda x: -x["ucb"])
    top = candidates[:n]

    # 写 Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BO推荐"
    headers = ["rank", "load(wt%)", "ch4", "o2", "ar", "power%", "m_cat(mg)",
               "pred_y(%)", "pred_sel(%)", "unc(%)", "UCB", "in_domain"]
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True)
    for i, c in enumerate(top, 1):
        ws.append([i, c["load"], c["ch4"], c["o2"], c["ar"], c["power_pct"], c["m_cat"],
                   c["pred_y"], c["pred_sel"], c["unc"], c["ucb"], c["in_domain"]])
    wb.save(str(BO_REC_XLSX))
    return str(BO_REC_XLSX)


def main():
    print("=" * 60)
    print("ChemWorldModel 数据回流")
    print("=" * 60)

    # 1. 读新数据
    print(f"\n[1/5] 读新数据: {NEW_XLSX.name} / {NEW_SHEET}")
    raw_rows = read_new_data()
    print(f"  读到 {len(raw_rows)} 行")

    # 2. 转格式 + 异常检测
    print("\n[2/5] 转主表格式 + 异常检测")
    master_rows = [row_to_master(r) for r in raw_rows]
    # 过滤完全无效的空行（ch4=0 且 load=0）
    master_rows = [r for r in master_rows if not (r["flow_ch4"] == 0 and r["load"] == 0)]
    n_fail = sum(1 for r in master_rows if r["is_failure"])
    print(f"  有效行: {len(master_rows) - n_fail}, 异常行(标橙): {n_fail}")
    for r in master_rows:
        if r["is_failure"]:
            print(f"    - load={r['load']}, ch4={r['flow_ch4']}, {r['fail_reason']}")

    # 3. append 到主表（去重）
    print("\n[3/5] 写入主表（自动去重）")
    added = append_to_master(master_rows)
    print(f"  新增 {added} 行到 {MASTER_XLSX.name}")

    # 4. 重训模型
    print("\n[4/5] 重训 LayeredWorldModel")
    points = load_master_points()
    print(f"  训练点: {len(points)}")
    model = LayeredWorldModel().fit(points)
    print(f"  sigma_model (log10): {model.train_meta['sigma_model_log10']}")
    print(f"  sigma_model (≈ ±): {model.train_meta['sigma_model_pct']}%")
    print(f"  训练残差: {model.train_meta['sigma_train']}, holdout残差: {model.train_meta['sigma_holdout']}")

    # 5. 生成 BO 推荐
    print("\n[5/5] 生成下一轮 BO 推荐表")
    rec_path = generate_bo_rec(model, points)
    print(f"  输出: {rec_path}")

    print("\n" + "=" * 60)
    print("完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()
