"""服务层基类。"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..exceptions import RpcResponseError
from ..models.rpc_response import RpcResponse
from ..models.serialization import to_rpc_value
from ..rpc import RpcTransport


class BaseService:
  service_name: str = ""

  def __init__(self, transport: RpcTransport):
    self._transport = transport

  def _invoke(self, method_name: str, parameters: Optional[List[Any]] = None) -> RpcResponse:
    payload = self._transport.send(
      self.service_name,
      method_name,
      [to_rpc_value(item) for item in (parameters or [])],
    )
    response = RpcResponse.from_dict(payload)
    if not response.success:
      raise RpcResponseError(response.message or f"{self.service_name}.{method_name} 调用失败", response)
    return response
