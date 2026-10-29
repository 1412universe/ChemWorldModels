/* ============================================================
   工作流编辑器 app_workflow.js  (v2)
   ------------------------------------------------------------
   · 节点库：window.GN_NODE_LIBRARY（真实 GN 设备驱动 + 真实工作流
     + OPC_UA协议1.4.0.xlsx 权威元数据：动作表 / 参数中文名 / 单位 /
     范围 / 说明 / 互锁）
   · 数据模型：完全兼容 Uni-Lab OS unilab_workflow.json
     {target_lab_uuid, name, data:{workflow_uuid, workflow_name, nodes, edges}}
   · 交互：节点库拖入 / 拖动 / 端口连线 / 平移缩放 / 网格吸附 /
     对齐辅助线 / 框选多选 / 撤销重做 / 复制粘贴 / 自动布局 /
     属性面板（中文名+单位+范围+默认值回填）/ 校验 / 迷你地图 /
     保存-打开-导出
   · 并行语义：DAG 隐式并行 —— 依赖不同的节点可同时执行；
     出度 ≥2 = 并行入口（青色），入度 ≥2 = 并行汇合（青色）；
     同一设备同时只能跑一个节点（设备锁，运行期由后端调度器裁决）。
   ============================================================ */
(function () {
  "use strict";

  var LIB = window.GN_NODE_LIBRARY || { devices: [], scriptNodes: [] };
  (function () {
    var devs = LIB.devices || [];
    for (var i = 0; i < devs.length; i++) {
      if (devs[i].id !== 'gn_centrifuge') continue;
      var acts = devs[i].actions || (devs[i].actions = []);
      var exists = acts.some(function (a) { return a && a.name === 'balance_plates'; });
      if (exists) break;
      acts.unshift({
        name: 'balance_plates',
        label: '反应板与配平板配平',
        inRealWorkflow: true,
        params: {
          reaction_number: { type: 'int', default: 1, meta: { key: 'reaction_number', label: '反应板工位', unit: '', desc: '机械手在离心机的第 1 个动作，即反应板' } },
          balance_number: { type: 'int', default: 2, meta: { key: 'balance_number', label: '天平工位', unit: '', desc: '离心机前面的天平，机械手第 2 个动作' } },
          counterweight_number: { type: 'int', default: 5, meta: { key: 'counterweight_number', label: '配平板堆栈号', unit: '', desc: '堆栈 5 号位' } },
          timeout: { type: 'float', default: 180, meta: { key: 'timeout', label: '超时', unit: '秒', desc: '单段抓放或称量的超时' } }
        }
      });
      break;
    }
  })();
  (function () {
    var keep = [
      'air_suck_volume', 'asp_flow_rates', 'asp_vols',
      'blow_out_air_volume', 'blow_out_air_volume_before', 'blow_sample_volume',
      'delays', 'dis_flow_rates', 'dis_vols',
      'dispensing_air_suck_position', 'dispensing_complete_z_position', 'dispensing_direction',
      'dispensing_method', 'hover_below_liquid_level', 'is_96_well', 'liquid_height',
      'mix_if_tip_touch', 'mix_liquid_height', 'mix_rate', 'mix_stage', 'mix_times',
      'mix_tip_touch_height', 'mix_tip_touch_offset_x', 'mix_vol', 'none_keys', 'offsets',
      'post_air_volume', 'post_discharge_pause_time_ms', 'sources', 'spread', 'suction_method',
      'targets', 'tip_racks', 'touch_tip', 'use_channels', 'z_start_point_offset_height'
    ];
    function extra(type, label, unit, desc) {
      return { type: type, omit: true, meta: { label: label, unit: unit || '', desc: desc || '' } };
    }
    var add = {
      air_suck_volume: extra('json', '吸液空气体积', 'µL', '吸液时的空气柱体积'),
      blow_sample_volume: extra('number', '吹样体积', 'µL', '吹出样品的体积'),
      dispensing_air_suck_position: extra('string', '排液吸气位置', '', ''),
      dispensing_complete_z_position: extra('string', '排液完成 Z 位置', '', ''),
      dispensing_direction: extra('string', '排液方向', '', 'X 或 Y'),
      mix_if_tip_touch: extra('bool', '混匀时触壁', '', ''),
      mix_tip_touch_height: extra('int', '混匀触壁高度', '', ''),
      mix_tip_touch_offset_x: extra('int', '混匀触壁 X 偏移', '', ''),
      suction_method: extra('string', '吸液方式', '', '')
    };
    var devs = LIB.devices || [];
    for (var i = 0; i < devs.length; i++) {
      if (devs[i].id !== 'PRCXI') continue;
      var acts = devs[i].actions || [];
      for (var j = 0; j < acts.length; j++) {
        if (!acts[j] || acts[j].name !== 'transfer_liquid') continue;
        var prev = acts[j].params || {};
        var next = {};
        keep.forEach(function (k) { next[k] = prev[k] || add[k]; });
        acts[j].params = next;
      }
    }
  })();
  (function () {
    var devs = LIB.devices || [];
    for (var i = 0; i < devs.length; i++) {
      if (devs[i].id !== 'PRCXI') continue;
      var acts = devs[i].actions || (devs[i].actions = []);
      if (acts.some(function (a) { return a && a.name === 'reset'; })) break;
      acts.push({
        name: 'reset',
        label: '复位',
        inRealWorkflow: true,
        params: {
          timeout: {
            type: 'int', min: 60, max: 600, default: 120,
            meta: {
              key: 'timeout', label: '超时', unit: '秒',
              desc: '等待 IAutomation.Reset 完成。协议要求正式调用至少 60 秒。'
            }
          }
        }
      });
      break;
    }
  })();
  var STATION_MAP = LIB.stationMap || {};
  var PROTO = LIB.protocol || {};

  // 设备主题色（按 1.4.0 设备模块顺序）
  var DEV_COLORS = {
    gn_locking_mechanism: '#f59e0b', gn_quick_carrier_exchange: '#ef4444',
    gn_centrifuge: '#6366f1', gn_centrifuge_tube_liquid_handling: '#14b8a6',
    gn_rotary_stack: '#0ea5e9', gn_stack: '#0ea5e9', gn_robotic_arm: '#ec4899',
    gn_solid_weighing: '#10b981', gn_standard_oven: '#f97316',
    gn_vacuum_oven: '#8b5cf6', gn_liquid_cooling: '#06b6d4',
    system: '#64748b', PRCXI: '#3b82f6'
  };
  var DEV_ICONS = {
    gn_locking_mechanism: '🔩', gn_quick_carrier_exchange: '🔁', gn_centrifuge: '🌀',
    gn_centrifuge_tube_liquid_handling: '🧪', gn_rotary_stack: '📦', gn_stack: '📦',
    gn_robotic_arm: '🦾', gn_solid_weighing: '⚖️', gn_standard_oven: '🔥',
    gn_vacuum_oven: '🫙', gn_liquid_cooling: '❄️', system: '🛡️', PRCXI: '💧'
  };
  function devColor(id) { return DEV_COLORS[id] || '#64748b'; }
  function devIcon(id) { return DEV_ICONS[id] || '⚙️'; }

  // ---------- 工具 ----------
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtTime(t) {
    var d = new Date(t * 1000);
    return d.getMonth() + 1 + '/' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  var canvas = document.getElementById('wfed-canvas');
  var svg = document.getElementById('wfed-svg');
  var wrap = document.getElementById('wfed-canvas-wrap');
  var emptyHint = document.getElementById('wfed-empty');
  var marqueeEl = document.getElementById('wfed-marquee');

  // ---------- 非阻塞提示（替代 alert / confirm / prompt） ----------
  // 原生 alert/confirm/prompt 会同步阻塞渲染主线程：弹窗没人点，页面就彻底冻结，
  // 自动化测试也会直接超时。这里统一换成画布内浮层：可叠加、可关闭、自动消失。
  var noteBox = null;
  function noteHost() {
    if (noteBox && noteBox.parentNode) return noteBox;
    noteBox = el('div', 'wfed-notes');
    wrap.appendChild(noteBox);
    return noteBox;
  }
  var NOTE_ICON = { err: '⛔', warn: '⚠️', ok: '✅', info: 'ℹ️' };
  function clearNotes() { if (noteBox) { noteBox.innerHTML = ''; } }

  /**
   * 浮层提示。
   * @param {string} kind  err | warn | ok | info
   * @param {string} title 标题
   * @param {string|string[]} body 正文（数组按行渲染）
   * @param {number} ms 自动消失毫秒；0 = 不自动消失
   */
  function note(kind, title, body, ms) {
    var host = noteHost();
    var lines = body == null ? [] : (Array.isArray(body) ? body : String(body).split('\n'));
    var card = el('div', 'wfed-note n-' + (kind || 'info'));
    card.innerHTML =
      '<div class="wn-head"><span class="wn-ico">' + (NOTE_ICON[kind] || 'ℹ️') + '</span>' +
      '<span class="wn-title">' + esc(title) + '</span>' +
      '<button class="wn-x" title="关闭">✕</button></div>' +
      (lines.length ? '<div class="wn-body">' +
        lines.map(function (l) { return '<div class="wn-line">' + esc(l) + '</div>'; }).join('') +
        '</div>' : '');
    host.appendChild(card);
    var kill = function () {
      card.classList.add('out');
      setTimeout(function () { if (card.parentNode) card.remove(); }, 200);
    };
    card.querySelector('.wn-x').addEventListener('click', kill);
    if (ms !== 0) setTimeout(kill, ms || (kind === 'err' ? 12000 : 5200));
    return card;
  }
  /** 非阻塞确认：确定 → onOk()，取消 → 什么都不做。 */
  function askConfirm(title, body, onOk, okLabel) {
    var host = noteHost();
    var lines = Array.isArray(body) ? body : String(body || '').split('\n');
    var card = el('div', 'wfed-note n-warn m-ask');
    card.innerHTML =
      '<div class="wn-head"><span class="wn-ico">❓</span>' +
      '<span class="wn-title">' + esc(title) + '</span></div>' +
      (lines.length ? '<div class="wn-body">' +
        lines.map(function (l) { return '<div class="wn-line">' + esc(l) + '</div>'; }).join('') +
        '</div>' : '') +
      '<div class="wn-actions"><button class="wn-cancel">取消</button>' +
      '<button class="wn-ok">' + esc(okLabel || '确定') + '</button></div>';
    host.appendChild(card);
    var kill = function () {
      card.classList.add('out');
      setTimeout(function () { if (card.parentNode) card.remove(); }, 200);
    };
    card.querySelector('.wn-cancel').addEventListener('click', kill);
    card.querySelector('.wn-ok').addEventListener('click', function () { kill(); onOk(); });
    return card;
  }
  /** 非阻塞输入：确定 → onOk(值)。 */
  function askPrompt(title, value, onOk) {
    var host = noteHost();
    var card = el('div', 'wfed-note n-info m-ask');
    card.innerHTML =
      '<div class="wn-head"><span class="wn-ico">✏️</span>' +
      '<span class="wn-title">' + esc(title) + '</span></div>' +
      '<div class="wn-actions"><input class="wn-input" type="text" />' +
      '<button class="wn-cancel">取消</button><button class="wn-ok">确定</button></div>';
    host.appendChild(card);
    var input = card.querySelector('.wn-input');
    input.value = value || '';
    var kill = function () {
      card.classList.add('out');
      setTimeout(function () { if (card.parentNode) card.remove(); }, 200);
    };
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); kill(); onOk(input.value); }
      else if (ev.key === 'Escape') { ev.preventDefault(); kill(); }
      ev.stopPropagation();
    });
    card.querySelector('.wn-cancel').addEventListener('click', kill);
    card.querySelector('.wn-ok').addEventListener('click', function () { kill(); onOk(input.value); });
    setTimeout(function () { input.focus(); input.select(); }, 30);
    return card;
  }

  // ---------- 状态 ----------
  function freshWorkflow(name) {
    var uuid = uid();
    return {
      target_lab_uuid: uid(),
      name: name || '未命名工作流',
      data: { workflow_uuid: uuid, workflow_name: name || '未命名工作流', nodes: [], edges: [], embeds: [] }
    };
  }
  var state = {
    wf: freshWorkflow(),
    view: { x: 40, y: 40, scale: 1 },
    selected: null,        // {type:'node'|'edge', id}
    selectedIds: {},       // uuid -> true（多选）
    linking: null,
    dragNode: null,
    dragMul: null,
    pan: null,
    marquee: null,
    ghost: null,
    guides: [],
    undo: [], redo: [],
    dirty: false,
    runState: {},          // uuid -> {state, lockedBy}
    edgeSvgMap: []
  };
  var GRID = 10;

  // ---------- 节点/动作解析 ----------
  function devOf(id) {
    for (var i = 0; i < LIB.devices.length; i++) if (LIB.devices[i].id === id) return LIB.devices[i];
    return null;
  }
  function devLabel(id) { var d = devOf(id); return d ? d.label : (id || '未指定设备'); }
  function actionOf(dev, actionName, cmdType) {
    var d = devOf(dev);
    if (!d) return null;
    for (var j = 0; j < d.actions.length; j++) {
      var a = d.actions[j];
      if (cmdType !== undefined && cmdType !== null && cmdType !== '' && a.cmdType !== undefined && a.cmdType === cmdType) return a;
    }
    for (var k = 0; k < d.actions.length; k++) {
      var b = d.actions[k];
      if (b.name !== undefined && b.name === actionName) return b;
    }
    return null;
  }
  function actionOfNode(n) {
    if (!n || !n.device_name) return null;
    return actionOf(n.device_name, n.name, (n.param || {}).cmd_type);
  }
  /** 节点的显示信息（设备中文名 / 动作中文名 / 指令号 / 图标 / 颜色） */
  function infoOf(n) {
    var d = devOf(n.device_name);
    var a = actionOfNode(n);
    if (n.type === 'Group') {
      return { dev: '流程分组', label: '分组 / 注释', color: '#94a3b8', icon: '📁', kind: 'group', cmd: null, proto: '' };
    }
    if (!n.device_name) {
      return { dev: '自定义命令', label: n.name || '命令', color: '#64748b', icon: '🖥️', kind: 'script', cmd: null, proto: '' };
    }
    var ct = (n.param || {}).cmd_type;
    return {
      dev: d ? d.label : n.device_name,
      label: a ? a.label : (n.name || '命令'),
      color: devColor(n.device_name),
      icon: devIcon(n.device_name),
      kind: a ? (a.cmdType !== undefined ? 'cmd' : 'name') : 'name',
      cmd: (ct !== undefined && ct !== null) ? ct : (a && a.cmdType !== undefined ? a.cmdType : null),
      proto: d ? (d.protocol || '') : '',
      legacy: !!(a && a.legacy)
    };
  }
  function refreshDisplay(n) {
    var info = infoOf(n);
    // 同时提供 dev/label 与 devLabel/actionLabel 两套键名：
    // 卡片渲染读 dev/label，属性面板与其它模块读 devLabel/actionLabel。
    // 之前只写了后者，导致节点标题渲染成 "undefined · gn_rotary_stack"。
    n._display = {
      dev: info.dev, devLabel: info.dev,
      label: info.label, actionLabel: info.label,
      color: info.color, icon: info.icon, kind: info.kind,
      cmd: info.cmd, proto: info.proto, legacy: info.legacy
    };
    return n._display;
  }

  // ---------- 节点构建 ----------
  function basePose(x, y) {
    return {
      layout: 'x-y', position: { x: x, y: y, z: 0 }, position_3d: { x: 0, y: 0, z: 0 },
      size: { width: 0, height: 0, depth: 0 }, scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 }, extra: null, cross_section_type: 'rectangle'
    };
  }
  function makeNode(dev, action, x, y) {
    var p = {};
    Object.keys((action && action.params) || {}).forEach(function (k) {
      var s = action.params[k];
      if (s && s.omit) return;
      p[k] = (s && s.default !== undefined) ? s.default : '';
    });
    if (action && action.cmdType !== undefined) p.cmd_type = action.cmdType;
    if (action && action.params && action.params.station && action.params.station.default !== undefined
        && typeof p.station === 'string') {
      p.station = action.params.station.default;
    }
    var n = {
      uuid: uid(), parent_uuid: '', name: (action && action.name) || 'auto-execute_command',
      type: 'ILab', icon: '', pose: basePose(x, y), param: p, footer: '',
      device_name: dev, disabled: false, minimized: false, lab_node_type: 'Device',
      template_uuid: '', template_name: (action && action.name) || 'auto-execute_command',
      resource_name: dev
    };
    if (action && action.cmdType !== undefined) { n.template_name = 'auto-execute_command'; }
    refreshDisplay(n);
    return n;
  }
  function makeGroup(x, y) {
    return {
      uuid: uid(), parent_uuid: '', name: 'group', type: 'Group', icon: '',
      pose: basePose(x, y), param: null, footer: '', disabled: false, minimized: false,
      lab_node_type: 'Device', template_uuid: '', template_name: '', resource_name: ''
    };
  }
  function makeScript(name, x, y) {
    var n = makeNode('', { label: name, name: name, params: {} }, x, y);
    n.device_name = ''; n.template_name = name;
    refreshDisplay(n);
    return n;
  }

  // ---------- 撤销 / 重做 ----------
  function snapshot() {
    return JSON.stringify({
      nodes: state.wf.data.nodes, edges: state.wf.data.edges,
      embeds: state.wf.data.embeds || []
    });
  }
  function pushUndo() {
    state.undo.push(snapshot());
    if (state.undo.length > 60) state.undo.shift();
    state.redo.length = 0;
  }
  function applySnap(s) {
    var o = JSON.parse(s);
    state.wf.data.nodes = o.nodes; state.wf.data.edges = o.edges;
    state.wf.data.embeds = o.embeds || state.wf.data.embeds || [];
    state.wf.data.nodes.forEach(refreshDisplay);
    state.selectedIds = {}; state.selected = null;
    renderNodes(); showProps(); updateStats(); afterChange();
  }
  function undo() { if (!state.undo.length) return; state.redo.push(snapshot()); applySnap(state.undo.pop()); }
  function redo() { if (!state.redo.length) return; state.undo.push(snapshot()); applySnap(state.redo.pop()); }

  // ---------- 渲染：节点 ----------
  var NODE_W = 236;
  function nodeEl(n) {
    var disp = n._display || refreshDisplay(n);
    var d = el('div', 'wfnode' + (n.disabled ? ' disabled' : ''));
    d.dataset.uuid = n.uuid;
    if (state.selectedIds[n.uuid]) d.classList.add('selected');
    var rs = state.runState[n.uuid];
    if (rs) {
      d.classList.add('has-state', 'st-' + (rs.state || 'pending'));
      if (rs.locked) d.classList.add('st-locked');
    }
    d.appendChild(el('div', 'wfnode-band'));
    d.querySelector('.wfnode-band').style.background = disp.color;

    var sub = (n.type === 'Group') ? '流程分组 / 注释'
      : (disp.dev + ' · ' + esc(n.device_name || '—') + (disp.proto ? ' · ' + esc(disp.proto) : ''));
    var head = el('div', 'wfnode-head',
      '<span class="n-ico">' + disp.icon + '</span>' +
      '<div class="n-main">' +
        '<div class="n-title">' + esc(disp.label) + '</div>' +
        '<div class="n-sub">' + sub + '</div>' +
      '</div>' +
      (n.disabled ? '<span class="n-badge off" title="运行时跳过，沿连线走向下一节点">禁用</span>' : '') +
      (n._embed ? '<span class="n-badge embed" title="跟随模版「' + esc(n._embed.templateName || '') + '」，改模版后这里一起变">模版</span>' : '') +
      (disp.kind === 'group' ? '<span class="n-badge" style="background:#94a3b8">分组</span>'
        : disp.kind === 'script' ? '<span class="n-badge" style="background:#64748b">脚本</span>'
        : '<span class="n-badge" style="background:' + disp.color + '">' + (disp.cmd != null ? '#' + disp.cmd : '动作') + '</span>'));
    d.appendChild(head);

    var body = el('div', 'wfnode-body');
    if (n.type !== 'Group') {
      var tbl = el('div', 'wfnode-ptable');
      var rows = keyParamRows(n).slice(0, 3);
      if (!rows.length) tbl.appendChild(el('div', 'wfnode-prow more', '<span class="pk">无参数</span>'));
      rows.forEach(function (r) {
        tbl.appendChild(el('div', 'wfnode-prow',
          '<span class="pk">' + esc(r.label) + '</span>' +
          '<span class="pv">' + esc(fmtVal(r.value)) + '</span>' +
          (r.unit ? '<span class="pu">' + esc(r.unit) + '</span>' : '')));
      });
      var total = actionParamKeys(n).length;
      if (total > rows.length) {
        tbl.appendChild(el('div', 'wfnode-prow more', '<span class="pk">还有 ' + (total - rows.length) + ' 项参数…</span>'));
      }
      body.appendChild(tbl);
      var ft = n.footer || '';
      body.appendChild(el('div', 'wfnode-footer' + (ft ? '' : ' ph'),
        esc(ft || '双击写步骤说明')));
    } else {
      body.appendChild(el('div', 'wfnode-footer', esc(n.footer || '流程分组 / 注释节点')));
    }
    d.appendChild(body);

    if (n.type !== 'Group') {
      var dis = el('span', 'wfnode-dis' + (n.disabled ? ' on' : ''), n.disabled ? '↻' : '⊘');
      dis.title = n.disabled ? '启用此节点' : '禁用此节点（运行时跳过）';
      d.appendChild(dis);
    }
    d.appendChild(el('span', 'wfnode-del', '✕'));
    d.appendChild(el('span', 'st-dot', ''));
    d.appendChild(el('span', 'lockflag', '设备占用'));
    d.appendChild(el('span', 'port in', ''));
    d.appendChild(el('span', 'port out', ''));
    d.appendChild(el('span', 'plabel in', '入'));
    d.appendChild(el('span', 'plabel out', '出'));
    return d;
  }
  function fmtVal(v) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') return (Math.abs(v) >= 1000 ? String(v) : String(v));
    if (typeof v === 'boolean') return v ? '开' : '关';
    var s = String(v);
    return s.length > 12 ? s.slice(0, 11) + '…' : s;
  }
  /** 属性面板和卡片要列出的键：以当前动作的驱动签名为准 */
  function actionParamKeys(n) {
    var a = actionOfNode(n);
    var keys = (a && a.params) ? Object.keys(a.params) : [];
    if (keys.length) return keys;
    return Object.keys(n.param || {}).filter(function (k) { return k !== 'cmd_type'; });
  }
  /** 卡片上"最值得一看"的参数：优先有协议中文名、排除 timeout */
  function keyParamRows(n) {
    var a = actionOfNode(n), rows = [];
    actionParamKeys(n).forEach(function (k) {
      if (k === 'cmd_type') return;
      var sch = (a && a.params && a.params[k]) || {};
      var meta = sch.meta || {};
      rows.push({
        key: k, label: meta.label || k, unit: meta.unit || '',
        value: shownParam(n, k), prio: (meta.label ? 2 : 1) - (k === 'timeout' ? 1 : 0), desc: meta.desc || ''
      });
    });
    rows.sort(function (x, y) { return y.prio - x.prio; });
    return rows;
  }

  function renderNodes() {
    var frag = document.createDocumentFragment();
    state.wf.data.nodes.forEach(function (n) { frag.appendChild(nodeEl(n)); });
    canvas.innerHTML = '';
    canvas.appendChild(frag);
    updatePositions();
  }

  // ---------- 坐标体系 ----------
  // 关键约定（改之前请先读这段，否则很容易又踩回去）：
  //   · 世界坐标（world）：节点 pose.position，单位是「未缩放的画布像素」。
  //   · 视图坐标（view）：相对 #wfed-canvas-wrap 左上角的屏幕像素。
  //   · 换算：view = world * scale + (view.x, view.y)
  // 节点层 #wfed-canvas 与连线层 #wfed-svg 共用同一个
  //   transform: translate(view.x, view.y) scale(scale)
  // 所以节点卡片只写 translate(world)，连线也只写世界坐标。
  // ⚠ 历史坑：曾经节点层整体 scale()，而节点又写 world*scale+view.x，
  //   坐标被缩放两次、尺寸只缩放一次 → 放大时内容飞出屏幕、连线脱离节点。
  function nodeRect(uuid) {
    var n = findNode(uuid);
    if (!n) return null;
    var d = canvas.querySelector('[data-uuid="' + uuid + '"]');
    var h = d ? d.offsetHeight : 132;
    return { x: n.pose.position.x, y: n.pose.position.y, w: NODE_W, h: h };
  }
  /** 视图坐标下的节点矩形（用于框选命中、连线预览等屏幕空间判断）。 */
  function nodeScreenRect(uuid) {
    var r = nodeRect(uuid);
    if (!r) return null;
    var s = state.view.scale;
    return { x: r.x * s + state.view.x, y: r.y * s + state.view.y,
             w: r.w * s, h: r.h * s, nodeH: r.h };
  }
  // 端口在卡片内的纵向位置（世界像素）：色带 + 头部高度
  var PORT_DY = 50;

  function updatePositions() {
    var map = {};
    state.wf.data.nodes.forEach(function (n) { map[n.uuid] = n; });
    Array.prototype.forEach.call(canvas.children, function (d) {
      var n = map[d.dataset.uuid];
      if (!n) return;
      d.style.transform = 'translate(' + n.pose.position.x + 'px,' + n.pose.position.y + 'px)';
    });
    renderEdges();
    renderMinimap();
    updateShare();
  }

  // ---------- 渲染：连线（含并行语义着色） ----------
  function edgeKindMap() {
    var outDeg = {}, inDeg = {};
    state.wf.data.edges.forEach(function (e) {
      outDeg[e.source_node_uuid] = (outDeg[e.source_node_uuid] || 0) + 1;
      inDeg[e.target_node_uuid] = (inDeg[e.target_node_uuid] || 0) + 1;
    });
    return { outDeg: outDeg, inDeg: inDeg };
  }
  function edgeKind(e) {
    if (e.source_handle_key && e.source_handle_key !== 'ready') return 'material';
    if (e.target_handle_key && e.target_handle_key !== 'ready') return 'material';
    var m = edgeKindMap();
    if ((m.outDeg[e.source_node_uuid] || 0) > 1 || (m.inDeg[e.target_node_uuid] || 0) > 1) return 'parallel';
    return 'dep';
  }
  function edgeId(e) { return e.uuid || (e.source_node_uuid + '>' + e.target_node_uuid); }

  function renderEdges() {
    var ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = svg.querySelector('defs') ? '' : '';
    var defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8b9db8"/></marker>' +
      '<marker id="arr-par" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488"/></marker>' +
      '<marker id="arr-mat" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706"/></marker>';
    svg.appendChild(defs);
    state.edgeSvgMap = [];

    state.wf.data.edges.forEach(function (e) {
      var a = nodeRect(e.source_node_uuid), b = nodeRect(e.target_node_uuid);
      if (!a || !b) return;
      // 连线层与节点层共用同一个变换，所以这里全部用世界坐标
      var x1 = a.x + a.w, y1 = a.y + PORT_DY;
      var x2 = b.x, y2 = b.y + PORT_DY;
      var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
      var dAttr = 'M' + x1 + ' ' + y1 +
        ' C' + (x1 + dx) + ' ' + y1 + ',' + (x2 - dx) + ' ' + y2 + ',' + x2 + ' ' + y2;
      var hit = document.createElementNS(ns, 'path');
      hit.setAttribute('d', dAttr);
      hit.setAttribute('class', 'wfedge-hit');
      hit.dataset.edge = edgeId(e);
      svg.appendChild(hit);
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', dAttr);
      path.dataset.edge = edgeId(e);
      var k = edgeKind(e);
      var cls = 'wfedge' + (k === 'parallel' ? ' parallel' : k === 'material' ? ' material' : '');
      if (state.selected && state.selected.type === 'edge' && state.selected.id === edgeId(e)) cls += ' selected';
      path.setAttribute('class', cls);
      path.dataset.id = edgeId(e);
      svg.appendChild(path);
      state.edgeSvgMap.push({ id: edgeId(e), el: path });
    });

    if (state.linking) {
      var p2 = document.createElementNS(ns, 'path');
      p2.setAttribute('d', 'M' + state.linking.sx + ' ' + state.linking.sy +
        ' C' + (state.linking.sx + 70) + ' ' + state.linking.sy + ',' +
        (state.linking.vx - 70) + ' ' + state.linking.vy + ',' + state.linking.vx + ' ' + state.linking.vy);
      p2.setAttribute('class', 'wfedge-drag');
      svg.appendChild(p2);
    }
  }

  // ---------- 视图 ----------
  function applyView() {
    // 节点层与连线层必须用完全相同的变换，否则连线会脱离节点
    var t = 'translate(' + state.view.x + 'px,' + state.view.y + 'px) scale(' + state.view.scale + ')';
    canvas.style.transform = t;
    canvas.style.transformOrigin = '0 0';
    svg.style.transform = t;
    svg.style.transformOrigin = '0 0';
    var hint = document.getElementById('wfed-zoomhint');
    if (hint) hint.textContent = Math.round(state.view.scale * 100) + '%';
  }
  function screenToCanvas(sx, sy) {
    return { x: (sx - state.view.x) / state.view.scale, y: (sy - state.view.y) / state.view.scale };
  }
  function setZoom(ns, cx, cy) {
    ns = Math.min(2.5, Math.max(0.2, ns));
    var old = state.view.scale;
    var px = (cx - state.view.x) / old, py = (cy - state.view.y) / old;
    state.view.scale = ns;
    state.view.x = cx - px * ns;
    state.view.y = cy - py * ns;
    applyView(); updatePositions();
  }
  function fitView(pad) {
    pad = pad == null ? 60 : pad;
    var ns = state.wf.data.nodes;
    if (!ns.length) { state.view = { x: 40, y: 40, scale: 1 }; applyView(); updatePositions(); return; }
    var cr = wrap.getBoundingClientRect();
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    ns.forEach(function (n) {
      var h = (canvas.querySelector('[data-uuid="' + n.uuid + '"]') || {}).offsetHeight || 132;
      minX = Math.min(minX, n.pose.position.x);
      minY = Math.min(minY, n.pose.position.y);
      maxX = Math.max(maxX, n.pose.position.x + NODE_W);
      maxY = Math.max(maxY, n.pose.position.y + h);
    });
    var s = Math.min((cr.width - pad * 2) / Math.max(1, maxX - minX), (cr.height - pad * 2) / Math.max(1, maxY - minY));
    s = Math.min(1.6, Math.max(0.2, s));
    state.view.scale = s;
    state.view.x = pad - minX * s + Math.max(0, (cr.width - pad * 2 - (maxX - minX) * s) / 2);
    state.view.y = pad - minY * s + Math.max(0, (cr.height - pad * 2 - (maxY - minY) * s) / 2);
    applyView(); updatePositions();
  }

  // ---------- 画布占比（画布面积 / 屏幕面积） ----------
  // 目标：画布面积 ≥ 屏幕面积 80%。侧栏宽度不是写死的，而是反解出来的——
  //   canvasW = 目标面积 / mainH；p = (VW - canvasW) / 2
  // 再夹到 [PANEL_MIN, PANEL_MAX]：宁可让占比略低于 80%，也不把侧栏压到不可读。
  var PANEL_MIN = 104, PANEL_MAX = 172, SHARE_TARGET = 80.2;
  var shareTimer = null;

  function tunePanels() {
    var main = document.getElementById('wfed-main');
    if (!main) return;
    var libC = document.body.classList.contains('lib-collapsed');
    var propC = document.body.classList.contains('prop-collapsed');
    // 内联自定义属性优先级高于 .lib-collapsed 的类规则，折叠时必须先撤掉内联值，
    // 否则调优算出的 --libw 会把折叠态重新撑开。
    if (libC) main.style.removeProperty('--libw');
    if (propC) main.style.removeProperty('--propw');
    if (libC && propC) return;                       // 两侧都收成图标条，无需调优

    var vw = window.innerWidth, vh = window.innerHeight;
    var mainH = main.getBoundingClientRect().height;
    if (!mainH || !vw || !vh) return;

    var needW = (SHARE_TARGET / 100) * vw * vh / mainH;   // 达标所需画布宽度
    var rails = (libC ? 30 : 0) + (propC ? 34 : 0);       // 已折叠侧的图标条宽度
    var oneSide = libC || propC;
    var total = Math.max(0, vw - needW - rails);          // 展开侧可分到的总宽度
    var lo = oneSide ? PANEL_MIN : PANEL_MIN * 2;
    var hi = oneSide ? PANEL_MAX : PANEL_MAX * 2;
    total = Math.max(lo, Math.min(hi, total));

    if (!oneSide) {
      var lib = Math.round(total * 0.475);
      main.style.setProperty('--libw', lib + 'px');
      main.style.setProperty('--propw', Math.round(total) - lib + 'px');
    } else if (libC) {
      main.style.setProperty('--propw', Math.round(total) + 'px');
    } else {
      main.style.setProperty('--libw', Math.round(total) + 'px');
    }
    // 侧栏太窄时把节点库切成「轨道 + 悬停浮出」模式，否则动作名只能显示 2 个字
    var libPx = libC ? 0 : (oneSide ? (propC ? total : 0) : parseFloat(main.style.getPropertyValue('--libw')) || 999);
    // 右栏同理镜像判定（--propw 在「两侧都展开」时才写内联；折叠侧宽度由类规则给出）
    var propPx = propC ? 0 : (oneSide ? (libC ? total : 0) : parseFloat(main.style.getPropertyValue('--propw')) || 999);
    document.body.classList.toggle('libnarrow', libPx > 0 && libPx < 172);
    document.body.classList.toggle('propnarrow', propPx > 0 && propPx < 172);
  }

  function updateShare() {
    var box = document.getElementById('wf-share');
    if (!box) return;
    var r = wrap.getBoundingClientRect();
    var share = (r.width * r.height) / (window.innerWidth * window.innerHeight) * 100;
    box.textContent = '画布 ' + share.toFixed(1) + '%';
    box.title = '画布 ' + Math.round(r.width) + '×' + Math.round(r.height) +
      ' / 屏幕 ' + window.innerWidth + '×' + window.innerHeight + '（目标 ≈80%）';
    box.classList.toggle('low', share < 79.5);
  }

  // 先按目标重排侧栏，再汇报占比（避免汇报的是调整前的旧值）
  function refitShare() {
    tunePanels();
    updateShare();
    renderMinimap();
    if (shareTimer) clearTimeout(shareTimer);
    shareTimer = setTimeout(function () { tunePanels(); updateShare(); renderMinimap(); }, 60);
  }

  // ---------- 迷你地图 ----------
  function renderMinimap() {
    var mm = document.getElementById('wfed-minimap');
    if (!mm) return;
    var ns = state.wf.data.nodes;
    Array.prototype.slice.call(mm.querySelectorAll('.mm-node,.mm-view')).forEach(function (e) { e.remove(); });
    if (!ns.length) return;
    var W = mm.clientWidth, H = mm.clientHeight;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    ns.forEach(function (n) {
      var h = (canvas.querySelector('[data-uuid="' + n.uuid + '"]') || {}).offsetHeight || 132;
      minX = Math.min(minX, n.pose.position.x); minY = Math.min(minY, n.pose.position.y);
      maxX = Math.max(maxX, n.pose.position.x + NODE_W); maxY = Math.max(maxY, n.pose.position.y + h);
    });
    var pad = 24;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var s = Math.min(W / (maxX - minX), H / (maxY - minY));
    ns.forEach(function (n) {
      var h = (canvas.querySelector('[data-uuid="' + n.uuid + '"]') || {}).offsetHeight || 132;
      var d = el('div', 'mm-node');
      var disp = n._display || {};
      d.style.background = disp.color || '#94a3b8';
      d.style.left = ((n.pose.position.x - minX) * s) + 'px';
      d.style.top = ((n.pose.position.y - minY) * s) + 'px';
      d.style.width = Math.max(3, NODE_W * s) + 'px';
      d.style.height = Math.max(2, h * s) + 'px';
      mm.appendChild(d);
    });
    // 视口框
    var cr = wrap.getBoundingClientRect();
    var c0 = screenToCanvas(0, 0), c1 = screenToCanvas(cr.width, cr.height);
    var v = el('div', 'mm-view');
    v.style.left = ((c0.x - minX) * s) + 'px';
    v.style.top = ((c0.y - minY) * s) + 'px';
    v.style.width = Math.max(4, (c1.x - c0.x) * s) + 'px';
    v.style.height = Math.max(4, (c1.y - c0.y) * s) + 'px';
    mm.appendChild(v);
  }

  // ---------- 节点库：功能类别 → 设备驱动 → 节点（三级，默认只到「设备驱动」这一层） ----------
  // 为什么分层：OPC UA 1.4.0 一共 13 个设备驱动、149 个动作。
  // 全部平铺在一起要滚很久，而且看不出「这个动作属于哪台设备」。
  //   第 1 层 功能类别  —— 物料转运 / 离心配液 / 称量加样 / 温控热处理 / 系统与脚本
  //   第 2 层 设备驱动  —— 图标 + 中文名 + 驱动 id + 节点数（点一行钻进第 3 层）
  //   第 3 层 节点/动作 —— 「＋」追加到画布中心，或直接拖到画布上放置
  // 搜索时跨层平铺：跨过类别与驱动，直接把命中的节点按驱动分组列出来。
  var libFilter = 'all';
  var CATEGORIES = [
    { id: 'all', label: '全部', icon: '🗂️', devs: null },
    { id: 'transport', label: '物料转运', icon: '🔄',
      devs: ['gn_quick_carrier_exchange', 'gn_locking_mechanism', 'gn_rotary_stack', 'gn_stack', 'gn_robotic_arm'] },
    { id: 'liquid', label: '离心配液', icon: '🧪',
      devs: ['gn_centrifuge', 'gn_centrifuge_tube_liquid_handling', 'PRCXI'] },
    { id: 'weigh', label: '称量加样', icon: '⚖️', devs: ['gn_solid_weighing'] },
    { id: 'thermal', label: '温控热处理', icon: '🌡️',
      devs: ['gn_standard_oven', 'gn_vacuum_oven', 'gn_liquid_cooling'] },
    { id: 'system', label: '系统与脚本', icon: '🛡️', devs: ['system', '__special__'] },
  ];
  // 特殊节点：流程分组容器 + 真实工作流里出现过的脚本节点
  var SPECIAL_DEV = {
    id: '__special__', label: '特殊节点', protocol: '内置', protocolNodes: 0,
    desc: '流程分组容器，以及真实工作流里出现过的自定义脚本节点',
    actions: [{ label: '流程分组 Group', special: 'group', _ico: '📁', inRealWorkflow: true }]
      .concat((LIB.scriptNodes || []).map(function (s) {
        var nm = s && s.name ? s.name : String(s);
        return { label: nm, special: 'script', _ico: '🖥️', inRealWorkflow: true };
      }).filter(function (a) { return a.label !== 'group'; }))
  };
  var libCat = 'all';    // 当前功能类别
  var libDev = null;     // 当前钻进去的设备驱动 id（null = 停在驱动列表）
  var setPinnedFn = null; // bind() 里实现（窄侧栏「固定展开」）
  var setPropPinnedFn = null; // bind() 里实现（窄右栏「固定展开」，与左栏对称）

  function libDevById(id) {
    if (id === '__special__') return SPECIAL_DEV;
    for (var i = 0; i < LIB.devices.length; i++) if (LIB.devices[i].id === id) return LIB.devices[i];
    return null;
  }
  // gn_stack 与 gn_rotary_stack 读的是同一个 Stack_ 模块（真实工作流里用的是后者），
  // 节点库里合并成一行显示，否则看起来像两台设备。
  var DEV_ALIAS = { gn_stack: 'gn_rotary_stack' };
  var DEV_ALIAS_OF = { gn_rotary_stack: ['gn_stack'] };
  function canonDevId(id) { return DEV_ALIAS[id] || id; }
  function dedupeDevs(list) {
    var seen = {}, out = [];
    list.forEach(function (d) {
      var c = canonDevId(d.id);
      if (seen[c]) return;
      seen[c] = 1;
      out.push(d);
    });
    return out;
  }
  function catDevs(cat) {
    if (cat.id !== 'all') {
      return dedupeDevs((cat.devs || []).map(libDevById).filter(Boolean));
    }
    var seen = {}, out = [];
    CATEGORIES.forEach(function (c) {
      (c.devs || []).forEach(function (id) {
        var c2 = canonDevId(id);
        if (seen[c2]) return; seen[c2] = 1;
        var d = libDevById(id); if (d) out.push(d);
      });
    });
    // 兜底：库里有、但没被归类的驱动也要能看到
    LIB.devices.forEach(function (d) {
      var c2 = canonDevId(d.id);
      if (seen[c2]) return; seen[c2] = 1; out.push(d);
    });
    return out;
  }
  function catOfDev(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if ((CATEGORIES[i].devs || []).indexOf(id) >= 0) return CATEGORIES[i];
    }
    return null;
  }
  /** 当前筛选条件下的动作子集（特殊节点不受筛选影响，永远是全量） */
  function actsOf(d) {
    if (d.id === '__special__') return d.actions;
    return d.actions.filter(function (a) {
      if (libFilter === 'real' && !a.inRealWorkflow) return false;
      if (libFilter === 'cmd' && a.cmdType === undefined) return false;
      return true;
    });
  }
  function actHay(d, a) {
    return (d.label + ' ' + d.id + ' ' + (d.desc || '') + ' ' + a.label + ' ' + (a.name || '') +
      (a.cmdType !== undefined ? ' #' + a.cmdType + ' c' + a.cmdType : '')).toLowerCase();
  }

  function actItem(d, a) {
    var special = a.special || '';
    var isCmd = a.cmdType !== undefined;
    var mark = special ? ''
      : a.legacy ? '<span class="la-tag legacy" title="1.3.9 遗留、1.4.0 已下线">遗留</span>'
        : a.inRealWorkflow ? '<span class="la-tag real" title="真实工作流里出现过 ' + (a.count || 0) + ' 次">真实' + (a.count ? ' ' + a.count : '') + '</span>'
          : '';
    var item = el('div', 'lib-act' + (special ? ' special' : isCmd ? ' cmd' : ' pname'));
    item.innerHTML =
      '<span class="la-code">' + (special ? (a._ico || '•') : isCmd ? '#' + a.cmdType : 'ƒ') + '</span>' +
      '<span class="la-txt">' + esc(a.label) + '</span>' + mark +
      '<span class="la-add" title="追加到画布中心">＋</span>';
    item.dataset.dev = d.id;
    item.dataset.cmd = isCmd ? a.cmdType : '';
    item.dataset.name = a.name !== undefined ? a.name : '';
    item.dataset.label = a.label;
    item.dataset.special = special;
    item.title = d.label + ' · ' + a.label +
      (isCmd ? '\n指令号 #' + a.cmdType : a.name ? '\n动作键 ' + a.name : '') +
      (a.params ? '\n参数 ' + Object.keys(a.params).length + ' 项' : '') +
      (d.desc ? '\n\n' + d.desc : '');
    return item;
  }

  /** 第 2 层：一个设备驱动一行 */
  function libDrvRow(d) {
    var n = actsOf(d).length;
    var total = d.actions.length;
    var alias = DEV_ALIAS_OF[d.id];
    var row = el('div', 'lib-drv',
      '<span class="lv" style="background:' + devColor(d.id) + '"></span>' +
      '<span class="ld-ico">' + devIcon(d.id) + '</span>' +
      '<span class="ld-txt">' +
        '<span class="ld-name">' + esc(d.label) + '</span>' +
        '<span class="ld-id">' + esc(d.id) + (alias ? ' · 同 ' + esc(alias.join('/')) : '') + '</span>' +
      '</span>' +
      '<span class="ld-n">' + n + (n !== total ? '<i>/' + total + '</i>' : '') + '<em>节点</em></span>' +
      '<span class="ld-go">›</span>');
    row.title = (d.desc || d.label) + '\n驱动 ' + d.id + '　协议 ' + (d.protocol || '—') +
      '　动作 ' + total + (n !== total ? '（当前筛选可见 ' + n + '）' : '');
    if (d.pointStats && d.pointStats.total) {
      row.title += '\n协议点位 ' + d.pointStats.total +
        '（读 ' + (d.pointStats.r || 0) + ' / 写 ' + (d.pointStats.w || 0) + '）';
    }
    row.title += (alias ? '\n键名别名：' + alias.join('、') + '（同一模块，读的是同一批点位）' : '');
    row.addEventListener('click', function () {
      libDev = d.id;
      renderLib();
      var box = document.getElementById('lib-groups');
      if (box) box.scrollTop = 0;
    });
    return row;
  }

  /** 第 3 层：某个设备驱动下的节点列表 */
  function libNodesPane(d) {
    var pane = el('div', 'lib-pane-nodes');
    var n = actsOf(d).length;
    var ps = d.pointStats || {};
    var head = el('div', 'lib-nhead',
      '<button class="ln-back" title="返回设备驱动列表">←</button>' +
      '<span class="lv" style="background:' + devColor(d.id) + '"></span>' +
      '<span class="ln-name">' + esc(d.label) + '</span>' +
      '<span class="ln-meta">' + esc(d.protocol || '') + ' · ' + n + '/' + d.actions.length +
        (ps.total ? ' · 点位 ' + ps.total : '') + '</span>');
    head.querySelector('.ln-back').addEventListener('click', function () { libDev = null; renderLib(); });
    pane.appendChild(head);
    if (d.desc) pane.appendChild(el('div', 'lib-ndesc', esc(d.desc)));
    // 协议点位放在动作列表**之前**（默认折叠只占一行）：否则 49 个动作会把
    // 点位块挤到屏外，用户根本发现不了这份「驱动信息」。
    var pts = libPointsBlock(d);
    if (pts) pane.appendChild(pts);
    var list = el('div', 'lib-nacts');
    actsOf(d).forEach(function (a) { list.appendChild(actItem(d, a)); });
    if (!list.children.length) list.appendChild(el('div', 'lib-none', '当前筛选下这个驱动没有节点'));
    pane.appendChild(list);
    return pane;
  }

  // ---------- 协议点位明细（1.4.0「点位表」逐模块点位） ----------
  // 为什么放在驱动抽屉里：点位是「驱动信息」的一半（另一半是动作/参数）。
  // 上层是 UI 可直接拖拽的 149 个动作模板；这里是下位机 242 个真实 OPC UA 节点
  // （含 R/W 方向、数据类型、取值说明），用来对照「这个动作到底读写哪些点位」。
  var libPtsOn = {};    // device id → true 表示已展开（默认折叠：动作才是主线）
  var libPtsQ = {};     // device id → 过滤词

  // 窄侧栏下 `.lib-inner` 是 visibility:hidden、侧栏只有 ~108px，
  // NodeId 全被省略号吃掉。所以在「协议点位」展开期间给侧栏加 .pts-open：
  // ① 常显内容（不再依赖 hover/钉住）；② 内容层浮出到 320px。
  // 折叠或离开该驱动时立刻撤掉，画布占比稳定在 80%。
  function syncPtsOpen(devId) {
    var lib = document.getElementById('wfed-lib');
    if (!lib) return;
    var d = devId ? libDevById(devId) : null;
    var on = !!(d && (d.points || []).length && libPtsOn[devId]);
    lib.classList.toggle('pts-open', on);
  }

  function ptHay(p) {
    return ((p.name || '') + ' ' + (p.node || '') + ' ' + (p.desc || '') + ' ' +
      (p.rw || '') + ' ' + (p.dtype || '')).toLowerCase();
  }

  function ptRow(p) {
    var rw = (p.rw || '').toUpperCase();
    var cls = rw === 'R' ? ' r' : rw === 'W' ? ' w' : '';
    var node = el('div', 'lib-pt',
      '<span class="lp-main">' +
        '<span class="lp-n">' + esc(p.name || p.node) + '</span>' +
        '<span class="lp-node">' + esc(p.node) + '</span>' +
      '</span>' +
      '<span class="lp-tags">' +
        '<span class="lp-rw' + cls + '">' + (rw || '—') + '</span>' +
        (p.dtype ? '<span class="lp-dt">' + esc(p.dtype) + '</span>' : '') +
      '</span>');
    node.title = (p.name || p.node) + '\nNodeId  ' + (LIB.protocol.nsPrefix || '') + p.node +
      '\n数据类型  ' + (p.dtype || '未标注') + '　读写  ' + (p.rw || '未标注') +
      (p.group ? '\n所属模块  ' + p.group : '') +
      (p.desc ? '\n\n' + p.desc : '');
    return node;
  }

  /** 该驱动的协议点位折叠块（无点位数据则返回 null） */
  function libPointsBlock(d) {
    var all = d.points || [];
    if (!all.length) return null;
    var ps = d.pointStats || { total: all.length };
    var on = !!libPtsOn[d.id];
    var box = el('div', 'lib-pts' + (on ? '' : ' off'));

    var h = el('div', 'lib-pts-h',
      '<span class="lvp-ico">🔌</span>' +
      '<span class="lvp-t">协议点位</span>' +
      '<span class="lvp-rw" title="读 / 写">R' + (ps.r || 0) + ' · W' + (ps.w || 0) + '</span>' +
      '<span class="lvp-n">' + all.length + '</span>' +
      '<span class="lvp-caret">▼</span>');
    h.title = '来自 OPC_UA协议1.4.0(2).xlsx「点位表」· ' + esc(d.label) +
      '\n读 ' + (ps.r || 0) + ' 个 / 写 ' + (ps.w || 0) + ' 个 / 无标注 ' +
      (all.length - (ps.r || 0) - (ps.w || 0)) + ' 个\n点击展开或折叠';
    h.addEventListener('click', function () {
      libPtsOn[d.id] = !libPtsOn[d.id];
      h.parentNode.classList.toggle('off', !libPtsOn[d.id]);
      syncPtsOpen(d.id);
    });
    box.appendChild(h);

    var qw = el('div', 'lib-pts-q');
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = '过滤点位名 / NodeId / 说明…';
    inp.value = libPtsQ[d.id] || '';
    qw.appendChild(inp);
    box.appendChild(qw);

    var body = el('div', 'lib-pts-b');
    box.appendChild(body);

    function draw() {
      body.innerHTML = '';
      var kw = (libPtsQ[d.id] || '').trim().toLowerCase();
      var hit = kw ? all.filter(function (p) { return ptHay(p).indexOf(kw) >= 0; }) : all;
      if (!hit.length) {
        body.appendChild(el('div', 'lib-none', '没有匹配的点位'));
        return;
      }
      // 多模块设备（system：总复位/停止/报错信息）按模块打小标题
      var lastGrp = null;
      hit.forEach(function (p) {
        if (p.group && p.group !== lastGrp) {
          body.appendChild(el('div', 'lib-pgrp', esc(p.group)));
          lastGrp = p.group;
        }
        body.appendChild(ptRow(p));
      });
      body.appendChild(el('div', 'lib-pts-f',
        kw ? '匹配 ' + hit.length + ' / ' + all.length + ' 个点位'
           : all.length + ' 个点位 · 悬停查看 NodeId 与取值说明'));
    }
    inp.addEventListener('input', function () { libPtsQ[d.id] = inp.value; draw(); });
    inp.addEventListener('click', function (e) { e.stopPropagation(); });
    // 默认折叠（动作才是主线），展开时才构建 DOM；65 行也不贵，点开即建
    if (on) draw();
    else {
      var once = function () {
        if (!h.parentNode.classList.contains('off')) {
          draw();
          h.removeEventListener('click', once);
        }
      };
      h.addEventListener('click', once);
    }
    return box;
  }

  /** 搜索：跨过类别与驱动，把命中的节点（含协议点位）按驱动分组平铺 */
  function renderLibSearch(box, q) {
    var groups = [], hit = 0, pthit = 0;
    LIB.devices.forEach(function (d) {
      var acts = actsOf(d).filter(function (a) { return actHay(d, a).indexOf(q) >= 0; });
      var pts = (d.points || []).filter(function (p) { return ptHay(p).indexOf(q) >= 0; });
      var selfHit = (d.label + ' ' + d.id + ' ' + (d.desc || '')).toLowerCase().indexOf(q) >= 0;
      if (selfHit) { acts = actsOf(d); pts = d.points || []; }  // 命中的是驱动名本身
      if (!acts.length && !pts.length) return;
      groups.push({ d: d, acts: acts, pts: pts });
      hit += acts.length;
      pthit += pts.length;
    });
    var sp = actsOf(SPECIAL_DEV).filter(function (a) { return (a.label + ' ' + a.special).toLowerCase().indexOf(q) >= 0; });
    if (sp.length) { groups.push({ d: SPECIAL_DEV, acts: sp, pts: [] }); hit += sp.length; }

    box.appendChild(el('div', 'lib-search-hint',
      '搜索 <b>' + esc(q) + '</b> — 命中 ' + hit + ' 个节点' +
      (pthit ? ' / <b>' + pthit + '</b> 个协议点位' : '') +
      ' / ' + groups.length + ' 个设备驱动'));
    if (!groups.length) { box.appendChild(el('div', 'lib-none', '没有匹配的设备驱动或节点<br/>换个关键词，或点上面的类别浏览')); return; }
    groups.forEach(function (g) {
      var sep = el('div', 'lib-cat-sep',
        '<span>' + devIcon(g.d.id) + '</span>' + esc(g.d.label) +
        '<span class="lc-n">' + g.acts.length + (g.pts.length ? ' +' + g.pts.length + '点位' : '') + '</span>');
      box.appendChild(sep);
      var list = el('div', 'lib-nacts');
      g.acts.forEach(function (a) { list.appendChild(actItem(g.d, a)); });
      box.appendChild(list);
      if (g.pts.length) {
        var pb = el('div', 'lib-pts');
        pb.appendChild(el('div', 'lib-pts-h',
          '<span class="lvp-ico">🔌</span><span class="lvp-t">命中的协议点位</span>' +
          '<span class="lvp-n">' + g.pts.length + '</span><span class="lvp-caret">▼</span>'));
        var pbody = el('div', 'lib-pts-b');
        var lastG = null;
        g.pts.slice(0, 60).forEach(function (p) {
          if (p.group && p.group !== lastG) { pbody.appendChild(el('div', 'lib-pgrp', esc(p.group))); lastG = p.group; }
          pbody.appendChild(ptRow(p));
        });
        if (g.pts.length > 60) pbody.appendChild(el('div', 'lib-pts-f', '仅显示前 60 个'));
        pb.appendChild(pbody);
        box.appendChild(pb);
      }
    });
  }

  function renderLib() {
    var box = document.getElementById('lib-groups');
    if (!box) return;
    var q = (document.getElementById('lib-search').value || '').trim().toLowerCase();
    box.innerHTML = '';

    // 搜索态：跨层平铺，忽略当前类别/驱动
    if (q) { syncPtsOpen(null); renderLibSearch(box, q); return; }

    var cat = CATEGORIES.filter(function (c) { return c.id === libCat; })[0] || CATEGORIES[0];

    // ① 功能类别 chips
    var cats = el('div', 'lib-cats');
    CATEGORIES.forEach(function (c) {
      var n = catDevs(c).reduce(function (s, d) { return s + actsOf(d).length; }, 0);
      var b = el('button', 'lib-cat' + (c.id === cat.id ? ' on' : ''),
        '<span class="lc-ico">' + c.icon + '</span>' +
        '<span class="lc-t">' + esc(c.label) + '</span>' +
        '<span class="lc-n">' + n + '</span>');
      b.dataset.cat = c.id;
      b.addEventListener('click', function () { libCat = c.id; libDev = null; renderLib(); });
      cats.appendChild(b);
    });
    box.appendChild(cats);

    // ③ 已经钻进某个驱动 → 只显示这个驱动的节点
    if (libDev) {
      var cur = libDevById(libDev);
      if (cur) { box.appendChild(libNodesPane(cur)); syncPtsOpen(libDev); return; }
      libDev = null;
    }
    syncPtsOpen(null);   // 停在驱动列表层 → 撤回「协议点位」的加宽

    // ② 设备驱动列表（「全部」时按功能类别插小标题）
    var lastCat = null;
    catDevs(cat).forEach(function (d) {
      if (cat.id === 'all') {
        // 特殊节点并进「系统与脚本」，不要再插一个小标题重复一次
        var c2 = catOfDev(d.id) || CATEGORIES.filter(function (x) { return x.id === 'system'; })[0];
        if (c2 && c2.id !== lastCat) {
          lastCat = c2.id;
          box.appendChild(el('div', 'lib-cat-sep', '<span>' + c2.icon + '</span>' + esc(c2.label)));
        }
      }
      box.appendChild(libDrvRow(d));
    });
    if (!box.querySelector('.lib-drv')) box.appendChild(el('div', 'lib-none', '当前筛选下没有可用的设备驱动'));
  }

  // ---------- 添加节点 ----------
  function addNode(dev, actName, cmd, label, x, y, special) {
    var n;
    if (special === 'group') {
      n = makeGroup(x, y); refreshDisplay(n);
    } else if (special === 'script') {
      n = makeScript(label, x, y);
    } else {
      var a = actionOf(dev, actName, cmd);
      if (!a) { note('err', '未找到动作', dev + ' / ' + (label || actName) +
        '\n请确认左侧节点库中该设备确实包含此动作。'); return null; }
      n = makeNode(dev, a, x, y);
    }
    pushUndo();
    state.wf.data.nodes.push(n);
    state.selected = { type: 'node', id: n.uuid };
    state.selectedIds = {}; state.selectedIds[n.uuid] = true;
    renderNodes(); showProps(); updateStats(); afterChange();
    return n;
  }

  // ---------- 属性面板 ----------
  function findNode(uuid) {
    for (var i = 0; i < state.wf.data.nodes.length; i++) if (state.wf.data.nodes[i].uuid === uuid) return state.wf.data.nodes[i];
    return null;
  }
  function selCount() { return Object.keys(state.selectedIds).length; }

  function showProps() {
    var empty = document.getElementById('props-empty');
    var panel = document.getElementById('props-panel');
    var sub = document.getElementById('props-sub');
    if (selCount() > 1) {
      if (sub) sub.textContent = '多选 ' + selCount() + ' 个';
      empty.style.display = 'none'; panel.classList.remove('hidden'); return renderMultiProps(panel);
    }
    if (!state.selected) {
      if (sub) sub.textContent = '中文名 / 单位 / 范围';
      empty.style.display = ''; panel.classList.add('hidden'); panel.innerHTML = '';
      return;
    }
    if (sub) {
      var dn = findNode(state.selected.id);
      sub.textContent = state.selected.type === 'edge'
        ? '连线属性'
        : (dn ? (devLabel(dn.device_name) + ' · ' + dn.name) : '节点属性');
    }
    empty.style.display = 'none'; panel.classList.remove('hidden');
    if (state.selected.type === 'edge') renderEdgeProps(panel);
    else renderNodeProps(panel);
  }

  function renderMultiProps(panel) {
    var ids = Object.keys(state.selectedIds);
    panel.innerHTML =
      '<div class="props-sec"><h4><span class="ps-ico">🧩</span>多选（' + ids.length + ' 个节点）</h4>' +
      '<div class="props-row"><div class="pval">可整体拖动、复制、删除。批量编辑参数请单选。</div></div></div>' +
      '<div class="props-actions"><button id="btn-del-multi" class="danger">🗑 删除所选</button>' +
      '<button id="btn-dup-multi">⧉ 复制所选</button></div>';
    document.getElementById('btn-del-multi').addEventListener('click', deleteSelected);
    document.getElementById('btn-dup-multi').addEventListener('click', duplicateSelected);
  }

  function renderNodeProps(panel) {
    var n = findNode(state.selected.id);
    if (!n) { state.selected = null; showProps(); return; }
    // 板位清单异步回来会整栏重绘；记住正在输入的格子，避免把没提交的修改冲掉
    var active = document.activeElement;
    var keep = null;
    if (active && panel.contains(active) && active.dataset && active.dataset.pk) {
      keep = {
        pk: active.dataset.pk, tag: active.tagName, type: active.type || '',
        value: active.value, start: active.selectionStart, end: active.selectionEnd
      };
    }
    var disp = n._display || refreshDisplay(n);
    var a = actionOfNode(n);
    var sem = semanticsOf(n);
    var html = '';

    // 1) 节点概览
    html += '<div class="props-sec"><h4><span class="ps-ico">' + disp.icon + '</span>节点概览' +
      '<span class="ps-hint">OPC UA ' + esc(PROTO.version || '1.4.0') + '</span></h4>';
    html += '<div class="props-row"><label>设备</label><div>' +
      '<span class="props-tag real">' + esc(disp.dev || '—') + '</span>' +
      (n.device_name ? '<span class="props-tag">' + esc(n.device_name) + '</span>' : '') +
      (disp.proto ? '<span class="props-tag">协议 ' + esc(disp.proto) + '</span>' : '') +
      (disp.legacy ? '<span class="props-tag legacy">1.3.9 遗留动作</span>' : '') +
      '</div></div>';
    html += '<div class="props-row"><label>指令号 / 类型（点此切换动作）</label><select id="p-act">' + actionOptions(n) + '</select></div>';
    html += '<div class="props-row"><label>执行动作 name（真实执行命令）</label><input id="p-name" type="text" value="' + esc(n.name) + '" /></div>';
    html += '<div class="props-row"><div class="pval">uuid: ' + n.uuid +
      '<br/>坐标: (' + Math.round(n.pose.position.x) + ', ' + Math.round(n.pose.position.y) + ')</div></div>';
    html += '</div>';

    // 1.5) PRCXI 9320 资源板位（4×4 点选器）—— 换节点时重置角色，避免角色串味
    if (deckState.nodeUuid !== n.uuid) {
      deckState.nodeUuid = n.uuid;
      deckState.role = null;
      deckState.err = '';
      deckState.failed = {};
    }
    html += deckSectionHtml(n);

    // 2) 执行参数（按驱动签名，不看节点里原先有没有这个键）
    var keys = actionParamKeys(n);
    if (keys.length) {
      html += '<div class="props-sec"><h4><span class="ps-ico">⚙️</span>执行参数' +
        '<span class="ps-hint">与 GN 驱动签名一致</span></h4>';
      keys.forEach(function (k) { html += paramRow(n, k); });
      html += '</div>';
    }

    // 3) 流程语义（并行/串行 + 设备锁）
    html += '<div class="props-sec"><h4><span class="ps-ico">🔀</span>流程语义</h4>';
    html += '<div class="props-row"><label>执行关系（由连线拓扑推导）</label><div class="pval">' +
      '前置 ' + sem.preds.length + ' 个 · 后继 ' + sem.succs.length + ' 个<br/>' +
      (sem.fanout > 1 ? '⚡ 本节点是 <b>并行入口</b>：' + sem.fanout + ' 条分支可同时开始<br/>' : '') +
      (sem.fanin > 1 ? '⏳ 本节点是 <b>并行汇合</b>：需等 ' + sem.fanin + ' 条分支全部完成<br/>' : '') +
      (sem.fanout <= 1 && sem.fanin <= 1 ? '顺序节点<br/>' : '') +
      '设备锁：<b>' + esc(n.device_name || '—') + '</b>（同一设备同一时刻只执行 1 个节点）' +
      '</div></div>';
    if (sem.conflicts.length) {
      html += '<div class="props-note">⚠ 与以下节点<b>共用同一设备</b>，将自动串行：' +
        sem.conflicts.map(function (c) { return esc(c); }).join('、') + '</div>';
    } else if (sem.deviceParallel.length) {
      html += '<div class="props-note ok">✔ 同层并行节点使用<b>不同设备</b>，可真并行执行。</div>';
    }
    html += '</div>';

    // 4) 步骤说明
    html += '<div class="props-sec"><h4><span class="ps-ico">📝</span>步骤说明 footer</h4>' +
      '<div class="props-row"><textarea id="p-footer" placeholder="例如：堆栈复位">' + esc(n.footer || '') + '</textarea></div>';

    // 5) 校验提示
    if (sem.notes.length) {
      html += '<div class="props-note">' + sem.notes.map(esc).join('<br/>') + '</div>';
    }
    html += '<div class="props-row"><label class="props-check"><input id="p-disabled" type="checkbox"' +
      (n.disabled ? ' checked' : '') + '/> 禁用此节点（跳过执行）</label></div></div>';

    // 6) 操作
    html += '<div class="props-actions"><button id="btn-del-node" class="danger">🗑 删除节点</button>' +
      '<button id="btn-dup-node">⧉ 复制</button></div>';

    panel.innerHTML = html;

    // --- 事件 ---
    var sel = document.getElementById('p-act');
    sel.addEventListener('change', function () {
      var na = actionByValue(n, sel.value);
      if (!na) return;
      pushUndo();
      var keep = {};
      if (na.cmdType !== undefined) keep.cmd_type = na.cmdType;
      Object.keys(na.params || {}).forEach(function (k) {
        if (na.params[k] && na.params[k].omit) return;
        keep[k] = na.params[k].default !== undefined ? na.params[k].default : '';
      });
      if (n.footer && !(na.cmdType !== undefined)) keep.footer = n.footer;
      n.param = keep;
      deckState.role = null;              // 动作换了 → 板位角色重选
      if (na.name !== undefined) n.name = na.name;
      if (na.cmdType !== undefined) n.name = 'auto-execute_command';
      refreshDisplay(n);
      renderNodes(); renderNodeProps(panel); afterChange();
    });
    document.getElementById('p-name').addEventListener('change', function () {
      pushUndo(); n.name = this.value; renderNodes(); afterChange();
    });
    var ft = document.getElementById('p-footer');
    ft.addEventListener('change', function () { pushUndo(); n.footer = this.value; renderNodes(); afterChange(); });
    document.getElementById('p-disabled').addEventListener('change', function () {
      pushUndo(); n.disabled = this.checked; renderNodes(); afterChange();
    });
    document.getElementById('btn-del-node').addEventListener('click', function () {
      deleteNode(n.uuid);
    });
    document.getElementById('btn-dup-node').addEventListener('click', function () {
      pushUndo();
      var copy = JSON.parse(JSON.stringify(n));
      copy.uuid = uid();
      copy.pose.position.x += 30; copy.pose.position.y += 30;
      state.wf.data.nodes.push(copy);
      state.selected = { type: 'node', id: copy.uuid };
      state.selectedIds = {}; state.selectedIds[copy.uuid] = true;
      renderNodes(); showProps(); updateStats(); afterChange();
    });

    // --- 参数控件 ---
    bindParamInputs(panel);
    // --- PRCXI 板位点选器 ---
    bindDeckSection(panel, n);
    if (keep && keep.pk) {
      var list = panel.querySelectorAll('[data-pk="' + keep.pk.replace(/"/g, '') + '"]');
      var again = null;
      for (var ki = 0; ki < list.length; ki++) {
        if (list[ki].tagName === keep.tag && (list[ki].type || '') === keep.type) { again = list[ki]; break; }
      }
      if (!again && list.length) again = list[0];
      if (again && again.type !== 'checkbox' && again.type !== 'radio') {
        again.value = keep.value;
        try {
          again.focus();
          if (keep.start != null && again.setSelectionRange) again.setSelectionRange(keep.start, keep.end);
        } catch (e) { /* 部分控件不支持选区 */ }
      }
    }
  }

  function actionByValue(n, value) {
    var d = devOf(n.device_name);
    if (!d) return null;
    for (var i = 0; i < d.actions.length; i++) {
      var a = d.actions[i];
      var v = a.cmdType !== undefined ? String(a.cmdType) : ('n:' + a.name);
      if (v === String(value)) return a;
    }
    return null;
  }
  function actionOptions(n) {
    var opts = '', d = devOf(n.device_name);
    var ct = (n.param || {}).cmd_type;
    if (!d) {
      opts += '<option value="n:' + esc(n.name) + '" selected>' + esc(n.name || '命令') + '</option>';
      return opts;
    }
    d.actions.forEach(function (a) {
      var v = a.cmdType !== undefined ? String(a.cmdType) : ('n:' + a.name);
      var selected = (a.cmdType !== undefined && String(ct) === String(a.cmdType)) ||
        (a.cmdType === undefined && a.name === n.name);
      opts += '<option value="' + esc(v) + '"' + (selected ? ' selected' : '') + '>' +
        esc(a.label) + (a.cmdType !== undefined ? '（#' + a.cmdType + '）' : '') +
        (a.legacy ? ' [遗留]' : a.inRealWorkflow ? ' ✓真实' : '') + '</option>';
    });
    return opts;
  }

  // ==================================================================
  // PRCXI 9320 工作台：4×4 板位点选器
  // ----------------------------------------------------------------
  // 编辑器里 PRCXI 节点的 sources / targets / tip_racks（资源实例）与
  // move_plate 的 from / to（板位号）都指向 9320 的 16 个物理板位。
  // 数据源是后端 GET /api/gn-adapter/prcxi-deck：
  //   · 板位几何源自驱动 PRCXI9300Deck（4 行 × 4 列，行主序 T1..T16）
  //   · 台面工艺语义（三工艺）与真实占用（真实工作流实测）由后端合成
  // 节点库 gn_node_library.js 的 device.deck / action.deckRoles 告诉前端
  // 「哪个参数对应哪个角色、接受哪些板位语义」，所以这里不硬编码任何板位表。
  // ==================================================================
  var DECK_PROC_FALLBACK = [
    { key: 'aus', label: '金球合成' },
    { key: 'autet', label: '金四面体合成' },
    { key: 'mof', label: 'MOF 合成' }
  ];
  var deckState = {
    proc: 'autet',    // 当前台面工艺
    role: null,       // 当前角色 key（source / target / tips / from / to / plate）
    nodeUuid: null,   // 角色归属的节点（换节点即重置，避免角色串味）
    cache: {},        // 'proc|action' → 后端快照
    loading: {},      // 'proc|action' → true
    failed: {},       // 'proc|action' → 失败原因（挡住失败后的无限重绘）
    err: ''           // 最近一次加载失败原因
  };

  function deckOfNode(n) {
    var d = devOf(n && n.device_name);
    return (d && d.deck) ? d.deck : null;
  }
  function deckRolesOfNode(n) {
    var a = actionOfNode(n);
    return (a && a.deckRoles && a.deckRoles.length) ? a.deckRoles : null;
  }
  function deckRoleByKey(n, key) {
    var rs = deckRolesOfNode(n) || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].key === key) return rs[i];
    return null;
  }
  function deckActionName(n) {
    var a = actionOfNode(n);
    return (a && a.name) || n.name || '';
  }
  /** transfer_liquid 只选 T1..T16，不按金球 / 金四面体 / MOF 分台面 */
  function deckPlainSlots(n) {
    return deckActionName(n) === 'transfer_liquid';
  }
  function plainDeckSites() {
    var sites = [];
    for (var i = 1; i <= 16; i++) sites.push({ slot: i });
    return sites;
  }
  function plainSlotOf(x) {
    if (typeof x === 'number' && isFinite(x)) {
      var n = Math.round(x);
      return (n >= 1 && n <= 16) ? n : 0;
    }
    var s = String(resNameOf(x) || '').trim();
    var m = /^T(\d+)$/i.exec(s);
    if (m) {
      var t = parseInt(m[1], 10);
      return (t >= 1 && t <= 16) ? t : 0;
    }
    if (/^\d+$/.test(s)) {
      var d = parseInt(s, 10);
      return (d >= 1 && d <= 16) ? d : 0;
    }
    return 0;
  }
  function deckCacheKey(n) { return deckState.proc + '|' + deckActionName(n); }

  /** sources/targets/tip_racks/plate 的值可能是 JSON 字符串（节点库默认值）或真实数组 */
  function deckParamArr(v) {
    if (v === undefined || v === null || v === '') return [];
    if (Array.isArray(v)) return v.slice();
    if (typeof v === 'string') {
      try { var a = JSON.parse(v); return Array.isArray(a) ? a : []; }
      catch (e) { return []; }
    }
    if (typeof v === 'object') return [v];
    return [];
  }
  /** 写回时保持原有形状（字符串 → 字符串，数组 → 数组），避免打乱已导入工作流的格式 */
  function deckParamWrite(orig, arr) {
    return Array.isArray(orig) ? arr : JSON.stringify(arr);
  }
  function resNameOf(r) {
    if (r === undefined || r === null) return '';
    if (typeof r === 'string') return r;
    return r.name || r.id || '';
  }
  function slotTextOf(v) {
    if (Array.isArray(v)) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    if (v !== null && typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    return v === undefined || v === null ? '' : String(v);
  }
  /** 资源实例字典（与真实工作流写法一致：id / name / uuid） */
  function deckResDict(site, unilabDeck) {
    var r = site && site.resource;
    if (!r) return null;
    return { id: r.id || (unilabDeck + '/' + r.name), name: r.name, uuid: r.uuid };
  }

  function deckFetch(n, cb) {
    var dk = deckOfNode(n);
    if (!dk) return;
    var key = deckCacheKey(n);
    if (deckState.cache[key]) { cb(deckState.cache[key]); return; }
    if (deckState.loading[key] || deckState.failed[key]) return;
    deckState.loading[key] = true;
    deckState.err = '';
    var url = (dk.api || '/api/gn-adapter/prcxi-deck') +
      '?process=' + encodeURIComponent(deckState.proc) +
      '&action=' + encodeURIComponent(deckActionName(n));
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      deckState.loading[key] = false;
      if (!j || j.ok === false) {
        deckState.err = (j && j.error) || '板位清单接口返回失败';
        deckState.failed[key] = deckState.err;
        cb(null);
      } else {
        delete deckState.failed[key];
        deckState.cache[key] = j;
        cb(j);
      }
    }).catch(function (e) {
      deckState.loading[key] = false;
      deckState.err = '无法读取板位清单：' + (e && e.message ? e.message : e);
      deckState.failed[key] = deckState.err;
      cb(null);
    });
  }

  function deckProcs() {
    for (var k in deckState.cache) {
      var ps = deckState.cache[k] && deckState.cache[k].processes;
      if (ps && ps.length) return ps;
    }
    return DECK_PROC_FALLBACK;
  }

  /** 板位在某个角色下的状态：可否点选 / 是否已选 / 推荐 */
  function deckSiteState(n, site, role) {
    var p = n.param || {};
    var cur = p[role.param];
    var sel = false;
    if (role.value === 'slot') sel = String(cur === undefined || cur === null ? '' : cur) === String(site.slot);
    else sel = deckParamArr(cur).some(function (x) { return resNameOf(x) && resNameOf(x) === (site.resource || {}).name; });
    var av = (site.roleAvailable || {})[role.key] || { ok: true, why: '' };
    return { sel: sel, hot: !!av.ok, off: !av.ok, why: av.why || '' };
  }

  function deckPick(n, role, site, on) {
    var p = n.param || (n.param = {});
    var dk = deckOfNode(n) || {};
    if (role.value === 'slot') {
      pushUndo();
      if (on) p[role.param] = site.slot; else delete p[role.param];
      renderNodes(); afterChange();
      return { ok: true };
    }
    if (deckPlainSlots(n)) {
      var label = 'T' + site.slot;
      var origP = p[role.param];
      var arrP = deckParamArr(origP);
      var idxP = -1;
      for (var ip = 0; ip < arrP.length; ip++) {
        if (plainSlotOf(arrP[ip]) === site.slot) idxP = ip;
      }
      pushUndo();
      if (on) { if (idxP < 0) arrP.push(label); }
      else if (idxP >= 0) arrP.splice(idxP, 1);
      p[role.param] = deckParamWrite(origP, arrP);
      renderNodes(); afterChange();
      return { ok: true, count: arrP.length };
    }
    var dict = deckResDict(site, dk.unilabDeck || '');
    if (!dict) return { ok: false, msg: '该板位没有已登记的资源实例，无法写入。' };
    var orig = p[role.param];
    var arr = deckParamArr(orig);
    var idx = -1;
    for (var i = 0; i < arr.length; i++) if (resNameOf(arr[i]) === dict.name) idx = i;
    pushUndo();
    if (on) {
      if (idx < 0) arr.push(dict);
    } else if (idx >= 0) {
      arr.splice(idx, 1);
    }
    p[role.param] = deckParamWrite(orig, arr);
    renderNodes(); afterChange();
    return { ok: true, count: arr.length };
  }

  function deckLegendHtml() {
    var gl = null;
    for (var k in deckState.cache) { if (deckState.cache[k] && deckState.cache[k].groupLabels) { gl = deckState.cache[k].groupLabels; break; } }
    if (!gl) return '';
    var colors = { trough: '#14b8a6', deepWell: '#3b82f6', tip: '#f59e0b', transfer: '#8b5cf6',
      reader: '#ec4899', spare: '#cbd5e1', sonic: '#22c55e', waste: '#0ea5e9', trash: '#78716c' };
    var h = '';
    ['trough', 'deepWell', 'tip', 'transfer', 'reader', 'spare'].forEach(function (g) {
      if (!gl[g]) return;
      h += '<span class="dks-lg"><i style="background:' + colors[g] + '"></i>' + esc(gl[g]) + '</span>';
    });
    return h ? '<div class="dks-legend">' + h + '</div>' : '';
  }

  /** transfer_liquid：4×4 只标 T1..T16，三个角色仍分开写入 */
  function deckPlainSectionHtml(n) {
    var dk = deckOfNode(n);
    var roles = deckRolesOfNode(n);
    if (!dk || !roles) return '';
    if (!deckState.role) deckState.role = roles[0].key;
    var role = deckRoleByKey(n, deckState.role) || roles[0];
    var sites = plainDeckSites();
    var h = '<div class="props-sec" id="p-deck"><h4><span class="ps-ico">🧫</span>资源板位' +
      '<span class="ps-hint">T1–T16 · ' + (dk.rows || 4) + '×' + (dk.cols || 4) + '</span></h4>';
    h += '<div class="dks-roles" id="p-deck-roles">';
    roles.forEach(function (r) {
      var cnt = deckParamArr((n.param || {})[r.param]).length;
      h += '<button class="dks-role' + (r.key === role.key ? ' on' : '') + '" data-role="' + esc(r.key) + '" title="' +
        esc(r.label + ' → ' + r.param) + '">' +
        esc(r.label) + '<span class="dr-n">' + esc(r.param) + ' · ' + cnt + ' 个</span></button>';
    });
    h += '</div><div class="dks-grid" id="p-deck-grid">';
    var chosen = {};
    deckParamArr((n.param || {})[role.param]).forEach(function (x) {
      var sl = plainSlotOf(x);
      if (sl) chosen[sl] = 1;
    });
    sites.forEach(function (s) {
      var on = !!chosen[s.slot];
      h += '<div class="dk-cell plain' + (on ? ' sel' : ' hot') + '" data-slot="' + s.slot + '" title="T' + s.slot + '">' +
        '<span class="dk-t">T' + s.slot + '</span></div>';
    });
    h += '</div><div class="dks-sel" id="p-deck-sel">';
    var arr = deckParamArr((n.param || {})[role.param]);
    if (!arr.length) h += '<div class="dks-note">未选板位（点上面格子，可多选）</div>';
    arr.forEach(function (x) {
      var sl = plainSlotOf(x);
      var nm = sl ? ('T' + sl) : resNameOf(x);
      h += '<div class="dks-chip">' + (sl ? '<span class="dc-slot">T' + sl + '</span>' : '') +
        '<span class="dc-nm">' + esc(nm) + '</span>' +
        '<button class="dc-x" data-deck-del="' + esc(role.key) + '" data-deck-del-name="' + esc(nm) + '" title="移除">✕</button></div>';
    });
    h += '</div><div class="dks-note">点 T1–T16 写入 <b>' + esc(role.param) + '</b>（可多选）</div></div>';
    return h;
  }

  /** 「资源板位」一整节（仅在 PRCXI 且该动作有板位角色时出现） */
  function deckSectionHtml(n) {
    if (deckPlainSlots(n)) return deckPlainSectionHtml(n);
    var dk = deckOfNode(n);
    var roles = deckRolesOfNode(n);
    if (!dk || !roles) return '';
    var a = actionOfNode(n);
    if (!deckState.role) deckState.role = roles[0].key;   // 默认停在第一个角色（source）
    var role = deckRoleByKey(n, deckState.role) || roles[0];

    var h = '<div class="props-sec" id="p-deck"><h4><span class="ps-ico">🧫</span>资源板位' +
      '<span class="ps-hint">' + esc(dk.model || 'PRCXI9300Deck') + ' · ' + (dk.total || 16) + ' 位（' +
      (dk.rows || 4) + '×' + (dk.cols || 4) + '）</span></h4>';

    // 台面工艺
    h += '<div class="dks-proc" id="p-deck-proc">';
    deckProcs().forEach(function (p) {
      h += '<button data-proc="' + esc(p.key) + '"' + (p.key === deckState.proc ? ' class="on"' : '') +
        ' title="切换台面工艺（只影响板位语义标注，不改已选值）">' + esc(p.label) + '</button>';
    });
    h += '</div>';

    // 角色
    h += '<div class="dks-roles" id="p-deck-roles">';
    roles.forEach(function (r) {
      var p = n.param || {};
      var cnt = r.value === 'slot'
        ? ((p[r.param] === undefined || p[r.param] === null || p[r.param] === '') ? 0 : 1)
        : deckParamArr(p[r.param]).length;
      h += '<button class="dks-role' + (r.key === role.key ? ' on' : '') + '" data-role="' + esc(r.key) + '" title="' +
        esc(r.label + ' → ' + r.param + '（' + r.hint + '）') + '">' +
        esc(r.label) + '<span class="dr-n">' + esc(r.param) + ' · ' + cnt + ' 个</span></button>';
    });
    h += '</div>';

    // 板位网格
    var key = deckCacheKey(n);
    var snap = deckState.cache[key];
    if (!snap) {
      h += '<div class="dks-load">' + (deckState.err
        ? '<span class="dks-note err">' + esc(deckState.err) + '</span>'
        : '正在读取 9320 板位清单…') + '</div>';
      h += '<div class="dks-note">仍可在下方「执行参数」里直接编辑 JSON 原始值。</div>';
      return h + '</div>';
    }
    h += '<div class="dks-grid" id="p-deck-grid">';
    (snap.sites || []).forEach(function (s) {
      var st = deckSiteState(n, s, role);
      var cls = 'dk-cell g-' + esc(s.group || 'none');
      if (st.sel) cls += ' sel'; else if (!st.off) cls += st.hot ? ' hot' : ' dim';
      if (st.off) cls += ' off';
      var resNm = (s.resource || {}).name || '';
      var tip = 'T' + s.slot + '　' + (s.name || '') + (s.content ? '（' + s.content + '）' : '') +
        (s.temp ? ' ' + s.temp : '') +
        '\n台面类别：' + (s.groupLabel || '—') +
        '\n资源实例：' + (resNm || '未登记') +
        (s.resource && s.resource.source === 'semantic' ? '（按台面语义推定）' : '') +
        (s.resource && s.resource.source === 'workflow' ? '（真实工作流实测 ×' + s.resource.count + '）' : '') +
        (!st.off ? '' : '\n禁用：' + st.why) +
        ((s.warnings || []).length ? '\n提示：' + s.warnings.join('；') : '');
      h += '<div class="' + cls + '" data-slot="' + s.slot + '" title="' + esc(tip) + '">' +
        '<span class="dk-t">T' + s.slot + '</span>' +
        '<span class="dk-nm">' + esc((s.name || '').replace(/（[^）]*）/g, '')) + '</span>' +
        '<span class="dk-rs' + (resNm ? '' : ' none') + '">' + esc(resNm || '未登记') + '</span>' +
        ((s.warnings || []).length ? '<span class="dk-w">!</span>' : '') + '</div>';
    });
    h += '</div>';
    h += deckLegendHtml();

    // 已选清单
    var p = n.param || {};
    h += '<div class="dks-sel" id="p-deck-sel">';
    if (role.value === 'slot') {
      var sv = p[role.param];
      h += (sv === undefined || sv === null || sv === '')
        ? '<div class="dks-note">未选板位（点上面格子里任一可用位）</div>'
        : '<div class="dks-chip"><span class="dc-slot">T' + esc(sv) + '</span>' +
          '<span class="dc-nm">' + esc(role.label) + '</span>' +
          '<button class="dc-x" data-deck-del="' + esc(role.key) + '" title="清除">✕</button></div>';
    } else {
      var arr = deckParamArr(p[role.param]);
      if (!arr.length) h += '<div class="dks-note">未选板位（点上面格子，可多选）</div>';
      arr.forEach(function (x) {
        var nm = resNameOf(x);
        var slot = (snap.sites || []).filter(function (s) {
          return (s.resource || {}).name === nm;
        }).map(function (s) { return 'T' + s.slot; }).join('/');
        h += '<div class="dks-chip">' + (slot ? '<span class="dc-slot">' + esc(slot) + '</span>' : '') +
          '<span class="dc-nm">' + esc(nm) + '</span>' +
          '<button class="dc-x" data-deck-del="' + esc(role.key) + '" data-deck-del-name="' + esc(nm) + '" title="移除">✕</button></div>';
      });
      if (arr.length > 4) {
        h += '<div class="dks-note">已选 ' + arr.length + ' 个：执行时按 min(sources, targets) 配对，多余的不会生效。</div>';
      }
    }
    h += '</div>';

    h += '<div class="dks-note">' + esc(role.hint) +
      '　→ 写入 <b>' + esc(role.param) + '</b>' +
      (role.value === 'slot' ? '（板位号 1..16）' : '（资源实例 id/name/uuid）') + '</div>';
    h += '</div>';
    return h;
  }

  function bindDeckSection(panel, n) {
    var sec = panel.querySelector('#p-deck');
    if (!sec) return;
    var dk = deckOfNode(n);
    var roles = deckRolesOfNode(n);
    if (!dk || !roles) return;
    var role = deckRoleByKey(n, deckState.role) || roles[0];
    var plain = deckPlainSlots(n);
    var key = deckCacheKey(n);
    var snap = plain ? { sites: plainDeckSites() } : (deckState.cache[key] || null);

    // 台面工艺切换：只改语义标注，不动已选值
    Array.prototype.forEach.call(sec.querySelectorAll('#p-deck-proc button'), function (b) {
      b.addEventListener('click', function () {
        deckState.proc = b.dataset.proc;
        renderNodeProps(panel);
      });
    });
    // 角色切换（先点角色，再点格子）
    Array.prototype.forEach.call(sec.querySelectorAll('#p-deck-roles .dks-role'), function (b) {
      b.addEventListener('click', function () { deckState.role = b.dataset.role; renderNodeProps(panel); });
    });
    // 板位点选
    Array.prototype.forEach.call(sec.querySelectorAll('#p-deck-grid .dk-cell'), function (c) {
      c.addEventListener('click', function () {
        if (!snap) return;
        var slot = parseInt(c.dataset.slot, 10);
        var site = null;
        (snap.sites || []).forEach(function (s) { if (s.slot === slot) site = s; });
        if (!site) return;
        var st = deckSiteState(n, site, role);
        if (plain) {
          st.sel = deckParamArr((n.param || {})[role.param]).some(function (x) {
            return plainSlotOf(x) === slot;
          });
          st.off = false;
        }
        if (st.off) { note('warn', 'T' + slot + ' 不可作为「' + role.label + '」', st.why, 3200); return; }
        var r = deckPick(n, role, site, !st.sel);
        if (r && r.ok === false) { note('warn', '无法写入板位', r.msg, 3200); return; }
        renderNodeProps(panel);
      });
    });
    // 已选清单：移除
    Array.prototype.forEach.call(sec.querySelectorAll('.dks-chip .dc-x'), function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        pushUndo();
        var p = n.param || (n.param = {});
        if (b.dataset.deckDelName) {
          var nm = b.dataset.deckDelName;
          var dropSlot = plainSlotOf(nm);
          var orig = p[role.param];
          p[role.param] = deckParamWrite(orig, deckParamArr(orig).filter(function (x) {
            if (dropSlot && plainSlotOf(x) === dropSlot) return false;
            return resNameOf(x) !== nm;
          }));
        } else {
          delete p[role.param];
        }
        renderNodes(); afterChange(); renderNodeProps(panel);
      });
    });
    // 「用板位点选器编辑」跳转
    Array.prototype.forEach.call(panel.querySelectorAll('[data-deck-jump]'), function (b) {
      b.addEventListener('click', function () {
        deckState.role = b.dataset.deckJump; renderNodeProps(panel);
      });
    });
    // 首次进入：拉一次板位清单，回来后重绘这一格
    if (!plain && !snap && !deckState.failed[key]) {
      deckFetch(n, function () {
        if (document.getElementById('p-deck')) renderNodeProps(panel);
      });
    }
  }

  /** 对象 / 数组按 JSON 文本展示，避免 String(array) 变成 [object Object] 或丢掉方括号 */
  function paramText(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    return String(v);
  }

  /** 单个参数行：中文名 + 单位 + 范围 + 控件 + 默认值回填 */
  function shownParam(n, k) {
    var a = actionOfNode(n);
    var sch = (a && a.params && a.params[k]) || {};
    var p = n.param || {};
    if (Object.prototype.hasOwnProperty.call(p, k) && p[k] !== undefined && p[k] !== '') return p[k];
    if (!Object.prototype.hasOwnProperty.call(p, k) && sch.default !== undefined) return sch.default;
    return null;
  }
  function paramRow(n, k) {
    var a = actionOfNode(n);
    var sch = (a && a.params && a.params[k]) || {};
    var meta = sch.meta || {};
    var v = shownParam(n, k);
    if (sch.alias && v != null && sch.alias[String(v)] !== undefined) v = sch.alias[String(v)];
    var zh = meta.label || '';
    var label = (zh && zh !== k) ? (k + '（' + zh + '）') : k;
    var unit = meta.unit || '';
    var desc = meta.desc || '';
    var lo = sch.min, hi = sch.max;
    var h = '<div class="param-row" data-pk="' + esc(k) + '">';
    h += '<div class="pr-head"><span class="pr-name">' + esc(label) + '</span>' +
      (unit ? '<span class="pr-unit">' + esc(unit) + '</span>' : '') +
      (meta.rw ? '<span class="pr-rw">' + esc(meta.rw) + '</span>' : '') +
      (sch.deck ? '<span class="pr-unit" style="color:#4338ca;background:#eef2ff">板位</span>' : '') +
      '</div>';

    // 板位类参数（PRCXI）：由 4×4 板位点选器负责编辑，这里只给摘要 + 折叠的原始值
    if (sch.deck) {
      if (sch.value === 'slot') {
        h += '<div class="pr-deck-sum">' + ((v === undefined || v === null || v === '')
          ? '<span class="pd-empty">未选板位（T1..T16）</span>'
          : '<span class="pd-chip">T' + esc(v) + '</span>') + '</div>';
      } else {
        var arr = deckParamArr(v);
        h += '<div class="pr-deck-sum">' + (arr.length
          ? arr.map(function (r) {
              return '<span class="pd-chip">' + esc(resNameOf(r)) + '</span>';
            }).join('')
          : '<span class="pd-empty">未选板位</span>') + '</div>';
      }
      h += '<div class="pr-alias"><button class="pr-jump" data-deck-jump="' + esc(sch.role || '') + '">↑ 用板位点选器编辑</button>' +
        (sch.accept && sch.accept.length ? ' <span>可接受：' + esc(sch.accept.join('/')) + '</span>' : '') + '</div>';
      if (sch.value === 'slot') {
        h += '<details class="pr-raw"><summary>直接填板位号</summary>' +
          '<input type="number" data-pk="' + esc(k) + '" value="' + esc(v) + '" step="1"' +
          (lo !== undefined ? ' min="' + lo + '"' : '') + (hi !== undefined ? ' max="' + hi + '"' : '') + '/></details>';
      } else {
        h += '<details class="pr-raw"><summary>原始值（JSON 数组）</summary>' +
          '<textarea data-pk="' + esc(k) + '">' + esc(slotTextOf(v)) + '</textarea></details>';
      }
      if (desc) h += '<div class="pr-desc">' + esc(desc) + '</div>';
      h += '</div>';
      return h;
    }

    // 样本里只出现过一个取值时，枚举下拉无法改字（例如方案名只有 ""）。改成文本框。
    var opts = sch.options || [];
    var ranged = (typeof lo === 'number' && typeof hi === 'number' && hi > lo);
    if (sch.type === 'bool') {
      h += '<label class="props-check"><input type="checkbox" data-pk="' + esc(k) + '"' + (v ? ' checked' : '') + '/> 开启</label>';
    } else if (sch.type === 'enum' && opts.length > 1) {
      var map = meta.options || null;
      var known = opts.some(function (o) { return String(v) === String(o); });
      h += '<select data-pk="' + esc(k) + '">';
      if (!known) h += '<option value="" selected>请选择</option>';
      opts.forEach(function (o) {
        var txt = (map && map[String(o)]) ? (String(o) + ' · ' + map[String(o)]) : String(o);
        h += '<option value="' + esc(o) + '"' + (String(v) === String(o) ? ' selected' : '') + '>' + esc(txt) + '</option>';
      });
      h += '</select>';
    } else if (sch.type === 'json' || (v !== null && typeof v === 'object')) {
      h += '<textarea data-pk="' + esc(k) + '">' + esc(paramText(v)) + '</textarea>';
    } else if (sch.type === 'number' || sch.type === 'int' || (typeof v === 'number')) {
      h += '<div class="pr-ctl">';
      if (ranged) {
        h += '<input type="range" data-pk-range="' + esc(k) + '" min="' + lo + '" max="' + hi + '" step="' +
          (sch.type === 'int' ? 1 : 'any') + '" value="' + esc(v) + '"/>';
      }
      h += '<input type="number" data-pk="' + esc(k) + '"' + (sch.type === 'int' ? ' step="1"' : ' step="any"') +
        ' value="' + esc(v) + '"' + (ranged ? ' min="' + lo + '" max="' + hi + '"' : '') + '/>';
      h += '</div>';
      if (ranged) {
        h += '<div class="pr-range"><span>' + lo + '</span><span>' + hi + '</span></div>';
      }
    } else {
      h += '<input type="text" data-pk="' + esc(k) + '" value="' + esc(paramText(v)) + '"/>';
    }
    if (desc) h += '<div class="pr-desc">' + esc(desc) + '</div>';
    // 默认值回填
    if (sch.default !== undefined && String(sch.default) !== String(v)) {
      h += '<div class="pr-alias">协议默认值 <span class="pa-key">' + esc(fmtVal(sch.default)) + '</span>' +
        ' <button class="pr-default" data-pk-default="' + esc(k) + '">回填默认</button></div>';
    }
    h += '</div>';
    return h;
  }

  /** 属性栏当前正在编辑的节点：每次提交现查，避免叠监听闭包串改其它节点。 */
  function propEditNode() {
    if (!state.selected || state.selected.type === 'edge') return null;
    if (selCount() > 1) return null;
    return findNode(state.selected.id);
  }

  function bindParamInputs(panel) {
    // panel 生命周期内只挂一层委托；重绘属性栏不再叠加监听。
    if (panel.dataset.paramBound === '1') return;
    panel.dataset.paramBound = '1';

    function commit(k, val) {
      var n = propEditNode();
      if (!n) return;
      var a = actionOfNode(n);
      var sch = (a && a.params && a.params[k]) || {};
      var nv = val;
      if (!n.param) n.param = {};
      if (sch.type === 'bool') nv = !!val;
      else if (sch.type === 'json' && !(sch.deck && sch.value !== 'slot')) {
        var raw = String(val).trim();
        if (!raw) nv = [];
        else {
          try { nv = JSON.parse(raw); }
          catch (e) { nv = val; }
        }
      } else if (sch.type === 'int' || sch.type === 'number') {
        if (val === '' || val === null || val === undefined) nv = null;
        else nv = sch.type === 'int' ? parseInt(val, 10) : parseFloat(val);
        if (typeof nv === 'number' && isNaN(nv)) nv = null;
      }
      // 板位类 JSON 参数：原本是数组的，解析回来继续用数组（保持与真实工作流同形）
      if (sch.deck && sch.value !== 'slot' && Array.isArray(n.param[k])) {
        try {
          var pa = JSON.parse(String(nv));
          if (Array.isArray(pa)) nv = pa;
        } catch (e) { /* 保留原字符串，用户还在编辑 */ }
      }
      // 样本只观察到一个数时 min===max，钳制会把任何修改弹回去。只在真正有区间时钳制。
      var clamped = nv;
      var lo = sch.min, hi = sch.max;
      var ranged = typeof nv === 'number' && !isNaN(nv) &&
        typeof lo === 'number' && typeof hi === 'number' && hi > lo;
      if (ranged && nv < lo) clamped = lo;
      if (ranged && nv > hi) clamped = hi;
      n.param[k] = clamped;
      // 同步控件。空白表示不写该点位，不能回填成 0
      var shown = clamped == null ? '' : clamped;
      var inp = panel.querySelector('input[data-pk="' + k + '"]');
      var rng = panel.querySelector('input[data-pk-range="' + k + '"]');
      if (inp && String(inp.value) !== String(shown)) inp.value = shown;
      if (rng && shown !== '' && String(rng.value) !== String(shown)) rng.value = shown;
      if (inp) inp.classList.toggle('invalid', clamped !== nv);
      renderNodes(); afterChange();
    }
    panel.addEventListener('input', function (ev) {
      var t = ev.target, pk = t.dataset.pk;
      if (!pk) return;
      if (t.type === 'range') return; // 拖动时只更新数字框，change 时提交
      var rng = panel.querySelector('input[data-pk-range="' + pk + '"]');
      if (rng) rng.value = t.value;
    });
    panel.addEventListener('change', function (ev) {
      var t = ev.target, pk = t.dataset.pk;
      if (t.dataset.pkDefault) {
        var k = t.dataset.pkDefault;
        var n = propEditNode();
        if (!n) return;
        var a = actionOfNode(n);
        var d = (a && a.params && a.params[k] && a.params[k].default);
        commit(k, d); renderNodeProps(panel); return;
      }
      if (!pk) return;
      if (t.type === 'checkbox' && t.dataset.pk) return commit(pk, t.checked);
      if (t.type === 'range') { commit(pk, t.value); return; }
      commit(pk, t.value);
    });
  }

  /** 拓扑语义：前置/后继/并行入口/汇合/同设备冲突/提示 */
  function semanticsOf(n) {
    var edges = state.wf.data.edges;
    var preds = edges.filter(function (e) { return e.target_node_uuid === n.uuid; });
    var succs = edges.filter(function (e) { return e.source_node_uuid === n.uuid; });
    var notes = [];
    // 同设备冲突
    var conflicts = [];
    var sameDev = state.wf.data.nodes.filter(function (x) {
      return x.uuid !== n.uuid && x.device_name && x.device_name === n.device_name;
    });
    var predIds = {}, succIds = {};
    preds.forEach(function (e) { predIds[e.source_node_uuid] = 1; });
    succs.forEach(function (e) { succIds[e.target_node_uuid] = 1; });
    sameDev.forEach(function (x) {
      // 互为直接前驱/后继 → 必需串行（正常）；否则可能是"同设备并行"隐患
      if (predIds[x.uuid] || succIds[x.uuid]) conflicts.push(x._display ? x._display.actionLabel : x.name);
      else if (isConcurrent(n.uuid, x.uuid)) conflicts.push((x._display ? x._display.actionLabel : x.name) + '（同层并行）');
    });
    // 同层并行且设备互不相同 → 提示可并行
    var deviceParallel = [];
    state.wf.data.nodes.forEach(function (x) {
      if (x.uuid !== n.uuid && x.device_name && x.device_name !== n.device_name && isConcurrent(n.uuid, x.uuid)) {
        deviceParallel.push(x.device_name);
      }
    });

    if (!preds.length && !succs.length && n.type !== 'Group') notes.push('⚠ 该节点未连接任何流程线（孤立节点），导出前会被提示。');
    if (n.device_name === 'PRCXI' && n.name === 'reset') {
      notes.push('ℹ 复位直接调用 IAutomation.Reset，各轴回到初始位置，不需要创建协议。');
    } else if (n.device_name === 'PRCXI') {
      notes.push('ℹ 移液工作站节点需被 create_protocol → 动作… → run_protocol 包裹后才能执行。');
    }
    if (n.name === 'balance_plates') {
      notes.push('ℹ 配平之后先接 9320 的 auto-create_protocol 创建协议，协议建好后再接 transfer_liquid，最后 auto-run_protocol。不能把 transfer_liquid 直接接在配平后面。');
    }
    if (n.device_name === 'gn_locking_mechanism' && (n.param || {}).cmd_type === 11) {
      notes.push('ℹ 终锁(11)：需先完成四角预锁(15)；孔顺序 1→3→2→4。');
    }
    if (n.device_name === 'gn_locking_mechanism' && (n.param || {}).cmd_type === 15) {
      notes.push('ℹ 预锁(15)：必须写 pre_turns（×0.1圈，四颗螺丝共用）。');
    }
    return {
      preds: preds, succs: succs, fanout: succs.length, fanin: preds.length,
      conflicts: conflicts, deviceParallel: deviceParallel, notes: notes
    };
  }

  /** a、b 是否可能同时执行（互不依赖，且都不是对方祖先/后代） */
  function isConcurrent(a, b) {
    var reach = function (from) {
      var seen = {}, stack = [from];
      while (stack.length) {
        var cur = stack.pop();
        state.wf.data.edges.forEach(function (e) {
          if (e.source_node_uuid === cur && !seen[e.target_node_uuid]) {
            seen[e.target_node_uuid] = 1; stack.push(e.target_node_uuid);
          }
        });
      }
      return seen;
    };
    var ra = reach(a), rb = reach(b);
    return !ra[b] && !rb[a];
  }

  function renderEdgeProps(panel) {
    var e = null;
    state.wf.data.edges.forEach(function (x) { if (edgeId(x) === state.selected.id) e = x; });
    if (!e) { state.selected = null; showProps(); return; }
    var src = findNode(e.source_node_uuid), tgt = findNode(e.target_node_uuid);
    var kind = edgeKind(e);
    var kindTxt = kind === 'parallel' ? '并行入口 / 汇合（依赖满足后两条支线可同时开始）'
      : kind === 'material' ? '参数传递（上游输出喂给下游参数）' : '流程依赖（先做 → 后做）';
    var msg = '';
    if (kind === 'parallel' && src && tgt && src.device_name && src.device_name === tgt.device_name) {
      msg = '<div class="props-note">⚠ 上下游是同一设备（' + esc(src.device_name) + '），并行分支在该设备上会被串行化。</div>';
    }
    panel.innerHTML =
      '<div class="props-sec"><h4><span class="ps-ico">🔗</span>连线属性</h4>' +
      '<div class="props-row"><label>来源 → 目标</label><div class="pval">' +
      esc(src ? (src._display.actionLabel || src.name) : '?') + ' → ' +
      esc(tgt ? (tgt._display.actionLabel || tgt.name) : '?') + '</div></div>' +
      '<div class="props-row"><label>关系类型（自动推导）</label><div>' +
      '<span class="props-tag ' + (kind === 'dep' ? '' : 'real') + '">' + esc(kindTxt) + '</span></div></div>' +
      '<div class="props-row"><label>handle</label><div class="pval">' +
      esc(e.source_handle_key || 'ready') + ' : ' + esc(e.source_handle_io || 'source') + ' → ' +
      esc(e.target_handle_key || 'ready') + ' : ' + esc(e.target_handle_io || 'target') + '</div></div>' +
      msg + '</div>' +
      '<div class="props-actions"><button id="btn-del-edge" class="danger">🗑 删除连线</button></div>';
    document.getElementById('btn-del-edge').addEventListener('click', function () {
      pushUndo();
      var gone = null;
      state.wf.data.edges.forEach(function (x) { if (edgeId(x) === state.selected.id) gone = x; });
      if (gone && gone._embed) {
        forgetTemplateEdge(gone);
        scheduleTplPut(gone._embed.templateId);
      }
      state.wf.data.edges = state.wf.data.edges.filter(function (x) { return edgeId(x) !== state.selected.id; });
      state.selected = null;
      renderEdges(); showProps(); updateStats(); afterChange();
    });
  }

  function updateNodeCard(n) {
    var d = canvas.querySelector('[data-uuid="' + n.uuid + '"]');
    if (!d) return;
    var nd = nodeEl(n);
    d.replaceWith(nd);
    var sx = n.pose.position.x * state.view.scale + state.view.x;
    var sy = n.pose.position.y * state.view.scale + state.view.y;
    nd.style.transform = 'translate(' + sx + 'px,' + sy + 'px)';
    renderEdges();
  }
  function updateStats() {
    var s = document.getElementById('wf-stats');
    var m = edgeKindMap();
    var par = 0;
    Object.keys(m.outDeg).forEach(function (k) { if (m.outDeg[k] > 1) par += m.outDeg[k]; });
    var devs = {};
    state.wf.data.nodes.forEach(function (n) { if (n.device_name) devs[n.device_name] = 1; });
    s.textContent = '节点 ' + state.wf.data.nodes.length + ' · 连线 ' + state.wf.data.edges.length +
      ' · 设备 ' + Object.keys(devs).length + (par ? ' · 并行分支 ' + par : '');
  }
  function afterChange() { state.dirty = true; scheduleDraft(); renderMinimap(); scheduleTemplateSync(); }

  // ---------- 删除 / 复制 ----------
  function deleteNode(uuid) {
    pushUndo();
    var victim = findNode(uuid);
    if (victim && victim._embed) {
      dropTemplateNode(victim._embed.templateId, victim._embed.srcUuid);
      scheduleTplPut(victim._embed.templateId);
      renderNodes(); showProps(); updateStats(); afterChange();
      return;
    }
    state.wf.data.nodes = state.wf.data.nodes.filter(function (x) { return x.uuid !== uuid; });
    state.wf.data.edges = state.wf.data.edges.filter(function (e) {
      return e.source_node_uuid !== uuid && e.target_node_uuid !== uuid;
    });
    delete state.selectedIds[uuid];
    state.selected = null;
    renderNodes(); showProps(); updateStats(); afterChange();
  }
  function deleteSelected() {
    var ids = Object.keys(state.selectedIds);
    if (!ids.length) return;
    pushUndo();
    var dropped = {};
    ids.forEach(function (id) {
      var n = findNode(id);
      if (!n || !n._embed) return;
      var k = n._embed.templateId + '|' + n._embed.srcUuid;
      if (dropped[k]) return;
      dropped[k] = 1;
      dropTemplateNode(n._embed.templateId, n._embed.srcUuid);
      scheduleTplPut(n._embed.templateId);
    });
    state.wf.data.nodes = state.wf.data.nodes.filter(function (x) { return !state.selectedIds[x.uuid]; });
    state.wf.data.edges = state.wf.data.edges.filter(function (e) {
      return !state.selectedIds[e.source_node_uuid] && !state.selectedIds[e.target_node_uuid];
    });
    state.selectedIds = {}; state.selected = null;
    renderNodes(); showProps(); updateStats(); afterChange();
  }
  function duplicateSelected() {
    var ids = Object.keys(state.selectedIds);
    if (!ids.length) return;
    pushUndo();
    var map = {}, news = [];
    ids.forEach(function (id) {
      var n = findNode(id); if (!n) return;
      var c = JSON.parse(JSON.stringify(n));
      c.uuid = uid(); c.pose.position.x += 32; c.pose.position.y += 32;
      delete c._embed;
      map[id] = c.uuid; news.push(c);
    });
    news.forEach(function (c) { state.wf.data.nodes.push(c); });
    // 内部连线也复制
    state.wf.data.edges.slice().forEach(function (e) {
      if (map[e.source_node_uuid] && map[e.target_node_uuid]) {
        state.wf.data.edges.push({
          source_node_uuid: map[e.source_node_uuid], target_node_uuid: map[e.target_node_uuid],
          source_handle_key: 'ready', source_handle_io: 'source',
          target_handle_key: 'ready', target_handle_io: 'target'
        });
      }
    });
    state.selectedIds = {};
    news.forEach(function (c) { state.selectedIds[c.uuid] = 1; });
    renderNodes(); showProps(); updateStats(); afterChange();
  }

  // ---------- 校验 ----------
  function validate() {
    var nodes = state.wf.data.nodes, edges = state.wf.data.edges;
    var errors = [], warns = [];
    // 环检测（DFS）
    var children = {};
    edges.forEach(function (e) { (children[e.source_node_uuid] = children[e.source_node_uuid] || []).push(e.target_node_uuid); });
    var color = {}, cyc = null;
    function dfs(u, path) {
      color[u] = 1;
      var cs = children[u] || [];
      for (var i = 0; i < cs.length; i++) {
        var v = cs[i];
        if (color[v] === 1) { cyc = path.concat([u, v]); return true; }
        if (!color[v] && dfs(v, path.concat([u]))) return true;
      }
      color[u] = 2; return false;
    }
    for (var i = 0; i < nodes.length; i++) { if (!color[nodes[i].uuid] && dfs(nodes[i].uuid, [])) break; }
    if (cyc) {
      var names = cyc.map(function (u) { var n = findNode(u); return n ? (n._display.actionLabel || n.name) : u; });
      errors.push('存在循环依赖：' + names.join(' → '));
    }
    // 孤立节点
    var orphan = nodes.filter(function (n) {
      if (n.type === 'Group') return false;
      return !edges.some(function (e) { return e.source_node_uuid === n.uuid || e.target_node_uuid === n.uuid; });
    });
    if (orphan.length) warns.push('有 ' + orphan.length + ' 个孤立节点（未连任何流程线）：' +
      orphan.map(function (n) { return n._display.actionLabel || n.name; }).slice(0, 5).join('、') + (orphan.length > 5 ? '…' : ''));
    // 同设备并行冲突（同层且同设备）
    var conflicts = [];
    nodes.forEach(function (a) {
      nodes.forEach(function (b) {
        if (a.uuid >= b.uuid || !a.device_name || a.device_name !== b.device_name) return;
        if (isConcurrent(a.uuid, b.uuid)) conflicts.push((a._display.actionLabel || a.name) + ' ⇄ ' + (b._display.actionLabel || b.name));
      });
    });
    if (conflicts.length) {
      warns.push('存在 ' + conflicts.length + ' 组「同设备但无依赖」的节点，运行时会被设备锁串行化：' +
        conflicts.slice(0, 4).join('；') + (conflicts.length > 4 ? '…' : ''));
    }
    // PRCXI 包裹规则
    ['create', 'run'].forEach(function () { });
    var prc = nodes.filter(function (n) {
      return n.device_name === 'PRCXI' && n.name !== 'reset';
    });
    if (prc.length) {
      var hasCreate = prc.some(function (n) { return n.name === 'auto-create_protocol'; });
      var hasRun = prc.some(function (n) { return n.name === 'auto-run_protocol'; });
      if (!hasCreate || !hasRun) errors.push('移液工作站（PRCXI）节点缺少协议包裹：需要 auto-create_protocol 与 auto-run_protocol。');
    }
    nodes.forEach(function (n) {
      if (n.name !== 'balance_plates') return;
      var nexts = edges.filter(function (e) { return e.source_node_uuid === n.uuid; });
      var nxt = nexts.length === 1 ? findNode(nexts[0].target_node_uuid) : null;
      if (!nxt || nxt.name !== 'auto-create_protocol') {
        errors.push('「反应板与配平板配平」后面要先接 auto-create_protocol。协议创建之后才能再接 transfer_liquid，最后接 auto-run_protocol。');
        return;
      }
      var after = edges.filter(function (e) { return e.source_node_uuid === nxt.uuid; }).map(function (e) { return findNode(e.target_node_uuid); }).filter(Boolean);
      var transfer = null;
      after.forEach(function (x) {
        if (x.name === 'transfer_liquid' || x.template_name === 'transfer_liquid') transfer = x;
      });
      if (!transfer) {
        errors.push('auto-create_protocol 之后要接 transfer_liquid，由它按配平差值吸放液，然后再接 auto-run_protocol。');
        return;
      }
      var ran = edges.some(function (e) {
        return e.source_node_uuid === transfer.uuid && (function () {
          var t = findNode(e.target_node_uuid);
          return t && t.name === 'auto-run_protocol';
        })();
      });
      if (!ran) errors.push('transfer_liquid 之后要接 auto-run_protocol，协议才会真正执行。');
    });
    // 锁紧工艺规则
    var lock = nodes.filter(function (n) { return n.device_name === 'gn_locking_mechanism'; });
    var hasFinal = lock.some(function (n) { return (n.param || {}).cmd_type === 11; });
    var hasPre = lock.some(function (n) { return (n.param || {}).cmd_type === 15; });
    if (hasFinal && !hasPre) warns.push('有终锁(11)但没有预锁(15)：按 1.4.0 工艺应先四角预锁再终锁。');
    // 节点级：越界参数
    nodes.forEach(function (n) {
      var a = actionOfNode(n);
      if (!a || !n.param) return;
      Object.keys(n.param).forEach(function (k) {
        var s = a.params && a.params[k]; if (!s) return;
        var v = n.param[k];
        if (typeof v === 'number') {
          if (s.min !== undefined && v < s.min) warns.push((n._display.actionLabel) + ' 的 ' + (s.meta ? s.meta.label : k) + '=' + v + ' 低于最小值 ' + s.min);
          if (s.max !== undefined && v > s.max) warns.push((n._display.actionLabel) + ' 的 ' + (s.meta ? s.meta.label : k) + '=' + v + ' 超过最大值 ' + s.max);
        }
      });
    });
    return { errors: errors, warns: warns };
  }
  function showValidate() {
    var r = validate();
    var lines = [];
    if (r.errors.length) {
      lines.push('❌ 阻塞性错误 ' + r.errors.length + ' 项（必须修复才能运行/导出）');
      r.errors.forEach(function (e) { lines.push('· ' + e); });
    }
    if (r.warns.length) {
      if (lines.length) lines.push('');
      lines.push('⚠ 提示 ' + r.warns.length + ' 项');
      r.warns.forEach(function (w) { lines.push('· ' + w); });
    }
    if (!lines.length) {
      note('ok', '校验通过', '未发现环路、孤立节点、同设备冲突或参数越界。', 4200);
    } else if (r.errors.length) {
      note('err', '校验未通过', lines, 16000);
    } else {
      note('warn', '校验通过（有提示）', lines, 11000);
    }
    // 刷新右侧面板：若正选中某节点，其「校验提示」区会同步更新
    showProps();
    return r;
  }

  // ---------- 自动布局（rank 分层 + 折行分带） ----------
  // 参考 Uni-Lab-OS/frontend/src/lib/workflowGraphLayout.ts 的 rank + ranksPerBand：
  // 单纯按 rank 从左到右排，长链工作流会拉成一条几千像素的横线，
  // 适应画布后缩放到 40%~50%，字全糊了。所以这里把 rank 折成若干「带」，
  // 并让相邻带反向排列（蛇形），使一段连续流程在视觉上首尾相接。
  var LAYOUT = { COL: 300, ROW: 186, X0: 60, Y0: 56, BAND_GAP: 34 };

  function autoLayout(opts) {
    opts = opts || {};
    var nodes = state.wf.data.nodes, edges = state.wf.data.edges;
    if (!nodes.length) return;
    if (!opts.silent) pushUndo();
    clearNotes();   // 布局后「已缩放到 xx%」的旧提示就过期了

    var indeg = {}, children = {};
    nodes.forEach(function (n) { indeg[n.uuid] = 0; children[n.uuid] = []; });
    edges.forEach(function (e) {
      if (indeg[e.target_node_uuid] === undefined) return;
      indeg[e.target_node_uuid]++;
      if (children[e.source_node_uuid]) children[e.source_node_uuid].push(e.target_node_uuid);
    });
    // rank = 最长路径（Kahn 拓扑），环内节点保持 rank 0
    var rank = {}, q = [];
    nodes.forEach(function (n) { rank[n.uuid] = 0; if (!indeg[n.uuid]) q.push(n.uuid); });
    var seen = {};
    while (q.length) {
      var u = q.shift(); seen[u] = 1;
      children[u].forEach(function (v) {
        rank[v] = Math.max(rank[v] || 0, rank[u] + 1);
        indeg[v]--;
        if (indeg[v] === 0) q.push(v);
      });
    }
    nodes.forEach(function (n) { if (!seen[n.uuid]) rank[n.uuid] = rank[n.uuid] || 0; });

    var byRank = {}, rankKeys = [];
    nodes.forEach(function (n) {
      var r = rank[n.uuid];
      if (!byRank[r]) { byRank[r] = []; rankKeys.push(r); }
      byRank[r].push(n);
    });
    rankKeys.sort(function (a, b) { return a - b; });
    var nR = rankKeys.length;
    rankKeys.forEach(function (r) {
      byRank[r].sort(function (a, b) {
        if (a.device_name === b.device_name) return 0;
        return (a.device_name || '') < (b.device_name || '') ? -1 : 1;
      });
    });

    // 每行节点数 = 该 rank 的节点数；带高按带内最多节点数算
    var rowOf = {};
    rankKeys.forEach(function (r) { rowOf[r] = byRank[r].length; });

    // 选 ranksPerBand：让内容长宽比接近画布长宽比（折行后最省缩放）
    var cr = wrap.getBoundingClientRect();
    var canvasAR = (cr.width || 1200) / (cr.height || 800);
    var best = { rpb: nR, score: Infinity };
    for (var rpb = 1; rpb <= nR; rpb++) {
      var bands = Math.ceil(nR / rpb), maxRows = 1;
      for (var bi = 0; bi < bands; bi++) {
        var mx = 0;
        for (var k = bi * rpb; k < Math.min(nR, (bi + 1) * rpb); k++) mx = Math.max(mx, rowOf[rankKeys[k]]);
        maxRows = Math.max(maxRows, mx || 1);
      }
      var W = rpb * LAYOUT.COL, H = bands * (maxRows * LAYOUT.ROW + LAYOUT.BAND_GAP);
      var score = Math.abs((W / H) - canvasAR) + 0.12 * Math.abs(Math.log(W / H) - Math.log(canvasAR));
      if (score < best.score) best = { rpb: rpb, score: score };
    }
    var rpb = opts.ranksPerBand || best.rpb;

    // 逐带摆放；奇数带反向，让流程蛇形衔接
    var y = LAYOUT.Y0;
    for (var b = 0; b * rpb < nR; b++) {
      var idxs = [];
      for (var k2 = b * rpb; k2 < Math.min(nR, (b + 1) * rpb); k2++) idxs.push(k2);
      var maxRows2 = 1;
      idxs.forEach(function (i) { maxRows2 = Math.max(maxRows2, rowOf[rankKeys[i]]); });
      idxs.forEach(function (i, jj) {
        var rankIdx = (b % 2 === 1) ? (idxs.length - 1 - jj) : jj;
        var rk = rankKeys[i];
        var colNodes = byRank[rk];
        var offset = (maxRows2 - colNodes.length) / 2;   // 短列在带内居中
        colNodes.forEach(function (n, ii) {
          n.pose.position.x = LAYOUT.X0 + rankIdx * LAYOUT.COL;
          n.pose.position.y = y + (offset + ii) * LAYOUT.ROW;
        });
      });
      y += maxRows2 * LAYOUT.ROW + LAYOUT.BAND_GAP;
    }

    renderNodes(); showProps(); afterChange();
    fitView();
    setTimeout(fitView, 60);
    if (!opts.silent) {
      note('ok', '已自动布局', nR + ' 个层级折成 ' + Math.ceil(nR / rpb) + ' 带（每带 ' + rpb +
        ' 级），同设备节点靠拢、并行分支并列。', 4200);
    }
    return { ranks: nR, ranksPerBand: rpb, bands: Math.ceil(nR / rpb) };
  }

  // ---------- 草稿 ----------
  var draftTimer = null;
  function writeDraftNow() {
    try { localStorage.setItem('wfed_draft', JSON.stringify({ name: state.wf.name, wf: collectLinked(), at: Date.now() })); } catch (e) { }
  }
  function scheduleDraft() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(writeDraftNow, 700);
  }

  // ---------- 事件绑定 ----------
  function bind() {
    // ============================================================
    // 手势原语：鼠标与触屏共用同一套逻辑，避免两套实现走偏。
    //   鼠标事件（pointerType=mouse）→ mousedown/mousemove/mouseup
    //   触屏 / 手写笔              → pointerdown/pointermove/pointerup
    // 两条路都落到 begin*/gestureMove/gestureEnd 上。
    // ============================================================

    function localPt(cx, cy) {
      var r = wrap.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    }
    function worldPt(cx, cy) {
      var p = localPt(cx, cy);
      return screenToCanvas(p.x, p.y);
    }

    function beginLink(uuid) {
      var r = nodeRect(uuid);
      // 连线层与节点层同变换，预览线也用世界坐标
      state.linking = { srcUuid: uuid, sx: r.x + r.w, sy: r.y + PORT_DY,
                        vx: r.x + r.w, vy: r.y + PORT_DY };
      renderEdges();
    }

    /** 选中节点（additive = 触屏上的「点在已选中节点上」/ 鼠标 Ctrl 多选） */
    function selectNode(uuid, additive) {
      if (additive) {
        if (state.selectedIds[uuid]) delete state.selectedIds[uuid];
        else state.selectedIds[uuid] = 1;
        state.selected = { type: 'node', id: uuid };
      } else if (!state.selectedIds[uuid]) {
        state.selectedIds = {};
        state.selectedIds[uuid] = 1;
        state.selected = { type: 'node', id: uuid };
      } else {
        state.selected = { type: 'node', id: uuid };
      }
    }

    /** 按下节点：先选中，再把「指针世界坐标 - 节点原点」记成拖动偏移（支持多选整体拖） */
    function beginDrag(uuid, additive, cx, cy) {
      selectNode(uuid, additive);
      var w = worldPt(cx, cy);
      state.dragMul = Object.keys(state.selectedIds).map(function (id) {
        var m = findNode(id);
        return m ? { uuid: id, dx: w.x - m.pose.position.x, dy: w.y - m.pose.position.y } : null;
      }).filter(Boolean);
      renderNodes(); showProps();
      expandPropsPanel();
      state._dragStartPos = {};
      (state.dragMul || []).forEach(function (d) {
        var m = findNode(d.uuid);
        if (m && m.pose && m.pose.position) state._dragStartPos[d.uuid] = { x: m.pose.position.x, y: m.pose.position.y };
      });
    }

    function beginPan(cx, cy) {
      state.pan = { sx: cx, sy: cy, vx: state.view.x, vy: state.view.y };
    }
    function beginMarquee(cx, cy) {
      var p = localPt(cx, cy);
      state.marquee = { x0: p.x, y0: p.y };
      marqueeEl.style.display = 'block';
      marqueeEl.style.left = p.x + 'px'; marqueeEl.style.top = p.y + 'px';
      marqueeEl.style.width = '0px'; marqueeEl.style.height = '0px';
    }

    function gestureMove(cx, cy) {
      var mx, my;
      var cr = wrap.getBoundingClientRect();
      mx = cx - cr.left; my = cy - cr.top;
      state._lastPt = { cx: cx, cy: cy };
      if (state.linking) {
        var w = screenToCanvas(mx, my);
        state.linking.vx = w.x; state.linking.vy = w.y;
        var t = document.elementFromPoint(cx, cy);
        Array.prototype.forEach.call(wrap.querySelectorAll('.port.hot'), function (p) { p.classList.remove('hot'); });
        if (t && t.classList && t.classList.contains('port') && t.classList.contains('in')) t.classList.add('hot');
        renderEdges();
      }
      if (state.dragMul && state.dragMul.length) {
        var pos = screenToCanvas(mx, my);
        var guides = [];
        state.dragMul.forEach(function (m) {
          var n = findNode(m.uuid); if (!n) return;
          var nx = Math.round((pos.x - m.dx) / GRID) * GRID;
          var ny = Math.round((pos.y - m.dy) / GRID) * GRID;
          state.wf.data.nodes.forEach(function (o) {
            if (state.selectedIds[o.uuid]) return;
            if (Math.abs(o.pose.position.x - nx) < 6) { nx = o.pose.position.x; guides.push({ t: 'v', x: nx }); }
            if (Math.abs(o.pose.position.y - ny) < 6) { ny = o.pose.position.y; guides.push({ t: 'h', y: ny }); }
          });
          n.pose.position.x = nx; n.pose.position.y = ny;
        });
        drawGuides(guides);
        updatePositions();
      }
      if (state.pan) {
        state.view.x = state.pan.vx + (cx - state.pan.sx);
        state.view.y = state.pan.vy + (cy - state.pan.sy);
        applyView(); updatePositions();
      }
      if (state.marquee) {
        var x1 = Math.max(0, Math.min(mx, state.marquee.x0)), y1 = Math.max(0, Math.min(my, state.marquee.y0));
        var w2 = Math.abs(mx - state.marquee.x0), h2 = Math.abs(my - state.marquee.y0);
        marqueeEl.style.left = x1 + 'px'; marqueeEl.style.top = y1 + 'px';
        marqueeEl.style.width = w2 + 'px'; marqueeEl.style.height = h2 + 'px';
        var a = screenToCanvas(x1, y1), b = screenToCanvas(x1 + w2, y1 + h2);
        state.selectedIds = {};
        state.wf.data.nodes.forEach(function (n) {
          var nd = canvas.querySelector('[data-uuid="' + n.uuid + '"]');
          var nh = nd ? nd.offsetHeight : 132;
          if (n.pose.position.x < b.x && n.pose.position.x + NODE_W > a.x &&
              n.pose.position.y < b.y && n.pose.position.y + nh > a.y) state.selectedIds[n.uuid] = 1;
        });
        Array.prototype.forEach.call(canvas.children, function (d) {
          d.classList.toggle('selected', !!state.selectedIds[d.dataset.uuid]);
        });
      }
      if (state.ghost) ghostMove(cx, cy);
    }

    function gestureEnd(cx, cy) {
      if (cx == null && state._lastPt) { cx = state._lastPt.cx; cy = state._lastPt.cy; }
      if (state.linking) {
        var target = cx == null ? null : document.elementFromPoint(cx, cy);
        var portEl = target && target.classList && target.classList.contains('port') && target.classList.contains('in') ? target : null;
        if (portEl) {
          var tgtNode = portEl.closest('.wfnode');
          var tgt = tgtNode.dataset.uuid;
          var src = state.linking.srcUuid;
          if (src !== tgt && !edgeExists(src, tgt) && !createsCycle(src, tgt)) {
            pushUndo();
            var srcN = findNode(src), tgtN = findNode(tgt);
            var edge = {
              source_node_uuid: src, target_node_uuid: tgt,
              source_handle_key: 'ready', source_handle_io: 'source',
              target_handle_key: 'ready', target_handle_io: 'target'
            };
            if (srcN && tgtN && srcN._embed && tgtN._embed &&
                srcN._embed.hostEmbedId === tgtN._embed.hostEmbedId &&
                srcN._embed.templateId === tgtN._embed.templateId) {
              edge._embed = { hostEmbedId: srcN._embed.hostEmbedId, templateId: srcN._embed.templateId };
              rememberTemplateEdge(srcN._embed.templateId, srcN._embed.srcUuid, tgtN._embed.srcUuid);
              scheduleTplPut(srcN._embed.templateId);
            }
            state.wf.data.edges.push(edge);
            state.wf.data.nodes.forEach(refreshDisplay);
            updateStats(); afterChange();
          } else if (src !== tgt && createsCycle(src, tgt)) {
            note('warn', '连线被拒绝', '这条连线会让工作流形成循环依赖，调度器无法确定执行顺序。');
          }
        }
        Array.prototype.forEach.call(wrap.querySelectorAll('.port.hot'), function (p) { p.classList.remove('hot'); });
        state.linking = null;
        renderEdges();
      }
      if (state.dragMul) { finishEmbedDrag(); state.dragMul = null; drawGuides([]); }
      if (state.pan) state.pan = null;
      if (state.marquee) {
        state.marquee = null; marqueeEl.style.display = 'none';
        showProps();
      }
      // 注意：幽灵节点（从库里拖出来的）不在这里清理，统一由 dropGhost 收，
      // 否则鼠标松手时会被提前删掉，落点判定就没机会跑了。
      state._gx = state._gy = null;
    }

    /** 从一个按下点决定这次手势做什么（鼠标左右键、触屏单指共用） */
    function decideGesture(ev, cx, cy) {
      var tgt = ev.target;
      var portEl = tgt.classList && tgt.classList.contains('port') ? tgt : null;
      var node = tgt.closest ? tgt.closest('.wfnode') : null;
      if (node && portEl && portEl.classList.contains('out')) { beginLink(node.dataset.uuid); return 'link'; }
      if (node) {
        if (tgt.classList.contains('wfnode-del') || tgt.classList.contains('wfnode-dis')) return 'none';
        // 点在节点文字上时留给浏览器选中、复制，不开始拖动；仍然选中并展开属性栏
        if (tgt.closest && tgt.closest('.n-title, .n-sub, .wfnode-prow')) {
          selectNode(node.dataset.uuid, !!(ev.ctrlKey || ev.metaKey));
          Array.prototype.forEach.call(canvas.children, function (d) {
            d.classList.toggle('selected', !!state.selectedIds[d.dataset.uuid]);
          });
          showProps();
          expandPropsPanel();
          return 'none';
        }
        var additive = !!(ev.ctrlKey || ev.metaKey);
        beginDrag(node.dataset.uuid, additive, cx, cy);
        return 'drag';
      }
      var edgeIdHit = tgt && tgt.dataset && tgt.dataset.edge;
      if (edgeIdHit) {
        state.selected = { type: 'edge', id: edgeIdHit };
        state.selectedIds = {};
        renderEdges();
        showProps();
        expandPropsPanel();
        return 'none';
      }
      if (ev.shiftKey || state.marqueeMode) { beginMarquee(cx, cy); return 'marquee'; }
      beginPan(cx, cy); select(null);
      return 'pan';
    }

    // ---------- 指针事件：鼠标 / 触屏 / 手写笔共用一套手势原语 ----------
    // 为什么统一：曾经鼠标单独走 mousedown/mousemove/mouseup，触屏走 pointer*。
    // 重写时 pointerdown 开头写了 `if (pointerType === 'mouse') return`，
    // 而 mousedown 那一支被删掉了 —— 结果鼠标既拖不动节点也平移不了画布。
    // 现在只有一条路：pointerdown 决定手势 → pointermove 执行 → pointerup 收尾。
    var touches = {};        // pointerId -> {x,y}（触屏多指）
    var touchMode = null;    // pan | drag | link | marquee | pinch | none
    var pinch0 = null;       // 捏合起始信息
    var downPt = null;       // 按下点（判断是「点」还是「拖」）
    var downNode = null;     // 按下时命中的节点 uuid（指针被 wrap 捕获后 ev.target 就不可靠了）
    var mouseDown = false;   // 鼠标左键是否按下
    var lastTap = { t: 0, uuid: null, x: 0, y: 0 };

    function ptDist(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)); }
    function touchList() { return Object.keys(touches).map(function (k) { return touches[k]; }); }

    function startPinch() {
      gestureEnd(null, null);
      var pts = touchList();
      if (pts.length < 2) return;
      pinch0 = {
        d: Math.max(1, ptDist(pts[0], pts[1])),
        cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2,
        vx: state.view.x, vy: state.view.y, scale: state.view.scale,
      };
      touchMode = 'pinch';
    }

    wrap.addEventListener('pointerdown', function (ev) {
      // 运行抽屉盖在画布上：这里的按下是划选文字，不能当成平移画布
      if (ev.target && ev.target.closest && ev.target.closest('#wfed-run')) return;
      // 点画布就取消「固定展开」，否则钉住的节点库 / 属性面板会一直盖着画布
      if (typeof setPinned === 'function') setPinned(false);
      if (typeof setPropPinned === 'function') setPropPinned(false);
      // 鼠标：只认左键；不 preventDefault，否则会吃掉 dblclick（双击改说明）与 click（删节点）
      if (ev.pointerType === 'mouse') {
        if (ev.button !== 0) return;
        if (state.ghost) return;                  // 正在从节点库拖一个幽灵节点过来
        mouseDown = true;
        downPt = { x: ev.clientX, y: ev.clientY };
        touchMode = decideGesture(ev, ev.clientX, ev.clientY);
        return;
      }
      // 触屏 / 手写笔：必须 preventDefault，否则滚动手势会被浏览器抢走
      ev.preventDefault();
      touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      if (touchList().length >= 2) { try { wrap.setPointerCapture(ev.pointerId); } catch (e) { } startPinch(); return; }
      var nodeEl = ev.target && ev.target.closest ? ev.target.closest('.wfnode') : null;
      downNode = nodeEl ? nodeEl.dataset.uuid : null;
      downPt = { x: ev.clientX, y: ev.clientY };
      touchMode = decideGesture(ev, ev.clientX, ev.clientY);
      try { wrap.setPointerCapture(ev.pointerId); } catch (e) { }
    }, { passive: false });

    // move/up 挂在 window 上：鼠标拖到画布外（松手在侧栏、工具栏上）也要能收到，
    // 否则拖拽会「卡在半路」。触屏那边 wrap 已经 setPointerCapture，事件照样冒泡到 window。
    window.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'mouse') { if (mouseDown) gestureMove(ev.clientX, ev.clientY); return; }
      if (!(ev.pointerId in touches)) return;
      ev.preventDefault();
      touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };

      if (touchMode === 'pinch') {
        var pts = touchList();
        if (pts.length < 2 || !pinch0) return;
        var cr = wrap.getBoundingClientRect();
        var mid1 = { x: (pts[0].x + pts[1].x) / 2 - cr.left, y: (pts[0].y + pts[1].y) / 2 - cr.top };
        var mid0 = { x: pinch0.cx - cr.left, y: pinch0.cy - cr.top };
        var s = Math.min(2.5, Math.max(0.2, pinch0.scale * ptDist(pts[0], pts[1]) / pinch0.d));
        // 让起始中点下的世界坐标点始终停在当前中点下方 → 捏合不漂移
        var w = { x: (mid0.x - pinch0.vx) / pinch0.scale, y: (mid0.y - pinch0.vy) / pinch0.scale };
        state.view.scale = s;
        state.view.x = mid1.x - w.x * s;
        state.view.y = mid1.y - w.y * s;
        applyView(); updatePositions();
        return;
      }
      gestureMove(ev.clientX, ev.clientY);
    }, { passive: false });

    function endTouch(ev) {
      delete touches[ev.pointerId];
      if (touchMode === 'pinch') {
        // 捏合中抬起一指：剩下的那根手指要能立刻接着平移，
        // 所以必须以「当前指位」重开一次平移基准；否则 state.pan 为空，
        // 手指继续滑动画面却纹丝不动（旧 BUG）。
        var left = touchList();
        pinch0 = null;
        if (left.length === 1) { touchMode = 'pan'; beginPan(left[0].x, left[0].y); }
        else if (!left.length) { touchMode = null; }
        return;
      }
      if (touchList().length) return;
      // 单指抬手：判断是「点」还是「拖」
      var moved = downPt ? ptDist(downPt, { x: ev.clientX, y: ev.clientY }) : 0;
      gestureEnd(ev.clientX, ev.clientY);
      touchMode = null;
      if (moved > 8) { downNode = null; return; }
      // 双击（触摸下没有可靠的 dblclick，自己判）
      var uuid = downNode;
      downNode = null;
      var now = Date.now();
      var near = ptDist({ x: lastTap.x, y: lastTap.y }, { x: ev.clientX, y: ev.clientY }) < 26;
      if (uuid && lastTap.uuid === uuid && near && now - lastTap.t < 340) {
        var n = findNode(uuid);
        if (n) {
          askPrompt('步骤说明 footer', n.footer || '', function (v) {
            pushUndo(); n.footer = v; updateNodeCard(n);
            if (state.selected && state.selected.id === n.uuid) showProps();
            afterChange();
          });
        }
        lastTap = { t: 0, uuid: null, x: 0, y: 0 };
      } else {
        lastTap = { t: now, uuid: uuid, x: ev.clientX, y: ev.clientY };
      }
    }
    // 节点库拖拽落点：必须在 window 上收（松手位置在画布上时，libBox 收不到 pointerup）
    // 落点用「幽灵卡片左上角」，也就是指针 + offX/offY —— 所见即所得。
    function dropGhost(cx, cy) {
      if (!state.ghost) return;
      var g = state.ghost;
      if (cx >= 0) {
        var cr = wrap.getBoundingClientRect();
        var px = cx + (g.offX == null ? 8 : g.offX), py = cy + (g.offY == null ? 8 : g.offY);
        if (px >= cr.left && px <= cr.right && py >= cr.top && py <= cr.bottom) {
          var pos = screenToCanvas(px - cr.left, py - cr.top);
          addNode(g.dev, g.nm, g.cmd, g.lbl,
            Math.round(Math.max(0, pos.x) / GRID) * GRID,
            Math.round(Math.max(0, pos.y) / GRID) * GRID, g.special);
        }
      }
      if (g.el) g.el.remove();
      state.ghost = null;
    }

    window.addEventListener('pointerup', function (ev) {
      // 幽灵节点（从节点库拖出来）优先收尾：-1 表示落点无效，直接丢弃
      if (state.ghost) {
        dropGhost(ev.clientX, ev.clientY);
        if (ev.pointerType !== 'mouse') return;
        mouseDown = false; touchMode = null; return;
      }
      if (ev.pointerType === 'mouse') {
        if (!mouseDown) return;
        mouseDown = false;
        gestureEnd(ev.clientX, ev.clientY);
        touchMode = null;
        return;
      }
      if (ev.pointerId in touches) endTouch(ev);
    }, { passive: false });
    window.addEventListener('pointercancel', function (ev) {
      if (state.ghost) dropGhost(-1, -1);
      if (ev.pointerType === 'mouse') { mouseDown = false; gestureEnd(null, null); touchMode = null; return; }
      if (ev.pointerId in touches) endTouch(ev);
    });

    wrap.addEventListener('contextmenu', function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest('#wfed-run, .n-title, .n-sub, .wfnode-prow, input, textarea')) return;
      ev.preventDefault();
    });

    // 滚轮缩放
    wrap.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var cr = wrap.getBoundingClientRect();
      setZoom(state.view.scale * (ev.deltaY < 0 ? 1.12 : 0.9), ev.clientX - cr.left, ev.clientY - cr.top);
    }, { passive: false });

    // 双击空白重置 / 双击节点编辑说明
    wrap.addEventListener('dblclick', function (ev) {
      var node = ev.target.closest ? ev.target.closest('.wfnode') : null;
      if (node) {
        var n = findNode(node.dataset.uuid);
        if (!n) return;
        askPrompt('步骤说明 footer', n.footer || '', function (v) {
          pushUndo(); n.footer = v; updateNodeCard(n); if (state.selected && state.selected.id === n.uuid) showProps(); afterChange();
        });
        return;
      }
      state.view = { x: 40, y: 40, scale: 1 };
      applyView(); updatePositions();
    });

    canvas.addEventListener('click', function (ev) {
      var node = ev.target.closest ? ev.target.closest('.wfnode') : null;
      if (!node) return;
      if (ev.target.classList.contains('wfnode-del')) { deleteNode(node.dataset.uuid); return; }
      if (ev.target.classList.contains('wfnode-dis')) {
        var n = findNode(node.dataset.uuid);
        if (!n || n.type === 'Group') return;
        pushUndo();
        n.disabled = !n.disabled;
        renderNodes();
        if (state.selected && state.selected.id === n.uuid) showProps();
        afterChange();
      }
    });
    svg.addEventListener('click', function (ev) {
      var p = ev.target;
      if (p && p.dataset && p.dataset.id) {
        state.selected = { type: 'edge', id: p.dataset.id };
        state.selectedIds = {};
        renderNodes(); showProps();
      }
    });

    // 节点库：拖拽 / ＋ 添加。统一用 pointerdown，触屏也能从库里拖。
    var libBox = document.getElementById('lib-groups');
    libBox.addEventListener('pointerdown', function (ev) {
      var act = ev.target.closest ? ev.target.closest('.lib-act') : null;
      if (!act) return;
      if (ev.target.classList.contains('la-add')) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      var touch = ev.pointerType !== 'mouse';
      var lbl = act.dataset.label;
      var g = el('div', 'wfnode ghost',
        '<div class="wfnode-band" style="background:' + devColor(act.dataset.dev) + '"></div>' +
        '<div class="wfnode-head"><span class="n-ico">' + devIcon(act.dataset.dev) + '</span>' +
        '<div class="n-main"><div class="n-title">' + esc(lbl) + '</div>' +
        '<div class="n-sub">松开即放置</div></div></div>');
      g.style.position = 'fixed'; g.style.width = NODE_W + 'px'; g.style.zIndex = 100; g.style.pointerEvents = 'none';
      document.body.appendChild(g);
      state.ghost = {
        el: g, dev: act.dataset.dev,
        cmd: act.dataset.cmd !== '' ? parseInt(act.dataset.cmd, 10) : undefined,
        nm: act.dataset.name, lbl: lbl, special: act.dataset.special,
        // 手指会挡住落点，幽灵卡片往上挪一点，视觉落点才对得上
        offX: touch ? -NODE_W / 2 : 8, offY: touch ? -70 : 8
      };
      ghostMove(ev.clientX, ev.clientY);
      ev.preventDefault();
    });
    libBox.addEventListener('pointermove', function (ev) {
      if (!state.ghost) return;
      if (ev.pointerType === 'mouse') return;   // 鼠标在画布上时由 gestureMove 更新
      ghostMove(ev.clientX, ev.clientY);
    });
    // 幽灵节点跟随指针（鼠标在画布上时由 gestureMove 调用；触屏在库里时由上面这个 move 调用）
    function ghostMove(cx, cy) {
      var g = state.ghost;
      if (!g || !g.el) return;
      g.el.style.left = (cx + (g.offX == null ? 8 : g.offX)) + 'px';
      g.el.style.top = (cy + (g.offY == null ? 8 : g.offY)) + 'px';
    }
    libBox.addEventListener('click', function (ev) {
      var act = ev.target.closest ? ev.target.closest('.lib-act') : null;
      if (!act || !ev.target.classList.contains('la-add')) return;
      var v = centerOfView();
      var k = state.wf.data.nodes.length;
      addNode(act.dataset.dev, act.dataset.name,
        act.dataset.cmd !== '' ? parseInt(act.dataset.cmd, 10) : undefined,
        act.dataset.label, Math.round((v.x + (k % 3) * 280) / GRID) * GRID, Math.round((v.y + Math.floor(k / 3) * 180) / GRID) * GRID,
        act.dataset.special);
    });

    document.getElementById('lib-search').addEventListener('input', renderLib);
    Array.prototype.forEach.call(document.querySelectorAll('.lib-filter button'), function (b) {
      b.addEventListener('click', function () {
        libFilter = b.dataset.filter;
        Array.prototype.forEach.call(document.querySelectorAll('.lib-filter button'), function (x) { x.classList.toggle('on', x === b); });
        renderLib();
      });
    });
    document.getElementById('lib-toggle').addEventListener('click', function () {
      document.body.classList.toggle('lib-collapsed');
      this.textContent = document.body.classList.contains('lib-collapsed') ? '▶' : '◀';
      setTimeout(function () { refitShare(); }, 220);
    });
    // 固定展开：窄侧栏平时只露「节点库」轨道，鼠标靠 hover 展开；
    // 触屏没有 hover，所以给一个显式的钉住开关（点轨道也能钉住）。
    var libAside = document.getElementById('wfed-lib');
    function setPinned(on) {
      if (!libAside) return;
      libAside.classList.toggle('pinned', !!on);
      var pb = document.getElementById('lib-pin');
      if (pb) { pb.classList.toggle('on', !!on); pb.title = on ? '取消固定（点画布或 Esc 同效）' : '固定展开节点库（触屏没有悬停，点这里钉住）'; }
    }
    var pinBtn = document.getElementById('lib-pin');
    if (pinBtn) pinBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setPinned(!libAside.classList.contains('pinned'));
    });
    // 点轨道 = 钉住 / 取消（触屏友好：第一下就生效，不用先等 hover）
    var rail = libAside && libAside.querySelector('.lib-rail');
    if (rail) rail.addEventListener('click', function () {
      setPinned(!libAside.classList.contains('pinned'));
    });
    setPinnedFn = setPinned;   // 给 __WFED 暴露（bind 跑在 __WFED 赋值之前，不能直接挂）

    // 右栏属性面板：与左栏完全对称的三态（折叠 / 窄栏悬停浮出 / 钉住）
    var propAside = document.getElementById('wfed-props');
    function setPropPinned(on) {
      if (!propAside) return;
      propAside.classList.toggle('pinned', !!on);
      var pb = document.getElementById('props-pin');
      if (pb) {
        pb.classList.toggle('on', !!on);
        pb.title = on ? '取消固定（点画布或 Esc 同效）' : '固定展开属性面板（触屏没有悬停，点这里钉住）';
      }
    }
    var propPinBtn = document.getElementById('props-pin');
    if (propPinBtn) propPinBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setPropPinned(!propAside.classList.contains('pinned'));
    });
    var propRail = propAside && propAside.querySelector('.props-rail');
    if (propRail) propRail.addEventListener('click', function () {
      setPropPinned(!propAside.classList.contains('pinned'));
    });
    setPropPinnedFn = setPropPinned;

    // 点画布节点时把右侧属性栏展开。整栏折叠则拉开；窄栏则钉住，避免松手后又缩回轨道。
    // 点空白 / Esc 仍走原来的 setPropPinned(false)，这里不改。
    function expandPropsPanel() {
      if (document.body.classList.contains('narrow')) return;
      if (document.body.classList.contains('prop-collapsed')) {
        document.body.classList.remove('prop-collapsed');
        var tbtn = document.getElementById('prop-toggle');
        if (tbtn) tbtn.textContent = '▶';
        refitShare();
      }
      if (document.body.classList.contains('propnarrow')) setPropPinned(true);
    }

    var propToggleBtn = document.getElementById('prop-toggle');
    propToggleBtn.addEventListener('click', function () {
      document.body.classList.toggle('prop-collapsed');
      this.textContent = document.body.classList.contains('prop-collapsed') ? '◀' : '▶';
      setTimeout(function () { refitShare(); }, 220);
    });
    // 初始文案按当前折叠态确定（刷新时可能保留了上次的类）
    propToggleBtn.textContent = document.body.classList.contains('prop-collapsed') ? '◀' : '▶';

    // 缩放控件
    document.getElementById('zoom-in').addEventListener('click', function () {
      var cr = wrap.getBoundingClientRect(); setZoom(state.view.scale * 1.15, cr.width / 2, cr.height / 2);
    });
    document.getElementById('zoom-out').addEventListener('click', function () {
      var cr = wrap.getBoundingClientRect(); setZoom(state.view.scale / 1.15, cr.width / 2, cr.height / 2);
    });
    document.getElementById('zoom-fit').addEventListener('click', function () { fitView(); });
    document.getElementById('zoom-reset').addEventListener('click', function () {
      state.view = { x: 40, y: 40, scale: 1 }; applyView(); updatePositions();
    });
    document.getElementById('btn-fit').addEventListener('click', function () { fitView(); });
    // 框选模式：触屏没有 Shift 键，用一个开关代替（鼠标也更好按）
    var mqBtn = document.getElementById('zoom-marquee');
    if (mqBtn) mqBtn.addEventListener('click', function () {
      state.marqueeMode = !state.marqueeMode;
      mqBtn.classList.toggle('on', !!state.marqueeMode);
      note('info', state.marqueeMode ? '已开启框选模式' : '已关闭框选模式',
        state.marqueeMode ? '在画布空白处拖动即框选多个节点；关闭后空白拖动恢复为平移画布。' : '', 2600);
    });
    document.getElementById('btn-autolayout').addEventListener('click', function () { autoLayout(); });
    document.getElementById('btn-validate').addEventListener('click', showValidate);

    // 键盘
    window.addEventListener('keydown', function (ev) {
      var tag = (ev.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      var mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
      if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo(); return; }
      if (mod && ev.key.toLowerCase() === 'a') {
        ev.preventDefault();
        state.selectedIds = {}; state.wf.data.nodes.forEach(function (n) { state.selectedIds[n.uuid] = 1; });
        renderNodes(); showProps(); return;
      }
      if (mod && ev.key.toLowerCase() === 'c') {
        var sel = window.getSelection ? String(window.getSelection()) : '';
        if (sel && sel.trim()) return;
        clipCopy(); return;
      }
      if (mod && ev.key.toLowerCase() === 'v') { clipPaste(); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        if (state.selected && state.selected.type === 'edge') {
          ev.preventDefault();
          pushUndo();
          state.wf.data.edges = state.wf.data.edges.filter(function (x) { return edgeId(x) !== state.selected.id; });
          state.selected = null; renderEdges(); showProps(); updateStats(); afterChange();
        } else if (Object.keys(state.selectedIds).length) {
          ev.preventDefault();
          deleteSelected();
        }
      }
      if (ev.key === 'Escape') {
        state.selected = null; state.selectedIds = {};
        if (typeof setPinned === 'function') setPinned(false);
        if (typeof setPropPinned === 'function') setPropPinned(false);
        renderNodes(); showProps();
      }
    });

    window.addEventListener('resize', function () {
      document.body.classList.toggle('narrow', window.innerWidth < 980);
      refitShare();
    });

    // 手势内部状态只读暴露给自动化验证（scripts/wfed_touch_check.js）
    state.gestureInfo = function () {
      return {
        mode: touchMode, mouseDown: mouseDown, touches: touchList().length,
        pinch: pinch0 ? { scale: pinch0.scale, d: pinch0.d } : null,
        dragging: !!state.dragMul, panning: !!state.pan, linking: !!state.linking,
        ghost: !!state.ghost,
      };
    };
  }

  function drawGuides(guides) {
    Array.prototype.forEach.call(wrap.querySelectorAll('.wfed-guide'), function (g) { g.remove(); });
    guides.slice(0, 8).forEach(function (g) {
      var d = el('div', 'wfed-guide ' + g.t);
      if (g.t === 'v') d.style.left = (g.x * state.view.scale + state.view.x) + 'px';
      else d.style.top = (g.y * state.view.scale + state.view.y) + 'px';
      wrap.appendChild(d);
    });
  }

  // 剪贴板
  var clip = null;
  function clipCopy() {
    var ids = Object.keys(state.selectedIds);
    if (!ids.length) {
      note('info', '没有可复制的内容', '先点选节点再按 ⌘C / Ctrl+C，或直接拖选节点上的文字。', 2400);
      return;
    }
    clip = ids.map(function (id) { var n = findNode(id); return n ? JSON.parse(JSON.stringify(n)) : null; }).filter(Boolean);
    var text = clip.map(function (n) {
      var d = n._display || {};
      var lines = [(d.actionLabel || n.name || '节点') + (n.device_name ? ' · ' + n.device_name : '')];
      Object.keys(n.param || {}).forEach(function (k) {
        var v = n.param[k];
        if (v && typeof v === 'object') { try { v = JSON.stringify(v); } catch (e) { v = String(v); } }
        lines.push(k + ': ' + v);
      });
      return lines.join('\n');
    }).join('\n\n');
    var done = function () {
      note('ok', '已复制 ' + clip.length + ' 个节点', '文字已在剪贴板。在画布按 ⌘V / Ctrl+V 可以再贴一份。', 2400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else done();
  }
  function clipPaste() {
    if (!clip || !clip.length) return;
    pushUndo();
    var map = {};
    clip.forEach(function (n) {
      var c = JSON.parse(JSON.stringify(n));
      c.uuid = uid(); c.pose.position.x += 40; c.pose.position.y += 40;
      map[n.uuid] = c.uuid;
      state.wf.data.nodes.push(c);
    });
    state.wf.data.edges.slice().forEach(function (e) {
      if (map[e.source_node_uuid] && map[e.target_node_uuid]) {
        state.wf.data.edges.push({
          source_node_uuid: map[e.source_node_uuid], target_node_uuid: map[e.target_node_uuid],
          source_handle_key: 'ready', source_handle_io: 'source',
          target_handle_key: 'ready', target_handle_io: 'target'
        });
      }
    });
    state.selectedIds = {};
    Object.keys(map).forEach(function (k) { state.selectedIds[map[k]] = 1; });
    renderNodes(); showProps(); updateStats(); afterChange();
  }

  function portIsOut(e) { return e && e.classList && e.classList.contains('out'); }
  function edgeExists(a, b) {
    return state.wf.data.edges.some(function (e) { return e.source_node_uuid === a && e.target_node_uuid === b; });
  }
  /** 加一条 a→b 是否会成环 */
  function createsCycle(a, b) {
    var children = {};
    state.wf.data.edges.forEach(function (e) { (children[e.source_node_uuid] = children[e.source_node_uuid] || []).push(e.target_node_uuid); });
    var seen = {}, stack = [b];
    while (stack.length) {
      var cur = stack.pop();
      if (cur === a) return true;
      (children[cur] || []).forEach(function (c) { if (!seen[c]) { seen[c] = 1; stack.push(c); } });
    }
    return false;
  }
  function select(type, id) {
    state.selected = (type == null) ? null : { type: type, id: id };
    state.selectedIds = {};
    if (type === 'node') state.selectedIds[id] = 1;
    renderNodes(); showProps();
  }
  function centerOfView() {
    var cr = wrap.getBoundingClientRect();
    return screenToCanvas(cr.width / 2, cr.height / 2);
  }

  // ---------- 打开 / 保存 / 导出 ----------
  function normalizeNode(n) {
    if (!n.pose || !n.pose.position) n.pose = basePose(60 + Math.random() * 300, 60 + Math.random() * 200);
    if (!n.param && n.type !== 'Group') n.param = {};
    // 1.4.1 点位表已删除的锁紧参数，旧节点里残留的键不再下发
    if (n.device_name === 'gn_locking_mechanism' && n.param) {
      delete n.param.pre_torque_limit;
      delete n.param.final_torque;
    }
    var a = actionOfNode(n);
    if (a && a.params) {
      Object.keys(a.params).forEach(function (k) {
        if (n.param[k] === undefined && a.params[k].default !== undefined && k === 'station') return;
      });
    }
    if (n.param && n.param.station !== undefined && typeof n.param.station === 'string' && STATION_MAP) {
      var alias = {
        oven: 1, lock: 2, locki: 2, quick: 3, centrifuge: 4, vacuum: 5, nine9320: 6, '9320': 6, prcxi: 6,
        tube: 7, stack: 8, solid: 9, balance: 9, finished: 10
      };
      var v = alias[n.param.station.toLowerCase()];
      if (v) n.param.station = v;
    }
    refreshDisplay(n);
    return n;
  }
  // ---------- 工作流模版：插入的是引用，正文只存一份 ----------
  var tplCache = {};          // id -> workflow（未展开的正文）
  var tplList = [];
  var tplSel = '';
  var tplSwitchGen = 0;
  var tplListGen = 0;
  var tplRemoved = {};        // 已删除的 id：挡住晚到的保存把它们又写回去
  var tplPutTimer = {};
  var tplSyncTimer = null;
  var bootDraftAt = 0;
  var bootReady = false;
  var bootNameChecked = false;
  var bootListArrived = false;
  state.tplRegistered = false;

  function wfUuid(wf) {
    return (wf && wf.data && wf.data.workflow_uuid) || '';
  }
  function cloneData(v) { return JSON.parse(JSON.stringify(v)); }
  function stripRuntime(n) {
    var c = cloneData(n);
    delete c._display;
    delete c._embed;
    return c;
  }
  function pruneTransferParam(n) {
    if (!n || (n.name !== 'transfer_liquid' && n.template_name !== 'transfer_liquid') || !n.param) return n;
    delete n.param.source_slots;
    delete n.param.target_slots;
    delete n.param.tip_rack_slots;
    return n;
  }
  function collectLinked() {
    var name = (document.getElementById('wf-name').value || '').trim() || '未命名工作流';
    state.wf.name = name;
    state.wf.data.workflow_name = name;
    if (!state.wf.data.embeds) state.wf.data.embeds = [];
    var out = cloneData(state.wf);
    out.name = name;
    out.data.workflow_name = name;
    out.data.nodes = state.wf.data.nodes.filter(function (n) { return !n._embed; }).map(function (n) {
      return pruneTransferParam(stripRuntime(n));
    });
    out.data.edges = state.wf.data.edges.filter(function (e) { return !e._embed; }).map(function (e) {
      var c = cloneData(e); delete c._embed; return c;
    });
    out.data.embeds = cloneData(state.wf.data.embeds || []);
    return out;
  }
  function renderTplPick() {
    var box = document.getElementById('wf-pick-list');
    if (!box) return;
    var curId = wfUuid(state.wf);
    var curName = (document.getElementById('wf-name').value || '').trim() || state.wf.name || '未命名工作流';
    var ownNodes = state.wf.data.nodes.filter(function (n) { return !n._embed; });
    var keepLive = curId && !tplRemoved[curId] &&
      (state.tplRegistered || ownNodes.length > 0 || (state.wf.data.embeds || []).length > 0);
    var rows = keepLive ? [{ id: curId, name: curName, nodes: ownNodes.length, live: true }] : [];
    tplList.forEach(function (t) {
      if (!t.id || t.id === curId || tplRemoved[t.id]) return;
      rows.push(t);
    });
    tplSel = curId;
    if (!rows.length) {
      box.innerHTML = '<div class="wf-pick-empty">右键这里可以新建</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var meta = r.live ? '正在编辑' : ((r.nodes || 0) + ' 个节点');
      var name = r.name || '未命名工作流';
      var asTpl = r.live ? !!(state.wf.data && state.wf.data.as_template) : !!r.as_template;
      var badge = asTpl ? '<span class="wt">模版</span>' : '';
      return '<div class="wf-pick-item' + (r.live ? ' on' : '') + '" data-tid="' + esc(r.id) + '" data-tpl="' + (asTpl ? '1' : '0') + '" role="button" tabindex="0" title="点击切换。右键可新建、重命名、转为模版或删除">' +
        '<span class="wr"><span class="wn" title="' + esc(name) + '">' + esc(name) + '</span>' + badge + '</span>' +
        '<span class="wm">' + esc(meta) + '</span></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.wf-pick-item'), function (b) {
      var open = function () {
        var tid = b.getAttribute('data-tid') || '';
        if (!tid || tid === wfUuid(state.wf)) return;
        editTemplate(tid);
      };
      b.addEventListener('click', open);
      b.addEventListener('keydown', function (ev) {
        if (ev.target !== b) return;
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        open();
      });
      b.addEventListener('contextmenu', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var nameEl = b.querySelector('.wn');
        showWfMenu(ev.clientX, ev.clientY, b.getAttribute('data-tid') || '', (nameEl && nameEl.textContent) || '', b.getAttribute('data-tpl') === '1');
      });
    });
  }
  function hideWfMenu() {
    var m = document.getElementById('wf-ctx');
    if (m) m.remove();
  }
  function showWfMenu(x, y, tid, name, isTpl) {
    hideWfMenu();
    var m = document.createElement('div');
    m.id = 'wf-ctx';
    m.className = 'wf-ctx';
    var html = '<button type="button" data-act="new">新建</button>';
    if (tid) {
      html += '<button type="button" data-act="edit" class="sep">重命名</button>' +
        '<button type="button" data-act="tpl"' + (isTpl ? ' disabled' : '') + '>' + (isTpl ? '已是模版' : '转为模版') + '</button>' +
        '<button type="button" data-act="del" class="danger">删除</button>';
    }
    m.innerHTML = html;
    document.body.appendChild(m);
    var left = Math.max(8, Math.min(x, window.innerWidth - m.offsetWidth - 8));
    var top = Math.max(8, Math.min(y, window.innerHeight - m.offsetHeight - 8));
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    m.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var actEl = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      var act = actEl && actEl.getAttribute('data-act');
      if (!act || actEl.disabled) return;
      hideWfMenu();
      if (act === 'new') newTemplate();
      else if (act === 'edit') renameWorkflow(tid, name);
      else if (act === 'tpl') convertToTemplate(tid);
      else if (act === 'del') deleteTemplate(tid, name);
    });
  }
  function applyWorkflowName(wf, raw) {
    var name = (raw || '').trim() || '未命名工作流';
    wf.name = name;
    if (!wf.data) wf.data = {};
    wf.data.workflow_name = name;
    return name;
  }
  function renameWorkflow(tid, currentName) {
    if (!tid) return;
    askPrompt('重命名工作流', currentName || '', function (raw) {
      var name = (raw || '').trim() || '未命名工作流';
      if (tid === wfUuid(state.wf)) {
        var input = document.getElementById('wf-name');
        if (input) input.value = name;
        applyWorkflowName(state.wf, name);
        state.tplRegistered = true;
        tplList.forEach(function (t) { if (t.id === tid) t.name = name; });
        renderTplPick();
        writeDraftNow();
        putTemplate(collectLinked()).then(function () {
          renderTplPick();
          note('ok', '已重命名', name, 2400);
        });
        return;
      }
      ensureTemplates([tid]).then(function () {
        if (!tplCache[tid]) { note('err', '读不到这份工作流', tid); return; }
        var wf = cloneData(tplCache[tid]);
        applyWorkflowName(wf, name);
        putTemplate(wf).then(function () {
          note('ok', '已重命名', name, 2400);
        });
      });
    });
  }
  function convertToTemplate(tid) {
    if (!tid) return;
    var mark = function (wf) {
      if (!wf.data) wf.data = {};
      wf.data.as_template = true;
      if (tid === wfUuid(state.wf)) state.wf.data.as_template = true;
      return putTemplate(wf).then(function () {
        var label = wf.name || (wf.data && wf.data.workflow_name) || '这份工作流';
        note('ok', '已转为模版', '「' + label + '」可以在上方「插入模版」里选用。', 3600);
      });
    };
    if (tid === wfUuid(state.wf)) {
      mark(collectLinked());
      writeDraftNow();
      return;
    }
    ensureTemplates([tid]).then(function () {
      if (!tplCache[tid]) { note('err', '读不到这份工作流', tid); return; }
      mark(cloneData(tplCache[tid]));
    });
  }
  function placeInsertMenu() {
    var btn = document.getElementById('btn-insert-tpl');
    var menu = document.getElementById('insert-menu');
    if (!btn || !menu) return;
    if (menu.parentNode !== document.body) document.body.appendChild(menu);
    var r = btn.getBoundingClientRect();
    var width = menu.offsetWidth || 340;
    menu.style.position = 'fixed';
    menu.style.zIndex = '200';
    menu.style.right = 'auto';
    menu.style.top = Math.round(r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, Math.round(Math.min(r.right - width, window.innerWidth - width - 8))) + 'px';
  }
  function renderInsertMenu() {
    var box = document.getElementById('insert-list');
    if (!box) return;
    if (!box._insBound) {
      box._insBound = true;
      box.addEventListener('pointerdown', function (ev) {
        var it = ev.target.closest ? ev.target.closest('.om-item[data-tid]') : null;
        if (!it) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (it.getAttribute('data-self') === '1') {
          note('warn', '不能插入自己', '先在左侧点开另一份工作流，再插入这份模版。');
          return;
        }
        var menu = document.getElementById('insert-menu');
        if (menu) menu.classList.add('hidden');
        insertTemplate(it.getAttribute('data-tid') || '');
      });
    }
    var cur = wfUuid(state.wf);
    var items = tplList.filter(function (t) { return t && t.id && t.as_template; });
    if (!items.length) {
      box.innerHTML = '<div class="om-item" style="cursor:default;color:#94a3b8">还没有模版。在左侧工作流上右键，选「转为模版」。</div>';
      return;
    }
    box.innerHTML = items.map(function (t) {
      var self = t.id === cur;
      return '<div class="om-item' + (self ? ' is-self' : '') + '" data-tid="' + esc(t.id) + '"' + (self ? ' data-self="1"' : '') + '><span>' + esc(t.name || '未命名工作流') + '</span><span class="om-meta">' + (self ? '正在编辑' : ((t.nodes || 0) + ' 个节点')) + '</span></div>';
    }).join('');
  }
  function reconcileSavedWorkflow() {
    if (!bootReady || bootNameChecked || !bootListArrived) return;
    var id = wfUuid(state.wf);
    if (!id) { bootNameChecked = true; return; }
    var hit = null;
    tplList.forEach(function (t) { if (t.id === id) hit = t; });
    if (!hit) { bootNameChecked = true; return; }
    bootNameChecked = true;
    var input = document.getElementById('wf-name');
    var shown = ((input && input.value) || '').trim();
    var serverName = (hit.name || '').trim();
    if (!serverName || serverName === shown) return;
    var serverMs = (hit.mtime || 0) * 1000;
    if (bootDraftAt && serverMs + 1500 < bootDraftAt) return;
    ensureTemplates([id]).then(function () {
      if (state.dirty || wfUuid(state.wf) !== id) return;
      if (!tplCache[id]) {
        if (input) input.value = serverName;
        applyWorkflowName(state.wf, serverName);
        writeDraftNow();
        renderTplPick();
        return;
      }
      openWorkflow(cloneData(tplCache[id]));
      writeDraftNow();
    });
  }
  function fetchTplList() {
    var gen = ++tplListGen;
    return fetch('/api/workflow-templates').then(function (r) { return r.json(); }).then(function (res) {
      if (gen !== tplListGen) return;
      bootListArrived = true;
      tplList = ((res && res.templates) || []).filter(function (t) { return t && t.id && !tplRemoved[t.id]; });
      renderTplPick();
      reconcileSavedWorkflow();
    }).catch(function () { if (gen === tplListGen) renderTplPick(); });
  }
  function cacheTemplate(wf) {
    var id = wfUuid(wf);
    if (!id) return;
    tplCache[id] = cloneData(wf);
    if (!tplCache[id].data.embeds) tplCache[id].data.embeds = [];
    tplCache[id].data.nodes = (tplCache[id].data.nodes || []).filter(function (n) { return !n._embed; });
    tplCache[id].data.edges = (tplCache[id].data.edges || []).filter(function (e) { return !e._embed; });
  }
  function ensureTemplates(ids) {
    var missing = (ids || []).filter(function (id) { return id && !tplCache[id]; });
    if (!missing.length) return Promise.resolve();
    return Promise.all(missing.map(function (id) {
      return fetch('/api/workflow-templates/' + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (res) { if (res && res.ok && res.workflow) cacheTemplate(res.workflow); });
    }));
  }
  function embedIdsIn(wf, acc, seen) {
    ((wf && wf.data && wf.data.embeds) || []).forEach(function (em) {
      if (!em.template_id || seen[em.template_id]) return;
      seen[em.template_id] = 1;
      acc.push(em.template_id);
      if (tplCache[em.template_id]) embedIdsIn(tplCache[em.template_id], acc, seen);
    });
  }
  function loadTemplatesFor(wf) {
    var ids = [], seen = {};
    embedIdsIn(wf, ids, seen);
    return ensureTemplates(ids).then(function () {
      var more = [], seen2 = {};
      ids.forEach(function (id) { if (tplCache[id]) embedIdsIn(tplCache[id], more, seen2); });
      var fresh = more.filter(function (id) { return !tplCache[id]; });
      return fresh.length ? ensureTemplates(fresh) : null;
    });
  }
  function templateContains(tid, target, seen) {
    if (!tid || !target) return false;
    if (tid === target) return true;
    seen = seen || {};
    if (seen[tid]) return false;
    seen[tid] = 1;
    var tpl = tplCache[tid];
    return ((tpl && tpl.data && tpl.data.embeds) || []).some(function (em) {
      return templateContains(em.template_id, target, seen);
    });
  }
  function putTemplate(wf) {
    var id = wfUuid(wf);
    if (!id || tplRemoved[id]) return Promise.resolve();
    cacheTemplate(wf);
    state.tplRegistered = state.tplRegistered || id === wfUuid(state.wf);
    return fetch('/api/workflow-templates/' + encodeURIComponent(id), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: tplCache[id] })
    }).then(function () {
      if (tplRemoved[id]) {
        return fetch('/api/workflow-templates/' + encodeURIComponent(id), { method: 'DELETE' });
      }
      return fetchTplList();
    }).catch(function () { });
  }
  function scheduleTplPut(tid) {
    if (!tid || !tplCache[tid] || tplRemoved[tid]) return;
    if (tplPutTimer[tid]) clearTimeout(tplPutTimer[tid]);
    tplPutTimer[tid] = setTimeout(function () {
      putTemplate(tplCache[tid]).then(function () { pullTemplate(tid); });
    }, 280);
  }
  function placeTemplate(tid, originX, originY, hostEmbedId, stack) {
    var tpl = tplCache[tid];
    if (!tpl || stack[tid]) return;
    stack[tid] = 1;
    var tname = tpl.name || (tpl.data && tpl.data.workflow_name) || '';
    (tpl.data.nodes || []).forEach(function (n) {
      if (!n || n._embed) return;
      var node = stripRuntime(n);
      if (!node.pose || !node.pose.position) node.pose = basePose(0, 0);
      node.uuid = hostEmbedId + '__' + tid + '__' + n.uuid;
      node._embed = {
        hostEmbedId: hostEmbedId, templateId: tid, srcUuid: n.uuid,
        originX: originX, originY: originY, templateName: tname
      };
      node.pose.position.x = (n.pose.position.x || 0) + originX;
      node.pose.position.y = (n.pose.position.y || 0) + originY;
      normalizeNode(node);
      state.wf.data.nodes.push(node);
    });
    (tpl.data.edges || []).forEach(function (e) {
      if (!e || e._embed) return;
      var c = cloneData(e);
      c.uuid = hostEmbedId + '__' + tid + '__' + (e.uuid || (e.source_node_uuid + '>' + e.target_node_uuid));
      c.source_node_uuid = hostEmbedId + '__' + tid + '__' + e.source_node_uuid;
      c.target_node_uuid = hostEmbedId + '__' + tid + '__' + e.target_node_uuid;
      c._embed = { hostEmbedId: hostEmbedId, templateId: tid };
      state.wf.data.edges.push(c);
    });
    (tpl.data.embeds || []).forEach(function (em) {
      placeTemplate(em.template_id, originX + (em.dx || 0), originY + (em.dy || 0), hostEmbedId, stack);
    });
    stack[tid] = 0;
  }
  function clearHostEmbed(hostEmbedId) {
    state.wf.data.nodes = state.wf.data.nodes.filter(function (n) {
      return !(n._embed && n._embed.hostEmbedId === hostEmbedId);
    });
    state.wf.data.edges = state.wf.data.edges.filter(function (e) {
      return !(e._embed && e._embed.hostEmbedId === hostEmbedId);
    });
  }
  function expandEmbed(em) {
    clearHostEmbed(em.id);
    placeTemplate(em.template_id, em.dx || 0, em.dy || 0, em.id, {});
  }
  function expandAllEmbeds() {
    (state.wf.data.embeds || []).forEach(expandEmbed);
  }
  function dropTemplateNode(tid, srcUuid) {
    var tpl = tplCache[tid];
    if (tpl) {
      tpl.data.nodes = (tpl.data.nodes || []).filter(function (n) { return n.uuid !== srcUuid; });
      tpl.data.edges = (tpl.data.edges || []).filter(function (e) {
        return e.source_node_uuid !== srcUuid && e.target_node_uuid !== srcUuid;
      });
    }
    var doomed = {};
    state.wf.data.nodes.forEach(function (n) {
      if (n._embed && n._embed.templateId === tid && n._embed.srcUuid === srcUuid) doomed[n.uuid] = 1;
    });
    state.wf.data.nodes = state.wf.data.nodes.filter(function (n) { return !doomed[n.uuid]; });
    state.wf.data.edges = state.wf.data.edges.filter(function (e) {
      return !doomed[e.source_node_uuid] && !doomed[e.target_node_uuid];
    });
  }
  function rememberTemplateEdge(tid, src, tgt) {
    var tpl = tplCache[tid];
    if (!tpl) return;
    var key = src + '>' + tgt;
    var exists = (tpl.data.edges || []).some(function (e) {
      return e.source_node_uuid + '>' + e.target_node_uuid === key;
    });
    if (exists) return;
    tpl.data.edges.push({
      source_node_uuid: src, target_node_uuid: tgt,
      source_handle_key: 'ready', source_handle_io: 'source',
      target_handle_key: 'ready', target_handle_io: 'target'
    });
  }
  function forgetTemplateEdge(edge) {
    var tid = edge._embed.templateId;
    var tpl = tplCache[tid];
    if (!tpl) return;
    var srcN = findNode(edge.source_node_uuid), tgtN = findNode(edge.target_node_uuid);
    if (!srcN || !tgtN || !srcN._embed || !tgtN._embed) return;
    var s = srcN._embed.srcUuid, t = tgtN._embed.srcUuid;
    tpl.data.edges = (tpl.data.edges || []).filter(function (e) {
      return !(e.source_node_uuid === s && e.target_node_uuid === t);
    });
    state.wf.data.edges = state.wf.data.edges.filter(function (e) {
      if (!e._embed || e._embed.templateId !== tid) return true;
      var a = findNode(e.source_node_uuid), b = findNode(e.target_node_uuid);
      return !(a && b && a._embed && b._embed && a._embed.srcUuid === s && b._embed.srcUuid === t);
    });
  }
  function writeNodeToTemplate(n) {
    if (!n || !n._embed) return false;
    var tpl = tplCache[n._embed.templateId];
    if (!tpl) return false;
    var src = null;
    (tpl.data.nodes || []).forEach(function (x) { if (x.uuid === n._embed.srcUuid) src = x; });
    if (!src) return false;
    var relX = Math.round((n.pose && n.pose.position ? n.pose.position.x : 0) - (n._embed.originX || 0));
    var relY = Math.round((n.pose && n.pose.position ? n.pose.position.y : 0) - (n._embed.originY || 0));
    var before = JSON.stringify([src.param, src.name, src.footer, src.disabled, src.pose]);
    src.param = cloneData(n.param || {});
    src.name = n.name;
    src.footer = n.footer;
    src.disabled = !!n.disabled;
    if (!src.pose || !src.pose.position) src.pose = basePose(relX, relY);
    src.pose.position.x = relX;
    src.pose.position.y = relY;
    if (n.pose && n.pose.position) {
      n.pose.position.x = relX + (n._embed.originX || 0);
      n.pose.position.y = relY + (n._embed.originY || 0);
    }
    return before !== JSON.stringify([src.param, src.name, src.footer, src.disabled, src.pose]);
  }
  function pullTemplate(tid) {
    var changed = false;
    state.wf.data.nodes.forEach(function (n) {
      if (!n._embed || n._embed.templateId !== tid) return;
      var tpl = tplCache[tid];
      if (!tpl) return;
      var src = null;
      (tpl.data.nodes || []).forEach(function (x) { if (x.uuid === n._embed.srcUuid) src = x; });
      if (!src) return;
      n.param = cloneData(src.param || {});
      n.name = src.name;
      n.footer = src.footer;
      n.disabled = !!src.disabled;
      if (!n.pose || !n.pose.position) n.pose = basePose(0, 0);
      n.pose.position.x = (src.pose && src.pose.position ? src.pose.position.x : 0) + (n._embed.originX || 0);
      n.pose.position.y = (src.pose && src.pose.position ? src.pose.position.y : 0) + (n._embed.originY || 0);
      refreshDisplay(n);
      changed = true;
    });
    if (changed && !state._syncing) {
      state._syncing = true;
      renderNodes();
      state._syncing = false;
    }
  }
  function tplInList(id) {
    return !!(id && tplList.some(function (t) { return t.id === id; }));
  }
  function scheduleTemplateSync() {
    if (state._syncing) return;
    if (tplSyncTimer) clearTimeout(tplSyncTimer);
    tplSyncTimer = setTimeout(function () {
      var dirty = {};
      state.wf.data.nodes.forEach(function (n) {
        if (n._embed && writeNodeToTemplate(n)) dirty[n._embed.templateId] = 1;
      });
      Object.keys(dirty).forEach(function (tid) { scheduleTplPut(tid); });
      var cur = wfUuid(state.wf);
      if (cur && (state.tplRegistered || tplCache[cur])) {
        var linked = collectLinked();
        var prevData = tplCache[cur] ? JSON.stringify(tplCache[cur].data) : '';
        var prevName = tplCache[cur] ? (tplCache[cur].name || '') : '';
        if (prevData !== JSON.stringify(linked.data) || prevName !== (linked.name || '')) {
          cacheTemplate(linked);
          // Only push to server if already listed — avoid inventing a new left-list row from a scratch draft.
          if (tplInList(cur)) scheduleTplPut(cur);
        }
      }
    }, 360);
  }
  function finishEmbedDrag() {
    var start = state._dragStartPos || {};
    var byHost = {};
    Object.keys(start).forEach(function (uuid) {
      var n = findNode(uuid);
      if (!n || !n._embed) return;
      var id = n._embed.hostEmbedId;
      (byHost[id] = byHost[id] || []).push(n);
    });
    Object.keys(byHost).forEach(function (id) {
      var group = byHost[id];
      var all = state.wf.data.nodes.filter(function (n) { return n._embed && n._embed.hostEmbedId === id; });
      if (group.length !== all.length) return;
      var dx = null, dy = null, same = true;
      group.forEach(function (n) {
        var p0 = start[n.uuid];
        var ddx = n.pose.position.x - p0.x, ddy = n.pose.position.y - p0.y;
        if (dx == null) { dx = ddx; dy = ddy; }
        else if (Math.abs(ddx - dx) > 0.5 || Math.abs(ddy - dy) > 0.5) same = false;
      });
      if (!same || dx == null || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) return;
      var em = null;
      (state.wf.data.embeds || []).forEach(function (e) { if (e.id === id) em = e; });
      if (!em) return;
      em.dx = (em.dx || 0) + dx;
      em.dy = (em.dy || 0) + dy;
      group.forEach(function (n) {
        n._embed.originX = (n._embed.originX || 0) + dx;
        n._embed.originY = (n._embed.originY || 0) + dy;
      });
    });
    scheduleTemplateSync();
  }
  function insertTemplate(tid) {
    var cur = wfUuid(state.wf);
    if (!tid) { note('warn', '先选一份模版', '点上方「插入模版」，再选一份。'); return; }
    if (tid === cur) {
      note('warn', '不能插入自己', '正在编辑的这份不能再插进自己。先打开另一份工作流，再插入它。');
      return;
    }
    ensureTemplates([tid]).then(function () {
      if (!tplCache[tid]) { note('err', '读不到这份模版', tid); return; }
      if (templateContains(tid, cur, {})) {
        note('warn', '不能插入', '这份模版里已经包含当前工作流，再插进去会套娃。');
        return;
      }
      return loadTemplatesFor(tplCache[tid]).then(function () {
        pushUndo();
        var maxX = 40;
        state.wf.data.nodes.forEach(function (n) {
          var x = n.pose && n.pose.position ? n.pose.position.x : 0;
          if (x + 260 > maxX) maxX = x + 260;
        });
        if (!state.wf.data.embeds) state.wf.data.embeds = [];
        var em = { id: uid(), template_id: tid, dx: maxX, dy: 60 };
        var before = {};
        state.wf.data.nodes.forEach(function (n) { before[n.uuid] = 1; });
        state.wf.data.embeds.push(em);
        expandEmbed(em);
        var fresh = state.wf.data.nodes.filter(function (n) { return !before[n.uuid]; });
        state.selectedIds = {};
        state.selected = fresh[0] ? { type: 'node', id: fresh[0].uuid } : null;
        fresh.forEach(function (n) { state.selectedIds[n.uuid] = 1; });
        renderNodes(); showProps(); updateStats(); afterChange();
        emptyHint.style.display = state.wf.data.nodes.length ? 'none' : '';
        state.tplRegistered = true;
        writeDraftNow();
        putTemplate(collectLinked());
        if (fresh.length) setTimeout(fitView, 40);
        var tpl = tplCache[tid];
        if (!fresh.length) {
          note('warn', '这份模版是空的', (tpl && tpl.name || '模版') + ' 里还没有节点，插进来看不到内容。先打开它，放上节点后再插入。', 4600);
        } else {
          note('ok', '已插入模版', (tpl && tpl.name || tid) + '，画布上多了 ' + fresh.length + ' 个节点。以后改这份模版，这里会一起变。', 4200);
        }
      });
    });
  }
  function editTemplate(tid) {
    var cur = wfUuid(state.wf);
    if (!tid || tid === cur) return;
    var gen = ++tplSwitchGen;
    // Persist only if current already sits in the left list. Don't create a brand-new
    // list row just because we're leaving a scratch / draft edit.
    var saveFirst = (cur && !tplRemoved[cur] && tplInList(cur))
      ? putTemplate(collectLinked()) : Promise.resolve();
    saveFirst.then(function () {
      if (gen !== tplSwitchGen) return;
      return ensureTemplates([tid]);
    }).then(function () {
      if (gen !== tplSwitchGen) return;
      if (!tplCache[tid]) { note('err', '读不到这份模版', tid); return; }
      state.tplRegistered = true;
      openWorkflow(cloneData(tplCache[tid]));
    }).catch(function () {
      if (gen !== tplSwitchGen) return;
      note('err', '切换失败', '网络或后端没有响应。');
    });
  }
  function dropEmbedsOf(tid) {
    var ems = (state.wf.data.embeds || []).filter(function (e) { return e.template_id === tid; });
    ems.forEach(function (e) { clearHostEmbed(e.id); });
    state.wf.data.embeds = (state.wf.data.embeds || []).filter(function (e) { return e.template_id !== tid; });
  }
  function newTemplate() {
    var go = function () {
      var wf = freshWorkflow();
      putTemplate(wf).then(function () {
        state.dirty = false;
        openWorkflow(cloneData(tplCache[wfUuid(wf)] || wf));
        tplSel = wfUuid(state.wf);
        renderTplPick();
        note('ok', '已新建', '空白工作流已加进左侧列表。改个名字后，可以插入到别的工作流里。', 4200);
      });
    };
    var keep = state.tplRegistered ||
      (state.wf.data.nodes || []).some(function (n) { return !n._embed; }) ||
      (state.wf.data.embeds || []).length;
    if (keep) {
      askConfirm('新建工作流', '当前这份会留在列表里，然后打开一份空白工作流。', function () {
        putTemplate(collectLinked()).then(go);
      }, '继续新建');
    } else go();
  }
  function deleteTemplate(tid, name) {
    if (!tid) { note('warn', '先选一份工作流', '在左侧列表里右键一项。'); return; }
    var cur = wfUuid(state.wf);
    if (!name) {
      var nameEl = document.querySelector('#wf-pick-list .wf-pick-item.on .wn');
      name = (nameEl && nameEl.textContent) || '这份工作流';
    }
    var body = tid === cur
      ? '正在编辑的这份会从列表里去掉，画布换成空白。其它工作流里插入的这块也会去掉。'
      : '「' + name + '」会从列表里去掉。其它工作流里插入的这块也会去掉。';
    askConfirm('删除工作流', body, function () {
      if (tplSyncTimer) { clearTimeout(tplSyncTimer); tplSyncTimer = null; }
      if (tplPutTimer[tid]) { clearTimeout(tplPutTimer[tid]); delete tplPutTimer[tid]; }
      tplRemoved[tid] = 1;
      delete tplCache[tid];
      tplList = tplList.filter(function (t) { return t.id !== tid; });
      if (tid === cur) {
        state.wf = freshWorkflow();
        state.tplRegistered = false;
        state.dirty = false;
        document.getElementById('wf-name').value = state.wf.name;
        state.selected = null; state.selectedIds = {};
        state.undo = []; state.redo = [];
        tplSel = '';
        renderNodes(); showProps(); updateStats();
        emptyHint.style.display = '';
        try {
          var draft = JSON.parse(localStorage.getItem('wfed_draft') || 'null');
          if (draft && draft.wf && wfUuid(draft.wf) === tid) localStorage.removeItem('wfed_draft');
        } catch (e) { /* 草稿损坏就不管 */ }
      } else {
        dropEmbedsOf(tid);
        if (tplSel === tid) tplSel = cur;
        renderNodes(); showProps(); updateStats();
        if ((state.tplRegistered || tplCache[cur]) && !tplRemoved[cur]) putTemplate(collectLinked());
        else scheduleDraft();
      }
      renderTplPick();
      fetch('/api/workflow-templates/' + encodeURIComponent(tid), { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || res.ok === false) {
            delete tplRemoved[tid];
            note('err', '删除失败', (res && res.error) || '');
            fetchTplList();
            return;
          }
          fetchTplList();
          note('ok', '已删除', name, 3200);
        })
        .catch(function () {
          delete tplRemoved[tid];
          note('err', '删除失败', '网络或后端没有响应。');
          fetchTplList();
        });
    }, '删除');
  }
  function bindTplPick() {
    var pick = document.getElementById('wf-pick');
    if (pick) {
      pick.addEventListener('contextmenu', function (ev) {
        if (ev.target.closest && ev.target.closest('.wf-pick-item')) return;
        ev.preventDefault();
        showWfMenu(ev.clientX, ev.clientY, '', '', false);
      });
    }
    var btn = document.getElementById('btn-insert-tpl');
    var menu = document.getElementById('insert-menu');
    if (btn && menu) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        hideWfMenu();
        var open = document.getElementById('open-menu');
        var imp = document.getElementById('import-menu');
        if (open) open.classList.add('hidden');
        if (imp) imp.classList.add('hidden');
        var willOpen = menu.classList.contains('hidden');
        menu.classList.toggle('hidden');
        if (willOpen) {
          renderInsertMenu();
          placeInsertMenu();
        }
      });
      menu.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      menu.addEventListener('click', function (ev) { ev.stopPropagation(); });
    }
    document.addEventListener('click', hideWfMenu);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hideWfMenu();
    });
    var name = document.getElementById('wf-name');
    var nameSaveTimer = null;
    if (name) name.addEventListener('input', function () {
      applyWorkflowName(state.wf, name.value);
      state.dirty = true;
      renderTplPick();
      writeDraftNow();
      if (nameSaveTimer) clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(function () {
        if (tplRemoved[wfUuid(state.wf)]) return;
        state.tplRegistered = true;
        putTemplate(collectLinked());
      }, 400);
    });
    fetchTplList();
  }

  function openWorkflow(wf) {
    if (!wf || !wf.data || !Array.isArray(wf.data.nodes)) { note('err', '文件格式不对', '未找到 data.nodes 数组。请选择由本编辑器导出的 Uni-Lab 工作流 JSON。'); return; }
    clearNotes();
    state.dirty = false;
    state.wf = wf;
    if (!wf.data.workflow_uuid) wf.data.workflow_uuid = uid();
    wf.data.edges = wf.data.edges || [];
    if (!wf.data.embeds) wf.data.embeds = [];
    wf.data.nodes.forEach(normalizeNode);
    document.getElementById('wf-name').value = wf.name || wf.data.workflow_name || '未命名工作流';
    state.selected = null; state.selectedIds = {}; state.undo = []; state.redo = [];
    state.tplRegistered = true;
    cacheTemplate(collectLinked());
    var paint = function () {
      expandAllEmbeds();
      renderNodes(); showProps(); updateStats(); renderTplPick();
      emptyHint.style.display = state.wf.data.nodes.length ? 'none' : '';
      setTimeout(function () {
        if (!state.wf.data.nodes.length) return;
        fitView();
        if (state.view.scale < 0.62) {
          note('info', '画布已缩放到 ' + Math.round(state.view.scale * 100) + '%',
            ['这份工作流的节点排得比较长，整体概览时文字会偏小。',
              '点工具栏「🧭 自动布局」可按依赖折行重排（同设备靠拢、并行分支并列），更易读。'], 8000);
        }
      }, 90);
    };
    if (wf.data.embeds.length) loadTemplatesFor(wf).then(paint);
    else paint();
  }
  function collectWorkflow() {
    var name = (document.getElementById('wf-name').value || '').trim() || '未命名工作流';
    state.wf.name = name;
    state.wf.data.workflow_name = name;
    var out = cloneData(state.wf);
    out.name = name;
    out.data.workflow_name = name;
    out.data.nodes = state.wf.data.nodes.map(function (n) { return pruneTransferParam(stripRuntime(n)); });
    out.data.edges = state.wf.data.edges.map(function (e) { var c = cloneData(e); delete c._embed; return c; });
    delete out.data.embeds;
    return out;
  }
  function doNew() {
    pushUndo();
    state.wf = freshWorkflow();
    state.tplRegistered = false;
    document.getElementById('wf-name').value = state.wf.name;
    state.selected = null; state.selectedIds = {};
    renderNodes(); showProps(); updateStats(); renderTplPick();
    emptyHint.style.display = '';
  }
  function doExport() {
    var wf = collectWorkflow();
    var blob = new Blob([JSON.stringify(wf, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (wf.name || 'unilab_workflow').replace(/[^\w\u4e00-\u9fff.\- ]/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    note('ok', '已导出', a.download + '（' + wf.data.nodes.length + ' 节点 / ' + wf.data.edges.length + ' 连线）');
  }
  function bindOpenSave() {
    var om = document.getElementById('open-menu');
    document.getElementById('btn-open').addEventListener('click', function (ev) {
      document.getElementById('import-menu').classList.add('hidden');
      var ins = document.getElementById('insert-menu');
      if (ins) ins.classList.add('hidden');
      om.classList.toggle('hidden'); ev.stopPropagation(); loadList();
    });
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest('#insert-menu, #btn-insert-tpl, #open-menu, #btn-open, #import-menu, #btn-import')) return;
      om.classList.add('hidden');
      document.getElementById('import-menu').classList.add('hidden');
      var ins = document.getElementById('insert-menu');
      if (ins) ins.classList.add('hidden');
    });
    om.addEventListener('click', function (ev) { ev.stopPropagation(); });
    // 注意：文件导入的 change 绑定已挪到 bindImport()（同一个 #wf-file，
    // 在这里再绑一次会读两遍、弹两次预览）。
    document.getElementById('om-ai-run').addEventListener('click', function () {
      var cond = document.getElementById('om-ai-cond').value.trim();
      if (!cond) { note('warn', '请先填写工艺条件', '例如：合成金纳米颗粒。'); return; }
      var btn = this;
      btn.textContent = '生成中…'; btn.disabled = true;
      fetch('/api/generate-workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cond: { reaction: cond }, reaction: cond })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.ok && res.workflow) openWorkflow(res.workflow);
        else note('err', '生成失败', res.error || '未知错误');
      }).catch(function (e) { note('err', '请求失败', e.message); }).finally(function () {
        btn.textContent = '生成并载入'; btn.disabled = false;
      });
    });
    document.getElementById('btn-save').addEventListener('click', function () {
      var name = (document.getElementById('wf-name').value || '').trim() || '未命名工作流';
      var wf = collectLinked();
      fetch('/api/workflow-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, workflow: wf })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.ok) {
          state.tplRegistered = true;
          cacheTemplate(wf);
          fetchTplList();
          note('ok', '已保存', res.name + '。插过这份模版的工作流会一起用到这次内容。');
          localStorage.setItem('wfed_draft', JSON.stringify({ name: name, wf: wf, at: Date.now() }));
        }
        else note('err', '保存失败', res.error);
      }).catch(function (e) { note('err', '请求失败', e.message); });
    });
    document.getElementById('btn-export').addEventListener('click', function () {
      var r = validate();
      if (r.errors.length) { note('err', '存在阻塞性错误，无法导出', r.errors); return; }
      var wf = collectWorkflow();
      if (!wf.data.nodes.length) { note('warn', '画布为空', '请先从左侧节点库拖入至少一个节点。'); return; }
      if (r.warns.length) {
        askConfirm('校验提示 ' + r.warns.length + ' 项', r.warns.concat(['', '仍要导出吗？']), doExport, '仍要导出');
        return;
      }
      doExport();
    });
  }
  // ---------- 导入工作流 ----------
  // 为什么单独做一套：原先「导入 JSON」只是「打开」下拉里一个裸 <input file>，
  //   · 只认本编辑器导出的 data.nodes —— 导入真实 Uni-Lab OS 工作流直接报「格式不对」
  //   · 解析失败只说「解析失败」，不说哪不对
  //   · 只能整体覆盖画布，没有「追加」选项
  //   · 没有与 1.4.0 节点库的匹配体检，未知设备/动作会静默变成一个看不懂的节点
  // 现在：文件 / 粘贴 / 拖到画布 三个入口 → 先出**导入预览**（来源格式 + 设备清单 +
  // 与节点库的匹配情况 + 环 / 孤立节点 + 自动修复项），再选「替换画布 / 追加到当前画布」。
  var FMT_LABEL = {
    editor: '本编辑器导出', unilab: 'Uni-Lab OS 原生',
    bare: '裸 nodes/edges', nodes: '节点数组'
  };
  var pendingImport = null;      // 最近一次解析结果 {wf, fmt, fixes, info}

  /** 把多种来源的 JSON 归一成编辑器内部格式。
   *  兼容 ① 本编辑器导出 / Uni-Lab OS 原生 {name,data:{nodes,edges}}
   *       ② 裸 {nodes,edges}  ③ 节点数组 […]  ④ 后端接口包装 {ok,workflow}
   *  返回 {wf, fmt, fixes[]}；fixes 记录为了让它能跑而自动补的东西（会显示给用户）。 */
  function normWorkflow(raw) {
    if (raw == null || typeof raw !== 'object') throw new Error('内容不是 JSON 对象或数组');
    if (raw.workflow && raw.ok !== undefined) raw = raw.workflow;        // /api/workflow-open 包装

    var fixes = [], fmt = 'unilab', wf;
    if (Array.isArray(raw)) {
      fmt = 'nodes';
      wf = { target_lab_uuid: uid(), name: '导入的工作流',
             data: { workflow_uuid: uid(), workflow_name: '导入的工作流', nodes: raw, edges: [] } };
      fixes.push('顶层是节点数组，已补 edges / workflow_uuid / target_lab_uuid');
    } else if (raw.data && Array.isArray(raw.data.nodes)) {
      wf = raw;
      // 有 workflow_uuid 说明是本编辑器存的（或后端保存过的）；没有则是平台原生导出
      fmt = raw.data.workflow_uuid ? 'editor' : 'unilab';
    } else if (Array.isArray(raw.nodes)) {
      fmt = 'bare';
      wf = { target_lab_uuid: raw.target_lab_uuid || uid(), name: raw.name || '导入的工作流',
             data: { workflow_uuid: uid(), workflow_name: raw.name || '导入的工作流',
                     nodes: raw.nodes, edges: Array.isArray(raw.edges) ? raw.edges : [] } };
      fixes.push('顶层是裸 nodes/edges，已补 data 包装');
    } else {
      throw new Error('没找到节点数组：需要 data.nodes / 顶层 nodes / 顶层数组');
    }

    wf.data.edges = Array.isArray(wf.data.edges) ? wf.data.edges : [];
    if (!wf.data.workflow_uuid) { wf.data.workflow_uuid = uid(); fixes.push('补生成 workflow_uuid'); }
    if (!wf.target_lab_uuid) { wf.target_lab_uuid = uid(); fixes.push('补生成 target_lab_uuid'); }
    var nm = wf.name || wf.data.workflow_name || '导入的工作流';
    wf.name = nm; wf.data.workflow_name = nm;

    // 归一每个节点：补 uuid / pose / param（否则渲染与连线都会出问题）
    var noPose = 0, noUuid = 0;
    wf.data.nodes = wf.data.nodes.map(function (n) {
      if (!n || typeof n !== 'object') return n;
      if (!n.uuid) { n.uuid = uid(); noUuid++; }
      if (n.type !== 'Group' && !n.param) n.param = {};
      if (!n.pose || !n.pose.position) { n.pose = basePose(0, 0); noPose++; }
      return n;
    });
    if (noUuid) fixes.push(noUuid + ' 个节点缺 uuid，已补生成');
    if (noPose) fixes.push(noPose + ' 个节点缺坐标，已置零（点「🧭 自动布局」可重排）');

    // 丢弃指向不存在节点的边（平台导出里偶有引用已删节点的情况）
    var ids = {};
    wf.data.nodes.forEach(function (n) { if (n && n.uuid) ids[n.uuid] = 1; });
    var keepEdges = wf.data.edges.filter(function (e) {
      if (!e) return false;
      if (ids[e.source_node_uuid] && ids[e.target_node_uuid]) return true;
      // 连到插入模版上的线，端点要等展开后才出现在节点列表里
      var embeds = wf.data.embeds || [];
      if (!embeds.length) return false;
      var touch = function (id) { return String(id || '').indexOf('__') >= 0; };
      return touch(e.source_node_uuid) || touch(e.target_node_uuid);
    });
    if (keepEdges.length !== wf.data.edges.length) {
      fixes.push('丢弃 ' + (wf.data.edges.length - keepEdges.length) + ' 条指向不存在节点的连线');
    }
    wf.data.edges = keepEdges;
    return { wf: wf, fmt: fmt, fixes: fixes };
  }

  /** 检测环（返回环上的 uuid 序列，无环返回 null） */
  function findCycle(nodes, edges) {
    var ids = {}, children = {};
    nodes.forEach(function (n) { if (n && n.uuid) ids[n.uuid] = 1; });
    edges.forEach(function (e) {
      if (!ids[e.source_node_uuid] || !ids[e.target_node_uuid]) return;
      (children[e.source_node_uuid] = children[e.source_node_uuid] || []).push(e.target_node_uuid);
    });
    var color = {}, stack = [];
    function dfs(u) {
      color[u] = 1; stack.push(u);
      var ch = children[u] || [];
      for (var i = 0; i < ch.length; i++) {
        var v = ch[i];
        if (color[v] === 1) return stack.slice(stack.indexOf(v)).concat([v]);
        if (!color[v]) { var r = dfs(v); if (r) return r; }
      }
      color[u] = 2; stack.pop();
      return null;
    }
    for (var k = 0; k < nodes.length; k++) {
      var u = nodes[k] && nodes[k].uuid;
      if (u && !color[u]) { var r2 = dfs(u); if (r2) return r2; }
    }
    return null;
  }

  /** 导入体检：设备清单 + 与 1.4.0 节点库的匹配情况 + 结构问题 */
  function analyzeImport(wf) {
    var nodes = wf.data.nodes, edges = wf.data.edges;
    var devs = [], devIdx = {}, unknown = [], dup = {}, seen = {};
    var nCmd = 0, nName = 0, nScript = 0, nGroup = 0;

    nodes.forEach(function (n, i) {
      if (n.uuid) { if (seen[n.uuid]) dup[n.uuid] = 1; else seen[n.uuid] = 1; }
      if (n.type === 'Group') { nGroup++; return; }
      if (!n.device_name) { nScript++; return; }
      var d = devOf(n.device_name), a = actionOfNode(n);
      var key = n.device_name;
      if (devIdx[key] === undefined) {
        devIdx[key] = devs.length;
        devs.push({ id: key, label: devLabel(key), icon: devIcon(key),
                    color: devColor(key), n: 0, known: !!d });
      }
      devs[devIdx[key]].n++;
      var ct = (n.param || {}).cmd_type;
      var act = String(n.name || '').replace(/^auto-/, '');
      if (!d) {
        // 编辑器节点库根本没这个设备 → 后端也没有对应驱动，一定跑不动
        unknown.push({ idx: i, node: n, kind: 'no-device', action: act,
          why: '设备驱动不在 1.4.0 节点库，后端没有对应驱动' });
      } else if (!a) {
        // 设备有，只是这个动作不在节点库里。★ 关键区别：节点库的动作表来自 1.4.0
        // 「指令表」（cmdType 驱动），而驱动模块上还有一批**全靠方法名**的动作
        // （如离心管的 ch8_aspirate 宏动作，自带 setpoints）。
        // 所以这里不能直接判死刑 —— 交给后端按方法名裁决（见 verifyWithBackend）。
        unknown.push({ idx: i, node: n, kind: 'no-action', action: act,
          why: (ct !== undefined && ct !== null && ct !== '')
            ? ('节点库的 1.4.0 指令表里没有 cmd_type=' + ct)
            : ('节点库的动作表里没有 ' + act + '（该动作靠方法名执行，需向后端核对）') });
      } else if (a.cmdType !== undefined) nCmd++;
      else nName++;
    });

    // 孤立节点（不含分组）：导出/运行前会被提示，导入时先讲清楚
    var touched = {};
    edges.forEach(function (e) { touched[e.source_node_uuid] = 1; touched[e.target_node_uuid] = 1; });
    var alone = nodes.filter(function (n) {
      return n.type !== 'Group' && !touched[n.uuid];
    }).length;

    return {
      nodes: nodes.length, edges: edges.length, devs: devs,
      nCmd: nCmd, nName: nName, nScript: nScript, nGroup: nGroup,
      unknown: unknown, dup: Object.keys(dup), alone: alone,
      cycle: findCycle(nodes, edges)
    };
  }

  /** 未知动作的裁决：bad=确定跑不动 | ok=后端驱动里有 | pending=核对中 | unknown=后端不可达 */
  function unknownVerdict(u) {
    if (u.kind === 'no-device') return 'bad';
    if (u.backend === 'yes') return 'ok';
    if (u.backend === 'no') return 'bad';
    if (u.backend === 'unknown') return 'unknown';
    return 'pending';
  }

  /** 把「节点库没收录的动作」拿去问后端，用 GET /api/gn-adapter/status?device= 拿到
   *  驱动**真实**的方法清单 —— 编辑器节点库只收录 1.4.0 指令表里的动作，
   *  靠方法名执行的那批（离心管宏动作等）不在其中，不核对就会误报成「跑不动」。 */
  var _verifyToken = 0;
  function verifyWithBackend(res) {
    if (!res || res._verified || !res.info) return;
    var want = {}, any = false;
    res.info.unknown.forEach(function (u) {
      if (u.kind === 'no-action') { want[u.node.device_name] = 1; any = true; }
    });
    if (!any) { res._verified = true; return; }

    res._verifying = true;
    var token = ++_verifyToken;
    Promise.all(Object.keys(want).map(function (id) {
      return fetch('/api/gn-adapter/status?device=' + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var m = {};
          (j.actions || []).forEach(function (a) { if (a && a.method) m[a.method] = 1; });
          return { id: id, methods: m, ok: true };
        })
        .catch(function () { return { id: id, methods: null, ok: false }; });
    })).then(function (list) {
      if (token !== _verifyToken) return;                 // 期间又解析了新的导入，丢弃本次结果
      var by = {}, reachable = false;
      list.forEach(function (x) { by[x.id] = x.methods; if (x.ok) reachable = true; });
      res.info.unknown.forEach(function (u) {
        if (u.kind !== 'no-action') return;
        var m = by[u.node.device_name];
        u.backend = !reachable ? 'unknown' : (m && m[u.action] ? 'yes' : 'no');
      });
      res._verifying = false; res._verified = true;
      if (pendingImport === res) showImportPreview(res);
    }).catch(function () {
      res.info.unknown.forEach(function (u) {
        if (u.kind === 'no-action' && !u.backend) u.backend = 'unknown';
      });
      res._verifying = false; res._verified = true;
      if (pendingImport === res) showImportPreview(res);
    });
  }

  function parseWorkflowText(text) {
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) {
      throw new Error('JSON 语法错误：' + (e && e.message ? e.message : e));
    }
    var res = normWorkflow(obj);
    res.info = analyzeImport(res.wf);
    return res;
  }

  /** 追加导入时的整体平移量：把新来的那堆放到现有节点右侧，留 140px 间隙 */
  function importOffset(curNodes, addNodes) {
    if (!curNodes.length || !addNodes.length) return { dx: 0, dy: 0 };
    var cMaxX = -Infinity, cMinY = Infinity, aMinX = Infinity, aMinY = Infinity;
    curNodes.forEach(function (n) {
      var p = (n.pose && n.pose.position) || {};
      cMaxX = Math.max(cMaxX, p.x || 0); cMinY = Math.min(cMinY, p.y || 0);
    });
    addNodes.forEach(function (n) {
      var p = (n.pose && n.pose.position) || {};
      aMinX = Math.min(aMinX, p.x || 0); aMinY = Math.min(aMinY, p.y || 0);
    });
    return { dx: (cMaxX + 140) - aMinX, dy: cMinY - aMinY };
  }

  /** 真正落地导入。mode: 'replace' 替换画布 | 'append' 追加到当前画布 */
  function doImport(res, mode) {
    if (!res || !res.wf) return false;
    var wf = JSON.parse(JSON.stringify(res.wf));
    putTemplate(wf);
    var cur = state.wf.data.nodes;

    if (mode === 'replace') {
      var go = function () {
        pushUndo();
        // openWorkflow 内部会清空 undo/redo 栈；导入属于「一步可撤销」的操作，
        // 所以先把栈存下来、调用完再装回去，Ctrl+Z 才能退回导入前的画布。
        var ku = state.undo, kr = state.redo;
        state.tplRegistered = true;
        openWorkflow(wf);
        state.undo = ku; state.redo = kr;
        hideImportMenu();
        var body = [wf.name, wf.data.nodes.length + ' 节点 / ' + wf.data.edges.length + ' 连线'];
        if (res.fixes.length) body.push('自动修复 ' + res.fixes.length + ' 项（见预览）');
        note('ok', '已导入 · 替换画布', body);
      };
      if (cur.length) {
        askConfirm('替换当前画布？',
          ['当前画布有 ' + cur.length + ' 个节点、' + state.wf.data.edges.length + ' 条连线，导入会清空它们。',
            '导入后可 Ctrl+Z 撤销。'],
          go, '替换并导入');
      } else go();
      return true;
    }

    // ---- 追加：新 uuid 防冲突 + 整体平移防重叠 + 边重映射 ----
    pushUndo();
    var map = {};
    var addNodes = wf.data.nodes.map(function (n) {
      var c = JSON.parse(JSON.stringify(n));
      map[n.uuid] = uid(); c.uuid = map[n.uuid];
      return c;
    });
    var off = importOffset(cur, addNodes);
    addNodes.forEach(function (n) {
      if (!n.pose || !n.pose.position) n.pose = basePose(0, 0);
      n.pose.position.x = (n.pose.position.x || 0) + off.dx;
      n.pose.position.y = (n.pose.position.y || 0) + off.dy;
      normalizeNode(n);
    });
    var have = {};
    state.wf.data.edges.forEach(function (e) {
      have[e.source_node_uuid + '>' + e.target_node_uuid] = 1;
    });
    var addedE = 0, dupE = 0, dropE = 0;
    wf.data.edges.forEach(function (e) {
      var s = map[e.source_node_uuid], t = map[e.target_node_uuid];
      if (!s || !t) { dropE++; return; }
      if (have[s + '>' + t]) { dupE++; return; }
      have[s + '>' + t] = 1;
      var c = JSON.parse(JSON.stringify(e));
      c.source_node_uuid = s; c.target_node_uuid = t; c.uuid = uid();
      state.wf.data.edges.push(c); addedE++;
    });
    addNodes.forEach(function (n) { state.wf.data.nodes.push(n); });
    state.selected = null; state.selectedIds = {};
    state.runState = {};
    renderNodes(); showProps(); updateStats(); afterChange();
    emptyHint.style.display = 'none';
    hideImportMenu();

    var msg = ['新加 ' + addNodes.length + ' 节点 / ' + addedE + ' 连线',
      '画布现共 ' + state.wf.data.nodes.length + ' 节点 / ' + state.wf.data.edges.length + ' 连线',
      '已整体右移 ' + Math.round(off.dx) + 'px，避免与原有节点重叠'];
    if (dupE) msg.push('跳过 ' + dupE + ' 条已存在的连线');
    if (dropE) msg.push('丢弃 ' + dropE + ' 条指向不存在节点的连线');
    note('ok', '已导入 · 追加到当前画布', msg);
    return true;
  }

  // ---------- 导入：预览 UI ----------
  function impStat(k, v, cls) {
    return '<div class="imp-stat ' + (cls || '') + '"><span class="is-v">' + esc(v) +
      '</span><span class="is-k">' + esc(k) + '</span></div>';
  }
  function showImportPreview(res) {
    pendingImport = res;
    var box = document.getElementById('import-preview');
    if (!res) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    var wf = res.wf, info = res.info;
    var h = [];

    h.push('<div class="imp-head"><b>' + esc(wf.name) + '</b>' +
      '<span class="imp-badge">' + esc(FMT_LABEL[res.fmt] || res.fmt) + '</span></div>');

    h.push('<div class="imp-grid">' +
      impStat('节点', info.nodes) + impStat('连线', info.edges) +
      impStat('设备', info.devs.length) + impStat('动作匹配', info.nCmd + info.nName) +
      '</div>');

    // 匹配质量：把「确定跑不动 / 核对中 / 后端其实有」分清楚，不要一律吓人
    var nBad = 0, nOk = 0, nPending = 0, nUnk = 0;
    info.unknown.forEach(function (u) {
      var v = unknownVerdict(u);
      if (v === 'bad') nBad++; else if (v === 'ok') nOk++;
      else if (v === 'pending') nPending++; else nUnk++;
    });
    var prob = [];
    if (nBad) prob.push('<span class="imp-tag bad">' + nBad + ' 个节点后端跑不动</span>');
    if (nPending) prob.push('<span class="imp-tag wait">正在向后端核对 ' + nPending + ' 个动作…</span>');
    if (nOk) prob.push('<span class="imp-tag ok">' + nOk + ' 个动作节点库未收录、但后端驱动里有</span>');
    if (nUnk) prob.push('<span class="imp-tag warn">' + nUnk + ' 个未能核对（后端不可达）</span>');
    if (info.cycle) prob.push('<span class="imp-tag bad">检测到环依赖（无法运行）</span>');
    if (info.dup.length) prob.push('<span class="imp-tag bad">' + info.dup.length + ' 个重复 uuid</span>');
    if (info.alone) prob.push('<span class="imp-tag warn">' + info.alone + ' 个孤立节点</span>');
    if (!prob.length) prob.push('<span class="imp-tag ok">全部节点都能匹配到 1.4.0 节点库</span>');
    h.push('<div class="imp-tags">' + prob.join('') + '</div>');

    if (info.devs.length) {
      h.push('<div class="imp-sec">用到的设备驱动</div><div class="imp-devs">');
      info.devs.forEach(function (d) {
        h.push('<span class="imp-dev' + (d.known ? '' : ' unknown') + '" title="' +
          esc(d.known ? d.id : d.id + '（后端无此驱动）') + '">' +
          '<i>' + d.icon + '</i>' + esc(d.label) +
          '<b>' + d.n + '</b>' + (d.known ? '' : '<u>无驱动</u>') + '</span>');
      });
      h.push('</div>');
    }

    if (info.unknown.length) {
      var VERDICT_TXT = {
        bad: ['后端跑不动', 'bad'], ok: ['后端可执行', 'ok'],
        pending: ['核对中…', 'wait'], unknown: ['未能核对', 'warn']
      };
      h.push('<div class="imp-sec">节点库没匹配上的节点（导入后会原样保留）</div><div class="imp-un">');
      info.unknown.slice(0, 8).forEach(function (u) {
        var v = unknownVerdict(u), vt = VERDICT_TXT[v] || VERDICT_TXT.unknown;
        h.push('<div class="imp-u ' + vt[1] + '"><b>' + esc(u.node.name || '(无名)') +
          '<em>' + esc(vt[0]) + '</em></b>' +
          '<span>' + esc((u.node.device_name || '—') + ' · ' + u.why) + '</span></div>');
      });
      if (info.unknown.length > 8) h.push('<div class="imp-u more">…还有 ' + (info.unknown.length - 8) + ' 个</div>');
      h.push('</div>');
    }

    if (res.fixes.length) {
      h.push('<div class="imp-sec">自动修复 ' + res.fixes.length + ' 项</div><div class="imp-fix">');
      res.fixes.forEach(function (f) { h.push('<div class="imp-f"><span>✓</span>' + esc(f) + '</div>'); });
      h.push('</div>');
    }

    h.push('<div class="imp-act">' +
      '<button class="imp-go" id="import-replace">替换画布</button>' +
      '<button class="imp-go alt" id="import-append">追加到当前画布</button>' +
      '</div>');
    box.innerHTML = h.join('');
    box.classList.remove('hidden');
    verifyWithBackend(res);       // 有「节点库未收录」的动作时，异步向后端核对
  }

  function hideImportMenu() {
    var m = document.getElementById('import-menu');
    if (m) m.classList.add('hidden');
  }
  function openImportMenu() {
    document.getElementById('open-menu').classList.add('hidden');
    var ins = document.getElementById('insert-menu');
    if (ins) ins.classList.add('hidden');
    document.getElementById('import-menu').classList.remove('hidden');
  }

  function importFromText(text, label) {
    var res;
    try { res = parseWorkflowText(text); }
    catch (e) {
      showImportPreview(null);
      note('err', '这不是可用的工作流 JSON', [
        String((e && e.message) || e), '来源：' + (label || '粘贴内容')]);
      return false;
    }
    openImportMenu();
    showImportPreview(res);
    return true;
  }

  function importFromFile(f) {
    if (!f) return;
    var okName = /\.json$/i.test(f.name || '');
    var okType = (f.type || '').indexOf('json') >= 0;
    if (!okName && !okType) {
      note('warn', '不是 JSON 文件', [f.name + '（' + (f.type || '未知类型') + '）',
        '请选择 .json 工作流文件，或把内容粘到「导入」面板里。']);
      return;
    }
    var rd = new FileReader();
    rd.onload = function () { importFromText(String(rd.result), f.name); };
    rd.onerror = function () { note('err', '文件读取失败', f.name); };
    rd.readAsText(f, 'utf-8');
  }

  function bindImport() {
    var menu = document.getElementById('import-menu');
    document.getElementById('btn-import').addEventListener('click', function (ev) {
      ev.stopPropagation();
      var willOpen = menu.classList.contains('hidden');
      document.getElementById('open-menu').classList.add('hidden');
      var ins = document.getElementById('insert-menu');
      if (ins) ins.classList.add('hidden');
      menu.classList.toggle('hidden');
      if (willOpen) {
        // 每次打开都从干净状态开始，避免上一份预览误导人
        showImportPreview(null);
        document.getElementById('import-text').value = '';
      }
    });
    menu.addEventListener('click', function (ev) { ev.stopPropagation(); });

    document.getElementById('wf-file').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';                      // 同一个文件再选一次也要能触发
      importFromFile(f);
    });
    document.getElementById('import-parse').addEventListener('click', function () {
      var t = document.getElementById('import-text').value;
      if (!t.trim()) { note('warn', '还没有内容', '先粘贴工作流 JSON，或点「载入示例」。'); return; }
      importFromText(t, '粘贴内容');
    });
    document.getElementById('import-clear').addEventListener('click', function () {
      document.getElementById('import-text').value = '';
      showImportPreview(null);
    });
    document.getElementById('import-sample').addEventListener('click', function () {
      fetch('assets/unilab_workflow.sample.json').then(function (r) { return r.text(); })
        .then(function (t) {
          document.getElementById('import-text').value = t;
          importFromText(t, '内置示例');
        })
        .catch(function (e) { note('err', '示例加载失败', String(e.message || e)); });
    });

    // 预览里的两个动作按钮（预览内容是 innerHTML 重建的，用委托绑定）
    document.getElementById('import-preview').addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.id === 'import-replace') doImport(pendingImport, 'replace');
      else if (t.id === 'import-append') doImport(pendingImport, 'append');
    });

    // 把 .json 拖到画布任意位置即导入
    var drop = document.getElementById('wfed-drop');
    var depth = 0;
    function hasFiles(ev) {
      var dt = ev.dataTransfer;
      if (!dt) return false;
      if (dt.types) return Array.prototype.indexOf.call(dt.types, 'Files') >= 0;
      return !!(dt.files && dt.files.length);
    }
    window.addEventListener('dragenter', function (ev) {
      if (!hasFiles(ev)) return;
      ev.preventDefault(); depth++; drop.classList.add('on');
    });
    window.addEventListener('dragover', function (ev) {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      try { ev.dataTransfer.dropEffect = 'copy'; } catch (e) { /* 只读时忽略 */ }
    });
    window.addEventListener('dragleave', function (ev) {
      if (!hasFiles(ev)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) drop.classList.remove('on');
    });
    window.addEventListener('drop', function (ev) {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      depth = 0; drop.classList.remove('on');
      var f = ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) importFromFile(f);
      else note('warn', '没读到文件', '请从访达 / 资源管理器里拖 .json 文件，不要拖文件夹。');
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hideImportMenu();
    });
  }

  function loadList() {
    var box = document.getElementById('om-list');
    box.innerHTML = '<div class="om-item" style="cursor:default;color:#94a3b8">加载中…</div>';
    fetch('/api/workflow-list').then(function (r) { return r.json(); }).then(function (res) {
      box.innerHTML = '';
      if (!res.ok || !res.workflows || !res.workflows.length) {
        box.innerHTML = '<div class="om-item" style="cursor:default;color:#94a3b8">暂无已保存工作流</div>';
        return;
      }
      res.workflows.forEach(function (w) {
        var it = el('div', 'om-item', '<span>' + esc(w.name) + '</span><span class="om-meta">' + w.size + 'B · ' + fmtTime(w.mtime) + '</span>');
        it.addEventListener('click', function () {
          fetch('/api/workflow-open?name=' + encodeURIComponent(w.name))
            .then(function (r) { return r.json(); })
            .then(function (res) { if (res.ok) openWorkflow(res.workflow); else note('err', '打开失败', res.error); });
        });
        box.appendChild(it);
      });
    }).catch(function () { box.innerHTML = '<div class="om-item" style="cursor:default;color:#ef4444">无法连接后端</div>'; });
  }

  // ---------- 初始化 ----------
  function init() {
    renderLib();
    bind();
    bindOpenSave();
    bindImport();
    bindTplPick();
    document.body.classList.toggle('narrow', window.innerWidth < 980);
    try {
      var draft = JSON.parse(localStorage.getItem('wfed_draft') || 'null');
      var data = draft && draft.wf && draft.wf.data;
      var hasBody = data && ((data.nodes && data.nodes.length) || (data.embeds && data.embeds.length));
      var named = draft && draft.wf && draft.wf.name && draft.wf.name !== '未命名工作流';
      if (data && (hasBody || named)) {
        bootDraftAt = draft.at || 0;
        openWorkflow(draft.wf);
      }
    } catch (e) { /* 忽略损坏草稿 */ }
    bootReady = true;
    reconcileSavedWorkflow();
    updateStats();
    applyView();
    refitShare();

    // 对外接口：给 wfrun.js / 自动化验证用
    window.__WFED = {
      state: state,
      LIB: LIB,
      renderNodes: renderNodes,
      showProps: showProps,
      updateStats: updateStats,
      applyView: applyView,
      updatePositions: updatePositions,
      nodeScreenRect: nodeScreenRect,
      fitView: fitView,
      autoLayout: autoLayout,
      validate: validate,
      findNode: findNode,
      addNode: addNode,
      openWorkflow: openWorkflow,
      collectWorkflow: collectWorkflow,
      // ---- 右栏属性面板（窄栏「固定展开」+ PRCXI 板位点选器，给自检用）----
      setPropPinned: function (on) { if (setPropPinnedFn) setPropPinnedFn(on); },
      isPropPinned: function () {
        var a = document.getElementById('wfed-props');
        return !!(a && a.classList.contains('pinned'));
      },
      isPropNarrow: function () { return document.body.classList.contains('propnarrow'); },
      deck: {
        state: function () {
          return { proc: deckState.proc, role: deckState.role, nodeUuid: deckState.nodeUuid,
                   err: deckState.err, cached: Object.keys(deckState.cache) };
        },
        setProc: function (p) { deckState.proc = p; },
        setRole: function (r) { deckState.role = r; },
        reset: function () {
          deckState.proc = 'autet'; deckState.role = null;
          deckState.nodeUuid = null; deckState.err = ''; deckState.cache = {};
        },
        /** 当前选中节点的后端板位快照（未加载则 null） */
        sites: function () {
          var n = (state.selected && state.selected.type === 'node') ? findNode(state.selected.id) : null;
          return n ? (deckState.cache[deckCacheKey(n)] || null) : null;
        },
        /** 当前选中节点的板位角色定义（非 PRCXI 动作则 null） */
        roles: function () {
          var n = (state.selected && state.selected.type === 'node') ? findNode(state.selected.id) : null;
          return n ? deckRolesOfNode(n) : null;
        }
      },
      // ---- 导入工作流（给自检 / 外部脚本用）----
      parseWorkflow: parseWorkflowText,       // (text) → {wf, fmt, fixes, info}，失败抛错
      analyzeImport: analyzeImport,           // (wf) → 设备清单 + 匹配体检
      importWorkflow: function (src, mode) {  // 文本或对象；mode='replace'|'append'
        var res = (typeof src === 'string') ? parseWorkflowText(src) : (function () {
          var r = normWorkflow(src); r.info = analyzeImport(r.wf); return r;
        })();
        return doImport(res, mode || 'replace');
      },
      pendingImport: function () { return pendingImport; },
      importFromText: importFromText,
      importFromFile: importFromFile,
      setRunState: function (uuid, st) { state.runState[uuid] = st; updateNodeCard(findNode(uuid)); },
      // 批量写入运行态：直接改 class，不重建节点 DOM。
      // 逐节点走 updateNodeCard 会连带 renderEdges()，N 个节点就是 O(N²)，
      // 对 300+ 节点的真实工作流会卡死浏览器。
      setRunStates: function (map, replace) {
        if (replace) state.runState = {};
        var reg = ['has-state', 'st-pending', 'st-ready', 'st-running', 'st-paused', 'st-success',
          'st-failed', 'st-skipped', 'st-canceled', 'st-locked'];
        for (var u in (map || {})) state.runState[u] = map[u];
        var ns = state.wf.data.nodes;
        for (var i = 0; i < ns.length; i++) {
          var uuid = ns[i].uuid, rs = state.runState[uuid];
          var d = canvas.querySelector('[data-uuid="' + uuid + '"]');
          if (!d) continue;
          for (var j = 0; j < reg.length; j++) d.classList.remove(reg[j]);
          if (rs) {
            d.classList.add('has-state', 'st-' + (rs.state || 'pending'));
            if (rs.locked) d.classList.add('st-locked');
          }
        }
      },
      clearRunState: function () { state.runState = {}; renderNodes(); },
      NODE_W: NODE_W,
      // 节点库（三级：类别 → 设备驱动 → 节点）
      renderLib: renderLib,
      CATEGORIES: CATEGORIES,
      CATEGORY_IDS: function () { return CATEGORIES.map(function (c) { return c.id; }); },
      libState: function () { return { cat: libCat, dev: libDev, filter: libFilter }; },
      setLib: function (o) {
        o = o || {};
        if (o.cat !== undefined) libCat = o.cat;
        if (o.dev !== undefined) libDev = o.dev;
        if (o.filter !== undefined) libFilter = o.filter;
        renderLib();
      },
      // 窄侧栏「固定展开」开关（触屏没有 hover，需要显式钉住）
      setPinned: function (on) { if (setPinnedFn) setPinnedFn(on); },
      isPinned: function () {
        var a = document.getElementById('wfed-lib');
        return !!(a && a.classList.contains('pinned'));
      },
      libDrivers: function (catId) {
        var c = CATEGORIES.filter(function (x) { return x.id === (catId || libCat); })[0] || CATEGORIES[0];
        return catDevs(c).map(function (d) {
          return { id: d.id, label: d.label, protocol: d.protocol, actions: actsOf(d).length, total: d.actions.length };
        });
      },
      libNodes: function (devId) {
        var d = libDevById(devId); if (!d) return [];
        return actsOf(d).map(function (a) { return { label: a.label, cmd: a.cmdType, name: a.name, special: a.special || '' }; });
      },
      // 协议点位（1.4.0「点位表」）—— 驱动信息的一半，供调试/测试查询
      libPoints: function (devId, q) {
        var d = libDevById(devId); if (!d) return [];
        var pts = d.points || [];
        if (!q) return pts;
        var kw = String(q).toLowerCase();
        return pts.filter(function (p) { return ptHay(p).indexOf(kw) >= 0; });
      },
      libPointStats: function (devId) {
        var d = libDevById(devId); if (!d) return null;
        return d.pointStats || { total: (d.points || []).length, r: 0, w: 0 };
      },
      // 兼容旧调试钩子
      moveNode: function (uuid, x, y) { var n = findNode(uuid); if (!n) return false; n.pose.position.x = x; n.pose.position.y = y; updatePositions(); return true; },
      connect: function (a, b) {
        if (edgeExists(a, b)) return false;
        state.wf.data.edges.push({
          source_node_uuid: a, target_node_uuid: b, source_handle_key: 'ready',
          source_handle_io: 'source', target_handle_key: 'ready', target_handle_io: 'target'
        });
        renderEdges(); updateStats(); return true;
      },
      listNodes: function () {
        return state.wf.data.nodes.map(function (n) {
          return { uuid: n.uuid, title: (n._display || {}).actionLabel || n.name, x: n.pose.position.x, y: n.pose.position.y };
        });
      },
      listEdges: function () { return state.wf.data.edges.map(function (e) { return e.source_node_uuid + '>' + e.target_node_uuid; }); },
      getWorkflow: function () { return collectWorkflow(); }
    };
  }
  init();
})();
