#!/usr/bin/env bash
# 启动 AI 世界模型工作室后端（qwen2.5:7b 需要 Ollama 已运行）
cd "$(dirname "$0")"
VENV="/Users/fenglongli/.workbuddy/binaries/python/envs/wm_backend"
PYTHON="$VENV/bin/python"
if [ ! -f "$PYTHON" ]; then
  echo "未找到虚拟环境 $VENV，请先安装依赖："
  echo "  python3 -m venv $VENV"
  echo "  $VENV/bin/pip install -r requirements.txt"
  exit 1
fi

if ! ollama list >/dev/null 2>&1; then
  echo "⚠ Ollama 服务未运行，请先执行：ollama serve"
  exit 1
fi

if ! ollama list | grep -q "qwen2.5:7b"; then
  echo "⚠ 模型 qwen2.5:7b 未下载，请先执行：ollama pull qwen2.5:7b"
  exit 1
fi

echo "启动 AI 世界模型工作室后端…"
echo "访问：http://127.0.0.1:8000"

# ---------------------------------------------------------------------------
# GN 510 工站后端适配器（app/gn_adapter）——可选环境变量
#
#   UNILABOS_ROOT     Uni-Lab-OS 仓库根（不设则自动探测 ~/Downloads/Uni-Lab-OS 等）
#   GN_OPCUA_URL      OPC UA 端点，默认 opc.tcp://192.168.6.6:4840
#   GN_ACTION_MODE    驱动档：simulate（默认，OPC 读写空成功、不碰硬件）
#                              | real（真实 OPC 会话）
#   GN_ALLOW_REAL     真机总闸，默认 0（关）。**要动硬件必须显式打开**
#   GN_NODE_CSV       覆盖驱动加载的节点表 CSV。默认用本适配器内由 1.4.0「点位表」
#                     生成的 app/gn_adapter/node_tables/opcua_gn1.4.0.csv
#                     （240 点位；仓库自带的 1.3.9 表有 11 处冲突、且会静默丢 2 个点）
#   GN_DEFAULT_TIMEOUT  单节点默认超时（秒），默认 180
#   GN_MAX_TIMEOUT      单节点超时上限（秒），默认 3600
#   GN_DRIVER_LOG     1 = 打开驱动详细日志（排查 OPC 问题）
#
# 想看真实 OPC 链路是否通（只读，不驱动机构）：
#   curl 'http://127.0.0.1:8000/api/gn-adapter/probe?action_mode=real'
# 想看某个工位有哪些可用动作：
#   curl 'http://127.0.0.1:8000/api/gn-adapter/status?device=gn_locking_mechanism'
# ---------------------------------------------------------------------------
echo "GN 适配器：GN_ACTION_MODE=${GN_ACTION_MODE:-simulate}  GN_ALLOW_REAL=${GN_ALLOW_REAL:-0}"
echo "           节点表=${GN_NODE_CSV:-app/gn_adapter/node_tables/opcua_gn1.4.0.csv（1.4.0 生成）}"

"$PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8000
