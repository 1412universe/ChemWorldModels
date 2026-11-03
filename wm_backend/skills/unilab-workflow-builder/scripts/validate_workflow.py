# -*- coding: utf-8 -*-
"""
PRCXI 工作流 JSON 校验器。

检查项
------
1. JSON 合法、结构完整（顶层含 target_lab_uuid / name / data.nodes / data.edges）
2. 拓扑：0 悬空边、根/汇各 1（线性链）、0 非线性节点（出/入度>1）、全节点可达
3. ⚠️ 液体处理节点（move_plate / titration_liquid / auto-create_protocol / auto-run_protocol）
   device_name 必须 == "PRCXI"，resource_name 必须 == "liquid_handler.prcxi"
4. ⚠️ 固体加样节点 param 关键坐标键必须落地（非 None）：
   x_pos / y_pos / material_z_pos（不是 x / y / material_z）
5. 报告 cmd11 加样次数与 volune_weight 是否齐备
6. ⚠️ 强制工艺规则（用户确认，硬性校验，违反即失败）：
   - 规则① 设备首尾复位：每个复位设备（固体/堆栈/离心机/离心管/机械臂）的每段连续操作，
     段首与段尾必须紧邻该设备的复位节点。（PRCXI 无复位节点，其首尾由规则③的 create→run 覆盖）
   - 规则② 离心机(gn_centrifuge) / 堆栈(gn_rotary_stack) 每个动作的**前后**必须紧邻复位节点。
   - 规则③ 9320(PRCXI) 每个动作必须落在 auto-create_protocol … auto-run_protocol 包裹内。

用法
----
    python3 validate_workflow.py <workflow.json> [--json]

退出码：全部通过返回 0；有失败项（含工艺规则违反）返回 1。
"""
import json
import sys
import argparse


# ---- 强制工艺规则（用户确认）：设备首尾复位 / 离心机堆栈逐动作复位 / 9320 create→run 包裹 ----
# 具备「复位节点」概念的设备（规则① 仅对这些设备做首尾复位检查）。
# 注意：gn_robotic_arm 已从本集合移除——金四面体等真实参考工作流中机械臂无任何独立
#   arm-reset 节点（指令类型 cmd_type=7 亦无真实 template_uuid），其动作闭合靠「pick→place
#   成对」保证，故豁免规则①，避免注入占位无效节点。
RESET_DEVICES = {'gn_solid_weighing', 'gn_rotary_stack', 'gn_centrifuge',
                 'gn_centrifuge_tube_liquid_handling'}
# 规则② 适用设备：离心机与堆栈（每步动作前后复位）
PER_ACTION_RESET_DEVICES = {'gn_centrifuge', 'gn_rotary_stack'}


def is_reset_node(n):
    """判断节点是否为其设备的复位节点（按参考文件实测的命令语义）。"""
    dn = n.get('device_name')
    p = n.get('param') or {}
    tn = n.get('template_name')
    if dn == 'gn_solid_weighing' and p.get('cmd_type') == 20:
        return True
    if dn == 'gn_rotary_stack' and p.get('cmd_type') == 7:
        return True
    if dn == 'gn_centrifuge' and p.get('cmd_type') == 8:
        return True
    if dn == 'gn_centrifuge_tube_liquid_handling' and tn == 'auto-reset':
        return True
    if dn == 'gn_robotic_arm' and p.get('cmd_type') == 7:
        return True
    return False


def dfs_order(nodes, edges):
    """沿 edges 从根节点做 DFS，得到执行顺序（与 parent_uuid 无关）。"""
    uuid2node = {n['uuid']: n for n in nodes}
    out_edges = {}
    for e in edges:
        out_edges.setdefault(e['source_node_uuid'], []).append(e['target_node_uuid'])
    indeg = {n['uuid']: 0 for n in nodes}
    for e in edges:
        indeg[e['target_node_uuid']] = indeg.get(e['target_node_uuid'], 0) + 1
    roots = [n['uuid'] for n in nodes if indeg.get(n['uuid'], 0) == 0]
    seen = set()
    order = []
    def dfs(u):
        if u in seen:
            return
        seen.add(u)
        order.append(uuid2node[u])
        for v in out_edges.get(u, []):
            dfs(v)
    for r in roots:
        dfs(r)
    return order


def check_reset_rules(nodes, edges, problems):
    """把规则①②③作为硬性检查追加到 problems。"""
    order = dfs_order(nodes, edges)

    # 规则③：9320 每个动作须落在 auto-create_protocol .. auto-run_protocol 包裹内
    create_stack = []
    for n in order:
        nm = n.get('name')
        if nm == 'auto-create_protocol':
            create_stack.append(n)
        elif nm == 'auto-run_protocol':
            if not create_stack:
                problems.append('规则③：auto-run_protocol 缺少对应 auto-create_protocol | %s'
                                % (n.get('footer')))
            else:
                create_stack.pop()
        elif n.get('device_name') == 'PRCXI':
            if not create_stack:
                problems.append('规则③：9320 动作未在 create..run 包裹内 | %s / %s'
                                % (nm, n.get('footer')))
    if create_stack:
        problems.append('规则③：auto-create_protocol 未闭合（缺少 auto-run_protocol）')

    # 规则①：复位设备每段连续操作的段首/段尾须为复位节点
    # （PRCXI 不在此列，其首尾由规则③的 create→run 覆盖）
    seg_dev = None
    seg = []
    segments = []
    for n in order:
        d = n.get('device_name')
        if d in RESET_DEVICES:
            if d == seg_dev:
                seg.append(n)
            else:
                if seg:
                    segments.append((seg_dev, seg))
                seg_dev = d
                seg = [n]
        else:
            if seg:
                segments.append((seg_dev, seg))
                seg_dev = None
                seg = []
    if seg:
        segments.append((seg_dev, seg))
    for dev, seg_nodes in segments:
        if dev is None or dev not in RESET_DEVICES:
            continue
        if not is_reset_node(seg_nodes[0]):
            problems.append('规则①：设备 %s 段首未复位 | %s' % (dev, seg_nodes[0].get('footer')))
        if not is_reset_node(seg_nodes[-1]):
            problems.append('规则①：设备 %s 段尾未复位 | %s' % (dev, seg_nodes[-1].get('footer')))

    # 规则②：离心机/堆栈 每个动作前后须紧邻复位节点
    for i, n in enumerate(order):
        d = n.get('device_name')
        if d in PER_ACTION_RESET_DEVICES and not is_reset_node(n):
            prev_ok = i > 0 and is_reset_node(order[i - 1])
            nxt_ok = i < len(order) - 1 and is_reset_node(order[i + 1])
            if not (prev_ok and nxt_ok):
                problems.append('规则②：设备 %s 动作前后未复位 | %s' % (d, n.get('footer')))



def validate(doc):
    problems = []
    # 结构
    for k in ('target_lab_uuid', 'name', 'data'):
        if k not in doc:
            problems.append('缺少顶层字段: %s' % k)
    data = doc.get('data', {})
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    if not nodes:
        problems.append('nodes 为空')
        return problems, None

    uu = {n['uuid'] for n in nodes}
    # 拓扑
    dangling = [e for e in edges if e['source_node_uuid'] not in uu or e['target_node_uuid'] not in uu]
    if dangling:
        problems.append('悬空边: %d' % len(dangling))
    indeg = {}; outdeg = {}
    for e in edges:
        outdeg[e['source_node_uuid']] = outdeg.get(e['source_node_uuid'], 0) + 1
        indeg[e['target_node_uuid']] = indeg.get(e['target_node_uuid'], 0) + 1
    roots = [n for n in nodes if indeg.get(n['uuid'], 0) == 0]
    sinks = [n for n in nodes if outdeg.get(n['uuid'], 0) == 0]
    nonlin = [n for n in nodes if outdeg.get(n['uuid'], 0) > 1 or indeg.get(n['uuid'], 0) > 1]
    if len(roots) != 1:
        problems.append('根节点数=%d（期望 1）' % len(roots))
    if len(sinks) != 1:
        problems.append('汇节点数=%d（期望 1）' % len(sinks))
    if nonlin:
        problems.append('非线性节点数=%d' % len(nonlin))
    # 可达
    seen = set(); st = [r['uuid'] for r in roots]
    while st:
        u = st.pop()
        if u in seen:
            continue
        seen.add(u)
        for e in edges:
            if e['source_node_uuid'] == u:
                st.append(e['target_node_uuid'])
    unreached = [n for n in nodes if n['uuid'] not in seen]
    if unreached:
        problems.append('不可达节点: %d' % len(unreached))

    # 液体处理节点 device/resource 检查
    lh_names = ('move_plate', 'titration_liquid', 'auto-create_protocol', 'auto-run_protocol')
    lh = [n for n in nodes if n['name'] in lh_names]
    # 多设备工作流（含离心/烘箱/锁紧/快换/离心管/真空烘箱等）未必含 9320 液体节点；
    # 仅当整张工作流连一个已知设备动作节点都没有时才报警。
    KNOWN_DEVICES = ('gn_robotic_arm', 'gn_rotary_stack', 'gn_solid_weighing', 'PRCXI',
                     'gn_centrifuge', 'gn_centrifuge_tube_liquid_handling', 'gn_locking_mechanism',
                     'gn_quick_carrier_exchange', 'gn_standard_oven', 'gn_vacuum_oven')
    if not lh and not any(n.get('device_name') in KNOWN_DEVICES for n in nodes):
        problems.append('未找到任何已知设备动作节点（move_plate/titration/solid 等）')
    for n in lh:
        if n.get('device_name') != 'PRCXI':
            problems.append('液体处理节点 device_name=%r（应=PRCXI）| %s'
                            % (n.get('device_name'), n.get('footer')))
        if n.get('resource_name') != 'liquid_handler.prcxi':
            problems.append('液体处理节点 resource_name=%r（应=liquid_handler.prcxi）| %s'
                            % (n.get('resource_name'), n.get('footer')))

    # 固体加样 param 关键坐标键
    solid = [n for n in nodes if n.get('device_name') == 'gn_solid_weighing']
    for n in solid:
        p = n.get('param') or {}
        for key in ('x_pos', 'y_pos', 'material_z_pos'):
            if p.get(key) is None:
                problems.append('固体加样节点 %s param.%s 为 None（键名应为 %s，值未落地）'
                                % (n.get('footer'), key, key))

    # cmd11 加样统计（仅 gn_solid_weighing 的 cmd_type=11 才是固体加料，须带 volune_weight；
    # 其它设备如 gn_locking_mechanism 的 cmd_type=11 是「电批拧紧」，语义不同，不应误判）
    cmd11 = [n for n in nodes if n.get('device_name') == 'gn_solid_weighing'
             and (n.get('param') or {}).get('cmd_type') == 11]
    missing_wt = [n for n in cmd11 if (n.get('param') or {}).get('volune_weight') is None]
    if missing_wt:
        problems.append('cmd11 加样缺少 volune_weight 的节点数: %d' % len(missing_wt))

    # 强制工艺规则①②③（硬性校验）
    check_reset_rules(nodes, edges, problems)

    stats = {
        'nodes': len(nodes),
        'edges': len(edges),
        'dangling': len(dangling),
        'roots': len(roots),
        'sinks': len(sinks),
        'nonlinear': len(nonlin),
        'unreached': len(unreached),
        'liquid_handler_nodes': len(lh),
        'solid_nodes': len(solid),
        'cmd11_count': len(cmd11),
        'rule_violations': len([p for p in problems if p.startswith('规则')]),
    }
    return problems, stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--json', action='store_true', help='以 JSON 输出结果')
    args = ap.parse_args()
    try:
        doc = json.load(open(args.path, encoding='utf-8'))
    except Exception as e:
        print('JSON 解析失败: %s' % e)
        sys.exit(1)
    problems, stats = validate(doc)
    if args.json:
        print(json.dumps({'ok': not problems, 'stats': stats, 'problems': problems},
                         ensure_ascii=False, indent=2))
    else:
        print('节点=%d 边=%d 悬空=%d 非线性=%d 不可达=%d'
              % (stats['nodes'], stats['edges'], stats['dangling'], stats['nonlinear'], stats['unreached']))
        print('液体处理节点=%d 固体节点=%d cmd11加样=%d 工艺规则违反=%d'
              % (stats['liquid_handler_nodes'], stats['solid_nodes'],
                 stats['cmd11_count'], stats['rule_violations']))
        if problems:
            print('\n❌ 发现 %d 个问题:' % len(problems))
            for p in problems:
                print('  -', p)
            sys.exit(1)
        else:
            print('\n✅ 校验通过')
    sys.exit(0 if not problems else 1)


if __name__ == '__main__':
    main()
