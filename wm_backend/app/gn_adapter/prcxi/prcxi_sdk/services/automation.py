"""IAutomation 运行控制服务。"""

from __future__ import annotations

from typing import Any

from ..exceptions import RpcResponseError
from ..models.serialization import parse_rpc_bool
from .base import BaseService


class AutomationService(BaseService):
    service_name = "IAutomation"

    def _invoke_bool(self, method_name: str) -> bool:
        try:
            return parse_rpc_bool(self._invoke(method_name).data, f"{self.service_name}.{method_name} 返回值")
        except ValueError as exc:
            raise RpcResponseError(str(exc)) from exc

    def start(self) -> bool:
        return self._invoke_bool("Start")

    def stop(self) -> bool:
        return self._invoke_bool("Stop")

    def pause(self) -> bool:
        return self._invoke_bool("Pause")

    def resume(self) -> bool:
        return self._invoke_bool("Resume")

    def reset(self) -> bool:
        return self._invoke_bool("Reset")

    def get_error_code(self) -> Any:
        return self._invoke("GetErrorCode").data

    def remove_error_code(self) -> Any:
        return self._invoke("RemoveErrorCodet").data

    def get_reset_status(self) -> Any:
        return self._invoke("GetResetStatus").data

    def get_start_status(self) -> bool:
        return self._invoke_bool("GetStartStatus")
