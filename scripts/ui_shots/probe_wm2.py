import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1500,1100"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(6)
    d.execute_script("window.__WF_WM.show();")
    time.sleep(2)
    btns=d.execute_script("""
      return [...document.querySelectorAll('#wf-wm-panel button')].map(b=>b.className+' :: '+b.textContent.trim());
    """)
    print("buttons:", btns)
    print("inner:", d.execute_script("return document.getElementById('wf-wm-panel').innerText.slice(0,200).replace(/\\n/g,' | ');"))
finally:
    d.quit()
