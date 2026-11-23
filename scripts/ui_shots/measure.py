import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1440,1000"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(6)
    for t in d.find_elements(By.CSS_SELECTOR,".scene-tab"):
        if "HCHO" in t.text: d.execute_script("arguments[0].click();",t); break
    for _ in range(40):
        if d.find_elements(By.CSS_SELECTOR,"#hcho-tbody tr"): break
        time.sleep(0.5)
    time.sleep(1.5)
    info=d.execute_script("""
      var right=document.getElementById('right');
      var wrap=document.querySelector('.hcho-table-wrap');
      var tb=document.getElementById('hcho-tbody');
      return {rightH:right.getBoundingClientRect().height,
              rightW:right.getBoundingClientRect().width,
              scrollH:right.scrollHeight,
              wrapH:wrap.getBoundingClientRect().height,
              wrapScroll:wrap.scrollHeight,
              tbodyH:tb.getBoundingClientRect().height,
              rows:tb.children.length};
    """)
    print(info)
finally:
    d.quit()
