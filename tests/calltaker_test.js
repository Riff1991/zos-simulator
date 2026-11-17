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
{ // zavěšení bez uzavření: případ jde po hovoru poslat a doplnit, trest až po finishCall
  const sim = new Sim({ seed: 51, mode: 'free', startHour: 10 }); sim.enableLiveCalls({ mode: 'training', gapSec: 90 });
  let cl = null; for (let i = 0; i < 2000 && !cl; i++) { step(sim); cl = sim.s.calls.find(c => c.state === 'ringing'); }
  const f = sim.pickupCall(cl.id), before = sim.s.agg.opsPoints;
  ok(sim.endCall(cl.id).state === 'wrap' && sim.s.agg.opsPoints === before, 'endCall: hovor v dovyplňování, bez trestu');
  const c = sim.sendCall(cl.id, { adresa: f.key.adresa, n: String(f.key['naléhavost']).replace('N', '') });
  ok(c && c.call && cl.caseId === c.id, 'po zavěšení jde případ poprvé odeslat');
  sim.sendCall(cl.id, { adresa: f.key.adresa, n: String(f.key['naléhavost']).replace('N', ''), poznamka: 'doplněno' });
  ok(/doplněno/.test(c.poznamka), 'po zavěšení jde případ aktualizovat');
  ok(sim.finishCall(cl.id).state === 'done' && sim.s.agg.opsPoints === before, 'finishCall: odeslaný případ bez trestu');
  const sim2 = new Sim({ seed: 52, mode: 'free', startHour: 10 }); sim2.enableLiveCalls({ mode: 'training', gapSec: 90 });
  let c2 = null; for (let i = 0; i < 2000 && !c2; i++) { step(sim2); c2 = sim2.s.calls.find(c => c.state === 'ringing'); }
  sim2.pickupCall(c2.id); const b2 = sim2.s.agg.opsPoints; sim2.endCall(c2.id); sim2.finishCall(c2.id);
  ok(sim2.s.agg.opsPoints < b2, 'finishCall bez odeslání případu se trestá');
}
{ // adresa, kterou systém nezná: dispečer ji dohledává (zdržení)
  const simU = new Sim({ seed: 41, mode: 'free', startHour: 10 }), cu = simU.addCallCase({ v: 1, seed, form: { adresa: 'Husova 1, Neexistující', n: String(truth.n) }, sec: 60 });
  ok(cu.call.unlocatable, 'neznámá adresa je označena jako nedohledatelná');
}
{ // AML: dostupnost, fáze, determinismus, pravda v kruhu
  const sim = new Sim({ seed: 5, mode: 'free' }), H = (la, lo, la2, lo2) => { const R = 6371000, p = Math.PI / 180, a = Math.sin((la2 - la) * p / 2) ** 2 + Math.cos(la * p) * Math.cos(la2 * p) * Math.sin((lo2 - lo) * p / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); };
  let mob = 0, aml = 0, inCell = 0, inAml = 0, amlN = 0, tot = 0, bad = false; const src = {};
  for (let sd = 1000; sd < 1400; sd++) {
    const f = sim.callFacts(sd), g = sim.callFacts(sd); tot++;
    if (JSON.stringify(f.aml) !== JSON.stringify(g.aml)) bad = true;
    if (f.aml.typ !== 'mobil') { if (f.aml.phases.length) bad = true; continue; }
    mob++; const P = f.aml.phases;
    if (P[0].zdroj !== 'buňka' || P[0].atSec !== 0 || P[0].radiusM < 600 || P[0].radiusM > 3500) bad = true;
    if (H(P[0].lat, P[0].lon, f.key.lat, f.key.lon) <= P[0].radiusM) inCell++;
    if (P[1]) { aml++; src[P[1].zdroj] = (src[P[1].zdroj] || 0) + 1; if (P[1].atSec < 8 || P[1].atSec > 40 || P[1].radiusM < 5 || P[1].radiusM > 150 || P[1].radiusM >= P[0].radiusM) bad = true; amlN++; if (H(P[1].lat, P[1].lon, f.key.lat, f.key.lon) <= P[1].radiusM) inAml++; }
    if (JSON.stringify(f.view).includes(String(f.key.lat))) bad = true;
  }
  ok(!bad, 'AML: fáze v mezích, deterministické, pevná/skryté bez polohy, pravda se ve view neprozradí');
  ok(mob / tot > 0.7 && mob / tot < 0.9, 'AML: podíl mobilů ' + (mob / tot).toFixed(2));
  ok(aml / mob > 0.65 && aml / mob < 0.85, 'AML: dostupnost u mobilů ' + (aml / mob).toFixed(2) + ' (zdroje ' + JSON.stringify(src) + ')');
  ok(inCell / mob > 0.99, 'AML: pravda uvnitř kruhu buňky (' + (inCell / mob).toFixed(3) + ')');
  ok(inAml / amlN > 0.9 && inAml / amlN < 0.99, 'AML: pravda uvnitř kruhu AML u ~95 % (' + (inAml / amlN).toFixed(3) + ')');
}
{ // bod z mapy: tolerance, malé zdržení, chybná poloha
  const near = (m, ang) => { const d = m / 111320; return { lat: truth.lat + d * Math.cos(ang), lon: truth.lon + d * Math.sin(ang) / Math.cos(truth.lat * Math.PI / 180) }; };
  const mk = (m, extra) => { const sim = new Sim({ seed: 777, mode: 'free' }); return sim.addCallCase({ v: 1, seed, form: Object.assign({ adresa: truth.addr, bod: near(m, 1), zdroj: 'mapa', n: String(truth.n) }, extra || {}), sec: 90 }); };
  const kind = new Sim({ seed: 1, mode: 'free' })._ctKind(truth), tol = new Sim({ seed: 1, mode: 'free' })._ctTol(truth);
  ok(kind === 'dum' && tol === 60, 'tolerance pro standardní adresu 60 m');
  let c = mk(30);
  ok(!c.addrMiss && !c.call.searchDelay && c.call.errM < 40 && c.call.zdroj === 'mapa', 'bod do 60 m: správně, bez zdržení (' + c.call.errM + ' m)');
  c = mk(100);
  ok(!c.addrMiss && c.call.searchDelay >= 60 && c.call.searchDelay <= 150, 'bod 100 m: malé zdržení ' + c.call.searchDelay + ' s');
  c = mk(400);
  ok(c.addrMiss && c.addrMiss.thr === 180 && c.call.miss, 'bod 400 m (> 3× tolerance): chybná poloha s následky');
  // posádka u bodu 100 m vedle chvíli hledá a pak dojede
  { const sim = new Sim({ seed: 777, mode: 'free' }), cc = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, bod: near(100, 2), n: String(truth.n) }, sec: 90 }); let hl = false, arr = false;
    for (let i = 0; i < 12000 && !arr; i++) { for (const cs of sim.s.cases) if (cs.status === 'waiting' && !cs.crews.length) { const r = sim.suggest(cs.id, 'RZP')[0]; if (r) sim.assign(cs.id, r.crewId); } step(sim); arr = !!cc.arrived; hl = hl || sim.s.log.some(l => /pacienta hledáme/.test(l.txt || '')); }
    ok(arr && hl, 'u bodu těsně mimo toleranci posádka krátce hledá a dojede'); }
  c = mk(10, { adresa: 'Husova 1, Neexistující' });
  ok(!c.call.unlocatable && !c.addrMiss, 'bod z mapy má přednost před neznámým textem adresy');
  c = mk(10, { adresa: truth.addr });
  ok(c.call.check.bodM === c.call.errM && c.call.check.zdroj === 'mapa', 'kontrola obsahuje vzdálenost a zdroj polohy');
}
{ // nová pole a kontrola klasifikace
  const f = new Sim({ seed: 5, mode: 'free' }).callFacts(seed), k = f.key, sp = String(k.pacient).split(/\s+/), vp = String(f.view.volajici.jmeno).split(/\s+/);
  const sim = new Sim({ seed: 777, mode: 'free' });
  const form = { adresa: k.adresa, n: String(k['naléhavost']).replace('N', ''), klasif: k.klasifikace, priznaky: k.priznakyList.slice(), dyn: k.dynamicka, pJmeno: sp[0], pPrijmeni: sp[sp.length - 1], pVek: k.vek, vJmeno: vp[0], vPrijmeni: vp[vp.length - 1], zdroj: 'AML', popis: 'test', upresneni: '2. patro' };
  const c = sim.addCallCase({ v: 1, seed, form, sec: 80 }), ck = c.call.check;
  ok(ck.klasif.ok && ck.n.ok && ck.dyn.ok && ck.priznaky.jaccard === 1 && ck.vek.ok && ck.jmena.pacient === true && ck.jmena.volajici === true && ck.aml, 'kontrola klasifikace: vše shodné → samé shody (J ' + ck.priznaky.jaccard + ')');
  ok(/2\. patro/.test(c.poznamka), 'upřesnění místa jde do poznámky pro dispečera');
  sim.updateCallCase(c, Object.assign({}, form, { klasif: k.klasifikace === 'Bolest' ? 'Dušnost' : 'Bolest', priznaky: [], pVek: k.vek + 40, pJmeno: 'Xxx', n: '3', dyn: !k.dynamicka }));
  const c2 = c.call.check; 
  ok(!c2.klasif.ok && c2.priznaky.jaccard < 0.5 && c2.vek.ok === false && c2.jmena.pacient === false && !c2.dyn.ok, 'aktualizace přepočítá kontrolu (špatná klasifikace, věk, jméno, dynamika)');
  ok(JSON.stringify(sim.s) && JSON.parse(JSON.stringify(sim.s)).cases.length === 1, 'stav zůstává čistý JSON');
}
console.log(fail ? 'SELHALO: ' + fail : 'calltaker test OK'); process.exit(fail ? 1 : 0);
