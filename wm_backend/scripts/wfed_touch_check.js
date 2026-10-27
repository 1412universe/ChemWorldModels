/* wfed_touch_check.js — 本轮改动的专项自检（本机 Chrome / puppeteer-core）
 *
 * 覆盖四组：
 *   A. 坐标体系  —— 缩放/平移后节点与连线是否仍然贴合（修「一放大控件就跑远」）
 *   B. 鼠标交互  —— 拖节点 / 平移画布 / 端口连线 / 从节点库拖拽落点
 *   C. 触屏手势  —— 单指拖节点 / 单指平移 / 双指捏合不漂移 / touch-action
 *   D. 节点库分层 —— 功能类别 → 设备驱动 → 节点 三级 + 搜索跨层平铺
 *
 * 手势一律用页面内合成的 PointerEvent 驱动（走真实 handler），
 * 不用 CDP Input.dispatch*（headless 下会 ProtocolError 排队超时）。
 *
 * 运行：NODE_PATH=<managed node_modules> node wfed_touch_check.js
 * 截图：/tmp/wfed_touch_*.png
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8000';
const SAMPLE = '/Users/fenglongli/Downloads/unilabWorld/wm_backend/static/assets/unilab_workflow.sample.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-dev-shm-usage',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1600, height: 1000, hasTouch: true, isMobile: false },
  });
  const page = await browser.newPage();
  const errors = [], bad = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  const report = [];
  const T = (name, cond, extra = '') =>
    report.push((cond ? '[PASS] ' : '[FAIL] ') + name + (extra ? '  ' + extra : ''));
  const T0 = Date.now();
  let step = 0;
  const mark = s => console.log(`[${String(++step).padStart(2)}] ${s}  (+${((Date.now() - T0) / 1000).toFixed(1)}s)`);

  // ---------------------------------------------------------------- 页面内工具
  // 注入一组手势原语：合成 PointerEvent，按 pointerId 区分手指
  await page.evaluateOnNewDocument(() => {
    window.__G = {
      // 指针按下/移动/抬起。target 用 elementFromPoint 决定，和真实指针一致。
      send(type, id, x, y, opts) {
        const o = Object.assign({
          bubbles: true, cancelable: true, composed: true,
          pointerId: id, pointerType: (opts && opts.pointerType) || 'touch',
          isPrimary: id === 1, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          clientX: x, clientY: y, width: 12, height: 12, pressure: type === 'pointerup' ? 0 : 0.5,
        }, opts || {});
        const el = document.elementFromPoint(x, y) || document.documentElement;
        const ev = new PointerEvent(type, o);
        // setPointerCapture 在合成事件下会抛，屏蔽掉
        el.dispatchEvent(ev);
        return el;
      },
      down(id, x, y, type) { return this.send('pointerdown', id, x, y, { pointerType: type }); },
      move(id, x, y, type) { return this.send('pointermove', id, x, y, { pointerType: type }); },
      up(id, x, y, type) { return this.send('pointerup', id, x, y, { pointerType: type }); },
      // 找一个「确实是空白画布」的点：避开图例 / 缩放条 / 迷你地图 / 节点
      emptyPoint() {
        const wrap = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
        for (let fy = 0.94; fy > 0.1; fy -= 0.08) {
          for (let fx = 0.06; fx < 0.96; fx += 0.06) {
            const x = wrap.left + wrap.width * fx, y = wrap.top + wrap.height * fy;
            const el = document.elementFromPoint(x, y);
            if (!el) continue;
            if (el.id === 'wfed-canvas' || el.id === 'wfed-grid') return { x, y, id: el.id };
          }
        }
        return null;
      },
      // 一次完整的拖动：按下 → N 步移动 → 抬起
      drag(id, x0, y0, x1, y1, steps, type) {
        steps = steps || 8; type = type || 'touch';
        this.down(id, x0, y0, type);
        for (let i = 1; i <= steps; i++) {
          this.move(id, x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, type);
        }
        this.up(id, x1, y1, type);
      },
    };
  });

  // 节点在屏幕上的中心（世界坐标 → 视图坐标）
  const nodeCenter = (uuid) => page.evaluate(u => {
    const r = window.__WFED.nodeScreenRect(u);
    const w = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    return { x: w.left + r.x + r.w / 2, y: w.top + r.y + 30 };
  }, uuid);

  mark('打开编辑器');
  await page.goto(BASE + '/workflow_editor', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);

  T('无 4xx 请求', bad.length === 0, bad.slice(0, 3).join(' | '));
  T('无控制台报错', errors.length === 0, errors.slice(0, 3).join(' | '));
  T('暴露了节点库调试接口', await page.evaluate(() => typeof window.__WFED.libDrivers === 'function'));

  // ================================================================ A 坐标体系
  const wf = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
  await page.evaluate(w => window.__WFED.openWorkflow(w), wf);
  await sleep(700);

  mark('A1 节点层与连线层共用同一个 transform');
  const xf = await page.evaluate(() => {
    const c = getComputedStyle(document.getElementById('wfed-canvas')).transform;
    const s = getComputedStyle(document.getElementById('wfed-svg')).transform;
    return { canvas: c, svg: s, originC: getComputedStyle(document.getElementById('wfed-canvas')).transformOrigin };
  });
  T('两层 transform 完全一致', xf.canvas === xf.svg && xf.canvas !== 'none',
    xf.canvas.slice(0, 46) + '… origin=' + xf.originC);

  // 连线端点必须落在节点端口的中心（这是「放大后连线脱离节点」的核心判据）
  const edgeFit = () => page.evaluate(() => {
    const W = window.__WFED, st = W.state;
    const wrapRect = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    const emap = st.wf.data.edges;
    const res = [];
    document.querySelectorAll('#wfed-svg path.wfedge').forEach((p, i) => {
      if (i >= 12 || i >= emap.length) return;
      const d = p.getAttribute('d');
      const m = /^M([-\d.]+) ([-\d.]+) C/.exec(d);
      if (!m) return;
      const src = emap[i].source_node_uuid, tgt = emap[i].target_node_uuid;
      const sd = document.querySelector('#wfed-canvas [data-uuid="' + src + '"] .port.out');
      const td = document.querySelector('#wfed-canvas [data-uuid="' + tgt + '"] .port.in');
      if (!sd || !td) return;
      const sr = sd.getBoundingClientRect(), tr = td.getBoundingClientRect();
      // 起点：world → screen；终点：取 d 的末尾两个数（贝塞尔终点 == 目标入端口）
      const x1 = wrapRect.left + (+m[1]) * st.view.scale + st.view.x;
      const y1 = wrapRect.top + (+m[2]) * st.view.scale + st.view.y;
      const tail = d.split(',').pop().trim().split(' ');
      const x2 = wrapRect.left + (+tail[0]) * st.view.scale + st.view.x;
      const y2 = wrapRect.top + (+tail[1]) * st.view.scale + st.view.y;
      res.push({
        dOut: Math.hypot(x1 - (sr.left + sr.width / 2), y1 - (sr.top + sr.height / 2)),
        dIn: Math.hypot(x2 - (tr.left + tr.width / 2), y2 - (tr.top + tr.height / 2)),
      });
    });
    return {
      n: res.length, scale: st.view.scale,
      maxOut: res.length ? Math.max(...res.map(r => r.dOut)) : -1,
      maxIn: res.length ? Math.max(...res.map(r => r.dIn)) : -1,
    };
  });

  let fit = await edgeFit();
  mark('A2 缩放 100%：连线端点 vs 端口中心  maxΔout=' + fit.maxOut.toFixed(2) + ' maxΔin=' + fit.maxIn.toFixed(2));
  T('100% 时连线贴合端口', fit.maxOut < 4 && fit.maxIn < 4, fit.n + ' 条抽样');

  // 放大到 ~230%，再验一次（旧 BUG 就是在这里暴露的：坐标被缩放两次）
  await page.evaluate(() => {
    const W = window.__WFED;
    W.state.view = { x: 30, y: 40, scale: 2.3 };
    W.applyView(); W.updatePositions();
  });
  await sleep(250);
  fit = await edgeFit();
  mark('A3 放大到 230%：maxΔout=' + fit.maxOut.toFixed(2) + ' maxΔin=' + fit.maxIn.toFixed(2));
  T('230% 时连线仍贴合端口（关键回归项）', fit.maxOut < 6 && fit.maxIn < 6,
    'scale=' + fit.scale.toFixed(2));

  // 缩小到 40%
  await page.evaluate(() => {
    const W = window.__WFED; W.state.view = { x: 20, y: 20, scale: 0.4 }; W.applyView(); W.updatePositions();
  });
  await sleep(250);
  fit = await edgeFit();
  mark('A4 缩小到 40%：maxΔout=' + fit.maxOut.toFixed(2) + ' maxΔin=' + fit.maxIn.toFixed(2));
  T('40% 时连线仍贴合端口', fit.maxOut < 6 && fit.maxIn < 6, 'scale=' + fit.scale.toFixed(2));

  // 以某个屏幕点为焦点缩放：那个点下的世界坐标必须不动（这是「控件跑远」的判据）
  const drift = await page.evaluate(() => {
    const W = window.__WFED;
    W.state.view = { x: 0, y: 0, scale: 1 }; W.applyView(); W.updatePositions();
    const wrap = document.getElementById('wfed-canvas-wrap');
    const cr = wrap.getBoundingClientRect();
    const fx = cr.left + 500, fy = cr.top + 300;      // 焦点（屏幕坐标）
    const before = { x: fx - cr.left, y: fy - cr.top }; // 焦点处的视图坐标 = 世界坐标(scale=1,view=0)
    const beforeWorld = { x: before.x, y: before.y };
    // 模拟滚轮：以焦点为中心放大 1.12 三次
    for (let i = 0; i < 3; i++) {
      const s = W.state.view.scale * 1.12;
      const px = (fx - cr.left - W.state.view.x) / W.state.view.scale;
      const py = (fy - cr.top - W.state.view.y) / W.state.view.scale;
      W.state.view.scale = s;
      W.state.view.x = (fx - cr.left) - px * s;
      W.state.view.y = (fy - cr.top) - py * s;
    }
    W.applyView(); W.updatePositions();
    // 焦点下的世界坐标应该还是 beforeWorld
    const afterWorld = {
      x: (before.x - W.state.view.x) / W.state.view.scale,
      y: (before.y - W.state.view.y) / W.state.view.scale,
    };
    return {
      scale: W.state.view.scale,
      dx: Math.abs(afterWorld.x - beforeWorld.x),
      dy: Math.abs(afterWorld.y - beforeWorld.y),
      // 节点卡片在屏幕上的实际大小 vs nodeScreenRect 预测
      nodeDelta: (() => {
        const u = W.state.wf.data.nodes[0].uuid;
        const r = W.nodeScreenRect(u);
        const el = document.querySelector('[data-uuid="' + u + '"]');
        const er = el.getBoundingClientRect();
        const wr = cr;
        return {
          dx: Math.abs((wr.left + r.x) - er.left),
          dy: Math.abs((wr.top + r.y) - er.top),
          dw: Math.abs(r.w - er.width),
        };
      })(),
    };
  });
  mark('A5 焦点缩放漂移 dx=' + drift.dx.toFixed(3) + ' dy=' + drift.dy.toFixed(3) +
    ' | nodeScreenRect 误差 dx=' + drift.nodeDelta.dx.toFixed(2) + ' dw=' + drift.nodeDelta.dw.toFixed(2));
  T('以光标为焦点缩放，焦点处世界坐标不漂移', drift.dx < 0.01 && drift.dy < 0.01, 'scale=' + drift.scale.toFixed(2));
  T('nodeScreenRect 与实际 DOM 位置一致', drift.nodeDelta.dx < 1.5 && drift.nodeDelta.dy < 1.5 && drift.nodeDelta.dw < 1.5);
  await page.screenshot({ path: '/tmp/wfed_touch_1_zoom.png' });

  // ================================================================ B 鼠标
  mark('B 鼠标交互');
  await page.evaluate(() => {
    const W = window.__WFED; W.state.view = { x: 40, y: 40, scale: 1 }; W.applyView(); W.updatePositions();
  });
  await sleep(200);

  const uuid0 = await page.evaluate(() => window.__WFED.state.wf.data.nodes[0].uuid);
  const c0 = await nodeCenter(uuid0);

  // B1 拖节点
  const b1 = await page.evaluate((u, cx, cy) => {
    const W = window.__WFED;
    const p0 = JSON.parse(JSON.stringify(W.findNode(u).pose.position));
    W.state.selectedIds = {};          // 清掉多选，免得整体拖动
    window.__G.drag(1, cx, cy, cx + 160, cy + 90, 10, 'mouse');
    const p1 = W.findNode(u).pose.position;
    return { p0, p1, moved: Math.hypot(p1.x - p0.x, p1.y - p0.y) };
  }, uuid0, c0.x, c0.y);
  mark('B1 拖动节点：' + JSON.stringify(b1.moved.toFixed(0)) + 'px  (dx=' + (b1.p1.x - b1.p0.x) + ' dy=' + (b1.p1.y - b1.p0.y) + ')');
  T('鼠标能拖动节点', b1.moved > 100, b1.p0.x + ',' + b1.p0.y + ' → ' + b1.p1.x + ',' + b1.p1.y);

  // B2 平移画布
  const b2 = await page.evaluate(() => {
    const W = window.__WFED;
    const v0 = { x: W.state.view.x, y: W.state.view.y };
    const p = window.__G.emptyPoint();
    if (!p) return { err: '找不到空白画布点' };
    window.__G.down(9, p.x, p.y, 'mouse');
    window.__G.move(9, p.x + 70, p.y - 50, 'mouse');
    window.__G.move(9, p.x + 140, p.y - 100, 'mouse');
    window.__G.up(9, p.x + 140, p.y - 100, 'mouse');
    return { v0, v1: { x: W.state.view.x, y: W.state.view.y }, dx: W.state.view.x - v0.x, dy: W.state.view.y - v0.y, hit: p.id };
  });
  mark('B2 平移画布：view (' + b2.v0.x.toFixed(0) + ',' + b2.v0.y.toFixed(0) + ') → (' +
    (b2.v1 ? b2.v1.x.toFixed(0) + ',' + b2.v1.y.toFixed(0) : '?') + ')  落点=' + b2.hit);
  T('鼠标空白拖动 = 平移画布', Math.abs(b2.dx - 140) < 3 && Math.abs(b2.dy + 100) < 3);

  // B3 端口拖线建边
  const b3 = await page.evaluate(() => {
    const W = window.__WFED, st = W.state;
    // 先把视图拉回原点附近，保证节点在视口内（elementFromPoint 对屏外元素返回 null）
    st.view = { x: 30, y: 30, scale: 1 }; W.applyView(); W.updatePositions();
    const nodes = st.wf.data.nodes;
    const has = {}; st.wf.data.edges.forEach(e => has[e.source_node_uuid + '>' + e.target_node_uuid] = 1);
    // 可达性：加 src→tgt 后若 tgt 已能到达 src 就会成环，编辑器会拒绝，测试要避开
    const adj = {};
    st.wf.data.edges.forEach(e => { (adj[e.source_node_uuid] = adj[e.source_node_uuid] || []).push(e.target_node_uuid); });
    const reaches = (from, to) => {
      const seen = {}, stack = [from];
      while (stack.length) {
        const u = stack.pop();
        if (u === to) return true;
        if (seen[u]) continue; seen[u] = 1;
        (adj[u] || []).forEach(v => stack.push(v));
      }
      return false;
    };
    // 挑一对「出端口和目标入端口都真的能被指针点到」的节点
    // （节点互相遮挡时端口会被别的卡片盖住，那种情况本来就抓不到，不算 bug）
    let a = null, b = null, tries = 0, skippedCycle = 0, cand = [];
    for (let i = 0; i < nodes.length && !a; i++) {
      const so = document.querySelector('[data-uuid="' + nodes[i].uuid + '"] .port.out');
      if (!so) continue;
      const sr = so.getBoundingClientRect();
      const ox = sr.left + sr.width / 2, oy = sr.top + sr.height / 2;
      const ho = document.elementFromPoint(ox, oy);
      if (!(ho && ho.classList && ho.classList.contains('out'))) continue;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        if (has[nodes[i].uuid + '>' + nodes[j].uuid]) continue;
        if (reaches(nodes[j].uuid, nodes[i].uuid)) { skippedCycle++; continue; }
        const ti = document.querySelector('[data-uuid="' + nodes[j].uuid + '"] .port.in');
        if (!ti) continue;
        const tr = ti.getBoundingClientRect();
        const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
        const hit = document.elementFromPoint(tx, ty);
        tries++;
        if (hit && hit.classList && hit.classList.contains('in')) { a = nodes[i].uuid; b = nodes[j].uuid; break; }
        if (cand.length < 3) cand.push(nodes[i].uuid.slice(0, 6) + '→' + nodes[j].uuid.slice(0, 6) +
          ' 命中=' + (hit ? hit.tagName + '.' + hit.className : 'null'));
      }
    }
    if (!a) return { err: '找不到两端端口都可点击且不成环的节点对', tries, skippedCycle, cand };
    const before = st.wf.data.edges.length;
    const so = document.querySelector('[data-uuid="' + a + '"] .port.out');
    const ti = document.querySelector('[data-uuid="' + b + '"] .port.in');
    const sr = so.getBoundingClientRect(), tr = ti.getBoundingClientRect();
    const ox = sr.left + sr.width / 2, oy = sr.top + sr.height / 2;
    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    window.__G.down(2, ox, oy, 'mouse');
    const linkingAfterDown = !!st.linking;
    for (let i = 1; i <= 8; i++) {
      window.__G.move(2, ox + (tx - ox) * i / 8, oy + (ty - oy) * i / 8, 'mouse');
    }
    window.__G.up(2, tx, ty, 'mouse');
    const created = st.wf.data.edges.some(e => e.source_node_uuid === a && e.target_node_uuid === b);

    // 再验一次「成环的连线必须被拒绝」：找一条会成环的方向拖一下
    let cyc = null;
    for (let i = 0; i < nodes.length && !cyc; i++) {
      const so2 = document.querySelector('[data-uuid="' + nodes[i].uuid + '"] .port.out');
      if (!so2) continue;
      const r2 = so2.getBoundingClientRect();
      const h2 = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
      if (!(h2 && h2.classList && h2.classList.contains('out'))) continue;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j || has[nodes[i].uuid + '>' + nodes[j].uuid]) continue;
        if (!reaches(nodes[j].uuid, nodes[i].uuid)) continue;
        const ti2 = document.querySelector('[data-uuid="' + nodes[j].uuid + '"] .port.in');
        if (!ti2) continue;
        cyc = { src: nodes[i].uuid, tgt: nodes[j].uuid }; break;
      }
    }
    let cycleRejected = null;
    if (cyc) {
      const n0 = st.wf.data.edges.length;
      const so3 = document.querySelector('[data-uuid="' + cyc.src + '"] .port.out');
      const ti3 = document.querySelector('[data-uuid="' + cyc.tgt + '"] .port.in');
      const r3 = so3.getBoundingClientRect(), r4 = ti3.getBoundingClientRect();
      const p1 = { x: r3.left + r3.width / 2, y: r3.top + r3.height / 2 };
      const p2 = { x: r4.left + r4.width / 2, y: r4.top + r4.height / 2 };
      window.__G.down(4, p1.x, p1.y, 'mouse');
      for (let i = 1; i <= 6; i++) window.__G.move(4, p1.x + (p2.x - p1.x) * i / 6, p1.y + (p2.y - p1.y) * i / 6, 'mouse');
      window.__G.up(4, p2.x, p2.y, 'mouse');
      cycleRejected = { before: n0, after: st.wf.data.edges.length };
    }
    return { before, after: st.wf.data.edges.length, linkingAfterDown, created, a, b, tries, skippedCycle, cycleRejected };
  });
  mark('B3 端口连线：' + b3.before + ' → ' + b3.after + ' 条边（试了 ' + b3.tries + ' 对，跳过 ' + b3.skippedCycle + ' 个会成环的方向）');
  if (b3.err) console.log('   ' + b3.err + ' | ' + (b3.cand || []).join(' ; '));
  T('按下出端口即进入连线态', b3.linkingAfterDown);
  T('鼠标能拉出新的依赖边', b3.created && b3.after === b3.before + 1, b3.a + ' → ' + b3.b);
  T('会成环的连线被拒绝（护栏生效）',
    !b3.cycleRejected || b3.cycleRejected.after === b3.cycleRejected.before,
    b3.cycleRejected ? b3.cycleRejected.before + ' → ' + b3.cycleRejected.after : '本图无成环方向，跳过');

  // B4 从节点库拖拽到画布（窄侧栏平时只露轨道，先钉住展开）
  const b4 = await page.evaluate(() => {
    const W = window.__WFED;
    const before = W.state.wf.data.nodes.length;
    W.setPinned(true);
    const railHidden = getComputedStyle(document.querySelector('#wfed-lib .lib-inner')).visibility;
    W.setLib({ cat: 'thermal', dev: null });
    const rows = document.querySelectorAll('#lib-groups .lib-drv');
    rows[0].click();
    const act = document.querySelector('#lib-groups .lib-act');
    const lbl = act.dataset.label;
    const ar = act.getBoundingClientRect();
    const wrap = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    const tx = wrap.left + 320, ty = wrap.top + 260;
    window.__G.down(3, ar.left + 40, ar.top + 10, 'mouse');
    const ghost = !!W.state.ghost;
    for (let i = 1; i <= 8; i++) {
      window.__G.move(3, ar.left + 40 + (tx - ar.left - 40) * i / 8, ar.top + 10 + (ty - ar.top - 10) * i / 8, 'mouse');
    }
    window.__G.up(3, tx, ty, 'mouse');
    const res = { before, after: W.state.wf.data.nodes.length, ghost, lbl,
      ghostLeft: !!document.querySelector('.wfnode.ghost'), railHidden };
    return res;
  });
  mark('B4 节点库拖拽落点：' + b4.before + ' → ' + b4.after + ' 个节点（' + b4.lbl + '）');
  T('钉住后节点库内容可见', b4.railHidden === 'visible', 'visibility=' + b4.railHidden);
  T('从库里拖出幽灵节点', b4.ghost);
  T('松手后真的落到画布上（松手点在画布，不在库上）', b4.after === b4.before + 1);
  T('幽灵节点已清理', !b4.ghostLeft);

  // B4b 点画布自动取消「固定展开」
  const b4b = await page.evaluate(() => {
    const W = window.__WFED;
    W.setPinned(true);
    const wasPinned = W.isPinned();
    const p = window.__G.emptyPoint();
    if (!p) return { err: '找不到空白画布点' };
    window.__G.down(5, p.x, p.y, 'mouse');
    const after = W.isPinned();
    window.__G.up(5, p.x, p.y, 'mouse');
    return { wasPinned, after };
  });
  mark('B4b 固定展开开关：钉住=' + b4b.wasPinned + ' → 点画布后=' + b4b.after);
  T('点画布会自动取消固定展开', b4b.wasPinned === true && b4b.after === false);

  // B5 提示浮层不能吃掉画布手势（旧 BUG：载入工作流后顶部提示卡盖住画布中心 8 秒，
  //    这期间拖节点/框选全失效，看起来就像「拖拽功能坏了」）
  const b5 = await page.evaluate(() => {
    const box = document.querySelector('.wfed-notes') || (() => {
      const d = document.createElement('div'); d.className = 'wfed-notes';
      document.getElementById('wfed-canvas-wrap').appendChild(d); return d;
    })();
    box.innerHTML =
      '<div class="wfed-note n-info"><div class="wn-head"><span class="wn-title">提示</span>' +
      '<button class="wn-x">✕</button></div><div class="wn-body"><div class="wn-line">这是一条普通提示</div></div></div>' +
      '<div class="wfed-note n-warn m-ask"><div class="wn-head"><span class="wn-title">确认</span></div>' +
      '<div class="wn-actions"><button class="wn-ok">确定</button></div></div>';
    const plain = box.querySelector('.wfed-note.n-info');
    const r = plain.getBoundingClientRect();
    const hitPlain = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const xr = box.querySelector('.wn-x').getBoundingClientRect();
    const hitX = document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2);
    const ar = box.querySelector('.wfed-note.m-ask').getBoundingClientRect();
    const hitAsk = document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2);
    const res = {
      plainThrough: !(hitPlain && plain.contains(hitPlain)),
      plainHit: hitPlain ? (hitPlain.id ? '#' + hitPlain.id : hitPlain.tagName + '.' + hitPlain.className) : 'null',
      xClickable: !!(hitX && hitX.classList && hitX.classList.contains('wn-x')),
      askBlocks: !!(hitAsk && hitAsk.closest && hitAsk.closest('.wfed-note.m-ask')),
    };
    box.innerHTML = '';
    return res;
  });
  mark('B5 提示浮层：普通卡下方的命中元素是「' + b5.plainHit + '」 / ✕可点=' + b5.xClickable + ' / 确认卡拦截=' + b5.askBlocks);
  T('普通提示卡不吃指针（画布手势照常生效）', b5.plainThrough);
  T('提示卡上的 ✕ 仍然可点', b5.xClickable);
  T('需要输入的确认卡正常拦截指针', b5.askBlocks);

  // ================================================================ C 触屏
  mark('C 触屏手势');
  T('画布 touch-action: none（否则浏览器抢走双指手势）',
    await page.evaluate(() => getComputedStyle(document.getElementById('wfed-canvas-wrap')).touchAction === 'none'));

  // C1 单指拖节点
  const c1 = await page.evaluate(() => {
    const W = window.__WFED;
    W.state.view = { x: 40, y: 40, scale: 1 }; W.applyView(); W.updatePositions();
    W.state.selectedIds = {};
    const u = W.state.wf.data.nodes[1].uuid;
    const r = W.nodeScreenRect(u);
    const wrap = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    const cx = wrap.left + r.x + r.w / 2, cy = wrap.top + r.y + 30;
    const p0 = JSON.parse(JSON.stringify(W.findNode(u).pose.position));
    window.__G.drag(11, cx, cy, cx - 120, cy + 130, 10, 'touch');
    const p1 = W.findNode(u).pose.position;
    const info = W.state.gestureInfo();
    return { moved: Math.hypot(p1.x - p0.x, p1.y - p0.y), p0, p1, modeAfter: info.mode, touchesAfter: info.touches };
  });
  mark('C1 单指拖节点 ' + c1.moved.toFixed(0) + 'px');
  T('触屏单指能拖节点', c1.moved > 80, 'mode→' + c1.modeAfter + ' 残留触点=' + c1.touchesAfter);
  T('抬手后手势状态已复位', c1.modeAfter === null && c1.touchesAfter === 0);

  // C2 单指平移画布
  const c2 = await page.evaluate(() => {
    const W = window.__WFED;
    const p = window.__G.emptyPoint();
    if (!p) return { err: '找不到空白画布点' };
    const v0 = { x: W.state.view.x, y: W.state.view.y };
    window.__G.down(12, p.x, p.y, 'touch');
    for (let i = 1; i <= 8; i++) window.__G.move(12, p.x + 120 * i / 8, p.y - 80 * i / 8, 'touch');
    window.__G.up(12, p.x + 120, p.y - 80, 'touch');
    return { dx: W.state.view.x - v0.x, dy: W.state.view.y - v0.y, mode: W.state.gestureInfo().mode, hit: p.id };
  });
  mark('C2 单指平移 view 位移 (' + c2.dx.toFixed(0) + ',' + c2.dy.toFixed(0) + ')  落点=' + c2.hit);
  T('触屏单指空白拖动 = 平移画布', Math.abs(c2.dx - 120) < 3 && Math.abs(c2.dy + 80) < 3);

  // C3 双指捏合缩放 —— 核心回归：中点下的世界坐标必须不动
  const c3 = await page.evaluate(() => {
    const W = window.__WFED;
    const wrap = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    W.state.view = { x: 0, y: 0, scale: 1 }; W.applyView(); W.updatePositions();
    const mx = 600, my = 380;                    // 捏合中点（视图坐标）
    const p1a = { x: wrap.left + mx - 90, y: wrap.top + my };
    const p2a = { x: wrap.left + mx + 90, y: wrap.top + my };
    const worldBefore = { x: (mx - W.state.view.x) / W.state.view.scale, y: (my - W.state.view.y) / W.state.view.scale };
    // 两指同时按下
    window.__G.send('pointerdown', 21, p1a.x, p1a.y, { pointerType: 'touch' });
    window.__G.send('pointerdown', 22, p2a.x, p2a.y, { pointerType: 'touch' });
    const mode = W.state.gestureInfo().mode;
    // 向两侧撑开：180 → 340（≈1.89 倍）；中点保持不动的另一种情况：中点也平移
    const p1b = { x: wrap.left + mx - 170, y: wrap.top + my - 40 };
    const p2b = { x: wrap.left + mx + 170, y: wrap.top + my + 40 };
    for (let i = 1; i <= 10; i++) {
      window.__G.send('pointermove', 21, p1a.x + (p1b.x - p1a.x) * i / 10, p1a.y + (p1b.y - p1a.y) * i / 10, { pointerType: 'touch' });
      window.__G.send('pointermove', 22, p2a.x + (p2b.x - p2a.x) * i / 10, p2a.y + (p2b.y - p2a.y) * i / 10, { pointerType: 'touch' });
    }
    const s = W.state.view.scale;
    const midAfter = { x: ((p1b.x + p2b.x) / 2) - wrap.left, y: ((p1b.y + p2b.y) / 2) - wrap.top };
    const worldAfterAtMid = { x: (midAfter.x - W.state.view.x) / s, y: (midAfter.y - W.state.view.y) / s };
    // 期望倍率 = 两指终距 / 两指初距（注意 Y 方向也有位移，别只算 X）
    const expect = Math.hypot(p2b.x - p1b.x, p2b.y - p1b.y) / Math.hypot(p2a.x - p1a.x, p2a.y - p1a.y);
    // 收尾：抬起两指
    window.__G.send('pointerup', 21, p1b.x, p1b.y, { pointerType: 'touch' });
    window.__G.send('pointerup', 22, p2b.x, p2b.y, { pointerType: 'touch' });
    return {
      mode, scale: s, expect: +expect.toFixed(3),
      scaleErr: Math.abs(s - expect),
      // 捏合不漂移的判据：中点世界坐标既不等于起始也不该乱跑 —— 正确实现下，
      // 起始中点对应的世界点会被平移到「当前中点」下，所以：
      //   当前中点处的世界坐标 == 起始中点处的世界坐标（因为我们把起始点搬到了当前中点）
      drift: Math.hypot(worldAfterAtMid.x - worldBefore.x, worldAfterAtMid.y - worldBefore.y),
      modeAfter: W.state.gestureInfo().mode, touchesAfter: W.state.gestureInfo().touches,
    };
  });
  mark('C3 双指捏合 scale=' + c3.scale.toFixed(3) + '（期望 ' + c3.expect + '） 漂移=' + c3.drift.toFixed(3));
  T('双指捏合手势被识别', c3.mode === 'pinch');
  T('捏合缩放倍率正确（= 两指距离比）', c3.scaleErr < 0.03, c3.scale.toFixed(3) + ' vs ' + c3.expect);
  T('捏合不漂移（焦点下世界坐标保持）', c3.drift < 0.6, 'drift=' + c3.drift.toFixed(3) + 'px');
  T('双指抬起后手势复位', c3.modeAfter === null && c3.touchesAfter === 0);

  // C4 捏合中抬起一指 → 退化为平移，不应跳变
  const c4 = await page.evaluate(() => {
    const W = window.__WFED;
    const wrap = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    W.state.view = { x: 0, y: 0, scale: 1 }; W.applyView(); W.updatePositions();
    const a = { x: wrap.left + 500, y: wrap.top + 300 }, b = { x: wrap.left + 700, y: wrap.top + 300 };
    window.__G.send('pointerdown', 31, a.x, a.y, { pointerType: 'touch' });
    window.__G.send('pointerdown', 32, b.x, b.y, { pointerType: 'touch' });
    window.__G.send('pointermove', 31, a.x - 200, a.y, { pointerType: 'touch' });
    window.__G.send('pointermove', 32, b.x + 200, b.y, { pointerType: 'touch' });
    const sAfterPinch = W.state.view.scale;
    window.__G.send('pointerup', 32, b.x + 200, b.y, { pointerType: 'touch' });
    const vAfterUp = { x: W.state.view.x, y: W.state.view.y, scale: W.state.view.scale };
    const mode = W.state.gestureInfo().mode;
    // 剩下一指继续移动 → 应该是平移，且 scale 不再变
    window.__G.send('pointermove', 31, a.x - 200 + 60, a.y - 40, { pointerType: 'touch' });
    const vMove = { x: W.state.view.x, y: W.state.view.y, scale: W.state.view.scale };
    window.__G.send('pointerup', 31, a.x - 140, a.y - 40, { pointerType: 'touch' });
    return { sAfterPinch, vAfterUp, mode, vMove };
  });
  mark('C4 捏合中抬起一指 → mode=' + c4.mode + '，scale ' + c4.sAfterPinch.toFixed(2) + ' → ' + c4.vMove.scale.toFixed(2));
  T('抬起一指后不退化成缩放', Math.abs(c4.vMove.scale - c4.sAfterPinch) < 1e-6);
  T('抬起一指后变成平移（view 有位移）',
    Math.abs(c4.vMove.x - c4.vAfterUp.x) > 10 || Math.abs(c4.vMove.y - c4.vAfterUp.y) > 10);

  // C5 触屏拖拽节点后连线仍贴合
  await page.evaluate(() => { const W = window.__WFED; W.applyView(); W.updatePositions(); });
  await sleep(200);
  fit = await edgeFit();
  mark('C5 触屏操作后：maxΔout=' + fit.maxOut.toFixed(2) + ' maxΔin=' + fit.maxIn.toFixed(2));
  T('触屏拖动后连线仍贴合端口', fit.maxOut < 6 && fit.maxIn < 6);
  await page.screenshot({ path: '/tmp/wfed_touch_2_gesture.png' });

  // ================================================================ D 节点库三级
  mark('D 节点库分层');
  // D0 窄侧栏收起态：应该只露「节点库」轨道，而不是把内容压进 108px
  const d0 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setPinned(false);
    const aside = document.getElementById('wfed-lib');
    const r = aside.getBoundingClientRect();
    return {
      narrow: document.body.classList.contains('libnarrow'),
      libW: Math.round(r.width),
      innerVis: getComputedStyle(aside.querySelector('.lib-inner')).visibility,
      railDisplay: getComputedStyle(aside.querySelector('.lib-rail')).display,
      railLabel: aside.querySelector('.lib-rail .lr-txt').textContent.trim(),
    };
  });
  mark('D0 收起态：栏宽 ' + d0.libW + 'px / 内容层 ' + d0.innerVis + ' / 轨道 ' + d0.railDisplay);
  if (d0.narrow) {
    T('窄侧栏收起时只露轨道，内容层藏起来', d0.innerVis === 'hidden' && d0.railDisplay === 'flex',
      d0.libW + 'px · ' + d0.railDisplay + ' · 标签「' + d0.railLabel + '」');
  } else {
    T('宽侧栏直接铺满内容', d0.innerVis === 'visible', d0.libW + 'px');
  }

  await page.evaluate(() => window.__WFED.setLib({ cat: 'all', dev: null, filter: 'all' }));
  await sleep(300);

  const d1 = await page.evaluate(() => ({
    cats: [].map.call(document.querySelectorAll('#lib-groups .lib-cat'), b => b.dataset.cat + ':' + b.querySelector('.lc-t').textContent),
    drivers: [].map.call(document.querySelectorAll('#lib-groups .lib-drv'), d => ({
      id: d.querySelector('.ld-id').textContent, name: d.querySelector('.ld-name').textContent,
      n: d.querySelector('.ld-n').textContent,
    })),
    actsVisible: document.querySelectorAll('#lib-groups .lib-act').length,
    seps: [].map.call(document.querySelectorAll('#lib-groups .lib-cat-sep'), s => s.textContent.replace(/\d+$/, '')),
  }));
  mark('D1 类别 ' + d1.cats.length + ' 个 / 驱动 ' + d1.drivers.length + ' 行 / 可见节点 ' + d1.actsVisible + ' 个');
  T('有功能类别 chips', d1.cats.length === 6, d1.cats.join(' '));
  T('默认视图只列设备驱动，不把节点平铺出来', d1.actsVisible === 0, '可见节点 ' + d1.actsVisible);
  T('13 行驱动（12 台设备 + 特殊节点，gn_stack 作为别名合并）', d1.drivers.length === 13,
    d1.drivers.map(d => d.id).join(','));
  T('「全部」视图按功能类别插小标题（无重复段）', d1.seps.length === 5, d1.seps.join(' / '));
  console.log('   驱动：' + d1.drivers.map(d => d.name + '(' + d.n.replace(/\s+/g, '') + ')').join(' · '));

  // 点数守恒：所有驱动的节点数之和 == 149 - 别名重复 + 特殊节点
  const d2 = await page.evaluate(() => {
    const W = window.__WFED;
    let sum = 0, per = [];
    W.libDrivers('all').forEach(d => { sum += d.actions; per.push(d.id + '=' + d.actions); });
    return { sum, per, devices: W.LIB.devices.length, libTotal: W.LIB.devices.reduce((s, d) => s + d.actions.length, 0) };
  });
  mark('D2 节点数守恒：驱动合计 ' + d2.sum + '（库内 ' + d2.libTotal + ' − 别名 7 + 特殊 5）');
  T('分层后节点总数与节点库一致', d2.sum === d2.libTotal - 7 + 5, d2.per.join(' '));

  // 点类别 → 只剩该类别的驱动
  const d3 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'thermal', dev: null });
    const rows = [].map.call(document.querySelectorAll('#lib-groups .lib-drv'), d => d.querySelector('.ld-id').textContent);
    W.setLib({ cat: 'liquid', dev: null });
    const rows2 = [].map.call(document.querySelectorAll('#lib-groups .lib-drv'), d => d.querySelector('.ld-id').textContent);
    return { thermal: rows, liquid: rows2 };
  });
  mark('D3 切换类别：温控=[' + d3.thermal.join(',') + '] 离心配液=[' + d3.liquid.join(',') + ']');
  T('选「温控热处理」只列 3 个温控驱动', d3.thermal.length === 3 &&
    d3.thermal.every(x => /oven|liquid_cooling/.test(x)), d3.thermal.join(','));
  T('选「离心配液」只列 3 个对应驱动', d3.liquid.length === 3, d3.liquid.join(','));

  // 钻进驱动 → 只看到该驱动的节点 + 有返回按钮
  const d4 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'liquid', dev: null });
    const names = [].map.call(document.querySelectorAll('#lib-groups .lib-drv .ld-id'), d => d.textContent);
    const idx = names.indexOf('gn_centrifuge_tube_liquid_handling');
    document.querySelectorAll('#lib-groups .lib-drv')[idx].click();
    return {
      acts: document.querySelectorAll('#lib-groups .lib-act').length,
      hasBack: !!document.querySelector('#lib-groups .ln-back'),
      head: (document.querySelector('#lib-groups .lib-nhead') || {}).textContent,
      metaShown: (() => {
        const m = document.querySelector('#lib-groups .ln-meta');
        return m ? getComputedStyle(m).display !== 'none' : false;
      })(),
      desc: !!(document.querySelector('#lib-groups .lib-ndesc')),
      codes: [].slice.call(document.querySelectorAll('#lib-groups .lib-act .la-code')).slice(0, 4).map(x => x.textContent),
      states: W.libState(),
    };
  });
  mark('D4 钻进离心管液体处理：' + d4.acts + ' 个节点 / 返回键=' + d4.hasBack + ' / 头部「' + d4.head + '」');
  T('钻进驱动后只显示该驱动的节点', d4.acts === 49, d4.acts + ' 个');
  T('出现「← 返回」按钮', d4.hasBack);
  T('头部显示驱动名 + 协议 + 节点数', /离心管液体处理/.test(d4.head) && /Tube_/.test(d4.head), d4.head);
  T('窄侧栏下协议/节点数收进悬停层（有意为之）',
    await page.evaluate(shown => document.body.classList.contains('libnarrow') !== shown, d4.metaShown),
    'libnarrow=' + await page.evaluate(() => document.body.classList.contains('libnarrow')) + ' meta可见=' + d4.metaShown);
  T('节点带指令号徽标', d4.codes.some(c => /^#\d+$/.test(c)), d4.codes.join(' '));

  // 返回
  const d5 = await page.evaluate(() => {
    document.querySelector('#lib-groups .ln-back').click();
    return {
      drivers: document.querySelectorAll('#lib-groups .lib-drv').length,
      acts: document.querySelectorAll('#lib-groups .lib-act').length,
      st: window.__WFED.libState(),
    };
  });
  mark('D5 点返回 → 回到驱动列表（' + d5.drivers + ' 行）');
  T('返回后回到设备驱动列表', d5.drivers === 3 && d5.acts === 0 && d5.st.dev === null);

  // 搜索跨层平铺
  const d6 = await page.evaluate(async () => {
    const W = window.__WFED;
    W.setLib({ cat: 'all', dev: null });
    const inp = document.getElementById('lib-search');
    inp.value = '离心';
    W.renderLib();
    const r1 = {
      groups: document.querySelectorAll('#lib-groups .lib-cat-sep').length,
      acts: document.querySelectorAll('#lib-groups .lib-act').length,
      hint: (document.querySelector('#lib-groups .lib-search-hint') || {}).innerText,
      names: [].map.call(document.querySelectorAll('#lib-groups .lib-cat-sep'), s => s.textContent),
    };
    inp.value = '#3';
    W.renderLib();
    const r2 = { acts: document.querySelectorAll('#lib-groups .lib-act').length };
    inp.value = 'zzzz不存在zzzz';
    W.renderLib();
    const r3 = { none: !!document.querySelector('#lib-groups .lib-none'), acts: document.querySelectorAll('#lib-groups .lib-act').length };
    inp.value = '';
    W.renderLib();
    return { r1, r2, r3, back: document.querySelectorAll('#lib-groups .lib-drv').length };
  });
  mark('D6 搜索「离心」：' + d6.r1.groups + ' 个驱动分组 / ' + d6.r1.acts + ' 个节点');
  T('搜索时跨层平铺并按驱动分组', d6.r1.groups >= 2 && d6.r1.acts > 50, d6.r1.hint);
  T('搜索「#3」能按指令号命中', d6.r2.acts > 0, d6.r2.acts + ' 个');
  T('无结果时给出空态提示', d6.r3.none && d6.r3.acts === 0);
  T('清空搜索后回到驱动列表', d6.back === 13, d6.back + ' 行');

  // ＋ 追加节点
  const d7 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'weigh', dev: null });
    document.querySelectorAll('#lib-groups .lib-drv')[0].click();
    const before = W.state.wf.data.nodes.length;
    document.querySelector('#lib-groups .lib-act .la-add').click();
    return { before, after: W.state.wf.data.nodes.length };
  });
  mark('D7 点「＋」追加节点：' + d7.before + ' → ' + d7.after);
  T('「＋」能把节点加到画布', d7.after === d7.before + 1);
  await page.screenshot({ path: '/tmp/wfed_touch_3_lib.png' });

  // 特殊节点
  const d8 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'system', dev: '__special__' });
    return {
      acts: [].map.call(document.querySelectorAll('#lib-groups .lib-act'), a => a.dataset.label + '/' + a.dataset.special),
      names: W.libNodes('__special__').map(x => x.label),
    };
  });
  mark('D8 特殊节点：' + d8.names.join(' · '));
  T('特殊节点含分组 + 4 个真实脚本节点', d8.names.length === 5 && d8.names[0] === '流程分组 Group', d8.names.join(','));
  T('特殊节点不与「全部」里的其它驱动重复', d8.acts.length === 5);

  // ================================================================ E. 协议点位
  // 数据源：OPC_UA协议1.4.0(2).xlsx「点位表」→ scripts/gn_opcua_points.py → gn_node_library.js
  // 注意：窄侧栏未固定展开时 `.lib-inner` 是 visibility:hidden（有意为之，见 wfed.css），
  // 此时 innerText 一律读成空串。所有「读文本」的断言都要先钉住侧栏。
  await page.evaluate(() => window.__WFED.setPinned(true));
  const e0 = await page.evaluate(() => {
    const W = window.__WFED;
    const ds = W.LIB.devices.filter(d => (d.points || []).length);
    const uniq = {};
    W.LIB.devices.forEach(d => { uniq[d.id] = (d.points || []).length; });
    return {
      devices: W.LIB.devices.length,
      withPoints: ds.length,
      total: W.LIB.protocol.pointTotal,
      sumAll: W.LIB.devices.reduce((s, d) => s + (d.points || []).length, 0),
      modules: W.LIB.protocol.modules.length,
      src: W.LIB.protocol.source,
      p140: W.LIB.devices.filter(d => d.id === 'gn_locking_mechanism')[0].points.length,
      pStack: W.libPoints('gn_rotary_stack').length,
      pRobot: W.libPoints('gn_robotic_arm').length,
      pStackAlias: W.libPoints('gn_stack').length,
      stats: W.libPointStats('gn_centrifuge'),
      per: uniq,
    };
  });
  mark('E0 点位总览：' + e0.total + ' 个点位 / ' + e0.withPoints + '/' + e0.devices + ' 个驱动有点位');
  T('协议点位总数 = 240（去别名 / 已滤掉 7 行表内残留）', e0.total === 240, 'pointTotal=' + e0.total);
  T('13 个模块 + 12 个驱动挂到点位（PRCXI 无协议点位）',
    e0.modules === 13 && e0.withPoints === 12, 'modules=' + e0.modules + ' withPoints=' + e0.withPoints);
  T('别名副本计入后合计 250（gn_stack 复用 Stack_）', e0.sumAll === 250, 'sum=' + e0.sumAll);
  T('源标注指向 (2) 修订版', /1\.4\.0\(2\)\.xlsx/.test(e0.src), e0.src);
  T('按表内真实点位数：锁紧 23 / 堆栈 10 / 机械手 22', e0.p140 === 23 && e0.pStack === 10 && e0.pRobot === 22,
    '锁紧=' + e0.p140 + ' 堆栈=' + e0.pStack + ' 机械手=' + e0.pRobot);
  T('gn_stack 与 gn_rotary_stack 点位一一相同',
    e0.pStackAlias === e0.pStack && e0.pStackAlias === 10, 'gn_stack=' + e0.pStackAlias);
  T('libPointStats 返回读写拆分', e0.stats && e0.stats.total === 16 && e0.stats.r === 3 && e0.stats.w === 13,
    JSON.stringify(e0.stats));

  // 钻进「离心机」→ 协议点位块（默认折叠，点开后才是明细；且排在动作列表之前）
  const e1 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'liquid', dev: 'gn_centrifuge' });
    const blk0 = document.querySelector('#lib-groups .lib-pts');
    const defOff = blk0 && blk0.classList.contains('off');
    const defRows = document.querySelectorAll('#lib-groups .lib-pt').length;
    // DOM 顺序：点位块必须排在动作列表之前（否则 49 个动作会把它挤到屏外）
    const kids = [].map.call(document.querySelector('#lib-groups > .lib-pane-nodes').children,
      c => (c.className || '').split(/\s+/)[0]);
    const h = document.querySelector('#lib-groups .lib-pts-h');
    h.click();
    const block = document.querySelector('#lib-groups .lib-pts');
    const rows = document.querySelectorAll('#lib-groups .lib-pt');
    const first = rows[0];
    return {
      hasBlock: !!block, defOff, defRows,
      off: block.classList.contains('off'),
      order: kids.join(' > '),
      ptsBeforeActs: kids.indexOf('lib-pts') >= 0 && kids.indexOf('lib-pts') < kids.indexOf('lib-nacts'),
      head: h.innerText.replace(/\n/g, ' '),
      rows: rows.length,
      firstName: first.querySelector('.lp-n').innerText,
      firstNode: first.querySelector('.lp-node').innerText,
      firstRw: first.querySelector('.lp-rw').innerText,
      tags: [].map.call(document.querySelectorAll('#lib-groups .lib-pt .lp-rw'), t => t.innerText)
        .reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {}),
      paneHead: (document.querySelector('#lib-groups .ln-meta') || {}).innerText,
      widened: document.getElementById('wfed-lib').className,
    };
  });
  mark('E1 离心机协议点位块：默认折叠(' + e1.defOff + ') → 展开 ' + e1.rows + ' 行 · ' + (e1.head || '').slice(0, 22));
  T('钻进驱动后出现「协议点位」块，且默认折叠不抢动作列表',
    e1.hasBlock && e1.defOff && e1.defRows === 0);
  T('点位块排在动作列表之前', e1.ptsBeforeActs, e1.order);
  T('离心机点位 16 行且首行为 Centrifuge_YPosFB',
    e1.rows === 16 && e1.firstNode === 'Centrifuge_YPosFB', e1.rows + ' 行 · ' + e1.firstNode);
  T('点位行显示中文名 + R/W 徽标', e1.firstName === 'Y位置反馈' && e1.firstRw === 'R',
    e1.firstName + ' / ' + e1.firstRw);
  T('R/W 徽标数量与 pointStats 一致（R3 W13）',
    e1.tags.R === 3 && e1.tags.W === 13, JSON.stringify(e1.tags));
  T('抽屉头部显示协议 + 动作数 + 点位数',
    /Centrifuge_\s*·\s*11\/11\s*·\s*点位 16/.test(e1.paneHead), e1.paneHead);
  T('展开时侧栏进入 pts-open（内容常显 + 浮出加宽）', /\bpts-open\b/.test(e1.widened), e1.widened);
  await page.screenshot({ path: '/tmp/lib_6_points.png' });

  // 折叠 / 展开
  const e2 = await page.evaluate(async () => {
    const W = window.__WFED;
    const h = document.querySelector('#lib-groups .lib-pts-h');
    h.click();
    const collapsed = {
      off: document.querySelector('#lib-groups .lib-pts').classList.contains('off'),
      vis: getComputedStyle(document.querySelector('#lib-groups .lib-pts-b')).display,
    };
    document.querySelector('#lib-groups .lib-pts-h').click();
    const back = {
      off: document.querySelector('#lib-groups .lib-pts').classList.contains('off'),
      vis: getComputedStyle(document.querySelector('#lib-groups .lib-pts-b')).display,
      rows: document.querySelectorAll('#lib-groups .lib-pt').length,
    };
    return { collapsed, back };
  });
  mark('E2 折叠/展开：off=' + e2.collapsed.off + ' → 展开 ' + e2.back.rows + ' 行');
  T('点头部能折叠（内容 display:none）', e2.collapsed.off && e2.collapsed.vis === 'none');
  T('再点能展开且点位行完整', !e2.back.off && e2.back.vis !== 'none' && e2.back.rows === 16);

  // 点位过滤框
  const e3 = await page.evaluate(() => {
    const rows = () => document.querySelectorAll('#lib-groups .lib-pt').length;
    const all = rows();
    const inp = document.querySelector('#lib-groups .lib-pts-q input');
    const fire = v => {
      inp.value = v;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return rows();
    };
    const fb = fire('FB');
    const cmd = fire('CmdTrig');
    const zzz = fire('zzz不存在zzz');
    const none = !!document.querySelector('#lib-groups .lib-pts-b .lib-none');
    fire('');
    return { all, fb, cmd, zzz, none, reset: rows(), footer: (document.querySelector('#lib-groups .lib-pts-f') || {}).innerText };
  });
  mark('E3 点位过滤：全部 ' + e3.all + ' → 「FB」' + e3.fb + ' → 「CmdTrig」' + e3.cmd + ' → 清空 ' + e3.reset);
  T('点位过滤：全部 16 → 「FB」只剩反馈点位（3）', e3.all === 16 && e3.fb === 3, 'FB=' + e3.fb);
  T('点位过滤：NodeId 也能命中（CmdTrig → 1）', e3.cmd === 1, 'CmdTrig=' + e3.cmd);
  T('点位过滤无结果时给空态', e3.zzz === 0 && e3.none);
  T('清空过滤后恢复全部', e3.reset === 16 && /16 个点位/.test(e3.footer || ''), e3.footer);

  // 多模块设备（system：总复位 / 停止 / 报错信息）打模块小标题
  const e4 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'system', dev: 'system' });
    document.querySelector('#lib-groups .lib-pts-h').click();   // 默认折叠 → 展开
    return {
      rows: document.querySelectorAll('#lib-groups .lib-pt').length,
      grps: [].map.call(document.querySelectorAll('#lib-groups .lib-pgrp'), g => g.innerText),
      nodes: [].map.call(document.querySelectorAll('#lib-groups .lib-pt .lp-node'), g => g.innerText),
      offAfter: document.getElementById('wfed-lib').className,
    };
  });
  mark('E4 system 点位：' + e4.rows + ' 行 · 模块 ' + e4.grps.join('/'));
  T('system 合并 3 个模块共 5 个点位', e4.rows === 5, e4.rows + ' 行');
  T('system 按模块打小标题（总复位/停止/报错信息）',
    e4.grps.join(',') === '总复位,停止,报错信息', e4.grps.join(','));
  T('system 含 Device_error（报错信息模块）', e4.nodes.indexOf('Device_error') >= 0, e4.nodes.join(','));

  // 搜索也能命中协议点位
  const e5 = await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'all', dev: null });
    const inp = document.getElementById('lib-search');
    inp.value = 'Scale_weight';
    W.renderLib();
    const r = {
      hint: (document.querySelector('#lib-groups .lib-search-hint') || {}).innerText,
      pts: document.querySelectorAll('#lib-groups .lib-pt').length,
      nodes: [].map.call(document.querySelectorAll('#lib-groups .lib-pt .lp-node'), x => x.innerText),
    };
    inp.value = '紧急停止';
    W.renderLib();
    r.r2 = document.querySelectorAll('#lib-groups .lib-pt').length;
    r.r2n = [].map.call(document.querySelectorAll('#lib-groups .lib-pt .lp-node'), x => x.innerText);
    inp.value = '';
    W.renderLib();
    return r;
  });
  mark('E5 搜索命中点位：Scale_weight→' + e5.pts + ' / 紧急停止→' + e5.r2);
  T('搜索命中提示区分「节点 / 协议点位」', /协议点位/.test(e5.hint || ''), e5.hint);
  T('搜 NodeId 能命中点位（scale_weight）',
    e5.nodes.indexOf('scale_weight') >= 0, e5.nodes.join(','));
  T('搜中文说明能命中点位（紧急停止 → Robot_Emergency_stop_condition）',
    e5.r2n.some(n => n.indexOf('Robot_Emergency_stop') === 0), e5.r2n.join(','));
  await page.evaluate(() => {
    const W = window.__WFED;
    W.setLib({ cat: 'liquid', dev: 'gn_centrifuge_tube_liquid_handling' });
  });
  await page.screenshot({ path: '/tmp/lib_7_pts_tube.png' });

  // ================================================================ F 导入工作流
  // 覆盖：面板开关 / 4 种来源格式归一 / 未知设备与动作体检 / 非法 JSON 不伤画布
  //       / 替换 / 追加（uuid 不冲突 + 坐标不重叠 + 边重映射）/ 拖放导入 / 非 JSON 拒绝
  const nodeCount = () => page.evaluate(() => window.__WFED.state.wf.data.nodes.length);
  const edgeCount = () => page.evaluate(() => window.__WFED.state.wf.data.edges.length);
  const clickImport = (id) => page.evaluate(i => document.getElementById(i).click(), id);
  // askConfirm 是同步插入的非阻塞卡片：点完按钮立刻就能拿到，直接点掉
  const okConfirm = () => page.evaluate(() => {
    const b = document.querySelector('.wfed-note.m-ask .wn-ok');
    if (!b) return false;
    b.click(); return true;
  });
  // 一份固定的 2 节点 / 1 连线工作流，用来做替换 / 追加的数量基线
  const BASE_WF = {
    target_lab_uuid: 'lab-test', name: '导入基线',
    data: {
      workflow_uuid: 'base-uuid', workflow_name: '导入基线',
      nodes: [
        { uuid: 'b1', name: 'auto-execute_command', type: 'ILab', device_name: 'gn_locking_mechanism',
          param: { cmd_type: 1 }, pose: { position: { x: 0, y: 0, z: 0 } } },
        { uuid: 'b2', name: 'auto-execute_command', type: 'ILab', device_name: 'gn_centrifuge',
          param: { cmd_type: 1 }, pose: { position: { x: 320, y: 0, z: 0 } } },
      ],
      edges: [{ source_node_uuid: 'b1', target_node_uuid: 'b2' }],
    },
  };

  mark('F1 导入面板开关（与「打开」互斥）');
  await page.evaluate(() => { window.__WFED.setPinned(false); });
  await clickImport('btn-import');
  await sleep(150);
  const f1a = await page.evaluate(() => ({
    imp: !document.getElementById('import-menu').classList.contains('hidden'),
    open: !document.getElementById('open-menu').classList.contains('hidden'),
  }));
  await clickImport('btn-open');
  await sleep(150);
  const f1b = await page.evaluate(() => ({
    imp: !document.getElementById('import-menu').classList.contains('hidden'),
    open: !document.getElementById('open-menu').classList.contains('hidden'),
  }));
  T('点「导入」弹出导入面板、且不残留「打开」面板', f1a.imp && !f1a.open);
  T('点「打开」会关掉导入面板（两个下拉互斥）', f1b.open && !f1b.imp);

  mark('F2 四种来源格式归一（parseWorkflow）');
  const f2 = await page.evaluate((wf, sampleText) => {
    const W = window.__WFED, out = {};
    function fmt(t) { try { return W.parseWorkflow(t).fmt; } catch (e) { return 'ERR:' + e.message; } }
    out.editor = fmt(JSON.stringify(wf));
    out.unilab = fmt(sampleText);
    out.bare = fmt(JSON.stringify({ nodes: wf.data.nodes, edges: wf.data.edges }));
    out.arr = fmt(JSON.stringify(wf.data.nodes));
    // 平台原生导出没有 workflow_uuid，应被补上并记入 fixes
    const p = W.parseWorkflow(sampleText);
    out.unilabFixes = p.fixes.join(' | ');
    out.unilabHasUuid = !!p.wf.data.workflow_uuid;
    out.bad = (() => { try { W.parseWorkflow('{ 坏掉的 '); return 'NO-THROW'; } catch (e) { return e.message; } })();
    return out;
  }, BASE_WF, fs.readFileSync(SAMPLE, 'utf8'));
  T('本编辑器导出 → 识别为 editor', f2.editor === 'editor', f2.editor);
  T('Uni-Lab OS 原生 → 识别为 unilab', f2.unilab === 'unilab', f2.unilab);
  T('裸 {nodes,edges} → 识别为 bare', f2.bare === 'bare', f2.bare);
  T('节点数组 → 识别为 nodes', f2.arr === 'nodes', f2.arr);
  T('原生导出缺 workflow_uuid 会被补上并记入修复项',
    f2.unilabHasUuid && /workflow_uuid/.test(f2.unilabFixes), f2.unilabFixes);
  T('非法 JSON 抛出可读的语法错误', /语法错误/.test(f2.bad), f2.bad.slice(0, 60));

  mark('F3 导入体检：未知设备 / 未知指令号必须点名');
  const f3 = await page.evaluate((wf) => {
    const W = window.__WFED;
    const bad = JSON.parse(JSON.stringify(wf));
    bad.data.nodes.push({ uuid: 'b3', name: 'auto-execute_command', type: 'ILab',
      device_name: 'gn_not_exist_xyz', param: { cmd_type: 1 }, pose: { position: { x: 0, y: 200, z: 0 } } });
    bad.data.nodes.push({ uuid: 'b4', name: 'auto-execute_command', type: 'ILab',
      device_name: 'gn_centrifuge', param: { cmd_type: 9999 }, pose: { position: { x: 320, y: 200, z: 0 } } });
    const p = W.parseWorkflow(JSON.stringify(bad));
    return {
      unknown: p.info.unknown.length,
      whys: p.info.unknown.map(u => u.why).join(' | '),
      kinds: p.info.unknown.map(u => u.kind).join(','),
      devs: p.info.devs.length,
      unknownDev: p.info.devs.filter(d => !d.known).map(d => d.id),
      matched: p.info.nCmd + p.info.nName,
    };
  }, BASE_WF);
  T('2 个坏节点都被列为未匹配', f3.unknown === 2, 'unknown=' + f3.unknown);
  T('未知名给出「无驱动」原因', /不在 1.4.0 节点库/.test(f3.whys), f3.whys.slice(0, 70));
  T('未知指令号给出 cmd_type 原因', /cmd_type=9999/.test(f3.whys), f3.whys.slice(0, 90));
  T('好节点仍算作已匹配', f3.matched === 2, 'matched=' + f3.matched);
  T('未知设备在设备清单里标成无驱动', f3.unknownDev.join(',') === 'gn_not_exist_xyz', f3.unknownDev.join(','));
  T('未匹配项带类型标记（no-device / no-action）',
    f3.kinds === 'no-device,no-action', f3.kinds);

  mark('F3b 节点库没收录的动作 → 拿去问后端（ch8_aspirate 后端其实有）');
  // 编辑器节点库的动作表只来自 1.4.0「指令表」（cmdType 驱动）；离心管的 ch8_aspirate
  // 这类宏动作靠**方法名**执行，节点库里没有 → 必须向后端核对，否则会误报「跑不动」。
  const f3b = await page.evaluate(async (sampleText) => {
    const W = window.__WFED;
    document.getElementById('import-menu').classList.remove('hidden');
    document.getElementById('import-text').value = sampleText;
    // import-parse 是同步链路：解析 → 渲染预览 → 发起后端核对请求。
    // 这里同步抓首次渲染的文案，用来验证「没核对完之前不下结论」。
    document.getElementById('import-parse').click();
    const res = W.pendingImport();
    const pick = r => (r.info.unknown.filter(u => (u.node.name || '') === 'auto-ch8_aspirate')[0] || {});
    const before = pick(res);
    const initialText = document.getElementById('import-preview').innerText;
    const initialPending = !!res._verifying;
    for (let i = 0; i < 80 && !res._verified; i++) await new Promise(r => setTimeout(r, 100));
    const after = pick(res);
    return {
      kind: before.kind, action: before.action,
      initialPending: initialPending,
      initialText: initialText,
      verified: !!res._verified,
      verdictAfter: after.backend,
      finalText: document.getElementById('import-preview').innerText,
    };
  }, fs.readFileSync(SAMPLE, 'utf8'));
  T('ch8_aspirate 被归为「节点库未收录」而不是「设备不存在」',
    f3b.kind === 'no-action' && f3b.action === 'ch8_aspirate', f3b.kind + '/' + f3b.action);
  T('首次渲染处于「核对中」态，不提前判死刑',
    f3b.initialPending && /核对/.test(f3b.initialText),
    f3b.initialText.replace(/\n/g, ' / ').slice(0, 110));
  T('首次渲染里没有「后端跑不动」的红字',
    !/后端跑不动/.test(f3b.initialText));
  T('核对请求确实发出并完成', f3b.verified);
  T('后端确认驱动里有该动作 → 判为「后端可执行」', f3b.verdictAfter === 'yes', f3b.verdictAfter);
  T('核对后预览改成「后端驱动里有」，不再是红色警告',
    /后端驱动里有/.test(f3b.finalText) && !/后端跑不动/.test(f3b.finalText),
    f3b.finalText.replace(/\n/g, ' / ').slice(0, 110));

  mark('F4 非法 JSON 走 UI：给错误提示且不动画布');
  const beforeBad = await nodeCount();
  await clickImport('btn-import');
  await page.evaluate(() => { document.getElementById('import-text').value = '{ 这不是 json'; });
  await clickImport('import-parse');
  await sleep(200);
  const f4 = await page.evaluate(() => ({
    err: !!document.querySelector('.wfed-note.n-err'),
    prevHidden: document.getElementById('import-preview').classList.contains('hidden'),
    nodes: window.__WFED.state.wf.data.nodes.length,
  }));
  T('给出红色错误卡（不是静默失败）', f4.err);
  T('解析失败时预览保持隐藏，不显示半截结果', f4.prevHidden);
  T('解析失败不改动画布', f4.nodes === beforeBad, beforeBad + ' → ' + f4.nodes);

  mark('F5 替换画布（经预览按钮 + 确认卡）');
  await page.evaluate((wf) => {
    document.getElementById('import-text').value = JSON.stringify(wf);
  }, BASE_WF);
  await clickImport('import-parse');
  await sleep(200);
  const f5pre = await page.evaluate(() => {
    const b = document.getElementById('import-preview');
    return { open: !b.classList.contains('hidden'), text: b.innerText,
      stats: [].map.call(b.querySelectorAll('.imp-stat .is-v'), e => e.innerText),
      hasReplace: !!document.getElementById('import-replace'),
      hasAppend: !!document.getElementById('import-append') };
  });
  T('解析成功后面板给出导入预览', f5pre.open);
  // 预览四格：节点 / 连线 / 设备 / 动作匹配
  T('预览统计为 2 节点 · 1 连线 · 2 设备 · 2 动作匹配',
    f5pre.stats.join(',') === '2,1,2,2', f5pre.stats.join(','));
  T('预览提供「替换画布」与「追加到当前画布」两个动作',
    f5pre.hasReplace && f5pre.hasAppend);
  await clickImport('import-replace');
  await sleep(120);
  const confirmed = await okConfirm();
  await sleep(400);
  const f5 = { nodes: await nodeCount(), edges: await edgeCount(), confirmed: confirmed };
  T('替换后有确认卡（画布非空时必须先问）', f5.confirmed);
  T('替换画布：节点数 = 导入的 2 个', f5.nodes === 2, 'nodes=' + f5.nodes);
  T('替换画布：连线数 = 导入的 1 条', f5.edges === 1, 'edges=' + f5.edges);

  mark('F6 追加到当前画布（uuid 不冲突 / 坐标不重叠 / 边重映射）');
  const beforeAdd = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes;
    return { ids: n.map(x => x.uuid), maxX: Math.max.apply(null, n.map(x => x.pose.position.x)) };
  });
  await clickImport('btn-import');
  await page.evaluate((wf) => { document.getElementById('import-text').value = JSON.stringify(wf); }, BASE_WF);
  await clickImport('import-parse');
  await sleep(200);
  await clickImport('import-append');
  await sleep(400);
  const f6 = await page.evaluate((prev) => {
    const n = window.__WFED.state.wf.data.nodes, e = window.__WFED.state.wf.data.edges;
    const ids = n.map(x => x.uuid);
    const added = n.filter(x => prev.ids.indexOf(x.uuid) < 0);
    return {
      nodes: n.length, edges: e.length,
      unique: new Set(ids).size === ids.length,
      keptOld: prev.ids.every(id => ids.indexOf(id) >= 0),
      addedMinX: Math.min.apply(null, added.map(x => x.pose.position.x)),
      prevMaxX: prev.maxX,
      added: added.length,
    };
  }, beforeAdd);
  T('追加后节点数 = 原 2 + 新 2', f6.nodes === 4, 'nodes=' + f6.nodes);
  T('追加后连线数 = 1 + 1（边随节点重映射）', f6.edges === 2, 'edges=' + f6.edges);
  T('追加后所有 uuid 唯一（没有覆盖原有节点）', f6.unique && f6.keptOld);
  T('追加的节点整体右移，不与原节点重叠',
    f6.addedMinX > f6.prevMaxX, 'newMinX=' + f6.addedMinX + ' > 原 maxX=' + f6.prevMaxX);

  mark('F7 把 .json 拖到画布即导入');
  const f7 = await page.evaluate((wf) => {
    function dtWith(name, text, type) {
      const dt = new DataTransfer();
      dt.items.add(new File([text], name, { type: type }));
      return dt;
    }
    const good = dtWith('flow.json', JSON.stringify(wf), 'application/json');
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: good, bubbles: true }));
    const shown = document.getElementById('wfed-drop').classList.contains('on');
    window.dispatchEvent(new DragEvent('dragover', { dataTransfer: good, bubbles: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: good, bubbles: true }));
    return { shown: shown, good: !!good };
  }, BASE_WF);
  await sleep(500);
  const f7b = await page.evaluate(() => ({
    hidden: !document.getElementById('wfed-drop').classList.contains('on'),
    preview: !document.getElementById('import-preview').classList.contains('hidden'),
    previewText: document.getElementById('import-preview').innerText,
  }));
  T('拖入文件时画布出现拖放高亮', f7.shown);
  T('松手后高亮消失（不留残影）', f7b.hidden);
  T('松手后自动弹出导入预览', f7b.preview, f7b.previewText.replace(/\n/g, ' / ').slice(0, 70));

  mark('F8 拖入非 JSON 文件被拒（画布不变）');
  const beforeTxt = await nodeCount();
  const f8 = await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['hello'], 'note.txt', { type: 'text/plain' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
    return true;
  });
  await sleep(400);
  const f8b = await page.evaluate(() => ({
    warn: !!document.querySelector('.wfed-note.n-warn'),
    nodes: window.__WFED.state.wf.data.nodes.length,
    dropHidden: !document.getElementById('wfed-drop').classList.contains('on'),
    // 诊断用：把当时所有提示卡的类名 + 标题带出来，失败时能直接看出走了哪条分支
    notes: [].map.call(document.querySelectorAll('.wfed-note'),
      e => e.className.replace('wfed-note', '').trim() + ':' +
        ((e.querySelector('.wn-title') || {}).innerText || '')),
  }));
  T('拖入 .txt 给黄色提示而不是崩掉', f8b.warn, f8b.notes.join(' | '));
  T('拖入 .txt 不改动画布', f8b.nodes === beforeTxt, beforeTxt + ' → ' + f8b.nodes);
  T('拖入非法文件后拖放层也收起', f8b.dropHidden);
  await page.evaluate(() => {
    document.getElementById('import-menu').classList.add('hidden');
    const p = document.getElementById('import-preview'); p.innerHTML = ''; p.classList.add('hidden');
    document.getElementById('import-text').value = '';
  });

  // 收尾截图：把库停在常用状态
  await page.evaluate(() => { window.__WFED.setPinned(false); window.__WFED.setLib({ cat: 'all', dev: null }); });
  await page.screenshot({ path: '/tmp/wfed_touch_4_final.png' });
  await browser.close();

  console.log('\n================ 结果 ================');
  report.forEach(r => console.log(r));
  const nf = report.filter(r => r.startsWith('[FAIL]')).length;
  console.log(`\n共 ${report.length} 项，失败 ${nf} 项 · 总耗时 ${((Date.now() - T0) / 1000).toFixed(1)}s`);
  console.log('截图：/tmp/wfed_touch_{1..4}_*.png');
  process.exit(nf ? 1 : 0);
})().catch(e => { console.error('自检异常：', e); process.exit(2); });
