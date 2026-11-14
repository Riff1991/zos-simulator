// Kontrola obsahu generovaných výzev (jména, věk, místo, příznaky, četnosti).
// Spuštění: node tests/content_audit.js   → při nálezu chyb skončí kódem 1.
const fs = require('fs');
global.ZOS_DATA = require('../src/data.js');
global.ZOS_PEOPLE = require('../src/people.js');
global.ZOS_SYMPTOMS = require('../src/symptoms.json');
global.ROUTER = require('../src/router.js');
{ const b = fs.readFileSync(__dirname + '/../site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
global.ZOS_POI = JSON.parse(require('fs').readFileSync(__dirname + '/../site/poi.json', 'utf8'));
global.ZOS_ADDR = JSON.parse(fs.readFileSync(__dirname + '/../site/addr.json', 'utf8'));
const { Sim } = require('../src/engine.js');

const FEM = new Set(); const MASC = new Set();
// Jména podle rodu z generátoru (všechna ženská končí na -a/-e/-ie/-ý? ne – bereme z tabulky přes vzorek)
for (let i = 0; i < 3000; i++) {
  let x = i * 7919 % 1000 / 1000; const r = () => (x = (x * 9301 + 49297) % 233280 / 233280);
  FEM.add(ZOS_PEOPLE.person(r, 'Ž', 20 + i % 70).first); MASC.add(ZOS_PEOPLE.person(r, 'M', 20 + i % 70).first);
}
const femSurnames = new Set(ZOS_PEOPLE.SURNAMES.map(s => s[1])), mascSurnames = new Set(ZOS_PEOPLE.SURNAMES.map(s => s[0]));

const issues = {}, ex = {};
const add = (k, txt) => { issues[k] = (issues[k] || 0) + 1; (ex[k] = ex[k] || []).length < 3 && ex[k].push(txt); };
const checkName = (who, where) => {
  if (!who) return;
  const parts = who.trim().split(/\s+/);
  if (parts.length < 2) return add('neúplné jméno', `${where}: ${who}`);
  const [a, b] = parts; // „Jméno Příjmení“ nebo „Příjmení Jméno“ (pacient)
  const first = FEM.has(a) || MASC.has(a) ? a : b, last = first === a ? b : a;
  if (FEM.has(first) && mascSurnames.has(last)) add('ženské jméno + mužské příjmení', `${where}: ${who}`);
  if (MASC.has(first) && femSurnames.has(last)) add('mužské jméno + ženské příjmení', `${where}: ${who}`);
};

const cases = [], crews = [];
for (const seed of [11, 12, 13, 14, 15, 16]) {
  const s = new Sim({ seed, mode: 'shift', startHour: seed % 2 ? 7 : 19 });
  // jednoduchý bot, aby výzvy neeskalovaly jen kvůli nečinnosti
  for (let t = 0; t < 12 * 3600 - 120; t += 20) {
    s.step(20);
    for (const c of s.s.cases) if (c.status === 'waiting' && !c.mu) {
      const r = s.suggest(c.id, 'RZP')[0]; if (r) s.assign(c.id, r.crewId);
      if (c.rvNeed) { const v = s.suggest(c.id, 'RV')[0]; if (v) s.assign(c.id, v.crewId); }
    }
  }
  cases.push(...s.s.cases); crews.push(...s.s.crews);
}
const P = cases.filter(c => c.typ !== 'sekundární' && c.ind !== 'mu');
for (const k of crews) for (const m of k.members || []) checkName(m, 'posádka');
for (const c of cases) { checkName(c.ozn, 'oznamovatel'); if (c.patientName) checkName(c.patientName, 'pacient'); }
for (const c of P) {
  const up = c.up || '', a = c.age, place = `${c.place || ''} ${c.poznamka || ''}`;
  if (/DYNAMICKÁ INDIKACE/i.test(up) && c.n !== 2) add('DYNAMICKÁ INDIKACE mimo N2', `N${c.n} ${c.klasif}`);
  if (c.n === 2 && c.dyn && !/DYNAMICKÁ INDIKACE/i.test(up)) add('dyn. N2 bez štítku', `${c.klasif} | ${up.slice(0, 60)}`);
  if (a < 60 && c.where === 'domov') add('pod 60 let v domově pro seniory', `${a} let | ${place.slice(0, 50)}`);
  if (a < 15 && /provozovn/i.test(place)) add('dítě v provozovně', `${a} | ${place.slice(0, 50)}`);
  if (a < 4 && /škola/i.test(place)) add('batole ve škole', `${a} | ${place.slice(0, 50)}`);
  if (c.sex === 'M' && /Gravid|Porod|plodová|těhot/i.test(up)) add('muž s gynekologií', up.slice(0, 60));
  if (/nedýchá/.test(up) && !/TANR nelze/i.test(up) && c.nOrig !== 1) add('nedýchá a ne N1', `N${c.nOrig} ${c.klasif}`);
  const toks = up.split(',').map(x => x.trim().replace(/^[^0-9A-Za-zÁ-ž]+/, '').toLowerCase()).filter(Boolean);
  if (toks.length !== new Set(toks).size) add('duplicitní příznak', up.slice(0, 80));
  if (/schopen udržet konverzaci/.test(up) && /nemůže mluvit|pouze slovo|pouze větu/.test(up)) add('protichůdná řeč', up.slice(0, 80));
  if (/při vědomí/.test(up) && /bezvědomí/.test(up)) add('při vědomí + bezvědomí', up.slice(0, 80));
  if (c.patientName && c.oznRel === 'volá pacient sám' && c.patientName.split(' ').reverse().join(' ') !== c.ozn) add('„volá pacient sám“, ale jiné jméno', `${c.ozn} vs ${c.patientName}`);
  if (c.oznRel === 'volá pacient sám' && /AVPU-U|bezvědomí|nedýchá/.test(up)) add('v bezvědomí volá sám', up.slice(0, 60));
}
// četnosti
const nCount = { 1: 0, 2: 0, 3: 0, 4: 0 }; for (const c of P) nCount[c.nOrig]++;
const share = k => nCount[k] / P.length;
const perShift = cases.length / 6;
const dps = P.filter(c => c.where === 'domov').length / P.length;
const names = new Set(cases.map(c => c.ozn)).size / cases.length;
const ranges = [
  ['podíl N1', share(1), 0.015, 0.08], ['podíl N2', share(2), 0.2, 0.42], ['podíl N3', share(3), 0.5, 0.75],
  ['výzev za směnu', perShift, 95, 150], ['podíl domov pro seniory', dps, 0.03, 0.15], ['unikátnost oznamovatelů', names, 0.85, 1.01],
];
let fail = false;
console.log(`Výzev: ${cases.length} (${perShift.toFixed(0)} za směnu), primárních ${P.length}`);
for (const [k, v, lo, hi] of ranges) { const ok = v >= lo && v <= hi; if (!ok) fail = true; console.log(`${ok ? 'OK  ' : 'FAIL'} ${k}: ${v < 2 ? (v * 100).toFixed(1) + ' %' : v.toFixed(0)} (cíl ${lo < 2 ? lo * 100 + '–' + hi * 100 + ' %' : lo + '–' + hi})`); }
const keys = Object.keys(issues);
if (!keys.length) console.log('OK   žádné nesrovnalosti v obsahu');
for (const k of keys) { fail = true; console.log(`FAIL ${k}: ${issues[k]}× – např. ${ex[k].join(' | ')}`); }
console.log('\nUkázka výzev:');
for (const c of P.slice(0, 6)) console.log(` N${c.nOrig} ${c.klasif} | ${c.addr} | ${c.place} | ${c.patientName}, ${c.ageText} | oznamovatel ${c.ozn} (${c.oznRel}) ${c.phone} | ${c.poznamka}`);
process.exit(fail ? 1 : 0);
