# -*- coding: utf-8 -*-
"""GN 510 工站后端适配器 —— 配置与开关。

设计原则：**改环境变量即可换档，不改代码**。

    GN_OPCUA_URL        OPC UA 端点（整站共享一个会话）
                        默认 opc.tcp://192.168.6.6:4840
    UNILABOS_ROOT       Uni-Lab-OS 仓库根目录（含 unilabos/ 包）。
                        不设则按候选路径自动探测。
    GN_ACTION_MODE      驱动层动作档：simulate | real
                        simulate → 驱动内部用 _SimulatedPlc，OPC 读写空成功，
                        但**节点名推导 / 握手时序 / 等待逻辑全部真跑**。
    GN_ALLOW_REAL       总闸（1/0）。未打开时任何 real 下发都被拒绝，
                        保证「默认不会动硬件」。
    GN_NODE_CSV         覆盖驱动加载的节点表 CSV（默认为本适配器内由 1.4.0
                        「点位表」生成的 node_tables/opcua_gn1.4.0.csv）。
    GN_DEFAULT_TIMEOUT  单节点默认超时（秒），默认 180。
    GN_MAX_TIMEOUT      单节点超时上限（秒），默认 3600。

三档语义（与 workflow_runtime 的 mode 配合）：

    mode=dry                  → DryRunDispatcher：纯计时模拟，零依赖
    mode=real + simulate      → UniLabOSDispatcher + _SimulatedPlc：
                                真适配器 + 真驱动代码路径，零硬件风险（联调挡位）
    mode=real + real          → UniLabOSDispatcher + 真 OPC 会话：驱动 510 硬件
"""
from __future__ import annotations

import os
from typing import List, Optional

DEFAULT_OPCUA_URL = "opc.tcp://192.168.6.6:4840"

# GN 目录相对 root 的位置
_GN_REL = os.path.join("unilabos", "devices", "workstation", "GN")
# 用于判定「这个目录确实是 Uni-Lab-OS 根」
_GN_MARKER = os.path.join(_GN_REL, "gn_station_base.py")


def _env(name: str, default: str = "") -> str:
    v = os.environ.get(name)
    return v.strip() if isinstance(v, str) and v.strip() else default


def _flag(name: str, default: bool = False) -> bool:
    v = os.environ.get(name)
    if v is None or not str(v).strip():
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on", "y", "t")


def opcua_url() -> str:
    """OPC UA 端点。整站共用一个会话（GnPlcClient 按 URL 单例）。"""
    return _env("GN_OPCUA_URL", DEFAULT_OPCUA_URL)


def unilabos_root() -> Optional[str]:
    """定位 Uni-Lab-OS 仓库根（含 unilabos/devices/workstation/GN/gn_station_base.py）。"""
    cands: List[str] = []
    env = _env("UNILABOS_ROOT")
    if env:
        cands.append(env)
    here = os.path.dirname(os.path.abspath(__file__))          # .../wm_backend/app/gn_adapter
    wm_backend = os.path.dirname(os.path.dirname(here))        # .../wm_backend
    parent = os.path.dirname(wm_backend)                       # .../unilabWorld
    cands += [
        os.path.join(parent, "Uni-Lab-OS"),
        os.path.join(os.path.dirname(parent), "Uni-Lab-OS"),
        os.path.expanduser("~/Downloads/Uni-Lab-OS"),
        os.path.expanduser("~/Uni-Lab-OS"),
        "/opt/Uni-Lab-OS",
    ]
    for c in cands:
        if c and os.path.isfile(os.path.join(c, _GN_MARKER)):
            return os.path.abspath(c)
    return None


def repo_gn_dir() -> Optional[str]:
    """仓库根下的 wm_action/：现场维护的驱动就在这里，真机下发必须用这一份。"""
    here = os.path.dirname(os.path.abspath(__file__))          # .../wm_backend/app/gn_adapter
    wm_backend = os.path.dirname(os.path.dirname(here))
    parent = os.path.dirname(wm_backend)
    d = os.path.join(parent, "wm_action")
    marker = os.path.join(d, "gn_station_base.py")
    plc = os.path.join(d, "gn_plc_client.py")
    if os.path.isfile(marker) and os.path.isfile(plc):
        return os.path.abspath(d)
    return None


def gn_dir(root: Optional[str] = None) -> Optional[str]:
    """驱动源码目录。优先仓库 wm_action/，没有时才退回 Uni-Lab-OS 里的副本。"""
    live = repo_gn_dir()
    if live:
        return live
    r = root if root is not None else unilabos_root()
    if not r:
        return None
    d = os.path.join(r, _GN_REL)
    return d if os.path.isdir(d) else None


def preferred_node_csv() -> str:
    """本适配器优先使用的节点表：**由 1.4.0「点位表」生成的那一份**。

    由 `scripts/gen_gn_node_table.py` 产出，放在 wm_backend 自己的目录里，
    **不改上游 Uni-Lab-OS 仓库**。选取理由（一切冲突以 1.4.0 为准）：

      · 仓库自带的 `opcua_gn1.3.9.csv` 与 1.4.0 有 11 处冲突：
        8 个 1.4.0 新点位它没有（驱动根本注册不到），
        3 个 1.4.0 已移除的点位它还在注册。
      · 1.3.9 表里 `OPEN_DOOR` / `COHSE_DOOR` 的数据类型写作小写 `bool`，
        而驱动的 `DataType[...]` 是**大小写敏感的枚举精确匹配**（成员是 `BOOLEAN`），
        于是这两行被整行跳过 —— CSV 235 行、驱动只注册 233 个。
    """
    return os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "node_tables", "opcua_gn1.4.0.csv")


def node_csv_path(root: Optional[str] = None) -> Optional[str]:
    """整站共享的节点表 CSV 的绝对路径。

    优先级：
      1. `GN_NODE_CSV` 环境变量（现场临时换表用）
      2. 本适配器内由 1.4.0 生成的 `node_tables/opcua_gn1.4.0.csv`
      3. 兜底：仓库里的 `opcua_gn1.3.9.csv`

    为什么必须显式给定而不能用驱动默认值：`robotic_arm.py` / `rotary_stack.py`
    的默认值指向 `opcua_gn1.3.6.csv`（**仓库内不存在**），
    否则它们的节点注册表会是空的。
    """
    env = _env("GN_NODE_CSV")
    if env and os.path.isfile(env):
        return os.path.abspath(env)
    live = repo_gn_dir()
    if live:
        gn_csv = os.path.join(live, "opcua_gn1.4.0.csv")
        if os.path.isfile(gn_csv):
            return os.path.abspath(gn_csv)
    p = preferred_node_csv()
    if os.path.isfile(p):
        return p
    d = gn_dir(root)
    if not d:
        return None
    legacy = os.path.join(d, "opcua_gn1.3.9.csv")
    return legacy if os.path.isfile(legacy) else None


def node_csv_manifest() -> Optional[dict]:
    """读取生成节点表时的审计清单（源 md5 / 冲突增删 / dtype 归一记录）。"""
    import json
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "node_tables", "opcua_gn1.4.0.manifest.json")
    if not os.path.isfile(p):
        return None
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:                                           # noqa: BLE001
        return None


def action_mode(explicit: Optional[str] = None) -> str:
    """驱动层动作档：simulate | real。"""
    v = (explicit or _env("GN_ACTION_MODE", "simulate")).strip().lower()
    return "real" if v == "real" else "simulate"


def allow_real() -> bool:
    """总闸：是否允许真实硬件下发。默认关闭。"""
    return _flag("GN_ALLOW_REAL", False)


def default_timeout() -> float:
    try:
        return max(1.0, float(_env("GN_DEFAULT_TIMEOUT", "180")))
    except ValueError:
        return 180.0


def max_timeout() -> float:
    try:
        return max(1.0, float(_env("GN_MAX_TIMEOUT", "3600")))
    except ValueError:
        return 3600.0


def summary() -> dict:
    """当前配置快照（给 /api/gn-adapter/status 用，便于排查）。"""
    root = unilabos_root()
    csv_path = node_csv_path(root)
    pref = preferred_node_csv()
    man = node_csv_manifest() or {}
    return {
        "opcua_url": opcua_url(),
        "unilabos_root": root,
        "gn_dir": gn_dir(root),
        "node_csv": csv_path,
        "node_csv_source": ("env:GN_NODE_CSV" if _env("GN_NODE_CSV")
                            else "wm_action/opcua_gn1.4.0.csv" if csv_path and repo_gn_dir()
                            and os.path.abspath(csv_path) == os.path.abspath(
                                os.path.join(repo_gn_dir() or "", "opcua_gn1.4.0.csv"))
                            else "1.4.0（本适配器生成）" if csv_path == pref
                            else "1.3.9（仓库兜底）" if csv_path else "无"),
        "node_csv_points": man.get("points_total"),
        "node_csv_manifest": man or None,
        "action_mode": action_mode(),
        "allow_real": allow_real(),
        "default_timeout": default_timeout(),
        "max_timeout": max_timeout(),
    }
