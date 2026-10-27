"""底层 RPC 传输：socket、8 字节长度帧、UTF-8 JSON。"""

from __future__ import annotations

import json
import socket
from typing import Any, Callable, Dict, List, Optional

from .exceptions import RpcConnectionError, RpcResponseError, RpcTimeoutError


class RpcTransport:
    """NeonGenesis JSON-RPC over TCP 传输层。"""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 9999,
        timeout: float = 10.0,
        max_response_size: int = 64 * 1024 * 1024,
        debug_logger: Optional[Callable[[str], None]] = None,
    ):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.max_response_size = max_response_size
        self.debug_logger = debug_logger

    @staticmethod
    def _length_header(payload_size: int) -> bytes:
        return bytes.fromhex(format(payload_size, "016x"))

    @staticmethod
    def _read_exact(sock: socket.socket, size: int) -> bytes:
        chunks: list[bytes] = []
        remaining = size
        while remaining > 0:
            chunk = sock.recv(remaining)
            if not chunk:
                received = size - remaining
                raise RpcResponseError(f"响应长度不完整：期望 {size} 字节，实际 {received} 字节")
            chunks.append(chunk)
            remaining -= len(chunk)
        return b"".join(chunks)

    @staticmethod
    def _preview(value: Any, limit: int = 500) -> str:
        try:
            text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        except TypeError:
            text = repr(value)
        if len(text) > limit:
            return f"{text[:limit]}...<truncated {len(text) - limit} chars>"
        return text

    def _debug(self, message: str) -> None:
        if self.debug_logger is not None:
            self.debug_logger(message)

    def probe(self) -> bool:
        """验证 RPC 端口可达，不发送业务指令。"""
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout):
                return True
        except socket.timeout as exc:
            raise RpcTimeoutError(f"连接超时（{self.timeout} 秒）") from exc
        except ConnectionRefusedError as exc:
            raise RpcConnectionError("设备拒绝连接，请检查 IP 和端口") from exc
        except OSError as exc:
            raise RpcConnectionError(f"连接失败：{exc}") from exc

    def send(
        self,
        service_name: str,
        method_name: str,
        parameters: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """发送 RPC 指令并返回解析后的响应字典。"""
        parameters = parameters or []
        cmd_dict = {
            "ServiceName": service_name,
            "MethodName": method_name,
            "Paramters": parameters,
        }
        cmd_json = json.dumps(cmd_dict, separators=(",", ":"), ensure_ascii=False)
        cmd_bytes = cmd_json.encode("utf-8")
        full_cmd = self._length_header(len(cmd_bytes)) + cmd_bytes
        rpc_name = f"{service_name}.{method_name}"
        self._debug(f"RPC SEND {rpc_name} params={self._preview(parameters)} bytes={len(cmd_bytes)}")

        sock: Optional[socket.socket] = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((self.host, self.port))
            sock.sendall(full_cmd)

            header = self._read_exact(sock, 8)
            payload_size = int.from_bytes(header, byteorder="big", signed=False)
            if payload_size <= 0:
                raise RpcResponseError(f"响应长度非法：{payload_size}")
            if payload_size > self.max_response_size:
                raise RpcResponseError(f"响应长度超过限制：{payload_size} 字节")
            raw_response = self._read_exact(sock, payload_size)
            self._debug(f"RPC FRAME {rpc_name} payload_bytes={payload_size}")
        except socket.timeout as exc:
            raise RpcTimeoutError(f"连接超时（{self.timeout} 秒）") from exc
        except ConnectionRefusedError as exc:
            raise RpcConnectionError("设备拒绝连接，请检查 IP 和端口") from exc
        except OSError as exc:
            raise RpcConnectionError(f"连接失败：{exc}") from exc
        finally:
            if sock is not None:
                try:
                    sock.close()
                except OSError:
                    pass

        try:
            payload = json.loads(raw_response.decode("utf-8"))
            self._debug(
                "RPC RECV "
                f"{rpc_name} Success={payload.get('Success')} "
                f"Msg={payload.get('Message') or payload.get('Msg')} "
                f"Data={self._preview(payload.get('Data'))}"
            )
            return payload
        except json.JSONDecodeError as exc:
            raise RpcResponseError(
                "响应 JSON 解析失败",
                raw_response.decode("utf-8", errors="ignore"),
            ) from exc
