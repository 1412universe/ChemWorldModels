# -*- coding: utf-8 -*-
"""纯 BO 闭环：扫离散网格，列出还能推翻当前最优的实验，用来证明网格里没有更好的点。"""

import math
from pathlib import Path
import os
import re
import statistics as st
from collections import defaultdict

import numpy as np
import openpyxl

KAPPA = 1.96
CH4_RANK_MAX = 100.0
_DATA = Path(__file__).resolve().parents[2] / "data"
MASTER = str(_DATA / "OCM_master.xlsx")
GAS = str(_DATA / "gas-solid_reactions_314（每个时间段的六行代表了间隔26min的时间）.xlsx")
MAX_ROUNDS = 36
PROOF_MASS = 5
GRID_GAS_STEP = 5.0
GRID_POWER_STEP = 10.0
LOCAL_GAS = 10.0
LOCAL_POWER = 20.0


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


def _clean_sup(s):
    return re.sub(r"-\d+$", "", str(s or "").strip())


def _num(v):
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, str):
        t = v.strip()
        if t in ("室温", "NA", "ΝΑ", ""):
            return None
        try:
            return float(t)
        except ValueError:
            return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _temp_key(v):
    if isinstance(v, str) and "室" in v:
        return "室温"
    n = _num(v)
    if n is None:
        return None
    return int(round(n))


def _temp_num(v):
    if v == "室温":
        return 25.0
    n = _num(v)
    return 25.0 if n is None else n


def _flow(v):
    n = _num(v)
    if n is None:
        return None
    return round(max(0.0, n), 1)


def _light(v):
    n = _num(v)
    if n is None:
        return None
    return int(round(n))


def _load_fmt(values):
    nums = [x for x in values if isinstance(x, (int, float)) and not isinstance(x, bool)]
    if not nums:
        return "—"
    med = st.median(nums)
    if abs(med - round(med)) < 1e-6:
        return str(int(round(med)))
    return ("%.4f" % med).rstrip("0").rstrip(".")


def _load_laws(wb):
    P = {}
    for r in wb["世界模型法则"].iter_rows(min_row=2, values_only=True):
        if r[0] is None:
            continue
        try:
            P[str(r[0]).strip()] = float(r[1])
        except (TypeError, ValueError):
            P[str(r[0]).strip()] = r[1]
    return P


def _load_descriptors(wb):
    metals = {}
    for r in wb["金属描述符"].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        metals[str(r[0]).strip()] = {
            "name": str(r[1] or "").strip(),
            "en": r[3],
            "phi": _num(r[4]),
            "note": str(r[5] or "").strip(),
        }
    sup = {}
    for r in wb["载体描述符"].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        sup[str(r[0]).strip()] = {
            "formula": r[1],
            "kind": r[2],
            "eg": _num(r[4]),
            "eg_range": r[5],
            "cb": _num(r[6]),
            "vb": _num(r[7]),
            "phase": r[8],
            "absorb": r[9],
            "bet": r[11],
            "band_note": r[12],
        }
    return metals, sup


def _find_sup(table, name):
    if name in table:
        return table[name]
    low = name.lower()
    for k, v in table.items():
        base = re.sub(r"（.*?）", "", k)
        if low in k.lower() or base.lower() in low or low in base.lower():
            return v
    return None


def _physfactor(P, metals, sup_table, metal, support, mean_sel):
    pf = 1.0
    sup = _find_sup(sup_table, support)
    if sup:
        vb, cb, eg = sup.get("vb"), sup.get("cb"), sup.get("eg")
        if vb is not None and vb < P["C_E_OX"]:
            pf *= P["PHYS_FACTOR_FAIL"]
        if cb is not None and cb > P["C_E_RED"]:
            pf *= P["PHYS_FACTOR_FAIL"]
        if eg is not None and (eg < P["C_BG_PHOTON_LO"] or eg > P["C_BG_PHOTON_HI"]):
            pf *= P["PHYS_FACTOR_WARN"]
    else:
        pf *= P["PHYS_FACTOR_WARN"]
    md = metals.get(metal) or {}
    phi = md.get("phi")
    if phi is not None and phi < P["C_SCHOTTKY_PHI_LO"]:
        pf *= P["PHYS_FACTOR_WARN"]
    if mean_sel is not None and mean_sel < P["C_S_SEL_THR"]:
        pf *= P["PHYS_FACTOR_WARN"]
    pf = _clamp(pf, P["PHYS_FACTOR_LO"], P["PHYS_FACTOR_HI"])
    return pf, sup, md


def _load_eov(wb):
    if "催化剂池" not in wb.sheetnames:
        return {}
    ws = wb["催化剂池"]
    hdr = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]

    def idx(part):
        for i, h in enumerate(hdr):
            if h and part in str(h):
                return i
        return None

    im, isu, ie = idx("metal"), idx("support"), idx("eov")
    if im is None or isu is None or ie is None:
        return {}
    bag = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        ev = _num(r[ie])
        if ev is None or not r[im]:
            continue
        key = (str(r[im]).strip().lower(), str(r[isu] or "").strip().lower())
        bag.setdefault(key, []).append(ev)
    return bag


def _lookup_eov(bag, metal, support):
    ml, sl = metal.lower(), support.lower()
    vals = []
    for (m, s), vs in bag.items():
        if m == ml and s and (sl in s or s in sl):
            vals.extend(vs)
    if not vals:
        return None
    return st.median(vals)


def _txt(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s in ("None", "nan") else s


def _system_brief(g):
    m = g.get("metaldesc") or {}
    mb = []
    if m.get("name"):
        mb.append(m["name"])
    if m.get("en") is not None:
        mb.append("电负性 %s" % m["en"])
    if m.get("phi") is not None:
        mb.append("功函数 %.2f eV" % m["phi"])
    if m.get("note"):
        mb.append(m["note"])
    metal_s = "金属描述符：%s。" % ("，".join(mb) if mb else "这张表里没有这种金属")
    sup = g.get("supdesc")
    if not sup:
        return metal_s + "载体描述符没有匹配上。"
    sb = [g["support"]]
    extra = [x for x in (_txt(sup.get("formula")), _txt(sup.get("kind"))) if x]
    if extra:
        sb[0] += "（%s）" % "，".join(extra)
    if sup.get("eg") is not None:
        er = _txt(sup.get("eg_range"))
        sb.append("带隙 %.2f eV%s" % (sup["eg"], ("，文献范围 %s" % er) if er else ""))
    if sup.get("cb") is not None:
        sb.append("导带 %.2f V" % sup["cb"])
    if sup.get("vb") is not None:
        sb.append("价带 %.2f V" % sup["vb"])
    if _txt(sup.get("phase")):
        sb.append("晶相 %s" % _txt(sup.get("phase")))
    if _txt(sup.get("absorb")):
        sb.append("光吸收 %s" % _txt(sup.get("absorb")))
    if _txt(sup.get("bet")):
        sb.append("BET %s m²/g" % _txt(sup.get("bet")))
    if _txt(sup.get("band_note")):
        sb.append(_txt(sup.get("band_note")))
    return metal_s + "载体描述符：%s。" % "；".join(sb)


def _flow_way(base, cond):
    if not base["ch4"] or not cond["ch4"]:
        return "", None
    rb = base["o2"] / base["ch4"]
    rc = cond["o2"] / cond["ch4"]
    if rc > rb + 1e-9:
        return "O2/CH4 流量比从 %.4f 升到 %.4f，氧气相对甲烷变多" % (rb, rc), rc > rb
    if rc < rb - 1e-9:
        return "O2/CH4 流量比从 %.4f 降到 %.4f，往少氧收" % (rb, rc), False
    return "O2/CH4 流量比基本没变", None


def _knob_reason(g, base, cond):
    parts = []
    sup = g.get("supdesc") or {}
    note = (g.get("metaldesc") or {}).get("note") or ""
    vb, cb, eg = sup.get("vb"), sup.get("cb"), sup.get("eg")
    absorb = _txt(sup.get("absorb"))
    hotter = cond["T"] != "室温" and (base["T"] == "室温" or _temp_num(cond["T"]) > _temp_num(base["T"]))
    if cond["T"] != base["T"]:
        if absorb:
            light = "载体光吸收记为%s，温度不改这条吸收边。" % absorb
        else:
            light = "载体描述符没有写光吸收范围。"
        if hotter:
            parts.append("温度 %s→%s。%s只在光子条件上加一点热。" % (
                _show_t(base["T"]), _show_t(cond["T"]), light))
        else:
            parts.append("温度收到 %s。%s" % (_show_t(cond["T"]), light))
    if cond["ch4"] != base["ch4"] or cond["o2"] != base["o2"]:
        moved = _change_text(base, {
            **base, "ch4": cond["ch4"], "o2": cond["o2"],
            "T": base["T"], "ar": base["ar"], "lpd": base["lpd"],
        })
        way, richer = _flow_way(base, cond)
        chem = []
        if vb is not None and richer is True:
            chem.append("价带 %.2f V，氧化端已经偏强，再加氧会把氧化推得更重" % vb)
        elif vb is not None and richer is False:
            chem.append("价带 %.2f V，氧化端已经偏强，把氧收回去是在减轻过度氧化" % vb)
        if cb is not None and richer is True:
            chem.append("导带 %.2f V，还原端不强，多出来的氧主要加在氧化一侧" % cb)
        if "温和" in note and ("O2" in note or "氧" in note):
            chem.append("金属备注写的是温和活化氧，%s" % ("少给氧和这条一致" if richer is False else "加氧要收着"))
        if "过氧化" in note and richer is False:
            chem.append("金属备注写了强过氧化倾向，少氧是在压这条倾向")
        sentence = "相对最高产条件，%s，%s。" % (moved, way)
        if chem:
            sentence += "".join(s if s.endswith("。") else s + "。" for s in chem)
        parts.append(sentence)
    if cond["ar"] != base["ar"]:
        bet = _txt(sup.get("bet"))
        surface = "载体 BET 记为 %s m²/g，" % bet if bet else ""
        if cond["ar"] > base["ar"]:
            parts.append("Ar %.1f→%.1f。%s稀释后甲烷和氧气分压下降。" % (base["ar"], cond["ar"], surface))
        else:
            parts.append("Ar %.1f→%.1f。%s少稀释，反应物分压升高。" % (base["ar"], cond["ar"], surface))
    if cond["lpd"] != base["lpd"]:
        gap = []
        if eg is not None:
            gap.append("带隙 %.2f eV" % eg)
        if absorb:
            gap.append("光吸收 %s" % absorb)
        gap_s = "，".join(gap) if gap else "载体描述符没有写带隙和吸收范围"
        if cond["lpd"] > base["lpd"]:
            line = "光强 %d→%d。%s，加光不改吸收边，只是在这条吸收里多给光子。" % (
                base["lpd"], cond["lpd"], gap_s)
            if vb is not None:
                line += "价带 %.2f V 已经偏正，光子再多，氧化端更容易过头。" % vb
        else:
            line = "光强 %d→%d。%s，把光收回来，少给这条价带送光子。" % (
                base["lpd"], cond["lpd"], gap_s)
            if vb is not None:
                line += "价带是 %.2f V。" % vb
        parts.append(line)
    if not parts:
        parts.append("条件相对最高产点有调整。")
    return "".join(s if s.endswith("。") else s + "。" for s in parts)


def _key(metal, support, cond, load=None):
    """同一套气体、光强、温度下，不同负载、不同进料氧浓度各自保留。"""
    oi = cond.get("o2_in")
    oi_k = None if oi is None else round(float(oi), 3)
    return (
        metal, support, cond["T"], cond["ch4"], cond["o2"], cond["ar"], cond["lpd"],
        _load_num(load), oi_k,
    )


def _cond_from_row(r, ix):
    T = _temp_key(r[ix["T"]])
    ch4 = _flow(r[ix["ch4"]])
    o2 = _flow(r[ix["o2"]])
    ar = _flow(r[ix["ar"]])
    lpd = _light(r[ix["lpd"]])
    if T is None or ch4 is None or o2 is None:
        return None
    if ar is None:
        ar = 0.0
    return {"T": T, "ch4": ch4, "o2": o2, "ar": ar, "lpd": lpd}


def _vec(cond):
    return (
        _temp_num(cond["T"]) / 100.0,
        cond["ch4"] / 50.0,
        cond["o2"] / 10.0,
        cond["ar"] / 20.0,
        (cond.get("lpd") or 0) / 100.0,
    )


def _dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(_vec(a), _vec(b))) / 5.0)


def _predict_field(obs, cond, field, n_sim):
    """只跟最近几条有这项实测的实验走。"""
    pairs = [(ob["cond"], ob[field]) for ob in obs if ob.get(field) is not None]
    if not pairs:
        return None, None
    near = sorted((_dist(old, cond), v) for old, v in pairs)[:5]
    weights = [1.0 / (d + 0.015) for d, _ in near]
    vals = [v for _, v in near]
    hat = sum(w * v for w, v in zip(weights, vals)) / sum(weights)
    sigma = st.pstdev(vals) if len(vals) >= 2 else abs(hat) * 0.08
    # 没测过的点必须留出探索空间。离实测越远，不确定度越大，采集分才有机会盖过已知最高。
    se = sigma * (1.0 + 2.0 * near[0][0]) / math.sqrt(len(vals))
    ucb = hat + KAPPA * se
    return max(0.0, hat), max(0.0, ucb)


def _load_retention(path=GAS):
    """满 6 行、间隔 26 分钟，共 130 分钟。保持率 = 最后一点 / 这组最高产率。"""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    by_load = defaultdict(list)
    by_flow = defaultdict(list)
    allz = []
    for name in ("0.05%Pd", "3%Pd"):
        ws = wb[name]
        hdr = [str(h) if h else "" for h in next(ws.iter_rows(max_row=1, values_only=True))]
        ix = {h: i for i, h in enumerate(hdr) if h}
        group = []

        def flush(group):
            if len(group) != 6:
                return
            head = group[0]
            parsed = re.match(r"([\d.]+)%([A-Za-z][A-Za-z0-9]*)-(.+)$", str(head[ix["cat"]] or "").strip())
            if not parsed:
                return
            ys = []
            for row in group:
                y = _num(row[ix["p_C2+"]])
                if y is None:
                    return
                ys.append(y)
            peak = max(ys)
            if peak <= 0:
                return
            z = ys[-1] / peak
            load = round(float(parsed.group(1)), 2)
            metal, support = parsed.group(2), _clean_sup(parsed.group(3))
            cond = (
                round(float(head[ix["flow_CH4"]]), 1),
                round(float(head[ix["flow_O2"]]), 1),
                round(float(head[ix["flow_Ar"]]), 1),
                int(round(float(head[ix["lpd"]] if "lpd" in ix else head[ix["light_intensity"]]))),
            )
            by_load[(metal, support, load) + cond].append(z)
            by_flow[(metal, support) + cond].append(z)
            allz.append(z)

        for row in ws.iter_rows(min_row=3, values_only=True):
            if row[ix["index"]] == 1 and group:
                flush(group)
                group = []
            group.append(row)
        flush(group)
    med = lambda xs: st.median(xs)
    return {k: med(v) for k, v in by_load.items()}, {k: med(v) for k, v in by_flow.items()}, allz


def _rankable(cond):
    """产率 UCB 排名只收 CH4≤100。CH4>100 仍留在预测用的实测里。"""
    ch4 = cond.get("ch4") if isinstance(cond, dict) else None
    return ch4 is not None and ch4 <= CH4_RANK_MAX


def _objective(y, sel, z):
    """综合得分 = 产率 × 选择性/80 × 保持率/90。选择性、保持率都按百分数来除。"""
    if y is None or sel is None or z is None:
        return None
    y, sel, z = float(y), float(sel), float(z)
    if y <= 0 or sel <= 0 or z <= 0:
        return None
    # 主表里的保持率是 0–1 的比值。按百分数参加公式时先乘 100，再除以 90。
    return y * (sel / 80.0) * ((z * 100.0) / 90.0)


def _lookup_z(ret_load, ret_flow, metal, support, load, cond):
    if cond.get("lpd") is None:
        return None
    flow = (round(cond["ch4"], 1), round(cond["o2"], 1), round(cond["ar"], 1), int(cond["lpd"]))
    ld = _num(load)
    if ld is not None:
        hit = ret_load.get((metal, support, round(ld, 2)) + flow)
        if hit is not None:
            return hit
    return ret_flow.get((metal, support) + flow)


def _neighbors(base):
    out = []
    T = base["T"]
    if T == "室温":
        out.append(dict(base, T=40))
    else:
        out.append(dict(base, T=int(T) + 10))
        if int(T) - 10 >= 25:
            out.append(dict(base, T=int(T) - 10))
        out.append(dict(base, T="室温"))
    for step in (5.0, -5.0):
        ch4 = round(max(0.1, base["ch4"] + step), 1)
        if ch4 != base["ch4"]:
            out.append(dict(base, ch4=ch4))
    for step in (1.0, -0.5):
        o2 = round(max(0.0, base["o2"] + step), 1)
        if o2 != base["o2"]:
            out.append(dict(base, o2=o2))
    ar = round(base["ar"] + 5.0, 1)
    out.append(dict(base, ar=ar))
    if base["lpd"] >= 50:
        out.append(dict(base, lpd=int(base["lpd"]) - 50))
    out.append(dict(base, lpd=int(base["lpd"]) + 50))
    # 同时动光强和氧气，避免只有单因素邻居
    out.append(dict(base, o2=round(base["o2"] + 1.0, 1), lpd=int(base["lpd"]) + 50))
    return out


def _change_text(base, cond):
    bits = []
    if cond["T"] != base["T"]:
        bits.append("温度 %s→%s" % (_show_t(base["T"]), _show_t(cond["T"])))
    if cond["ch4"] != base["ch4"]:
        bits.append("CH4 %.1f→%.1f" % (base["ch4"], cond["ch4"]))
    if cond["o2"] != base["o2"]:
        bits.append("O2 %.1f→%.1f" % (base["o2"], cond["o2"]))
    if cond["ar"] != base["ar"]:
        bits.append("Ar %.1f→%.1f" % (base["ar"], cond["ar"]))
    if cond["lpd"] != base["lpd"]:
        bits.append("光强 %d→%d" % (base["lpd"], cond["lpd"]))
    return "，".join(bits) if bits else "条件有调整"


def _show_t(v):
    return "室温" if v == "室温" else "%d℃" % int(v)


def _recipe_text(cond):
    light = "光强未记" if cond.get("lpd") is None else "光强 %d" % int(cond["lpd"])
    return "%s · CH4 %.1f · O2 %.1f · Ar %.1f · %s" % (
        _show_t(cond["T"]), cond["ch4"], cond["o2"], cond["ar"], light,
    )


def _clip_flow(v):
    return round(_clamp(float(v), 0.0, 100.0), 1)


def _is_pd_p25(metal, support):
    return str(metal or "").strip().lower() == "pd" and "p25" in str(support or "").lower()


def _load_num(v):
    n = _num(v)
    if n is None or n <= 0:
        return None
    return round(n, 3)


def _spread_masses(n=8):
    """主表没有催化剂质量。8 套在 1–20 mg 里取不同整数。"""
    if n <= 1:
        return [10]
    out = []
    for i in range(n):
        out.append(int(round(1 + i * 19 / (n - 1))))
    for i in range(1, len(out)):
        if out[i] <= out[i - 1]:
            out[i] = min(20, out[i - 1] + 1)
    return out


def _obs_power(cond, ref):
    """历史光强是 mW/cm²。相对光功率 = 该点光强 / Pd-P25 最大光强，保留连续值。"""
    lpd = cond.get("lpd")
    if lpd is None or ref is None or ref <= 0:
        return None
    return _clamp(100.0 * float(lpd) / float(ref), 0.0, 100.0)


def _power_text(power):
    return "—" if power is None else "%d%%" % int(round(float(power)))


def _same_power(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) < 0.51


def _one_pct_inlet(ob):
    """推荐锚点只用进料氧浓度 1% 的记录。0.5% 和 20% 仍留在预测里。"""
    oi = ob["cond"].get("o2_in")
    if oi is None:
        oi = ob.get("o2_in")
    return oi is not None and abs(float(oi) - 1.0) <= 0.05


def _dist_pd(load_a, cond_a, load_b, cond_b):
    dims = [
        (math.log10(load_a) - math.log10(load_b)) ** 2,
        ((cond_a["ch4"] - cond_b["ch4"]) / 100.0) ** 2,
        ((cond_a["o2"] - cond_b["o2"]) / 100.0) ** 2,
        ((cond_a["ar"] - cond_b["ar"]) / 100.0) ** 2,
    ]
    pa, pb = cond_a.get("power"), cond_b.get("power")
    if pa is not None and pb is not None:
        dims.append(((float(pa) - float(pb)) / 100.0) ** 2)
    oa, ob_in = cond_a.get("o2_in"), cond_b.get("o2_in")
    if oa is not None and ob_in is not None:
        dims.append((float(oa) - float(ob_in)) ** 2)
    return math.sqrt(sum(dims) / len(dims))


def _light_gap(cond, old):
    """光功率打成平局时按光强差再排，不跟主表行序。"""
    la, lb = cond.get("lpd"), old.get("lpd")
    if la is None or lb is None:
        return 0.0
    pa, pb = cond.get("power"), old.get("power")
    if pa is not None and pb is not None and not _same_power(pa, pb):
        return 0.0
    return abs(float(la) - float(lb))


def _same_measured_cond(load_a, cond_a, load_b, cond_b):
    """负载、气体、相对光功率、进料氧浓度一致，就视为同一条实测。"""
    if _load_num(load_a) != _load_num(load_b):
        return False
    for k in ("ch4", "o2", "ar"):
        if round(float(cond_a[k]), 1) != round(float(cond_b[k]), 1):
            return False
    if not _same_power(cond_a.get("power"), cond_b.get("power")):
        return False
    oa, ob_in = cond_a.get("o2_in"), cond_b.get("o2_in")
    if oa is not None and ob_in is not None and abs(float(oa) - float(ob_in)) > 0.05:
        return False
    return True


def _exact_field(obs, load, cond, field):
    """条件和某条实测完全一致时，预测就用这条实测，不再和附近点平均。"""
    hit = None
    for ob in obs:
        if ob.get(field) is None:
            continue
        ld = _load_num(ob.get("load"))
        if ld is None or not _same_measured_cond(load, cond, ld, ob["cond"]):
            continue
        if hit is None or (ob.get("y") or -1) > (hit.get("y") or -1):
            hit = ob
    if hit is None:
        return None
    v = max(0.0, float(hit[field]))
    return v, v


def _predict_pd(obs, load, cond, field):
    exact = _exact_field(obs, load, cond, field)
    if exact is not None:
        return exact
    pairs = []
    for ob in obs:
        if ob.get(field) is None:
            continue
        ld = _load_num(ob.get("load"))
        if ld is None:
            continue
        pairs.append((ob["cond"], ld, ob[field]))
    if not pairs:
        return None, None
    near = sorted(
        (_dist_pd(load, cond, ld, old), _light_gap(cond, old), v)
        for old, ld, v in pairs
    )[:5]
    weights = [1.0 / (d + 0.001) for d, _, _ in near]
    vals = [v for _, _, v in near]
    hat = sum(w * v for w, v in zip(weights, vals)) / sum(weights)
    sigma = st.pstdev(vals) if len(vals) >= 2 else abs(hat) * 0.08
    se = sigma * (1.0 + 2.0 * near[0][0]) / math.sqrt(len(vals))
    ucb = hat + KAPPA * se
    return max(0.0, hat), max(0.0, ucb)


def _flow_candidates(anchor, power):
    base = {
        "T": anchor["T"],
        "ch4": _clip_flow(anchor["ch4"]),
        "o2": _clip_flow(anchor["o2"]),
        "ar": _clip_flow(anchor["ar"]),
        "lpd": anchor.get("lpd"),
        "power": power,
        "o2_in": 1.0,
    }
    out = [dict(base)]
    for step in (10.0, -10.0, 20.0, -20.0):
        out.append(dict(base, ch4=_clip_flow(base["ch4"] + step)))
        out.append(dict(base, o2=_clip_flow(base["o2"] + step)))
        out.append(dict(base, ar=_clip_flow(base["ar"] + step)))
    powers = (20, 40, 60, 80, 100) if power is None else (
        int(round(_clamp(power + step, 0, 100))) for step in (0, 20, -20, 40, -40)
    )
    for p in powers:
        if power is not None and int(round(float(p))) == int(round(float(power))):
            continue
        step = dict(base, power=int(p))
        if power is None or not _same_power(p, power):
            step["lpd"] = None
        out.append(step)
    uniq = []
    seen = set()
    for cond in out:
        if not _rankable(cond):
            continue
        key = (cond["ch4"], cond["o2"], cond["ar"], cond.get("power"))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(cond)
    return uniq


def _cond_moved(a, b):
    if abs(a["ch4"] - b["ch4"]) >= 5 or abs(a["o2"] - b["o2"]) >= 5 or abs(a["ar"] - b["ar"]) >= 5:
        return True
    pa, pb = a.get("power"), b.get("power")
    return pa is not None and pb is not None and abs(pa - pb) >= 10


def _pd_recipe(load, cond):
    power = cond.get("power")
    power_s = _power_text(power)
    mass = cond.get("mass")
    mass_s = "—" if mass is None else "%d mg" % int(mass)
    return "%s%%Pd-P25 · 甲烷 %.1f · 1%%氧气 %.1f · 氩气 %.1f · 质量 %s · 相对光功率 %s" % (
        _load_fmt([load]), cond["ch4"], cond["o2"], cond["ar"], mass_s, power_s,
    )


def _fmt_z(z):
    return "无气固序列" if z is None else "%.2f" % z


def _metric_text(y, sel, z, score, how, y_hi=None, s_hi=None, z_hi=None, measured=False):
    sel_s = "—" if sel is None else "%.1f" % sel
    if measured:
        return "主表实测产率 %.0f，选择性 %s%%，130分钟保持率 %s。产率采集分 %.2f，%s。" % (
            y, sel_s, _fmt_z(z), score, how,
        )
    gate = ""
    if y_hi is not None and s_hi is not None and z_hi is not None and y_hi > y + 1:
        gate = "UCB上界产率 %.0f、选择性 %.1f%%、保持率 %.2f。" % (y_hi, s_hi, z_hi)
    return "%s预测均值产率 %.0f，选择性 %s%%，130分钟保持率 %s。产率 UCB %.2f，%s。" % (
        gate, y, sel_s, _fmt_z(z), score, how,
    )


def _pack_row(g, cond_or_ob, y, sel, z, score, floor, how, kind, rnd, knob="", bounds=None, measured=False, o2_in=None, o2_out=None, c2h4=None, c2h6=None, co2=None):
    cond = cond_or_ob["cond"] if isinstance(cond_or_ob, dict) and "cond" in cond_or_ob and "y" in cond_or_ob else cond_or_ob
    bounds = bounds or {}
    text = _metric_text(
        y, sel, z, score, how, bounds.get("y"), bounds.get("sel"), bounds.get("z"), measured,
    )
    if knob:
        text = knob + text
    show_y = bounds["y"] if bounds.get("y") is not None else y
    show_sel = bounds["sel"] if bounds.get("sel") is not None else sel
    show_z = bounds["z"] if bounds.get("z") is not None else z
    return {
        "metal": g["metal"],
        "support": g["support"],
        "loading": _load_fmt(g["loads"]),
        "recipe": _recipe_text(cond),
        "T": cond["T"] if cond["T"] == "室温" else int(cond["T"]),
        "ch4": cond["ch4"],
        "o2": cond["o2"],
        "ar": cond["ar"],
        "lpd": cond["lpd"],
        "o2_in": None if o2_in is None else round(o2_in, 3),
        "o2_out": None if o2_out is None else round(o2_out, 1),
        "c2h4": None if c2h4 is None else round(c2h4, 1),
        "c2h6": None if c2h6 is None else round(c2h6, 1),
        "co2": None if co2 is None else round(co2, 1),
        "y": round(show_y, 1),
        "sel": round(show_sel, 1) if show_sel is not None else None,
        "z": None if show_z is None else round(show_z, 3),
        "y_hat": round(y, 1),
        "score": round(score, 3),
        "floor": round(floor, 3),
        "how": how,
        "ucb": round(score, 3),
        "kind": kind,
        "brief": _system_brief(g),
        "knob": text,
        "round": rnd,
    }


def _drop_blank_light_copies(obs):
    """光强空着、但和一条有光强记录的产率重复时，不拿来当近邻。"""
    lighted, dark = [], []
    for ob in obs:
        if _load_num(ob.get("load")) is None:
            continue
        if ob["cond"].get("power") is None:
            dark.append(ob)
        else:
            lighted.append(ob)

    def sig(ob):
        c = ob["cond"]
        oi = c.get("o2_in")
        return (
            round(_load_num(ob["load"]), 3),
            round(float(c["ch4"]), 1), round(float(c["o2"]), 1), round(float(c["ar"]), 1),
            round(float(oi) if oi is not None else -1, 2),
            round(float(ob["y"]), 0),
        )

    lit = {sig(ob) for ob in lighted}
    return lighted + [ob for ob in dark if sig(ob) not in lit]


def _grid_arrays(obs, target="y"):
    load = np.array([_load_num(ob["load"]) for ob in obs], float)
    power = np.array([ob["cond"]["power"] if ob["cond"].get("power") is not None else np.nan for ob in obs], float)
    inlet = np.array([ob["cond"]["o2_in"] if ob["cond"].get("o2_in") is not None else np.nan for ob in obs], float)
    has_p = np.isfinite(power)
    has_i = np.isfinite(inlet)
    return {
        "load": load,
        "log": np.log10(load),
        "ch4": np.array([ob["cond"]["ch4"] for ob in obs], float),
        "o2": np.array([ob["cond"]["o2"] for ob in obs], float),
        "ar": np.array([ob["cond"]["ar"] for ob in obs], float),
        "power": power,
        "inlet": inlet,
        "y": np.array([ob[target] for ob in obs], float),
        "has_p": has_p,
        "has_i": has_i,
        "nd": 4.0 + has_p.astype(float) + has_i.astype(float),
    }


def _grid_predict(arr, q_load, Q):
    """Q 列是甲烷、氧气、氩气、相对光功率。进料氧按 1% 比较。"""
    n = len(arr["y"])
    b = len(Q)
    dsum = (
        (math.log10(q_load) - arr["log"])[None, :] ** 2
        + ((Q[:, 0:1] - arr["ch4"][None, :]) / 100.0) ** 2
        + ((Q[:, 1:2] - arr["o2"][None, :]) / 100.0) ** 2
        + ((Q[:, 2:3] - arr["ar"][None, :]) / 100.0) ** 2
    )
    if arr["has_p"].any():
        dp = np.zeros((b, n))
        dp[:, arr["has_p"]] = ((Q[:, 3:4] - arr["power"][arr["has_p"]][None, :]) / 100.0) ** 2
        dsum = dsum + dp
    q_in = Q[:, 4:5] if Q.shape[1] > 4 else np.ones((b, 1))
    if arr["has_i"].any():
        di = np.zeros((b, n))
        di[:, arr["has_i"]] = ((q_in - arr["inlet"][arr["has_i"]][None, :]) / 20.0) ** 2
        dsum = dsum + di
    dist = np.sqrt(dsum / arr["nd"][None, :])
    exact = np.zeros(b, dtype=bool)
    exact_y = np.zeros(b)
    qin = q_in[:, 0]
    for j in np.where(np.abs(arr["load"] - q_load) < 1e-6)[0]:
        if not arr["has_i"][j] or not arr["has_p"][j]:
            continue
        hit = (
            (np.abs(Q[:, 0] - arr["ch4"][j]) < 0.05)
            & (np.abs(Q[:, 1] - arr["o2"][j]) < 0.05)
            & (np.abs(Q[:, 2] - arr["ar"][j]) < 0.05)
            & (np.abs(Q[:, 3] - arr["power"][j]) < 0.51)
            & (np.abs(qin - arr["inlet"][j]) <= 0.05)
        )
        if hit.any():
            exact[hit] = True
            exact_y[hit] = np.maximum(exact_y[hit], arr["y"][j])
    k = min(5, n)
    part = np.argpartition(dist, k - 1, axis=1)[:, :k]
    rows = np.arange(b)[:, None]
    d5 = dist[rows, part]
    y5 = arr["y"][part]
    order = np.argsort(d5, axis=1)
    d5 = np.take_along_axis(d5, order, 1)
    y5 = np.take_along_axis(y5, order, 1)
    w = 1.0 / (d5 + 0.001)
    hat = (w * y5).sum(1) / w.sum(1)
    mu = y5.mean(1)
    sigma = np.sqrt(((y5 - mu[:, None]) ** 2).mean(1))
    sigma = np.where(sigma == 0, np.abs(hat) * 0.08, sigma)
    se = sigma / math.sqrt(float(k))
    ucb = np.maximum(0.0, hat + KAPPA * se)
    hat = np.where(exact, exact_y, np.maximum(0.0, hat))
    ucb = np.where(exact, exact_y, ucb)
    se = np.where(exact, 0.0, se)
    return hat, ucb, exact, se


def _select_pd_p25(g, y_max):
    """最优负载加最近三档。每档一条实测，一条只在周围两步里按期望改进挑。"""
    obs = list(g["obs"])
    ref = max(
        (float(ob["cond"]["lpd"]) for ob in obs if isinstance(ob["cond"].get("lpd"), (int, float)) and ob["cond"]["lpd"] > 0),
        default=None,
    )
    for ob in obs:
        power = _obs_power(ob["cond"], ref)
        if power is not None:
            ob["cond"]["power"] = power
        if ob.get("o2_in") is not None and ob["cond"].get("o2_in") is None:
            ob["cond"]["o2_in"] = ob["o2_in"]
    train = _drop_blank_light_copies(obs)
    lighted = [
        ob for ob in train
        if ob["cond"].get("power") is not None and _load_num(ob.get("load")) is not None
        and _rankable(ob["cond"]) and _one_pct_inlet(ob)
    ]
    if not lighted:
        return [], [], {}, "主表里没有甲烷不超过 100、进料氧 1%、带光强的 Pd-P25，定不出约束内的产率最优。"
    def _pass(ob):
        sel, z = ob.get("sel"), ob.get("z")
        return sel is not None and z is not None and float(sel) > 84.0 and float(z) > 0.95

    feasible = [ob for ob in lighted if _pass(ob)]
    if not feasible:
        return [], [], {}, "约束内没有选择性大于 84 且保持率大于 95% 的 Pd-P25，定不出产率最优。"
    inc = max(feasible, key=lambda ob: ob["y"])
    inc_load = _load_num(inc["load"])
    inc_ch4, inc_o2, inc_ar = float(inc["cond"]["ch4"]), float(inc["cond"]["o2"]), float(inc["cond"]["ar"])
    inc_power = float(inc["cond"]["power"])
    inc_in = inc["cond"].get("o2_in")
    if inc_in is None:
        inc_in = inc.get("o2_in")
    ystar = float(inc["y"])

    def _arr_for(field):
        rows = [ob for ob in train if _load_num(ob.get("load")) is not None and ob.get(field) is not None]
        return _grid_arrays(rows, target=field) if rows else None

    arr_y, arr_s, arr_z = _arr_for("y"), _arr_for("sel"), _arr_for("z")
    if arr_y is None or arr_s is None or arr_z is None:
        return [], [], {}, "产率、选择性或保持率的实测不够，采集分算不出来。"
    all_loads = sorted({
        round(_load_num(ob["load"]), 3)
        for ob in train
        if _load_num(ob.get("load")) is not None
    })
    others = sorted((ld for ld in all_loads if abs(ld - inc_load) > 1e-9), key=lambda ld: abs(math.log10(ld) - math.log10(inc_load)))
    chosen = [inc_load] + others[:3]

    def _axis(v, step, lo, hi):
        out = []
        for k in (-2, -1, 0, 1, 2):
            x = min(hi, max(lo, float(v) + k * step))
            out.append(round(x, 1))
        return sorted(set(out))

    def _near_grid(ch4, o2, ar, power):
        cs = _axis(ch4, GRID_GAS_STEP, 0.0, CH4_RANK_MAX)
        os_ = _axis(o2, GRID_GAS_STEP, 0.0, 100.0)
        as_ = _axis(ar, GRID_GAS_STEP, 0.0, 100.0)
        ps = _axis(power, GRID_POWER_STEP, 0.0, 100.0)
        rows = [(c, o, a, p) for c in cs for o in os_ for a in as_ for p in ps]
        return np.array(rows, float) if rows else np.zeros((0, 4))

    def _ei(hat, se):
        se = np.maximum(se, 0.0)
        ei = np.zeros_like(hat)
        ok = se > 1e-6
        z = np.zeros_like(hat)
        z[ok] = (hat[ok] - ystar) / se[ok]
        phi = np.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
        Phi = 0.5 * (1.0 + np.vectorize(math.erf)(z / math.sqrt(2.0)))
        ei[ok] = se[ok] * (z[ok] * Phi[ok] + phi[ok])
        ei[~ok] = np.maximum(0.0, hat[~ok] - ystar)
        return np.maximum(ei, 0.0)

    def _same_pt(a, b):
        return (
            abs(a[0] - b[0]) < 0.05 and abs(a[1] - b[1]) < 0.05
            and abs(a[2] - b[2]) < 0.05 and abs(a[3] - b[3]) < 0.51
        )
    proof = {
        "sstar": round(ystar, 1),
        "ystar": round(float(inc["y"]), 1),
        "selstar": None if inc.get("sel") is None else round(float(inc["sel"]), 1),
        "zstar": None if inc.get("z") is None else round(float(inc["z"]), 3),
        "load": _load_fmt([inc_load]),
        "ch4": inc_ch4,
        "o2": inc_o2,
        "ar": inc_ar,
        "o2_in": None if inc_in is None else round(float(inc_in), 1),
        "power": int(round(inc_power)),
        "mass": PROOF_MASS,
        "n_cells": 0,
        "n_above": 0,
        "n_open": 0,
        "loads": [_load_fmt([ld]) for ld in chosen],
        "near": len(chosen),
        "far": 0,
        "certified": [],
    }

    def side(load, ch4, o2, ar, power, inlet):
        cond = {
            "T": inc["cond"]["T"], "ch4": ch4, "o2": o2, "ar": ar,
            "lpd": None, "power": power, "o2_in": inlet, "mass": PROOF_MASS,
        }
        out = {}
        for field in ("y", "sel", "z", "o2_out", "c2h4", "c2h6", "co2"):
            pred, _ = _predict_pd(train, load, cond, field)
            if field == "z" and pred is not None:
                pred = min(pred, 1.0)
            out[field] = pred
        return cond, out

    def measured_at(load, ch4, o2, ar, power):
        hit = None
        for ob in train:
            ld = _load_num(ob.get("load"))
            if ld is None or abs(ld - load) > 1e-6:
                continue
            c = ob["cond"]
            if abs(float(c["ch4"]) - ch4) > 0.05 or abs(float(c["o2"]) - o2) > 0.05 or abs(float(c["ar"]) - ar) > 0.05:
                continue
            if not _same_power(c.get("power"), power):
                continue
            oi = c.get("o2_in", ob.get("o2_in"))
            if oi is None or abs(float(oi) - 1.0) > 0.05:
                continue
            if hit is None or (ob.get("score") or -1) > (hit.get("score") or -1):
                hit = ob
        return hit

    def _gt(hat, se, thr):
        se = np.maximum(se, 0.0)
        p = np.empty_like(hat)
        ok = se > 1e-6
        zz = np.zeros_like(hat)
        zz[ok] = (hat[ok] - thr) / se[ok]
        p[ok] = 0.5 * (1.0 + np.vectorize(math.erf)(zz[ok] / math.sqrt(2.0)))
        p[~ok] = np.where(hat[~ok] > thr, 1.0, 0.0)
        return np.clip(p, 0.0, 1.0)

    def best_on_load(load):
        pool = [ob for ob in feasible if abs(_load_num(ob["load"]) - load) < 1e-6]
        return max(pool, key=lambda ob: ob["y"]) if pool else None

    def neighbor(load, anchor):
        Q = _near_grid(*anchor)
        if len(Q) == 0:
            return None
        Qin = np.concatenate([Q, np.ones((len(Q), 1))], axis=1)
        yhat, yucb, exact, yse = _grid_predict(arr_y, load, Qin)
        shat, _, _, sse = _grid_predict(arr_s, load, Qin)
        zhat, _, _, zse = _grid_predict(arr_z, load, Qin)
        zhat = np.minimum(zhat, 1.0)
        ei = _ei(yhat, yse)
        ps, pz = _gt(shat, sse, 84.0), _gt(zhat, zse, 0.95)
        acq = ei * ps * pz
        anchor_m = np.array([_same_pt(tuple(Q[i]), anchor) for i in range(len(Q))])
        fresh = ~anchor_m
        if not fresh.any():
            return None
        order = np.lexsort((yhat, yucb, np.where(fresh, acq, -np.inf)))
        i = int(order[-1])
        return {
            "ch4": float(Q[i, 0]), "o2": float(Q[i, 1]), "ar": float(Q[i, 2]), "power": float(Q[i, 3]),
            "hat": float(yhat[i]), "ucb": float(yucb[i]), "ei": float(ei[i]), "acq": float(acq[i]),
            "sel": float(shat[i]), "z": float(zhat[i]), "ps": float(ps[i]), "pz": float(pz[i]),
            "exact": bool(exact[i]),
            "close": bool(yucb[i] > ystar + 1e-6 and ps[i] >= 0.5 and pz[i] >= 0.5),
        }

    slots = []
    n_local = 0
    for load in chosen:
        hit = best_on_load(load)
        if hit is not None:
            anchor = (float(hit["cond"]["ch4"]), float(hit["cond"]["o2"]), float(hit["cond"]["ar"]), float(hit["cond"]["power"]))
            slots.append((load, "旧配方", anchor, hit, None))
        else:
            anchor = (inc_ch4, inc_o2, inc_ar, inc_power)
            slots.append((load, "转移", anchor, None, None))
        nb = neighbor(load, anchor)
        n_local += 1
        if nb is not None:
            slots.append((load, "附近", (nb["ch4"], nb["o2"], nb["ar"], nb["power"]), None, nb))
    proof["n_cells"] = int(n_local * (5 ** 4))
    proof["n_open"] = sum(1 for _ld, src, _a, _h, nb in slots if src == "附近" and nb and nb["close"])
    proof["n_above"] = proof["n_open"]

    top, trace = [], []
    for rank, (load, src, anchor, hit, nb) in enumerate(slots, 1):
        ch4, o2, ar, power = anchor
        cond, extra = side(load, ch4, o2, ar, power, 1.0)
        if src == "旧配方" and hit is not None:
            y, sel, z = hit["y"], hit.get("sel"), hit.get("z")
            score, ucb = hit["y"], hit["y"]
            reason = "该负载上，选择性大于 84 且保持率大于 95% 里产率最高的实测。" if abs(load - inc_load) > 1e-6 else "当前最优实测。选择性大于 84，保持率大于 95%，产率最高。"
            o2_out, c2h4, c2h6, co2 = hit.get("o2_out"), hit.get("c2h4"), hit.get("c2h6"), hit.get("co2")
            measured = True
        elif src == "转移":
            pred_y = _grid_predict(arr_y, load, np.array([[ch4, o2, ar, power, 1.0]]))
            pred_s = _grid_predict(arr_s, load, np.array([[ch4, o2, ar, power, 1.0]]))
            pred_z = _grid_predict(arr_z, load, np.array([[ch4, o2, ar, power, 1.0]]))
            y, sel, z = float(pred_y[0][0]), float(pred_s[0][0]), min(1.0, float(pred_z[0][0]))
            score, ucb = y, float(pred_y[1][0])
            reason = "这个负载没有选择性大于 84 且保持率大于 95% 的实测，条件从当前最优移过来。数字是这里的预测。"
            o2_out, c2h4, c2h6, co2 = extra.get("o2_out"), extra.get("c2h4"), extra.get("c2h6"), extra.get("co2")
            measured = False
        else:
            y, sel, z = nb["hat"], nb["sel"], nb["z"]
            score, ucb = nb["acq"], nb["ucb"]
            o2_out, c2h4, c2h6, co2 = extra.get("o2_out"), extra.get("c2h4"), extra.get("c2h6"), extra.get("co2")
            measured = False
            reason = "周围两步内采集分最高。预测产率 %.0f，选择性 %.1f（超过 84 的概率 %.0f%%），保持率 %.1f%%（超过 95%% 的概率 %.0f%%）。" % (
                nb["hat"], nb["sel"], 100.0 * nb["ps"], 100.0 * nb["z"], 100.0 * nb["pz"],
            )
        row = _pack_row(
            g, cond, y if y is not None else score, sel, z, score, score, "靠综合得分",
            src, rank, "", None, measured=measured,
            o2_in=1.0, o2_out=o2_out, c2h4=c2h4, c2h6=c2h6, co2=co2,
        )
        row["loading"] = _load_fmt([load])
        row["mass"] = PROOF_MASS
        row["power"] = int(round(float(power)))
        row["recipe"] = _pd_recipe(load, cond)
        row["ucb"] = round(float(ucb), 1)
        row["score"] = round(float(score), 1)
        row["gap"] = round(float(ucb) - ystar, 1)
        row["group"] = src
        row["metal"] = "Pd"
        row["support"] = "P25"
        row["rank"] = rank
        row["reason"] = reason
        row.pop("brief", None)
        row.pop("knob", None)
        top.append(row)
        trace.append({"round": rank, "scheme": "Pd/P25", "recipe": row["recipe"], "y": row["score"], "ucb": row["ucb"], "group": src})
    stop = (
        "门槛：选择性大于 84，保持率大于 95%%。甲烷不超过 100，进料氧 1%%。门槛里产率最高。"
        "当前最优实测是 %s%% Pd-P25，甲烷 %.0f、1%%氧气 %.0f、氩气 %.0f mL/min，相对光功率 %d%%，"
        "产率 %.0f，选择性 %.1f%%，保持率 %.1f%%。"
        "没测过的格子采集分 = 产率期望改进 × 选择性超过 84 的概率 × 保持率超过 95%% 的概率，只在周围两步里算。"
        "负载是这一档和对数负载上最近的三档。共 %d 组。其中产率上界更高、两个概率都不低于一半的有 %d 组。"
    ) % (
        proof["load"], inc_ch4, inc_o2, inc_ar, proof["power"],
        proof["ystar"], proof["selstar"] or 0, 100.0 * (proof["zstar"] or 0),
        len(top), proof["n_open"],
    )
    return top, trace, stop, proof

def run_closed_loop(master_path=MASTER):
    wb = openpyxl.load_workbook(master_path, data_only=True)
    P = _load_laws(wb)
    metals, sup_table = _load_descriptors(wb)
    ws = wb["主表"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])

    def col(part):
        for i, h in enumerate(hdr):
            if h and part in str(h):
                return i
        raise KeyError(part)

    ix = {
        "metal": col("金属"),
        "load": col("负载量"),
        "sup": col("载体"),
        "lpd": col("光强"),
        "T": col("温度"),
        "ch4": col("CH4流量"),
        "o2": col("O2流量"),
        "ar": col("Ar流量"),
        "y": col("时空产率"),
        "sel": col("C2+选择性"),
        "o2_in": col("进料"),
        "o2_out": col("尾气"),
        "c2h4": col("C2H4浓度"),
        "c2h6": col("C2H6浓度"),
        "co2": col("CO2浓度"),
    }
    groups = {}
    seen = set()
    for r in rows[1:]:
        try:
            y = float(r[ix["y"]])
            sel = float(r[ix["sel"]])
        except (TypeError, ValueError):
            continue
        if y <= 0 or sel <= 0:
            continue
        cond = _cond_from_row(r, ix)
        if cond is None:
            continue
        metal = str(r[ix["metal"]]).strip()
        support = _clean_sup(r[ix["sup"]])
        if metal in ("0", "", "NA"):
            continue
        key = (metal, support)
        g = groups.get(key)
        if g is None:
            g = groups[key] = {
                "metal": metal,
                "support": support,
                "loads": [],
                "obs": [],
                "sels": [],
                "seen": {},
            }
        g["loads"].append(r[ix["load"]])
        g["sels"].append(sel)
        oi = _num(r[ix["o2_in"]])
        if oi is not None:
            cond["o2_in"] = oi
        k = _key(metal, support, cond, r[ix["load"]])
        seen.add(k)
        prev = g["seen"].get(k)
        if prev is None or y > prev["y"]:
            g["seen"][k] = {
                "cond": cond, "y": y, "sel": sel, "z": None, "load": r[ix["load"]],
                "o2_in": oi, "o2_out": _num(r[ix["o2_out"]]),
                "c2h4": _num(r[ix["c2h4"]]), "c2h6": _num(r[ix["c2h6"]]), "co2": _num(r[ix["co2"]]),
            }
    ret_load, ret_flow, allz = _load_retention()
    for g in groups.values():
        g["obs"] = list(g["seen"].values())
        for ob in g["obs"]:
            ob["z"] = _lookup_z(ret_load, ret_flow, g["metal"], g["support"], ob["load"], ob["cond"])

    y_max = max((ob["y"] for g in groups.values() for ob in g["obs"]), default=0.0)
    pd_groups = [g for g in groups.values() if _is_pd_p25(g["metal"], g["support"])]
    if not pd_groups:
        top, trace, stop_reason, proof = [], [], "主表里没有 Pd-P25，定不出当前最优。", {}
    else:
        pd_groups.sort(key=lambda g: -len(g["obs"]))
        top, trace, stop_reason, proof = _select_pd_p25(pd_groups[0], y_max)
    save_dir, save_name = _write_top8(top, stop_reason, len(trace), proof)
    return {
        "ok": True,
        "rounds": len(trace),
        "stop_reason": stop_reason,
        "top": top,
        "trace": trace,
        "proof": proof,
        "systems": len(groups),
        "save_dir": save_dir,
        "save_name": save_name,
    }


def _write_top8(top, stop_reason, rounds, proof=None):
    save_dir = os.path.dirname(MASTER)
    path = os.path.join(save_dir, "bo_grid_proof.xlsx")
    proof = proof or {}
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "网格证明"
    ws.append([
        "组别", "排名", "金属", "载体", "负载wt%", "甲烷流速", "氧气流速", "氩气流速",
        "催化剂质量mg", "相对光功率%", "进料氧%", "产率", "选择性", "保持率",
        "采集分", "产率上界", "高出当前最优",
        "进料c_O2/%", "尾气c_O2/ppm", "C2H4浓度/ppm", "C2H6浓度/ppm", "CO2浓度/ppm",
        "说明",
    ])
    for row in top:
        ws.append([
            row.get("group") or "新配方",
            row["rank"], row["metal"], row["support"], row["loading"],
            row["ch4"], row["o2"], row["ar"], row.get("mass"), row.get("power"),
            row.get("o2_in"), row["y"], row.get("sel"), row.get("z"),
            row.get("score"), row.get("ucb"), row.get("gap"),
            row.get("o2_in"), row.get("o2_out"),
            row.get("c2h4"), row.get("c2h6"), row.get("co2"),
            row["reason"],
        ])
    note = wb.create_sheet("说明")
    note.append(["目标", "选择性>84 且 保持率>95% 的前提下产率最高；采集分=产率期望改进×两个门槛的概率"])
    note.append(["当前最优负载", proof.get("load")])
    note.append(["门槛内最高产率", proof.get("ystar")])
    note.append(["选择性门槛", ">84"])
    note.append(["保持率门槛", ">95%"])
    note.append(["进料氧%", proof.get("o2_in")])
    note.append(["预测产率超过主表最高的格数", proof.get("n_above")])
    note.append(["当前最优选择性", proof.get("selstar")])
    note.append(["当前最优保持率", proof.get("zstar")])
    note.append(["甲烷", proof.get("ch4")])
    note.append(["1%氧气", proof.get("o2")])
    note.append(["氩气", proof.get("ar")])
    note.append(["相对光功率%", proof.get("power")])
    note.append(["催化剂质量mg", proof.get("mass")])
    note.append(["网格格数", proof.get("n_cells")])
    note.append(["上界仍更高的格数", proof.get("n_open")])
    note.append(["旁边组数", proof.get("near")])
    note.append(["远处组数", proof.get("far")])
    note.append(["已经整片压住的负载", "、".join(proof.get("certified") or [])])
    note.append(["停止原因", stop_reason])
    note.append(["推荐组数", rounds])
    note.append(["保存目录", os.path.abspath(save_dir)])
    note.append(["文件名", os.path.basename(path)])
    wb.save(path)
    return os.path.abspath(save_dir), os.path.basename(path)
