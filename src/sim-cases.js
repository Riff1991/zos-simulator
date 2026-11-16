// Generování případů – část simulačního jádra (metody třídy Sim, přimíchané v engine.js).
if (typeof module !== 'undefined') var { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK } = require('./engine-base.js'); // jen Node; v prohlížeči jsou to globály z engine-base.js
class SimCases {
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
    const nk = x => x.replace(/^[^0-9A-Za-zÁ-žÀ-ÿ]+/, '').trim().toLocaleLowerCase('cs-CZ');
    const have = new Set((c.symptoms || []).map(nk));
    for (let i = 0; i < 6; i++) {
      let set; try { set = this._symptomSet(ind.symptomKey || ind.klasif, 2); } catch (e) { return null; }
      const pool = set.filter(x => !have.has(nk(x)) && !/DYNAMICKÁ|DOSPĚLÝ|DÍTĚ|ZZUM|PEDIATR|NEDÝCHÁ|BEZVĚDOMÍ|AVPU-U|KPR|^[#(]/i.test(x) && this._cleanSymptoms((c.symptoms || []).concat([x])).includes(x)); // bez protichůdných příznaků
      if (pool.length) return this.pick(pool);
    }
    return null;
  }
  // vůz přesměrovaný za jízdy: z dálnice pokračuje ve směru jízdy k nejbližšímu sjezdu, na silnicích I. a nižší třídy se otočí hned
  _continueToExit(c, target) {
    const m = c.mv, t = this.s.t; c.mv = null;
    const p = this.pos(Object.assign({}, c, { mv: m })); c.lat = p.lat; c.lon = p.lon;
    if (!m || !m.path || !m.frac || typeof ROUTER === 'undefined' || !ROUTER.ready || !ROUTER.snap) return null;
    const here = ROUTER.snap(c.lat, c.lon); if (!here || here.cls !== 0) return null;
    const P = m.path, F = m.frac, span = Math.max(1, m.t1 - (m.dw || 0) - m.t0), fr = clamp01((t - m.t0) / span);
    let i = F.findIndex(f => f >= fr); if (i < 0) return null;
    const pts = [c.lat, c.lon], times = [0];
    const onMw = (la, lo) => { const sn = ROUTER.snap(la, lo); return !!(sn && sn.cls === 0 && sn.d < 0.01); };
    let lat0 = c.lat, lon0 = c.lon, since = 0, checks = 0, exitR = null;
    for (; i < P.length / 2; i++) {
      const la = P[i * 2], lo = P[i * 2 + 1], dla = la - lat0, dlo = lo - lon0;
      since += hav(lat0, lon0, la, lo); lat0 = la; lon0 = lo;
      pts.push(la, lo); times.push((F[i] - fr) * span);
      if (!onMw(la, lo)) break;
      if (since >= 0.8 && checks < 40 && (dla || dlo)) {
        since = 0; checks++;
        // trasa s penalizovanou dálnicí: první úsek nesmí vést zpět po dálnici
        const r = ROUTER.route(la, lo, target.lat, target.lon, true);
        if (!r || !r.pts || r.pts.length < 4) continue;
        let j = 1; while (j < r.pts.length / 2 - 1 && hav(la, lo, r.pts[j * 2], r.pts[j * 2 + 1]) < 0.12) j++;
        const back = (r.pts[j * 2] - la) * dla + (r.pts[j * 2 + 1] - lo) * dlo * 0.42 < 0 && onMw(r.pts[j * 2], r.pts[j * 2 + 1]);
        if (!back) { exitR = r; break; }
      }
    }
    // po sjezdu: jede po penalizované trase, dokud není ~300 m mimo dálnici
    if (exitR) {
      const R = exitR.pts, RF = exitR.frac, t0 = times[times.length - 1];
      let off = 0, la0 = R[0], lo0 = R[1];
      for (let j = 1; j < R.length / 2; j++) {
        const la = R[j * 2], lo = R[j * 2 + 1];
        if (!onMw(la, lo)) off += hav(la0, lo0, la, lo); la0 = la; lo0 = lo;
        pts.push(la, lo); times.push(t0 + RF[j] * exitR.sec);
        if (off >= 0.3) break;
      }
    }
    const sec = Math.max(1, times[times.length - 1]);
    c.lat = pts[pts.length - 2]; c.lon = pts[pts.length - 1];
    return { pts, fr: times.map(x => x / sec), sec };
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
      domov: ['kontakt na místě zajištěn personálem', 'vstup přes recepci, personál dovede'],
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
  _spawn(over) {
    over = over || {};
    const s = this.s, D = ZOS_DATA, t = s.t;
    const ind = over.ind ? D.indications.find(x => x.id === over.ind) : this.wpick(D.indications, x => x.w * this._wxCase(x.id));
    const nKeys = Object.keys(ind.n).map(Number);
    let n = over.n || Number(this.wpick(nKeys, k => ind.n[k]));
    let dyn = over.dyn != null ? over.dyn : n === 2 && !!ind.dyn && this.rnd() < ind.dyn;
    const sex = over.sex || ind.sex || (this.rnd() < 0.5 ? 'M' : 'Ž');
    const hospType = Array.isArray(ind.hosp) ? this.wpick(ind.hosp, x => x[1])[0] : ind.hosp;
    const symptomKey = ind.symptomKey || ind.klasif;
    let symptoms = over.symptoms ? over.symptoms.slice() : this._symptomSet(symptomKey, n);
    if (!over.symptoms && this._isApneicUnresponsive(symptoms)) {
      n = 1;
      dyn = false;
      const n1Symptoms = this._symptomSet(symptomKey, 1, terms =>
        this._isApneicUnresponsive(terms) && !terms.some(x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE')));
      if (this._isApneicUnresponsive(n1Symptoms) && !n1Symptoms.some(x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'))) symptoms = n1Symptoms;
      else symptoms = symptoms.filter(x => !x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'));
    }
    if (!over.symptoms) symptoms = this._cleanSymptoms(symptoms);
    // otrava CO jen u Intoxikace: v části případů příznak Oxid uhelnatý místo jiné noxy (nikdy ne u jiných indikací)
    if (!over.symptoms && ind.id === 'intox' && !/OXID UHELNAT/i.test(symptoms.join(',')) && this.rnd() < 0.1) {
      symptoms = this._cleanSymptoms(symptoms.filter(x => !/^[^A-Za-zÁ-ž]*(Alkohol|Drogy|Léky|Noxa)/i.test(x)).concat(['^Oxid uhelnatý']));
    }
    const coCase = !over.symptoms && /OXID UHELNAT/i.test(symptoms.join(','));
    {
      const isDyn = x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE');
      const hasDyn = symptoms.some(isDyn);
      if (n === 2 && hasDyn) dyn = true;
      else if (n === 2 && dyn) symptoms = symptoms.concat(['DYNAMICKÁ INDIKACE']);
      else { dyn = false; symptoms = symptoms.filter(x => !isDyn(x)); }
    }
    // otrava CO u dítěte: vždy N2 bez dynamiky, nikdy N3 (příznaky z profilu N2, pokud existuje)
    if (!over.symptoms && n > 1 && /OXID UHELNAT/i.test(symptoms.join(',')) && /DÍTĚ/i.test(symptoms.join(','))) {
      n = 2; dyn = false;
      let alt = null; try { alt = this._symptomSet(symptomKey, 2, terms => terms.some(x => /OXID UHELNAT/i.test(x)) && terms.some(x => /DÍTĚ/i.test(x))); } catch (e) { alt = null; }
      symptoms = alt && alt.some(x => /OXID UHELNAT/i.test(x)) ? this._cleanSymptoms(alt) : symptoms.filter(x => !/DYNAMICKÁ INDIKACE/i.test(x));
      symptoms = symptoms.filter(x => !/DYNAMICKÁ INDIKACE/i.test(x));   // dítě s CO: vždy N2 bez dynamiky
    }
    const rvNeed = n === 1 || (n === 2 && !dyn);
    const rvLater = !rvNeed && (over.rvLater != null ? over.rvLater : this.rnd() < (ind.rvP || 0));
    const rvReqKind = rvLater ? (over.rvReqKind || (this.rnd() < 0.5 ? 'zhoršení stavu' : 'posouzení stavu')) : null;
    let up = symptoms.join(', '), symptomText = up.toLocaleUpperCase('cs-CZ');
    const isChild = symptomText.includes('DÍTĚ');
    const minAge = isChild ? 0 : symptomText.includes('DOSPĚLÝ') ? Math.max(18, ind.age[0]) : ind.age[0];
    const maxAge = isChild ? 17 : ind.age[1];
    // věkový filtr: žádný opilý, zadrogovaný nebo agresivní kojenec (alkohol/drogy až od 12 let, agrese od 5 let)
    const ageMin = /ALKOHOL|DROGY/.test(symptomText) ? 12 : /AGRES/.test(symptomText) ? 5 : 0;
    const age0 = over.age != null ? over.age : minAge <= maxAge ? this.ri(minAge, maxAge) : this.ri(ind.age[0], ind.age[1]);
    const age = over.age == null && age0 < ageMin ? this.ri(ageMin, Math.max(maxAge, ageMin)) : age0;
    // dopravní mechanismus (auto, cyklista, chodec, autobus, vlak) je vždy venku na silnici nebo ulici, nikdy v bytě, domově nebo u zámku
    const outdoorVeh = /CYKLISTA|CHODEC|MOTOCYKLISTA|OSOBNÍ AUTOMOBIL|NÁKLADNÍ AUTOMOBIL|DOPRAVNÍ NEHODA|AUTOBUS|VLAK/.test(symptomText);
    let whKey = over.where || (coCase ? this.pick(['byt', 'rd']) : this._pickWhere(ind, age));   // otrava CO jen v budově
    if (outdoorVeh && !over.where && !['ulice', 'silnice', 'priroda'].includes(whKey)) whKey = 'ulice';
    // veřejná místa pod „ulicí“: nádraží, úřady, obchody, sport, ubytování (reálná místa z OSM)
    let poiKey = whKey;
    if (whKey === 'ulice' && !outdoorVeh && typeof ZOS_POI !== 'undefined' && ZOS_POI && ZOS_POI.poi) {
      const h = this.hour();
      const wk = { verejne: 1.4, sport: age >= 6 && age <= 60 ? (h >= 15 && h < 21 ? 0.6 : 0.2) : 0.05, ubytovani: age >= 15 ? (h >= 18 || h < 8 ? 0.3 : 0.12) : 0.03 };
      const tot = Object.values(wk).reduce((x, y) => x + y, 0), r = this.rnd() * (tot + 1.6);
      let acc = 0; for (const [k, v] of Object.entries(wk)) { acc += v; if (r < acc && ZOS_POI.poi[k] && ZOS_POI.poi[k].length) { poiKey = k; break; } }
    }
    const wd = D.where[poiKey] || D.where[whKey];
    let lat, lon, addr, townN, okres = null, cast = '';
    const A = typeof ZOS_ADDR !== 'undefined' && ZOS_ADDR && ZOS_ADDR.a ? ZOS_ADDR : null;
    const nearTown = (la, lo) => { let b = null, bd = 1e9; for (const tw of D.towns) { const d = hav(la, lo, tw.lat, tw.lon) / Math.sqrt(tw.w); if (d < bd) { bd = d; b = tw; } } return b; };
    if (over.at) {
      lat = over.at.lat; lon = over.at.lon; addr = over.at.addr; townN = over.at.town; okres = over.at.okres || null;
    } else if ((whKey === 'silnice' || whKey === 'priroda') && typeof ROUTER !== 'undefined' && ROUTER.ready) {
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
    const extKinds = over.extKinds !== undefined ? over.extKinds : EXTMSG.kindFor(ind.id, poiKey, () => this.rnd(), symptomText);
    // podezření na otravu CO: případ dostane příznak Oxid uhelnatý a jde o víc osob (rodina, domácnost)
    const hasCo = !!(extKinds && extKinds.includes('co'));
    if (hasCo && !over.symptoms && !symptomText.includes('OXID UHELNATÝ')) { symptoms = symptoms.concat(['^Oxid uhelnatý']); up = symptoms.join(', '); symptomText = up.toLocaleUpperCase('cs-CZ'); }
    const patientCount = over.patientCount != null ? over.patientCount : hasCo ? this.ri(2, 4) : !isRoadAccident ? 1 : symptomText.includes('VÍCE ZRANĚNÝCH') ? this.ri(2, 4) : this.rnd() < 0.025 ? this.ri(2, 3) : 1;
    // případ s datovkou: nejdřív „nabírá se“ (112/150/158), výzva za 3–5 min, pak podrobnosti; složky jedou samy
    const dzFirst = !!extKinds && over.extKinds === undefined;
    // fáze 1 (datovka z 112/150/158) 180–300 s, fáze 2 (nabírání na naší lince) jako u běžných případů; podle říjnového vzorku (medián volání→výzva 141 s u N1)
    const ownIntake = n === 1 ? this.ri(70, 150) : this.ri(90, 200);
    const dzDur = dzFirst ? (over.intake != null ? Math.round(over.intake * 0.6) : this.ri(180, 300)) : 0;
    const intake = over.intake != null ? over.intake : dzFirst ? dzDur + (n === 1 ? this.ri(70, 150) : this.ri(70, 150)) : ownIntake;
    const poznamka = this._zosNote(ind, up, whKey);
    const eo = { t, intake, patientCount, n, up, addr, town: townN, okres, where: whKey, sex, lat, lon };
    const radioReports = extKinds ? this._extReports(extKinds, eo) : [];
    if (dzFirst) radioReports.unshift({ id: 'dz-in', at: t + this.ri(8, 35), received: false, acknowledged: false, source: EXTMSG.intakeSource(extKinds[0], () => this.rnd()), text: EXTMSG.intakeText(extKinds[0], addr, ind.klasif), red: false });
    const placeDescription = this._placeText(D.place && D.place[poiKey] ? poiKey : whKey);
    const placeText = this.rnd() < 0.2 ? placeDescription.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : placeDescription;
    const op = 'OP-' + this.pick(['A', 'B', 'C', 'D']);
    const P = this._P();
    let patientName = '', oznName, oznRel = '', phone, noteFull = poznamka;
    if (P) {
      const pat = P.person(this._rndFn(), sex, age);
      patientName = pat.reverse;
      // sám volat může jen pacient při vědomí (AVPU-A); při U/P/V, bezvědomí, nedýchá a křečích ne
      const unconscious = /AVPU-[UPV]\b|bezvědomí|nedýchá|reaguje na (bolest|oslovení)|křeč|křeče|křečov|nereaguje|zmatený/i.test(up) || (ind.id === 'kreceU' && !/AVPU-A\b/i.test(up));
      const cl = P.caller(this._rndFn(), { patient: pat, age, sex, whKey, unconscious, roadAccident: isRoadAccident, child: age < 15 });
      oznName = cl.person.full; oznRel = cl.label; phone = cl.phone;
      noteFull = [cl.label, poznamka].filter(Boolean).join(', ');
    } else { oznName = this._name(); phone = this._phone(); }
    const c = this._newCase({
      ind: ind.id, klasif: ind.klasif, typ: 'primární', up, symptoms, charakter: D.charaktery[wd.ch], where: whKey, place: placeText.toLocaleLowerCase('cs-CZ'), n, dyn, rvNeed, rvLater, rvReqKind,
      initialDispatchRequired: n === 1 || (n === 2 && !dyn) ? ['RZP', 'RV'] : ['RZP'], initialDispatchSent: [],
      rvP: ind.rvP || 0, zzumInd: !!ind.zzum, addr, town: town.n, okres, cast, lat, lon, age, sex, child: age < 18, burnCenterCandidate: ind.id === 'popal' && symptomText.includes('ROZSÁHLÉ'),
      desc: patientCount > 1 ? `${patientCount} ${hasCo ? 'osob s podezřením na otravu CO' : 'zranění při dopravní nehodě'}; hlavní pacient: ${this._person(age, sex)}, ${age} let.` : `${this._person(age, sex)}, ${age} let. ${ind.klasif}.`,
      hospType, trans: this.rnd() < ind.trans, scene: ind.scene, pocet: patientCount, patientCount, patientsRemaining: patientCount, patientsHandled: 0, radioReports,
      poznamka: noteFull, ozn: oznName, oznRel, patientName, ageText: this._ageText(age),
      phone,
      src: extKinds && (dzFirst || this.rnd() < 0.6) ? EXTMSG.SRC_CALL[extKinds[0]] : this.pick(['Linka 155', 'Linka 155', 'Linka 155', 'Linka 112', '112 – přeposláno']), op,
      intake, phase: dzFirst ? 'dz' : 'intake', dzUntil: dzFirst ? t + dzDur : null,
    });
    if (dzFirst) {
      const ag = Object.assign({}, eo.ag);
      if (/PČR/.test(up)) ag.pcr = true;
      if (/HZS/.test(up)) ag.hzs = true;
      if (Object.keys(ag).length) { c.agencies = {}; for (const k of Object.keys(ag)) c.agencies[k] = { state: 'sent', sentAt: t + 20, arriveAt: t + intake + this.rr(240, 840), auto: true }; }
    } else if (!extKinds && over.extKinds === undefined && !over.symptoms) {
      const need = [];
      if (/PČR/.test(up)) need.push('pcr');
      if (/HZS/.test(up)) need.push('hzs');
      if (need.length) c.agNeed = need;
    }
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
    if (over.fate) {
      c.fate = over.fate; c.trans = over.fate === 'rosc' || over.fate === 'wakes';
      if (c.fate === 'wakes') c.wakeAt = c.readyAt + (over.wakeIn || 120);
    }
    c.lzsTechRequired = over.lzsTech != null ? over.lzsTech : whKey === 'priroda' && this.rnd() < 0.55;
    c.lzsTerrain = c.lzsTechRequired ? 'nepřístupný terén' : null;
    if (over.script) c.script = over.script;
    if (over.patch) Object.assign(c, over.patch);
    return c;
  }
  // datové zprávy od HZS / PČR / eCall k případu; texty se v rámci směny neopakují
  // upřesnění z datové zprávy zvýší naléhavost (např. amputace prstů u N3 → N2 dynamická nebo plná), lékař se doplní a posádky se informují rádiem
  _upgradeCase(c, up) {
    const t = this.s.t, dyn = this.rnd() < 0.6, label = `N${up.n}${dyn ? ' dynamickou' : ''}`;
    c.n = up.n; c.nDopl = up.n; c.dyn = dyn; c.rvNeed = true;
    c.symptoms = (c.symptoms || []).filter(x => !/DYNAMICKÁ INDIKACE/i.test(x));
    if (!c.symptoms.some(x => x === up.symptom)) c.symptoms.push(up.symptom);
    if (dyn) c.symptoms.push('DYNAMICKÁ INDIKACE');
    c.up = c.symptoms.join(', ');
    if (!c.docAssigned) {
      c.initialDispatchRequired = c.initialDispatchRequired || [];
      if (!c.initialDispatchRequired.includes('RV')) c.initialDispatchRequired.push('RV');
      c.waitSince = t;
    }
    this.L('req', `${c.num}: upřesnění z datové zprávy – zvyšuje se naléhavost na ${label} (${up.symptom.replace(/^[^0-9A-Za-zÀ-ž]+/, '')})`, c.id);
    for (const k of c.crews.map(id => this.crewOf(id)).filter(k => k && k.type !== 'LZS' && k.type !== 'MU' && ['call', 'enroute', 'onscene'].includes(k.state))) this._zosCall(k, c, `zvyšujeme naléhavost na ${label}, posíláme lékaře.`);
  }
  _extReports(kinds, o) {
    const D = ZOS_DATA, hist = this.s.ev.extHist || (this.s.ev.extHist = []);
    const near = (n, filter) => D.towns.filter(filter || (() => true)).map(tw => [tw, hav(o.lat, o.lon, tw.lat, tw.lon)]).sort((a, b) => a[1] - b[1]).slice(0, n).map(x => x[0]);
    const hzsTowns = ['České Budějovice', 'Tábor', 'Písek', 'Strakonice', 'Jindřichův Hradec', 'Prachatice', 'Český Krumlov', 'Dačice', 'Milevsko', 'Třeboň', 'Týn nad Vltavou', 'Trhové Sviny', 'Vimperk', 'Blatná', 'Kaplice', 'Soběslav', 'Vodňany', 'Volary'];
    const hzs = near(1, tw => hzsTowns.includes(tw.n))[0], dirs = near(4, tw => tw.n !== o.town), twn = D.towns.find(tw => tw.n === o.town);
    const ctx = { r: () => this.rnd(), n: o.n, sym: String(o.up || '').toLocaleUpperCase('cs-CZ'), addr: o.addr, town: o.town, okres: o.okres, where: o.where, sex: o.sex, patientCount: o.patientCount,
      trapped: /UVĚZNĚNÝ|ZAKLÍNĚ/i.test(o.up), extraPerson: o.patientCount === 1 && this.rnd() < 0.025, big: !!(twn && twn.w >= 10),
      hzsNear: hzs ? hzs.n : null, dirTown: dirs.length ? this.pick(dirs).n : null, floor: o.where === 'byt' ? `${this.ri(1, 6)}. patro` : '',
      clock: min => this.clockAt(o.t + o.intake - min * 60) };
    let out = [];
    for (const k of kinds) {
      let items = [];
      for (let tries = 0; tries < 8; tries++) { items = EXTMSG.KINDS[k](ctx); if (!items.some(x => hist.includes(x.text))) break; }
      out = out.concat(items);
    }
    o.ag = EXTMSG.agenciesFor(kinds, ctx);
    out.sort((a, b) => a.dt - b.dt);
    for (const x of out) { hist.push(x.text); if (hist.length > 400) hist.shift(); }
    return out.map((x, i) => Object.assign({ id: `dz-${i + 1}`, at: o.t + o.intake + x.dt, received: false, acknowledged: false, source: this.pick(EXTMSG.SRC[x.src] || ['Linka 112']), text: x.text, red: x.red != null ? x.red : !!EXTMSG.isRed(x.text, x.patientCount) }, x.patientCount ? { patientCount: x.patientCount } : {}, x.upgrade ? { upgrade: x.upgrade } : {}));
  }
}
if (typeof module !== 'undefined') module.exports = SimCases;
