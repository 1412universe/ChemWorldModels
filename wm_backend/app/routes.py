"""FastAPI 路由"""
import os
import time
import random
import logging
import datetime
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, JSONResponse, StreamingResponse
from fastapi import UploadFile, File, Form

logger = logging.getLogger("wm.next")

LOD = 80  # GC-FID 检测限（μmol·g⁻¹·h⁻¹），与前端 EXP.LOD 对齐

from . import services
from . import evaluation
from . import ext_llm
from .data import ALLCAT, CATALYSTS, DEVICES, KB_ALL, POOL, OER_POOL, fam_of, eov_of, dcht3_of
from .services import (
    nearest_ocm, simulate_experiment, optimal_conditions, default_conditions,
    search_theoretical_optimum, oer_predict, simulate_oer, oer_default_conditions, pick_candidate,
    pick_candidate_oer, set_acquisition, get_acquisition, acq_beta,
)
from .llm import check_available, strategize, strategize_with_timeout, get_model_status, strategize_async, get_proposal, async_proposal_running
from . import inference_log
from .models import (CandidateReq, NextReq, PredictResp, ExportReq, ExportResp,
                     SimReq, SimResp, EvaluateReq, AcquisitionReq, ChatReq,
                     WorkflowReq, WorkflowResp)
from .data import REALDATA_DIR

router = APIRouter()
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")


@router.get("/api/health")
def health():
    # 只读缓存的模型状态（后台线程 30s 刷新），不再同步执行 ollama list，
    # 避免 7B 占用内存后该命令变慢导致前端探针 3s 超时误判「后端未连」。
    try:
        from .llm import warmup_done as _warmup_done
        warmup = _warmup_done()
    except Exception:
        warmup = True
    return {"ok": True, "pool": len(POOL), "kb": len(ALLCAT), "model": get_model_status(),
            "warmup_done": warmup}


@router.get("/api/state")
def state():
    """返回前端初始化所需的全部静态数据"""
    nr = sum(1 for r in CATALYSTS if r.get("review_status") == "needs_review")
    return {
        "pool": POOL,
        "oer_pool": OER_POOL,
        "kb_all": KB_ALL,
        "devices": DEVICES,
        "needs_review_count": nr,
        "model_status": check_available(),
    }


@router.post("/api/predict", response_model=PredictResp)
def predict_endpoint(req: CandidateReq):
    r = req.candidate
    measured = req.measured
    if r.get("reaction") == "OER":
        pr = services.predict(r, measured, oer_target=req.oer_target)
        return PredictResp(pred=pr["pred"], unc=pr["unc"], transfer=pr.get("transfer"),
                           eta=pr.get("eta"), selH2O2=pr.get("selH2O2"), score=pr.get("score"))
    if "eov" not in r or r["eov"] is None:
        from .data import eov_of
        r["eov"] = eov_of(r)
    if "dcht3" not in r or r["dcht3"] is None:
        from .data import dcht3_of
        r["dcht3"] = dcht3_of(r)
    pr = services.predict(r, measured)
    return PredictResp(pred=pr["pred"], unc=pr["unc"], transfer=pr.get("transfer"),
                       model=pr.get("model"))


@router.post("/api/constraints")
def constraints_endpoint(req: CandidateReq):
    r = req.candidate
    C = services.compute_constraints(r, oer_target=req.oer_target)
    return {"constraints": C}


@router.post("/api/next")
def next_endpoint(req: NextReq):
    """
    主动学习决策（7B 策略器 + 确定性兜底）+ 物理信息化反应器「基线预测」。
    - 优先用 7B 策略器挑 next_id 并提议操作条件；模型只输出候选 id 与条件，绝不接触/修改数据库；
    - 校验闸门：next_id 必须 ∈ 未采样候选池，否则回退 services.pick_candidate；
    - 任何幻觉出来的 id 在落地前被丢弃，从源头杜绝编造写入；提议条件越界则 clamp 到催化剂可行域；
    - 选取阶段只回传「基线预测」(reuse=0)；真正的实测含复用衰减，在 onOpComplete 经 /api/simulate
      以实际 reuse 计算，避免选取时未知 support 复用次数导致的不一致。
    """
    t0 = time.perf_counter()
    if req.reaction == "OER":
        return _next_oer(req, t0)
    sampled = set(req.sampled)

    def _clamp_cond(cat: dict, cond: dict | None):
        opt = optimal_conditions(cat)
        c = dict(cond or {})
        clamped = {}
        bounds = {
            'T': (opt['T_min'], opt['T_max']), 'R': (opt['R_min'], opt['R_max']),
            'I': (opt['I_min'], opt['I_max']), 'G': (opt['G_min'], opt['G_max']),
        }
        for k, (lo, hi) in bounds.items():
            v = float(c.get(k, opt[k + '_opt']))
            clamped[k] = max(lo, min(hi, v))
        return clamped, opt

    def _baseline(cand: dict, cond_override: dict | None = None, measured_override: list[dict] | None = None) -> dict:
        measured_use = measured_override if measured_override is not None else req.measured
        theo = services.search_theoretical_optimum(cand, reuse=req.reuse, measured=measured_use)
        pr = services.predict(cand, measured_use)            # 采集函数用不确定性
        sim = theo['sim']
        cond = theo['conditions']
        feasible = theo['feasible_domain']
        return {
            'pred': sim['Y'], 'unc': pr['unc'],
            'conditions': cond, 'feasible_domain': feasible,
            's_eff': sim['s_eff'], 'reward': sim['reward'], 'factors': sim['factors'],
            'theoretical': theo,
            'conditions_source': theo.get('conditions_source', 'virtual-converged-optimum'),
        }

    # 快速路径：Ollama 已知不可用（模型状态缓存 ok=False）→ 直接确定性回退，
    # 不进 strategize 线程池（1 worker + 串行锁；慢/挂的 7B 调用会卡死该 worker，
    # 后续请求排队越过前端 70s 超时 → 前端落本地回退「状态 B」）。秒回退彻底消除该路径。
    _dm = getattr(req, 'data_mode', 'real') or 'real'
    _rai = getattr(req, 'real_after_iter', 5) or 5
    logger.info("[next] 数据模式: %s%s", _dm, f"（前 {_rai} 轮模拟后真实）" if _dm == 'hybrid' else '')
    _ms = get_model_status()
    _strategizing = False
    if _ms.get("ok"):
        # 同步预算 35s：prompt 已精简（5 候选 / ~600 token / prefill~5s），35s 给足余量，
        # 超时即回退，并由后台长预算(60s)异步续跑 7B 建议。
        strat = strategize_with_timeout(POOL, sampled, req.measured, req.iteration, req.mae, timeout=55)
    else:
        strat = {"ok": False, "error": _ms.get("error") or "模型不可用"}
    cand = None
    if strat.get("ok") and strat.get("next_id") is not None:
        cand = next((r for r in POOL
                     if r.get("id") == strat["next_id"] and r.get("doi") not in sampled), None)
    if cand is not None:
        base = _baseline(cand, req.conditions)
        result = {
            "candidate": cand,
            "strategy": strat.get("strategy"),
            "rationale": strat.get("rationale"),
            "used_model": True,
            "conditions_source": base.get("conditions_source", strat.get("conditions_source", "virtual-converged-optimum")),
            "iteration": req.iteration,
            "strategizing": False,
            "data_mode": _dm,
            "real_after_iter": _rai,
            **base,
        }
        inference_log.emit(req, result, t0)
        return result
    # 确定性回退：同步 7B 未在 25s 内返回 → 立即回退，并在后台以长预算(90s)继续跑 7B，
    # 结果经 /api/strategy-proposal 露出，前端轮询展示「🧠 7B 建议」，主循环不被阻塞。
    _why = strat.get("error") or "输出非法"
    logger.warning("[next] 7B 策略器未采用（%s），回退确定性采集", _why)
    if _ms.get("ok") and not async_proposal_running(req.iteration):
        strategize_async(POOL, sampled, req.measured, req.iteration, req.mae,
                         reaction="CH4", oer_target=req.oer_target, budget=60)
        _strategizing = True
    cand = services.pick_candidate(POOL, sampled, req.measured,
                                   strategy=req.acquisition, iteration=req.iteration)
    base = _baseline(cand, req.conditions)
    result = {
        "candidate": cand,
        "strategy": "deterministic-fallback",
        "rationale": f"7B 未采用（{_why}）；已回退不确定性×预测值采集",
        "used_model": False,
        "conditions_source": base.get("conditions_source", "virtual-converged-optimum"),
        "iteration": req.iteration,
        "strategizing": _strategizing,
        "data_mode": _dm,
        "real_after_iter": _rai,
        **base,
    }
    inference_log.emit(req, result, t0)
    return result


@router.get("/api/strategy-proposal")
def strategy_proposal(iteration: int):
    """返回某次迭代的 7B 异步建议（慢 7B 后台跑完后可见；ready=False 表示仍在后台推理）。"""
    p = get_proposal(iteration)
    if p is None:
        return {"ready": False, "proposal": None}
    return {"ready": p.get("ready", False), "proposal": p.get("proposal")}


@router.post("/api/simulate", response_model=SimResp)
def simulate_endpoint(req: SimReq):
    """物理信息化反应器：给定候选与操作条件（含实际复用轮次），返回实现的产率/选择性/奖励（可选叠加噪声）。"""
    r = req.candidate
    if r.get("reaction") == "OER":
        if req.search_optimum:
            theo = search_theoretical_optimum(r, reuse=req.reuse, measured=req.measured)
            return SimResp(
                Y=theo['sim']['Y'], Y0=theo['sim']['Y0'], s_eff=theo['sim']['s_eff'], reward=theo['sim']['reward'], factors=theo['sim']['factors'],
                opt=theo['sim']['opt'], cond=theo['conditions'], theoretical=theo,
                y_lit=theo['sim']['y_lit'], y_source=theo['sim']['y_source'], s_lit=theo['sim']['s_lit'],
            )
        res = simulate_experiment(r, req.conditions, reuse=req.reuse, noise=req.noise, oer_target=req.oer_target)
        return SimResp(
            Y=res['Y'], Y0=res['Y0'], s_eff=res['s_eff'], reward=res['reward'], factors=res['factors'],
            opt=res['opt'], cond=res['cond'], theoretical=None,
            y_lit=res['y_lit'], y_source=res['y_source'], s_lit=res['s_lit'],
        )
    if "eov" not in r or r["eov"] is None:
        r["eov"] = eov_of(r)
    if "dcht3" not in r or r["dcht3"] is None:
        r["dcht3"] = dcht3_of(r)
    if req.search_optimum:
        theo = search_theoretical_optimum(r, reuse=req.reuse, measured=req.measured)
        return SimResp(
            Y=theo['sim']['Y'], Y0=theo['sim']['Y0'], s_eff=theo['sim']['s_eff'], reward=theo['sim']['reward'], factors=theo['sim']['factors'],
            opt=theo['sim']['opt'], cond=theo['conditions'], theoretical=theo,
            y_lit=theo['sim']['y_lit'], y_source=theo['sim']['y_source'], s_lit=theo['sim']['s_lit'],
        )
    res = simulate_experiment(r, req.conditions, reuse=req.reuse, noise=req.noise, measured=req.measured)
    return SimResp(
        Y=res['Y'], Y0=res['Y0'], s_eff=res['s_eff'], reward=res['reward'], factors=res['factors'],
        opt=res['opt'], cond=res['cond'], theoretical=None, y_lit=res['y_lit'], y_source=res['y_source'], s_lit=res['s_lit'],
    )


def _next_oer(req: NextReq, t0: float | None = None) -> dict:
    """
    OER 轨道主动学习决策：复用 7B strategize（对 OER_POOL 按采集分数排序），
    伪非法/离线则回退确定性 pick_candidate_oer。OER 活性完全由描述符(ΔG*OH) 决定，
    操作条件固定为室温 + 施加电位 V≈1.6 V，故 baseline 直接给 oer_default_conditions。
    """
    if t0 is None:
        t0 = time.perf_counter()
    sampled = set(req.sampled)
    pool = OER_POOL
    # 快速路径：Ollama 已知不可用 → 直接确定性回退，不进 strategize 线程池（理由同上）。
    _dm_oer = getattr(req, 'data_mode', 'real') or 'real'
    _rai_oer = getattr(req, 'real_after_iter', 5) or 5
    logger.info("[next-oer] 数据模式: %s%s", _dm_oer, f"（前 {_rai_oer} 轮模拟后真实）" if _dm_oer == 'hybrid' else '')
    _ms = get_model_status()
    _strategizing = False
    if _ms.get("ok"):
        # 同步预算 35s；超时回退并由后台长预算(60s)异步续跑 7B 建议。
        strat = strategize_with_timeout(pool, sampled, req.measured, req.iteration, req.mae,
                           reaction="OER", oer_target=req.oer_target, timeout=35)
    else:
        strat = {"ok": False, "error": _ms.get("error") or "模型不可用"}
    cand = None
    if strat.get("ok") and strat.get("next_id") is not None:
        cand = next((r for r in pool
                     if r.get("id") == strat["next_id"] and r.get("doi") not in sampled), None)
    if cand is None:
        _why = strat.get("error") or "7B 不可用或输出非法"
        logger.warning("[next-oer] 7B 策略器未采用（%s），回退 OER 确定性采集", _why)
        if _ms.get("ok") and not async_proposal_running(req.iteration):
            strategize_async(pool, sampled, req.measured, req.iteration, req.mae,
                             reaction="OER", oer_target=req.oer_target, budget=60)
            _strategizing = True
        cand = pick_candidate_oer(pool, sampled, req.measured, req.oer_target,
                                  strategy=req.acquisition, iteration=req.iteration)
        strat = {"strategy": "deterministic-fallback",
                 "rationale": f"7B 未采用（{_why}）；已回退 OER 奖励采集（活性×选择性×稳定性）",
                 "conditions_source": "virtual-converged-optimum"}
    theo = services.search_theoretical_optimum(cand, reuse=req.reuse, measured=req.measured)
    cond = theo['conditions']
    pr = oer_predict(cand, req.oer_target)
    sim = theo['sim']
    feasible = theo['feasible_domain']
    result = {
        "candidate": cand,
        "strategy": strat.get("strategy"),
        "rationale": strat.get("rationale"),
        "used_model": bool(strat.get("ok")),
        "conditions_source": theo.get("conditions_source", strat.get("conditions_source", "virtual-converged-optimum")),
        "iteration": req.iteration,
        "strategizing": _strategizing,
        "data_mode": _dm_oer,
        "real_after_iter": _rai_oer,
        "pred": sim['Y'], "unc": pr['unc'],
        "conditions": cond, "feasible_domain": feasible,
        "s_eff": sim['s_eff'], "reward": sim['reward'], "factors": sim['factors'],
        "theoretical": theo,
    }
    inference_log.emit(req, result, t0)
    return result


@router.post("/api/recipe-mod")
def recipe_mod_endpoint(req: CandidateReq):
    recipe = req.candidate.get("recipe", {})
    return {"mod": services.recipe_mod(recipe)}


@router.post("/api/evaluate")
def evaluate_endpoint(req: EvaluateReq):
    """主动学习评价：基于已采样轨迹计算遗憾 / Top-k 召回 / 校准(PICP) / 覆盖 / 奖励归因。"""
    pool = OER_POOL if req.reaction == "OER" else POOL
    # 单一实现来源：轨迹构建复用 evaluation.build_trajectory_from_pool
    # （含 reward_breakdown → 奖励归因不为空；实测 y 优先 → PICP 校准有意义）
    traj = evaluation.build_trajectory_from_pool(pool, req.sampled_ids, req.measured)
    key_extra = req.oer_target if req.reaction == "OER" else ""
    summ = evaluation.summarize(traj, pool=pool, sampled_ids=req.sampled_ids,
                                topk=req.topk, z=req.z, key_extra=key_extra)
    summ["reaction"] = req.reaction
    return summ


@router.get("/api/acquisition")
def acquisition_get():
    """返回当前采集策略状态（策略 / β / 可用策略 / 退火参数）。"""
    return get_acquisition()


@router.post("/api/acquisition")
def acquisition_set(req: AcquisitionReq):
    """在线切换采集策略（与可选 β 覆盖）。"""
    try:
        return set_acquisition(req.strategy, beta=req.beta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/export")
def export_endpoint(req: ExportReq):
    if req.format == "csv":
        content = services.recipes_to_csv(req.recipes)
        filename = "user_recipes.csv"
    elif req.format == "json":
        content = services.recipes_to_json(req.recipes)
        filename = "user_recipes.json"
    else:
        return ExportResp(ok=False, error="不支持的格式，仅支持 csv/json")
    return ExportResp(ok=True, content=content, filename=filename)


@router.get("/api/nearest-ocm")
def nearest_ocm_endpoint(metal: str, support: str):
    r = {"metal": metal, "support": support, "mech": "OCM"}
    hit = nearest_ocm(r)
    return {"hit": hit}


@router.post("/api/generate-workflow")
def generate_workflow_endpoint(req: WorkflowReq):
    """调用 unilab-workflow-builder skill 的 prcxi_factory.py 生成合规工作流 JSON。
    前端不再自维护 planner，全部交给后端 skill 实现，保证工艺规则固化、唯一数据源。"""
    from . import unilab_generator as ug
    try:
        cond = dict(req.cond or {})
        cond.setdefault('reaction', req.reaction)
        wf = ug.generate_workflow(cond)
        nodes = wf['data']['nodes']
        edges = wf['data']['edges']
        # 统计
        pick = sum(1 for n in nodes if n['name'] == 'pick')
        place = sum(1 for n in nodes if n['name'] == 'place')
        solid_n = sum(1 for n in nodes if n['device_name'] == 'gn_solid_weighing' and (n['param'] or {}).get('cmd_type') == 11)
        titration_n = sum(1 for n in nodes if n['name'] == 'titration_liquid')
        summary = '节点=%d 边=%d pick=%d place=%d 固体加料=%d 滴注=%d pick↔place配对=%s' % (
            len(nodes), len(edges), pick, place, solid_n, titration_n,
            'YES' if pick == place and pick > 0 else 'NO')
        return WorkflowResp(ok=True, workflow=wf, node_count=len(nodes),
                            edge_count=len(edges), summary=summary)
    except Exception as e:
        logger.exception("generate_workflow failed")
        return WorkflowResp(ok=False, error=str(e))


@router.get("/inference-log")
def inference_log_page():
    """模型推理日志 HTML 视图（自包含，可直接保存/打开）。"""
    inference_log.ensure_all()
    return FileResponse(inference_log.HTML_PATH)


@router.get("/candidates-log")
def candidates_log_page():
    """候选多轮迭代对比 HTML 视图。"""
    inference_log.ensure_all()
    return FileResponse(inference_log.CAND_HTML_PATH)


@router.get("/api/inference-log/summary")
def inference_log_summary():
    """推理日志汇总统计（总记录 / 7B 命中率 / 平均延迟 / 今日条数）。"""
    return inference_log.summary()


@router.get("/api/inference-log/candidates")
def inference_log_candidates(reaction: str = None):
    """按候选聚合的多轮迭代对比（JSON）。reaction 可过滤 CH4 / OER。"""
    return {"generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "groups": inference_log.candidate_report(reaction_filter=reaction)}


@router.get("/api/inference-log/csv-weekly")
def inference_log_csv_weekly():
    """导出本周逐条推理记录 CSV（utf-8-sig，便于 Excel 打开）。"""
    path = inference_log.export_csv_weekly()
    return FileResponse(path, media_type="text/csv",
                        filename="weekly_report.csv")


@router.get("/api/inference-log/csv-candidates")
def inference_log_csv_candidates():
    """导出本周候选多轮聚合 CSV。"""
    path = inference_log.export_csv_candidates(period="week")
    return FileResponse(path, media_type="text/csv",
                        filename="weekly_candidates.csv")


@router.get("/")
def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@router.get("/index")
@router.get("/index.html")
def index_html():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@router.get("/lab")
@router.get("/lab.html")
def lab_html():
    return FileResponse(os.path.join(STATIC_DIR, "lab.html"))


@router.get("/char")
@router.get("/char.html")
def char_html():
    return FileResponse(os.path.join(STATIC_DIR, "char.html"))


@router.get("/dft")
@router.get("/dft.html")
def dft_html():
    return FileResponse(os.path.join(STATIC_DIR, "dft.html"))


@router.get("/recipe")
@router.get("/recipe.html")
def recipe_html():
    return FileResponse(os.path.join(STATIC_DIR, "recipe.html"))


@router.get("/overview_photo")
@router.get("/overview_photo.html")
def overview_photo_html():
    """总览-光催化闭环设计（甲烷偶联光催化，独立于 GN 产线总览）。"""
    return FileResponse(os.path.join(STATIC_DIR, "overview_photo.html"))


@router.get("/workflow_editor")
@router.get("/workflow_editor.html")
def workflow_editor_html():
    """可视化工作流编辑器：拖拽编排 Uni-Lab OS 可执行工作流（兼容 unilab_workflow.json）。"""
    return FileResponse(os.path.join(STATIC_DIR, "workflow_editor.html"))


@router.get("/datalog")
@router.get("/datalog.html")
def datalog_html():
    """工作流运行日志：按工作流查看每次运行，并下载 xlsx。"""
    return FileResponse(os.path.join(STATIC_DIR, "datalog.html"))


# ------------------------------------------------------------
# 工作流编辑器：保存 / 列表 / 打开（用户手工编排的工作流）
# ------------------------------------------------------------
WORKFLOW_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "workflows")
os.makedirs(WORKFLOW_DIR, exist_ok=True)


def _safe_wf_name(name: str) -> str:
    """文件名白名单：仅中文/字母/数字/下划线/中划线/点，防路径穿越。"""
    import re as _re
    name = _re.sub(r"[^\w\u4e00-\u9fff.\- ]", "", name).strip()
    return name[:80] or "untitled"


@router.get("/api/workflow-list")
def workflow_list():
    """列出用户已保存的工作流（workflows/*.json），返回名称/大小/修改时间。"""
    items = []
    for f in sorted(os.listdir(WORKFLOW_DIR)):
        if not f.endswith(".json"):
            continue
        p = os.path.join(WORKFLOW_DIR, f)
        try:
            st = os.stat(p)
            items.append({"name": f[:-5], "size": st.st_size,
                          "mtime": int(st.st_mtime)})
        except OSError:
            continue
    return {"ok": True, "workflows": items}


@router.get("/api/workflow-open")
def workflow_open(name: str = ""):
    """读取已保存工作流。"""
    fn = _safe_wf_name(name) + ".json"
    p = os.path.join(WORKFLOW_DIR, fn)
    if not os.path.isfile(p):
        return {"ok": False, "error": "工作流不存在: %s" % name}
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        return {"ok": True, "name": name, "workflow": data}
    except Exception as e:
        return {"ok": False, "error": "读取失败: %s" % e}


@router.post("/api/workflow-save")
def workflow_save(req: dict):
    """保存工作流：body {name:str, workflow:dict} → workflows/{name}.json"""
    name = _safe_wf_name(str(req.get("name") or "untitled"))
    wf = req.get("workflow")
    if not isinstance(wf, dict):
        return {"ok": False, "error": "workflow 必须是 JSON 对象"}
    try:
        p = os.path.join(WORKFLOW_DIR, name + ".json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(wf, f, ensure_ascii=False, indent=2)
        _upsert_template(wf)
        return {"ok": True, "name": name, "path": p}
    except Exception as e:
        return {"ok": False, "error": "保存失败: %s" % e}


# 模版：插入到其它工作流里的是引用。内容只存一份，改这里，所有引用处展开时都是新的。
TPL_DIR = os.path.join(WORKFLOW_DIR, "templates")
os.makedirs(TPL_DIR, exist_ok=True)


def _tpl_id(wf_or_id) -> str:
    import re as _re
    if isinstance(wf_or_id, dict):
        raw = str(((wf_or_id.get("data") or {}).get("workflow_uuid")) or "")
    else:
        raw = str(wf_or_id or "")
    tid = _re.sub(r"[^0-9A-Za-z\-]", "", raw)[:80]
    return tid


def _read_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _tpl_summary(wf: dict, mtime: int, source: str) -> dict:
    data = wf.get("data") or {}
    nodes = data.get("nodes") or []
    embeds = data.get("embeds") or []
    return {
        "id": _tpl_id(wf),
        "name": wf.get("name") or data.get("workflow_name") or "未命名工作流",
        "nodes": len(nodes),
        "embeds": len(embeds),
        "mtime": mtime,
        "source": source,
        "as_template": bool(data.get("as_template")),
    }


def _upsert_template(wf: dict) -> str:
    tid = _tpl_id(wf)
    if not tid or not isinstance(wf, dict):
        return ""
    data = wf.setdefault("data", {})
    data["workflow_uuid"] = tid
    path = os.path.join(TPL_DIR, tid + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    return tid


@router.get("/api/workflow-templates")
def workflow_templates():
    """可插入的模版：templates/ 优先，再并进已保存工作流里带 workflow_uuid 的。"""
    found = {}
    if os.path.isdir(TPL_DIR):
        for fn in os.listdir(TPL_DIR):
            if not fn.endswith(".json"):
                continue
            path = os.path.join(TPL_DIR, fn)
            try:
                wf = _read_json(path)
                tid = _tpl_id(wf) or fn[:-5]
                if not tid:
                    continue
                found[tid] = _tpl_summary(wf, int(os.stat(path).st_mtime), "template")
            except (OSError, ValueError, json.JSONDecodeError):
                continue
    for fn in os.listdir(WORKFLOW_DIR):
        if not fn.endswith(".json"):
            continue
        path = os.path.join(WORKFLOW_DIR, fn)
        try:
            wf = _read_json(path)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        tid = _tpl_id(wf)
        if not tid or tid in found:
            continue
        found[tid] = _tpl_summary(wf, int(os.stat(path).st_mtime), "saved")
    items = sorted(found.values(), key=lambda x: x.get("mtime") or 0, reverse=True)
    return {"ok": True, "templates": items}


@router.get("/api/workflow-templates/{tid}")
def workflow_template_get(tid: str):
    tid = _tpl_id(tid)
    if not tid:
        return {"ok": False, "error": "模版 id 无效"}
    path = os.path.join(TPL_DIR, tid + ".json")
    if not os.path.isfile(path):
        for fn in os.listdir(WORKFLOW_DIR):
            if not fn.endswith(".json"):
                continue
            p = os.path.join(WORKFLOW_DIR, fn)
            try:
                wf = _read_json(p)
            except (OSError, ValueError, json.JSONDecodeError):
                continue
            if _tpl_id(wf) == tid:
                return {"ok": True, "id": tid, "workflow": wf}
        return {"ok": False, "error": "模版不存在"}
    try:
        return {"ok": True, "id": tid, "workflow": _read_json(path)}
    except Exception as e:
        return {"ok": False, "error": "读取失败: %s" % e}


@router.put("/api/workflow-templates/{tid}")
def workflow_template_put(tid: str, req: dict):
    """写入模版正文。所有插入了这份模版的工作流下次展开都会用到这份内容。"""
    tid = _tpl_id(tid)
    wf = req.get("workflow") if isinstance(req, dict) else None
    if not tid or not isinstance(wf, dict):
        return {"ok": False, "error": "模版内容无效"}
    wf = json.loads(json.dumps(wf))
    wf.setdefault("data", {})["workflow_uuid"] = tid
    try:
        _upsert_template(wf)
        return {"ok": True, "id": tid}
    except Exception as e:
        return {"ok": False, "error": "保存模版失败: %s" % e}


def _drop_embed(wf: dict, tid: str) -> bool:
    """从一份工作流里拿掉对 tid 的插入。返回是否改过。"""
    data = wf.get("data") if isinstance(wf, dict) else None
    if not isinstance(data, dict):
        return False
    embeds = data.get("embeds") or []
    if not isinstance(embeds, list):
        return False
    kept = [e for e in embeds if not (isinstance(e, dict) and e.get("template_id") == tid)]
    if len(kept) == len(embeds):
        return False
    data["embeds"] = kept
    return True


@router.delete("/api/workflow-templates/{tid}")
def workflow_template_delete(tid: str):
    """从列表删除一份工作流，并拿掉其它工作流里对它的插入。"""
    tid = _tpl_id(tid)
    if not tid:
        return {"ok": False, "error": "模版 id 无效"}
    removed = 0
    path = os.path.join(TPL_DIR, tid + ".json")
    if os.path.isfile(path):
        os.remove(path)
        removed += 1
    for folder in (WORKFLOW_DIR, TPL_DIR):
        if not os.path.isdir(folder):
            continue
        for fn in list(os.listdir(folder)):
            if not fn.endswith(".json"):
                continue
            p = os.path.join(folder, fn)
            if not os.path.isfile(p):
                continue
            try:
                wf = _read_json(p)
            except (OSError, ValueError, json.JSONDecodeError):
                continue
            if _tpl_id(wf) == tid:
                try:
                    os.remove(p)
                    removed += 1
                except OSError:
                    pass
                continue
            if _drop_embed(wf, tid):
                try:
                    with open(p, "w", encoding="utf-8") as f:
                        json.dump(wf, f, ensure_ascii=False, indent=2)
                except OSError:
                    pass
    return {"ok": True, "id": tid, "removed": removed}


# ============================================================
# 工作流运行（并行调度）：dry-run 立即可跑，real 走 Uni-Lab OS 适配器接口
#   - 依赖推进 / 设备资源锁 / 并发下发 均在 app/workflow_runtime.py 内实现，
#     语义对齐 Uni-Lab-OS：scheduler/dag_state.py（入度表 + 级联放出）与
#     workflow/resource_lock_key.py（device / named_resource 锁键）。
#   - mode="dry"  : DryRunDispatcher 按估算耗时压缩播放（默认 60×）
#   - mode="real" : UniLabOSDispatcher，接口已就位，需接线 ROS2 / HTTP 后可用
# ============================================================
from . import workflow_runtime as wfr


def _prep_workflow(wf) -> dict:
    """给节点补中文动作名（_label），供耗时估算与事件文案使用。"""
    if not isinstance(wf, dict):
        return {}
    try:
        return wfr.annotate_labels(wf)
    except Exception as e:                       # 节点库缺失不应阻塞运行
        logger.warning("annotate_labels 失败：%s", e)
        return wf


@router.post("/api/workflow-plan")
def workflow_plan(req: dict):
    """执行前预检：环检测 + 资源锁冲突计划 + 耗时估算（不下发任何任务）。

    前端「✅ 校验」按钮会带 workflow 调本接口，拿到与服务端一致的结论，
    避免前后端两套校验口径。body: {workflow:dict}
    """
    wf = _prep_workflow((req or {}).get("workflow") or {})
    data = wf.get("data") or {}
    nodes_all = data.get("nodes") or []
    nodes_live = [n for n in nodes_all if not n.get("disabled")]

    cycle: list = []
    try:
        probe = wfr.WorkflowRun(wf, mode="dry", speed=1e9)
        plan = probe.resource_plan()
        est = [{"uuid": u, "label": probe._name(u),
                "device": probe.nodes[u].get("device_name") or "",
                "est": round(wfr.estimate_duration(probe.nodes[u]), 2),
                "locks": sorted(probe.lock_keys.get(u, set()))}
               for u in probe.order]
        # 同设备串行总时长（乐观：该设备节点全串行）
        by_dev: dict = {}
        for e in est:
            by_dev.setdefault(e["device"], 0.0)
            by_dev[e["device"]] = round(by_dev[e["device"]] + e["est"], 2)
        return {
            "ok": True, "mode": "dry", "cycle": [],
            "resource_plan": plan, "nodes": est,
            "device_serial_duration": by_dev,
            "sum_duration": round(sum(e["est"] for e in est), 2),
            "count": len(nodes_live), "skipped": len(nodes_all) - len(nodes_live),
        }
    except wfr.WorkflowCycleError as e:
        return {"ok": False, "error": str(e), "cycle": getattr(e, "cycle", [])}
    except Exception as e:
        logger.exception("workflow-plan 失败")
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


@router.post("/api/workflow-run")
def workflow_run(req: dict):
    """启动一次运行。body:

        {workflow: dict,
         mode: "dry" | "real",
         speed: number,                        # dry 档的时间加速倍率
         action_mode: "simulate" | "real",     # real 档的驱动动作档（默认 simulate）
         allow_real: bool,                     # 真实硬件总闸（默认取 GN_ALLOW_REAL）
         opcua_url: str}                       # 覆盖 GN_OPCUA_URL

    dry（默认）：按估算耗时压缩播放，用于验证并行结构与设备占用。
    real       ：走 UniLabOSDispatcher → Uni-Lab-OS 的 GN 驱动。
                 **默认 action_mode=simulate**：驱动代码全跑，但不打开 OPC 会话，
                 用来验证「节点 → 驱动动作」的接线；要真动硬件必须再传
                 `action_mode:"real"` 且 `allow_real:true`（或环境变量 GN_ALLOW_REAL=1）。
    """
    req = req or {}
    mode = str(req.get("mode") or "dry").lower()
    if mode not in ("dry", "real"):
        return {"ok": False, "error": "mode 只能是 dry 或 real"}
    wf = _prep_workflow(req.get("workflow") or {})
    if not ((wf.get("data") or {}).get("nodes")):
        return {"ok": False, "error": "工作流为空：data.nodes 缺失或为空"}
    try:
        speed = float(req.get("speed") or 60.0)
    except (TypeError, ValueError):
        speed = 60.0
    speed = max(1.0, min(2000.0, speed))

    real_opts: dict = {}
    if mode == "real":
        am = str(req.get("action_mode") or "simulate").lower()
        if am not in ("simulate", "real"):
            return {"ok": False, "error": "action_mode 只能是 simulate 或 real"}
        # 真机档先做「配置可行性」检查，把错误在启动前就摆明，避免跑出一堆无意义的失败节点
        try:
            from .gn_adapter import config as gn_cfg
            from .gn_adapter import load as _gn_load
            cat = _gn_load()
        except Exception as e:
            return {"ok": False, "error": "GN 驱动装载失败：%s: %s" % (type(e).__name__, e)}
        if not cat.classes:
            return {"ok": False, "error": "GN 驱动目录一个驱动都没装载成功",
                    "load_errors": cat.errors}
        allow_real = req.get("allow_real")
        if allow_real is None:
            allow_real = gn_cfg.allow_real()
        if am == "real" and not allow_real:
            return {
                "ok": False,
                "error": ("真实硬件总闸未打开：action_mode=real 会驱动 510 硬件，"
                          "需要显式传 allow_real=true 或设置环境变量 GN_ALLOW_REAL=1。"
                          "要验证接线但不动硬件，请用 action_mode=simulate（默认）。"),
                "hint": {"action_mode": "simulate", "allow_real": False},
            }
        real_opts = {
            "action_mode": am,
            "allow_real": bool(allow_real),
            "url": str(req.get("opcua_url") or "").strip(),
        }

    try:
        run = wfr.REGISTRY.create(wf, mode=mode, speed=speed, real_opts=real_opts)
        run.start()
        out = {"ok": True, "run_id": run.run_id, "mode": run.mode,
               "dispatcher": run.dispatcher.name, "count": len(run.order)}
        if mode == "real":
            out["action_mode"] = real_opts.get("action_mode")
            out["hardware"] = real_opts.get("action_mode") == "real"
            out["opcua_url"] = real_opts.get("url") or "（默认 GN_OPCUA_URL）"
        return out
    except wfr.WorkflowCycleError as e:
        return {"ok": False, "error": str(e), "cycle": True}
    except Exception as e:
        logger.exception("workflow-run 启动失败")
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


# ============================================================
# GN 510 后端适配器：诊断（只读，不驱动任何机构）
# ============================================================
@router.get("/api/gn-adapter/status")
def gn_adapter_status(device: str = ""):
    """适配器状态：配置快照 + 已装载驱动 + 逐设备动作清单。

    不连硬件即可回答「环境配好了没、哪些设备能跑、某设备有哪些可用动作」。
    """
    try:
        from .gn_adapter import config as gn_cfg
        from .gn_adapter import drivers as gn_drivers
        cat = gn_drivers.load()
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}
    out = {"ok": True, "catalog": cat.status(),
           "device_specs": sorted(set(gn_drivers.DEVICE_SPECS) | set(gn_drivers.LOCAL_DEVICE_SPECS)),
           "config": gn_cfg.summary()}
    if device:
        try:
            out["actions"] = cat.actions(device)
        except Exception as e:
            out["actions_error"] = str(e)
    return out


@router.get("/api/gn-adapter/probe")
def gn_adapter_probe(device: str = "", action_mode: str = "simulate",
                     allow_real: bool = False, opcua_url: str = ""):
    """只读探针：验证 OPC 链路与整站就绪状态（`System_IsReady`）。

    `action_mode=simulate`（默认）时不会打开 OPC 会话，只回报「当前处于仿真档」。
    要看真机连通性，传 `action_mode=real`（读取是只读的，不会驱动机构）。
    """
    try:
        from .gn_adapter import get_station
        st = get_station(url=(opcua_url or None), action_mode=action_mode, allow_real=allow_real)
        return {"ok": True, "probe": st.probe(device or None)}
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


# ============================================================
# PRCXI 9320 deck 板位资源清单（只读，供编辑器 4×4 板位点选）
# ============================================================
@router.get("/api/gn-adapter/prcxi-deck")
def gn_adapter_prcxi_deck(process: str = "", action: str = "", refresh: bool = False):
    """PRCXI 9320 工作台 16 个物理板位的资源清单。

    - `process`: aus | autet | mof（台面工艺语义，默认 autet）
    - `action` : transfer_liquid / titration_liquid / move_plate 时额外给出角色定义
                 与逐板位可用性（source/target/tips 或 from/to）
    - `refresh=true`: 用现网真实工作流重算「板位→资源」实测证据（只读，不连硬件）

    板位几何源自驱动 `PRCXI9300Deck`（4 行 × 4 列 = 16 位，行主序 T1..T16）；
    资源实例取自真实工作流里 PRCXI 节点的 sources/targets/tip_racks。
    """
    try:
        from .gn_adapter import prcxi_deck as gn_deck
        out: dict = {}
        if refresh:
            out["refresh"] = gn_deck.refresh_from_workflows()
        out.update(gn_deck.snapshot(process=process or None, action=action or None))
        return out
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


# ============================================================
# GN 510 虚拟实时仿真（LIVE）：快照 / SSE 流 / 仿真指令注入
# ============================================================
@router.get("/api/gn-adapter/live")
def gn_adapter_live():
    """全站实时快照（仿真模型 + DMTP 镜像，不连硬件）。"""
    try:
        from .gn_adapter import live as gn_live
        return gn_live.snapshot()
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


@router.get("/api/gn-adapter/live/stream")
def gn_adapter_live_stream(interval: float = 1.0):
    """SSE 实时流：每 interval 秒推一次全站快照（前端 EventSource 订阅）。"""
    from fastapi.responses import StreamingResponse
    from .gn_adapter import live as gn_live
    interval = max(0.5, min(5.0, float(interval or 1.0)))
    return StreamingResponse(gn_live.event_stream(interval=interval),
                             media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@router.get("/api/gn-adapter/live/trace")
def gn_adapter_live_trace(limit: int = 50):
    """最近实时事件轨迹（新→旧）。"""
    try:
        from .gn_adapter import live as gn_live
        return {"ok": True, "trace": gn_live.trace(limit=max(1, min(200, limit)))}
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


@router.post("/api/gn-adapter/live/cmd")
def gn_adapter_live_cmd(body: dict = None):
    """仿真指令注入（**仅仿真档**，让总览设备卡读数真实变化）。

    body: {card: "liquid" | "tube" | ... , action: str, param: {...}}
    真机动作必须走 /api/workflow-run 的三层闸 —— 本接口绝不越权。
    """
    try:
        from .gn_adapter import live as gn_live
        body = body or {}
        card = str(body.get("card") or "").strip()
        if not card:
            return {"ok": False, "error": "缺少 card（设备卡 key）"}
        return gn_live.inject_command(card, body)
    except Exception as e:
        return {"ok": False, "error": "%s: %s" % (type(e).__name__, e)}


@router.get("/api/workflow-runs")
def workflow_runs():
    """列出内存中的运行记录（新→旧）。"""
    items = []
    for rid in reversed(list(getattr(wfr.REGISTRY, "_order", []))):
        r = wfr.REGISTRY.get(rid)
        if not r:
            continue
        items.append({"run_id": r.run_id, "workflow_name": r.workflow_name,
                      "mode": r.mode, "finished": r.finished,
                      "elapsed": round((r.ended_at or time.time()) - (r.started_at or time.time()), 2),
                      "counts": r.summary().get("counts", {})})
    return {"ok": True, "runs": items}


@router.get("/api/datalog")
def datalog_list():
    """已落盘的工作流运行日志（新→旧）。xlsx 在 data/Datalog_Workflow。"""
    from .run_datalog import list_runs, DATALOG_DIR
    return {"ok": True, "dir": DATALOG_DIR, "runs": list_runs()}


@router.get("/api/datalog/{run_id}")
def datalog_detail(run_id: str):
    from .run_datalog import run_detail
    hit = run_detail(run_id)
    if not hit:
        return {"ok": False, "error": "没有这份运行日志"}
    hit["ok"] = True
    return hit


@router.get("/api/datalog/{run_id}/xlsx")
def datalog_xlsx(run_id: str):
    from .run_datalog import xlsx_path
    path = xlsx_path(run_id)
    if not path:
        return {"ok": False, "error": "xlsx 不存在"}
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(path),
    )


@router.get("/api/workflow-run/{run_id}")
def workflow_run_state(run_id: str):
    """取运行快照（节点状态 / 时序 / 占用锁 / 事件 / 汇总）。"""
    r = wfr.REGISTRY.get(run_id)
    if not r:
        return {"ok": False, "error": "运行不存在或已过期: %s" % run_id}
    snap = r.snapshot()
    snap["ok"] = True
    return snap


@router.post("/api/workflow-run/{run_id}/pause")
def workflow_run_pause(run_id: str):
    """停在当前正在执行的节点。未开始的节点保持不动，运行不结束。"""
    ok = wfr.REGISTRY.pause(run_id)
    return {"ok": bool(ok), "run_id": run_id, "paused": True} if ok else {
        "ok": False, "error": "运行不存在，或已经结束"}


@router.post("/api/workflow-run/{run_id}/resume")
def workflow_run_resume(run_id: str):
    """从暂停时正在执行的节点接着跑。"""
    ok = wfr.REGISTRY.resume(run_id)
    return {"ok": bool(ok), "run_id": run_id, "paused": False} if ok else {
        "ok": False, "error": "运行不存在，或当前没有暂停"}


@router.post("/api/workflow-run/{run_id}/cancel")
def workflow_run_cancel(run_id: str):
    """请求取消：运行中的节点不再级联放出后继，未开始节点标记为 canceled。"""
    ok = wfr.REGISTRY.cancel(run_id)
    return {"ok": bool(ok), "run_id": run_id} if ok else {"ok": False, "error": "运行不存在"}


@router.get("/api/workflow-run/{run_id}/resource-plan")
def workflow_run_resource_plan(run_id: str):
    """该运行涉及的设备/资源锁占用计划（谁和谁必须串行）。"""
    r = wfr.REGISTRY.get(run_id)
    if not r:
        return {"ok": False, "error": "运行不存在: %s" % run_id}
    return {"ok": True, "run_id": run_id, "plan": r.resource_plan()}


@router.get("/api/workflow-run/{run_id}/stream")
def workflow_run_stream(run_id: str, interval: float = 0.25):
    """SSE 事件流：前端据此实时给节点着色、画并行甘特、刷设备占用。

    事件类型：snapshot（增量快照） / done（运行结束，发完即关）。
    用同步生成器即可（Starlette 会放到线程池执行），无需 asyncio 队列。
    """
    r = wfr.REGISTRY.get(run_id)
    if not r:
        return JSONResponse({"ok": False, "error": "运行不存在: %s" % run_id}, status_code=404)

    step = max(0.08, min(2.0, float(interval or 0.25)))

    def _gen():
        last_len = -1
        last_states = None
        try:
            yield "event: hello\ndata: %s\n\n" % json.dumps(
                {"run_id": run_id, "mode": r.mode, "dispatcher": r.dispatcher.name,
                 "count": len(r.order)}, ensure_ascii=False)
            while True:
                snap = r.snapshot()
                states_key = json.dumps(snap["states"], sort_keys=True)
                if len(snap["events"]) != last_len or states_key != last_states:
                    last_len = len(snap["events"])
                    last_states = states_key
                    yield "event: snapshot\ndata: %s\n\n" % json.dumps(snap, ensure_ascii=False)
                if r.finished:
                    yield "event: done\ndata: %s\n\n" % json.dumps(
                        {"run_id": run_id, "summary": r.summary()}, ensure_ascii=False)
                    break
                time.sleep(step)
        except GeneratorExit:                     # 前端断开
            return
        except Exception as e:                    # noqa: BLE001
            logger.warning("workflow-run stream 异常：%s", e)
            return

    return StreamingResponse(_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no",
                                      "Connection": "keep-alive"})


# ============================================================
# RealData：真实世界实验数据文件（.tif/.csv/.xlsx）的上传 / 列表 / 解析
# 前端在「真实实验反馈」阶段用弹窗让用户拖拽/点选上传，或选择已存文件，
# 解析出真实实测产率/选择性，作为真实实验反馈（替代模拟噪声值）。
# ============================================================
import csv as _csv
import io as _io


def _sanitize_filename(name: str) -> str:
    """去掉路径分隔符，避免目录穿越，保留文件名本体。"""
    name = (name or "upload.bin").strip()
    name = name.replace("\\", "_").replace("/", "_").replace("..", "_")
    return name or "upload.bin"


def _parse_tabular(text_or_bytes, ext: str, max_rows: int = 5000):
    """解析 CSV / TSV / XLSX 文本，返回行字典列表。返回 (rows, error)。"""
    if ext == "xlsx":
        try:
            # 优先用 openpyxl（若已安装）；否则回退提示
            from openpyxl import load_workbook
        except Exception:
            return None, "服务器未安装 openpyxl，无法解析 .xlsx；请改为上传 .csv，或用控制栏按钮上传后由前端解析。"
        try:
            wb = load_workbook(_io.BytesIO(text_or_bytes), read_only=True, data_only=True)
            ws = wb.active
            rows = []
            for i, r in enumerate(ws.iter_rows(values_only=True)):
                if i >= max_rows:
                    break
                rows.append([("" if c is None else c) for c in r])
            if not rows:
                return None, "xlsx 为空"
            header = [str(h).strip() for h in rows[0]]
            return [dict(zip(header, [str(x).strip() for x in r])) for r in rows[1:] if any(str(x).strip() for x in r)], None
        except Exception as e:
            return None, "xlsx 解析失败：" + str(e)[:160]
    # csv / tsv
    try:
        if isinstance(text_or_bytes, bytes):
            text = text_or_bytes.decode("utf-8-sig", errors="replace")
        else:
            text = text_or_bytes
        delim = "\t" if ("\t" in text[:4000]) else ","
        reader = list(_csv.DictReader(_io.StringIO(text), delimiter=delim))
        return reader, None
    except Exception as e:
        return None, "csv 解析失败：" + str(e)[:160]


# 列名别名 → 语义字段
_YIELD_ALIASES = ("yield", "产率", "c2产率", "c2 yield", "rate", "活性", "activity",
                  "productivity", "μmol", "y ")
_SEL_ALIASES = ("selectivity", "选择性", "c2 sel", "c2 selectivity", "sel", "s%", "s ")
_CAT_ALIASES = ("catalyst", "催化剂", "sample", "样品", "name", "名称", "cat")
_DOI_ALIASES = ("doi", "文献", "ref", "reference")
_T_ALIASES = ("temperature", "温度", "t(℃)", "t(°c)", "temp", "tc")


def _match_col(header: list[str], aliases: tuple):
    low = [str(h).strip().lower() for h in header]
    for a in aliases:
        aa = a.strip().lower()
        if aa in low:
            return low.index(aa)
    # 子串模糊
    for i, h in enumerate(low):
        for a in aliases:
            if a.strip() and a.strip() in h:
                return i
    return -1


def _to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace("%", "").replace(",", "")
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


@router.get("/api/realdatalist")
def realdata_list():
    """列出 RealData 目录中已上传的真实实验数据文件（含大小/时间/类型）。"""
    items = []
    try:
        for p in sorted(REALDATA_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if p.is_file():
                items.append({
                    "name": p.name,
                    "size": p.stat().st_size,
                    "mtime": int(p.stat().st_mtime),
                    "ext": p.suffix.lower().lstrip("."),
                })
    except Exception:
        pass
    return {"dir": str(REALDATA_DIR), "files": items}


@router.post("/api/realdataparse")
async def realdata_parse(
    file: UploadFile = File(None),
    existing: str = Form(None),     # RealData 中已有文件名（与 file 二选一）
    reaction: str = Form("OCM"),
):
    """接收上传文件或指定 RealData 中已有文件，解析出真实实测记录。

    返回 {accepted, rows:[{catalyst,doi,temperature,yield,selectivity,raw}],
          summary:{n, mean_yield, mean_sel}, note}
    - csv/xlsx：提取产率/选择性/催化剂/温度/DOI 列
    - tif：仅保存（图像无法直接解析数值），返回 accepted=false + 提示用配套 csv
    """
    data_bytes = None
    fname = None
    if file is not None and getattr(file, "filename", None):
        data_bytes = await file.read()
        fname = _sanitize_filename(file.filename)
        # 落盘到 RealData
        try:
            (REALDATA_DIR / fname).write_bytes(data_bytes)
        except Exception as e:
            return JSONResponse(status_code=500, content={"accepted": False, "note": "保存失败：" + str(e)[:160]})
    elif existing:
        ep = REALDATA_DIR / _sanitize_filename(existing)
        if not ep.exists():
            return JSONResponse(status_code=404, content={"accepted": False, "note": "未找到文件 " + existing})
        data_bytes = ep.read_bytes()
        fname = ep.name
    else:
        return JSONResponse(status_code=400, content={"accepted": False, "note": "未提供文件"})

    ext = (fname.rsplit(".", 1)[-1].lower() if "." in fname else "bin")
    if ext in ("tif", "tiff", "png", "jpg", "jpeg", "bmp", "pdf"):
        # 图像/二进制：无法直接解析数值，仅告知已保存
        return {
            "accepted": False,
            "saved": fname,
            "note": ("已保存图像/二进制文件 %s 到 RealData。图像中的谱图/衍射斑点需人工读取后，"
                     "以 .csv/.xlsx 录入实测产率/选择性，再上传该表即可得到真实实验反馈。" % fname),
            "rows": [],
        }

    rows, err = _parse_tabular(data_bytes, ext)
    if err:
        return JSONResponse(status_code=422, content={"accepted": False, "saved": fname, "note": err})
    if not rows:
        return {"accepted": False, "saved": fname, "note": "未解析到数据行（请确认表头与数据行）。", "rows": []}

    header = list(rows[0].keys())
    iy = _match_col(header, _YIELD_ALIASES)
    isl = _match_col(header, _SEL_ALIASES)
    ic = _match_col(header, _CAT_ALIASES)
    ido = _match_col(header, _DOI_ALIASES)
    it = _match_col(header, _T_ALIASES)

    out = []
    for r in rows:
        yv = _to_float(r[header[iy]]) if iy >= 0 else None
        sv = _to_float(r[header[isl]]) if isl >= 0 else None
        if yv is None and sv is None:
            continue   # 该行无数值，跳过
        out.append({
            "catalyst": (str(r[header[ic]]).strip() if ic >= 0 else ""),
            "doi": (str(r[header[ido]]).strip() if ido >= 0 else ""),
            "temperature": (_to_float(r[header[it]]) if it >= 0 else None),
            "yield": yv,
            "selectivity": sv,
        })
    if not out:
        return {"accepted": False, "saved": fname,
                "note": "未识别到产率/选择性列（表头需含 yield/产率/选择性 等关键字）。", "rows": []}
    ys = [o["yield"] for o in out if o["yield"] is not None]
    ss = [o["selectivity"] for o in out if o["selectivity"] is not None]
    return {
        "accepted": True,
        "saved": fname,
        "reaction": reaction,
        "columns": {"yield": (header[iy] if iy >= 0 else None),
                    "selectivity": (header[isl] if isl >= 0 else None),
                    "catalyst": (header[ic] if ic >= 0 else None),
                    "doi": (header[ido] if ido >= 0 else None),
                    "temperature": (header[it] if it >= 0 else None)},
        "rows": out,
        "summary": {
            "n": len(out),
            "mean_yield": (round(sum(ys) / len(ys), 2) if ys else None),
            "mean_sel": (round(sum(ss) / len(ss), 2) if ss else None),
        },
        "note": "成功解析 %d 行真实实测记录。" % len(out),
    }


# ============================================================
# AI 对话代理（外部 LLM）
# 前端对话面板把用户消息发到本接口，后端用项目给定的外部 API key 调用
# llmapi.blsc.cn（OpenAI 兼容），返回自然语言回复 + 可选 ACTION 指令，
# 前端据此驱动世界模型实时运行/反馈。Key 仅存于后端，不进前端。
# ============================================================
@router.post("/api/chat")
async def chat_endpoint(req: ChatReq):
    """AI 对话（流式 SSE）：逐块推送 {type:'text',delta} 片段，结束前推送
    {type:'action',value} 指令（run/step/open_realdata/reaction_CH4/reaction_OER/evaluate）。
    支持 model/base_url/api_key 覆盖（前端按用户选择的模型/端点传入）。"""
    async def event_gen():
        try:
            for chunk in ext_llm.stream_chat(
                req.message, req.history, req.world_state,
                model=req.model, base_url=req.base_url, api_key=req.api_key):
                if chunk["type"] == "text":
                    yield "data: " + json.dumps({"delta": chunk["delta"]}, ensure_ascii=False) + "\n\n"
                elif chunk["type"] == "action":
                    yield "event: action\ndata: " + json.dumps({"value": chunk["value"]}, ensure_ascii=False) + "\n\n"
                elif chunk["type"] == "error":
                    yield "event: error\ndata: " + json.dumps({"delta": chunk["delta"]}, ensure_ascii=False) + "\n\n"
        except Exception as e:
            logger.error("[chat] 流式异常：%s", e)
            yield "event: error\ndata: " + json.dumps({"delta": "对话失败：" + str(e)[:200]}, ensure_ascii=False) + "\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ============================================================
# AI 对话栏 · 数据文件上传分析（.csv/.xlsx 数值表 → 解析 + LLM 专家分析；
# 图像/.tif 仅存档，提示用配套数值表）。分析结果可直接「应用为真实实验反馈」。
# ============================================================
@router.post("/api/chat/analyze-file")
async def chat_analyze_file(
    file: UploadFile = File(None),
    reaction: str = Form("OCM"),
    model: str = Form(None),
    base_url: str = Form(None),
    api_key: str = Form(None),
    question: str = Form(""),
):
    """接收对话栏上传的数据文件，解析实测记录并用 LLM 做专家分析。
    返回 {ok, accepted, saved, columns, rows, summary, analysis, note}。
    前端据 accepted 显示解析卡 + 分析文本，并提供「应用为真实实验反馈」按钮。"""
    if file is None or not getattr(file, "filename", None):
        return JSONResponse(status_code=400, content={"ok": False, "note": "未提供文件"})
    data_bytes = await file.read()
    fname = _sanitize_filename(file.filename)
    try:
        (REALDATA_DIR / fname).write_bytes(data_bytes)
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "note": "保存失败：" + str(e)[:160]})

    ext = (fname.rsplit(".", 1)[-1].lower() if "." in fname else "bin")
    if ext in ("tif", "tiff", "png", "jpg", "jpeg", "bmp", "pdf"):
        return {"ok": True, "accepted": False, "is_image": True, "saved": fname, "rows": [], "analysis": None,
                "note": ("已保存图像/二进制文件 %s 到 RealData。本对话面板暂仅支持对 .csv/.xlsx "
                         "做数值分析与真实实验反馈；图像谱图请用配套的数值表录入后再上传分析。" % fname)}

    rows, err = _parse_tabular(data_bytes, ext)
    if err:
        return JSONResponse(status_code=422, content={"ok": False, "saved": fname, "note": err})
    if not rows:
        return {"ok": True, "accepted": False, "saved": fname, "rows": [], "analysis": None,
                "note": "未解析到数据行（请确认表头与数据行）。"}

    header = list(rows[0].keys())
    iy = _match_col(header, _YIELD_ALIASES)
    isl = _match_col(header, _SEL_ALIASES)
    ic = _match_col(header, _CAT_ALIASES)
    ido = _match_col(header, _DOI_ALIASES)
    it = _match_col(header, _T_ALIASES)

    out = []
    for r in rows:
        yv = _to_float(r[header[iy]]) if iy >= 0 else None
        sv = _to_float(r[header[isl]]) if isl >= 0 else None
        if yv is None and sv is None:
            continue
        out.append({
            "catalyst": (str(r[header[ic]]).strip() if ic >= 0 else ""),
            "doi": (str(r[header[ido]]).strip() if ido >= 0 else ""),
            "temperature": (_to_float(r[header[it]]) if it >= 0 else None),
            "yield": yv,
            "selectivity": sv,
        })
    if not out:
        return {"ok": True, "accepted": False, "saved": fname, "rows": [], "analysis": None,
                "note": "未识别到产率/选择性列（表头需含 yield/产率/选择性 等关键字）。"}
    ys = [o["yield"] for o in out if o["yield"] is not None]
    ss = [o["selectivity"] for o in out if o["selectivity"] is not None]
    summary = {
        "n": len(out),
        "mean_yield": (round(sum(ys) / len(ys), 2) if ys else None),
        "mean_sel": (round(sum(ss) / len(ss), 2) if ss else None),
    }

    # 构建给 LLM 的数据文本（前 60 行 + 统计），并调用数据专家分析
    data_lines = ["催化剂\tDOI\t温度\t产率\t选择性"]
    for o in out[:60]:
        data_lines.append("%s\t%s\t%s\t%s\t%s" % (
            o["catalyst"] or "-", o["doi"] or "-",
            (o["temperature"] if o["temperature"] is not None else "-"),
            (o["yield"] if o["yield"] is not None else "-"),
            (o["selectivity"] if o["selectivity"] is not None else "-")))
    data_text = "\n".join(data_lines)
    stats = "共 %d 条；平均产率=%s；平均选择性=%s。" % (
        summary["n"], summary["mean_yield"], summary["mean_sel"])
    llm_user = ("以下是一组真实实验数据（反应体系：%s）：\n\n%s\n\n统计：%s\n\n"
                "请作为催化实验数据分析专家给出诊断与建议。" % (reaction, data_text, stats))
    analysis = None
    note_suffix = ""
    try:
        analysis = ext_llm.analyze_experimental_data(
            llm_user, question=question, model=model, base_url=base_url, api_key=api_key)
    except Exception as e:
        logger.error("[chat-analyze] LLM 分析失败：%s", e)
        note_suffix = "（AI 分析失败：" + str(e)[:160] + "，仅返回解析结果）"

    return {
        "ok": True, "accepted": True, "saved": fname, "reaction": reaction,
        "columns": {
            "yield": (header[iy] if iy >= 0 else None),
            "selectivity": (header[isl] if isl >= 0 else None),
            "catalyst": (header[ic] if ic >= 0 else None),
            "doi": (header[ido] if ido >= 0 else None),
            "temperature": (header[it] if it >= 0 else None),
        },
        "rows": out,
        "summary": summary,
        "analysis": analysis,
        "note": (("成功解析并分析 %d 行真实数据。" % len(out)) + note_suffix),
    }


# ============================================================
# 本地 Ollama 探测（对话面板「本地模型」模式用）
# 后端同机探测 Ollama 实际监听地址，拉取已装模型列表。
# ============================================================
import urllib.request as _ur
import urllib.error as _ue

_OLLAMA_CANDIDATES = [
    ("127.0.0.1", 11434),
    ("localhost", 11434),
]


def _ollama_probe():
    """探测 Ollama 可达地址，返回 (host, port) 或 None。"""
    for host, port in _OLLAMA_CANDIDATES:
        url = "http://%s:%d/api/tags" % (host, port)
        try:
            req = _ur.Request(url, method="GET", headers={"Cache-Control": "no-store"})
            with _ur.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    return host, port
        except Exception:
            continue
    return None


@router.get("/api/ollama/status")
def ollama_status():
    """探测本机 Ollama 是否可达，返回实际 base_url（OpenAI 兼容）。"""
    hit = _ollama_probe()
    if not hit:
        return {"reachable": False, "host": None, "port": None, "base_url": None}
    host, port = hit
    return {"reachable": True, "host": host, "port": port,
            "base_url": "http://%s:%d/v1" % (host, port)}


@router.get("/api/ollama/models")
def ollama_models():
    """拉取 Ollama 已装模型名列表（供本地模型模式下拉填充）。"""
    hit = _ollama_probe()
    if not hit:
        return {"ok": False, "models": [], "base_url": None,
                "note": "未探测到本机 Ollama（默认 127.0.0.1:11434）。请确认 `ollama serve` 已运行。"}
    host, port = hit
    base_url = "http://%s:%d/v1" % (host, port)
    try:
        req = _ur.Request("http://%s:%d/api/tags" % (host, port), method="GET",
                          headers={"Cache-Control": "no-store"})
        with _ur.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        names = [m.get("name") for m in data.get("models", []) if m.get("name")]
        return {"ok": True, "models": names, "base_url": base_url}
    except Exception as e:
        return {"ok": False, "models": [], "base_url": base_url,
                "note": "拉取模型列表失败：" + str(e)[:160]}


# ========== 纯 BO 推理接口 ==========
import subprocess
import openpyxl as _openpyxl

DATA_DIR = "/Users/fenglongli/Downloads/unilabWorld/data"
BO_SCRIPT = os.path.join(DATA_DIR, "run_bo.py")
PYTHON_BIN = "/Users/fenglongli/uni-lab-os/bin/python3"

@router.post("/api/bo/run")
def bo_run():
    """读主表 → 训 GP → UCB 出 Top5 推荐配方"""
    try:
        # 跑 BO 脚本
        r = subprocess.run(
            [PYTHON_BIN, BO_SCRIPT],
            capture_output=True, text=True, timeout=60, cwd=DATA_DIR,
        )
        if r.returncode != 0:
            return {"ok": False, "error": "BO 脚本失败：" + r.stderr[-300:]}
        # 读 Top4 sheet（active）
        wb = _openpyxl.load_workbook(os.path.join(DATA_DIR, "bo_recommendations.xlsx"))
        ws = wb["Top4推荐"] if "Top4推荐" in wb.sheetnames else wb.active
        rows = list(ws.iter_rows(values_only=True))
        header = rows[0]
        top = []
        for row in rows[1:]:
            d = dict(zip(header, row))
            top.append({
                "metal": d.get("金属"),
                "loading": d.get("负载量wt%"),
                "support": d.get("载体"),
                "lpd": d.get("光强mW/cm2"),
                "flow_ch4": d.get("CH4流量mL/min"),
                "flow_o2": d.get("O2流量mL/min"),
                "mu_pC2": round(d.get("预测p_C2+均值μmol/g/h") or 0, 1),
                "p_low": round(d.get("95%下限") or 0, 1),
                "p_high": round(d.get("95%上限") or 0, 1),
                "done": "是" if d.get("是否已做过") else "否",
                "n": d.get("实测n"),
                "mean_sel": d.get("实测均sel%"),
                "score": d.get("综合分"),
                "ucb": d.get("UCB(p_C2+)"),
                "wf": d.get("功函数eV"),
                "eg": d.get("载体Eg eV"),
                "pf": d.get("physfactor"),
                "r_opt": d.get("R_opt(O2:CH4)"),
                "i_opt": d.get("I_opt光强"),
                "note": d.get("备注"),
            })
        # 读 24 点排产 sheet
        plans = []
        if "24点排产" in wb.sheetnames:
            ws2 = wb["24点排产"]
            rows2 = list(ws2.iter_rows(values_only=True))
            h2 = rows2[0]
            for row in rows2[1:]:
                d2 = dict(zip(h2, row))
                plans.append({
                    "rank": d2.get("推荐序"),
                    "catalyst": d2.get("催化剂"),
                    "kind": d2.get("采集类型"),
                    "cond": d2.get("采集类型"),
                    "hyp": d2.get("机理假设"),
                    "ch4": d2.get("CH4 mL/min"),
                    "o2": d2.get("O2 mL/min"),
                    "ar": d2.get("Ar mL/min"),
                    "lpd": d2.get("光强mW/cm2"),
                    "r_opt": d2.get("R_opt"),
                    "i_opt": d2.get("I_opt"),
                    "ratio": d2.get("CH4:O2比"),
                    "ucb": d2.get("UCB"),
                    "mu": d2.get("μ̂"),
                    "sig": d2.get("σ̂"),
                    "wf": d2.get("功函数eV"),
                    "eg": d2.get("载体Eg eV"),
                    "pf": d2.get("physfactor"),
                    "cstat": d2.get("约束状态"),
                })
        # 数训练样本
        wb_in = _openpyxl.load_workbook(os.path.join(DATA_DIR, "bo_input.xlsx"))
        n_train = wb_in.active.max_row - 1
        return {
            "ok": True,
            "n_train": n_train,
            "top": top,
            "plans": plans,
            "file_path": os.path.join(DATA_DIR, "bo_recommendations.xlsx"),
            "input_path": os.path.join(DATA_DIR, "bo_input.xlsx"),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}


@router.post("/api/bo/closed-loop")
def bo_closed_loop():
    """扫 Pd-P25 离散网格，列出证明当前最优点还要做的实验。"""
    try:
        from .bo_closed_loop import run_closed_loop
        return run_closed_loop()
    except Exception as e:
        logger.exception("bo closed loop")
        return {"ok": False, "error": str(e)[:300]}


