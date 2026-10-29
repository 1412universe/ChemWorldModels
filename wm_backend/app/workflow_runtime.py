# -*- coding: utf-8 -*-
"""
并行工作流运行内核（Uni-Lab OS Edge 调度语义的轻量移植）

设计目标
--------
1. **语义对齐** `Uni-Lab-OS/unilabos/app/scheduler/`：
   - `dag_state.py`：`_pending_parents` 入度表 → `ready_nodes()`（入度为 0 即可执行；
     多个节点同时就绪 = 天然并行）；`mark_finished()` 从子节点依赖表摘除 → 级联放出后继；
     `_detect_cycle()` DFS 环检测。
   - `resource_lock_key.py` + `resource_lock.py`：设备/物料/库位互斥键与冲突判定。
     **同一设备同时只跑一个节点，不同设备可并行** —— 这就是"可运行并行工作流"的核心。
   - `dispatch.py`：`build_job_start_payload()` 的 job_start 载荷形状（real 适配器用）。

2. **零三方依赖**：只用 threading / queue / time / json，不 import unilabos（其 scheduler
   依赖 ROS/messages 栈，本轻量副本没有该运行时）。

3. **dry-run 优先**：默认按动作语义估算耗时并模拟执行，产出可观看的并行时间轴；
   real 模式由 `UniLabOSDispatcher`（`app/gn_adapter/`）接到 Uni-Lab-OS 的 GN 驱动上，
   直接进程内 OPC UA 驱动 510 工站硬件。

real 模式的三档（`UniLabOSDispatcher`）
--------------------------------------
    mode=real + action_mode=simulate  驱动真跑，OPC 读写空成功 → 零风险联调挡位
    mode=real + action_mode=real      真 OPC 会话；需 GN_ALLOW_REAL=1 才放行
    mode=real 且未打开总闸            → 明确拒绝下发（绝不静默假成功）

对外接口
--------
    run = WorkflowRun(workflow, mode="dry", speed=60.0)
    run.start(); run.snapshot(); run.cancel()
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------- 节点状态
PENDING = "pending"       # 尚有未完成的前置依赖
READY = "ready"           # 依赖已清零，等待设备锁
RUNNING = "running"       # 已下发执行
SUCCESS = "success"
FAILED = "failed"
SKIPPED = "skipped"       # 禁用节点
CANCELED = "canceled"
TERMINAL = {SUCCESS, FAILED, SKIPPED, CANCELED}


def _ctx_canceled(ctx: Optional[Dict[str, Any]]) -> bool:
    ctx = ctx or {}
    if ctx.get("canceled"):
        return True
    ev = ctx.get("cancel_event")
    return bool(ev is not None and ev.is_set())


def _ctx_paused(ctx: Optional[Dict[str, Any]]) -> bool:
    ev = (ctx or {}).get("pause_event")
    return bool(ev is not None and ev.is_set())


def _wait_if_running(ctx: Optional[Dict[str, Any]]) -> bool:
    """暂停期间停在当前节点。返回 False 表示等待中被取消。"""
    while _ctx_paused(ctx):
        if _ctx_canceled(ctx):
            return False
        time.sleep(0.05)
    return not _ctx_canceled(ctx)


class WorkflowCycleError(ValueError):
    """工作流存在循环依赖。"""


# ---------------------------------------------------------------- 资源锁
def device_lock_key(device: str) -> str:
    """设备级执行互斥键（对齐 unilabos.workflow.resource_lock_key.device_lock_key）。"""
    return "/devices/" + (device or "").strip()


def named_resource_lock_key(alias: str) -> str:
    """命名资源（枪头盒/深孔板/储液槽等）互斥键。

    真实实现用 uuid5 把别名哈希成稳定身份；这里保留同样的"规范化成稳定键"语义。
    """
    import hashlib
    h = hashlib.sha1(("unilabos:scheduler:named-resource-lock:v1:" + (alias or "").strip())
                     .encode("utf-8")).hexdigest()[:16]
    return "resource:" + h


def node_lock_keys(node: Dict[str, Any]) -> Set[str]:
    """一个节点执行时需要独占的资源键集合。

    - 设备键：`resource_name` 优先，回落到 `device_name`（对齐 drivenby device tenancy）。
    - 物料键：PRCXI 类节点的 sources/targets/tip_racks 资源引用（params 里的 uuid 列表）。
    """
    keys: Set[str] = set()
    dev = node.get("resource_name") or node.get("device_name") or ""
    if dev:
        keys.add(device_lock_key(dev))
    p = node.get("param") or {}
    for field in ("sources", "targets", "tip_racks", "plate", "resource"):
        vals = p.get(field)
        if isinstance(vals, list):
            for v in vals:
                if isinstance(v, dict) and v.get("uuid"):
                    keys.add(named_resource_lock_key(str(v["uuid"])))
                elif isinstance(v, str) and v:
                    keys.add(named_resource_lock_key(v))
        elif isinstance(vals, dict) and vals.get("uuid"):
            keys.add(named_resource_lock_key(str(vals["uuid"])))
    return keys


def conflicting(requested: Set[str], held: Set[str]) -> Set[str]:
    """返回 requested 中与已持有集合冲突的键（对齐 conflicting_resource_lock_keys）。"""
    return requested & held


def resource_lock_plan(nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """静态资源计划：给出"哪些节点因共用资源必须串行"的预测，供前端与校验使用。"""
    by_key: Dict[str, List[str]] = {}
    for n in nodes:
        for k in node_lock_keys(n):
            by_key.setdefault(k, []).append(n.get("uuid", ""))
    hot = {k: v for k, v in by_key.items() if len(v) > 1 and k.startswith("/devices/")}
    return {
        "keys": {k: v for k, v in by_key.items()},
        "serialized_devices": {k.split("/devices/")[-1]: len(v) for k, v in hot.items()},
    }


# ---------------------------------------------------------------- 耗时估算
def _label(node: Dict[str, Any]) -> str:
    return str(node.get("_label") or node.get("footer") or node.get("name") or "")


def _num(p: Dict[str, Any], *keys: str) -> Optional[float]:
    for k in keys:
        v = p.get(k)
        if isinstance(v, (int, float)):
            return float(v)
    return None


def estimate_duration(node: Dict[str, Any]) -> float:
    """按动作语义估算该节点的物理耗时（秒）。dry-run 用它模拟执行。

    优先使用真实工艺参数（烘箱小时/分钟、离心秒、温控时间），其余按动作关键词给经验值。
    """
    p = node.get("param") or {}
    lbl = _label(node)
    dev = node.get("device_name") or ""
    ct = p.get("cmd_type")

    # 1) 真实时长参数优先
    hours = _num(p, "hours")
    if hours:
        return max(1.0, hours * 3600.0)
    # 离心机 Centrifuge_Time 的数值单位是秒（参数名仍是 time_minutes）
    if dev == "gn_centrifuge":
        spin_s = _num(p, "time_minutes")
        if spin_s:
            return max(1.0, spin_s)
    minutes = _num(p, "minutes", "minutes_1", "time_minutes", "stir_time_minutes")
    if minutes:
        return max(1.0, minutes * 60.0)
    for k in ("temperature", "temperature_1"):
        # 升温到达设定值：粗略按温差给 4 分钟
        if p.get(k) is not None:
            return 240.0

    # 2) 按动作语义
    kw_fast = ("复位", "回原点", "停止", "使能", "失能", "开关门", "开门", "关门", "去皮", "状态")
    kw_move = ("向左", "向右", "向上", "向下", "向里", "向外", "移动", "旋转", "走位", "回原点")
    kw_grab = ("抓取", "放置", "夹取", "夹紧", "松开", "夹料", "放料", "取料", "取桶", "放回",
               "取枪头", "放枪头", "卸载", "装载", "顶出", "接料", "压料")
    kw_dose = ("加料", "下料", "加样", "称重", "称量")
    kw_liq = ("移液", "吸液", "放液", "混匀", "吹样", "滴注", "移板", "搬运", "孵育", "震荡")
    kw_proto = ("建协议", "跑协议", "create_protocol", "run_protocol")
    kw_lock = ("终锁", "预锁", "拧松", "拧紧")

    def has(words):
        return any(w in lbl for w in words)

    if dev == "PRCXI" or has(kw_proto):
        return 3.0
    if has(kw_lock):
        return 8.0
    if has(kw_fast):
        return 1.5
    if has(kw_grab):
        return 3.5
    if has(kw_dose):
        return 6.0
    if has(kw_liq):
        return 5.0
    if has(kw_move):
        return 2.5
    if ct is not None:
        return 2.5
    return 3.0


# ---------------------------------------------------------------- 执行器适配器
class Dispatcher:
    """执行适配器接口。

    real 模式：实现 `run_node(node, ctx)`，把节点下发到 Uni-Lab OS 并阻塞到完成，
    返回 (ok: bool, info: dict)。可复用 `build_job_start_payload()` 构造 job_start 载荷，
    经 hostlink / ws_client 的 MessageProcessor._handle_job_start 下发。
    """

    name = "base"

    def run_node(self, node: Dict[str, Any], ctx: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        raise NotImplementedError

    def cancel(self, job_id: str) -> None:  # 可选实现
        return None


class DryRunDispatcher(Dispatcher):
    """干跑执行器：按估算耗时 sleep，不碰硬件。

    时间轴策略：sim = clamp(est / speed, floor, ceil)。
      - floor/ceil 让单个节点既不至于「瞬时闪过」（看不清状态变化），
        也不会让一个 6 小时的烘箱节点把演示拖成 6 小时。
      - 工作流很大时 `tune()` 会自适应把窗口压小，保证整条流水线的
        dry-run 墙钟时间始终停在「可观看」区间（默认目标 ≤ ~40s）。
    """

    name = "dry-run"

    def __init__(self, speed: float = 60.0, busy: Optional[Set[str]] = None,
                 floor: float = 0.40, ceil: float = 6.0):
        # speed = 时间加速倍率；模拟时长再夹到 [floor, ceil] 秒，保证时间轴可观看
        self.speed = max(1.0, float(speed or 60.0))
        self.busy = busy if busy is not None else set()
        self.floor = float(floor)
        self.ceil = float(ceil)
        self._stop = threading.Event()

    def tune(self, n_nodes: int, target_wall: float = 40.0) -> None:
        """按节点数自适应压缩时间窗。

        最坏情况近似：整条链串行 → 墙钟 ≈ n_nodes * ceil。若超出 target_wall，
        等比缩小 ceil（下限 0.5s），floor 随之取 ceil 的 1/8（下限 0.05s）。
        """
        n = max(1, int(n_nodes or 1))
        ceil = self.ceil
        if n * ceil > target_wall:
            ceil = max(0.5, target_wall / n)
        self.ceil = round(ceil, 4)
        self.floor = round(max(0.05, min(self.floor, ceil / 8.0)), 4)

    def sim_seconds(self, node: Dict[str, Any]) -> float:
        raw = estimate_duration(node)
        return max(self.floor, min(self.ceil, raw / self.speed))

    def run_node(self, node: Dict[str, Any], ctx: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        secs = self.sim_seconds(node)
        left = secs
        while left > 0:
            if self._stop.is_set() or _ctx_canceled(ctx):
                return False, {"error": "canceled"}
            # 暂停时冻住计时：不把这段算进节点耗时，恢复后接着跑完剩余时间。
            if not _wait_if_running(ctx):
                return False, {"error": "canceled"}
            step = min(0.05, left)
            time.sleep(step)
            if self._stop.is_set() or _ctx_canceled(ctx):
                return False, {"error": "canceled"}
            if _ctx_paused(ctx):
                continue
            left -= step
        return True, {"simulated": True, "est_seconds": estimate_duration(node), "sim_seconds": round(secs, 3),
                      "dispatcher": self.name}

    def cancel(self, job_id: str) -> None:
        self._stop.set()


class UniLabOSDispatcher(Dispatcher):
    """GN 510 真机适配器 —— 后端直接跑 Uni-Lab-OS 的 GN 驱动。

    与旧版注释里「经 hostlink / ws_client 下发 job_start」的思路不同：
    GN 驱动的硬件访问**全部走 OPC UA**（`GnPlcClient`，按 URL 单例的整站共享会话），
    与 Uni-Lab-OS 的网络层（ROS2 / hostlink）无关。因此这里**直接进程内调用驱动**，
    少一跳网络、也不需要在 wm_backend 之外再起一个 Uni-Lab-OS 服务。

    三档语义（`action_mode` × `allow_real`）：

        mode=dry                  DryRunDispatcher，纯计时模拟，不加载任何驱动
        mode=real + simulate      驱动真跑、OPC 读写空成功（零风险联调挡位）
        mode=real + real          真 OPC 会话，写 510 硬件。需 `GN_ALLOW_REAL=1`
                                  或显式传 `allow_real=True`，否则**拒绝下发**。

    实现在 `app/gn_adapter/`；本类只做「调度器接口 ↔ 适配器」的薄转发。
    """

    name = "gn-510"

    def __init__(self, host: str = "", token: str = "", action_mode: str = "simulate",
                 allow_real: Optional[bool] = None, url: str = ""):
        # host 保留旧签名：若给了非空 host 就当作 OPC UA 端点（兼容旧调用）
        self.host = host
        self.token = token
        self.url = url or host or ""
        self.action_mode = action_mode or "simulate"
        self.allow_real = allow_real
        self._station = None
        self._canceled = threading.Event()

    # ---- 适配器（懒加载：dry 路径永远不 import 驱动树） ----
    @property
    def station(self):
        if self._station is None:
            from .gn_adapter import get_station
            self._station = get_station(url=self.url or None,
                                        action_mode=self.action_mode,
                                        allow_real=self.allow_real)
        return self._station

    def run_node(self, node: Dict[str, Any], ctx: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        ctx = dict(ctx or {})
        ctx["cancel_event"] = self._canceled
        ctx["canceled"] = self._canceled.is_set()
        # 尚未下发前若已暂停，就停在这个节点上，恢复后再真正执行。
        if not _wait_if_running(ctx):
            return False, {"error": "canceled", "dispatcher": self.name}
        try:
            return self.station.run_node(node, ctx)
        except Exception as ex:                     # 适配器自身异常也按失败上报，不静默
            return False, {"error": "%s: %s" % (type(ex).__name__, ex),
                           "dispatcher": self.name, "phase": "adapter"}

    def cancel(self, job_id: str = "") -> None:
        self._canceled.set()

    # ---- 供接口层用的诊断（只读，不驱动机构） ----
    def probe(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        return self.station.probe(device_id)

    def status(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        return self.station.status(device_id)


def build_job_start_payload(job_id: str, task_id: str, workflow_id: str, node_id: str,
                            device_id: str, action_name: str, action_type: str,
                            action_args: Any, always_free: bool = False) -> Dict[str, Any]:
    """构造与 Uni-Lab OS 云端 `job_start` 同形状的执行载荷。

    对齐 `unilabos/app/scheduler/dispatch.py::build_job_start_payload`，字段名逐一对齐，
    这样 real 适配器可以直接复用而无需改协议。`always_free=True` 表示该动作不占设备排队锁。
    """
    payload = {
        "job_id": job_id, "task_id": task_id, "node_id": node_id,
        "workflow_id": workflow_id, "device_id": device_id,
        "action": action_name, "action_type": action_type,
        "action_args": action_args, "sample_material": {},
    }
    if always_free:
        payload["always_free"] = True
    return payload


# ---------------------------------------------------------------- 运行实例
class WorkflowRun:
    """一次工作流运行：DAG 依赖推进 + 设备资源锁 + 并发下发。"""

    def __init__(self, workflow: Dict[str, Any], mode: str = "dry",
                 speed: float = 60.0, dispatcher: Optional[Dispatcher] = None,
                 real_opts: Optional[Dict[str, Any]] = None):
        self.run_id = uuid.uuid4().hex[:12]
        self.mode = mode
        self.real_opts = dict(real_opts or {})
        self.workflow = workflow or {}
        data = (workflow or {}).get("data") or {}
        self.workflow_name = self.workflow.get("name") or data.get("workflow_name") or "未命名工作流"
        self.workflow_uuid = data.get("workflow_uuid") or ""
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.order: List[str] = []
        self.states: Dict[str, str] = {}
        self.pending_parents: Dict[str, Set[str]] = {}
        self.children: Dict[str, List[str]] = {}
        self.lock_keys: Dict[str, Set[str]] = {}
        self.held: Dict[str, Set[str]] = {}        # uuid -> keys
        self.job_of: Dict[str, str] = {}           # uuid -> job_id
        self.timing: Dict[str, Dict[str, float]] = {}
        self.info: Dict[str, Any] = {}
        self.events: List[Dict[str, Any]] = []
        self.errors: List[str] = []
        self.cycle: List[str] = []
        self.started_at = 0.0
        self.ended_at = 0.0
        self.finished = False
        self._cancel = threading.Event()
        self._pause = threading.Event()   # set = 已暂停，调度不再放新节点
        self._pause_started = 0.0
        self._paused_total = 0.0
        self._lock = threading.Lock()
        self._speed = speed
        self._plane: Optional[ThreadPoolExecutor] = None

        if dispatcher is not None:
            self.dispatcher = dispatcher
        elif mode == "real":
            self.dispatcher = UniLabOSDispatcher(**self.real_opts)
        else:
            self.dispatcher = DryRunDispatcher(speed=speed)

        self._build()
        # 大工作流自适应收紧 dry-run 时间窗，保证演示墙钟可控
        if isinstance(self.dispatcher, DryRunDispatcher):
            self.dispatcher.tune(len(self.order))

    # ---- 构图（对齐 dag_state._build / _detect_cycle） ----
    def _build(self) -> None:
        data = self.workflow.get("data") or {}
        for n in (data.get("nodes") or []):
            u = n.get("uuid")
            if not u:
                continue
            if n.get("disabled"):
                self.states[u] = SKIPPED
                self.info[u] = {"reason": "节点已禁用"}
                continue
            self.nodes[u] = n
            self.states[u] = PENDING
            self.order.append(u)
            self.pending_parents[u] = set()
            self.children[u] = []
            self.lock_keys[u] = node_lock_keys(n)

        for e in (data.get("edges") or []):
            s = e.get("source_node_uuid")
            t = e.get("target_node_uuid")
            if s in self.nodes and t in self.nodes:
                self.pending_parents[t].add(s)
                self.children[s].append(t)

        self._detect_cycle()
        self._emit("build", None, {
            "nodes": len(self.order), "skipped": sum(1 for v in self.states.values() if v == SKIPPED),
            "locks": {k: sorted(v) for k, v in self.lock_keys.items()},
        })

    def _detect_cycle(self) -> None:
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {u: WHITE for u in self.order}
        path: List[str] = []

        def dfs(u: str) -> bool:
            color[u] = GRAY
            path.append(u)
            for v in self.children.get(u, []):
                if color.get(v) == GRAY:
                    self.cycle = path[path.index(v):] + [v]
                    return True
                if color.get(v) == WHITE and dfs(v):
                    return True
            path.pop()
            color[u] = BLACK
            return False

        for u in self.order:
            if color[u] == WHITE and dfs(u):
                names = [self._name(x) for x in self.cycle]
                err = WorkflowCycleError("工作流存在循环依赖：" + " → ".join(names))
                err.cycle = names          # 供上层接口直接回给前端标红
                raise err

    def _name(self, u: str) -> str:
        """人类可读的节点名（用于事件文案 / 环路提示 / 等锁提示）。

        真实工作流里「启动」「复位」这类 label 会重复几十次，只报 label 无法定位；
        因此带上设备名做消歧。
        """
        n = self.nodes.get(u) or {}
        lbl = str(n.get("_label") or n.get("footer") or n.get("name") or "").strip()
        dev = str(n.get("device_name") or "").strip()
        if lbl and dev and lbl != dev:
            return "%s @%s" % (lbl, dev)
        return lbl or dev or u

    def _elapsed(self) -> float:
        """运行时钟（秒）。暂停区间不计入，恢复后从停下的时刻接着走。"""
        if not self.started_at:
            return 0.0
        end = self.ended_at or time.time()
        paused = self._paused_total
        if self._pause.is_set() and self._pause_started:
            paused += max(0.0, time.time() - self._pause_started)
        return round(max(0.0, end - self.started_at - paused), 3)

    def _emit(self, kind: str, uuid_: Optional[str], payload: Dict[str, Any]) -> None:
        with self._lock:
            self.events.append({
                "t": self._elapsed(),
                "kind": kind, "uuid": uuid_, **payload,
            })
            if len(self.events) > 400:
                del self.events[:100]

    # ---- 就绪推进（对齐 ready_nodes / mark_finished 级联） ----
    def ready_nodes(self) -> List[str]:
        """返回所有「前置已清零且尚未下发」的节点（天然并行的候选集合）。

        注意必须同时接纳 PENDING 与 READY：
        抢设备锁失败的节点会被置为 READY 并保留在队列里等待下一轮重试，
        若这里只挑 PENDING，它会永远不再被取出 → 运行卡死。
        """
        out = []
        for u, parents in self.pending_parents.items():
            if self.states.get(u) not in (PENDING, READY):
                continue
            if parents:
                continue
            self.states[u] = READY
            out.append(u)
        return out

    def mark_running(self, u: str) -> None:
        self.states[u] = RUNNING
        t = self.timing.setdefault(u, {})
        t["start"] = self._elapsed()
        t["start_wall"] = time.time()

    def mark_finished(self, u: str, ok: bool, info: Dict[str, Any]) -> None:
        self.states[u] = SUCCESS if ok else FAILED
        t = self.timing.setdefault(u, {})
        t["end"] = self._elapsed()
        t["end_wall"] = time.time()
        t["dur"] = round(t["end"] - t.get("start", t["end"]), 3)
        self.info[u] = info
        self.held.pop(u, None)
        if ok:
            # 级联：从所有子节点的依赖表里摘除自己
            for v in self.children.get(u, []):
                self.pending_parents.get(v, set()).discard(u)
        else:
            self.errors.append(f"{self._name(u)}：{info.get('error') or '执行失败'}")
            # 失败 → 下游全部取消（对齐 abort_execution_process 的语义）
            self._cancel_downstream(u)
        self._emit("node-done", u, {"state": self.states[u], "ok": ok,
                                    "dur": t.get("dur"), "info": info})

    def _cancel_downstream(self, u: str) -> None:
        stack = list(self.children.get(u, []))
        seen = set()
        while stack:
            v = stack.pop()
            if v in seen:
                continue
            seen.add(v)
            if self.states.get(v) == PENDING:
                self.states[v] = CANCELED
                self.info[v] = {"reason": f"上游 {self._name(u)} 失败"}
                self._emit("node-cancel", v, {"reason": "upstream-failed"})
            stack.extend(self.children.get(v, []))

    def _all_terminal(self) -> bool:
        return all(s in TERMINAL for s in self.states.values())

    def resource_plan(self) -> Dict[str, Any]:
        return resource_lock_plan(list(self.nodes.values()))

    # ---- 主循环 ----
    def start(self) -> None:
        if self._plane is not None:
            return
        self.started_at = time.time()
        self._emit("start", None, {"mode": self.mode, "speed": self._speed,
                                   "dispatcher": self.dispatcher.name,
                                   "resource_plan": self.resource_plan()})
        self._plane = ThreadPoolExecutor(max_workers=max(2, min(16, len(self.order) or 2)),
                                         thread_name_prefix="wfrun")
        threading.Thread(target=self._loop, daemon=True, name=f"wfrun-{self.run_id}").start()

    def _loop(self) -> None:
        futures: Dict[str, Any] = {}
        try:
            while not self._cancel.is_set():
                # 暂停：不结算、不放新节点。正在跑的线程自己冻在当前节点里，
                # 恢复后由同一线程把剩余动作做完，而不是从头重跑或跳到下一节点。
                if self._pause.is_set():
                    time.sleep(0.05)
                    continue
                # 1) 释放已完成的
                for u, fut in list(futures.items()):
                    if fut.done():
                        futures.pop(u, None)
                        try:
                            ok, info = fut.result()
                        except Exception as ex:      # 适配器异常也按失败处理，不静默
                            ok, info = False, {"error": f"{type(ex).__name__}: {ex}"}
                        self.mark_finished(u, ok, info)
                # 2) 推进就绪节点并尝试占锁下发
                for u in self.ready_nodes():
                    keys = self.lock_keys.get(u, set())
                    holder = None
                    for other, hk in self.held.items():
                        if conflicting(keys, hk):
                            holder = other
                            break
                    if holder is not None:
                        # 设备锁被占：退回 PENDING，下一轮再试（保持 READY 语义可见）
                        self.states[u] = READY
                        self.info[u] = {"waiting_for": self._name(holder)}
                        continue
                    self.held[u] = keys
                    self.mark_running(u)
                    job_id = uuid.uuid4().hex[:12]
                    self.job_of[u] = job_id
                    node = self.nodes[u]
                    ctx = {"run_id": self.run_id, "workflow_uuid": self.workflow_uuid,
                           "job_id": job_id, "canceled": False,
                           "pause_event": self._pause, "cancel_event": self._cancel}
                    self._emit("node-start", u, {
                        "job_id": job_id, "device": node.get("device_name"),
                        "locks": sorted(keys), "est": round(estimate_duration(node), 2)})
                    futures[u] = self._plane.submit(self.dispatcher.run_node, node, ctx)
                if self._all_terminal() and not futures:
                    break
                time.sleep(0.03)
        finally:
            self.ended_at = time.time()
            self.finished = True
            if self._cancel.is_set():
                for u, s in self.states.items():
                    if s in (PENDING, READY, RUNNING):
                        self.states[u] = CANCELED
                self._emit("canceled", None, {})
            else:
                self._emit("finish", None, self.summary())
            try:
                from .run_datalog import save_workflow_run
                save_workflow_run(self)
            except Exception:
                import logging
                logging.getLogger("workflow_runtime").exception("保存运行日志失败")
            self._plane.shutdown(wait=False)

    def pause(self) -> bool:
        """停在当前正在执行的节点上。未开始的节点保持原样，运行不结束。"""
        if self.finished or self._cancel.is_set():
            return False
        if self._pause.is_set():
            return True
        running = [u for u, s in self.states.items() if s == RUNNING]
        self._pause_started = time.time()
        self._pause.set()
        self._emit("paused", running[0] if len(running) == 1 else None,
                   {"nodes": running})
        return True

    def resume(self) -> bool:
        """从暂停时正在执行的节点接着跑。"""
        if self.finished or self._cancel.is_set() or not self._pause.is_set():
            return False
        running = [u for u, s in self.states.items() if s == RUNNING]
        if self._pause_started:
            self._paused_total += max(0.0, time.time() - self._pause_started)
            self._pause_started = 0.0
        self._pause.clear()
        self._emit("resumed", running[0] if len(running) == 1 else None,
                   {"nodes": running})
        return True

    def cancel(self) -> None:
        self._cancel.set()
        if self._pause.is_set() and self._pause_started:
            self._paused_total += max(0.0, time.time() - self._pause_started)
            self._pause_started = 0.0
        self._pause.clear()
        try:
            self.dispatcher.cancel("")
        except Exception:
            pass

    # ---- 快照（供 HTTP / SSE） ----
    def snapshot(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "workflow_name": self.workflow_name,
            "mode": self.mode,
            "dispatcher": self.dispatcher.name,
            "speed": self._speed,
            "finished": self.finished,
            "paused": self._pause.is_set(),
            "window": ({"floor": self.dispatcher.floor, "ceil": self.dispatcher.ceil}
                       if isinstance(self.dispatcher, DryRunDispatcher) else None),
            "elapsed": self._elapsed(),
            "states": dict(self.states),
            "timing": self.timing,
            "info": self.info,
            "held": {k: sorted(v) for k, v in self.held.items()},
            "events": self.events[-160:],
            "errors": self.errors,
            "summary": self.summary(),
        }

    def summary(self) -> Dict[str, Any]:
        c: Dict[str, int] = {}
        for s in self.states.values():
            c[s] = c.get(s, 0) + 1
        # 并行度：running 同时刻最大值
        peak = 0
        spans = []
        for u, t in self.timing.items():
            if "start" in t and "end" in t:
                spans.append((t["start"], 1))
                spans.append((t["end"], -1))
        spans.sort()
        cur = 0
        for _, d in spans:
            cur += d
            peak = max(peak, cur)
        wall = self._elapsed()
        total = round(sum(t.get("dur", 0.0) for t in self.timing.values()), 2)
        return {
            "counts": c,
            "peak_parallelism": peak,
            "wall_clock": wall,
            "sum_node_duration": total,
            "speedup": round(total / wall, 2) if wall > 0 else None,
            "devices": len({(self.nodes[u].get("device_name") or "") for u in self.order
                            if self.nodes[u].get("device_name")}),
        }


# ---------------------------------------------------------------- 运行注册表
class RunRegistry:
    """内存中的运行注册表（单进程 demo 足够；多进程请换 Redis/DB）。"""

    def __init__(self, keep: int = 12):
        self._runs: Dict[str, WorkflowRun] = {}
        self._order: List[str] = []
        self._keep = keep
        self._lock = threading.Lock()

    def create(self, workflow: Dict[str, Any], mode: str = "dry", speed: float = 60.0,
               real_opts: Optional[Dict[str, Any]] = None) -> WorkflowRun:
        run = WorkflowRun(workflow, mode=mode, speed=speed, real_opts=real_opts)
        with self._lock:
            self._runs[run.run_id] = run
            self._order.append(run.run_id)
            while len(self._order) > self._keep:
                old = self._order.pop(0)
                r = self._runs.get(old)
                if r:
                    r.cancel()
                self._runs.pop(old, None)
        return run

    def get(self, run_id: str) -> Optional[WorkflowRun]:
        with self._lock:
            return self._runs.get(run_id)

    def cancel(self, run_id: str) -> bool:
        r = self.get(run_id)
        if not r:
            return False
        r.cancel()
        return True

    def pause(self, run_id: str) -> bool:
        r = self.get(run_id)
        if not r:
            return False
        return r.pause()

    def resume(self, run_id: str) -> bool:
        r = self.get(run_id)
        if not r:
            return False
        return r.resume()


REGISTRY = RunRegistry()


def annotate_labels(workflow: Dict[str, Any], library: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """给节点补一个 `_label`（中文动作名），供耗时估算与事件文案使用。

    前端传入的是最终 JSON（不含 `_display`），故这里用节点库把 cmd_type/name 翻成中文。
    找不到节点库时退化为 footer/name。
    """
    lib = library
    if lib is None:
        path = __import__("os").path.join(
            __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__))),
            "static", "assets", "gn_node_library.js")
        try:
            with open(path, "r", encoding="utf-8") as f:
                txt = f.read()
            lib = json.loads(txt[txt.find("{"):txt.rfind("}") + 1])
        except Exception:
            lib = None
    idx: Dict[str, Dict[Any, str]] = {}
    if lib:
        for d in lib.get("devices") or []:
            m: Dict[Any, str] = {}
            for a in d.get("actions") or []:
                if a.get("cmdType") is not None:
                    m[a["cmdType"]] = a.get("label") or ""
                elif a.get("name") is not None:
                    m[a["name"]] = a.get("label") or ""
            idx[d.get("id")] = m
    for n in ((workflow or {}).get("data") or {}).get("nodes") or []:
        dev = n.get("device_name") or ""
        p = n.get("param") or {}
        lbl = ""
        m = idx.get(dev) or {}
        if p.get("cmd_type") is not None:
            lbl = m.get(p["cmd_type"], "")
        if not lbl:
            lbl = m.get(n.get("name"), "")
        n["_label"] = lbl or n.get("footer") or n.get("name") or dev
    return workflow
