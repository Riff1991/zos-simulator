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

// obrazovka Náběr případu: klasifikace, cihličky (kritéria) a doporučení podle nejvyšší barvy
{
  const it = C.createIntake(DATA, { klasifs: known }), cl = it.classifications();
  ok(cl.length >= 30, 'klasifikací v rozbalovači: ' + cl.length);
  let badCode = 0, noChips = 0, ids = 0;
  for (const c of cl) {
    const d = it.chipsFor(c.name), codes = [];
    for (const g of d.groups) for (const x of g.chips) { codes.push(x.c); ids++; if (x.c.length > 24 || !x.t || x.kind !== g.kind) badCode++; }
    if (new Set(codes).size !== codes.length) badCode++;
    if (!codes.length) noChips++;
  }
  ok(badCode === 0 && noChips === 0 && ids >= 150, 'každá klasifikace má cihličky s jedinečnými kódy do 24 znaků (' + ids + ' cihliček)');
  const pick = (k, kind) => it.chipsFor(k).groups.find(g => g.kind === kind).chips[0].id;
  const dn = 'Dopravní nehoda', red = pick(dn, 'n1'), blue = pick(dn, 'n2'), pink = pick(dn, 'n2di'), green = pick(dn, 'n3');
  ok(it.evaluate([green, blue, red]).n === 1 && it.evaluate([green, blue, red]).kind === 'n1', 'červená vyhrává nad modrou a zelenou (N1)');
  ok(it.evaluate([green, blue]).n === 2 && it.evaluate([green, pink]).kind === 'n2di' && it.evaluate([green, pink]).dyn === true, 'modrá > růžová DI > zelená; růžová je jen možnost dynamiky');
  ok(it.evaluate([blue, pink]).kind === 'n2' && !it.evaluate([blue, pink]).dyn, 'modrá N2 vyhrává nad růžovou');
  ok(it.evaluate([]) === null && it.evaluate(['u:5']) === null && it.evaluate(['u:0']).n === 1, 'bez cihličky žádné doporučení; TANR doporučí N1; poznámkové cihly nic nedoporučí');
  ok(it.evaluate([red]).crew.length > 0 && it.universal.length === 24, 'doporučení nese typ posádky; univerzálních cihel je 24');
  ok(it.classifications().find(x => x.name === 'NZO – spatřená').engine === known.find(k => /NZO/.test(k)), 'klasifikace z tabulky se mapuje na klasifikaci generátoru');
}
// příznaky z katalogu: Upřesnění tvoří skutečné příznaky, ne text cihly
{
  const it = C.createIntake(DATA, { klasifs: known }), all = [];
  for (const k of it.classifications()) for (const g of it.chipsFor(k.name).groups) for (const x of g.chips) all.push(x);
  const withS = all.filter(x => x.s.length).length;
  ok(withS > 70 && withS < all.length, 'cihličky s příznakem z katalogu: ' + withS + ' z ' + all.length);
  const cat = require(path.join(R, 'src/symptoms.json')).symptomCatalog.map(x => x.replace(/^[^A-Za-zÀ-ž0-9]+/, '').trim().toLowerCase());
  ok(all.every(x => x.s.every(n => cat.includes(n.toLowerCase()))), 'každý příznak cihličky existuje v katalogu příznaků');
  const dn = it.chipsFor('Dopravní nehoda').groups.flatMap(g => g.chips);
  ok(dn.some(x => x.c === 'AVPU-A' && x.s.join() === 'AVPU-A') && dn.some(x => x.s.includes('Otevřené rány')) && dn.some(x => x.s.includes('Poúrazová zmatenost')), 'AVPU-A, Otevřené rány a Poúrazová zmatenost jsou příznaky cihliček');
  ok(it.graySym('HLAVA') === 'Hlava' && it.graySym('HK') === 'Horní končetina' && it.graySym('ASTMATIK') === '', 'šedé cihly mapují na příznaky (neznámé jdou do poznámky)');
}
// přesné sady podle screenů skutečné obrazovky (kódy, barvy, počty a pořadí)
{
  const it = C.createIntake(DATA, { klasifs: known }), codes = (k, kind) => it.chipsFor(k).groups.filter(g => g.kind === kind).flatMap(g => g.chips.map(c => c.c));
  const cnt = k => it.chipsFor(k).groups.reduce((a, g) => a + g.chips.length, 0);
  ok(cnt('Křečové stavy') === 11 && cnt('Arytmie') === 11 && cnt('Dušnost') === 12 && cnt('Trauma') === 34 && cnt('Dopravní nehoda') === 34, 'počty cihliček odpovídají screenům (11, 11, 12, 34, 34)');
  ok(codes('Křečové stavy', 'n2').join() === 'KŘEČE_FEBRILNÍ,KŘEČE_NEZNÁMÉ,KŘEČE_V_GRAVIDI,PO_KŘ_NEPROBÍRÁ,OPAK_KŘEČ_STAV' && codes('Křečové stavy', 'n2di').join() === 'KŘEČE_EPILEPTIK' && codes('Křečové stavy', 'n3').join() === 'AVPU-A,AVPU-V,PO_KŘ_PROBÍRÁ,PO_KŘ_EPILEPTI,TETANIE', 'Křečové stavy: modré, růžová a zelené jako na screenu');
  ok(codes('Dušnost', 'n1').join() === 'DUŠ_POUZE_SLOVO,DUŠ_NEMŮŽ_MLUVI,SpO2_<74%' && codes('Dušnost', 'n2di').join() === 'DUŠ_UDRŽÍ_KONVE,SpO2_82-93%,DUŠ_VOL_3.RUKA', 'Dušnost: červené a růžové jako na screenu');
  ok(it.chipsFor('Dušnost').gray.join() === 'ASPIRACE,ASTMATIK,DIABETIK,HYPERTONIK,CHOPN,KARDIAK,DDOT' && it.chipsFor('Arytmie').gray.join() === 'HYPERTONIK,KARDIAK', 'šedé cihly Dušnosti a Arytmie přesně podle screenu');
  ok(codes('Arytmie', 'n1').join() === 'AS_<_30_MIN,AS_>_200_MIN,ICD_VÝBOJ_OPAK' && codes('Arytmie', 'n3').join() === 'AS_NEPRAV_VNÍMA,BEZ_ZÁVAŽ_PŘÍZN,PALPIT_NEZÁVAŽN', 'Arytmie: červené a zelené jako na screenu');
  ok(codes('Trauma', 'n2di').join() === 'AVPU-P,POÚRAZ_ZMATENOS,ZÁVA_KRV_Z_KONČ' && codes('Dopravní nehoda', 'n2di').join() === 'AVPU-P,POÚRAZ_ZMATENOS,ROTACE_PŘES_STŘ,ZÁVA_KRV_Z_KONČ', 'Trauma a Dopravní nehoda: růžové jako na screenech');
  ok(it.chipsFor('Trauma').groups.every(g => g.chips.every(c => c.t && c.t.length > 3)), 'každá cihla má plné znění z excelu pro popisek pod myší');
}
console.log(fail ? 'SELHALO: ' + fail : 'cihly test OK'); process.exit(fail ? 1 : 0);
