"""Synchronous Python-native TouchSocket DMTP transport for Lilith GetResponse."""
from __future__ import annotations

import json
import socket
import threading
import time
from itertools import count
from typing import Any, Callable, Optional

from prcxi_dmtp.fastbinary import ResponseModel
from prcxi_dmtp.framing import DmtpFrameDecoder, encode_frame
from prcxi_dmtp.handshake import decode_handshake_response, encode_handshake_request, handshake_succeeded
from prcxi_dmtp.rpc import RpcPackageError, decode_response, encode_request

from .exceptions import RpcConnectionError, RpcResponseError, RpcTimeoutError
from .rpc import RpcTransport


class DmtpTransport:
    """Lazy session; one in-flight operation per connection, no automatic call retries."""

    def __init__(self, host: str = "127.0.0.1", port: int = 9999, timeout: float = 10.0,
                 debug_logger: Optional[Callable[[str], None]] = None):
        self.host, self.port, self.timeout = host, port, timeout
        self.debug_logger = debug_logger
        self._lock = threading.RLock()
        self._sock: socket.socket | None = None
        self._decoder = DmtpFrameDecoder()
        self._pending = []
        self._signs = count(2)
        self._id: str | None = None

    def _debug(self, text: str) -> None:
        if self.debug_logger:
            self.debug_logger(text)

    def close(self) -> None:
        with self._lock:
            self._close()

    def _close(self) -> None:
        sock, self._sock = self._sock, None
        self._id = None
        self._pending.clear()
        self._decoder = DmtpFrameDecoder()
        if sock is not None:
            try:
                sock.close()
            except OSError:
                pass

    def _deadline(self, deadline: float) -> None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("DMTP operation deadline exceeded")
        assert self._sock is not None
        self._sock.settimeout(remaining)

    def _send(self, data: bytes, deadline: float) -> None:
        assert self._sock is not None
        view = memoryview(data)
        while view:
            self._deadline(deadline)
            sent = self._sock.send(view)
            if not sent:
                raise ConnectionError("DMTP connection closed while sending")
            view = view[sent:]

    def _receive(self, protocol: int, deadline: float) -> bytes:
        while True:
            if self._pending:
                frame = self._pending.pop(0)
                if frame.protocol != protocol:
                    raise RpcPackageError(f"unexpected DMTP protocol {frame.protocol}")
                return frame.body
            self._deadline(deadline)
            assert self._sock is not None
            chunk = self._sock.recv(65536)
            if not chunk:
                raise ConnectionError("DMTP connection closed")
            self._pending.extend(self._decoder.feed(chunk))

    def _connect(self, deadline: float) -> None:
        if self._sock is not None:
            return
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("DMTP connection deadline exceeded")
        self._sock = socket.create_connection((self.host, self.port), timeout=remaining)
        sign = next(self._signs)
        self._send(encode_frame(1, encode_handshake_request(sign=sign)), deadline)
        response = decode_handshake_response(self._receive(2, deadline))
        if response.get("Sign") != sign or not handshake_succeeded(response):
            raise RpcPackageError("DMTP handshake rejected or sign mismatch")
        self._id = response.get("Id")
        self._debug(f"DMTP HANDSHAKE {self.host}:{self.port} id={self._id}")

    def send(self, service_name: str, method_name: str,
             parameters: Optional[list[Any]] = None) -> dict[str, Any]:
        args = parameters if parameters is not None else []
        args_json = json.dumps(args, ensure_ascii=False, separators=(",", ":"))
        rpc_name = f"{service_name}.{method_name}"
        with self._lock:
            deadline = time.monotonic() + self.timeout
            try:
                self._connect(deadline)
                sign = next(self._signs)
                body = encode_request("GetResponse", sign, (service_name, method_name, args_json), source_id=self._id)
                self._debug(f"DMTP SEND {rpc_name} params={RpcTransport._preview(args)} bytes={len(body)}")
                self._send(encode_frame(20, body), deadline)
                result = decode_response(self._receive(21, deadline), ResponseModel, sign, client_id=self._id)
                if result.status != 1:
                    raise RpcResponseError(result.message or f"DMTP RPC status {result.status}")
                if result.value is None:
                    raise RpcResponseError(f"{rpc_name} returned null ResponseModel")
                value = result.value
                payload = {"Success": value.Success, "Data": value.Data, "Msg": value.Msg}
                self._debug(f"DMTP RECV {rpc_name} Success={value.Success} Msg={value.Msg} Data={RpcTransport._preview(value.Data)}")
                return payload
            except (socket.timeout, TimeoutError) as exc:
                self._close()
                raise RpcTimeoutError(f"DMTP 超时（{self.timeout} 秒）；调用结果未知，不会自动重试") from exc
            except (OSError, ConnectionError) as exc:
                self._close()
                raise RpcConnectionError(f"DMTP 连接失败：{exc}；调用结果未知，不会自动重试") from exc
            except (ValueError, UnicodeError) as exc:
                self._close()
                raise RpcResponseError(f"DMTP 协议响应无效：{exc}") from exc
            except RpcResponseError:
                # Null/remote-error responses are complete RPC exchanges, not retry candidates.
                raise
            except Exception:
                self._close()
                raise

    def probe(self) -> bool:
        """Verify handshake and the business IsConnect result, not TCP reachability."""
        payload = self.send("IClientSession", "IsConnect")
        from .models.rpc_response import RpcResponse
        from .models.serialization import parse_rpc_bool
        response = RpcResponse.from_dict(payload)
        if not response.success:
            raise RpcResponseError(response.message or "IClientSession.IsConnect 调用失败", response)
        try:
            return parse_rpc_bool(response.data, "IClientSession.IsConnect 返回值")
        except ValueError as exc:
            raise RpcResponseError(str(exc)) from exc
