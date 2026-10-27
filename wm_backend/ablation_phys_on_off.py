"""
物理因子 on/off ablation（论文补强第③项）

回答核心问题：34 条物理化学约束到底带来多少采样效率提升？
- ON 路：physics_factor 正常（约束差→预测低+σ大→少采），采集 + simulate 都用 pf
- OFF 路：采集时 patch physics_factor=1.0（关掉约束引导），但 simulate 真值用正常 pf
  → 固定 ground truth（ON 版 simulate），只关"采集阶段的物理约束引导"
- 两路共用 ON simulate 的 pool_truth 作 gbest，regret 可比
- 比的是：物理约束引导的采集是否比无约束采集更快找到真实世界的高产候选

诚实标注：simulator-in-the-loop。OFF 路 patch 仅作用于采集 predict（_knn_predict 的 pf 缩放），
XGBoost 残差缓存（预训练、相对 pf 独立）照用；故 OFF 关掉的是 pf 对 KNN 锚的缩放（物理约束主效应）。
"""
import sys, os, json, time, random
import numpy as np

WM = "/Users/fenglongli/Downloads/ChemWorld/wm_backend"
sys.path.insert(0, WM)
os.chdir(WM)

from app import services, evaluation

SEED = 42
N_ITERS = 25
TOPK = 10

random.seed(SEED)
np.random.seed(SEED)

pool = services.POOL
print(f"[ablation] POOL size = {len(pool)}", flush=True)

# 预建全池真值（ON simulate，正常 pf）—— 固定 ground truth
print("[ablation] build pool_truth (ON simulate, fixed ground truth) ...", flush=True)
t0 = time.time()
_truth = evaluation.pool_truth(pool)
print(f"[ablation] pool_truth done in {time.time()-t0:.1f}s, gbest={_truth['best_y']:.1f}", flush=True)


def run_path(name, phys_on, n_iters):
    """跑一路。phys_on=True 正常 physics_factor；=False 采集时 patch pf=1.0。"""
    rng = np.random.default_rng(SEED)
    sampled = set()
    measured = []
    traj = []
    for i in range(n_iters):
        # —— 采集阶段 ——
        services._PRED_CACHE.clear()
        if phys_on:
            cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
        else:
            # OFF：patch physics_factor=1.0 关掉约束引导（仅采集 predict）
            orig_pf = services.physics_factor
            services.physics_factor = lambda r: 1.0
            services._PRED_CACHE.clear()
            try:
                cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
            finally:
                services.physics_factor = orig_pf
                services._PRED_CACHE.clear()
        if cand is None:
            print(f"  [{name}] iter {i}: no candidate, stop", flush=True)
            break
        # —— 采集时的预测（用于 trajectory 校准）——
        # ON 用正常 pf 算 pred/unc；OFF 也用正常 pf 算（统一校准口径）
        services._PRED_CACHE.clear()
        pr = services.predict(cand, measured)
        # —— simulate 真值：始终用正常 pf（固定 ground truth）——
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=measured)
        Y = sim["Y"]
        traj.append({
            "cand": cand, "pred": pr["pred"], "unc": pr["unc"],
            "true": Y, "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i,
        })
        sampled.add(cand.get("doi"))
        measured.append({"doi": cand.get("doi"), "y": Y})
        print(f"  [{name}] iter {i:2d}: id={cand.get('id')} doi={str(cand.get('doi'))[:18]:18s} "
              f"Y={Y:8.0f} pred={pr['pred']:8.0f} unc={pr['unc']:7.0f} pf={services.physics_factor(cand):.2f}", flush=True)
    return traj


print("\n[ablation] === Path ON: physics_factor enabled ===", flush=True)
tA = time.time()
traj_on = run_path("ON", phys_on=True, n_iters=N_ITERS)
print(f"[ablation] ON path done in {time.time()-tA:.1f}s", flush=True)

print("\n[ablation] === Path OFF: physics_factor disabled (acq only) ===", flush=True)
tB = time.time()
traj_off = run_path("OFF", phys_on=False, n_iters=N_ITERS)
print(f"[ablation] OFF path done in {time.time()-tB:.1f}s", flush=True)

# ---- 指标 ----
gbest = evaluation.pool_truth(pool)["best_y"]
print(f"\n[ablation] global best Y (fixed ON ground truth) = {gbest:.1f}", flush=True)

def summarize_path(traj, name):
    sids = [t["cand"].get("doi") for t in traj]
    s = evaluation.summarize(traj, pool=pool, sampled_ids=sids, topk=TOPK, z=1.96)
    reg = s["regret"]; tk = s["topk"] or {}; cal = s["calibration"] or {}
    return {
        "name": name, "n": s["n_samples"],
        "best_found": reg["best_found"],
        "simple_regret": reg["simple_regret"],
        "cumulative_regret": reg["cumulative_regret"],
        "best_so_far_curve": reg["best_so_far"],
        "first_hit_gbest": next((i for i,v in enumerate(reg["best_so_far"]) if v>=gbest*0.999), None),
        "topk_recall": tk.get("recall"), "topk_hit": tk.get("hit"),
        "picp": cal.get("picp"), "sharpness": cal.get("sharpness"),
        "coverage": s["coverage"],
        "mean_true_Y": sum(t["true"] for t in traj)/len(traj) if traj else 0,
    }

m_on = summarize_path(traj_on, "ON(phys)")
m_off = summarize_path(traj_off, "OFF(no-phys)")

# 提升幅度（正=ON更优）
d_simple = m_off["simple_regret"] - m_on["simple_regret"]
d_cum = m_off["cumulative_regret"] - m_on["cumulative_regret"]
d_topk = (m_on["topk_recall"] or 0) - (m_off["topk_recall"] or 0)
d_hit = m_on["first_hit_gbest"] is not None and (m_off["first_hit_gbest"] is None or m_on["first_hit_gbest"] < m_off["first_hit_gbest"])

if d_cum > 0.05 * max(m_on["cumulative_regret"],1):
    verdict = "物理约束显著提升采样效率（ON 累积遗憾更低 ≥5%）—— 方法新颖性得到支持"
elif d_cum < -0.05 * max(m_on["cumulative_regret"],1):
    verdict = "物理约束反而拖累采样（OFF 更优）—— 需重新审视约束设计"
else:
    verdict = "物理约束影响不显著（差异 <5%）—— 约束主要价值可能在可解释性而非采样效率"

print("\n[ablation] === SUMMARY ===", flush=True)
print(json.dumps({"on": m_on, "off": m_off,
                  "delta_simple_regret(+=ONbetter)": d_simple,
                  "delta_cum_regret(+=ONbetter)": d_cum,
                  "delta_topk(+=ONbetter)": d_topk,
                  "on_hits_gbest_earlier": d_hit, "verdict": verdict},
                 indent=2, ensure_ascii=False), flush=True)

# ---- 落盘 ----
OUT = "/Users/fenglongli/Downloads/ChemWorld/data"
out = {
    "config": {"seed": SEED, "n_iters": N_ITERS, "topk": TOPK, "pool_size": len(pool),
               "ground_truth": "ON simulate (fixed); OFF only disables pf in acquisition predict"},
    "gbest": gbest,
    "on": m_on, "off": m_off,
    "delta": {"simple_regret_pos_ON_better": d_simple, "cumulative_regret_pos_ON_better": d_cum,
              "topk_recall_pos_ON_better": d_topk, "on_hits_gbest_earlier": d_hit},
    "verdict": verdict,
    "traj_on": [{"i":t["iteration"],"id":t["cand"].get("id"),"Y":t["true"],"pred":t["pred"],"unc":t["unc"]} for t in traj_on],
    "traj_off": [{"i":t["iteration"],"id":t["cand"].get("id"),"Y":t["true"],"pred":t["pred"],"unc":t["unc"]} for t in traj_off],
}
with open(os.path.join(OUT, "ablation_phys_on_off.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\n[ablation] JSON -> {OUT}/ablation_phys_on_off.json", flush=True)
print(f"[ablation] DONE. verdict: {verdict}", flush=True)
