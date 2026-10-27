# -*- coding: utf-8 -*-
"""虚拟实时仿真（LIVE）—— 把 510 工站的仿真状态变成可订阅的活体数据源。

背景
----
总览-510 的设备卡「实时读数」原本是**本地合成字符串**（jitter 随机抖动），
与后端 GN 适配器零连接。用户要求「用 510 的信息 + 总览形成虚拟的实时仿真」。

架构
----
    sim_plc / dmtp_sim_server（已有镜像模型）
            │ 写入 / 状态推进
            ▼
    live.py LIVE 注册表（本文件）
      · register_speaker(device_id, reader)  —— 各仿真组件登记自己的读数函数
      · snapshot() / trace()                 —— 全站快照 / 事件轨迹
      · 待机模型（idle ticker）              —— 无动作时读数做物理合理的缓动
            ▲
            │ GET /api/gn-adapter/live          一次性快照
            │ GET /api/gn-adapter/live/stream   SSE（1s 推一次）
            │ POST /api/gn-adapter/live/cmd     仿真档下注入一次设备指令
            ▼
    总览页 lab_live.js（薄订阅层，覆盖设备卡 readings + 3D 动画状态）

数据流原则
----------
  · **仿真档**：读数来自镜像模型（SimulatedPlc 的写入缓存 + DMTP 状态机），
    加「待机缓动」让静止读数也有生命感（温度向环境温度 25℃ 回归等）；
  · **真机档**：同一接口改走 OPC 读（本文件不实现，见 TODO —— 真机联调阶段
    用 probe 通道读取真实点位，接口形状保持不变）。
"""
from __future__ import annotations

import json
import threading
import time
from typing import Any, Callable, Dict, List, Optional

from . import config as cfg
from . import drivers as drv

# ---------------------------------------------------------------------------
# LIVE 注册表
# ---------------------------------------------------------------------------
_lock = threading.RLock()
_speakers: Dict[str, Callable[[], Dict[str, Any]]] = {}
_trace: List[Dict[str, Any]] = []
_start = time.time()
_idle_state: Dict[str, Dict[str, Any]] = {}     # device → {reading: value}
_last_event: Dict[str, float] = {}              # device → monotonic 最后动作时刻

# 待机缓动参数（读数在无动作时向环境值缓慢漂移，让「实时感」真实）
AMBIENT = 25.0            # 环境温度 ℃
IDLE_DRIFT_PER_SEC = 0.15  # 每秒向环境值回归的比例（指数缓动系数）


def register_speaker(device_id: str, reader: Callable[[], Dict[str, Any]]) -> None:
    """登记一个设备的读数函数（返回 {reading_key: value}）。

    驱动 / 仿真组件在实例化时调用；reader 必须无副作用且线程安全。
    """
    with _lock:
        _speakers[device_id] = reader


def log_event(device_id: str, kind: str, **detail: Any) -> None:
    """记录一条实时事件（动作开始/结束、温度变化等），进 trace。"""
    with _lock:
        _trace.append(dict(device=device_id, kind=kind, t=round(time.time(), 3),
                           **detail))
        if len(_trace) > 400:
            del(_trace[:200])
        _last_event[device_id] = time.monotonic()


# ---------------------------------------------------------------------------
# 待机模型：把设备读数从「上次写入值」向「物理合理的环境值」缓动
# ---------------------------------------------------------------------------
def _ambient_target(device_id: str, reading: str, current: float) -> Optional[float]:
    """温度类读数向 25℃ 回归；其它读数不动（None = 保持）。"""
    if "温度" in reading or reading.lower().endswith("temp"):
        return AMBIENT
    return None


def _apply_idle_drift(device_id: str, readings: Dict[str, float]) -> Dict[str, float]:
    """距上次事件越久，温度类读数越靠近环境值（指数缓动）。"""
    with _lock:
        last = _last_event.get(device_id)
    if last is None:
        return readings
    idle = time.monotonic() - last
    if idle < 3.0:
        return readings
    decay = 1.0 - (IDLE_DRIFT_PER_SEC ** idle)          # 0→1，随空闲时间增长
    out: Dict[str, float] = {}
    for k, v in readings.items():
        tgt = _ambient_target(device_id, k, v)
        out[k] = (v + (tgt - v) * min(0.95, decay)) if tgt is not None else v
    return out


# ---------------------------------------------------------------------------
# 全站快照
# ---------------------------------------------------------------------------
# 总览设备卡 key（app.js DEVICES）→ GN device_id（与 UNILAB_DEVNAME 一致）
CARD_TO_DEVICE = {
    "stack": "gn_rotary_stack",
    "robot": "gn_robotic_arm",
    "liquid": "PRCXI",
    "solid": "gn_solid_weighing",
    "tube": "gn_centrifuge_tube_liquid_handling",
    "centrifuge": "gn_centrifuge",
    "quick": "gn_quick_carrier_exchange",
    "lock": "gn_locking_mechanism",
    "oven": "gn_standard_oven",
    "vacuum": "gn_vacuum_oven",
}

# 液冷读数并入所属设备卡（模块 1-2 → liquid 卡 / 3-7 → tube 卡）
def _liquid_cooling_split() -> Dict[str, Dict[str, float]]:
    try:
        station = _get_sim_station()
        dev = station.open("gn_liquid_cooling")
        temps = dev.get_all_temperatures()
    except Exception:                                       # noqa: BLE001
        return {"liquid": {}, "tube": {}}
    liq = {"液冷温度·9320-1": temps.get("module_1", 0.0),
           "液冷温度·9320-2": temps.get("module_2", 0.0)}
    tube = {"液冷温度·离心管-%d" % i: temps.get("module_%d" % i, 0.0)
            for i in range(3, 8)}
    return {"liquid": liq, "tube": tube}


# OPC 设备的代表读数（从 SimPlc 镜像模型读，全部零硬件成本）。
# 节点名逐一核对过 1.4.0「点位表」（gn_opcua_points.py）：
#   Oven_TempFB / VacuumOven_TempFB / VacuumOven_PressureFB 是真反馈位（R）；
#   Centrifuge_RPM / Centrifuge_PlateNo 是 W 设定值 —— SimPlc 的 FB→Set 孪生
#   规则只覆盖 *FB 结尾的，W 值靠「写入缓存回读」一样能读到（写过后才有值）。
# 键与总览设备卡 readings 的 k 对齐（见 app.js DEVICES）；覆盖不了的
# 保持前端静态值 —— LIVE 只做「有真值的部分」，不虚构。
_OPC_CARD_READINGS: Dict[str, List[tuple]] = {
    "gn_standard_oven": [("温度", "Oven_TempFB", 1.0)],
    "gn_vacuum_oven":   [("温度", "VacuumOven_TempFB", 1.0),
                         ("真空度", "VacuumOven_PressureFB", 1.0)],
    "gn_centrifuge":    [("转速", "Centrifuge_RPM", 1.0),
                         ("板位号", "Centrifuge_PlateNo", 1.0)],
    "gn_locking_mechanism": [("X位置", "Lock_XPosFB", 1.0),
                             ("Y位置", "Lock_YPosFB", 1.0)],
}


def _opc_device_readings(device_id: str) -> Dict[str, float]:
    """从仿真工站的驱动实例读代表点位（SimPlc 镜像）。"""
    specs = _OPC_CARD_READINGS.get(device_id)
    if not specs:
        return {}
    try:
        station = _get_sim_station()
        dev = station.open(device_id)
        out: Dict[str, float] = {}
        for label, node, scale in specs:
            try:
                out[label] = float(dev._opc_read(node, force_read=True) or 0) * scale
            except Exception:                               # noqa: BLE001
                out[label] = 0.0
        return out
    except Exception:                                       # noqa: BLE001
        return {}


_sim_station = None
_sim_station_lock = threading.RLock()


def _get_sim_station():
    """仿真档工站单例（live 通道永远用仿真档 —— 真机读数走 probe，不混用）。"""
    global _sim_station
    with _sim_station_lock:
        if _sim_station is None:
            from .station import get_station
            _sim_station = get_station(action_mode="simulate", allow_real=False)
        return _sim_station


def snapshot() -> Dict[str, Any]:
    """全站实时快照（不连硬件 —— 仿真模型 + DMTP 镜像都在本进程内）。"""
    out: Dict[str, Any] = {"ok": True, "ts": round(time.time(), 3),
                           "mode": "simulate", "cards": {}}
    with _lock:
        speakers = dict(_speakers)
    for card, device_id in CARD_TO_DEVICE.items():
        entry: Dict[str, Any] = {"device": device_id, "readings": {},
                                 "busy": False, "last_action": None}
        reader = speakers.get(device_id)
        if reader is not None:
            try:
                raw = reader() or {}
                entry["readings"] = _apply_idle_drift(device_id, raw)
            except Exception as exc:                        # noqa: BLE001
                entry["error"] = str(exc)
        # PRCXI 卡：从 DMTP 镜像服务拿运行态
        if device_id == "PRCXI":
            entry["dmtp"] = _prcxi_snapshot()
        else:
            # OPC 设备：从 SimPlc 镜像读代表点位（零硬件成本）
            opc = _opc_device_readings(device_id)
            if opc:
                entry["readings"].update(_apply_idle_drift(device_id, opc))
        out["cards"][card] = entry

    # 液冷读数并入 liquid / tube 两张卡
    lc = _liquid_cooling_split()
    if out["cards"].get("liquid"):
        out["cards"]["liquid"]["readings"].update(lc.get("liquid") or {})
    if out["cards"].get("tube"):
        out["cards"]["tube"]["readings"].update(lc.get("tube") or {})

    out["system"] = {"is_ready": True}
    return out


def _prcxi_snapshot() -> Dict[str, Any]:
    try:
        from .prcxi import dmtp_sim_server
        return dmtp_sim_server.get_sim_server().snapshot()
    except Exception as exc:                                # noqa: BLE001
        return {"error": str(exc)}


def trace(limit: int = 50) -> List[Dict[str, Any]]:
    """最近事件轨迹（新→旧）。"""
    with _lock:
        return list(reversed(_trace[-limit:]))


# ---------------------------------------------------------------------------
# 仿真指令注入（仅仿真档；给总览「手动点设备卡试一下」用）
# ---------------------------------------------------------------------------
def inject_command(card_key: str, cmd: Dict[str, Any]) -> Dict[str, Any]:
    """在仿真模型上执行一条指令（如液冷温度设置），让读数真实变化。

    只允许仿真档：真机动作必须走 /api/workflow-run 的三层闸，这里绝不越权。
    """
    device_id = CARD_TO_DEVICE.get(card_key)
    if device_id is None:
        return {"ok": False, "error": "未知设备卡 %r" % card_key}
    action = str(cmd.get("action") or "").strip()
    params = dict(cmd.get("param") or {})

    station = _get_sim_station()

    # 液冷是跨卡设备（读数并入 liquid/tube 两卡）：按动作名先于设备卡分流，
    # 否则 card=liquid 会命中 PRCXI 分支、永远到不了液冷。
    if action == "set_temperature":
        log_event("gn_liquid_cooling", "manual", action=action, via="live")
        ok, info = station.run_node(
            {"name": "auto-execute_command", "device_name": "gn_liquid_cooling",
             "param": {"cmd_type": 1, "temperature": params.get("temperature")}}, {})
        return {"ok": bool(ok), "info": _safe_json(info)}

    log_event(device_id, "manual", action=action, via="live")
    if device_id == "PRCXI":
        node = {"name": action or "transfer_liquid", "device_name": "PRCXI",
                "param": params}
        ok, info = station.run_node(node, {})
        return {"ok": bool(ok), "info": _safe_json(info)}

    # OPC 设备通用：cmd_type 驱动
    if "cmd_type" not in params:
        return {"ok": False, "error": "OPC 设备需要 param.cmd_type（1.4.0 指令表）"}
    ok, info = station.run_node(
        {"name": "auto-execute_command", "device_name": device_id,
         "param": params}, {})
    return {"ok": bool(ok), "info": _safe_json(info)}


def _safe_json(v: Any) -> Any:
    try:
        json.dumps(v)
        return v
    except Exception:                                       # noqa: BLE001
        return repr(v)[:300]


# ---------------------------------------------------------------------------
# SSE 生成器（routes 挂 /api/gn-adapter/live/stream）
# ---------------------------------------------------------------------------
def event_stream(interval: float = 1.0, max_events: int = 3600):
    """产出 SSE 文本块（FastAPI StreamingResponse 直接消费）。"""
    n = 0
    while n < max_events:
        snap = snapshot()
        yield "event: live\ndata: %s\n\n" % json.dumps(snap, ensure_ascii=False)
        n += 1
        time.sleep(max(0.2, interval))


def register_runtime_speakers() -> int:
    """把常驻设备的 reader 注册进来（进程启动 / 首次 snapshot 时调用）。

    目前只有 DMTP 镜像服务自带状态；OPC 设备的读数在 snapshot 里按需
    open()（SimPlc 零成本），不需要常驻 speaker。此函数为扩展点保留。
    """
    return len(_speakers)
