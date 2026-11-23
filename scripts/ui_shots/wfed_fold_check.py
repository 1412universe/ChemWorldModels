# -*- coding: utf-8 -*-
"""直接验证 layoutFolded：折叠后连线长度。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

METRICS = """
var lens = [];
document.querySelectorAll('#wfed-svg path.wfedge').forEach(function(p){ lens.push(Math.round(p.getTotalLength())); });
lens.sort(function(a,b){return a-b;});
var canvas = document.getElementById('wfed-canvas');
return {
  nodes: canvas.querySelectorAll('.wfnode').length,
  groups: canvas.querySelectorAll('.wfgroup').length,
  edges: lens.length,
  long: lens.filter(function(x){return x>700;}).length,
  p50: lens[Math.floor(lens.length*0.5)]||0,
  p90: lens[Math.floor(lens.length*0.9)]||0,
  max: lens[lens.length-1]||0
};
"""


def main():
    wf = json.load(open(WF))
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(4)
        print("after open (folded default):", json.dumps(d.execute_script(METRICS), ensure_ascii=False))
        d.save_screenshot(os.path.join(OUT, "wfed_folded_default.png"))

        d.execute_script("""
          var W = window.__WFED;
          W.foldAllGroups();
        """)
        time.sleep(3)
        print("after foldAllGroups:", json.dumps(d.execute_script(METRICS), ensure_ascii=False))
        d.save_screenshot(os.path.join(OUT, "wfed_folded_layout.png"))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
