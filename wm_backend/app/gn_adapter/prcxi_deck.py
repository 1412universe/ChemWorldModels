# -*- coding: utf-8 -*-
"""PRCXI 9320 工作台 deck（板位资源清单）—— 供工作流编辑器做「4×4 板位点选」。

为什么单独一个模块
------------------
编辑器里 PRCXI 节点的 ``sources`` / ``targets`` / ``tip_racks`` 需要写**真实资源实例**
（``{"id": "/gn_workstation/PRCXI/PRCXI_Deck/<name>", "name": ..., "uuid": ...}``），
``move_plate`` 的 ``from`` / ``to`` 需要写**板位号**（1..16）。
这些数据散落在三处，本模块把它们收成一个只读快照：

  ① 板位几何 —— 权威类 ``GN/liquid_handling/prcxi/prcxi.py::PRCXI9300Deck``
     · ``_9320_ROWS = 4``、``_layout_column_nums = 4`` → **16 个物理板位**
     · ``_9320_SITE_POSITIONS[i] = ((i%4)*137.5+5, (3-(i//4))*96+13, 0)``
       → i%4 = 列（x，列距 137.5mm）／i//4 = 行（y，行距 96mm）
       → 板位号 T(i+1) 为**行主序**：T1..T4 是同一行（最靠里一行）的 4 个位
     · 与 ``_get_slot_number()`` 的历史兜底反算 ``idx = row*4 + col`` 完全一致
  ② 台面工艺语义 —— 总览页 ``static/assets/app.js`` 的 ``DECKS.prcxi.layouts``
     （三工艺 aus / autet / mof，各位的 name / group / content / temp / enabled）
     · 注意 app.js 的 ``pos`` 就是板位号 T（同一套编号），只是它渲染成**列优先**；
       本模块按驱动器物理方向输出 ``gridCol`` / ``gridRow``（行主序）
  ③ 真实占用 —— **真实工作流 JSON**（Uni-Lab-OS GN 目录）里 PRCXI 节点
     ``source_slots`` / ``target_slots`` / ``tip_rack_slots`` 与
     ``sources`` / ``targets`` / ``tip_racks`` 的成对关系（同一节点内 slot 与资源名一一对应）
     → 得到「板位号 → 资源实例」的实测证据（含出现次数）

只读、不连硬件、不启会话。真机动作仍必须走 /api/workflow-run 的三层闸。
"""
from __future__ import annotations

import glob
import json
import os
import re
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# 1. 板位几何（源自 PRCXI9300Deck；此处为字面量快照，避免依赖 Uni-Lab-OS 在场）
# ---------------------------------------------------------------------------
DECK_MODEL = "PRCXI9300Deck"
ROWS = 4
COLS = 4
TOTAL = ROWS * COLS                     # 16

COLUMN_RAILS = 5
ROW_PITCH = 96.0
COL_PITCH = 137.5                       # = 5 条轨道 × 27.5mm 轨宽
X_OFFSET = 5.0
Y_OFFSET = 13.0
SITE_SIZE = {"width": 128.0, "height": 86.0, "depth": 0.0}


def _site_geometry(i: int) -> Dict[str, float]:
    """第 i 个 _sites 下标（0-based）的物理坐标，等价于 PRCXI9300Deck._9320_SITE_POSITIONS[i]。"""
    return {"x": (i % 4) * COL_PITCH + X_OFFSET,
            "y": (3 - (i // 4)) * ROW_PITCH + Y_OFFSET,
            "z": 0.0}


# ---------------------------------------------------------------------------
# 2. 台面工艺语义（逐字取自 app.js DECKS.prcxi.layouts；pos 即板位号 T）
# ---------------------------------------------------------------------------
PROCESSES = [
    {"key": "aus",   "label": "金球合成"},
    {"key": "autet", "label": "金四面体合成"},
    {"key": "mof",   "label": "MOF 合成"},
]
DEFAULT_PROCESS = "autet"

GROUP_LABELS = {
    "trough":   "整板储液槽",
    "deepWell": "96 孔深孔板",
    "tip":      "枪头位",
    "transfer": "中转位",
    "spare":    "备用 / 空位",
    "waste":    "废液槽",
    "trash":    "垃圾桶",
    "reader":   "酶标板",
    "sonic":    "超声混匀",
}

DISABLED_REASON = "夹爪行程不覆盖（新版《9320 台面布局》标停用）"

LAYOUTS: Dict[str, List[Dict[str, Any]]] = {
    "aus": [
        {"pos": 1,  "name": "垃圾桶",                 "group": "trash"},
        {"pos": 2,  "name": "废液槽",                 "group": "waste"},
        {"pos": 3,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 4,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 5,  "name": "整板储液槽（制冷4℃）",    "group": "trough",   "content": "NaBH4溶液",     "temp": "4℃"},
        {"pos": 6,  "name": "整板储液槽（制冷4℃）",    "group": "trough",   "content": "0.5mM 氯金酸",  "temp": "4℃"},
        {"pos": 7,  "name": "96孔深孔板（金属浴28℃）", "group": "deepWell", "content": "20mM CTAC",     "temp": "28℃"},
        {"pos": 8,  "name": "整板储液槽（金属浴28℃）", "group": "trough",   "content": "200mM CTAC",    "temp": "28℃"},
        {"pos": 9,  "name": "96孔深孔板（恒温振荡）",   "group": "deepWell", "content": "混合溶液A/种子溶液", "temp": "恒温振荡"},
        {"pos": 10, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 11, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 12, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 13, "name": "整板储液槽",             "group": "trough",   "content": "抗坏血酸溶液（100mM）"},
        {"pos": 14, "name": "96孔深孔板",             "group": "deepWell", "content": "金球溶液"},
        {"pos": 15, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 16, "name": "中转位",                 "group": "transfer", "content": ""},
    ],
    "autet": [
        {"pos": 1,  "name": "垃圾桶",                 "group": "trash"},
        {"pos": 2,  "name": "废液槽",                 "group": "waste"},
        {"pos": 3,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 4,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 5,  "name": "整板储液槽（制冷4℃）",    "group": "trough",   "content": "金球溶液",     "temp": "4℃"},
        {"pos": 6,  "name": "整板储液槽（制冷4℃）",    "group": "trough",   "content": "2.5mM 氯金酸", "temp": "4℃"},
        {"pos": 7,  "name": "96孔深孔板（金属浴28℃）", "group": "deepWell", "content": "20mM CTAC",    "temp": "28℃"},
        {"pos": 8,  "name": "96孔深孔板（金属浴28℃）", "group": "deepWell", "content": "CTAC及CTAB混液", "temp": "28℃"},
        {"pos": 9,  "name": "96孔深孔板（恒温振荡）",   "group": "deepWell", "content": "抗坏血酸溶液（梯度）", "temp": "恒温振荡"},
        {"pos": 10, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 11, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 12, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 13, "name": "酶标板",                 "group": "reader", "content": ""},
        {"pos": 14, "name": "96孔深孔板",             "group": "deepWell", "content": "金四面体成品"},
        {"pos": 15, "name": "枪头位",                 "group": "tip", "content": "1ml"},
        {"pos": 16, "name": "中转位（纯水用完须转移走）", "group": "transfer", "content": "纯水（整板储液槽）"},
    ],
    "mof": [
        {"pos": 1,  "name": "垃圾桶",                 "group": "trash"},
        {"pos": 2,  "name": "废液槽",                 "group": "waste"},
        {"pos": 3,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 4,  "name": "夹爪行程不覆盖·停用",     "group": None, "enabled": False},
        {"pos": 5,  "name": "整板储液槽（制冷4℃）",    "group": "trough", "content": "", "temp": "4℃"},
        {"pos": 6,  "name": "整板储液槽（制冷4℃）",    "group": "trough", "content": "", "temp": "4℃"},
        {"pos": 7,  "name": "96孔深孔板（金属浴28℃）", "group": "deepWell", "content": "", "temp": "28℃"},
        {"pos": 8,  "name": "96孔深孔板（金属浴28℃）", "group": "deepWell", "content": "", "temp": "28℃"},
        {"pos": 9,  "name": "空位（可放枪头盒）",       "group": "spare", "content": ""},
        {"pos": 10, "name": "96孔深孔板",             "group": "deepWell", "content": "溶液A"},
        {"pos": 11, "name": "整板储液槽",             "group": "trough", "content": "DMF溶液"},
        {"pos": 12, "name": "96孔深孔板",             "group": "deepWell", "content": "成品"},
        {"pos": 13, "name": "96孔深孔板（恒温振荡）",   "group": "deepWell", "content": "", "temp": "恒温振荡"},
        {"pos": 14, "name": "空位（可放枪头盒）",       "group": "spare", "content": ""},
        {"pos": 15, "name": "空位（可放枪头盒）",       "group": "spare", "content": ""},
        {"pos": 16, "name": "空位（兼中转位）",         "group": "spare", "content": ""},
    ],
}

# ---------------------------------------------------------------------------
# 3. 真实资源实例注册表（名字 → uuid）
#    来源：真实工作流 JSON 里 PRCXI 节点 param 的 sources/targets/tip_racks 实例
#    （``{"id": "/gn_workstation/PRCXI/PRCXI_Deck/<name>", "name": ..., "uuid": ...}``）
#    + 节点库默认值（static/assets/gn_node_library.js）
# ---------------------------------------------------------------------------
UNILAB_DECK = "/gn_workstation/PRCXI/PRCXI_Deck"

RESOURCES: List[Dict[str, Any]] = [
    {"name": "PRCXI_nest_1_troughplate",     "uuid": "e9a28436-8a7c-4c4f-abe1-c8ab1667f330"},
    {"name": "PRCXI_nest_1_troughplate1",    "uuid": "94316d9c-4c66-43da-b964-416c51435179"},
    {"name": "PRCXI_nest_1_troughplate2",    "uuid": "8e1cb526-32c4-4c6c-bb22-6faa81e209c5"},
    {"name": "PRCXI_nest_1_troughplate3",    "uuid": "dd9a0925-8aa7-44c0-a1bc-7dc9776ee6e0"},
    {"name": "PRCXI_nest_1_troughplate4",    "uuid": "bd6f7d88-e96a-4efa-b8c6-f5514aeb7cdf"},
    {"name": "PRCXI_nest_1_troughplate5",    "uuid": "53aca277-6dea-43a5-89d2-83b15a4a01b7"},
    {"name": "PRCXI_96_DeepWell5",           "uuid": "e74c153c-a29f-4653-a665-b9e1cc1711a9"},
    {"name": "PRCXI_96_DeepWell_2",          "uuid": "39051c8a-0180-4516-88e1-fa7ec724f453"},
    {"name": "PRCXI_96_DeepWell_3",          "uuid": "f260b8ba-a629-42ea-8340-548d765b4479"},
    {"name": "PRCXI_96_DeepWell_shake",      "uuid": "a2e75ff7-6b1a-494a-8b18-0b6d93619a11"},
    {"name": "PRCXI_BioER_96_wellplate",     "uuid": "75874461-548a-41db-bc44-a6ce51fb0e26"},
    {"name": "PRCXI_1250uL_Tips1",           "uuid": "a2c7801f-bef0-4007-b650-73ad32f04778"},
    {"name": "PRCXI_1250uL_Tips2",           "uuid": "e7df077f-ec56-48e6-a7af-9fabf569c418",
     "aliasUuid": ["695548f2-3e97-4913-a2c5-e19b3b07cac9"]},
    {"name": "PRCXI_1250uL_Tips3",           "uuid": "bf3f445a-839e-4e20-8dd8-40aa5a147807"},
]
RES_BY_NAME = {r["name"]: r for r in RESOURCES}

# 资源种类：由名称模式判定（PRCXI 物料命名规范）
KIND_RULES = [
    (re.compile(r"_Tips\d*$", re.I),        "tip",      "枪头盒"),
    (re.compile(r"troughplate\d*$", re.I),  "trough",   "整板储液槽"),
    (re.compile(r"DeepWell_shake$", re.I),  "deepWell", "96 孔深孔板（恒温振荡）"),
    (re.compile(r"DeepWell", re.I),         "deepWell", "96 孔深孔板"),
    (re.compile(r"wellplate$", re.I),       "reader",   "96 孔板（酶标/检测板）"),
]


def kind_of(name: str) -> Dict[str, str]:
    for rx, k, label in KIND_RULES:
        if rx.search(name or ""):
            return {"kind": k, "kindLabel": label}
    return {"kind": "other", "kindLabel": "其他耗材"}


# ---------------------------------------------------------------------------
# 4. 实测占用证据：板位号(T) → [(资源名, 出现次数)]
#    由真实工作流聚合（每台 PRCXI 节点内 slot 与资源名一一对应）：
#      transfer_liquid / titration_liquid : source_slots↔sources, target_slots↔targets,
#                                           tip_rack_slots↔tip_racks
#    可调用 refresh_from_workflows() 用现网工作流重算（需 Uni-Lab-OS 仓库在场）。
# ---------------------------------------------------------------------------
_OCC_EVIDENCE: Dict[int, List[Any]] = {
    1:  [],
    2:  [["PRCXI_nest_1_troughplate", 1]],
    3:  [["PRCXI_96_DeepWell5", 3], ["PRCXI_nest_1_troughplate3", 1]],
    4:  [["PRCXI_nest_1_troughplate5", 3], ["PRCXI_BioER_96_wellplate", 1]],
    5:  [["PRCXI_nest_1_troughplate5", 8], ["PRCXI_96_DeepWell5", 1]],
    6:  [["PRCXI_nest_1_troughplate3", 81], ["PRCXI_96_DeepWell_3", 1]],
    7:  [["PRCXI_nest_1_troughplate4", 11], ["PRCXI_96_DeepWell5", 1]],
    8:  [["PRCXI_96_DeepWell_2", 2], ["PRCXI_nest_1_troughplate2", 2]],
    9:  [],
    10: [["PRCXI_nest_1_troughplate2", 84], ["PRCXI_96_DeepWell5", 3]],
    11: [["PRCXI_1250uL_Tips1", 9], ["PRCXI_1250uL_Tips2", 2]],
    12: [["PRCXI_1250uL_Tips3", 14], ["PRCXI_1250uL_Tips1", 1]],
    13: [],
    14: [["PRCXI_96_DeepWell_3", 4], ["PRCXI_nest_1_troughplate1", 1]],
    15: [["PRCXI_1250uL_Tips2", 92]],
    16: [["PRCXI_96_DeepWell5", 22], ["PRCXI_nest_1_troughplate2", 4],
         ["PRCXI_nest_1_troughplate4", 1], ["PRCXI_96_DeepWell_2", 1]],
}

# 无实测证据、但台面工艺语义与某个**已登记实例**一一对应的板位（显式标注为推定）
_SEMANTIC_OVERRIDE = {
    9:  "PRCXI_96_DeepWell_shake",        # 台面「96孔深孔板（恒温振荡）」
    13: "PRCXI_BioER_96_wellplate",       # 台面「酶标板」
}


def _occ_table() -> Dict[int, List[Dict[str, Any]]]:
    out: Dict[int, List[Dict[str, Any]]] = {}
    for slot, items in sorted(_OCC_EVIDENCE.items()):
        rows = []
        for name, cnt in items:
            if name not in RES_BY_NAME:
                continue
            rows.append({"name": name, "count": int(cnt), "source": "workflow"})
        out[slot] = rows
    return out


def _guess_workflow_dir() -> Optional[str]:
    """探测真实工作流 JSON 目录（Uni-Lab-OS GN 工站）。

    同一份仓库在本机有两处副本（独立 clone 与 unilabWorld 下的完整仓），
    两者的工作流 JSON 集合**不同**（独立 clone 多 5 份历史工作流）。
    这里取**含 JSON 最多的那一个**，与 scripts/gen_gn_node_library.py 的口径一致。
    """
    roots = []
    env = os.environ.get("UNILABOS_ROOT")
    if env:
        roots.append(env)
    roots += [
        "/Users/fenglongli/Downloads/Uni-Lab-OS",
        "/Users/fenglongli/Downloads/unilabWorld/Uni-Lab-OS",
    ]
    best, best_n = None, -1
    for r in roots:
        d = os.path.join(r, "unilabos", "devices", "workstation", "GN")
        if not os.path.isdir(d):
            continue
        n = len(glob.glob(os.path.join(d, "*.json")))
        if n > best_n:
            best, best_n = d, n
    return best


def refresh_from_workflows() -> Dict[str, Any]:
    """用现网真实工作流重算「板位 → 资源」实测证据（只读）。

    返回 {ok, dir, files, updated} ；失败不抛，只回报原因。
    """
    d = _guess_workflow_dir()
    if not d:
        return {"ok": False, "error": "未找到 Uni-Lab-OS GN 工作流目录"}
    pairs = [("sources", "source_slots"), ("targets", "target_slots"),
             ("tip_racks", "tip_rack_slots")]
    agg: Dict[int, Dict[str, int]] = {}
    n_file = 0
    for f in sorted(glob.glob(os.path.join(d, "*.json"))):
        try:
            doc = json.load(open(f, encoding="utf-8"))
        except Exception:                                   # noqa: BLE001
            continue
        nodes = ((doc or {}).get("data") or {}).get("nodes") or []
        if not isinstance(nodes, list):
            continue
        n_file += 1
        for n in nodes:
            if not isinstance(n, dict) or n.get("device_name") != "PRCXI":
                continue
            p = n.get("param") or {}
            for rk, sk in pairs:
                names = _as_resource_names(p.get(rk))
                slot = p.get(sk)
                if not names or not isinstance(slot, int):
                    continue
                for nm in names:
                    if nm in RES_BY_NAME:
                        agg.setdefault(slot, {})
                        agg[slot][nm] = agg[slot].get(nm, 0) + 1
    if not agg:
        return {"ok": False, "error": "工作流中未解析到 slot↔资源 配对", "dir": d}
    for slot in range(1, TOTAL + 1):
        _OCC_EVIDENCE[slot] = sorted(agg.get(slot, {}).items(),
                                     key=lambda kv: -kv[1])
    return {"ok": True, "dir": d, "files": n_file,
            "slots": sum(1 for s in _OCC_EVIDENCE if _OCC_EVIDENCE[s])}


def _as_resource_names(v: Any) -> List[str]:
    """sources / targets / tip_racks 可能是 JSON 串或已解析的 list。"""
    if v is None:
        return []
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except Exception:                                   # noqa: BLE001
            return []
    if isinstance(v, dict):
        v = [v]
    if not isinstance(v, list):
        return []
    out = []
    for it in v:
        if isinstance(it, dict) and it.get("name"):
            out.append(str(it["name"]))
        elif isinstance(it, str) and it:
            out.append(it)
    return out


# ---------------------------------------------------------------------------
# 5. 角色定义（点选后写进哪个参数、值形状）
# ---------------------------------------------------------------------------
def action_roles(action: str) -> List[Dict[str, Any]]:
    """某个 PRCXI 动作支持的板位角色（空列表 = 该动作与 deck 无关）。"""
    a = (action or "").strip()
    if a in ("transfer_liquid", "titration_liquid"):
        return [
            {"key": "source", "label": "来源 source", "param": "sources",
             "value": "resource", "multi": True, "max": 8,
             "accept": ["trough", "deepWell", "reader", "transfer", "spare", "sonic"],
             "hint": "吸取液体的板位（储液槽 / 深孔板 / 酶标板）"},
            {"key": "target", "label": "目标 target", "param": "targets",
             "value": "resource", "multi": True, "max": 8,
             "accept": ["deepWell", "reader", "trough", "transfer", "spare"],
             "hint": "排出液体的板位（深孔板 / 酶标板 / 中转位）"},
            {"key": "tips", "label": "枪头 tips", "param": "tip_racks",
             "value": "resource", "multi": True, "max": 4,
             "accept": ["tip"],
             "hint": "装载枪头的枪头盒板位（10 / 11 / 12 / 15 号位）"},
        ]
    if a == "move_plate":
        return [
            {"key": "from", "label": "起点 from", "param": "from",
             "value": "slot", "multi": False, "max": 1,
             "accept": ["trough", "deepWell", "reader", "tip", "transfer", "spare", "sonic"],
             "hint": "搬运起点板位号（3/4 号位夹爪行程不覆盖）"},
            {"key": "to", "label": "终点 to", "param": "to",
             "value": "slot", "multi": False, "max": 1,
             "accept": ["trough", "deepWell", "reader", "tip", "transfer", "spare", "sonic"],
             "hint": "搬运终点板位号（3/4 号位夹爪行程不覆盖）"},
            {"key": "plate", "label": "搬运耗材", "param": "plate",
             "value": "resource", "multi": True, "max": 4,
             "accept": ["trough", "deepWell", "reader", "tip", "transfer", "spare", "sonic"],
             "hint": "被夹爪搬运的孔板 / 耗材资源实例"},
        ]
    return []


# ---------------------------------------------------------------------------
# 6. 快照
# ---------------------------------------------------------------------------
def _site_resource(slot: int) -> Optional[Dict[str, Any]]:
    """该板位的代表资源：① 实测证据里出现最多的；② 否则台面语义推定。"""
    occ = _occ_table().get(slot) or []
    if occ:
        top = occ[0]
        reg = RES_BY_NAME[top["name"]]
        return {"name": reg["name"], "uuid": reg["uuid"], "id": "%s/%s" % (UNILAB_DECK, reg["name"]),
                "source": "workflow", "count": top["count"],
                "candidates": [dict(x, uuid=RES_BY_NAME[x["name"]]["uuid"],
                                    id="%s/%s" % (UNILAB_DECK, x["name"]),
                                    **kind_of(x["name"]))
                               for x in occ if x["name"] in RES_BY_NAME],
                **kind_of(reg["name"])}
    nm = _SEMANTIC_OVERRIDE.get(slot)
    if nm and nm in RES_BY_NAME:
        reg = RES_BY_NAME[nm]
        return {"name": reg["name"], "uuid": reg["uuid"], "id": "%s/%s" % (UNILAB_DECK, reg["name"]),
                "source": "semantic", "count": 0,
                "candidates": [{"name": reg["name"], "uuid": reg["uuid"],
                                "id": "%s/%s" % (UNILAB_DECK, reg["name"]),
                                "source": "semantic", "count": 0, **kind_of(reg["name"])}],
                **kind_of(reg["name"])}
    return None


def snapshot(process: Optional[str] = None, action: Optional[str] = None) -> Dict[str, Any]:
    """deck 快照：16 板位 × (几何 + 台面语义 + 真实资源 + 角色可用性)。

    process: aus | autet | mof（默认 autet）
    action : 传入 PRCXI 动作名时，额外给出该动作的角色定义与逐板位可用性
    """
    proc = (process or DEFAULT_PROCESS).strip().lower()
    if proc not in LAYOUTS:
        proc = DEFAULT_PROCESS
    layout = {s["pos"]: s for s in LAYOUTS[proc]}
    occ_all = _occ_table()
    roles = action_roles(action or "")

    # 同一资源被多个板位引用的冲突（实测占用是跨工作流的历史证据，会重位）
    holder: Dict[str, List[int]] = {}
    for slot in range(1, TOTAL + 1):
        r = _site_resource(slot)
        if r:
            holder.setdefault(r["name"], []).append(slot)

    sites: List[Dict[str, Any]] = []
    for i in range(TOTAL):
        slot = i + 1
        sem = layout.get(slot) or {}
        geo = _site_geometry(i)
        enabled = sem.get("enabled", True) is not False
        group = sem.get("group")
        res = _site_resource(slot)
        conflict = sorted([s for s in holder.get(res["name"], []) if s != slot]) if res else []
        cap = {
            "pipette": bool(res),                    # 移液针可达（有可寻址耗材）
            "gripper": enabled,                      # 夹爪可达（3/4 号位为否）
        }
        # 逐角色可用性
        avail: Dict[str, Any] = {}
        warnings: List[str] = []
        for role in roles:
            ok = bool(res) and enabled and (group in role["accept"] if group else False)
            why = ""
            if not res:
                why = "该板位无可寻址耗材（%s）" % (sem.get("name") or "未知")
            elif not enabled:
                why = DISABLED_REASON
            elif group not in role["accept"]:
                why = "台面语义为「%s」，不适合作为%s" % (
                    GROUP_LABELS.get(group, group or "未知"), role["label"])
            avail[role["key"]] = {"ok": ok, "why": why}
        # 工艺语义与实际占用不一致时给出提示（工艺相关，属正常现象）
        if res and group:
            rk = res.get("kind")
            if group == "tip" and rk != "tip":
                warnings.append("台面标为枪头位，实测占用为 %s" % res["name"])
            elif group == "deepWell" and rk == "trough":
                warnings.append("台面标为深孔板位，实测占用为储液槽 %s" % res["name"])
            elif group == "transfer" and rk not in ("trough", "spare", "other"):
                warnings.append("台面标为中转位，实测占用为 %s" % res["name"])
        if conflict:
            warnings.append("同一资源也出现于 T%s（跨工作流历史占用）"
                            % "、T".join(str(x) for x in conflict))
        if not enabled:
            warnings.insert(0, DISABLED_REASON)

        sites.append({
            "slot": slot,
            "label": "T%d" % slot,
            "row": i // 4 + 1,          # 1 = 最靠里一行（驱动 y 最大）
            "col": i % 4 + 1,
            "gridCol": i % 4 + 1,
            "gridRow": i // 4 + 1,
            "x": round(geo["x"], 1), "y": round(geo["y"], 1),
            "enabled": enabled,
            "reason": "" if enabled else DISABLED_REASON,
            "group": group,
            "groupLabel": GROUP_LABELS.get(group or "", "—"),
            "name": sem.get("name") or "",
            "content": sem.get("content") or "",
            "temp": sem.get("temp") or "",
            "resource": res,
            "cap": cap,
            "roleAvailable": avail,
            "warnings": warnings,
        })

    # 未匹配到板位的已登记资源
    assigned = {s["resource"]["name"] for s in sites if s["resource"]}
    unassigned = [r["name"] for r in RESOURCES if r["name"] not in assigned]

    resources_out = []
    for r in RESOURCES:
        k = kind_of(r["name"])
        resources_out.append({
            "name": r["name"], "uuid": r["uuid"],
            "id": "%s/%s" % (UNILAB_DECK, r["name"]),
            "aliasUuid": r.get("aliasUuid") or [],
            "slots": holder.get(r["name"], []),
            "count": sum(c["count"] for lst in occ_all.values() for c in lst
                         if c["name"] == r["name"]),
            **k,
        })

    return {
        "ok": True,
        "device": "PRCXI",
        "deckModel": DECK_MODEL,
        "unilabDeck": UNILAB_DECK,
        "rows": ROWS, "cols": COLS, "total": TOTAL,
        "slotOrder": "row-major（T1..T4 = 最靠里一行，x 递增）",
        "geometry": {"columnRails": COLUMN_RAILS, "rowPitch": ROW_PITCH,
                     "colPitch": COL_PITCH, "xOffset": X_OFFSET, "yOffset": Y_OFFSET,
                     "siteSize": SITE_SIZE},
        "process": proc,
        "processes": PROCESSES,
        "action": (action or ""),
        "roles": roles,
        "groupLabels": GROUP_LABELS,
        "sites": sites,
        "resources": resources_out,
        "unassignedResources": unassigned,
        "source": ("板位几何 PRCXI9300Deck（GN/liquid_handling/prcxi/prcxi.py）"
                   "＋ 台面工艺语义 static/assets/app.js DECKS.prcxi.layouts"
                   "＋ 真实占用 真实工作流 JSON slot↔资源 配对实测"),
    }


if __name__ == "__main__":                                  # 手动查看
    import sys
    r = refresh_from_workflows()
    print("refresh:", r)
    snap = snapshot(process="autet", action="transfer_liquid")
    for s in snap["sites"]:
        print("T%-2d %-4s %-8s %-22s res=%-28s %s"
              % (s["slot"], "ON" if s["enabled"] else "OFF", s["groupLabel"],
                 s["name"][:20], (s["resource"] or {}).get("name") or "—",
                 ";".join(s["warnings"])))
    print("unassigned:", snap["unassignedResources"])
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        print(json.dumps(snap, ensure_ascii=False, indent=1))
