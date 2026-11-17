// Případy od živého calltakera – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
// Předávací formát (v1): { v: 1, seed, form: { adresa, n, klasif, poznamka }, sec }
//  - seed určuje skrytou pravdu (stejný případ jako v calltaker/factsheet.js),
//  - form je to, co calltaker zadal; dispečer vidí zadané údaje, ne pravdu.
// Následky: špatná adresa (posádka dojede jinam a hledá pacienta), zadaná naléhavost se liší od skutečné (skóre).
if (typeof module !== 'undefined') var { hav } = require('./engine-base.js');
const CT_RUNTIME = ['id', 'num', 'nOrig', 'createdAt', 'readyAt', 'status', 'crews', 'asg', 'firstAssign', 'firstArrive', 'arrived', 'docAssigned', 'docArrived', 'initialDispatchSent', 'docAssignT', 'rvReq', 'rvReqAt', 'closedAt', 'score', 'pen', 'effRatio', 'waitSince', 'escAt', 'transported', 'zzumOk', 'members', 'mu', 'unserved', 'phase', 'dzUntil', 'intake'];
const ctNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ /g, ' ').replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
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
  // zadaná adresa proti pravdě: standardní adresa z databáze se kontroluje, silnice a místa (bez čísla) calltaker najde na mapě a berou se jako správná
  _ctLocate(adresa, tc) {
    const standard = /\d/.test(tc.addr) && !/okolí obce/i.test(tc.addr) && !/\(/.test(tc.addr);
    if (!adresa || !standard) return { standard, typed: tc.addr, geo: null, errM: 0, miss: null };
    const geo = this._ctGeocode(adresa);
    const errM = geo.quality ? Math.round(hav(geo.lat, geo.lon, tc.lat, tc.lon) * 1000) : 0;
    const miss = geo.quality && errM > 250 ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr } : null;
    return { standard, typed: String(adresa).trim(), geo, errM, miss };
  }
  _ctN(v, dflt) { const n = Number(String(v == null ? '' : v).replace(/\D/g, '')); return [1, 2, 3].includes(n) ? n : dflt; }
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
    const key = { seed, 'naléhavost': 'N' + c.n, dynamicka: !!c.dyn, lekar: !!c.rvNeed, klasifikace: c.klasif, indikace: c.ind, adresa: c.addr, obec: c.town, pacient: c.patientName, vek: c.age, priznaky: c.up, telefon: c.phone };
    return { view, key, tc: c };
  }
  // vytvoří případ z hovoru calltakera (viz formát nahoře); vrací případ
  addCallCase(h) {
    const f = h.form || {}, s = this.s, t = s.t;
    const temp = new this.constructor({ seed: h.seed, mode: 'free' }), tc = temp._spawn(), dt = t - temp.s.t;
    const o = JSON.parse(JSON.stringify(tc));
    for (const k of CT_RUNTIME) delete o[k];
    if (Array.isArray(o.radioReports)) for (const r of o.radioReports) if (r.at != null) r.at += dt;
    if (o.wakeAt != null) o.wakeAt += dt;
    const truth = { addr: tc.addr, lat: tc.lat, lon: tc.lon, n: tc.n, klasif: tc.klasif };
    const typedN = this._ctN(f.n, tc.n), loc = this._ctLocate(f.adresa, tc), baseNote = o.poznamka || '';
    o.n = typedN; o.intake = 0; o.addr = loc.typed;
    if (loc.geo && loc.miss) { o.lat = loc.geo.lat; o.lon = loc.geo.lon; }
    if (f.klasif && f.klasif !== tc.klasif) o.klasifZadana = String(f.klasif);
    if (f.poznamka) o.poznamka = (baseNote ? baseNote + '; ' : '') + String(f.poznamka);
    const c = this._newCase(o);
    c.src = c.src || 'Linka 155';
    c.call = { seed: h.seed, sec: h.sec || null, truth, typed: loc.typed, standard: loc.standard, quality: loc.geo ? loc.geo.quality : 'n/a', errM: loc.errM, miss: !!loc.miss, truthN: tc.n, typedN, klasifOk: !f.klasif || f.klasif === tc.klasif, baseNote, note: f.poznamka || '', updates: 0, unlocatable: !!(f.adresa && loc.standard && loc.geo && !loc.geo.quality) };
    if (c.call.unlocatable) this.L('warn', `${c.num}: zadanou adresu se nepodařilo najít (${c.addr}), dispečer ji dohledává`, c.id);
    if (loc.miss) c.addrMiss = loc.miss;
    this.L('case', `Hovor od calltakera ${c.num}: N${typedN} – ${c.klasif}, ${c.addr}${loc.miss ? ' (adresa nesedí)' : ''}`, c.id);
    return c;
  }
  // doplnění případu během pokračujícího hovoru (naléhavost, poznámka; adresa jen dokud nejede posádka)
  updateCallCase(c, f) {
    if (!c || !c.call || c.status === 'closed') return c;
    f = f || {};
    const n = this._ctN(f.n, c.n);
    if (n !== c.n) { this.L('case', `${c.num}: calltaker mění naléhavost N${c.n} → N${n}`, c.id); c.n = n; c.call.typedN = n; c.call.updates++; }
    if (f.poznamka != null && f.poznamka !== c.call.note) { c.call.note = f.poznamka; c.poznamka = (c.call.baseNote ? c.call.baseNote + '; ' : '') + f.poznamka; this.L('case', `${c.num}: doplněna poznámka od calltakera`, c.id); c.call.updates++; }
    if (f.klasif) { c.klasifZadana = f.klasif === c.call.truth.klasif ? null : String(f.klasif); c.call.klasifOk = f.klasif === c.call.truth.klasif; }
    if (f.adresa && String(f.adresa).trim() !== c.call.typed) {
      if (c.asg && c.asg.length) this.L('warn', `${c.num}: změna adresy po vyslání posádky se zatím nepřebírá (${String(f.adresa).trim()})`, c.id);
      else {
        const loc = this._ctLocate(f.adresa, { addr: c.call.truth.addr, lat: c.call.truth.lat, lon: c.call.truth.lon });
        c.addr = loc.typed; c.call.typed = loc.typed; c.call.quality = loc.geo ? loc.geo.quality : 'n/a'; c.call.errM = loc.errM; c.call.miss = !!loc.miss; c.addrMiss = loc.miss || null;
        c.lat = loc.geo && loc.miss ? loc.geo.lat : c.call.truth.lat; c.lon = loc.geo && loc.miss ? loc.geo.lon : c.call.truth.lon;
        this.L('case', `${c.num}: calltaker opravil adresu: ${c.addr}`, c.id); c.call.updates++;
      }
    }
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
