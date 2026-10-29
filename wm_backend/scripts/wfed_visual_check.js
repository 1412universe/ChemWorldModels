/* wfed_visual_check.js — 用本机 Chrome（puppeteer-core）实测工作流编辑器
 *
 * 验证项：
 *   1. 控制台无报错（尤其是 wfrun.js 404 / JS 异常）
 *   2. 画布实际占屏幕总面积比例（目标 ≈80%）
 *   3. 节点卡 / 属性面板能否正常渲染
 *   4. 自动布局 + 校验可用
 *   5. 试运行 dry-run 端到端：节点变色、泳道甘特、并行度曲线、事件流
 * 说明：按钮一律用合成 element.click() 触发（走真实事件处理器），
 *       避免 CDP Input 协议在 headless 下排队超时。
 * 产出：/tmp/wfed_shot_*.png
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8000';
const SAMPLE = '/Users/fenglongli/Downloads/ChemWorldModel/wm_backend/static/assets/unilab_workflow.sample.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-dev-shm-usage',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1600, height: 1000 },
  });
  const page = await browser.newPage();
  const errors = [], bad = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  const report = [];
  const T = (name, cond, extra = '') =>
    report.push((cond ? '[PASS] ' : '[FAIL] ') + name + (extra ? '  ' + extra : ''));
  let step = 0;
  const mark = s => console.log(`[${String(++step).padStart(2)}] ${s}  (+${((Date.now() - T0) / 1000).toFixed(1)}s)`);
  const T0 = Date.now();

  // 所有按钮点击走合成事件
  const click = sel => page.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) throw new Error('未找到 ' + s);
    e.click();
  }, sel);

  mark('打开编辑器');
  await page.goto(BASE + '/workflow_editor', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);

  T('无 4xx 请求', bad.length === 0, bad.slice(0, 4).join(' | '));
  T('无控制台报错', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: '/tmp/wfed_shot_1_empty.png' });

  // ---------- 画布占比 ----------
  const share = await page.evaluate(() => {
    const r = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    return {
      pct: +((r.width * r.height) / (window.innerWidth * window.innerHeight) * 100).toFixed(1),
      w: Math.round(r.width), h: Math.round(r.height),
      vw: window.innerWidth, vh: window.innerHeight,
      label: (document.getElementById('wf-share') || {}).textContent,
    };
  });
  mark('画布占比 ' + JSON.stringify(share));
  T('画布占屏幕面积 ≈80%', share.pct >= 79, share.label);

  // ---------- 载入真实工作流 ----------
  mark('载入示例工作流');
  const wf = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
  await page.evaluate(w => window.__WFED.openWorkflow(w), wf);
  await sleep(800);
  const nCards = await page.evaluate(() => document.querySelectorAll('#wfed-canvas .wfnode').length);
  T('节点卡已渲染', nCards === wf.data.nodes.length, nCards + '/' + wf.data.nodes.length);
  await page.screenshot({ path: '/tmp/wfed_shot_2_loaded.png' });

  mark('点选节点看属性面板');
  const propInfo = await page.evaluate(() => {
    const d = document.querySelector('#wfed-canvas .wfnode');
    const r = d.getBoundingClientRect();
    const opt = {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 77, pointerType: 'mouse', isPrimary: true,
      button: 0, buttons: 1, clientX: r.left + 40, clientY: r.top + 16,
    };
    d.dispatchEvent(new PointerEvent('pointerdown', opt));
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, opt, { buttons: 0 })));
    const p = document.getElementById('props-panel');
    return {
      hidden: p.classList.contains('hidden'),
      rows: p.querySelectorAll('.param-row').length,
      secs: p.querySelectorAll('.props-sec').length,
      text: p.innerText.replace(/\n+/g, ' | ').slice(0, 300),
    };
  });
  T('属性面板渲染出参数行', !propInfo.hidden && propInfo.rows > 0,
    propInfo.rows + ' 个参数行 / ' + propInfo.secs + ' 个区块');
  console.log('   属性面板：' + propInfo.text);
  await page.screenshot({ path: '/tmp/wfed_shot_3_props.png' });

  // ---------- 自动布局 ----------
  mark('自动布局');
  await click('#btn-autolayout');
  await sleep(900);
  const nAfter = await page.evaluate(() => document.querySelectorAll('#wfed-canvas .wfnode').length);
  T('自动布局后节点仍完整', nAfter === wf.data.nodes.length, nAfter + ' 个');
  await page.screenshot({ path: '/tmp/wfed_shot_4_layout.png' });

  // ---------- 校验 ----------
  mark('校验');
  await click('#btn-validate');
  await sleep(600);
  // 校验结论走非阻塞提示卡（不再用 alert），所以从 .wfed-notes 里读
  const vtxt = await page.evaluate(() => {
    const box = document.querySelector('.wfed-notes');
    return box ? box.innerText.replace(/\n+/g, ' | ').slice(0, 260) : '(无提示卡)';
  });
  console.log('   校验输出：' + vtxt);

  // ---------- 试运行 ----------
  mark('点击 ▶ 试运行');
  // 本脚本测的是 dry-run 调度可视化。UI 已删掉「纯计时」档（顶栏只有
  // 仿真模拟 / 真机调试 两个按钮），所以直接写 wfrun.js 运行时读取的全局变量
  // —— wfrun.startRun() 正是按 window.WFED_MODE / WFED_REAL_OPTS 取档的。
  await page.evaluate(() => { window.WFED_MODE = 'dry'; window.WFED_REAL_OPTS = null; });
  await sleep(150);
  await click('#btn-dryrun');
  await sleep(1800);
  const mid = await page.evaluate(() => ({
    open: document.getElementById('wfed-run').classList.contains('open'),
    running: document.querySelectorAll('#wfed-canvas .wfnode.st-running').length,
    ready: document.querySelectorAll('#wfed-canvas .wfnode.st-ready').length,
    pending: document.querySelectorAll('#wfed-canvas .wfnode.st-pending').length,
    lanes: document.querySelectorAll('#run-lanes .run-lane').length,
    blocks: document.querySelectorAll('#run-lanes .blk').length,
    curve: !!document.getElementById('run-par-cv'),
    nowline: !!document.querySelector('#run-lanes .run-nowline'),
    sub: (document.getElementById('run-sub') || {}).textContent,
    legend: (document.getElementById('run-legend') || {}).innerText.replace(/\n/g, ' | '),
    events: document.querySelectorAll('#run-events .ev').length,
    evText: (document.getElementById('run-events') || {}).innerText.split('\n').slice(0, 3).join(' / '),
  }));
  mark('运行中：' + JSON.stringify(mid));
  T('运行抽屉已展开', mid.open);
  T('节点状态已着色', (mid.running + mid.ready + mid.pending) > 0,
    `run=${mid.running} ready=${mid.ready} pend=${mid.pending}`);
  T('泳道甘特按设备分行', mid.lanes > 0, mid.lanes + ' 条泳道');
  T('甘特已排出任务块', mid.blocks > 0, mid.blocks + ' 块');
  T('并行度曲线已绘制', mid.curve);
  T('时间游标存在', mid.nowline);
  T('事件流有内容', mid.events > 0, mid.events + ' 条 · ' + mid.evText.slice(0, 110));
  await page.screenshot({ path: '/tmp/wfed_shot_5_running.png' });

  mark('等待运行结束');
  let ok = false;
  for (let i = 0; i < 100; i++) {
    if (await page.evaluate(() => (window.__WFRUN.snapshot() || {}).finished)) { ok = true; break; }
    await sleep(500);
  }
  await sleep(500);
  const end = await page.evaluate(() => {
    const s = window.__WFRUN.snapshot() || {};
    return {
      finished: s.finished, counts: (s.summary || {}).counts,
      peak: (s.summary || {}).peak_parallelism, wall: (s.summary || {}).wall_clock,
      speedup: (s.summary || {}).speedup,
      greenCards: document.querySelectorAll('#wfed-canvas .wfnode.st-success').length,
      sub: (document.getElementById('run-sub') || {}).textContent,
      legend: (document.getElementById('run-legend') || {}).innerText.replace(/\n/g, ' | '),
      stopHidden: document.getElementById('btn-stoprun').style.display === 'none',
      runBtnBack: document.getElementById('btn-dryrun').style.display !== 'none',
    };
  });
  mark('终态：' + JSON.stringify(end));
  T('运行已结束', ok && end.finished);
  T('全部节点成功', (end.counts || {}).success === wf.data.nodes.length, JSON.stringify(end.counts));
  T('画布节点全部变绿', end.greenCards === wf.data.nodes.length, end.greenCards + '/' + wf.data.nodes.length);
  T('停止按钮已收起', end.stopHidden);
  T('试运行按钮已恢复', end.runBtnBack);
  T('汇总含峰值并行/加速比', end.peak != null && end.wall > 0, 'peak=' + end.peak + ' wall=' + end.wall);
  await page.screenshot({ path: '/tmp/wfed_shot_6_done.png' });

  // ---------- 预检 ----------
  mark('服务端预检');
  await click('#run-preflight');
  await sleep(1200);
  const pf = await page.evaluate(() => ({
    text: (document.getElementById('run-lanes') || {}).innerText.replace(/\n+/g, ' | ').slice(0, 300),
    sub: (document.getElementById('run-sub') || {}).textContent,
  }));
  console.log('   预检：' + pf.text);
  T('预检返回服务端结论', /预检通过|预检未通过|设备串行|最耗时/.test(pf.text), pf.sub);
  await page.screenshot({ path: '/tmp/wfed_shot_7_preflight.png' });

  // ---------- 折叠侧栏后占比 ----------
  mark('折叠两侧栏');
  await click('#lib-toggle'); await sleep(350);
  await click('#prop-toggle'); await sleep(400);
  const widened = await page.evaluate(() => {
    const r = document.getElementById('wfed-canvas-wrap').getBoundingClientRect();
    return {
      pct: +((r.width * r.height) / (window.innerWidth * window.innerHeight) * 100).toFixed(1),
      w: Math.round(r.width), lib: Math.round(document.getElementById('wfed-lib').getBoundingClientRect().width),
      props: Math.round(document.getElementById('wfed-props').getBoundingClientRect().width),
    };
  });
  mark('折叠后：' + JSON.stringify(widened));
  T('折叠后画布更宽', widened.pct > share.pct, widened.pct + '% (lib ' + widened.lib + 'px)');
  await page.screenshot({ path: '/tmp/wfed_shot_8_collapsed.png' });
  // 还原
  await click('#lib-toggle'); await sleep(300);
  await click('#prop-toggle'); await sleep(300);

  await page.screenshot({ path: '/tmp/wfed_shot_9_final.png' });
  await browser.close();

  console.log('\n================ 结果 ================');
  report.forEach(r => console.log(r));
  const nf = report.filter(r => r.startsWith('[FAIL]')).length;
  console.log(`\n共 ${report.length} 项，失败 ${nf} 项 · 总耗时 ${((Date.now() - T0) / 1000).toFixed(1)}s`);
  console.log('截图：/tmp/wfed_shot_{1..9}_*.png');
  process.exit(nf ? 1 : 0);
})().catch(e => { console.error('自检异常：', e); process.exit(2); });
