import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

o=Options()
o.add_argument("--headless=new")
o.add_argument("--use-gl=angle")
o.add_argument("--use-angle=swiftshader")
o.add_argument("--enable-unsafe-swiftshader")
o.add_argument("--window-size=1600,1000")
o.add_argument("--hide-scrollbars")
o.add_argument("--no-sandbox")
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html")
    time.sleep(6)
    info=d.execute_script("""
      var c=document.createElement('canvas');
      var gl=c.getContext('webgl2')||c.getContext('webgl');
      var three=typeof THREE!=='undefined';
      var lab=document.getElementById('lab-3d');
      return {webgl: !!gl, three: three, labChildren: lab?lab.children.length:-1,
              chat: (document.getElementById('chat')||{}).textContent?.slice(0,160)};
    """)
    print(info)
    d.save_screenshot("/tmp/shots/probe_3d.png")
finally:
    d.quit()
