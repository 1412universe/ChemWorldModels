/* ============================================================================
 * wf_worldmodel.js — 「世界模型预演」面板（挂在总览-光催化闭环设计）
 * 历史锚点 + 条件响应（流量/氧浓/负载/光照）+ 微动力学 + 物理约束
 * ========================================================================== */
(function () {
  'use strict';

  var panel = null;
  var catalog = null;
  var CSS_ID = 'wf-wm-css';
  var POS_KEY = 'cwm_wf_wm_pos';
  var lastResult = null;
  var tourTimer = null;
  var tourAbort = false;
  var hudEl = null;
  var dragging = false;
  var dragOff = { x: 0, y: 0 };

  function $(id) { return document.getElementById(id); }

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      'button.wm-toolbar{background:linear-gradient(135deg,#0f766e,#0ea5e9);color:#fff;border:1px solid transparent;font-weight:700;border-radius:8px;padding:5px 10px;cursor:pointer;}',
      'button.wm-toolbar:hover{filter:brightness(1.06);}',
      '.wf-wm-panel{position:fixed;top:70px;right:18px;z-index:100050;width:min(460px,94vw);max-height:min(82vh,760px);display:none;flex-direction:column;background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.12);border-radius:14px;box-shadow:0 22px 60px rgba(15,23,42,.28);overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC",sans-serif;}',
      '.wf-wm-panel.on{display:flex;}',
      '.wf-wm-panel.dragging{opacity:.97;box-shadow:0 28px 70px rgba(15,23,42,.36);}',
      '.wm-head{position:relative;padding:12px 40px 10px 14px;background:linear-gradient(135deg,#0f766e,#134e4a 55%,#0ea5e9);color:#ecfeff;cursor:grab;touch-action:none;}',
      '.wf-wm-panel.dragging .wm-head{cursor:grabbing;}',
      '.wm-title{font-size:14px;font-weight:800;}',
      '.wm-sub{font-size:10.5px;opacity:.85;margin-top:2px;}',
      '.wm-x{position:absolute;right:8px;top:8px;width:26px;height:26px;border:0;border-radius:8px;background:rgba(255,255,255,.14);color:#fff;font-size:16px;cursor:pointer;}',
      '.wm-x:hover{background:rgba(255,255,255,.28);}',
      '.wm-body{padding:12px 12px 14px;overflow:auto;flex:1;overscroll-behavior:contain;}',
      '.wm-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}',
      '.wm-row.wm-3{grid-template-columns:1fr 1fr 1fr;}',
      '.wm-row label{display:flex;flex-direction:column;gap:3px;font-size:10.5px;color:#64748b;font-weight:600;}',
      '.wm-row select,.wm-row input{border:1px solid #d7dde8;border-radius:8px;padding:6px 8px;font-size:12px;color:#0f172a;background:#fff;}',
      '.wm-hint{font-size:10px;color:#94a3b8;margin:-2px 0 8px;}',
      '.wm-actions{display:flex;gap:8px;margin:4px 0 10px;}',
      '.wm-run{flex:1;border:0;border-radius:9px;padding:7px 12px;cursor:pointer;background:#0f766e;color:#fff;font-weight:700;font-size:12.5px;}',
      '.wm-run:hover{background:#0d9488;}',
      '.wm-quick{border:1px solid #99f6e4;background:#f0fdfa;color:#0f766e;border-radius:9px;padding:7px 10px;cursor:pointer;font-size:12px;font-weight:650;}',
      '.wm-out{min-height:120px;}',
      '.wm-empty,.wm-err{font-size:12px;color:#64748b;text-align:center;padding:22px 8px;}',
      '.wm-err{color:#b91c1c;}',
      '.wm-verdict{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:10px;margin-bottom:10px;border:1px solid transparent;}',
      '.wm-verdict b{font-size:15px;}',
      '.wm-verdict span{font-size:11.5px;line-height:1.45;opacity:.9;}',
      '.wm-verdict.go{background:#ecfdf5;border-color:#a7f3d0;color:#065f46;}',
      '.wm-verdict.risk{background:#fffbeb;border-color:#fde68a;color:#92400e;}',
      '.wm-verdict.reject{background:#fef2f2;border-color:#fecaca;color:#991b1b;}',
      '.wm-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px;}',
      '.wm-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;}',
      '.wm-card .k{font-size:10px;color:#64748b;font-weight:600;}',
      '.wm-card .v{font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;}',
      '.wm-card .v small{font-size:10px;font-weight:600;color:#94a3b8;}',
      '.wm-card .s{font-size:9.5px;color:#94a3b8;margin-top:3px;line-height:1.3;}',
      '.wm-sec{font-size:11.5px;font-weight:750;color:#334155;margin:8px 0 6px;}',
      '.wm-sec small{font-weight:500;color:#94a3b8;margin-left:6px;}',
      '.wm-kin,.wm-fac{background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:8px 10px;margin-bottom:8px;}',
      '.wm-fac{background:#eff6ff;border-color:#bfdbfe;}',
      '.wm-kgrid{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:11px;color:#0f766e;}',
      '.wm-fac .wm-kgrid{color:#1d4ed8;}',
      '.wm-kgrid b{color:#134e4a;}',
      '.wm-fac .wm-kgrid b{color:#1e3a8a;}',
      '.wm-clist{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;}',
      '.wm-citem{display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border-radius:9px;background:#f8fafc;border:1px solid #e2e8f0;}',
      '.wm-citem.fail{background:#fef2f2;border-color:#fecaca;}',
      '.wm-citem.warn{background:#fffbeb;border-color:#fde68a;}',
      '.wm-citem.pass{background:#f0fdf4;border-color:#bbf7d0;}',
      '.wm-b{flex:0 0 auto;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#e2e8f0;color:#475569;margin-top:1px;}',
      '.wm-b.pass{background:#dcfce7;color:#166534;}',
      '.wm-b.warn{background:#fef3c7;color:#92400e;}',
      '.wm-b.fail{background:#fee2e2;color:#991b1b;}',
      '.wm-ct .n{font-size:11.5px;font-weight:700;color:#1e293b;}',
      '.wm-ct .d{font-size:10.5px;color:#64748b;line-height:1.4;margin-top:2px;}',
      '.wm-ref{font-size:10px;color:#94a3b8;margin-top:10px;line-height:1.4;}',
      '.wm-layer{border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:10px 0;background:#fff;}',
      '.wm-layer.emp{border-color:#bfdbfe;background:#f8fbff;}',
      '.wm-layer.wm{border-color:#99f6e4;background:#f0fdfa;}',
      '.wm-layer.ai{border-color:#fde68a;background:#fffbeb;}',
      '.wm-hud{position:fixed;left:18px;bottom:18px;z-index:100060;width:min(360px,92vw);background:rgba(15,23,42,.92);color:#e2e8f0;border:1px solid rgba(148,163,184,.28);border-radius:14px;padding:12px 14px;box-shadow:0 16px 40px rgba(0,0,0,.4);display:none;font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC",sans-serif;}',
      '.wm-hud.on{display:block;}',
      '.wm-hud .t{font-size:13px;font-weight:800;color:#a5f3fc;margin-bottom:4px;}',
      '.wm-hud .s{font-size:11.5px;line-height:1.45;color:#cbd5e1;}',
      '.wm-hud .bar{height:4px;background:#334155;border-radius:99px;margin:10px 0 6px;overflow:hidden;}',
      '.wm-hud .bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#34d399);transition:width .35s ease;}',
      '.wm-hud .meta{font-size:10.5px;color:#94a3b8;}',
      '.wm-hud .stop{margin-top:8px;border:0;border-radius:8px;padding:5px 10px;background:#475569;color:#fff;cursor:pointer;font-size:11px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensurePanel() {
    if (panel) return panel;
    injectCss();
    panel = document.createElement('div');
    panel.id = 'wf-wm-panel';
    panel.className = 'wf-wm-panel';
    panel.innerHTML =
      '<div class="wm-head">' +
      '  <div class="wm-title">世界模型预演</div>' +
      '  <div class="wm-sub">历史锚点 · 条件响应 · 微动力学 · 物理约束</div>' +
      '  <button type="button" class="wm-x" id="wm-close" title="关闭">×</button>' +
      '</div>' +
      '<div class="wm-body">' +
      '  <div class="wm-row">' +
      '    <label>金属<select id="wm-metal"></select></label>' +
      '    <label>载体<select id="wm-support"></select></label>' +
      '  </div>' +
      '  <div class="wm-hint">CH₄ / O₂ / Ar 为气体流量（mL/min）</div>' +
      '  <div class="wm-row wm-3">' +
      '    <label>CH₄ 流量<input id="wm-ch4" type="number" min="0" max="200" step="0.1" value="69"></label>' +
      '    <label>O₂ 流量<input id="wm-o2" type="number" min="0" max="200" step="0.1" value="1"></label>' +
      '    <label>Ar 流量<input id="wm-ar" type="number" min="0" max="200" step="0.1" value="10"></label>' +
      '  </div>' +
      '  <div class="wm-row wm-3">' +
      '    <label>氧气浓度 %<input id="wm-o2pct" type="number" min="0" max="50" step="0.1" value="1"></label>' +
      '    <label>负载量 wt%<input id="wm-loading" type="number" min="0.02" max="10" step="0.005" value="0.1"></label>' +
      '    <label>光照 mW/cm²<input id="wm-light" type="number" min="1" max="500" step="1" value="100"></label>' +
      '  </div>' +
      '  <div class="wm-actions">' +
      '    <button type="button" class="wm-run" id="wm-run">预演</button>' +
      '    <button type="button" class="wm-quick" id="wm-quick-pd">Pd–P25</button>' +
      '  </div>' +
      '  <div id="wm-out" class="wm-out"><div class="wm-empty">调条件后点「预演」：按 x%Pd–P25 合成流程 3D 虚跑并出三层结果</div></div>' +
      '</div>';
    document.body.appendChild(panel);
    ensureHud();
    bindDrag(panel);
    restorePos();
    $('wm-close').addEventListener('click', hide);
    $('wm-run').addEventListener('click', runPreview);
    $('wm-quick-pd').addEventListener('click', function () {
      setSelect('wm-metal', 'Pd');
      setSelect('wm-support', 'P25(TiO2)');
      $('wm-ch4').value = '69';
      $('wm-o2').value = '1';
      $('wm-ar').value = '10';
      $('wm-o2pct').value = '1';
      $('wm-loading').value = '0.1';
      $('wm-light').value = '100';
      runPreview();
    });
    return panel;
  }

  function placePanel(left, top) {
    if (!panel) return;
    var w = panel.offsetWidth || 420;
    var h = panel.offsetHeight || 480;
    var maxL = Math.max(8, window.innerWidth - w - 8);
    var maxT = Math.max(8, window.innerHeight - h - 8);
    left = Math.min(maxL, Math.max(8, left));
    top = Math.min(maxT, Math.max(8, top));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.right = 'auto';
  }

  function persistPos() {
    if (!panel) return;
    try {
      var r = panel.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
    } catch (e) { }
  }

  function restorePos() {
    if (!panel) return;
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && isFinite(p.left) && isFinite(p.top)) placePanel(p.left, p.top);
    } catch (e) { }
  }

  function bindDrag(root) {
    var head = root.querySelector('.wm-head');
    if (!head || head.dataset.dragBound) return;
    head.dataset.dragBound = '1';
    head.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      if (ev.target.closest && ev.target.closest('button, input, select, textarea, a')) return;
      dragging = true;
      root.classList.add('dragging');
      var r = root.getBoundingClientRect();
      dragOff.x = ev.clientX - r.left;
      dragOff.y = ev.clientY - r.top;
      try { head.setPointerCapture(ev.pointerId); } catch (e) { }
      ev.preventDefault();
    });
    head.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      placePanel(ev.clientX - dragOff.x, ev.clientY - dragOff.y);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('dragging');
      persistPos();
    }
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);
  }

  /** 200 mg P25 + 20 mM H₂PdCl₄：y(μL) ≈ loading_wt% × 940（0.02→18.8 … 0.1→94） */
  function pdPrecursorUL(loading) {
    var x = Number(loading);
    if (!(x > 0)) return null;
    return Math.round(x * 9400) / 10;
  }

  function ensureHud() {
    if (hudEl) return hudEl;
    hudEl = document.createElement('div');
    hudEl.className = 'wm-hud';
    hudEl.id = 'wm-hud';
    hudEl.innerHTML =
      '<div class="t" id="wm-hud-t">世界模型 · 3D 虚跑</div>' +
      '<div class="s" id="wm-hud-s">准备中…</div>' +
      '<div class="bar"><i id="wm-hud-bar"></i></div>' +
      '<div class="meta" id="wm-hud-meta"></div>' +
      '<button type="button" class="stop" id="wm-hud-stop">停止虚跑</button>';
    document.body.appendChild(hudEl);
    hudEl.querySelector('#wm-hud-stop').addEventListener('click', stopTour);
    return hudEl;
  }

  function showHud(title, body, prog, meta) {
    ensureHud();
    hudEl.classList.add('on');
    $('wm-hud-t').textContent = title || '';
    $('wm-hud-s').textContent = body || '';
    $('wm-hud-meta').textContent = meta || '';
    $('wm-hud-bar').style.width = Math.max(0, Math.min(100, (prog || 0) * 100)) + '%';
  }

  function hideHud() {
    if (hudEl) hudEl.classList.remove('on');
  }

  function stopTour() {
    tourAbort = true;
    if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
    var S = window.__CWM_SCENE;
    if (S) {
      try { S.clearBusy(); S.hold(false); } catch (e) { }
      try { S.log('warn', '⏹ 世界模型 3D 虚跑已停止'); } catch (e) { }
    }
    hideHud();
    var runBtn = $('wm-run');
    if (runBtn) runBtn.disabled = false;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      tourTimer = setTimeout(resolve, ms);
    });
  }

  function pickDev(keys) {
    var S = window.__CWM_SCENE;
    if (!S) return null;
    for (var i = 0; i < keys.length; i++) {
      if (S.hasDev(keys[i])) return keys[i];
    }
    return null;
  }

  async function startTour() {
    var S = window.__CWM_SCENE;
    if (!lastResult || !lastResult.ok) return;
    if (!S || !S.ready()) {
      console.warn('[wm] 3D 场景未就绪，跳过虚跑');
      return;
    }
    stopTour();
    tourAbort = false;
    var runBtn = $('wm-run');
    if (runBtn) runBtn.disabled = true;
    ensureHud();

    var L = lastResult.layers || {};
    var emp = L.empirical || {};
    var wm = L.world_model || {};
    var ai = L.active_learning || {};
    var inp = lastResult.input || {};
    var verd = (wm.verdict && wm.verdict.level) || (lastResult.verdict && lastResult.verdict.level) || 'go';
    var fail = verd === 'reject';
    var load = inp.loading != null ? inp.loading : null;
    var yUL = pdPrecursorUL(load);
    var catLabel = (load != null ? (load + '%') : 'x%') + 'Pd–P25';

    var steps = [
      {
        keys: ['literature', 'ai'],
        title: '① 配方 · ' + catLabel,
        body: function () {
          var p = emp.predict || {};
          return '目标负载 ' + (load != null ? load : '—') + ' wt% · 200 mg P25 体系' +
            (yUL != null ? (' · 预计 H₂PdCl₄ ' + yUL + ' μL') : '') +
            (p.y != null ? (' · 经验 p_C2+ ≈ ' + p.y) : '');
        },
        ms: 2000
      },
      {
        keys: ['balance', 'gn_solid'],
        title: '② 称量 · P25',
        body: '称量 200 mg P25，分散于 50 mL H₂O',
        ms: 2200
      },
      {
        keys: ['sonicator'],
        title: '② 分散 · 水相',
        body: 'P25 在 50 mL 水中分散均匀（超声/搅拌）',
        ms: 1800
      },
      {
        keys: ['pipette', 'gn_liquid'],
        title: '③ 加 Pd 前驱体',
        body: function () {
          return '加入 ' + (yUL != null ? yUL : 'y') +
            ' μL 20 mM H₂PdCl₄（对照：0.02→18.8 · 0.025→23.5 · 0.05→47 · 0.1→94）';
        },
        ms: 2600
      },
      {
        keys: ['stirrer'],
        title: '④ 室温搅拌 3 h',
        body: '室温下磁力搅拌 3 h，浸渍吸附',
        ms: 2200
      },
      {
        keys: ['icebath'],
        title: '⑤ 冰浴 · 还原准备',
        body: '冰浴；配制 NaBH₄（22.7 mg + 3 mL H₂O）',
        ms: 2000
      },
      {
        keys: ['pipette', 'icebath'],
        title: '⑤ 滴加 NaBH₄',
        body: '冰浴下以 0.5 mL/min 滴加 NaBH₄ 溶液',
        ms: 2400
      },
      {
        keys: ['stirrer'],
        title: '⑥ 继续搅拌 0.5 h',
        body: '还原后继续搅拌 0.5 h',
        ms: 2000
      },
      {
        keys: ['centrifuge', 'gn_centrifuge'],
        title: '⑦ 离心',
        body: '固液分离，回收固体',
        ms: 2000
      },
      {
        keys: ['centrifuge', 'gn_centrifuge'],
        title: '⑧ 洗涤 ×3',
        body: '洗涤 3 次（水/醇），再离心',
        ms: 2200
      },
      {
        keys: ['oven', 'gn_oven', 'vacuumoven'],
        title: '⑨ 烘干',
        body: '80 ℃ 过夜烘干',
        ms: 2200
      },
      {
        keys: ['balance', 'gn_solid'],
        title: '⑩ 研磨',
        body: '研磨得 ' + catLabel + ' 粉末，备装反应器',
        ms: 1800
      },
      {
        keys: ['gasfeed'],
        title: '⑪ 评测 · 进料',
        body: function () {
          var f = inp.flows || {};
          return 'CH₄/O₂/Ar = ' + f.ch4 + '/' + f.o2 + '/' + f.ar +
            ' · 氧浓 ' + inp.o2_pct + '%';
        },
        ms: 2000
      },
      {
        keys: ['lamp', 'irlamb'],
        title: '⑪ 评测 · 光照',
        body: function () {
          var fac = (wm.factors) || {};
          return '光照 ' + inp.light + ' mW/cm² · absorb×light ≈ ' +
            (fac.absorb != null ? fac.absorb : '—') + '×' + (fac.light != null ? fac.light : '—');
        },
        ms: 2000
      },
      {
        keys: ['reactor'],
        title: '⑫ 评测 · 反应器',
        body: function () {
          var p = wm.predict || {};
          var v = wm.verdict || {};
          return (v.label || '推演') + ' · 世界模型 p_C2+ ≈ ' +
            (p.y != null ? p.y : '—') + ' · sel ' + (p.sel != null ? p.sel + '%' : '—');
        },
        status: fail ? 'fail' : 'busy',
        ms: 2600
      },
      {
        keys: ['gc', 'ms'],
        title: '⑬ 评测 · 虚拟读数',
        body: function () {
          var pe = emp.predict || {};
          var pw = wm.predict || {};
          return '经验 ' + (pe.y != null ? pe.y : '—') +
            ' vs 世界模型 ' + (pw.y != null ? pw.y : '—') +
            (pw.y_blend != null ? (' · 融合 ' + pw.y_blend) : '');
        },
        ms: 2400
      },
      {
        keys: ['ai'],
        title: '⑭ 主动学习 · 下一测点',
        body: function () {
          var sug = (ai.suggestions || [])[0];
          if (!sug) return '暂无 UCB 建议';
          var sy = pdPrecursorUL(sug.load);
          return '建议 #1：负载 ' + sug.load + ' wt%' +
            (sy != null ? ('（H₂PdCl₄ ≈ ' + sy + ' μL）') : '') +
            ' · 流量 ' + sug.ch4 + '/' + sug.o2 + '/' + sug.ar +
            ' · 光 ' + sug.lpd + ' · UCB ' + sug.ucb;
        },
        ms: 2800
      }
    ];

    S.log('ai', '🌐 开始 3D 虚跑：' + catLabel + ' 合成 → 评测 → 主动学习');
    S.hold(true);
    S.clearBusy();

    for (var i = 0; i < steps.length; i++) {
      if (tourAbort) break;
      var st = steps[i];
      var key = pickDev(st.keys);
      if (key) {
        S.goto(key);
        S.setStatus(key, st.status || 'busy');
      }
      var prog = (i + 1) / steps.length;
      showHud(
        st.title,
        typeof st.body === 'function' ? st.body() : st.body,
        prog,
        '步骤 ' + (i + 1) + '/' + steps.length + (key ? (' · ' + key) : '')
      );
      await sleep(st.ms);
      if (key && !fail) S.setStatus(key, 'idle');
    }

    if (!tourAbort) {
      var final = lastResult.verdict || {};
      showHud(
        '虚跑完成 · ' + (final.label || ''),
        final.why || '三层结果已在面板中',
        1,
        '可改条件再点「预演」'
      );
      S.log('ok', '✅ 世界模型 3D 虚跑完成：' + (final.label || ''));
      await sleep(2200);
    }
    S.clearBusy();
    S.hold(false);
    hideHud();
    if (runBtn) runBtn.disabled = false;
  }

  function setSelect(id, val) {
    var el = $(id);
    if (!el) return;
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === val) { el.selectedIndex = i; return; }
    }
    if (id === 'wm-support') {
      for (var j = 0; j < el.options.length; j++) {
        if (/p25|tio2/i.test(el.options[j].value)) { el.selectedIndex = j; return; }
      }
    }
  }

  function fillSelects(cat) {
    var mEl = $('wm-metal'), sEl = $('wm-support');
    mEl.innerHTML = (cat.metals || []).map(function (m) {
      return '<option value="' + m + '"' + (m === 'Pd' ? ' selected' : '') + '>' + m + '</option>';
    }).join('');
    sEl.innerHTML = (cat.supports || []).map(function (s) {
      var sel = /p25/i.test(s) ? ' selected' : '';
      return '<option value="' + s + '"' + sel + '>' + s + '</option>';
    }).join('');
  }

  function loadCatalog() {
    return fetch('/api/worldmodel/catalog')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || 'catalog failed');
        catalog = j;
        fillSelects(j);
      });
  }

  function show() {
    ensurePanel();
    panel.classList.add('on');
    restorePos();
    if (!catalog) {
      loadCatalog().catch(function (e) {
        $('wm-out').innerHTML = '<div class="wm-err">目录加载失败：' + esc(e.message || e) + '</div>';
      });
    }
  }

  function hide() {
    if (panel) panel.classList.remove('on');
  }

  function toggle() {
    ensurePanel();
    if (panel.classList.contains('on')) hide();
    else show();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stBadge(st) {
    if (st === 'pass') return '<span class="wm-b pass">通过</span>';
    if (st === 'warn') return '<span class="wm-b warn">告警</span>';
    if (st === 'fail') return '<span class="wm-b fail">失败</span>';
    return '<span class="wm-b">' + esc(st) + '</span>';
  }

  function predBlock(p, label) {
    if (!p) return '<div class="wm-empty">—</div>';
    return '<div class="wm-cards">' +
      '<div class="wm-card"><div class="k">' + esc(label || 'p_C2+') + '</div><div class="v">' +
      (p.y != null ? p.y : '—') + ' <small>±' + (p.unc != null ? p.unc : '—') + '</small></div>' +
      '<div class="s">区间 ' + (p.y_lo != null ? p.y_lo : '—') + ' ~ ' + (p.y_hi != null ? p.y_hi : '—') +
      '</div></div>' +
      '<div class="wm-card"><div class="k">sel_C2+</div><div class="v">' +
      (p.sel != null ? p.sel + '%' : '—') + '</div>' +
      '<div class="s">' + esc(p.model || '') + '</div></div>' +
      (p.y_blend != null
        ? '<div class="wm-card"><div class="k">与经验融合</div><div class="v">' + p.y_blend +
          '</div><div class="s">外推权重 blend=' + esc(p.blend) + '</div></div>'
        : '<div class="wm-card"><div class="k">模型</div><div class="v" style="font-size:12px">' +
          esc(p.model || '—') + '</div></div>') +
      '</div>';
  }

  function render(j) {
    var out = $('wm-out');
    if (!j.ok) {
      out.innerHTML = '<div class="wm-err">' + esc(j.error || '预演失败') + '</div>';
      return;
    }
    var v = j.verdict || {};
    var L = j.layers || {};
    var emp = L.empirical || {};
    var wm = L.world_model || {};
    var ai = L.active_learning || {};
    var inp = j.input || {};
    var html = '';

    html += '<div class="wm-verdict ' + esc(v.level || '') + '">' +
      '<b>' + esc(v.label || '—') + '</b>' +
      '<span>' + esc(v.why || '') + '</span></div>';
    html += '<div class="wm-hint">' +
      esc((j.metric && j.metric.y) || 'p_C2+') +
      ' · 负载 ' + esc(inp.loading) + ' wt% · 氧浓 ' + esc(inp.o2_pct) +
      '% · 光照 ' + esc(inp.light) + ' · 流量 ' +
      esc((inp.flows || {}).ch4) + '/' + esc((inp.flows || {}).o2) + '/' + esc((inp.flows || {}).ar) +
      '</div>';

    // ① 经验层
    html += '<div class="wm-layer emp">' +
      '<div class="wm-sec">① ' + esc(emp.name || '经验层 · 数学') +
      ' <small>' + esc((emp.verdict && emp.verdict.label) || '') + '</small></div>' +
      '<div class="wm-hint">' + esc(emp.role || '') + ' · ' + esc(emp.tag || '') + '</div>' +
      predBlock(emp.predict, '经验 p_C2+');
    var hh = emp.history || {};
    html += '<div class="wm-hint">主表 n=' + (hh.n || 0) +
      ' · 均值 ' + (hh.mean_y != null ? hh.mean_y : '—') +
      ' · 最高 ' + (hh.max_y != null ? hh.max_y : '—') + '</div>';
    var nbs = emp.neighbors || [];
    if (nbs.length) {
      html += '<div class="wm-clist">';
      for (var ni = 0; ni < Math.min(nbs.length, 4); ni++) {
        var nb = nbs[ni];
        html += '<div class="wm-citem pass"><span class="wm-b pass">w=' + esc(nb.w) + '</span>' +
          '<div class="wm-ct"><div class="n">p_C2+ ' + esc(nb.y) + ' · sel ' + esc(nb.sel) + '%</div>' +
          '<div class="d">负载 ' + esc(nb.load) + ' · ' +
          esc(nb.ch4) + '/' + esc(nb.o2) + '/' + esc(nb.ar) +
          ' · 光 ' + esc(nb.lpd) + ' · d=' + esc(nb.d) + '</div></div></div>';
      }
      html += '</div>';
    }
    html += '</div>';

    // ② 世界模型
    html += '<div class="wm-layer wm">' +
      '<div class="wm-sec">② ' + esc(wm.name || '世界模型层') +
      ' <small>' + esc((wm.verdict && wm.verdict.label) || '') + '</small></div>' +
      '<div class="wm-hint">' + esc(wm.role || '') + ' · ' + esc((wm.verdict && wm.verdict.why) || '') + '</div>' +
      predBlock(wm.predict, '世界模型 p_C2+');
    if (wm.factors) {
      html += '<div class="wm-fac"><div class="wm-kgrid">' +
        Object.keys(wm.factors).map(function (key) {
          return '<span>' + esc(key) + ' <b>' + wm.factors[key] + '</b></span>';
        }).join('') + '</div></div>';
    }
    var k = wm.kinetics || j.kinetics;
    if (k) {
      html += '<div class="wm-kin"><div class="wm-kgrid">' +
        '<span>act <b>' + k.act + '</b></span>' +
        '<span>red <b>' + k.red + '</b></span>' +
        '<span>absorb <b>' + k.absorb + '</b></span>' +
        '<span>h_sel <b>' + k.h_sel + '</b></span>' +
        '<span>flow_sel <b>' + k.flow_sel + '</b></span>' +
        '</div></div>';
    }
    var cs = j.constraints || [];
    var csum = wm.constraints_summary || {};
    html += '<div class="wm-sec">物理约束 <small>失败 ' + (csum.fails || 0) +
      ' · 告警 ' + (csum.warns || 0) + ' · 共 ' + (csum.n || cs.length) + '</small></div>';
    html += '<div class="wm-clist">';
    for (var i = 0; i < Math.min(cs.length, 8); i++) {
      var c = cs[i];
      html += '<div class="wm-citem ' + esc(c.st || '') + '">' +
        stBadge(c.st) +
        '<div class="wm-ct"><div class="n">' + esc(c.name || c.k) + '</div>' +
        '<div class="d">' + esc(c.d || '') + '</div></div></div>';
    }
    if (cs.length > 8) {
      html += '<div class="wm-hint">… 另有 ' + (cs.length - 8) + ' 条约束</div>';
    }
    html += '</div></div>';

    // ③ 主动学习
    html += '<div class="wm-layer ai">' +
      '<div class="wm-sec">③ ' + esc(ai.name || '主动学习层') +
      ' <small>' + esc(ai.strategy || 'UCB') + '</small></div>' +
      '<div class="wm-hint">' + esc(ai.role || '') + ' · ' + esc(ai.note || '') + '</div>';
    var sug = ai.suggestions || [];
    if (!sug.length) {
      html += '<div class="wm-empty">暂无采集建议</div>';
    } else {
      html += '<div class="wm-clist">';
      for (var si = 0; si < sug.length; si++) {
        var s = sug[si];
        html += '<div class="wm-citem warn">' +
          '<span class="wm-b warn">#' + (si + 1) + '</span>' +
          '<div class="wm-ct"><div class="n">UCB ' + esc(s.ucb) +
          ' · μ ' + esc(s.mu_y) + ' ±' + esc(s.sigma) + '</div>' +
          '<div class="d">负载 ' + esc(s.load) + ' · CH₄/O₂/Ar ' +
          esc(s.ch4) + '/' + esc(s.o2) + '/' + esc(s.ar) +
          ' · 光 ' + esc(s.lpd) + ' · 氧浓 ' + esc(s.o2_in) +
          '% · d=' + esc(s.d_min) + ' · ' + esc(s.why) + '</div></div></div>';
      }
      html += '</div>';
    }
    html += '</div>';

    out.innerHTML = html;
  }

  function runPreview() {
    ensurePanel();
    var out = $('wm-out');
    out.innerHTML = '<div class="wm-empty">推演中…</div>';
    var body = {
      metal: $('wm-metal').value,
      support: $('wm-support').value,
      ch4: parseFloat($('wm-ch4').value) || 0,
      o2: parseFloat($('wm-o2').value) || 0,
      ar: parseFloat($('wm-ar').value) || 0,
      o2_pct: parseFloat($('wm-o2pct').value) || 0,
      loading: parseFloat($('wm-loading').value) || 0,
      light: parseFloat($('wm-light').value) || 0
    };
    fetch('/api/worldmodel/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        lastResult = j;
        render(j);
        if (j && j.ok) startTour();
      })
      .catch(function (e) {
        lastResult = null;
        out.innerHTML = '<div class="wm-err">' + esc(e.message || e) + '</div>';
      });
  }

  function mountBtn() {
    var pc = window.PAGE_CONFIG || {};
    if (pc.page === 'wfed') return;
    var btn = $('btn-worldmodel');
    if (!btn) {
      if (!(pc.theme === 'photo' || pc.page === 'photo' || $('btn-play'))) return;
      var play = $('btn-play');
      var ctrl = document.querySelector('header .ctrl');
      if (!ctrl && !play) return;
      btn = document.createElement('button');
      btn.id = 'btn-worldmodel';
      btn.className = 'wm-toolbar';
      btn.title = '世界模型预演：条件→产物 + 物理约束';
      btn.textContent = '🌍 世界模型';
      if (play && play.parentNode) play.parentNode.insertBefore(btn, play.nextSibling);
      else ctrl.insertBefore(btn, ctrl.firstChild);
    }
    if (btn.dataset.wmBound) return;
    btn.dataset.wmBound = '1';
    btn.addEventListener('click', toggle);
  }

  function boot() {
    mountBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // shell.js 可能稍后注入 header
      setTimeout(boot, 50);
      setTimeout(boot, 400);
    });
  } else {
    setTimeout(boot, 50);
    setTimeout(boot, 400);
  }

  window.__WF_WM = { show: show, hide: hide, toggle: toggle, run: runPreview };
})();
