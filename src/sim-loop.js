// Herní smyčka (tick) – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimLoop {
  // ---------- smyčka ----------
  step(dt) {
    while (dt > 0 && !this.s.ended) { const d = Math.min(5, dt); this._tick(d); dt -= d; }
  }
  _tick(dt) {
    const s = this.s; s.t += dt; const t = s.t;
    this._updateWeather();
    const day = this._isDay();
    if (day !== s.dayFlag) { s.dayFlag = day; this.L('sys', day ? 'Střídání směn: denní směna.' : 'Střídání směn: noční směna.'); this._roster(true); }

    while (s.ev.nextSpawn <= t) { if (s.liveCalls) this._liveSpawn(); else this._spawn(); s.ev.nextSpawn += s.liveCalls && s.liveCalls.mode === 'training' ? s.liveCalls.gap : this._gap(); }
    if (s.liveCalls) { this._callsTick(); if (s.liveCalls.bot) this.botTick(); }
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
      } else { s.ev.nextMU = null; const mc = this._spawnMU(s.muOnly ? { type: s.muOnlyType || undefined, minCas: 16 } : undefined); if (s.muOnly) s.muCaseId = mc.id; }
    }

    for (const c of s.cases) if (c.status !== 'closed') this._caseStep(c);
    this._lzsRadio();
    this._radioStep();
    this._nbStep();
    if (s.muOnly && s.muCaseId && !s.ended) { const mc = this.caseOf(s.muCaseId); if (mc && mc.status === 'closed') { s.ended = true; this.L('sys', 'Konec cvičení MU.'); } }
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
        if (report.landingUpdate && c.mu) { c.mu.landingCheckRequested = false; c.mu.landingStatus = report.landingStatus; }
        if (!c.mu && report.patientCount && report.patientCount > c.patientCount) {
          c.patientCount = report.patientCount; c.pocet = report.patientCount;
          c.patientsRemaining = Math.max(0, c.patientCount - (c.patientsHandled || 0));
          c.desc = `${c.patientCount} zraněných; počet upřesnily složky IZS.`;
        }
        if (report.upgrade && c.status !== 'closed' && !c.mu && !c.exitus && c.n > report.upgrade.n) this._upgradeCase(c, report.upgrade);
        // nekritické datovky (red === false) jen do logu bez pípnutí a toastu; kritické (červené) a ostatní hlášení pípají jako dřív
        this.L(report.red === false || (c.mu && this._muQuiet()) ? 'sys' : 'alert', `${c.num} · ${report.source || (c.mu ? 'Situační hlášení' : 'linka 112')}: ${report.text}`, c.id);
      }
      if (report.received && !report.acknowledged && !report.scoreApplied && t - report.receivedAt >= 180) {
        report.scoreApplied = true;
        // přehlédnutá datová zpráva se netrestá (jen informace)
      }
    }
    if (c.status === 'intake') {
      if (c.phase === 'dz' && c.dzUntil != null && t >= c.dzUntil) c.phase = 'intake'; // datovka odeslána → naše nabírání
      if (t >= c.readyAt) {
        c.status = 'waiting'; c.wxAtCall = this._lzsWeatherStatus();
        this._muAdjustN2(c);
        this.L('case', `Nový případ ${c.num}: N${c.n}${c.dyn ? ' dyn.' : ''} – ${c.klasif}, ${c.addr}`, c.id);
        // výzva obsahuje příznak PČR / HZS, ale nepřišla datovkou: složku musí přiřadit dispečer
        if (c.agNeed) {
          const A = c.agencies || (c.agencies = {});
          for (const k of c.agNeed) if (!A[k]) { A[k] = { state: 'requested', reqAt: t, why: 'příznak ve výzvě', fromCall: true }; this.L('req', `${c.num}: výzva vyžaduje ${k === 'pcr' ? 'PČR' : 'HZS'} (${A[k].why})`, c.id); }
          c.agNeed = null;
        }
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
    this._muAdjustN2(c);
    // Plánovaný N4 převoz neeskaluje jako akutní tísňová výzva.
    if (c.typ === 'sekundární') return;
    if (c.mu) this._muStep(c);
    if (c.exitus) { this._deathCaseStep(c); return; }
    if (c.agencies) this._agencyStep(c);
    if (c.frs) this._frStep(c);
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
          const opts = sug.map((k, i) => ({ k: 'rv' + i, label: `Za vámi ${this._label(k)}`, say: `ZCB101 rozumí, za vámi ${this._label(k)}.`, ok: true, act: 'rv-ack', crewId: k.id }));
          opts.push({ k: 'later', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true });
          this._crewCall(rzp, c, `žádáme lékaře na místo, ${c.rvReq.kind === 'zhoršení stavu' ? 'zhoršení stavu' : 'posouzení stavu'}.`, opts, 'rv');
        }
      }
    }
    if (c.rvForgetAt != null && t >= c.rvForgetAt) {
      c.rvForgetAt = null;
      if (!c.docAssigned && c.status !== 'closed') {
        const pref = c.rvForgetCrew && this.crewOf(c.rvForgetCrew);
        const best = pref && this.avail(pref) ? { crewId: pref.id } : (this.suggest(c.id, 'RV')[0] || this.suggest(c.id, 'LZS')[0]);
        if (best) { const r = this.assign(c.id, best.crewId); if (r.ok) { this.L('warn', `${c.num}: lékaře po prodlení vyslal kolega – dispečer na žádost posádky zapomněl`, c.id); this._opsScore(-1, `zapomenuté vyslání lékaře k ${c.num}`, c.id); } }
      }
    }
    if (c.fate === 'wakes' && c.wakeAt != null && !c.wokeDone && t >= c.wakeAt && c.status !== 'intake') {
      c.wokeDone = true;
      const onScene = c.crews.some(id => { const k = this.crewOf(id); return k && k.state === 'onscene'; });
      if (!onScene && c.n === 1) {
        c.n = 2; c.nDopl = 2; c.dyn = false; c.rvNeed = true;
        c.symptoms = (c.symptoms || []).filter(x => !/NEDÝCHÁ|BEZVĚDOMÍ|AVPU-U/i.test(x)).concat(['probírá se', 'dýchá']);
        c.up = c.symptoms.join(', ');
        c.poznamka = [c.poznamka, 'probírá se, dýchá'].filter(Boolean).join(', ');
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
        if (!/zhoršení stavu/.test(c.poznamka || '')) c.poznamka = [c.poznamka, 'zhoršení stavu'].filter(Boolean).join(', ');
        this.L('warn', `${c.num}: opakované volání – zhoršení stavu, nově N${c.n}`, c.id);
      }
      if (t - c.waitSince > 2700 && !c.arrived) { this._close(c, true); return; }
    }
    if (c.mu && c.status === 'waiting' && !c.arrived && t - c.waitSince > 5400) this._close(c, true);
  }
  _deathCaseStep(c) {
    const t = this.s.t, cor = c.coroner;
    const here = type => c.crews.some(id => { const k = this.crewOf(id); return k && k.caseId === c.id && k.type === type && BUSY.includes(k.state); });
    if (c.recallDue && !c.recallDue.done && t >= c.recallDue.at + 180) {
      c.recallDue.done = true;
      for (const id of c.recallDue.ids) { const k = this.crewOf(id); if (k && k.caseId === c.id && (k.state === 'call' || k.state === 'enroute')) this._opsScore(-1, `neodvolaná posádka ${k.name} po hlášení exitu u ${c.num}`, c.id); }
    }
    if (cor && cor.state === 'pending' && t >= cor.answerAt) {
      const ok = c.script && c.script.coroner ? c.script.coroner === 'available' : this.rnd() < (this._isDay() ? 0.6 : 0.45);
      cor.state = ok ? 'available' : 'unavailable';
      if (ok) {
        cor.availAt = t;
        cor.name = this.pick(['MUDr. Kovář', 'MUDr. Malá', 'MUDr. Sýkora', 'MUDr. Vlková', 'MUDr. Holý', 'MUDr. Bartošová']);
        this.L('sys', `${c.num}: koroner ${cor.name} je k dispozici (telefonicky, informace do terminálu) – posádky se vracejí na základnu.`, c.id);
        this.L('req', `${c.num}: koroner k dispozici – přetáhni dlaždici KORONER na případ.`, c.id);
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
    // koroner je k dispozici, ale dispečer ho ještě nevyslal: po 15 min ho vyšle kolega ZOS (−1)
    if (cor && cor.state === 'available' && t - (cor.availAt || t) > 900) { this._sendCoroner(c, true); }
    if (cor && cor.state === 'sent' && c.status !== 'closed' && !this._busyCrews(c).length) { this._close(c, false); return; }
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
    const dur = this._goHome(c); c.state = 'free'; c.until = t + dur;
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
        if (t >= c.until) { const nbm = c.nbMission; c.state = 'base'; c.nbMission = null; this.L('crew', nbm ? `${c.name}: zpět po pomoci sousednímu kraji (${nbm.place})` : `${c.name}: zpět po sekundárním převozu`, null, c.id); if (c.pendingOff) this._toBase(c); }
        break;
      case 'free':
        if (t >= c.until) { c.lat = c.mv.b[0]; c.lon = c.mv.b[1]; c.mv = null; c.retLights = false; this._toBase(c); }
        break;
      case 'call': {
        const pending = this.caseOf(c.caseId);
        if (c.relayHold) { if (!pending || pending.status === 'closed') c.relayHold = false; else break; } // čeká na relaci ZCB101
        if (pending && pending.n === 1 && c.type !== 'LZS' && c.type !== 'MU' &&
            !c.turnoutAlerted && t - c.dispatchAt > (c.type === 'RV' ? 300 : 120)) {
          c.turnoutAlerted = true;
          this.L('deadline', `ALARM: ${c.name} nevyjela k N1 ${pending.num} do 2 minut!`, pending.id, c.id);
          this._opsScore(-5, `opožděný výjezd N1 (${c.name})`, pending.id);
        }
        if (t < c.until) break;
        const cs = pending;
        let dur;
        if (c.type === 'LZS') dur = this._goAir(c, cs.lat, cs.lon);
        else {
          const target = c.caseRole === 'heli-transfer' ? ZOS_DATA.lzs.heliport : c.caseRole === 'vstricna-support' ? c.vstricnaMeet : { lat: cs.lat, lon: cs.lon };
          const pre = c.mv ? this._continueToExit(c, target) : null; // na dálnici se neotáčí – dojede k nejbližšímu sjezdu
          dur = this._go(c, target.lat, target.lon, c.caseRole === 'vstricna-support' ? 'N3' : 'N' + Math.min(4, Math.max(1, c.driveN || cs.n || 3)));
          if (pre && c.mv && c.mv.path) {
            const m = c.mv, dw = m.dw || 0, mvDur = dur - dw, tot = pre.sec + mvDur;
            m.path = pre.pts.concat(m.path.slice(2)); m.frac = pre.fr.map(f => f * pre.sec / tot).concat(m.frac.slice(1).map(f => (pre.sec + f * mvDur) / tot));
            m.a = [pre.pts[0], pre.pts[1]]; m.t1 = t + tot + dw; dur = tot + dw;
          }
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
        const missAt = c.mv && c.mv.b ? c.mv.b : [cs.lat, cs.lon];
        if (cs.addrMiss && !c.addrFound && !c.caseRole && c.type !== 'LZS' && hav(missAt[0], missAt[1], cs.addrMiss.lat, cs.addrMiss.lon) * 1000 > 250) {
          // dojeli na zadanou adresu, ale pacient je jinde (calltaker zadal špatnou adresu): hledání a přejezd
          c.addrFound = true; c.parked = false;
          c.lat = missAt[0]; c.lon = missAt[1]; c.mv = null;
          const d2 = this._go(c, cs.addrMiss.lat, cs.addrMiss.lon, 'N' + Math.min(4, Math.max(1, c.driveN || cs.n || 3))) + this.rr(60, 150);
          c.until = t + d2; c.state = 'enroute';
          cs.addrMissLost = (cs.addrMissLost || 0) + d2;
          this.L('crew', `${c.name}: na zadané adrese pacient není, hledáme (skutečně o ${Math.round(cs.addrMiss.m)} m dál)`, cs.id, c.id);
          if (!cs.addrFixed) { cs.addrFixed = true; cs.lat = cs.addrMiss.lat; cs.lon = cs.addrMiss.lon; cs.addr = cs.addrMiss.addr; }
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
        else if (doc) dur = ZOS_DATA.rvSceneQ && !cs.mu ? this._logn(ZOS_DATA.rvSceneQ['N' + Math.min(3, cs.n || 2)] || ZOS_DATA.rvSceneQ.N2, 4) : this.rr(600, 1200);
        else if (cs.mu) dur = this.rr(720, 1200);
        else dur = cs.sceneQ ? this._logn(cs.sceneQ, 3) * ({ 1: 1.12, 2: 1.03, 3: 0.92 }[cs.n] || 1) : this.rr(cs.scene[0], cs.scene[1]) * 60;   // násobek podle naléhavosti: reálný medián RZP N1 25,5 / N2 19,6 / N3 14,9 min
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
        if (cs && cs.mu) { if (cs.mu.ended || cs.status === 'closed') return this._release(c); c.until = t + 20; break; }
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
          // vyslaný lékař (RV / LZS) je na cestě → RZP s pacientem neodjíždí, ani po uplynutí limitu
          const docComing = cs.crews.some(id => { const k = this.crewOf(id); return k && (k.type === 'RV' || k.type === 'LZS') && k.caseId === cs.id && (k.state === 'call' || k.state === 'enroute'); });
          if (needDoc && !cs.docArrived && (t < limit || docComing)) break;
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
          if ((cs.trans || this._mustTransport(cs)) && !cs.transported) { cs.trans = true; return this._startTransport(c, cs); }
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
          c.hospitalRun.availableAt = c.until; // po předání je posádka volná (zpáteční jízda se nepočítá)
        }
        this.L('crew', `${c.name}: příjezd k ZZ – ${c.dest.name}`, cs ? cs.id : null, c.id);
        if (cs && cs.mu && c.muPats) this._muDelivered(c, cs);
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
        } else if (t >= c.until) { const mcs = this.caseOf(c.caseId); if (mcs && mcs.mu && this._muReturn(c, mcs)) break; this._release(c); }
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
    c.hospitalRun = { hospitalName: c.dest.name, phase: 'transport', handoverSec: null, availableAt: t + dur + handoverEstimate };
    c.until = t + dur; c.state = 'transport';
    cs.transported = true; cs.dest = c.dest.name; cs.lzsState = 'pozemní převoz';
    this.L('crew', `${c.name}: převzala pacienta od LZS, převoz na ${c.dest.name}`, cs.id, c.id);
  }
  _returnLzs(c, cs) {
    const t = this.s.t, home = c.home;
    const dur = this._goAir(c, home.lat, home.lon);
    c.until = t + dur; c.state = 'free'; c.caseId = null; c.caseRole = null; c.arrivedAt = null; c.dest = null; c.lzsLeg = 'returning';
    c.callsCompleted = (c.callsCompleted || 0) + 1;
    if (c.ext) { c.supportRequested = false; c.supportRequestedFor = null; }
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
          const pEsc = cs.script && cs.script.escort != null ? (cs.script.escort ? 1 : 0) : cs.fate === 'rosc' ? 1 : cs.n === 1 ? 0.85 : cs.n === 2 ? (cs.child ? 0.8 : 0.35) : 0.06;
          if (this.rnd() < pEsc) escorts.push(rv);
          else leaving.push(rv);
        }
      }
    }
    const type = cs.mu ? this.pick(['okresni', 'okresni', 'trauma']) : this._destType(cs, c);
    const selectedCapacity = cs.mu && cs.mu.hospitalCapacities && cs.mu.hospitalCapacities.find(x => x.hospitalId === cs.targetHospitalId);
    let best = cs.targetHospitalId && (!selectedCapacity || (selectedCapacity.remaining > 0 && selectedCapacity.state !== 'dočasně nepřijímá')) ? D.hospitals.find(h => h.id === cs.targetHospitalId && h.types.includes(type)) : null, bd = 1e9;
    if (!best) for (const h of D.hospitals) {
      if (!h.types.includes(type) || (!cs.mu && this._muFar(h))) continue;
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
    c.hospitalRun = { hospitalName: c.dest.name, phase: 'transport', handoverSec: null, availableAt: t + dur + handoverEstimate };
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
      rv.caseRole = 'escort'; rv.escortFree = cs.script && cs.script.escortFree != null ? cs.script.escortFree : cs.fate !== 'rosc' && cs.n >= 2 && this.rnd() < 0.6;
      rv.dest = { hid: best.id, name: c.dest.name, type };
      this._go(rv, best.lat, best.lon, pmode); rv.state = 'transport'; rv.until = t + dur;
      rv.hospitalRun = { hospitalName: c.dest.name, phase: 'transport', escort: true, handoverSec: null, availableAt: t + dur }; // doprovod je volný hned po příjezdu
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
      if (bd < 0.3 && bi > 0) c.kruhacAt = c.mv.t0 + (c.mv.t1 - (c.mv.dw || 0) - c.mv.t0) * c.mv.frac[bi];
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
  // Může pacient přestoupit ze sanitky do sanitky (vstřícná jízda)? Ne: nosítka, imobilní, nechodící, DKK, N1, kritické stavy. Situační případy rozhoduje náhoda.
  _transferable(cs) {
    if (cs.n === 1 || cs.nOrig === 1 || cs.exitus || cs.mu) return false;
    const sym = (cs.symptoms || []).join(' ') + ' ' + (cs.klasif || '');
    if (/imobil|ležící|nechod|vozík|nosítk|páteř|DKK|dolní konč|stehn|kyčl|bérec|bezvěd|AVPU-[PU]|KPR|křeč|dynamick/i.test(sym)) return false;
    if (['resus', 'nzo', 'tonuti', 'obeseni', 'popal', 'amput', 'dn_poly', 'dn_lehke', 'cmp', 'porucha', 'gyn', 'czs', 'asist', 'trauma_dite'].includes(cs.ind)) return false;
    if (cs.child && cs.n <= 2) return false;
    if (cs.n === 2 && ['hrudnik', 'aryt', 'dusnost', 'alerg', 'krvac', 'intox', 'neuro'].includes(cs.ind)) return false;
    if (cs.ind === 'trauma') return /HKK|horní konč|ruk[auy]|zápěstí|předloktí|loket|rameno|prst/i.test(sym) && this.rnd() < 0.25;
    if (cs.where === 'domov' && this.rnd() < 0.7) return false;
    return cs.n === 3 ? true : this.rnd() < 0.45;
  }
  _announceVstricna(rzp, cs, hospital, routeDuration, baseMsg, ackOpts) {
    const distanceSec = this._eta(rzp.mv.a[0], rzp.mv.a[1], hospital.lat, hospital.lon);
    const forced = !!(cs.script && cs.script.vstricna);
    const suitable = forced || this._transferable(cs);
    const nearest = ZOS_DATA.stations.reduce((a, x) => !a || hav(x.lat, x.lon, hospital.lat, hospital.lon) < hav(a.lat, a.lon, hospital.lat, hospital.lon) ? x : a, null);
    const area = nearest && nearest.oblast;
    const receiver = this.s.crews.filter(k => k.type === 'RZP' && k.oblast === area && this.avail(k) && !k.res && k.caseId !== cs.id);
    const canOffer = suitable && receiver.length > 0;
    // Vstřícnou řeší jen periferní posádky; „dojedeme sami / je schopen překladu“ se říká jen z periferie.
    // Vstřícná má smysl jen u dlouhých přejezdů po pomalejších silnicích (např. Dačice → JH, Vyšší Brod → ČK),
    // ne tam, kde se jede po dálnici či rychlé silnici (Veselí, Soběslav → Tábor): čas trasy po síti s rychlostmi jízdy s VRZ.
    const ack = ackOpts || [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }];
    if (!forced && (distanceSec < 15 * 60 || hospital.ext)) {
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
        { k: 'wait', label: 'Rozumí, zjistím vstřícnou', say: 'ZCB101 rozumí, vstřícnou zjišťujeme.', ok: false, act: 'ack' }], 'info', undefined, true);
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
    const total = Math.max(1, mv.t1 - (mv.dw || 0) - mv.t0), now = clamp01((t - mv.t0) / total);
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
    const dur = this._goHome(c);
    c.state = 'free'; c.until = t + dur;
    if (leavingHospital) { c.hospitalRun.phase = 'return'; c.hospitalRun.availableAt = t; }
    else if (c.hospitalRun) c.hospitalRun = null;
    this.L('crew', `${c.name}: volný`, cs ? cs.id : null, c.id);
    if (cs) this._checkClose(cs);
  }
  _toBase(c) {
    const t = this.s.t;
    c.mv = null;
    if (c.liberoId) this._detachLibero(c);
    if (c.ext && !c.supportRequested) { c.state = 'off'; c.pendingOff = false; c.lat = c.home.lat; c.lon = c.home.lon; }
    else if (c.pendingOff) { c.state = 'off'; c.pendingOff = false; c.lat = c.home.lat; c.lon = c.home.lon; if (c.ext && c.externalDayOnly) { c.supportRequested = false; c.supportRequestedFor = null; } this.L('crew', `${c.name}: odhlášena`, null, c.id); }
    else if (c.res && t >= c.dutyEnd) { c.state = 'off'; c.lat = c.home.lat; c.lon = c.home.lon; }
    else { c.state = 'base'; c.lat = c.home.lat; c.lon = c.home.lon; }
    c.lzsLeg = null; c.hospitalRun = null;
  }
  _checkClose(cs) {
    if (this._busyCrews(cs).length) return;
    if (cs.exitus) {
      if (cs.exam && cs.exam.needed && !cs.exam.done) { cs.status = 'waiting'; cs.waitSince = this.s.t; cs.examPending = true; return; }
      cs.examPending = false;
      if (cs.coroner && (cs.coroner.state === 'pending' || cs.coroner.state === 'available')) { cs.status = 'active'; return; }
      return this._close(cs, false);
    }
    const sent = cs.initialDispatchSent || [];
    // lékaře (RV) může nahradit LZS – posádka vrtulníku má lékaře
    const missingDispatch = (cs.initialDispatchRequired || []).filter(type => !(sent.includes(type) || (type === 'RV' && (sent.includes('LZS') || cs.docAssigned))));
    if (missingDispatch.length) { cs.status = 'active'; return; }
    if (cs.lzsTransferRequired && !cs.lzsTransferred) { cs.status = 'waiting'; cs.waitSince = this.s.t; return; }
    if (cs.mu) { if (cs.mu.ended) this._close(cs, false); else { cs.status = cs.arrived ? 'active' : 'waiting'; cs.waitSince = this.s.t; } return; }
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
    this._lzsEval(cs);
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
}
if (typeof module !== 'undefined') module.exports = SimLoop;
