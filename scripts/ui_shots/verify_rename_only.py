# -*- coding: utf-8 -*-
"""验证改名（按钮 + 双击）。只读，不删除任何工作流。"""
import json
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"


def mk():
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    return d


def main():
    wf = json.load(open(WF))
    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)

        # ---- A. 改名按钮 ----
        r = d.execute_script("""
          var c=document.querySelector('.wfgroup'); if(!c) return null;
          var b=c.querySelector('.g-btn[data-act=rename]');
          var br=b.getBoundingClientRect();
          return {x:br.left+br.width/2, y:br.top+br.height/2,
                  old:(c.querySelector('.g-name')||{}).textContent};
        """)
        print("rename btn pos:", r)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": r["x"],
                                                       "y": r["y"], "button": "left",
                                                       "buttons": 1, "clickCount": 1})
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": r["x"],
                                                       "y": r["y"], "button": "left",
                                                       "buttons": 0, "clickCount": 1})
        time.sleep(0.9)
        shown = d.execute_script("""
          var i=document.querySelector('.wfed-note.m-ask .wn-input');
          if(!i) return null;
          i.value='改名测试-A';
          var ok=document.querySelector('.wfed-note.m-ask .wn-ok');
          if(ok) ok.click();
          return true;
        """)
        time.sleep(0.9)
        n1 = d.execute_script(
            "return (document.querySelector('.wfgroup .g-name')||{}).textContent;")
        print("A prompt shown:", bool(shown), "| name:", n1)

        # ---- B. 双击改名 ----
        r2 = d.execute_script("""
          var n=document.querySelector('.wfgroup .g-name');
          var rr=n.getBoundingClientRect();
          return {x:rr.left+rr.width/2, y:rr.top+rr.height/2};
        """)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": r2["x"],
                                                       "y": r2["y"], "button": "left",
                                                       "buttons": 1, "clickCount": 1})
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": r2["x"],
                                                       "y": r2["y"], "button": "left",
                                                       "buttons": 0, "clickCount": 1})
        time.sleep(0.1)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": r2["x"],
                                                       "y": r2["y"], "button": "left",
                                                       "buttons": 1, "clickCount": 2})
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": r2["x"],
                                                       "y": r2["y"], "button": "left",
                                                       "buttons": 0, "clickCount": 2})
        time.sleep(1.0)
        shown2 = d.execute_script("""
          var i=document.querySelector('.wfed-note.m-ask .wn-input');
          if(!i) return null;
          i.value='改名测试-B';
          var ok=document.querySelector('.wfed-note.m-ask .wn-ok');
          if(ok) ok.click();
          return true;
        """)
        time.sleep(0.9)
        n2 = d.execute_script(
            "return (document.querySelector('.wfgroup .g-name')||{}).textContent;")
        print("B prompt shown:", bool(shown2), "| name:", n2)

        print("errors:", [e["message"][:150] for e in d.get_log("browser")
                          if e["level"] == "SEVERE" and "jsdelivr" not in e["message"]] or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
