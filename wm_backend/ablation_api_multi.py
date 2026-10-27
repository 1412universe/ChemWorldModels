"""
扩展 LLM ablation：8 个 API 大模型 + 本地7B + UCB 共 10 方对比（第②项扩展版）
多线程并行跑各模型（独立 sampled/measured），复用 llm._build_prompt 保证公平。
key 从环境变量 PARATERA_API_KEY 读。
"""
import sys, os, json, time, random, threading
import numpy as np
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

WM = "/Users/fenglongli/Downloads/ChemWorld/wm_backend"
sys.path.insert(0, WM)
os.chdir(WM)
from app import services, llm, evaluation

SEED = 42
N_ITERS = 25
TOPK = 10
MAX_WORKERS = 4
API_URL = os.environ.get("PARATERA_API_URL", "https://llmapi.paratera.com")
API_KEY = os.environ.get("PARATERA_API_KEY", "")

# 8 个 API 模型：推理模型给大 max_tokens
MODELS = [
    {"name": "GPT-5.5", "max_tokens": 600, "timeout": 50},
    {"name": "DeepSeek-V4-Pro", "max_tokens": 1500, "timeout": 70},
    {"name": "Claude-Opus-4.8", "max_tokens": 600, "timeout": 50},
    {"name": "GLM-4.6", "max_tokens": 600, "timeout": 50},
    {"name": "Gemini-3.1-Pro-Preview", "max_tokens": 600, "timeout": 50},
    {"name": "Kimi-K3", "max_tokens": 1000, "timeout": 60},
    {"name": "Qwen3.7-Max", "max_tokens": 1200, "timeout": 60},
    {"name": "ERNIE-5.0-Thinking-Preview", "max_tokens": 1500, "timeout": 70},
]

random.seed(SEED); np.random.seed(SEED)
pool = services.POOL
print(f"[ablation] POOL={len(pool)} workers={MAX_WORKERS} models={len(MODELS)}", flush=True)
if not API_KEY:
    print("[ablation] FATAL: PARATERA_API_KEY 未设置", flush=True); sys.exit(1)

print("[ablation] build pool_truth ...", flush=True)
t0 = time.time()
gbest = evaluation.pool_truth(pool)["best_y"]
print(f"[ablation] pool_truth {time.time()-t0:.1f}s gbest={gbest:.1f}", flush=True)

_print_lock = threading.Lock()


def api_chat(model, system, prompt, max_tokens, timeout):
    payload = {"model": model, "messages": [{"role": "system", "content": system},
               {"role": "user", "content": prompt}], "temperature": 0.3, "max_tokens": max_tokens}
    req = urllib.request.Request(API_URL + "/v1/chat/completions", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())["choices"][0]["message"]["content"]


def api_strategize(mc, sampled, measured, iteration):
    unexp = [r for r in pool if r.get("doi") not in sampled]
    if len(unexp) < 2:
        return {"ok": False, "error": "no candidates"}
    prompt = llm._build_prompt(pool, sampled, measured, iteration, None, "CH4", "H2O2")
    try:
        raw = api_chat(mc["name"], llm.SYSTEM_PROMPT, prompt, mc["max_tokens"], mc["timeout"])
    except Exception as e:
        return {"ok": False, "error": f"api:{type(e).__name__}"}
    if not raw or not raw.strip():
        return {"ok": False, "error": "empty content"}
    obj = llm._extract_json(llm._clean(raw))
    if obj is None:
        return {"ok": False, "error": "no json"}
    nid = obj.get("next_id")
    try: nid = int(nid)
    except: return {"ok": False, "error": "next_id not int"}
    if nid not in {r.get("id") for r in unexp}:
        return {"ok": False, "error": "invalid next_id"}
    return {"ok": True, "next_id": nid, "strategy": obj.get("strategy")}


def run_model(mc):
    """跑一个模型 25 轮，返回 (name, traj, stats)。"""
    name = mc["name"]
    rng = np.random.default_rng(SEED)
    sampled = set(); measured = []; traj = []; succ = fb = 0; dts = []
    for i in range(N_ITERS):
        t0 = time.time()
        strat = api_strategize(mc, sampled, measured, i)
        if strat.get("ok"):
            cand = next((r for r in pool if r.get("id") == strat["next_id"] and r.get("doi") not in sampled), None)
            if cand: succ += 1
        if not strat.get("ok") or cand is None:
            fb += 1
            cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
        if cand is None: break
        dt = time.time() - t0; dts.append(dt)
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=measured)
        pr = services.predict(cand, measured)
        traj.append({"cand": cand, "pred": pr["pred"], "unc": pr["unc"], "true": sim["Y"],
                     "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i, "dt": dt})
        sampled.add(cand.get("doi")); measured.append({"doi": cand.get("doi"), "y": sim["Y"]})
        if i % 5 == 0 or i == N_ITERS - 1:
            with _print_lock:
                print(f"  [{name}] iter {i:2d} Y={sim['Y']:8.0f} dt={dt:4.1f}s succ_so_far={succ}", flush=True)
    return name, traj, {"success": succ, "fallback": fb, "mean_dt": (sum(dts)/len(dts)) if dts else 0}


def summarize(traj, name):
    sids = [t["cand"].get("doi") for t in traj]
    s = evaluation.summarize(traj, pool=pool, sampled_ids=sids, topk=TOPK, z=1.96)
    reg = s["regret"]; tk = s["topk"] or {}; cal = s["calibration"] or {}
    return {"name": name, "n": s["n_samples"], "best_found": reg["best_found"],
            "simple_regret": reg["simple_regret"], "cumulative_regret": reg["cumulative_regret"],
            "first_hit": next((i for i, v in enumerate(reg["best_so_far"]) if v >= gbest*0.999), None),
            "topk_recall": tk.get("recall"), "picp": cal.get("picp"),
            "mean_true_Y": sum(t["true"] for t in traj)/len(traj) if traj else 0}


# ---- UCB 基线（串行，快）----
print("\n[ablation] === UCB baseline ===", flush=True)
tA = time.time()
rng = np.random.default_rng(SEED); su = set(); mu = []; tu = []
for i in range(N_ITERS):
    c = services.pick_candidate(pool, su, mu, strategy="UCB", iteration=i, rng=rng)
    sim = services.simulate_experiment(c, services.default_conditions(c), reuse=0, noise=None, measured=mu)
    pr = services.predict(c, mu)
    tu.append({"cand": c, "pred": pr["pred"], "unc": pr["unc"], "true": sim["Y"], "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i, "dt": 0})
    su.add(c.get("doi")); mu.append({"doi": c.get("doi"), "y": sim["Y"]})
m_ucb = summarize(tu, "UCB")
print(f"[ablation] UCB done {time.time()-tA:.1f}s cumReg={m_ucb['cumulative_regret']:.0f} topk={m_ucb['topk_recall']}", flush=True)

# ---- 8 模型并行 ----
print(f"\n[ablation] === {len(MODELS)} models parallel (workers={MAX_WORKERS}) ===", flush=True)
tB = time.time()
results = {"ucb": m_ucb}
trajs_all = {"ucb": tu}
with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
    futs = {ex.submit(run_model, mc): mc for mc in MODELS}
    for fut in as_completed(futs):
        name, traj, st = fut.result()
        m = summarize(traj, name)
        m["success"] = st["success"]; m["fallback"] = st["fallback"]
        m["success_rate"] = st["success"]/max(1, st["success"]+st["fallback"]); m["mean_dt"] = st["mean_dt"]
        results[name] = m; trajs_all[name] = traj
        print(f"[ablation] DONE {name}: cumReg={m['cumulative_regret']:.0f} topk={m['topk_recall']} "
              f"succ={st['success']}/{st['success']+st['fallback']} dt={st['mean_dt']:.1f}s", flush=True)
print(f"[ablation] all models done in {time.time()-tB:.1f}s", flush=True)

# ---- 读本地7B ----
prev = "/Users/fenglongli/Downloads/ChemWorld/data/ablation_7b_vs_ucb.json"
if os.path.exists(prev):
    with open(prev) as f: prevj = json.load(f)
    if prevj.get("7b"): results["7B(local)"] = prevj["7b"]
    print("[ablation] loaded local 7B", flush=True)

# ---- 汇总表 ----
print("\n[ablation] === SUMMARY (10-way) ===", flush=True)
print(f"{'name':26s}{'cumReg':>9s}{'vsUCB':>7s}{'topk':>6s}{'meanY':>7s}{'succ%':>6s}{'dt/s':>6s}{'1stHit':>7s}", flush=True)
ucb_cr = m_ucb["cumulative_regret"]
rows = []
for k, r in results.items():
    cr = r["cumulative_regret"]; vs = (cr-ucb_cr)/ucb_cr*100
    sr = r.get("success_rate"); sr = f"{sr*100:.0f}" if sr is not None else "-"
    rows.append((k, r, vs))
    print(f"{r['name']:26s}{cr:9.0f}{vs:6.1f}%{(r.get('topk_recall') or 0):6.2f}{r.get('mean_true_Y',0):7.0f}"
          f"{sr:>6s}{r.get('mean_dt',0):6.1f}{str(r.get('first_hit')):>7s}", flush=True)

winners = [r for k,r,vs in rows if vs < -2 and k != "ucb"]
if winners:
    verdict = f"{len(winners)} 个 LLM 累积遗憾低于 UCB ≥2%：{[r['name'] for r in winners]}"
else:
    worst = max(rows, key=lambda x: x[2])
    best_llm = min((x for x in rows if x[0]!="ucb"), key=lambda x: x[2])
    verdict = (f"所有 LLM 累积遗憾均不低于 UCB。最佳 LLM={best_llm[1]['name']}"
               f"(+{best_llm[2]:.1f}%)，最差={worst[1]['name']}(+{worst[2]:.1f}%)")
print(f"\n[ablation] verdict: {verdict}", flush=True)

# ---- 落盘 ----
OUT = "/Users/fenglongli/Downloads/ChemWorld/data"
out = {"config": {"seed": SEED, "n_iters": N_ITERS, "pool_size": len(pool), "gbest": gbest,
                   "models": [m["name"] for m in MODELS], "workers": MAX_WORKERS},
       "results": results, "verdict": verdict,
       "trajs": {k: [{"i": t["iteration"], "Y": t["true"], "pred": t["pred"], "dt": round(t["dt"],2)} for t in v]
                 for k, v in trajs_all.items()}}
with open(os.path.join(OUT, "ablation_api_multi.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\n[ablation] JSON -> {OUT}/ablation_api_multi.json", flush=True)
print(f"[ablation] DONE. {verdict}", flush=True)
