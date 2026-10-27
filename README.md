# unilabWorld — GN MOF 合成自动产线 · AI 世界模型

基于 ChemWorld 世界模型框架，新增 **GN 工站**（MOF / 金四面体材料合成自动产线）。
工站设备与动作定义源自 Uni-Lab-OS `unilabos/devices/workstation/GN`，布局参考
`D366深势Mof材料合成自动产线方案` PPT（代码为准）。

## 工站构成（11 台设备，对齐 `opcua_gn1.3.9(1).csv` 的 OPC UA 节点）

| 区域 | 设备（键名） |
|------|------|
| 控制 / 总控 | `system` 系统总控 |
| 仓储 / 耗材 | `stack` 旋转堆栈·耗材仓 |
| 执行 / 搬运 | `robot` 六轴机械臂 |
| 配料 / 液体处理 | `solid` 粉末加样仪、`tube` 离心管液体处理系统、`liquid` 9320 液体处理模块 |
| 分离 / 装配 | `centrifuge` 自动定位离心机、`quick` 快速载具更换模块、`lock` 锁紧机构 |
| 热处理 | `oven` 常规烘箱、`vacuum` 真空烘箱 |

> 说明：CSV 中 9320(`prcxi`) 现已作为独立设备键 `liquid`（9320 液体处理模块）单列；
> 离心管(`tubeh`) / 超声(`sonic`) / 磁力搅拌(`stirrer`) 仍分别是 `robot` 的动作目标、`tube` 的子功能（超声 / 磁力架）、`quick` 的磁力搅拌子功能，未单列。

前端渲染用的 `type` 映射（2D `DRAW` + 3D `world3d.js` 的 `BUILDERS`/`SIZE_TABLE`/`LABEL_HEIGHT`）：
`system` / `stack` / `liquid` / `robot` / `balance`(solid) / `tube` / `quick` / `centri`(centrifuge) / `lock` / `furnace`(oven) / `voven`(vacuum)。

## 目录结构
与 ChemWorld 一致：前端在 `wm_backend/static/`（6 页：`index`(总览-510)/`overview_photo`(总览-光催化闭环设计)/`lab`/`char`/`dft`/`recipe`，
共享 `assets/shell.js`、`assets/world3d.js`、`assets/data.js`、`assets/app.css`）；GN 产线页用 `assets/app.js`，
光催化总览页用 `assets/app_photo.js`（取自 ChemWorld 原版前端逻辑，含其 32 台光催化设备）；
设备清单在 `data/devices.csv`（GN 11 台）。

## 运行
```bash
cd wm_backend
pip install -r requirements.txt        # 本轻量副本未预装 venv，需先安装依赖
python main.py                          # 默认 8000 端口
# 或 ./run.sh
```
前端访问 http://127.0.0.1:8000/ （index / overview_photo / lab / char / dft / recipe）。

## 关键实现说明
- **五页 `window.PAGE_CONFIG.devices` 已改写为 GN 设备键**：`index` 展示全部 11 台；
  `lab`/`char`/`dft`/`recipe` 按产线语义映射（否则按模板原 OCM 设备键过滤会导致整页空白）。
- **AI 推演与表征图表已重主题化为金四面体 / MOF 语义**：页面标题、工作室名、图表标题
  （金四面体产率 / NEB 形成路径能垒 / 金四面体活性双描述符火山）、反应轨
  （主轨「金四面体合成」+ 副轨「MOF 应用」）、AI 叙事日志全部替换完成；底层 surrogate 产率模型
  与 OCM 文献库仍作占位引擎保留。物理约束细则（44 条）描述仍沿用甲烷偶联化学，属已知占位，
  待领域模型重建时再替换。
- **设备键 `tube` 即离心管液体处理系统**：前端 `DEVICES` 与后端 `data/devices.csv` 统一用
  `tube`（OPC UA 节点原名）。3D 渲染 `world3d.js` 中曾将 `tube` 误覆盖为管式炉
  （`makeTubeFurnace`），已修正为 `makeTubeHandler`；模板残留的 `DEV_PARAMS['tube']`（管式炉
  温度/气氛/还原退火）参数模板已不再绑定到该设备。
- **仿真路径** `SYN_PATH` / `EXP_PATH` 已重映射到有效 GN 设备键，AI 角色可在真实 GN 设备间巡游；
  相关 `OP_DUR`、`DEV_PARAMS`、`DEV_OPTPL` 已为全部 11 台 GN 设备补全。
- **双总览（GN 产线 + 光催化闭环）**：导航在 `shell.js` 统一维护——`index.html` 为「总览-510」
  （GN 合成产线，原「总览」改名），新增 `overview_photo.html`「总览-光催化闭环设计」
  （甲烷偶联光催化：ChemWorld 原版 32 台光催化设备 + 510 GN 11 台 Uni-Lab 设备，
  共 43 台；设备/推演/图表通过 `assets/app_photo.js` 独立加载，与 GN 的 `app.js` 互不干扰）。
  并入的 GN 设备键统一加 `gn_` 前缀（`gn_system`…`gn_vacuum`），避免与光催化设备
  `tube/centrifuge/oven/robot` 同名冲突；光催化管式炉 3D 渲染键由 `tube` 改为 `furnace`。
  `shell.js` 依据 `PAGE_CONFIG.theme` 区分两套主题：`photo` 主题注入光催化按钮集
  （反应：甲烷 / OER 目标：H₂O₂ + ⬇ Uni-Lab OS 导出）与 C2 产率文案，缺省 `gn` 主题保持
  金四面体 / MOF 语义不变。**光催化总览页的「⬇ Uni-Lab OS」与总览-510 共用同一后端接口
  `/api/generate-workflow`**：把当前 AI 最优条件编译为可在 510 GN 工站执行的 OPC UA
  工作流 JSON，涉及合成/后处理的设备操作可直接导出到 Uni-Lab OS 运行。
- **3 层楼式布局（photo 总览，43 台）**：`assets/app_photo.js` 的 `applyPageConfig()` 将 43 台
  设备排进 **3 层 × 每层 2 房**（1F：知识/核心 + 合成制备；2F：反应与气体 + 表征；
  3F：后处理 + 510 GN 产线），中间走廊 x≈0.5；设备尺寸较单列布局放大 60–110%，
  画布宽 1180、高 CV_H=3.0。`assets/world3d.js` photo 分支：**大画布 + 拖拽浏览**
  （左键平移 / 右键旋转 / 滚轮缩放 / 双击重置），缩放范围 0.28–6、dollySpeed 0.5。
- **房间化（photo 总览）**：6 个分区各自围成"实验隔间"——柔和色地板地毯、半透明
  矮围栏（前端留门洞）、四角立柱 + 顶部横梁、门匾（`.room-plaque-3d`，编号 01–06 + 分区名）；
  每层有楼层地板带与电梯井装饰（**不渲染 1F/2F/3F 层标牌**）。
  机器人 Bot-M 空闲时在 6 个房间门前**自主巡房**（走→门前停留观察→下一间，循环），
  AI 推演运行时转向目标设备干活；推演时不再自动拉走相机（photo 页相机跟随已禁用）。
  GN 5 页行为通过 `isPhoto` 分支完全隔离，不受影响。
- **工作流编辑器（workflow_editor.html，新增）**：画布式拖拽编排 Uni-Lab OS 工作流，
  供人工手动创建 / 修改两个总览导出的 `unilab_workflow.json`。
  - **节点库 = GN 真实资产**：`scripts/gen_gn_node_library.py` 从
    `/Users/fenglongli/Downloads/Uni-Lab-OS/unilabos/devices/workstation/GN` 的
    10 组真实设备驱动（`rotary_stack.py` 旋转堆栈 / `gn_centrifuge.py` / `gn_solid_weighing.py` /
    `gn_standard_oven.py` / `gn_vacuum_oven.py` / `gn_quick_carrier_exchange.py` /
    `gn_centrifuge_tube_liquid_handling.py` / `gn_locking_mechanism.py` / `robotic_arm.py` /
    PRCXI 移液工作站）+ 9 个真实工作流 JSON + `opcua_gn1.3.9.csv` 协议表提炼生成
    `static/assets/gn_node_library.js`（设备动作、参数默认值/范围、协议前缀全部来自真实资产）。
  - 交互：节点库拖入画布 / 节点拖动 / 右端口→左端口连线（edge 兼容 ready:source→ready:target）/
    滚轮缩放、空白平移 / 属性面板编辑动作与真实参数 / 分组 Group 与自定义命令节点。
  - 数据：完全兼容 Uni-Lab OS `{target_lab_uuid, name, data:{workflow_uuid, workflow_name, nodes, edges}}`
    结构（pose/param/footer/device_name/disabled 等字段齐全）；后端新增
    `GET /workflow_editor`、`GET /api/workflow-list`、`GET /api/workflow-open`、
    `POST /api/workflow-save`（保存至 `wm_backend/workflows/*.json`）。
  - 入口：两总览顶部导航「🛠️ 工作流编辑器」（`shell.js` NAV 第 3 项）。
  - 编辑产物可直接「⬇ 导出 Uni-Lab 工作流」下载并在 510 GN 工站 / Uni-Lab OS 运行。

## Ollama 冷加载与竞态修复（7B 策略器超时）
- 现象：启动后首个 /api/next 报「strategize 超过 35s 超时，回退确定性采集」，页面误判断连。
- 根因 1：Ollama 默认模型闲置 5 分钟即卸载，推演间隔一长就撞冷加载（本机实测 43–90s）。
- 修复 1：`app/llm.py` 的 `/api/generate` 请求体带 `"keep_alive":"1h"`——权重常驻 GPU 内存，
  消除「偶发冷加载」；首启冷加载由前端「🕐 模型预热中」横幅提示。
- 根因 2：启动后首请求与 warmup 后台线程并发抢 Ollama → 排队超时。
- 修复 2：`warmup()` 冷加载 generate 完成即置 `LLM_WARMUP_DONE`（xgboost 缓存移至标志后的
  后台线程）；`/api/health` 返回 `warmup_done`；`strategize_with_timeout` 提交前
  `_wait_for_warmup(55s)`（不计入外层超时）；`app.js`/`app_photo.js` 推演前轮询 health
  等待预热完成再咨询 7B（上限 100s，首轮不误回退，后续轮次全热）。
- 修复后实测：冷启动首推演 → 预热完成 → 7B 决策成功（used_model=True），无回退日志。

## 与模板的差异（仅 GN 工站相关）
- 新增 4 类 GN 专用设备（2D `DRAW` + 3D `BUILDERS`/`SIZE_TABLE`/`LABEL_HEIGHT`）。
- 设备清单、工站布局、参数模板均以 GN 产线为准；其余框架能力（世界模型、AI 推演、5 页结构）保持与模板一致。
