// Spike „calltaker“ (krok 1): z generátoru případů simulátoru vyrobí
//  - view = co ví volající (do promptu AI volajícího),
//  - key  = správná odpověď (jen pro hodnocení, volající ji nevidí).
// Žádná reálná data: jména, telefony a případy jsou generované (viz AGENTS.md).
const path = require('path'), fs = require('fs');
const R = path.join(__dirname, '..');
function loadEngine() {
  if (global.__zosLoaded) return require(path.join(R, 'src/engine.js'));
  global.ZOS_DATA = require(path.join(R, 'src/data.js'));
  global.ZOS_PEOPLE = require(path.join(R, 'src/people.js'));
  global.ZOS_SYMPTOMS = require(path.join(R, 'src/symptoms.json'));
  global.ROUTER = require(path.join(R, 'src/router.js'));
  const b = fs.readFileSync(path.join(R, 'site/graph.wasm'));
  ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
  const J = f => JSON.parse(fs.readFileSync(path.join(R, 'site', f), 'utf8'));
  global.ZOS_POI = J('poi.json'); global.ZOS_RAIL = J('rail.json'); global.ZOS_ADDR = J('addr.json');
  global.__zosLoaded = true;
  return require(path.join(R, 'src/engine.js'));
}
const { pickPersona } = require('./personas.js');

// seed = číslo → deterministický případ i volající
function makeCase(seed) {
  const { Sim } = loadEngine();
  const sim = new Sim({ seed, mode: 'free' });
  const c = sim._spawn();
  const rnd = () => sim.rnd();
  const persona = pickPersona(rnd, c);
  const bld = c.bld || {};
  const view = {
    seed,
    volajici: { jmeno: c.ozn, vztah: c.oznRel.replace(/^volá\s*/, '') || c.oznRel, telefon: c.phone, linka: c.src },
    pacient: { jmeno: c.patientName, vek: c.age, pohlavi: c.sex === 'M' ? 'muž' : 'žena', pacientJeVolajici: /pacient sám/.test(c.oznRel) },
    misto: { adresa: c.addr, obec: c.town, okres: c.okres, castObce: c.cast || '', druh: c.where, popis: c.place || '', budova: bld.code === 3 ? 'bytový dům' : bld.code === 1 ? 'dům' : bld.code === 2 ? 'obytná budova' : '', podlazi: bld.levels || 0 },
    // odborný obraz je jen pro tebe jako autora: popisuj laicky, nikdy nečti zkratky
    klinickyObraz: c.up, poznamka: c.poznamka || '',
    persona,
  };
  const key = {
    seed, naléhavost: 'N' + c.n, dynamicka: !!c.dyn, lekar: !!c.rvNeed, klasifikace: c.klasif, indikace: c.ind, adresa: c.addr, obec: c.town,
    pacient: c.patientName, vek: c.age, priznaky: c.up, telefon: c.phone,
  };
  return { view, key };
}
module.exports = { makeCase, loadEngine };
if (require.main === module) {
  const seed = Number(process.argv[2] || 1);
  console.log(JSON.stringify(makeCase(seed), null, 2));
}
