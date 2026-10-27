# AI 世界模型工作室 · Python 后端版

前后端分离的甲烷偶联光催化 AI 世界模型。

## 项目结构

```
wm_backend/
├── main.py                  # FastAPI 入口
├── requirements.txt         # 依赖
├── run.sh                   # 一键启动脚本
├── app/
│   ├── data.py             # 加载 catalysts_v6.json + kb_extra.json，构建 POOL/KB_ALL/ALLCAT
│   ├── services.py         # 核心：predict / compute_constraints / pick_candidate / recipe_mod / 导出
│   ├── llm.py              # 本地 qwen2.5:7b（Ollama）调用
│   ├── models.py           # Pydantic 请求/响应模型
│   └── routes.py           # FastAPI 路由
├── data/
│   ├── catalysts_v6.json   # 393 条真实 OCM 催化剂（含 review_status/active）
│   └── kb_extra.json       # 6265 条参考语料（Zavyalova/CADS/CO2RR）
└── static/
    └── world_model_v16.html # 前端（单文件，内嵌数据，可独立运行）
```

## 前置条件

1. **Ollama 已安装并运行**：https://ollama.com
2. **模型 qwen2.5:7b 已下载**：
   ```bash
   ollama pull qwen2.5:7b
   ollama serve
   ```
3. Python 3.11+

## 安装依赖

```bash
cd wm_backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

> 若使用 WorkBuddy 管理 Python，已创建隔离环境 `/Users/fenglongli/.workbuddy/binaries/python/envs/wm_backend`，可直接用。

## 启动

```bash
cd wm_backend
./run.sh
```

或手动：

```bash
cd wm_backend
/Users/fenglongli/.workbuddy/binaries/python/envs/wm_backend/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

访问：http://127.0.0.1:8000

## 前端使用

- 启动后端后，浏览器打开 `http://127.0.0.1:8000`，即可看到完整的 2D 实验室。
- 页面右下角新增 **🤖 AI 助手** 悬浮按钮，点击即可与本地 qwen2.5:7b 对话。
- 页面右上角显示后端/模型连接状态（绿色=已连接，红色=未连接）。
- **即使不启动后端**，直接双击 `static/world_model_v16.html` 仍可运行（所有数据和逻辑已内嵌），只是 AI 助手不可用。

## API 说明

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 + Ollama 模型状态 |
| `/api/state` | GET | 返回 POOL、KB_ALL、DEVICES、needs_review 计数 |
| `/api/predict` | POST | 输入 candidate + measured，返回 {pred, unc, transfer} |
| `/api/constraints` | POST | 输入 candidate，返回 47 条约束检查结果 |
| `/api/next` | POST | 主动学习选下一个候选 |
| `/api/recipe-mod` | POST | 计算 recipeMod 合成调制因子 |
| `/api/export` | POST | 导出 CSV/JSON 实验配方 |
| `/api/chat` | POST | 调用 qwen2.5:7b 问答/推荐 |
| `/api/nearest-ocm` | GET | 查找最近历史 OCM 类似物 |

## 与前端单文件版的关系

- `world_model_v16.html`：完整单文件版（6.3 MB），可双击离线运行。
- `wm_backend/static/world_model_v16.html`：与前端单文件版一致，额外增加了后端 AI 助手面板。

## 二次开发建议

- **扩展模型**：在 `app/services.py` 中替换 `predict()`，可接入 XGBoost/GNN。
- **扩展 LLM**：修改 `app/llm.py` 的 `MODEL_NAME`。
- **扩展设备**：修改 `app/data.py` 的 `DEVICES` 列表。
- **数据更新**：修改 `data/catalysts_v6.json` 或重新运行根目录的 `prepare_v15.py`。
