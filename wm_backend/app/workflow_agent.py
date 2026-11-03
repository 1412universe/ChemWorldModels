# -*- coding: utf-8 -*-
"""
工作流编辑器 Agent：加载 unilab-workflow-builder skill，
用 LLM 对当前工作流做批量生成 / 修改，并用 skill 自带校验器验收。
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any

from . import ext_llm

logger = logging.getLogger("wm.wf_agent")

# skill 根目录：wm_backend 内置副本 → 仓库软链 → workbuddy → 环境变量
_APP_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _APP_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent
_SKILL_CANDIDATES = [
    _BACKEND_DIR / "skills" / "unilab-workflow-builder",
    _REPO_ROOT / "skills" / "unilab-workflow-builder",
    Path("/Users/fenglongli/.workbuddy/skills/unilab-workflow-builder"),
]
_env = (os.environ.get("UNILAB_WF_SKILL") or "").strip()
if _env:
    _SKILL_CANDIDATES.insert(0, Path(_env))


def skill_root() -> Path | None:
    for p in _SKILL_CANDIDATES:
        try:
            if p and (p / "SKILL.md").is_file():
                return p.resolve()
        except Exception:
            continue
    return None


def _read_text(path: Path, limit: int = 0) -> str:
    try:
        txt = path.read_text(encoding="utf-8")
    except Exception as e:
        return f"(无法读取 {path.name}: {e})"
    if limit and len(txt) > limit:
        return txt[:limit] + "\n\n…(已截断)…"
    return txt


def load_skill_context(max_chars: int = 28000) -> str:
    """拼接 SKILL.md + schema 要点，供 system prompt 使用。"""
    root = skill_root()
    if not root:
        return "（未找到 unilab-workflow-builder skill，仅按通用 Uni-Lab 节点/边约定回答。）"
    # 大画布时必须把额度留给 live canvas；skill 只留骨架，避免挤掉画布
    skill_cap = min(max_chars, 18000)
    schema_cap = min(10000, max(2000, max_chars // 3))
    parts = [
        f"# Skill path\n{root}",
        _read_text(root / "SKILL.md", skill_cap),
    ]
    schema = root / "references" / "schema.md"
    if schema.is_file() and max_chars >= 8000:
        parts.append("\n# Schema excerpt\n" + _read_text(schema, schema_cap))
    blob = "\n\n".join(parts)
    if len(blob) > max_chars:
        blob = blob[:max_chars] + "\n\n…(skill context truncated)…"
    return blob


# 发给 LLM 的总字符软上限（中文 gateway 常在 ~128k tokens 截断；
# 多条超长 system 时，实时画布往往被丢掉，模型就会说「看不到 JSON」）。
_LLM_PROMPT_CHAR_BUDGET = 90000


def assemble_llm_messages(
    message: str,
    workflow: dict | None,
    history: list[dict] | None = None,
) -> tuple[list[dict], dict[str, Any]]:
    """组装真正发给 LLM 的 messages，并返回可核对的 ingest 收据。

    关键策略：
    1. 实时画布必须放进 **最后一条 user 消息**（不要只放在靠前的 system 里）。
    2. 合并为少量消息，避免部分兼容接口只保留第一条 system。
    3. 有硬预算：优先保 live 节点表，再保边，再保 skill；完整 JSON 默认不重复塞。
    """
    data = (workflow or {}).get("data") or {}
    n_nodes = len(data.get("nodes") or [])
    n_edges = len(data.get("edges") or [])
    dropped: list[str] = []

    # 大图画布：skill 压到很小；小图可多给一点
    skill_budget = 4000 if n_nodes >= 80 else (8000 if n_nodes >= 20 else 12000)
    skill_ctx = load_skill_context(max_chars=skill_budget)
    if len(skill_ctx) >= skill_budget - 20:
        dropped.append("skill_truncated_to_%d" % skill_budget)

    system_blob = (
        WF_SYSTEM_PROMPT
        + "\n\n【硬性】用户消息内含【LIVE_CANVAS】时，你已经看到当前画布；"
        "禁止说「没有 JSON / 看不到实时视图 / 请提供更多上下文」。"
        "禁止把 uuid 串或 #i→#j 当成「不明含义的抽象网络」——那是实验室步骤与执行顺序。"
        "回复开头两行：\n"
        "已读画布: nodes=<N> edges=<M>\n"
        "画布是: <一句话概括设备/工艺，引用设备分布与步骤预览中的中文说明>\n\n"
        "【skill 摘要】\n"
        + skill_ctx
    )

    # live 预算：总预算 − system − 用户原话 − 余量
    user_q = (message or "").strip()
    hist = list(history or [])[-4:]  # 大画布时少带历史，省额度
    hist_chars = sum(len(h.get("content") or "") for h in hist)
    reserve = len(system_blob) + len(user_q) + hist_chars + 800
    live_budget = max(12000, _LLM_PROMPT_CHAR_BUDGET - reserve)

    live = canvas_live_view(workflow, max_chars=live_budget)
    if live_budget < 40000 and n_nodes >= 80:
        dropped.append("live_view_budget_%d" % live_budget)

    # 不再默认附带完整压缩 JSON（与 live 重复且极易把画布挤出上下文）
    # 仅小图且仍有额度时附带，方便生成类任务对照字段
    wf_blob = ""
    compact_chars = 0
    if workflow and n_nodes > 0 and n_nodes < 40:
        try:
            compact = compact_workflow_json(workflow) or workflow
            raw = json.dumps(compact, ensure_ascii=False)
            compact_chars = len(raw)
            room = _LLM_PROMPT_CHAR_BUDGET - reserve - len(live)
            if compact_chars <= min(25000, max(0, room)):
                wf_blob = raw
            else:
                dropped.append("compact_json_skipped_no_room")
        except Exception as e:
            dropped.append("compact_json_error:%s" % e)
    else:
        if n_nodes >= 40:
            dropped.append("compact_json_skipped_large_canvas")

    facts = structural_facts(workflow, focus_gt=2)
    user_parts = [
        "【LIVE_CANVAS — 这就是用户屏幕上的当前工作流，已由服务器写入本条 user 消息】",
        "CANVAS_MARKER nodes=%d edges=%d" % (n_nodes, n_edges),
        facts,
        live,
    ]
    if wf_blob:
        user_parts.append("【压缩工作流 JSON】\n" + wf_blob)
    user_parts.append("【用户原话】\n" + user_q)
    user_content = "\n\n".join(user_parts)

    msgs: list[dict] = [
        {"role": "system", "content": system_blob},
    ]
    for h in hist:
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": user_content})

    total = sum(len(m.get("content") or "") for m in msgs)
    # 若仍超预算：从 user 里砍边表（canvas_live_view 已尽量保节点）；再不行截断 user 尾部之前的 live
    if total > _LLM_PROMPT_CHAR_BUDGET + 5000:
        # 最后手段：缩短 live（保留头 + 节点表前部）
        cut = live_budget - (total - _LLM_PROMPT_CHAR_BUDGET)
        cut = max(8000, cut)
        live2 = canvas_live_view(workflow, max_chars=cut)
        user_parts = [
            "【LIVE_CANVAS — 这就是用户屏幕上的当前工作流，已由服务器写入本条 user 消息】",
            "CANVAS_MARKER nodes=%d edges=%d" % (n_nodes, n_edges),
            facts,
            live2,
            "【用户原话】\n" + user_q,
        ]
        user_content = "\n\n".join(user_parts)
        msgs[-1] = {"role": "user", "content": user_content}
        live = live2
        total = sum(len(m.get("content") or "") for m in msgs)
        dropped.append("emergency_live_shrink")

    ingest = {
        "workflow_received": bool(workflow),
        "nodes": n_nodes,
        "edges": n_edges,
        "live_in_user_message": True,
        "live_chars": len(live),
        "skill_chars": len(skill_ctx),
        "system_chars": len(system_blob),
        "user_chars": len(user_content),
        "compact_json_chars": len(wf_blob),
        "history_turns": len(hist),
        "message_count": len(msgs),
        "total_prompt_chars": total,
        "budget": _LLM_PROMPT_CHAR_BUDGET,
        "dropped": dropped,
        "canvas_marker": "CANVAS_MARKER nodes=%d edges=%d" % (n_nodes, n_edges),
    }
    logger.info(
        "[wf_agent] llm_ingest nodes=%s edges=%s live=%s total=%s dropped=%s",
        n_nodes, n_edges, len(live), total, dropped,
    )
    return msgs, ingest


def _import_validator():
    root = skill_root()
    if not root:
        return None
    scripts = root / "scripts"
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    try:
        import validate_workflow as vw  # type: ignore
        return vw
    except Exception as e:
        logger.warning("[wf_agent] validate_workflow import failed: %s", e)
        return None


def validate_workflow_doc(doc: dict) -> dict:
    """返回 {ok, problems, summary}。"""
    vw = _import_validator()
    if vw is None:
        # 轻量兜底
        data = (doc or {}).get("data") or {}
        nodes = data.get("nodes") or []
        edges = data.get("edges") or []
        problems = []
        if not nodes:
            problems.append("nodes 为空")
        return {
            "ok": not problems,
            "problems": problems,
            "summary": "nodes=%d edges=%d（无 skill 校验器，仅结构检查）" % (len(nodes), len(edges)),
        }
    problems, _stats = vw.validate(doc)
    nodes = ((doc or {}).get("data") or {}).get("nodes") or []
    edges = ((doc or {}).get("data") or {}).get("edges") or []
    return {
        "ok": not problems,
        "problems": problems or [],
        "summary": "nodes=%d edges=%d · %s" % (
            len(nodes), len(edges),
            "通过 skill 校验" if not problems else ("失败 %d 项" % len(problems)),
        ),
    }


def summarize_workflow(wf: dict | None) -> str:
    if not wf:
        return "（画布为空）"
    data = wf.get("data") or {}
    nodes = data.get("nodes") or []
    edges = data.get("edges") or []
    by_dev: dict[str, int] = {}
    disabled_n = 0
    for n in nodes:
        d = n.get("device_name") or n.get("name") or "?"
        by_dev[d] = by_dev.get(d, 0) + 1
        if n.get("disabled"):
            disabled_n += 1
    top = sorted(by_dev.items(), key=lambda x: -x[1])[:12]
    return (
        "name=%s\nworkflow_uuid=%s\ntarget_lab_uuid=%s\n"
        "nodes=%d edges=%d disabled_nodes=%d\n设备计数: %s"
        % (
            wf.get("name"),
            wf.get("workflow_uuid") or ((wf.get("data") or {}).get("workflow_uuid")),
            wf.get("target_lab_uuid"),
            len(nodes), len(edges), disabled_n,
            ", ".join("%s×%d" % (k, v) for k, v in top) or "—",
        )
    )


def _compact_param(param: Any, limit: int = 160) -> str:
    if not isinstance(param, dict) or not param:
        return ""
    prefer = (
        "cmd_type", "x_pos", "y_pos", "material_z_pos", "volune_weight",
        "repeat_count", "asp_vols", "action", "timeout",
    )
    parts = []
    for k in prefer:
        if k in param:
            parts.append("%s=%s" % (k, param.get(k)))
    if not parts:
        for k in list(param.keys())[:6]:
            parts.append("%s=%s" % (k, param.get(k)))
    s = ",".join(parts)
    return s[:limit]


def compute_degrees(wf: dict | None) -> dict[str, dict[str, int]]:
    """uuid -> {in, out, total}。连线数 = in + out（每条关联边计 1）。"""
    out: dict[str, dict[str, int]] = {}
    if not wf:
        return out
    data = wf.get("data") or {}
    for n in data.get("nodes") or []:
        if not n or not n.get("uuid"):
            continue
        out[n["uuid"]] = {"in": 0, "out": 0, "total": 0}
    for e in data.get("edges") or []:
        if not e:
            continue
        s, t = e.get("source_node_uuid"), e.get("target_node_uuid")
        if s in out:
            out[s]["out"] += 1
            out[s]["total"] += 1
        if t in out:
            out[t]["in"] += 1
            out[t]["total"] += 1
    return out


def degree_histogram(degrees: dict[str, dict[str, int]]) -> dict[int, int]:
    hist: dict[int, int] = {}
    for d in degrees.values():
        t = int(d.get("total") or 0)
        hist[t] = hist.get(t, 0) + 1
    return hist


def filter_uuids_by_degree(
    degrees: dict[str, dict[str, int]],
    *,
    gt: int | None = None,
    gte: int | None = None,
    lt: int | None = None,
    lte: int | None = None,
    eq: int | None = None,
) -> list[str]:
    ids = []
    for u, d in degrees.items():
        t = int(d.get("total") or 0)
        if gt is not None and not (t > gt):
            continue
        if gte is not None and not (t >= gte):
            continue
        if lt is not None and not (t < lt):
            continue
        if lte is not None and not (t <= lte):
            continue
        if eq is not None and not (t == eq):
            continue
        if all(x is None for x in (gt, gte, lt, lte, eq)):
            continue
        ids.append(u)
    return ids


def structural_facts(wf: dict | None, focus_gt: int | None = 2) -> str:
    """服务器侧结构事实，塞进 user 消息，防止模型声称「看不到画布」。"""
    if not wf:
        return "【画布结构事实】画布为空。"
    data = wf.get("data") or {}
    nodes = [n for n in (data.get("nodes") or []) if n]
    edges = data.get("edges") or []
    deg = compute_degrees(wf)
    hist = degree_histogram(deg)
    hist_s = ", ".join("度%d×%d" % (k, hist[k]) for k in sorted(hist))
    by_dev: dict[str, int] = {}
    for n in nodes:
        d = n.get("device_name") or "?"
        by_dev[d] = by_dev.get(d, 0) + 1
    top = sorted(by_dev.items(), key=lambda x: -x[1])[:8]
    lines = [
        "【画布结构事实】这是 Uni-Lab 实验室工作流（步骤图），不是抽象 ID 网络。",
        "name=%s · 步骤=%d · 顺序边=%d" % (wf.get("name") or "", len(nodes), len(edges)),
        "设备: " + (", ".join("%s×%d" % (k, v) for k, v in top) or "—"),
        "连线数=入边+出边。度分布: " + (hist_s or "—"),
    ]
    if nodes:
        lines.append(
            "首步示例: [%s] %s · %s"
            % (nodes[0].get("device_name") or "?", nodes[0].get("name") or "?", _node_label(nodes[0]))
        )
    if focus_gt is not None:
        hit = filter_uuids_by_degree(deg, gt=focus_gt)
        lines.append("degree>%d 的步骤数=%d" % (focus_gt, len(hit)))
        if hit:
            lines.append(
                "删除时优先: "
                '{"ops":[{"op":"remove_nodes_by_degree","gt":%d}]}' % focus_gt
            )
    return "\n".join(lines)


def is_analysis_only(message: str) -> bool:
    msg = message or ""
    return bool(
        re.search(
            r"不要动|先不要|先别|不要改|别改|只(输出|说明|分析|讲|描述)|"
            r"先(输出)?理解|不要执行|先别动|仅理解|只理解",
            msg,
        )
    )


def parse_degree_threshold(message: str) -> dict[str, int] | None:
    """从自然语言解析度数条件。返回如 {gt:2} / {gte:3}。"""
    msg = message or ""
    m = re.search(
        r"(?:连线数|连线|边数|度数|度|关联边).{0,10}(?:大于|超过|>)\s*(\d+)",
        msg,
    )
    if m:
        return {"gt": int(m.group(1))}
    m = re.search(r"(?:大于|超过|>)\s*(\d+)\s*条?(?:连线|边)", msg)
    if m:
        return {"gt": int(m.group(1))}
    m = re.search(
        r"(?:连线数|连线|边数|度数|度).{0,10}(?:大于等于|不少于|>=)\s*(\d+)",
        msg,
    )
    if m:
        return {"gte": int(m.group(1))}
    m = re.search(r"degree\s*(>|>=|==|=)\s*(\d+)", msg, re.I)
    if m:
        op, n = m.group(1), int(m.group(2))
        if op == ">":
            return {"gt": n}
        if op == ">=":
            return {"gte": n}
        return {"eq": n}
    return None


def wants_degree_remove(message: str) -> bool:
    msg = message or ""
    if not re.search(r"删|移除|去掉|清除", msg):
        return False
    return parse_degree_threshold(msg) is not None


def analysis_reply_for_degree(wf: dict | None, message: str) -> str:
    """不改画布：用真实统计回答「连线数大于 N」类理解请求。"""
    thr = parse_degree_threshold(message) or {"gt": 2}
    deg = compute_degrees(wf)
    hist = degree_histogram(deg)
    data = (wf or {}).get("data") or {}
    n_nodes = len(data.get("nodes") or [])
    n_edges = len(data.get("edges") or [])
    hit = filter_uuids_by_degree(deg, **thr)
    key = next(iter(thr))
    val = thr[key]
    label = {"gt": ">", "gte": "≥", "lt": "<", "lte": "≤", "eq": "="}.get(key, key)
    lines = [
        "我的理解（**未改动你的工作流**）：",
        "",
        "1. 「连线数」= 该节点的入边数 + 出边数（degree total）。",
        "2. 当前画布：节点 **%d** · 连线 **%d**。" % (n_nodes, n_edges),
        "3. 度分布："
        + (", ".join("度%d×%d" % (k, hist[k]) for k in sorted(hist)) or "—")
        + "。",
        "4. 满足 degree %s %d 的节点共 **%d** 个；若执行删除，会同时去掉这些节点及与其相连的边。"
        % (label, val, len(hit)),
        "5. 度恰好为 2 的节点**不会**被删；只有严格满足上述条件的才删。",
    ]
    if hit:
        lines.append("6. 样例 uuid（前 8 个）：" + ", ".join(hit[:8]))
        lines.append(
            "7. 你确认要改画布时，可再说「删除连线数大于 %d 的节点」；"
            "系统会用补丁 `remove_nodes_by_degree` 打到当前完整工作流上。"
            % (val if key == "gt" else max(0, val - 1 if key == "gte" else val))
        )
    else:
        lines.append("6. 当前没有满足条件的节点，即使执行删除也不会有变化。")
    return "\n".join(lines)


def _node_label(n: dict | None) -> str:
    """人话步骤名：优先 footer，其次 name，再 device。"""
    if not n:
        return "?"
    foot = (n.get("footer") or "").replace("\n", " ").strip()
    if foot:
        return foot[:48] + ("…" if len(foot) > 48 else "")
    name = (n.get("name") or "").strip()
    if name:
        return name
    return (n.get("device_name") or "步骤").strip() or "?"


def _short_uuid(u: str) -> str:
    if not u:
        return ""
    # 复合 uuid a__b 时取末段后 8；否则取末 8
    tail = u.split("__")[-1]
    return tail[-8:] if len(tail) >= 8 else tail


def canvas_live_view(wf: dict | None, max_chars: int = 140000) -> str:
    """人可读的实验室工作流实时视图（给 LLM 理解用，不是原始 UUID dump）。"""
    if not wf:
        return "（画布为空：无节点、无连线）"
    data = wf.get("data") or {}
    nodes = [n for n in (data.get("nodes") or []) if n]
    edges = [e for e in (data.get("edges") or []) if e]
    degrees = compute_degrees(wf)
    uuid_to_i = {n.get("uuid"): i for i, n in enumerate(nodes) if n.get("uuid")}

    by_dev: dict[str, int] = {}
    by_action: dict[str, int] = {}
    disabled_n = 0
    for n in nodes:
        dn = n.get("device_name") or "?"
        by_dev[dn] = by_dev.get(dn, 0) + 1
        an = n.get("name") or "?"
        by_action[an] = by_action.get(an, 0) + 1
        if n.get("disabled"):
            disabled_n += 1
    top_dev = sorted(by_dev.items(), key=lambda x: -x[1])[:10]
    top_act = sorted(by_action.items(), key=lambda x: -x[1])[:10]

    # 起点/终点（入度0 / 出度0 且有连线）
    starts, ends, hubs = [], [], []
    for i, n in enumerate(nodes):
        u = n.get("uuid") or ""
        d = degrees.get(u) or {"in": 0, "out": 0, "total": 0}
        if d["in"] == 0 and d["out"] > 0:
            starts.append(i)
        if d["out"] == 0 and d["in"] > 0:
            ends.append(i)
        if d["total"] > 2:
            hubs.append((i, d["total"]))

    lines = [
        "=== LIVE CANVAS · Uni-Lab 实验室自动化工作流（用户屏幕上正在编辑的图）===",
        "语义说明（必读）：",
        "- 这不是社交网络/抽象 ID 图。每个节点 = 一台实验设备上的一个动作步骤。",
        "- device_name=设备驱动；name=动作类型；footer=步骤说明（人话）；param=执行参数。",
        "- 边 = 执行顺序：#源 → #目标 表示源步骤完成后进入目标步骤。",
        "- 改图时用节点完整 uuid（STEPS 行里的 uuid=）；边在下文用 #序号 表示以免刷屏。",
        "name=%s" % (wf.get("name") or "未命名"),
        "lab=%s" % (wf.get("target_lab_uuid") or ""),
        "规模: steps(节点)=%d  顺序边=%d  禁用步骤=%d" % (len(nodes), len(edges), disabled_n),
        "设备分布: " + (", ".join("%s×%d" % (k, v) for k, v in top_dev) or "—"),
        "动作分布: " + (", ".join("%s×%d" % (k, v) for k, v in top_act) or "—"),
        "起点#（入度0）: " + (",".join("#%d" % i for i in starts[:20]) or "无")
        + (" …共%d" % len(starts) if len(starts) > 20 else ""),
        "终点#（出度0）: " + (",".join("#%d" % i for i in ends[:20]) or "无")
        + (" …共%d" % len(ends) if len(ends) > 20 else ""),
    ]
    if hubs:
        hubs_s = ", ".join("#%d(度%d)" % (i, t) for i, t in sorted(hubs, key=lambda x: -x[1])[:15])
        lines.append("高连线步骤(度>2，前15): " + hubs_s + (" …共%d" % len(hubs) if len(hubs) > 15 else ""))

    # 前几步人话预览，帮助模型立刻建立「这是实验流程」心智
    preview_n = min(12, len(nodes))
    if preview_n:
        lines.append("步骤预览（前%d，人话）:" % preview_n)
        for i in range(preview_n):
            n = nodes[i]
            lines.append(
                "  #%d [%s] %s · %s%s"
                % (
                    i,
                    n.get("device_name") or "?",
                    n.get("name") or "?",
                    _node_label(n),
                    " ·禁用" if n.get("disabled") else "",
                )
            )

    lines.append(
        "STEPS 全表格式: #i [设备] 动作 | 说明 | 入/出/总度 | 禁用 | uuid=完整 | p:参数"
    )
    step_lines = []
    for i, n in enumerate(nodes):
        u = n.get("uuid") or ""
        d = degrees.get(u) or {"in": 0, "out": 0, "total": 0}
        step_lines.append(
            "#%d [%s] %s | %s | %d/%d/%d | %s | uuid=%s | p:%s"
            % (
                i,
                n.get("device_name") or "?",
                n.get("name") or "?",
                _node_label(n),
                d["in"],
                d["out"],
                d["total"],
                "禁用" if n.get("disabled") else "启用",
                u,
                _compact_param(n.get("param"), 100),
            )
        )

    # 边：只用 #i→#j，绝不 dump 长 uuid（那会让模型误以为这是抽象 ID 图）
    edge_idx_pairs = []
    unknown = 0
    for e in edges:
        si = uuid_to_i.get(e.get("source_node_uuid"))
        ti = uuid_to_i.get(e.get("target_node_uuid"))
        if si is None or ti is None:
            unknown += 1
            continue
        edge_idx_pairs.append((si, ti))

    # 尝试拼出若干线性链片段，比裸边表更好懂
    succ: dict[int, list[int]] = {}
    for s, t in edge_idx_pairs:
        succ.setdefault(s, []).append(t)
    chain_lines = []
    seen_edge = set()
    for s0 in starts[:30] or ([0] if nodes else []):
        path = [s0]
        cur = s0
        for _ in range(40):
            nxts = [t for t in succ.get(cur, []) if (cur, t) not in seen_edge]
            if len(nxts) != 1:
                break
            t = nxts[0]
            seen_edge.add((cur, t))
            path.append(t)
            cur = t
        if len(path) >= 2:
            # 链上写 #i:短说明
            bits = []
            for ix in path[:16]:
                bits.append("#%d:%s" % (ix, _node_label(nodes[ix])[:20]))
            extra = "→…" if len(path) > 16 else ""
            chain_lines.append("  " + " → ".join(bits) + extra + " （长%d）" % len(path))
        if len(chain_lines) >= 12:
            break

    edge_lines = ["顺序边（用步骤序号，共%d，未知端点%d）:" % (len(edge_idx_pairs), unknown)]
    if chain_lines:
        edge_lines.append("执行链片段（便于阅读，非全部）:")
        edge_lines.extend(chain_lines)
    edge_lines.append("全部边 #源→#目标:")
    # 压缩边：每行多个
    buf = []
    row = []
    for s, t in edge_idx_pairs:
        row.append("#%d→#%d" % (s, t))
        if len(row) >= 12:
            buf.append("  " + " ".join(row))
            row = []
    if row:
        buf.append("  " + " ".join(row))
    edge_lines.extend(buf)

    # 组装：优先语义头 + 全步骤 + 边；超长时保步骤、压缩边
    head = "\n".join(lines)
    steps_blob = "\n".join(step_lines)
    edges_blob = "\n".join(edge_lines)
    text = head + "\n" + steps_blob + "\n" + edges_blob
    if len(text) <= max_chars:
        return text

    # 超长：先砍「全部边」行，保留链片段 + 步骤
    keep_edges = "\n".join(edge_lines[: 2 + min(12, len(chain_lines))] + [
        "（全部边表已省略以省额度；边总数=%d。改拓扑请用 ops，uuid 见 STEPS。）" % len(edge_idx_pairs)
    ])
    text2 = head + "\n" + steps_blob + "\n" + keep_edges
    if len(text2) <= max_chars:
        return text2

    # 再砍步骤尾部，但标明总数
    room = max_chars - len(head) - len(keep_edges) - 80
    kept = []
    used = 0
    for ln in step_lines:
        if used + len(ln) + 1 > room:
            break
        kept.append(ln)
        used += len(ln) + 1
    return (
        head
        + "\n"
        + "\n".join(kept)
        + "\n…STEPS 显示 %d/%d；完整 uuid 以上已列部分为准，未列出的步骤仍存在于画布。\n"
        % (len(kept), len(step_lines))
        + keep_edges
    )


def compact_workflow_json(wf: dict | None) -> dict | None:
    """缩小体积但仍含全部节点/边：去掉显示态、压缩 pose。"""
    if not wf or not isinstance(wf, dict):
        return None
    import copy
    out = {
        "name": wf.get("name"),
        "target_lab_uuid": wf.get("target_lab_uuid"),
        "workflow_uuid": wf.get("workflow_uuid") or ((wf.get("data") or {}).get("workflow_uuid")),
        "data": {"nodes": [], "edges": []},
    }
    for n in ((wf.get("data") or {}).get("nodes") or []):
        if not n:
            continue
        pose = n.get("pose") or {}
        pos = pose.get("position") or {}
        nn = {
            "uuid": n.get("uuid"),
            "name": n.get("name"),
            "device_name": n.get("device_name"),
            "resource_name": n.get("resource_name"),
            "template_uuid": n.get("template_uuid"),
            "template_name": n.get("template_name"),
            "footer": n.get("footer"),
            "disabled": bool(n.get("disabled")),
            "param": n.get("param"),
            "pose": {"position": {"x": pos.get("x"), "y": pos.get("y")}},
        }
        out["data"]["nodes"].append(nn)
    for e in ((wf.get("data") or {}).get("edges") or []):
        if not e:
            continue
        out["data"]["edges"].append({
            "source_node_uuid": e.get("source_node_uuid"),
            "target_node_uuid": e.get("target_node_uuid"),
            "source_handle_key": e.get("source_handle_key") or "ready",
            "source_handle_io": e.get("source_handle_io") or "source",
            "target_handle_key": e.get("target_handle_key") or "ready",
            "target_handle_io": e.get("target_handle_io") or "target",
        })
    return out


_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def extract_workflow_json(text: str) -> dict | None:
    """从回复中提取工作流 JSON（优先 fenced block，其次整段 JSON）。"""
    if not text:
        return None
    candidates: list[str] = []
    for m in _JSON_FENCE.finditer(text):
        candidates.append(m.group(1).strip())
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        candidates.append(stripped)
    # 兜底：找第一个以 { 开头、含 "data" 的大括号块
    if not candidates:
        i = text.find("{")
        if i >= 0:
            candidates.append(text[i:])
    for raw in candidates:
        try:
            obj = json.loads(raw)
        except Exception:
            # 尝试截到最后一个 }
            j = raw.rfind("}")
            if j > 0:
                try:
                    obj = json.loads(raw[: j + 1])
                except Exception:
                    continue
            else:
                continue
        if isinstance(obj, dict) and ("data" in obj or ("nodes" in obj and "edges" in obj)):
            # 裸 {nodes,edges} → 包一层
            if "data" not in obj and "nodes" in obj:
                obj = {
                    "name": obj.get("name") or "AI 生成工作流",
                    "target_lab_uuid": obj.get("target_lab_uuid") or "",
                    "data": {"nodes": obj["nodes"], "edges": obj["edges"]},
                }
            return obj
    return None


def strip_json_fences(text: str) -> str:
    """给用户看的回复：去掉超长 JSON / patch fence，换成短提示。"""
    if not text:
        return ""
    def _repl(m):
        body = m.group(1).strip()
        if '"ops"' in body:
            try:
                obj = json.loads(body)
                n = len(obj.get("ops") or [])
                return "\n（已生成 %d 条画布补丁，将直接改当前工作流）\n" % n
            except Exception:
                return "\n（已附带画布补丁）\n"
        if '"nodes"' in body or '"data"' in body:
            try:
                obj = json.loads(body)
                n = len(((obj.get("data") or obj).get("nodes") or []))
                e = len(((obj.get("data") or obj).get("edges") or []))
                return "\n（已生成完整工作流：节点 %d · 边 %d，将直接改画布）\n" % (n, e)
            except Exception:
                return "\n（已附带工作流 JSON，将直接改画布）\n"
        return m.group(0)
    return _JSON_FENCE.sub(_repl, text).strip()


def extract_ops_patch(text: str) -> list | None:
    """从回复中提取 {\"ops\":[...]} 补丁。"""
    if not text:
        return None
    candidates: list[str] = []
    for m in _JSON_FENCE.finditer(text):
        candidates.append(m.group(1).strip())
    stripped = text.strip()
    if stripped.startswith("{") and '"ops"' in stripped:
        candidates.append(stripped)
    for raw in candidates:
        try:
            obj = json.loads(raw)
        except Exception:
            j = raw.rfind("}")
            if j > 0:
                try:
                    obj = json.loads(raw[: j + 1])
                except Exception:
                    continue
            else:
                continue
        if isinstance(obj, dict) and isinstance(obj.get("ops"), list) and obj["ops"]:
            # 排除误把完整工作流当成 patch
            if "data" in obj and isinstance((obj.get("data") or {}).get("nodes"), list):
                continue
            return obj["ops"]
    return None


def apply_ops_to_workflow(workflow: dict | None, ops: list) -> dict[str, Any]:
    """把 ops 打到当前工作流副本上，返回完整结果。"""
    import copy
    if not workflow or not isinstance(workflow, dict):
        return {"ok": False, "error": "无当前工作流，无法打补丁", "workflow": None, "log": []}
    wf = copy.deepcopy(workflow)
    data = wf.setdefault("data", {})
    nodes = list(data.get("nodes") or [])
    edges = list(data.get("edges") or [])
    log: list[str] = []

    def by_uuid():
        return {n.get("uuid"): n for n in nodes if n and n.get("uuid")}

    for raw_op in ops or []:
        if not isinstance(raw_op, dict):
            continue
        op = (raw_op.get("op") or raw_op.get("action") or "").strip()
        if op in ("prune_orphans_disabled", "prune"):
            r = prune_orphans_and_disabled_edges({"data": {"nodes": nodes, "edges": edges}})
            if r.get("ok") and r.get("workflow"):
                nodes = list((r["workflow"].get("data") or {}).get("nodes") or [])
                edges = list((r["workflow"].get("data") or {}).get("edges") or [])
                log.append("prune: -边%d -节点%d" % (r.get("removed_edges") or 0, r.get("removed_nodes") or 0))
            continue
        if op == "remove_edges_to_disabled":
            disabled = {n.get("uuid") for n in nodes if n and n.get("disabled")}
            before = len(edges)
            edges = [e for e in edges if e and e.get("source_node_uuid") not in disabled and e.get("target_node_uuid") not in disabled]
            log.append("remove_edges_to_disabled: -%d" % (before - len(edges)))
            continue
        if op == "remove_isolated_nodes":
            linked = set()
            for e in edges:
                linked.add(e.get("source_node_uuid"))
                linked.add(e.get("target_node_uuid"))
            before = len(nodes)
            nodes = [n for n in nodes if n and n.get("uuid") in linked]
            log.append("remove_isolated_nodes: -%d" % (before - len(nodes)))
            continue
        if op == "remove_nodes_by_degree":
            deg_map = {}
            for n in nodes:
                if n and n.get("uuid"):
                    deg_map[n["uuid"]] = 0
            for e in edges:
                if not e:
                    continue
                s, t = e.get("source_node_uuid"), e.get("target_node_uuid")
                if s in deg_map:
                    deg_map[s] += 1
                if t in deg_map:
                    deg_map[t] += 1
            gt = raw_op.get("gt")
            gte = raw_op.get("gte")
            lt = raw_op.get("lt")
            lte = raw_op.get("lte")
            eq = raw_op.get("eq")
            if all(x is None for x in (gt, gte, lt, lte, eq)):
                log.append("remove_nodes_by_degree: skipped (no threshold)")
                continue
            removed = set()
            for u, tdeg in deg_map.items():
                ok = True
                if gt is not None and not (tdeg > int(gt)):
                    ok = False
                if gte is not None and not (tdeg >= int(gte)):
                    ok = False
                if lt is not None and not (tdeg < int(lt)):
                    ok = False
                if lte is not None and not (tdeg <= int(lte)):
                    ok = False
                if eq is not None and not (tdeg == int(eq)):
                    ok = False
                if ok:
                    removed.add(u)
            before = len(nodes)
            nodes = [n for n in nodes if n and n.get("uuid") not in removed]
            edges = [
                e for e in edges
                if e and e.get("source_node_uuid") not in removed and e.get("target_node_uuid") not in removed
            ]
            log.append("remove_nodes_by_degree: -%d nodes" % (before - len(nodes)))
            continue
        if op == "remove_nodes":
            ids = set(raw_op.get("uuids") or [])
            match = raw_op.get("match") or {}
            before = len(nodes)
            def drop(n):
                if not n:
                    return True
                if n.get("uuid") in ids:
                    return True
                if match.get("disabled") is True and n.get("disabled"):
                    return True
                if match.get("device_name") and n.get("device_name") == match.get("device_name"):
                    return True
                if match.get("name") and n.get("name") == match.get("name"):
                    return True
                return False
            removed = {n.get("uuid") for n in nodes if drop(n)}
            nodes = [n for n in nodes if n and n.get("uuid") not in removed]
            edges = [e for e in edges if e.get("source_node_uuid") not in removed and e.get("target_node_uuid") not in removed]
            log.append("remove_nodes: -%d" % (before - len(nodes)))
            continue
        if op == "remove_edges":
            before = len(edges)
            src = raw_op.get("source") or raw_op.get("source_node_uuid")
            tgt = raw_op.get("target") or raw_op.get("target_node_uuid")
            incident = set(raw_op.get("incident_uuids") or [])
            if raw_op.get("incident_to_disabled"):
                incident |= {n.get("uuid") for n in nodes if n and n.get("disabled")}
            new_edges = []
            for e in edges:
                if not e:
                    continue
                if src and tgt and e.get("source_node_uuid") == src and e.get("target_node_uuid") == tgt:
                    continue
                if src and not tgt and e.get("source_node_uuid") == src:
                    continue
                if tgt and not src and e.get("target_node_uuid") == tgt:
                    continue
                if e.get("source_node_uuid") in incident or e.get("target_node_uuid") in incident:
                    continue
                new_edges.append(e)
            edges = new_edges
            log.append("remove_edges: -%d" % (before - len(edges)))
            continue
        if op == "set_disabled":
            ids = set(raw_op.get("uuids") or ([] if not raw_op.get("uuid") else [raw_op.get("uuid")]))
            flag = bool(raw_op.get("disabled", True))
            nmap = by_uuid()
            c = 0
            for u in ids:
                if u in nmap:
                    nmap[u]["disabled"] = flag
                    c += 1
            log.append("set_disabled(%s): %d" % (flag, c))
            continue
        if op in ("update_param", "merge_param"):
            u = raw_op.get("uuid")
            patch = raw_op.get("param") or {}
            nmap = by_uuid()
            if u in nmap and isinstance(patch, dict):
                cur = nmap[u].get("param")
                if not isinstance(cur, dict):
                    cur = {}
                cur = dict(cur)
                cur.update(patch)
                nmap[u]["param"] = cur
                log.append("update_param: %s" % u)
            continue
        if op == "update_footer":
            u = raw_op.get("uuid")
            nmap = by_uuid()
            if u in nmap and "footer" in raw_op:
                nmap[u]["footer"] = raw_op.get("footer")
                log.append("update_footer: %s" % u)
            continue
        if op == "set_workflow_name":
            name = raw_op.get("name")
            if name:
                wf["name"] = name
                data["workflow_name"] = name
                log.append("set_workflow_name")
            continue
        log.append("skip_unknown_op: %s" % op)

    # 最终清悬空边
    ids = {n.get("uuid") for n in nodes if n}
    edges = [e for e in edges if e.get("source_node_uuid") in ids and e.get("target_node_uuid") in ids]
    data["nodes"] = nodes
    data["edges"] = edges
    return {
        "ok": True,
        "workflow": wf,
        "log": log,
        "kept_nodes": len(nodes),
        "kept_edges": len(edges),
    }


def looks_truncated_workflow(original: dict | None, candidate: dict | None) -> bool:
    """疑似半截/示意 JSON：改图场景下节点暴跌或含截断标记。"""
    if not candidate:
        return True
    raw = json.dumps(candidate, ensure_ascii=False)
    if "中间省略" in raw or '"_note"' in raw:
        return True
    on = len(((original or {}).get("data") or {}).get("nodes") or [])
    cn = len(((candidate.get("data") or candidate).get("nodes") or []))
    if on >= 20 and cn < max(8, int(on * 0.45)):
        return True
    return False


WF_SYSTEM_PROMPT = """你是「工作流编辑器 · Uni-Lab 工作流 Agent」。
核心目的：读懂并修改用户屏幕上的**实验室自动化工作流**（设备动作步骤图）。

## 如何读 LIVE_CANVAS（最重要）
- 每个节点是一个实验步骤：看 [设备]、动作名、说明(footer)，不要只盯着长 uuid。
- `#3→#4` / 执行链片段表示步骤先后顺序，不是不明「层级符号」。
- 总结画布时用中文讲：有哪些设备、主要动作、是否线性链、有无禁用/高连线汇合点；引用「步骤预览」里的说明文字。
- 禁止输出「这似乎是复杂图结构/独特标识符网络，请提供更多上下文」这类空话。

硬性规则：
1. 有 LIVE_CANVAS 就等于已看见画布；禁止说看不到/没有 JSON/请再提供信息。
2. 禁止编造示意节点或示意 JSON。
3. 「不要动 / 先理解」：只文字分析，禁止 ops / 完整 JSON。
4. 改大图只用 {"ops":[...]}，不要整图替换。

常用 ops：
- remove_isolated_nodes / remove_edges_to_disabled / prune_orphans_disabled
- remove_nodes_by_degree（gt/gte…；连线数=入+出）
- remove_nodes / set_disabled / update_param / update_footer / set_workflow_name

撤销走编辑器撤销栈。简洁中文。"""


def detect_local_action(message: str) -> str | None:
    """仅无歧义动作可绕过 LLM（撤销/重做）。改图画布一律交给模型看实时视图。"""
    msg = (message or "").strip()
    if not msg:
        return None
    if re.search(r"^(请)?(帮我)?(撤销|回退|还原)(当前|刚才|上一步|本次)?(的)?(修改|改动|操作)?$", msg):
        return "undo"
    if ("撤销" in msg or "回退" in msg) and any(k in msg for k in ("当前", "刚才", "上一步", "本次", "修改")) \
            and not any(k in msg for k in ("不要撤销", "别撤销", "坐标", "参数")):
        return "undo"
    if re.search(r"^(请)?(帮我)?(重做|恢复撤销)$", msg):
        return "redo"
    if msg.lower() == "undo":
        return "undo"
    if msg.lower() == "redo":
        return "redo"
    return None


def remove_isolated_nodes_only(workflow: dict | None) -> dict[str, Any]:
    """只删度数为 0 的孤立节点；不改任何连线。"""
    if not workflow or not isinstance(workflow, dict):
        return {"ok": False, "error": "无工作流", "workflow": None}
    import copy
    wf = copy.deepcopy(workflow)
    data = wf.setdefault("data", {})
    nodes = list(data.get("nodes") or [])
    edges = list(data.get("edges") or [])
    linked = set()
    for e in edges:
        if not e:
            continue
        linked.add(e.get("source_node_uuid"))
        linked.add(e.get("target_node_uuid"))
    before_n = len(nodes)
    kept = [n for n in nodes if n and n.get("uuid") in linked]
    data["nodes"] = kept
    data["edges"] = edges
    return {
        "ok": True,
        "workflow": wf,
        "removed_edges": 0,
        "removed_nodes": before_n - len(kept),
        "kept_nodes": len(kept),
        "kept_edges": len(edges),
    }


def prune_orphans_and_disabled_edges(workflow: dict | None) -> dict[str, Any]:
    """服务端同构清理：删禁用相关边 → 删度数为 0 的孤立节点。"""
    if not workflow or not isinstance(workflow, dict):
        return {"ok": False, "error": "无工作流", "workflow": None}
    import copy
    wf = copy.deepcopy(workflow)
    data = wf.setdefault("data", {})
    nodes = list(data.get("nodes") or [])
    edges = list(data.get("edges") or [])
    disabled = {n.get("uuid") for n in nodes if n and n.get("disabled")}
    before_e = len(edges)
    edges = [
        e for e in edges
        if e and e.get("source_node_uuid") not in disabled and e.get("target_node_uuid") not in disabled
    ]
    removed_edges = before_e - len(edges)
    linked = set()
    for e in edges:
        linked.add(e.get("source_node_uuid"))
        linked.add(e.get("target_node_uuid"))
    before_n = len(nodes)
    kept = [n for n in nodes if n and n.get("uuid") in linked]
    removed_nodes = before_n - len(kept)
    kept_ids = {n.get("uuid") for n in kept}
    edges = [
        e for e in edges
        if e.get("source_node_uuid") in kept_ids and e.get("target_node_uuid") in kept_ids
    ]
    data["nodes"] = kept
    data["edges"] = edges
    return {
        "ok": True,
        "workflow": wf,
        "removed_edges": removed_edges,
        "removed_nodes": removed_nodes,
        "kept_nodes": len(kept),
        "kept_edges": len(edges),
    }


def run_agent(
    message: str,
    history: list[dict] | None = None,
    workflow: dict | None = None,
    model: str | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    # 确定性动作：不走 LLM
    local = detect_local_action(message)
    if local in ("undo", "redo"):
        return {
            "ok": True,
            "reply": "将执行编辑器本地%s（基于画布撤销栈，不经模型重写）。" % ("撤销" if local == "undo" else "重做"),
            "workflow": None,
            "action": local,
            "apply_direct": True,
            "skill": str(skill_root()) if skill_root() else None,
        }

    analysis_only = is_analysis_only(message)
    degree_thr = parse_degree_threshold(message)

    # 「先理解 / 不要动」+ 度数类问题：服务器直接出真实统计，不经 LLM、不改画布
    if analysis_only and (degree_thr or re.search(r"连线数|度数|度分布", message or "")):
        return {
            "ok": True,
            "reply": analysis_reply_for_degree(workflow, message),
            "workflow": None,
            "apply_direct": False,
            "action": "analysis_only",
            "skill": str(skill_root()) if skill_root() else None,
        }

    # 明确「按连线数/度数删除」：服务器对当前完整画布打确定性补丁，不经 LLM（避免示意 JSON）
    if wants_degree_remove(message) and degree_thr and workflow and not analysis_only:
        ops = [{"op": "remove_nodes_by_degree", **degree_thr}]
        applied = apply_ops_to_workflow(workflow, ops)
        if not applied.get("ok"):
            return {
                "ok": False,
                "error": applied.get("error") or "按度数删除失败",
                "reply": analysis_reply_for_degree(workflow, message),
                "ops": ops,
            }
        deg = compute_degrees(workflow)
        hit_n = len(filter_uuids_by_degree(deg, **degree_thr))
        key = next(iter(degree_thr))
        val = degree_thr[key]
        label = {"gt": ">", "gte": "≥", "lt": "<", "lte": "≤", "eq": "="}.get(key, key)
        reply = (
            "理解：删除当前画布上「连线数（入+出）%s %d」的节点，并去掉其关联边。\n"
            "匹配节点 **%d** 个。已用补丁 `remove_nodes_by_degree` 打到完整工作流（可撤销）。\n"
            "- %s\n"
            "- 现保留节点 %s · 连线 %s"
            % (
                label,
                val,
                hit_n,
                "; ".join(applied.get("log") or []) or "ok",
                applied.get("kept_nodes"),
                applied.get("kept_edges"),
            )
        )
        validation = validate_workflow_doc(applied["workflow"])
        return {
            "ok": True,
            "reply": reply,
            "workflow": applied["workflow"],
            "ops": ops,
            "validation": validation,
            "apply_direct": True,
            "action": "apply_ops",
            "stats": {
                "ops": 1,
                "log": applied.get("log") or [],
                "kept_nodes": applied.get("kept_nodes"),
                "kept_edges": applied.get("kept_edges"),
                "matched_nodes": hit_n,
            },
            "skill": str(skill_root()) if skill_root() else None,
        }

    # 画布必须进 LLM 的 user 消息；见 assemble_llm_messages（修「模型说看不到」）
    msg_for_llm = message or ""
    if analysis_only:
        msg_for_llm += (
            "\n\n【系统约束】本次只要理解/说明，禁止输出 ops 或完整工作流 JSON，禁止改画布。"
        )
    elif wants_degree_remove(message) and degree_thr:
        msg_for_llm += (
            "\n\n【系统约束】请只输出 "
            '{"ops":[{"op":"remove_nodes_by_degree",%s}]} ，不要输出完整工作流 JSON。'
            % json.dumps(degree_thr, ensure_ascii=False)[1:-1]
        )

    msgs, llm_ingest = assemble_llm_messages(msg_for_llm, workflow, history)
    if not llm_ingest.get("workflow_received"):
        return {
            "ok": False,
            "error": "后端未收到 workflow：画布没有进到 LLM 请求。请确认前端 POST 带了 workflow 字段。",
            "llm_ingest": llm_ingest,
            "reply": "",
        }
    if llm_ingest.get("nodes", 0) <= 0:
        # 空画布仍可问生成类问题，继续；但收据标明
        pass

    meta = ext_llm._post(
        msgs, temperature=0.15, timeout=180,
        model=model, base_url=base_url, api_key=api_key, return_meta=True,
    )
    if isinstance(meta, dict):
        raw = meta.get("content") or ""
        reasoning = (meta.get("reasoning") or "").strip()
        llm_latency_ms = meta.get("latency_ms")
    else:
        raw = meta or ""
        reasoning = ""
        llm_latency_ms = None
    reply = strip_json_fences(raw)
    ops = extract_ops_patch(raw)
    wf_out = None
    validation = None
    apply_direct = False
    action = None
    stats: dict[str, Any] = {}

    # 「不要动」：即使模型误吐 ops / 整图，也一律不应用
    if analysis_only:
        if ops or extract_workflow_json(raw):
            reply = (
                analysis_reply_for_degree(workflow, message)
                if (degree_thr or re.search(r"连线|度", message or ""))
                else (reply + "\n\n（按你的要求，本次未改动画布。）")
            )
        return {
            "ok": True,
            "reply": reply,
            "workflow": None,
            "apply_direct": False,
            "action": "analysis_only",
            "llm_ingest": llm_ingest,
            "reasoning": reasoning or None,
            "llm_latency_ms": llm_latency_ms,
            "skill": str(skill_root()) if skill_root() else None,
        }

    # 模型胡编示意整图 / 没吐出 ops：对明确的度数删除意图，用服务器确定性补丁兜底
    if (not ops) and wants_degree_remove(message) and degree_thr and workflow:
        cand = extract_workflow_json(raw)
        need_fallback = True
        if cand and not looks_truncated_workflow(workflow, cand):
            need_fallback = False
        if need_fallback:
            ops = [{"op": "remove_nodes_by_degree", **degree_thr}]
            reply = (
                (reply + "\n\n" if reply else "")
                + "模型未给出可用补丁（或给出了不完整示意 JSON），"
                "已改用服务器按当前画布计算的确定性补丁：remove_nodes_by_degree %s。"
                % json.dumps(degree_thr, ensure_ascii=False)
            )

    # 1) 优先：ops 补丁打到当前画布完整 JSON → 直接改画布
    if ops:
        applied = apply_ops_to_workflow(workflow, ops)
        if not applied.get("ok"):
            return {
                "ok": False,
                "error": applied.get("error") or "补丁应用失败",
                "reply": reply,
                "ops": ops,
                "llm_ingest": llm_ingest,
            }
        wf_out = applied["workflow"]
        apply_direct = True
        action = "apply_ops"
        stats = {
            "ops": len(ops),
            "log": applied.get("log") or [],
            "kept_nodes": applied.get("kept_nodes"),
            "kept_edges": applied.get("kept_edges"),
        }
        reply += "\n\n✅ 已把 %d 条补丁打到当前工作流（将直接改画布，可撤销）。" % len(ops)
        if stats["log"]:
            reply += "\n- " + "\n- ".join(stats["log"][:20])
        validation = validate_workflow_doc(wf_out)
        if validation and not validation["ok"]:
            reply += "\n\n⚠️ skill 校验提示：\n- " + "\n- ".join((validation.get("problems") or [])[:8])
    else:
        # 2) 完整工作流 JSON（从零生成或小图替换）
        cand = extract_workflow_json(raw)
        if cand:
            if looks_truncated_workflow(workflow, cand):
                reply += (
                    "\n\n⚠️ 模型返回的工作流疑似不完整/被截断，**已拒绝改画布**。"
                    "请改用补丁格式 {\"ops\":[...]}，或缩小改动范围后重试。"
                )
                cand = None
            else:
                wf_out = cand
                apply_direct = True
                action = "replace_workflow"
                validation = validate_workflow_doc(wf_out)
                if validation and validation.get("ok"):
                    reply += "\n\n✅ 完整工作流将直接写入画布 · " + (validation.get("summary") or "")
                elif validation:
                    reply += "\n\n⚠️ 将写入画布，但 skill 校验未完全通过：\n- " + "\n- ".join(
                        (validation.get("problems") or [])[:8]
                    )

    return {
        "ok": True,
        "reply": reply or "（无文本回复）",
        "workflow": wf_out,
        "ops": ops,
        "validation": validation,
        "apply_direct": apply_direct,
        "action": action,
        "stats": stats,
        "llm_ingest": llm_ingest,
        "reasoning": reasoning or None,
        "llm_latency_ms": llm_latency_ms,
        "skill": str(skill_root()) if skill_root() else None,
    }
