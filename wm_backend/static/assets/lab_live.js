/* =========================================================================
   lab_live.js —— 总览-510 虚拟实时仿真订阅层（薄层，无框架，ES5 风格 IIFE）

   职责（只做三件事，绝不重写 app.js 的渲染逻辑）：
     1. EventSource 订阅 /api/gn-adapter/live/stream，把后端仿真模型的
        真实读数「就地覆写」进 DEVICES[].readings（键名对齐）；
     2. 读数到达时触发设备弹窗即时重绘（复用 app.js 的 renderReadings，
        不自己造渲染）；
     3. 订阅断线自动重连（指数退避，上限 15s）。

   数据流：后端 SimPlc 镜像 + DMTP 镜像 → live.snapshot() → SSE → 本层
           → DEVICES[].readings[].val → 既有渲染管道（弹窗 renderReadings）。
   「live 没给的读数保持前端静态值」—— 本层绝不虚构数据。

   对接约定（app.js 末尾的 window.__LIVE_BRIDGE）：
     DEVICES        —— 10+1 张设备卡的数组引用（含 readings）
     renderReadings —— 弹窗读数区重绘
     selectedKey()  —— 设备弹窗当前打开的卡 key（null=未开）
     running()      —— 前端 AI 演示循环是否运行中
   时序：app.js 是 type="module"（延迟执行），本脚本是普通 script 先跑，
   必须轮询等 __LIVE_BRIDGE 就绪。
   ========================================================================= */
(function () {
  'use strict';

  var BRIDGE = null;
  var backoffMs = 1000;
  var es = null;
  var lastTs = 0;          // 最近一帧快照时间戳（调试/自检用）
  var frames = 0;          // 累计收到的帧数
  var state = 'connecting'; // connecting | live | down

  // 等 app.js 的 __LIVE_BRIDGE 就绪（module 延迟执行，普通 script 先跑）
  function waitForBridge(cb, tries) {
    tries = tries || 0;
    if (window.__LIVE_BRIDGE && window.__LIVE_BRIDGE.DEVICES) { cb(); return; }
    if (tries > 200) return;                     // 20s 后放弃（页面无设备卡）
    setTimeout(function () { waitForBridge(cb, tries + 1); }, 100);
  }

  // 把一帧快照就地覆写进 DEVICES（键名对齐才写；液冷动态键追加到尾部）
  function applySnapshot(snap) {
    if (!BRIDGE || !snap || !snap.ok || !snap.cards) return;
    var cards = snap.cards;
    lastTs = snap.ts || 0;
    frames++;
    for (var i = 0; i < BRIDGE.DEVICES.length; i++) {
      var d = BRIDGE.DEVICES[i];
      var entry = cards[d.key];
      if (!entry) continue;
      var incoming = entry.readings || {};
      for (var j = 0; j < d.readings.length; j++) {
        var r = d.readings[j];
        if (Object.prototype.hasOwnProperty.call(incoming, r.k)) {
          var v = incoming[r.k];
          if (typeof v === 'number' && isFinite(v)) { r.val = v; r.live = true; }
        }
      }
      // 液冷读数键是动态的（9320-1/2、离心管-3..7），不在静态 readings 里 ——
      // 追加到卡片 readings 尾部（只追加一次）
      if (d.key === 'liquid' || d.key === 'tube') {
        for (var k in incoming) {
          if (Object.prototype.hasOwnProperty.call(incoming, k) &&
              k.indexOf('液冷') === 0) {
            var exists = d.readings.some(function (x) { return x.k === k; });
            if (!exists) {
              d.readings.push({ k: k, unit: '℃', min: 4, max: 28,
                                val: incoming[k], live: true, liveOnly: true });
            }
          }
        }
      }
    }
    // 设备弹窗开着时，即时刷新它的读数区（复用 app.js 的 renderReadings）
    try {
      var sel = BRIDGE.selectedKey();
      if (sel) {
        var dd = null;
        for (var q = 0; q < BRIDGE.DEVICES.length; q++) {
          if (BRIDGE.DEVICES[q].key === sel) { dd = BRIDGE.DEVICES[q]; break; }
        }
        if (dd) BRIDGE.renderReadings(dd);
      }
    } catch (e) { /* 渲染失败不影响订阅 */ }
  }

  // 顶栏 LIVE 角标（订阅状态可感知：绿点=流在推 / 灰点=断线重连中）
  function badgeEl() {
    var el = document.getElementById('live-badge');
    if (el) return el;
    var center = document.getElementById('center');
    if (!center) return null;
    el = document.createElement('div');
    el.id = 'live-badge';
    el.innerHTML = '<i class="dot"></i><span class="txt">LIVE</span>';
    center.appendChild(el);
    return el;
  }
  function setBadge(st) {
    state = st;
    var el = badgeEl();
    if (!el) return;
    el.className = st;
    el.title = st === 'live' ? ('虚拟实时仿真已连接 · ' + new Date(lastTs * 1000).toLocaleTimeString())
              : st === 'down' ? '实时流断线，自动重连中…' : '正在连接实时仿真…';
  }

  function connect() {
    if (!BRIDGE) return;
    try {
      es = new EventSource('/api/gn-adapter/live/stream?interval=1.5');
      es.addEventListener('live', function (ev) {
        backoffMs = 1000;                        // 成功后重置退避
        setBadge('live');
        try { applySnapshot(JSON.parse(ev.data)); } catch (e) { /* 单帧坏了不断流 */ }
      });
      es.onerror = function () {
        setBadge('down');
        try { es.close(); } catch (e) {}
        setTimeout(connect, backoffMs);
        backoffMs = Math.min(15000, backoffMs * 1.6);
      };
    } catch (e) {
      setTimeout(connect, 5000);
    }
  }

  waitForBridge(function () {
    BRIDGE = window.__LIVE_BRIDGE;
    setBadge('connecting');
    connect();
  });

  // 暴露最小接口（浏览器自检 / 调试用）
  window.__LAB_LIVE = {
    version: '20261014.2',
    state: function () { return state; },
    frames: function () { return frames; },
    lastTs: function () { return lastTs; },
    refresh: function () {
      fetch('/api/gn-adapter/live').then(function (r) { return r.json(); })
        .then(applySnapshot).catch(function () {});
    },
    cmd: function (card, action, param, cb) {
      fetch('/api/gn-adapter/live/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: card, action: action, param: param || {} })
      }).then(function (r) { return r.json(); })
        .then(function (j) { if (cb) cb(j); })
        .catch(function (e) { if (cb) cb({ ok: false, error: String(e) }); });
    }
  };
})();
