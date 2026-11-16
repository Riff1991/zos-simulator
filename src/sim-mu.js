// Mimořádná událost (SM01.06 rev. 8) – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimMU {
  // ================= MU podle SM01.06 rev. 8 =================
  // c.mu: phase suspected|declared, pts[] (skutečný stav pacientů, hráč ho zná jen z METHANE a odsunových relací),
  // mt (METHANE), hosp (kontaktní místa), nb (sousední ZZS), ext (cizí vozy), coroner, spis, avizoAt, endReady, ended
  // hráč, který MU neřídí (běžný provoz, nebo roli nezvolil), MU neslyší: hlášení jdou jen do logu bez pípnutí a hlasu
  _muQuiet() { return this.s.muPlayerRole !== 'mu'; }
  _ML(kind, txt, cid, crid) { return this.L(this._muQuiet() && (kind === 'alert' || kind === 'crew') ? 'sys' : kind, txt, cid, crid); }
  _muOpen() { return this.s.cases.filter(c => c.mu && c.status !== 'closed'); }
  // vzdálená popáleninová centra mimo kraj (Brno, Ostrava) jen pro MU; FNKV zůstává jako dřív
  _muFar(h) { return h.id === 'h-brno' || h.id === 'h-ostrava'; }
  _muQualifies(m) { return m.cas > 15 || m.groupsRequired >= 5; }
  _wPick(items, fn) {
    const tot = items.reduce((a, x) => a + fn(x), 0); let r = this.rnd() * tot;
    for (const x of items) { r -= fn(x); if (r < 0) return x; }
    return items[items.length - 1];
  }
  _muGenPatients(cas, type) {
    const T = type || {}, colW = T.col || [20, 30, 40, 10], kdW = T.kd || { T: 1 }, kinds = Object.keys(kdW);
    const colors = [];
    for (let i = 0; i < cas; i++) colors.push(this._wPick([1, 2, 3, 4], k => colW[k - 1]));
    if (colors.every(k => k === 4)) colors[0] = 3;
    return colors.map((color, i) => {
      const kind = this._wPick(kinds, k => kdW[k]);
      const dxs = (MU_DXK[kind] || MU_DXK.T)[color] || MU_DXK.T[color];
      return { n: i + 1, color, kind, upv: color === 1 && (kind === 'I' || kind === 'N' ? this.rnd() < 0.6 : this.rnd() < 0.45), child: color !== 4 && this.rnd() < (T.ch == null ? 0.1 : T.ch), dx: this.pick(dxs),
        burn: kind === 'P' || kind === 'P+T', burnExt: color === 1 && (kind === 'P' || kind === 'P+T'), tc: color === 1 && (kind === 'T' || kind === 'P+T'), st: 'scene', hid: null, vid: null, readyAt: null };
    });
  }
  _muHospInit() {
    const out = {};
    for (const id of MU_HOSP.concat(MU_BURN)) {
      const big = id === 'h-cb', mid = ['h-ta', 'h-jh', 'h-pi'].includes(id), burn = MU_BURN.includes(id);
      out[id] = { state: 'none', truth: burn ? { upv: this.ri(2, 3), jip: this.ri(3, 5), std: this.ri(5, 9) } : big ? { upv: this.ri(5, 8), jip: this.ri(6, 10), std: this.ri(20, 30) } : mid ? { upv: this.ri(2, 3), jip: this.ri(3, 5), std: this.ri(8, 14) } : { upv: this.ri(1, 2), jip: this.ri(2, 4), std: this.ri(6, 10) }, rep: null, repAt: null, replyAt: null };
    }
    return out;
  }
  // kontext pro výběr typu MU: měsíc, hodina, počasí (živé, nebo sezónní odhad)
  _muCtx() {
    const s = this.s, h = this.hour(), live = this._wxLive(), o = live ? this.wxObs() : null;
    const doy = (s.dayOfYear || 180) + Math.floor((s.startHour * 3600 + s.t) / 86400), mo = new Date(Date.UTC(2026, 0, 1) + (doy - 1) * 86400000).getUTCMonth() + 1;
    const summer = mo >= 5 && mo <= 9, winter = mo === 12 || mo <= 2;
    const r = () => this.rnd();
    return { mo, h, live, temp: o ? o.temp : null,
      thunder: o ? !!o.thunder : summer && h >= 12 && h < 22 && r() < 0.3, fog: o ? !!o.fog : (mo >= 10 || mo <= 2) && h < 10 && r() < 0.3,
      ice: o ? !!o.ice : winter && r() < 0.4, snow: o ? o.snow > 0.3 : winter && r() < 0.35, hot: o ? o.temp >= 29 : mo >= 6 && mo <= 8 && h >= 12 && h < 19 && r() < 0.35,
      school: mo !== 7 && mo !== 8 && h >= 6 && h < 17 };
  }
  _muPickType(ctx) {
    const list = ZOS_DATA.muTypes.filter(t => {
      if (t.m && !t.m.includes(ctx.mo)) return false;
      if (t.h && !(ctx.h >= t.h[0] && ctx.h < t.h[1])) return false;
      if (t.need && !ctx[t.need]) return false;
      return true;
    });
    return this._wPick(list.length ? list : ZOS_DATA.muTypes.filter(t => t.id === 'dn-retez'), t => t.w);
  }
  // reálné místo podle typu: objekt z OSM, bod na silnici dané třídy, železnice, letiště nebo adresa
  _muPlace(type, over) {
    const D = ZOS_DATA, pl = Array.isArray(type.place) ? this.pick(type.place) : (type.place || { k: 'addr' });
    // nejbližší skutečná obec podle databáze adres (pro popis silnic a tratí), jinak nejbližší větší město
    const A0 = typeof ZOS_ADDR !== 'undefined' && ZOS_ADDR && ZOS_ADDR.a ? ZOS_ADDR : null;
    const nearTown = (la, lo) => {
      if (A0) { const a = A0.a; let bi = -1, bd = 1e9; for (let i = 0; i < a.length; i += 8) { const dy = a[i] / 1e5 - la, dx = (a[i + 1] / 1e5 - lo) * 0.65, d = dy * dy + dx * dx; if (d < bd) { bd = d; bi = i; } } if (bi >= 0) return { n: A0.s[a[bi + 3]], okres: A0.okresy[a[bi + 6]] }; }
      let b = null, bd = 1e9; for (const tw of D.towns) { const d = hav(la, lo, tw.lat, tw.lon); if (d < bd) { bd = d; b = tw; } } return b;
    };
    const poiOf = () => {
      const list = typeof ZOS_POI !== 'undefined' && ZOS_POI && ZOS_POI.poi ? ZOS_POI.poi[pl.cat] : null;
      if (!list || !list.length) return null;
      const re = pl.re ? new RegExp(pl.re, 'i') : null, no = pl.not ? new RegExp(pl.not, 'i') : null;
      const ok = list.filter(p => (!re || (p[2] && re.test(p[2]))) && !(no && p[2] && no.test(p[2])));
      return ok.length ? this.pick(ok) : null;
    };
    if (pl.k === 'town') {
      const tw = D.towns.find(x => x.n === over.town) || this.pick(D.towns.filter(x => x.w >= 5));
      return { lat: tw.lat + 0.012, lon: tw.lon + 0.015, addr: type.air ? `okolí letiště u ${tw.n}` : `silnice I/${this.pick([3, 20, 34, 4])}, okolí ${tw.n}`, town: tw.n, okres: null };
    }
    if (pl.k === 'road' && typeof ROUTER !== 'undefined' && ROUTER.ready) {
      const p = ROUTER.randomRoadPoint(() => this.rnd(), pl.cls);
      if (p) { const tw = nearTown(p.lat, p.lon); return { lat: p.lat, lon: p.lon, addr: `${{ 0: 'dálnice D3', 1: 'silnice I. třídy', 2: 'silnice I. třídy', 3: 'silnice II. třídy', 4: 'silnice III. třídy' }[p.cls] || pl.lab}, okolí obce ${tw.n}`, town: tw.n, okres: tw.okres || null }; }
    }
    if (pl.k === 'rail') {
      const RI = railIndex();
      if (RI.segs.length) {
        // přejezd: bod trati, kde je do 15 m silnice (kromě dálnice a polních cest); trať: libovolný bod trati
        const want = pl.cross && typeof ROUTER !== 'undefined' && ROUTER.ready;
        let best = null;
        for (let g = 0; g < (want ? 600 : 1) && !best; g++) {
          let r = this.rnd() * RI.tot, lo = 0, hi = RI.segs.length - 1;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (RI.segs[mid].end < r) lo = mid + 1; else hi = mid; }
          const sg = RI.segs[lo], f = this.rnd(), la = (sg.a[0] + (sg.b[0] - sg.a[0]) * f) / 1e5, lo2 = (sg.a[1] + (sg.b[1] - sg.a[1]) * f) / 1e5;
          if (!want) { best = { lat: la, lon: lo2 }; break; }
          const sn = ROUTER.snap(la, lo2);
          if (sn && sn.d < 0.015 && sn.cls >= 1 && sn.cls <= 5) best = { lat: sn.lat, lon: sn.lon, cross: true };
        }
        if (!best) { const sg = RI.segs[Math.floor(this.rnd() * RI.segs.length)]; best = { lat: sg.a[0] / 1e5, lon: sg.a[1] / 1e5, cross: false }; }
        if (best) { const tw = nearTown(best.lat, best.lon); return { lat: best.lat, lon: best.lon, addr: `${pl.cross && !best.cross ? 'železniční trať' : pl.lab}, okolí obce ${tw.n}`, town: tw.n, okres: tw.okres || null }; }
      }
    }
    if (pl.k === 'airport') {
      // havárie u dráhy letiště České Budějovice (Planá): podél osy dráhy 09/27, do ~3 km od prahu
      const a = D.airport, side = this.rnd() < 0.5 ? -1 : 1;
      return { lat: a.lat + this.rr(-0.0025, 0.0025), lon: a.lon + side * this.rr(0.004, 0.04), addr: `okolí ${a.name}`, town: 'České Budějovice', okres: 'České Budějovice' };
    }
    if (pl.k === 'poi') {
      const p = poiOf();
      if (p) return { lat: p[0] / 1e5 + this.rr(-0.00012, 0.00012), lon: p[1] / 1e5 + this.rr(-0.00012, 0.00012), addr: p[2] ? `${p[3]} (${p[2].replace(/ /g, ' ')})` : p[3], town: p[4], okres: ZOS_POI.okresy[p[5]] || null };
    }
    const A = typeof ZOS_ADDR !== 'undefined' && ZOS_ADDR && ZOS_ADDR.a ? ZOS_ADDR : null;
    if (A) { const p = this._randomAddress(A); return { lat: p.lat, lon: p.lon, addr: p.address, town: p.city, okres: p.okres }; }
    const tw = this.pick(D.towns.filter(x => x.w >= 5));
    return { lat: tw.lat + this.rr(-0.01, 0.01), lon: tw.lon + this.rr(-0.01, 0.01), addr: `okolí obce ${tw.n}`, town: tw.n, okres: null };
  }
  _spawnMU(over) {
    over = over || {};
    const s = this.s, D = ZOS_DATA;
    let type = over.type ? D.muTypes.find(x => x.id === over.type) : null;
    if (!type && (over.town || over.aircraft != null || over.cas != null || over.groupsRequired != null)) {
      // starší volání (výcvik, testy): obecná nehoda u zadaného města
      type = Object.assign({}, D.muTypes.find(x => x.id === (over.aircraft ? 'letadlo-dopravni' : 'dn-retez')), { place: { k: 'town' }, hz: null });
    }
    if (!type) type = this._muPickType(this._muCtx());
    const aircraft = !!type.air;
    let cas = over.cas != null ? over.cas : this.ri(type.cas[0], type.cas[1]);
    if (over.minCas && over.cas == null && type.cas[1] >= over.minCas) cas = Math.max(cas, over.minCas);
    const groupsRequired = over.groupsRequired != null ? over.groupsRequired : Math.max(2, Math.ceil(cas / 3.5));
    const where = this._muPlace(type, over);
    // příznaky podle typu MU (jen standardizované položky katalogu); databáze MU obsahuje jen střelbu a výbuch, ty se použijí jen u příslušných typů
    const symptoms = (type.sy || []).concat([type.ch >= 0.5 ? 'Dítě' : 'Dospělý', 'SUSP. MIMOŘÁDNÁ UDÁLOST - VYHLAŠ / NEVYHLAŠ MU a podej hlášení z místa na ZOS']), up = symptoms.join(', ');
    const c = this._newCase({
      ind: 'mu', klasif: 'MU - MATRA 722', up, symptoms, charakter: type.house ? 'Tísňová výzva v budově' : 'Tísňová výzva v terénu',
      place: type.l, n: 1, dyn: false, rvNeed: true, rvLater: false, rvP: 1, zzumInd: false,
      addr: where.addr, town: where.town, okres: where.okres, lat: where.lat, lon: where.lon, age: 0, sex: 'M', child: false,
      desc: type.call, hospType: 'okresni', trans: true, scene: [20, 40], pocet: cas,
      poznamka: 'Více osob zraněno, rozsah události se ověřuje.', ozn: this._name(), oznRel: 'přepojeno z 112',
      phone: this._phone(), src: 'Linka 112', op: 'OP-A', intake: 25,
    });
    const m = { type: type.id, label: type.l, group: type.g, hz: type.hz || null, accessAt: null, cas, aircraft, groupsRequired, phase: 'suspected', declaredAt: null, sceneAt: null, firstMU: null, requestSent: false, reinforcementRequests: 0,
      pts: this._muGenPatients(cas, type), hosp: this._muHospInit(), nb: {}, queue: [], wave1: false, dirs: [], prog: 0, lastT: null, mistakes: 0,
      mt: { n: 0, pendingAt: null, reqAt: null, lastAt: null, ovd: 0 }, reported: null, avizoAt: null, hospContacted: false, reserveCalled: false,
      coroner: { known: false, state: null, arriveAt: null }, spis: { at: null, req: false, called: false, arriveAt: null }, nbAuto: false, endReady: false, endAt: null, ended: false, colAt: null };
    c.mu = m;
    const direct = over.direct != null ? over.direct : this.rnd() < 0.5;
    c.initialDispatchRequired = ['RZP', 'RV'];
    c.radioReports = [
      { id: 'mu-methane', at: c.readyAt + 90, received: false, acknowledged: false, source: 'Linka 112', text: `Prvotní hlášení: ${type.call} Počet a závažnost se ověřují.`, patientCount: cas },
      { id: 'mu-access', at: c.readyAt + 420, received: false, acknowledged: false, source: 'Linka 112', text: this.pick(['Příjezd k místu je možný, okolní provoz je zpomalen.', 'PČR uzavírá příjezdovou komunikaci, posádky navádějte od příjezdu.', 'HZS ověřuje bezpečný přístup k osobám; riziko na místě zatím není vyloučeno.']) },
    ];
    c.aircraftIncident = aircraft;
    if (direct && this._muQualifies(m)) this._muDeclare(c, c.readyAt, 'call');
    this.L('alert', `${m.phase === 'declared' ? 'MU' : 'PODEZŘENÍ NA MU'}: ${c.num} – ${type.l}, ${c.addr}. ${m.phase === 'declared' ? 'Vyhlášena při příjmu hovoru.' : 'Rozhodne vedoucí první posádky (SUSP MU).'}`, c.id);
    return c;
  }
  _muDeclare(cs, at, how) {
    const m = cs.mu; m.phase = 'declared'; m.declaredAt = at;
    cs.poznamka = how === 'call' ? 'MU – MATRA 722: vyhlášeno při příjmu tísňové výzvy.' : 'Rozsah události potvrdil vedoucí první posádky, vyhlášena MU.';
    this.L('alert', `${cs.num}: MU s HPO vyhlášena (${how === 'call' ? 'calltaker, MATRA 722' : 'vedoucí první posádky'}). OPIS HZS a IOS PČR vyrozuměny datovou větou.`, cs.id);
    if (this.rnd() < 0.6) m.spis.at = at + this.rr(900, 1500);
  }
  // první posádka na místě: vedoucí rozhodne o vyhlášení (SUSP MU), pak se plánuje METHANE
  _muFirstSceneReport(cs, crew, at) {
    const m = cs.mu; if (m.sceneAt != null) return;
    m.sceneAt = at; m.firstMU = at;
    cs.patientCount = cs.pocet = m.cas; cs.patientsRemaining = m.cas;
    cs.desc = `${m.label}, rozsah se ověřuje.`;
    if (m.hz) { m.accessAt = at + this.rr(m.hz[0], m.hz[1]); this._ML('alert', `${cs.num}: ${m.hz[2]}. Bezpečná zóna se vyhlašuje, do té doby se netřídí ani neodsouvá.`, cs.id); }
    if (m.phase === 'suspected') {
      if (this._muQualifies(m)) this._muDeclare(cs, at, 'scene');
      else {
        cs.klasif = { doprava: 'Dopravní nehoda', letadlo: 'Dopravní nehoda', latky: 'Intoxikace', budovy: 'Popálení, poleptání' }[m.group] || 'Trauma'; cs.poznamka = 'Rozsah MU se nepotvrdil; případ pokračuje jako běžná událost s více zraněnými.';
        cs.initialDispatchRequired = ['RZP']; cs.mu = null;
        if (!this.s.cases.some(c => c !== cs && c.mu && c.status !== 'closed')) this.s.muPlayerRole = null;
        this._ML('alert', `${cs.num}: vedoucí první posádky MU nevyhlašuje, případ pokračuje jako běžná událost s více zraněnými.`, cs.id);
        return;
      }
    }
    m.mt.pendingAt = at + this.rr(420, 660);
    this.L('sys', `${cs.num}: první posádka ${crew.code} na místě, METHANE se připravuje.`, cs.id);
  }
  _muDeclaredOpen() { return this.s.cases.some(c => c.mu && c.mu.phase === 'declared' && c.status !== 'closed' && !c.mu.ended); }
  // ponechání sil pro běžný provoz: na základně s více RZP zůstává 1 (v ČB 2)
  _muReserveBlocked(k, cs) {
    if (!cs || !cs.mu || k.type !== 'RZP' || k.ext || k.res) return false;
    const cb = ['cb', 'cbpr', 'cbpl', 'cbvl'].includes(k.st);
    const group = this.s.crews.filter(x => x.type === 'RZP' && !x.ext && !x.res && x.state !== 'off' && (cb ? ['cb', 'cbpr', 'cbpl', 'cbvl'].includes(x.st) : x.st === k.st));
    if (!cb && group.length <= 1) return false;
    const keep = cb ? 2 : 1;
    return group.filter(x => x.id !== k.id && x.caseId !== cs.id).length < keep;
  }
  _muTeams(c) {
    let n = 0;
    for (const id of c.crews) { const k = this.crewOf(id); if (k && k.caseId === c.id && k.state === 'onscene' && !k.caseRole) n += k.type === 'MU' ? 2 : 1; }
    return n;
  }
  _muVehicles(c) {
    const out = [], busy = new Set((this.s.radioQ || []).filter(e => e.kind === 'muodsun' && (e.state === 'calling' || e.state === 'open')).map(e => e.vid));
    for (const q of c.mu.queue || []) busy.add(q.vid);
    for (const id of c.crews) {
      const k = this.crewOf(id);
      if (!k || k.caseId !== c.id || k.state !== 'onscene' || k.caseRole || busy.has(k.id)) continue;
      if (k.type === 'RZP') out.push({ vid: k.id, k, type: 'RZP', code: k.code, cap: 2, only: null });
      else if (k.type === 'MU') out.push({ vid: k.id, k, type: 'MU', code: k.code, cap: 4, only: [3] });
      else if (k.type === 'LZS') out.push({ vid: k.id, k, type: 'LZS', code: k.code, cap: 1, only: [1] });
    }
    return out;
  }
  _muCat(p) { return p.upv ? 'upv' : p.color === 1 ? 'jip' : 'std'; }
  _muStep(c) {
    const m = c.mu, s = this.s, t = s.t, dt = m.lastT == null ? 0 : Math.max(0, t - m.lastT); m.lastT = t;
    if (m.ended) {
      if (!this._busyCrews(c).length) this._close(c, false);
      return;
    }
    if (m.phase === 'declared') this._muNbAuto(c);
    // kontaktní místa nemocnic odpovídají
    for (const id of Object.keys(m.hosp)) {
      const h = m.hosp[id];
      if (h.state === 'asked' && t >= h.replyAt) {
        h.state = 'known'; h.rep = { upv: Math.max(0, h.truth.upv), jip: Math.max(0, h.truth.jip), std: Math.max(0, h.truth.std) }; h.repAt = t;
        const hp = ZOS_DATA.hospitals.find(x => x.id === id);
        this._ML('alert', `${c.num} · KM ${hp.short}: volná lůžka UPV ${h.rep.upv}, JIP ${h.rep.jip}, standard ${h.rep.std}.`, c.id);
      }
    }
    // sousední ZZS odpovídají: skutečné posádky z jejich základen se vysílají na místo MU
    for (const nb of MU_NB) {
      const r = m.nb[nb.id]; if (!r) continue;
      if (r.state === 'asked' && t >= r.replyAt) {
        let n = 0;
        for (const id of r.crews) {
          const k = this.crewOf(id);
          if (!k || k.state !== 'off' || k.supportRequested) continue;
          k.supportRequested = true; k.supportRequestedFor = c.id; k.state = 'base'; k.lat = k.home.lat; k.lon = k.home.lon; k.mv = null;
          const a = this.assign(c.id, k.id);
          if (a.ok) n++; else this._nbRelease(k);
        }
        r.state = n ? 'sent' : 'none'; r.n = n;
        this._ML('alert', `${c.num} · ${nb.name}: ${n ? 'vysílá ' + n + '× ' + (nb.air ? 'LZS' : 'RZP') + ' na místo MU' : 'nemá volnou posádku'}.`, c.id);
      }
    }
    // odsun za kolegu: po prodlevě se pacienti směrují do nejvhodnější nemocnice bez rádiové relace
    if (m.queue && m.queue.length) {
      const due = m.queue.filter(q => t >= q.at); m.queue = m.queue.filter(q => t < q.at);
      for (const q of due) {
        const pts = q.n.map(n => m.pts.find(p => p.n === n)).filter(Boolean);
        if (!pts.length) continue;
        const hs = ZOS_DATA.hospitals.filter(h => MU_HOSP.includes(h.id) || (q.airOk && MU_BURN.includes(h.id)));
        const best = hs.map(h => ({ h, sc: this._muHospScore(c, pts[0], h, q.airOk) })).sort((a, b) => a.sc - b.sc)[0];
        this._muDirect(c, { patIds: q.n, vid: q.vid, t: null }, best.h.id);
      }
    }
    if (m.sceneAt == null) return;
    if (m.coroner.state === 'sent' && t >= m.coroner.arriveAt) { m.coroner.state = 'arrived'; this._ML('alert', `${c.num}: koroner dorazil na místo MU.`, c.id); }
    if (m.spis.called && m.spis.arriveAt != null && t >= m.spis.arriveAt && m.spis.arriveAt > 0) { m.spis.arriveAt = -1; this._ML('alert', `${c.num}: tým SPIS dorazil na místo.`, c.id); }
    if (m.phase !== 'declared') return;
    // třídění: každý tým na místě zpracuje pacienty podle priority
    const teams = this._muTeams(c), blocked = m.accessAt != null && t < m.accessAt;
    if (m.accessAt != null && !blocked && !m.accessLogged) { m.accessLogged = true; this._ML('alert', `${c.num}: PČR/HZS vyhlásily bezpečnou zónu, zahájeno třídění a odsun.`, c.id); }
    if (teams > 0 && !blocked) {
      m.prog += dt * teams;
      for (;;) {
        const nxt = m.pts.filter(p => p.st === 'scene').sort((a, b) => a.color - b.color || a.n - b.n)[0];
        if (!nxt) break;
        const cost = { 1: 300, 2: 240, 3: 150, 4: 45 }[nxt.color];
        if (m.prog < cost) break;
        m.prog -= cost; nxt.readyAt = t;
        if (nxt.color === 4) { nxt.st = 'dead'; if (!m.coroner.known) m.coroner.knownAt = t; m.coroner.known = true; } else nxt.st = 'ready';
      }
    } else m.prog = 0;
    this._muMethane(c);
    this._muOdsunCalls(c);
    if (m.spis.at != null && !m.spis.req && t >= m.spis.at) {
      m.spis.req = true; m.spis.reqAt = t;
      c.radioReports.push({ id: 'mu-spis', at: t, received: false, acknowledged: false, source: 'Vedoucí zdravotnické složky', text: 'Žádám aktivaci týmu SPIS (psychosociální pomoc) na místo události.', red: true });
    }
    // ukončení: všichni odvezeni / mrtví a koroner přijel; ukončení zásahu hlásí vedoucí zdravotnické složky
    const open = m.pts.some(p => !['delivered', 'dead'].includes(p.st));
    const corOk = !m.pts.some(p => p.st === 'dead') || m.coroner.state === 'arrived';
    if (!open && corOk && !m.endReady) {
      if (m.endAt == null) m.endAt = t + this.rr(90, 240);
      else if (t >= m.endAt) {
        m.endReady = true;
        c.radioReports.push({ id: 'mu-end', at: t, received: false, acknowledged: false, source: 'Vedoucí zdravotnické složky', text: 'Ukončuji zdravotnický zásah na místě MU, všichni postižení odvezeni. Žádám potvrzení ZOS.', red: true });
      }
    } else if (open || !corOk) m.endAt = null;
    if (t - (m.declaredAt || t) > 6 * 3600) { m.ended = true; this.L('warn', `${c.num}: MU ukončena po 6 h bez potvrzení.`, c.id); }
  }
  // ---- METHANE ----
  _muMethane(c) {
    const m = c.mu, t = this.s.t, mt = m.mt;
    if (mt.pendingAt != null && t >= mt.pendingAt) {
      mt.pendingAt = null; mt.n++; mt.lastAt = t;
      const pts = m.pts, rem = pts.filter(p => ['scene', 'ready', 'asked'].includes(p.st));
      const cnt = k => rem.filter(p => p.color === k).length;
      const first = mt.n === 1, j = v => first ? Math.max(0, v + this.ri(-1, 1)) : v;
      const r = { at: t, n: mt.n, exact: !first, I: j(cnt(1)), II: j(cnt(2)), III: j(cnt(3)), IV: j(pts.filter(p => p.st === 'dead' || (p.color === 4 && p.st === 'scene')).length),
        upv: rem.filter(p => p.upv).length, deti: rem.filter(p => p.child).length, transported: pts.filter(p => ['transport', 'delivered'].includes(p.st)).length, dead: pts.filter(p => p.st === 'dead').length };
      if (!first) r.IV = r.dead;
      if (first) { r.I = Math.max(r.I, 1); }
      r.total = r.I + r.II + r.III + r.IV;
      r.burn = pts.filter(p => p.burn && p.st !== 'dead').length;
      r.types = {}; for (const p of pts.filter(q => q.st !== 'dead')) r.types[p.kind] = (r.types[p.kind] || 0) + 1;
      m.reported = r;
      if (r.dead > 0) { if (!m.coroner.known) m.coroner.knownAt = t; m.coroner.known = true; }
      let text = `METHANE ${first ? '(první hlášení)' : '(aktualizace ' + mt.n + ')'}: na místě I: ${r.I}, II: ${r.II}, III: ${r.III}, IV: ${r.IV}; UPV ${r.upv}, děti ${r.deti}; odvezeno ${r.transported}, zemřelo ${r.dead}. Typ poranění: ${['P', 'P+T', 'T', 'I', 'N'].map(k => k + ' ' + (r.types[k] || 0)).join(', ')}; popálení: ${r.burn ? 'ano' : 'ne'}.`;
      const rep = { id: 'mu-mt' + mt.n, at: t, received: false, acknowledged: false, source: 'Vedoucí zdravotnické složky', text, red: true };
      if (first) {
        {
          rep.fields = {
            místo: c.addr, událost: m.label,
            rizika: m.hz ? m.hz[2] : this.pick(['bez dalšího zjevného rizika', 'provoz v okolí omezen', 'možný únik provozních kapalin']),
            přístup: this.pick(['příjezd možný od hlavní komunikace', 'příjezd omezen uzávěrou PČR', 'bezpečný přístup se právě ověřuje']),
            počet: `${r.total} postižených (odhad)`, složky: this.pick(['PČR na místě, HZS na cestě', 'HZS i PČR na místě', 'HZS žádán k zajištění místa, PČR organizuje dopravu']),
            lzs: m.aircraft ? this.pick(['přistávací plocha se ověřuje', 'plocha zatím není potvrzena', 'možnost přistání bude potvrzena po průzkumu']) : null,
          };
        }
        c.patientCount = c.pocet = r.total; c.desc = `${m.label}, hlášeno ${r.total} postižených.`;
      }
      c.radioReports.push(rep);
    }
    // aktualizace po ~30 min bez vyžádání: bez bodu a bez nových údajů
    if (mt.n > 0 && mt.lastAt != null && t > mt.lastAt + 2400 && mt.ovd < mt.n && mt.pendingAt == null) {
      mt.ovd = mt.n; m.mistakes++;
      this._opsScore(-1, `situační zpráva nebyla po 30 min aktualizována (${c.num})`, c.id);
    }
  }
  requestMuMethane(caseId) {
    const c = this.caseOf(caseId), t = this.s.t;
    if (!c || !c.mu || c.status === 'closed' || c.mu.ended) return { ok: false, msg: 'Situační hlášení lze žádat jen u otevřené MU.' };
    const m = c.mu, mt = m.mt;
    if (m.sceneAt == null) return { ok: false, msg: 'Zatím žádná posádka není na místě.' };
    if (mt.pendingAt != null && mt.pendingAt - t < 130) return { ok: false, msg: 'Hlášení se už připravuje.' };
    if (mt.n > 0 && t - mt.lastAt < 900) return { ok: false, msg: 'Aktualizace byla podána před chvílí (další po ~15 min).' };
    mt.reqAt = t; mt.pendingAt = t + this.rr(60, 130);
    if (mt.n > 0 && t - mt.lastAt >= 1500) this._opsScore(1, `aktivně vyžádána aktualizace METHANE (${c.num})`, c.id);
    this._ML('crew', `ZCB101 → Vedoucí zdravotnické složky: žádám ${mt.n ? 'aktualizaci situační zprávy' : 'situační zprávu METHANE'}.`, c.id);
    return { ok: true };
  }
  // ---- avízo, síly, modul, zálohy ----
  muAvizo(caseId) {
    const c = this.caseOf(caseId), t = this.s.t;
    if (!c || !c.mu || c.mu.phase !== 'declared' || c.status === 'closed') return { ok: false, msg: 'Avízo lze odeslat po vyhlášení MU.' };
    if (c.mu.avizoAt != null) return { ok: false, msg: 'Avízo MU už bylo odesláno.' };
    c.mu.avizoAt = t;
    this._ML('alert', `${c.num}: AVÍZO MU odesláno – SMS všem posádkám ve službě, vedení, SPIS, vedoucím oblastí. Na kanálu pro běžný provoz: „ZCB 101 vyhlašuje mimořádnou událost, ${c.addr}“. Posádky MU přeladěny na kanál MU.`, c.id);
    if (c.mu.declaredAt != null && t - c.mu.declaredAt <= 180) this._opsScore(1, `avízo MU odesláno do 3 min (${c.num})`, c.id);
    return { ok: true };
  }
  requestMuModule(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed' || c.mu.ended) return { ok: false, msg: 'Modul lze požádat jen k otevřené MU.' };
    if (c.mu.requestSent) return { ok: false, msg: 'Požadavek na modul už byl předán.' };
    c.mu.requestSent = true;
    this._ML('alert', `${c.num}: požadavek na vozidlo pro řešení následků MU předán (vyslat vůz MU, jeho posádku nahradit náhradní).`, c.id);
    return { ok: true };
  }
  muCallReserves(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed' || c.mu.phase !== 'declared') return { ok: false, msg: 'Zálohy lze svolat po vyhlášení MU.' };
    if (c.mu.reserveCalled) return { ok: false, msg: 'Zálohy už byly svolány.' };
    let n = 0;
    for (const k of this.s.crews) if (k.res && k.state === 'off' && n < 3 && this.activateReserve(k.id).ok) n++;
    c.mu.reserveCalled = true;
    this._ML('alert', `${c.num}: personální posila – aktivováno ${n} záloh (lékaři a NLZP přes vedoucí oblastí).`, c.id);
    return { ok: true };
  }
  // ---- sousední ZZS ----
  muRequestNeighbor(caseId, nbId) {
    const c = this.caseOf(caseId), nb = MU_NB.find(x => x.id === nbId), t = this.s.t;
    if (!c || !c.mu || !nb || c.status === 'closed' || c.mu.phase !== 'declared' || c.mu.ended) return { ok: false, msg: 'Pomoc lze žádat po vyhlášení MU.' };
    if (c.mu.nb[nbId]) return { ok: false, msg: `${nb.name}: už je požádáno.` };
    // skutečné základny sousedů: volné pozemní posádky kraje, nebo vrtulníky; při MU mají žádosti přednost bez limitu vzdálenosti
    const crews = this.s.crews.filter(k => k.ext && k.state === 'off' && !k.supportRequested && (nb.air ? nb.ids.includes(k.id) && !(k.externalDayOnly && !this._isLzsDay()) : k.externalGround && k.region === nb.region));
    if (!crews.length) return { ok: false, msg: `${nb.name}: teď nemá volnou posádku.` };
    c.mu.nb[nbId] = { at: t, replyAt: t + this.rr(60, 150), state: 'asked', n: 0, crews: crews.map(k => k.id) };
    this._ML('alert', `${c.num}: žádost o pomoc odeslána – ${nb.name}.`, c.id);
    return { ok: true };
  }
  requestMuReinforcement(caseId, count) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || c.status === 'closed' || c.mu.phase !== 'declared') return { ok: false, msg: 'Posily lze požadovat po potvrzení MU.' };
    let n = Math.max(1, Math.min(4, Number(count) || 2)), done = 0;
    for (const nb of MU_NB) { if (done >= n) break; if (!c.mu.nb[nb.id] && !nb.air && this.muRequestNeighbor(caseId, nb.id).ok) done++; }
    c.mu.reinforcementRequests = (c.mu.reinforcementRequests || 0) + done;
    return done ? { ok: true } : { ok: false, msg: 'Všichni sousedé už byli osloveni.' };
  }
  _muNbAuto(c) {
    const m = c.mu, t = this.s.t;
    if (m.nbAuto || m.declaredAt == null || t - m.declaredAt < 1800 || Object.keys(m.nb).length) return;
    m.nbAuto = true;
    this._ML('alert', `${c.num}: sousední kraje nabízejí výpomoc (po 30 min od vyhlášení).`, c.id);
    this.muRequestNeighbor(c.id, 'VY'); this.muRequestNeighbor(c.id, 'PL');
  }
  // ---- nemocnice (403) ----
  muContactHospitals(caseId) {
    const c = this.caseOf(caseId), t = this.s.t;
    if (!c || !c.mu || c.status === 'closed' || c.mu.ended) return { ok: false, msg: 'Kontaktní místa lze oslovit jen při otevřené MU.' };
    const m = c.mu;
    const set = ZOS_DATA.hospitals.filter(h => MU_HOSP.includes(h.id) && (h.id === 'h-cb' || hav(c.lat, c.lon, h.lat, h.lon) <= 45));
    const extra = ZOS_DATA.hospitals.filter(h => MU_HOSP.includes(h.id) && !set.includes(h)).sort((a, b) => hav(c.lat, c.lon, a.lat, a.lon) - hav(c.lat, c.lon, b.lat, b.lon));
    while (set.length < 3 && extra.length) set.push(extra.shift());
    if (m.reported && m.reported.burn > 0) for (const h of ZOS_DATA.hospitals) if (MU_BURN.includes(h.id) && !set.includes(h)) set.push(h);
    let n = 0;
    for (const h of set) { const hs = m.hosp[h.id]; if (hs.state === 'asked' || (hs.state === 'known' && t - hs.repAt < 300)) continue; hs.state = 'asked'; hs.replyAt = t + this.rr(90, 200); n++; }
    if (!n) return { ok: false, msg: 'Na odpověď kontaktních míst se čeká, nebo jsou údaje čerstvé (do 5 min).' };
    m.hospContacted = true;
    this._ML('alert', `${c.num}: kontaktní místa ${set.map(h => h.short).join(', ')} informována o MU (charakter, místo, odhad počtu, děti, čas příjezdu); žádáme volná lůžka UPV / JIP / standard.`, c.id);
    return { ok: true };
  }
  requestMuHospitalInfo(caseId) { return this.muContactHospitals(caseId); }
  requestMuLandingInfo(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || !c.mu.aircraft) return { ok: false, msg: 'Ověření plochy se používá u letecké nehody.' };
    if (c.mu.landingCheckRequested) return { ok: false, msg: 'Na ověření přistávací plochy se už čeká.' };
    c.mu.landingCheckRequested = true;
    const state = this.pick(['vhodná', 'podmíněně vhodná', 'zatím nevhodná']);
    c.radioReports.push({ id: `mu-landing-${c.radioReports.length + 1}`, at: this.s.t + this.rr(60, 150), received: false, acknowledged: false, source: 'Hlášení z místa', text: `Ověření plochy pro vrtulník: ${state}; stav přístupové trasy se může změnit.`, landingUpdate: true, landingStatus: state });
    this.L('sys', `${c.num}: vyžádáno ověření vhodnosti plochy pro LZS.`, c.id);
    return { ok: true };
  }
  // ---- SPIS, koroner, konec ----
  muCallSpis(caseId) {
    const c = this.caseOf(caseId);
    if (!c || !c.mu || !c.mu.spis.req) return { ok: false, msg: 'Vedoucí zdravotnické složky o SPIS nežádal.' };
    if (c.mu.spis.called) return { ok: false, msg: 'SPIS už byl volán.' };
    c.mu.spis.called = true; c.mu.spis.calledAt = this.s.t; c.mu.spis.arriveAt = this.s.t + this.rr(1500, 2400);
    this._ML('alert', `${c.num}: vedení SPIS voláno, tým se aktivuje po vlastní linii.`, c.id);
    return { ok: true };
  }
  muCallCoroner(caseId) {
    const c = this.caseOf(caseId), t = this.s.t;
    if (!c || !c.mu || !c.mu.coroner.known) return { ok: false, msg: 'Zatím není hlášeno žádné úmrtí.' };
    if (c.mu.coroner.state) return { ok: false, msg: 'Koroner už byl aktivován.' };
    c.mu.coroner.calledAt = t; c.mu.coroner.state = 'sent'; c.mu.coroner.arriveAt = t + this.rr(1200, 2100);
    this._ML('alert', `${c.num}: koroner aktivován.`, c.id);
    return { ok: true };
  }
  confirmMuEnd(caseId) {
    const c = this.caseOf(caseId), t = this.s.t;
    if (!c || !c.mu || c.status === 'closed') return { ok: false, msg: 'MU není otevřená.' };
    if (!c.mu.endReady) return { ok: false, msg: 'Vedoucí zdravotnické složky ještě ukončení zásahu nehlásil.' };
    c.mu.ended = true; c.mu.endedAt = t;
    this.L('alert', `${c.num}: MU ukončena. „ZCB 101 vyhlašuje ukončení mimořádné události.“ Kontaktní místa nemocnic, SPIS, HZS a PČR informováni; informační SMS o ukončení odeslána.`, c.id);
    return { ok: true };
  }
  setMuDispatcher(role) {
    if (!['mu', 'normal'].includes(role)) return { ok: false, msg: 'Vyber dispečink MU nebo běžný provoz.' };
    if (!this.s.cases.some(c => c.mu && c.status !== 'closed')) return { ok: false, msg: 'Není otevřená mimořádná událost.' };
    this.s.muPlayerRole = role;
    this.L('sys', role === 'mu' ? 'Přebíráš MU (401); simulovaný kolega řeší běžný provoz.' : 'Přebíráš běžný provoz; simulovaný kolega řeší MU.');
    return { ok: true };
  }
  // ---- odsun: vedoucí odsunu volá rádiem, ZOS volí nemocnici ----
  _muOdsunCalls(c) {
    const m = c.mu, s = this.s, t = s.t;
    if (m.avizoAt == null && m.phase === 'declared' && t - m.declaredAt < 120) return;
    const rq = s.radioQ || [], openN = rq.filter(e => e.kind === 'muodsun' && e.caseId === c.id && (e.state === 'calling' || e.state === 'open')).length;
    let slots = 3 - openN;
    const ready = m.pts.filter(p => p.st === 'ready').sort((a, b) => a.color - b.color || a.n - b.n);
    if (slots <= 0 || !ready.length) return;
    const caller = c.crews.map(id => this.crewOf(id)).find(k => k && k.caseId === c.id && k.state === 'onscene' && k.type === 'RZP') || c.crews.map(id => this.crewOf(id)).find(k => k && k.caseId === c.id && k.state === 'onscene');
    if (!caller) return;
    const vehicles = this._muVehicles(c), taken = new Set();
    for (const p of ready) {
      if (slots <= 0) break;
      if (taken.has(p.n)) continue;
      const order = p.burnExt ? ['LZS', 'RZP'] : p.color === 1 ? ['RZP', 'LZS'] : p.color === 3 ? ['MU', 'RZP'] : ['RZP'];
      let v = null;
      for (const ty of order) { v = vehicles.find(x => x.type === ty && (!x.only || x.only.includes(p.color))); if (v) break; }
      if (!v) continue;
      vehicles.splice(vehicles.indexOf(v), 1);
      const group = [p];
      if (p.color === 3 && v.cap > 1) for (const q of ready) if (group.length < v.cap && q.color === 3 && q.n !== p.n && !taken.has(q.n)) group.push(q);
      for (const q of group) { taken.add(q.n); q.st = 'asked'; q.vid = v.vid; }
      if (this._muQuiet(c)) { (m.queue || (m.queue = [])).push({ n: group.map(g => g.n), vid: v.vid, airOk: v.type === 'LZS' && group.some(g => g.burn), at: this.s.t + this.rr(20, 70) }); slots--; continue; }
      this._muOdsunRq(c, caller, v, group); slots--;
    }
  }
  _muHospScore(c, p, h, airOk) {
    const hs = c.mu.hosp[h.id], cat = this._muCat(p);
    const left = hs.rep ? hs.rep[cat] : hs.truth[cat] - 3; // neinformované KM: odhad opatrně
    let sc = airOk ? hav(c.lat, c.lon, h.lat, h.lon) / 4 + 3 : this._eta(c.lat, c.lon, h.lat, h.lon) / 60;   // LZS letí vzdušnou čarou (~240 km/h)
    if (left <= 0) sc += 100;
    if (!hs.rep) sc += 6;
    if (h.burn) sc += p.burnExt && airOk ? -80 : 300;
    else if (p.burnExt && airOk) sc += 60;
    if (p.tc && h.id !== 'h-cb' && !h.burn) sc += 60;
    if (p.child && h.id !== 'h-cb') sc += 8;
    return sc;
  }
  _muOdsunRq(c, caller, v, group) {
    const m = c.mu, p = group[0];
    const airOk = v.type === 'LZS' && group.some(g => g.burn);
    const hs = ZOS_DATA.hospitals.filter(h => MU_HOSP.includes(h.id) || (airOk && MU_BURN.includes(h.id)));
    const opts = hs.map(h => {
      const st = m.hosp[h.id], left = st.rep ? st.rep[this._muCat(p)] : null;
      const txt = st.rep ? `${this._muCat(p).toUpperCase()} ${left}` : 'kapacita neznámá';
      return { k: h.id, label: `${h.short} · ${txt}`, say: `ZCB101: ${group.length > 1 ? 'pacienti' : 'pacient'} TIK ${group.map(g => g.n).join(', ')} směrujte ${h.short}.`, ok: true, act: 'mu-dest', hid: h.id, score: this._muHospScore(c, p, h, airOk) };
    });
    const best = opts.slice().sort((a, b) => a.score - b.score)[0]; best.def = true;
    opts.splice(opts.indexOf(best), 1); opts.unshift(best); best.label = '★ ' + best.label;   // doporučená nemocnice první
    const age = p.child ? 'dítě' : 'dospělý', col = MU_COL[p.color];
    const msg = group.length > 1
      ? `pacienti TIK ${group.map(g => g.n).join(', ')}, ${col}. priorita, ${group.map(g => g.dx).filter((x, i, a) => a.indexOf(x) === i).join(' / ')}, bez UPV, odsunový prostředek ${v.code}; kam je směrujeme?`
      : `pacient TIK ${p.n}, ${col}. priorita, ${p.kind}, ${p.dx}, ${age}, ${p.upv ? 'na UPV' : 'bez UPV'}, odsunový prostředek ${v.code}; kam ho směrujeme?`;
    const e = this._rq(caller, c, msg, opts, 'muodsun', { sign: 'Vedoucí odsunu', patIds: group.map(g => g.n), vid: v.vid, best: best.k, airOk });
    return e;
  }
  _muDirect(cs, e, hid) {
    const m = cs.mu, t = this.s.t, h = ZOS_DATA.hospitals.find(x => x.id === hid);
    if (!m || !h) return;
    const pts = (e.patIds || []).map(n => m.pts.find(p => p.n === n)).filter(Boolean);
    const hs = m.hosp[hid];
    if (hs.state === 'none' && !hs.noInfoPenalty) { hs.noInfoPenalty = true; m.mistakes++; this._opsScore(-1, `kontaktní místo ${h.short} nebylo o MU informováno (${cs.num})`, cs.id); }
    let delay = 0;
    const kv = this.crewOf(e.vid), air = !!(kv && kv.type === 'LZS');
    if (e.t != null) { m.respSum = (m.respSum || 0) + (t - e.t); m.respN = (m.respN || 0) + 1; }
    for (const p of pts) {
      const cat = this._muCat(p);
      if (hs.truth[cat] <= 0) { m.mistakes++; delay = 480; this._opsScore(-2, `${h.short} nemá volné lůžko ${cat.toUpperCase()} (TIK ${p.n}), pacient přesměrován`, cs.id); }
      hs.truth[cat]--; if (hs.rep && hs.rep[cat] > 0) hs.rep[cat]--;
      if (p.tc && hid !== 'h-cb' && !h.burn) { m.mistakes++; this._opsScore(-2, `těžké trauma TIK ${p.n} mimo traumacentrum`, cs.id); }
      if (air && p.burnExt && !h.burn) { m.mistakes++; this._opsScore(-1, `rozsáhlé popáleniny TIK ${p.n} mimo popáleninové centrum`, cs.id); }
      if (p.color === 1 && p.readyAt != null && t - p.readyAt > 1800) { m.mistakes++; this._opsScore(-1, `pacient I. priority (TIK ${p.n}) čekal na odsun přes 30 min`, cs.id); }
      p.st = 'transport'; p.hid = hid; p.vid = e.vid; p.dirAt = t;
      m.dirs.push({ n: p.n, color: p.color, kind: p.kind, upv: p.upv, child: p.child, hid, vid: e.vid, at: t });
    }
    const nums = pts.map(p => p.n).join(', ');
    this._ML('alert', `${cs.num}: odsun TIK ${nums} → ${h.short} (${kv ? kv.code : ''})`, cs.id);
    const k = kv;
    if (k) {
      const dur = k.type === 'LZS' ? this._goAir(k, h.lat, h.lon) : this._go(k, h.lat, h.lon, 'P2');
      k.until = t + dur + delay; k.state = 'transport'; k.lzsLeg = null; k.muPats = pts.map(p => p.n);
      k.dest = { hid, name: `${h.short} – ${k.type === 'LZS' ? 'ARO' : 'urgentní příjem'}`, type: 'okresni', say: '' };
      k.hospitalRun = { hospitalName: k.dest.name, phase: 'transport', handoverSec: null, availableAt: t + dur + delay + 700 };
      k.muAsk = null;
    }
  }
  // transportní posádka předala pacienty v ZZ
  _muDelivered(c, cs) {
    const m = cs.mu; if (!m || !c.muPats) return;
    for (const n of c.muPats) { const p = m.pts.find(q => q.n === n); if (p) p.st = 'delivered'; }
    c.muPats = null;
  }
  // po předání: ZOS rozhodne o návratu na místo (pokud tam zbývají pacienti), jinak zpět na základnu
  _muReturn(c, cs) {
    const m = cs.mu; if (!m || m.ended || cs.status === 'closed' || c.type === 'LZS') return false;
    if (!m.pts.some(p => ['scene', 'ready', 'asked'].includes(p.st))) return false;
    const t = this.s.t, dur = this._go(c, cs.lat, cs.lon, 'N3');
    c.until = t + dur; c.state = 'enroute'; c.enrouteAt = t; c.dest = null; c.hospitalRun = null; c.arrivedAt = null;
    this.L('crew', `${c.name}: po předání pacientů se vrací na místo MU (rozhodnutí ZOS)`, cs.id, c.id);
    return true;
  }
  // uložená směna ze starší verze (MU bez jednotlivých pacientů)
  _muMigrate(c) {
    const o = c.mu, cas = o.cas || 12;
    const pts = this._muGenPatients(cas, !!o.aircraft), done = Math.max(0, cas - (o.left == null ? cas : o.left));
    pts.slice(0, done).forEach(p => { p.st = p.color === 4 ? 'dead' : 'delivered'; });
    c.mu = { cas, aircraft: !!o.aircraft, groupsRequired: o.groupsRequired || Math.max(2, Math.ceil(cas / 3.5)), phase: o.phase || 'declared', declaredAt: o.declaredAt != null ? o.declaredAt : c.readyAt,
      sceneAt: o.sceneReportSent || o.firstMU != null ? (o.firstMU || c.readyAt) : null, firstMU: o.firstMU || null, requestSent: !!o.requestSent, reinforcementRequests: 0,
      pts, hosp: this._muHospInit(), nb: {}, queue: [], wave1: true, dirs: [], prog: 0, lastT: null, mistakes: 0, mt: { n: 1, pendingAt: null, reqAt: null, lastAt: this.s.t, ovd: 1 }, reported: null,
      avizoAt: this.s.t, hospContacted: false, reserveCalled: false, coroner: { known: false, state: null, arriveAt: null }, spis: { at: null, req: false, called: false, arriveAt: null }, nbAuto: true, endReady: false, endAt: null, ended: false, colAt: null };
    c.radioReports = c.radioReports || [];
  }
  // Při vyhlášené MU se N2 vysílá jako dynamická indikace: jen RZP, lékař na vyžádání (SM01.06, 6.3.2).
  _muAdjustN2(c) {
    if (c.mu || c.n !== 2 || c.muAdj || c.typ === 'sekundární' || !this._muDeclaredOpen() || !(c.initialDispatchRequired || []).includes('RV') || c.docAssigned) return;
    c.muAdj = true; c.rvNeed = false; c.rvLater = this.rnd() < (c.rvP || 0.4); c.initialDispatchRequired = c.initialDispatchRequired.filter(x => x !== 'RV');
    c.initialDispatchSent = (c.initialDispatchSent || []).filter(x => x !== 'RV');
    this.L('sys', `${c.num}: při vyhlášené MU se N2 vysílá jako dynamická (jen RZP, lékař na vyžádání).`, c.id);
  }
  _muScore(c) {
    const m = c.mu, t = this.s.t;
    const delay = m.avizoAt != null && m.declaredAt != null ? 20 * clamp01(1 - ((m.avizoAt - m.declaredAt) - 180) / 420) : 0;
    const arrive = c.firstArrive != null ? 40 * clamp01(1 - ((c.firstArrive - c.readyAt) - 1200) / 1200) : 0;
    const expected = m.sceneAt != null ? Math.floor(((c.closedAt != null ? c.closedAt : t) - m.sceneAt) / 1800) : 0, given = Math.max(0, m.mt.n - 1);
    const rv = (m.mt.n >= 1 ? 8 : 0) + 7 * (expected ? clamp01(given / expected) : 1);
    // jen to, co dispečer ovlivní: chyby při odsunu (15), rychlost odpovědi na relace odsunu (5), reakce na žádost SPIS a koronera (5)
    const respAvg = m.respN ? m.respSum / m.respN : 60, respF = clamp01(1 - (respAvg - 60) / 180);
    const react = [];
    if (m.spis.req) react.push(clamp01(1 - (((m.spis.calledAt != null ? m.spis.calledAt : (c.closedAt != null ? c.closedAt : t)) - m.spis.reqAt) - 300) / 600));
    if (m.coroner.knownAt != null) react.push(clamp01(1 - (((m.coroner.calledAt != null ? m.coroner.calledAt : (c.closedAt != null ? c.closedAt : t)) - m.coroner.knownAt) - 300) / 600));
    const reactF = react.length ? react.reduce((a, b) => a + b, 0) / react.length : 1;
    const eff = 25 * (0.6 * clamp01(1 - m.mistakes / 6) + 0.2 * respF + 0.2 * reactF) * (m.ended ? 1 : 0.5);
    return { delay, arrive, rv, eff };
  }
  // ---- simulovaný kolega (řídí MU, když hráč řeší běžný provoz) ----
  _runMuAssistant() {
    const s = this.s, role = s.muPlayerRole;
    for (const cs of this._muOpen()) {
      if (role === 'mu' || cs.status === 'intake' || cs.mu.ended) continue;
      const m = cs.mu;
      if (m.colAt != null && s.t < m.colAt) continue;
      m.colAt = s.t + (this._muColleagueAct(cs) ? this.rr(30, 90) : 6);
    }
    if (role === 'mu') this._normalColleague();
    // rádiové relace odsunu za hráče (kolega je přijme a zvolí nemocnici s lidskou prodlevou)
    if (role !== 'mu') for (const e of s.radioQ || []) {
      if (e.kind !== 'muodsun' || (e.state !== 'calling' && e.state !== 'open')) continue;
      if (e.colAt == null) e.colAt = s.t + this.rr(20, 60);
      if (s.t < e.colAt) continue;
      if (e.state === 'calling') this.radioAnswer(e.id);
      const mcs = this.caseOf(e.caseId), p0 = mcs && mcs.mu && mcs.mu.pts.find(p => p.n === (e.patIds || [])[0]);
      if (p0) { const sc = (e.opts || []).map(o => ({ k: o.k, v: this._muHospScore(mcs, p0, ZOS_DATA.hospitals.find(h => h.id === o.hid), e.airOk) })).sort((x, y) => x.v - y.v)[0]; if (sc) e.best = sc.k; }
      this.radioReply(e.id, e.best);
    }
  }
  _muColleagueAct(cs) {
    const m = cs.mu, t = this.s.t, declared = m.phase === 'declared', since = declared ? t - m.declaredAt : 0;
    const cnt = type => cs.crews.filter(id => { const k = this.crewOf(id); return k && k.type === type && k.caseId === cs.id; }).length;
    const send = (type, text) => { const x = this.suggest(cs.id, type)[0]; if (x && this.assign(cs.id, x.crewId).ok) { this.L('sys', `Simulovaný dispečer ${text} k ${cs.num}.`, cs.id); return true; } return false; };
    if (declared && m.avizoAt == null) return this.muAvizo(cs.id).ok;
    if (declared && !m.wave1) {
      // první vlna najednou: RZP podle odhadu skupin, 2× RV, LZS a vůz MU
      m.wave1 = true;
      for (let i = cnt('RZP'); i < Math.min(m.groupsRequired, 8); i++) if (!send('RZP', 'vyslal RZP')) break;
      for (let i = cnt('RV'); i < 2; i++) if (!send('RV', 'vyslal RV')) break;
      if (!cnt('LZS') && (m.aircraft || m.groupsRequired >= 4)) send('LZS', 'vyslal LZS');
      if (m.groupsRequired >= 5 && !m.requestSent) this.requestMuModule(cs.id);
      if (m.requestSent && !cnt('MU')) send('MU', 'vyslal vůz MU');
      return true;
    }
    if (cnt('RZP') < 1 && send('RZP', 'vyslal RZP')) return true;
    if (cnt('RV') < 1 && send('RV', 'vyslal RV')) return true;
    if (declared && !m.hospContacted && this.muContactHospitals(cs.id).ok) return true;
    if (declared && m.reported && m.reported.burn > 0 && MU_BURN.some(id => m.hosp[id].state === 'none') && this.muContactHospitals(cs.id).ok) return true;
    if (cnt('RZP') < (declared ? Math.min(m.groupsRequired, 8) : 1) && send('RZP', 'vyslal RZP')) return true;
    if (cnt('RV') < (declared ? Math.min(2, Math.ceil(m.groupsRequired / 3)) : 1) && send('RV', 'vyslal RV')) return true;
    if (declared && !cnt('LZS') && (m.aircraft || m.cas >= 12) && send('LZS', 'vyslal LZS')) return true;
    if (declared && !m.requestSent && m.groupsRequired >= 5) return this.requestMuModule(cs.id).ok;
    if (declared && m.requestSent && !cnt('MU') && send('MU', 'vyslal vůz MU')) return true;
    if (declared && !m.hospContacted) return this.muContactHospitals(cs.id).ok;
    if (m.sceneAt != null && m.mt.pendingAt == null) {
      if ((m.mt.n === 0 && t > m.sceneAt + 300) || (m.mt.n > 0 && t >= m.mt.lastAt + 1740)) if (this.requestMuMethane(cs.id).ok) return true;
    }
    if (declared && since >= 300 && !m.reserveCalled) return this.muCallReserves(cs.id).ok;
    const rem = m.pts.filter(p => ['scene', 'ready', 'asked'].includes(p.st));
    if (declared && since >= 600 && rem.length > 4) { for (const id of ['VY', 'PL']) if (this.muRequestNeighbor(cs.id, id).ok) return true; }
    if (declared && since >= 900 && rem.filter(p => p.color === 1).length > 1) { for (const id of ['lzs-praha', 'lzs-plzen']) if (this.muRequestNeighbor(cs.id, id).ok) return true; }
    if (declared && since >= 1500 && rem.length > 6) { for (const id of ['SC', 'lzs-jihlava', 'lzs-linz']) if (this.muRequestNeighbor(cs.id, id).ok) return true; }
    if (declared && m.hospContacted && since >= 900) {
      const old = Object.values(m.hosp).some(h => h.state === 'known' && t - h.repAt > 1800);
      if (old && rem.length && this.muContactHospitals(cs.id).ok) return true;
    }
    if (m.spis.req && !m.spis.called) return this.muCallSpis(cs.id).ok;
    if (m.coroner.known && !m.coroner.state) return this.muCallCoroner(cs.id).ok;
    if (m.endReady && !m.ended) return this.confirmMuEnd(cs.id).ok;
    return false;
  }
  // běžný provoz za kolegu, když hráč řeší MU
  _normalColleague() {
    for (const cs of this.s.cases) {
      if (cs.mu || cs.n === 3 || cs.typ === 'sekundární' || cs.status === 'intake' || !['waiting', 'active'].includes(cs.status)) continue;
      const need = cs.initialDispatchRequired && cs.initialDispatchRequired.length ? cs.initialDispatchRequired : cs.firstAssign == null ? ['RZP'] : [];
      for (const type of need) {
        if (cs.initialDispatchSent.includes(type) || cs.crews.some(id => { const k = this.crewOf(id); return k && k.type === type && k.caseRole !== 'heli-transfer' && BUSY.includes(k.state); })) continue;
        const candidate = this.suggest(cs.id, type)[0];
        if (!candidate) continue;
        if (this.assign(cs.id, candidate.crewId).ok) this.L('sys', `Simulovaný dispečer vyslal ${type} k ${cs.num}.`, cs.id);
      }
    }
  }
  // výcvik: vypne náhodné případy, sekundáry, MU a změny počasí; případy se vkládají ručně
  startScripted(weather) {
    const s = this.s, far = 1e12;
    s.scripted = true;
    s.ev.nextSpawn = far; s.ev.nextSecond = far; s.ev.nextMU = null;
    s.weather.hours = null; s.weather.condition = weather || 'clear'; s.weather.nextChange = far;
    s.weather.previousStatus = this._lzsWeatherStatus();
  }
  setScriptedWeather(condition) {
    const w = this.s.weather; w.condition = condition; w.nextChange = 1e12; w.previousStatus = this._lzsWeatherStatus();
  }
  spawnScripted(over) { return this._spawn(over); }
  spawnScriptedMU(over) { return this._spawnMU(over); }
  spawnScriptedSecondary(scheduledAt, over) { return this._spawnSecondary(scheduledAt, over); }
  _spawnSecondary(scheduledAt, over) {
    const D = ZOS_DATA, t = this.s.t;
    let from, to;
    if (over && over.from && over.to) {
      from = D.hospitals.find(h => h.id === over.from); to = D.hospitals.find(h => h.id === over.to);
    } else if (this.rnd() < 0.75) {
      const cb = D.hospitals.find(h => h.id === 'h-cb'), other = this.pick(D.hospitals.filter(h => h.id !== 'h-cb' && !this._muFar(h)));
      if (this.rnd() < 0.5) { from = other; to = cb; } else { from = cb; to = other; }
    } else {
      const near = D.hospitals.filter(h => !this._muFar(h));
      from = this.pick(near); to = this.pick(near.filter(h => h.id !== from.id));
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
}
if (typeof module !== 'undefined') module.exports = SimMU;
