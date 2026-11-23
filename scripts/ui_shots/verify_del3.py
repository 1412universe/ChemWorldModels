# -*- coding: utf-8 -*-
"""用 JS 派发 shiftKey 点击，验证多选与批量删除。"""
import glob
import json
import os
import time
import uuid

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "http://127.0.0.1:8000"
TPL = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/workflows/templates"


def make_temps(names):
    made = []
    for nm in names:
        tid = str(uuid.uuid4())
        d = {"name": nm, "data": {"workflow_uuid": tid, "workflow_name": nm,
                                  "nodes": [], "edges": [], "embeds": []}}
        p = os.path.join(TPL, tid + ".json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        made.append(p)
    return made


def main():
    made = make_temps(["__tmp_m1__", "__tmp_m2__"])
    print("created", len(made))
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
              "--window-size=1700,1050"]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(6)
        for _ in range(8):
            r = d.execute_script("""
              var items=[...document.querySelectorAll('.wf-pick-item')]
                .filter(function(b){var t=(b.querySelector('.wn')||{}).textContent||'';
                                    return t.indexOf('__tmp_m')===0;});
              var b=items.filter(function(x){return !x.classList.contains('picked');})[0];
              if(!b) return {done:true, total:items.length,
                             picked:document.querySelectorAll('.wf-pick-item.picked').length};
              b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,
                                                     shiftKey:true,view:window}));
              return {done:false};
            """)
            time.sleep(0.45)
            if r.get("done"):
                print("select done:", r)
                break
        picked = d.execute_script(
            "return document.querySelectorAll('.wf-pick-item.picked').length;")
        print("picked:", picked)

        d.execute_script("""
          var b=document.getElementById('wpb-del');
          if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
        """)
        time.sleep(1.0)
        d.execute_script("""
          var bs=[...document.querySelectorAll('.wn-ok')].filter(function(x){return x.offsetParent;});
          if(bs.length) bs[0].click();
        """)
        time.sleep(2.5)
        left = d.execute_script("""
          return [...document.querySelectorAll('.wf-pick-item .wn')]
            .map(function(x){return x.textContent;})
            .filter(function(n){return n && n.indexOf('__tmp_m')===0;});
        """)
        print("temp rows left in UI:", left)
    finally:
        d.quit()
    # 清理残留
    for p in glob.glob(os.path.join(TPL, "__tmp_m*.json")):
        os.remove(p)
    for p in made:
        if os.path.exists(p):
            os.remove(p)
            print("removed leftover", os.path.basename(p))


if __name__ == "__main__":
    main()
