// Rádiové relace, vracející se posádky, first respondeři, součinnost PČR/HZS – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimRadio {
  // ---------- interaktivní rádiové relace ----------
  // Posádka volá → dispečer „na příjmu“ → zpráva → dispečer volí odpověď. Bez odezvy posádka volání opakuje.
  _rq(crew, cs, msg, opts, kind, extra) {
    const s = this.s, q = s.radioQ || (s.radioQ = []);
    const e = Object.assign({ id: 'rq' + (s.rqSeq = (s.rqSeq || 0) + 1), t: s.t, crewId: crew.id, code: crew.code, callCodes: crew.code, name: crew.name, caseId: cs ? cs.id : null, msg, opts, kind, state: 'calling', tries: 1, nextAt: s.t + 45 }, extra || {});
    q.push(e); if (q.length > 50) q.splice(0, q.length - 50);
    this.L('crew', `ZCB101, zde ${this._esign(e)}, příjem.`, e.caseId, crew.id, 'crew');
    return e;
  }
  _esign(e) { return e.sign || this._csign(e.callCodes || e.code); }
  _csign(codes) { return /^K/.test(String(codes)) ? String(codes).replace(/^K(\d+)/, 'Kryštof $1') : `ZCB${codes}`; }
  // relace posádky → ZOS. Interaktivně čeká na dispečera; automaticky se přehraje celá i s výchozí odpovědí.
  _crewCall(crew, cs, msg, opts, kind, callCodes, forceInteractive) {
    // forceInteractive: rozhodnutí patří dispečerovi (např. „je schopen překladu“), čeká na něj i v automatickém režimu
    if (this.s.radioMode === 'interactive' || forceInteractive) return this._rq(crew, cs, msg, opts, kind, Object.assign(callCodes ? { callCodes } : {}, forceInteractive ? { forceInteractive: true, noPenalty: true } : {}));
    const id = cs ? cs.id : null, sign = this._csign(callCodes || crew.code), lines = [];
    const say = (who, txt) => { this.L('crew', txt, id, crew.id, who); lines.push({ who, text: txt }); };
    say('crew', `ZCB101, zde ${sign}, příjem.`);
    say('zos', 'ZCB101 na příjmu.');
    say('crew', `${sign}, ${msg}`);   // posádka začíná vlastní volačkou
    if (kind === 'vj') { this._autoRadio(crew, cs, lines); return null; } // vstřícnou rozhoduje dispečer přetažením posádky / vyprší
    const o = (opts || []).find(x => x.def) || (opts || []).find(x => x.ok !== false) || (opts || [])[0];
    if (o) {
      if (o.say) say('zos', o.say);
      if (o.say2) say('zos', o.say2);
      if (o.act === 'vj-self') say('crew', `${sign} rozumí, jedeme sami.`);
    }
    this._autoRadio(crew, cs, lines);
    return null;
  }
  // přepis proběhlé relace v automatickém režimu (panel Rádio ho ukáže, pak zmizí)
  _autoRadio(crew, cs, lines) {
    const s = this.s; if (s.radioMode !== 'auto' || !lines.length) return;
    const q = s.autoRadio || (s.autoRadio = []);
    q.push({ id: 'ar' + (s.arSeq = (s.arSeq || 0) + 1), t: s.t, crewId: crew.id, code: crew.code, name: crew.name, caseId: cs ? cs.id : null, lines });
    if (q.length > 12) q.splice(0, q.length - 12);
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
  _zosSay(crew, cs, msg, reply, thanks) {
    const id = cs ? cs.id : null, lines = [];
    const say = (who, txt) => { this.L('crew', txt, id, crew.id, who); lines.push({ who, text: txt }); };
    say('zos', `ZCB${crew.code}, zde ZCB101, příjem.`);
    say('crew', `ZCB${crew.code} na příjmu.`);
    say('zos', `ZCB${crew.code}, ${msg}`);   // dispečer osloví posádku její volačkou
    say('crew', `ZCB${crew.code} rozumí${reply ? ', ' + reply : ''}.`);
    say('zos', 'ZCB101 díky, konec.');
    this._autoRadio(crew, cs, lines);
  }
  // ---------- relace při vyslání posádky, která se vrací na základnu ----------
  // ZCB101 zavolá → příjem → „ukončete se, mám pro vás další výjezd“ → „jsme ukončení“ → díky, konec; výjezd začíná až po relaci
  _relayMsg(cs) { return `ukončete se, mám pro vás další výjezd, ${cs.town || cs.addr}, ${cs.klasif === 'CZS' ? 'celkové zhoršení stavu' : cs.klasif} N${cs.n}`; }
  _relayStart(c, cs) {
    c.relayHold = true; c.relayCase = cs.id;
    if (this.s.radioMode === 'auto') { this._relayRun(c, cs); return; }
    const s = this.s, q = s.radioQ || (s.radioQ = []);
    q.push({ id: 'rq' + (s.rqSeq = (s.rqSeq || 0) + 1), t: s.t, crewId: c.id, code: c.code, callCodes: c.code, name: c.name, caseId: cs.id, msg: this._relayMsg(cs), reply: null, opts: [], kind: 'dispatch', state: 'zos', tries: 1, nextAt: s.t + 120 });
    if (q.length > 50) q.splice(0, q.length - 50);
  }
  _relayRun(c, cs) {
    const t = this.s.t, lines = [], sign = `ZCB${c.code}`;
    const say = (who, txt) => { this.L('crew', txt, cs.id, c.id, who); lines.push({ who, text: txt }); };
    say('zos', `${sign}, zde ZCB101, příjem.`);
    say('crew', `${sign} na příjmu.`);
    say('zos', `${sign}, poprosím ${this._relayMsg(cs)}.`);
    say('crew', `${sign}, jsme ukončení, můžete posílat.`);
    say('zos', 'ZCB101 díky, konec.');
    this._autoRadio(c, cs, lines);
    this._relayRelease(c, cs, this.ri(20, 40));
  }
  _relayRelease(c, cs, extra) {
    if (!c.relayHold) return;
    c.relayHold = false; c.relayCase = null;
    if (c.state === 'call' && (!cs || c.caseId === cs.id)) { c.dispatchAt = this.s.t; c.until = this.s.t + (extra || 0) + (c.turn || 0); }
  }
  radioZosCall(id) {
    const e = this.radioEntry(id); if (!e || e.state !== 'zos') return { ok: false };
    const crew = this.crewOf(e.crewId), cs = e.caseId ? this.caseOf(e.caseId) : null;
    e.state = 'done'; e.doneAt = this.s.t;
    if (e.kind === 'dispatch') { if (crew && cs && crew.relayHold && crew.caseId === cs.id) this._relayRun(crew, cs); return { ok: true }; }
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
    if (cs.script && cs.script.agency && (cs.patientCount || 1) <= 1) {
      const a = cs.script.agency;
      if (!(cs.agencies && cs.agencies[a.kind])) this._requestAgency(c, cs, a.kind, a.why);
      return;
    }
    if ((cs.patientCount || 1) > 1 && !cs.methane) {
      cs.methane = true;
      const heavy = Math.max(1, Math.min(cs.patientCount, this.ri(1, 2)));
      const co = /oxid uhelnat/i.test(cs.up || '');   // otrava CO: více postižených, ne dopravní nehoda
      const txt = co
        ? `${cs.patientCount} ${cs.patientCount < 5 ? 'osoby' : 'osob'} s podezřením na otravu CO, z toho ${heavy} vážně, objekt ${this.pick(['odvětráváme', 'je odvětrán', 'nelze odvětrat'])}, HZS ${this.pick(['na místě', 'na cestě'])}, požadujeme ${heavy > 1 ? 'další RZP a lékaře' : 'další RZP'}.`
        : `dopravní nehoda, ${cs.patientCount} zranění, z toho ${heavy} vážně, ${this.pick(['nebezpečí provoz', 'únik provozních kapalin', 'bez dalšího nebezpečí'])}, přístup ${this.pick(['z obce', 'od křižovatky', 'po hlavní silnici'])}, ${this.pick(['HZS a PČR na místě', 'HZS na místě, PČR na cestě', 'PČR na místě'])}, požadujeme ${heavy > 1 ? 'další RZP a LZS' : 'další RZP'}.`;
      this._crewCall(c, cs, txt, [{ k: 'ok', label: 'Rozumí', say: 'ZCB101 rozumí.', ok: true, act: 'ack', def: true }], 'info');
      return;
    }
    if (c.type === 'RZP' && ((cs.script && cs.script.notFound) || (!['silnice', 'priroda'].includes(cs.where) && this.rnd() < 0.03))) {
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
  // koroner: jen fiktivně, bez omezení počtu výjezdů, přijede za x hodin (případ se může uzavřít hned po odjezdu posádek)
  _sendCoroner(cs, late) {
    const cor = cs.coroner; if (!cor || cor.state !== 'available') return { ok: false, msg: 'Koroner není k dispozici.' };
    const t = this.s.t, eta = this.rr(2400, 4 * 3600);
    cor.state = 'sent'; cor.sentAt = t; cor.arriveAt = t + eta;
    if (late) this._opsScore(-1, `koroner nevyslán do 15 min od potvrzení dostupnosti u ${cs.num} (vyslal kolega)`, cs.id);
    else if (t - (cor.availAt || t) <= 600) this._opsScore(1, `včas vyslaný koroner u ${cs.num}`, cs.id);
    this.L('sys', `${cs.num}: koroner ${cor.name || ''} vyslán${late ? ' (kolega ZOS)' : ''}, dorazí asi za ${Math.max(1, Math.round(eta / 3600 * 2) / 2)} h.`.replace('  ', ' '), cs.id);
    if (!this._busyCrews(cs).length) this._checkClose(cs);
    return { ok: true };
  }
  // ---------- first respondeři (FR) ----------
  // Jednotky z blízkého okolí (HZS, JPO, PČR, VZS, horská služba) dorazí k pacientovi dřív než ZZS a převezmou TANR od svědků.
  _frBusyNow(id) { const b = (this.s.frBusy || {})[id]; if (!b) return false; const c = this.caseOf(b); return !!c && c.status !== 'closed'; }
  frSuggest(caseId, max) {
    const cs = this.caseOf(caseId); if (!cs) return [];
    const T = ZOS_DATA.frTypes || {}, out = [];
    for (const f of ZOS_DATA.fr || []) {
      if (this._frBusyNow(f.id) || (cs.frs || []).some(x => x.id === f.id)) continue;
      const ty = T[f.type]; if (!ty) continue;
      const eta = (ty.turnout[0] + ty.turnout[1]) / 2 + driveSec(this._eta(f.lat, f.lon, cs.lat, cs.lon), 'N2');
      let pref = eta;
      if (cs.ind === 'tonuti' && f.type === 'VZS') pref *= 0.5;      // voda → vodní záchranáři mají přednost
      if (cs.where === 'priroda' && f.type === 'HS') pref *= 0.6;    // terén → horská služba
      out.push({ frId: f.id, name: f.name, type: f.type, label: ty.label, eta, pref });
    }
    out.sort((a, b) => a.pref - b.pref);
    return out.slice(0, max || 5);
  }
  sendFr(caseId, frId) {
    const cs = this.caseOf(caseId), t = this.s.t;
    if (!cs || cs.status === 'closed') return { ok: false, msg: 'Případ už je uzavřen.' };
    if (cs.typ === 'sekundární') return { ok: false, msg: 'FR nelze vyslat k plánovanému převozu.' };
    const sug = this.frSuggest(caseId, 80), pick = frId ? sug.find(x => x.frId === frId) : sug[0];
    if (!pick) return { ok: false, msg: 'Žádný volný first responder v dosahu.' };
    const f = ZOS_DATA.fr.find(x => x.id === pick.frId), ty = ZOS_DATA.frTypes[f.type];
    const turn = this.rr(ty.turnout[0], ty.turnout[1]);
    const dur = driveSec(this._eta(f.lat, f.lon, cs.lat, cs.lon), 'N2') * this.rr(0.95, 1.1);
    (cs.frs = cs.frs || []).push({ id: f.id, name: f.name, type: f.type, state: 'enroute', sentAt: t, arriveAt: t + turn + dur, lat: f.lat, lon: f.lon });
    (this.s.frBusy = this.s.frBusy || {})[f.id] = cs.id;
    const m = Math.max(1, Math.round((turn + dur) / 60));
    this.L('sys', `${cs.num}: vyslán FR ${f.name}, dojezd asi ${m} min.`, cs.id);
    return { ok: true, msg: `FR ${f.name} vyslán, dojezd asi ${m} min.` };
  }
  _frStep(cs) {
    const t = this.s.t;
    for (const a of cs.frs || []) {
      if (a.state === 'enroute' && t >= a.arriveAt) {
        a.state = 'onscene';
        const crewHere = cs.crews.some(id => { const k = this.crewOf(id); return k && k.caseId === cs.id && k.state === 'onscene'; });
        const txt = `${a.name} (FR) na místě, ${crewHere ? 'pomáhají posádce ZZS' : 'přebírají TANR od svědků'}`;
        (cs.radioReports = cs.radioReports || []).push({ id: `fr-${cs.radioReports.length + 1}`, at: t, received: false, acknowledged: false, source: 'First responder', text: txt });
        this.L('sys', `${cs.num}: FR ${a.name} na místě.`, cs.id);
      } else if (a.state === 'onscene' && !a.handed && cs.arrived) {
        a.handed = true;
        this.L('sys', `${cs.num}: FR ${a.name} předal pacienta posádce ZZS.`, cs.id);
      }
    }
  }
  // ---------- vizualizace pohybu PČR / HZS na mapě (trojúhelníky) ----------
  // Jen mapa: v logu ani v rádiu se pohyb neukazuje. Jednotky vyjíždějí z nejbližší hasičské / policejní stanice (hlídky PČR někdy z terénu),
  // na místě zůstanou dobu zásahu (u nehod déle než ZZS) a pak zmizí. Zkratky: CAS = cisternová automobilová stříkačka, AZ = automobilový žebřík,
  // TA = technický automobil, DA = dopravní automobil (JSDH); OOP = obvodní oddělení Policie ČR, DI = dopravní inspektorát, SKPV = služba kriminální policie a vyšetřování.
  _izsSpecs(cs, kind) {
    const up = String(cs.up || '') + ' ' + String(cs.poznamka || ''), dn = ['dn_poly', 'dn_lehke'].includes(cs.ind), trapped = /UVĚZN|ZAKLÍN|VYPROŠT/i.test(up);
    if (kind === 'hzs') {
      const fire = cs.ind === 'popal' || /POŽÁR|OXID UHELNAT/i.test(up), terrain = cs.where === 'priroda' || cs.ind === 'tonuti';
      if (dn) return trapped ? [{ cls: 'CAS 20', after: true }, { cls: 'TA', after: true }] : [{ cls: 'CAS 20', after: true }];
      if (fire) return [{ cls: 'CAS 30' }, { cls: 'AZ 30' }];
      if (terrain) return [{ cls: 'TA' }, { cls: 'DA' }];
      if (cs.ind === 'asist') return [{ cls: this.rnd() < 0.4 ? 'AZ 30' : 'CAS 20', after: true }];
      return [{ cls: 'CAS 20' }];
    }
    if (dn) return [{ cls: 'Hlídka OOP', after: true }, { cls: 'Hlídka DI', after: true }];
    if (cs.exitus || ['obeseni', 'resus', 'nzo'].includes(cs.ind)) return [{ cls: 'Hlídka OOP' }, { cls: 'SKPV' }];
    if (cs.ind === 'asist') return [{ cls: 'Hlídka OOP', after: true }];
    return [{ cls: 'Hlídka OOP' }];
  }
  _izsLabel(cls) {
    return { 'CAS 20': 'CAS 20 – cisternová automobilová stříkačka', 'CAS 30': 'CAS 30 – cisternová automobilová stříkačka', 'AZ 30': 'AZ 30 – automobilový žebřík', TA: 'TA – technický automobil (vyprošťování)', DA: 'DA – dopravní automobil jednotky SDH',
      'Hlídka OOP': 'Hlídka OOP – obvodní oddělení Policie ČR', 'Hlídka DI': 'Hlídka DI – dopravní inspektorát Policie ČR', SKPV: 'SKPV – služba kriminální policie a vyšetřování' }[cls] || cls;
  }
  _izsMake(cs, kind, spec, from, who, t0, t1, idx, fromField) {
    t1 = Math.max(t1, t0 + 60);
    let path = null, frac = null;
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) { try { const r = ROUTER.route(from[0], from[1], cs.lat, cs.lon); if (r && r.pts && r.pts.length >= 4) { path = r.pts; frac = r.frac; } } catch (_) { path = null; } }
    const hzs = kind === 'hzs', stay = hzs ? (spec.cls === 'TA' ? this.rr(2400, 4500) : this.rr(900, 2400)) : this.rr(900, 2400);
    return { id: `iz${cs.id}-${kind}${idx}`, kind, cls: spec.cls, label: this._izsLabel(spec.cls), who, fromField: !!fromField, from, t0, t1, mv: { a: from, b: [cs.lat, cs.lon], t0, t1, dw: 0, path, frac }, stay, after: !!spec.after, extra: this.rr(300, 1500), off: [(idx % 3) * 0.00022 - 0.00022, (idx >> 1) * 0.00018 + 0.00012] };
  }
  _izsSync(cs) {
    const A = cs.agencies, FRs = cs.frs, U = cs.izs || (cs.izs = []);
    const F = ZOS_DATA.fr || [];
    const near = (types, k) => F.filter(f => types.includes(f.type)).map(f => [f, hav(f.lat, f.lon, cs.lat, cs.lon)]).sort((a, b) => a[1] - b[1]).slice(0, k).map(x => x[0]);
    for (const kind of ['pcr', 'hzs']) {
      const a = A && A[kind]; if (!a || a.izsDone || !(a.state === 'sent' || a.state === 'onscene') || a.arriveAt == null) continue;
      a.izsDone = true;
      const specs = this._izsSpecs(cs, kind), st = near(kind === 'pcr' ? ['PCR'] : ['HZS'], 3);
      const t1 = a.arriveAt, t0 = Math.min(t1 - 60, (a.sentAt != null ? a.sentAt : this.s.t) + (kind === 'hzs' ? this.rr(60, 150) : this.rr(30, 120)));
      specs.forEach((sp, i) => {
        const field = kind === 'pcr' && i === 0 && this.rnd() < 0.4;   // hlídka PČR vyráží z terénu, ne ze stanice
        let from, who;
        if (field) { const ang = this.rnd() * Math.PI * 2, km = this.rr(3, 12); from = [cs.lat + Math.sin(ang) * km / 111, cs.lon + Math.cos(ang) * km / 72.8]; who = 'z terénu'; }
        else { const s0 = st[Math.min(i, st.length - 1)]; if (!s0) return; from = [s0.lat, s0.lon]; who = s0.name; }
        U.push(this._izsMake(cs, kind, sp, from, who, t0 + i * this.rr(0, 90), t1 + i * this.rr(20, 240), U.length, field));
      });
    }
    for (const f of FRs || []) {
      if (f.izsDone || !['HZS', 'JPO2', 'JPO3', 'JPO4', 'PCR'].includes(f.type)) continue;
      f.izsDone = true;
      const kind = f.type === 'PCR' ? 'pcr' : 'hzs';
      U.push(this._izsMake(cs, kind, { cls: kind === 'pcr' ? 'Hlídka OOP' : f.type === 'HZS' ? 'CAS 20' : 'DA' }, [f.lat, f.lon], f.name, f.sentAt, f.arriveAt, U.length, false));
    }
  }
  // kdy jednotka z místa odjede: u nehod a asistencí až po odjezdu ZZS (a ještě chvíli), jinak po době zásahu
  izsLeaveAt(cs, u) {
    const base = u.t1 + u.stay;
    if (!u.after) return base;
    if (cs.status === 'closed') return Math.max(base, (cs.closedAt != null ? cs.closedAt : this.s.t) + u.extra);
    return Infinity;
  }
  // viditelné jednotky: [{ u, cs, lat, lon, moving, from }] v čase t (jen pro mapu)
  izsVisible(t) {
    const out = [];
    for (const cs of this.s.cases) for (const u of cs.izs || []) {
      if (t < u.t0 || t >= this.izsLeaveAt(cs, u)) continue;
      if (t < u.t1) { const p = this.pos({ mv: u.mv, lat: u.from[0], lon: u.from[1] }, t), q = this.pos({ mv: u.mv, lat: u.from[0], lon: u.from[1] }, Math.min(u.t1, t + 8)); out.push({ u, cs, lat: p.lat, lon: p.lon, hd: Math.atan2((q.lon - p.lon) * 0.66, q.lat - p.lat) * 180 / Math.PI, moving: true }); }
      else out.push({ u, cs, lat: cs.lat + u.off[1], lon: cs.lon + u.off[0], hd: 0, moving: false });
    }
    return out;
  }
  // ---------- součinnost PČR / HZS (dlaždice jako koroner) ----------
  sendAgency(caseId, kind, viaRadio) {
    if (kind === 'fr') return this.sendFr(caseId);
    const cs = this.caseOf(caseId); if (!cs || cs.status === 'closed') return { ok: false, msg: 'Případ už je uzavřen.' };
    const A = cs.agencies || (cs.agencies = {});
    if (kind === 'cor') {
      if (!cs.exitus) return { ok: false, msg: 'Koronera lze přiřadit jen k případu s exitem.' };
      const cor = cs.coroner;
      if (!cor) { cs.coroner = { state: 'pending', answerAt: this.s.t + this.rr(120, 300) }; return { ok: true, msg: 'ZOS zjišťuje dostupnost koronera.' }; }
      if (cor.state === 'pending') return { ok: false, msg: 'Dostupnost koronera se teprve zjišťuje.' };
      if (cor.state === 'unavailable') return { ok: false, msg: 'Koroner není k dispozici – prohlídku provede lékař RV.' };
      if (cor.state === 'sent') return { ok: true, msg: 'Koroner už je na cestě.' };
      return this._sendCoroner(cs, false);
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
      if (a.state === 'requested' && !a.penal && t - a.reqAt > 360) { a.penal = true; this._opsScore(-1, `nevyrozuměná ${nm} ${a.fromCall ? 'dle výzvy' : 'na žádost posádky'} u ${cs.num}`, cs.id); }
    }
  }
  _agencyHold(cs) { const A = cs.agencies || {}; return ['pcr', 'hzs'].some(k => A[k] && A[k].reqAt != null && !A[k].fromCall && (A[k].state === 'requested' || A[k].state === 'sent') && this.s.t - A[k].reqAt < 2400); }
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
    if (this.s.radioMode === 'auto') for (const e of this.s.radioQ || []) if ((e.state === 'calling' || e.state === 'open' || e.state === 'zos') && !e.forceInteractive) {
      if (e.state === 'zos') { const k = this.crewOf(e.crewId); e.state = 'done'; if (k) this._zosSay(k, e.caseId ? this.caseOf(e.caseId) : null, e.msg, e.reply); continue; }
      if (e.state === 'calling') { this.L('crew', 'ZCB101 na příjmu.', e.caseId, e.crewId, 'zos'); this.L('crew', `${this._esign(e)}, ${e.msg}`, e.caseId, e.crewId, 'crew'); }
      e.state = 'open'; const def = (e.opts || []).find(x => x.def) || (e.opts || [])[0]; this.radioReply(e.id, def ? def.k : null, true);
    }
  }
  radioEntry(id) { return (this.s.radioQ || []).find(e => e.id === id); }
  radioAnswer(id) {
    const e = this.radioEntry(id); if (!e || e.state !== 'calling') return { ok: false };
    e.state = 'open'; e.openedAt = this.s.t; e.nextAt = this.s.t + 120;
    this.L('crew', 'ZCB101 na příjmu.', e.caseId, e.crewId, 'zos');
    this.L('crew', `${this._esign(e)}, ${e.msg}`, e.caseId, e.crewId, 'crew');
    return { ok: true };
  }
  radioReply(id, k, auto) {
    const e = this.radioEntry(id); if (!e || (e.state !== 'open' && e.state !== 'calling')) return { ok: false };
    if (e.state === 'calling') { if (!auto) return { ok: false }; }
    const o = (e.opts || []).find(x => x.k === k) || e.opts[0];
    e.state = 'done'; e.doneAt = this.s.t; e.reply = o ? o.k : null;
    if (e.kind === 'rv' && e.caseId) { const rc = this.caseOf(e.caseId); if (rc) rc.rvAckAt = this.s.t; }
    if (!o) return { ok: true };
    if (o.say) this.L('crew', o.say, e.caseId, e.crewId);
    if (o.say2) this.L('crew', o.say2, e.caseId, e.crewId);
    if (!auto && o.ok === false) this._opsScore(-1, `nevhodná odpověď na relaci ZCB${e.code}`, e.caseId);
    const cs = e.caseId ? this.caseOf(e.caseId) : null;
    if (o.act === 'vj-assign' && cs) { const r = this.assignVstricna(cs.id, o.crewId); if (!r.ok) { this.L('warn', r.msg, cs.id); if (cs.vstricna && cs.vstricna.state === 'offered') this.declineVstricna(cs.id); } }
    else if (o.act === 'vj-decline' && cs) this.declineVstricna(cs.id, auto);
    else if (o.act === 'nb-send') this._nbAccept(this._nbReq(e.nbId), o.crewId);
    else if (o.act === 'nb-decline') this._nbDecline(this._nbReq(e.nbId));
    else if (o.act === 'nb-later') this._nbLater(this._nbReq(e.nbId));
    else if (o.act === 'mu-dest' && cs && cs.mu) this._muDirect(cs, e, o.hid);
    else if (o.act === 'vj-self' && cs) this.L('crew', `ZCB${e.code} rozumí, jedeme sami.`, cs.id, e.crewId);
    else if (o.act === 'rv-ack' && cs) { if (!cs.docAssigned) { cs.rvForgetAt = this.s.t + 180; cs.rvForgetCrew = o.crewId; } } // posádku vysílá dispečer ručně; když zapomene, vyšle ji po prodlení kolega
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
      if (e.kind === 'nbreq') { // žádost sousedního kraje: vyprší podle žádosti (−1 b.), ne podle obecné relace
        const rq = this._nbReq(e.nbId);
        if (!rq || rq.state !== 'open') { e.state = 'done'; e.doneAt = t; continue; }
        if (t >= rq.expireAt) { this._nbTimeout(rq); e.state = 'missed'; continue; }
        if (e.state === 'calling' && t >= e.nextAt && e.tries < 3) { e.tries++; e.nextAt = t + 45; this.L('crew', `ZCB101, zde ${this._esign(e)}, příjem. (${e.tries}. volání)`, null, e.crewId); }
        continue;
      }
      if (e.state === 'zos') { if (t >= e.nextAt || (cs && cs.status === 'closed')) { e.state = 'missed'; if (e.kind === 'dispatch') { const k = this.crewOf(e.crewId); if (k && k.relayHold) { if (!cs || cs.status === 'closed' || k.caseId !== e.caseId) k.relayHold = false; else { this._relayRelease(k, cs, 0); this.L('warn', `ZCB${e.code}: výjezd zadán bez rádiové relace.`, e.caseId, e.crewId); } } } } continue; }
      if (t < e.nextAt) continue;
      if (e.state === 'calling' && e.tries < 3) { e.tries++; e.nextAt = t + 45; this.L('crew', `ZCB101, zde ${this._esign(e)}, příjem. (${e.tries}. volání)`, e.caseId, e.crewId); continue; }
      // bez odezvy: posádka si poradí sama, dispečer ztrácí provozní bod
      const wasCalling = e.state === 'calling';
      if (!e.noPenalty) this._opsScore(-1, `${wasCalling ? 'nepřijatá' : 'nedokončená'} relace ZCB${e.code}`, e.caseId);
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
}
if (typeof module !== 'undefined') module.exports = SimRadio;
