# -*- coding: utf-8 -*-
"""GN 驱动装载器：把 CWM-Lab GN 目录里的真驱动类加载进来并建立索引。

装载器只做三件事：
  1. 逐个加载 GN 驱动模块（失败**逐条记录**，不影响其他设备）；
  2. 建立 `device_id → 驱动类` 索引（device_id 与节点库 / 工作流 node.device_name 一致）；
  3. 解析节点库动作 → 驱动调用的映射（`resolve_call`）。

**不做**任何硬件访问 —— 连不连 PLC 由 `station.py` 与全局开关决定。
"""
from __future__ import annotations

import inspect
import os
import sys
import threading
import typing
from typing import Any, Dict, List, Optional, Tuple

from . import config as cfg
from . import shim
from . import sim_plc

# ----------------------------------------------------------------------
# device_id → (文件名, 类名, 构造参数名, 说明)
# ----------------------------------------------------------------------
# 构造参数名：数组里写的是「用来接收节点表 CSV 的形参名」。
#   驱动之间不统一 —— 有的叫 csv_path，有的叫 xlsx_path（名字骗人，实际接的是 CSV）。
#   各驱动默认表已统一为 wm_action/opcua_gn1.4.1.csv；station 仍显式传入同一份。
# ----------------------------------------------------------------------
DEVICE_SPECS: Dict[str, Dict[str, Any]] = {
    "gn_locking_mechanism": {
        "file": "gn_locking_mechanism.py", "cls": "LockingMechanismDevice",
        "csv_kw": "csv_path", "name": "锁紧模块",
    },
    "gn_quick_carrier_exchange": {
        "file": "gn_quick_carrier_exchange.py", "cls": "QuickCarrierExchangeDevice",
        "csv_kw": "csv_path", "name": "快换模块",
    },
    "gn_centrifuge": {
        "file": "gn_centrifuge.py", "cls": "CentrifugeDevice",
        "csv_kw": "csv_path", "name": "离心机",
    },
    "gn_centrifuge_tube_liquid_handling": {
        "file": "gn_centrifuge_tube_liquid_handling.py",
        "cls": "CentrifugeTubeLiquidHandlingDevice",
        "csv_kw": "xlsx_path", "name": "离心管液体处理",
    },
    "gn_solid_weighing": {
        "file": "gn_solid_weighing.py", "cls": "SolidWeighingDevice",
        "csv_kw": "xlsx_path", "name": "固体加样",
    },
    "gn_rotary_stack": {
        "file": "rotary_stack.py", "cls": "RotaryStackDevice",
        "csv_kw": "csv_path", "name": "旋转堆栈",
    },
    "gn_stack": {
        "file": "gn_stack.py", "cls": "StackDevice",
        "csv_kw": "csv_path", "name": "堆栈",
    },
    "gn_robotic_arm": {
        "file": "robotic_arm.py", "cls": "RoboticArmDevice",
        "csv_kw": "csv_path", "name": "机械手",
    },
    "gn_standard_oven": {
        "file": "gn_standard_oven.py", "cls": "StandardOvenDevice",
        "csv_kw": "csv_path", "name": "常规烘箱",
    },
    "gn_vacuum_oven": {
        "file": "gn_vacuum_oven.py", "cls": "VacuumOvenDevice",
        "csv_kw": "xlsx_path", "name": "真空烘箱",
    },
    "system": {
        "file": "gn_workstation.py", "cls": "GNWorkstation",
        "csv_kw": "csv_path", "name": "整站（顶层）",
    },
}

# ----------------------------------------------------------------------
# 本适配器自带的驱动（文件在 wm_backend/app/gn_adapter/ 下，不在上游仓库）。
# `local:文件名` 表示相对本目录加载；PRCXI 走完全独立的 DMTP 通道（见 prcxi/）。
# ----------------------------------------------------------------------
LOCAL_DEVICE_SPECS: Dict[str, Dict[str, Any]] = {
    "gn_liquid_cooling": {
        "file": "local:liquid_cooling.py", "cls": "LiquidCoolingDevice",
        "csv_kw": "csv_path", "name": "液冷模块（7 组）",
        "channel": "opcua",
    },
    # PRCXI 是 socket/DMTP 设备：不是 GNStationClient 子类，实例化与执行
    # 都走 prcxi 适配器（station.py 的 PRCXI 分支），不进 classes 索引 ——
    # 但 actions() / has() 仍可查询，供导入预览「后端核对」用。
    "PRCXI": {
        "file": "local:prcxi_adapter.py", "cls": "PrcxiDevice",
        "csv_kw": None, "name": "PRCXI 9320 移液工作站（DMTP V4.0）",
        "channel": "dmtp",
    },
}

# 编辑器的 device_id → 本适配器无法处理的说明（保持"响亮失败"，绝不静默假成功）
UNSUPPORTED: Dict[str, str] = {
    # gn_liquid_cooling 与 PRCXI 已补驱动，不再是 unsupported。
}

# `system` 伪设备：节点库里的动作名 → 驱动方法名
SYSTEM_ALIASES: Dict[str, str] = {
    "reset": "system_reset",
    "stop": "system_stop",
    "error_alarm": None,          # 特殊：写 Device_error
}

# 诊断类动作（只读，不驱动机构）—— 可在不冒风险的前提下验证整条链路
DIAGNOSTIC_ACTIONS = ("get_plc_stats", "get_system_ready", "get_status", "detect")

_lock = threading.RLock()
_cache: Optional["DriverCatalog"] = None


class DriverCatalog:
    """GN 驱动的加载结果：`device_id → 类` + 逐设备错误。"""

    def __init__(self, root: str, classes: Dict[str, type], errors: Dict[str, str],
                 shim_info: Dict[str, Any]):
        self.root = root
        self.classes = classes
        self.errors = errors
        self.shim_info = shim_info
        self._methods: Dict[str, Dict[str, Any]] = {}

    # ---- 查询 ----
    def has(self, device_id: str) -> bool:
        return device_id in self.classes

    def get(self, device_id: str) -> Optional[type]:
        return self.classes.get(device_id)

    def status(self) -> Dict[str, Any]:
        all_specs = dict(DEVICE_SPECS)
        all_specs.update(LOCAL_DEVICE_SPECS)
        return {
            "unilabos_root": self.root,
            "devices": {k: v["name"] for k, v in all_specs.items() if k in self.classes},
            "device_count": len(self.classes),
            "load_errors": dict(self.errors),
            "unsupported": dict(UNSUPPORTED),
            "platform_shim_errors": list(self.shim_info.get("errors") or []),
        }

    # ---- 动作索引 ----
    def actions(self, device_id: str) -> List[Dict[str, Any]]:
        """该驱动暴露的动作（方法名 + 参数表 + 是否诊断类）。"""
        with _lock:
            if device_id in self._methods:
                return self._methods[device_id]
            out: List[Dict[str, Any]] = []
            cls = self.classes.get(device_id)
            if cls is not None:
                for mname, member in _iter_actions(cls):
                    try:
                        sig = inspect.signature(member)
                        params = [p for p in sig.parameters if p != "self"]
                    except (TypeError, ValueError):
                        params = []
                    meta = getattr(member, "_action_registry_meta", None) or {}
                    out.append({
                        "method": mname,
                        "params": params,
                        "diagnostic": mname in DIAGNOSTIC_ACTIONS,
                        "always_free": bool(meta.get("always_free")),
                        "description": meta.get("description") or "",
                    })
            out.sort(key=lambda a: (not a["diagnostic"], a["method"]))
            self._methods[device_id] = out
            return out


# ----------------------------------------------------------------------
# 加载
# ----------------------------------------------------------------------
def load(force: bool = False) -> DriverCatalog:
    """加载（带缓存）GN 驱动目录。"""
    global _cache
    with _lock:
        if _cache is not None and not force:
            return _cache

        root = cfg.repo_gn_dir() or cfg.gn_dir()
        if not root:
            raise RuntimeError("未找到 wm_action 驱动目录（需要 gn_station_base.py 与 gn_plc_client.py）。")

        shim_info = shim.install(root)
        # 换掉上游那个「一切返回 True」的 _SimulatedPlc —— 否则仿真档每个动作都会
        # 因为「清零回读不为 0」「Running_Status 读成 True」而误判失败。
        # 必须在驱动模块加载之前，见 sim_plc.install 的说明。
        sim_plc.install()
        classes: Dict[str, type] = {}
        errors: Dict[str, str] = {}

        for dev_id, spec in DEVICE_SPECS.items():
            try:
                mod = shim.driver_module(spec["file"])
                cls = getattr(mod, spec["cls"])
                classes[dev_id] = cls
            except Exception as exc:                       # noqa: BLE001
                errors[dev_id] = "%s: %s: %s" % (spec["cls"], type(exc).__name__, exc)

        # 本适配器自带的驱动（液冷 / PRCXI）。文件在本目录，用 local: 前缀加载。
        # channel=dmtp 的设备（PRCXI）**不装载类**：它不是 GNStationClient 子类，
        # 相对导入在本地装载的合成包名下也不成立；实例化与执行都走 station.py
        # 的 DMTP 分支（prcxi_adapter），这里只登记 spec 供 device_spec() 查询。
        import importlib.util as _ilu
        _here = os.path.dirname(os.path.abspath(__file__))
        for dev_id, spec in LOCAL_DEVICE_SPECS.items():
            fname = spec["file"]
            if not fname.startswith("local:"):
                errors[dev_id] = "本地驱动 spec 必须以 local: 开头：%r" % fname
                continue
            if spec.get("channel") == "dmtp":
                continue                            # spec 已登记，类不进索引
            path = os.path.join(_here, fname[len("local:"):])
            try:
                modname = "wm_gn_adapter_local." + os.path.splitext(fname[6:])[0]
                spec_ld = _ilu.spec_from_file_location(modname, path)
                if spec_ld is None or spec_ld.loader is None:
                    raise ImportError("无法为 %s 建立 spec" % path)
                mod = _ilu.module_from_spec(spec_ld)
                sys.modules[modname] = mod
                spec_ld.loader.exec_module(mod)
                cls = getattr(mod, spec["cls"])
                classes[dev_id] = cls
            except Exception as exc:                       # noqa: BLE001
                errors[dev_id] = "%s: %s: %s" % (spec["cls"], type(exc).__name__, exc)

        _cache = DriverCatalog(root, classes, errors, shim_info)
        return _cache


def reset_cache() -> None:
    global _cache
    with _lock:
        _cache = None


def _iter_actions(cls: type) -> List[Tuple[str, Any]]:
    """遍历类上被 `@action` 标记的方法（含继承链）。"""
    out: List[Tuple[str, Any]] = []
    seen = set()
    for klass in reversed(getattr(cls, "__mro__", [cls])):
        for mname, member in vars(klass).items():
            if mname.startswith("_") or mname in seen:
                continue
            raw = member
            if isinstance(raw, (staticmethod, classmethod)):
                raw = raw.__func__
            if not callable(raw):
                continue
            if hasattr(raw, "_action_registry_meta"):
                out.append((mname, raw))
                seen.add(mname)
    return out


# ----------------------------------------------------------------------
# 节点 → 调用映射
# ----------------------------------------------------------------------
class GNCallError(ValueError):
    """节点无法映射到驱动调用时抛出（绝不静默降级）。"""


def strip_auto_prefix(name: str) -> str:
    """节点名去掉编辑器加的 `auto-` 前缀：`auto-ch8_aspirate` → `ch8_aspirate`。"""
    n = (name or "").strip()
    return n[5:] if n.startswith("auto-") else n


def device_spec(device_id: str) -> Optional[Dict[str, Any]]:
    """查设备 spec（上游 DEVICE_SPECS + 本地 LOCAL_DEVICE_SPECS 合并查询）。"""
    spec = DEVICE_SPECS.get(device_id)
    if spec is None:
        spec = LOCAL_DEVICE_SPECS.get(device_id)
    return spec


def resolve_call(device_id: str, node: Dict[str, Any],
                 catalog: Optional[DriverCatalog] = None) -> Dict[str, Any]:
    """把工作流节点解析成 `{method, kwargs, cmd_type, warnings}`。

    解析优先级（确定性，且有明确理由）：

      1. `param.cmd_type` 存在 → `execute_command(cmd_type=…, **rest)`
         节点库（gn_node_library.js）对绝大多数设备是 cmdType 驱动的，
         cmd_type 是权威字段，优先于名字。
      2. 否则取节点名（去 `auto-`）作为驱动方法名，`param` 直接作为 kwargs。
         离心管设备的 `ch8_aspirate` 这类"宏动作"自带 setpoints，走这条最安全。
      3. 都不成立 → 抛 GNCallError，并列出该驱动真实可用的动作。

    PRCXI 走独立通道（prcxi_adapter.run_prcxi_node），**不进本函数**；
    本函数只服务 OPC UA 设备。
    """
    cat = catalog or load()
    dev = str(node.get("device_name") or node.get("resource_name") or "").strip()

    if dev in UNSUPPORTED:
        raise GNCallError("设备 %s 无驱动实现：%s" % (dev, UNSUPPORTED[dev]))
    if not dev:
        raise GNCallError("节点缺少 device_name")
    # DMTP 通道设备：station.run_node 已分流，这里兜底报错（防止误入 OPC 路径）
    dmtp_spec = LOCAL_DEVICE_SPECS.get(dev)
    if dmtp_spec is not None and dmtp_spec.get("channel") == "dmtp":
        raise GNCallError(
            "设备 %s 走 DMTP 通道，请经 station.run_node 的 PRCXI 分支执行，"
            "不要调用 OPC 路径的 resolve_call" % dev)
    if not cat.has(dev):
        err = cat.errors.get(dev)
        raise GNCallError(
            "设备 %s 没有可用驱动%s" % (dev, ("（装载失败：%s）" % err) if err else ""))

    cls = cat.get(dev)
    raw_name = str(node.get("name") or node.get("template_name") or "").strip()
    method = strip_auto_prefix(raw_name)
    params = dict(node.get("param") or {})

    # `system` 伪设备：动作名与驱动方法名不同，先做别名归一
    if dev == "system" and method in SYSTEM_ALIASES:
        mapped = SYSTEM_ALIASES[method]
        if mapped is None:
            return {"method": None, "kwargs": {}, "cmd_type": None,
                    "special": method, "device_id": dev, "warnings": []}
        method = mapped

    available = {a["method"] for a in cat.actions(dev)}
    warnings: List[str] = []

    has_cmd_type = params.get("cmd_type") is not None
    if has_cmd_type:
        chosen = "execute_command"
        if chosen not in available:
            raise GNCallError("设备 %s 的驱动没有 execute_command，但节点带了 cmd_type" % dev)
        if raw_name and strip_auto_prefix(raw_name) != "execute_command":
            warnings.append(
                "节点名 %r 与 param.cmd_type=%r 并存，按 cmd_type 走 execute_command"
                % (raw_name, params.get("cmd_type")))
    else:
        chosen = method or "execute_command"
        if chosen not in available:
            if chosen == "execute_command":
                raise GNCallError(
                    "设备 %s 的节点 %r 走 execute_command 但缺少 param.cmd_type"
                    % (dev, raw_name))
            raise GNCallError(
                "设备 %s 没有动作 %r（节点名 %r）。可用动作：%s"
                % (dev, chosen, raw_name, ", ".join(sorted(available)) or "无"))
        params.pop("cmd_type", None)

    # 按真实签名裁剪 kwargs，并记录被丢弃的键（可审计）
    member = _find_member(cls, chosen)
    kwargs, dropped = _filter_kwargs(member, params)
    kwargs = _coerce_kwargs(member, kwargs)
    if dev == "gn_robotic_arm":
        for key in ("station", "source", "target"):
            if key in kwargs:
                kwargs[key] = _arm_station_key(kwargs[key])
    if dropped:
        warnings.append("以下参数不在 %s 的签名里，已忽略：%s" % (chosen, ", ".join(sorted(dropped))))

    cmd_type = None
    if chosen == "execute_command":
        try:
            cmd_type = int(kwargs["cmd_type"])
        except (KeyError, TypeError, ValueError):
            raise GNCallError("execute_command 的 cmd_type 必须是整数，收到 %r"
                              % kwargs.get("cmd_type"))
        kwargs["cmd_type"] = cmd_type

    return {"method": chosen, "kwargs": kwargs, "cmd_type": cmd_type,
            "special": None, "device_id": dev, "warnings": warnings}


# GN/robotic_arm.py STATIONS 的键。编辑器旧数据常存模块号 1..10 或别名。
_ARM_BY_MODULE = {
    1: "oven", 2: "locking", 3: "quick_change", 4: "centrifuge",
    5: "vacuum_oven", 6: "nine9320", 7: "tube", 8: "stack",
    9: "solid", 10: "finished_area",
}
_ARM_ALIAS = {
    "oven": "oven", "furnace": "oven",
    "lock": "locking", "locking": "locking", "locking_mechanism": "locking",
    "quick": "quick_change", "quickchange": "quick_change",
    "quick_carrier_exchange": "quick_change", "quick_change": "quick_change",
    "centrifuge": "centrifuge", "centri": "centrifuge",
    "vacuum": "vacuum_oven", "voven": "vacuum_oven", "vacuum_oven": "vacuum_oven",
    "nine9320": "nine9320", "9320": "nine9320", "prcxi": "nine9320",
    "tube": "tube", "tubeh": "tube",
    "stack": "stack", "rotary_stack": "stack",
    "solid": "solid", "balance": "solid", "solid_weighing": "solid",
    "finished": "finished_area", "finished_area": "finished_area",
    "finished_product_area": "finished_area", "product": "finished_area",
}


def _arm_station_key(value):
    """把模块号或别名收成 GN 机械手 STATIONS 的键。对不上就原样返回。"""
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) or (isinstance(value, str) and value.strip().lstrip("-").isdigit()):
        try:
            num = int(value)
        except (TypeError, ValueError):
            return value
        return _ARM_BY_MODULE.get(num, value)
    key = str(value).strip().lower()
    return _ARM_ALIAS.get(key, value)


def _find_member(cls: type, name: str):
    for klass in getattr(cls, "__mro__", [cls]):
        if name in vars(klass):
            raw = vars(klass)[name]
            if isinstance(raw, (staticmethod, classmethod)):
                return raw.__func__
            return raw
    return None


def _unwrap_ann(ann):
    if ann is None or ann is inspect.Parameter.empty:
        return None
    origin = getattr(ann, "__origin__", None)
    if origin is typing.Union:
        args = [a for a in getattr(ann, "__args__", ()) if a is not type(None)]
        if len(args) == 1:
            return args[0]
    return ann


def _coerce_value(value, ann):
    """把编辑器里的字符串参数收成驱动签名要求的 int/float/bool。"""
    ann = _unwrap_ann(ann)
    if ann is None or value is None:
        return value
    if isinstance(value, str) and not value.strip() and ann in (int, float):
        return None
    try:
        if ann is int and not isinstance(value, bool):
            if isinstance(value, str):
                text = value.strip()
                return int(float(text)) if "." in text else int(text)
            return int(value)
        if ann is float:
            return float(value.strip() if isinstance(value, str) else value)
        if ann is bool and isinstance(value, str):
            return value.strip().lower() in ("1", "true", "yes", "on")
    except (TypeError, ValueError):
        return value
    return value


def _coerce_kwargs(member, kwargs: Dict[str, Any]) -> Dict[str, Any]:
    if member is None:
        return dict(kwargs)
    try:
        hints = typing.get_type_hints(member)
    except Exception:                                       # noqa: BLE001
        hints = {}
    return {k: _coerce_value(v, hints.get(k)) for k, v in kwargs.items()}


def _filter_kwargs(member, params: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """只保留目标方法签名接受的参数（除非它有 **kwargs）。"""
    if member is None:
        return dict(params), []
    try:
        sig = inspect.signature(member)
    except (TypeError, ValueError):
        return dict(params), []
    accepts_var_kw = any(p.kind == inspect.Parameter.VAR_KEYWORD
                         for p in sig.parameters.values())
    if accepts_var_kw:
        return dict(params), []
    allowed = {p.name for p in sig.parameters.values()
               if p.kind in (inspect.Parameter.POSITIONAL_OR_KEYWORD,
                             inspect.Parameter.KEYWORD_ONLY)}
    kwargs = {k: v for k, v in params.items() if k in allowed}
    dropped = [k for k in params if k not in allowed]
    return kwargs, dropped
