# -*- coding: utf-8 -*-
"""验收：折叠卡改名（按钮 + 双击）、工作流列表删除后 Ctrl+Z 撤回。"""
import glob
import json
import os
import time
import uuid

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
WF = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates/96cdb50e-9d3c-46fd-bb17-f1f93a2432a1.json"
TPL = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates"


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
    # 造 1 份临时工作流用于删除+撤回
    tid = str(uuid.uuid4())
    tmp = {"name": "__tmp_undo__", "data": {
        "workflow_uuid": tid, "workflow_name": "__tmp_undo__",
        "nodes": [], "edges": [], "embeds": []}}
    tp = os.path.join(TPL, tid + ".json")
    json.dump(tmp, open(tp, "w", encoding="utf-8"), ensure_ascii=False)
    print("temp template:", tid)

    d = mk()
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)

        # ---------- A. 改名按钮 ----------
        r = d.execute_script("""
          var c=document.querySelector('.wfgroup'); if(!c) return null;
          var b=c.querySelector('.g-btn[data-act=rename]');
          var cr=c.getBoundingClientRect(), br=b.getBoundingClientRect();
          return {gid:c.dataset.group, old:(c.querySelector('.g-name')||{}).textContent,
                  bx:br.left+br.width/2, by:br.top+br.height/2};
        """)
        print("rename btn:", r)
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": r["bx"],
                                                       "y": r["by"], "button": "left",
                                                       "buttons": 1, "clickCount": 1})
        d.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": r["bx"],
                                                       "y": r["by"], "button": "left",
                                                       "buttons": 0, "clickCount": 1})
        time.sleep(0.8)
        hasPrompt = d.execute_script("""
          var i=document.querySelector('.wfed-note.m-ask .wn-input');
          if(!i) return null;
          i.value='改名测试-A';
          var ok=document.querySelector('.wfed-note.m-ask .wn-ok');
          if(ok) ok.click();
          return true;
        """)
        time.sleep(0.8)
        newName = d.execute_script("""
          var c=document.querySelector('.wfgroup'); return (c.querySelector('.g-name')||{}).textContent;
        """)
        print("prompt shown:", bool(hasPrompt), "| name now:", newName)

        # ---------- B. 双击改名 ----------
        r2 = d.execute_script("""
          var c=document.querySelector('.wfgroup');
          var n=c.querySelector('.g-name');
          var rr=n.getBoundingClientRect();
          return {x:rr.left+rr.width/2, y:rr.top+rr.height/2};
        """)
        for _ in range(2):
            for k, p in (
                ("mousePressed", {"x": r2["x"], "y": r2["y"], "button": "left",
                                  "buttons": 1, "clickCount": 1}),
                ("mouseReleased", {"x": r2["x"], "y": r2["y"], "button": "left",
                                   "buttons": 0, "clickCount": 1}),
            ):
                d.execute_cdp_cmd("Input.dispatchMouseEvent", dict(p, type=k))
                time.sleep(0.08)
        time.sleep(0.9)
        r3 = d.execute_script("""
          var i=document.querySelector('.wfed-note.m-ask .wn-input');
          if(!i) return null;
          i.value='改名测试-B';
          var ok=document.querySelector('.wfed-note.m-ask .wn-ok');
          if(ok) ok.click();
          return true;
        """)
        time.sleep(0.8)
        name2 = d.execute_script("""
          var c=document.querySelector('.wfgroup'); return (c.querySelector('.g-name')||{}).textContent;
        """)
        print("dblclick prompt:", bool(r3), "| name now:", name2)

        # ---------- C. 删除工作流 + Ctrl+Z ----------
        d.execute_script("""
          var items=[...document.querySelectorAll('.wf-pick-item')]
            .filter(function(b){var t=(b.querySelector('.wn')||{}).textContent||'';
                                return t.indexOf('__tmp_undo__')===0;});
          if(items[0]) items[0].dispatchEvent(new MouseEvent('click',
            {bubbles:true,cancelable:true,shiftKey:true,view:window}));
        """)
        time.sleep(0.6)
        print("picked:", d.execute_script(
            "return document.querySelectorAll('.wf-pick-item.picked').length;"))
        d.execute_script("var b=document.getElementById('wpb-del'); if(b)b.click();")
        time.sleep(0.9)
        d.execute_script("""
          var bs=[...document.querySelectorAll('.wn-ok')].filter(function(x){return x.offsetParent;});
          if(bs.length) bs[0].click();
        """)
        time.sleep(2.2)
        after_del = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item .wn')]
            .map(function(x){return x.textContent;})
            .filter(function(n){return n && n.indexOf('__tmp_undo__')===0;}).length;
        """)
        file_exists = os.path.exists(tp)
        print("after delete -> UI rows:", after_del, "| file:", file_exists)

        # Ctrl+Z
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "z", "code": "KeyZ",
            "windowsVirtualKeyCode": 90, "modifiers": 4})  # 4 = Ctrl
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "z", "code": "KeyZ",
            "windowsVirtualKeyCode": 90, "modifiers": 4})
        time.sleep(2.5)
        after_undo = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item .wn')]
            .map(function(x){return x.textContent;})
            .filter(function(n){return n && n.indexOf('__tmp_undo__')===0;}).length;
        """)
        print("after Ctrl+Z -> UI rows:", after_undo, "| file:", os.path.exists(tp))

        print("errors:", [e["message"][:160] for e in d.get_log("browser")
                          if e["level"] == "SEVERE" and "jsdelivr" not in e["message"]] or "none")
    finally:
        d.quit()
        for p in glob.glob(os.path.join(TPL, "*.json")):
            try:
                if json.load(open(p)).get("name") == "__tmp_undo__":
                    os.remove(p)
                    print("cleaned", os.path.basename(p))
            except Exception:
                pass


if __name__ == "__main__":
    main()
