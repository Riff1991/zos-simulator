// Pavouk z cihliček: skutečný klasifikační systém ZOS (data src/cihly.json, vyrábí tools/build_cihly.py z excelu).
// Dva kliky: dlaždice indikace (stav, děj, ostatní) → cihla (barva = naléhavost). Bez pravděpodobností. Deterministický, bez DOM.
// Rozhraní jako calltaker/spider.js: page(odpovědi), result(odpovědi), indikace(), klasifikace(), run(), strip, group.
(function () {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const KIND_LAB = { n1: 'N1', n2: 'N2', n2di: 'N2 – dynamická indikace', n3: 'N3', n4: 'N4' };
  const KIND_ORD = ['n1', 'n2', 'n2di', 'n3', 'n4'];
  // klasifikace v excelu → název klasifikace generátoru případů (kontrola calltakera porovnává názvy)
  function engineKlasif(name, known) {
    const k = norm(name);
    for (const x of known || []) if (norm(x) === k) return x;
    return name;
  }
  function create(data, opts) {
    if (!data || data.format !== 'zos-cihly/1') throw new Error('Neplatná data cihliček (formát zos-cihly/1).');
    const known = (opts && opts.klasifs) || [];
    const T = new Map(data.tiles.map(t => [t.id, t])), B = new Map(data.bricks.map(b => [b.id, b]));
    const sheetLabel = Object.fromEntries(data.skupiny.map(g => [g.id, g.label]));
    const tileKinds = t => KIND_ORD.filter(k => t.bricks.some(id => B.get(id).kind === k));
    function indikace() {
      return data.tiles.map(t => ({ klasif: t.label, count: t.bricks.length, hint: tileKinds(t).map(k => KIND_LAB[k].slice(0, 2)).filter((v, i, a) => a.indexOf(v) === i).join(' · ') }));
    }
    function page(answers) {
      const t = answers[0] && T.get(answers[0]), b = answers[1] && B.get(answers[1]);
      if (!answers.length || !t) {
        return {
          step: 'indikace', title: 'Co se děje?', crumbs: [], canBack: false, canFinish: false, canSkip: false, klasif: null, auto: [],
          tiles: data.tiles.map(x => ({ id: x.id, label: x.label, group: x.skupina, sheet: x.sheet, sheetLabel: sheetLabel[x.sheet], weight: x.bricks.length, kinds: tileKinds(x), hint: '' })),
        };
      }
      if (!b) {
        return {
          step: 'cihly', title: t.label, crumbs: [t.label], canBack: true, canFinish: false, canSkip: false, klasif: t.label, auto: [], poznamky: t.poznamky || [], doprovod: t.doprovod || null,
          tiles: t.bricks.map(id => { const x = B.get(id); return { id: x.id, label: x.klasif, lines: x.lines, n: x.n, kind: x.kind, crew: x.crew, dyn: x.dyn, cmp: x.cmp, weight: 1, hint: '', group: '' }; }),
        };
      }
      return { step: 'vysledek', title: 'Výsledek', crumbs: [t.label, b.klasif + ' N' + b.n], tiles: [], canBack: true, canFinish: false, canSkip: false, klasif: t.label, auto: [] };
    }
    function result(answers) {
      const t = answers[0] && T.get(answers[0]), b = answers[1] && B.get(answers[1]); if (!t || !b) return null;
      const d = { 1: b.n === 1 ? 1 : 0, 2: b.n === 2 ? 1 : 0, 3: b.n === 3 ? 1 : 0 };
      return {
        klasif: engineKlasif(b.klasif, known), klasifExcel: b.klasif, tile: t.label, n: b.n, nDist: d, confidence: 1, dyn: b.dyn, pDyn: b.dyn ? 1 : 0, crew: b.crew, kind: b.kind, cmp: b.cmp, lines: b.lines.slice(),
        vek: null, vedomi: null, dychani: null, symptoms: [], picked: [], added: [], apneic: false, combos: 1, cihla: true, planovane: b.n === 4,
      };
    }
    const run = answers => ({ step: page(answers).step, klasif: answers[0] && T.get(answers[0]) ? T.get(answers[0]).label : null });
    return { indikace, page, result, run, klasifikace: () => data.tiles.map(x => x.label), strip: s => String(s), group: () => '', cihly: true, KIND_LAB, T, B };
  }
  // ---------- obrazovka „Náběr případu“: klasifikace, cihličky (kritéria) a univerzální cihly ----------
  // Cihlička = jedno kritérium bloku tabulky, nese barvu bloku. Označení cihliček jen doporučí N a posádku (vyšší barva vyhrává), nic nenastaví.
  const RANK = { n1: 5, n2: 4, n2di: 3, n3: 2, n4: 1 };
  // univerzální cihly nahoře (vždy stejné). cls: u-red, u-mag, u-pink, u-yel, u-sal, u-gray, u-empty; kind = vliv na doporučení N (jen červené TANR, a DYNAMICKÁ_INDIK = možnost DI)
  // plné znění univerzálních cihel (zobrazí se pod myší); DN_BEZ_VYPROŠTĚ podle dispečera, ostatní doplněno
  const DESC = { 'TANR': 'Telefonicky asistovaná neodkladná resuscitace', 'TANR_NELZE': 'Telefonicky asistovanou resuscitaci nelze provést', 'DÍTĚ': 'Pacient je dítě', 'DOSPĚLÝ': 'Pacient je dospělý',
    'DYNAMICKÁ_INDIK': 'Dynamická indikace: jede RZP bez lékaře, na místě rozhodne o potřebě lékaře', 'DR_NA_ŽÁDOST': 'Lékař na žádost posádky RZP, která už vyráží na místo zásahu', 'SÁM_ZZUM': 'ZZUM jede sám, bez lékaře, na výjezd N2 nedynamickou',
    'LZS_NELZE': 'Na LZS se myslelo, ale není k dispozici (letové podmínky, jiný vzlet)', '+ LÉKAŘ_Z_LZS': 'RZP Planá si bere lékaře z letecké záchranné služby', '+ PČR': 'Informace pro posádky: na místě je potřeba Policie ČR', '+ HZS': 'Informace pro posádky: na místě je potřeba Hasičský záchranný sbor',
    'SUSP_MU': 'Podezření na mimořádnou událost', 'DN_BEZ_VYPROŠTĚ': 'Dopravní nehoda se zraněním bez vyproštění osob', 'OTEVŘENÍ_PROSTO': 'Otevření uzavřeného prostoru (bytu), v němž je osoba', 'TRANSPORT_PAC': 'Transport (přenesení) pacienta, součinnost složky',
    'ÚKLID_VOZOVKY': 'Úklid vozovky po nehodě', 'DN_S_VYPROŠTĚNÍ': 'Dopravní nehoda se zraněním s vyproštěním osob', 'PALIATIVA': 'Paliativní pacient', 'INFO_RADA_TELEF': 'Informace a rada po telefonu', 'VIDEOHOVOR': 'Videohovor s volajícím', 'VOLÁNÍ_3.RUKA': 'Volání z třetí ruky (volající nevidí pacienta)' };
  const UNIVERSAL = [
    { c: 'TANR', cls: 'u-red', kind: 'n1' }, { c: 'TANR_NELZE', cls: 'u-red', kind: 'n1' }, { c: 'DÍTĚ', cls: 'u-gray', grp: 'vek' }, { c: 'DOSPĚLÝ', cls: 'u-gray', grp: 'vek' },
    { c: 'DYNAMICKÁ_INDIK', cls: 'u-mag', kind: 'n2di' }, { c: 'DR_NA_ŽÁDOST', cls: 'u-pink' }, { c: 'SÁM_ZZUM', cls: 'u-pink' }, { c: 'LZS_NELZE', cls: 'u-pink' },
    { c: '+ LÉKAŘ_Z_LZS', cls: 'u-pink' }, { c: '+ PČR', cls: 'u-gray' }, { c: '+ HZS', cls: 'u-gray' }, { c: 'SUSP_MU', cls: 'u-yel' },
    { c: 'DN_BEZ_VYPROŠTĚ', cls: 'u-sal' }, { c: 'OTEVŘENÍ_PROSTO', cls: 'u-sal' }, { c: 'TRANSPORT_PAC', cls: 'u-sal' }, { c: 'ÚKLID_VOZOVKY', cls: 'u-sal' },
    { c: 'DN_S_VYPROŠTĚNÍ', cls: 'u-sal' }, { c: 'PALIATIVA', cls: 'u-gray' }, { c: 'INFO_RADA_TELEF', cls: 'u-gray' }, { c: 'VIDEOHOVOR', cls: 'u-gray' },
    { c: 'VOLÁNÍ_3.RUKA', cls: 'u-gray' }, { c: '0', cls: 'u-empty' }, { c: '0', cls: 'u-empty' }, { c: '0', cls: 'u-empty' },
  ].map((u, i) => Object.assign({ id: 'u:' + i, d: DESC[u.c] || '' }, u));
  // šedé cihly (popisy bez vlivu na naléhavost); u některých klasifikací podle screenů, jinak výchozí sada (doplnit podle skutečných názvů)
  // šedé cihly (popisy bez vlivu na naléhavost) se odvozují z textu kritérií klasifikace v tabulce: co se v textu zmiňuje (choroba, část těla, účastník nehody), nabídne se jako šedá cihla;
  // u Dušnosti, Arytmie a Křečových stavů jsou navíc šedé cihly podle screenů skutečného systému
  const DETECT = [[/epilept/i, 'EPILEPTIK'], [/diabet|hypoglyk|hyperglyk/i, 'DIABETIK'], [/CHOPN/, 'CHOPN'], [/ICHS/, 'ICHS'], [/\bICD\b|kardiovert/i, 'ICD'], [/hypertenz/i, 'HYPERTONIK'], [/astma/i, 'ASTMATIK'], [/alkohol/i, 'ALKOHOL'],
    [/těhotenst|gravid/i, 'TĚHOTNÁ'], [/varix/i, 'VARIXY'], [/epistax/i, 'EPISTAXE'], [/meléna|hematemeza|enterorhag/i, 'GIT_KRVÁCENÍ'], [/\bPMK\b|urokatetr/i, 'PMK'], [/paliativ/i, 'PALIATIVNÍ_PAC'], [/\bGIT\b/, 'GIT'], [/\bURO\b/, 'URO'], [/\bGYN\b/, 'GYN'], [/\bDC\b/, 'DÝCHACÍ_CESTY'],
    [/hlav[yaě]/i, 'HLAVA'], [/\bkrk/i, 'KRK'], [/hrudník/i, 'HRUDNÍK'], [/břich/i, 'BŘICHO'], [/pánv/i, 'PÁNEV'], [/zad\b|zádech|zad,/i, 'ZÁDA'], [/horn\w* končetin|paž|ruk/i, 'HK'], [/dolní\w* končetin|noh/i, 'DK'], [/končetin/i, 'HK'], [/končetin/i, 'DK'], [/prst/i, 'PRSTY'], [/chodec/i, 'CHODEC'], [/cyklist/i, 'CYKLISTA'], [/moto/i, 'MOTOCYKL'], [/vozidl/i, 'VOZIDLO'],
    [/popálen/i, 'POPÁLENINY'], [/polepten/i, 'POLEPTÁNÍ'], [/elektr/i, 'ELEKTR_PROUD'], [/výbuch/i, 'VÝBUCH'], [/utonut|tonut/i, 'TONUTÍ'], [/vis[ií]c|oběšen/i, 'OBĚŠENÍ'], [/zlomen/i, 'ZLOMENINA'], [/rán[ay]/i, 'RÁNA'], [/hypotermi/i, 'HYPOTERMIE'], [/agres/i, 'AGRESE'], [/sebevra/i, 'SEBEVRAŽDA'], [/halucin|blud/i, 'PSYCHÓZA']];
  const GRAY_BY = { Arytmie: ['HYPERTONIK', 'KARDIAK'], Dušnost: ['ASPIRACE', 'ASTMATIK', 'DIABETIK', 'HYPERTONIK', 'CHOPN', 'KARDIAK', 'DDOT'], 'Křečové stavy': ['DIABETIK', 'EPILEPTIK'] };
  const NOGRAY = new Set(['Převoz', 'Vstřícná jízda', 'Posouzení stavu', 'Asistence', 'Technická jízda', 'MU – MATRA 722', 'Vysoce nebezpečná nákaza (VNN)', 'Babybox']);
  // příznak ze skutečného katalogu, který cihla zapíše do Upřesnění (cihla bez příznaku jde jako štítek do poznámky)
  const UNIV_SYM = { 'DÍTĚ': 'Dítě', 'DOSPĚLÝ': 'Dospělý', 'TANR': 'TANR', 'TANR_NELZE': 'TANR nelze', 'DYNAMICKÁ_INDIK': 'DYNAMICKÁ INDIKACE' };
  const GRAY_SYM = { HLAVA: 'Hlava', KRK: 'Krk', HRUDNÍK: 'Hrudník', BŘICHO: 'Břicho', PÁNEV: 'Pánev', ZÁDA: 'Záda', HK: 'Horní končetina', DK: 'Dolní končetina', ALKOHOL: 'Alkohol', DIABETIK: 'Diabetik', EPILEPTIK: 'Epileptik', CHOPN: 'CHOPN', ZLOMENINA: 'Zavřená zlomenina', RÁNA: 'Otevřené rány' };
  const cs = (a, b) => String(a).localeCompare(String(b), 'cs');
  function createIntake(data, opts) {
    if (!data || data.format !== 'zos-cihly/1') throw new Error('Neplatná data cihliček (formát zos-cihly/1).');
    const known = (opts && opts.klasifs) || [], byK = new Map();
    for (const b of data.bricks) { if (!byK.has(b.klasif)) byK.set(b.klasif, []); byK.get(b.klasif).push(b); }
    const names = [...byK.keys()].sort(cs);
    const textOf = k => (byK.get(k) || []).map(b => b.lines.join(' ')).join(' ');
    const chipIndex = new Map();
    const chipsOf = k => {
      const groups = [];
      for (const kind of KIND_ORD) {
        const chips = [];
        (byK.get(k) || []).filter(b => b.kind === kind).forEach(b => b.chips.forEach((c, i) => { const x = { id: 'k:' + b.id + ':' + i, c: c.c, t: c.t, s: c.s || [], kind, crew: b.crew, n: b.n, dyn: b.dyn, cmp: b.cmp, brick: b.id }; chipIndex.set(x.id, x); chips.push(x); }));
        if (chips.length) groups.push({ kind, chips });
      }
      return groups;
    };
    const cache = new Map();
    return {
      classifications: () => names.map(n => ({ name: n, engine: engineKlasif(n, known) })),
      chipsFor: k => { if (!cache.has(k)) cache.set(k, { groups: chipsOf(k), gray: NOGRAY.has(k) ? [] : [...new Set((GRAY_BY[k] || []).concat(DETECT.filter(d => d[0].test(textOf(k))).map(d => d[1])))].sort(cs) }); return cache.get(k); },
      universal: UNIVERSAL,
      graySym: code => GRAY_SYM[code] || '',
      // doporučení z označených cihliček: nejvyšší barva vyhrává; vrací N, barvu a typy posádek z bloků téže barvy
      evaluate(ids) {
        let best = null;
        for (const id of ids) {
          let x = chipIndex.get(id); if (!x && id.startsWith('u:')) { const u = UNIVERSAL[Number(id.slice(2))]; if (u && u.kind) x = { kind: u.kind, n: u.kind === 'n1' ? 1 : 2, crew: u.kind === 'n1' ? 'RLP' : 'DI', dyn: u.kind === 'n2di', u: true }; }
          if (x && x.kind && (!best || RANK[x.kind] > RANK[best.kind])) best = x;
        }
        if (!best) return null;
        const crew = new Set();
        for (const id of ids) { const x = chipIndex.get(id); if (x && x.kind === best.kind) String(x.crew || '').split(/[,+/ ]+/).filter(Boolean).forEach(c => crew.add(c)); }
        if (!crew.size) String(best.crew || '').split(/[,+/ ]+/).filter(Boolean).forEach(c => crew.add(c));
        return { kind: best.kind, n: best.n, crew: [...crew], dyn: best.kind === 'n2di', cmp: !!best.cmp };
      },
      chip: id => chipIndex.get(id) || null,
    };
  }
  const api = { create, createIntake, engineKlasif, norm, KIND_LAB, KIND_ORD, UNIVERSAL, RANK, UNIV_SYM, GRAY_SYM };
  if (typeof module !== 'undefined') module.exports = api; else window.CT_CIHLY = api;
})();
