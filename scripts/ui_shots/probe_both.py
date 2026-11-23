import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1500,1100"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
def txt(sel):
    try: return d.find_element(By.CSS_SELECTOR,sel).text
    except Exception as e: return "<err %s>"%e
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(6)
    # --- WM panel ---
    d.execute_script("window.__WF_WM.show();"); time.sleep(1.5)
    try:
        b=d.find_element(By.CSS_SELECTOR,"#wf-wm-panel .wm-run")
        d.execute_script("arguments[0].click();",b); print("clicked wm-run ok")
    except Exception as e: print("click err",e)
    for i in range(40):
        t=txt("#wf-wm-panel")
        if any(k in t for k in ("可做","高风险","别做")): print("wm result at",i*0.5,"s"); break
        time.sleep(0.5)
    print("WM TEXT len",len(txt("#wf-wm-panel")))
    print("WM TAIL:", txt("#wf-wm-panel")[-300:].replace("\n"," | "))
    # --- recipe ---
    print("rp exists", len(d.find_elements(By.CSS_SELECTOR,"#recipe-panel")))
    print("rp rect", d.execute_script("var e=document.getElementById('recipe-panel');if(!e)return null;var r=e.getBoundingClientRect();return [r.width,r.height,e.className];"))
    print("rp head:", txt("#rp-head"))
    print("rp body len", len(txt("#rp-body")))
    try:
        d.execute_script("document.getElementById('rp-head').click();"); time.sleep(2)
        print("rp body after click len", len(txt("#rp-body")))
        print("rp rect after", d.execute_script("var e=document.getElementById('recipe-panel');var r=e.getBoundingClientRect();return [r.width,r.height,e.className];"))
    except Exception as e: print("rp click err",e)
finally:
    d.quit()
