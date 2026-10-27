# -*- coding: utf-8 -*-
"""OPC UA 1.4.0「点位表」逐模块点位清单 —— 由 scripts/gen_gn_opcua_points.py 生成，勿手改。

源文件：OPC_UA协议1.4.0(2).xlsx
点位合计：240 个 / 模块：13 组

每个点位 = dict(name 中文点位名, node 命名空间内相对名, dtype 数据类型, rw 读写, desc 说明)
"""

SOURCE = 'OPC_UA协议1.4.0(2).xlsx'
NS_PREFIX = 'ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA.'
MODULE_ORDER = ['锁紧模块', '快换', '离心机', '离心管液体处理', '堆栈', '机械手', '固体加样', '总复位', '停止', '常规烘箱', '真空烘箱', '七个液冷模块', '报错信息']
MODULE_TO_DEVICE = {'锁紧模块': 'gn_locking_mechanism', '快换': 'gn_quick_carrier_exchange', '快换模块': 'gn_quick_carrier_exchange', '离心机': 'gn_centrifuge', '离心管液体处理': 'gn_centrifuge_tube_liquid_handling', '堆栈': 'gn_rotary_stack', '旋转堆栈': 'gn_rotary_stack', '机械手': 'gn_robotic_arm', '固体加样': 'gn_solid_weighing', '常规烘箱': 'gn_standard_oven', '真空烘箱': 'gn_vacuum_oven', '七个液冷模块': 'gn_liquid_cooling', '液冷模块': 'gn_liquid_cooling', '总复位': 'system', '停止': 'system', '报错信息': 'system', '系统': 'system'}
ALIAS = {'gn_stack': 'gn_rotary_stack'}

# ---------- 表内原始分组（按 A 列出现顺序）----------
# 元素 = (模块标题, [(点位名, NodeId相对名, 数据类型, 读写, 描述), ...])
_RAW = [
    ('锁紧模块', [
        ('X位置反馈', 'Lock_XPosFB', 'Int16', 'R', ''),
        ('Y位置反馈', 'Lock_YPosFB', 'Int16', 'R', ''),
        ('Z1位置反馈', 'Lock_Z1PosFB', 'Int16', 'R', ''),
        ('Z2位置反馈', 'Lock_Z2PosFB', 'Int16', 'R', ''),
        ('完成反馈', 'Lock_CompleteFB', 'Int16', 'R', '0执行中/空闲  1成功  2失败'),
        ('X运行位置', 'Lock_XPosSet', 'Int16', 'W', ''),
        ('Y运行位置', 'Lock_YPosSet', 'Int16', 'W', ''),
        ('Z1运行位置', 'Lock_Z1PosSet', 'Int16', 'W', ''),
        ('Z2运行位置', 'Lock_Z2PosSet', 'Int16', 'W', ''),
        ('X速度', 'Lock_XSpeed', 'Int16', 'W', ''),
        ('Y速度', 'Lock_YSpeed', 'Int16', 'W', ''),
        ('Z1速度', 'Lock_Z1Speed', 'Int16', 'W', ''),
        ('Z2速度', 'Lock_Z2Speed', 'Int16', 'W', ''),
        ('指令类型', 'Lock_CmdType', 'Int16', 'W', '见左侧指令表。11=终锁  15=预锁'),
        ('指令触发', 'Lock_CmdTrig', 'Int16', 'W', '1=触发，必须0→1。PLC收下后清0'),
        ('夹爪位置', 'Lock_JawPosition', 'Double', 'W', ''),
        ('夹爪力度', 'Lock_JawForce', 'Double', 'W', ''),
        ('预锁圈数', 'Lock_PreTurnsSet', 'Int16', 'W', '单位0.1圈。20=2.0圈。四颗螺丝共用，预锁Type=15必写'),
        ('预锁扭矩上限', 'Lock_PreTorqueLimit', 'Int16', 'W', '单位0.001N.m。300=0.300N.m。圈数未满但已顶死时停，防止预锁变成锁死。Type=15必写'),
        ('终锁目标扭矩', 'Lock_FinalTorqueSet', 'Int16', 'W', '单位0.001N.m。600=0.600N.m。对应电批E12C。Type=11必写，且必须大于预锁扭矩上限'),
        ('电批结果', 'Lock_ScrewResult', 'Int16', 'R', '0无 1OK 2滑牙 3浮锁 4超时 5故障 6预锁到扭矩上限(算成功)'),
        ('完成扭矩反馈', 'Lock_TorqueFB', 'Int16', 'R', '单位0.001N.m。来自电批20C9'),
        ('完成角度反馈', 'Lock_AngleFB', 'Int16', 'R', '单位0.1度。来自电批20CA，最大约3276.7度'),
    ]),
    ('快换', [
        ('X位置反馈', 'QuickChange_XPosFB', 'Int16', 'R', ''),
        ('Z1位置反馈', 'QuickChange_Z1PosFB', 'Int16', 'R', ''),
        ('Z2位置反馈', 'QuickChange_Z2PosFB', 'Int16', 'R', ''),
        ('推轴反馈', 'QuickChange_PushPosFB', 'Int16', 'R', ''),
        ('Z3位置反馈', 'QuickChange_Z3PosFB', 'Int16', 'R', ''),
        ('完成反馈', 'QuickChange_CompleteFB', 'Int16', 'R', ''),
        ('X运行位置', 'QuickChange_XPosSet', 'Int16', 'W', ''),
        ('顶料Z位置', 'QuickChange_TopZPosSet', 'Int16', 'W', ''),
        ('接料Z位置', 'QuickChange_TakeZPosSet', 'Int16', 'W', ''),
        ('推轴运行位置', 'QuickChange_PushPosSet', 'Int16', 'W', ''),
        ('压料Z运行位置', 'QuickChange_PushZPosSet', 'Int16', 'W', ''),
        ('X速度', 'QuickChange_XSpeed', 'Int16', 'W', ''),
        ('Z1速度', 'QuickChange_Z1Speed', 'Int16', 'W', ''),
        ('Z2速度', 'QuickChange_Z2Speed', 'Int16', 'W', ''),
        ('推轴速度', 'QuickChange_PushSpeed', 'Int16', 'W', ''),
        ('Z3速度', 'QuickChange_Z3Speed', 'Int16', 'W', ''),
        ('指令类型', 'QuickChange_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'QuickChange_CmdTrig', 'Int16', 'W', ''),
        ('磁力搅拌转速', 'QuickChange_StirRPM', 'Int16', '', ''),
        ('磁力搅拌温度', 'QuickChange_StirTemp', 'Int16', '', ''),
        ('磁力搅拌时间(分)', 'QuickChange_StirTime', 'Int16', '', ''),
    ]),
    ('离心机', [
        ('Y位置反馈', 'Centrifuge_YPosFB', 'Int16', 'R', ''),
        ('Z位置反馈', 'Centrifuge_ZPosFB', 'Int16', 'R', ''),
        ('完成反馈', 'Centrifuge_CompleteFB', 'Int16', 'R', ''),
        ('Y运行位置', 'Centrifuge_YPosSet', 'Int16', 'W', ''),
        ('台面Z位置', 'Centrifuge_ZPosSet', 'Int16', 'W', ''),
        ('离心机内Z位置', 'Centrifuge_InnerZPosSet', 'Int16', 'W', ''),
        ('离心机转速', 'Centrifuge_RPM', 'Int16', 'W', ''),
        ('离心机时间', 'Centrifuge_Time', 'Int16', 'W', ''),
        ('离心机里板位号(1,2,3,4)', 'Centrifuge_PlateNo', 'Int16', 'W', ''),
        ('离心机温度设置', 'iTemperature', 'Int16', 'W', ''),
        ('Y速度', 'Centrifuge_YSpeed', 'Int16', 'W', ''),
        ('Z速度', 'Centrifuge_ZSpeed', 'Int16', 'W', ''),
        ('指令类型', 'Centrifuge_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Centrifuge_CmdTrig', 'Int16', 'W', ''),
        ('称重天平去皮', 'Tare_the_scale', 'Int16', 'W', ''),
        ('称重天平重量反馈', 'scale_weight', 'REAL', 'W', ''),
    ]),
    ('离心管液体处理', [
        ('X位置反馈', 'Tube_XPosFB', 'Int16', 'R', ''),
        ('Y位置反馈', 'Tube_YPosFB', 'Int16', 'R', ''),
        ('Z1位置反馈', 'Tube_Z1PosFB', 'Int16', 'R', ''),
        ('P1位置反馈', 'Tube_P1PosFB', 'Int16', 'R', ''),
        ('Z2位置反馈', 'Tube_Z2PosFB', 'Int16', 'R', ''),
        ('P2位置反馈', 'Tube_P2PosFB', 'Int16', 'R', ''),
        ('Z3位置反馈', 'Tube_Z3PosFB', 'Int16', 'R', ''),
        ('Z4位置反馈', 'Tube_Z4PosFB', 'Int16', 'R', ''),
        ('M轴位置反馈', 'Tube_MPosFB', 'Int16', 'R', ''),
        ('完成反馈', 'Tube_CompleteFB', 'Int16', 'R', ''),
        ('恒温模块1温度反馈', 'Tube_ThermostaticModule1_TemperatureFB', 'Int16', 'R', ''),
        ('恒温模块2温度反馈', 'Tube_ThermostaticModule2_TemperatureFB', 'Int16', 'R', ''),
        ('恒温模块3温度反馈', 'Tube_ThermostaticModule3_TemperatureFB', 'Int16', 'R', ''),
        ('恒温模块4温度反馈', 'Tube_ThermostaticModule4_TemperatureFB', 'Int16', 'R', ''),
        ('X运行位置', 'Tube_XPosSet', 'Int16', 'W', ''),
        ('Y运行位置', 'Tube_YPosSet', 'Int16', 'W', ''),
        ('Z1运行位置', 'Tube_Z1PosSet', 'Int16', 'W', ''),
        ('P1运行位置', 'Tube_P1PosSet', 'Int16', 'W', ''),
        ('Z2运行位置', 'Tube_Z2PosSet', 'Int16', 'W', ''),
        ('P2运行位置', 'Tube_P2PosSet', 'Int16', 'W', ''),
        ('Z3运行位置', 'Tube_Z3PosSet', 'Int16', 'W', ''),
        ('Z4运行位置', 'Tube_Z4PosSet', 'Int16', 'W', ''),
        ('M轴运行位置', 'Tube_MPosSet', 'Int16', 'W', ''),
        ('X速度', 'Tube_XSpeed', 'Int16', 'W', ''),
        ('Y速度', 'Tube_YSpeed', 'Int16', 'W', ''),
        ('Z1速度', 'Tube_Z1Speed', 'Int16', 'W', ''),
        ('P1速度', 'Tube_P1Speed', 'Int16', 'W', ''),
        ('Z2速度', 'Tube_Z2Speed', 'Int16', 'W', ''),
        ('P2速度', 'Tube_P2Speed', 'Int16', 'W', ''),
        ('Z3速度', 'Tube_Z3Speed', 'Int16', 'W', ''),
        ('Z4速度', 'Tube_Z4Speed', 'Int16', 'W', ''),
        ('M轴速度', 'Tube_MSpeed', 'Int16', 'W', ''),
        ('指令类型', 'Tube_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Tube_CmdTrig', 'Int16', 'W', ''),
        ('8通道吹样', 'Tube_Ch8Blow', 'Int16', 'W', ''),
        ('单通道吹样', 'Tube_Ch1Blow', 'Int16', 'W', ''),
        ('8通道反向吸液', 'Tube_Ch8ReverseAspirate', 'Int16', 'W', ''),
        ('单通道反向吸液', 'Tube_Ch1ReverseAspirate', 'Int16', 'W', ''),
        ('小夹爪旋转角度', 'Tube_SmallGripperAngle', 'Int16', 'W', ''),
        ('小夹爪力度', 'Tube_SmallGripperForce', 'Int16', 'W', ''),
        ('混匀次数', 'Tube_MixCounts', 'Int16', 'W', ''),
        ('小夹爪开盖初始位置', 'Tube_SmallGripperOpenLidStart', 'Int16', 'W', ''),
        ('小夹爪开盖结束位置', 'Tube_SmallGripperOpenLidEnd', 'Int16', 'W', ''),
        ('小夹爪关盖初始位置', 'Tube_SmallGripperCloseLidStart', 'Int16', 'W', ''),
        ('小夹爪关盖初始位置', 'Tube_SmallGripperCloseLidEnd', 'Int16', 'W', ''),
        ('小夹爪开盖速度', 'Tube_SmallGripperOpenLidSpeed', 'Int16', 'W', ''),
        ('小夹爪关盖速度', 'Tube_SmallGripperCloseLidSpeed', 'Int16', 'W', ''),
        ('开盖旋转速度', 'Tube_SmallGripperOpenLid_RotationSpeed', 'Int16', 'W', ''),
        ('关盖旋转速度', 'Tube_SmallGripperCloseLid_RotationSpeed', 'Int16', 'W', ''),
        ('超声波混匀时间', 'Tube_UltrasoundTime', 'Int16', 'W', ''),
        ('恒温模块温度1', 'Tube_ThermostaticModule_Temperature1', 'Int16', 'W', ''),
        ('恒温模块温度1反馈', 'Tube_Temperature1_feedback', 'Int16', 'W', ''),
        ('恒温模块温控时间1', 'Tube_ThermostaticModule_Time1', 'Int16', 'W', ''),
        ('恒温模块温度2', 'Tube_ThermostaticModule_Temperature2', 'Int16', 'W', ''),
        ('恒温模块温度2反馈', 'Tube_Temperature2_feedback', 'Int16', 'W', ''),
        ('恒温模块温控时间2', 'Tube_ThermostaticModule_Time2', 'Int16', 'W', ''),
        ('恒温模块温度3', 'Tube_ThermostaticModule_Temperature3', 'Int16', 'W', ''),
        ('恒温模块温度3反馈', 'Tube_Temperature3_feedback', 'Int16', 'W', ''),
        ('恒温模块温控时间3', 'Tube_ThermostaticModule_Time3', 'Int16', 'W', ''),
        ('恒温模块温度4', 'Tube_ThermostaticModule_Temperature4', 'Int16', 'W', ''),
        ('恒温模块温度4反馈', 'Tube_Temperature4_feedback', 'Int16', 'W', ''),
        ('恒温模块温控时间4', 'Tube_ThermostaticModule_Time4', 'Int16', 'W', ''),
        ('恒温模块4震荡转速', 'Tube_ThermostaticModule4_Shaking_Speed', 'Int16', 'W', ''),
        ('恒温模块4震荡时间', 'Tube_ThermostaticModule4_Shaking_Time', 'Int16', 'W', ''),
        ('超声波停止', 'Tube_UltrasoundSTOP', 'Int16', 'W', '1停止'),
    ]),
    ('堆栈', [
        ('R位置反馈', 'Stack_RPosFB', 'Int16', 'W', ''),
        ('Z位置反馈', 'Stack_ZPosFB', 'Int16', 'W', ''),
        ('完成反馈', 'Stack_CompleteFB', 'Int16', 'R', ''),
        ('R运行位置', 'Stack_RPosSet', 'Int16', 'W', ''),
        ('Z运行位置', 'Stack_ZPosSet', 'Int16', 'W', ''),
        ('R速度', 'Stack_RSpeed', 'Int16', 'W', ''),
        ('Z速度', 'Stack_ZSpeed', 'Int16', 'W', ''),
        ('指令类型', 'Stack_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Stack_CmdTrig', 'Int16', 'W', ''),
        ('物料检测结果', 'Stack_DetectResult', 'Int16', 'W', ''),
    ]),
    ('机械手', [
        ('X位置反馈', 'Robot_XPosFB', 'Int16', 'R', ''),
        ('完成反馈', 'Robot_FinishFB', 'Int16', 'R', ''),
        ('机器人反馈错误代码', 'Robot_Error_code', 'Int16', 'R', '机器人反馈报错代码'),
        ('X运行位置', 'Robot_XPosSet', 'Int16', 'W', ''),
        ('X速度', 'Robot_XSpeedSet', 'Int16', 'W', ''),
        ('机械手模块号(每个工站对应不同动作)', 'Robot_ModuleNoSet', 'Int16', 'W', '设备从左到右依次排列（常规烘箱1、锁紧2、快换3、离心机4、真空烘箱5，9320设备6，离心管液体处理7，堆栈8，固体加样9，成品放置位10）'),
        ('机械手在烘箱的运行动作', 'Robot_Oven', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在紧缩结构的运行动作', 'Robot_Locking_mechanism', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在快换结构的运行动作', 'Robot_Quick_change_mechanism', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在离心机的运行动作', 'Robot_Centrifuge', 'Int16', 'W', '1指第一个动作，2指第二个动作是离心机前面天平的动作'),
        ('机械手在真空烘箱的运行动作', 'Robot_Vacuum_oven', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在9320的运行动作', 'Robot_9320', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在离心管液体处理的运行动作', 'Robot_Centrifuge_tube_liquid_handling', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在堆栈的运行动作', 'Robot_Stack', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在固体加样的运行动作', 'Robot_Add_solid_sample', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('机械手在成品放置区的运行动作', 'Robot_Finished_Product_Area', 'Int16', 'W', '1指第一个动作，2指第二个动作，以此类推'),
        ('指令类型', 'Robot_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Robot_CmdTrig', 'Int16', 'W', ''),
        ('紧急停止状态', 'Robot_Emergency_stop_condition', 'Int16', 'W', '1的时候是紧急停止状态'),
        ('保护性停止', 'Robot_Protective_stop_status', 'Int16', 'W', '1的时候是保护性停止状态'),
        ('夹爪位置', 'Robot_jiazhuaweizhi', 'Int16', 'W', '夹爪位置'),
        ('机器人运行状态', 'Robot_Operating_status', 'Int16', 'W', '3程序没有运行，2 程序中止， 1程序运行'),
    ]),
    ('固体加样', [
        ('X位置反馈', 'Solid_XPosFB', 'Int16', 'R', ''),
        ('Y位置反馈', 'Solid_YPosFB', 'Int16', 'R', ''),
        ('料筒Z位置反馈', 'Solid_MaterialZPosFB', 'Int32', 'R', ''),
        ('夹爪Z位置反馈', 'Solid_GripperZPosFB', 'Int16', 'R', ''),
        ('开关门位置反馈', 'Solid_DoorPosFB', 'Int16', 'R', ''),
        ('天枰重量反馈', 'Solid_WeightFB', 'Int32', 'R', ''),
        ('完成反馈', 'Solid_CompleteFB', 'Int16', 'R', ''),
        ('X运行位置', 'Solid_XPosSet', 'Int16', 'W', ''),
        ('Y运行位置', 'Solid_YPosSet', 'Int16', 'W', ''),
        ('料筒Z运行位置', 'Solid_MaterialZPosSet', 'Int32', 'W', ''),
        ('加样量', 'Solid_VoluneWeightSet', 'Int32', 'W', ''),
        ('夹爪Z运行位置', 'Solid_GripperZPosSet', 'Int16', 'W', ''),
        ('门开关位置', 'Solid_DoorPosSet', 'Int16', 'W', ''),
        ('X速度', 'Solid_XSpeed', 'Int16', 'W', ''),
        ('Y速度', 'Solid_YSpeed', 'Int16', 'W', ''),
        ('料筒Z速度', 'Solid_MaterialZSpeed', 'Int16', 'W', ''),
        ('夹爪Z速度', 'Solid_GripperZSpeed', 'Int16', 'W', ''),
        ('D速度', 'Solid_DoorSpeed', 'Int16', 'W', ''),
        ('指令类型', 'Solid_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Solid_CmdTrig', 'Int16', 'W', ''),
    ]),
    ('总复位', [
        ('复位完成反馈', 'System_ResetCompleteFB', 'Int16', 'R', ''),
        ('复位触发', 'System_ResetTrig', 'Int16', 'W', ''),
        ('设备上电初始化完成', 'System_IsReady', 'Int16', 'R', '设备上电后自动初始化，为1时可发送指令，为0时代表机械手上电回原点故障'),
    ]),
    ('停止', [
        ('停止触发', 'System_StopTrig', 'Int16', 'W', ''),
    ]),
    ('常规烘箱', [
        ('温度反馈', 'Oven_TempFB', 'Int16', 'R', ''),
        ('完成反馈', 'Oven_CompleteFB', 'Int16', 'R', ''),
        ('运行温度设置', 'Oven_TempSet', 'Int16', 'W', ''),
        ('运行时间设置(小时)', 'Oven_TimeHourSet', 'Int16', 'W', ''),
        ('运行时间设置(分钟)', 'Oven_TimeMinuteSet', '', '', ''),
        ('指令类型', 'Oven_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Oven_CmdTrig', 'Int16', 'W', ''),
        ('运行状态', 'Oven_Running_Status', 'Int16', 'w', '读取烘箱状态1运行，0 停止'),
        ('烘箱开门', 'OPEN_DOOR', 'bool', '', '1开门'),
        ('烘箱关门', 'COHSE_DOOR', 'bool', '', '1关门'),
    ]),
    ('真空烘箱', [
        ('温度反馈', 'VacuumOven_TempFB', 'Int16', 'R', ''),
        ('时间反馈', 'VacuumOven_TimeFB', 'Int16', 'R', ''),
        ('真空度反馈', 'VacuumOven_PressureFB', 'Int16', 'R', ''),
        ('完成反馈', 'VacuumOven_CompleteFB', 'Int16', 'R', ''),
        ('运行温度设置1', 'VacuumOven_TempSet_1', 'Int16', 'W', ''),
        ('运行时间设置1', 'VacuumOven_TimeSet_1', 'Int16', 'W', ''),
        ('真空控制上限1', 'VacuumOven_VacuumHigh_1', 'Int16', 'W', ''),
        ('真空控制下限1', 'VacuumOven_VacuumLow_1', 'Int16', 'W', ''),
        ('运行温度设置2', 'VacuumOven_TempSet_2', 'Int16', 'W', ''),
        ('运行时间设置2', 'VacuumOven_TimeSet_2', 'Int16', 'W', ''),
        ('真空控制上限2', 'VacuumOven_VacuumHigh_2', 'Int16', 'W', ''),
        ('真空控制下限2', 'VacuumOven_VacuumLow_2', 'Int16', 'W', ''),
        ('运行温度设置3', 'VacuumOven_TempSet_3', 'Int16', 'W', ''),
        ('运行时间设置3', 'VacuumOven_TimeSet_3', 'Int16', 'W', ''),
        ('真空控制上限3', 'VacuumOven_VacuumHigh_3', 'Int16', 'W', ''),
        ('真空控制下限3', 'VacuumOven_VacuumLow_3', 'Int16', 'W', ''),
        ('运行温度设置4', 'VacuumOven_TempSet_4', 'Int16', 'W', ''),
        ('运行时间设置4', 'VacuumOven_TimeSet_4', 'Int16', 'W', ''),
        ('真空控制上限4', 'VacuumOven_VacuumHigh_4', 'Int16', 'W', ''),
        ('真空控制下限4', 'VacuumOven_VacuumLow_4', 'Int16', 'W', ''),
        ('运行温度设置5', 'VacuumOven_TempSet_5', 'Int16', 'W', ''),
        ('运行时间设置5', 'VacuumOven_TimeSet_5', 'Int16', 'W', ''),
        ('真空控制上限5', 'VacuumOven_VacuumHigh_5', 'Int16', 'W', ''),
        ('真空控制下限5', 'VacuumOven_VacuumLow_5', 'Int16', 'W', ''),
        ('运行温度设置6', 'VacuumOven_TempSet_6', 'Int16', 'W', ''),
        ('运行时间设置6', 'VacuumOven_TimeSet_6', 'Int16', 'W', ''),
        ('真空控制上限6', 'VacuumOven_VacuumHigh_6', 'Int16', 'W', ''),
        ('真空控制下限6', 'VacuumOven_VacuumLow_6', 'Int16', 'W', ''),
        ('真空烘箱停止', 'VacuumOven_STOP', 'Int16', 'W', '为1时停止'),
        ('指令类型', 'VacuumOven_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'VacuumOven_CmdTrig', 'Int16', 'W', ''),
    ]),
    ('七个液冷模块', [
        ('9320液冷模块1温度反馈', 'Liquid_Cooling_9320_1_FB', 'Int16', 'R', ''),
        ('9320液冷模块2温度反馈', 'Liquid_Cooling_9320_2_FB', 'Int16', 'R', ''),
        ('离心管液体处理模块1温度反馈', 'Liquid_Cooling_CentrifugeTube_1_FB', 'Int16', 'R', ''),
        ('离心管液体处理模块2温度反馈', 'Liquid_Cooling_CentrifugeTube_2_FB', 'Int16', 'R', ''),
        ('离心管液体处理模块3温度反馈', 'Liquid_Cooling_CentrifugeTube_3_FB', 'Int16', 'R', ''),
        ('离心管液体处理模块4温度反馈', 'Liquid_Cooling_CentrifugeTube_4_FB', 'Int16', 'R', ''),
        ('离心管液体处理模块5温度反馈', 'Liquid_Cooling_CentrifugeTube_5_FB', 'Int16', 'R', ''),
        ('液冷模块开关完成反馈', 'Liquid_Cooling_Complete_FB', 'Int16', 'R', ''),
        ('9320液冷模块1温度设置', 'Liquid_Cooling_9320_Temperature_1_SET', 'Int16', 'W', ''),
        ('9320液冷模块2温度设置', 'Liquid_Cooling_9320_Temperature_2_SET', 'Int16', 'W', ''),
        ('离心管液体处理模块1温度设置', 'Liquid_Cooling_CentrifugeTube_Temperature_1_SET', 'Int16', 'W', ''),
        ('离心管液体处理模块2温度设置', 'Liquid_Cooling_CentrifugeTube_Temperature_2_SET', 'Int16', 'W', ''),
        ('离心管液体处理模块3温度设置', 'Liquid_Cooling_CentrifugeTube_Temperature_3_SET', 'Int16', 'W', ''),
        ('离心管液体处理模块4温度设置', 'Liquid_Cooling_CentrifugeTube_Temperature_4_SET', 'Int16', 'W', ''),
        ('离心管液体处理模块5温度设置', 'Liquid_Cooling_CentrifugeTube_Temperature_5_SET', 'Int16', 'W', ''),
        ('指令类型', 'Cooling_CmdType', 'Int16', 'W', ''),
        ('指令触发', 'Cooling_CmdTrig', 'Int16', 'W', ''),
    ]),
    ('报错信息', [
        ('设备报错错发蜂鸣器和红灯', 'Device_error', 'Int16', 'W', ''),
    ]),
]

POINT_GROUPS = [
    (t, [dict(name=n, node=nd, dtype=d, rw=r, desc=ds)
         for (n, nd, d, r, ds) in pts])
    for (t, pts) in _RAW
]

# ---------- 按节点库 device id 归一 ----------
DEVICE_POINTS = {}
for (_t, _pts) in POINT_GROUPS:
    _d = MODULE_TO_DEVICE.get(_t)
    if _d:
        DEVICE_POINTS.setdefault(_d, []).extend(_pts)
for (_a, _s) in ALIAS.items():
    if _s in DEVICE_POINTS:
        DEVICE_POINTS[_a] = [dict(p) for p in DEVICE_POINTS[_s]]

# ---------- 表内指令表（各模块 A 列 `n=动作名`，用于交叉校验 ACTIONS）----------
DEVICE_ACTIONS = {
    'gn_centrifuge': {1: 'Y向左', 2: 'Y向右', 3: 'Z向左', 4: 'Z向右', 5: '放入物料', 6: '运行离心机', 7: '取出物料', 8: '复位', 9: '夹爪张开', 10: '夹爪夹紧', 11: '配重天平去皮'},
    'gn_centrifuge_tube_liquid_handling': {1: 'X向左', 2: 'X向右', 3: 'Y向前', 4: 'Y向后', 5: '8通道Z向上', 6: '8通道Z向下', 7: '8通道移液吸', 8: '8通道移液放', 9: '大夹爪Z向上', 10: '大夹爪Z向下', 11: '单通道移液吸', 12: '单通道移液放', 13: '单通道向上', 14: '单通道向下', 15: '小夹爪向上', 16: '小夹爪向下', 17: '磁力架轴向上', 18: '磁力架轴向下', 19: '8通道装载', 20: '8通道吸液', 21: '8通道放液', 22: '8通道卸载', 23: '单通道装载', 24: '单通道吸液', 25: '单通道放液', 26: '单通道卸载', 27: '小夹爪开盖', 28: '小夹爪关盖', 29: '小夹爪抓取', 30: '小夹爪放置', 31: '大夹爪抓取', 32: '大夹爪放置', 33: '单通道混匀', 34: '8通道混匀', 35: '超神波混匀', 36: '复位', 37: 'xyz回原点', 38: '模块1恒温打开', 39: '模块1恒温关闭', 40: '模块2恒温打开', 41: '模块2恒温关闭', 42: '模块3恒温打开', 43: '模块3恒温关闭', 44: '模块4恒温打开', 45: '模块4恒温关闭', 46: '模块4震荡打开', 47: '模块4震荡关闭', 48: '震荡模块夹爪开', 49: '震荡夹爪关'},
    'gn_liquid_cooling': {1: '温度设置', 2: '液冷模块开启', 3: '液冷模块关闭'},
    'gn_locking_mechanism': {1: 'X向左', 2: 'X向右', 3: 'Y向左', 4: 'Y向右', 5: 'Z1向左', 6: 'Z1向右', 7: 'Z2向左', 8: 'Z2向右', 9: '夹爪夹取', 10: '夹爪放置', 11: '电批终锁(扭矩锁死)', 12: '电批拧松', 13: '夹爪夹紧', 14: '夹爪松开', 15: '电批预锁(按圈数,不锁死)', 16: '复位'},
    'gn_quick_carrier_exchange': {1: 'X向左', 2: 'X向右', 3: 'Z1向左', 4: 'Z1向右', 5: 'Z2向左', 6: 'Z2向右', 7: '推轴向左', 8: '推轴向右', 9: 'Z3向左', 10: 'Z3向右', 11: '物料顶出', 12: '物料放置', 13: '磁力搅拌运行', 14: '复位'},
    'gn_robotic_arm': {1: 'X向左', 2: 'X向右', 3: '机械手去目标位置目标板位夹料', 4: '机械手去目标位置目标板位放料', 6: '停止', 7: '复位', 8: '失能', 9: '使能'},
    'gn_rotary_stack': {1: '堆栈左旋转', 2: '堆栈右旋转', 3: '相机Z向上', 4: '相机Z向下', 5: '堆栈旋转至目标位置', 6: '相机移动至目标位置并检测有无', 7: '复位'},
    'gn_solid_weighing': {1: 'X向左', 2: 'X向右', 3: 'Y向里', 4: 'Y向外', 5: '夹爪Z向上', 6: '夹爪Z向下', 7: 'D开门', 8: 'D关门', 9: '取料筒时Y轴向里', 10: '取料筒时Y轴向外', 11: '加料', 12: '夹爪夹料', 13: '夹爪放料', 14: '天枰去皮', 15: '天枰称重', 16: '料筒Z向上', 17: '料筒Z向下', 18: '放料筒时Y轴向里', 19: '放料筒时Y轴向外', 20: '复位', 21: '夹爪夹紧', 22: '夹爪松开', 23: 'xyz回原点'},
    'gn_stack': {1: '堆栈左旋转', 2: '堆栈右旋转', 3: '相机Z向上', 4: '相机Z向下', 5: '堆栈旋转至目标位置', 6: '相机移动至目标位置并检测有无', 7: '复位'},
    'gn_standard_oven': {1: '启动', 2: '复位/停止'},
    'gn_vacuum_oven': {1: '启动', 2: '复位', 100: '开门', 101: '关门'},
}


def points_of(device_id, rw=None):
    """某个驱动下的点位；rw="R"/"W" 可只取读/写方向。"""
    pts = DEVICE_POINTS.get(device_id) or []
    if rw:
        u = rw.upper()
        pts = [p for p in pts if (p.get("rw") or "").upper() == u]
    return pts


def count_of(device_id):
    """某个驱动的点位总数（protocolNodes 的权威来源）。"""
    return len(DEVICE_POINTS.get(device_id) or [])


def actions_of(device_id):
    """表内该模块的指令表 {n: 动作名}（无则空 dict）。"""
    return dict(DEVICE_ACTIONS.get(device_id) or {})

# ---------- 被过滤掉的行（表内残留，记录在案便于审计）----------
DROPPED_ROWS = [
    (5, '非本命名空间（表内杂项）', 'NodeId'),
    (173, '非本命名空间（表内杂项）', 'ss'),
    (178, '只有 NodeId、元数据全空（残留）', 'Robot_Operating_status'),
    (179, '只有 NodeId、元数据全空（残留）', 'Robot_Protective_stop_st'),
    (180, '非本命名空间（表内杂项）', '会加倍'),
    (182, '非本命名空间（表内杂项）', 'sdc'),
    (183, '非本命名空间（表内杂项）', 'asd'),
]
