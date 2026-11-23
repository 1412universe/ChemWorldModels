# -*- coding: utf-8 -*-
"""打开后立刻检查折叠状态。"""
import json
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"


def main():
    wf = json.load(open(WF))
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=1700,1050"]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        for i in range(20):
            time.sleep(0.5)
            n = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
            if n:
                print("groups appeared at", (i+1)*0.5, "s:", n)
                break
        time.sleep(1)
        r = d.execute_script("""
          var W = window.__WFED, f = W.foldState();
          var keys = Object.keys(f);
          var canvas = document.getElementById('wfed-canvas');
          return {
            groups: keys.length,
            collapsed: keys.filter(function(k){ return f[k].collapsed; }).length,
            first3: keys.slice(0,3).map(function(k){
              var g = f[k];
              return g.name + '|' + (g.collapsed?'F':'O') + '|' + g.uuids.length;
            }),
            domNodes: canvas.querySelectorAll('.wfnode').length,
            domGroups: canvas.querySelectorAll('.wfgroup').length
          };
        """)
        print(json.dumps(r, ensure_ascii=False, indent=1))
        import os
        d.save_screenshot(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "wfed_fold_now.png"))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
