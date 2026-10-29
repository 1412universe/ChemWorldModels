"""
API 大模型策略器 vs UCB ablation（第②项升级版）

把本地 Ollama 7B 换成 paratera API 云端大模型，看更强的模型能否赢过 UCB。
- 复用 llm._build_prompt + SYSTEM_PROMPT（与本地 7B 同 prompt，公平）
- 复用 llm._clean / _extract_json（同样的 JSON 解析与 next_id 校验闸门）
- 模型：DeepSeek-V4-Pro（推理强）+ GPT-5.5（通用最强），与本地 7B（已有结果）+ UCB 四方对比
- 失败/超时/非法 id 回退 UCB 并记录（与本地 7B ablation 同口径）
- key 从环境变量 PARATERA_API_KEY 读，不硬编码

诚实标注：simulator-in-the-loop；单 seed。
"""
import sys, os, json, time, random
import numpy as np
import urllib.request

WM = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend"
sys.path.insert(0, WM)
os.chdir(WM)

from app import services, llm, evaluation

SEED = 42
N_ITERS = 25
TOPK = 10
API_URL = os.environ.get("PARATERA_API_URL", "https://llmapi.paratera.com")
API_KEY = os.environ.get("PARATERA_API_KEY", "")

# 模型配置：推理模型给大 max_tokens（reasoning_content 占预算）
MODELS = [
    {"name": "DeepSeek-V4-Pro", "max_tokens": 1500, "timeout": 60},
    {"name": "GPT-5.5", "max_tokens": 500, "timeout": 40},
]

random.seed(SEED)
np.random.seed(SEED)

pool = services.POOL
print(f"[ablation] POOL size = {len(pool)}", flush=True)
if not API_KEY:
    print("[ablation] FATAL: PARATERA_API_KEY 未设置", flush=True); sys.exit(1)

print("[ablation] build pool_truth ...", flush=True)
t0 = time.time()
_truth = evaluation.pool_truth(pool)
gbest = _truth["best_y"]
print(f"[ablation] pool_truth done {time.time()-t0:.1f}s, gbest={gbest:.1f}", flush=True)


# ---------- API 调用 ----------
def api_chat(model, system, prompt, max_tokens, timeout):
    payload = {"model": model,
               "messages": [{"role": "system", "content": system},
                            {"role": "user", "content": prompt}],
               "temperature": 0.3, "max_tokens": max_tokens}
    req = urllib.request.Request(
        API_URL + "/v1/chat/completions", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # 直连不走代理
    with opener.open(req, timeout=timeout) as resp:
        obj = json.loads(resp.read().decode())
    return obj["choices"][0]["message"]["content"]


def api_strategize(model_cfg, pool, sampled, measured, iteration, mae,
                   reaction="CH4", oer_target="H2O2"):
    """复用 llm 的 prompt 构造 + JSON 解析 + next_id 校验，只把底层换成 API。"""
    unexp = [r for r in pool if r.get("doi") not in sampled]
    if len(unexp) < 2:
        return {"ok": False, "error": "no candidates"}
    prompt = llm._build_prompt(pool, sampled, measured, iteration, mae, reaction, oer_target)
    system = llm.OER_SYSTEM_PROMPT if reaction == "OER" else llm.SYSTEM_PROMPT
    try:
        raw = api_chat(model_cfg["name"], system, prompt,
                       model_cfg["max_tokens"], model_cfg["timeout"])
    except Exception as e:
        return {"ok": False, "error": f"api:{type(e).__name__}:{e}"}
    if not raw or not raw.strip():
        return {"ok": False, "error": "empty content (reasoning ate budget?)"}
    obj = llm._extract_json(llm._clean(raw))
    if obj is None:
        return {"ok": False, "error": "no valid json"}
    nid = obj.get("next_id")
    try:
        nid = int(nid)
    except (TypeError, ValueError):
        return {"ok": False, "error": "next_id not int", "next_id": nid}
    valid = {r.get("id") for r in unexp}
    if nid not in valid:
        return {"ok": False, "error": "invalid next_id", "next_id": nid}
    cond = {}
    for k in ("T", "R", "I", "G"):
        v = (obj.get("conditions") or {}).get(k)
        if isinstance(v, (int, float)):
            cond[k] = float(v)
    return {"ok": True, "next_id": nid, "strategy": obj.get("strategy"),
            "conditions": cond, "rationale": (obj.get("rationale") or "")[:80]}


# ---------- 跑一路 ----------
def run_path(name, kind, n_iters, model_cfg=None):
    """kind: 'ucb' | 'api'。返回 (traj, stats)。"""
    rng = np.random.default_rng(SEED)
    sampled = set()
    measured = []
    traj = []
    succ = fb = 0
    dts = []
    for i in range(n_iters):
        cand = None
        used_model = False
        tag = ""
        t0 = time.time()
        if kind == "api":
            strat = api_strategize(model_cfg, pool, sampled, measured, i, None)
            if strat.get("ok") and strat.get("next_id") is not None:
                cand = next((r for r in pool if r.get("id") == strat["next_id"]
                             and r.get("doi") not in sampled), None)
                if cand is not None:
                    used_model = True
                    succ += 1
                    tag = strat.get("strategy") or ""
            if cand is None:
                fb += 1
                cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
                tag = "fallback"
        else:
            cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
        if cand is None:
            break
        dt = time.time() - t0
        dts.append(dt)
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=measured)
        Y = sim["Y"]
        pr = services.predict(cand, measured)
        traj.append({"cand": cand, "pred": pr["pred"], "unc": pr["unc"], "true": Y,
                     "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i,
                     "used_model": used_model, "dt": dt, "tag": tag})
        sampled.add(cand.get("doi"))
        measured.append({"doi": cand.get("doi"), "y": Y})
        print(f"  [{name}] iter {i:2d}: id={cand.get('id')} doi={str(cand.get('doi'))[:16]:16s} "
              f"Y={Y:8.0f} pred={pr['pred']:8.0f} model={int(used_model)} tag={str(tag):9s} dt={dt:5.1f}s",
              flush=True)
    return traj, {"success": succ, "fallback": fb, "mean_dt": (sum(dts)/len(dts)) if dts else 0}


def summarize_path(traj, name):
    sids = [t["cand"].get("doi") for t in traj]
    s = evaluation.summarize(traj, pool=pool, sampled_ids=sids, topk=TOPK, z=1.96)
    reg = s["regret"]; tk = s["topk"] or {}; cal = s["calibration"] or {}
    return {"name": name, "n": s["n_samples"], "best_found": reg["best_found"],
            "simple_regret": reg["simple_regret"], "cumulative_regret": reg["cumulative_regret"],
            "best_so_far_curve": reg["best_so_far"],
            "first_hit": next((i for i, v in enumerate(reg["best_so_far"]) if v >= gbest*0.999), None),
            "topk_recall": tk.get("recall"), "topk_hit": tk.get("hit"),
            "picp": cal.get("picp"), "sharpness": cal.get("sharpness"),
            "coverage": s["coverage"], "mean_true_Y": sum(t["true"] for t in traj)/len(traj) if traj else 0}


# ---- 跑 UCB ----
print("\n[ablation] === UCB baseline ===", flush=True)
tA = time.time()
traj_ucb, st_ucb = run_path("UCB", "ucb", N_ITERS)
m_ucb = summarize_path(traj_ucb, "UCB")
print(f"[ablation] UCB done {time.time()-tA:.1f}s", flush=True)

# ---- 跑各 API 模型 ----
results = {"ucb": m_ucb}
trajs = {"ucb": traj_ucb}
for mc in MODELS:
    print(f"\n[ablation] === {mc['name']} ===", flush=True)
    tB = time.time()
    traj_m, st_m = run_path(mc["name"], "api", N_ITERS, model_cfg=mc)
    m_m = summarize_path(traj_m, mc["name"])
    m_m["success"] = st_m["success"]; m_m["fallback"] = st_m["fallback"]
    m_m["success_rate"] = st_m["success"]/max(1, st_m["success"]+st_m["fallback"])
    m_m["mean_dt"] = st_m["mean_dt"]
    results[mc["name"]] = m_m
    trajs[mc["name"]] = traj_m
    print(f"[ablation] {mc['name']} done {time.time()-tB:.1f}s  succ={st_m['success']} fb={st_m['fallback']}", flush=True)

# ---- 读本地 7B 已有结果 ----
prev = "/Users/fenglongli/Downloads/ChemWorldModel/data/ablation_7b_vs_ucb.json"
m_7b = None
if os.path.exists(prev):
    with open(prev) as f:
        prevj = json.load(f)
    m_7b = prevj.get("7b")
    if m_7b:
        results["7B(local-Ollama)"] = m_7b
    print(f"[ablation] loaded local 7B results from {prev}", flush=True)

# ---- 结论 ----
print("\n[ablation] === SUMMARY (4-way) ===", flush=True)
order = ["ucb", "7B(local-Ollama)"] + [m["name"] for m in MODELS]
print(f"{'name':22s} {'simpReg':>8s} {'cumReg':>9s} {'topk':>6s} {'meanY':>7s} {'succ%':>6s} {'dt/s':>6s} {'1stHit':>7s}")
for k in order:
    r = results.get(k)
    if not r: continue
    sr = r.get("success_rate"); sr = f"{sr*100:.0f}" if sr is not None else "-"
    print(f"{r['name']:22s} {r['simple_regret']:8.0f} {r['cumulative_regret']:9.0f} "
          f"{(r.get('topk_recall') or 0):6.2f} {r.get('mean_true_Y',0):7.0f} "
          f"{sr:>6s} {r.get('mean_dt',0):6.1f} {str(r.get('first_hit')):>7s}", flush=True)

# 哪个 API 模型最可能赢 UCB
best_api = None
for mname in [m["name"] for m in MODELS]:
    r = results.get(mname)
    if r and r["cumulative_regret"] < m_ucb["cumulative_regret"] - 0.02*m_ucb["cumulative_regret"]:
        if best_api is None or r["cumulative_regret"] < best_api["cumulative_regret"]:
            best_api = r
if best_api:
    verdict = f"{best_api['name']} 累积遗憾低于 UCB ≥2%，LLM 策略器在足够强模型下有价值"
else:
    verdict = "所有 API 大模型累积遗憾均不低于 UCB——LLM 策略器在该任务上不优于确定性 UCB"
print(f"\n[ablation] verdict: {verdict}", flush=True)

# ---- 落盘 ----
OUT = "/Users/fenglongli/Downloads/ChemWorldModel/data"
out = {"config": {"seed": SEED, "n_iters": N_ITERS, "topk": TOPK, "pool_size": len(pool),
                   "ground_truth": "simulate(noise=None) fixed", "gbest": gbest,
                   "models": [m["name"] for m in MODELS]},
       "results": results, "verdict": verdict,
       "trajs": {k: [{"i":t["iteration"],"id":t["cand"].get("id"),"Y":t["true"],
                      "pred":t["pred"],"unc":t["unc"],"model":t["used_model"],"dt":round(t["dt"],2)} for t in v]
                 for k, v in trajs.items()}}
with open(os.path.join(OUT, "ablation_api_vs_ucb.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\n[ablation] JSON -> {OUT}/ablation_api_vs_ucb.json", flush=True)
print(f"[ablation] DONE. {verdict}", flush=True)
