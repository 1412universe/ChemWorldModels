"""Only the TouchSocket 4.3.x FastBinary parameter primitives needed by this lab."""
from __future__ import annotations

import struct
from dataclasses import dataclass


@dataclass(frozen=True)
class ResponseModel:
    Success: bool
    Data: str | None
    Msg: str | None


def encode(value: str | bool | int | ResponseModel | None) -> bytes:
    # FastBinaryFormatter.Serialize writes version 1 for every parameter.
    if value is None:
        return b"\x01\x00"
    if isinstance(value, ResponseModel):
        # Verified against the local 2.0.14 ResponseModel DLL (Golden.cs).
        members = (("Success", value.Success), ("Data", value.Data), ("Msg", value.Msg))
        payload = b"".join(bytes((len(name),)) + name.encode("ascii") + encode(member)[1:]
                           for name, member in members)
        return b"\x01\x01" + struct.pack("<i", len(payload)) + payload
    if isinstance(value, bool):
        data = bytes((int(value),))
    elif isinstance(value, int) and -2**31 <= value < 2**31:
        data = struct.pack("<i", value)
    elif isinstance(value, str):
        raw = value.encode("utf-8")
        if len(raw) >= 2**31:
            raise ValueError("string too long")
        data = struct.pack("<i", len(raw)) + raw
    else:
        raise TypeError("supported: string, bool, int32, None")
    return b"\x01\x01" + data


def decode(data: bytes, kind: type, offset: int = 0) -> tuple[object, int]:
    if len(data) < offset + 2 or data[offset] != 1:
        raise ValueError("invalid FastBinary version/truncated null marker")
    marker = data[offset + 1]
    if marker == 0:
        return None, offset + 2
    if marker != 1:
        raise ValueError("invalid FastBinary null marker")
    pos = offset + 2
    if kind is bool:
        size = 1
    elif kind is int:
        size = 4
    elif kind is str:
        if len(data) < pos + 4:
            raise ValueError("truncated string length")
        length = struct.unpack_from("<i", data, pos)[0]
        if length < 0 or length > 64 * 1024 * 1024:
            raise ValueError("invalid string length")
        pos += 4
        size = length
    elif kind is ResponseModel:
        if len(data) < pos + 4:
            raise ValueError("truncated object length")
        length = struct.unpack_from("<i", data, pos)[0]
        pos += 4
        if length < 0 or length > 64 * 1024 * 1024 or len(data) < pos + length:
            raise ValueError("invalid object length")
        end = pos + length
        members = {}
        expected = {"Success": bool, "Data": str, "Msg": str}
        while pos < end:
            name_size = data[pos]
            pos += 1
            if pos + name_size > end:
                raise ValueError("truncated member name")
            name = data[pos:pos + name_size].decode("utf-8")
            pos += name_size
            if name not in expected or name in members:
                raise ValueError("unsupported ResponseModel member")
            member, consumed = decode(b"\x01" + data[pos:end], expected[name])
            pos += consumed - 1
            members[name] = member
        if pos != end or set(members) != set(expected):
            raise ValueError("incomplete ResponseModel")
        return ResponseModel(**members), end
    else:
        raise TypeError("unsupported return kind")
    if len(data) < pos + size:
        raise ValueError("truncated FastBinary parameter")
    raw = data[pos:pos + size]
    if kind is bool:
        if raw[0] not in (0, 1):
            raise ValueError("invalid bool")
        result = bool(raw[0])
    elif kind is int:
        result = struct.unpack("<i", raw)[0]
    else:
        result = raw.decode("utf-8")
    return result, pos + size
