# -*- coding: utf-8 -*-
"""用 CDP clip 精确截取界面区块（避免元素过高时的拼接错位）。"""
import base64
import os
import sys
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

BASE = "http://127.0.0.1:8000"

# 截面板时要隐藏的浮层：导航、新手引导遮罩、右下角 AI 对话、日志、三维提示
# 遮挡性浮层（任何截图都要隐藏）
HIDE_OVERLAY = [
    ".topnav", "#chat", "#lab-hint", ".onboard-mask", ".ai-chat",
    "[class*='onboard-']",
]
# 截侧栏面板时额外隐藏主视图，避免画面里出现别的内容
HIDE_ALL = HIDE_OVERLAY + ["#panel-modal", "#dev-modal", "#center", "#bottom", "#recipe-panel"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)


def drv(w=1440, h=1000, scale=2):
    o = Options()
    for a in ["--headless=new", "--disable-gpu", "--hide-scrollbars",
              "--no-sandbox", "--disable-dev-shm-usage",
              "--force-device-scale-factor=%d" % scale,
              "--window-size=%d,%d" % (w, h)]:
        o.add_argument(a)
    d = webdriver.Chrome(options=o)
    d.set_window_size(w, h)
    return d


def hide(d, sels):
    css = "".join("%s{display:none !important;}" % s for s in sels)
    d.execute_script(
        "var s=document.createElement('style');s.textContent=arguments[0];document.head.appendChild(s);",
        css)
    time.sleep(0.4)


def flatten(d, sel):
    """把容器内所有滚动区展开，让整块内容一次渲染完整。"""
    d.execute_script("""
      var root=arguments[0];
      [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function(n){
        var cs=getComputedStyle(n);
        if(cs.overflowY==='auto'||cs.overflowY==='scroll'||cs.overflow==='auto'||cs.overflow==='scroll'){
          n.style.maxHeight='none'; n.style.height='auto'; n.style.overflow='visible';
        }
        if(parseFloat(cs.maxHeight)>0){ n.style.maxHeight='none'; }
      });
    """, d.find_element(By.CSS_SELECTOR, sel))
    time.sleep(0.8)


def clip_shot(d, sel, name, pad=8, bg="#ffffff"):
    """按元素边界做 CDP 裁剪截图。"""
    d.execute_script("""
      document.body.style.background=arguments[0];
      var el=arguments[1];
      el.style.background='#ffffff';
      el.style.overflow='visible';
      el.style.maxHeight='none';
      window.scrollTo(0,0);
    """, bg, d.find_element(By.CSS_SELECTOR, sel))
    time.sleep(0.5)
    rect = d.execute_script("""
      var r=document.querySelector(arguments[0]).getBoundingClientRect();
      return {x:r.left+window.scrollX, y:r.top+window.scrollY, w:r.width, h:r.height,
              dpr:window.devicePixelRatio};
    """, sel)
    clip = {
        "x": max(0.0, rect["x"] - pad),
        "y": max(0.0, rect["y"] - pad),
        "width": rect["w"] + pad * 2,
        "height": rect["h"] + pad * 2,
        "scale": 1,
    }
    res = d.execute_cdp_cmd("Page.captureScreenshot", {
        "format": "png",
        "clip": clip,
        "captureBeyondViewport": True,
    })
    path = os.path.join(OUT, name)
    with open(path, "wb") as f:
        f.write(base64.b64decode(res["data"]))
    from PIL import Image, ImageStat
    im = Image.open(path).convert("RGB")
    st = ImageStat.Stat(im)
    print("saved %s %s mean=%.0f stddev=%.0f" % (
        name, im.size, sum(st.mean) / 3, sum(st.stddev) / 3))
    return path


def text_of(d, sel):
    try:
        return d.find_element(By.CSS_SELECTOR, sel).text
    except Exception:
        return ""


def ocm():
    d = drv()
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        for t in d.find_elements(By.CSS_SELECTOR, ".scene-tab"):
            if "OCM" in t.text:
                d.execute_script("arguments[0].click();", t)
                break
        time.sleep(1)
        try:
            d.execute_script("arguments[0].click();", d.find_element(By.ID, "btn-play"))
        except Exception:
            pass
        for _ in range(90):
            nm = text_of(d, "#cand-name").strip()
            if nm and "等待启动" not in nm:
                break
            time.sleep(1)
        time.sleep(2)
        hide(d, HIDE_ALL)
        clip_shot(d, "#right", "fig1_ocm_panel.png")
        print("TEXT:", text_of(d, "#right")[:200].replace("\n", " | "))
    finally:
        d.quit()


def hcho():
    d = drv()
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        for t in d.find_elements(By.CSS_SELECTOR, ".scene-tab"):
            if "HCHO" in t.text:
                d.execute_script("arguments[0].click();", t)
                break
        for _ in range(40):
            if d.find_elements(By.CSS_SELECTOR, "#hcho-tbody tr"):
                break
            time.sleep(0.5)
        time.sleep(1.5)
        hide(d, HIDE_ALL)
        flatten(d, "#right")
        clip_shot(d, "#right", "fig2_hcho_panel.png")
        print("ROWS:", len(d.find_elements(By.CSS_SELECTOR, "#hcho-tbody tr")))
        print("TEXT:", text_of(d, "#right")[:200].replace("\n", " | "))
    finally:
        d.quit()


def charts():
    """底部图表区：逐张图表卡片截图后横向拼接。"""
    from PIL import Image
    d = drv(w=1600, h=1200)
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        # 跑起来才有曲线与能带/火山数据
        try:
            d.execute_script("arguments[0].click();", d.find_element(By.ID, "btn-play"))
        except Exception:
            pass
        for _ in range(60):
            nm = text_of(d, "#cand-name").strip()
            if nm and "等待启动" not in nm:
                break
            time.sleep(1)
        time.sleep(4)
        # 只隐藏遮挡浮层，保留 #bottom
        hide(d, HIDE_OVERLAY)
        d.execute_script("document.getElementById('bottom').scrollIntoView({block:'start'});")
        time.sleep(1.5)
        cards = d.find_elements(By.CSS_SELECTOR, "#bottom > *")
        print("cards", len(cards))
        paths = []
        for i, c in enumerate(cards):
            if c.size["width"] < 40 or c.size["height"] < 40:
                continue
            r = d.execute_script(
                "var r=arguments[0].getBoundingClientRect();"
                "return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height};", c)
            res = d.execute_cdp_cmd("Page.captureScreenshot", {
                "format": "png",
                "clip": {"x": r["x"], "y": r["y"], "width": r["w"], "height": r["h"], "scale": 1},
                "captureBeyondViewport": True,
            })
            p = os.path.join(OUT, "_chart%d.png" % i)
            open(p, "wb").write(base64.b64decode(res["data"]))
            im = Image.open(p)
            print(" card", i, im.size)
            if im.width > 40 and im.height > 40:
                paths.append(p)
        if paths:
            ims = [Image.open(p).convert("RGB") for p in paths]
            H = max(i.height for i in ims)
            ims = [i.resize((int(i.width * H / i.height), H), Image.LANCZOS) for i in ims]
            W = sum(i.width for i in ims)
            canvas = Image.new("RGB", (W, H), "white")
            x = 0
            for i in ims:
                canvas.paste(i, (x, 0))
                x += i.width
            out = os.path.join(OUT, "fig4_charts.png")
            canvas.save(out)
            print("saved fig4_charts.png", canvas.size)
    finally:
        d.quit()


def panel_modal():
    """世界模型预演弹窗。"""
    d = drv(w=1500, h=1100)
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        opened = False
        try:
            d.execute_script("if(window.__WF_WM){window.__WF_WM.show();return 'api';}return 'none';")
            opened = bool(d.execute_script("var p=document.getElementById('wf-wm-panel');return !!(p&&p.classList.contains('on'));"))
            print("opened via api:", opened)
        except Exception as e:
            print("api failed", e)
        if not opened:
            try:
                d.execute_script("arguments[0].click();", d.find_element(By.ID, "btn-worldmodel"))
            except Exception as e:
                print("click failed", e)
        for _ in range(30):
            if d.find_elements(By.CSS_SELECTOR, ".wm-panel, #wm-panel"):
                break
            time.sleep(0.5)
        time.sleep(4)
        hide(d, HIDE_OVERLAY)
        src = "#wf-wm-panel"
        if not d.find_elements(By.CSS_SELECTOR, src):
            if d.find_elements(By.CSS_SELECTOR, "#panel-modal .pm-card"):
                src = "#panel-modal .pm-card"
            else:
                src = "#panel-modal"
        clip_shot(d, src, "fig3_worldmodel.png", pad=10)
        print("TEXT:", text_of(d, "#panel-modal")[:260].replace("\n", " | "))
    finally:
        d.quit()


def recipe():
    d = drv(w=1500, h=1100)
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        try:
            d.execute_script("arguments[0].click();", d.find_element(By.ID, "btn-play"))
        except Exception:
            pass
        for _ in range(90):
            nm = text_of(d, "#cand-name").strip()
            if nm and "等待启动" not in nm:
                break
            time.sleep(1)
        time.sleep(2)
        # 展开配方面板
        try:
            d.execute_script("var h=document.getElementById('rp-head'); if(h) h.click();")
        except Exception:
            pass
        for _ in range(30):
            if text_of(d, "#rp-body").strip():
                break
            time.sleep(1)
        time.sleep(1.5)
        hide(d, HIDE_OVERLAY)
        flatten(d, "#recipe-panel")
        clip_shot(d, "#recipe-panel", "fig5_recipe.png", pad=8)
        print("TEXT:", text_of(d, "#recipe-panel")[:260].replace("\n", " | "))
    finally:
        d.quit()


def wm_out():
    """只截世界模型预演的三层结果区（#wm-out）。"""
    d = drv(w=1500, h=1100)
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        d.execute_script("window.__WF_WM.show();")
        time.sleep(1.5)
        d.execute_script("document.querySelector('#wf-wm-panel .wm-run').click();")
        for _ in range(90):
            t = text_of(d, "#wm-out")
            if "推演中" not in t and len(t) > 400:
                print("result ready", len(t))
                break
            time.sleep(0.5)
        time.sleep(2)
        # 截到「物理约束」小节为止，避免过长
        d.execute_script("""
          var out=document.getElementById('wm-out');
          var kids=[].slice.call(out.children);
          var keep=[];
          for (var i=0;i<kids.length;i++){
            keep.push(kids[i]);
            var t=(kids[i].innerText||'');
            if (t.indexOf('物理约束')>=0 && t.indexOf('告警')>=0) break;
          }
          var box=document.createElement('div'); box.id='wm-cut';
          keep.forEach(function(n){ box.appendChild(n.cloneNode(true)); });
          out.innerHTML=''; out.appendChild(box);
        """)
        time.sleep(1)
        hide(d, HIDE_OVERLAY)
        clip_shot(d, "#wm-cut", "fig3_wm_results.png", pad=10)
    finally:
        d.quit()


def recipe_page():
    """配方页：抓主区域（配方卡片 + 导出按钮）。"""
    d = drv(w=1500, h=1150)
    try:
        d.get(BASE + "/recipe.html")
        time.sleep(7)
        try:
            d.execute_script("arguments[0].click();", d.find_element(By.ID, "btn-play"))
        except Exception:
            pass
        for _ in range(90):
            nm = text_of(d, "#cand-name").strip()
            if nm and "等待启动" not in nm:
                break
            time.sleep(1)
        time.sleep(3)
        hide(d, HIDE_OVERLAY)
        flatten(d, "#center")
        clip_shot(d, "#center", "fig5_recipe.png", pad=10)
        print("TEXT:", text_of(d, "#center")[:240].replace("\n", " | "))
    finally:
        d.quit()


def page_main(url, name, wait=8):
    """抓某个页面的主视图区（#center）。"""
    d = drv(w=1500, h=1150)
    try:
        d.get(BASE + url)
        time.sleep(wait)
        hide(d, HIDE_OVERLAY)
        flatten(d, "#center")
        clip_shot(d, "#center", name, pad=10)
        print("TEXT:", text_of(d, "#center")[:220].replace("\n", " | "))
    finally:
        d.quit()


if __name__ == "__main__":
    job = sys.argv[1]
    {"ocm": ocm, "hcho": hcho, "charts": charts,
     "modal": panel_modal, "recipe": recipe, "wmout": wm_out,
     "recipepage": recipe_page,
     "char": lambda: page_main("/char.html", "fig5_char.png"),
     "dft": lambda: page_main("/dft.html", "fig6_dft.png")}[job]()
