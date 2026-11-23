import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1440,1000"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(5)
    info=d.execute_script("""
      var r=document.getElementById('right');
      var cs=getComputedStyle(r);
      var c=document.getElementById('cand-card');
      var cc=c?getComputedStyle(c):null;
      return {rightBg:cs.backgroundColor, rightColor:cs.color,
              cardBg: cc?cc.backgroundColor:null,
              rightRect: r.getBoundingClientRect().toJSON()};
    """)
    print(info)
finally:
    d.quit()
