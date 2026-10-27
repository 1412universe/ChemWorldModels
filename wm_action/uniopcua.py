# -*- coding: utf-8 -*-
"""OPC UA 节点类型。驱动通过 unilabos.device_comms.opcua_client.node.uniopcua 使用。

read 返回 (值, 是否出错)，write 返回是否出错。声明了数据类型时按对应 Variant 写入。
"""

import re
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, List, Optional, Tuple

from opcua import Client, Node, ua
from opcua.ua import NodeClass, NodeId, VariantType


class DataType(Enum):
    BOOLEAN = VariantType.Boolean
    SBYTE = VariantType.SByte
    BYTE = VariantType.Byte
    INT16 = VariantType.Int16
    UINT16 = VariantType.UInt16
    INT32 = VariantType.Int32
    UINT32 = VariantType.UInt32
    INT64 = VariantType.Int64
    UINT64 = VariantType.UInt64
    FLOAT = VariantType.Float
    DOUBLE = VariantType.Double
    STRING = VariantType.String
    DATETIME = VariantType.DateTime
    BYTESTRING = VariantType.ByteString


class NodeType(Enum):
    VARIABLE = NodeClass.Variable
    OBJECT = NodeClass.Object
    METHOD = NodeClass.Method
    OBJECTTYPE = NodeClass.ObjectType
    VARIABLETYPE = NodeClass.VariableType
    REFERENCETYPE = NodeClass.ReferenceType
    DATATYPE = NodeClass.DataType
    VIEW = NodeClass.View


def _resolve_node(client: Client, node_id: Any) -> Node:
    """把 CSV 里的 NodeId 字符串解析成 opcua 节点。"""
    if isinstance(node_id, NodeId):
        return client.get_node(node_id)
    nid = str(node_id).strip()
    wrapped = re.match(
        r"(String|Numeric|Byte|Guid|TwoByteNode|FourByteNode)NodeId\((.*)\)",
        nid,
    )
    if wrapped:
        nid = wrapped.group(2).strip()
    if re.match(r"^ns=\d+;[is]=", nid):
        return client.get_node(nid)
    numeric = re.search(r"ns=(\d+);i=(\d+)", nid)
    if numeric:
        return client.get_node(NodeId(int(numeric.group(2)), int(numeric.group(1))))
    text = re.search(r"ns=(\d+);s=(.+?)(?:\)|$)", nid)
    if text:
        return client.get_node("ns=%s;s=%s" % (text.group(1), text.group(2).strip()))
    return client.get_node(nid)


class Base(ABC):
    def __init__(self, client: Client, name: str, node_id: str, typ: NodeType, data_type: DataType):
        self._node_id = node_id
        self._client = client
        self._name = name
        self._type = typ
        self._data_type = data_type
        self._node: Optional[Node] = None

    def _get_node(self) -> Node:
        if self._node is None:
            self._node = _resolve_node(self._client, self._node_id)
        return self._node

    @abstractmethod
    def read(self) -> Tuple[Any, bool]:
        pass

    @abstractmethod
    def write(self, value: Any) -> bool:
        pass

    @property
    def type(self) -> NodeType:
        return self._type

    @property
    def node_id(self) -> str:
        return self._node_id

    @property
    def name(self) -> str:
        return self._name


def _coerce(value: Any, data_type: DataType) -> Any:
    if data_type in (
        DataType.SBYTE, DataType.BYTE, DataType.INT16, DataType.UINT16,
        DataType.INT32, DataType.UINT32, DataType.INT64, DataType.UINT64,
    ):
        return int(value)
    if data_type in (DataType.FLOAT, DataType.DOUBLE):
        return float(value)
    if data_type == DataType.BOOLEAN:
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes", "on")
        return bool(value)
    if data_type in (DataType.STRING, DataType.BYTESTRING, DataType.DATETIME):
        return str(value)
    return value


class Variable(Base):
    def __init__(self, client: Client, name: str, node_id: str, data_type: DataType):
        super().__init__(client, name, node_id, NodeType.VARIABLE, data_type)

    def read(self) -> Tuple[Any, bool]:
        try:
            return self._get_node().get_value(), False
        except Exception as exc:
            print("读取变量 %s 失败: %s" % (self._name, exc))
            return None, True

    def write(self, value: Any) -> bool:
        try:
            node = self._get_node()
            if self._data_type is None:
                node.set_value(value)
                return False
            coerced = _coerce(value, self._data_type)
            try:
                node.set_value(ua.Variant(coerced, self._data_type.value))
            except Exception:
                try:
                    node.set_value(coerced, self._data_type.value)
                except Exception:
                    node.set_value(coerced)
            return False
        except Exception as exc:
            print("写入变量 %s 失败: %s" % (self._name, exc))
            return True


class Method(Base):
    def __init__(self, client: Client, name: str, node_id: str, parent_node_id: str, data_type: DataType):
        super().__init__(client, name, node_id, NodeType.METHOD, data_type)
        self._parent_node_id = parent_node_id
        self._parent_node = None

    def _get_parent_node(self) -> Node:
        if self._parent_node is None:
            self._parent_node = _resolve_node(self._client, self._parent_node_id)
        return self._parent_node

    def read(self) -> Tuple[Any, bool]:
        return None, True

    def write(self, value: Any) -> bool:
        return True

    def call(self, *args) -> Tuple[Any, bool]:
        try:
            return self._get_parent_node().call_method(self._get_node(), *args), False
        except Exception as exc:
            print("调用方法 %s 失败: %s" % (self._name, exc))
            return None, True


class Object(Base):
    def __init__(self, client: Client, name: str, node_id: str):
        super().__init__(client, name, node_id, NodeType.OBJECT, None)

    def read(self) -> Tuple[Any, bool]:
        return None, True

    def write(self, value: Any) -> bool:
        return True

    def get_children(self) -> Tuple[List[Node], bool]:
        try:
            return self._get_node().get_children(), False
        except Exception as exc:
            print("获取对象 %s 的子节点失败: %s" % (self._name, exc))
            return [], True
