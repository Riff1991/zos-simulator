// Skóre a vyhodnocení směny – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimScore {
  // ---------- skóre ----------
  _scoreCase(c) {
    const t = this.s.t;
    const none = { delay: 0, arrive: 0, rv: 0, eff: 0, pen: 0, total: 0 };
    if (c.asg.length === 0 || c.firstAssign == null && c.firstArrive == null) { if (!c.arrived) return none; }
    const n = c.nOrig;
    const tgtD = { 1: 60, 2: 120, 3: 300 }[n], T = { 1: 720, 2: 960, 3: 1500 }[n];
    const fa = c.asg.length ? c.asg[0].t : t;
    // co hráč neovlivní, se nebodujeme: doba bez volné RZP a čekání na blízkou posádku, která se uvolňovala z předání
    const forced0 = (c.noCrewSec || 0) + (c.waitExcused || 0);
    const delay = 20 * clamp01(1 - (Math.max(0, (fa - c.readyAt) - forced0) - tgtD) / (2 * tgtD));
    // příjezd: hodnotí se volba posádky proti nejrychlejší dostupné (ne absolutní čas, ten dispečer vždy neovlivní)
    // Dojezd (50 b.): 25 b. za volbu posádky proti nejrychlejší dostupné a 25 b. za skutečný čas od převzetí: plné body do reálného mediánu
    // (ZOS_DATA.scoreAbs), plynule klesá k nule u reálného p90. Bez zvolené první RZP (c.pick) platí celých 50 b. za skutečný čas.
    let arrive;
    const [aLo, aHi] = ZOS_DATA.scoreAbs[n] || [520, 1100];
    // vlastní doba dojezdu se neboduje, kde ji dispečer nemohl ovlivnit: žádná volná posádka, čekání na blízkou a vzdálenost i nejbližší volné RZP (nad ~aLo − 2 min)
    const forced = forced0 + (c.pick ? Math.max(0, c.pick.best - Math.max(60, aLo - 120)) : 0);
    const absF = clamp01(1 - ((Math.max(0, ((c.firstArrive != null ? c.firstArrive : t) - c.readyAt) - forced)) - aLo) / (aHi - aLo));
    if (c.pick) { const over = c.pick.justified ? 0 : Math.max(0, c.pick.chosen - c.pick.best - (n === 3 ? 480 : 120)); arrive = 25 * clamp01(1 - over / (T * 0.6)) + 25 * absF; }
    else arrive = c.firstArrive != null ? 50 * absF : 0;
    const rv = this._rvScore(c);
    const eff = 15 * Math.min(1, (c.effRatio == null ? 1 : c.effRatio) / 0.85);
    if (c.mu) { const q = this._muScore(c); return { delay: q.delay, arrive: q.arrive, rv: q.rv, eff: q.eff, pen: c.pen, total: Math.max(0, q.delay + q.arrive + q.rv + q.eff - c.pen) }; }
    const pen = c.pen;
    const total = Math.max(0, delay + arrive + rv + eff - pen);
    return { delay, arrive, rv, eff, pen, total };
  }
  _rvScore(c) {
    if (c.rvScoreLock != null) return c.rvScoreLock;
    const activeRvReq = c.rvReq && !c.rvReq.cancelled;
    const needed = c.rvNeed || !!activeRvReq;
    if (!needed) return c.docAssigned ? 6 : 15;
    if (!c.docAssigned) return 0;
    if (activeRvReq) { const lag = (c.rvReq.satT != null ? c.rvReq.satT : c.docAssignT) - c.rvReq.t; return lag <= 240 ? 15 : lag <= 600 ? 9 : 3; }
    const lag = c.docAssignT - c.readyAt;
    return lag <= 240 ? 15 : lag <= 600 ? 10 : 5;
  }

  // doba dojezdu nejbližší volné RZP (po silniční síti, režim N2) k seznamu bodů [[lat, lon], …]; pro vrstvu pokrytí na mapě
  coverageSecs(targets) {
    const crews = this.s.crews.filter(c => c.type === 'RZP' && !c.ext && this.avail(c)).map(c => this.pos(c));
    if (!crews.length) return targets.map(() => Infinity);
    let times = null;
    if (typeof ROUTER !== 'undefined' && ROUTER.ready) times = ROUTER.coverage(crews.map(p => [p.lat, p.lon, 60]), targets);
    return targets.map((tg, i) => {
      let best = times ? times[i] : 1e9;
      if (!times) for (const p of crews) { const e2 = travelSec(p.lat, p.lon, tg[0], tg[1]) + 60; if (e2 < best) best = e2; }
      return driveSec(best, 'N2');
    });
  }
  _coverage() {
    const s = this.s, cv = s.cov;
    if (s.t < cv.next) return;
    cv.next = s.t + 90;
    const crews = s.crews.filter(c => c.type === 'RZP' && !c.ext && this.avail(c)).map(c => this.pos(c));
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

  // Složky skóre případů (vážený průměr jako u hodnocení případů) a časy podle naléhavosti pro přehled vyhodnocení.
  _compNew() { const b = () => ({ n: 0, disp: 0, dispN: 0, arr: 0, arrN: 0 }); return { w: 0, d: 0, a: 0, r: 0, e: 0, p: 0, byN: { 1: b(), 2: b(), 3: b() } }; }
  _compAdd(k, c, sc) {
    const w = { 1: 3, 2: 2, 3: 1 }[c.nOrig] || 1;
    k.w += w; k.d += w * sc.delay; k.a += w * sc.arrive; k.r += w * sc.rv; k.e += w * sc.eff; k.p += w * (sc.pen || 0);
    const b = !c.mu && k.byN[c.nOrig];
    if (b) {
      b.n++;
      if (c.asg && c.asg.length) { b.disp += c.asg[0].t - c.readyAt; b.dispN++; }
      if (c.firstArrive != null) { b.arr += c.firstArrive - c.readyAt; b.arrN++; }
    }
  }
  summary() {
    const s = this.s, a = s.agg, W = { 1: 3, 2: 2, 3: 1 };
    let sw = a.sw, sv = a.sv;
    const comp = a.comp ? JSON.parse(JSON.stringify(a.comp)) : this._compNew();
    for (const c of s.cases) {
      if (c.status === 'closed' || c.status === 'intake' || c.typ === 'sekundární' || c.carried) continue;
      const sc = this._scoreCase(c), w = W[c.nOrig];
      sw += w; sv += w * sc.total;
      this._compAdd(comp, c, sc);
    }
    const caseAvg = sw ? sv / sw : 0;
    const cov = s.cov.n ? s.cov.sum / s.cov.n * 100 : 100;
    const baseTotal = sw ? 0.75 * caseAvg + 0.25 * cov : 0;
    const opsPoints = a.opsPoints || 0;
    const total = Math.max(0, Math.min(100, baseTotal + opsPoints));
    return {
      total, baseTotal, opsPoints, opsLog: a.opsLog || [], lzs: a.lzs || null, caseAvg, coverage: cov, closed: a.closed, unserved: a.unserved, diversions: a.diversions,
      avgN1: a.arrN1 ? a.arrSum1 / a.arrN1 : null, legalPct: a.legalN ? a.legalOk / a.legalN * 100 : null,
      secondaryCompleted: a.secondaryCount || 0, secondaryAvg: a.secondaryCount ? a.secondarySum / a.secondaryCount : null,
      secondaryOnTime: a.secondaryOnTime || 0,
      comp: comp.w ? { delay: comp.d / comp.w, arrive: comp.a / comp.w, rv: comp.r / comp.w, eff: comp.e / comp.w, pen: comp.p / comp.w, byN: comp.byN } : null,
      cases: s.cases.filter(c => c.status !== 'intake').length, covNow: s.cov.last == null ? null : s.cov.last * 100,
    };
  }
}
if (typeof module !== 'undefined') module.exports = SimScore;
