// Index adres pro našeptávač (obec → ulice → čísla) z ZOS_ADDR. Bez DOM, testovatelné v Nodu.
// Varianty zápisu téhož názvu (bez diakritiky, VELKÁ PÍSMENA) se slučují podle normalizovaného názvu; zobrazí se nejčastější varianta.
// Dřívější index podle surového názvu nechal jednobodovou variantu „Ceske Budejovice“ přepsat skutečné České Budějovice (bez ulic).
const nk = x => String(x == null ? '' : x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
function build(A) {
  const a = A.a, S = A.s, okr = A.okresy || [], towns = new Map(), cntC = new Map(), cntS = new Map();
  const bump = (m, key, name) => { let v = m.get(key); if (!v) m.set(key, v = new Map()); v.set(name, (v.get(name) || 0) + 1); };
  const best = (m, key) => { let b = '', n = -1; for (const [name, c] of m.get(key) || []) if (c > n) { n = c; b = name; } return b; };
  for (let i = 0; i < a.length; i += 8) {
    const city = S[a[i + 3]], st = S[a[i + 2]], num = S[a[i + 4]], ck = nk(city), skRaw = st && nk(st) !== ck ? nk(st) : '';
    let T = towns.get(ck); if (!T) towns.set(ck, T = { nk: ck, c: 0, ok: new Map(), streets: new Map() });
    T.c++; T.ok.set(a[i + 6], (T.ok.get(a[i + 6]) || 0) + 1); bump(cntC, ck, city);
    let ss = T.streets.get(skRaw); if (!ss) T.streets.set(skRaw, ss = { nk: skRaw, nums: new Set(), c: 0, cast: S[a[i + 5]] || '' });
    ss.nums.add(num); ss.c++; if (skRaw) bump(cntS, ck + '|' + skRaw, st);
  }
  const list = [];
  for (const T of towns.values()) {
    T.n = best(cntC, T.nk);
    let bo = -1, bc = -1; for (const [o, c] of T.ok) if (c > bc) { bc = c; bo = o; } T.okres = okr[bo] || ''; T.okresy = T.ok.size; T.okresNames = [...T.ok.entries()].sort((x, y) => y[1] - x[1]).map(e => okr[e[0]]).filter(Boolean);
    for (const ss of T.streets.values()) ss.n = ss.nk ? best(cntS, T.nk + '|' + ss.nk) : '';
    list.push(T);
  }
  return { towns: list, byNk: towns };
}
if (typeof module !== 'undefined') module.exports = { build, nk }; else window.CT_ADDR = { build, nk };
