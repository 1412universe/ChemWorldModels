# -*- coding: utf-8 -*-
"""工作流运行数据日志。

规则：
  · 每个工作流一份 xlsx（data/Datalog_Workflow/{工作流名}.xlsx）
  · 表里每一行 = 一次运行
  · 第 1 列「运行」形如：2026-10-29 14:29:02 · real · 1 行
"""
from __future__ import annotations

import json
import os
import re
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(os.path.dirname(_HERE))
DATALOG_DIR = os.path.join(_REPO, "data", "Datalog_Workflow")
_INDEX = os.path.join(DATALOG_DIR, "index.json")
_LOCK = threading.Lock()

RUN_COL = "运行"

NODE_COLUMNS = [
    "运行ID", "节点", "设备", "动作", "状态",
    "开始时间", "结束时间", "耗时_秒",
    "实际称量_g", "实际移液_uL",
    "烘干时间", "烘干温度",
    "离心时间", "震荡时间", "超声时间",
    "吸放方向", "枪头位", "吸液板位", "放液板位",
    "取值来源", "设定与结果", "报错日志",
]

COLUMNS = [RUN_COL] + NODE_COLUMNS

# 旧单次运行表头（迁移用）
_LEGACY_NODE_KEYS = [
    "工作流", "运行ID", "模式", "节点", "设备", "动作", "状态",
    "开始时间", "结束时间", "耗时_秒",
    "实际称量_g", "实际移液_uL",
    "烘干时间", "烘干温度",
    "离心时间", "震荡时间", "超声时间",
    "吸放方向", "枪头位", "吸液板位", "放液板位",
    "取值来源", "设定与结果", "报错日志",
]


def _num(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _flat(info: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if not isinstance(info, dict):
        return out
    out.update(info)
    nested = info.get("result")
    if isinstance(nested, dict):
        for k, v in nested.items():
            if k not in out or out[k] in (None, ""):
                out[k] = v
    return out


def _param(node: Dict[str, Any]) -> Dict[str, Any]:
    p = node.get("param")
    return dict(p) if isinstance(p, dict) else {}


def _pick(src: Dict[str, Any], keys: List[str]) -> Any:
    for k in keys:
        if k in src and src[k] not in (None, ""):
            return src[k]
    return None


def _fmt_time(ts: Optional[float]) -> str:
    if not ts:
        return ""
    try:
        return datetime.fromtimestamp(float(ts)).strftime("%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError, OSError):
        return ""


def _safe(name: str) -> str:
    s = re.sub(r"[^\w\u4e00-\u9fff.\-]+", "_", (name or "workflow").strip())
    return (s or "workflow")[:40]


def _join(parts: List[Any], sep: str = "\n") -> str:
    out = []
    for p in parts:
        if p is None or p == "":
            continue
        out.append(str(p))
    return sep.join(out)


def _measure(node: Dict[str, Any], info: Dict[str, Any], state: str) -> Dict[str, str]:
    """从节点参数和驱动返回里抽出称量、移液、烘干、离心、震荡、超声。"""
    p = _param(node)
    f = _flat(info)
    dev = str(node.get("device_name") or "")
    name = str(node.get("name") or node.get("template_name") or "")
    label = str(node.get("footer") or node.get("_label") or name)
    blob = " ".join([dev, name, label, str(p.get("cmd_type") or "")]).lower()
    row = {
        "实际称量_g": "", "实际移液_uL": "",
        "烘干时间": "", "烘干温度": "",
        "离心时间": "", "震荡时间": "", "超声时间": "",
        "吸放方向": "", "枪头位": "", "吸液板位": "", "放液板位": "",
        "取值来源": "", "设定与结果": "",
    }
    sources = []

    def put(col: str, val: Any, source: str) -> None:
        if val is None or val == "":
            return
        if isinstance(val, float):
            row[col] = ("%g" % val) if abs(val - round(val)) < 1e-6 else ("%.4g" % val)
        else:
            row[col] = val if isinstance(val, str) else str(val)
        if source not in sources:
            sources.append(source)

    if f.get("reaction_weight_g") is not None or f.get("counterweight_weight_g") is not None:
        w1 = _num(f.get("reaction_weight_g"))
        w2 = _num(f.get("counterweight_weight_g"))
        parts = []
        if w1 is not None:
            parts.append("反应板 %.2f" % w1)
        if w2 is not None:
            parts.append("配平板 %.2f" % w2)
        put("实际称量_g", "；".join(parts), "实测")
        put("实际移液_uL", f.get("volume_ul"), "实测")
        put("吸放方向", f.get("direction"), "实测")
        put("枪头位", f.get("tip_slot") and ("T%s" % f.get("tip_slot")), "实测")
        put("吸液板位", f.get("source_slot") and ("T%s" % f.get("source_slot")), "实测")
        put("放液板位", f.get("target_slot") and ("T%s" % f.get("target_slot")), "实测")

    weight = _pick(f, ["actual_weight_g", "weight_g", "weight", "mass_g", "net_g"])
    if weight is None:
        weight = _pick(p, ["weight", "mass", "target_weight", "weight_g"])
        if weight is not None and ("weigh" in blob or "称" in label or dev == "gn_solid_weighing"):
            put("实际称量_g", weight, "下发参数" if state != "dry" else "干跑")
    else:
        put("实际称量_g", weight, "实测")

    vol = _pick(f, ["volume_ul", "delta_ul", "delta_ul_water", "actual_volume_ul"])
    if vol is None:
        vol = _pick(p, ["volume", "volume_ul", "aspirate_volume", "dispense_volume", "ul"])
        if vol is not None and ("prcxi" in blob or "liquid" in blob or "移液" in label or "aspirat" in blob or "dispens" in blob):
            put("实际移液_uL", vol, "干跑" if state == "dry" else "下发参数")
    elif not row.get("实际移液_uL"):
        put("实际移液_uL", vol, "实测")

    cmd = str(p.get("cmd_type") or "")
    dry = state == "dry"
    is_oven = dev in ("gn_standard_oven", "gn_vacuum_oven") or "烘干" in label or "oven" in blob
    is_centrifuge = dev == "gn_centrifuge" and name != "balance_plates" and (cmd == "6" or name == "run")
    is_shake = any(k in blob or k in label for k in ("shake", "shaker", "震荡", "振荡"))
    is_sonic = any(k in blob or k in label for k in ("ultra", "sonic", "超声"))

    def origin(measured_key: str) -> str:
        if f.get(measured_key) is not None:
            return "实测"
        return "干跑" if dry else "下发参数"

    if is_oven:
        put("烘干时间", _pick(f, ["actual_dry_time"]) or _pick(p, ["time_minutes", "time", "minutes"]), origin("actual_dry_time"))
        put("烘干温度", _pick(f, ["actual_temperature", "temperature_c"]) or _pick(p, ["temperature", "temp"]), origin("actual_temperature"))
    if is_centrifuge:
        put("离心时间", _pick(f, ["actual_centrifuge_time"]) or _pick(p, ["time_minutes", "minutes", "time"]), origin("actual_centrifuge_time"))
    if is_shake:
        put("震荡时间", _pick(f, ["actual_shake_time"]) or _pick(p, ["shake_time", "mix_time", "time_minutes", "time", "minutes"]), origin("actual_shake_time"))
    if is_sonic:
        put("超声时间", _pick(f, ["actual_ultrasound_time"]) or _pick(p, ["ultrasound_time", "sonic_time", "time", "seconds"]), origin("actual_ultrasound_time"))

    bits = []
    for k in ("cmd_type", "time_minutes", "temperature", "rpm", "volume", "weight"):
        if p.get(k) not in (None, ""):
            bits.append("%s=%s" % (k, p.get(k)))
    msg = f.get("message") or f.get("error") or ""
    if msg:
        bits.append(str(msg))
    row["取值来源"] = "、".join(sources)
    row["设定与结果"] = "；".join(bits)
    return row


def _error_cell(info: Dict[str, Any], state: str, fallback: str = "") -> str:
    text = str(info.get("error_log") or "").strip()
    if text:
        return text
    if state == "skipped":
        return "已禁用，沿连线跳到下一节点"
    err = str(info.get("error") or "").strip()
    if state == "failed" or err:
        return "原因：" + (err or "执行失败")
    if state == "canceled":
        return str(info.get("reason") or "已取消")
    return _backfill_error(state, fallback)


def _backfill_error(state: str, summary: str) -> str:
    """旧表没有「报错日志」时，从状态 / 设定与结果里还原原因。"""
    summary = str(summary or "").strip()
    if state == "skipped":
        return "已禁用，沿连线跳到下一节点"
    if state == "canceled":
        return summary or "已取消"
    if state != "failed" and "Error" not in summary and "ValueError" not in summary and "失败" not in summary:
        return ""
    # 设定与结果常是「cmd_type=15；ValueError: …」
    reason = summary
    if "；" in summary:
        parts = [p for p in summary.split("；") if p and not p.startswith("cmd_type=")]
        if parts:
            reason = "；".join(parts)
    if not reason:
        reason = "执行失败"
    if reason.startswith("原因："):
        return reason
    return "原因：" + reason


def run_label(started_at: str, mode: str, node_count: int) -> str:
    stamp = started_at or "—"
    mode_s = mode or "—"
    n = max(0, int(node_count or 0))
    return "%s · %s · %d 行" % (stamp, mode_s, n)


def workflow_xlsx_name(workflow_name: str) -> str:
    return "%s.xlsx" % _safe(workflow_name or "workflow")


def build_node_rows(run: Any) -> List[Dict[str, Any]]:
    """一次运行拆成若干节点明细（合并前）。"""
    nodes = getattr(run, "nodes", {}) or {}
    logged = list(getattr(run, "log_nodes", None) or [])
    if logged:
        order = [n.get("uuid") for n in logged if n.get("uuid")]
        by_id = {n.get("uuid"): n for n in logged}
    else:
        order = list(getattr(run, "order", []) or [])
        for u, n in nodes.items():
            if u not in order:
                order.append(u)
        by_id = nodes
    states = getattr(run, "states", {}) or {}
    timing = getattr(run, "timing", {}) or {}
    info = getattr(run, "info", {}) or {}
    rows = []
    for u in order:
        n = by_id.get(u) or nodes.get(u) or {}
        if n.get("type") == "Group" or n.get("name") == "group":
            continue
        t = timing.get(u) or {}
        st = states.get(u) or ""
        node_info = info.get(u) or {}
        measured = _measure(n, node_info, "dry" if getattr(run, "mode", "") == "dry" else st)
        label = str(n.get("footer") or n.get("_label") or n.get("name") or "")
        rows.append({
            "运行ID": getattr(run, "run_id", "") or "",
            "节点": label or n.get("name") or u,
            "设备": n.get("device_name") or "",
            "动作": n.get("name") or "",
            "状态": st,
            "开始时间": _fmt_time(t.get("start_wall")),
            "结束时间": _fmt_time(t.get("end_wall")),
            "耗时_秒": t.get("dur") if t.get("dur") is not None else "",
            **{k: measured.get(k, "") for k in NODE_COLUMNS if k not in (
                "运行ID", "节点", "设备", "动作", "状态", "开始时间", "结束时间", "耗时_秒", "报错日志"
            )},
            "报错日志": _error_cell(node_info, st, measured.get("设定与结果") or ""),
        })
    return rows


def collapse_run_row(
    *,
    started_at: str,
    mode: str,
    node_rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """把一次运行的多个节点明细收成表里的一行。"""
    n = len(node_rows)
    out: Dict[str, Any] = {RUN_COL: run_label(started_at, mode, n)}
    if not node_rows:
        for c in NODE_COLUMNS:
            out[c] = ""
        return out
    if n == 1:
        out.update({c: node_rows[0].get(c, "") for c in NODE_COLUMNS})
        return out
    for c in NODE_COLUMNS:
        if c == "运行ID":
            out[c] = node_rows[0].get("运行ID") or ""
        else:
            out[c] = _join([r.get(c, "") for r in node_rows])
    return out


def build_rows(run: Any) -> List[Dict[str, Any]]:
    """兼容旧调用：返回「一次运行 → 一行」的列表。"""
    nodes = build_node_rows(run)
    started = _fmt_time(getattr(run, "started_at", 0))
    mode = getattr(run, "mode", "") or ""
    return [collapse_run_row(started_at=started, mode=mode, node_rows=nodes)]


def _load_index() -> List[Dict[str, Any]]:
    if not os.path.isfile(_INDEX):
        return []
    try:
        with open(_INDEX, encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("runs") or [])
    except (OSError, json.JSONDecodeError):
        return []


def _save_index(runs: List[Dict[str, Any]]) -> None:
    tmp = _INDEX + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"runs": runs[:400]}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, _INDEX)


def _read_sheet_rows(path: str) -> Tuple[List[str], List[Dict[str, Any]]]:
    if not os.path.isfile(path):
        return [], []
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb.active
        it = ws.iter_rows(values_only=True)
        try:
            header = [str(c or "") for c in next(it)]
        except StopIteration:
            return [], []
        rows = []
        for raw in it:
            if not any(v not in (None, "") for v in raw):
                continue
            rows.append({
                header[i]: ("" if i >= len(raw) or raw[i] is None else raw[i])
                for i in range(len(header))
            })
        return header, rows
    finally:
        wb.close()


def _write_xlsx(path: str, rows: List[Dict[str, Any]]) -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "运行日志"
    head_font = Font(bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", fgColor="334155")
    for col, name in enumerate(COLUMNS, 1):
        cell = ws.cell(1, col, name)
        cell.font = head_font
        cell.fill = head_fill
        cell.alignment = Alignment(vertical="center")
    for r, row in enumerate(rows, 2):
        for c, name in enumerate(COLUMNS, 1):
            cell = ws.cell(r, c, row.get(name, ""))
            if name in (RUN_COL, "报错日志", "设定与结果", "节点"):
                cell.alignment = Alignment(wrap_text=True, vertical="top")
    widths = {
        RUN_COL: 36,
        "报错日志": 56,
        "设定与结果": 40,
        "节点": 28,
        "运行ID": 14,
    }
    for i, name in enumerate(COLUMNS, 1):
        ws.column_dimensions[get_column_letter(i)].width = widths.get(
            name, min(28, max(10, len(name) + 4))
        )
    ws.auto_filter.ref = "A1:%s%d" % (get_column_letter(len(COLUMNS)), max(1, len(rows) + 1))
    ws.freeze_panes = "A2"
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    wb.save(path)


def _normalize_legacy_row(rec: Dict[str, Any], entry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """把旧「一次运行一个文件、每节点一行」收成新表的一行。"""
    entry = entry or {}
    if RUN_COL in rec and any(k in rec for k in ("节点", "状态", "运行ID")):
        # 已经是新格式
        out = {c: rec.get(c, "") for c in COLUMNS}
        if not out.get(RUN_COL):
            out[RUN_COL] = run_label(
                str(entry.get("started_at") or rec.get("开始时间") or ""),
                str(entry.get("mode") or rec.get("模式") or ""),
                1,
            )
        if not out.get("报错日志"):
            out["报错日志"] = _backfill_error(str(out.get("状态") or ""), str(out.get("设定与结果") or ""))
        return out

    started = str(entry.get("started_at") or rec.get("开始时间") or "")
    mode = str(entry.get("mode") or rec.get("模式") or "")
    node = {c: rec.get(c, "") for c in NODE_COLUMNS}
    node["运行ID"] = node.get("运行ID") or entry.get("run_id") or ""
    if not node.get("报错日志"):
        node["报错日志"] = _backfill_error(str(node.get("状态") or ""), str(node.get("设定与结果") or ""))
    return collapse_run_row(started_at=started, mode=mode, node_rows=[node])


def save_workflow_run(run: Any) -> Dict[str, Any]:
    """把一次运行并入该工作流的总表，并更新 index.json。"""
    os.makedirs(DATALOG_DIR, exist_ok=True)
    node_rows = build_node_rows(run)
    run_id = str(getattr(run, "run_id", "") or "")
    wf_name = getattr(run, "workflow_name", "") or "未命名工作流"
    started = _fmt_time(getattr(run, "started_at", 0))
    mode = getattr(run, "mode", "") or ""
    row = collapse_run_row(started_at=started, mode=mode, node_rows=node_rows)
    fname = workflow_xlsx_name(wf_name)
    path = os.path.join(DATALOG_DIR, fname)

    with _LOCK:
        _, existing = _read_sheet_rows(path)
        kept = [r for r in existing if str(r.get("运行ID") or "") != run_id]
        kept.insert(0, row)
        _write_xlsx(path, kept)

        runs = [r for r in _load_index() if r.get("run_id") != run_id]
        entry = {
            "run_id": run_id,
            "workflow_name": wf_name,
            "workflow_uuid": getattr(run, "workflow_uuid", "") or "",
            "mode": mode,
            "started_at": started,
            "ended_at": _fmt_time(getattr(run, "ended_at", 0)),
            "finished": bool(getattr(run, "finished", False)),
            "rows": len(node_rows),
            "xlsx": fname,
        }
        runs.insert(0, entry)
        _save_index(runs)
    return entry


def list_runs() -> List[Dict[str, Any]]:
    with _LOCK:
        return _load_index()


def list_workflows() -> List[Dict[str, Any]]:
    """按工作流汇总：一份表、若干次运行。"""
    with _LOCK:
        runs = _load_index()
    groups: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    for r in runs:
        name = r.get("workflow_name") or "未命名工作流"
        if name not in groups:
            groups[name] = {
                "workflow_name": name,
                "xlsx": r.get("xlsx") or workflow_xlsx_name(name),
                "runs": 0,
                "latest_at": r.get("started_at") or "",
            }
            order.append(name)
        groups[name]["runs"] += 1
        if not groups[name]["latest_at"]:
            groups[name]["latest_at"] = r.get("started_at") or ""
    return [groups[n] for n in order]


def workflow_detail(workflow_name: str) -> Optional[Dict[str, Any]]:
    name = str(workflow_name or "").strip()
    if not name:
        return None
    fname = workflow_xlsx_name(name)
    path = os.path.join(DATALOG_DIR, fname)
    # 兼容 index 里旧文件名
    with _LOCK:
        for r in _load_index():
            if (r.get("workflow_name") or "") == name and r.get("xlsx"):
                fname = r["xlsx"]
                path = os.path.join(DATALOG_DIR, fname)
                break
    header, rows = _read_sheet_rows(path)
    if not header and not os.path.isfile(path):
        # 还没有总表时，从 index 拼
        with _LOCK:
            related = [r for r in _load_index() if (r.get("workflow_name") or "") == name]
        if not related:
            return None
        rows = []
        for entry in related:
            legacy = os.path.join(DATALOG_DIR, entry.get("xlsx") or "")
            _, legacy_rows = _read_sheet_rows(legacy)
            if not legacy_rows:
                rows.append(collapse_run_row(
                    started_at=entry.get("started_at") or "",
                    mode=entry.get("mode") or "",
                    node_rows=[{c: "" for c in NODE_COLUMNS} | {"运行ID": entry.get("run_id") or ""}],
                ))
                continue
            if RUN_COL in (legacy_rows[0] or {}):
                rows.extend(legacy_rows)
            else:
                # 旧文件多节点：收成一行
                nodes = []
                for rec in legacy_rows:
                    node = {c: rec.get(c, "") for c in NODE_COLUMNS}
                    node["运行ID"] = node.get("运行ID") or entry.get("run_id") or ""
                    if not node.get("报错日志"):
                        node["报错日志"] = _backfill_error(
                            str(node.get("状态") or ""), str(node.get("设定与结果") or "")
                        )
                    nodes.append(node)
                rows.append(collapse_run_row(
                    started_at=entry.get("started_at") or "",
                    mode=entry.get("mode") or "",
                    node_rows=nodes,
                ))
        return {
            "workflow_name": name,
            "xlsx": workflow_xlsx_name(name),
            "records": rows,
            "columns": COLUMNS,
        }
    # 保证列齐全、报错日志补全
    fixed = []
    for rec in rows:
        row = {c: rec.get(c, "") for c in COLUMNS}
        if not row.get("报错日志"):
            row["报错日志"] = _backfill_error(str(row.get("状态") or ""), str(row.get("设定与结果") or ""))
        fixed.append(row)
    return {
        "workflow_name": name,
        "xlsx": os.path.basename(path),
        "records": fixed,
        "columns": COLUMNS,
    }


def run_detail(run_id: str) -> Optional[Dict[str, Any]]:
    """兼容旧接口：返回该次运行所在工作流表里，对应该 run_id 的那一行。"""
    rid = str(run_id or "")
    hit = None
    for r in list_runs():
        if r.get("run_id") == rid:
            hit = dict(r)
            break
    if not hit:
        return None
    wf = workflow_detail(hit.get("workflow_name") or "")
    rows = []
    if wf:
        rows = [row for row in (wf.get("records") or []) if str(row.get("运行ID") or "") == rid]
        if not rows:
            rows = list(wf.get("records") or [])
    hit["records"] = rows
    hit["columns"] = COLUMNS
    return hit


def xlsx_path(run_id: str) -> Optional[str]:
    rid = str(run_id or "")
    for r in list_runs():
        if r.get("run_id") == rid:
            path = os.path.join(DATALOG_DIR, r.get("xlsx") or "")
            return path if os.path.isfile(path) else None
    return None


def workflow_xlsx_path(workflow_name: str) -> Optional[str]:
    detail = workflow_detail(workflow_name)
    if not detail:
        return None
    path = os.path.join(DATALOG_DIR, detail.get("xlsx") or "")
    return path if os.path.isfile(path) else None


def migrate_legacy_runs() -> Dict[str, Any]:
    """把旧「一运行一文件」收成「一工作流一文件」，并补上报错日志列。"""
    os.makedirs(DATALOG_DIR, exist_ok=True)
    with _LOCK:
        index = _load_index()
        by_wf: Dict[str, List[Dict[str, Any]]] = {}
        for entry in index:
            name = entry.get("workflow_name") or "未命名工作流"
            by_wf.setdefault(name, []).append(entry)

        rewritten = 0
        removed = []
        new_index = []
        for wf_name, entries in by_wf.items():
            fname = workflow_xlsx_name(wf_name)
            path = os.path.join(DATALOG_DIR, fname)
            rows: List[Dict[str, Any]] = []
            seen_ids = set()
            # index 已是新→旧；保持这个顺序
            for entry in entries:
                rid = str(entry.get("run_id") or "")
                if rid and rid in seen_ids:
                    continue
                if rid:
                    seen_ids.add(rid)
                legacy_name = entry.get("xlsx") or ""
                legacy_path = os.path.join(DATALOG_DIR, legacy_name) if legacy_name else ""
                header, legacy_rows = _read_sheet_rows(legacy_path) if legacy_path else ([], [])
                if legacy_rows and RUN_COL in (header or []):
                    # 文件已经是工作流总表：按 run_id 取本条
                    matched = [r for r in legacy_rows if str(r.get("运行ID") or "") == rid] if rid else []
                    if matched:
                        rows.append(_normalize_legacy_row(matched[0], entry))
                    elif not rid:
                        rows.extend(_normalize_legacy_row(r, entry) for r in legacy_rows)
                    else:
                        # 总表里还没有这一次，用 entry 拼
                        nodes = []
                        for rec in legacy_rows:
                            if str(rec.get("运行ID") or "") == rid or not rec.get("运行ID"):
                                node = {c: rec.get(c, "") for c in NODE_COLUMNS}
                                node["运行ID"] = rid
                                if not node.get("报错日志"):
                                    node["报错日志"] = _backfill_error(
                                        str(node.get("状态") or ""), str(node.get("设定与结果") or "")
                                    )
                                nodes.append(node)
                        if not nodes:
                            nodes = [{c: "" for c in NODE_COLUMNS} | {"运行ID": rid}]
                        rows.append(collapse_run_row(
                            started_at=entry.get("started_at") or "",
                            mode=entry.get("mode") or "",
                            node_rows=nodes,
                        ))
                elif legacy_rows:
                    nodes = []
                    for rec in legacy_rows:
                        node = {c: rec.get(c, "") for c in NODE_COLUMNS}
                        node["运行ID"] = node.get("运行ID") or rid
                        if not node.get("报错日志"):
                            node["报错日志"] = _backfill_error(
                                str(node.get("状态") or ""), str(node.get("设定与结果") or "")
                            )
                        nodes.append(node)
                    rows.append(collapse_run_row(
                        started_at=entry.get("started_at") or "",
                        mode=entry.get("mode") or "",
                        node_rows=nodes,
                    ))
                else:
                    rows.append(collapse_run_row(
                        started_at=entry.get("started_at") or "",
                        mode=entry.get("mode") or "",
                        node_rows=[{c: "" for c in NODE_COLUMNS} | {"运行ID": rid}],
                    ))
                entry = dict(entry)
                entry["xlsx"] = fname
                entry["rows"] = max(1, int(entry.get("rows") or 1))
                new_index.append(entry)

            _write_xlsx(path, rows)
            rewritten += 1

            # 删掉旧的「工作流_runid.xlsx」，保留总表
            for entry in entries:
                old = entry.get("xlsx") or ""
                if not old or old == fname:
                    continue
                old_path = os.path.join(DATALOG_DIR, old)
                if os.path.isfile(old_path) and os.path.abspath(old_path) != os.path.abspath(path):
                    try:
                        os.remove(old_path)
                        removed.append(old)
                    except OSError:
                        pass

        _save_index(new_index)
        return {
            "workflows": rewritten,
            "runs": len(new_index),
            "removed": removed,
            "files": sorted({workflow_xlsx_name(n) for n in by_wf}),
        }
