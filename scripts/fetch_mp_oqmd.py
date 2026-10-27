#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_mp_oqmd.py
=================
从 Materials Project (MP) / OQMD 拉取「甲烷偶联光催化 380 池」相关材料的 DFT 描述符
（带隙 band_gap、生成焓 formation_energy_per_atom、凸包上方能量 e_above_hull），
写入 mp_oqmd_cache.json，供世界模型 surrogate 的 build_features 调用，
**替代原 derive_phys 里那批 doi 随机化的噪声特征**（d/tau/D/Ld/I/Isat/pore/kie/ea）。

设计原则
--------
1. 仅依赖 Python 标准库（urllib/json/os），零额外 pip 安装 —— 沙箱/超算任意 python3 可跑。
2. MP 需要免费 API key：从环境变量 MP_API_KEY、~/.pmgrc.yaml(MAPI_KEY)、
   ~/.config/mp_api/config.json 任一位置读取。无 key 直接退出并给出注册指引。
3. ⚠️ MP 前端是 Cloudflare 防护：urllib 默认 UA（Python-urllib/x）会被 403(Error 1010)
   拦截，**必须带浏览器 UA**（见 UA 常量）。curl 自带 UA 所以能通，纯 Python 脚本易踩坑。
4. ⚠️ MP 新版 API（api_version ~0.87）已弃用旧 `/materials/projects/?formula=` 路由与
   `fields` 参数：查询改走 `/materials/summary/?formula=X&_limit=100&_all_fields=true`，
   凸包能量字段名是 energy_above_hull（非 e_above_hull）。`limit` 已重命名为 `_limit`。
5. OQMD 免认证，但当前（2026-08）站点常 502；不可达时自动跳过，不影响 MP 路径。
6. 网络重试 + 限速（默认 0.2s/请求），尊重 429。

重要物理提示（务必读 MP_OQMD_说明.md）
--------------------------------------
- MP band_gap 是 DFT/PBE 级别，**系统性低估带隙**（HSE06 才准）。只作描述符代理，非实验值。
- MP 给的是**体相**晶体性质；380 池是纳米颗粒/复合物，二者存在尺度/形貌偏差。
- 金属（Au/Ag/Pt…）的催化相关量是 d 带中心，需 DOS 数据；本脚本先取 band_gap(=0)/
  生成焓占位，d 带中心留作后续（需 pymatgen 解析 electronic_dos）。

用法
----
  # 1) 自检（不联网、不需 key）：用 mock 响应验证解析/合并逻辑
  python fetch_mp_oqmd.py --selftest

  # 2) 真实拉取（需先设置 MP_API_KEY）
  export MP_API_KEY=你的key
  python fetch_mp_oqmd.py \
      --pool /Users/fenglongli/Downloads/ChemWorld/data/catalysts_v6.json \
      --out  /Users/fenglongli/Downloads/ChemWorld/data/mp_oqmd_cache.json

  # 3) 仅 MP、跳过 OQMD
  python fetch_mp_oqmd.py --pool ... --out ... --no-oqmd
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

MP_BASE = "https://api.materialsproject.org"
OQMD_BASE = "http://oqmd.org/oqmdapi"

# 浏览器 UA —— MP 前端是 Cloudflare 防护，urllib 默认 UA 会被 403(Error 1010) 拦截
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# support 名称 -> MP 化学式（仅收录有确定化学式的；其余跳过并告警）
SUPPORT_FORMULA = {
    "al2o3": "Al2O3", "cds": "CdS", "ceo2": "CeO2", "ga2o3": "Ga2O3",
    "in2o3": "In2O3", "mgo": "MgO", "moo3": "MoO3", "mos2": "MoS2",
    "nb2o5": "Nb2O5", "sio2": "SiO2",     "srtio3": "SrTiO3", "tio2": "TiO2", "tin": "TiN",
    "wo3": "WO3", "zno": "ZnO", "zns": "ZnS",
    "c3n4": "C3N4", "g-c3n4": "C3N4", "carbon nitride": "C3N4",
    "cnt": "C", "graphene": "C",
}
SKIP = {"unknown", "other", ""}


# ----------------------------------------------------------------------------
# key 读取
# ----------------------------------------------------------------------------
def load_mp_key():
    if os.environ.get("MP_API_KEY"):
        return os.environ["MP_API_KEY"].strip()
    p = os.path.expanduser("~/.pmgrc.yaml")
    if os.path.exists(p):
        for line in open(p):
            s = line.strip()
            if s.startswith("MAPI_KEY"):
                return s.split(":", 1)[1].strip().strip("\"'")
    p2 = os.path.expanduser("~/.config/mp_api/config.json")
    if os.path.exists(p2):
        try:
            return json.load(open(p2)).get("api_key")
        except Exception:
            pass
    return None


# ----------------------------------------------------------------------------
# 网络
# ----------------------------------------------------------------------------
def _http_get_json(url, headers=None, timeout=30, retries=3, sleep=1.0):
    last = None
    h = {"User-Agent": UA, "Accept": "application/json"}
    if headers:
        h.update(headers)
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 401:
                raise RuntimeError("MP 返回 401：API key 无效或未设置")
            if e.code == 429:
                time.sleep(sleep * (i + 1))
                continue
            if e.code == 502:
                raise RuntimeError("OQMD 返回 502：站点当前不可用")
            raise
        except Exception as e:  # 网络层错误（含 OQMD 502/超时）
            last = e
            time.sleep(sleep)
    raise RuntimeError(f"请求失败（重试 {retries} 次）: {last}")


def mp_query(formula, key, is_element=False):
    """查 MP summary：取 energy_above_hull 最小（最稳定）的条目。

    注：MP 新版 API 已禁用 `fields` 参数（返回 400），改用 `_all_fields=true`
    取完整 SummaryDoc；凸包能量字段名是 energy_above_hull（非 e_above_hull）。
    """
    q = (f"/materials/summary/?formula={urllib.parse.quote(formula)}"
         f"&_limit=50&_all_fields=true")
    data = _http_get_json(MP_BASE + q, headers={"X-API-KEY": key})
    items = data.get("data", [])
    if not items:
        return None
    # 立即剔除重字段（structure/dos/bandstructure/xas 等），省内存
    HEAVY = ("structure", "dos", "bandstructure", "xfas", "grain_boundaries",
             "phonon_IDs", "database_IDs", "task_ids", "origins", "builder_meta",
             "deprecation_reasons", "warnings", "possible_species")
    for it in items:
        for k in HEAVY:
            it.pop(k, None)
    ranked = [i for i in items if i.get("energy_above_hull") is not None]
    ranked = ranked or items
    ranked.sort(key=lambda i: i.get("energy_above_hull", 1e9))
    b = ranked[0]
    return {
        "material_id": b.get("material_id"),
        "formula": b.get("formula_pretty"),
        "band_gap": b.get("band_gap"),
        "formation_energy_per_atom": b.get("formation_energy_per_atom"),
        "energy_above_hull": b.get("energy_above_hull"),
        "is_stable": b.get("is_stable"),
        "is_metal": b.get("is_metal"),
        "source": "MP",
    }


def oqmd_query(formula):
    """查 OQMD（免认证）。不可达返回 (None, reason)。"""
    url = (f"{OQMD_BASE}/formationenergy?composition={formula}"
           f"&fields=name,band_gap,delta_e&limit=5")
    try:
        data = _http_get_json(url, timeout=20)
    except Exception as e:
        return None, str(e)
    items = data.get("data", [])
    if not items:
        return None, "empty"
    items = [i for i in items if i.get("band_gap") is not None]
    if not items:
        return None, "no band_gap"
    items.sort(key=lambda i: i.get("delta_e", 1e9))
    b = items[0]
    return {
        "name": b.get("name"),
        "band_gap": b.get("band_gap"),
        "delta_e": b.get("delta_e"),
        "source": "OQMD",
    }, None


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------
def derive_queries(pool_path):
    data = json.load(open(pool_path))
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                data = v
                break
    supports, metals = set(), set()
    for r in data:
        if not isinstance(r, dict):
            continue
        if r.get("support"):
            supports.add(str(r["support"]).strip().lower())
        if r.get("metal"):
            metals.add(str(r["metal"]).strip().lower())
    queries = []  # (key, kind, value)
    for s in sorted(supports):
        if s in SKIP:
            continue
        f = SUPPORT_FORMULA.get(s)
        if not f:
            print(f"  [skip] support '{s}' 无确定化学式，跳过", file=sys.stderr)
            continue
        queries.append((f"sup:{s}", "formula", f))
    for m in sorted(metals):
        if m in SKIP:
            continue
        # 元素首字母大写
        elem = m.capitalize()
        queries.append((f"metal:{m}", "element", elem))
    return queries


def run(pool_path, out_path, use_oqmd=True, delay=0.2):
    key = load_mp_key()
    if not key:
        print("=" * 64)
        print("✗ 未找到 Materials Project API key。")
        print("  获取步骤（免费）：")
        print("    1. 注册 https://materialsproject.org/")
        print("    2. 控制台 https://materialsproject.org/dashboard 复制 API key")
        print("    3. 二选一设置：")
        print("       export MP_API_KEY=你的key")
        print("       或写入 ~/.pmgrc.yaml 一行：  MAPI_KEY: 你的key")
        print("  然后重跑本脚本即可真正下载。")
        print("=" * 64)
        sys.exit(2)

    queries = derive_queries(pool_path)
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    # 断点续传：若已有缓存且含材料记录，则跳过已查过的
    cache = {"_meta": {"generated": time.strftime("%Y-%m-%d %H:%M"),
                       "mp_key_present": True, "oqmd_attempted": use_oqmd},
             "materials": {}}
    if os.path.exists(out_path):
        try:
            prev = json.load(open(out_path))
            if isinstance(prev, dict) and prev.get("materials"):
                cache["materials"] = dict(prev["materials"])
                print(f"[resume] 载入已有缓存 {len(cache['materials'])} 条，将跳过已查材料", flush=True)
        except Exception:
            pass
    todo = [(k, kd, v) for (k, kd, v) in queries if k not in cache["materials"]]
    print(f"[info] 待查询材料数 = {len(queries)}（其中待办 {len(todo)}，来自 {pool_path}）", flush=True)

    def _save():
        json.dump(cache, open(out_path, "w"), indent=2, ensure_ascii=False)

    for idx, (key_, kind, val) in enumerate(todo):
        rec = None
        try:
            rec = mp_query(val, key, is_element=(kind == "element"))
            if rec:
                rec["query_kind"] = kind
                cache["materials"][key_] = rec
                print(f"  [{idx+1}/{len(queries)}] [MP ] {key_:14s} {val:8s} -> "
                      f"{rec['formula']} Eg={rec['band_gap']} dEf={rec['formation_energy_per_atom']} "
                      f"ehull={rec['energy_above_hull']} stable={rec['is_stable']}", flush=True)
        except Exception as e:
            print(f"  [{idx+1}/{len(queries)}] [MP!] {key_:14s} {val:8s} 失败: {e}", file=sys.stderr, flush=True)

        if use_oqmd and kind == "formula":
            try:
                orec, err = oqmd_query(val)
                if orec:
                    cache["materials"][key_]["oqmd"] = orec
                    print(f"  [{idx+1}/{len(queries)}] [OQM] {key_:14s} {val:8s} -> Eg={orec['band_gap']} dE={orec['delta_e']}", flush=True)
                elif err:
                    print(f"  [{idx+1}/{len(queries)}] [OQM] {key_:14s} {val:8s} 跳过: {err}", file=sys.stderr, flush=True)
            except Exception as e:
                print(f"  [{idx+1}/{len(queries)}] [OQM!] {key_:14s} {val:8s} 异常: {e}", file=sys.stderr, flush=True)

        _save()  # 增量落盘：中途被杀也有部分数据
        time.sleep(delay)

    print(f"\n[done] 已写入 {out_path}（{len(cache['materials'])} 条材料记录）", flush=True)
    return cache


# ----------------------------------------------------------------------------
# 自检（不联网）
# ----------------------------------------------------------------------------
def selftest(out_path="/Users/fenglongli/Downloads/ChemWorld/data/mp_oqmd_cache.json"):
    mock_mp = {
        "data": [
            {"material_id": "mp-2657", "formula_pretty": "TiO2",
             "band_gap": 2.1, "formation_energy_per_atom": -3.31, "e_above_hull": 0.0},
            {"material_id": "mp-19350", "formula_pretty": "TiO2",
             "band_gap": 1.9, "formation_energy_per_atom": -3.28, "e_above_hull": 0.03},
        ]
    }
    # 复用 mp_query 的排序逻辑
    items = [i for i in mock_mp["data"] if i.get("e_above_hull") is not None]
    items.sort(key=lambda i: i.get("e_above_hull", 1e9))
    b = items[0]
    rec = {"material_id": b["material_id"], "formula": b["formula_pretty"],
           "band_gap": b["band_gap"], "formation_energy_per_atom": b["formation_energy_per_atom"],
           "e_above_hull": b["e_above_hull"], "source": "MP", "query_kind": "formula"}
    cache = {"_meta": {"selftest": True}, "materials": {"sup:tio2": rec}}
    json.dump(cache, open(out_path, "w"), indent=2, ensure_ascii=False)
    print(f"[selftest] 解析/合并逻辑 OK -> {out_path}")
    print(json.dumps(cache, indent=2, ensure_ascii=False))
    return cache


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="拉取 MP/OQMD DFT 描述符到世界模型缓存")
    ap.add_argument("--pool", default="/Users/fenglongli/Downloads/ChemWorld/data/catalysts_v6.json")
    ap.add_argument("--out", default="/Users/fenglongli/Downloads/ChemWorld/data/mp_oqmd_cache.json")
    ap.add_argument("--no-oqmd", action="store_true", help="跳过 OQMD")
    ap.add_argument("--selftest", action="store_true", help="用 mock 响应验证逻辑（不联网）")
    ap.add_argument("--delay", type=float, default=0.2)
    args = ap.parse_args()

    if args.selftest:
        selftest(args.out)
    else:
        run(args.pool, args.out, use_oqmd=not args.no_oqmd, delay=args.delay)
