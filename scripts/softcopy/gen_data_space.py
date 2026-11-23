#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成独立版数据空间总览页：把后端数据内联进 HTML，可直接双击打开。

输出：wm_backend/static/data_space.html（与 brief.html 同级）
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path("/Users/fenglongli/Downloads/ChemWorldModel")
sys.path.insert(0, str(ROOT / "wm_backend"))
sys.path.insert(0, str(ROOT / "wm_model"))

from app.brief import brief_payload  # noqa: E402
from app.selfcheck import (  # noqa: E402
    constraint_cases,
    data_space,
    flow_model,
    old_lamp_surface,
    selfcheck,
)

STATIC = ROOT / "wm_backend" / "static"
SRC = STATIC / "brief.html"
DST = STATIC / "data_space.html"

# 预测模块在离线下没有后端，用一组示例结果占位
PREDICT_DEMO = {
    "ok": True,
    "y": 20047.1,
    "sel": 74.88,
    "unc": 6348.4,
    "y_lo": 13698.8,
    "y_hi": 26395.5,
    "in_domain": True,
    "domain": {"d_min": 0.4849},
    "prior": {"y": 21140.4},
    "residual_blend": 0.298,
}

FETCH_BLOCK = """    var get=function(u){
      return fetch(u,{cache:'no-store'}).then(function(r){return r.json();})
        .catch(function(){return null;});
    };
    Promise.all([get('/api/brief'),get('/api/data-space'),
                 get('/api/selfcheck'),get('/api/flow-model'),
                 get('/api/old-lamp-surface')])
      .then(function(res){
        var j=res[0];
        window.__SPACE=res[1]; window.__SC=res[2]; window.__FLOW=res[3];
        window.__SURF=res[4];"""

PREDICT_FETCH = """    fetch('/api/worldmodel/layered/predict',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    }).then(function(r){return r.json();})
      .then(function(j){"""


def dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"缺少源页面 {SRC}")

    html = SRC.read_text(encoding="utf-8")

    brief = brief_payload()
    space = data_space()
    chk = selfcheck()
    flow = flow_model()
    surf = old_lamp_surface()

    if not all([brief.get("ok"), space.get("ok"), surf.get("ok")]):
        raise SystemExit("数据接口返回异常，未生成")

    if FETCH_BLOCK not in html:
        raise SystemExit("未找到数据拉取代码块，页面结构可能已改动")

    inline = (
        "    Promise.all([Promise.resolve(%s),Promise.resolve(%s),\n"
        "                 Promise.resolve(%s),Promise.resolve(%s),\n"
        "                 Promise.resolve(%s)])\n"
        "      .then(function(res){\n"
        "        var j=res[0];\n"
        "        window.__SPACE=res[1]; window.__SC=res[2]; window.__FLOW=res[3];\n"
        "        window.__SURF=res[4];"
        % (dump(brief), dump(space), dump(chk), dump(flow), dump(surf))
    )
    html = html.replace(FETCH_BLOCK, inline, 1)

    if PREDICT_FETCH in html:
        html = html.replace(
            PREDICT_FETCH,
            "    Promise.resolve(%s)\n      .then(function(j){" % dump(PREDICT_DEMO),
            1,
        )

    # 独立版：数据已内联，离线也能开；Three.js 走同目录 assets
    html = html.replace(
        "<title>数据空间总览 · Pd–P25</title>",
        "<title>数据空间总览 · Pd–P25（独立版）</title>",
        1,
    )
    html = html.replace(
        '<div class="subline">甲烷氧化偶联（OCM）光催化 · 实测分布 + 模型预测 + 下一步建议</div>',
        '<div class="subline">甲烷氧化偶联（OCM）光催化 · 实测分布 + 模型预测 + 下一步建议'
        ' · <span style="color:#94a3b8">数据快照，离线可看</span></div>',
        1,
    )

    DST.write_text(html, encoding="utf-8")
    print(f"已生成 {DST}")
    print(f"  体积 {DST.stat().st_size / 1024:.0f} KB")
    print(f"  实测点 {brief.get('n_total')} 条 · 三维点 {space.get('n')} 个"
          f" · 曲面实测 {surf.get('n_points')} 条")


if __name__ == "__main__":
    main()
