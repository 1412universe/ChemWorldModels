import sys, traceback
sys.path.insert(0, 'app')
try:
    from bo_layered import load_master_points, find_best_measured, FLOW_HI
    points = load_master_points()
    best = find_best_measured(points)
    print(f'可行域内最优:')
    print(f'  load={best["load"]}%')
    print(f'  ch4={best["ch4"]} mL/min')
    print(f'  o2={best["o2"]} mL/min')
    print(f'  ar={best["ar"]} mL/min')
    print(f'  y={best["y"]:.0f} μmol/g/h')
    print(f'  sel={best["sel"]:.1f}%')
    print()
    print(f'可行域上限: ch4={FLOW_HI}')
    print(f'全表最优 ch4=180 超出可行域，已排除')
except Exception as e:
    traceback.print_exc()
