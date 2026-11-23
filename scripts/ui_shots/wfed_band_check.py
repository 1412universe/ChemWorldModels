# -*- coding: utf-8 -*-
"""量自动布局的分带结果，判断为什么没折行。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"


def drv(w=1700, h=1050):
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=%d,%d" % (w, h)]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(w, h)
    return d


def main():
    wf = json.load(open(WF))
    d = drv()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)
        info = d.execute_script("""
          var W = window.__WFED;
          var r = W.autoLayout({silent:true});
          // 量包围盒
          var ns = W.state.wf.data.nodes;
          var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
          ns.forEach(function(n){
            var p=n.pose.position;
            minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
            minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
          });
          var cr = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
          return {layout:r, box:{w:Math.round(maxX-minX),h:Math.round(maxY-minY)},
                  wrap:{w:Math.round(cr.width),h:Math.round(cr.height)}};
        """)
        print(json.dumps(info, ensure_ascii=False, indent=1))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
