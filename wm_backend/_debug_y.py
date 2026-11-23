import sys, traceback
sys.path.insert(0, 'app')
try:
    from bo_layered import load_master_points
    import numpy as np
    points = load_master_points()
    ys = [p['y'] for p in points]
    print(f'训练点总数: {len(points)}')
    print(f'y 分布: min={min(ys):.0f}, max={max(ys):.0f}, median={np.median(ys):.0f}')
    print(f'y>10000 的点: {sum(1 for y in ys if y>10000)}')
    print(f'y<1000 的点: {sum(1 for y in ys if y<1000)}')
    print()
    print('y 最大的 5 个点:')
    top5 = sorted(points, key=lambda p: -p['y'])[:5]
    for p in top5:
        print(f'  load={p["load"]}, ch4={p["ch4"]}, o2={p["o2"]}, y={p["y"]:.0f}, sel={p["sel"]:.1f}')
except Exception as e:
    traceback.print_exc()
