global.ZOS_DATA = require('../src/data.js');
global.ZOS_PEOPLE = require('../src/people.js');
global.ZOS_SYMPTOMS = require('../src/symptoms.json');
global.ROUTER = require('../src/router.js');
{ const b = require('fs').readFileSync(__dirname + '/../site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
global.ZOS_POI = JSON.parse(require('fs').readFileSync(__dirname + '/../site/poi.json', 'utf8'));
global.ZOS_RAIL = JSON.parse(require('fs').readFileSync(__dirname + '/../site/rail.json', 'utf8'));
global.ZOS_ADDR = JSON.parse(require('fs').readFileSync(__dirname + '/../site/addr.json', 'utf8'));
const { Sim, hav } = require('../src/engine.js');
// zdroj UI je rozdělen do src/ui-*.js (v build.py se skládá do jedné IIFE); testy čtou text všech částí
const SRC_LIST = require('fs').readdirSync(__dirname + '/../src');
const UI_FILES = SRC_LIST.filter(f => /^ui-.*\.js$/.test(f)).sort();
const readUi = () => UI_FILES.map(f => require('fs').readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n');
const SRC_FILES = SRC_LIST.filter(f => /^(ui-|sim-|engine).*\.js$/.test(f)).map(f => 'src/' + f).concat(['src/voice.js', 'src/messages.js', 'src/weather.js']);

function bot(sim) {
  const s = sim.s;
  for (const c of s.cases) {
    if (c.status === 'waiting') {
      if (c.mu) {
        const m = sim.suggest(c.id, 'MU')[0]; if (m && !c.crews.length) sim.assign(c.id, m.crewId);
        const r = sim.suggest(c.id, 'RZP').slice(0, 2); r.forEach(x => sim.assign(c.id, x.crewId));
        const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
        const l = sim.suggest(c.id, 'LZS')[0]; if (l) sim.assign(c.id, l.crewId);
        continue;
      }
      if (c.exitus) { if (c.examPending) { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); } continue; }
      const r = sim.suggest(c.id, 'RZP')[0];
      if (r) sim.assign(c.id, r.crewId);
      if (c.rvNeed) { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); }
    }
    if (c.coroner && c.coroner.state === 'available') sim.sendAgency(c.id, 'cor');
    if (c.status === 'active' && c.rvReq && !c.rvReq.cancelled && !c.rvReq.satT && !c.docAssigned) {
      const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
    }
    if (c.status === 'active' && c.rvNeed && !c.docAssigned) {
      const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
    }
  }
}
function invariants(sim) {
  const s = sim.s;
  for (const c of s.crews) {
    const p = sim.pos(c);
    if (!isFinite(p.lat) || !isFinite(p.lon)) throw new Error('NaN pos ' + c.id);
    if (['call', 'enroute', 'onscene', 'transport', 'handover'].includes(c.state)) {
      const cs = sim.caseOf(c.caseId);
      if (!cs) throw new Error('crew without case ' + c.id + ' ' + c.state);
      if (cs.status === 'closed') throw new Error('crew on closed case ' + c.id);
      if (!cs.crews.includes(c.id)) throw new Error('case lacks crew ' + c.id);
    } else if (c.caseId) throw new Error('idle crew has case ' + c.id + c.state);
  }
  for (const cs of s.cases) {
    const busy = s.crews.filter(c => c.caseId === cs.id);
    if (cs.status === 'closed' && busy.length) throw new Error('closed case with crews');
    if (cs.status === 'waiting' && busy.length) throw new Error('waiting case with crews ' + cs.num);
  }
}

// akutní sekundární převozy: frekvence podle reálných dat, průběh případu, bez eskalace
{
  // 1) frekvence plánovače: denní směna ≈ 0,93 (74 % z 1,25 za den), nikdy mimo hodiny z dat; levně přes _nextAcute
  let n = 0, runs = 600, hrs = new Array(24).fill(0);
  for (let seed = 1; seed <= runs; seed++) {
    const p = new Sim({ seed, mode: 'shift', startHour: 7 });
    let t = 0;
    for (let i = 0; i < 12; i++) { t = p._nextAcute(t); if (t >= 12 * 3600) break; n++; hrs[Math.floor(((7 * 3600 + t) % 86400) / 3600)]++; }
  }
  const per = n / runs;
  if (per < 0.78 || per > 1.08) throw new Error(`akutní sekundáry: ${per.toFixed(2)} za denní směnu, čekám ~0,93`);
  if (hrs[4] > hrs[15]) throw new Error('hodinový profil neodpovídá datům (noc častější než odpoledne)');
  // 1b) krátký plný běh: případy vznikají, invarianty drží, žádný nevzniká během vypnutých sekundárů
  const off = new Sim({ seed: 12, mode: 'shift', startHour: 7, secondaryEnabled: false });
  off.step(8 * 3600);
  if (off.s.cases.some(c => c.acuteSec)) throw new Error('akutní sekundár vznikl při vypnutých sekundárech');
  // 2) jeden případ od začátku do konce
  const sim = new Sim({ seed: 7, mode: 'shift', startHour: 7 });
  sim.step(120);
  const c = sim._spawnAcuteSecondary({ n: 2, from: 'h-ck', to: 'h-cb', rlp: true });
  if (c.typ !== 'primární' || !c.acuteSec || c.klasif !== 'Převoz' || c.targetHospitalId !== 'h-cb' || !c.rvNeed || c.n !== 2) throw new Error('akutní sekundár: špatná struktura ' + JSON.stringify({ typ: c.typ, ac: c.acuteSec, k: c.klasif, t: c.targetHospitalId, rv: c.rvNeed, n: c.n }));
  let k = 0, sawDoc = false;
  while (c.status !== 'closed' && k++ < 1500) { sim.step(10); bot(sim); invariants(sim); if (c.docAssigned) sawDoc = true; if (c.n !== 2 && c.n !== 1) throw new Error('akutní sekundár eskaloval/zhoršil se na N' + c.n); }
  if (c.status !== 'closed' || c.unserved) throw new Error('akutní sekundár se neobsloužil');
  if (!c.score || !isFinite(c.score.total)) throw new Error('akutní sekundár nemá skóre jako primární');
  if (!sawDoc) throw new Error('RLP: lékař nebyl vyslán');
  // 3) bez posádky nezavírá po 45 min jako neobsluzený (nemocnice volá znovu, případ čeká)
  const w = new Sim({ seed: 9, mode: 'shift', startHour: 7 });
  w.s.crews.forEach(x => { if (x.type === 'RZP') x.state = 'off'; });
  const c2 = w._spawnAcuteSecondary({ n: 3, from: 'h-st', to: 'h-cb', rlp: false });
  w.step(4 * 3600);
  if (c2.status === 'closed' || c2.n !== 3) throw new Error('akutní sekundár bez posádky: status ' + c2.status + ' N' + c2.n);
  console.log(`akutní sekundáry: ${per.toFixed(2)} za denní směnu, případ proběhl s lékařem, čekající neeskaluje`, true);
}
