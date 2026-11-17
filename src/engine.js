// ZOS simulátor – simulační jádro. Veškerý stav je prostý JSON (this.s), lze ukládat a obnovit.
// Vyžaduje globální ZOS_DATA (data.js).
// Třída Sim je rozdělena do souborů sim-*.js (přimíchány níže); sdílené pomocné funkce a konstanty jsou v engine-base.js.

if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
if (typeof module !== 'undefined') var SimRadio = require('./sim-radio.js');
if (typeof module !== 'undefined') var SimNeighbors = require('./sim-neighbors.js');
if (typeof module !== 'undefined') var SimCases = require('./sim-cases.js');
if (typeof module !== 'undefined') var SimMU = require('./sim-mu.js');
if (typeof module !== 'undefined') var SimLoop = require('./sim-loop.js');
if (typeof module !== 'undefined') var SimScore = require('./sim-score.js');

class Sim {
  constructor(opts, restored) {
    if (restored) {
      this.s = restored;
      if (this.s.secondaryEnabled == null) this.s.secondaryEnabled = true;
      if (this.s.muEnabled == null) this.s.muEnabled = true;
      if (this.s.muProbability == null) this.s.muProbability = 10;
      if (this.s.muPlayerRole == null) this.s.muPlayerRole = null;
      if (!this.s.weather) this.s.weather = { condition: 'clear', nextChange: this.s.t + 3600, previousStatus: null };
      if (!this.s.weather.condition) this.s.weather.condition = 'clear';
      if (!Number.isFinite(this.s.weather.nextChange)) this.s.weather.nextChange = this.s.t + 3600;
      if (this.s.dayOfYear == null) this.s.dayOfYear = Math.abs(this.s.seed || 1) % 365 + 1;
      this.s.agg.opsPoints = this.s.agg.opsPoints || 0;
      this.s.agg.opsLog = this.s.agg.opsLog || [];
      if (!this.s.ev) this.s.ev = {};
      if (!Array.isArray(this.s.ev.addressHistory)) this.s.ev.addressHistory = [];
      for (const c of this.s.cases) {
        if (c.patientCount == null) c.patientCount = c.pocet || 1;
        if (c.patientsRemaining == null) c.patientsRemaining = c.patientCount;
        if (c.patientsHandled == null) c.patientsHandled = 0;
        if (c.mu && !c.mu.pts) this._muMigrate(c);
      }
      const existing = new Set(this.s.crews.map(c => c.id));
      for (const support of ZOS_DATA.lzsSupport) if (!existing.has(support.id)) this.s.crews.push(this._mk({
        id: support.id, type: 'LZS', name: support.name, code: support.code, oblast: support.oblast, st: support.id,
        lat: support.lat, lon: support.lon, dayOn: false, nightOn: false, externalLzs: true,
        externalDayOnly: !!support.dayOnly, activationDay: support.activationDay || [150, 210], activationNight: support.activationNight || [360, 480],
        ext: true, region: support.region, foreign: !!support.foreign,
      }));
      this.s.crews = this.s.crews.filter(c => !c.externalGround || c.state !== 'off' || (ZOS_DATA.nbGround || []).some(g => g.id === c.id));   // zrušené základny ze starších uložených her
      for (const g of ZOS_DATA.nbGround || []) if (!existing.has(g.id)) this.s.crews.push(this._mk(this._nbGroundOpts(g)));
      for (const crew of this.s.crews) if (crew.externalLzs && !crew.ext) { crew.ext = true; const sp = ZOS_DATA.lzsSupport.find(x => x.id === crew.id); if (sp) { crew.region = sp.region; crew.foreign = !!sp.foreign; } }
      if (!this.s.libero) this.s.libero = Sim.liberoSettings();
      for (const l of ZOS_DATA.libero || []) if (!existing.has(l.id)) this._addLibero(l);
      const lzsCodes = { lzs: 'KR13', 'lzs-jihlava': 'KR12', 'lzs-praha': 'KR01', 'lzs-plzen': 'KR07' };
      for (const crew of this.s.crews) if (lzsCodes[crew.id]) crew.code = lzsCodes[crew.id];
      return;
    }
    opts = opts || {};
    const seed = (opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff)) | 0;
    const s = this.s = {
      v: 1, seed, rs: seed, t: 0, radioMode: opts.radio === 'interactive' ? 'interactive' : 'auto', radioQ: [], rqSeq: 0, secondaryEnabled: opts.secondaryEnabled !== false, muEnabled: opts.muEnabled !== false, muProbability: Math.max(0, Math.min(100, Number(opts.muProbability == null ? 10 : opts.muProbability))),
      startHour: opts.startHour != null ? opts.startHour : 7,
      date: opts.date || (typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '2026-06-21'),
      mode: opts.mode === 'mu' ? 'shift' : (opts.mode || 'shift'), muOnly: opts.mode === 'mu', muOnlyType: opts.muType || null, muOnlyRole: opts.muRole || null, muCaseId: null, diff: opts.diff || 1, rateMul: opts.rateMul || 1,
      shiftLen: 12 * 3600, ended: false, logId: 1, caseSeq: 0,
      cases: [], crews: [], log: [],
      ev: { nextSpawn: 0, nextSecond: 0, nextMU: null, daySecondariesCreated: false, addressHistory: [] },
      muPlayerRole: null,
      libero: Sim.liberoSettings(opts.libero),
      dayOfYear: Math.abs(seed) % 365 + 1,
      weather: { condition: 'clear', nextChange: 0, previousStatus: null },
      cov: { n: 0, sum: 0, next: 60 },
      agg: { sw: 0, sv: 0, closed: 0, unserved: 0, arrSum1: 0, arrN1: 0, legalOk: 0, legalN: 0, pen: 0, diversions: 0, secondaryCount: 0, secondarySum: 0, secondaryOnTime: 0, opsPoints: 0, opsLog: [] },
      dayFlag: true,
    };
    // skutečné (nebo simulované) hodinové počasí pro datum hry; bez něj platí starý náhodný stav (testy, výcvik)
    if (opts.weather && opts.weather.hours) { s.weather.hours = opts.weather.hours; s.weather.src = opts.weather.src || 'sim'; s.dayOfYear = WX.dayOfYear(s.date); }
    s.ev.nextSpawn = this.rr(20, 70);
    s.weather.nextChange = this.rr(3600, 7200);
    s.ev.nextSecond = this._isDay() ? 0 : ((7 - this.hour() + 24) % 24 || 24) * 3600;
    if (!s.muEnabled || s.muProbability <= 0) s.ev.nextMU = null;
    else if (s.mode === 'shift') s.ev.nextMU = this.rnd() * 100 < s.muProbability ? this.rr(1800, s.shiftLen - 600) : null;
    else s.ev.nextMU = this.rr(10800, 32400);
    this._buildCrews();
    s.dayFlag = this._isDay();
    this._roster(false);
    this.L('sys', 'Začátek směny. Posádky přihlášeny.');
    if (s.mode === 'shift' && opts.startState === 'running') this._prepareBusyStart();
    if (s.muOnly) this._prepareMuOnly();
  }

  // režim Jen MU: kraj se „zahřeje“ ~100 min běžného provozu s automatickým dispečerem, pak za 4–8 min přijde MU
  _prepareMuOnly() {
    const s = this.s, warm = 6000, h0 = s.startHour, radio = s.radioMode, sec = s.secondaryEnabled;
    s.radioMode = 'auto'; s.secondaryEnabled = false; s.ev.nextMU = null;
    s.startHour = (h0 - warm / 3600 + 24) % 24;
    for (let i = 0; i < warm / 5; i++) { this._tick(5); this._warmDispatch(); }
    s.cases = s.cases.filter(c => c.status !== 'closed');
    s.log = []; s.radioQ = []; s.autoRadio = []; s.radioMode = radio; s.secondaryEnabled = sec;
    s.agg = { sw: 0, sv: 0, closed: 0, unserved: 0, arrSum1: 0, arrN1: 0, legalOk: 0, legalN: 0, pen: 0, diversions: 0, secondaryCount: 0, secondarySum: 0, secondaryOnTime: 0, opsPoints: 0, opsLog: [] };
    s.cov = { n: 0, sum: 0, next: s.t + 60 };
    s.shiftLen = s.t + 12 * 3600;
    s.ev.nextMU = s.t + this.rr(240, 480);
    s.ev.nextSecond = this._isDay() && sec ? s.t + this.rr(1800, 5400) : s.ev.nextSecond;
    s.muPlayerRole = s.muOnlyRole;
    this.L('sys', `Cvičení MU: kraj je rozjetý (${s.cases.length} rozpracovaných událostí), MU začne za pár minut.`);
  }
  // automatický dispečer při zahřátí kraje: vyšle všechny potřebné posádky a vyřídí složky
  _warmDispatch() {
    for (const cs of this.s.cases) {
      if (cs.mu || cs.typ === 'sekundární' || cs.status === 'intake' || cs.status === 'closed') continue;
      if (['waiting', 'active'].includes(cs.status)) {
        const need = cs.initialDispatchRequired && cs.initialDispatchRequired.length ? cs.initialDispatchRequired : cs.firstAssign == null ? ['RZP'] : [];
        for (const type of need) {
          if (cs.initialDispatchSent.includes(type) || cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === type && k.caseRole !== 'heli-transfer' && BUSY.includes(k.state); })) continue;
          const x = this.suggest(cs.id, type)[0];
          if (x) this.assign(cs.id, x.crewId);
        }
      }
      for (const kind of ['pcr', 'hzs']) if (cs.agencies && cs.agencies[kind] && cs.agencies[kind].state === 'requested') this.sendAgency(cs.id, kind);
      if (cs.coroner && cs.coroner.state === 'available') this.sendAgency(cs.id, 'cor');
      if (cs.status === 'active' && cs.rvReq && !cs.rvReq.cancelled && !cs.rvReq.satT && !cs.docAssigned) { const v = this.suggest(cs.id, 'RV')[0]; if (v) this.assign(cs.id, v.crewId); }
    }
  }
  // vyhodnocení cvičení MU
  muSummary() {
    const s = this.s, c = this.caseOf(s.muCaseId);
    if (!c) return null;
    const m = c.mu;
    if (!m) return { downgraded: true, addr: c.addr, label: c.place };
    const by = { 1: 0, 2: 0, 3: 0, 4: 0 }; let delivered = 0, dead = 0;
    for (const p of m.pts) { by[p.color]++; if (p.st === 'delivered') delivered++; if (p.st === 'dead') dead++; }
    return { downgraded: false, label: m.label, addr: c.addr, cas: m.cas, by, delivered, dead, declaredAt: m.declaredAt, endedAt: m.endedAt != null ? m.endedAt : s.t, readyAt: c.readyAt,
      firstArrive: c.firstArrive != null ? c.firstArrive - c.readyAt : null, avizo: m.avizoAt != null && m.declaredAt != null ? m.avizoAt - m.declaredAt : null, updates: m.mt.n, mistakes: m.mistakes, score: c.score,
      ops: s.agg.opsLog.filter(x => x.caseId === c.id), neighbours: Object.keys(m.nb).length };
  }
  _prepareBusyStart() {
    const s = this.s, cases = [];
    for (let i = 0; i < 3; i++) {
      const c = this._spawn();
      c.createdAt = c.readyAt = c.waitSince = s.t;
      c.escAt = s.t + 1500;
      c.status = 'waiting';
      cases.push(c);
      this.L('case', `Předaná rozpracovaná událost ${c.num}: N${c.n} – ${c.klasif}, ${c.addr}`, c.id);
    }
    // V jednom případu už je RZP na cestě; přednost má N3/dynamická N2,
    // jinak hráč převezme případ s chybějící další potřebnou posádkou.
    const active = cases.find(c => c.n === 3 && !c.rvNeed) || cases.find(c => !c.rvNeed) || cases[0];
    if (active) {
      const rzp = this.suggest(active.id, 'RZP')[0];
      if (rzp) this.assign(active.id, rzp.crewId);
    }
  }

  // spojový řád: volání, potvrzení ZOS, zpráva, odpověď ZOS
  _radio(crew, cs, msg, reply, codes) {
    {
      const say = reply ? `ZCB101 rozumí${reply === true ? '' : ', ' + reply}.` : 'ZCB101 rozumí.';
      const opts = [{ k: 'ok', label: reply && reply !== true ? `Rozumí, ${reply}` : 'Rozumí', say, ok: true, act: 'ack' }];
      if (reply === 'zjišťujeme koronera') opts.push({ k: 'bad', label: 'Rozumí, vracejte se na základnu', say: 'ZCB101 rozumí, vracejte se na základnu.', ok: false, act: 'ack' });
      const who = cs && codes == null ? this._caller(cs, crew) : { crew, codes: codes || crew.code };
      this._crewCall(who.crew, cs, msg, opts, 'info', who.codes);
      return;
    }
    const id = cs ? cs.id : null, code = `ZCB${crew.code}`;
    this.L('crew', `ZCB101, zde ${code}, příjem.`, id, crew.id);
    this.L('crew', 'ZCB101 na příjmu.', id, crew.id);
    this.L('crew', `${code}: ${msg}`, id, crew.id);
    if (reply) this.L('crew', `ZCB101 rozumí${reply === true ? '' : ', ' + reply}.`, id, crew.id);
  }
  // LZS Kryštof 13: zkouška spojení v 8:00 a 20:00, hlášení po vzletu, hlášení transportu
  _lzsRadio() {
    const s = this.s, t = s.t, lz = this.crewOf('lzs');
    if (!lz) return;
    const sod = (s.startHour * 3600 + t) % 86400, day = Math.floor((s.startHour * 3600 + t) / 86400);
    for (const hh of [8, 20]) {
      const key = `${day}-${hh}`;
      if (sod >= hh * 3600 && sod < hh * 3600 + 900 && s.lzsCheck !== key && lz.state !== 'off') {
        s.lzsCheck = key;
        const w = this._lzsWeatherStatus();
        this._crewCall(lz, null, `na Matře slyší za 5, ${w === 'clear' ? 'jsme bez omezení' : w === 'consult' ? 'jsme na konzultaci' : 'zatím neletoví, kdyžtak se ozveme'}.`, [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }], 'info', 'K' + String(lz.code).replace(/\D/g, ''));
      }
    }
    if (lz.abortAt && t >= lz.abortAt && lz.caseId === lz.abortCase && (lz.state === 'enroute' || (lz.state === 'transport' && lz.lzsLeg === 'to-scene'))) {
      const cs = this.caseOf(lz.caseId); lz.abortAt = null; lz.abortCase = null;
      if (cs) {
        this._crewCall(lz, cs, this.pick(['pro počasí let nelze dokončit, vracíme se na základnu.', 'zhoršila se dohlednost, let přerušujeme, vracíme se na základnu.', 'námraza a nízká oblačnost, k místu nedoletíme, vracíme se na základnu.']), [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }], 'info', 'K' + String(lz.code).replace(/\D/g, ''));
        this.cancelAssignment(cs.id, lz.id);
        this.L('req', `${cs.num}: LZS pro počasí nedoletí – zajisti jiného lékaře (RV).`, cs.id);
      }
    }
    if ((lz.state === 'enroute' || (lz.state === 'transport' && lz.lzsLeg === 'to-scene')) && lz.caseId && lz.enrouteAt != null && t - lz.enrouteAt >= 60 && lz.takeoffReported !== lz.caseId) {
      lz.takeoffReported = lz.caseId;
      // při konzultaci pilota se počasí může zhoršit a LZS se po vzletu vrací (v pár procentech)
      const wx = this._lzsWeatherStatus();
      const noAbort = (this.caseOf(lz.caseId) || {}).script && this.caseOf(lz.caseId).script.noAbort;
      if (!noAbort && ((wx === 'consult' && this.rnd() < 0.08) || (wx === 'clear' && this.rnd() < 0.01))) { lz.abortCase = lz.caseId; lz.abortAt = t + this.rr(60, Math.max(90, Math.min(420, (lz.until - t) * 0.7))); }
      const cs = this.caseOf(lz.caseId); if (!cs) return;
      const mins = Math.max(1, Math.ceil((lz.until - t) / 60));
      const ground = cs.crews.map(id => this.crewOf(id)).filter(k => k && k.id !== lz.id && k.type !== 'LZS' && BUSY.includes(k.state));
      const say2 = ground.length ? `${ground.map(k => 'ZCB' + k.code).join(' a ')}, ${this._label(lz)} přistává za ${mins} minut.` : null;
      this._crewCall(lz, cs, `po vzletu, na místě přistání za ${mins} minut.`, [{ k: 'ok', label: `Rozumí, na místě za ${mins} min`, say: `ZCB101 rozumí, na místě za ${mins} minut.`, say2, ok: true, act: 'ack', def: true }], 'info', 'K' + String(lz.code).replace(/\D/g, ''));
    }
  }
  // ---------- RNG ----------
  rnd() {
    let t = (this.s.rs = (this.s.rs + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  rr(a, b) { return a + this.rnd() * (b - a); }
  ri(a, b) { return Math.floor(this.rnd() * (b - a + 1)) + a; }
  pick(arr) { return arr[Math.floor(this.rnd() * arr.length)]; }
  wpick(arr, fn) {
    let tot = 0; for (const x of arr) tot += fn(x);
    let r = this.rnd() * tot;
    for (const x of arr) { r -= fn(x); if (r <= 0) return x; }
    return arr[arr.length - 1];
  }

  // ---------- čas ----------
  hour() { return ((this.s.startHour * 3600 + this.s.t) / 3600) % 24; }
  clockAt(t) {
    const sec = (this.s.startHour * 3600 + t) % 86400;
    return String(Math.floor(sec / 3600)).padStart(2, '0') + ':' + String(Math.floor(sec % 3600 / 60)).padStart(2, '0');
  }
  _isDay() { const h = this.hour(); return h >= 7 && h < 19; }
  // den pro LZS = mezi občanským úsvitem a soumrakem u základny LZS (jako v kalkulátoru časové úspory)
  _lzsTwilight() {
    const s = this.s, d0 = s.date || (typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '2026-06-21');
    const [Y, M, D] = d0.split('-').map(Number), off = Math.floor((s.startHour * 3600 + s.t) / 86400);
    const key = new Date(Date.UTC(Y, M - 1, D + off)).toISOString().slice(0, 10);
    this._twc = this._twc || {};
    return this._twc[key] || (this._twc[key] = civilTwilight(key, ZOS_DATA.lzs.lat, ZOS_DATA.lzs.lon));
  }
  _isLzsDay() { const tw = this._lzsTwilight(), h = this.hour(); return h >= tw.dawn && h < tw.dusk; }
  _sunWindow() {
    const lat = 49.2 * Math.PI / 180, day = this.s.dayOfYear || 172;
    const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365);
    const cosH = Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(decl)));
    const halfDay = Math.acos(cosH) * 12 / Math.PI;
    const noon = 12.05;
    return { sunrise: noon - halfDay, sunset: noon + halfDay };
  }
  // počasí z hodinových dat (skutečných nebo simulovaných); null = starý náhodný stav (výcvik, staré uložené hry)
  _wxLive() { const w = this.s.weather; return !!(w && w.hours && !this.s.scripted); }
  wxObs() {
    const w = this.s.weather; if (!w || !w.hours) return null;
    return WX.at(w.hours, (this.s.startHour * 3600 + this.s.t) / 3600);
  }
  wxLzs() { return this._wxLive() ? WX.lzs(this.wxObs(), !this._isLzsDay()) : null; }
  _wxMul(mode) { return this._wxLive() && mode ? WX.travelMul(this.wxObs(), mode) : 1; }
  _wxCase(id) { return this._wxLive() ? WX.caseMul(this.wxObs(), id) : 1; }
  // datum hry (podle času směny) a den v týdnu
  dateInfo() {
    const [Y, M, D] = String(this.s.date).split('-').map(Number), off = Math.floor((this.s.startHour * 3600 + this.s.t) / 86400);
    const d = new Date(Date.UTC(Y, M - 1, D + off)), wd = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'][d.getUTCDay()];
    return { wd, label: `${wd} ${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}` };
  }
  _lzsWeatherStatus() {
    if (this._wxLive()) return this.wxLzs().status;
    if (this.s.weather && this.s.weather.condition === 'grounded') return 'neletovo';
    const h = this.hour(), sun = this._sunWindow();
    if (h < sun.sunrise || h >= sun.sunset || this.s.weather.condition === 'marginal') return 'consult';
    return 'clear';
  }
  _updateWeather() {
    const w = this.s.weather, t = this.s.t;
    if (t >= w.nextChange && !this._wxLive()) {
      const season = Math.cos(2 * Math.PI * ((this.s.dayOfYear || 172) - 15) / 365);
      const groundedChance = 0.07 + Math.max(0, season) * 0.12;
      const x = this.rnd();
      w.condition = x < groundedChance ? 'grounded' : x < groundedChance + 0.28 ? 'marginal' : 'clear';
      w.nextChange = t + this.rr(5400, 10800);
    }
    const status = this._lzsWeatherStatus();
    if (w.previousStatus != null && status !== w.previousStatus) {
      const text = status === 'clear' ? 'LZS: počasí bez omezení.' : status === 'consult' ? 'LZS: podmínky na konzultaci s pilotem.' : 'LZS: neletové počasí, vrtulník nelze vyslat.';
      this.L('alert', text);
    }
    w.previousStatus = status;
    for (const c of this.s.cases) if (c.lzsConsult && c.lzsConsult.status === 'pending' && t >= c.lzsConsult.answerAt) {
      const current = this._lzsWeatherStatus();
      const chance = this.s.weather.condition === 'marginal' ? 0.48 : 0.62;
      const approved = current !== 'neletovo' && (c.script && c.script.pilot ? c.script.pilot === 'approve' : this.rnd() < chance);
      c.lzsConsult.status = approved ? 'approved' : 'declined';
      c.lzsPilotApproved = approved;
      c.lzsConsult.weatherStatus = current;
      this.L('alert', approved ? `Pilot LZS po konzultaci potvrzuje možnost letu k ${c.num}.` : `Pilot LZS po konzultaci let k ${c.num} nedoporučuje.`, c.id);
    }
    for (const c of this.s.cases) if (c.lzsTechRequested && !c.lzsTechDone && t >= c.lzsTechAssistAt) {
      c.lzsTechDone = true;
      this.L('alert', `${c.num}: technická součinnost pro přístup LZS je na místě připravena.`, c.id);
    }
  }
  clock() {
    const sec = (this.s.startHour * 3600 + this.s.t) % 86400;
    return this.clockAt(this.s.t) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
  }
  L(kind, txt, cid, crid) {
    const s = this.s;
    s.log.push({ id: s.logId++, t: s.t, clock: this.clock(), kind, txt, cid: cid || null, crid: crid || null });
    if (s.log.length > 400) s.log.shift();
  }

  // ---------- posádky ----------
  _buildCrews() {
    const s = this.s, D = ZOS_DATA;
    const cnt = {};
    const code = (o, kind) => {
      const ob = D.oblasti.find(x => x.id === o);
      const key = o + kind; cnt[key] = (cnt[key] || 0) + 1;
      const base = kind === 'RZP' ? 10 : kind === 'RV' ? 20 : 90;
      return String(ob.radio * 100 + base + cnt[key]);
    };
    for (const st of D.stations) {
      const maxR = Math.max(st.day.rzp, st.night.rzp), maxV = Math.max(st.day.rv, st.night.rv);
      for (let i = 0; i < maxR; i++) s.crews.push(this._mk({
        id: st.id + '-r' + i, type: 'RZP', name: (D.crewNames && D.crewNames[st.id] && D.crewNames[st.id].rzp && D.crewNames[st.id].rzp[i]) || st.short + (maxR > 1 ? ' RZP ' + (i + 1) : ' RZP'),
        code: (D.crewNames && D.crewNames[st.id] && D.crewNames[st.id].rzpNo && D.crewNames[st.id].rzpNo[i] != null) ? String(D.crewNames[st.id].rzpNo[i]) : code(st.oblast, 'RZP'), oblast: st.oblast, st: st.id, lat: st.lat, lon: st.lon,
        dayOn: i < st.day.rzp, nightOn: i < st.night.rzp, zzum: !!st.zzum,
      }));
      for (let i = 0; i < maxV; i++) s.crews.push(this._mk({
        id: st.id + '-v' + i, type: 'RV', name: (D.crewNames && D.crewNames[st.id] && D.crewNames[st.id].rv && D.crewNames[st.id].rv[i]) || st.short + (maxV > 1 ? ' RV ' + (i + 1) : ' RV'),
        code: (D.crewNames && D.crewNames[st.id] && D.crewNames[st.id].rvNo && D.crewNames[st.id].rvNo[i] != null) ? String(D.crewNames[st.id].rvNo[i]) : code(st.oblast, 'RV'), oblast: st.oblast, st: st.id, lat: st.lat, lon: st.lon,
        dayOn: i < st.day.rv, nightOn: i < st.night.rv,
      }));
    }
    const lz = D.lzs;
    s.crews.push(this._mk({ id: 'lzs', type: 'LZS', name: lz.name, code: 'KR13', oblast: lz.oblast, st: 'lzs', lat: lz.lat, lon: lz.lon, dayOn: true, nightOn: true, fixed: true }));
    for (const support of D.lzsSupport) s.crews.push(this._mk({
      id: support.id, type: 'LZS', name: support.name, code: support.code, oblast: support.oblast, st: support.id,
      lat: support.lat, lon: support.lon, dayOn: false, nightOn: false, externalLzs: true, ext: true, region: support.region, foreign: !!support.foreign,
      externalDayOnly: !!support.dayOnly, activationDay: support.activationDay || [150, 210], activationNight: support.activationNight || [360, 480],
    }));
    for (const g of D.nbGround || []) s.crews.push(this._mk(this._nbGroundOpts(g)));
    for (const m of D.mu) {
      const st = D.stations.find(x => x.id === m.stationId);
      s.crews.push(this._mk({ id: m.id, type: 'MU', name: m.name, code: m.no ? String(m.no) : m.name.replace('MU ', 'MU-'), oblast: m.oblast, st: m.stationId, lat: st.lat, lon: st.lon, dayOn: true, nightOn: true, fixed: true }));
    }
    for (const l of D.libero || []) this._addLibero(l);
    for (const r of D.reserves) {
      const st = D.stations.find(x => x.id === r.stationId);
      s.crews.push(this._mk({ id: r.id, type: 'RZP', name: r.name, code: code(r.oblast, 'Z'), oblast: r.oblast, st: r.stationId, lat: st.lat, lon: st.lon, dayOn: false, nightOn: false, res: true }));
    }
  }
  _nbGroundOpts(g) { return { id: g.id, type: 'RZP', name: g.name, code: g.code, oblast: 'EXT', st: g.id, lat: g.lat, lon: g.lon, dayOn: false, nightOn: false, ext: true, externalGround: true, region: g.region, foreign: !!g.foreign }; }
  _mk(o) {
    return Object.assign({
      state: 'off', until: 0, caseId: null, mv: null, home: { lat: o.lat, lon: o.lon },
      arrivedAt: null, dest: null, pendingOff: false, res: false, fixed: false, zzum: false, dutyEnd: 0,
      caseRole: null, lzsLeg: null, callsCompleted: 0,
      members: [this._name(this.rnd() < 0.45 ? 'Ž' : 'M', 24 + this.ri(0, 30)), this._name(this.rnd() < 0.15 ? 'Ž' : 'M', 24 + this.ri(0, 30))],
    }, o);
  }
  // Nastavení LIBERA: presence = pravděpodobnost obsazení v %, modes[id] = 'random' | 'on' | 'off'
  static liberoSettings(o) {
    o = o || {};
    const def = Math.round(((ZOS_DATA.liberoPresence != null) ? ZOS_DATA.liberoPresence : 0.75) * 100);
    const presence = Math.max(0, Math.min(100, Number(o.presence == null ? def : o.presence)));
    const modes = {};
    for (const l of ZOS_DATA.libero || []) { const m = o.modes && o.modes[l.id]; modes[l.id] = m === 'on' || m === 'off' ? m : 'random'; }
    return { presence, modes };
  }
  _addLibero(l) {
    const st = ZOS_DATA.stations.find(x => x.id === l.stationId);
    this.s.crews.push(this._mk({ id: l.id, type: 'LIB', name: l.name, code: l.no ? String(l.no) : 'LIB', oblast: l.oblast, st: l.stationId, lat: st.lat, lon: st.lon, dayOn: true, nightOn: false, libero: true, members: [this._name(this.rnd() < 0.4 ? 'Ž' : 'M', 30 + this.ri(0, 25))] }));
  }
  _liberoRoll(c) {
    const set = this.s.libero || Sim.liberoSettings(), m = set.modes[c.id] || 'random';
    return m === 'on' ? true : m === 'off' ? false : this.rnd() * 100 < set.presence;
  }
  // změna nastavení LIBERA během hry (obsazeno / neobsazeno / náhodně)
  setLiberoMode(id, mode) {
    const c = this.crewOf(id); if (!c || !c.libero) return { ok: false, msg: 'Neznámé LIBERO.' };
    if (!this.s.libero) this.s.libero = Sim.liberoSettings();
    this.s.libero.modes[id] = mode === 'on' || mode === 'off' ? mode : 'random';
    if (mode === 'on') c.liberoPresent = true;
    else if (mode === 'off') c.liberoPresent = false;
    this._roster(true);
    return { ok: true };
  }
  // je posádka podle týdenního plánu mimo provoz? Směnový den začíná v 7:00.
  _weeklyOff(c) {
    const rules = ZOS_DATA.weeklyOff; if (!rules || !rules.length) return false;
    const s = this.s, [Y, M, D] = String(s.date).split('-').map(Number), off = Math.floor((s.startHour * 3600 + s.t - 7 * 3600) / 86400);
    const wd = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'][new Date(Date.UTC(Y, M - 1, D + off)).getUTCDay()];
    return rules.some(r => r.st === c.st && r.type === c.type && r.days.includes(wd));
  }
  _roster(announce) {
    const s = this.s, day = s.dayFlag;
    for (const c of s.crews) {
      if (c.res) continue;
      if (c.libero) {
        const dayKey = Math.floor((s.startHour * 3600 + s.t - 7 * 3600) / 86400);
        if (c.liberoDay !== dayKey) { c.liberoDay = dayKey; c.liberoPresent = this._liberoRoll(c); }
      }
      const want = c.libero ? day && c.liberoPresent : c.ext ? !!c.supportRequested && !(c.externalDayOnly && !day) : c.fixed ? true : (!this._weeklyOff(c) && (day ? c.dayOn : c.nightOn));
      if (want) {
        c.pendingOff = false;
        if (c.state === 'off') { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; c.mv = null; if (announce) this.L('crew', `${c.name}: přihlášena`, null, c.id); }
      } else {
        if (c.state === 'base' || c.state === 'free') {
          const p = this.pos(c); c.lat = p.lat; c.lon = p.lon; c.mv = null; c.state = 'off';
          if (c.ext && c.externalDayOnly) { c.supportRequested = false; c.supportRequestedFor = null; }
          if (announce) this.L('crew', `${c.name}: odhlášena`, null, c.id);
        } else if (c.state !== 'off') c.pendingOff = true;
      }
    }
  }
  pos(c, tt) {
    if (c.libero && c.withCrew) { const k = this.crewOf(c.withCrew); if (k) return this.pos(k, tt); }
    const m = c.mv;
    if (!m) return { lat: c.lat, lon: c.lon };
    const f = clamp01(((tt != null ? tt : this.s.t) - m.t0) / Math.max(1, m.t1 - (m.dw || 0) - m.t0));
    if (m.path && m.frac) {
      const F = m.frac; let lo = 0, hi = F.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F[mid] <= f) lo = mid; else hi = mid; }
      const span = F[hi] - F[lo], w = span > 0 ? (f - F[lo]) / span : 0;
      return { lat: m.path[lo * 2] + (m.path[hi * 2] - m.path[lo * 2]) * w, lon: m.path[lo * 2 + 1] + (m.path[hi * 2 + 1] - m.path[lo * 2 + 1]) * w };
    }
    return { lat: m.a[0] + (m.b[0] - m.a[0]) * f, lon: m.a[1] + (m.b[1] - m.a[1]) * f };
  }
  // okamžitá rychlost posádky v km/h: ujetá vzdálenost za posledních 5 s herního času, přepočítává se po pětivteřinových krocích
  speedKmh(c) {
    if (c.libero && c.withCrew) { const k = this.crewOf(c.withCrew); if (k) return this.speedKmh(k); }
    const m = c.mv, t5 = Math.floor(this.s.t / 5) * 5;
    if (!m) return 0;
    const a = Math.max(t5 - 5, m.t0), b = Math.min(t5, m.t1);
    if (b - a < 1) return 0;
    const p0 = this.pos(c, a), p1 = this.pos(c, b);
    const km = hav(p0.lat, p0.lon, p1.lat, p1.lon);
    return Math.max(0, Math.round(km / (b - a) * 3600));
  }
  phase(c) {
    const t = this.s.t;
    if (c.libero) { const k = c.withCrew && this.crewOf(c.withCrew); return c.state === 'attached' ? `Ve voze ${k ? (k.baseName || k.name) : 'RZP'}` : c.state === 'base' ? 'Na základně' : 'Dnes není'; }
    switch (c.state) {
      case 'call': return 'Výzva';
      case 'enroute': return 'Výjezd';
      case 'onscene': return 'Na místě';   // skutečná posádka hlásí jen „na místě“ a pak „transport“, zahájení ošetření se nehlásí
      case 'transport': return 'Transport';
      case 'handover': return t < c.until - 600 + 120 || (c.until - c.hoStart) < 130 ? 'Příjezd k ZZ' : 'Předání pacienta';
      case 'free': return 'Volný';
      case 'base': return 'Na základně';
      case 'activating': return 'Aktivace';
      case 'second': return c.nbMission ? `Pomoc sousedovi: ${c.nbMission.place}` : 'Sekundární převoz';
      default: return 'Nepřihlášena';
    }
  }
  caseOf(id) { return this.s.cases.find(c => c.id === id) || null; }
  crewOf(id) { return this.s.crews.find(c => c.id === id) || null; }
  avail(c) { return c.state === 'base' || c.state === 'free' || (c.caseRole === 'exam' && c.state === 'onscene') || (c.caseRole === 'escort' && !!c.escortFree && c.state === 'transport'); }

  // hodnota z kvantilové tabulky (21 hodnot po 5 %), lineární interpolace
  _qTab(q, u) {
    const x = (u != null ? u : this.rnd()) * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x));
    return q[i] + (q[i + 1] - q[i]) * (x - i);
  }
  _gauss() { let a = 0; for (let i = 0; i < 6; i++) a += this.rnd(); return (a - 3) * Math.SQRT2; }   // ≈ N(0,1) (součet 6 rovnoměrných, rozptyl 0,5)
  // kalibrovaná doba jízdy k případu (N1–N3) z času routeru; null = použije se starý model
  _driveCal(sec, mode, c) {
    const C = ZOS_DATA.driveCal;
    if (!C || !/^N[123]$/.test(mode || '') || c.type === 'MU' || c.type === 'LZS') return null;
    const n = +mode[1], rv = c.type === 'RV' || c.type === 'LIB', p = rv ? C.rv : (n === 3 ? C.rzp.N3 : C.rzp.N2);
    let k = (n === 1 ? (rv ? C.c1.rv : C.c1.rzp) : 1) * C.hour[Math.floor(this.hour())];
    k *= (c.fromBase && C.baseMul[c.st]) || 1;
    const fixed = p[0] * k * (c.fromBase === false ? (C.roadA != null ? C.roadA : 1) : 1);
    const mean = Math.max(25, fixed + k * (p[1] * Math.min(sec, C.sk) + p[2] * Math.max(0, sec - C.sk)));
    return { mean, sg: p[3], fixed };
  }
  // pevná část jízdy se rozloží po trase: pomalejší rozjezd a hlavně dojezd (hledání adresy), vozidlo se hýbe až do „na místě“, bez čekání
  _warpFrac(pts, frac, sec, dur, fixed) {
    const n = frac.length; if (n < 2 || sec < 5) return frac;
    const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + hav(pts[(i - 1) * 2], pts[(i - 1) * 2 + 1], pts[i * 2], pts[i * 2 + 1]) * 1000);
    const L = cum[n - 1]; if (L < 1) return frac;
    const A = Math.min(fixed, 0.85 * dur), eS = 0.2 * A, eE = 0.8 * A, dS = Math.min(300, 0.15 * L), dE = Math.min(900, 0.6 * L), k = (dur - eS - eE) / sec;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = (k * frac[i] * sec + eS * Math.min(1, cum[i] / dS) + eE * Math.max(0, (cum[i] - (L - dE)) / dE)) / dur;
    out[0] = 0; out[n - 1] = 1;
    for (let i = 1; i < n; i++) if (out[i] < out[i - 1]) out[i] = out[i - 1];
    return out;
  }
  _turnout(c, urgency) {
    if (c.type === 'MU') return this.rr(240, 420);
    if (c.type === 'LZS') {
      const range = this._isLzsDay() ? (c.activationDay || ZOS_DATA.lzs.activationDay) : (c.activationNight || ZOS_DATA.lzs.activationNight);
      return this.rr(range[0], range[1]);
    }
    if (urgency === 4) return c.state === 'base' ? this.rr(55, 115) : this.rr(15, 35);
    // kalibrace na reálné výjezdy (leden + červenec 2026): kvantilové tabulky ZOS_DATA.turnCal, zvlášť posádka na základně a v autě, v noci pomaleji
    const TC = ZOS_DATA.turnCal;
    if (TC && (c.type === 'RZP' || c.type === 'RV') && urgency >= 1 && urgency <= 3) {
      const typ = c.type === 'RV' ? 'RLP' : 'RZP', h = Math.floor(this.hour()), night = h >= 19 || h < 7;
      if (c.state !== 'base') return Math.max(8, this._qTab(TC.road[typ]));
      return Math.max(30, this._qTab(TC.base[typ + '_N' + urgency]) * (night ? TC.night[typ] : 1));
    }
    const atBase = c.state === 'base';
    // kalibrace na reálné prodlevy výzva → výjezd (leden + červenec 2026): RZP medián N1 79 s, N2 100 s, N3 106 s (p90 136 / 161 / 168 s), RV medián 107–132 s (p90 168–254 s)
    const lateChance = urgency === 1 ? 0.01 : urgency === 2 ? 0.03 : 0.04;
    if (c.type === 'RV') return atBase ? (urgency === 1 ? this.rr(50, 200) : this.rr(60, 230)) : this.rr(20, 60);
    if (this.rnd() < lateChance) return this.rr(201, 260);
    if (!atBase) return this.rr(15, 35);
    return urgency === 1 ? this.rr(50, 110) : urgency === 2 ? this.rr(55, 165) : this.rr(55, 175);
  }
  _lzActivationExpected(c) {
    const range = this._isLzsDay() ? ((c && c.activationDay) || ZOS_DATA.lzs.activationDay) : ((c && c.activationNight) || ZOS_DATA.lzs.activationNight);
    return (range[0] + range[1]) / 2;
  }
  // kalkulátor časové úspory LZS: řádek pro jednu cílovou nemocnici
  // h11 = LZS od začátku (čas LZS = let z místa do nemocnice), h12 = posádka už na místě (vzlet + let na místo + předání, ošetření)
  _lzsRows(cs, mode, treat) {
    const L = ZOS_DATA.lzs, takeoff = (this._isLzsDay() ? L.takeoffDay : L.takeoffNight) / 60;
    const fl = (a, b, c, d) => Math.round(hav(a, b, c, d) / L.speedKmh * 60);
    const tm = 'P' + Math.min(3, Math.max(2, cs.n || 3));
    return Object.keys(L.hospitalDelaySec).map(id => {
      const h = ZOS_DATA.hospitals.find(x => x.id === id); if (!h) return null;
      const ground = Math.round(driveSec(this._eta(cs.lat, cs.lon, h.lat, h.lon), tm) / 60) + (mode === 'h12' ? treat : 0);
      const delay = Math.round(L.hospitalDelaySec[id] / 60);
      const fScene = fl(L.lat, L.lon, cs.lat, cs.lon), fHosp = fl(cs.lat, cs.lon, h.lat, h.lon);
      const lzsMin = mode === 'h12' ? Math.max(takeoff + fScene + L.handoverSec / 60, treat) + fHosp : fHosp;
      const saving = ground - (lzsMin + delay);
      return { id, name: h.short, groundMin: ground, lzsMin, delayMin: delay, saving, level: saving >= L.savedOptimal ? 'ano' : saving >= L.savedMinimal ? 'mozna' : 'ne' };
    }).filter(Boolean);
  }
  lzsAdvice(caseId) {
    const cs = this.caseOf(caseId); if (!cs || cs.typ === 'sekundární' || cs.mu) return null;
    const onScene = cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === 'RZP' && k.caseId === cs.id && k.state === 'onscene'; });
    let treat = 0;
    if (onScene && cs.firstArrive != null && cs.scene) treat = Math.max(0, Math.round(((cs.scene[0] + cs.scene[1]) / 2 - (this.s.t - cs.firstArrive) / 60) / 5) * 5);
    const mode = onScene ? 'h12' : 'h11', day = this._isLzsDay();
    return { mode, treat, day, takeoffMin: (day ? ZOS_DATA.lzs.takeoffDay : ZOS_DATA.lzs.takeoffNight) / 60, rows: this._lzsRows(cs, mode, treat) };
  }
  // hodnocení rozhodnutí o LZS po uzavření případu (H1/1, nejbližší nemocnice z kalkulátoru)
  _lzsEval(cs) {
    const a = this.s.agg, z = a.lzs || (a.lzs = { sentOk: 0, sentMaybe: 0, sentWasted: 0, missed: 0, log: [] });
    if (cs.unserved || cs.mu || cs.typ === 'sekundární' || !cs.arrived) return;
    const rows = this._lzsRows(cs, 'h11', 0); if (!rows.length) return;
    const r = rows.reduce((b, x) => (!b || x.groundMin < b.groundMin ? x : b), null), sent = !!cs.lzsActive;
    let kind = null;
    if (sent) { if (r.level === 'ano') { z.sentOk++; kind = 'ok'; } else if (r.level === 'mozna') { z.sentMaybe++; kind = 'hranicni'; } else { z.sentWasted++; kind = 'zbytecne'; } }
    else if (r.level === 'ano' && cs.nOrig === 1 && cs.wxAtCall === 'clear') { z.missed++; kind = 'zapomenute'; }
    cs.lzsEval = { saving: r.saving, level: r.level, hospital: r.name, sent, kind };
    if ((kind === 'zbytecne' || kind === 'zapomenute') && z.log.length < 8) z.log.push({ num: cs.num, txt: `${kind === 'zapomenute' ? 'zapomenutá' : 'zbytečně vyslaná'}, úspora ${r.saving} min (${r.name})` });
  }
  etaFor(c, lat, lon, n) {
    const p = this.pos(c), mode = 'N' + Math.min(4, Math.max(1, n || 2));
    if (c.type === 'LZS') return this._lzActivationExpected(c) + heliSec(p.lat, p.lon, lat, lon);
    if (c.type === 'MU') return 330 + driveSec(this._eta(p.lat, p.lon, lat, lon), 'N2');
    const sec = this._eta(p.lat, p.lon, lat, lon), TC = ZOS_DATA.turnCal;
    const was = c.fromBase; c.fromBase = c.state === 'base';
    const cal = this._driveCal(sec, mode, c); c.fromBase = was;
    if (cal && TC && (c.type === 'RZP' || c.type === 'RV')) {
      const typ = c.type === 'RV' ? 'RLP' : 'RZP', h = Math.floor(this.hour()), night = h >= 19 || h < 7, u = +mode[1];
      const turn = c.state === 'base' ? this._qTab(TC.base[typ + '_N' + u], 0.5) * (night ? TC.night[typ] : 1) : this._qTab(TC.road[typ], 0.5);
      return turn + cal.mean * this._wxMul(mode);
    }
    return (c.state === 'base' ? 78 : 25) + driveSec(sec, mode) * this._wxMul(mode);
  }
  _eta(a, b, c, d) {
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) { const v = ROUTER.eta(a, b, c, d); if (v != null) return v; }
    return travelSec(a, b, c, d);
  }
  // pohyb posádky po silnicích (nebo vzdušnou čarou, když router není)
  _go(c, lat, lon, mult) {
    const t = this.s.t, jit = this.rr(0.96, 1.04), mode = typeof mult === 'string' ? mult : null;
    if (mode) mult = 1;
    let sec = null, path = null, frac = null, routed = false;
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) {
      const r = ROUTER.route(c.lat, c.lon, lat, lon);
      if (r) { sec = r.sec; path = r.pts; frac = r.frac; routed = true; }
    }
    if (sec == null) sec = travelSec(c.lat, c.lon, lat, lon, mode ? 1 : mult);
    let moving, dwell = 0;
    const cal = this._driveCal(sec, mode, c);
    if (cal) {
      moving = Math.max(25, cal.mean * Math.exp(cal.sg * this._gauss() - cal.sg * cal.sg / 2) * this._wxMul(mode));
      if (routed && frac) frac = this._warpFrac(path, frac, sec, moving, cal.fixed);
    } else if (mode) { const m = DRIVE[mode] || DRIVE.N3; dwell = m[0] * Math.min(1, sec / 150); moving = sec * m[1] * jit * this._wxMul(mode); }
    else moving = (routed ? sec * mult : sec) * jit;
    const dur = moving + dwell;
    c.mv = { a: [c.lat, c.lon], b: [lat, lon], t0: t, t1: t + dur, dw: dwell, path, frac, mode };
    return dur;
  }
  // návrat na základnu: standardně bez majáků; v režimu N3 (na pokyn dispečera) na majáky; RV mimo pravidelně zajištěnou oblast (>10 min od základny) vždy na majáky
  _goHome(c) {
    const far = c.type === 'RV' && this._eta(c.lat, c.lon, c.home.lat, c.home.lon) > 600;
    const lights = !!c.retN3 || far;
    c.retN3 = false; c.driveN = null; c.retLights = lights;
    return this._go(c, c.home.lat, c.home.lon, lights ? 'RETL' : 'RET');
  }
  isLights(c) { return !!(c && c.mv && LIGHT_MODES.includes(c.mv.mode) && (c.state === 'enroute' || c.state === 'transport' || c.state === 'free')); }
  // dispečer: návrat v režimu N3 (majáky)
  requestReturnN3(id) {
    const c = this.crewOf(id), t = this.s.t;
    if (!c || c.type === 'LZS' || c.type === 'MU' || c.libero || c.state === 'off' || c.state === 'base' || c.state === 'second') return { ok: false, msg: 'Posádce nelze nařídit návrat v režimu N3.' };
    const cs = c.caseId ? this.caseOf(c.caseId) : null;
    if (c.state === 'free' && c.mv) {
      if (c.retLights) return { ok: false, msg: `${c.name} už se vrací v režimu N3.` };
      const p = this.pos(c); c.lat = p.lat; c.lon = p.lon;
      const dur = this._go(c, c.home.lat, c.home.lon, 'RETL'); c.until = t + dur; c.retLights = true;
      this._zosSay(c, null, 'vracejte se prosím v režimu N3.', 'jedeme v režimu N3', true);
      return { ok: true };
    }
    if (!['call', 'enroute', 'onscene', 'transport', 'handover'].includes(c.state)) return { ok: false, msg: 'Posádce nelze nařídit návrat v režimu N3.' };
    if (c.retN3) return { ok: false, msg: `${c.name} už má návrat v režimu N3 nařízen.` };
    c.retN3 = true;
    this._zosSay(c, cs, 'po předání se prosím vracejte v režimu N3.', 'po předání se vracíme v režimu N3', true);
    return { ok: true };
  }
  // dispečer: změna naléhavosti jízdy posádky (rychlost + majáky)
  setDriveUrgency(id, n) {
    const c = this.crewOf(id); n = Number(n);
    if (!c || ![1, 2, 3].includes(n) || c.type === 'LZS' || c.type === 'MU' || c.libero) return { ok: false, msg: 'Naléhavost jízdy nelze změnit.' };
    c.driveN = n;
    if (c.state === 'enroute' && c.mv && !c.caseRole) {
      const p = this.pos(c), t = this.s.t, b = c.mv.b; c.lat = p.lat; c.lon = p.lon;
      const dur = this._go(c, b[0], b[1], 'N' + n); c.until = t + dur;
    }
    this.L('crew', `${c.name}: jízda v naléhavosti N${n}(majáky)`, c.caseId, c.id);
    return { ok: true };
  }
  _goAir(c, lat, lon) {
    const t = this.s.t;
    let dur = heliSec(c.lat, c.lon, lat, lon);
    if (this._wxLive()) { // rychlost vůči zemi: 215 km/h ± složka větru ve směru letu
      const o = this.wxObs(), p = Math.PI / 180, brg = Math.atan2(Math.sin((lon - c.lon) * p) * Math.cos(lat * p), Math.cos(c.lat * p) * Math.sin(lat * p) - Math.sin(c.lat * p) * Math.cos(lat * p) * Math.cos((lon - c.lon) * p));
      const tail = o.wind * 1.852 * Math.cos(((o.dir + 180) * p) - brg), gs = Math.max(120, Math.min(330, 215 + tail));
      dur = dur * 215 / gs;
    }
    c.mv = { a: [c.lat, c.lon], b: [lat, lon], t0: t, t1: t + dur, path: null, frac: null };
    return dur;
  }
  // Heliport mimo kraj s předáním místní ZZS (FNKV Praha – ZZS HMP); převozní RZP z JčK se neposílá.
  _externalHandover(c) { return !!(c && c.lzsTargetHospitalId === 'h-fnkv'); }
  _heliportForCase(c) {
    const hospital = c && c.lzsTargetHospitalId && ZOS_DATA.hospitals.find(h => h.id === c.lzsTargetHospitalId && h.heliport);
    return hospital ? { name: `${hospital.short} heliport`, lat: hospital.lat, lon: hospital.lon } : ZOS_DATA.lzs.heliport;
  }
  // ---------- LIBERO ----------
  liberoFor(rzp) {
    if (!rzp || rzp.type !== 'RZP' || rzp.rlp) return null;
    return this.s.crews.find(l => l.libero && l.state === 'base' && l.st === rzp.st) || null;
  }
  attachLibero(rzpId, libId) {
    const k = this.crewOf(rzpId), l = libId ? this.crewOf(libId) : this.liberoFor(k);
    if (!k || k.type !== 'RZP') return { ok: false, msg: 'LIBERO lze přidat jen do RZP.' };
    if (k.rlp) return { ok: false, msg: `${k.name} už má lékaře.` };
    if (!l || !l.libero || l.state !== 'base') return { ok: false, msg: 'LIBERO není na základně k dispozici.' };
    if (l.st !== k.st) return { ok: false, msg: 'LIBERO může nastoupit jen do RZP stejné základny.' };
    const atBase = k.state === 'base' || (k.state === 'call' && hav(k.lat, k.lon, k.home.lat, k.home.lon) < 0.3);
    if (!atBase) return { ok: false, msg: `${k.name} už odjela ze základny.` };
    k.rlp = true; k.liberoId = l.id; k.baseName = k.baseName || k.name; k.name = `${k.baseName} + LIBERO`;
    l.state = 'attached'; l.withCrew = k.id;
    k.members = [l.members[0]].concat(k.members || []);
    this.L('crew', `${l.name}: lékař nastoupil do ${k.baseName} – dočasně RLP`, k.caseId, k.id);
    const cs = k.caseId && this.caseOf(k.caseId);
    if (cs) this._markDoctor(cs, k);
    return { ok: true };
  }
  // dispečer odpřadí LIBERO od RZP (jen dokud posádka neodjela ze základny)
  removeLibero(id) {
    let k = this.crewOf(id);
    if (k && k.libero) k = k.withCrew ? this.crewOf(k.withCrew) : null;
    if (!k || !k.liberoId) return { ok: false, msg: 'LIBERO není ve voze.' };
    const atBase = k.state === 'base' || (k.state === 'call' && hav(k.lat, k.lon, k.home.lat, k.home.lon) < 0.3);
    if (!atBase) return { ok: false, msg: `${k.baseName || k.name} už odjela ze základny – lékař vystoupí až po návratu.` };
    const cs = k.caseId && this.caseOf(k.caseId);
    this._detachLibero(k);
    if (cs && !cs.crews.some(cid => { const x = this.crewOf(cid); return x && (x.type === 'RV' || x.type === 'LZS' || x.rlp); })) {
      cs.docAssigned = false; cs.docAssignT = null;
      if (cs.rvReq) cs.rvReq.satT = null;
    }
    return { ok: true };
  }
  _markDoctor(cs, k) {
    const t = this.s.t;
    if (!cs.docAssigned && !cs.liberoBonus && !cs.exitus && (cs.rvNeed || (cs.rvReq && !cs.rvReq.cancelled))) { cs.liberoBonus = true; this._opsScore(1, `využití LIBERO jako lékaře u ${cs.num}`, cs.id); }
    cs.docAssigned = true;
    if (cs.docAssignT == null) cs.docAssignT = t;
    if (cs.rvReq && !cs.rvReq.satT) cs.rvReq.satT = t;
    if (cs.initialDispatchRequired && cs.initialDispatchRequired.includes('RV') && !(cs.initialDispatchSent || []).includes('RV')) (cs.initialDispatchSent = cs.initialDispatchSent || []).push('RV');
  }
  _detachLibero(k) {
    if (!k || !k.liberoId) return;
    const l = this.crewOf(k.liberoId);
    k.rlp = false; k.liberoId = null; k.name = k.baseName || k.name;
    if (k.members && k.members.length > 2) k.members = k.members.slice(1);
    if (l) {
      l.withCrew = null;
      l.state = this.s.dayFlag && l.liberoPresent ? 'base' : 'off';
      l.lat = l.home.lat; l.lon = l.home.lon;
      this.L('crew', `${l.name}: lékař vystoupil na základně`, null, l.id);
    }
  }
  // kind: 'RZP' | 'RV' | 'LZS' | 'MU'
  suggest(caseId, kind, role) {
    const c = this.caseOf(caseId); if (!c) return [];
    if (role === 'heli-transfer' && (!c.lzsPatientToHospital || c.exitus || c.coronerRequested || c.lzsTransferCrewId || this._externalHandover(c))) return [];
    const out = [];
    for (const k of this.s.crews) {
      if (!this.avail(k) || k.type !== kind) continue;
      if (k.ext && k.supportRequestedFor !== c.id) continue;   // cizí posádky jen po souhlasu k tomuto případu
      if (c.mu && this._muReserveBlocked(k, c)) continue;
      const target = role === 'heli-transfer' ? this._heliportForCase(c) : { lat: c.lat, lon: c.lon };
      const eta = this.etaFor(k, target.lat, target.lon, c.n);
      const p = this.pos(k);
      out.push({ crewId: k.id, eta, km: roadKm(p.lat, p.lon, target.lat, target.lon) });
    }
    out.sort((a, b) => a.eta - b.eta);
    return out;
  }

  // ---------- akce dispečera ----------
  prealert(caseId) {
    const cs = this.caseOf(caseId);
    if (!cs || cs.status !== 'intake' || cs.n !== 1) return { ok: false, msg: 'Předpoplach lze vyhlásit jen při nabírání případu N1.' };
    if (cs.prealertCrewIds && cs.prealertCrewIds.length) return { ok: false, msg: 'Předpoplach už byl pro tento případ vyhlášen.' };
    const recipients = ['RZP', 'RV'].map(type => this.suggest(cs.id, type)[0]).filter(Boolean).map(x => this.crewOf(x.crewId));
    if (!recipients.length) return { ok: false, msg: 'Není dostupná žádná posádka pro předpoplach.' };
    cs.prealertCrewIds = recipients.map(c => c.id); cs.prealertAt = this.s.t;
    this.L('alert', `PŘEDPOPLACH N1 ${cs.num}: ${recipients.map(c => `${c.type} ${c.name}`).join(', ')}. Posádky zatím nevyjíždějí.`, cs.id);
    return { ok: true, crews: recipients.map(c => c.name) };
  }
  convertN2Dynamic(caseId) {
    const cs = this.caseOf(caseId);
    if (!cs || cs.status === 'closed' || cs.n !== 2 || cs.dyn) return { ok: false, msg: 'Dynamickou indikaci lze zvolit jen u statické N2.' };
    if (cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === 'RV'; })) return { ok: false, msg: 'RV už je k případu vysláno; nejprve jej odvolej.' };
    cs.dyn = true; cs.rvNeed = false; cs.rvLater = false;
    cs.initialDispatchRequired = ['RZP']; cs.initialDispatchSent = cs.initialDispatchSent.filter(type => type !== 'RV');
    this.L('case', `${cs.num}: výzva N2 převedena na dynamickou indikaci; primárně RZP, lékaře lze vyžádat při změně stavu.`, cs.id);
    return { ok: true };
  }
  // příznak ZZUM: výjezd bez lékaře – jen u RZP ze ZZUM stanoviště, nikdy u N1
  setZzumFlag(caseId, on) {
    const cs = this.caseOf(caseId);
    if (!cs || cs.status === 'closed') return { ok: false, msg: 'Případ nelze upravit.' };
    const zz = cs.crews.map(id => this.crewOf(id)).find(k => k && k.type === 'RZP' && k.zzum && k.caseId === cs.id);
    if (on) {
      if (cs.n === 1) return { ok: false, msg: 'U N1 je lékař povinný, příznak ZZUM nelze použít.' };
      if (!zz) return { ok: false, msg: 'Příznak ZZUM lze použít jen u RZP ze ZZUM stanoviště.' };
      if (cs.zzumFlag) return { ok: true };
      cs.zzumFlag = true; cs.zzumPrevNeed = cs.rvNeed; cs.zzumPrevReq = cs.initialDispatchRequired ? cs.initialDispatchRequired.slice() : null;
      cs.zzumOk = true; cs.rvNeed = false; cs.rvLater = this.rnd() < (cs.rvP || 0);
      if (cs.initialDispatchRequired) cs.initialDispatchRequired = ['RZP'];
      this.L('case', `${cs.num}: příznak ZZUM – výjezd bez lékaře (${zz.name}); lékaře lze vyžádat na pokyn posádky.`, cs.id);
    } else {
      if (!cs.zzumFlag) return { ok: true };
      cs.zzumFlag = false; cs.rvNeed = !!cs.zzumPrevNeed; if (cs.zzumPrevReq) cs.initialDispatchRequired = cs.zzumPrevReq;
      this.L('case', `${cs.num}: příznak ZZUM zrušen`, cs.id);
    }
    return { ok: true };
  }
  consultLzsPilot(caseId) {
    const cs = this.caseOf(caseId), status = this._lzsWeatherStatus();
    if (!cs || cs.status === 'closed' || cs.typ === 'sekundární') return { ok: false, msg: 'LZS lze konzultovat jen k otevřenému primárnímu případu.' };
    if (status === 'clear') return { ok: false, msg: 'Počasí je bez omezení, konzultace není potřeba.' };
    if (status === 'neletovo') return { ok: false, msg: 'Je neletové počasí; pilot misi nemůže přijmout.' };
    if (cs.lzsConsult && cs.lzsConsult.status === 'pending') return { ok: false, msg: 'Čeká se na odpověď pilota.' };
    cs.lzsPilotApproved = false;
    cs.lzsConsult = { status: 'pending', requestedAt: this.s.t, answerAt: this.s.t + this.rr(35, 75), weatherStatus: status };
    this.L('alert', `${cs.num}: probíhá textová konzultace s pilotem LZS o proveditelnosti letu.`, cs.id);
    return { ok: true };
  }
  requestLzsTechnicalAssist(caseId) {
    const cs = this.caseOf(caseId);
    if (!cs || !cs.lzsActive || !cs.lzsTechRequired) return { ok: false, msg: 'Tento zásah technickou součinnost LZS nevyžaduje.' };
    if (cs.lzsTechDone) return { ok: false, msg: 'Technická součinnost už je zajištěna.' };
    if (cs.lzsTechRequested) return { ok: false, msg: 'Technická součinnost už byla vyžádána.' };
    cs.lzsTechRequested = true; cs.lzsTechAssistAt = this.s.t + this.rr(360, 720);
    this.L('alert', `${cs.num}: přes KOPIS vyžádána technická součinnost HZS pro přístup v nepřístupném terénu.`, cs.id);
    return { ok: true };
  }
  activateReserve(id) {
    const c = this.crewOf(id), t = this.s.t;
    if (!c || !c.res || c.state !== 'off') return { ok: false, msg: 'Záloha není k dispozici.' };
    c.state = 'activating'; c.until = t + 1200; c.dutyEnd = t + 1200 + 4 * 3600;
    this.L('crew', `${c.name}: aktivace zálohy (za 20 min)`, null, c.id);
    return { ok: true };
  }
  requestLzsSupport(caseId, crewId) { return this.requestNeighbor(caseId, crewId); }

  serialize() { return JSON.stringify(this.s); }
  static restore(json) { return new Sim(null, typeof json === 'string' ? JSON.parse(json) : json); }
}

// přimíchání metod z částí do třídy Sim (metody i statické členy, zachová se nevýčetnost)
for (const Part of [SimRadio, SimNeighbors, SimCases, SimMU, SimLoop, SimScore]) {
  for (const [dst, src] of [[Sim.prototype, Part.prototype], [Sim, Part]]) {
    for (const k of Object.getOwnPropertyNames(src)) {
      if (k === 'constructor' || k === 'length' || k === 'name' || k === 'prototype') continue;
      Object.defineProperty(dst, k, Object.getOwnPropertyDescriptor(src, k));
    }
  }
}

Sim.MU_NB = MU_NB;
if (typeof module !== 'undefined') module.exports = { Sim, hav, travelSec, civilTwilight };
