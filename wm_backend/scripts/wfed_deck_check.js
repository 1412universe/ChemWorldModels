/* wfed_deck_check.js — 右栏属性面板（可收起/悬停展开/钉住）+ PRCXI 9320 4×4 板位点选器自检
 *
 * 覆盖：
 *   A. 右栏三态：整栏折叠（prop-collapsed）/ 窄栏轨道浮出（propnarrow）/ 钉住（pinned）
 *      与左栏完全对称；浮出是「向左覆盖」，不撑开栅格（画布占比不掉）
 *   B. 后端板位清单 GET /api/gn-adapter/prcxi-deck 的形状（16 位 / 行主序 / 角色 / 资源实例）
 *   C. 点选器渲染：16 个格子、T1..T16、角色页签、禁用位、台面工艺切换
 *   D. 点选写值：先点角色再点格子 → 写进 sources/targets/tip_racks（资源实例 id/name/uuid）
 *      或 move_plate 的 from/to（板位号数字）；再点一次取消
 *   E. 不可用板位被拒绝并给出原因，绝不静默写入
 *
 * 说明：按钮一律用合成 element.click()；输入类用原生 value + input/change 事件。
 * 产出：/tmp/wfed_deck_*.png
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
  const mark = s => console.log(`[${String(++step).padStart(2)}] ${s}`);
  const click = sel => page.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) throw new Error('未找到 ' + s);
    e.click();
  }, sel);
  const waitFor = async (fn, ms = 6000, gap = 120) => {
    const t0 = Date.now();
    for (;;) {
      if (await page.evaluate(fn)) return true;
      if (Date.now() - t0 > ms) return false;
      await sleep(gap);
    }
  };

  mark('打开编辑器');
  await page.goto(BASE + '/workflow_editor', { waitUntil: 'networkidle2', timeout: 30000 });
  // 清掉上次自检留下的草稿，保证从空画布开始（否则草稿里的旧节点会干扰断言）
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* 忽略 */ } });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  T('无 4xx 请求', bad.length === 0, bad.slice(0, 3).join(' | '));
  T('无控制台报错', errors.length === 0, errors.slice(0, 2).join(' | '));
  T('初始画布为空（草稿已清）',
    (await page.evaluate(() => window.__WFED.state.wf.data.nodes.length)) === 0);

  // ============ B. 后端板位清单接口 ============
  mark('后端板位清单 /api/gn-adapter/prcxi-deck');
  const api = await page.evaluate(async () => {
    const j = await (await fetch('/api/gn-adapter/prcxi-deck?process=autet&action=transfer_liquid')).json();
    const j2 = await (await fetch('/api/gn-adapter/prcxi-deck?process=mof&action=move_plate')).json();
    return { j, roles2: (j2.roles || []).map(r => r.key), mof9: (j2.sites || [])[8] };
  });
  T('接口 ok', api.j.ok === true);
  T('16 个物理板位', (api.j.sites || []).length === 16, 'rows=' + api.j.rows + ' cols=' + api.j.cols);
  T('板位号 T1..T16 且为行主序', (api.j.sites || []).every((s, i) => s.slot === i + 1 && s.label === 'T' + (i + 1)) &&
    api.j.sites[0].gridRow === 1 && api.j.sites[4].gridRow === 2,
    'T1 row/col=' + api.j.sites[0].gridRow + '/' + api.j.sites[0].gridCol);
  T('板位几何来自 PRCXI9300Deck', api.j.deckModel === 'PRCXI9300Deck' && api.j.geometry.colPitch === 137.5 &&
    api.j.geometry.rowPitch === 96.0, api.j.slotOrder);
  T('transfer_liquid 三个角色', (api.j.roles || []).map(r => r.key).join(',') === 'source,target,tips',
    (api.j.roles || []).map(r => r.key + '→' + r.param).join(' '));
  T('move_plate 角色 from/to/plate', api.roles2.join(',') === 'from,to,plate');
  T('资源实例带 id/name/uuid',
    (api.j.resources || []).length >= 10 &&
    (api.j.resources || []).every(r => r.name && r.uuid && /^\/gn_workstation\/PRCXI\/PRCXI_Deck\//.test(r.id)),
    (api.j.resources || []).length + ' 个实例');
  T('工艺语义随工艺切换（mof 的 T9 = 备用/空位）',
    api.mof9 && api.mof9.group === 'spare', api.mof9 && (api.mof9.group + ' / ' + api.mof9.name));
  T('3/4 号位标为夹爪不可达', api.j.sites[2].enabled === false && api.j.sites[3].enabled === false &&
    /夹爪行程不覆盖/.test(api.j.sites[2].reason), api.j.sites[2].reason);

  // ============ C. 属性面板：三态 ============
  mark('右栏三态（折叠 / 窄栏轨道 / 钉住）');
  const state0 = await page.evaluate(() => ({
    narrow: window.__WFED.isPropNarrow(),
    pinned: window.__WFED.isPropPinned(),
    hasRail: !!document.querySelector('#wfed-props .props-rail'),
    railShown: getComputedStyle(document.querySelector('#wfed-props .props-rail')).display !== 'none',
    collapsed: document.body.classList.contains('prop-collapsed'),
    share: +(document.getElementById('wf-share').textContent.replace(/[^\d.]/g, '')),
  }));
  T('默认窄栏模式（--propw < 172px）', state0.narrow === true && state0.railShown === true);
  T('默认未钉住且未整栏折叠', state0.pinned === false && state0.collapsed === false);

  await click('#props-pin');
  await sleep(200);
  const pinned1 = await page.evaluate(() => ({
    pinned: window.__WFED.isPropPinned(),
    on: document.getElementById('props-pin').classList.contains('on'),
    inner: getComputedStyle(document.getElementById('wfed-props').querySelector('.props-inner')).visibility,
    w: Math.round(document.querySelector('#wfed-props .props-inner').getBoundingClientRect().width),
  }));
  T('点 📌 钉住后内容层可见', pinned1.pinned && pinned1.on && pinned1.inner === 'visible');
  T('钉住时向右浮出覆盖画布（≈min(400px,40vw)）', pinned1.w > 300, pinned1.w + 'px');

  // 整栏折叠
  await click('#prop-toggle');
  await sleep(320);
  const collapsed = await page.evaluate(() => ({
    collapsed: document.body.classList.contains('prop-collapsed'),
    inner: getComputedStyle(document.querySelector('#wfed-props .props-inner')).display,
    w: Math.round(document.getElementById('wfed-props').getBoundingClientRect().width),
    glyph: document.getElementById('prop-toggle').textContent,
    narrow: window.__WFED.isPropNarrow(),
  }));
  T('折叠后内容层隐藏、只剩 34px 把手', collapsed.collapsed && collapsed.inner === 'none' &&
    collapsed.w <= 36 && collapsed.narrow === false, collapsed.w + 'px / 把手 ' + collapsed.glyph);
  await page.screenshot({ path: '/tmp/wfed_deck_1_collapsed.png' });
  await click('#prop-toggle');
  await sleep(320);
  const expanded = await page.evaluate(() => ({
    collapsed: document.body.classList.contains('prop-collapsed'),
    w: Math.round(document.getElementById('wfed-props').getBoundingClientRect().width),
    narrow: window.__WFED.isPropNarrow(),
  }));
  T('再点把手恢复展开（回到窄栏轨道态）', !expanded.collapsed && expanded.w > 36 && expanded.narrow === true,
    expanded.w + 'px');

  await page.evaluate(() => window.__WFED.setPropPinned(true));
  await sleep(150);

  // ============ D. PRCXI 节点 → 板位点选器 ============
  mark('载入示例工作流并选中 PRCXI 滴定节点');
  const wf = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
  await page.evaluate(w => window.__WFED.openWorkflow(w), wf);
  await sleep(700);
  const info = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    if (!n) return null;
    window.__WFED.state.selected = { type: 'node', id: n.uuid };
    window.__WFED.state.selectedIds = {}; window.__WFED.state.selectedIds[n.uuid] = 1;
    window.__WFED.showProps();
    return { uuid: n.uuid, name: n.name, src: JSON.stringify(n.param.sources || null).slice(0, 80) };
  });
  T('找到 PRCXI 节点', !!info, info ? info.name : '');
  const loaded = await waitFor(() => !!window.__WFED.deck.sites());
  T('板位清单已加载进前端', loaded, JSON.stringify(await page.evaluate(() => window.__WFED.deck.state().cached)));

  const grid = await page.evaluate(() => {
    const cells = document.querySelectorAll('#p-deck-grid .dk-cell');
    return {
      hasSec: !!document.getElementById('p-deck'),
      n: cells.length,
      labels: Array.prototype.map.call(cells, c => c.querySelector('.dk-t').textContent),
      roles: Array.prototype.map.call(document.querySelectorAll('#p-deck-roles .dks-role'), b => b.dataset.role),
      procs: Array.prototype.map.call(document.querySelectorAll('#p-deck-proc button'), b => b.dataset.proc),
      onRole: (document.querySelector('#p-deck-roles .dks-role.on') || { dataset: {} }).dataset.role,
      roleSubs: Array.prototype.map.call(document.querySelectorAll('#p-deck-roles .dks-role'), b => b.querySelector('.dr-n').textContent),
      title: document.querySelector('#p-deck h4').innerText.replace(/\n/g, ' '),
      offCells: Array.prototype.filter.call(cells, c => c.classList.contains('off')).length,
      hotCells: Array.prototype.filter.call(cells, c => c.classList.contains('hot')).length,
      selCells: Array.prototype.filter.call(cells, c => c.classList.contains('sel')).length,
    };
  });
  T('渲染出「资源板位」一节', grid.hasSec === true, grid.title);
  T('4×4 = 16 个板位按钮', grid.n === 16 && grid.labels[0] === 'T1' && grid.labels[15] === 'T16');
  T('角色页签 = source/target/tips', grid.roles.join(',') === 'source,target,tips', grid.roles.join('/'));
  T('默认停在第一个角色 source', grid.onRole === 'source', String(grid.onRole));
  T('source 角色下 8 个位可用（含已选）/ 8 个位禁用',
    grid.hotCells + grid.selCells === 8 && grid.offCells === 8,
    'hot=' + grid.hotCells + ' sel=' + grid.selCells + ' off=' + grid.offCells);
  T('角色页签回显各参数已选数量（样例各 1 个）',
    grid.roleSubs.join(' | ') === 'sources · 1 个 | targets · 1 个 | tip_racks · 1 个',
    grid.roleSubs.join(' | '));
  T('台面工艺可切换（3 个）', grid.procs.join(',') === 'aus,autet,mof', grid.procs.join('/'));
  await page.screenshot({ path: '/tmp/wfed_deck_2_picker.png' });

  // —— tips 角色：点 T11 应写入 PRCXI_1250uL_Tips1 ——
  mark('点角色 tips → 点 T11');
  await click('#p-deck-roles .dks-role[data-role="tips"]');
  await sleep(220);
  const tipsAvail = await page.evaluate(() => {
    const cells = document.querySelectorAll('#p-deck-grid .dk-cell');
    const bySlot = {};
    Array.prototype.forEach.call(cells, c => {
      bySlot[c.dataset.slot] = c.classList.contains('off') ? 'off'
        : c.classList.contains('sel') ? 'sel' : 'hot';
    });
    return { role: window.__WFED.deck.state().role, bySlot: bySlot,
             off: Array.prototype.filter.call(cells, c => c.classList.contains('off')).length };
  });
  T('切到 tips 后只有枪头位 10/11/12/15 可选且被推荐',
    ['10', '11', '12', '15'].every(s => tipsAvail.bySlot[s] !== 'off') &&
    Object.keys(tipsAvail.bySlot).filter(s => tipsAvail.bySlot[s] !== 'off').length === 4,
    JSON.stringify(tipsAvail.bySlot));
  await click('#p-deck-grid .dk-cell[data-slot="11"]');
  await sleep(260);
  const tipsVal = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    return { tip: n.param.tip_racks, sel: !!document.querySelector('#p-deck-grid .dk-cell[data-slot="11"].sel') };
  });
  T('T11 写入 tip_racks（含 id/name/uuid）',
    Array.isArray(tipsVal.tip) && tipsVal.tip.some(r => r.name === 'PRCXI_1250uL_Tips1' &&
      r.uuid === 'a2c7801f-bef0-4007-b650-73ad32f04778' &&
      r.id === '/gn_workstation/PRCXI/PRCXI_Deck/PRCXI_1250uL_Tips1'),
    JSON.stringify(tipsVal.tip));
  T('已在板位上的资源在格子上显示为已选', tipsVal.sel === true);

  // —— 再点一次取消 ——
  await click('#p-deck-grid .dk-cell[data-slot="11"]');
  await sleep(240);
  const tipOff = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    return n.param.tip_racks;
  });
  T('再点一次从 tip_racks 移除', Array.isArray(tipOff) && !tipOff.some(r => r.name === 'PRCXI_1250uL_Tips1'),
    JSON.stringify(tipOff));
  // 复原
  await click('#p-deck-grid .dk-cell[data-slot="11"]');
  await sleep(220);

  // —— source 角色：清空后点 T7，应写入 troughplate4（该位在真实工作流里就是这个） ——
  mark('点角色 source → 点 T7');
  await click('#p-deck-roles .dks-role[data-role="source"]');
  await sleep(220);
  await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    n.param.sources = [];
    window.__WFED.showProps();
  });
  await sleep(220);
  await click('#p-deck-grid .dk-cell[data-slot="7"]');
  await sleep(260);
  const srcVal = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    return { src: n.param.sources, sum: (document.querySelector('.param-row[data-pk="sources"] .pr-deck-sum') || {}).innerText };
  });
  T('T7 写入 sources（真实占用 = PRCXI_nest_1_troughplate4）',
    Array.isArray(srcVal.src) && srcVal.src.length === 1 &&
    srcVal.src[0].name === 'PRCXI_nest_1_troughplate4' &&
    srcVal.src[0].uuid === 'bd6f7d88-e96a-4efa-b8c6-f5514aeb7cdf',
    JSON.stringify(srcVal.src));
  T('参数行同步显示板位摘要 chips', /troughplate4/.test(srcVal.sum || ''), srcVal.sum);

  // —— 同一板位再点一次 = 取消 ——
  await click('#p-deck-grid .dk-cell[data-slot="7"]');
  await sleep(240);
  const srcOff = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0];
    return n.param.sources;
  });
  T('已选板位再点一次从 sources 移除', Array.isArray(srcOff) && srcOff.length === 0, JSON.stringify(srcOff));
  await click('#p-deck-grid .dk-cell[data-slot="7"]');
  await sleep(220);

  // —— 不可用板位被拒绝 ——
  mark('点被停用的 T3（夹爪行程不覆盖）');
  const before3 = await page.evaluate(() => JSON.stringify(
    window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0].param.sources));
  await click('#p-deck-grid .dk-cell[data-slot="3"]');
  await sleep(320);
  const rej = await page.evaluate(() => ({
    after: JSON.stringify(window.__WFED.state.wf.data.nodes.filter(x => x.device_name === 'PRCXI')[0].param.sources),
    notes: Array.prototype.map.call(document.querySelectorAll('.wfed-note'), n => n.innerText.replace(/\n/g, ' | ')),
  }));
  const rejHit = rej.notes.some(t => /T3/.test(t) && /夹爪行程不覆盖/.test(t));
  T('T3 被拒绝且给出原因（值未变）', rej.after === before3 && rejHit,
    (rej.notes.find(t => /T3/.test(t)) || '(无 T3 提示)').slice(0, 100));

  // ============ 台面工艺切换 ============
  mark('切台面工艺 autet → mof');
  await click('#p-deck-proc button[data-proc="mof"]');
  const mofOk = await waitFor(() => {
    const c = document.querySelectorAll('#p-deck-grid .dk-cell');
    return c.length === 16 && /g-spare/.test(c[8].className);
  });
  const mof = await page.evaluate(() => {
    const cells = document.querySelectorAll('#p-deck-grid .dk-cell');
    return { cls: cells[8] ? cells[8].className : '(无)', nm: cells[8] ? cells[8].innerText.replace(/\n/g, ' ') : '' };
  });
  T('切工艺后 T9 变成「空位」语义（g-spare）', mofOk && /g-spare/.test(mof.cls), mof.cls + ' → ' + mof.nm);
  await click('#p-deck-proc button[data-proc="autet"]');
  await waitFor(() => {
    const c = document.querySelectorAll('#p-deck-grid .dk-cell');
    return c.length === 16 && /g-deepWell/.test(c[8].className);
  });
  await page.screenshot({ path: '/tmp/wfed_deck_3_autet.png' });

  // ============ move_plate：from/to 写板位号 ============
  mark('新增 move_plate 节点 → from/to 写板位号');
  const mp = await page.evaluate(() => {
    const n = window.__WFED.addNode('PRCXI', 'move_plate', undefined, '搬运孔板', 60, 900);
    return n ? { uuid: n.uuid } : null;
  });
  T('move_plate 节点已创建', !!mp);
  await waitFor(() => !!window.__WFED.deck.sites());
  const mpUi = await page.evaluate(() => {
    const cells = document.querySelectorAll('#p-deck-grid .dk-cell');
    return {
      roles: Array.prototype.map.call(document.querySelectorAll('#p-deck-roles .dks-role'), b => b.dataset.role),
      n: cells.length,
      off: Array.prototype.filter.call(cells, c => c.classList.contains('off')).map(c => c.dataset.slot),
    };
  });
  T('move_plate 角色 = from/to/plate', mpUi.roles.join(',') === 'from,to,plate', mpUi.roles.join('/'));
  T('move_plate 下 T3/T4 不可选（夹爪不可达）', mpUi.off.indexOf('3') >= 0 && mpUi.off.indexOf('4') >= 0,
    'off=' + mpUi.off.join(','));

  // 节点库默认 from=16 → 格子上应显示为已选；点一下是「取消」，再点一下是「选中」
  const fromInit = await page.evaluate(() => {
    const ns = window.__WFED.state.wf.data.nodes.filter(x => x.name === 'move_plate');
    return { from: ns[ns.length - 1].param.from,
             sel16: !!document.querySelector('#p-deck-grid .dk-cell[data-slot="16"].sel') };
  });
  T('节点库默认 from=16 且 T16 显示为已选', fromInit.from === 16 && fromInit.sel16 === true,
    JSON.stringify(fromInit));
  await click('#p-deck-grid .dk-cell[data-slot="16"]');
  await sleep(260);
  const fromOff = await page.evaluate(() => {
    const ns = window.__WFED.state.wf.data.nodes.filter(x => x.name === 'move_plate');
    return ns[ns.length - 1].param.from;
  });
  T('再点 T16 = 清除起点板位', fromOff === undefined, String(fromOff));

  await click('#p-deck-roles .dks-role[data-role="from"]');
  await sleep(220);
  await click('#p-deck-grid .dk-cell[data-slot="16"]');
  await sleep(280);
  const fromVal = await page.evaluate(() => {
    const ns = window.__WFED.state.wf.data.nodes.filter(x => x.name === 'move_plate');
    const n = ns[ns.length - 1];
    return { from: n.param.from, type: typeof n.param.from,
             sum: (document.querySelector('.param-row[data-pk="from"] .pr-deck-sum') || {}).innerText };
  });
  T('from 写入板位号数字 16（不是字符串/资源字典）',
    fromVal.from === 16 && fromVal.type === 'number', JSON.stringify(fromVal));
  T('参数行显示 T16 板位摘要', /T16/.test(fromVal.sum || ''), fromVal.sum);
  await page.screenshot({ path: '/tmp/wfed_deck_4_moveplate.png' });

  // ============ 非 PRCXI 节点不出现点选器 ============
  mark('非 PRCXI 节点不渲染点选器');
  const other = await page.evaluate(() => {
    const n = window.__WFED.state.wf.data.nodes.filter(x => x.device_name && x.device_name !== 'PRCXI')[0];
    if (!n) return { skipped: true };
    window.__WFED.state.selected = { type: 'node', id: n.uuid };
    window.__WFED.state.selectedIds = {}; window.__WFED.state.selectedIds[n.uuid] = 1;
    window.__WFED.showProps();
    return { sec: !!document.getElementById('p-deck'), roles: window.__WFED.deck.roles(), dev: n.device_name };
  });
  T('非 PRCXI 节点无「资源板位」一节',
    other.skipped === true || (other.sec === false && other.roles === null),
    other.dev || '跳过（样例无其它设备节点）');

  T('全程无新增控制台报错', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('\n================ 结果 ================');
  report.forEach(r => console.log(r));
  const fail = report.filter(r => r.startsWith('[FAIL]')).length;
  console.log(`\n共 ${report.length} 项，PASS ${report.length - fail} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('脚本异常：', e); process.exit(2); });
