import sys, traceback
sys.path.insert(0, 'app')
try:
    from bo_layered import recommend_3x3
    r = recommend_3x3()
    print(f'ok={r["ok"]}, n_top={len(r["top"])}')
    print(f'σ={r["proof"].get("sigma_pct")}%, n_train={r["proof"].get("n_train")}')
    print(f'当前最优（可行域内）: ystar={r["proof"]["ystar"]:.0f}, selstar={r["proof"]["selstar"]:.1f}%')
    print(f'  ch4={r["proof"]["ch4"]}, o2={r["proof"]["o2"]}, ar={r["proof"]["ar"]}, power={r["proof"]["power"]:.1f}%')
    print()
    print('=== Top 10 ===')
    for t in r['top'][:10]:
        print(f'  #{t["rank"]:2d} {t["kind"]:8s}: load={t["loading"]:>5}%, ch4={t["ch4"]:>3}, o2={t["o2"]:>3}, ar={t["ar"]:>3}, pw={t["power"]:>5.1f}%, m={t["mass"]:>2}mg, y={t["y"]:>7.0f}, sel={t["sel"]:>5.1f}%, dom={t["in_domain"]}, measured={t["measured"]}')
except Exception as e:
    traceback.print_exc()
