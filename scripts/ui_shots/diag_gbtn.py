# -*- coding: utf-8 -*-
"""定位折叠卡按钮失效原因。"""
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
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)

        # 找到第一张折叠卡与它的按钮坐标
        info = d.execute_script("""
          var card = document.querySelector('.wfgroup');
          if (!card) return {err:'no card'};
          var r = card.getBoundingClientRect();
          var btns = [...card.querySelectorAll('.g-btn')].map(function(b){
            var br = b.getBoundingClientRect();
            return {act: b.getAttribute('data-act'), x: br.left + br.width/2,
                    y: br.top + br.height/2, w: br.width, h: br.height,
                    vis: getComputedStyle(b).display,
                    pe: getComputedStyle(b).pointerEvents};
          });
          return {cardRect:{x:r.left,y:r.top,w:r.width,h:r.height}, btns:btns};
        """)
        print("card/btns:", json.dumps(info, ensure_ascii=False))

        before = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        # 用 CDP 真实点击「展开」
        b = info["btns"][0]
        for kind, params in (
            ("mouseMoved", {"x": b["x"], "y": b["y"]}),
            ("mousePressed", {"x": b["x"], "y": b["y"], "button": "left", "buttons": 1, "clickCount": 1}),
            ("mouseReleased", {"x": b["x"], "y": b["y"], "button": "left", "buttons": 0, "clickCount": 1}),
        ):
            d.execute_cdp_cmd("Input.dispatchMouseEvent", dict(params, type=kind))
            time.sleep(0.15)
        time.sleep(1.2)
        after = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        print("groups %s -> %s" % (before, after))

        errs = [e["message"][:300] for e in d.get_log("browser") if e["level"] == "SEVERE"]
        print("errors:", errs or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
