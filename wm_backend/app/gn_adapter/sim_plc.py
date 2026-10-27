# -*- coding: utf-8 -*-
"""协议感知的仿真 PLC —— 让 `GN_ACTION_MODE=simulate` 这一档有意义。

问题
----
上游 `gn_station_base._SimulatedPlc` 是个「一切返回 True」的 noop：

    def __getattr__(self, name):
        return lambda *a, **k: True

驱动的握手里有大量**按值判断**的点：
  · `CmdTrig` 清零后要回读确认为 0（noop 返回 True → 判「清零失败」）
  · 烘箱启动前要读 `Running_Status` 必须为 0（noop 返回 True → 判「正在运行」拒绝）
  · `wait_reached` / `wait_positions_reached` 要把 FB 和 Set 做数值比较（True 不是数）
于是这一档几乎每个动作都会失败 —— 仿真档失去「验证接线」的价值。

本模块
------
用**握手协议的镜像模型**替换它：不连硬件，但忠实模拟点位语义，让驱动
（`GNStationClient` 的 setpoint → CmdType → CmdTrig 脉冲 → 等 CompleteFB → 清零点检）
**完整跑通**。这样在没有现场 PLC 的情况下就能验证：

    工作流节点 → resolve_call 映射 → 驱动动作 → 点位写入序列 → 终态判定 → 结果归一

模型规则（对齐 `OPC_UA协议1.4.0` 点位表语义）
--------------------------------------------
  · 任意写入 → 记录，回读同一值
  · `<P>CmdTrig` 写 1 → 该前缀的 `CompleteFB`/`FinishFB`/`Complete_FB` 置 1
  · `<P>CmdTrig` 写 0 → 该前缀 Complete 标志与 `CmdType` 一起清零
  · `<X>...FB` → 镜像最近一次 `<X>...Set` 的写入值（位置到位判定成立）
  · `System_IsReady` → 1（整站就绪）
  · `*Running_Status` → 0（未运行，放行启动互锁）
  · 其它未知点位 → 0

**这只是镜像模型，不是仿真器** —— 它不模拟机械运动学、不模拟故障，
只保证「协议层读写的因果自洽」。真机行为仍以现场为准。
"""
from __future__ import annotations

import os
import threading
import time
from typing import Any, Dict, Optional, Sequence

# 从节点名推出「命令命名空间」用的后缀表。
# 顺序重要：长/具体的后缀在前，否则 `System_ResetCompleteFB` 会被 `CompleteFB` 抢先匹配，
# 得到 `System_Reset_` 而与 `System_ResetTrig`（→ `System_`）配不上对。
_TRIG_SUFFIXES = (
    "ResetCompleteFB",
    "ResetTrig",
    "Complete_FB",
    "CompleteFB",
    "FinishFB",
    "CmdTrig",
    "CmdType",
)

# 触发位的后缀（写 1 = 启动一条命令，写 0 = 命令生命周期结束）
_TRIG_NODE_SUFFIXES = ("CmdTrig", "ResetTrig")

# 触发前缀 → 完成/反馈前缀 的别名（1.4.0 点位表里「指令寄存器」与「完成反馈」
# 命名不同步的模块）。真机 PLC 内部把它们接在一起，镜像模型必须显式知道这层
# 对应，否则触发后完成反馈永远读 0，驱动的 _wait_done 会死等超时。
#   液冷：指令叫 Cooling_CmdType / Cooling_CmdTrig，
#         完成反馈却叫 Liquid_Cooling_Complete_FB（前缀 Liquid_Cooling_）。
_PREFIX_ALIAS: Dict[str, tuple] = {
    "Cooling_": ("Liquid_Cooling_",),
}

# 温度反馈位 → 温度设置位（液冷 7 个子模块）。命名规律不统一
# （`*_FB` 对 `*_Temperature_*_SET`），无法字符串推导，用显式表。
# 有了它，仿真档里 `get_all_temperatures()` 能镜像出设置温度，
# 总览-510 的液冷读数才有意义。
_FB_TWIN: Dict[str, str] = {
    "Liquid_Cooling_9320_1_FB": "Liquid_Cooling_9320_Temperature_1_SET",
    "Liquid_Cooling_9320_2_FB": "Liquid_Cooling_9320_Temperature_2_SET",
    "Liquid_Cooling_CentrifugeTube_1_FB": "Liquid_Cooling_CentrifugeTube_Temperature_1_SET",
    "Liquid_Cooling_CentrifugeTube_2_FB": "Liquid_Cooling_CentrifugeTube_Temperature_2_SET",
    "Liquid_Cooling_CentrifugeTube_3_FB": "Liquid_Cooling_CentrifugeTube_Temperature_3_SET",
    "Liquid_Cooling_CentrifugeTube_4_FB": "Liquid_Cooling_CentrifugeTube_Temperature_4_SET",
    "Liquid_Cooling_CentrifugeTube_5_FB": "Liquid_Cooling_CentrifugeTube_Temperature_5_SET",
}

# 明确给出确定性取值的点位（协议层常量）
_CONST_READS: Dict[str, Any] = {
    "System_IsReady": 1,          # 上电初始化完成 → 允许下发
    "Device_error": 0,
}

# 相对距离类 Set → 累积 FB（真机：Set 存移动距离，FB 报绝对坐标）
_RELATIVE_POS_FB: Dict[str, str] = {
    "Robot_XPosSet": "Robot_XPosFB",
}

# 温度反馈位的待机基调：温控设备上电未设定时，探头测的是环境温度
# （真实 PLC 的 TempFB 此时报的就是室温，不是 0）。设定过之后仍走
# 写入缓存 / SET 孪生路径 —— 本值只兜「从未写过」的底。
AMBIENT_TEMP = 25.0


def _cmd_prefix(node: str) -> Optional[str]:
    """`Lock_CmdTrig` → `Lock_`；`Robot_FinishFB` → `Robot_`；`System_ResetTrig` → `System_`。"""
    for suf in _TRIG_SUFFIXES:
        if node.endswith(suf):
            return node[: -len(suf)]
    return None


def _is_trig_node(node: str) -> bool:
    return node.endswith(_TRIG_NODE_SUFFIXES)


def _triggered_prefixes(node: str) -> Sequence[str]:
    """读「完成/反馈」类节点时，需要检查其所属命令是否已被触发。

    返回该节点可能对应的**全部触发前缀**（含别名展开）：
    `Liquid_Cooling_Complete_FB` → ("Liquid_Cooling_", "Cooling_")，
    因为真机 PLC 里 Cooling_CmdTrig 触发的动作就点亮这个完成位。
    """
    prefix = _cmd_prefix(node)
    if prefix is None:
        return ()
    out = [prefix]
    for alias, names in _PREFIX_ALIAS.items():
        if prefix == alias:
            out.extend(names)
        elif prefix in names:
            out.append(alias)
    return tuple(out)


class SimulatedPlc:
    """GN 握手协议的镜像模型（零硬件访问）。

    极性差异（重要）：
      · `*CompleteFB` / `*Complete_FB` —— **1 = 本条命令已完成**（触发置 1，触发复位清 0）
      · `Robot_FinishFB`              —— **1 = 空闲/就绪**，0 = 执行中；
        机械手驱动靠「忙 → 闲」跳变判完成，所以这里给一个短暂的忙窗口。
    """

    # 与上游 _SimulatedPlc 保持同名属性，供 get_plc_stats 等读取
    _node_registry: Dict[str, Any] = {}
    _subscribed_names: set = set()
    _loaded_csv_paths: set = set()
    _gn_refcount = 0
    _connected = False
    _use_subscription = False          # 走轮询而非订阅，模型是确定性的
    _cache_timeout = 5.0
    _subscription_interval = 500
    _subscription_handles: Dict[str, Any] = {}
    _name_mapping: Dict[str, str] = {}
    _reverse_mapping: Dict[str, str] = {}
    _found_node_objects: Dict[str, Any] = {}
    _variables_to_find: Dict[str, str] = {}
    _plc_url = "opc.tcp://simulated:4840"

    # 「完成」标志出现前模拟的机械动作时长（秒）
    BUSY_SECONDS = 0.4

    def __init__(self, *args: Any, **kwargs: Any):
        self._lock = threading.RLock()
        self._writes: Dict[str, Any] = {}
        self._triggered: Dict[str, bool] = {}
        self._busy_until: Dict[str, float] = {}
        self._write_count = 0
        self._read_count = 0
        # `GNStationClient` 的代理属性会直接摸这些字典（例如
        # `_wait_done` 里 `self.plc._node_values.pop(...)`），必须是**真字典**，
        # 否则会命中 __getattr__ 的空操作函数而报 'function' object has no attribute 'pop'。
        self._client_lock = threading.RLock()
        self._node_values: Dict[str, Any] = {}
        self._node_registry: Dict[str, Any] = {}
        self._variables_to_find: Dict[str, str] = {}
        self._found_node_objects: Dict[str, Any] = {}
        self._name_mapping: Dict[str, str] = {}
        self._reverse_mapping: Dict[str, str] = {}
        self._subscription_handles: Dict[str, Any] = {}
        self._subscription = None
        self._plc_url = kwargs.get("url") or self._plc_url

    # ---------------------------------------------------------------- 读
    def _model_read(self, node: str) -> Any:
        if node in _CONST_READS:
            return _CONST_READS[node]
        if node.endswith("Running_Status"):
            # 烘箱：启动前必须为 0（放行互锁），触发后应为 1（判「已在运行」），
            # 所以这一位要跟着触发状态走，不能写死。
            prefix = node[: -len("Running_Status")]
            return 1 if self._triggered.get(prefix) else 0
        with self._lock:
            # 完成/就绪反馈由「触发状态 + 忙窗口」决定，
            # **优先级高于普通写入缓存** —— 否则驱动下发前的
            # `set_node_value(CompleteFB, 0)` 预清零会把触发结果盖掉。
            #
            # 前缀用 _triggered_prefixes 展开（含别名）：液冷的指令前缀是
            # Cooling_ 而完成反馈前缀是 Liquid_Cooling_，真机 PLC 内部把两者
            # 接在一起，镜像模型靠 _PREFIX_ALIAS 知道这层对应。
            prefixes = _triggered_prefixes(node)
            busy = any(time.monotonic() < self._busy_until.get(p, 0.0) for p in prefixes)
            triggered = any(self._triggered.get(p) for p in prefixes)
            if prefixes and node.endswith(("Complete_FB", "CompleteFB", "ResetCompleteFB")):
                if not triggered:
                    return 0
                return 0 if busy else 1
            if prefixes and node.endswith("FinishFB"):
                if not triggered:
                    return 1                              # 空闲
                return 0 if busy else 1
            if node in self._writes:
                return self._writes[node]
            if prefixes:
                return 0                                  # CmdTrig / CmdType 未写过
            if node.endswith("FB"):
                twin = _FB_TWIN.get(node)                  # 液冷温度 FB → SET 孪生（命名不规律，显式表）
                if twin is None:
                    twin = node[:-2] + "Set"               # Lock_XPosFB → Lock_XPosSet
                if twin in self._writes:
                    return self._writes[twin]
                # 温度反馈位从未设定过 → 环境温度（探头测的就是室温，不是 0）
                if "Temp" in node:
                    return AMBIENT_TEMP
        return 0

    def get_node_value(self, name: str, use_cache: bool = True, force_read: bool = False) -> Any:
        self._read_count += 1
        return self._model_read(name)

    def read(self, name: str, use_cache: bool = True, force_read: bool = False) -> Any:
        return self.get_node_value(name, use_cache=use_cache, force_read=force_read)

    def read_with_retry(self, name: str, force_read: bool = False,
                        retries: Optional[int] = None) -> Any:
        return self._model_read(name)

    # ---------------------------------------------------------------- 写
    def set_node_value(self, name: str, value: Any) -> bool:
        with self._lock:
            self._writes[name] = value
            self._write_count += 1
            # 机械手 X 小车的 Set 是**相对距离**（驱动 docstring：读当前 X →
            # 距离 = 目标绝对坐标 − 当前 → 写距离到 Robot_XPosSet），而 FB 报的是
            # 绝对坐标。真机 PLC 移动小车后 FB 自然变成新绝对坐标；镜像模型没有
            # 真电机，这里把 FB 累积更新成「旧 FB + 距离」，两跳（pick+place）
            # 场景才不会「写距离却等绝对坐标」而死等。
            # 其它 *XPosSet（Solid/Tube 等）都是绝对坐标语义，走普通孪生。
            fb = _RELATIVE_POS_FB.get(name)
            if fb is not None:
                cur = self._writes.get(fb) or 0
                if isinstance(cur, (int, float)) and isinstance(value, (int, float)):
                    self._writes[fb] = int(cur) + int(value)
            prefix = _cmd_prefix(name)
            if prefix is not None and _is_trig_node(name):
                if value:
                    self._triggered[prefix] = True
                    # 给完成/就绪反馈一个短暂的"执行中"窗口：
                    # 烘箱要等 CompleteFB 从 1→0（判已开始执行），
                    # 机械手要等 FinishFB 从 1→0（判已接受指令），
                    # 没有这个窗口两类驱动都会误判「未执行」。
                    self._busy_until[prefix] = time.monotonic() + self.BUSY_SECONDS
                else:
                    # 触发复位 = 一条命令的生命周期结束：完成标志与 CmdType 一起清
                    self._triggered[prefix] = False
                    self._writes.pop(prefix + "CmdType", None)
                    self._busy_until.pop(prefix, None)
        return True

    def write(self, name: str, value: Any) -> bool:
        return self.set_node_value(name, value)

    def write_with_retry(self, name: str, value: Any,
                         retries: Optional[int] = None) -> bool:
        return self.set_node_value(name, value)

    # ---------------------------------------------------------------- 等待
    def _poll(self, predicate, timeout: float, interval: float) -> bool:
        """镜像模型是确定性的，首次判定即成立；仍按 interval 轮询以保持接口语义。"""
        deadline = time.monotonic() + max(0.0, timeout)
        while True:
            if predicate():
                return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(min(interval, 0.05))

    def wait_true(self, node: str, timeout: float = 180.0, interval: float = 0.2,
                  description: Optional[str] = None) -> bool:
        return self._poll(lambda: bool(self._model_read(node)), timeout, interval)

    def wait_false(self, node: str, timeout: float = 60.0, interval: float = 0.2,
                   description: Optional[str] = None) -> bool:
        return self._poll(lambda: not bool(self._model_read(node)), timeout, interval)

    def wait_reached(self, fb_node: str, target: float, tolerance: float,
                     stable_samples: int = 3, timeout: float = 120.0,
                     interval: float = 0.2, description: Optional[str] = None) -> bool:
        def _ok() -> bool:
            v = self._model_read(fb_node)
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                return False
            return abs(v - target) <= tolerance

        # 到位需要连续 stable_samples 次成立
        for _ in range(max(1, stable_samples)):
            if not _ok():
                return False
        return True

    def wait_complete_value(self, complete_node: str, expected: int, timeout: float,
                            interval: float = 0.05, description: str = "",
                            fail_streak_threshold: int = 3) -> bool:
        return self._poll(lambda: self._model_read(complete_node) == expected,
                          timeout, interval)

    def wait_positions_reached(self, position_targets: Dict[str, float],
                               tolerance: float = 5, stable_samples: int = 3,
                               interval: float = 0.1, sample_timeout: float = 2.0) -> bool:
        if not position_targets:
            return False
        for node, target in position_targets.items():
            v = self._model_read(node)
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                return False
            if abs(int(v) - target) > tolerance:
                return False
        return True

    # ---------------------------------------------------------------- 杂项
    def get_cache_stats(self) -> Dict[str, Any]:
        return {
            "simulated": True,
            "connected": False,
            "reads": self._read_count,
            "writes": self._write_count,
            "tracked_nodes": len(self._writes),
        }

    def release(self) -> None:
        return None

    def disconnect(self) -> None:
        return None

    def _reconnect(self) -> bool:
        return True

    def load_nodes_from_csv_once(self, csv_path: str) -> None:
        return None

    def start_keepalive(self, *args: Any, **kwargs: Any) -> None:
        return None

    def stop_keepalive(self) -> None:
        return None

    def subscribe_once(self, nodes: Sequence[str]):
        return _NullSubscription()

    def __getattr__(self, name: str) -> Any:
        """兜底：驱动偶尔会摸到一些未列出的内部属性/方法（如 `command_lock`）。

        沿用上游 `_SimulatedPlc` 的策略返回一个空操作，保证仿真档不会因为
        一个无关紧要的内部属性而 AttributeError。**已显式定义的名字不会走到这里。**
        """
        if name.startswith("__"):
            raise AttributeError(name)

        def _noop(*_args: Any, **_kwargs: Any) -> Any:
            return True

        return _noop

    # 记录本次运行的写入序列（排查映射是否合理时很有用）
    def write_trace(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._writes)


class _NullSubscription:
    def delete(self) -> None:
        return None


# ---------------------------------------------------------------------------
# 档位路由工厂（GN-20260803 分支驱动适配，2026-10-15）
#
# 新版驱动（组合模式）`GNStationClient.__init__` / `GNWorkstation.__init__`
# 都是直接 `GnPlcClient.get_or_create(url=..., csv_path=...)`，**没有
# simulate 分支、也没有 _SimulatedPlc 这个名字**（旧版的仿真分支被厂家
# 重构掉了）。wm_backend 的零硬件风险仿真档因此改为在模块属性上做路由：
#
#   simulate → SimulatedPlc 镜像单例（按 url 缓存，进程内共享）
#   real     → 真 GnPlcClient 单例（驱动现场 PLC）
#
# 档位来源是 shim 的**线程局部**档位（station._sync_mode() 每次执行前会把
# 当前线程同步成本实例档位）—— 同一进程会同时存在仿真站与真机站（LIVE
# 快照线程常驻 simulate），进程级全局会被互相冲掉（详见 shim 注释）。
# ---------------------------------------------------------------------------
class _PlcRouter:
    """按档位路由的 GnPlcClient 工厂（patch 进驱动模块属性）。"""

    _real_cls: Optional[type] = None            # install() 时注入的真类
    _sim_lock = threading.RLock()
    _sim_instances: Dict[str, "SimulatedPlc"] = {}
    _preregistered: set = set()                 # 已预登记节点表的 CSV（normpath）

    @classmethod
    def _preregister_nodes(cls, csv_path: Optional[str]) -> Optional[int]:
        """把节点表喂给驱动**自己的**注册代码（不建 OPC 会话）。

        为什么需要：新驱动 `GnPlcClient.__init__` 末尾的 `_connect()` 失败
        会**抛**（厂家把旧版「只记日志」改成了 raise），`get_or_create` 里的
        `load_nodes_from_csv_once` 因此永远走不到 —— 节点表声明必须与连接
        成败解耦，否则「PLC 连不上」会被误诊成「节点表是空的 / 没声明」。

        做法：用 `__new__` 造一个不跑 `__init__` 的裸实例，调基类的
        `register_node_list_from_csv_path`（纯本地 CSV 解析，`self.client`
        为 None 时不会 `_find_nodes`）。`_variables_to_find` / `_node_registry`
        在基类里是**类属性**，登记结果对后续真实例直接可见。

        返回声明的点位数；无法登记返回 None（不 raise —— 让后面建会话的
        步骤去响亮失败，根因更准确）。
        """
        if not csv_path:
            return None
        real = cls._real_cls
        if real is None:
            return None
        norm = os.path.normcase(os.path.normpath(csv_path))
        with cls._sim_lock:
            if norm in cls._preregistered:
                return len(getattr(real, "_variables_to_find", None) or {})
        try:
            bare = real.__new__(real)              # 绕过 __init__（不连硬件）
            bare._name_mapping = {}                # 实例级，别污染类级共享字典
            bare._reverse_mapping = {}
            bare._client_lock = threading.RLock()
            bare.register_node_list_from_csv_path(csv_path)
            n = len(getattr(real, "_variables_to_find", None) or {})
            with cls._sim_lock:
                cls._preregistered.add(norm)
            return n
        except Exception:                          # noqa: BLE001
            return None

    @classmethod
    def get_or_create(cls, url: str, csv_path: Optional[str] = None,
                      **kwargs: Any) -> Any:
        from . import shim
        if shim.get_action_mode() == "real":
            if cls._real_cls is None:
                # 真机档却拿不到真类（驱动未装载/install 未跑）—— 绝不静默
                # 落仿真，那会让「真机运行」变成假成功。
                raise RuntimeError(
                    "真机档需要真 GnPlcClient，但驱动模块未加载或 "
                    "sim_plc.install() 未执行；拒绝退化成仿真。")
            # 先把节点表声明进驱动类级注册表（不连硬件），再建真会话 ——
            # 建会话失败时（端点不可达）探针仍能如实报出「声明了 240 个
            # 待注册点位」，把根因锁定在链路而不是节点表。
            cls._preregister_nodes(csv_path)
            return cls._real_cls.get_or_create(url=url, csv_path=csv_path,
                                               **kwargs)
        with cls._sim_lock:
            inst = cls._sim_instances.get(url)
            if inst is None:
                inst = SimulatedPlc(url=url, csv_path=csv_path)
                cls._sim_instances[url] = inst
            return inst

    # 真机档的类方法面（probe / 诊断可能直接摸类属性）
    @classmethod
    def _simulated(cls) -> bool:
        from . import shim
        return shim.get_action_mode() != "real"


def install(module_names: Optional[Sequence[str]] = None) -> Dict[str, bool]:
    """把驱动里的 PLC 工厂换成按档位路由的 `_PlcRouter`。

    patch 三个点（新旧驱动都覆盖）：
      · `gn_plc_client.GnPlcClient`   —— 根源：后续 import 该名字的模块
        （gn_workstation.py 等）加载时拿到的就是路由器；
      · `gn_station_base.GnPlcClient` —— 已加载模块的名字绑定（shim.install
        会预加载 gn_station_base，import 时绑定的名字已在模块命名空间里）；
      · `gn_station_base._SimulatedPlc` —— 旧驱动的仿真分支仍读这个名字
        （厂家重构前的版本），保持镜像语义。

    必须在驱动**子类**模块加载之前调用（子类 import 时就把名字绑走了），
    但 gn_plc_client / gn_station_base 本身应已由 shim.install() 预加载。
    """
    import sys

    if module_names is None:
        module_names = (
            "unilabos.devices.workstation.GN.gn_plc_client",
            "unilabos.devices.workstation.GN.gn_station_base",
        )
    out: Dict[str, bool] = {}
    real_cls = None
    for name in module_names:
        mod = sys.modules.get(name)
        if mod is None:
            out[name] = False
            continue
        # 第一次见到真类就存下来（之后模块属性已被我们换成路由器）
        if real_cls is None:
            cand = getattr(mod, "GnPlcClient", None)
            if cand is not None and cand is not _PlcRouter:
                real_cls = cand
        mod.GnPlcClient = _PlcRouter
        out[name] = True
    if real_cls is not None:
        _PlcRouter._real_cls = real_cls
    # 旧驱动兼容：simulate 分支读 _SimulatedPlc
    base = sys.modules.get("unilabos.devices.workstation.GN.gn_station_base")
    if base is not None:
        base._SimulatedPlc = SimulatedPlc
        out["_SimulatedPlc"] = True
    return out
