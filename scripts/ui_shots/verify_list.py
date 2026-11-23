# -*- coding: utf-8 -*-
"""验收：工作流列表 Shift+点击多选与批量删除。"""
import json
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"


def mk():
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    return d


def click(d, x, y, shift=False):
    mods = 8 if shift else 0
    if shift:
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "Shift", "code": "ShiftLeft",
            "windowsVirtualKeyCode": 16, "modifiers": 8})
    for kind, p in (
        ("mouseMoved", {"x": x, "y": y}),
        ("mousePressed", {"x": x, "y": y, "button": "left", "buttons": 1,
                          "clickCount": 1, "modifiers": mods}),
        ("mouseReleased", {"x": x, "y": y, "button": "left", "buttons": 0,
                           "clickCount": 1, "modifiers": mods}),
    ):
        d.execute_cdp_cmd("Input.dispatchMouseEvent", dict(p, type=kind))
        time.sleep(0.12)
    if shift:
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "Shift", "code": "ShiftLeft", "windowsVirtualKeyCode": 16})


def main():
    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)

        items = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item')].map(function(b){
            var r=b.getBoundingClientRect();
            return {tid:b.getAttribute('data-tid'), on:b.classList.contains('on'),
                    x:r.left+r.width/2, y:r.top+r.height/2,
                    name:(b.querySelector('.wn')||{}).textContent};
          });
        """)
        print("list items:", len(items))
        for it in items[:5]:
            print("  ", bool(it["on"]), it["name"])

        # 挑两个非当前项做 Shift 多选
        others = [x for x in items if not x["on"]][:2]
        if len(others) < 2:
            print("not enough items to test")
            return
        for it in others:
            click(d, it["x"], it["y"], shift=True)
            time.sleep(0.5)
        picked = d.execute_script("return [...document.querySelectorAll('.wf-pick-item.picked')].length;")
        bar = d.execute_script("var b=document.getElementById('wf-pick-bar');return b?b.textContent:null;")
        print("picked:", picked, "| bar:", bar)

        # 点「取消」
        cb = d.execute_script("""
          var b=document.getElementById('wpb-clear');
          if(!b) return null;
          var r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
        """)
        if cb:
            click(d, cb["x"], cb["y"])
            time.sleep(0.6)
            print("after clear, picked =", d.execute_script(
                "return document.querySelectorAll('.wf-pick-item.picked').length;"))

        print("errors:", [e["message"][:160] for e in d.get_log("browser")
                          if e["level"] == "SEVERE" and "jsdelivr" not in e["message"]] or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
