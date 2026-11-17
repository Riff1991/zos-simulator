// Hra: čas od vyslání (assign) do „Na místě“ pro dvojice základna–obec; výstup do game_out.json
const fs = require('fs'), R = __dirname + '/../../';
global.ZOS_DATA = require(R + 'src/data.js'); global.ZOS_PEOPLE = require(R + 'src/people.js'); global.ZOS_SYMPTOMS = require(R + 'src/symptoms.json'); global.ROUTER = require(R + 'src/router.js');
{ const b = fs.readFileSync(R + 'site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
global.ZOS_POI = JSON.parse(fs.readFileSync(R + 'site/poi.json', 'utf8')); global.ZOS_RAIL = JSON.parse(fs.readFileSync(R + 'site/rail.json', 'utf8')); global.ZOS_ADDR = JSON.parse(fs.readFileSync(R + 'site/addr.json', 'utf8'));
const { Sim } = require(R + 'src/engine.js');
const A = ZOS_ADDR, n = A.a.length / 8, byCity = {};
for (let i = 0; i < n; i++) { const c = A.s[A.a[i * 8 + 3]]; (byCity[c] || (byCity[c] = [])).push(i); }
const BASE = { 'České Budějovice': 'cb', 'Vltava': 'cbvl', 'Pražská': 'cbpr', 'Tábor': 'ta', 'Písek': 'pi', 'Jindřichův Hradec': 'jh', 'Strakonice': 'st', 'Český Krumlov': 'ck', 'Třeboň': 'trebon', 'Prachatice': 'pt', 'Vimperk': 'vimperk', 'Dačice': 'dacice', 'Vodňany': 'vodnany', 'Soběslav': 'sobeslav', 'Trhové Sviny': 'tsviny', 'Milevsko': 'milevsko', 'Kaplice': 'kaplice', 'Veselí nad Lužnicí': 'veseli', 'Suchdol nad Lužnicí': 'suchdol', 'Týn nad Vltavou': 'tyn', 'Blatná': 'blatna' };
const jobs = JSON.parse(fs.readFileSync(__dirname + '/game_in.json', 'utf8'));
const out = {};
for (const [base, obec, N] of jobs) {
  const id = BASE[base], idx = byCity[obec]; if (!id || !idx) continue;
  const res = [];
  for (let k = 0; k < 40; k++) {
    const sim = new Sim({ seed: 1000 + k, mode: 'free', startHour: 10, muEnabled: false });
    sim.s.ev.nextSpawn = sim.s.ev.nextSecond = sim.s.ev.nextMU = 999999;
    const i = idx[Math.floor(sim.rnd() * idx.length)];
    const at = { lat: A.a[i * 8] / 1e5, lon: A.a[i * 8 + 1] / 1e5, addr: 'x', town: obec, okres: null };
    const c = sim._spawn({ ind: N === 1 ? 'hrudnik' : 'bolest', n: N, at, intake: 0 }); c.status = 'waiting';
    const crew = sim.crewOf(id + '-r0'); if (!crew) break;
    const r = sim.assign(c.id, crew.id); if (!r.ok) break;
    const t0 = sim.s.t; let t = 0;
    while (t < 7200 && crew.state !== 'onscene') { sim.step(10); t += 10; }
    if (crew.state === 'onscene') res.push(sim.s.t - t0);
  }
  if (res.length) { res.sort((a, b) => a - b); const q = p => res[Math.floor(p * (res.length - 1))]; out[base + '|' + obec + '|N' + N] = [res.length, q(.25), q(.5), q(.75)]; }
}
fs.writeFileSync(__dirname + '/game_out.json', JSON.stringify(out)); console.log(Object.keys(out).length);
