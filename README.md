# ChemWorldModels

AI 驱动的化学世界模型 —— 面向光热催化（OCM 甲烷偶联）与自动化合成产线的闭环推演与实验调度系统。

## 定位

将催化剂推荐、反应动力学仿真、贝叶斯优化与真实自动化实验产线（GN 510 工站）打通：由 LLM + surrogate 模型给出最优催化剂配方与反应条件，编译为可在真实工站执行的 OPC UA 工作流。

## 核心模块

| 目录 | 说明 |
|------|------|
| `wm_backend/` | FastAPI 后端 + Web 前端：AI 推演引擎、工作流编辑器、surrogate（XGBoost）训练与消融实验 |
| `wm_model/`   | 贝叶斯优化（UCB/BO）、产率校准、反应动力学、Pd(111) DFT 数据导出 |
| `GN/`        | GN 510 工站设备驱动与 OPC UA 通信：机械臂、离心、液体处理、烘箱、锁紧机构等 |
| `scripts/`   | Materials Project / OQMD 数据获取 |
| `docs/`      | 世界模型定义与方法定位 |

## 硬件对接协议

GN 工站 OPC UA 节点表对标 **`opcua_gn1.4.0.csv`**（见 `GN/` 目录），配套 PLC/机器人 Modbus TCP 协议 1.2。

## 快速启动

```bash
# 依赖（Python 3.11+）
cd wm_backend
pip install -r requirements.txt

# 需提前启动 Ollama 并拉取 qwen2.5:7b
ollama pull qwen2.5:7b && ollama serve

# 启动后端
./run.sh        # 或 python main.py
# 访问 http://127.0.0.1:8000
```

## 技术栈

- 后端：FastAPI + Uvicorn
- 模型：XGBoost surrogate、贝叶斯优化（GP/UCB）、本地 qwen2.5:7b（Ollama）
- 前端：原生 JS 3D 世界模型渲染（Three.js 风格场景）
- 设备通信：python-opcua（freeopcua）、Modbus TCP
