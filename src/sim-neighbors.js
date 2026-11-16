// Mezikrajská a přeshraniční spolupráce – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimNeighbors {
  // ---------- mezikrajská a přeshraniční spolupráce ----------
  // Naše žádost o cizí posádku (pozemní z Vysočiny, Plzeňska, Středních Čech, Bavorska nebo LZS): odpověď operačního střediska po 60–180 s,
  // souhlas přibližně 70 %, jinak odmítnutí s důvodem. Pozemní jen když vlastní volná posádka není do 20 min.
  requestNeighbor(caseId, crewId) {
    const cs = this.caseOf(caseId), c = this.crewOf(crewId), t = this.s.t;
    if (!cs || !c || !c.ext) return { ok: false, msg: 'Požádat lze jen posádku z jiného kraje.' };
    if (cs.status === 'closed' || cs.status === 'intake' || cs.typ === 'sekundární') return { ok: false, msg: 'Pomoc lze žádat jen k otevřenému primárnímu výjezdu.' };
    const nb = ZOS_DATA.neighbors[c.region] || { short: '' };
    if (c.nbAsk && c.nbAsk.state === 'asked') return { ok: false, msg: `${c.name}: už čekáme na odpověď.` };
    if (c.nbBusyUntil && t < c.nbBusyUntil) return { ok: false, msg: `${c.name} před chvílí odmítla; zkus jiného souseda nebo později.` };
    if (c.state !== 'off' || c.supportRequested) return { ok: false, msg: `${c.name} už není k dispozici.` };
    if (c.externalLzs) {
      if (this._ownLzsFlyable()) return { ok: false, msg: 'Vlastní LZS je dostupná.' };
      if (c.externalDayOnly && !this._isLzsDay()) return { ok: false, msg: `${c.name} je v simulaci dostupná jen v denní době.` };
    } else {
      const own = this.s.crews.filter(k => k.type === 'RZP' && !k.ext && this.avail(k)).map(k => this.etaFor(k, cs.lat, cs.lon, cs.n));
      const best = own.length ? Math.min(...own) : Infinity;
      if (best <= 1200) return { ok: false, msg: `Vlastní volná RZP je do ${Math.ceil(best / 60)} min; o pomoc z jiného kraje lze žádat, až když je dojezd nad 20 min nebo není žádná volná.` };
      const d = hav(cs.lat, cs.lon, c.home.lat, c.home.lon);
      if (c.foreign && d > 30) return { ok: false, msg: `${c.name} pomáhá jen v příhraničním pásu (do 30 km od základny).` };
      if (d > 50) return { ok: false, msg: `${c.name} je příliš daleko (${Math.round(d)} km, limit je 50 km).` };
    }
    c.nbAsk = { caseId, askedAt: t, answerAt: t + this.rr(60, 180), state: 'asked' };
    this.L('alert', `Požádáno o pomoc: ${c.name} (${nb.short}) k ${cs.num}. Čeká se na odpověď operačního střediska.`, cs.id, c.id);
    return { ok: true, msg: `Požádáno: ${c.name}. Odpověď přijde za 1–3 min.` };
  }
  // vlastní LZS je použitelná jen když je volná a zároveň se dá letět (v neletovém počasí o cizí LZS žádat lze)
  _ownLzsFlyable() { const lz = this.crewOf('lzs'); return !!lz && this.avail(lz) && this._lzsWeatherStatus() !== 'neletovo'; }
  _nbRelease(c) {
    c.supportRequested = false; c.supportRequestedFor = null; c.nbAsk = null;
    if (c.state === 'base') { c.state = 'off'; c.lat = c.home.lat; c.lon = c.home.lon; c.mv = null; }
  }
  _nbAnswer(c, cs) {
    const t = this.s.t, a = c.nbAsk, nb = ZOS_DATA.neighbors[c.region] || { sign: 'ZOS soused', short: '' };
    if (!cs || cs.status === 'closed') { c.nbAsk = null; return; }
    let p = c.externalLzs ? 0.75 : 0.7; if (c.foreign) p *= 0.85;
    if (c.externalLzs && this._lzsWeatherStatus() !== 'clear') p *= 0.6; // špatné počasí: soused může odmítnout
    if (this.rnd() < p) {
      a.state = 'accepted'; c.supportRequested = true; c.supportRequestedFor = cs.id; c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; c.mv = null;
      this.L('alert', `${nb.sign}: souhlasí – ${c.name} k ${cs.num}.`, cs.id, c.id);
      if (c.externalLzs) { // žádost a vyslání jsou jeden krok
        const r = this.assign(cs.id, c.id);
        if (!r.ok) { this.L('warn', `${c.name}: ${r.msg || 'vyslání se nepodařilo'}`, cs.id, c.id); this._nbRelease(c); }
      } else this.L('req', `${cs.num}: ${c.name} čeká na vyslání – vyber ji v nabídce posádek nebo přetáhni dlaždici znovu na případ.`, cs.id, c.id);
    } else {
      const reasons = c.externalLzs ? ['LZS je na jiném letu', 'vrtulník je v technické přípravě', 'posádka je mimo dosah počasí'] : ['nemáme volnou posádku', 'posádka je na výjezdu', 'posádka je na převozu'];
      a.state = 'declined'; c.nbBusyUntil = t + this.rr(900, 2400);
      this.L('warn', `${nb.sign}: odmítá – ${this.pick(reasons)} (${c.name}, ${cs.num}).`, cs.id, c.id);
    }
  }
  _nbReq(id) { return (this.s.nbq || []).find(x => x.id === id) || null; }
  // žádosti sousedních krajů o naše posádky: plán na směnu (1–3 pozemní, 0–2 LZS)
  _nbPlan(t0) {
    const plan = [], n = this.ri(1, 3), m = this.ri(0, 2), span = 12 * 3600;
    for (let i = 0; i < n; i++) plan.push({ at: t0 + this.rr(1500, span - 1500), kind: 'ground' });
    for (let i = 0; i < m; i++) plan.push({ at: t0 + this.rr(1500, span - 1500), kind: 'lzs' });
    return plan.sort((a, b) => a.at - b.at);
  }
  _nbSchedule() {
    const s = this.s, t = s.t; if (s.scripted) return;
    const ev = s.ev;
    if (!ev.nbPlan) ev.nbPlan = this._nbPlan(t);
    while (ev.nbPlan.length && ev.nbPlan[0].at <= t) this._nbSpawn(ev.nbPlan.shift().kind);
    if (!ev.nbPlan.length && s.mode === 'free') ev.nbPlan = this._nbPlan(t + 3600);
  }
  _nbSpawn(kind) {
    const s = this.s, t = s.t, D = ZOS_DATA;
    if (kind === 'lzs') {
      const lz = this.crewOf('lzs');
      if (!lz || !this.avail(lz) || this._lzsWeatherStatus() === 'neletovo') { s.ev.nbPlan.push({ at: t + this.rr(900, 1800), kind }); s.ev.nbPlan.sort((a, b) => a.at - b.at); return; }
    }
    const region = this.pick(kind === 'ground' ? ['VY', 'PL', 'SC'] : ['VY', 'PL', 'SC', 'BY', 'HR', 'DR']);
    const bases = (D.nbGround || []).filter(g => g.region === region);
    let place, lat, lon;
    if (bases.length) {
      const b = this.pick(bases);
      place = 'okolí ' + b.name.replace(/^[A-ZČŠŘÚ]{2} /, '').replace(/ (RZP|RTW)$/, ''); lat = b.lat + this.rr(-0.05, 0.05); lon = b.lon + this.rr(-0.07, 0.07);
    } else {
      const P = region === 'HR' ? ['Freistadt', 48.5106, 14.5026] : ['Gmünd', 48.7667, 14.9833];
      place = 'okolí ' + P[0]; lat = P[1] + this.rr(-0.05, 0.05); lon = P[2] + this.rr(-0.07, 0.07);
    }
    const rq = { id: 'nq' + (s.nbSeq = (s.nbSeq || 0) + 1), kind, region, rtype: kind === 'ground' ? (this.rnd() < 0.25 ? 'RV' : 'RZP') : 'LZS', place, lat, lon,
      indik: this.pick(['bolest na hrudi, N1', 'dušnost, N2', 'trauma, N2', 'porucha vědomí, N2', 'křečové stavy, N2', 'dopravní nehoda, N1']), t, state: 'open', expireAt: t + this.rr(180, 300), recallAt: null };
    (s.nbq || (s.nbq = [])).push(rq);
    if (s.nbq.length > 40) s.nbq.shift();
    this._nbCall(rq, true);
  }
  _nbCall(rq, first) {
    const s = this.s, D = ZOS_DATA, nb = D.neighbors[rq.region], pseudo = { id: 'nbop-' + rq.region, code: rq.region, name: nb.sign }, opts = [];
    let msg;
    if (rq.kind === 'lzs') {
      msg = `žádáme o LZS Planá, ${rq.place}, ${rq.indik}. Můžete pomoci?`;
      opts.push({ k: 'nbs', label: 'Vyhovět – Planá odletí (pryč asi hodinu)', say: `ZCB101 rozumí, Planá vzlétá k vám, ${rq.place}.`, ok: true, act: 'nb-send', crewId: 'lzs' });
    } else {
      msg = `žádáme o ${rq.rtype === 'RV' ? 'lékaře (RV)' : 'RZP'} do lokality ${rq.place}, ${rq.indik}. Můžete pomoci?`;
      const cand = s.crews.filter(k => !k.ext && k.type === rq.rtype && this.avail(k)).map(k => ({ k, eta: this._eta(k.lat, k.lon, rq.lat, rq.lon) })).sort((a, b) => a.eta - b.eta).slice(0, 3);
      cand.forEach((x, i) => opts.push({ k: 'nbs' + i, label: `Vyslat ${x.k.name} (ZCB${x.k.code}) · ETA ${Math.max(1, Math.round(x.eta / 60))} min`, say: `ZCB101 rozumí, vysíláme ${x.k.name}, ZCB${x.k.code}.`, ok: true, act: 'nb-send', crewId: x.k.id }));
    }
    opts.push({ k: 'nbx', label: 'Odmítnout', say: 'ZCB101: bohužel nemůžeme vyhovět, nemáme volnou posádku.', ok: true, act: 'nb-decline' });
    opts.push({ k: 'nbl', label: 'Zjistím a ozvu se', say: 'ZCB101: zjistíme a ozveme se.', ok: true, act: 'nb-later' });
    this._rq(pseudo, null, msg, opts, 'nbreq', { sign: nb.sign, callCodes: rq.region, nbId: rq.id, forceInteractive: true, noPenalty: true });
    if (first) this.L('alert', `${nb.sign} žádá o ${rq.kind === 'lzs' ? 'LZS Planá' : rq.rtype === 'RV' ? 'lékaře' : 'RZP'} – ${rq.place}. Ozvou se rádiem.`);
  }
  _nbAccept(rq, crewId) {
    if (!rq || rq.state !== 'open') return;
    const s = this.s, t = s.t, nb = ZOS_DATA.neighbors[rq.region], k = this.crewOf(crewId);
    if (!k || !this.avail(k)) { this.L('warn', `${nb.sign}: ${k ? k.name : 'posádka'} už není volná, žádost zůstává otevřená.`); return; }
    const dur = this.rr(2400, 5400), p = this.pos(k);
    if (k.type !== 'LZS') {
      const others = s.crews.filter(x => !x.ext && x.type === k.type && x.oblast === k.oblast && x.id !== k.id && this.avail(x)).length;
      this._opsScore(others >= 1 ? 1 : -1, others >= 1 ? `výpomoc sousednímu kraji, v oblasti zůstává volná posádka (${k.name})` : `výpomoc sousednímu kraji, oblast ${k.oblast} zůstala bez volné posádky (${k.name})`, null);
    }
    k.lat = p.lat; k.lon = p.lon; k.mv = null; k.state = 'second'; k.until = t + dur; k.caseId = null;
    k.nbMission = { region: rq.region, place: `${nb.short} – ${rq.place}`, until: t + dur };
    rq.state = 'accepted'; rq.crewId = k.id;
    this.L('sys', `${k.name}: vysláno na pomoc (${nb.short}, ${rq.place}), návrat asi za ${Math.round(dur / 60)} min.`, null, k.id);
  }
  _nbDecline(rq) {
    if (!rq || rq.state !== 'open') return;
    const s = this.s, nb = ZOS_DATA.neighbors[rq.region];
    rq.state = 'declined';
    if (rq.kind === 'ground') {
      const could = s.crews.some(k => !k.ext && k.type === rq.rtype && this.avail(k) && s.crews.some(x => !x.ext && x.type === k.type && x.oblast === k.oblast && x.id !== k.id && this.avail(x)));
      if (could) this._opsScore(-1, `odmítnutí žádosti sousedního kraje (${nb.short}), přestože šlo posádku uvolnit`, null);
    }
    this.L('sys', `${nb.sign}: žádost odmítnuta.`);
  }
  _nbLater(rq) {
    if (!rq || rq.state !== 'open') return;
    rq.recallAt = this.s.t + this.rr(60, 120); rq.expireAt = Math.min(rq.t + 600, rq.expireAt + 150);
  }
  _nbTimeout(rq) {
    if (!rq || rq.state !== 'open') return;
    const nb = ZOS_DATA.neighbors[rq.region];
    rq.state = 'timeout';
    this._opsScore(-1, `žádost sousedního kraje (${nb.short}) zůstala bez odpovědi`, null);
    this.L('warn', `${nb.sign}: bez odpovědi, žádost zrušena.`);
  }
  _nbStep() {
    const s = this.s, t = s.t;
    for (const c of s.crews) {
      const a = c.nbAsk; if (!a) continue;
      if (a.state === 'asked' && t >= a.answerAt) this._nbAnswer(c, this.caseOf(a.caseId));
      else if (a.state === 'accepted' && c.state === 'base' && !c.caseId && t > a.answerAt + 600) { this.L('warn', `${c.name}: nebyla vyslána, spolupráce zrušena.`, a.caseId, c.id); this._nbRelease(c); }
      else if (a.state === 'declined' && t >= (c.nbBusyUntil || 0)) c.nbAsk = null;
    }
    this._nbSchedule();
    for (const rq of s.nbq || []) if (rq.state === 'open' && rq.recallAt != null && t >= rq.recallAt) { rq.recallAt = null; this._nbCall(rq, false); }
  }
  assign(caseId, crewId, role) {
    const s = this.s, t = s.t;
    const cs = this.caseOf(caseId), c = this.crewOf(crewId);
    if (!cs || !c) return { ok: false, msg: 'Neznámý případ nebo posádka.' };
    if (cs.status === 'closed' || cs.status === 'intake') return { ok: false, msg: 'Případ nelze obsadit.' };
    if (!this.avail(c)) return { ok: false, msg: 'Posádka není volná.' };
    if (c.caseId === cs.id) return { ok: false, msg: 'Posádka už u případu je.' };
    if (cs.exitus && !(cs.exam && cs.exam.needed && !cs.exam.done && c.type === 'RV')) return { ok: false, msg: cs.exam && cs.exam.needed && !cs.exam.done ? 'Na prohlídku zemřelého vyšli RV.' : 'Na místě exitus, další posádka není potřeba.' };
    if (c.ext && (!c.supportRequested || c.supportRequestedFor !== cs.id)) return { ok: false, msg: 'Nejprve požádej o mezikrajskou spolupráci pro tento případ.' };
    if (c.externalLzs && !cs.mu && this._ownLzsFlyable()) return { ok: false, msg: 'Vlastní LZS je dostupná.' };
    if (c.type === 'LZS' && cs.lzsActive && !cs.mu) return { ok: false, msg: 'K případu už byla vyslána LZS.' };
    if (c.type === 'LZS' && !c.externalLzs) {
      const weather = this._lzsWeatherStatus();
      if (weather === 'neletovo') return { ok: false, msg: 'LZS nelze vyslat: neletové počasí.' };
      if (weather === 'consult' && !(cs.lzsPilotApproved && cs.lzsConsult && cs.lzsConsult.status === 'approved' && cs.lzsConsult.weatherStatus === weather)) return { ok: false, msg: 'LZS je na konzultaci. Vyžádej rozhodnutí pilota.' };
    }
    if (c.type !== 'MU' && cs.n === 3 && this._muDeclaredOpen()) return { ok: false, msg: 'Během vyhlášené MU se výjezdy N3 odkládají.' };
    if (cs.typ === 'sekundární' && this._muDeclaredOpen()) return { ok: false, msg: 'Během vyhlášené MU se sekundární převozy odkládají.' };
    if (cs.mu && cs.mu.ended) return { ok: false, msg: 'MU je ukončena.' };
    if (cs.mu && this._muReserveBlocked(c, cs)) return { ok: false, msg: 'Tato RZP zůstává pro běžný provoz (na základně s více RZP zůstává jedna, v ČB dvě).' };
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
    if (c.type === 'RZP' && !c.ext && role !== 'heli-transfer' && cs.effRatio == null) {
      let best = eta, bestK = c;
      for (const k of s.crews) if (k.type === 'RZP' && !k.ext && this.avail(k)) { const e = this.etaFor(k, cs.lat, cs.lon, cs.n); if (e < best) { best = e; bestK = k; } }
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
    // posádka vracející se na základnu: výjezd se zadává rádiem a vyjede až po relaci
    const relay = !role && (c.type === 'RZP' || c.type === 'RV') && c.state === 'free' && !!c.mv;
    const p = this.pos(c), rolling = c.state === 'free' && c.mv && c.mv.path && t < c.mv.t1 && c.type !== 'LZS';
    c.lat = p.lat; c.lon = p.lon; c.consulted = false; c.escortFree = false;
    if (!rolling) c.mv = null;
    c.turn = rolling ? this.rr(5, 15) : this._turnout(c, cs.n); // vůz na cestě (vrací se) jede rovnou, bez zastavení
    c.dispatchAt = t; c.turnoutAlerted = false;
    c.state = 'call'; c.until = t + c.turn; c.caseId = cs.id; c.arrivedAt = null; c.dest = null; c.hospitalRun = null; c.relayHold = false;
    c.caseRole = role || null;
    cs.crews.push(c.id);
    cs.asg.push({ crewId: c.id, t, eta, role: c.caseRole });
    if (role !== 'heli-transfer' && cs.initialDispatchRequired && cs.initialDispatchRequired.includes(c.type) && !cs.initialDispatchSent.includes(c.type)) cs.initialDispatchSent.push(c.type);
    // LZS má lékaře – nahrazuje RV (obvykle se RV posílá i tak, kdyby LZS nedoletěla)
    if (c.type === 'LZS' && cs.initialDispatchRequired && cs.initialDispatchRequired.includes('RV') && !cs.initialDispatchSent.includes('RV')) cs.initialDispatchSent.push('RV');
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
    if (relay) this._relayStart(c, cs);
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
    if (role !== 'heli-transfer' && cs.initialDispatchRequired && (c.type === 'LZS' || c.type === 'RV') && !cs.crews.some(id => { const k = this.crewOf(id); return k && (k.type === 'RV' || k.type === 'LZS' || k.rlp) && k.caseRole !== 'heli-transfer'; })) cs.initialDispatchSent = cs.initialDispatchSent.filter(x => x !== 'RV');
    if (role !== 'heli-transfer' && cs.initialDispatchRequired && !cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === c.type && k.caseRole !== 'heli-transfer'; })) cs.initialDispatchSent = cs.initialDispatchSent.filter(x => x !== c.type);
    const a = cs.asg.find(x => x.crewId === c.id && !x.cancelled && !x.diverted); if (a) a.cancelled = true;
    if (role === 'heli-transfer') cs.lzsTransferCrewId = null;
    if (c.type === 'LZS') {
      cs.lzsActive = false; cs.lzsState = 'odvolána'; cs.lzsTransferRequired = false;
      cs.lzsPatientToHospital = false; cs.lzsLandedAt = null; cs.lzsReadyAt = null;
      cs.lzsTransferCrewId = null; cs.lzsTransferred = false; cs.lzsHeliportAlerted = false;
    }
    if (c.ext) { c.supportRequested = false; c.supportRequestedFor = null; }
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
    } else if (c.state === 'call') { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; c.until = this.s.t; c.relayHold = false; }
    else { const dur = this._goHome(c); c.state = 'free'; c.until = this.s.t + dur; }
    this.L('warn', `${c.name}: odvolána od případu ${cs.num}`, cs.id, c.id);
    if (c.type !== 'LZS' && wasMoving) this._zosSay(c, cs, cs.exitus ? 'ruším výjezd, vraťte se na základnu.' : 'ruším výjezd, vraťte se na základnu.');
    this._checkClose(cs);
    return { ok: true };
  }
  _busyCrews(cs) { return this.s.crews.filter(x => x.caseId === cs.id && BUSY.includes(x.state)); }
}
if (typeof module !== 'undefined') module.exports = SimNeighbors;
