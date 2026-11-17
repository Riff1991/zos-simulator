// Případy od živého calltakera – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
// Předávací formát (v1): { v: 1, seed, form: { adresa, n, klasif, poznamka }, sec }
//  - seed určuje skrytou pravdu (stejný případ jako v calltaker/factsheet.js),
//  - form je to, co calltaker zadal; dispečer vidí zadané údaje, ne pravdu.
// Následky: špatná adresa (posádka dojede jinam a hledá pacienta), zadaná naléhavost se liší od skutečné (skóre).
if (typeof module !== 'undefined') var { hav } = require('./engine-base.js');
const CT_RUNTIME = ['id', 'num', 'nOrig', 'createdAt', 'readyAt', 'status', 'crews', 'asg', 'firstAssign', 'firstArrive', 'arrived', 'docAssigned', 'docArrived', 'initialDispatchSent', 'docAssignT', 'rvReq', 'rvReqAt', 'closedAt', 'score', 'pen', 'effRatio', 'waitSince', 'escAt', 'transported', 'zzumOk', 'members', 'mu', 'unserved', 'phase', 'dzUntil', 'intake'];
const ctNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ /g, ' ').replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
// tolerance polohy (m): adresní bod (dům), bod z POI, silnice/terén; do 3× tolerance malé zdržení, nad 3× chybná poloha
const CT_TOL = { dum: 60, poi: 120, silnice: 200 };
const ctRng = seed => { let a = (Number(seed) >>> 0) ^ 0x9e3779b9; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ctShift = (lat, lon, d, ang) => ({ lat: lat + d * Math.cos(ang) / 111320, lon: lon + d * Math.sin(ang) / (111320 * Math.cos(lat * Math.PI / 180)) });
const ctJaccard = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 1; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const ctSymNorm = x => ctNorm(String(x).replace(/^[^A-Za-zÀ-ž0-9]+/, ''));
const ctNoDyn = a => (a || []).filter(x => !/DYNAMICKÁ INDIKACE/i.test(x));
class SimCalltaker {
  // rozbor zadané adresy: „Bezdrevská 1113/31, České Budějovice“ → { street, num, city }
  _ctParse(text) {
    const t = String(text || '').replace(/\([^)]*\)/g, ' '), parts = t.split(',').map(x => x.trim()).filter(Boolean);
    let left = parts[0] || '', city = parts.length > 1 ? parts[parts.length - 1] : '';
    const m = left.match(/(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*$/) || left.match(/(?:č\.?\s*p\.?\s*)?(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)/i);
    const num = m ? m[1] : '';
    const street = ctNorm(left.replace(num, ' ').replace(/\bč\.?\s*p\.?\b/i, ' '));
    return { street, num: ctNorm(num), city: ctNorm(city) };
  }
  _ctIndex() {
    if (this._ctIdx) return this._ctIdx;
    const A = typeof ZOS_ADDR !== 'undefined' ? ZOS_ADDR : null, idx = { byCity: new Map(), A };
    if (A) {
      const a = A.a, S = A.s, nrm = new Map(), N = i => { let v = nrm.get(i); if (v === undefined) { v = ctNorm(S[i]); nrm.set(i, v); } return v; };
      idx.N = N;
      for (let i = 0; i < a.length; i += 8) {
        const city = N(a[i + 3]); let l = idx.byCity.get(city); if (!l) idx.byCity.set(city, l = []); l.push(i);
      }
    }
    return (this._ctIdx = idx);
  }
  // najde bod zadané adresy; kvalita: exact (ulice+číslo) / street (jen ulice) / town (jen obec) / null
  _ctGeocode(text) {
    const idx = this._ctIndex(), p = this._ctParse(text);
    if (!idx.A || !p.city) return { quality: null, p };
    const list = idx.byCity.get(p.city); if (!list) return { quality: null, p };
    const a = idx.A.a, N = idx.N, S = idx.A.s;
    const num0 = p.num.split('/')[0], same = [];
    let exact = null;
    for (const i of list) {
      const street = N(a[i + 2]), city = N(a[i + 3]), num = N(a[i + 4]);
      const st = street && street !== city ? street : '';
      if (st === p.street || (!p.street && !st)) {
        same.push(i);
        if (num === p.num || (num0 && num.split('/')[0] === num0)) { exact = i; break; }
      }
    }
    const at = i => ({ lat: a[i] / 1e5, lon: a[i + 1] / 1e5, label: S[a[i + 3]] });
    if (exact != null) return Object.assign({ quality: 'exact', p }, at(exact));
    if (same.length) { let la = 0, lo = 0; for (const i of same) { la += a[i]; lo += a[i + 1]; } return { quality: 'street', p, lat: la / same.length / 1e5, lon: lo / same.length / 1e5 }; }
    let la = 0, lo = 0; for (const i of list) { la += a[i]; lo += a[i + 1]; }
    return { quality: 'town', p, lat: la / list.length / 1e5, lon: lo / list.length / 1e5 };
  }
  // druh místa podle pravdy: dum (standardní adresa), poi (místo v závorce), silnice (okolí obce, silnice, terén)
  _ctKind(tc) { const a = String(tc.addr || ''); return /okolí obce/i.test(a) || !/\d/.test(a) ? 'silnice' : /\(/.test(a) ? 'poi' : 'dum'; }
  _ctTol(tc) { return CT_TOL[this._ctKind(tc)]; }
  // zadaná poloha proti pravdě. Bod z mapy má přednost před textem adresy; bez bodu se kontroluje standardní adresa z databáze (silnice a místa bez čísla calltaker najde na mapě a berou se jako správná)
  _ctLocate(adresa, tc, bod) {
    const standard = this._ctKind(tc) === 'dum', tol = this._ctTol(tc);
    if (bod && Number.isFinite(Number(bod.lat)) && Number.isFinite(Number(bod.lon))) {
      const lat = Number(bod.lat), lon = Number(bod.lon), errM = Math.round(hav(lat, lon, tc.lat, tc.lon) * 1000);
      const miss = errM > 3 * tol ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr, thr: 3 * tol } : null;
      const searchDelay = !miss && errM > tol ? Math.round(60 + 90 * (errM - tol) / (2 * tol)) : 0;
      let conflict = false;
      if (adresa && standard) { const g = this._ctGeocode(adresa); conflict = !!(g.quality && hav(g.lat, g.lon, lat, lon) * 1000 > 3 * tol); }
      return { standard, typed: String(adresa || '').trim() || 'bod z mapy', geo: { quality: 'point', lat, lon }, errM, miss, tol, searchDelay, byPoint: true, conflict };
    }
    if (!adresa || !standard) return { standard, typed: String(adresa || tc.addr || '').trim(), geo: null, errM: 0, miss: null, tol, searchDelay: 0 };
    const geo = this._ctGeocode(adresa);
    const errM = geo.quality ? Math.round(hav(geo.lat, geo.lon, tc.lat, tc.lon) * 1000) : 0;
    const miss = geo.quality && errM > 250 ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr, thr: 250 } : null;
    return { standard, typed: String(adresa).trim(), geo, errM, miss, tol, searchDelay: 0 };
  }
  _ctN(v, dflt) { const n = Number(String(v == null ? '' : v).replace(/\D/g, '')); return [1, 2, 3].includes(n) ? n : dflt; }
  // AML (Advanced Mobile Location): fáze polohy volajícího podle seedu; pravda se nikdy nevrací (jen kruhy)
  _ctAml(seed, tc) {
    const R = ctRng(seed * 7 + 13), ri = (a, b) => Math.round(a + R() * (b - a));
    const r = R(), typ = r < 0.8 ? 'mobil' : r < 0.93 ? 'pevná' : 'skryté';
    const out = { typ, phases: [] };
    if (typ !== 'mobil') return out;
    const idx = this._ctIndex(), list = idx.byCity && idx.byCity.get(ctNorm(tc.town)), n = list ? list.length / 8 : 300;
    const cellR = n > 3000 ? ri(600, 1200) : n > 500 ? ri(1000, 2200) : ri(1800, 3500);
    const shift = (rad, wrong) => { const d = wrong ? rad * (1.3 + R() * 1.7) : rad * Math.sqrt(R()) * 0.95; return ctShift(tc.lat, tc.lon, d, R() * Math.PI * 2); };
    const c0 = shift(cellR, false);
    out.phases.push({ atSec: 0, radiusM: cellR, lat: +c0.lat.toFixed(6), lon: +c0.lon.toFixed(6), zdroj: 'buňka' });
    if (R() < 0.75) {   // AML dorazí (u zbytku zůstane jen buňka; zahrnuje i ~10 % mobilů, kde nedorazí)
      const outdoor = ['ulice', 'priroda', 'prov'].includes(tc.where), gnss = outdoor ? R() < 0.75 : R() < 0.35;
      const rad = gnss ? (outdoor ? ri(5, 40) : ri(20, 150)) : ri(20, 90), wrong = R() < 0.05, p = shift(rad, wrong);
      out.phases.push({ atSec: ri(8, 40), radiusM: rad, lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), zdroj: gnss ? 'GNSS' : 'Wi-Fi' });
    }
    return out;
  }
  // kontrola klasifikace: zadané proti pravdě
  _ctCheck(f, truth, call) {
    f = f || {};
    const same = (a, b) => !a || ctNorm(a) === ctNorm(b), split = full => { const t = String(full || '').trim().split(/\s+/); return { j: t[0] || '', p: t.length > 1 ? t[t.length - 1] : '' }; };
    const tp = split(truth.patient), tcl = split(truth.caller), year = Number(String(this.s.date || '').slice(0, 4)) || 2026;
    const age = f.pVek !== '' && f.pVek != null && Number.isFinite(Number(f.pVek)) ? Number(f.pVek) : (Number(f.pRok) > 1900 ? year - Number(f.pRok) : null);
    const tolAge = truth.age < 15 ? 1 : Math.max(3, Math.round(truth.age * 0.1));
    const typedSym = ctNoDyn(f.priznaky).map(ctSymNorm).filter(Boolean), trueSym = ctNoDyn(truth.symptoms).map(ctSymNorm);
    return {
      klasif: { ok: !f.klasif || f.klasif === truth.klasif, typed: f.klasif || '', truth: truth.klasif },
      n: { ok: call.typedN === truth.n, typed: call.typedN, truth: truth.n },
      dyn: { ok: f.dyn == null || !!f.dyn === !!truth.dyn, typed: f.dyn == null ? null : !!f.dyn, truth: !!truth.dyn },
      priznaky: { jaccard: +ctJaccard(typedSym, trueSym).toFixed(2), typed: (f.priznaky || []).length, truth: trueSym.length },
      vek: { ok: age == null ? null : Math.abs(age - truth.age) <= tolAge, typed: age, truth: truth.age },
      jmena: { pacient: f.pJmeno || f.pPrijmeni ? same(f.pJmeno, tp.j) && same(f.pPrijmeni, tp.p) : null, volajici: f.vJmeno || f.vPrijmeni ? same(f.vJmeno, tcl.j) && same(f.vPrijmeni, tcl.p) : null },
      bodM: call.errM, tol: call.tol, aml: f.zdroj === 'AML', zdroj: f.zdroj || (f.bod ? 'mapa' : 'adresa'),
    };
  }
  // skrytá pravda a kontext hovoru podle seedu (stejné jako calltaker/factsheet.js): view = co ví volající, key = správná odpověď
  callFacts(seed) {
    const temp = new this.constructor({ seed, mode: 'free' }), c = temp._spawn();
    const P = typeof window !== 'undefined' && window.CT_PERSONAS ? window.CT_PERSONAS : (typeof require === 'function' ? require('../calltaker/personas.js') : null);
    const persona = P ? P.pickPersona(() => temp.rnd(), c) : { typ: 'vecny', popis: 'věcný, klidný', stres: 0, spoluprace: 3, znalostAdresy: 3 };
    const bld = c.bld || {};
    const view = {
      seed,
      volajici: { jmeno: c.ozn, vztah: c.oznRel.replace(/^volá\s*/, '') || c.oznRel, telefon: c.phone, linka: c.src },
      pacient: { jmeno: c.patientName, vek: c.age, pohlavi: c.sex === 'M' ? 'muž' : 'žena', pacientJeVolajici: /pacient sám/.test(c.oznRel) },
      misto: { adresa: c.addr, obec: c.town, okres: c.okres, castObce: c.cast || '', druh: c.where, popis: c.place || '', budova: bld.code === 3 ? 'bytový dům' : bld.code === 1 ? 'dům' : bld.code === 2 ? 'obytná budova' : '', podlazi: bld.levels || 0 },
      klinickyObraz: c.up, poznamka: c.poznamka || '', persona,
    };
    const key = { seed, 'naléhavost': 'N' + c.n, dynamicka: !!c.dyn, lekar: !!c.rvNeed, klasifikace: c.klasif, indikace: c.ind, adresa: c.addr, obec: c.town, pacient: c.patientName, vek: c.age, priznaky: c.up, priznakyList: (c.symptoms || []).slice(), telefon: c.phone, lat: c.lat, lon: c.lon };
    return { view, key, tc: c, aml: this._ctAml(seed, c) };
  }
  _ctStr(v) { return String(v == null ? '' : v).trim(); }
  // poznámka pro dispečera z nových polí formuláře
  _ctNote(f) { return [f.upresneni && 'Upřesnění místa: ' + f.upresneni, f.popis, f.poznamka].map(x => this._ctStr(x)).filter(Boolean).join('; '); }
  // vytvoří případ z hovoru calltakera (viz formát nahoře); vrací případ
  // form: adresa, bod {lat,lon}, zdroj (mapa/adresa/AML), cast, upresneni, vJmeno, vPrijmeni, vTelefon, vVztah, pJmeno, pPrijmeni, pRok, pVek, pPohlavi, klasif, priznaky[], n, dyn, popis, poznamka
  addCallCase(h) {
    const f = h.form || {}, s = this.s, t = s.t;
    const temp = new this.constructor({ seed: h.seed, mode: 'free' }), tc = temp._spawn(), dt = t - temp.s.t;
    const o = JSON.parse(JSON.stringify(tc));
    for (const k of CT_RUNTIME) delete o[k];
    if (Array.isArray(o.radioReports)) for (const r of o.radioReports) if (r.at != null) r.at += dt;
    if (o.wakeAt != null) o.wakeAt += dt;
    const truth = { addr: tc.addr, lat: tc.lat, lon: tc.lon, n: tc.n, klasif: tc.klasif, dyn: !!tc.dyn, age: tc.age, sex: tc.sex, symptoms: (tc.symptoms || []).slice(), patient: tc.patientName, caller: tc.ozn };
    const typedN = this._ctN(f.n, tc.n), loc = this._ctLocate(f.adresa, tc, f.bod), baseNote = o.poznamka || '', note = this._ctNote(f);
    o.n = typedN; o.intake = 0; o.addr = loc.typed;
    if (loc.geo && loc.miss) { o.lat = loc.geo.lat; o.lon = loc.geo.lon; }
    if (f.klasif && f.klasif !== tc.klasif) o.klasifZadana = String(f.klasif);
    if (note) o.poznamka = (baseNote ? baseNote + '; ' : '') + note;
    const c = this._newCase(o);
    c.src = c.src || 'Linka 155';
    c.call = { seed: h.seed, sec: h.sec || null, truth, typed: loc.typed, standard: loc.standard, quality: loc.geo ? loc.geo.quality : 'n/a', errM: loc.errM, miss: !!loc.miss, tol: loc.tol, searchDelay: loc.searchDelay || 0, conflict: !!loc.conflict, bod: loc.byPoint ? { lat: loc.geo.lat, lon: loc.geo.lon } : null, zdroj: f.zdroj || (loc.byPoint ? 'mapa' : 'adresa'), truthN: tc.n, typedN, klasifOk: !f.klasif || f.klasif === tc.klasif, baseNote, note, updates: 0, unlocatable: !!(f.adresa && loc.standard && !loc.byPoint && loc.geo && !loc.geo.quality), form: JSON.parse(JSON.stringify(f)) };
    c.call.check = this._ctCheck(f, truth, c.call);
    if (c.call.unlocatable) this.L('warn', `${c.num}: zadanou adresu se nepodařilo najít (${c.addr}), dispečer ji dohledává`, c.id);
    if (loc.conflict) this.L('warn', `${c.num}: adresa a bod z mapy se rozcházejí, přednost má bod`, c.id);
    if (loc.miss) c.addrMiss = loc.miss;
    this.L('case', `Hovor od calltakera ${c.num}: N${typedN} – ${c.klasif}, ${c.addr}${loc.miss ? ' (adresa nesedí)' : ''}`, c.id);
    return c;
  }
  // doplnění případu během pokračujícího hovoru (naléhavost, poznámka, klasifikace, osoby; poloha jen dokud nejede posádka)
  updateCallCase(c, f) {
    if (!c || !c.call || c.status === 'closed') return c;
    f = f || {};
    const n = this._ctN(f.n, c.n);
    if (n !== c.n) { this.L('case', `${c.num}: calltaker mění naléhavost N${c.n} → N${n}`, c.id); c.n = n; c.call.typedN = n; c.call.updates++; }
    const note = this._ctNote(f);
    if (f.poznamka != null || f.popis != null || f.upresneni != null) if (note !== c.call.note) { c.call.note = note; c.poznamka = (c.call.baseNote ? c.call.baseNote + '; ' : '') + note; this.L('case', `${c.num}: doplněna poznámka od calltakera`, c.id); c.call.updates++; }
    if (f.klasif) { c.klasifZadana = f.klasif === c.call.truth.klasif ? null : String(f.klasif); c.call.klasifOk = f.klasif === c.call.truth.klasif; }
    const sig = JSON.stringify([this._ctStr(f.adresa), f.bod ? [f.bod.lat, f.bod.lon] : null]);
    if (c.call.sig == null) c.call.sig = JSON.stringify([c.call.form && this._ctStr(c.call.form.adresa), c.call.form && c.call.form.bod ? [c.call.form.bod.lat, c.call.form.bod.lon] : null]);
    if ((f.adresa || f.bod) && sig !== c.call.sig) {
      if (c.asg && c.asg.length) this.L('warn', `${c.num}: změna polohy po vyslání posádky se zatím nepřebírá (${this._ctStr(f.adresa) || 'bod z mapy'})`, c.id);
      else {
        const tr = c.call.truth, loc = this._ctLocate(f.adresa, { addr: tr.addr, lat: tr.lat, lon: tr.lon }, f.bod);
        c.addr = loc.typed; c.call.typed = loc.typed; c.call.quality = loc.geo ? loc.geo.quality : 'n/a'; c.call.errM = loc.errM; c.call.miss = !!loc.miss; c.addrMiss = loc.miss || null;
        c.call.tol = loc.tol; c.call.searchDelay = loc.searchDelay || 0; c.call.conflict = !!loc.conflict; c.call.bod = loc.byPoint ? { lat: loc.geo.lat, lon: loc.geo.lon } : null; c.call.zdroj = f.zdroj || (loc.byPoint ? 'mapa' : 'adresa');
        c.lat = loc.geo && loc.miss ? loc.geo.lat : tr.lat; c.lon = loc.geo && loc.miss ? loc.geo.lon : tr.lon;
        c.call.sig = sig; this.L('case', `${c.num}: calltaker opravil polohu: ${c.addr}`, c.id); c.call.updates++;
      }
    }
    c.call.form = Object.assign(c.call.form || {}, JSON.parse(JSON.stringify(f)));
    c.call.check = this._ctCheck(c.call.form, c.call.truth, c.call);
    return c;
  }

  // ---------- živé hovory: zvonění, zvednutí, odeslání, ukončení, bot dispečer ----------
  enableLiveCalls(o) {
    const s = this.s; o = o || {};
    s.liveCalls = { mode: o.mode === 'training' ? 'training' : 'realistic', gap: Math.max(30, Number(o.gapSec) || 180), share: o.share || 0.25, bot: o.bot !== false, ring: o.ringSec || 30 };
    s.calls = []; s.callSeq = 0; s.secondaryEnabled = false; s.muEnabled = false; s.ev.nextMU = null; s.ev.nextSpawn = this.rr(8, 20);
  }
  _liveSpawn() {
    const s = this.s, L = s.liveCalls, busy = s.calls.some(c => c.state === 'ringing' || c.state === 'taken');
    const mine = L.mode === 'training' || this.rnd() < L.share;
    if (mine && !busy) this._ringCall(); else if (L.mode !== 'training') this._spawn();
  }
  _ringCall() {
    const s = this.s, id = 'k' + (++s.callSeq);
    s.calls.push({ id, seed: this.ri(1, 2000000000), state: 'ringing', ringAt: s.t, pickedAt: null, caseId: null });
    if (s.calls.length > 40) s.calls.shift();
    this.L('call', `Zvoní hovor ${id}`, null);
  }
  _callsTick() {
    const s = this.s, L = s.liveCalls;
    for (const c of s.calls) if (c.state === 'ringing' && s.t - c.ringAt > L.ring) {
      c.state = 'missed'; this.L('warn', `Zmeškaný hovor ${c.id}: vzal ho kolega`, null);
      this._opsScore(-5, `zmeškaný hovor ${c.id}`, null);
      if (L.mode !== 'training') this._spawn();
    }
  }
  pickupCall(id) {
    const c = this.s.calls.find(x => x.id === id);
    if (!c || c.state !== 'ringing') return null;
    c.state = 'taken'; c.pickedAt = this.s.t; this.L('call', `Hovor ${id} zvednut`, null);
    return this.callFacts(c.seed);
  }
  // odeslání dispečerovi (poprvé vytvoří případ, dál případ aktualizuje); hovor tím nekončí
  sendCall(id, form) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'taken') return null;
    if (call.caseId) return this.updateCallCase(this.caseOf(call.caseId), form);
    const c = this.addCallCase({ v: 1, seed: call.seed, form, sec: Math.round(s.t - call.pickedAt) });
    call.caseId = c.id; call.sentAt = s.t; return c;
  }
  hangupCall(id) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'taken') return null;
    call.state = 'done'; call.endedAt = s.t;
    if (!call.caseId) { this.L('warn', `Hovor ${id} ukončen bez odeslání případu dispečerovi`, null); this._opsScore(-20, `hovor ${id} bez odeslání případu`, null); }
    else { const c = this.caseOf(call.caseId); if (c && c.call) c.call.sec = Math.round(s.t - call.pickedAt); }
    return call;
  }
  // bot dispečer: vysílá posádky po krátké reakční době (jako kolega u dispečinku)
  botTick() {
    const s = this.s, t = s.t;
    for (const c of s.cases) {
      if (c.status === 'waiting' && !c.mu) {
        if (c.botAt == null) c.botAt = t + (c.n === 1 ? this.rr(8, 20) : this.rr(25, 70)) + (c.call && c.call.unlocatable ? this.rr(120, 240) : 0);   // neznámou adresu dispečer dohledává
        if (t < c.botAt) continue;
        if (c.exitus) { if (c.examPending) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); } continue; }
        const r = this.suggest(c.id, 'RZP')[0];
        if (r) this.assign(c.id, r.crewId);
        if (c.rvNeed) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); }
      }
      if (c.coroner && c.coroner.state === 'available') this.sendAgency(c.id, 'cor');
      if (c.status === 'active' && c.rvReq && !c.rvReq.cancelled && !c.rvReq.satT && !c.docAssigned) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); }
      if (c.status === 'active' && c.rvNeed && !c.docAssigned) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); }
    }
  }
}
if (typeof module !== 'undefined') module.exports = SimCalltaker;
