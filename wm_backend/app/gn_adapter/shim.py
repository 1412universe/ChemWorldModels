# -*- coding: utf-8 -*-
"""平台侧 shim：让 Uni-Lab-OS 的 GN 驱动**原样 import** 就能在 wm_backend 里跑。

为什么需要
----------
GN 驱动（`unilabos/devices/workstation/GN/*.py`）只依赖平台的三样东西：

    unilabos.utils.log.logger                 日志门面（驱动用了 .info/.warning/.trace）
    unilabos.registry.decorators.action       动作注册装饰器（元数据挂 _action_registry_meta）
    unilabos.registry.decorators.not_action   非动作标记

而这三个模块所在的包（`unilabos/__init__.py`、`unilabos/utils/__init__.py`、
`unilabos/registry/decorators.py`）会把整条 ROS2 / pylabrobot / unilabos_msgs 依赖树拖进来
（`decorators.py` 还依赖 `unilabos.resources.site_definition`），
在 wm_backend 这个只有 FastAPI 的进程里根本装不起来、也没必要装。

做法
----
在 `sys.modules` 里**预注册一棵合成的 `unilabos.*` 命名空间树**：

  合成（薄壳，本文件内实现）
      unilabos / unilabos.utils / unilabos.registry / unilabos.config …  空包
      unilabos.utils.log              → 一个最小 logger 门面（含 .trace）
      unilabos.registry.decorators    → action / not_action / get_action_meta …
      unilabos.config.config          → BasicConfig.action_mode（驱动据此决定是否连硬件）
      unilabos.devices.workstation.workstation_base → WorkstationBase 桩

  真实文件（从 Uni-Lab-OS 原样加载，不复制）
      unilabos.device_comms.opcua_client.node.uniopcua   （DataType / NodeType / Variable …）
      unilabos.device_comms.universal_driver             （UniversalDriver / …）
      unilabos.devices.workstation.GN.base_opcua_client
      unilabos.devices.workstation.GN.gn_plc_client
      unilabos.devices.workstation.GN.gn_station_base
      unilabos.devices.workstation.GN.<各驱动>

这样驱动文件一个字都不用改，仍然是 Uni-Lab-OS 里的那一份真源码 ——
上游更新驱动，这里 `load()` 一次即生效。
"""
from __future__ import annotations

import importlib.util
import logging
import os
import sys
import threading
import types
from functools import wraps
from typing import Any, Dict, List, Optional, Tuple

TRACE_LEVEL = 5
logging.addLevelName(TRACE_LEVEL, "TRACE")

_LOGGER_NAME = "unilabos"

# 已经装过 shim 的 root（同一个进程只装一次）
_installed_root: Optional[str] = None
_lock = threading.RLock()


# ======================================================================
# 1) 日志门面
# ======================================================================
class _LoggerFacade:
    """转发标准 logging 方法，并补上驱动用到的 `trace()`。

    驱动里出现过 `logger.trace(...)`（base_opcua_client.py），
    stdlib Logger 没有这一级，必须补。
    """

    __slots__ = ("_lg",)

    def __init__(self, name: str = _LOGGER_NAME):
        object.__setattr__(self, "_lg", logging.getLogger(name))

    def trace(self, msg: Any, *args: Any, **kwargs: Any) -> None:
        lg = object.__getattribute__(self, "_lg")
        if lg.isEnabledFor(TRACE_LEVEL):
            lg.log(TRACE_LEVEL, msg, *args, **kwargs)

    def isEnabledFor(self, level: int) -> bool:  # noqa: N802
        return object.__getattribute__(self, "_lg").isEnabledFor(level)

    def __getattr__(self, item: str) -> Any:
        return getattr(object.__getattribute__(self, "_lg"), item)

    def __setattr__(self, key: str, value: Any) -> None:
        setattr(object.__getattribute__(self, "_lg"), key, value)


def configure_logging(verbose: bool = False) -> None:
    """驱动日志默认静默（root 是 WARNING）；GN_DRIVER_LOG=1 时开到 DEBUG。"""
    lg = logging.getLogger(_LOGGER_NAME)
    want = verbose or os.environ.get("GN_DRIVER_LOG", "").strip() in ("1", "true", "yes", "on")
    lg.setLevel(logging.DEBUG if want else logging.WARNING)


# ======================================================================
# 2) 动作注册装饰器（语义对齐 unilabos.registry.decorators）
# ======================================================================
_UNSET = object()


def not_action(func):
    """标记「不是动作」——透明包装并打上 `_is_not_action`。"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    wrapper._is_not_action = True
    return wrapper


def action(
    action_type: Any = _UNSET,
    action_name=None,
    displayname=None,
    goal=None,
    feedback=None,
    result=None,
    handles=None,
    goal_default=None,
    placeholder_keys=None,
    always_free: bool = False,
    is_protocol: bool = False,
    description: str = "",
    auto_prefix: bool = False,
    parent=None,
    estimate_duration_fixed=None,
    estimate_duration_express: str = "",
    exception_handling: bool = True,
    timeout=None,
    execution_timeout=None,
    default_on_user_timeout: str = "abort",
    feedback_interval=None,
    node_type=None,
    executor_kind=None,
    error_policy=None,
    resource_contract=None,
    **extra: Any,
):
    """`@action(...)` 的最小忠实实现。

    只保留 wm_backend 真正读得到的元数据，挂在与上游一致的
    `_action_registry_meta` 属性上（这样 `get_action_meta()` 口径不变）：

        action_type / action_args / description / always_free / auto_prefix

    `action_args` 由函数签名推导（上游是显式传入的 ROS goal；这里是 Python kwargs）。
    支持裸用 `@action`（不带括号）。
    """

    def decorator(func):
        import inspect as _inspect

        try:
            sig = _inspect.signature(func)
            names = [p for p in sig.parameters if p != "self"]
        except (TypeError, ValueError):
            names = []

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        wrapper._action_registry_meta = {
            "action_type": None if action_type is _UNSET else action_type,
            "action_name": action_name or getattr(func, "__name__", ""),
            "action_args": list(names),
            "displayname": displayname,
            "description": description,
            "always_free": bool(always_free),
            "auto_prefix": bool(auto_prefix),
            "is_protocol": bool(is_protocol),
            "timeout": timeout,
            "execution_timeout": execution_timeout,
            "placeholder_keys": placeholder_keys or {},
        }
        wrapper._action_contract_kind = "typed"
        wrapper._action_error_policy = None
        if always_free:
            wrapper._is_always_free = True
        return wrapper

    # 裸用：@action  → 第一个位置实参其实是函数本身
    if callable(action_type) and not isinstance(action_type, type):
        fn, action_type = action_type, _UNSET
        return decorator(fn)
    return decorator


def get_action_meta(func) -> Optional[Dict[str, Any]]:
    return getattr(func, "_action_registry_meta", None)


def has_action_decorator(func) -> bool:
    return hasattr(func, "_action_registry_meta")


def is_always_free(func) -> bool:
    return bool(getattr(func, "_is_always_free", False))


def is_not_action(func) -> bool:
    return bool(getattr(func, "_is_not_action", False))


def _identity_decorator(*_a, **_k):
    """device/resource/topic_config 等的宽松桩：调用即返回装饰器/原物。"""

    def deco(obj):
        return obj

    if len(_a) == 1 and not _k and callable(_a[0]):
        return _a[0]
    return deco


# ======================================================================
# 3) 驱动侧全局配置桥（BasicConfig.action_mode）
# ======================================================================
class _BasicConfig:
    """驱动 `_skip_hardware_connect()` 读它来决定是否打开 OPC 会话。

    `action_mode == "simulate"` → 驱动内部用 `_SimulatedPlc`（零硬件访问）。

    注意：GN-20260803 分支的厂家重构已删掉驱动内的 simulate 分支，这个
    类现在只是**进程默认档位**的载体；每线程的实际档位走下面的
    `_mode_local`（见 set/get_action_mode 的说明）。
    """

    action_mode: str = "simulate"


# 进程默认档位：环境变量 GN_ACTION_MODE=real 时默认真机，否则默认仿真。
# 只给「从未显式设过档位的线程」兜底 —— 显式 set 过的线程一律以线程局部为准。
_DEFAULT_MODE = ("real"
                 if (os.environ.get("GN_ACTION_MODE") or "").strip().lower() == "real"
                 else "simulate")
_mode_local = threading.local()


class _ConfigModule(types.ModuleType):
    def __init__(self, name: str):
        super().__init__(name)
        self.BasicConfig = _BasicConfig


# ======================================================================
# 4) WorkstationBase 桩（gn_workstation 的父类，真身依赖 pylabrobot + ROS2）
# ======================================================================
class WorkstationBase:
    """顶站基类桩：只提供 GNWorkstation 真正用到的那点表面。"""

    def __init__(self, deck=None, *args: Any, **kwargs: Any):
        self.deck = deck

    def disconnect(self) -> None:
        return None


# ======================================================================
# 5) sys.modules 组装
# ======================================================================
def _register(name: str, module: types.ModuleType) -> types.ModuleType:
    module.__path__ = []                      # 当包用，子模块可继续挂
    sys.modules[name] = module
    _link(name)
    return module


def _link(name: str) -> None:
    """把 `a.b.c` 挂成 `a.b` 的属性，`from a.b import c` 才找得到。"""
    if "." not in name:
        return
    parent_name, child = name.rsplit(".", 1)
    parent = sys.modules.get(parent_name)
    if parent is not None:
        setattr(parent, child, sys.modules[name])


def _synthetic(name: str, **attrs: Any) -> types.ModuleType:
    m = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(m, k, v)
    return _register(name, m)


def _load_file(modname: str, path: str) -> types.ModuleType:
    """从真实源码文件加载模块，并注册为 modname（供子模块绝对导入）。"""
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    spec = importlib.util.spec_from_file_location(modname, path)
    if spec is None or spec.loader is None:
        raise ImportError("无法为 %s 建立 spec" % path)
    mod = importlib.util.module_from_spec(spec)
    mod.__path__ = []
    sys.modules[modname] = mod
    _link(modname)
    try:
        spec.loader.exec_module(mod)
    except BaseException:
        sys.modules.pop(modname, None)
        raise
    return mod


# 需要先注册的中间包（真身们是叶子模块，中间包只要存在即可）
_SYNTH_PACKAGES = [
    "unilabos",
    "unilabos.utils",
    "unilabos.registry",
    "unilabos.config",
    "unilabos.device_comms",
    "unilabos.device_comms.opcua_client",
    "unilabos.device_comms.opcua_client.node",
    "unilabos.devices",
    "unilabos.devices.workstation",
    "unilabos.devices.workstation.GN",
]

# 由真实源码加载的模块（顺序 = 依赖顺序）
_REAL_MODULES: List[Tuple[str, str]] = [
    ("unilabos.device_comms.opcua_client.node.uniopcua",
     "unilabos/device_comms/opcua_client/node/uniopcua.py"),
    ("unilabos.device_comms.universal_driver",
     "unilabos/device_comms/universal_driver.py"),
    ("unilabos.devices.workstation.GN.base_opcua_client",
     "unilabos/devices/workstation/GN/base_opcua_client.py"),
    ("unilabos.devices.workstation.GN.gn_plc_client",
     "unilabos/devices/workstation/GN/gn_plc_client.py"),
    ("unilabos.devices.workstation.GN.gn_station_base",
     "unilabos/devices/workstation/GN/gn_station_base.py"),
]


def install(root: str, verbose: bool = False) -> Dict[str, Any]:
    """把 `unilabos.*` 装进 sys.modules。幂等；同一 root 只需一次。

    返回 {"root", "modules", "errors"}；`errors` 里是**非致命**的加载失败
    （例如 universal_driver 缺 pyserial），调用方可据此降级。
    """
    global _installed_root
    with _lock:
        if _installed_root == root and "unilabos" in sys.modules:
            plc = sys.modules.get("unilabos.devices.workstation.GN.gn_plc_client")
            origin = os.path.abspath(getattr(plc, "__file__", "") or "") if plc else ""
            from . import config as cfg
            gn = cfg.repo_gn_dir()
            expect = os.path.abspath(os.path.join(gn, "gn_plc_client.py")) if gn else ""
            if not expect or origin == expect:
                return {"root": root, "modules": [], "errors": [], "cached": True}

        errors: List[str] = []
        loaded: List[str] = []

        # --- 1) 是真实包还是我们合成？先看有没有现成的 unilabos 真包 ---
        # 若 root 已可用且真包能被轻量导入，我们也**不**用它：真包会把 ROS2 拖进来。
        # 统一走合成树，保证行为在 wm_backend 内可预测。
        for pkg in _SYNTH_PACKAGES:
            if pkg not in sys.modules:
                _synthetic(pkg)

        # --- 2) 薄壳 ---
        configure_logging(verbose)
        logger = _LoggerFacade(_LOGGER_NAME)
        log_mod = _synthetic(
            "unilabos.utils.log",
            logger=logger,
            TRACE_LEVEL=TRACE_LEVEL,
            configure_logging=configure_logging,
        )
        # 真 log.py 的 API 面里驱动可能用到的其它名字，给个宽容别名
        log_mod.get_logger = lambda *a, **k: logger

        deco_mod = _synthetic(
            "unilabos.registry.decorators",
            action=action,
            not_action=not_action,
            device=_identity_decorator,
            resource=_identity_decorator,
            topic_config=_identity_decorator,
            always_free=_identity_decorator,
            legacy_action=action,
            get_action_meta=get_action_meta,
            has_action_decorator=has_action_decorator,
            is_always_free=is_always_free,
            is_not_action=is_not_action,
            get_device_meta=lambda *a, **k: None,
            clear_registry=lambda *a, **k: None,
        )

        cfg_mod = _ConfigModule("unilabos.config.config")
        _register("unilabos.config.config", cfg_mod)

        _synthetic("unilabos.devices.workstation.workstation_base",
                   WorkstationBase=WorkstationBase)

        # --- 3) 真实源码 ---
        # PLC / 工站基类 / OPC 客户端优先用仓库 GN/，和现场脚本用的是同一份。
        for modname, rel in _REAL_MODULES:
            path = _module_path(root, rel)
            try:
                _load_file(modname, path)
                loaded.append(modname)
            except Exception as exc:                     # noqa: BLE001
                errors.append("%s ← %s: %s: %s" % (modname, rel, type(exc).__name__, exc))

        # uniopcua / universal_driver 若加载失败，补最小兜底，
        # 让 base_opcua_client 仍有机会起来（避免整条链因一个可选依赖全灭）
        if "unilabos.device_comms.opcua_client.node.uniopcua" not in sys.modules:
            _synthetic_fallback_uniopcua()
            errors.append("uniopcua 使用兜底实现（opcua 库不可用）")
        if "unilabos.device_comms.universal_driver" not in sys.modules:
            _synthetic_fallback_universal_driver()
            errors.append("universal_driver 使用兜底实现（pyserial 等不可用）")

        _installed_root = root
        return {"root": root, "modules": loaded, "errors": errors}


def _synthetic_fallback_uniopcua() -> None:
    """opcua 库缺失时的最小 DataType/NodeType（仅供枚举引用，不可真连）。"""
    from enum import Enum

    class DataType(Enum):                                # noqa: D401
        BOOLEAN = 1
        INT16 = 2
        UINT16 = 3
        INT32 = 4
        UINT32 = 5
        INT64 = 6
        UINT64 = 7
        FLOAT = 8
        DOUBLE = 9
        STRING = 10
        DATETIME = 11
        BYTESTRING = 12

    class NodeType(Enum):
        VARIABLE = 1
        OBJECT = 2
        METHOD = 3

    class Base:
        def __init__(self, *a: Any, **k: Any):
            pass

    class Variable(Base):
        pass

    class Method(Base):
        pass

    class Object(Base):
        pass

    _synthetic("unilabos.device_comms.opcua_client.node.uniopcua",
               DataType=DataType, NodeType=NodeType, Base=Base,
               Variable=Variable, Method=Method, Object=Object)


def _synthetic_fallback_universal_driver() -> None:
    """pyserial 缺失时的 UniversalDriver 桩。"""

    class UniversalDriver:
        def __init__(self, *a: Any, **k: Any):
            pass

        def _init_logger(self, *a: Any, **k: Any) -> None:
            return None

        def execute_command_from_outer(self, *a: Any, **k: Any):
            return None

    class TransportDriver(UniversalDriver):
        pass

    class DriverChecker(UniversalDriver):
        pass

    _synthetic("unilabos.device_comms.universal_driver",
               UniversalDriver=UniversalDriver,
               TransportDriver=TransportDriver,
               DriverChecker=DriverChecker)


def set_action_mode(mode: str) -> None:
    """把**当前线程**的驱动层动作档设成 simulate / real。

    必须是线程局部的：同一进程会同时存在不同档位的工站 —— LIVE 快照线程
    一直在 simulate（`station.open()` 每 tick 都 `_sync_mode()`），而某个
    请求要 real 探针。写成进程级全局时，后一个线程的档位会把前一个线程的
    冲掉：probe 明明要求 real，路由却读到 simulate → 拿到镜像模型，
    `read_with_retry` 空成功 → 回报「system_ready=true、connected=false」
    这种自相矛盾的假成功（fail-open）。

    线程从未设过档位时（例如驱动自己的保活线程）退回进程默认值。
    """
    _mode_local.value = "real" if str(mode).lower() == "real" else "simulate"


def get_action_mode() -> str:
    """当前线程的档位；没设过时退回进程默认（GN_ACTION_MODE，默认 simulate）。"""
    return getattr(_mode_local, "value", None) or _DEFAULT_MODE


def logger() -> _LoggerFacade:
    return sys.modules["unilabos.utils.log"].logger


def _module_path(root: str, rel: str) -> str:
    """GN 三件套（基类 / PLC / OPC 客户端）从仓库 GN/ 取，其余仍从 Uni-Lab-OS 取。"""
    from . import config as cfg

    base = os.path.basename(rel)
    gn = cfg.repo_gn_dir()
    if gn and base in ("base_opcua_client.py", "gn_plc_client.py", "gn_station_base.py"):
        alt = os.path.join(gn, base)
        if os.path.isfile(alt):
            return alt
    return os.path.join(root, rel)


def driver_module(rel_filename: str, verbose: bool = False) -> types.ModuleType:
    """按文件名加载 GN 目录下的驱动模块（如 "gn_locking_mechanism.py"）。

    有仓库 GN/ 时用那一份，这样现场改过的驱动会直接被真机运行调用。
    """
    from . import config as cfg

    root = cfg.unilabos_root()
    if not root:
        raise RuntimeError("未找到 Uni-Lab-OS 仓库根；请设置环境变量 UNILABOS_ROOT")
    install(root, verbose=verbose)
    modname = "unilabos.devices.workstation.GN." + rel_filename[:-3]
    gn = cfg.gn_dir(root)
    path = os.path.join(gn, rel_filename) if gn else ""
    loaded = sys.modules.get(modname)
    # 已经装进解释器的必须就是这份文件。否则（例如先装过 Uni-Lab-OS 副本）
    # 卸掉再从 GN/ 重载，避免真机跑到旧驱动上。
    if loaded is not None:
        origin = os.path.abspath(getattr(loaded, "__file__", "") or "")
        if path and origin == os.path.abspath(path):
            return loaded
        sys.modules.pop(modname, None)
    if not path or not os.path.isfile(path):
        raise FileNotFoundError("GN 驱动不存在：%s" % rel_filename)
    return _load_file(modname, path)
