/* ============================================================
   共享外壳 shell.js —— 注入顶部导航 + 控制栏 + 闭环左栏
   ------------------------------------------------------------
   · 五页（index/lab/char/dft/recipe）原本各自内联了完全相同的
     nav / header / aside#left，约 90 行重复样板。本脚本集中维护。
   · 各页面只需保留 <body class="page-X"> 与 #app 内的
     main / aside#right / footer#bottom，并在 window.PAGE_CONFIG
     之后引入本脚本（普通脚本，先于 app.js 模块执行，故 app.js
     仍能按 id 找到所有元素）。
   · active 导航依据 window.PAGE_CONFIG.page 自动设置。
   ============================================================ */
(function () {
  "use strict";

  var page = (window.PAGE_CONFIG && window.PAGE_CONFIG.page) || "index";
  var theme = (window.PAGE_CONFIG && window.PAGE_CONFIG.theme) || "gn"; // gn=金四面体/MOF 合成产线；photo=甲烷偶联光催化闭环

  var NAV = [
    { href: "index.html",          icon: "📊", label: "总览-510", key: "index"  },
    { href: "overview_photo.html", icon: "☀️", label: "总览-光催化闭环设计", key: "photo" },
    { href: "workflow_editor.html", icon: "🛠️", label: "工作流编辑器", key: "wfed" },
    { href: "lab.html",    icon: "⚗️ ", label: "合成", key: "lab"    },
    { href: "char.html",   icon: "🔬", label: "表征", key: "char"   },
    { href: "dft.html",    icon: "⚛️ ", label: "理论", key: "dft"    },
    { href: "recipe.html", icon: "📋", label: "配方", key: "recipe" }
  ];

  var brand = (theme === 'photo') ? '甲烷偶联光催化 · AI 世界模型' : '金四面体/MOF · AI 世界模型';
  var navHtml = '<nav class="topnav"><span class="brand">' + brand + '</span>';
  for (var i = 0; i < NAV.length; i++) {
    var a = NAV[i];
    navHtml += '<a href="' + a.href + '"' +
               (a.key === page ? ' class="active"' : "") +
               ' data-icon="' + a.icon + '">' + a.label + "</a>";
  }
  navHtml += "</nav>";

  var studioName = (theme === 'photo') ? '甲烷偶联 · AI 世界模型工作室' : '金四面体/MOF · AI 世界模型工作室';
  var ctrlBtns = (theme === 'photo') ? [
    '      <button id="btn-neb">⚛ NEB 路径</button>',
    '      <button id="btn-play" class="primary">▶ 运行</button>',
    '      <label style="margin-left:6px;font-size:12px;cursor:pointer;user-select:none"><input type="checkbox" id="chk-bo" style="vertical-align:middle"> 纯BO模式</label>',
    '      <button id="btn-step">⏭ 单步</button>',
    '      <button id="btn-exp-csv" class="exp">⬇ 配方CSV</button>',
    '      <button id="btn-exp-json" class="exp">⬇ 配方JSON</button>',
    '      <button id="btn-exp-unilab" class="exp primary">⬇ CWM-Lab</button>',
    '      <button id="btn-char">🔬 表征 &amp; 理论</button>',
    '      <button id="btn-react">🎯 反应体系 / 可靠性</button>',
    '      <button id="btn-reaction" class="exp">⚗ 反应：甲烷</button>',
    '      <span id="oer-target-wrap" style="display:none">',
    '        <button id="btn-oer-target" class="exp">🎯 OER 目标：H₂O₂</button>',
    '      </span>'
  ] : [
    '      <button id="btn-neb">⚛ NEB 路径</button>',
    '      <button id="btn-play" class="primary">▶ 运行</button>',
    '      <label style="margin-left:6px;font-size:12px;cursor:pointer;user-select:none"><input type="checkbox" id="chk-bo" style="vertical-align:middle"> 纯BO模式</label>',
    '      <button id="btn-step">⏭ 单步</button>',
    '      <button id="btn-exp-csv" class="exp">⬇ 配方CSV</button>',
    '      <button id="btn-exp-json" class="exp">⬇ 配方JSON</button>',
    '      <button id="btn-exp-unilab" class="exp primary">⬇ CWM-Lab</button>',
    '      <button id="btn-char">🔬 表征 &amp; 理论</button>',
    '      <button id="btn-react">🎯 反应体系 / 可靠性</button>',
    '      <button id="btn-reaction" class="exp">⚗ 反应：金四面体</button>',
    '      <span id="oer-target-wrap" style="display:none">',
    '        <button id="btn-mof-target" class="exp">🎯 MOF 应用目标：催化</button>',
    '      </span>'
  ];

  var headerHtml = [
    '  <header>',
    '    <h1><span class="em">🧪</span> ' + studioName + '</h1>',
    '    <span class="tag real">真实文献库 · 265 篇</span>',
    '    <span class="tag" id="iter-tag">迭代 #0</span>',
    '    <span class="tag sim" id="ts-tag">⏱ ×10,000</span>',
    '    <span class="tag sim" id="sim-clock">🌐 模拟 0s</span>',
    '    <span class="tag sim" id="data-mode-tag">🧪 数据：始终真实</span>',
    '    <div class="spacer"></div>',
    '    <div class="ctrl">',
  ].concat(ctrlBtns, [
    '      <label class="lbl">时间倍率</label>',
    '      <input id="ts-input" type="number" min="1" step="1" value="10000" />',
    '      <span class="presets">',
    '        <button class="tsp" data-v="1">1×</button>',
    '        <button class="tsp" data-v="100">100×</button>',
    '        <button class="tsp" data-v="1000">1k×</button>',
    '        <button class="tsp" data-v="10000">10k×</button>',
    '        <button class="tsp" data-v="100000">100k×</button>',
    '      </span>',
    '      <label class="lbl" style="margin-left:10px;">🧠 7B策略接管</label>',
    '      <input id="use7b" type="checkbox" checked title="每次选取候选时咨询本地 Qwen2.5-7B（无后端或取消勾选时自动回退确定性逻辑）。模型只读数据库、不生成/修改文献。" />',
    '      <label class="lbl" style="margin-left:10px;">🧪 实验数据</label>',
    '      <select id="data-mode" title="选择本轮是否使用真实实验数据，以及何时从模拟切换到真实">',
    '        <option value="real">始终真实</option>',
    '        <option value="hybrid">混合：N 次后真实</option>',
    '        <option value="sim">纯模拟</option>',
    '      </select>',
    '      <span id="real-after-wrap" style="display:none;gap:4px;align-items:center">',
    '        <label class="lbl">N=</label>',
    '        <input id="real-after" type="number" min="1" step="1" value="5" style="width:52px" />',
    '      </span>',
    '      <label class="lbl" style="margin-left:10px;">采集策略</label>',
    '      <select id="acq-strategy" title="主动学习采集函数：UCB(β退火)/EI/PI/Thompson Sampling">',
    '        <option value="UCB">UCB（上置信界·β退火）</option>',
    '        <option value="EI">EI（期望改进）</option>',
    '        <option value="PI">PI（改进概率）</option>',
    '        <option value="TS">TS（Thompson 采样）</option>',
    '      </select>',
    '      <button id="btn-eval" class="tsp" title="对当前采样轨迹做主动学习评价（遗憾/Top-k/校准/覆盖）">📊 评价</button>',
    '      <button id="btn-realdata" class="exp" title="上传真实世界实验数据（.csv/.xlsx/.tif），在“真实实验反馈”阶段作为真实反馈；或随时点此上传">📁 上传真实实验数据</button>',
    '      <label class="lbl" style="margin-left:8px;">自动评价</label>',
    '      <input id="auto-eval" type="checkbox" checked title="每完成一轮迭代自动重算评价指标（遗憾 / Top-k / 校准 / 覆盖 / 奖励归因），并刷新遗憾趋势曲线。" />',
    '    </div>',
    '  </header>'
  ]).join("\n");

  var leftHtml = [
    '  <aside id="left" class="scrollbar">',
    '    <h2>世界模型闭环</h2>',
    '    <div class="stage" data-stage="0"><div class="num">1</div><div class="body"><div class="t">文献学习</div><div class="d">检索知识库，抽取设计原则</div></div></div>',
    '    <div class="loop-arrow">↓</div>',
    '    <div class="stage" data-stage="1"><div class="num">2</div><div class="body"><div class="t">虚拟合成与表征</div><div class="d">称量 · 马弗炉焙烧催化剂</div></div></div>',
    '    <div class="loop-arrow">↓</div>',
    '    <div class="stage" data-stage="2"><div class="num">3</div><div class="body"><div class="t">真实实验反馈</div><div class="d">灯 + 反应器 · 气相色谱 · 表征</div></div></div>',
    '    <div class="realdata-cta"><button id="btn-stage-realdata" class="rd-cta" title="上传你的真实实验数据（.csv/.xlsx/.tif），作为本轮真实反馈">📁 录入真实数据</button><span class="realdata-hint">手动上传真实实验 · 替代模拟值</span></div>',
    '    <div class="loop-arrow">↻</div>',
    '    <div class="stage" data-stage="3"><div class="num">4</div><div class="body"><div class="t">强化 / 主动学习</div><div class="d">AI 控制中心更新世界模型</div></div></div>',
    '    <div id="acq-box">',
    '      <div class="lbl">🎯 采集策略 · β 退火</div>',
    '      <div class="acq-canvas-wrap"><canvas id="beta-canvas"></canvas></div>',
    '      <div id="acq-meta"><div class="cdim">等待运行…</div></div>',
    '    </div>',
    '    <div id="eval-box">',
    '      <div class="lbl">📊 主动学习评价</div>',
    '      <div class="acq-canvas-wrap"><canvas id="regret-canvas"></canvas></div>',
    '      <div id="eval-body"><div class="cdim">点顶部「📊 评价」或勾选「自动评价」：每轮自动重算遗憾 / Top-k 召回 / 校准(PICP) / 探索覆盖 / 奖励归因。</div></div>',
    '    </div>',
    '    <div id="best-box">',
    '      <div class="lbl">当前最优催化剂</div>',
    '      <div class="v" id="best-name">—</div>',
    '      <div class="sub" id="best-metrics">' + (theme === 'photo' ? 'C2 产率 — · 选择性 —' : '金四面体产率 — · 选择性 —') + '</div>',
    '    </div>',
    '    <div id="err-box">世界模型预测误差　MAE：<b id="mae">—</b>　·　相对 rMAE：<b id="rmae">—</b></div>',
    '    <div id="kb-meta">参考知识库：加载中…</div>',
    '    <div id="constraint-box">',
    '      <div class="lbl" style="margin-top:14px;color:var(--accent);font-weight:700">🔬 物理 / 化学约束校验</div>',
    '      <div id="constraint-list"><div class="cdim">运行后显示当前候选的约束校验…</div></div>',
    '    </div>',
    '  </aside>'
  ].join("\n");

  // 注入 nav 为 body 首个子节点
  document.body.insertAdjacentHTML("afterbegin", navHtml);

  // —— AI 对话面板（右下角浮动，可折叠）——
  var chatHtml = [
    '<div id="ai-chat" class="ai-chat collapsed">',
    '  <div class="ai-chat-head" id="ai-chat-head">',
    '    <span class="ai-chat-title">💬 AI 对话 · 实时操控</span>',
    '    <button class="ai-chat-toggle" id="ai-chat-toggle" title="展开/收起">▾</button>',
    '  </div>',
    '  <div class="ai-chat-model" id="ai-chat-model">',
    '    <select id="ai-model-mode" class="ai-sel" title="选择模型来源">',
    '      <option value="ext">外部 · 常用模型</option>',
    '      <option value="ext_custom">外部 · 自定义模型名</option>',
    '      <option value="local">本地模型（自选端点）</option>',
    '    </select>',
    '    <select id="ai-model-ext" class="ai-sel" title="本 API Key 仅支持以下 8 个模型（paratera 白名单）">',
    '      <optgroup label="对话模型（推荐）">',
    '        <option value="GLM-4.5-Flash" selected>GLM-4.5-Flash（通用·默认）</option>',
    '        <option value="GLM-4-Flash">GLM-4-Flash（通用）</option>',
    '        <option value="GLM-Z1-Flash">GLM-Z1-Flash（推理）</option>',
    '      </optgroup>',
    '      <optgroup label="视觉 / 图像 / OCR">',
    '        <option value="GLM-4V-Flash">GLM-4V-Flash（视觉）</option>',
    '        <option value="GLM-CogView3-Flash">GLM-CogView3-Flash（文生图）</option>',
    '        <option value="Intern-S2-Preview">Intern-S2-Preview</option>',
    '        <option value="PaddleOCR-VL-0.9B">PaddleOCR-VL-0.9B（OCR）</option>',
    '        <option value="PaddleOCR-VL-1.5">PaddleOCR-VL-1.5（OCR）</option>',
    '      </optgroup>',
    '    </select>',
    '    <input id="ai-model-custom" class="ai-inp" style="display:none" placeholder="自定义模型名（如 Qwen3.8-Max）" />',
    '    <div id="ai-local-wrap" style="display:none;width:100%">',
    '      <div style="display:flex;gap:5px;width:100%">',
    '        <input id="ai-local-url" class="ai-inp" style="flex:1" placeholder="本地 Base URL（默认 http://127.0.0.1:11434/v1）" />',
    '        <button id="ai-ollama-probe" class="ai-probe" title="探测本机 Ollama 实际地址与模型列表">🔍 探测</button>',
    '      </div>',
    '      <input id="ai-local-model" class="ai-inp" list="ai-local-models" placeholder="本地模型名（点🔍探测后可选，或手填）" />',
    '      <datalist id="ai-local-models"></datalist>',
    '      <input id="ai-local-key" class="ai-inp" placeholder="本地 Key（Ollama 一般留空）" />',
    '    </div>',
    '  </div>',
    '  <div class="ai-chat-body" id="ai-chat-body">',
    '    <div class="ai-chat-msgs" id="ai-chat-msgs">',
    '      <div class="ai-msg bot">👋 你好！我是世界模型助手。告诉我「开始运行」「单步」「切换到 OER」「上传真实数据」等，我来实时操控实验闭环。</div>',
    '    </div>',
    '    <div class="ai-chat-quick">',
    '      <button class="ai-quick" data-cmd="开始运行实验闭环">▶ 运行</button>',
    '      <button class="ai-quick" data-cmd="单步推进一次">⏭ 单步</button>',
    '      <button class="ai-quick" data-cmd="切换到 OER 反应">⚗ OER</button>',
    '      <button class="ai-quick" data-cmd="打开真实实验数据上传">📁 真实数据</button>',
    '    </div>',
    '    <div class="ai-chat-input">',
    '      <button id="ai-chat-attach-btn" class="ai-chat-send" style="background:#334155;padding:0 12px" title="上传数据文件（.csv/.xlsx/.tif）用于 AI 分析与原位真实实验反馈">📎</button>',
    '      <textarea id="ai-chat-text" rows="1" placeholder="和 AI 说点什么…（Enter 发送，Shift+Enter 换行；可先用 📎 上传数据文件）"></textarea>',
    '      <button id="ai-chat-send" class="ai-chat-send">发送</button>',
    '      <button id="ai-chat-stop" class="ai-chat-stop">⏹ 停止</button>',
    '    </div>',
    '    <div class="ai-chat-attach" id="ai-chat-attach" style="display:none">',
    '      <span id="ai-chat-attach-name"></span>',
    '      <button id="ai-chat-attach-clear" title="移除文件">✕</button>',
    '    </div>',
    '    <input type="file" id="ai-chat-file" accept=".csv,.xlsx,.tif,.tiff,.png,.jpg,.pdf,.txt" style="display:none" />',
    '  </div>',
    '</div>',
    // 新手引导浮层
    '  <div id="onboard-mask" class="onboard-mask" style="display:none">',
    '    <div class="onboard-card" id="onboard-card">',
    '      <div class="onboard-emoji" id="onboard-emoji">🧭</div>',
    '      <div class="onboard-title" id="onboard-title">欢迎来到世界模型工作室</div>',
    '      <div class="onboard-text" id="onboard-text">花 20 秒了解四个关键入口，之后随时可重新查看。</div>',
    '      <div class="onboard-dots" id="onboard-dots"></div>',
    '      <div class="onboard-actions">',
    '        <button class="onboard-skip" id="onboard-skip">跳过</button>',
    '        <button class="onboard-next" id="onboard-next">下一步 →</button>',
    '      </div>',
    '    </div>',
    '  </div>'
  ].join("\n");
  document.body.insertAdjacentHTML("beforeend", chatHtml);


  // 注入 header + aside#left 为 #app 首个子节点（header 在前，left 其次，main 之后保留）
  var app = document.getElementById("app");
  if (app) {
    app.insertAdjacentHTML("afterbegin", headerHtml + "\n" + leftHtml);
  }

  // ============================================================
  // 模型预热提示：首次启动 7B 冷加载约 30s，期间显示右下角横幅，
  // 避免用户误以为卡死/断连。仅推演页（存在 #chat）启用。
  // ============================================================
  if (document.getElementById("chat")) {
    var _warmBanner = document.createElement("div");
    _warmBanner.id = "warmup-banner";
    _warmBanner.textContent = "🕐 AI 模型预热中（首次启动约 30 秒）…";
    _warmBanner.style.cssText =
      "position:fixed;right:18px;bottom:18px;z-index:9999;" +
      "background:linear-gradient(135deg,#1e293b,#334155);color:#e2e8f0;" +
      "padding:12px 18px;border-radius:12px;font-size:13px;" +
      "box-shadow:0 10px 30px rgba(15,23,42,.35);" +
      "display:none;align-items:center;gap:8px;" +
      "animation:warmpulse 1.6s ease-in-out infinite;";
    var _st = document.createElement("style");
    _st.textContent = "@keyframes warmpulse{0%,100%{opacity:1}50%{opacity:.55}}";
    document.head.appendChild(_st);
    document.body.appendChild(_warmBanner);

    function _warmCheck() {
      fetch("api/health", { method: "GET", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.warmup_done === false) {
            _warmBanner.style.display = "flex";
            setTimeout(_warmCheck, 2000);
          } else {
            _warmBanner.style.display = "none";
          }
        })
        .catch(function () {
          // 后端不可达：横幅收起（连接问题由既有心跳处理）
          _warmBanner.style.display = "none";
          setTimeout(_warmCheck, 8000);
        });
    }
    _warmCheck();
  }
})();
