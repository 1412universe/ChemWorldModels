# ChemWorld 方法定位与新颖性主张（三件套深化）

三项 ablation 跑完后，模式清晰：卖点不在"更快的采样效率"（LLM 不赢 UCB、物理约束提升温和），而在"**可解释物理约束 + 工程完成度 + 双轨道整合**"三件套。本文深化三件套内涵、对标 prior art、明确新颖性主张，供论文 Introduction/Related Work/Method 定位使用。

## 核心新颖性主张（Novelty Statement）

> ChemWorld 是一个面向数据稀缺光催化甲烷偶联的**可解释物理信息化科学世界模型**：以 34 条白盒物理化学约束为可审计法则层、以物理因子反应器 + KNN/XGBoost 残差校正为混合预测器、以归一化多目标奖励统一光催化(OCM)与电催化(OER)双轨道，构成"文献→DFT→ML→模拟→决策"端到端闭环。其价值不在采样速度（与确定性 UCB 相当），而在**物理可解释性、常数可审计性、跨轨道统一奖励**——这三者在现有 phys-informed ML for catalysis 与 AI4S 平台中均未同时具备。

## 三件套拆解

### 一、可解释物理约束（Interpretable Physical Constraints）

**内涵**：
- 34 条物理化学法则（`laws.csv` 124 常数），覆盖热力学→能带对齐→Sabatier→过度氧化→Arrhenius→Nernst→Langmuir→Knudsen→Schottky→Mott-Schottky→KIE→EOV 火山→EOV-ΔE\*CH₃ 双描述符火山
- 三态判定（fail/warn/pass）→ `physics_factor` 产率折扣 → 进 KNN 锚预测缩放（实测候选放大 σ、未实测候选压低 pred）
- **外部化为单一真相源** `laws.csv`：调参/审计只改一处，每条常数可溯源（见 `laws_with_source.csv`）

**对标 prior art**：
- Nørskov 系列 d-band / Sabatier 火山：单描述符火山，ChemWorld 扩展为 EOV-ΔE\*CH₃ **双描述符火山** + EOV 单描述符火山，且纳入约束层而非仅作分析图
- Kulik 组 physics-informed ML for catalysis：通常塞 1–3 个物理约束作特征/损失正则；ChemWorld 是 **34 条结构化约束 + 显式 fail/warn 折扣机制**，约束数量与结构化程度显著更高
- Begusic / EDBO 等 AL for catalysis：多无显式物理约束层，纯数据驱动 surrogate；ChemWorld 是"物理先验 + 数据残差"混合

**新颖性**：约束数量（34）+ 外部化单一真相源（laws.csv 可审计）+ 双描述符火山（EOV×ΔE\*CH₃，本工作构造）+ 约束直接调制预测不确定性（fail/warn → σ 放大）。**这是数据稀缺科学场景下防止 surrogate 越界外推的关键机制**。

**ablation 证据**（第③项）：物理约束带来 top-10 recall +20%、平均采样产率 +9.2%、累积遗憾 −2.9%。提升温和但一致，方向符合预期。约束主要价值在**可解释性 + 采样质量**而非"更快收敛"。

### 二、工程完成度（End-to-End Engineering）

**内涵**：
- 端到端闭环：文献知识库(4465 条) → DFT 描述符(MP/OQMD 缓存) → KNN+XGBoost surrogate → 物理信息化反应器 → 主动学习采集(UCB/EI/PI/TS) → 5 页交互前端
- 数据单一来源（`data/` CSV 优先 + JSON 回退）、法则外部化、模型缓存、预热机制、并发去重
- 多目标归一化奖励 v20（log 归一化产率跨 3 数量级不塌缩）+ 奖励分项归因
- 完整评估指标（regret/simple+cumulative、top-k recall、PICP 校准、coverage、reward 归因）

**对标 prior art**：
- ChemOS / EDBO / Phoenix 等 AI4S 自驱实验平台：多聚焦"自动化硬件 + BO"；ChemWorld 聚焦"**物理信息化预测 + 可解释决策**"层，硬件层留接口
- 多数 AI4S 平台缺显式物理约束层与可审计常数账本；ChemWorld 的 laws.csv + laws_with_source.csv 是可复现/可审计的工程资产

**新颖性**：把"物理法则层"作为一等公民集成进 AI4S 闭环（非仅损失正则），配可审计常数账本 + 归一化跨量纲奖励 + 完整评估套件。**工程完成度本身是系统论文（路线 B）的核心交付物**。

**ablation 证据**（第②项扩展）：8 个 API 大模型 + 本地 7B + UCB 十方对比，LLM 策略器均不优于 UCB——这反而让"工程完成度"卖点更聚焦：主方法用确定性 UCB（可靠、快），LLM 降为可解释决策接口（自然语言 rationale）。

### 三、双轨道整合（Dual-Track Integration）

**内涵**：
- OCM 光催化甲烷偶联（热催化/光催化，T/R/I/G 操作条件）+ OER 电催化产 H₂O₂/O₂（电位 V，标度关系描述符）
- **归一化多目标奖励统一量纲**：`rl_reward`（CH4）与 `oer_reward_norm`（OER）都输出 ∈[0,1]，使跨轨道主动学习与统一 RL 可行
- OER 用标度关系（Man 2011：ΔG\*OOH−ΔG\*OH≈3.2 eV）+ 两电子选择性火山（Viswanathan 2016）构造理论候选池

**对标 prior art**：
- 双功能电催化剂设计（如 bifunctional OER/ORR）：多聚焦单轨道内多步；ChemWorld 是**光催化与电催化两条机理不同的轨道在同一奖励框架内统一**
- 跨域迁移学习：隐式共享表示；ChemWorld 是**显式共享奖励量纲 + 采集函数**，机制透明

**新颖性**：同一物理信息化框架内统一光/电催化，归一化奖励使"在两条轨道间分配实验预算"成为 well-posed 的 bandit 问题。**这是 dFIG 之外的第二个方法验证场景入口**（strain_mc 的 d-band→吸附能→选择性链可挂在 OER 轨道）。

**诚实标注**：OER 候选池仅 12 条且为标度关系理论构造（待 DFT 校准），是当前最弱的一环。论文应标注 OER 为"理论构造轨道，待实验校准"，不 overclaim。

## 与 prior art 的差异化矩阵

| 维度 | 纯数据 ML for catalysis | phys-informed ML（Kulik 等） | AI4S 平台（ChemOS 等） | **ChemWorld** |
|---|---|---|---|---|
| 物理约束 | 无 | 1–3 个（特征/正则） | 无/少 | **34 条结构化 + fail/warn 折扣** |
| 约束可审计性 | — | 弱 | — | **laws.csv 单一真相源 + 溯源** |
| 双描述符火山 | 无 | 偶有单描述符 | 无 | **EOV×ΔE\*CH₃（构造）** |
| 双轨道统一奖励 | 无 | 无 | 无 | **光/电催化归一化 [0,1]** |
| 闭环工程 | 部分 | 实验 | 自动化硬件 | **文献→DFT→ML→决策→前端** |
| 可解释决策接口 | 无 | 无 | 少 | **LLM rationale（不作采集卖点）** |

## 论文定位建议（路线 B 系统论文）

1. **Introduction**：用 `world_model_definition.md` 的定义节开题，定位"scientific world model"在 AI4S 的宽泛传统 + 与 ML world model 区分。
2. **Related Work**：用本文件的对标矩阵，逐项区分纯数据 ML / phys-informed ML / AI4S 平台。
3. **Method**：三件套各一节（约束层 / 反应器+surrogate / 双轨道奖励），配 laws_with_source.csv 作 SI。
4. **Experiments**：四项 ablation（laws 溯源 / LLM×10 vs UCB / 物理因子 on-off / [GP-BO]）作核心证据，诚实报告负面结论（LLM 不赢 UCB）作为可信度资产。
5. **Limitations**：simulator-in-the-loop、OER 待 DFT 校准、单 seed、gbest 离群。

## 一句话总结

**ChemWorld 的新颖性不在"更快的采样"（ablation 证伪），而在"可解释 + 可审计 + 双轨道"三件套的整合——一个数据稀缺科学场景下，白盒物理 + 残差学习 + 跨轨道统一奖励的端到端科学世界模型。**
