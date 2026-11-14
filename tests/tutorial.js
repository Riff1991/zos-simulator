// Projde všechny lekce výcviku robotem a ověří, že každý krok jde splnit.
global.ZOS_DATA = require('../src/data.js');
global.ZOS_PEOPLE = require('../src/people.js');
global.ZOS_SYMPTOMS = require('../src/symptoms.json');
global.ROUTER = require('../src/router.js');
{ const b = require('fs').readFileSync(__dirname + '/../site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
global.ZOS_POI = JSON.parse(require('fs').readFileSync(__dirname + '/../site/poi.json', 'utf8'));
global.ZOS_ADDR = JSON.parse(require('fs').readFileSync(__dirname + '/../site/addr.json', 'utf8'));
const { Sim } = require('../src/engine.js');
const { ZOS_TUTORIAL } = require('../src/tutorial.js');

function bot(sim) {
  const s = sim.s;
  for (const e of s.radioQ) {
    if (e.state === 'calling') sim.radioAnswer(e.id);
    else if (e.state === 'open') { const o = (e.opts || []).find(x => /^vj\d/.test(x.k) || x.act === 'agency' || x.act === 'assign') || (e.opts || []).find(x => x.def) || (e.opts || [])[0]; sim.radioReply(e.id, o ? o.k : null); }
  }
  for (const c of s.cases) {
    if (c.status === 'closed' || c.status === 'intake') continue;
    if (c.mu) {
      sim.setMuDispatcher('mu'); sim.requestMuModule(c.id); sim.requestMuHospitalInfo(c.id);
      if (c.mu.phase === 'declared') sim.requestMuReinforcement(c.id, 2);
      if (c.status === 'waiting' || c.mu.left > 0) for (const x of sim.suggest(c.id, 'RZP').slice(0, 2)) if (c.crews.length < 8) sim.assign(c.id, x.crewId);
      if (!c.docAssigned) { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); }
      continue;
    }
    if (c.typ === 'sekundární') { const g = sim.suggest(c.id, 'RZP')[0]; if (g && !c.crews.length && s.t >= c.scheduledAt - g.eta) sim.assign(c.id, g.crewId); continue; }
    if (c.exitus) {
      for (const id of [...c.crews]) { const k = sim.crewOf(id); if (k && k.type === 'RV' && (k.state === 'call' || k.state === 'enroute')) sim.cancelAssignment(c.id, id); }
      if (c.coroner && c.coroner.state === 'available') sim.sendAgency(c.id, 'cor');
      continue;
    }
    if (c.n === 1 && c.ind === 'aryt' && !c.docAssigned) { const k = s.crews.find(x => x.type === 'RV' && x.caseRole === 'escort' && sim.avail(x)); if (k) sim.assign(c.id, k.id); }
    for (const kind of ['pcr', 'hzs']) if (c.agencies && c.agencies[kind] && c.agencies[kind].state === 'requested') sim.sendAgency(c.id, kind);
    if (!c.crews.some(id => sim.crewOf(id).type === 'RZP')) { const r = sim.suggest(c.id, 'RZP')[0]; if (r) sim.assign(c.id, r.crewId); }
    if (c.methane && c.crews.filter(id => sim.crewOf(id).type === 'RZP').length < 2) { const r = sim.suggest(c.id, 'RZP')[0]; if (r) sim.assign(c.id, r.crewId); }
    const wx = sim._lzsWeatherStatus();
    if (c.ind === 'tonuti') {
      if (wx === 'consult' && !c.lzsConsult) sim.consultLzsPilot(c.id);
      if (c.lzsConsult && c.lzsConsult.status === 'approved' && !c.lzsActive) sim.assign(c.id, 'lzs');
      if (c.lzsActive && c.lzsTechRequired && !c.lzsTechRequested) sim.requestLzsTechnicalAssist(c.id);
      if (c.lzsPatientToHospital && !c.lzsTransferCrewId) { const r = sim.suggest(c.id, 'RZP', 'heli-transfer')[0]; if (r) sim.assign(c.id, r.crewId, 'heli-transfer'); }
    } else if (c.y !== 0 && !c.docAssigned && (c.rvNeed || (c.rvReq && !c.rvReq.cancelled))) {
      if (c.ind === 'dn_poly') sim.assign(c.id, 'lzs'); else { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); }
    }
  }
}
let bad = 0;
ZOS_TUTORIAL.lessons.forEach((L, li) => {
  const sim = new Sim({ seed: 11 + li, mode: 'shift', startHour: 9, secondaryEnabled: false, muEnabled: false, diff: 0.6, radio: 'interactive' });
  sim.startScripted('clear');
  const T = {}, ui = { sel: { c: null, k: null } };
  L.setup(sim, T);
  let failed = null;
  L.steps.forEach((st, i) => {
    if (failed) return;
    if (st.enter) st.enter(sim, T);
    if (st.skipIf && st.skipIf(sim, T, ui)) return;
    if (!st.done) return;
    let t = 0;
    while (t < 20000 && !(ui.sel.c = (T.c || T.x || {}).id, st.done(sim, T, ui))) { bot(sim); sim.step(10); t += 10; }
    if (t >= 20000) failed = `krok ${i + 1}`;
  });
  console.log((failed ? 'FAIL ' : 'ok   ') + `lekce ${li + 1} ${L.title}${failed ? ' – nesplněn ' + failed : ''} (t=${Math.round(sim.s.t)})`);
  if (failed) bad++;
});
if (bad) { console.log('Výcvik: ' + bad + ' lekcí s chybou'); process.exit(1); }
console.log('Výcvik: všechny lekce projdou');
