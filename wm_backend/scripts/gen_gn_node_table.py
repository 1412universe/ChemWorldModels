#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 1.4.0「点位表」转成**驱动真正会加载的节点表 CSV**。

为什么要单独生成
----------------
驱动侧决定「哪些点位能被读写」的不是编辑器里的节点库，而是它启动时加载的节点表 CSV：

    GnPlcClient.get_or_create(csv_path=…)
      → load_nodes_from_csv_once()      # 解析 CSV
      → _find_nodes()                   # 按 NodeId 去服务端找，写进 _node_registry
      → get_node_value / set_node_value # 只有注册过的名字才认

Uni-Lab-OS 仓库里带的是 `opcua_gn1.3.9.csv`，与用户指定的权威 1.4.0 表有 **11 处冲突**：

  【A】协议有、1.3.9 表没有（8 个）—— 驱动根本注册不到，工作流写了名字也读不动
      锁紧模块  Lock_AngleFB / Lock_FinalTorqueSet / Lock_PreTorqueLimit
                / Lock_PreTurnsSet / Lock_ScrewResult / Lock_TorqueFB
      离心机    Tare_the_scale / scale_weight
  【B】1.3.9 表有、1.4.0 已移除（3 个）—— 过时点位仍在注册
      Centrifuge_Temperature_feedback / Robot_Protective_stop_st / Solid_Remove_static
  （已核对：这 11 个名字在 61 个驱动 .py 里**零引用**，所以换表不会让驱动代码跑崩。）

按「一切冲突以 1.4.0 为准」，这里从 1.4.0 重新生成节点表，写到 wm_backend 自己的目录，
**不改上游 Uni-Lab-OS 仓库**，再由 `config.node_csv_path()` 指过来。

两处必须做的「拼写归一」（不做就会静默丢点，且日志只给一行 warning）
--------------------------------------------------------------------
`BaseOpcUaClient.load_csv` 用的是：

    data_type = DataType[data_type_str]      # 大小写敏感的**枚举精确匹配**

驱动枚举成员是 `BOOLEAN`（**没有 `BOOL`**）。1.3.9 表里 `OPEN_DOOR` / `COHSE_DOOR`
的数据类型写成小写 `bool` → 两行被 `continue` 跳过。实测吻合：
CSV 235 行，驱动只注册 233 个，`pending_nodes: 233`。**这就是那 2 个点位的下落。**

  · `bool` / `double` / `int16` … → 大写的枚举名（`BOOLEAN` / `DOUBLE` / `INT16`）
  · `REAL` → `FLOAT`：IEC 61131-3 的 REAL 就是 32 位浮点，驱动枚举里只有 FLOAT/DOUBLE
  · H 列留空的（`Oven_TimeMinuteSet`）→ 驱动对 VARIABLE 节点**强制要求**数据类型，
    留空同样整行跳过；参照同模块同类 `Oven_*Set` 补 `INT16`，并记进 DTYPE_DEVIATION 备案。

输出
----
  app/gn_adapter/node_tables/opcua_gn1.4.0.csv            驱动加载的节点表（UTF-8）
  app/gn_adapter/node_tables/opcua_gn1.4.0.manifest.json  审计清单（源 md5 / 冲突 / 归一记录）

CSV 用 **UTF-8** 写出（原表是 GBK，终端里全是乱码）；驱动的 `load_csv` 依次尝试
`utf-8-sig` / `gb18030` / `gbk`，UTF-8 是第一个尝试的，两者都能读。
"""
import csv
import hashlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gn_opcua_points as P                                    # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "app", "gn_adapter", "node_tables")
OUT_CSV = os.path.join(OUT_DIR, "opcua_gn1.4.0.csv")
OUT_MANIFEST = os.path.join(OUT_DIR, "opcua_gn1.4.0.manifest.json")

# 仓库里那份 1.3.9 旧表（只为比对冲突，不读它的内容做输出）
LEGACY_CSV = os.path.join(
    "/Users/fenglongli/Downloads/Uni-Lab-OS",
    "unilabos", "devices", "workstation", "GN", "opcua_gn1.3.9.csv")

# 权威源 xlsx（与 gen_gn_opcua_points.py 同一份，用于记 md5）
AUTHORITATIVE_XLSX = (
    "/Users/fenglongli/Library/Containers/com.tencent.xinWeChat/Data/Documents/"
    "xwechat_files/wxid_ovglq0xqjsls22_190e/temp/RWTemp/2026-10/"
    "9e20f478899dc29eb19741386f9343c8/OPC_UA协议1.4.0(2).xlsx"
)

# ---------------------------------------------------------------------------
# 协议数据类型 → 驱动 DataType 枚举成员
# 枚举实际成员（unilabos/device_comms/opcua_client/node/uniopcua.py）：
#   BOOLEAN SBYTE BYTE INT16 UINT16 INT32 UINT32 INT64 UINT64 FLOAT DOUBLE
#   STRING DATETIME BYTESTRING
# 注意：**没有 BOOL，也没有 REAL**。
# ---------------------------------------------------------------------------
DTYPE_TO_DRIVER = {
    "int16": "INT16",
    "uint16": "UINT16",
    "int32": "INT32",
    "uint32": "UINT32",
    "int64": "INT64",
    "uint64": "UINT64",
    "byte": "BYTE",
    "sbyte": "SBYTE",
    "double": "DOUBLE",
    "float": "FLOAT",
    "real": "FLOAT",       # IEC 61131-3 REAL = 32 位浮点
    "bool": "BOOLEAN",     # 驱动枚举成员写作 BOOLEAN
    "boolean": "BOOLEAN",
    "string": "STRING",
    "datetime": "DATETIME",
}

# 1.4.0 表内 H 列留空、但驱动强制要求数据类型的点位。
# 留空 → 驱动 `load_csv` 里「变量节点 X 必须指定数据类型」直接跳过整行，
# 所以必须补一个值；这里参照同模块同类点位取值，并**显式备案**便于审阅。
DTYPE_DEVIATION = {
    "Oven_TimeMinuteSet": (
        "INT16",
        "1.4.0 表内 H 列留空；驱动对 VARIABLE 节点强制要求数据类型（留空整行被跳过），"
        "参照同模块 Oven_TimeMinuteFB / Oven_TimeSecondSet 等均为 Int16 补齐",
    ),
}

CSV_HEADER = ["Name", "EnglishName", "NodeType", "DataType",
              "NodeLanguage", "NodeId", "Description", "ZhName", "Module"]


def _md5(path):
    if not os.path.isfile(path):
        return ""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_legacy_names():
    """1.3.9 旧表里的节点名集合（GBK），仅用于比对冲突。"""
    if not os.path.isfile(LEGACY_CSV):
        return set()
    rows = list(csv.reader(io.StringIO(
        open(LEGACY_CSV, encoding="gbk", errors="replace").read())))
    return {r[0].strip() for r in rows[1:] if r and r[0].strip()}


def build_rows():
    """1.4.0 点位 → CSV 行。返回 (rows, report)。"""
    rows = []
    dtype_fix = []          # 拼写归一记录
    deviations = []         # 留空补值记录
    for mod, pts in P.POINT_GROUPS:
        for p in pts:
            node = p["node"]
            raw = (p["dtype"] or "").strip()
            note = ""
            if node in DTYPE_DEVIATION:
                dtype, why = DTYPE_DEVIATION[node]
                deviations.append({"node": node, "dtype": dtype, "why": why})
                note = "（1.4.0 表内数据类型留空，已补齐：%s）" % dtype
            elif not raw:
                raise SystemExit(
                    "✘ 点位 %s 在 1.4.0 表里没有数据类型，且未在 DTYPE_DEVIATION 里备案。"
                    "留空会被驱动整行跳过，请先补一条备案。" % node)
            else:
                dtype = DTYPE_TO_DRIVER.get(raw.lower())
                if dtype is None:
                    raise SystemExit(
                        "✘ 点位 %s 的数据类型 %r 无法映射到驱动枚举。"
                        "请在 DTYPE_TO_DRIVER 里补映射。" % (node, raw))
                if dtype.lower() != raw.lower():
                    dtype_fix.append({"node": node, "proto": raw, "driver": dtype})

            desc = (p["desc"] or "").strip()
            rows.append({
                "Name": node,
                "EnglishName": node,
                "NodeType": "VARIABLE",
                "DataType": dtype,
                "NodeLanguage": "English",
                "NodeId": P.NS_PREFIX + node,
                "Description": (note + ("；" if note and desc else "") + desc).lstrip("；"),
                "ZhName": (p["name"] or "").strip(),
                "Module": mod,
            })
    return rows, {"dtype_fix": dtype_fix, "deviations": deviations}


def main():
    rows, fix = build_rows()
    legacy = load_legacy_names()
    names = [r["Name"] for r in rows]

    proto_names = {p["node"] for _, pts in P.POINT_GROUPS for p in pts}
    added = sorted(proto_names - legacy)      # 1.4.0 有、1.3.9 没有 → 本次补回
    removed = sorted(legacy - proto_names)    # 1.3.9 有、1.4.0 已移除 → 本次剔除

    # ---- 自查：必须一个不丢、一个不多 ----
    assert len(names) == len(set(names)), "生成结果有重名节点"
    assert set(names) == proto_names, "生成结果与 1.4.0 点位集合不一致"

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADER)
        w.writeheader()
        w.writerows(rows)

    manifest = {
        "authoritative_source": os.path.basename(AUTHORITATIVE_XLSX),
        "authoritative_md5": _md5(AUTHORITATIVE_XLSX),
        "generated_by": "scripts/gen_gn_node_table.py",
        "points_total": len(rows),
        "node_csv": OUT_CSV,
        "csv_encoding": "utf-8",
        "driver_enum_note": (
            "驱动 DataType[...] 为大小写敏感枚举精确匹配；成员含 BOOLEAN 但**没有 BOOL / REAL**"),
        "replaces": os.path.basename(LEGACY_CSV),
        "added_vs_legacy": added,
        "removed_vs_legacy": removed,
        "dtype_spelling_fixed": fix["dtype_fix"],
        "dtype_filled_from_blank": fix["deviations"],
    }
    with open(OUT_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("源（权威）：%s" % os.path.basename(AUTHORITATIVE_XLSX))
    print("           md5 %s" % manifest["authoritative_md5"])
    print("生成节点表：%s" % OUT_CSV)
    print("             %d 个点位（1.4.0 全量，无重名）" % len(rows))
    print("审计清单  ：%s" % OUT_MANIFEST)
    print()
    print("【补回】1.4.0 有、1.3.9 表缺失（%d 个）" % len(added))
    for n in added:
        print("   + %s" % n)
    print("【剔除】1.3.9 表有、1.4.0 已移除（%d 个）" % len(removed))
    for n in removed:
        print("   - %s" % n)
    print()
    print("【dtype 拼写归一】%d 处" % len(fix["dtype_fix"]))
    for d in fix["dtype_fix"]:
        print("   %-22s %s → %s" % (d["node"], d["proto"], d["driver"]))
    print("【dtype 留空补值并备案】%d 处" % len(fix["deviations"]))
    for d in fix["deviations"]:
        print("   %-22s → %s" % (d["node"], d["dtype"]))
    print()
    print("对比 1.3.9：%d 行 → %d 行（净 %+d）"
          % (len(legacy), len(rows), len(rows) - len(legacy)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
