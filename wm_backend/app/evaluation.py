"""
主动学习 / RL 评价机制（Task #37）

提供对「世界模型采样轨迹」的客观评价。所有函数均为纯函数，输入一段 trajectory
（逐步采样记录）与候选池，输出标准指标，便于前端面板与 /api/evaluate 复用。

trajectory 中每一条目建议字段：
    {
      'cand': dict,            # 候选催化剂（含 doi/metal/support/...）
      'pred': float,           # 采集时的预测 μ（产率或活性）
      'unc': float,            # 采集时的预测 σ
      'true': float,           # 真实目标值（如最优条件下的真实产率 Y）
      'true_reward': float,    # 真实归一化奖励 ∈[0,1]
      'reward_breakdown': dict,# simulate_experiment 返回的奖励分项（含 contrib）
      'iteration': int,
    }

指标覆盖四类诉求：
    1)  regret（简单/累积遗憾）—— 采样效率核心；
    2)  top-k recall / hit rate —— 是否命中真正的高产候选；
    3)  calibration（PICP + sharpness）—— 替代器不确定性是否可信；
    4)  coverage / reward 分解 —— 探索多样性与奖励归因。
"""
import math
from . import services


# ------------------------------------------------------------
# 真实目标值（以「最优操作条件、reuse=0、无噪声」的模拟为 ground truth）
# ------------------------------------------------------------
def true_for(cand: dict, reuse: int = 0) -> tuple[float, float, float]:
    """返回 (true_Y, true_reward, s_eff)。CH4 与 OER 自动路由。"""
    cond = services.default_conditions(cand)
    sim = services.simulate_experiment(cand, cond, reuse=reuse, noise=None)
    return sim['Y'], sim['reward'], sim['s_eff']


def true_full(cand: dict, reuse: int = 0) -> dict:
    """完整真值模拟结果（含 reward_breakdown），供 trajectory 构建复用。"""
    cond = services.default_conditions(cand)
    return services.simulate_experiment(cand, cond, reuse=reuse, noise=None)


# ------------------------------------------------------------
# 全池真值缓存
# ------------------------------------------------------------
# 自动评价开启后 /api/evaluate 会被每轮调用；若每次都对整池（380 条）跑 simulate，
# 单次请求就是 380 次物理模拟。池是不可变的模块级常量，故按 (id, len, 目标) 缓存。
_TRUTH_CACHE: dict = {}


def pool_truth(pool: list[dict], key_extra: str = "") -> dict:
    """返回 {'ranked': [doi...降序], 'best_y': float, 'y_by_doi': {doi: Y}}（带缓存）。"""
    key = (id(pool), len(pool), key_extra)
    hit = _TRUTH_CACHE.get(key)
    if hit is not None:
        return hit
    rows = []
    for r in pool:
        try:
            y = true_for(r)[0]
        except Exception:
            y = 0.0
        rows.append((r.get('doi'), y))
    rows.sort(key=lambda x: x[1], reverse=True)
    out = {
        'ranked': [d for d, _ in rows],
        'best_y': rows[0][1] if rows else 0.0,
        'y_by_doi': dict(rows),
    }
    _TRUTH_CACHE[key] = out
    return out


def clear_truth_cache() -> None:
    _TRUTH_CACHE.clear()


# ------------------------------------------------------------
# 1) 遗憾（regret）
# ------------------------------------------------------------
def regret_metrics(trajectory: list[dict], global_best: float | None = None) -> dict:
    """遗憾指标。

    global_best 必须是**整个候选池**的最优真值；若缺省则退化为轨迹内最优，
    此时 simple_regret 恒为 0（自比无意义），仅作无池信息时的兜底。
    """
    ys = [t['true'] for t in trajectory if 'true' in t]
    if not ys:
        return {'best_true': 0.0, 'best_found': 0.0, 'simple_regret': 0.0,
                'cumulative_regret': 0.0, 'best_so_far': [], 'n': 0,
                'baseline': 'empty'}
    traj_best = max(ys)
    best_true = float(global_best) if global_best is not None else traj_best
    if best_true < traj_best:          # 观测超过池真值（噪声/用户配方）→ 以观测为准
        best_true = traj_best
    best_so_far = []
    cum = 0.0
    simple = []
    for i, y in enumerate(ys):
        bsf = max(ys[:i + 1])
        best_so_far.append(bsf)
        cum += max(0.0, best_true - y)         # 每步相对全局最优的实际损失
        simple.append(max(0.0, best_true - bsf))  # 已发现最优与全局最优之差
    return {
        'best_true': best_true,
        'best_found': traj_best,
        'simple_regret': simple[-1],
        'cumulative_regret': cum,
        'best_so_far': best_so_far,
        'simple_curve': simple,
        'n': len(ys),
        'baseline': 'pool' if global_best is not None else 'trajectory',
    }


# ------------------------------------------------------------
# 2) Top-k 召回
# ------------------------------------------------------------
def topk_recall(pool: list[dict], sampled_ids: list[str], k: int = 10,
                key_extra: str = "") -> dict:
    truth = pool_truth(pool, key_extra)          # 缓存：避免每次请求重跑全池模拟
    topk = truth['ranked'][:k]
    hit = len(set(topk) & set(sampled_ids))
    return {
        'k': k,
        'topk_ids': topk,
        'hit': hit,
        'recall': (hit / k) if k else 0.0,
    }


# ------------------------------------------------------------
# 3) 校准（PICP + sharpness）
# ------------------------------------------------------------
def calibration_picp(trajectory: list[dict], z: float = 1.96) -> dict:
    """预测区间覆盖概率（PICP）与锐度（平均区间宽度）。
    PICP≈置信水平（z=1.96 → 期望 0.95）说明不确定度可信；锐度越小越好（越精确）。"""
    n = len(trajectory)
    if n == 0:
        return {'picp': None, 'sharpness': None, 'n': 0, 'z': z}
    cover = 0
    widths = []
    for t in trajectory:
        mu = t.get('pred')
        sig = t.get('unc')
        if mu is None or sig is None:
            continue
        lo = mu - z * sig
        hi = mu + z * sig
        widths.append(hi - lo)
        if lo <= t['true'] <= hi:
            cover += 1
    m = len(widths)
    return {
        'picp': (cover / m) if m else None,
        'sharpness': (sum(widths) / m) if m else None,
        'n': m,
        'z': z,
    }


# ------------------------------------------------------------
# 4) 探索覆盖度（化学空间多样性）
# ------------------------------------------------------------
def exploration_coverage(sampled: list[dict]) -> float:
    if len(sampled) < 2:
        return 0.0
    ds = []
    for i in range(len(sampled)):
        for j in range(i + 1, len(sampled)):
            ds.append(services.dist(sampled[i], sampled[j]))
    return (sum(ds) / len(ds)) if ds else 0.0


# ------------------------------------------------------------
# 5) 奖励分项贡献分解（归因）
# ------------------------------------------------------------
def reward_contrib(trajectory: list[dict]) -> dict:
    agg = {}
    for t in trajectory:
        rb = t.get('reward_breakdown') or {}
        c = rb.get('contrib', {}) if isinstance(rb, dict) else {}
        for k_, v in c.items():
            agg[k_] = agg.get(k_, 0.0) + float(v)
    # 归一化到占比
    tot = sum(agg.values()) or 1.0
    return {k_: {'sum': v, 'share': v / tot} for k_, v in agg.items()}


# ------------------------------------------------------------
# 统一入口：从 trajectory 计算全部指标
# ------------------------------------------------------------
def summarize(trajectory: list[dict], pool: list[dict] | None = None,
              sampled_ids: list[str] | None = None, topk: int = 10,
              z: float = 1.96, key_extra: str = "") -> dict:
    sampled_ids = sampled_ids or [t.get('cand', {}).get('doi') for t in trajectory]
    sampled_records = [t.get('cand') for t in trajectory if t.get('cand')]
    # 全局最优基准来自整池真值（缓存），而非轨迹自比 —— 否则 simple_regret 恒为 0
    gbest = pool_truth(pool, key_extra)['best_y'] if pool else None
    return {
        'n_samples': len(trajectory),
        'regret': regret_metrics(trajectory, global_best=gbest),
        'topk': topk_recall(pool, sampled_ids, k=topk, key_extra=key_extra) if pool else None,
        'calibration': calibration_picp(trajectory, z=z),
        'coverage': exploration_coverage(sampled_records),
        'reward_contrib': reward_contrib(trajectory),
    }


# ------------------------------------------------------------
# 便捷：从「已采样 doi 列表 + measured 真值」构建 trajectory（供后端无状态调用）
# ------------------------------------------------------------
def build_trajectory_from_pool(pool: list[dict], sampled_ids: list[str],
                               measured: list[dict] | None = None) -> list[dict]:
    """用候选池 + 已采样 doi，按最优条件模拟出 ground truth，构造标准 trajectory。"""
    by_doi = {r.get('doi'): r for r in pool}
    meas_by_doi = {m.get('doi'): m.get('y') for m in (measured or []) if m.get('doi') is not None}
    traj = []
    for i, doi in enumerate(sampled_ids):
        cand = by_doi.get(doi)
        if cand is None:
            continue
        sim = true_full(cand)                       # 含 reward_breakdown，供奖励归因
        pr = services.predict(cand, measured)
        # 观测值优先用前端回传的实测 y（含噪声，校准 PICP 才有意义）；无实测则退回真值模拟
        my = meas_by_doi.get(doi)
        obs = float(my) if isinstance(my, (int, float)) else sim['Y']
        traj.append({
            'cand': cand,
            'pred': pr['pred'],
            'unc': pr['unc'],
            'true': obs,
            'true_y': sim['Y'],
            'true_reward': sim['reward'],
            'reward_breakdown': sim.get('reward_breakdown'),
            'iteration': i,
        })
    return traj
