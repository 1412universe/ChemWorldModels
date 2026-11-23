# -*- coding: utf-8 -*-
"""验证工作流删除后的 Ctrl+Z 撤回（只针对临时项，且验证后清理）。"""
import glob
import json
import os
import time
import uuid

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
TPL = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates"
TMPNAME = "__tmp_undo_check__"


def count_templates():
    return len(glob.glob(os.path.join(TPL, "*.json")))


def main():
    before = count_templates()
    print("templates before:", before)

    tid = str(uuid.uuid4())
    tmp = {"name": TMPNAME, "data": {
        "workflow_uuid": tid, "workflow_name": TMPNAME,
        "nodes": [], "edges": [], "embeds": []}}
    tp = os.path.join(TPL, tid + ".json")
    json.dump(tmp, open(tp, "w", encoding="utf-8"), ensure_ascii=False)

    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)

        def rows():
            return d.execute_script("""
              return [...document.querySelectorAll('.wf-pick-item .wn')]
                .map(function(x){return x.textContent;})
                .filter(function(n){return n && n.indexOf('__tmp_undo_check__')===0;}).length;
            """)

        print("UI rows before:", rows())

        # Shift 勾选临时项
        d.execute_script("""
          var b=[...document.querySelectorAll('.wf-pick-item')].filter(function(x){
            var t=(x.querySelector('.wn')||{}).textContent||'';
            return t.indexOf('__tmp_undo_check__')===0;})[0];
          if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,shiftKey:true,view:window}));
        """)
        time.sleep(0.5)
        d.execute_script("var b=document.getElementById('wpb-del'); if(b) b.click();")
        time.sleep(0.8)
        d.execute_script("""
          var bs=[...document.querySelectorAll('.wn-ok')].filter(function(x){return x.offsetParent;});
          if(bs.length) bs[0].click();
        """)
        time.sleep(2.5)
        print("after delete -> UI rows:", rows(), "| file exists:", os.path.exists(tp))

        # Ctrl+Z
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "z", "code": "KeyZ",
            "windowsVirtualKeyCode": 90, "modifiers": 4})
        d.execute_cdp_cmd("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "z", "code": "KeyZ",
            "windowsVirtualKeyCode": 90, "modifiers": 4})
        time.sleep(3)
        print("after Ctrl+Z -> UI rows:", rows(), "| file exists:", os.path.exists(tp))
    finally:
        d.quit()
        # 清理临时项
        for p in glob.glob(os.path.join(TPL, "*.json")):
            try:
                if json.load(open(p)).get("name") == TMPNAME:
                    os.remove(p)
                    print("cleaned", os.path.basename(p))
            except Exception:
                pass
        print("templates after cleanup:", count_templates(), "(was", before, ")")


if __name__ == "__main__":
    main()
