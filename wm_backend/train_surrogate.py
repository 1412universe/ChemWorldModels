"""
v19 — 训练 XGBoost 描述符驱动替代预测器。

用法：
  <wm_backend_venv>/bin/python train_surrogate.py

产物（写入 ChemWorld/data/，由 app.surrogate 的 DATA_DIR 决定）：
  surrogate_point.json  — 点预测模型
  surrogate_q10.json   — 0.1 分位数模型
  surrogate_q90.json   — 0.9 分位数模型
  surrogate_meta.json  — 特征词表 / 评估指标 / unc_floor
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from app.data import POOL
from app.surrogate import train_and_save


def main():
    if not POOL:
        raise SystemExit("POOL 为空，无法训练")
    n_pool = len(POOL)
    n_active = sum(1 for c in POOL if (c.get("y") or 0) > 0)
    print(f"[TRAIN] POOL={n_pool} 条，其中 y>0 活跃 {n_active} 条，y<=0 失败/缺测 {n_pool - n_active} 条")
    metrics = train_and_save(POOL, seed=42)
    print("[TRAIN] 完成，指标：")
    for k, v in metrics.items():
        print(f"  {k} = {v}")


if __name__ == "__main__":
    main()
