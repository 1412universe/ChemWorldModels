# -*- coding: utf-8 -*-
"""核查 rowOf / 列距是否真的收紧。"""
import json
import os
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
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)
        info = d.execute_script("""
          var W = window.__WFED;
          W.autoLayout({silent:true});
          var ns = W.state.wf.data.nodes;
          // 统计不同 x 的节点数（即列数）与每列节点数
          var cols = {};
          ns.forEach(function(n){
            var x = Math.round(n.pose.position.x);
            (cols[x]=cols[x]||[]).push(n.uuid);
          });
          var keys = Object.keys(cols).map(Number).sort(function(a,b){return a-b;});
          return {
            colCount: keys.length,
            first10: keys.slice(0,10).map(function(x){return x+':'+cols[x].length;}),
            spanX: keys[keys.length-1]-keys[0],
            distinctX: keys.length
          };
        """)
        print(json.dumps(info, ensure_ascii=False, indent=1))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
