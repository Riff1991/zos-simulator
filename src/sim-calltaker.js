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
// klasifikace zadaná podle pavouka x klasifikace generátoru: stejný název, nebo ekvivalent (v tabulce není Resuscitace, Pediatrické stavy ani Amputace jako samostatná klasifikace)
const CT_KLASIF_ALIAS = { resuscitace: ['nzo spatrena', 'porucha vedomi'], 'pediatricke stavy': '*', amputace: ['trauma', 'dopravni nehoda'] };
function ctKlasifOk(typed, truth) { const a = ctNorm(typed), b = ctNorm(truth); if (!a || a === b) return true; const al = CT_KLASIF_ALIAS[b]; return al === '*' || (Array.isArray(al) && al.includes(a)); }
const ctSymNorm = x => ctNorm(String(x).replace(/^[^A-Za-zÀ-ž0-9]+/, ''));
// hovory, které nevyžadují výjezd: calltaker má poradit nebo ukončit, vyslání posádky je chyba
const CT_BEZ = [
  { id: 'konz_hlava', popis: 'Volá s lehkou bolestí hlavy od rána, vzal(a) si prášek a chce se jen zeptat, jestli má jet do nemocnice. Je při vědomí, mluví normálně, nic dalšího nevadí.', spravne: 'poradit (lékař, lékárna), nevysílat' },
  { id: 'omyl_ordinace', popis: 'Chce objednat k praktickému lékaři a prodloužit recept; myslel(a), že volá na ordinaci. Nic akutního se neděje.', spravne: 'vysvětlit, že je to tísňová linka, nevysílat' },
  { id: 'zert', popis: 'Zkouší číslo ze zvědavosti, chichotá se, říká, že „jen zkouší, jestli to funguje“. Žádný pacient neexistuje.', spravne: 'ukončit, nevysílat' },
  { id: 'info_pohotovost', popis: 'Ptá se, kde je nejbližší pohotovost, protože ho od večera bolí zub. Je při vědomí, bez dalších potíží, chce jet vlastním autem.', spravne: 'sdělit pohotovost, nevysílat' },
  { id: 'horecka_dite', popis: 'Dítě má 37,8 °C od rána, je čilé, pije a hraje si. Rodič se ptá, co dát a kdy jet k lékaři.', spravne: 'poradit (dítě čilé, hlídat), nevysílat' },
  { id: 'misdial', popis: 'Vytočil(a) číslo omylem: nejdřív ticho, šustění a dětské hlasy, pak „ale… to je záchranka? promiňte, to byl omyl“.', spravne: 'ověřit, že je vše v pořádku, ukončit' },
  { id: 'stare_zadni', popis: 'Starší člověk chce, aby k němu přišel doktor kvůli bolestem zad, které trvají už týden. Je stabilní, bez dušnosti, bez náhlé změny stavu.', spravne: 'poradit praktického lékaře nebo LSPP, nevysílat' },
  { id: 'pozdni_nehoda', popis: 'Hlásí, že před hodinou viděl(a) nehodu, kterou už vyřešili policisté a záchranka; chce jen informovat. Nikdo teď nepotřebuje pomoc.', spravne: 'poděkovat a ukončit, nevysílat' },
  { id: 'prevoz', popis: 'Chce odvoz domů po ambulantní návštěvě nemocnice; je mobilní, jen nemá auto. Nejde o akutní stav.', spravne: 'vysvětlit, že je to věc dopravní služby, nevysílat' },
  { id: 'alkohol_povidani', popis: 'Podnapilý člověk se chce „jen s někým pobavit“, stěžuje si na samotu. Nic mu fyzicky není.', spravne: 'zdvořile ukončit, případně doporučit krizovou linku' },
  { id: 'test_telefonu', popis: 'Říká, že zkouší nový telefon a chce vědět, jestli je slyšet. Žádný pacient.', spravne: 'ukončit, nevysílat' },
  { id: 'chronik_tlak', popis: 'Ptá se, jestli je 150/90 moc, nic ho nebolí ani nemá závratě, tlak si měřil poprvé po týdnu.', spravne: 'poradit a ukončit, nevysílat' },
];
const CT_NOVA = ['dech je horší než před chvílí', 'přestal(a) odpovídat na oslovení', 'zbledl(a) a je zpocený(á)', 'krvácení se nezastavuje', 'je to pořád stejné, jen chce vědět, kdy dojedou', 'bolest se zhoršila'];
const ctNoDyn = a => (a || []).filter(x => !/DYNAMICKÁ INDIKACE/i.test(x));
class SimCalltaker {
  // rozbor zadané adresy: „Bezdrevská 1113/31, České Budějovice“ → { street, num, city }
  _ctParse(text) {
    const t = String(text || '').replace(/\([^)]*\)/g, ' '), parts = t.split(',').map(x => x.trim()).filter(Boolean);
    let left = parts[0] || '', city = parts.length > 1 ? parts[parts.length - 1] : '';
    const m = left.match(/(\bev\.?\s*\d+[a-zA-Z]?)\s*$/i) || left.match(/(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*$/) || left.match(/(?:č\.?\s*p\.?\s*)?(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)/i);
    const num = m ? m[1] : '';
    // „čp.“ není ulice (\b nefunguje u „č“); ulice stejná jako obec (vesnice bez ulic) se bere jako bez ulice
    let street = ctNorm(left.replace(num, ' ').replace(/(^|\s)č\.?\s*p\.?(?=\s|$)/i, ' '));
    if (street === ctNorm(city)) street = '';
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
  // near = {lat, lon}: stejnojmenné obce (Bernartice, Lhota …) a stejná adresa v různých částech obce se rozliší podle blízkosti k této poloze (AML, skutečné místo)
  _ctGeocode(text, near) {
    const idx = this._ctIndex(), p = this._ctParse(text);
    if (!idx.A || !p.city) return { quality: null, p };
    let list = idx.byCity.get(p.city); if (!list) return { quality: null, p };
    const a = idx.A.a, N = idx.N, S = idx.A.s, hasNear = !!near && Number.isFinite(near.lat) && Number.isFinite(near.lon), dist = i => hav(a[i] / 1e5, a[i + 1] / 1e5, near.lat, near.lon);
    if (hasNear) { const close = list.filter(i => dist(i) < 15); if (close.length) list = close; }
    // číslo v databázi je „popisné/orientační“ (401/70); volající říká i opačné pořadí (70/401) nebo jen jedno z čísel: nejlepší shoda vyhrává, při shodě nejbližší k poloze
    const tp = p.num ? p.num.split('/') : [], same = [];
    const score = num => {
      if (!tp.length) return 0;
      if (num === p.num) return 3;
      const dp = num.split('/');
      if (tp.length === 2 && dp.length === 2 && dp[0] === tp[1] && dp[1] === tp[0]) return 2.5;
      if (tp.length === 1) return dp[0] === tp[0] ? 2 : dp[1] === tp[0] ? 1.5 : 0;
      if (dp.length === 1) return dp[0] === tp[0] || dp[0] === tp[1] ? 1 : 0;
      return dp[0] === tp[0] ? 0.5 : 0;
    };
    let exact = null, exactD = Infinity, best = 0;
    for (const i of list) {
      const street = N(a[i + 2]), city = N(a[i + 3]), num = N(a[i + 4]);
      const st = street && street !== city ? street : '';
      if (st === p.street || (!p.street && !st)) {
        same.push(i);
        const sc = score(num);
        if (sc > 0) { const dd = hasNear ? dist(i) : 0; if (sc > best || (sc === best && dd < exactD)) { best = sc; exact = i; exactD = dd; } if (sc === 3 && !hasNear) break; }
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
  // referenční bod standardní adresy = adresní bod skutečné adresy (skutečné místo může být posunuté, např. provozovna nebo „před domem“); správně zadaná adresa pak nemá chybu
  _ctRef(tc) {
    const a = String(tc.addr || ''), m = /^(.+?) čp\. (.+)$/.exec(a), t = !a.includes(',') && m ? 'čp. ' + m[2] + ', ' + m[1] : a;
    const g = a ? this._ctGeocode(t, { lat: tc.lat, lon: tc.lon }) : null;
    return g && g.quality === 'exact' ? { lat: g.lat, lon: g.lon } : { lat: tc.lat, lon: tc.lon };
  }
  _ctLocate(adresa, tc, bod) {
    const standard = this._ctKind(tc) === 'dum', tol = this._ctTol(tc), ref = standard ? this._ctRef(tc) : { lat: tc.lat, lon: tc.lon };
    if (bod && Number.isFinite(Number(bod.lat)) && Number.isFinite(Number(bod.lon))) {
      const lat = Number(bod.lat), lon = Number(bod.lon), errM = Math.round(hav(lat, lon, ref.lat, ref.lon) * 1000);
      const miss = errM > 3 * tol ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr, thr: 3 * tol } : null;
      const searchDelay = !miss && errM > tol ? Math.round(60 + 90 * (errM - tol) / (2 * tol)) : 0;
      let conflict = false;
      if (adresa && standard) { const g = this._ctGeocode(adresa, { lat: tc.lat, lon: tc.lon }); conflict = !!(g.quality && hav(g.lat, g.lon, lat, lon) * 1000 > 3 * tol); }
      return { standard, typed: String(adresa || '').trim() || 'bod z mapy', geo: { quality: 'point', lat, lon }, errM, miss, tol, searchDelay, byPoint: true, conflict };
    }
    if (!adresa || !standard) return { standard, typed: String(adresa || tc.addr || '').trim(), geo: null, errM: 0, miss: null, tol, searchDelay: 0 };
    const geo = this._ctGeocode(adresa, { lat: tc.lat, lon: tc.lon });
    const errM = geo.quality ? Math.round(hav(geo.lat, geo.lon, ref.lat, ref.lon) * 1000) : 0;
    const miss = geo.quality && errM > 250 ? { lat: tc.lat, lon: tc.lon, m: errM, addr: tc.addr, thr: 250 } : null;
    return { standard, typed: String(adresa).trim(), geo, errM, miss, tol, searchDelay: 0 };
  }
  // volající cizinec nebo příslušník menšiny podle místa a seedu (jméno odpovídá původu); stejné rozhodnutí v callFacts i addCallCase
  _ctForeign(seed, tc) {
    const F = typeof window !== 'undefined' && window.CT_CIZINCI ? window.CT_CIZINCI : (typeof require === 'function' ? require('../calltaker/cizinci.js') : null);
    if (!F) return null;
    return F.foreignFor(ctRng(seed * 977 + 3), tc, (this.s.liveCalls && this.s.liveCalls.level) || 'bezne');
  }
  _ctN(v, dflt) { const n = Number(String(v == null ? '' : v).replace(/\D/g, '')); return [1, 2, 3].includes(n) ? n : dflt; }
  // AML (Advanced Mobile Location): fáze polohy volajícího podle seedu; pravda se nikdy nevrací (jen kruhy)
  _ctAml(seed, tc) {
    const R = ctRng(seed * 7 + 13), ri = (a, b) => Math.round(a + R() * (b - a));
    const r = R(), typ = r < 0.8 ? 'mobil' : r < 0.93 ? 'pevná' : 'skryté';
    const out = { typ, phases: [] };
    if (typ === 'pevná' && this._ctKind(tc) === 'dum') {   // adresa účastníka: ze 4/5 sedí s místem události
      const idx = this._ctIndex(), list = idx.byCity && idx.byCity.get(ctNorm(tc.town)), A = idx.A;
      if (R() < 0.8 || !list || !list.length) out.abonent = { adresa: tc.addr, lat: tc.lat, lon: tc.lon, shoda: true };
      else { const i = list[Math.floor(R() * list.length)], a = A.a, S = A.s, city = S[a[i + 3]], st = S[a[i + 2]], num = S[a[i + 4]]; out.abonent = { adresa: (st && st !== city ? st + ' ' + num : 'čp. ' + num) + ', ' + city, lat: a[i] / 1e5, lon: a[i + 1] / 1e5, shoda: false }; }
    }
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
  // varianty hovoru: bez výjezdu, opakovaný, druhý volající k téže události, zpětné volání po přerušení
  _ctKindFacts(view, key, c, aml, call, kind, P) {
    const rr = ctRng((view.seed || 1) * 31 + 7);
    if (call && call.cb) view.situace = ' Spojení se před chvílí přerušilo (špatný signál). Voláš zpět a navážeš tam, kde jste skončili; krátce se omluv.';
    if (kind === 'bez') {
      const scn = CT_BEZ.find(x => x.id === call.scn) || CT_BEZ[0];
      view.klinickyObraz = scn.popis; view.poznamka = ''; view.situace = (view.situace || '') + ' Tohle je hovor, který NEVYŽADUJE výjezd záchranky. Chovej se přesně podle popisu, nepřeháněj potíže.';
      key.naléhavost = 'bez výjezdu'; key.klasifikace = 'bez výjezdu'; key.vyjezd = false; key.scenar = scn.id; key.spravne = scn.spravne;
      key.dynamicka = false; key.lekar = false; key.priznaky = ''; key.priznakyList = [];
      aml.phases = aml.phases.slice(0, aml.typ === 'mobil' ? 1 : 0);
    } else if (kind === 'opak') {
      const pr = (call && call.nova) || CT_NOVA[Math.floor(rr() * CT_NOVA.length)];
      view.situace = (view.situace || '') + ' Voláš podruhé: posádka ještě nedorazila. ' + (pr.startsWith('je to') ? 'Nic nového, jen se ptáš, kdy dojedou, a jsi netrpělivý(á).' : 'Nově: ' + pr + '.') + ' Zeptáš se, kdy už dojedou.';
      view.opakovane = { novaInfo: pr };
    } else if (kind === 'dup' && typeof ZOS_PEOPLE !== 'undefined') {
      const rnd = ctRng((view.seed || 1) * 131 + 11), sex = rnd() < 0.5 ? 'M' : 'Ž', age = 22 + Math.floor(rnd() * 45), pe = ZOS_PEOPLE.person(rnd, sex, age);
      view.volajici = Object.assign({}, view.volajici, { jmeno: pe.full, vztah: 'svědek', telefon: ZOS_PEOPLE.phone(rnd), vek: age, pohlavi: sex === 'M' ? 'muž' : 'žena' });
      view.pacient = Object.assign({}, view.pacient, { jmeno: 'neznámý', pacientJeVolajici: false });
      if (P) view.persona = P.pickPersona(rnd, Object.assign({}, c, { oznRel: 'volá svědek', ozn: pe.full, oznAge: age, oznSex: sex }), 'bezne');
      view.situace = (view.situace || '') + ' Jsi jiný svědek téže události než ten, kdo volal dřív; vidíš ji z jiného místa. Víš méně: neznáš jméno ani věk pacienta, jen to, co vidíš zdálky. Můžeš zmínit, že už tam někdo telefonuje.';
      key.duplicita = true;
    }
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
      klasif: { ok: ctKlasifOk(f.klasif, truth.klasif), typed: f.klasif || '', truth: truth.klasif },
      n: { ok: call.typedN === truth.n, typed: call.typedN, truth: truth.n },
      dyn: { ok: f.dyn == null || !!f.dyn === !!truth.dyn, typed: f.dyn == null ? null : !!f.dyn, truth: !!truth.dyn },
      priznaky: f.cihla ? { jaccard: ctKlasifOk(f.klasif, truth.klasif) ? 1 : 0, typed: 0, truth: trueSym.length, cihla: true } : { jaccard: +ctJaccard(typedSym, trueSym).toFixed(2), typed: (f.priznaky || []).length, truth: trueSym.length },
      vek: { ok: age == null ? null : Math.abs(age - truth.age) <= tolAge, typed: age, truth: truth.age },
      jmena: { pacient: f.pJmeno || f.pPrijmeni ? same(f.pJmeno, tp.j) && same(f.pPrijmeni, tp.p) : null, volajici: f.vJmeno || f.vPrijmeni ? same(f.vJmeno, tcl.j) && same(f.vPrijmeni, tcl.p) : null },
      bodM: call.errM, tol: call.tol, aml: f.zdroj === 'AML', zdroj: f.zdroj || (f.bod ? 'mapa' : 'adresa'),
    };
  }
  // skrytá pravda a kontext hovoru podle seedu (stejné jako calltaker/factsheet.js): view = co ví volající, key = správná odpověď
  callFacts(seed, call) {
    const level = (this.s.liveCalls && this.s.liveCalls.level) || 'bezne', kind = (call && call.kind) || 'vyjezd';
    const temp = new this.constructor({ seed, mode: 'free' }), c = temp._spawn();
    const P = typeof window !== 'undefined' && window.CT_PERSONAS ? window.CT_PERSONAS : (typeof require === 'function' ? require('../calltaker/personas.js') : null);
    const fo = this._ctForeign(seed, c);
    const persona = P ? P.pickPersona(() => temp.rnd(), c, level, fo) : { typ: 'vecny', popis: 'věcný, klidný', stres: 0, spoluprace: 3, znalostAdresy: 3 };
    const bld = c.bld || {};
    const view = {
      seed,
      volajici: { jmeno: fo ? fo.jmeno : c.ozn, vztah: c.oznRel.replace(/^volá\s*/, '') || c.oznRel, telefon: c.phone, linka: c.src, vek: c.oznAge, pohlavi: c.oznSex === 'M' ? 'muž' : c.oznSex === 'Ž' ? 'žena' : '' },
      pacient: { jmeno: c.patientName, vek: c.age, pohlavi: c.sex === 'M' ? 'muž' : 'žena', pacientJeVolajici: /pacient sám/.test(c.oznRel) },
      misto: { adresa: c.addr, obec: c.town, okres: c.okres, castObce: c.cast || '', druh: c.where, popis: c.place || '', budova: bld.code === 3 ? 'bytový dům' : bld.code === 1 ? 'dům' : bld.code === 2 ? 'obytná budova' : '', podlazi: bld.levels || 0 },
      klinickyObraz: c.up, poznamka: c.poznamka || '', persona,
    };
    const key = { seed, 'naléhavost': 'N' + c.n, dynamicka: !!c.dyn, lekar: !!c.rvNeed, klasifikace: c.klasif, indikace: c.ind, adresa: c.addr, obec: c.town, pacient: c.patientName, vek: c.age, priznaky: c.up, priznakyList: (c.symptoms || []).slice(), telefon: c.phone, lat: c.lat, lon: c.lon };
    view.pocetPacientu = c.patientCount || 1;
    const aml = this._ctAml(seed, c);
    view.volajici.linkaTyp = aml.typ;
    this._ctKindFacts(view, key, c, aml, call, kind, P);
    return { view, key, tc: c, aml, kind };
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
    // hovor bere calltaker: případ nejde linkou 112/150/158, nejsou datové zprávy ani „nabírá se“ a složky (PČR/HZS) si volá calltaker v nabírání
    const needAg = (o.agNeed || []).slice(); o.agNeed = null;
    for (const k of Object.keys(o.agencies || {})) if (!needAg.includes(k)) needAg.push(k);
    delete o.agencies; o.phase = 'intake'; o.dzUntil = null;
    o.radioReports = (o.radioReports || []).filter(r => !/^dz/.test(String(r.id)));
    if (/Linka 15[08]|eCall|TCTV/i.test(String(o.src || ''))) o.src = 'Linka 155';
    { const fo0 = this._ctForeign(h.seed, tc); if (fo0) o.ozn = fo0.jmeno; }
    if (Array.isArray(o.radioReports)) for (const r of o.radioReports) if (r.at != null) r.at += dt;
    if (o.wakeAt != null) o.wakeAt += dt;
    const truth = { addr: tc.addr, lat: tc.lat, lon: tc.lon, n: tc.n, klasif: tc.klasif, rvNeed: !!tc.rvNeed, agNeed: needAg.slice(), pocet: tc.patientCount || 1, where: tc.where, dyn: !!tc.dyn, age: tc.age, sex: tc.sex, symptoms: (tc.symptoms || []).slice(), patient: tc.patientName, caller: (this._ctForeign(h.seed, tc) || {}).jmeno || tc.ozn };
    const typedN = this._ctN(f.n, tc.n), loc = this._ctLocate(f.adresa, tc, f.bod), baseNote = o.poznamka || '', note = this._ctNote(f);
    o.n = typedN; o.intake = 0; o.addr = loc.typed;
    if (loc.geo && loc.miss) { o.lat = loc.geo.lat; o.lon = loc.geo.lon; }
    if (f.klasif && !ctKlasifOk(f.klasif, tc.klasif)) o.klasifZadana = String(f.klasif);
    if (note) o.poznamka = (baseNote ? baseNote + '; ' : '') + note;
    const c = this._newCase(o);
    c.src = c.src || 'Linka 155';
    if (f.cihla) { c.klasifTruth = c.klasif; c.klasif = f.klasifTabulka || 'Neklasifikováno'; c.sympShown = (f.kody || []).slice(); c.dyn = c.n === 2 && !!f.dyn; }   // dispečer vidí zadané (klasifikace, cihly, dynamická indikace), ne pravdu
    c.call = { seed: h.seed, sec: h.sec || null, truth, typed: loc.typed, standard: loc.standard, quality: loc.geo ? loc.geo.quality : 'n/a', errM: loc.errM, miss: !!loc.miss, tol: loc.tol, searchDelay: loc.searchDelay || 0, conflict: !!loc.conflict, bod: loc.byPoint ? { lat: loc.geo.lat, lon: loc.geo.lon } : null, zdroj: f.zdroj || (loc.byPoint ? 'mapa' : 'adresa'), truthN: tc.n, typedN, klasifOk: !f.klasif || f.klasif === tc.klasif, baseNote, note, updates: 0, unlocatable: !!(f.adresa && loc.standard && !loc.byPoint && loc.geo && !loc.geo.quality), form: JSON.parse(JSON.stringify(f)) };
    c.call.check = this._ctCheck(f, truth, c.call);
    c.call.predpoplach = !!f.predpoplach; c.call.callId = h.callId || null; c.call.sentAtT = t;
    if (h.dupOf) c.dupOf = h.dupOf;
    this._ctApplyTyped(c, f, needAg);
    const L = s.liveCalls;
    if (L && !h.dupOf) {   // později může volající zavolat znovu, nebo zavolá druhý svědek (duplicita)
      const k = L.level === 'tezke' ? 1.6 : L.level === 'zacatecnik' ? 0.5 : 1;
      if (this.rnd() < 0.2 * k) c.call.repeatAt = t + this.rr(420, 900);
      if (['ulice', 'silnice', 'priroda'].includes(tc.where) && this.rnd() < 0.25 * k) c.call.dupAt = t + this.rr(60, 240);
    }
    if (c.call.unlocatable) this.L('warn', `${c.num}: zadanou adresu se nepodařilo najít (${c.addr}), dispečer ji dohledává`, c.id);
    if (loc.conflict) this.L('warn', `${c.num}: adresa a bod z mapy se rozcházejí, přednost má bod`, c.id);
    if (loc.miss) c.addrMiss = loc.miss;
    this.L('case', `Hovor od calltakera ${c.num}: N${typedN} – ${c.klasif}, ${c.addr}${loc.miss ? ' (adresa nesedí)' : ''}`, c.id);
    return c;
  }
  // co dispečer (bot) ze zadaných údajů vyvodí: potřeba lékaře, PČR, HZS; mechanika dál z pravdy (následky se projeví na místě)
  _ctApplyTyped(c, f, needAg) {
    const t = this.s.t, tr = c.call.truth, ck = c.call.check, typedN = c.call.typedN;
    const knows = !!f.klasif && ck.klasif.ok && ck.priznaky.jaccard >= 0.3;   // klasifikace calltakera je věrohodná
    // Požadavek na posádku zadaný ručně (RV nebo RLP > 0) je rozhodující; bez něj platí dřívější odvození z N a klasifikace
    const px = f.posadky, pn = k => Number(px && px[k]) || 0;
    const wantRv = px ? (pn('RV') + pn('RLP') > 0 || typedN === 1) : (typedN === 1 || (typedN === 2 && !!f.dyn) || (!!tr.rvNeed && knows && typedN <= 2));
    if (c.status !== 'closed' && !c.docArrived) {
      const hadRv = !!c.rvNeed;
      c.rvNeed = wantRv;
      c.initialDispatchRequired = wantRv ? ['RZP', 'RV'] : ['RZP'];
      if (!wantRv && tr.rvNeed) { c.rvLater = true; c.rvReqKind = c.rvReqKind || 'zhoršení stavu'; }
      c.call.overRv = wantRv && !tr.rvNeed;
      if (!wantRv && hadRv) for (const id of c.crews || []) { const k = this.crewOf(id); if (k && k.type === 'RV' && (k.state === 'call' || k.state === 'enroute')) { this.cancelAssignment(c.id, k.id); this.L('case', `${c.num}: po úpravě hovoru lékař není potřeba, RV odvolán`, c.id); } }
    }
    {   // PČR a HZS: příznak v hovoru (+PČR, +HZS) nebo zaškrtnutí jde hned dispečerovi; co chybělo, si posádka vyžádá až na místě
      const need = tr.agNeed || [], A = c.agencies || (c.agencies = {});
      const flag = k => !!f['ag' + (k === 'pcr' ? 'Pcr' : 'Hzs')] || (f.priznaky || []).some(x => (k === 'pcr' ? /PČR/i : /HZS/i).test(String(x)));
      if (!c.agLateDone) c.agLate = need.filter(k => !flag(k));
      for (const k of ['pcr', 'hzs']) if (flag(k) && !A[k]) A[k] = { state: 'requested', reqAt: t, why: 'z hovoru', fromCall: true };
      c.call.agOver = ['pcr', 'hzs'].filter(k => flag(k) && !need.includes(k));
    }
  }
  // posádky jedoucí na místo události se přesměrují na nové místo (změna adresy nebo bodu po vyslání)
  _ctRedirect(cs, lat, lon) {
    const t = this.s.t, n = Math.min(4, Math.max(1, cs.n));
    for (const id of cs.crews || []) {
      const k = this.crewOf(id); if (!k || k.caseId !== cs.id || (k.state !== 'call' && k.state !== 'enroute') || k.type === 'LZS') continue;
      const p = this.pos(k), m = Math.round(hav(p.lat, p.lon, lat, lon) * 1000);
      k.lat = p.lat; k.lon = p.lon; k.mv = null; k.parked = false; k.addrFound = false; k.searchDone = false;
      const d = this._go(k, lat, lon, 'N' + Math.min(4, Math.max(1, k.driveN || n)));
      k.until = t + d; k.state = 'enroute';
      this.L('crew', `${k.name}: místo události se změnilo, posádka přesměrována (${m} m)`, cs.id, k.id);
      cs.addrChanges = (cs.addrChanges || 0) + 1;
    }
    cs.lat = lat; cs.lon = lon;
  }
  // body za hovor: čas do odeslání, klasifikace, N, příznaky, věk, poloha, okolnosti (kompletnost dotazů a empatii hodnotí analýza hovoru)
  _ctScore(call, c) {
    const ck = c && c.call && c.call.check, tr = c && c.call && c.call.truth; if (!ck) return null;
    const sec = Math.max(0, Math.round((c.call.sentAtFirst != null ? c.call.sentAtFirst : this.s.t) - call.pickedAt)), lim = { 1: 60, 2: 120, 3: 180 }[c.call.truthN] || 120;
    const cas = sec <= lim ? 20 : sec <= lim * 1.5 ? 12 : sec <= lim * 2.5 ? 6 : 0;
    const dn = Math.abs(c.call.typedN - c.call.truthN), n = dn === 0 ? 20 : dn === 1 ? 8 : 0;
    const kl = ck.klasif.ok ? 15 : 0, pr = Math.round(15 * ck.priznaky.jaccard), vek = ck.vek.ok === false ? 0 : 5, dyn = ck.dyn.ok ? 5 : 0;
    const pol = c.call.miss ? 0 : c.call.searchDelay ? 8 : 15;
    const ag = Math.max(0, ((tr.agNeed || []).length ? Math.round(5 * ((tr.agNeed.length - (c.agLate || []).length) / tr.agNeed.length)) : 5) - 2 * ((c.call.agOver || []).length));
    const total = cas + n + kl + pr + vek + dyn + pol + ag;
    return { sec, lim, cas, n, kl, pr, vek, dyn, pol, ag, total, max: 20 + 20 + 15 + 15 + 5 + 5 + 15 + 5 };
  }
  // doplnění případu během pokračujícího hovoru (naléhavost, poznámka, klasifikace, osoby; poloha jen dokud nejede posádka)
  updateCallCase(c, f) {
    if (!c || !c.call || c.status === 'closed') return c;
    f = f || {};
    const n = this._ctN(f.n, c.n);
    if (n !== c.n) { this.L('case', `${c.num}: calltaker mění naléhavost N${c.n} → N${n}`, c.id); c.n = n; c.call.typedN = n; c.call.updates++; }
    const note = this._ctNote(f);
    if (f.poznamka != null || f.popis != null || f.upresneni != null) if (note !== c.call.note) { c.call.note = note; c.poznamka = (c.call.baseNote ? c.call.baseNote + '; ' : '') + note; this.L('case', `${c.num}: doplněna poznámka od calltakera`, c.id); c.call.updates++; }
    if (f.klasif) { const kOk = ctKlasifOk(f.klasif, c.call.truth.klasif); c.klasifZadana = kOk ? null : String(f.klasif); c.call.klasifOk = kOk; }
    if (f.cihla) { if (c.klasifTruth == null) c.klasifTruth = c.klasif; c.klasif = f.klasifTabulka || c.klasif; c.sympShown = (f.kody || []).slice(); c.dyn = c.n === 2 && !!f.dyn; }
    const sig = JSON.stringify([this._ctStr(f.adresa), f.bod ? [f.bod.lat, f.bod.lon] : null]);
    if (c.call.sig == null) c.call.sig = JSON.stringify([c.call.form && this._ctStr(c.call.form.adresa), c.call.form && c.call.form.bod ? [c.call.form.bod.lat, c.call.form.bod.lon] : null]);
    if ((f.adresa || f.bod) && sig !== c.call.sig) {
      {
        const tr = c.call.truth, loc = this._ctLocate(f.adresa, { addr: tr.addr, lat: tr.lat, lon: tr.lon }, f.bod);
        c.addr = loc.typed; c.call.typed = loc.typed; c.call.quality = loc.geo ? loc.geo.quality : 'n/a'; c.call.errM = loc.errM; c.call.miss = !!loc.miss; c.addrMiss = loc.miss || null;
        c.call.tol = loc.tol; c.call.searchDelay = loc.searchDelay || 0; c.call.conflict = !!loc.conflict; c.call.bod = loc.byPoint ? { lat: loc.geo.lat, lon: loc.geo.lon } : null; c.call.zdroj = f.zdroj || (loc.byPoint ? 'mapa' : 'adresa');
        c.lat = loc.geo && loc.miss ? loc.geo.lat : tr.lat; c.lon = loc.geo && loc.miss ? loc.geo.lon : tr.lon;
        c.call.sig = sig; this.L('case', `${c.num}: calltaker opravil polohu: ${c.addr}`, c.id); c.call.updates++;
        if (c.asg && c.asg.length) this._ctRedirect(c, c.lat, c.lon);
      }
    }
    c.call.form = Object.assign(c.call.form || {}, JSON.parse(JSON.stringify(f)));
    c.call.check = this._ctCheck(c.call.form, c.call.truth, c.call);
    this._ctApplyTyped(c, c.call.form, null);
    return c;
  }

  // ---------- živé hovory: zvonění, zvednutí, odeslání, ukončení, bot dispečer ----------
  enableLiveCalls(o) {
    const s = this.s; o = o || {};
    s.liveCalls = { mode: o.mode === 'training' ? 'training' : 'realistic', gap: Math.max(30, Number(o.gapSec) || 180), share: o.share || 0.25, bot: o.bot !== false, ring: o.ringSec || 30, level: ['zacatecnik', 'bezne', 'tezke'].includes(o.level) ? o.level : 'bezne' };
    s.calls = []; s.callSeq = 0; s.secondaryEnabled = false; s.muEnabled = false; s.ev.nextMU = null; s.ev.nextSpawn = this.rr(8, 20);
  }
  // realistický tok: kolegové calltakeři se střídají, každá N-tá výzva (výchozí 4.) jde přes hráče; je-li zrovna obsazený, výzva na něj počká
  _liveSpawn() {
    const s = this.s, L = s.liveCalls, busy = s.calls.some(c => ['ringing', 'taken', 'wrap', 'dropped'].includes(c.state));
    L.cnt = (L.cnt || 0) + 1;
    const period = Math.max(1, Math.round(1 / (L.share || 0.25)));
    const mine = L.mode === 'training' || L.cnt % period === 0;
    if (mine && !busy) this._ringCall(this._ctPickKind());
    else if (mine && busy) L.owe = true;   // další volný okamžik zazvoní
    else this._spawn();
  }
  _ctPickKind() { const L = this.s.liveCalls; return this.rnd() < ({ zacatecnik: 0.05, bezne: 0.09, tezke: 0.13 }[L.level] || 0.09) ? 'bez' : 'vyjezd'; }
  _ringCall(kind, extra) {
    const s = this.s, id = 'k' + (++s.callSeq); extra = extra || {};
    const call = { id, seed: extra.seed || this.ri(1, 2000000000), state: 'ringing', ringAt: s.t, pickedAt: null, caseId: kind === 'opak' ? extra.caseId : null, kind: kind || 'vyjezd', ref: extra.caseId || null };
    if (kind === 'bez') call.scn = CT_BEZ[this.ri(0, CT_BEZ.length - 1)].id;
    if (kind === 'opak') call.nova = CT_NOVA[this.ri(0, CT_NOVA.length - 1)];
    s.calls.push(call);
    if (s.calls.length > 40) s.calls.shift();
    this.L('call', `Zvoní hovor ${id}${kind === 'opak' ? ' (opakovaný)' : kind === 'dup' ? ' (další volající k události)' : ''}`, null);
  }
  _callsTick() {
    const s = this.s, L = s.liveCalls, t = s.t, active = s.calls.some(c => ['ringing', 'taken', 'wrap', 'dropped'].includes(c.state));
    if (!active && L.owe) { L.owe = false; this._ringCall(this._ctPickKind()); }
    for (const c of s.calls) if (c.state === 'dropped' && t >= c.dropRingAt) { c.state = 'ringing'; c.ringAt = t; c.cb = true; this.L('call', `Volající zavolal zpět (hovor ${c.id})`, null); }
    if (!active) for (const cs of s.cases) {
      if (!cs.call || cs.status === 'closed') continue;
      if (cs.call.repeatAt != null && t >= cs.call.repeatAt) { cs.call.repeatAt = null; if (!cs.arrived) { this._ringCall('opak', { seed: cs.call.seed, caseId: cs.id }); break; } }
      if (cs.call.dupAt != null && t >= cs.call.dupAt) { cs.call.dupAt = null; this._ringCall('dup', { seed: cs.call.seed, caseId: cs.id }); break; }
    }
    for (const c of s.calls) if (c.state === 'ringing' && s.t - c.ringAt > L.ring) {
      c.state = 'missed'; this.L('warn', `Zmeškaný hovor ${c.id}: vzal ho kolega`, null);
      this._opsScore(c.kind === 'bez' ? -2 : -5, `zmeškaný hovor ${c.id}`, null);
      if (L.mode !== 'training') this._spawn();
    }
  }
  pickupCall(id) {
    const c = this.s.calls.find(x => x.id === id);
    if (!c || c.state !== 'ringing') return null;
    const resume = c.pickedAt != null;
    c.state = 'taken'; if (!resume) c.pickedAt = this.s.t; else c.resumes = (c.resumes || 0) + 1; this.L('call', `Hovor ${id} ${resume ? 'znovu spojen' : 'zvednut'}`, null);
    return this.callFacts(c.seed, c);
  }
  // odeslání dispečerovi (poprvé vytvoří případ, dál případ aktualizuje); hovor tím nekončí
  sendCall(id, form) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || (call.state !== 'taken' && call.state !== 'wrap')) return null;
    form = form || {};
    const kind = call.kind || 'vyjezd';
    if (kind === 'bez') {   // hovor nevyžaduje výjezd: odeslání je chyba
      if (!call.wrongSend) { call.wrongSend = true; call.sentAt = s.t; this._opsScore(-10, `hovor ${call.id} nevyžadoval výjezd, případ byl zbytečně odeslán`, null); }
      return { noDispatch: true, num: 'bez výjezdu', call: null };
    }
    if (kind === 'dup' && form.slucitS) {   // druhý volající k téže události: správně se sloučí
      const c0 = this.caseOf(form.slucitS);
      if (c0 && c0.call && c0.status !== 'closed') {
        if (!call.merged) { call.merged = true; call.caseId = c0.id; call.sentAt = s.t; c0.poznamka = (c0.poznamka ? c0.poznamka + '; ' : '') + 'další volající k téže události'; c0.call.updates++; this._opsScore(4, `hovor ${call.id}: duplicitní hovor správně sloučen s ${c0.num}`, c0.id); }
        return c0;
      }
    }
    if (call.caseId) { const c1 = this.caseOf(call.caseId); if (c1) return this.updateCallCase(c1, form); call.caseId = null; }
    const c = this.addCallCase({ v: 1, seed: call.seed, form, sec: Math.round(s.t - call.pickedAt), callId: call.id, dupOf: kind === 'dup' ? call.ref : null });
    call.caseId = c.id; call.sentAt = s.t; c.call.sentAtFirst = s.t;
    if (kind === 'dup') this._opsScore(-6, `hovor ${call.id}: duplicitní hovor nebyl sloučen s existujícím případem`, c.id);
    return c;
  }
  // spojení se přeruší (slabý signál): volající zavolá zpět za 20–50 s, formulář a případ zůstávají
  dropCall(id) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'taken') return null;
    call.state = 'dropped'; call.drops = (call.drops || 0) + 1; call.dropRingAt = s.t + this.rr(20, 50); this.L('warn', `Spojení s hovorem ${id} se přerušilo`, null);
    return call;
  }
  // zavěšení bez uzavření nabírání: calltaker může případ dál dovyplnit a odeslat, dokud nezavolá finishCall
  endCall(id) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'taken') return null;
    call.state = 'wrap'; call.endedAt = s.t; call.sec = Math.round(s.t - call.pickedAt); this.L('call', `Hovor ${id} ukončen, calltaker dovyplňuje případ`, null);
    return call;
  }
  finishCall(id) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'wrap') return null;
    call.state = 'done';
    const kind = call.kind || 'vyjezd', c = call.caseId ? this.caseOf(call.caseId) : null;
    if (kind === 'bez') { if (!call.wrongSend) this._opsScore(6, `hovor ${id} správně vyřízen bez výjezdu`, null); }
    else if (!call.caseId) { this.L('warn', `Hovor ${id} ukončen bez odeslání případu dispečerovi`, null); this._opsScore(-20, `hovor ${id} bez odeslání případu`, null); }
    else if (c && c.call) {
      c.call.sec = call.sec;
      if (kind === 'vyjezd') { const sc = this._ctScore(call, c); c.call.skore = sc; const d = Math.round((sc.total - 55) / 9); if (d) this._opsScore(d, `hovor ${id}: ${sc.total} z ${sc.max} b.`, c.id); }
    }
    return call;
  }
  hangupCall(id) {
    const s = this.s, call = s.calls.find(x => x.id === id);
    if (!call || call.state !== 'taken') return null;
    call.state = 'done'; call.endedAt = s.t;
    if (!call.caseId && (call.kind || 'vyjezd') === 'vyjezd') { this.L('warn', `Hovor ${id} ukončen bez odeslání případu dispečerovi`, null); this._opsScore(-20, `hovor ${id} bez odeslání případu`, null); }
    else if (call.caseId) { const c = this.caseOf(call.caseId); if (c && c.call) c.call.sec = Math.round(s.t - call.pickedAt); }
    return call;
  }
  // bot dispečer: vysílá posádky po krátké reakční době (jako kolega u dispečinku)
  // bot dispečer vyřizuje i žádosti sousedních krajů o výpomoc: za 25–80 s vyhoví nejbližší posádkou (v oblasti musí zůstat jiná volná), jinak odmítne
  _botNeighbors() {
    const s = this.s, t = s.t;
    for (const rq of s.nbq || []) {
      if (rq.state !== 'open') continue;
      if (rq.botAt == null) rq.botAt = t + this.rr(25, 80);
      if (t < rq.botAt) continue;
      if (rq.kind === 'lzs') { const lz = this.crewOf('lzs'); if (lz && this.avail(lz) && this._lzsWeatherStatus() !== 'neletovo') this._nbAccept(rq, 'lzs'); else this._nbDecline(rq); continue; }
      const cand = s.crews.filter(k => !k.ext && k.type === rq.rtype && this.avail(k) && s.crews.some(x => !x.ext && x.type === k.type && x.oblast === k.oblast && x.id !== k.id && this.avail(x)))
        .map(k => ({ k, eta: this._eta(k.lat, k.lon, rq.lat, rq.lon) })).sort((a, b) => a.eta - b.eta);
      if (cand.length) this._nbAccept(rq, cand[0].k.id); else this._nbDecline(rq);
    }
  }
  botTick() {
    const s = this.s, t = s.t;
    this._botNeighbors();
    for (const c of s.cases.slice()) {
      if (c.dupOf && c.status === 'waiting') {   // dispečer pozná duplicitu a případ sloučí
        if (c.botAt == null) c.botAt = t + this.rr(40, 90);
        if (t >= c.botAt) { s.cases = s.cases.filter(x => x !== c); this.L('case', `${c.num}: duplicitní případ sloučen s ${(this.caseOf(c.dupOf) || {}).num || 'původním'}`, null); }
        continue;
      }
      if (c.agencies) for (const k of ['pcr', 'hzs']) { const a = c.agencies[k]; if (a && a.state === 'requested' && t >= (a.reqAt || 0) + (a.fromCall ? 12 : 40)) this.sendAgency(c.id, k); }
      if (c.status === 'waiting' && !c.mu) {
        if (c.botAt == null) c.botAt = t + (c.call && c.call.predpoplach ? this.rr(5, 15) : c.n === 1 ? this.rr(8, 20) : this.rr(25, 70)) + (c.call && c.call.unlocatable ? this.rr(120, 240) : 0);   // neznámou adresu dispečer dohledává
        if (t < c.botAt) continue;
        if (c.exitus) { if (c.examPending) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); } continue; }
        // nový případ: RZP (a RV, je-li potřeba); částečně obsazený čekající případ: jen chybějící typy z požadavku (nikdy znovu RZP)
        const first = c.firstAssign == null, miss = this._missingTypes(c), want = first ? [...new Set(['RZP'].concat(c.rvNeed ? ['RV'] : []).concat(miss))] : miss;
        for (const type of want) { const x = this.suggest(c.id, type)[0]; if (x) this.assign(c.id, x.crewId); }
        // bez volného lékaře dispečer po 2 min převede N2 na dynamickou indikaci (RZP už jede)
        if (!first && c.status === 'waiting' && c.n === 2 && !c.dyn && this._missingTypes(c).includes('RV') && t - c.firstAssign > 120 && !this.suggest(c.id, 'RV')[0]) this.convertN2Dynamic(c.id);
      }
      if (c.coroner && c.coroner.state === 'available') this.sendAgency(c.id, 'cor');
      if (c.status === 'active' && c.rvReq && !c.rvReq.cancelled && !c.rvReq.satT && !c.docAssigned) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); }
      if (c.status === 'active' && c.rvNeed && !c.docAssigned) { const v = this.suggest(c.id, 'RV')[0]; if (v) this.assign(c.id, v.crewId); }
    }
  }
}
if (typeof module !== 'undefined') module.exports = SimCalltaker;
