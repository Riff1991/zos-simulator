// Pro dvojice (stanoviště, obec) z exportu spočítá routerem čas a délku trasy (základna → střed obce podle adres).
const fs = require('fs'), R = __dirname + '/../../';
global.ZOS_DATA = require(R + 'src/data.js'); global.ROUTER = require(R + 'src/router.js');
{ const b = fs.readFileSync(R + 'site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
const A = JSON.parse(fs.readFileSync(R + 'site/addr.json', 'utf8'));
const pairs = JSON.parse(fs.readFileSync(__dirname + '/pairs_in.json', 'utf8'));
const cen = {}; const n = A.a.length / 8;
for (let i = 0; i < n; i++) { const c = A.s[A.a[i * 8 + 3]]; const o = cen[c] || (cen[c] = [0, 0, 0]); o[0] += A.a[i * 8] / 1e5; o[1] += A.a[i * 8 + 1] / 1e5; o[2]++; }
const BASE = { 'České Budějovice': 'cb', 'Vltava': 'cbvl', 'Pražská': 'cbpr', 'Planá': 'cbpl', 'Tábor': 'ta', 'Písek': 'pi', 'Jindřichův Hradec': 'jh', 'Strakonice': 'st', 'Český Krumlov': 'ck', 'Třeboň': 'trebon', 'Prachatice': 'pt', 'Vimperk': 'vimperk', 'Dačice': 'dacice', 'Vodňany': 'vodnany', 'Soběslav': 'sobeslav', 'Trhové Sviny': 'tsviny', 'Milevsko': 'milevsko', 'Kaplice': 'kaplice', 'Opařany': 'oparany', 'Veselí nad Lužnicí': 'veseli', 'Suchdol nad Lužnicí': 'suchdol', 'Týn nad Vltavou': 'tyn', 'Kunžak': 'kunzak', 'Blatná': 'blatna', 'Frymburk': 'frymburk', 'Čimelice': 'cimelice', 'Lhenice': 'lhenice', 'Volary': 'volary', 'Vacov': 'vacov', 'Mladá Vožice': 'mvozice', 'Horní Planá': 'hplana', 'Vyšší Brod': 'vbrod' };
const hav = (a, b, c, d) => { const r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const out = {};
for (const [base, obec] of pairs) {
  const st = ZOS_DATA.stations.find(s => s.id === BASE[base]), c = cen[obec];
  if (!st || !c) continue;
  const lat = c[0] / c[2], lon = c[1] / c[2];
  const r = ROUTER.route(st.lat, st.lon, lat, lon); if (!r) continue;
  let km = 0; for (let i = 2; i < r.pts.length; i += 2) km += hav(r.pts[i - 2], r.pts[i - 1], r.pts[i], r.pts[i + 1]);
  out[base + '|' + obec] = [r.sec, km, hav(st.lat, st.lon, lat, lon)];
}
fs.writeFileSync(__dirname + '/pairs_out.json', JSON.stringify(out));
console.log('pairs', Object.keys(out).length, '/', pairs.length);
