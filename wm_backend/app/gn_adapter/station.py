# -*- coding: utf-8 -*-
"""GN 510 工站执行层：驱动实例管理 + 节点执行 + 安全闸。

安全模型（三层，任意一层不开就绝不会动硬件）
--------------------------------------------
1. `GN_ALLOW_REAL` 总闸（默认关）—— 关着时 real 下发直接被拒。
2. 驱动层 `BasicConfig.action_mode`：
     simulate → 驱动内部用 `_SimulatedPlc`，OPC 读写一律空成功，
                但**节点名推导 / 握手时序 / 等待逻辑全部真跑** → 零风险联调挡位；
     real     → 打开真 OPC 会话。
3. 首帧预检（`GN_PREFLIGHT`，默认开）：真机执行前只确认 OPC 会话能建起来。
   不读 `System_IsReady`。该点在这台 PLC 上机械手就位后仍常为 0，
   而且不少工作流根本不用机械臂，不能拿它决定能不能下发。

执行一条节点时的行为：
  · 只调**驱动自己的公开动作方法**，不绕过驱动直接写点位；
  · 参数按驱动真实签名裁剪，被忽略的键写进 `info.warnings`；
  · 结果按驱动返回的 `{"success": ...}` 归一成 `(ok, info)`，**绝不伪造成功**。
"""
from __future__ import annotations

import inspect
import json
import os
import sys
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from . import config as cfg
from . import drivers as drv
from . import shim

_instances: Dict[Tuple[str, str], "GNStation"] = {}
_instances_lock = threading.RLock()


# ----------------------------------------------------------------------
# 工具
# ----------------------------------------------------------------------
def _jsonable(value: Any, depth: int = 0) -> Any:
    """把驱动返回值压成可 JSON 序列化的紧凑结构。"""
    if depth > 4:
        return "<...>"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value if len(value) <= 400 else value[:400] + "…"
    if isinstance(value, dict):
        return {str(k): _jsonable(v, depth + 1) for k, v in list(value.items())[:60]}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v, depth + 1) for v in list(value)[:60]]
    try:
        json.dumps(value)
        return value
    except Exception:                                       # noqa: BLE001
        return repr(value)[:200]


def _normalize_result(result: Any) -> Tuple[bool, Dict[str, Any]]:
    """驱动返回值 → (ok, info)。

    驱动约定：成功返回 `{"success": True, ...}`，失败返回 `{"success": False, "error": ...}`。
    少数方法返回 bool / 其它形状，这里做保守归一（拿不准就按成功，但把原值留在 `result`）。
    """
    if isinstance(result, dict):
        info = {"result": _jsonable(result)}
        if "success" in result:
            return bool(result.get("success")), info
        if "error" in result and result.get("error"):
            return False, info
        return True, info
    if isinstance(result, bool):
        return result, {"result": result}
    return True, {"result": _jsonable(result)}


def _canceled(ctx: Dict[str, Any]) -> bool:
    """取消判定：`ctx["canceled"]` 或 `ctx["cancel_event"]`（由调度器持有的运行级事件）。"""
    if ctx.get("canceled"):
        return True
    ev = ctx.get("cancel_event")
    return bool(ev is not None and ev.is_set())


def _wait_if_running(ctx: Dict[str, Any]) -> bool:
    """下发硬件前若工作流已暂停，就停在本节点；恢复后才继续。返回 False 表示被取消。"""
    ev = ctx.get("pause_event")
    while ev is not None and ev.is_set():
        if _canceled(ctx):
            return False
        time.sleep(0.05)
    return not _canceled(ctx)


def _plc_class():
    mod = sys.modules.get("unilabos.devices.workstation.GN.gn_plc_client")
    if mod is None:
        return None
    return getattr(mod, "GnPlcClient", None)


def _real_plc_class():
    """`_PlcRouter` 背后的真 `GnPlcClient`（install()  patch 前的厂家原类）。

    会话建不起来时（新驱动 `_connect()` 失败会抛），只能从**类级**注册表
    读节点表声明实况 —— `_variables_to_find` / `_node_registry` 在基类里
    是类属性，任何实例（含 `__new__` 出来的裸实例）登记都会落在这里。
    """
    cls = _plc_class()
    if cls is None:
        return None
    return getattr(cls, "_real_cls", None) or cls


def _link_state(plc) -> Dict[str, Any]:
    """从驱动的会话对象读出链路实况（connected 只读探针，不触发业务读写）。

    `connected` 三级判定（按可靠性递减）：
      1. `_connected` 属性（只有 `SimulatedPlc` 定义，`sim_plc.py`）—— 仿真档直接可信；
      2. 驱动自带探针 `_probe_connection()`（读 OPC UA 标准节点 `ns=0;i=2259`，
         `base_opcua_client.py:683`）—— 真机 `GnPlcClient` **没有** `_connected`
         属性，重构后连上硬件也不会置任何标志，只能靠探针问 session 本身；
      3. 都没有 → False（会话对象没建起来 / 驱动未装载）。

    `pending_nodes` 报「未注册数」（声明了但还没在 PLC 里解析到），
    `declared_nodes` 报声明总数 —— 注意 `_find_nodes()` 从不 pop
    `_variables_to_find`，所以「声明总数」不能当「待解析数」用（假信号）。
    """
    if hasattr(plc, "_connected"):
        connected = bool(plc._connected)
    elif isinstance(plc, type):
        # 传进来的是类本身（_real_plc_class()）：没有实例就没有 session，无从探测
        connected = False
    elif callable(getattr(plc, "_probe_connection", None)):
        try:
            connected = bool(plc._probe_connection())
        except Exception:                                   # noqa: BLE001
            connected = False
    else:
        connected = False
    declared = len(getattr(plc, "_variables_to_find", None) or {})
    registered = len(getattr(plc, "_node_registry", None) or {})
    return {
        "connected": connected,
        "registered_nodes": registered,
        "declared_nodes": declared,
        "pending_nodes": max(0, declared - registered),
    }


# ----------------------------------------------------------------------
# 工站
# ----------------------------------------------------------------------
class GNStation:
    """一个 GN 510 工站的执行上下文（按 url + action_mode 缓存）。"""

    def __init__(self, url: Optional[str] = None, action_mode: Optional[str] = None,
                 allow_real: Optional[bool] = None, preflight: Optional[bool] = None,
                 verbose: bool = False):
        self.url = url or cfg.opcua_url()
        self.action_mode = cfg.action_mode(action_mode)
        self.allow_real = cfg.allow_real() if allow_real is None else bool(allow_real)
        self.preflight = preflight
        self.verbose = verbose
        self.catalog = drv.load()
        self.node_csv = cfg.node_csv_path(self.catalog.root)
        self._drivers: Dict[str, Any] = {}
        self._driver_lock = threading.RLock()
        # 预检结果按「运行」缓存而不是按进程：同一进程可能连着跑多次工作流，
        # 每次开始都该重新确认整站就绪（机械手可能中途掉电/报错）。
        self._preflight_run: Optional[str] = None
        self._opened_at: Dict[str, float] = {}
        shim.set_action_mode(self.action_mode)

    # ---------------- 生命周期 ----------------
    @property
    def simulated(self) -> bool:
        """驱动层是否处于「真代码路径 + 空 OPC」档。

        只看本实例的档位，不看全局 —— 同一进程可能同时存在仿真站与真机站。
        """
        return self.action_mode != "real"

    def _sync_mode(self) -> None:
        """把驱动侧档位开关同步成本实例档位（**线程局部**）。

        `_PlcRouter` 按 `shim.get_action_mode()` 路由 simulate/real，而同一
        进程会同时存在不同档位的工站（LIVE 快照线程常驻 simulate，某个请求
        要 real 探针）。所以每次进执行路径前都要按**本实例**的档位重申一次
        —— 线程局部保证这次重申只影响当前线程，不会把别的线程冲掉。
        """
        shim.set_action_mode(self.action_mode)

    def _preflight_enabled(self) -> bool:
        if self.preflight is not None:
            return bool(self.preflight)
        raw = (os.environ.get("GN_PREFLIGHT") or "").strip().lower()
        if raw in ("0", "false", "no", "off"):
            return False
        return True

    def _plc(self):
        """取（或建立）整站共享的 OPC UA 会话。"""
        cls = _plc_class()
        if cls is None:
            raise RuntimeError("GnPlcClient 不可用（驱动未装载或 opcua 缺失）")
        return cls.get_or_create(url=self.url, csv_path=self.node_csv,
                                 use_subscription=False)

    def _unreachable(self, ls: Dict[str, Any]) -> Dict[str, Any]:
        """链路级失败的可操作报错（区分「连不上」与「节点表不对」）。"""
        return {
            "error": "无法连接到 510 工站：OPC UA 端点 %s 不可达。"
                     "请依次确认：① 本机与 PLC 在同一网段（默认 192.168.6.x）；"
                     "② PLC 已上电、OPC UA Server 已启动（4840 端口可通）；"
                     "③ 端点不对时用 GN_OPCUA_URL 或 opcua_url 指定。"
                     % self.url,
            "link": "unreachable",
            "hint": {"opcua_url": self.url, "connected": False,
                     "registered_nodes": ls.get("registered_nodes", 0)},
        }

    def open(self, device_id: str):
        """实例化（或复用）某设备的驱动。仿真档下不会打开 OPC 会话。"""
        self._sync_mode()
        with self._driver_lock:
            if device_id in self._drivers:
                return self._drivers[device_id]

            spec = drv.device_spec(device_id)
            if spec is None:
                if device_id in drv.UNSUPPORTED:
                    raise RuntimeError(drv.UNSUPPORTED[device_id])
                raise RuntimeError("未知设备 %s" % device_id)
            # PRCXI 走独立 DMTP 通道（不是 GNStationClient 子类，不碰 OPC 会话），
            # 由 prcxi 适配器自己实例化与执行。
            if spec.get("channel") == "dmtp":
                from . import prcxi_adapter
                inst = prcxi_adapter.open_device(self, device_id, spec)
                self._drivers[device_id] = inst
                self._opened_at[device_id] = time.time()
                return inst
            cls = self.catalog.get(device_id)
            if cls is None:
                raise RuntimeError("设备 %s 装载失败：%s"
                                   % (device_id, self.catalog.errors.get(device_id, "未知原因")))

            # 真机档：先把整站会话 + 1.3.9 节点表建好（子设备后续命中同一单例）
            if not self.simulated:
                self._plc()

            kwargs: Dict[str, Any] = {"url": self.url, "use_subscription": False}
            if self.node_csv:
                kwargs[spec.get("csv_kw") or "csv_path"] = self.node_csv
            try:
                inst = cls(**kwargs)
            except Exception as exc:                        # noqa: BLE001
                raise RuntimeError("实例化 %s 失败：%s: %s"
                                   % (spec["cls"], type(exc).__name__, exc)) from exc
            self._drivers[device_id] = inst
            self._opened_at[device_id] = time.time()
            return inst

    def close(self) -> None:
        """释放所有驱动的 plc 引用（引用计数归零才真断）。"""
        with self._driver_lock:
            for dev_id, inst in list(self._drivers.items()):
                try:
                    inst.disconnect()
                except Exception:                           # noqa: BLE001
                    pass
                self._drivers.pop(dev_id, None)
        self._preflight_run = None

    def cancel(self, job_id: str = "") -> None:
        """已废弃：取消语义由上层 `UniLabOSDispatcher` 持有的事件表达。

        保留空实现只为兼容旧调用点；真正的取消通过 `run_node(node, ctx)` 的
        `ctx["canceled"]` / `ctx["cancel_event"]` 传入（**不会跨运行泄漏**）。
        """
        return None

    # ---------------- 预检 ----------------
    def _preflight_check(self, run_id: str = "") -> Tuple[bool, Dict[str, Any]]:
        """真机首帧只确认 OPC 会话能建起来。不读 `System_IsReady`。

        同一 `run_id` 内只做一次。会话建不起来才拒绝；机械手就位点不参与判断，
        不用机械臂的工作流也能下发。
        """
        if self.simulated or not self._preflight_enabled():
            return True, {}
        if run_id and run_id == self._preflight_run:
            return True, {}
        try:
            self._plc()
        except Exception as exc:                            # noqa: BLE001
            # 新驱动 `GnPlcClient.__init__` 的 `_connect()` 失败会抛（厂家把
            # 旧版「只记日志」改成了 raise）—— 按链路不可达诊断，别让现场把
            # 「PLC 连不上」误判成节点表写错。
            ls = _link_state(_real_plc_class())
            return False, dict(self._unreachable(ls), **ls,
                               error="真机预检失败：无法建立 OPC UA 会话"
                                     "（%s: %s）。%s"
                                     % (type(exc).__name__, exc,
                                        self._unreachable(ls)["error"]))
        self._preflight_run = run_id or ""
        return True, {}

    # ---------------- 执行 ----------------
    def run_node(self, node: Dict[str, Any],
                 ctx: Optional[Dict[str, Any]] = None) -> Tuple[bool, Dict[str, Any]]:
        """执行一个工作流节点 → (ok, info)。"""
        ctx = ctx or {}
        t0 = time.time()
        self._sync_mode()
        device_id = str(node.get("device_name") or node.get("resource_name") or "").strip()

        # PRCXI 走独立 DMTP 通道（不是 OPC UA 设备，不进本类的驱动路径）
        spec = drv.device_spec(device_id)
        if spec is not None and spec.get("channel") == "dmtp":
            from . import prcxi_adapter
            return prcxi_adapter.run_prcxi_node(self, node, ctx)

        base = {
            "dispatcher": "gn-510",
            "device": device_id,
            "opcua_url": self.url,
            "driver_mode": self.action_mode,
            "hardware": not self.simulated,
        }

        if not _wait_if_running(ctx):
            return False, dict(base, error="canceled")

        # 1) 解析
        try:
            call = drv.resolve_call(device_id, node, self.catalog)
        except drv.GNCallError as exc:
            return False, dict(base, error=str(exc), phase="resolve")

        # 2) 真机总闸 —— 放在预检之前：闸门关着就零成本拒绝，连只读连接都不建
        if not self.simulated and not self.allow_real:
            return False, dict(
                base, phase="gate",
                error="真实硬件下发被拒绝：未打开总闸。"
                      "需设置 GN_ALLOW_REAL=1，或在启动运行时显式传 allow_real=true。")

        # 3) 真机首帧预检：只确认 OPC 会话，不看机械手就位点
        ok_pf, pf = self._preflight_check(str(ctx.get("run_id") or ""))
        if not ok_pf:
            return False, dict(base, phase="preflight", **pf)

        # 4) 取驱动
        try:
            driver = self.open(device_id)
        except Exception as exc:                            # noqa: BLE001
            return False, dict(base, phase="open", error=str(exc))

        # 5) 真机必须是 GN/ 里的真实会话。仿真替身会空写成功，设备却不动。
        if not self.simulated:
            plc = getattr(driver, "plc", None)
            if plc is not None and type(plc).__name__ == "SimulatedPlc":
                return False, dict(
                    base, phase="call",
                    error="真机档拿到的是仿真 PLC，已拒绝下发。设备不会空跑报成功。")
            if device_id in drv.DEVICE_SPECS:
                src = os.path.abspath(inspect.getfile(type(driver)))
                gn_root = os.path.abspath(cfg.repo_gn_dir() or "")
                if gn_root and not src.startswith(gn_root + os.sep):
                    return False, dict(
                        base, phase="call",
                        error="真机档没有用 GN 目录里的驱动（当前是 %s），已拒绝下发。" % src)

        # 6) 执行
        warnings: List[str] = list(call.get("warnings") or [])
        if not _wait_if_running(ctx):
            return False, dict(base, error="canceled", phase="pause")
        try:
            if call.get("special") == "error_alarm":
                ok, info = self._device_error_alarm(driver)
            else:
                method_name = call["method"]
                fn = getattr(driver, method_name, None)
                if not callable(fn):
                    return False, dict(base, phase="call",
                                       error="驱动 %s 上没有可调用动作 %s"
                                             % (device_id, method_name))
                kwargs = dict(call["kwargs"])
                kwargs, tw = _apply_timeout(fn, kwargs)
                warnings += tw
                result = fn(**kwargs)
                ok, info = _normalize_result(result)
            info = dict(info)
        except Exception as exc:                            # noqa: BLE001
            return False, dict(base, phase="call",
                               error="%s: %s" % (type(exc).__name__, exc),
                               warnings=warnings)

        info.update(base)
        info["action"] = call.get("special") or call.get("method")
        info["cmd_type"] = call.get("cmd_type")
        info["seconds"] = round(time.time() - t0, 3)
        if warnings:
            info["warnings"] = warnings
        if _canceled(ctx):
            # 已交给 PLC 的运动指令不中途打断（对运动设备而言这更安全），但如实标注
            info["canceled_after_start"] = True
        # LIVE 轨迹：仿真档动作完成后记一条事件（供 /live/trace 与待机缓动计时）。
        # try/except 包死 —— live 绝不影响执行主流程。
        try:
            if self.simulated:
                from . import live as gn_live
                gn_live.log_event(device_id, "action",
                                  action=info.get("action"),
                                  ok=bool(ok), seconds=info.get("seconds"))
        except Exception:                                   # noqa: BLE001
            pass
        return ok, info

    def _device_error_alarm(self, driver) -> Tuple[bool, Dict[str, Any]]:
        """`system.error_alarm` → 写 Device_error（设备报错：蜂鸣器 + 红灯）。"""
        plc = getattr(driver, "plc", None) or self._plc()
        if not plc.write_with_retry("Device_error", 1):
            return False, {"error": "Device_error 写入失败"}
        msg = "设备报错已触发（蜂鸣器 + 红灯）"
        return True, {"message": msg, "result": {"success": True, "message": msg}}

    # ---------------- 诊断 ----------------
    def probe(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """只读探针：验证链路是否通、整站是否就绪。不驱动任何机构。

        PRCXI（DMTP 通道）**不走 OPC**：指定 device_id=PRCXI 时直接做 DMTP 探针，
        不先建 OPC 会话（否则现场会看到「OPC 连不上」的误导性报错）。
        """
        self._sync_mode()
        out: Dict[str, Any] = {
            "ok": False,
            "opcua_url": self.url,
            "driver_mode": self.action_mode,
            "simulated": self.simulated,
            "node_csv": self.node_csv,
            "unilabos_root": self.catalog.root,
        }
        # DMTP 设备：早期分流，完全不碰 OPC
        if device_id:
            spec = drv.device_spec(device_id)
            if spec is not None and spec.get("channel") == "dmtp":
                try:
                    driver = self.open(device_id)
                    pr = driver.probe()
                    # 顶层 channel 透传探明的实际协议通道（legacy/dmtp）；
                    # 探针没给（异常路径）时退回设备声明的通道类型。
                    out["channel"] = (pr.get("channel")
                                      if isinstance(pr, dict) else None) or "dmtp"
                    out["device_status"] = _jsonable(pr)
                    out["ok"] = bool(pr.get("ok"))
                except Exception as exc:                        # noqa: BLE001
                    out["device_status_error"] = "%s: %s" % (type(exc).__name__, exc)
                return out
        if self.simulated:
            out.update(ok=True, connected=False,
                       note="当前为仿真档（GN_ACTION_MODE=simulate）：OPC 读写空成功，未连硬件。")
            # 仿真档也能回报设备读数（镜像模型里的温度 / 完成位等），给总览用
            if device_id:
                try:
                    driver = self.open(device_id)
                    if hasattr(driver, "get_status"):
                        out["device_status"] = _jsonable(driver.get_status())
                except Exception as exc:                        # noqa: BLE001
                    out["device_status_error"] = "%s: %s" % (type(exc).__name__, exc)
            return out
        try:
            plc = self._plc()
        except Exception as exc:                            # noqa: BLE001
            # 新驱动 `GnPlcClient.__init__` 末尾的 `_connect()` 失败会**抛**
            # （厂家把旧版「只记日志」改成了 raise）—— 会话建不起来 ≠ 节点表
            # 没问题。这里明确诊断为「链路不可达」，并把驱动类级注册表里
            # 已声明的点位数如实报出来，避免调用方把网络故障误判成节点表错。
            ls = _link_state(_real_plc_class())
            out.update(ls)
            out.update(self._unreachable(ls))
            out["error"] = "无法建立 OPC UA 会话：%s: %s。%s" % (
                type(exc).__name__, exc, out.get("error") or "")
            return out
        out.update(_link_state(plc))
        try:
            ready_val = plc.read_with_retry("System_IsReady", force_read=True)
        except Exception as exc:                            # noqa: BLE001
            if not out.get("connected"):
                out.update(self._unreachable(out))
                return out
            ready_val = None
            out["system_ready_note"] = "读不到 System_IsReady（%s）" % type(exc).__name__
        if ready_val is None:
            out["system_ready"] = None
            out.setdefault("system_ready_note", "当前 PLC 读不到 System_IsReady")
        else:
            try:
                out["system_ready"] = int(ready_val) != 0
            except (TypeError, ValueError):
                out["system_ready"] = bool(ready_val)
        out["ok"] = True

        if device_id:
            try:
                driver = self.open(device_id)
                if hasattr(driver, "get_status"):
                    out["device_status"] = _jsonable(driver.get_status())
                elif hasattr(driver, "get_plc_stats"):
                    out["device_status"] = _jsonable(driver.get_plc_stats())
                else:
                    out["device_status"] = "该驱动没有 get_status/get_plc_stats 只读接口"
            except Exception as exc:                        # noqa: BLE001
                out["device_status_error"] = "%s: %s" % (type(exc).__name__, exc)
        return out

    def status(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """适配器整体状态（不连硬件即可回答）。"""
        st = {
            "config": cfg.summary(),
            "driver_mode": self.action_mode,
            "allow_real": self.allow_real,
            "preflight": self._preflight_enabled(),
            "opened_devices": sorted(self._drivers),
            "catalog": self.catalog.status(),
        }
        if device_id:
            try:
                st["actions"] = drv.load().actions(device_id)
            except Exception as exc:                        # noqa: BLE001
                st["actions_error"] = str(exc)
        return st


def _apply_timeout(fn, kwargs: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """节点没给 timeout 时补默认值；给了就夹到 [1, GN_MAX_TIMEOUT]。"""
    import inspect

    try:
        sig = inspect.signature(fn)
    except (TypeError, ValueError):
        return kwargs, []
    if "timeout" not in sig.parameters:
        kwargs.pop("timeout", None)
        return kwargs, []
    warns: List[str] = []
    lo, hi = 1.0, cfg.max_timeout()
    raw = kwargs.get("timeout")
    if raw is None:
        kwargs["timeout"] = cfg.default_timeout()
        return kwargs, warns
    try:
        val = float(raw)
    except (TypeError, ValueError):
        kwargs["timeout"] = cfg.default_timeout()
        warns.append("timeout=%r 不是数字，已用默认 %.0fs" % (raw, kwargs["timeout"]))
        return kwargs, warns
    clamped = max(lo, min(hi, val))
    if clamped != val:
        warns.append("timeout %.1fs 越界，夹到 %.1fs" % (val, clamped))
    kwargs["timeout"] = clamped
    return kwargs, warns


# ----------------------------------------------------------------------
# 全局入口
# ----------------------------------------------------------------------
def get_station(url: Optional[str] = None, action_mode: Optional[str] = None,
                allow_real: Optional[bool] = None, force_new: bool = False) -> GNStation:
    """按 (url, 驱动档, 总闸) 缓存工站实例 —— 保证整站共享一个 OPC 会话。

    `allow_real` 必须进缓存键：它是安全相关的实例状态。若和档位一起被复用，
    先建出来的实例会把总闸状态带偏 —— 轻则「已授权真机运行却被误拒」，
    重则「调用方以为闸是关的，实例却仍处于放行态」（fail-open）。
    宁可多一个实例，也绝不共用错闸。
    """
    eff_real = cfg.allow_real() if allow_real is None else bool(allow_real)
    key = (url or cfg.opcua_url(), cfg.action_mode(action_mode), eff_real)
    with _instances_lock:
        if force_new:
            old = _instances.pop(key, None)
            if old is not None:
                old.close()
        inst = _instances.get(key)
        if inst is None:
            inst = GNStation(url=url, action_mode=action_mode, allow_real=allow_real)
            _instances[key] = inst
        # 缓存命中也要按本次请求的档位刷新**当前线程**的档位：线程池会复用
        # 线程，上个请求残留的档位可能不是这一个（thread-local 的坑）。
        inst._sync_mode()
        return inst


def shutdown() -> None:
    """进程退出时释放全部会话。"""
    with _instances_lock:
        for inst in _instances.values():
            try:
                inst.close()
            except Exception:                               # noqa: BLE001
                pass
        _instances.clear()
