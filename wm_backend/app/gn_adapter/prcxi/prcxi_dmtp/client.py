"""Isolated synchronous lab client. Only caller-supplied local test endpoints."""
from __future__ import annotations

import json
from .fastbinary import ResponseModel
import socket
import ipaddress
import math
import time
from itertools import count

from .framing import DmtpFrame, DmtpFrameDecoder, encode_frame
from .handshake import encode_handshake_request, decode_handshake_response, handshake_succeeded
from .rpc import decode_response, encode_request, RpcPackageError


class DmtpLabClient:
    def __init__(self, host: str, port: int, *, timeout: float = 3):
        # Numeric loopback literals only: no DNS resolution, remote host or alias.
        try:
            address = ipaddress.ip_address(host)
        except ValueError as exc:
            raise ValueError("lab host must be a numeric loopback address") from exc
        if not address.is_loopback:
            raise ValueError("lab host must be loopback")
        if isinstance(port, bool) or not isinstance(port, int) or not 1 <= port <= 65535:
            raise ValueError("invalid lab port")
        if isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("timeout must be finite and positive")
        self.host, self.port, self.timeout = str(address), port, timeout
        self._sock: socket.socket | None = None
        self._decoder = DmtpFrameDecoder()
        self._pending: list[DmtpFrame] = []
        self._signs = count(2)
        self.id: str | None = None

    def __enter__(self):
        deadline = time.monotonic() + self.timeout
        self._sock = socket.create_connection((self.host, self.port), self.timeout)
        try:
            sign = next(self._signs)
            self._send(encode_frame(1, encode_handshake_request(sign=sign)), deadline)
            response = self._receive(2, deadline)
            payload = decode_handshake_response(response.body)
            if payload.get("Sign") != sign or not handshake_succeeded(payload):
                raise RpcPackageError("handshake rejected or sign mismatch")
            self.id = payload.get("Id")
            return self
        except Exception:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *_):
        if self._sock is not None:
            self._sock.close()
            self._sock = None

    def _set_deadline(self, deadline: float) -> None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("DMTP operation deadline exceeded")
        assert self._sock is not None
        self._sock.settimeout(remaining)

    def _send(self, data: bytes, deadline: float) -> None:
        assert self._sock is not None
        view = memoryview(data)
        while view:
            self._set_deadline(deadline)
            sent = self._sock.send(view)
            if not sent:
                raise ConnectionError("DMTP connection closed while sending")
            view = view[sent:]

    def _receive(self, protocol: int, deadline: float) -> DmtpFrame:
        while True:
            self._set_deadline(deadline)
            if self._pending:
                frame = self._pending.pop(0)
                if frame.protocol != protocol:
                    raise RpcPackageError(f"unexpected DMTP protocol {frame.protocol}")
                return frame
            assert self._sock is not None
            chunk = self._sock.recv(65536)
            if not chunk:
                raise ConnectionError("DMTP connection closed")
            self._pending.extend(self._decoder.feed(chunk))

    def get_response(self, service: str, method: str, args: list | tuple = ()) -> ResponseModel:
        """Call the actual Lilith wrapper; args become one JSON array string."""
        return self.invoke("GetResponse", ResponseModel, service, method,
                           json.dumps(args, ensure_ascii=False, separators=(",", ":")))

    def invoke(self, key: str, return_type: type, *parameters: object):
        if self._sock is None:
            raise RuntimeError("client not connected")
        deadline = time.monotonic() + self.timeout
        sign = next(self._signs)
        body = encode_request(key, sign, parameters, source_id=self.id)
        try:
            self._send(encode_frame(20, body), deadline)
            response = decode_response(self._receive(21, deadline).body, return_type, sign, client_id=self.id)
        except (ConnectionError, OSError, TimeoutError, RpcPackageError, ValueError):
            self.__exit__(None, None, None)  # Unknown stream state: never reuse.
            raise
        if response.status != 1:
            raise RpcPackageError(response.message or f"RPC status {response.status}")
        return response.value
