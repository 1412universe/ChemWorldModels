"""IMachineState 状态查询服务。"""

from __future__ import annotations

from typing import Any

from .base import BaseService


class MachineStateService(BaseService):
    service_name = "IMachineState"

    def get_step_state_list(self) -> Any:
        return self._invoke("GetStepStateList").data

    def get_step_status(self, step_no: int) -> Any:
        return self._invoke("GetStepStatus", [step_no]).data

    def get_step_state(self, step_no: int) -> Any:
        return self._invoke("GetStepState", [step_no]).data

    def get_location(self, axis_no: int) -> Any:
        return self._invoke("GetLocation", [axis_no]).data

    def get_location_list(self) -> Any:
        return self._invoke("GetLocationList").data
