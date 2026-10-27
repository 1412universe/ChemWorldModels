#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Uni-Lab-OS GN 工作台真实资产 + OPC UA 协议 1.4.0 提炼「工作流编辑器」节点库。

数据源（均为真实可执行来源）：
  1) 9 个真实工作流 JSON  （/Users/fenglongli/Downloads/Uni-Lab-OS/unilabos/devices/workstation/GN/*.json）
  2) 设备驱动文件         （gn_*.py / rotary_stack.py / robotic_arm.py 的 Command 枚举）
  3) **OPC_UA协议1.4.0(2).xlsx「点位表」** → scripts/gn_opcua_points.py
     —— 提供**逐模块的 240 个协议点位清单**（点位名 / NodeId / 数据类型 / 读写 / 说明），
        是每个驱动 `protocolNodes` 计数与 `points` 明细的唯一权威来源。
        （旧实现数的是 Uni-Lab-OS 里的 `opcua_gn1.3.9.csv` 前缀，属 1.3.9 旧清单，
         且会漏掉 `scale_weight`、`OPEN_DOOR`、`Cooling_CmdType` 这类不按前缀命名的点位，
         还会把 `Liquid_Cooling_*` 错算到 PRCXI('Liquid_') 头上 —— 已废弃。）
  4) **OPC_UA协议1.4.0(2).xlsx** → scripts/gn_opcua_140.py
     —— 提供权威的「指令类型取值表 / 参数中文名 / 单位 / 范围 / 说明 / 互锁规则」

输出：static/assets/gn_node_library.js（window.GN_NODE_LIBRARY）
     每个 action 的 params 现在带 `meta`（中文名 label / 单位 unit / 读写 rw / 说明 desc），
     供编辑器 UI 直接渲染「具体、可读」的参数面板；
     每个 device 现在带 `points`（1.4.0 表内点位明细）+ `pointStats`（R/W 计数）。
"""
import json, glob, os, re, sys
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gn_opcua_140 as P140       # noqa: E402  权威 1.4.0 协议元数据（动作表 / 参数元数据）
import gn_opcua_points as PT      # noqa: E402  权威 1.4.0 点位清单（240 个有效点位）

BASE = '/Users/fenglongli/Downloads/Uni-Lab-OS/unilabos/devices/workstation/GN'
OUT  = os.path.join(os.path.dirname(__file__), '..', 'static', 'assets', 'gn_node_library.js')


def _pick_workflow_dir():
    """工作流 JSON 目录：同机有两份 Uni-Lab-OS 副本，取含 JSON 最多的那个。"""
    cands = [BASE,
             '/Users/fenglongli/Downloads/unilabWorld/Uni-Lab-OS/unilabos/devices/workstation/GN']
    best, best_n = BASE, -1
    for d in cands:
        if not os.path.isdir(d):
            continue
        n = len(glob.glob(os.path.join(d, '*.json')))
        if n > best_n:
            best, best_n = d, n
    return best


# ---------- 1. 设备元信息（中文名 / 协议前缀 / 说明，与驱动一一对应） ----------
# 说明：label/protocol/desc 会被 gn_opcua_140.DEVICE_DESC（1.4.0 权威）覆盖；此表用于
# 决定设备的**输出顺序**与兜底元信息。
DEVICE_META = {
    'gn_locking_mechanism': dict(label='锁紧机构',  protocol='Lock_',    desc='锁紧机构：夹具取放 / 拧紧松开螺丝'),
    'gn_quick_carrier_exchange': dict(label='快换模块', protocol='QuickChange_', desc='快换模块：物料弹出 / 放置 / 磁力搅拌'),
    'gn_centrifuge':    dict(label='离心机',        protocol='Centrifuge_', desc='离心机：装载 / 运行 / 卸载 / 复位'),
    'gn_centrifuge_tube_liquid_handling': dict(label='离心管液体处理', protocol='Tube_', desc='离心管液体处理：移液 / 取放 / 温控模块'),
    'gn_rotary_stack':  dict(label='旋转堆栈',      protocol='Stack_',   desc='旋转堆栈：列定位 / 相机检测 / 复位'),
    'gn_stack':         dict(label='旋转堆栈',      protocol='Stack_',   desc='旋转堆栈（gn_stack 键名，同一 Stack_ 模块）'),
    'gn_robotic_arm':   dict(label='机械臂',        protocol='Robot_',   desc='机械臂：抓取 / 放置（跨设备搬运）'),
    'gn_solid_weighing': dict(label='固体称量',     protocol='Solid_',   desc='固体称量：下料 / 抓取放置 / 天平称量'),
    'gn_standard_oven': dict(label='标准烘箱',      protocol='Oven_',    desc='标准烘箱：启动加热 / 复位 / 开门关门'),
    'gn_vacuum_oven':   dict(label='真空干燥箱',    protocol='VacuumOven_', desc='真空干燥箱：真空加热 / 复位 / 开门关门'),
    'gn_liquid_cooling': dict(label='液冷模块',     protocol='Liquid_Cooling_', desc='七个液冷模块：温度设置 / 开启 / 关闭'),
    'system':           dict(label='系统总控',      protocol='System_',  desc='系统总控：总复位 / 停止 / 报错输出'),
    'PRCXI':            dict(label='移液工作站',    protocol='Liquid_',  desc='移液工作站：移液 / 协议创建运行 / 板搬运'),
}
# 1.4.0 权威描述覆盖
for _k, _v in P140.DEVICE_DESC.items():
    if _k in DEVICE_META:
        DEVICE_META[_k].update(_v)

# 命令枚举 → 中文动作标签：**以 1.4.0 协议表为准**（缺失的设备回落到下方旧表）
CMD_LABELS = {k: dict(v) for k, v in P140.ACTIONS.items()}
CMD_LABELS.setdefault('gn_rotary_stack', {1:'左旋转',2:'右旋转',3:'相机Z向上',4:'相机Z向下',5:'旋转至目标位置',6:'相机检测有无',7:'复位'})
CMD_LABELS.setdefault('gn_stack', dict(CMD_LABELS['gn_rotary_stack']))
# 机械手在真实工作流中一律用 name 式高层动作（pick/place），指令表只作文档参考，
# 故从 CMD_LABELS 移除，让它走 NAME_ACTIONS 分支（保持与既有节点库一致的行为）。
CMD_LABELS.pop('gn_robotic_arm', None)

# 无 cmd_type 设备的高层动作（name=动作名，与真实工作流 JSON / 驱动一致）
NAME_ACTIONS = {
    'gn_robotic_arm': [('pick','机械臂抓取'),('place','机械臂放置')],
    'gn_centrifuge_tube_liquid_handling': [
        ('auto-ch8_load','CH8 装载枪头'),('auto-ch8_aspirate','CH8 吸取液体'),
        ('auto-ch8_dispense','CH8 排出液体'),('auto-ch8_mix','CH8 混匀'),
        ('auto-ch8_unload','CH8 卸载枪头'),('auto-big_gripper_pick','大夹爪抓取'),
        ('auto-big_gripper_place','大夹爪放置'),
    ],
    'system': [('reset','系统总复位'),('stop','系统停止'),('error_alarm','报错输出(蜂鸣器+红灯)')],
    'PRCXI': [
        ('transfer_liquid','移液'),('auto-create_protocol','创建移液协议'),
        ('auto-run_protocol','运行移液协议'),('move_plate','搬运孔板'),
        ('titration_liquid','滴注液体'),('auto-shaking_incubation_action','震荡孵育'),
    ],
}

# 真实工作流未覆盖、但协议明确存在的参数默认值（补进对应动作）
FALLBACK_PARAMS = {
    ('gn_liquid_cooling', 1): {'temperature': {'type':'int','min':0,'max':200,'default':25}},
    ('gn_centrifuge', 11): {'timeout': {'type':'int','min':1,'max':3600,'default':120}},
    ('gn_locking_mechanism', 15): {'timeout': {'type':'int','min':1,'max':3600,'default':120}},
    ('gn_locking_mechanism', 11): {'timeout': {'type':'int','min':1,'max':3600,'default':120}},
}

# ---------- PRCXI 参数元数据（中文名 / 单位 / 说明 / 类型纠正） ----------
# PRCXI 是 name 式设备（无 OPC cmd_type），不在 1.4.0 协议表里，因此 P140.param_meta
# 对它一无所知 → 之前节点库把参数名原样当 label 输出，编辑器里全是英文键。
# 这里按**驱动 build_steps / 真实工作流取值**逐项补中文名与单位。
PRCXI_PARAM_META = {
    # —— 板位 / 资源（编辑器 4×4 板位点选器直接绑定这些）——
    'sources':                    dict(label='源板位',     unit='', desc='吸取液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）'),
    'targets':                    dict(label='目标板位',   unit='', desc='排出液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）'),
    'tip_racks':                  dict(label='枪头盒板位', unit='', desc='装载枪头的枪头盒资源实例列表（JSON 数组）'),
    'plate':                      dict(label='搬运耗材',   unit='', desc='被夹爪搬运的孔板/耗材资源实例（JSON 数组）'),
    'from':                       dict(label='起点板位',   unit='号', desc='搬运起点板位号（1..16；3/4 号位夹爪行程不覆盖）', type='int', min=1, max=16),
    'to':                         dict(label='终点板位',   unit='号', desc='搬运终点板位号（1..16；3/4 号位夹爪行程不覆盖）', type='int', min=1, max=16),
    'source_slots':               dict(label='源板位数',   unit='个', desc='源板位占用孔位数（2..16）'),
    'target_slots':               dict(label='目标板位数', unit='个', desc='目标板位占用孔位数（3..16）'),
    'tip_rack_slots':             dict(label='枪头盒板位数', unit='个', desc='枪头盒板位占用孔位数（11..15，即 10/11/12/15 号位）'),
    # —— 体积 / 流速 ——
    'asp_vols':                   dict(label='吸取体积',   unit='µL', desc='每个源板位的吸取体积（JSON 数组）'),
    'dis_vols':                   dict(label='排出体积',   unit='µL', desc='每个目标板位的排出体积（JSON 数组）'),
    'asp_flow_rates':             dict(label='吸取流速',   unit='µL/s', desc='吸取流速（JSON 数组）'),
    'dis_flow_rates':             dict(label='排出流速',   unit='µL/s', desc='排出流速（JSON 数组）'),
    'post_air_volume':            dict(label='后置空气体积', unit='µL', desc='排液后追加的空气柱体积（JSON 数组）', type='json'),
    'blow_out_air_volume':        dict(label='吹出空气体积', unit='µL', desc='吹出残液的空气体积（JSON 数组）', type='json'),
    'blow_out_air_volume_before': dict(label='前置吹出空气体积', unit='µL', desc='吸取前预吹的空气体积（JSON 数组）', type='json'),
    'liquid_height':              dict(label='液面高度',   unit='mm', desc='按液面高度追踪吸液（JSON 数组）', type='json'),
    'hover_below_liquid_level':   dict(label='液面下悬停距离', unit='mm', desc='吸头在液面下方的悬停距离（JSON 数组）', type='json'),
    'z_start_point_offset_height': dict(label='Z 起点偏移', unit='mm', desc='Z 轴起始点高度偏移（JSON 数组）', type='json'),
    'post_discharge_pause_time_ms': dict(label='排液后停顿', unit='ms', desc='排出完成后停顿时间（JSON 数组）', type='json'),
    'use_channels':               dict(label='使用通道',   unit='', desc='使用的移液通道编号（JSON 数组，空=自动）'),
    'offsets':                    dict(label='位置偏移',   unit='mm', desc='孔位位置偏移（JSON 数组）', type='json'),
    'delays':                     dict(label='分段延时',   unit='s', desc='分段动作间的等待时间（JSON 数组）'),
    'spread':                     dict(label='液面扩散模式', unit='', desc='枪头在液面中的扩散方式', type='string'),
    'mix_stage':                  dict(label='混匀时机',   unit='', desc='混匀发生在吸排之前/之后（none=不混匀）'),
    'mix_vol':                    dict(label='混匀体积',   unit='µL', desc='混匀行程对应的体积', type='number', default=0),
    'mix_rate':                   dict(label='混匀流速',   unit='µL/s', desc='混匀吸排流速', type='number', default=0),
    'mix_times':                  dict(label='混匀次数',   unit='次', desc='混匀反复次数', type='int', default=0),
    'mix_liquid_height':          dict(label='混匀液面高度', unit='mm', desc='混匀时的液面高度', type='number', default=0),
    'dispensing_method':          dict(label='排液方式',   unit='', desc='贴壁排液方式（如 BottleNeck / DiveToBottom）'),
    'touch_tip':                  dict(label='触壁',       unit='', desc='排出后枪头触碰孔壁去除挂滴'),
    'is_96_well':                 dict(label='96 孔板模式', unit='', desc='按 96 孔板（8×12）排布处理'),
    'none_keys':                  dict(label='忽略参数',   unit='', desc='本次调用显式忽略的参数名（JSON 数组）'),
    # —— 协议 / 搬运 ——
    'protocol_name':              dict(label='方案名',     unit='', desc='要登记的移液方案名称', type='string'),
    'protocol_id':                dict(label='方案 ID',    unit='', desc='要运行的移液方案 ID', type='string'),
    'protocol_type':              dict(label='方案类型',   unit='', desc='协议类型（留空用默认）', type='string'),
    'protocol_version':           dict(label='方案版本',   unit='', desc='协议版本（留空用默认）', type='string'),
    'protocol_author':            dict(label='方案作者',   unit='', desc='协议作者（留空用默认）', type='string'),
    'protocol_date':              dict(label='方案日期',   unit='', desc='协议日期（留空用默认）', type='string'),
    'protocol_description':       dict(label='方案说明',   unit='', desc='协议备注说明', type='string'),
    'force':                      dict(label='夹持力',     unit='', desc='夹爪夹持力档位（1..5）', type='int', min=1, max=5),
    'hierarchy':                  dict(label='层级',       unit='', desc='搬运层级（1=单层）'),
    'get_direction':              dict(label='取件方向',   unit='', desc='夹爪取件方向'),
    'put_direction':              dict(label='放件方向',   unit='', desc='夹爪放件方向'),
    'pickup_direction':           dict(label='抓取方向',   unit='', desc='抓取方向'),
    'drop_direction':             dict(label='落料方向',   unit='', desc='落料方向'),
    'pickup_offset':              dict(label='抓取偏移',   unit='mm', desc='抓取位置偏移 {x,y,z}'),
    'resource_offset':            dict(label='物料偏移',   unit='mm', desc='物料尺寸偏移 {x,y,z}'),
    'destination_offset':         dict(label='目标偏移',   unit='mm', desc='目标位置偏移 {x,y,z}'),
    'pickup_distance_from_top':   dict(label='顶面抓取距离', unit='mm', desc='从顶面下探的抓取距离'),
    'put_down_position':          dict(label='放置位置档位', unit='', desc='放置动作档位（1/2）'),
    'pinch_it_up_position':       dict(label='夹紧档位',   unit='', desc='夹紧动作档位（1/2）'),
    'intermediate_locations':     dict(label='中间路径点', unit='', desc='搬运中间经过的板位号（JSON 数组）'),
    # —— 滴注 / 震荡孵育 ——
    'repeat_count':               dict(label='重复次数',   unit='次', desc='滴注循环次数'),
    'cycle_delay_s':              dict(label='周期间隔',   unit='s', desc='两次滴注之间的等待时间'),
    'time':                       dict(label='时长',       unit='s', desc='震荡孵育时长（秒）'),
    'is_wait':                    dict(label='阻塞等待',   unit='', desc='是否阻塞等待震荡孵育完成'),
    'amplitude':                  dict(label='振幅',       unit='rpm', desc='震荡转速/振幅档位'),
    'module_no':                  dict(label='温控模块号', unit='号', desc='震荡孵育使用的温控模块编号'),
    'temperature':                dict(label='温度',       unit='℃', desc='震荡孵育设定温度（28..50℃）'),
}

# PRCXI 动作 → 板位角色（编辑器据此渲染 4×4 板位点选器；顺序即 UI 顺序）
PRCXI_DECK_ROLES = {
    'transfer_liquid': [
        dict(key='source', label='来源 source', param='sources',   value='resource',
             accept=['trough','deepWell','reader','transfer','spare','sonic'], multi=True),
        dict(key='target', label='目标 target', param='targets',   value='resource',
             accept=['deepWell','reader','trough','transfer','spare'], multi=True),
        dict(key='tips',   label='枪头 tips',  param='tip_racks', value='resource',
             accept=['tip'], multi=True),
    ],
    'titration_liquid': [
        dict(key='source', label='来源 source', param='sources',   value='resource',
             accept=['trough','deepWell','reader','transfer','spare','sonic'], multi=True),
        dict(key='target', label='目标 target', param='targets',   value='resource',
             accept=['deepWell','reader','trough','transfer','spare'], multi=True),
        dict(key='tips',   label='枪头 tips',  param='tip_racks', value='resource',
             accept=['tip'], multi=True),
    ],
    'move_plate': [
        dict(key='from',  label='起点 from', param='from',  value='slot',
             accept=['trough','deepWell','reader','tip','transfer','spare','sonic'], multi=False),
        dict(key='to',    label='终点 to',   param='to',    value='slot',
             accept=['trough','deepWell','reader','tip','transfer','spare','sonic'], multi=False),
        dict(key='plate', label='搬运耗材',   param='plate', value='resource',
             accept=['trough','deepWell','reader','tip','transfer','spare','sonic'], multi=True),
    ],
}


# ---------- 2. 从真实工作流 JSON 聚合 设备×动作 的参数默认值/取值 ----------
def load_workflows(base=None):
    wfs = []
    for f in glob.glob(os.path.join(base or _pick_workflow_dir(), '*.json')):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        if isinstance(d, dict) and 'data' in d and isinstance(d['data'].get('nodes'), list):
            wfs.append(d)
    return wfs

def param_stats(nodes):
    """返回 {key: {vals:[...], types:set}}（忽略 cmd_type）"""
    st = defaultdict(lambda: {'vals': [], 'types': set()})
    for n in nodes:
        p = n.get('param') or {}
        for k, v in p.items():
            if k == 'cmd_type':
                continue
            st[k]['vals'].append(v)
            st[k]['types'].add(type(v).__name__)
    return st

def infer_schema(key, s):
    """由真实取值推断参数 schema"""
    vals = s['vals']
    types = s['types']
    try:
        uniq = set(vals)
        hashable = True
    except TypeError:
        uniq = set()
        hashable = False
    if types == {'bool'} or (hashable and all(isinstance(v, bool) for v in vals if v is not None)):
        return {'type': 'bool', 'default': True if vals and vals[-1] else False}
    if types and types <= {'int'}:
        lo, hi = min(vals), max(vals)
        return {'type': 'int', 'min': lo, 'max': hi, 'default': vals[-1]}
    if types and types <= {'int', 'float'}:
        lo, hi = min(vals), max(vals)
        return {'type': 'number', 'min': lo, 'max': hi, 'default': vals[-1]}
    # 只出现过一个取值时做成枚举，编辑器里就只剩一个选项，无法改。留给文本框。
    if hashable and 1 < len(uniq) <= 8 and all(
            isinstance(v, (str, int, float)) and not isinstance(v, bool) for v in uniq):
        return {'type': 'enum', 'options': sorted(uniq, key=str), 'default': vals[-1]}
    if 'list' in types:
        return {'type': 'json', 'default': json.dumps(vals[-1], ensure_ascii=False) if vals else '[]'}
    return {'type': 'string', 'default': str(vals[-1]) if vals else ''}

def attach_meta(params):
    """给每个参数 schema 附上协议元数据（中文名/单位/读写/范围/说明）。

    元数据来源：① 1.4.0 协议表 P140.param_meta（OPC cmd_type 设备）；
    ② PRCXI_PARAM_META（name 式 PRCXI，协议表不覆盖）—— 后者还可纠正
    attach_meta 之前由样本推断出的错误类型/范围（如 move_plate 的 from/to 被推断成 3..16）。

    产出结构（供编辑器 UI 直接消费）：
        schema['meta'] = {key, label, unit, rw, desc, options?}
        schema['unit'] / schema['desc'] 同步提升到 schema 顶层，便于快捷渲染。
    """
    for k, sch in (params or {}).items():
        m = P140.param_meta(k) or PRCXI_PARAM_META.get(k) or {}
        meta = {'key': k, 'label': m.get('label') or k}
        for kk in ('unit', 'rw', 'desc'):
            if m.get(kk):
                meta[kk] = m[kk]
        # 协议给定范围优先（比工作流样本推断更权威）
        for kk in ('min', 'max'):
            if m.get(kk) is not None:
                sch[kk] = m[kk]
        # 协议给定类型优先（纠正样本推断：protocol_id 被推成 bool、from/to 被推成 3..16、
        # offsets/liquid_height 这类「样本里全是 null/false」的数组参数被推成 bool）
        if m.get('type'):
            sch['type'] = m['type']
        if m.get('type') == 'json':
            dv = sch.get('default')
            if not isinstance(dv, str) or not dv.strip().startswith('['):
                sch['default'] = m.get('default') or '[]'
        if m.get('default') is not None and m.get('type') in ('int', 'number'):
            sch['default'] = m['default']
        # 机械手工站编号 → 枚举下拉
        if k == 'station':
            meta['options'] = {str(a): b for a, b in P140.STATION_MAP.items()}
            sch['type'] = 'enum'
            sch['options'] = list(P140.STATION_MAP.keys())
            # 归一 default：真实工作流常存设备别名字符串（如 'stack'）→ 工站编号
            dv = sch.get('default')
            if isinstance(dv, str):
                sch['default'] = P140.STATION_ALIAS.get(dv.strip().lower(), 8)
            elif not isinstance(dv, int):
                sch['default'] = 8
        if k == 'plate_no':
            meta['options'] = {'1': '板位1', '2': '板位2', '3': '板位3', '4': '板位4'}
            sch['type'] = 'enum'
            sch['options'] = [1, 2, 3, 4]
        sch['meta'] = meta
        if m.get('unit'):
            sch['unit'] = m['unit']
        if m.get('desc'):
            sch['desc'] = m['desc']
    return params

# 机械手工站键与 GN/robotic_arm.py STATIONS 一致（驱动按字符串查表，不接受模块号）
_ARM_STATIONS = [
    ('oven', '常规烘箱'), ('locking', '锁紧'), ('quick_change', '快换'),
    ('centrifuge', '离心机'), ('vacuum_oven', '真空烘箱'), ('nine9320', '9320'),
    ('tube', '离心管液体处理'), ('stack', '堆栈'), ('solid', '固体加样'),
    ('finished_area', '成品放置位'),
]
_ARM_ALIAS = {
    '1': 'oven', '2': 'locking', '3': 'quick_change', '4': 'centrifuge',
    '5': 'vacuum_oven', '6': 'nine9320', '7': 'tube', '8': 'stack',
    '9': 'solid', '10': 'finished_area',
    'oven': 'oven', 'furnace': 'oven', 'gn_standard_oven': 'oven',
    'lock': 'locking', 'locking': 'locking', 'locking_mechanism': 'locking',
    'quick': 'quick_change', 'quickchange': 'quick_change',
    'quick_carrier_exchange': 'quick_change', 'quick_change': 'quick_change',
    'centrifuge': 'centrifuge', 'centri': 'centrifuge',
    'vacuum': 'vacuum_oven', 'voven': 'vacuum_oven', 'vacuum_oven': 'vacuum_oven',
    'nine9320': 'nine9320', '9320': 'nine9320', 'prcxi': 'nine9320',
    'tube': 'tube', 'tubeh': 'tube',
    'stack': 'stack', 'rotary_stack': 'stack',
    'solid': 'solid', 'balance': 'solid', 'solid_weighing': 'solid',
    'finished': 'finished_area', 'finished_area': 'finished_area',
    'finished_product_area': 'finished_area', 'product': 'finished_area',
}
_ARM_EXTRA_LABELS = {
    'transfer': '机械臂搬运',
    'move_to_station': '平移到工站',
    'enable': '机械臂使能',
    'disable': '机械臂失能',
    'go_home': '机械臂回零',
    'reset': '机械臂复位',
    'stop': '机械臂停止',
}
_SYSTEM_METHOD = {'reset': 'system_reset', 'stop': 'system_stop'}
_SKIP_METHODS = {
    'get_plc_stats', 'get_system_ready', 'get_status',
    'reconnect_plc', 'release_plc',
}


def _unwrap_ann(ann):
    import typing
    origin = getattr(ann, '__origin__', None)
    if origin is typing.Union:
        args = [a for a in getattr(ann, '__args__', ()) if a is not type(None)]
        if len(args) == 1:
            return args[0]
    return ann


def _schema_of(fn, skip=()):
    """按驱动方法签名生成参数 schema。Optional 且默认 None 的键不填 0。"""
    import inspect
    import typing
    sig = inspect.signature(fn)
    try:
        hints = typing.get_type_hints(fn)
    except Exception:
        hints = {}
    params = {}
    for p in sig.parameters.values():
        if p.name == 'self' or p.name in skip:
            continue
        if p.kind in (inspect.Parameter.VAR_KEYWORD, inspect.Parameter.VAR_POSITIONAL):
            continue
        ann = _unwrap_ann(hints.get(p.name))
        if ann is int:
            typ = 'int'
        elif ann is float:
            typ = 'number'
        elif ann is bool:
            typ = 'bool'
        else:
            typ = 'string'
        sch = {'type': typ}
        if p.default is inspect.Parameter.empty:
            pass
        elif p.default is None:
            sch['optional'] = True
        else:
            sch['default'] = p.default
        params[p.name] = sch
    return params


def _driver_methods(cls):
    import inspect
    out = {}
    for name, member in inspect.getmembers(cls, predicate=inspect.isfunction):
        if name.startswith('_') or name in _SKIP_METHODS:
            continue
        if not hasattr(member, '_action_registry_meta'):
            continue
        out[name] = member
    return out


def _finish_schema(params):
    """协议中文名挂上之后，可选参数仍保持空白，避免左旋转把位置写成 0。"""
    optional = {k for k, s in params.items() if s.get('optional')}
    required = {k for k, s in params.items() if 'default' not in s and not s.get('optional')}
    attach_meta(params)
    for k in optional | required:
        params[k].pop('default', None)
    for k, sch in params.items():
        if k in ('station', 'source', 'target'):
            sch['type'] = 'enum'
            sch['options'] = [a for a, _b in _ARM_STATIONS]
            sch['alias'] = dict(_ARM_ALIAS)
            meta = sch.setdefault('meta', {'key': k})
            meta['options'] = {a: b for a, b in _ARM_STATIONS}
            meta['label'] = {'station': '目标工站', 'source': '起点工站', 'target': '终点工站'}.get(k, meta.get('label') or k)
            if k in required:
                sch.pop('default', None)
            elif sch.get('default') not in sch['options']:
                sch.pop('default', None)
        if k == 'item_type':
            sch['type'] = 'enum'
            sch['options'] = ['plate', 'bottle']
            sch['default'] = 'plate'
            meta = sch.setdefault('meta', {'key': k})
            meta['options'] = {'plate': '孔板', 'bottle': '瓶'}
    return params


def apply_driver_signatures(devices):
    """用仓库 GN/ 驱动的方法签名覆盖节点库参数。PRCXI 仍走移液协议，不在这里改。"""
    import copy
    import os
    import sys
    wm = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if wm not in sys.path:
        sys.path.insert(0, wm)
    from app.gn_adapter.drivers import load
    cat = load()
    for dev in devices:
        dev_id = dev.get('id')
        if dev_id == 'PRCXI' or not cat.has(dev_id):
            continue
        cls = cat.get(dev_id)
        if cls is None:
            continue
        methods = _driver_methods(cls)
        if dev.get('kind') == 'cmd' and 'execute_command' in methods:
            params = _finish_schema(_schema_of(methods['execute_command'], skip={'cmd_type'}))
            for act in dev.get('actions') or []:
                act['params'] = copy.deepcopy(params)
            continue
        if dev.get('kind') != 'name':
            continue
        actions = dev.setdefault('actions', [])
        seen = set()
        for act in actions:
            raw = str(act.get('name') or '')
            key = raw[5:] if raw.startswith('auto-') else raw
            method = _SYSTEM_METHOD.get(key, key)
            seen.add(method)
            if method not in methods:
                continue
            act['params'] = _finish_schema(_schema_of(methods[method]))
        if dev_id != 'gn_robotic_arm':
            continue
        for method, label in _ARM_EXTRA_LABELS.items():
            if method in seen or method not in methods:
                continue
            actions.append({
                'name': method,
                'label': label,
                'inRealWorkflow': False,
                'count': 0,
                'params': _finish_schema(_schema_of(methods[method])),
            })


# 离心管每个指令号的预设参数。来自 wm_model/tube_execute.py 的整段动作。
# 同一指令号出现两次时，这里用第一次的点位；第二次在节点上改数字。
# 填进节点库的 default 会在新建节点时写进 param，真机和仿真都按这个下发。
TUBE_CMD_DEFAULTS = {
    1: {"x_pos": 3095, "x_speed": 500},
    2: {"x_pos": 0, "x_speed": 500},
    3: {"y_pos": -2090, "y_speed": 500},
    4: {"y_pos": 0, "y_speed": 500},
    19: {"x_pos": 3095, "y_pos": -2090, "z1_pos": 905, "p1_pos": 500,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    20: {"x_pos": 4563, "y_pos": -2121, "z1_pos": 900, "p1_pos": 300,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    21: {"x_pos": 3093, "y_pos": -3181, "z1_pos": 1330, "p1_pos": 300,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    22: {"x_pos": 2463, "y_pos": -581, "z1_pos": 1027, "p1_pos": 500,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 3000,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    23: {"x_pos": 720, "y_pos": -850, "p2_pos": 2000, "z3_pos": 1030,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500, "p2_speed": 500,
         "z3_speed": 500, "z4_speed": 500, "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    24: {"x_pos": 7920, "y_pos": -2250, "p1_pos": 300, "p2_pos": 2000, "z3_pos": 1130,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    25: {"x_pos": 3920, "y_pos": -2250, "p1_pos": 300, "p2_pos": 2000, "z3_pos": 930,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    26: {"x_pos": 20, "y_pos": -850, "p1_pos": 500, "p2_pos": 2000, "z3_pos": 1030,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    27: {"x_pos": 6670, "y_pos": -2300,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500, "p2_speed": 500,
         "z3_speed": 500, "z4_speed": 500,
         "small_gripper_angle": 540, "small_gripper_force": 500,
         "open_lid_start": 1390, "open_lid_end": 1330, "open_lid_speed": 40,
         "open_lid_rotation_speed": 300,
         "close_lid_start": 1330, "close_lid_end": 1390, "close_lid_speed": 40,
         "close_lid_rotation_speed": 300},
    28: {"x_pos": 6670, "y_pos": -2300,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500, "p2_speed": 500,
         "z3_speed": 500, "z4_speed": 500,
         "small_gripper_angle": -540, "small_gripper_force": 300,
         "open_lid_start": 1390, "open_lid_end": 1330, "open_lid_speed": 40,
         "open_lid_rotation_speed": 300,
         "close_lid_start": 1330, "close_lid_end": 1390, "close_lid_speed": 40,
         "close_lid_rotation_speed": 300},
    29: {"x_pos": 6330, "y_pos": -480, "z4_pos": 1375,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500, "p2_speed": 500,
         "z3_speed": 500, "z4_speed": 500,
         "small_gripper_angle": 540, "small_gripper_force": 300,
         "open_lid_start": 1390, "open_lid_end": 1330, "open_lid_speed": 40,
         "open_lid_rotation_speed": 300,
         "close_lid_start": 1330, "close_lid_end": 1390, "close_lid_speed": 40,
         "close_lid_rotation_speed": 300},
    30: {"x_pos": 6330, "y_pos": -480, "z4_pos": 1375,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500, "p2_speed": 500,
         "z3_speed": 500, "z4_speed": 500,
         "small_gripper_angle": 540, "small_gripper_force": 300,
         "open_lid_start": 1390, "open_lid_end": 1330, "open_lid_speed": 40,
         "open_lid_rotation_speed": 300,
         "close_lid_start": 1330, "close_lid_end": 1390, "close_lid_speed": 40,
         "close_lid_rotation_speed": 300},
    31: {"x_pos": 2490, "y_pos": -3200, "z2_pos": 1420,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500},
    32: {"x_pos": 7100, "y_pos": -3550, "z2_pos": 1215,
         "x_speed": 500, "y_speed": 500, "z2_speed": 500},
    33: {"x_pos": 3920, "y_pos": -2250, "p1_pos": 300, "p2_pos": 2000, "z3_pos": 930,
         "mix_counts": 5,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    34: {"x_pos": 3093, "y_pos": -3181, "z1_pos": 1330, "p1_pos": 300, "mix_counts": 5,
         "x_speed": 500, "y_speed": 500, "z1_speed": 500, "p1_speed": 500,
         "z2_speed": 500, "p2_speed": 500, "z3_speed": 500, "z4_speed": 500,
         "small_gripper_force": 300,
         "ch8_blow": 0, "ch1_blow": 0, "ch8_reverse_aspirate": 0, "ch1_reverse_aspirate": 0},
    35: {"m_pos": 300, "m_speed": 300, "ultrasound_time": 5},
    36: {"small_gripper_angle": 180, "small_gripper_force": 100},
    38: {"thermo1_temperature": 37, "thermo1_time": 60},
    40: {"thermo2_temperature": 37, "thermo2_time": 60},
    42: {"thermo3_temperature": 37, "thermo3_time": 60},
    44: {"thermo4_temperature": 37, "thermo4_time": 60},
    46: {"thermo4_temperature": 25, "thermo4_time": 1, "shaking_speed": 300, "shaking_time": 20},
}


# 离心管轴的中文。只覆盖这一台，不改其他设备共用的「X 运行位置」这类名。
TUBE_PARAM_LABELS = {
    "x_pos": "离心管整机 X 轴",
    "y_pos": "离心管整机 Y 轴",
    "z1_pos": "八通道 Z 轴",
    "p1_pos": "八通道吸放液量",
    "z2_pos": "大夹爪",
    "p2_pos": "单通道吸放液量",
    "z3_pos": "单通道 Z 轴",
    "z4_pos": "小夹爪",
    "m_pos": "超声磁力架 Z 轴",
    "ch8_blow": "八通道吹样量",
    "ch1_blow": "单通道吹样量",
}


def apply_tube_labels(devices):
    """离心管执行参数的汉语，按现场轴的分工覆盖协议表里的通用名。"""
    for dev in devices:
        if dev.get("id") != "gn_centrifuge_tube_liquid_handling":
            continue
        for act in dev.get("actions") or []:
            for key, sch in (act.get("params") or {}).items():
                label = TUBE_PARAM_LABELS.get(key)
                if not label or not isinstance(sch, dict):
                    continue
                sch.setdefault("meta", {})["label"] = label


def apply_tube_defaults(devices):
    """给离心管每个指令号填上预设参数。键不在签名里就补一个整数槽。"""
    for dev in devices:
        if dev.get("id") != "gn_centrifuge_tube_liquid_handling":
            continue
        for act in dev.get("actions") or []:
            values = TUBE_CMD_DEFAULTS.get(act.get("cmdType"))
            if not values:
                continue
            params = act.setdefault("params", {})
            for key, value in values.items():
                sch = params.get(key)
                if not isinstance(sch, dict):
                    sch = {"type": "int", "optional": True}
                    params[key] = sch
                sch["default"] = value
                sch["optional"] = True


def build():
    base = _pick_workflow_dir()
    wfs = load_workflows(base)
    # 按 device 聚合；命令式设备再按 cmd_type 拆分，name 式设备按 name 拆分
    by_dev = defaultdict(list)
    for wf in wfs:
        for n in wf['data']['nodes']:
            dev = n.get('device_name', '')
            if dev:
                by_dev[dev].append(n)

    devices = []
    for dev, meta in DEVICE_META.items():
        nodes = by_dev.get(dev, [])
        if dev in CMD_LABELS:
            # 命令式：按 cmd_type 聚合
            by_cmd = defaultdict(list)
            for n in nodes:
                ct = (n.get('param') or {}).get('cmd_type')
                if ct is not None:
                    by_cmd[ct].append(n)
            actions = []
            used_cmds = set(by_cmd.keys())
            legacy = P140.LEGACY_ACTIONS.get(dev, set())
            for ct, label in CMD_LABELS[dev].items():
                grp = by_cmd.get(ct, [])
                pst = param_stats(grp)
                params = {k: infer_schema(k, s) for k, s in pst.items()}
                # 补齐「协议明确存在、但真实工作流未出现」的参数
                for k, sch in (FALLBACK_PARAMS.get((dev, ct)) or {}).items():
                    params.setdefault(k, dict(sch))
                for k, dv in P140.extra_params_for(dev, cmd_type=ct).items():
                    params.setdefault(k, {'type': 'int', 'default': dv})
                if not params:
                    params = {'timeout': {'type': 'int', 'min': 1, 'max': 3600, 'default': 120}}
                attach_meta(params)
                actions.append({
                    'cmdType': ct,
                    'label': label,
                    'inRealWorkflow': ct in used_cmds,
                    'count': len(grp),
                    'legacy': ct in legacy,
                    'params': params,
                })
            devices.append({'id': dev, **meta, 'kind': 'cmd', 'actions': actions})
        elif dev in NAME_ACTIONS:
            by_name = defaultdict(list)
            for n in nodes:
                by_name[n.get('name', '')].append(n)
            actions = []
            for nm, label in NAME_ACTIONS[dev]:
                grp = by_name.get(nm, [])
                pst = param_stats(grp)
                params = {k: infer_schema(k, s) for k, s in pst.items()}
                if not params:
                    params = {'timeout': {'type': 'int', 'min': 1, 'max': 3600, 'default': 120}}
                attach_meta(params)
                # PRCXI：给板位类参数打标（编辑器据此渲染 4×4 板位点选器）
                roles = PRCXI_DECK_ROLES.get(nm) if dev == 'PRCXI' else None
                if roles:
                    label_of = {r['param']: r for r in roles}
                    for k, sch in params.items():
                        r = label_of.get(k)
                        if not r:
                            continue
                        sch['deck'] = True
                        sch['role'] = r['key']
                        sch['roleLabel'] = r['label']
                        sch['value'] = r['value']
                        sch['accept'] = list(r['accept'])
                        sch['multi'] = bool(r['multi'])
                actions.append({
                    'name': nm,
                    'label': label,
                    'inRealWorkflow': bool(grp),
                    'count': len(grp),
                    'params': params,
                    **({'deckRoles': roles} if roles else {}),
                })
            extra = ({'deck': {'model': 'PRCXI9300Deck', 'rows': 4, 'cols': 4,
                               'total': 16, 'api': '/api/gn-adapter/prcxi-deck',
                               'unilabDeck': '/gn_workstation/PRCXI/PRCXI_Deck'}}
                     if dev == 'PRCXI' else {})
            devices.append({'id': dev, **meta, 'kind': 'name', 'actions': actions, **extra})
        else:
            # 未映射设备（真实工作流里出现但未登记）：给出通用动作
            by_name = defaultdict(list)
            for n in nodes:
                by_name[n.get('name', 'auto-execute_command')].append(n)
            actions = [{'name': nm, 'label': nm, 'inRealWorkflow': True,
                        'count': len(grp),
                        'params': attach_meta({k: infer_schema(k, s)
                                               for k, s in param_stats(grp).items()})}
                       for nm, grp in by_name.items()]
            devices.append({'id': dev, 'label': dev, 'protocol': '—', 'desc': '真实工作流出现的设备',
                            'kind': 'name', 'actions': actions})

    # ---------- 3. 挂载 1.4.0「点位表」协议点位明细 ----------
    # 不再按协议前缀数 1.3.9 CSV：改成按表内 A 列模块分组取真实点位。
    # 好处：① 口径从 1.3.9 升到 1.4.0；② 收全不按前缀命名的点位
    # （离心机 scale_weight、常规烘箱 OPEN_DOOR/COHSE_DOOR、液冷 Cooling_CmdType）；
    # ③ 不再把 Liquid_Cooling_* 错算到 PRCXI 的 'Liquid_' 前缀上。
    dev_of_module = PT.MODULE_TO_DEVICE
    grp_of_dev = defaultdict(list)                 # device → [模块标题]（多数只有 1 个）
    for _mod in PT.MODULE_ORDER:
        _d = dev_of_module.get(_mod)
        if _d and _mod not in grp_of_dev[_d]:
            grp_of_dev[_d].append(_mod)
    for dev in devices:
        did = dev['id']
        rows = PT.points_of(did)
        pts = []
        for p in rows:
            d = {'name': p['name'] or p['node'], 'node': p['node']}
            if p.get('dtype'):
                d['dtype'] = p['dtype']
            if p.get('rw'):
                d['rw'] = p['rw']
            if p.get('desc'):
                d['desc'] = p['desc']
            pts.append(d)
        dev['points'] = pts
        dev['pointStats'] = {
            'total': len(pts),
            'r': sum(1 for p in pts if (p.get('rw') or '').upper() == 'R'),
            'w': sum(1 for p in pts if (p.get('rw') or '').upper() == 'W'),
        }
        # 兼容旧前端字段：protocolNodes = 1.4.0 表内点位总数
        dev['protocolNodes'] = len(pts)
        # 一个 device 横跨多个模块（目前只有 system：总复位/停止/报错信息）时，
        # 逐个点位标注所属模块，供 UI 分组显示。
        # 注意：必须按 POINT_GROUPS（模块标题 → 点位）反查，不能按 DEVICE_POINTS
        # （device → 点位），否则同一 device 的每个模块都会拿到全量点位。
        mods = grp_of_dev.get(did) or []
        if len(mods) > 1:
            by_node = {}
            for _mod, _pts in PT.POINT_GROUPS:
                if dev_of_module.get(_mod) != did:
                    continue
                for _p in _pts:
                    by_node[_p['node']] = _mod
            for p in pts:
                if p['node'] in by_node:
                    p['group'] = by_node[p['node']]
        # 与表内指令表交叉校验（保证 ACTIONS 不落后于 1.4.0 表）
        tb = PT.DEVICE_ACTIONS.get(did) or {}
        if tb and did in CMD_LABELS:
            cur = CMD_LABELS[did]
            miss = sorted(k for k in tb if k not in cur)
            if miss:
                dev['actionTableGap'] = miss

    # 动作参数以 GN 驱动方法签名为准（历史工作流里没出现过的键不再被丢成空面板）
    apply_driver_signatures(devices)
    apply_tube_labels(devices)
    apply_tube_defaults(devices)

    # 无设备名节点（group / 自定义脚本）
    script_names = Counter()
    for wf in wfs:
        for n in wf['data']['nodes']:
            if not n.get('device_name'):
                script_names[n.get('name', '')] += 1
    scripts = [{'name': nm, 'count': c} for nm, c in script_names.most_common(20)]

    lib = {
        'version': '20261014.1',
        'protocol': {
            'name': 'OPC UA',
            'version': P140.PROTOCOL['version'],
            'server': P140.PROTOCOL['server'],
            'nsPrefix': P140.PROTOCOL['nsPrefix'],
            'source': P140.PROTOCOL['source'],
            'sheet': '点位表',
            'modules': PT.MODULE_ORDER,
            'pointTotal': sum(len(p) for _, p in PT.POINT_GROUPS),   # 240（不重复计别名）
        },
        'stationMap': {str(k): v for k, v in P140.STATION_MAP.items()},
        'stationMapSource': P140.STATION_MAP_SOURCE,
        'lockRecipe': P140.LOCK_CAP_RECIPE,
        'lockInterlocks': P140.LOCK_INTERLOCKS,
        'actionsTable': {k: {str(a): b for a, b in v.items()} for k, v in P140.ACTIONS.items()},
        'actionsDeviation': P140.ACTIONS_DEVIATION,
        'source': ('Uni-Lab-OS/unilabos/devices/workstation/GN（真实驱动 + 真实工作流）'
                   '＋ OPC_UA协议1.4.0(2).xlsx（最权威最新：240 个协议点位 / 动作表 / '
                   '参数中文名 / 单位 / 范围 / 互锁）'),
        'devices': devices,
        'scriptNodes': scripts,
        'workflowFiles': sorted(os.path.basename(f) for f in glob.glob(os.path.join(base, '*.json'))),
        'workflowDir': base,
    }
    js = ('// 由 scripts/gen_gn_node_library.py 生成，勿手改；'
          '数据源自 Uni-Lab-OS GN 真实资产 + OPC_UA协议1.4.0(2).xlsx「点位表」。\n')
    js += 'window.GN_NODE_LIBRARY = ' + json.dumps(lib, ensure_ascii=False, indent=1) + ';\n'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    n_dev = len(lib['devices'])
    n_act = sum(len(d['actions']) for d in lib['devices'])
    n_param = sum(len(a['params']) for d in lib['devices'] for a in d['actions'])
    n_pt = lib['protocol']['pointTotal']
    n_pt_all = sum(d.get('protocolNodes', 0) for d in lib['devices'])
    print(f'已生成 {OUT}')
    print(f'协议版本 OPC UA {P140.PROTOCOL["version"]} / 设备 {n_dev} 组 / '
          f'动作节点模板 {n_act} 个 / 参数槽位 {n_param} 个 / '
          f'协议点位 {n_pt} 个（含别名副本 {n_pt_all}） / '
          f'自定义脚本示例 {len(scripts)} 个')
    for d in lib['devices']:
        real = sum(1 for a in d['actions'] if a['inRealWorkflow'])
        ps = d.get('pointStats') or {}
        print(f"  {d['id']}: {len(d['actions'])} 动作（真实工作流中出现 {real}）"
              f" / 点位 {ps.get('total', 0)}（R{ps.get('r', 0)} W{ps.get('w', 0)}）")

if __name__ == '__main__':
    build()
