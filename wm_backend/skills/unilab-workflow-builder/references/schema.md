# PRCXI / GN 工作站自动化工作流 JSON —— Schema 与踩坑点参考

> 本文件是 Uni-Lab OS 工作流 JSON 的**具象示例**：以 GN 工作站的 PRCXI 液体处理 + 固体加样为例，
> 完整记录其真实结构与踩坑规则。Uni-Lab OS 下还有 bioyond_studio、szlab_poly_studio、AI4C、laiyu 等
> 几十种设备，均遵循同一套节点/边拓扑与命名约定（`unilabos/devices/` 下可查各自 `device_name` /
> `resource_name` / `param`）。修改 PRCXI 工作流先读本文；其它设备可参照本文结构类比扩展。

本文件记录「金四面体」等 PRCXI 液体处理 + 固体加样自动化工作流 JSON 的真实结构，
以及多次踩坑后沉淀的硬规则。修改工作流时务必先读本文，再动代码。

---

## 1. 顶层结构

```json
{
  "target_lab_uuid": "<实验室UUID，必填，从参考文件继承>",
  "name": "<工作流名称>",
  "data": {
    "nodes": [ ... ],   // 节点数组
    "edges": [ ... ]    // 连线数组
  }
}
```

- **执行顺序**：由「无入边的根节点」出发沿 `edges` 做 DFS 决定，**与 `parent_uuid` 无关**（`parent_uuid` 仅是视觉分组容器，不影响力程）。
- 典型线性工作流：1 个根、1 个汇、每个节点出/入度均为 1。

---

## 2. 节点（node）通用字段

| 字段 | 说明 |
|------|------|
| `uuid` | 节点唯一 ID（新建时 `uuid.uuid4()`） |
| `parent_uuid` | 视觉容器，**留空 `""` 不影响执行** |
| `name` | 动作名：`pick` / `place` / `move_plate` / `titration_liquid` / `auto-create_protocol` / `auto-run_protocol` / `auto-execute_command` |
| `type` | 固定 `"ILab"` |
| `icon` | `""` |
| `pose` | 布局/坐标对象（见 §5） |
| `param` | 设备动作参数（关键！见 §3/§4） |
| `footer` | 节点说明文字（给人看，建议写清第几步/第几次） |
| `device_name` | **设备 ID**（见 §3 关键坑） |
| `disabled` | `false` |
| `minimized` | `false` |
| `lab_node_type` | `"Device"` |
| `template_uuid` | 模板 UUID（取自参考文件，勿改） |
| `template_name` | 模板名（= 动作名的另一种写法） |
| `resource_name` | **资源名**（见 §3 关键坑，与 `device_name` 不同字段） |

---

## 3. ⚠️ 最关键坑：`device_name` ≠ `resource_name`（液体处理站）

9320 液体处理站的两个字段**完全不同**：

| 节点 | `device_name` | `resource_name` |
|------|---------------|-----------------|
| move_plate / titration_liquid / auto-create_protocol / auto-run_protocol | **`PRCXI`** | **`liquid_handler.prcxi`** |
| 固体加样 auto-execute_command | `gn_solid_weighing` | `gn_solid_weighing` |
| 机械臂 pick / place | `gn_robotic_arm` | `gn_robotic_arm` |
| 堆栈 auto-execute_command | `gn_rotary_stack` | `gn_rotary_stack` |

**踩坑事实**：曾把液体处理节点的 `device_name` 误写成 `liquid_handler.prcxi`
（即与 resource_name 相同），导致设备识别错误。用户明确要求「9320 对应的设备 ID 是 PRCXI」。
**永远让液体处理节点的 `device_name="PRCXI"`、`resource_name="liquid_handler.prcxi"`。**

---

## 4. 各设备 param schema

### 4.1 固体加样 `gn_solid_weighing`（`name=auto-execute_command`）

**⚠️ param 键名是 `x_pos` / `y_pos` / `material_z_pos`（不是 `x` / `y` / `material_z`）。**
用错键名会导致数值静默不落盘（校验时才发现全是 None）。

通用 cmd（两文件相同）：

| cmd_type | 含义 | 典型参数 |
|----------|------|----------|
| 11 | 料筒加样 | `door_pos=3600, door_speed=150, material_z_pos=140000, material_z_speed=300`，重量写 **`volune_weight`**（注意拼写，单位 **0.1mg**：128mg→1280） |
| 12 | 夹取料架 | `x_pos=-80, y_pos=2100, gripper_z_pos=2050, gripper_z_speed=300, x_speed=300, y_speed=300` |
| 13 | 放置加样工位 | `x_pos=-1840, y_pos=1790, gripper_z_pos=930, gripper_z_speed=300, x_speed=300, y_speed=300` |
| 20 | 复位 | 全 0 |

**文件特定 cmd（绝不可跨文件套用，必须读目标参考文件实测）：**

| 参考文件 | 取料筒 cmd | 放回 cmd | material_z_pos | 加料 y_pos | remove_static |
|----------|-----------|----------|----------------|------------|---------------|
| 金四面体（从堆栈到三次离心） | **cmd10** | **cmd18** | 234000 | 1150 | 无此字段 |
| 金四面体CTAC与CTAB混合溶液制备 | **cmd9** | **cmd19** | 239000 | 655 | 有（取=1/放回=0） |

- CTAC 制备文件 2 号粉料桶坐标 `(-3679, 195)`，加料基础坐标 `(-624, 655)`。
- 多通道板加样：每加一次 x 偏移递进（参考文件 R1→R8 为 -624→6，每轮 +90）；加 8 次即 8×(cmd9→cmd11→cmd19)。

### 4.2 机械臂 `gn_robotic_arm`（pick / place）

```json
{ "number": <位置号>, "station": "stack"|"nine9320"|"solid",
  "timeout": 180 (solid 站用 30000), "x_speed": 300 (solid 站用 400), "item_type": "plate" }
```

### 4.3 9320 液体处理

**move_plate**（必含字段）：
```json
{ "from": <1-16>, "to": <1-16>, "force": 5, "plate": [资源],
  "put_down_position": 2, "pinch_it_up_position": 2,
  "get_direction":"", "put_direction":"", "drop_direction":"",
  "pickup_direction":"", "pickup_distance_from_top": 0,
  "pickup_offset":{x,y,z}, "resource_offset":{x,y,z}, "destination_offset":{x,y,z},
  "hierarchy": 1, "intermediate_locations": [] }
```
> 注意：CTAC 制备文件含上述 `get_direction` 等额外字段；三次离心文件不含——以目标文件为准。
> move_plate 节点 param **不含 `action` 键**，靠 `name` 字段识别。

**titration_liquid**（「分几次加」用 `repeat_count`）：
```json
{ "sources": [水源资源], "targets": [目标板资源], "tip_racks": [枪头盒资源],
  "asp_vols": [10000], "dis_vols": [10000], "repeat_count": 2,   // 20ml 分两次
  "is_96_well": true, "asp_flow_rates":[300], "dis_flow_rates":[300],
  "dispensing_method":["BottleNeck"], "blow_out_air_volume":[20], "cycle_delay_s": 10, ... }
```
> 同样不含 `action` 键。

**auto-create_protocol / auto-run_protocol**：分别是建协议/跑协议占位节点，param 为协议元数据（可为空串/None）。

### 4.4 离心管液体处理 `gn_centrifuge_tube_liquid_handling`（`name=auto-execute_command`）

`离心管单点测试全流程.json`（23 个 `auto-execute_command` 节点）实测。与 PRCXI **不同**之处：

1. **`device_name == resource_name == "gn_centrifuge_tube_liquid_handling"`**（两者相同，不像 PRCXI 那样分开）。
2. **param 键名全部小写蛇形**，绝不用 camelCase（曾误写 `Ch1ReverseAspirate` 设备不识别）：
   `x_pos` / `y_pos` / `z1_pos`~`z4_pos` / `m_pos` / `p1_pos` / `p2_pos` / `m_speed` / `x_speed` / `y_speed` /
   `z1_speed`~`z4_speed` / `p1_speed` / `p2_speed` / `ch1_blow` / `ch8_blow` / `ch1_reverse_aspirate` /
   `ch8_reverse_aspirate` / `mix_counts` / `shaking_time` / `ultrasound_time` / `thermo1~4_temperature` /
   `thermo1~4_time` / `small_gripper_angle` / `small_gripper_force` / `open_lid_*` / `close_lid_*` / `timeout` 等。
3. **Z 轴分四套**（按执行轴的夹爪/通道选其一，其余保持 0）：

   | 字段 | 对应执行轴 |
   |------|-----------|
   | `z1_pos` | 八通道移液器 |
   | `z2_pos` | 大夹爪 |
   | `z3_pos` | 单通道移液器 |
   | `z4_pos` | 小夹爪 |

   `X→x_pos`、`Y→y_pos`；具体 Z 写进上表对应字段。`p1_pos` / `p2_pos` 不是位置量，而是**体积字段**（见第 4 条）。
4. **液体体积 vs 气隙（两个不同概念，切勿混用）**：
   - **液体体积**：单通道 = `p1_pos`（µL），8 通道 = `p2_pos`（µL）。
     例：单吸液 `cmd_type=24, p1_pos=1000`（=1000 µL）；本流程吸液/放液/卸载 = 1000，混匀 = 100，装载不写。
   - **反向吸液（气隙）** = 吸液完成后**再吸一段空气** → `ch1_reverse_aspirate` / `ch8_reverse_aspirate`。
   - **吹样（气隙）** = 放液完成后**再吹一段空气** → `ch1_blow` / `ch8_blow`。
   - 气隙字段未指定时保持原值 0；**绝不要把液体量写进气隙字段**（曾把 1000 误写进 `ch1_reverse_aspirate`）。
5. **速度**：`m_speed` / `x_speed` / `y_speed` / `z1_speed`~`z4_speed` 默认 **300**；`p1_speed` / `p2_speed` **不设置**（除非用户要求）。
6. **`cmd_type`**：footer 带 `NN=` 前缀时覆盖为 NN（如 `23=单通道到2号板装载` → cmd_type=23）；无前缀（复位 / 开盖）保留现有值。

**坐标来源（txt 的 `PositionInfo` 标定表，按 footer 语义查表）：**

| footer 语义 | 查表位置 | 取用子坐标（按轴） |
|------------|----------|-------------------|
| `N号板` | `SbsSlots[Index=N]` | 单通道→`Channel1`、八通道→`Channel8`、大夹爪→`BigGripper`、小夹爪→`SmallGripper` |
| `N号盖子位` / `…盖子` | `LidSlots[Index=N]`（单 XYZ） | 直接取 `Xyz` |
| `槽位N`（废弃槽） | `WasteSlots[Index=N]` | 单通道→`Channel1`（坐标可能全 0） |
| `超声`（小瓶处） | `SbsSlot16.SmallGripper` | 小夹爪 |
| `超声`（大瓶处） | `SbsSlot16.SmallGripper2` | 小夹爪 |
| 瓶子（无编号） | `LargeBottles[1]` / `SmallBottles[1]` | 按轴取 `SmallGripper`/`BigGripper`/`Channel1` |
| 小瓶盖 / 大瓶盖（无编号） | `LidSlots[10]`（小瓶）/ `LidSlots[1]`（大瓶） | 直接取 `Xyz` |

> 例：footer `25=单通道到7号板放液` → 轴=单通道 → `SbsSlots[7].Channel1` = `(2490, -2300, 118)` →
> `x_pos=2490, y_pos=-2300, z3_pos=118, p1_pos=1000`。
> 例：footer `30=小夹爪放置到1号盖子位` → 轴=小夹爪 → `LidSlots[1].Xyz` = `(6315, -440, 1300)` →
> `x_pos=6315, y_pos=-440, z4_pos=1300`。

**非板位动作**（超神波混匀 / 复位）：坐标保持 0，只设时间/速度类参数（如 `ultrasound_time=10`）。

---

## 5. pose / 布局

```json
"pose": {
  "layout": "x-y",
  "position": {"x": 200.0, "y": 0.0, "z": 0},
  "position_3d": {"x":0,"y":0,"z":0},
  "size": {"width":0,"height":0,"depth":0},
  "scale": {"x":1,"y":1,"z":1},
  "rotation": {"x":0,"y":0,"z":0},
  "extra": null, "cross_section_type": "rectangle"
}
```
建议线性布局：`x = 200 + i*260, y = 0`。

---

## 6. 连线（edge）字段

```json
{
  "source_node_uuid": "<上游uuid>",
  "target_node_uuid": "<下游uuid>",
  "source_handle_key": "ready",
  "source_handle_io": "source",
  "target_handle_key": "ready",
  "target_handle_io": "target"
}
```

**⚠️ 组装陷阱**：若采用「先建新节点、后补 old 节点边」的重建方式，必须把组装放在**所有 link 之后**
（`edges = new_edges + edges`），否则新节点的边会丢失；且勿对已在 `new_nodes` 内的节点重复 insert（去重）。

---

## 7. 常用资源 UUID（CTAC 制备文件实测）

| 资源 | 名称 | UUID |
|------|------|------|
| 枪头盒（被搬运） | PRCXI_96_DeepWell5 | e74c153c-a29f-4653-a665-b9e1cc1711a9 |
| 8 通道板 / 滴定目标 | PRCXI_96_DeepWell_3 | f260b8ba-a629-42ea-8340-548d765b4479 |
| T7 水 | PRCXI_nest_1_troughplate4 | bd6f7d88-e96a-4efa-b8c6-f5514aeb7cdf |
| T15 枪头盒（滴定用） | PRCXI_1250uL_Tips2 | 695548f2-3e97-4913-a2c5-e19b3b07cac9 |

> 注：枪头盒「搬运资源」与滴定 `tip_racks` 资源是**不同 uuid**，照搬参考文件即可。

---

## 8. 校验清单（交付前必过）

1. JSON 合法；含 `target_lab_uuid`（非空）/ `name` / `data`。
2. 0 悬空边；根/汇各 1；0 非线性节点；全部节点可达。
3. 所有液体处理节点 `device_name=="PRCXI"` 且 `resource_name=="liquid_handler.prcxi"`。
4. 固体加样节点 `x_pos` / `y_pos` / `material_z_pos` 均非 None（键名正确）。
5. cmd11 加样的 `volune_weight` 齐备且单位换算正确（mg×10）。
6. move_plate 槽位、titration `repeat_count` 符合需求。
7. **强制约定 — 设备首尾复位（规则①）**：每个设备的首个动作前、最后一个动作后，都紧邻该设备的复位节点。
   ⚠️ 例外：`gn_robotic_arm` **豁免规则①**（详见 §9）——真实参考工作流中无任何机械臂复位节点，其动作闭合靠 `pick`→`place` 成对保证；切勿注入占位复位节点（错误的 `template_uuid` → 导入失败）。
8. **强制约定 — 离心机/堆栈逐动作复位（规则②）**：`gn_centrifuge` 与 `gn_rotary_stack` 的**每一个**动作节点前后，都紧邻复位节点（cmd8 / cmd7）。
9. **强制约定 — 9320 协议包裹（规则③）**：每个 PRCXI 动作块的形式为 `auto-create_protocol` → 动作(们) → `auto-run_protocol`；PRCXI 无独立复位节点，其初始化即由该包裹实现。

> 以上第 7–9 条由 `prcxi_factory.py` 的包裹器（`wrap_device_reset` / `wrap_per_action_reset` /
> `prcxi_block`）结构性保证；**拼链时务必经包裹器，勿裸拼动作节点**。`prcxi_factory.py` 的 `__main__`
> 会构造一条合规链并断言三条规则全部通过，改完模块后跑一次做自检。

---

## 9. 复位命令映射（规则①/② 原子节点，参数取自参考文件实测）

| 设备 | 复位节点 | 命令 / 模板 | param 来源 | 工厂函数 |
|------|----------|-------------|------------|----------|
| `gn_solid_weighing` | `auto-execute_command` cmd20（全 0） | `c7c5eb46-b3d5-404f-a24a-8639f894013d` | `SOLID_RESET_PARAM` | `solid_reset()` |
| `gn_rotary_stack` | `auto-execute_command` cmd7（全 0） | `6b08ef44-bf4f-45f5-ae28-414a4011c1d7` | 深拷贝目标参考文件 cmd7（`find_cmd7_param`） | `stack_reset(cmd7_param)` |
| `gn_centrifuge` | `auto-execute_command` cmd8（全 0） | `7e175cf2-3149-4805-96cc-5e7a48b17e41` | `CENTRIFUGE_RESET_PARAM` | `centrifuge_reset()` |
| `gn_centrifuge_tube_liquid_handling` | `auto-reset`（空 param） | `6c1ec551-93e6-4419-97d3-610ba3d794a0` | `{}` | `tube_reset()` |
| `gn_robotic_arm` | `auto-execute_command` cmd7（`RobotCommand.RESET=7`） | **template_uuid 未知** | 调用方显式传入 | `arm_reset(tpl_uuid, …)` |

- 复位节点统一入口：`device_reset(device, footer=…, cmd7_param=…, arm_tpl=…)`。
- ⚠️ 机械臂复位**无任何参考节点**，其 `template_uuid` 未知，调用方必须提供；`gn_rotary_stack` 的复位
  param 因文件而异，必须深拷贝目标参考文件的 cmd7（勿硬编码）。
- **机械臂豁免规则①**：因真实参考工作流（含金四面体 120 节点）中机械臂**零复位节点**，导出/校验
  均不对 `gn_robotic_arm` 做首尾复位检查；其合法性由 `pick`→`place` 100% 配对保证。若后续获得真实
  机械臂复位模板，再显式启用（`arm_reset(tpl_uuid, …)`）。
