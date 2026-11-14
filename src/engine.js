// ZOS simulátor – simulační jádro. Veškerý stav je prostý JSON (this.s), lze ukládat a obnovit.
// Vyžaduje globální ZOS_DATA (data.js).

const R_EARTH = 6371;
function hav(a, b, c, d) {
  const p = Math.PI / 180, dLa = (c - a) * p, dLo = (d - b) * p;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLo / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}
function roadKm(a, b, c, d) { return hav(a, b, c, d) * 1.32; }
function speedFor(km) { return km < 5 ? 32 : km < 15 ? 46 : km < 40 ? 56 : 64; }
function travelSec(a, b, c, d, mult) {
  const km = roadKm(a, b, c, d);
  return Math.max(25, km / speedFor(km) * 3600 * (mult || 1));
}
function heliSec(a, b, c, d) { return hav(a, b, c, d) / (130 * 1.852) * 3600; }
// Jízda k události s výstražnými zařízeními je rychlejší než běžný provoz (faktor času jízdy).
// Doba jízdy podle režimu (směrnice Primární zásah pozemních prostředků + úprava pravidel jízdy s VRZ).
// Router počítá po třídách silnic rychlostmi N2/N3 (limit + 30: dálnice 150, mimo obec 120, na horších silnicích méně).
// Režimy jsou [pevná část v s (rozjezd, průjezd obcí, hledání adresy), násobek času trasy]. N1 bez limitu je o pár % rychlejší;
// N4 a návrat bez VRZ v běžných limitech jsou pomalejší. N1–N3 kalibrováno na říjnovém vzorku výjezdů
// (čas výjezd → příjezd proti trase ze základny): N1 113 s + 0,94×, N2 138 s + 0,97×, N3 193 s + 0,89× (bez nejdelších tras ~1,0×).
const DRIVE = { N1: [110, 0.94], N2: [135, 0.97], N3: [175, 0.95], N4: [60, 1.3], P2: [90, 1.05], P3: [90, 1.15], RET: [30, 1.35] };
function driveSec(base, mode) { const m = DRIVE[mode] || DRIVE.N3; return m[0] * Math.min(1, base / 150) + base * m[1]; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
// Pracovní denní rytmus: ranní špička, klidnější poledne, menší odpolední vlna.
// Hodinový profil upraven podle výzev v říjnovém vzorku; součet denní/noční
// části zůstává zachovaný, takže se nemění celková obtížnost ani počet případů.
const TOD = [0.551,0.479,0.455,0.335,0.431,0.503,0.623,1.078,1.509,1.533,1.653,1.341,1.269,1.269,1.317,1.293,1.246,1.365,1.198,1.15,1.078,0.838,0.79,0.695]; // hodinový profil z říjnového vzorku (průměr = 1)
const EXTMSG = typeof ZOS_EXTMSG !== 'undefined' ? ZOS_EXTMSG : require('./messages.js');
const BUSY = ['call', 'enroute', 'onscene', 'transport', 'handover'];
const DEPT = { okresni: 'Urgentní příjem', iktove: 'Iktové centrum', trauma: 'Traumacentrum', pci: 'Kardiocentrum – katetrizační sál', psych: 'Psychiatrické oddělení', popaleniny: 'Popáleninové centrum' };
const DEPTN = { up: 'Urgentní příjem', chir: 'Chirurgická ambulance', ikt: 'Iktové centrum', kcc: 'KCC – komplexní cerebrovaskulární centrum', aro: 'ARO', det: 'Dětské oddělení', gyn: 'Gynekologicko-porodnické oddělení', orl: 'ORL', trauma: 'Traumacentrum', pci: 'Kardiocentrum – katetrizační sál', psy: 'Psychiatrické oddělení' };
// doba u ZZ (příjezd → odjezd od zařízení) podle říjnového vzorku: kvantily 0/10/25/50/75/90/100 %
// pracoviště ve 4. pádě pro hlášení „jedeme do Tábora na chirurgickou ambulanci“
const DEPT_ACC = { 'Urgentní příjem': 'na urgentní příjem', 'Chirurgická ambulance': 'na chirurgickou ambulanci', 'Iktové centrum': 'na iktové centrum', 'KCC – komplexní cerebrovaskulární centrum': 'na KCC', 'ARO': 'na ARO', 'Dětské oddělení': 'na dětské oddělení', 'Gynekologicko-porodnické oddělení': 'na gynekologicko-porodnické oddělení', 'ORL': 'na ORL', 'Traumacentrum': 'na traumacentrum', 'Kardiocentrum – katetrizační sál': 'na kardiocentrum', 'Psychiatrické oddělení': 'na psychiatrii', 'Popáleninové centrum': 'na popáleninové centrum' };
// velký kruhový objezd v ČB (Okružní × silnice č. 3, u průmyslové zóny) – posádky jedoucí přes něj se ohlásí znovu
const KRUHAC = { lat: 48.9987, lon: 14.4958 };
const HO_Q = [[0, 240], [0.1, 304], [0.25, 430], [0.5, 605], [0.75, 891], [0.9, 1333], [1, 1900]];
const FIRST = ['Jan', 'Petr', 'Pavel', 'Tomáš', 'Martin', 'Jiří', 'Karel', 'Lukáš', 'Michal', 'David', 'Marie', 'Jana', 'Eva', 'Hana', 'Anna', 'Lenka', 'Petra', 'Lucie', 'Alena', 'Zuzana'];
const LAST = ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Marek', 'Pospíšil', 'Hájek', 'Král', 'Jelínek', 'Růžička', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman'];
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
        if (c.mu) {
          if (!c.mu.phase) c.mu.phase = 'declared';
          if (c.mu.aircraft == null) c.mu.aircraft = false;
          if (c.mu.groupsRequired == null) c.mu.groupsRequired = 5;
          if (c.mu.sceneReportSent == null) c.mu.sceneReportSent = c.mu.firstMU != null;
          if (c.mu.requestSent == null) c.mu.requestSent = false;
          if (c.mu.hospitalInfoRequested == null) c.mu.hospitalInfoRequested = false;
        }
      }
      const existing = new Set(this.s.crews.map(c => c.id));
      for (const support of ZOS_DATA.lzsSupport) if (!existing.has(support.id)) this.s.crews.push(this._mk({
        id: support.id, type: 'LZS', name: support.name, code: support.code, oblast: support.oblast, st: support.id,
        lat: support.lat, lon: support.lon, dayOn: false, nightOn: false, externalLzs: true,
        externalDayOnly: !!support.dayOnly, activationDay: support.activationDay || [150, 210], activationNight: support.activationNight || [360, 480],
      }));
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
      mode: opts.mode || 'shift', diff: opts.diff || 1, rateMul: opts.rateMul || 1,
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
    if ((lz.state === 'enroute' || (lz.state === 'transport' && lz.lzsLeg === 'to-scene')) && lz.caseId && lz.enrouteAt != null && t - lz.enrouteAt >= 60 && lz.takeoffReported !== lz.caseId) {
      lz.takeoffReported = lz.caseId;
      const cs = this.caseOf(lz.caseId); if (!cs) return;
      const mins = Math.max(1, Math.ceil((lz.until - t) / 60));
      const ground = cs.crews.map(id => this.crewOf(id)).filter(k => k && k.id !== lz.id && k.type !== 'LZS' && BUSY.includes(k.state));
      const say2 = ground.length ? `${ground.map(k => 'ZCB' + k.code).join(' a ')}, ${this._label(lz)} přistává za ${mins} minut.` : null;
      this._crewCall(lz, cs, `po vzletu, na místě přistání za ${mins} minut.`, [{ k: 'ok', label: `Rozumí, na místě za ${mins} min`, say: `ZCB101 rozumí, na místě za ${mins} minut.`, say2, ok: true, act: 'ack', def: true }], 'info', 'K' + String(lz.code).replace(/\D/g, ''));
    }
  }
  // MU má být kompletně hotová do ~2 h: od 30. minuty po potvrzení pomáhají posádky sousedních krajů
  // (Vysočina, Plzeňský, Středočeský, Jihomoravský, Dolní Rakousko), po 110 minutách převezmou zbylé pacienty.
  _muHelp(c) {
    const m = c.mu, t = this.s.t;
    if (!m || m.phase !== 'declared' || m.declaredAt == null || c.status === 'closed' || m.left <= 0) return;
    const since = t - m.declaredAt;
    if (since < 1800 && !(m.requestSent && since >= 1200)) return;
    if (m.nextHelp == null) { m.nextHelp = t; this.L('alert', `${c.num}: sousední kraje nabízejí výpomoc – přijíždějí posádky ZZS z okolních krajů.`, c.id); }
    if (since >= 6600) {
      this.L('sys', `${c.num}: zbylé pacienty (${m.left}) převzaly posádky sousedních krajů, MU na místě ukončena.`, c.id);
      m.left = 0; c.patientsRemaining = 0;
      if (!this._busyCrews(c).length) this._close(c, false);
      return;
    }
    if (t >= m.nextHelp) {
      const n = Math.min(m.left, this.ri(1, 2)), who = this.pick(['ZZS Kraje Vysočina', 'ZZS Plzeňského kraje', 'ZZS Středočeského kraje', 'ZZS Jihomoravského kraje', 'Notruf Niederösterreich']);
      m.left -= n; c.patientsRemaining = Math.max(0, (c.patientsRemaining != null ? c.patientsRemaining : m.left + n) - n);
      m.nextHelp = t + this.rr(420, 720);
      this.L('sys', `${c.num}: výpomoc ${who} převzala ${n} ${n === 1 ? 'pacienta' : 'pacienty'}, zbývá ${m.left}.`, c.id);
      if (m.left <= 0 && !this._busyCrews(c).length) this._close(c, false);
    }
  }
  // ---------- interaktivní rádiové relace ----------
  // Posádka volá → dispečer „na příjmu“ → zpráva → dispečer volí odpověď. Bez odezvy posádka volání opakuje.
  _rq(crew, cs, msg, opts, kind, extra) {
    const s = this.s, q = s.radioQ || (s.radioQ = []);
    const e = Object.assign({ id: 'rq' + (s.rqSeq = (s.rqSeq || 0) + 1), t: s.t, crewId: crew.id, code: crew.code, callCodes: crew.code, name: crew.name, caseId: cs ? cs.id : null, msg, opts, kind, state: 'calling', tries: 1, nextAt: s.t + 45 }, extra || {});
    q.push(e); if (q.length > 50) q.splice(0, q.length - 50);
    this.L('crew', `ZCB101, zde ${this._csign(e.callCodes)}, příjem.`, e.caseId, crew.id);
    return e;
  }
  _csign(codes) { return /^K/.test(String(codes)) ? String(codes).replace(/^K(\d+)/, 'Kryštof $1') : `ZCB${codes}`; }
  // relace posádky → ZOS. Interaktivně čeká na dispečera; automaticky se přehraje celá i s výchozí odpovědí.
  _crewCall(crew, cs, msg, opts, kind, callCodes) {
    if (this.s.radioMode === 'interactive') return this._rq(crew, cs, msg, opts, kind, callCodes ? { callCodes } : null);
    const id = cs ? cs.id : null, sign = this._csign(callCodes || crew.code);
    this.L('crew', `ZCB101, zde ${sign}, příjem.`, id, crew.id);
    this.L('crew', 'ZCB101 na příjmu.', id, crew.id);
    this.L('crew', `${sign}: ${msg}`, id, crew.id);
    if (kind === 'vj') return null; // vstřícnou rozhoduje dispečer přetažením posádky / vyprší
    const o = (opts || []).find(x => x.def) || (opts || []).find(x => x.ok !== false) || (opts || [])[0];
    if (o) {
      if (o.say) this.L('crew', o.say, id, crew.id);
      if (o.say2) this.L('crew', o.say2, id, crew.id);
      if (o.act === 'vj-self') this.L('crew', `${sign} rozumí, jedeme sami.`, id, crew.id);
    }
    return null;
  }
  // relace ZOS → posádka (dispečer ji spouští sám; automaticky proběhne hned)
  _zosCall(crew, cs, msg, reply) {
    const s = this.s;
    if (s.radioMode === 'interactive') {
      const q = s.radioQ || (s.radioQ = []);
      q.push({ id: 'rq' + (s.rqSeq = (s.rqSeq || 0) + 1), t: s.t, crewId: crew.id, code: crew.code, callCodes: crew.code, name: crew.name, caseId: cs ? cs.id : null, msg, reply: reply || null, opts: [], kind: 'zos', state: 'zos', tries: 1, nextAt: s.t + 240 });
      return;
    }
    this._zosSay(crew, cs, msg, reply);
  }
  _zosSay(crew, cs, msg, reply) {
    const id = cs ? cs.id : null;
    this.L('crew', `ZCB${crew.code}, ZCB101.`, id, crew.id);
    this.L('crew', `ZCB${crew.code} na příjmu.`, id, crew.id);
    this.L('crew', `ZCB101: ${msg}`, id, crew.id);
    this.L('crew', `ZCB${crew.code} rozumí${reply ? ', ' + reply : ''}.`, id, crew.id);
  }
  radioZosCall(id) {
    const e = this.radioEntry(id); if (!e || e.state !== 'zos') return { ok: false };
    const crew = this.crewOf(e.crewId), cs = e.caseId ? this.caseOf(e.caseId) : null;
    e.state = 'done'; e.doneAt = this.s.t;
    if (crew) this._zosSay(crew, cs, e.msg, e.reply);
    return { ok: true };
  }
  // název posádky do rádia: „RV Třeboň“, „Kryštof 13“
  _label(k) {
    if (!k) return '';
    if (k.type === 'LZS') return `Kryštof ${String(k.code).replace(/\D/g, '')}`;
    const st = ZOS_DATA.stations.find(x => x.id === k.st);
    const town = st ? st.name.replace(/^ČB – .*/, 'České Budějovice') : k.name;
    return `${k.type === 'RV' ? 'RV' : 'RZP'} ${town}`;
  }
  // kdo z vozů u případu volá: RV, pokud je na místě (ohlásí i RZP), jinak volající posádka
  _caller(cs, base) {
    const ks = cs.crews.map(id => this.crewOf(id)).filter(k => k && k.caseId === cs.id);
    const rv = ks.find(k => k.type === 'RV' && (k.state === 'onscene' || k.caseRole === 'escort'));
    const rzp = ks.find(k => k.type === 'RZP' && (k.state === 'onscene' || k.state === 'transport') && !k.caseRole);
    if (rv && (!base || base.type !== 'LZS')) return { crew: rv, codes: rzp ? `${rv.code} a ${rzp.code}` : rv.code };
    return { crew: base, codes: base.code };
  }
  // události po příjezdu: nenalezený pacient, žádost o PČR / HZS, METHANE u více zraněných
  _sceneEvents(c, cs) {
    const t = this.s.t;
    if (cs.sceneEv) return; cs.sceneEv = true;
    if ((cs.patientCount || 1) > 1 && !cs.methane) {
      cs.methane = true;
      const heavy = Math.max(1, Math.min(cs.patientCount, this.ri(1, 2)));
      this._crewCall(c, cs, `METHANE: dopravní nehoda, ${cs.patientCount} zranění, z toho ${heavy} vážně, ${this.pick(['nebezpečí provoz', 'únik provozních kapalin', 'bez dalšího nebezpečí'])}, přístup ${this.pick(['z obce', 'od křižovatky', 'po hlavní silnici'])}, ${this.pick(['HZS a PČR na místě', 'HZS na místě, PČR na cestě', 'PČR na místě'])}, požadujeme ${heavy > 1 ? 'další RZP a LZS' : 'další RZP'}.`, [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }], 'info');
      return;
    }
    if (c.type === 'RZP' && !['silnice', 'priroda'].includes(cs.where) && this.rnd() < 0.03) {
      cs.notFoundUntil = t + this.rr(150, 300);
      this._crewCall(c, cs, this.pick(['jsme na adrese, nikdo tu není, nemůžeme najít pacienta.', 'na adrese nikdo neotvírá, pacienta nemůžeme najít.', 'nemůžeme najít místo, číslo popisné tu není.']), [{ k: 'ok', label: 'Rozumí, voláme na místo', say: 'ZCB101 rozumí, voláme na místo.', ok: true, act: 'ack', def: true }], 'info');
      this.L('sys', `${cs.num}: ZOS kontaktuje volajícího – upřesnění místa.`, cs.id);
      return;
    }
    const h = this.hour(), night = h >= 20 || h < 6;
    let kind = null, why = '';
    if (cs.ind === 'psych' && this.rnd() < 0.14) { kind = 'pcr'; why = 'agresivní pacient'; }
    else if (cs.ind === 'intox' && ['ulice', 'verejne'].includes(cs.where) && this.rnd() < (night ? 0.14 : 0.08)) { kind = 'pcr'; why = this.pick(['pro určení totožnosti', 'agresivní pacient']); }
    else if (['trauma', 'porucha'].includes(cs.ind) && ['ulice', 'verejne'].includes(cs.where) && this.rnd() < 0.04) { kind = 'pcr'; why = this.pick(['pro určení totožnosti', 'agresivní pacient']); }
    else if (['trauma', 'czs', 'porucha', 'dusnost'].includes(cs.ind) && ['byt', 'rd', 'priroda'].includes(cs.where) && this.rnd() < 0.035) { kind = 'hzs'; why = 'na transport'; }
    if (kind && !(cs.agencies && cs.agencies[kind])) this._requestAgency(c, cs, kind, why);
  }
  // ---------- součinnost PČR / HZS (dlaždice jako koroner) ----------
  sendAgency(caseId, kind, viaRadio) {
    const cs = this.caseOf(caseId); if (!cs || cs.status === 'closed') return { ok: false, msg: 'Případ už je uzavřen.' };
    const A = cs.agencies || (cs.agencies = {});
    if (kind === 'cor') {
      if (!cs.exitus) return { ok: false, msg: 'Koronera lze přiřadit jen k případu s exitem.' };
      if (cs.coroner && cs.coroner.state !== 'unavailable') return { ok: true, msg: 'Koroner se už zjišťuje / je zajištěn.' };
      cs.coroner = { state: 'pending', answerAt: this.s.t + this.rr(120, 300) };
      return { ok: true };
    }
    if (kind === 'hzs' && cs.lzsTechRequired && !cs.lzsTechRequested) this.requestLzsTechnicalAssist(cs.id);
    const a = A[kind], nm = kind === 'pcr' ? 'PČR' : 'HZS';
    if (a && (a.state === 'sent' || a.state === 'onscene')) return { ok: true, msg: nm + ' už je vyrozuměna.' };
    const eta = this.rr(kind === 'pcr' ? 300 : 360, kind === 'pcr' ? 900 : 1000);
    const wasReq = a && a.reqAt != null;
    A[kind] = Object.assign(a || {}, { state: 'sent', sentAt: this.s.t, arriveAt: this.s.t + eta });
    if (wasReq && !A[kind].scored) { A[kind].scored = true; if (this.s.t - A[kind].reqAt <= 360) this._opsScore(1, `včas vyrozuměna ${nm} u ${cs.num}`, cs.id); }
    this.L('sys', `${cs.num}: ${nm} vyrozuměna, dojezd asi ${Math.round(eta / 60)} min.`, cs.id);
    return { ok: true };
  }
  _agencyStep(cs) {
    const t = this.s.t, A = cs.agencies; if (!A) return;
    for (const kind of ['pcr', 'hzs']) {
      const a = A[kind]; if (!a) continue;
      const nm = kind === 'pcr' ? 'PČR' : 'HZS';
      if (a.state === 'sent' && t >= a.arriveAt) { a.state = 'onscene'; this.L('sys', `${cs.num}: ${nm} na místě.`, cs.id); }
      if (a.state === 'requested' && !a.penal && t - a.reqAt > 360) { a.penal = true; this._opsScore(-1, `nevyrozuměná ${nm} na žádost posádky u ${cs.num}`, cs.id); }
    }
  }
  _agencyHold(cs) { const A = cs.agencies || {}; return ['pcr', 'hzs'].some(k => A[k] && A[k].reqAt != null && (A[k].state === 'requested' || A[k].state === 'sent') && this.s.t - A[k].reqAt < 2400); }
  // posádka žádá součinnost (rádiem)
  _requestAgency(crew, cs, kind, why) {
    const A = cs.agencies || (cs.agencies = {});
    if (A[kind]) return;
    A[kind] = { state: 'requested', reqAt: this.s.t, why };
    const nm = kind === 'pcr' ? 'policii' : 'hasiče';
    this.L('req', `${cs.num}: ${crew.name} žádá ${kind === 'pcr' ? 'PČR' : 'HZS'} – ${why}`, cs.id);
    const who = this._caller(cs, crew);
    this._crewCall(who.crew, cs, `žádáme na místo ${nm}, ${why}.`, [
      { k: 'send', label: `Posíláme ${nm}`, say: `ZCB101 rozumí, posíláme ${nm}.`, ok: true, act: 'agency', agency: kind },
      { k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }], 'agency', who.codes);
  }

  setRadioMode(mode) {
    this.s.radioMode = mode === 'interactive' ? 'interactive' : 'auto';
    if (this.s.radioMode === 'auto') for (const e of this.s.radioQ || []) if (e.state === 'calling' || e.state === 'open' || e.state === 'zos') {
      if (e.state === 'zos') { const k = this.crewOf(e.crewId); e.state = 'done'; if (k) this._zosSay(k, e.caseId ? this.caseOf(e.caseId) : null, e.msg, e.reply); continue; }
      if (e.state === 'calling') { this.L('crew', 'ZCB101 na příjmu.', e.caseId, e.crewId); this.L('crew', `${this._csign(e.callCodes || e.code)}: ${e.msg}`, e.caseId, e.crewId); }
      e.state = 'open'; const def = (e.opts || []).find(x => x.def) || (e.opts || [])[0]; this.radioReply(e.id, def ? def.k : null, true);
    }
  }
  radioEntry(id) { return (this.s.radioQ || []).find(e => e.id === id); }
  radioAnswer(id) {
    const e = this.radioEntry(id); if (!e || e.state !== 'calling') return { ok: false };
    e.state = 'open'; e.openedAt = this.s.t; e.nextAt = this.s.t + 120;
    this.L('crew', 'ZCB101 na příjmu.', e.caseId, e.crewId);
    this.L('crew', `${this._csign(e.callCodes || e.code)}: ${e.msg}`, e.caseId, e.crewId);
    return { ok: true };
  }
  radioReply(id, k, auto) {
    const e = this.radioEntry(id); if (!e || (e.state !== 'open' && e.state !== 'calling')) return { ok: false };
    if (e.state === 'calling') { if (!auto) return { ok: false }; }
    const o = (e.opts || []).find(x => x.k === k) || e.opts[0];
    e.state = 'done'; e.doneAt = this.s.t; e.reply = o ? o.k : null;
    if (!o) return { ok: true };
    if (o.say) this.L('crew', o.say, e.caseId, e.crewId);
    if (o.say2) this.L('crew', o.say2, e.caseId, e.crewId);
    if (!auto && o.ok === false) this._opsScore(-1, `nevhodná odpověď na relaci ZCB${e.code}`, e.caseId);
    const cs = e.caseId ? this.caseOf(e.caseId) : null;
    if (o.act === 'vj-assign' && cs) { const r = this.assignVstricna(cs.id, o.crewId); if (!r.ok) { this.L('warn', r.msg, cs.id); if (cs.vstricna && cs.vstricna.state === 'offered') this.declineVstricna(cs.id); } }
    else if (o.act === 'vj-decline' && cs) this.declineVstricna(cs.id, auto);
    else if (o.act === 'vj-self' && cs) this.L('crew', `ZCB${e.code} rozumí, jedeme sami.`, cs.id, e.crewId);
    else if (o.act === 'assign' && cs) { const r = this.assign(cs.id, o.crewId); if (!r.ok) this.L('warn', `${cs.num}: ${r.msg || 'posádku se nepodařilo vyslat'} – vyber posádku ručně.`, cs.id); }
    else if (o.act === 'agency' && cs) this.sendAgency(cs.id, o.agency, true);
    else if (o.act === 'rv-send' && cs) {
      const best = this.suggest(cs.id, 'RV')[0] || this.suggest(cs.id, 'LZS')[0];
      const r = best ? this.assign(cs.id, best.crewId) : { ok: false };
      if (!r.ok) this.L('warn', `${cs.num}: lékaře se nepodařilo vyslat automaticky – vyber posádku ručně.`, cs.id);
    }
    return { ok: true };
  }
  _radioStep() {
    const s = this.s, t = s.t;
    for (const e of s.radioQ || []) {
      if (e.state === 'done' || e.state === 'missed') continue;
      const cs = e.caseId ? this.caseOf(e.caseId) : null;
      if (e.kind === 'vj' && (!cs || !cs.vstricna || cs.vstricna.state !== 'offered')) { e.state = 'done'; e.doneAt = t; continue; }
      if (e.state === 'zos') { if (t >= e.nextAt || (cs && cs.status === 'closed')) e.state = 'missed'; continue; }
      if (t < e.nextAt) continue;
      if (e.state === 'calling' && e.tries < 3) { e.tries++; e.nextAt = t + 45; this.L('crew', `ZCB101, zde ${this._csign(e.callCodes || e.code)}, příjem. (${e.tries}. volání)`, e.caseId, e.crewId); continue; }
      // bez odezvy: posádka si poradí sama, dispečer ztrácí provozní bod
      const wasCalling = e.state === 'calling';
      this._opsScore(-1, `${wasCalling ? 'nepřijatá' : 'nedokončená'} relace ZCB${e.code}`, e.caseId);
      const def = (e.opts || []).find(x => x.def) || (e.opts || []).find(x => x.ok !== false) || (e.opts || [])[0];
      if (wasCalling) this.L('warn', `ZCB${e.code} se nedovolala, pokračuje podle vlastního uvážení.`, e.caseId, e.crewId);
      e.state = 'open';
      this.radioReply(e.id, def ? def.k : null, true);
      e.state = 'missed';
    }
  }
  _freeRzp(area, exceptId) { return this.s.crews.filter(k => k.type === 'RZP' && k.oblast === area && this.avail(k) && !k.res && k.id !== exceptId).length; }
  _opsScore(delta, reason, caseId) {
    const agg = this.s.agg;
    agg.opsPoints = (agg.opsPoints || 0) + delta;
    agg.opsLog = agg.opsLog || [];
    agg.opsLog.push({ t: this.s.t, delta, reason, caseId: caseId || null });
    if (agg.opsLog.length > 300) agg.opsLog.shift();
    this.L(delta > 0 ? 'score' : 'warn', `${delta > 0 ? '+' : ''}${delta} b. · ${reason}`, caseId);
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
  _sunWindow() {
    const lat = 49.2 * Math.PI / 180, day = this.s.dayOfYear || 172;
    const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365);
    const cosH = Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(decl)));
    const halfDay = Math.acos(cosH) * 12 / Math.PI;
    const noon = 12.05;
    return { sunrise: noon - halfDay, sunset: noon + halfDay };
  }
  _lzsWeatherStatus() {
    if (this.s.weather && this.s.weather.condition === 'grounded') return 'neletovo';
    const h = this.hour(), sun = this._sunWindow();
    if (h < sun.sunrise || h >= sun.sunset || this.s.weather.condition === 'marginal') return 'consult';
    return 'clear';
  }
  _updateWeather() {
    const w = this.s.weather, t = this.s.t;
    if (t >= w.nextChange) {
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
      const approved = current !== 'neletovo' && this.rnd() < chance;
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
  _muDeclaredOpen() { return this.s.cases.some(c => c.mu && c.mu.phase === 'declared' && c.status !== 'closed' && c.mu.left > 0); }
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
      lat: support.lat, lon: support.lon, dayOn: false, nightOn: false, externalLzs: true,
      externalDayOnly: !!support.dayOnly, activationDay: support.activationDay || [150, 210], activationNight: support.activationNight || [360, 480],
    }));
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
  _roster(announce) {
    const s = this.s, day = s.dayFlag;
    for (const c of s.crews) {
      if (c.res) continue;
      if (c.libero) {
        const dayKey = Math.floor((s.startHour * 3600 + s.t - 7 * 3600) / 86400);
        if (c.liberoDay !== dayKey) { c.liberoDay = dayKey; c.liberoPresent = this._liberoRoll(c); }
      }
      const want = c.libero ? day && c.liberoPresent : c.externalLzs ? !!c.supportRequested && !(c.externalDayOnly && !day) : c.fixed ? true : (day ? c.dayOn : c.nightOn);
      if (want) {
        c.pendingOff = false;
        if (c.state === 'off') { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; c.mv = null; if (announce) this.L('crew', `${c.name}: přihlášena`, null, c.id); }
      } else {
        if (c.state === 'base' || c.state === 'free') {
          const p = this.pos(c); c.lat = p.lat; c.lon = p.lon; c.mv = null; c.state = 'off';
          if (c.externalLzs && c.externalDayOnly) { c.supportRequested = false; c.supportRequestedFor = null; }
          if (announce) this.L('crew', `${c.name}: odhlášena`, null, c.id);
        } else if (c.state !== 'off') c.pendingOff = true;
      }
    }
  }
  pos(c) {
    if (c.libero && c.withCrew) { const k = this.crewOf(c.withCrew); if (k) return this.pos(k); }
    const m = c.mv;
    if (!m) return { lat: c.lat, lon: c.lon };
    const f = clamp01((this.s.t - m.t0) / Math.max(1, m.t1 - m.t0));
    if (m.path && m.frac) {
      const F = m.frac; let lo = 0, hi = F.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F[mid] <= f) lo = mid; else hi = mid; }
      const span = F[hi] - F[lo], w = span > 0 ? (f - F[lo]) / span : 0;
      return { lat: m.path[lo * 2] + (m.path[hi * 2] - m.path[lo * 2]) * w, lon: m.path[lo * 2 + 1] + (m.path[hi * 2 + 1] - m.path[lo * 2 + 1]) * w };
    }
    return { lat: m.a[0] + (m.b[0] - m.a[0]) * f, lon: m.a[1] + (m.b[1] - m.a[1]) * f };
  }
  phase(c) {
    const t = this.s.t;
    if (c.libero) { const k = c.withCrew && this.crewOf(c.withCrew); return c.state === 'attached' ? `Ve voze ${k ? (k.baseName || k.name) : 'RZP'}` : c.state === 'base' ? 'Na základně' : 'Dnes není'; }
    switch (c.state) {
      case 'call': return 'Výzva';
      case 'enroute': return 'Výjezd';
      case 'onscene': return t < c.arrivedAt + 120 ? 'Na místě' : 'Zahájení ošetření';
      case 'transport': return 'Transport';
      case 'handover': return t < c.until - 600 + 120 || (c.until - c.hoStart) < 130 ? 'Příjezd k ZZ' : 'Předání pacienta';
      case 'free': return 'Volný';
      case 'base': return 'Na základně';
      case 'activating': return 'Aktivace';
      case 'second': return 'Sekundární převoz';
      default: return 'Nepřihlášena';
    }
  }
  caseOf(id) { return this.s.cases.find(c => c.id === id) || null; }
  crewOf(id) { return this.s.crews.find(c => c.id === id) || null; }
  avail(c) { return c.state === 'base' || c.state === 'free' || (c.caseRole === 'exam' && c.state === 'onscene') || (c.caseRole === 'escort' && !!c.escortFree && c.state === 'transport'); }

  _turnout(c, urgency) {
    if (c.type === 'MU') return this.rr(240, 420);
    if (c.type === 'LZS') {
      const range = this._isDay() ? (c.activationDay || ZOS_DATA.lzs.activationDay) : (c.activationNight || ZOS_DATA.lzs.activationNight);
      return this.rr(range[0], range[1]);
    }
    if (urgency === 4) return c.state === 'base' ? this.rr(55, 115) : this.rr(15, 35);
    // Standardní výjezd se vejde do dvou minut; občasné prodlevy jsou herní událost.
    const lateChance = urgency === 1 ? 0.005 : urgency === 2 ? 0.04 : 0.12;
    if (this.rnd() < lateChance) return this.rr(121, 190);
    return c.state === 'base' ? this.rr(55, 115) : this.rr(15, 35);
  }
  _lzActivationExpected(c) {
    const range = this._isDay() ? ((c && c.activationDay) || ZOS_DATA.lzs.activationDay) : ((c && c.activationNight) || ZOS_DATA.lzs.activationNight);
    return (range[0] + range[1]) / 2;
  }
  etaFor(c, lat, lon, n) {
    const p = this.pos(c), mode = 'N' + Math.min(4, Math.max(1, n || 2));
    if (c.type === 'LZS') return this._lzActivationExpected(c) + heliSec(p.lat, p.lon, lat, lon);
    if (c.type === 'MU') return 330 + driveSec(this._eta(p.lat, p.lon, lat, lon), 'N2');
    return (c.state === 'base' ? 78 : 25) + driveSec(this._eta(p.lat, p.lon, lat, lon), mode);
  }
  _eta(a, b, c, d) {
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) { const v = ROUTER.eta(a, b, c, d); if (v != null) return v; }
    return travelSec(a, b, c, d);
  }
  // pohyb posádky po silnicích (nebo vzdušnou čarou, když router není)
  _go(c, lat, lon, mult) {
    const t = this.s.t, jit = this.rr(0.9, 1.12), mode = typeof mult === 'string' ? mult : null;
    if (mode) mult = 1;
    let dur, path = null, frac = null;
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) {
      const r = ROUTER.route(c.lat, c.lon, lat, lon);
      if (r) { dur = (mode ? driveSec(r.sec, mode) : r.sec * mult) * jit; path = r.pts; frac = r.frac; }
    }
    if (dur == null) dur = (mode ? driveSec(travelSec(c.lat, c.lon, lat, lon), mode) : travelSec(c.lat, c.lon, lat, lon, mult)) * jit;
    c.mv = { a: [c.lat, c.lon], b: [lat, lon], t0: t, t1: t + dur, path, frac };
    return dur;
  }
  _goAir(c, lat, lon) {
    const t = this.s.t, dur = heliSec(c.lat, c.lon, lat, lon);
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
  requestLzsSupport(caseId, crewId) {
    const cs = this.caseOf(caseId), c = this.crewOf(crewId), own = this.crewOf('lzs');
    if (!cs || !c || !c.externalLzs) return { ok: false, msg: 'Požádat lze jen o posádku LZS z jiného kraje.' };
    if (cs.status === 'closed' || cs.status === 'intake' || cs.typ === 'sekundární') return { ok: false, msg: 'LZS lze žádat jen k otevřenému primárnímu výjezdu.' };
    if (this.avail(own)) return { ok: false, msg: 'Vlastní LZS je dostupná.' };
    if (c.externalDayOnly && !this._isDay()) return { ok: false, msg: `${c.name} je v simulaci dostupná jen v denní době.` };
    if (c.state !== 'off' || c.supportRequested) return { ok: false, msg: `${c.name} už není k dispozici.` };
    c.supportRequested = true; c.supportRequestedFor = cs.id; c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon;
    this.L('alert', `Požádáno o mezikrajskou spolupráci: ${c.name} k ${cs.num}.`, cs.id, c.id);
    return { ok: true };
  }
  assign(caseId, crewId, role) {
    const s = this.s, t = s.t;
    const cs = this.caseOf(caseId), c = this.crewOf(crewId);
    if (!cs || !c) return { ok: false, msg: 'Neznámý případ nebo posádka.' };
    if (cs.status === 'closed' || cs.status === 'intake') return { ok: false, msg: 'Případ nelze obsadit.' };
    if (!this.avail(c)) return { ok: false, msg: 'Posádka není volná.' };
    if (c.caseId === cs.id) return { ok: false, msg: 'Posádka už u případu je.' };
    if (cs.exitus && !(cs.exam && cs.exam.needed && !cs.exam.done && c.type === 'RV')) return { ok: false, msg: cs.exam && cs.exam.needed && !cs.exam.done ? 'Na prohlídku zemřelého vyšli RV.' : 'Na místě exitus, další posádka není potřeba.' };
    if (c.externalLzs && (!c.supportRequested || c.supportRequestedFor !== cs.id)) return { ok: false, msg: 'Nejprve požádej o mezikrajskou spolupráci pro tento případ.' };
    if (c.externalLzs && this.avail(this.crewOf('lzs'))) return { ok: false, msg: 'Vlastní LZS je dostupná.' };
    if (c.type === 'LZS' && cs.lzsActive) return { ok: false, msg: 'K případu už byla vyslána LZS.' };
    if (c.type === 'LZS') {
      const weather = this._lzsWeatherStatus();
      if (weather === 'neletovo') return { ok: false, msg: 'LZS nelze vyslat: neletové počasí.' };
      if (weather === 'consult' && !(cs.lzsPilotApproved && cs.lzsConsult && cs.lzsConsult.status === 'approved' && cs.lzsConsult.weatherStatus === weather)) return { ok: false, msg: 'LZS je na konzultaci. Vyžádej rozhodnutí pilota.' };
    }
    if (c.type !== 'MU' && cs.n === 3 && this._muDeclaredOpen()) return { ok: false, msg: 'Během vyhlášené MU se výjezdy N3 odkládají.' };
    if (cs.typ === 'sekundární' && c.type !== 'RZP') return { ok: false, msg: 'Tento sekundární převoz je připraven pro posádku RZP.' };
    if (role === 'heli-transfer' && (c.type !== 'RZP' || !cs.lzsPatientToHospital || cs.exitus || cs.coronerRequested)) return { ok: false, msg: 'Převozní RZP lze vyslat až při letu LZS s pacientem na cílový heliport.' };
    if (role === 'heli-transfer' && cs.lzsTransferCrewId) return { ok: false, msg: 'Převoz z heliportu už má přidělenou posádku.' };
    if (cs.lzsPatientToHospital && c.type === 'RZP' && role !== 'heli-transfer') return { ok: false, msg: 'Pacient už letí na cílový heliport; lze vyslat jen převozní RZP.' };
    if (c.type === 'MU' && !cs.mu) return { ok: false, msg: 'MU jen na mimořádnou událost.' };
    if (!role && c.type === 'RZP' && cs.vstricna && cs.vstricna.state === 'offered' && c.oblast === cs.vstricna.area) return this.assignVstricna(caseId, crewId);
    if (c.caseId && (c.caseRole === 'exam' || c.caseRole === 'escort')) this._detachSoft(c);
    const target = role === 'heli-transfer' ? ZOS_DATA.lzs.heliport : { lat: cs.lat, lon: cs.lon };
    const eta = this.etaFor(c, target.lat, target.lon, cs.n);
    const doc = c.type === 'RV' || c.type === 'LZS' || !!c.rlp;
    // efektivita volby (první pozemní posádka)
    if (c.type === 'RZP' && role !== 'heli-transfer' && cs.effRatio == null) {
      let best = eta, bestK = c;
      for (const k of s.crews) if (k.type === 'RZP' && this.avail(k)) { const e = this.etaFor(k, cs.lat, cs.lon, cs.n); if (e < best) { best = e; bestK = k; } }
      // vzdálenější posádka je v pořádku, pokud by nejbližší nechala svou oblast bez volné RZP
      const justified = bestK.id !== c.id && this._freeRzp(bestK.oblast, bestK.id) === 0 && this._freeRzp(c.oblast, c.id) >= 1;
      cs.pick = { best, chosen: eta, justified };
      cs.effRatio = justified ? 1 : best / eta;
    }
    if (c.type === 'RZP' && role !== 'heli-transfer' && c.zzum && cs.n === 2 && !cs.dyn && cs.zzumInd && !cs.docAssigned && !cs.zzumOk) {
      cs.zzumOk = true; cs.rvNeed = false;
      cs.rvLater = this.rnd() < cs.rvP;
    }
    if (!cs.exitus) {
      if (cs.prealertCrewIds && cs.prealertCrewIds.includes(c.id) && !cs.prealertBonus) { cs.prealertBonus = true; this._opsScore(1, `předpoplach využit u ${cs.num}`, cs.id); }
      const hasRzp = cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === 'RZP' && k.caseId === cs.id; });
      if (c.type === 'RV' && cs.n <= 2 && cs.rvNeed && !cs.rvFirstBonus && !hasRzp && !cs.arrived) { cs.rvFirstBonus = true; this._opsScore(1, `RV vysláno jako první k ${cs.num}`, cs.id); }
      if (c.type === 'LZS' && cs.rvNeed && !cs.docAssigned && !cs.lzsDocBonus && !this.suggest(cs.id, 'RV').some(x => x.eta < 900)) { cs.lzsDocBonus = true; this._opsScore(1, `LZS místo nedostupného RV u ${cs.num}`, cs.id); }
    }
    const p = this.pos(c);
    c.lat = p.lat; c.lon = p.lon; c.mv = null; c.consulted = false; c.escortFree = false;
    c.turn = this._turnout(c, cs.n);
    c.dispatchAt = t; c.turnoutAlerted = false;
    c.state = 'call'; c.until = t + c.turn; c.caseId = cs.id; c.arrivedAt = null; c.dest = null; c.hospitalRun = null;
    c.caseRole = role || null;
    cs.crews.push(c.id);
    cs.asg.push({ crewId: c.id, t, eta, role: c.caseRole });
    if (role !== 'heli-transfer' && cs.initialDispatchRequired && cs.initialDispatchRequired.includes(c.type) && !cs.initialDispatchSent.includes(c.type)) cs.initialDispatchSent.push(c.type);
    if (c.rlp) this._markDoctor(cs, c);
    if (cs.firstAssign == null) cs.firstAssign = t;
    if (doc) {
      cs.docAssigned = true;
      if (cs.docAssignT == null) cs.docAssignT = t;
      if (cs.rvReq) { cs.rvReq.cancelled = false; cs.rvReq.cancelledAt = null; if (cs.rvReq.satT == null) cs.rvReq.satT = t; }
    }
    if (c.type === 'MU' && cs.firstMUAssign == null) cs.firstMUAssign = t;
    if (c.type === 'LZS') {
      cs.lzsActive = true; cs.lzsTransferRequired = false; cs.lzsPatientToHospital = false; cs.lzsLandedAt = null; cs.lzsReadyAt = null;
      cs.lzsTransferCrewArrived = null; cs.lzsTransferred = false; cs.lzsWaitLogged = false;
      if (cs.burnCenterCandidate) { cs.lzsTargetHospitalId = 'h-fnkv'; cs.hospType = 'popaleniny'; }
      c.lzsLeg = 'to-scene';
    }
    if (role === 'heli-transfer') cs.lzsTransferCrewId = c.id;
    cs.status = 'active';
    this.L('crew', `${c.name} (${c.code}): výzva k případu ${cs.num}`, cs.id, c.id);
    return { ok: true, eta };
  }
  // přesměrování posádky na cestě
  reassign(crewId, caseId) {
    const s = this.s, c = this.crewOf(crewId), nw = this.caseOf(caseId);
    if (!c || !nw) return { ok: false, msg: 'Neznámý případ nebo posádka.' };
    if (c.state !== 'call' && c.state !== 'enroute') return { ok: false, msg: 'Posádka nejede k případu.' };
    const old = this.caseOf(c.caseId);
    if (old && old.id === nw.id) return { ok: false, msg: 'Už jede k tomuto případu.' };
    let pen = 0;
    if (old && nw.n >= old.n) pen = (old.n <= 2) ? 10 : 8;
    if (old) {
      old.crews = old.crews.filter(x => x !== c.id);
      if (c.caseRole !== 'heli-transfer' && old.initialDispatchRequired && !old.crews.some(id => { const k = this.crewOf(id); return k && k.type === c.type && k.caseRole !== 'heli-transfer'; })) old.initialDispatchSent = old.initialDispatchSent.filter(x => x !== c.type);
      old.pen += pen; s.agg.diversions++;
      const a = old.asg.find(x => x.crewId === c.id && !x.diverted); if (a) a.diverted = true;
      if (!this._busyCrews(old).length) { old.status = old.arrived ? 'active' : 'waiting'; old.waitSince = s.t; old.escAt = s.t + 1500; if (old.firstAssign != null && !old.arrived) { old.firstAssign = null; } }
      this.L('warn', `${c.name}: přesměrována z ${old.num} na ${nw.num}`, old.id, c.id);
    }
    const p = this.pos(c);
    c.lat = p.lat; c.lon = p.lon; c.mv = null; c.state = 'free'; c.caseId = null;
    return this.assign(caseId, crewId);
  }
  cancelAssignment(caseId, crewId) {
    const c = this.crewOf(crewId), cs = this.caseOf(caseId);
    if (!c || !cs || c.caseId !== cs.id) return { ok: false, msg: 'Posádka k případu nepřísluší.' };
    if (this.avail(c) && (c.caseRole === 'exam' || c.caseRole === 'escort')) { this._detachSoft(c); return { ok: true }; }
    if (cs.recallDue && !cs.recallDue.done && cs.recallDue.ids.includes(c.id) && (c.state === 'call' || c.state === 'enroute')) {
      cs.recallDue.ids = cs.recallDue.ids.filter(x => x !== c.id);
      this._opsScore(1, `včas odvolaná posádka po hlášení exitu u ${cs.num}`, cs.id);
    }
    const cancellableLzs = c.type === 'LZS' && (c.state === 'onscene' || (c.state === 'transport' && c.lzsLeg === 'to-scene'));
    if (c.state !== 'call' && c.state !== 'enroute' && !cancellableLzs) return { ok: false, msg: 'Odvolat lze jen posádku ve výzvě nebo na cestě k místu; LZS lze odvolat i z místa před odletem s pacientem.' };
    const p = this.pos(c), role = c.caseRole, wasMoving = c.state === 'enroute';
    if (role === 'vstricna-support' && cs.vstricna) {
      const primary = this.crewOf(cs.vstricna.primaryCrewId), plan = cs.vstricna;
      plan.state = 'cancelled';
      if (primary && primary.caseRole === 'vstricna-primary' && primary.caseId === cs.id) {
        const pp = this.pos(primary); primary.lat = pp.lat; primary.lon = pp.lon; primary.mv = null; primary.caseRole = null;
        primary.dest = { hid: plan.hospitalId, name: plan.hospitalName, type: cs.hospType };
        const dur = this._go(primary, plan.hospitalLat, plan.hospitalLon, 'P3'); primary.state = 'transport'; primary.until = this.s.t + dur;
        this.L('crew', `${primary.name}: vstřícná jízda odvolána, pokračuje do nemocnice.`, cs.id, primary.id);
      }
    }
    cs.crews = cs.crews.filter(id => id !== c.id);
    if (role !== 'heli-transfer' && cs.initialDispatchRequired && !cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === c.type && k.caseRole !== 'heli-transfer'; })) cs.initialDispatchSent = cs.initialDispatchSent.filter(x => x !== c.type);
    const a = cs.asg.find(x => x.crewId === c.id && !x.cancelled && !x.diverted); if (a) a.cancelled = true;
    if (role === 'heli-transfer') cs.lzsTransferCrewId = null;
    if (c.type === 'LZS') {
      cs.lzsActive = false; cs.lzsState = 'odvolána'; cs.lzsTransferRequired = false;
      cs.lzsPatientToHospital = false; cs.lzsLandedAt = null; cs.lzsReadyAt = null;
      cs.lzsTransferCrewId = null; cs.lzsTransferred = false; cs.lzsHeliportAlerted = false;
    }
    if (c.externalLzs) { c.supportRequested = false; c.supportRequestedFor = null; }
    if ((c.type === 'RV' || c.type === 'LZS' || c.rlp) && !cs.crews.some(id => { const k = this.crewOf(id); return k && (k.type === 'RV' || k.type === 'LZS' || k.rlp); })) {
      cs.docAssigned = false; cs.docAssignT = null;
      if (cs.rvReq) {
        cs.rvReq.satT = null;
        if (c.type === 'RV' && !cs.rvNeed) {
          cs.rvReq.cancelled = true; cs.rvReq.cancelledAt = this.s.t;
          this.L('req', `${cs.num}: požadavek na RV byl odvolán`, cs.id);
        }
      }
    }
    c.lat = p.lat; c.lon = p.lon; c.mv = null; c.caseId = null; c.caseRole = null; c.arrivedAt = null; c.dest = null;
    if (c.type === 'LZS') {
      const dur = this._goAir(c, c.home.lat, c.home.lon); c.state = 'free'; c.until = this.s.t + dur; c.lzsLeg = 'returning';
    } else if (c.state === 'call') { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; c.until = this.s.t; }
    else { const dur = this._go(c, c.home.lat, c.home.lon, 'RET'); c.state = 'free'; c.until = this.s.t + dur; }
    this.L('warn', `${c.name}: odvolána od případu ${cs.num}`, cs.id, c.id);
    if (c.type !== 'LZS' && wasMoving) this._zosSay(c, cs, cs.exitus ? 'vraťte se na základnu, výjezd zrušen.' : this.pick(['vraťte se na základnu, výjezd zrušen.', 'vraťte se na základnu, volající zrušil výjezd.']));
    this._checkClose(cs);
    return { ok: true };
  }
  _busyCrews(cs) { return this.s.crews.filter(x => x.caseId === cs.id && BUSY.includes(x.state)); }

  // ---------- generování případů ----------
  _gap() {
    const s = this.s;
    // Pro běžnou dvanáctihodinovou směnu cílí profil přibližně na 130 událostí.
    const lam = 11.4 * TOD[Math.floor(this.hour()) % 24] * s.diff * s.rateMul;
    return -Math.log(1 - this.rnd()) / lam * 3600;
  }
  _P() { return typeof ZOS_PEOPLE !== 'undefined' ? ZOS_PEOPLE : null; }
  _rndFn() { return () => this.rnd(); }
  // fiktivní osoba ve tvaru „Jméno Příjmení“ (s pohlavím a věkem, pokud jsou známé)
  _name(sex, age) {
    const P = this._P();
    if (!P) return this.pick(FIRST) + ' ' + this.pick(LAST);
    return P.person(this._rndFn(), sex || (this.rnd() < 0.5 ? 'M' : 'Ž'), age).full;
  }
  _phone() { const P = this._P(); return P ? P.phone(this._rndFn()) : `0999${this.ri(100000, 999999)}`; }
  // věk tak, jak ho zapisuje calltaker: většinou ročník, někdy „NN let“
  _ageText(age) { const y = (this._P() ? this._P().YEAR : 2026) - age; return this.rnd() < 0.8 ? String(y) : `${age} let`; }
  // výběr místa podle věku, indikace a denní doby
  _pickWhere(ind, age) {
    const h = this.hour(), work = h >= 6 && h < 18, school = h >= 7.5 && h < 15.5;
    const w = k => {
      switch (k) {
        case 'domov': return age >= 80 ? 2.2 : age >= 70 ? 1 : age >= 60 ? 0.15 : 0;
        case 'skola': return age >= 6 && age <= 18 ? (school ? 1.6 : 0.05) : age >= 25 && age <= 62 && school ? 0.08 : 0;
        case 'prov': return age >= 18 && age <= 67 ? (work ? 1 : 0.2) : age >= 15 && age < 18 ? 0.1 : 0;
        case 'ordinace': return work ? (age < 18 ? 0.5 : 0.7) : 0.05;
        case 'priroda': return age < 4 ? 0.1 : 0.7;
        case 'silnice': return 1;
        case 'ulice': return age < 3 ? 0.4 : 1;
        case 'rd': return 1.3;
        case 'byt': return 1.1;
        default: return 1;
      }
    };
    const opts = ind.where.filter(k => w(k) > 0);
    return opts.length ? this.wpick(opts, w) : this.pick(ind.where);
  }
  // úklid příznaků: bez duplicit, z protichůdných ponechat závažnější
  _cleanSymptoms(list) {
    const key = x => x.replace(/^[^0-9A-Za-zÁ-žÀ-ÿ]+/, '').trim().toLocaleLowerCase('cs-CZ');
    const seen = new Set(), out = [];
    for (const x of list) { const k = key(x); if (!k || seen.has(k)) continue; seen.add(k); out.push(x); }
    const groups = [
      ['nemůže mluvit', 'schopen říci pouze slovo', 'schopen říci pouze větu', 'schopen udržet konverzaci'],
      ['nedýchá', 'dýchá'],
      ['avpu-u', 'avpu-p', 'avpu-v', 'avpu-a'],
      ['bezvědomí', 'reaguje na bolest', 'reaguje na oslovení', 'při vědomí'],
    ];
    let res = out;
    for (const g of groups) {
      const present = res.map(x => g.indexOf(key(x))).filter(i => i >= 0);
      if (present.length < 2) continue;
      const keep = Math.min(...present);
      res = res.filter(x => { const i = g.indexOf(key(x)); return i < 0 || i === keep; });
    }
    return res;
  }
  _person(age, sex) {
    if (age < 18) return sex === 'M' ? 'Chlapec' : 'Dívka';
    return sex === 'M' ? 'Muž' : 'Žena';
  }
  _symptomSet(profileKey, n, predicate) {
    const profiles = ZOS_SYMPTOMS.symptomProfiles[profileKey];
    if (!profiles) throw new Error(`Chybí databáze příznaků pro ${profileKey}`);
    const choices = profiles['N' + n] || Object.values(profiles).flat();
    if (!choices.length) throw new Error(`Chybí profily příznaků pro ${profileKey} / N${n}`);
    const filtered = predicate ? choices.filter(x => predicate(x[0].map(i => ZOS_SYMPTOMS.symptomCatalog[i]))) : choices;
    const selected = this.wpick(filtered.length ? filtered : choices, x => x[1]);
    return selected[0].map(i => ZOS_SYMPTOMS.symptomCatalog[i]);
  }
  // příznak typický pro indikaci (z profilů N2), který případ ještě nemá
  _typicalSymptom(c) {
    const ind = ZOS_DATA.indications.find(i => i.id === c.ind);
    if (!ind) return null;
    const have = new Set((c.symptoms || []).map(x => x.toLocaleLowerCase('cs-CZ')));
    for (let i = 0; i < 6; i++) {
      let set; try { set = this._symptomSet(ind.symptomKey || ind.klasif, 2); } catch (e) { return null; }
      const pool = set.filter(x => !have.has(x.toLocaleLowerCase('cs-CZ')) && !/DYNAMICKÁ|DOSPĚLÝ|DÍTĚ|ZZUM|PEDIATR|NEDÝCHÁ|BEZVĚDOMÍ|AVPU-U|KPR|^[#(]/i.test(x));
      if (pool.length) return this.pick(pool);
    }
    return null;
  }
  // posádka zastaví na silnici u místa události (každá kousek vedle, ne přímo v symbolu události)
  _park(c, cs) {
    const m = c.mv; if (!m || !m.path || !m.frac || m.path.length < 6) return;
    const P = m.path, n = P.length / 2, idx = Math.max(0, cs.crews.indexOf(c.id));
    const want = 0.014 + idx * 0.022; // km zpět po trase od napojení na silnici
    let i = n - 2, acc = 0, lat = P[i * 2], lon = P[i * 2 + 1];
    if (hav(lat, lon, P[(n - 1) * 2], P[(n - 1) * 2 + 1]) > 0.25) return; // místo daleko od silnice – vůz dojede až k bodu
    while (i > 0) {
      const d = hav(P[(i - 1) * 2], P[(i - 1) * 2 + 1], P[i * 2], P[i * 2 + 1]);
      if (acc + d >= want) { const w = d > 0 ? (want - acc) / d : 0; lat = P[i * 2] + (P[(i - 1) * 2] - P[i * 2]) * w; lon = P[i * 2 + 1] + (P[(i - 1) * 2 + 1] - P[i * 2 + 1]) * w; break; }
      acc += d; i--; lat = P[i * 2]; lon = P[i * 2 + 1];
    }
    if (i <= 0) return;
    m.path = P.slice(0, i * 2).concat([lat, lon]); m.frac = m.frac.slice(0, i).concat([1]);
    m.b = [lat, lon]; c.parked = true;
  }
  _isApneicUnresponsive(symptoms) {
    const text = symptoms.join(' ').toLocaleUpperCase('cs-CZ');
    // ohledání zemřelého (např. „koroner nedostupný, TANR nelze“) není resuscitace – calltaker ho vede jako N3
    if (text.includes('OHLEDÁNÍ') || text.includes('TANR NELZE')) return false;
    return text.includes('NEDÝCHÁ') && (text.includes('BEZVĚDOMÍ') || text.includes('AVPU-U'));
  }
  // paměť posledních míst: blízko po sobě (do ~700 m) a stejné místo se neopakuje
  _tooClose(lat, lon, name) {
    const mem = this.s.ev.recentSpots || (this.s.ev.recentSpots = []);
    for (const m of mem) { if ((name && m[2] === name) || (Math.abs(m[0] - lat) < 0.0063 && Math.abs(m[1] - lon) < 0.0095)) return true; }
    return false;
  }
  _remember(lat, lon, name) {
    const mem = this.s.ev.recentSpots || (this.s.ev.recentSpots = []);
    mem.push([lat, lon, name || '']); if (mem.length > 25) mem.shift();
  }
  _randomAddress(A) {
    const a = A.a, S = A.s, count = Math.floor(a.length / 8);
    if (!count) return null;
    for (let tries = 0; tries < 12; tries++) {
      const r = this._randomAddress1(A, count);
      if (r && !this._tooClose(r.lat, r.lon)) return r;
      if (tries === 11) return r;
    }
    return null;
  }
  _randomAddress1(A, count) {
    const a = A.a, S = A.s;
    const history = this.s.ev.addressHistory || (this.s.ev.addressHistory = []);
    const used = new Set(history);
    const start = Math.floor(this.rnd() * count);
    let i = -1, address = '';
    for (let offset = 0; offset < count; offset++) {
      const candidate = ((start + offset) % count) * 8;
      const street = S[a[candidate + 2]], city = S[a[candidate + 3]], num = S[a[candidate + 4]];
      const label = street && street !== city ? `${street} ${num}, ${city}` : `${city} čp. ${num}`;
      if (!used.has(label)) { i = candidate; address = label; break; }
    }
    if (i < 0) { history.length = 0; return this._randomAddress(A); }
    history.push(address);
    if (history.length > 1000) history.splice(0, history.length - 1000);
    return { lat: a[i] / 1e5, lon: a[i + 1] / 1e5, city: S[a[i + 3]], cast: S[a[i + 5]] || '', okres: A.okresy[a[i + 6]], address };
  }
  // krátký dispečerský popis místa; často prázdný, skládá se z více částí, poslední se neopakují
  _placeText(key) {
    const P = ZOS_DATA.place && ZOS_DATA.place[key];
    if (!P) return '';
    const hist = this.s.ev.placeHist || (this.s.ev.placeHist = []);
    let out = '';
    for (let tries = 0; tries < 6; tries++) {
      if (this.rnd() < P.none) { out = ''; break; }
      const parts = [];
      if (key === 'byt') {
        if (this.rnd() < 0.3) parts.push(this.pick(P.a));
        const r = this.rnd();
        parts.push(r < 0.18 ? 'přízemí' : `${r < 0.75 ? this.ri(1, 4) : this.ri(5, 9)}. patro`);
      } else parts.push(this.pick(P.a));
      if (P.b && this.rnd() < (P.bp || 0.3)) parts.push(this.pick(P.b));
      out = parts.join(', ');
      if (!hist.includes(out)) break;
    }
    if (out) { hist.push(out); if (hist.length > 14) hist.shift(); }
    return out;
  }
  _zosNote(ind, up, whKey) {
    const text = up.toLocaleUpperCase('cs-CZ');
    if (ind.id === 'dn_poly') {
      const details = [];
      if (text.includes('UVĚZNĚNÝ')) details.push('osoba zůstává ve vozidle, nutné vyproštění');
      else if (text.includes('VÍCE ZRANĚNÝCH')) details.push('na místě více zraněných, počet se upřesňuje');
      if (text.includes('HZS')) details.push('na místě součinnost HZS');
      else if (text.includes('UVĚZNĚNÝ') || this.rnd() < 0.18) details.push('na místo jede HZS');
      if (text.includes('PČR')) details.push('na místě součinnost PČR');
      else if (this.rnd() < 0.38) details.push('na místo jede PČR');
      return details.join('; ');
    }
    if (ind.id === 'asist') {
      if (this.rnd() < 0.62) return '';
      if (text.includes('ECALL')) return 'Poloha vozidla předána z eCall.';
      if (text.includes('POŽÁR')) return 'Součinnost s HZS.';
      return 'Přístup do objektu bude zajišťovat HZS.';
    }
    // Poznámka je doplňkový volný text, ne druhý seznam příznaků. Většina
    // případů ji nemá; záznamy jsou krátké a popisují hlavně přístup či okolnosti.
    if (this.rnd() < 0.58) return '';
    const notes = {
      byt: ['vstup do domu z dvorní strany', 'přístup přes uzamčený vchod', 'zvonek bez odezvy'],
      rd: ['příjezd po nezpevněné cestě', 'vjezd do dvora z boční ulice', 'příjezdová cesta za domem'],
      domov: ['kontakt na místě zajištěn personálem', 'pacient v pokoji, vstup přes recepci'],
      prov: ['vstup do objektu z ulice', 'pacient v zadní části provozovny', 'příjezd přes areál'],
      skola: ['kontakt na místě zajištěn zaměstnancem školy', 'pacient v budově školy'],
      ulice: ['místo události u komunikace', 'přístup z přilehlého chodníku'],
      silnice: ['provoz v místě omezen', 'přístup k vozidlu zajištěn', 'místo události v jízdním pruhu'],
      priroda: ['přístup pěšky od nejbližší komunikace', 'místo mimo zástavbu, upřesněn příjezdový bod'],
      ordinace: ['pacient čeká v ordinaci', 'předání informací zajištěno zdravotníkem'],
      zz: ['pacient v prostorách zdravotnického zařízení', 'předání informací zajištěno personálem'],
    };
    const pool = notes[whKey] || [];
    return pool.length ? this.pick(pool) : '';
  }
  _spawn() {
    const s = this.s, D = ZOS_DATA, t = s.t;
    const ind = this.wpick(D.indications, x => x.w);
    const nKeys = Object.keys(ind.n).map(Number);
    let n = Number(this.wpick(nKeys, k => ind.n[k]));
    let dyn = n === 2 && !!ind.dyn && this.rnd() < ind.dyn;
    const sex = ind.sex || (this.rnd() < 0.5 ? 'M' : 'Ž');
    const hospType = Array.isArray(ind.hosp) ? this.wpick(ind.hosp, x => x[1])[0] : ind.hosp;
    const symptomKey = ind.symptomKey || ind.klasif;
    let symptoms = this._symptomSet(symptomKey, n);
    if (this._isApneicUnresponsive(symptoms)) {
      n = 1;
      dyn = false;
      const n1Symptoms = this._symptomSet(symptomKey, 1, terms =>
        this._isApneicUnresponsive(terms) && !terms.some(x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE')));
      if (this._isApneicUnresponsive(n1Symptoms) && !n1Symptoms.some(x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'))) symptoms = n1Symptoms;
      else symptoms = symptoms.filter(x => !x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'));
    }
    symptoms = this._cleanSymptoms(symptoms);
    {
      const isDyn = x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE');
      const hasDyn = symptoms.some(isDyn);
      if (n === 2 && hasDyn) dyn = true;
      else if (n === 2 && dyn) symptoms = symptoms.concat(['DYNAMICKÁ INDIKACE']);
      else { dyn = false; symptoms = symptoms.filter(x => !isDyn(x)); }
    }
    const rvNeed = n === 1 || (n === 2 && !dyn);
    const rvLater = !rvNeed && this.rnd() < (ind.rvP || 0);
    const rvReqKind = rvLater ? (this.rnd() < 0.5 ? 'zhoršení stavu' : 'posouzení stavu') : null;
    const up = symptoms.join(', '), symptomText = up.toLocaleUpperCase('cs-CZ');
    const isChild = symptomText.includes('DÍTĚ');
    const minAge = isChild ? 0 : symptomText.includes('DOSPĚLÝ') ? Math.max(18, ind.age[0]) : ind.age[0];
    const maxAge = isChild ? 17 : ind.age[1];
    const age = minAge <= maxAge ? this.ri(minAge, maxAge) : this.ri(ind.age[0], ind.age[1]);
    const whKey = this._pickWhere(ind, age);
    // veřejná místa pod „ulicí“: nádraží, úřady, obchody, sport, ubytování (reálná místa z OSM)
    let poiKey = whKey;
    if (whKey === 'ulice' && typeof ZOS_POI !== 'undefined' && ZOS_POI && ZOS_POI.poi) {
      const h = this.hour();
      const wk = { verejne: 1.4, sport: age >= 6 && age <= 60 ? (h >= 15 && h < 21 ? 0.6 : 0.2) : 0.05, ubytovani: age >= 15 ? (h >= 18 || h < 8 ? 0.3 : 0.12) : 0.03 };
      const tot = Object.values(wk).reduce((x, y) => x + y, 0), r = this.rnd() * (tot + 1.6);
      let acc = 0; for (const [k, v] of Object.entries(wk)) { acc += v; if (r < acc && ZOS_POI.poi[k] && ZOS_POI.poi[k].length) { poiKey = k; break; } }
    }
    const wd = D.where[poiKey] || D.where[whKey];
    let lat, lon, addr, townN, okres = null, cast = '';
    const A = typeof ZOS_ADDR !== 'undefined' && ZOS_ADDR && ZOS_ADDR.a ? ZOS_ADDR : null;
    const nearTown = (la, lo) => { let b = null, bd = 1e9; for (const tw of D.towns) { const d = hav(la, lo, tw.lat, tw.lon) / Math.sqrt(tw.w); if (d < bd) { bd = d; b = tw; } } return b; };
    if ((whKey === 'silnice' || whKey === 'priroda') && typeof ROUTER !== 'undefined' && ROUTER.ready) {
      const p = ROUTER.randomRoadPoint(() => this.rnd(), whKey === 'silnice' ? [0, 1, 2, 3, 4] : [4, 5, 6]);
      lat = p.lat + this.rr(-0.0004, 0.0004); lon = p.lon + this.rr(-0.0004, 0.0004);
      const tw = nearTown(lat, lon); townN = tw.n;
      const nm = { 0: 'dálnice D3', 1: 'silnice I. třídy', 2: 'silnice I. třídy', 3: 'silnice II. třídy', 4: 'silnice III. třídy', 5: 'místní komunikace', 6: 'polní / lesní cesta' }[p.cls];
      addr = `${nm}, okolí obce ${tw.n}`;
    } else if (typeof ZOS_POI !== 'undefined' && ZOS_POI && ZOS_POI.poi && ZOS_POI.poi[poiKey] && ZOS_POI.poi[poiKey].length && this.rnd() < 0.9) {
      // reálné místo z OSM (domov pro seniory, škola, ordinace, provozovna, veřejné místo, sport, ubytování)
      const list = ZOS_POI.poi[poiKey];
      let p = this.pick(list);
      for (let tries = 0; tries < 14 && this._tooClose(p[0] / 1e5, p[1] / 1e5, p[2]); tries++) p = this.pick(list);
      lat = p[0] / 1e5 + this.rr(-0.00015, 0.00015); lon = p[1] / 1e5 + this.rr(-0.00015, 0.00015);
      townN = p[4]; okres = ZOS_POI.okresy[p[5]] || null; cast = '';
      addr = p[2] ? `${p[3]} (${p[2].replace(/\u00a0/g, ' ')})` : p[3];
    } else if (A) {
      const picked = this._randomAddress(A);
      lat = picked.lat; lon = picked.lon; townN = picked.city; okres = picked.okres; cast = picked.cast; addr = picked.address;
    } else {
      const town = this.wpick(D.towns, x => x.w);
      const km = (town.w > 20 ? this.rr(0, 3.5) : this.rr(0, 1.8)) * Math.sqrt(this.rnd()), ang = this.rnd() * Math.PI * 2;
      lat = town.lat + Math.sin(ang) * km / 111; lon = town.lon + Math.cos(ang) * km / 72.8;
      addr = `${this.pick(D.streets)} ${this.ri(1, 80)}, ${town.n}`; townN = town.n;
    }
    this._remember(lat, lon, '');
    const town = { n: townN };
    const isRoadAccident = ind.id === 'dn_poly' || ind.id === 'dn_lehke';
    const patientCount = !isRoadAccident ? 1 : symptomText.includes('VÍCE ZRANĚNÝCH') ? this.ri(2, 4) : this.rnd() < 0.025 ? this.ri(2, 3) : 1;
    const intake = n === 1 ? this.ri(70, 150) : this.ri(90, 200); // podle říjnového vzorku (medián volání→výzva 141 s u N1)
    const poznamka = this._zosNote(ind, up, whKey);
    const extKinds = EXTMSG.kindFor(ind.id, poiKey, () => this.rnd());
    const radioReports = extKinds ? this._extReports(extKinds, { t, intake, patientCount, up, addr, town: townN, okres, where: whKey, sex, lat, lon }) : [];
    const placeDescription = this._placeText(D.place && D.place[poiKey] ? poiKey : whKey);
    const placeText = this.rnd() < 0.2 ? placeDescription.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : placeDescription;
    const op = 'OP-' + this.pick(['A', 'B', 'C', 'D']);
    const P = this._P();
    let patientName = '', oznName, oznRel = '', phone, noteFull = poznamka;
    if (P) {
      const pat = P.person(this._rndFn(), sex, age);
      patientName = pat.reverse;
      const unconscious = /AVPU-U|bezvědomí|nedýchá/i.test(up);
      const cl = P.caller(this._rndFn(), { patient: pat, age, sex, whKey, unconscious, roadAccident: isRoadAccident, child: age < 15 });
      oznName = cl.person.full; oznRel = cl.label; phone = cl.phone;
      noteFull = [cl.label, poznamka].filter(Boolean).join(', ');
    } else { oznName = this._name(); phone = this._phone(); }
    const c = this._newCase({
      ind: ind.id, klasif: ind.klasif, typ: 'primární', up, symptoms, charakter: D.charaktery[wd.ch], where: whKey, place: placeText.toLocaleLowerCase('cs-CZ'), n, dyn, rvNeed, rvLater, rvReqKind,
      initialDispatchRequired: n === 1 || (n === 2 && !dyn) ? ['RZP', 'RV'] : ['RZP'], initialDispatchSent: [],
      rvP: ind.rvP || 0, zzumInd: !!ind.zzum, addr, town: town.n, okres, cast, lat, lon, age, sex, child: age < 18, burnCenterCandidate: ind.id === 'popal' && symptomText.includes('ROZSÁHLÉ'),
      desc: patientCount > 1 ? `${patientCount} zranění při dopravní nehodě; hlavní pacient: ${this._person(age, sex)}, ${age} let.` : `${this._person(age, sex)}, ${age} let. ${ind.klasif}.`,
      hospType, trans: this.rnd() < ind.trans, scene: ind.scene, pocet: patientCount, patientCount, patientsRemaining: patientCount, patientsHandled: 0, radioReports,
      poznamka: noteFull, ozn: oznName, oznRel, patientName, ageText: this._ageText(age),
      phone,
      src: extKinds && this.rnd() < 0.6 ? EXTMSG.SRC_CALL[extKinds[0]] : this.pick(['Linka 155', 'Linka 155', 'Linka 155', 'Linka 112', '112 – přeposláno']), op,
      intake,
    });
    if (ind.id === 'resus' || ind.id === 'nzo' || this._isApneicUnresponsive(symptoms)) {
      // výsledek KPR: odhad podle věku (ostrá data o výsledku s věkem nejsou k dispozici)
      const old = age >= 80, mid = age >= 65;
      if (this.rnd() < (old ? 0.38 : mid ? 0.22 : 0.1)) c.fate = 'signs';
      else if (this.rnd() < (old ? 0.9 : mid ? 0.75 : 0.6)) c.fate = 'cpr-fail';
      else { c.fate = 'rosc'; c.trans = true; }
      // nabráno jako bezvědomí/nedýchá, ale pacient se cestou probírá (křeče, synkopa, intoxikace…) → doplňková naléhavost N2
      const pWake = ['resus', 'nzo', 'obeseni', 'tonuti'].includes(ind.id) ? 0.04 : 0.4;
      if (c.fate !== 'rosc' && this.rnd() < pWake) { c.fate = 'wakes'; c.wakeAt = c.readyAt + this.rr(100, 420); c.trans = this.rnd() < 0.8; }
    }
    c.lzsTechRequired = whKey === 'priroda' && this.rnd() < 0.55;
    c.lzsTerrain = c.lzsTechRequired ? 'nepřístupný terén' : null;
    return c;
  }
  // datové zprávy od HZS / PČR / eCall k případu; texty se v rámci směny neopakují
  _extReports(kinds, o) {
    const D = ZOS_DATA, hist = this.s.ev.extHist || (this.s.ev.extHist = []);
    const near = (n, filter) => D.towns.filter(filter || (() => true)).map(tw => [tw, hav(o.lat, o.lon, tw.lat, tw.lon)]).sort((a, b) => a[1] - b[1]).slice(0, n).map(x => x[0]);
    const hzsTowns = ['České Budějovice', 'Tábor', 'Písek', 'Strakonice', 'Jindřichův Hradec', 'Prachatice', 'Český Krumlov', 'Dačice', 'Milevsko', 'Třeboň', 'Týn nad Vltavou', 'Trhové Sviny', 'Vimperk', 'Blatná', 'Kaplice', 'Soběslav', 'Vodňany', 'Volary'];
    const hzs = near(1, tw => hzsTowns.includes(tw.n))[0], dirs = near(4, tw => tw.n !== o.town), twn = D.towns.find(tw => tw.n === o.town);
    const ctx = { r: () => this.rnd(), addr: o.addr, town: o.town, okres: o.okres, where: o.where, sex: o.sex, patientCount: o.patientCount,
      trapped: /UVĚZNĚNÝ|ZAKLÍNĚ/i.test(o.up), extraPerson: o.patientCount === 1 && this.rnd() < 0.025, big: !!(twn && twn.w >= 10),
      hzsNear: hzs ? hzs.n : null, dirTown: dirs.length ? this.pick(dirs).n : null, floor: o.where === 'byt' ? `${this.ri(1, 6)}. patro` : '',
      clock: min => this.clockAt(o.t + o.intake - min * 60) };
    let out = [];
    for (const k of kinds) {
      let items = [];
      for (let tries = 0; tries < 8; tries++) { items = EXTMSG.KINDS[k](ctx); if (!items.some(x => hist.includes(x.text))) break; }
      out = out.concat(items);
    }
    out.sort((a, b) => a.dt - b.dt);
    for (const x of out) { hist.push(x.text); if (hist.length > 400) hist.shift(); }
    return out.map((x, i) => Object.assign({ id: `dz-${i + 1}`, at: o.t + o.intake + x.dt, received: false, acknowledged: false, source: this.pick(EXTMSG.SRC[x.src] || ['Linka 112']), text: x.text }, x.patientCount ? { patientCount: x.patientCount } : {}));
  }
  _muFirstSceneReport(cs, crew, at) {
    const m = cs.mu;
    const patients = Math.max(1, m.cas + this.ri(-2, 3));
    const report = {
      id: 'mu-first-scene', at, received: false, acknowledged: false, source: `První posádka ${crew.code}`, patientCount: patients,
      text: m.aircraft
        ? `METHANE: letecká nehoda potvrzena; přibližně ${patients} zasažených, požár/palivo se ověřují, přístup možný. Ověřujeme vhodnou plochu pro LZS.`
        : `METHANE: nehoda více vozidel potvrzena; přibližně ${patients} zraněných, přístup a rizika na místě popsány níže.`,
      fields: {
        místo: cs.addr, událost: m.aircraft ? 'letecká nehoda' : 'dopravní nehoda více vozidel',
        rizika: m.aircraft ? this.pick(['únik paliva, požár nepotvrzen', 'kouř v okolí, riziko požáru se prověřuje', 'bez viditelného požáru, stav palivových nádrží neznámý']) : this.pick(['nestabilní vozidlo, HZS pracuje na zajištění', 'provoz v okolí omezen, bez dalšího rizika', 'možný únik provozních kapalin']),
        přístup: this.pick(['příjezd možný od hlavní komunikace', 'příjezd omezen uzávěrou PČR', 'bezpečný přístup se právě ověřuje']),
        počet: `${patients} zraněných; odhad potřebných skupin ${m.groupsRequired}`,
        složky: this.pick(['PČR na místě, HZS na cestě', 'HZS i PČR na místě', 'HZS žádán k zajištění místa, PČR organizuje dopravu']),
        lzs: m.aircraft ? this.pick(['přistávací plocha se ověřuje', 'plocha zatím není potvrzena', 'možnost přistání bude potvrzena po průzkumu']) : null,
      },
    };
    cs.radioReports.push(report);
    m.sceneReportSent = true; m.firstMU = at; m.cas = patients; m.left = patients;
    cs.patientCount = patients; cs.patientsRemaining = patients; cs.pocet = patients;
    cs.desc = `${m.aircraft ? 'Letecká nehoda' : 'Dopravní nehoda více vozidel'}, první posádkou odhadnuto ${patients} zraněných.`;
    if (patients > 15 || m.groupsRequired >= 5) {
      m.phase = 'declared'; m.declaredAt = at;
      cs.poznamka = 'Rozsah události potvrzen první posádkou, vyhlášena MU.';
      this.L('alert', `${cs.num}: první posádka potvrdila rozsah MU (${patients} zraněných, odhad ${m.groupsRequired} skupin).`, cs.id);
    } else {
      cs.klasif = 'Dopravní nehoda';
      cs.poznamka = 'Rozsah MU se nepotvrdil; případ pokračuje jako běžná událost s více zraněnými.';
      cs.initialDispatchRequired = ['RZP'];
      cs.mu = null;
      if (!this.s.cases.some(c => c !== cs && c.mu && c.status !== 'closed')) this.s.muPlayerRole = null;
      this.L('alert', `${cs.num}: odhad nedosáhl kritéria MU. Případ pokračuje jako běžná událost s více zraněnými.`, cs.id);
    }
  }
  _spawnMU() {
    const s = this.s, D = ZOS_DATA;
    const town = this.pick(D.towns.filter(x => x.w >= 5));
    const cas = this.ri(10, 22);
    const aircraft = this.rnd() < 0.12;
    const groupsRequired = this.ri(3, 7);
    const symptoms = this._symptomSet('MU - MATRA 722', 1), up = symptoms.join(', ');
    const c = this._newCase({
      ind: 'mu', klasif: 'MU - MATRA 722', up, symptoms, charakter: 'Tísňová výzva v terénu',
      place: aircraft ? 'Okolí letiště / místo letecké nehody' : 'Silnice, hromadná nehoda', n: 1, dyn: false, rvNeed: true, rvLater: false, rvP: 1, zzumInd: false,
      addr: aircraft ? `okolí letiště u ${town.n}` : `silnice I/${this.pick([3, 20, 34, 4])}, okolí ${town.n}`, town: town.n,
      lat: town.lat + this.rr(-0.03, 0.03), lon: town.lon + this.rr(-0.04, 0.04), age: 0, sex: 'M', child: false,
      desc: aircraft ? `Letecká nehoda, počet osob na palubě se ověřuje.` : `Hromadná dopravní nehoda, rozsah se ověřuje.`, hospType: 'okresni', trans: true, scene: [20, 40], pocet: cas,
      poznamka: 'Více osob zraněno, rozsah události se ověřuje.', ozn: this._name(), oznRel: 'přepojeno z 112',
      phone: this._phone(), src: 'Linka 112', op: 'OP-A', intake: 25,
    });
    c.mu = { cas, left: cas, firstMU: null, phase: 'suspected', declaredAt: null, requestSent: false, aircraft, groupsRequired, sceneReportSent: false, hospitalInfoRequested: false, reinforcementRequests: 0 };
    c.initialDispatchRequired = ['RZP', 'RV'];
    c.radioReports = [
      { id: 'mu-methane', at: c.readyAt + 90, received: false, acknowledged: false, source: 'Linka 112', text: aircraft ? 'Prvotní hlášení: menší letadlo havarovalo, počet osob na palubě a stav místa se ověřují.' : 'Prvotní hlášení: nehoda více vozidel, na místě více zraněných; počet a závažnost se ověřují.', patientCount: cas },
      { id: 'mu-access', at: c.readyAt + 420, received: false, acknowledged: false, source: 'Linka 112', text: this.pick(['Příjezd k místu je možný, okolní provoz je zpomalen.', 'PČR uzavírá příjezdovou komunikaci, posádky navádějte od příjezdu.', 'HZS ověřuje bezpečný přístup k osobám; riziko na místě zatím není vyloučeno.']) },
      { id: 'mu-update', at: c.readyAt + 900, received: false, acknowledged: false, source: 'Linka 112', text: 'Počty a rozsah následků se dále ověřují, závěr zatím nelze potvrdit.' },
    ];
    c.aircraftIncident = aircraft;
    this.L('alert', `PODEZŘENÍ NA ${aircraft ? 'LETECKOU NEHODU' : 'MU'}: ${c.num} – ${c.addr}. Počty a rozsah ověřují posádky.`, c.id);
    return c;
  }

  setMuDispatcher(role) {
    if (!['mu', 'normal'].includes(role)) return { ok: false, msg: 'Vyber dispečink MU nebo běžný provoz.' };
    if (!this.s.cases.some(c => c.mu && c.status !== 'closed')) return { ok: false, msg: 'Není otevřená mimořádná událost.' };
    this.s.muPlayerRole = role;
    this.L('sys', role === 'mu' ? 'Přebíráš běžný provoz; simulovaný kolega řeší MU.' : 'Přebíráš MU; simulovaný kolega řeší běžný provoz.');
    this._runMuAssistant();
    return { ok: true };
  }
  requestMuModule(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed') return { ok: false, msg: 'Modul lze požádat jen k otevřené MU.' };
    if (c.mu.requestSent) return { ok: false, msg: 'Požadavek na modul už byl předán.' };
    c.mu.requestSent = true;
    this.L('alert', `${c.num}: situační hlášení žádá posílení o modul MU.`, c.id);
    return { ok: true };
  }
  requestMuReinforcement(caseId, count) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed' || c.mu.phase !== 'declared') return { ok: false, msg: 'Posily lze požadovat po potvrzení MU.' };
    const n = Math.max(1, Math.min(4, Number(count) || 2));
    c.mu.reinforcementRequests = (c.mu.reinforcementRequests || 0) + n;
    this.L('alert', `${c.num}: požadavek na ${n} dalších zdravotnických skupin předán.`, c.id);
    this._runMuAssistant();
    return { ok: true };
  }
  requestMuHospitalInfo(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed') return { ok: false, msg: 'Součinnost lze vyžádat jen při otevřené MU.' };
    if (c.mu.hospitalInfoRequested) return { ok: false, msg: 'Na aktuální odpověď nemocnic se ještě čeká.' };
    c.mu.hospitalInfoRequested = true;
    c.mu.hospitalInfoReceived = false;
    const hospitals = ZOS_DATA.hospitals.filter(h => h.types && h.types.includes('okresni'));
    const capacities = hospitals.map(h => ({ hospitalId: h.id, state: this.pick(['přijímá', 'omezená kapacita', 'dočasně nepřijímá']), remaining: this.ri(2, 7) }));
    c.mu.hospitalCapacities = capacities;
    const response = capacities.map(x => `${(hospitals.find(h => h.id === x.hospitalId) || {}).short}: ${x.state}`).join('; ');
    c.radioReports = c.radioReports || [];
    c.radioReports.push({ id: `mu-hospital-${c.radioReports.length + 1}`, at: this.s.t + this.rr(90, 180), received: false, acknowledged: false, source: 'Nemocniční součinnost', text: `Aktuální příjem pacientů (simulovaný): ${response}`, hospitalUpdate: true });
    this.L('sys', `${c.num}: vyžádána informace o kapacitě cílových pracovišť.`, c.id);
    return { ok: true };
  }
  requestMuLandingInfo(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || !c.mu.aircraft) return { ok: false, msg: 'Ověření plochy se používá u letecké nehody.' };
    if (c.mu.landingCheckRequested) return { ok: false, msg: 'Na ověření přistávací plochy se už čeká.' };
    c.mu.landingCheckRequested = true;
    const state = this.pick(['vhodná', 'podmíněně vhodná', 'zatím nevhodná']);
    const report = { id: `mu-landing-${c.radioReports.length + 1}`, at: this.s.t + this.rr(60, 150), received: false, acknowledged: false, source: 'Hlášení z místa', text: `Ověření plochy pro vrtulník: ${state}; stav přístupové trasy se může změnit.`, landingUpdate: true, landingStatus: state };
    c.radioReports.push(report);
    this.L('sys', `${c.num}: vyžádáno ověření vhodnosti plochy pro LZS.`, c.id);
    return { ok: true };
  }
  chooseMuHospital(caseId, hospitalId) {
    const c = this.caseOf(caseId), h = ZOS_DATA.hospitals.find(x => x.id === hospitalId);
    if (!c || !c.mu || !h || !c.mu.hospitalCapacities) return { ok: false, msg: 'Nejprve vyžádej aktuální odpovědi nemocnic.' };
    const capacity = c.mu.hospitalCapacities.find(x => x.hospitalId === hospitalId);
    if (!capacity || capacity.state === 'dočasně nepřijímá') return { ok: false, msg: 'Toto pracoviště nyní příjem nepotvrdilo.' };
    c.targetHospitalId = hospitalId; c.mu.selectedHospitalId = hospitalId;
    this.L('sys', `${c.num}: další transporty směrovány přednostně do ${h.short}.`, c.id);
    return { ok: true };
  }
  _runMuAssistant() {
    if (!this.s.muPlayerRole) return;
    const aiCases = this.s.cases.filter(c => (c.mu && c.status !== 'closed' && this.s.muPlayerRole === 'normal') || (!c.mu && c.n !== 3 && c.typ !== 'sekundární' && ['waiting', 'active'].includes(c.status) && this.s.muPlayerRole === 'mu'));
    for (const cs of aiCases) {
      if (cs.status === 'intake') continue;
      const need = cs.mu ? ['RZP', 'RV'] : (cs.initialDispatchRequired && cs.initialDispatchRequired.length ? cs.initialDispatchRequired : cs.firstAssign == null ? ['RZP'] : []);
      for (const type of need) {
        if (cs.initialDispatchSent.includes(type) || cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === type && k.caseRole !== 'heli-transfer' && BUSY.includes(k.state); })) continue;
        const candidate = this.suggest(cs.id, type)[0];
        if (!candidate) continue;
        this.assign(cs.id, candidate.crewId);
        this.L('sys', `Simulovaný dispečer vyslal ${type} k ${cs.num}.`, cs.id);
      }
      if (cs.mu && cs.mu.requestSent) {
        const candidate = this.suggest(cs.id, 'MU')[0];
        if (candidate) { cs.mu.requestSent = false; this.assign(cs.id, candidate.crewId); this.L('alert', `Modul MU vyslán k ${cs.num}.`, cs.id); }
      }
      if (cs.mu && this.s.muPlayerRole === 'normal' && cs.mu.reinforcementRequests > 0) {
        const candidate = this.suggest(cs.id, 'RZP')[0];
        if (candidate) { cs.mu.reinforcementRequests--; this.assign(cs.id, candidate.crewId); this.L('sys', `Simulovaný dispečer vyslal posilu RZP k ${cs.num}.`, cs.id); }
      }
    }
  }
  _spawnSecondary(scheduledAt) {
    const D = ZOS_DATA, t = this.s.t;
    let from, to;
    if (this.rnd() < 0.75) {
      const cb = D.hospitals.find(h => h.id === 'h-cb'), other = this.pick(D.hospitals.filter(h => h.id !== 'h-cb'));
      if (this.rnd() < 0.5) { from = other; to = cb; } else { from = cb; to = other; }
    } else {
      from = this.pick(D.hospitals); to = this.pick(D.hospitals.filter(h => h.id !== from.id));
    }
    scheduledAt = scheduledAt == null ? t + this.rr(3600, 7200) : scheduledAt;
    const town = D.towns.reduce((best, x) => !best || hav(x.lat, x.lon, from.lat, from.lon) < hav(best.lat, best.lon, from.lat, from.lon) ? x : best, null);
    const age = this.ri(18, 90), sex = this.rnd() < 0.5 ? 'M' : 'Ž';
    const symptoms = this._symptomSet('Převoz', 4), up = symptoms.join(', ');
    const c = this._newCase({
      ind: 'secondary', typ: 'sekundární', klasif: 'Převoz', up, symptoms,
      charakter: 'Sekundární převoz', place: 'zdravotnicke zarizeni', n: 4, dyn: false, rvNeed: false, rvLater: false, rvP: 0,
      zzumInd: false, addr: from.name, town: town.n, okres: null, cast: '', lat: from.lat, lon: from.lon,
      age, sex, child: false, desc: `${this._person(age, sex)}, ${age} let. Převoz: ${from.short} → ${to.short}, přistavit kolem ${this.clockAt(scheduledAt)}.`,
      hospType: 'okresni', targetHospitalId: to.id, originHospitalId: from.id, trans: true, scene: [5, 12], pocet: 1,
      scheduledAt, timeScore: null, scheduleDelta: null,
      poznamka: this.pick([`překlad z ${from.short} do ${to.short}`, `převoz k dovyšetření v ${to.short}`, `předání k dalšímu ošetření v ${to.short}`]), ozn: this._name(this.rnd() < 0.75 ? 'Ž' : 'M', 30 + this.ri(0, 30)), oznRel: 'sestra oddělení', patientName: this._P() ? this._P().person(this._rndFn(), sex, age).reverse : '', ageText: this._ageText(age),
      phone: this._phone(), src: 'Zdravotnické zařízení', op: 'OP-' + this.pick(['A', 'B', 'C', 'D']),
      intake: 0, status: 'waiting', readyAt: t, waitSince: t, escAt: t + 999999,
    });
    this.L('case', `Nový sekundární převoz ${c.num}: N4 – ${from.short} → ${to.short}, přistavení ${this.clockAt(scheduledAt)}`, c.id);
    return c;
  }
  _newCase(o) {
    const s = this.s, t = s.t;
    const num = 'P' + (1000 + (++s.caseSeq));
    const c = Object.assign({
      id: 'c' + s.caseSeq, num, nOrig: o.n, createdAt: t, readyAt: t + o.intake, status: 'intake', symptoms: [],
      crews: [], asg: [], firstAssign: null, firstArrive: null, arrived: false, docAssigned: false, docArrived: false,
      initialDispatchRequired: [], initialDispatchSent: [],
      docAssignT: null, rvReq: null, rvReqAt: null, closedAt: null, score: null, pen: 0, effRatio: null,
      waitSince: t + o.intake, escAt: t + o.intake + 1500, transported: false, zzumOk: false,
      members: [this._name()], mu: null, unserved: false,
    }, o);
    c.patientCount = c.patientCount == null ? (c.pocet || 1) : c.patientCount;
    c.patientsRemaining = c.patientsRemaining == null ? c.patientCount : c.patientsRemaining;
    c.patientsHandled = c.patientsHandled || 0;
    s.cases.push(c);
    return c;
  }

  // ---------- smyčka ----------
  step(dt) {
    while (dt > 0 && !this.s.ended) { const d = Math.min(5, dt); this._tick(d); dt -= d; }
  }
  _tick(dt) {
    const s = this.s; s.t += dt; const t = s.t;
    this._updateWeather();
    const day = this._isDay();
    if (day !== s.dayFlag) { s.dayFlag = day; this.L('sys', day ? 'Střídání směn: denní směna.' : 'Střídání směn: noční směna.'); this._roster(true); }

    while (s.ev.nextSpawn <= t) { this._spawn(); s.ev.nextSpawn += this._gap(); }
    if (t >= s.ev.nextSecond) {
      const shiftFinished = s.mode === 'shift' && t >= s.shiftLen;
      const muOpen = s.cases.some(c => c.mu && c.status !== 'closed');
      if (muOpen) s.ev.nextSecond = t + 300;
      else if (!shiftFinished && this._isDay() && s.secondaryEnabled !== false) {
        const open = s.cases.filter(c => c.typ === 'sekundární' && c.status !== 'closed').length;
        if (!s.ev.daySecondariesCreated) {
          s.ev.daySecondariesCreated = true;
          const dayStart = t - (((s.startHour * 3600 + t) % 86400 - 7 * 3600 + 86400) % 86400);
          this._spawnSecondary(dayStart + this.rr(3600, 5400));
          this._spawnSecondary(dayStart + this.rr(5400, 7200));
        } else if (open < 3 && this.hour() < 16.5) this._spawnSecondary(t + this.rr(3600, 7200));
        s.ev.nextSecond = t + this.rr(9000, 14400);
      } else {
        s.ev.daySecondariesCreated = false;
        s.ev.nextSecond = t + ((7 - this.hour() + 24) % 24 || 24) * 3600;
      }
    }
    if (s.ev.nextMU != null && t >= s.ev.nextMU) {
      if (s.mode === 'free') {
        s.ev.nextMU = s.muEnabled && s.muProbability > 0 ? t + 12 * 3600 : null;
        if (s.muEnabled && this.rnd() * 100 < s.muProbability) this._spawnMU();
      } else { s.ev.nextMU = null; this._spawnMU(); }
    }

    for (const c of s.cases) if (c.status !== 'closed') this._caseStep(c);
    this._lzsRadio();
    if (s.radioMode === 'interactive') this._radioStep();
    this._runMuAssistant();
    for (const cs of s.cases) if (cs.vstricna && cs.vstricna.state === 'offered' && t >= cs.vstricna.expiresAt) {
      this.declineVstricna(cs.id, true);
    }
    for (const c of s.crews) this._crewStep(c);
    this._coverage();
    if (s.cases.length > 450) {
      let drop = s.cases.length - 400;
      s.cases = s.cases.filter(c => { if (drop > 0 && c.status === 'closed') { drop--; return false; } return true; });
    }
    if (s.mode === 'shift' && t >= s.shiftLen && !s.ended) {
      s.ended = true;
      for (const cs of s.cases) if (cs.status !== 'closed' && cs.exam && cs.exam.needed && !cs.exam.done) this._opsScore(-3, `neprovedená prohlídka zemřelého u ${cs.num}`, cs.id);
      this.L('sys', 'Konec směny.');
    }
  }

  _caseStep(c) {
    const s = this.s, t = s.t;
    for (const report of c.radioReports || []) {
      if (!report.received && t >= report.at) {
        report.received = true; report.receivedAt = t;
        if (report.hospitalUpdate && c.mu) { c.mu.hospitalInfoRequested = false; c.mu.hospitalInfoReceived = true; }
        if (report.landingUpdate && c.mu) { c.mu.landingCheckRequested = false; c.mu.landingStatus = report.landingStatus; }
        if (report.source && report.source.startsWith('První posádka') && c.mu && report.patientCount) {
          c.patientCount = c.pocet = c.mu.cas = report.patientCount;
          c.patientsRemaining = c.mu.left = Math.max(0, report.patientCount - (c.patientsHandled || 0));
        }
        if (report.patientCount && report.patientCount > c.patientCount) {
          c.patientCount = report.patientCount; c.pocet = report.patientCount;
          c.patientsRemaining = Math.max(0, c.patientCount - (c.patientsHandled || 0));
          c.desc = `${c.patientCount} zranění při dopravní nehodě; počet upřesnily složky IZS.`;
        }
        this.L('alert', `${c.num} · ${report.source || (c.mu ? 'Situační hlášení' : 'linka 112')}: ${report.text}`, c.id);
      }
      if (report.received && !report.acknowledged && !report.scoreApplied && t - report.receivedAt >= 180) {
        report.scoreApplied = true;
        // přehlédnutá datová zpráva se netrestá (jen informace)
      }
    }
    if (c.status === 'intake') {
      if (t >= c.readyAt) {
        c.status = 'waiting';
        this.L('case', `Nový případ ${c.num}: N${c.n}${c.dyn ? ' dyn.' : ''} – ${c.klasif}, ${c.addr}`, c.id);
      }
      return;
    }
    if (!c.mu && c.n === 3 && c.status === 'waiting' && this._muDeclaredOpen()) {
      if (c.muPausedAt == null) c.muPausedAt = t;
      return;
    }
    if (c.muPausedAt != null) {
      const pause = Math.max(0, t - c.muPausedAt);
      c.readyAt += pause; c.waitSince += pause; c.escAt += pause;
      c.muPausedAt = null;
    }
    // Plánovaný N4 převoz neeskaluje jako akutní tísňová výzva.
    if (c.typ === 'sekundární') return;
    if (c.mu) this._muHelp(c);
    if (c.exitus) { this._deathCaseStep(c); return; }
    if (c.agencies) this._agencyStep(c);
    // žádost o lékaře na místě
    if (c.rvReqAt != null && !c.rvReq && t >= c.rvReqAt) {
      c.rvReq = { t, satT: c.docAssigned ? t : null, kind: c.rvReqKind || 'zhoršení stavu' };
      if (!c.docAssigned) {
        if (c.rvReq.kind === 'zhoršení stavu' && c.n === 3) {
          c.n = 2; c.nDopl = 2; c.dyn = false;
          const extra = this._typicalSymptom(c);
          if (extra) { c.symptoms = (c.symptoms || []).filter(x => !/DYNAMICKÁ INDIKACE/i.test(x)).concat([extra]); c.up = c.symptoms.join(', '); }
          this.L('req', `${c.num}: posádka hlásí zhoršení stavu a žádá lékaře – doplňková naléhavost N2${extra ? ` (${extra})` : ''}`, c.id);
        }
        else this.L('req', `${c.num}: posádka žádá lékaře – ${c.rvReq.kind}`, c.id);
        const rzp = c.crews.map(id => this.crewOf(id)).find(k => k && k.type === 'RZP' && k.state === 'onscene');
        if (rzp) {
          const sug = [...this.suggest(c.id, 'RV').slice(0, 2), ...this.suggest(c.id, 'LZS').slice(0, 1)].map(x => this.crewOf(x.crewId)).filter(Boolean);
          const opts = sug.map((k, i) => ({ k: 'rv' + i, label: `Za vámi ${this._label(k)}`, say: `ZCB101 rozumí, za vámi ${this._label(k)}.`, ok: true, act: 'assign', crewId: k.id }));
          opts.push({ k: 'later', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true });
          this._crewCall(rzp, c, `žádáme lékaře na místo, ${c.rvReq.kind === 'zhoršení stavu' ? 'zhoršení stavu' : 'posouzení stavu'}.`, opts, 'rv');
        }
      }
    }
    if (c.fate === 'wakes' && c.wakeAt != null && !c.wokeDone && t >= c.wakeAt && c.status !== 'intake') {
      c.wokeDone = true;
      const onScene = c.crews.some(id => { const k = this.crewOf(id); return k && k.state === 'onscene'; });
      if (!onScene && c.n === 1) {
        c.n = 2; c.nDopl = 2; c.dyn = false; c.rvNeed = true;
        c.symptoms = (c.symptoms || []).filter(x => !/NEDÝCHÁ|BEZVĚDOMÍ|AVPU-U/i.test(x)).concat(['probírá se', 'dýchá']);
        c.up = c.symptoms.join(', ');
        c.poznamka = [c.poznamka, 'opakované volání – pacient se probírá, dýchá'].filter(Boolean).join(', ');
        this.L('warn', `${c.num}: opakované volání – pacient se probírá a dýchá, doplňková naléhavost N1→N2`, c.id);
        for (const k of c.crews.map(id => this.crewOf(id)).filter(k => k && (k.state === 'call' || k.state === 'enroute') && k.type !== 'LZS')) this._zosCall(k, c, 'pacient se probírá, měníme naléhavost na N2.');
      }
    }
    if (c.status === 'waiting' && !c.mu) {
      if (t >= c.escAt && c.n > 1 && !c.exitus) {
        c.n--; c.escAt = t + 1500;
        if (c.n === 1) c.rvNeed = true;
        if (c.dyn || (c.up || '').toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE')) {
          c.dyn = false; c.rvNeed = true;
          c.symptoms = (c.symptoms || []).filter(x => !x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'));
          c.up = c.symptoms.join(', ');
        }
        if (!/opakované volání/.test(c.poznamka || '')) c.poznamka = [c.poznamka, 'opakované volání – zhoršení stavu'].filter(Boolean).join(', ');
        this.L('warn', `${c.num}: opakované volání – zhoršení stavu, nově N${c.n}`, c.id);
      }
      if (t - c.waitSince > 2700 && !c.arrived) { this._close(c, true); return; }
    }
    if (c.mu && c.status === 'waiting' && t - c.waitSince > 9000) this._close(c, true);
  }
  _deathCaseStep(c) {
    const t = this.s.t, cor = c.coroner;
    const here = type => c.crews.some(id => { const k = this.crewOf(id); return k && k.caseId === c.id && k.type === type && BUSY.includes(k.state); });
    if (c.recallDue && !c.recallDue.done && t >= c.recallDue.at + 180) {
      c.recallDue.done = true;
      for (const id of c.recallDue.ids) { const k = this.crewOf(id); if (k && k.caseId === c.id && (k.state === 'call' || k.state === 'enroute')) this._opsScore(-1, `neodvolaná posádka ${k.name} po hlášení exitu u ${c.num}`, c.id); }
    }
    if (cor && cor.state === 'pending' && t >= cor.answerAt) {
      const ok = this.rnd() < (this._isDay() ? 0.6 : 0.45);
      cor.state = ok ? 'available' : 'unavailable';
      if (ok) {
        cor.until = t + this.rr(900, 1800);
        cor.name = this.pick(['MUDr. Kovář', 'MUDr. Malá', 'MUDr. Sýkora', 'MUDr. Vlková', 'MUDr. Holý', 'MUDr. Bartošová']);
        this.L('sys', `${c.num}: koroner ${cor.name} zajištěn (telefonicky, informace do terminálu) – posádky se vracejí na základnu.`, c.id);
      } else {
        c.exam = { needed: true, done: false, remaining: this.rr(1200, 2100), since: t, lastPen: t };
        if (here('RV')) this.L('sys', `${c.num}: koroner není k dispozici (informace do terminálu) – RV zůstává na prohlídku zemřelého, RZP se vrací.`, c.id);
        else {
          this.L('sys', `${c.num}: koroner není k dispozici (informace do terminálu) – prohlídku provede lékař RV.`, c.id);
          this.L('alert', `${c.num}: koroner není k dispozici – na prohlídku zemřelého vyšli RV (během služby, co nejdřív).`, c.id);
        }
      }
      if (!this._busyCrews(c).length) this._checkClose(c);
      return;
    }
    if (cor && cor.state === 'available' && t >= cor.until && c.status !== 'closed' && !this._busyCrews(c).length) { this._close(c, false); return; }
    if (c.exam && c.exam.needed && !c.exam.done && !here('RV') && t - c.exam.lastPen >= 3600) {
      c.exam.lastPen = t;
      this._opsScore(-1, `čekající prohlídka zemřelého u ${c.num}`, c.id);
      this.L('alert', `${c.num}: prohlídka zemřelého stále čeká na RV.`, c.id);
    }
  }
  _declareDeath(cs, c, kind) {
    const t = this.s.t, doc = c.type === 'RV' || c.type === 'LZS' || !!c.rlp;
    cs.rvScoreLock = cs.docAssigned || !cs.rvNeed ? Math.max(this._rvScore(cs), cs.docAssigned ? 10 : 0) : (t - cs.readyAt <= 300 ? 15 : 5);
    cs.exitus = true; cs.deathAt = t; cs.deathKind = kind; cs.trans = false; cs.rvNeed = false; cs.rvLater = false; cs.rvReqAt = null;
    if (cs.rvReq && cs.rvReq.satT == null) cs.rvReq.cancelled = true;
    cs.initialDispatchRequired = []; cs.lzsTransferRequired = false;
    if (cs.vstricna && cs.vstricna.state === 'offered') cs.vstricna.state = 'expired';
    cs.coroner = { state: 'pending', answerAt: t + this.rr(120, 300) };
    const coming = cs.crews.map(id => this.crewOf(id)).filter(k => k && k.id !== c.id && k.caseId === cs.id && (k.state === 'call' || k.state === 'enroute'));
    if (kind === 'signs') {
      const who = coming.some(k => k.type === 'RV' || k.type === 'LZS') ? (coming.some(k => k.type === 'LZS') && !coming.some(k => k.type === 'RV') ? ' LZS můžete odvolat.' : ' RV můžete odvolat.') : coming.length ? ' Další posádku můžete odvolat.' : '';
      this._radio(c, cs, `na místě jisté známky smrti, exitus, prosíme zjistit koronera.${who}`, 'zjišťujeme koronera');
      if (coming.length) cs.recallDue = { at: t, ids: coming.map(k => k.id), done: false };
    } else if (kind === 'cpr') this._radio(c, cs, 'na místě exitus, prosím zjistěte nám dostupnost koronera.', 'zjišťujeme koronera');
    else this._radio(c, cs, 'po konzultaci s lékařem na místě exitus, prosíme zjistit koronera.', 'zjišťujeme koronera');
    this.s.agg.deaths = (this.s.agg.deaths || 0) + 1;
    void doc;
  }
  // krok posádky na místě u případu s KPR / exitem; vrací true, pokud je krok vyřízen
  _deathStep(c, cs) {
    const t = this.s.t, doc = c.type === 'RV' || c.type === 'LZS' || !!c.rlp;
    if (!cs.exitus) {
      if (cs.fate === 'signs') { this._declareDeath(cs, c, 'signs'); c.until = t + this.rr(150, 300); return true; }
      if (cs.fate !== 'cpr-fail') return false;
      if (doc) { this._declareDeath(cs, c, 'cpr'); c.until = t + 30; return true; }
      const docBusy = cs.crews.some(id => { const k = this.crewOf(id); return k && k.id !== c.id && k.caseId === cs.id && (k.type === 'RV' || k.type === 'LZS' || k.rlp) && BUSY.includes(k.state); });
      if (docBusy || t < c.arrivedAt + 1500) { c.until = t + 30; return true; }
      this._declareDeath(cs, c, 'consult'); c.until = t + 30; return true;
    }
    if (c.type === 'LZS') return false; // LZS se vrací vlastní logikou
    if (c.caseRole === 'exam') {
      cs.exam.done = true; cs.exam.remaining = 0; cs.exam.crewId = null;
      this._radio(c, cs, 'prohlídka zemřelého ukončena, jsme volní, vracíme se na základnu.', true);
      this._release(c); return true;
    }
    const cor = cs.coroner;
    if (!cor || cor.state === 'pending') { c.until = t + 20; return true; }
    if (cor.state === 'unavailable' && c.type === 'RV' && cs.exam && !cs.exam.done && !cs.exam.crewId) {
      c.caseRole = 'exam'; cs.exam.crewId = c.id; c.until = t + cs.exam.remaining; cs.exam.startedAt = t;
      this._radio(c, cs, 'zůstáváme na prohlídku zemřelého, jsme odvolatelní.', true);
      return true;
    }
    this._release(c); return true;
  }
  // odvolání RV z prohlídky zemřelého nebo z doprovodu; posádka je hned volná
  _detachSoft(c) {
    const t = this.s.t, old = this.caseOf(c.caseId), p = this.pos(c), role = c.caseRole;
    if (old && role === 'exam' && old.exam) {
      old.exam.remaining = Math.max(180, c.until - t); old.exam.crewId = null; old.exam.since = t; old.exam.lastPen = t;
      this.L('warn', `${c.name}: odvolána z prohlídky zemřelého ${old.num}; na prohlídku je nutné se během služby vrátit.`, old.id, c.id);
    } else if (old) this.L('warn', `${c.name}: odvolána z doprovodu ${old.num}, RZP pokračuje sama.`, old.id, c.id);
    c.lat = p.lat; c.lon = p.lon; c.mv = null; c.caseId = null; c.caseRole = null; c.escortFree = false; c.dest = null; c.arrivedAt = null;
    const dur = this._go(c, c.home.lat, c.home.lon, 'RET'); c.state = 'free'; c.until = t + dur;
    if (old) this._checkClose(old);
  }
  declineVstricna(caseId, auto) {
    const cs = this.caseOf(caseId), plan = cs && cs.vstricna;
    if (!plan || plan.state !== 'offered') return { ok: false, msg: 'Vstřícná jízda už není k dispozici.' };
    const primary = this.crewOf(plan.primaryCrewId);
    plan.state = auto ? 'expired' : 'declined';
    this.L('crew', 'ZCB101 rozumí, dojíždějte sami.', cs.id, plan.primaryCrewId);
    if (primary) this.L('crew', `ZCB${primary.code} rozumí, jedeme sami.`, cs.id, primary.id);
    return { ok: true };
  }
  acknowledge112(caseId, reportId) {
    const c = this.caseOf(caseId); if (!c) return;
    for (const report of c.radioReports || []) if (report.received && !report.acknowledged && (!reportId || report.id === reportId)) {
      report.acknowledged = true;
      if (!report.scoreApplied && this.s.t - report.receivedAt <= 120) this._opsScore(1, `včas převzata zpráva 112 u ${c.num}`, c.id);
      report.scoreApplied = true;
    }
  }

  _crewStep(c) {
    const s = this.s, t = s.t;
    if (c.type === 'LZS' && c.state === 'transport' && c.lzsLeg === 'to-heliport' && c.until > t && c.until - t <= 300) {
      const cs = this.caseOf(c.caseId);
      if (cs && !cs.lzsHeliportAlerted) { cs.lzsHeliportAlerted = true; this.L('alert', this._externalHandover(cs) ? `LZS ${cs.num}: přistání na heliportu FNKV za 5 min – pacienta převezme posádka ZZS HMP.` : `LZS ${cs.num}: přistání za 5 min – vyslat RZP na heliport.`, cs.id, c.id); }
    }
    switch (c.state) {
      case 'activating':
        if (t >= c.until) { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; this.L('crew', `${c.name}: záloha připravena`, null, c.id); }
        break;
      case 'base':
        if (c.res && t >= c.dutyEnd) { c.state = 'off'; this.L('crew', `${c.name}: záloha odhlášena`, null, c.id); }
        break;
      case 'second':
        if (t >= c.until) { c.state = 'base'; this.L('crew', `${c.name}: zpět po sekundárním převozu`, null, c.id); if (c.pendingOff) this._toBase(c); }
        break;
      case 'free':
        if (t >= c.until) { c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null; this._toBase(c); }
        break;
      case 'call': {
        const pending = this.caseOf(c.caseId);
        if (pending && pending.n === 1 && c.type !== 'LZS' && c.type !== 'MU' &&
            !c.turnoutAlerted && t - c.dispatchAt > 120) {
          c.turnoutAlerted = true;
          this.L('deadline', `ALARM: ${c.name} nevyjela k N1 ${pending.num} do 2 minut!`, pending.id, c.id);
          this._opsScore(-5, `opožděný výjezd N1 (${c.name})`, pending.id);
        }
        if (t < c.until) break;
        const cs = pending;
        if (cs && cs.n > 1 && c.type !== 'LZS' && c.type !== 'MU' && c.turn > 120) {
          this.L('warn', `${c.name}: opožděný výjezd k N${cs.n} – ${Math.round(c.turn / 60)} min`, cs.id, c.id);
        }
        let dur;
        if (c.type === 'LZS') dur = this._goAir(c, cs.lat, cs.lon);
        else {
          const target = c.caseRole === 'heli-transfer' ? ZOS_DATA.lzs.heliport : c.caseRole === 'vstricna-support' ? c.vstricnaMeet : { lat: cs.lat, lon: cs.lon };
          dur = this._go(c, target.lat, target.lon, c.caseRole === 'vstricna-support' ? 'N3' : 'N' + Math.min(4, Math.max(1, cs.n || 3)));
          if (!c.caseRole) this._park(c, cs);
        }
        c.until = t + dur; c.state = 'enroute'; c.enrouteAt = t; c.takeoffReported = null;
        this.L('crew', `${c.name}: výjezd, ETA ${Math.round(dur / 60)} min`, cs.id, c.id);
        break;
      }
      case 'enroute': {
        if (t < c.until) break;
        const cs = this.caseOf(c.caseId);
        if (c.caseRole === 'vstricna-support') {
          c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null; c.state = 'onscene'; c.arrivedAt = t; c.until = t + 30;
          this.L('crew', `${c.name}: na místě vstřícné jízdy, čeká na přijíždějící RZP.`, cs.id, c.id);
          this._completeVstricna(cs); break;
        }
        if (c.caseRole === 'heli-transfer') {
          const hp = ZOS_DATA.lzs.heliport;
          c.lat = hp.lat; c.lon = hp.lon; c.mv = null; c.state = 'onscene'; c.arrivedAt = t;
          cs.lzsTransferCrewArrived = t;
          if (cs.lzsLandedAt != null) cs.lzsReadyAt = Math.max(cs.lzsLandedAt + 180, t);
          c.until = t + 30;
          this.L('crew', `${c.name}: čeká na LZS na heliportu (${(this._heliportForCase(cs) || {}).name || 'heliport'})`, cs.id, c.id);
          break;
        }
        if (c.parked && c.mv) { c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; } else { c.lat = cs.lat; c.lon = cs.lon; }
        c.parked = false; c.mv = null; c.state = 'onscene'; c.arrivedAt = t;
        cs.arrived = true;
        if (cs.firstArrive == null) cs.firstArrive = t;
        if (cs.mu && !cs.mu.sceneReportSent) this._muFirstSceneReport(cs, c, t);
        if (cs.typ === 'sekundární' && Number.isFinite(cs.scheduledAt)) {
          cs.scheduleDelta = t - cs.scheduledAt;
          const deviation = Math.abs(cs.scheduleDelta);
          cs.timeScore = Math.round(deviation <= 900 ? 100 : clamp01(1 - (deviation - 900) / 1800) * 100);
        }
        const doc = c.type === 'RV' || c.type === 'LZS' || !!c.rlp;
        if (doc) { cs.docArrived = true; }
        if (c.type === 'MU' && cs.mu && cs.mu.firstMU == null) cs.mu.firstMU = t;
        if (c.type === 'RZP' && cs.rvLater && cs.rvReqAt == null && !cs.rvReq) cs.rvReqAt = t + this.rr(240, 480);
        let dur;
        if (c.type === 'MU') dur = this.rr(1800, 2700);
        else if (doc) dur = this.rr(600, 1200);
        else if (cs.mu) dur = this.rr(720, 1200);
        else dur = this.rr(cs.scene[0], cs.scene[1]) * 60;
        if (cs.exitus) dur = 30;
        else if (cs.fate === 'signs' && !cs.mu) dur = this.rr(60, 150);
        c.until = t + dur;
        this.L('crew', `${c.name}: na místě`, cs.id, c.id);
        if (!cs.exitus && !cs.mu && cs.typ !== 'sekundární' && (c.type === 'RZP' || c.type === 'RV')) this._sceneEvents(c, cs);
        break;
      }
      case 'onscene': {
        if (t < c.until) break;
        const cs = this.caseOf(c.caseId);
        if (c.caseRole === 'vstricna-primary' || c.caseRole === 'vstricna-support') {
          if (this._completeVstricna(cs)) break;
          c.until = t + 30; break;
        }
        if (c.caseRole === 'heli-transfer') {
          if (cs.lzsLandedAt == null) {
            c.until = t + 30;
            if (!cs.lzsWaitLogged) { this.L('crew', `${c.name}: čeká na přistání vrtulníku`, cs.id, c.id); cs.lzsWaitLogged = true; }
            break;
          }
          if (cs.lzsReadyAt != null && t < cs.lzsReadyAt) { c.until = cs.lzsReadyAt; break; }
          return this._startLzsGroundTransfer(c, cs);
        }
        if ((cs.fate || cs.exitus) && !cs.mu && this._deathStep(c, cs)) break;
        if (cs.typ === 'sekundární') {
          if (cs.scheduledAt > t) {
            c.until = cs.scheduledAt + this.rr(300, 720);
            this.L('crew', `${c.name}: čeká na plánovaný čas převozu ${this.clockAt(cs.scheduledAt)}`, cs.id, c.id);
            break;
          }
          return this._startTransport(c, cs);
        }
        if (c.type === 'RZP' && !cs.mu) {
          const activeRvReq = cs.rvReq && !cs.rvReq.cancelled;
          const needDoc = cs.rvNeed || !!activeRvReq;
          const limit = (activeRvReq ? cs.rvReq.t : c.arrivedAt) + 900;
          if (needDoc && !cs.docArrived && t < limit) break;
          if (this._agencyHold(cs) || (cs.notFoundUntil && t < cs.notFoundUntil)) { c.until = Math.max(t + 30, cs.notFoundUntil || 0); break; }
          if ((cs.patientCount || 1) > 1) {
            if ((cs.patientsRemaining || 0) <= 0) return this._release(c);
            cs.patientsHandled = (cs.patientsHandled || 0) + 1;
            cs.patientsRemaining = Math.max(0, cs.patientCount - cs.patientsHandled);
            this.L('case', `${c.name}: ošetřen pacient ${cs.patientsHandled}/${cs.patientCount}`, cs.id, c.id);
            if (cs.trans) return this._startTransport(c, cs);
            return this._release(c);
          }
          // LZS je přivolaná a ještě neodletěla s pacientem → RZP čeká na rozhodnutí lékaře LZS
          if (c.caseRole !== 'heli-transfer' && !cs.lzsPatientToHospital && !cs.lzsTransferred && (cs.patientCount || 1) <= 1 &&
              cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === 'LZS' && k.caseId === cs.id && ['call', 'enroute', 'onscene'].includes(k.state); })) {
            c.until = t + 30;
            if (!cs.lzsSceneWaitLogged) { this.L('crew', `${c.name}: pacient připraven, čeká na rozhodnutí LZS`, cs.id, c.id); cs.lzsSceneWaitLogged = true; }
            break;
          }
          // jediného pacienta už odvezla LZS (letí na heliport nebo je předán) → pozemní posádka se uvolní
          if (c.caseRole !== 'heli-transfer' && (cs.lzsPatientToHospital || cs.lzsTransferred) && (cs.patientsRemaining || 0) <= 0) {
            this.L('crew', `${c.name}: pacienta převzala LZS, posádka uvolněna`, cs.id, c.id);
            return this._release(c);
          }
          if (cs.trans && !cs.transported) return this._startTransport(c, cs);
          if (!cs.docArrived && !c.rlp && !c.consulted) {
            c.consulted = true; c.until = t + this.rr(120, 240);
            this.L('crew', `${c.name}: telefonická konzultace s lékařem`, cs.id, c.id);
            break;
          }
          const rvHere = cs.crews.map(id => this.crewOf(id)).find(k => k && k.type === 'RV' && k.caseId === cs.id && k.state === 'onscene');
          if (rvHere) { this._radio(rvHere, cs, 'pacienta jsme ponechali na místě a obě posádky se vracíme zpátky na základnu.', true); cs.leftOnScene = true; this._release(rvHere); return this._release(c); }
          this._radio(c, cs, `${c.consulted ? 'po konzultaci ' : ''}pacient ponechán na místě a my se vracíme zpátky na základnu.`, true);
          cs.leftOnScene = true;
          return this._release(c);
        }
        if (c.type === 'RZP' && cs.mu) {
          if (cs.mu.left > 0) { cs.mu.left = Math.max(0, cs.mu.left - 2); return this._startTransport(c, cs); }
          return this._release(c);
        }
        if (c.type === 'LZS') {
          if (cs.lzsTechRequired && !cs.lzsTechDone) {
            if (!cs.lzsTechRequested && !cs.lzsTechAlerted) {
              cs.lzsTechAlerted = true;
              this.L('alert', `${cs.num}: nepřístupný terén – vyžádej technickou součinnost HZS pro přístup k pacientovi.`, cs.id);
            }
            c.until = t + 30;
            break;
          }
          if (cs.exitus || cs.coronerRequested) { cs.lzsTransferRequired = false; cs.lzsNoPatientTransfer = true; return this._returnLzs(c, cs); }
          return this._startLzsFlightToHeliport(c, cs);
        }
        if (cs.mu) cs.mu.left = Math.max(0, cs.mu.left - (c.type === 'MU' ? 6 : 2));
        // RV počká na odjezd RZP s pacientem (rozhodnutí o doprovodu)
        if (c.type === 'RV' && !cs.mu && cs.trans && !cs.transported && (cs.patientCount || 1) <= 1 && t - c.arrivedAt < 3600 &&
            cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === 'RZP' && k.caseId === cs.id && k.state === 'onscene' && !k.caseRole; })) { c.until = t + 30; break; }
        return this._release(c);
      }
      case 'transport': {
        if (c.kruhacAt && t >= c.kruhacAt && t < c.until) {
          c.kruhacAt = null; const kcs = this.caseOf(c.caseId);
          if (kcs) this._crewCall(c, kcs, `jsme na kruháči, dojezd ${Math.max(2, Math.round((c.until - t) / 60))} minut.`, [{ k: 'ok', label: 'Rozumí, nahlásíme', say: 'ZCB101 rozumí, nahlásíme.', ok: true, act: 'ack', def: true }], 'info');
        }
        if (t < c.until) break;
        const cs = this.caseOf(c.caseId);
        if (c.caseRole === 'vstricna-primary') {
          c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null; c.state = 'onscene'; c.until = t + 30;
          this.L('crew', `${c.name}: dorazila na místo setkání se vstřícnou jízdou.`, cs.id, c.id);
          this._completeVstricna(cs); break;
        }
        if (c.caseRole === 'escort') {
          c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null;
          this.L('crew', `${c.name}: doprovod ukončen – ${c.dest ? c.dest.name : 'nemocnice'}`, cs ? cs.id : null, c.id);
          this._release(c); break;
        }
        c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null; c.state = 'handover';
        if (c.type === 'LZS' && c.lzsLeg === 'to-heliport') {
          cs.lzsLandedAt = t; cs.lzsReadyAt = t + 180; cs.lzsWaitLogged = false; cs.lzsWaitPenaltyCount = 0; cs.lzsState = 'na heliportu';
          c.lzsLeg = 'handover'; c.hoStart = t; c.until = t + 180;
          const hp = this._heliportForCase(cs);
          c.lat = hp.lat; c.lon = hp.lon; c.dest = { name: hp.name };
          this.L('crew', `${c.name}: přistání na ${hp.name}`, cs.id, c.id);
          if (this._externalHandover(cs)) {
            // vyložení, ~2 min jízda vozem ZZS HMP na popáleninové centrum, předání, návrat na heliport, příprava k letu
            const dur = this.rr(180, 300) + 120 + this.rr(600, 900) + 120 + this.rr(180, 300);
            cs.lzsTransferCrewArrived = t; cs.lzsExternalHandover = true; cs.lzsTransferRequired = false;
            c.until = t + dur;
            this.L('crew', `${c.name}: pacienta převzala posádka ZZS HMP, posádka LZS ho doprovází na Popáleninové centrum FNKV`, cs.id, c.id);
          }
          break;
        }
        c.hoStart = t;
        const handoverSec = this._handoverSec(cs);
        c.until = t + handoverSec;
        if (c.hospitalRun) {
          c.hospitalRun.handoverSec = handoverSec;
          c.hospitalRun.phase = 'handover';
          c.hospitalRun.availableAt = c.until + driveSec(this._eta(c.lat, c.lon, c.home.lat, c.home.lon), 'RET');
        }
        this.L('crew', `${c.name}: příjezd k ZZ – ${c.dest.name}`, cs ? cs.id : null, c.id);
        break;
      }
      case 'handover':
        if (t >= c.until && c.type === 'LZS' && c.lzsLeg === 'handover') {
          const cs = this.caseOf(c.caseId);
          if (cs && cs.lzsTransferCrewArrived == null && t - cs.lzsLandedAt > 1500) {
            // po 25 min bez RZP převezme pacienta personál nemocnice (sanitkou nemocnice), LZS se uvolní
            cs.lzsTransferCrewArrived = t; cs.lzsTransferred = true; cs.lzsTransferRequired = false; cs.transported = true;
            cs.lzsState = 'předáno personálu nemocnice na heliportu';
            this._opsScore(-3, `pacienta z LZS na heliportu musel převzít personál nemocnice (bez RZP) u ${cs.num}`, cs.id);
            this.L('warn', `${c.name}: pacienta na heliportu po 25 min převzal personál nemocnice – RZP nedorazila.`, cs.id, c.id);
          }
          if (cs && cs.lzsTransferCrewArrived == null) {
            const penaltyIntervals = Math.max(0, Math.floor((t - (cs.lzsLandedAt + 180 + 300)) / 300) + 1);
            const alreadyPenalized = cs.lzsWaitPenaltyCount || 0;
            if (penaltyIntervals > alreadyPenalized) {
              const due = penaltyIntervals - alreadyPenalized;
              cs.lzsWaitPenaltyCount = penaltyIntervals;
              for (let i = 0; i < due; i++) this._opsScore(-2, 'dlouhé čekání LZS na heliportu bez RZP', cs.id);
            }
            c.until = t + 30;
            if (!cs.lzsWaitLogged) { this.L('crew', `${c.name}: čeká na posádku RZP pro předání pacienta`, cs.id, c.id); cs.lzsWaitLogged = true; }
            break;
          }
          if (cs && cs.lzsExternalHandover && !cs.lzsTransferred) {
            cs.lzsTransferred = true; cs.transported = true; cs.dest = 'FNKV Praha – Popáleninové centrum';
            cs.lzsState = 'předáno na Popáleninovém centru FNKV';
            this.L('crew', `${c.name}: pacient předán na Popáleninovém centru FNKV, posádka zpět na heliportu`, cs.id, c.id);
          }
          this._returnLzs(c, cs);
        } else if (t >= c.until && c.caseRole === 'heli-transfer') {
          const cs = this.caseOf(c.caseId);
          if (cs) { cs.lzsTransferred = true; cs.lzsState = 'předáno do cílového oddělení'; }
          this.L('crew', `${c.name}: pacient předán v ${c.dest.name}`, cs ? cs.id : null, c.id);
          this._release(c);
        } else if (t >= c.until) this._release(c);
        break;
    }
  }
  _startLzsFlightToHeliport(c, cs) {
    if (cs.patientCount == null) cs.patientCount = cs.pocet || 1;
    if (cs.patientsRemaining == null) cs.patientsRemaining = cs.patientCount;
    const hp = this._heliportForCase(cs), t = this.s.t;
    const dur = this._goAir(c, hp.lat, hp.lon);
    c.until = t + dur; c.state = 'transport'; c.lzsLeg = 'to-heliport';
    c.dest = { name: hp.name };
    cs.lzsState = 'let na heliport';
    cs.lzsPatientToHospital = true; cs.lzsTransferRequired = !this._externalHandover(cs);
    this.L('crew', `${c.name}: let s pacientem na ${hp.name}`, cs.id, c.id);
    if (c.id === 'lzs' || /^KR/.test(String(c.code))) {
      const mins = Math.max(1, Math.ceil(dur / 60)), hosp = ZOS_DATA.hospitals.find(h => h.id === (cs.lzsTargetHospitalId || 'h-cb')) || {};
      const poly = ['dn_poly', 'amput'].includes(cs.ind) || (['trauma', 'dn_lehke'].includes(cs.ind) && cs.nOrig === 1);
      const tail = poly ? this._centreTail(cs, mins).replace(/, dojezd \d+ minut$/, '') : '';
      this._crewCall(c, cs, `směřujeme ${hosp.id === 'h-fnkv' ? 'popáleninové centrum Vinohrady' : 'ARO ' + (hosp.name || 'Nemocnice České Budějovice')}, přílet na heliport za ${mins} minut${tail}.`, [{ k: 'ok', label: 'Rozumí, nahlásíme', say: 'ZCB101 rozumí, nahlásíme.', ok: true, act: 'ack', def: true }], 'info', 'K' + String(c.code).replace(/\D/g, ''));
    }
    if ((cs.patientsRemaining || 1) > 0) {
      cs.patientsHandled = (cs.patientsHandled || 0) + 1;
      cs.patientsRemaining = Math.max(0, cs.patientCount - cs.patientsHandled);
    }
    if ((cs.patientCount || 1) <= 1) {
      for (const id of cs.crews.slice()) {
        const sceneCrew = this.crewOf(id);
        if (sceneCrew && (sceneCrew.type === 'RZP' || sceneCrew.type === 'RV') && sceneCrew.state === 'onscene' && sceneCrew.caseRole !== 'heli-transfer') {
          this.L('crew', `${sceneCrew.name}: po odletu LZS uvolněna od události`, cs.id, sceneCrew.id);
          this._release(sceneCrew);
        }
      }
    }
  }
  // cílový typ pracoviště: kardio nestabilní na nejbližší kardiocentrum (ČB nebo Jihlava), suicidální z Jindřichohradecka občas do Jihlavy
  _destType(cs, c) {
    const t = cs.hospType || 'okresni', up = (cs.up || '').toLocaleUpperCase('cs-CZ');
    if (cs.ind === 'psych' && t === 'okresni' && (c.oblast === 'JH' || cs.okres === 'Jindřichův Hradec') && /SUICID/.test(up)) {
      if (cs.psychDest == null) cs.psychDest = this.rnd() < 0.45 ? 'psych' : 'okresni';
      return cs.psychDest;
    }
    return t;
  }
  _deptFor(h, cs, type) {
    const has = k => !h.depts || h.depts.includes(k), up = (cs.up || '').toLocaleUpperCase('cs-CZ');
    if (type === 'popaleniny') return DEPT.popaleniny;
    if (type === 'pci') return DEPTN.pci;
    if (type === 'psych') return DEPTN.psy;
    if (type === 'iktove') return has('kcc') && h.depts ? DEPTN.kcc : DEPTN.ikt;
    if (type === 'trauma') return has('trauma') && h.depts ? DEPTN.trauma : has('chir') && h.depts ? DEPTN.chir : DEPTN.up;
    const traumaInd = ['trauma', 'trauma_dite', 'dn_lehke', 'dn_poly', 'amput', 'popal'].includes(cs.ind);
    if (cs.ind === 'gyn' && has('gyn')) return DEPTN.gyn;
    if (/ORL|EPISTAX|Z NOSU/.test(up) && has('orl') && h.depts) return DEPTN.orl;
    if (cs.child && !traumaInd && has('det')) return DEPTN.det;
    if (!traumaInd && h.depts && has('aro') && (cs.fate === 'rosc' || (cs.nOrig === 1 && cs.n === 1))) return DEPTN.aro;
    if (traumaInd && h.depts && has('chir')) return DEPTN.chir;
    return DEPTN.up;
  }
  _handoverSec(cs) {
    const u = this.rnd(); let v = HO_Q[HO_Q.length - 1][1];
    for (let i = 1; i < HO_Q.length; i++) if (u <= HO_Q[i][0]) { const [a0, b0] = HO_Q[i - 1], [a1, b1] = HO_Q[i]; v = b0 + (b1 - b0) * (u - a0) / (a1 - a0); break; }
    return v * (cs && cs.n === 1 ? 1.35 : 1);
  }
  _startLzsGroundTransfer(c, cs) {
    const t = this.s.t, D = ZOS_DATA;
    const h = D.hospitals.find(x => x.id === cs.lzsTargetHospitalId) || D.hospitals.find(x => x.id === 'h-cb');
    const dept = cs.lzsTargetHospitalId === 'h-fnkv' ? 'Popáleninové centrum' : this._deptFor(h, cs, cs.hospType);
    const dur = this._go(c, h.lat, h.lon, 'P2');
    c.dest = { hid: h.id, name: `${h.short} – ${dept}`, type: cs.hospType };
    const handoverEstimate = 700;
    c.hospitalRun = { hospitalName: c.dest.name, phase: 'transport', handoverSec: null, availableAt: t + dur + handoverEstimate + driveSec(this._eta(h.lat, h.lon, c.home.lat, c.home.lon), 'RET') };
    c.until = t + dur; c.state = 'transport';
    cs.transported = true; cs.dest = c.dest.name; cs.lzsState = 'pozemní převoz';
    this.L('crew', `${c.name}: převzala pacienta od LZS, převoz na ${c.dest.name}`, cs.id, c.id);
  }
  _returnLzs(c, cs) {
    const t = this.s.t, home = c.home;
    const dur = this._goAir(c, home.lat, home.lon);
    c.until = t + dur; c.state = 'free'; c.caseId = null; c.caseRole = null; c.arrivedAt = null; c.dest = null; c.lzsLeg = 'returning';
    c.callsCompleted = (c.callsCompleted || 0) + 1;
    if (c.externalLzs) { c.supportRequested = false; c.supportRequestedFor = null; }
    if (cs) {
      cs.lzsState = 'vrtulník se vrací na základnu';
      cs.crews = cs.crews.filter(id => id !== c.id);
      this._checkClose(cs);
    }
    this.L('crew', `${c.name}: vzlet z heliportu, návrat na základnu`, cs ? cs.id : null, c.id);
  }
  _startTransport(c, cs) {
    const t = this.s.t, D = ZOS_DATA, escorts = [], leaving = [];
    // Při transportu jediného pacienta se RV nenechává čekat na prázdném místě.
    // Vrací se na základnu, ať už je na místě, nebo ještě na cestě.
    if (c.type === 'RZP' && c.caseRole !== 'heli-transfer' && cs.typ !== 'sekundární' && (cs.patientCount || cs.pocet || 1) <= 1) {
      for (const id of [...cs.crews]) {
        const rv = this.crewOf(id);
        if (rv && rv.type === 'RV' && rv.caseRole !== 'heli-transfer' && rv.caseId === cs.id) {
          if (rv.state !== 'onscene') { this.L('crew', `${rv.name}: RZP odváží jediného pacienta, RV se vrací na základnu`, cs.id, rv.id); this._release(rv); continue; }
          // doprovod: po KPR vždy, N1 většinou, N2 hlavně děti, N3 výjimečně
          const pEsc = cs.fate === 'rosc' ? 1 : cs.n === 1 ? 0.85 : cs.n === 2 ? (cs.child ? 0.8 : 0.35) : 0.06;
          if (this.rnd() < pEsc) escorts.push(rv);
          else leaving.push(rv);
        }
      }
    }
    const type = cs.mu ? this.pick(['okresni', 'okresni', 'trauma']) : this._destType(cs, c);
    const selectedCapacity = cs.mu && cs.mu.hospitalCapacities && cs.mu.hospitalCapacities.find(x => x.hospitalId === cs.targetHospitalId);
    let best = cs.targetHospitalId && (!selectedCapacity || (selectedCapacity.remaining > 0 && selectedCapacity.state !== 'dočasně nepřijímá')) ? D.hospitals.find(h => h.id === cs.targetHospitalId && h.types.includes(type)) : null, bd = 1e9;
    if (!best) for (const h of D.hospitals) {
      if (!h.types.includes(type)) continue;
      const cap = cs.mu && cs.mu.hospitalCapacities && cs.mu.hospitalCapacities.find(x => x.hospitalId === h.id);
      if (cap && (cap.remaining <= 0 || cap.state === 'dočasně nepřijímá')) continue;
      const d = this._eta(c.lat, c.lon, h.lat, h.lon);
      if (d < bd) { bd = d; best = h; }
    }
    // posádka veze pacienta do nemocnice své oblasti (vrátí se domů), pokud tam mají potřebné pracoviště
    if (best && !cs.targetHospitalId && !cs.mu && best.oblast && best.oblast !== c.oblast) {
      const own = D.hospitals.find(h => h.oblast === c.oblast && h.types.includes(type));
      if (own) best = own;
    }
    best = best || D.hospitals[0];
    const pmode = cs.n <= 2 || cs.fate === 'rosc' ? 'P2' : 'P3'; // NACA IV–VI v režimu N2, jinak N3
    const dur = this._go(c, best.lat, best.lon, pmode);
    const dept = this._deptFor(best, cs, type);
    const dsay = this._destSay(best, dept);
    c.dest = { hid: best.id, name: best.short + ' – ' + dept, type, say: dsay.text };
    const handoverEstimate = 700;
    c.hospitalRun = { hospitalName: c.dest.name, phase: 'transport', handoverSec: null, availableAt: t + dur + handoverEstimate + driveSec(this._eta(best.lat, best.lon, c.home.lat, c.home.lon), 'RET') };
    if (cs.mu && cs.mu.hospitalCapacities) {
      const cap = cs.mu.hospitalCapacities.find(x => x.hospitalId === best.id);
      if (cap) { cap.remaining = Math.max(0, cap.remaining - 1); if (!cap.remaining) cap.state = 'dočasně nepřijímá'; }
    }
    c.until = t + dur; c.state = 'transport';
    cs.transported = true; cs.dest = c.dest.name;
    this.L('crew', `${c.name}: transport – ${c.dest.name}`, cs.id, c.id);
    // hlášení cíle transportu rádiem (vždy při odjezdu z místa); u centrové péče s dojezdem a avízem přes ZOS
    const primaryRun = c.type === 'RZP' && !cs.mu && cs.typ !== 'sekundární' && c.caseRole !== 'heli-transfer';
    const mins = Math.max(5, Math.round(dur / 300) * 5);
    const centreTail = dsay.centre ? this._centreTail(cs, mins) : '';
    const ackOpts = dsay.centre ? [{ k: 'ok', label: 'Rozumí, nahlásíme', say: 'ZCB101 rozumí, nahlásíme.', ok: true, act: 'ack', def: true }, { k: 'plain', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack' }] : [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }];
    const loaded = this.pick(['pacienta máme naloženého', 'pacienta máme na palubě', 'pacienta máme ve voze']);
    for (const rv of escorts) {
      rv.caseRole = 'escort'; rv.escortFree = cs.fate !== 'rosc' && cs.n >= 2 && this.rnd() < 0.6;
      rv.dest = { hid: best.id, name: c.dest.name, type };
      this._go(rv, best.lat, best.lon, pmode); rv.state = 'transport'; rv.until = t + dur;
    }
    if (primaryRun && escorts.length) {
      const rv = escorts[0];
      this._crewCall(rv, cs, `${loaded} a jedeme společně ${dsay.text}${centreTail}${rv.escortFree ? ', my jsme odvolatelní' : ''}.`, ackOpts, 'info', `${rv.code} a ${c.code}`);
    }
    for (const rv of leaving) {
      const leaveDest = `${dept === 'Urgentní příjem' ? 'na urgent' : (DEPT_ACC[dept] || '')} do ${best.gen || best.short}`;
      this._crewCall(rv, cs, `pacienta převáží posádka ${c.code} ${leaveDest}${centreTail} a my ${this.rnd() < 0.5 ? 'se vracíme zpátky na základnu' : 'jsme volní'}.`, ackOpts, 'info', rv.code);
      this._release(rv);
    }
    if (primaryRun && dsay.second && c.mv && c.mv.path) {
      // hlásí se jen ten, kdo kruháčem (Okružní × silnice č. 3) skutečně projíždí
      const P = c.mv.path, K = KRUHAC; let bi = -1, bd = 1e9;
      for (let i = 0; i < P.length / 2; i++) { const d = hav(P[i * 2], P[i * 2 + 1], K.lat, K.lon); if (d < bd) { bd = d; bi = i; } }
      if (bd < 0.3 && bi > 0) c.kruhacAt = c.mv.t0 + (c.mv.t1 - c.mv.t0) * c.mv.frac[bi];
    }
    if (primaryRun && (cs.patientCount || 1) === 1 && !escorts.length) this._announceVstricna(c, cs, best, dur, leaving.length ? null : `${loaded} a jedeme ${dsay.text}${centreTail}`, ackOpts);
    else if (primaryRun && !escorts.length && !leaving.length) this._crewCall(c, cs, `${loaded} a jedeme ${dsay.text}${centreTail}.`, ackOpts, 'info');
  }
  // cíl transportu v rádiovém žargonu (1. pád): „urgentní příjem Tábor“, „KCC České Budějovice“
  _destSay(h, dept) {
    const town = String(h.name || h.short).replace(/^(Fakultní nemocnice|Nemocnice) /, '');
    const D = { 'Urgentní příjem': 'urgentní příjem', 'Chirurgická ambulance': 'chirurgie', 'Iktové centrum': 'iktové centrum', 'KCC – komplexní cerebrovaskulární centrum': 'KCC', 'ARO': 'ARO', 'Dětské oddělení': 'dětské oddělení', 'Gynekologicko-porodnické oddělení': 'gynekologie', 'ORL': 'ORL', 'Traumacentrum': 'traumacentrum', 'Kardiocentrum – katetrizační sál': 'kardioJIP', 'Psychiatrické oddělení': 'psychiatrie', 'Popáleninové centrum': 'popáleninové centrum' }[dept] || String(dept).toLocaleLowerCase('cs-CZ');
    const centre = ['KCC', 'traumacentrum', 'iktové centrum', 'ARO', 'kardioJIP'].includes(D);
    const second = h.id === 'h-cb' && ['KCC', 'traumacentrum', 'ARO', 'kardioJIP', 'dětské oddělení'].includes(D);
    return { text: h.id === 'h-cb' && ['ARO', 'kardioJIP', 'traumacentrum'].includes(D) ? `${D} Nemocnice České Budějovice` : `${D} ${town}`, centre, second };
  }
  // avízo do centra: dojezd zaokrouhlený na 5 min, u polytraumatu pohlaví, věk, trauma triage, ventilace
  _centreTail(cs, mins) {
    const poly = ['dn_poly', 'amput'].includes(cs.ind) || (['trauma', 'dn_lehke'].includes(cs.ind) && cs.nOrig === 1);
    if (!poly) return `, dojezd ${mins} minut`;
    if (!cs.triage) cs.triage = { why: this.pick(['mechanismus', 'mechanismus', 'anatomie', 'fyziologie']), vent: this.rnd() < 0.75 ? 'spontánně ventilující' : 'UPV' };
    return `, polytrauma, ${cs.sex === 'Ž' ? 'žena' : 'muž'} ${cs.age} let, triage pozitivní – ${cs.triage.why}, ${cs.triage.vent}, dojezd ${mins} minut`;
  }
  _announceVstricna(rzp, cs, hospital, routeDuration, baseMsg, ackOpts) {
    const distanceSec = this._eta(rzp.mv.a[0], rzp.mv.a[1], hospital.lat, hospital.lon);
    const trauma = /trauma|dopravní nehoda|amputace|popálení/i.test(cs.klasif);
    const fitChance = cs.n === 3 ? (trauma ? 0.06 : 0.50) : cs.n === 2 ? (trauma ? 0.02 : 0.16) : 0;
    const suitable = this.rnd() < fitChance;
    const nearest = ZOS_DATA.stations.reduce((a, x) => !a || hav(x.lat, x.lon, hospital.lat, hospital.lon) < hav(a.lat, a.lon, hospital.lat, hospital.lon) ? x : a, null);
    const area = nearest && nearest.oblast;
    const receiver = this.s.crews.filter(k => k.type === 'RZP' && k.oblast === area && this.avail(k) && !k.res && k.caseId !== cs.id);
    const canOffer = suitable && receiver.length > 0 && routeDuration > 12 * 60;
    // Vstřícnou řeší jen periferní posádky; „dojedeme sami / je schopen překladu“ se říká jen z periferie.
    // Vstřícná má smysl jen u dlouhých přejezdů po pomalejších silnicích (např. Dačice → JH, Vyšší Brod → ČK),
    // ne tam, kde se jede po dálnici či rychlé silnici (Veselí, Soběslav → Tábor): čas trasy po síti s rychlostmi jízdy s VRZ.
    const homeSec = rzp.home ? this._eta(rzp.home.lat, rzp.home.lon, hospital.lat, hospital.lon) : distanceSec;
    const ack = ackOpts || [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }];
    if (homeSec < 17 * 60 || distanceSec < 20 * 60 || hospital.ext) {
      cs.vstricna = { state: 'not-needed', hospitalId: hospital.id, area, distanceSec };
      if (baseMsg) this._crewCall(rzp, cs, `${baseMsg}.`, ack, 'info');
      return;
    }
    const head = baseMsg || `pacienta máme ve voze a jedeme ${(rzp.dest && rzp.dest.say) || hospital.short}`;
    if (!suitable) {
      cs.vstricna = { state: 'not-suitable', hospitalId: hospital.id, area, distanceSec };
      this._crewCall(rzp, cs, `${head}, dojedeme sami.`, ack, 'info');
    } else if (canOffer) {
      cs.vstricna = { state: 'offered', hospitalId: hospital.id, hospitalName: rzp.dest.name, hospitalLat: hospital.lat, hospitalLon: hospital.lon, area, areaName: nearest.short, areaGen: (ZOS_DATA.oblastGen || {})[area] || nearest.short, distanceSec, routeDuration, primaryCrewId: rzp.id, meet: this._meetPoint(rzp.mv, 0.68), helperCrewId: null, expiresAt: this.s.t + Math.max(240, routeDuration * 0.68) };
      cs.vstricna.freeAtOffer = receiver.length;
      const opts = receiver.slice(0, 3).map((k, i) => ({ k: 'vj' + i, label: `Naproti ${this._label(k)} (${k.code})`, say: null, ok: true, act: 'vj-assign', crewId: k.id }));
      opts.push({ k: 'self', label: 'Dojíždějte sami', say: null, ok: true, act: 'vj-decline', def: true });
      this._crewCall(rzp, cs, `${head}, je schopen překladu.`, opts, 'vj');
    } else {
      cs.vstricna = { state: 'self-unavailable', hospitalId: hospital.id, area, distanceSec };
      this._crewCall(rzp, cs, `${head}, je schopen překladu.`, [
        { k: 'self', label: 'Dojíždějte sami', say: 'ZCB101 rozumí, dojíždějte sami.', ok: true, act: 'vj-self', def: true },
        { k: 'wait', label: 'Rozumí, zjistím vstřícnou', say: 'ZCB101 rozumí, vstřícnou zjišťujeme.', ok: false, act: 'ack' }], 'info');
    }
  }
  _meetPoint(mv, f) {
    if (mv && mv.path && mv.frac && mv.frac.length) {
      let i = mv.frac.findIndex(x => x >= f); if (i < 0) i = mv.frac.length - 1;
      return { lat: mv.path[i * 2], lon: mv.path[i * 2 + 1] };
    }
    return { lat: mv.a[0] + (mv.b[0] - mv.a[0]) * f, lon: mv.a[1] + (mv.b[1] - mv.a[1]) * f };
  }
  assignVstricna(caseId, crewId) {
    const cs = this.caseOf(caseId), helper = this.crewOf(crewId);
    if (!cs || !helper || !cs.vstricna || cs.vstricna.state !== 'offered') return { ok: false, msg: 'Vstřícná jízda už není k dispozici.' };
    if (helper.type !== 'RZP' || helper.oblast !== cs.vstricna.area) return { ok: false, msg: `Vstřícnou jízdu může převzít volná RZP z oblasti ${cs.vstricna.areaName}.` };
    if (!this.avail(helper)) return { ok: false, msg: 'Posádka už není volná.' };
    const primary = this.crewOf(cs.vstricna.primaryCrewId), t = this.s.t;
    if (!primary || primary.state !== 'transport' || !primary.mv || t >= cs.vstricna.expiresAt) {
      cs.vstricna.state = 'expired';
      return { ok: false, msg: 'RZP už je příliš blízko nemocnici; pokračuje sama.' };
    }
    const current = this.pos(primary);
    const freeN = this._freeRzp(cs.vstricna.area);
    const meet = this._balancedMeet(primary, helper);
    if (!meet || hav(current.lat, current.lon, meet.lat, meet.lon) < 0.8) { cs.vstricna.state = 'expired'; return { ok: false, msg: 'RZP už je příliš blízko nemocnici; pokračuje sama.' }; }
    primary.lat = current.lat; primary.lon = current.lon; primary.mv = null;
    primary.dest = { name: 'Místo setkání se vstřícnou RZP' };
    primary.caseRole = 'vstricna-primary'; primary.until = t + this._go(primary, meet.lat, meet.lon, 'P3');
    primary.state = 'transport';
    const helperWasBase = helper.state === 'base';
    const pos = this.pos(helper); helper.lat = pos.lat; helper.lon = pos.lon; helper.mv = null;
    helper.caseId = cs.id; helper.caseRole = 'vstricna-support'; helper.vstricnaMeet = meet; helper.state = 'call'; helper.dispatchAt = t; helper.turn = helperWasBase ? this.rr(60, 120) : this.rr(20, 45); helper.until = t + helper.turn; helper.turnoutAlerted = true;
    helper.dest = { name: 'Místo vstřícné jízdy' };
    cs.crews.push(helper.id); cs.asg.push({ crewId: helper.id, t, eta: helper.turn + this._eta(helper.lat, helper.lon, meet.lat, meet.lon), role: 'vstricna-support' });
    cs.vstricna.meet = meet; cs.vstricna.helperCrewId = helper.id; cs.vstricna.state = 'dispatched';
    this.L('crew', `ZCB101 rozumí, naproti z ${cs.vstricna.areaGen || cs.vstricna.areaName} posádka ${helper.code}.`, cs.id, helper.id);
    this.L('crew', `ZCB${primary.code} rozumí, naproti ${helper.code} z ${cs.vstricna.areaGen || cs.vstricna.areaName}.`, cs.id, primary.id);
    if (freeN < 2) this._opsScore(-3, `vstřícná jízda bez 2 volných RZP v oblasti ${cs.vstricna.areaName} (${cs.num})`, cs.id);
    else this._opsScore(1, `vstřícná jízda využita u ${cs.num}`, cs.id);
    this.L('crew', `${helper.name}: vstřícná jízda, místo setkání ${meet.place || 'na trase'} (bezpečné odstavení).`, cs.id, helper.id);
    return { ok: true, eta: helper.until - t + this._eta(helper.lat, helper.lon, meet.lat, meet.lon) };
  }
  // Místo setkání na trase primární RZP: obě posádky tam mají dorazit přibližně současně (časově „na půli cesty“).
  _balancedMeet(primary, helper) {
    const mv = primary.mv, t = this.s.t;
    if (!mv) return null;
    const total = Math.max(1, mv.t1 - mv.t0), now = clamp01((t - mv.t0) / total);
    const hp = this.pos(helper), turn = helper.state === 'base' ? 90 : 30;
    const pts = [];
    if (mv.path && mv.frac && mv.frac.length) { for (let i = 0; i < mv.frac.length; i++) if (mv.frac[i] > now + 0.02 && mv.frac[i] < 0.97) pts.push({ f: mv.frac[i], lat: mv.path[i * 2], lon: mv.path[i * 2 + 1] }); }
    else for (let f = Math.ceil((now + 0.02) * 40) / 40; f < 0.97; f += 0.025) pts.push({ f, lat: mv.a[0] + (mv.b[0] - mv.a[0]) * f, lon: mv.a[1] + (mv.b[1] - mv.a[1]) * f });
    if (!pts.length) return null;
    const step = Math.max(1, Math.floor(pts.length / 60));
    let best = null, bd = Infinity;
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i], tp = (p.f - now) * total, th = turn + driveSec(this._eta(hp.lat, hp.lon, p.lat, p.lon), 'N3');
      const d = Math.abs(tp - th) + Math.max(tp, th) * 0.05;
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return null;
    let place = '';
    try { let tw = null, tdist = 1e9; for (const x of ZOS_DATA.towns || []) { const dd = hav(best.lat, best.lon, x.lat, x.lon); if (dd < tdist) { tdist = dd; tw = x; } } if (tw) place = tdist < 2 ? `v obci ${tw.n}` : `u obce ${tw.n}`; } catch (_) {}
    return { lat: best.lat, lon: best.lon, f: best.f, place };
  }
  _completeVstricna(cs) {
    const plan = cs && cs.vstricna, primary = plan && this.crewOf(plan.primaryCrewId), helper = plan && this.crewOf(plan.helperCrewId);
    if (!plan || plan.state !== 'dispatched' || !primary || !helper || primary.state !== 'onscene' || helper.state !== 'onscene') return false;
    const hospital = ZOS_DATA.hospitals.find(h => h.id === plan.hospitalId);
    if (!hospital) return false;
    const t = this.s.t;
    // předání pacienta mezi vozy: 2–5 min
    if (plan.handoverEnd == null) {
      plan.handoverEnd = t + this.rr(120, 300);
      primary.until = helper.until = plan.handoverEnd;
      this.L('crew', `ZCB${primary.code} a ZCB${helper.code} na místě setkání, probíhá předání pacienta.`, cs.id, primary.id);
      return true;
    }
    if (t < plan.handoverEnd) { primary.until = helper.until = plan.handoverEnd; return true; }
    plan.state = 'completed';
    this.L('crew', `ZCB${primary.code}: pacient předán posádce ZCB${helper.code}, vstřícná jízda dokončena.`, cs.id, primary.id);
    this._release(primary);
    helper.caseRole = 'vstricna-destination'; helper.dest = { hid: hospital.id, name: plan.hospitalName, type: cs.hospType };
    const dur = this._go(helper, hospital.lat, hospital.lon, 'P3'); helper.state = 'transport'; helper.until = this.s.t + dur;
    cs.transported = true; cs.dest = plan.hospitalName;
    this.L('crew', `${helper.name}: pokračuje s pacientem do ${plan.hospitalName}`, cs.id, helper.id);
    return true;
  }
  _release(c) {
    const s = this.s, t = s.t;
    const cs = this.caseOf(c.caseId);
    if (c.type === 'LZS') return this._returnLzs(c, cs);
    const leavingHospital = c.state === 'handover' && !!c.hospitalRun;
    c.callsCompleted = (c.callsCompleted || 0) + 1;
    const p = this.pos(c);
    c.lat = p.lat; c.lon = p.lon; c.caseId = null; c.dest = null; c.arrivedAt = null;
    c.caseRole = null;
    c.lat = p.lat; c.lon = p.lon; c.mv = null;
    const dur = this._go(c, c.home.lat, c.home.lon, 'RET');
    c.state = 'free'; c.until = t + dur;
    if (leavingHospital) { c.hospitalRun.phase = 'return'; c.hospitalRun.availableAt = c.until; }
    this.L('crew', `${c.name}: volný`, cs ? cs.id : null, c.id);
    if (cs) this._checkClose(cs);
  }
  _toBase(c) {
    const t = this.s.t;
    c.mv = null;
    if (c.liberoId) this._detachLibero(c);
    if (c.externalLzs && !c.supportRequested) { c.state = 'off'; c.pendingOff = false; c.lat = c.home.lat; c.lon = c.home.lon; }
    else if (c.pendingOff) { c.state = 'off'; c.pendingOff = false; c.lat = c.home.lat; c.lon = c.home.lon; if (c.externalLzs && c.externalDayOnly) { c.supportRequested = false; c.supportRequestedFor = null; } this.L('crew', `${c.name}: odhlášena`, null, c.id); }
    else if (c.res && t >= c.dutyEnd) { c.state = 'off'; c.lat = c.home.lat; c.lon = c.home.lon; }
    else { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; }
    c.lzsLeg = null; c.hospitalRun = null;
  }
  _checkClose(cs) {
    if (this._busyCrews(cs).length) return;
    if (cs.exitus) {
      if (cs.exam && cs.exam.needed && !cs.exam.done) { cs.status = 'waiting'; cs.waitSince = this.s.t; cs.examPending = true; return; }
      cs.examPending = false;
      if (cs.coroner && (cs.coroner.state === 'pending' || (cs.coroner.state === 'available' && this.s.t < cs.coroner.until))) { cs.status = 'active'; return; }
      return this._close(cs, false);
    }
    const sent = cs.initialDispatchSent || [];
    // lékaře (RV) může nahradit LZS – posádka vrtulníku má lékaře
    const missingDispatch = (cs.initialDispatchRequired || []).filter(type => !(sent.includes(type) || (type === 'RV' && (sent.includes('LZS') || cs.docAssigned))));
    if (missingDispatch.length) { cs.status = 'active'; return; }
    if (cs.lzsTransferRequired && !cs.lzsTransferred) { cs.status = 'waiting'; cs.waitSince = this.s.t; return; }
    if (cs.mu) { if (cs.mu.left <= 0) this._close(cs, false); else { cs.status = 'waiting'; cs.waitSince = this.s.t; } return; }
    if ((cs.patientCount || 1) > 1 && (cs.patientsRemaining || 0) > 0) { cs.status = 'waiting'; cs.waitSince = this.s.t; return; }
    if (cs.arrived) this._close(cs, false);
    else { cs.status = 'waiting'; cs.waitSince = this.s.t; }
  }
  _close(cs, unserved) {
    const s = this.s;
    cs.status = 'closed'; cs.closedAt = s.t; cs.unserved = !!unserved && !cs.arrived;
    if (cs.mu && !s.cases.some(c => c !== cs && c.mu && c.status !== 'closed')) s.muPlayerRole = null;
    if (cs.typ === 'sekundární') {
      cs.score = cs.timeScore == null ? null : { total: cs.timeScore, timing: cs.timeScore, delta: cs.scheduleDelta };
      if (cs.score) {
        s.agg.secondaryCount = (s.agg.secondaryCount || 0) + 1;
        s.agg.secondarySum = (s.agg.secondarySum || 0) + cs.timeScore;
        if (cs.timeScore >= 80) s.agg.secondaryOnTime = (s.agg.secondaryOnTime || 0) + 1;
      }
      this.L(cs.unserved ? 'warn' : 'case', cs.unserved ? `${cs.num}: sekundární převoz neobsloužen` : `${cs.num}: sekundární převoz dokončen`, cs.id);
      return;
    }
    if (cs.unserved) this._opsScore(-8, `neobsloužený případ ${cs.num}`, cs.id);
    cs.score = this._scoreCase(cs);
    const a = s.agg, w = { 1: 3, 2: 2, 3: 1 }[cs.nOrig] || 1;
    a.sw += w; a.sv += w * cs.score.total; a.closed++;
    if (cs.unserved) a.unserved++;
    if (cs.firstArrive != null) {
      const arr = cs.firstArrive - cs.readyAt;
      if (cs.nOrig === 1) { a.arrSum1 += arr; a.arrN1++; }
      a.legalN++; if (cs.firstAssign != null && cs.firstArrive - cs.asg[0].t <= 1200) a.legalOk++;
    }
    this.L(unserved && !cs.arrived ? 'warn' : 'case', unserved && !cs.arrived ? `${cs.num}: neobslouženo, uzavřeno` : `${cs.num}: uzavřeno, ${Math.round(cs.score.total)} b.`, cs.id);
  }

  // ---------- skóre ----------
  _scoreCase(c) {
    const t = this.s.t;
    const none = { delay: 0, arrive: 0, rv: 0, eff: 0, pen: 0, total: 0 };
    if (c.asg.length === 0 || c.firstAssign == null && c.firstArrive == null) { if (!c.arrived) return none; }
    const n = c.nOrig;
    const tgtD = { 1: 60, 2: 120, 3: 300 }[n], T = { 1: 720, 2: 960, 3: 1500 }[n];
    const fa = c.asg.length ? c.asg[0].t : t;
    const delay = 20 * clamp01(1 - ((fa - c.readyAt) - tgtD) / (2 * tgtD));
    // příjezd: hodnotí se volba posádky proti nejrychlejší dostupné (ne absolutní čas, ten dispečer vždy neovlivní)
    let arrive;
    if (c.pick) { const over = c.pick.justified ? 0 : Math.max(0, c.pick.chosen - c.pick.best - (n === 3 ? 480 : 120)); arrive = 50 * clamp01(1 - over / (T * 0.6)); }
    else arrive = c.firstArrive != null ? 50 * clamp01(1 - ((c.firstArrive - c.readyAt) - T) / T) : 0;
    const rv = this._rvScore(c);
    const eff = c.mu ? ((c.closedAt != null && c.closedAt - c.readyAt <= 7200) ? 15 : 8) : 15 * Math.min(1, (c.effRatio == null ? 1 : c.effRatio) / 0.85);
    const pen = c.pen;
    const total = Math.max(0, delay + arrive + rv + eff - pen);
    return { delay, arrive, rv, eff, pen, total };
  }
  _rvScore(c) {
    if (c.rvScoreLock != null) return c.rvScoreLock;
    if (c.mu) return c.mu.firstMU != null ? (c.mu.firstMU - c.readyAt <= 2400 ? 15 : 8) : 0;
    const activeRvReq = c.rvReq && !c.rvReq.cancelled;
    const needed = c.rvNeed || !!activeRvReq;
    if (!needed) return c.docAssigned ? 6 : 15;
    if (!c.docAssigned) return 0;
    if (activeRvReq) { const lag = (c.rvReq.satT != null ? c.rvReq.satT : c.docAssignT) - c.rvReq.t; return lag <= 240 ? 15 : lag <= 600 ? 9 : 3; }
    const lag = c.docAssignT - c.readyAt;
    return lag <= 240 ? 15 : lag <= 600 ? 10 : 5;
  }

  _coverage() {
    const s = this.s, cv = s.cov;
    if (s.t < cv.next) return;
    cv.next = s.t + 90;
    const crews = s.crews.filter(c => c.type === 'RZP' && this.avail(c)).map(c => this.pos(c));
    const T = ZOS_DATA.towns;
    let times = null;
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) times = ROUTER.coverage(crews.map(p => [p.lat, p.lon, 60]), T.map(tw => [tw.lat, tw.lon]));
    let tot = 0, ok = 0;
    T.forEach((tw, i) => {
      tot += tw.w;
      let best = times ? times[i] : 1e9;
      if (!times) for (const p of crews) { const e2 = travelSec(p.lat, p.lon, tw.lat, tw.lon) + 60; if (e2 < best) best = e2; }
      best = driveSec(best, 'N2');
      ok += tw.w * (best <= 900 ? 1 : best <= 1200 ? 0.5 : 0);
    });
    cv.n++; cv.sum += tot ? ok / tot : 1; cv.last = tot ? ok / tot : 1;
  }

  summary() {
    const s = this.s, a = s.agg, W = { 1: 3, 2: 2, 3: 1 };
    let sw = a.sw, sv = a.sv;
    for (const c of s.cases) {
      if (c.status === 'closed' || c.status === 'intake' || c.typ === 'sekundární') continue;
      const sc = this._scoreCase(c), w = W[c.nOrig];
      sw += w; sv += w * sc.total;
    }
    const caseAvg = sw ? sv / sw : 0;
    const cov = s.cov.n ? s.cov.sum / s.cov.n * 100 : 100;
    const baseTotal = sw ? 0.75 * caseAvg + 0.25 * cov : 0;
    const opsPoints = a.opsPoints || 0;
    const total = Math.max(0, Math.min(100, baseTotal + opsPoints));
    return {
      total, baseTotal, opsPoints, opsLog: a.opsLog || [], caseAvg, coverage: cov, closed: a.closed, unserved: a.unserved, diversions: a.diversions,
      avgN1: a.arrN1 ? a.arrSum1 / a.arrN1 : null, legalPct: a.legalN ? a.legalOk / a.legalN * 100 : null,
      secondaryCompleted: a.secondaryCount || 0, secondaryAvg: a.secondaryCount ? a.secondarySum / a.secondaryCount : null,
      secondaryOnTime: a.secondaryOnTime || 0,
      cases: s.cases.filter(c => c.status !== 'intake').length, covNow: s.cov.last == null ? null : s.cov.last * 100,
    };
  }
  serialize() { return JSON.stringify(this.s); }
  static restore(json) { return new Sim(null, typeof json === 'string' ? JSON.parse(json) : json); }
}

if (typeof module !== 'undefined') module.exports = { Sim, hav, travelSec };
