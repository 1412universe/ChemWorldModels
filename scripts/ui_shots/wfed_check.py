# -*- coding: utf-8 -*-
"""浏览器端验收：折叠组 / 框选 / 连线几何。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

BASE = "http://127.0.0.1:8000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

PROBE = """
var r = {};
var canvas = document.getElementById('wfed-canvas');
r.nodes = canvas ? canvas.querySelectorAll('.wfnode').length : -1;
r.groups = canvas ? canvas.querySelectorAll('.wfgroup').length : -1;
r.paths = document.querySelectorAll('#wfed-svg path.wfedge').length;
r.fan = canvas ? canvas.querySelectorAll('.port-fan').length : -1;
r.badges = canvas ? canvas.querySelectorAll('.wfnode-fold').length : -1;
r.api = !!window.__WFED;
r.foldKeys = 0;
try {
  if (window.__WFED && window.__WFED.debugFolds) r.foldKeys = Object.keys(window.__WFED.debugFolds()).length;
} catch(e) {}
r.zoom = (document.getElementById('wfed-zoomhint')||{}).textContent;
r.err = window.__wfedErr ? window.__wfedErr() : '';
return r;
"""


def drv(w=1600, h=1000):
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


def probe(d, tag):
    r = d.execute_script(PROBE)
    print("[%-8s] %s" % (tag, json.dumps(r, ensure_ascii=False)))
    return r


def main():
    d = drv()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)
        e0 = errs(d)
        print("load errors:", e0 or "none")
        probe(d, "load")

        # 打开真实工作流
        r = d.execute_script("""
          var W = window.__WFED;
          if (!W) return 'no api';
          var list = W.list || [];
          return JSON.stringify({keys: Object.keys(W).slice(0,20)});
        """)
        print("api keys:", r)

        # 直接打开已有工作流（金四面体全流程）
        ok = d.execute_script("""
          var W = window.__WFED;
          if (!W || !W.openByName) return 'no openByName';
          return 'has openByName';
        """)
        print(ok)
        d.save_screenshot(os.path.join(OUT, "wfed_0_load.png"))
        print("errors:", errs(d) or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
