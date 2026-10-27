# -*- coding: utf-8 -*-
"""GN 510 工站后端适配器。

把 `Uni-Lab-OS/unilabos/devices/workstation/GN/` 下的**真驱动**接成 wm_backend 的
执行后端，使工作流编辑器 / 调度器下发的节点能真正操作 510 工站硬件。

    from app.gn_adapter import get_station
    st = get_station()                     # 默认仿真档，零硬件风险
    st.probe()                             # 只读探针
    st.run_node(node, ctx)                 # (ok, info)

目录结构
--------
    config.py   环境开关（OPC UA 地址 / Uni-Lab-OS 根 / 动作档 / 总闸）
    shim.py     把驱动需要的 `unilabos.*` 薄依赖装进 sys.modules
    drivers.py  装载 GN 驱动类 + 建立 device_id / 动作索引 + 节点→调用映射
    station.py  驱动实例管理 + 节点执行 + 安全闸（预检 / 总闸 / 结果归一）
"""
from __future__ import annotations

from .drivers import DEVICE_SPECS, UNSUPPORTED, DriverCatalog, GNCallError, load, resolve_call
from .station import GNStation, get_station, shutdown

__all__ = [
    "DEVICE_SPECS",
    "UNSUPPORTED",
    "DriverCatalog",
    "GNCallError",
    "load",
    "resolve_call",
    "GNStation",
    "get_station",
    "shutdown",
]
