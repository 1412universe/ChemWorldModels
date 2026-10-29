# -*- coding: utf-8 -*-
"""GN 510 液冷模块驱动（`gn_liquid_cooling`，1.4.0 点位表「七个液冷模块」）。

为什么放在 wm_backend 而不是上游仓库
------------------------------------
上游 `CWM-Lab/unilabos/devices/workstation/GN/` 没有液冷驱动文件；
但 1.4.0 点位表里它是一个**完整、正规的 PLC 模块**（17 个点位，全 INT16）：

    指令握手（与锁紧/烘箱完全同构）
        Cooling_CmdType        指令类型（1 温度设置 / 2 开启 / 3 关闭）
        Cooling_CmdTrig        指令触发
        Liquid_Cooling_Complete_FB   动作完成反馈

    温度设置 / 反馈（7 个子模块：9320 的 2 个 + 离心管液体处理的 5 个）
        Liquid_Cooling_9320_Temperature_{1,2}_SET / Liquid_Cooling_9320_{1,2}_FB
        Liquid_Cooling_CentrifugeTube_Temperature_{1..5}_SET
        Liquid_Cooling_CentrifugeTube_{1..5}_FB

所以它不需要任何上游文件 —— 直接继承 shim 里的 `GNStationClient`，
用基类的 `run_command()` 握手原语（写参 → CmdType → CmdTrig → 等 CompleteFB → 清零）即可。

模块归属（总览-510 上不单独立卡，读数并入所属设备卡）
    Liquid_Cooling_9320_*                → PRCXI 9320 移液工作站
    Liquid_Cooling_CentrifugeTube_*      → 离心管液体处理

温度约束：用户确认单位 ℃、合理范围 **4–28 °C**（超界响亮拒绝）。
"""
from __future__ import annotations

from typing import Dict, List, Optional

from unilabos.utils.log import logger
from unilabos.registry.decorators import action, not_action
from unilabos.devices.workstation.GN.gn_station_base import GNStationClient

# ---------------------------------------------------------------------------
# 协议常量（一切以 OPC_UA协议1.4.0 为准）
# ---------------------------------------------------------------------------
PREFIX = "Cooling_"
CMD_TYPE_NODE = "Cooling_CmdType"
CMD_TRIG_NODE = "Cooling_CmdTrig"
COMPLETE_NODE = "Liquid_Cooling_Complete_FB"

# Cooling_CmdType（1.4.0「指令表」：gn_liquid_cooling 组）
CMD_TEMP_SET = 1     # 温度设置
CMD_MODULE_ON = 2    # 液冷模块开启
CMD_MODULE_OFF = 3   # 液冷模块关闭

CMD_LABELS = {CMD_TEMP_SET: "温度设置", CMD_MODULE_ON: "液冷模块开启", CMD_MODULE_OFF: "液冷模块关闭"}

# 子模块 → (温度 SET 节点, 温度 FB 节点)。1.4.0 点位表逐一核对过。
# 1–2 号属于 PRCXI 9320；3–7 号属于离心管液体处理。
MODULES: Dict[int, Dict[str, str]] = {
    1: {"set": "Liquid_Cooling_9320_Temperature_1_SET", "fb": "Liquid_Cooling_9320_1_FB"},
    2: {"set": "Liquid_Cooling_9320_Temperature_2_SET", "fb": "Liquid_Cooling_9320_2_FB"},
    3: {"set": "Liquid_Cooling_CentrifugeTube_Temperature_1_SET", "fb": "Liquid_Cooling_CentrifugeTube_1_FB"},
    4: {"set": "Liquid_Cooling_CentrifugeTube_Temperature_2_SET", "fb": "Liquid_Cooling_CentrifugeTube_2_FB"},
    5: {"set": "Liquid_Cooling_CentrifugeTube_Temperature_3_SET", "fb": "Liquid_Cooling_CentrifugeTube_3_FB"},
    6: {"set": "Liquid_Cooling_CentrifugeTube_Temperature_4_SET", "fb": "Liquid_Cooling_CentrifugeTube_4_FB"},
    7: {"set": "Liquid_Cooling_CentrifugeTube_Temperature_5_SET", "fb": "Liquid_Cooling_CentrifugeTube_5_FB"},
}

# 1.4.0 指令表里「温度设置」只有一个 SET 位可写 —— 它对应**全部 7 个子模块一起设**，
# 还是只对某个编号？点位表没有给出编号选择位，说明是**组播**（一次写、7 模块同设）。
# 这里按组播实现：把目标温度写到全部 SET 位（保持各模块一致），现场如只认某一位，
# 再按实际行为收窄（收紧比放大安全）。
TEMP_MIN, TEMP_MAX = 4.0, 28.0
DEFAULT_TIMEOUT = 60.0

_EXECUTE_CMD_DOC = (
    "按 Cooling_CmdType 执行（opcua_gn1.4.0「七个液冷模块」）。"
    "1=温度设置：写全部 Liquid_Cooling_*_Temperature_*_SET←temperature(℃, 4–28)，"
    "再触发 Cooling_CmdTrig；2=液冷模块开启；3=液冷模块关闭。"
    "wait=True 时等 Liquid_Cooling_Complete_FB。"
)


class LiquidCoolingDevice(GNStationClient):
    """液冷模块驱动（OPC 前缀 Cooling_，共享 GN 工站单例 OPC UA 会话）。"""

    PREFIX = PREFIX
    CMD_TYPE_NODE = CMD_TYPE_NODE
    CMD_TRIG_NODE = CMD_TRIG_NODE
    COMPLETE_NODE = COMPLETE_NODE

    def __init__(self, url=None, csv_path=None, *args, **kwargs):
        super().__init__(url=url, csv_path=csv_path, *args, **kwargs)

    # ---------------------------------------------------------------- 动作
    @action(auto_prefix=True, description=_EXECUTE_CMD_DOC)
    def execute_command(
        self,
        cmd_type: int,
        temperature: Optional[float] = None,
        wait: bool = True,
        timeout: Optional[float] = None,
    ) -> dict:
        """液冷指令：1=温度设置(需 temperature) 2=开启 3=关闭。"""
        cmd = int(cmd_type)
        if cmd not in CMD_LABELS:
            raise ValueError(
                "液冷 Cooling_CmdType 仅支持 %s（1 温度设置 / 2 开启 / 3 关闭），收到 %r"
                % (sorted(CMD_LABELS), cmd_type))
        label = CMD_LABELS[cmd]

        setpoints: Dict[str, float] = {}
        if cmd == CMD_TEMP_SET:
            setpoints = self._temp_setpoints(temperature)
        elif temperature is not None:
            # 2/3 不需要温度，带了就提示（不静默吞）
            logger.warning("液冷 %s 不需要 temperature 参数，已忽略（%s℃）" % (label, temperature))

        to = float(timeout) if timeout is not None else DEFAULT_TIMEOUT
        return self.run_command(
            cmd_type=cmd,
            setpoints=setpoints,
            description="液冷·%s" % label,
            timeout=to,
        )

    # ---------------------------------------------------------------- 只读
    @not_action
    def get_temperature(self, module: int = 1) -> float:
        """读某子模块温度反馈（module 1–7）。"""
        m = self._module(module)
        return float(self._opc_read(m["fb"], force_read=True) or 0)

    @not_action
    def get_all_temperatures(self) -> Dict[str, float]:
        """读全部 7 个子模块温度反馈。"""
        out: Dict[str, float] = {}
        for no, m in MODULES.items():
            out["module_%d" % no] = float(self._opc_read(m["fb"], force_read=True) or 0)
        return out

    @not_action
    def get_status(self) -> dict:
        temps = self.get_all_temperatures()
        return {
            "temperatures": temps,
            "complete": int(self._opc_read(self.COMPLETE_NODE, force_read=True) or 0),
            "cmd_type": int(self._opc_read(self.CMD_TYPE_NODE, force_read=True) or 0),
        }

    # ---------------------------------------------------------------- 内部
    @not_action
    def _module(self, module: int) -> Dict[str, str]:
        try:
            return MODULES[int(module)]
        except (KeyError, TypeError, ValueError):
            raise ValueError(
                "液冷模块编号必须是 1–7（1–2 属于 9320 移液站，3–7 属于离心管液体处理），"
                "收到 %r" % (module,))

    @not_action
    def _temp_setpoints(self, temperature: Optional[float]) -> Dict[str, float]:
        if temperature is None:
            raise ValueError("液冷温度设置(CmdType=1) 需指定 temperature（℃）")
        t = float(temperature)
        if not (TEMP_MIN <= t <= TEMP_MAX):
            raise ValueError(
                "液冷温度超出合理范围：%.1f℃（允许 %.0f–%.0f℃）" % (t, TEMP_MIN, TEMP_MAX))
        return {m["set"]: t for m in MODULES.values()}

    @not_action
    def module_names(self) -> List[str]:
        """子模块清单（给 /api/gn-adapter/status 与总览读数用）。"""
        return ["module_%d" % no for no in sorted(MODULES)]
