# -*- coding: utf-8 -*-
"""交互验收：框选、批量禁用、Shift 长按删除、折叠卡展开/改名。"""
import json
import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

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


def errs(d):
    return [e["message"][:220] for e in d.get_log("browser") if e["level"] == "SEVERE"]


def main():
    wf = json.load(open(WF))
    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3.5)

        print("folded nodes:", d.execute_script(
            "return document.getElementById('wfed-canvas').querySelectorAll('.wfnode').length;"))

        # --- 2. 框选：在空白处拖一个框（覆盖左上区域） ---
        wrap = d.find_element("id", "wfed-canvas-wrap")
        box = wrap.rect
        x0, y0 = box["x"] + 120, box["y"] + 120
        x1, y1 = box["x"] + 900, box["y"] + 700
        ActionChains(d).move_to_element_with_offset(wrap, 120, 120).click_and_hold() \
            .move_by_offset(780, 580).release().perform()
        time.sleep(1.5)
        sel = d.execute_script("return Object.keys(window.__WFED.state.selectedIds).length;")
        bar = d.execute_script("""
          var b = document.getElementById('wfed-batchbar');
          return b ? b.classList.contains('on') : null;
        """)
        print("marquee selected:", sel, "| batchbar on:", bar)

        # --- 3. 批量禁用 ---
        if sel:
            d.execute_script("""
              var b = document.getElementById('bb-disable');
              if (b) b.click();
            """)
            time.sleep(1.2)
            dis = d.execute_script("""
              var W = window.__WFED;
              return W.state.wf.data.nodes.filter(function(n){return n.disabled;}).length;
            """)
            print("disabled after batch:", dis)

        # --- 4. Shift 长按 → 删除态 ---
        ActionChains(d).key_down(Keys.SHIFT).perform()
        time.sleep(0.9)
        armed = d.execute_script("return document.getElementById('wfed-canvas-wrap').classList.contains('shift-mode');")
        ActionChains(d).key_up(Keys.SHIFT).perform()
        time.sleep(0.6)
        print("shift long-press armed:", armed)

        # --- 5. 折叠卡：展开 + 改名 ---
        cnt0 = d.execute_script(
            "return document.getElementById('wfed-canvas').querySelectorAll('.wfgroup').length;")
        d.execute_script("""
          var btn = document.querySelector('.wfgroup .g-btn[data-act=expand]');
          if (btn) btn.click();
        """)
        time.sleep(1.5)
        cnt1 = d.execute_script(
            "return document.getElementById('wfed-canvas').querySelectorAll('.wfgroup').length;")
        print("groups before/after expand:", cnt0, cnt1)

        d.execute_script("""
          var W = window.__WFED;
          W.foldAllGroups();
          var gid = Object.keys(W.foldState())[0];
          if (gid) { W.foldState()[gid].name = '改名测试组'; W.renderNodes(); }
        """)
        time.sleep(1.2)
        nm = d.execute_script("""
          var el = document.querySelector('.wfgroup .g-name');
          return el ? el.textContent : null;
        """)
        print("renamed group shows:", nm)

        print("errors:", errs(d) or "none")
        d.save_screenshot(os.path.join(OUT, "wfed_interact.png"))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
