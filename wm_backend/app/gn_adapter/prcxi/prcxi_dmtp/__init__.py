"""Python-native DMTP protocol laboratory for NeonGenesis 2.0.

This package is intentionally isolated from the production SDK transport until
byte-level interoperability with TouchSocket 4.3.2 is verified.
"""

from .framing import DmtpFrame, DmtpFrameDecoder, encode_frame

__all__ = ["DmtpFrame", "DmtpFrameDecoder", "encode_frame"]
