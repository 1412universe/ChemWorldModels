/* =========================================================================
   runmode.js —— 运行档位分段按钮（编辑器顶栏 / 总览顶栏共用，ES5 IIFE）

   两个按钮（对齐后端 /api/workflow-run 语义），由用户自行选择：
     sim  仿真模拟（默认）  mode=real, action_mode=simulate
          → 驱动代码全跑 + SimPlc/DMTP 镜像模型出读数，零硬件风险
     real 真机调试          mode=real, action_mode=real, allow_real=true
          → 真驱动真 PLC；切到本档必须先过不可跳过的确认弹层，
            授权只存内存（刷新即失效），页面挂红色常驻指示条

   注：后端仍保留 mode='dry'（DryRunDispatcher 纯计时，接口自检用），
   但 UI 不再提供该档 —— 自检需要时直接写 window.WFED_MODE='dry'。

   对接约定：
     · window.WFED_MODE        —— 'real' | 'dry'（wfrun.js 已读；sim 档也是 'real'）
     · window.WFED_REAL_OPTS   —— 附加参数 {action_mode, allow_real?}
     · window.__RUNMODE        —— 调试/自检接口
   初值：GET /api/gn-adapter/status 回读 config.action_mode（服务器环境
   是最诚实的初值来源；前端默认 sim）。
   ========================================================================= */
(function () {
  'use strict';

  var MODES = [
    { key: 'sim',  label: '仿真模拟', icon: '🧪',
      tip: '驱动代码全跑 + 镜像模型出读数（零硬件风险，默认档）' },
    { key: 'real', label: '真机调试', icon: '⚠️',
      tip: '真实驱动真实 PLC —— 会动 510 现场硬件，需确认授权' }
  ];

  var mode = 'sim';                 // 当前档（内存态；real 授权也只存内存）
  var serverActionMode = null;      // 后端回读（ GN_* 环境变量事实）

  function opts() {
    if (mode === 'real') return { mode: 'real', action_mode: 'real', allow_real: true };
    // sim 档：真调度器 + 仿真驱动（后端 mode 依然是 real）
    return { mode: 'real', action_mode: 'simulate' };
  }

  function syncGlobals() {
    var o = opts();
    window.WFED_MODE = o.mode;                       // wfrun.js 已读
    // 注意按「档位」判断，不能按 o.mode —— sim 档的后端 mode 也是 real
    // （真调度器 + 仿真驱动）。sim 档显式声明 action_mode=simulate
    // （显式优于隐式）；allow_real 只在真机档出现。
    window.WFED_REAL_OPTS = (mode === 'real')
      ? { action_mode: 'real', allow_real: true }
      : { action_mode: 'simulate' };
  }

  // ---------------------------------------------------------------- UI
  function segHtml(host) {
    var h = '<div class="rm-seg" id="runmode-seg" role="group" aria-label="运行档位">';
    for (var i = 0; i < MODES.length; i++) {
      var m = MODES[i];
      h += '<button type="button" class="rm-btn" data-m="' + m.key + '" title="' + m.tip + '">' +
           m.icon + ' ' + m.label + '</button>';
    }
    h += '</div>';
    return h;
  }

  function mount(hostSel, beforeSel) {
    var host = document.querySelector(hostSel);
    if (!host || document.getElementById('runmode-seg')) return null;
    var wrap = document.createElement('span');
    wrap.className = 'rm-wrap';
    wrap.innerHTML = segHtml();
    var before = beforeSel ? host.querySelector(beforeSel) : null;
    if (before) host.insertBefore(wrap, before);
    else host.appendChild(wrap);
    var seg = wrap.querySelector('.rm-seg');
    seg.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.rm-btn') : null;
      if (!b) return;
      setMode(b.getAttribute('data-m'), true);
    });
    return wrap;
  }

  function paint() {
    var seg = document.getElementById('runmode-seg');
    if (!seg) return;
    var btns = seg.querySelectorAll('.rm-btn');
    for (var i = 0; i < btns.length; i++) {
      var k = btns[i].getAttribute('data-m');
      btns[i].className = 'rm-btn' + (k === mode ? ' on' + (k === 'real' ? ' danger' : '') : '');
    }
    // 真机档红色常驻指示条
    var bar = document.getElementById('runmode-realbar');
    if (bar) bar.style.display = (mode === 'real') ? '' : 'none';
    // 按钮文案随档位变化（编辑器的「试运行」）
    var btnRun = document.getElementById('btn-dryrun');
    if (btnRun) {
      btnRun.textContent = (mode === 'real') ? '▶ 真机运行' : '▶ 试运行（仿真）';
    }
  }

  // ---------------------------------------------------------------- 真机确认弹层（不可跳过）
  function confirmReal(cb) {
    // 已确认过（本页内存态）→ 直接放行
    if (confirmReal._ok) { cb(true); return; }
    var ov = document.createElement('div');
    ov.id = 'runmode-confirm';
    ov.innerHTML =
      '<div class="rm-cf-card">' +
      '  <div class="rm-cf-ico">⚠️</div>' +
      '  <div class="rm-cf-t">即将切到「真机调试」档</div>' +
      '  <div class="rm-cf-body">后续 <b>▶ 真机运行</b> 会通过 OPC UA / DMTP 驱动 <b>510 现场 PLC 与 9320 移液工作站</b>，机械臂、烘箱、离心机等将真实动作。</div>' +
      '  <ul class="rm-cf-list">' +
      '    <li>确认现场无人处于设备行程范围内</li>' +
      '    <li>确认耗材 / 样品已正确放置</li>' +
      '    <li>授权仅保存在本页内存，刷新页面即失效</li>' +
      '  </ul>' +
      '  <div class="rm-cf-btns">' +
      '    <button type="button" class="rm-cf-cancel">取消</button>' +
      '    <button type="button" class="rm-cf-go">我已确认现场安全，切到真机档</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('.rm-cf-cancel').addEventListener('click', function () {
      ov.remove(); cb(false);
    });
    ov.querySelector('.rm-cf-go').addEventListener('click', function () {
      confirmReal._ok = true;                  // 本页内存授权
      ov.remove(); cb(true);
      bannerReal();                            // 红色常驻指示条
    });
  }

  function bannerReal() {
    var bar = document.getElementById('runmode-realbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'runmode-realbar';
      bar.innerHTML = '🔴 真机调试中 —— 运行将驱动 510 现场硬件（点击返回仿真档）';
      bar.addEventListener('click', function () { setMode('sim', false); });
      document.body.appendChild(bar);
    }
    bar.style.display = '';
  }

  function setMode(next, interactive) {
    // 只认这两档；已删除的档（dry）一律忽略，不留暗门
    if (next !== 'sim' && next !== 'real') { paint(); return; }
    if (next === mode) { paint(); return; }
    if (next === 'real') {
      confirmReal(function (yes) {
        if (!yes) { paint(); return; }
        mode = 'real'; syncGlobals(); paint();
      });
      return;
    }
    mode = next; syncGlobals(); paint();
  }

  // ---------------------------------------------------------------- 初值回读
  function boot() {
    syncGlobals();
    // 编辑器顶栏：挂在「试运行」按钮前
    mount('.wf-btns', '#btn-dryrun');
    // 总览顶栏（shell.js 注入的 header .ctrl）：挂在「▶ 运行」按钮前
    mount('header .ctrl', '#btn-play');
    paint();
    fetch('/api/gn-adapter/status').then(function (r) { return r.json(); })
      .then(function (j) {
        var am = j && j.config && j.config.action_mode;
        var ar = j && j.config && j.config.allow_real;
        serverActionMode = am || null;
        // 服务器已是真机环境（GN_ACTION_MODE=real + GN_ALLOW_REAL=1）→
        // 前端如实亮真机档；否则一律落在安全的仿真档
        if (am === 'real' && ar === true) { mode = 'real'; confirmReal._ok = true; }
        else { mode = 'sim'; }
        syncGlobals(); paint();
      }).catch(function () { /* 后端没起也不拦页面 */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__RUNMODE = {
    version: '20261016.1',
    modes: function () { return MODES.map(function (m) { return m.key; }); },
    get: function () { return mode; },
    set: setMode,
    opts: opts,
    authorized: function () { return !!confirmReal._ok; },
    serverMode: function () { return serverActionMode; }
  };
})();
