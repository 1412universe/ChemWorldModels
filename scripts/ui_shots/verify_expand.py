# -*- coding: utf-8 -*-
"""验证：展开折叠组后成员不再重叠。"""
import json
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"


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
        time.sleep(3)

        info = d.execute_script("""
          var W=window.__WFED, f=W.foldState();
          var keys=Object.keys(f).filter(function(k){return f[k].uuids.length>=8;});
          if(!keys.length) return {err:'no big group'};
          var k=keys.sort(function(a,b){return f[b].uuids.length-f[a].uuids.length;})[0];
          return {gid:k, n:f[k].uuids.length, name:f[k].name};
        """)
        print("big group:", info)
        gid = info["gid"]
        d.execute_script("window.__WFED.setGroupCollapsed(arguments[0], false);", gid)
        time.sleep(1.5)

        m = d.execute_script("""
          var W=window.__WFED, g=W.foldState()[arguments[0]];
          var xs=g.uuids.map(function(u){var n=W.findNode(u);return Math.round(n.pose.position.x);});
          var ys=g.uuids.map(function(u){var n=W.findNode(u);return Math.round(n.pose.position.y);});
          var sameRow = ys.every(function(y){return y===ys[0];});
          var minGap = Infinity;
          for(var i=1;i<xs.length;i++){ minGap=Math.min(minGap, xs[i]-xs[i-1]); }
          return {count:g.uuids.length, sameRow:sameRow, minGap:minGap,
                  x0:xs[0], xLast:xs[xs.length-1], y:ys[0]};
        """, gid)
        print("expanded layout:", m)
        print("Verdict:", "OK 不重叠" if m["minGap"] >= 236 else "STILL OVERLAPPING")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
