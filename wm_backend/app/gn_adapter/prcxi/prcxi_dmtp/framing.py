"""TouchSocket DMTP outer frame codec.

Reference boundary: TouchSocket.Dmtp DmtpMessage/DmtpAdapter 4.3.x.
Frame layout is ``dm`` + uint16-big-endian protocol + int32-big-endian body
length + body. This module does not implement DMTP handshake or RPC packages.
"""

from __future__ import annotations

from dataclasses import dataclass
import struct


MAGIC = b"dm"
HEADER_SIZE = 8
DEFAULT_MAX_BODY_LENGTH = 64 * 1024 * 1024


class DmtpFrameError(ValueError):
    """Raised when a DMTP frame is malformed or exceeds configured limits."""


@dataclass(frozen=True)
class DmtpFrame:
    protocol: int
    body: bytes

    def encode(self) -> bytes:
        return encode_frame(self.protocol, self.body)


def encode_frame(protocol: int, body: bytes, *, max_body_length: int = DEFAULT_MAX_BODY_LENGTH) -> bytes:
    """Encode one DMTP frame using the TouchSocket outer framing layout."""
    if not 0 <= protocol <= 0xFFFF:
        raise DmtpFrameError(f"protocol 超出 uint16 范围：{protocol}")
    if not isinstance(body, bytes):
        raise TypeError("body 必须是 bytes")
    if not 0 <= max_body_length <= 0x7FFFFFFF:
        raise ValueError("max_body_length 必须是非负 int32")
    if len(body) > max_body_length:
        raise DmtpFrameError(f"body 超过限制：{len(body)} 字节")
    return MAGIC + struct.pack(">HI", protocol, len(body)) + body


class DmtpFrameDecoder:
    """Incremental decoder for fragmented and coalesced TCP reads."""

    def __init__(self, *, max_body_length: int = DEFAULT_MAX_BODY_LENGTH):
        if not 0 <= max_body_length <= 0x7FFFFFFF:
            raise ValueError("max_body_length 必须是非负 int32")
        self.max_body_length = max_body_length
        self._buffer = bytearray()
        self._failed = False

    def feed(self, data: bytes) -> list[DmtpFrame]:
        if self._failed:
            raise DmtpFrameError("decoder failed; create a new decoder")
        if not isinstance(data, bytes):
            raise TypeError("data 必须是 bytes")
        frames: list[DmtpFrame] = []
        offset = 0
        try:
            while offset < len(data):
                if len(self._buffer) < HEADER_SIZE:
                    needed = HEADER_SIZE - len(self._buffer)
                    self._buffer.extend(data[offset:offset + needed])
                    offset += min(needed, len(data) - offset)
                    if self._buffer[:min(len(self._buffer), 2)] != MAGIC[:min(len(self._buffer), 2)]:
                        raise DmtpFrameError("DMTP magic 不正确")
                    if len(self._buffer) < HEADER_SIZE:
                        break
                protocol, body_length = struct.unpack(">Hi", self._buffer[2:HEADER_SIZE])
                if body_length < 0 or body_length > self.max_body_length:
                    raise DmtpFrameError(f"非法 body 长度：{body_length}")
                frame_size = HEADER_SIZE + body_length
                needed = frame_size - len(self._buffer)
                if needed:
                    self._buffer.extend(data[offset:offset + needed])
                    offset += min(needed, len(data) - offset)
                    if len(self._buffer) < frame_size:
                        break
                frames.append(DmtpFrame(protocol, bytes(self._buffer[HEADER_SIZE:])))
                self._buffer.clear()
        except DmtpFrameError:
            self._buffer.clear()
            self._failed = True
            raise
        return frames

    @property
    def buffered_bytes(self) -> int:
        return len(self._buffer)
