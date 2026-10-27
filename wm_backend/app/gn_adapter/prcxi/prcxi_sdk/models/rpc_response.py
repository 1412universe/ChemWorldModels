"""通用 RPC 响应与结果模型。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from ..exceptions import RpcResponseError
from .serialization import parse_json_data, parse_rpc_bool


def _response_success(payload: Dict[str, Any]) -> bool:
  try:
    return parse_rpc_bool(payload.get("Success"), "RPC 响应 Success")
  except ValueError as exc:
    raise RpcResponseError(str(exc)) from exc


@dataclass
class RpcResponse:
  success: bool
  message: Optional[str] = None
  data: Any = None

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "RpcResponse":
    return cls(
      success=_response_success(payload),
      message=payload.get("Message") or payload.get("Msg"),
      data=parse_json_data(payload.get("Data")),
    )


@dataclass
class Result:
  success: bool
  message: Optional[str] = None

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "Result":
    return cls(
      success=_response_success(payload),
      message=payload.get("Message") or payload.get("Msg"),
    )

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {"Success": self.success, "Message": self.message}
