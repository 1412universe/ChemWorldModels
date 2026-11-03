/* ============================================================================
 * wf_twin_float.js — 工作流运行期「510 仿真空间」
 * 嵌入与总览-510 相同的 World3D（真实设备模型），非方块示意。
 * ========================================================================== */
(function () {
  'use strict';

  var ROOT_ID = 'wf-twin-float';
  var POS_KEY = 'cwm_wf_twin_pos';

  // 与 index.html / app.js 一致的 510 GN 设备（含布局坐标与 type，供 World3D builder）
  var TWIN_DEVICES = [
    { key: 'system', name: '系统总控', x: 0.015, y: 0.04, w: 0.1365, h: 0.1394, color: '#0f766e', type: 'system', zone: 'ctrl' },
    { key: 'stack', name: '旋转堆栈·耗材仓', x: 0.205, y: 0.04, w: 0.1365, h: 0.1394, color: '#64748b', type: 'stack', zone: 'ctrl' },
    { key: 'liquid', name: '9320 液体处理模块', x: 0.395, y: 0.04, w: 0.1365, h: 0.1394, color: '#38bdf8', type: 'liquid', zone: 'syn' },
    { key: 'robot', name: '六轴机械臂', x: 0.585, y: 0.04, w: 0.1365, h: 0.1394, color: '#a855f7', type: 'robot', zone: 'exec' },
    { key: 'solid', name: '粉末加样仪', x: 0.775, y: 0.04, w: 0.1365, h: 0.1394, color: '#3b82f6', type: 'balance', zone: 'syn' },
    { key: 'tube', name: '离心管液体处理系统', x: 0.015, y: 0.27, w: 0.1365, h: 0.1394, color: '#06b6d4', type: 'tube', zone: 'syn' },
    { key: 'quick', name: '快速载具更换模块', x: 0.205, y: 0.27, w: 0.1365, h: 0.1394, color: '#f97316', type: 'quick', zone: 'sep' },
    { key: 'centrifuge', name: '自动定位离心机', x: 0.395, y: 0.27, w: 0.1365, h: 0.1394, color: '#14b8a6', type: 'centri', zone: 'sep' },
    { key: 'lock', name: '锁紧机构', x: 0.585, y: 0.27, w: 0.1365, h: 0.1394, color: '#dc2626', type: 'lock', zone: 'sep' },
    { key: 'oven', name: '常规烘箱', x: 0.775, y: 0.27, w: 0.1365, h: 0.1394, color: '#d97706', type: 'furnace', zone: 'dry' },
    { key: 'vacuum', name: '真空烘箱', x: 0.015, y: 0.50, w: 0.1365, h: 0.1394, color: '#7c3aed', type: 'voven', zone: 'dry' }
  ];

  var ALIAS = {
    gn_system: 'system',
    gn_rotary_stack: 'stack', gn_stack: 'stack',
    gn_liquid: 'liquid', PRCXI: 'liquid',
    gn_solid_weighing: 'solid', gn_solid: 'solid',
    gn_centrifuge_tube_liquid_handling: 'tube', gn_tube: 'tube',
    gn_quick_carrier_exchange: 'quick', gn_quick: 'quick',
    gn_centrifuge: 'centrifuge',
    gn_locking_mechanism: 'lock', gn_lock: 'lock',
    gn_standard_oven: 'oven', gn_oven: 'oven',
    gn_vacuum_oven: 'vacuum', gn_vacuum: 'vacuum',
    gn_robotic_arm: 'robot', gn_robot: 'robot',
    system: 'system', stack: 'stack', liquid: 'liquid', solid: 'solid',
    tube: 'tube', quick: 'quick', centrifuge: 'centrifuge', lock: 'lock',
    oven: 'oven', vacuum: 'vacuum', robot: 'robot'
  };

  var el = null;
  var stageEl = null;
  var statusEl = null;
  var tipEl = null;
  var visible = false;
  var expanded = false;
  var dragging = false;
  var dragOff = { x: 0, y: 0 };
  var world = null;
  var worldReady = false;
  var bootPromise = null;
  var activeKey = null;
  var lastByKey = {};
  var glowMats = {};
  var fakeChar = { nx: 0.5, ny: 0.3, x: 0, y: 0, hold: false };

  function resolveKey(deviceName) {
    if (!deviceName) return null;
    var d = String(deviceName);
    if (ALIAS[d]) return ALIAS[d];
    if (d.indexOf('stack') >= 0) return 'stack';
    if (d.indexOf('robot') >= 0) return 'robot';
    if (d.indexOf('solid') >= 0) return 'solid';
    if (d.indexOf('tube') >= 0) return 'tube';
    if (d.indexOf('quick') >= 0) return 'quick';
    if (d.indexOf('centrifuge') >= 0 && d.indexOf('tube') < 0) return 'centrifuge';
    if (d.indexOf('lock') >= 0) return 'lock';
    if (d.indexOf('vacuum') >= 0) return 'vacuum';
    if (d.indexOf('oven') >= 0) return 'oven';
    if (d.indexOf('liquid') >= 0 || d === 'PRCXI') return 'liquid';
    if (d.indexOf('system') >= 0) return 'system';
    return null;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var exist = document.querySelector('script[src="' + src + '"]');
      if (exist) {
        if (src.indexOf('three.min') >= 0 && window.THREE) return resolve();
        if (src.indexOf('OrbitControls') >= 0 && window.THREE && THREE.OrbitControls) return resolve();
        if (src.indexOf('CSS2DRenderer') >= 0 && window.THREE && THREE.CSS2DRenderer) return resolve();
        if (src.indexOf('world3d') >= 0 && window.World3D) return resolve();
        exist.addEventListener('load', function () { resolve(); });
        exist.addEventListener('error', function () { reject(new Error('load ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureLibs() {
    if (bootPromise) return bootPromise;
    bootPromise = (async function () {
      if (!window.THREE) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      }
      if (!THREE.OrbitControls) {
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
      }
      if (!THREE.CSS2DRenderer) {
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/renderers/CSS2DRenderer.js');
      }
      if (!window.World3D) {
        await loadScript('assets/world3d.js?v=20261102c');
      }
    })();
    return bootPromise;
  }

  function ensureDom() {
    if (el) return el;
    el = document.createElement('div');
    el.id = ROOT_ID;
    el.className = 'wf-twin';
    el.innerHTML =
      '<div class="wft-head" data-drag="1">' +
      '  <span class="wft-title">510 仿真空间</span>' +
      '  <span class="wft-status" id="wft-status">待机</span>' +
      '  <button type="button" class="wft-iconbtn" id="wft-shrink" title="缩小" hidden>↘</button>' +
      '  <button type="button" class="wft-close" title="隐藏浮窗" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="wft-stage" id="wft-stage">' +
      '  <div class="wft-lab lab-3d-container" id="wft-lab"></div>' +
      '  <div class="wft-boot" id="wft-boot">正在加载 510 三维场景…</div>' +
      '</div>' +
      '<button type="button" class="wft-enlarge" id="wft-enlarge" title="放大仿真空间">' +
      '  <span class="wft-enlarge-ico">⛶</span><span>放大仿真空间</span>' +
      '</button>' +
      '<div class="wft-tip" id="wft-tip">试运行时设备会绿/红闪动 · 同总览-510 模型</div>';

    document.body.appendChild(el);
    stageEl = el.querySelector('#wft-stage');
    statusEl = el.querySelector('#wft-status');
    tipEl = el.querySelector('#wft-tip');

    el.querySelector('.wft-close').addEventListener('click', function (e) {
      e.stopPropagation();
      hide();
    });
    el.querySelector('#wft-enlarge').addEventListener('click', function (e) {
      e.stopPropagation();
      setExpanded(true);
    });
    el.querySelector('#wft-shrink').addEventListener('click', function (e) {
      e.stopPropagation();
      setExpanded(false);
    });

    var head = el.querySelector('.wft-head');
    head.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      if (ev.target.closest('button')) return;
      if (expanded) return;
      dragging = true;
      el.classList.add('dragging');
      var r = el.getBoundingClientRect();
      dragOff.x = ev.clientX - r.left;
      dragOff.y = ev.clientY - r.top;
      try { head.setPointerCapture(ev.pointerId); } catch (e) { }
      ev.preventDefault();
    });
    head.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      place(ev.clientX - dragOff.x, ev.clientY - dragOff.y);
    });
    head.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      persistPos();
    });
    head.addEventListener('pointercancel', function () {
      dragging = false;
      el.classList.remove('dragging');
    });

    window.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && expanded) setExpanded(false);
    });

    restorePos();
    return el;
  }

  function place(left, top) {
    var w = el.offsetWidth || 360;
    var h = el.offsetHeight || 280;
    var maxL = Math.max(8, window.innerWidth - w - 8);
    var maxT = Math.max(8, window.innerHeight - h - 8);
    left = Math.min(maxL, Math.max(8, left));
    top = Math.min(maxT, Math.max(8, top));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  function persistPos() {
    if (expanded) return;
    try {
      var r = el.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
    } catch (e) { }
  }

  function restorePos() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && isFinite(p.left) && isFinite(p.top)) place(p.left, p.top);
    } catch (e) { }
  }

  function setExpanded(on) {
    ensureDom();
    expanded = !!on;
    el.classList.toggle('expanded', expanded);
    var shrink = el.querySelector('#wft-shrink');
    var enlarge = el.querySelector('#wft-enlarge');
    if (shrink) shrink.hidden = !expanded;
    if (enlarge) enlarge.style.display = expanded ? 'none' : '';
    if (!expanded) restorePos();
    setTimeout(function () {
      if (world && world._onResize) world._onResize(el.querySelector('#wft-lab'));
    }, 240);
  }

  function show() {
    ensureDom();
    el.classList.add('on');
    visible = true;
    // 等浮窗完成布局再量尺寸初始化 WebGL，避免 0×0 canvas
    requestAnimationFrame(function () {
      requestAnimationFrame(bootWorld);
    });
  }

  function hide() {
    if (!el) return;
    setExpanded(false);
    el.classList.remove('on');
    visible = false;
  }

  function bootWorld() {
    ensureDom();
    if (worldReady || world) return;
    var boot = el.querySelector('#wft-boot');
    var lab = el.querySelector('#wft-lab');
    ensureLibs().then(function () {
      if (world) return;
      if (!window.World3D || !window.THREE) {
        if (boot) boot.textContent = '三维引擎加载失败';
        return;
      }
      // 保证 World3D 走 GN 产线布局（非 photo 大画布）
      // 不改写全局 PAGE_CONFIG，仅依赖 theme !== 'photo'
      world = new window.World3D();
      world.init(lab, TWIN_DEVICES.map(function (d) { return Object.assign({}, d); }), { fullLab: true });
      world._selfAnimate = true;
      // 去掉机器人与「Bot-M 巡航中」标签（CSS2D 也会跟着删）
      try {
        if (world.robotLabel && world.robotLabel.element) {
          world.robotLabel.element.style.display = 'none';
          world.robotLabel.element.remove();
        }
        if (world.robotGroup) {
          if (world.scene) world.scene.remove(world.robotGroup);
          world.robotGroup.visible = false;
          world.robotGroup = null;
        }
        world.robotLabel = null;
        // 清掉可能残留在 DOM 里的巡航标签
        Array.prototype.forEach.call(lab.querySelectorAll('.robot-label-3d'), function (n) { n.remove(); });
      } catch (e) { }
      worldReady = true;
      if (boot) boot.style.display = 'none';
      TWIN_DEVICES.forEach(function (d) {
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'idle');
      });
      setTimeout(function () {
        if (world && world._onResize) world._onResize(lab);
        if (world && world.resetView) world.resetView();
      }, 60);
      applyVisualStates(lastByKey);
    }).catch(function (err) {
      console.error('[wf-twin]', err);
      if (boot) boot.textContent = '三维场景加载失败，请检查网络/CDN';
    });
  }

  function nodeIndex() {
    var F = window.__WFED;
    if (!F || !F.state || !F.state.wf || !F.state.wf.data) return {};
    var m = {};
    var ns = F.state.wf.data.nodes || [];
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i];
      var d = n._display || {};
      m[n.uuid] = {
        label: d.actionLabel || n.footer || n.name || n.device_name || n.uuid.slice(0, 6),
        device: n.device_name || ''
      };
    }
    return m;
  }

  function rollupByKey(snap) {
    var idx = nodeIndex();
    var st = (snap && snap.states) || {};
    var by = {};
    TWIN_DEVICES.forEach(function (d) {
      by[d.key] = { state: 'idle', labels: [] };
    });
    var rankOf = { failed: 6, running: 5, paused: 4, ready: 3, success: 2, pending: 1, skipped: 0, canceled: 0 };
    Object.keys(st).forEach(function (u) {
      var meta = idx[u] || {};
      var key = resolveKey(meta.device);
      if (!key || !by[key]) return;
      var s = st[u];
      var r = rankOf[s] || 0;
      var cur = rankOf[by[key].state] || 0;
      if (r > cur) by[key].state = s;
      if (meta.label) by[key].labels.push(meta.label + ' · ' + s);
    });
    return by;
  }

  function ensureGlow(key, hex) {
    if (!world || !world.deviceGroups || !window.THREE) return null;
    var g = world.deviceGroups[key];
    if (!g) return null;
    if (!g.userData._twinGlow) {
      var mat = new THREE.MeshBasicMaterial({
        color: hex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
      });
      var ring = new THREE.Mesh(new THREE.RingGeometry(22, 34, 40), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 2.2;
      g.add(ring);
      var disc = new THREE.Mesh(
        new THREE.CircleGeometry(20, 32),
        new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 2.0;
      g.add(disc);
      g.userData._twinGlow = { ring: ring, disc: disc, mat: mat, discMat: disc.material };
    }
    g.userData._twinGlow.mat.color.setHex(hex);
    g.userData._twinGlow.discMat.color.setHex(hex);
    return g.userData._twinGlow;
  }

  function applyVisualStates(by) {
    lastByKey = by || {};
    if (!worldReady || !world) return;
    var firstRun = null;
    TWIN_DEVICES.forEach(function (d) {
      var info = by[d.key] || { state: 'idle' };
      var st = info.state;
      var glow = ensureGlow(d.key, 0x94a3b8);
      if (!glow) return;

      if (st === 'running' || st === 'paused') {
        glow.ring.visible = true; glow.disc.visible = true;
        glow.mat.color.setHex(0x10b981);
        glow.discMat.color.setHex(0x34d399);
        glow.mat.opacity = 0.75;
        glow.ring.userData.blink = true;
        if (!firstRun) firstRun = d.key;
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'busy');
        styleLabel(d.key, 'run');
      } else if (st === 'failed') {
        glow.ring.visible = true; glow.disc.visible = true;
        glow.mat.color.setHex(0xef4444);
        glow.discMat.color.setHex(0xf87171);
        glow.mat.opacity = 0.8;
        glow.ring.userData.blink = true;
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'idle');
        styleLabel(d.key, 'fail');
      } else if (st === 'success') {
        glow.ring.visible = true; glow.disc.visible = true;
        glow.mat.color.setHex(0x10b981);
        glow.discMat.color.setHex(0x6ee7b7);
        glow.mat.opacity = 0.35;
        glow.ring.userData.blink = false;
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'idle');
        styleLabel(d.key, 'ok');
      } else if (st === 'ready') {
        glow.ring.visible = true; glow.disc.visible = true;
        glow.mat.color.setHex(0x38bdf8);
        glow.discMat.color.setHex(0x7dd3fc);
        glow.mat.opacity = 0.3;
        glow.ring.userData.blink = false;
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'idle');
        styleLabel(d.key, '');
      } else {
        glow.ring.visible = false; glow.disc.visible = false;
        glow.ring.userData.blink = false;
        if (world.setDeviceStatus) world.setDeviceStatus(d.key, 'idle');
        styleLabel(d.key, '');
      }
    });

    var prev = activeKey;
    activeKey = firstRun;
    // 仅镜头轻对焦到运行设备；不再驱动机器人巡航
    if (activeKey && activeKey !== prev && world.focusDevice) {
      try { world.focusDevice(activeKey); } catch (e) { }
    }
  }

  function styleLabel(key, mode) {
    if (!world || !world.deviceLabels || !world.deviceLabels[key]) return;
    var node = world.deviceLabels[key].element;
    if (!node) return;
    node.classList.remove('twin-run', 'twin-fail', 'twin-ok');
    if (mode === 'run') node.classList.add('twin-run');
    if (mode === 'fail') node.classList.add('twin-fail');
    if (mode === 'ok') node.classList.add('twin-ok');
    var dot = node.querySelector('.ldot3d');
    if (dot) {
      dot.classList.remove('busy', 'fail', 'ok');
      if (mode === 'run') dot.classList.add('busy');
      if (mode === 'fail') dot.classList.add('fail');
      if (mode === 'ok') dot.classList.add('ok');
    }
  }

  // 脉冲光环（渲染由 World3D._selfAnimate 负责；无机器人巡航）
  function pulseGlows() {
    if (!worldReady || !world || !visible) return;
    var t = (world.clock && world.clock.getElapsedTime) ? world.clock.getElapsedTime() : 0;
    Object.keys(world.deviceGroups || {}).forEach(function (k) {
      var g = world.deviceGroups[k];
      var glow = g && g.userData && g.userData._twinGlow;
      if (!glow || !glow.ring.visible || !glow.ring.userData.blink) return;
      var a = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t * 6));
      glow.mat.opacity = a;
      var s = 1 + 0.12 * Math.sin(t * 6);
      glow.ring.scale.set(s, s, s);
      glow.disc.scale.set(s, s, s);
    });
  }
  setInterval(pulseGlows, 50);

  function render(snap) {
    ensureDom();
    if (!visible) show();
    else bootWorld();
    var by = rollupByKey(snap);
    applyVisualStates(by);

    var c = ((snap && snap.summary) || {}).counts || {};
    var finished = !!(snap && snap.finished);
    var paused = !!(snap && snap.paused);
    var lit = 0;
    Object.keys(by).forEach(function (k) {
      if (by[k].state === 'running' || by[k].state === 'failed' || by[k].state === 'success') lit++;
    });

    if (statusEl) {
      if (finished) statusEl.textContent = '已结束';
      else if (paused) statusEl.textContent = '已暂停';
      else statusEl.textContent = '运行中 · ' + ((snap && snap.elapsed) || 0).toFixed(1) + 's';
      statusEl.className = 'wft-status' + (finished ? ' done' : paused ? ' pause' : ' live');
    }
    if (tipEl) {
      tipEl.textContent = '成功 ' + (c.success || 0) +
        ' · 执行 ' + (c.running || 0) +
        ' · 失败 ' + (c.failed || 0) +
        ' · 点亮 ' + lit + '/11';
    }
  }

  function onStart() {
    ensureDom();
    show();
    lastByKey = {};
    applyVisualStates(rollupByKey({ states: {} }));
    if (statusEl) {
      statusEl.textContent = '启动中…';
      statusEl.className = 'wft-status live';
    }
    if (tipEl) tipEl.textContent = '正在连接运行状态…';
  }

  function onDone(snap) {
    if (snap) render(snap);
    if (statusEl) {
      statusEl.textContent = '已结束';
      statusEl.className = 'wft-status done';
    }
  }

  window.__WF_TWIN = {
    show: show,
    hide: hide,
    update: render,
    onStart: onStart,
    onDone: onDone,
    expand: function () { setExpanded(true); },
    shrink: function () { setExpanded(false); },
    el: function () { return el; },
    world: function () { return world; }
  };

  function bindToolbar() {
    var btn = document.getElementById('btn-twin');
    if (!btn || btn.dataset.twinBound) return;
    btn.dataset.twinBound = '1';
    btn.addEventListener('click', function () {
      show();
    });
  }

  function boot() {
    ensureDom();
    bindToolbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
