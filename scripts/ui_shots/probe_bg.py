import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1440,1000"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(5)
    print(d.execute_script("""
      function bg(el){var c=getComputedStyle(el);return c.backgroundColor+' | image:'+(c.backgroundImage||'').slice(0,80);}
      return {html:bg(document.documentElement),body:bg(document.body),
              app:bg(document.getElementById('app')||document.body),
              right:bg(document.getElementById('right'))};
    """))
finally:
    d.quit()
