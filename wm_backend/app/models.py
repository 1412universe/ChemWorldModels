"""Pydantic 请求/响应模型"""
from pydantic import BaseModel, Field
from typing import Any, Optional

class CandidateReq(BaseModel):
    candidate: dict
    measured: list[dict] = []
    oer_target: str = "H2O2"   # OER 两电子(H2O2) / 四电子(O2) 目标；仅 reaction==='OER' 时使用

class PredictResp(BaseModel):
    pred: float
    unc: float
    transfer: Optional[dict] = None
    model: Optional[str] = None        # 预测来源：'xgb'（XGBoost 残差替代器）| 'knn'（回退）
    eta: Optional[float] = None        # OER 过电位（仅 reaction==='OER'）
    selH2O2: Optional[float] = None     # OER H₂O₂ 选择性（仅 OER）
    score: Optional[float] = None       # OER 奖励分（仅 OER）

class NextReq(BaseModel):
    """主动学习决策请求：前端把当前已采样/实测/迭代状态发给后端，由 7B 策略器或确定性回退给出下一候选 + 操作条件。"""
    sampled: list[str] = []
    measured: list[dict] = []
    iteration: int = 0
    mae: float | None = None
    mae_n: int = 0          # 已采样计数，用于后端无状态累计 MAE
    recipe_mod: float = 1.0  # 用户配方合成调制因子（非用户配方恒为 1）
    conditions: dict | None = None  # 7B 提议的操作条件（可选）；None → 用该催化剂最优默认条件
    reuse: int = 0          # 载体/催化剂已复用轮次（稳定性衰减）
    reaction: str = "CH4"   # 主动学习轨道：'CH4'（甲烷光偶联主池）| 'OER'（电催化产 H2O2/O2）
    oer_target: str = "H2O2"   # OER 两电子/四电子目标；仅 reaction==='OER' 时使用
    acquisition: str | None = None  # 主动学习采集策略：'UCB' | 'EI' | 'PI' | 'TS'（None → 当前 ACQ_STATE）
    data_mode: str = "real"       # 实验数据模式：'real'=始终真实 | 'sim'=纯模拟 | 'hybrid'=N次后真实
    real_after_iter: int = 5      # hybrid 模式：前 N 次迭代用模拟值，第 N+1 次起用真实值

class SimReq(BaseModel):
    """物理信息化反应器模拟：给定候选与操作条件，返回实现的产率/选择性/奖励。"""
    candidate: dict
    conditions: dict
    reuse: int = 0
    noise: float | None = None   # 给定 → 叠加测量噪声（实测）；None → 预测
    search_optimum: bool = False  # True → 由后端先搜索理论最优点，再返回最优点与对应模拟结果
    oer_target: str = "H2O2"   # OER 两电子/四电子目标；仅 reaction==='OER' 时使用
    measured: list[dict] = []   # 已实测样本（[{doi, y}, ...]），用于 unmeasured 候选的替代器先验
    data_mode: str = "real"       # 实验数据模式（审计用）：'real' | 'sim' | 'hybrid'
    real_after_iter: int = 5      # hybrid 阈值（审计用）

class SimResp(BaseModel):
    Y: float
    Y0: float
    s_eff: float
    reward: float
    factors: dict
    opt: Optional[dict] = None     # OER 无 CH4 式最优条件对象，故可为 None
    cond: dict
    theoretical: Optional[dict] = None  # 后端搜索得到的理论最优载荷（conditions/sim/feasible_domain/search）
    y_lit: Optional[float] = None  # OER 无文献锚点产率，故可为 None
    y_source: Optional[str] = None # 产率锚点来源：'measured'(实测) | 'xgb'(XGBoost 先验) | 'knn'(KNN 先验) | None
    s_lit: float

class ExportReq(BaseModel):
    recipes: list[dict]
    format: str = "csv"   # csv|json

class ExportResp(BaseModel):
    ok: bool
    content: str = ""
    filename: str = ""
    error: str = ""


class EvaluateReq(BaseModel):
    """主动学习评价请求：给定已采样 doi 列表（与可选实测真值），由后端构造轨迹并计算评价指标。"""
    sampled_ids: list[str] = []
    measured: list[dict] = []        # 实测真值 [{doi, y}]
    reaction: str = "CH4"             # 'CH4' | 'OER'
    oer_target: str = "H2O2"
    topk: int = 10
    z: float = 1.96                   # 校准区间置信水平（1.96 → 95%）


class AcquisitionReq(BaseModel):
    """采集策略在线切换。"""
    strategy: str = "UCB"             # 'UCB' | 'EI' | 'PI' | 'TS'
    beta: float | None = None         # 可选：手动覆盖 β（None → 退火）


class ChatReq(BaseModel):
    """AI 对话：用户消息 + 可选历史 + 世界模型状态摘要 + 可选模型/端点。"""
    message: str
    history: list[dict] | None = None   # [{"role":"user"|"assistant","content":str}]
    world_state: str | None = None      # 当前循环/最优催化剂等摘要，供 AI 决策
    model: str | None = None            # 覆盖模型名（外部自定义 / 本地模型名）
    base_url: str | None = None         # 覆盖 API Base URL（本地端点如 http://127.0.0.1:11434/v1）
    api_key: str | None = None          # 覆盖 API Key（本地通常留空；外部自定义可填）


class WorkflowReq(BaseModel):
    """Uni-Lab OS 工作流生成请求：前端把 AI 理论最优条件 POST 给后端，
    后端调用 unilab-workflow-builder skill 的 prcxi_factory.py 生成合规工作流 JSON。"""
    cond: dict                    # AI 理论最优条件 {T, R, I, G, reaction}
    reaction: str = "CH4"         # 'CH4' | 'OER'


class WorkflowResp(BaseModel):
    ok: bool
    workflow: dict | None = None    # 完整工作流 JSON（含 target_lab_uuid, name, data:{nodes,edges}）
    node_count: int = 0
    edge_count: int = 0
    summary: str = ""
    error: str = ""
