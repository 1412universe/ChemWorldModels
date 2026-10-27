"""PRCXI SDK 异常定义。"""


class PrcxiSdkError(Exception):
    """SDK 基础异常。"""


class RpcConnectionError(PrcxiSdkError):
    """无法建立 RPC 连接。"""


class RpcTimeoutError(PrcxiSdkError):
    """RPC 请求超时。"""


class RpcResponseError(PrcxiSdkError):
    """RPC 响应解析失败或服务端返回失败。"""

    def __init__(self, message: str, response=None):
        super().__init__(message)
        self.response = response
