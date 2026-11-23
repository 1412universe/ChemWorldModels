# -*- coding: utf-8 -*-
"""抓取界面截图（限定面板区域，避开含 510/设备字样的导航与日志）。"""
import os
import time
import sys

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from PIL import Image

BASE = "http://127.0.0.1:8000"
OUT = "/Users/fenglongli/Downloads/ChemWorldModel/scripts/ui_shots/out"
os.makedirs(OUT, exist_ok=True)


def driver(width=1500, height=2200, scale=2):
    o = Options()
    o.add_argument("--headless=new")
    o.add_argument("--disable-gpu")
    o.add_argument("--hide-scrollbars")
    o.add_argument("--force-device-scale-factor=%d" % scale)
    o.add_argument("--window-size=%d,%d" % (width, height))
    o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage")
    d = webdriver.Chrome(options=o)
    d.set_window_size(width, height)
    return d


def shot_el(d, selector, path, pad=6):
    el = d.find_element(By.CSS_SELECTOR, selector)
    # 先撑大视口，保证整块面板都在视口内（否则超出部分截成灰底）
    need = el.size["height"] + 120
    vw = d.execute_script("return window.innerWidth;")
    if need > d.execute_script("return window.innerHeight;"):
        d.set_window_size(vw, int(need))
        time.sleep(0.8)
    d.execute_script("window.scrollTo(0,0);")
    time.sleep(0.4)
    box = el.rect
    d.save_screenshot("/tmp/shots/_full.png")
    im = Image.open("/tmp/shots/_full.png")
    r = d.execute_script(
        "const r=arguments[0].getBoundingClientRect();"
        "return {x:r.left,y:r.top,w:r.width,h:r.height,"
        "dpr:window.devicePixelRatio};", el)
    dpr = r["dpr"] or 1
    x0 = max(0, int((r["x"] - pad) * dpr))
    y0 = max(0, int((r["y"] - pad) * dpr))
    x1 = min(im.width, int((r["x"] + r["w"] + pad) * dpr))
    y1 = min(im.height, int((r["y"] + r["h"] + pad) * dpr))
    im.crop((x0, y0, x1, y1)).save(path)
    out = Image.open(path)
    print("saved", path, out.size)
    return out


def hide(d, selectors):
    css = "".join("%s{display:none !important;}" % s for s in selectors)
    st = d.find_element(By.TAG_NAME, "style") if d.find_elements(By.TAG_NAME, "style") else None
    d.execute_script(
        "var s=document.createElement('style');s.textContent=arguments[0];document.head.appendChild(s);",
        css,
    )


def strip(d):
    """隐藏导航、页头、状态栏、AI 日志等会提到 510/设备的区域。"""
    hide(d, [
        ".topnav",
        "#chat",
        "aside#right > h2",
        "#lab-hint",
        "#panel-modal",
        "#dev-modal",
        "#recipe-panel",
        "#bottom",
        "#center",
    ])


def capture_ocm_panel():
    d = driver()
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        # 关闭可能的引导
        for b in d.find_elements(By.TAG_NAME, "button"):
            if (b.text or "").strip() in ("跳过", "知道了"):
                try:
                    b.click()
                except Exception:
                    pass
        # 切 OCM
        for t in d.find_elements(By.CSS_SELECTOR, ".scene-tab"):
            if "OCM" in (t.text or ""):
                d.execute_script("arguments[0].click();", t)
                break
        time.sleep(1.5)
        # 点运行，让候选卡片出数
        try:
            btn = d.find_element(By.ID, "btn-play")
            d.execute_script("arguments[0].click();", btn)
            print("clicked run")
        except Exception as e:
            print("run click failed", e)
        # 等候选卡片不再显示「等待启动」（约 30s 出首个候选）
        for _ in range(90):
            try:
                nm = d.find_element(By.ID, "cand-name").text.strip()
                if nm and "等待启动" not in nm and nm != "—":
                    print("candidate:", nm)
                    break
            except Exception:
                pass
            time.sleep(1)
        time.sleep(2)
        strip(d)
        time.sleep(1)
        # 只截右栏面板（场景标签 + 候选卡片）
        shot_el(d, "#right", os.path.join(OUT, "fig1_overview_ocm.png"))
    finally:
        d.quit()


def capture_hcho_panel():
    d = driver()
    try:
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        for t in d.find_elements(By.CSS_SELECTOR, ".scene-tab"):
            if "HCHO" in (t.text or ""):
                d.execute_script("arguments[0].click();", t)
                break
        for _ in range(30):
            rows = d.find_elements(By.CSS_SELECTOR, "#hcho-tbody tr")
            if rows:
                break
            time.sleep(0.5)
        time.sleep(1.5)
        print("rows", len(d.find_elements(By.CSS_SELECTOR, "#hcho-tbody tr")))
        # 展开表格，让 15 条补点全部可见
        d.execute_script(
            "var s=document.createElement('style');"
            "s.textContent='.hcho-table-wrap{max-height:none !important;}';"
            "document.head.appendChild(s);")
        time.sleep(0.8)
        strip(d)
        time.sleep(1)
        shot_el(d, "#right", os.path.join(OUT, "fig2_overview_hcho.png"), pad=8)
    finally:
        d.quit()


def capture_simple(url, selector, name, wait=7):
    d = driver()
    try:
        d.get(BASE + url)
        time.sleep(wait)
        strip(d)
        time.sleep(1)
        shot_el(d, selector, os.path.join(OUT, name), pad=8)
    finally:
        d.quit()


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "ocm"):
        capture_ocm_panel()
    if which in ("all", "hcho"):
        capture_hcho_panel()
