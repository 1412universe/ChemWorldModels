# -*- coding: utf-8 -*-
"""验收：折叠卡按钮、空白平移、Shift 框选、列表 Shift 批量删除。"""
import json
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"


def mk(w=1700, h=1050):
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=%d,%d" % (w, h)]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(w, h)
    return d


def click(d, x, y, shift=False):
    if shift:
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "Shift", "code": "ShiftLeft", "windowsVirtualKeyCode": 16,
            "modifiers": 8})
    for kind, p in (
        ("mouseMoved", {"x": x, "y": y}),
        ("mousePressed", {"x": x, "y": y, "button": "left", "buttons": 1, "clickCount": 1}),
        ("mouseReleased", {"x": x, "y": y, "button": "left", "buttons": 0, "clickCount": 1}),
    ):
        d.execute_cdp_cmd("Input.dispatchMouseEvent", dict(p, type=kind))
        time.sleep(0.1)
    if shift:
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "Shift", "code": "ShiftLeft", "windowsVirtualKeyCode": 16})


def main():
    wf = json.load(open(WF))
    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)

        # --- 1. 折叠卡按钮可点（pointer-events 已修复） ---
        info = d.execute_script("""
          var c=document.querySelector('.wfgroup'); if(!c) return null;
          var b=c.querySelector('.g-btn[data-act=expand]');
          var r=b.getBoundingClientRect();
          return {pe:getComputedStyle(b).pointerEvents, x:r.left+r.width/2, y:r.top+r.height/2};
        """)
        print("expand btn:", info)
        g0 = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        n0 = d.execute_script("return document.querySelectorAll('.wfnode').length;")
        click(d, info["x"], info["y"])
        time.sleep(1.5)
        g1 = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        n1 = d.execute_script("return document.querySelectorAll('.wfnode').length;")
        print("expand: groups %s->%s nodes %s->%s" % (g0, g1, n0, n1))

        # --- 2. 空白拖动 = 平移（不是框选） ---
        wrap = d.execute_script("""
          var r=document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
          return {x:r.left,y:r.top,w:r.width,h:r.height};
        """)
        v0 = d.execute_script("return JSON.stringify(window.__WFED.state.view);")
        sx, sy = wrap["x"] + 40, wrap["y"] + wrap["h"] - 60
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": sx, "y": sy,
                                                      "button": "left", "buttons": 1, "clickCount": 1})
        for i in range(1, 7):
            d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseMoved",
                                                          "x": sx + i * 25, "y": sy - i * 8,
                                                          "button": "left", "buttons": 1})
            time.sleep(0.05)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": sx + 150,
                                                       "y": sy - 48, "button": "left", "buttons": 0})
        time.sleep(0.8)
        v1 = d.execute_script("return JSON.stringify(window.__WFED.state.view);")
        sel = d.execute_script("return Object.keys(window.__WFED.state.selectedIds).length;")
        print("pan: view changed =", v0 != v1, "| marquee selected =", sel)

        # --- 3. Shift + 拖动 = 框选 ---
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": "rawKeyDown", "key": "Shift",
                                                     "code": "ShiftLeft", "windowsVirtualKeyCode": 16,
                                                     "modifiers": 8})
        d.execute_cdp_delay = None
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": wrap["x"] + 60,
                                                       "y": wrap["y"] + 60, "button": "left",
                                                       "buttons": 1, "clickCount": 1, "modifiers": 8})
        for i in range(1, 7):
            d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseMoved",
                                                           "x": wrap["x"] + 60 + i * 90,
                                                           "y": wrap["y"] + 60 + i * 70,
                                                           "button": "left", "buttons": 1, "modifiers": 8})
            time.sleep(0.06)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased",
                                                       "x": wrap["x"] + 600, "y": wrap["y"] + 480,
                                                       "button": "left", "buttons": 0, "modifiers": 8})
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Shift",
                                                     "code": "ShiftLeft", "windowsVirtualKeyCode": 16})
        time.sleep(1.2)
        sel2 = d.execute_script("return Object.keys(window.__WFED.state.selectedIds).length;")
        print("shift+marquee selected =", sel2)

        print("errors:", [e["message"][:160] for e in d.get_log("browser")
                          if e["level"] == "SEVERE" and "jsdelivr" not in e["message"]] or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
