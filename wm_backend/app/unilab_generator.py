# -*- coding: utf-8 -*-
"""
CWM-Lab 工作流生成入口。

不再在前端 app.js 里自维护一套「物料分布推理式 planner」——那个版本与
unilab-workflow-builder skill 的 prcxi_factory.py 容易出现两份不一致的实现。
现在统一改为：前端只负责把 AI 最优条件 POST 给后端，后端调用
prcxi_factory.py（来自 unilab-workflow-builder skill，已踩坑修正）生成
合规工作流 JSON 并返回。

强制三条工艺规则（设备首尾复位 / 离心机+堆栈逐动作复位 / 9320 协议包裹）
全部固化在 prcxi_factory 的 wrap_device_reset / wrap_per_action_reset /
prcxi_block 包裹器里，前端无需也无法绕过。
"""
import json
import os
import copy
from . import prcxi_factory as pf

# 真实 9320 台面 16 槽位（取自《9320台面布局-金四面体合成》）
# 4 columns × 4 rows, column-major; pos 3/4 停用（夹爪行程不覆盖）
DECK_9320 = [
    {'pos': 1,  'name': '垃圾桶',           'enabled': True,  'group': None},
    {'pos': 2,  'name': '废液槽',           'enabled': True,  'group': None},
    {'pos': 3,  'name': '停用(夹爪不覆盖)', 'enabled': False, 'group': None},
    {'pos': 4,  'name': '停用(夹爪不覆盖)', 'enabled': False, 'group': None},
    {'pos': 5,  'name': '整板储液槽(4℃)',   'enabled': True,  'group': 'trough',    'content': '金球溶液'},
    {'pos': 6,  'name': '整板储液槽(4℃)',   'enabled': True,  'group': 'trough',    'content': '2.5mM 氯金酸'},
    {'pos': 7,  'name': '96孔深孔板(28℃)',  'enabled': True,  'group': 'deepWell',  'content': '20mM CTAC'},
    {'pos': 8,  'name': '96孔深孔板(28℃)',  'enabled': True,  'group': 'deepWell',  'content': 'CTAC及CTAB混液'},
    {'pos': 9,  'name': '96孔深孔板(恒温振荡)','enabled': True,'group': 'deepWell',  'content': '抗坏血酸梯度'},
    {'pos': 10, 'name': '枪头位(1ml)',      'enabled': True,  'group': 'tip'},
    {'pos': 11, 'name': '枪头位(1ml)',      'enabled': True,  'group': 'tip'},
    {'pos': 12, 'name': '枪头位(1ml)',      'enabled': True,  'group': 'tip'},
    {'pos': 13, 'name': '酶标板',           'enabled': True,  'group': None},
    {'pos': 14, 'name': '96孔深孔板',       'enabled': True,  'group': 'deepWell',  'content': '金四面体成品'},
    {'pos': 15, 'name': '枪头位(1ml)',      'enabled': True,  'group': 'tip'},
    {'pos': 16, 'name': '中转位(纯水)',     'enabled': True,  'group': 'transfer'},
]

TIP_SLOTS    = [s['pos'] for s in DECK_9320 if s['group'] == 'tip'    and s['enabled']]   # [10,11,12,15]
TROUGH_SLOTS = [s['pos'] for s in DECK_9320 if s['group'] == 'trough' and s['enabled']]   # [5,6]
DW_SLOTS     = [s['pos'] for s in DECK_9320 if s['group'] == 'deepWell' and s['enabled']] # [7,8,9,14]
TRANSFER_POS = next((s['pos'] for s in DECK_9320 if s['group'] == 'transfer'), 16)

# 真实堆栈枪头盒槽位（取自参考工作流 arm pick: stack number 74/75/76）
STACK_TIP_SLOTS = [74, 75, 76]

# 真实资源 UUID（取自参考工作流 81次滴注.json / 从堆栈到9320三次放枪头.json）
RES_TROUGH     = pf.res('PRCXI_nest_1_troughplate3', 'dd9a0925-8aa7-44c0-a1bc-7dc9776ee6e0')
RES_DEEPWELL   = pf.res('PRCXI_96_DeepWell_shake',   'a2e75ff7-6b1a-494a-8b18-0b6d93619a11')
RES_TIP1       = pf.res('PRCXI_1250uL_Tips1',         '2c525d62-d238-48d5-892a-993e5c0065d7')
RES_TIP3       = pf.res('PRCXI_1250uL_Tips3',         '0014ea7c-9743-452a-96ab-5407f475a32c')
RES_DW5        = pf.res('PRCXI_96_DeepWell5',          'e74c153c-a29f-4653-a665-b9e1cc1711a9')

# 固体料桶 Z 位（取自 8/12 通道加样实测）
SOLID_BUCKET_Z = {1: 136000, 2: 179000, 3: 239000, 4: 200000, 5: 150000}

# 参考工作流 target_lab_uuid（与 81次滴注.json 一致）
TARGET_LAB_UUID = '803298d7-ba98-4cd5-a546-b7ca08b4cb12'

# cmd7 堆栈复位 param（取自参考文件，深拷贝避免共享）
CMD7_PARAM = {'r_pos': 0, 'z_pos': 0, 'r_speed': 0, 'timeout': 120, 'z_speed': 0, 'cmd_type': 7}


def _solid_add(name, bucket, mg):
    """固体加料积木：取桶(cmd9) → 加料(cmd11) → 放回(cmd19)，首尾复位（规则①）。
    对齐 8通道加样.json / 12通道加样.json。"""
    z = SOLID_BUCKET_Z.get(bucket, 239000)
    block = [
        pf.solid(9,  -3094, 210, '固体-取%s桶@%d' % (name, bucket), material_z_pos=z),
        pf.solid(11, -3094, 210, '固体-加%s %.1fmg' % (name, mg), weight=round(mg * 10),
                 material_z_pos=136000, door_pos=3600, door_speed=150, material_z_speed=300),
        pf.solid(19, -3094, 210, '固体-放回%s桶@%d' % (name, bucket), material_z_pos=z),
    ]
    return pf.wrap_device_reset(block, 'gn_solid_weighing')


def _titration(vol, repeat, tip_rack_idx=0):
    """滴注原子节点。tip_rack_idx=0→Tips1, 1→Tips3。"""
    tip = RES_TIP1 if tip_rack_idx == 0 else RES_TIP3
    t = pf.TPL['titration']
    return pf.mk_node('titration_liquid', t[0], t[1], t[2], t[3],
                      {'offsets': None, 'sources': [RES_TROUGH], 'targets': [RES_DEEPWELL],
                       'asp_vols': [vol], 'dis_vols': [vol], 'none_keys': [],
                       'tip_racks': [tip], 'is_96_well': True, 'repeat_count': repeat,
                       'use_channels': [], 'cycle_delay_s': 60, 'liquid_height': None,
                       'asp_flow_rates': [10], 'dis_flow_rates': [10], 'post_air_volume': None,
                       'dispensing_method': ['BottleNeck'], 'blow_out_air_volume': [20],
                       'hover_below_liquid_level': None, 'blow_out_air_volume_before': None,
                       'z_start_point_offset_height': None, 'post_discharge_pause_time_ms': None},
                      '9320-滴注×%d' % repeat)


def _move_plate(frm, to):
    return pf.move_plate(frm, to, RES_DW5, '9320-移板 %d→%d' % (frm, to))


def _place_tips(stack_slot, tip_pos):
    """放枪头：arm pick(stack)→place(9320) + 9320 move(transfer→tip)。
    对齐 从堆栈到9320三次放枪头.json。不再内嵌 create/run，由 _wrap_prcxi_runs 统一包裹。"""
    return [
        pf.arm_pick('stack', stack_slot, '机械臂-从堆栈取@%d' % stack_slot),
        pf.arm_place('nine9320', 1, '机械臂-装到9320@%d' % tip_pos),
        _move_plate(TRANSFER_POS, tip_pos),
    ]


def _take_tips(tip_pos, stack_slot):
    """取枪头：9320 move(tip→transfer) + arm pick(9320)→place(stack)。
    对齐 从9320到堆栈三次取枪头.json。不再内嵌 create/run，由 _wrap_prcxi_runs 统一包裹。"""
    return [
        _move_plate(tip_pos, TRANSFER_POS),
        pf.arm_pick('nine9320', 1, '机械臂-从9320取@%d' % tip_pos),
        pf.arm_place('stack', stack_slot, '机械臂-放回堆栈@%d' % stack_slot),
    ]


def _is_prcxi_action(n):
    """判断节点是否为 9320(PRCXI) 动作节点（不含 create/run 本身）。"""
    return (n.get('device_name') == 'PRCXI'
            and n.get('template_name') not in ('auto-create_protocol', 'auto-run_protocol'))


def _wrap_prcxi_runs(chain):
    """后处理：将连续的 PRCXI 动作节点合并为一个 create→actions…→run 块。
    - 扫描 chain，遇到 PRCXI 动作时开始一个"连续段"
    - 段首插入 create_protocol，段尾插入 run_protocol
    - 非PRCXI节点（arm/solid等）自然中断段
    这样连续的 9320 动作不会重复 create/run，只在首尾各一个。"""
    out = []
    i = 0
    while i < len(chain):
        if _is_prcxi_action(chain[i]):
            # 收集连续 PRCXI 动作
            run_start = len(out)
            out.append(pf.create_protocol('9320-建协议'))
            while i < len(chain) and _is_prcxi_action(chain[i]):
                out.append(chain[i])
                i += 1
            out.append(pf.run_protocol('9320-跑协议'))
        else:
            out.append(chain[i])
            i += 1
    return out


def generate_workflow(cond):
    """
    根据 AI 理论最优条件 cond 生成合规 CWM-Lab 工作流 JSON。

    cond: dict, 包含 T / R / I / G / reaction('CH4'|'OER')
    返回: dict, 完整 workflow JSON（含 target_lab_uuid, name, data:{nodes,edges}）
    """
    cond = cond or {}
    is_oer = cond.get('reaction') == 'OER'

    # —— 推理意图 ——
    solid_adds = [
        {'name': 'AA',   'bucket': 3, 'mg': 211.3},
        {'name': 'CTAB', 'bucket': 1, 'mg': 128.0},
    ]
    if not is_oer:
        solid_adds.append({'name': 'NaBH4', 'bucket': 2, 'mg': 64.0})

    G = round(cond.get('G', 4806))
    inj_total = max(27, min(243, round(G / 60)))
    inj_vol = 4.8

    # —— 状态模型 ——
    stack_tips = STACK_TIP_SLOTS[:]      # [74,75,76]
    tip_positions = TIP_SLOTS[:]          # [10,11,12,15]
    used_stack = []
    used_tip = []
    trough_vol = 200
    need_u = inj_total * inj_vol

    chain = []

    # 1) 固体加料（取桶→加料→放回，首尾复位）
    for s in solid_adds:
        chain.extend(_solid_add(s['name'], s['bucket'], s['mg']))

    # 2) 放枪头（9320 未装枪头则去堆栈取）
    tip_need = max(1, -(-inj_total // 1250))  # ceil
    for i in range(tip_need):
        if not stack_tips or not tip_positions:
            break
        ss = stack_tips.pop(0)
        tp = tip_positions.pop(0)
        chain.extend(_place_tips(ss, tp))
        used_stack.append(ss)
        used_tip.append(tp)

    # 3) 补试剂（不够则补）——只出动作节点，create/run 由 _wrap_prcxi_runs 统一包裹
    if trough_vol < need_u:
        add = (-(-(need_u - trough_vol) // 200)) * 200  # ceil to 200
        trough_vol += add
        chain.append(_titration(add, 1, tip_rack_idx=0))

    # 4) 滴注（27/批拆分）——只出动作节点
    per = 27
    batches = max(1, -(-inj_total // per))
    left = inj_total
    for b in range(batches):
        take = min(per, left)
        left -= take
        chain.append(_titration(inj_vol, take, tip_rack_idx=(b % 2)))

    # 5) 取枪头回堆栈
    for i in range(tip_need):
        if not used_tip or not used_stack:
            break
        tp = used_tip.pop()
        ss = used_stack.pop()
        chain.extend(_take_tips(tp, ss))

    # —— 后处理：合并连续 PRCXI 动作为 create→actions…→run 块 ——
    chain = _wrap_prcxi_runs(chain)

    # —— 组装 ——
    name = 'CWM-Lab AI方案(推理式) · 金四面体'
    if is_oer:
        name += ' · OER'
    wf = pf.build_workflow(chain, TARGET_LAB_UUID, name)
    return wf


def generate_workflow_json(cond):
    """返回 JSON 字符串（给路由层用）。"""
    return json.dumps(generate_workflow(cond), ensure_ascii=False, indent=2)
