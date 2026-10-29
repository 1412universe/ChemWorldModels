"""
模型推理日志模块
================
每次 /api/next（主动学习决策）落地一次「模型推理」记录，并提供三类产物：

  1. 时间线视图  data/log/inference_log.html   —— 自包含 HTML，今日/本周/本月 三标签页
  2. 候选对比    data/log/inference_candidates.html —— 按候选聚合多轮迭代，对比预测/奖励走势
  3. 周报 CSV    data/log/weekly_report.csv    —— 本周逐条记录（便于 Excel 打开）
                 data/log/weekly_candidates.csv —— 本周候选多轮聚合

所有产物统一落在 data/log/ 目录，便于归档与查看。

HTML 内嵌全部记录（type=application/json），不依赖任何外部资源，可直接双击打开 /
保存到任意位置查看。标签页在前端按浏览器本地时间过滤，三档粒度：
  今日  → 当天记录
  本周  → 本周一 00:00 至本周日 24:00
  本月  → 当前自然月
"""
import os
import re
import csv
import json
import glob
import time
import logging
import datetime
from typing import Any, Optional

logger = logging.getLogger("wm.inferlog")

# 数据目录指向项目 data/，所有日志产物落在 data/log 子目录
from .data import DATA_DIR as _DATA_PATH
DATA_DIR = str(_DATA_PATH)
LOG_DIR = os.path.join(DATA_DIR, "log")
os.makedirs(LOG_DIR, exist_ok=True)

HTML_PATH = os.path.join(LOG_DIR, "inference_log.html")
CAND_HTML_PATH = os.path.join(LOG_DIR, "inference_candidates.html")

# 模型名（7B 策略器）：优先读运行期模型状态，失败回退常量
_MODEL_CONST = "qwen2.5:7b"

_last_regen = 0.0          # 节流：避免突发请求重复生成
_REGEN_MIN_GAP = 0.3       # 秒


# --------------------------------------------------------------------------- #
# 时间辅助
# --------------------------------------------------------------------------- #
def _now() -> datetime.datetime:
    return datetime.datetime.now()


def _fmt_num(v: Any) -> str:
    if v is None:
        return "—"
    try:
        f = float(v)
    except (TypeError, ValueError):
        return str(v)
    if abs(f) >= 1000:
        return f"{f:,.0f}"
    if abs(f) >= 10:
        return f"{f:.1f}"
    return f"{f:.2f}"


def _monday_of(d: datetime.datetime) -> datetime.datetime:
    x = d
    day = (x.weekday() + 6) % 7          # 周一=0
    return x - datetime.timedelta(days=day)


def _week_bounds(now: datetime.datetime):
    ws = _monday_of(now).replace(hour=0, minute=0, second=0, microsecond=0)
    we = ws + datetime.timedelta(days=6, hours=23, minutes=59, seconds=59)
    return ws, we


def _in_week(r: dict, ws: datetime.datetime, we: datetime.datetime) -> bool:
    ds = r.get("date")
    if not ds:
        return False
    try:
        d = datetime.datetime.strptime(ds, "%Y-%m-%d")
    except ValueError:
        return False
    return ws <= d <= we


def _cond_str(c: Optional[dict]) -> str:
    if not c or not isinstance(c, dict):
        return ""
    skip = {"__audit"}
    parts = []
    for k, v in c.items():
        if k in skip or v is None:
            continue
        if isinstance(v, (int, float)):
            v = round(v, 3)
        parts.append(f"{k}={v}")
    return "  ".join(parts)


# --------------------------------------------------------------------------- #
# 记录落盘
# --------------------------------------------------------------------------- #
def record_inference(rec: dict) -> None:
    """补充时间戳并落盘（每日 JSONL），随后（节流地）重生成两份 HTML。"""
    try:
        ts = _now()
        rec.setdefault("ts_iso", ts.strftime("%Y-%m-%d %H:%M:%S"))
        rec.setdefault("ts_epoch", ts.timestamp())
        rec.setdefault("date", ts.strftime("%Y-%m-%d"))
        # 追加写：每日一个文件，追加模式对并发安全
        day_file = os.path.join(LOG_DIR, f"inference_{rec['date']}.jsonl")
        with open(day_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        _maybe_regenerate()
    except Exception as e:  # 日志失败绝不能影响主决策链路
        logger.exception("record_inference failed: %s", e)


def build_record(req: Any, result: dict, latency_ms: int) -> dict:
    """从请求 + 决策结果构造一条推理记录。req 为 NextReq（仅读属性）。"""
    try:
        from .llm import get_model_status
        model_name = (get_model_status() or {}).get("model") or _MODEL_CONST
    except Exception:
        model_name = _MODEL_CONST

    cand = result.get("candidate") or {}
    used = bool(result.get("used_model"))
    cond = result.get("conditions") or {}
    reaction = getattr(req, "reaction", "CH4") or "CH4"
    return {
        "iteration": getattr(req, "iteration", None),
        "reaction": reaction,
        "oer_target": getattr(req, "oer_target", None),
        "acquisition": getattr(req, "acquisition", None),
        "mae": getattr(req, "mae", None),
        "sampled_n": len(getattr(req, "sampled", []) or []),
        "measured_n": len(getattr(req, "measured", []) or []),
        "used_model": used,
        "source": "7B策略器" if used else "确定性采集",
        "model": model_name,
        "strategy": result.get("strategy"),
        "rationale": result.get("rationale"),
        "conditions_source": result.get("conditions_source"),
        "candidate": {
            "id": cand.get("id"),
            "metal": cand.get("metal"),
            "support": cand.get("support"),
            "doi": cand.get("doi"),
            "formula": cand.get("formula") or cand.get("name"),
            "pred": result.get("pred"),
            "unc": result.get("unc"),
            "reward": result.get("reward"),
            "s_eff": result.get("s_eff"),
        },
        "conditions": cond,
        "latency_ms": latency_ms,
        "fallback_reason": (None if used else (result.get("rationale") or "")),
    }


def emit(req: Any, result: dict, t0: float) -> None:
    """在路由返回前调用：构造并落盘一条推理记录。"""
    try:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        record_inference(build_record(req, result, latency_ms))
    except Exception as e:
        logger.exception("emit inference log failed: %s", e)


# --------------------------------------------------------------------------- #
# 读取全部记录
# --------------------------------------------------------------------------- #
def load_all() -> list:
    recs: list = []
    for fn in sorted(glob.glob(os.path.join(LOG_DIR, "inference_*.jsonl"))):
        try:
            with open(fn, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        recs.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        except OSError:
            continue
    recs.sort(key=lambda r: r.get("ts_epoch", 0))
    return recs


def summary() -> dict:
    recs = load_all()
    total = len(recs)
    used = sum(1 for r in recs if r.get("used_model"))
    lats = [r.get("latency_ms", 0) for r in recs if r.get("latency_ms")]
    avg_lat = round(sum(lats) / len(lats), 1) if lats else 0
    today = _now().strftime("%Y-%m-%d")
    today_n = sum(1 for r in recs if r.get("date") == today)
    return {
        "total": total,
        "model_used": used,
        "model_used_rate": round(used / total, 3) if total else 0,
        "avg_latency_ms": avg_lat,
        "today": today_n,
        "generated_at": _now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# --------------------------------------------------------------------------- #
# 候选多轮迭代聚合
# --------------------------------------------------------------------------- #
def _cand_key(c: Optional[dict]) -> str:
    if not c:
        return "unknown"
    if c.get("doi"):
        return "doi:" + str(c["doi"])
    if c.get("id") is not None:
        return "id:" + str(c["id"])
    return (c.get("metal") or "?") + "/" + (c.get("support") or "?")


def _cand_label(c: Optional[dict]) -> str:
    if not c:
        return "未知候选"
    parts = []
    if c.get("metal") or c.get("support"):
        parts.append((c.get("metal") or "?") + "/" + (c.get("support") or "?"))
    if c.get("formula"):
        parts.append(str(c["formula"]))
    if c.get("id") is not None:
        parts.append("#" + str(c["id"]))
    return " · ".join(parts) if parts else "未知候选"


def candidate_report(reaction_filter: Optional[str] = None) -> list:
    """按候选聚合多轮迭代。返回列表，每项为该候选的多轮汇总。"""
    recs = load_all()
    groups: dict = {}
    for r in recs:
        if reaction_filter and r.get("reaction") != reaction_filter:
            continue
        c = r.get("candidate") or {}
        key = _cand_key(c)
        g = groups.setdefault(key, {
            "key": key, "label": _cand_label(c),
            "reaction": r.get("reaction"), "rounds": [],
        })
        g["rounds"].append({
            "iteration": r.get("iteration"),
            "date": r.get("date"),
            "ts_iso": r.get("ts_iso"),
            "pred": (r.get("candidate") or {}).get("pred"),
            "unc": (r.get("candidate") or {}).get("unc"),
            "reward": (r.get("candidate") or {}).get("reward"),
            "s_eff": (r.get("candidate") or {}).get("s_eff"),
            "strategy": r.get("strategy"),
            "source": r.get("source"),
            "conditions": r.get("conditions"),
        })
    out = []
    for g in groups.values():
        rs = sorted(g["rounds"],
                    key=lambda x: (x.get("iteration") if x.get("iteration") is not None else -1))
        preds = [x["pred"] for x in rs if x["pred"] is not None]
        rewards = [x["reward"] for x in rs if x["reward"] is not None]
        best = None
        if rewards:
            bi = max(range(len(rs)),
                     key=lambda i: (rs[i]["reward"] if rs[i]["reward"] is not None else float("-inf")))
            best = rs[bi]
        g["rounds"] = rs
        g["n_rounds"] = len(rs)
        g["pred_min"] = min(preds) if preds else None
        g["pred_max"] = max(preds) if preds else None
        g["reward_best"] = max(rewards) if rewards else None
        g["best_iter"] = best["iteration"] if best else None
        out.append(g)
    out.sort(key=lambda x: -(x["reward_best"] if x["reward_best"] is not None else float("-inf")))
    return out


# --------------------------------------------------------------------------- #
# CSV 导出
# --------------------------------------------------------------------------- #
def _records_in_week() -> list:
    recs = load_all()
    ws, we = _week_bounds(_now())
    return [r for r in recs if _in_week(r, ws, we)]


def export_csv_weekly() -> str:
    """导出本周逐条推理记录 CSV（utf-8-sig，便于 Excel 打开）。"""
    rows = _records_in_week()
    path = os.path.join(LOG_DIR, "weekly_report.csv")
    cols = ["date", "time", "iteration", "reaction", "source", "model", "strategy",
            "candidate_id", "metal", "support", "doi", "formula",
            "pred", "unc", "reward", "s_eff", "conditions",
            "latency_ms", "sampled_n", "measured_n", "mae", "rationale"]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            c = r.get("candidate") or {}
            tm = (r.get("ts_iso") or "")[11:19]
            w.writerow([
                r.get("date"), tm, r.get("iteration"), r.get("reaction"),
                r.get("source"), r.get("model"), r.get("strategy"),
                c.get("id"), c.get("metal"), c.get("support"),
                c.get("doi"), c.get("formula"), c.get("pred"), c.get("unc"),
                c.get("reward"), c.get("s_eff"),
                _cond_str(r.get("conditions")),
                r.get("latency_ms"), r.get("sampled_n"), r.get("measured_n"),
                r.get("mae"), r.get("rationale"),
            ])
    logger.info("weekly_report.csv 导出 %d 条 -> %s", len(rows), path)
    return path


def export_csv_candidates(period: str = "week") -> str:
    """导出候选多轮聚合 CSV（默认本周）。"""
    groups = candidate_report()
    if period == "week":
        ws, we = _week_bounds(_now())
        # 仅保留本周出现过的候选（任一 round 在本周即可）
        keep = set()
        for r in _records_in_week():
            keep.add(_cand_key(r.get("candidate")))
        groups = [g for g in groups if g["key"] in keep]
    path = os.path.join(LOG_DIR, "weekly_candidates.csv")
    cols = ["candidate", "reaction", "n_rounds", "best_iter",
            "best_reward", "pred_min", "pred_max"]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for g in groups:
            w.writerow([
                g["label"], g.get("reaction"), g["n_rounds"], g.get("best_iter"),
                g.get("reward_best"), g.get("pred_min"), g.get("pred_max"),
            ])
    logger.info("weekly_candidates.csv 导出 %d 个候选 -> %s", len(groups), path)
    return path


# --------------------------------------------------------------------------- #
# HTML 生成（节流 + 两份视图）
# --------------------------------------------------------------------------- #
def _maybe_regenerate() -> None:
    global _last_regen
    now = time.time()
    if now - _last_regen < _REGEN_MIN_GAP:
        return
    _last_regen = now
    _regenerate_all()


def _regenerate_all() -> None:
    try:
        regenerate_html()
        regenerate_candidates_html()
    except Exception as e:
        logger.exception("regenerate html failed: %s", e)


def ensure_all() -> None:
    """保证两份 HTML 视图存在（供路由在服务前调用）。"""
    if not os.path.exists(HTML_PATH):
        regenerate_html()
    if not os.path.exists(CAND_HTML_PATH):
        regenerate_candidates_html()


def regenerate_html() -> None:
    recs = load_all()
    data_json = json.dumps(recs, ensure_ascii=False)
    gen_ts = _now().strftime("%Y-%m-%d %H:%M:%S")
    doc = _HTML_TEMPLATE.replace("/*__GEN__*/", gen_ts)
    # 数据放进 application/json 脚本，避免任何 HTML 转义问题
    doc = doc.replace("/*__DATA__*/", data_json)
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(doc)
    logger.info("inference_log.html regenerated (%d records) -> %s", len(recs), HTML_PATH)


def regenerate_candidates_html() -> None:
    groups = candidate_report()
    data_json = json.dumps(groups, ensure_ascii=False)
    gen_ts = _now().strftime("%Y-%m-%d %H:%M:%S")
    doc = _CAND_HTML_TEMPLATE.replace("/*__GEN__*/", gen_ts)
    doc = doc.replace("/*__CAND__*/", data_json)
    with open(CAND_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(doc)
    logger.info("inference_candidates.html regenerated (%d candidates) -> %s",
                len(groups), CAND_HTML_PATH)


# --------------------------------------------------------------------------- #
# HTML 模板（自包含，浅色主题）
# --------------------------------------------------------------------------- #
_HTML_TEMPLATE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>模型推理日志</title>
<style>
  :root{
    --bg:#f5f6f8; --card:#ffffff; --ink:#1f2430; --muted:#8a93a2; --line:#eceef1;
    --accent:#0a9d6f; --accent-bg:#e7f7f0; --fb:#b26a00; --fb-bg:#fff3e0;
    --chip: #eef1f5;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
    -webkit-font-smoothing:antialiased;}
  .wrap{max-width:960px;margin:0 auto;padding:22px 20px 60px;}
  header h1{font-size:21px;margin:0 0 2px;font-weight:700;letter-spacing:.3px}
  header .sub{font-size:13px;color:var(--muted)}
  .nav{margin:12px 0 2px;display:flex;gap:10px;flex-wrap:wrap}
  .nav a{font-size:13px;color:var(--accent);text-decoration:none;border:1px solid var(--line);
    background:#fff;border-radius:9px;padding:6px 12px;font-weight:600}
  .nav a:hover{background:var(--accent-bg)}
  .stat{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 6px}
  .stat .box{flex:1;min-width:120px;background:var(--card);border:1px solid var(--line);
    border-radius:12px;padding:10px 14px}
  .stat .box .v{font-size:20px;font-weight:700}
  .stat .box .k{font-size:12px;color:var(--muted);margin-top:2px}
  .tabs{position:sticky;top:0;z-index:5;display:flex;gap:4px;background:var(--bg);
    padding:14px 0 8px;margin-top:10px;border-bottom:1px solid var(--line)}
  .tab{appearance:none;border:none;background:transparent;cursor:pointer;
    font-size:14px;color:var(--muted);padding:8px 16px;border-radius:9px 9px 0 0;
    border-bottom:2px solid transparent;font-weight:600}
  .tab:hover{color:var(--ink)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent);background:#fff}
  .period-sum{font-size:12.5px;color:var(--muted);margin:12px 0 4px}
  .day-sep{display:flex;justify-content:space-between;align-items:center;
    font-size:13px;color:#5b6472;margin:18px 0 10px;padding-left:9px;
    border-left:3px solid var(--accent)}
  .day-sep .n{color:var(--muted);font-size:12px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;
    padding:13px 16px;margin-bottom:11px;box-shadow:0 1px 3px rgba(20,30,50,.05)}
  .card-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
  .time{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;color:#111}
  .chip{font-size:12px;padding:2px 9px;border-radius:999px;font-weight:600}
  .chip-7b{background:var(--accent-bg);color:var(--accent)}
  .chip-fb{background:var(--fb-bg);color:var(--fb)}
  .iter{font-size:12px;color:var(--muted);margin-left:auto}
  .body{font-size:13.5px;line-height:1.62}
  .row{margin-top:3px}
  .k{color:var(--muted)}
  .ratio{margin-top:5px;color:#3a4150}
  .cand{margin-top:7px;background:#f7f8fa;border:1px solid var(--line);
    border-radius:9px;padding:8px 11px;font-size:13px}
  .cand b{color:#2a3140}
  .cond{color:#5b6472;font-size:12.5px;margin-top:3px}
  .foot{display:flex;gap:16px;flex-wrap:wrap;margin-top:9px;
    font-size:12px;color:#9aa3b2}
  .empty{text-align:center;color:var(--muted);padding:50px 0;font-size:14px}
  footer{margin-top:26px;font-size:12px;color:var(--muted);text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>模型推理日志</h1>
    <div class="sub">主动学习决策 · 7B 策略器（qwen2.5:7b）每次推理一条记录 · 按「今日 / 本周 / 本月」三档查看</div>
  </header>

  <div class="nav">
    <a href="inference_log.html">时间线日志</a>
    <a href="inference_candidates.html">候选多轮对比</a>
    <a href="/api/inference-log/csv-weekly">下载周报 CSV</a>
  </div>

  <div class="stat" id="stat"></div>

  <div class="tabs">
    <button class="tab active" data-p="today" onclick="switchTab('today')">今日</button>
    <button class="tab" data-p="week" onclick="switchTab('week')">本周</button>
    <button class="tab" data-p="month" onclick="switchTab('month')">本月</button>
  </div>

  <div id="view"></div>

  <footer>生成于 <span id="gen"></span> · 数据文件：data/log/inference_YYYY-MM-DD.jsonl · 视图：data/log/inference_log.html</footer>
</div>

<script type="application/json" id="recdata">/*__DATA__*/</script>
<script>
const RECS = (function(){ try { return JSON.parse(document.getElementById('recdata').textContent)||[]; } catch(e){ return []; } })();
const WD = ['周日','周一','周二','周三','周四','周五','周六'];

function pad(n){ return n<10 ? '0'+n : ''+n; }
function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function fmt(v){ if(v===null||v===undefined||v==='') return '—';
  const f=parseFloat(v); if(isNaN(f)) return String(v);
  if(Math.abs(f)>=1000) return f.toLocaleString('en-US',{maximumFractionDigits:0});
  if(Math.abs(f)>=10) return f.toFixed(1); return f.toFixed(2); }
function mondayOf(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }

const NOW = new Date();
const TODAY = ymd(NOW);
const WEEK_START = mondayOf(NOW);
const WEEK_END = new Date(WEEK_START); WEEK_END.setDate(WEEK_END.getDate()+6); WEEK_END.setHours(23,59,59,999);
const MONTH = NOW.getFullYear()+'-'+pad(NOW.getMonth()+1);

function inPeriod(r, p){
  if(p==='today') return r.date===TODAY;
  if(p==='week'){ const d=new Date(r.date+'T00:00:00'); return d>=WEEK_START && d<=WEEK_END; }
  if(p==='month') return (r.date||'').startsWith(MONTH);
  return false;
}
function rxLabel(r){
  if(r.reaction==='OER') return 'OER · '+(r.oer_target||'');
  if(r.reaction==='CH4') return '甲烷偶联(OCM)';
  return r.reaction||'—';
}
function condStr(c){
  if(!c||typeof c!=='object') return '';
  const skip=['__audit']; const parts=[];
  for(const k in c){ if(skip.includes(k)) continue; const v=c[k]; if(v===undefined||v===null) continue;
    parts.push(k+'='+(typeof v==='number'? (Math.round(v*100)/100) : v)); }
  return parts.join('  ');
}
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

function card(r){
  const chip = r.used_model
    ? '<span class="chip chip-7b">7B 策略器</span>'
    : '<span class="chip chip-fb">确定性回退</span>';
  const c = r.candidate||{};
  const cd = [c.metal, c.support].filter(Boolean).join('/') || '—';
  const predLine = '<b>候选 #'+(c.id!=null?c.id:'?')+' · '+esc(cd)+'</b>'
    + (c.pred!=null ? ' · 预测 '+fmt(c.pred)+(c.unc!=null?' ± '+fmt(c.unc):'') : '')
    + (c.reward!=null ? ' · 奖励 '+fmt(c.reward) : '');
  const cs = condStr(r.conditions);
  const foot = [
    '延迟 '+(r.latency_ms!=null?(r.latency_ms/1000).toFixed(1):'?')+'s',
    '采样 '+ (r.sampled_n||0) +' / 实测 '+(r.measured_n||0),
    'MAE '+(r.mae!=null?fmt(r.mae):'—'),
    '模型 '+(r.model||'—')
  ].join('　');
  const tm = (r.ts_iso||'').slice(11,19) || '--:--:--';
  return '<div class="card">'
    + '<div class="card-head"><span class="time">'+tm+'</span>'+chip
    + '<span class="iter">迭代 #'+(r.iteration!=null?r.iteration:'?')+' · '+esc(rxLabel(r))+'</span></div>'
    + '<div class="body">'
    +   '<div class="row"><span class="k">策略：</span>'+esc(r.strategy||'—')+(r.conditions_source?(' <span class="k">('+esc(r.conditions_source)+')</span>'):'')+'</div>'
    +   '<div class="ratio"><span class="k">依据：</span>'+esc(r.rationale||'—')+'</div>'
    +   '<div class="cand">'+predLine+(cs?'<div class="cond">条件：'+esc(cs)+'</div>':'')+'</div>'
    + '</div>'
    + '<div class="foot">'+foot+'</div>'
    + '</div>';
}

function daySep(date, n){
  const d=new Date(date+'T00:00:00');
  const wd = WD[d.getDay()];
  return '<div class="day-sep"><span>'+date+' '+wd+'</span><span class="n">'+n+' 条</span></div>';
}

function render(p){
  const list = RECS.filter(r=>inPeriod(r,p)).slice().sort((a,b)=>(b.ts_epoch||0)-(a.ts_epoch||0));
  const view = document.getElementById('view');
  if(!list.length){ view.innerHTML='<div class="empty">该时段暂无推理记录</div>'; return; }
  const usedN = list.filter(r=>r.used_model).length;
  const lats = list.map(r=>r.latency_ms||0).filter(Boolean);
  const avg = lats.length? (lats.reduce((a,b)=>a+b,0)/lats.length/1000).toFixed(1) : '—';
  let html = '<div class="period-sum">共 '+list.length+' 条 · 7B 命中 '+usedN+' 条（'
    + (list.length?(usedN/list.length*100).toFixed(0):0)+'%）· 平均延迟 '+avg+'s</div>';
  const groups={};
  for(const r of list){ (groups[r.date]=groups[r.date]||[]).push(r); }
  const dates=Object.keys(groups).sort().reverse();
  for(const dt of dates){
    html += daySep(dt, groups[dt].length);
    for(const r of groups[dt].sort((a,b)=>(b.ts_epoch||0)-(a.ts_epoch||0))) html += card(r);
  }
  view.innerHTML = html;
}

function renderStat(){
  const total=RECS.length;
  const used=RECS.filter(r=>r.used_model).length;
  const lats=RECS.map(r=>r.latency_ms||0).filter(Boolean);
  const avg=lats.length?(lats.reduce((a,b)=>a+b,0)/lats.length/1000).toFixed(1):'—';
  const todayN=RECS.filter(r=>r.date===TODAY).length;
  const boxes=[
    ['总记录', total],
    ['7B 命中率', total? (used/total*100).toFixed(0)+'%':'—'],
    ['平均延迟', avg+'s'],
    ['今日', todayN]
  ];
  document.getElementById('stat').innerHTML = boxes.map(b=>
    '<div class="box"><div class="v">'+b[1]+'</div><div class="k">'+b[0]+'</div></div>').join('');
  document.getElementById('gen').textContent = '/*__GEN__*/';
}

function switchTab(p){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.p===p));
  render(p);
}

renderStat();
render('today');
</script>
</body>
</html>
"""

_CAND_HTML_TEMPLATE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>候选多轮迭代对比</title>
<style>
  :root{
    --bg:#f5f6f8; --card:#ffffff; --ink:#1f2430; --muted:#8a93a2; --line:#eceef1;
    --accent:#0a9d6f; --accent-bg:#e7f7f0; --fb:#b26a00; --fb-bg:#fff3e0;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
    -webkit-font-smoothing:antialiased;}
  .wrap{max-width:1000px;margin:0 auto;padding:22px 20px 60px;}
  header h1{font-size:21px;margin:0 0 2px;font-weight:700;letter-spacing:.3px}
  header .sub{font-size:13px;color:var(--muted)}
  .nav{margin:12px 0 2px;display:flex;gap:10px;flex-wrap:wrap}
  .nav a{font-size:13px;color:var(--accent);text-decoration:none;border:1px solid var(--line);
    background:#fff;border-radius:9px;padding:6px 12px;font-weight:600}
  .nav a:hover{background:var(--accent-bg)}
  .stat{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 6px}
  .stat .box{flex:1;min-width:120px;background:var(--card);border:1px solid var(--line);
    border-radius:12px;padding:10px 14px}
  .stat .box .v{font-size:20px;font-weight:700}
  .stat .box .k{font-size:12px;color:var(--muted);margin-top:2px}
  .tabs{display:flex;gap:4px;margin:14px 0 6px}
  .tab{appearance:none;border:1px solid var(--line);background:#fff;cursor:pointer;
    font-size:14px;color:var(--muted);padding:7px 16px;border-radius:10px;font-weight:600}
  .tab:hover{color:var(--ink)}
  .tab.active{color:#fff;background:var(--accent);border-color:var(--accent)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;
    padding:14px 16px;margin-bottom:13px;box-shadow:0 1px 3px rgba(20,30,50,.05)}
  .card-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
  .card-head .name{font-size:16px;font-weight:700}
  .card-head .rx{font-size:12px;color:#5b6472;background:#eef1f5;border-radius:6px;padding:2px 8px}
  .card-head .best{font-size:12px;color:var(--accent);margin-left:auto;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}
  th{color:var(--muted);font-weight:600;font-size:12px}
  td.num{font-variant-numeric:tabular-nums}
  tr:last-child td{border-bottom:none}
  .src-7b{color:var(--accent);font-weight:600}
  .src-fb{color:var(--fb);font-weight:600}
  .empty{text-align:center;color:var(--muted);padding:50px 0;font-size:14px}
  footer{margin-top:26px;font-size:12px;color:var(--muted);text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>候选多轮迭代对比</h1>
    <div class="sub">同一候选被多次选中的各轮预测 / 奖励走势 · 按最佳奖励排序 · 便于横向比较实验优先级</div>
  </header>

  <div class="nav">
    <a href="inference_log.html">时间线日志</a>
    <a href="inference_candidates.html">候选多轮对比</a>
    <a href="/api/inference-log/csv-weekly">下载周报 CSV</a>
    <a href="/api/inference-log/csv-candidates">下载候选 CSV</a>
  </div>

  <div class="stat" id="stat"></div>

  <div class="tabs">
    <button class="tab active" data-f="all" onclick="switchF('all')">全部</button>
    <button class="tab" data-f="CH4" onclick="switchF('CH4')">甲烷偶联</button>
    <button class="tab" data-f="OER" onclick="switchF('OER')">OER</button>
  </div>

  <div id="view"></div>

  <footer>生成于 <span id="gen"></span> · 数据文件：data/log/inference_*.jsonl · 视图：data/log/inference_candidates.html</footer>
</div>

<script type="application/json" id="canddata">/*__CAND__*/</script>
<script>
const GROUPS = (function(){ try { return JSON.parse(document.getElementById('canddata').textContent)||[]; } catch(e){ return []; } })();
function pad(n){ return n<10 ? '0'+n : ''+n; }
function fmt(v){ if(v===null||v===undefined||v==='') return '—';
  const f=parseFloat(v); if(isNaN(f)) return String(v);
  if(Math.abs(f)>=1000) return f.toLocaleString('en-US',{maximumFractionDigits:0});
  if(Math.abs(f)>=10) return f.toFixed(1); return f.toFixed(2); }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function rxLabel(r){ if(r==='OER') return 'OER'; if(r==='CH4') return '甲烷偶联(OCM)'; return r||'—'; }

function statBoxes(){
  const total=GROUPS.length;
  const multi=GROUPS.filter(g=>g.n_rounds>1).length;
  const best=GROUPS.length? Math.max(...GROUPS.map(g=>g.reward_best||0)) : 0;
  const totRounds=GROUPS.reduce((a,g)=>a+g.n_rounds,0);
  return [['候选数', total],['多轮候选', multi],['总轮次', totRounds],['最佳奖励', fmt(best)]];
}
function renderStat(){
  document.getElementById('stat').innerHTML = statBoxes().map(b=>
    '<div class="box"><div class="v">'+b[1]+'</div><div class="k">'+b[0]+'</div></div>').join('');
  document.getElementById('gen').textContent = '/*__GEN__*/';
}

function renderGroup(g){
  const rows = g.rounds.map(r=>{
    const src = r.source==='7B策略器'
      ? '<span class="src-7b">7B</span>' : '<span class="src-fb">回退</span>';
    return '<tr>'
      + '<td class="num">#'+(r.iteration!=null?r.iteration:'?')+'</td>'
      + '<td class="num">'+(r.ts_iso? r.ts_iso.slice(5,16):'—')+'</td>'
      + '<td>'+src+'</td>'
      + '<td>'+esc(r.strategy||'—')+'</td>'
      + '<td class="num">'+(r.pred!=null?fmt(r.pred):'—')+(r.unc!=null?(' ± '+fmt(r.unc)):'')+'</td>'
      + '<td class="num">'+(r.reward!=null?fmt(r.reward):'—')+'</td>'
      + '</tr>';
  }).join('');
  const bestTxt = g.reward_best!=null
    ? '最佳奖励 '+fmt(g.reward_best)+' @ 迭代#'+(g.best_iter!=null?g.best_iter:'?')
    : '暂无奖励';
  const pr = (g.pred_min!=null&&g.pred_max!=null)
    ? ' · 预测 '+fmt(g.pred_min)+'~'+fmt(g.pred_max) : '';
  return '<div class="card">'
    + '<div class="card-head"><span class="name">'+esc(g.label)+'</span>'
    + '<span class="rx">'+rxLabel(g.reaction)+'</span>'
    + '<span class="best">'+bestTxt+'</span></div>'
    + '<div class="sub" style="font-size:12.5px;color:var(--muted);margin-top:3px">共 '+g.n_rounds+' 轮'+pr+'</div>'
    + '<table><thead><tr><th>迭代</th><th>时间</th><th>来源</th><th>策略</th><th>预测±unc</th><th>奖励</th></tr></thead>'
    + '<tbody>'+rows+'</tbody></table>'
    + '</div>';
}

function render(f){
  const view=document.getElementById('view');
  const list = f==='all' ? GROUPS : GROUPS.filter(g=>g.reaction===f);
  if(!list.length){ view.innerHTML='<div class="empty">暂无候选多轮记录</div>'; return; }
  view.innerHTML = list.map(renderGroup).join('');
}

function switchF(f){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.f===f));
  render(f);
}

renderStat();
render('all');
</script>
</body>
</html>
"""

# 模块加载即保证两份 HTML 视图存在（便于启动后直接打开查看，即使尚无记录）
try:
    ensure_all()
except Exception as e:  # 视图缺失不应阻断后端启动
    logger.warning("initial inference html generation skipped: %s", e)
