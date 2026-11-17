// Pro dvojice (stanoviště, obec) z exportu spočítá routerem čas a délku trasy (základna → střed obce podle adres).
const fs = require('fs'), R = __dirname + '/../../';
global.ZOS_DATA = require(R + 'src/data.js'); global.ROUTER = require(R + 'src/router.js');
{ const b = fs.readFileSync(R + 'site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
const A = JSON.parse(fs.readFileSync(R + 'site/addr.json', 'utf8'));
const pairs = JSON.parse(fs.readFileSync(__dirname + '/pairs_in2.json', 'utf8'));
const byCity = {}; const n = A.a.length / 8;
for (let i = 0; i < n; i++) { const c = A.s[A.a[i * 8 + 3]]; (byCity[c] || (byCity[c] = [])).push(i); }
const BASE = { 'České Budějovice': 'cb', 'Vltava': 'cbvl', 'Pražská': 'cbpr', 'Planá': 'cbpl', 'Tábor': 'ta', 'Písek': 'pi', 'Jindřichův Hradec': 'jh', 'Strakonice': 'st', 'Český Krumlov': 'ck', 'Třeboň': 'trebon', 'Prachatice': 'pt', 'Vimperk': 'vimperk', 'Dačice': 'dacice', 'Vodňany': 'vodnany', 'Soběslav': 'sobeslav', 'Trhové Sviny': 'tsviny', 'Milevsko': 'milevsko', 'Kaplice': 'kaplice', 'Opařany': 'oparany', 'Veselí nad Lužnicí': 'veseli', 'Suchdol nad Lužnicí': 'suchdol', 'Týn nad Vltavou': 'tyn', 'Kunžak': 'kunzak', 'Blatná': 'blatna', 'Frymburk': 'frymburk', 'Čimelice': 'cimelice', 'Lhenice': 'lhenice', 'Volary': 'volary', 'Vacov': 'vacov', 'Mladá Vožice': 'mvozice', 'Horní Planá': 'hplana', 'Vyšší Brod': 'vbrod' };
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const out = {};
for (const [base, obec] of pairs) {
  const st = ZOS_DATA.stations.find(s => s.id === BASE[base]), idx = byCity[obec];
  if (!st || !idx) continue;
  const secs = [];
  for (let t = 0; t < 120; t++) { const i = idx[Math.floor(rnd() * idx.length)]; const r = ROUTER.route(st.lat, st.lon, A.a[i * 8] / 1e5, A.a[i * 8 + 1] / 1e5); if (r) secs.push(Math.round(r.sec)); }
  if (secs.length > 20) out[base + '|' + obec] = secs;
}
fs.writeFileSync(__dirname + '/secs_out.json', JSON.stringify(out));
console.log('pairs', Object.keys(out).length, '/', pairs.length);
