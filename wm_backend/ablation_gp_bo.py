"""
第④项 GP-BO baseline 对比

纯数据高斯过程 BO（无物理约束）vs ChemWorld 的 KNN+XGB+物理约束 UCB。
- GP: sklearn GaussianProcessRegressor(Matern), 特征用 surrogate.build_features（与 XGB 同特征，公平）
- GP 不含 physics_factor（纯数据 baseline）；ground truth 仍用固定 simulate
- 首轮随机冷启动（GP 无先验），后续 GP-UCB 采集
- 25 轮，对比 regret/topk

回答：物理约束+KNN+XGB 是否优于纯数据 GP-BO？
"""
import sys, os, json, time, random
import numpy as np

WM = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend"
sys.path.insert(0, WM)
os.chdir(WM)
from app import services, evaluation
from app.surrogate import build_features
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel as C, Matern

SEED = 42
N_ITERS = 25
TOPK = 10
random.seed(SEED); np.random.seed(SEED)

pool = services.POOL
print(f"[gp-bo] POOL={len(pool)}", flush=True)

# 预算所有候选特征（与 XGB surrogate 同特征空间，公平）
print("[gp-bo] build features for all candidates ...", flush=True)
t0 = time.time()
X_pool = np.array([build_features(c) for c in pool], dtype=float)
print(f"[gp-bo] features done {time.time()-t0:.1f}s shape={X_pool.shape}", flush=True)

print("[gp-bo] build pool_truth ...", flush=True)
gbest = evaluation.pool_truth(pool)["best_y"]
print(f"[gp-bo] gbest={gbest:.1f}", flush=True)


def run_gp_bo(n_iters):
    rng = np.random.default_rng(SEED)
    measured_idx = []   # pool index of sampled
    y_measured = []
    traj = []
    kernel = C(1.0) * Matern(length_scale=np.ones(X_pool.shape[1]), nu=2.5)
    for i in range(n_iters):
        t0 = time.time()
        if not measured_idx:
            # 冷启动：随机选一个 y>0 的（模拟"无先验首轮"）
            cand_idx = int(rng.integers(0, len(pool)))
        else:
            gp = GaussianProcessRegressor(kernel=kernel, alpha=1e-6, normalize_y=True,
                                          n_restarts_optimizer=2, random_state=SEED)
            X_tr = X_pool[measured_idx]
            y_tr = np.array(y_measured)
            gp.fit(X_tr, y_tr)
            mu, sigma = gp.predict(X_pool, return_std=True)
            beta = services.acq_beta(i)
            ucb = mu + beta * sigma
            ucb[measured_idx] = -np.inf  # 排除已采样
            cand_idx = int(np.argmax(ucb))
        cand = pool[cand_idx]
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=[])
        Y = sim["Y"]
        pr = services.predict(cand, [])  # 记录 ChemWorld 预测供校准对比
        traj.append({"cand": cand, "pred": pr["pred"], "unc": pr["unc"], "true": Y,
                     "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i, "dt": time.time()-t0})
        measured_idx.append(cand_idx)
        y_measured.append(Y)
        print(f"  [GP-BO] iter {i:2d}: id={cand.get('id')} Y={Y:8.0f} pred_chemworld={pr['pred']:8.0f} dt={time.time()-t0:.1f}s", flush=True)
    return traj


def run_ucb(n_iters):
    rng = np.random.default_rng(SEED)
    sampled = set(); measured = []; traj = []
    for i in range(n_iters):
        t0 = time.time()
        cand = services.pick_candidate(pool, sampled, measured, strategy="UCB", iteration=i, rng=rng)
        cond = services.default_conditions(cand)
        sim = services.simulate_experiment(cand, cond, reuse=0, noise=None, measured=measured)
        pr = services.predict(cand, measured)
        traj.append({"cand": cand, "pred": pr["pred"], "unc": pr["unc"], "true": sim["Y"],
                     "true_reward": sim["reward"], "reward_breakdown": sim, "iteration": i, "dt": time.time()-t0})
        sampled.add(cand.get("doi")); measured.append({"doi": cand.get("doi"), "y": sim["Y"]})
        print(f"  [UCB] iter {i:2d}: id={cand.get('id')} Y={sim['Y']:8.0f} dt={time.time()-t0:.1f}s", flush=True)
    return traj


def summarize(traj, name):
    sids = [t["cand"].get("doi") for t in traj]
    s = evaluation.summarize(traj, pool=pool, sampled_ids=sids, topk=TOPK, z=1.96)
    reg = s["regret"]; tk = s["topk"] or {}; cal = s["calibration"] or {}
    return {"name": name, "n": s["n_samples"], "best_found": reg["best_found"],
            "simple_regret": reg["simple_regret"], "cumulative_regret": reg["cumulative_regret"],
            "first_hit": next((i for i, v in enumerate(reg["best_so_far"]) if v >= gbest*0.999), None),
            "topk_recall": tk.get("recall"), "picp": cal.get("picp"),
            "mean_true_Y": sum(t["true"] for t in traj)/len(traj) if traj else 0}


print("\n[gp-bo] === GP-BO (pure data, no physics) ===", flush=True)
tA = time.time()
traj_gp = run_gp_bo(N_ITERS)
m_gp = summarize(traj_gp, "GP-BO(no-phys)")
print(f"[gp-bo] GP-BO done {time.time()-tA:.1f}s cumReg={m_gp['cumulative_regret']:.0f} topk={m_gp['topk_recall']}", flush=True)

print("\n[gp-bo] === UCB (KNN+XGB+physics) ===", flush=True)
tB = time.time()
traj_ucb = run_ucb(N_ITERS)
m_ucb = summarize(traj_ucb, "UCB(KNN+XGB+phys)")
print(f"[gp-bo] UCB done {time.time()-tB:.1f}s cumReg={m_ucb['cumulative_regret']:.0f} topk={m_ucb['topk_recall']}", flush=True)

d_cum = m_ucb["cumulative_regret"] - m_gp["cumulative_regret"]  # +=GP更好
if m_gp["cumulative_regret"] < m_ucb["cumulative_regret"] - 0.05*m_ucb["cumulative_regret"]:
    verdict = "纯数据 GP-BO 累积遗憾低于物理约束 UCB ≥5%——GP 更优，物理约束未带来净收益"
elif m_gp["cumulative_regret"] > m_ucb["cumulative_regret"] + 0.05*m_ucb["cumulative_regret"]:
    verdict = "物理约束 UCB 累积遗憾低于纯 GP-BO ≥5%——物理约束+KNN+XGB 优于纯数据 GP"
else:
    verdict = "两者相当（差异<5%）——物理约束主要价值在可解释性而非采样效率优势"

print(f"\n[gp-bo] === SUMMARY ===\nGP-BO: cumReg={m_gp['cumulative_regret']:.0f} topk={m_gp['topk_recall']} 1stHit={m_gp['first_hit']}\n"
      f"UCB:   cumReg={m_ucb['cumulative_regret']:.0f} topk={m_ucb['topk_recall']} 1stHit={m_ucb['first_hit']}\n"
      f"delta_cum(+=GPbetter)={d_cum:.0f}\nverdict: {verdict}", flush=True)

OUT = "/Users/fenglongli/Downloads/ChemWorldModel/data"
out = {"config": {"seed": SEED, "n_iters": N_ITERS, "pool_size": len(pool), "gbest": gbest,
                   "gp_kernel": "Matern(nu=2.5)+Constant", "gp_alpha": 1e-6,
                   "ground_truth": "fixed simulate(noise=None)"},
       "gp_bo": m_gp, "ucb": m_ucb, "delta_cum_regret_pos_GP_better": d_cum, "verdict": verdict,
       "traj_gp": [{"i":t["iteration"],"id":t["cand"].get("id"),"Y":t["true"],"pred_cw":t["pred"]} for t in traj_gp],
       "traj_ucb": [{"i":t["iteration"],"id":t["cand"].get("id"),"Y":t["true"],"pred":t["pred"]} for t in traj_ucb]}
with open(os.path.join(OUT, "ablation_gp_bo.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\n[gp-bo] JSON -> {OUT}/ablation_gp_bo.json\n[gp-bo] DONE. {verdict}", flush=True)
