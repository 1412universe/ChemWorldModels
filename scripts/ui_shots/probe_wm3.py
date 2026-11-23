import time, json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1500,1100"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    logs=[]
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(6)
    d.execute_script("window.__WF_WM.show();"); time.sleep(1)
    d.execute_script("document.querySelector('#wf-wm-panel .wm-run').click();")
    for i in range(80):
        t=d.execute_script("return document.getElementById('wf-wm-panel').innerText;")
        if "推演中" not in t and len(t)>400:
            print("done at", i*0.5); break
        time.sleep(0.5)
    print("LEN", len(t))
    print(t[-900:].replace("\n"," | "))
finally:
    d.quit()
