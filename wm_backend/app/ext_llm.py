"""
外部 LLM 对话代理（世界模型 AI 对话功能）。

- 通过用户提供的 OpenAI 兼容 API（llmapi.paratera.com）实现自然语言对话，
  并能返回可选的结构化「动作指令」(ACTION)，由前端驱动世界模型实时运行/反馈。
- 同时提供实验数据专家分析：把用户上传的 .csv/.xlsx 实测表喂给 LLM 给分析建议。
- API Key / Base URL 优先从环境变量读取，缺省使用项目给定值。
- Key 只存在于后端（环境变量 / 本文件默认值），绝不出现于前端源码，规避泄露与 CORS。
"""
import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("wm.extllm")

# —— 凭证（仅后端持有）——
# 优先级：环境变量 WM_EXT_LLM_KEY / WM_EXT_LLM_URL / WM_EXT_LLM_MODEL > 此处默认值
EXT_LLM_KEY = os.environ.get("WM_EXT_LLM_KEY", "sk-oPviNyNRevZymRbkFewi9Q")
EXT_LLM_URL = os.environ.get("WM_EXT_LLM_URL", "https://llmapi.paratera.com").rstrip("/")
EXT_LLM_MODEL = os.environ.get("WM_EXT_LLM_MODEL", "GLM-4.5-Flash")

# 本 API Key 在 paratera 上实际有权访问的模型白名单（403 报错中提取）。
# 仅这些模型能正常对话；其余（DeepSeek-V4-Pro / GLM-5 / Qwen3.x 等）均 403。
ALLOWED_MODELS = [
    "GLM-4-Flash", "GLM-4.5-Flash", "GLM-Z1-Flash", "GLM-4V-Flash",
    "GLM-CogView3-Flash", "Intern-S2-Preview",
    "PaddleOCR-VL-0.9B", "PaddleOCR-VL-1.5",
]


def _friendly_error(model: str, raw_msg: str) -> str:
    """把原始 API 错误转成用户友好的中文提示（重点处理 403 无权限）。"""
    msg = (raw_msg or "").lower()
    if "team not allowed" in msg or "team_model_access_denied" in msg or "403" in msg:
        return ("⛔ 模型「%s」当前 API Key 无访问权限（403）。本 Key 仅支持：%s。"
                "请改用 GLM-4.5-Flash（通用）或 GLM-Z1-Flash（推理）。"
                % (model, "、".join(ALLOWED_MODELS)))
    return raw_msg

SYSTEM_PROMPT = """你是一个「甲烷偶联 · AI 世界模型工作室」的对话助手，帮助用户了解和操作一套自主实验闭环系统。

系统能力（仅当用户明确要求执行某操作时，才在回复最末尾单独一行写 ACTION 指令，格式严格为 `ACTION: <指令>`，不要有多余字符）：
- ACTION: run            —— 启动/继续自主实验闭环（开始一轮轮选候选→真实/模拟实验→学习）
- ACTION: step           —— 单步推进一次操作（只看一步，便于讲解）
- ACTION: open_realdata  —— 打开「真实实验数据」上传面板（让用户拖拽/选 .csv/.xlsx/.tif 录入真实数据）
- ACTION: reaction_CH4   —— 切换到甲烷光催化偶联反应轨道
- ACTION: reaction_OER   —— 切换到 OER 电催化反应轨道（→ H₂O₂ / O₂）
- ACTION: evaluate       —— 触发主动学习评价（遗憾 / Top-k / 校准）

交互原则（严格遵守，尤其是第 2 条）：
1. 用简洁中文回答，像实验室搭档一样；
2. **以下情况绝对不要输出任何 ACTION**：用户只是打招呼（"你好""hi"）、发无意义内容（"1""test""？"）、聊天、问机理、问名字、问天气——正常回答即可；
3. 只有用户明确说了「开始运行」「跑一下」「单步」「切换到 OER」「上传数据」「评价」「执行」等**明确的执行动词**时，才在回复末尾附带对应的 ACTION 行；
4. 一次最多发一个 ACTION；不要编造系统没有的功能；
5. ACTION 行必须独占一行、以 `ACTION:` 开头，后面只跟指令名（如 `ACTION: run`），不要加注释或额外说明。前端会显示为可点击建议由用户确认后执行。"""


def _post(messages: list[dict], temperature: float = 0.5, timeout: int = 60,
          model: str | None = None, base_url: str | None = None,
          api_key: str | None = None) -> str:
    """调用 chat/completions，返回助手文本（含可能的 ACTION 行）。

    - model/base_url/api_key 均可覆盖（前端按用户选择传入）：
      * 外部常用/自定义模型：base_url=外部 API、api_key=外部 key（缺省用环境变量默认）
      * 本地模型：base_url=用户填的本地端点（如 http://127.0.0.1:11434/v1）、
        api_key 通常为空（Ollama 默认无鉴权）、model=本地模型名（如 qwen2.5:7b）
    """
    base = (base_url or EXT_LLM_URL).rstrip("/")
    # 智能拼接 chat/completions 端点，避免重复 /v1：
    # - 已以 /chat/completions 结尾 → 直接用
    # - 已以 /v1 结尾 → 拼 /chat/completions
    # - 否则 → 拼 /v1/chat/completions
    if base.endswith("/chat/completions"):
        url = base
    elif base.endswith("/v1"):
        url = base + "/chat/completions"
    else:
        url = base + "/v1/chat/completions"
    key = api_key if api_key else EXT_LLM_KEY
    mdl = model or EXT_LLM_MODEL
    payload = {
        "model": mdl,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = "Bearer " + key
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        return body["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        logger.error("[ext_llm] HTTP %s: %s", e.code, detail)
        raise RuntimeError(f"LLM 返回 {e.code}：{detail}")
    except Exception as e:
        logger.error("[ext_llm] 调用失败：%s", e)
        raise


def stream_chat(user_message: str, history: list[dict] | None = None,
                world_state: str | None = None,
                model: str | None = None, base_url: str | None = None,
                api_key: str | None = None):
    """
    流式对话生成器：逐块 yield {"type":"text","delta":<str>}，
    结束前 yield {"type":"action","value":<str|None>}。
    支持外部 API 与本地 Ollama（均 OpenAI 兼容 stream）。
    若流式失败，yield {"type":"error","delta":<msg>}。
    """
    base = (base_url or EXT_LLM_URL).rstrip("/")
    if base.endswith("/chat/completions"):
        url = base
    elif base.endswith("/v1"):
        url = base + "/chat/completions"
    else:
        url = base + "/v1/chat/completions"
    key = api_key if api_key else EXT_LLM_KEY
    mdl = model or EXT_LLM_MODEL

    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if world_state:
        msgs.append({"role": "system", "content": "当前世界模型状态：\n" + world_state})
    for h in (history or []):
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": user_message})

    payload = {"model": mdl, "messages": msgs, "temperature": 0.5, "stream": True}
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = "Bearer " + key
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)

    full = []
    got_content = False
    raw_body = b""
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            ct = resp.headers.get("Content-Type", "")
            is_stream = "event-stream" in ct or "text/plain" in ct
            for raw in resp:
                raw_body += raw
                line = raw.decode("utf-8", "replace").strip()
                if not line or not line.startswith("data:"):
                    continue
                chunk = line[len("data:"):].strip()
                if chunk == "[DONE]":
                    break
                try:
                    obj = json.loads(chunk)
                except Exception:
                    continue
                # ── 检测 API 错误响应（部分 provider 200 返回 error body）──
                if "error" in obj and isinstance(obj["error"], dict):
                    err_msg = obj["error"].get("message", str(obj["error"]))[:300]
                    logger.error("[ext_llm] API 返回 error: %s", err_msg)
                    yield {"type": "error", "delta": _friendly_error(mdl, err_msg)}
                    return
                # OpenAI / Ollama / DeepSeek 兼容：
                #   标准模型用 delta.content；
                #   DeepSeek 系列把实际文本放在 delta.reasoning_content（content 始终为空）。
                #   优先取 content，为空时 fallback 到 reasoning_content。
                delta = ""
                try:
                    d = obj["choices"][0]["delta"]
                    delta = d.get("content") or ""
                    if not delta:
                        delta = d.get("reasoning_content") or ""
                except (KeyError, IndexError, TypeError) as exc:
                    if not got_content:
                        logger.warning("[ext_llm] 非 standard chunk 格式: %s", str(obj)[:200])
                if delta:
                    got_content = True
                    full.append(delta)
                    yield {"type": "text", "delta": delta}

            # ── 非流式回退：流式解析无内容但原始响应存在 ──
            if not got_content and raw_body:
                body_text = raw_body.decode("utf-8", "replace").strip()
                try:
                    jobj = json.loads(body_text)
                    msg = (jobj.get("choices") or [{}])[0].get("message", {})
                    content = msg.get("content") or msg.get("reasoning_content") or ""
                    if content:
                        logger.info("[ext_llm] 非流式回退成功：提取到 %d 字符", len(content))
                        for ch in content:
                            yield {"type": "text", "delta": ch}
                        got_content = True
                        full.append(content)
                    elif "error" in jobj:
                        emsg = jobj["error"]
                        err_txt = emsg.get("message", str(emsg))[:300] if isinstance(emsg, dict) else str(emsg)[:300]
                        yield {"type": "error", "delta": f"模型返回错误：{err_txt}"}
                        return
                except (json.JSONDecodeError, Exception):
                    logger.warning("[ext_llm] 原始响应既非 SSE 也非有效 JSON（前 200 字符）: %s", body_text[:200])
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        logger.error("[ext_llm] stream HTTP %s: %s", e.code, detail)
        yield {"type": "error", "delta": _friendly_error(mdl, f"HTTP {e.code}：{detail}")}
        return
    except Exception as e:
        logger.error("[ext_llm] stream 失败：%s", e)
        yield {"type": "error", "delta": "对话流失败：" + str(e)[:200]}
        return

    # 兜底：流正常结束但始终没收到任何文本 delta（API 返回空/非标准格式）
    if not got_content and not full:
        logger.warning("[ext_llm] 流结束但未收到任何文本内容（model=%s, base=%s）", mdl, base)
        yield {"type": "error", "delta": f"模型（{mdl}）未返回任何内容，可能该模型不支持流式输出或名称有误。请尝试切换其他模型（如 Qwen3.6-27B）。"}
        return

    # 解析 ACTION 行（从累积文本里提取，不显示给用户）
    # 只取 ACTION: 后的第一个 token（忽略 # 注释和多余文字）
    _VALID_ACTIONS = {"run", "step", "open_realdata", "reaction_ch4", "reaction_oer", "evaluate"}
    action = None
    reply_lines = []
    for line in "".join(full).splitlines():
        s = line.strip()
        if s.startswith("ACTION:"):
            raw_a = s[len("ACTION:"):].strip().lower()
            # 只取第一个空白分隔的 token
            a = raw_a.split()[0] if raw_a else ""
            if a in _VALID_ACTIONS:
                action = a
            elif a:
                logger.warning("[ext_llm] 未知 ACTION 指令: %s（已忽略）", a)
            continue
        reply_lines.append(line)
    yield {"type": "action", "value": action}


def chat(user_message: str, history: list[dict] | None = None,
         world_state: str | None = None,
         model: str | None = None, base_url: str | None = None,
         api_key: str | None = None) -> dict:
    """
    与用户对话。返回 {reply, action}。
    - reply: 给用户的自然语言（已去掉 ACTION 行）
    - action: 解析到的动作指令字符串（如 'run' / 'step' / 'open_realdata' /
              'reaction_CH4' / 'reaction_OER' / 'evaluate'），无则为 None
    - model/base_url/api_key: 由前端按用户选择的模型/端点传入（可选）
    """
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if world_state:
        msgs.append({"role": "system", "content": "当前世界模型状态：\n" + world_state})
    for h in (history or []):
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": user_message})

    raw = _post(msgs, model=model, base_url=base_url, api_key=api_key)
    # 解析 ACTION 行（只取第一个 token）
    action = None
    reply_lines = []
    for line in raw.splitlines():
        s = line.strip()
        if s.startswith("ACTION:"):
            raw_a = s[len("ACTION:"):].strip().lower()
            a = raw_a.split()[0] if raw_a else ""
            if a in _VALID_ACTIONS:
                action = a
            continue
        reply_lines.append(line)
    reply = "\n".join(reply_lines).strip()
    return {"reply": reply, "action": action}


# ============================================================
# 实验数据专家分析（AI 对话栏文件上传用）
# 把解析后的真实实验表格（产率 / 选择性 / 催化剂 / 温度 / DOI）喂给 LLM，
# 返回面向催化方向的诊断与建议。复用 _post（OpenAI 兼容）。
# ============================================================
DATA_ANALYST_PROMPT = """你是一位催化（甲烷光催化偶联 OCM / 电催化 OER）方向的实验数据分析专家。
用户会给你一组真实实验数据（已解析为表格：催化剂 / DOI / 温度 / 产率 / 选择性），
可能附带一个具体问题。请基于数据给出专业、可执行的分析（简洁中文，分点）：
1. 数据质量与分布评估（样本量、量纲、明显异常/离群点、缺失）；
2. 产率 / 选择性随催化剂、温度等的关键规律与最优区间；
3. 与文献典型值（OCM 常用 La/Sr/Ce 基钙钛矿，C2 产率多在 5~25%，选择性 30~80%；
   OER 常见 Ir/Ru 基，过电位与 H₂O₂ 选择性为关键）的对比与差距判断；
4. 若要把这些数据作为「真实实验反馈」去精炼（fine-tune）世界模型，有哪些注意事项
   （如偏差、覆盖范围、是否需要归一化、小样本下的过拟合风险）。
只做分析建议，不编造数据；若数据不足以判断，明确说明。"""


def analyze_experimental_data(data_text: str, question: str | None = None,
                              model: str | None = None,
                              base_url: str | None = None,
                              api_key: str | None = None) -> str:
    """对解析后的实验数据表做专家分析，返回自然语言文本。"""
    user_content = data_text
    if question and question.strip():
        user_content = "【用户问题】\n" + question.strip() + "\n\n【实验数据】\n" + data_text
    msgs = [
        {"role": "system", "content": DATA_ANALYST_PROMPT},
        {"role": "user", "content": user_content},
    ]
    return _post(msgs, temperature=0.4, timeout=120, model=model, base_url=base_url, api_key=api_key)
