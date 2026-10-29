# -*- coding: utf-8 -*-
"""
GN 工站 OPC UA 协议 1.4.0 权威元数据（节点库元数据来源）

来源：`OPC_UA协议1.4.0(2).xlsx`（md5 1c12db10fae0f0a88c9b1d6f3d99d59c，用户 2026-10-14
指定的**最权威、最新**修订版）。工作簿 2 张表：
    ①「点位表」        A1:J384，表头在第 5 行 → 13 个模块分组 / 240 个协议点位
                       （另有 7 行表内编辑残留被过滤，见 gn_opcua_points.DROPPED_ROWS）
    ②「锁紧预锁说明」   55 行 → 预锁/终锁比例、握手、互锁规则
本模块把它固化成可复用元数据，供 `gen_gn_node_library.py` 合并进
`static/assets/gn_node_library.js`。

与上一版 `OPC_UA协议1.4.0.xlsx`（md5 a52e75ca…）的差异只有 2 处，均在「点位表」：
  - 行 162 `Robot_Centrifuge` 描述：`1指第一个动作，2指第二个动作，以此类推`
    → `1指第一个动作，2指第二个动作是离心机前面天平的动作`
  - 行 169 `Robot_balance`（机械手在天平的运行动作，Int16/W）**整行删除**
「锁紧预锁说明」表 0 处差异。

包含六类信息：
  1. PROTOCOL           —— 服务器地址 / 命名空间前缀 / 版本 / 源文件
  2. DEVICE_DESC        —— 设备模块中文名与说明（表① A 列分组锚点）
  3. ACTIONS            —— 各模块「指令类型」取值表（表① A 列动作编号表，权威）
  4. PARAM_META         —— 参数键 → 中文名 / 单位 / 取值范围 / 说明（表① G+J 列、
                           表② 2·7 小节「比例」列）
  5. STATION_MAP        —— 机械手工站编号映射（表① Robot_ModuleNoSet 的 J 列描述）
  6. LOCK_CAP_RECIPE / LOCK_INTERLOCKS —— 锁紧四角盖工艺流程与互锁规则（表②）

配套：**逐模块的 240 个协议点位明细**在 `gn_opcua_points.py`（由点位表 A/F/G/H/I/J 列抽出）。

约定：`PARAM_META` 的键是**真实工作流里的 param 键**（已按 GN 驱动/真实工作流口径
归一，如 `Stack_RPosSet` → `r_pos`），与 `gn_node_library.js` 的 `params` 键一一对应。
"""

PROTOCOL = {
    "version": "1.4.0",
    "server": "opc.tcp://192.168.6.6:4840",
    "nsPrefix": "ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA.",
    "source": "OPC_UA协议1.4.0(2).xlsx（工作簿①点位表 384 行 / 13 模块 / 240 个有效点位；②锁紧预锁说明 55 行）",
}

# ---------- 1. 设备模块说明（表① A 列 + 表① F 列协议前缀） ----------
DEVICE_DESC = {
    "gn_locking_mechanism": dict(label="锁紧模块", protocol="Lock_",
                                 desc="锁紧模块：X/Y/Z1/Z2 走位 + 夹爪取放 + 电批预锁/终锁/拧松"),
    "gn_quick_carrier_exchange": dict(label="快换模块", protocol="QuickChange_",
                                      desc="快换模块：X/Z1/Z2/推轴/Z3 走位 + 物料顶出放置 + 磁力搅拌"),
    "gn_centrifuge": dict(label="离心机", protocol="Centrifuge_",
                          desc="离心机：Y/Z 走位 + 装料/离心/卸料 + 夹爪 + 配重天平去皮"),
    "gn_centrifuge_tube_liquid_handling": dict(label="离心管液体处理", protocol="Tube_",
                                               desc="离心管液体处理：8/单通道移液混匀 + 大小夹爪 + 磁力架 + 恒温/震荡模块"),
    "gn_rotary_stack": dict(label="旋转堆栈", protocol="Stack_",
                            desc="旋转堆栈：R/Z 走位 + 相机检测有无 + 复位"),
    "gn_stack": dict(label="旋转堆栈", protocol="Stack_",
                     desc="旋转堆栈（gn_stack 键名，与 gn_rotary_stack 同一 Stack_ 模块）：R/Z 走位 + 相机检测 + 复位"),
    "gn_robotic_arm": dict(label="机械手", protocol="Robot_",
                           desc="机械手：X 走位 + 去目标工站/目标板位夹放料 + 使能/失能/复位"),
    "gn_solid_weighing": dict(label="固体加样", protocol="Solid_",
                              desc="固体加样：X/Y 走位 + 料筒 Z + 夹爪 + 开关门 + 天枰去皮称重 + 加料"),
    "gn_standard_oven": dict(label="常规烘箱", protocol="Oven_",
                             desc="常规烘箱：启动加热 / 复位停止 / 开门关门（独立 bool 节点）"),
    "gn_vacuum_oven": dict(label="真空烘箱", protocol="VacuumOven_",
                           desc="真空烘箱：6 组温度/时间/真空上下限 + 启动 / 复位 / 开闭门"),
    "gn_liquid_cooling": dict(label="液冷模块", protocol="Liquid_Cooling_",
                              desc="七个液冷模块（9320×2 + 离心管×5）：温度设置 / 开启 / 关闭"),
    "system": dict(label="系统总控", protocol="System_",
                   desc="系统总控：总复位 / 停止 / 上电初始化就绪 / 报错输出"),
}

# ---------- 2. 指令类型取值表（表① A 列，权威） ----------
ACTIONS = {
    "gn_locking_mechanism": {
        1: "X向左", 2: "X向右", 3: "Y向左", 4: "Y向右",
        5: "Z1向左", 6: "Z1向右", 7: "Z2向左", 8: "Z2向右",
        9: "夹爪夹取", 10: "夹爪放置",
        11: "电批终锁(扭矩锁死)", 12: "电批拧松",
        13: "夹爪夹紧", 14: "夹爪松开",
        15: "电批预锁(按圈数,不锁死)", 16: "复位",
    },
    "gn_quick_carrier_exchange": {
        1: "X向左", 2: "X向右", 3: "Z1向左", 4: "Z1向右",
        5: "Z2向左", 6: "Z2向右", 7: "推轴向左", 8: "推轴向右",
        9: "Z3向左", 10: "Z3向右", 11: "物料顶出", 12: "物料放置",
        13: "磁力搅拌运行", 14: "复位",
    },
    "gn_centrifuge": {
        1: "Y向左", 2: "Y向右", 3: "Z向左", 4: "Z向右",
        5: "放入物料", 6: "运行离心机", 7: "取出物料", 8: "复位",
        9: "夹爪张开", 10: "夹爪夹紧", 11: "配重天平去皮",
    },
    "gn_centrifuge_tube_liquid_handling": {
        1: "X向左", 2: "X向右", 3: "Y向前", 4: "Y向后",
        5: "8通道Z向上", 6: "8通道Z向下", 7: "8通道移液吸", 8: "8通道移液放",
        9: "大夹爪Z向上", 10: "大夹爪Z向下", 11: "单通道移液吸", 12: "单通道移液放",
        13: "单通道向上", 14: "单通道向下", 15: "小夹爪向上", 16: "小夹爪向下",
        17: "磁力架轴向上", 18: "磁力架轴向下", 19: "8通道装载", 20: "8通道吸液",
        21: "8通道放液", 22: "8通道卸载", 23: "单通道装载", 24: "单通道吸液",
        25: "单通道放液", 26: "单通道卸载", 27: "小夹爪开盖", 28: "小夹爪关盖",
        29: "小夹爪抓取", 30: "小夹爪放置", 31: "大夹爪抓取", 32: "大夹爪放置",
        33: "单通道混匀", 34: "8通道混匀", 35: "超声波混匀", 36: "复位",
        37: "xyz回原点", 38: "模块1恒温打开", 39: "模块1恒温关闭",
        40: "模块2恒温打开", 41: "模块2恒温关闭", 42: "模块3恒温打开", 43: "模块3恒温关闭",
        44: "模块4恒温打开", 45: "模块4恒温关闭", 46: "模块4震荡打开", 47: "模块4震荡关闭",
        48: "震荡模块夹爪开", 49: "震荡夹爪关",
    },
    "gn_rotary_stack": {
        1: "堆栈左旋转", 2: "堆栈右旋转", 3: "相机Z向上", 4: "相机Z向下",
        5: "堆栈旋转至目标位置", 6: "相机移动至目标位置并检测有无", 7: "复位",
    },
    "gn_robotic_arm": {
        1: "X向左", 2: "X向右",
        3: "去目标工站目标板位夹料", 4: "去目标工站目标板位放料",
        6: "停止", 7: "复位", 8: "失能", 9: "使能",
    },
    "gn_solid_weighing": {
        1: "X向左", 2: "X向右", 3: "Y向里", 4: "Y向外",
        5: "夹爪Z向上", 6: "夹爪Z向下", 7: "D开门", 8: "D关门",
        9: "取料筒时Y轴向里", 10: "取料筒时Y轴向外", 11: "加料",
        12: "夹爪夹料", 13: "夹爪放料", 14: "天枰去皮", 15: "天枰称重",
        16: "料筒Z向上", 17: "料筒Z向下", 18: "放料筒时Y轴向里", 19: "放料筒时Y轴向外",
        20: "复位", 21: "夹爪夹紧", 22: "夹爪松开", 23: "xyz回原点",
        # ★ 1.4.0(2) 表内只到 23；24/25 已从表中移除，但 GN 驱动与真实工作流仍在用
        #   （param `remove_static`），保留并在 UI 标注「legacy」
        24: "静电消除开", 25: "静电消除关",
    },
    "gn_standard_oven": {1: "启动", 2: "复位/停止"},
    "gn_vacuum_oven": {1: "启动", 2: "复位", 100: "开门", 101: "关门"},
    "gn_liquid_cooling": {1: "温度设置", 2: "液冷模块开启", 3: "液冷模块关闭"},
}

# 1.4.0(2) 表内未列、但驱动/真实工作流仍在使用的动作（在 UI 中标注为「遗留」）
LEGACY_ACTIONS = {
    "gn_solid_weighing": {24, 25},
}

# ---------- 2b. 与表内指令表的有意偏差（交叉校验后仅剩 3 处，均为「代码优于表」）----------
# 生成器 scripts/gen_gn_opcua_points.py 会把表内 A 列的 `n=动作名` 抽成 DEVICE_ACTIONS，
# 与上面 ACTIONS 逐条比对；下面记录每一处不一致及其理由，便于日后复核。
ACTIONS_DEVIATION = {
    "gn_centrifuge_tube_liquid_handling": {
        35: {"table": "超神波混匀", "code": "超声波混匀",
             "why": "表内原文「超神波」是「超声波」的错别字，沿用正确写法"},
    },
    "gn_robotic_arm": {
        3: {"table": "机械手去目标位置目标板位夹料", "code": "去目标工站目标板位夹料",
            "why": "统一到 station 参数（Robot_ModuleNoSet）的「工站」口径，语义一致"},
        4: {"table": "机械手去目标位置目标板位放料", "code": "去目标工站目标板位放料",
            "why": "同上"},
    },
    "gn_solid_weighing": {
        24: {"table": None, "code": "静电消除开", "why": "1.4.0(2) 已从表内移除，驱动仍在用"},
        25: {"table": None, "code": "静电消除关", "why": "同上"},
    },
}

# ---------- 3. 参数元数据（表① G 列点位名 + H 数据类型 + I 读写 + J 列描述） ----------
# label: 中文名；unit: 单位/换算；rw: R/W；desc: 取值说明与约束
def _p(label, unit="", rw="W", desc="", lo=None, hi=None):
    d = {"label": label, "rw": rw, "desc": desc}
    if unit:
        d["unit"] = unit
    if lo is not None:
        d["min"] = lo
    if hi is not None:
        d["max"] = hi
    return d


PARAM_META = {
    # --- 通用上位机参数（非 OPC UA 点位） ---
    "timeout": _p("动作超时", "s", "—", "上位机侧等待本节点完成的超时上限；超时判失败", 1, 3600),
    "wait": _p("等待程序完成", "", "—", "1=下位机执行完成后才放行下一节点"),
    "remove_static": _p("静电消除", "", "W", "对应「静电消除开/关」子动作，1=启用"),

    # --- 走位：运行位置 ---
    "x_pos": _p("X 运行位置", "脉冲", "W", "对应 *_XPosSet。回原点/复位时为 0"),
    "y_pos": _p("Y 运行位置", "脉冲", "W", "对应 *_YPosSet"),
    "z_pos": _p("Z 运行位置", "脉冲", "W", "旋转堆栈为 Z 轴；离心机为台面 Z 位置"),
    "r_pos": _p("R 旋转运行位置", "脉冲", "W", "堆栈旋转轴目标位置，复位为 0"),
    "z1_pos": _p("Z1 运行位置", "脉冲", "W", "锁紧模块 Z1 轴（对角螺丝位之一）"),
    "z2_pos": _p("Z2 运行位置", "脉冲", "W", "锁紧模块 Z2 轴（电批下降轴）"),
    "inner_z_pos": _p("离心机内 Z 位置", "脉冲", "W", "离心机腔体内取放料 Z 位置"),
    "push_pos": _p("推轴运行位置", "脉冲", "W", "快换模块推杆水平位置"),
    "push_z_pos": _p("压料 Z 运行位置", "脉冲", "W", "快换模块压料轴 Z 位置"),
    "top_z_pos": _p("顶料 Z 位置", "脉冲", "W", "快换模块顶出物料时的 Z 位置"),
    "take_z_pos": _p("接料 Z 位置", "脉冲", "W", "快换模块接料时的 Z 位置"),
    "material_z_pos": _p("料筒 Z 运行位置", "脉冲", "W", "固体加样料筒升降位置（取桶/放桶高度）"),
    "gripper_z_pos": _p("夹爪 Z 运行位置", "脉冲", "W", "固体加样夹爪升降位置"),
    "door_pos": _p("门开关位置", "脉冲", "W", "固体加样 D 门开闭目标位置"),

    # --- 走位：速度 ---
    "x_speed": _p("X 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "y_speed": _p("Y 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "z_speed": _p("Z 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "r_speed": _p("R 旋转速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "z1_speed": _p("Z1 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "z2_speed": _p("Z2 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "z3_speed": _p("Z3 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "z4_speed": _p("Z4 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "push_speed": _p("推轴速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "material_z_speed": _p("料筒 Z 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "gripper_z_speed": _p("夹爪 Z 速度", "脉冲/s", "W", "0 = 使用设备默认速度"),
    "door_speed": _p("D 门速度", "脉冲/s", "W", "0 = 使用设备默认速度"),

    # --- 工艺参数（含单位换算，来自 J 列与表②比例列） ---
    "rpm": _p("离心机转速", "rpm", "W", "离心转速；离心时长由 time_minutes 给出（秒）"),
    "time_minutes": _p("离心机时间", "s", "W", "写入 Centrifuge_Time 的离心时长，单位为秒", 0, 32767),
    "plate_no": _p("离心机板位号", "1~4", "W", "离心机内 4 个板位号，取值 1/2/3/4"),
    "temperature": _p("温度设置", "℃", "W", "离心机/烘箱温度设定值"),
    "hours": _p("运行时间", "h", "W", "对应 Oven_TimeHourSet"),
    "minutes": _p("运行时间", "min", "W", "对应 Oven_TimeMinuteSet"),
    "vacuum_high_1": _p("真空控制上限", "", "W", "第 1 组真空度上限"),
    "vacuum_low_1": _p("真空控制下限", "", "W", "第 1 组真空度下限"),
    "temperature_1": _p("运行温度设置 1", "℃", "W", "真空烘箱第 1 组温度（1~6 组独立）"),
    "minutes_1": _p("运行时间设置 1", "min", "W", "真空烘箱第 1 组时间（1~6 组独立）"),
    "stir_rpm": _p("磁力搅拌转速", "rpm", "W", "快换模块磁力搅拌转速"),
    "stir_temp": _p("磁力搅拌温度", "℃", "W", "快换模块磁力搅拌温度"),
    "stir_time_minutes": _p("磁力搅拌时间", "min", "W", "快换模块磁力搅拌时长"),
    "jaw_position": _p("夹爪位置", "", "W", "锁紧模块夹爪开合位置"),
    "jaw_force": _p("夹爪力度", "", "W", "锁紧模块夹爪夹紧力"),
    "volune_weight": _p("加样量", "0.1mg", "W", "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"),
    "weight": _p("加样量", "0.1mg", "W", "volune_weight 的别名（工作流生成器口径）"),

    # --- 1.4.0 新增：锁紧预锁/终锁（表②「1.握手 / 2.新增点位 / 3.CmdType」） ---
    "pre_turns": _p("预锁圈数", "0.1圈", "W",
                    "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收", 1, 100),

    # --- 机械手 ---
    "station": _p("目标工站编号", "1~10", "W",
                  "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 "
                  "6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；"
                  "与「设备从左到右依次排列」一致"),
    "number": _p("目标板位/动作序号", "", "W",
                 "该工站内的动作序号，1 指第一个动作，依次类推；"
                 "注意离心机工站（4）：2 指「离心机前面天平的动作」（1.4.0(2) 表行 162 明确）"),
    "item_type": _p("物料类型", "", "—", "搬运对象类型，用于选夹爪/吸盘"),
}

# 参数键的别名 → 主键（同一含义的多种写法归一）
PARAM_ALIAS = {
    "weight": "volune_weight",
}

# ---------- 4. 机械手工站编号映射（表① 行 158 `Robot_ModuleNoSet` 的 J 列描述） ----------
# 原文：「设备从左到右依次排列（常规烘箱1、锁紧2、快换3、离心机4、真空烘箱5，
#        9320设备6，离心管液体处理7，堆栈8，固体加样9，成品放置位10）」
STATION_MAP_SOURCE = ("设备从左到右依次排列（常规烘箱1、锁紧2、快换3、离心机4、真空烘箱5，"
                      "9320设备6，离心管液体处理7，堆栈8，固体加样9，成品放置位10）")
STATION_MAP = {
    1: "常规烘箱", 2: "锁紧", 3: "快换", 4: "离心机", 5: "真空烘箱",
    6: "9320", 7: "离心管液体处理", 8: "堆栈", 9: "固体加样", 10: "成品放置位",
}

# 真实工作流里 station 常以设备别名（字符串）出现，归一到 STATION_MAP 的编号
STATION_ALIAS = {
    "oven": 1, "furnace": 1, "gn_standard_oven": 1,
    "lock": 2, "locking": 2, "locking_mechanism": 2, "gn_locking_mechanism": 2,
    "quick": 3, "quickchange": 3, "quick_carrier_exchange": 3, "gn_quick_carrier_exchange": 3,
    "centrifuge": 4, "centri": 4, "gn_centrifuge": 4,
    "vacuum": 5, "voven": 5, "vacuum_oven": 5, "gn_vacuum_oven": 5,
    "nine9320": 6, "9320": 6, "prcxi": 6, "liquid": 6,
    "tube": 7, "tubeh": 7, "gn_centrifuge_tube_liquid_handling": 7,
    "stack": 8, "rotary_stack": 8, "gn_stack": 8, "gn_rotary_stack": 8,
    "solid": 9, "balance": 9, "solid_weighing": 9, "gn_solid_weighing": 9,
    "finished": 10, "finished_product_area": 10, "product": 10,
}

# ---------- 5. 锁紧四角盖工艺流程（表② 4 小节，可直接作为默认配方） ----------
LOCK_CAP_RECIPE = [
    {"step": 1, "type": 15, "hole": 1, "pre_turns": 20, "expect": "带上，不锁死"},
    {"step": 2, "type": 15, "hole": 3, "pre_turns": 20, "expect": "对角"},
    {"step": 3, "type": 15, "hole": 2, "pre_turns": 20, "expect": ""},
    {"step": 4, "type": 15, "hole": 4, "pre_turns": 20, "expect": "四角都已贴合"},
    {"step": 5, "type": 11, "hole": 1, "expect": "锁死"},
    {"step": 6, "type": 11, "hole": 3, "expect": ""},
    {"step": 7, "type": 11, "hole": 2, "expect": ""},
    {"step": 8, "type": 11, "hole": 4, "expect": "整盖完成"},
]

# 锁紧互锁规则（表② 1·3·6 小节），供前端/后端校验提示
LOCK_INTERLOCKS = [
    "同一时刻只允许一条锁紧指令（下发前校验 CompleteFB=0）",
    "CmdType=15 预锁必须写 pre_turns>0（×0.1圈）；1.4.1 没有预锁扭矩上限和终锁目标扭矩",
    "孔顺序必须对角：孔1→孔3→孔2→孔4，禁止邻边 1-2-3-4",
    "必须四颗预锁全部结束后再终锁，禁止同一颗 15 完立刻 11",
    "CmdTrig 必须 0→1 触发，不得长期置 1",
]


def param_meta(key):
    """取某参数键的元数据（自动走别名归一）。未收录的键返回空 dict。"""
    if key in PARAM_META:
        return PARAM_META[key]
    return PARAM_META.get(PARAM_ALIAS.get(key, ""), {})


def actions_for(dev):
    """取设备的权威指令类型表。"""
    return ACTIONS.get(dev, {})


def extra_params_for(dev, cmd_type=None, name=None):
    """返回权威协议里存在、但真实工作流未出现、需要补进节点库的参数键。"""
    extra = {}
    # 锁紧预锁只保留圈数。1.4.1 点位表已删除扭矩上限和终锁扭矩。
    if dev == "gn_locking_mechanism" and cmd_type == 15:
        extra = {"pre_turns": 20}
    return extra
