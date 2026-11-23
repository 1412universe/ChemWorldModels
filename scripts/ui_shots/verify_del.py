# -*- coding: utf-8 -*-
"""用临时新建的工作流验证「删除所选」真正生效。"""
import json
import time
import urllib.request

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
    for k, p in (
        ("mouseMoved", {"x": x, "y": y}),
        ("mousePressed", {"x": x, "y": y, "button": "left", "buttons": 1,
                          "clickCount": 1, "modifiers": mods}),
        ("mouseReleased", {"x": x, "y": y, "button": "left", "buttons": 0,
                           "clickCount": 1, "modifiers": mods}),
    ):
        d.execute_cdp_cmd("Input.dispatchMouseEvent", dict(p, type=k))
        time.sleep(0.12)
    if shift:
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "Shift", "code": "ShiftLeft",
            "windowsVirtualKeyCode": 16})


def save_wf(name):
    body = json.dumps({
        "name": name,
        "workflow": {"name": name, "data": {
            "workflow_uuid": "", "workflow_name": name,
            "nodes": [], "edges": [], "embeds": []}},
    }).encode()
    req = urllib.request.Request(BASE + "/api/workflow-save", data=body,
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


def main():
    names = ["__tmp_del_A__", "__tmp_del_B__"]
    for nm in names:
        print("created:", save_wf(nm))

    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)
        rows = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item')].map(function(b){
            var r=b.getBoundingClientRect();
            return {tid:b.getAttribute('data-tid'),nm:(b.querySelector('.wn')||{}).textContent,
                    x:r.left+r.width/2,y:r.top+r.height/2,on:b.classList.contains('on')};
          });
        """)
        targets = [r for r in rows if (r["nm"] or "").startswith("__tmp_del_")]
        print("found temp rows:", len(targets))
        for t in targets:
            click(d, t["x"], t["y"], shift=True)
            time.sleep(0.45)
        picked = d.execute_script(
            "return document.querySelectorAll('.wf-pick-item.picked').length;")
        print("picked:", picked)

        btn = d.execute_script("""
          var b=document.getElementById('wpb-del'); if(!b) return null;
          var r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
        """)
        if not btn:
            print("no delete button")
            return
        click(d, btn["x"], btn["y"])
        time.sleep(1.0)
        ok = d.execute_script("""
          var bs=[...document.querySelectorAll('.wn-ok')].filter(function(x){return x.offsetParent;});
          if(!bs.length) return null;
          var r=bs[0].getBoundingClientRect();
          return {x:r.left+r.width/2,y:r.top+r.height/2,txt:bs[0].textContent};
        """)
        print("confirm btn:", ok)
        if ok:
            click(d, ok["x"], ok["y"])
            time.sleep(2.2)
        left = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item .wn')]
            .map(function(x){return x.textContent;})
            .filter(function(n){return n && n.indexOf('__tmp_del_')===0;});
        """)
        print("temp rows left:", left)
        print("errors:", [e["message"][:150] for e in d.get_log("browser")
                          if e["level"] == "SEVERE" and "jsdelivr" not in e["message"]] or "none")
    finally:
        d.quit()


if __name__ == "__main__":
    main()
