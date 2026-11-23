# -*- coding: utf-8 -*-
"""交互验收（CDP 派发输入，避免 ActionChains 崩溃）。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def mk():
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    return d


def mouse(d, kind, x, y, button="left", buttons=1):
    d.execute_cdp_cmd("Input.dispatchMouseEvent", {
        "type": kind, "x": x, "y": y, "button": button,
        "buttons": buttons, "clickCount": 1,
    })


def errs(d):
    return [e["message"][:200] for e in d.get_log("browser") if e["level"] == "SEVERE"]


def main():
    wf = json.load(open(WF))
    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        # 等折叠组真正生成（embeds 异步加载后才 paint）
        for _ in range(30):
            if d.execute_script("return document.querySelectorAll('.wfgroup').length;") > 0:
                break
            time.sleep(0.5)
        time.sleep(1.5)

        box = d.execute_script("""
          var r = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
          return {x:r.left,y:r.top,w:r.width,h:r.height};
        """)
        print("wrap:", box, "| nodes:", d.execute_script(
            "return document.getElementById('wfed-canvas').querySelectorAll('.wfnode').length;"))

        # ---- 框选：空白处按下 → 拖 → 松开 ----
        sx, sy = box["x"] + 40, box["y"] + 40
        ex, ey = box["x"] + box["w"] - 60, box["y"] + box["h"] - 60
        mouse(d, "mousePressed", sx, sy)
        for i in range(1, 9):
            mouse(d, "mouseMoved", sx + (ex - sx) * i / 8, sy + (ey - sy) * i / 8)
            time.sleep(0.06)
        mouse(d, "mouseReleased", ex, ey, buttons=0)
        time.sleep(1.2)
        sel = d.execute_script("return Object.keys(window.__WFED.state.selectedIds).length;")
        on = d.execute_script("var b=document.getElementById('wfed-batchbar');return b&&b.classList.contains('on');")
        marqueeShown = d.execute_script("var m=document.getElementById('wfed-marquee');return m?getComputedStyle(m).display:null;")
        print("marquee selected=%s batchbar=%s marqueeDisplay=%s" % (sel, on, marqueeShown))

        # ---- 批量禁用 ----
        dis0 = d.execute_script("return window.__WFED.state.wf.data.nodes.filter(function(n){return n.disabled;}).length;")
        d.execute_script("var b=document.getElementById('bb-disable'); if(b) b.click();")
        time.sleep(1)
        dis1 = d.execute_script("return window.__WFED.state.wf.data.nodes.filter(function(n){return n.disabled;}).length;")
        print("disabled %s -> %s" % (dis0, dis1))

        # ---- Shift 长按 → 删除态 ----
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Shift",
                                                    "code": "ShiftLeft", "windowsVirtualKeyCode": 16})
        time.sleep(0.85)
        armed = d.execute_script("return document.getElementById('wfed-canvas-wrap').classList.contains('shift-mode');")
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Shift",
                                                    "code": "ShiftLeft", "windowsVirtualKeyCode": 16})
        time.sleep(0.5)
        print("shift armed:", armed)

        # ---- 折叠卡展开 ----
        g0 = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        d.execute_script("var b=document.querySelector('.wfgroup .g-btn[data-act=expand]'); if(b) b.click();")
        time.sleep(1.2)
        g1 = d.execute_script("return document.querySelectorAll('.wfgroup').length;")
        n1 = d.execute_script("return document.getElementById('wfed-canvas').querySelectorAll('.wfnode').length;")
        print("groups %s -> %s, visible nodes now %s" % (g0, g1, n1))

        # ---- 改名按钮存在 ----
        hasRename = d.execute_script("return !!document.querySelector('.g-btn[data-act=rename]');")
        print("rename button present:", hasRename)

        print("errors:", errs(d) or "none")
        d.save_screenshot(os.path.join(OUT, "wfed_interact.png"))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
