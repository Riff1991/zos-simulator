// Ověření polohy v hovoru calltakera: pravidlový „volající“ odpovídá na volné české otázky jen z faktů hovoru, „hráč“ z odpovědí hledá místo na herní mapě
// (adresní body, POI, silniční síť; AML vidí jako kruh) a výsledek se porovná s pravdou. Neověřuje jazykový model, jen to, že fakta, která model dostane,
// vedou k nalezení místa více cestami, nic nevkládají otázkou a drží se mapových dat. `node tests/calltaker_lokace_test.js --ukaz` vypíše ukázkové rozhovory.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
global.ZOS_DATA = require(path.join(R, 'src/data.js')); global.ZOS_PEOPLE = require(path.join(R, 'src/people.js')); global.ZOS_SYMPTOMS = require(path.join(R, 'src/symptoms.json'));
global.ROUTER = require(path.join(R, 'src/router.js')); { const b = fs.readFileSync(path.join(R, 'site/graph.wasm')); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
const J = f => JSON.parse(fs.readFileSync(path.join(R, 'site', f), 'utf8'));
global.ZOS_POI = J('poi.json'); global.ZOS_RAIL = J('rail.json'); global.ZOS_ADDR = J('addr.json');
const { Sim } = require(path.join(R, 'src/engine.js')), LK = require(path.join(R, 'calltaker/lokace.js')), O = require(path.join(R, 'calltaker/okoli.js'));
const UKAZ = process.argv.includes('--ukaz');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };
const sim = new Sim({ seed: 5, mode: 'free' });
const nrm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---- pravidlový volající: volná česká otázka → téma; odpověď jen z faktů; co v nich není, „neví“; otázka nic nevkládá ----
const TEMATA = [
  [/(odkud|kde)\s+(teď\s+)?(telefonujete|voláte)|odkud to voláte|jste (u něj|u pacienta|doma)/, 'kde_volajici'],
  [/číslo (domu|popisné)|jaké číslo|podívejte se na dům|číslo na domě/, 'cislo_domu'],
  [/patro|v kterém patře/, 'patro'],
  [/ulic|cedul/, 'ulice'],
  [/adres/, 'adresa'],
  [/jak se (ten |to )?(podnik|obchod|místo)?\s*jmenuje|název|co je to za|co tam píšou/, 'nazev'],
  [/poslední obec|jakou obcí|kterou obcí|jakou obec|projel/, 'posledni_obec'],
  [/odboč/, 'odbocka'],
  [/směr|kam jedete|odkud jedete|odkud jste jel/, 'smer'],
  [/mapu|mapě|v mobilu|modrá tečka/, 'mapa'],
  [/odkud jste vyšli|odkud jste šli|výchoz/, 'vychozi'],
  [/jak dlouho|kolik času|jak daleko/, 'cas'],
  [/z cesty|na cestě/, 'cesta'],
  [/kde (přesně )?(leží|je) (ten )?(pacient|pán|člověk|paní)|kde vůči/, 'kde_pacient'],
  [/vidíte kolem|poblíž|v okolí|orientační/, 'okoli'],
  [/co máte před sebou|kam to vede dál|dál po silnici/, 'dal'],
  [/kde (přesně )?(teď )?jste|kde se to stalo|v jaké obci/, 'misto'],
];
function volajici(L, otazka, pamet) {
  const q = String(otazka).toLowerCase().replace(/\?/g, '');
  const znama = L.zacatek.concat(L.dotaz).map(i => nrm(i.fakt)).join(' | ');
  const jm = (otazka.match(/(?:Lidl|Albert|Coop|Penny|Billa|Tesco|[A-ZÁ-Ž][a-zá-ž]{3,}(?:\s[A-ZÁ-Ž][a-zá-ž]+)?)/g) || []).filter(w => !/^(Kde|Jak|Jaká|Jaký|Jste|Není|Podívejte|Máte|Co|Kterým|Kterou|Odkud|Zůstali|Jsou|Otevřete|Jakou|Kolik|Řekněte|Můžete|Voláte|Jedete|Vidíte|Půjdete|Je|Ten)$/.test(w));
  const vlozeno = jm.filter(w => !znama.includes(nrm(w)));   // název, který volající ve svých faktech nemá, mu otázka nesmí vložit do paměti
  if (vlozeno.length && /(?:není|jste u|jste v|myslíte|u obce|u .*\?|vedle vás|pobočk)/i.test(otazka)) return { tema: 'probe', stav: 'neni', odpoved: 'to tu není / nevidím / nevím (' + vlozeno.join(', ') + ' nepotvrzeno)' };
  for (const [re, tema] of TEMATA) if (re.test(q)) { const z = LK.zjisti(L, tema); if (z.stav === 'nevi') return { tema, stav: 'nevi', odpoved: 'nevím' }; pamet.add(tema); const it = L.zacatek.concat(L.dotaz).find(i => i.tema === tema); return { tema, stav: z.stav, odpoved: z.fakt + (z.zpusob ? '  [' + z.zpusob + ']' : ''), data: it && it.data }; }
  return { tema: null, stav: 'nevi', odpoved: 'nevím, na co se ptáte' };
}

// ---- hráč: z toho, co zjistil, najde bod na mapě (adresní body, POI, silnice); vrací { druh, lat, lon, popis } ----
function obecBlizko(jmeno, aml) { const e = O.obceBlizko(aml.lat, aml.lon, aml.hledej || 60, 1).filter(x => x.n === jmeno); return e[0] || null; }
function posun(la, lo, km, smer) { const b = { severně: 0, severovýchodně: 45, východně: 90, jihovýchodně: 135, jižně: 180, jihozápadně: 225, západně: 270, severozápadně: 315 }[smer]; if (b == null) return null; const r = b * Math.PI / 180; return { lat: la + km * Math.cos(r) / 111.32, lon: lo + km * Math.sin(r) / (111.32 * Math.cos(la * Math.PI / 180)) }; }
const zadej = a => { const m = /^(.+?) čp\. (.+)$/.exec(a); return !a.includes(',') && m ? 'čp. ' + m[2] + ', ' + m[1] : a; };
const geo = (text, near) => { const t = zadej(text); if (near) { const g = sim._ctGeocode(t, near); if (g.quality === 'exact') return g; } const g2 = sim._ctGeocode(t); return g2.quality === 'exact' ? g2 : null; };   // jako hráč: zkusí s kruhem AML a bez něj (volající může být jinde než pacient)
const najdiPodle = (uc, typ) => uc.find(u => u.data && u.data.typ === typ);
function najdi(uc, aml) {
  const obec = (uc.map(u => u.data && u.data.obec).filter(Boolean).pop()) || null, near = aml.r != null ? { lat: aml.lat, lon: aml.lon } : undefined;   // kruh AML hráč vidí na mapě
  const ap = najdiPodle(uc, 'adresaPoi'), po = najdiPodle(uc, 'poi'), ad = najdiPodle(uc, 'adresa'), ul = najdiPodle(uc, 'ulice'), ci = najdiPodle(uc, 'cislo'), tr = uc.filter(u => u.data && u.data.typ === 'trasa').pop(), ob = najdiPodle(uc, 'obec');
  const nazev = (uc.map(u => u.data && u.data.nazev).filter(Boolean).pop()) || (po && po.data.nazev) || null;
  if (nazev && obec) { let c = O.poiPodleJmena(nazev).filter(e => nrm(e.obec) === nrm(obec)); if (c.length > 1 && ap) c = c.filter(e => nrm(e.adr) === nrm(ap.data.hodnota)); if (c.length === 1) return { druh: 'bod', lat: c[0].la, lon: c[0].lo, popis: 'POI „' + nazev + '“ v ' + obec }; if (c.length > 1) return { druh: 'nejednoznacne', n: c.length, popis: c.length + '× „' + nazev + '“ v ' + obec + ', chybí rozlišení (ulice)' }; }
  if (ad && ad.data.hodnota) { const g = geo(ad.data.hodnota, near); if (g) return { druh: 'bod', lat: g.lat, lon: g.lon, popis: 'adresa ' + ad.data.hodnota }; }
  if (ul && ci && obec) { const g = geo((ul.data.hodnota || '') + ' ' + ci.data.hodnota + ', ' + obec, near); if (g) return { druh: 'bod', lat: g.lat, lon: g.lon, popis: 'ulice + číslo + obec' }; }
  if (ap) { const g = geo(ap.data.hodnota, near); if (g) return { druh: 'bod', lat: g.lat, lon: g.lon, popis: 'adresa podniku ' + ap.data.hodnota }; }
  if (tr && tr.data.posledniObec && tr.data.kam && tr.data.vzdalenostM != null) { const a = obecBlizko(tr.data.posledniObec, aml), b = obecBlizko(tr.data.kam, aml); if (a && b) { const r = ROUTER.route(a.la, a.lo, b.la, b.lo); if (r) { let cum = 0, p = [r.pts[0], r.pts[1]]; for (let i = 2; i < r.pts.length; i += 2) { const s = O.hav(r.pts[i - 2], r.pts[i - 1], r.pts[i], r.pts[i + 1]) * 1000; if (cum + s >= tr.data.vzdalenostM) { const t = (tr.data.vzdalenostM - cum) / (s || 1); p = [r.pts[i - 2] + (r.pts[i] - r.pts[i - 2]) * t, r.pts[i - 1] + (r.pts[i + 1] - r.pts[i - 1]) * t]; break; } cum += s; p = [r.pts[i], r.pts[i + 1]]; } return { druh: 'bod', lat: p[0], lon: p[1], popis: 'trasa ' + tr.data.posledniObec + ' → ' + tr.data.kam + ' po ' + tr.data.vzdalenostM + ' m' }; } } }
  if (ob && ob.data.km != null && ob.data.smer) { const e = obecBlizko(ob.data.hodnota, aml); const p = e && posun(e.la, e.lo, ob.data.km, ob.data.smer); if (p) return { druh: 'bod', lat: p.lat, lon: p.lon, popis: 'obec ' + ob.data.hodnota + ' + ' + ob.data.km + ' km ' + ob.data.smer }; }
  const vy = uc.map(u => u.data && u.data.vychozi).filter(Boolean).pop(), o2 = obec || (ob && ob.data.hodnota) || (tr && tr.data.posledniObec) || vy;
  if (o2) { let e = obecBlizko(o2, aml); if (!e && vy) { const p = O.poiPodleJmena(vy).map(x => ({ la: x.la, lo: x.lo, d: O.hav(aml.lat, aml.lon, x.la, x.lo) })).sort((x, y) => x.d - y.d)[0]; if (p && p.d < aml.hledej) e = p; } if (e) return { druh: 'usek', lat: e.la, lon: e.lo, popis: 'jen okolí „' + o2 + '“ (úsek, ne bod)' }; }
  return { druh: 'nic', popis: 'nic použitelného' };
}
const amlBod = f => { const p = f.aml.phases[f.aml.phases.length - 1]; return p ? { lat: p.lat, lon: p.lon, r: p.radiusM, hledej: 60 } : f.aml.abonent ? { lat: f.aml.abonent.lat, lon: f.aml.abonent.lon, r: 0, hledej: 60 } : { lat: 49.0, lon: 14.5, r: null, hledej: 140 }; };   // co hráč na mapě vidí (kruh AML, adresa účastníka pevné linky), nikdy pravda
const SKRIPT = {
  adresa: { A: ['Kde přesně jste?', 'Jaká je tam adresa?'], B: ['Kde přesně jste?', 'Podívejte se na číslo domu.', 'A jak se jmenuje ta ulice?'] },
  navsteva: { A: ['Kde přesně jste?', 'Jaká je tam adresa?'], B: ['Kde přesně jste?', 'Jaká je tam ulice?', 'A jaké číslo domu?'] },
  jinde: { A: ['Odkud voláte?', 'Jaká je adresa pacienta?'], B: ['Kde přesně je pacient?', 'Jaká je tam ulice?', 'A číslo domu?'] },
  podnik: { A: ['Kde přesně jste?', 'Jak se to místo jmenuje?', 'Na jaké ulici to je?'], B: ['Kde přesně jste?', 'Jaká je tam adresa, přečtěte to z cedule.'] },
  silnice: { A: ['Kde přesně jste?', 'Kterým směrem jedete?', 'Kterou obcí jste naposledy projel?'], B: ['Kde přesně jste?', 'Otevřete mapu v mobilu, co vám ukazuje?', 'Co tam vidíte kolem?'] },
  teren: { A: ['Kde přesně jste?', 'Odkud jste vyšli?', 'Jak dlouho už jdete?'], B: ['Kde přesně jste?', 'Otevřete mapu v mobilu, co vám ukazuje?', 'Zůstali jste na cestě?'] },
};
function rozhovor(f, skript) {
  const pamet = new Set(), uc = [], radky = []; const L = f.view.lokace;
  for (const z of L.zacatek) uc.push({ tema: z.tema, data: z.data });   // co řekne sám na začátku
  for (const q of skript) { const a = volajici(L, q, pamet); radky.push({ q, a }); if (a.stav === 'dotaz' || a.stav === 'hned') uc.push({ tema: a.tema, data: a.data }); }
  const nalez = najdi(uc, amlBod(f)), chyba = nalez.lat != null ? Math.round(O.hav(nalez.lat, nalez.lon, f.tc.lat, f.tc.lon) * 1000) : null;
  return { radky, nalez, chyba };
}
const verdikt = (n, chyba, tol) => (n.druh === 'bod' ? (chyba <= tol ? 'NAJDE SE' : chyba <= tol * 3 ? 'BLÍZKO (hledání)' : 'MIMO') : n.druh === 'usek' ? 'JEN ÚSEK' : n.druh === 'nejednoznacne' ? 'NEJEDNOZNAČNÉ' : 'NIC');
const TOL = { adresa: 60, navsteva: 60, jinde: 60, podnik: 120, silnice: 200, teren: 1000 };

// ---- sběr případů podle scénáře ----
const by = {}; for (let sd = 1; sd <= 9000; sd++) { const f = sim.callFacts(sd); const s = f.view.lokace && f.view.lokace.scenar; if (!SKRIPT[s]) continue; (by[s] = by[s] || []).push(Object.assign(f, { seed: sd })); if (Object.keys(SKRIPT).every(k => (by[k] || []).length >= 30)) break; }
const vys = {};
for (const s of Object.keys(SKRIPT)) {
  const arr = (by[s] || []).slice(0, 40), st = { A: {}, B: {}, nejlepsi: {}, n: arr.length, ch: { A: [], B: [] } };
  let ukazano = false;
  for (const f of arr) {
    const res = {}; for (const cesta of ['A', 'B']) { const r = rozhovor(f, SKRIPT[s][cesta]), v = verdikt(r.nalez, r.chyba, TOL[s]); st[cesta][v] = (st[cesta][v] || 0) + 1; if (r.chyba != null) st.ch[cesta].push(r.chyba); res[cesta] = { r, v }; }
    const poradi = ['NAJDE SE', 'BLÍZKO (hledání)', 'JEN ÚSEK', 'NEJEDNOZNAČNÉ', 'MIMO', 'NIC'], best = [res.A.v, res.B.v].sort((a, b) => poradi.indexOf(a) - poradi.indexOf(b))[0]; st.nejlepsi[best] = (st.nejlepsi[best] || 0) + 1;
    if (UKAZ && !ukazano && res.A.v !== 'NIC' && res.B.v !== 'NIC') { ukazano = true; console.log('\n===== ' + s.toUpperCase() + ' (seed ' + f.seed + ', ' + f.view.volajici.vztah + ', pravda: ' + f.tc.addr + ') =====');
      console.log('AML (co vidí hráč): kruh ' + amlBod(f).r + ' m' + (f.view.lokace.scenar === 'jinde' ? ', střed je u TELEFONU VOLAJÍCÍHO, ' + Math.round(O.hav(amlBod(f).lat, amlBod(f).lon, f.tc.lat, f.tc.lon) * 1000) + ' m od pacienta' : ''));
      console.log('Volající sám začne: ' + f.view.lokace.zacatek.map(z => z.fakt).join('; '));
      for (const cesta of ['A', 'B']) { console.log('\n  -- cesta ' + cesta + ' --'); for (const { q, a } of res[cesta].r.radky) console.log('  Hráč: ' + q + '\n  Volající [' + a.stav + ']: ' + a.odpoved); console.log('  => hráč najde: ' + res[cesta].r.nalez.popis + (res[cesta].r.chyba != null ? ', chyba ' + res[cesta].r.chyba + ' m' : '') + ' → ' + res[cesta].v); } }
  }
  vys[s] = st;
}
console.log('\nSOUHRN (40 případů na scénář; tolerance: dům 60 m, podnik 120 m, silnice 200 m, terén 1000 m; „BLÍZKO“ do trojnásobku):');
for (const s of Object.keys(vys)) { const st = vys[s], med = a => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null); console.log(' ', s.padEnd(9), 'n=' + st.n, '| cesta A', JSON.stringify(st.A), 'medián chyby ' + med(st.ch.A) + ' m', '| cesta B', JSON.stringify(st.B), 'medián ' + med(st.ch.B) + ' m', '| aspoň jednou:', JSON.stringify(st.nejlepsi)); }
const share = (s, ...v) => { const st = vys[s]; return st ? v.reduce((a, k) => a + (st.nejlepsi[k] || 0), 0) / st.n : 0; };
ok(Object.keys(SKRIPT).every(k => (vys[k] || { n: 0 }).n >= 8), 'všechny scénáře polohy se vyskytují (adresa, návštěva, odjinud, podnik, silnice, terén)');
for (const s of ['adresa', 'navsteva', 'jinde']) ok(share(s, 'NAJDE SE') >= 0.9, 'scénář ' + s + ': místo se najde na mapě aspoň jednou cestou (' + (share(s, 'NAJDE SE') * 100).toFixed(0) + ' %)');
ok(share('podnik', 'NAJDE SE', 'BLÍZKO (hledání)') >= 0.7, 'scénář podnik: místo se najde nebo je blízko (' + (share('podnik', 'NAJDE SE', 'BLÍZKO (hledání)') * 100).toFixed(0) + ' %), zbytek je poctivě „nejednoznačné“ u stejnojmenných poboček');
ok((vys.podnik.A.MIMO || 0) <= vys.podnik.n * 0.075 && (vys.podnik.B.MIMO || 0) <= vys.podnik.n * 0.075, 'podnik: špatný bod bez varování nejvýš ve 7,5 % (stejná ulice v jiné části obce)');
ok(share('silnice', 'NAJDE SE', 'BLÍZKO (hledání)', 'JEN ÚSEK') >= 0.9 && (vys.silnice.A.MIMO || 0) + (vys.silnice.B.MIMO || 0) <= vys.silnice.n * 0.25, 'silnice: aspoň úsek vždy, špatný bod (MIMO) jen výjimečně');
ok(share('teren', 'NAJDE SE', 'BLÍZKO (hledání)', 'JEN ÚSEK') >= 0.9, 'terén: aspoň úsek vždy (bez značek a rozcestníků se nic víc nevymýšlí)');

// ---- pasti: otázka nesmí vložit obchod, obec ani pobočku do paměti volajícího ----
{ let n = 0, bad = 0;
  for (const s of Object.keys(by)) for (const f of by[s].slice(0, 15)) {
    const L = f.view.lokace; n++;
    for (const q of ['Není tam vedle vás Lidl?', 'Jste u obce Bohušovice?', 'Myslíte tu pobočku na Husově ulici?']) { const a = volajici(L, q, new Set()); if (a.stav !== 'neni') bad++; }
  }
  ok(n > 50 && bad === 0, 'pasti (Lidl, špatná obec, špatná pobočka) volající nepotvrdí ani nepřevezme (' + n + ' hovorů × 3 otázky)'); }

// ---- telefon jinde než pacient: AML patří telefonu volajícího, pravda pro posádku je u pacienta ----
{ const arr = by.jinde || []; let kol = 0, daleko = 0;
  for (const f of arr) { if (f.aml.typ === 'skryté') continue; const a = amlBod(f), dP = O.hav(a.lat, a.lon, f.tc.lat, f.tc.lon) * 1000, dV = O.hav(a.lat, a.lon, f.key.lokace.volajici.lat, f.key.lokace.volajici.lon) * 1000; kol++; if (dP > 1500 && dV <= (a.r || 0) * 1.05 + 1) daleko++; }
  ok(kol >= 8 && daleko >= kol * 0.95, 'AML (mobil) a adresa účastníka (pevná linka) odjinud volajícího leží u jeho telefonu, ne u pacienta (' + daleko + '/' + kol + ')');
  ok(arr.every(f => f.key.lokace.pacient.lat === f.tc.lat && f.view.lokace.volajici.stejneMisto === false), 'pravda pro posádku zůstává u pacienta, volající je označen jako jinde');
  ok(arr.every(f => !/\bdýchá\b/.test(f.view.lokace.volajici.kde)), 'volající odjinud nepopisuje stav, který nevidí'); }

// ---- pamatuje si, co zjistil: opakovaný hovor a zpětné volání téhož člověka ----
{ let n = 0, bad = 0;
  for (const s of ['adresa', 'podnik', 'silnice', 'teren']) for (const f of (by[s] || []).slice(0, 12)) {
    const g = sim.callFacts(f.seed, { kind: 'opak', nova: 'bolest se zhoršila' }), cb = sim.callFacts(f.seed, { kind: 'vyjezd', cb: true }), L0 = f.view.lokace, L1 = g.view.lokace, L2 = cb.view.lokace; n++;
    const all0 = new Set(L0.zacatek.concat(L0.dotaz).map(i => i.tema)), all1 = new Set(L1.zacatek.map(i => i.tema)), all2 = new Set(L2.zacatek.map(i => i.tema));
    if (L1.dotaz.length || L2.dotaz.length || ![...all0].every(t => all1.has(t) && all2.has(t))) bad++;
  }
  ok(n > 30 && bad === 0, 'při opakovaném hovoru a zpětném volání už volající ví, co zjistil (' + n + ' případů)'); }
// ---- druhý svědek: vidí zdálky, pacient je od něj v odstupu ----
{ let n = 0, bad = 0;
  for (const s of ['silnice', 'adresa']) for (const f of (by[s] || []).slice(0, 12)) { const g = sim.callFacts(f.seed, { kind: 'dup' }), L = g.view.lokace; n++; if (!L || L.scenar !== 'dup' || L.volajici.stejneMisto || !L.dotaz.some(d => d.tema === 'kde_pacient') || g.key.lokace.volajici.lat === g.tc.lat) bad++; }
  ok(n > 10 && bad === 0, 'druhý svědek je jinde než pacient a ví o odstupu (' + n + ' případů)'); }
console.log(fail ? 'SELHALO: ' + fail : 'VŠE V POŘÁDKU');
process.exit(fail ? 1 : 0);
