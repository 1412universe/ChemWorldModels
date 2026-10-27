"""
XGBoost 描述符驱动替代预测器（v19）。

设计：
- 用 POOL(380 条真实催化剂) 的描述符 + derive_phys 物理特征训练 XGBoost 点预测 +
  分位数(0.1/0.9)回归，得到模型化不确定性（预测区间半宽）。
- 替代 services.predict() 中原有的 KNN 中位锚定；模型缺失时 predict() 自动回退 KNN。
- 反应堆 simulate_experiment 仍以候选真实 y_lit 为锚（与 predict 解耦），故替换预测器
  不影响已验证的「最优条件实测≈文献值」审计一致性。

特征（顺序固定，存于 surrogate_meta.json 以保证训练/推理一致）：
  数值：bg, ad, oox, eov, dcht3, dband, eovf, phiB, wf, chi, Eb, photoStab(数值化),
        mp_band_gap, mp_formation, mp_e_above_hull  ← 来自 Materials Project 体相 DFT
  类别 one-hot：mech(NOCM/OCM/MPO/unclear), photo(0/1), support(top-K + other)

  注：derive_phys 中按 doi 随机化的噪声特征 (d, tau, D, Ld, I, Isat, pore, kie, ea)
  已全部丢弃（v19 残差学习证明它们令模型过拟合、test_R2 转负）。MP 描述符是真实
  物理信号，替代噪声特征接入；MP 缓存缺失时该 3 维置 0（残差学习优雅退化）。
"""
import os
import json
from typing import Any

import numpy as np

try:
    import xgboost as xgb
except Exception:  # 模型不可用时静默降级，predict() 回退 KNN
    xgb = None

from .data import derive_phys, eov_of, dcht3_of, DATA_DIR as _DATA_DIR

_HERE = os.path.dirname(__file__)
_DATA = str(_DATA_DIR)
META_PATH = os.path.join(_DATA, "surrogate_meta.json")
_POINT = os.path.join(_DATA, "surrogate_point.json")
_Q10 = os.path.join(_DATA, "surrogate_q10.json")
_Q90 = os.path.join(_DATA, "surrogate_q90.json")

SURROGATE = None  # 懒加载缓存

# MP 缓存（Materials Project DFT 描述符），由 fetch_mp_oqmd.py 下载到 data/mp_oqmd_cache.json
_MP_CACHE = None


def _load_mp_cache() -> dict:
    """加载 MP DFT 描述符缓存（materials 子表，key 形如 sup:tio2 / metal:au）。"""
    global _MP_CACHE
    if _MP_CACHE is not None:
        return _MP_CACHE
    p = os.path.join(_DATA, "mp_oqmd_cache.json")
    try:
        _MP_CACHE = json.load(open(p)).get("materials", {})
    except Exception:
        _MP_CACHE = {}
    return _MP_CACHE


def _mp_features(cat: dict) -> list[float]:
    """从 MP 缓存取该催化剂载体/金属的体相 DFT 描述符。

    取载体（sup:<support>）优先，缺则取金属（metal:<metal>），再缺则全 0。
    返回 [band_gap, formation_energy_per_atom, energy_above_hull]。
    注：这些是体相（bulk）值，与 380 池纳米颗粒/复合物存在尺度偏差；
    MP band_gap 为 PBE 级别、系统性低估。仅作描述符代理，不替代实验值。
    """
    cache = _load_mp_cache()
    sup = str(cat.get("support") or "").strip().lower()
    metal = str(cat.get("metal") or "").strip().lower()
    rec = cache.get("sup:" + sup) or cache.get("metal:" + metal) or None
    if not rec:
        return [0.0, 0.0, 0.0]
    return [float(rec.get("band_gap") or 0.0),
            float(rec.get("formation_energy_per_atom") or 0.0),
            float(rec.get("energy_above_hull") or 0.0)]



# ---------------------------------------------------------------- 特征工程
def _photo_stab_num(v: Any) -> float:
    s = str(v or "").lower()
    if "stable" in s and "meta" not in s:
        return 1.0
    if "unstable" in s:
        return 0.0
    if "meta" in s:
        return 0.5
    return 0.5


def build_features(cat: dict) -> list[float]:
    """将催化剂描述符展开为定长数值向量。"""
    if cat.get("eov") is None:
        cat = dict(cat); cat["eov"] = eov_of(cat)
    if cat.get("dcht3") is None:
        cat = dict(cat); cat["dcht3"] = dcht3_of(cat)
    P = derive_phys(cat)

    def fnum(k, default=0.0):
        v = P.get(k)
        return float(v) if isinstance(v, (int, float)) else default

    # 仅保留有物理意义的描述符：电子/吸附 (bg, ad, oox, eov, dcht3, dband) +
    # derive_phys 中由功函数/电负性推导的量 (eovf, phiB, wf, chi) + 载体结合能 Eb +
    # 光稳定性。丢弃 derive_phys 中按 doi 随机化的噪声特征 (d, tau, D, Ld, I, Isat,
    # pore, kie, ea) —— 这些对缺 morphology/mechanism 的条目是无意义噪声，会令模型
    # 过拟合 doi 随机种子，严重损害泛化（test_R2 转负）。
    num = [
        float(cat.get("bg") or 2.8),
        float(cat.get("ad") or -0.5),
        float(cat.get("oox") if cat.get("oox") is not None else 0.4),
        float(cat.get("eov")),
        float(cat.get("dcht3")),
        float(cat.get("dband") if cat.get("dband") is not None else 0.0),
        fnum("eovf"), fnum("phiB"), fnum("wf"), fnum("chi"), fnum("Eb"),
        _photo_stab_num(P.get("photoStab")),
        *_mp_features(cat),   # MP 体相 DFT 描述符（band_gap, formation, e_above_hull）
    ]

    mech = cat.get("mech") or "unclear"
    mech_oh = [1.0 if mech == m else 0.0 for m in ("NOCM", "OCM", "MPO", "unclear")]
    photo = [1.0 if cat.get("photo") is True else 0.0]
    sup = (cat.get("support_display") or cat.get("support") or "other")
    meta = _load_meta()
    sup_vocab = meta.get("support_vocab", [])
    sup_oh = [1.0 if sup == s else 0.0 for s in sup_vocab]
    if sup not in sup_vocab:
        sup_oh = [1.0 if s == "__other__" else 0.0 for s in sup_vocab]
    return num + mech_oh + photo + sup_oh


# ---------------------------------------------------------------- 元信息
def _load_meta() -> dict:
    try:
        with open(META_PATH) as f:
            return json.load(f)
    except Exception:
        return {"support_vocab": []}


def _support_vocab(pool: list[dict], top_k: int = 12) -> list[str]:
    from collections import Counter
    c = Counter((r.get("support_display") or r.get("support") or "other") for r in pool)
    vocab = [s for s, _ in c.most_common(top_k)]
    if "__other__" not in vocab:
        vocab.append("__other__")
    return vocab


# ---------------------------------------------------------------- 训练
def train_and_save(pool: list[dict], seed: int = 42) -> dict:
    """训练「残差校正」XGBoost 替代器并保存到 data/。

    设计：以 KNN 中位锚 (services._knn_predict) 为强先验，XGBoost 仅学习
    残差 y - knn_anchor。当描述符对产率无独立信号时残差→0，预测退化为 KNN 锚
    （绝不会比原 KNN 预测器更差）；有信号时系统性修正家族中位偏差。
    返回评估指标（基于 anchor+残差 的合成预测）。
    """
    if xgb is None:
        raise RuntimeError("xgboost 未安装，无法训练替代预测器")
    from .services import _knn_predict
    vocab = _support_vocab(pool)
    with open(META_PATH, "w") as f:
        json.dump({"support_vocab": vocab, "n_features": None, "unc_floor": 300.0}, f)

    X = np.array([build_features(c) for c in pool], dtype=float)
    anc = np.array([_knn_predict(c, [])["pred"] for c in pool], dtype=float)  # KNN 锚（含 pf 缩放）
    y = np.array([float(c.get("y") or 0.0) for c in pool], dtype=float)
    resid = y - anc                                                       # 残差学习
    n = len(y)
    rng = np.random.default_rng(seed)
    idx = rng.permutation(n)
    n_tr = int(n * 0.8)
    tr, te = idx[:n_tr], idx[n_tr:]

    def mk(quantile=None):
        if quantile is None:
            m = xgb.XGBRegressor(objective="reg:squarederror", n_estimators=400,
                                 max_depth=4, learning_rate=0.05, subsample=0.9,
                                 colsample_bytree=0.9, reg_lambda=1.0, random_state=seed)
        else:
            m = xgb.XGBRegressor(objective="reg:quantileerror", quantile_alpha=quantile,
                                 n_estimators=400, max_depth=4, learning_rate=0.05,
                                 subsample=0.9, colsample_bytree=0.9, reg_lambda=1.0,
                                 random_state=seed)
        m.fit(X[tr], resid[tr])
        return m

    pt, q10, q90 = mk(None), mk(0.1), mk(0.9)
    pt.save_model(_POINT); q10.save_model(_Q10); q90.save_model(_Q90)

    # 评估（合成预测 = 锚 + 残差）
    yp = pt.predict(X[te]) + anc[te]
    yl = q10.predict(X[te]) + anc[te]; yu = q90.predict(X[te]) + anc[te]
    mae = float(np.mean(np.abs(yp - y[te])))
    ss_res = float(np.sum((y[te] - yp) ** 2))
    ss_tot = float(np.sum((y[te] - y[te].mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    cover = float(np.mean((y[te] >= yl) & (y[te] <= yu)))
    m = y[te] > 0
    if m.sum() > 0:
        mae_act = float(np.mean(np.abs(yp[m] - y[te][m])))
        ssr = float(np.sum((y[te][m] - yp[m]) ** 2))
        sst = float(np.sum((y[te][m] - y[te][m].mean()) ** 2))
        r2_act = 1.0 - ssr / sst if sst > 0 else 0.0
    else:
        mae_act, r2_act = float("nan"), float("nan")
    metrics = {
        "n_train": int(n_tr), "n_test": int(len(te)),
        "test_MAE": mae, "test_R2": r2, "test_coverage_0.8": cover,
        "test_MAE_active": mae_act, "test_R2_active": r2_act,
        "n_features": int(X.shape[1]), "mode": "residual-on-knn-anchor",
    }
    with open(META_PATH, "w") as f:
        json.dump({"support_vocab": vocab, "n_features": int(X.shape[1]),
                   "unc_floor": 300.0, "metrics": metrics}, f)
    return metrics


# ---------------------------------------------------------------- 加载 / 推理
def _get_surrogate() -> dict | None:
    global SURROGATE
    if SURROGATE is not None:
        return SURROGATE
    if xgb is None:
        return None
    if not (os.path.exists(_POINT) and os.path.exists(_Q10) and os.path.exists(_Q90)):
        return None
    try:
        pt = xgb.XGBRegressor(); pt.load_model(_POINT)
        q10 = xgb.XGBRegressor(); q10.load_model(_Q10)
        q90 = xgb.XGBRegressor(); q90.load_model(_Q90)
        meta = _load_meta()
        SURROGATE = {"point": pt, "q10": q10, "q90": q90,
                     "unc_floor": float(meta.get("unc_floor", 300.0))}
    except Exception:
        SURROGATE = None
    return SURROGATE


# XGBoost 残差缓存：模型是静态的，故 (resid, q10r, q90r) 仅由候选 id 决定，与 measured 无关。
# 缓存后，strategize 对 380 个候选的逐点预测从 ~13s 降到 ~0.3s（只在首次/预热时算一次）。
_RESID_CACHE: dict = {}

def _resid_for(r: dict) -> tuple:
    """返回 (resid, q10r, q90r)；模型不可用时返回 (0,0,0)。按候选 id 缓存。"""
    s = _get_surrogate()
    if s is None:
        return (0.0, 0.0, 0.0)
    rid = r.get('id')
    if rid is not None and rid in _RESID_CACHE:
        return _RESID_CACHE[rid]
    feat = np.array(build_features(r), dtype=float).reshape(1, -1)
    resid = float(s["point"].predict(feat)[0])
    q10r = float(s["q10"].predict(feat)[0])
    q90r = float(s["q90"].predict(feat)[0])
    if rid is not None:
        _RESID_CACHE[rid] = (resid, q10r, q90r)
    return (resid, q10r, q90r)


def warm_resid_cache(pool: list[dict]) -> int:
    """预热残差缓存（启动时后台调用），返回成功缓存的候选数。"""
    n = 0
    for r in pool:
        try:
            _resid_for(r)
            n += 1
        except Exception:
            pass
    return n


def ml_predict(r: dict, measured: list[dict] | None = None) -> dict | None:
    """返回 {'pred': float, 'unc': float}；模型不可用时返回 None（predict() 回退 KNN）。

    预测 = KNN 锚 (services._knn_predict，含 physics_factor 缩放 + 实测精炼)
           + XGBoost 残差（点模型，按 id 缓存）+ 残差分位区间（q10/q90）。
    """
    s = _get_surrogate()
    if s is None:
        return None
    from .services import _knn_predict
    anchor = _knn_predict(r, measured or [])      # {pred, unc}（已含 pf 与实测精炼）
    resid, q10r, q90r = _resid_for(r)
    pred = max(anchor["pred"] + resid, 0.0)
    spread = max((q90r - q10r) / 2.0, 0.0)
    # 不确定性取 KNN 锚不确定度 与 模型残差区间 的较大者，再加相对 floor
    unc = max(spread, anchor["unc"], 0.12 * max(pred, 500.0), s["unc_floor"])
    return {"pred": pred, "unc": max(unc, 120.0)}
