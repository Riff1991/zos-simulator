// Test pavouka z cihliček (calltaker/cihly.js + src/cihly.json): každá cihla je dosažitelná dvěma kliky, barvy odpovídají naléhavosti.
const path = require('path'), R = path.join(__dirname, '..');
const D = require(path.join(R, 'src/data.js')), DATA = require(path.join(R, 'src/cihly.json')), C = require(path.join(R, 'calltaker/cihly.js'));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };
const known = [...new Set((D.indications || D.ZOS_DATA.indications).map(i => i.klasif))];
const sp = C.create(DATA, { klasifs: known });
const first = sp.page([]);
ok(first.step === 'indikace' && first.tiles.length === DATA.tiles.length && first.tiles.length >= 28, 'první stránka: ' + first.tiles.length + ' dlaždic indikace');
ok(new Set(first.tiles.map(t => t.id)).size === first.tiles.length && new Set(DATA.bricks.map(b => b.id)).size === DATA.bricks.length, 'id dlaždic i cihel jsou jedinečná');
ok(first.tiles.every(t => t.sheetLabel && t.kinds.length), 'dlaždice mají skupinu a barvy cihel');
let bad = 0, cnt = { n1: 0, n2: 0, n2di: 0, n3: 0, n4: 0 }, unmatched = new Set();
for (const t of DATA.tiles) {
  const pg = sp.page([t.id]);
  if (pg.step !== 'cihly' || pg.tiles.length !== t.bricks.length) { bad++; console.log('  stránka cihel:', t.label); continue; }
  for (const bt of pg.tiles) {
    const r = sp.result([t.id, bt.id]), end = sp.page([t.id, bt.id]);
    cnt[bt.kind]++;
    if (!r || end.step !== 'vysledek' || r.n !== bt.n || r.dyn !== bt.dyn || !bt.lines.length || !bt.crew) { bad++; console.log('  cihla:', t.label, bt.id); continue; }
    if (bt.kind === 'n1' && bt.n !== 1) bad++;
    if (bt.kind === 'n2di' && !(bt.dyn && bt.n === 2 && bt.crew === 'DI')) bad++;
    if (bt.dyn && bt.kind !== 'n2di') bad++;
    if (bt.kind === 'n3' && bt.n !== 3) bad++;
    if (bt.kind === 'n4' && !(bt.n === 4 && r.planovane)) bad++;
    if (!known.includes(r.klasif)) unmatched.add(r.klasif);
  }
}
ok(bad === 0, 'každá cihla se dá vybrat a má správné N, barvu, posádku a text');
ok(DATA.bricks.length === 91 && cnt.n1 > 5 && cnt.n2 > 10 && cnt.n2di > 5 && cnt.n3 > 10 && cnt.n4 > 0, 'počty cihel: ' + JSON.stringify(cnt));
ok(C.engineKlasif('NZO - spatřená', known) === known.find(k => /NZO/.test(k)) && C.engineKlasif('Zvracení / průjem', known) === 'Zvracení/průjem' && C.engineKlasif('Popálení, poleptání', known) === 'Popálení, poleptání', 'názvy klasifikací se mapují na klasifikace generátoru');
console.log('  bez ekvivalentu v generátoru (zůstane název z tabulky):', [...unmatched].join(', '));
const nz = sp.page([first.tiles[0].id]).tiles[0], r1 = sp.result([first.tiles[0].id, nz.id]);
ok(JSON.stringify(sp.result([first.tiles[0].id, nz.id])) === JSON.stringify(r1) && r1.cihla === true && r1.symptoms.length === 0, 'deterministické, bez příznaků a bez pravděpodobností');
const dn = DATA.tiles.find(t => /Dopravní nehoda/.test(t.label)), dnb = sp.page([dn.id]).tiles;
ok(dnb.length === 4 && dnb.some(b => b.kind === 'n1') && dnb.some(b => b.kind === 'n2') && dnb.some(b => b.kind === 'n2di') && dnb.some(b => b.kind === 'n3'), 'dopravní nehoda: červená, modrá, růžová a zelená cihla');
console.log(fail ? 'SELHALO: ' + fail : 'cihly test OK'); process.exit(fail ? 1 : 0);
