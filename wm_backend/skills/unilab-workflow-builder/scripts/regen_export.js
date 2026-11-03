// Regenerate unilab_workflow.json using the NEW stateful planner (planUniLabWorkflow),
// reusing the exact pure mapping logic from app.js so the on-disk file matches the export.
const fs = require('fs');
const path = '/Users/fenglongli/Downloads/unilabWorld/wm_backend/static/assets/app.js';
const src = fs.readFileSync(path, 'utf8');

const startMarker = 'const UNILAB_LAB_UUID';
const endMarker = 'function aiOptimumToRecipe';
const i0 = src.indexOf(startMarker);
const i1 = src.indexOf(endMarker);
if (i0 < 0 || i1 < 0) { console.error('FAIL: markers not found'); process.exit(1); }
const block = src.slice(i0, i1);

// Driver: emulate exportUniLabWorkflow's planner path (no DOM needed).
const driver = `
const activeReaction = 'CH4';
const cond = {T:512, R:0.6, I:131, G:4806, reaction:'CH4'};
const recipe = {}; // unused by planner, kept for signature
const intent = recipeToIntent(cond, recipe);
const planned = planUniLabWorkflow(intent);
const wf = buildUniLabWorkflow('unilabWorld AI方案 · 金四面体(推理式) #1 · Ag/TiO2 · T=512 R⁻¹=1.67 I=131 G=4806', planned);
const out = JSON.stringify(wf, null, 2);
fs.writeFileSync('/Users/fenglongli/Downloads/unilab_workflow.json', out);
// summary
let pick=0, place=0, reset=0, create=0, run=0, titration=0, move=0, solid=0;
wf.data.nodes.forEach(n=>{
  if(n.name==='pick') pick++;
  if(n.name==='place') place++;
  if(isUniReset(n)) reset++;
  if(n.template_name==='auto-create_protocol') create++;
  if(n.template_name==='auto-run_protocol') run++;
  if(n.name==='titration_liquid') titration++;
  if(n.name==='move_plate') move++;
  if(n.device_name==='gn_solid_weighing') solid++;
});
console.log('NODES='+wf.data.nodes.length+' EDGES='+wf.data.edges.length);
console.log('pick='+pick+' place='+place+' reset='+reset+' create='+create+' run='+run+' titration='+titration+' move='+move+' solid='+solid);
console.log('solidAdds='+intent.solidAdds.length+' injTotal='+intent.injections.total+' injVol='+intent.injections.vol);
console.log('pick->place paired='+(pick===place && pick>0 ? 'YES ('+pick+')':'NO'));
`;

const fullCode = block + driver;
const vm = require('vm');
const sandbox = { crypto, fs, Math, JSON, console, String, parseInt, Array, Object };
vm.createContext(sandbox);
try { vm.runInContext(fullCode, sandbox, {filename:'regen_unilab.js'}); }
catch(e){ console.error('EXEC ERROR:', e.stack); process.exit(1); }
