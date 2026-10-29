#!/usr/bin/env python3
"""wfrun_api_check.py — 工作流运行接口端到端自检（不碰硬件）

覆盖：
  1. POST /api/workflow-plan         预检（含环检测）
  2. POST /api/workflow-run          启动 dry-run
  3. GET  /api/workflow-run/{id}/stream  SSE 事件流
  4. GET  /api/workflow-run/{id}     终态快照
  5. POST /api/workflow-run/{id}/cancel  取消
  6. 环依赖工作流必须被拒绝
"""
import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
SAMPLE = "/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/static/assets/unilab_workflow.sample.json"


def post(path, body):
    req = urllib.request.Request(BASE + path, method="POST",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def get(path, timeout=60):
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return json.loads(r.read().decode())


def ok(name, cond, extra=""):
    print(("  [PASS] " if cond else "  [FAIL] ") + name + (("  " + str(extra)) if extra else ""))
    return bool(cond)


def main():
    fails = []
    wf = json.load(open(SAMPLE, encoding="utf-8"))

    print("1) 预检 /api/workflow-plan")
    j = post("/api/workflow-plan", {"workflow": wf})
    fails.append(not ok("plan ok", j.get("ok"), "count=%s sum=%ss" % (j.get("count"), j.get("sum_duration"))))
    fails.append(not ok("plan 返回节点耗时", len(j.get("nodes") or []) > 0,
                        "n=%d" % len(j.get("nodes") or [])))
    fails.append(not ok("plan 返回资源锁计划", isinstance(j.get("resource_plan"), dict)))

    print("2) 启动 dry-run /api/workflow-run")
    j = post("/api/workflow-run", {"workflow": wf, "mode": "dry", "speed": 60})
    fails.append(not ok("run 已启动", j.get("ok"), j.get("run_id")))
    if not j.get("ok"):
        print(j)
        return 1
    rid = j["run_id"]

    print("3) SSE 事件流 /api/workflow-run/%s/stream" % rid)
    req = urllib.request.Request(BASE + "/api/workflow-run/%s/stream" % rid)
    ev_kinds, snaps, done_seen, last = [], 0, False, None
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=90) as r:
        kind = None
        while time.time() - t0 < 80:
            line = r.readline()
            if not line:
                break
            line = line.decode("utf-8", "replace").rstrip("\n")
            if line.startswith("event: "):
                kind = line[7:].strip()
                ev_kinds.append(kind)
            elif line.startswith("data: ") and kind == "snapshot":
                snaps += 1
                last = json.loads(line[6:])
            elif line.startswith("data: ") and kind == "done":
                done_seen = True
                break
    el = time.time() - t0
    fails.append(not ok("SSE 收到 hello", "hello" in ev_kinds))
    fails.append(not ok("SSE 收到 snapshot", snaps > 0, "%d 帧" % snaps))
    fails.append(not ok("SSE 收到 done", done_seen, "%.1fs" % el))

    print("4) 终态快照 /api/workflow-run/%s" % rid)
    snap = get("/api/workflow-run/%s" % rid)
    fails.append(not ok("snapshot ok", snap.get("ok")))
    fails.append(not ok("运行已结束", snap.get("finished")))
    s = snap.get("summary") or {}
    c = s.get("counts") or {}
    fails.append(not ok("全部节点 success", c.get("success") == len(snap.get("states") or {}),
                        str(c)))
    fails.append(not ok("有墙钟/并行度指标", s.get("wall_clock", 0) > 0 and "peak_parallelism" in s,
                        "wall=%ss peak=%s speedup=%s" % (s.get("wall_clock"), s.get("peak_parallelism"), s.get("speedup"))))
    fails.append(not ok("timing 记录了每节点起止",
                        all(("start" in t and "end" in t) for t in (snap.get("timing") or {}).values()),
                        "%d 条" % len(snap.get("timing") or {})))
    print("      counts=%s  peak=%s  wall=%ss  sum=%ss  speedup=%s  devices=%s"
          % (c, s.get("peak_parallelism"), s.get("wall_clock"), s.get("sum_node_duration"),
             s.get("speedup"), s.get("devices")))

    print("5) 列出运行 /api/workflow-runs")
    j = get("/api/workflow-runs")
    fails.append(not ok("runs 列表含本次", any(x["run_id"] == rid for x in j.get("runs") or [])))

    print("6) 取消 /api/workflow-run/{id}/cancel")
    j2 = post("/api/workflow-run", {"workflow": wf, "mode": "dry", "speed": 1})
    rid2 = j2.get("run_id")
    time.sleep(0.5)
    jc = post("/api/workflow-run/%s/cancel" % rid2, {})
    fails.append(not ok("cancel 成功", jc.get("ok")))
    time.sleep(2.0)
    snap2 = get("/api/workflow-run/%s" % rid2)
    c2 = (snap2.get("summary") or {}).get("counts") or {}
    fails.append(not ok("取消后确有 canceled 节点", (c2.get("canceled") or 0) > 0, str(c2)))

    print("7) 环依赖必须被拒绝")
    cyc = {
        "name": "cycle-test",
        "data": {
            "nodes": [
                {"uuid": "a", "device_name": "d1", "name": "n", "param": {}},
                {"uuid": "b", "device_name": "d2", "name": "n", "param": {}},
            ],
            "edges": [
                {"source_node_uuid": "a", "target_node_uuid": "b"},
                {"source_node_uuid": "b", "target_node_uuid": "a"},
            ],
        },
    }
    jp = post("/api/workflow-plan", {"workflow": cyc})
    fails.append(not ok("plan 检出环", not jp.get("ok") and jp.get("cycle"), jp.get("error")))
    jr = post("/api/workflow-run", {"workflow": cyc, "mode": "dry"})
    fails.append(not ok("run 拒绝环", not jr.get("ok"), jr.get("error")))

    print("8) real 模式的安全闸（未打开总闸必须明确拒绝，不能假成功）")
    jx = post("/api/workflow-run", {"workflow": wf, "mode": "real", "action_mode": "real"})
    fails.append(not ok("real+real 无总闸 → 拒绝启动",
                        (not jx.get("ok")) and "总闸" in (jx.get("error") or ""),
                        (jx.get("error") or "")[:70]))
    jy = post("/api/workflow-run", {"workflow": wf, "mode": "real", "action_mode": "bogus"})
    fails.append(not ok("非法 action_mode → 拒绝", not jy.get("ok")))

    print("9) 资源占用计划 /api/workflow-run/{id}/resource-plan")
    jp2 = get("/api/workflow-run/%s/resource-plan" % rid)
    fails.append(not ok("resource-plan ok", jp2.get("ok") and isinstance(jp2.get("plan"), dict)))

    # ---------------- GN 510 后端适配器 ----------------
    print("10) GN 适配器状态 /api/gn-adapter/status")
    gs = get("/api/gn-adapter/status")
    fails.append(not ok("status ok", gs.get("ok"), gs.get("error")))
    cat = gs.get("catalog") or {}
    devs = cat.get("devices") or {}
    fails.append(not ok("GN 驱动全部装载（12 台含液冷，零错误）",
                        len(devs) == 12 and not (cat.get("load_errors") or {}),
                        "loaded=%d errors=%s" % (len(devs), cat.get("load_errors"))))
    fails.append(not ok("平台 shim 无兜底降级", not (cat.get("platform_shim_errors") or []),
                        str(cat.get("platform_shim_errors"))))
    specs = set(gs.get("device_specs") or [])
    fails.append(not ok("设备清单含 PRCXI / 液冷（均有驱动）",
                        {"PRCXI", "gn_liquid_cooling"} <= specs
                        and not (cat.get("unsupported") or {})))
    cfg = gs.get("config") or {}
    fails.append(not ok("默认不打开真机总闸", cfg.get("allow_real") is False))
    fails.append(not ok("默认驱动档为 simulate", cfg.get("action_mode") == "simulate",
                        "url=%s" % cfg.get("opcua_url")))
    print("      root=%s" % cfg.get("unilabos_root"))
    print("      node_csv=%s" % cfg.get("node_csv"))

    # ---- 节点表必须源自 1.4.0（一切冲突以 1.4.0 为准）----
    # 仓库自带的 opcua_gn1.3.9.csv 有 11 处冲突：8 个 1.4.0 新点位它没有、
    # 3 个 1.4.0 已移除的点位它还在；且 OPEN_DOOR / COHSE_DOOR 写成小写 `bool`，
    # 撞上驱动 DataType[...] 的大小写敏感枚举（成员是 BOOLEAN）→ 整行被跳过。
    fails.append(not ok("节点表源自 1.4.0（非仓库 1.3.9 兜底）",
                        "1.4.0" in str(cfg.get("node_csv_source") or ""),
                        str(cfg.get("node_csv_source"))))
    fails.append(not ok("节点表覆盖 1.4.0 全量 240 点位（不丢点）",
                        cfg.get("node_csv_points") == 240,
                        str(cfg.get("node_csv_points"))))
    man = cfg.get("node_csv_manifest") or {}
    fails.append(not ok("节点表带审计清单（源 md5 与增删记录）",
                        man.get("authoritative_md5") == "1c12db10fae0f0a88c9b1d6f3d99d59c"
                        and len(man.get("added_vs_legacy") or []) == 8
                        and len(man.get("removed_vs_legacy") or []) == 3,
                        "md5=%s +%d -%d" % (man.get("authoritative_md5"),
                                            len(man.get("added_vs_legacy") or []),
                                            len(man.get("removed_vs_legacy") or []))))

    print("11) 逐设备动作清单 /api/gn-adapter/status?device=...")
    ga = get("/api/gn-adapter/status?device=gn_locking_mechanism")
    acts = [a.get("method") for a in (ga.get("actions") or [])]
    fails.append(not ok("锁紧模块暴露 execute_command", "execute_command" in acts, str(acts)))
    ga2 = get("/api/gn-adapter/status?device=gn_robotic_arm")
    acts2 = [a.get("method") for a in (ga2.get("actions") or [])]
    fails.append(not ok("机械手暴露 pick/place", {"pick", "place"} <= set(acts2), str(acts2)))
    ga3 = get("/api/gn-adapter/status?device=system")
    acts3 = [a.get("method") for a in (ga3.get("actions") or [])]
    fails.append(not ok("system 暴露只读诊断动作",
                        {"get_plc_stats", "get_system_ready"} <= set(acts3), str(acts3)))

    print("12) 只读探针 /api/gn-adapter/probe（simulate 档不连硬件）")
    gp = get("/api/gn-adapter/probe")
    pr = gp.get("probe") or {}
    fails.append(not ok("probe ok 且标注 simulated", gp.get("ok") and pr.get("simulated") is True))
    fails.append(not ok("probe 不建立 OPC 连接", pr.get("connected") is False))

    # 真机档探针指向**明确不可达**的端点：必须把根因报成「连不上 PLC」，
    # 而不是把驱动的「未找到名称 xxx 的节点」原样抛出（那会把网络故障误判成节点表错）
    gp2 = get("/api/gn-adapter/probe?action_mode=real&opcua_url=opc.tcp://127.0.0.1:45999")
    pr2 = gp2.get("probe") or {}
    fails.append(not ok("real 探针把不可达诊断为链路故障（非节点表问题）",
                        pr2.get("link") == "unreachable", str(pr2.get("error"))[:110]))
    fails.append(not ok("real 探针分开报 connected / registered_nodes",
                        pr2.get("connected") is False
                        and isinstance(pr2.get("registered_nodes"), int), str(pr2)[:110]))
    # 声明总数 == 1.4.0 的 240 —— 少一个就说明有行被驱动静默跳过
    # （1.3.9 表曾因 `bool` 拼写导致只剩 233）。
    # 2026-10-16 起 pending_nodes 语义 = 声明 − 已注册；但 `_node_registry` 是
    # **类属性**（进程内跨 URL 共享），同进程先连过真机的话注册数会带过来，
    # 所以不可达端点场景只锚定「声明数」这一个确定量。
    fails.append(not ok("驱动按 1.4.0 声明 240 个点位（无静默丢点）",
                        pr2.get("declared_nodes") == 240, str(pr2.get("declared_nodes"))))
    fails.append(not ok("real 探针用的也是 1.4.0 节点表",
                        "opcua_gn1.4.1.csv" in str(pr2.get("node_csv") or ""),
                        str(pr2.get("node_csv"))))

    print("13) real+simulate：节点真跑驱动代码路径（不碰硬件）")
    gn_wf = {"name": "gn-adapter-simulate", "data": {
        "nodes": [n for n in ((wf.get("data") or {}).get("nodes") or [])
                  if str(n.get("device_name", "")).startswith("gn_")],
        "edges": [],
    }}
    jr2 = post("/api/workflow-run", {"workflow": gn_wf, "mode": "real", "action_mode": "simulate"})
    fails.append(not ok("real+simulate 已启动", jr2.get("ok"), jr2.get("error")))
    if jr2.get("ok"):
        fails.append(not ok("dispatcher 为 gn-510", jr2.get("dispatcher") == "gn-510",
                            str(jr2.get("dispatcher"))))
        fails.append(not ok("hardware=false（零硬件风险）", jr2.get("hardware") is False))
        rid3 = jr2["run_id"]
        for _ in range(120):
            s3 = get("/api/workflow-run/%s" % rid3)
            if s3.get("finished"):
                break
            time.sleep(0.25)
        c3 = (s3.get("summary") or {}).get("counts") or {}
        n_nodes = len(gn_wf["data"]["nodes"])
        fails.append(not ok("GN 节点全部 success（%d 个）" % n_nodes,
                            (c3.get("success") or 0) == n_nodes, str(c3)))
        infos = s3.get("info") or {}
        has_action = all((infos.get(u) or {}).get("action") for u in (s3.get("states") or {}))
        fails.append(not ok("每个节点都映射到了具体驱动动作", has_action))
        fails.append(not ok("节点信息带 driver_mode/hardware 字段",
                            all((infos.get(u) or {}).get("driver_mode") == "simulate"
                                for u in (s3.get("states") or {}))))

    print("14) real+real：链路不可达时必须在预检处响亮失败（绝不假成功）")
    # 用**明确不可达**的端点，保证不会误连现场 PLC（45999 无人监听）
    jr3 = post("/api/workflow-run", {
        "workflow": gn_wf, "mode": "real", "action_mode": "real", "allow_real": True,
        "opcua_url": "opc.tcp://127.0.0.1:45999",
    })
    fails.append(not ok("real+real 已启动", jr3.get("ok"), jr3.get("error")))
    if jr3.get("ok"):
        rid4 = jr3["run_id"]
        for _ in range(160):
            s4 = get("/api/workflow-run/%s" % rid4)
            if s4.get("finished"):
                break
            time.sleep(0.25)
        infos4 = s4.get("info") or {}
        any_preflight = any((infos4.get(u) or {}).get("phase") == "preflight"
                            for u in (s4.get("states") or {}))
        c4 = (s4.get("summary") or {}).get("counts") or {}
        fails.append(not ok("至少一个节点在 preflight 阶段失败（未下发硬件指令）",
                            any_preflight, str(c4)))
        fails.append(not ok("没有任何节点被标成 success（不假成功）", (c4.get("success") or 0) == 0))
        any_link = any((infos4.get(u) or {}).get("link") == "unreachable"
                       for u in (s4.get("states") or {}))
        fails.append(not ok("失败被诊断为链路不可达（而非节点表错误）", any_link))
        # 工站实例按 (url, 档, 总闸) 缓存：上面第 12 段已用同一 url 建过一个
        # allow_real=false 的实例。若缓存键漏了 allow_real，这里的授权会被
        # 复用成「关闸」，节点会全被挡在 phase=gate —— 这条断言就是那个坑的哨兵。
        any_gate = any((infos4.get(u) or {}).get("phase") == "gate"
                       for u in (s4.get("states") or {}))
        fails.append(not ok("授权 allow_real=true 被如实兑现（无节点被误挡在总闸前）", not any_gate))

    print("15) LIVE 虚拟实时仿真：快照 / 指令注入 / 轨迹 / SSE")
    jl = get("/api/gn-adapter/live")
    fails.append(not ok("live 快照 ok", jl.get("ok")))
    cards = jl.get("cards") or {}
    fails.append(not ok("live 快照含全部 10 卡", len(cards) == 10,
                        ",".join(sorted(cards.keys()))))
    liq_r = ((cards.get("liquid") or {}).get("readings") or {})
    fails.append(not ok("liquid 卡含液冷读数（9320×2）",
                        any(k.startswith("液冷") for k in liq_r), str(liq_r)))
    dmtp = (cards.get("liquid") or {}).get("dmtp") or {}
    fails.append(not ok("PRCXI 卡带 dmtp 镜像状态", "running" in dmtp))
    # 注意：oven 卡不能拿来做「环境基调 25」断言 —— 第 13 段 real+simulate
    # 真跑了烘箱节点（写 Oven_TempSet=60），且工作站缓存键与 live 相同，
    # 读数合法地显示「写入值 → 待机缓动回归」—— 这正是 live 的意义。
    # 用真空烘箱卡断言基调（样例工作流不含真空烘箱节点，从未被写过）。
    vac_r = ((cards.get("vacuum") or {}).get("readings") or {})
    fails.append(not ok("vacuum 卡温度 = 环境基调 25（未设定时的物理事实）",
                        abs((vac_r.get("温度") or 0) - 25.0) < 0.01, str(vac_r)))
    # 指令注入：液冷 6℃ → 两卡读数全部变 6
    jc = post("/api/gn-adapter/live/cmd",
              {"card": "liquid", "action": "set_temperature", "param": {"temperature": 6}})
    fails.append(not ok("live/cmd 液冷 6℃ 注入成功", jc.get("ok"), str(jc.get("error") or "")))
    jl2 = get("/api/gn-adapter/live")
    c2 = jl2.get("cards") or {}
    liq2 = ((c2.get("liquid") or {}).get("readings") or {})
    tube2 = ((c2.get("tube") or {}).get("readings") or {})
    lc_vals = [v for k, v in list(liq2.items()) + list(tube2.items()) if k.startswith("液冷")]
    fails.append(not ok("注入后两卡 7 个液冷模块读数全部 = 6",
                        len(lc_vals) == 7 and all(abs(v - 6.0) < 0.01 for v in lc_vals),
                        str(lc_vals)))
    # 越界温度必须响亮拒绝（4-28℃ 合理区间）
    jbad = post("/api/gn-adapter/live/cmd",
                {"card": "liquid", "action": "set_temperature", "param": {"temperature": 99}})
    fails.append(not ok("液冷 99℃ 越界被拒（4-28℃ 区间）", not jbad.get("ok")))
    # 轨迹：动作已记录（run_node 挂钩 + 手动注入都会进 trace）
    jt = get("/api/gn-adapter/live/trace?limit=10")
    tr = jt.get("trace") or []
    fails.append(not ok("live/trace 有事件轨迹", len(tr) > 0, "n=%d" % len(tr)))
    fails.append(not ok("液冷注入被记为真实设备（gn_liquid_cooling，非 PRCXI 卡名）",
                        any(e.get("device") == "gn_liquid_cooling" for e in tr)))
    # SSE：读 2 帧即算通（不读完整个流）
    try:
        req_l = urllib.request.Request(BASE + "/api/gn-adapter/live/stream?interval=0.5")
        got_frame = False
        t0l = time.time()
        with urllib.request.urlopen(req_l, timeout=10) as r:
            while time.time() - t0l < 6:
                line = r.readline().decode("utf-8", "replace")
                if line.startswith("event: live"):
                    got_frame = True
                    break
        fails.append(not ok("live SSE 流推送快照帧", got_frame))
    except Exception as exc:                                  # noqa: BLE001
        fails.append(not ok("live SSE 流推送快照帧", False, str(exc)))

    bad = sum(1 for f in fails if f)
    print("\n%s  共 %d 项检查，失败 %d 项" % ("全部通过 ✔" if bad == 0 else "存在失败 ✘", len(fails), bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
