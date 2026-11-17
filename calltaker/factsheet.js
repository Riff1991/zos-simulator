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
// seed = číslo → deterministický případ i volající (jediný zdroj pravdy je Sim.callFacts v src/sim-calltaker.js)
function makeCase(seed) {
  const { Sim } = loadEngine();
  const f = new Sim({ seed: 1, mode: 'free' }).callFacts(seed);
  return { view: f.view, key: f.key };
}
module.exports = { makeCase, loadEngine };
if (require.main === module) {
  const seed = Number(process.argv[2] || 1);
  console.log(JSON.stringify(makeCase(seed), null, 2));
}
