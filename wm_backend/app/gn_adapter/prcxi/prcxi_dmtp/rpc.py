"""Source-guided minimal un-routed TouchSocket DMTP RPC 20/21 package."""
from __future__ import annotations

from dataclasses import dataclass
import struct

from .fastbinary import encode as encode_value, decode as decode_value


class RpcPackageError(ValueError):
    pass


def _string(value: str | None, width: int) -> bytes:
    limit = (1 << (8 * width)) - 1
    if value is None:
        return limit.to_bytes(width, "little")
    raw = value.encode("utf-8")
    if len(raw) >= limit:
        raise RpcPackageError("string too long")
    return len(raw).to_bytes(width, "little") + raw


def _read_string(body: bytes, pos: int, width: int) -> tuple[str | None, int]:
    if len(body) < pos + width:
        raise RpcPackageError("truncated string header")
    size = int.from_bytes(body[pos:pos + width], "little")
    pos += width
    if size == (1 << (8 * width)) - 1:
        return None, pos
    if len(body) < pos + size:
        raise RpcPackageError("truncated string")
    return body[pos:pos + size].decode("utf-8"), pos + size


def _router(sign: int, status: int, source_id: str | None, target_id: str | None) -> bytes:
    if not 1 <= sign <= 0x7FFFFFFF or not 0 <= status <= 255:
        raise RpcPackageError("invalid sign/status")
    # RouterPackage.Version, IDs and null Metadata, WaitRouterPackage.Sign/Status.
    return b"\x01" + _string(source_id, 1) + _string(target_id, 1) + b"\x00" + struct.pack("<iB", sign, status)


def _parse_router(body: bytes) -> tuple[int, int, str | None, str | None, int]:
    if not body or body[0] != 1:
        raise RpcPackageError("unsupported router version")
    source, pos = _read_string(body, 1, 1)
    target, pos = _read_string(body, pos, 1)
    if len(body) < pos + 6 or body[pos] != 0:
        raise RpcPackageError("metadata unsupported or truncated router")
    sign, status = struct.unpack_from("<iB", body, pos + 1)
    if sign <= 0:
        raise RpcPackageError("invalid sign")
    return sign, status, source, target, pos + 6


def encode_request(key: str, sign: int, parameters: tuple = (), *, source_id: str | None = None) -> bytes:
    if len(parameters) > 255:
        raise RpcPackageError("too many parameters")
    # SerializationType.FastBinary=0; FeedbackType.WaitInvoke=2.
    return (_router(sign, 0, source_id, None) + b"\x00" + _string(key, 1)
            + b"\x02" + _string(None, 2) + bytes((len(parameters),))
            + b"".join(encode_value(param) for param in parameters))


@dataclass(frozen=True)
class RpcResponse:
    sign: int
    status: int
    message: str | None
    value: object


def decode_response(body: bytes, return_type: type, expected_sign: int, *, client_id: str | None = None) -> RpcResponse:
    sign, status, source, target, pos = _parse_router(body)
    # The server addresses a normal reply to the caller's actor Id, even though
    # the request's TargetId is null (un-routed local invocation).
    if sign != expected_sign or (target is not None and target != client_id):
        raise RpcPackageError("unexpected RPC sign or target")
    if len(body) < pos + 1 or body[pos] != 0:
        raise RpcPackageError("unsupported serialization type")
    message, pos = _read_string(body, pos + 1, 2)
    # TouchSocket error statuses need not carry a serialized result.
    if status != 1 and pos == len(body):
        return RpcResponse(sign, status, message, None)
    value, pos = decode_value(body, return_type, pos)
    if pos != len(body):
        raise RpcPackageError("trailing response data")
    return RpcResponse(sign, status, message, value)


def encode_response(sign: int, value: object, *, status: int = 1, message: str | None = None) -> bytes:
    """Offline fixture only; not a full DMTP server."""
    return _router(sign, status, None, None) + b"\x00" + _string(message, 2) + encode_value(value)
