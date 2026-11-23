import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1500,1100"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    for url in ["/char.html","/dft.html"]:
        d.get("http://127.0.0.1:8000"+url); time.sleep(6)
        info=d.execute_script("""
          var c=document.getElementById('center');
          var modal=document.getElementById('panel-modal');
          var r=c?c.getBoundingClientRect():null;
          return {center:r?[Math.round(r.width),Math.round(r.height)]:null,
                  modalCls: modal?modal.className:null,
                  modalDisplay: modal?getComputedStyle(modal).display:null,
                  modalText:(modal?modal.innerText:'').slice(0,80).replace(/\\n/g,' | '),
                  canvases:[...document.querySelectorAll('#center canvas')].map(c=>c.id+':'+c.width+'x'+c.height)};
        """)
        print(url, info)
finally:
    d.quit()
