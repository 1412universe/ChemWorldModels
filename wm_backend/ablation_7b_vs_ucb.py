"""
7B 策略器 vs 确定性 UCB ablation（论文补强第②项）

回答核心问题：7B LLM 选候选到底比确定性 UCB 好在哪？
- 同一 POOL + 固定种子 + 空初始 measured，两路独立演化
- 公平对照：都用最优条件 simulate(noise=None) 产 Y，控制变量只比"选候选"能力
- 7B 路：strategize_with_timeout(35s)；超时/非法 id 回退 UCB 并记录
- UCB 路：pick_candidate(strategy="UCB")
- 指标：regret / topk recall / PICP + 7B 成功/回退率 + 单轮耗时
诚实标注：simulator-in-the-loop（true_for 用 simulate 当 ground truth），
结论范围限定于"ChemWorld 模拟器环境下的采样效率对比"，非真实实验验证。
"""
import sys, os, json, time, random
import numpy as np

WM = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend"
sys.path.insert(0, WM)
os.chdir(WM)

from app import services, llm, evaluation

SEED = 42
N_ITERS = 25
TIMEOUT_7B = 35
TOPK = 10

random.seed(SEED)
np.random.seed(SEED)

pool = services.POOL
print(f"[ablation] POOL size = {len(pool)}", flush=True)

# ---- 预热：触发 Ollama 加载 + XGBoost 残差缓存 + 全池真值缓存 ----
print("[ablation] warmup: Ollama + resid cache + pool_truth ...", flush=True)
t0 = time.time()
try:
    llm.warmup()
except Exception as e:
    print(f"[ablation] warmup warn: {e}", flush=True)
# 预建全池真值（evaluation 内部缓存），两路共用同一 gbest
_ = evaluation.pool_truth(pool)
print(f"[ablation] warmup done in {time.time()-t0:.1f}s", flush=True)


def run_path(name, use_7b, n_iters):
    """跑一路。返回 (trajectory, stats)。"""
    rng = np.random.default_rng(SEED)
    sampled = set()
    measured = []
    traj = []
    succ = 0
    fb = 0
    dts = []
    for i in range(n_iters):
        cand = None
        used_model = False
        strat_tag = ""
        rationale = ""
        t0 = time.time()
        if use_7b:
            try:
                strat = llm.strategize_with_timeout(
                    pool, sampled, measured, i, None,
                    reaction="CH4", oer_target="H2O2", timeout=TIMEOUT_7B)
            except Exception as e:
                strat = {"ok": False, "error": f"exception:{e}"}
            if strat.get("ok") and strat.get("next_id") is not None:
                nid = strat["next_id"]
                cand = next((r for r in pool if r.get("id") == nid and r.get("doi") not in sampled), None)
                if cand is not None:
                    used_model = True
                    succ += 1
                    strat_tag = strat.get("strategy") or ""
                    rationale = (strat.get("rationale") or "")[:80]
            if cand is None:
                fb += 1
                cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
                strat_tag = "fallback"
        else:
            cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
        if cand is None:
            print(f"  [{name}] iter {i}: no candidate, stop", flush=True)
            break
        dt = time.time() - t0
        dts.append(dt)
        # 公平：都用最优条件 simulate（控制变量）
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=measured)
        Y = sim["Y"]
        pr = services.predict(cand, measured)
        traj.append({
            "cand": cand,
            "pred": pr["pred"],
            "unc": pr["unc"],
            "true": Y,
            "true_reward": sim["reward"],
            "reward_breakdown": sim,
            "iteration": i,
            "used_model": used_model,
            "dt": dt,
            "strategy": strat_tag,
            "rationale": rationale,
        })
        sampled.add(cand.get("doi"))
        measured.append({"doi": cand.get("doi"), "y": Y})
        print(f"  [{name}] iter {i:2d}: id={cand.get('id')} doi={str(cand.get('doi'))[:18]:18s} "
              f"Y={Y:8.0f} pred={pr['pred']:8.0f} unc={pr['unc']:7.0f} "
              f"model={int(used_model)} tag={strat_tag:10s} dt={dt:5.1f}s", flush=True)
    stats = {"success": succ, "fallback": fb, "n_iters_done": len(traj),
             "mean_dt": (sum(dts)/len(dts)) if dts else 0.0, "total_dt": sum(dts)}
    return traj, stats


print("\n[ablation] === Path A: UCB (baseline) ===", flush=True)
tA = time.time()
traj_ucb, st_ucb = run_path("UCB", use_7b=False, n_iters=N_ITERS)
print(f"[ablation] UCB path done in {time.time()-tA:.1f}s  (succ=0 fb=0 by def)", flush=True)

print("\n[ablation] === Path B: 7B ===", flush=True)
tB = time.time()
traj_7b, st_7b = run_path("7B", use_7b=True, n_iters=N_ITERS)
print(f"[ablation] 7B path done in {time.time()-tB:.1f}s  succ={st_7b['success']} fb={st_7b['fallback']}", flush=True)

# ---- 指标 ----
gbest = evaluation.pool_truth(pool)["best_y"]
print(f"\n[ablation] global best Y (pool_truth) = {gbest:.1f}", flush=True)

def summarize_path(traj, name):
    sids = [t["cand"].get("doi") for t in traj]
    s = evaluation.summarize(traj, pool=pool, sampled_ids=sids, topk=TOPK, z=1.96)
    reg = s["regret"]
    tk = s["topk"] or {}
    cal = s["calibration"] or {}
    cov = s["coverage"]
    return {
        "name": name,
        "n": s["n_samples"],
        "best_found": reg["best_found"],
        "simple_regret": reg["simple_regret"],
        "cumulative_regret": reg["cumulative_regret"],
        "best_so_far_curve": reg["best_so_far"],
        "topk_recall": tk.get("recall"),
        "topk_hit": tk.get("hit"),
        "picp": cal.get("picp"),
        "sharpness": cal.get("sharpness"),
        "coverage": cov,
    }

m_ucb = summarize_path(traj_ucb, "UCB")
m_7b = summarize_path(traj_7b, "7B")
m_7b["success"] = st_7b["success"]
m_7b["fallback"] = st_7b["fallback"]
m_7b["success_rate"] = st_7b["success"] / max(1, st_7b["success"] + st_7b["fallback"])
m_7b["mean_dt"] = st_7b["mean_dt"]
m_ucb["mean_dt"] = st_ucb["mean_dt"]

# ---- 结论 ----
d_simple = m_ucb["simple_regret"] - m_7b["simple_regret"]   # 正 = 7B 更好（regret 更小）
d_cum = m_ucb["cumulative_regret"] - m_7b["cumulative_regret"]
d_topk = (m_7b["topk_recall"] or 0) - (m_ucb["topk_recall"] or 0)
if m_7b["simple_regret"] < m_ucb["simple_regret"] - 0.05 * gbest:
    verdict = "7B 显著优于 UCB（simple_regret 差异 >5% gbest）"
elif m_7b["simple_regret"] > m_ucb["simple_regret"] + 0.05 * gbest:
    verdict = "7B 显著劣于 UCB（建议论文降级为可选策略器）"
else:
    verdict = "7B 与 UCB 相当（差异 <5% gbest）—— 论文可保留但非卖点"

print("\n[ablation] === SUMMARY ===", flush=True)
print(json.dumps({"ucb": m_ucb, "7b": m_7b, "delta_simple_regret(+=7Bbetter)": d_simple,
                  "delta_cum_regret(+=7Bbetter)": d_cum, "delta_topk(+=7Bbetter)": d_topk,
                  "verdict": verdict}, indent=2, ensure_ascii=False), flush=True)

# ---- 落盘 ----
OUT = "/Users/fenglongli/Downloads/ChemWorldModel/data"
out = {
    "config": {"seed": SEED, "n_iters": N_ITERS, "timeout_7b": TIMEOUT_7B, "topk": TOPK, "pool_size": len(pool)},
    "ground_truth": {"best_Y": gbest, "note": "simulator-in-the-loop: true_for=simulate(noise=None), not real experiment"},
    "ucb": m_ucb,
    "7b": m_7b,
    "delta": {"simple_regret_pos_means_7b_better": d_simple,
              "cumulative_regret_pos_means_7b_better": d_cum,
              "topk_recall_pos_means_7b_better": d_topk},
    "verdict": verdict,
    "traj_7b": [{"i": t["iteration"], "id": t["cand"].get("id"), "Y": t["true"],
                 "pred": t["pred"], "unc": t["unc"], "model": t["used_model"],
                 "tag": t["strategy"], "dt": round(t["dt"], 2)} for t in traj_7b],
    "traj_ucb": [{"i": t["iteration"], "id": t["cand"].get("id"), "Y": t["true"],
                  "pred": t["pred"], "unc": t["unc"], "dt": round(t["dt"], 2)} for t in traj_ucb],
}
with open(os.path.join(OUT, "ablation_7b_vs_ucb.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\n[ablation] JSON -> {OUT}/ablation_7b_vs_ucb.json", flush=True)
print(f"[ablation] DONE. verdict: {verdict}", flush=True)
