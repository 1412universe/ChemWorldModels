/* ============================================================
 * world3d.js — Three.js 3D 实验室世界模型引擎
 * 移植自 lab-world-model-v4.html，适配 ChemWorld 的 DEVICES 数组与 char 对象
 * 暴露 window.World3D 类，由 app.js 在 3D 模式下调用
 * ============================================================ */
(function(global){
'use strict';

// THREE 由 CDN 全局注入，此处直接引用
const T = global.THREE || (typeof THREE!=='undefined'?THREE:null);
if(!T){ console.error('[world3d] THREE 未加载'); return; }

// ============================================================
// 材质 (PBR)
// ============================================================
function mat(color, metalness=.3, roughness=.5){
  return new T.MeshStandardMaterial({ color, metalness, roughness });
}
const M={
  white: mat(0xfdfdfd,.08,.62),
  cream: mat(0xf4f1eb,.06,.68),
  lightGray: mat(0xd8dde3,.42,.4),
  darkGray: mat(0x4a5568,.52,.36),
  metal: mat(0xaeb8c4,.78,.26),
  darkMetal: mat(0x647080,.72,.3),
  lightMetal: mat(0xc8d0dc,.7,.3),
  chrome: mat(0xd0d6de,.88,.14),
  glass: new T.MeshPhysicalMaterial({
    color:0xc4dcf0,metalness:.08,roughness:.04,
    transparent:true,opacity:.25,side:T.DoubleSide,
    clearcoat:1,clearcoatRoughness:.02,
  }),
  glassDark: new T.MeshPhysicalMaterial({
    color:0x78909c,metalness:.12,roughness:.06,
    transparent:true,opacity:.38,side:T.DoubleSide,
  }),
  screen: new T.MeshStandardMaterial({color:0x0f172a,metalness:.6,roughness:.15,emissive:0x1e293b,emissiveIntensity:.4}),
  screenOn: new T.MeshStandardMaterial({color:0x1e293b,metalness:.5,roughness:.12,emissive:0x10b981,emissiveIntensity:.55}),
  red: mat(0xe53e3e,.32,.42),
  orange: new T.MeshStandardMaterial({color:0xea580c,metalness:.35,roughness:.38,emissive:0xea580c,emissiveIntensity:.15}),
  yellow: mat(0xeab308,.28,.48),
  blue: mat(0x2563eb,.38,.33),
  purple: mat(0x7c3aed,.33,.38),
  black: mat(0x111827,.18,.68),
  dark: mat(0x1e293b,.5,.3),
};

// ============================================================
// 几何辅助
// ============================================================
function box(p,w,h,d,m){ const msh=new T.Mesh(new T.BoxGeometry(w,h,d),m||M.white);
  if(p)msh.position.set(...p); msh.castShadow=true;msh.receiveShadow=true; return msh; }
function cyl(p,r,h,m,rx=0,ry=0,rz=0){ const msh=new T.Mesh(new T.CylinderGeometry(r,r,h,20),m||M.white);
  msh.position.set(...p); msh.rotation.set(rx,ry,rz); msh.castShadow=true;msh.receiveShadow=true; return msh; }
function sph(p,r,m){ const msh=new T.Mesh(new T.SphereGeometry(r,16,16),m||M.white);
  msh.position.set(...p); msh.castShadow=true; return msh; }
function torus(p,r,t,m,rx=0,ry=0,rz=0){ const msh=new T.Mesh(new T.TorusGeometry(r,t,12,24),m||M.metal);
  msh.position.set(...p); msh.rotation.set(rx,ry,rz); msh.castShadow=true; return msh; }
function add(g,obj){ g.add(obj); return obj; }

// ============================================================
// 设备 Builder (移植自 v4)
// ============================================================
function makeGlovebox(g){
  add(g,box([0,36,0],56,72,48,M.cream));
  const glass=add(g,new T.Mesh(new T.BoxGeometry(52,54,44,M.glass)));
  glass.position.set(0,36+27,0);
  [[0,36+54,-22],[0,36+54,22],[-26,36+27,0],[26,36+27,0],[0,36+55,0]].forEach(p=>{
    const f=p[2]===0?
      box([p[0],p[1],p[2]],p[2]===0?1:52,p[2]===0?1:1,p[2]===0?44:1,M.darkMetal):
      box([p[0],p[1],p[2]],p[0]===0?1:52,1,p[1]===0?1:44,M.darkMetal);
    g.add(f);
  });
  [-1,1].forEach(s=>add(g,torus([s*16,36+22,23],7,2,M.chrome,Math.PI/2,0,0)));
  add(g,box([18,36+58,0],28,8,22,M.white));
  add(g,box([18,36+61,0],22,4,14,M.screenOn));
  [-1,1].forEach(s=>add(g,cyl([s*38,30,0],4,32,M.lightGray)));
}
function makeTubeFurnace(g){
  add(g,box([0,10,-8],96,20,34,M.darkMetal));
  const body=cyl([0,30,0],16,76,M.cream,0,0,Math.PI/2);
  body.castShadow=true;body.receiveShadow=true;g.add(body);
  [-1,1].forEach(s=>{ add(g,cyl([s*40,30,0],18,4,M.chrome,0,0,Math.PI/2));
    add(g,cyl([s*43,30,0],8,2,M.glass,0,0,Math.PI/2));
  });
  for(let i=-4;i<=4;i++) add(g,torus([i*9,30,0],2.2,.8,M.orange,Math.PI/2,0,0));
  add(g,box([50,30,-10],20,24,18,M.white));
  add(g,box([50,36,-10],16,10,12,M.screenOn));
  add(g,cyl([42,48,0],1.2,28,M.metal));
}
function makeMuffle(g){
  add(g,box([0,25,0],52,50,44,M.cream));
  add(g,box([0,22,23],38,34,2,M.darkMetal));
  add(g,box([0,26,24.5],24,18,1,M.screen));
  add(g,cyl([14,22,26],1.5,18,M.chrome,0,Math.PI/2,0));
  add(g,cyl([0,53,0],6,26,M.darkMetal));
  add(g,box([0,51,0],32,4,32,M.darkMetal));
  add(g,box([28,20,0],14,32,26,M.white));
  add(g,box([28,28,0],10,12,18,M.screenOn));
  add(g,box([28,19,0],8,2,14,M.yellow));
  add(g,sph([28,38,0],2,M.red));
}
function makeBalance(g){
  add(g,box([0,2,0],30,4,24,M.darkMetal));
  add(g,box([0,14,0],26,16,20,M.white));
  const shield=add(g,new T.Mesh(new T.BoxGeometry(24,14,18,M.glass)));
  shield.position.set(0,14+7,0);
  add(g,box([0,14+14,0],24,1,18,M.chrome));
  add(g,cyl([0,16,0],7,.6,M.chrome));
  add(g,box([0,8,10],18,6,1,M.screenOn));
  add(g,box([8,16,10],3,3,1,M.yellow));
}
function makeCentrifuge(g){
  add(g,box([0,15,0],32,30,28,M.darkMetal));
  add(g,cyl([0,31,0],14,2.5,M.chrome));
  add(g,cyl([0,33,0],2.5,4,M.chrome));
  add(g,box([0,18,15],20,10,1,M.screenOn));
  [0,1,2,3].forEach(i=>add(g,cyl([-7+i*5,10,15],1.2,.6,M.chrome,0,Math.PI/2,0)));
  add(g,cyl([0,8,15],2.5,2,M.chrome,0,Math.PI/2,0));
}
function makeReactor(g){
  const chamber=cyl([0,30,0],20,52,M.glass);
  chamber.castShadow=false;g.add(chamber);
  [0,1,2].forEach(i=>add(g,torus([0,15+i*21,0],20,1.2,M.chrome,Math.PI/2,0,0)));
  add(g,box([0,57,0],48,4,48,M.chrome));
  for(let i=0;i<4;i++){ const a=i*Math.PI/2;
    add(g,cyl([Math.cos(a)*20,62,Math.sin(a)*20],2.5,8,M.darkMetal));
  }
  add(g,box([0,8,0],44,14,44,M.white));
  add(g,box([0,16,0],36,6,36,M.cream));
  add(g,box([28,14,22],18,22,14,M.darkMetal));
  add(g,box([28,20,22],14,8,1,M.screenOn));
}
function makeLightSource(g){
  add(g,box([0,3,0],34,6,34,M.darkMetal));
  add(g,cyl([0,24,0],12,38,M.lightGray));
  const refl=add(g,new T.Mesh(new T.ConeGeometry(14,10,16,1,true),
    new T.MeshStandardMaterial({color:0xffffff,metalness:.7,roughness:.2,side:T.DoubleSide})));
  refl.position.set(0,44,0);g.add(refl);
  const bulb=sph([0,40,0],5,
    new T.MeshStandardMaterial({color:0xfffbeb,emissive:0xfffbeb,emissiveIntensity:2}));
  g.add(bulb);
  add(g,box([0,11,22],22,20,18,M.white));
  add(g,box([0,16,30],16,8,1,M.screenOn));
}
function makeGasFeed(g){
  add(g,box([0,17,0],34,34,26,M.cream));
  [-1,0,1].forEach((s,i)=>add(g,cyl([-10+s*10,28,-14],6.5,50,[M.lightGray,M.darkMetal,M.lightMetal][i])));
  [-1,0,1].forEach(s=>add(g,cyl([-10+s*10,55,-14],2.5,5,M.darkMetal)));
  for(let i=0;i<4;i++){
    add(g,box([0,12+i*7,0],24,5,20,M.lightGray));
    add(g,box([0,12+i*7+.5,9],18,3,1,M.screen));
  }
  [-1,0,1].forEach(s=>add(g,cyl([-10+s*10,18,-7],.8,18,M.metal)));
}
function makeGC(g){
  add(g,box([0,25,0],42,50,38,M.white));
  add(g,box([-8,56,0],24,16,22,M.lightGray));
  add(g,cyl([-8,64,0],3.5,10,M.darkMetal));
  add(g,box([8,32,0],28,32,24,M.cream));
  add(g,box([8,32,12],24,24,1,M.lightGray));
  add(g,cyl([8,32,13],1,18,M.chrome,0,Math.PI/2,0));
  add(g,box([26,30,0],14,38,28,M.darkMetal));
  add(g,box([-12,38,19],20,12,1,M.screenOn));
  add(g,cyl([-24,52,0],1.8,5,M.metal,0,Math.PI/2,0));
}
function makeMS(g){
  add(g,box([0,30,0],40,60,38,M.white));
  add(g,cyl([0,68,0],9,22,M.darkMetal));
  add(g,box([0,40,19],24,16,1,M.screenOn));
  [0,1,2].forEach(i=>add(g,cyl([-10+i*10,22,19],2,2,M.chrome,0,Math.PI/2,0)));
  for(let i=0;i<4;i++) add(g,box([0,42+i*3,-19],26,.6,1,M.black));
  add(g,sph([16,54,19],1.2,M.yellow));
}
function makeXRD(g){
  add(g,box([0,7,0],80,14,56,M.darkMetal));
  add(g,cyl([0,20,0],9,10,M.chrome));
  add(g,box([-30,18,0],40,8,8,M.darkMetal));
  add(g,cyl([-52,18,0],6,16,M.lightGray,0,0,Math.PI/2));
  add(g,box([30,18,0],40,8,8,M.darkMetal));
  add(g,box([52,18,0],12,12,12,M.cream));
  add(g,cyl([0,27,0],5,1.5,M.chrome));
  add(g,box([34,7,24],18,14,8,M.white));
  add(g,box([34,11,24],14,8,1,M.screenOn));
}
function makeDRIFTS(g){
  add(g,box([0,20,0],40,40,32,M.cream));
  const dome=add(g,new T.Mesh(
    new T.SphereGeometry(14,20,12,0,Math.PI*2,0,Math.PI/2),
    M.lightGray));
  dome.position.set(0,40,0);dome.castShadow=true;g.add(dome);
  add(g,new T.Mesh(new T.CircleGeometry(10,20),
    new T.MeshStandardMaterial({color:0x1e293b,emissive:0x10b981,emissiveIntensity:.3}))).position.set(0,52,0);
  g.children[g.children.length-1].rotation.x=-Math.PI/2;
  [-1,1].forEach(s=>add(g,cyl([s*10,52,0],1.2,12,M.metal)));
  add(g,box([0,26,17],22,12,1,M.screenOn));
  [-1,1].forEach(s=>add(g,cyl([s*10,14,17],1.5,2,M.chrome,0,Math.PI/2,0)));
}
function makeTEM(g){
  add(g,box([0,7,0],44,14,44,M.darkMetal));
  add(g,cyl([0,50,0],12,74,M.cream));
  add(g,box([0,94,0],24,20,24,M.darkMetal));
  add(g,box([0,32,0],30,10,30,M.darkMetal));
  add(g,box([0,10,0],34,20,34,M.darkMetal));
  add(g,box([32,60,8],20,14,1,M.screenOn));
  add(g,box([32,44,8],20,14,1,M.screenOn));
  add(g,box([32,12,8],32,20,26,M.white));
  add(g,box([32,24,5],24,1.5,12,M.darkMetal));
}
function makeOven(g){
  add(g,box([0,19,0],38,38,30,M.cream));
  add(g,box([0,16,16],28,26,1,M.darkMetal));
  add(g,box([0,18,16.5],18,14,1,M.screen));
  add(g,cyl([10,16,17],1.5,18,M.chrome,0,Math.PI/2,0));
  add(g,box([0,40,0],26,3,24,M.darkMetal));
  add(g,box([12,28,16],10,8,1,M.screenOn));
}
function makeVacuumOven(g){
  add(g,box([0,20,0],40,40,32,M.darkMetal));
  add(g,cyl([0,26,16.5],7,2,M.glass,0,Math.PI/2,0));
  add(g,torus([0,26,16.5],8,1.2,M.chrome,Math.PI/2,0,0));
  add(g,cyl([0,14,16.5],1.8,24,M.chrome,0,Math.PI/2,0));
  add(g,cyl([-14,30,16.5],3,1,
    new T.MeshStandardMaterial({color:0xfef3c7,emissive:0xfbbf24,emissiveIntensity:.5}),0,Math.PI/2,0));
  add(g,box([14,28,16.5],14,8,1,M.screenOn));
  add(g,cyl([0,44,-12],2.5,8,M.darkMetal));
}
function makeUltrasonic(g){
  add(g,box([0,8,0],30,16,24,M.lightGray));
  add(g,box([0,10,0],24,12,18,M.screen));
  add(g,box([0,17,0],26,1,20,M.chrome));
  add(g,box([18,8,0],16,16,6,M.white));
  add(g,box([18,12,3],10,6,1,M.screenOn));
  add(g,cyl([18,6,3],1.5,2,M.chrome,0,Math.PI/2,0));
}
function makeStirrer(g){
  add(g,box([0,6,0],24,12,18,M.cream));
  add(g,cyl([0,13,0],9,.6,M.chrome));
  const bk=add(g,new T.Mesh(new T.CylinderGeometry(4.5,4.5,9,16,1,true),M.glass));
  bk.position.set(0,17.5,0);
  add(g,box([0,14.5,0],5.5,.8,.8,M.white));
  add(g,box([0,8,9],12,5,1,M.screenOn));
  add(g,cyl([8,6,9],1.5,2,M.chrome,0,Math.PI/2,0));
}
function makePipette(g){
  add(g,box([0,3,0],26,6,20,M.darkMetal));
  add(g,box([0,18,0],8,30,8,M.lightGray));
  add(g,box([0,32,0],22,4,4,M.lightGray));
  const tip=add(g,new T.Mesh(new T.ConeGeometry(2.5,10,12),M.white));
  tip.position.set(0,25,0);tip.rotation.x=Math.PI;
  add(g,box([0,1,0],22,2,16,M.cream));
  for(let i=0;i<4;i++)for(let j=0;j<6;j++){
    const t=add(g,new T.Mesh(new T.ConeGeometry(.6,3,6),M.glass));
    t.position.set(-8+i*5.5,3.5,-12+j*4);t.rotation.x=Math.PI;
  }
}
function makeIceBath(g){
  add(g,box([0,8,0],30,16,24,M.lightGray));
  add(g,box([0,10,0],26,12,18,
    new T.MeshStandardMaterial({color:0x60a5fa,transparent:true,opacity:.45})));
  [-1,1].forEach(s=>add(g,cyl([s*11,22,0],1,14,M.metal)));
  add(g,box([18,9,0],16,18,12,M.white));
  add(g,box([18,12,6],10,6,1,M.screenOn));
  add(g,sph([18,19,0],1.2,new T.MeshStandardMaterial({color:0x3b82f6,emissive:0x3b82f6,emissiveIntensity:.8})));
}
function makeSpray(g){
  add(g,box([0,5,0],32,10,26,M.darkMetal));
  add(g,box([0,28,0],10,32,8,M.lightGray));
  add(g,new T.Mesh(new T.ConeGeometry(6,12,12),M.darkMetal)).position.set(0,46,0);
  add(g,sph([0,52,0],9,new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.18})));
  add(g,box([0,11,0],24,1,20,M.cream));
  add(g,box([18,7,0],16,14,10,M.white));
  add(g,box([18,10,5],10,6,1,M.screenOn));
}
function makeIRLamp(g){
  add(g,box([0,8,0],26,16,20,M.cream));
  const arm=box([0,26,0],4,20,4,M.lightGray); g.add(arm);
  const head=cyl([0,40,0],9,10,M.darkMetal); g.add(head);
  add(g,sph([0,37,0],4.5,new T.MeshStandardMaterial({color:0xef4444,emissive:0xef4444,emissiveIntensity:1.3})));
  add(g,sph([0,18,0],2,M.darkMetal));
}
function makeLibrary(g){
  add(g,box([0,30,0],64,60,38,M.white));
  for(let i=0;i<4;i++) add(g,box([0,8+i*13,19],54,.6,1.5,M.darkMetal));
  for(let i=0;i<4;i++)for(let j=0;j<10;j++){
    const b=box([-24+j*5,8+i*13+3,19],3,9,.6,[M.blue,M.red,M.yellow,M.cream][(i+j)%4]);
    g.add(b);
  }
  add(g,box([0,61,19],54,3,3,M.lightGray));
  add(g,sph([-24,63,21],1.5,M.yellow));
}
function makeServerRack(g){
  add(g,box([0,35,0],54,70,38,M.dark));
  for(let i=0;i<8;i++){
    add(g,box([0,6+i*7.5,0],48,5,32,M.darkMetal));
    add(g,box([0,7+i*7.5,16],44,1,1,M.lightGray));
    [-1,1].forEach(s=>{
      const led=sph([s*4,7+i*7.5,17],.6,i%2===0?M.screenOn:M.yellow);
      led.userData.blink=i%2===0; g.add(led);
    });
  }
  add(g,box([0,67,17],48,2,2,M.blue));
  for(let i=0;i<5;i++) add(g,box([26,35,0],1,30,3,M.black));
}
function makeRobotStation(g){
  add(g,box([0,3,0],54,6,44,M.darkMetal));
  add(g,box([0,6,0],34,3,28,M.cream));
  for(let i=0;i<4;i++)for(let j=0;j<6;j++)
    add(g,cyl([-12+i*8,9,-12+j*4],1.2,5,M.glass));
}
function makeSpectro(g){
  add(g,box([0,14,0],34,28,24,M.cream));
  add(g,box([-8,14,12],12,10,6,M.lightGray));
  add(g,box([8,16,12],18,10,1,M.screenOn));
  [0,1,2].forEach(i=>add(g,cyl([-10,8-i*2,12],1,1,M.chrome,0,Math.PI/2,0)));
  add(g,sph([10,26,12],1,M.yellow));
}
function makeBET(g){
  add(g,box([0,13,0],30,26,22,M.cream));
  for(let i=0;i<3;i++) add(g,cyl([-7+i*7,26,-6],2,18,M.glass));
  add(g,cyl([0,5,-6],5,10,M.lightGray));
  add(g,box([0,14,11],10,6,1,M.screenOn));
}
function makeXPS(g){
  add(g,box([0,16,0],38,32,28,M.cream));
  add(g,cyl([0,26,0],10,10,M.darkMetal));
  const arm=box([-8,24,0],20,5,5,M.darkMetal); arm.rotation.z=Math.PI/6; g.add(arm);
  add(g,box([-24,32,0],10,12,10,M.cream));
  add(g,box([0,20,14],18,8,1,M.screenOn));
}

// ===== GN 工站专用设备模型（workstation/GN）=====
// 9320 移液工作站：96 通道移液核心 + X/Y 移载模组 + 夹爪 + 96 孔板
function makePRCXI(g){
  add(g,box([0,4,0],56,8,44,M.darkMetal));
  add(g,box([0,26,-18],56,40,4,M.lightGray));
  [-1,1].forEach(s=>add(g,box([s*26,34,0],5,60,5,M.metal)));
  add(g,box([0,62,0],58,5,5,M.metal));
  add(g,box([0,58,0],16,10,12,M.lightMetal));
  add(g,box([0,48,0],22,12,10,M.chrome));
  for(let i=0;i<12;i++)for(let j=0;j<8;j++){
    const t=add(g,new T.Mesh(new T.ConeGeometry(.9,4,6),M.white));
    t.position.set(-11+i*2,41,-7+j*2);t.rotation.x=Math.PI;
  }
  add(g,box([0,10,-6],40,3,28,M.cream));
  add(g,box([0,20,-19],18,10,1,M.screenOn));
}
// 离心管液体处理系统：1+8 通道 + 开盖/关盖 + 恒温模块 + 双层超声
function makeTubeHandler(g){
  add(g,box([0,4,0],60,8,46,M.darkMetal));
  [-1,1].forEach(s=>add(g,box([s*28,36,0],5,64,5,M.metal)));
  add(g,box([0,66,0],62,5,5,M.metal));
  add(g,box([0,62,0],14,9,11,M.lightMetal));
  add(g,box([0,52,0],20,10,9,M.chrome));
  for(let i=0;i<8;i++){
    const t=add(g,new T.Mesh(new T.ConeGeometry(1.2,5,8),M.white));
    t.position.set(-7+i*2,45.5,0);t.rotation.x=Math.PI;
  }
  add(g,cyl([10,48,0],1.2,10,M.chrome));
  add(g,box([-16,12,10],16,16,16,M.lightGray));
  add(g,box([-16,12,-10],16,16,16,M.lightGray));
  add(g,box([14,10,12],18,12,14,M.blue));
  add(g,box([0,22,-21],16,8,1,M.screenOn));
}
// 9320 液体处理工作站：吸放液 + 震荡加样 + 温控
function makeLiquidHandler(g){
  add(g,box([0,4,0],62,8,48,M.darkMetal));
  [-1,1].forEach(s=>add(g,box([s*28,34,0],5,60,5,M.metal)));
  add(g,box([0,62,0],64,5,5,M.metal));
  add(g,box([0,58,0],16,10,12,M.lightMetal));
  // 移液枪头 + 液柱 + 液滴
  add(g,box([0,46,0],6,12,6,M.chrome));
  add(g,cyl([0,40,0],2,6,M.chrome));
  add(g,new T.Mesh(new T.ConeGeometry(2,6,8),M.blue)).position.set(0,34,0);
  // 温控模块（加热/冷却块）
  add(g,box([-18,12,12],16,16,16,M.blue));
  add(g,box([-18,12,-12],16,16,16,M.blue));
  // 震荡加样台
  add(g,box([16,11,0],20,6,20,M.cream));
  // 屏幕
  add(g,box([0,22,-21],16,8,1,M.screenOn));
}
// 快速载具更换模块：接料工位 + 顶锥 + 下压器 + 96 孔金属反应板
function makeQuickChange(g){
  add(g,box([0,4,0],46,8,40,M.darkMetal));
  [-1,1].forEach(s=>add(g,box([s*20,30,-14],4,52,4,M.metal)));
  add(g,box([0,56,-14],44,4,4,M.metal));
  add(g,cyl([0,44,-14],3,16,M.chrome));
  add(g,box([0,34,-14],30,4,26,M.lightMetal));
  add(g,box([0,10,0],36,4,30,M.cream));
  for(let i=0;i<4;i++)for(let j=0;j<6;j++)
    add(g,cyl([-12+i*8,7,-10+j*4],1,4,M.chrome));
  add(g,box([0,20,-19],14,7,1,M.screenOn));
}
// 锁紧机构：双夹爪 + 螺丝刀 + 金属盖 + 96 孔板缓存位
function makeLockMech(g){
  add(g,box([0,4,0],44,8,38,M.darkMetal));
  add(g,box([0,30,-16],10,52,8,M.metal));
  add(g,box([0,54,-10],26,5,6,M.metal));
  [-1,1].forEach(s=>{
    add(g,box([s*9,46,-8],4,14,4,M.chrome));
    add(g,box([s*9,38,-8],5,5,7,M.darkMetal));
  });
  add(g,cyl([0,44,-2],1.6,12,M.chrome));
  add(g,box([0,10,4],34,4,28,M.cream));
  add(g,box([0,14,4],34,2,28,M.lightMetal));
  add(g,box([-16,12,-14],12,16,12,M.lightGray));
  add(g,box([0,22,-19],12,6,1,M.screenOn));
}

// ChemWorld type → v4 builder 映射
const BUILDERS={
  // ChemWorld 2D type 名 → v4 builder
  tube: makeTubeHandler, quick: makeQuickChange, lock: makeLockMech, system: makeServerRack, stack: makeLibrary, liquid: makeLiquidHandler,
  shelf: makeLibrary,
  glove: makeGlovebox,
  server: makeServerRack,
  robot: makeRobotStation,
  xrd: makeXRD,
  balance: makeBalance,
  sonic: makeUltrasonic,
  stir: makeStirrer,
  furnace: makeMuffle,
  voven: makeVacuumOven,
  gc: makeGC,
  ms: makeMS,
  drifts: makeDRIFTS,
  uvvis: makeSpectro,
  atr: makeSpectro,
  fluor: makeSpectro,
  lifetime: makeSpectro,
  bet: makeBET,
  tem: makeTEM,
  synch: makeSpectro,
  photocurr: makeSpectro,
  xps: makeXPS,
  gas: makeGasFeed,
  lamp: makeLightSource,
  reactor: makeReactor,
  centri: makeCentrifuge,
  pipette: makePipette,
  icebath: makeIceBath,
  irlamb: makeIRLamp,
  oven: makeOven,
  spray: makeSpray,
  // 也兼容 v4 原生 type 名
  library: makeLibrary, glovebox: makeGlovebox, server_rack: makeServerRack,
  robot_station: makeRobotStation, ultrasonic: makeUltrasonic, stirrer: makeStirrer,
  muffle: makeMuffle, tube_furnace: makeTubeFurnace, vacuum_oven: makeVacuumOven,
  light_source: makeLightSource, gas_feed: makeGasFeed, centrifuge: makeCentrifuge,
  ice_bath: makeIceBath, ir_lamp: makeIRLamp, spectro: makeSpectro,
};

const SIZE_TABLE={
  quick:[50,45],lock:[46,40],system:[60,50],stack:[70,50],liquid:[62,48],
  glovebox:[70,60],glove:[70,60],balance:[35,30],ultrasonic:[40,30],sonic:[40,30],stirrer:[30,25],stir:[30,25],
  muffle:[60,50],furnace:[60,50],tube_furnace:[110,40],tube:[110,40],vacuum_oven:[50,40],voven:[50,40],pipette:[30,25],
  ice_bath:[40,30],icebath:[40,30],spray:[40,30],reactor:[55,55],light_source:[40,40],lamp:[40,40],
  gas_feed:[40,60],gas:[40,60],xrd:[90,60],gc:[50,45],ms:[50,45],drifts:[50,45],
  uvvis:[40,35],atr:[40,35],fluor:[40,35],lifetime:[40,35],synch:[50,40],photocurr:[40,35],
  pc:[40,35],tem:[55,55],bet:[40,35],xps:[50,40],centrifuge:[40,35],centri:[40,35],
  ir_lamp:[35,30],irlamb:[35,30],oven:[50,40],library:[70,50],shelf:[70,50],
  server_rack:[60,50],server:[60,50],robot_station:[60,50],robot:[60,50],spectro:[40,35],
};
function getSize(t){ return SIZE_TABLE[t]||[40,35]; }

const LABEL_HEIGHT={
  quick:64,lock:62,system:95,stack:85,liquid:60,
  glovebox:95,glove:95,balance:45,ultrasonic:40,sonic:40,stirrer:35,stir:35,muffle:75,furnace:75,
  tube_furnace:85,tube:85,vacuum_oven:70,voven:70,pipette:55,ice_bath:45,icebath:45,spray:60,
  reactor:90,light_source:70,lamp:70,gas_feed:65,gas:65,xrd:55,gc:65,ms:80,drifts:70,
  uvvis:50,atr:50,fluor:50,lifetime:50,synch:60,photocurr:50,pc:50,tem:105,bet:50,xps:65,
  centrifuge:55,centri:55,ir_lamp:55,irlamb:55,oven:60,library:85,shelf:85,server_rack:95,
  server:95,robot_station:75,robot:75,spectro:50,
};
function getLabelHeight(t){ return LABEL_HEIGHT[t]||55; }

// ============================================================
// World3D 类
// ============================================================
class World3D {
  constructor(){
    this.scene=null; this.camera=null; this.renderer=null; this.cssRenderer=null; this.controls=null;
    this.robotGroup=null; this.robotLabel=null;
    this.roomZones=null; this._patrolState=null;
    this.deviceGroups={}; this.deviceLabels={}; this.groupLabels=[];
    this.clock=new T.Clock();
    this.animState={phase:'idle',faceDev:null};
    this.selectedKey=null;
    this.disposed=false;
    this._resizeHandler=null;
    this._clickHandler=null;
    this._hoverHandler=null;
    this._raycaster=new T.Raycaster();
    this._mouse=new T.Vector2();
    // 缓存上一次 char 逻辑坐标→3D 位置，避免每帧重算
    this._lastCharX=null; this._lastCharY=null;
    // 回调：点击设备时通知 app.js
    this.onDeviceClick=null;
  }

  // 2D 分数坐标 (x,y ∈ 0~1) → 3D 世界坐标 (x, z)
  // photo 总览：3 层楼式大画布（宽 1180，高 CV_H*820）；gn 产线：原 560×760
  _mapX(x){ return (x-0.5)*(this.isPhoto?1180:560); }
  _mapZ(y){ return (y-0.5)*(this.isPhoto?820:760); }

  init(container, devices, options){
    options=options||{};
    this.devices=devices;
    this.fullLab = options.fullLab !== false; // 默认 fullLab=true
    // 布局模式：photo 总览（43 台分区大画布 + 拖拽平移） vs gn 产线（原 5 页 11 台小布局）
    const PC = (typeof window!=='undefined' && window.PAGE_CONFIG) ? window.PAGE_CONFIG : null;
    this.isPhoto = !!(PC && PC.theme==='photo');

    const w=container.clientWidth||window.innerWidth;
    const h=container.clientHeight||window.innerHeight;

    this.scene=new T.Scene();
    this.scene.background=new T.Color(0xeaeef3);
    this.scene.fog=new T.Fog(0xeaeef3,600,1500);

    const aspect=w/h, frustumSize=this.isPhoto?700:640;
    this.camera=new T.OrthographicCamera(frustumSize*aspect/-2,frustumSize*aspect/2,frustumSize/2,frustumSize/-2,1,2500);
    if(this.isPhoto){ this.camera.position.set(620,560,640); this.camera.lookAt(0,0,450); this.camera.zoom=1.0; }
    else { this.camera.position.set(520,480,520); this.camera.lookAt(0,0,80); }

    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});
    this.renderer.setSize(w,h); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.toneMapping=T.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.05;
    this.renderer.outputEncoding=T.sRGBEncoding;
    container.appendChild(this.renderer.domElement);

    // CSS2D 标签层
    if(T.CSS2DRenderer){
      this.cssRenderer=new T.CSS2DRenderer();
      this.cssRenderer.setSize(w,h);
      this.cssRenderer.domElement.className='css2d-layer';
      this.cssRenderer.domElement.style.position='absolute';
      this.cssRenderer.domElement.style.top='0'; this.cssRenderer.domElement.style.left='0';
      this.cssRenderer.domElement.style.pointerEvents='none';
      container.appendChild(this.cssRenderer.domElement);
    }

    if(T.OrbitControls){
      this.controls=new T.OrbitControls(this.camera,this.renderer.domElement);
      this.controls.enableDamping=true; this.controls.dampingFactor=.08;
      this.controls.maxPolarAngle=Math.PI/2.05;
      this.controls.minZoom = this.isPhoto ? .28 : .25;
      this.controls.maxZoom = this.isPhoto ? 6 : 16;
      this.controls.dollySpeed = this.isPhoto ? .5 : 1;
      this.controls.target.set(0,0, this.isPhoto ? 450 : 80);
      if(this.isPhoto){
        // 光催化总览：左键拖拽平移画布（看全 43 台），右键旋转视角，滚轮缩放
        this.controls.mouseButtons = { LEFT: T.MOUSE.PAN, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.ROTATE };
        this.controls.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_ROTATE };
      }
    }

    // 灯光
    this.scene.add(new T.AmbientLight(0xfff5e6,.5));
    this.scene.add(new T.HemisphereLight(0xffffff,0xc8d4e8,.4));
    const key=new T.DirectionalLight(0xfff0d6,.75);
    key.position.set(400,550,350); key.castShadow=true;
    key.shadow.mapSize.set(2048,2048); key.shadow.camera.near=50; key.shadow.camera.far=1100;
    key.shadow.camera.left=-450; key.shadow.camera.right=450;
    key.shadow.camera.top=450; key.shadow.camera.bottom=-450;
    key.shadow.bias=-.0005; this.scene.add(key);
    const rim=new T.DirectionalLight(0xbfdbfe,.35);
    rim.position.set(-320,320,-250); this.scene.add(rim);
    const fill=new T.DirectionalLight(0xffe4b5,.2);
    fill.position.set(0,200,400); this.scene.add(fill);

    this._buildLab();
    this._buildAllDevices();
    this._buildRooms();
    this._buildGroupLabels();
    this._buildRobot();
    this._setupInteraction();

    this._resizeHandler=()=>this._onResize(container);
    window.addEventListener('resize', this._resizeHandler);

    this._animateBound=()=>this._animate();
    this._rafId=requestAnimationFrame(this._animateBound);
  }

  _buildLab(){
    const scene=this.scene;
    // 地面尺寸：photo 总览（3 层楼式：宽 1180，z 向 3 层展开） vs gn 产线（原小布局）
    const DW = this.isPhoto ? 1180 : 580;
    const DZ = this.isPhoto ? 2480 : 780;
    const ZC = this.isPhoto ? 10 : 0;
    const floor=new T.Mesh(new T.PlaneGeometry(DW,DZ,28, this.isPhoto?80:28),
      new T.MeshStandardMaterial({color:0xeef0f3,roughness:.78,metalness:.06}));
    floor.rotation.x=-Math.PI/2; floor.position.z=ZC; floor.receiveShadow=true; scene.add(floor);

    const aisle=new T.Mesh(new T.PlaneGeometry(160,DZ),
      new T.MeshStandardMaterial({color:0xf5f6f8,roughness:.7,metalness:.04}));
    aisle.rotation.x=-Math.PI/2; aisle.position.set(0,.6,ZC); aisle.receiveShadow=true; scene.add(aisle);

    // 网格
    const gridMat=new T.LineBasicMaterial({color:0xb8c2d0,transparent:true,opacity:.25});
    const xMin=this.isPhoto?-590:-290, xMax=this.isPhoto?590:290, xStep=this.isPhoto?98:52;
    const zMin=this.isPhoto?-1230:-390, zMax=this.isPhoto?1250:390, zStep=this.isPhoto?82:52;
    for(let i=xMin;i<=xMax;i+=xStep){
      const g1=new T.BufferGeometry().setFromPoints([new T.Vector3(i,.8,zMin),new T.Vector3(i,.8,zMax)]);
      scene.add(new T.Line(g1,gridMat));
    }
    for(let i=zMin;i<=zMax;i+=zStep){
      const g2=new T.BufferGeometry().setFromPoints([new T.Vector3(xMin,.8,i),new T.Vector3(xMax,.8,i)]);
      scene.add(new T.Line(g2,gridMat));
    }

    // 后墙（玻璃）
    if(this.fullLab){
      const wallZ=zMin;
      const glassWall=new T.MeshPhysicalMaterial({color:0xc8dcf0,transparent:true,opacity:.08,metalness:.1,roughness:.02,side:T.DoubleSide,clearcoat:1,clearcoatRoughness:.01});
      const wall=new T.Mesh(new T.PlaneGeometry(DW,180),glassWall);
      wall.position.set(0,90,wallZ); scene.add(wall);
      const frameMat=M.darkMetal;
      add(scene,box([0,90,wallZ],DW,3,2,frameMat));
      add(scene,box([0,3,wallZ],DW,3,2,frameMat));
      add(scene,box([xMin,90,wallZ],3,180,2,frameMat));
      add(scene,box([xMax,90,wallZ],3,180,2,frameMat));
      const nWin=this.isPhoto?9:4, stepW=this.isPhoto?128:125, winW=this.isPhoto?78:80;
      for(let i=0;i<nWin;i++){
        const wx=-540+i*stepW;
        add(scene,box([wx,90,wallZ+1.5],winW,70,1.5,frameMat));
      }
      [-1,1].forEach(s=>{
        const sw=new T.Mesh(new T.PlaneGeometry(DZ,180),glassWall);
        sw.rotation.y=s*Math.PI/2; sw.position.set(s*DW/2,90,ZC); scene.add(sw);
        add(scene,box([s*DW/2,90,0],2,3,DZ,frameMat));
        add(scene,box([s*DW/2,3,0],2,3,DZ,frameMat));
        add(scene,box([s*DW/2,90,wallZ],2,180,3,frameMat));
        add(scene,box([s*DW/2,90,zMax],2,180,3,frameMat));
      });
    }
  }

  _buildAllDevices(){
    this.devices.forEach(d=>{
      const group=new T.Group();
      group.userData.key=d.key;
      group.userData.device=d;
      const builder=BUILDERS[d.type]||makeSpectro;
      builder(group);

      // 平台
      const sz=getSize(d.type);
      const plat=new T.Mesh(new T.BoxGeometry(sz[0]+12,2,sz[1]+12),
        new T.MeshStandardMaterial({color:0xcbd5e1,roughness:.7}));
      plat.position.y=1; plat.receiveShadow=true; group.add(plat);

      // 位置：2D 分数坐标 → 3D 世界坐标
      const wx=this._mapX(d.x + (d.w||0)/2);
      const wz=this._mapZ(d.y + (d.h||0)/2);
      group.position.set(wx,0,wz);
      this.scene.add(group);
      this.deviceGroups[d.key]=group;

      // CSS2D 标签
      if(this.cssRenderer){
        const div=document.createElement('div');
        div.className='dev-label-3d';
        div.innerHTML=`<span class="ldot3d on"></span>${d.name}`;
        div.style.pointerEvents='auto';
        div.onclick=(e)=>{ e.stopPropagation(); if(this.onDeviceClick) this.onDeviceClick(d.key); this._highlight(d.key); };
        const label=new T.CSS2DObject(div);
        label.position.set(0,getLabelHeight(d.type),0);
        group.add(label);
        this.deviceLabels[d.key]=label;
      }
    });
  }

  // 3 层楼式房间（photo 总览专用）：每层 2 个房间（左右并排，中间走廊 x≈0.5）
  // 每层 = 楼层地板带 + 层标牌 + 电梯井；每房间 = 地毯色块 + 围栏（前端门洞）+ 立柱 + 门匾
  _buildRooms(){
    if(!this.isPhoto) return;
    if(!this.cssRenderer) return;
    const groups=(typeof window!=='undefined'&&window.PAGE_GROUPS)?window.PAGE_GROUPS:null;
    const floors=(typeof window!=='undefined'&&window.PAGE_FLOORS)?window.PAGE_FLOORS:null;
    if(!groups||!groups.length) return;
    const colors=[0xd7e9f8,0xd9f0df,0xe7e1f6,0xfdecd8,0xd4efe9,0xfaf0d7]; // 6 区柔和色
    const wallMat=new T.MeshPhysicalMaterial({color:0xffffff,metalness:.05,roughness:.35,
      transparent:true,opacity:.2,side:T.DoubleSide,clearcoat:1,clearcoatRoughness:.1});
    const pillarMat=M.lightGray, frameMat=M.darkMetal;
    const wallH=26, pillarH=120, doorW=150;
    const zones=[];
    // 楼层边界（按每组设备 z 范围聚合）
    const floorRange={};
    groups.forEach(g=>{
      const f=g._floor||1;
      if(!floorRange[f]) floorRange[f]={zMin:Infinity,zMax:-Infinity};
      const keys=g.keys.filter(k=>this.deviceGroups[k]);
      keys.forEach(k=>{ const gp=this.deviceGroups[k]; if(gp){ floorRange[f].zMin=Math.min(floorRange[f].zMin,gp.position.z); floorRange[f].zMax=Math.max(floorRange[f].zMax,gp.position.z); } });
    });
    groups.forEach((g,gi)=>{
      const keys=g.keys.filter(k=>this.deviceGroups[k]);
      if(!keys.length) return;
      let zMin=Infinity,zMax=-Infinity;
      keys.forEach(k=>{ const gp=this.deviceGroups[k]; if(gp){ zMin=Math.min(zMin,gp.position.z); zMax=Math.max(zMax,gp.position.z); } });
      zMin-=15; zMax+=15;
      const side=g._side==='R'?'R':'L';
      // 房间 x 范围（按左右房固定区域，稍留围栏余量）
      const xL = side==='L' ? -545 : 35;
      const xR = side==='L' ? -35 : 545;
      const color=colors[gi%colors.length];
      const zc=(zMin+zMax)/2, zl=zMax-zMin, spanW=xR-xL;
      // 地毯色块
      const carpet=new T.Mesh(new T.PlaneGeometry(spanW,zl),
        new T.MeshStandardMaterial({color,roughness:.9,metalness:.02,transparent:true,opacity:.92}));
      carpet.rotation.x=-Math.PI/2; carpet.position.set((xL+xR)/2,.9,zc);
      carpet.receiveShadow=true; this.scene.add(carpet);
      // 地毯描边
      const edgeMat=new T.LineBasicMaterial({color:0x94a3b8,transparent:true,opacity:.5});
      const pts=[new T.Vector3(xL,1.1,zMin),new T.Vector3(xR,1.1,zMin),
        new T.Vector3(xR,1.1,zMax),new T.Vector3(xL,1.1,zMax),new T.Vector3(xL,1.1,zMin)];
      this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),edgeMat));
      // 围栏：左右 + 后整墙，前端留门洞
      add(this.scene,box([xL,wallH/2,zc],.5,wallH,zl,wallMat));
      add(this.scene,box([xR,wallH/2,zc],.5,wallH,zl,wallMat));
      add(this.scene,box([(xL+xR)/2,wallH/2,zMin],spanW,wallH,.5,wallMat));
      const segW=(spanW-doorW)/2;
      add(this.scene,box([xL+segW/2,wallH/2,zMax],segW,wallH,.5,wallMat));
      add(this.scene,box([xR-segW/2,wallH/2,zMax],segW,wallH,.5,wallMat));
      // 四角立柱
      [[xL,zMin],[xR,zMin],[xL,zMax],[xR,zMax]].forEach(p=>{
        add(this.scene,cyl([p[0],pillarH/2,p[1]],1.5,pillarH,pillarMat));
      });
      // 顶部横梁
      add(this.scene,box([xL,pillarH,zc],.5,1.2,zl,frameMat));
      add(this.scene,box([xR,pillarH,zc],.5,1.2,zl,frameMat));
      add(this.scene,box([(xL+xR)/2,pillarH,zMin],spanW,1.2,.5,frameMat));
      add(this.scene,box([(xL+xR)/2,pillarH,zMax],spanW,1.2,.5,frameMat));
      // 门匾（CSS2D：编号 + 分区名）
      const div=document.createElement('div');
      div.className='room-plaque-3d';
      div.innerHTML=`<span class="rp-no">${String(gi+1).padStart(2,'0')}</span>${g.label}`;
      const plaque=new T.CSS2DObject(div);
      plaque.position.set((xL+xR)/2,pillarH+26,zMax+6);
      this.scene.add(plaque);
      this.groupLabels.push(plaque);
      zones.push({label:g.label, x0:xL, x1:xR, zMin, zMax, color, side});
    });
    // 楼层结构：楼层地板带 + 电梯井（不渲染 1F/2F/3F 层标牌）
    if(floors && floorRange){
      const floorMat=new T.MeshStandardMaterial({color:0xe3e8ee,roughness:.75,metalness:.04,transparent:true,opacity:.55});
      floors.forEach(fl=>{
        const fr=floorRange[fl.no];
        if(!fr) return;
        const fzc=(fr.zMin+fr.zMax)/2, fzl=fr.zMax-fr.zMin+70;
        // 楼层地板带（横贯全宽，比地毯略深）
        const deck=new T.Mesh(new T.PlaneGeometry(1180,fzl),floorMat);
        deck.rotation.x=-Math.PI/2; deck.position.set(0,.95,fzc);
        deck.receiveShadow=true; this.scene.add(deck);
        // 电梯井（每层左侧尽头：立柱 + 门框）
        add(this.scene,box([-575,26, fzc],2,52,46,M.darkMetal));
        add(this.scene,box([-575,62,fzc],16,16,3,M.lightGray));
        add(this.scene,box([-575,66,fzc],10,4,1,M.screenOn));
      });
    }
    this.roomZones=zones;
  }

  // 分组标题（3D 大标签）：读 app_photo.js 设置的 window.PAGE_GROUPS
  _buildGroupLabels(){
    if(!this.cssRenderer) return;
    if(this.isPhoto) return; // photo 页的组标题由 _buildRooms 渲染为房间门匾
    const groups = (typeof window!=='undefined' && window.PAGE_GROUPS) ? window.PAGE_GROUPS : null;
    if(!groups || !groups.length) return;
    groups.forEach(g=>{
      const firstKey = g.keys.find(k=>this.deviceGroups[k]);
      if(!firstKey) return;
      const first = this.deviceGroups[firstKey];
      const div=document.createElement('div');
      div.className='group-label-3d';
      div.textContent=g.label;
      const label=new T.CSS2DObject(div);
      label.position.set(first.position.x, 26, first.position.z-46);
      this.scene.add(label);
      this.groupLabels.push(label);
    });
  }

  _buildRobot(){
    const robotGroup=new T.Group(); robotGroup.name='robot';
    this.robotGroup=robotGroup;

    const shellMat=new T.MeshPhysicalMaterial({color:0xf8fafc,metalness:.35,roughness:.25,clearcoat:.8,clearcoatRoughness:.1});
    const darkShell=new T.MeshPhysicalMaterial({color:0x1e293b,metalness:.6,roughness:.2,clearcoat:.5,clearcoatRoughness:.15});
    const accentGlow=new T.MeshStandardMaterial({color:0x06b6d4,emissive:0x06b6d4,emissiveIntensity:1.2,metalness:.3,roughness:.2});
    const accentDim=new T.MeshStandardMaterial({color:0x0891b2,metalness:.5,roughness:.3,emissive:0x0891b2,emissiveIntensity:.3});
    const jointMat=new T.MeshStandardMaterial({color:0x475569,metalness:.8,roughness:.2});
    const visorMat=new T.MeshPhysicalMaterial({color:0x0c0a1e,metalness:.9,roughness:.05,clearcoat:1,clearcoatRoughness:.01,transparent:true,opacity:.85});
    const eyeMat=new T.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:3});

    // 腿
    [-1,1].forEach(s=>{
      add(robotGroup,sph([s*6,44,0],3,jointMat));
      add(robotGroup,cyl([s*6,35,0],2.8,12,shellMat));
      add(robotGroup,sph([s*6,41,0],2.8,shellMat));
      add(robotGroup,sph([s*6,29,0],2.8,shellMat));
      add(robotGroup,sph([s*6,26,0],2.5,jointMat));
      add(robotGroup,cyl([s*6,17,0],2.2,12,darkShell));
      add(robotGroup,sph([s*6,23,0],2.2,darkShell));
      add(robotGroup,sph([s*6,11,0],2.2,darkShell));
      add(robotGroup,sph([s*6,9,0],2,jointMat));
      const foot=add(robotGroup,new T.Mesh(new T.BoxGeometry(7,3,11),darkShell));
      foot.position.set(s*6,4,3); foot.castShadow=true;
      add(robotGroup,box([s*6,4,8.5],5,.6,1,accentDim));
    });

    // 躯干
    add(robotGroup,sph([0,48,0],5,darkShell));
    add(robotGroup,cyl([0,48,0],5,6,darkShell));
    add(robotGroup,sph([0,48,0],5,darkShell));
    add(robotGroup,sph([0,52,0],2.5,jointMat));
    add(robotGroup,cyl([0,57,0],6,6,shellMat));
    add(robotGroup,sph([0,60,0],6,shellMat));
    add(robotGroup,sph([0,54,0],6,shellMat));
    add(robotGroup,cyl([0,68,0],7.5,8,shellMat));
    add(robotGroup,sph([0,72,0],7.5,shellMat));
    add(robotGroup,sph([0,64,0],7.5,shellMat));
    const vL=add(robotGroup,new T.Mesh(new T.BoxGeometry(3,8,.8),accentGlow));
    vL.position.set(-3,68,6.5); vL.rotation.z=.35;
    const vR=add(robotGroup,new T.Mesh(new T.BoxGeometry(3,8,.8),accentGlow));
    vR.position.set(3,68,6.5); vR.rotation.z=-.35;
    const core=add(robotGroup,new T.Mesh(new T.SphereGeometry(1.5,12,12),
      new T.MeshStandardMaterial({color:0xa5f3fc,emissive:0x22d3ee,emissiveIntensity:2})));
    core.position.set(0,72,7);
    add(robotGroup,box([0,65,-6.5],10,14,2,darkShell));

    // 头
    const headGrp=new T.Group(); headGrp.position.set(0,82,0); robotGroup.add(headGrp);
    add(robotGroup,cyl([0,78,0],1.8,4,jointMat));
    const skull=add(headGrp,new T.Mesh(new T.SphereGeometry(5.5,16,12),shellMat));
    skull.scale.set(1,.95,.95); skull.castShadow=true;
    add(headGrp,sph([0,0,-2],4.5,darkShell));
    const visor=add(headGrp,new T.Mesh(new T.SphereGeometry(5.2,16,8,0,Math.PI*2,0,Math.PI/2.2),visorMat));
    visor.position.set(0,1,1); visor.rotation.x=-.1;
    [-1,1].forEach(s=>{
      const eye=add(headGrp,new T.Mesh(new T.BoxGeometry(2.2,.5,.3),eyeMat));
      eye.position.set(s*1.8,1.5,5);
    });
    [-1,1].forEach(s=>{
      const ear=add(headGrp,new T.Mesh(new T.CylinderGeometry(1.2,.8,2,10),darkShell));
      ear.position.set(s*5,0,0); ear.rotation.z=s*Math.PI/2;
    });
    add(headGrp,cyl([0,5,0],.6,3,darkShell));
    const sensor=add(headGrp,new T.Mesh(new T.SphereGeometry(.8,8,8),
      new T.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:2})));
    sensor.position.set(0,6.8,0);

    // 肩与臂
    robotGroup.userData.shoulders={};
    [-1,1].forEach(s=>{
      const pauldron=add(robotGroup,new T.Mesh(new T.SphereGeometry(3.5,10,8),shellMat));
      pauldron.position.set(s*8,75,0); pauldron.scale.set(1,.7,1); pauldron.castShadow=true;
      add(robotGroup,cyl([s*10,67,0],2,10,shellMat));
      add(robotGroup,sph([s*10,72,0],2,shellMat));
      add(robotGroup,sph([s*10,62,0],2,shellMat));
      add(robotGroup,sph([s*10,60,0],2.2,jointMat));
      const fArm=new T.Group(); fArm.position.set(s*10,60,0); robotGroup.add(fArm);
      robotGroup.userData.shoulders[s]=fArm;
      const forearm=add(fArm,new T.Mesh(new T.CylinderGeometry(1.8,1.4,12,8),darkShell));
      forearm.position.set(0,-7,0); forearm.castShadow=true;
      add(fArm,sph([0,-14,0],1.8,jointMat));
      const hand=add(fArm,new T.Mesh(new T.BoxGeometry(3,3,2),shellMat));
      hand.position.set(0,-17,0); hand.castShadow=true;
      [-1,0,1].forEach(fi=>{
        const finger=add(fArm,new T.Mesh(new T.CylinderGeometry(.35,.2,3,6),shellMat));
        finger.position.set(fi*1,-19.5,0);
      });
      add(robotGroup,box([s*10,67,2.5],1.5,8,.5,accentDim));
    });

    // 机器人标签
    if(this.cssRenderer){
      const rDiv=document.createElement('div'); rDiv.className='robot-label-3d';
      rDiv.innerHTML=`<span class="r-dot3d"></span>${this.isPhoto?'Bot-M · 房间巡视中':'Bot-M 巡航中'}`;
      this.robotLabel=new T.CSS2DObject(rDiv);
      this.robotLabel.position.set(0,95,0);
      robotGroup.add(this.robotLabel);
    }

    if(this.isPhoto && this.roomZones && this.roomZones.length){
      // photo 总览：机器人停在 1 号房（1F 左）门前，沿楼层走廊依次巡 6 个房间
      const first=this.roomZones[0];
      const fx=first.side==='R'?40:-40;
      robotGroup.position.set(fx,0,first.zMax+14);
      this._patrolState={ points:this.roomZones.map(r=>({x:r.side==='R'?40:-40, z:r.zMax+14})), idx:0, holdT:1.5 };
    } else {
      robotGroup.position.set(20,0,0);
    }
    this.scene.add(robotGroup);
  }

  _setupInteraction(){
    const dom=this.renderer.domElement;
    // 双击画布：重置视角（回到初始视野）
    this._dblHandler=(e)=>{ e.preventDefault(); this.resetView(); };
    dom.addEventListener('dblclick', this._dblHandler);
    this._clickHandler=(e)=>{
      const rect=dom.getBoundingClientRect();
      this._mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      this._mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      this._raycaster.setFromCamera(this._mouse,this.camera);
      const targets=[];
      Object.values(this.deviceGroups).forEach(g=>g.traverse(c=>{if(c.isMesh)targets.push(c);}));
      const hits=this._raycaster.intersectObjects(targets);
      if(hits.length){
        let node=hits[0].object;
        while(node&&!node.userData.key)node=node.parent;
        if(node){
          const d=node.userData.device;
          if(d){
            if(this.onDeviceClick) this.onDeviceClick(d.key);
            this._highlight(d.key);
          }
        }
      }
    };
    dom.addEventListener('click', this._clickHandler);

    // 悬停光标
    this._hoverHandler=(e)=>{
      const rect=dom.getBoundingClientRect();
      this._mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      this._mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      this._raycaster.setFromCamera(this._mouse,this.camera);
      const targets=[];
      Object.values(this.deviceGroups).forEach(g=>g.traverse(c=>{if(c.isMesh)targets.push(c);}));
      const hits=this._raycaster.intersectObjects(targets);
      dom.style.cursor = hits.length ? 'pointer' : 'default';
    };
    dom.addEventListener('mousemove', this._hoverHandler);
  }

  _highlight(key){
    Object.keys(this.deviceLabels).forEach(k=>{
      const el=this.deviceLabels[k].element;
      if(!el) return;
      el.style.boxShadow = k===key
        ? '0 5px 24px rgba(16,185,129,.7),0 0 0 2px rgba(16,185,129,.4)'
        : '0 3px 12px rgba(37,99,235,.35)';
    });
    this.selectedKey=key;
  }

  // 由 app.js 每帧调用：根据 char 逻辑坐标同步机器人 3D 位置
  tick(char, activeDevice, running, dt){
    if(!this.robotGroup) return;
    const t=this.clock.getElapsedTime();
    if(this.controls) this.controls.update();

    if(this.isPhoto){
      // photo 总览：AI 推演时机器人走向目标设备干活；空闲时在 6 个房间门前自主巡房
      if((running || char.hold) && char.nx!=null && char.ny!=null){
        this._robotFollow(char.nx,char.ny,activeDevice,true,t);
      } else {
        this._robotPatrol(t,dt||0.016);
      }
    } else if(char.nx!=null && char.ny!=null){
      this._robotFollow(char.nx,char.ny,activeDevice,!!running,t);
    }

    // 纯 BO 时镜头跟着机器人，方便看见它在设备之间走；平时 photo 仍让用户自己看
    if(this.isPhoto && running && char.hold && this.robotGroup && this.controls){
      const tx=this.robotGroup.position.x, tz=this.robotGroup.position.z;
      this.controls.target.x += (tx-this.controls.target.x)*0.08;
      this.controls.target.z += (tz-this.controls.target.z)*0.08;
      this.controls.target.y = 40;
    }
    if(!this.isPhoto && running && this.robotGroup && this.controls){
      const tx=this.robotGroup.position.x, tz=this.robotGroup.position.z;
      this.controls.target.x += (tx-this.controls.target.x)*.04;
      this.controls.target.z += (tz-this.controls.target.z)*.04;
      this.controls.target.y=50;
    }

    // char.x/char.y 是 2D 像素坐标（相对 canvas），需要映射到 3D
    // 机器人移动逻辑已拆分为 _robotFollow（跟随目标设备）与 _robotPatrol（photo 巡房）

    // LED 闪烁
    this.scene.traverse(o=>{
      if(o.userData&&o.userData.blink&&o.material)
        o.material.emissiveIntensity=Math.sin(t*4)>.5?.6:.2;
    });

    // 设备标签状态更新
    if(activeDevice && this.deviceLabels[activeDevice]){
      // 当前激活设备标签高亮
    }

    this.renderer.render(this.scene,this.camera);
    if(this.cssRenderer) this.cssRenderer.render(this.scene,this.camera);
  }

  // 机器人：跟随目标（AI 推演时走向目标设备；GN 巡航）
  _robotFollow(nx,ny,activeDevice,running,t){
    const tx=this._mapX(nx), tz=this._mapZ(ny);
    const pos=this.robotGroup.position;
    pos.x += (tx - pos.x)*0.15;
    pos.z += (tz - pos.z)*0.15;
    const dx=tx-pos.x, dz=tz-pos.z;
    const moving=Math.hypot(dx,dz)>1;
    const sh=this.robotGroup.userData.shoulders;
    if(moving){
      const angle=Math.atan2(dx,dz);
      let da=angle-this.robotGroup.rotation.y;
      while(da>Math.PI)da-=Math.PI*2;
      while(da<-Math.PI)da+=Math.PI*2;
      this.robotGroup.rotation.y += da*0.15;
      const walkPhase=t*6;
      if(sh){
        if(sh[-1]) sh[-1].rotation.x=Math.sin(walkPhase)*.5;
        if(sh[1]) sh[1].rotation.x=-Math.sin(walkPhase)*.5;
      }
      pos.y=Math.abs(Math.sin(walkPhase))*2;
    } else if(running && activeDevice){
      if(sh){
        const wp=t*4;
        if(sh[-1]) sh[-1].rotation.x=-.8+Math.sin(wp)*.3;
        if(sh[1]) sh[1].rotation.x=-.8+Math.sin(wp+Math.PI)*.3;
      }
      pos.y=Math.sin(t*5)*1.5;
      const g=this.deviceGroups[activeDevice];
      if(g){
        const fx=g.position.x-pos.x, fz=g.position.z-pos.z;
        const angle=Math.atan2(fx,fz);
        let da=angle-this.robotGroup.rotation.y;
        while(da>Math.PI)da-=Math.PI*2;
        while(da<-Math.PI)da+=Math.PI*2;
        this.robotGroup.rotation.y += da*0.1;
      }
    } else {
      pos.y=Math.sin(t*1.5)*.8;
      if(sh){
        if(sh[-1]) sh[-1].rotation.x=Math.sin(t*1.2-1)*.08;
        if(sh[1]) sh[1].rotation.x=Math.sin(t*1.2+1)*.08;
      }
    }
  }

  // 机器人：photo 总览空闲时在 6 个房间门前巡逻（走→停留看房→下一间，循环）
  _robotPatrol(t,dt){
    const st=this._patrolState;
    if(!st || !st.points || !st.points.length) return;
    const tg=st.points[st.idx];
    const pos=this.robotGroup.position;
    const dx=tg.x-pos.x, dz=tg.z-pos.z;
    const dist=Math.hypot(dx,dz);
    const sh=this.robotGroup.userData.shoulders;
    if(dist>3){
      const speed=30, step=Math.min(1,(speed*dt)/dist);
      pos.x+=dx*step; pos.z+=dz*step;
      const angle=Math.atan2(dx,dz);
      let da=angle-this.robotGroup.rotation.y;
      while(da>Math.PI)da-=Math.PI*2;
      while(da<-Math.PI)da+=Math.PI*2;
      this.robotGroup.rotation.y += da*0.15;
      const wp=t*6;
      if(sh){
        if(sh[-1]) sh[-1].rotation.x=Math.sin(wp)*.5;
        if(sh[1]) sh[1].rotation.x=-Math.sin(wp)*.5;
      }
      pos.y=Math.abs(Math.sin(wp))*2;
    } else {
      // 到达房间门口：面向房间（朝 -z）停留观察
      let da=Math.PI-this.robotGroup.rotation.y;
      while(da>Math.PI)da-=Math.PI*2;
      while(da<-Math.PI)da+=Math.PI*2;
      this.robotGroup.rotation.y += da*0.12;
      st.holdT-=dt;
      pos.y=Math.sin(t*1.5)*.8;
      if(sh){
        if(sh[-1]) sh[-1].rotation.x=Math.sin(t*1.2-1)*.08;
        if(sh[1]) sh[1].rotation.x=Math.sin(t*1.2+1)*.08;
      }
      if(st.holdT<=0){ st.idx=(st.idx+1)%st.points.length; st.holdT=2.3; }
    }
  }

  _animate(){
    if(this.disposed) return;
    this._rafId=requestAnimationFrame(this._animateBound);
    // 空闲渲染（app.js 未接管时）
    if(this._selfAnimate){
      const t=this.clock.getElapsedTime();
      if(this.controls) this.controls.update();
      if(this.robotGroup){
        this.robotGroup.position.y=Math.sin(t*1.5)*.8;
        const sh=this.robotGroup.userData.shoulders;
        if(sh){
          if(sh[-1]) sh[-1].rotation.x=Math.sin(t*1.2-1)*.08;
          if(sh[1]) sh[1].rotation.x=Math.sin(t*1.2+1)*.08;
        }
      }
      this.scene.traverse(o=>{
        if(o.userData&&o.userData.blink&&o.material)
          o.material.emissiveIntensity=Math.sin(t*4)>.5?.6:.2;
      });
      this.renderer.render(this.scene,this.camera);
      if(this.cssRenderer) this.cssRenderer.render(this.scene,this.camera);
    }
  }

  _onResize(container){
    const w=container.clientWidth||window.innerWidth;
    const h=container.clientHeight||window.innerHeight;
    const a=w/h, fs=this.isPhoto?700:640;
    this.camera.left=fs*a/-2; this.camera.right=fs*a/2;
    this.camera.top=fs/2; this.camera.bottom=fs/-2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h);
    if(this.cssRenderer) this.cssRenderer.setSize(w,h);
  }

  // 公开 API
  resetView(){
    if(this.isPhoto){
      this.camera.position.set(620,560,640);
      this.camera.lookAt(0,0,450);
      this.camera.zoom=1.0;
      this.camera.updateProjectionMatrix();
      if(this.controls) this.controls.target.set(0,0,450);
    } else {
      this.camera.position.set(520,480,520);
      this.camera.lookAt(0,0,80);
      if(this.controls) this.controls.target.set(0,0,80);
    }
    if(this.controls) this.controls.update();
  }

  toggleTopView(){
    const targetY=800;
    const iv=setInterval(()=>{
      this.camera.position.y += (targetY-this.camera.position.y)*.08;
      if(Math.abs(this.camera.position.y-targetY)<2){ this.camera.position.y=targetY; clearInterval(iv); }
    },16);
  }

  focusDevice(key){
    const g=this.deviceGroups[key];
    if(g && this.controls){
      this.controls.target.set(g.position.x,20,g.position.z);
      this._highlight(key);
    }
  }

  setDeviceStatus(key, status){
    const l=this.deviceLabels[key]; if(!l) return;
    const d=this.devices.find(x=>x.key===key);
    const busy = status==='运行中' || status==='busy';
    l.element.innerHTML=`<span class="ldot3d ${busy?'busy':'on'}"></span>${d?d.name:key}`;
  }

  dispose(){
    this.disposed=true;
    if(this._rafId) cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._resizeHandler);
    if(this.renderer){
      if(this._clickHandler) this.renderer.domElement.removeEventListener('click', this._clickHandler);
      if(this._hoverHandler) this.renderer.domElement.removeEventListener('mousemove', this._hoverHandler);
      if(this._dblHandler) this.renderer.domElement.removeEventListener('dblclick', this._dblHandler);
      this.renderer.dispose();
      if(this.renderer.domElement.parentNode)
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if(this.cssRenderer && this.cssRenderer.domElement.parentNode)
      this.cssRenderer.domElement.parentNode.removeChild(this.cssRenderer.domElement);
    this.scene=null; this.camera=null; this.renderer=null; this.cssRenderer=null;
    this.controls=null; this.robotGroup=null; this.robotLabel=null;
    this.deviceGroups={}; this.deviceLabels={}; this.groupLabels=[];
  }
}

global.World3D=World3D;
})(typeof window!=='undefined'?window:this);
