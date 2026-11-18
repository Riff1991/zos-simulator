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
  ok(sim.finishCall(cl.id).state === 'done' && c.call.skore && c.call.skore.total > 0 && c.call.skore.total <= c.call.skore.max, 'finishCall: odeslaný případ dostane body (' + (c.call.skore && c.call.skore.total) + '/' + (c.call.skore && c.call.skore.max) + ')');
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
{ // volající: věk, hlas podle věku, rozmanitost typů, seniorské typy
  const sim = new Sim({ seed: 5, mode: 'free' }), PR = require(path.join(R, 'calltaker/prompts.js')), PE = require(path.join(R, 'calltaker/personas.js'));
  const typ = {}, band = {}; let n = 0, sen = 0, senOk = 0, bad = false, noAge = 0, cizi = 0, ciziJ = 0;
  for (let sd = 1; sd <= 1500; sd++) {
    const f = sim.callFacts(sd), v = f.view, p = v.persona; n++;
    typ[p.typ] = (typ[p.typ] || 0) + 1; band[p.pasmo] = (band[p.pasmo] || 0) + 1;
    if (!Number.isFinite(v.volajici.vek) || v.volajici.vek < 3 || v.volajici.vek > 105) noAge++;
    if (p.vekVolajiciho !== v.volajici.vek || !p.hlas || !p.slovnik || !p.prostredi) bad = true;
    if (v.volajici.vek >= 70) { sen++; if (/^senior_|pacient_|profesional|ustarany|vecny|vagni|panika|plac|soc|hovorny|flegmatik|rozcileny|nespolupracujici|opily|cizinec|mensina/.test(p.typ) && !/^(dite|teen|mlady_spech|dospely_rodic_seniora|turista)/.test(p.typ)) senOk++; }
    if (p.typ === 'cizinec') { cizi++; if (p.jazyk) ciziJ++; }
    if (sd % 300 === 0) { const t = PR.callerSystem(v, true); if (!t.includes(p.hlas) || !t.includes(String(v.volajici.vek))) bad = true; }
  }
  ok(!bad && noAge === 0, 'volající mají věk, hlas podle věku, slovník a prostředí; prompt je obsahuje');
  ok(Object.keys(typ).length >= 25, 'rozmanitost typů volajících: ' + Object.keys(typ).length + ' různých');
  ok(['teen', 'mlady', 'stredni', 'starsi', 'senior1', 'senior2', 'senior3'].every(b => band[b] > 0), 'všechna věková pásma se vyskytují: ' + JSON.stringify(band));
  ok(sen > 30 && senOk === sen, 'senioři (70+) nikdy nedostanou mladistvý typ: ' + sen);
  ok(cizi === ciziJ, 'cizinci mají určený jazyk');
  const a = sim.callFacts(77), b = sim.callFacts(77); ok(JSON.stringify(a.view.persona) === JSON.stringify(b.view.persona), 'persona je deterministická');
  const sn = {}; for (let sd = 1; sd <= 1500; sd++) { const f = sim.callFacts(sd); if (f.view.volajici.vek >= 75) sn[f.view.persona.typ] = (sn[f.view.persona.typ] || 0) + 1; }
  console.log('typy u 75+:', JSON.stringify(sn)); console.log('všechny typy:', JSON.stringify(typ));
}

const ringKind = (sim, kind, extra) => { sim._ringCall(kind, extra); return sim.s.calls[sim.s.calls.length - 1]; };
{ // N1 předpoplach, lékař podle zadaného N, přesměrování, PČR a HZS, hovory bez výjezdu, opakované a duplicitní, zpětné volání
  const mkSim = sd => { const sm = new Sim({ seed: sd, mode: 'free', startHour: 10 }); sm.enableLiveCalls({ mode: 'training', gapSec: 600, level: 'bezne' }); return sm; };
  // předpoplach: jen adresa a N1, bot vyšle do 20 s RZP i RV
  { const sm = mkSim(61), cl = ringKind(sm, 'vyjezd'); sm.pickupCall(cl.id); const f = sm.callFacts(cl.seed, cl);
    const c = sm.sendCall(cl.id, { adresa: f.key.adresa, n: '1', predpoplach: true, zdroj: 'adresa' });
    ok(c.call.predpoplach && c.n === 1 && c.rvNeed, 'předpoplach N1: případ vznikl jen z adresy a N1, RV se očekává');
    let t0 = sm.s.t, got = false; for (let i = 0; i < 90 && !got; i++) { step(sm); got = c.asg.length > 0; }
    ok(got && sm.s.t - t0 <= 70, 'předpoplach: bot vyslal posádky do ' + Math.round(sm.s.t - t0) + ' s'); }
  // lékař: N3 zadané při pravdě s lékařem → RV se nevyšle a posádka ho později žádá; N1 → vždy RV
  { let seedRv = null; for (let sd = 1; sd < 800 && !seedRv; sd++) { const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if (t.rvNeed && t.n <= 2 && /\d/.test(t.addr) && !/okolí|\(/.test(t.addr)) seedRv = { sd, t }; }
    ok(!!seedRv, 'nalezen případ s potřebou lékaře'); const sm = mkSim(62);
    const bad = sm.addCallCase({ v: 1, seed: seedRv.sd, form: { adresa: seedRv.t.addr, n: '3', klasif: 'Bolest', priznaky: [] }, sec: 60 });
    ok(!bad.rvNeed && bad.rvLater && bad.initialDispatchRequired.length === 1, 'špatná klasifikace a N3: RV se nevysílá, lékaře si posádka vyžádá později');
    const good = sm.addCallCase({ v: 1, seed: seedRv.sd, form: { adresa: seedRv.t.addr, n: String(seedRv.t.n), klasif: seedRv.t.klasif, priznaky: seedRv.t.symptoms.slice() }, sec: 60 });
    ok(good.rvNeed && good.initialDispatchRequired.includes('RV'), 'správná klasifikace: lékař se vysílá'); }
  // přesměrování po změně adresy
  { const sm = mkSim(63), tc = new Sim({ seed: 63, mode: 'free' })._spawn(); void tc;
    let seedA = null; for (let sd = 1; sd < 300 && !seedA; sd++) { const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if (/\d/.test(t.addr) && !/okolí|\(/.test(t.addr) && t.addr.includes(',')) seedA = { sd, t }; }
    const c = sm.addCallCase({ v: 1, seed: seedA.sd, form: { adresa: seedA.t.addr, n: '2', zdroj: 'adresa' }, sec: 40 });
    for (let i = 0; i < 400 && !c.asg.length; i++) step(sm);
    const k = sm.crewOf(c.crews[0]); const before = k && k.until;
    const d = 0.02, tr = seedA.t, nl = { lat: tr.lat + d, lon: tr.lon };
    sm.updateCallCase(c, { adresa: seedA.t.addr, bod: nl, zdroj: 'mapa', n: '2' });
    ok(k && (c.addrChanges || 0) >= 1 && k.until !== before, 'změna místa po vyslání přesměruje jedoucí posádku (' + (c.addrChanges || 0) + ')'); }
  // PČR/HZS: chybějící označení → posádka žádá na místě
  { let seedAg = null; for (let sd = 1; sd < 4000 && !seedAg; sd++) { const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if ((t.agNeed || []).length && /\d/.test(t.addr) && !/okolí|\(/.test(t.addr)) seedAg = { sd, t }; }
    if (seedAg) { const sm = mkSim(64); const c1 = sm.addCallCase({ v: 1, seed: seedAg.sd, form: { adresa: seedAg.t.addr, n: String(seedAg.t.n), agPcr: seedAg.t.agNeed.includes('pcr'), agHzs: seedAg.t.agNeed.includes('hzs') }, sec: 50 });
      ok(Object.keys(c1.agencies || {}).length === seedAg.t.agNeed.length && !(c1.agLate || []).length, 'PČR/HZS označené v hovoru jdou hned dispečerovi');
      const c2 = sm.addCallCase({ v: 1, seed: seedAg.sd, form: { adresa: seedAg.t.addr, n: String(seedAg.t.n) }, sec: 50 });
      ok((c2.agLate || []).length === seedAg.t.agNeed.length, 'PČR/HZS neoznačené v hovoru se vyžádají až na místě'); } else console.log('(žádný seed s PČR/HZS)'); }
  // PČR/HZS neoznačené v hovoru: při příjezdu první posádky se přivolají automaticky, bez výjimky a bez bodového postihu (bot zapnutý i vypnutý)
  { const seeds = []; for (let sd = 1; sd < 6000 && seeds.length < 4; sd++) { const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if ((t.agNeed || []).length && /\d/.test(t.addr) && !/okolí|\(/.test(t.addr) && t.addr.includes(',') && (seeds.length < 2 || t.agNeed.includes('hzs') !== seeds[0].t.agNeed.includes('hzs') || seeds.length < 3)) seeds.push({ sd, t }); }
    ok(seeds.length >= 2, 'nalezeny případy s potřebou PČR/HZS (' + seeds.length + ')');
    for (const bot of [true, false]) for (const sg of seeds) {
      const sm = mkSim(80 + sg.sd % 7); sm.s.liveCalls.bot = bot;
      const pen = []; const os = sm._opsScore.bind(sm); sm._opsScore = (d, why, id) => { if (/PČR|HZS|vyrozuměn/.test(String(why))) pen.push([d, why]); return os(d, why, id); };
      const c = sm.addCallCase({ v: 1, seed: sg.sd, form: { adresa: sg.t.addr, n: String(sg.t.n), zdroj: 'adresa' }, sec: 40 });
      const need = c.agLate.slice(); let thrown = null;
      const crewsAssign = () => { for (const cs of sm.s.cases) if (cs.status === 'waiting' && !cs.crews.length) { const r = sm.suggest(cs.id, 'RZP')[0]; if (r) sm.assign(cs.id, r.crewId); if (cs.rvNeed) { const v = sm.suggest(cs.id, 'RV')[0]; if (v) sm.assign(cs.id, v.crewId); } } };
      try { for (let i = 0; i < 40000 && !c.arrived; i++) { if (!bot) crewsAssign(); step(sm); } for (let i = 0; i < 900; i++) step(sm); } catch (e) { thrown = e; }
      const A = c.agencies || {};
      ok(!thrown && c.arrived, `agLate (bot ${bot ? 'ano' : 'ne'}, seed ${sg.sd}): dojezd bez výjimky${thrown ? ' – ' + thrown.message : ''}`);
      ok(need.length > 0 && c.agLateDone === true && need.every(k => A[k] && (A[k].state === 'sent' || A[k].state === 'onscene')), `agLate (bot ${bot ? 'ano' : 'ne'}, seed ${sg.sd}): ${need.join('+')} přivolána automaticky`);
      ok(pen.length === 0 && !sm.s.log.some(l => /nevyrozuměná/.test(l.txt || '')), `agLate (bot ${bot ? 'ano' : 'ne'}, seed ${sg.sd}): bez bodového postihu ani bonusu`);
      ok(sm.s.log.some(l => /přivolává automaticky/.test(l.txt || '')), `agLate (bot ${bot ? 'ano' : 'ne'}, seed ${sg.sd}): záznam v logu`);
      ok(JSON.stringify(JSON.parse(JSON.stringify(sm.s))) === JSON.stringify(sm.s), `agLate (bot ${bot ? 'ano' : 'ne'}, seed ${sg.sd}): stav je čistý JSON`);
    }
    // determinismus: dva běhy stejného scénáře dají stejný stav
    const rn = () => { const sm = mkSim(99), c = sm.addCallCase({ v: 1, seed: seeds[0].sd, form: { adresa: seeds[0].t.addr, n: String(seeds[0].t.n), zdroj: 'adresa' }, sec: 40 }); for (let i = 0; i < 40000 && !c.arrived; i++) step(sm); for (let i = 0; i < 900; i++) step(sm); return JSON.stringify(sm.s); };
    ok(rn() === rn(), 'agLate: determinismus dvou běhů');
    // skóre hovoru: chybějící PČR/HZS (později automaticky přivolané) nesnižuje ag body, ať se hovor vyhodnotí před příjezdem nebo po něm; evidence c.agLate zůstává
    for (const sg of seeds.slice(0, 3)) for (const after of [false, true]) {
      const sm = mkSim(90 + sg.sd % 5), flagged = { agPcr: sg.t.agNeed.includes('pcr'), agHzs: sg.t.agNeed.includes('hzs') };
      const run = fl => { const cl = ringKind(sm, 'vyjezd', { seed: sg.sd }); sm.pickupCall(cl.id); const c = sm.sendCall(cl.id, Object.assign({ adresa: sg.t.addr, n: String(sg.t.n), zdroj: 'adresa' }, fl ? flagged : {})); sm.endCall(cl.id);
        if (after) { for (let i = 0; i < 40000 && !c.arrived; i++) step(sm); for (let i = 0; i < 60; i++) step(sm); }
        sm.finishCall(cl.id); return c; };
      const miss = run(false), good = run(true), tag = `seed ${sg.sd}, ${after ? 'po příjezdu' : 'před příjezdem'}`;
      ok(miss.call.skore && good.call.skore && miss.call.skore.ag === 5 && good.call.skore.ag === 5, `agLate skóre (${tag}): ag body bez postihu za neoznačené služby (${miss.call.skore && miss.call.skore.ag}/${good.call.skore && good.call.skore.ag})`);
      ok((miss.agLate || []).length > 0 && !(good.agLate || []).length, `agLate skóre (${tag}): evidence c.agLate zůstává (${(miss.agLate || []).join('+')})`);
      ok(JSON.stringify(JSON.parse(JSON.stringify(sm.s))) === JSON.stringify(sm.s), `agLate skóre (${tag}): stav je čistý JSON`);
    }
  }
  // hovor bez výjezdu: odeslání se trestá, správné vyřízení se odměňuje
  { const sm = mkSim(65), cl = ringKind(sm, 'bez'); const f = sm.pickupCall(cl.id);
    ok(f.kind === 'bez' && f.key.vyjezd === false && f.view.situace && /NEVYŽADUJE/.test(f.view.situace), 'hovor bez výjezdu má scénář (' + f.key.scenar + ')');
    const b = sm.s.agg.opsPoints; sm.endCall(cl.id); sm.finishCall(cl.id); ok(sm.s.agg.opsPoints > b, 'hovor bez výjezdu správně nevyslaný: body navíc');
    const cl2 = ringKind(sm, 'bez'); sm.pickupCall(cl2.id); const b2 = sm.s.agg.opsPoints; const r = sm.sendCall(cl2.id, { adresa: 'x', n: '3' }); sm.endCall(cl2.id); sm.finishCall(cl2.id);
    ok(r.noDispatch && sm.s.cases.length === 0 && sm.s.agg.opsPoints < b2, 'zbytečné odeslání hovoru bez výjezdu: žádný případ a ztráta bodů'); }
  // opakovaný hovor navazuje na případ; duplicita se sloučí, jinak je případ duplicitní a bot ho sloučí
  { const sm = mkSim(66), cl = ringKind(sm, 'vyjezd'); const f0 = sm.pickupCall(cl.id); const c = sm.sendCall(cl.id, { adresa: f0.key.adresa, n: String(f0.key['naléhavost']).replace('N', '') }); sm.endCall(cl.id); sm.finishCall(cl.id);
    const op = ringKind(sm, 'opak', { seed: cl.seed, caseId: c.id }); const fo = sm.pickupCall(op.id);
    ok(op.caseId === c.id && fo.view.opakovane && /podruhé/.test(fo.view.situace), 'opakovaný hovor navazuje na případ a volající přináší novou informaci');
    const c3 = sm.sendCall(op.id, { adresa: f0.key.adresa, n: '1', poznamka: 'zhoršení' }); ok(c3 === c && /zhoršení/.test(c.poznamka), 'opakovaný hovor případ jen aktualizuje'); sm.endCall(op.id); sm.finishCall(op.id);
    const dp = ringKind(sm, 'dup', { seed: cl.seed, caseId: c.id }); const fd = sm.pickupCall(dp.id);
    ok(fd.view.volajici.jmeno !== f0.view.volajici.jmeno && fd.key.duplicita, 'duplicitní hovor: jiný volající k téže události');
    const b = sm.s.agg.opsPoints; const m = sm.sendCall(dp.id, { slucitS: c.id }); ok(m === c && sm.s.agg.opsPoints > b && sm.s.cases.length === 1, 'duplicitní hovor sloučený s případem: body navíc, žádný nový případ'); sm.endCall(dp.id); sm.finishCall(dp.id);
    const dp2 = ringKind(sm, 'dup', { seed: cl.seed, caseId: c.id }); sm.pickupCall(dp2.id); const nd = sm.sendCall(dp2.id, { adresa: f0.key.adresa, n: '2' });
    ok(nd.dupOf === c.id && sm.s.cases.length === 2, 'nesloučený duplicitní hovor vytvoří duplicitní případ'); for (let i = 0; i < 160; i++) step(sm);
    ok(sm.s.cases.length === 1, 'bot duplicitní případ sloučí (zbyde jeden)'); }
  // přerušení spojení: volající zavolá zpět, případ zůstává
  { const sm = mkSim(67), cl = ringKind(sm, 'vyjezd'); const f = sm.pickupCall(cl.id); const c = sm.sendCall(cl.id, { adresa: f.key.adresa, n: '2' });
    sm.dropCall(cl.id); ok(cl.state === 'dropped', 'spojení přerušeno');
    for (let i = 0; i < 60 && cl.state !== 'ringing'; i++) step(sm);
    ok(cl.state === 'ringing' && cl.cb, 'volající zavolal zpět'); const f2 = sm.pickupCall(cl.id);
    ok(cl.state === 'taken' && cl.caseId === c.id && f2.view.situace && /přerušilo/.test(f2.view.situace) && cl.resumes === 1, 'zpětný hovor navazuje, případ zůstal'); }
  // úrovně: začátečník bez agresivních a cizinců, těžké s nimi
  { const cnt = lv => { const sm = mkSim(68); sm.s.liveCalls.level = lv; const o = {}; for (let sd = 1; sd <= 800; sd++) { const t = sm.callFacts(sd).view.persona.typ; o[t] = (o[t] || 0) + 1; } return o; };
    const z = cnt('zacatecnik'), t = cnt('tezke');
    ok(!(z.agresivni > 0) && !(z.nespolupracujici > 0) && (t.agresivni || 0) > (z.agresivni || 0) && (t.cizinec || 0) > 2 * (z.cizinec || 0), 'úrovně: začátečník bez agresivních, těžké s více cizinci a agresivními (' + (z.cizinec || 0) + ' → ' + (t.cizinec || 0) + ' cizinců, ' + (t.agresivni || 0) + ' agresivních)'); }
}
{ // realistický tok: přesně každá 4. výzva jde přes hráče
  const sm = new Sim({ seed: 9, mode: 'free', startHour: 10 }); sm.enableLiveCalls({ mode: 'realistic' });
  for (let i = 0; i < 4 * 3600; i++) step(sm);
  const L = sm.s.liveCalls, rung = sm.s.calls.filter(c => !c.ref).length;
  ok(L.cnt >= 30 && rung === Math.floor(L.cnt / 4), 'realistický tok: ze ' + L.cnt + ' výzev jde přes hráče přesně každá 4. (' + rung + ')');
}
{ // bot posílá PČR/HZS podle příznaků v hovoru (+PČR, +HZS) a podle zaškrtnutí
  let seedAg = null; for (let sd = 1; sd < 4000 && !seedAg; sd++) { const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if ((t.agNeed || []).includes('pcr') && /\d/.test(t.addr) && !/okolí|\(/.test(t.addr)) seedAg = { sd, t }; }
  if (seedAg) {
    const sm = new Sim({ seed: 70, mode: 'free', startHour: 10 }); sm.enableLiveCalls({ mode: 'training', gapSec: 900 });
    const c = sm.addCallCase({ v: 1, seed: seedAg.sd, form: { adresa: seedAg.t.addr, n: String(seedAg.t.n), klasif: seedAg.t.klasif, priznaky: seedAg.t.symptoms.slice() }, sec: 40 });
    ok(c.agencies && c.agencies.pcr && c.agencies.pcr.state === 'requested', 'příznak PČR v hovoru: PČR je vyžádána');
    for (let i = 0; i < 200 && !(c.agencies.pcr.state === 'sent' || c.agencies.pcr.state === 'onscene'); i++) step(sm);
    ok(c.agencies.pcr.state === 'sent' || c.agencies.pcr.state === 'onscene', 'bot PČR skutečně vyslal (' + c.agencies.pcr.state + ')');
  } else console.log('(žádný seed s PČR)');
}
{ // cizinci a menšiny: jméno odpovídá původu, přízvuk, místo ovlivňuje výskyt
  const CZ = require(path.join(R, 'calltaker/cizinci.js')), sim = new Sim({ seed: 5, mode: 'free' });
  const byDesc = {}; for (const [id, g] of Object.entries(CZ.GROUPS)) byDesc[g.popis] = id;
  const cnt = {}; let tot = 0, foreign = 0, badName = 0, noAccent = 0, checkOk = 0, checkN = 0;
  for (let sd = 1; sd <= 3000; sd++) {
    const f = sim.callFacts(sd), p = f.view.persona; tot++;
    if (p.typ !== 'cizinec' && p.typ !== 'mensina') continue;
    foreign++; const id = byDesc[p.jazyk]; if (!id) { noAccent++; continue; } cnt[id] = (cnt[id] || 0) + 1;
    const g = CZ.GROUPS[id], nm = f.view.volajici.jmeno.split(' '), first = nm[0], last = nm.slice(1).join(' ');
    const all = a => [].concat(g.M[a], g.F[a]);
    if (!all('f').includes(first) || !all('l').includes(last)) badName++;
    if (checkN < 25 && /\d/.test(f.key.adresa) && !/okolí|\(/.test(f.key.adresa)) { checkN++; const c = new Sim({ seed: 3, mode: 'free' }).addCallCase({ v: 1, seed: sd, form: { adresa: f.key.adresa, n: '3', vJmeno: first, vPrijmeni: last }, sec: 30 }); if (c.call.check.jmena.volajici === true && c.ozn === f.view.volajici.jmeno) checkOk++; }
  }
  ok(foreign / tot > 0.03 && foreign / tot < 0.15 && noAccent === 0, 'cizinci a menšiny: podíl ' + (foreign / tot * 100).toFixed(1) + ' % (bez přízvuku ' + noAccent + ')');
  ok(badName === 0, 'jména cizinců odpovídají skupině (ne česká jména)');
  ok(['ukrajinsky', 'vietnamsky', 'nemecky', 'rakousky', 'anglicky', 'slovensky', 'polsky', 'romsky'].every(k => cnt[k] > 0), 'všechny skupiny se vyskytují: ' + JSON.stringify(cnt));
  ok(checkN > 0 && checkOk === checkN, 'jméno cizince v případu a kontrole klasifikace sedí (' + checkOk + '/' + checkN + ')');
  const m = (id, extra) => CZ.ctxMul(id, Object.assign({ place: '', addr: '', town: 'Tábor', where: 'rd' }, extra));
  ok(m('vietnamsky', { place: 'večerka u nádraží' }) >= 8 && m('ukrajinsky', { place: 'stavba, ubytovna dělníků' }) >= 4 && m('rakousky', { town: 'Kaplice' }) >= 8 && m('nemecky', { town: 'Horní Planá', place: 'penzion' }) >= 4, 'místo ovlivňuje výskyt (večerka, ubytovna, pohraničí, penzion)');
  ok(m('vietnamsky') === 1 && m('rakousky') === 1, 'bez kontextu žádné zvýhodnění (není to pravidlo)');
}
{ // hovor bere calltaker: žádný kanál 112/150/158, žádné červené datové zprávy ani „nabírá se“; PČR/HZS si volá calltaker
  let n = 0, bad = 0, agOk = 0, agTot = 0;
  for (let sd = 1; sd <= 400 && n < 25; sd++) {
    const t = new Sim({ seed: sd, mode: 'free' })._spawn(); if (t.phase !== 'dz') continue; n++;
    const sim = new Sim({ seed: 5, mode: 'free' }), c = sim.addCallCase({ v: 1, seed: sd, form: { adresa: t.addr, n: String(t.n) }, sec: 100 });
    if (c.phase === 'dz' || (c.radioReports || []).some(r => /^dz/.test(r.id)) || /Linka 15[08]|eCall|TCTV/i.test(c.src || '')) bad++;
    const want = Object.keys(t.agencies || {}); if (want.length) { agTot++; if (want.every(k => c.call.truth.agNeed.includes(k))) agOk++; }
  }
  ok(n >= 10 && bad === 0, 'případ z hovoru nemá datové zprávy ani kanál 112/150/158 (' + n + ' případů, chyb ' + bad + ')');
  ok(agOk === agTot, 'PČR/HZS z datové zprávy se stávají povinností calltakera (truth.agNeed): ' + agOk + '/' + agTot);
}
{ // klasifikace z pavouka: ekvivalenty názvů
  const sim = new Sim({ seed: 9, mode: 'free' }), truth0 = { klasif: 'Resuscitace', symptoms: [], age: 50, n: 1, patient: '', caller: '' };
  const c1 = sim._ctCheck({ klasif: 'NZO - spatřená', n: '1', cihla: true }, truth0, { typedN: 1, errM: 0, tol: 60 });
  ok(c1.klasif.ok && c1.priznaky.jaccard === 1, 'NZO – spatřená z cihličky odpovídá klasifikaci Resuscitace');
  const c2 = sim._ctCheck({ klasif: 'Dušnost', n: '1', cihla: true }, truth0, { typedN: 1, errM: 0, tol: 60 });
  ok(!c2.klasif.ok && c2.priznaky.jaccard === 0, 'jiná klasifikace u resuscitace je chyba');
}
{ // čekající případ zůstává čekající, dokud není splněn celý požadavek na posádku (po typech)
  const mkc = () => { const sim = new Sim({ seed: 31, mode: 'free', startHour: 10 }); const cs = sim._spawn({ ind: 'dusnost', n: 2, where: 'byt', intake: 0, extKinds: null }); for (let i = 0; i < 6; i++) step(sim); cs.status = 'waiting'; cs.dyn = false; cs.initialDispatchRequired = ['RZP', 'RV']; cs.initialDispatchSent = []; cs.rvNeed = true; return { sim, cs }; };
  const a = mkc(), z = a.sim.suggest(a.cs.id, 'RZP')[0]; a.sim.assign(a.cs.id, z.crewId);
  ok(a.cs.status === 'waiting' && a.sim._missingTypes(a.cs).join() === 'RV', 'jen RZP při požadavku RZP + RV: případ zůstává v čekajících (chybí RV)');
  const v = a.sim.suggest(a.cs.id, 'RV')[0]; a.sim.assign(a.cs.id, v.crewId);
  ok(a.cs.status === 'active', 'po přiřazení i RV přejde do probíhajících');
  const b = mkc(); b.sim.assign(b.cs.id, b.sim.suggest(b.cs.id, 'RZP')[0].crewId);
  const r = b.sim.convertN2Dynamic(b.cs.id);
  ok(r.ok && b.cs.status === 'active', 'převod na dynamickou indikaci splní požadavek a případ přejde do probíhajících');
  const c = mkc(); c.sim.assign(c.cs.id, c.sim.suggest(c.cs.id, 'RV')[0].crewId);
  ok(c.cs.status === 'waiting', 'jen RV při požadavku RZP + RV: zůstává v čekajících');
  for (let i = 0; i < 3000 && c.cs.status === 'waiting'; i++) step(c.sim);
  ok(c.cs.status !== 'closed' || !c.cs.unserved, 'částečně obsazený případ se nezavře jako neobsloužený');
}
{ // dispečer vidí klasifikaci a cihly zadané calltakerem, ne skrytou pravdu
  const sim = new Sim({ seed: 777, mode: 'free' }), c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: '2', cihla: true, klasifTabulka: 'CMP', kody: ['FAST_ASYMETRIE', 'DOSPĚLÝ'], klasif: 'CMP' }, sec: 100 });
  ok(c.klasif === 'CMP' && c.klasifTruth === truth.klasif && c.sympShown.join() === 'FAST_ASYMETRIE,DOSPĚLÝ' && c.call.truth.klasif === truth.klasif, 'případ nese zadanou klasifikaci a cihly, pravda zůstává v c.call.truth');
}
{ // dynamická indikace zadaná calltakerem (DI v požadavku) dojde k dispečerovi jako N2 dynamická, bez lékaře
  const sim = new Sim({ seed: 777, mode: 'free' }), c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: '2', dyn: true, cihla: true, klasifTabulka: 'Trauma', klasif: truth.klasif, kody: [], posadky: { DI: 1, KOR: 0, LZS: 0, RLP: 0, RV: 0, RZP: 0 } }, sec: 100 });
  ok(c.n === 2 && c.dyn === true && c.initialDispatchRequired.join() === 'RZP' && !c.rvNeed, 'N2 s požadavkem DI: případ je dynamický a vyžaduje jen RZP, ne lékaře');
  const c2 = new Sim({ seed: 778, mode: 'free' }).addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: '2', dyn: false, cihla: true, klasifTabulka: 'Trauma', klasif: truth.klasif, kody: [], posadky: { DI: 0, KOR: 0, LZS: 0, RLP: 1, RV: 0, RZP: 1 } }, sec: 100 });
  ok(c2.n === 2 && c2.dyn === false && c2.initialDispatchRequired.includes('RV'), 'N2 s RLP a RZP: statická N2 s lékařem');
}
{ // bot dispečer vyřídí žádost sousedního kraje o výpomoc (neponechá ji bez odpovědi)
  const sim = new Sim({ seed: 41, mode: 'free', startHour: 10 }); sim.enableLiveCalls({ mode: 'training', gapSec: 3600, bot: true, level: 'bezne' });
  sim._nbSpawn('ground'); sim._nbSpawn('ground');
  for (let i = 0; i < 160; i++) step(sim);
  const rqs = sim.s.nbq.slice(0, 2);
  ok(rqs.length === 2 && rqs.every(r => r.state === 'accepted' || r.state === 'declined'), 'bot vyřídil žádosti sousedního kraje: ' + rqs.map(r => r.state).join(', '));
  ok(!sim.s.log.some(e => /bez odpovědi, žádost zrušena/.test(e.txt)), 'žádná žádost sousedního kraje nezůstala bez odpovědi');
}
{ // bot s částečně obsazeným případem (chybí lékař) neposílá další RZP a po 2 min převede N2 na dynamickou indikaci
  const sim = new Sim({ seed: 51, mode: 'free', startHour: 10 }); sim.enableLiveCalls({ mode: 'training', gapSec: 3600, bot: true, level: 'bezne' });
  for (const k of sim.s.crews) if (k.type === 'RV' || k.type === 'LZS') k.state = 'off';
  const c = sim.addCallCase({ v: 1, seed, form: { adresa: truth.addr, n: '2', cihla: true, klasifTabulka: 'Trauma', klasif: truth.klasif, kody: [], posadky: { DI: 0, KOR: 0, LZS: 0, RLP: 0, RV: 1, RZP: 1 } }, sec: 100 });
  for (let i = 0; i < 400; i++) step(sim);
  const rzp = c.crews.map(id => sim.crewOf(id)).filter(k => k && k.type === 'RZP').length;
  ok(rzp === 1, 'bot vyslal jedinou RZP, ne všechny (' + rzp + ')');
  ok(c.dyn === true && c.status === 'active', 'bez volného lékaře se N2 po 2 min převedla na dynamickou indikaci (' + c.status + ')');
}
{ // vesnice bez ulic: adresa „čp. 83, Obec“, „83, Obec“ i „Obec 83, Obec“ najde dům, ne jen střed obce
  const sim = new Sim({ seed: 1, mode: 'free' });
  const g = t => sim._ctGeocode(t).quality;
  ok(g('čp. 83, Myslkovice') === 'exact' && g('83, Myslkovice') === 'exact' && g('Myslkovice 83, Myslkovice') === 'exact' && g('č. p. 83, Myslkovice') === 'exact', 'adresa vesnice bez ulic: čp. 83 najde dům (exact)');
  ok(g('Pražská 156, Tábor') === 'exact', 'adresa s ulicí se stále najde');
}
{ // dispečer vidí jen zadané: místo, poznámku, volajícího, telefon, pacienta, věk, pohlaví a charakter, ne skrytou pravdu z generátoru
  const sim = new Sim({ seed: 777, mode: 'free' }), form = { adresa: truth.addr, n: '3', cihla: true, klasifTabulka: 'Trauma', klasif: truth.klasif, kody: ['AVPU-A', 'Hlava'], upresneni: 'panelák, patro 4', popis: 'pád v koupelně', poznamka: '#+PČR', vJmeno: 'Jana', vPrijmeni: 'Nováková', vTelefon: '0999111222', pJmeno: 'Petr', pPrijmeni: 'Novák', pVek: 68, pPohlavi: 'muž', charakter: 'Tísňová výzva v budově', posadky: { DI: 0, KOR: 0, LZS: 0, RLP: 0, RV: 0, RZP: 1 } };
  const c = sim.addCallCase({ v: 1, seed, form, sec: 100 });
  ok(c.place === 'panelák, patro 4' && c.poznamka === 'pád v koupelně; #+PČR', 'místo a poznámka jsou jen zadané (' + c.place + ' | ' + c.poznamka + ')');
  ok(c.ozn === 'Jana Nováková' && c.phone === '0999111222' && c.patientName === 'Novák Petr' && c.charakter === 'Tísňová výzva v budově', 'volající, telefon, pacient a charakter jsou zadané');
  ok(c.ageText === '68 let', 'věk je tak, jak ho calltaker zapsal (' + c.ageText + ')');
  ok(c.shown.age === 68 && c.shown.sex === 'M' && c.sympShown.join() === 'AVPU-A,Hlava', 'věk, pohlaví a příznaky jsou zadané');
  const f2 = Object.assign({}, form, { upresneni: 'patro 5', poznamka: '', popis: 'doplněno' }); sim.updateCallCase(c, f2);
  ok(c.place === 'patro 5' && c.poznamka === 'doplněno', 'aktualizace přepíše jen zadané, bez skryté poznámky');
}
// orientační body kolem AML: neutrální výběr jen podle vzdálenosti od středu AML a kategorie, s limity
{
  const src = fs.readFileSync(path.join(R, 'src/ui-calltaker.js'), 'utf8'), a0 = src.indexOf('const CT_POI_CHURCH'), b0 = src.indexOf('function ctGlInit');
  global.window = { ZOS_POI: global.ZOS_POI };
  const CTP = new Function('window', src.slice(a0, b0) + '; return { F: ctPoiFeatures, IDX: ctPoiIndex };')(global.window);
  const idx = CTP.IDX(); ok(idx && idx.length > 5000, 'index orientačních bodů: ' + (idx && idx.length));
  const c = { lat: 48.9747, lon: 14.4744, radiusM: 40 }, f = CTP.F(c), t = [0, 0, 0, 0]; f.forEach(x => t[x.properties.tier]++);
  ok(f.length > 50 && t[1] <= 220 && t[2] <= 150 && t[3] <= 90, 'centrum ČB: limity podle tierů (' + t.slice(1).join('/') + ')');
  ok(f.every(x => Math.hypot((x.geometry.coordinates[1] - c.lat) * 111320, (x.geometry.coordinates[0] - c.lon) * 111320 * Math.cos(c.lat * Math.PI / 180)) <= 700.5), 'jen v okolí AML (700 m)');
  ok(f.every(x => Object.keys(x.properties).sort().join() === 'kind,lab,tier'), 'vlastnosti bodů jsou jen neutrální (druh, název, tier), žádné označení případu');
  ok(CTP.F({ lat: 48.9747, lon: 14.4744, radiusM: 40 }).map(x => x.properties.lab).join() === f.map(x => x.properties.lab).join(), 'výběr je deterministický (nezávisí na skutečném případu)');
  ok(f.some(x => x.properties.kind === 'kostel') || CTP.F({ lat: 49.0, lon: 14.45, radiusM: 2700 }).some(x => x.properties.kind === 'kostel'), 'kostely se do výběru dostávají');
}
console.log(fail ? 'SELHALO: ' + fail : 'calltaker test OK'); process.exit(fail ? 1 : 0);
