#!/usr/bin/env python3
"""
Uni-Lab OS 多通道加样批量生成器
==============================
把 N 通道加样工作流扩展为 M 通道（如 8→96），保持源文件结构完全一致。

用法:
    python3 gen_multichannel_solid.py <src.json> <dst.json> [total] [cols] [x0] [y0] [step]

默认: total=96, cols=8, x0=-634, y0=650, step=90（适配 8→96 通道）

规则（已写入 SKILL.md pitfall #12）:
  - 板布局: cols 列 × rows 行（行优先），rows = total/cols
  - x = x0 + col * step       （列方向步进）
  - y = y0 + row * step       （行方向步进）
  - w(天平读数) = w0 + idx * (w_last - w0)/(src_total-1)  延续源文件线性累加
  - 每轮: 取桶(cmd9) → 加样(cmd11) → 放回(cmd19)
  - 首尾: 复位(cmd20) + 夹取料架(cmd12) + 放置工位(cmd13) ... -夹取工位 + 放回料架 + 复位
  - 模板按 cmd_type + footer 关键词精确挑选（源 nodes 数组无序！）
  - edge 用 handle 机制: source_handle_key/target_handle_key = "ready",
    source_handle_io="source", target_handle_io="target", 无 uuid 字段
  - workflow_uuid 重新生成, target_lab_uuid 保持源值

依赖: 仅 Python 标准库（json, uuid, copy, re, sys）
"""
import json, uuid, copy, re, sys, os


def find_tmpl(nodes, cmd_type, footer_kw=None):
    """按 cmd_type + footer 关键词从源 nodes 里精确挑模板节点"""
    for n in nodes:
        p = n.get('param', {})
        if p.get('cmd_type') != cmd_type:
            continue
        if footer_kw and footer_kw not in (n.get('footer') or ''):
            continue
        return copy.deepcopy(n)
    raise ValueError(f'模板未找到: cmd_type={cmd_type} footer_kw={footer_kw}')


def gen_multichannel(src_path, dst_path, total=96, cols=8, x0=-634, y0=650, step=90):
    src = json.load(open(src_path, encoding='utf-8'))
    src_nodes = src['data']['nodes']

    rows = total // cols
    if rows * cols != total:
        raise ValueError(f'total={total} 不是 cols={cols} 的整数倍')

    # 模板节点（按 cmd_type 精确挑选，不依赖数组下标）
    tmpl_reset_start = find_tmpl(src_nodes, 20, '复位')
    tmpl_reset_end   = find_tmpl(src_nodes, 20)                 # footer 空的复位
    tmpl_pick_rack   = find_tmpl(src_nodes, 12, '夹取料架')
    tmpl_pick_stand  = find_tmpl(src_nodes, 12, '夹取加样工位')
    tmpl_place_stand = find_tmpl(src_nodes, 13, '放置加样工位')
    tmpl_place_rack  = find_tmpl(src_nodes, 13, '放回料架')
    tmpl_pick_bucket = find_tmpl(src_nodes, 9)                  # 取桶
    tmpl_add         = find_tmpl(src_nodes, 11)                 # 加样
    tmpl_return      = find_tmpl(src_nodes, 19)                 # 放回桶

    # 取源文件 w 序列，拟合线性步长
    w_src = []
    for n in src_nodes:
        if n['param'].get('cmd_type') == 11:
            m = re.search(r'R(\d+)', n['footer'] or '')
            if m:
                w_src.append((int(m.group(1)), n['param']['volune_weight']))
    w_src.sort()
    if not w_src:
        raise ValueError('源文件未找到 cmd11 加样节点')
    w0 = w_src[0][1]
    w_last = w_src[-1][1]
    w_step = (w_last - w0) / (len(w_src) - 1) if len(w_src) > 1 else 0
    print(f'源文件 w 序列: {w_src}')
    print(f'w0={w0}, w_step={w_step:.4f}')

    # 从模板节点取料桶坐标和 z 位置
    bucket_x = tmpl_pick_bucket['param']['x_pos']
    bucket_y = tmpl_pick_bucket['param']['y_pos']
    bucket_mz = tmpl_pick_bucket['param']['material_z_pos']
    weigh_mz = tmpl_add['param']['material_z_pos']

    def mk_node(tmpl, **overrides):
        n = copy.deepcopy(tmpl)
        n['uuid'] = str(uuid.uuid4())
        n['parent_uuid'] = ''
        p = n['param']
        if 'param' in overrides:
            p.update(overrides['param'])
        if 'footer' in overrides:
            n['footer'] = overrides['footer']
        return n

    nodes = []

    # 首部: 复位 + 夹取料架 + 放置工位
    nodes.append(mk_node(tmpl_reset_start, footer='固体加样-复位'))
    nodes.append(mk_node(tmpl_pick_rack, footer='夹取料架'))
    nodes.append(mk_node(tmpl_place_stand, footer='放置加样工位'))

    # 加样轮: 取桶 → 加样 → 放回
    for idx in range(total):
        r, c = divmod(idx, cols)
        x = x0 + c * step
        y = y0 + r * step
        w = round(w0 + idx * w_step)
        label = f'Step{total}-R{idx+1}'

        nodes.append(mk_node(tmpl_pick_bucket,
            param={'x_pos': bucket_x, 'y_pos': bucket_y, 'material_z_pos': bucket_mz},
            footer=f'{label}: 取3号桶AA'))

        nodes.append(mk_node(tmpl_add,
            param={'x_pos': x, 'y_pos': y, 'material_z_pos': weigh_mz,
                   'volune_weight': w},
            footer=f'{label}: 加AA @X{x}'))

        nodes.append(mk_node(tmpl_return,
            param={'x_pos': bucket_x, 'y_pos': bucket_y, 'material_z_pos': bucket_mz},
            footer=f'{label}: 放回3号桶AA'))

    # 尾部: -夹取工位 + 放回料架 + 复位
    nodes.append(mk_node(tmpl_pick_stand, footer='-夹取加样工位'))
    nodes.append(mk_node(tmpl_place_rack, footer='放回料架'))
    nodes.append(mk_node(tmpl_reset_end, footer='固体加样-复位'))

    # edge: handle 机制，无 uuid 字段（pitfall #10）
    edges = []
    for i in range(len(nodes) - 1):
        edges.append({
            'source_node_uuid': nodes[i]['uuid'],
            'target_node_uuid': nodes[i+1]['uuid'],
            'source_handle_key': 'ready',
            'source_handle_io': 'source',
            'target_handle_key': 'ready',
            'target_handle_io': 'target',
        })

    # 输出: 保留源顶层结构, workflow_uuid 重新生成（pitfall #11）
    out = copy.deepcopy(src)
    out['name'] = f'{total}通道加样'
    data = out['data']
    data['nodes'] = nodes
    data['edges'] = edges
    if 'workflow_name' in data:
        data['workflow_name'] = f'{total}通道加样'
    if 'workflow_uuid' in data:
        data['workflow_uuid'] = str(uuid.uuid4())

    with open(dst_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f'生成完成: {dst_path}')
    print(f'节点数: {len(nodes)}  边数: {len(edges)}')
    print(f'文件大小: {os.path.getsize(dst_path)} bytes')
    return out


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('用法: python3 gen_multichannel_solid.py <src.json> <dst.json> [total=96] [cols=8] [x0=-634] [y0=650] [step=90]')
        sys.exit(1)
    src_path = sys.argv[1]
    dst_path = sys.argv[2]
    total = int(sys.argv[3]) if len(sys.argv) > 3 else 96
    cols  = int(sys.argv[4]) if len(sys.argv) > 4 else 8
    x0    = int(sys.argv[5]) if len(sys.argv) > 5 else -634
    y0    = int(sys.argv[6]) if len(sys.argv) > 6 else 650
    step  = int(sys.argv[7]) if len(sys.argv) > 7 else 90
    gen_multichannel(src_path, dst_path, total, cols, x0, y0, step)
