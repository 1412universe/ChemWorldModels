
/* =========================================================
   0) 数据（内置虚拟催化剂）
   ========================================================= */
// 数据质量：仅采纳经 DOI 复核 / 低于可疑阈值的活跃条目；needs_review 离群值保留在 CATALYSTS 中带溯源，但不进预测池
const POOL = (typeof CATALYSTS!=='undefined'? CATALYSTS : []).filter(r=>r.active!==false).map((r,idx)=>({
  id: idx,
  metal: (r.metals&&r.metals.length)? r.metals.join('/') : (r.metal||'无金属'),
  support: r.support_raw || r.support || 'other',
  support_display: normSupport(r.support_raw, r.support),
  loading: null,
  light: (r.eg!=null && r.eg>3.2)? 'UV 主导' : 'UV/可见',
  bg: r.eg, dband: null, ad: r.ead,
  y: r.y, s: r.s, mech: r.mechanism,
  mechText: r.mech_text||'', product: r.product||'',
  why: r.why||'（文献未详述）', seldrv: r.sel_driver||'（文献未详述）', innov: '',
  oox: r.oox, act: r.act, photo: r.photothermal,
  doi: r.doi, title: r.title||'',
  yunit: r.yunit||'μmol·g⁻¹·h⁻¹',
  review_status: r.review_status||'', review_note: r.review_note||'',
  orig_y: (r.orig_y!=null? r.orig_y : null),
  domain: 'OCM'
}));

// —— 参考知识库整合：Zavyalova/CADS 重建(OCM) ——
// 设计：POOL(真实 OCM 合成候选) 之外，再并入 KB_EXTRA（Zavyalova/CADS 真实数据，同属 OCM 族无惩罚）。
// 注：原 CO2RR 跨域迁移已移除（脏数据，其产率量纲 %/μmol·g⁻¹·h⁻¹ 会污染 OCM 产率中位数）。
function famOf(d){ return (d && String(d).startsWith('OCM')) ? 'OCM' : (d||'other'); }
// 载体展示名规范化（与后端 norm_support 对齐）：优先 raw，否则规范 sup，缺失标「未指明载体」
function prettifySupport(s){
  if(!s) return '';
  s=s.trim(); const low=s.toLowerCase();
  const MAP={ 'sio2':'SiO₂','tio2':'TiO₂','zno':'ZnO','al2o3':'Al₂O₃','ceo2':'CeO₂',
    'zro2':'ZrO₂','mgo':'MgO','wo3':'WO₃','ga2o3':'Ga₂O₃','nb2o5':'Nb₂O₅',
    'in2o3':'In₂O₃','fe2o3':'Fe₂O₃','sno2':'SnO₂','zns':'ZnS','cds':'CdS',
    'srtio3':'SrTiO₃','moo3':'MoO₃','biobr':'BiOBr','bivo4':'BiVO₄','mos2':'MoS₂',
    'g-c3n4':'g-C₃N₄','g-c3n4':'g-C₃N₄','c3n4':'C₃N₄','carbon nitride':'Carbon nitride',
    'graphene':'Graphene','cnt':'CNT','tin':'Tin','mwc':'MWCNT' };
  if(MAP[low]) return MAP[low];
  return s.charAt(0).toUpperCase()+s.slice(1);
}
function normSupport(raw,sup){
  raw=(raw||'').trim();
  if(raw && !['other','unknown','none'].includes(raw.toLowerCase())) return prettifySupport(raw);
  sup=(sup||'').trim().toLowerCase();
  if(['other','unknown','none',''].includes(sup)) return '未指明载体';
  return prettifySupport(sup);
}
function normKB(x){
  return {
    id: x.id, title: x.title||'', metal: (x.metals&&x.metals.length)? x.metals.join('/') : (x.metal||'无金属'),
    support: x.support_raw||x.support||'other', support_display: normSupport(x.support_raw, x.support),
    bg: x.eg, ad: x.ead, y: x.y, s: x.s,
    mech: x.mechanism, oox: x.oox, photo: !!x.photothermal, domain: x.domain, recon: !!x.recon,
    yunit: x.yunit||null, product: (x.product||'').toLowerCase(), doi: x.doi||null, why: x.why||'',
    metals: x.metals||[], ypct: x.ypct??null, spct: x.spct??null, T_C: x.T_C??null,
    ch4conv: x.ch4conv??null, src: x.src||''
  };
}
const KB_ALL = (typeof KB_EXTRA!=='undefined' ? KB_EXTRA : []).filter(x=>(x.domain||'')!=='CO2RR').map(normKB);  // 已剔除 CO2RR 脏数据
const ALLCAT = POOL.concat(KB_ALL);                       // 统一近邻池（含域标签）
const OCM_YS = POOL.filter(p=>p.y>0).map(p=>p.y).sort((a,b)=>a-b);
function qAt(arr,p){ if(!arr.length) return 6000; p=Math.max(0,Math.min(1,p)); const i=p*(arr.length-1); const lo=Math.floor(i),hi=Math.ceil(i); return arr[lo]*(hi-i)+arr[hi]*(i-lo); }
function pctRank(arr,v){ if(!arr.length) return 0.5; let c=0; for(const x of arr){ if(x<=v) c++; } return c/arr.length; }
// 真实历史 OCM 文献先验：在 Zavyalova/CADS 真实数据子池内找最近组成类似物（域内无跨域惩罚）
function nearestOCM(r){
  const pool = KB_ALL.filter(p=>p.domain && String(p.domain).startsWith('OCM-ref'));
  if(!pool.length) return null;
  let best=null, bd=1e9;
  for(const p of pool){ const d=dist(r,p); if(d<bd){ bd=d; best=p; } }
  return best;
}

// —— EOV–ΔE*CH₃ 双描述符派生（基于文献典型值与应变工程框架）——
// EOV: 氧空位形成能 (eV)，适度不稳定晶格氧利于 CH₄ C–H 活化（火山峰≈2–4 eV）
// ΔE*CH₃: 甲基吸附能差 (eV)，大值使·CH₃ 稳定、利于 C–C 偶联而非过度氧化
const OX_EOV={tio2:4.6,zno:3.1,nio:3.2,ceo2:2.0,wo3:4.8,sno2:3.8,al2o3:5.2,sio2:6.0,zro2:4.0,in2o3:3.6,ga2o3:4.2,mgo:6.5,caco3:6.8,cds:3.0,c3n4:3.4,biob3:4.5,mof:3.0,other:4.0};
const METAL_EOV_MOD={pd:-0.6,pt:-0.8,au:-0.7,ag:-0.5,ru:-0.4,rh:-0.5,ir:-0.6,cu:-0.3,ni:-0.2,co:-0.2,fe:-0.1,ce:-1.0,mo:-0.3,w:-0.3,ti:0.1,zn:0.0,in:-0.2,ga:-0.2,sn:-0.1,re:-0.4};
const OX_DCH3={tio2:0.9,zno:0.7,nio:0.6,ceo2:1.1,wo3:0.5,sno2:0.6,al2o3:0.3,sio2:0.2,zro2:0.8,in2o3:0.5,ga2o3:0.4,mgo:0.1,caco3:0.1,cds:0.4,c3n4:0.6,biob3:0.5,mof:0.7,other:0.5};
const METAL_DCH3_MOD={pd:0.8,pt:0.7,au:0.6,ag:0.5,ru:0.9,rh:0.8,ir:0.7,cu:0.4,ni:0.5,co:0.5,fe:0.4,ce:0.3,mo:0.6,w:0.6,ti:0.3,zn:0.2,in:0.4,ga:0.3,sn:0.3,re:0.9};
function eovOf(r){
  const sp=(r.support||'').toLowerCase(); let base=OX_EOV.other;
  for(const k in OX_EOV){ if(k!=='other'&&sp.includes(k)){ base=OX_EOV[k]; break; } }
  let mod=0; const ms=(r.metal||'').toLowerCase();
  for(const k in METAL_EOV_MOD){ if(ms.includes(k)) mod+=METAL_EOV_MOD[k]; }
  return Math.max(1.0, base+mod);
}
function dcht3Of(r){
  const sp=(r.support||'').toLowerCase(); let base=OX_DCH3.other;
  for(const k in OX_DCH3){ if(k!=='other'&&sp.includes(k)){ base=OX_DCH3[k]; break; } }
  let mod=0; const ms=(r.metal||'').toLowerCase();
  for(const k in METAL_DCH3_MOD){ if(ms.includes(k)) mod+=METAL_DCH3_MOD[k]; }
  return Math.max(0.1, base+mod);
}
POOL.forEach(r=>{ r.eov=eovOf(r); r.dcht3=dcht3Of(r); });

/* =========================================================
   0.5) 物理指纹派生 —— 由真实属性构造可计算的物理化学状态
   （金属功函数 / 载体电子亲和能 / 氧空位文本线索 / 形貌 / 机理）
   用于让约束真正"挂在数据"上，而非纯示意。
   ========================================================= */
function hashSeed(str){ let h=2166136261; str=''+(str||'x'); for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const METAL_WF={pd:5.12,pt:5.65,au:5.10,ag:4.26,cu:4.65,ni:5.15,rh:4.98,ru:4.71,ir:5.27,co:5.0,fe:4.5,w:4.55,mo:4.6,cr:4.5,zn:4.3,ti:4.33,in:4.09,ga:4.32,ce:2.9,mg:3.6,al:4.06,bi:4.22,ta:4.25,sn:4.42,cd:4.22,re:4.72,cs:2.14,er:3.2,pb:4.25};
const SUPPORT_CHI={tio2:4.2,zno:4.5,ceo2:4.0,wo3:4.0,gc3n4:4.0,bivo4:4.0,cds:4.5,sio2:3.8,mgo:2.0,other:4.2,tin:4.0,cnt:4.0,carbon:4.0};
const SUPPORT_EB={tio2:60,zno:55,ceo2:50,wo3:45,gc3n4:120,bivo4:60,cds:40,sio2:30,mgo:30,other:50,tin:50,cnt:30,carbon:30};
const SUPPORT_PHOTO={tio2:'稳定',zno:'稳定',ceo2:'稳定',wo3:'稳定(氧化侧)',gc3n4:'稳定',bivo4:'稳定',cds:'光照下光腐蚀(需保护)',sio2:'稳定',mgo:'稳定',other:'稳定',tin:'稳定',cnt:'稳定',carbon:'稳定'};
function avgWF(metals){ if(!metals||!metals.length) return 4.6; let s=0,n=0; for(const m of metals){ const k=(''+m).toLowerCase(); if(METAL_WF[k]!=null){s+=METAL_WF[k];n++;} } return n? s/n : 4.6; }
function tempCFor(mech){ return mech==='OCM'?740 : mech==='MPO'?400 : 320; }
function derivePhys(r){
  const seed=hashSeed(r.doi||r.metal||'x');
  const R=rng(seed);
  const wf=avgWF(r.metals);
  const sup=(''+(r.support||'other')).toLowerCase();
  const chi=SUPPORT_CHI[sup]!=null?SUPPORT_CHI[sup]:4.2;
  const phiB=Math.max(0.05, wf-chi);
  const txt=[r.why,r.sel_driver,r.mech_text,r.title,r.support_raw].filter(Boolean).join(' ');
  const hasOv=/oxygen vacan|\bov\b|defect|vacancy|氧空位|空位|氧缺陷/i.test(txt);
  const eovf = hasOv ? (0.9+0.7*R()) : (1.9+0.9*R());
  const morph=(''+(r.morphology||'')).toLowerCase();
  let d;
  if(/nanowire|nanorod|nanotube|wire|rod|tube/.test(morph)) d=18+34*R();
  else if(/sheet|plate|flake|2d|layer|nanosheet/.test(morph)) d=4+8*R();
  else if(/porous|mesoporous|foam|hierarchical/.test(morph)) d=12+20*R();
  else if(/bulk|monolith/.test(morph)) d=40+60*R();
  else d=8+20*R();
  const tau=0.6+40*R();
  const D=0.006+0.05*R();
  const Ld=Math.sqrt(D*(tau*1e-9))*1e7;
  const I=40+260*R();
  const Isat=170+90*R();
  const pH=4+5*R();
  const pore = /porous|mesoporous|hierarchical/.test(morph)? (2+22*R()) : null;
  const mech=r.mech||'OCM';
  const kie = (mech==='OCM'||mech==='NOCM')? (2.2+4.6*R()) : (1.4+3*R());
  const ea = (mech==='OCM'?0.72:mech==='NOCM'?0.95:0.6) + 0.2*(1-R());
  const Eb = SUPPORT_EB[sup]!=null?SUPPORT_EB[sup]:50;
  const photoStab = SUPPORT_PHOTO[sup]!=null?SUPPORT_PHOTO[sup]:'稳定';
  return {wf,chi,phiB,hasOv,eovf,d,tau,D,Ld,I,Isat,pH,pore,kie,ea,Eb,photoStab};
}

/* =========================================================
   1) 四阶段闭环
   ========================================================= */
let iter=0, running=false, timer=null;
let timeScale=10000, simClock=0, lastFrame=performance.now();
let loopStage=0, loopState='idle', opStartSim=0, opDur=0;
let _opBusy=false;             // onOpComplete 异步网络回调期间防重入
let _opBusySince=0;            // 重入锁置位时的真实时间戳（看门狗用，避免在线预测挂起把锁永久卡死）
let activeReaction='CH4';      // 'CH4' | 'OER' —— 提前声明，避免 refreshBest/startIteration 顶层调用触发 TDZ
let oerTarget='H2O2';          // 'H2O2'(两电子) | 'O2'(四电子)
let curCand=null, curPredY=0, curMeasY=0;
const OP_DUR={literature:600, glovebox:900, ai:300, robot:300, xrd:2400, balance:300, sonic:1800, stirrer:3600, furnace:14400, tube:7200, vacuumoven:43200, gasfeed:300, reactor:7200, centrifuge:600, gc:1200, ms:600, drifts:1800};
let best={name:'—',y:-1,s:-1,rec:null};
let emaY=null, mae=0, maeN=0, rmae=0, rmaeN=0, sampled={};
let measured=[];                 // 已实测 {(doi,y,r)} —— 世界模型的"自有实验"训练集
let DATA_MODE='real';            // 实验数据模式：'real'=始终用真实值；'hybrid'=前 N 次用模拟值、第 N+1 次起用真实值；'sim'=纯模拟
let REAL_AFTER_ITER=5;           // hybrid 模式：前 N 次迭代用模拟值作为反馈，第 N+1 次起才开启真实实验闸门
let supportReuse={};             // 各载体家族累计投料次数（驱动失活约束）
let expChecks=[];                // 最近一次迭代级的"实验现实性"约束
let curUnc=0;                   // 当前预测不确定性
let labStageText='待机';
let USER_RECIPES=[];             // 用户导出的实验配方（主动学习候选池扩充）
let dispatchNow=null, pendingDispatch=false, savedStage=0, dispatchQueued=null;
let curRecipeMod=1;             // 当前候选的合成调制因子（用户配方）
// 实验操作名义参数（真实实验室典型值）
const EXP={LOD:80, GHSV:36000, SRC_LAMBDA:365, CAP:120000};

// ===== 主动学习采集函数族（与后端 services.acquire 同口径）=====
let ACQ_STRATEGY = 'UCB';                 // 由顶部「采集策略」下拉切换
const ACQ_BETA_MIN=0.5, ACQ_BETA_MAX=3.0, ACQ_BETA_TAU=12.0, ACQ_XI=0.01, ACQ_DIV_LAMBDA=0.15, ACQ_DIV_SCALE=1.2;
// 评价机制运行时状态（必须在任何顶层 IIFE / 监听器之前声明，否则 TDZ 报错冻结整个脚本）
let EVAL_HIST=[];                         // [{iter,simple,cum,recall,picp}] 评价趋势序列
let AUTO_EVAL=true, _evalBusy=false, _evalLastIter=-1;   // 每轮自动评价：开关 / 重入锁 / 去重
let _truthCache={};                       // 全池真值排名缓存（按反应轨道）
function acqBetaFor(it){ return ACQ_BETA_MIN + (ACQ_BETA_MAX-ACQ_BETA_MIN)*Math.exp(-Math.max(0,it)/ACQ_BETA_TAU); }
function _normCdf(z){ return 0.5*(1+erf(z/Math.SQRT2)); }
function erf(x){ // Abramowitz-Stegun 7.1.26
  const s=Math.sign(x), ax=Math.abs(x);
  const t=1/(1+0.3275911*ax);
  const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-ax*ax);
  return s*y;
}
function acqScore(strategy, mu, sig, fstar, beta, xi){
  strategy=(strategy||'UCB').toUpperCase();
  if(strategy==='UCB') return mu + beta*sig;
  const z=(sig>1e-9)?(mu-fstar-xi)/sig:null;
  if(strategy==='EI') return (z==null)?0:Math.max(0, sig*(z*_normCdf(z)+Math.exp(-0.5*z*z)/Math.sqrt(2*Math.PI)));
  if(strategy==='PI') return (z==null)?0:_normCdf(z);
  if(strategy==='TS') return mu + sig*(gaussian() );   // gaussian() 见下
  return mu + beta*sig;
}
let _gaussSpare=null;
function gaussian(){ // Box-Muller
  if(_gaussSpare!=null){ const v=_gaussSpare; _gaussSpare=null; return v; }
  let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random();
  const m=Math.sqrt(-2*Math.log(u)); _gaussSpare=m*Math.sin(2*Math.PI*v); return m*Math.cos(2*Math.PI*v);
}
function diversityBonus(r, sampledRecs){
  if(!sampledRecs.length) return 0;
  let mind=1e9; for(const s of sampledRecs){ const d=dist(r,s); if(d<mind) mind=d; }
  const prox=Math.exp(-mind/ACQ_DIV_SCALE);
  return -ACQ_DIV_LAMBDA*prox;
}
// 统一采集：返回单条最优候选（CH4 用 predict，OER 用 predictOER / 归一化奖励）
function acquireOne(pool, sampledSet, predictFn, iteration, strategy, rewardFn){
  const unexp = pool.filter(r=>!sampledSet.has(r.doi));
  const src = unexp.length ? unexp : pool;
  const sampledRecs = pool.filter(r=>sampledSet.has(r.doi));
  let fstar=0;
  for(const r of sampledRecs){ const pr=predictFn(r); if(pr.pred>fstar) fstar=pr.pred; }
  const beta=acqBetaFor(iteration);
  let best=null, bv=-1e18;
  for(const r of src){
    const pr=predictFn(r);
    let alpha=acqScore(strategy, pr.pred, pr.unc, fstar, beta, ACQ_XI);
    alpha += diversityBonus(r, sampledRecs);
    if(alpha>bv){ bv=alpha; best=r; }
  }
  return best;
}
function pickCandidate(){
  if(activeReaction==='OER') return pickCandidateOER();
  const sampledSet=new Set(Object.keys(sampled).filter(k=>sampled[k]));
  // 用户导出的实验配方优先进入主动学习评估（保证可见、逐一评估）
  const ur = USER_RECIPES.filter(r=>!sampledSet.has(r.doi));
  if(ur.length){
    const sampledRecs=POOL.filter(r=>sampledSet.has(r.doi));
    let fstar=0; for(const r of sampledRecs){ const pr=predict(r); if(pr.pred>fstar) fstar=pr.pred; }
    const beta=acqBetaFor(iter);
    let best=ur[0], bv=-1e18;
    for(const r of ur){ const pr=predict(r); let al=acqScore(ACQ_STRATEGY, pr.pred, pr.unc, fstar, beta, ACQ_XI); al+=diversityBonus(r, sampledRecs); if(al>bv){bv=al;best=r;} }
    return best;
  }
  return acquireOne(POOL, sampledSet, predict, iter, ACQ_STRATEGY, null);
}
function pickCandidateOER(){
  const sampledSet=new Set(Object.keys(sampled).filter(k=>sampled[k]));
  // OER：μ 取归一化奖励（与后端一致），σ 取奖励的 15%
  const predFn=(r)=>{ const d=oerDerived(r); const mu=oerRewardNorm(d, oerTarget, 0); return {pred:mu, unc:mu*0.15}; };
  return acquireOne(OER_POOL, sampledSet, predFn, iter, ACQ_STRATEGY, null);
}
function recipeMod(recipe){
  // 用户合成条件对世界模型预测/实测的适度调制因子（仅作"合成有意义"的示意，非精确热力学求解）
  let m=1.0;
  const f=recipe.furnace;
  if(f){
    const T=(f['温度']!=null)?+f['温度']:500;
    const dt=(T-550)/450; const bump=1-0.22*dt*dt;      // 最优焙烧 ~550℃：过低晶化不全、过高烧结
    m*=Math.max(0.75, Math.min(1.05, bump));
    const atm=f['气氛'];
    if(atm==='N₂'||atm==='Ar') m*=1.04;                  // 惰性利于保留氧空位
    else if(atm==='O₂') m*=0.94;                         // 过度氧化不利 C2
  }
  const t=recipe.tube;
  if(t && (t['气氛']==='H₂'||t['气氛']==='H₂/Ar')) m*=1.03;   // 还原提高金属分散
  const g=recipe.gasfeed;
  if(g && g['模式']==='NOCM') m*=0.97;                   // 非氧化耦合基准略低（已受热力学约束）
  return Math.max(0.7, Math.min(1.15, m));
}
function fmtRecipe(p){ return p? Object.keys(p).map(k=>`${k}=${p[k]}`).join(' '):''; }
const stageEls=[...document.querySelectorAll('.stage')];
function setStage(i){ stageEls.forEach(e=>e.classList.toggle('active',+e.dataset.stage===i)); }

function log(cls,msg){
  const c=document.getElementById('chat');
  const ts=new Date().toLocaleTimeString('zh-CN',{hour12:false});
  const row=document.createElement('div'); row.className='msg '+cls;
  row.innerHTML=`<span class="ts">${ts}</span>${msg}`;
  c.appendChild(row); c.scrollTop=c.scrollHeight;
  while(c.children.length>120) c.removeChild(c.firstChild);
}
function princText(r){
  const p=[];
  p.push(`<b>产物 / 机理：</b>${r.product||'—'}（${r.mech}${r.mechText? ' · '+r.mechText : ''}）`);
  p.push(`<b>为何有效：</b>${r.why}`);
  p.push(`<b>选择性来源：</b>${r.seldrv}`);
  return p.join('<br>');
}
const CATMAP={thermo:'热力学与平衡',bandedge:'能带与载流子',photon:'能带与载流子',sab:'动力学与传质',ox:'稳定性',pt:'动力学与传质',stoich:'热力学与平衡',arr:'动力学与传质',nernst:'能带与载流子',lang:'动力学与传质',lech:'热力学与平衡',mt:'动力学与传质',qy:'动力学与传质',hen:'热力学与平衡',stab:'稳定性',bl:'能带与载流子',rec:'能带与载流子',spin:'动力学与传质',ovf:'稳定性',schottky:'能带与载流子',ld:'能带与载流子',tau:'能带与载流子',eb:'能带与载流子',ms:'能带与载流子',kie:'动力学与传质',branch:'动力学与传质',flux:'动力学与传质',knud:'动力学与传质',pour:'稳定性',ea:'动力学与传质',lod:'实验现实性',mbal:'实验现实性',repro:'实验现实性',deact:'实验现实性',thermal:'实验现实性',ghsv:'实验现实性',dark:'实验现实性',c3:'实验现实性',press:'实验现实性',loading:'实验现实性',eqceil:'实验现实性',spectrum:'实验现实性',label:'实验现实性',deadvol:'实验现实性',eovv:'双描述符火山',dcht3:'双描述符火山',volcano:'双描述符火山'};
const CATORDER=['热力学与平衡','能带与载流子','动力学与传质','稳定性','双描述符火山','实验现实性'];
function renderConstraints(r){
  const C=computeConstraints(r).concat(expChecks);
  const map={pass:['✔','#10b981','rgba(16,185,129,.12)'],warn:['!','#fbbf24','rgba(251,191,36,.12)'],fail:['✖','#ef4444','rgba(239,68,68,.15)']};
  const el=document.getElementById('constraint-list');
  const groups={};
  for(const c of C){ const g=CATMAP[c.k]||'其它'; (groups[g]=groups[g]||[]).push(c); }
  const itemHtml=c=>`<div class="citem" style="background:${map[c.st][2]}"><span class="cdot" style="background:${map[c.st][1]}">${map[c.st][0]}</span><div class="ctxt"><b>${c.name}</b><div class="cd">${c.d}</div></div></div>`;
  el.innerHTML=CATORDER.filter(g=>groups[g]).map(g=>`<details open class="cgrp"><summary><span class="cg-t">${g}</span><span class="cg-n">${groups[g].length}</span></summary>${groups[g].map(itemHtml).join('')}</details>`).join('');
}
function drawBand(r){
  if(r.reaction==='OER'||activeReaction==='OER'){ drawOERBand(r); return; }
  const cv=document.getElementById('band-chart'); if(!cv) return;
  const w=cv.clientWidth||300, h=cv.clientHeight||120;
  if(w<10||h<10) return;
  const _bw=Math.min(4096,Math.round(w*DPR)), _bh=Math.min(4096,Math.round(h*DPR));
  if(cv.width!==_bw) cv.width=_bw;
  if(cv.height!==_bh) cv.height=_bh;
  const g=cv.getContext('2d'); g.setTransform(DPR,0,0,DPR,0,0);
  g.clearRect(0,0,w,h);
  const bg=(r.bg!=null)?r.bg:2.8;
  const vb=2.8-(bg-2.5)*0.3, cb=vb-bg;
  const E_ox=1.7, E_red=-0.4;
  const ymin=-1.6, ymax=3.2;
  const Y=v=> h-((v-ymin)/(ymax-ymin))*h;
  g.strokeStyle='rgba(148,163,184,.13)'; g.lineWidth=1;
  for(let v=ymin; v<=ymax; v+=0.5){ g.beginPath(); g.moveTo(46,Y(v)); g.lineTo(w-8,Y(v)); g.stroke(); }
  const x0=w*0.40, bw=w*0.18;
  g.fillStyle='rgba(94,231,223,.16)'; g.fillRect(x0,Y(vb),bw,Y(cb)-Y(vb));
  g.strokeStyle='#5ee7df'; g.lineWidth=2; g.strokeRect(x0,Y(vb),bw,Y(cb)-Y(vb));
  g.setLineDash([5,4]);
  g.strokeStyle='#f59e0b'; g.beginPath(); g.moveTo(20,Y(E_ox)); g.lineTo(w-8,Y(E_ox)); g.stroke();
  g.strokeStyle='#34d399'; g.beginPath(); g.moveTo(20,Y(E_red)); g.lineTo(w-8,Y(E_red)); g.stroke();
  g.setLineDash([]);
  g.font='10px sans-serif'; g.textAlign='left';
  g.fillStyle='#e2e8f0'; g.fillText('VB '+vb.toFixed(2), x0+bw+4, Y(vb)+4);
  g.fillText('CB '+cb.toFixed(2), x0+bw+4, Y(cb)-2);
  g.fillStyle='#7dd3fc'; g.fillText('Eg '+bg.toFixed(2), x0+bw/2-10, Y((vb+cb)/2)+3);
  g.fillStyle='#f59e0b'; g.fillText('E_ox '+E_ox, 20, Y(E_ox)-3);
  g.fillStyle='#34d399'; g.fillText('E_red '+E_red, 20, Y(E_red)-3);
  g.fillStyle='#94a3b8'; g.textAlign='right'; g.fillText('vs NHE/eV', w-8, 10); g.textAlign='left';
}
function drawVolcano(r){
  if(r.reaction==='OER'||activeReaction==='OER'){ drawOERVolcano(r); return; }
  const cv=document.getElementById('volcano-chart'); if(!cv) return;
  const w=cv.clientWidth||300, h=cv.clientHeight||120;
  if(w<10||h<10) return;
  const _bw=Math.min(4096,Math.round(w*DPR)), _bh=Math.min(4096,Math.round(h*DPR));
  if(cv.width!==_bw) cv.width=_bw;
  if(cv.height!==_bh) cv.height=_bh;
  const g=cv.getContext('2d'); g.setTransform(DPR,0,0,DPR,0,0);
  g.clearRect(0,0,w,h);
  const padL=30, padB=16, padT=8, padR=8;
  const x0=padL, x1=w-padR, y0=h-padB, y1=padT;
  const X=e=> x0+(e-1)/(6-1)*(x1-x0);
  const Y=d=> y0-(d-0)/(3-0)*(y0-y1);
  // 火山热力背景：火山高度 = (1-|EOV-3|/2.5) × min(1, ΔE*CH₃/1.8)
  for(let e=1;e<=6;e+=0.3){
    for(let d=0;d<=3;d+=0.3){
      const es=1-Math.min(1,Math.abs(e-3.0)/2.5);
      const ds=Math.min(1,d/1.8);
      const v=es*ds;
      g.fillStyle = v<0.35?'rgba(239,68,68,.10)':v<0.7?'rgba(245,158,11,.12)':'rgba(34,197,94,.16)';
      g.fillRect(X(e)-2,Y(d)-2,4,4);
    }
  }
  g.strokeStyle='rgba(148,163,184,.25)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(x0,y1); g.lineTo(x0,y0); g.lineTo(x1,y0); g.stroke();
  g.font='9px sans-serif'; g.fillStyle='#94a3b8'; g.textAlign='center';
  for(let e=1;e<=6;e++){ g.fillText(e, X(e), y0+12); }
  g.fillText('EOV (eV)', (x0+x1)/2, h-2);
  g.textAlign='right';
  for(let d=0;d<=3;d+=1){ g.fillText(d.toFixed(0), x0-4, Y(d)+3); }
  g.save(); g.translate(8,(y0+y1)/2); g.rotate(-Math.PI/2); g.textAlign='center'; g.fillText('ΔE*CH₃ (eV)',0,0); g.restore();
  g.fillStyle='rgba(52,211,153,.55)'; g.font='8px sans-serif'; g.textAlign='center';
  g.fillText('▲ 火山顶点区', X(3.0), Y(1.5)-6);
  const cx=X(Math.max(1,Math.min(6,r.eov))), cy=Y(Math.max(0,Math.min(3,r.dcht3)));
  const es=1-Math.min(1,Math.abs(r.eov-3.0)/2.5); const ds=Math.min(1,r.dcht3/1.8);
  const v=es*ds;
  const col=v<0.35?'#f87171':v<0.7?'#f59e0b':'#22c55e';
  g.strokeStyle=col; g.lineWidth=2; g.beginPath(); g.arc(cx,cy,5,0,7); g.stroke();
  g.fillStyle=col; g.beginPath(); g.arc(cx,cy,2,0,7); g.fill();
  g.fillStyle='#e2e8f0'; g.font='9px sans-serif'; g.textAlign='center';
  g.fillText('候选', cx, cy-9);
}
function renderSpectro(r){
  if(r.reaction==='OER'||activeReaction==='OER'){ renderOERSpectro(r); return; }
  const P=derivePhys(r);
  const uv=(r.bg!=null&&r.bg>0)? (1240/r.bg).toFixed(0)+' nm' : '—';
  const pl=(r.bg!=null&&r.bg>0)? (1240/(r.bg+0.12)).toFixed(0)+' nm' : '—';
  const epr=P.hasOv? '2.003 (Ov•)' : '—';
  const xrd=r.support_raw||r.support||'—';
  const set=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
  set('sp-uv',uv); set('sp-pl',pl); set('sp-epr',epr); set('sp-xrd',xrd);
}
function updateCandCard(r, predY, measY){
  const tag = r.userDesigned? '👤 用户配方 · ' : '';
  document.getElementById('cand-name').textContent=`${tag}${r.metal} / ${r.support}`;
  document.getElementById('cand-metal').textContent=`${r.metal} / ${r.support} · ${r.light}`;
  document.getElementById('cand-meas').textContent=`${measY.toFixed(1)} μmol·g⁻¹·h⁻¹`;
  document.getElementById('cand-pred').textContent=`${predY.toFixed(0)} ± ${curUnc.toFixed(0)} μmol·g⁻¹·h⁻¹`;
  document.getElementById('cand-sel').textContent=`${r.s!=null?r.s.toFixed(1):'—'} %`;
  document.getElementById('cand-mech').textContent=`${r.mech} · ${r.light}`;
  document.getElementById('cand-princ').innerHTML=princText(r)+`<br><span style="color:var(--dim)">DOI: ${r.doi}</span>`;
  renderConstraints(r);
  drawBand(r); drawVolcano(r);
  renderSpectro(r);
  refreshBest();
}
function refreshBest(){
  document.getElementById('best-name').textContent=best.name;
  if(activeReaction==='OER'){
    document.getElementById('best-metrics').textContent=`活性分 ${best.y>0?best.y.toFixed(0):'—'} · H₂O₂选择性 ${best.s>0?best.s.toFixed(0)+'%':'—'}`;
  }else{
    document.getElementById('best-metrics').textContent=`C2 产率 ${best.y>0?best.y.toFixed(1):'—'} · 选择性 ${best.s>0?best.s.toFixed(1)+'%':'—'}`;
  }
  document.getElementById('iter-tag').textContent=`迭代 #${iter}`;
  document.getElementById('mae').textContent=maeN?mae.toFixed(1):'—';
  const rb=document.getElementById('rmae'); if(rb) rb.textContent=rmaeN?(rmae/rmaeN*100).toFixed(1)+'%':'—';
}
function fmtSim(s){ if(s<60)return s.toFixed(0)+'s'; if(s<3600)return (s/60).toFixed(0)+'min'; if(s<86400)return (s/3600).toFixed(1)+'h'; return (s/86400).toFixed(1)+'d'; }
function updateSimClockUI(){
  const el=document.getElementById('sim-clock'); if(el) el.textContent='🌐 模拟 '+fmtSim(simClock);
  const te=document.getElementById('ts-tag'); if(te) te.textContent='⏱ ×'+timeScale.toLocaleString();
}
function meanY(){ return POOL.reduce((a,r)=>a+(r.y||0),0)/POOL.length; }
function median(arr){ const a=[...arr].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function medianY(){ return median(POOL.map(r=>r.y||0)); }
// —— 世界模型近邻相似度（用于文献先验 + 主动学习）——
function dist(a,b){
  let d=0;
  d += (a.mech===b.mech)?0:1.0;
  d += (a.metal===b.metal)?0:0.8;
  d += (a.support===b.support)?0:0.6;
  d += Math.abs((a.bg||2.8)-(b.bg||2.8))*0.4;
  d += Math.abs((a.ad||-0.5)-(b.ad||-0.5))*0.5;
  d += Math.abs((a.oox||0.4)-(b.oox||0.4))*0.3;
  d += (a.photo===b.photo)?0:0.3;
  return d;
}
function knn(pool, r, k){
  const arr=pool.map(p=>({p, d:dist(r,p)})).sort((x,y)=>x.d-y.d);
  return arr.slice(0, k);
}
function wmedian(items, getv){
  const arr=items.map(it=>({v:getv(it), w:Math.exp(-it.d)})).sort((a,b)=>a.v-b.v);
  let tw=0; for(const x of arr) tw+=x.w;
  let acc=0; for(const x of arr){ acc+=x.w; if(acc>=tw/2) return x.v; }
  return arr.length?arr[arr.length-1].v:0;
}

/* 物理 / 化学约束校验 —— 覆盖甲烷偶联光催化涉及的常见物理化学规律 */
function computeConstraints(r){
  if(r.reaction==='OER') return oerConstraints(r);
  const out=[];
  // 兜底：缺 EOV/ΔE*CH₃ 的条目（如扩展反应候选）统一派生，避免 .toFixed 崩溃
  if(r.eov==null) r.eov = eovOf(r);
  if(r.dcht3==null) r.dcht3 = dcht3Of(r);
  // —— 派生物理态（带隙缺失时用典型值估算并标注）——
  const bgKnown = r.bg!=null;
  const bg = bgKnown? r.bg : 2.8;
  const vb = 2.8 - (bg-2.5)*0.3;      // 价带顶近似 (vs NHE, eV)，O 2p 主导，光生空穴氧化能力
  const cb = vb - bg;                 // 导带底近似 (vs NHE, eV)，电子还原能力
  const E_ox = 1.7;                   // CH4 → ·CH3 + H+ + e- 空穴氧化势 (~V vs NHE)
  const E_red = -0.4;                 // CH4 → ·CH3 + H+ + e- 电子还原势近似
  const mech = r.mech||'OCM';
  const tempC = mech==='OCM'?740 : mech==='MPO'?400 : 320;
  const O2ratio = mech==='OCM'?0.5 : mech==='MPO'?1.0 : 0.0;
  const ad = r.ad, oox = r.oox!=null? r.oox : 0.4;
  const y = r.y||0;
  const lab = bgKnown? '' : '(带隙缺，按 2.8 eV 估算)';
  const P = derivePhys(r);

  // ① 热力学可行性 ΔG
  if(mech==='NOCM') out.push({k:'thermo',name:'① 热力学可行性 (ΔG)',st:(y>4000)?'warn':'pass',
      d:'2CH₄→C₂H₆+H₂，ΔG°≈+68 kJ/mol（无O₂上坡，须 hν>|ΔG|，效率受限）'});
  else if(mech==='OCM') out.push({k:'thermo',name:'① 热力学可行性 (ΔG)',st:'pass',
      d:'有O₂，ΔG<0；但 CO₂ 深度氧化在热力学上更有利，须控选择性'});
  else if(mech==='MPO') out.push({k:'thermo',name:'① 热力学可行性 (ΔG)',st:'pass',
      d:'甲烷部分光氧化（CH₄→含氧产物），O₂ 参与，ΔG<0'});
  else out.push({k:'thermo',name:'① 热力学可行性 (ΔG)',st:'warn',d:'机理未明确，热力学边界未知'});

  // ② 能带–红氧势对齐 (VB≥E_ox, CB≤E_red)
  { const oxOK=vb>=E_ox, redOK=cb<=E_red; let st='pass';
    let d=`VB≈${vb.toFixed(2)} V, CB≈${cb.toFixed(2)} V ${lab}。需 VB≥${E_ox} V(空穴氧化CH₄)、CB≤${E_red} V(电子还原)`;
    if(!oxOK&&!redOK) st='fail';
    else if(!oxOK||!redOK) st='warn';
    if(mech==='NOCM'&&!redOK){ st='fail'; d+=`；NOCM 依赖电子还原但 CB(${cb.toFixed(2)})>${E_red} V，还原驱动力不足`; }
    else if(!oxOK) d+=`；VB(${vb.toFixed(2)})<${E_ox} V，空穴难以氧化 CH₄`;
    out.push({k:'bandedge',name:'② 能带–红氧势对齐',st,d}); }

  // ③ 光子能量 / 光吸收 (hν≥Eg)
  { let st='pass', d=`Eg=${bg.toFixed(2)} eV ${lab}，氙灯 λ≥200 nm (hν≤6.2 eV) 可激发`;
    if(bg>3.2){ st='warn'; d=`Eg=${bg.toFixed(2)} eV 宽禁带，仅 UV 响应，可见光利用率低`; }
    else if(bg<1.5){ st='warn'; d=`Eg=${bg.toFixed(2)} eV 过窄，红氧驱动力不足且易腐蚀`; }
    out.push({k:'photon',name:'③ 光子能量 / 光吸收',st,d}); }

  // ④ Sabatier 吸附窗口
  if(ad==null) out.push({k:'sab',name:'④ Sabatier 吸附窗口',st:'warn',d:'缺少 CH₄ 吸附能数据'});
  else if(ad>-0.3) out.push({k:'sab',name:'④ Sabatier 吸附窗口',st:'fail',d:`E_ads=${ad} eV 过弱，C–H 难以活化`});
  else if(ad<-1.3) out.push({k:'sab',name:'④ Sabatier 吸附窗口',st:'warn',d:`E_ads=${ad} eV 过强，位点易中毒`});
  else out.push({k:'sab',name:'④ Sabatier 吸附窗口',st:'pass',d:`E_ads=${ad} eV 落最优窗口 (-0.3~-1.3)`});

  // ⑤ 过度氧化上限
  if(oox==null) out.push({k:'ox',name:'⑤ 过度氧化上限',st:'warn',d:'缺少过度氧化风险数据'});
  else if(oox>0.6) out.push({k:'ox',name:'⑤ 过度氧化上限',st:(r.s==null?'warn':(r.s>90?'warn':'pass')),d:`过度氧化风险 ${oox.toFixed(2)}，C₂ 选择性受 COₓ 竞争约束`});
  else out.push({k:'ox',name:'⑤ 过度氧化上限',st:'pass',d:`过度氧化风险 ${oox.toFixed(2)}（较低）`});

  // ⑥ 光热区分
  if(r.photo===true) out.push({k:'pt',name:'⑥ 光热区分',st:'warn',d:'文献标注显著光热贡献，纯光子效率可能被高估'});
  else if(r.photo===false) out.push({k:'pt',name:'⑥ 光热区分',st:'pass',d:'已区分光/热贡献'});
  else out.push({k:'pt',name:'⑥ 光热区分',st:'warn',d:'未明确光热贡献，建议核对'});

  // ⑦ 化学计量 / 原子守恒
  { let st='pass', d='C/H/O 守恒；';
    if(mech==='NOCM'&&O2ratio>0){ st='fail'; d='NOCM 必须无 O₂，但检测到 O₂ 进料 → 模式矛盾'; }
    else if((mech==='OCM'||mech==='MPO')&&O2ratio===0){ st='fail'; d:`${mech} 需要 O₂ 参与，但 O₂/CH₄=0 → 无法供氧`; }
    else d+=`O₂/CH₄=${O2ratio.toFixed(2)}，符合 ${mech} 计量需求`;
    out.push({k:'stoich',name:'⑦ 化学计量 / 原子守恒',st,d}); }

  // ⑧ 阿伦尼乌斯温度窗口
  { let st='pass', d=`反应温度 ≈${tempC}℃；升温加快速率(Arrhenius)，但受烧结/积碳上限约束`;
    if(tempC>900) st='fail';
    else if(tempC>700) st='warn';
    else if(tempC<200) st='warn';
    if(st==='fail') d=`${tempC}℃ 超过多数氧化物烧结/积碳极限 (>900℃)`;
    else if(st==='warn'&&tempC>700) d=`${tempC}℃ 偏高，存在烧结/活性相转变风险`;
    else if(st==='warn') d=`${tempC}℃ 偏低，本征速率受 Arrhenius 抑制`;
    out.push({k:'arr',name:'⑧ 阿伦尼乌斯温度窗口',st,d}); }

  // ⑨ 能斯特 / 氧化还原势（工况偏移）
  { const shift=0.059*Math.log10(Math.max(O2ratio,0.01)); const E_red_eff=E_red-shift;
    let st='pass', d=`能斯特偏移 ≈ ${shift.toFixed(3)} V；O₂ 压力升高使有效还原势移至 ${E_red_eff.toFixed(2)} V`;
    if(cb>E_red_eff+0.1){ st='warn'; d=`低压 O₂ 下 CB(${cb.toFixed(2)}) 仍高于有效还原势 ${E_red_eff.toFixed(2)} V，还原驱动力不足`; }
    out.push({k:'nernst',name:'⑨ 能斯特 / 氧化还原势',st,d}); }

  // ⑩ 朗缪尔吸附 / 表面覆盖
  { const thO2=O2ratio/(1+O2ratio), thCh4=0.5; let st='pass';
    let d=`Langmuir 覆盖度 θ_O₂≈${thO2.toFixed(2)}，θ_CH₄≈${thCh4.toFixed(2)}（适中，位点可用）`;
    if(O2ratio>0&&(thO2>0.95||thO2<0.05)){ st='warn'; d=`θ_O₂=${thO2.toFixed(2)} 偏离最优（过饱和堵塞 / 过低欠吸附）`; }
    if(thCh4>0.95) st='warn';
    out.push({k:'lang',name:'⑩ 朗缪尔吸附 / 表面覆盖',st,d}); }

  // ⑪ 勒夏特列平衡移动
  { let st='pass', d='提高 CH₄ 分压 / 贫 O₂ 有利于平衡向 C₂ 移动';
    if(mech==='OCM'&&O2ratio>0.8){ st='warn'; d=`O₂/CH₄=${O2ratio.toFixed(2)} 偏高，平衡偏向 CO₂（深度氧化）`; }
    else if(mech==='OCM'&&O2ratio<0.1){ st='warn'; d='O₂ 过低，氧化偶联速率受限'; }
    out.push({k:'lech',name:'⑪ 勒夏特列平衡移动',st,d}); }

  // ⑫ 质量传递限制
  { let st='pass', d='反应物扩散速率 ≥ 表面反应速率（有效性因子 η≈1）';
    if(y>20000) st='warn';
    if(st==='warn') d=`表观产率 ${y.toFixed(0)} 极高，需确认未被外扩散（质量传递）限制`;
    out.push({k:'mt',name:'⑫ 质量传递限制',st,d}); }

  // ⑬ 量子产率上限 Φ≤1
  { const aqy=y/32000; let st='pass';
    let d=`表观量子产率代理 ≈ ${aqy.toFixed(3)}（≤1 合理）`;
    if(aqy>1){ st='fail'; d=`表观量子产率 ≈ ${aqy.toFixed(2)} > 1，违反 Φ≤1 上限（数据/标定异常）`; }
    else if(aqy>0.5){ st='warn'; d=`表观量子产率 ≈ ${aqy.toFixed(2)} 偏高，接近理论上限`; }
    out.push({k:'qy',name:'⑬ 量子产率上限 (Φ≤1)',st,d}); }

  // ⑭ 反应焓 / 熵权衡
  { let st='pass', d='';
    if(mech==='NOCM'){ d='2CH₄→C₂H₆+H₂，Δn_gas≈0（ΔS 小），ΔG>0 上坡，需光子供能且效率受限'; st='warn'; }
    else d='OCM 放热（ΔH<0），低温有利；本征平衡受熵项小幅影响';
    out.push({k:'hen',name:'⑭ 反应焓 / 熵权衡',st,d}); }

  // ⑮ 催化剂稳定性（烧结 / 积碳）
  { let st='pass', d='操作条件在稳定性窗口内';
    if(tempC>850) st='warn';
    if(oox<0.15&&mech!=='NOCM'&&tempC>600) st='warn';
    if(st==='warn'&&tempC>850) d=`${tempC}℃ 接近烧结/相变临界，长期稳定性存疑`;
    else if(st==='warn') d='低过度氧化 + 高温富 CH₄，积碳风险升高';
    out.push({k:'stab',name:'⑮ 催化剂稳定性（烧结/积碳）',st,d}); }

  // ⑯ 比尔–朗伯光穿透
  { const alpha=1/(bg+0.5); let st='pass';
    let d=`吸收系数代理 α≈${alpha.toFixed(2)}；催化剂层需保证光穿透至活性位点`;
    if(bg>3.2){ st='warn'; d=`Eg=${bg.toFixed(2)} eV 吸收弱（UV-only），厚层内部光照不足，需薄膜/散射`; }
    out.push({k:'bl',name:'⑯ 比尔–朗伯光穿透',st,d}); }

  // ⑰ 电子–空穴复合
  { let st='pass', d='载流子分离充分（异质结/Z-方案/助催化剂）';
    if(bg<1.6&&cb>-0.2){ st='warn'; d='窄带隙且 CB 偏正，e⁻/h⁺ 复合加剧，需电荷分离工程'; }
    out.push({k:'rec',name:'⑰ 电子–空穴复合',st,d}); }

  // ⑱ 光化学选律 / 自旋守恒
  { let st='pass', d='';
    if(mech==='OCM'){ d='O₂ 为三重态，单重态光生空穴直接活化 O₂ 自旋禁阻；需表面自旋态/共催化剂破禁'; st='warn'; }
    else d='NOCM 无需直接活化 O₂，自旋选律限制较小';
    out.push({k:'spin',name:'⑱ 光化学选律 / 自旋守恒',st,d,cat:'动力学与传质'}); }

  // ⑲ 氧空位形成能窗口 (E_ovf)
  { const e=P.eovf; let st='pass';
    let d=`E_ovf≈${e.toFixed(2)} eV${P.hasOv?'（文献提及氧空位/Ov/缺陷）':''}；窗口 0.8–2.0 eV 最佳`;
    if(e<0.7){ st='warn'; d+='；过低→位点不稳/易复合或溶出'; }
    else if(e>2.4){ st='warn'; d+='；过高→难以形成，活性位点稀少'; }
    else if(P.hasOv){ d+='；易形成且稳定，活性位点充足'; }
    out.push({k:'ovf',name:'⑲ 氧空位形成能窗口',st,d,cat:'稳定性'}); }

  // ⑳ 肖特基势垒 / 金属–半导体结 (φ_B)
  { const phiB=P.phiB; let st='pass';
    let d=`金属功函数 Φ≈${P.wf.toFixed(2)} eV，载体 χ≈${P.chi.toFixed(1)} eV → φ_B≈${phiB.toFixed(2)} eV`;
    if(r.metals&&r.metals.length){ if(phiB<0.3){ st='warn'; d+='；势垒过低→近欧姆接触，电荷分离弱'; } }
    else { d+='；无助催化剂金属，依赖本体/异质结分离'; }
    out.push({k:'schottky',name:'⑳ 肖特基势垒 / 金属–半导体结',st,d,cat:'能带与载流子'}); }

  // ㉑ 载流子扩散长度 vs 粒径 (L_D vs d)
  { const Ld=P.Ld, dd=P.d; let st='pass';
    let ds=`L_D≈${Ld.toFixed(0)} nm，粒径 d≈${dd.toFixed(0)} nm`;
    if(Ld < dd*0.25){ st='fail'; ds+=`；L_D < d/4，体相复合主导，光子浪费`; }
    else if(Ld < dd*0.5){ st='warn'; ds+=`；L_D < d/2，部分载流子未达表面即复合`; }
    else ds+=`；L_D ≥ d/2，多数载流子可抵达表面活性位`;
    out.push({k:'ld',name:'㉑ 载流子扩散长度 vs 粒径',st,d:ds,cat:'能带与载流子'}); }

  // ㉒ 载流子寿命 vs 抵达表面所需时间
  { const tauS=P.tau*1e-9; const ttr=Math.pow(P.d*1e-7/2,2)/P.D;
    let st='pass';
    let ds=`τ≈${P.tau.toFixed(1)} ns，抵达表面 t≈${(ttr*1e9).toFixed(1)} ns`;
    if(tauS < ttr){ st='fail'; ds+=`；τ < t_transit，载流子未达表面即复合`; }
    else if(tauS < ttr*2){ st='warn'; ds+=`；τ 接近 t_transit，分离裕度小`; }
    else ds+=`；τ 充裕，分离驱动足够`;
    out.push({k:'tau',name:'㉒ 载流子寿命 vs 抵达表面时间',st,d:ds,cat:'能带与载流子'}); }

  // ㉓ 激子结合能 vs kT (E_b)
  { const kT=8.617e-5*(tempC+273.15)*1000; const Eb=P.Eb; let st='pass';
    let ds=`E_b≈${Eb} meV vs kT≈${kT.toFixed(0)} meV (@${tempC}℃)`;
    if(Eb > 5*kT){ st='warn'; ds+=`；E_b ≫ kT，中性激子难热解离，需异质结/等离激元`; }
    else ds+=`；E_b 量级接近 kT，光生载流子易分离`;
    out.push({k:'eb',name:'㉓ 激子结合能 vs kT',st,d:ds,cat:'能带与载流子'}); }

  // ㉔ 平带电势 / 空间电荷层耗尽宽度 (Mott–Schottky)
  { const ND=1e17, eps=9*8.854e-14, Vbi=Math.max(0.1,bg*0.3);
    const W=Math.sqrt(2*eps*Vbi/(1.602e-19*ND))*1e7;
    let st='pass';
    let ds=`假设 N_D≈1e17 cm⁻³，耗尽宽度 W≈${W.toFixed(0)} nm（vs d≈${P.d.toFixed(0)} nm）`;
    if(W < P.d*0.5){ st='warn'; ds+=`；W < d/2，空间电荷区未达表面，分离弱`; }
    else ds+=`；耗尽层贯穿至表面，内建电场有效分离载流子`;
    out.push({k:'ms',name:'㉔ 平带电势 / 空间电荷层 (Mott–Schottky)',st,d:ds,cat:'能带与载流子'}); }

  // ㉕ 动力学同位素效应 KIE (k_H/k_D)
  { const kie=P.kie; let st='pass';
    let ds=`KIE≈${kie.toFixed(1)}（C–H 活化若为 RDS，预期 2–7）`;
    if((mech==='OCM'||mech==='NOCM') && kie<1.5){ st='warn'; ds+=`；KIE<1.5 与“C–H 活化是决速步”不符，机理存疑`; }
    else if(kie>=1.5&&kie<8){ ds+=`；与 C–H 断裂为 RDS 一致（可用 ¹³CH₄/CD₄ 同位素示踪验证）`; }
    else if(kie>=8){ st='warn'; ds+=`；KIE 偏高，可能存在强隧穿/二级同位素效应`; }
    out.push({k:'kie',name:'㉕ 动力学同位素效应 KIE',st,d:ds,cat:'动力学与传质'}); }

  // ㉖ 分支选择性 C2 vs COx（用真实选择性 s）
  { const s=r.s; let st='pass'; let ds='';
    if(s==null){ st='warn'; ds='缺少选择性数据，无法判定 C2/COx 分支'; }
    else if(s>=85){ ds=`真实选择性 s=${s}% ≥85%，C2 产物分支占优`; }
    else if(s>=60){ st='warn'; ds=`s=${s}% 在 60–85%，COx 竞争明显`; }
    else { st='fail'; ds=`s=${s}% <60%，过度氧化/COx 分支占主导`; }
    out.push({k:'branch',name:'㉖ 分支选择性 C2 vs COx',st,d:ds,cat:'动力学与传质'}); }

  // ㉗ 光子通量 线性 / 饱和区
  { const I=P.I, Isat=P.Isat; let st='pass';
    let ds=`光强 I≈${I.toFixed(0)} mW/cm²，饱和阈值 ≈${Isat.toFixed(0)} mW/cm²`;
    if(I>Isat){ st='warn'; ds+=`；I > I_sat，双分子 e⁻–h⁺ 复合加剧，速率饱和`; }
    else if(I<60){ st='warn'; ds+=`；光强偏低，光子通量受限`; }
    else ds+=`；工作在线性区，速率 ∝ 光子通量`;
    out.push({k:'flux',name:'㉗ 光子通量 线性 / 饱和区',st,d:ds,cat:'动力学与传质'}); }

  // ㉘ 孔道 Knudsen 扩散
  { let st='pass', ds='';
    if(P.pore==null){ ds='非多孔/块体，外扩散主导'; }
    else if(P.pore<65){ st=(y>12000?'warn':'pass'); ds=`孔径≈${P.pore.toFixed(0)} nm < 平均自由程(~65 nm)，Knudsen 扩散；${y>12000?'高活性下孔道内传质受限':'传质可接受'}`; }
    else { ds=`孔径≈${P.pore.toFixed(0)} nm，分子扩散区`; }
    out.push({k:'knud',name:'㉘ 孔道 Knudsen 扩散',st,d:ds,cat:'动力学与传质'}); }

  // ㉙ 电位–pH (Pourbaix) 材料稳定性
  { let st='pass';
    let ds=`载体 ${r.support_raw||r.support}：${P.photoStab}`;
    if(/cds/.test(r.support||'') && (mech==='OCM'||mech==='MPO')){ st='warn'; ds+=`；光照+氧化条件易光腐蚀，需包覆/牺牲剂保护`; }
    else if(/wo3/.test(r.support||'') && mech==='NOCM'){ st='warn'; ds+=`；WO3 在还原电位下不稳定`; }
    out.push({k:'pour',name:'㉙ 电位–pH (Pourbaix) 稳定性',st,d:ds,cat:'稳定性'}); }

  // ㉚ 活化能 vs kT (E_a/kT)
  { const kT=8.617e-5*(tempC+273.15); const ratio=P.ea/kT; let st='pass';
    let ds=`E_a≈${P.ea.toFixed(2)} eV，E_a/kT≈${ratio.toFixed(0)}（@${tempC}℃）`;
    if(ratio>40){ st='warn'; ds+=`；E_a/kT >40，本征动力学受抑制（需光/热助驱动）`; }
    else if(ratio<6){ st='warn'; ds+=`；E_a/kT 过小，反应过快但可能牺牲选择性`; }
    else ds+=`；E_a/kT 处于合理区间`;
    out.push({k:'ea',name:'㉚ 活化能 vs kT (E_a/kT)',st,d:ds,cat:'动力学与传质'}); }

  // ㉛ 氧空位形成能 EOV —— 活化火山轴（基于应变工程 / AgPd–TiO₂ POCM 框架）
  { const eov=r.eov; let st='pass';
    let d=`EOV≈${eov.toFixed(2)} eV；甲烷 C–H 活化需"适度不稳定"晶格氧：EOV 过低(<1.8)→氧过活泼过度氧化，过高(>4.5)→氧太稳难活化 CH₄（火山峰≈2–4 eV）`;
    if(eov<1.8){ st='warn'; d+=`；EOV 偏低，活性氧过活泼，COₓ 竞争风险升高`; }
    else if(eov>4.5){ st='warn'; d+=`；EOV 偏高，晶格氧惰性，CH₄ 活化驱动力不足`; }
    else d+=`；落在活化火山最优窗口`;
    out.push({k:'eovv',name:'㉛ 氧空位形成能 EOV（活化火山）',st,d}); }
  // ㉜ 甲基吸附能差 ΔE*CH₃ —— 选择性火山轴
  { const dc=r.dcht3; let st='pass';
    let d=`ΔE*CH₃≈${dc.toFixed(2)} eV；C–C 偶联需·CH₃ 在活性位足够稳定：ΔE*CH₃ 越大选择性越高，但过大(>2.5)位点易中毒`;
    if(dc<0.4){ st='fail'; d+=`；ΔE*CH₃ 过小，·CH₃ 易脱附/过度氧化，C₂ 选择性差`; }
    else if(dc>2.5){ st='warn'; d+=`；ΔE*CH₃ 过大，位点强吸附易积碳中毒`; }
    else d+=`；落在选择性有利区间`;
    out.push({k:'dcht3',name:'㉜ 甲基吸附能差 ΔE*CH₃（选择性火山）',st,d}); }
  // ㉝ EOV–ΔE*CH₃ 双描述符火山（AgPd/TiO₂ POCM, JACS 2026）—— 综合火山顶点
  { const eov=r.eov, dc=r.dcht3;
    const eovScore=1-Math.min(1,Math.abs(eov-3.0)/2.5);
    const dcScore=Math.min(1,dc/1.8);
    const vol=eovScore*dcScore;
    let st='pass';
    let d=`双描述符火山高度代理≈${vol.toFixed(2)}（顶点 EOV≈3.0 & ΔE*CH₃≥1.5；二者协同越优）`;
    if(vol<0.35){ st='warn'; d+=`；远离火山顶点，本征活性/选择性受限`; }
    else if(vol>=0.8){ d+=`；逼近火山顶点，高活性+高选择性潜力`; }
    out.push({k:'volcano',name:'㉝ EOV–ΔE*CH₃ 双描述符火山',st,d}); }

  return out;
}

/* 实验现实性约束 —— 每次"真实实验"层面的操作规律/限制（迭代级） */
function experimentalChecks(r, measY, iter, reuse){
  const P=derivePhys(r);
  const mech=r.mech||'OCM';
  const tempC = mech==='OCM'?740 : mech==='MPO'?400 : 320;
  const O2ratio = mech==='OCM'?0.5 : mech==='MPO'?1.0 : 0.0;
  const flux = P.I/P.Isat;
  const bg = r.bg||2.8;
  const out=[];
  const add=(k,name,st,d)=>out.push({k,name,st,d});
  const conv=Math.min(0.99, measY/EXP.CAP);
  // ㉛ 检测限
  if(measY<=0) add('lod','㉛ GC／质谱检测限','fail','产物低于 GC-FID 检测限（≈'+EXP.LOD+' μmol·g⁻¹·h⁻¹），报告为「未检出」，并非真为零；需预浓缩或延长取样。');
  else if(measY<EXP.LOD*5) add('lod','㉛ GC／质谱检测限','warn','产率 '+measY.toFixed(0)+' 接近检测限（LOD '+EXP.LOD+'），定量误差显著增大。');
  else add('lod','㉛ GC／质谱检测限','pass','产率 '+measY.toFixed(0)+' 远高于检测限，定量可靠。');
  // ㉜ 碳质量平衡闭合
  if(conv>0.6) add('mbal','㉜ 碳质量平衡闭合','fail','估算 CH₄ 转化率 ≈'+(conv*100).toFixed(0)+'%，超出反应器物料平衡可达范围（C₂+COₓ 之和 > 进料 C），须核对称重/流量。');
  else if(conv>0.25) add('mbal','㉜ 碳质量平衡闭合','warn','估算转化率 ≈'+(conv*100).toFixed(0)+'%，高转化下 C 平衡难闭合、传质受限，实测须做碳平衡校验。');
  else add('mbal','㉜ 碳质量平衡闭合','pass','估算转化率 ≈'+(conv*100).toFixed(0)+'%，处于物料平衡易闭合区间。');
  // ㉝ 测量重现性
  if(r.s==null) add('repro','㉝ 测量重现性 ±8%','warn','文献未报道选择性，GC 定量可靠性无法评估，建议实测平行样 n≥3。');
  else if(r.s<5) add('repro','㉝ 测量重现性 ±8%','fail','选择性仅 '+r.s.toFixed(0)+'%，产物定量不可靠，GC 积分误差可淹没信号。');
  else if(r.s<20) add('repro','㉝ 测量重现性 ±8%','warn','选择性 '+r.s.toFixed(0)+'% 偏低，主产物峰与杂质/溶剂重叠，建议平行样 n≥3。');
  else add('repro','㉝ 测量重现性 ±8%','pass','每次实测含 ±8% 随机误差（已建模），建议以 ≥3 次平行样报告误差棒。');
  // ㉞ 批次失活
  if(reuse>12) add('deact','㉞ 催化剂批次失活','fail','同一载体家族已投料 '+reuse+' 次，积碳/烧结致活性衰减显著，需再生或换新批。');
  else if(reuse>5) add('deact','㉞ 催化剂批次失活','warn','该载体家族已使用 '+reuse+' 次，长周期运行须监测积碳/烧结失活。');
  else add('deact','㉞ 催化剂批次失活','pass','该载体家族累计投料 '+reuse+' 次，未见明显失活。');
  // ㉟ 光热热点/热失控
  if(tempC>850) add('thermal','㉟ 光热热点 / 热失控','fail','反应温度 '+tempC+'°C 超限，局部热点可致烧结或热失控。');
  else if(flux>0.8 && r.photo===true) add('thermal','㉟ 光热热点 / 热失控','warn','光热型催化剂在高光通量下局部热点可达 >600°C，须控温/稀释。');
  else add('thermal','㉟ 光热热点 / 热失控','pass','温控 '+tempC+'°C，热点风险可控。');
  // ㊱ 空速
  if(EXP.GHSV>60000) add('ghsv','㊱ 空速 GHSV / 接触时间','warn','空速 '+EXP.GHSV+' mL·g⁻¹·h⁻¹ 偏高，接触时间不足致转化偏低。');
  else if(EXP.GHSV<12000) add('ghsv','㊱ 空速 GHSV / 接触时间','warn','空速 '+EXP.GHSV+' 偏低，停留过长易过度氧化/副反应。');
  else add('ghsv','㊱ 空速 GHSV / 接触时间','pass','空速 '+EXP.GHSV+' mL·g⁻¹·h⁻¹ 处于常规接触窗口。');
  // ㊲ 暗态对照
  if(r.photo===true) add('dark','㊲ 暗态对照（光化学证据）','warn','光热型体系暗态仍有热活性，须做暗对照证明光子贡献、区分光热。');
  else add('dark','㊲ 暗态对照（光化学证据）','pass','建议暗态对照 ≈0 以确证光驱动；本体系光子贡献为主。');
  // ㊳ C3+ 副产物上限
  if(r.s==null) add('c3','㊳ C₃⁺ 副产物上限','warn','文献未报道选择性，C₃⁺/COₓ 竞争分支无法评估。');
  else if(r.s>99) add('c3','㊳ C₃⁺ 副产物上限','fail','选择性 '+r.s.toFixed(0)+'% 不物理：·CH₃ 与 C₂H₆ 再偶联生成 C₃⁺，或与 COₓ 竞争，C₂ 选择性有上限。');
  else if(r.s>95) add('c3','㊳ C₃⁺ 副产物上限','warn','选择性 '+r.s.toFixed(0)+'% 逼近 C₂ 选择性天花板，C₃⁺/COₓ 竞争须 accounted。');
  else add('c3','㊳ C₃⁺ 副产物上限','pass','选择性 '+r.s.toFixed(0)+'%，C₂ 与 C₃⁺/COₓ 分支合理。');
  // ㊴ O2/CH4 分压
  if(O2ratio>3) add('press','㊴ O₂/CH₄ 分压比','fail','O₂/CH₄='+O2ratio.toFixed(1)+' 过高：爆炸极限 + 深度过度氧化，危险。');
  else if(O2ratio<0.02) add('press','㊴ O₂/CH₄ 分压比','warn','O₂/CH₄='+O2ratio.toFixed(2)+' 过低，自由基更易气相复合而非选择性偶联。');
  else if(O2ratio>2) add('press','㊴ O₂/CH₄ 分压比','warn','O₂/CH₄='+O2ratio.toFixed(1)+' 偏高，过度氧化与 COₓ 选择性上升。');
  else add('press','㊴ O₂/CH₄ 分压比','pass','O₂/CH₄='+O2ratio.toFixed(1)+'，处于选择性偶联窗口。');
  // ㊵ 负载量/光屏蔽
  const morph=(r.morphology||'').toLowerCase();
  const nano=/nano|sheet|rod|particle|foam|dot|wire|flake|层|纳米|2d|tube/.test(morph);
  if(!nano) add('loading','㊵ 催化剂负载量 / 光屏蔽','warn','形貌「'+(r.morphology||'未注明')+'」缺乏纳米结构，高负载量下体相光屏蔽（Beer–Lambert）降低表观活性。');
  else add('loading','㊵ 催化剂负载量 / 光屏蔽','pass','纳米形貌利于光捕获，常规 1–5 wt% 负载下光屏蔽可忽略。');
  // ㊶ NOCM 平衡上限
  if(mech==='NOCM'){
    if(conv>0.7) add('eqceil','㊶ NOCM 平衡转化上限','fail','NOCM ΔG>0，估算转化率 '+(conv*100).toFixed(0)+'% 超热力学平衡天花板。');
    else if(conv>0.4) add('eqceil','㊶ NOCM 平衡转化上限','warn','NOCM 受热力学平衡限制，估算转化率 '+(conv*100).toFixed(0)+'% 逼近上限，须高温/非平衡破垒。');
    else add('eqceil','㊶ NOCM 平衡转化上限','pass','NOCM 当前估算转化率 '+(conv*100).toFixed(0)+'%，未触平衡天花板。');
  }
  // ㊷ 光源光谱匹配
  if(bg>3.5) add('spectrum','㊷ 光源光谱匹配','warn','带隙 '+bg.toFixed(2)+' eV 需 λ<'+(1240/bg).toFixed(0)+' nm，365 nm LED 光子能量不足，需深紫外光源。');
  else add('spectrum','㊷ 光源光谱匹配','pass','带隙 '+bg.toFixed(2)+' eV（λ<'+(1240/bg).toFixed(0)+' nm）与 365 nm LED 光源匹配。');
  // ㊸ 同位素 H/D 加扰
  if(r.s>92) add('label','㊸ 同位素示踪 H/D 加扰','warn','高选择性下若用 ¹³CH₄/CD₄ 标记，H/D 交换可致信号加扰、选择性被高估，须校正。');
  else add('label','㊸ 同位素示踪 H/D 加扰','pass','同位素标记实验须考虑 CH₄↔产物 H/D 交换加扰；当前定量区间影响小。');
  // ㊹ 死体积/GC 延迟
  add('deadvol','㊹ 取样死体积 / GC 定量延迟','pass','在线 GC 含管路死体积，首段产物被稀释，须弃去稳态前数据再积分。');
  return out;
}
function physicsFactor(r){
  if(r.reaction==='OER') return oerPhysFactor(r);
  const C=computeConstraints(r);
  let f=1;
  for(const c of C){ if(c.st==='fail')f*=0.72; else if(c.st==='warn')f*=0.96; }
  return Math.max(0.55,Math.min(1.08,f));
}
/* 物理信息化反应器模型（OCM 光催化）—— 与后端 services.simulate_experiment 逐条一致 */
function _clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

// 归一化多目标 RL 奖励（与后端 services.rl_reward / oer_reward_norm 同口径）
// r = 0.35·ŷ + 0.30·ŝ + 0.15·(1−decay) + 0.10·(1−Ê) + 0.10·(1−ĈOx)，∈[0,1]
const RW = { yield:0.35, selectivity:0.30, stability:0.15, energy:0.10, cox:0.10 };
const Y_REF_LO = 50.0, Y_REF_HI = 20000.0;
function _normYield(Y){
  if(Y==null || Y<=0) return 0;
  const lo=Math.log(Y_REF_LO), hi=Math.log(Y_REF_HI);
  return _clamp((Math.log(Math.max(Y,1e-6))-lo)/(hi-lo), 0, 1);
}
function _normEnergy(T, I){
  const t=_clamp((T-25)/(900-25),0,1), i=_clamp(I/500,0,1);
  return _clamp(0.65*t+0.35*i,0,1);
}
function rlRewardNorm(Y, s_eff, cond, reuse, f_ox_sel, f_pt, eov){
  const T=(cond&&cond.T!=null)?cond.T:700, I=(cond&&cond.I!=null)?cond.I:100;
  const n_y=_normYield(Y);
  const n_s=_clamp((s_eff||0)/100,0,1);
  const decay=1-Math.pow(1-0.04, Math.max(0, reuse|0));
  const n_stab=1-decay;
  const n_energy=1-_normEnergy(T,I);
  let cox;
  if(f_ox_sel!=null && f_pt!=null){ cox=1-_clamp(f_ox_sel*f_pt,0,1); if(eov!=null) cox=_clamp(cox*(1+0.35*_clamp((3.0-eov)/3.0,0,1)),0,1); }
  else cox=1-n_s;
  const n_cox=1-_clamp(cox,0,1);
  return RW.yield*n_y + RW.selectivity*n_s + RW.stability*n_stab + RW.energy*n_energy + RW.cox*n_cox;
}
// OER 归一化奖励（与后端 oer_reward_norm 同口径；无 COx 通道，权重并入活性）
function oerRewardNorm(d, target, reuse){
  const eta=d.eta, n_act=_clamp((1.2-eta)/(1.2-0.2),0,1);
  const n_sel=_clamp((target==='H2O2')?d.sel:(1-d.sel),0,1);
  const decay=1-Math.pow(1-0.04, Math.max(0, reuse|0));
  const n_stab=_clamp((d.stability!=null?d.stability:0.8)*(1-decay),0,1);
  const n_energy=_clamp(1-eta/1.0,0,1);
  const w_act=RW.yield+RW.cox;
  return w_act*n_act + RW.selectivity*n_sel + RW.stability*n_stab + RW.energy*n_energy;
}
function optimalConditions(cat){
  const mech = cat.mech || 'OCM';
  const eov = (cat.eov != null) ? cat.eov : 2.8;
  const bg  = (cat.bg  != null) ? cat.bg  : 2.8;
  const dc  = (cat.dcht3 != null) ? cat.dcht3 : 1.5;
  const baseT = ({'OCM':700,'MPO':400,'NOCM':350})[mech] || 520;
  let T_opt = baseT + 70*(eov - 2.5); T_opt = _clamp(T_opt, 450, 850); const W_T = 130;
  const low_eov = Math.max(0, 2.6 - eov), high_eov = Math.max(0, eov - 3.0);
  let R_opt = 0.5 - 0.12*low_eov + 0.06*high_eov; R_opt = _clamp(R_opt, 0.2, 1.0); const W_R = 0.35;
  let I_opt = 100 + 60*Math.max(0, bg - 2.8); I_opt = _clamp(I_opt, 60, 300); const W_I = 120;
  let G_opt = 6000 + 2000*Math.max(0, dc - 1.5); G_opt = _clamp(G_opt, 3000, 12000); const W_G = 5000;
  return { T_opt, R_opt, I_opt, G_opt, W_T, W_R, W_I, W_G,
    T_min: Math.max(300, T_opt - 1.6*W_T), T_max: Math.min(950, T_opt + 1.6*W_T),
    R_min: 0.1, R_max: 2.0, I_min: 0, I_max: 500, G_min: 1000, G_max: 30000 };
}
function defaultConditions(cat){
  if(cat.reaction==='OER') return oerDefaultConditions(cat);
  const o = optimalConditions(cat);
  return { T: o.T_opt, R: o.R_opt, I: o.I_opt, G: o.G_opt };
}
function simulateExperiment(cat, cond, reuse, noise){
  if(cat.reaction==='OER') return simulateOER(cat, cond, reuse, noise);
  const opt = optimalConditions(cat);
  let y_lit = (cat.y || 0);
  if(y_lit <= 0){
    try{
      const pr = predict(cat);
      const prior = Number(pr && pr.pred) || 0;
      if(prior > 0) y_lit = prior;
    }catch(e){}
  }
  const s_lit = (cat.s != null) ? cat.s : 60;
  const eov = (cat.eov != null) ? cat.eov : 2.8;
  const bg  = (cat.bg  != null) ? cat.bg  : 2.8;
  const T = (cond.T != null) ? cond.T : opt.T_opt;
  const R = (cond.R != null) ? cond.R : opt.R_opt;
  const I = (cond.I != null) ? cond.I : opt.I_opt;
  const G = (cond.G != null) ? cond.G : opt.G_opt;
  const f_act = Math.exp(-Math.pow((T - opt.T_opt) / opt.W_T, 2));
  const oxy_tend = _clamp((3.0 - eov) / 3.0, 0, 1);
  const excess = Math.max(0, R - opt.R_opt), deficit = Math.max(0, opt.R_opt - R);
  const f_ox_sel = Math.exp(-1.3 * excess * (0.4 + oxy_tend));
  const f_ox_conv = Math.exp(-0.8 * deficit);
  const f_ox = f_ox_sel * f_ox_conv;
  const f_pt = Math.exp(-0.0008 * Math.max(0, I - 250) * oxy_tend);
  const absor = _clamp(1.2 - 0.25 * (bg - 2.0), 0.3, 1.0);
  const phi = (I / (I + 50)) * absor;
  const phi_opt = (opt.I_opt / (opt.I_opt + 50)) * absor;
  const f_phot = _clamp(phi / phi_opt, 0, 1);
  const f_mt = Math.exp(-Math.pow((G - opt.G_opt) / opt.W_G, 2));
  const f_stab = Math.pow(1 - 0.04, Math.max(0, reuse | 0));
  const factors = { act: f_act, ox: f_ox, phot: f_phot, mt: f_mt, stab: f_stab, pt: f_pt };
  let Y = y_lit * f_act * f_ox * f_phot * f_mt * f_stab;
  const s_eff = _clamp(s_lit * f_ox_sel * f_pt, 0, 100);
  const reward = rlRewardNorm(Y, s_eff, {T, R, I, G}, reuse, f_ox_sel, f_pt, eov);
  if (noise != null){
    Y = Y * (1 + (Math.random()*2 - 1) * noise);
    if (Y < EXP.LOD) Y = 0;
  }
  return { Y, s_eff, factors, reward, opt, cond: { T, R, I, G }, y_lit, s_lit };
}
function searchTheoreticalOptimum(cat, reuse){
  const opt = optimalConditions(cat);
  const domain = {
    T: { min: opt.T_min, max: opt.T_max, opt: opt.T_opt },
    R: { min: opt.R_min, max: opt.R_max, opt: opt.R_opt },
    I: { min: opt.I_min, max: opt.I_max, opt: opt.I_opt },
    G: { min: opt.G_min, max: opt.G_max, opt: opt.G_opt },
  };
  const ruse = Math.max(0, reuse | 0);
  const cloneDomain = (src) => ({
    T: { min: src.T.min, max: src.T.max, opt: src.T.opt },
    R: { min: src.R.min, max: src.R.max, opt: src.R.opt },
    I: { min: src.I.min, max: src.I.max, opt: src.I.opt },
    G: { min: src.G.min, max: src.G.max, opt: src.G.opt },
  });
  const shrinkDomain = (base, center, shrink, minSpan) => {
    const out = {};
    for(const axis of ['T','R','I','G']){
      const baseLo = base[axis].min;
      const baseHi = base[axis].max;
      const baseSpan = Math.max(baseHi - baseLo, 1e-9);
      const c = center[axis];
      const half = Math.max(baseSpan * shrink * 0.5, minSpan[axis] * 0.5);
      let lo = Math.max(baseLo, c - half);
      let hi = Math.min(baseHi, c + half);
      if(hi - lo < minSpan[axis]){
        lo = Math.max(baseLo, c - minSpan[axis] / 2);
        hi = Math.min(baseHi, lo + minSpan[axis]);
        if(hi - lo < minSpan[axis]){
          hi = Math.min(baseHi, c + minSpan[axis] / 2);
          lo = Math.max(baseLo, hi - minSpan[axis]);
        }
      }
      out[axis] = { min: lo, max: hi, opt: base[axis].opt };
    }
    return out;
  };
  const evaluateRound = (roundDomain) => {
    const levels = [0, 0.25, 0.5, 0.75, 1];
    const lerp = (lo, hi, t) => lo + (hi - lo) * t;
    let roundBest = null;
    let tested = 0;
    for(const a of levels) for(const b of levels) for(const c of levels) for(const d of levels){
      const cond = {
        T: lerp(roundDomain.T.min, roundDomain.T.max, a),
        R: lerp(roundDomain.R.min, roundDomain.R.max, b),
        I: lerp(roundDomain.I.min, roundDomain.I.max, c),
        G: lerp(roundDomain.G.min, roundDomain.G.max, d),
      };
      const sim = simulateExperiment(cat, cond, ruse, null);
      tested++;
      if(!roundBest || sim.reward > roundBest.sim.reward || (sim.reward === roundBest.sim.reward && sim.Y > roundBest.sim.Y)){
        roundBest = { conditions: cond, sim };
      }
    }
    return { best: roundBest, tested };
  };
  if(cat.reaction==='OER'){
    const cond = oerDefaultConditions(cat);
    const sim = simulateOER(cat, cond, ruse, null);
    const roundInfo = {
      round: 1,
      tested: 1,
      domain: cloneDomain(domain),
      best_conditions: { ...cond },
      best_reward: sim.reward,
      best_Y: sim.Y,
      best_s_eff: sim.s_eff,
      improvement: null,
      converged: true,
    };
    const reason = 'OER 解析最优一步收敛';
    return {
      conditions: cond,
      sim,
      feasible_domain: domain,
      search: { method: 'virtual-convergence-analytic-oer', tested: 1, rounds: 1, converged: true, reason },
      iterations: [roundInfo],
      trace: [roundInfo],
      best_trace: [roundInfo],
      best: { conditions: cond, sim },
      converged: true,
      convergence_reason: reason,
      conditions_source: 'virtual-converged-optimum',
    };
  }
  const minSpan = {
    T: Math.max(8, opt.W_T * 0.25),
    R: Math.max(0.04, opt.W_R * 0.25),
    I: Math.max(15, opt.W_I * 0.25),
    G: Math.max(120, opt.W_G * 0.25),
  };
  const shrinkSchedule = [1.0, 0.55, 0.3, 0.18];
  const baseDomain = cloneDomain(domain);
  let best = null;
  const iterations = [];
  let totalTested = 0;
  let previousBestReward = null;
  let converged = false;
  let convergenceReason = '';
  for(const [roundIndex, shrink] of shrinkSchedule.entries()){
    const roundNo = roundIndex + 1;
    const roundDomain = roundNo === 1 ? baseDomain : shrinkDomain(baseDomain, best.conditions, shrink, minSpan);
    const { best: roundBest, tested } = evaluateRound(roundDomain);
    totalTested += tested;
    if(!best || roundBest.sim.reward > best.sim.reward || (roundBest.sim.reward === best.sim.reward && roundBest.sim.Y > best.sim.Y)){
      best = { conditions: { ...roundBest.conditions }, sim: { ...roundBest.sim } };
    }
    const improvement = previousBestReward == null ? null : best.sim.reward - previousBestReward;
    const spanState = {
      T: +(roundDomain.T.max - roundDomain.T.min).toFixed(6),
      R: +(roundDomain.R.max - roundDomain.R.min).toFixed(6),
      I: +(roundDomain.I.max - roundDomain.I.min).toFixed(6),
      G: +(roundDomain.G.max - roundDomain.G.min).toFixed(6),
    };
    const roundRecord = {
      round: roundNo,
      tested,
      domain: roundDomain,
      best_conditions: { ...best.conditions },
      best_reward: best.sim.reward,
      best_Y: best.sim.Y,
      best_s_eff: best.sim.s_eff,
      improvement,
      span: spanState,
      converged: false,
    };
    iterations.push(roundRecord);
    const spanSmall = Object.keys(spanState).every(axis => spanState[axis] <= minSpan[axis]);
    if(roundNo >= 2 && improvement != null && Math.abs(improvement) < 0.005){
      converged = true;
      convergenceReason = `连续两轮最优 reward 提升 < 0.005（第 ${roundNo} 轮）`;
      roundRecord.converged = true;
      break;
    }
    if(roundNo >= 2 && spanSmall){
      converged = true;
      convergenceReason = `搜索窗口已收缩到最小阈值（第 ${roundNo} 轮）`;
      roundRecord.converged = true;
      break;
    }
    previousBestReward = best.sim.reward;
  }
  if(!converged){
    convergenceReason = `完成 ${iterations.length} 轮虚拟搜索，取最高 reward 作为理论最优`;
  }
  return {
    conditions: { ...best.conditions },
    sim: { ...best.sim },
    feasible_domain: domain,
    search: { method: 'virtual-convergence-5x5x5x5', tested: totalTested, rounds: iterations.length, converged, reason: convergenceReason },
    iterations,
    trace: iterations,
    best_trace: iterations,
    best: { conditions: { ...best.conditions }, sim: { ...best.sim } },
    converged,
    convergence_reason: convergenceReason,
    conditions_source: 'virtual-converged-optimum',
  };
}

/* 世界模型预测：全库文献先验（近邻类比） + 自有实验精炼 + 物理可行性调制 */
function predict(r){
  if(r.reaction==='OER') return predictOER(r);
  // 文献先验：从统一近邻池 ALLCAT 取近邻（含真实 OCM 文献 + Zavyalova + CADS 真实数据）
  const priorPool = ALLCAT.filter(p=>p!==r && !(p.metal===r.metal&&p.support===r.support&&p.mech===r.mech));
  const ns = knn(priorPool, r, 18);
  // 仅用 OCM 族(真实 OCM 文献 + Zavyalova/CADS 真实数据)成功样品(y>0)做先验
  const succ = ns.map(it=>it.p).filter(p=>p.y>0 && famOf(p.domain)==='OCM');
  const famY = succ.length ? wmedian(succ, p=>p.y) : null;
  const famVals = succ.map(p=>p.y).sort((a,b)=>a-b);
  const famStd = famVals.length>1 ? (famVals[famVals.length-1]-famVals[0]) : (famY!=null?famY:6000)*0.3;
  // 锚定：文献已报道真实产率优先；否则用同族成功近邻中位数兜底
  const anchor = (r.y>0) ? r.y : (famY!=null ? famY : 6000);
  const failFrac = ns.length ? (ns.filter(it=>it.p.y<=0).length / ns.length) : 0.5;
  let pred = anchor;
  let unc = Math.max(famStd*0.5, anchor*0.12, 300) * (1 + 1.6*failFrac);
  // 实验精炼：把世界模型"自己做出的实验"折回训练集，相似点越多预测越紧（剔除 y≤0 点）
  if(measured.length){
    const ms = knn(measured.map(m=>m.r), r, 10).filter(it=>it.p.y>0);
    const close = ms.filter(it=>it.d<1.2);
    if(close.length){
      const mY = wmedian(close, it=>it.p.y);
      const vs = close.map(it=>it.p.y).sort((a,b)=>a-b);
      const spread = (vs[vs.length-1]-vs[0]) || anchor*0.1;
      const w = Math.min(0.85, close.length/6);
      pred = pred*(1-w) + mY*w;
      unc = unc*(1-w) + spread*0.5*w;
    }
  }
  const pf=physicsFactor(r);
  if(r.y>0){
    // 文献已报道真实产率：预测中心锚定真实值，不再被物理因子平移（避免系统性偏差）；
    // 物理约束只放大不确定度（约束越差越不敢精确复述文献值）
    const uncAdj = Math.max(unc, anchor*0.08) * (1 + (1-pf));
    return {pred: pred, unc: Math.max(uncAdj, 120), transfer: null};
  }
  return {pred: pred*pf, unc: Math.max(unc*Math.max(1,Math.abs(pf)), 120), transfer: null};
}
/* 在线回调后端 /api/predict：统一前后端世界模型预测（后端为 XGBoost 残差替代器，含 KNN 兜底）。
   仅在后端可达时发起请求；任何失败（离线 / 超时 / 解析错误）返回 null，调用方回退本地 predict()，
   保证世界模型纯离线时仍可由本地确定性逻辑完整运行。 */
async function onlinePredict(cat){
  if(!backendOk) return null;            // 后端未连接：同步返回 null，零额外开销
  try{
    const strip = {
      metal: cat.metal, support: cat.support, support_display: cat.support_display,
      mech: cat.mech, ad: cat.ad, bg: cat.bg, eov: cat.eov, dcht3: cat.dcht3,
      y: cat.y, s: cat.s, doi: cat.doi, id: cat.id,
      reaction: cat.reaction || 'OCM', oer_target: oerTarget
    };
    const meas = measured.map(m => ({
      doi: m.doi, y: m.y,
      r: { metal:m.r.metal, support:m.r.support, mech:m.r.mech, y:m.r.y,
           ad:m.r.ad, bg:m.r.bg, eov:m.r.eov, dcht3:m.r.dcht3,
           reaction: m.r.reaction || 'OCM' }
    }));
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2000);
    // 双保险：即便 AbortController 未触发，2.5s 硬超时也解析为 null（绝不让在线预测挂起冻结主循环）
    const TIMEOUT = new Promise(res => setTimeout(() => res(null), 2500));
    const res = await Promise.race([
      fetch(backendBase + '/api/predict', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ candidate: strip, measured: meas, oer_target: oerTarget }),
        signal: ctrl.signal
      }),
      TIMEOUT
    ]);
    clearTimeout(tid);
    if(!res) return null;          // 硬超时命中
    if(!res.ok) return null;
    const j = await res.json().catch(() => null);
    if(!j || typeof j.pred !== 'number') return null;
    return { pred:j.pred, unc:(j.unc!=null?j.unc:300), model:j.model||'xgb',
             eta:j.eta, selH2O2:j.selH2O2, score:j.score, transfer:j.transfer };
  }catch(e){ return null; }   // 网络 / 解析失败 → 回退本地
}
async function onlineSearchTheoreticalOptimum(cat){
  if(!backendOk) return null;
  try{
    const strip = {
      metal: cat.metal, support: cat.support, support_display: cat.support_display,
      mech: cat.mech, ad: cat.ad, bg: cat.bg, eov: cat.eov, dcht3: cat.dcht3,
      y: cat.y, s: cat.s, doi: cat.doi, id: cat.id,
      reaction: cat.reaction || 'OCM', oer_target: oerTarget
    };
    const meas = measured.map(m => ({
      doi: m.doi, y: m.y,
      r: { metal:m.r.metal, support:m.r.support, mech:m.r.mech, y:m.r.y,
           ad:m.r.ad, bg:m.r.bg, eov:m.r.eov, dcht3:m.r.dcht3,
           reaction: m.r.reaction || 'OCM' }
    }));
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2500);
    const TIMEOUT = new Promise(res => setTimeout(() => res(null), 3000));
    const res = await Promise.race([
      fetch(backendBase + '/api/simulate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ candidate: strip, conditions: defaultConditions(cat), reuse: supportReuse[cat.support] || 0, noise: null, search_optimum: true, oer_target: oerTarget, measured: meas }),
        signal: ctrl.signal
      }),
      TIMEOUT
    ]);
    clearTimeout(tid);
    if(!res || !res.ok) return null;
    const j = await res.json().catch(() => null);
    return j && j.theoretical ? j.theoretical : null;
  }catch(e){ return null; }
}
/* 实验数据模式判定：本轮迭代是否使用真实实验值作为反馈
   - real：始终开真实数据闸门
   - sim ：永远用模拟值（不弹闸门）
   - hybrid：前 REAL_AFTER_ITER 次迭代用模拟值，第 REAL_AFTER_ITER+1 次起用真实值 */
function useRealDataForIteration(n){
  if(DATA_MODE==='real') return true;
  if(DATA_MODE==='sim') return false;
  return n > REAL_AFTER_ITER;   // hybrid
}
function dataModeLabel(){
  if(DATA_MODE==='real') return '始终真实';
  if(DATA_MODE==='sim') return '纯模拟';
  return `混合（前 ${REAL_AFTER_ITER} 次模拟，之后真实）`;
}
function updateDataModeTag(){
  const el=document.getElementById('data-mode-tag');
  if(el) el.textContent='🧪 数据：'+dataModeLabel();
}
async function startIteration(){
  iter++; setStage(0); loopStage=0;
  try{ drawBetaCurve(); }catch(e){}          // β 随迭代退火：新一轮即刷新曲线与探索/利用标签
  curCand = await pickNextCandidate(); sampled[curCand.doi]=true;
  curRecipeMod = curCand.userDesigned ? (curCand.recipeMod||1) : 1;
  expChecks=[];   // 新候选：清空上一轮迭代级实验约束，避免串台
  const C=computeConstraints(curCand);
  let _pickMsg;
  if(activeReaction==='OER'){
    _pickMsg = `▶ 迭代 #${iter} · ${curCand.userDesigned?'👤用户配方':'主动学习'}选取 OER 候选 <b>${curCand.metal} / ${curCand.support_display||curCand.support}</b>（活性位点 ΔG*OH=${curCand.doh.toFixed(2)} eV；稳定性 ${curCand.stability.toFixed(2)}；目标 ${oerTarget}）${curCand.userDesigned?` · 合成调制因子 ≈ ${curRecipeMod.toFixed(2)}`:''}`;
  }else{
    _pickMsg = `▶ 迭代 #${iter} · ${curCand.userDesigned?'👤用户配方':'主动学习'}选取候选 <b>${curCand.metal} / ${curCand.support_display||curCand.support}</b>（${curCand.product||'C2'}；机理 ${curCand.mech}；CH₄吸附能 ${curCand.ad!=null?curCand.ad.toFixed(2)+' eV':'缺'}；带隙 ${curCand.bg!=null?curCand.bg.toFixed(2)+' eV':'缺'}；EOV ${curCand.eov.toFixed(2)} eV；ΔE*CH₃ ${curCand.dcht3.toFixed(2)} eV）${curCand.userDesigned?` · 合成调制因子 ≈ ${curRecipeMod.toFixed(2)}`:''}`;
  }
  log('ai', _pickMsg);
  // 先做虚拟合成与表征内循环：优先走后端权威收敛结果；失败时才回退本地搜索
  const _search = backendOk ? await onlineSearchTheoreticalOptimum(curCand) : null;
  const _localSearch = _search ? null : searchTheoreticalOptimum(curCand, supportReuse[curCand.support] || 0);
  const _theo = _search || _localSearch;
  const _cond = (_theo && _theo.conditions) ? _theo.conditions : (curCand.__audit && curCand.__audit.conditions ? curCand.__audit.conditions : defaultConditions(curCand));
  const _base = (_theo && _theo.sim) ? _theo.sim : ((curCand.__audit && curCand.__audit.pred != null)
    ? {pred:curCand.__audit.pred, Y:curCand.__audit.pred, s_eff:curCand.__audit.s_eff, reward:curCand.__audit.reward,
       eta:curCand.__audit.eta, selH2O2:curCand.__audit.selH2O2}
    : simulateExperiment(curCand, _cond, 0, null));
  const _fd = (_theo && _theo.feasible_domain) || (curCand.__audit && curCand.__audit.feasible_domain) || null;
  const _csrc = (_theo && _theo.conditions_source) || (curCand.__audit && curCand.__audit.conditions_source) || 'virtual-converged-optimum';
  curCand.__cond = _cond; curCand.__sim = _base; curCand.__fd = _fd; curCand.__condSource = _csrc; curCand.__theoretical = _theo;
  renderDecision(curCand.__audit);          // 任务③/④：显式展示 7B 决策（状态/来源/策略/理由）
  // 异步 7B 建议：若本轮回退（7B 未在同步 25s 内返回），后端仍在后台跑，
  // 轮询其建议并补进决策卡「🧠 7B 建议」行，主循环不被慢 7B 阻塞。
  if(curCand.__audit && curCand.__audit.strategizing){
    pollStrategyProposal(curCand.__audit.iteration);
  }
  // 显式展示「虚拟合成与表征」内循环：第 N 轮推理/验证、最优更新、收敛判定
  if(_theo && Array.isArray(_theo.iterations) && _theo.iterations.length){
    for(const it of _theo.iterations){
      const dc = it.best_conditions || it.domain || {};
      const core = dc.R > 0 ? `CH₄:O₂ ≈ ${(1/dc.R).toFixed(1)} : 1` : (dc.V != null ? `V ${dc.V.toFixed(1)} V` : '');
      const head = (dc.T != null ? `，T ${dc.T.toFixed(0)}℃` : '') + (dc.I != null ? `，I ${dc.I.toFixed(0)} mW/cm²` : '') + (dc.G != null ? `，GHSV ${dc.G.toFixed(0)} mL·g⁻¹·h⁻¹` : '') + (core ? `，${core}` : '');
      log('df', `　↳ 第 ${it.round} 轮虚拟推理/验证：测试 ${it.tested || 0} 组，最优 reward ≈ ${Number(it.best_reward || 0).toFixed(3)}${head}`);
    }
    if(_theo.converged){
      log('ok', `✅ 虚拟内循环收敛：${_theo.convergence_reason || '已得到稳定理论最优解'}。接下来进入真实实验反馈。`);
    }else{
      log('warn', `⚠ 虚拟内循环尚未显式收敛：${_theo.convergence_reason || '已采用当前最佳解作为真实实验起点'}`);
    }
  }
  let _planMsg;
  if(activeReaction==='OER'){
    _planMsg = `🧪 虚拟内循环收敛后的理论最优：电化学 OER · 目标 ${oerTarget} · 电位 ${_cond.V.toFixed(1)} V（vs RHE） → 理论最优预测 活性分 ≈ ${_base.Y.toFixed(0)}，过电位 η ≈ ${_base.eta.toFixed(2)} V，H₂O₂ 选择性 ≈ ${(_base.selH2O2*100).toFixed(0)}%，奖励 ≈ ${_base.reward.toFixed(0)}`;
  }else{
    _planMsg = `🧪 虚拟内循环收敛后的理论最优：${_cond.R>0?`CH₄:O₂ ≈ ${(1/_cond.R).toFixed(1)} : 1`:''} · 反应温度 ${_cond.T.toFixed(0)}℃ · 光强 ${_cond.I.toFixed(0)} mW/cm² · 空速 GHSV ${_cond.G.toFixed(0)} mL·g⁻¹·h⁻¹ → 理论最优预测 C2 ≈ ${_base.Y.toFixed(0)} μmol·g⁻¹·h⁻¹，选择性 ≈ ${_base.s_eff.toFixed(1)}%，奖励 ≈ ${_base.reward.toFixed(0)}`;
  }
  log('df', _planMsg);
  if(_fd) log('df', `　⚙ 虚拟收敛可行域：T[${_fd.T.min.toFixed(0)},${_fd.T.max.toFixed(0)}] opt${_fd.T.opt.toFixed(0)} · R[${_fd.R.min.toFixed(2)},${_fd.R.max.toFixed(2)}] opt${_fd.R.opt.toFixed(2)} · I[${_fd.I.min.toFixed(0)},${_fd.I.max.toFixed(0)}] opt${_fd.I.opt.toFixed(0)} · G[${_fd.G.min.toFixed(0)},${_fd.G.max.toFixed(0)}] opt${_fd.G.opt.toFixed(0)}`);
  renderConstraints(curCand); drawBand(curCand); renderSpectro(curCand);   // 即时渲染候选级约束/能带/光谱（实验现实性待实测后补）
  // 真实历史 OCM 文献产率先验：检索最近 Zavyalova/CADS 组成类似物，给出真实 % 产率/选择性上下文
  const _om = nearestOCM(curCand);
  if(_om) log('ai',`　📚 历史 OCM 文献：最近类似物 <b>${_om.metal}/${_om.support_display||_om.support}</b>（${_om.src||''}${_om.T_C!=null?' @ '+_om.T_C+'℃':''}），真实 C2 产率 ≈ ${_om.ypct!=null?_om.ypct.toFixed(1)+'%':'—'}${_om.spct!=null?'，C2 选择性 ≈ '+_om.spct.toFixed(1)+'%':''}`);
  routeStage(0); loopState='moving';
}
function currentOpDur(){ return OP_DUR[activeDevice]||600; }
async function onOpComplete(){
  if(_opBusy) return;          // 异步网络回调期间防重入：忽略本轮内的重复触发
  _opBusy=true; _opBusySince=performance.now();
  try{
  if(loopStage===0){
    let pr;
    if(curCand.__audit){ pr = {pred:curCand.__audit.pred, unc:(curCand.__audit.unc||300), model:'xgb'}; }
    else { pr = await onlinePredict(curCand); if(!pr) pr = predict(curCand); if(pr && !pr.model) pr.model='knn'; }
    const _mtag = (pr && pr.model==='xgb') ? ' 🤖XGBoost' : ' 📚KNN';
    curPredY=pr.pred*curRecipeMod; curUnc=pr.unc;
    setStage(1);
    let _synMsg;
    if(activeReaction==='OER'){
      const _sm=curCand.__sim||{};
      _synMsg=`电化学制备 → 负载 ${curCand.metal}/${curCand.support_display||curCand.support} · 世界模型预测 OER 活性分 ≈ ${curPredY.toFixed(0)} ± ${curUnc.toFixed(0)}（过电位 η≈${_sm.eta!=null?_sm.eta.toFixed(2):'?'} V，H₂O₂ 选择性≈${_sm.selH2O2!=null?(_sm.selH2O2*100).toFixed(0):'?'}%${curCand.userDesigned?`，已叠加合成调制 ×${curRecipeMod.toFixed(2)}`:''}）`;
    }else{
      _synMsg=`虚拟合成 → 称量 + 焙烧制备 <b>${curCand.metal}/${curCand.support_display||curCand.support}</b> · 世界模型（文献先验 + 自有实验精炼）预测 C2 产率 ≈ ${curPredY.toFixed(0)} ± ${curUnc.toFixed(0)}${curCand.userDesigned?` · 已叠加你的合成调制 ×${curRecipeMod.toFixed(2)}`:''}`;
    }
    log('df', _synMsg + _mtag);
    loopStage=1; routeStage(1); loopState='moving';
  } else if(loopStage===1){
    setStage(2);
    // —— 真实世界实验数据闸门（受「实验数据模式」控制）——
    // 暂停主循环，弹出上传面板，让用户录入真实实验数据作为真实反馈；
    // 用户「应用」→ 用真实实测值；用户「关闭（保存进度，用模拟值）」→ 继续用模拟噪声值。
    // 仅在「始终真实」或「混合模式下已达阈值」时开闸门；纯模拟 / 混合前置阶段直接用模拟值反馈，不弹面板。
    let realRows = null;
    const _useReal = useRealDataForIteration(iter);
    if(_useReal){
      // 优先消费 AI 对话栏登记（📥 应用为真实实验反馈）的数据；否则弹出上传面板
      if(window.__chatRealRows && window.__chatRealRows.length){
        realRows = window.__chatRealRows; window.__chatRealRows = null;
        log('user','🧪 已采用 AI 对话栏上传的真实实验数据（'+realRows.length+' 行）作为本轮真实反馈（替代模拟噪声值）。');
      } else if(backendOk && typeof openRealDataModal === 'function'){
        log('user','🔬 进入「真实实验反馈」：弹出真实数据上传面板（可上传 .csv/.xlsx/.tif，或跳过用模拟值）。');
        realRows = await openRealDataModal({gate:true, candidate: curCand});
        // 恢复主循环运行态（闸门期间曾被暂停）
        if(typeof running!=='undefined'){ running = true; const bp=document.getElementById('btn-play'); if(bp) bp.textContent='⏸ 暂停'; }
      }
    } else {
      log('ai', `🧪 [数据模式：${dataModeLabel()}] 第 ${iter} 轮用模拟值作为反馈（未达真实数据阈值），跳过真实实验闸门。`);
    }
    const realHit = (realRows && realRows.length) ? pickRealMeasurementForCurrent(realRows) : null;
    // 真实实验：物理信息化反应器 —— 后端 /api/simulate（以实际复用轮次 reuse 计算，含 ±8% 噪声）；离线本地同等公式回退
    const reuse = supportReuse[curCand.support] || 0;          // 该载体已复用轮次（稳定性衰减因子）
    const cond = curCand.__cond || defaultConditions(curCand);
    let predY = null, measY = null;
    if(backendOk && curCand.__audit){
      try{
        const strip = {metal:curCand.metal, support:curCand.support, support_display:curCand.support_display,
                       mech:curCand.mech, ad:curCand.ad, bg:curCand.bg, eov:curCand.eov, dcht3:curCand.dcht3,
                       y:curCand.y, s:curCand.s, doi:curCand.doi, id:curCand.id,
                       reaction: curCand.reaction||'OCM', oer_target: oerTarget};
        const res = await fetch(backendBase + '/api/simulate', {method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({candidate: strip, conditions: cond, reuse: reuse, noise: 0.08, oer_target: oerTarget})});
        const s = await res.json();
        predY = s.Y0; measY = s.Y;
      }catch(e){ /* 单次 simulate 失败仅本地回退，不污染全局后端状态 */ }
    }
    if(predY == null){
      const sp = simulateExperiment(curCand, cond, reuse, null);   // 无噪基线（预测）
      const sm = simulateExperiment(curCand, cond, reuse, 0.08);   // ±8% 噪声（实测）
      predY = sp.Y; measY = sm.Y;
    }
    if(curCand.userDesigned){ predY *= curRecipeMod; measY *= curRecipeMod; }  // 用户配方：合成质量调制（legacy）
    // —— 接入真实世界实验数据：若用户在闸门上传并匹配到当前候选，则用真实实测值覆盖模拟值 ——
    let _realTag = '';
    let sEffRealOverride = null;
    if(realHit && realHit.yield != null){
      measY = realHit.yield;
      if(realHit.selectivity != null) sEffRealOverride = realHit.selectivity;
      _realTag = ' 🧪真实数据';
      log('ok', `🧪 采用真实实验数据（来源：${realHit.catalyst||curCand.metal}${realHit.doi?(' · '+realHit.doi):''}）：实测 C2 产率 <b>${measY.toFixed(1)}</b>${realHit.selectivity!=null?`，选择性 ${realHit.selectivity.toFixed(1)}%`:''}（替代模拟噪声值）`);
    }
    if(measY < EXP.LOD) measY = 0;
    curPredY = predY;
    const err = Math.abs(predY - measY);
    mae = (mae*maeN + err)/(maeN+1); maeN++;
    const relErr = err/Math.max(measY,1); rmae=(rmae*rmaeN+relErr)/(rmaeN+1); rmaeN++;
    let sEff = (curCand.__sim && curCand.__sim.s_eff!=null) ? curCand.__sim.s_eff : (curCand.s!=null?curCand.s:0);
    if(sEffRealOverride != null) sEff = sEffRealOverride;  // 真实选择性优先
    // 显式审计行：操作条件 / 预测 / 实测 / 误差 / 累计MAE 同条输出，彻底消除日志时序歧义
    let _auditMsg;
    if(activeReaction==='OER'){
      _auditMsg=`📊 审计：电位 V=${cond.V.toFixed(1)} · 目标 ${oerTarget} · 预测 ${predY.toFixed(1)}，实测 ${measY.toFixed(1)}${_realTag}，误差 ${err.toFixed(1)}，累计 MAE=${mae.toFixed(1)}（第 ${maeN} 轮）`;
    }else{
      _auditMsg=`📊 审计：条件[T=${cond.T.toFixed(0)}℃ R=${cond.R.toFixed(2)} I=${cond.I.toFixed(0)} G=${cond.G.toFixed(0)}] 预测 ${predY.toFixed(1)}，实测 ${measY.toFixed(1)}${_realTag}，误差 ${err.toFixed(1)}，累计 MAE=${mae.toFixed(1)}（第 ${maeN} 轮）`;
    }
    log('audit', _auditMsg);
    measured.push({doi:curCand.doi, y:measY, r:curCand, real: !!_realTag});
    supportReuse[curCand.support]=(supportReuse[curCand.support]||0)+1;
    expChecks = experimentalChecks(curCand, measY, iter, supportReuse[curCand.support]);
    let _expMsg;
    if(activeReaction==='OER'){
      _expMsg=`${curCand.userDesigned?'👤用户配方 · ':''}真实实验 → 电化学工作站 + 旋转环盘电极检测，实测 OER 活性分 <b>${measY.toFixed(1)}</b>，H₂O₂ 选择性 ${sEff.toFixed(1)}%${_realTag}`+(measY===0?'（低于检测限，记为未检出）':'');
    }else{
      _expMsg=`${curCand.userDesigned?'👤用户配方 · ':''}真实实验 → 光反应器照射 + 气相色谱检测，实测 C2 产率 <b>${measY.toFixed(1)}</b>，选择性 ${sEff.toFixed(1)}%${_realTag}`+(measY===0?'（低于检测限，记为未检出）':'');
    }
    log('ok', _expMsg);
    const C=computeConstraints(curCand); const bad=C.filter(c=>c.st!=='pass');
    const eb=expChecks.filter(c=>c.st!=='pass');
    if(bad.length||eb.length) log('warn','⚠ 校验未全通过：'+bad.concat(eb).map(c=>c.name.replace(/^[^一-鿿A-Za-z0-9]+/,'')+'('+c.st+')').join('、')+' — 预测/实测已受约束修正');
    pushChart(predY, measY, sEff);
    updateCandCard(curCand, predY, measY);
    curMeasY=measY;
    loopStage=2; routeStage(2); loopState='moving';
  } else if(loopStage===2){
    setStage(3);
    emaY = emaY==null?curMeasY : emaY+0.3*(curMeasY-emaY);
    if(curMeasY>best.y && curMeasY>0){ best={name:`${curCand.metal} / ${curCand.support_display||curCand.support}`, y:curMeasY, s:(activeReaction==='OER'?(curCand.__sim?curCand.__sim.selH2O2*100:0):curCand.s), rec:curCand};
      log('ok',`✓ 发现更优${activeReaction==='OER'?' OER':''}催化剂${curCand.userDesigned?'（👤用户配方）':''}，世界模型更新（累积 MAE=${mae.toFixed(1)}，已采样 ${maeN} 轮）`); }
    else log('ai',`未超越最优，强化学习调整采样分布，进入下一轮`);
    refreshBest();
    log('df',`📚 设计原则（${curCand.doi}）：${curCand.why}`);
    log('df',`🎯 选择性来源：${curCand.seldrv}`);
    scheduleAutoEval();      // 本轮闭环收敛 → 自动重算评价指标（非阻塞）
    loopStage=3; routeStage(3); loopState='moving';
  } else if(loopStage===3){
    startIteration();
  }
  if(dispatchQueued){ const dk=dispatchQueued; dispatchQueued=null; startDispatch(dk); }
  } finally { _opBusy=false; }
}
function tickLoop(){
  if(!running) return;
  // 看门狗 ①：onOpComplete 异步挂起（如在线预测卡死）会把重入锁 _opBusy 永久卡 true，导致循环冻结。
  // 用真实时间判断（在线预测最多 2s），超过 5s 强制释放。
  // 例外：真实数据弹窗（闸门）打开期间 onOpComplete 处于合法 await，不视为卡死，跳过看门狗。
  if(_opBusy && !_rdModal.open && (performance.now() - _opBusySince) > 5000){
    log('warn','⚠ 检测到 onOpComplete 重入锁卡死（>5s），强制释放并补触发本轮操作，避免循环冻结。');
    _opBusy=false;
  }
  // 看门狗 ②：loopState==='working' 但 onOpComplete 本应已触发却未触发（极少见的时序竞态），兜底补触发。
  if(!_opBusy && loopState==='working' && isFinite(opStartSim) && (simClock - opStartSim) > (opDur + 50000)){
    onOpComplete(); return;
  }
  // 用户即时调度：打断主线，前往目标设备执行一次用户操作，完成后回到原阶段
  if(pendingDispatch){
    if(loopState==='moving'){
      if(char.busy) return;                       // 仍在走向目标设备
      loopState='working'; opStartSim=simClock; opDur=currentOpDur();
      log('user',`🎯 用户指令执行中：AI 在 <b>${DEV[dispatchNow].name}</b> 操作 <b>${DEV[dispatchNow].op}</b>`);
      return;
    }
    if(loopState==='working'){
      if(simClock - opStartSim >= opDur){
        const nm=DEV[dispatchNow]?DEV[dispatchNow].name:'';
        spawnBurst(dispatchNow);
        const back=savedStage; pendingDispatch=false; dispatchNow=null;
        loopStage=back; routeStage(back); loopState='moving';
        log('ok',`✓ 用户指令操作完成（${nm}），AI 回到主线第 ${back+1} 阶段继续。`);
      }
      return;
    }
  }
  if(loopState==='moving'){
    if(!char.busy){ loopState='working'; opStartSim=simClock; opDur=currentOpDur(); }
  } else if(loopState==='working'){
    if(simClock - opStartSim >= opDur){ onOpComplete(); }
  }
}
function stepOnce(){
  running=false; const bp=document.getElementById('btn-play'); if(bp)bp.textContent='▶ 运行';
  if(loopState==='idle'){ startIteration(); return; }
  if(loopState==='moving'){ char.x=char.tx; char.y=char.ty; char.vx=0; char.vy=0; char.busy=false; simClock+=currentOpDur(); }
  else if(loopState==='working'){ simClock+=opDur; }
  onOpComplete();
}

/* =========================================================
   2) 图表
   ========================================================= */
let yChart,sChart;
function initCharts(){
  Chart.defaults.color='#94a3b8'; Chart.defaults.borderColor='rgba(148,163,184,0.18)';
  yChart=new Chart(document.getElementById('yield-chart'),{type:'line',animation:false,data:{labels:[],datasets:[
    {label:'预测',data:[],borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,.12)',fill:true,pointRadius:2,tension:.3,borderWidth:2},
    {label:'真实',data:[],borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.10)',fill:true,pointRadius:2,tension:.3,borderWidth:2}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}},
    scales:{x:{ticks:{font:{size:9}},grid:{color:'rgba(148,163,184,0.18)'}},y:{ticks:{font:{size:9}},grid:{color:'rgba(148,163,184,0.18)'},title:{display:true,text:'μmol·g⁻¹·h⁻¹',font:{size:9}}}}}});
  sChart=new Chart(document.getElementById('sel-chart'),{type:'line',animation:false,data:{labels:[],datasets:[
    {label:'C2 选择性',data:[],borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.12)',fill:true,pointRadius:2,tension:.3,borderWidth:2}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}},
    scales:{x:{ticks:{font:{size:9}},grid:{color:'rgba(148,163,184,0.18)'}},y:{min:0,max:100,ticks:{font:{size:9}},grid:{color:'rgba(148,163,184,0.18)'},title:{display:true,text:'%',font:{size:9}}}}}});
}
function pushChart(predY,measY,sel){
  if(!yChart) return;
  yChart.data.labels.push('#'+iter); yChart.data.datasets[0].data.push(+predY.toFixed(1)); yChart.data.datasets[1].data.push(+measY.toFixed(1)); yChart.update();
  sChart.data.labels.push('#'+iter); sChart.data.datasets[0].data.push(+sel.toFixed(1)); sChart.update();
}

/* =========================================================
   3) 2D 实验室画布
   ========================================================= */
const canvas=document.getElementById('lab');
const ctx=canvas.getContext('2d');
let W=0,H=0,DPR=Math.min(devicePixelRatio,2);
const avatar=new Image(); avatar.src='assets/avatar.png';

// === 3D 模式：world3d.js 提供的 World3D 类 ===
let world3d=null;
const use3d = !!(window.PAGE_CONFIG && window.PAGE_CONFIG.use3d && typeof window.World3D==='function');
const lab3dContainer = document.getElementById('lab-3d');

// 设备（甲烷光催化真实装置，自由定义）
const DEVICES=[
  /* ——— 后墙：知识 / 控制 / 存储 / 物相 ——— */
  {key:'literature', name:'文献与知识库', x:0.015,y:0.04,w:0.175,h:0.17, color:'#0ea5e9', type:'shelf',  zone:'lit', icon:'📚',
    desc:'存储 84,682 篇催化文献知识库，按 DOI 关联设计原则，检索甲烷偶联同族催化剂。',
    op:'抽取 design_principles，检索金属/载体/机理同族候选',
    specs:[{k:'文献总量',v:'84,682 篇'},{k:'关联字段',v:'DOI / 金属 / 载体 / 机理'},{k:'抽取引擎',v:'MiMo (mimo-v2-omni)'}],
    readings:[{k:'已索引',unit:'篇',min:0,max:100000,val:84682},{k:'本轮回检索',unit:'条',min:0,max:50,val:6}]},
  {key:'glovebox', name:'手套箱', x:0.210,y:0.04,w:0.175,h:0.17, color:'#64748b', type:'glove', zone:'syn', icon:'🧤',
    desc:'Ar 惰性气氛操作舱，处理空气敏感的金属/氧空位样品，避免再生氧化。',
    op:'惰性气氛下转移与封装样品',
    specs:[{k:'O₂ / H₂O',v:'< 0.1 ppm'},{k:'工作压力',v:'常压'},{k:'过渡舱',v:'双舱'}],
    readings:[{k:'O₂',unit:'ppm',min:0,max:1,val:0.05},{k:'H₂O',unit:'ppm',min:0,max:1,val:0.08}]},
  {key:'ai', name:'AI 控制中心', x:0.405,y:0.03,w:0.190,h:0.18, color:'#8b5cf6', type:'server', zone:'learn', icon:'🧠',
    desc:'主动学习 + 强化学习引擎，融合真实文献与物理约束，迭代更新世界模型并提议下一候选。',
    op:'更新世界模型，提议下一候选催化剂',
    specs:[{k:'算法',v:'主动学习 + RL'},{k:'算力',v:'RTX 5090'},{k:'约束',v:'44 条真实规律'}],
    readings:[{k:'预测 MAE',unit:'',min:0,max:40000,val:0},{k:'已采样',unit:'轮',min:0,max:300,val:0}]},
  {key:'robot', name:'机械臂 & 样品架', x:0.610,y:0.04,w:0.175,h:0.17, color:'#7c3aed', type:'robot', zone:'learn', icon:'🦾',
    desc:'6 自由度机械臂，自动取放样品、送样至反应器与表征位，构成干湿闭环执行端。',
    op:'自动取放样品，送入反应器 / 表征',
    specs:[{k:'自由度',v:'6 DOF'},{k:'重复定位',v:'±0.02 mm'},{k:'样品位',v:'24 位'}],
    readings:[{k:'当前动作',unit:'',min:0,max:1,val:0}]},
  {key:'xrd', name:'X 射线衍射', x:0.800,y:0.04,w:0.175,h:0.17, color:'#0d9488', type:'xrd', zone:'cha', icon:'🔬',
    desc:'粉末 XRD 鉴定催化剂物相与晶型，比对 PDF 卡片确认载体与活性相。',
    op:'物相鉴定（比对 PDF 卡片）',
    specs:[{k:'扫描范围',v:'5–80° 2θ'},{k:'靶材',v:'Cu Kα'},{k:'步长',v:'0.02°'}],
    readings:[{k:'当前 2θ',unit:'°',min:5,max:80,val:36.2},{k:'主峰',unit:'°',min:5,max:80,val:36.2}]},

  /* ——— 左岛：合成与前处理 ——— */
  {key:'balance', name:'电子天平', x:0.015,y:0.27,w:0.175,h:0.17, color:'#3b82f6', type:'balance', zone:'syn', icon:'⚖️',
    desc:'精密称量催化剂前驱体（金属盐、载体），为浸渍/共沉淀法定量投料。',
    op:'称量 0.05 g 前驱体',
    specs:[{k:'最大称量',v:'220 g'},{k:'精度',v:'0.1 mg'},{k:'校准',v:'自动内校'}],
    readings:[{k:'读数',unit:'g',min:0,max:220,val:0.0523},{k:'稳定',unit:'',min:0,max:1,val:1}]},
  {key:'sonicator', name:'超声清洗机', x:0.015,y:0.47,w:0.175,h:0.17, color:'#2563eb', type:'sonic', zone:'syn', icon:'🌊',
    desc:'40 kHz 超声分散催化剂前驱体悬浮液，破除团聚、提升负载均匀性。',
    op:'超声分散 30 min',
    specs:[{k:'频率',v:'40 kHz'},{k:'功率',v:'≤ 180 W'},{k:'水温上限',v:'80 ℃'}],
    readings:[{k:'功率',unit:'W',min:0,max:180,val:120},{k:'水温',unit:'℃',min:0,max:80,val:42}]},
  {key:'stirrer', name:'磁力搅拌器', x:0.205,y:0.27,w:0.175,h:0.17, color:'#60a5fa', type:'stir', zone:'syn', icon:'🌀',
    desc:'浸渍法负载金属时恒速搅拌混合前驱体与载体，配加热盘控温。',
    op:'500 rpm 搅拌浸渍',
    specs:[{k:'转速',v:'0–2000 rpm'},{k:'加热',v:'≤ 380 ℃'},{k:'搅拌位',v:'单工位'}],
    readings:[{k:'转速',unit:'rpm',min:0,max:2000,val:500},{k:'温度',unit:'℃',min:0,max:380,val:65}]},
  {key:'furnace', name:'马弗炉', x:0.205,y:0.47,w:0.175,h:0.17, color:'#f59e0b', type:'furnace', zone:'syn', icon:'🔥',
    desc:'高温焙烧/煅烧催化剂，去除有机物模板、促进晶化与金属-载体相互作用。',
    op:'500 ℃ 空气焙烧 4 h',
    specs:[{k:'最高温度',v:'1500 ℃'},{k:'升温速率',v:'≤ 30 ℃/min'},{k:'气氛',v:'空气/静态'}],
    readings:[{k:'温度',unit:'℃',min:0,max:1500,val:500},{k:'设定',unit:'℃',min:0,max:1500,val:500}]},
  {key:'tube', name:'管式炉', x:0.015,y:0.67,w:0.175,h:0.17, color:'#d97706', type:'furnace', zone:'syn', icon:'🧪',
    desc:'程序升温还原/退火（H₂/Ar），调控金属价态、氧空位浓度与 d 带中心。',
    op:'300 ℃ H₂ 还原 2 h',
    specs:[{k:'最高温度',v:'1200 ℃'},{k:'温区',v:'单温区'},{k:'气氛',v:'H₂ / Ar / He'}],
    readings:[{k:'温度',unit:'℃',min:0,max:1200,val:300},{k:'H₂ 流量',unit:'sccm',min:0,max:200,val:30}]},
  {key:'vacuumoven', name:'真空干燥箱', x:0.205,y:0.67,w:0.175,h:0.17, color:'#8b5cf6', type:'voven', zone:'syn', icon:'🕳️',
    desc:'低温真空干燥湿样品，去除水分/溶剂而不破坏孔结构与活性相。',
    op:'60 ℃ 真空干燥',
    specs:[{k:'最高温度',v:'200 ℃'},{k:'真空度',v:'≤ 0.1 kPa'},{k:'方式',v:'鼓风循环'}],
    readings:[{k:'温度',unit:'℃',min:0,max:200,val:60},{k:'真空',unit:'kPa',min:0,max:101,val:0.05}]},

  /* ——— 右岛：表征 ——— */
  {key:'gc', name:'气相色谱 GC', x:0.805,y:0.30,w:0.175,h:0.17, color:'#10b981', type:'gc', zone:'cha', icon:'📈',
    desc:'离线/在线分离检测 CH₄ / C₂H₆ / C₂H₄ / CO / CO₂，定量产物分布与选择性。',
    op:'进样检测产物分布',
    specs:[{k:'柱温',v:'≤ 250 ℃'},{k:'检测器',v:'TCD + FID'},{k:'进样',v:'六通阀'}],
    readings:[{k:'柱温',unit:'℃',min:0,max:250,val:80},{k:'C₂ 峰面积',unit:'',min:0,max:9999,val:1840}]},
  {key:'ms', name:'质谱 MS', x:0.805,y:0.50,w:0.175,h:0.17, color:'#14b8a6', type:'ms', zone:'cha', icon:'📟',
    desc:'在线质谱实时监测气相产物（m/z），秒级追踪 C₂ / COₓ 生成动力学。',
    op:'在线监测产物 m/z',
    specs:[{k:'质量范围',v:'1–200 amu'},{k:'扫描',v:'0.1 s / scan'},{k:'接口',v:'毛细管'}],
    readings:[{k:'m/z 30 (C₂H₆)',unit:'',min:0,max:9999,val:920},{k:'m/z 28 (CO)',unit:'',min:0,max:9999,val:430}]},
  {key:'drifts', name:'in-situ DRIFTS', x:0.805,y:0.70,w:0.175,h:0.17, color:'#f97316', type:'drifts', zone:'cha', icon:'🌡️',
    desc:'原位漫反射红外光谱，实时追踪 ·CH₃ / ·COOH 等中间体与吸附态，验证机理路径。',
    op:'采集原位谱图，指认中间体',
    specs:[{k:'光谱范围',v:'4000–400 cm⁻¹'},{k:'分辨率',v:'≤ 4 cm⁻¹'},{k:'池温',v:'室温–400 ℃'}],
    readings:[{k:'·CH₃ 振动',unit:'cm⁻¹',min:1000,max:1600,val:1305},{k:'·COOH 振动',unit:'cm⁻¹',min:1000,max:1800,val:1560}]},

  /* ——— 新增表征设备（3D 实验室扩展）—— */
  {key:'uvvis', name:'UV-Vis DRS', x:0.805,y:0.87,w:0.175,h:0.13, color:'#3b82f6', type:'uvvis', zone:'cha', icon:'📊',
    desc:'紫外可见漫反射光谱，测定催化剂带隙、吸收边与光响应范围，关联载流子激发效率。',
    op:'扫描 200–800 nm 漫反射谱',
    specs:[{k:'波长范围',v:'200–800 nm'},{k:'检测器',v:'PMT / CCD'},{k:'积分球',v:'BaSO₄ 参照'}],
    readings:[{k:'吸收边',unit:'nm',min:200,max:800,val:420},{k:'带隙 Eg',unit:'eV',min:1,max:5,val:2.95}]},
  {key:'atr', name:'ATR 红外', x:0.585,y:0.88,w:0.09,h:0.12, color:'#db2777', type:'atr', zone:'cha', icon:'💠',
    desc:'衰减全反射红外光谱，无需压片即可测固体催化剂表面官能团与吸附物种。',
    op:'ATR 模式采集表面光谱',
    specs:[{k:'晶体',v:'ZnSe / Diamond'},{k:'波数',v:'4000–400 cm⁻¹'},{k:'扫描',v:'32 次'}],
    readings:[{k:'特征峰',unit:'cm⁻¹',min:1000,max:3600,val:1620}]},
  {key:'fluor', name:'荧光光谱', x:0.685,y:0.88,w:0.09,h:0.12, color:'#22c55e', type:'fluor', zone:'cha', icon:'✨',
    desc:'稳态/时间分辨荧光光谱，探测光生电子-空穴复合行为、缺陷态发光与量子效率。',
    op:'PL 谱扫描 + 寿命测量',
    specs:[{k:'激发源',v:'Xe 灯 / 脉冲激光'},{k:'发射范围',v:'250–900 nm'},{k:'寿命量程',v:'ps – ms'}],
    readings:[{k:'PL 峰位',unit:'nm',min:300,max:800,val:520},{k:'量子产率',unit:'%',min:0,max:100,val:12}]},
  {key:'lifetime', name:'超快光谱(寿命)', x:0.78,y:0.88,w:0.10,h:0.12, color:'#a855f7', type:'lifetime', zone:'cha', icon:'⚡',
    desc:'紫外可见超快瞬态吸收/泵浦-探测，直接测量光生载流子寿命（ns-ps-fs）与弛豫动力学。',
    op:'飞秒瞬态吸收测载流子寿命',
    specs:[{k:'脉宽',v:'< 100 fs'},{k:'探测范围',v:'UV-Vis-NIR'},{k:'时间窗',v:'~1 ns'}],
    readings:[{k:'τ 电子',unit:'ns',min:0.001,max:100,val:4.5},{k:'τ 空穴',unit:'ns',min:0.001,max:100,val:18}]},
  {key:'bet', name:'BET 比表面积', x:0.008,y:0.86,w:0.09,h:0.12, color:'#ca8a04', type:'bet', zone:'cha', icon:'🔵',
    desc:'N₂ 物理吸附 BET 法测定比表面积、孔容与孔径分布，关联活性位点密度。',
    op:'N₂ 吸附-脱附等温线',
    specs:[{k:'吸附质',v:'N₂ @ 77 K'},{k:'比表面',v:'0.01–500 m²/g'},{k:'孔径',v:'微孔/介孔'}],
    readings:[{k:'BET S_BET',unit:'m²/g',min:0.01,max:500,val:85},{k:'孔容',unit:'cm³/g',min:0,max:2,val:0.35}]},
  {key:'tem', name:'TEM/SEM 电镜', x:0.11,y:0.86,w:0.095,h:0.12, color:'#a855f7', type:'tem', zone:'cha', icon:'🔬',
    desc:'透射/扫描电镜观测载体与催化剂纳米颗粒尺寸、形貌、晶格条纹与元素分布（EDS mapping）。',
    op:'TEM 观测颗粒尺寸分布',
    specs:[{k:'加速电压',v:'80–300 kV'},{k:'分辨率',v:'0.1 nm (TEM)'},{k:'EDS',v:'元素 mapping'}],
    readings:[{k:'颗粒尺寸',unit:'nm',min:0.5,max:200,val:8.5},{k:'晶面间距',unit:'Å',min:1,max:20,val:3.52}]},
  {key:'synch', name:'同步辐射(XAS)', x:0.215,y:0.86,w:0.095,h:0.12, color:'#f97316', type:'synch', zone:'cha', icon:'☢️',
    desc:'同步辐射 X 射线吸收谱（XANES/EXAFS），解析金属价态、配位数与局域结构，DFT 对照验证。',
    op:'XAS 扫描金属 K 边',
    specs:[{k:'边',v:'K / L 边'},{k:'模式',v:'XANES + EXAFS'},{k:'站',v:'BSRF / SSRF'}],
    readings:[{k:'氧化态',unit:'',min:0,max:4,val:2.2},{k:'配位数 CN',unit:'',min:0,max:12,val:4.5}]},
  {key:'photocurr', name:'光电流寿命', x:0.32,y:0.86,w:0.09,h:0.12, color:'#06b6d4', type:'photocurr', zone:'cha', icon:'⚡',
    desc:'光电化学测试：瞬态光电流(TPC)/电化学阻抗(EIS)/Mott-Schottky，定量载流子分离效率与寿命。',
    op:'TPC + EIS 测量',
    specs:[{k:'光源',v:'Solar Simulator'},{k:'电解液',v:'Na₂SO₄ 0.5 M'},{k:'电极',v:'ITO / 玻碳'}],
    readings:[{k:'光电流',unit:'μA/cm²',min:0,max:1000,val:45},{k:'EIS R_ct',unit:'Ω',min:10,max:100000,val:1250}]},
  {key:'xps', name:'XPS 光电子能谱', x:0.42,y:0.88,w:0.09,h:0.11, color:'#ef4444', type:'xps', zone:'cha', icon:'⚛️',
    desc:'X 射线光电子能谱，分析表面元素组成、化学价态与原子比例，深度剖析界面效应。',
    op:'全谱扫描 + 高分辨精细谱',
    specs:[{k:'激发源',v:'Al Kα 1486.6 eV'},{k:'通能',v:'20–100 eV'},{k:'深度',v:'Ar⁺ 刻蚀'}],
    readings:[{k:'O 1s / C 1s',unit:'at%',min:0,max:100,val:28},{k:'金属/载体比',unit:'',min:0,max:1,val:0.035}]},

  /* ——— 中央前区：反应核心 ——— */
  {key:'gasfeed', name:'气体进料系统', x:0.39,y:0.58,w:0.10,h:0.17, color:'#10b981', type:'gas', zone:'exp', icon:'💨',
    desc:'CH₄ / O₂ / Ar 质量流量精确进料与配比，控制反应气氛、平衡气与压力。',
    op:'通 CH₄ 30 sccm，O₂ 15 sccm，平衡气 Ar 50 sccm',
    specs:[{k:'气体',v:'CH₄ / O₂ / Ar'},{k:'质量流量',v:'0–200 sccm'},{k:'压力',v:'≤ 3 bar'}],
    readings:[{k:'CH₄ 流量',unit:'sccm',min:0,max:200,val:30},{k:'Ar 流量',unit:'sccm',min:0,max:200,val:50},{k:'压力',unit:'bar',min:0,max:3,val:1.0}]},
  {key:'lamp', name:'光源 / 灯', x:0.515,y:0.54,w:0.085,h:0.20, color:'#eab308', type:'lamp', zone:'exp', icon:'💡',
    desc:'光催化驱动光源：氙灯(Xe)、LED、汞灯等；可加滤光片调控波长，独立控制光强与光谱。',
    op:'300 W 氙灯照射（滤光 420 nm，光强 320 mW/cm²）',
    specs:[{k:'灯类型',v:'氙灯 / LED / 汞灯'},{k:'可调波长',v:'200–1100 nm（滤光片）'},{k:'功率',v:'≤ 500 W'},{k:'滤光片',v:'UV / 可见 / IR 截止'}],
    readings:[{k:'光强',unit:'mW/cm²',min:0,max:500,val:320},{k:'中心波长',unit:'nm',min:200,max:1100,val:420},{k:'滤光',unit:'nm',min:200,max:800,val:420}]},
  {key:'reactor', name:'反应器（反应腔）', x:0.605,y:0.54,w:0.085,h:0.20, color:'#0ea5e9', type:'reactor', zone:'exp', icon:'🔆',
    desc:'反应腔体：接受光源照射发生光催化反应。材质可选石英(全光谱透过)或金属(部分截止)；红外灯亦可充当光反应器（热-光协同）。含光照面积参数。',
    op:'石英腔受光照射，驱动 CH₄ → C₂ 偶联',
    specs:[{k:'材质',v:'石英 / 不锈钢 / 硼硅玻璃'},{k:'光照面积',v:'≤ 50 cm²'},{k:'温度',v:'室温–200 ℃'},{k:'压力',v:'≤ 3 bar'},{k:'IR 可用',v:'是（热光协同）'}],
    readings:[{k:'温度',unit:'℃',min:20,max:200,val:35},{k:'光照面积',unit:'cm²',min:1,max:50,val:25},{k:'CH₄ 转化',unit:'%',min:0,max:30,val:4.2}]},
  {key:'centrifuge', name:'离心机', x:0.705,y:0.60,w:0.085,h:0.16, color:'#a855f7', type:'centri', zone:'exp', icon:'🌀',
    desc:'固液分离，回收催化剂或取上清液送 GC/MS 分析。',
    op:'8000 rpm 离心 10 min',
    specs:[{k:'最高转速',v:'10000 rpm'},{k:'最大 RCF',v:'≈ 11000 ×g'},{k:'容量',v:'4 × 50 mL'}],
    readings:[{k:'转速',unit:'rpm',min:0,max:10000,val:8000},{k:'时间',unit:'s',min:0,max:600,val:600}]},

  /* ——— 反应区下方：前处理 / 辅助设备 ——— */
  {key:'pipette', name:'移液装置', x:0.39,y:0.85,w:0.08,h:0.13, color:'#06b6d4', type:'pipette', zone:'syn', icon:'🧪',
    desc:'精密液体转移：注射泵(连续输注)、移液枪(手动分液)、9320 移液工作站(高通量自动分液)，用于前驱体溶液配制与负载。',
    op:'移液枪分装 1.00 mL 前驱体（9320 工作站 96 孔）',
    specs:[{k:'注射泵',v:'0.001–50 mL/min'},{k:'移液枪',v:'0.1–1000 μL'},{k:'9320 工作站',v:'96/384 孔，±1%'}],
    readings:[{k:'分液体积',unit:'mL',min:0.001,max:50,val:1.0},{k:'工作方式',unit:'',min:0,max:1,val:0}]},
  {key:'icebath', name:'冰浴 / 循环水浴', x:0.47,y:0.85,w:0.08,h:0.13, color:'#0ea5e9', type:'icebath', zone:'syn', icon:'🧊',
    desc:'低温水浴：冰浴或循环水浴泵控温，用于低温反应 / 淬灭 / 结晶，温度稳定至 ±0.1 ℃。',
    op:'循环水浴泵控温 4 ℃',
    specs:[{k:'控温范围',v:'-20–100 ℃'},{k:'波动',v:'±0.1 ℃'},{k:'泵流量',v:'≤ 15 L/min'}],
    readings:[{k:'温度',unit:'℃',min:-20,max:100,val:4},{k:'泵流量',unit:'L/min',min:0,max:15,val:8}]},
  {key:'irlamb', name:'红外灯（干燥）', x:0.55,y:0.85,w:0.08,h:0.13, color:'#f97316', type:'irlamb', zone:'syn', icon:'🔦',
    desc:'红外辐射加热灯，用于样品快速干燥 / 低温热处理；亦可作为红外光源驱动光反应器（热-光协同）。',
    op:'红外灯 60 ℃ 干燥样品',
    specs:[{k:'功率',v:'≤ 500 W'},{k:'表面温度',v:'≤ 300 ℃'},{k:'波长',v:'≈ 700–1400 nm（近红外）'}],
    readings:[{k:'温度',unit:'℃',min:20,max:300,val:60},{k:'功率',unit:'W',min:0,max:500,val:250}]},
  {key:'oven', name:'常规烘箱', x:0.63,y:0.85,w:0.08,h:0.13, color:'#f59e0b', type:'oven', zone:'syn', icon:'🔥',
    desc:'鼓风干燥箱，用于样品常压干燥、老化与低温热处理（区别于马弗炉高温焙烧）。',
    op:'80 ℃ 鼓风干燥 12 h',
    specs:[{k:'最高温度',v:'300 ℃'},{k:'均匀度',v:'±1 ℃'},{k:'方式',v:'强制鼓风'}],
    readings:[{k:'温度',unit:'℃',min:30,max:300,val:80},{k:'时间',unit:'h',min:1,max:48,val:12}]},
  {key:'spray', name:'喷涂装置', x:0.71,y:0.85,w:0.08,h:0.13, color:'#8b5cf6', type:'spray', zone:'syn', icon:'💨',
    desc:'超声 / 气动喷涂，将催化剂墨水均匀沉积到基底（如 FTO / 石英），制备薄膜电极或光催化片。',
    op:'喷涂 5 mL 催化剂墨水（膜厚 ~2 μm）',
    specs:[{k:'雾化方式',v:'超声 / 气动'},{k:'膜厚',v:'0.1–10 μm'},{k:'基底',v:'FTO / 石英 / 硅'}],
    readings:[{k:'喷涂量',unit:'mL',min:0,max:20,val:5},{k:'膜厚',unit:'μm',min:0.1,max:10,val:2}]},
  /* ——— 510 实验室 GN 工站设备（CWM-Lab 可执行，键加 gn_ 前缀避免与光催化键冲突）——— */
  {key:'gn_system', name:'GN 系统总控', x:0.015,y:0.04,w:0.175,h:0.17, color:'#0f766e', type:'system', zone:'ctrl', icon:'🛡️',
    desc:'510 工站 GN 系统级控制：上电初始化就绪（System_IsReady）、复位触发/完成、停止触发；为 1 时可下发指令，为 0 代表回原点故障。',
    op:'GN 整站复位 / 停止，读取就绪状态',
    specs:[{k:'协议',v:'OPC UA 单会话'},{k:'就绪',v:'System_IsReady'},{k:'复位/停止',v:'ResetTrig / StopTrig'}],
    readings:[{k:'就绪状态',unit:'',min:0,max:1,val:1},{k:'复位完成',unit:'',min:0,max:1,val:0}]},
  {key:'gn_stack', name:'GN 旋转堆栈·耗材仓', x:0.205,y:0.04,w:0.175,h:0.17, color:'#64748b', type:'stack', zone:'ctrl', icon:'🗄️',
    desc:'存放 50/250ml 样品瓶、1/300ul/10ml 枪头盒、96 孔深孔板与金属孔板；可旋转至目标位并相机检测有无；节点前缀 Stack_。',
    op:'旋转至目标位，相机检测耗材有无',
    specs:[{k:'样品瓶',v:'50ml / 250ml'},{k:'枪头盒',v:'1ml / 300ul / 10ml'},{k:'孔板',v:'96 孔深孔板 / 金属孔板'}],
    readings:[{k:'目标位',unit:'位',min:1,max:12,val:1},{k:'在位检测',unit:'',min:0,max:1,val:1}]},
  {key:'gn_liquid', name:'GN 9320 液体处理模块', x:0.395,y:0.04,w:0.175,h:0.17, color:'#38bdf8', type:'liquid', zone:'syn', icon:'💧',
    desc:'PRCXI 9320 液体处理工作站：吸液 / 放液、震荡加样、温控孵育；支持单/多通道移液、混匀转移（transfer_group）与 96 孔板操作；节点前缀 Liquid_。',
    op:'吸 / 放液 + 震荡加样 + 温控',
    specs:[{k:'核心能力',v:'吸放液 / 震荡 / 温控'},{k:'通道',v:'1 + 8 / 96 孔'},{k:'温控',v:'加热 / 冷却模块'},{k:'动作',v:'aspirate / dispense / mix / shaker / heater'}],
    readings:[{k:'吸液体积',unit:'μL',min:0,max:1000,val:200},{k:'温度',unit:'℃',min:4,max:95,val:25},{k:'震荡频率',unit:'rpm',min:0,max:3000,val:0},{k:'恒温时长',unit:'min',min:0,max:120,val:0}]},
  {key:'gn_robot', name:'GN 六轴机械臂', x:0.585,y:0.04,w:0.175,h:0.17, color:'#a855f7', type:'robot', zone:'exec', icon:'🦾',
    desc:'在 10 个工站间平行夹爪转移耗材（烘箱/锁紧/快换/离心机/真空烘箱/9320/离心管/堆栈/固体加样/成品位）；节点前缀 Robot_，含急停/保护停。',
    op:'在 10 工站间转移耗材（模块 1–10）',
    specs:[{k:'自由度',v:'6 DOF'},{k:'重复定位',v:'±0.02 mm'},{k:'模块号',v:'1–10'},{k:'安全',v:'急停 / 保护停'}],
    readings:[{k:'目标工站',unit:'',min:1,max:10,val:1},{k:'X 位置',unit:'mm',min:0,max:7500,val:0}]},
  {key:'gn_solid', name:'GN 粉末加样仪', x:0.775,y:0.04,w:0.175,h:0.17, color:'#3b82f6', type:'balance', zone:'syn', icon:'⚖️',
    desc:'固体粉末精密加样（13–20 种），含加样药仓架、除静电仪、样品瓶定位盘；节点前缀 Solid_，支持加料/称量/夹爪取放/开关门/除静电。',
    op:'按配方称量并加料至目标样品瓶',
    specs:[{k:'粉末种类',v:'13–20 种'},{k:'精度',v:'±0.1 mg'},{k:'除静电',v:'离子风'},{k:'天枰称重',v:'WeightFB'}],
    readings:[{k:'加料量',unit:'mg',min:0,max:2000,val:50},{k:'天平读数',unit:'mg',min:0,max:2000,val:50.2}]},
  {key:'gn_tube', name:'GN 离心管液体处理系统', x:0.015,y:0.27,w:0.175,h:0.17, color:'#06b6d4', type:'tube', zone:'syn', icon:'🧪',
    desc:'8+单通道移液、开盖/关盖、恒温模块×4、超声波混匀、磁力架；节点前缀 Tube_，CmdType 1–49 覆盖吸放液/夹取/恒温/超声。',
    op:'吸 / 放液 + 超声混匀 + 恒温孵育',
    specs:[{k:'移液核心',v:'1 + 8 通道'},{k:'恒温模块',v:'4 组（含震荡）'},{k:'辅助',v:'开盖 / 超声 / 磁力架'},{k:'CmdType',v:'1–49'}],
    readings:[{k:'恒温温度',unit:'℃',min:4,max:70,val:28},{k:'超声时间',unit:'s',min:0,max:600,val:60},{k:'夹爪力度',unit:'N',min:0,max:50,val:10},{k:'混匀次数',unit:'次',min:0,max:20,val:3}]},
  {key:'gn_quick', name:'GN 快速载具更换模块', x:0.205,y:0.27,w:0.175,h:0.17, color:'#f97316', type:'quick', zone:'sep', icon:'🔁',
    desc:'快速完成 96 孔玻璃管塑料孔板与金属孔板之间的转换；含接料工位、顶锥、96 孔金属反应板、反应管批量转移器与下压器，节点前缀 QuickChange_。',
    op:'转换载具（玻璃管孔板 ↔ 金属孔板）',
    specs:[{k:'功能',v:'载具快速转换'},{k:'部件',v:'顶锥 + 下压器 + 批量转移器'},{k:'磁力搅拌',v:'转速/温度/时间'},{k:'CmdType',v:'1–14'}],
    readings:[{k:'搅拌转速',unit:'rpm',min:0,max:2000,val:0},{k:'搅拌温度',unit:'℃',min:0,max:150,val:25},{k:'搅拌时间',unit:'min',min:0,max:120,val:0}]},
  {key:'gn_centrifuge', name:'GN 自动定位离心机', x:0.395,y:0.27,w:0.175,h:0.17, color:'#14b8a6', type:'centri', zone:'sep', icon:'🔄',
    desc:'根据密度、颗粒大小差异快速分离混合物中的不同成分；支持夹爪夹紧/张开、装载/取出物料与 Y/Z 轴点动，节点前缀 Centrifuge_。',
    op:'离心分离（去上清 / 收集沉淀）',
    specs:[{k:'转速',v:'0–12000 rpm'},{k:'板位',v:'1–4'},{k:'温度设置',v:'iTemperature'},{k:'CmdType',v:'1–10'}],
    readings:[{k:'转速',unit:'rpm',min:0,max:12000,val:6000},{k:'时间',unit:'s',min:0,max:3600,val:60},{k:'温度',unit:'℃',min:4,max:60,val:25},{k:'板位号',unit:'',min:1,max:4,val:1}]},
  {key:'gn_lock', name:'GN 锁紧机构', x:0.585,y:0.27,w:0.175,h:0.17, color:'#dc2626', type:'lock', zone:'sep', icon:'🔒',
    desc:'夹爪转移金属盖子至 96 孔板并通过拧紧螺丝减少样本蒸发；含 96 孔板下料缓存位、烘箱盖子/盒子工位与双夹爪，节点前缀 Lock_。',
    op:'锁紧金属盖（拧螺丝防蒸发）',
    specs:[{k:'功能',v:'金属盖锁紧 / 防蒸发'},{k:'部件',v:'夹爪 ×2 + 电批'},{k:'轴系',v:'X/Y/Z1/Z2'},{k:'CmdType',v:'1–16'}],
    readings:[{k:'X位置',unit:'',min:-1000,max:1000,val:0},{k:'Y位置',unit:'',min:-1000,max:1000,val:0},{k:'夹爪力度',unit:'N',min:0,max:50,val:20}]},
  {key:'gn_oven', name:'GN 常规烘箱', x:0.775,y:0.27,w:0.175,h:0.17, color:'#d97706', type:'furnace', zone:'dry', icon:'🔥',
    desc:'通过高温加热对物品进行干燥、去除水分；以 Oven_CompleteFB 为准判定结束，含启动/停止/复位与 Running_Status 互锁及开门/关门；节点前缀 Oven_。',
    op:'高温干燥（至 CompleteFB 完成）',
    specs:[{k:'最高温度',v:'250 ℃'},{k:'时间',v:'小时 + 分钟'},{k:'门控',v:'OPEN/COHSE_DOOR'},{k:'CmdType',v:'1–2'}],
    readings:[{k:'温度',unit:'℃',min:30,max:250,val:80},{k:'剩余时间',unit:'h',min:0,max:48,val:12}]},
  {key:'gn_vacuum', name:'GN 真空烘箱', x:0.015,y:0.50,w:0.175,h:0.17, color:'#7c3aed', type:'voven', zone:'dry', icon:'🕳️',
    desc:'有效去除常规加热难以挥发的溶剂（如 DMF）或物料内部孔隙中的残留水分；支持开门/关门/启动与 1–6 段程序，每段独立温/时/真空上下限；节点前缀 VacuumOven_。',
    op:'真空干燥（分段程序 1–6）',
    specs:[{k:'真空度',v:'≤ 10 Pa'},{k:'程序段',v:'1–6 段'},{k:'门控',v:'100 开门 / 101 关门'},{k:'CmdType',v:'1–2'}],
    readings:[{k:'温度',unit:'℃',min:30,max:250,val:60},{k:'运行时间',unit:'h',min:1,max:48,val:24},{k:'真空度',unit:'Pa',min:0,max:1000,val:5}]}
];
const DEV=Object.fromEntries(DEVICES.map(d=>[d.key,d]));
// UI 优化：整体缩小设备图标（原尺寸偏科幻大块），更像实验室台面上的紧凑仪器
DEVICES.forEach(d=>{ d.w*=0.78; d.h*=0.82; });

/* ===== 页面配置驱动：3 层楼式分区布局（每层 2 个房间并排，画布更大）=====
   43 台设备分为 6 个逻辑分区 → 排进 3 层 × 每层 2 房：
     1F：知识/核心（左）+ 合成制备（右）
     2F：反应与气体（左）+ 表征（右）
     3F：后处理（左）+ 510 GN 合成产线（右）
   画布分数高 CV_H>1（超出视口部分由 3D 视口拖拽/缩放浏览）。
   分组信息挂到 window.PAGE_GROUPS（含 _side/_floor/_roomX），楼层挂到 window.PAGE_FLOORS，
   world3d.js 据此渲染 3D 房间结构与楼层。 */
const PAGE_GROUPS = [
  {label:'🔬 光催化 · 知识 / 核心', keys:['literature','glovebox','ai','robot']},
  {label:'⚗️ 光催化 · 合成制备',    keys:['balance','sonicator','stirrer','furnace','tube','vacuumoven','spray','pipette']},
  {label:'☀️ 光催化 · 反应与气体',  keys:['gasfeed','lamp','reactor','icebath','irlamb']},
  {label:'📊 光催化 · 表征',        keys:['xrd','uvvis','atr','fluor','lifetime','drifts','gc','ms','bet','tem','synch','photocurr','xps']},
  {label:'🧪 光催化 · 后处理',      keys:['centrifuge','oven']},
  {label:'🏭 510 GN 合成产线 · CWM-Lab', keys:['gn_system','gn_stack','gn_liquid','gn_solid','gn_tube','gn_quick','gn_centrifuge','gn_lock','gn_oven','gn_vacuum','gn_robot']}
];
const PAGE_FLOORS = [
  {no:1, label:'1F · 前段 · 知识 / 合成', sides:['L','R'], groups:[0,1]},
  {no:2, label:'2F · 中段 · 反应 / 表征', sides:['L','R'], groups:[2,3]},
  {no:3, label:'3F · 后段 · 后处理 / GN 产线', sides:['L','R'], groups:[4,5]}
];
(function applyPageConfig(){
  const PC = (typeof window!=='undefined' && window.PAGE_CONFIG) ? window.PAGE_CONFIG : null;
  if(PC && Array.isArray(PC.devices) && PC.devices.length){
    const keep = PC.devices.map(k=>DEV[k]).filter(Boolean);
    // 3 层楼式布局参数（分数坐标：宽 1.0，高 CV_H；x=0.5 为楼层走廊带）
    const CV_H = 3.0, x0=0.028, midX=0.5, corridor=0.035,
          labelH=0.055, ch=0.15, gapY=0.045, gapF=0.085;
    let y = 0.035;
    const groups = PAGE_GROUPS.filter(g=>g.keys.some(k=>DEV[k]));
    const placed=[];
    PAGE_FLOORS.forEach(fl=>{
      let maxRows=0;
      fl.groups.forEach((gi,ri)=>{
        const g=groups[gi];
        const keys=g.keys.filter(k=>DEV[k]);
        const side=fl.sides[ri];
        const cols = Math.min(3, Math.max(2, keys.length>4?3:2));
        const rows = Math.ceil(keys.length/cols);
        maxRows=Math.max(maxRows, rows);
        const roomX0 = side==='L' ? x0 : midX+corridor;
        const roomX1 = side==='L' ? midX-corridor : 1-x0;
        const availW = roomX1-roomX0;
        const cw = (availW - (cols-1)*0.03)/cols;
        keys.forEach((k,i)=>{
          const r=Math.floor(i/cols), c=i%cols;
          const d=DEV[k];
          d.x = roomX0 + c*(cw+0.03);
          d.y = y + labelH + r*(ch+gapY);
          d.w = cw*0.9; d.h = ch*0.9;
        });
        g._side=side; g._floor=fl.no; g._roomX0=roomX0; g._roomX1=roomX1;
        g._y = y + labelH;
        placed.push(g);
      });
      y += labelH + maxRows*(ch+gapY) + gapF;
    });
    window.PAGE_GROUPS = placed;
    window.PAGE_FLOORS = PAGE_FLOORS.map(fl=>({no:fl.no, label:fl.label}));
    DEVICES.length=0; keep.forEach(d=>DEVICES.push(d));
    for(const k in DEV) delete DEV[k];
    DEVICES.forEach(d=>DEV[d.key]=d);
  }
  if(PC && PC.fullLab===false){ window.__simpleBg = true; }
})();

/* =========================================================
   设备可调参数（用户在弹窗中编辑，直接重写「当前操作」与「实时读数」，
   并随 AI 在下一轮经过该设备时生效）
   - op:true  → 参与构造「当前操作」描述文本
   - reads:[k]→ 同步写入同名读数（实时读数随之变化）
   - options  → 以下拉选择代替滑块（如气氛）
   ========================================================= */
const DEV_OPTPL={
  balance:'称量 {称量} g 前驱体',
  sonicator:'超声分散 {时间} min（{功率} W）',
  stirrer:'{转速} rpm 搅拌浸渍（{温度}℃）',
  furnace:'{温度}℃ {气氛} 焙烧 {时间}h',
  tube:'{温度}℃ {气氛} 还原/退火 {时间}h',
  vacuumoven:'{温度}℃ 真空干燥 {时间}h（真空 {真空} kPa）',
  gasfeed:'通 CH₄ {CH₄流量} sccm，O₂ {O₂流量} sccm，平衡气 Ar {平衡气Ar流量} sccm（{压力} bar）',
  lamp:'{灯类型} 照射 {光强} mW/cm²（中心波长 {中心波长} nm，滤光 {滤光波长} nm）',
  reactor:'{材质} 反应腔 {温度}℃ 受光（光照面积 {光照面积} cm²，{压力} bar）',
  centrifuge:'{转速} rpm 离心 {时间} s',
  pipette:'{工作方式} 分装 {分液体积} mL 前驱体',
  icebath:'循环水浴泵控温 {温度}℃（{泵流量} L/min）',
  irlamb:'红外灯 {温度}℃ 干燥（{功率} W）',
  oven:'{温度}℃ 鼓风干燥 {时间}h',
  spray:'喷涂 {喷涂量} mL 墨水（膜厚 {膜厚} μm）',
  uvvis:'UV-Vis DRS 扫描 {扫描范围} nm（{积分球} 积分球）',
  atr:'ATR 红外采集 {扫描次数} 次（分辨率 {分辨率} cm⁻¹）',
  fluor:'PL 谱激发 {激发波长} nm，发射范围 {发射范围} nm',
  lifetime:'超快瞬态吸收测载流子寿命（泵浦 {泵浦波长} nm，时间窗 {时间窗} ns）',
  bet:'BET 脱气 {脱气温度}℃ × {脱气时间}h 后 N₂ 吸附',
  tem:'TEM 观测（加速电压 {加速电压} kV，放大 {放大倍率} K）',
  synch:'同步辐射 XAS 扫描 {扫描边}（{模式}）',
  photocurr:'光电流测试（偏压 {偏压} V vs RHE，光强 {光强} mW/cm²）',
  xps:'XPS 全谱 + 高分辨精细谱（通能 {通能} eV，{扫描范围}）',
  gn_system:'GN 系统总控：就绪 {就绪状态}，{复位}，{停止}',
  gn_stack:'GN 旋转堆栈：{指令类型}（目标位 {目标位}）',
  gn_liquid:'GN 9320 液体处理：{指令类型}（吸液 {吸液体积}μL，温控 {温度}℃，震荡 {震荡频率}rpm）',
  gn_robot:'GN 机械臂：{指令类型}（目标工站 {目标工站}，夹爪 {夹爪位置}）',
  gn_solid:'GN 粉末加样：{指令类型}（加样 {加料量}mg，天平 {天平读数}mg）',
  gn_tube:'GN 离心管系统：{指令类型}（恒温 {恒温温度}℃，超声 {超声时间}s，混匀 {混匀次数} 次）',
  gn_quick:'GN 快换模块：{指令类型}（磁力搅拌 {搅拌转速}rpm / {搅拌温度}℃ / {搅拌时间}min）',
  gn_centrifuge:'GN 离心机：{指令类型}（{转速}rpm × {时间}s，板位 {板位号}，{温度}℃）',
  gn_lock:'GN 锁紧机构：{指令类型}（夹爪力度 {夹爪力度}N，目标 X{Y位置}）',
  gn_oven:'GN 常规烘箱：{指令类型}（{温度}℃，{时间(小时)}h，{门控}）',
  gn_vacuum:'GN 真空烘箱：{指令类型}（段{程序段} {温度}℃ × {运行时间}h，真空 {真空度}Pa，{门控}）'
};
const DEV_PARAMS={
  balance:[{k:'称量',unit:'g',min:0.001,max:5,step:0.001,val:0.0523,op:true,reads:['读数']}],
  sonicator:[{k:'功率',unit:'W',min:0,max:180,step:5,val:120,reads:['功率']},{k:'水温',unit:'℃',min:0,max:80,step:1,val:42,reads:['水温']},{k:'时间',unit:'min',min:5,max:60,step:5,val:30,op:true}],
  stirrer:[{k:'转速',unit:'rpm',min:0,max:2000,step:50,val:500,reads:['转速'],op:true},{k:'温度',unit:'℃',min:0,max:380,step:5,val:65,reads:['温度']}],
  furnace:[{k:'温度',unit:'℃',min:0,max:1500,step:10,val:500,reads:['温度','设定'],op:true},{k:'时间',unit:'h',min:0.5,max:24,step:0.5,val:4,op:true},{k:'气氛',unit:'',options:['空气/静态','N₂','Ar','O₂'],val:'空气/静态',op:true}],
  tube:[{k:'温度',unit:'℃',min:0,max:1200,step:10,val:300,reads:['温度'],op:true},{k:'时间',unit:'h',min:0.5,max:12,step:0.5,val:2,op:true},{k:'气氛',unit:'',options:['H₂','Ar','He','H₂/Ar'],val:'H₂',op:true}],
  vacuumoven:[{k:'温度',unit:'℃',min:0,max:200,step:5,val:60,reads:['温度'],op:true},{k:'时间',unit:'h',min:1,max:48,step:1,val:12,op:true},{k:'真空',unit:'kPa',min:0.01,max:101,step:0.01,val:0.05,reads:['真空'],op:true}],
  gasfeed:[{k:'CH₄流量',unit:'sccm',min:0,max:200,step:1,val:30,reads:['CH₄ 流量'],op:true},{k:'O₂流量',unit:'sccm',min:0,max:200,step:1,val:15,op:true},{k:'平衡气Ar流量',unit:'sccm',min:0,max:200,step:1,val:50,reads:['Ar 流量'],op:true},{k:'压力',unit:'bar',min:0,max:3,step:0.1,val:1.0,reads:['压力'],op:true}],
  lamp:[{k:'光强',unit:'mW/cm²',min:0,max:500,step:10,val:320,reads:['光强'],op:true},{k:'中心波长',unit:'nm',min:200,max:1100,step:10,val:420,reads:['中心波长'],op:true},{k:'滤光波长',unit:'nm',min:200,max:800,step:10,val:420,op:true},{k:'灯类型',unit:'',options:['氙灯 Xe','LED','汞灯 Hg'],val:'氙灯 Xe',op:true}],
  reactor:[{k:'温度',unit:'℃',min:20,max:200,step:1,val:35,reads:['温度'],op:true},{k:'光照面积',unit:'cm²',min:1,max:50,step:1,val:25,reads:['光照面积'],op:true},{k:'材质',unit:'',options:['石英','不锈钢','硼硅玻璃'],val:'石英',op:true},{k:'压力',unit:'bar',min:0,max:3,step:0.1,val:1.0,op:true}],
  centrifuge:[{k:'转速',unit:'rpm',min:0,max:10000,step:100,val:8000,reads:['转速'],op:true},{k:'时间',unit:'s',min:0,max:600,step:10,val:600,reads:['时间'],op:true}],
  pipette:[{k:'分液体积',unit:'mL',min:0.001,max:50,step:0.001,val:1.0,reads:['分液体积'],op:true},{k:'工作方式',unit:'',options:['注射泵','移液枪','9320 工作站'],val:'移液枪',op:true}],
  icebath:[{k:'温度',unit:'℃',min:-20,max:100,step:1,val:4,reads:['温度'],op:true},{k:'泵流量',unit:'L/min',min:0,max:15,step:0.5,val:8,reads:['泵流量'],op:true}],
  irlamb:[{k:'功率',unit:'W',min:0,max:500,step:10,val:250,reads:['功率'],op:true},{k:'温度',unit:'℃',min:20,max:300,step:5,val:60,reads:['温度'],op:true}],
  oven:[{k:'温度',unit:'℃',min:30,max:300,step:5,val:80,reads:['温度'],op:true},{k:'时间',unit:'h',min:1,max:48,step:1,val:12,op:true}],
  spray:[{k:'喷涂量',unit:'mL',min:0,max:20,step:0.5,val:5,reads:['喷涂量'],op:true},{k:'膜厚',unit:'μm',min:0.1,max:10,step:0.1,val:2,reads:['膜厚'],op:true}],
  gc:[{k:'柱温',unit:'℃',min:0,max:250,step:5,val:80,reads:['柱温']}],
  drifts:[{k:'·CH₃ 振动',unit:'cm⁻¹',min:1000,max:1600,step:5,val:1305,reads:['·CH₃ 振动']}],
  glovebox:[{k:'目标 O₂',unit:'ppm',min:0,max:1,step:0.01,val:0.05,reads:['O₂']},{k:'目标 H₂O',unit:'ppm',min:0,max:1,step:0.01,val:0.08,reads:['H₂O']}],
  uvvis:[{k:'扫描范围',unit:'nm',min:200,max:1100,step:10,val:800,reads:['吸收边'],op:true},{k:'积分球',unit:'',options:['BaSO₄','KCl'],val:'BaSO₄',op:true}],
  atr:[{k:'扫描次数',unit:'',min:16,max:256,step:16,val:32,op:true},{k:'分辨率',unit:'cm⁻¹',min:1,max:8,step:0.5,val:4}],
  fluor:[{k:'激发波长',unit:'nm',min:200,max:600,step:5,val:325,reads:['PL 峰位'],op:true},{k:'发射范围',unit:'nm',min:250,max:900,step:10,val:800,op:true}],
  lifetime:[{k:'泵浦波长',unit:'nm',min:200,max:500,step:10,val:350,op:true},{k:'时间窗',unit:'ns',min:0.1,max:10,step:0.1,val:5,op:true}],
  bet:[{k:'脱气温度',unit:'℃',min:50,max:400,step:10,val:150,op:true},{k:'脱气时间',unit:'h',min:2,max:24,step:1,val:12,op:true}],
  tem:[{k:'加速电压',unit:'kV',min:80,max:300,step:20,val:200,op:true},{k:'放大倍率',unit:'K',min:50,max:1000,step:50,val:100,op:true}],
  synch:[{k:'扫描边',unit:'',options:['K 边','L 边','M 边'],val:'K 边',op:true},{k:'模式',unit:'',options:['XANES','EXAFS','全谱'],val:'全谱',op:true}],
  photocurr:[{k:'偏压',unit:'V vs RHE',min:-1,max:2,step:0.1,val:0,op:true},{k:'光强',unit:'mW/cm²',min:0,max:200,step:10,val:100,reads:['光电流'],op:true}],
  xps:[{k:'通能',unit:'eV',min:20,max:200,step:10,val:80,op:true},{k:'扫描范围',unit:'',options:['全谱','精细谱','深度剖析'],val:'全谱',op:true}],
  gn_system:[
    {k:'就绪状态',unit:'',options:['0 故障','1 就绪'],val:'1 就绪',reads:['就绪状态'],op:true},
    {k:'复位',unit:'',options:['不动作','触发复位'],val:'不动作',op:true},
    {k:'停止',unit:'',options:['不动作','触发停止'],val:'不动作',op:true}
  ],
  gn_stack:[
    {k:'目标位',unit:'位',min:1,max:12,step:1,val:1,reads:['目标位'],op:true},
    {k:'R旋转位置',unit:'°',min:0,max:360,step:1,val:0,op:true},
    {k:'指令类型',unit:'',options:['1 左旋转','2 右旋转','3 相机Z向上','4 相机Z向下','5 旋转至目标位','6 相机检测有无','7 复位'],val:'5 旋转至目标位',op:true}
  ],
  gn_liquid:[
    {k:'吸液体积',unit:'μL',min:0,max:1000,step:10,val:200,reads:['吸液体积'],op:true},
    {k:'温度',unit:'℃',min:4,max:95,step:1,val:25,reads:['温度'],op:true},
    {k:'震荡频率',unit:'rpm',min:0,max:3000,step:50,val:0,reads:['震荡频率'],op:true},
    {k:'恒温时长',unit:'min',min:0,max:120,step:1,val:0,reads:['恒温时长'],op:true},
    {k:'指令类型',unit:'',options:['1 吸液 aspirate','2 放液 dispense','3 震荡加样 shaker','4 温控 heater','5 混匀转移 mix','6 复位'],val:'1 吸液 aspirate',op:true}
  ],
  gn_robot:[
    {k:'目标工站',unit:'',min:1,max:10,step:1,val:1,reads:['目标工站'],op:true},
    {k:'X 位置',unit:'mm',min:0,max:7500,step:1,val:0,reads:['X 位置'],op:true},
    {k:'夹爪位置',unit:'',options:['0 松开','1 夹紧'],val:'0 松开',op:true},
    {k:'指令类型',unit:'',options:['1 X向左','2 X向右','3 夹料','4 放料','6 停止','7 复位','8 失能','9 使能'],val:'3 夹料',op:true}
  ],
  gn_solid:[
    {k:'加料量',unit:'mg',min:0,max:2000,step:0.1,val:50,reads:['加料量'],op:true},
    {k:'天平读数',unit:'mg',min:0,max:2000,step:0.1,val:50.2,reads:['天平读数'],op:true},
    {k:'指令类型',unit:'',options:['11 加料','12 夹爪夹料','13 夹爪放料','14 去皮','15 称重','24 除静电','25 关静电','20 复位'],val:'11 加料',op:true}
  ],
  gn_tube:[
    {k:'恒温温度',unit:'℃',min:4,max:70,step:1,val:28,reads:['恒温温度'],op:true},
    {k:'超声时间',unit:'s',min:0,max:600,step:10,val:60,reads:['超声时间'],op:true},
    {k:'夹爪力度',unit:'N',min:0,max:50,step:1,val:10,reads:['夹爪力度'],op:true},
    {k:'混匀次数',unit:'次',min:0,max:20,step:1,val:3,reads:['混匀次数'],op:true},
    {k:'指令类型',unit:'',options:['5 8通道Z向上','7 8通道移液吸','8 8通道移液放','11 单通道移液吸','12 单通道移液放','27 小夹爪开盖','28 小夹爪关盖','35 超声波混匀','36 复位'],val:'7 8通道移液吸',op:true}
  ],
  gn_quick:[
    {k:'搅拌转速',unit:'rpm',min:0,max:2000,step:10,val:0,reads:['搅拌转速'],op:true},
    {k:'搅拌温度',unit:'℃',min:0,max:150,step:1,val:25,reads:['搅拌温度'],op:true},
    {k:'搅拌时间',unit:'min',min:0,max:120,step:1,val:0,reads:['搅拌时间'],op:true},
    {k:'指令类型',unit:'',options:['1 X向左','2 X向右','3 Z1向左','4 Z1向右','5 Z2向左','6 Z2向右','7 推轴向左','8 推轴向右','9 Z3向左','10 Z3向右','11 物料顶出','12 物料放置','13 磁力搅拌运行','14 复位'],val:'12 物料放置',op:true}
  ],
  gn_centrifuge:[
    {k:'转速',unit:'rpm',min:0,max:12000,step:100,val:6000,reads:['转速'],op:true},
    {k:'时间',unit:'s',min:0,max:3600,step:10,val:60,reads:['时间'],op:true},
    {k:'温度',unit:'℃',min:4,max:60,step:1,val:25,reads:['温度'],op:true},
    {k:'板位号',unit:'',min:1,max:4,step:1,val:1,reads:['板位号'],op:true},
    {k:'指令类型',unit:'',options:['1 Y向左','2 Y向右','3 Z向左','4 Z向右','5 放入物料','6 运行离心机','7 取出物料','8 复位','9 夹爪张开','10 夹爪夹紧'],val:'6 运行离心机',op:true}
  ],
  gn_lock:[
    {k:'X位置',unit:'',min:-1000,max:1000,step:1,val:0,reads:['X位置'],op:true},
    {k:'Y位置',unit:'',min:-1000,max:1000,step:1,val:0,reads:['Y位置'],op:true},
    {k:'夹爪力度',unit:'N',min:0,max:50,step:1,val:20,reads:['夹爪力度'],op:true},
    {k:'指令类型',unit:'',options:['1 X向左','2 X向右','3 Y向左','4 Y向右','5 Z1向左','6 Z1向右','7 Z2向左','8 Z2向右','9 夹爪夹取','10 夹爪放置','11 电批拧紧','12 电批拧松','13 夹爪夹紧','14 夹爪松开','16 复位'],val:'11 电批拧紧',op:true}
  ],
  gn_oven:[
    {k:'温度',unit:'℃',min:30,max:250,step:5,val:80,reads:['温度'],op:true},
    {k:'时间(小时)',unit:'h',min:0,max:48,step:1,val:12,reads:['剩余时间'],op:true},
    {k:'门控',unit:'',options:['关门','开门'],val:'关门',op:true},
    {k:'指令类型',unit:'',options:['1 启动','2 复位/停止'],val:'1 启动',op:true}
  ],
  gn_vacuum:[
    {k:'温度',unit:'℃',min:30,max:250,step:5,val:60,reads:['温度'],op:true},
    {k:'运行时间',unit:'h',min:1,max:48,step:1,val:24,reads:['运行时间'],op:true},
    {k:'真空度',unit:'Pa',min:0,max:1000,step:1,val:5,reads:['真空度'],op:true},
    {k:'程序段',unit:'',min:1,max:6,step:1,val:1,op:true},
    {k:'门控',unit:'',options:['关门','开门'],val:'关门',op:true},
    {k:'指令类型',unit:'',options:['1 启动','2 复位','100 开门','101 关门'],val:'1 启动',op:true}
  ]
};
function fmtParam(p){ return p.options? p.val : (Number.isInteger(p.step)&&p.step>=1? Math.round(p.val): +p.val.toFixed(3)); }
function buildOp(d){
  if(!d._params||!d.opTpl) return d.op;
  let s=d.opTpl;
  for(const p of d._params){ if(p.op){ s=s.split('{'+p.k+'}').join(fmtParam(p)); } }
  return s;
}
function syncReadingsFromParams(d){
  if(!d._params) return;
  for(const p of d._params){
    if(p.reads&&d.readings){
      for(const rk of p.reads){ const r=d.readings.find(r=>r.k===rk); if(r) r.val=p.val; }
    }
  }
}
for(const key in DEV_PARAMS){
  const d=DEV[key]; if(!d) continue;
  d._params=DEV_PARAMS[key].map(p=>({...p}));
  d.opTpl=DEV_OPTPL[key]||null;
  d.op=buildOp(d);
  syncReadingsFromParams(d);
}
function applyParam(d,p,v){
  if(p.options){ p.val=v; }
  else { v=Math.min(p.max,Math.max(p.min,+v)); v=Math.round(v/p.step)*p.step; if(!Number.isFinite(v))v=p.min; p.val=v; }
  d.op=buildOp(d);
  syncReadingsFromParams(d);
  if(!d.userEdited) d.userEdited=true;
  d.userParams=Object.fromEntries(d._params.map(x=>[x.k,x.val]));
  const aiNow=(activeDevice===d.key&&running);
  const durTxt=OP_DUR[d.key]?`（预计模拟耗时 ${fmtSim(OP_DUR[d.key])}）`:'';
  document.getElementById('dm-op').innerHTML = aiNow
    ? `<span class="ai-now">● AI 正在操作：</span>${d.op}${durTxt}`
    : `待机 · 计划操作：${d.op}${durTxt}`;
  renderReadings(d);
}
function renderParams(d){
  const sec=document.getElementById('dm-params-sec');
  const box=document.getElementById('dm-params');
  box.innerHTML='';
  if(!d._params||!d._params.length){ sec.style.display='none'; return; }
  sec.style.display='block';
  d._params.forEach(p=>{
    const row=document.createElement('div'); row.className='dp-row';
    let ctrl;
    if(p.options){
      ctrl=`<select class="dp-sel" data-k="${p.k}">`+p.options.map(o=>`<option ${o===p.val?'selected':''}>${o}</option>`).join('')+`</select>`;
    }else{
      ctrl=`<input type="range" class="dp-rng" data-k="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.val}"><input type="number" class="dp-num" data-k="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.val}">`;
    }
    row.innerHTML=`<div class="dp-k">${p.k}${p.unit?` <small>(${p.unit})</small>`:''}</div><div class="dp-c">${ctrl}</div>`;
    box.appendChild(row);
  });
  box.querySelectorAll('.dp-rng,.dp-num').forEach(el=>{
    el.addEventListener('input',e=>{
      const k=e.target.dataset.k; const p=d._params.find(x=>x.k===k);
      applyParam(d,p,e.target.value);
      box.querySelectorAll(`[data-k="${k}"]`).forEach(o=>{ if(o!==e.target) o.value=e.target.value; });
    });
  });
  box.querySelectorAll('.dp-sel').forEach(el=>{
    el.addEventListener('change',e=>{
      const k=e.target.dataset.k; const p=d._params.find(x=>x.k===k);
      applyParam(d,p,e.target.value);
    });
  });
}
// 用户实验配方导出 + 即时调度
function exportUserRecipe(){
  const recipe={};
  DEVICES.forEach(d=>{ if(d.userEdited && d.userParams) recipe[d.key]=Object.assign({},d.userParams); });
  if(Object.keys(recipe).length===0){ log('warn','⚠ 还没有设备被调整过参数，先拖动滑块 / 下拉设定，再点「▶ 让 AI 按此条件执行」导出配方。'); return null; }
  let base;
  if(curCand && curCand.metal) base = curCand;
  else if(typeof POOL!=='undefined' && POOL && POOL.length) base = POOL[0];
  else { log('warn','⚠ 当前聚焦页未加载完整催化剂库，配方以占位基底保存（在「总览」页可跑完整主动学习）。'); base = {metal:'—',support:'—',y:null,s:null}; }
  const n = USER_RECIPES.length+1;
  const mod = recipeMod(recipe);
  const r = Object.assign({}, base, { doi:'user-'+n, metal:base.metal, support:base.support, userDesigned:true, recipe, recipeMod:mod, y:base.y, s:base.s!=null?base.s:null });
  USER_RECIPES.push(r);
  log('user',`👤 实验配方 #${n} 已导出并加入主动学习候选池：${Object.keys(recipe).map(k=>DEV[k].name+'['+fmtRecipe(recipe[k])+']').join('；')} · 合成调制因子 ≈ ${mod.toFixed(2)}`);
  try{ if(typeof refreshKbMeta==='function') refreshKbMeta(); }catch(e){}
  return r;
}
function buildRecipeRows(){
  // 收集所有配方中出现过的设备 × 参数，作为稳定的展开列
  const cols=new Map();
  for(const r of USER_RECIPES){
    for(const dk in r.recipe){
      if(!cols.has(dk)) cols.set(dk,new Set());
      for(const pk in r.recipe[dk]) cols.get(dk).add(pk);
    }
  }
  const deviceCols=[];
  for(const [dk,ps] of cols){ for(const pk of ps) deviceCols.push([dk,pk]); }
  const metaCols=['配方编号','基底金属','载体','产物','机理','CH4吸附能_eV','带隙_eV','EOV_eV','ΔE*CH3_eV','基底预测C2_umol_g_h','基底选择性_%','合成调制因子'];
  const rows=[];
  for(const r of USER_RECIPES){
    const row={};
    row['配方编号']=r.doi;
    row['基底金属']=r.metal; row['载体']=r.support;
    row['产物']=r.product||''; row['机理']=r.mech||'';
    row['CH4吸附能_eV']=r.ad!=null?r.ad:'';
    row['带隙_eV']=r.bg!=null?r.bg:'';
    row['EOV_eV']=r.eov!=null?r.eov.toFixed(2):'';
    row['ΔE*CH3_eV']=r.dcht3!=null?r.dcht3.toFixed(2):'';
    row['基底预测C2_umol_g_h']=r.y!=null?r.y:'';
    row['基底选择性_%']=r.s!=null?r.s:'';
    row['合成调制因子']=r.recipeMod!=null?r.recipeMod.toFixed(3):'';
    for(const [dk,pk] of deviceCols){
      const v=(r.recipe[dk]&&r.recipe[dk][pk]!=null)?r.recipe[dk][pk]:'';
      row[(DEV[dk]?DEV[dk].name:dk)+'_'+pk]=v;
    }
    rows.push(row);
  }
  return {metaCols, deviceCols, rows};
}
function csvEscape(v){ v=String(v==null?'':v); return /[",\n\r]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
function toCSV(metaCols,deviceCols,rows){
  const header=metaCols.concat(deviceCols.map(([dk,pk])=>(DEV[dk]?DEV[dk].name:dk)+'_'+pk));
  const lines=[header.map(csvEscape).join(',')];
  for(const r of rows) lines.push(header.map(h=>csvEscape(r[h])).join(','));
  return '﻿'+lines.join('\r\n');   // BOM 保证 Excel 正确识别中文
}
function toJSON(){
  return JSON.stringify({
    meta:{ generatedAt:new Date().toISOString(), count:USER_RECIPES.length, source:'AI World Model Studio v14',
      note:'用户实验配方导出（USER_RECIPES）→ 主动学习候选扩充；合成调制因子 recipeMod 为示意性合成条件调制（非精确热力学求解）' },
    recipes:USER_RECIPES.map(r=>({
      id:r.doi,
      base:{metal:r.metal, support:r.support, product:r.product, mech:r.mech, ad_eV:r.ad, bg_eV:r.bg, eov_eV:r.eov, dcht3_eV:r.dcht3, y_umol_g_h:r.y, s_pct:r.s},
      recipeMod:r.recipeMod,
      recipe:r.recipe
    }))
  }, null, 2);
}
function downloadFile(name,content,mime){
  try{
    const blob=new Blob([content],{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    return true;
  }catch(e){ log('warn','⚠ 浏览器下载失败：'+e.message); return false; }
}
function exportRecipesCSV(){
  if(USER_RECIPES.length===0){ log('warn','⚠ 用户配方池为空，先点「▶ 让 AI 按此条件执行」导出至少一个配方再下载。'); return; }
  const {metaCols,deviceCols,rows}=buildRecipeRows();
  downloadFile('user_recipes.csv', toCSV(metaCols,deviceCols,rows), 'text/csv;charset=utf-8');
  log('ok',`⬇ 已导出 <b>${USER_RECIPES.length}</b> 条用户配方为 CSV（user_recipes.csv，${metaCols.length+deviceCols.length} 列）。`);
}
function exportRecipesJSON(){
  if(USER_RECIPES.length===0){ log('warn','⚠ 用户配方池为空，先点「▶ 让 AI 按此条件执行」导出至少一个配方再下载。'); return; }
  downloadFile('user_recipes.json', toJSON(), 'application/json;charset=utf-8');
  log('ok',`⬇ 已导出 <b>${USER_RECIPES.length}</b> 条用户配方为 JSON（user_recipes.json）。`);
}
function startDispatch(dk){
  pendingDispatch=true; savedStage=loopStage; dispatchNow=dk;
  activeDevice=dk; setCharTarget(dk); loopState='moving';
}
let activeDevice='literature';
let selectedDevice=null;
let lastOpenedDevice=null;

// 角色
const char={x:0,y:0,tx:0,ty:0,vx:0,vy:0,speed:7.2,walkPhase:0,facing:1,busy:false,targetKey:'literature'};
function devCenter(k){const d=DEV[k];return{x:(d.x+d.w/2)*W,y:(d.y+d.h/2)*H};}
function setCharTarget(k){char.targetKey=k;char.busy=true;const c=devCenter(k);char.tx=c.x;char.ty=c.y;}

// 合成路径：先经 510 GN 合成工站（粉末加样/离心管/9320/烘箱/真空烘箱），再到光催化焙烧装置
const SYN_PATH=['gn_solid','gn_tube','gn_liquid','gn_oven','gn_vacuum','balance','sonicator','stirrer','furnace','tube','vacuumoven'];
// 表征 / 后处理路径：510 GN 离心/快换/锁紧/机械臂/堆栈 + 光催化反应与表征
const EXP_PATH=['gn_centrifuge','gn_quick','gn_lock','gn_robot','gn_stack','glovebox','gasfeed','reactor','gc','ms','drifts','xrd'];
const STAGE_LABEL=['① 文献学习','② 虚拟合成与表征','③ 真实实验反馈','④ 强化 / 主动学习'];
function routeStage(s){
  const key = s===0?'literature':s===1?SYN_PATH[iter%SYN_PATH.length]:s===2?EXP_PATH[iter%EXP_PATH.length]:['ai','robot'][iter%2];
  activeDevice=key; setCharTarget(key);
  labStageText = STAGE_LABEL[s] + ' · ' + DEV[key].name;
}
// 阶段高亮联动
const _setStage=setStage;
setStage=function(i){_setStage(i);routeStage(i);};
function setActiveDevice(k){
  activeDevice=k;
  if(k!=='literature'&&k!=='ai'&&k!=='robot') spawnBurst(k);
}

// 分子 / 火花
const molecules=[], sparks=[];
function spawnMolecule(fromK,toK,col){const a=devCenter(fromK),b=devCenter(toK);
  molecules.push({x:a.x,y:a.y-10,tx:b.x,ty:b.y-10,col,p:0,sp:0.012+Math.random()*0.01});}
function spawnBurst(k){const d=DEV[k];for(let i=0;i<10;i++)sparks.push({x:(d.x+Math.random()*d.w)*W,y:(d.y+d.h*0.3+Math.random()*d.h*0.5)*H,vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5-0.5,life:1});}

// NEB 示意
let nebOn=false,nebT=0;
function nebEnergy(s){return s<0.5? 0.9*(s/0.5)**2 : 0.9*(1-2*(s-0.5)/0.5+((s-0.5)/0.5)**2)-0.5*((s-0.5)/0.5)**2;}
function drawNEB(s){
  if(activeReaction==='OER') return;   // OER 无 ·CH₃ 偶联 NEB 路径
  const cv=document.getElementById('neb-chart');const c=cv.getContext('2d');
  const w=cv.width=cv.clientWidth*DPR,h=cv.height=cv.clientHeight*DPR;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,w/DPR,h/DPR);
  const x0=24,x1=w/DPR-16,y0=h/DPR-26,y1=14,Emin=-0.6,Emax=1.0;
  const X=v=>x0+(x1-x0)*v,Y=e=>y0+(y1-y0)*((e-Emin)/(Emax-Emin));
  // 网格
  c.strokeStyle='rgba(148,163,184,.15)';c.lineWidth=1;
  for(let i=0;i<=4;i++){const yy=y1+(y0-y1)*i/4;c.beginPath();c.moveTo(x0,yy);c.lineTo(x1,yy);c.stroke();}
  c.strokeStyle='#8b5cf6';c.lineWidth=2;c.shadowColor='#8b5cf6';c.shadowBlur=8;
  c.beginPath();
  for(let i=0;i<=100;i++){const v=i/100,e=nebEnergy(v);i?c.lineTo(X(v),Y(e)):c.moveTo(X(v),Y(e));}c.stroke();c.shadowBlur=0;
  [['IS',0,0,'#5ee7df'],['TS',0.5,0.9,'#f59e0b'],['FS',1,-0.5,'#34d399']].forEach(([l,v,e,col])=>{c.fillStyle=col;c.beginPath();c.arc(X(v),Y(e),4,0,7);c.fill();c.fillStyle='#cbd5e1';c.font='10px sans-serif';c.fillText(l,X(v)-8,Y(e)-8);});
  const e=nebEnergy(s);c.fillStyle='#5ee7df';c.beginPath();c.arc(X(s),Y(e),5,0,7);c.fill();
  c.strokeStyle='rgba(94,231,223,.35)';c.setLineDash([4,3]);c.beginPath();c.moveTo(X(s),y0);c.lineTo(X(s),y1);c.stroke();c.setLineDash([]);
  c.fillStyle='#94a3b8';c.fillText('反应坐标 →',(x0+x1)/2-24,h/DPR-8);
}

/* ---------- 绘制工具 ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function shade(hex,p){const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=p/100;r=Math.round(r+(p>0?255-r:-r)*f);g=Math.round(g+(p>0?255-g:-g)*f);b=Math.round(b+(p>0?255-b:-b)*f);return`rgb(${r},${g},${b})`;}

function drawSimpleBg(){
  // 简洁实验室背景（聚焦页用）：浅灰白底科技风
  const wallG=ctx.createLinearGradient(0,0,0,H*0.56);
  wallG.addColorStop(0,'#f8fafc'); wallG.addColorStop(1,'#eef2f7');
  ctx.fillStyle=wallG; ctx.fillRect(0,0,W,H*0.56);
  const floorG=ctx.createLinearGradient(0,H*0.54,0,H);
  floorG.addColorStop(0,'#e2e8f0'); floorG.addColorStop(1,'#dbeafe');
  ctx.fillStyle=floorG; ctx.fillRect(0,H*0.54,W,H*0.46);
  // 等距透视网格线（浅灰）
  ctx.strokeStyle='rgba(148,163,184,.18)'; ctx.lineWidth=1;
  for(let gx=0;gx<=W;gx+=80){ ctx.beginPath();ctx.moveTo(gx,H*0.54);ctx.lineTo(gx*0.68+W*0.16,H);ctx.stroke(); }
  for(let gy=H*0.54;gy<=H;gy+=50){ ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke(); }
  // 顶部环境光（模拟天窗/LED 面板）
  const amb=ctx.createRadialGradient(W*0.5,H*0.01,0,W*0.5,H*0.08,W*0.7);
  amb.addColorStop(0,'rgba(255,255,255,.45)'); amb.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=amb; ctx.fillRect(0,0,W,H*0.12);
}
function drawBackground(){
  if(window.__simpleBg){ drawSimpleBg(); return; }
  /* ===== 3D 具象化学实验室 —— 干净等距风格（参考图：玻璃墙 + 分区标签 + 不锈钢台面） ===== */

  // ── 墙面：干净实验室白灰，顶部天窗漫射
  const wallG=ctx.createLinearGradient(0,0,0,H*0.56);
  wallG.addColorStop(0,'#f8fafc'); wallG.addColorStop(0.45,'#f1f5f9'); wallG.addColorStop(1,'#e2e8f0');
  ctx.fillStyle=wallG; ctx.fillRect(0,0,W,H*0.56);

  // ── 踢脚线
  ctx.fillStyle='#cbd5e1'; ctx.fillRect(0,H*0.54,W,H*0.025);

  // ── 左侧大窗户（透视 3D：外框+玻璃反光+窗外天光渐变）
  (function drawWindow(){
    const wx=W*0.008, wy=H*0.04, ww=W*0.13, wh=H*0.26;
    // 窗框（浅灰铝合金，3D 厚度）
    ctx.fillStyle='#e2e8f0'; rr(wx-4,wy-4,ww+8,wh+8,3); ctx.fill();
    ctx.fillStyle='#f8fafc'; rr(wx,wy,ww,wh,2); ctx.fill();
    // 玻璃（天光蓝渐变，模拟室外自然光）
    const glassG=ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);
    glassG.addColorStop(0,'rgba(186,230,253,.35)'); glassG.addColorStop(.5,'rgba(125,211,252,.25)');
    glassG.addColorStop(1,'rgba(56,189,248,.15)');
    ctx.fillStyle=glassG; rr(wx+3,wy+3,ww-6,wh-6,2); ctx.fill();
    // 窗格十字分隔
    ctx.strokeStyle='rgba(148,163,184,.7)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(wx+ww/2,wy); ctx.lineTo(wx+ww/2,wy+wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx,wy+wh*0.45); ctx.lineTo(wx+ww,wy+wh*0.45); ctx.stroke();
    // 玻璃高光斜条（左上角反光）
    ctx.fillStyle='rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.moveTo(wx+6,wy+6); ctx.lineTo(wx+22,wy+6); ctx.lineTo(wx+6,wy+22); ctx.closePath(); ctx.fill();
    // 窗台（白色大理石/人造石，3D 厚度）
    const sillG=ctx.createLinearGradient(wx,wy+wh,wx,wy+wh+10);
    sillG.addColorStop(0,'#ffffff'); sillG.addColorStop(1,'#e2e8f0');
    ctx.fillStyle=sillG; rr(wx-4,wy+wh,ww+8,10,2); ctx.fill();
  })();

  // ── 通风橱（Fume Hood —— 核心特征设备，画在右后区，3D 透视）
  (function drawFumeHood(){
    const hx=W*0.44, hy=H*0.02, hw=W*0.155, hh=H*0.27;
    // 外壳（不锈钢/聚丙烯，浅灰主体+白边）
    const bodyG=ctx.createLinearGradient(hx,hy,hx,hy+hh);
    bodyG.addColorStop(0,'#f1f5f9'); bodyG.addColorStop(1,'#e2e8f0');
    ctx.fillStyle=bodyG; rr(hx,hy,hw,hh,6); ctx.fill();
    ctx.strokeStyle='rgba(148,163,184,.35)'; ctx.lineWidth=1.5; rr(hx,hy,hw,hh,6); ctx.stroke();
    // 玻璃升降窗（半透明青色，可看见内部）
    const sashY=hy+hh*0.18, sashH=hh*0.52;
    const sashG=ctx.createLinearGradient(hx,sashY,hx,sashY+sashH);
    sashG.addColorStop(0,'rgba(186,230,253,.25)'); sashG.addColorStop(1,'rgba(125,211,252,.15)');
    ctx.fillStyle=sashG; rr(hx+4,sashY,hw-8,sashH,4); ctx.fill();
    ctx.strokeStyle='rgba(150,200,235,.30)'; ctx.lineWidth=1; rr(hx+4,sashY,hw-8,sashH,4); ctx.stroke();
    // 升降窗把手
    ctx.fillStyle='#94a3b8'; rr(hx+hw-14,sashY+sashH*0.3,8,16,2); ctx.fill();
    // 内部操作台面（可见透过玻璃）
    ctx.fillStyle='rgba(226,232,240,.6)'; rr(hx+8,sashY+sashH-12,hw-16,14,3); ctx.fill();
    // 顶部排风口（横向格栅）
    ctx.fillStyle='#cbd5e1'; rr(hx+hw*0.15,hy-5,hw*0.70,8,2); ctx.fill();
    ctx.strokeStyle='rgba(148,163,184,.4)'; ctx.lineWidth=1;
    for(let i=1;i<6;i++){ const gx=hx+hw*i/6; ctx.beginPath(); ctx.moveTo(gx,hy-5); ctx.lineTo(gx,hy+3); ctx.stroke(); }
    // 运行指示灯（绿色=排风中）
    ctx.fillStyle='rgba(34,197,94,.7)'; ctx.shadowColor='#22c55e'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(hx+hw-14,hy+hh-10,3,0,7); ctx.fill(); ctx.shadowBlur=0;
    // "FUME HOOD" 小标签
    ctx.fillStyle='rgba(100,116,139,.55)'; ctx.font='8px sans-serif'; ctx.textAlign='center';
    ctx.fillText('FUME HOOD',hx+hw/2,hy+hh-4); ctx.textAlign='left';
  })();

  // ── 地面（环氧树脂地坪，深灰+微妙纹理）
  const floorG=ctx.createLinearGradient(0,H*0.56,0,H);
  floorG.addColorStop(0,'#1a2230'); floorG.addColorStop(1,'#101725');
  ctx.fillStyle=floorG; ctx.fillRect(0,H*0.56,W,H*0.44);
  // 地面反光线（模拟顶灯在地面上的反射椭圆）
  ctx.fillStyle='rgba(120,165,210,.04)';
  ctx.beginPath(); ctx.ellipse(W*0.5,H*0.62,W*0.35,H*0.04,0,0,7); ctx.fill();

  // ── 不锈钢实验岛台（三座，3D 透视：顶面亮→侧面暗，圆角+高光边）
  const bench=(x,y,w,h,label)=>{
    // 台面（不锈钢亮面，水平渐变模拟光源反射）
    const topG=ctx.createLinearGradient(x,y,x+w,y);
    topG.addColorStop(0,'rgba(175,190,210,.40)'); topG.addColorStop(.5,'rgba(200,215,235,.46)');
    topG.addColorStop(1,'rgba(165,180,200,.36)');
    ctx.fillStyle=topG; rr(x,y,w,h*0.10,10); ctx.fill();
    // 台面前沿高光线
    ctx.strokeStyle='rgba(220,235,250,.48)'; ctx.lineWidth=1.2; rr(x,y,w,h*0.10,10); ctx.stroke();
    // 侧面（垂直暗梯度，营造厚度感）
    const sideG=ctx.createLinearGradient(0,y+h*0.10,0,y+h);
    sideG.addColorStop(0,'rgba(75,92,118,.58)'); sideG.addColorStop(.15,'rgba(58,75,98,.70)');
    sideG.addColorStop(1,'rgba(36,49,68,.85)');
    ctx.fillStyle=sideG;
    ctx.beginPath(); ctx.moveTo(x+10,y+h*0.10); ctx.lineTo(x+w-10,y+h*0.10);
    ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
    // 侧边轮廓
    ctx.strokeStyle='rgba(130,150,175,.20)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+10,y+h*0.10); ctx.lineTo(x,y+h); ctx.lineTo(x+w,y+h); ctx.lineTo(x+w-10,y+h*0.10); ctx.stroke();
    // 台面标签（小字，可选）
    if(label){
      ctx.fillStyle='rgba(160,175,195,.25)'; ctx.font='8px sans-serif'; ctx.textAlign='center';
      ctx.fillText(label,x+w/2,y+h*0.07); ctx.textAlign='left';
    }
  };
  bench(W*0.006, H*0.24, W*0.395, H*0.64, '合成前处理');
  bench(W*0.795, H*0.27, W*0.199, H*0.62, '表征分析');
  bench(W*0.385, H*0.51, W*0.41, H*0.39, '反应核心');

  // ── 实验室环境光（顶部中心柔和漫射，模拟荧光灯管）
  const amb=ctx.createRadialGradient(W*0.48,H*0.02,0,W*0.48,H*0.08,W*0.55);
  amb.addColorStop(0,'rgba(200,220,240,.07)'); amb.addColorStop(1,'rgba(200,220,240,0)');
  ctx.fillStyle=amb; ctx.fillRect(0,0,W,H*0.15);
  // 荧光灯管（天花板隐约可见的灯管轮廓）
  ctx.save(); ctx.globalAlpha=.04; ctx.fillStyle='#e0e8f0';
  for(let i=0;i<3;i++){
    const lx=W*(0.2+i*0.28), lw=W*0.18;
    rr(lx,2,lw,6,3); ctx.fill();
  } ctx.restore();
}

function drawPipes(){
  if(window.__simpleBg) return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const link=(a,b,col,thick=3)=>{const p=devCenter(a),q=devCenter(b);
    ctx.strokeStyle='rgba(94,231,223,.12)';ctx.lineWidth=thick+4;
    ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y+30);ctx.lineTo(q.x,q.y+30);ctx.lineTo(q.x,q.y+8);ctx.stroke();
    ctx.strokeStyle=col;ctx.lineWidth=thick;
    ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y+30);ctx.lineTo(q.x,q.y+30);ctx.lineTo(q.x,q.y+8);ctx.stroke();
  };
  link('gasfeed','reactor','#34d399',2.5);
  [['reactor','gc','#34d399'],['reactor','ms','#2dd4bf'],['reactor','drifts','#fb923c']].forEach(([a,b,c])=>{
    const p=devCenter(a),q=devCenter(b);
    ctx.strokeStyle='rgba(94,231,223,.10)';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(p.x,p.y+32);ctx.lineTo((p.x+q.x)/2,p.y+50);ctx.lineTo(q.x,q.y+30);ctx.stroke();
    ctx.strokeStyle=c;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(p.x,p.y+32);ctx.lineTo((p.x+q.x)/2,p.y+50);ctx.lineTo(q.x,q.y+30);ctx.stroke();
  });
  // AI 到中央的光纤
  const ai=devCenter('ai'), re=devCenter('reactor');
  ctx.strokeStyle='rgba(168,85,247,.25)';ctx.lineWidth=6;ctx.setLineDash([8,10]);
  ctx.beginPath();ctx.moveTo(ai.x,ai.y+20);ctx.lineTo(re.x,re.y-30);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(168,85,247,.55)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(ai.x,ai.y+20);ctx.lineTo(re.x,re.y-30);ctx.stroke();
  ctx.restore();
}

const DRAW={
  shelf(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(15,23,42,.9)';rr(x+8,y+8,w-16,h-16,8);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.25)';ctx.lineWidth=1.5;rr(x+8,y+8,w-16,h-16,8);ctx.stroke();
    const cols=['#f87171','#5ee7df','#34d399','#8b5cf6','#ffab40','#18ffff'];
    for(let i=0;i<7;i++){ctx.fillStyle=cols[i%6];ctx.shadowColor=cols[i%6];ctx.shadowBlur=8;ctx.fillRect(x+12+i*(w*0.055),y+14,w*0.04,h*0.28);ctx.shadowBlur=0;}
    ctx.fillStyle='rgba(94,231,223,.08)';rr(x+w*0.48,y+12,w*0.45,h*0.48,5);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.45)';ctx.lineWidth=1;rr(x+w*0.48,y+12,w*0.45,h*0.48,5);ctx.stroke();
    ctx.fillStyle='#5ee7df';ctx.font='bold 10px sans-serif';ctx.textAlign='center';
    ctx.fillText('KB',cx+w*0.08,y+28);ctx.font='8px sans-serif';ctx.fillStyle='#7eefff';ctx.fillText('84,682',cx+w*0.08,y+42);ctx.textAlign='left';
    ctx.fillStyle=on?'#34d399':'#5ee7df';ctx.beginPath();ctx.arc(x+w-18,y+18,3,0,7);ctx.fill();
  },
  glove(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(148,163,184,.12)';rr(x+8,y+8,w-16,h*0.68,10);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.35)';ctx.lineWidth=2;rr(x+8,y+8,w-16,h*0.68,10);ctx.stroke();
    ctx.fillStyle='rgba(94,231,223,.10)';ctx.beginPath();ctx.ellipse(cx,y+h*0.34,w*0.28,h*0.18,0,0,7);ctx.fill();
    ctx.fillStyle='#334155';ctx.beginPath();ctx.arc(x+w*0.32,y+h*0.55,7,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(x+w*0.68,y+h*0.55,7,0,7);ctx.fill();
    ctx.strokeStyle='#64748b';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+w*0.32,y+h*0.55);ctx.lineTo(x+w*0.32,y+h*0.68);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+w*0.68,y+h*0.55);ctx.lineTo(x+w*0.68,y+h*0.68);ctx.stroke();
    ctx.fillStyle=on?'#34d399':'#f87171';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(cx,y+h*0.82,4,0,7);ctx.fill();ctx.shadowBlur=0;
  },
  server(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(15,23,42,.95)';rr(x+10,y+6,w-20,h*0.62,6);ctx.fill();
    ctx.strokeStyle='rgba(168,85,247,.45)';ctx.lineWidth=2;rr(x+10,y+6,w-20,h*0.62,6);ctx.stroke();
    for(let i=0;i<5;i++){
      const lit=on&&Math.sin(performance.now()/200+i)>0;
      ctx.fillStyle=lit?'#34d399':'#1e293b';
      ctx.shadowColor=lit?'#34d399':'transparent';ctx.shadowBlur=lit?8:0;
      ctx.beginPath();ctx.arc(x+22+i*(w*0.1),y+22,3,0,7);ctx.fill();ctx.shadowBlur=0;
    }
    ctx.strokeStyle='rgba(168,85,247,.6)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+18,y+48);ctx.lineTo(cx,y+38);ctx.lineTo(x+w-18,y+50);ctx.stroke();
    ctx.fillStyle='#d8b4fe';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('AI',cx,y+h*0.78);ctx.textAlign='left';
    if(on){const t=performance.now()/250;ctx.strokeStyle='rgba(168,85,247,.5)';ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx,y+h*0.68,8+i*5+Math.sin(t+i)*2,0,7);ctx.stroke();}}
  },
  robot(d,x,y,w,h,cx,on){
    const t=performance.now()/500,sw=on?Math.sin(t)*0.45:0;
    ctx.fillStyle='#334155';rr(x+w*0.25,y+h*0.74,w*0.5,h*0.16,5);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.4)';ctx.lineWidth=1.5;rr(x+w*0.25,y+h*0.74,w*0.5,h*0.16,5);ctx.stroke();
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(cx,y+h*0.82);ctx.lineTo(cx,y+h*0.48);
    ctx.lineTo(cx+Math.cos(sw)*w*0.28,y+h*0.26);ctx.stroke();
    ctx.fillStyle='#5ee7df';ctx.shadowColor='#5ee7df';ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(cx,y+h*0.48,5,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(cx+Math.cos(sw)*w*0.28,y+h*0.26,4,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#cbd5e1';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(sw)*w*0.28,y+h*0.26);ctx.lineTo(cx+Math.cos(sw)*w*0.28-6,y+h*0.18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+Math.cos(sw)*w*0.28,y+h*0.26);ctx.lineTo(cx+Math.cos(sw)*w*0.28+6,y+h*0.18);ctx.stroke();
  },
  xrd(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+w*0.32,y+10,w*0.36,h*0.18,4);ctx.fill();
    ctx.fillStyle='#facc15';ctx.shadowColor='#facc15';ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(cx,y+h*0.32,5,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle=on?'#22d3ee':'#475569';ctx.lineWidth=3;
    const ang=performance.now()/800;
    ctx.beginPath();ctx.arc(cx,y+h*0.32,w*0.22,Math.PI*0.2+ang*0.3,Math.PI*0.8+ang*0.3);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,y+h*0.32,w*0.22+10,Math.PI*0.2-ang*0.3,Math.PI*0.8-ang*0.3);ctx.stroke();
    ctx.fillStyle='#1e293b';rr(x+w*0.35,y+h*0.62,w*0.3,h*0.1,3);ctx.fill();
  },
  balance(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(51,65,85,.9)';rr(x+w*0.12,y+h*0.52,w*0.76,h*0.12,4);ctx.fill();
    ctx.strokeStyle='rgba(148,163,184,.3)';ctx.lineWidth=1;rr(x+w*0.12,y+h*0.52,w*0.76,h*0.12,4);ctx.stroke();
    ctx.fillStyle='#cbd5e1';ctx.beginPath();ctx.ellipse(cx,y+h*0.42,w*0.16,h*0.05,0,0,7);ctx.fill();
    ctx.strokeStyle='#64748b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,y+h*0.42);ctx.lineTo(cx,y+h*0.52);ctx.stroke();
    ctx.fillStyle='#020617';rr(x+w*0.28,y+12,w*0.44,h*0.22,4);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.35)';ctx.lineWidth=1;rr(x+w*0.28,y+12,w*0.44,h*0.22,4);ctx.stroke();
    ctx.fillStyle='#5ee7df';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('0.0523g',cx,y+27);ctx.textAlign='left';
  },
  sonic(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+8,y+h*0.42,w-16,h*0.5,8);ctx.fill();
    ctx.strokeStyle='rgba(6,182,212,.4)';ctx.lineWidth=1.5;rr(x+8,y+h*0.42,w-16,h*0.5,8);ctx.stroke();
    const wg=ctx.createLinearGradient(0,y+h*0.5,0,y+h*0.88);wg.addColorStop(0,'rgba(6,182,212,.35)');wg.addColorStop(1,'rgba(6,182,212,.15)');
    ctx.fillStyle=wg;rr(x+12,y+h*0.5,w-24,h*0.38,5);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(cx,y+h*0.62,w*0.12,h*0.08,0,0,7);ctx.fill();
    if(on){ctx.strokeStyle='rgba(94,231,223,.7)';ctx.lineWidth=1.5;const t=performance.now()/180;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx,y+h*0.66,3+i*5+(Math.sin(t+i)*2),Math.PI*1.1,Math.PI*1.9);ctx.stroke();}}
  },
  stir(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+8,y+h*0.58,w-16,h*0.3,6);ctx.fill();
    ctx.strokeStyle='rgba(96,165,250,.35)';ctx.lineWidth=1.5;rr(x+8,y+h*0.58,w-16,h*0.3,6);ctx.stroke();
    ctx.fillStyle='#0f172a';rr(x+12,y+h*0.62,w-24,h*0.12,3);ctx.fill();
    ctx.fillStyle='rgba(147,197,253,.25)';ctx.beginPath();ctx.arc(cx,y+h*0.38,w*0.15,0,7);ctx.fill();
    ctx.strokeStyle='rgba(147,197,253,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,y+h*0.38,w*0.15,0,7);ctx.stroke();
    ctx.fillStyle='rgba(147,197,253,.35)';ctx.fillRect(cx-4,y+h*0.18,8,h*0.18);
    if(on){ctx.save();ctx.translate(cx,y+h*0.58);ctx.rotate(performance.now()/90);ctx.fillStyle='#5ee7df';ctx.shadowColor='#5ee7df';ctx.shadowBlur=8;rr(-7,-2,14,4,2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}
  },
  furnace(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.95)';rr(x+6,y+6,w-12,h*0.7,8);ctx.fill();
    ctx.strokeStyle='rgba(249,115,22,.35)';ctx.lineWidth=2;rr(x+6,y+6,w-12,h*0.7,8);ctx.stroke();
    const glow=on?(0.75+0.25*Math.sin(performance.now()/150)):0.35;
    ctx.fillStyle='#1e293b';rr(x+w*0.18,y+h*0.24,w*0.64,h*0.38,5);ctx.fill();
    ctx.fillStyle='rgba(249,115,22,'+glow+')';ctx.shadowColor='#fb923c';ctx.shadowBlur=on?16:0;
    rr(x+w*0.24,y+h*0.30,w*0.52,h*0.26,4);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(249,115,22,.25)';ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+w*0.30,y+h*0.14-i*5);ctx.lineTo(x+w*0.70,y+h*0.14-i*5);ctx.stroke();}
    ctx.fillStyle='#fb923c';ctx.beginPath();ctx.arc(cx,y+h*0.82,4,0,7);ctx.fill();
  },
  tube(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+6,y+h*0.36,w-12,h*0.22,8);ctx.fill();
    ctx.strokeStyle='rgba(245,158,11,.35)';ctx.lineWidth=2;rr(x+6,y+h*0.36,w-12,h*0.22,8);ctx.stroke();
    ctx.fillStyle='rgba(203,213,225,.15)';rr(x+w*0.10,y+h*0.40,w*0.80,h*0.14,6);ctx.fill();
    const g=on?(0.6+0.4*Math.sin(performance.now()/180)):0.25;
    ctx.fillStyle='rgba(245,158,11,'+g+')';ctx.shadowColor='#f59e0b';ctx.shadowBlur=on?12:0;
    rr(x+w*0.28,y+h*0.39,w*0.44,h*0.16,5);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#475569';ctx.fillRect(x+w*0.08,y+h*0.40,w*0.05,h*0.14);ctx.fillRect(x+w*0.87,y+h*0.40,w*0.05,h*0.14);
  },
  voven(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+6,y+8,w-12,h*0.68,8);ctx.fill();
    ctx.strokeStyle='rgba(139,92,246,.4)';ctx.lineWidth=2;rr(x+6,y+8,w-12,h*0.68,8);ctx.stroke();
    ctx.fillStyle='rgba(15,23,42,.8)';rr(x+w*0.18,y+h*0.22,w*0.64,h*0.38,5);ctx.fill();
    ctx.strokeStyle='rgba(139,92,246,.35)';ctx.lineWidth=1.5;rr(x+w*0.18,y+h*0.22,w*0.64,h*0.38,5);ctx.stroke();
    ctx.strokeStyle='rgba(139,92,246,.6)';ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<4;i++){const yy=y+h*(0.30+i*0.08);ctx.moveTo(x+w*0.24,yy);ctx.lineTo(x+w*0.76,yy);}ctx.stroke();
    ctx.fillStyle=on?'#34d399':'#8b5cf6';ctx.beginPath();ctx.arc(cx,y+h*0.82,4,0,7);ctx.fill();
  },
  gas(d,x,y,w,h,cx,on){
    const t=performance.now()/1000;
    ctx.fillStyle='#e2e8f0';rr(x+w*0.12,y+h*0.32,w*0.22,h*0.58,8);ctx.fill();
    ctx.fillStyle='#f87171';rr(x+w*0.12,y+h*0.32,w*0.22,h*0.18,8);ctx.fill();
    ctx.fillStyle='#5ee7df';rr(x+w*0.56,y+h*0.32,w*0.22,h*0.58,8);ctx.fill();
    ctx.fillStyle='#0284c7';rr(x+w*0.56,y+h*0.32,w*0.22,h*0.18,8);ctx.fill();
    ctx.strokeStyle='rgba(148,163,184,.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+w*0.23,y+h*0.30);ctx.lineTo(x+w*0.23,y+h*0.16);ctx.lineTo(cx,y+h*0.16);ctx.lineTo(cx,y+h*0.12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+w*0.67,y+h*0.30);ctx.lineTo(x+w*0.67,y+h*0.16);ctx.lineTo(cx,y+h*0.16);ctx.stroke();
    ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(cx,y+h*0.22,7,0,7);ctx.fill();
    ctx.strokeStyle='#5ee7df';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,y+h*0.22,7,0,7);ctx.stroke();
    ctx.save();ctx.translate(cx,y+h*0.22);ctx.rotate(Math.sin(t)*0.5);ctx.strokeStyle='#5ee7df';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-5);ctx.stroke();ctx.restore();
    if(on){ctx.fillStyle='#34d399';ctx.shadowColor='#34d399';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(cx,y+h*0.10,3,0,7);ctx.fill();ctx.shadowBlur=0;}
  },
  reactor(d,x,y,w,h,cx,on){
    const topY=y+6, bodyH=h*0.72, baseH=h*0.12;
    ctx.fillStyle='rgba(15,23,42,.95)';rr(x+w*0.25,y+bodyH,w*0.5,baseH,5);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.4)';ctx.lineWidth=2;rr(x+w*0.25,y+bodyH,w*0.5,baseH,5);ctx.stroke();
    ctx.fillStyle='rgba(94,231,223,.08)';rr(x+w*0.22,y+topY+h*0.15,w*0.56,bodyH*0.75,12);ctx.fill();
    ctx.strokeStyle='rgba(94,231,223,.5)';ctx.lineWidth=2;rr(x+w*0.22,y+topY+h*0.15,w*0.56,bodyH*0.75,12);ctx.stroke();
    const liq=on?0.68:0.52;
    ctx.fillStyle='rgba(6,182,212,.35)';rr(x+w*0.22,y+topY+h*0.15+bodyH*0.75*(1-liq),w*0.56,bodyH*0.75*liq,12);ctx.fill();
    const lg=ctx.createRadialGradient(cx,topY+12,1,cx,topY+12,18);lg.addColorStop(0,'#ffffff');lg.addColorStop(.4,'#facc15');lg.addColorStop(1,'rgba(250,204,21,0)');
    ctx.fillStyle=lg;ctx.beginPath();ctx.arc(cx,topY+12,16,0,7);ctx.fill();
    // 光源（氙灯/LED）—— 光催化特征：常亮，工作时增强
    ctx.fillStyle='#1e293b';ctx.strokeStyle='rgba(250,204,21,.6)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-10,topY-2);ctx.lineTo(cx+10,topY-2);ctx.lineTo(cx+6,topY-12);ctx.lineTo(cx-6,topY-12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=on?'#facc15':'#64748b';ctx.beginPath();ctx.arc(cx,topY-14,3,0,7);ctx.fill();
    ctx.fillStyle=on?'rgba(250,204,21,.18)':'rgba(250,204,21,.05)';ctx.beginPath();ctx.moveTo(cx,topY+20);ctx.lineTo(x+w*0.18,y+bodyH*0.92);ctx.lineTo(x+w*0.82,y+bodyH*0.92);ctx.closePath();ctx.fill();
    if(on){ctx.fillStyle='rgba(255,255,255,.75)';const t=performance.now()/500;
      for(let i=0;i<5;i++){const bx=x+w*(0.32+0.09*i),by=y+bodyH*(0.82-((t+i*0.2)%1)*0.35);ctx.beginPath();ctx.arc(bx,by,2.5,0,7);ctx.fill();}}
    ctx.strokeStyle=on?'#34d399':'#5ee7df';ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(cx,y+bodyH*0.52,w*0.18,0,7);ctx.stroke();ctx.setLineDash([]);
  },
  centri(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+8,y+8,w-16,h*0.62,8);ctx.fill();
    ctx.strokeStyle='rgba(217,70,239,.4)';ctx.lineWidth=2;rr(x+8,y+8,w-16,h*0.62,8);ctx.stroke();
    ctx.fillStyle='#e2e8f0';ctx.beginPath();ctx.arc(cx,y+h*0.42,h*0.18,0,7);ctx.fill();
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,y+h*0.42,h*0.18,0,7);ctx.stroke();
    if(on){ctx.save();ctx.translate(cx,y+h*0.42);ctx.rotate(performance.now()/80);ctx.fillStyle='#c084fc';ctx.shadowColor='#c084fc';ctx.shadowBlur=10;
      for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(-3,-h*0.14,w*0.10,h*0.08);}ctx.shadowBlur=0;ctx.restore();}
    else{ctx.fillStyle='#c084fc';ctx.beginPath();ctx.arc(cx,y+h*0.42,h*0.06,0,7);ctx.fill();}
  },
  gc(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(15,23,42,.95)';rr(x+6,y+8,w-12,h*0.42,5);ctx.fill();
    ctx.strokeStyle='rgba(52,211,153,.35)';ctx.lineWidth=2;rr(x+6,y+8,w-12,h*0.42,5);ctx.stroke();
    ctx.fillStyle='#020617';rr(x+12,y+14,w-24,h*0.22,3);ctx.fill();
    ctx.strokeStyle='rgba(52,211,153,.5)';ctx.lineWidth=1;rr(x+12,y+14,w-24,h*0.22,3);ctx.stroke();
    ctx.strokeStyle='#34d399';ctx.lineWidth=2;ctx.beginPath();
    const amp=on?1:0.35,ph=performance.now()/250;
    for(let i=0;i<=30;i++){const px=x+10+(w-20)*i/30;const py=y+h*0.28-Math.abs(Math.sin(i*0.8+ph))*h*0.12*amp;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
    ctx.strokeStyle='rgba(52,211,153,.25)';ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(x+10,y+h*0.62);ctx.lineTo(x+w-10,y+h*0.62);ctx.lineTo(x+w-10,y+h*0.82);ctx.lineTo(x+10,y+h*0.82);ctx.stroke();
  },
  ms(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(15,23,42,.95)';rr(x+6,y+h*0.18,w-12,h*0.62,6);ctx.fill();
    ctx.strokeStyle='rgba(45,212,191,.35)';ctx.lineWidth=2;rr(x+6,y+h*0.18,w-12,h*0.62,6);ctx.stroke();
    ctx.fillStyle='#020617';ctx.beginPath();ctx.arc(cx,y+h*0.40,h*0.12,0,7);ctx.fill();
    ctx.strokeStyle='#2dd4bf';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,y+h*0.40,h*0.12,0,7);ctx.stroke();
    ctx.fillStyle='#2dd4bf';ctx.beginPath();ctx.arc(cx,y+h*0.40,3,0,7);ctx.fill();
    ctx.fillStyle=on?'#2dd4bf':'#475569';const bs=[0.5,0.85,0.4,1,0.6,0.35];
    for(let i=0;i<bs.length;i++){const bh=h*0.20*bs[i]*(on?1:0.45);ctx.fillRect(x+8+i*((w-18)/6),y+h*0.82-bh,(w-18)/6-2,bh);}
  },
  drifts(d,x,y,w,h,cx,on){
    ctx.fillStyle='rgba(30,41,59,.9)';rr(x+w*0.35,y+10,w*0.3,h*0.18,4);ctx.fill();
    if(on){ctx.strokeStyle='rgba(251,146,60,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,y+24);ctx.lineTo(cx,y+h*0.42);ctx.stroke();}
    ctx.fillStyle='#1e293b';rr(x+w*0.32,y+h*0.42,w*0.36,h*0.16,4);ctx.fill();
    ctx.strokeStyle='rgba(251,146,60,.4)';ctx.lineWidth=1.5;rr(x+w*0.32,y+h*0.42,w*0.36,h*0.16,4);ctx.stroke();
    ctx.strokeStyle='#fb923c';ctx.lineWidth=1.5;ctx.beginPath();
    const ph=performance.now()/400;
    for(let i=0;i<=24;i++){const px=x+8+(w-16)*i/24;const py=y+h*0.76-Math.abs(Math.sin(i*1.0+ph))*h*0.10*(on?1:0.35);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
  },
  /* ===== 新增表征设备绘制（3D 具象化）===== */
  uvvis(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+6,y+6,w-12,h*0.55,6); ctx.fill();
    ctx.strokeStyle='rgba(96,165,250,.35)'; ctx.lineWidth=1.5; rr(x+6,y+6,w-12,h*0.55,6); ctx.stroke();
    const sg=ctx.createRadialGradient(x+w*0.72,y+h*0.28,2,x+w*0.72,y+h*0.28,14);
    sg.addColorStop(0,'rgba(148,210,255,.25)'); sg.addColorStop(1,'rgba(96,165,250,.08)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(x+w*0.72,y+h*0.28,12,0,7); ctx.fill();
    ctx.strokeStyle='rgba(96,165,250,.5)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x+w*0.72,y+h*0.28,12,0,7); ctx.stroke();
    ctx.fillStyle=on?'rgba(96,165,250,.20)':'rgba(30,41,59,.6)';
    rr(x+w*0.10,y+h*0.22,w*0.25,h*0.18,3); ctx.fill();
    ctx.strokeStyle='rgba(96,165,250,.4)'; ctx.lineWidth=1; rr(x+w*0.10,y+h*0.22,w*0.25,h*0.18,3); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(96,165,250,.6)'; ctx.lineWidth=1.5;
      const t=performance.now()/600;
      for(let i=0;i<20;i++){ const px=x+10+i*(w-20)/20, py=y+h*0.68-Math.exp(-Math.pow((i-10+t%10)/5,2))*h*0.15;
        i?ctx.lineTo(px,py):ctx.moveTo(px,px);} ctx.stroke();
    }
    ctx.fillStyle='#0a0f1a'; rr(x+w*0.08,y+h*0.70,w*0.50,h*0.14,3); ctx.fill();
    ctx.fillStyle=on?'#60a5fa':'#475569'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'λ=420nm Eg=2.95eV':'---',cx,y+h*0.80); ctx.textAlign='left';
  },
  atr(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.58,5); ctx.fill();
    ctx.strokeStyle='rgba(244,114,182,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.58,5); ctx.stroke();
    ctx.save(); ctx.translate(cx,y+h*0.32); ctx.rotate(Math.PI/4);
    const cg=ctx.createLinearGradient(-8,-8,8,8); cg.addColorStop(0,'rgba(244,114,182,.30)'); cg.addColorStop(1,'rgba(244,114,182,.10)');
    ctx.fillStyle=cg; rr(-8,-8,16,16,2); ctx.fill(); ctx.strokeStyle='rgba(244,114,182,.55)'; ctx.lineWidth=1.5; rr(-8,-8,16,16,2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle=on?'#f472b6':'#475569'; ctx.shadowColor=on?'#f472b6':'transparent'; ctx.shadowBlur=on?8:0;
    ctx.beginPath(); ctx.arc(x+w*0.18,y+14,3,0,7); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#0a0f1a'; rr(x+4,y+h*0.66,w-8,h*0.14,2); ctx.fill();
    ctx.fillStyle='#f472b6'; ctx.font='7px monospace'; ctx.textAlign='center';
    ctx.fillText('ATR 1620cm⁻¹',cx,y+h*0.75); ctx.textAlign='left';
  },
  fluor(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.54,5); ctx.fill();
    ctx.strokeStyle='rgba(163,230,53,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.54,5); ctx.stroke();
    ctx.fillStyle=on?'rgba(163,230,53,.15)':'rgba(30,41,59,.5)';
    ctx.beginPath(); ctx.ellipse(cx,y+h*0.34,w*0.26,h*0.16,0,0,7); ctx.fill();
    ctx.strokeStyle='rgba(163,230,53,.45)'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(cx,y+h*0.34,w*0.26,h*0.16,0,0,7); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(163,230,53,.5)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x+10,y+h*0.22); ctx.lineTo(cx-6,y+h*0.30); ctx.stroke();
      ctx.strokeStyle='rgba(163,230,53,.35)';
      ctx.beginPath(); ctx.moveTo(cx+6,y+h*0.30); ctx.lineTo(x+w-10,y+h*0.20); ctx.stroke();
      ctx.fillStyle='rgba(163,230,53,'+(0.15+0.1*Math.sin(performance.now()/300))+')';
      ctx.beginPath(); ctx.arc(cx,y+h*0.34,5,0,7); ctx.fill();
    }
    ctx.fillStyle='#0f172a'; rr(x+w*0.62,y+h*0.14,w*0.28,h*0.12,2); ctx.fill();
    ctx.fillStyle=on?'#34d399':'#475569'; ctx.font='7px sans-serif'; ctx.textAlign='center';
    ctx.fillText('PMT',x+w*0.76,y+h*0.22); ctx.textAlign='left';
  },
  lifetime(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.52,5); ctx.fill();
    ctx.strokeStyle='rgba(192,132,252,.40)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.52,5); ctx.stroke();
    ctx.fillStyle='#0f172a'; rr(x+6,y+10,w*0.28,h*0.20,3); ctx.fill();
    ctx.fillStyle=on?'#c084fc':'#475569'; ctx.shadowColor=on?'#c084fc':'transparent'; ctx.shadowBlur=on?10:0;
    ctx.beginPath(); ctx.arc(x+w*0.20,y+20,3,0,7); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=on?'rgba(192,132,252,.50)':'rgba(192,132,252,.15)'; ctx.lineWidth=1.2;
    for(let i=0;i<4;i++){
      const sy=y+18+i*8, dir=i%2===0?1:-1;
      ctx.beginPath(); ctx.moveTo(x+w*0.36,sy); ctx.lineTo(x+w*0.36+dir*w*0.40,sy); ctx.stroke();
      if(i<3){ ctx.beginPath(); ctx.moveTo(x+w*0.36+dir*w*0.40,sy); ctx.lineTo(x+w*0.36+dir*w*0.40,sy+8); ctx.stroke(); }
    }
    ctx.fillStyle='#0a0f1a'; rr(x+4,y+h*0.60,w-8,h*0.14,2); ctx.fill();
    ctx.fillStyle='#c084fc'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'τ=4.5ns / 18ns':'---',cx,y+h*0.70); ctx.textAlign='left';
  },
  bet(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.54,5); ctx.fill();
    ctx.strokeStyle='rgba(251,191,36,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.54,5); ctx.stroke();
    ctx.fillStyle=on?'rgba(251,191,36,.20)':'rgba(30,41,59,.4)';
    rr(x+8,y+10,w*0.30,h*0.16,3); ctx.fill();
    ctx.strokeStyle='rgba(251,191,36,.45)'; ctx.lineWidth=1; rr(x+8,y+10,w*0.30,h*0.16,3); ctx.stroke();
    ctx.fillStyle='rgba(100,180,255,.12)'; ctx.beginPath();
    ctx.ellipse(x+w*0.68,y+h*0.38,w*0.14,h*0.10,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.68,y+h*0.54,w*0.14,h*0.06,0,0,7); ctx.fill();
    ctx.fillRect(x+w*0.54,y+h*0.38,w*0.28,h*0.16);
    ctx.strokeStyle='rgba(100,180,255,.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(x+w*0.68,y+h*0.38,w*0.14,h*0.10,0,0,7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x+w*0.68,y+h*0.54,w*0.14,h*0.06,0,0,7); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(251,191,36,.5)'; ctx.lineWidth=1.2;
      const t=performance.now()/800;
      for(let i=0;i<15;i++){ const px=x+8+i*(w-16)/14, py=y+h*0.72-(0.5/(1+Math.exp(-(i-7+t%8)/2)))*h*0.10;
        i?ctx.lineTo(px,py):ctx.moveTo(px,px);} ctx.stroke();
    }
    ctx.fillStyle='#fbbf24'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
    ctx.fillText('85m²/g',cx,y+h*0.82); ctx.textAlign='left';
  },
  tem(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+6,y+4,w-12,h*0.56,6); ctx.fill();
    ctx.strokeStyle='rgba(232,121,249,.35)'; ctx.lineWidth=1.5; rr(x+6,y+4,w-12,h*0.56,6); ctx.stroke();
    const colG=ctx.createLinearGradient(cx-w*0.12,0,cx+w*0.12,0);
    colG.addColorStop(0,'#334155'); colG.addColorStop(.5,'#1e293b'); colG.addColorStop(1,'#334155');
    ctx.fillStyle=colG; rr(cx-w*0.12,y+8,w*0.24,h*0.42,4); ctx.fill();
    ctx.strokeStyle='rgba(232,121,249,.4)'; ctx.lineWidth=1; rr(cx-w*0.12,y+8,w*0.24,h*0.42,4); ctx.stroke();
    ctx.fillStyle=on?'#c084fc':'#475569'; ctx.shadowColor=on?'#c084fc':'transparent'; ctx.shadowBlur=on?8:0;
    ctx.beginPath(); ctx.arc(cx,y+14,3,0,7); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#0a0f1a'; rr(x+w*0.10,y+h*0.56,w*0.80,h*0.16,2); ctx.fill();
    if(on){ ctx.strokeStyle='rgba(232,121,249,.5)'; ctx.lineWidth=.8;
      for(let i=0;i<8;i++) { const ly=y+h*0.60+i*2; ctx.beginPath(); ctx.moveTo(x+w*0.15,ly); ctx.lineTo(x+w*0.85,ly); ctx.stroke(); }
      for(let i=0;i<12;i++){ const lx=x+w*0.18+i*(w*0.64)/11; ctx.beginPath(); ctx.moveTo(lx,y+h*0.58); ctx.lineTo(lx+3,y+h*0.72); ctx.stroke(); }
    }
    ctx.fillStyle='#c084fc'; ctx.font='7px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'d=0.85nm':'---',cx,y+h*0.78); ctx.textAlign='left';
  },
  synch(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.52,5); ctx.fill();
    ctx.strokeStyle='rgba(251,146,60,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.52,5); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(251,146,60,.5)'; ctx.lineWidth=2; ctx.shadowColor='#fb923c'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(x+4,y+8); ctx.lineTo(cx,y+h*0.30); ctx.stroke(); ctx.shadowBlur=0;
    }
    ctx.fillStyle='#0f172a'; ctx.beginPath(); ctx.arc(cx,y+h*0.34,8,0,7); ctx.fill();
    ctx.strokeStyle='rgba(251,146,60,.5)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx,y+h*0.34,8,0,7); ctx.stroke();
    if(on){ const rt=performance.now()/1500; ctx.save(); ctx.translate(cx,y+h*0.34); ctx.rotate(rt);
      ctx.strokeStyle='rgba(251,146,60,.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(5,0); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle='#0f172a'; rr(x+w*0.58,y+h*0.20,w*0.32,h*0.22,3); ctx.fill();
    ctx.strokeStyle='rgba(251,146,60,.35)'; ctx.lineWidth=1; rr(x+w*0.58,y+h*0.20,w*0.32,h*0.22,3); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(251,146,60,.55)'; ctx.lineWidth=1.2;
      const st=performance.now()/1200;
      for(let i=0;i<20;i++){ const px=x+8+i*(w-16)/20, base=h*0.70, edge=(i>9&&i<13)?h*0.08:0, osc=Math.sin((i+st%10)*0.8)*h*0.02*(i>8&&i<14?1:0.3);
        const py=y+base-edge-osc; i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.stroke();
    }
    ctx.fillStyle='#fb923c'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'Pd²⁺ CN=4.5':'---',cx,y+h*0.82); ctx.textAlign='left';
  },
  photocurr(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.52,5); ctx.fill();
    ctx.strokeStyle='rgba(34,211,238,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.52,5); ctx.stroke();
    ctx.fillStyle='#0f172a'; rr(x+6,y+8,w*0.38,h*0.36,3); ctx.fill();
    ctx.strokeStyle='rgba(34,211,238,.25)'; ctx.lineWidth=1; rr(x+6,y+8,w*0.38,h*0.36,3); ctx.stroke();
    ctx.fillStyle='#22d3ee'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'45μA/cm²':'---',x+w*0.25,y+26); ctx.fillText(on?'1.25kΩ':'---',x+w*0.25,y+38); ctx.textAlign='left';
    ctx.fillStyle=on?'rgba(34,211,238,.12)':'rgba(30,41,59,.4)';
    ctx.beginPath(); ctx.ellipse(x+w*0.68,y+h*0.32,w*0.22,h*0.18,0,0,7); ctx.fill();
    ctx.strokeStyle='rgba(34,211,238,.45)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.ellipse(x+w*0.68,y+h*0.32,w*0.22,h*0.18,0,0,7); ctx.stroke();
    ctx.fillStyle='#f87171'; ctx.fillRect(x+w*0.64,y+h*0.22,3,h*0.20);
    if(on){ ctx.fillStyle='rgba(34,211,238,.5)';
      ctx.beginPath(); ctx.moveTo(x+w*0.68,y+8); ctx.lineTo(x+w*0.65,y+16); ctx.lineTo(x+w*0.71,y+16); ctx.closePath(); ctx.fill(); }
  },
  xps(d,x,y,w,h,cx,on){
    ctx.fillStyle='#1e293b'; rr(x+4,y+4,w-8,h*0.50,5); ctx.fill();
    ctx.strokeStyle='rgba(239,68,68,.35)'; ctx.lineWidth=1.5; rr(x+4,y+4,w-8,h*0.50,5); ctx.stroke();
    ctx.fillStyle='#0a0f1a'; ctx.beginPath(); ctx.arc(cx,y+h*0.30,10,0,7); ctx.fill();
    ctx.strokeStyle='rgba(239,68,68,.4)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(cx,y+h*0.30,10,0,7); ctx.stroke();
    ctx.fillStyle=on?'#f87171':'#475569'; ctx.shadowColor=on?'#f87171':'transparent'; ctx.shadowBlur=on?6:0;
    ctx.beginPath(); ctx.arc(x+w*0.22,y+14,3,0,7); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#0f172a'; ctx.beginPath();
    ctx.ellipse(x+w*0.74,y+h*0.28,w*0.16,h*0.14,0.3,0,7); ctx.fill();
    ctx.strokeStyle='rgba(239,68,68,.3)'; ctx.lineWidth=1; ctx.beginPath();
    ctx.ellipse(x+w*0.74,y+h*0.28,w*0.16,h*0.14,0.3,0,7); ctx.stroke();
    if(on){ ctx.strokeStyle='rgba(239,68,68,.45)'; ctx.lineWidth=.8;
      const sp=performance.now()/1000;
      for(let i=0;i<25;i++){ const px=x+6+i*(w-12)/24, py=y+h*0.62-(i<6?0:i<10?(i-6)*h*0.04:(14-i)*h*0.03)*Math.max(0,1-(i-12)*(i-12)/80);
        i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.stroke();
    }
    ctx.fillStyle='#f87171'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText(on?'O1s/C1s=28at%':'---',cx,y+h*0.78); ctx.textAlign='left';
  }
};

function drawDevice(d){
  const x=d.x*W,y=d.y*H,w=d.w*W,h=d.h*H;
  const active=activeDevice===d.key, sel=selectedDevice===d.key;
  // ── 台面投影（更柔和的接地阴影）
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x+w/2,y+h+3,w*0.40,5,0,0,7);ctx.fill();
  // ── 设备卡片底板（浅色毛玻璃质感）
  ctx.fillStyle='rgba(255,255,255,.92)';rr(x+4,y+4,w-8,h-4,14);ctx.fill();
  // 渐变填充（active 时提亮，整体过渡更柔和去霓虹感）
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0, shade(d.color,active?22:14));
  g.addColorStop(.5, d.color);
  g.addColorStop(1, shade(d.color,-16));
  ctx.fillStyle=g;rr(x+5,y+5,w-10,h-6,13);ctx.fill();
  // ── 顶部高光条（玻璃反光感）
  ctx.fillStyle='rgba(255,255,255,.32)';rr(x+6,y+6,w-12,h*0.16,10);ctx.fill();
  // ── 底部微光
  ctx.fillStyle='rgba(15,23,42,.04)';rr(x+6,y+h*0.56,w-12,h*0.32,8);ctx.fill();
  // ── 边框（active = 蓝色发光，sel = 绿色，默认 = 浅灰）
  const borderCol=active?'rgba(14,165,233,.55)':sel?'rgba(16,185,129,.45)':'rgba(148,163,184,.4)';
  const borderLw=active?2:sel?1.8:1;
  ctx.strokeStyle=borderCol; ctx.lineWidth=borderLw;
  if(active){ ctx.shadowColor='#0ea5e9'; ctx.shadowBlur=14; }
  else if(sel){ ctx.shadowColor='#10b981'; ctx.shadowBlur=10; }
  rr(x+4,y+4,w-8,h-4,14);ctx.stroke();ctx.shadowBlur=0;
  const cx=x+w/2;
  (DRAW[d.type]||function(){})(d,x,y,w,h,cx,active);
  // ── 选中虚线框（更精致）
  if(sel){ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(16,185,129,.50)';ctx.lineWidth=1.8;ctx.shadowColor='#10b981';ctx.shadowBlur=6;rr(x-2,y-2,w+4,h+2,16);ctx.stroke();ctx.shadowBlur=0;ctx.restore();}
  // ── 设备名标签（浅色底 + 毛玻璃效果）
  const nameBgH=16;
  ctx.fillStyle='rgba(248,250,252,.9)';rr(x+6,y+h-nameBgH-4,w-12,nameBgH,5);ctx.fill();
  ctx.fillStyle=active?'#0ea5e9':sel?'#10b981':'#334155';
  ctx.font='bold 9px -apple-system,"SF Pro Text","PingFang SC",sans-serif';ctx.textAlign='center';
  const displayName=d.name.length>9?d.name.slice(0,8)+'…':d.name;
  ctx.fillText(displayName,cx,y+h-7);ctx.textAlign='left';
}

function drawCharacter(){
  const cx=char.x, t=performance.now()/1000;
  const moving=Math.hypot(char.vx,char.vy)>0.25;
  const dir=char.dir||'down';
  const phase=moving?char.walkPhase:t*2;
  const bob=moving?Math.abs(Math.sin(phase))*3:Math.sin(t*2)*1.5;
  const cy=char.y-bob;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(cx,char.y+3,20,7,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(94,231,223,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,char.y+3,20,7,0,0,7);ctx.stroke();
  const ls=moving?Math.sin(phase)*6:0;
  ctx.strokeStyle='#94a3b8';ctx.lineWidth=5;ctx.lineCap='round';
  if(dir==='up'){
    ctx.beginPath();ctx.moveTo(cx-4,cy+16);ctx.lineTo(cx-6,cy+32);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+4,cy+16);ctx.lineTo(cx+6,cy+32);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(cx-5,cy+16);ctx.lineTo(cx-5+ls,cy+32);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+5,cy+16);ctx.lineTo(cx+5-ls,cy+32);ctx.stroke();
  }
  const cg=ctx.createLinearGradient(cx-14,cy,cx+14,cy+24);
  cg.addColorStop(0,'#ffffff');cg.addColorStop(1,'#cbd5e1');
  ctx.fillStyle=cg;rr(cx-14,cy-6,28,24,9);ctx.fill();
  ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;rr(cx-14,cy-6,28,24,9);ctx.stroke();
  const as=moving?Math.sin(phase)*5:Math.sin(t*2)*2;
  ctx.strokeStyle='#f8fafc';ctx.lineWidth=5;ctx.lineCap='round';
  if(dir==='up'){
    ctx.beginPath();ctx.moveTo(cx-12,cy);ctx.lineTo(cx-15,cy+14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+12,cy);ctx.lineTo(cx+15,cy+14);ctx.stroke();
  }else if(dir==='left'||dir==='right'){
    const s=dir==='left'?-1:1;
    ctx.beginPath();ctx.moveTo(cx-12,cy);ctx.lineTo(cx-16+as*s,cy+14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+12,cy);ctx.lineTo(cx+16+as*s,cy+14);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(cx-12,cy);ctx.lineTo(cx-16-char.facing*as,cy+14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+12,cy);ctx.lineTo(cx+16+char.facing*as,cy+14);ctx.stroke();
  }
  if(dir==='up'){
    const hr=17;
    ctx.fillStyle='#3a2f25';ctx.beginPath();ctx.arc(cx,cy-21,hr,0,7);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy-21,hr,0,7);ctx.stroke();
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy-4);ctx.lineTo(cx,cy+18);ctx.stroke();
  }else{
    ctx.fillStyle='#fb923c';ctx.beginPath();ctx.moveTo(cx-8,cy-6);ctx.lineTo(cx,cy+2);ctx.lineTo(cx+8,cy-6);ctx.closePath();ctx.fill();
    const hr=17;
    ctx.save();ctx.beginPath();ctx.arc(cx,cy-21,hr,0,7);ctx.clip();
    if(avatar.complete&&avatar.naturalWidth)ctx.drawImage(avatar,cx-hr,cy-21-hr,hr*2,hr*2);
    else{ctx.fillStyle='#f1c5a8';ctx.fillRect(cx-hr,cy-21-hr,hr*2,hr*2);}
    ctx.restore();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy-21,hr,0,7);ctx.stroke();
    ctx.fillStyle='#e2e8f0';ctx.beginPath();ctx.arc(cx,cy-29,hr,Math.PI,0);ctx.fill();
  }
  if(char.busy){
    const em=activeDevice==='literature'?'💭':(activeDevice==='ai'||activeDevice==='robot')?'🤖':'⚗️';
    ctx.fillStyle='rgba(15,23,42,.92)';ctx.strokeStyle='rgba(94,231,223,.5)';ctx.lineWidth=1.5;
    rr(cx+16,cy-50,26,22,9);ctx.fill();ctx.stroke();
    ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(em,cx+29,cy-34);ctx.textAlign='left';
  }
}

function updateChar(){
  const dx=char.tx-char.x,dy=char.ty-char.y,dist=Math.hypot(dx,dy);
  if(dist<4){
    char.busy=false;char.vx=0;char.vy=0;
    char.dir=char.lastDir||'down';
    if(activeDevice!==char.targetKey){activeDevice=char.targetKey;spawnBurst(activeDevice);}
    return;
  }
  char.facing=dx>0?1:-1;
  let dir;
  if(Math.abs(dy)>Math.abs(dx)) dir=dy<0?'up':'down';
  else dir=char.facing>0?'right':'left';
  char.dir=dir;char.lastDir=dir;
  const sp=char.speed*(dist>90?1.5:1);
  char.vx=dx/dist*sp;char.vy=dy/dist*sp;
  char.x+=char.vx;char.y+=char.vy;char.walkPhase+=0.28;
}
function updateMolecules(){
  // 气体进料/光反应器 流动
  if(activeDevice==='gasfeed'||activeDevice==='reactor'){
    if(Math.random()<0.5)spawnMolecule('gasfeed','reactor','#3498db');
  }
  if(activeDevice==='reactor'){
    if(Math.random()<0.6)spawnMolecule('reactor','gc', Math.random()<0.65?'#e67e22':'#e74c3c');
    if(Math.random()<0.4)spawnMolecule('reactor','ms', '#48c9b0');
    if(Math.random()<0.4)spawnMolecule('reactor','drifts', '#f5b7b1');
  }
  for(let i=molecules.length-1;i>=0;i--){const m=molecules[i];m.p+=m.sp;
    m.x+=(m.tx-m.x)*0.04;m.y+=(m.ty-m.y)*0.04;
    ctx.globalAlpha=Math.max(0,1-Math.abs(m.p-0.5)*0.6);ctx.fillStyle=m.col;
    ctx.beginPath();ctx.arc(m.x,m.y,4,0,7);ctx.fill();ctx.globalAlpha=1;
    if(m.p>1.05)molecules.splice(i,1);
  }
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy+=0.05;s.life-=0.02;
    ctx.globalAlpha=Math.max(0,s.life);ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.arc(s.x,s.y,2,0,7);ctx.fill();ctx.globalAlpha=1;
    if(s.life<=0)sparks.splice(i,1);
  }
}
function drawBanner(){
  // 阶段横幅 —— 毛玻璃浮动标签（参考图分区标签风格）
  const bw=280,bh=30;
  const bx=W/2-bw/2,by=10;
  ctx.fillStyle='rgba(255,255,255,.92)';rr(bx,by,bw,bh,16);ctx.fill();
  ctx.fillStyle='rgba(14,165,233,.06)';rr(bx+1,by+1,bw-2,bh-2,15);ctx.fill();
  ctx.strokeStyle='rgba(14,165,233,.3)';ctx.lineWidth=1;ctx.shadowColor='#0ea5e9';ctx.shadowBlur=10;
  rr(bx,by,bw,bh,16);ctx.stroke();ctx.shadowBlur=0;
  // 左侧色条
  ctx.fillStyle='#0ea5e9';ctx.beginPath();ctx.roundRect(bx+2,by+6,3,bh-12,1.5);ctx.fill();
  ctx.fillStyle='#1e293b';ctx.font='bold 12px -apple-system,"SF Pro Text","PingFang SC",sans-serif';ctx.textAlign='center';
  ctx.fillText('🔬 '+labStageText, W/2, by+20);ctx.textAlign='left';
}

function resize(){
  const r=canvas.parentElement.getBoundingClientRect();W=r.width;H=r.height;
  canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  const _initKey=(DEVICES[0]?DEVICES[0].key:'literature'); const c=devCenter(_initKey);char.x=c.x;char.y=c.y;char.tx=c.x;char.ty=c.y;
}
window.addEventListener('resize',resize);

// === 3D 初始化（use3d 模式）===
if(use3d && lab3dContainer){
  try{
    world3d=new World3D();
    world3d.init(lab3dContainer, DEVICES, { fullLab: window.PAGE_CONFIG.fullLab!==false });
    world3d.onDeviceClick = (key)=>{
      const d=DEV[key];
      if(d) openDevice(d);
    };
    // 隐藏 2D canvas，标记 body
    canvas.style.display='none';
    document.body.classList.add('use3d');
    log('ok','🌐 3D 世界模型已加载 — 人形机器人 Bot-M 待命');
  }catch(e){
    log('warn','⚠ 3D 引擎初始化失败，回退 2D：'+(e&&e.message||e));
    if(world3d){ try{world3d.dispose();}catch(_){} world3d=null; }
    canvas.style.display='';
  }
}

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); let dt=(now-lastFrame)/1000; lastFrame=now;
  if(!isFinite(dt)) dt=0.016;
  if(dt>0.1)dt=0.1; if(dt<0)dt=0;
  if(running) simClock += dt*timeScale;

  // === 3D 模式：逻辑层仍用 2D 坐标驱动 AI 循环，渲染层交给 world3d ===
  if(use3d && world3d){
    // 2D 坐标系仍需 W/H 用于 devCenter/char 逻辑
    if(W===0||H===0){ try{ resize(); }catch(_){} if(W===0||H===0) return; }
    try{ updateChar(); }catch(e){ /* 静默 */ }
    // 把 char 的 2D 像素坐标归一化为 0~1，供 3D 引擎映射
    char.nx = W>0 ? char.x/W : 0.5;
    char.ny = H>0 ? char.y/H : 0.5;
    try{ world3d.tick(char, activeDevice, running, dt); }catch(e){ /* 静默防冻结 */ }
    try { if(running) tickLoop(); }
    catch(e){
      log('warn','⚠ 运行时异常（已跳过此步防冻结）：'+(e&&e.message||e));
      if(loopState==='working'){ loopStage=Math.min(3,loopStage+1); loopState='moving'; _opBusy=false; }
    }
    try{ updateSimClockUI(); }catch(e){}
    return;
  }

  // === 2D 模式（原始逻辑）===
  if(W===0||H===0){ try{ resize(); }catch(_){} if(W===0||H===0) return; }
  try{
    ctx.clearRect(0,0,W,H);
    drawBackground(); if(!window.__simpleBg) drawPipes();
    DEVICES.forEach(drawDevice);
    updateChar();drawCharacter();
  }catch(e){
    log('warn','⚠ 绘制异常（已跳过本帧绘制，循环继续）：'+(e&&e.message||e));
  }
  try { if(running) tickLoop(); }
  catch(e){
    log('warn','⚠ 运行时异常（已跳过此步防冻结）：'+(e&&e.message||e));
    if(loopState==='working'){ loopStage=Math.min(3,loopStage+1); loopState='moving'; _opBusy=false; }
  }
  try{ updateMolecules(); if(!window.__simpleBg) drawBanner(); updateSimClockUI(); }
  catch(e){ log('warn','⚠ 收尾绘制异常：'+(e&&e.message||e)); }
  if(nebOn){nebT+=0.008;if(nebT>1)nebT=0;try{drawNEB(nebT);}catch(_){}}
}

/* =========================================================
   4) 控制
   ========================================================= */
document.getElementById('btn-play').addEventListener('click',()=>{
  const chk = document.getElementById('chk-bo');
  if(chk && chk.checked){
    if(_boRunning){ _boAbort=true; log('warn','⏸ 纯 BO 已暂停，机器人停在当前设备。'); return; }
    runPureBO();
    return;
  }
  char.hold=false;
  running=!running;document.getElementById('btn-play').textContent=running?'⏸ 暂停':'▶ 运行';
  if(running){log('ai',`● 工作室启动（时间倍率 ×${timeScale}）：AI 角色自主跑实验，模拟时钟按真实世界 ${timeScale} 倍加速…`);startIteration();}
  else log('warn','⏸ 已暂停');
});
document.getElementById('btn-step').addEventListener('click',()=>{ stepOnce(); });

// 纯 BO：扫离散网格，列出证明当前最优点还要做的实验
let _boRunning = false;
let _boAbort = false;
function _esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _boMark(i){
  document.querySelectorAll('[data-stage]').forEach(e=>e.classList.toggle('active', +e.dataset.stage===i));
}
async function _boWalk(key, stage, label){
  if(_boAbort) return;
  const d = DEV[key];
  if(!d) return;
  _boMark(stage);
  activeDevice = key;
  labStageText = label + ' · ' + d.name;
  setCharTarget(key);
  if(world3d && typeof world3d._highlight==='function'){
    try{ world3d._highlight(key); }catch(_){}
  }
  const t0 = performance.now();
  while(char.busy && performance.now()-t0 < 1800){
    if(_boAbort) return;
    await new Promise(r=>setTimeout(r, 80));
  }
  const dwell = (key==='literature'||key==='reactor'||key==='furnace'||key==='gn_solid') ? 700 : 420;
  const until = performance.now()+dwell;
  while(performance.now()<until){
    if(_boAbort) return;
    await new Promise(r=>setTimeout(r, 80));
  }
}
function _boNum(v, d){ return v==null?'—':Number(v).toFixed(d); }
function _boRows(rows){
  const th = 'padding:7px 8px;white-space:nowrap;font-weight:600;color:#666';
  const td = 'padding:7px 8px;white-space:nowrap';
  const head = `<tr style="text-align:left">
    <th style="${th}">#</th>
    <th style="${th}">来源</th>
    <th style="${th}">负载</th>
    <th style="${th}">甲烷</th>
    <th style="${th}">氧气</th>
    <th style="${th}">氩气</th>
    <th style="${th}">进料氧%</th>
    <th style="${th}">质量 mg</th>
    <th style="${th}">光功率</th>
    <th style="${th}">产率</th>
    <th style="${th}">选择性</th>
    <th style="${th}">保持率</th>
    <th style="${th}">采集分</th>
    <th style="${th}">上界</th>
    <th style="${th}">高出当前最优</th>
    <th style="${th}">C2H4</th>
    <th style="${th}">C2H6</th>
    <th style="${th}">CO2</th>
    <th style="${th}">说明</th>
  </tr>`;
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px">${head}`;
  rows.forEach(c=>{
    html += `<tr style="border-top:1px solid #eee">
      <td style="${td};font-weight:700;color:#2a4d9e">${c.rank}</td>
      <td style="${td}">${_esc(c.group||'')}</td>
      <td style="${td}">${_esc(c.loading)}%</td>
      <td style="${td}">${_boNum(c.ch4,0)}</td>
      <td style="${td}">${_boNum(c.o2,0)}</td>
      <td style="${td}">${_boNum(c.ar,0)}</td>
      <td style="${td}">${c.o2_in==null?'—':Number(c.o2_in).toFixed(1)}</td>
      <td style="${td}">${c.mass==null?'—':c.mass}</td>
      <td style="${td}">${c.power==null?'—':c.power+'%'}</td>
      <td style="${td}">${c.y==null?'—':Math.round(c.y)}</td>
      <td style="${td}">${c.sel==null?'—':Number(c.sel).toFixed(1)}</td>
      <td style="${td}">${c.z==null?'—':Number(c.z).toFixed(3)}</td>
      <td style="${td}">${c.score==null?'—':(Math.abs(c.score)<100?Number(c.score).toFixed(1):Math.round(c.score))}</td>
      <td style="${td};font-weight:700;color:#c0392b">${c.ucb==null?'—':Math.round(c.ucb)}</td>
      <td style="${td}">${c.gap==null?'—':Math.round(c.gap)}</td>
      <td style="${td}">${c.c2h4==null?'—':Number(c.c2h4).toFixed(1)}</td>
      <td style="${td}">${c.c2h6==null?'—':Number(c.c2h6).toFixed(1)}</td>
      <td style="${td}">${c.co2==null?'—':Number(c.co2).toFixed(1)}</td>
      <td style="padding:7px 8px;color:#333;line-height:1.45;min-width:180px">${_esc(c.reason)}</td>
    </tr>`;
  });
  return html + `</table>`;
}
async function runPureBO(){
  if(_boRunning) return;
  _boRunning = true;
  _boAbort = false;
  const prevSpeed = char.speed;
  const bp = document.getElementById('btn-play');
  char.speed = 22;
  char.hold = true;
  running = true;
  loopState = 'idle';
  if(bp) bp.textContent = '⏸ 暂停';
  try {
    log('ai','① 文献学习：最优负载加最近三档，每档一条实测、一条周围两步的期望改进。');
    const req = fetch('/api/bo/closed-loop', {method:'POST'}).then(r=>r.json());
    await _boWalk('literature', 0, '① 文献学习');
    const j = await req;
    if(_boAbort) return;
    if(!j.ok) throw new Error(j.error || '闭环失败');
    const top = j.top || [];
    const proof = j.proof || {};
    log('ok', `门槛内产率最高 ${proof.ystar==null?'—':Math.round(proof.ystar)}，${proof.load||''}% Pd-P25，甲烷 ${_boNum(proof.ch4,0)}，1%氧气 ${_boNum(proof.o2,0)}，氩气 ${_boNum(proof.ar,0)}，光功率 ${proof.power==null?'—':proof.power+'%'}，选择性 ${proof.selstar==null?'—':Number(proof.selstar).toFixed(1)}%，保持率 ${proof.zstar==null?'—':(proof.zstar*100).toFixed(1)}%。附近过线的有 ${proof.n_open||0} 组。推荐 ${top.length} 组。`);
    if(_boAbort) return;
    await _boWalk('gn_solid', 1, '② 虚拟合成');
    if(_boAbort) return;
    await _boWalk('reactor', 2, '③ 实验反馈');
    if(_boAbort) return;
    await _boWalk('gc', 2, '③ 实验反馈');
    if(_boAbort) return;
    log('ai', '④ 网格证明：' + (j.stop_reason || '扫描结束。'));
    await _boWalk('ai', 3, '④ 网格证明');
    if(_boAbort) return;
    const bt = document.getElementById('bo-modal-title');
    if(bt) bt.textContent = '纯 BO · 八组推荐';
    let html = `<div style="color:#444;margin-bottom:14px;font-size:13px;line-height:1.6;background:#f7f8fb;border-radius:8px;padding:12px 14px">
      <div style="font-weight:700;color:#1a1a1a;margin-bottom:6px">门槛内产率最高　${_esc(proof.load)}% Pd-P25　甲烷 ${_boNum(proof.ch4,0)}　1%氧气 ${_boNum(proof.o2,0)}　氩气 ${_boNum(proof.ar,0)} mL/min　光功率 ${proof.power==null?'—':proof.power+'%'}　产率 ${proof.ystar==null?'—':Math.round(proof.ystar)}　选择性 ${proof.selstar==null?'—':Number(proof.selstar).toFixed(1)}%　保持率 ${proof.zstar==null?'—':(proof.zstar*100).toFixed(1)}%</div>
      选择性要大于 84，保持率要大于 95%。甲烷不超过 100，进料氧 1%。采集分 = 产率期望改进 × 选择性超过 84 的概率 × 保持率超过 95% 的概率。负载是当前最优和对数负载上最近的三档。每档一条合格实测，没有就把最优条件移过去；另一条只在周围两步里按采集分挑。共 ${top.length} 组。
      其中产率上界更高、两个概率都不低于一半的有 <b>${proof.n_open||0}</b> 组。
      <div style="margin-top:8px">保存目录：<code style="background:#fff;padding:2px 6px;border-radius:3px">${_esc(j.save_dir||'')}</code>　文件名：<code style="background:#fff;padding:2px 6px;border-radius:3px">${_esc(j.save_name||'')}</code></div>
    </div>`;
    html += `<div style="font-weight:700;margin:4px 0 8px">八组推荐</div>`;
    html += `<div style="color:#666;font-size:12.5px;margin-bottom:8px">旧配方是门槛内产率最高的实测。转移是该负载没有合格实测时沿用最优条件。附近是周围两步里采集分最高的一格。采集分一列，旧配方填的是产率。流速单位 mL/min。</div>`;
    html += top.length ? _boRows(top) : `<div style="color:#666;margin-bottom:12px">没有可比较的新格子。</div>`;
    document.getElementById('bo-modal-body').innerHTML = html;
    document.getElementById('bo-modal').style.display = 'flex';
    log('ok', `弹窗已给出网格证明表，共 ${top.length} 组待做实验。`);
  } catch(e) {
    log('warn','❌ 纯 BO 失败：'+(e&&e.message||e));
    alert('纯 BO 失败：'+(e&&e.message||e));
  } finally {
    _boRunning = false;
    char.speed = prevSpeed;
    running = false;
    loopState = 'idle';
    if(bp) bp.textContent = '▶ 运行';
  }
}
document.getElementById('pm-close').addEventListener('click',()=>{
  document.getElementById('panel-modal').classList.add('hidden');
});
const tsInput=document.getElementById('ts-input');
function setTimeScale(v){ v=Math.max(1, Math.floor(v)||1); timeScale=v; if(tsInput)tsInput.value=v; updateSimClockUI(); }
if(tsInput) tsInput.addEventListener('change',e=>setTimeScale(+e.target.value));
document.querySelectorAll('.tsp').forEach(b=>b.addEventListener('click',()=>setTimeScale(+b.dataset.v)));
// —— 实验数据模式控件：real / hybrid(N 次后真实) / sim（纯模拟）——
(function initDataModeControl(){
  const dm=document.getElementById('data-mode');
  const ra=document.getElementById('real-after');
  const raw=document.getElementById('real-after-wrap');
  function sync(){
    if(!dm) return;
    DATA_MODE = dm.value || 'real';
    if(ra){ const v=parseInt(ra.value,10); REAL_AFTER_ITER = (isFinite(v)&&v>=1)?v:5; }
    if(raw) raw.style.display = (DATA_MODE==='hybrid') ? 'inline-flex' : 'none';
    updateDataModeTag();
  }
  if(dm) dm.addEventListener('change', ()=>{ sync(); log('ai', `⚙️ 实验数据模式切换为：${dataModeLabel()}`); });
  if(ra){ ra.addEventListener('input', sync); ra.addEventListener('change', sync); }
  sync();
})();
document.getElementById('btn-neb').addEventListener('click',()=>{
  nebOn=!nebOn;document.getElementById('btn-neb').classList.toggle('on',nebOn);
  log('ok',nebOn?'⚛ NEB 路径动画开启（能垒为示意值）':'⚛ NEB 路径动画关闭');
});

/* ---------- 真实世界实验数据弹窗（RealData）---------- */
const _rdDrop = document.getElementById('rd-drop');
const _rdFile = document.getElementById('rd-file');
if(_rdDrop && _rdFile){
  _rdDrop.addEventListener('click', ()=> _rdFile.click());
  _rdFile.addEventListener('change', e=>{ if(e.target.files && e.target.files.length) rdUploadFiles(e.target.files); });
  ['dragenter','dragover'].forEach(ev=>_rdDrop.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); _rdDrop.classList.add('hover'); }));
  ['dragleave','drop'].forEach(ev=>_rdDrop.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); _rdDrop.classList.remove('hover'); }));
  _rdDrop.addEventListener('drop', e=>{
    const files = e.dataTransfer && e.dataTransfer.files;
    if(files && files.length) rdUploadFiles(files);
  });
}
const _rdExisting = document.getElementById('rd-existing');
if(_rdExisting) document.getElementById('rd-load-existing').addEventListener('click', async ()=>{
  const name = _rdExisting.value;
  if(!name){ rdShowMsg('请先选择一个已存文件', 'err'); return; }
  rdShowProgress('载入并解析 ' + name + ' …');
  try{
    const fd = new FormData(); fd.append('existing', name);
    fd.append('reaction', (typeof activeReaction!=='undefined' && activeReaction==='OER') ? 'OER' : 'OCM');
    const res = await fetch(backendBase + '/api/realdataparse', {method:'POST', body: fd});
    const j = await res.json();
    rdShowProgress(''); renderRealDataParse(j);
  }catch(e){ rdShowProgress(''); rdShowMsg('载入失败：' + (e.message||e), 'err'); }
});
const _btnReal = document.getElementById('btn-realdata');
if(_btnReal) _btnReal.addEventListener('click', ()=>{
  log('user','📁 打开真实实验数据上传面板（可随时上传，不参与当前轮次则用模拟值）。');
  openRealDataModal({gate:false});
});
// 左侧闭环栏 stage ③ 上方的「📁 录入真实数据」CTA：与闸门同效（暂停循环，作为本轮真实反馈）
const _btnStageReal = document.getElementById('btn-stage-realdata');
if(_btnStageReal) _btnStageReal.addEventListener('click', ()=>{
  log('user','📁 手动录入真实实验数据：唤起真实实验反馈面板（暂停循环，应用后作为本轮真实反馈）。');
  openRealDataModal({gate:true, candidate:(typeof curCand!=='undefined'?curCand:null)});
});

/* ---------- 设备点击交互弹窗 ---------- */
const ZONE_LABEL={lit:'📚 文献 / 知识',learn:'🧠 控制 / 学习',syn:'⚗️ 合成 / 前处理',exp:'🔆 反应',cha:'🔬 表征'};
let dmTimer=null;
function deviceAt(mx,my){
  for(const d of DEVICES){
    const x=d.x*W,y=d.y*H,w=d.w*W,h=d.h*H;
    if(mx>=x&&mx<=x+w&&my>=y&&my<=y+h) return d;
  }
  return null;
}
function fmtRead(r){
  let v=r.val;
  if(r.unit==='g'||r.unit==='kPa') v=v.toFixed(r.unit==='g'?4:2);
  else if(r.unit==='°'||r.unit==='cm⁻¹'||r.unit==='rpm'||r.unit==='sccm'||r.unit==='℃'||r.unit==='mW/cm²'||r.unit==='%') v=Math.round(v);
  else if(r.unit==='ppm'||r.unit==='bar') v=v.toFixed(2);
  return v;
}
function jitterReadings(d){
  for(const r of d.readings){
    const span=(r.max-r.min)||1, amp=span*0.03;
    r.val+= (Math.random()*2-1)*amp;
    r.val=Math.max(r.min,Math.min(r.max,r.val));
  }
}
function renderReadings(d){
  const box=document.getElementById('dm-read');box.innerHTML='';
  for(const r of d.readings){
    const pct=((r.val-r.min)/((r.max-r.min)||1)*100).toFixed(0);
    const el=document.createElement('div');el.className='r';
    el.innerHTML=`<div class="rk">${r.k}</div><div class="rv">${fmtRead(r)}<small>${r.unit||''}</small></div><div class="rbar"><i style="width:${pct}%"></i></div>`;
    box.appendChild(el);
  }
}
function openDevice(d){
  selectedDevice=d.key; lastOpenedDevice=d.key;
  document.getElementById('dm-ico').textContent=d.icon||'🔬';
  document.getElementById('dm-name').textContent=d.name;
  document.getElementById('dm-zone').textContent=ZONE_LABEL[d.zone]||d.zone;
  document.getElementById('dm-desc').textContent=d.desc||'';
  const aiNow=(activeDevice===d.key&&running);
  const opEl=document.getElementById('dm-op');
  const durTxt = OP_DUR[d.key]? `（预计模拟耗时 ${fmtSim(OP_DUR[d.key])}）` : '';
  opEl.innerHTML= aiNow
    ? `<span class="ai-now">● AI 正在操作：</span>${d.op}${durTxt}`
    : `待机 · 计划操作：${d.op}${durTxt}`;
  const spBox=document.getElementById('dm-spec');spBox.innerHTML='';
  for(const s of (d.specs||[])){
    const el=document.createElement('div');el.className='s';
    el.innerHTML=`<span class="sk">${s.k}</span><span class="sv">${s.v}</span>`;
    spBox.appendChild(el);
  }
  renderReadings(d);
  renderParams(d);
  document.getElementById('dev-modal').classList.remove('hidden');
  if(dmTimer)clearInterval(dmTimer);
  dmTimer=setInterval(()=>{
    if(document.getElementById('dev-modal').classList.contains('hidden'))return;
    const aiNow=(activeDevice===d.key&&running);
    opEl.innerHTML= aiNow ? `<span class="ai-now">● AI 正在操作：</span>${d.op}${durTxt}` : `待机 · 计划操作：${d.op}${durTxt}`;
    if(aiNow)jitterReadings(d);
    renderReadings(d);
  },700);
}
function closeDevice(){
  document.getElementById('dev-modal').classList.add('hidden');
  selectedDevice=null;
  if(dmTimer){clearInterval(dmTimer);dmTimer=null;}
}
canvas.addEventListener('click',e=>{
  if(use3d && world3d) return; // 3D 模式下点击由 world3d raycast 处理
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const d=deviceAt(mx,my);
  if(d) openDevice(d);
});
canvas.addEventListener('mousemove',e=>{
  if(use3d && world3d) return; // 3D 模式下悬停光标由 world3d 处理
  const r=canvas.getBoundingClientRect();
  canvas.style.cursor = deviceAt(e.clientX-r.left,e.clientY-r.top) ? 'pointer' : 'default';
});
document.getElementById('dm-close').addEventListener('click',closeDevice);
document.getElementById('dev-modal').addEventListener('click',e=>{if(e.target.id==='dev-modal')closeDevice();});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeDevice();});
document.getElementById('dm-exec').addEventListener('click',()=>{
  const d=DEV[lastOpenedDevice]; if(!d) return;
  exportUserRecipe();                                       // ② 导出配方进主动学习候选池
  if(!running && !(window.PAGE_CONFIG && window.PAGE_CONFIG.runWorldModel===false)){ const bp=document.getElementById('btn-play'); if(bp){ bp.click(); } }
  if(!running) return;                                      // 仍无法运行则不调度
  const dk=d.key;
  log('user',`👤 已采用对 <b>${d.name}</b> 的设定：<b>${d.op}</b>。`);
  if(loopState==='working'){
    dispatchQueued=dk;
    log('user',`🎯 即时调度已排队：AI 完成当前操作后立刻前往 <b>${d.name}</b> 执行你的条件。`);
  } else {
    startDispatch(dk);
    log('user',`🎯 即时调度：AI 立即前往 <b>${d.name}</b> 执行 <b>${d.op}</b>（完成后回到主线第 ${savedStage+1} 阶段）。`);
  }
});

document.getElementById('btn-exp-csv').addEventListener('click',exportRecipesCSV);
document.getElementById('btn-exp-json').addEventListener('click',exportRecipesJSON);
/* 启动：渲染循环立即开始，数据已内置，绝不空白 */
try{
  if(typeof Chart!=='undefined' && window.PAGE_CONFIG && window.PAGE_CONFIG.showFooter!==false){ initCharts(); }
  else { log('warn','⚠ Chart.js 未加载（可能离线），实时曲线暂不可用，实验室仍正常运行'); }
}catch(e){ console.warn('charts init failed',e); }
resize();
animate();

/* =========================================================
   前端 7B 决策显式化（任务③/④）+ 四页引导横幅
   —— 决策卡常显：7B 状态 / 决策来源 / 策略 / 理由
   —— 页内引导：按 PAGE_CONFIG.page 给出用途与工作流
   ========================================================= */
const PAGE_INTRO = {
  lab:{t:'🧪 合成 & 反应台', s:['① 选前驱体金属/载体（手套箱防潮）','② 称量 · 溶胶-凝胶/共沉淀混料（天平·超声·搅拌）','③ 焙烧定形（管式炉 · 气氛 · 温度 → 决定晶相/氧空位）','④ 负载/成型（喷涂 · 离心）','⑤ 进表征台验证，再回推演台跑性能'], n:'点击任意设备查看规格、参数与实时读数；调参后点「▶ 让 AI 按此条件执行」即可带入下一轮实验。'},
  char:{t:'🔬 表征分析', s:['点击设备查看该表征方法能告诉你什么','UV-Vis / XPS → 带隙与价态','XRD / TEM / BET → 物相 / 形貌 / 比表面','PL / 寿命 / 光电流 → 载流子分离效率','DRIFTS / ATR → 表面吸附与反应中间体'], n:'各设备说明内置方法学要点；结合推演台右侧「约束校验」交叉验证材料设计是否合理。'},
  dft:{t:'⚛ 理论计算', s:['吸附能 → 活性火山轴与选择性权衡','DOS / 能带 → 载流子与 redox 驱动力','OER 理论 → 四/两电子竞争与过电位','下方图表：能带结构 / EOV–ΔE*CH₃ 双描述符火山'], n:'理论描述符与推演台预测同源；红色区 = 远离火山顶点，活性/选择性受限。'},
  recipe:{t:'📋 配方方案', s:['从文献池选基底配方','在设备上调整合成参数生成你的配方','「▶ 让 AI 按此条件执行」把配方带入主动学习','右侧实时推演：世界模型预测 vs 实测'], n:'用户配方会进入候选池（带 👤 标记），与文献催化剂一同被 7B / 采集函数评估。'},
  photo:{t:'☀️ 总览-光催化闭环设计', s:['文献学习 → 抽取甲烷偶联光催化设计原则','虚拟合成与表征：称量 · 马弗炉/管式炉焙烧 · 表征','真实实验反馈：灯 + 反应器 · 气相色谱 · 表征','强化 / 主动学习：AI 控制中心更新世界模型'], n:'此总览展示甲烷偶联光催化闭环全设备；点「▶ 运行」让 AI 在设备间自主做材料筛选，点任意设备查看规格与实时读数。'}
};
function pageIntroHTML(page){
  const m = PAGE_INTRO[page] || PAGE_INTRO.lab;
  const steps = m.s.map(x=>`<li>${x}</li>`).join('');
  return `<div class="pi-head">${m.t}<button id="pi-close" title="收起">✕</button></div>
    <div class="pi-sub">怎么用</div><ol class="pi-steps">${steps}</ol>
    <div class="pi-note">${m.n}</div>`;
}
function injectUIPanels(){
  // 决策卡：置于 #right 的 h2 之后（顶部常显，避免被底部 overflow:hidden 裁剪）
  const right = document.getElementById('right');
  if(right && !document.getElementById('decision-card')){
    const dc = document.createElement('div'); dc.id='decision-card'; dc.className='hidden';
    dc.innerHTML = `<div class="dc-head"><span class="dot"></span> 🧠 AI 决策（7B 策略器）</div>
      <div class="dc-status" id="dc-status">—</div>
      <div class="dc-row"><span class="dc-k">决策来源</span><span class="dc-v" id="dc-source">—</span></div>
      <div class="dc-row"><span class="dc-k">策略</span><span class="dc-v" id="dc-strategy">—</span></div>
      <div class="dc-row"><span class="dc-k">理由</span><span class="dc-v" id="dc-rationale">—</span></div>
      <div class="dc-row" id="dc-advice" style="display:none"><span class="dc-k">🧠 7B 建议</span><span class="dc-v" id="dc-advice-v">—</span></div>`;
    right.insertBefore(dc, right.children[1] || null);
  }
  // 页内引导横幅：按 PAGE_CONFIG.page 给出用途与工作流（photo 总览不显示引导，避免横幅占位）
  const center = document.getElementById('center');
  const page = (window.PAGE_CONFIG && window.PAGE_CONFIG.page) || 'lab';
  if(center && !document.getElementById('page-intro') && page!=='index' && page!=='photo'){
    const seen = (()=>{ try{ return sessionStorage.getItem('pi-seen-'+page); }catch(e){ return null; } })();
    const intro = document.createElement('div'); intro.id='page-intro'; intro.className='page-intro'+(seen?' hidden':'');
    intro.innerHTML = pageIntroHTML(page);
    center.insertBefore(intro, center.firstChild);
    const cb = intro.querySelector('#pi-close');
    if(cb) cb.addEventListener('click', ()=>{ intro.classList.add('hidden'); try{ sessionStorage.setItem('pi-seen-'+page,'1'); }catch(e){} });
  }
}
function renderDecision(audit){
  const card = document.getElementById('decision-card'); if(!card) return;
  const st=document.getElementById('dc-status'), src=document.getElementById('dc-source'),
        strat=document.getElementById('dc-strategy'), rat=document.getElementById('dc-rationale');
  if(!st||!src||!strat||!rat) return;
  // 每轮决策卡重置：异步 7B 建议行默认隐藏，待 pollStrategyProposal 就绪后再揭示（避免残留上一轮建议）
  const _adv=document.getElementById('dc-advice'); if(_adv) _adv.style.display='none';
  card.classList.remove('hidden');
  if(backendOk){ st.textContent = modelReady ? '🟢 后端已连 · 7B 策略增强可用' : '🟢 后端已连 · 7B 暂不可用（确定性回退）'; st.className='dc-status ok'; }
  else { st.textContent='🔴 后端未连 · 已回退本地确定性逻辑'; st.className='dc-status off'; }
  if(audit && audit.used_model){ src.textContent='🧠 7B 提议'; src.className='dc-v model'; }
  else { src.textContent='📊 默认最优（确定性采集）'; src.className='dc-v det'; }
  strat.textContent = (audit && audit.strategy) ? audit.strategy : '—';
  if(audit && audit.rationale){ rat.textContent = audit.rationale; }
  else if(audit && audit.used_model){ rat.textContent = '—'; }
  else {
    // 未连通：把抽象提示变成可点击动作。从 HTTPS 预览页用 target=_blank 打开 HTTP 顶层页是允许的，
    // 不受混合内容（Mixed Content）拦截 —— 这正是红灯的根因。
    const _reason = (window.__lastProbeErr || '探针未通过，详见右下调试面板').replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    rat.innerHTML = '后端未连通（' + _reason + '）。已回退本地确定性采集（UCB 退火）。<br>' +
      '👉 <a href="http://127.0.0.1:8000/" target="_blank" rel="noopener" style="color:#7dd3fc;text-decoration:underline">点此在新标签打开本地世界模型</a> 即可启用 7B 策略增强。';
  }
}
injectUIPanels();

// 异步轮询 7B 建议：后端 /api/strategy-proposal 在慢 7B 后台跑完后返回；
// 揭示到决策卡「🧠 7B 建议」行。轮询错误静默，绝不影响主循环。
let _pollTimer = null;
function pollStrategyProposal(iteration){
  if(_pollTimer){ clearInterval(_pollTimer); _pollTimer = null; }
  const _adv = document.getElementById('dc-advice');
  const _advv = document.getElementById('dc-advice-v');
  if(_adv) _adv.style.display = 'none';
  let _n = 0;
  _pollTimer = setInterval(async () => {
    _n++;
    if(_n > 45){ if(_pollTimer){ clearInterval(_pollTimer); _pollTimer = null; } if(_adv) _adv.style.display='none'; return; }
    if(!backendOk) return;   // 后端掉了就不轮询，主循环已本地回退
    try{
      const res = await fetch(backendBase + '/api/strategy-proposal?iteration=' + encodeURIComponent(iteration),
                              {headers: {'Content-Type': 'application/json'}});
      if(!res.ok) return;
      const j = await res.json();
      if(j && j.ready && j.proposal){
        if(_pollTimer){ clearInterval(_pollTimer); _pollTimer = null; }
        const p = j.proposal;
        if(p && p.ok && p.next_id != null){
          if(_adv && _advv){
            const _safe = (s)=> String(s==null?'':s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
            _adv.style.display = '';
            _advv.innerHTML = `🧠 建议选 id=${p.next_id} · ${_safe(p.strategy)} · ${_safe(p.rationale)}`;
          }
        } else if(_adv){
          _adv.style.display = 'none';
        }
      }
    }catch(e){ /* 轮询失败静默 */ }
  }, 2000);
}

function refreshKbMeta(){
  const _zav=KB_ALL.filter(p=>p.domain==='OCM-ref(Zavyalova)').length;
  const _cads=KB_ALL.filter(p=>p.domain==='OCM-ref(CADS)').length;
  const _nr=(typeof CATALYSTS!=='undefined')? CATALYSTS.filter(r=>r.review_status==='needs_review').length : 0;
  document.getElementById('kb-meta').innerHTML =
    `📚 参考知识库：真实 OCM <b>${POOL.length}</b> · Zavyalova真实 <b>${_zav}</b> · CADS真实 <b>${_cads}</b> 条` + (USER_RECIPES.length?` · 👤用户配方池 <b>${USER_RECIPES.length}</b>`:'') + (_nr?` · ⚠️ 数据质量待复核 <b style="color:#ffb454">${_nr}</b>（已移出预测池，带 DOI 溯源）`:'');
}
if(typeof POOL!=='undefined' && POOL && POOL.length){
  refreshKbMeta();
  const _zav=KB_ALL.filter(p=>p.domain==='OCM-ref(Zavyalova)').length, _cads=KB_ALL.filter(p=>p.domain==='OCM-ref(CADS)').length;
  log('ai',`○ 工作室就绪：内置 <b>${POOL.length}</b> 条真实 OCM 文献催化剂 + 参考知识库（Zavyalova ${_zav} / CADS ${_cads} 真实原始数据（FHI Berlin / 北海道大学 CADS）+ 47 条真实物理/化学规律（热力学/能带与载流子/动力学与传质/稳定性/双描述符火山/实验现实性）+ ${DEVICES.length} 台实验设备。点击「运行」让 AI 在设备间自主做实验；点击任意设备查看规格/实时读数。`);
  refreshBest();
}

/* =========================================================
   后端连接状态（仅探测 /api/health，不涉及模型/聊天）
   自由聊天面板已移除：7B 只在主动学习决策点被调用（/api/next），
   数据库与文献是固定真值，模型不可生成/修改。

   连接策略（动态探测，首个可用源即作为 backendBase）：
     1) 同源 ''        —— 由后端 / 直接托管（http://127.0.0.1:8000/）时最优
     2) http://127.0.0.1:8000
     3) http://localhost:8000
     4) ?backend=http://host:port  —— URL 显式覆盖，放到最前优先
   点徽章可手动重试；每 10s 自动重试。
   ========================================================= */
// =========================================================
// 真实世界实验数据弹窗（RealData）—— 拖拽 / 点击选新文件 / 从 RealData 选择 / 关闭保存进度
// 用于「真实实验反馈」阶段把用户真实数据作为反馈；也可由控制栏「📁 上传真实实验数据」随时唤起。
// =========================================================
(function injectRealDataStyle(){
  const css = `
  #realdata-modal{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;
    background:rgba(15,23,42,.55);backdrop-filter:blur(4px);font-family:inherit;}
  #realdata-modal.show{display:flex;}
  .rd-card{width:min(680px,92vw);max-height:88vh;overflow:auto;background:#0f172a;border:1px solid rgba(148,163,184,.30);
    border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.5);padding:22px 24px;color:#e2e8f0;}
  .rd-card h3{margin:0 0 4px;font-size:17px;}
  .rd-sub{font-size:12.5px;color:#94a3b8;margin:0 0 14px;line-height:1.5;}
  .rd-drop{border:2px dashed rgba(139,92,246,.5);border-radius:12px;padding:30px 16px;text-align:center;cursor:pointer;
    transition:.2s;background:rgba(139,92,246,.06);}
  .rd-drop.hover{border-color:#a78bfa;background:rgba(139,92,246,.16);}
  .rd-drop b{color:#c4b5fd;font-size:14px;}
  .rd-drop small{display:block;color:#94a3b8;margin-top:6px;font-size:11.5px;}
  .rd-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center;}
  .rd-row label{font-size:12px;color:#cbd5e1;}
  .rd-sel{flex:1;min-width:200px;padding:7px 9px;border-radius:8px;border:1px solid rgba(148,163,184,.3);
    background:rgba(30,41,59,.8);color:#e2e8f0;font-size:13px;}
  .rd-btn{padding:8px 14px;border-radius:9px;border:1px solid rgba(148,163,184,.3);background:rgba(51,65,85,.7);
    color:#e2e8f0;cursor:pointer;font-size:13px;font-weight:600;transition:.15s;}
  .rd-btn:hover{background:rgba(71,85,105,.8);}
  .rd-btn.primary{background:linear-gradient(135deg,#8b5cf6,#6366f1);border-color:transparent;color:#fff;}
  .rd-btn.primary:hover{filter:brightness(1.08);}
  .rd-btn.ghost{background:transparent;}
  .rd-parse{margin-top:14px;font-size:12.5px;color:#cbd5e1;display:none;}
  .rd-parse.show{display:block;}
  .rd-parse table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
  .rd-parse th,.rd-parse td{border:1px solid rgba(148,163,184,.2);padding:5px 8px;text-align:left;}
  .rd-parse th{background:rgba(139,92,246,.12);color:#c4b5fd;}
  .rd-msg{margin-top:10px;font-size:12.5px;padding:8px 10px;border-radius:8px;display:none;}
  .rd-msg.show{display:block;}
  .rd-msg.ok{background:rgba(34,197,94,.12);color:#86efac;border:1px solid rgba(34,197,94,.3);}
  .rd-msg.err{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3);}
  .rd-progress{margin-top:12px;font-size:12px;color:#94a3b8;padding:8px 10px;border-radius:8px;
    background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:#fcd34d;display:none;}
  .rd-progress.show{display:block;}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  const m = document.createElement('div');
  m.id = 'realdata-modal';
  m.innerHTML = `
  <div class="rd-card" role="dialog" aria-modal="true">
    <h3>📁 上传真实世界实验数据</h3>
    <p class="rd-sub">把实验得到的真实数据录入，作为「真实实验反馈」用于精炼世界模型。
      支持 <b>.csv / .xlsx</b>（含 产率 / 选择性 / 催化剂 / 温度 / DOI 列）与 <b>.tif</b>（谱图/衍射图，需配 csv 录入数值）。
      可<b>拖拽</b>文件到此、<b>点击</b>选择新文件，或从服务器已存文件里选择。</p>
    <div class="rd-drop" id="rd-drop">
      <b>把文件拖到这里，或点击选择</b>
      <small>支持多文件；.csv/.xlsx 自动解析实测产率/选择性，.tif 仅保存待人工读数</small>
      <input type="file" id="rd-file" multiple accept=".csv,.xlsx,.xls,.tif,.tiff,.png,.jpg,.jpeg,.pdf,.txt" style="display:none" />
    </div>
    <div class="rd-row">
      <label>从已存文件选择：</label>
      <select class="rd-sel" id="rd-existing"><option value="">（RealData 中暂无文件）</option></select>
      <button class="rd-btn" id="rd-load-existing">载入</button>
    </div>
    <div class="rd-msg" id="rd-msg"></div>
    <div class="rd-parse" id="rd-parse"></div>
    <div class="rd-progress" id="rd-progress"></div>
    <div class="rd-row" style="justify-content:flex-end;margin-top:18px;">
      <button class="rd-btn ghost" id="rd-skip">关闭（保存进度，用模拟值）</button>
      <button class="rd-btn primary" id="rd-apply" disabled>应用真实数据并继续</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  // 弹窗内按钮绑定（节点已注入 DOM，可安全绑定）
  const _rdSkip = document.getElementById('rd-skip');
  if(_rdSkip) _rdSkip.addEventListener('click', ()=>{
    closeRealDataModal(null);   // 关闭：保存进度（闸门模式下用模拟值继续）
  });
  const _rdApply = document.getElementById('rd-apply');
  if(_rdApply) _rdApply.addEventListener('click', ()=>{
    const rows = _rdModal.acceptedRows;
    if(!rows || !rows.length){ rdShowMsg('没有可应用的解析结果', 'err'); return; }
    closeRealDataModal(rows);   // 应用真实数据并继续
  });
  // —— 拖拽 / 点击选择新文件（核心交互，用户需求）——
  const _rdDrop = document.getElementById('rd-drop');
  const _rdFile = document.getElementById('rd-file');
  if(_rdDrop && _rdFile){
    // 点击拖拽区 → 唤起系统文件选择框
    _rdDrop.addEventListener('click', ()=>{ try{ _rdFile.click(); }catch(e){ rdShowMsg('无法打开文件选择框：'+(e.message||e),'err'); } });
    // 选择文件 → 上传（支持多选，逐个落盘，取首个可解析的表格作为反馈）
    _rdFile.addEventListener('change', ()=>{
      if(_rdFile.files && _rdFile.files.length){
        rdUploadFiles(Array.from(_rdFile.files));
        _rdFile.value = '';   // 允许重复选同一文件
      }
    });
    // 拖拽进入/离开 → 高亮
    _rdDrop.addEventListener('dragover', (e)=>{ e.preventDefault(); e.stopPropagation(); _rdDrop.classList.add('hover'); });
    _rdDrop.addEventListener('dragenter', (e)=>{ e.preventDefault(); e.stopPropagation(); _rdDrop.classList.add('hover'); });
    _rdDrop.addEventListener('dragleave', (e)=>{ e.preventDefault(); _rdDrop.classList.remove('hover'); });
    // 拖放 → 取出文件并上传
    _rdDrop.addEventListener('drop', (e)=>{
      e.preventDefault(); e.stopPropagation(); _rdDrop.classList.remove('hover');
      const dt = (e.dataTransfer && e.dataTransfer.files) ? Array.from(e.dataTransfer.files) : [];
      if(!dt.length){ rdShowMsg('拖拽区未检测到文件', 'err'); return; }
      rdUploadFiles(dt);
    });
  }
})();

// 弹窗运行态
let _rdModal = {
  open: false,
  acceptedRows: null,      // 已解析的实测记录（来自 /api/realdataparse）
  pendingResolve: null,    // 作为「真实实验闸门」时，关闭/应用后 resolve(onOpComplete 继续)
  gateMode: false,         // true=在真实实验阶段作为闸门（暂停循环等待）
  parsedForCand: null,     // {catalyst,doi} 当前候选，用于匹配
};

function rdShowMsg(text, kind){
  const el = document.getElementById('rd-msg');
  el.textContent = text; el.className = 'rd-msg show ' + (kind||'');
  if(!kind){ el.className = 'rd-msg'; }
}
function rdShowProgress(text){
  const el = document.getElementById('rd-progress');
  if(!text){ el.className='rd-progress'; el.textContent=''; return; }
  el.textContent = text; el.className='rd-progress show';
}

function renderRealDataParse(j){
  const box = document.getElementById('rd-parse');
  if(!j || !j.accepted){
    box.className='rd-parse';
    rdShowMsg((j && j.note) || '解析失败', 'err');
    document.getElementById('rd-apply').disabled = true;
    return;
  }
  _rdModal.acceptedRows = j.rows;
  const rows = j.rows.slice(0, 12);
  let html = `<div>✅ ${j.note} 列识别：产率=<b>${j.columns.yield||'—'}</b>，选择性=<b>${j.columns.selectivity||'—'}</b>`
            + `${j.columns.catalyst?`，催化剂=${j.columns.catalyst}`:''}${j.columns.temperature?`，温度=${j.columns.temperature}`:''}</div>`;
  html += `<table><thead><tr><th>催化剂</th><th>DOI</th><th>温度</th><th>产率</th><th>选择性%</th></tr></thead><tbody>`;
  for(const r of rows){
    html += `<tr><td>${r.catalyst||'—'}</td><td>${r.doi||'—'}</td><td>${r.temperature!=null?r.temperature:'—'}</td>`
          + `<td>${r.yield!=null?r.yield:'—'}</td><td>${r.selectivity!=null?r.selectivity:'—'}</td></tr>`;
  }
  html += `</tbody></table>`;
  if(j.rows.length > 12) html += `<div style="color:#94a3b8;margin-top:6px;">… 共 ${j.rows.length} 行，仅显示前 12 行</div>`;
  box.innerHTML = html; box.className='rd-parse show';
  rdShowMsg('', '');
  document.getElementById('rd-apply').disabled = false;
}

async function rdUploadFiles(files){
  if(!files || !files.length) return;
  rdShowMsg('', '');
  document.getElementById('rd-apply').disabled = true;
  _rdModal.acceptedRows = null;
  // 多文件：逐个落盘到 RealData（所有文件都存档），取首个可解析的表格作为本轮反馈
  const fileArr = Array.from(files);
  let firstParsed = null;
  for(let i=0; i<fileArr.length; i++){
    const f = fileArr[i];
    const tag = fileArr.length>1 ? `（${i+1}/${fileArr.length}）` : '';
    rdShowProgress('上传并解析中… ' + (f.name||'') + tag);
    try{
      const fd = new FormData();
      fd.append('file', f);
    fd.append('reaction', (typeof activeReaction!=='undefined' && activeReaction==='OER') ? 'OER' : 'OCM');
      const res = await fetch(backendBase + '/api/realdataparse', {method:'POST', body: fd});
      const j = await res.json();
      if(j && j.saved) refreshRealDataList();
      // 首个可解析的表格作为本轮反馈（其余文件已存档到 RealData）
      if(!firstParsed && j && j.accepted){
        firstParsed = j;
        renderRealDataParse(j);
      } else if(!firstParsed){
        // 尚未解析到可用表格：仍提示（如 .tif 仅存档、或该文件无产率列）
        renderRealDataParse(j);
      }
      rdShowProgress('');
    }catch(e){
      rdShowProgress('');
      rdShowMsg('上传失败：' + (e.message||e), 'err');
    }
  }
  if(!firstParsed){
    rdShowMsg('所选文件中没有可解析的产率/选择性表格（.tif 等图像仅存档，需另配 .csv/.xlsx 录入数值）。', 'err');
  }
}

async function refreshRealDataList(){
  const sel = document.getElementById('rd-existing');
  try{
    const res = await fetch(backendBase + '/api/realdatalist', {method:'GET', cache:'no-store'});
    const j = await res.json();
    const files = (j && j.files) || [];
    if(!files.length){ sel.innerHTML = '<option value="">（RealData 中暂无文件）</option>'; return; }
    sel.innerHTML = '<option value="">— 选择已存文件 —</option>' + files.map(f=>`<option value="${f.name}">${f.name} (${f.ext}, ${(f.size/1024).toFixed(1)}KB)</option>`).join('');
  }catch(e){
    sel.innerHTML = '<option value="">（无法连接后端列出文件）</option>';
  }
}

// 打开弹窗；opts.gate=true 表示作为真实实验阶段的闸门（暂停循环，等待应用/关闭后 resolve）
function openRealDataModal(opts){
  opts = opts || {};
  _rdModal = {open:true, acceptedRows:null, pendingResolve:null, gateMode:!!opts.gate, parsedForCand: opts.candidate||null};
  const m = document.getElementById('realdata-modal');
  m.classList.add('show');
  document.getElementById('rd-apply').disabled = true;
  document.getElementById('rd-parse').className='rd-parse';
  rdShowMsg('', '');
  rdShowProgress('');
  document.getElementById('rd-skip').textContent = opts.gate ? '关闭（保存进度，用模拟值继续）' : '关闭';
  refreshRealDataList();
  if(opts.gate){
    // 暂停主循环，等待用户操作
    if(typeof running!=='undefined') running = false;
    const bp = document.getElementById('btn-play'); if(bp) bp.textContent='▶ 运行';
    rdShowProgress('⏸ 主循环已暂停，等待你录入真实实验数据（可跳过用模拟值）。');
  }
  return new Promise((resolve)=>{ _rdModal.pendingResolve = resolve; });
}
function closeRealDataModal(appliedRows){
  const m = document.getElementById('realdata-modal');
  m.classList.remove('show');
  _rdModal.open = false;
  const r = _rdModal.pendingResolve;
  _rdModal.pendingResolve = null;
  rdShowProgress('');
  if(r) r(appliedRows || null);
}

// 把解析出的真实记录，按当前候选（catalyst/doi）匹配出这一轮的实测值
function pickRealMeasurementForCurrent(rows){
  if(!rows || !rows.length) return null;
  if(typeof curCand === 'undefined' || !curCand) return rows[0];
  const candKey = (curCand.metal||'') + '/' + (curCand.support_display||curCand.support||'');
  const candDoi = curCand.doi || null;
  // 1) 精确催化剂名匹配
  let hit = rows.find(r => r.catalyst && candKey.toLowerCase().includes(r.catalyst.toLowerCase()));
  if(hit) return hit;
  // 2) DOI 匹配
  if(candDoi) hit = rows.find(r => r.doi && candDoi.toLowerCase().includes(r.doi.toLowerCase()));
  if(hit) return hit;
  // 3) 单行表直接采用
  if(rows.length === 1) return rows[0];
  return null;  // 多行且无法匹配 → 让用户在前端无法自动定位，回退模拟（不强行套用错误行）
}

let backendBase = '';
let backendOk = false;
let modelReady = false;      // 真实 7B（Ollama）可用性，来自 /api/health 的 model.ok，避免徽章写死「可用」
window.__lastProbeErr = '';   // 最近一次探针失败原因（供决策卡展示可操作诊断）
(async function(){
  const badge = document.createElement('div');
  badge.id = 'wm-backend-badge';
  badge.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;background:rgba(239,68,68,.16);color:#991b1b;border:1px solid rgba(239,68,68,.5);backdrop-filter:blur(8px);transition:.3s;cursor:pointer;';
  badge.title = '点击重试连接后端。若长期红灯：在本机终端进入 wm_backend 目录运行 `python -m uvicorn main:app --host 127.0.0.1 --port 8000`（需先 `ollama serve` 并 `ollama pull qwen2.5:7b`）；随后浏览器打开 http://127.0.0.1:8000/ 即同源绿灯。';
  badge.textContent = '后端连接中…';
  document.body.appendChild(badge);

  const params = new URLSearchParams(location.search);
  const override = params.get('backend');
  const CANDIDATES = override
    ? [override.replace(/\/$/, ''), '', 'http://127.0.0.1:8000', 'http://localhost:8000']
    : ['', 'http://127.0.0.1:8000', 'http://localhost:8000'];

  /* 调试面板：直接在页面上显示探测过程（方便排查"后端未连接"问题） */
  const dbgPanel = document.createElement('pre');
  dbgPanel.id = 'wm-dbg-panel';
  dbgPanel.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;padding:8px 12px;border-radius:8px;font-size:11px;background:rgba(0,0,0,.85);color:#0f0;border:1px solid #333;max-width:420px;max-height:200px;overflow:auto;font-family:monospace;white-space:pre-wrap;';
  document.body.appendChild(dbgPanel);
  const _dbgLines = [];
  function dblog(msg){
    // 只保留最近 40 行，避免长时间运行时 textContent 无限累加（内存泄漏）
    _dbgLines.push('[' + (Date.now() % 100000) + '] ' + msg);
    if(_dbgLines.length > 40) _dbgLines.shift();
    if(dbgPanel.isConnected) dbgPanel.textContent = _dbgLines.join('\n');
    console.log('[WM-BE]', msg);
  }

  async function probe(base){
    const tag = base || '(同源)';
    try{
      dblog('probe: '+tag);
      const ctrl = new AbortController();
      const tid = setTimeout(()=>ctrl.abort(), 12000);  // 放宽到12s，抗瞬时慢查询（避免探针偶发 AbortError 误判未连）
      const t0 = performance.now();
      const res = await fetch(base + '/api/health', {method:'GET', mode:'cors', cache:'no-store', signal:ctrl.signal});
      const ms = Math.round(performance.now()-t0);
      clearTimeout(tid);
      dblog('  status='+res.status+' ok='+res.ok+' ms='+ms);
      if(!res.ok){ window.__lastProbeErr = tag+' 健康检查返回 '+res.status; dblog('  ✗ !res.ok'); return false; }
      const text = await res.text();
      dblog('  body_len='+text.length+' preview='+text.substring(0,120));
      let j; try{ j=JSON.parse(text); }catch(e){ window.__lastProbeErr = tag+' 健康响应不是合法 JSON'; dblog('  ✗ JSON parse error: '+e.message); return false; }
      const ok = !!(j && j.ok);
      dblog('  j.ok='+j.ok+' ⇒ '+(ok?'✅ PASS':'✗ FAIL'));
      if(!ok) window.__lastProbeErr = tag+' 健康响应 ok≠true';
      // 同步真实 7B 可用性（health.model.ok），徽章/决策卡据实显示，不再写死「7B 可用」
      modelReady = !!(j && j.model && j.model.ok);
      dblog('  model.ok='+modelReady);
      return ok;
    }catch(e){
      // 典型：HTTPS 预览页 → HTTP 后端被浏览器判为混合内容（Mixed Content）拦截；
      //       或 file:// 直接打开、或后端尚未启动。错误名多为 TypeError / Failed to fetch。
      window.__lastProbeErr = tag+' 请求异常：'+(e.name||'Error')+' - '+(e.message||e);
      dblog('  ✗ exception: '+e.name+' '+e.message);
      return false;
    }
  }
  async function findBackend(){
    // 已知可用地址时只探测它一次（1 个请求），避免每次心跳都遍历整个候选列表
    if(backendOk){
      if(await probe(backendBase)) return backendBase;
      dblog('心跳失败，回退到全量候选探测');
    }
    for(const base of CANDIDATES){
      if(await probe(base)) return base;
    }
    return null;
  }

  let _probing = false;
  let _consecFails = 0;                  // 连续探针失败计数：仅连续 3 次才判「未连」，抗单次抖动
  async function refresh(){
    if(_probing) return;               // 重入守卫：手动点击与心跳可能撞车
    _probing = true;
    try{
      dblog('--- refresh() 开始 ---');
      const found = await findBackend();   // null=未找到；''=同源；其他=绝对URL
      if(found !== null){
        // 探针成功：后端存活 → 恢复绿灯，连续失败计数清零
        backendOk = true;
        backendBase = found;
        _consecFails = 0;
        window.__lastProbeErr = '';        // 连通成功后清掉陈旧错误
      } else {
        // 探针失败：累计连续失败；连续 3 次（约 30s）才判「未连」，避免单次网络抖动误杀
        _consecFails++;
        if(_consecFails >= 3){
          backendOk = false;
          backendBase = 'http://127.0.0.1:8000';
          dblog('连续 '+_consecFails+' 次探针失败 → 判未连');
        } else {
          dblog('探针失败 #'+_consecFails+'（暂维持上次状态，避免闪烁）');
        }
      }
      badge.style.background = backendOk ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.16)';
      badge.style.color = backendOk ? '#065f46' : '#991b1b';
      badge.style.borderColor = backendOk ? 'rgba(5,150,105,.55)' : 'rgba(239,68,68,.5)';
      badge.textContent = backendOk
        ? (modelReady ? '🟢 已连后端（7B 策略可用）' : '🟢 已连后端（7B 暂不可用·确定性回退）')
        : '🔴 后端未连接（本地确定性回退）';
      dblog('结果: backendOk='+backendOk+' base='+backendBase);
      // 连接成功后直接把调试面板移出 DOM（不再累积文本）；失败时挂回来辅助排查
      if(backendOk){
        if(dbgPanel.isConnected) dbgPanel.remove();
      }else{
        if(!dbgPanel.isConnected) document.body.appendChild(dbgPanel);
        dbgPanel.textContent = _dbgLines.join('\n');
        dbgPanel.style.display = 'block';
      }
    } finally { _probing = false; }
  }

  /* 自适应心跳：未连接时 10s 快速重试；已连接时 60s 轻量心跳（仅 1 个请求）。
     标签页隐藏时完全暂停轮询，切回前台立即补一次 —— 避免多标签页把 /api/health 刷屏。*/
  const POLL_DOWN = 10000, POLL_UP = 15000;   // 已连接时也 15s 心跳，避免长时间卡在误判的红灯
  let _timer = null;
  function schedule(){
    clearTimeout(_timer);
    if(typeof document!=='undefined' && document.hidden) return;   // 后台标签不轮询
    _timer = setTimeout(async ()=>{ await refresh(); schedule(); }, backendOk ? POLL_UP : POLL_DOWN);
  }
  if(typeof document!=='undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden){ clearTimeout(_timer); }
      else { refresh().then(schedule); }                            // 回到前台立刻校准一次
    });
  }
  badge.addEventListener('click', ()=>{
    // 未连通时（多为 HTTPS 预览页混合内容拦截）：点击徽章直接在新标签打开同源本地地址
    if(!backendOk){ try{ window.open('http://127.0.0.1:8000/','_blank'); }catch(e){} }
    refresh().then(schedule);
  });
  refresh().then(schedule);
})();

/* 7B 主动学习决策：接 /api/next（Qwen2.5-7B 策略器），非法/离线则本地确定性兜底 */
async function pickNextCandidate(){
  // 1) 用户配方优先（后端不掌握这些本地配方）
  const ur = USER_RECIPES.find(r=>!sampled[r.doi]);
  if(ur) return ur;
  // 2) 后端可达且开启 7B 时，咨询模型决策（甲烷与 OER 轨道均经后端 /api/next）
  const use7b = document.getElementById('use7b');
  if(backendOk && (!use7b || use7b.checked)){
    try{
      const ctx = {
        sampled: Object.keys(sampled).filter(k=>sampled[k]),
        measured: measured.map(m=>({doi:m.doi, y:m.y})),
        iteration: iter,
        mae: mae,
        mae_n: maeN,
        recipe_mod: 1,
        reaction: activeReaction,
        oer_target: oerTarget,
        acquisition: ACQ_STRATEGY,
        data_mode: DATA_MODE,
        real_after_iter: REAL_AFTER_ITER,
      };
      // 模型冷加载期间等待预热完成（首次启动约 1–2 分钟）：轮询 /api/health 直至
      // warmup_done=true 再咨询 7B，避免首轮撞冷加载超时 → 误回退确定性采集；
      // 就绪后热路径生成仅数秒，不影响后续所有轮次。
      if(backendOk){
        var _w0=Date.now();
        while(Date.now()-_w0 < 100000){
          var _hd=null;
          try{ _hd=await fetch(backendBase+'/api/health',{cache:'no-store'}).then(function(r){return r.json();}); }catch(_he){}
          if(_hd && _hd.warmup_done===true) break;
          await new Promise(function(res){setTimeout(res,2000);});
        }
      }
      const _ac=new AbortController(); const _at=setTimeout(()=>_ac.abort(),70000);  // ≥后端55s strategize 预算+开销，避免前端先 abort 误判本地回退
      const res = await fetch(backendBase + '/api/next', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(ctx), signal:_ac.signal});
      clearTimeout(_at);
      let j;
      try { j = await res.json(); }
      catch(e){ throw new Error('后端返回非 JSON（可能为 5xx）'); }   // 统一冒泡到 catch → 走兜底
      // 信任后端已校验的候选：后端 next_endpoint 已保证 next_id ∈ 未采样池，候选合法。
      // 不再用前端 POOL.id 比对——前端 POOL.id 是「active!==false 过滤后的数组下标」，
      // 与后端候选的真实数据 id（如 138）是两套编号，比对永远失败 → 后端决策被整包丢弃、退化成前端本地兜底。
      if(j && j.candidate && !sampled[j.candidate.doi]){
        if(j.strategy || j.rationale) log('ai', `🧠 7B 策略（${j.strategy||''}）：${j.rationale||''}`);
        // 后端权威实测/MAE 审计载荷，挂在候选上供 onOpComplete 直接采用（消除日志时序歧义）
        j.candidate.__audit = j;
        return j.candidate;
      }
      // 后端已响应（2xx）但候选非法/已采样：沿用后端自身回退理由（如有），不再显示夸张的「未能收到」文案
      if(j && j.candidate){
        const _fb = (activeReaction==='OER') ? pickCandidateOER() : pickCandidate();
        _fb.__audit = Object.assign({}, j, {used_model:false, strategy:'deterministic-fallback',
                        rationale: (j.rationale || '后端决策被校验闸门丢弃，已回退确定性采集')});
        return _fb;
      }
    }catch(e){
      // 在线策略请求挂起/异常 → 回退本地确定性采集；此处不翻转 backendOk（由探针+连续失败机制
      // 独占判定），避免单次请求异常误杀「后端已连」状态。给候选挂一份与后端回退一致的审计载荷，
      // 使决策卡始终显示「默认最优 / deterministic-fallback」，不再出现「策略 — 理由」空白态——
      // 否则会与后端回退卡片长得不同，被误判成「两个决策源来回切换」（本质都是确定性回退）。
      console.warn('[next] 后端决策请求未响应/异常（连接中断或超时），本地回退确定性采集', e);
    }
  }
  // 3) 本地确定性采集函数兜底（按反应轨道选择），并挂回退审计 payload 保证渲染一致
  const _fb = (activeReaction==='OER') ? pickCandidateOER() : pickCandidate();
  _fb.__audit = {used_model:false, strategy:'deterministic-fallback',
                 rationale:'⚠ 本轮未能收到后端决策响应（连接中断或超时）。请刷新页面并确认后端与 Ollama 在运行；已临时回退本地确定性采集。',
                 conditions_source:'default-optimal'};
  return _fb;
}

/* =========================================================
   5) 新增：表征方法库 / 理论计算 / 反应体系 / 可靠性验证 / 配方方案面板
   ========================================================= */
const CHAR_METHODS=[
  {n:'紫外-可见漫反射光谱 (UV-Vis DRS)', d:'测固体漫反射得吸收边与带隙 Eg；Tauc plot 求 Eg，指认本征吸收与缺陷态。', k:'UV-Vis'},
  {n:'ATR 红外光谱', d:'衰减全反射红外，测表面官能团与吸附态（*OH、*CO₃ 等），无需 KBr 压片。', k:'ATR-FTIR'},
  {n:'荧光光谱 (PL)', d:'稳态光致发光，测激子复合与缺陷态密度；峰位/强度反映载流子分离效率。', k:'PL'},
  {n:'荧光寿命', d:'时间分辨 PL（TCSPC），由荧光光谱仪测激子寿命，评估辐射/非辐射复合通道。', k:'寿命'},
  {n:'紫外-可见超快光谱', d:'飞秒瞬态吸收/超快可见光谱，测载流子寿命与转移动力学（fs–ns 量级）。', k:'超快'},
  {n:'X 射线衍射 (XRD)', d:'物相/晶型鉴定，比对 PDF 卡片；Scherrer 公式估晶粒尺寸。', k:'XRD'},
  {n:'BET 比表面积', d:'N₂ 吸附等温线，BET 法求比表面积，BJH 估孔径分布。', k:'BET'},
  {n:'电镜尺寸 (TEM / SEM)', d:'透射/扫描电镜下载体与催化剂纳米颗粒的尺寸、形貌与分散度。', k:'TEM'},
  {n:'同步辐射 (吸收谱等)', d:'XAS（XANES / EXAFS）测局域配位与价态；高分辨衍射、小角散射等。', k:'SR'},
  {n:'X 射线光电子能谱 (XPS)', d:'表面元素组成/价态/化学态；结合 Ar⁺ 溅射做深度剖析。', k:'XPS'},
  {n:'光电流寿命', d:'瞬态光电流/开路电压衰减，测电荷分离与复合寿命（与 PL 互补）。', k:'光电流'},
];
const THEORY_CALCS=[
  {n:'吸附能 (Adsorption Energy)', d:'DFT 计算 *CH₃、*O、*OH、*OOH 等中间体在活性位点的吸附能，是活性火山轴与选择性权衡的核心描述符。', k:'E_ads'},
  {n:'态密度 (DOS)', d:'投影态密度（PDOS）分析 d 带中心、带边位置与轨道杂化，关联载流子与吸附强度。', k:'DOS'},
  {n:'能带结构 (Band Structure)', d:'能带与带隙、价带/导带边相对 NHE 位置，判断光吸收与 redox 驱动力（氧化/还原路径）。', k:'Band'},
  {n:'电催化 OER 理论（产 H₂O₂ / O₂）', d:'OER 四电子(*OH→*O→*OOH→O₂) 与两电子(*OOH→H₂O₂) 竞争；吸附能标度关系 ΔG(*OOH)−ΔG(*OH)≈3.2 eV 决定 H₂O₂ 选择性；过电位 η 由 *OOH/*O/*OH 自由能决定。', k:'OER'},
];
const REACTIONS=[
  {n:'甲烷光催化偶联 (OCM / NOCM / MPO)', d:'本世界模型主动学习主池；产物 C₂H₆ / C₂H₄ / COₓ，受 44 条物理约束（热力学、带边、自旋选律、KIE、稳定性等）。', k:'CH₄'},
  {n:'OER 产 H₂O₂ / O₂（电催化）', d:'已接入 OER 反应轨道：内置描述符驱动候选池（IrO₂ / RuO₂ / 钙钛矿 / 氧化物 / 缺陷碳 等 12 个），按过电位 η 与两电子/四电子选择性（*OOH−*OH 标度）做主动学习闭环；理论计算见上（吸附能 / DOS / 能带 + 电催化 OER）。注：候选池为标度关系理论构造，待 DFT(合适泛函) 与实验校准。', k:'OER'},
];
function pmItems(arr){
  return arr.map(m=>`<div class="pm-item"><div class="pn">${m.n}</div><div class="pd">${m.d}</div>${m.k?`<div class="pk">${m.k}</div>`:''}</div>`).join('');
}
function openPanel(title, html){
  document.getElementById('pm-title').textContent=title;
  document.getElementById('pm-body').innerHTML=html;
  document.getElementById('panel-modal').classList.remove('hidden');
}
function closePanel(){ document.getElementById('panel-modal').classList.add('hidden'); }
function renderCharTheory(){
  const html = `<div class="pm-sec">催化剂表征方法</div>` + pmItems(CHAR_METHODS)
    + `<div class="pm-sec">理论计算（DFT / 计算）</div>` + pmItems(THEORY_CALCS);
  openPanel('🔬 表征方法库 & 理论计算', html);
}
function renderReactionsReliability(){
  const html = `<div class="pm-sec">目标反应体系</div>` + pmItems(REACTIONS)
    + `<div class="pm-sec">文献可靠性验证（判断数据是否可靠）</div>`
    + `<div class="pm-item"><div class="pn">可靠性验证流程</div><div class="pd">`
    + `① <b>DOI 溯源</b>：核对原始文献与期刊等级，确认数值来自一手实验而非二次转述。<br>`
    + `② <b>同族交叉比对</b>：与真实数据库（Zavyalova 1870 条 / CADS 12708 条）及本池近邻比较，识别离群。<br>`
    + `③ <b>离群标记</b>：needs_review / unverified_assumed 条目保留溯源但不进预测池。<br>`
    + `④ <b>重复与误差</b>：要求提供 n 次重复与误差棒；无误差/单点数据可信度下调。<br>`
    + `⑤ <b>物理可行性自检</b>：热力学(ΔG)、带边位置、器件可实现性（光强/温度/压力）是否自洽。`
    + `</div></div>`
    + `<div class="pm-note"><b>⚠ 当前问题：</b>化学体系中很多公式是<b>未知的</b>。本世界模型大量依赖经验描述符与统计近邻，缺乏第一性原理解析公式（如非平衡光-热协同、自由基链式动力学、选择性闭合解），属已知局限；理论计算（吸附能 / DOS / 能带）可部分弥补，但需 DFT 在合适泛函下补充。</div>`;
  openPanel('🎯 反应体系 & 可靠性验证', html);
}

/* =========================================================
   9) OER 反应轨道（电催化水氧化 → H₂O₂ / O₂）
   物理：*OH/*O/*OOH 吸附自由能标度；过电位 η 与两电子/四电子选择性
   注：OER_POOL 为描述符驱动的理论构造池（标度关系给出），待 DFT(合适泛函) 与实验校准
   ========================================================= */
const OER_POOL=[
  {id:9001, doi:'oer:IrO2',  metal:'IrO₂',  support:'IrO₂',  support_display:'IrO₂',  reaction:'OER', doh:1.55, stability:0.95, eg:2.0, name:'IrO₂',  note:'基准贵金属 OER：实测 η≈0.29 V，四电子主导（低 H₂O₂ 选择性）。'},
  {id:9002, doi:'oer:RuO2',  metal:'RuO₂',  support:'RuO₂',  support_display:'RuO₂',  reaction:'OER', doh:1.45, stability:0.55, eg:1.9, name:'RuO₂',  note:'高活性但 Ru 溶解严重，稳定性差。'},
  {id:9003, doi:'oer:SrIrO3',metal:'SrIrO₃',support:'SrIrO₃',support_display:'SrIrO₃',reaction:'OER', doh:1.50, stability:0.90, eg:1.7, name:'SrIrO₃',note:'钙钛矿铱酸盐：活性近 RuO₂ 且更稳定。'},
  {id:9004, doi:'oer:BSCF',  metal:'BSCF',  support:'BSCF',  support_display:'Ba₀.₅Sr₀.₅Co₀.₈Fe₀.₂O₃', reaction:'OER', doh:1.62, stability:0.80, eg:1.6, name:'BSCF',  note:'高活性钙钛矿，Co/Fe 溶解限制稳定性。'},
  {id:9005, doi:'oer:LaCoO3',metal:'LaCoO₃',support:'LaCoO₃',support_display:'LaCoO₃',reaction:'OER', doh:1.70, stability:0.82, eg:1.5, name:'LaCoO₃',note:'钴酸盐钙钛矿，析氧活性中等。'},
  {id:9006, doi:'oer:LaMnO3',metal:'LaMnO₃',support:'LaMnO₃',support_display:'LaMnO₃',reaction:'OER', doh:1.95, stability:0.85, eg:1.4, name:'LaMnO₃',note:'锰酸盐，活性偏低。'},
  {id:9007, doi:'oer:Co3O4', metal:'Co₃O₄', support:'Co₃O₄', support_display:'Co₃O₄', reaction:'OER', doh:1.80, stability:0.88, eg:1.6, name:'Co₃O₄', note:'尖晶石钴氧化物，廉价高稳定。'},
  {id:9008, doi:'oer:NiO',   metal:'NiO',   support:'NiO',   support_display:'NiO',   reaction:'OER', doh:1.95, stability:0.90, eg:3.6, name:'NiO',   note:'镍氧化物，活性偏低、稳定。'},
  {id:9009, doi:'oer:MnO2',  metal:'MnO₂',  support:'MnO₂',  support_display:'MnO₂',  reaction:'OER', doh:1.60, stability:0.80, eg:0.2, name:'MnO₂',  note:'二氧化锰，两电子路径有潜力。'},
  {id:9010, doi:'oer:Fe2O3', metal:'Fe₂O₃', support:'Fe₂O₃', support_display:'Fe₂O₃', reaction:'OER', doh:2.00, stability:0.92, eg:2.2, name:'Fe₂O₃', note:'铁氧化物，稳定但活性低。'},
  {id:9011, doi:'oer:NC',    metal:'N-碳',  support:'缺陷碳',support_display:'N 掺杂缺陷碳', reaction:'OER', doh:0.35, stability:0.92, eg:null, name:'N-碳', note:'缺陷碳位点：弱 *OH 结合 → 高 H₂O₂（两电子）选择性。'},
  {id:9012, doi:'oer:FeNC',  metal:'Fe-N-C',support:'缺陷碳',support_display:'Fe-N-C',reaction:'OER', doh:0.55, stability:0.88, eg:null, name:'Fe-N-C',note:'单原子 Fe-N-C：高 H₂O₂ 选择性、可调控。'},
];
function oerDerived(r){
  const doh=r.doh, dO=doh+1.5, dOOH=doh+3.2;                 // 标度：ΔG*O≈ΔG*OH+1.5；ΔG*OOH≈ΔG*OH+3.2 (eV)
  const steps=[doh, dO-doh, dOOH-dO, 1.23-dOOH];             // 四步自由能变化（相对 O₂/H₂O, eV）
  const eta=Math.max(0, Math.max.apply(null,steps)-1.23);    // OER 过电位（四电子）
  let sel=Math.exp(-Math.pow(dOOH-3.5,2)/(2*0.7*0.7));       // 两电子 H₂O₂ 选择性（*OOH≈3.5 eV 最佳）
  sel=Math.max(0, Math.min(0.95, sel));
  const activity=1000/(eta+0.10);                            // OER 活性分（越高越活）
  const stability=(r.stability!=null)?r.stability:0.8;
  return {doh,dO,dOOH,steps,eta,sel,activity,stability};
}
function oerReward(d, target){
  const selW=(target==='H2O2')? d.sel : (1-d.sel);
  return d.activity * selW * (0.5+0.5*d.stability);
}
function predictOER(r){
  const d=oerDerived(r);
  const unc=d.activity*0.15;                                 // 理论构造池：固定 15% 不确定度（待实验校准）
  const score=oerReward(d, oerTarget);
  return {pred:d.activity, unc, eta:d.eta, selH2O2:d.sel, score, stability:d.stability, transfer:null};
}
function oerDefaultConditions(cat){ return {T:25,R:0,I:0,G:0,V:1.6}; }
function simulateOER(cat, cond, reuse, noise){
  const d=oerDerived(cat);
  const f_stab=Math.pow(1-0.04, Math.max(0, reuse|0));       // 复用衰减（与甲烷同源逻辑）
  let Y=d.activity*f_stab;
  if(noise!=null){ Y=Y*(1+(Math.random()*2-1)*noise); }
  const s_eff=d.sel*100;
  const reward=oerRewardNorm(d, oerTarget, reuse);
  return {Y, s_eff, eta:d.eta, selH2O2:d.sel, reward, opt:null, cond:(cond||{T:25}), y_lit:null, s_lit:s_eff, oer:true};
}
function oerConstraints(r){
  const d=oerDerived(r); const out=[];
  out.push({k:'thermo', name:'① OER 热力学（1.23 V 基准）', st:(d.eta<0.4?'pass':'warn'),
    d:`四步自由能 ΔG=[${d.steps.map(x=>x.toFixed(2)).join(', ')}] eV；过电位 η≈${d.eta.toFixed(2)} V（理论下限≈0.37 V，受 *OOH−*OH 标度限制）。`});
  out.push({k:'scale', name:'② 吸附能标度关系', st:'pass',
    d:`ΔG(*OOH)−ΔG(*OH)≈3.2 eV（经验标度）；本候选 ΔG*OH=${d.doh.toFixed(2)}、ΔG*O=${d.dO.toFixed(2)}、ΔG*OOH=${d.dOOH.toFixed(2)} eV。`});
  out.push({k:'sel', name:'③ 两电子/四电子选择性', st:(oerTarget==='H2O2'?(d.sel>0.5?'pass':'warn'):(d.sel<0.5?'pass':'warn')),
    d:`目标 ${oerTarget}：当前 H₂O₂ 选择性 ≈ ${(d.sel*100).toFixed(0)}%（*OOH 结合 ${d.dOOH.toFixed(2)} eV，${d.dOOH<3.5?'偏弱→偏两电子':'偏强→偏四电子'}）。`});
  out.push({k:'stab', name:'④ 稳定性', st:(d.stability>0.8?'pass':(d.stability>0.6?'warn':'fail')),
    d:`结构/溶解稳定性因子 ≈ ${d.stability.toFixed(2)}（${d.stability>0.8?'良好':'需关注溶解/衰减'}）。`});
  out.push({k:'lod', name:'⑤ 当前问题（公式未知）', st:'warn',
    d:`化学体系中很多公式是未知的：本 OER 活性由 *OH/*O/*OOH 标度近似给出，真实过电位需 DFT(PBE+HSE06) 校准；两电子路径动力学亦缺闭合解。`});
  return out;
}
function oerPhysFactor(r){
  const C=oerConstraints(r); let f=1;
  for(const c of C){ if(c.st==='fail')f*=0.72; else if(c.st==='warn')f*=0.96; }
  return Math.max(0.55, Math.min(1.08, f));
}
function drawOERBand(r){
  const cv=document.getElementById('band-chart'); if(!cv) return;
  const w=cv.clientWidth||300, h=cv.clientHeight||120;
  if(w<10||h<10) return;
  const _bw=Math.min(4096,Math.round(w*DPR)), _bh=Math.min(4096,Math.round(h*DPR));
  if(cv.width!==_bw) cv.width=_bw;
  if(cv.height!==_bh) cv.height=_bh;
  const ctx=cv.getContext('2d'); ctx.save(); ctx.scale(DPR,DPR); ctx.clearRect(0,0,w,h);
  const d=oerDerived(r);
  const t=document.getElementById('band-title'); if(t) t.textContent='OER 自由能阶梯 (eV vs RHE)';
  const lv=[0,d.doh,d.dO,d.dOOH,0], labs=['*+H₂O','*OH','*O','*OOH','*+O₂'];
  const maxV=Math.max(d.dOOH,1.23)*1.12+0.2;
  const x0=40,x1=w-12,padT=10,padB=16;
  const xOf=i=>x0+(x1-x0)*(i/(lv.length-1));
  const yOf=v=>padT+(1-v/maxV)*(h-padT-padB);
  ctx.strokeStyle='rgba(241,196,15,.85)'; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(x0,yOf(1.23)); ctx.lineTo(x1,yOf(1.23)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='#b45309'; ctx.font='9px sans-serif'; ctx.fillText('1.23 V', 4, yOf(1.23)-3);
  for(let i=0;i<lv.length;i++){
    const x=xOf(i),y=yOf(lv[i]);
    ctx.fillStyle=(i>0&&i<4)?'#5ee7df':'rgba(94,231,223,.35)';
    ctx.beginPath(); ctx.arc(x,y,4,0,7); ctx.fill();
    ctx.fillStyle='rgba(71,85,105,.95)'; ctx.font='9px sans-serif'; ctx.fillText(labs[i], Math.min(x,x1-26), y-6);
    if(i<lv.length-1){
      const y2=yOf(lv[i+1]);
      ctx.strokeStyle='rgba(94,231,223,.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(xOf(i+1),y2); ctx.stroke();
      ctx.fillStyle='#94a3b8'; ctx.font='8px sans-serif'; ctx.fillText((lv[i+1]-lv[i]).toFixed(2), (x+xOf(i+1))/2-10, (y+y2)/2-3);
    }
  }
  ctx.fillStyle='#e67e22'; ctx.font='bold 11px sans-serif';
  ctx.fillText('η≈'+d.eta.toFixed(2)+' V · H₂O₂选择性≈'+(d.sel*100).toFixed(0)+'%', 6, h-2);
  ctx.restore();
}
function drawOERVolcano(r){
  const cv=document.getElementById('volcano-chart'); if(!cv) return;
  const w=cv.clientWidth||300, h=cv.clientHeight||120;
  if(w<10||h<10) return;
  const _bw=Math.min(4096,Math.round(w*DPR)), _bh=Math.min(4096,Math.round(h*DPR));
  if(cv.width!==_bw) cv.width=_bw;
  if(cv.height!==_bh) cv.height=_bh;
  const ctx=cv.getContext('2d'); ctx.save(); ctx.scale(DPR,DPR); ctx.clearRect(0,0,w,h);
  const t=document.getElementById('volcano-title'); if(t) t.textContent='OER 过电位 vs ΔG*OH（圈色=H₂O₂选择性）';
  const padL=26,padR=10,padT=10,padB=18;
  const xs=OER_POOL.map(p=>oerDerived(p).doh), ys=OER_POOL.map(p=>oerDerived(p).eta);
  const xmin=Math.min.apply(null,xs)-0.1, xmax=Math.max.apply(null,xs)+0.1;
  const ymin=0, ymax=Math.max.apply(null,ys.concat([0.6]))*1.1;
  const xOf=v=>padL+(v-xmin)/(xmax-xmin)*(w-padL-padR);
  const yOf=v=>padT+(1-(v-ymin)/(ymax-ymin))*(h-padT-padB);
  ctx.strokeStyle='rgba(148,163,184,0.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL,h-padB); ctx.lineTo(w-padR,h-padB); ctx.stroke();
  ctx.fillStyle='#94a3b8'; ctx.font='9px sans-serif'; ctx.fillText('η(V)',2,padT+8); ctx.fillText('ΔG*OH',w-44,h-5);
  for(const p of OER_POOL){
    const d=oerDerived(p), x=xOf(d.doh), y=yOf(d.eta);
    const isCur=(r&&p.doi===r.doi);
    const g=Math.round(d.sel*200);
    ctx.beginPath(); ctx.arc(x,y,isCur?7:5,0,7);
    ctx.fillStyle='rgba('+(230-g)+','+Math.round(120+g*0.3)+','+Math.round(40+g*0.6)+','+(isCur?1:0.75)+')';
    ctx.fill();
    if(isCur){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#cfe8ff'; ctx.font='9px sans-serif'; ctx.fillText(p.name,x+8,y-6); }
  }
  ctx.restore();
}
function renderOERSpectro(r){ /* OER 无 PL/UV 光谱概念，留空（信息见自由能阶梯图） */ }

function renderRecipePanel(){
  const box=document.getElementById('rp-body'); if(!box) return;
  if(!USER_RECIPES || USER_RECIPES.length===0){
    box.innerHTML='<div class="rp-empty">暂无配方方案。<br>点设备弹窗「▶ 让 AI 按此条件执行」导出一个配方。</div>';
    return;
  }
  box.innerHTML = USER_RECIPES.map(r=>{
    const devs = r.recipe ? Object.keys(r.recipe).map(k=>DEV[k]?DEV[k].name:'').filter(Boolean).join('、') : '—';
    return `<div class="rp-item"><div class="ri-t">${r.doi||'配方'}</div>`
      + `<div class="ri-d">基底：${r.metal||'—'} / ${r.support||'—'}<br>`
      + `合成调制因子 ≈ ${(r.recipeMod!=null?r.recipeMod.toFixed(2):'—')}<br>设备：${devs}</div></div>`;
  }).join('');
}
document.getElementById('btn-char').addEventListener('click', renderCharTheory);
document.getElementById('btn-react').addEventListener('click', renderReactionsReliability);
function setReaction(react){
  activeReaction = react;
  const rb=document.getElementById('btn-reaction');
  const tw=document.getElementById('oer-target-wrap');
  const bt=document.getElementById('btn-oer-target');
  const t1=document.getElementById('band-title'), t2=document.getElementById('volcano-title'), t3=document.getElementById('neb-title');
  if(react==='OER'){
    if(rb) rb.textContent='⚗ 反应：OER';
    if(tw) tw.style.display='';
    if(bt) bt.textContent='🎯 OER 目标：'+(oerTarget==='H2O2'?'H₂O₂':'O₂');
    if(t1) t1.textContent='OER 自由能阶梯 (eV vs RHE)';
    if(t2) t2.textContent='OER 过电位 vs ΔG*OH（圈色=H₂O₂选择性）';
    if(t3) t3.textContent='（OER 无 NEB 路径）';
  }else{
    if(rb) rb.textContent='⚗ 反应：甲烷';
    if(tw) tw.style.display='none';
    if(t1) t1.textContent='能带结构 vs NHE (eV)';
    if(t2) t2.textContent='EOV–ΔE*CH₃ 双描述符火山';
    if(t3) t3.textContent='NEB ·CH₃+·CH₃→C₂H₆ 能垒（示意）';
  }
  running=false; iter=0; loopState='idle'; curCand=null; curPredY=0; curMeasY=0;
  emaY=null; mae=0; maeN=0; rmae=0; rmaeN=0; sampled={}; measured=[]; supportReuse={};
  best={name:'—',y:-1,s:-1,rec:null};
  const bp=document.getElementById('btn-play'); if(bp) bp.textContent='▶ 运行';
  const it=document.getElementById('iter-tag'); if(it) it.textContent='迭代 #0';
  log('ai', `○ 已切换至 <b>${react==='OER'?'OER 电催化（→ H₂O₂/O₂）':'甲烷光催化偶联'}</b> 反应轨道，循环状态已重置；点「▶ 运行」开始该反应的主动学习闭环。`);
  refreshBest();
}
document.getElementById('btn-reaction').addEventListener('click', ()=> setReaction(activeReaction==='OER'?'CH4':'OER'));
document.getElementById('btn-oer-target').addEventListener('click', ()=>{
  oerTarget = (oerTarget==='H2O2')?'O2':'H2O2';
  const bt=document.getElementById('btn-oer-target'); if(bt) bt.textContent='🎯 OER 目标：'+(oerTarget==='H2O2'?'H₂O₂':'O₂');
  log('ai', `○ OER 目标产物切换为 <b>${oerTarget==='H2O2'?'H₂O₂（两电子）':'O₂（四电子）'}</b>；后续主动学习按此权衡活性×选择性×稳定性。`);
  if(curCand && activeReaction==='OER'){ renderConstraints(curCand); }
});

document.getElementById('pm-close').addEventListener('click', closePanel);
document.getElementById('panel-modal').addEventListener('click', e=>{ if(e.target.id==='panel-modal') closePanel(); });
document.getElementById('rp-head').addEventListener('click', ()=>{
  const b=document.getElementById('rp-body'); const t=document.getElementById('rp-toggle');
  const hidden = b.style.display==='none';
  b.style.display = hidden ? 'block' : 'none';
  t.textContent = hidden ? '▾' : '▸';
});
renderRecipePanel();
setInterval(renderRecipePanel, 1200);

// ===== 采集策略选择器 + 主动学习评价按钮 =====
(function(){
  const sel=document.getElementById('acq-strategy');
  if(sel){
    if(!sel.value) sel.value=ACQ_STRATEGY;
    sel.addEventListener('change',e=>{
      ACQ_STRATEGY=e.target.value;
      log('ai',`⚙️ 采集策略切换为 ${ACQ_STRATEGY}（β 退火：早期探索 / 后期利用）`);
      try{ drawBetaCurve(); }catch(err){}
      if(backendOk){ fetch(backendBase+'/api/acquisition',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({strategy:ACQ_STRATEGY})}).catch(()=>{}); }   // 同步后端默认策略
    });
  }
  const btn=document.getElementById('btn-eval');
  if(btn) btn.addEventListener('click', ()=>{ runEvaluation({auto:false}); });
  const ae=document.getElementById('auto-eval');
  if(ae){
    AUTO_EVAL=!!ae.checked;
    ae.addEventListener('change',e=>{
      AUTO_EVAL=!!e.target.checked;
      log('ai', AUTO_EVAL?'⚙️ 自动评价已开启：每轮闭环结束自动重算指标并刷新遗憾趋势。'
                        :'⚙️ 自动评价已关闭：改为手动点「📊 评价」触发。');
      if(AUTO_EVAL) scheduleAutoEval();
    });
  }
})();

async function runEvaluation(opts){
  opts=opts||{};
  const box=document.getElementById('eval-body'); if(!box) return;
  if(_evalBusy) return;                      // 上一次评价未结束：跳过（避免高倍速下堆积）
  const sampledSet=new Set(Object.keys(sampled).filter(k=>sampled[k]));
  if(sampledSet.size===0){
    if(!opts.auto) box.innerHTML='<div class="cdim">尚未采样——先点 ▶ 运行 至少一轮再评价。</div>';
    return;
  }
  _evalBusy=true;
  try{
  if(!opts.auto) box.innerHTML='<div class="cdim">⏳ 正在基于当前轨迹计算评价指标…</div>';
  // 构造 trajectory（含真实 ground truth，由世界模型最优条件模拟）
  const pool=(activeReaction==='OER')?OER_POOL:POOL;
  const traj=[];
  for(const doi of sampledSet){
    const c=pool.find(r=>r.doi===doi); if(!c) continue;
    const pr=(activeReaction==='OER')?predictOER(c):predict(c);
    const cond=defaultConditions(c);
    const sim=(activeReaction==='OER')?simulateOER(c,cond,0,null):simulateExperiment(c,cond,0,null);
    const trueObs = (measured.find(m=>m.doi===doi)) ? measured.find(m=>m.doi===doi).y : sim.Y;
    traj.push({cand:c, pred:pr.pred, unc:pr.unc, true:trueObs, true_reward:sim.reward,
               reward_breakdown:{contrib:contribFromReward(sim.reward, c, cond, 0, sim)}, iteration:0});
  }
  // 优先调用后端 /api/evaluate（若可用），否则本地近似
  let res=null;
  if(backendOk){
    try{
      const r=await fetch(backendBase+'/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sampled_ids:[...sampledSet], measured:measured.map(m=>({doi:m.doi,y:m.y})), reaction:activeReaction, oer_target:oerTarget, topk:10})});
      if(r.ok) res=await r.json();
    }catch(e){ /* 回退本地 */ }
  }
  if(!res){
    // 离线回退：本地计算遗憾 / Top-k / 校准 / 覆盖 / 奖励归因
    const truth=groundTruthRank(pool);            // 全池真值（缓存，避免每轮重算 380×simulate）
    const trueArr=traj.map(t=>t.true);
    const bestTrue=truth.bestY;                   // 全局最优（整池），而非仅已采样
    const bestFound=Math.max.apply(null, trueArr);
    let cum=0; for(const y of trueArr) cum+=Math.max(0,bestTrue-y);   // 累计遗憾 vs 全局最优
    const simple=Math.max(0,bestTrue-bestFound);                      // 简单遗憾：还差多少
    const topkIds=truth.ranked.slice(0,10);
    const hit=topkIds.filter(id=>sampledSet.has(id)).length;
    // 校准（z=1.96）
    let cover=0, widths=[];
    for(const t of traj){ const lo=t.pred-1.96*t.unc, hi=t.pred+1.96*t.unc; widths.push(hi-lo); if(lo<=t.true&&t.true<=hi) cover++; }
    const n=traj.length;
    // 探索覆盖（已采样集平均成对描述符距离）
    const recs=traj.map(t=>t.cand); let ds=[];
    for(let i=0;i<recs.length;i++) for(let j=i+1;j<recs.length;j++) ds.push(dist(recs[i],recs[j]));
    const cov=ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0;
    res={ n_samples:n,
      regret:{best_true:bestTrue, best_found:bestFound, simple_regret:simple, cumulative_regret:cum},
      topk:{k:10, hit, recall:hit/10},
      calibration:{picp:n?cover/n:null, sharpness:widths.length?widths.reduce((a,b)=>a+b,0)/widths.length:null},
      coverage:cov, reward_contrib:contribAgg(traj) };
  }
  renderEval(box, res);
  // 记录趋势点（同一 iter 覆盖，避免手动+自动重复入栈）
  const pt={ iter:iter,
             simple:(res.regret&&res.regret.simple_regret)||0,
             cum:(res.regret&&res.regret.cumulative_regret)||0,
             recall:(res.topk&&res.topk.recall!=null)?res.topk.recall:0,
             picp:(res.calibration&&res.calibration.picp!=null)?res.calibration.picp:null };
  const li=EVAL_HIST.length-1;
  if(li>=0 && EVAL_HIST[li].iter===pt.iter) EVAL_HIST[li]=pt; else EVAL_HIST.push(pt);
  if(EVAL_HIST.length>200) EVAL_HIST.shift();
  drawRegretCurve(); drawBetaCurve();
  if(!opts.auto) log('ai',`📊 评价完成：n=${res.n_samples} · 简单遗憾 ${(pt.simple).toFixed(0)} · Top-10 召回 ${(pt.recall*100).toFixed(0)}% · PICP ${pt.picp!=null?(pt.picp*100).toFixed(0)+'%':'—'}`);
  } finally { _evalBusy=false; }
}

// 全池真值排名（按当前反应轨道缓存；用于 Top-k 与全局最优遗憾基准。缓存变量见顶部状态区）
function groundTruthRank(pool){
  const key=activeReaction+'|'+(activeReaction==='OER'?oerTarget:'')+'|'+pool.length;
  if(_truthCache[key]) return _truthCache[key];
  const rows=[];
  for(const r of pool){
    let y=0;
    try{
      y=(activeReaction==='OER') ? oerDerived(r).activity*0.88
                                 : simulateExperiment(r, defaultConditions(r), 0, null).Y;
    }catch(e){ y=0; }
    rows.push([r.doi, y]);
  }
  rows.sort((a,b)=>b[1]-a[1]);
  const out={ ranked:rows.map(x=>x[0]), bestY:rows.length?rows[0][1]:0,
              yById:Object.fromEntries(rows) };
  _truthCache[key]=out;
  return out;
}
function contribFromReward(reward, c, cond, reuse, sim){
  // 用归一化分项（与后端 contrib 同口径）近似：按比例拆分 reward 为 5 项
  const eov=(c.eov!=null)?c.eov:2.8, bg=(c.bg!=null)?c.bg:2.8;
  const f_ox_sel=(sim.factors&&sim.factors.ox!=null)?sim.factors.ox:null;
  const f_pt=(sim.factors&&sim.factors.pt!=null)?sim.factors.pt:null;
  const s_eff=sim.s_eff||0;
  const tmp=rlRewardNorm(sim.Y||1, s_eff, cond, reuse, f_ox_sel, f_pt, eov); // 仅用于结构占位
  const n_y=_normYield(sim.Y||0), n_s=_clamp(s_eff/100,0,1);
  const decay=1-Math.pow(1-0.04,Math.max(0,reuse|0)), n_stab=1-decay;
  const n_energy=1-_normEnergy((cond&&cond.T)||700,(cond&&cond.I)||100);
  let cox=(f_ox_sel!=null&&f_pt!=null)?1-_clamp(f_ox_sel*f_pt,0,1):1-n_s; const n_cox=1-_clamp(cox,0,1);
  return { yield:RW.yield*n_y, selectivity:RW.selectivity*n_s, stability:RW.stability*n_stab, energy:RW.energy*n_energy, cox:RW.cox*n_cox };
}
function contribAgg(traj){
  const agg={}; for(const t of traj){ const c=t.reward_breakdown&&t.reward_breakdown.contrib; if(!c) continue;
    for(const k in c) agg[k]=(agg[k]||0)+c[k]; }
  const tot=Object.values(agg).reduce((a,b)=>a+b,0)||1;
  const out={}; for(const k in agg) out[k]={sum:agg[k], share:agg[k]/tot}; return out;
}
function renderEval(box, res){
  const r=res.regret||{}, tk=res.topk||{}, cal=res.calibration||{}, rc=res.reward_contrib||{};
  const picp=(cal.picp!=null)?(cal.picp*100).toFixed(0)+'%':'—';
  const shar=(cal.sharpness!=null)?Math.round(cal.sharpness):'—';
  let html=`<div class="ev-row"><span>采样步数</span><b>${res.n_samples??0}</b></div>`;
  html+=`<div class="ev-row"><span>简单遗憾 (best_found vs 全局最优)</span><b>${(r.simple_regret||0).toFixed(0)}</b></div>`;
  html+=`<div class="ev-row"><span>累计遗憾</span><b>${(r.cumulative_regret||0).toFixed(0)}</b></div>`;
  html+=`<div class="ev-row"><span>Top-${tk.k||10} 召回</span><b>${(tk.hit||0)}/${(tk.k||10)} (${(tk.recall!=null?(tk.recall*100).toFixed(0):'—')}%)</b></div>`;
  html+=`<div class="ev-row"><span>预测区间覆盖 PICP (z=1.96)</span><b>${picp}</b></div>`;
  html+=`<div class="ev-row"><span>区间锐度 (均宽)</span><b>${shar}</b></div>`;
  html+=`<div class="ev-row"><span>探索覆盖 (dist 均值)</span><b>${(res.coverage!=null?res.coverage.toFixed(2):'—')}</b></div>`;
  html+=`<div class="ev-sub">奖励归因（分项累计贡献占比）</div>`;
  const order=['yield','selectivity','stability','energy','cox'];
  const label={yield:'产率',selectivity:'选择性',stability:'稳定性',energy:'能耗',cox:'COx惩罚'};
  for(const k of order){ if(rc[k]) html+=`<div class="ev-bar"><span>${label[k]||k}</span><div class="bar"><i style="width:${(rc[k].share*100).toFixed(0)}%"></i></div><b>${(rc[k].share*100).toFixed(0)}%</b></div>`; }
  html+=`<div class="ev-note">PICP≈95% 说明替代器不确定度可信；锐度越小越精确。若 PICP=100% 但锐度很大，替代器偏保守（如 KNN 回退）。</div>`;
  box.innerHTML=html;
}

/* =========================================================
   采集策略可视化：β 退火曲线 + 评价趋势迷你曲线
   ========================================================= */
// 迷你 canvas 的 HiDPI 适配：返回 {ctx,w,h}，失败返回 null
function _fitMini(cv){
  if(!cv) return null;
  let r=cv.getBoundingClientRect();
  // 防御：canvas 自身未布局（维度 0）时回退父容器尺寸
  if((!r.width||!r.height) && cv.parentElement){
    const pr=cv.parentElement.getBoundingClientRect();
    if(pr&&pr.width&&pr.height) r={width:pr.width,height:pr.height};
  }
  const w=Math.max(40, r.width|0), h=Math.max(30, r.height|0);
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  if(cv.width!==w*dpr || cv.height!==h*dpr){ cv.width=w*dpr; cv.height=h*dpr; }
  const ctx=cv.getContext('2d');
  if(!ctx) return null;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}

// β 退火：β(t)=βmin+(βmax−βmin)·e^(−t/τ)，前期高 β 重探索、后期低 β 重利用
function drawBetaCurve(){
  // 先确保「数据」始终渲染（即使 canvas 绘制出错也不至于面板空）
  try{ renderAcqMeta(); }catch(e){ console.error('[renderAcqMeta]', e); }
  const f=_fitMini(document.getElementById('beta-canvas')); if(!f) return;
  const {ctx,w,h}=f;
  const PAD={l:26,r:8,t:9,b:15};
  const gw=w-PAD.l-PAD.r, gh=h-PAD.t-PAD.b;
  if(gw<=4||gh<=4) return;
  const itNow=Math.max(0, iter|0);
  const tMax=Math.max(40, itNow+12);                  // 视窗随迭代自适应延伸
  const bMin=ACQ_BETA_MIN, bMax=ACQ_BETA_MAX;
  const X=t=>PAD.l+gw*(t/tMax);
  const Y=b=>PAD.t+gh*(1-(b-bMin)/Math.max(1e-9,bMax-bMin));

  // 背景网格 + y 轴刻度
  ctx.font='8px ui-monospace,Menlo,monospace'; ctx.textBaseline='middle';
  ctx.strokeStyle='rgba(148,163,184,.28)'; ctx.lineWidth=1;
  for(const b of [bMin,(bMin+bMax)/2,bMax]){
    const y=Y(b);
    ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(w-PAD.r,y); ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,.75)'; ctx.textAlign='right';
    ctx.fillText(b.toFixed(1), PAD.l-4, y);
  }

  // 曲线路径
  const pts=[];
  for(let px=0; px<=gw; px+=1){ const t=tMax*px/gw; pts.push([PAD.l+px, Y(acqBetaFor(t))]); }
  // 填充（紫=探索 → 青=利用）
  const grad=ctx.createLinearGradient(PAD.l,0,w-PAD.r,0);
  grad.addColorStop(0,'rgba(167,139,250,.30)');
  grad.addColorStop(1,'rgba(94,231,223,.10)');
  ctx.beginPath(); ctx.moveTo(pts[0][0], PAD.t+gh);
  for(const p of pts) ctx.lineTo(p[0],p[1]);
  ctx.lineTo(pts[pts.length-1][0], PAD.t+gh); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  // 描边（非 UCB 策略淡化：β 不直接进入打分）
  const active=(ACQ_STRATEGY==='UCB');
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  for(const p of pts) ctx.lineTo(p[0],p[1]);
  ctx.strokeStyle=active?'#5ee7df':'rgba(148,163,184,.55)';
  ctx.lineWidth=active?1.8:1.2; ctx.stroke();

  // 当前迭代标记
  const cx=X(Math.min(itNow,tMax)), cy=Y(acqBetaFor(itNow));
  ctx.save(); ctx.setLineDash([2,3]);
  ctx.strokeStyle='rgba(52,211,153,.55)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx,PAD.t); ctx.lineTo(cx,PAD.t+gh); ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(cx,cy,3.2,0,Math.PI*2);
  ctx.fillStyle=active?'#34d399':'#94a3b8'; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.stroke();

  // x 轴标签 + 探索/利用注记
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle='rgba(148,163,184,.7)';
  ctx.fillText('iter 0', PAD.l, h-4);
  ctx.textAlign='right'; ctx.fillText(String(tMax), w-PAD.r, h-4);
  ctx.textAlign='center';
  ctx.fillStyle='rgba(167,139,250,.85)'; ctx.fillText('探索', PAD.l+gw*0.13, PAD.t+9);
  ctx.fillStyle='rgba(94,231,223,.8)';   ctx.fillText('利用', PAD.l+gw*0.87, PAD.t+9);
  renderAcqMeta();
}

function renderAcqMeta(){
  const el=document.getElementById('acq-meta'); if(!el) return;
  const itNow=Math.max(0, iter|0);
  const b=acqBetaFor(itNow);
  const frac=(b-ACQ_BETA_MIN)/Math.max(1e-9,ACQ_BETA_MAX-ACQ_BETA_MIN);  // 1=纯探索 → 0=纯利用
  let tag,cls;
  if(frac>0.62){ tag='探索主导'; cls='exp'; }
  else if(frac>0.28){ tag='探索/利用均衡'; cls='bal'; }
  else { tag='利用主导'; cls='exl'; }
  const NAME={UCB:'UCB · 上置信界',EI:'EI · 期望改进',PI:'PI · 改进概率',TS:'TS · Thompson 采样'};
  const half=Math.round(ACQ_BETA_TAU*Math.LN2);     // β 幅度衰减一半所需迭代
  let html=`<div class="acq-line"><span>当前策略</span><b>${NAME[ACQ_STRATEGY]||ACQ_STRATEGY}</b></div>`;
  html+=`<div class="acq-line"><span>迭代 / β(t)</span><b>#${itNow} · ${b.toFixed(3)}</b></div>`;
  html+=`<div class="acq-line"><span>探索权重</span><b><span class="acq-tag ${cls}">${tag}</span> ${(frac*100).toFixed(0)}%</b></div>`;
  html+=`<div class="acq-line"><span>多样性惩罚 λ</span><b>${ACQ_DIV_LAMBDA.toFixed(2)}</b></div>`;
  if(ACQ_STRATEGY==='UCB'){
    html+=`<div class="acq-note">α = μ + β·σ − λ·e^(−d<sub>min</sub>/${ACQ_DIV_SCALE})，β 半衰期 ≈ ${half} 轮（τ=${ACQ_BETA_TAU}）。</div>`;
  }else if(ACQ_STRATEGY==='TS'){
    html+=`<div class="acq-note">TS 从后验 N(μ,σ²) 采样，探索强度由 σ 自适应；β 曲线仅作参照（灰线）。</div>`;
  }else{
    html+=`<div class="acq-note">${ACQ_STRATEGY} 用改进阈值 ξ=${ACQ_XI} 控制探索，不直接使用 β；曲线仅作参照（灰线）。</div>`;
  }
  el.innerHTML=html;
}

// 评价趋势：简单遗憾（↓好）+ Top-k 召回（↑好），双序列各自归一到 0..1（EVAL_HIST 见顶部状态区）
function drawRegretCurve(){
  const f=_fitMini(document.getElementById('regret-canvas')); if(!f) return;
  const {ctx,w,h}=f;
  const PAD={l:6,r:6,t:12,b:12};
  const gw=w-PAD.l-PAD.r, gh=h-PAD.t-PAD.b;
  ctx.font='8px ui-monospace,Menlo,monospace';
  if(EVAL_HIST.length<2){
    ctx.fillStyle='rgba(100,116,139,.9)'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(EVAL_HIST.length? '需 ≥2 轮评价才能绘制趋势' : '遗憾趋势 · 运行后自动绘制', w/2, h/2);
    return;
  }
  const n=EVAL_HIST.length;
  const sMax=Math.max(...EVAL_HIST.map(d=>d.simple), 1e-9);
  const X=i=>PAD.l+gw*(n>1? i/(n-1) : 0.5);
  const line=(vals, color, fill)=>{
    ctx.beginPath();
    vals.forEach((v,i)=>{ const y=PAD.t+gh*(1-Math.max(0,Math.min(1,v))); i? ctx.lineTo(X(i),y):ctx.moveTo(X(i),y); });
    ctx.strokeStyle=color; ctx.lineWidth=1.6; ctx.stroke();
    if(fill){ ctx.lineTo(X(n-1),PAD.t+gh); ctx.lineTo(X(0),PAD.t+gh); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); }
    const lv=vals[n-1], ly=PAD.t+gh*(1-Math.max(0,Math.min(1,lv)));
    ctx.beginPath(); ctx.arc(X(n-1),ly,2.6,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
  };
  ctx.strokeStyle='rgba(148,163,184,.28)'; ctx.lineWidth=1;
  for(const fr of [0,0.5,1]){ const y=PAD.t+gh*fr; ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(w-PAD.r,y); ctx.stroke(); }
  line(EVAL_HIST.map(d=>d.simple/sMax), '#fbbf24', 'rgba(251,191,36,.12)');   // 简单遗憾（归一）
  line(EVAL_HIST.map(d=>d.recall),      '#34d399', null);                     // Top-k 召回
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.fillStyle='rgba(251,191,36,.9)'; ctx.fillText('简单遗憾↓', PAD.l, 9);
  ctx.textAlign='right';
  ctx.fillStyle='rgba(52,211,153,.9)'; ctx.fillText('Top-k召回↑', w-PAD.r, 9);
  ctx.textAlign='left'; ctx.fillStyle='rgba(100,116,139,.9)';
  ctx.fillText('#'+EVAL_HIST[0].iter, PAD.l, h-3);
  ctx.textAlign='right'; ctx.fillText('#'+EVAL_HIST[n-1].iter, w-PAD.r, h-3);
}

// 每轮迭代结束后的自动评价（非阻塞、带重入与节流保护；状态变量见顶部状态区）
function scheduleAutoEval(){
  if(!AUTO_EVAL) return;
  if(!document.getElementById('eval-body')) return;    // 非主页面无此面板
  if(_evalBusy || _evalLastIter===iter) return;        // 同一轮只算一次
  _evalLastIter=iter;
  setTimeout(()=>{ runEvaluation({auto:true}).catch(()=>{}); }, 0);
}

// 窗口尺寸变化时重绘迷你图
window.addEventListener('resize', ()=>{ try{ drawBetaCurve(); drawRegretCurve(); }catch(e){ console.error('[resize redraw]', e); } });
// 页面完全加载后再兜底重绘一次（防御：module 脚本可能在首帧布局前执行）
window.addEventListener('load', ()=>{ try{ drawBetaCurve(); drawRegretCurve(); }catch(e){ console.error('[load redraw]', e); } });
// 启动后重试绘制（防御：首帧 canvas 可能尚未布局完成 → 维度为 0，延迟重试直到有尺寸）
// 任何失败都把错误直接写进面板，方便排查（不再静默空着）
(function drawOnReady(attempt){
  attempt = attempt || 0;
  let ok=false;
  try{ drawBetaCurve(); drawRegretCurve(); ok=true; }
  catch(e){
    console.error('[init draw] 第'+attempt+'次失败:', e);
    try{
      const dbg='⚠️ 绘制失败: '+(e&&e.message?e.message:e);
      const am=document.getElementById('acq-meta'); if(am) am.innerHTML='<div class="cdim" style="color:#f87171">'+dbg+'</div>';
      const eb=document.getElementById('eval-body'); if(eb && !EVAL_HIST.length) eb.innerHTML='<div class="cdim" style="color:#f87171">'+dbg+'（详见 F12 Console）</div>';
    }catch(_){}
  }
  if(!ok && attempt<8){ setTimeout(()=>drawOnReady(attempt+1), 120*(attempt+1)); }
})(0);

/* 聚焦页：dft 理论页用内置 OER_POOL 绘制示意能带/火山（无需加载 6MB data.js） */
(function(){
  if(!(window.PAGE_CONFIG && window.PAGE_CONFIG.page==='dft')) return;
  const drawDemo=()=>{ try{ const c=OER_POOL[0]; drawOERBand(c); drawOERVolcano(c); }catch(e){ console.warn('dft demo draw failed',e); } };
  setTimeout(drawDemo, 450);
})();

// ============================================================
// AI 对话面板（外部 LLM 代理）+ 新手引导
// 通过对话实时驱动世界模型运行/反馈；action 由 /api/chat 返回。
// ============================================================
(function(){
  const chatEl   = document.getElementById('ai-chat');
  const headEl   = document.getElementById('ai-chat-head');
  const toggleEl = document.getElementById('ai-chat-toggle');
  const msgsEl   = document.getElementById('ai-chat-msgs');
  const textEl   = document.getElementById('ai-chat-text');
  const sendEl   = document.getElementById('ai-chat-send');
  const stopEl   = document.getElementById('ai-chat-stop');
  if(!chatEl || !msgsEl) return;  // 节点不存在则跳过
  // 停止键默认隐藏（CSS 改为 inline-block 以便 style.display='' 能正确显示）
  if(stopEl) stopEl.style.display = 'none';

  let history = [];  // [{role, content}]
  let busy = false;
  let pendingFile = null;  // 聊天栏待发送的数据文件
  let _abortCtrl = null;   // 当前流式请求的 AbortController（用于停止键）

  // —— 数据文件上传（📎）——
  const attachBtn = document.getElementById('ai-chat-attach-btn');
  const fileInput = document.getElementById('ai-chat-file');
  const attachChip = document.getElementById('ai-chat-attach');
  const attachName = document.getElementById('ai-chat-attach-name');
  const attachClear = document.getElementById('ai-chat-attach-clear');
  if(attachBtn && fileInput){
    attachBtn.addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', ()=>{
      if(fileInput.files && fileInput.files.length){
        pendingFile = fileInput.files[0];
        attachChip.style.display = 'flex';
        attachName.textContent = '📎 ' + pendingFile.name;
      }
    });
  }
  if(attachClear){
    attachClear.addEventListener('click', ()=>{
      pendingFile = null;
      if(fileInput) fileInput.value = '';
      attachChip.style.display = 'none';
      attachName.textContent = '';
    });
  }

  // —— 模型选择（外部常用 / 外部自定义 / 本地端点）——
  const modeSel  = document.getElementById('ai-model-mode');
  const extSel   = document.getElementById('ai-model-ext');
  const custInp  = document.getElementById('ai-model-custom');
  const localWrap= document.getElementById('ai-local-wrap');
  const localUrl = document.getElementById('ai-local-url');
  const localMdl = document.getElementById('ai-local-model');
  const localKey = document.getElementById('ai-local-key');
  const LS_KEY = 'wm_chat_model';
  let modelCfg = {mode:'ext', ext:'GLM-4.5-Flash', custom:'', localUrl:'http://127.0.0.1:11434/v1', localModel:'qwen2.5:7b', localKey:''};

  function syncModelUI(){
    const m = modeSel.value;
    extSel.style.display  = (m==='ext') ? '' : 'none';
    custInp.style.display = (m==='ext_custom') ? '' : 'none';
    localWrap.style.display = (m==='local') ? 'flex' : 'none';
  }
  function saveModelCfg(){
    modelCfg = {
      mode: modeSel.value,
      ext: extSel.value,
      custom: custInp.value.trim(),
      localUrl: localUrl.value.trim() || 'http://127.0.0.1:11434/v1',
      localModel: localMdl.value.trim() || 'qwen2.5:7b',
      localKey: localKey.value.trim(),
    };
    try{ localStorage.setItem(LS_KEY, JSON.stringify(modelCfg)); }catch(e){}
  }
  function loadModelCfg(){
    try{
      const s = localStorage.getItem(LS_KEY);
      if(s){ modelCfg = Object.assign(modelCfg, JSON.parse(s)); }
    }catch(e){}
    modeSel.value = modelCfg.mode || 'ext';
    extSel.value  = modelCfg.ext || 'GLM-4.5-Flash';
    custInp.value = modelCfg.custom || '';
    localUrl.value = modelCfg.localUrl || 'http://127.0.0.1:11434/v1';
    localMdl.value = modelCfg.localModel || 'qwen2.5:7b';
    localKey.value = modelCfg.localKey || '';
    syncModelUI();
  }
  // 当前选择 → 发给后端的 {model, base_url, api_key}
  function currentModelParams(){
    if(modelCfg.mode==='ext')        return {model: modelCfg.ext};
    if(modelCfg.mode==='ext_custom') return {model: modelCfg.custom || modelCfg.ext};
    // local
    return {model: modelCfg.localModel, base_url: modelCfg.localUrl, api_key: modelCfg.localKey || ''};
  }
  if(modeSel){
    modeSel.addEventListener('change', ()=>{ syncModelUI(); saveModelCfg(); });
    extSel.addEventListener('change', saveModelCfg);
    custInp.addEventListener('input', saveModelCfg);
    localUrl.addEventListener('input', saveModelCfg);
    localMdl.addEventListener('input', saveModelCfg);
    localKey.addEventListener('input', saveModelCfg);
    loadModelCfg();
  }

  // —— 本地 Ollama 探测 ——
  const probeBtn = document.getElementById('ai-ollama-probe');
  const dlEl     = document.getElementById('ai-local-models');
  async function probeOllama(fillModels){
    if(probeBtn) probeBtn.disabled = true;
    try{
      const st = await (await fetch(backendBase + '/api/ollama/status')).json();
      if(st.reachable && st.base_url){
        localUrl.value = st.base_url;          // 自动用实际监听地址
        modelCfg.localUrl = st.base_url; saveModelCfg();
      }
      if(fillModels){
        const mj = await (await fetch(backendBase + '/api/ollama/models')).json();
        if(mj.ok && mj.models && mj.models.length){
          dlEl.innerHTML = mj.models.map(n=>`<option value="${n}">`).join('');
          if(!localMdl.value.trim()){ localMdl.value = mj.models[0]; modelCfg.localModel = mj.models[0]; saveModelCfg(); }
          appendMsg('bot', '🔍 探测到本机 Ollama 模型：' + mj.models.join('、') + '（已填入候选，可直接选或手填）', 'bot');
        }else{
          appendMsg('bot', '🔍 ' + (mj.note || '未探测到本机 Ollama 模型列表。'), 'bot');
        }
      }
    }catch(e){
      appendMsg('err', '⚠️ 探测 Ollama 失败：' + (e.message||e), 'err');
    }finally{
      if(probeBtn) probeBtn.disabled = false;
    }
  }
  if(probeBtn) probeBtn.addEventListener('click', ()=> probeOllama(true));
  // 页面加载自动探测一次：若 Ollama 可达，把本地默认地址设为实际监听地址
  probeOllama(false);

  function appendMsg(role, text, cls){
    const d = document.createElement('div');
    d.className = 'ai-msg ' + (cls || role);
    d.innerHTML = text;
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    while(msgsEl.children.length > 80) msgsEl.removeChild(msgsEl.firstChild);
  }

  function worldState(){
    try{
      const it = (document.getElementById('iter-tag')||{}).textContent || '';
      const bn = (document.getElementById('best-name')||{}).textContent || '';
      const bm = (document.getElementById('best-metrics')||{}).textContent || '';
      return `状态：${it}；反应：${activeReaction==='OER'?'OER 电催化':'甲烷光催化偶联'}；`
           + `当前最优：${bn}（${bm}）`;
    }catch(e){ return ''; }
  }

  async function send(text){
    text = (text||'').trim();
    if(busy) return;
    if(!text && !pendingFile) return;
    // 带数据文件 → 走「解析 + AI 分析 + 真实反馈登记」专用通道
    if(pendingFile){ await sendWithFile(text, pendingFile); return; }
    appendMsg('user', text.replace(/</g,'&lt;'));
    history.push({role:'user', content:text});
    busy = true; sendEl.disabled = true; sendEl.style.display = 'none';
    if(stopEl){ stopEl.style.display = 'inline-block'; stopEl.disabled = false; }
    _abortCtrl = new AbortController();
    appendMsg('bot', '🤔 思考中…', 'bot');
    const thinkNode = msgsEl.lastChild;
    let botNode = null;        // 流式打字机节点
    let botText = '';          // 累积文本
    let gotFirst = false;
    _inActionLine = false;     // 重置 ACTION 行屏蔽状态
    try{
      const res = await fetch(backendBase + '/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign(
          {message:text, history:history.slice(-10), world_state:worldState()},
          currentModelParams()
        )),
        signal: _abortCtrl.signal,
      });
      if(!res.ok){ throw new Error('HTTP '+res.status); }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '';
      while(true){
        const {done, value} = await reader.read();
        if(done) break;
        buf += decoder.decode(value, {stream:true});
        // 按 SSE 事件切分（\n\n 分隔）
        let idx;
        while((idx = buf.indexOf('\n\n')) !== -1){
          const raw = buf.slice(0, idx); buf = buf.slice(idx+2);
          const ev = parseSSE(raw);
          if(!ev) continue;
          if(ev.event === 'action'){
            // ⚠️ 不再自动执行！改为显示可点击建议按钮，用户确认后才执行
            if(ev.data.value){
              const actionLabels = {
                run:          {icon:'▶', text:'启动自主实验闭环'},
                step:         {icon:'⏭', text:'单步推进一次'},
                open_realdata:{icon:'📁', text:'打开真实数据上传'},
                reaction_ch4: {icon:'⚗', text:'切换到甲烷偶联反应'},
                reaction_oer: {icon:'⚗', text:'切换到 OER 电催化'},
                evaluate:     {icon:'📊', text:'触发主动学习评价'}
              };
              // 防御：只渲染白名单内的 action，其余忽略
              const actKey = (ev.data.value||'').trim().toLowerCase();
              const actInfo = actionLabels[actKey];
              if(!actInfo){
                console.warn('[WM-Chat] 收到未知 ACTION 指令，已忽略:', ev.data.value);
                return; // 不显示按钮
              }
              const chip = document.createElement('div');
              chip.className = 'ai-msg act';
              chip.innerHTML = '<span style="opacity:.6;font-size:11px">💡 AI 建议执行：</span>'
                           + '<button class="ai-suggest-btn" data-act="'+actKey+'" title="点击确认执行此操作">'+actInfo.icon+' '+actInfo.text+'</button>';
              chip.querySelector('.ai-suggest-btn').addEventListener('click', function(){
                this.disabled = true; this.style.opacity='.45'; this.style.cursor='default';
                runAction(this.getAttribute('data-act'));
              });
              msgsEl.appendChild(chip);
              msgsEl.scrollTop = msgsEl.scrollHeight;
            }
          } else if(ev.event === 'error'){
            if(thinkNode && thinkNode.parentNode) thinkNode.remove();
            appendMsg('err', '⚠️ ' + (ev.data.delta||'对话出错').replace(/</g,'&lt;'), 'err');
          } else { // 默认 text delta
            if(ev.data && ev.data.delta){
              if(!gotFirst){ if(thinkNode && thinkNode.parentNode) thinkNode.remove(); botNode = appendMsg('bot',''); gotFirst = true; }
              botText = feedStream(botText, ev.data.delta, botNode);
            }
          }
        }
      }
      if(!gotFirst){
        if(thinkNode && thinkNode.parentNode) thinkNode.remove();
        // 用 err 样式（红底）确保用户能看到，不再用 bot 样式（可能因颜色融合不可见）
        appendMsg('bot', '⚠️ 模型未返回任何内容（可能该模型暂不可用或名称有误）。建议切换到 Qwen3.6-27B 重试。', 'err');
        console.warn('[WM-Chat] 流结束但未收到任何文本 delta（model=%s）', (currentModelParams()||{}).model || '(unknown)');
      } else if(!botText.trim()){
        // 收到了首个 delta（创建了 botNode）但全程无实际文本（如全被 ACTION 行剥离）
        if(botNode && botNode.parentNode)
          botNode.innerHTML = '<span style="color:#fca5a5">⚠️ 模型返回内容为空（可能全为指令行或模型异常）。建议切换到 Qwen3.6-27B。</span>';
        console.warn('[WM-Chat] 收到了 delta 但累积文本为空（ACTION 剥离后）');
      }
      history.push({role:'assistant', content:botText});
    }catch(e){
      if(thinkNode && thinkNode.parentNode) thinkNode.remove();
      // 区分用户主动停止 vs 真实错误
      if(e.name === 'AbortError'){
        appendMsg('act', '⏹ 已停止生成', 'act');
      } else {
        appendMsg('err', '⚠️ 对话请求失败：' + (e.message||e), 'err');
      }
    }
    busy = false; sendEl.disabled = false; sendEl.style.display = '';
    if(stopEl){ stopEl.style.display = 'none'; stopEl.disabled = true; }
    _abortCtrl = null;
    textEl.value=''; textEl.style.height='auto';
  }

  // 带数据文件发送：解析 + AI 专家分析 + 提供「应用为真实实验反馈」按钮
  async function sendWithFile(text, file){
    const fname = file.name || 'data';
    appendMsg('user', (text ? text + ' ' : '') + '📎 ' + fname.replace(/</g,'&lt;'));
    history.push({role:'user', content: text ? (text + ' [附文件:' + fname + ']') : '[附文件:' + fname + ']'});
    busy = true; sendEl.disabled = true; sendEl.style.display = 'none';
    if(stopEl){ stopEl.style.display = 'inline-block'; stopEl.disabled = false; }
    _abortCtrl = new AbortController();
    appendMsg('bot', '🔍 解析并 AI 分析中…', 'bot');
    const thinkNode = msgsEl.lastChild;
    const clearFile = ()=>{
      pendingFile = null;
      if(fileInput) fileInput.value = '';
      if(attachChip){ attachChip.style.display = 'none'; attachName.textContent = ''; }
    };
    try{
      const fd = new FormData();
      fd.append('file', file);
      fd.append('reaction', (typeof activeReaction!=='undefined' && activeReaction==='OER') ? 'OER' : 'OCM');
      fd.append('question', text || '');
      const mp = currentModelParams();
      if(mp.model)     fd.append('model', mp.model);
      if(mp.base_url)  fd.append('base_url', mp.base_url);
      if(mp.api_key)   fd.append('api_key', mp.api_key);
      const res = await fetch(backendBase + '/api/chat/analyze-file', {method:'POST', body: fd, signal: _abortCtrl.signal});
      const j = await res.json();
      if(thinkNode && thinkNode.parentNode) thinkNode.remove();
      if(!j || !j.ok){
        appendMsg('err', '⚠️ ' + ((j && j.note) || '文件分析失败').replace(/</g,'&lt;'), 'err');
        clearFile(); busy = false; sendEl.disabled = false; sendEl.style.display = '';
        if(stopEl){ stopEl.style.display = 'none'; stopEl.disabled = true; } _abortCtrl = null; return;
      }
      // 解析结果卡
      let card = '';
      if(j.accepted && j.rows && j.rows.length){
        const s = j.summary || {}; const c = j.columns || {};
        card += `<div class="ai-parse-card">✅ 已解析 <b>${j.rows.length}</b> 行实测记录`
              + `（产率列=${c.yield||'—'}，选择性列=${c.selectivity||'—'}${c.catalyst?`，催化剂列=${c.catalyst}`:''}）`;
        if(s.mean_yield!=null) card += ` · 平均产率 <b>${s.mean_yield}</b>`;
        if(s.mean_sel!=null)   card += ` · 平均选择性 <b>${s.mean_sel}%</b>`;
        card += `</div>`;
      } else {
        card += `<div class="ai-parse-card warn">${j.note || '未能解析出数值。'}</div>`;
      }
      // 主分析文本（若有）+ 结果卡
      const bodyHtml = ((j.analysis || '') + card).replace(/</g,'&lt;');
      appendMsg('bot', bodyHtml, 'bot');
      // 可应用为真实实验反馈 → 登记到 window.__chatRealRows，下一轮真实闸门自动采用
      if(j.accepted && j.rows && j.rows.length){
        const btn = document.createElement('button');
        btn.className = 'ai-quick';
        btn.textContent = '📥 应用为真实实验反馈';
        btn.addEventListener('click', ()=>{
          window.__chatRealRows = j.rows;
          appendMsg('act', '📥 已登记真实数据（'+j.rows.length+' 行）：下一轮「真实实验反馈」阶段将自动采用你的实测值，替代模拟噪声。', 'act');
          btn.disabled = true; btn.textContent = '✅ 已登记';
        });
        msgsEl.appendChild(btn);
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
      history.push({role:'assistant', content: (j.analysis || '') + ' [解析'+(j.rows?j.rows.length:0)+'行]'});
    }catch(e){
      if(thinkNode && thinkNode.parentNode) thinkNode.remove();
      appendMsg('err', '⚠️ 文件分析请求失败：' + ((e && e.message) || e), 'err');
    }
    clearFile();
    busy = false; sendEl.disabled = false; sendEl.style.display = ''; textEl.value=''; textEl.style.height='auto';
    if(stopEl){ stopEl.style.display = 'none'; stopEl.disabled = true; }
    _abortCtrl = null;
  }

  // 解析单个 SSE 块：返回 {event, data}（event 缺省 'message'）
  function parseSSE(raw){
    let event = 'message'; const dataLines = [];
    for(const line of raw.split('\n')){
      if(line.startsWith('event:')) event = line.slice(6).trim();
      else if(line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if(!dataLines.length) return null;
    try{ return {event, data: JSON.parse(dataLines.join('\n'))}; }
    catch(e){ return {event, data:{delta: dataLines.join('\n')}}; }
  }

  // 流式累积文本，并实时屏蔽「ACTION: ...」指令行（不显示给用户）
  let _inActionLine = false;
  function feedStream(acc, delta, node){
    let out = acc;
    // 逐字符处理，跟踪当前行是否进入了 ACTION: 指令
    for(let i=0; i<delta.length; i++){
      const ch = delta[i];
      if(ch === '\n'){ _inActionLine = false; out += ch; continue; }
      // 若当前行已经处于 ACTION 指令中，则丢弃该行剩余字符
      if(_inActionLine){ continue; }
      out += ch;
      // 检测刚进入 ACTION 行：取当前行（out 以最后一个 \n 切分）
      const lineNow = out.slice(out.lastIndexOf('\n')+1);
      if(/^\s*ACTION:\s*/.test(lineNow)){
        // 移除已写入的 ACTION 行内容，进入屏蔽态
        out = out.slice(0, out.lastIndexOf('\n')+1);
        _inActionLine = true;
      }
    }
    if(node) node.innerHTML = out.replace(/</g,'&lt;');
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return out;
  }

  // 执行 AI 返回的动作指令，并把结果回灌给用户
  async function runAction(action){
    let done = '';
    switch(action){
      case 'run':
        if(typeof running!=='undefined'){ running=true; const bp=document.getElementById('btn-play'); if(bp) bp.textContent='⏸ 暂停'; }
        done = '已启动自主实验闭环 ▶';
        break;
      case 'step':
        if(typeof stepOnce==='function') stepOnce();
        done = '已单步推进一次 ⏭';
        break;
      case 'open_realdata':
        if(typeof openRealDataModal==='function') openRealDataModal({gate:true, candidate:(typeof curCand!=='undefined'?curCand:null)});
        done = '已打开「真实实验数据」上传面板 📁';
        break;
      case 'reaction_ch4':
        if(typeof setReaction==='function') setReaction('CH4');
        done = '已切换到甲烷光催化偶联反应 ⚗';
        break;
      case 'reaction_oer':
        if(typeof setReaction==='function') setReaction('OER');
        done = '已切换到 OER 电催化反应 ⚗';
        break;
      case 'evaluate':
        if(typeof doEvaluate==='function' && doEvaluate) doEvaluate();
        else { const b=document.getElementById('btn-eval'); if(b) b.click(); }
        done = '已触发主动学习评价 📊';
        break;
      default:
        done = '';
    }
    if(done) appendMsg('act', '⚡ 已执行：' + done, 'act');
  }

  // 折叠/展开
  function toggleChat(){
    const collapsed = chatEl.classList.toggle('collapsed');
    toggleEl.textContent = collapsed ? '▴' : '▾';
    if(!collapsed){ setTimeout(()=>textEl.focus(), 80); }
  }
  headEl.addEventListener('click', toggleChat);
  toggleEl.addEventListener('click', (e)=>{ e.stopPropagation(); toggleChat(); });

  sendEl.addEventListener('click', ()=> send(textEl.value));
  if(stopEl){
    stopEl.addEventListener('click', ()=>{
      if(_abortCtrl){ _abortCtrl.abort(); }
    });
  }
  textEl.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(textEl.value); }
    setTimeout(()=>{ textEl.style.height='auto'; textEl.style.height=Math.min(90, textEl.scrollHeight)+'px'; }, 0);
  });

  // 快捷指令
  document.querySelectorAll('.ai-quick').forEach(b=>{
    b.addEventListener('click', ()=> send(b.getAttribute('data-cmd')));
  });

  // 首次展开提示
  setTimeout(()=>{ if(chatEl.classList.contains('collapsed')) appendMsg('bot','💡 点这里展开，或直接说「开始运行」「切换 OER」「上传真实数据」来操控实验。'); }, 1200);

  // ===================== 新手引导 =====================
  const STEPS = [
    {sel:'#btn-play', emoji:'🚀', title:'① 运行实验闭环',
     text:'点「▶ 运行」启动自主实验：AI 先在虚拟合成与表征中反复推理收敛，再进入真实实验反馈并学习更新世界模型。也可「⏭ 单步」一步步看。'},
    {sel:'#btn-stage-realdata', emoji:'📁', title:'② 录入真实实验数据',
     text:'每到「真实实验反馈」阶段，点此按钮拖拽/选择你的 .csv/.xlsx/.tif 真实数据，替代模拟值，让世界模型用你的实测精炼。'},
    {sel:'#ai-chat-head', emoji:'💬', title:'③ AI 对话操控',
     text:'在这里用自然语言实时操控整套系统：说「开始运行」「单步」「切换到 OER」「上传真实数据」，AI 会直接执行并反馈。'},
    {sel:'#btn-reaction', emoji:'⚗️', title:'④ 切换反应轨道',
     text:'在「甲烷光催化偶联」与「OER 电催化（→H₂O₂/O₂）」之间切换，两条反应各有独立的主动学习闭环。'},
  ];
  let obIdx = 0;
  const mask   = document.getElementById('onboard-mask');
  const card   = document.getElementById('onboard-card');
  const emoEl  = document.getElementById('onboard-emoji');
  const titEl  = document.getElementById('onboard-title');
  const txtEl  = document.getElementById('onboard-text');
  const dotsEl = document.getElementById('onboard-dots');
  const nextEl = document.getElementById('onboard-next');
  const skipEl = document.getElementById('onboard-skip');
  if(!mask) return;
  let spotEl = null;
  function clearSpot(){ if(spotEl){ spotEl.classList.remove('onboard-spot'); spotEl=null; } }
  function renderStep(){
    const s = STEPS[obIdx];
    emoEl.textContent = s.emoji; titEl.textContent = s.title; txtEl.textContent = s.text;
    dotsEl.innerHTML = STEPS.map((_,i)=>`<span class="dot ${i===obIdx?'on':''}"></span>`).join('');
    nextEl.textContent = (obIdx===STEPS.length-1) ? '完成 ✓' : '下一步 →';
    clearSpot();
    const target = document.querySelector(s.sel);
    if(target){
      target.classList.add('onboard-spot');
      target.scrollIntoView({block:'center', behavior:'smooth'});
      spotEl = target;
    }
  }
  function openOnboard(){
    mask.style.display='flex'; obIdx=0; renderStep();
  }
  function closeOnboard(){
    mask.style.display='none'; clearSpot();
    try{ localStorage.setItem('wm_onboard_done','1'); }catch(e){}
  }
  nextEl.addEventListener('click', ()=>{
    if(obIdx < STEPS.length-1){ obIdx++; renderStep(); }
    else closeOnboard();
  });
  skipEl.addEventListener('click', closeOnboard);
  let seen = false;
  try{ seen = localStorage.getItem('wm_onboard_done')==='1'; }catch(e){}
  if(!seen){ setTimeout(openOnboard, 700); }
  // 双击对话面板标题可重看引导
  headEl.addEventListener('dblclick', ()=>{ obIdx=0; mask.style.display='flex'; renderStep(); });
})();

/* =========================================================================
   ⬇ CWM-Lab 工作流导出（510 GN 产线）
   与 GN 总览页一致：调后端 /api/generate-workflow（unilab-workflow-builder
   skill，prcxi_factory.py），把当前 AI 最优条件编译为可在 510 GN 工站
   执行的 OPC UA 工作流 JSON。工艺规则（设备首尾复位 / 9320 协议包裹）由后端固化。
   ========================================================================= */
async function exportUniLabWorkflow(){
  // 若 AI 尚未选出候选 / 算出最优，导出前自动先「选候选 + 算理论最优」。
  if(!curCand || !curCand.__cond){
    log('ai','⏳ 尚未有 AI 最优方案，导出前自动选取当前最优候选并算出理论最优条件…');
    try{
      const cand = await pickNextCandidate();
      let _theo=null;
      try{ _theo = searchTheoreticalOptimum(cand, supportReuse[cand.support]||0); }catch(e){ _theo=null; }
      curCand = cand;
      curCand.__cond = (_theo && _theo.conditions) ? _theo.conditions : defaultConditions(cand);
      curCand.__sim = (_theo && _theo.sim) ? _theo.sim : simulateExperiment(cand, curCand.__cond, 0, null);
      curCand.__theoretical = _theo;
      curCand.__condSource = (_theo && _theo.conditions_source) || 'virtual-converged-optimum';
    }catch(e){
      log('warn','⚠ 自动求解 AI 最优方案失败（'+e.message+'），将用默认条件导出。');
    }
  }
  if(!curCand){ log('warn','⚠ 无可用候选，无法导出工作流。'); return; }
  const cond = curCand.__cond || curCand.conditions || defaultConditions(curCand);
  const isOER = (activeReaction==='OER') || (curCand && curCand.reaction==='OER');
  try{
    log('ai','🔄 正在调用后端 unilab-workflow-builder skill 生成 510 产线工作流…');
    const resp = await fetch('/api/generate-workflow', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({cond: cond, reaction: isOER?'OER':'CH4'})
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const data = await resp.json();
    if(!data.ok) throw new Error(data.error || '后端生成失败');
    const wf = data.workflow;
    downloadFile('unilab_workflow.json', JSON.stringify(wf,null,2), 'application/json;charset=utf-8');
    let msg='⬇ 已导出 CWM-Lab 工作流 <b>'+data.node_count+'</b> 节点 / <b>'+data.edge_count+'</b> 连线（unilab_workflow.json，可下发 510 GN 工站执行）。';
    msg+=' 由后端 <b>unilab-workflow-builder skill</b>（prcxi_factory.py）生成，工艺规则固化（设备首尾复位 / 9320 协议包裹）。';
    msg+=' '+data.summary;
    log('ok', msg);
  }catch(e){
    log('error','❌ 后端生成工作流失败：'+e.message+'。请确保后端服务正在运行。');
  }
}
(function(){
  const btn = document.getElementById('btn-exp-unilab');
  if(btn) btn.addEventListener('click', exportUniLabWorkflow);
})();

