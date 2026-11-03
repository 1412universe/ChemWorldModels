# -*- coding: utf-8 -*-
"""
PRCXI 自动化工作流 JSON 工厂函数库。

用途
----
为「金四面体」等 PRCXI 液体处理 + 固体加样自动化工作流生成线性节点链。
其他 agent 直接 import 本模块，调用工厂函数拼装 chain，再用
`build_workflow()` 输出可直接导入设备的 JSON。

⚠️ 本文件已内建全部踩坑点修正，请勿"顺手"改回错误写法：
  1. 液体处理节点 device_name="PRCXI"、resource_name="liquid_handler.prcxi"（两者不同！）
  2. 固体加样 param 键名是 x_pos / y_pos / material_z_pos（不是 x / y / material_z）
  3. 固体加样重量字段名是 volune_weight（原文拼写如此），单位 0.1mg（128mg -> 1280）
  4. 不同工作流文件里 gn_solid_weighing 的 cmd_type 编码不同，本库只给"通用 cmd"
     （11/12/13/20）；文件特定编码（如取料筒 cmd9/19 或 cmd10/18）由调用方按参考文件传入。

══════════════════════════════════════════════════════════════════════
【强制约定】每个设备起止复位 + 9320 协议包裹（来自用户确认的工艺规则）
══════════════════════════════════════════════════════════════════════
① 每一个设备「开始」和「结束」时，都要先复位（reset）。
② 离心机（gn_centrifuge）与堆栈（gn_rotary_stack）**每步动作**开始前和结束后都要复位。
③ 9320（PRCXI）的**每一个动作**开始前必须先 auto-create_protocol，结束后必须 auto-run_protocol。

各设备复位命令（取自 GN 设备真实定义 / 参考工作流实测）：
  gn_solid_weighing : cmd20 全 0            （模板同固体加样 auto-execute_command）
  gn_rotary_stack   : cmd7  （param 须从参考文件深拷贝，见 stack_reset()）
  gn_centrifuge     : cmd8  （CentrifugeCommand.RESET=8；param 见 centrifuge_reset()）
  gn_centrifuge_tube_liquid_handling : auto-reset 节点（见 tube_reset()）
  gn_robotic_arm    : cmd7  （RobotCommand.RESET=7）→ ⚠️ 暂无参考工作流含机械臂复位节点，
                                  其 template_uuid 未知，arm_reset() 须由调用方显式传入，见下。
  9320(PRCXI)       : 无独立复位节点；其"复位/初始化"由规则③的 create→动作→run 包裹实现。

本模块提供三个包裹器把规则固化进生成逻辑（详见文件下方）：
  - prcxi_block(create_footer, run_footer, *actions)        → 规则③
  - wrap_device_reset(block, device)                       → 规则①
  - wrap_per_action_reset(actions, device)                 → 规则②（离心机/堆栈）
  - device_reset(device, ...)                              → 取该设备复位节点
  调用方拼 chain 时**必须**经这些包裹器，不要裸拼动作节点。
══════════════════════════════════════════════════════════════════════
"""
import json
import copy
import uuid

# ---------------------------------------------------------------------------
# 模板常量（取自真实参考文件；元组 = (template_uuid, template_name, device_name, resource_name)）
# 注意 9320 液体处理站：device_name="PRCXI"，resource_name="liquid_handler.prcxi"
# ---------------------------------------------------------------------------
TPL = {
    'pick':       ('39450241-0ccb-4017-9a05-e042fce66c77', 'pick',                 'gn_robotic_arm',      'gn_robotic_arm'),
    'place':      ('5cd348b5-31d1-4ffc-841d-18672f6d26ed', 'place',                'gn_robotic_arm',      'gn_robotic_arm'),
    'move':       ('d91cb9b6-c85f-4982-945c-2c5cd1297da1', 'move_plate',           'PRCXI',               'liquid_handler.prcxi'),
    'titration':  ('3cadca7f-7563-4be9-936a-2884661f84b7', 'titration_liquid',     'PRCXI',               'liquid_handler.prcxi'),
    'solid':      ('c7c5eb46-b3d5-404f-a24a-8639f894013d', 'auto-execute_command', 'gn_solid_weighing',   'gn_solid_weighing'),
    'stack':      ('6b08ef44-bf4f-45f5-ae28-414a4011c1d7', 'auto-execute_command', 'gn_rotary_stack',     'gn_rotary_stack'),
    'create':     ('cc5476e6-7c2e-40f7-878f-c7903ba16a3b', 'auto-create_protocol', 'PRCXI',               'liquid_handler.prcxi'),
    'run':        ('d10989c8-6f47-4328-bec1-bfe911c6dfc1', 'auto-run_protocol',     'PRCXI',               'liquid_handler.prcxi'),
    # 离心机：template_uuid 取自真实参考工作流（金四面体-从第一次离心到结束.json，59 个 cmd8 复位节点一致）
    'centrifuge':  ('7e175cf2-3149-4805-96cc-5e7a48b17e41', 'auto-execute_command', 'gn_centrifuge',       'gn_centrifuge'),
    # 离心管液体处理系统：auto-reset 子动作（与 app.js UNILAB_TPL.tube_reset 同源）
    'tube_reset':  ('6c1ec551-93e6-4419-97d3-610ba3d794a0', 'auto-reset',           'gn_centrifuge_tube_liquid_handling', 'gn_centrifuge_tube_liquid_handling'),
}
DECK = '/gn_workstation/PRCXI/PRCXI_Deck/'


def res(name, uid):
    """构造资源引用对象。"""
    return {'id': DECK + name, 'name': name, 'uuid': uid}


def mk_node(name, tpl_uuid, tpl_name, device_name, resource_name, param, footer):
    """构造一个标准 ILab 节点。"""
    return {
        'uuid': str(uuid.uuid4()),
        'parent_uuid': '',
        'name': name,
        'type': 'ILab',
        'icon': '',
        'pose': {
            'layout': 'x-y',
            'position': {'x': 0.0, 'y': 0.0, 'z': 0},
            'position_3d': {'x': 0, 'y': 0, 'z': 0},
            'size': {'width': 0, 'height': 0, 'depth': 0},
            'scale': {'x': 1, 'y': 1, 'z': 1},
            'rotation': {'x': 0, 'y': 0, 'z': 0},
            'extra': None,
            'cross_section_type': 'rectangle',
        },
        'footer': footer,
        'device_name': device_name,
        'disabled': False,
        'minimized': False,
        'lab_node_type': 'Device',
        'template_uuid': tpl_uuid,
        'template_name': tpl_name,
        'resource_name': resource_name,
        'param': param,
    }


# ---------------------------------------------------------------------------
# 机械臂 pick / place
# station: 'stack' | 'nine9320' | 'solid'  （solid 站 timeout/x_speed 更大）
# ---------------------------------------------------------------------------
def arm_pick(station, number, footer):
    t = TPL['pick']
    to = 30000 if station == 'solid' else 180
    xs = 400 if station == 'solid' else 300
    return mk_node('pick', t[0], t[1], t[2], t[3],
                   {'number': number, 'station': station, 'timeout': to,
                    'x_speed': xs, 'item_type': 'plate'}, footer)


def arm_place(station, number, footer):
    t = TPL['place']
    to = 30000 if station == 'solid' else 180
    xs = 400 if station == 'solid' else 300
    return mk_node('place', t[0], t[1], t[2], t[3],
                   {'number': number, 'station': station, 'timeout': to,
                    'x_speed': xs, 'item_type': 'plate'}, footer)


# ---------------------------------------------------------------------------
# 9320 液体处理：move_plate
# from / to = deck 槽位 (1-16)；plate = 资源引用列表
# ---------------------------------------------------------------------------
def move_plate(frm, to, res, footer):
    t = TPL['move']
    return mk_node('move_plate', t[0], t[1], t[2], t[3],
                   {'to': to, 'from': frm, 'force': 5, 'plate': [res], 'hierarchy': 1,
                    'get_direction': '', 'pickup_offset': {'x': 0, 'y': 0, 'z': 0},
                    'put_direction': '', 'drop_direction': '',
                    'resource_offset': {'x': 0, 'y': 0, 'z': 0}, 'pickup_direction': '',
                    'put_down_position': 2, 'destination_offset': {'x': 0, 'y': 0, 'z': 0},
                    'pinch_it_up_position': 2, 'intermediate_locations': [],
                    'pickup_distance_from_top': 0}, footer)


# ---------------------------------------------------------------------------
# 9320 液体处理：titration_liquid（加水 / 加液）
# "分几次加"用 repeat_count；sources=水源, targets=目标板, tip_racks=枪头盒
# ---------------------------------------------------------------------------
def titration(src, tgt, tip, footer):
    t = TPL['titration']
    return mk_node('titration_liquid', t[0], t[1], t[2], t[3],
                   {'offsets': None, 'sources': [src], 'targets': [tgt],
                    'asp_vols': [10000], 'dis_vols': [10000], 'none_keys': [],
                    'tip_racks': [tip], 'is_96_well': True, 'repeat_count': 2,
                    'use_channels': [], 'cycle_delay_s': 10, 'liquid_height': None,
                    'asp_flow_rates': [300], 'dis_flow_rates': [300],
                    'post_air_volume': None, 'dispensing_method': ['BottleNeck'],
                    'blow_out_air_volume': [20], 'hover_below_liquid_level': None,
                    'blow_out_air_volume_before': [], 'z_start_point_offset_height': None,
                    'post_discharge_pause_time_ms': None}, footer)


def create_protocol(footer=''):
    t = TPL['create']
    return mk_node('auto-create_protocol', t[0], t[1], t[2], t[3],
                   {'none_keys': [], 'protocol_date': '', 'protocol_name': '',
                    'protocol_type': '', 'protocol_author': '', 'protocol_version': '',
                    'protocol_description': ''}, footer)


def run_protocol(footer=''):
    t = TPL['run']
    return mk_node('auto-run_protocol', t[0], t[1], t[2], t[3],
                   {'protocol_id': None}, footer)


# ---------------------------------------------------------------------------
# 堆栈复位：直接深拷贝参考文件中 cmd7 的 param，避免硬编码不确定字段
# ---------------------------------------------------------------------------
def stack_reset(cmd7_param, footer='堆栈复位'):
    t = TPL['stack']
    p = copy.deepcopy(cmd7_param)
    return mk_node('auto-execute_command', t[0], t[1], t[2], t[3], p, footer)


# ---------------------------------------------------------------------------
# 各设备「复位」节点工厂（规则①/②的基础原子）
# param 均取自参考工作流实测的复位节点，逐字段对齐，避免臆造
# ---------------------------------------------------------------------------
# 固体加样复位：cmd20 全 0（金四面体AA 参考文件实测）
SOLID_RESET_PARAM = {
    'cmd_type': 20, 'door_pos': 0, 'door_speed': 0, 'gripper_z_pos': 0,
    'gripper_z_speed': 0, 'material_z_pos': 0, 'material_z_speed': 0,
    'timeout': 180, 'volune_weight': 0, 'x_pos': 0, 'x_speed': 0, 'y_pos': 0, 'y_speed': 0,
}

# 离心机复位：cmd8 全 0（金四面体-从第一次离心到结束.json 实测，59 个节点一致）
CENTRIFUGE_RESET_PARAM = {
    'cmd_type': 8, 'inner_z_pos': 0, 'plate_no': 0, 'rpm': 0, 'time_minutes': 0,
    'timeout': 120, 'y_pos': 0, 'y_speed': 0, 'z_pos': 0, 'z_speed': 0,
}


def solid_reset(footer='固体加样复位'):
    t = TPL['solid']
    return mk_node('auto-execute_command', t[0], t[1], t[2], t[3],
                   copy.deepcopy(SOLID_RESET_PARAM), footer)


def centrifuge_reset(footer='离心机复位'):
    t = TPL['centrifuge']
    return mk_node('auto-execute_command', t[0], t[1], t[2], t[3],
                   copy.deepcopy(CENTRIFUGE_RESET_PARAM), footer)


# 离心机工作动作（与复位 cmd8 区分）：参考文件实测 cmd7=加载板到工位
# 真实离心/旋转动作由调用方按目标文件传入完整 action_param
CENTRIFUGE_LOAD_PARAM = {
    'cmd_type': 7, 'inner_z_pos': 3600, 'plate_no': 3, 'rpm': 0, 'time_minutes': 0,
    'timeout': 120, 'y_pos': -2160, 'y_speed': 300, 'z_pos': 1050, 'z_speed': 300,
}


def centrifuge(action_param=None, footer='离心动作'):
    """离心机工作动作（非复位）。默认 cmd7 加载板；真实离心/旋转动作由调用方传入完整 param。"""
    t = TPL['centrifuge']
    p = copy.deepcopy(action_param) if action_param is not None else copy.deepcopy(CENTRIFUGE_LOAD_PARAM)
    return mk_node('auto-execute_command', t[0], t[1], t[2], t[3], p, footer)


def tube_reset(footer='离心管液体处理复位'):
    """离心管液体处理系统复位：auto-reset 节点，param 取空 {}（参考文件 reset 形态）。"""
    t = TPL['tube_reset']
    return mk_node('auto-reset', t[0], t[1], t[2], t[3], {}, footer)


def arm_reset(template_uuid, footer='机械臂复位', param=None):
    """机械臂复位：GN 设备 cmd7=RESET（RobotCommand.RESET=7）。
    ⚠️ 全部参考工作流均不含机械臂复位节点，其 template_uuid 与 param 未知，
       故必须由调用方显式传入 template_uuid（param 可覆盖，默认仅 cmd_type=7）。"""
    p = param if param is not None else {'cmd_type': 7}
    return mk_node('auto-execute_command', template_uuid, 'auto-execute_command',
                   'gn_robotic_arm', 'gn_robotic_arm', copy.deepcopy(p), footer)


# 设备→简称（用于自动生成 footer 文案）
DEVICE_SHORT = {
    'gn_solid_weighing': '固体加样',
    'gn_centrifuge': '离心机',
    'gn_rotary_stack': '堆栈',
    'gn_robotic_arm': '机械臂',
    'gn_centrifuge_tube_liquid_handling': '离心管',
}


def device_reset(device, footer=None, cmd7_param=None, arm_tpl=None):
    """统一复位节点入口（规则①/②调用）。
    - gn_rotary_stack 需 caller 先 find_cmd7_param(ref) 再传入 cmd7_param
    - gn_robotic_arm  需 caller 显式传入 arm_tpl（template_uuid），因无参考节点
    """
    short = DEVICE_SHORT.get(device, '设备')
    footer = footer or ('%s复位' % short)
    if device == 'gn_solid_weighing':
        return solid_reset(footer)
    if device == 'gn_centrifuge':
        return centrifuge_reset(footer)
    if device == 'gn_rotary_stack':
        if cmd7_param is None:
            raise RuntimeError('stack 复位需要参考文件里的 cmd7 param，'
                               '请先 find_cmd7_param(ref_nodes) 再传入 cmd7_param')
        return stack_reset(cmd7_param, footer)
    if device == 'gn_robotic_arm':
        if arm_tpl is None:
            raise RuntimeError('arm 复位需要调用方显式传入 template_uuid'
                               '（暂无参考工作流含机械臂复位节点）')
        return arm_reset(arm_tpl, footer)
    if device == 'gn_centrifuge_tube_liquid_handling':
        return tube_reset(footer)
    raise ValueError('未知设备: %s' % device)


# ---------------------------------------------------------------------------
# 规则包裹器：把三条强制约定固化进生成逻辑，调用方"必须"经包裹器拼链
# ---------------------------------------------------------------------------
def prcxi_block(create_footer='创建协议', run_footer='运行协议', *actions):
    """规则③：9320(PRCXI) 每个动作块以 auto-create_protocol 开头、
    auto-run_protocol 结尾包裹。一个 block 可含若干 9320 动作
    （move / titration / transfer / shaking）。
    若需"每个动作单独 create/run"，对每个动作单独调用本函数即可。"""
    block = [create_protocol(create_footer)]
    block.extend(actions)
    block.append(run_protocol(run_footer))
    return block


def wrap_device_reset(block, device, **opts):
    """规则①：在设备 block 首尾各插一个复位节点。
    opts 透传给 device_reset（如 cmd7_param / arm_tpl）。"""
    short = DEVICE_SHORT.get(device, '设备')
    r0 = device_reset(device, footer='%s复位-开始' % short, **opts)
    r1 = device_reset(device, footer='%s复位-结束' % short, **opts)
    return [r0] + list(block) + [r1]


def wrap_per_action_reset(actions, device, **opts):
    """规则②：离心机 / 堆栈 每个动作前后各插一个复位节点。
    opts 透传给 device_reset（批量复位时建议用同一个 cmd7_param 实例，
    但每次 device_reset 内部会深拷贝，互不影响）。"""
    short = DEVICE_SHORT.get(device, '设备')
    out = []
    for i, a in enumerate(actions, 1):
        out.append(device_reset(device, footer='%s复位-%d前' % (short, i), **opts))
        out.append(a)
        out.append(device_reset(device, footer='%s复位-%d后' % (short, i), **opts))
    return out


# ---------------------------------------------------------------------------
# 固体加样 gn_solid_weighing
# ⚠️ param 键名是 x_pos / y_pos / material_z_pos（不是 x / y / material_z）
# ⚠️ 重量字段 volune_weight，单位 0.1mg
# cmd_type 编码随工作流文件不同而不同，调用方按"目标参考文件实测"传入：
#   - 三次离心文件：取料筒=cmd10 / 放回=cmd18，material_z=234000，加料 y=1150，无 remove_static
#   - CTAC制备文件：取料筒=cmd9  / 放回=cmd19，material_z=239000，加料 y=655，含 remove_static
# 通用 cmd（两文件相同）：11 料筒加样、12 夹取料架、13 放置加样工位、20 复位
# ---------------------------------------------------------------------------
def solid(cmd, x_pos, y_pos, footer, weight=0, material_z_pos=0, timeout=180,
          x_speed=500, y_speed=500, door_pos=0, door_speed=0,
          gripper_z_pos=0, gripper_z_speed=0, material_z_speed=0, remove_static=None):
    t = TPL['solid']
    p = {'x_pos': x_pos, 'y_pos': y_pos, 'timeout': timeout, 'x_speed': x_speed, 'y_speed': y_speed,
         'cmd_type': cmd, 'door_pos': door_pos, 'door_speed': door_speed,
         'gripper_z_pos': gripper_z_pos, 'volune_weight': weight, 'material_z_pos': material_z_pos,
         'gripper_z_speed': gripper_z_speed, 'material_z_speed': material_z_speed}
    if remove_static is not None:
        p['remove_static'] = remove_static
    return mk_node('auto-execute_command', t[0], t[1], t[2], t[3], p, footer)


# ---------------------------------------------------------------------------
# 组装：把节点链转成完整工作流 JSON
# 布局：横向 x=200+i*260，y=0
# 连线：顺序成对链接（线性链，每节点出/入度=1）
# ⚠️ 组装务必在"所有节点已生成"之后进行，且边不能漏；此处一次性生成，天然无丢失。
# ---------------------------------------------------------------------------
def build_workflow(chain, target_lab_uuid, name):
    for i, n in enumerate(chain):
        n['pose']['position']['x'] = float(200 + i * 260)
        n['pose']['position']['y'] = 0.0
    edges = []
    for a, b in zip(chain, chain[1:]):
        edges.append({
            'source_node_uuid': a['uuid'],
            'target_node_uuid': b['uuid'],
            'source_handle_key': 'ready',
            'source_handle_io': 'source',
            'target_handle_key': 'ready',
            'target_handle_io': 'target',
        })
    return {
        'target_lab_uuid': target_lab_uuid,
        'name': name,
        'data': {'nodes': chain, 'edges': edges},
    }


def find_cmd7_param(ref_nodes):
    """从参考节点里找 cmd7（堆栈复位）的精确 param。"""
    for n in ref_nodes:
        if n.get('device_name') == 'gn_rotary_stack' and (n.get('param') or {}).get('cmd_type') == 7:
            return copy.deepcopy(n['param'])
    raise RuntimeError('未找到 cmd7 堆栈复位节点')


# ---------------------------------------------------------------------------
# 演示 / 自检：构造一个最小链并写出（可选）
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    # 自检：用包裹器构造一条"合规"演示链，验证三条强制约定均被落实
    #  ① 每个设备首尾复位  ② 离心机/堆栈每步动作前后复位  ③ 9320 create→动作→run
    ref = json.load(open('/Users/fenglongli/Downloads/金四面体AA溶液制备与溶液的混合，并放到T16等待离心.json', encoding='utf-8'))
    c7 = find_cmd7_param(ref['data']['nodes'])
    tip = res('PRCXI_96_DeepWell5', 'e74c153c-a29f-4653-a665-b9e1cc1711a9')

    # 规则①：固体加样设备 -> 首尾复位（固体不在规则②范围，不做逐动作复位）
    solid_block = wrap_device_reset(
        [solid(11, 0, 1150, '料筒加样#1', weight=1280, material_z_pos=234000),
         solid(11, 0, 1150, '料筒加样#2', weight=1280, material_z_pos=234000)],
        'gn_solid_weighing')

    # 规则②+①：离心机 -> 每步动作前后复位，且设备首尾复位
    cf_action = centrifuge(footer='离心加载板')
    centrifuge_block = wrap_device_reset(
        wrap_per_action_reset([cf_action], 'gn_centrifuge'), 'gn_centrifuge')

    # 规则③：9320 动作块 create -> 动作 -> run
    p9320 = prcxi_block('协议创建', '协议执行',
                        move_plate(16, 15, tip, 'T16->T15'),
                        titration(tip, tip, tip, '加液'))

    # 规则②+①：堆栈 -> 与离心机同包裹器，cmd7_param 透传
    # （堆栈工作动作 param 各文件不同，此处用 c7 改 r_pos 作示例动作，真实值由调用方按目标文件给）
    stack_action = mk_node('auto-execute_command', TPL['stack'][0], 'auto-execute_command',
                           'gn_rotary_stack', 'gn_rotary_stack',
                           dict(c7, **{'cmd_type': 7, 'r_pos': 1}), '堆栈旋转(示例)')
    stack_block = wrap_device_reset(
        wrap_per_action_reset([stack_action], 'gn_rotary_stack', cmd7_param=c7),
        'gn_rotary_stack', cmd7_param=c7)

    chain = solid_block + centrifuge_block + p9320 + stack_block
    wf = build_workflow(chain, ref.get('target_lab_uuid'), 'demo_合规链')

    # ---- 输出链路 ----
    print('节点数=%d 边数=%d' % (len(wf['data']['nodes']), len(wf['data']['edges'])))
    print('\n链路顺序（# | name | device | cmd）:')
    for i, n in enumerate(wf['data']['nodes'], 1):
        p = n.get('param') or {}
        print(' %2d. %-20s | %-34s | cmd=%s' % (i, n['name'], n['device_name'], p.get('cmd_type')))

    # ---- 自动断言三条规则 ----
    seq = [(n['device_name'], (n['param'] or {}).get('cmd_type'), n['template_name']) for n in wf['data']['nodes']]
    is_rst = lambda dv, ct: (dv == 'gn_solid_weighing' and ct == 20) or \
                            (dv == 'gn_rotary_stack' and ct == 7) or \
                            (dv == 'gn_centrifuge' and ct == 8)

    # 规则①：solid / centrifuge / stack 三个设备 block 首尾都是复位
    s0 = len(solid_block)
    c0 = s0 + len(centrifuge_block)
    p0 = c0 + len(p9320)
    r1 = is_rst(*seq[0][:2]) and is_rst(*seq[s0 - 1][:2])
    r1c = is_rst(*seq[s0][:2]) and is_rst(*seq[c0 - 1][:2])
    r1s = is_rst(*seq[p0][:2]) and is_rst(*seq[-1][:2])
    # 规则②：离心机动作前后紧跟复位
    cf_idx = [i for i, x in enumerate(seq) if x[0] == 'gn_centrifuge' and x[1] != 8]
    r2 = all(is_rst(*seq[i - 1][:2]) and is_rst(*seq[i + 1][:2]) for i in cf_idx)
    # 规则③：9320 block 首尾是 create / run
    r3 = seq[c0][2] == 'auto-create_protocol' and seq[p0 - 1][2] == 'auto-run_protocol'

    print('\n规则① 固体首尾复位=%s | 离心机首尾复位=%s | 堆栈首尾复位=%s' % (r1, r1c, r1s))
    print('规则② 离心机动作前后复位包裹=%s' % r2)
    print('规则③ 9320 块 create→动作→run=%s' % r3)
    print('\n全部通过 ✅' if (r1 and r1c and r1s and r2 and r3) else '\n存在未通过项 ❌')
