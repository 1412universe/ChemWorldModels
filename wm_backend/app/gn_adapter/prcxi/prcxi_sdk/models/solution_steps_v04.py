"""V04 方案步骤 RPC 参数模型，对齐 C# SolutionStepBase_V04 子类。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol, Union


class SolutionStepV04(Protocol):
    def to_rpc_dict(self) -> Dict[str, Any]:
        ...


@dataclass
class LiquidStepV04:
    display_name: str
    position: str
    row: str = "1"
    col: str = "1"
    axis_type: str = "Axis1"
    tips: str = "Tips1"
    well_type: str = "Well_96"
    x_offset: float = 0.0
    y_offset: float = 0.0
    z_offset: float = 0.0
    z_start_point_offset_height: int = 0
    x_speed: int = 0
    y_speed: int = 0
    z_speed: int = 0
    z_complete_z_lift_speed: int = 0
    comment: Optional[str] = None
    is_enabled: bool = True

    def _liquid_rpc_dict(self, kind: str) -> Dict[str, Any]:
        return {
            "Kind": kind,
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Position": self.position,
            "Row": self.row,
            "Col": self.col,
            "AxisType": self.axis_type,
            "Tips": self.tips,
            "WellType": self.well_type,
            "XOffset": self.x_offset,
            "YOffset": self.y_offset,
            "ZOffset": self.z_offset,
            "ZStartPointOffsetHeight": self.z_start_point_offset_height,
            "XSpeed": self.x_speed,
            "YSpeed": self.y_speed,
            "ZSpeed": self.z_speed,
            "ZCompleteZLiftSpeed": self.z_complete_z_lift_speed,
        }


@dataclass
class LoadTipsStepV04(LiquidStepV04):
    display_name: str = "T1"
    position: str = "1"
    z_load_speed: int = 0
    post_load_position: str = "None"

    def to_rpc_dict(self) -> Dict[str, Any]:
        payload = self._liquid_rpc_dict("LoadTips")
        payload.update(
            {
                "ZLoadSpeed": self.z_load_speed,
                "PostLoadPosition": self.post_load_position,
            }
        )
        return payload


@dataclass
class AspirateStepV04(LiquidStepV04):
    display_name: str = "T2"
    position: str = "2"
    liquid_type: Optional[str] = None
    liquid_level_height: Optional[str] = "0"
    aspirate_volume: str = "10"
    reverse_imbibing: float = 0.0
    post_air_volume: float = 0.0
    moistening_number: int = 0
    blowing_volume: float = 0.0
    suction_method: str = "None"
    hover: int = 0
    hover_below_liquid_level: int = 0
    z_level_follow_speed: int = 0
    suction_speed: int = 0
    suction_to_post_suction_speed: int = 0
    suction_to_post_suction_duration: int = 0
    only_adp_mode: bool = False
    only_adp: str = "None"
    suction_complete_z_position: str = "None"
    emptying_relative_liquid_level_height: int = 0

    def to_rpc_dict(self) -> Dict[str, Any]:
        payload = self._liquid_rpc_dict("Aspirate")
        payload.update(
            {
                "LiquidType": self.liquid_type,
                "LiquidLevelHeight": self.liquid_level_height,
                "AspirateVolume": self.aspirate_volume,
                "ReverseImbibing": self.reverse_imbibing,
                "PostAirVolume": self.post_air_volume,
                "MoisteningNumber": self.moistening_number,
                "BlowingVolume": self.blowing_volume,
                "SuctionMethod": self.suction_method,
                "Hover": self.hover,
                "HoverBelowLiquidLevel": self.hover_below_liquid_level,
                "ZLevelFollowSpeed": self.z_level_follow_speed,
                "SuctionSpeed": self.suction_speed,
                "SuctionToPostSuctionSpeed": self.suction_to_post_suction_speed,
                "SuctionToPostSuctionDuration": self.suction_to_post_suction_duration,
                "OnlyAdpMode": self.only_adp_mode,
                "OnlyAdp": self.only_adp,
                "SuctionCompleteZPosition": self.suction_complete_z_position,
                "EmptyingRelativeLiquidLevelHeight": self.emptying_relative_liquid_level_height,
            }
        )
        return payload


@dataclass
class DispenseStepV04(LiquidStepV04):
    display_name: str = "T3"
    position: str = "3"
    liquid_type: Optional[str] = None
    dispense_volume: str = "10"
    post_discharge_pause_time_ms: int = 0
    hover_below_liquid_level: int = 0
    blow_volume: float = 0.0
    reverse_imbibing: float = 0.0
    air_suck_volume: float = 0.0
    dispensing_method: str = "DiveToBottom"
    dispense_speed: int = 0
    mixing_times: int = 0
    mixing_speed: int = 0
    mixing_hover_below_liquid_level: int = 0
    dispensing_complete_z_position: str = "None"
    dispensing_air_suck_position: str = "None"
    dispensing_direction: str = "X"

    def to_rpc_dict(self) -> Dict[str, Any]:
        payload = self._liquid_rpc_dict("Dispense")
        payload.update(
            {
                "LiquidType": self.liquid_type,
                "DispenseVolume": self.dispense_volume,
                "PostDischargePauseTimeMs": self.post_discharge_pause_time_ms,
                "HoverBelowLiquidLevel": self.hover_below_liquid_level,
                "BlowVolume": self.blow_volume,
                "ReverseImbibing": self.reverse_imbibing,
                "AirSuckVolume": self.air_suck_volume,
                "DispensingMethod": self.dispensing_method,
                "DispenseSpeed": self.dispense_speed,
                "MixingTimes": self.mixing_times,
                "MixingSpeed": self.mixing_speed,
                "MixingHoverBelowLiquidLevel": self.mixing_hover_below_liquid_level,
                "DispensingCompleteZPosition": self.dispensing_complete_z_position,
                "DispensingAirSuckPosition": self.dispensing_air_suck_position,
                "DispensingDirection": self.dispensing_direction,
            }
        )
        return payload


@dataclass
class MixStepV04(LiquidStepV04):
    display_name: str = "T4"
    position: str = "4"
    liquid_type: Optional[str] = None
    mix_loop_volume: float = 10
    mix_loop_counts: int = 10
    blow_sample_volume: float = 0.0
    suction_speed: int = 0
    dispense_speed: int = 0
    post_air_volume: Optional[str] = "0"
    bottom_offset_of_z: Optional[str] = None
    mix_loop_aspirate_rate: Optional[str] = None
    mix_offset_of_z_in_loop: Optional[str] = None
    mix_loop_dispense_rate: Optional[str] = None
    mix_offset_of_z_after_loop: Optional[str] = None
    mix_after_aspirate: Optional[str] = "0"
    dispense_rate_after_submix_loop: Optional[str] = None
    pre_air_volume: Optional[str] = None
    sub_mix_loop_completed_dely: Optional[str] = None
    if_tip_touch: bool = False
    tip_touch_height: Optional[str] = None
    tip_touch_offset_of_x: Optional[str] = None
    second_route_rate: Optional[str] = None
    mix_loop_aspirate_dely: Optional[str] = None
    mix_loop_dispense_dely: Optional[str] = None
    dely_after_submix_loop_completed: Optional[str] = None
    post_load_position: str = "None"

    def to_rpc_dict(self) -> Dict[str, Any]:
        payload = self._liquid_rpc_dict("Mix")
        payload.update(
            {
                "LiquidType": self.liquid_type,
                "MixLoopVolume": self.mix_loop_volume,
                "MixLoopCounts": self.mix_loop_counts,
                "BlowSampleVolume": self.blow_sample_volume,
                "SuctionSpeed": self.suction_speed,
                "DispenseSpeed": self.dispense_speed,
                "PostAirVolume": self.post_air_volume,
                "BottomOffsetOfZ": self.bottom_offset_of_z,
                "MixLoopAspirateRate": self.mix_loop_aspirate_rate,
                "MixOffsetOfZInLoop": self.mix_offset_of_z_in_loop,
                "MixLoopDispenseRate": self.mix_loop_dispense_rate,
                "MixOffsetOfZAfterLoop": self.mix_offset_of_z_after_loop,
                "MixAfterAspirate": self.mix_after_aspirate,
                "DispenseRateAfterSubmixLoop": self.dispense_rate_after_submix_loop,
                "PreAirVolume": self.pre_air_volume,
                "SubMixLoopCompletedDely": self.sub_mix_loop_completed_dely,
                "IfTipTouch": self.if_tip_touch,
                "TipTouchHeight": self.tip_touch_height,
                "TipTouchOffsetOfX": self.tip_touch_offset_of_x,
                "SecondRouteRate": self.second_route_rate,
                "MixLoopAspirateDely": self.mix_loop_aspirate_dely,
                "MixLoopDispenseDely": self.mix_loop_dispense_dely,
                "DelyAfterSubmixLoopCompleted": self.dely_after_submix_loop_completed,
                "PostLoadPosition": self.post_load_position,
            }
        )
        return payload


@dataclass
class UnloadTipsStepV04(LiquidStepV04):
    display_name: str = "T5"
    position: str = "5"
    post_load_position: str = "None"

    def to_rpc_dict(self) -> Dict[str, Any]:
        payload = self._liquid_rpc_dict("UnloadTips")
        payload["PostLoadPosition"] = self.post_load_position
        return payload


@dataclass
class TempSetStepV04:
    display_name: str = ""
    number: int = 1
    temp: float = 37.0
    time: int = 100
    is_wait: bool = True
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "TempSet",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Number": self.number,
            "Temp": self.temp,
            "Time": self.time,
            "IsWait": self.is_wait,
        }


@dataclass
class TempAndOscStepV04:
    display_name: str = ""
    number: int = 1
    temp: float = 37.0
    osc_rate: int = 1200
    time: int = 100
    is_wait: bool = True
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "TempAndOsc",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Number": self.number,
            "Temp": self.temp,
            "OscRate": self.osc_rate,
            "Time": self.time,
            "IsWait": self.is_wait,
        }


@dataclass
class OscSetStepV04:
    display_name: str = ""
    number: int = 1
    osc_time: int = 100
    osc_rate: int = 1200
    is_wait: bool = True
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "OscSet",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Number": self.number,
            "OscTime": self.osc_time,
            "OscRate": self.osc_rate,
            "IsWait": self.is_wait,
        }


@dataclass
class MagneticStandStepV04:
    display_name: str = ""
    number: int = 1
    time: int = 100
    height: float = 35.0
    is_wait: bool = True
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "MagneticStand",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Number": self.number,
            "Time": self.time,
            "Height": self.height,
            "IsWait": self.is_wait,
        }


@dataclass
class LiquidCoolSetStepV04:
    display_name: str = ""
    number: int = 1
    temp: float = 0.0
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "LiquidCoolSet",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Number": self.number,
            "Temp": self.temp,
        }


@dataclass
class PauseStepV04:
    display_name: str = ""
    pause_enum: str = "Manual"
    time: str = ""
    remarks: str = "流程暂停，请点击确认后继续"
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "Pause",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "PauseEnum": self.pause_enum,
            "Time": self.time,
            "Remarks": self.remarks,
        }


@dataclass
class MvKitStepV04:
    display_name: str = ""
    source: int = 10
    destination: int = 12
    force: int = 5
    pinch_it_up_position: int = 1
    put_down_position: int = 1
    source_direct: str = "None"
    destination_direct: str = "None"
    level: int = 0
    comment: Optional[str] = None
    is_enabled: bool = True

    def to_rpc_dict(self) -> Dict[str, Any]:
        return {
            "Kind": "MvKit",
            "DisplayName": self.display_name,
            "Comment": self.comment,
            "IsEnabled": self.is_enabled,
            "Source": self.source,
            "Destination": self.destination,
            "Force": self.force,
            "PinchItUpPosition": self.pinch_it_up_position,
            "PutDownPosition": self.put_down_position,
            "SourceDirect": self.source_direct,
            "DestinationDirect": self.destination_direct,
            "Level": self.level,
        }


SolutionStepV04Type = Union[
    LoadTipsStepV04,
    AspirateStepV04,
    DispenseStepV04,
    MixStepV04,
    UnloadTipsStepV04,
    TempSetStepV04,
    TempAndOscStepV04,
    OscSetStepV04,
    MagneticStandStepV04,
    LiquidCoolSetStepV04,
    PauseStepV04,
    MvKitStepV04,
]


DEMO_SOLUTION_STEP_KINDS = (
    "LoadTips",
    "Aspirate",
    "Dispense",
    "Mix",
    "UnloadTips",
    "TempSet",
    "TempAndOsc",
    "OscSet",
    "MagneticStand",
    "LiquidCoolSet",
    "Pause",
    "MvKit",
)


def create_demo_solution_steps() -> List[SolutionStepV04Type]:
    """对齐 C# Demo CreateSolutionSteps() 的 V04 固定 12 步示例。"""
    return [
        LoadTipsStepV04(),
        AspirateStepV04(),
        DispenseStepV04(),
        MixStepV04(),
        UnloadTipsStepV04(),
        TempSetStepV04(),
        TempAndOscStepV04(),
        OscSetStepV04(),
        MagneticStandStepV04(),
        LiquidCoolSetStepV04(),
        PauseStepV04(),
        MvKitStepV04(),
    ]
