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
  const api = { create, engineKlasif, norm, KIND_LAB, KIND_ORD };
  if (typeof module !== 'undefined') module.exports = api; else window.CT_CIHLY = api;
})();
