# -*- coding: utf-8 -*-
"""PRCXI 9320 V4.0 DMTP 通道（wm_backend 自带，不依赖上游仓库）。

内容
----
  · prcxi_sdk / prcxi_dmtp   厂家《RPC_Python调用文档》官方 Python SDK（零第三方
    依赖，原样 vendor 自 Python_RPC_V04.zip，未改动任何协议代码）：
      - TouchSocket DMTP 外帧（"dm" 魔数 + uint16 大端协议号 + int32 大端长度）
      - protocol 1/2 握手（Token="RPC"，Status==1 成功，服务端分配 Id）
      - protocol 20/21 RPC（GetResponse，第三参为参数数组 JSON 字符串；
        响应为 FastBinary ResponseModel{Success,Data,Msg}，Data 是二次 JSON）
      - 五个服务封装：IClientSession / IAutomation / ISolution / IMatrix(_V04)
        / IMachineState；12 种固定步骤 Kind 的方案模型
  · dmtp_sim_server         有状态 DMTP 镜像服务（仿真档后端）：真握手 + 真
    FastBinary 编解码 + 状态机，跑在本机随机端口，供 PrcxiDevice 仿真档连接。

端口
----
现场 PRCXI 9320 主机 NeonGenesis.exe 监听 **9999**（用户确认）。
环境变量 `GN_PRCXI_URL`（host:port）可覆盖，默认 192.168.6.99:9999。
"""
