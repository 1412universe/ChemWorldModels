---
name: unilab-workflow-builder
description: "Build, modify, and validate Uni-Lab OS automation workflow JSON across lab devices and workstations (e.g. the GN workstation's PRCXI liquid handler, gn_solid_weighing, robotic arm, rotary stack, and many others under unilabos/devices). Use when a user asks to create, edit, rebuild, relayout, or validate a Uni-Lab OS automation workflow JSON, or mentions 9320/PRCXI, move_plate, titration_liquid, gn_solid_weighing, gn_robotic_arm, gn_rotary_stack, or 金四面体 workflow files. Encodes hard-won pitfalls so other agents do not repeat them."
agent_created: true
---

# Uni-Lab Workflow Builder

## Overview

Generate, edit, and validate **Uni-Lab OS** automation workflow JSON — the structured node/edge
JSON that drives lab devices and workstations in the Uni-Lab-OS platform. The skill's concrete,
battle-tested reference is the **GN workstation**: the 9320 liquid-handling station
(`device_name=PRCXI`) combined with `gn_solid_weighing` (solid dispenser), `gn_robotic_arm`, and
`gn_rotary_stack`. The packaged factory functions, validator, and schema reference capture the exact
parameter keys, device/resource naming, and topology rules — including several non-obvious traps
that have caused silent failures.

The PRCXI/GN example is one of many device families in Uni-Lab OS (see Device catalog below); the
same node/edge topology and naming conventions apply across them.

## When to use

- User supplies a reference workflow JSON and asks to produce a new one following a step list.
- User asks to relayout / re-chain / rebuild an existing Uni-Lab OS workflow JSON.
- User mentions 9320, PRCXI, `move_plate`, `titration_liquid`, `gn_solid_weighing`, `gn_robotic_arm`,
  `gn_rotary_stack`, or 金四面体 workflow files.
- User mentions 离心管液体处理, `gn_centrifuge_tube_liquid_handling`, `ch1_reverse_aspirate`, 单通道/八通道移液,
  小夹爪/大夹爪, `PositionInfo` 标定回填, or `离心管单点测试全流程` workflow files.
- User mentions any Uni-Lab OS device/workstation (GN, bioyond_studio, szlab_poly_studio, AI4C, AI4M,
  coin_cell_assembly, laiyu, balance, hplc, arm, gripper, powder_dispense, etc.) and a workflow JSON.
- User asks to validate a generated Uni-Lab OS workflow JSON.

## Device catalog (source of truth)

All device/workstation definitions and their actions live under:

```
/Users/fenglongli/Downloads/Uni-Lab-OS/unilabos/devices/
├── workstation/
│   ├── GN/                      # 含 liquid_handling/prcxi 与 centrifuge_tube_liquid_handling（具象示例来源；后者 param schema 见 schema.md §4.4）
│   ├── bioyond_studio/          # reaction_station / dispensing_station / bioyond_cell
│   ├── szlab_poly_studio/
│   ├── AI4C/  AI4M/  coin_cell_assembly/
├── liquid_handling/             # prcxi（另有 laiyu 等）
├── balance/  hplc/  arm/  gripper/  powder_dispense/  platereader/  sealer/
├── xrd_d7mate/  Qone_nmr/  zhida_gcms/  raman_uv/  opsky_Raman/  UV_test/
├── rotavap/  heaterstirrer/  cnc/  separator/  vaccum/  pump_and_valve/  temperature/
├── cytomat/  xpeel/  motor/  agv/  ros_dev/  cameraSII/  resource_container/  virtual/  battery/
└── ... (几十种设备)
```

When building a workflow for a device NOT covered by the PRCXI example, read that device's module
under `unilabos/devices/...` to learn its `device_name`, `resource_name`, and `param` schema, then
follow the same node/edge topology and the pitfall list below. The GN/PRCXI `references/schema.md`
documents one complete, verified example to copy from.

## Critical pitfalls (read before writing any node)

These caused real bugs. Honor them exactly:

1. **`device_name` ≠ `resource_name` for the 9320 liquid handler.**
   Every liquid-handling node (`move_plate`, `titration_liquid`, `auto-create_protocol`,
   `auto-run_protocol`) MUST have `device_name="PRCXI"` and `resource_name="liquid_handler.prcxi"`.
   The common mistake is setting both to `liquid_handler.prcxi`. Solid/arm/stack nodes keep
   `device_name == resource_name` (`gn_solid_weighing`, `gn_robotic_arm`, `gn_rotary_stack`).

2. **Solid-dispensing param keys are `x_pos` / `y_pos` / `material_z_pos`** — NOT `x` / `y` / `material_z`.
   Wrong keys make values silently fail to persist (they show as `None` only at validation time).

3. **Weight field is `volune_weight`** (original spelling, keep it) and the unit is **0.1 mg**.
   128 mg → write `1280`.

4. **Solid `cmd_type` encoding differs per workflow file — never cross-apply.**
   - 金四面体（从堆栈到三次离心）: bucket-out = **cmd10** / bucket-in = **cmd18**, `material_z_pos=234000`, dispense `y_pos=1150`, NO `remove_static`.
   - 金四面体CTAC与CTAB混合溶液制备: bucket-out = **cmd9** / bucket-in = **cmd19**, `material_z_pos=239000`, dispense `y_pos=655`, HAS `remove_static` (out=1, in=0).
   - Shared cmds (both files): 11 dispense (`door_pos=3600, door_speed=150, material_z_pos=140000, material_z_speed=300`), 12 夹取料架 (`x_pos=-80,y_pos=2100,gripper_z_pos=2050`), 13 放置加样工位 (`x_pos=-1840,y_pos=1790,gripper_z_pos=930`), 20 复位.
   Always read the **target** reference file's actual encoding rather than assuming.

5. **`parent_uuid` is only a visual container** and does NOT affect execution order. Execution order
   is the DFS from root nodes (no incoming edges) along `edges`. Keep the chain linear
   (every node out/in-degree = 1).

6. **Assembly ordering**: when rebuilding via "new nodes + retained edges", build ALL links before
   final assembly (`edges = new_edges + edges`), or new-node edges are lost. Do not re-insert a node
   already present in `new_nodes` (dedup).

7. **`move_plate` / `titration_liquid` nodes have NO `action` key** in their `param` — the `name`
   field is the action. Do not add one. Both require `put_down_position=2, pinch_it_up_position=2`
   (CTAC file also needs the `get_direction`/`put_direction`/`drop_direction`/`pickup_direction`/
   `pickup_distance_from_top` fields — match the target file).

8. **`titration_liquid` "split into N additions" = `repeat_count`** (e.g. 20 ml in 2× →
   `asp_vols=[10000], repeat_count=2`). `sources`=water, `targets`=plate, `tip_racks`=tip box.
   To make the generated node traceable to the physical deck, put the real slot info in `footer`
   (e.g. `9320-滴注 [6号 2.5mM 氯金酸·4℃]→[14号 金四面体成品] ×27`) — `param` has no slot field.

9. **`move_plate` direction: `to` = destination slot, `from` = source slot.** Verified against
   `从堆栈到9320三次放枪头.json` (放枪头 `{to:11, from:16}`, `{to:12, from:16}`) and
   `从9320到堆栈三次取枪头.json` (取枪头 `{to:16, from:11}`, `{to:16, from:12}`, `{to:16, from:15}`).
   So: 放枪头 = 中转位16 → 枪头位；取枪头 = 枪头位 → 中转位16. Getting this backwards silently
   produces a physically impossible transfer.

10. **Edge 字段名必须精确匹配源文件格式，否则 Uni-Lab OS 导入时报"格式错误"。**
    正确的 edge 字段是 **handle 机制**，不是 port 机制：
    ```json
    {
      "source_node_uuid": "...",
      "target_node_uuid": "...",
      "source_handle_key": "ready",
      "source_handle_io": "source",
      "target_handle_key": "ready",
      "target_handle_io": "target"
    }
    ```
    - **错误写法**（会导致导入失败）：`source_port`/`target_port`/`uuid` —— 这些字段 Uni-Lab OS 不识别。
    - **没有 `uuid` 字段**：edge 不需要自己的 uuid，只有 `source_node_uuid` + `target_node_uuid`。
    - **`handle_key` 恒为 `"ready"`**，`handle_io` 是 `"source"`（出）或 `"target"`（入）。
    - 生成 edge 时务必 deep-copy 源文件 edge 的字段集，不要自己发明字段名。

11. **`workflow_uuid` 导入时需重新生成，避免与源文件冲突。** 如果生成的工作流直接复用源文件的
    `workflow_uuid`，同 lab 内可能冲突。生成新文件时用 `uuid.uuid4()` 重新生成一个；`target_lab_uuid`
    保持与源文件一致（关联到同一 lab）。

12. **多通道加样批量生成规律（8→96 通道示例）。** 当用户要求把 N 通道加样扩展到 M 通道时：
    - **板布局**：96 孔板 = 8 列 × 12 行；必须先明确“执行顺序”，不能把 `nodes` 数组顺序当作执行顺序。
    - **执行顺序**：固体加样工作流通常沿 `edges` 形成一条线性链；从唯一根节点出发，沿
      `source_node_uuid → target_node_uuid` 遍历，遇到 `device_name="gn_solid_weighing"` 且
      `param.cmd_type=11` 的节点时，按遍历次序编号为 R1、R2……R96。`parent_uuid`、JSON 数组下标、
      文件中筛选出来的节点顺序都不能决定执行顺序。
    - **本项目确认的 96 通道坐标布局**：R1–R12 为第 1 列，R13–R24 为第 2 列，依此类推；
      即 **列优先**（不是行优先）：`col, row = divmod(idx, 12)`，
      `x = X0 + col * 90`，`y = Y0 + row * 90`。
      当前用户确认的 96 通道 AA 加样文件使用 `X0=-639`、`Y0=650`、`Z0=84000`：
      R1=`(-639,650,84000)`，R2=`(-639,740,84000)`，R12=`(-639,1640,84000)`，
      R13=`(-549,650,84000)`，R96=`(-9,1640,84000)`。其他工作流的 X0/Y0/Z0 可能不同，必须以目标文件和用户明确给出的基准为准，不能套用通用示例。
    - **坐标字段**：固体加样仪实际执行字段必须写入 `param.x_pos`、`param.y_pos`、
      `param.material_z_pos`；不能只改 footer、备注或 `@X...` 展示文字。
    - **备注同步**：如果 cmd11 节点的 `footer` 含有表示坐标的 `@X...`，修改坐标后同步该 `@X`；
      但绝不能反过来用 footer 的 R 编号或 `@X` 推断执行顺序。
    - **w（天平读数）累加**：只有用户/目标模板明确要求时才计算；否则从模板 deep-copy，不能擅自把
      `volune_weight` 改成 100 或其他值。`volune_weight` 单位仍为 0.1 mg。
    - **每轮结构**：取桶(cmd9) → 加样(cmd11) → 放回(cmd19)，首尾包 复位(cmd20) + 夹取料架(cmd12)
      + 放置工位(cmd13) ... -夹取工位(cmd12) + 放回料架(cmd13) + 复位(cmd20)。
    - **模板节点按 `cmd_type` 精确挑选**，不要按 nodes 数组下标（源文件 nodes 数组无序！）。
      用 `find_tmpl(cmd_type, footer_kw)` 函数从源 nodes 里按 cmd_type + footer 关键词挑模板。
    - **其余参数**（速度、门位置、料桶坐标等）全部从模板 deep-copy；只有用户明确要求的坐标字段可改。
    - 生成脚本：`scripts/gen_multichannel_solid.py`（已持久化，命令行参数化，支持任意通道数）。

12A. **固体加样坐标修改的强制校验（防止“备注对、实际 param 错”）。** 每次修改或生成 cmd11 坐标时，必须按以下顺序执行，不能省略：
    1. 读取目标文件，建立 `uuid → node` 映射，并从 `edges` 找到唯一根节点；沿 edges 遍历到末端，确认是单链、无分支、覆盖全部节点。
    2. 只在这条实际执行链中收集 `device_name="gn_solid_weighing"` 且 `param.cmd_type=11` 的节点；确认数量与用户要求一致（96 通道应为 96）。
    3. 按执行链序号给每个节点赋坐标；以 R1 为基准，不得按 nodes 下标、footer 出现顺序或 `parent_uuid` 赋值。
    4. 同时检查三处一致性：执行序号（R1…）、`param.x_pos/y_pos/material_z_pos`、footer 中的 `@X`。三者不一致就不能交付。
    5. 写文件前保存原始结构；写入后读回 JSON，重新沿 edges 验证全部 96 个 cmd11。做结构 diff，必须证明
       非 cmd11 节点、所有 edges、top-level 字段和 cmd11 的非坐标参数均未改变；允许变化仅为 cmd11 的
       `x_pos`、`y_pos`、`material_z_pos`，以及明确作为坐标展示的 footer `@X`。
    6. 最终至少打印并核对 R1、R2、R12、R13、R96；其中当前确认基准必须分别为
       `(-639,650,84000)`、`(-639,740,84000)`、`(-639,1640,84000)`、
       `(-549,650,84000)`、`(-9,1640,84000)`。

    **禁止交付的错误模式：** footer 显示 `R1 @X-639`，但 R1 节点的真实 `param` 仍是
    `x_pos=-279, y_pos=1010, material_z_pos=84000`；或者 JSON 看起来坐标规则正确，但沿 edges
    执行时 R1 实际落在别的节点上。遇到这种情况必须重新生成副本并核验，不能声称“已修复”。

13. **`titration_liquid` 的 `blow_out_air_volume_before` 字段：默认值为 `[0]`。**
    参考文件 `震荡加样测试.json` 和 `金四面体AA溶液制备.json` 里该值为 `[300]`，但用户在 COF 合成
    场景明确：**没有明确要求时默认为 `[0]`**。不同实验场景参数不同，务必向用户确认后再写，不要
    盲目复用参考文件的值。

14. **COF 合成工作流要点（亚胺 COF，96 孔板）。** 合成步骤文档《COF合成步骤.docx》共 13 步，
    其中第 3-5 步只涉及 9320 液体处理：
    - 第3步：加溶剂1（0.1-1mL，二氧六环/均三甲苯/邻二氯苯/正丁醇/甲醇/乙醇）
    - 第4步：加溶剂2（0.1-1mL，同上）
    - 第5步：加催化剂（0.05-0.2mL，乙酸水溶液 3M/6M/12M、NaOH、苯甲酸酐）
    - 每步结构：`auto-create_protocol` → `titration_liquid` → `auto-run_protocol`（PRCXI 块）
    - `is_96_well=true`，`sources`=储液槽(troughplate3)，`targets`=96孔深孔板(DeepWell5)，
      `tip_racks`=1250uL枪头盒(Tips1)
    - `blow_out_air_volume_before=[0]`（默认值，用户未明确要求时用 0，见 pitfall #13）
    - `dispensing_method=["BottleNeck"]`，`asp_flow_rates`/`dis_flow_rates` 按体积调整
      （大体积 500µL 用 10，小体积 100µL 用 5）
    - 体积取范围中间值：溶剂 500µL，催化剂 100µL
    - 反应器为铝制 96 孔板，容积 2.5mL

15. **9320 枪头盒板位编号与 `PRCXI_1250uL_TipsN` 的映射关系。** 用户明确确认（依据
    `COF合成中的三次移液操作.json`）：
    | 板位编号 | resource_name | UUID |
    |---|---|---|
    | T11 | `PRCXI_1250uL_Tips1` | `2c525d62-d238-48d5-892a-993e5c0065d7` |
    | T12 | `PRCXI_1250uL_Tips3` | `0014ea7c-9743-452a-96ab-5407f475a32c` |
    | T15 | `PRCXI_1250uL_Tips2` | `695548f2-3e97-4913-a2c5-e19b3b07cac9` |
    **注意：T12 对应 Tips3，T15 对应 Tips2（不是按数字顺序对应！）** 这是用户在 COF 合成场景
    实测确认的。连续三次移液时，枪头分配顺序为 **T15→T12→T11**（即 Tips2→Tips3→Tips1），
    三盒不冲突。`tip_racks` 写完整结构：`{id, name, uuid}`，`id` 格式
    `/gn_workstation/PRCXI/PRCXI_Deck/<name>`。分配时按步骤号排序匹配，不要按 nodes 数组
    出现顺序（数组可能无序）。

16. **`asp_flow_rates` / `dis_flow_rates` 默认值 300。** 参考文件 `震荡加样测试.json` 用 10，
    `金四面体AA` 用 20，但用户在 COF 合成场景明确要求"按默认 300 的来"。不同设备/实验流速
    默认值不同，不确定时向用户确认。

17. **`gn_centrifuge_tube_liquid_handling`（离心管液体处理）的 param 键名是蛇形小写，且 Z 轴分四套。**
    与 PRCXI 不同，该设备 `device_name == resource_name == "gn_centrifuge_tube_liquid_handling"`（两者相同）。
    所有 `param` 键均为**小写蛇形**（如 `x_pos`/`y_pos`/`z1_pos`~`z4_pos`/`m_speed`/`ch1_reverse_aspirate`），
    **绝不可用 camelCase**（曾误写成 `Ch1ReverseAspirate`，设备不识别 → 静默失效）。关键约定
    （离心管单点测试全流程.json 实测，已与用户逐条确认）：
    - `X→x_pos`、`Y→y_pos`；Z 按轴写入：**`z1_pos`=八通道、`z2_pos`=大夹爪、`z3_pos`=单通道、`z4_pos`=小夹爪**
      。本设备无八通道/大夹爪节点时，`z1_pos`/`z2_pos` 保持 0。
    - **液体体积**：`p1_pos` = 单通道吸/放液量（µL）、`p2_pos` = 8 通道吸/放液量（µL）。
      例：单吸液 `cmd_type=24, p1_pos=1000`（=1000 µL）。
    - **气隙字段（≠ 液体量，切勿混用）**：`ch1_reverse_aspirate` = 反向吸液（吸液完成后**再吸一段空气**）、
      `ch1_blow` = 吹样（放液完成后**再吹一段空气**）；8 通道为 `ch8_reverse_aspirate` / `ch8_blow`。
      未指定时保持原值 0；**绝不要把液体量写进气隙字段**（曾误把 1000 写进 `ch1_reverse_aspirate`）。
    - 速度：`m_speed`/`x_speed`/`y_speed`/`z1_speed`~`z4_speed` 默认 **300**；`p1_speed`/`p2_speed` **不设置**（除非用户明确要求）。
    - `cmd_type`：footer 带 `NN=` 前缀时覆盖为 NN；无前缀（复位 / 开盖）保留现有值。
    - 坐标来源（txt 的 `PositionInfo` 标定表）：板位 `SbsSlots[Index=N]` 内按轴取 `Channel1`/`Channel8`/`BigGripper`/`SmallGripper`；
      盖子 `LidSlots[Index=N]`；废弃槽 `WasteSlots[Index=N]`；瓶子 `LargeBottles`/`SmallBottles`；超声处 `SbsSlot16`（小瓶=`SmallGripper`，大瓶=`SmallGripper2`）。
      无编号瓶子默认 1 号位；小瓶盖=`LidSlots[10]`、大瓶盖=`LidSlots[1]`。
    - 非板位动作（超神波混匀 / 复位）：坐标保持 0，只设时间/速度类参数。
    - 完整 param schema 见 `references/schema.md` §4.4。

## Mandatory device-operation conventions (reset & protocol wrapping)

These three rules are **non-negotiable process rules** confirmed by the user against the reference
workflow `金四面体AA溶液制备与溶液的混合，并放到T16等待离心.json`. They MUST be baked into every
generated chain — **never hand-assemble bare action nodes**; route everything through the wrappers in
`prcxi_factory.py` so compliance is structural, not manual.

1. **Every device resets at start and end.** Before the first action of a device and after its last
   action, insert that device's reset node. Use `wrap_device_reset(block, device, **opts)`.
2. **Centrifuge (`gn_centrifuge`) and rotary stack (`gn_rotary_stack`) reset before AND after every
   sub-action.** Each individual action of these two devices is wrapped in reset nodes on both sides.
   Use `wrap_per_action_reset(actions, device, **opts)`.
3. **Every 9320 (PRCXI) action is wrapped: `auto-create_protocol` → action(s) → `auto-run_protocol`.**
   Use `prcxi_block(create_footer, run_footer, *actions)`. (The PRCXI station has no standalone reset
   node — its init/teardown is the create→run envelope.)

### Reset command map (verbatim from reference files)

| Device | Reset mechanism | Command / template | Param source |
|---|---|---|---|
| `gn_solid_weighing` | `auto-execute_command` cmd20 (all-zero) | template `c7c5eb46-…` (same as solid action) | `SOLID_RESET_PARAM` |
| `gn_rotary_stack` | `auto-execute_command` cmd7 (all-zero) | template `6b08ef44-…` | deep-copy from reference via `find_cmd7_param()` |
| `gn_centrifuge` | `auto-execute_command` cmd8 (all-zero) | template `7e175cf2-3149-4805-96cc-5e7a48b17e41` | `CENTRIFUGE_RESET_PARAM` |
| `gn_centrifuge_tube_liquid_handling` | `auto-reset` (empty param) | template `6c1ec551-…` | `tube_reset()` |
| `gn_robotic_arm` | `auto-execute_command` cmd7 (`RobotCommand.RESET=7`) | **template_uuid UNKNOWN** | `arm_reset(tpl_uuid, …)` — caller must supply |

> ⚠️ The `gn_robotic_arm` reset has **no reference node anywhere** — its `template_uuid` is unknown.
> `arm_reset()` requires the caller to pass it explicitly; `device_reset('gn_robotic_arm', arm_tpl=…)`
> will raise if omitted. The `gn_rotary_stack` reset param must be deep-copied from the target reference
> file (it varies), so `device_reset('gn_rotary_stack', cmd7_param=…)` / `wrap_*` require `cmd7_param`.
>
> **Arm exemption:** `gn_robotic_arm` is **exempt from rule ①** in both the factory, the export
> (`exportUniLabWorkflow`), and the validator (`validate_workflow.py`). Real GN reference workflows
> contain zero arm-reset nodes; the arm's action closure is guaranteed by **`pick` → `place` pairs**
> (the gold-tetrahedron reference has 20 picks each 100% followed by a place). Do **not** inject a
> placeholder arm-reset (wrong `template_uuid` → invalid import). If a real arm-reset template surfaces,
> supply it via `arm_reset(tpl_uuid, …)` and re-enable rule ① for the arm.

### Composing the wrappers (typical pattern)

```python
from prcxi_factory import (arm_pick, arm_place, move_plate, titration, solid, res,
                           build_workflow, find_cmd7_param,
                           wrap_device_reset, wrap_per_action_reset, prcxi_block,
                           centrifuge, mk_node, TPL)

c7  = find_cmd7_param(ref_nodes)                 # stack reset param (deep-copied)
tip = res('PRCXI_96_DeepWell5', 'e74c153c-…')

# 规则①：固体设备首尾复位
solid_block = wrap_device_reset(
    [solid(11, 0, 1150, '加样#1', weight=1280, material_z_pos=234000),
     solid(11, 0, 1150, '加样#2', weight=1280, material_z_pos=234000)],
    'gn_solid_weighing')

# 规则①②：离心机 —— 设备首尾复位 + 每步动作前后复位
cf_block = wrap_device_reset(
    wrap_per_action_reset([centrifuge(footer='离心加载板')], 'gn_centrifuge'),
    'gn_centrifuge')

# 规则③：9320 块 create→动作→run
p9320 = prcxi_block('协议创建', '协议执行',
                    move_plate(16, 15, tip, 'T16->T15'),
                    titration(tip, tip, tip, '加液'))

# 规则①②：堆栈（cmd7_param 透传到设备复位与逐动作复位）
stack_action = mk_node('auto-execute_command', TPL['stack'][0], 'auto-execute_command',
                       'gn_rotary_stack', 'gn_rotary_stack',
                       dict(c7, **{'cmd_type': 7, 'r_pos': 1}), '堆栈旋转(示例)')
stack_block = wrap_device_reset(
    wrap_per_action_reset([stack_action], 'gn_rotary_stack', cmd7_param=c7),
    'gn_rotary_stack', cmd7_param=c7)

chain = solid_block + cf_block + p9320 + stack_block
wf = build_workflow(chain, ref_uuid, 'compliant workflow')
```

`prcxi_factory.py`'s `__main__` builds exactly this chain and asserts all three rules → run it as a
self-check after editing the module.

## Workflow

### Build a new workflow

1. Load the user's reference workflow JSON. Copy its `target_lab_uuid` and `name` (or a derived name).
2. Extract the `cmd7` stack-reset `param` from the reference via `find_cmd7_param()` (do not hardcode).
3. Import the factory module and assemble a linear `chain` — **route every device through the reset /
   protocol wrappers** (see the wrapper composition example in the conventions section above):
   ```python
   from prcxi_factory import (arm_pick, arm_place, move_plate, titration, solid, res,
                              build_workflow, find_cmd7_param,
                              wrap_device_reset, wrap_per_action_reset, prcxi_block,
                              centrifuge, stack_reset, solid_reset, centrifuge_reset,
                              tube_reset, arm_reset, device_reset, mk_node, TPL)
   c7 = find_cmd7_param(ref_nodes)
   tip   = res('PRCXI_96_DeepWell5', 'e74c153c-a29f-4653-a665-b9e1cc1711a9')
   plate = res('PRCXI_96_DeepWell_3', 'f260b8ba-a629-42ea-8340-548d765b4479')
   water = res('PRCXI_nest_1_troughplate4', 'bd6f7d88-e96a-4efa-b8c6-f5514aeb7cdf')
   t15   = res('PRCXI_1250uL_Tips2', '695548f2-3e97-4913-a2c5-e19b3b07cac9')
   # 规则①/②/③: 用 wrap_device_reset / wrap_per_action_reset / prcxi_block 包裹动作，
   # 切勿裸拼 action 节点（否则会漏掉复位/协议包裹而违反工艺规则）
   chain = wrap_device_reset([solid(11, 0, 1150, '加样', weight=1280, material_z_pos=234000)],
                             'gn_solid_weighing')
   wf = build_workflow(chain, ref_uuid, 'my workflow')
   json.dump(wf, open(DST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
   ```
   Use `solid(cmd, x_pos, y_pos, footer, weight=..., material_z_pos=..., remove_static=...)` with the
   correct file-specific `cmd` (cmd9/19 or cmd10/18) and the `x_pos`/`y_pos` keys.
4. Run the validator (below). Fix any reported problems and re-run until clean.

### Validate a workflow

Run `scripts/validate_workflow.py <file.json>` (add `--json` for machine output). It checks:
top-level structure, topology (0 dangling / 1 root / 1 sink / 0 non-linear / all reachable),
liquid-handler `device_name==PRCXI` & `resource_name==liquid_handler.prcxi`,
solid `x_pos`/`y_pos`/`material_z_pos` non-null, and cmd11 `volune_weight` presence.
Exit code 0 = pass.

## Resources

### scripts/prcxi_factory.py
Reusable factory for the **GN workstation / PRCXI** example, with all pitfalls pre-fixed:
`mk_node`, `arm_pick`, `arm_place`, `move_plate`, `titration`, `create_protocol`, `run_protocol`,
`stack_reset`, `solid`, `res`, `build_workflow`, `find_cmd7_param`. Plus the **reset/protocol
compliance layer** (the three mandatory device-operation conventions): reset-node factories
`solid_reset`, `centrifuge_reset`, `tube_reset`, `arm_reset`, `device_reset`, the action factory
`centrifuge`, and the rule-enforcing wrappers `wrap_device_reset` (rule①), `wrap_per_action_reset`
(rule②), `prcxi_block` (rule③). This is the verified starting template — clone and extend it for other
Uni-Lab OS devices by swapping `device_name` / `resource_name` / `param` to that device's schema (read
from `unilabos/devices/...`).

### scripts/validate_workflow.py
Standalone validator (PRCXI/GN-focused checks). Usage: `python3 validate_workflow.py <workflow.json> [--json]`.
Extend its checks when validating other device families.

### Frontend stateful planner (`app.js`)
`exportUniLabWorkflow` no longer emits a fixed one-action-per-device skeleton. It converts the AI
theoretical-optimum `cond` into an **intent** (`recipeToIntent`), then `planUniLabWorkflow(intent)`
maintains a station-state model (`initStationState`: stack tip slots, 9320 mounted tip rack / reagent
trough volume) and **reasons** about material distribution:
- **取/换枪头**: if 9320 has no tip rack mounted → `emitPlaceTips` (arm `pick(stack)→place(9320)` +
  9320 `create/move_plate/run`), mirroring `从堆栈到9320三次放枪头.json`; after liquid ops →
  `emitTakeTips` (reverse) mirroring `从9320到堆栈三次取枪头.json`.
- **补**: if `trough.vol < total*vol` → `emitReplenish` (create→titration→run) mirroring `81次滴注.json`.
- **固体加料**: per material `emitSolidAdd` → 取桶(cmd9)→加料(cmd11)→放回(cmd19), wrapped with
  `wrapDeviceReset` (rule ①), mirroring `8通道加样.json` / `12通道加样.json`.
- **滴注**: `emitDripInjection` splits total into batches of 27 (create→titration×N→run), mirroring
  `81次滴注.json` (3×27=81).
All node `template_uuid`s reuse `UNILAB_TPL` (which matches the reference files' UUIDs). Rule ③ is
satisfied by every PRCXI block's create→…→run envelope; rule ① by solid/tube/centrifuge/quick/lock/
oven/vacuum resets; the arm is exempt (pick→place pairing). Verify changes headlessly with
`scripts/regen_export.js` + `validate_workflow.py`.

**Real deck registry (`DECKS`, in `app.js`).** The planner no longer reads a single hard-coded deck.
`DECKS = {prcxi, tube}` holds the **real 16-slot bench layout per process** (金球 / 金四面体 / MOF),
transcribed from 《纳米中心化学合成工作站最新台面布局》 and 《9320台面布局-金四面体合成(1)》
(4 columns × 4 rows, column-major). `DECK_PROCESS` ('aus' | 'autet' | 'mof') selects the active
process — it is also switchable from the device modal UI. `getDeck()` / `deckSlots()` / `deckFind()`
resolve tip slots, trough (reagent) slots, deep-well targets, transfer and waste slots; reagents are
looked up **by name** against real deck contents. Fallbacks: if a process has no tip slot (MOF),
empty `spare` slots are used; transfer falls back to the last spare slot. `REAGENT_STORAGE` /
`MOF_INFO` carry the real storage rules (4℃ / 28℃ / 现配现用, 8 MOF solvents, 13–20 powders).

### scripts/regen_export.js (no-browser export verification)
The frontend export lives in `app.js` (`exportUniLabWorkflow`) and can't be triggered headless. This
Node harness extracts the **pure** UNILAB mapping + planner block from `app.js` (between `const
UNILAB_LAB_UUID` and `function aiOptimumToRecipe` — this now includes the stateful `planUniLabWorkflow`
planner and its builders), runs it in a `vm` context, calls `recipeToIntent(cond)` →
`planUniLabWorkflow(intent)`, and writes `/Users/fenglongli/Downloads/unilab_workflow.json`. Use it to
regenerate + verify the on-disk file matches the fixed export without launching the browser, then run
`validate_workflow.py` on the result. Usage: `node scripts/regen_export.js` (paths absolute; tweak the
`cond`/`activeReaction` inside the driver for other reaction modes).

### references/schema.md
Full GN/PRCXI schema, the cmd-encoding tables, resource UUIDs, edge format, and the complete pitfall
list. Load this when details about a specific device's param fields are needed; treat it as the
reference example for the broader Uni-Lab OS device family.
