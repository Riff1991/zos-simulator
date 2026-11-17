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
  // vytvoří případ z hovoru calltakera (viz formát nahoře); vrací případ
  addCallCase(h) {
    const f = h.form || {}, s = this.s, t = s.t;
    const temp = new this.constructor({ seed: h.seed, mode: 'free' }), tc = temp._spawn(), dt = t - temp.s.t;
    const o = JSON.parse(JSON.stringify(tc));
    for (const k of CT_RUNTIME) delete o[k];
    if (Array.isArray(o.radioReports)) for (const r of o.radioReports) if (r.at != null) r.at += dt;
    if (o.wakeAt != null) o.wakeAt += dt;
    const truth = { addr: tc.addr, lat: tc.lat, lon: tc.lon, n: tc.n, klasif: tc.klasif };
    const typedN = [1, 2, 3].includes(Number(String(f.n).replace(/\D/g, ''))) ? Number(String(f.n).replace(/\D/g, '')) : tc.n;
    // standardní adresa z databáze = kontrola proti zadání; silnice a místa (bez čísla) calltaker najde na mapě, jejich bod se bere jako správný
    const standard = /\d/.test(tc.addr) && !/okolí obce/i.test(tc.addr) && !/\(/.test(tc.addr);
    let geo = null, errM = 0;
    if (f.adresa && standard) {
      geo = this._ctGeocode(f.adresa);
      if (geo.quality) errM = Math.round(hav(geo.lat, geo.lon, tc.lat, tc.lon) * 1000);
    }
    const typed = f.adresa && standard ? String(f.adresa).trim() : tc.addr;
    const miss = geo && geo.quality && errM > 250 ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr } : null;
    o.n = typedN; o.intake = 0; o.addr = typed;
    if (geo && geo.quality && miss) { o.lat = geo.lat; o.lon = geo.lon; }
    if (f.klasif && f.klasif !== tc.klasif) o.klasifZadana = String(f.klasif);
    if (f.poznamka) o.poznamka = (o.poznamka ? o.poznamka + '; ' : '') + String(f.poznamka);
    const c = this._newCase(o);
    c.src = c.src || 'Linka 155';
    c.call = { seed: h.seed, sec: h.sec || null, truth, typed, quality: geo ? geo.quality : 'n/a', errM, miss: !!miss, truthN: tc.n, typedN, klasifOk: !f.klasif || f.klasif === tc.klasif };
    if (miss) c.addrMiss = miss;
    this.L('case', `Hovor od calltakera ${c.num}: N${typedN} – ${c.klasif}, ${c.addr}${miss ? ' (adresa nesedí)' : ''}`, c.id);
    return c;
  }
}
if (typeof module !== 'undefined') module.exports = SimCalltaker;
