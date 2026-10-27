"""PRCXI V04 Python SDK 客户端入口。"""

from __future__ import annotations

from typing import Callable, Optional

from .rpc import RpcTransport
from .dmtp_transport import DmtpTransport
from .services import (
    AutomationService,
    ClientSessionService,
    MachineStateService,
    MatrixV04Service,
    SolutionService,
)


class PrcxiClient:
    """SDK 主客户端：组合 transport 与四类服务接口。"""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 9999,
        timeout: float = 10.0,
        debug_logger: Optional[Callable[[str], None]] = None,
        transport: str = "dmtp",
    ):
        if transport == "dmtp":
            transport_type = DmtpTransport
        elif transport == "legacy_v7_json":
            transport_type = RpcTransport
        else:
            raise ValueError("transport must be 'dmtp' or 'legacy_v7_json'")
        self.transport = transport_type(host=host, port=port, timeout=timeout, debug_logger=debug_logger)
        self.automation = AutomationService(self.transport)
        self.solution = SolutionService(self.transport)
        self.machine_state = MachineStateService(self.transport)
        self.matrix_v04 = MatrixV04Service(self.transport)
        self.client_session = ClientSessionService(self.transport)

    def probe_connection(self) -> bool:
        """DMTP 握手后调用 IClientSession.IsConnect；返回 False 表示不可用。"""
        return self.client_session.is_connect()

    def close(self) -> None:
        """Release the current session without reconnecting."""
        close = getattr(self.transport, "close", None)
        if close is not None:
            close()
