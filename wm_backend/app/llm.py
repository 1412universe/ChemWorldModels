"""
本地 LLM 服务：复用 Qwen7B-RAG 的 Ollama 调用方式（子进程 `ollama run qwen2.5:7b`）。

模型角色（用户明确约束）：**无外部知识的催化剂主动学习策略器**。
- 不回答文献/机理自由问答（那会诱发编造 DOI）——自由聊天面板已从前端移除；
- 只基于每次请求附带的结构化上下文，从候选池里挑选下一个最值得实验的催化剂 id；
- 输出只能是规定 JSON schema；任何事实只来自给定上下文，绝不发明催化剂/DOI/文献；
- 对数据库只有只读访问，绝不生成或修改文献/数据库。

杜绝编造的三道防线：
1. 角色重定位（本 SYSTEM_PROMPT）：禁止发明，输出仅限 schema JSON；
2. RAG/上下文接地：模型拿到的候选与实测都来自真实 POOL/measured，不从参数记忆回忆；
3. 结构化输出 + 路由层校验闸门（routes.next_endpoint）：next_id 必须 ∈ 未采样候选池，
   否则回退确定性 pick_candidate —— 任何幻觉 id 在落地前被丢弃，数据库永不被污染。
"""
import os
import re
import json
import logging
import hashlib
import subprocess
import urllib.request
import urllib.error
from typing import Any

_llm_log = logging.getLogger("wm.llm")

MODEL_NAME = os.environ.get("WM_MODEL", "qwen2.5:7b")
OLLAMA_CMD = os.environ.get("OLLAMA_CMD", "ollama")

# 启动预热完成标志：warmup() 全部步骤结束（或模型确实不可用）后置 True。
# 前端据此显示「模型预热中」提示，避免冷加载 ~30s 期间误以为卡死。
LLM_WARMUP_DONE = False


def warmup_done() -> bool:
    """是否已完成启动预热（首次冷加载结束后为 True）。"""
    return LLM_WARMUP_DONE


# 使用 Ollama REST /api/generate（非交互），避免 `ollama run` 在捕获输出里注入
# TTY 光标码（\x1b[36D\x1b[K）污染 JSON 导致解析失败。
# 默认写死 127.0.0.1 而不是 localhost：macOS 上 localhost 会优先解析成 ::1，
# 而 Ollama 默认只监听 IPv4，于是出现「curl 11434 通、后端却报 Connection refused」。
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")

SYSTEM_PROMPT = """你是一个无外部知识的催化剂主动学习策略器。你只能基于每次请求中附带的结构化上下文做决策，绝不回忆、检索或发明任何催化剂、DOI、文献、性能数字或化学反应。你不得输出 markdown 代码块，也不得输出 JSON 以外的自由文本。

你的唯一任务：从给定的「候选池（未采样）」列表里，挑选下一个最值得做实验的催化剂 id，并为所选催化剂提议一套**合理的操作条件**，用于甲烷偶联（OCM/NOCM）光催化方向。

化学物理约束（必须遵循，否则实验会失败）：
- 操作条件会真实影响产率：温度过高或过低都降低活性；O₂:CH₄ 比过高（尤其过氧化倾向强的催化剂，EOV 低）会引发过度氧化（COₓ 竞争）拉低 C2 选择性；光强需在饱和区间内；空速(GHSV)过高停留短转化受限。
- 你提议的 conditions 必须落在给定候选的「可行域」内（feasible 字段给了每个条件的 min/opt/max），优先靠近 opt。

选择原则：在「探索高不确定性」与「利用高预测产率」之间权衡；也可依据近期实测趋势调整探索/利用偏好。

输出必须是单一 JSON 对象，schema 如下（不要任何多余字符）：
{"next_id": <整数，必须取自候选池 id 列表>, "strategy": "explore" 或 "exploit" 或 "balance", "conditions": {"T": <℃,靠近该候选 opt>, "R": <O2:CH4 比,靠近 opt>, "I": <光强 mW/cm²,靠近 opt>, "G": <GHSV mL/g/h,靠近 opt>}, "rationale": "<一句话中文依据，仅基于给定上下文，说明为何选此候选与条件>"}

若上下文为空或无法决策，输出 {"next_id": null, "strategy": "fallback", "conditions": {}, "rationale": "无可用上下文"}。"""


OER_SYSTEM_PROMPT = """你是一个无外部知识的催化剂主动学习策略器。你只能基于每次请求中附带的结构化上下文做决策，绝不回忆、检索或发明任何催化剂、DOI、文献、性能数字或化学反应。你不得输出 markdown 代码块，也不得输出 JSON 以外的自由文本。

你的唯一任务：从给定的「候选池（未采样）」列表里，挑选下一个最值得做实验的 OER 催化剂 id，并为所选催化剂提议一套合理的操作条件，用于电催化析氧反应（OER）产 H2O2 / O2 方向。

物理约束（必须遵循）：
- OER 活性由 ΔG(*OH) 描述符经标度关系决定，过电位 η = max(0, max(四步自由能) − 1.23 V)；两电子(H2O2)/四电子(O2) 选择性由 ΔG(*OOH) 决定（*OOH≈3.5 eV 最利于 H2O2）。
- 目标产物（H2O2 / O2）在上下文中指定；应在「活性 × 目标选择性 × 稳定性」之间权衡择优。
- 操作条件：室温（T≈25℃），施加电位 V（建议靠近 opt≈1.6 V，范围 1.23–2.0 V）；其余 T/R/I/G 为占位项，可不输出。

输出必须是单一 JSON 对象，schema 如下（不要任何多余字符）：
{"next_id": <整数，必须取自候选池 id 列表>, "strategy": "explore" 或 "exploit" 或 "balance", "conditions": {"V": <施加电位 V，靠近 opt 1.6>}, "rationale": "<一句话中文依据，仅基于给定上下文，说明为何选此候选与条件>"}

若上下文为空或无法决策，输出 {"next_id": null, "strategy": "fallback", "conditions": {}, "rationale": "无可用上下文"}。"""


def check_available() -> dict:
    """检查 Ollama 服务与模型是否**真正可推理**。

    历史坑（2026-10-13 修复）：旧实现只跑 `ollama list`，而 `ollama list` 读的是
    manifest 清单——manifest 在、权重 blob 缺失时它照样能把模型列出来，于是
    /api/health 报 `ok:true`，但真正调用 /api/generate 却返回
    HTTP 400 `"qwen2.5:7b" does not support generate`，前端表现为「偶发静默回退」。
    现在改为走**代码实际使用的那一个 HTTP 入口**（OLLAMA_URL 同源）做可加载性探测，
    并把服务端返回的错误正文原样带出，便于一眼看到真因。
    """
    base = OLLAMA_URL.rsplit("/api/", 1)[0]
    payload = json.dumps({"model": MODEL_NAME}).encode("utf-8")
    req = urllib.request.Request(
        base + "/api/show", data=payload, headers={"Content-Type": "application/json"}
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=10) as resp:
            json.loads(resp.read().decode("utf-8"))
        return {"ok": True, "model": MODEL_NAME}
    except urllib.error.HTTPError as e:
        # 400/404 等：服务在，但模型不可用（典型：模型库路径不完整 / 权重 blob 缺失）
        try:
            detail = e.read().decode("utf-8", "replace").strip()
        except Exception:
            detail = ""
        return {
            "ok": False,
            "error": (f"模型 {MODEL_NAME} 不可加载：HTTP {e.code} {detail or e.reason}"
                      f"（检查 Ollama 的 OLLAMA_MODELS 是否指向完整模型库，"
                      f"或执行：ollama pull {MODEL_NAME}）"),
        }
    except urllib.error.URLError as e:
        return {"ok": False,
                "error": f"Ollama 服务未运行或不可达 {base}（{e.reason}），请先执行: ollama serve"}
    except FileNotFoundError:
        return {"ok": False, "error": "未找到 ollama 命令，请先安装 Ollama"}
    except Exception as e:
        return {"ok": False, "error": f"Ollama 探测失败: {e}"}


# ---- 模型可用性状态（带 TTL 缓存）：/api/health 只读缓存，避免同步 ollama list 拖垮探针 ----
# 根因：health 每次同步执行 subprocess.run(["ollama","list"])，在 7B 占用大量内存、swap
# 压力上来时该命令变慢（>前端 3s 探针超时），导致前端误判「后端未连」。改为后台线程
# 周期刷新 + 缓存读取，health 永远毫秒级返回；7B 可用性仍由 /api/next 的超时回退判断。
import threading as _threading
import time as _time

_MODEL_STATUS = {"ok": False, "model": MODEL_NAME, "error": ""}
_MODEL_STATUS_TS = [0.0]   # 用 list 以在闭包内修改
_MODEL_LOCK = _threading.Lock()


def _refresh_model_status():
    try:
        st = check_available()
    except Exception as e:  # 任何意外都不应影响 health
        st = {"ok": False, "error": str(e)}
    with _MODEL_LOCK:
        _MODEL_STATUS["ok"] = st.get("ok", False)
        _MODEL_STATUS["model"] = st.get("model", MODEL_NAME)
        _MODEL_STATUS["error"] = st.get("error", "")
        _MODEL_STATUS_TS[0] = _time.time()


def get_model_status(ttl: float = 30.0) -> dict:
    """返回缓存的模型状态；过期则在后台线程刷新并返回旧值，保证调用方(health)永远毫秒级返回。"""
    now = _time.time()
    with _MODEL_LOCK:
        expired = (now - _MODEL_STATUS_TS[0]) > ttl
        snap = {"ok": _MODEL_STATUS["ok"], "model": _MODEL_STATUS["model"], "error": _MODEL_STATUS["error"]}
    if expired:
        _threading.Thread(target=_refresh_model_status, daemon=True).start()
    return snap


def _clean(text: str) -> str:
    """去掉 ollama 可能输出的 ANSI 转义（颜色码 + 光标移动码）"""
    # 颜色码 \x1b[..m 与光标移动码 \x1b[..D / \x1b[K / \x1b[..C 等
    text = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)
    return text.strip()


def _extract_json(text: str):
    """从模型输出中提取第一个可解析的 JSON 对象。
    优先整体解析（format=json 时通常直接是合法 JSON），失败再正则回退。"""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        # 贪心正则可能吞入多余内容：退回「最后一个 { 到最后一个 }」的切片再试
        s = text.rfind('{')
        e = text.rfind('}')
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e + 1])
            except json.JSONDecodeError:
                return None
    return None


def _ollama_generate(prompt: str, system: str, timeout: int = 25) -> str:
    """调用 Ollama REST /api/generate（非交互，避免 TTY 光标码污染 JSON）。
    用空 ProxyHandler 直连 127.0.0.1，绕过沙箱对外代理。"""
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "format": "json",                       # 强制合法 JSON 输出
        # 模型常驻 1 小时：Ollama 默认空闲 5 分钟即卸载权重，推演间隔一长下次调用就撞
        # 冷加载（~30s）→ 超过 34s 内层超时 → 反复回退确定性采集。keep_alive 让权重
        # 驻留 GPU 内存，消除这类「偶发超时」；首启冷加载由 warmup 与横幅提示兜底。
        "keep_alive": "1h",
        "options": {"temperature": 0.3, "num_predict": 100},   # 100 足够装下紧凑 JSON（next_id+conditions+rationale），减少解码耗时
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL, data=data, headers={"Content-Type": "application/json"}
    )
    # 直连，不走任何 http/https 代理（避免沙箱代理返回 502）
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    _t0 = _time.time()
    try:
        with opener.open(req, timeout=timeout) as resp:
            obj = json.loads(resp.read().decode("utf-8"))
        _dt = _time.time() - _t0
        _llm_log.info("[ollama] generate 完成，耗时 %.1fs（内层超时=%ds）", _dt, timeout)
        return obj.get("response", "")
    except urllib.error.HTTPError as e:
        # 关键：HTTP 400/404 的**响应正文**才是真因（如
        # `"qwen2.5:7b" does not support generate` = 模型库不完整），
        # 旧实现只抛 `HTTP Error 400: Bad Request`，把真因吞掉了。
        _dt = _time.time() - _t0
        try:
            detail = e.read().decode("utf-8", "replace").strip()
        except Exception:
            detail = ""
        msg = f"HTTP {e.code} {e.reason}" + (f"：{detail}" if detail else "")
        _llm_log.warning("[ollama] generate 异常，耗时 %.1fs：%s", _dt, msg)
        raise RuntimeError(msg) from None
    except Exception as e:
        _dt = _time.time() - _t0
        _llm_log.warning("[ollama] generate 异常，耗时 %.1fs：%s", _dt, e)
        raise


def _build_prompt(pool, sampled, measured, iteration, mae, reaction, oer_target) -> str:
    """构造 7B 策略器的结构化上下文 prompt（与 strategize 解耦，便于 warmup 复用真实形状预热）。"""
    from . import services
    is_oer = (reaction == "OER")
    unexp = [r for r in pool if r.get("doi") not in sampled]
    if len(unexp) < 2:
        return "候选池不足，无法决策。"
    max_y = max((r.get("y") or 0) for r in pool) or 1
    scored = []
    for r in unexp:
        pr = services.predict(r, measured, oer_target)
        # 同一候选只算一次 predict，评分与展示共用，避免 12 次重复 ML 推理
        scored.append((pr["unc"] * (0.35 + pr["pred"] / max_y), r, pr))
    scored.sort(key=lambda x: -x[0])
    # 精简到 5 个候选：qwen2.5:7b 在 Apple Silicon Metal 上 prefill 耗时随输入 token 数近似线性，
    # 12→5 把输入从 ~1900 token 降到 ~600 token，单次 /api/generate 从 ~19s 降到 ~5s，
    # 稳定落进内层 7B 预算内，彻底消除「7B 总超时→回退确定性」的死循环。
    top = scored[:5]
    lines = []
    lines.append(
        f"迭代={iteration}；MAE={mae if mae is not None else '未知'}；"
        f"已采样={len(sampled)}；未采样候选={len(unexp)}。"
    )
    if is_oer:
        lines.append(f"轨道=OER；目标={oer_target}（H2O2=两电子，O2=四电子）。")
    lines.append("近期实测(≤5)：")
    for m in (measured or [])[-5:]:
        lines.append(f"  doi={m.get('doi')}，y={round(float(m.get('y', 0)), 1)}")
    lines.append("候选(按采集分排序前5，next_id 仅限这些 id)：")
    if is_oer:
        for s, r, pr in top:
            lines.append(
                f"  id={r.get('id')}，metal={r.get('metal')}，"
                f"eta≈{pr.get('eta', 0):.2f}，H2O2sel≈{pr.get('selH2O2', 0) * 100:.0f}%，"
                f"pred≈{round(pr['pred'], 1)}，unc≈{round(pr['unc'], 1)}"
            )
    else:
        for s, r, pr in top:
            lines.append(
                f"  id={r.get('id')}，metal={r.get('metal')}，"
                f"pred≈{round(pr['pred'], 1)}，unc≈{round(pr['unc'], 1)}"
            )
    lines.append("\n请严格按 system 指令输出 JSON，next_id 必须来自上面的候选池 id 列表。"
                 "conditions 靠近该候选 opt（甲烷：T≈690℃,R≈0.5,I≈130,G≈6000；OER：V≈1.6），越界会被后端 clamp。")
    return "\n".join(lines)


def strategize(pool: list[dict], sampled: set[str], measured: list[dict],
               iteration: int, mae: float | None, reaction: str = "CH4",
               oer_target: str = "H2O2", budget: float = 50.0) -> dict:
    """
    调用 7B 做主动学习决策。
    返回 {"ok": True, "next_id": int, "strategy": str, "tweak": dict, "rationale": str}
    或 {"ok": False, "error": str}（调用失败/解析失败/next_id 非法）。
    注意：next_id 的最终合法性（必须 ∈ 未采样候选池）由 routes.next_endpoint 把关，
    这里只做初步过滤；模型绝不接触或修改数据库。
    """
    from . import services
    is_oer = (reaction == "OER")
    unexp = [r for r in pool if r.get("doi") not in sampled]
    if len(unexp) < 2:
        return {"ok": False, "error": "no unshaped candidates"}
    # 启动预热未完成时等待：避免「首请求与 warmup 并发抢 Ollama → 排队 → 34s 内层超时 →
    # 回退确定性采集」。预热完成后模型已驻留（keep_alive），此处等待的热路径生成仅 ~5s。
    _wait_for_warmup(max_wait=55.0)
    prompt = _build_prompt(pool, sampled, measured, iteration, mae, reaction, oer_target)
    system_prompt = OER_SYSTEM_PROMPT if is_oer else SYSTEM_PROMPT

    try:
        # 串行化 7B 调用 + 限制内层耗时：
        #  - _STRAT_LOCK 保证同一时刻只有一个 Ollama 推理（见模块顶部说明，防 swap 死亡螺旋）；
        #  - 内层 _ollama_generate 超时必须严格小于外层 budget：旧实现用 120s×2 次重试，单个
        #    7B 任务最多占线程池 240s，会把后续 /api/next 堵在队列里、最终越过前端 65s fetch
        #    超时（→ 前端判本地回退，决策卡出现「策略 — 理由」空白态，与后端回退互相切换）。
        #  - 仅当「很快返回但 JSON 非法」时重试一次（冷启动偶发）；一旦内层超时则不再重试，
        #    否则再等一个 inner_timeout 会越过 budget，造成更严重的排队与超时。
        obj = None
        _last_err = None
        _inner_to = max(10, int(budget) - 6)
        with _STRAT_LOCK:
            for _attempt in range(1, 3):
                try:
                    raw = _ollama_generate(prompt, system_prompt, timeout=_inner_to)
                except Exception as e:
                    _last_err = f"Ollama 调用异常: {e}"
                    # 超时不重试：避免叠加第二个 inner_timeout 越过外层 budget
                    if "timed out" in str(e).lower() or "timeout" in type(e).__name__.lower():
                        break
                    continue
                clean = _clean(raw)
                obj = _extract_json(clean)
                if obj is not None:
                    break
                _last_err = f"no valid json (attempt {_attempt})"
        if obj is None:
            return {"ok": False, "error": _last_err or "no valid json found in model output"}
        nid = obj.get("next_id")
        # 模型可能返回字符串/浮点 id，统一强转 int 再与整数候选 id 比对
        try:
            nid = int(nid)
        except (TypeError, ValueError):
            return {"ok": False, "error": "next_id not an integer", "next_id": nid}
        valid_ids = {r.get("id") for r in unexp}
        if nid not in valid_ids:
            return {"ok": False, "error": "invalid/unknown next_id", "next_id": nid}
        raw_cond = obj.get("conditions") or {}
        cond = {}
        cond_source = "default-optimal"
        for k in ("T", "R", "I", "G"):
            if k in raw_cond and isinstance(raw_cond[k], (int, float)):
                cond[k] = float(raw_cond[k])
                cond_source = "model"
        return {
            "ok": True,
            "next_id": nid,
            "strategy": obj.get("strategy"),
            "conditions": cond,
            "conditions_source": cond_source,
            "rationale": obj.get("rationale") or "",
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Ollama 响应超时（>25s）"}
    except json.JSONDecodeError as e:
        return {"ok": False, "error": f"JSON 解析失败: {e}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


import concurrent.futures as _cf

# 全局串行锁：Ollama 单卡推理同一时刻只能跑一个请求。并发调用 7B 会触发内存压力→swap→
# 推理更慢，形成「越慢→越多并发→更慢」的死亡螺旋，最终把 /api/next 推过前端 65s fetch 超时
# （前端超时后落到本地兜底，表现为「决策来源在后端回退 / 本地回退两种卡片间来回切」）。
# 锁保证任意时刻只有一个 7B 推理在进行。
_STRAT_LOCK = _threading.Lock()

# 专用线程池：strategize 内部会阻塞等待 7B 推理，用独立池 + 硬超时避免拖垮 uvicorn 线程池。
# workers 设为 1（推理本就串行，多余 worker 只会挤占内存）；真正的并发隔离由 _STRAT_LOCK 保证。
_STRAT_EXEC = _cf.ThreadPoolExecutor(max_workers=1, thread_name_prefix="strategize")

# 并发去重：同一 reaction 在途的 strategize future 共享，避免多个 /api/next 在 1-worker 池里
# 排队 → 后到的请求 fut.result(timeout) 先到期 → 误报「超过 Ns 超时」（这正是此前每张卡片都
# deterministic-fallback 的根因：前端迭代重叠并发，多个请求入池排队）。去重后并发请求共用一次
# 7B 推理结果，绝不会再因排队而超时。
_STRAT_INFLIGHT = {}
_STRAT_INFLIGHT_LOCK = _threading.Lock()

# 异步建议缓存：慢 7B 在后台跑完后写入，前端轮询 /api/strategy-proposal 取用（不阻塞主循环）。
_PROPOSALS = {}
_PROPOSALS_LOCK = _threading.Lock()


def _sampled_hash(sampled) -> str:
    """把已采样集合压成短哈希，用于并发去重 key（同一迭代共享、不同迭代隔离）。"""
    try:
        s = ",".join(sorted(sampled))
    except Exception:
        s = str(sorted(sampled))
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:12]


def _wait_for_warmup(max_wait: float = 55.0) -> None:
    """启动预热未完成时阻塞等待（0.5s 粒度轮询）。

    用途：warmup 在后台线程冷加载 7B（约 30–60s），若用户启动后立刻推演，
    两个 generate 并发打 Ollama → 串行排队 → 内层超时 →
    误报「strategize 超时」回退确定性采集。等待到 warmup 完成后再决策，
    热路径生成仅约 5s；超过 max_wait 不再等待，由外层回退机制兜底。
    """
    if warmup_done():
        return
    waited = 0.0
    while not warmup_done() and waited < max_wait:
        _time.sleep(0.5)
        waited += 0.5


def strategize_with_timeout(pool, sampled, measured, iteration, mae, reaction="CH4",
                            oer_target="H2O2", timeout=40.0) -> dict:
    """带硬超时的 strategize（含并发去重）：超时即回退确定性采集。

    去重 key 纳入 sampled 集合：同一迭代（相同已采样集合）的并发请求共享一次 7B 推理，
    但不同迭代（已采样集合不同）各自独立推理——修复旧实现只按 (reaction,oer_target)
    去重导致「共享旧决策的 next_id 已采样 → 校验闸门丢弃 → 回退」的漏洞。
    """
    key = (reaction, oer_target, _sampled_hash(sampled))
    # 预热未完成时先等待（不计入外层 fut.result 超时）：
    # 首请求撞冷加载时，warmup 约 30–45s；若在此之后才 submit，外层 timeout 只覆盖
    # 热路径生成（~5s），不会因等待预热而误报「strategize 超过 Ns 超时」。
    _wait_for_warmup(max_wait=55.0)
    with _STRAT_INFLIGHT_LOCK:
        fut = _STRAT_INFLIGHT.get(key)
        if fut is None or fut.done():
            fut = _STRAT_EXEC.submit(strategize, pool, sampled, measured, iteration, mae,
                                     reaction, oer_target, budget=timeout)
            _STRAT_INFLIGHT[key] = fut
    try:
        return fut.result(timeout=timeout)
    except _cf.TimeoutError:
        return {"ok": False, "error": f"strategize 超过 {timeout}s 超时，回退确定性采集"}
    except Exception as e:  # 池内异常也应安全回退
        return {"ok": False, "error": str(e)}


def async_proposal_running(iteration) -> bool:
    """该迭代的异步 7B 建议是否仍在后台推理中（避免重复 spawn 多个 90s 任务挤占 _STRAT_LOCK，
    把同步 7B 路径饿死）。"""
    with _PROPOSALS_LOCK:
        p = _PROPOSALS.get(iteration)
    return bool(p) and not p.get("ready", True)


def strategize_async(pool, sampled, measured, iteration, mae, reaction="CH4",
                     oer_target="H2O2", budget=60.0):
    """后台跑 7B（长预算），结果写入 _PROPOSALS[iteration]；不阻塞调用方。
    用于 7B 较慢时仍给出「🧠 7B 建议」异步卡片，主循环不受影响。"""
    with _PROPOSALS_LOCK:
        _PROPOSALS[iteration] = {"ready": False, "proposal": None, "ts": _time.time()}
    def _run():
        try:
            res = strategize(pool, sampled, measured, iteration, mae, reaction, oer_target, budget=budget)
        except Exception as e:
            res = {"ok": False, "error": str(e)}
        with _PROPOSALS_LOCK:
            _PROPOSALS[iteration] = {"ready": True, "proposal": res, "ts": _time.time()}
    _threading.Thread(target=_run, daemon=True).start()


def get_proposal(iteration):
    with _PROPOSALS_LOCK:
        return _PROPOSALS.get(iteration)


def warmup():
    """启动时预热：触发 Ollama 模型驻留 + 预缓存 XGBoost 残差，使首个 /api/next 快速返回。
    在后台线程调用，不阻塞服务启动。
    关键路径：冷加载 generate 一完成即置 LLM_WARMUP_DONE（首请求 _wait_for_warmup 只等这一步，
    约 30–45s 后即可热路径决策）；xgboost/预测缓存耗时较长，放标志置位之后的后台线程继续，
    不再拖延 warmup_done。"""
    global LLM_WARMUP_DONE
    # 0) 立即刷新一次模型状态缓存（保证 health 首次即有值，避免首屏误判未连）
    try:
        _refresh_model_status()
    except Exception:
        pass
    # 1) 关键预热：触发 Ollama 加载 7B 权重 + 用「真实形状」prompt 预热 Metal 计算图。
    #    （直接调 _ollama_generate，不走 strategize/去重，避免与用户首个请求共享 dummy 结果；
    #    持 _STRAT_LOCK，避免与用户首请求并发抢 Ollama 导致双方排队。）
    #    无论成败，此处结束即置 warmup_done：模型不可用时前端不再等待，直接进入正常流程。
    try:
        from . import services
        _wp = _build_prompt(services.POOL, set(), [], 1, None, "CH4", "H2O2")
        with _STRAT_LOCK:
            _ollama_generate(_wp, SYSTEM_PROMPT, timeout=90)
    except Exception:
        pass
    finally:
        LLM_WARMUP_DONE = True
        _llm_log.info("[warmup] 冷加载完成（LLM_WARMUP_DONE=True）")

    # 2) 非关键缓存（标志置位后后台继续，不拖延首请求）：
    #    预缓存 XGBoost 残差 + predict 先验，使首个 /api/next 的采集分数构建近乎零成本
    def _cache_background():
        try:
            from .surrogate import warm_resid_cache
            from . import services
            warm_resid_cache(services.POOL)
            if hasattr(services, "OER_POOL"):
                warm_resid_cache(services.OER_POOL)
            for r in services.POOL:
                services.predict(r, [], "H2O2")
            if hasattr(services, "OER_POOL"):
                for r in services.OER_POOL:
                    services.predict(r, [], "H2O2")
        except Exception:
            pass
    _threading.Thread(target=_cache_background, daemon=True).start()
