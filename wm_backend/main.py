"""
AI 世界模型工作室 —— 前后端分离版
后端：FastAPI + Python 世界模型 + Ollama qwen2.5:7b
启动：python main.py
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import router


class _QuietHealthAccessLog(logging.Filter):
    """把前端心跳 /api/health 从 uvicorn access log 里过滤掉，避免刷屏。

    需要看心跳时设环境变量 WM_LOG_HEALTH=1 即可恢复打印。
    """

    NOISY = ("/api/health",)

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        return not any(p in msg for p in self.NOISY)


if not os.getenv("WM_LOG_HEALTH"):
    logging.getLogger("uvicorn.access").addFilter(_QuietHealthAccessLog())

def _ensure_ollama_serve(wait_s: int = 40) -> bool:
    """若本机 11434 未就绪则静默拉起 Ollama（已在跑则复用，不弹控制台窗口）。"""
    import shutil
    import subprocess
    import time
    import urllib.request
    from pathlib import Path

    def _up() -> bool:
        try:
            urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=2)
            return True
        except Exception:
            return False

    if _up():
        return True

    def _ollama_running() -> bool:
        try:
            if os.name == "nt":
                out = subprocess.check_output(
                    ["tasklist", "/FI", "IMAGENAME eq ollama.exe"],
                    stderr=subprocess.DEVNULL,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
                    text=True,
                    timeout=5,
                )
                return "ollama.exe" in out.lower()
            out = subprocess.check_output(["pgrep", "-x", "ollama"], stderr=subprocess.DEVNULL)
            return bool(out.strip())
        except Exception:
            return False

    # 已有进程则只等端口，避免重复启动弹窗
    if _ollama_running():
        for _ in range(max(1, wait_s)):
            if _up():
                return True
            time.sleep(1)
        return _up()

    kw = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "stdin": subprocess.DEVNULL,
        "close_fds": True,
    }
    if os.name == "nt":
        # CREATE_NO_WINDOW：禁止弹出黑色终端；勿用 DETACHED_PROCESS
        kw["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        gui = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Ollama" / "Ollama.exe"
        if gui.is_file():
            cmd = [str(gui)]
        else:
            ollama = shutil.which("ollama")
            if not ollama:
                return False
            cmd = [ollama, "serve"]
    else:
        kw["start_new_session"] = True
        ollama = shutil.which("ollama")
        if not ollama:
            return False
        cmd = [ollama, "serve"]

    try:
        subprocess.Popen(cmd, **kw)
    except Exception:
        return False
    for _ in range(max(1, wait_s)):
        if _up():
            return True
        time.sleep(1)
    return False


@asynccontextmanager
async def lifespan(app):
    """启动：必要时自动起 Ollama，再预热 7B + XGBoost，使首个 /api/next 更快。"""
    import threading

    def _run():
        try:
            _ensure_ollama_serve()
            from app import llm
            llm.warmup()
        except Exception:
            pass

    threading.Thread(target=_run, daemon=True).start()
    yield


app = FastAPI(
    title="AI 世界模型工作室（甲烷偶联光催化）",
    description="Python 后端：真实文献池、世界模型预测、约束校验、主动学习、本地 LLM 问答",
    version="1.0.0",
    lifespan=lifespan,
)

# 允许前端跨域（开发时前端可能用 file:// 或 localhost）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 静态资源（HTML/JS/CSS/png）禁止缓存 —— 开发期避免浏览器 304 旧文件导致面板不刷新
@app.middleware("http")
async def _no_cache_static(request, call_next):
    resp = await call_next(request)
    p = request.url.path
    if p.startswith(("/assets/", "/static/", "/index.html", "/lab.html",
                     "/char.html", "/dft.html", "/recipe.html", "/overview_photo.html",
                     "/workflow_editor.html", "/datalog.html", "/")):
        resp.headers.update({
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        })
        if "etag" in resp.headers:
            del resp.headers["etag"]
    return resp


STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

ASSETS_DIR = os.path.join(STATIC_DIR, "assets")
if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
