import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
o=Options()
for a in ["--headless=new","--disable-gpu","--hide-scrollbars","--no-sandbox","--window-size=1440,1000"]:
    o.add_argument(a)
d=webdriver.Chrome(options=o)
try:
    d.get("http://127.0.0.1:8000/overview_photo.html"); time.sleep(6)
    print(d.execute_script("""
      var out=[];
      document.querySelectorAll('body *').forEach(function(n){
        var cs=getComputedStyle(n);
        if((cs.position==='fixed'||cs.position==='absolute') && parseFloat(cs.zIndex)>=100){
          var r=n.getBoundingClientRect();
          out.push([n.tagName+'.'+(n.className||'').toString().slice(0,40), cs.zIndex, cs.display,
                    cs.backgroundColor, Math.round(r.width)+'x'+Math.round(r.height)]);
        }
      });
      return out.slice(0,20);
    """))
finally:
    d.quit()
