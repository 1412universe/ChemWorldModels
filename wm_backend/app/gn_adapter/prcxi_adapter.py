# -*- coding: utf-8 -*-
"""PRCXI 9320 移液工作站适配器（DMTP V4.0 通道）。

与 OPC UA 设备的根本差异
------------------------
PRCXI **不是** PLC 点位设备：它是一台跑着 NeonGenesis.exe（SC93-4.9.4.2-V04）
的 Windows 主机，对外暴露 TouchSocket **DMTP** RPC（默认端口 9999，用户已确认）。
所以它不继承 `GNStationClient`、不碰 OPC 会话，动作也不写点位，
而是把「编辑器动作」翻译成 V4.0 的**方案会话**（对齐 Unilab step_mode /
``create_protocol → 动作… → run_protocol``）：

    create_protocol    → 打开本机步骤缓冲（不清真机、不 Start）
    move_plate / transfer_liquid / shaking / titration
                       → 只把 V4.0 步骤 append 进缓冲
    run_protocol       → AddSolution_V04(缓冲) → LoadSolution → Start → 等终态
    reset              → 不进协议，直接 IAutomation.Reset

仿真档：连进程内的 DMTP 镜像服务（`prcxi.dmtp_sim_server`，127.0.0.1 随机端口）
—— 真握手、真 FastBinary 编解码、状态机推进，客户端代码路径与真机完全一致。
真机档：连 `GN_PRCXI_URL`（默认 192.168.6.99:9999）。

动作映射（编辑器节点库 NAME_ACTIONS → V4.0 方案步骤）
----------------------------------------------------
    transfer_liquid    移液            → Aspirate + Dispense 步骤对（按 sources/targets/vols）
    create_protocol    创建移液协议    → 开缓冲（登记方案名）
    run_protocol       运行移液协议    → 下发缓冲并执行
    move_plate         搬运孔板        → MvKit（转版；Source/Destination=from/to；hierarchy1→Level0）
    titration_liquid   滴注液体        → Aspirate+Dispense × repeat_count（周期 pause）
    shaking_incubation 震荡孵育        → TempAndOsc / OscSet（对齐 V04示例 OscRate=1200）
    reset              复位            → 清错 + Stop + IAutomation.Reset，再等 GetResetStatus 退出复位中

安全
----
与其他设备同一套三层闸（GN_ALLOW_REAL 总闸 / 驱动档 / 首帧预检），由
station.run_node 统一把关；本适配器只负责「翻译与执行」，不做闸判断。
"""
from __future__ import annotations

import json
import re
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
from .prcxi.prcxi_sdk.models.solution_steps_v04 import (  # noqa: E402
    AspirateStepV04,
    DispenseStepV04,
    LoadTipsStepV04,
    MvKitStepV04,
    OscSetStepV04,
    PauseStepV04,
    TempAndOscStepV04,
    UnloadTipsStepV04,
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


def _first_resource(resource: Any) -> Any:
    """sources / tip_racks 等可能是单值、JSON 串或数组；取第一个可寻址项。"""
    resource = _parse_json_param(resource, resource)
    if isinstance(resource, list):
        return resource[0] if resource else None
    return resource


def _slot_from_resource_name(name: str) -> Optional[int]:
    """资源实例名 → 台面板位号（优先语义推定，否则取实测占用最高的槽）。"""
    if not name:
        return None
    try:
        from . import prcxi_deck as deck
    except Exception:                                              # noqa: BLE001
        return None
    for slot, nm in (getattr(deck, "_SEMANTIC_OVERRIDE", {}) or {}).items():
        if nm == name:
            return int(slot)
    best_slot, best_cnt = None, -1
    for slot, items in (getattr(deck, "_OCC_EVIDENCE", {}) or {}).items():
        for nm, cnt in items or []:
            if nm == name and int(cnt) > best_cnt:
                best_slot, best_cnt = int(slot), int(cnt)
    return best_slot


def _pos_label(resource: Any, fallback_index: int = 1) -> str:
    """资源 / 板位 → V4.0 步骤 Position（纯数字字符串）。

    对齐 ``LoadTipsStepV04.position = "1"``：真机布局板位在 UI 上显示为 T1..T16，
    但 RPC 的 Position 字段要写 ``"1"``..``"16"``，**不要**带 ``T`` 前缀；
    带了会在界面变成 ``TT15``，把数组原样塞进去会变成 ``T["T15"``。
    """
    resource = _first_resource(resource)
    if isinstance(resource, dict):
        # 显式 slot / pos 优先
        for k in ("slot", "pos", "position", "number"):
            if resource.get(k) is not None:
                return _pos_label(resource.get(k), fallback_index)
        resource = resource.get("name") or resource.get("id") or ""
    if isinstance(resource, (int, float)):
        n = int(resource)
        if 1 <= n <= 16:
            return str(n)
        return str(int(fallback_index))
    s = str(resource or "").strip().rstrip("/")
    if not s:
        return str(int(fallback_index))
    # "T15" / "t15" / "15"
    if len(s) >= 2 and s[0] in "Tt" and s[1:].isdigit():
        return str(int(s[1:]))
    if s.isdigit():
        n = int(s)
        return str(n) if 1 <= n <= 16 else str(int(fallback_index))
    # 资源名 / 路径 → 反查板位号
    name = s.rsplit("/", 1)[-1]
    slot = _slot_from_resource_name(name)
    if slot is not None:
        return str(slot)
    return str(int(fallback_index))


def _tips_label(resource: Any, tips_type: Any = None) -> str:
    """V04 TipsType：仅 Tips1 / Tips8 / Tips96（通道类型，不是枪头盒编号）。

    台面资源名里的 Tips2/Tips3（如 PRCXI_1250uL_Tips3）是盒位名，不能写进 Tips 字段，
    否则真机报 TipsType_V04 枚举转换失败。枪头盒位置走 Position（T11/T12/T15）。
    """
    for raw in (tips_type, resource):
        if raw is None or raw == "":
            continue
        item = _first_resource(raw)
        if isinstance(item, dict):
            item = item.get("tips_type") or item.get("Tips") or item.get("name") or item.get("id") or ""
        s = str(item or "").strip()
        if not s:
            continue
        # 显式枚举 / 数字通道
        low = s.lower().replace(" ", "")
        if low in ("tips1", "1", "tip1", "single", "axis1"):
            return "Tips1"
        if low in ("tips8", "8", "tip8"):
            return "Tips8"
        if low in ("tips96", "96", "tip96"):
            return "Tips96"
        # 整段合法枚举，或显式 tip/tips + 1|8|96；忽略 …_Tips2 / …_Tips3 资源名
        m = re.fullmatch(r"Tips(1|8|96)", s, re.I)
        if m:
            return "Tips%s" % m.group(1)
        m = re.search(r"(?:^|[^0-9A-Za-z])(?:tips|tip)[_ ]?(1|8|96)(?:[^0-9]|$)", s, re.I)
        if m:
            return "Tips%s" % m.group(1)
    return "Tips1"


def _coerce_num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _num_list(v: Any, default: Optional[List[float]] = None) -> List[float]:
    """JSON 数组 / 标量 → float 列表。空数组 []、null、"" 视为无值（不当成 [0]）。"""
    if v is None or v == "" or v == []:
        return list(default or [])
    seq = _parse_json_param(v, None)
    if seq is None:
        return list(default or [])
    if isinstance(seq, (int, float)) and not isinstance(seq, bool):
        return [float(seq)]
    if isinstance(seq, str):
        s = seq.strip()
        if not s or s == "[]":
            return list(default or [])
        try:
            return [float(s)]
        except ValueError:
            return list(default or [])
    if not isinstance(seq, list):
        return list(default or [])
    if len(seq) == 0:
        return list(default or [])
    return [_coerce_num(x) for x in seq]


def _num_at(vals: List[float], index: int, fallback: float = 0.0) -> float:
    if index < len(vals):
        return float(vals[index])
    if vals:
        return float(vals[0])
    return float(fallback)


def _step(kind: str, display: str, **fields: Any) -> Dict[str, Any]:
    """V4.0 步骤 dict（PascalCase 字段，对齐 solution_steps_v04.to_rpc_dict）。"""
    step: Dict[str, Any] = {
        "Kind": kind,
        "DisplayName": display,
        "Comment": None,
        "IsEnabled": True,
        "Position": "1",
        "Row": "1",
        "Col": "1",
        "AxisType": "Axis1",
        "Tips": "Tips1",
        "WellType": "Well_96",
    }
    step.update(fields)
    return step


def _pipette_liquid_steps(params: Dict[str, Any], *, repeat: int = 1,
                          cycle_delay: float = 0.0,
                          aspirate_label: str = "吸取",
                          dispense_label: str = "排出") -> List[Dict[str, Any]]:
    """用完整 V4.0 Aspirate/Dispense 模型组步骤，避免缺字段被真机当成 0。

    空数组 []（air_suck_volume / blow_out_* 等）一律收成标量 0，
    绝不把 Python/JSON 的 [] 原样塞进 RPC（真机解析后体积会变 0）。
    """
    sources = _parse_json_param(params.get("sources"), []) or []
    targets = _parse_json_param(params.get("targets"), []) or []
    if not sources or not targets:
        raise ValueError("需要 sources 与 targets（JSON 数组）")

    asp_vols = _num_list(params.get("asp_vols"), [])
    dis_vols = _num_list(params.get("dis_vols"), [])
    asp_rates = _num_list(params.get("asp_flow_rates"), [100.0])
    dis_rates = _num_list(params.get("dis_flow_rates"), [100.0])
    post_air = _num_list(params.get("post_air_volume"), [0.0])
    blow = _num_list(params.get("blow_out_air_volume"), [0.0])
    air_suck = _num_list(params.get("air_suck_volume"), [0.0])

    tip_slots = _slot_list(params.get("tip_rack_slots"))
    src_slots = _slot_list(params.get("source_slots"))
    tgt_slots = _slot_list(params.get("target_slots"))
    # 枪头位默认 T11（台面 T11/T12/T15）；卸载固定去 T1（垃圾桶）
    tip_pos = _pos_at(params.get("tip_racks"), tip_slots, 0, 11)
    tip_kind = _tips_label(
        params.get("tip_racks"),
        tips_type=params.get("tips_type") or params.get("Tips") or params.get("tips"),
    )
    unload_pos = "1"

    method = _parse_json_param(params.get("dispensing_method"), ["DiveToBottom"])
    if isinstance(method, list):
        method = method[0] if method else "DiveToBottom"
    method = str(method or "DiveToBottom")

    steps: List[Dict[str, Any]] = [
        LoadTipsStepV04(
            display_name="装载枪头",
            position=tip_pos,
            tips=tip_kind,
        ).to_rpc_dict()
    ]
    n = min(len(sources), len(targets))
    for r in range(max(1, int(repeat))):
        for i in range(n):
            asp = _num_at(asp_vols, i, 0.0)
            dis = _num_at(dis_vols, i, asp)
            if asp <= 0:
                raise ValueError(
                    "吸液体积为 0（asp_vols=%r）。请填写 asp_vols，例如 [100] 或 [833]"
                    % (params.get("asp_vols"),))
            if dis <= 0:
                raise ValueError(
                    "放液体积为 0（dis_vols=%r）。请填写 dis_vols，例如 [100] 或 [833]"
                    % (params.get("dis_vols"),))
            asp_spd = max(1, int(_num_at(asp_rates, i, 100.0)))
            dis_spd = max(1, int(_num_at(dis_rates, i, 100.0)))
            steps.append(AspirateStepV04(
                display_name="%s %d" % (aspirate_label, i + 1) if repeat <= 1
                else "%s %d-%d" % (aspirate_label, r + 1, i + 1),
                position=_pos_at(sources, src_slots, i, i + 1),
                tips=tip_kind,
                aspirate_volume=str(int(asp) if asp == int(asp) else asp),
                suction_speed=asp_spd,
                post_air_volume=float(_num_at(post_air, i, 0.0)),
                blowing_volume=float(_num_at(blow, i, 0.0)),
            ).to_rpc_dict())
            steps.append(DispenseStepV04(
                display_name="%s %d" % (dispense_label, i + 1) if repeat <= 1
                else "%s %d-%d" % (dispense_label, r + 1, i + 1),
                position=_pos_at(targets, tgt_slots, i, i + 1),
                tips=tip_kind,
                dispense_volume=str(int(dis) if dis == int(dis) else dis),
                dispense_speed=dis_spd,
                blow_volume=float(_num_at(blow, i, 0.0)),
                air_suck_volume=float(_num_at(air_suck, i, 0.0)),
                dispensing_method=method,
            ).to_rpc_dict())
        if r + 1 < repeat and cycle_delay > 0:
            # V04：定时暂停必须 PauseEnum=Timing，Time 才生效（None/Manual 都不走秒表）。
            # 对齐 wm_action 转换器与 RPC 文档：Timing + Time=秒。
            delay_s = max(1, int(cycle_delay))
            label = "暂停 %ds" % delay_s
            steps.append(PauseStepV04(
                display_name=label,
                pause_enum="Timing",
                time=str(delay_s),
                remarks=label,
                comment=label,
            ).to_rpc_dict())
    steps.append(UnloadTipsStepV04(
        display_name="卸载枪头",
        position=unload_pos,
        tips=tip_kind,
    ).to_rpc_dict())
    return steps


def _slot_list(v: Any) -> List[int]:
    """tip_rack_slots / source_slots / target_slots → 板位号列表。"""
    seq = _parse_json_param(v, [])
    if isinstance(seq, (int, float)):
        seq = [seq]
    if not isinstance(seq, list):
        return []
    out: List[int] = []
    for x in seq:
        try:
            n = int(str(x).lstrip("Tt"))
        except (TypeError, ValueError):
            continue
        if 1 <= n <= 16:
            out.append(n)
    return out


def _pos_at(resources: Any, slots: List[int], index: int, fallback_index: int) -> str:
    """优先用显式板位号列表，否则从资源实例反查。"""
    if index < len(slots):
        return str(slots[index])
    seq = _parse_json_param(resources, []) or []
    if isinstance(seq, list) and index < len(seq):
        return _pos_label(seq[index], fallback_index)
    return _pos_label(resources, fallback_index)


# ---------------------------------------------------------------------------
# 动作 → 步骤序列 翻译器
# ---------------------------------------------------------------------------
def build_steps(action: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """把编辑器动作 + 参数翻译成 V4.0 步骤列表（12 种 Kind 的组合）。

    抛 ValueError 表示参数不合法（会作为节点失败上报，绝不静默）。
    """
    params = params or {}
    if action == "transfer_liquid":
        return _pipette_liquid_steps(params)
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
        # 对齐真机原生方案（上枪头.xml / 夹爪功能验证.xml）：
        #   DisplayName="转版"，Source/Destination=int，Level=0（单层）。
        # 夹爪行「T16 → 12」是厂家 UI 固定格式（POSNamePrefix 只加在 Source；
        # Destination 强类型 int，不能发 "T12"）。编辑器 hierarchy=1 表示单层，
        # 必须映射为 Level=0，不能原样下发成 Level=1。
        to_pos = params.get("to")
        from_pos = params.get("from")
        if to_pos is None or from_pos is None:
            raise ValueError("move_plate 需要 from 与 to（板位）")

        def _slot_num(v: Any) -> int:
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                return int(v)
            s = str(v or "").strip()
            if len(s) >= 2 and s[0] in "Tt" and s[1:].isdigit():
                return int(s[1:])
            return int(s)

        try:
            src = _slot_num(from_pos)
            dst = _slot_num(to_pos)
        except (TypeError, ValueError) as e:
            raise ValueError("move_plate 的 from/to 必须是板位号 1..16（收到 from=%r to=%r）"
                             % (from_pos, to_pos)) from e
        if not (1 <= src <= 16 and 1 <= dst <= 16):
            raise ValueError("move_plate 板位号越界：from=%d to=%d（合法 1..16）" % (src, dst))

        def _dir(v: Any) -> str:
            s = str(v or "").strip()
            return s if s else "None"

        # hierarchy 1=单层 → Level 0；2=二层 → Level 1 …
        hier = int(_coerce_num(params.get("hierarchy"), 1))
        level = max(0, hier - 1)

        return [MvKitStepV04(
            display_name="转版",
            source=src,
            destination=dst,
            force=int(_coerce_num(params.get("force"), 5)),
            pinch_it_up_position=int(_coerce_num(params.get("pinch_it_up_position"), 1)),
            put_down_position=int(_coerce_num(params.get("put_down_position"), 1)),
            source_direct=_dir(params.get("get_direction") or params.get("pickup_direction")),
            destination_direct=_dir(params.get("put_direction") or params.get("drop_direction")),
            level=level,
        ).to_rpc_dict()]
    if action == "titration_liquid":
        return _pipette_liquid_steps(
            params,
            repeat=int(_coerce_num(params.get("repeat_count"), 1)),
            cycle_delay=_coerce_num(params.get("cycle_delay_s"), 0),
            aspirate_label="滴注吸取",
            dispense_label="滴注排出",
        )
    if action in ("shaking_incubation", "auto-shaking_incubation_action"):
        # 对齐 V04示例_2 / Form1.CreateSolutionSteps / SDK 默认值：
        #   TempAndOsc: Number=1 Temp=37 OscRate=1200 Time=100 IsWait=true
        #   OscSet:     Number=1 OscRate=1200 OscTime=100 IsWait=true
        # 以前用 400~500rpm 或 TempSet(IsWait=false)+OscSet，真机常报完成但不转。
        duration = int(_coerce_num(
            params.get("time", params.get("duration",
                       params.get("time_s", params.get("duration_s")))), 100))
        if duration < 1:
            duration = 1
        amp = int(_coerce_num(params.get("amplitude", params.get("osc_rate")), 1200))
        if amp < 1:
            amp = 1200
        mod = int(_coerce_num(params.get("module_no"), 1))
        wait_raw = params.get("is_wait")
        if wait_raw is None or wait_raw == "":
            is_wait = True
        elif isinstance(wait_raw, bool):
            is_wait = wait_raw
        else:
            is_wait = str(wait_raw).strip().lower() not in ("0", "false", "no", "off")
        temp_raw = params.get("temperature")
        has_temp = temp_raw is not None and str(temp_raw).strip() != ""
        # 列表参数列不画 Time/OscRate，时长转速写入 DisplayName。
        if has_temp:
            temp_f = float(_coerce_num(temp_raw, 37))
            temp = int(temp_f) if temp_f == int(temp_f) else temp_f
            label = "恒温+振荡 %ds %drpm" % (duration, amp)
            return [TempAndOscStepV04(
                display_name=label,
                number=mod,
                temp=temp,
                osc_rate=amp,
                time=duration,
                is_wait=is_wait,
                comment=label,
            ).to_rpc_dict()]
        label = "振荡 %ds %drpm" % (duration, amp)
        return [OscSetStepV04(
            display_name=label,
            number=mod,
            osc_time=duration,
            osc_rate=amp,
            is_wait=is_wait,
            comment=label,
        ).to_rpc_dict()]
    if action == "reset":
        return []
    raise ValueError("PRCXI 未知动作 %r（支持：%s）"
                     % (action, "transfer_liquid / create_protocol / run_protocol / "
                                "move_plate / titration_liquid / shaking_incubation / reset"))


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
        # 协议会话：create 开缓冲 → 中间动作 append → run 一次性 AddSolution+Start
        self._protocol_open: bool = False
        self._protocol_name: str = ""
        self._steps_buf: List[Dict[str, Any]] = []

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
    # 须包裹在 create_protocol … run_protocol 之间的动作（只追加步骤，不立即跑）
    _ACCUM_ACTIONS = frozenset({
        "transfer_liquid", "move_plate", "titration_liquid", "shaking_incubation",
    })

    def execute_action(self, action: str, params: Dict[str, Any],
                       timeout: Optional[float] = None) -> Dict[str, Any]:
        """执行编辑器动作 → 统一 success dict。

        会话语义：create 开缓冲 → 中间动作 append → run 一次性下发并等待。
        """
        params = params or {}
        t0 = time.time()
        to = float(timeout if timeout is not None else self.default_timeout)
        to = max(to, self._needed_timeout(action, params))
        try:
            to = min(to, float(cfg.max_timeout()))
        except Exception:                                       # noqa: BLE001
            pass

        if action in ("create_protocol", "auto-create_protocol"):
            return self._create_protocol(action, params, t0)
        if action in ("run_protocol", "auto-run_protocol"):
            return self._run_protocol(action, params, to, t0)
        if action == "reset":
            return self._reset(to, t0)
        if action in self._ACCUM_ACTIONS:
            return self._append_action(action, params, t0)
        raise ValueError("PRCXI 未知动作 %r" % action)

    def _create_protocol(self, action: str, params: Dict[str, Any],
                         t0: float) -> Dict[str, Any]:
        """创建协议 = 打开本机会话缓冲（对齐 Unilab create_protocol）。

        不立刻 AddSolution：步骤由后续 move_plate / transfer / shaking / titration
        追加；run_protocol 再一次性下发。若 create 节点自身带 sources（旧写法），
        把对应移液步骤预追加进缓冲。
        """
        name = str(params.get("protocol_name") or params.get("name") or "").strip()
        if not name:
            name = "wm_protocol_%d" % (int(time.time() * 1000) % 100000)
        seed: List[Dict[str, Any]] = []
        inner = {k: v for k, v in params.items()
                 if k not in ("protocol_name", "name")}
        if inner.get("sources"):
            seed = build_steps("transfer_liquid", inner)
        with self._lock:
            self._protocol_open = True
            self._protocol_name = name
            self._steps_buf = list(seed)
        # 预解析 BoardId，失败也只记进消息，不阻断开缓冲
        board_id = ""
        try:
            board_id = self._resolve_board_id()
        except Exception:                                       # noqa: BLE001
            pass
        return {
            "success": True,
            "message": "PRCXI 协议已打开：%s（预置 %d 步，待 run_protocol 下发）"
                       % (name, len(seed)),
            "action": action,
            "solution": name,
            "steps": len(seed),
            "board_id": board_id or None,
            "protocol_open": True,
        }

    def _append_action(self, action: str, params: Dict[str, Any],
                       t0: float) -> Dict[str, Any]:
        """中间动作：翻译成 V4.0 步骤并追加进当前协议缓冲。"""
        with self._lock:
            if not self._protocol_open:
                raise RuntimeError(
                    "PRCXI %s 须先 create_protocol，再追加动作，最后 run_protocol"
                    % action)
            name = self._protocol_name
        steps = build_steps(action, params)
        if not steps:
            raise ValueError("PRCXI %s 未产生任何步骤" % action)
        with self._lock:
            if not self._protocol_open:
                raise RuntimeError("PRCXI 协议会话已关闭，无法追加 %s" % action)
            self._steps_buf.extend(steps)
            total = len(self._steps_buf)
            name = self._protocol_name
        return {
            "success": True,
            "message": "PRCXI %s 已追加 %d 步 → 协议 %s（缓冲共 %d 步）"
                       % (action, len(steps), name, total),
            "action": action,
            "solution": name,
            "steps_added": len(steps),
            "steps_buffered": total,
            "seconds": round(time.time() - t0, 3),
        }

    def _run_protocol(self, action: str, params: Dict[str, Any], to: float,
                      t0: float) -> Dict[str, Any]:
        """运行协议：把缓冲 AddSolution_V04 后 Load + Start + 等终态。

        protocol_id 为空 / false：用当前会话名 + 缓冲步骤下发（主路径）。
        protocol_id 为已有方案名且缓冲为空：只 Load 该方案（兼容重跑）。
        """
        req = str(params.get("protocol_id") or params.get("protocol_name")
                  or params.get("name") or "").strip()
        if req in ("false", "False", "0"):
            req = ""

        with self._lock:
            buf = list(self._steps_buf)
            open_name = self._protocol_name
            was_open = self._protocol_open

        name = req or open_name
        if buf:
            if not name:
                name = "wm_protocol_%d" % (int(time.time() * 1000) % 100000)
            to = max(to, self._timeout_for_steps(buf))
            try:
                to = min(to, float(cfg.max_timeout()))
            except Exception:                                   # noqa: BLE001
                pass
            board_id = self._resolve_board_id()
            self._call("ISolution", "AddSolution_V04",
                       [name, board_id, buf], timeout=to)
        elif was_open and not req:
            # create 后未追加任何动作：空协议，跳过（对齐 Unilab）
            with self._lock:
                self._protocol_open = False
                self._steps_buf = []
            return {
                "success": True,
                "message": "PRCXI 协议 %s 无步骤，跳过执行" % (name or "(unnamed)"),
                "action": action, "solution": name, "steps": 0, "step_states": [],
            }
        elif not name:
            raise RuntimeError(
                "PRCXI run_protocol：无打开的协议会话，也没有可加载的方案名")
        # else: 缓冲空 + 显式方案名 → Load 真机已有方案（重跑）

        # Start 空成功（返回 true 但步骤一直 State=0）常见于机台未停干净 / 未复位。
        # 对齐 V04 Demo：Load 前先清错并 Stop，Start 后确认步骤真正进入执行。
        self._prepare_for_start()
        self._call("ISolution", "LoadSolution", [name], timeout=to)
        started = self._call("IAutomation", "Start", timeout=to)
        if started is False or started == "false":
            raise RuntimeError("PRCXI Start 被拒绝（方案 %s）" % name)
        self._ensure_run_started(name)
        done, states = self._wait_run_done(name, to, t0)
        with self._lock:
            self._protocol_open = False
            self._steps_buf = []
        return {
            "success": True,
            "message": "PRCXI 协议运行完成：%s（%d 步，%.1fs）"
                       % (name, len(buf), time.time() - t0),
            "action": action,
            "solution": name,
            "steps": len(buf),
            "step_states": states,
        }

    def _prepare_for_start(self) -> None:
        """Load/Start 前清错并停止残留运行（避免 Start 空成功、振荡步不进 Running）。"""
        try:
            self._call("IAutomation", "RemoveErrorCodet", timeout=PROBE_TIMEOUT)
        except Exception:                                       # noqa: BLE001
            pass
        try:
            running = self._call("IAutomation", "GetStartStatus", timeout=PROBE_TIMEOUT)
        except Exception:                                       # noqa: BLE001
            running = False
        if running is True or running == "true" or running == 1:
            try:
                self._call("IAutomation", "Stop", timeout=PROBE_TIMEOUT)
            except Exception:                                   # noqa: BLE001
                pass
            time.sleep(0.4)

    def _ensure_run_started(self, name: str, grace_s: float = 3.0) -> None:
        """确认 Start 后方案真正跑起来；否则提示先复位（实测空 Start 后步骤停在 State=0）。"""
        deadline = time.time() + max(grace_s, 1.0)
        last_states: List[Any] = []
        while time.time() < deadline:
            running = self._call("IAutomation", "GetStartStatus", timeout=PROBE_TIMEOUT)
            last_states = self._call(
                "IMachineState", "GetStepStateList", timeout=PROBE_TIMEOUT) or []
            if running is True or running == "true" or running == 1:
                return
            for st in last_states:
                try:
                    code = int(st.get("State"))
                except (TypeError, ValueError, AttributeError):
                    continue
                if code >= 1:   # 1=执行中 2=完成
                    return
            time.sleep(RUN_POLL_INTERVAL)
        raise RuntimeError(
            "PRCXI 方案 %s Start 后未进入执行（步骤仍未开始）。"
            "请先对设备执行 reset，再重新 run_protocol。状态=%r"
            % (name, last_states))

    def _reset(self, to: float, t0: float) -> Dict[str, Any]:
        """V4.0 复位：GetErrorCode → RemoveErrorCodet → Stop → Reset，再等复位结束。

        协议（RPC 调用文档 4.1）：异常时调用 ``IAutomation.Reset()``，正式超时至少 60 秒。
        ``GetResetStatus`` 为 true 表示正在复位，回到 false 才算复位完成。
        复位同时关闭未下发的协议会话缓冲（避免脏步骤带入下次 run）。
        """
        with self._lock:
            self._protocol_open = False
            self._steps_buf = []
        rpc_to = max(float(to or 0), 60.0)
        error_code = self._call("IAutomation", "GetErrorCode", timeout=PROBE_TIMEOUT)
        self._call("IAutomation", "RemoveErrorCodet", timeout=PROBE_TIMEOUT)
        try:
            self._call("IAutomation", "Stop", timeout=PROBE_TIMEOUT)
        except Exception:                                       # noqa: BLE001
            pass
        started = self._call("IAutomation", "Reset", timeout=rpc_to)
        if started is False or started == "false":
            raise RuntimeError("PRCXI Reset 被拒绝")
        self._wait_reset_done(rpc_to, t0)
        return {
            "success": True,
            "message": "PRCXI 复位完成（%.1fs）" % (time.time() - t0),
            "action": "reset",
            "error_code": error_code,
        }

    def _wait_reset_done(self, to: float, t0: float) -> None:
        """轮询 GetResetStatus，直到退出「复位中」。"""
        deadline = t0 + max(float(to), 60.0)
        start_deadline = min(deadline, time.time() + min(5.0, max(1.0, float(to) * 0.1)))
        seen_resetting = False
        while True:
            if self._is_resetting():
                seen_resetting = True
            elif seen_resetting or time.time() >= start_deadline:
                return
            if time.time() >= deadline:
                raise TimeoutError("PRCXI 复位超时未完成（%.0fs）" % to)
            time.sleep(RUN_POLL_INTERVAL)

    def _is_resetting(self) -> bool:
        flag = self._call("IAutomation", "GetResetStatus", timeout=PROBE_TIMEOUT)
        return flag is True or flag == "true" or flag == 1

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

    @staticmethod
    def _needed_timeout(action: str, params: Dict[str, Any]) -> float:
        """单动作工艺时长估计（用于追加阶段记账；真正等待在 run_protocol）。"""
        params = params or {}
        if action == "shaking_incubation":
            dur = max(0.0, float(_coerce_num(params.get("time"), 100)))
            temp_raw = params.get("temperature")
            has_temp = temp_raw is not None and str(temp_raw).strip() != ""
            return dur + (180.0 if has_temp else 30.0)
        if action == "titration_liquid":
            reps = max(1, int(_coerce_num(params.get("repeat_count"), 1)))
            delay = max(0.0, float(_coerce_num(params.get("cycle_delay_s"), 0)))
            return reps * (20.0 + delay) + 60.0
        if action == "move_plate":
            return 30.0
        if action == "transfer_liquid":
            return 60.0
        return 0.0

    @staticmethod
    def _timeout_for_steps(steps: List[Dict[str, Any]]) -> float:
        """按已缓冲步骤合计等待上限（run_protocol 用）。"""
        total = 30.0
        for s in steps or []:
            kind = s.get("Kind") or ""
            if kind == "TempAndOsc":
                total += float(s.get("Time") or 0) + 180.0
            elif kind == "TempSet":
                total += float(s.get("Time") or 0) + 60.0
            elif kind == "OscSet":
                total += float(s.get("OscTime") or 0) + 30.0
            elif kind == "Pause":
                try:
                    total += float(s.get("Time") or 0)
                except (TypeError, ValueError):
                    total += 10.0
            elif kind == "MvKit":
                total += 25.0
            elif kind in ("Aspirate", "Dispense", "LoadTips", "UnloadTips", "Mix"):
                total += 20.0
            else:
                total += 10.0
        return total

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

    def ensure_transport(self) -> Dict[str, Any]:
        """真机首次调用前选定通道。

        510 现场 9320（SC93 V4.0，192.168.6.99:9999）不接受 8 字节长度头 JSON：
        TCP 能连上，但服务端直接关连接，读长度头得到 0 字节。
        同一端口的 TouchSocket DMTP（协议 Demo 的 Lilith）可以握手。
        探测成功后缓存通道，后续调用不再重复试 legacy。
        """
        if self.action_mode != "real":
            return {"ok": True, "channel": self.transport_mode}
        if self._transport_mode:
            return {"ok": True, "channel": self._transport_mode, "connected": True}
        return self.probe()


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
                      "move_plate", "titration_liquid", "shaking_incubation", "reset"):
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
        link = driver.ensure_transport()
        base["channel"] = driver.transport_mode
        if not link.get("ok"):
            return False, dict(base, phase="probe",
                               error="PRCXI 连接失败：%s" % (link.get("error") or "两种通道都不可用"))
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
