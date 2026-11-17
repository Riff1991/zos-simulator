// Test adres: index našeptávače obsahuje všechny adresy (i varianty zápisu obcí a ulic) a geokódování najde dům, i u stejnojmenných obcí.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
global.ZOS_DATA = require(path.join(R, 'src/data.js')); global.ZOS_PEOPLE = require(path.join(R, 'src/people.js')); global.ZOS_SYMPTOMS = require(path.join(R, 'src/symptoms.json'));
global.ROUTER = require(path.join(R, 'src/router.js')); { const b = fs.readFileSync(path.join(R, 'site/graph.wasm')); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
const J = f => JSON.parse(fs.readFileSync(path.join(R, 'site', f), 'utf8'));
global.ZOS_POI = J('poi.json'); global.ZOS_RAIL = J('rail.json'); global.ZOS_ADDR = J('addr.json');
const { Sim } = require(path.join(R, 'src/engine.js')), { build, nk } = require(path.join(R, 'calltaker/addrindex.js'));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };
const A = ZOS_ADDR, a = A.a, S = A.s, ix = build(A), n = a.length / 8;
// 1) všechny body jsou v indexu (obec, ulice i číslo), varianty zápisu se sloučily
let miss = 0;
for (let i = 0; i < a.length; i += 8) {
  const T = ix.byNk.get(nk(S[a[i + 3]])); if (!T) { miss++; continue; }
  const st = nk(S[a[i + 2]]), key = st && st !== T.nk ? st : '', ss = T.streets.get(key);
  if (!ss || !ss.nums.has(S[a[i + 4]])) miss++;
}
ok(miss === 0, 'index našeptávače obsahuje všech ' + n + ' adres (chybí ' + miss + ')');
const cb = ix.byNk.get('ceske budejovice'), vi = ix.byNk.get('vimperk');
ok(cb && cb.n === 'České Budějovice' && cb.streets.size > 400 && [...cb.streets.values()].some(s => s.n === 'Matice školské'), 'České Budějovice mají ' + (cb && cb.streets.size) + ' ulic včetně Matice školské (varianta bez diakritiky je sloučena)');
ok(vi && vi.n === 'Vimperk' && vi.streets.size > 50, 'Vimperk (varianta VIMPERK sloučena) má ' + (vi && vi.streets.size) + ' ulic a název zůstal správný');
ok(ix.towns.every(t => t.n && t.okres !== undefined), 'každá obec má název a okres');
// 2) geokódování: náhodné adresy se najdou jako dům u skutečného bodu (near = skutečná poloha)
const sim = new Sim({ seed: 1, mode: 'free' });
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
let tot = 0, exact = 0, near = 0, noNear = 0;
for (let k = 0; k < 4000; k++) {
  const i = Math.floor(rnd() * n) * 8, city = S[a[i + 3]], st = S[a[i + 2]], num = S[a[i + 4]], text = (st && st !== city ? st + ' ' + num : 'čp. ' + num) + ', ' + city;
  if (/^ev\./i.test(num)) continue; tot++;
  const lat = a[i] / 1e5, lon = a[i + 1] / 1e5, g = sim._ctGeocode(text, { lat, lon });
  if (g.quality === 'exact') { exact++; if (Math.hypot((g.lat - lat) * 111320, (g.lon - lon) * 111320 * Math.cos(lat * Math.PI / 180)) < 30) near++; }
  const g2 = sim._ctGeocode(text); if (g2.quality === 'exact') noNear++;
}
ok(exact / tot > 0.995, 'geokódování najde ' + exact + ' z ' + tot + ' náhodných adres jako dům (exact)');
ok(near / tot > 0.99, 'a trefí skutečný bod do 30 m u ' + near + ' z ' + tot + ' (i při stejné adrese v různých částech obce)');
ok(noNear / tot > 0.995, 'bez polohy se adresa najde také (' + noNear + ' z ' + tot + ')');
// 3) stejnojmenné obce v různých okresech: s polohou se vybere ta správná
{ const by = new Map(); for (let i = 0; i < a.length; i += 8) { const k = nk(S[a[i + 3]]); if (!by.has(k)) by.set(k, new Map()); by.get(k).set(a[i + 6], i); }
  const amb = [...by].filter(([, m]) => m.size > 1); let good = 0, tried = 0;
  for (const [, m] of amb) for (const [, i] of m) { const city = S[a[i + 3]], st = S[a[i + 2]], num = S[a[i + 4]]; if (/^ev\./i.test(num)) continue; tried++;
    const g = sim._ctGeocode((st && st !== city ? st + ' ' + num : 'čp. ' + num) + ', ' + city, { lat: a[i] / 1e5, lon: a[i + 1] / 1e5 });
    if (g.quality === 'exact' && Math.abs(g.lat - a[i] / 1e5) < 0.01) good++; }
  ok(amb.length >= 10 && good / tried > 0.97, 'stejnojmenné obce ve více okresech (' + amb.length + '): správný okres vybrán u ' + good + ' z ' + tried); }
// 4) adresy skutečně generovaných případů (standardní adresa domu) jde zadat a najít u skutečného bodu
{ let tot = 0, hit = 0, hitNoNear = 0, bad = [];
  for (let sd = 1; sd <= 1500; sd++) {
    const c = new Sim({ seed: sd, mode: 'free' })._spawn();
    if (sim._ctKind(c) !== 'dum') continue; tot++;
    const m = /^(.+?) čp\. (.+)$/.exec(c.addr), typed = !c.addr.includes(',') && m ? 'čp. ' + m[2] + ', ' + m[1] : c.addr;   // tak adresu složí pole obec / ulice / číslo
    const ref = sim._ctRef(c), g = sim._ctGeocode(typed, { lat: c.lat, lon: c.lon }), d = g.quality ? Math.hypot((g.lat - ref.lat) * 111320, (g.lon - ref.lon) * 111320 * Math.cos(c.lat * Math.PI / 180)) : Infinity;
    if (g.quality === 'exact' && d <= 60) hit++; else if (bad.length < 5) bad.push(typed + ' [' + c.lat.toFixed(5) + ',' + c.lon.toFixed(5) + '] (' + g.quality + ', ' + Math.round(d) + ' m)');
    const g2 = sim._ctGeocode(typed), d2 = g2.quality ? Math.hypot((g2.lat - c.lat) * 111320, (g2.lon - c.lon) * 111320 * Math.cos(c.lat * Math.PI / 180)) : Infinity;
    if (g2.quality === 'exact' && d2 <= 60) hitNoNear++;
  }
  let noErr = 0, t2 = 0; for (let sd = 1; sd <= 600; sd++) { const c = new Sim({ seed: sd, mode: 'free' })._spawn(); if (sim._ctKind(c) !== 'dum') continue; const m2 = /^(.+?) čp\. (.+)$/.exec(c.addr), typed2 = !c.addr.includes(',') && m2 ? 'čp. ' + m2[2] + ', ' + m2[1] : c.addr; if (/Straße|Gmünd|Weitra|Freistadt/.test(typed2)) continue; t2++; const l = sim._ctLocate(typed2, { addr: c.addr, lat: c.lat, lon: c.lon }, null); if (!l.miss && !l.searchDelay && l.errM <= l.tol) noErr++; }
  ok(t2 > 300 && noErr / t2 > 0.995, 'správně zadaná adresa nemá chybu polohy ani zdržení v enginu: ' + noErr + ' z ' + t2);
  ok(tot > 800 && hit / tot > 0.995, 'adresy generovaných případů se najdou do tolerance 60 m: ' + hit + ' z ' + tot + (bad.length ? ' – např. ' + bad.join('; ') : ''));
  console.log('  (bez znalosti polohy, tedy jen z textu: ' + hitNoNear + ' z ' + tot + ')'); }
// 5) čísla „popisné/orientační“: volající říká opačné pořadí nebo jen jedno číslo (Mánesova 70/401 ↔ 401/70)
{ let rev = 0, revOk = 0, one = 0, oneOk = 0, first = 0, firstOk = 0;
  const key = i => S[a[i + 3]] + '|' + S[a[i + 2]];
  const cnt2 = new Map(), cnt1 = new Map();
  for (let i = 0; i < a.length; i += 8) { const m = /^(\d+)\/(\d+)$/.exec(S[a[i + 4]]); if (m) { cnt2.set(key(i) + '|' + m[2], (cnt2.get(key(i) + '|' + m[2]) || 0) + 1); cnt1.set(key(i) + '|' + m[1], (cnt1.get(key(i) + '|' + m[1]) || 0) + 1); } }
  for (let k = 0; k < 6000; k++) {
    const i = Math.floor(rnd() * n) * 8, city = S[a[i + 3]], st = S[a[i + 2]], m = /^(\d+)\/(\d+)$/.exec(S[a[i + 4]]); if (!m || !st || st === city) continue;
    const lat = a[i] / 1e5, lon = a[i + 1] / 1e5, near = { lat, lon }, at = t => { const g = sim._ctGeocode(t + ', ' + city, near); return g.quality === 'exact' && Math.hypot((g.lat - lat) * 111320, (g.lon - lon) * 72000) < 30; };
    rev++; if (at(st + ' ' + m[2] + '/' + m[1])) revOk++;
    if (cnt2.get(key(i) + '|' + m[2]) === 1) { one++; if (at(st + ' ' + m[2])) oneOk++; }
    if (cnt1.get(key(i) + '|' + m[1]) === 1) { first++; if (at(st + ' ' + m[1])) firstOk++; }
  }
  ok(rev > 300 && revOk / rev > 0.97, 'opačné pořadí čísla (70/401 místo 401/70) se najde: ' + revOk + ' z ' + rev);
  ok(one > 300 && oneOk / one > 0.97, 'jen orientační číslo (70) najde dům, je-li jednoznačné: ' + oneOk + ' z ' + one);
  ok(first > 300 && firstOk / first > 0.97, 'jen popisné číslo (401) najde dům: ' + firstOk + ' z ' + first);
  const g = sim._ctGeocode('Mánesova 70/401, České Budějovice'); ok(g.quality === 'exact', 'Mánesova 70/401 v Českých Budějovicích se najde (' + g.quality + ')'); }
console.log(fail ? 'SELHALO: ' + fail : 'addr test OK'); process.exit(fail ? 1 : 0);
