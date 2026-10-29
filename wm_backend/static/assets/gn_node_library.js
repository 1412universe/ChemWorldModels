// 由 scripts/gen_gn_node_library.py 生成，勿手改；数据源自 CWM-Lab GN 真实资产 + OPC_UA协议1.4.0(2).xlsx「点位表」。
window.GN_NODE_LIBRARY = {
 "version": "20261014.1",
 "protocol": {
  "name": "OPC UA",
  "version": "1.4.1",
  "server": "opc.tcp://192.168.6.6:4840",
  "nsPrefix": "ns=4;s=|var|Inovance-X86-Linux.Application.OPC_UA.",
  "source": "OPC_UA协议1.4.1.xlsx（工作簿①点位表 / 13 模块 / 235 个有效点位）",
  "sheet": "点位表",
  "modules": [
   "锁紧模块",
   "快换",
   "离心机",
   "离心管液体处理",
   "堆栈",
   "机械手",
   "固体加样",
   "总复位",
   "停止",
   "常规烘箱",
   "真空烘箱",
   "七个液冷模块",
   "报错信息"
  ],
  "pointTotal": 235
 },
 "stationMap": {
  "1": "常规烘箱",
  "2": "锁紧",
  "3": "快换",
  "4": "离心机",
  "5": "真空烘箱",
  "6": "9320",
  "7": "离心管液体处理",
  "8": "堆栈",
  "9": "固体加样",
  "10": "成品放置位"
 },
 "stationMapSource": "设备从左到右依次排列（常规烘箱1、锁紧2、快换3、离心机4、真空烘箱5，9320设备6，离心管液体处理7，堆栈8，固体加样9，成品放置位10）",
 "lockRecipe": [
  {
   "step": 1,
   "type": 15,
   "hole": 1,
   "pre_turns": 20,
   "expect": "带上，不锁死"
  },
  {
   "step": 2,
   "type": 15,
   "hole": 3,
   "pre_turns": 20,
   "expect": "对角"
  },
  {
   "step": 3,
   "type": 15,
   "hole": 2,
   "pre_turns": 20,
   "expect": ""
  },
  {
   "step": 4,
   "type": 15,
   "hole": 4,
   "pre_turns": 20,
   "expect": "四角都已贴合"
  },
  {
   "step": 5,
   "type": 11,
   "hole": 1,
   "expect": "锁死"
  },
  {
   "step": 6,
   "type": 11,
   "hole": 3,
   "expect": ""
  },
  {
   "step": 7,
   "type": 11,
   "hole": 2,
   "expect": ""
  },
  {
   "step": 8,
   "type": 11,
   "hole": 4,
   "expect": "整盖完成"
  }
 ],
 "lockInterlocks": [
  "同一时刻只允许一条锁紧指令（下发前校验 CompleteFB=0）",
  "CmdType=15 预锁必须写 pre_turns>0（×0.1圈）",
  "孔顺序必须对角：孔1→孔3→孔2→孔4，禁止邻边 1-2-3-4",
  "必须四颗预锁全部结束后再终锁，禁止同一颗 15 完立刻 11",
  "CmdTrig 必须 0→1 触发，不得长期置 1"
 ],
 "actionsTable": {
  "gn_locking_mechanism": {
   "1": "X向左",
   "2": "X向右",
   "3": "Y向左",
   "4": "Y向右",
   "5": "Z1向左",
   "6": "Z1向右",
   "7": "Z2向左",
   "8": "Z2向右",
   "9": "夹爪夹取",
   "10": "夹爪放置",
   "11": "电批终锁(扭矩锁死)",
   "12": "电批拧松",
   "13": "夹爪夹紧",
   "14": "夹爪松开",
   "15": "电批预锁(按圈数,不锁死)",
   "16": "复位"
  },
  "gn_quick_carrier_exchange": {
   "1": "X向左",
   "2": "X向右",
   "3": "Z1向左",
   "4": "Z1向右",
   "5": "Z2向左",
   "6": "Z2向右",
   "7": "推轴向左",
   "8": "推轴向右",
   "9": "Z3向左",
   "10": "Z3向右",
   "11": "物料顶出",
   "12": "物料放置",
   "13": "磁力搅拌运行",
   "14": "复位"
  },
  "gn_centrifuge": {
   "1": "Y向左",
   "2": "Y向右",
   "3": "Z向左",
   "4": "Z向右",
   "5": "放入物料",
   "6": "运行离心机",
   "7": "取出物料",
   "8": "复位",
   "9": "夹爪张开",
   "10": "夹爪夹紧",
   "11": "配重天平去皮"
  },
  "gn_centrifuge_tube_liquid_handling": {
   "1": "X向左",
   "2": "X向右",
   "3": "Y向前",
   "4": "Y向后",
   "5": "8通道Z向上",
   "6": "8通道Z向下",
   "7": "8通道移液吸",
   "8": "8通道移液放",
   "9": "大夹爪Z向上",
   "10": "大夹爪Z向下",
   "11": "单通道移液吸",
   "12": "单通道移液放",
   "13": "单通道向上",
   "14": "单通道向下",
   "15": "小夹爪向上",
   "16": "小夹爪向下",
   "17": "磁力架轴向上",
   "18": "磁力架轴向下",
   "19": "8通道装载",
   "20": "8通道吸液",
   "21": "8通道放液",
   "22": "8通道卸载",
   "23": "单通道装载",
   "24": "单通道吸液",
   "25": "单通道放液",
   "26": "单通道卸载",
   "27": "小夹爪开盖",
   "28": "小夹爪关盖",
   "29": "小夹爪抓取",
   "30": "小夹爪放置",
   "31": "大夹爪抓取",
   "32": "大夹爪放置",
   "33": "单通道混匀",
   "34": "8通道混匀",
   "35": "超声波混匀",
   "36": "复位",
   "37": "xyz回原点",
   "38": "模块1恒温打开",
   "39": "模块1恒温关闭",
   "40": "模块2恒温打开",
   "41": "模块2恒温关闭",
   "42": "模块3恒温打开",
   "43": "模块3恒温关闭",
   "44": "模块4恒温打开",
   "45": "模块4恒温关闭",
   "46": "模块4震荡打开",
   "47": "模块4震荡关闭",
   "48": "震荡模块夹爪开",
   "49": "震荡夹爪关"
  },
  "gn_rotary_stack": {
   "1": "堆栈左旋转",
   "2": "堆栈右旋转",
   "3": "相机Z向上",
   "4": "相机Z向下",
   "5": "堆栈旋转至目标位置",
   "6": "相机移动至目标位置并检测有无",
   "7": "复位"
  },
  "gn_robotic_arm": {
   "1": "X向左",
   "2": "X向右",
   "3": "去目标工站目标板位夹料",
   "4": "去目标工站目标板位放料",
   "6": "停止",
   "7": "复位",
   "8": "失能",
   "9": "使能"
  },
  "gn_solid_weighing": {
   "1": "X向左",
   "2": "X向右",
   "3": "Y向里",
   "4": "Y向外",
   "5": "夹爪Z向上",
   "6": "夹爪Z向下",
   "7": "D开门",
   "8": "D关门",
   "9": "取料筒时Y轴向里",
   "10": "取料筒时Y轴向外",
   "11": "加料",
   "12": "夹爪夹料",
   "13": "夹爪放料",
   "14": "天枰去皮",
   "15": "天枰称重",
   "16": "料筒Z向上",
   "17": "料筒Z向下",
   "18": "放料筒时Y轴向里",
   "19": "放料筒时Y轴向外",
   "20": "复位",
   "21": "夹爪夹紧",
   "22": "夹爪松开",
   "23": "xyz回原点",
   "24": "静电消除开",
   "25": "静电消除关"
  },
  "gn_standard_oven": {
   "1": "启动",
   "2": "复位/停止"
  },
  "gn_vacuum_oven": {
   "1": "启动",
   "2": "复位",
   "100": "开门",
   "101": "关门"
  },
  "gn_liquid_cooling": {
   "1": "温度设置",
   "2": "液冷模块开启",
   "3": "液冷模块关闭"
  }
 },
 "actionsDeviation": {
  "gn_centrifuge_tube_liquid_handling": {
   "35": {
    "table": "超神波混匀",
    "code": "超声波混匀",
    "why": "表内原文「超神波」是「超声波」的错别字，沿用正确写法"
   }
  },
  "gn_robotic_arm": {
   "3": {
    "table": "机械手去目标位置目标板位夹料",
    "code": "去目标工站目标板位夹料",
    "why": "统一到 station 参数（Robot_ModuleNoSet）的「工站」口径，语义一致"
   },
   "4": {
    "table": "机械手去目标位置目标板位放料",
    "code": "去目标工站目标板位放料",
    "why": "同上"
   }
  },
  "gn_solid_weighing": {
   "24": {
    "table": null,
    "code": "静电消除开",
    "why": "1.4.0(2) 已从表内移除，驱动仍在用"
   },
   "25": {
    "table": null,
    "code": "静电消除关",
    "why": "同上"
   }
  }
 },
 "source": "CWM-Lab/unilabos/devices/workstation/GN（真实驱动 + 真实工作流）＋ OPC_UA协议1.4.0(2).xlsx（最权威最新：240 个协议点位 / 动作表 / 参数中文名 / 单位 / 范围 / 互锁）",
 "devices": [
  {
   "id": "gn_locking_mechanism",
   "label": "锁紧模块",
   "protocol": "Lock_",
   "desc": "锁紧模块：X/Y/Z1/Z2 走位 + 夹爪取放 + 电批预锁/终锁/拧松",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "X向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "X向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "Y向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "Y向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "Z1向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "Z1向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "Z2向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 8,
     "label": "Z2向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 9,
     "label": "夹爪夹取",
     "inRealWorkflow": true,
     "count": 2,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 10,
     "label": "夹爪放置",
     "inRealWorkflow": true,
     "count": 2,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 11,
     "label": "电批终锁(扭矩锁死)",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 12,
     "label": "电批拧松",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 13,
     "label": "夹爪夹紧",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 14,
     "label": "夹爪松开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 15,
     "label": "电批预锁(按圈数,不锁死)",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 16,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "Z1 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "Z2 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "jaw_position": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_position",
        "label": "夹爪位置",
        "rw": "W",
        "desc": "锁紧模块夹爪开合位置"
       },
       "desc": "锁紧模块夹爪开合位置"
      },
      "jaw_force": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "jaw_force",
        "label": "夹爪力度",
        "rw": "W",
        "desc": "锁紧模块夹爪夹紧力"
       },
       "desc": "锁紧模块夹爪夹紧力"
      },
      "pre_turns": {
       "type": "int",
       "optional": true,
       "min": 1,
       "max": 100,
       "meta": {
        "key": "pre_turns",
        "label": "预锁圈数",
        "unit": "0.1圈",
        "rw": "W",
        "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
       },
       "unit": "0.1圈",
       "desc": "Lock_PreTurnsSet。20=2.0圈；四颗螺丝共用；Type=15(预锁)必写，≤0 拒收"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "X位置反馈",
     "node": "Lock_XPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Y位置反馈",
     "node": "Lock_YPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z1位置反馈",
     "node": "Lock_Z1PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z2位置反馈",
     "node": "Lock_Z2PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Lock_CompleteFB",
     "dtype": "Int16",
     "rw": "R",
     "desc": "0执行中/空闲  1成功  2失败"
    },
    {
     "name": "X运行位置",
     "node": "Lock_XPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y运行位置",
     "node": "Lock_YPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z1运行位置",
     "node": "Lock_Z1PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z2运行位置",
     "node": "Lock_Z2PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "X速度",
     "node": "Lock_XSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y速度",
     "node": "Lock_YSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z1速度",
     "node": "Lock_Z1Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z2速度",
     "node": "Lock_Z2Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Lock_CmdType",
     "dtype": "Int16",
     "rw": "W",
     "desc": "见左侧指令表。11=终锁  15=预锁"
    },
    {
     "name": "指令触发",
     "node": "Lock_CmdTrig",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1=触发，必须0→1。PLC收下后清0"
    },
    {
     "name": "夹爪位置",
     "node": "Lock_JawPosition",
     "dtype": "Double",
     "rw": "W"
    },
    {
     "name": "夹爪力度",
     "node": "Lock_JawForce",
     "dtype": "Double",
     "rw": "W"
    },
    {
     "name": "预锁圈数",
     "node": "Lock_PreTurnsSet",
     "dtype": "Int16",
     "rw": "W",
     "desc": "单位0.1圈。20=2.0圈。四颗螺丝共用，预锁Type=15必写"
    }
   ],
   "pointStats": {
    "total": 18,
    "r": 5,
    "w": 13
   },
   "protocolNodes": 18
  },
  {
   "id": "gn_quick_carrier_exchange",
   "label": "快换模块",
   "protocol": "QuickChange_",
   "desc": "快换模块：X/Z1/Z2/推轴/Z3 走位 + 物料顶出放置 + 磁力搅拌",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "X向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "X向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "Z1向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "Z1向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "Z2向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "Z2向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "推轴向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 8,
     "label": "推轴向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 9,
     "label": "Z3向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 10,
     "label": "Z3向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 11,
     "label": "物料顶出",
     "inRealWorkflow": true,
     "count": 10,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 12,
     "label": "物料放置",
     "inRealWorkflow": true,
     "count": 3,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 13,
     "label": "磁力搅拌运行",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 14,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 3,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "top_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "top_z_pos",
        "label": "顶料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块顶出物料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块顶出物料时的 Z 位置"
      },
      "take_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "take_z_pos",
        "label": "接料 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块接料时的 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块接料时的 Z 位置"
      },
      "push_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_pos",
        "label": "推轴运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块推杆水平位置"
       },
       "unit": "脉冲",
       "desc": "快换模块推杆水平位置"
      },
      "push_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_z_pos",
        "label": "压料 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "快换模块压料轴 Z 位置"
       },
       "unit": "脉冲",
       "desc": "快换模块压料轴 Z 位置"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "push_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "push_speed",
        "label": "推轴速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "stir_rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_rpm",
        "label": "磁力搅拌转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "快换模块磁力搅拌转速"
       },
       "unit": "rpm",
       "desc": "快换模块磁力搅拌转速"
      },
      "stir_temp": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_temp",
        "label": "磁力搅拌温度",
        "unit": "℃",
        "rw": "W",
        "desc": "快换模块磁力搅拌温度"
       },
       "unit": "℃",
       "desc": "快换模块磁力搅拌温度"
      },
      "stir_time_minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "stir_time_minutes",
        "label": "磁力搅拌时间",
        "unit": "min",
        "rw": "W",
        "desc": "快换模块磁力搅拌时长"
       },
       "unit": "min",
       "desc": "快换模块磁力搅拌时长"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "X位置反馈",
     "node": "QuickChange_XPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z1位置反馈",
     "node": "QuickChange_Z1PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z2位置反馈",
     "node": "QuickChange_Z2PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "推轴反馈",
     "node": "QuickChange_PushPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z3位置反馈",
     "node": "QuickChange_Z3PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "QuickChange_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "X运行位置",
     "node": "QuickChange_XPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "顶料Z位置",
     "node": "QuickChange_TopZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "接料Z位置",
     "node": "QuickChange_TakeZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "推轴运行位置",
     "node": "QuickChange_PushPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "压料Z运行位置",
     "node": "QuickChange_PushZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "X速度",
     "node": "QuickChange_XSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z1速度",
     "node": "QuickChange_Z1Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z2速度",
     "node": "QuickChange_Z2Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "推轴速度",
     "node": "QuickChange_PushSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z3速度",
     "node": "QuickChange_Z3Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "QuickChange_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "QuickChange_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "磁力搅拌转速",
     "node": "QuickChange_StirRPM",
     "dtype": "Int16"
    },
    {
     "name": "磁力搅拌温度",
     "node": "QuickChange_StirTemp",
     "dtype": "Int16"
    },
    {
     "name": "磁力搅拌时间(分)",
     "node": "QuickChange_StirTime",
     "dtype": "Int16"
    }
   ],
   "pointStats": {
    "total": 21,
    "r": 6,
    "w": 12
   },
   "protocolNodes": 21
  },
  {
   "id": "gn_centrifuge",
   "label": "离心机",
   "protocol": "Centrifuge_",
   "desc": "离心机：Y/Z 走位 + 装料/离心/卸料 + 夹爪 + 配重天平去皮",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "Y向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "Y向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "Z向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "Z向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "放入物料",
     "inRealWorkflow": true,
     "count": 13,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "运行离心机",
     "inRealWorkflow": true,
     "count": 5,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "取出物料",
     "inRealWorkflow": true,
     "count": 13,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 8,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 32,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 9,
     "label": "夹爪张开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 10,
     "label": "夹爪夹紧",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 11,
     "label": "配重天平去皮",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "inner_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "inner_z_pos",
        "label": "离心机内 Z 位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "离心机腔体内取放料 Z 位置"
       },
       "unit": "脉冲",
       "desc": "离心机腔体内取放料 Z 位置"
      },
      "rpm": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "rpm",
        "label": "离心机转速",
        "unit": "rpm",
        "rw": "W",
        "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
       },
       "unit": "rpm",
       "desc": "离心转速；离心时长由 time_minutes 给出（秒）"
      },
      "time_minutes": {
       "type": "int",
       "optional": true,
       "min": 0,
       "max": 32767,
       "meta": {
        "key": "time_minutes",
        "label": "离心机时间",
        "unit": "s",
        "rw": "W",
        "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
       },
       "unit": "s",
       "desc": "写入 Centrifuge_Time 的离心时长，单位为秒"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "plate_no": {
       "type": "enum",
       "optional": true,
       "options": [
        1,
        2,
        3,
        4
       ],
       "meta": {
        "key": "plate_no",
        "label": "离心机板位号",
        "unit": "1~4",
        "rw": "W",
        "desc": "离心机内 4 个板位号，取值 1/2/3/4",
        "options": {
         "1": "板位1",
         "2": "板位2",
         "3": "板位3",
         "4": "板位4"
        }
       },
       "unit": "1~4",
       "desc": "离心机内 4 个板位号，取值 1/2/3/4"
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "Y位置反馈",
     "node": "Centrifuge_YPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z位置反馈",
     "node": "Centrifuge_ZPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Centrifuge_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Y运行位置",
     "node": "Centrifuge_YPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "台面Z位置",
     "node": "Centrifuge_ZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心机内Z位置",
     "node": "Centrifuge_InnerZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心机转速",
     "node": "Centrifuge_RPM",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心机时间",
     "node": "Centrifuge_Time",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心机里板位号(1,2,3,4)",
     "node": "Centrifuge_PlateNo",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心机温度设置",
     "node": "iTemperature",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y速度",
     "node": "Centrifuge_YSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z速度",
     "node": "Centrifuge_ZSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Centrifuge_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Centrifuge_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "称重天平去皮",
     "node": "Tare_the_scale",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "称重天平重量反馈",
     "node": "scale_weight",
     "dtype": "REAL",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 16,
    "r": 3,
    "w": 13
   },
   "protocolNodes": 16
  },
  {
   "id": "gn_centrifuge_tube_liquid_handling",
   "label": "离心管液体处理",
   "protocol": "Tube_",
   "desc": "离心管液体处理：8/单通道移液混匀 + 大小夹爪 + 磁力架 + 恒温/震荡模块",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "X向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3095
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "X向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 0
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "Y向前",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2090
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "Y向后",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": 0
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "8通道Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "8通道Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "8通道移液吸",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 8,
     "label": "8通道移液放",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 9,
     "label": "大夹爪Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 10,
     "label": "大夹爪Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 11,
     "label": "单通道移液吸",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 12,
     "label": "单通道移液放",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 13,
     "label": "单通道向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 14,
     "label": "单通道向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 15,
     "label": "小夹爪向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 16,
     "label": "小夹爪向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 17,
     "label": "磁力架轴向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 18,
     "label": "磁力架轴向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 19,
     "label": "8通道装载",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3095
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2090
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）",
       "default": 905
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 500
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 20,
     "label": "8通道吸液",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 4563
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2121
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）",
       "default": 900
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 21,
     "label": "8通道放液",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3093
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -3181
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）",
       "default": 1330
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 22,
     "label": "8通道卸载",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 2463
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -581
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）",
       "default": 1027
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 500
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 3000
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 23,
     "label": "单通道装载",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 720
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -850
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       },
       "default": 2000
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       },
       "default": 1030
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 24,
     "label": "单通道吸液",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 7920
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2250
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       },
       "default": 2000
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       },
       "default": 1130
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 25,
     "label": "单通道放液",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3920
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2250
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       },
       "default": 2000
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       },
       "default": 930
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 26,
     "label": "单通道卸载",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 20
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -850
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 500
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       },
       "default": 2000
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       },
       "default": 1030
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 27,
     "label": "小夹爪开盖",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 6670
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2300
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       },
       "default": 540
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 500
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       },
       "default": 1390
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       },
       "default": 1330
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       },
       "default": 1330
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       },
       "default": 1390
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       },
       "default": 40
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       },
       "default": 40
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       },
       "default": 300
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       },
       "default": 300
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 28,
     "label": "小夹爪关盖",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 6670
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2300
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       },
       "default": -540
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       },
       "default": 1390
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       },
       "default": 1330
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       },
       "default": 1330
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       },
       "default": 1390
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       },
       "default": 40
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       },
       "default": 40
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       },
       "default": 300
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       },
       "default": 300
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 29,
     "label": "小夹爪抓取",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 6330
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -480
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       },
       "default": 1375
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       },
       "default": 540
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       },
       "default": 1390
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       },
       "default": 1330
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       },
       "default": 1330
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       },
       "default": 1390
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       },
       "default": 40
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       },
       "default": 40
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       },
       "default": 300
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       },
       "default": 300
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 30,
     "label": "小夹爪放置",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 6330
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -480
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       },
       "default": 1375
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       },
       "default": 540
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       },
       "default": 1390
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       },
       "default": 1330
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       },
       "default": 1330
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       },
       "default": 1390
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       },
       "default": 40
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       },
       "default": 40
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       },
       "default": 300
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       },
       "default": 300
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 31,
     "label": "大夹爪抓取",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 2490
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -3200
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）",
       "default": 1420
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 32,
     "label": "大夹爪放置",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 7100
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -3550
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）",
       "default": 1215
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 33,
     "label": "单通道混匀",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3920
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -2250
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       },
       "default": 2000
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       },
       "default": 930
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       },
       "default": 5
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 34,
     "label": "8通道混匀",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0",
       "default": 3093
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet",
       "default": -3181
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）",
       "default": 1330
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       },
       "default": 300
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       },
       "default": 500
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       },
       "default": 500
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度",
       "default": 500
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       },
       "default": 5
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 300
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       },
       "default": 0
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       },
       "default": 0
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       },
       "default": 0
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       },
       "default": 0
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 35,
     "label": "超声波混匀",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       },
       "default": 300
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       },
       "default": 300
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       },
       "default": 5
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 36,
     "label": "复位",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       },
       "default": 180
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       },
       "default": 100
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 37,
     "label": "xyz回原点",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 38,
     "label": "模块1恒温打开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       },
       "default": 37
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       },
       "default": 60
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 39,
     "label": "模块1恒温关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 40,
     "label": "模块2恒温打开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       },
       "default": 37
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       },
       "default": 60
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 41,
     "label": "模块2恒温关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 42,
     "label": "模块3恒温打开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       },
       "default": 37
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       },
       "default": 60
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 43,
     "label": "模块3恒温关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 44,
     "label": "模块4恒温打开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       },
       "default": 37
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       },
       "default": 60
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 45,
     "label": "模块4恒温关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 46,
     "label": "模块4震荡打开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       },
       "default": 300
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       },
       "default": 20
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       },
       "default": 25
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       },
       "default": 1
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 47,
     "label": "模块4震荡关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 48,
     "label": "震荡模块夹爪开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 49,
     "label": "震荡夹爪关",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "离心管整机 X 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "离心管整机 Y 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "z1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_pos",
        "label": "八通道 Z 轴",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z1 轴（对角螺丝位之一）"
      },
      "p1_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_pos",
        "label": "八通道吸放液量"
       }
      },
      "z2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_pos",
        "label": "大夹爪",
        "unit": "脉冲",
        "rw": "W",
        "desc": "锁紧模块 Z2 轴（电批下降轴）"
       },
       "unit": "脉冲",
       "desc": "锁紧模块 Z2 轴（电批下降轴）"
      },
      "p2_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_pos",
        "label": "单通道吸放液量"
       }
      },
      "z3_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_pos",
        "label": "单通道 Z 轴"
       }
      },
      "z4_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_pos",
        "label": "小夹爪"
       }
      },
      "m_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_pos",
        "label": "超声磁力架 Z 轴"
       }
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z1_speed",
        "label": "Z1 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p1_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p1_speed",
        "label": "p1_speed"
       }
      },
      "z2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z2_speed",
        "label": "Z2 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "p2_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "p2_speed",
        "label": "p2_speed"
       }
      },
      "z3_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z3_speed",
        "label": "Z3 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z4_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z4_speed",
        "label": "Z4 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "m_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "m_speed",
        "label": "m_speed"
       }
      },
      "mix_counts": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "mix_counts",
        "label": "mix_counts"
       }
      },
      "ultrasound_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ultrasound_time",
        "label": "ultrasound_time"
       }
      },
      "shaking_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_speed",
        "label": "shaking_speed"
       }
      },
      "shaking_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "shaking_time",
        "label": "shaking_time"
       }
      },
      "small_gripper_angle": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_angle",
        "label": "small_gripper_angle"
       }
      },
      "small_gripper_force": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "small_gripper_force",
        "label": "small_gripper_force"
       }
      },
      "ch8_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_blow",
        "label": "八通道吹样量"
       }
      },
      "ch1_blow": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_blow",
        "label": "单通道吹样量"
       }
      },
      "ch8_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch8_reverse_aspirate",
        "label": "ch8_reverse_aspirate"
       }
      },
      "ch1_reverse_aspirate": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "ch1_reverse_aspirate",
        "label": "ch1_reverse_aspirate"
       }
      },
      "open_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_start",
        "label": "open_lid_start"
       }
      },
      "open_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_end",
        "label": "open_lid_end"
       }
      },
      "close_lid_start": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_start",
        "label": "close_lid_start"
       }
      },
      "close_lid_end": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_end",
        "label": "close_lid_end"
       }
      },
      "open_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_speed",
        "label": "open_lid_speed"
       }
      },
      "close_lid_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_speed",
        "label": "close_lid_speed"
       }
      },
      "open_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "open_lid_rotation_speed",
        "label": "open_lid_rotation_speed"
       }
      },
      "close_lid_rotation_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "close_lid_rotation_speed",
        "label": "close_lid_rotation_speed"
       }
      },
      "thermo1_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_temperature",
        "label": "thermo1_temperature"
       }
      },
      "thermo1_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo1_time",
        "label": "thermo1_time"
       }
      },
      "thermo2_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_temperature",
        "label": "thermo2_temperature"
       }
      },
      "thermo2_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo2_time",
        "label": "thermo2_time"
       }
      },
      "thermo3_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_temperature",
        "label": "thermo3_temperature"
       }
      },
      "thermo3_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo3_time",
        "label": "thermo3_time"
       }
      },
      "thermo4_temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_temperature",
        "label": "thermo4_temperature"
       }
      },
      "thermo4_time": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "thermo4_time",
        "label": "thermo4_time"
       }
      },
      "ultrasound_stop": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "ultrasound_stop",
        "label": "ultrasound_stop"
       }
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "X位置反馈",
     "node": "Tube_XPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Y位置反馈",
     "node": "Tube_YPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z1位置反馈",
     "node": "Tube_Z1PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "P1位置反馈",
     "node": "Tube_P1PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z2位置反馈",
     "node": "Tube_Z2PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "P2位置反馈",
     "node": "Tube_P2PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z3位置反馈",
     "node": "Tube_Z3PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Z4位置反馈",
     "node": "Tube_Z4PosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "M轴位置反馈",
     "node": "Tube_MPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Tube_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "恒温模块1温度反馈",
     "node": "Tube_ThermostaticModule1_TemperatureFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "恒温模块2温度反馈",
     "node": "Tube_ThermostaticModule2_TemperatureFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "恒温模块3温度反馈",
     "node": "Tube_ThermostaticModule3_TemperatureFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "恒温模块4温度反馈",
     "node": "Tube_ThermostaticModule4_TemperatureFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "X运行位置",
     "node": "Tube_XPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y运行位置",
     "node": "Tube_YPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z1运行位置",
     "node": "Tube_Z1PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "P1运行位置",
     "node": "Tube_P1PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z2运行位置",
     "node": "Tube_Z2PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "P2运行位置",
     "node": "Tube_P2PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z3运行位置",
     "node": "Tube_Z3PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z4运行位置",
     "node": "Tube_Z4PosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "M轴运行位置",
     "node": "Tube_MPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "X速度",
     "node": "Tube_XSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y速度",
     "node": "Tube_YSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z1速度",
     "node": "Tube_Z1Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "P1速度",
     "node": "Tube_P1Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z2速度",
     "node": "Tube_Z2Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "P2速度",
     "node": "Tube_P2Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z3速度",
     "node": "Tube_Z3Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z4速度",
     "node": "Tube_Z4Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "M轴速度",
     "node": "Tube_MSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Tube_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Tube_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "8通道吹样",
     "node": "Tube_Ch8Blow",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "单通道吹样",
     "node": "Tube_Ch1Blow",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "8通道反向吸液",
     "node": "Tube_Ch8ReverseAspirate",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "单通道反向吸液",
     "node": "Tube_Ch1ReverseAspirate",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪旋转角度",
     "node": "Tube_SmallGripperAngle",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪力度",
     "node": "Tube_SmallGripperForce",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "混匀次数",
     "node": "Tube_MixCounts",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪开盖初始位置",
     "node": "Tube_SmallGripperOpenLidStart",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪开盖结束位置",
     "node": "Tube_SmallGripperOpenLidEnd",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪关盖初始位置",
     "node": "Tube_SmallGripperCloseLidStart",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪关盖初始位置",
     "node": "Tube_SmallGripperCloseLidEnd",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪开盖速度",
     "node": "Tube_SmallGripperOpenLidSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "小夹爪关盖速度",
     "node": "Tube_SmallGripperCloseLidSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "开盖旋转速度",
     "node": "Tube_SmallGripperOpenLid_RotationSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "关盖旋转速度",
     "node": "Tube_SmallGripperCloseLid_RotationSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "超声波混匀时间",
     "node": "Tube_UltrasoundTime",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度1",
     "node": "Tube_ThermostaticModule_Temperature1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度1反馈",
     "node": "Tube_Temperature1_feedback",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温控时间1",
     "node": "Tube_ThermostaticModule_Time1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度2",
     "node": "Tube_ThermostaticModule_Temperature2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度2反馈",
     "node": "Tube_Temperature2_feedback",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温控时间2",
     "node": "Tube_ThermostaticModule_Time2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度3",
     "node": "Tube_ThermostaticModule_Temperature3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度3反馈",
     "node": "Tube_Temperature3_feedback",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温控时间3",
     "node": "Tube_ThermostaticModule_Time3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度4",
     "node": "Tube_ThermostaticModule_Temperature4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温度4反馈",
     "node": "Tube_Temperature4_feedback",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块温控时间4",
     "node": "Tube_ThermostaticModule_Time4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块4震荡转速",
     "node": "Tube_ThermostaticModule4_Shaking_Speed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "恒温模块4震荡时间",
     "node": "Tube_ThermostaticModule4_Shaking_Time",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "超声波停止",
     "node": "Tube_UltrasoundSTOP",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1停止"
    }
   ],
   "pointStats": {
    "total": 65,
    "r": 14,
    "w": 51
   },
   "protocolNodes": 65
  },
  {
   "id": "gn_rotary_stack",
   "label": "旋转堆栈",
   "protocol": "Stack_",
   "desc": "旋转堆栈：R/Z 走位 + 相机检测有无 + 复位",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "堆栈左旋转",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "堆栈右旋转",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "相机Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "相机Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "堆栈旋转至目标位置",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "相机移动至目标位置并检测有无",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 6,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "R位置反馈",
     "node": "Stack_RPosFB",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z位置反馈",
     "node": "Stack_ZPosFB",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "完成反馈",
     "node": "Stack_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "R运行位置",
     "node": "Stack_RPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z运行位置",
     "node": "Stack_ZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "R速度",
     "node": "Stack_RSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z速度",
     "node": "Stack_ZSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Stack_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Stack_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "物料检测结果",
     "node": "Stack_DetectResult",
     "dtype": "Int16",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 10,
    "r": 1,
    "w": 9
   },
   "protocolNodes": 10
  },
  {
   "id": "gn_stack",
   "label": "旋转堆栈",
   "protocol": "Stack_",
   "desc": "旋转堆栈（gn_stack 键名，与 gn_rotary_stack 同一 Stack_ 模块）：R/Z 走位 + 相机检测 + 复位",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "堆栈左旋转",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "堆栈右旋转",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "相机Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "相机Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "堆栈旋转至目标位置",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "相机移动至目标位置并检测有无",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "r_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_pos",
        "label": "R 旋转运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "堆栈旋转轴目标位置，复位为 0"
       },
       "unit": "脉冲",
       "desc": "堆栈旋转轴目标位置，复位为 0"
      },
      "z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_pos",
        "label": "Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
       },
       "unit": "脉冲",
       "desc": "旋转堆栈为 Z 轴；离心机为台面 Z 位置"
      },
      "r_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "r_speed",
        "label": "R 旋转速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "z_speed",
        "label": "Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "R位置反馈",
     "node": "Stack_RPosFB",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z位置反馈",
     "node": "Stack_ZPosFB",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "完成反馈",
     "node": "Stack_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "R运行位置",
     "node": "Stack_RPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z运行位置",
     "node": "Stack_ZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "R速度",
     "node": "Stack_RSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Z速度",
     "node": "Stack_ZSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Stack_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Stack_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "物料检测结果",
     "node": "Stack_DetectResult",
     "dtype": "Int16",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 10,
    "r": 1,
    "w": 9
   },
   "protocolNodes": 10
  },
  {
   "id": "gn_robotic_arm",
   "label": "机械手",
   "protocol": "Robot_",
   "desc": "机械手：X 走位 + 去目标工站/目标板位夹放料 + 使能/失能/复位",
   "kind": "name",
   "actions": [
    {
     "name": "pick",
     "label": "机械臂抓取",
     "inRealWorkflow": true,
     "count": 107,
     "params": {
      "station": {
       "type": "enum",
       "options": [
        "oven",
        "locking",
        "quick_change",
        "centrifuge",
        "vacuum_oven",
        "nine9320",
        "tube",
        "stack",
        "solid",
        "finished_area"
       ],
       "meta": {
        "key": "station",
        "label": "目标工站",
        "unit": "1~10",
        "rw": "W",
        "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
        "options": {
         "oven": "常规烘箱",
         "locking": "锁紧",
         "quick_change": "快换",
         "centrifuge": "离心机",
         "vacuum_oven": "真空烘箱",
         "nine9320": "9320",
         "tube": "离心管液体处理",
         "stack": "堆栈",
         "solid": "固体加样",
         "finished_area": "成品放置位"
        }
       },
       "unit": "1~10",
       "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
       "alias": {
        "1": "oven",
        "2": "locking",
        "3": "quick_change",
        "4": "centrifuge",
        "5": "vacuum_oven",
        "6": "nine9320",
        "7": "tube",
        "8": "stack",
        "9": "solid",
        "10": "finished_area",
        "9320": "nine9320",
        "oven": "oven",
        "furnace": "oven",
        "gn_standard_oven": "oven",
        "lock": "locking",
        "locking": "locking",
        "locking_mechanism": "locking",
        "quick": "quick_change",
        "quickchange": "quick_change",
        "quick_carrier_exchange": "quick_change",
        "quick_change": "quick_change",
        "centrifuge": "centrifuge",
        "centri": "centrifuge",
        "vacuum": "vacuum_oven",
        "voven": "vacuum_oven",
        "vacuum_oven": "vacuum_oven",
        "nine9320": "nine9320",
        "prcxi": "nine9320",
        "tube": "tube",
        "tubeh": "tube",
        "stack": "stack",
        "rotary_stack": "stack",
        "solid": "solid",
        "balance": "solid",
        "solid_weighing": "solid",
        "finished": "finished_area",
        "finished_area": "finished_area",
        "finished_product_area": "finished_area",
        "product": "finished_area"
       }
      },
      "item_type": {
       "type": "enum",
       "default": "plate",
       "meta": {
        "key": "item_type",
        "label": "物料类型",
        "rw": "—",
        "desc": "搬运对象类型，用于选夹爪/吸盘",
        "options": {
         "plate": "孔板",
         "bottle": "瓶"
        }
       },
       "desc": "搬运对象类型，用于选夹爪/吸盘",
       "options": [
        "plate",
        "bottle"
       ]
      },
      "number": {
       "type": "int",
       "default": 1,
       "meta": {
        "key": "number",
        "label": "目标板位/动作序号",
        "rw": "W",
        "desc": "该工站内的动作序号，1 指第一个动作，依次类推；注意离心机工站（4）：2 指「离心机前面天平的动作」（1.4.0(2) 表行 162 明确）"
       },
       "desc": "该工站内的动作序号，1 指第一个动作，依次类推；注意离心机工站（4）：2 指「离心机前面天平的动作」（1.4.0(2) 表行 162 明确）"
      },
      "x_speed": {
       "type": "int",
       "default": 300,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "place",
     "label": "机械臂放置",
     "inRealWorkflow": true,
     "count": 107,
     "params": {
      "station": {
       "type": "enum",
       "options": [
        "oven",
        "locking",
        "quick_change",
        "centrifuge",
        "vacuum_oven",
        "nine9320",
        "tube",
        "stack",
        "solid",
        "finished_area"
       ],
       "meta": {
        "key": "station",
        "label": "目标工站",
        "unit": "1~10",
        "rw": "W",
        "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
        "options": {
         "oven": "常规烘箱",
         "locking": "锁紧",
         "quick_change": "快换",
         "centrifuge": "离心机",
         "vacuum_oven": "真空烘箱",
         "nine9320": "9320",
         "tube": "离心管液体处理",
         "stack": "堆栈",
         "solid": "固体加样",
         "finished_area": "成品放置位"
        }
       },
       "unit": "1~10",
       "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
       "alias": {
        "1": "oven",
        "2": "locking",
        "3": "quick_change",
        "4": "centrifuge",
        "5": "vacuum_oven",
        "6": "nine9320",
        "7": "tube",
        "8": "stack",
        "9": "solid",
        "10": "finished_area",
        "9320": "nine9320",
        "oven": "oven",
        "furnace": "oven",
        "gn_standard_oven": "oven",
        "lock": "locking",
        "locking": "locking",
        "locking_mechanism": "locking",
        "quick": "quick_change",
        "quickchange": "quick_change",
        "quick_carrier_exchange": "quick_change",
        "quick_change": "quick_change",
        "centrifuge": "centrifuge",
        "centri": "centrifuge",
        "vacuum": "vacuum_oven",
        "voven": "vacuum_oven",
        "vacuum_oven": "vacuum_oven",
        "nine9320": "nine9320",
        "prcxi": "nine9320",
        "tube": "tube",
        "tubeh": "tube",
        "stack": "stack",
        "rotary_stack": "stack",
        "solid": "solid",
        "balance": "solid",
        "solid_weighing": "solid",
        "finished": "finished_area",
        "finished_area": "finished_area",
        "finished_product_area": "finished_area",
        "product": "finished_area"
       }
      },
      "item_type": {
       "type": "enum",
       "default": "plate",
       "meta": {
        "key": "item_type",
        "label": "物料类型",
        "rw": "—",
        "desc": "搬运对象类型，用于选夹爪/吸盘",
        "options": {
         "plate": "孔板",
         "bottle": "瓶"
        }
       },
       "desc": "搬运对象类型，用于选夹爪/吸盘",
       "options": [
        "plate",
        "bottle"
       ]
      },
      "number": {
       "type": "int",
       "default": 1,
       "meta": {
        "key": "number",
        "label": "目标板位/动作序号",
        "rw": "W",
        "desc": "该工站内的动作序号，1 指第一个动作，依次类推；注意离心机工站（4）：2 指「离心机前面天平的动作」（1.4.0(2) 表行 162 明确）"
       },
       "desc": "该工站内的动作序号，1 指第一个动作，依次类推；注意离心机工站（4）：2 指「离心机前面天平的动作」（1.4.0(2) 表行 162 明确）"
      },
      "x_speed": {
       "type": "int",
       "default": 300,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "transfer",
     "label": "机械臂搬运",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "source": {
       "type": "enum",
       "meta": {
        "key": "source",
        "label": "起点工站",
        "options": {
         "oven": "常规烘箱",
         "locking": "锁紧",
         "quick_change": "快换",
         "centrifuge": "离心机",
         "vacuum_oven": "真空烘箱",
         "nine9320": "9320",
         "tube": "离心管液体处理",
         "stack": "堆栈",
         "solid": "固体加样",
         "finished_area": "成品放置位"
        }
       },
       "options": [
        "oven",
        "locking",
        "quick_change",
        "centrifuge",
        "vacuum_oven",
        "nine9320",
        "tube",
        "stack",
        "solid",
        "finished_area"
       ],
       "alias": {
        "1": "oven",
        "2": "locking",
        "3": "quick_change",
        "4": "centrifuge",
        "5": "vacuum_oven",
        "6": "nine9320",
        "7": "tube",
        "8": "stack",
        "9": "solid",
        "10": "finished_area",
        "9320": "nine9320",
        "oven": "oven",
        "furnace": "oven",
        "gn_standard_oven": "oven",
        "lock": "locking",
        "locking": "locking",
        "locking_mechanism": "locking",
        "quick": "quick_change",
        "quickchange": "quick_change",
        "quick_carrier_exchange": "quick_change",
        "quick_change": "quick_change",
        "centrifuge": "centrifuge",
        "centri": "centrifuge",
        "vacuum": "vacuum_oven",
        "voven": "vacuum_oven",
        "vacuum_oven": "vacuum_oven",
        "nine9320": "nine9320",
        "prcxi": "nine9320",
        "tube": "tube",
        "tubeh": "tube",
        "stack": "stack",
        "rotary_stack": "stack",
        "solid": "solid",
        "balance": "solid",
        "solid_weighing": "solid",
        "finished": "finished_area",
        "finished_area": "finished_area",
        "finished_product_area": "finished_area",
        "product": "finished_area"
       }
      },
      "target": {
       "type": "enum",
       "meta": {
        "key": "target",
        "label": "终点工站",
        "options": {
         "oven": "常规烘箱",
         "locking": "锁紧",
         "quick_change": "快换",
         "centrifuge": "离心机",
         "vacuum_oven": "真空烘箱",
         "nine9320": "9320",
         "tube": "离心管液体处理",
         "stack": "堆栈",
         "solid": "固体加样",
         "finished_area": "成品放置位"
        }
       },
       "options": [
        "oven",
        "locking",
        "quick_change",
        "centrifuge",
        "vacuum_oven",
        "nine9320",
        "tube",
        "stack",
        "solid",
        "finished_area"
       ],
       "alias": {
        "1": "oven",
        "2": "locking",
        "3": "quick_change",
        "4": "centrifuge",
        "5": "vacuum_oven",
        "6": "nine9320",
        "7": "tube",
        "8": "stack",
        "9": "solid",
        "10": "finished_area",
        "9320": "nine9320",
        "oven": "oven",
        "furnace": "oven",
        "gn_standard_oven": "oven",
        "lock": "locking",
        "locking": "locking",
        "locking_mechanism": "locking",
        "quick": "quick_change",
        "quickchange": "quick_change",
        "quick_carrier_exchange": "quick_change",
        "quick_change": "quick_change",
        "centrifuge": "centrifuge",
        "centri": "centrifuge",
        "vacuum": "vacuum_oven",
        "voven": "vacuum_oven",
        "vacuum_oven": "vacuum_oven",
        "nine9320": "nine9320",
        "prcxi": "nine9320",
        "tube": "tube",
        "tubeh": "tube",
        "stack": "stack",
        "rotary_stack": "stack",
        "solid": "solid",
        "balance": "solid",
        "solid_weighing": "solid",
        "finished": "finished_area",
        "finished_area": "finished_area",
        "finished_product_area": "finished_area",
        "product": "finished_area"
       }
      },
      "item_type": {
       "type": "enum",
       "default": "plate",
       "meta": {
        "key": "item_type",
        "label": "物料类型",
        "rw": "—",
        "desc": "搬运对象类型，用于选夹爪/吸盘",
        "options": {
         "plate": "孔板",
         "bottle": "瓶"
        }
       },
       "desc": "搬运对象类型，用于选夹爪/吸盘",
       "options": [
        "plate",
        "bottle"
       ]
      },
      "source_number": {
       "type": "int",
       "default": 1,
       "meta": {
        "key": "source_number",
        "label": "source_number"
       }
      },
      "target_number": {
       "type": "int",
       "default": 1,
       "meta": {
        "key": "target_number",
        "label": "target_number"
       }
      },
      "x_speed": {
       "type": "int",
       "default": 300,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "move_to_station",
     "label": "平移到工站",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "station": {
       "type": "enum",
       "options": [
        "oven",
        "locking",
        "quick_change",
        "centrifuge",
        "vacuum_oven",
        "nine9320",
        "tube",
        "stack",
        "solid",
        "finished_area"
       ],
       "meta": {
        "key": "station",
        "label": "目标工站",
        "unit": "1~10",
        "rw": "W",
        "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
        "options": {
         "oven": "常规烘箱",
         "locking": "锁紧",
         "quick_change": "快换",
         "centrifuge": "离心机",
         "vacuum_oven": "真空烘箱",
         "nine9320": "9320",
         "tube": "离心管液体处理",
         "stack": "堆栈",
         "solid": "固体加样",
         "finished_area": "成品放置位"
        }
       },
       "unit": "1~10",
       "desc": "Robot_ModuleNoSet。1=常规烘箱 2=锁紧 3=快换 4=离心机 5=真空烘箱 6=9320 7=离心管液体处理 8=堆栈 9=固体加样 10=成品放置位；与「设备从左到右依次排列」一致",
       "alias": {
        "1": "oven",
        "2": "locking",
        "3": "quick_change",
        "4": "centrifuge",
        "5": "vacuum_oven",
        "6": "nine9320",
        "7": "tube",
        "8": "stack",
        "9": "solid",
        "10": "finished_area",
        "9320": "nine9320",
        "oven": "oven",
        "furnace": "oven",
        "gn_standard_oven": "oven",
        "lock": "locking",
        "locking": "locking",
        "locking_mechanism": "locking",
        "quick": "quick_change",
        "quickchange": "quick_change",
        "quick_carrier_exchange": "quick_change",
        "quick_change": "quick_change",
        "centrifuge": "centrifuge",
        "centri": "centrifuge",
        "vacuum": "vacuum_oven",
        "voven": "vacuum_oven",
        "vacuum_oven": "vacuum_oven",
        "nine9320": "nine9320",
        "prcxi": "nine9320",
        "tube": "tube",
        "tubeh": "tube",
        "stack": "stack",
        "rotary_stack": "stack",
        "solid": "solid",
        "balance": "solid",
        "solid_weighing": "solid",
        "finished": "finished_area",
        "finished_area": "finished_area",
        "finished_product_area": "finished_area",
        "product": "finished_area"
       }
      },
      "item_type": {
       "type": "enum",
       "default": "plate",
       "meta": {
        "key": "item_type",
        "label": "物料类型",
        "rw": "—",
        "desc": "搬运对象类型，用于选夹爪/吸盘",
        "options": {
         "plate": "孔板",
         "bottle": "瓶"
        }
       },
       "desc": "搬运对象类型，用于选夹爪/吸盘",
       "options": [
        "plate",
        "bottle"
       ]
      },
      "x_speed": {
       "type": "int",
       "default": 300,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "enable",
     "label": "机械臂使能",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "number",
       "default": 60,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "disable",
     "label": "机械臂失能",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "number",
       "default": 60,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "go_home",
     "label": "机械臂回零",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "reset",
     "label": "机械臂复位",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "number",
       "default": 120,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "stop",
     "label": "机械臂停止",
     "inRealWorkflow": false,
     "count": 0,
     "params": {}
    }
   ],
   "points": [
    {
     "name": "X位置反馈",
     "node": "Robot_XPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Robot_FinishFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "机器人反馈错误代码",
     "node": "Robot_Error_code",
     "dtype": "Int16",
     "rw": "R",
     "desc": "机器人反馈报错代码"
    },
    {
     "name": "X运行位置",
     "node": "Robot_XPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "X速度",
     "node": "Robot_XSpeedSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "机械手模块号(每个工站对应不同动作)",
     "node": "Robot_ModuleNoSet",
     "dtype": "Int16",
     "rw": "W",
     "desc": "设备从左到右依次排列（常规烘箱1、锁紧2、快换3、离心机4、真空烘箱5，9320设备6，离心管液体处理7，堆栈8，固体加样9，成品放置位10）"
    },
    {
     "name": "机械手在烘箱的运行动作",
     "node": "Robot_Oven",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在紧缩结构的运行动作",
     "node": "Robot_Locking_mechanism",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在快换结构的运行动作",
     "node": "Robot_Quick_change_mechanism",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在离心机的运行动作",
     "node": "Robot_Centrifuge",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作是离心机前面天平的动作"
    },
    {
     "name": "机械手在真空烘箱的运行动作",
     "node": "Robot_Vacuum_oven",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在9320的运行动作",
     "node": "Robot_9320",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在离心管液体处理的运行动作",
     "node": "Robot_Centrifuge_tube_liquid_handling",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在堆栈的运行动作",
     "node": "Robot_Stack",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在固体加样的运行动作",
     "node": "Robot_Add_solid_sample",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "机械手在成品放置区的运行动作",
     "node": "Robot_Finished_Product_Area",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1指第一个动作，2指第二个动作，以此类推"
    },
    {
     "name": "指令类型",
     "node": "Robot_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Robot_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "紧急停止状态",
     "node": "Robot_Emergency_stop_condition",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1的时候是紧急停止状态"
    },
    {
     "name": "保护性停止",
     "node": "Robot_Protective_stop_status",
     "dtype": "Int16",
     "rw": "W",
     "desc": "1的时候是保护性停止状态"
    },
    {
     "name": "夹爪位置",
     "node": "Robot_jiazhuaweizhi",
     "dtype": "Int16",
     "rw": "W",
     "desc": "夹爪位置"
    },
    {
     "name": "机器人运行状态",
     "node": "Robot_Operating_status",
     "dtype": "Int16",
     "rw": "W",
     "desc": "3程序没有运行，2 程序中止， 1程序运行"
    }
   ],
   "pointStats": {
    "total": 22,
    "r": 3,
    "w": 19
   },
   "protocolNodes": 22
  },
  {
   "id": "gn_solid_weighing",
   "label": "固体加样",
   "protocol": "Solid_",
   "desc": "固体加样：X/Y 走位 + 料筒 Z + 夹爪 + 开关门 + 天枰去皮称重 + 加料",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "X向左",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "X向右",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "Y向里",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 4,
     "label": "Y向外",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 5,
     "label": "夹爪Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 6,
     "label": "夹爪Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 7,
     "label": "D开门",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 8,
     "label": "D关门",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 9,
     "label": "取料筒时Y轴向里",
     "inRealWorkflow": true,
     "count": 32,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 10,
     "label": "取料筒时Y轴向外",
     "inRealWorkflow": true,
     "count": 25,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 11,
     "label": "加料",
     "inRealWorkflow": true,
     "count": 57,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 12,
     "label": "夹爪夹料",
     "inRealWorkflow": true,
     "count": 12,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 13,
     "label": "夹爪放料",
     "inRealWorkflow": true,
     "count": 12,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 14,
     "label": "天枰去皮",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 15,
     "label": "天枰称重",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 16,
     "label": "料筒Z向上",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 17,
     "label": "料筒Z向下",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 18,
     "label": "放料筒时Y轴向里",
     "inRealWorkflow": true,
     "count": 25,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 19,
     "label": "放料筒时Y轴向外",
     "inRealWorkflow": true,
     "count": 32,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 20,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 8,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 21,
     "label": "夹爪夹紧",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 22,
     "label": "夹爪松开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 23,
     "label": "xyz回原点",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 24,
     "label": "静电消除开",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": true,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 25,
     "label": "静电消除关",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": true,
     "params": {
      "x_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_pos",
        "label": "X 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_XPosSet。回原点/复位时为 0"
       },
       "unit": "脉冲",
       "desc": "对应 *_XPosSet。回原点/复位时为 0"
      },
      "y_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_pos",
        "label": "Y 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "对应 *_YPosSet"
       },
       "unit": "脉冲",
       "desc": "对应 *_YPosSet"
      },
      "material_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_pos",
        "label": "料筒 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样料筒升降位置（取桶/放桶高度）"
       },
       "unit": "脉冲",
       "desc": "固体加样料筒升降位置（取桶/放桶高度）"
      },
      "gripper_z_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_pos",
        "label": "夹爪 Z 运行位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样夹爪升降位置"
       },
       "unit": "脉冲",
       "desc": "固体加样夹爪升降位置"
      },
      "door_pos": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_pos",
        "label": "门开关位置",
        "unit": "脉冲",
        "rw": "W",
        "desc": "固体加样 D 门开闭目标位置"
       },
       "unit": "脉冲",
       "desc": "固体加样 D 门开闭目标位置"
      },
      "volune_weight": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "volune_weight",
        "label": "加样量",
        "unit": "0.1mg",
        "rw": "W",
        "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
       },
       "unit": "0.1mg",
       "desc": "对应 Solid_VoluneWeightSet（协议原拼写）。值=质量×10"
      },
      "x_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "x_speed",
        "label": "X 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "y_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "y_speed",
        "label": "Y 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "material_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "material_z_speed",
        "label": "料筒 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "gripper_z_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "gripper_z_speed",
        "label": "夹爪 Z 速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "door_speed": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "door_speed",
        "label": "D 门速度",
        "unit": "脉冲/s",
        "rw": "W",
        "desc": "0 = 使用设备默认速度"
       },
       "unit": "脉冲/s",
       "desc": "0 = 使用设备默认速度"
      },
      "remove_static": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "remove_static",
        "label": "静电消除",
        "rw": "W",
        "desc": "对应「静电消除开/关」子动作，1=启用"
       },
       "desc": "对应「静电消除开/关」子动作，1=启用"
      },
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "X位置反馈",
     "node": "Solid_XPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "Y位置反馈",
     "node": "Solid_YPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "料筒Z位置反馈",
     "node": "Solid_MaterialZPosFB",
     "dtype": "Int32",
     "rw": "R"
    },
    {
     "name": "夹爪Z位置反馈",
     "node": "Solid_GripperZPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "开关门位置反馈",
     "node": "Solid_DoorPosFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "天枰重量反馈",
     "node": "Solid_WeightFB",
     "dtype": "Int32",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Solid_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "X运行位置",
     "node": "Solid_XPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y运行位置",
     "node": "Solid_YPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "料筒Z运行位置",
     "node": "Solid_MaterialZPosSet",
     "dtype": "Int32",
     "rw": "W"
    },
    {
     "name": "加样量",
     "node": "Solid_VoluneWeightSet",
     "dtype": "Int32",
     "rw": "W"
    },
    {
     "name": "夹爪Z运行位置",
     "node": "Solid_GripperZPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "门开关位置",
     "node": "Solid_DoorPosSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "X速度",
     "node": "Solid_XSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "Y速度",
     "node": "Solid_YSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "料筒Z速度",
     "node": "Solid_MaterialZSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "夹爪Z速度",
     "node": "Solid_GripperZSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "D速度",
     "node": "Solid_DoorSpeed",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Solid_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Solid_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 20,
    "r": 7,
    "w": 13
   },
   "protocolNodes": 20
  },
  {
   "id": "gn_standard_oven",
   "label": "常规烘箱",
   "protocol": "Oven_",
   "desc": "常规烘箱：启动加热 / 复位停止 / 开门关门（独立 bool 节点）",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "启动",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "hours": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "hours",
        "label": "运行时间",
        "unit": "h",
        "rw": "W",
        "desc": "对应 Oven_TimeHourSet"
       },
       "unit": "h",
       "desc": "对应 Oven_TimeHourSet"
      },
      "minutes": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "复位/停止",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "hours": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "hours",
        "label": "运行时间",
        "unit": "h",
        "rw": "W",
        "desc": "对应 Oven_TimeHourSet"
       },
       "unit": "h",
       "desc": "对应 Oven_TimeHourSet"
      },
      "minutes": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "温度反馈",
     "node": "Oven_TempFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "Oven_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "运行温度设置",
     "node": "Oven_TempSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置(小时)",
     "node": "Oven_TimeHourSet",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置(分钟)",
     "node": "Oven_TimeMinuteSet"
    },
    {
     "name": "指令类型",
     "node": "Oven_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Oven_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行状态",
     "node": "Oven_Running_Status",
     "dtype": "Int16",
     "rw": "w",
     "desc": "读取烘箱状态1运行，0 停止"
    },
    {
     "name": "烘箱开门",
     "node": "OPEN_DOOR",
     "dtype": "bool",
     "desc": "1开门"
    },
    {
     "name": "烘箱关门",
     "node": "COHSE_DOOR",
     "dtype": "bool",
     "desc": "1关门"
    }
   ],
   "pointStats": {
    "total": 10,
    "r": 2,
    "w": 5
   },
   "protocolNodes": 10
  },
  {
   "id": "gn_vacuum_oven",
   "label": "真空烘箱",
   "protocol": "VacuumOven_",
   "desc": "真空烘箱：6 组温度/时间/真空上下限 + 启动 / 复位 / 开闭门",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "启动",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "temperature_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_1",
        "label": "运行温度设置 1",
        "unit": "℃",
        "rw": "W",
        "desc": "真空烘箱第 1 组温度（1~6 组独立）"
       },
       "unit": "℃",
       "desc": "真空烘箱第 1 组温度（1~6 组独立）"
      },
      "minutes_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_1",
        "label": "运行时间设置 1",
        "unit": "min",
        "rw": "W",
        "desc": "真空烘箱第 1 组时间（1~6 组独立）"
       },
       "unit": "min",
       "desc": "真空烘箱第 1 组时间（1~6 组独立）"
      },
      "vacuum_high_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_1",
        "label": "真空控制上限",
        "rw": "W",
        "desc": "第 1 组真空度上限"
       },
       "desc": "第 1 组真空度上限"
      },
      "vacuum_low_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_1",
        "label": "真空控制下限",
        "rw": "W",
        "desc": "第 1 组真空度下限"
       },
       "desc": "第 1 组真空度下限"
      },
      "temperature_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_2",
        "label": "temperature_2"
       }
      },
      "minutes_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_2",
        "label": "minutes_2"
       }
      },
      "vacuum_high_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_2",
        "label": "vacuum_high_2"
       }
      },
      "vacuum_low_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_2",
        "label": "vacuum_low_2"
       }
      },
      "temperature_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_3",
        "label": "temperature_3"
       }
      },
      "minutes_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_3",
        "label": "minutes_3"
       }
      },
      "vacuum_high_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_3",
        "label": "vacuum_high_3"
       }
      },
      "vacuum_low_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_3",
        "label": "vacuum_low_3"
       }
      },
      "temperature_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_4",
        "label": "temperature_4"
       }
      },
      "minutes_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_4",
        "label": "minutes_4"
       }
      },
      "vacuum_high_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_4",
        "label": "vacuum_high_4"
       }
      },
      "vacuum_low_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_4",
        "label": "vacuum_low_4"
       }
      },
      "temperature_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_5",
        "label": "temperature_5"
       }
      },
      "minutes_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_5",
        "label": "minutes_5"
       }
      },
      "vacuum_high_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_5",
        "label": "vacuum_high_5"
       }
      },
      "vacuum_low_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_5",
        "label": "vacuum_low_5"
       }
      },
      "temperature_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_6",
        "label": "temperature_6"
       }
      },
      "minutes_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_6",
        "label": "minutes_6"
       }
      },
      "vacuum_high_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_6",
        "label": "vacuum_high_6"
       }
      },
      "vacuum_low_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_6",
        "label": "vacuum_low_6"
       }
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      },
      "segment": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "segment",
        "label": "segment"
       }
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "vacuum_high": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high",
        "label": "vacuum_high"
       }
      },
      "vacuum_low": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low",
        "label": "vacuum_low"
       }
      }
     }
    },
    {
     "cmdType": 2,
     "label": "复位",
     "inRealWorkflow": true,
     "count": 1,
     "legacy": false,
     "params": {
      "temperature_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_1",
        "label": "运行温度设置 1",
        "unit": "℃",
        "rw": "W",
        "desc": "真空烘箱第 1 组温度（1~6 组独立）"
       },
       "unit": "℃",
       "desc": "真空烘箱第 1 组温度（1~6 组独立）"
      },
      "minutes_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_1",
        "label": "运行时间设置 1",
        "unit": "min",
        "rw": "W",
        "desc": "真空烘箱第 1 组时间（1~6 组独立）"
       },
       "unit": "min",
       "desc": "真空烘箱第 1 组时间（1~6 组独立）"
      },
      "vacuum_high_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_1",
        "label": "真空控制上限",
        "rw": "W",
        "desc": "第 1 组真空度上限"
       },
       "desc": "第 1 组真空度上限"
      },
      "vacuum_low_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_1",
        "label": "真空控制下限",
        "rw": "W",
        "desc": "第 1 组真空度下限"
       },
       "desc": "第 1 组真空度下限"
      },
      "temperature_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_2",
        "label": "temperature_2"
       }
      },
      "minutes_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_2",
        "label": "minutes_2"
       }
      },
      "vacuum_high_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_2",
        "label": "vacuum_high_2"
       }
      },
      "vacuum_low_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_2",
        "label": "vacuum_low_2"
       }
      },
      "temperature_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_3",
        "label": "temperature_3"
       }
      },
      "minutes_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_3",
        "label": "minutes_3"
       }
      },
      "vacuum_high_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_3",
        "label": "vacuum_high_3"
       }
      },
      "vacuum_low_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_3",
        "label": "vacuum_low_3"
       }
      },
      "temperature_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_4",
        "label": "temperature_4"
       }
      },
      "minutes_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_4",
        "label": "minutes_4"
       }
      },
      "vacuum_high_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_4",
        "label": "vacuum_high_4"
       }
      },
      "vacuum_low_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_4",
        "label": "vacuum_low_4"
       }
      },
      "temperature_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_5",
        "label": "temperature_5"
       }
      },
      "minutes_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_5",
        "label": "minutes_5"
       }
      },
      "vacuum_high_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_5",
        "label": "vacuum_high_5"
       }
      },
      "vacuum_low_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_5",
        "label": "vacuum_low_5"
       }
      },
      "temperature_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_6",
        "label": "temperature_6"
       }
      },
      "minutes_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_6",
        "label": "minutes_6"
       }
      },
      "vacuum_high_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_6",
        "label": "vacuum_high_6"
       }
      },
      "vacuum_low_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_6",
        "label": "vacuum_low_6"
       }
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      },
      "segment": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "segment",
        "label": "segment"
       }
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "vacuum_high": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high",
        "label": "vacuum_high"
       }
      },
      "vacuum_low": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low",
        "label": "vacuum_low"
       }
      }
     }
    },
    {
     "cmdType": 100,
     "label": "开门",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "temperature_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_1",
        "label": "运行温度设置 1",
        "unit": "℃",
        "rw": "W",
        "desc": "真空烘箱第 1 组温度（1~6 组独立）"
       },
       "unit": "℃",
       "desc": "真空烘箱第 1 组温度（1~6 组独立）"
      },
      "minutes_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_1",
        "label": "运行时间设置 1",
        "unit": "min",
        "rw": "W",
        "desc": "真空烘箱第 1 组时间（1~6 组独立）"
       },
       "unit": "min",
       "desc": "真空烘箱第 1 组时间（1~6 组独立）"
      },
      "vacuum_high_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_1",
        "label": "真空控制上限",
        "rw": "W",
        "desc": "第 1 组真空度上限"
       },
       "desc": "第 1 组真空度上限"
      },
      "vacuum_low_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_1",
        "label": "真空控制下限",
        "rw": "W",
        "desc": "第 1 组真空度下限"
       },
       "desc": "第 1 组真空度下限"
      },
      "temperature_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_2",
        "label": "temperature_2"
       }
      },
      "minutes_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_2",
        "label": "minutes_2"
       }
      },
      "vacuum_high_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_2",
        "label": "vacuum_high_2"
       }
      },
      "vacuum_low_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_2",
        "label": "vacuum_low_2"
       }
      },
      "temperature_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_3",
        "label": "temperature_3"
       }
      },
      "minutes_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_3",
        "label": "minutes_3"
       }
      },
      "vacuum_high_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_3",
        "label": "vacuum_high_3"
       }
      },
      "vacuum_low_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_3",
        "label": "vacuum_low_3"
       }
      },
      "temperature_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_4",
        "label": "temperature_4"
       }
      },
      "minutes_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_4",
        "label": "minutes_4"
       }
      },
      "vacuum_high_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_4",
        "label": "vacuum_high_4"
       }
      },
      "vacuum_low_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_4",
        "label": "vacuum_low_4"
       }
      },
      "temperature_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_5",
        "label": "temperature_5"
       }
      },
      "minutes_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_5",
        "label": "minutes_5"
       }
      },
      "vacuum_high_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_5",
        "label": "vacuum_high_5"
       }
      },
      "vacuum_low_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_5",
        "label": "vacuum_low_5"
       }
      },
      "temperature_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_6",
        "label": "temperature_6"
       }
      },
      "minutes_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_6",
        "label": "minutes_6"
       }
      },
      "vacuum_high_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_6",
        "label": "vacuum_high_6"
       }
      },
      "vacuum_low_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_6",
        "label": "vacuum_low_6"
       }
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      },
      "segment": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "segment",
        "label": "segment"
       }
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "vacuum_high": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high",
        "label": "vacuum_high"
       }
      },
      "vacuum_low": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low",
        "label": "vacuum_low"
       }
      }
     }
    },
    {
     "cmdType": 101,
     "label": "关门",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "temperature_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_1",
        "label": "运行温度设置 1",
        "unit": "℃",
        "rw": "W",
        "desc": "真空烘箱第 1 组温度（1~6 组独立）"
       },
       "unit": "℃",
       "desc": "真空烘箱第 1 组温度（1~6 组独立）"
      },
      "minutes_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_1",
        "label": "运行时间设置 1",
        "unit": "min",
        "rw": "W",
        "desc": "真空烘箱第 1 组时间（1~6 组独立）"
       },
       "unit": "min",
       "desc": "真空烘箱第 1 组时间（1~6 组独立）"
      },
      "vacuum_high_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_1",
        "label": "真空控制上限",
        "rw": "W",
        "desc": "第 1 组真空度上限"
       },
       "desc": "第 1 组真空度上限"
      },
      "vacuum_low_1": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_1",
        "label": "真空控制下限",
        "rw": "W",
        "desc": "第 1 组真空度下限"
       },
       "desc": "第 1 组真空度下限"
      },
      "temperature_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_2",
        "label": "temperature_2"
       }
      },
      "minutes_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_2",
        "label": "minutes_2"
       }
      },
      "vacuum_high_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_2",
        "label": "vacuum_high_2"
       }
      },
      "vacuum_low_2": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_2",
        "label": "vacuum_low_2"
       }
      },
      "temperature_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_3",
        "label": "temperature_3"
       }
      },
      "minutes_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_3",
        "label": "minutes_3"
       }
      },
      "vacuum_high_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_3",
        "label": "vacuum_high_3"
       }
      },
      "vacuum_low_3": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_3",
        "label": "vacuum_low_3"
       }
      },
      "temperature_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_4",
        "label": "temperature_4"
       }
      },
      "minutes_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_4",
        "label": "minutes_4"
       }
      },
      "vacuum_high_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_4",
        "label": "vacuum_high_4"
       }
      },
      "vacuum_low_4": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_4",
        "label": "vacuum_low_4"
       }
      },
      "temperature_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_5",
        "label": "temperature_5"
       }
      },
      "minutes_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_5",
        "label": "minutes_5"
       }
      },
      "vacuum_high_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_5",
        "label": "vacuum_high_5"
       }
      },
      "vacuum_low_5": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_5",
        "label": "vacuum_low_5"
       }
      },
      "temperature_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature_6",
        "label": "temperature_6"
       }
      },
      "minutes_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes_6",
        "label": "minutes_6"
       }
      },
      "vacuum_high_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high_6",
        "label": "vacuum_high_6"
       }
      },
      "vacuum_low_6": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low_6",
        "label": "vacuum_low_6"
       }
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      },
      "segment": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "segment",
        "label": "segment"
       }
      },
      "temperature": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "minutes": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "minutes",
        "label": "运行时间",
        "unit": "min",
        "rw": "W",
        "desc": "对应 Oven_TimeMinuteSet"
       },
       "unit": "min",
       "desc": "对应 Oven_TimeMinuteSet"
      },
      "vacuum_high": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_high",
        "label": "vacuum_high"
       }
      },
      "vacuum_low": {
       "type": "int",
       "optional": true,
       "meta": {
        "key": "vacuum_low",
        "label": "vacuum_low"
       }
      }
     }
    }
   ],
   "points": [
    {
     "name": "温度反馈",
     "node": "VacuumOven_TempFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "时间反馈",
     "node": "VacuumOven_TimeFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "真空度反馈",
     "node": "VacuumOven_PressureFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "完成反馈",
     "node": "VacuumOven_CompleteFB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "运行温度设置1",
     "node": "VacuumOven_TempSet_1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置1",
     "node": "VacuumOven_TimeSet_1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限1",
     "node": "VacuumOven_VacuumHigh_1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限1",
     "node": "VacuumOven_VacuumLow_1",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行温度设置2",
     "node": "VacuumOven_TempSet_2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置2",
     "node": "VacuumOven_TimeSet_2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限2",
     "node": "VacuumOven_VacuumHigh_2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限2",
     "node": "VacuumOven_VacuumLow_2",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行温度设置3",
     "node": "VacuumOven_TempSet_3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置3",
     "node": "VacuumOven_TimeSet_3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限3",
     "node": "VacuumOven_VacuumHigh_3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限3",
     "node": "VacuumOven_VacuumLow_3",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行温度设置4",
     "node": "VacuumOven_TempSet_4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置4",
     "node": "VacuumOven_TimeSet_4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限4",
     "node": "VacuumOven_VacuumHigh_4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限4",
     "node": "VacuumOven_VacuumLow_4",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行温度设置5",
     "node": "VacuumOven_TempSet_5",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置5",
     "node": "VacuumOven_TimeSet_5",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限5",
     "node": "VacuumOven_VacuumHigh_5",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限5",
     "node": "VacuumOven_VacuumLow_5",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行温度设置6",
     "node": "VacuumOven_TempSet_6",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "运行时间设置6",
     "node": "VacuumOven_TimeSet_6",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制上限6",
     "node": "VacuumOven_VacuumHigh_6",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空控制下限6",
     "node": "VacuumOven_VacuumLow_6",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "真空烘箱停止",
     "node": "VacuumOven_STOP",
     "dtype": "Int16",
     "rw": "W",
     "desc": "为1时停止"
    },
    {
     "name": "指令类型",
     "node": "VacuumOven_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "VacuumOven_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 31,
    "r": 4,
    "w": 27
   },
   "protocolNodes": 31
  },
  {
   "id": "gn_liquid_cooling",
   "label": "液冷模块",
   "protocol": "Liquid_Cooling_",
   "desc": "七个液冷模块（9320×2 + 离心管×5）：温度设置 / 开启 / 关闭",
   "kind": "cmd",
   "actions": [
    {
     "cmdType": 1,
     "label": "温度设置",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "temperature": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 2,
     "label": "液冷模块开启",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "temperature": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "cmdType": 3,
     "label": "液冷模块关闭",
     "inRealWorkflow": false,
     "count": 0,
     "legacy": false,
     "params": {
      "temperature": {
       "type": "number",
       "optional": true,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      },
      "wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "wait",
        "label": "等待程序完成",
        "rw": "—",
        "desc": "1=下位机执行完成后才放行下一节点"
       },
       "desc": "1=下位机执行完成后才放行下一节点"
      },
      "timeout": {
       "type": "number",
       "optional": true,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "9320液冷模块1温度反馈",
     "node": "Liquid_Cooling_9320_1_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "9320液冷模块2温度反馈",
     "node": "Liquid_Cooling_9320_2_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "离心管液体处理模块1温度反馈",
     "node": "Liquid_Cooling_CentrifugeTube_1_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "离心管液体处理模块2温度反馈",
     "node": "Liquid_Cooling_CentrifugeTube_2_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "离心管液体处理模块3温度反馈",
     "node": "Liquid_Cooling_CentrifugeTube_3_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "离心管液体处理模块4温度反馈",
     "node": "Liquid_Cooling_CentrifugeTube_4_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "离心管液体处理模块5温度反馈",
     "node": "Liquid_Cooling_CentrifugeTube_5_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "液冷模块开关完成反馈",
     "node": "Liquid_Cooling_Complete_FB",
     "dtype": "Int16",
     "rw": "R"
    },
    {
     "name": "9320液冷模块1温度设置",
     "node": "Liquid_Cooling_9320_Temperature_1_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "9320液冷模块2温度设置",
     "node": "Liquid_Cooling_9320_Temperature_2_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心管液体处理模块1温度设置",
     "node": "Liquid_Cooling_CentrifugeTube_Temperature_1_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心管液体处理模块2温度设置",
     "node": "Liquid_Cooling_CentrifugeTube_Temperature_2_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心管液体处理模块3温度设置",
     "node": "Liquid_Cooling_CentrifugeTube_Temperature_3_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心管液体处理模块4温度设置",
     "node": "Liquid_Cooling_CentrifugeTube_Temperature_4_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "离心管液体处理模块5温度设置",
     "node": "Liquid_Cooling_CentrifugeTube_Temperature_5_SET",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令类型",
     "node": "Cooling_CmdType",
     "dtype": "Int16",
     "rw": "W"
    },
    {
     "name": "指令触发",
     "node": "Cooling_CmdTrig",
     "dtype": "Int16",
     "rw": "W"
    }
   ],
   "pointStats": {
    "total": 17,
    "r": 8,
    "w": 9
   },
   "protocolNodes": 17
  },
  {
   "id": "system",
   "label": "系统总控",
   "protocol": "System_",
   "desc": "系统总控：总复位 / 停止 / 上电初始化就绪 / 报错输出",
   "kind": "name",
   "actions": [
    {
     "name": "reset",
     "label": "系统总复位",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "number",
       "default": 180,
       "min": 1,
       "max": 3600,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    },
    {
     "name": "stop",
     "label": "系统停止",
     "inRealWorkflow": false,
     "count": 0,
     "params": {}
    },
    {
     "name": "error_alarm",
     "label": "报错输出(蜂鸣器+红灯)",
     "inRealWorkflow": false,
     "count": 0,
     "params": {
      "timeout": {
       "type": "int",
       "min": 1,
       "max": 3600,
       "default": 120,
       "meta": {
        "key": "timeout",
        "label": "动作超时",
        "unit": "s",
        "rw": "—",
        "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
       },
       "unit": "s",
       "desc": "上位机侧等待本节点完成的超时上限；超时判失败"
      }
     }
    }
   ],
   "points": [
    {
     "name": "复位完成反馈",
     "node": "System_ResetCompleteFB",
     "dtype": "Int16",
     "rw": "R",
     "group": "总复位"
    },
    {
     "name": "复位触发",
     "node": "System_ResetTrig",
     "dtype": "Int16",
     "rw": "W",
     "group": "总复位"
    },
    {
     "name": "设备上电初始化完成",
     "node": "System_IsReady",
     "dtype": "Int16",
     "rw": "R",
     "desc": "设备上电后自动初始化，为1时可发送指令，为0时代表机械手上电回原点故障",
     "group": "总复位"
    },
    {
     "name": "停止触发",
     "node": "System_StopTrig",
     "dtype": "Int16",
     "rw": "W",
     "group": "停止"
    },
    {
     "name": "设备报错错发蜂鸣器和红灯",
     "node": "Device_error",
     "dtype": "Int16",
     "rw": "W",
     "group": "报错信息"
    }
   ],
   "pointStats": {
    "total": 5,
    "r": 2,
    "w": 3
   },
   "protocolNodes": 5
  },
  {
   "id": "PRCXI",
   "label": "移液工作站",
   "protocol": "Liquid_",
   "desc": "移液工作站：移液 / 协议创建运行 / 板搬运",
   "kind": "name",
   "actions": [
    {
     "name": "transfer_liquid",
     "label": "移液",
     "inRealWorkflow": true,
     "count": 119,
     "params": {
      "delays": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "delays",
        "label": "分段延时",
        "unit": "s",
        "desc": "分段动作间的等待时间（JSON 数组）"
       },
       "unit": "s",
       "desc": "分段动作间的等待时间（JSON 数组）"
      },
      "spread": {
       "type": "string",
       "default": "wide",
       "meta": {
        "key": "spread",
        "label": "液面扩散模式",
        "desc": "枪头在液面中的扩散方式"
       },
       "desc": "枪头在液面中的扩散方式"
      },
      "offsets": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "offsets",
        "label": "位置偏移",
        "unit": "mm",
        "desc": "孔位位置偏移（JSON 数组）"
       },
       "unit": "mm",
       "desc": "孔位位置偏移（JSON 数组）"
      },
      "sources": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_96_DeepWell_3\", \"name\": \"PRCXI_96_DeepWell_3\", \"uuid\": \"f260b8ba-a629-42ea-8340-548d765b4479\"}]",
       "meta": {
        "key": "sources",
        "label": "源板位",
        "desc": "吸取液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）"
       },
       "desc": "吸取液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）",
       "deck": true,
       "role": "source",
       "roleLabel": "来源 source",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      },
      "targets": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_96_DeepWell5\", \"name\": \"PRCXI_96_DeepWell5\", \"uuid\": \"e74c153c-a29f-4653-a665-b9e1cc1711a9\"}]",
       "meta": {
        "key": "targets",
        "label": "目标板位",
        "desc": "排出液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）"
       },
       "desc": "排出液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）",
       "deck": true,
       "role": "target",
       "roleLabel": "目标 target",
       "value": "resource",
       "accept": [
        "deepWell",
        "reader",
        "trough",
        "transfer",
        "spare"
       ],
       "multi": true
      },
      "asp_vols": {
       "type": "json",
       "default": "[780]",
       "meta": {
        "key": "asp_vols",
        "label": "吸取体积",
        "unit": "µL",
        "desc": "每个源板位的吸取体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "每个源板位的吸取体积（JSON 数组）"
      },
      "dis_vols": {
       "type": "json",
       "default": "[780]",
       "meta": {
        "key": "dis_vols",
        "label": "排出体积",
        "unit": "µL",
        "desc": "每个目标板位的排出体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "每个目标板位的排出体积（JSON 数组）"
      },
      "mix_stage": {
       "type": "enum",
       "options": [
        "after",
        "none"
       ],
       "default": "none",
       "meta": {
        "key": "mix_stage",
        "label": "混匀时机",
        "desc": "混匀发生在吸排之前/之后（none=不混匀）"
       },
       "desc": "混匀发生在吸排之前/之后（none=不混匀）"
      },
      "none_keys": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "none_keys",
        "label": "忽略参数",
        "desc": "本次调用显式忽略的参数名（JSON 数组）"
       },
       "desc": "本次调用显式忽略的参数名（JSON 数组）"
      },
      "tip_racks": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_1250uL_Tips1\", \"name\": \"PRCXI_1250uL_Tips1\", \"uuid\": \"a2c7801f-bef0-4007-b650-73ad32f04778\"}]",
       "meta": {
        "key": "tip_racks",
        "label": "枪头盒板位",
        "desc": "装载枪头的枪头盒资源实例列表（JSON 数组）"
       },
       "desc": "装载枪头的枪头盒资源实例列表（JSON 数组）",
       "deck": true,
       "role": "tips",
       "roleLabel": "枪头 tips",
       "value": "resource",
       "accept": [
        "tip"
       ],
       "multi": true
      },
      "touch_tip": {
       "type": "bool",
       "default": false,
       "meta": {
        "key": "touch_tip",
        "label": "触壁",
        "desc": "排出后枪头触碰孔壁去除挂滴"
       },
       "desc": "排出后枪头触碰孔壁去除挂滴"
      },
      "is_96_well": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "is_96_well",
        "label": "96 孔板模式",
        "desc": "按 96 孔板（8×12）排布处理"
       },
       "desc": "按 96 孔板（8×12）排布处理"
      },
      "source_slots": {
       "type": "int",
       "min": 2,
       "max": 16,
       "default": 14,
       "meta": {
        "key": "source_slots",
        "label": "源板位数",
        "unit": "个",
        "desc": "源板位占用孔位数（2..16）"
       },
       "unit": "个",
       "desc": "源板位占用孔位数（2..16）"
      },
      "target_slots": {
       "type": "int",
       "min": 3,
       "max": 16,
       "default": 10,
       "meta": {
        "key": "target_slots",
        "label": "目标板位数",
        "unit": "个",
        "desc": "目标板位占用孔位数（3..16）"
       },
       "unit": "个",
       "desc": "目标板位占用孔位数（3..16）"
      },
      "use_channels": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "use_channels",
        "label": "使用通道",
        "desc": "使用的移液通道编号（JSON 数组，空=自动）"
       },
       "desc": "使用的移液通道编号（JSON 数组，空=自动）"
      },
      "liquid_height": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "liquid_height",
        "label": "液面高度",
        "unit": "mm",
        "desc": "按液面高度追踪吸液（JSON 数组）"
       },
       "unit": "mm",
       "desc": "按液面高度追踪吸液（JSON 数组）"
      },
      "asp_flow_rates": {
       "type": "json",
       "default": "[100]",
       "meta": {
        "key": "asp_flow_rates",
        "label": "吸取流速",
        "unit": "µL/s",
        "desc": "吸取流速（JSON 数组）"
       },
       "unit": "µL/s",
       "desc": "吸取流速（JSON 数组）"
      },
      "dis_flow_rates": {
       "type": "json",
       "default": "[100]",
       "meta": {
        "key": "dis_flow_rates",
        "label": "排出流速",
        "unit": "µL/s",
        "desc": "排出流速（JSON 数组）"
       },
       "unit": "µL/s",
       "desc": "排出流速（JSON 数组）"
      },
      "tip_rack_slots": {
       "type": "int",
       "min": 11,
       "max": 15,
       "default": 11,
       "meta": {
        "key": "tip_rack_slots",
        "label": "枪头盒板位数",
        "unit": "个",
        "desc": "枪头盒板位占用孔位数（11..15，即 10/11/12/15 号位）"
       },
       "unit": "个",
       "desc": "枪头盒板位占用孔位数（11..15，即 10/11/12/15 号位）"
      },
      "post_air_volume": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "post_air_volume",
        "label": "后置空气体积",
        "unit": "µL",
        "desc": "排液后追加的空气柱体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "排液后追加的空气柱体积（JSON 数组）"
      },
      "blow_out_air_volume": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "blow_out_air_volume",
        "label": "吹出空气体积",
        "unit": "µL",
        "desc": "吹出残液的空气体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "吹出残液的空气体积（JSON 数组）"
      },
      "blow_out_air_volume_before": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "blow_out_air_volume_before",
        "label": "前置吹出空气体积",
        "unit": "µL",
        "desc": "吸取前预吹的空气体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "吸取前预吹的空气体积（JSON 数组）"
      },
      "mix_vol": {
       "type": "number",
       "default": 0,
       "meta": {
        "key": "mix_vol",
        "label": "混匀体积",
        "unit": "µL",
        "desc": "混匀行程对应的体积"
       },
       "unit": "µL",
       "desc": "混匀行程对应的体积"
      },
      "mix_rate": {
       "type": "number",
       "default": 0,
       "meta": {
        "key": "mix_rate",
        "label": "混匀流速",
        "unit": "µL/s",
        "desc": "混匀吸排流速"
       },
       "unit": "µL/s",
       "desc": "混匀吸排流速"
      },
      "mix_times": {
       "type": "int",
       "default": 0,
       "meta": {
        "key": "mix_times",
        "label": "混匀次数",
        "unit": "次",
        "desc": "混匀反复次数"
       },
       "unit": "次",
       "desc": "混匀反复次数"
      },
      "dispensing_method": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "dispensing_method",
        "label": "排液方式",
        "desc": "贴壁排液方式（如 BottleNeck / DiveToBottom）"
       },
       "desc": "贴壁排液方式（如 BottleNeck / DiveToBottom）"
      },
      "mix_liquid_height": {
       "type": "number",
       "default": 0,
       "meta": {
        "key": "mix_liquid_height",
        "label": "混匀液面高度",
        "unit": "mm",
        "desc": "混匀时的液面高度"
       },
       "unit": "mm",
       "desc": "混匀时的液面高度"
      },
      "hover_below_liquid_level": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "hover_below_liquid_level",
        "label": "液面下悬停距离",
        "unit": "mm",
        "desc": "吸头在液面下方的悬停距离（JSON 数组）"
       },
       "unit": "mm",
       "desc": "吸头在液面下方的悬停距离（JSON 数组）"
      },
      "z_start_point_offset_height": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "z_start_point_offset_height",
        "label": "Z 起点偏移",
        "unit": "mm",
        "desc": "Z 轴起始点高度偏移（JSON 数组）"
       },
       "unit": "mm",
       "desc": "Z 轴起始点高度偏移（JSON 数组）"
      },
      "post_discharge_pause_time_ms": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "post_discharge_pause_time_ms",
        "label": "排液后停顿",
        "unit": "ms",
        "desc": "排出完成后停顿时间（JSON 数组）"
       },
       "unit": "ms",
       "desc": "排出完成后停顿时间（JSON 数组）"
      }
     },
     "deckRoles": [
      {
       "key": "source",
       "label": "来源 source",
       "param": "sources",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      },
      {
       "key": "target",
       "label": "目标 target",
       "param": "targets",
       "value": "resource",
       "accept": [
        "deepWell",
        "reader",
        "trough",
        "transfer",
        "spare"
       ],
       "multi": true
      },
      {
       "key": "tips",
       "label": "枪头 tips",
       "param": "tip_racks",
       "value": "resource",
       "accept": [
        "tip"
       ],
       "multi": true
      }
     ]
    },
    {
     "name": "auto-create_protocol",
     "label": "创建移液协议",
     "inRealWorkflow": true,
     "count": 106,
     "params": {
      "none_keys": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "none_keys",
        "label": "忽略参数",
        "desc": "本次调用显式忽略的参数名（JSON 数组）"
       },
       "desc": "本次调用显式忽略的参数名（JSON 数组）"
      },
      "protocol_date": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_date",
        "label": "方案日期",
        "desc": "协议日期（留空用默认）"
       },
       "desc": "协议日期（留空用默认）"
      },
      "protocol_name": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_name",
        "label": "方案名",
        "desc": "要登记的移液方案名称"
       },
       "desc": "要登记的移液方案名称"
      },
      "protocol_type": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_type",
        "label": "方案类型",
        "desc": "协议类型（留空用默认）"
       },
       "desc": "协议类型（留空用默认）"
      },
      "protocol_author": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_author",
        "label": "方案作者",
        "desc": "协议作者（留空用默认）"
       },
       "desc": "协议作者（留空用默认）"
      },
      "protocol_version": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_version",
        "label": "方案版本",
        "desc": "协议版本（留空用默认）"
       },
       "desc": "协议版本（留空用默认）"
      },
      "protocol_description": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "protocol_description",
        "label": "方案说明",
        "desc": "协议备注说明"
       },
       "desc": "协议备注说明"
      }
     }
    },
    {
     "name": "auto-run_protocol",
     "label": "运行移液协议",
     "inRealWorkflow": true,
     "count": 107,
     "params": {
      "protocol_id": {
       "type": "string",
       "default": false,
       "meta": {
        "key": "protocol_id",
        "label": "方案 ID",
        "desc": "要运行的移液方案 ID"
       },
       "desc": "要运行的移液方案 ID"
      }
     }
    },
    {
     "name": "move_plate",
     "label": "搬运孔板",
     "inRealWorkflow": true,
     "count": 101,
     "params": {
      "to": {
       "type": "int",
       "min": 1,
       "max": 16,
       "default": 15,
       "meta": {
        "key": "to",
        "label": "终点板位",
        "unit": "号",
        "desc": "搬运终点板位号（1..16；3/4 号位夹爪行程不覆盖）"
       },
       "unit": "号",
       "desc": "搬运终点板位号（1..16；3/4 号位夹爪行程不覆盖）",
       "deck": true,
       "role": "to",
       "roleLabel": "终点 to",
       "value": "slot",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": false
      },
      "from": {
       "type": "int",
       "min": 1,
       "max": 16,
       "default": 16,
       "meta": {
        "key": "from",
        "label": "起点板位",
        "unit": "号",
        "desc": "搬运起点板位号（1..16；3/4 号位夹爪行程不覆盖）"
       },
       "unit": "号",
       "desc": "搬运起点板位号（1..16；3/4 号位夹爪行程不覆盖）",
       "deck": true,
       "role": "from",
       "roleLabel": "起点 from",
       "value": "slot",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": false
      },
      "force": {
       "type": "int",
       "min": 1,
       "max": 5,
       "default": 5,
       "meta": {
        "key": "force",
        "label": "夹持力",
        "desc": "夹爪夹持力档位（1..5）"
       },
       "desc": "夹爪夹持力档位（1..5）"
      },
      "plate": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_1250uL_Tips2\", \"name\": \"PRCXI_1250uL_Tips2\", \"uuid\": \"e7df077f-ec56-48e6-a7af-9fabf569c418\"}]",
       "meta": {
        "key": "plate",
        "label": "搬运耗材",
        "desc": "被夹爪搬运的孔板/耗材资源实例（JSON 数组）"
       },
       "desc": "被夹爪搬运的孔板/耗材资源实例（JSON 数组）",
       "deck": true,
       "role": "plate",
       "roleLabel": "搬运耗材",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      },
      "hierarchy": {
       "type": "int",
       "min": 1,
       "max": 1,
       "default": 1,
       "meta": {
        "key": "hierarchy",
        "label": "层级",
        "desc": "搬运层级（1=单层）"
       },
       "desc": "搬运层级（1=单层）"
      },
      "get_direction": {
       "type": "enum",
       "options": [
        "",
        "0"
       ],
       "default": "",
       "meta": {
        "key": "get_direction",
        "label": "取件方向",
        "desc": "夹爪取件方向"
       },
       "desc": "夹爪取件方向"
      },
      "pickup_offset": {
       "type": "string",
       "default": "{'x': 0, 'y': 0, 'z': 0}",
       "meta": {
        "key": "pickup_offset",
        "label": "抓取偏移",
        "unit": "mm",
        "desc": "抓取位置偏移 {x,y,z}"
       },
       "unit": "mm",
       "desc": "抓取位置偏移 {x,y,z}"
      },
      "resource_offset": {
       "type": "string",
       "default": "{'x': 0, 'y': 0, 'z': 0}",
       "meta": {
        "key": "resource_offset",
        "label": "物料偏移",
        "unit": "mm",
        "desc": "物料尺寸偏移 {x,y,z}"
       },
       "unit": "mm",
       "desc": "物料尺寸偏移 {x,y,z}"
      },
      "put_down_position": {
       "type": "int",
       "min": 1,
       "max": 2,
       "default": 2,
       "meta": {
        "key": "put_down_position",
        "label": "放置位置档位",
        "desc": "放置动作档位（1/2）"
       },
       "desc": "放置动作档位（1/2）"
      },
      "destination_offset": {
       "type": "string",
       "default": "{'x': 0, 'y': 0, 'z': 0}",
       "meta": {
        "key": "destination_offset",
        "label": "目标偏移",
        "unit": "mm",
        "desc": "目标位置偏移 {x,y,z}"
       },
       "unit": "mm",
       "desc": "目标位置偏移 {x,y,z}"
      },
      "pinch_it_up_position": {
       "type": "int",
       "min": 1,
       "max": 2,
       "default": 2,
       "meta": {
        "key": "pinch_it_up_position",
        "label": "夹紧档位",
        "desc": "夹紧动作档位（1/2）"
       },
       "desc": "夹紧动作档位（1/2）"
      },
      "intermediate_locations": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "intermediate_locations",
        "label": "中间路径点",
        "desc": "搬运中间经过的板位号（JSON 数组）"
       },
       "desc": "搬运中间经过的板位号（JSON 数组）"
      },
      "put_direction": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "put_direction",
        "label": "放件方向",
        "desc": "夹爪放件方向"
       },
       "desc": "夹爪放件方向"
      },
      "drop_direction": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "drop_direction",
        "label": "落料方向",
        "desc": "落料方向"
       },
       "desc": "落料方向"
      },
      "pickup_direction": {
       "type": "string",
       "default": "",
       "meta": {
        "key": "pickup_direction",
        "label": "抓取方向",
        "desc": "抓取方向"
       },
       "desc": "抓取方向"
      },
      "pickup_distance_from_top": {
       "type": "int",
       "min": 0,
       "max": 0,
       "default": 0,
       "meta": {
        "key": "pickup_distance_from_top",
        "label": "顶面抓取距离",
        "unit": "mm",
        "desc": "从顶面下探的抓取距离"
       },
       "unit": "mm",
       "desc": "从顶面下探的抓取距离"
      }
     },
     "deckRoles": [
      {
       "key": "from",
       "label": "起点 from",
       "param": "from",
       "value": "slot",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": false
      },
      {
       "key": "to",
       "label": "终点 to",
       "param": "to",
       "value": "slot",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": false
      },
      {
       "key": "plate",
       "label": "搬运耗材",
       "param": "plate",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "tip",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      }
     ]
    },
    {
     "name": "titration_liquid",
     "label": "滴注液体",
     "inRealWorkflow": true,
     "count": 8,
     "params": {
      "offsets": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "offsets",
        "label": "位置偏移",
        "unit": "mm",
        "desc": "孔位位置偏移（JSON 数组）"
       },
       "unit": "mm",
       "desc": "孔位位置偏移（JSON 数组）"
      },
      "sources": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_nest_1_troughplate3\", \"name\": \"PRCXI_nest_1_troughplate3\", \"uuid\": \"dd9a0925-8aa7-44c0-a1bc-7dc9776ee6e0\"}]",
       "meta": {
        "key": "sources",
        "label": "源板位",
        "desc": "吸取液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）"
       },
       "desc": "吸取液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）",
       "deck": true,
       "role": "source",
       "roleLabel": "来源 source",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      },
      "targets": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_96_DeepWell_shake\", \"name\": \"PRCXI_96_DeepWell_shake\", \"uuid\": \"a2e75ff7-6b1a-494a-8b18-0b6d93619a11\"}]",
       "meta": {
        "key": "targets",
        "label": "目标板位",
        "desc": "排出液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）"
       },
       "desc": "排出液体的板位资源实例列表（JSON 数组，元素含 id/name/uuid）",
       "deck": true,
       "role": "target",
       "roleLabel": "目标 target",
       "value": "resource",
       "accept": [
        "deepWell",
        "reader",
        "trough",
        "transfer",
        "spare"
       ],
       "multi": true
      },
      "asp_vols": {
       "type": "json",
       "default": "[4.8]",
       "meta": {
        "key": "asp_vols",
        "label": "吸取体积",
        "unit": "µL",
        "desc": "每个源板位的吸取体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "每个源板位的吸取体积（JSON 数组）"
      },
      "dis_vols": {
       "type": "json",
       "default": "[4.8]",
       "meta": {
        "key": "dis_vols",
        "label": "排出体积",
        "unit": "µL",
        "desc": "每个目标板位的排出体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "每个目标板位的排出体积（JSON 数组）"
      },
      "none_keys": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "none_keys",
        "label": "忽略参数",
        "desc": "本次调用显式忽略的参数名（JSON 数组）"
       },
       "desc": "本次调用显式忽略的参数名（JSON 数组）"
      },
      "tip_racks": {
       "type": "json",
       "default": "[{\"id\": \"/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_1250uL_Tips2\", \"name\": \"PRCXI_1250uL_Tips2\", \"uuid\": \"695548f2-3e97-4913-a2c5-e19b3b07cac9\"}]",
       "meta": {
        "key": "tip_racks",
        "label": "枪头盒板位",
        "desc": "装载枪头的枪头盒资源实例列表（JSON 数组）"
       },
       "desc": "装载枪头的枪头盒资源实例列表（JSON 数组）",
       "deck": true,
       "role": "tips",
       "roleLabel": "枪头 tips",
       "value": "resource",
       "accept": [
        "tip"
       ],
       "multi": true
      },
      "is_96_well": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "is_96_well",
        "label": "96 孔板模式",
        "desc": "按 96 孔板（8×12）排布处理"
       },
       "desc": "按 96 孔板（8×12）排布处理"
      },
      "repeat_count": {
       "type": "int",
       "min": 2,
       "max": 27,
       "default": 27,
       "meta": {
        "key": "repeat_count",
        "label": "重复次数",
        "unit": "次",
        "desc": "滴注循环次数"
       },
       "unit": "次",
       "desc": "滴注循环次数"
      },
      "use_channels": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "use_channels",
        "label": "使用通道",
        "desc": "使用的移液通道编号（JSON 数组，空=自动）"
       },
       "desc": "使用的移液通道编号（JSON 数组，空=自动）"
      },
      "cycle_delay_s": {
       "type": "int",
       "min": 10,
       "max": 180,
       "default": 180,
       "meta": {
        "key": "cycle_delay_s",
        "label": "周期间隔",
        "unit": "s",
        "desc": "两次滴注之间的等待时间"
       },
       "unit": "s",
       "desc": "两次滴注之间的等待时间"
      },
      "liquid_height": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "liquid_height",
        "label": "液面高度",
        "unit": "mm",
        "desc": "按液面高度追踪吸液（JSON 数组）"
       },
       "unit": "mm",
       "desc": "按液面高度追踪吸液（JSON 数组）"
      },
      "asp_flow_rates": {
       "type": "json",
       "default": "[20]",
       "meta": {
        "key": "asp_flow_rates",
        "label": "吸取流速",
        "unit": "µL/s",
        "desc": "吸取流速（JSON 数组）"
       },
       "unit": "µL/s",
       "desc": "吸取流速（JSON 数组）"
      },
      "dis_flow_rates": {
       "type": "json",
       "default": "[20]",
       "meta": {
        "key": "dis_flow_rates",
        "label": "排出流速",
        "unit": "µL/s",
        "desc": "排出流速（JSON 数组）"
       },
       "unit": "µL/s",
       "desc": "排出流速（JSON 数组）"
      },
      "post_air_volume": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "post_air_volume",
        "label": "后置空气体积",
        "unit": "µL",
        "desc": "排液后追加的空气柱体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "排液后追加的空气柱体积（JSON 数组）"
      },
      "dispensing_method": {
       "type": "json",
       "default": "[\"BottleNeck\"]",
       "meta": {
        "key": "dispensing_method",
        "label": "排液方式",
        "desc": "贴壁排液方式（如 BottleNeck / DiveToBottom）"
       },
       "desc": "贴壁排液方式（如 BottleNeck / DiveToBottom）"
      },
      "blow_out_air_volume": {
       "type": "json",
       "default": "[20]",
       "meta": {
        "key": "blow_out_air_volume",
        "label": "吹出空气体积",
        "unit": "µL",
        "desc": "吹出残液的空气体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "吹出残液的空气体积（JSON 数组）"
      },
      "hover_below_liquid_level": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "hover_below_liquid_level",
        "label": "液面下悬停距离",
        "unit": "mm",
        "desc": "吸头在液面下方的悬停距离（JSON 数组）"
       },
       "unit": "mm",
       "desc": "吸头在液面下方的悬停距离（JSON 数组）"
      },
      "blow_out_air_volume_before": {
       "type": "json",
       "default": "[300]",
       "meta": {
        "key": "blow_out_air_volume_before",
        "label": "前置吹出空气体积",
        "unit": "µL",
        "desc": "吸取前预吹的空气体积（JSON 数组）"
       },
       "unit": "µL",
       "desc": "吸取前预吹的空气体积（JSON 数组）"
      },
      "z_start_point_offset_height": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "z_start_point_offset_height",
        "label": "Z 起点偏移",
        "unit": "mm",
        "desc": "Z 轴起始点高度偏移（JSON 数组）"
       },
       "unit": "mm",
       "desc": "Z 轴起始点高度偏移（JSON 数组）"
      },
      "post_discharge_pause_time_ms": {
       "type": "json",
       "default": "[]",
       "meta": {
        "key": "post_discharge_pause_time_ms",
        "label": "排液后停顿",
        "unit": "ms",
        "desc": "排出完成后停顿时间（JSON 数组）"
       },
       "unit": "ms",
       "desc": "排出完成后停顿时间（JSON 数组）"
      }
     },
     "deckRoles": [
      {
       "key": "source",
       "label": "来源 source",
       "param": "sources",
       "value": "resource",
       "accept": [
        "trough",
        "deepWell",
        "reader",
        "transfer",
        "spare",
        "sonic"
       ],
       "multi": true
      },
      {
       "key": "target",
       "label": "目标 target",
       "param": "targets",
       "value": "resource",
       "accept": [
        "deepWell",
        "reader",
        "trough",
        "transfer",
        "spare"
       ],
       "multi": true
      },
      {
       "key": "tips",
       "label": "枪头 tips",
       "param": "tip_racks",
       "value": "resource",
       "accept": [
        "tip"
       ],
       "multi": true
      }
     ]
    },
    {
     "name": "auto-shaking_incubation_action",
     "label": "震荡孵育",
     "inRealWorkflow": true,
     "count": 9,
     "params": {
      "time": {
       "type": "int",
       "min": 5,
       "max": 300000,
       "default": 10,
       "meta": {
        "key": "time",
        "label": "时长",
        "unit": "s",
        "desc": "震荡孵育时长（秒）"
       },
       "unit": "s",
       "desc": "震荡孵育时长（秒）"
      },
      "is_wait": {
       "type": "bool",
       "default": true,
       "meta": {
        "key": "is_wait",
        "label": "阻塞等待",
        "desc": "是否阻塞等待震荡孵育完成"
       },
       "desc": "是否阻塞等待震荡孵育完成"
      },
      "amplitude": {
       "type": "int",
       "min": 1,
       "max": 1200,
       "default": 1,
       "meta": {
        "key": "amplitude",
        "label": "振幅",
        "unit": "rpm",
        "desc": "震荡转速/振幅档位"
       },
       "unit": "rpm",
       "desc": "震荡转速/振幅档位"
      },
      "module_no": {
       "type": "int",
       "min": 1,
       "max": 1,
       "default": 1,
       "meta": {
        "key": "module_no",
        "label": "温控模块号",
        "unit": "号",
        "desc": "震荡孵育使用的温控模块编号"
       },
       "unit": "号",
       "desc": "震荡孵育使用的温控模块编号"
      },
      "temperature": {
       "type": "int",
       "min": 28,
       "max": 50,
       "default": 35,
       "meta": {
        "key": "temperature",
        "label": "温度设置",
        "unit": "℃",
        "rw": "W",
        "desc": "离心机/烘箱温度设定值"
       },
       "unit": "℃",
       "desc": "离心机/烘箱温度设定值"
      }
     }
    }
   ],
   "deck": {
    "model": "PRCXI9300Deck",
    "rows": 4,
    "cols": 4,
    "total": 16,
    "api": "/api/gn-adapter/prcxi-deck",
    "unilabDeck": "/gn_workstation/PRCXI/PRCXI_Deck"
   },
   "points": [],
   "pointStats": {
    "total": 0,
    "r": 0,
    "w": 0
   },
   "protocolNodes": 0
  }
 ],
 "scriptNodes": [
  {
   "name": "group",
   "count": 16
  },
  {
   "name": "从9320到堆栈三次取枪头",
   "count": 6
  },
  {
   "name": "从堆栈到9320三次放枪头",
   "count": 2
  },
  {
   "name": "制备CTAC溶液（128mg+20ml）",
   "count": 1
  },
  {
   "name": "震荡加样测试",
   "count": 1
  }
 ],
 "workflowFiles": [
  "9320移液.json",
  "GN_station.json",
  "GN_station1.json",
  "快换模块单点调试（从复位到所有功能再到复位）.json",
  "滴注81次.json",
  "金四面体-从第一次离心到结束.json",
  "金四面体AA溶液制备与溶液的混合，并放到T16等待离心.json",
  "金四面体CTAC与CTAB混合溶液制备.json",
  "金四面体（从堆栈到三次离心）_9320only.json",
  "金四面体（从堆栈到三次离心）_updated.json",
  "金纳米颗粒工作流.json"
 ],
 "workflowDir": "/Users/fenglongli/Downloads/Uni-Lab-OS/unilabos/devices/workstation/GN"
};
