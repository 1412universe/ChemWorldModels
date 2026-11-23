# -*- coding: utf-8 -*-
"""Capture 15 page screenshots for ChemWorldModels 使用说明."""
from __future__ import annotations

import os
import time
from pathlib import Path

from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

BASE = "http://127.0.0.1:8000"
OUT = Path(__file__).resolve().parent / "out"
OUT.mkdir(parents=True, exist_ok=True)
PROFILE = "/tmp/chrome-cwm-profile-15"
os.makedirs(PROFILE, exist_ok=True)

DRIVER = "/Users/fenglongli/.cache/selenium/chromedriver/mac-arm64/145.0.7632.117/chromedriver"
# Prefer matching major if Chrome is newer; fall back to latest available
for p in [
    "/Users/fenglongli/.cache/selenium/chromedriver/mac-arm64/157.0.8103.78/chromedriver",
    DRIVER,
]:
    if os.path.isfile(p):
        DRIVER = p
        break


def make_driver(w=1500, h=1000, scale=2):
    o = Options()
    o.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    for a in [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        f"--force-device-scale-factor={scale}",
        f"--window-size={w},{h}",
        f"--user-data-dir={PROFILE}",
        "--remote-allow-origins=*",
    ]:
        o.add_argument(a)
    d = webdriver.Chrome(service=Service(DRIVER), options=o)
    d.set_window_size(w, h)
    return d


def hide(d, sels):
    css = "".join("%s{display:none !important;}" % s for s in sels)
    d.execute_script(
        "var s=document.createElement('style');s.textContent=arguments[0];document.head.appendChild(s);",
        css,
    )
    time.sleep(0.3)


def save_full(d, name):
    path = OUT / name
    d.save_screenshot(str(path))
    print("full", name, Image.open(path).size)
    return path


def save_el(d, sel, name, unlock=False):
    els = d.find_elements(By.CSS_SELECTOR, sel)
    if not els:
        print("MISS", sel, "->", name)
        return None
    el = els[0]
    if unlock:
        d.execute_script(
            """
          var el=arguments[0];
          el.style.maxHeight='none'; el.style.height='auto'; el.style.overflow='visible';
          el.querySelectorAll('*').forEach(function(n){
            var cs=getComputedStyle(n);
            if(cs.overflowY==='auto'||cs.overflowY==='scroll'){
              n.style.maxHeight='none'; n.style.height='auto'; n.style.overflow='visible';
            }
          });
        """,
            el,
        )
        time.sleep(0.5)
    path = OUT / name
    el.screenshot(str(path))
    print("el", name, Image.open(path).size)
    return path


def click_text(d, css, substr):
    for t in d.find_elements(By.CSS_SELECTOR, css):
        if substr in (t.text or ""):
            d.execute_script("arguments[0].click();", t)
            return True
    return False


def wait_cand(d, secs=60):
    for _ in range(secs):
        try:
            nm = d.find_element(By.CSS_SELECTOR, "#cand-name").text.strip()
        except Exception:
            nm = ""
        if nm and "等待启动" not in nm:
            print("cand", nm)
            return True
        time.sleep(1)
    return False


def main():
    d = make_driver()
    try:
        # 1 OCM panel
        d.get(BASE + "/overview_photo.html")
        time.sleep(6)
        click_text(d, ".scene-tab", "OCM")
        time.sleep(1)
        try:
            d.find_element(By.ID, "btn-play").click()
        except Exception as e:
            print("play", e)
        wait_cand(d, 70)
        time.sleep(2)
        save_el(d, "#right", "fig01_ocm_panel.png")
        save_full(d, "fig05_overview_photo_full.png")

        # 2 HCHO
        click_text(d, ".scene-tab", "HCHO")
        for _ in range(40):
            if d.find_elements(By.CSS_SELECTOR, "#hcho-tbody tr"):
                break
            time.sleep(0.5)
        time.sleep(1.5)
        save_el(d, "#right", "fig02_hcho_panel.png")

        # 3 world model modal
        click_text(d, ".scene-tab", "OCM")
        time.sleep(0.8)
        try:
            d.find_element(By.ID, "btn-worldmodel").click()
        except Exception as e:
            print("wm btn", e)
        time.sleep(5)
        save_el(d, "#panel-modal", "fig03_wm_results.png", unlock=True)
        try:
            d.find_element(By.ID, "pm-close").click()
        except Exception:
            pass

        # 4 bottom charts
        time.sleep(1)
        if d.find_elements(By.CSS_SELECTOR, "#bottom"):
            save_el(d, "#bottom", "fig04_charts.png")
        else:
            save_full(d, "fig04_charts.png")

        # 5 header / nav closeup (full page top)
        d.execute_script("window.scrollTo(0,0)")
        time.sleep(0.4)
        save_full(d, "fig06_photo_nav.png")

        # 6 index 510
        d.get(BASE + "/index.html")
        time.sleep(6)
        save_full(d, "fig07_index_510.png")

        # 7 lab
        d.get(BASE + "/lab.html")
        time.sleep(5)
        save_full(d, "fig08_lab.png")

        # 8 char
        d.get(BASE + "/char.html")
        time.sleep(5)
        save_full(d, "fig09_char.png")

        # 9 dft
        d.get(BASE + "/dft.html")
        time.sleep(5)
        save_full(d, "fig10_dft.png")

        # 10 recipe
        d.get(BASE + "/recipe.html")
        time.sleep(5)
        save_full(d, "fig11_recipe.png")

        # 11 datalog
        d.get(BASE + "/datalog.html")
        time.sleep(4)
        save_full(d, "fig12_datalog.png")

        # 12 workflow editor
        d.get(BASE + "/workflow_editor.html")
        time.sleep(5)
        save_full(d, "fig13_workflow_editor.png")

        # 13 OCM after run - cand card only if present
        d.get(BASE + "/overview_photo.html")
        time.sleep(5)
        click_text(d, ".scene-tab", "OCM")
        time.sleep(1)
        if d.find_elements(By.CSS_SELECTOR, "#cand-card"):
            save_el(d, "#cand-card", "fig14_cand_card.png")
        else:
            save_el(d, "#right", "fig14_cand_card.png")

        # 14 center 3d / scene
        if d.find_elements(By.CSS_SELECTOR, "#center"):
            save_el(d, "#center", "fig15_center_scene.png")
        else:
            save_full(d, "fig15_center_scene.png")

        # also keep aliases used by older doc
        for src, dst in [
            ("fig01_ocm_panel.png", "fig1_ocm_panel.png"),
            ("fig02_hcho_panel.png", "fig2_hcho_panel.png"),
            ("fig03_wm_results.png", "fig3_wm_results.png"),
            ("fig04_charts.png", "fig4_charts.png"),
        ]:
            a, b = OUT / src, OUT / dst
            if a.exists():
                Image.open(a).save(b)
                print("alias", dst)

    finally:
        d.quit()

    print("done", sorted(p.name for p in OUT.glob("fig*.png")))


if __name__ == "__main__":
    main()
