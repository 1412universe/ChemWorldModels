# -*- coding: utf-8 -*-
"""纯 BO 闭环：预测读全部主表；产率 UCB 只排 CH4≤100 的旧配方和新配方。"""

import math
import os
import re
import statistics as st
from collections import defaultdict

import openpyxl

KAPPA = 1.96
CH4_RANK_MAX = 100.0
MASTER = "/Users/fenglongli/Downloads/unilabWorld/data/OCM_master.xlsx"
GAS = "/Users/fenglongli/Downloads/unilabWorld/data/gas-solid_reactions_314（每个时间段的六行代表了间隔26min的时间）.xlsx"
MAX_ROUNDS = 36
TOP_N = 12


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
    return ("%.2f" % med).rstrip("0").rstrip(".")


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


def _key(metal, support, cond):
    return (metal, support, cond["T"], cond["ch4"], cond["o2"], cond["ar"], cond["lpd"])


def _cond_from_row(r, ix):
    T = _temp_key(r[ix["T"]])
    ch4 = _flow(r[ix["ch4"]])
    o2 = _flow(r[ix["o2"]])
    ar = _flow(r[ix["ar"]])
    lpd = _light(r[ix["lpd"]])
    if T is None or ch4 is None or o2 is None or lpd is None:
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
        cond["lpd"] / 100.0,
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


def _yield_ucb(y, y_max):
    score = 0.0 if y is None or not y_max else y / y_max
    return score, score, "靠产率"


def _lookup_z(ret_load, ret_flow, metal, support, load, cond):
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
    return "%s · CH4 %.1f · O2 %.1f · Ar %.1f · 光强 %d" % (
        _show_t(cond["T"]), cond["ch4"], cond["o2"], cond["ar"], cond["lpd"],
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
    if y_hi is not None and s_hi is not None and z_hi is not None:
        gate = "UCB上界产率 %.0f、选择性 %.1f%%、保持率 %.2f。" % (y_hi, s_hi, z_hi)
    return "%s预测均值产率 %.0f，选择性 %s%%，130分钟保持率 %s。产率 UCB %.2f，%s。" % (
        gate, y, sel_s, _fmt_z(z), score, how,
    )


def _pack_row(g, cond_or_ob, y, sel, z, score, floor, how, kind, rnd, knob="", bounds=None, measured=False, o2_in=None, o2_out=None):
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
        k = _key(metal, support, cond)
        seen.add(k)
        prev = g["seen"].get(k)
        if prev is None or y > prev["y"]:
            g["seen"][k] = {
                "cond": cond, "y": y, "sel": sel, "z": None, "load": r[ix["load"]],
                "o2_in": _num(r[ix["o2_in"]]), "o2_out": _num(r[ix["o2_out"]]),
            }
    ret_load, ret_flow, allz = _load_retention()
    for g in groups.values():
        g["obs"] = list(g["seen"].values())
        for ob in g["obs"]:
            ob["z"] = _lookup_z(ret_load, ret_flow, g["metal"], g["support"], ob["load"], ob["cond"])

    y_max = max((ob["y"] for g in groups.values() for ob in g["obs"]), default=0.0)
    raw_rows = []
    pool = []
    for g in groups.values():
        ys = [ob["y"] for ob in g["obs"]]
        n = len(ys)
        mu = sum(ys) / n
        mean_sel = sum(g["sels"]) / len(g["sels"])
        pf, supdesc, metaldesc = _physfactor(P, metals, sup_table, g["metal"], g["support"], mean_sel)
        g.update(
            mu=mu, n=n, pf=pf, n_sim=0,
            mean_sel=mean_sel, supdesc=supdesc, metaldesc=metaldesc,
        )
        for ob in g["obs"]:
            if not _rankable(ob["cond"]):
                continue
            score, floor, how = _yield_ucb(ob["y"], y_max)
            raw_rows.append(_pack_row(
                g, ob, ob["y"], ob["sel"], ob["z"], score, floor, how, "主表旧配方", 0,
                measured=True, o2_in=ob.get("o2_in"), o2_out=ob.get("o2_out"),
            ))
        anchors = sorted(
            (ob for ob in g["obs"] if _rankable(ob["cond"])),
            key=lambda it: -it["y"],
        )[:6]
        for base in anchors:
            for cond in _neighbors(dict(base["cond"])):
                if not _rankable(cond):
                    continue
                k = _key(g["metal"], g["support"], cond)
                if k in seen or k in g["seen"]:
                    continue
                seen.add(k)
                pool.append({"g": g, "cond": cond, "base": base["cond"]})

    simulated = []
    trace = []
    stop_reason = ""
    for rnd in range(1, MAX_ROUNDS + 1):
        if len(simulated) >= TOP_N:
            break
        if not pool:
            stop_reason = "按主表精度还能取的新配方已经试完，共模拟 %d 轮。" % (rnd - 1)
            break
        scored = []
        for item in pool:
            g = item["g"]
            y_hat, y_ucb = _predict_field(g["obs"], item["cond"], "y", g["n_sim"])
            s_hat, s_ucb = _predict_field(g["obs"], item["cond"], "sel", g["n_sim"])
            z_hat, z_ucb = _predict_field(g["obs"], item["cond"], "z", g["n_sim"])
            in_hat, _in_ucb = _predict_field(g["obs"], item["cond"], "o2_in", g["n_sim"])
            out_hat, _out_ucb = _predict_field(g["obs"], item["cond"], "o2_out", g["n_sim"])
            if z_hat is not None:
                z_hat = min(z_hat, 1.0)
            if z_ucb is not None:
                z_ucb = min(z_ucb, 1.0)
            if y_ucb is None or not _rankable(item["cond"]):
                continue
            ucb_score, ucb_floor, ucb_how = _yield_ucb(y_ucb, y_max)
            item.update(
                y_hat=y_hat, s_hat=s_hat, z_hat=z_hat,
                y_ucb=y_ucb, s_ucb=s_ucb, z_ucb=z_ucb,
                o2_in=in_hat, o2_out=out_hat,
                score=ucb_score, floor=ucb_floor, how=ucb_how,
            )
            scored.append(item)
        if not scored:
            stop_reason = "模拟 %d 轮后停止。没有还能试的新配方。" % len(simulated)
            break
        scored.sort(key=lambda it: -it["score"])
        best = scored[0]
        g = best["g"]
        y_sim, s_sim, z_sim = best["y_hat"], best["s_hat"], best["z_hat"]
        score, how = best["score"], best["how"]
        written = {
            "cond": best["cond"], "y": y_sim, "sel": s_sim, "z": z_sim,
            "o2_in": best.get("o2_in"), "o2_out": best.get("o2_out"),
            "score": score, "how": how, "floor": best["floor"], "load": None,
        }
        g["obs"].append(written)
        g["seen"][_key(g["metal"], g["support"], best["cond"])] = written
        g["n_sim"] += 1
        knob = _knob_reason(g, best["base"], best["cond"]) + "按最近实测锚定。"
        bounds = {"y": best["y_ucb"], "sel": best["s_ucb"], "z": best["z_ucb"]}
        row = _pack_row(
            g, best["cond"], y_sim, s_sim, z_sim, score, best["floor"], how,
            "新配方", rnd, knob, bounds, o2_in=best.get("o2_in"), o2_out=best.get("o2_out"),
        )
        row["ucb"] = round(best["y_ucb"], 1)
        simulated.append(row)
        trace.append({
            "round": rnd,
            "scheme": "%s/%s" % (g["metal"], g["support"]),
            "recipe": row["recipe"],
            "y": round(y_sim, 1),
            "ucb": row["ucb"],
        })
        pool = [it for it in pool if it is not best]
    if not stop_reason:
        stop_reason = (
            "预测读取全部主表，含 CH4>100，用来学习附近规律。产率 UCB 只排 CH4≤100 的旧配方和新配方。共模拟 %d 轮。"
            % len(simulated)
        )

    top = sorted(raw_rows + simulated, key=lambda s: (-s["score"], -s["y"]))[:TOP_N]
    seen_sys = set()
    for i, row in enumerate(top, 1):
        row["rank"] = i
        key = (row["metal"], row["support"])
        tail = "未试新配方的采集分盖不过当前最优，不可能有更优解了。" if "不可能有更优解" in stop_reason else ""
        if key not in seen_sys:
            row["reason"] = row["brief"] + row["knob"] + tail
            seen_sys.add(key)
        else:
            row["reason"] = row["knob"] + tail
        row.pop("brief", None)
        row.pop("knob", None)
    if not stop_reason:
        stop_reason = "模拟结束。"
    save_dir, save_name = _write_top12(top, stop_reason, len(trace))
    return {
        "ok": True,
        "rounds": len(trace),
        "stop_reason": stop_reason,
        "top": top,
        "trace": trace,
        "systems": len(groups),
        "save_dir": save_dir,
        "save_name": save_name,
    }


def _write_top12(top, stop_reason, rounds):
    save_dir = os.path.dirname(MASTER)
    path = os.path.join(save_dir, "bo_top12.xlsx")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "前12"
    ws.append(["排名", "来源", "金属", "载体", "负载wt%", "配方", "温度", "CH4", "O2", "进料c_O2/%", "尾气c_O2/ppm", "Ar", "光强", "产率", "选择性", "保持率", "采集分", "入选方式", "推荐原因"])
    for row in top:
        ws.append([
            row["rank"], row.get("kind", ""), row["metal"], row["support"], row["loading"], row["recipe"],
            row["T"], row["ch4"], row["o2"], row.get("o2_in"), row.get("o2_out"), row["ar"], row["lpd"],
            row["y"], row.get("sel"), row.get("z"), row.get("score"), row.get("how"), row["reason"],
        ])
    note = wb.create_sheet("说明")
    note.append(["停止原因", stop_reason])
    note.append(["模拟轮数", rounds])
    note.append(["保存目录", os.path.abspath(save_dir)])
    note.append(["文件名", os.path.basename(path)])
    wb.save(path)
    return os.path.abspath(save_dir), os.path.basename(path)
