# -*- coding: utf-8 -*-
"""离心管液体处理复位。顺序与 GN/gn_centrifuge_tube_liquid_handling.py 的 reset 一致。

驱动里的复位（指令 36）是：
    Tube_SmallGripperAngle = 180
    Tube_SmallGripperForce = 100
    Tube_CmdType = 36
    Tube_CmdTrig = 1
    等到 Tube_CompleteFB 读到 1
    再把 Tube_CmdTrig、Tube_CmdType 写回 0

点位来自 OPC_UA协议1.4.0(1).xlsx「点位表」离心管液体处理模块。
Tube_CompleteFB 是只读。Tube_CmdTrig 是上升沿，写 1 后读回 0 仍继续等完成反馈。

在 wm_model 目录运行：
    python3 tube_reset.py
"""

import argparse
import time

from opcua import Client, ua

SERVER = "opc.tcp://192.168.6.6:4840"
NS = "ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA."

# 点位表：36 = 复位
RESET_CMD = 36
# 驱动 reset() 里写死的两个参数
GRIPPER_ANGLE = 180
GRIPPER_FORCE = 100

READ_NODES = (
    "Tube_CmdType",
    "Tube_CmdTrig",
    "Tube_CompleteFB",
    "Tube_XPosFB",
    "Tube_YPosFB",
    "Tube_Z1PosFB",
    "Tube_Z3PosFB",
)


def nid(name):
    return NS + name


def now():
    return time.strftime("%H:%M:%S")


def read_int(client, name):
    raw = client.get_node(nid(name)).get_value()
    if raw is None:
        return None
    return int(raw)


def write_int(client, name, value):
    node = client.get_node(nid(name))
    node.set_value(ua.Variant(int(value), ua.VariantType.Int16))
    back = read_int(client, name)
    print("[%s] 写 %s = %s，读回 %s" % (now(), name, value, back))
    if name == "Tube_CmdTrig" and int(value) == 1 and back == 0:
        print("[%s] 触发位读回 0：脉冲已被 PLC 清掉，继续等完成反馈" % now())
        return back
    if back != int(value):
        raise RuntimeError("%s 写入 %s 后读回 %s" % (name, value, back))
    return back


def snapshot(client, title):
    print("[%s] %s" % (now(), title))
    values = {}
    for name in READ_NODES:
        values[name] = read_int(client, name)
        print("    %s = %s" % (name, values[name]))
    return values


def wait_complete(client, timeout, interval=0.05):
    """完成反馈由 PLC 在动作结束时置 1。运动过程中保持 0，位置仍要每秒打印。"""
    print("[%s] 等待 Tube_CompleteFB == 1，最长 %.0f 秒" % (now(), timeout))
    print("[%s] 动作没做完之前，完成反馈保持 0" % now())
    start = time.monotonic()
    last_print = -1.0
    while True:
        value = read_int(client, "Tube_CompleteFB")
        x_pos = read_int(client, "Tube_XPosFB")
        y_pos = read_int(client, "Tube_YPosFB")
        z1 = read_int(client, "Tube_Z1PosFB")
        z3 = read_int(client, "Tube_Z3PosFB")
        elapsed = time.monotonic() - start
        if value == 1 or elapsed - last_print >= 1.0:
            print(
                "[%s] CompleteFB=%s  X=%s  Y=%s  Z1=%s  Z3=%s  已等 %.1f 秒"
                % (now(), value, x_pos, y_pos, z1, z3, elapsed)
            )
            last_print = elapsed
        if value == 1:
            return True
        if elapsed >= timeout:
            print(
                "[%s] 轴已停、完成反馈仍是 %s。PLC 没有把 Tube_CompleteFB 置 1。"
                % (now(), value)
            )
            return False
        time.sleep(interval)


def clear_command(client):
    print("[%s] 清理指令" % now())
    write_int(client, "Tube_CmdTrig", 0)
    write_int(client, "Tube_CmdType", 0)


def reset_tube(url, timeout):
    client = Client(url)
    client.connect()
    print("[%s] 已连接 %s" % (now(), url))
    triggered = False
    cleared = False
    try:
        snapshot(client, "复位前")
        write_int(client, "Tube_SmallGripperAngle", GRIPPER_ANGLE)
        write_int(client, "Tube_SmallGripperForce", GRIPPER_FORCE)
        write_int(client, "Tube_CmdType", RESET_CMD)
        write_int(client, "Tube_CmdTrig", 1)
        triggered = True
        done = wait_complete(client, timeout)
        clear_command(client)
        cleared = True
        snapshot(client, "复位后")
        if not done:
            print("[%s] 复位未完成：Tube_CompleteFB 没有回到 1。" % now())
            return False
        print("[%s] 离心管液体处理复位完成。" % now())
        return True
    finally:
        if triggered and not cleared:
            try:
                clear_command(client)
            except Exception as exc:
                print("[%s] 清理指令失败：%s" % (now(), exc))
        client.disconnect()
        print("[%s] 已断开" % now())


def main():
    parser = argparse.ArgumentParser(description="按离心管驱动执行复位（Tube_CmdType=36）")
    parser.add_argument("--url", default=SERVER)
    parser.add_argument("--timeout", type=float, default=180.0, help="等待完成反馈的秒数")
    args = parser.parse_args()
    ok = reset_tube(args.url, args.timeout)
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
