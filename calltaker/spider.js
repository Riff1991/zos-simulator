// Pavouk (náhradní, řízený daty z exportů výjezdů): indikace → vědomí → dýchání → věk → upřesnění → výsledek.
// Deterministický, bez DOM. Skutečného pavouka dodá uživatel; stačí zachovat rozhraní (create → start/page/answer/back/result).
// Vstup: symptoms = src/symptoms.json (symptomCatalog + symptomProfiles), indications = ZOS_DATA.indications.
(function () {
  const PREFIX = { '!': 'CMP, neurologie', '#': 'Stavy a výkony', '$': 'Porucha vědomí', '(': 'Horečka', ')': 'Zvracení, průjem', '*': 'Bolest', '+': 'Doprovodné', '-': 'Arytmie, oběh', '/': 'Hypertenze', ':': 'Psychika', ';': 'Asistence', '<': 'Okolnosti události', '>': 'Oběšení', '@': 'Zástava oběhu', '[': 'Obecné, geriatrie', '\\': 'Gynekologie, gravidita', ']': 'Lokalizace', '_': 'Hrudník, dušnost', '~': 'Jiné', '§': 'Křeče', '¨': 'Tonutí', '°': 'Krvácení', '^': 'Intoxikace', "'": 'Poranění: část těla', '´': 'Poranění: mechanismus' };
  const strip = s => String(s).replace(/^[^A-Za-zÀ-ž0-9]+/, '').trim();
  const low = s => strip(s).toLocaleLowerCase('cs-CZ');
  const group = s => (/^[A-Za-zÀ-ž0-9]/.test(s) ? 'Obecné' : PREFIX[s[0]] || 'Jiné');
  const VEDOMI = { 'při vědomí': 'A', 'reaguje na oslovení': 'V', 'reaguje na bolest': 'P', 'bezvědomí': 'U' };
  const VED_LAB = { A: 'Při vědomí', V: 'Reaguje na oslovení', P: 'Reaguje na bolest', U: 'Bezvědomí' };
  const DECH = { 'dýchá': 'dýchá', 'nedýchá': 'nedýchá', 'gasping': 'Gasping' };
  const VEK = { 'dospělý': 'Dospělý', 'dítě': 'Dítě' };
  const isAvpu = s => /^avpu-/.test(low(s)), isDyn = s => /dynamická indikace/i.test(s);
  const classify = name => { const l = low(name); return VEDOMI[l] ? ['vedomi', VEDOMI[l]] : DECH[l] ? ['dychani', DECH[l]] : VEK[l] ? ['vek', VEK[l]] : null; };
  const STEPS = ['vedomi', 'dychani', 'vek'];
  const STEP_TITLE = { indikace: 'Indikace', vedomi: 'Stav vědomí', dychani: 'Dýchání', vek: 'Věk pacienta', upresneni: 'Upřesnění', vysledek: 'Výsledek' };

  function create(data) {
    const cat = data.symptoms.symptomCatalog, prof = data.symptoms.symptomProfiles;
    // kombinace podle klasifikace (sloučení indikací se stejnou klasifikací)
    const byK = {};
    for (const ind of data.indications) {
      const p = prof[ind.symptomKey || ind.klasif]; if (!p) continue;
      const K = byK[ind.klasif] || (byK[ind.klasif] = { klasif: ind.klasif, combos: [], total: 0, keys: new Set() });
      if (K.keys.has(ind.symptomKey || ind.klasif)) continue; K.keys.add(ind.symptomKey || ind.klasif);
      for (const n of [1, 2, 3]) for (const [ids, cnt] of (p['N' + n] || [])) {
        const names = ids.map(i => cat[i]), cb = { names, set: new Set(names), cnt, n, dyn: names.some(isDyn), vedomi: null, dychani: null, vek: null, avpuV: null };
        for (const nm of names) { const c = classify(nm); if (c && !cb[c[0]]) cb[c[0]] = c[1]; if (isAvpu(nm) && !cb.avpuV) cb.avpuV = strip(nm).slice(-1).toUpperCase(); }
        if (!cb.vedomi && cb.avpuV) cb.vedomi = cb.avpuV;
        K.combos.push(cb); K.total += cnt;
      }
    }
    const isBase = nm => !!classify(nm) || isAvpu(nm) || isDyn(nm);

    function consistent(K, c) {
      const base = cb => (!c.vedomi || c.vedomi === '?' || cb.vedomi === c.vedomi) && (!c.dychani || c.dychani === '?' || cb.dychani === c.dychani) && (!c.vek || c.vek === '?' || cb.vek === c.vek);
      let l = K.combos.filter(cb => base(cb) && c.picked.every(p => cb.set.has(p)));
      if (!l.length) l = K.combos.filter(base);
      return l.length ? l : K.combos;
    }
    function options(step, list) {
      const m = new Map(); for (const cb of list) if (cb[step]) m.set(cb[step], (m.get(cb[step]) || 0) + cb.cnt);
      const order = step === 'vedomi' ? ['A', 'V', 'P', 'U'] : step === 'dychani' ? ['dýchá', 'Gasping', 'nedýchá'] : ['Dospělý', 'Dítě'];
      return order.filter(o => m.has(o)).map(o => ({ value: o, weight: m.get(o) }));
    }
    function candidates(K, c, list) {
      const W = list.reduce((a, cb) => a + cb.cnt, 0) || 1, m = new Map();
      for (const cb of list) for (const nm of cb.names) { if (isBase(nm) || c.picked.includes(nm) || c.rejected.includes(nm)) continue; m.set(nm, (m.get(nm) || 0) + cb.cnt); }
      const out = []; for (const [nm, w] of m) if (w < W && w / W >= 0.03) out.push({ name: nm, weight: w, share: w / W });
      return out.sort((a, b) => b.weight - a.weight || (a.name < b.name ? -1 : 1));
    }
    // stav z odpovědí (deterministicky od začátku; mezivýsledky se pamatují po předcích)
    const memo = new Map();
    const advance = c => {
      if (!c.klasif) { c.step = 'indikace'; return; }
      const K = byK[c.klasif];
      for (const st of STEPS) {
        if (c[st]) continue;
        const o = options(st, consistent(K, c));
        if (o.length === 1) { c[st] = o[0].value; c.auto.push(st); } else if (o.length >= 2) { c.step = st; return; } else c[st] = '?';
      }
      if (c.done) { c.step = 'vysledek'; return; }
      const cands = candidates(K, c, consistent(K, c));
      if (!cands.length || c.picked.length >= 10 || c.shown.length >= 8) { c.step = 'vysledek'; return; }
      c.step = 'upresneni'; c.page = cands.slice(0, 12);
    };
    const apply = (c, a) => {
      if (c.step === 'indikace') { if (byK[a]) c.klasif = a; }
      else if (STEPS.includes(c.step)) c[c.step] = a === '__skip' ? '?' : a;
      else if (c.step === 'upresneni') {
        if (a === '__done') c.done = true;
        else if (a === '__none') { for (const t of c.page) c.rejected.push(t.name); c.shown.push(1); }
        else { c.picked.push(a); c.shown.push(1); }
      }
      advance(c);
    };
    function run(answers) {
      const key = answers.join(''); if (memo.has(key)) return memo.get(key);
      let c;
      if (!answers.length) { c = { klasif: null, vedomi: null, dychani: null, vek: null, picked: [], rejected: [], done: false, shown: [], step: 'indikace', auto: [] }; advance(c); }
      else { const p = run(answers.slice(0, -1)); c = Object.assign({}, p, { picked: p.picked.slice(), rejected: p.rejected.slice(), shown: p.shown.slice(), auto: p.auto.slice() }); apply(c, answers[answers.length - 1]); }
      if (memo.size > 5000) memo.clear();
      memo.set(key, c); return c;
    }
    function indikace() {
      return Object.values(byK).map(K => {
        const W = K.total, m = new Map();
        for (const cb of K.combos) for (const nm of cb.names) if (!isBase(nm)) m.set(nm, (m.get(nm) || 0) + cb.cnt);
        const top = [...m].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => strip(x[0]));
        return { klasif: K.klasif, count: W, hint: top.length ? 'např. ' + top.join(', ') : '' };
      }).sort((a, b) => b.count - a.count);
    }
    function page(answers) {
      const c = run(answers), K = c.klasif && byK[c.klasif], title = STEP_TITLE[c.step];
      const crumbs = [c.klasif, c.vedomi && c.vedomi !== '?' ? VED_LAB[c.vedomi] : null, c.dychani && c.dychani !== '?' ? c.dychani : null, c.vek && c.vek !== '?' ? c.vek : null].filter(Boolean).concat(c.picked.map(strip));
      let tiles = [], canFinish = false, canSkip = false;
      if (c.step === 'indikace') tiles = indikace().map(i => ({ id: i.klasif, label: i.klasif, hint: i.hint, weight: i.count }));
      else if (STEPS.includes(c.step)) {
        const o = options(c.step, consistent(K, c)), W = o.reduce((a, x) => a + x.weight, 0) || 1;
        tiles = o.map(x => ({ id: x.value, label: c.step === 'vedomi' ? VED_LAB[x.value] : x.value === 'Gasping' ? 'Lapavé dechy (gasping)' : x.value === 'dýchá' ? 'Dýchá' : x.value === 'nedýchá' ? 'Nedýchá' : x.value, hint: Math.round(x.weight / W * 100) + ' % případů', weight: x.weight }));
        canSkip = true;
      } else if (c.step === 'upresneni') {
        const W = consistent(K, c).reduce((a, cb) => a + cb.cnt, 0) || 1;
        tiles = c.page.map(t => ({ id: t.name, label: strip(t.name), group: group(t.name), hint: Math.round(t.share * 100) + ' %', weight: t.weight }));
        tiles.sort((a, b) => (a.group < b.group ? -1 : a.group > b.group ? 1 : b.weight - a.weight));
        canFinish = true; canSkip = true; void W;
      }
      return { step: c.step, title, crumbs, tiles, canFinish, canSkip, canBack: answers.length > 0, klasif: c.klasif, auto: c.auto };
    }
    function result(answers) {
      const c = run(answers); if (!c.klasif) return null;
      const K = byK[c.klasif], list = consistent(K, c), W = list.reduce((a, cb) => a + cb.cnt, 0) || 1;
      const dist = { 1: 0, 2: 0, 3: 0 }; for (const cb of list) dist[cb.n] += cb.cnt;
      const apneic = c.vedomi === 'U' && c.dychani === 'nedýchá';
      let n = [1, 2, 3].reduce((b, k) => (dist[k] > dist[b] ? k : b), 3), conf = dist[n] / W;
      if (apneic) { n = 1; conf = 1; }
      const same = list.filter(cb => cb.n === n), Wn = same.reduce((a, cb) => a + cb.cnt, 0) || 1, pDyn = apneic ? 0 : same.filter(cb => cb.dyn).reduce((a, cb) => a + cb.cnt, 0) / Wn;
      const dyn = !apneic && n === 2 && pDyn >= 0.5;
      const best = (same.length ? same : list).slice().sort((a, b) => b.cnt - a.cnt)[0];
      const implied = []; const cnt = new Map(); for (const cb of list) for (const nm of cb.names) cnt.set(nm, (cnt.get(nm) || 0) + cb.cnt);
      for (const [nm, w] of cnt) if (w === W && !isDyn(nm)) implied.push(nm);
      const names = [];
      const add = nm => { if (nm && !names.includes(nm) && !isDyn(nm)) names.push(nm); };
      const pickBase = (st, label) => { if (!label || label === '?') return; for (const nm of best.names) { const cl = classify(nm); if (cl && cl[0] === st && cl[1] === label) { add(nm); return; } } };
      pickBase('vek', c.vek); pickBase('vedomi', c.vedomi); pickBase('dychani', c.dychani);
      for (const nm of best.names) if (isAvpu(nm) && c.vedomi && c.vedomi !== '?' && strip(nm).slice(-1).toUpperCase() === c.vedomi) add(nm);
      for (const nm of c.picked) add(nm);
      for (const nm of implied) add(nm);
      const added = [];
      for (const nm of best.names) {
        if (names.includes(nm) || isDyn(nm)) continue;
        const cl = classify(nm), av = isAvpu(nm) ? strip(nm).slice(-1).toUpperCase() : null;
        if (cl && c[cl[0]] && c[cl[0]] !== '?' && c[cl[0]] !== cl[1]) continue;   // protiřečí zvolenému věku, vědomí či dýchání
        if (av && c.vedomi && c.vedomi !== '?' && av !== c.vedomi) continue;
        add(nm); added.push(nm);
      }
      if (dyn) names.push('DYNAMICKÁ INDIKACE');
      return { klasif: c.klasif, n, nDist: { 1: dist[1] / W, 2: dist[2] / W, 3: dist[3] / W }, confidence: conf, dyn, pDyn, vek: c.vek === '?' ? null : c.vek, vedomi: c.vedomi === '?' ? null : c.vedomi, dychani: c.dychani === '?' ? null : c.dychani, symptoms: names, picked: c.picked.slice(), added, apneic, combos: list.length };
    }
    return { indikace, page, result, run, klasifikace: () => Object.keys(byK), strip, group };
  }
  const api = { create, strip, STEP_TITLE, VED_LAB };
  if (typeof module !== 'undefined') module.exports = api; else window.CT_SPIDER = api;
})();
