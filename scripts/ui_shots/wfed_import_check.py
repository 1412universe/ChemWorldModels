# -*- coding: utf-8 -*-
"""导入真实工作流，验收折叠组与连线几何。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

PROBE = """
var r = {};
var canvas = document.getElementById('wfed-canvas');
r.nodes = canvas ? canvas.querySelectorAll('.wfnode').length : -1;
r.groups = canvas ? canvas.querySelectorAll('.wfgroup').length : -1;
r.fan = canvas ? canvas.querySelectorAll('.port-fan').length : -1;
r.badges = canvas ? canvas.querySelectorAll('.wfnode-fold').length : -1;
r.paths = document.querySelectorAll('#wfed-svg path.wfedge').length;
r.total = window.__WFED.state.wf.data.nodes.length;
r.folds = Object.keys(window.__WFED.state.folds || {}).map(function(k){
  var g = window.__WFED.state.folds[k];
  return g.name + '(' + g.uuids.length + ',' + (g.collapsed?'fold':'open') + ')';
});
// 连线长度分布：超过 900px 的视为「长乱线」
var long = 0, total = 0, lens = [];
document.querySelectorAll('#wfed-svg path.wfedge').forEach(function(p){
  var L = p.getTotalLength(); total++; lens.push(Math.round(L));
  if (L > 900) long++;
});
lens.sort(function(a,b){return a-b;});
r.edgeCount = total; r.longEdges = long;
r.p50 = lens[Math.floor(lens.length*0.5)] || 0;
r.p90 = lens[Math.floor(lens.length*0.9)] || 0;
r.max = lens[lens.length-1] || 0;
return r;
"""


def drv(w=1700, h=1050):
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=%d,%d" % (w, h)]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(w, h)
    return d


def errs(d):
    return [e["message"][:240] for e in d.get_log("browser") if e["level"] == "SEVERE"]


def main():
    wf = json.load(open(WF))
    d = drv()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)
        # 通过公开 API 打开工作流（等价于「打开」）
        d.execute_script("""
          window.____wf = arguments[0];
        """, wf)
        d.execute_script("""
          var wf = window.____wf;
          window.__WFED.openWorkflow(JSON.parse(JSON.stringify(wf)));
        """)
        time.sleep(4)
        r = d.execute_script(PROBE)
        print(json.dumps({k: r[k] for k in ("nodes","groups","paths","edgeCount","longEdges","p50","p90","max")}, ensure_ascii=False, indent=1))
        print("errors:", errs(d) or "none")
        d.save_screenshot(os.path.join(OUT, "wfed_1_import.png"))
        d.execute_script("window.__WFED.fitView && window.__WFED.fitView();")
        time.sleep(1.5)
        d.save_screenshot(os.path.join(OUT, "wfed_1b_folded_fit.png"))

        # 全部展开后看连线
        d.execute_script("""
          var W = window.__WFED;
          Object.keys(W.state.folds||{}).forEach(function(k){ W.state.folds[k].collapsed = false; });
          W.renderNodes();
        """)
        time.sleep(3)
        r2 = d.execute_script(PROBE)
        print("== all expanded ==")
        print(json.dumps({k: r2[k] for k in ("nodes","groups","paths","edgeCount","longEdges","p50","p90","max")}, ensure_ascii=False, indent=1))
        d.save_screenshot(os.path.join(OUT, "wfed_2_expanded.png"))

        # 自动布局后再量一次
        d.execute_script("window.__WFED.autoLayout({silent:true});")
        time.sleep(4)
        r3 = d.execute_script(PROBE)
        print("== after autoLayout ==")
        print(json.dumps({k: r3[k] for k in ("nodes","groups","paths","edgeCount","longEdges","p50","p90","max")}, ensure_ascii=False, indent=1))
        d.save_screenshot(os.path.join(OUT, "wfed_3_layout.png"))
        # 布局后再折叠，看默认视图
        d.execute_script("""
          var W = window.__WFED;
          Object.keys(W.state.folds||{}).forEach(function(k){ W.state.folds[k].collapsed = true; });
          if (W.compactFolds) W.compactFolds();
          W.renderNodes();
          if (W.fitView) W.fitView();
        """)
        time.sleep(2.5)
        r4 = d.execute_script(PROBE)
        print("== layout + folded ==")
        print(json.dumps({k: r4[k] for k in ("nodes","groups","paths","edgeCount","longEdges","p50","p90","max")}, ensure_ascii=False, indent=1))
        d.save_screenshot(os.path.join(OUT, "wfed_4_folded.png"))
        print("errors:", errs(d) or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
