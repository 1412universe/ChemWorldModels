# ChemWorld "世界模型"概念定义与边界（第⑤项）

审稿人对"世界模型"称呼的第一质疑必是概念混淆。本文严格定义 ChemWorld 的"世界模型"指什么、与 ML 社区 world model 的区别、为何该称呼合理（或应改名）。论文方法部分应纳入此节。

## 一、为何必须先定义边界

"世界模型"（world model）在 ML 社区有明确所指：Ha & Schmidhuber (2018)、Dreamer (Hafner 2020)、PlaNet (Hafner 2019) 系列的**学习型潜在动力学模型**——在压缩的 latent 空间里预测环境未来状态，用于 model-based RL 在"想象"中规划。直接套用这个称呼到 ChemWorld 会构成 overclaim：ChemWorld 的核心预测器是**白盒的物理信息化反应器 + KNN/XGBoost surrogate**，不是学出来的 latent dynamics。必须在论文里明确区分，否则被拒风险高。

## 二、ML 社区 world model 的三个特征

| 特征 | ML world model（Dreamer 等） | ChemWorld |
|---|---|---|
| 动力学来源 | **学习**（神经网络在 latent 空间拟合状态转移） | **手写物理 + 学习残差**（解析物理因子乘子 + XGBoost 残差校正） |
| 表示 | 黑盒 latent 向量 | 白盒结构化（催化剂描述符 + 操作条件 → 物理因子 → 产率） |
| 用途 | 在 latent 里想象多步未来，planning/model-based RL | 单步实验预测 + 主动学习采集打分 |
| 数据效率 | 需大量交互学动力学 | 380 真实催化剂锚定 + 物理约束外推 |

关键区别：**ML world model 学"环境如何演化"，ChemWorld 写"环境如何响应"**。前者是 black-box learned dynamics，后者是 white-box physics-grounded response model。

## 三、ChemWorld "世界模型"的结构化定义

ChemWorld 的"世界模型"是一个**三层耦合的可预测内部模型**，对真实光催化甲烷偶联实验环境建模：

```
┌─ 约束层 compute_constraints（34 条物理化学法则）
│   热力学 / 能带对齐 / Sabatier / 过度氧化 / Arrhenius / Nernst / Langmuir /
│   Knudsen / Schottky / Mott-Schottky / KIE / EOV 火山 / ΔE*CH3 双描述符火山
│   → fail/warn/pass 判定 → physics_factor 产率折扣
├─ 反应器层 simulate_experiment（物理信息化响应函数）
│   Y = y_lit · f_act(T) · f_ox(R,eov) · f_phot(I,bg) · f_mt(G) · f_stab(reuse) · pf
│   五因子乘子：温度高斯 / 过度氧化 / 光子饱和(M-M) / 传质 / 稳定性衰减
└─ 替代器层 surrogate（KNN 锚 + XGBoost 残差校正）
    未实测候选的产率先验；分位数回归给不确定性区间；物理约束通过 pf 缩放锚
```

它预测"给定催化剂+操作条件，实验会得到什么产率/选择性/奖励"，并给出可解释的物理归因（哪条约束 fail、哪个因子主导）。这正是"对实验世界的内部可预测模型"。

## 四、为何"世界模型"称呼在 AI4S 语境下可接受

1. **功能等价**：ML world model 的本质作用是"在不真实交互的情况下预测环境响应、指导决策"。ChemWorld 做的正是这件事——在不做真实验时预测产率、用预测指导主动学习采样。功能上等同。
2. **AI4S 语境的宽泛用法**：科学领域的"world model / scientific world model"已被用于泛指"对物理世界的可预测内部模型"（如 AI4Science 综述中的 weather/world model、AlphaFold 的结构预测也可视为蛋白质世界的 model）。ChemWorld 符合这个宽泛传统。
3. **白盒反而是优势**：ChemWorld 的物理约束是可审计、可解释、可外推的——在数据稀缺的科学场景下（380 催化剂），纯学习型 latent dynamics 会过拟合/不可外推；白盒物理 + 残差校正的混合架构更稳健。这是相对 ML world model 的方法论进步，不是退步。

## 五、诚实判断与建议

**判断**：严格按 ML 定义，ChemWorld 不是 world model（非 latent learned dynamics）。按 AI4S 宽泛定义，是。两种立场都成立，关键是论文里**明确定义并区分**，不能含糊套用。

**两个选项：**

- **选项 A（推荐，系统论文路线 B）保留称呼 + 严格定义**：论文用一节明确"本文的 scientific world model 指 physics-grounded response model of the experimental environment，区别于 ML 的 learned latent dynamics world model"，并论证白盒混合架构在数据稀缺科学场景的方法论合理性。系统论文里这个称呼可接受。
- **选项 B（方法论文路线 A）改名更精确**：改称 `physics-informed experimental surrogate` 或 `scientific reaction environment model`，彻底规避概念争议。更保守、更安全。

**推荐**：走系统论文（路线 B）→ 选 A。保留"世界模型"称呼（它有传播力、契合 AI4S 叙事），但用本文这一节严格定义边界 + 与 Dreamer 等显式区分 + 论证白盒架构合理性。这既享受称呼的传播红利，又堵住 overclaim 质疑。

## 六、论文方法部分建议措辞

> "We define a *scientific world model* as a physics-grounded, predictive internal model of the experimental environment that maps (catalyst descriptors, operating conditions) → (yield, selectivity, reward) with interpretable physical attribution. This differs from learned latent-dynamics world models (e.g., Dreamer, PlaNet) in three respects: (i) dynamics are white-box physics factors plus a learned residual corrector, not a black-box latent transition; (ii) 34 physicochemical constraints act as an auditable law layer that modulates predictions; (iii) it is designed for data-scarce scientific extrapolation rather than high-dimensional latent imagination. We argue this hybrid white-box architecture is methodologically appropriate for catalysis discovery where 380 data points are insufficient to learn a faithful latent dynamics."

## 七、与三件套卖点的衔接

"世界模型"是上层概念，三件套（可解释物理约束 / 工程完成度 / 双轨道整合）是其具体内涵。论文结构建议：方法部分先给本定义节（堵概念质疑），再展开三件套（见 `method_positioning.md`）。这样"世界模型"不是空称，而是有 34 约束 + 物理反应器 + 双轨道支撑的实质。

## 八、待办

- [ ] 正式投稿前，在 Web of Science 核查 Ha&Schmidhuber 2018、Dreamer 2020、PlaNet 2019 的确切引用（用于本文"区别"一节对照）。
- [ ] 若审稿人仍质疑，备用选项 B 改名方案已备好。
