# Python DMTP 协议实验

本目录是 NeonGenesis 2.0 / TouchSocket DMTP 的 Python 原生协议子集。第二阶段已由 `prcxi_sdk.dmtp_transport.DmtpTransport` 复用协议编解码；`DmtpLabClient` 仍严格限制数字 loopback 地址。

## 当前实现

- `framing.py`：TouchSocket DMTP 外层帧：`dm` + 大端 `uint16 protocol` + 大端 `uint32 body length` + body。
- `handshake.py`：协议 1/2 的 JSON 握手辅助和 `VerifyToken="RPC"` 常量。

## 已验证子集与限制

- `rpc.py`：未路由、无 Metadata 的 RPC 20/21，RouterPackage(version、source/target ID、null Metadata)、WaitRouterPackage(Sign、Status)、serialization=FastBinary(0)、WaitInvoke(2)、ushort Message、参数计数。内部整数/长度为小端，外层 frame 为大端。
- `fastbinary.py`：version=1、null marker、string/bool/int32 和 2.0.14 `ResponseModel(Success, Data, Msg)`。开发时曾用未随交付分发的 C# 测试 fixture 与本地 DLL 生成独立原始向量，并用未分发的测试脚本比对。ResponseModel 其它扩展成员不支持。
- `client.py`：隔离的同步实验客户端；`get_response(service, method, args)` 按 Lilith `RPCClientProxy` 的 `GetResponse` 包装调用，第三参数为 JSON 数组字符串。不承担正式 SDK 的连接生命周期。只接受数字形式 IPv4/IPv6 loopback 地址（不解析主机名），不会自动连接设备；一次握手或 RPC 操作使用单一总时限，出错后不复用流。
- 握手 Sign 由 WaitHandlePool 自动分配，默认从 2 开始；响应必须回显 Sign。内部 RPC sign 在该连接中继续递增。
- 不实现路由、Metadata、完整 FastBinary、Ping/Close、其它 RPC/DTO。实验客户端不自动重连；正式 `DmtpTransport` 在下一次显式调用时可重新建连，但不会自动重试任何业务请求。已通过本地 TouchSocket loopback 验证握手、成功、null 和错误响应；真实 NeonGenesis/设备仍未验证。正式 `PrcxiClient` 已默认接入 `DmtpTransport`；旧 JSON transport 仅通过 `transport="legacy_v7_json"` 显式选择。

## 来源与边界

实现参考：

- `D:\Program\Net-Python\RPC调用文档.md`
- v8 `Prcxi.Lilith.Client 2.0.14` / `Prcxi.Lilith.Core` / `TouchSocket.Dmtp` / `TouchSocket.Core` 程序集反编译结果。
- 官方 TouchSocket 公开 C# 源码和 4.3.x 文档，作为协议参考，不作为 Python 运行时依赖。

本包只声明 NeonGenesis 所需的 TouchSocket DMTP 实验子集，不声明完整 TouchSocket 兼容。开发时曾使用本地离线测试脚本与依赖本机 v8 DLL 的 C# 向量 fixture；这些测试文件不随交付分发，Python 运行时不引用 DLL。官方参考 https://github.com/RRQM/TouchSocket/releases （`v4.3.2` tag URL 查询返回 404；该版本源码/提交未核实，不把本地 DLL 推导冒充官方 4.3.2 源码结论）；实际字节细节依据本地 v8 DLL 反编译的 `DmtpRpcRequestPackage`, `DmtpRpcResponsePackage`, `RouterPackage`, `WaitRouterPackage`, `FastBinaryFormatter`, `RPCClientProxy`。primitive/ResponseModel 已与 C# 黄金字节比对；本地 loopback 测试曾构建并调用 127.0.0.1 TouchSocket 4.3.2 DLL 参考服务，验证成功 ResponseModel、null 返回和抛异常对应的错误状态。离线测试还覆盖分片/合并帧、连续帧中恶意头、错误后解码器不可复用、握手与接收总时限。正式 SDK 已在第二阶段接入默认 DMTP，并通过同一本地未分发的 fixture 验证握手/IsConnect、成功、业务失败、JSON Data、null/异常、多次调用和断开重连。任意 RPC 方法、复杂 DTO、其它状态/元数据及真实设备仍未验证。
