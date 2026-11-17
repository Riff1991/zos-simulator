// Test převzetí případu od calltakera: správná adresa, špatná adresa (hledání pacienta), špatná naléhavost.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
global.ZOS_DATA = require(path.join(R, 'src/data.js')); global.ZOS_PEOPLE = require(path.join(R, 'src/people.js')); global.ZOS_SYMPTOMS = require(path.join(R, 'src/symptoms.json'));
global.ROUTER = require(path.join(R, 'src/router.js')); { const b = fs.readFileSync(path.join(R, 'site/graph.wasm')); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
const J = f => JSON.parse(fs.readFileSync(path.join(R, 'site', f), 'utf8'));
global.ZOS_POI = J('poi.json'); global.ZOS_RAIL = J('rail.json'); global.ZOS_ADDR = J('addr.json');
const { Sim } = require(path.join(R, 'src/engine.js'));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };

// najdi seed se standardní adresou (ulice, číslo, obec)
let seed = 1, truth;
for (; seed < 200; seed++) { const t = new Sim({ seed, mode: 'free' })._spawn(); if (/\d/.test(t.addr) && !/okolí obce|\(/.test(t.addr) && t.addr.includes(',')) { truth = t; break; } }
ok(!!truth, 'nalezen případ se standardní adresou: ' + truth.addr + ' (seed ' + seed + ')');

const run = (form, label) => {
  const sim = new Sim({ seed: 777, mode: 'free' }); const c = sim.addCallCase({ v: 1, seed, form, sec: 150 });
  for (let i = 0; i < 4 && sim.s.cases.some(x => x.status === 'intake'); i++) sim.step ? sim.step(1) : sim.tick(1);
  return { sim, c };
};
const step = sim => (sim.step ? sim.step(1) : sim.tick(1));
{ // správná adresa
  const sim = new Sim({ seed: 777, mode: 'free' }), c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: 'N' + truth.n }, sec: 150 });
  ok(c.addr === truth.addr && c.call.quality === 'exact' && !c.addrMiss && c.call.errM < 30, 'správná adresa: kvalita exact, bez chyby (' + c.call.errM + ' m)');
  ok(c.n === truth.n && c.call.typedN === truth.n, 'zadaná naléhavost = skutečná');
}
{ // adresa bez diakritiky a velkých písmen se najde
  const sim = new Sim({ seed: 777, mode: 'free' }), c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), n: String(truth.n) }, sec: 100 });
  ok(c.call.quality === 'exact', 'adresa bez diakritiky se najde (exact)');
}
{ // adresa v jiné obci → hledání pacienta
  const A = global.ZOS_ADDR, S = A.s; let other = null;
  for (let i = 0; i < A.a.length && !other; i += 8 * 101) { const city = S[A.a[i + 3]], st = S[A.a[i + 2]]; if (city && st && st !== city && !truth.addr.includes(city) && Math.abs(A.a[i] / 1e5 - truth.lat) > 0.04 && Math.abs(A.a[i] / 1e5 - truth.lat) < 0.12 && Math.abs(A.a[i + 1] / 1e5 - truth.lon) < 0.12) other = `${st} ${S[A.a[i + 4]]}, ${city}`; }
  const sim = new Sim({ seed: 777, mode: 'free' }), c = sim.addCallCase({ v: 1, seed, form: { adresa: other, n: String(truth.n) }, sec: 100 });
  ok(other && c.addrMiss && c.call.errM > 1000, 'špatná adresa (' + other + '): chyba ' + c.call.errM + ' m, případ má addrMiss');
  // bot vyšle posádku a sleduje se, zda na špatné adrese hledá
  let found = false, arrived = null, tt = 0;
  for (let i = 0; i < 12000 && arrived == null; i++) {
    for (const cs of sim.s.cases) if (cs.status === 'waiting' && !cs.crews.length) { const r = sim.suggest(cs.id, 'RZP')[0]; if (r) sim.assign(cs.id, r.crewId); if (cs.rvNeed) { const v = sim.suggest(cs.id, 'RV')[0]; if (v) sim.assign(cs.id, v.crewId); } }
    step(sim); tt++;
    if (sim.s.cases[0].arrived) arrived = sim.s.t;
    found = found || sim.s.log.some(l => /na zadané adrese pacient není/.test(l.txt || ''));
  }
  ok(found, 'posádka na zadané adrese nenašla pacienta a hledala (log)');
  ok(c.arrived && c.addr === truth.addr, 'po nalezení má případ správnou adresu');
}
{ // špatná naléhavost se zaznamená
  const sim = new Sim({ seed: 777, mode: 'free' }), wrong = truth.n === 3 ? 1 : 3, c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: String(wrong) }, sec: 100 });
  ok(c.n === wrong && c.call.truthN === truth.n && c.call.typedN === wrong, 'špatná naléhavost: zadáno ' + wrong + ', skutečně ' + truth.n);
}
{ // živé hovory: zvonění → zvednutí → odeslání → pokračování hovoru → bot vyšle posádku → ukončení
  const sim = new Sim({ seed: 31, mode: 'free', startHour: 10 }); sim.enableLiveCalls({ mode: 'training', gapSec: 90 });
  let call = null; for (let i = 0; i < 2000 && !call; i++) { step(sim); call = sim.s.calls.find(c => c.state === 'ringing'); }
  ok(!!call, 'zazvonil hovor ' + (call && call.id));
  const facts = sim.pickupCall(call.id);
  ok(facts && facts.view && facts.key && call.state === 'taken', 'hovor zvednut, facts (' + (facts && facts.key['naléhavost']) + ', ' + (facts && facts.view.persona.typ) + ')');
  for (let i = 0; i < 20; i++) step(sim);
  const c = sim.sendCall(call.id, { adresa: facts.key.adresa, n: facts.key['naléhavost'], poznamka: 'zatím nedýchá' });
  ok(c && c.call && call.state === 'taken' && call.caseId === c.id, 'případ odeslán, hovor stále běží');
  for (let i = 0; i < 10; i++) step(sim);
  ok(sim.s.cases.find(x => x.id === c.id).status === 'waiting', 'případ je u dispečera (waiting)');
  const c2 = sim.sendCall(call.id, { adresa: facts.key.adresa, n: facts.key['naléhavost'], poznamka: 'zatím nedýchá; TANR zahájena' });
  ok(c2 === c && /TANR/.test(c.poznamka) && c.call.updates >= 1, 'druhé odeslání případ jen aktualizuje (poznámka)');
  let dispatched = false; for (let i = 0; i < 400 && !dispatched; i++) { step(sim); dispatched = c.asg.length > 0; }
  ok(dispatched, 'bot dispečer vyslal posádku po reakční době');
  ok(sim.hangupCall(call.id).state === 'done', 'hovor ukončen');
  // zmeškaný hovor
  const sim2 = new Sim({ seed: 32, mode: 'free', startHour: 10 }); sim2.enableLiveCalls({ mode: 'training', gapSec: 90, ringSec: 20 });
  let n = 0; for (let i = 0; i < 4000 && !sim2.s.calls.some(c => c.state === 'missed'); i++) { step(sim2); n++; }
  ok(sim2.s.calls.some(c => c.state === 'missed'), 'nezvednutý hovor je zmeškaný po vypršení');
  // ukončení bez odeslání = penalizace
  const sim3 = new Sim({ seed: 33, mode: 'free', startHour: 10 }); sim3.enableLiveCalls({ mode: 'training', gapSec: 90 });
  let cl3 = null; for (let i = 0; i < 2000 && !cl3; i++) { step(sim3); cl3 = sim3.s.calls.find(c => c.state === 'ringing'); }
  const before = sim3.s.agg.opsPoints; sim3.pickupCall(cl3.id); sim3.hangupCall(cl3.id);
  ok(sim3.s.agg.opsPoints < before && sim3.s.log.some(l => /bez odeslání/.test(l.txt)), 'ukončení hovoru bez odeslání případu se trestá');
}
{ // adresa, kterou systém nezná: dispečer ji dohledává (zdržení)
  const simU = new Sim({ seed: 41, mode: 'free', startHour: 10 }), cu = simU.addCallCase({ v: 1, seed, form: { adresa: 'Husova 1, Neexistující', n: String(truth.n) }, sec: 60 });
  ok(cu.call.unlocatable, 'neznámá adresa je označena jako nedohledatelná');
}
console.log(fail ? 'SELHALO: ' + fail : 'calltaker test OK'); process.exit(fail ? 1 : 0);
