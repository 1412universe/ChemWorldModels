#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 `OPC_UA协议1.4.0(2).xlsx`「点位表」抽取**逐模块的协议点位清单**，固化成
`gn_opcua_points.py`，供 `gen_gn_node_library.py` 生成节点库时使用。

为什么要单独抽：
  节点库的 `protocolNodes`（每个驱动有多少个 OPC UA 点位）原先是从 CWM-Lab 仓库里
  的 `opcua_gn1.3.9.csv` 数出来的 —— 那是 1.3.9 的旧清单，且与「用户指定的最权威
  1.4.0 表」不是同一份数据。同一张表的 G/H/I/J 列还给出了每个点位的中文名、
  数据类型、读写方向和取值说明，是「驱动节点信息」的权威来源，之前完全没被用上。

表结构（「点位表」，A1:J384，表头在第 5 行；有效点位 13 个模块 / 240 个）：
    A 设备模块     模块标题 + 换行的指令表（如 "锁紧模块\\n1=X向左\\n…\\n16=复位"）
                   ★ 模块标题行往往**同时携带该模块的第一个点位**（F/G 列有值）
    F NodeId       全路径 `ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA.<相对名>`
    G 点位名称      中文点位名
    H 数据类型      Int16 / bool / 空
    I 读写          R / W / w / 空
    J 描述          取值说明（如 "1指第一个动作…"）

坑（已修）：
  - 老实现用 `if a and not node` 判定模块标题行 → 标题行**也带 NodeId**，分支永不命中，
    于是全部点位被丢掉（曾输出「抽到 0 个点位」）。现在改成「A 首行非 `n=` 即开新组」，
    且**不**因为该行带点位而跳过。
  - 表内 F 列夹着杂项垃圾：`''` / `ss` / `会加倍` / `sdc` / `asd`；必须按命名空间前缀过滤。
  - 表尾 178/179 两行只有 NodeId、G/H/I/J 全空（178 与 177 完全重复；179 是 175 的截断版）
    → 按「元数据全空」过滤，并记入 DROPPED_ROWS 便于审计。

输出结构（gn_opcua_points.py）：
    SOURCE           源文件描述
    MODULE_ORDER     ['锁紧模块', '快换', …]            表内 A 列分组顺序
    MODULE_TO_DEVICE 模块标题 → 节点库 device id
    DEVICE_ACTIONS   {device: {n: 动作名}}              表内指令表（只作交叉校验）
    POINT_GROUPS     [(模块标题, [点位, ...]), ...]      按表内顺序
    DEVICE_POINTS    {device_id: [点位, ...]}           已按 MODULE_TO_DEVICE 归一
    每个点位 = dict(name, node, dtype, rw, desc)
"""
import os
import re
import sys

import openpyxl

# 权威源：用户 2026-10-14 提供的修订版 1.4.0 表（md5 1c12db10fae0f0a88c9b1d6f3d99d59c）
DEFAULT_XLSX = (
    "/Users/fenglongli/Library/Containers/com.tencent.xinWeChat/Data/Documents/"
    "xwechat_files/wxid_ovglq0xqjsls22_190e/temp/RWTemp/2026-10/"
    "9e20f478899dc29eb19741386f9343c8/OPC_UA协议1.4.0(2).xlsx"
)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gn_opcua_points.py')

SHEET = '点位表'
HEADER_ROW = 5                      # 表头所在行（1 基）
COL_A, COL_F, COL_G, COL_H, COL_I, COL_J = 0, 5, 6, 7, 8, 9

PW = 'ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA.'

# 点位表 A 列模块标题 → 节点库 device id
# （同一 device 的多个键名在下面用 ALIAS 指到同一个清单）
MODULE_TO_DEVICE = {
    '锁紧模块': 'gn_locking_mechanism',
    '快换': 'gn_quick_carrier_exchange',
    '快换模块': 'gn_quick_carrier_exchange',
    '离心机': 'gn_centrifuge',
    '离心管液体处理': 'gn_centrifuge_tube_liquid_handling',
    '堆栈': 'gn_rotary_stack',
    '旋转堆栈': 'gn_rotary_stack',
    '机械手': 'gn_robotic_arm',
    '固体加样': 'gn_solid_weighing',
    '常规烘箱': 'gn_standard_oven',
    '真空烘箱': 'gn_vacuum_oven',
    '七个液冷模块': 'gn_liquid_cooling',
    '液冷模块': 'gn_liquid_cooling',
    # 表内三个都是系统级节点，归到同一个 device
    '总复位': 'system',
    '停止': 'system',
    '报错信息': 'system',
    '系统': 'system',
}
# 同一模块的其它键名 → 复用同一份点位（gn_stack 与 gn_rotary_stack 共用 Stack_ 模块）
ALIAS = {'gn_stack': 'gn_rotary_stack'}

_CMD_RE = re.compile(r'^(\d+)\s*=\s*(.+)$')


def _cell(row, i):
    if i >= len(row) or row[i] is None:
        return ''
    return str(row[i]).strip()


def _split_cmds(title_cell):
    """从模块标题单元格里抠出「n=动作名」指令表（首行是标题，不是指令）。

    表内为省行数把多条指令挤在同一行，且有各种脏写法：
        "9=夹爪张开\\n10=夹爪夹紧  11=配重天平去皮"        ← 空格分隔
        "…47=模块4震荡关闭 48震荡模块夹爪开，49震荡夹爪关"  ← 空格 / 中文逗号，且 48/49 **缺 `=`**
        "1=启动\\n2=复位 100=开门，101=关门"
    而括号里的逗号**不是**分隔符："15=电批预锁(按圈数,不锁死)"。

    规则（顺序很重要）：
      ① 逗号 → 换行，但仅当其后紧跟「数字（可带 =）」时（保护括号内文本）；
      ② 在「非空白非数字 字符 + 空白 + 1~3 位数字（非数字收尾）」处断行（处理缺 `=` 的条目）；
      ③ 逐行取 `^数字 =? 名称`（名称可缺 `=`）。
    """
    lines = str(title_cell).split('\n')
    body = '\n'.join(lines[1:])                    # 丢掉模块标题行
    body = re.sub(r'[，,]\s*(?=\d{1,3}\s*=?)', '\n', body)
    body = re.sub(r'(?<=[^\s\d])[ \t\u3000]+(?=\d{1,3}[^\d])', '\n', body)
    cmds = {}
    for seg in body.split('\n'):
        m = re.match(r'^\s*(\d+)\s*=?\s*(.+?)\s*$', seg)
        if m and m.group(2).strip():
            cmds[int(m.group(1))] = m.group(2).strip()
    return cmds


def _is_title(first_line):
    """A 列某行的首行是否为「模块标题」（而不是指令行 / 表头 / 服务器地址）。"""
    if not first_line:
        return False
    if _CMD_RE.match(first_line):
        return False
    if first_line.startswith('OPC UA') or first_line.startswith('设备模块'):
        return False
    return True


def parse(xlsx_path):
    """→ (groups, cmd_tables, dropped)。

    groups=[(标题, [点位])]；cmd_tables={标题: {n: 动作名}}；
    dropped=[(行号, 原因, 原始 F 值)] —— 表内编辑残留，被过滤掉但记录在案便于审计。
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[SHEET]
    rows = [tuple(r) for r in ws.iter_rows(values_only=True)]

    groups = []          # [(标题, [点位])]
    cmd_tables = {}      # {标题: {n: 动作名}}
    dropped = []
    cur = None
    for idx, r in enumerate(rows, 1):
        if idx < HEADER_ROW:                      # 表头上方是服务器地址 / 空行
            continue
        a = _cell(r, COL_A)
        node = _cell(r, COL_F)
        name = _cell(r, COL_G)
        dtype = _cell(r, COL_H)
        rw = _cell(r, COL_I)
        desc = _cell(r, COL_J)

        # A 列首行不是 `n=` 就开一个新模块组；★ 该行可能同时带点位，不能 continue
        if a:
            first = a.split('\n')[0].strip()
            if _is_title(first):
                if first in cmd_tables:           # 同标题多段 → 合并指令表
                    cmd_tables[first].update(_split_cmds(a))
                else:
                    cmd_tables[first] = _split_cmds(a)
                if cur is None or cur[0] != first or cur[1]:
                    cur = (first, [])
                    groups.append(cur)

        if not node:
            if a and any((name, dtype, rw, desc)):
                dropped.append((idx, 'F 列无 NodeId', name or desc))
            continue
        if not node.startswith(PW):
            dropped.append((idx, '非本命名空间（表内杂项）', node))
            continue
        rel = node[len(PW):]
        # 表尾有 2 行编辑残留：只有 NodeId、G/H/I/J 全空
        # （行 178 与行 177 完全重复；行 179 是行 175 `Robot_Protective_stop_status` 的截断版）
        if not any((name, dtype, rw, desc)):
            dropped.append((idx, '只有 NodeId、元数据全空（残留）', rel))
            continue
        if cur is None:
            continue
        cur[1].append({
            'name': name,
            'node': rel,
            'dtype': dtype,
            'rw': rw,
            'desc': desc,
        })
    return groups, cmd_tables, dropped


def to_device_points(groups):
    out = {}
    for title, pts in groups:
        dev = MODULE_TO_DEVICE.get(title)
        if not dev:
            continue
        out.setdefault(dev, []).extend(pts)       # 同 device 多模块（如 system）→ 追加
    for alias, src in ALIAS.items():
        if src in out:
            out[alias] = [dict(p) for p in out[src]]
    return out


def to_device_actions(cmd_tables):
    """表内指令表 → {device: {n: 动作名}}（同一 device 多模块合并）。"""
    out = {}
    for title, cmds in cmd_tables.items():
        dev = MODULE_TO_DEVICE.get(title)
        if not dev or not cmds:
            continue
        out.setdefault(dev, {}).update(cmds)
    for alias, src in ALIAS.items():
        if src in out:
            out[alias] = dict(out[src])
    return out


Q3 = '"""'


def _raw_block(groups):
    """把分组写成紧凑的元组表（name/node/dtype/rw/desc），避免 dict 重复展开。"""
    body = ['\n# ---------- 表内原始分组（按 A 列出现顺序）----------\n',
            '# 元素 = (模块标题, [(点位名, NodeId相对名, 数据类型, 读写, 描述), ...])\n',
            '_RAW = [\n']
    for title, pts in groups:
        body.append('    (%r, [\n' % title)
        for p in pts:
            body.append('        (%r, %r, %r, %r, %r),\n'
                        % (p['name'], p['node'], p['dtype'], p['rw'], p['desc']))
        body.append('    ]),\n')
    body.append(']\n')
    return body


def emit(groups, cmd_tables, dev_points, dev_actions, dropped, src_desc, path=OUT):
    total = sum(len(p) for _, p in groups)
    head = (
        '# -*- coding: utf-8 -*-\n'
        + Q3 + 'OPC UA 1.4.0「点位表」逐模块点位清单 —— 由 scripts/gen_gn_opcua_points.py 生成，勿手改。\n'
        '\n'
        '源文件：' + src_desc + '\n'
        '点位合计：' + str(total) + ' 个 / 模块：' + str(len(groups)) + ' 组\n'
        '\n'
        '每个点位 = dict(name 中文点位名, node 命名空间内相对名, dtype 数据类型, rw 读写, desc 说明)\n'
        + Q3 + '\n'
        '\n'
        'SOURCE = ' + repr(src_desc) + '\n'
        'NS_PREFIX = ' + repr(PW) + '\n'
        'MODULE_ORDER = ' + repr([t for t, _ in groups]) + '\n'
        'MODULE_TO_DEVICE = ' + repr(MODULE_TO_DEVICE) + '\n'
        'ALIAS = ' + repr(ALIAS) + '\n'
    )
    body = [head]
    body += _raw_block(groups)
    body.append('\nPOINT_GROUPS = [\n    (t, [dict(name=n, node=nd, dtype=d, rw=r, desc=ds)\n'
                '         for (n, nd, d, r, ds) in pts])\n    for (t, pts) in _RAW\n]\n')
    body.append('\n# ---------- 按节点库 device id 归一 ----------\n')
    body.append('DEVICE_POINTS = {}\n')
    body.append('for (_t, _pts) in POINT_GROUPS:\n')
    body.append('    _d = MODULE_TO_DEVICE.get(_t)\n')
    body.append('    if _d:\n')
    body.append('        DEVICE_POINTS.setdefault(_d, []).extend(_pts)\n')
    body.append('for (_a, _s) in ALIAS.items():\n')
    body.append('    if _s in DEVICE_POINTS:\n')
    body.append('        DEVICE_POINTS[_a] = [dict(p) for p in DEVICE_POINTS[_s]]\n')
    body.append('\n# ---------- 表内指令表（各模块 A 列 `n=动作名`，用于交叉校验 ACTIONS）----------\n')
    body.append('DEVICE_ACTIONS = {\n')
    for dev in sorted(dev_actions):
        body.append('    %r: %r,\n' % (dev, dev_actions[dev]))
    body.append('}\n')
    body.append('\n\ndef points_of(device_id, rw=None):\n')
    body.append('    ' + Q3 + '某个驱动下的点位；rw="R"/"W" 可只取读/写方向。' + Q3 + '\n')
    body.append('    pts = DEVICE_POINTS.get(device_id) or []\n')
    body.append('    if rw:\n')
    body.append('        u = rw.upper()\n')
    body.append('        pts = [p for p in pts if (p.get("rw") or "").upper() == u]\n')
    body.append('    return pts\n\n')
    body.append('\ndef count_of(device_id):\n')
    body.append('    ' + Q3 + '某个驱动的点位总数（protocolNodes 的权威来源）。' + Q3 + '\n')
    body.append('    return len(DEVICE_POINTS.get(device_id) or [])\n\n')
    body.append('\ndef actions_of(device_id):\n')
    body.append('    ' + Q3 + '表内该模块的指令表 {n: 动作名}（无则空 dict）。' + Q3 + '\n')
    body.append('    return dict(DEVICE_ACTIONS.get(device_id) or {})\n')
    body.append('\n# ---------- 被过滤掉的行（表内残留，记录在案便于审计）----------\n')
    body.append('DROPPED_ROWS = [\n')
    for idx, why, raw in dropped:
        body.append('    (%r, %r, %r),\n' % (idx, why, raw))
    body.append(']\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(''.join(body))
    return total


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    groups, cmd_tables, dropped = parse(xlsx)
    dev_points = to_device_points(groups)
    dev_actions = to_device_actions(cmd_tables)
    total = emit(groups, cmd_tables, dev_points, dev_actions, dropped, os.path.basename(xlsx))
    print('源：%s' % os.path.basename(xlsx))
    print('抽到 %d 个模块分组 / %d 个点位（过滤残留 %d 行）' % (len(groups), total, len(dropped)))
    print('%-14s %5s  %-6s %s' % ('模块', '点位', '指令数', '→ device'))
    for title, pts in groups:
        dev = MODULE_TO_DEVICE.get(title, '—(未映射)')
        print('%-14s %5d  %-6s %s' % (title, len(pts), len(cmd_tables.get(title) or {}) or '-', dev))
    print()
    print('%-34s %5s' % ('device', '点位'))
    for dev in sorted(dev_points):
        print('%-34s %5d' % (dev, len(dev_points[dev])))
    missing = [d for d in dev_points
               if d not in MODULE_TO_DEVICE.values() and d not in ALIAS]
    print('未映射的 device：', missing or '无')
    print('被过滤的行：')
    for idx, why, raw in dropped:
        print('   行%-4d %-26s %s' % (idx, why, raw))
    print('已写出 %s' % OUT)


if __name__ == '__main__':
    main()
