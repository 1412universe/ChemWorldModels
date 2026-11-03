/* ============================================================================
 * wf_agent.js — 工作流编辑器内嵌 Agent（unilab-workflow-builder skill）
 * 对话批量生成 / 修改当前画布；右下角可拖动。
 * ========================================================================== */
(function () {
  'use strict';

  var backendBase = '';
  try {
    if (window.location && /^https?:/.test(window.location.origin)) {
      backendBase = window.location.origin;
    }
  } catch (e) { }

  var history = [];
  var busy = false;
  var pendingWf = null;
  var pendingVal = null;
  var dragging = false;
  var dragMoved = false;
  var dragOff = { x: 0, y: 0 };
  var POS_KEY = 'cwm_wf_agent_pos';
  var modelCfg = {
    mode: 'ext', ext: 'GLM-4.5-Flash', custom: '',
    localUrl: 'http://127.0.0.1:11434/v1', localModel: 'qwen2.5:7b', localKey: ''
  };
  var LS_KEY = 'wm_chat_model';

  function $(id) { return document.getElementById(id); }

  function ensureDom() {
    if ($('wf-agent')) return;
    var el = document.createElement('div');
    el.id = 'wf-agent';
    el.className = 'ai-chat wf-agent collapsed';
    el.innerHTML =
      '<div class="ai-chat-head" id="wf-agent-head" data-drag="1">' +
      '  <span class="ai-chat-title">🤖 工作流 Agent · skill</span>' +
      '  <button type="button" class="ai-chat-toggle" id="wf-agent-toggle" title="展开/收起">▾</button>' +
      '</div>' +
      '<div class="ai-chat-model" id="wf-agent-model">' +
      '  <select id="wf-ag-mode" class="ai-sel" title="模型来源">' +
      '    <option value="ext">外部 · 常用模型</option>' +
      '    <option value="ext_custom">外部 · 自定义</option>' +
      '    <option value="local">本地模型</option>' +
      '  </select>' +
      '  <select id="wf-ag-ext" class="ai-sel">' +
      '    <option value="GLM-4.5-Flash" selected>GLM-4.5-Flash</option>' +
      '    <option value="GLM-4-Flash">GLM-4-Flash</option>' +
      '    <option value="GLM-Z1-Flash">GLM-Z1-Flash</option>' +
      '  </select>' +
      '  <input id="wf-ag-custom" class="ai-inp" style="display:none" placeholder="自定义模型名" />' +
      '  <div id="wf-ag-local" style="display:none;width:100%">' +
      '    <input id="wf-ag-url" class="ai-inp" placeholder="http://127.0.0.1:11434/v1" />' +
      '    <input id="wf-ag-lmodel" class="ai-inp" placeholder="本地模型名" />' +
      '    <input id="wf-ag-lkey" class="ai-inp" placeholder="本地 Key（可空）" />' +
      '  </div>' +
      '</div>' +
      '<div class="ai-chat-body">' +
      '  <div class="ai-chat-msgs" id="wf-agent-msgs">' +
      '    <div class="ai-msg bot">👋 我是工作流 Agent，挂载 <b>unilab-workflow-builder</b> skill。<br/>' +
      '你说怎么改，我会先<strong>读取当前画布</strong>再改（自然语言走 Agent；可撤销）。快捷按钮是明确动作。拖标题栏可移动。</div>' +
      '  </div>' +
      '  <div class="ai-chat-quick">' +
      '    <button type="button" class="ai-quick" data-local="remove_isolated_only" title="明确动作：只删两侧无连线的孤立节点">🧹 清孤立节点</button>' +
      '    <button type="button" class="ai-quick" data-cmd="用 skill 校验当前画布工作流的工艺规则与拓扑">✅ 校验当前</button>' +
      '    <button type="button" class="ai-quick" data-cmd="总结当前画布工作流：设备、节点数、是否线性链、有无违反三条工艺规则的风险">📋 总结画布</button>' +
      '    <button type="button" class="ai-quick wf-agent-undo" id="wf-agent-undo" title="撤销上一步画布修改（Ctrl/⌘+Z）">↶ 撤销</button>' +
      '  </div>' +
      '  <div class="ai-chat-input">' +
      '    <textarea id="wf-agent-text" rows="1" placeholder="描述要批量改/生成的工作流…（Enter 发送）"></textarea>' +
      '    <button type="button" id="wf-agent-send" class="ai-chat-send">发送</button>' +
      '  </div>' +
      '  <div id="wf-agent-applybar" class="wf-agent-applybar" hidden>' +
      '    <span id="wf-agent-applymeta"></span>' +
      '    <button type="button" id="wf-agent-apply" class="wf-agent-apply">应用到画布</button>' +
      '    <button type="button" id="wf-agent-discard" class="wf-agent-discard">丢弃</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);

    bindDrag(el);
    restorePos();

    $('wf-agent-toggle').addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggle();
    });
    // 标题栏单击展开/收起（拖动后不触发）
    $('wf-agent-head').addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;
      if (dragMoved) return;
      toggle();
    });
    $('wf-agent-send').addEventListener('click', function () {
      send($('wf-agent-text').value);
    });
    $('wf-agent-text').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        send(this.value);
      }
    });
    el.querySelectorAll('.ai-quick').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.id === 'wf-agent-undo') return;
        var local = b.getAttribute('data-local');
        if (local) {
          // 快捷按钮 = 用户明确点名的本地动作（不经关键词误匹配）
          appendMsg(esc(b.textContent.trim()), 'user');
          var st = runCleanupLocal(local);
          if (st) {
            reportCleanup(st, local);
            history.push({
              role: 'user', content: b.textContent.trim()
            });
            history.push({
              role: 'assistant',
              content: local === 'remove_isolated_only'
                ? ('已删除孤立节点 ' + (st.removedNodes || 0))
                : ('已清理：删禁用边 ' + (st.removedEdges || 0) + '、删孤立 ' + (st.removedNodes || 0))
            });
          }
          return;
        }
        var cmd = b.getAttribute('data-cmd');
        if (cmd) send(cmd);
      });
    });
    $('wf-agent-apply').addEventListener('click', applyPending);
    $('wf-agent-discard').addEventListener('click', clearPending);
    $('wf-agent-undo').addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      runUndoLocal();
    });

    bindModelUI();
    probeSkill();
  }

  function placePanel(left, top) {
    var el = $('wf-agent');
    if (!el) return;
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
    var el = $('wf-agent');
    if (!el) return;
    try {
      var r = el.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
    } catch (e) { }
  }

  function restorePos() {
    var el = $('wf-agent');
    if (!el) return;
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && isFinite(p.left) && isFinite(p.top)) placePanel(p.left, p.top);
    } catch (e) { }
  }

  function bindDrag(root) {
    var head = root.querySelector('#wf-agent-head');
    if (!head || head.dataset.dragBound) return;
    head.dataset.dragBound = '1';
    head.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      if (ev.target.closest && ev.target.closest('button, input, select, textarea, a')) return;
      dragging = true;
      dragMoved = false;
      root.classList.add('dragging');
      var r = root.getBoundingClientRect();
      dragOff.x = ev.clientX - r.left;
      dragOff.y = ev.clientY - r.top;
      try { head.setPointerCapture(ev.pointerId); } catch (e) { }
      ev.preventDefault();
    });
    head.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      dragMoved = true;
      placePanel(ev.clientX - dragOff.x, ev.clientY - dragOff.y);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('dragging');
      if (dragMoved) persistPos();
      // 下一帧清掉，避免同一次 pointerup→click 误触展开
      setTimeout(function () { dragMoved = false; }, 0);
    }
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);
  }

  function toggle() {
    var el = $('wf-agent');
    if (!el) return;
    el.classList.toggle('collapsed');
  }

  function bindModelUI() {
    try {
      var s = localStorage.getItem(LS_KEY);
      if (s) modelCfg = Object.assign(modelCfg, JSON.parse(s));
    } catch (e) { }
    var mode = $('wf-ag-mode');
    var ext = $('wf-ag-ext');
    var cust = $('wf-ag-custom');
    var loc = $('wf-ag-local');
    var url = $('wf-ag-url');
    var lm = $('wf-ag-lmodel');
    var lk = $('wf-ag-lkey');
    mode.value = modelCfg.mode || 'ext';
    ext.value = modelCfg.ext || 'GLM-4.5-Flash';
    cust.value = modelCfg.custom || '';
    url.value = modelCfg.localUrl || '';
    lm.value = modelCfg.localModel || '';
    lk.value = modelCfg.localKey || '';
    function sync() {
      ext.style.display = mode.value === 'ext' ? '' : 'none';
      cust.style.display = mode.value === 'ext_custom' ? '' : 'none';
      loc.style.display = mode.value === 'local' ? 'block' : 'none';
    }
    function save() {
      modelCfg = {
        mode: mode.value,
        ext: ext.value,
        custom: cust.value.trim(),
        localUrl: url.value.trim() || 'http://127.0.0.1:11434/v1',
        localModel: lm.value.trim() || 'qwen2.5:7b',
        localKey: lk.value.trim()
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(modelCfg)); } catch (e) { }
      sync();
    }
    mode.addEventListener('change', save);
    ext.addEventListener('change', save);
    cust.addEventListener('input', save);
    url.addEventListener('input', save);
    lm.addEventListener('input', save);
    lk.addEventListener('input', save);
    sync();
  }

  function modelParams() {
    if (modelCfg.mode === 'ext') return { model: modelCfg.ext };
    if (modelCfg.mode === 'ext_custom') return { model: modelCfg.custom || modelCfg.ext };
    return { model: modelCfg.localModel, base_url: modelCfg.localUrl, api_key: modelCfg.localKey || '' };
  }

  function appendMsg(text, cls) {
    var box = $('wf-agent-msgs');
    var d = document.createElement('div');
    d.className = 'ai-msg ' + (cls || 'bot');
    d.innerHTML = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    while (box.children.length > 60) box.removeChild(box.firstChild);
    return d;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mdLite(s) {
    return esc(s).replace(/\n/g, '<br/>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  /** 把模型 Markdown 转成可读 HTML 文档（标题/列表/加粗等），避免裸 ### 刷屏 */
  function mdToHtml(src) {
    var text = String(src == null ? '' : src).replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    // 去掉围栏里的 ops/json 长块（后端通常已 strip，这里再兜底）
    text = text.replace(/```(?:json)?\s*[\s\S]*?```/g, function (block) {
      if (/\"ops\"|\"nodes\"|\"data\"/.test(block)) {
        return '\n\n*(已省略结构化 JSON)*\n\n';
      }
      return block;
    });
    var lines = text.split('\n');
    var html = [];
    var i = 0;
    var inUl = false, inOl = false, inP = false, inCode = false;
    var codeBuf = [];

    function closeLists() {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    }
    function closeP() {
      if (inP) { html.push('</p>'); inP = false; }
    }
    function inlineFmt(s) {
      var t = esc(s);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[^\*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
      return t;
    }

    while (i < lines.length) {
      var line = lines[i];
      var fence = line.match(/^```/);
      if (fence) {
        closeP(); closeLists();
        if (inCode) {
          html.push('<pre class="wf-md-code"><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
          codeBuf = [];
          inCode = false;
        } else {
          inCode = true;
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }
      if (/^\s*$/.test(line)) {
        closeP(); closeLists();
        i++;
        continue;
      }
      var hm = line.match(/^(#{1,4})\s+(.+)$/);
      if (hm) {
        closeP(); closeLists();
        var lv = hm[1].length;
        html.push('<h' + lv + ' class="wf-md-h">' + inlineFmt(hm[2].trim()) + '</h' + lv + '>');
        i++;
        continue;
      }
      if (/^---+$/.test(line.trim())) {
        closeP(); closeLists();
        html.push('<hr class="wf-md-hr"/>');
        i++;
        continue;
      }
      var ulm = line.match(/^\s*[-*•]\s+(.+)$/);
      if (ulm) {
        closeP();
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inUl) { html.push('<ul class="wf-md-ul">'); inUl = true; }
        html.push('<li>' + inlineFmt(ulm[1]) + '</li>');
        i++;
        continue;
      }
      var olm = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (olm) {
        closeP();
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (!inOl) { html.push('<ol class="wf-md-ol">'); inOl = true; }
        html.push('<li>' + inlineFmt(olm[2]) + '</li>');
        i++;
        continue;
      }
      closeLists();
      if (!inP) { html.push('<p class="wf-md-p">'); inP = true; }
      else html.push('<br/>');
      html.push(inlineFmt(line));
      i++;
    }
    if (inCode) {
      html.push('<pre class="wf-md-code"><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
    }
    closeP(); closeLists();
    return '<div class="wf-md-doc">' + html.join('') + '</div>';
  }

  function startThinkPanel() {
    var box = $('wf-agent-msgs');
    var d = document.createElement('div');
    d.className = 'ai-msg bot think';
    d.innerHTML =
      '<div class="wf-think-head">🤔 <span class="wf-think-title">正在读取当前画布并调用 skill + 模型…</span>' +
      ' <span class="wf-think-time">0.0s</span></div>' +
      '<div class="wf-think-stage">· 打包画布 LIVE_CANVAS</div>' +
      '<div class="wf-think-body" hidden></div>';
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    var t0 = Date.now();
    var stages = [
      '· 打包画布 LIVE_CANVAS',
      '· 注入结构事实与步骤摘要',
      '· 调用 unilab-workflow-builder skill',
      '· 等待模型理解与生成…',
      '· 仍在生成，请稍候…'
    ];
    var si = 0;
    var timer = setInterval(function () {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      var te = d.querySelector('.wf-think-time');
      if (te) te.textContent = sec + 's';
      var next = Math.min(stages.length - 1, Math.floor((Date.now() - t0) / 2500));
      if (next !== si) {
        si = next;
        var st = d.querySelector('.wf-think-stage');
        if (st) st.textContent = stages[si];
      }
    }, 200);
    return {
      el: d,
      t0: t0,
      stop: function (opts) {
        opts = opts || {};
        clearInterval(timer);
        var sec = opts.latencySec != null
          ? Number(opts.latencySec).toFixed(1)
          : ((Date.now() - t0) / 1000).toFixed(1);
        var title = d.querySelector('.wf-think-title');
        var te = d.querySelector('.wf-think-time');
        var st = d.querySelector('.wf-think-stage');
        var body = d.querySelector('.wf-think-body');
        if (title) title.textContent = opts.ok === false ? '调用结束（失败）' : '思考完成';
        if (te) te.textContent = sec + 's';
        if (st) {
          st.textContent = opts.stageDone || ('· 总耗时 ' + sec + 's');
        }
        if (opts.reasoning && body) {
          body.hidden = false;
          body.innerHTML =
            '<details class="wf-think-details" open>' +
            '<summary>思考过程</summary>' +
            '<pre class="wf-think-pre">' + esc(opts.reasoning) + '</pre>' +
            '</details>';
        } else if (body) {
          body.hidden = true;
          body.innerHTML = '';
        }
        d.classList.remove('think');
        d.classList.add(opts.ok === false ? 'err' : 'act');
      },
      remove: function () {
        clearInterval(timer);
        if (d.parentNode) d.parentNode.removeChild(d);
      }
    };
  }

  function currentWorkflow() {
    try {
      if (window.__WFED && window.__WFED.getWorkflow) return window.__WFED.getWorkflow();
    } catch (e) { }
    return null;
  }

  function clearPending() {
    pendingWf = null;
    pendingVal = null;
    var bar = $('wf-agent-applybar');
    if (bar) bar.hidden = true;
  }

  function showPending(wf, validation) {
    pendingWf = wf;
    pendingVal = validation || null;
    var bar = $('wf-agent-applybar');
    var meta = $('wf-agent-applymeta');
    if (!bar || !meta || !wf) return;
    var nodes = ((wf.data || {}).nodes) || [];
    var edges = ((wf.data || {}).edges) || [];
    var ok = validation && validation.ok;
    meta.innerHTML = (ok ? '✅ ' : '⚠️ ') +
      '待应用：' + esc(wf.name || '未命名') +
      ' · 节点 ' + nodes.length + ' · 边 ' + edges.length +
      (validation && validation.summary ? (' · ' + esc(validation.summary)) : '');
    bar.hidden = false;
  }

  function applyToCanvas(wf, opts) {
    opts = opts || {};
    if (!wf) return false;
    if (!window.__WFED || !window.__WFED.importWorkflow) {
      appendMsg('⚠️ 编辑器未就绪（__WFED 不可用）', 'err');
      return false;
    }
    try {
      window.__WFED.importWorkflow(wf, 'replace');
      var nodes = ((wf.data || {}).nodes) || [];
      var edges = ((wf.data || {}).edges) || [];
      appendMsg(
        '✅ 已<strong>直接改当前画布</strong>' +
        (opts.via ? '（' + esc(opts.via) + '）' : '') +
        '：' + esc(wf.name || '未命名') +
        ' · 节点 ' + nodes.length + ' · 连线 ' + edges.length +
        '（可撤销）',
        'act'
      );
      clearPending();
      return true;
    } catch (e) {
      appendMsg('⚠️ 写入画布失败：' + esc(e.message || e), 'err');
      return false;
    }
  }

  function applyPending() {
    if (!pendingWf) return;
    applyToCanvas(pendingWf, { via: '手动确认' });
  }

  function probeSkill() {
    fetch(backendBase + '/api/workflow-agent/skill')
      .then(function (r) {
        if (r.status === 404) {
          appendMsg('⚠️ 后端还没有 /api/workflow-agent 接口，请<strong>重启 wm_backend</strong> 后再强刷本页。', 'err');
          return null;
        }
        return r.json().then(function (j) { return { status: r.status, j: j }; });
      })
      .then(function (pack) {
        if (!pack) return;
        var j = pack.j;
        if (j && j.ok) {
          appendMsg('🔗 skill 已挂载：<code>' + esc(j.skill) + '</code>', 'bot');
        } else if (j && j.detail) {
          appendMsg('⚠️ 接口异常：' + esc(typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)) +
            ' · 请重启后端。', 'err');
        } else {
          appendMsg('⚠️ 未找到 unilab-workflow-builder skill 文件（已查 wm_backend/skills 与 workbuddy 路径）。', 'err');
        }
      })
      .catch(function (e) {
        appendMsg('⚠️ 无法探测 skill 接口（' + esc(e.message || e) + '）。确认后端已启动并<strong>已重启</strong>加载新路由。', 'err');
      });
  }

  function looksLikeUndo(text) {
    var t = (text || '').trim();
    if (!t) return false;
    if (/不要撤销|别撤销|撤销不了/.test(t)) return false;
    if (/^(请)?(帮我)?(撤销|回退|还原)(当前|刚才|上一步|本次)?(的)?(修改|改动|操作)?([，,].*)?$/.test(t)) return true;
    if ((/撤销|回退/.test(t)) && (/当前|刚才|上一步|本次|修改/.test(t))) return true;
    return false;
  }

  function runUndoLocal() {
    if (!window.__WFED || typeof window.__WFED.undo !== 'function') {
      appendMsg('⚠️ 撤销不可用，请刷新页面。', 'err');
      return false;
    }
    if (window.__WFED.canUndo && !window.__WFED.canUndo()) {
      appendMsg('当前没有可撤销的步骤。', 'bot');
      return false;
    }
    window.__WFED.undo();
    appendMsg('↶ 已撤销上一步画布修改（本地撤销栈）。', 'act');
    return true;
  }

  function canvasAttachNote() {
    var wf = currentWorkflow();
    var n = wf && wf.data && wf.data.nodes ? wf.data.nodes.length : 0;
    var e = wf && wf.data && wf.data.edges ? wf.data.edges.length : 0;
    return '📎 本地将 POST workflow：节点 ' + n + ' · 连线 ' + e + '（是否真正写入 LLM 以服务端回执为准）';
  }

  function formatIngest(ing) {
    if (!ing) return '⚠️ 服务端未返回 llm_ingest（请重启后端）。';
    if (!ing.workflow_received) return '⚠️ 服务端未收到 workflow，画布没有进 LLM。';
    var kb = function (c) { return ((c || 0) / 1024).toFixed(1) + 'KB'; };
    var drop = (ing.dropped && ing.dropped.length) ? (' · 丢弃:' + ing.dropped.join(',')) : '';
    return '✅ 已写入 LLM 请求：nodes ' + (ing.nodes || 0) +
      ' · edges ' + (ing.edges || 0) +
      ' · live在user消息=' + (ing.live_in_user_message ? '是' : '否') +
      ' · live ' + kb(ing.live_chars) +
      ' · 总prompt ' + kb(ing.total_prompt_chars) +
      ' / 预算 ' + kb(ing.budget) +
      drop;
  }

  function runCleanupLocal(kind) {
    if (!window.__WFED) {
      appendMsg('⚠️ 编辑器清理动作未就绪，请刷新页面。', 'err');
      return null;
    }
    try {
      if (kind === 'remove_isolated_only') {
        if (typeof window.__WFED.removeIsolatedNodesOnly !== 'function') {
          appendMsg('⚠️ 清孤立节点动作未就绪，请强刷页面。', 'err');
          return null;
        }
        return window.__WFED.removeIsolatedNodesOnly();
      }
      if (typeof window.__WFED.pruneOrphansAndDisabledEdges !== 'function') {
        appendMsg('⚠️ 清理动作未就绪，请刷新页面。', 'err');
        return null;
      }
      return window.__WFED.pruneOrphansAndDisabledEdges();
    } catch (e) {
      appendMsg('⚠️ 清理失败：' + esc(e.message || e), 'err');
      return null;
    }
  }

  function reportCleanup(st, kind) {
    if (!st) return;
    var msg;
    if (kind === 'remove_isolated_only') {
      msg = '✅ 已<strong>直接改当前画布</strong>（只删两侧无连线的孤立节点，连线未动，可撤销）：<br/>' +
        '· 删除孤立节点 <b>' + (st.removedNodes || 0) + '</b><br/>' +
        '· 现保留节点 ' + (st.keptNodes || 0) + ' · 连线 ' + (st.keptEdges || 0);
    } else {
      msg = '✅ 已<strong>直接改当前画布</strong>（可撤销）：<br/>' +
        '· 删除禁用相关连线 <b>' + (st.removedEdges || 0) + '</b><br/>' +
        '· 删除无连线孤立节点 <b>' + (st.removedNodes || 0) + '</b><br/>' +
        '· 现保留节点 ' + (st.keptNodes || 0) + ' · 连线 ' + (st.keptEdges || 0);
    }
    appendMsg(msg, 'act');
    clearPending();
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    var el = $('wf-agent');
    if (el) el.classList.remove('collapsed');
    var ta = $('wf-agent-text');
    if (ta) ta.value = '';
    appendMsg(esc(text), 'user');
    history.push({ role: 'user', content: text });

    // 仅撤销走本地栈；其余自然语言一律交给 Agent 读画布
    if (looksLikeUndo(text)) {
      runUndoLocal();
      history.push({ role: 'assistant', content: '已撤销上一步画布修改' });
      return;
    }

    busy = true;
    var sendBtn = $('wf-agent-send');
    if (sendBtn) sendBtn.disabled = true;
    var think = startThinkPanel();
    try {
      var body = Object.assign({
        message: text,
        history: history.slice(-8),
        workflow: currentWorkflow()
      }, modelParams());
      var res = await fetch(backendBase + '/api/workflow-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var j = await res.json().catch(function () { return {}; });
      var latencySec = (j && j.llm_latency_ms != null)
        ? (j.llm_latency_ms / 1000)
        : ((Date.now() - think.t0) / 1000);
      if (res.status === 404) {
        think.stop({ ok: false, latencySec: latencySec, stageDone: '· 后端缺少 workflow-agent 接口' });
        appendMsg('⚠️ 后端缺少 /api/workflow-agent，请重启 wm_backend。', 'err');
        return;
      }
      if (!res.ok || !j.ok) {
        think.stop({
          ok: false,
          latencySec: latencySec,
          stageDone: '· 请求失败',
          reasoning: j && j.reasoning
        });
        appendMsg('⚠️ ' + esc((j && (j.error || j.detail)) || ('HTTP ' + res.status)), 'err');
        if (j && j.llm_ingest) appendMsg(formatIngest(j.llm_ingest), 'err');
        return;
      }
      var stageDone = '· 模型已返回';
      if (j.reasoning) stageDone = '· 模型已返回（含思考过程）';
      else if (j.llm_latency_ms == null && (j.action === 'analysis_only' || j.action === 'apply_ops')) {
        stageDone = '· 服务端已直接处理';
      }
      think.stop({
        ok: true,
        latencySec: latencySec,
        stageDone: stageDone,
        reasoning: j.reasoning || ''
      });
      if (j.apply_direct && j.action === 'undo') {
        runUndoLocal();
        history.push({ role: 'assistant', content: j.reply || '已撤销' });
        return;
      }
      appendMsg(mdToHtml(j.reply || '') || mdLite(j.reply || ''), 'bot md');
      history.push({ role: 'assistant', content: j.reply || '' });
      // Agent 基于画布产出的补丁/完整结果 → 直接写回当前画布
      if (j.apply_direct && j.workflow) {
        applyToCanvas(j.workflow, {
          via: j.action === 'apply_ops' ? 'Agent 补丁' : 'Agent 替换'
        });
      } else if (j.workflow) {
        showPending(j.workflow, j.validation);
      } else {
        clearPending();
      }
    } catch (e) {
      if (think) think.stop({ ok: false, stageDone: '· 网络或解析异常' });
      appendMsg('⚠️ 请求失败：' + esc(e.message || e), 'err');
    } finally {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function bindToolbar() {
    var btn = document.getElementById('btn-wf-agent');
    if (!btn || btn.dataset.wfAgBound) return;
    btn.dataset.wfAgBound = '1';
    btn.addEventListener('click', function () {
      ensureDom();
      var el = $('wf-agent');
      if (el) el.classList.remove('collapsed');
      var ta = $('wf-agent-text');
      if (ta) try { ta.focus(); } catch (e) { }
    });
  }

  function boot() {
    ensureDom();
    bindToolbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 80); });
  } else {
    setTimeout(boot, 80);
  }

  window.__WF_AGENT = {
    send: send,
    apply: applyPending,
    show: function () {
      ensureDom();
      var el = $('wf-agent');
      if (el) el.classList.remove('collapsed');
    }
  };
})();
