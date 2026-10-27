#!/bin/bash
# ============================================================
# 甲烷偶联 AI 世界模型工作室 · 一键启动（Ollama 7B + 后端）
# ------------------------------------------------------------
# 用法：在【真实机器】的终端里、wm_backend 目录下执行
#        bash run_studio.sh
# 启动后，务必在浏览器地址栏直接打开：
#        http://127.0.0.1:8000/
# （不要用 WorkBuddy 的 HTTPS 预览面板 —— 它会代理 / 和静态资源，
#   但不代理 /api/*，从而把对 127.0.0.1:8000 的 fetch 判为混合内容拦截，
#   导致「🔴 后端未连」的假红灯。）
#
# 说明：
#  - Ollama 用我们配好的 OLLAMA_MODELS 指向 ChemWorld 副本
#    (/Users/fenglongli/Downloads/ChemWorld/models/qwen2.5-7b)；
#    若你本机 Ollama.app 已在跑（默认 store 也含 qwen2.5:7b），脚本会直接复用，不冲突。
#  - 后端以 python3 main.py 前台运行（Ctrl+C 停止）；Ollama 后台常驻。
# ============================================================
set -e
cd "$(dirname "$0")"

# ---- 0) 选择 Python 解释器 ----
# 后端需要 fastapi / uvicorn / python-multipart / xgboost / scikit-learn / openpyxl。
# 优先用 WorkBuddy 托管 venv（已装齐全部依赖，且 xgboost 的 libomp rpath 已修复），
# 这样在 (base) 等缺依赖的环境下也能直接跑，不污染系统 Python、也无需重装 xgboost。
# 如需自包含/可移植：先 `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`，
# 脚本会自动优先使用 ./.venv。
if [ -x "./.venv/bin/python" ]; then
  PY="./.venv/bin/python"
  echo "[run_studio] 使用本地 .venv 解释器"
elif [ -x "${HOME}/.workbuddy/binaries/python/envs/wm_backend/bin/python" ]; then
  PY="${HOME}/.workbuddy/binaries/python/envs/wm_backend/bin/python"
  echo "[run_studio] 使用 WorkBuddy 托管 venv 解释器"
else
  PY="$(command -v python3)"
  echo "[run_studio] 未找到专用 venv，退回系统 python3（$PY）；若报缺依赖请先：pip install -r requirements.txt"
fi

OLLAMA_MODELS_DIR="/Users/fenglongli/Downloads/ChemWorld/models/qwen2.5-7b"
export OLLAMA_MODELS="$OLLAMA_MODELS_DIR"
# 模型常驻内存：避免每轮 /api/next 之间模型被卸载、下次重新加载（冷加载是 7B 超时的主要来源之一）
export OLLAMA_KEEP_ALIVE=-1

ollama_up() {
  # --noproxy '*' 绕过任何 http 代理，直连本机 11434
  curl -s -o /dev/null --noproxy '*' --max-time 2 http://127.0.0.1:11434/api/tags 2>/dev/null
}

# ---- 1) 确保 Ollama（真实机器）在跑 ----
if ollama_up; then
  echo "[run_studio] Ollama 已在 11434 运行，复用现有实例。"
else
  echo "[run_studio] 启动 ollama serve（OLLAMA_MODELS=$OLLAMA_MODELS_DIR，后台常驻）..."
  nohup ollama serve > /tmp/ollama_serve.log 2>&1 &
  disown
  for i in $(seq 1 40); do
    if ollama_up; then echo "[run_studio] Ollama 就绪（${i}s）。"; break; fi
    sleep 1
  done
fi

# 确认 7B 模型可见
if ollama list 2>/dev/null | grep -q "qwen2.5:7b"; then
  echo "[run_studio] qwen2.5:7b 可见 ✅"
else
  echo "[run_studio] ⚠️ 未检测到 qwen2.5:7b，请检查 OLLAMA_MODELS 指向的副本是否完整。"
fi

# ---- 2) 启动后端（前台；Ctrl+C 停止）----
if lsof -iTCP:8000 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "[run_studio] 8000 已被占用（后端可能已在跑）。直接打开 http://127.0.0.1:8000/ 即可。"
  echo "[run_studio] 如需重启后端，先结束占用 8000 的进程再运行本脚本。"
  exit 0
fi

echo "[run_studio] 启动后端 uvicorn → http://127.0.0.1:8000 ..."
exec "$PY" main.py
