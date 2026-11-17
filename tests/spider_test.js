// Test pavouka (calltaker/spider.js): z každé pozorované kombinace jde klikáním dojít na výsledek se správnou indikací.
const path = require('path'), R = path.join(__dirname, '..');
const D = require(path.join(R, 'src/data.js')), SYM = require(path.join(R, 'src/symptoms.json')), S = require(path.join(R, 'calltaker/spider.js'));
const sp = S.create({ symptoms: SYM, indications: D.indications || D.ZOS_DATA.indications });
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };
const cat = SYM.symptomCatalog, strip = S.strip;
const klas = sp.klasifikace();
ok(klas.length >= 28, 'pavouk zná ' + klas.length + ' klasifikací');
const first = sp.page([]);
ok(first.step === 'indikace' && first.tiles.length === klas.length && first.tiles[0].weight >= first.tiles[first.tiles.length - 1].weight, 'první stránka: indikace seřazené podle četnosti');
// procházení: klik podle pozorované kombinace
const walk = (klasif, names, set) => {
  const ans = [klasif]; let guard = 0, maxTiles = 0, pages = 1;
  const cl = nm => { const l = strip(nm).toLocaleLowerCase('cs-CZ'); return { 'při vědomí': ['vedomi', 'A'], 'reaguje na oslovení': ['vedomi', 'V'], 'reaguje na bolest': ['vedomi', 'P'], 'bezvědomí': ['vedomi', 'U'], 'dýchá': ['dychani', 'dýchá'], 'nedýchá': ['dychani', 'nedýchá'], 'gasping': ['dychani', 'Gasping'], 'dospělý': ['vek', 'Dospělý'], 'dítě': ['vek', 'Dítě'] }[l] || null; };
  const base = {}; for (const nm of names) { const c = cl(nm); if (c && !base[c[0]]) base[c[0]] = c[1]; }
  while (guard++ < 40) {
    const p = sp.page(ans); if (p.step === 'vysledek') break;
    if (p.tiles.length > 12) return { err: 'stránka ' + p.step + ' má ' + p.tiles.length + ' dlaždic' };
    maxTiles = Math.max(maxTiles, p.tiles.length); pages++;
    if (p.step === 'vedomi' || p.step === 'dychani' || p.step === 'vek') { const t = p.tiles.find(x => x.id === base[p.step]); ans.push(t ? t.id : '__skip'); }
    else if (p.step === 'upresneni') { const t = p.tiles.find(x => set.has(x.id)); ans.push(t ? t.id : '__none'); }
    else return { err: 'neočekávaný krok ' + p.step };
  }
  if (guard >= 40) return { err: 'nekonečné procházení' };
  return { ans, res: sp.result(ans), pages };
};
let total = 0, okK = 0, okN = 0, wTot = 0, wN = 0, err = 0, errMsg = '', maxP = 0;
for (const key of Object.keys(SYM.symptomProfiles)) {
  const inds = (D.indications || D.ZOS_DATA.indications).filter(i => (i.symptomKey || i.klasif) === key);
  if (!inds.length) continue; const klasif = inds[0].klasif;
  for (const n of [1, 2, 3]) for (const [ids, cnt] of (SYM.symptomProfiles[key]['N' + n] || [])) {
    const names = ids.map(i => cat[i]), w = walk(klasif, names, new Set(names)); total++;
    if (w.err) { err++; errMsg = errMsg || klasif + ': ' + w.err; continue; }
    maxP = Math.max(maxP, w.pages);
    if (w.res.klasif === klasif) okK++;
    wTot += cnt; if (w.res.n === n) { okN++; wN += cnt; }
  }
}
ok(err === 0, 'všechny pozorované kombinace (' + total + ') dojdou na výsledek' + (errMsg ? ' – ' + errMsg : '') + ', nejvíc ' + maxP + ' stránek');
ok(okK === total - err, 'výsledek má správnou indikaci (' + okK + '/' + total + ')');
ok(wN / wTot > 0.6, 'navržené N se shoduje s pozorovaným u ' + (wN / wTot * 100).toFixed(1) + ' % případů (vážené četností)');
// nedýchá + bezvědomí = N1 bez dynamiky
{ const r = sp.result(['Porucha vědomí', 'U', 'nedýchá']); ok(r && r.n === 1 && !r.dyn && r.confidence === 1 && r.apneic, 'bezvědomí + nedýchá vede na N1 bez dynamiky'); }
// rozložení N sedí na součet, výsledek obsahuje příznaky
{ const w = walk('Bolest', ['Dospělý', '*AVPU-A', 'při vědomí'], new Set()); const r = w.res; ok(Math.abs(r.nDist[1] + r.nDist[2] + r.nDist[3] - 1) < 1e-9 && r.symptoms.length > 0 && r.confidence > 0.3, 'výsledek: rozložení N sečte 1, příznaky (' + r.symptoms.slice(0, 3).map(strip).join(', ') + ')'); }
// determinismus
ok(JSON.stringify(sp.page(['Dušnost', 'A'])) === JSON.stringify(sp.page(['Dušnost', 'A'])) && JSON.stringify(sp.result(['Dušnost', 'A'])) === JSON.stringify(sp.result(['Dušnost', 'A'])), 'pavouk je deterministický');
// zpětný krok = kratší seznam odpovědí dává předchozí stránku
ok(sp.page(['Dušnost']).canBack && sp.page([]).canBack === false, 'zpět je dostupné až po první odpovědi');
console.log(fail ? 'SELHALO: ' + fail : 'spider test OK'); process.exit(fail ? 1 : 0);
