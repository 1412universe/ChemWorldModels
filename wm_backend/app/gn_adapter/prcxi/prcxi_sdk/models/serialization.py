"""RPC 参数序列化辅助。"""

from __future__ import annotations

import json
from enum import Enum
from typing import Any, Dict, List, Mapping, Sequence, Union


RpcValue = Union[None, bool, int, float, str, List[Any], Dict[str, Any]]


def to_rpc_value(value: Any) -> RpcValue:
    """将 Python 对象转换为服务端兼容的 JSON 值。"""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, Enum):
        return value.name
    if isinstance(value, Mapping):
        return {str(key): to_rpc_value(item) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [to_rpc_value(item) for item in value]
    if hasattr(value, "to_rpc_dict"):
        return value.to_rpc_dict()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    raise TypeError(f"无法序列化为 RPC 参数：{type(value)!r}")


def parse_json_data(data: Any) -> Any:
    """部分接口的 Data 字段可能是 JSON 字符串，做二次解析。"""
    if isinstance(data, str):
        text = data.strip()
        if text.startswith("{") or text.startswith("["):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return data
    return data


def parse_rpc_bool(value: Any, field_name: str = "RPC 返回值") -> bool:
    """解析服务端常见 bool 表示：bool、0/1、true/false 字符串或 JSON 字符串。"""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError(f"{field_name}为空，无法解析为布尔值")
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = text
        if parsed is not value:
            return parse_rpc_bool(parsed, field_name)
        normalized = text.strip('"').strip().lower()
        if normalized in {"true", "1"}:
            return True
        if normalized in {"false", "0"}:
            return False
    raise ValueError(f"{field_name}不是布尔值：{value!r}")
