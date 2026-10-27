"""DMTP handshake JSON helpers for the NeonGenesis protocol lab.

TouchSocket sends handshake payloads as JSON inside protocol 1/2 frames. The
exact serializer options and Metadata representation still require reference
endpoint verification; these helpers intentionally preserve unknown fields.
"""

from __future__ import annotations

import json
from itertools import count
from typing import Any, Mapping

_signs = count(2)  # TouchSocket WaitHandlePool starts at 1, then increments.

HANDSHAKE_REQUEST_PROTOCOL = 1
HANDSHAKE_RESPONSE_PROTOCOL = 2
VERIFY_TOKEN = "RPC"


def encode_handshake_request(*, token: str = VERIFY_TOKEN, client_id: str | None = None, metadata: Any = None, sign: int | None = None) -> bytes:
    if sign is None:
        sign = next(_signs)
    if not 1 <= sign <= 0x7FFFFFFF:
        raise ValueError("Sign 必须是正 int32")
    payload = {
        "Token": token,
        "Id": client_id,
        "Metadata": metadata,
        "Sign": sign,
        "Status": 0,
        "Message": None,
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def decode_handshake_response(body: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("DMTP 握手响应不是有效 JSON") from exc
    if not isinstance(payload, dict):
        raise ValueError("DMTP 握手响应必须是 JSON object")
    return payload


def handshake_succeeded(payload: Mapping[str, Any]) -> bool:
    """TouchSocket WaitVerify uses status 1 for an accepted verification."""
    return payload.get("Status") == 1
