/* runmode_check.js — 运行档位按钮（runmode.js）浏览器自检
 *
 * 验证项：
 *   A. 编辑器页：分段控件挂载（仅 2 档）、默认 sim、按钮文案联动
 *   B. dry 档已删除：__RUNMODE.modes() 只有 sim/real；set('dry') 被忽略
 *   C. 切真机档：确认弹层必须出现（不可跳过）；取消 → 不切档
 *   D. 确认后 → WFED_REAL_OPTS 带真机参数 + 红色指示条出现；点指示条回 sim
 *   E. 真机档点击试运行 → 提交 body 的 action_mode=real, allow_real=true（拦截验证）
 *   F. 仿真档点击试运行 → 提交 body 的 action_mode=simulate（镜像模型零硬件）
 *   G. 总览页：顶栏也挂了分段控件；初值回读后仍为 sim（后端 simulate 环境）
 *   H. 服务器真机环境语义：后端 status.config.action_mode=simulate → 前端落 sim
 * 说明：点击一律合成 element.click()；运行请求用 page 拦截 fetch 验证参数。
 */
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8000';
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
  const report = [];
  const T = (name, cond, extra = '') =>
    report.push((cond ? '[PASS] ' : '[FAIL] ') + name + (extra ? '  ' + extra : ''));
  let step = 0;
  const mark = s => console.log(`[${String(++step).padStart(2)}] ${s}`);
  const T0 = Date.now();

  // ============ 编辑器页 ============
  const page = await browser.newPage();
  const jsErr = [];
  page.on('pageerror', e => jsErr.push('pageerror: ' + e.message));
  // 拦截 /api/workflow-run 请求记录 body
  const runBodies = [];
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().indexOf('/api/workflow-run') >= 0 && req.method() === 'POST') {
      try { runBodies.push(JSON.parse(req.postData())); } catch (e) { runBodies.push(null); }
    }
    req.continue();
  });

  mark('打开工作流编辑器');
  await page.goto(BASE + '/workflow_editor', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1200);

  // 画布为空会让 startRun 被守卫拦下 —— 先载入内置样例工作流
  mark('载入样例工作流（画布不能为空）');
  await page.evaluate(() => {
    const b = document.querySelector('#btn-import');
    if (b) b.click();                      // 打开导入菜单
  });
  await sleep(300);
  await page.evaluate(() => {
    const b = document.getElementById('import-sample');
    if (b) b.click();                      // 载入示例（进预览）
  });
  await sleep(900);
  await page.evaluate(() => {
    const b = document.getElementById('import-replace');   // 预览确认 → 覆盖导入
    if (b) b.click();
  });
  await sleep(600);
  const wfReady = await page.evaluate(() => {
    const wf = window.__WFED.getWorkflow();
    return wf && wf.data && wf.data.nodes.length;
  });
  T('A0 样例工作流已载入画布', !!wfReady, `nodes=${wfReady}`);

  // ---------- A. 挂载与默认 ----------
  const a = await page.evaluate(() => ({
    seg: !!document.getElementById('runmode-seg'),
    n: document.querySelectorAll('#runmode-seg .rm-btn').length,
    dryBtn: !!document.querySelector('#runmode-seg .rm-btn[data-m="dry"]'),
    on: (document.querySelector('#runmode-seg .rm-btn.on') || {}).textContent || '',
    mode: window.__RUNMODE.get(),
    modes: window.__RUNMODE.modes(),
    wfedMode: window.WFED_MODE,
    opts: window.__RUNMODE.opts(),
    btnRun: (document.getElementById('btn-dryrun') || {}).textContent || ''
  }));
  T('A1 分段控件已挂载（2 档，无 dry 按钮）',
    a.seg && a.n === 2 && a.dryBtn === false, `n=${a.n}`);
  T('A2 默认档 = sim', a.mode === 'sim' && a.wfedMode === 'real', JSON.stringify(a.opts));
  T('A3 sim 档参数 action_mode=simulate', a.opts.action_mode === 'simulate');
  T('A4 试运行按钮文案联动', a.btnRun.indexOf('仿真') >= 0, a.btnRun);

  // ---------- B. dry 档已删除 ----------
  mark('校验已删除的 dry 档被拒绝');
  await page.evaluate(() => window.__RUNMODE.set('dry'));
  await sleep(200);
  const b1 = await page.evaluate(() => ({
    modes: window.__RUNMODE.modes(),
    mode: window.__RUNMODE.get(), wfedMode: window.WFED_MODE,
    opts: window.__RUNMODE.opts(), btn: (document.getElementById('btn-dryrun') || {}).textContent
  }));
  T('B1 档位只有 sim / real 两个',
    JSON.stringify(b1.modes) === '["sim","real"]', JSON.stringify(b1.modes));
  T('B2 set(\'dry\') 被忽略（档位与参数均不变）',
    b1.mode === 'sim' && b1.wfedMode === 'real' && b1.opts.action_mode === 'simulate',
    JSON.stringify(b1.opts));
  T('B3 按钮文案仍为「仿真」且不含「计时」',
    b1.btn.indexOf('仿真') >= 0 && b1.btn.indexOf('计时') < 0, b1.btn);

  // ---------- C. 真机档确认弹层（取消路径） ----------
  mark('真机档：确认弹层出现 → 取消');
  await page.evaluate(() => window.__RUNMODE.set('real'));
  await sleep(300);
  const c1 = await page.evaluate(() => ({
    cf: !!document.getElementById('runmode-confirm'),
    mode: window.__RUNMODE.get(),
    auth: window.__RUNMODE.authorized()
  }));
  T('C1 切真机档弹出确认层', c1.cf === true);
  T('C2 未确认前档位不变（sim）', c1.mode === 'sim' && c1.auth === false);
  await page.evaluate(() => document.querySelector('#runmode-confirm .rm-cf-cancel').click());
  await sleep(200);
  const c2 = await page.evaluate(() => ({
    cf: !!document.getElementById('runmode-confirm'),
    mode: window.__RUNMODE.get()
  }));
  T('C3 取消后弹层关闭且仍为 sim', c2.cf === false && c2.mode === 'sim');

  // ---------- D. 确认路径：真机参数 + 红条 ----------
  mark('真机档：确认 → 红条 + 参数');
  await page.evaluate(() => window.__RUNMODE.set('real'));
  await sleep(200);
  await page.evaluate(() => document.querySelector('#runmode-confirm .rm-cf-go').click());
  await sleep(300);
  const d = await page.evaluate(() => ({
    mode: window.__RUNMODE.get(),
    auth: window.__RUNMODE.authorized(),
    realOpts: window.WFED_REAL_OPTS,
    bar: !!document.getElementById('runmode-realbar') &&
         document.getElementById('runmode-realbar').style.display !== 'none',
    btn: (document.getElementById('btn-dryrun') || {}).textContent
  }));
  T('D1 确认后切到 real 档', d.mode === 'real' && d.auth === true);
  T('D2 WFED_REAL_OPTS 带真机参数', d.realOpts && d.realOpts.action_mode === 'real'
    && d.realOpts.allow_real === true, JSON.stringify(d.realOpts));
  T('D3 红色常驻指示条出现', d.bar === true);
  T('D4 按钮文案变「真机运行」', d.btn.indexOf('真机') >= 0, d.btn);
  await page.screenshot({ path: '/tmp/runmode_shot_1_real.png' });

  // ---------- E. 真机档试运行：提交参数验证（不可达端点，零硬件风险） ----------
  mark('真机档点试运行 → 拦截提交参数');
  // 用不可达 OPC 端点保证不碰真硬件；真机档 allow_real=true 也会在预检响亮失败
  await page.evaluate(() => {
    window.WFED_OPCUA_URL = 'opc.tcp://127.0.0.1:45999';
  });
  await page.evaluate(() => window.__WFRUN.start());
  await sleep(3000);
  const e1 = await page.evaluate(() => ({
    running: !!(window.__WFRUN.run && window.__WFRUN.run.run_id),
    snap: window.__WFRUN.snapshot() ? { st: window.__WFRUN.snapshot().states, fin: window.__WFRUN.snapshot().finished } : null
  }));
  const lastBody = runBodies[runBodies.length - 1];
  T('E1 真机档提交 action_mode=real', lastBody && lastBody.action_mode === 'real',
    JSON.stringify(lastBody && { m: lastBody.mode, am: lastBody.action_mode, ar: lastBody.allow_real }));
  T('E2 真机档提交 allow_real=true', lastBody && lastBody.allow_real === true);
  T('E3 后端接受运行（run_id 已发）', e1.running === true);

  // ---------- F. 回 sim 档试运行 ----------
  mark('红条点击回 sim → 仿真档试运行');
  await page.evaluate(() => document.getElementById('runmode-realbar').click());
  await sleep(300);
  const f1 = await page.evaluate(() => ({
    mode: window.__RUNMODE.get(),
    bar: !!document.getElementById('runmode-realbar') &&
         document.getElementById('runmode-realbar').style.display === 'none'
  }));
  T('F1 点红条回到 sim 档且红条隐藏', f1.mode === 'sim' && f1.bar === true);
  // 等上一个运行结束后再试（避免 drawer 冲突）；或直接再次 start（会关旧流）
  await sleep(1500);
  await page.evaluate(() => window.__WFRUN.start());
  await sleep(3000);
  const lastBody2 = runBodies[runBodies.length - 1];
  T('F2 仿真档提交 mode=real + action_mode=simulate',
    lastBody2 && lastBody2.mode === 'real' && lastBody2.action_mode === 'simulate',
    JSON.stringify(lastBody2 && { m: lastBody2.mode, am: lastBody2.action_mode }));
  T('F3 仿真档不传 allow_real（后端默认关闸）', !('allow_real' in (lastBody2 || {})));

  // ---------- 编辑器页 JS 运行时错误 ----------
  T('X1 编辑器页无 JS 运行时错误', jsErr.length === 0, jsErr.slice(0, 3).join(' | '));

  // ============ 总览页 ============
  mark('打开总览-510 验证顶栏挂载');
  const page2 = await browser.newPage();
  const jsErr2 = [];
  page2.on('pageerror', e => jsErr2.push('pageerror: ' + e.message));
  await page2.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2500);   // 等 status 回读完成
  const g = await page2.evaluate(() => ({
    seg: !!document.getElementById('runmode-seg'),
    mode: window.__RUNMODE ? window.__RUNMODE.get() : null,
    server: window.__RUNMODE ? window.__RUNMODE.serverMode() : null
  }));
  T('G1 总览顶栏分段控件已挂载', g.seg === true);
  T('G2 总览档位初值回读后 = sim（后端 simulate 环境）', g.mode === 'sim', `server=${g.server}`);
  await page2.screenshot({ path: '/tmp/runmode_shot_2_overview.png' });
  T('X2 总览页无 JS 运行时错误', jsErr2.length === 0, jsErr2.slice(0, 3).join(' | '));

  await browser.close();

  console.log('\n===== 结果 =====');
  report.forEach(l => console.log(l));
  const fails = report.filter(l => l.indexOf('[FAIL]') === 0).length;
  console.log(`\n${report.length - fails}/${report.length} 项通过  (用时 ${((Date.now() - T0) / 1000).toFixed(1)}s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
