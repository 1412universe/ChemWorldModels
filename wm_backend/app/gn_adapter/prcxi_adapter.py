# -*- coding: utf-8 -*-
"""PRCXI 9320 移液工作站适配器（DMTP V4.0 通道）。

与 OPC UA 设备的根本差异
------------------------
PRCXI **不是** PLC 点位设备：它是一台跑着 NeonGenesis.exe（SC93-4.9.4.2-V04）
的 Windows 主机，对外暴露 TouchSocket **DMTP** RPC（默认端口 9999，用户已确认）。
所以它不继承 `GNStationClient`、不碰 OPC 会话，动作也不写点位，
而是把「编辑器动作」翻译成 V4.0 的**方案模型**：

    动作 → AddSolution_V04(方案名, boardId, 12 种 Kind 的步骤列表)
         → LoadSolution(方案名) → Start → 轮询 GetStepStateList/GetStartStatus 到终态

仿真档：连进程内的 DMTP 镜像服务（`prcxi.dmtp_sim_server`，127.0.0.1 随机端口）
—— 真握手、真 FastBinary 编解码、状态机推进，客户端代码路径与真机完全一致。
真机档：连 `GN_PRCXI_URL`（默认 192.168.6.99:9999）。

动作映射（编辑器节点库 NAME_ACTIONS → V4.0 方案步骤）
----------------------------------------------------
    transfer_liquid    移液            → Aspirate + Dispense 步骤对（按 sources/targets/vols）
    create_protocol    创建移液协议    → AddSolution_V04（只建不跑）
    run_protocol       运行移液协议    → LoadSolution + Start + 等终态
    move_plate         搬运孔板        → MvKit 步骤（Position=to/from）
    titration_liquid   滴注液体        → Aspirate+Dispense × repeat_count（周期 pause）
    shaking_incubation 震荡孵育        → TempAndOsc / OscSet + Pause(time) 步骤

安全
----
与其他设备同一套三层闸（GN_ALLOW_REAL 总闸 / 驱动档 / 首帧预检），由
station.run_node 统一把关；本适配器只负责「翻译与执行」，不做闸判断。
"""
from __future__ import annotations

import json
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config as cfg
from .prcxi import dmtp_sim_server

# 让 vendored SDK 的顶层导入（from prcxi_dmtp... / from prcxi_sdk...）在
# app.gn_adapter.prcxi 包结构下可用：把子包别名注册进 sys.modules。
import importlib
import sys as _sys

_PR_STORAGE = "_prcxi_pkg_alias"
if _PR_STORAGE not in _sys.modules:
    import types as _types
    _holder = _types.ModuleType(_PR_STORAGE)
    _holder.done = False
    _sys.modules[_PR_STORAGE] = _holder

def _ensure_pkg_alias() -> None:
    """把 app.gn_adapter.prcxi.prcxi_sdk / prcxi_dmtp 别名为顶层包名。

    vendored SDK 的 dmtp_transport.py 用 `from prcxi_dmtp.fastbinary import ...`
    顶层导入。顺序有讲究：**必须先加载 prcxi_dmtp**（它内部全是相对导入，
    安全），注册别名后再加载 prcxi_sdk —— 否则 prcxi_sdk/__init__ → client →
    dmtp_transport 的顶层导入会在别名就位前执行，ModuleNotFoundError。
    """
    holder = _sys.modules.get(_PR_STORAGE)
    if holder is None or getattr(holder, "done", False):
        return
    import importlib as _il
    _dmtp_pkg = _il.import_module("app.gn_adapter.prcxi.prcxi_dmtp")
    _sys.modules.setdefault("prcxi_dmtp", _dmtp_pkg)
    _sdk_pkg = _il.import_module("app.gn_adapter.prcxi.prcxi_sdk")
    _sys.modules.setdefault("prcxi_sdk", _sdk_pkg)
    holder.done = True


_ensure_pkg_alias()

from .prcxi.prcxi_sdk import PrcxiClient            # noqa: E402
from .prcxi.prcxi_sdk.exceptions import (           # noqa: E402
    RpcConnectionError,
    RpcResponseError,
    RpcTimeoutError,
)

DEFAULT_HOST = "192.168.6.99"
DEFAULT_PORT = 9999
PROBE_TIMEOUT = 3.0
RUN_POLL_INTERVAL = 0.25

# 12 种 V4.0 步骤 Kind（厂家文档固定值，服务端只认这些）
STEP_KINDS = ("LoadTips", "Aspirate", "Dispense", "Mix", "UnloadTips",
              "TempSet", "TempAndOsc", "OscSet", "MagneticStand",
              "LiquidCoolSet", "Pause", "MvKit")


def prcxi_url(explicit: Optional[str] = None) -> Tuple[str, int]:
    """解析 PRCXI 端点：显式参数 > GN_PRCXI_URL 环境变量 > 默认 192.168.6.99:9999。"""
    raw = (explicit or cfg._env("GN_PRCXI_URL", "") or
           ("%s:%d" % (DEFAULT_HOST, DEFAULT_PORT))).strip()
    host, _, port_s = raw.rpartition(":")
    if not host or not port_s.isdigit():
        return raw, DEFAULT_PORT
    return host, int(port_s)


# ---------------------------------------------------------------------------
# 参数归一：编辑器节点参数（PyLabRobot 资源路径风格）→ V4.0 方案步骤
# ---------------------------------------------------------------------------
def _parse_json_param(v: Any, default: Any) -> Any:
    """JSON 参数容忍字符串形式（节点库里 default 存的是 JSON 字符串）。"""
    if v is None:
        return default
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return default
    return v


def _pos_label(resource: Any, fallback_index: int = 1) -> str:
    """资源路径 → 布局 Position 标签。

    `/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_96_DeepWell_3` → `PRCXI_96_DeepWell_3`
    数字列表（slot 序号）→ `T<N>`（真机布局 9320-366 的 16 个板位就叫 T1..T16，
    2026-10-16 现场实测 GetWorkTabletMatrices_V04 确认）。V4.0 步骤的 Position
    字段是布局上的板位名。
    """
    if isinstance(resource, dict):
        resource = resource.get("name") or resource.get("id") or ""
    if isinstance(resource, (int, float)):
        return "T%d" % int(resource)
    s = str(resource or "").strip().rstrip("/")
    if not s:
        return "T%d" % fallback_index
    # 纯数字字符串也是槽位号
    if s.isdigit():
        return "T%s" % s
    return s.rsplit("/", 1)[-1]


def _coerce_num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _num_list(v: Any, default: Optional[List[float]] = None) -> List[float]:
    seq = _parse_json_param(v, default or [])
    if not isinstance(seq, list):
        return []
    return [_coerce_num(x) for x in seq]


def _step(kind: str, display: str, **fields: Any) -> Dict[str, Any]:
    """V4.0 步骤 dict（PascalCase 字段，对齐 solution_steps_v04.to_rpc_dict）。"""
    step: Dict[str, Any] = {
        "Kind": kind,
        "DisplayName": display,
        "Comment": None,
        "IsEnabled": True,
        "Position": "T1",
        "Row": "1",
        "Col": "1",
        "AxisType": "Axis1",
        "Tips": "Tips1",
        "WellType": "Well_96",
    }
    step.update(fields)
    return step


# ---------------------------------------------------------------------------
# 动作 → 步骤序列 翻译器
# ---------------------------------------------------------------------------
def build_steps(action: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """把编辑器动作 + 参数翻译成 V4.0 步骤列表（12 种 Kind 的组合）。

    抛 ValueError 表示参数不合法（会作为节点失败上报，绝不静默）。
    """
    params = params or {}
    if action == "transfer_liquid":
        sources = _parse_json_param(params.get("sources"), []) or []
        targets = _parse_json_param(params.get("targets"), []) or []
        asp_vols = _num_list(params.get("asp_vols"), [])
        dis_vols = _num_list(params.get("dis_vols"), [])
        if not sources or not targets:
            raise ValueError("transfer_liquid 需要 sources 与 targets（JSON 数组）")
        steps: List[Dict[str, Any]] = [_step("LoadTips", "装载枪头",
                                             Position=_pos_label(params.get("tip_racks"), 1),
                                             Tips="Tips1")]
        n = min(len(sources), len(targets))
        for i in range(n):
            asp = asp_vols[i] if i < len(asp_vols) else (asp_vols[0] if asp_vols else 0.0)
            dis = dis_vols[i] if i < len(dis_vols) else (dis_vols[0] if dis_vols else 0.0)
            steps.append(_step("Aspirate", "吸取 %d" % (i + 1),
                               Position=_pos_label(sources[i], i + 1),
                               AspirateVolume=str(asp)))
            steps.append(_step("Dispense", "排出 %d" % (i + 1),
                               Position=_pos_label(targets[i], i + 1),
                               DispenseVolume=str(dis)))
        steps.append(_step("UnloadTips", "卸载枪头"))
        return steps
    if action in ("create_protocol", "auto-create_protocol"):
        # 协议创建：本轮只装方案不跑 —— 步骤体由 transfer_liquid 风格参数给出时
        # 走通用构造；没有则给一个空动作占位方案（服务端 XML 由它自己生成）
        name = str(params.get("protocol_name") or params.get("name") or "").strip()
        if not name:
            raise ValueError("create_protocol 需要方案名（protocol_name）")
        return []                        # 只登记方案名；步骤可为空（占位方案）
    if action in ("run_protocol", "auto-run_protocol"):
        return []                        # 运行已存在方案：由执行器 LoadSolution+Start
    if action == "move_plate":
        to_pos = params.get("to")
        from_pos = params.get("from")
        if to_pos is None or from_pos is None:
            raise ValueError("move_plate 需要 from 与 to（板位）")
        return [_step("MvKit", "搬运 %s→%s" % (from_pos, to_pos),
                      Position=str(from_pos), TargetPosition=str(to_pos))]
    if action == "titration_liquid":
        sources = _parse_json_param(params.get("sources"), []) or []
        targets = _parse_json_param(params.get("targets"), []) or []
        asp_vols = _num_list(params.get("asp_vols"), [])
        dis_vols = _num_list(params.get("dis_vols"), [])
        repeat = int(_coerce_num(params.get("repeat_count"), 1))
        cycle_delay = _coerce_num(params.get("cycle_delay_s"), 0)
        if not sources or not targets:
            raise ValueError("titration_liquid 需要 sources 与 targets")
        steps = []
        for r in range(max(1, repeat)):
            for i in range(min(len(sources), len(targets))):
                asp = asp_vols[i] if i < len(asp_vols) else (asp_vols[0] if asp_vols else 0.0)
                dis = dis_vols[i] if i < len(dis_vols) else (dis_vols[0] if dis_vols else 0.0)
                steps.append(_step("Aspirate", "滴注吸取 %d-%d" % (r + 1, i + 1),
                                   Position=_pos_label(sources[i]), AspirateVolume=str(asp)))
                steps.append(_step("Dispense", "滴注排出 %d-%d" % (r + 1, i + 1),
                                   Position=_pos_label(targets[i]), DispenseVolume=str(dis)))
            if r + 1 < repeat and cycle_delay > 0:
                steps.append(_step("Pause", "周期等待 %d" % (r + 1), Time=cycle_delay))
        steps = [_step("LoadTips", "装载枪头")] + steps + [_step("UnloadTips", "卸载枪头")]
        return steps
    if action in ("shaking_incubation", "auto-shaking_incubation_action"):
        duration = _coerce_num(params.get("time"), 10)
        temp = params.get("temperature")
        amp = _coerce_num(params.get("amplitude"), 1)
        mod = int(_coerce_num(params.get("module_no"), 1))
        fields: Dict[str, Any] = {"Time": duration, "Amplitude": amp, "ModuleNo": mod}
        if temp is not None:
            fields["Temperature"] = _coerce_num(temp)
            return [_step("TempAndOsc", "震荡孵育 %.0fmin %.0f℃" % (duration, fields["Temperature"]), **fields)]
        return [_step("OscSet", "震荡 %.0fmin" % duration, **fields)]
    raise ValueError("PRCXI 未知动作 %r（支持：%s）"
                     % (action, "transfer_liquid / create_protocol / run_protocol / "
                                "move_plate / titration_liquid / shaking_incubation"))


# ---------------------------------------------------------------------------
# 设备对象
# ---------------------------------------------------------------------------
class PrcxiDevice:
    """PRCXI 9320 设备（DMTP 通道）。station.open() 经 prcxi_adapter.open_device 创建。

    仿真档连 DMTP 镜像服务；真机档连现场 NeonGenesis 主机。两者共用同一客户端
    代码（vendored PrcxiClient）。
    """

    # station.py 用 getattr(driver, "get_status") / "disconnect" —— 提供同名方法
    def __init__(self, host: str, port: int, action_mode: str = "simulate",
                 timeout: float = 60.0):
        self.host = host
        self.port = port
        self.action_mode = action_mode
        self.default_timeout = timeout
        self._lock = threading.RLock()
        self._client: Optional[PrcxiClient] = None
        self._client_legacy: Optional[PrcxiClient] = None
        # 协议通道实测结论（probe 探明后回填；None = 还没探过）：
        #   dmtp   = TouchSocket DMTP（dm 魔数帧，固件升级后可用）
        #   legacy = 旧版 8 字节长度头 JSON（SC93-4.9.4.2-V04 现状，默认）
        self._transport_mode: Optional[str] = None
        self._solution_seq = 0
        # 真机布局 BoardId（_resolve_board_id 查真机后缓存；不再硬编码 Board_1）
        self._board_id: str = ""

    # ------------------------------------------------------------ 连接
    def _transport(self) -> PrcxiClient:
        with self._lock:
            if self._client is None:
                self._client = PrcxiClient(host=self.host, port=self.port,
                                           timeout=PROBE_TIMEOUT)
            return self._client

    def _transport_for(self, mode: str) -> PrcxiClient:
        """按协议模式取客户端：legacy = 旧版 8 字节长度头 JSON 通道。

        2026-10-16 现场实测：9320 上 NeonGenesis（SC93-4.9.4.2-V04）的 9999 端口
        跑的是**旧版 legacy JSON 协议**（厂家 RPC_Python调用文档 §3：8 字节大端
        长度头 + `{"ServiceName","MethodName","Paramters"}` 信封），新版 TouchSocket
        DMTP（`dm` 魔数帧）在握手第一帧就被服务端断连。所以真机档默认走 legacy；
        DMTP 保留给「厂家升级固件后」的场景（GN_PRCXI_TRANSPORT 可切换）。
        仿真档继续用 DMTP 镜像（dmtp_sim_server 实现的是 DMTP 分帧）。
        """
        with self._lock:
            if mode == "legacy":
                if self._client_legacy is None:
                    self._client_legacy = PrcxiClient(
                        host=self.host, port=self.port, timeout=PROBE_TIMEOUT,
                        transport="legacy_v7_json")
                return self._client_legacy
            return self._transport()

    @property
    def transport_mode(self) -> str:
        """当前实际使用的协议通道（probe 后回填；探测前按配置预期值）。"""
        if self._transport_mode is None:
            if self.action_mode != "real":
                return "dmtp"
            return self._cfg_transport()
        return self._transport_mode

    @staticmethod
    def _cfg_transport() -> str:
        raw = (cfg._env("GN_PRCXI_TRANSPORT", "") or "legacy").strip().lower()
        return raw if raw in ("dmtp", "legacy") else "legacy"

    def _call(self, service: str, method: str, args: Optional[List[Any]] = None,
              timeout: Optional[float] = None) -> Any:
        """一次 RPC（超时按调用设定；Reset/Start 等慢操作传大值）。

        真机档按 transport_mode 选通道；legacy 通道不握手、单次调用单连接，
        异常语义与 DMTP 一致（PrcxiSdkError 家族）。
        """
        mode = self.transport_mode if self.action_mode == "real" else "dmtp"
        client = self._transport_for(mode)
        client.transport.timeout = float(timeout or self.default_timeout)
        payload = client.transport.send(service, method, args or [])
        resp_success = payload.get("Success")
        if not (resp_success is True or resp_success == "true" or resp_success == 1):
            msg = payload.get("Msg") or payload.get("Message") or "PRCXI RPC %s.%s 失败" % (service, method)
            raise RuntimeError(str(msg))
        data = payload.get("Data")
        if isinstance(data, str):
            text = data.strip()
            if text.startswith("{") or text.startswith("["):
                try:
                    return json.loads(text)
                except ValueError:
                    return data
        return data

    def disconnect(self) -> None:
        with self._lock:
            for attr in ("_client", "_client_legacy"):
                client = getattr(self, attr, None)
                if client is not None:
                    try:
                        client.close()
                    except Exception:                           # noqa: BLE001
                        pass
                    setattr(self, attr, None)

    # ------------------------------------------------------------ 动作执行
    def execute_action(self, action: str, params: Dict[str, Any],
                       timeout: Optional[float] = None) -> Dict[str, Any]:
        """执行编辑器动作（build_steps 已翻译好步骤）→ 统一 success dict。"""
        params = params or {}
        t0 = time.time()
        to = float(timeout if timeout is not None else self.default_timeout)

        if action in ("create_protocol", "auto-create_protocol"):
            return self._create_protocol(action, params, t0)
        if action in ("run_protocol", "auto-run_protocol"):
            return self._run_protocol(action, params, to, t0)

        # 其余动作：建方案 → 装载 → 启动 → 轮询到终态
        steps = build_steps(action, params)
        name = "wm_%s_%d" % (action, int(time.time() * 1000) % 100000)
        board_id = self._resolve_board_id()
        self._call("ISolution", "AddSolution_V04", [name, board_id, steps], timeout=to)
        self._call("ISolution", "LoadSolution", [name], timeout=to)
        started = self._call("IAutomation", "Start", timeout=to)
        if started is False or started == "false":
            raise RuntimeError("PRCXI Start 被拒绝（方案 %s）" % name)
        done, states = self._wait_run_done(name, to, t0)
        return {
            "success": True,
            "message": "PRCXI %s 完成（方案 %s，%d 步，%.1fs）"
                       % (action, name, len(steps), time.time() - t0),
            "action": action,
            "solution": name,
            "steps": len(steps),
            "board_id": board_id,
            "step_states": states,
        }

    def _create_protocol(self, action: str, params: Dict[str, Any],
                         t0: float) -> Dict[str, Any]:
        """创建协议 = AddSolution_V04（只建不跑）。

        真机要求 steps 非空（2026-10-16 实测：空列表被服务端拒「方案步骤不能为空」）
        —— 无业务步骤时下发一条 Manual 暂停占位。
        """
        name = str(params.get("protocol_name") or params.get("name") or "").strip()
        if not name:
            # 编辑器默认值里 protocol_name 可能为空 → 用时间戳名，保证可运行
            name = "wm_protocol_%d" % (int(time.time() * 1000) % 100000)
        inner = {k: v for k, v in params.items()
                 if k not in ("protocol_name", "name")}
        steps = build_steps("transfer_liquid", inner) if inner.get("sources") else []
        if not steps:
            steps = self._placeholder_steps(name)
        board_id = self._resolve_board_id()
        self._call("ISolution", "AddSolution_V04", [name, board_id, steps])
        return {"success": True,
                "message": "PRCXI 协议已创建：%s（%d 步，布局 %s）" % (name, len(steps), board_id),
                "action": action, "solution": name, "steps": len(steps),
                "board_id": board_id}

    def _run_protocol(self, action: str, params: Dict[str, Any], to: float,
                      t0: float) -> Dict[str, Any]:
        """运行协议 = LoadSolution + Start + 等终态。"""
        name = str(params.get("protocol_id") or params.get("protocol_name")
                   or params.get("name") or "").strip()
        if not name or name in ("false", "False", "0"):
            # protocol_id default=false → 跑「最近创建」的方案
            name = self._latest_solution()
        self._call("ISolution", "LoadSolution", [name], timeout=to)
        started = self._call("IAutomation", "Start", timeout=to)
        if started is False or started == "false":
            raise RuntimeError("PRCXI Start 被拒绝（方案 %s）" % name)
        done, states = self._wait_run_done(name, to, t0)
        return {"success": True,
                "message": "PRCXI 协议运行完成：%s（%.1fs）" % (name, time.time() - t0),
                "action": action, "solution": name, "step_states": states}

    def _latest_solution(self) -> str:
        sols = self._call("ISolution", "GetSolutionList", timeout=PROBE_TIMEOUT)
        if isinstance(sols, list) and sols:
            last = sols[-1]
            if isinstance(last, dict):
                return str(last.get("Name") or last.get("name") or "")
            return str(last)
        raise RuntimeError("PRCXI 上没有任何方案可运行（先 create_protocol）")

    # ------------------------------------------------------------------ 布局
    def _resolve_board_id(self, timeout: Optional[float] = None) -> str:
        """真机布局 BoardId：优先 4×4（与台面点选器 T1..T16 对应），否则第一个。

        2026-10-16 现场实测：真机 GetWorkTabletMatrices_V04 返回 6 个布局
        （SC9300 / 测试吸头加载 / 突变体筛选构建 / 9320-366(4×4) / auto_board×2），
        **不存在** `Board_1` —— 之前硬编码它导致真机 AddSolution_V04 被拒。
        仿真档镜像服务没有 IMatrix 布局语义 → 缓存 miss 时回落 `Board_1`（兼容）。
        """
        with self._lock:
            if self._board_id:
                return self._board_id
        try:
            boards = self._call("IMatrix", "GetWorkTabletMatrices_V04",
                                timeout=timeout or PROBE_TIMEOUT)
        except Exception:                                       # noqa: BLE001
            boards = None
        if isinstance(boards, list) and boards:
            pick = None
            for b in boards:
                if not isinstance(b, dict):
                    continue
                rows, cols = b.get("Rows"), b.get("Columns")
                try:
                    if int(rows) == 4 and int(cols) == 4:
                        pick = b
                        break
                except (TypeError, ValueError):
                    continue
            if pick is None:
                pick = next((b for b in boards if isinstance(b, dict)), None)
            if pick:
                bid = str(pick.get("Id") or pick.get("Name") or "")
                if bid:
                    with self._lock:
                        self._board_id = bid
                    return bid
        with self._lock:
            self._board_id = self._board_id or "Board_1"
        return self._board_id

    @staticmethod
    def _placeholder_steps(name: str) -> List[Dict[str, Any]]:
        """无步骤建方案时的最小合法步骤（真机要求 steps 非空，2026-10-16 实测）。"""
        return [_step("Pause", "占位 %s" % name, PauseEnum="Manual")]

    def _wait_run_done(self, name: str, to: float, t0: float) -> Tuple[bool, List[int]]:
        """轮询 GetStartStatus + GetStepStateList 到终态。"""
        deadline = t0 + max(to, 5.0)
        states: List[int] = []
        while time.time() < deadline:
            running = self._call("IAutomation", "GetStartStatus", timeout=PROBE_TIMEOUT)
            states = self._call("IMachineState", "GetStepStateList", timeout=PROBE_TIMEOUT) or []
            if not (running is True or running == "true" or running == 1):
                return True, list(states)
            time.sleep(RUN_POLL_INTERVAL)
        raise TimeoutError("PRCXI 方案 %s 超时未完成（%.0fs）" % (name, to))

    # ------------------------------------------------------------ 诊断只读
    def get_status(self) -> Dict[str, Any]:
        """只读状态（station.probe 用；不驱动机构）。"""
        try:
            connected = self._call("IClientSession", "IsConnect", timeout=PROBE_TIMEOUT)
        except Exception as exc:                                # noqa: BLE001
            return {"connected": False, "error": "%s: %s" % (type(exc).__name__, exc),
                    "endpoint": "%s:%d" % (self.host, self.port)}
        return {"connected": bool(connected),
                "endpoint": "%s:%d" % (self.host, self.port),
                "transport": self.transport_mode,
                "running": self._safe_call("IAutomation", "GetStartStatus"),
                "solutions": self._safe_call("ISolution", "GetSolutionList")}

    def _safe_call(self, service: str, method: str) -> Any:
        try:
            return self._call(service, method, timeout=PROBE_TIMEOUT)
        except Exception:                                       # noqa: BLE001
            return None

    def probe(self) -> Dict[str, Any]:
        """握手探针（只做 IClientSession.IsConnect，不下发任何动作）。

        真机档按「配置预期通道 → 探通即用」的顺序尝试 legacy / dmtp，
        探通的通道回填 `_transport_mode`（后续业务调用走同一条道）。
        """
        out: Dict[str, Any] = {"endpoint": "%s:%d" % (self.host, self.port),
                               "channel": "dmtp", "action_mode": self.action_mode}
        if self.action_mode != "real":
            try:
                ok = self._call("IClientSession", "IsConnect", timeout=PROBE_TIMEOUT)
                out.update(ok=True, connected=bool(ok))
            except Exception as exc:                            # noqa: BLE001
                out.update(ok=False, error="%s: %s" % (type(exc).__name__, exc))
            return out
        # 真机：按优先级试通道（配置的预期通道优先）
        order = [self._cfg_transport()]
        for m in ("legacy", "dmtp"):
            if m not in order:
                order.append(m)
        last_err: Optional[str] = None
        for mode in order:
            try:
                client = self._transport_for(mode)
                client.transport.timeout = PROBE_TIMEOUT
                payload = client.transport.send("IClientSession", "IsConnect", [])
                if not (payload.get("Success") is True or payload.get("Success") == "true"):
                    last_err = "%s: IsConnect Success=%r Msg=%s" % (
                        mode, payload.get("Success"), payload.get("Msg"))
                    continue
                data = payload.get("Data")
                self._transport_mode = mode
                out.update(ok=True, connected=(data is True or data == "true"),
                           channel=mode, transport=mode)
                return out
            except Exception as exc:                            # noqa: BLE001
                last_err = "%s: %s: %s" % (mode, type(exc).__name__, exc)
                continue
        out.update(ok=False, error=last_err or "PRCXI 两种通道均不可用")
        return out


# ---------------------------------------------------------------------------
# station.py 的 DMTP 分支入口
# ---------------------------------------------------------------------------
_open_lock = threading.RLock()
_devices: Dict[Tuple[str, int, str], PrcxiDevice] = {}


def open_device(station, device_id: str, spec: Dict[str, Any]) -> PrcxiDevice:
    """station.open() 对 channel=dmtp 设备的实例化入口（带缓存）。"""
    with _open_lock:
        if station.simulated:
            srv = dmtp_sim_server.get_sim_server()
            host, port = "127.0.0.1", srv.port
        else:
            host, port = prcxi_url()
        key = (host, port, station.action_mode)
        dev = _devices.get(key)
        if dev is None:
            dev = PrcxiDevice(host=host, port=port,
                              action_mode=station.action_mode)
            _devices[key] = dev
        return dev


def resolve_prcxi_call(node: Dict[str, Any]) -> Dict[str, Any]:
    """PRCXI 节点 → {action, params}（不使用 OPC 的 resolve_call 逻辑）。"""
    raw_name = str(node.get("name") or node.get("template_name") or "").strip()
    action = raw_name[5:] if raw_name.startswith("auto-") else raw_name
    params = dict(node.get("param") or {})
    # 归一动作名（编辑器 NAME_ACTIONS 用 auto- 前缀与下划线风格）
    alias = {
        "create_protocol": "create_protocol",
        "auto-create_protocol": "create_protocol",
        "run_protocol": "run_protocol",
        "auto-run_protocol": "run_protocol",
        "shaking_incubation": "shaking_incubation",
        "shaking_incubation_action": "shaking_incubation",
        "auto-shaking_incubation_action": "shaking_incubation",
    }
    action = alias.get(action, action)
    if action not in ("transfer_liquid", "create_protocol", "run_protocol",
                      "move_plate", "titration_liquid", "shaking_incubation"):
        raise ValueError("PRCXI 未知动作 %r" % action)
    return {"action": action, "params": params}


def run_prcxi_node(station, node: Dict[str, Any],
                   ctx: Optional[Dict[str, Any]] = None) -> Tuple[bool, Dict[str, Any]]:
    """执行一个 PRCXI 节点（station.run_node 的 DMTP 分支调用）。"""
    ctx = ctx or {}
    t0 = time.time()
    device_id = "PRCXI"
    base = {
        "dispatcher": "gn-510",
        "device": device_id,
        "channel": "dmtp",
        "driver_mode": station.action_mode,
        "hardware": not station.simulated,
        "endpoint": "%s:%d" % (prcxi_url()) if not station.simulated else "sim",
    }
    try:
        call = resolve_prcxi_call(node)
    except ValueError as exc:
        return False, dict(base, error=str(exc), phase="resolve")

    # 安全闸与 OPC 设备同一套（真机档查总闸；仿真档直接放行）
    if not station.simulated and not station.allow_real:
        return False, dict(
            base, phase="gate",
            error="真实硬件下发被拒绝：未打开总闸（GN_ALLOW_REAL / allow_real）。")

    try:
        driver = station.open(device_id)
        base["channel"] = driver.transport_mode
    except Exception as exc:                                    # noqa: BLE001
        return False, dict(base, phase="open", error=str(exc))

    warnings: List[str] = []
    params = call["params"]
    # timeout 参数按节点给出，夹到 [1, GN_MAX_TIMEOUT]
    to = params.pop("timeout", None)
    if to is not None:
        try:
            to = max(1.0, min(cfg.max_timeout(), float(to)))
        except (TypeError, ValueError):
            warnings.append("timeout=%r 不是数字，已用默认" % (to,))
            to = None
    pause_ev = ctx.get("pause_event")
    while pause_ev is not None and pause_ev.is_set():
        cancel_ev = ctx.get("cancel_event")
        if ctx.get("canceled") or (cancel_ev is not None and cancel_ev.is_set()):
            return False, dict(base, error="canceled", phase="pause")
        time.sleep(0.05)
    try:
        result = driver.execute_action(call["action"], params, timeout=to)
        ok = bool(result.get("success"))
        info = {"result": result}
    except (RpcTimeoutError, RpcConnectionError, RpcResponseError) as exc:
        return False, dict(base, phase="call",
                           error="PRCXI RPC(%s) %s: %s" % (base["channel"], type(exc).__name__, exc),
                           warnings=warnings or None)
    except Exception as exc:                                    # noqa: BLE001
        return False, dict(base, phase="call",
                           error="%s: %s" % (type(exc).__name__, exc),
                           warnings=warnings or None)

    info.update(base)
    info["action"] = call["action"]
    info["seconds"] = round(time.time() - t0, 3)
    if warnings:
        info["warnings"] = warnings
    return ok, info
