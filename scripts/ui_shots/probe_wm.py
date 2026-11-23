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
    print("btn", len(d.find_elements(By.ID,"btn-worldmodel")))
    d.execute_script("arguments[0].click();", d.find_element(By.ID,"btn-worldmodel"))
    time.sleep(5)
    print(d.execute_script("""
      var pm=document.getElementById('panel-modal');
      if(!pm) return 'no modal';
      var cs=getComputedStyle(pm);
      var r=pm.getBoundingClientRect();
      return {cls:pm.className, display:cs.display, w:r.width,h:r.height,
              inner:(pm.innerText||'').slice(0,200).replace(/\\n/g,' | ')};
    """))
finally:
    d.quit()
