# -*- coding: utf-8 -*-
import os, time, sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

BASE="http://127.0.0.1:8000"
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"out")
os.makedirs(OUT,exist_ok=True)

def drv(w=1440,h=1000,scale=2):
    o=Options()
    for a in ["--headless=new","--disable-gpu","--hide-scrollbars",
              "--no-sandbox","--disable-dev-shm-usage",
              "--force-device-scale-factor=%d"%scale,
              "--window-size=%d,%d"%(w,h)]:
        o.add_argument(a)
    d=webdriver.Chrome(options=o); d.set_window_size(w,h); return d

def hide(d, sels, css_extra=""):
    css="".join("%s{display:none !important;}"%s for s in sels)+css_extra
    d.execute_script("var s=document.createElement('style');s.textContent=arguments[0];document.head.appendChild(s);",css)
    time.sleep(0.4)

def save(d, sel, name, unlock_scroll=True):
    el=d.find_element(By.CSS_SELECTOR, sel)
    if unlock_scroll:
        d.execute_script("""
          var el=arguments[0];
          el.style.maxHeight='none'; el.style.height='auto'; el.style.overflow='visible';
          el.querySelectorAll('*').forEach(function(n){
            var cs=getComputedStyle(n);
            if(cs.overflowY==='auto'||cs.overflowY==='scroll'){n.style.maxHeight='none';n.style.height='auto';n.style.overflow='visible';}
          });
        """, el)
        time.sleep(0.6)
    p=os.path.join(OUT,name)
    el.screenshot(p)
    from PIL import Image
    print("saved",name,Image.open(p).size)

def texts(d, sel):
    try: return d.find_element(By.CSS_SELECTOR,sel).text
    except Exception: return "<none>"

if __name__=="__main__":
    what=sys.argv[1]

    if what=="ocm":
        d=drv()
        try:
            d.get(BASE+"/overview_photo.html"); time.sleep(6)
            for t in d.find_elements(By.CSS_SELECTOR,".scene-tab"):
                if "OCM" in t.text: d.execute_script("arguments[0].click();",t); break
            time.sleep(1)
            try: d.execute_script("arguments[0].click();", d.find_element(By.ID,"btn-play"))
            except Exception as e: print("run:",e)
            for _ in range(90):
                nm=texts(d,"#cand-name").strip()
                if nm and "等待启动" not in nm: print("cand:",nm); break
                time.sleep(1)
            time.sleep(2)
            hide(d,[".topnav","#chat","#lab-hint","#panel-modal","#dev-modal"])
            save(d,"#right","fig1_ocm_panel.png")
            print("TEXT:",texts(d,"#right")[:400].replace("\n"," | "))
        finally: d.quit()

    if what=="hcho":
        d=drv()
        try:
            d.get(BASE+"/overview_photo.html"); time.sleep(6)
            for t in d.find_elements(By.CSS_SELECTOR,".scene-tab"):
                if "HCHO" in t.text: d.execute_script("arguments[0].click();",t); break
            for _ in range(40):
                if d.find_elements(By.CSS_SELECTOR,"#hcho-tbody tr"): break
                time.sleep(0.5)
            time.sleep(1.5)
            hide(d,[".topnav","#chat","#lab-hint","#panel-modal","#dev-modal"])
            save(d,"#right","fig2_hcho_panel.png")
            print("ROWS:",len(d.find_elements(By.CSS_SELECTOR,"#hcho-tbody tr")))
            print("TEXT:",texts(d,"#right")[:300].replace("\n"," | "))
        finally: d.quit()

    if what=="wm":
        d=drv()
        try:
            d.get(BASE+"/overview_photo.html"); time.sleep(6)
            try: d.execute_script("arguments[0].click();", d.find_element(By.ID,"btn-worldmodel"))
            except Exception as e: print("wm:",e)
            time.sleep(6)
            hide(d,[".topnav","#chat","#lab-hint"])
            save(d,"#panel-modal","fig3_worldmodel.png",unlock_scroll=True)
            print("TEXT:",texts(d,"#panel-modal")[:400].replace("\n"," | "))
        finally: d.quit()

    if what=="bottom":
        d=drv()
        try:
            d.get(BASE+"/overview_photo.html"); time.sleep(7)
            hide(d,[".topnav","#chat","#lab-hint"])
            save(d,"#bottom","fig4_charts.png")
            print("TEXT:",texts(d,"#bottom")[:200].replace("\n"," | "))
        finally: d.quit()

    if what=="recipe":
        d=drv()
        try:
            d.get(BASE+"/overview_photo.html"); time.sleep(6)
            try: d.execute_script("arguments[0].click();", d.find_element(By.ID,"btn-play"))
            except Exception: pass
            for _ in range(90):
                nm=texts(d,"#cand-name").strip()
                if nm and "等待启动" not in nm: break
                time.sleep(1)
            time.sleep(2)
            hide(d,[".topnav","#chat","#lab-hint"])
            save(d,"#recipe-panel","fig5_recipe.png")
            print("TEXT:",texts(d,"#recipe-panel")[:300].replace("\n"," | "))
        finally: d.quit()
