/* ============================================================================
 * wfrun.js — 工作流「试运行」前端可视化（配合 app/routes.py + app/workflow_runtime.py）
 *
 * 做什么：
 *   1. 把画布上的工作流 POST 给 /api/workflow-run，拿到 run_id
 *   2. 订阅 /api/workflow-run/{id}/stream（SSE），实时把每个节点的调度状态
 *      刷到画布节点卡上（待执行 / 就绪等设备 / 执行中 / 成功 / 失败 / 取消）
 *   3. 在画布底部抽屉里画「设备泳道甘特」——一眼看出哪些步骤真正同时在跑、
 *      哪些因为共用同一台设备被迫排队（同设备串行、异设备并行）
 *   4. 画并行度曲线，给出峰值并行度 / 墙钟 / 节点耗时总和 / 加速比
 *
 * 状态词汇与后端 workflow_runtime.py 完全一致：
 *   pending / ready / running / success / failed / skipped / canceled
 *
 * 依赖：window.__WFED（app_workflow.js 暴露）
 * ========================================================================== */
(function () {
  'use strict';

  if (!window.__WFED) {
    console.warn('[wfrun] __WFED 未就绪，试运行功能不可用');
    return;
  }
  var F = window.__WFED;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------------------------------------------------------------- 词表
  var ST_LABEL = {
    pending: '待执行', ready: '就绪·抢设备', running: '执行中', paused: '已暂停',
    success: '成功', failed: '失败', skipped: '已跳过', canceled: '已取消'
  };
  var ST_COLOR = {
    pending: '#cbd5e1', ready: '#ca8a04', running: '#2563eb', paused: '#d97706',
    success: '#16a34a', failed: '#dc2626', skipped: '#d4d4d8', canceled: '#a1a1aa'
  };
  var ST_ICON = {
    pending: '○', ready: '◔', running: '▶', paused: '⏸', success: '✔', failed: '✖',
    skipped: '⤿', canceled: '⏹'
  };
  var DEV_PALETTE = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#059669'];

  var devColorCache = {};
  function devColor(dev) {
    dev = dev || '—';
    if (devColorCache[dev]) return devColorCache[dev];
    var h = 0, i;
    for (i = 0; i < dev.length; i++) h = (h * 31 + dev.charCodeAt(i)) & 0x7fffffff;
    return (devColorCache[dev] = DEV_PALETTE[h % DEV_PALETTE.length]);
  }

  // ---------------------------------------------------------------- DOM
  var drawer = $('wfed-run');
  var lanesEl = $('run-lanes');
  var evEl = $('run-events');
  var legendEl = $('run-legend');
  var subEl = $('run-sub');
  var titleEl = $('run-title');
  var btnRun = $('btn-dryrun');
  var btnStop = $('btn-stoprun');
  var btnPause = $('btn-pauserun');
  var runctl = $('wfed-runctl');
  if (!drawer || !lanesEl) { console.warn('[wfrun] 运行抽屉 DOM 缺失'); return; }

  // ---------------------------------------------------------------- 运行态
  var run = null;      // 当前运行 { run_id, es, snap, tmax, timer }
  var lastSnap = null; // 供 lane 重绘（折叠/展开、resize）

  // 节点索引：uuid -> {label, device}
  function nodeIndex() {
    var m = {};
    var ns = (F.state.wf.data.nodes) || [];
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i];
      var d = n._display || {};
      m[n.uuid] = {
        label: d.actionLabel || n.footer || n.name || n.device_name || n.uuid.slice(0, 6),
        device: n.device_name || '未指定设备',
        cmd: d.cmd
      };
    }
    return m;
  }

  // ---------------------------------------------------------------- 控件注入
  var speedSel = null;
  function ensureControls() {
    if (speedSel) return;
    var wrap = drawer.querySelector('.rh-btns');
    if (!wrap) return;
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto';
    bar.innerHTML =
      '<label style="font-size:11px;color:#64748b">加速</label>' +
      '<select id="run-speed" style="padding:3px 6px;font-size:11.5px;border:1px solid #d7dde8;' +
      'border-radius:7px;background:#fff;color:#334155;cursor:pointer">' +
      '<option value="1">1×</option><option value="10">10×</option>' +
      '<option value="60" selected>60×</option><option value="240">240×</option>' +
      '<option value="1200">1200×</option></select>' +
      '<button id="run-preflight" title="只做服务端预检：环检测 / 资源锁计划 / 耗时估算，不下发任务">🧪 预检</button>' +
      '<button id="run-restart" title="用当前画布内容重跑一次" style="display:none">↻ 重跑</button>';
    wrap.parentNode.insertBefore(bar, wrap);
    speedSel = $('run-speed');
    $('run-preflight').addEventListener('click', preflight);
    $('run-restart').addEventListener('click', function () { startRun(); });
  }
  function speed() {
    ensureControls();
    return speedSel ? parseFloat(speedSel.value) || 60 : 60;
  }

  // ---------------------------------------------------------------- 抽屉
  // 抽屉从底部升起会盖住图例与缩放条，所以把抽屉高度写进 --runh，
  // 让这两块浮层自动上移让位（而不是被压住或直接隐藏）。
  function syncDrawerHeight() {
    document.body.style.setProperty('--runh', (drawer.classList.contains('open') ? drawer.offsetHeight : 0) + 'px');
  }
  function openDrawer() { drawer.classList.add('open'); document.body.classList.add('run-open'); syncDrawerHeight(); }
  function closeDrawer() { drawer.classList.remove('open'); document.body.classList.remove('run-open'); syncDrawerHeight(); }
  $('run-close').addEventListener('click', closeDrawer);

  // ---------------------------------------------------------------- 预检
  function preflight() {
    var wf = F.getWorkflow();
    if (!wf || !wf.data || !wf.data.nodes.length) { toast('画布为空，先放几个节点'); return; }
    openDrawer();
    setSub('预检中…');
    fetch('/api/workflow-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: wf })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) {
        setSub('预检失败');
        lanesEl.innerHTML = '<div class="props-note err" style="margin:8px 0">预检未通过：' +
          esc(j.error || '未知错误') + (j.cycle && j.cycle.length
            ? '<ul><li>环路：' + esc(j.cycle.join(' → ')) + '</li></ul>' : '') + '</div>';
        legendEl.innerHTML = '';
        return;
      }
      renderPreflight(j);
    }).catch(function (e) {
      setSub('预检请求失败');
      lanesEl.innerHTML = '<div class="props-note err">' + esc(e.message || e) + '</div>';
    });
  }

  function renderPreflight(j) {
    var idx = nodeIndex();
    var rows = (j.nodes || []);
    var html = '<div class="run-par"><div class="par-h"><b>服务端预检通过</b>' +
      '<span class="par-tip">' + rows.length + ' 个节点 · 未下发任何任务</span></div>' +
      '<div style="font-size:11px;color:#475569;line-height:1.9">' +
      '<div class="kv" style="display:flex;justify-content:space-between;border-bottom:1px dashed #f1f5f9;padding:2px 0">' +
      '<span>节点耗时总和</span><b>' + fmtDur(j.sum_duration) + '</b></div>' +
      '<div class="kv" style="display:flex;justify-content:space-between;border-bottom:1px dashed #f1f5f9;padding:2px 0">' +
      '<span>禁用（将跳过）</span><b>' + (j.skipped || 0) + '</b></div></div></div>';

    // 同设备串行时长：这是物理下限，值得直接告诉用户
    var sd = j.device_serial_duration || {};
    var keys = Object.keys(sd).filter(function (k) { return sd[k] > 0; })
      .sort(function (a, b) { return sd[b] - sd[a]; });
    if (keys.length) {
      var busiest = keys[0];
      var nSame = rows.filter(function (r) { return r.device === busiest; }).length;
      html += '<div class="run-par"><div class="par-h"><b>设备串行约束</b>' +
        '<span class="par-tip">同设备必须排队</span></div>' +
        '<div style="font-size:11px;color:#475569;line-height:1.9">';
      keys.slice(0, 6).forEach(function (k) {
        var n = rows.filter(function (r) { return r.device === k; }).length;
        html += '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #f1f5f9;padding:2px 0">' +
          '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' +
          devColor(k) + ';margin-right:5px"></span>' + esc(k) + ' <span style="color:#94a3b8">×' + n + '</span></span>' +
          '<b style="font-family:ui-monospace,Menlo,monospace">' + fmtDur(sd[k]) + '</b></div>';
      });
      html += '</div><div style="font-size:10.5px;color:#94a3b8;margin-top:5px">' +
        '最忙设备 ' + esc(busiest) + '（' + nSame + ' 个步骤串行）→ 它决定了整条流水线的最短工期。</div></div>';
    }

    // 预估最耗时节点
    var top = rows.slice().sort(function (a, b) { return b.est - a.est; }).slice(0, 6);
    if (top.length) {
      html += '<div class="run-par"><div class="par-h"><b>最耗时步骤 Top6</b></div>' +
        '<div style="font-size:11px;color:#475569;line-height:1.9">';
      top.forEach(function (t) {
        html += '<div style="display:flex;gap:6px;border-bottom:1px dashed #f1f5f9;padding:2px 0">' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(t.label || (idx[t.uuid] || {}).label || t.uuid.slice(0, 6)) + '</span>' +
          '<b style="font-family:ui-monospace,Menlo,monospace;flex:none">' + fmtDur(t.est) + '</b></div>';
      });
      html += '</div></div>';
    }

    lanesEl.innerHTML = html;
    legendEl.innerHTML = '<div class="kv"><span>状态</span><b>预检</b></div>' +
      '<div style="color:#94a3b8;font-size:10.5px;margin-top:6px">' +
      '预检只读取工作流结构，不接触硬件、不产生任何副作用。</div>';
    evEl.innerHTML = '';
    setSub('预检完成 · 未运行');
  }

  // ---------------------------------------------------------------- 启动
  function setSub(t) { if (subEl) subEl.textContent = t; }
  function setTitle(t) { if (titleEl) titleEl.textContent = t; }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:9999;' +
      'background:#1e293b;color:#fff;font-size:12.5px;padding:8px 16px;border-radius:9px;' +
      'box-shadow:0 8px 24px rgba(15,23,42,.28)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function startRun() {
    var wf = F.getWorkflow();
    if (!wf || !wf.data || !wf.data.nodes.length) { toast('画布为空，先放几个节点'); return; }
    if (run && run.es) { try { run.es.close(); } catch (e) { } }

    var mode = window.WFED_MODE || 'dry';
    var extra = (mode === 'real' && window.WFED_REAL_OPTS) ? window.WFED_REAL_OPTS : null;
    openDrawer();
    lanesEl.innerHTML = '<div style="padding:14px;color:#64748b;font-size:12px">正在提交…</div>';
    evEl.innerHTML = '';
    legendEl.innerHTML = '';
    setSub('提交中…');
    setTitle(mode === 'real'
      ? (extra && extra.action_mode === 'real'
          ? '真机运行（real · 驱动 510 硬件）'
          : '试运行（real · 仿真驱动镜像，零硬件风险）')
      : '试运行（dry-run · 不碰硬件）');
    stopRunUi(true);
    setHoldUi(true, false);
    if (btnRun) { btnRun.disabled = true; btnRun.classList.add('busy'); }

    // 先把所有节点刷成「待执行」，让状态图层立刻可见
    var idx = nodeIndex();
    var pendingMap = {};
    Object.keys(idx).forEach(function (u) { pendingMap[u] = { state: 'pending' }; });
    F.setRunStates(pendingMap, true);

    fetch('/api/workflow-run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(
        { workflow: wf, mode: mode, speed: speed() }, extra || {}))
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) {
        setSub('无法启动');
        lanesEl.innerHTML = '<div class="props-note err" style="margin:8px 0"><b>无法启动运行</b><br/>' +
          esc(j.error || '未知错误') + '</div>';
        stopRunUi(false);
        return;
      }
      run = { run_id: j.run_id, es: null, snap: null, tmax: 1, poll: null };
      setSub('已启动 · 调度器 ' + (j.dispatcher || '?') + ' · 等待事件…');
      subscribe(j.run_id);
    }).catch(function (e) {
      setSub('请求失败');
      lanesEl.innerHTML = '<div class="props-note err" style="margin:8px 0">' + esc(e.message || e) +
        '<br/>请确认后端 wm_backend 服务正在运行。</div>';
      stopRunUi(false);
    });
  }

  function stopRunUi(active) {
    if (btnStop) btnStop.style.display = active ? '' : 'none';
    if (btnRun) btnRun.style.display = active ? 'none' : '';
    if (!active) setHoldUi(false, false);
  }

  function setHoldUi(active, paused) {
    if (runctl) runctl.hidden = !active;
    if (!btnPause) return;
    btnPause.disabled = false;
    btnPause.textContent = paused ? '▶ 继续' : '■ 停止';
    btnPause.classList.toggle('go', !!paused);
    btnPause.title = paused
      ? '从当前停下的节点接着执行'
      : '立刻停在当前节点，再点继续从该节点接着执行';
  }

  // ---------------------------------------------------------------- 事件流
  function subscribe(rid) {
    var url = '/api/workflow-run/' + encodeURIComponent(rid) + '/stream';
    var es;
    try { es = new EventSource(url); }
    catch (e) { es = null; }
    if (!es) { pollFallback(rid); return; }
    run.es = es;

    es.addEventListener('hello', function (ev) {
      try {
        var j = JSON.parse(ev.data);
        setSub('运行中 · ' + (j.count || 0) + ' 个节点 · ' + (j.dispatcher || ''));
      } catch (e) { }
    });
    es.addEventListener('snapshot', function (ev) {
      var j; try { j = JSON.parse(ev.data); } catch (e) { return; }
      applySnapshot(j);
    });
    es.addEventListener('done', function (ev) {
      var j; try { j = JSON.parse(ev.data); } catch (e) { j = {}; }
      try { es.close(); } catch (e) { }
      if (run) { run.es = null; run.done = true; }
      stopRunUi(false);
      if (btnRun) { btnRun.disabled = false; btnRun.classList.remove('busy'); }
      var r = $('run-restart'); if (r) r.style.display = '';
      if (j.summary) {
        var c = j.summary.counts || {};
        setSub('运行结束 · 成功 ' + (c.success || 0) + ' · 失败 ' + (c.failed || 0) +
          ' · 峰值并行 ' + (j.summary.peak_parallelism || 0) +
          ' · 墙钟 ' + fmtDur(j.summary.wall_clock) +
          (j.summary.speedup ? ' · 加速比 ' + j.summary.speedup + '×' : ''));
      } else { setSub('运行结束'); }
    });
    es.onerror = function () {
      // EventSource 自动重连；若运行已结束或后端不可达则退化为轮询
      if (run && run.done) { try { es.close(); } catch (e) { } return; }
      setTimeout(function () {
        if (run && run.es === es && !run.done) { try { es.close(); } catch (e) { } pollFallback(rid); }
      }, 1200);
    };
  }

  function pollFallback(rid) {
    if (!run) return;
    var tick = function () {
      if (!run || run.done) return;
      fetch('/api/workflow-run/' + encodeURIComponent(rid))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) { run.done = true; return; }
          applySnapshot(j);
          if (j.finished) {
            run.done = true; stopRunUi(false);
            if (btnRun) { btnRun.disabled = false; }
            var r2 = $('run-restart'); if (r2) r2.style.display = '';
            return;
          }
          run.poll = setTimeout(tick, 400);
        }).catch(function () { run.poll = setTimeout(tick, 900); });
    };
    tick();
  }

  // ---------------------------------------------------------------- 快照
  function applySnapshot(snap) {
    if (!snap) return;
    lastSnap = snap;
    if (run) { run.snap = snap; run.tmax = Math.max(run.tmax || 1, snap.elapsed || 0); }

    // 1) 画布节点着色
    var map = {};
    var st = snap.states || {};
    var held = snap.held || {};
    Object.keys(st).forEach(function (u) {
      var shown = (snap.paused && st[u] === 'running') ? 'paused' : st[u];
      map[u] = { state: shown };
      if (st[u] === 'running' && (held[u] || []).length) map[u].locked = true;
    });
    F.setRunStates(map, true);

    // 2) 抽屉
    renderLanes(snap);
    renderLegend(snap);
    renderEvents(snap);

    var c = (snap.summary || {}).counts || {};
    if (snap.paused && !snap.finished) {
      var heldNames = pausedNodeNames(snap);
      setSub(heldNames
        ? '已暂停 · 停在「' + heldNames + '」· 点底部「继续」接着执行'
        : '已暂停 · 点底部「继续」从当前节点接着执行');
      setHoldUi(true, true);
    } else if (!snap.finished) {
      setSub('运行中 · ' + (snap.elapsed || 0).toFixed(1) + 's · ' +
        '成功 ' + (c.success || 0) + ' / 执行 ' + (c.running || 0) +
        ' / 等设备 ' + (c.ready || 0) + ' / 待执行 ' + (c.pending || 0) +
        (c.failed ? ' / 失败 ' + c.failed : '') +
        ((snap.summary || {}).peak_parallelism ? ' · 峰值并行 ' + snap.summary.peak_parallelism : ''));
      setHoldUi(true, false);
    }
    if (snap.finished) stopRunUi(false);
  }

  function pausedNodeNames(snap) {
    var idx = nodeIndex();
    var st = snap.states || {};
    var names = [];
    Object.keys(st).forEach(function (u) {
      if (st[u] !== 'running') return;
      names.push((idx[u] || {}).label || u.slice(0, 6));
    });
    if (!names.length) return '';
    if (names.length <= 2) return names.join('、');
    return names.slice(0, 2).join('、') + ' 等 ' + names.length + ' 个节点';
  }

  // ---------- 设备泳道甘特 ----------
  function renderLanes(snap) {
    var idx = nodeIndex();
    var timing = snap.timing || {};
    var states = snap.states || {};
    var tmax = Math.max(0.001, (run && run.tmax) || snap.elapsed || 1);

    // 按设备分组（保持节点出现顺序，便于对照画布）
    var order = [], byDev = {};
    var wfNodes = F.state.wf.data.nodes || [];
    for (var i = 0; i < wfNodes.length; i++) {
      var u = wfNodes[i].uuid;
      if (!(u in states)) continue;                 // 被禁用的节点不进泳道
      var dev = (idx[u] || {}).device || '未指定设备';
      if (!byDev[dev]) { byDev[dev] = []; order.push(dev); }
      byDev[dev].push(u);
    }
    if (!order.length) { lanesEl.innerHTML = ''; return; }

    // 时间刻度
    var html = '<div class="run-axis"><span>0s</span><span class="ax-bar"></span>' +
      '<span>' + fmtDur(tmax) + '</span></div>';
    html += '<div style="position:relative">';
    html += '<div class="run-nowline" style="left:0"></div>';

    order.forEach(function (dev) {
      var us = byDev[dev];
      var running = 0, done = 0;
      us.forEach(function (u) { if (states[u] === 'running') running++; if (states[u] === 'success') done++; });

      html += '<div class="run-lane">';
      html += '<div class="lan-h">' +
        '<span class="lan-dot" style="background:' + devColor(dev) + '"></span>' +
        '<span>' + esc(dev) + '</span>' +
        '<span style="color:#94a3b8">×' + us.length + '</span>' +
        '<span class="lan-busy">' + (running ? (snap.paused ? '⏸ ' + running + ' 个已暂停' : '⚙ ' + running + ' 台在跑') : done === us.length ? '✓ 全部完成' : '') + '</span>' +
        '</div>';
      html += '<div class="run-track">';
      us.forEach(function (u) {
        var t = timing[u] || {};
        var s = t.start;
        if (s == null) return;
        var e = (t.end != null) ? t.end : snap.elapsed;
        var left = Math.max(0, (s / tmax) * 100);
        var w = Math.max(0.6, ((e - s) / tmax) * 100);
        if (left + w > 100) w = Math.max(0.6, 100 - left);
        var lbl = (idx[u] || {}).label || u.slice(0, 6);
        var shown = (snap.paused && states[u] === 'running') ? 'paused' : (states[u] || 'pending');
        html += '<div class="blk st-' + shown + '" ' +
          'style="left:' + left.toFixed(2) + '%;width:' + w.toFixed(2) + '%" ' +
          'title="' + esc(lbl) + ' · ' + (ST_LABEL[shown] || shown) +
          ' · ' + fmtDur(s) + '→' + fmtDur(e) + '（' + fmtDur(e - s) + '）">' +
          esc(w > 6 ? lbl : '') + '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';

    // 并行度曲线
    html += '<div class="run-par" style="margin-top:10px">' +
      '<div class="par-h"><b>并行度</b><span style="color:#64748b">同时执行的节点数</span>' +
      '<span class="par-tip">峰值 ' + ((snap.summary || {}).peak_parallelism || 0) + '</span></div>' +
      '<canvas id="run-par-cv" width="620" height="52"></canvas></div>';

    lanesEl.innerHTML = html;

    // nowline 用百分比定位在泳道区（跑马灯式右移）
    var nl = lanesEl.querySelector('.run-nowline');
    if (nl) nl.style.left = Math.min(100, (snap.elapsed / tmax) * 100).toFixed(2) + '%';

    drawParallel(snap, tmax);
    syncDrawerHeight();
  }

  function drawParallel(snap, tmax) {
    var cv = $('run-par-cv');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    var timing = snap.timing || {}, states = snap.states || {};
    var spans = [];
    Object.keys(timing).forEach(function (u) {
      var t = timing[u];
      if (t.start == null) return;
      spans.push([t.start, (t.end != null ? t.end : snap.elapsed)]);
    });
    var N = 124, buckets = new Array(N), i;
    for (i = 0; i < N; i++) buckets[i] = 0;
    spans.forEach(function (sp) {
      var a = Math.floor((sp[0] / tmax) * N), b = Math.ceil((sp[1] / tmax) * N);
      for (i = Math.max(0, a); i < Math.min(N, Math.max(b, a + 1)); i++) buckets[i]++;
    });
    var pk = Math.max(1, Math.max.apply(null, buckets));
    var bw = W / N;
    for (i = 0; i < N; i++) {
      var h = (buckets[i] / pk) * (H - 6);
      ctx.fillStyle = buckets[i] > 1 ? '#0d9488' : '#94a3b8';
      ctx.fillRect(i * bw, H - h, Math.max(1, bw - 0.6), h);
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, H - 1, W, 1);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px ui-monospace,Menlo,monospace';
    ctx.fillText('峰值 ' + pk, 4, 10);
  }

  // ---------- 汇总 ----------
  function renderLegend(snap) {
    var s = snap.summary || {}, c = Object.assign({}, s.counts || {});
    if (snap.paused && c.running) { c.paused = c.running; c.running = 0; }
    var html = '';
    var order = ['success', 'running', 'paused', 'ready', 'pending', 'failed', 'skipped', 'canceled'];
    order.forEach(function (k) {
      if (!c[k]) return;
      html += '<div class="kv"><span>' + ST_ICON[k] + ' ' + ST_LABEL[k] + '</span><b>' + c[k] + '</b></div>';
    });
    html += '<div class="kv"><span>峰值并行度</span><b>' + (s.peak_parallelism || 0) + '</b></div>';
    html += '<div class="kv"><span>墙钟耗时</span><b>' + fmtDur(s.wall_clock) + '</b></div>';
    html += '<div class="kv"><span>节点耗时总和</span><b>' + fmtDur(s.sum_node_duration) + '</b></div>';
    html += '<div class="kv"><span>并行加速比</span><b>' +
      (s.speedup ? s.speedup + '×' : '—') + '</b></div>';
    html += '<div class="kv"><span>涉及设备</span><b>' + (s.devices || 0) + '</b></div>';
    html += '<div style="color:#94a3b8;font-size:10.5px;margin-top:6px">调度器 ' +
      esc(snap.dispatcher || '—') + (snap.window
        ? ' · 单节点时长压缩到 ' + snap.window.floor + '~' + snap.window.ceil + 's（加速 ' +
        (snap.speed || 1) + '×）' : '') + '</div>';
    legendEl.innerHTML = html;
  }

  // ---------- 事件流 ----------
  var evSeen = 0;
  function renderEvents(snap) {
    var idx = nodeIndex();
    var evs = snap.events || [];
    if (evs.length === evSeen && evSeen > 0 && evEl.dataset.rid === snap.run_id) return;
    evSeen = evs.length;
    evEl.dataset.rid = snap.run_id;
    var html = '';
    for (var i = Math.max(0, evs.length - 60); i < evs.length; i++) {
      var e = evs[i], txt = eventText(e, idx);
      if (!txt) continue;
      html += '<div class="ev"><span class="t">' + e.t.toFixed(2) + '</span><span>' + txt + '</span></div>';
    }
    evEl.innerHTML = html;
    evEl.scrollTop = evEl.scrollHeight;
  }

  function eventText(e, idx) {
    var nm = e.uuid ? ((idx[e.uuid] || {}).label || e.uuid.slice(0, 6)) : '';
    switch (e.kind) {
      case 'build':
        return '📦 构图：' + e.nodes + ' 个节点' + (e.skipped ? '，跳过 ' + e.skipped + ' 个禁用' : '');
      case 'start':
        return '🚀 开始执行 · 调度器 ' + esc(e.dispatcher || '') + ' · 加速 ' + (e.speed || 1) + '×';
      case 'node-start':
        return '▶ <b>' + esc(nm) + '</b> 开始' +
          (e.locks && e.locks.length ? ' <span style="color:#ca8a04">[占 ' + e.locks.length + ' 个资源锁]</span>' : '') +
          (e.est ? ' <span style="color:#94a3b8">预计 ' + fmtDur(e.est) + '</span>' : '');
      case 'node-done':
        return (e.ok ? '✔' : '✖') + ' <b>' + esc(nm) + '</b> ' + (e.ok ? '完成' : '失败') +
          (e.dur != null ? ' <span style="color:#94a3b8">' + fmtDur(e.dur) + '</span>' : '') +
          (!e.ok && e.info && e.info.error ? ' · ' + esc(e.info.error) : '') +
          (e.info && e.info.preflight_note ? ' · ' + esc(e.info.preflight_note) : '');
      case 'node-cancel':
        return '⏹ <b>' + esc(nm) + '</b> 因上游失败被取消';
      case 'paused':
        return '⏸ 已停止，停在当前节点' + (nm ? ' · <b>' + esc(nm) + '</b>' : '');
      case 'resumed':
        return '▶ 继续执行' + (nm ? ' · <b>' + esc(nm) + '</b>' : '');
      case 'canceled':
        return '⏹ 运行被取消';
      case 'finish':
        return '🏁 全部结束 · 峰值并行 ' + (e.peak_parallelism || 0) + ' · 墙钟 ' + fmtDur(e.wall_clock) +
          (e.speedup ? ' · 加速比 ' + e.speedup + '×' : '');
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------- 工具
  function fmtDur(sec) {
    if (sec == null || isNaN(sec)) return '—';
    sec = Number(sec);
    if (sec < 1) return sec.toFixed(2) + 's';
    if (sec < 60) return sec.toFixed(sec < 10 ? 2 : 1) + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm' + Math.round(sec % 60) + 's';
    return (sec / 3600).toFixed(2) + 'h';
  }

  // ---------------------------------------------------------------- 绑定
  if (btnRun) btnRun.addEventListener('click', startRun);
  if (btnPause) btnPause.addEventListener('click', function () {
    if (!run || !run.run_id || btnPause.disabled) return;
    var paused = !!(lastSnap && lastSnap.paused);
    btnPause.disabled = true;
    fetch('/api/workflow-run/' + encodeURIComponent(run.run_id) + (paused ? '/resume' : '/pause'),
      { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        btnPause.disabled = false;
        if (!j.ok) { toast((paused ? '继续' : '停止') + '失败：' + (j.error || '')); return; }
        if (lastSnap) lastSnap.paused = !paused;
        setHoldUi(true, !paused);
        setSub(paused ? '继续执行当前节点…' : '停止中…');
      }).catch(function () {
        btnPause.disabled = false;
        toast(paused ? '继续请求失败' : '停止请求失败');
      });
  });
  if (btnStop) btnStop.addEventListener('click', function () {
    if (!run || !run.run_id) return;
    setSub('取消中…');
    fetch('/api/workflow-run/' + encodeURIComponent(run.run_id) + '/cancel', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) toast('取消失败：' + (j.error || ''));
      }).catch(function () { toast('取消请求失败'); });
  });

  window.addEventListener('resize', function () {
    if (lastSnap && drawer.classList.contains('open')) {
      var cv = $('run-par-cv');
      if (cv && lanesEl.clientWidth) {
        cv.width = Math.max(240, Math.round(lanesEl.clientWidth - 20));
        drawParallel(lastSnap, Math.max(0.001, (run && run.tmax) || lastSnap.elapsed || 1));
      }
    }
  });

  // 对外暴露，便于自动化验证 / 控制台调试
  window.__WFRUN = {
    start: startRun, stop: function () { if (btnStop) btnStop.click(); },
    pause: function () { if (btnPause && !(lastSnap && lastSnap.paused)) btnPause.click(); },
    resume: function () { if (btnPause && lastSnap && lastSnap.paused) btnPause.click(); },
    preflight: preflight, snapshot: function () { return lastSnap; },
    get run() { return run; }
  };

  // 快捷键：Ctrl/Cmd+Enter 试运行
  window.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); startRun(); }
  });

  console.log('[wfrun] 试运行模块就绪 · 默认模式', window.WFED_MODE || 'dry');
})();
