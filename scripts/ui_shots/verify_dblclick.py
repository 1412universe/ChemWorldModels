# -*- coding: utf-8 -*-
"""用 JS 事件流验证双击改名（绕过 CDP 的 clickCount 差异）。"""
import json
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
    d = webdriver.Chrome(options=o)
    d.set_window_size(1700, 1050)
    try:
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        d.execute_script("window.__WFED.openWorkflow(arguments[0]);", wf)
        time.sleep(3)

        # 连续两次点击 .g-name（模拟用户双击，间隔 120ms）
        r = d.execute_script("""
          var n=document.querySelector('.wfgroup .g-name');
          if(!n) return {err:'no name el'};
          var fire=function(){
            n.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,view:window,button:0}));
            n.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,view:window,button:0}));
            n.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,detail:1}));
          };
          fire();
          return {first:true};
        """)
        time.sleep(0.12)
        r2 = d.execute_script("""
          var n=document.querySelector('.wfgroup .g-name');
          if(!n) return {err:'gone'};
          n.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,view:window,button:0}));
          n.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,view:window,button:0}));
          n.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,detail:2}));
          return {second:true};
        """)
        time.sleep(0.9)
        prompt = d.execute_script(
            "return !!document.querySelector('.wfed-note.m-ask .wn-input');")
        print("first click:", r, "| second:", r2, "| prompt visible:", prompt)

        if prompt:
            d.execute_script("""
              var i=document.querySelector('.wfed-note.m-ask .wn-input');
              i.value='双击改名OK';
              document.querySelector('.wfed-note.m-ask .wn-ok').click();
            """)
            time.sleep(0.8)
            print("name:", d.execute_script(
                "return (document.querySelector('.wfgroup .g-name')||{}).textContent;"))
    finally:
        d.quit()


if __name__ == "__main__":
    main()
