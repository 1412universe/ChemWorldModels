"""IClientSession 连接会话服务。"""

from __future__ import annotations

from ..exceptions import RpcResponseError
from ..models.serialization import parse_rpc_bool
from .base import BaseService


class ClientSessionService(BaseService):
    service_name = "IClientSession"

    def is_connect(self) -> bool:
        try:
            return parse_rpc_bool(self._invoke("IsConnect").data, "IClientSession.IsConnect 返回值")
        except ValueError as exc:
            raise RpcResponseError(str(exc)) from exc
