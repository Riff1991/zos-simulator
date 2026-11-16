// ZOS simulátor – simulační jádro. Veškerý stav je prostý JSON (this.s), lze ukládat a obnovit.
// Vyžaduje globální ZOS_DATA (data.js).

const R_EARTH = 6371;
function hav(a, b, c, d) {
  const p = Math.PI / 180, dLa = (c - a) * p, dLo = (d - b) * p;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLo / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}
function roadKm(a, b, c, d) { return hav(a, b, c, d) * 1.32; }
function speedFor(km) { return km < 5 ? 32 : km < 15 ? 46 : km < 40 ? 56 : 64; }
function travelSec(a, b, c, d, mult) {
  const km = roadKm(a, b, c, d);
  return Math.max(25, km / speedFor(km) * 3600 * (mult || 1));
}
function heliSec(a, b, c, d) { return hav(a, b, c, d) / ((ZOS_DATA.lzs && ZOS_DATA.lzs.speedKmh) || 215) * 3600; }
// občanský úsvit a soumrak (slunce 6° pod obzorem) pro datum a polohu; vrací místní čas (Praha) v hodinách
function civilTwilight(dateISO, lat, lon) {
  const [Y, M, D] = dateISO.split('-').map(Number), r = Math.PI / 180;
  const jd = Date.UTC(Y, M - 1, D, 12) / 86400000 + 2440587.5;
  const n = Math.ceil(jd - 2451545.0 + 0.0008), js = n - lon / 360;
  const Mm = (357.5291 + 0.98560028 * js) % 360, C = 1.9148 * Math.sin(Mm * r) + 0.02 * Math.sin(2 * Mm * r) + 0.0003 * Math.sin(3 * Mm * r);
  const lam = (Mm + C + 180 + 102.9372) % 360, jt = 2451545.0 + js + 0.0053 * Math.sin(Mm * r) - 0.0069 * Math.sin(2 * lam * r);
  const sd = Math.sin(lam * r) * Math.sin(23.4397 * r), cd = Math.cos(Math.asin(sd));
  const co = (Math.sin(-6 * r) - Math.sin(lat * r) * sd) / (Math.cos(lat * r) * cd), w = Math.acos(Math.max(-1, Math.min(1, co))) / r;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const loc = j => { const p = fmt.formatToParts(new Date((j - 2440587.5) * 86400000)); return Number(p.find(x => x.type === 'hour').value) + Number(p.find(x => x.type === 'minute').value) / 60; };
  return { dawn: loc(jt - w / 360), dusk: loc(jt + w / 360) };
}
// Jízda k události s výstražnými zařízeními je rychlejší než běžný provoz (faktor času jízdy).
// Doba jízdy podle režimu (směrnice Primární zásah pozemních prostředků + úprava pravidel jízdy s VRZ).
// Router počítá po třídách silnic rychlostmi N2/N3 (limit + 30: dálnice 150, mimo obec 120, na horších silnicích méně).
// Režimy jsou [pevná část v s (rozjezd, průjezd obcí, hledání adresy), násobek času trasy]. N1 bez limitu je o pár % rychlejší;
// N4 a návrat bez VRZ v běžných limitech jsou pomalejší. N1–N3 kalibrováno na říjnovém vzorku výjezdů
// (čas výjezd → příjezd proti trase ze základny): N1 113 s + 0,94×, N2 138 s + 0,97×, N3 193 s + 0,89× (bez nejdelších tras ~1,0×).
// Pevná část (hledání adresy, průjezd obcí) se nepřičítá k jízdě: vozidlo jede po trase rychlostí routeru × násobek a pevnou část „stojí“ u cíle (mv.dw).
// N3 pevná část 60 s: kalibrováno na reálných případech (N3 krátké trasy byly dřív o 3–4 min pomalejší).
// jízdní režimy: k případu (N1–N3) a transport (P2/P3) vždy na majáky (VRZ), rychlost podle naléhavosti; RET = návrat bez majáků, RETL = návrat v „režimu N3“ na majáky na pokyn dispečera
const DRIVE = { N1: [100, 0.92], N2: [125, 0.97], N3: [60, 1.05], N4: [60, 1.3], P2: [50, 0.97], P3: [50, 1.05], RET: [30, 1.35], RETL: [30, 1.02] };
const LIGHT_MODES = ['N1', 'N2', 'N3', 'P2', 'P3', 'RETL'];
function driveSec(base, mode) { const m = DRIVE[mode] || DRIVE.N3; return m[0] * Math.min(1, base / 150) + base * m[1]; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
// Pracovní denní rytmus: ranní špička, klidnější poledne, menší odpolední vlna.
// Hodinový profil upraven podle výzev v říjnovém vzorku; součet denní/noční
// části zůstává zachovaný, takže se nemění celková obtížnost ani počet případů.
const TOD = [0.551,0.479,0.455,0.335,0.431,0.503,0.623,1.078,1.509,1.533,1.653,1.341,1.269,1.269,1.317,1.293,1.246,1.365,1.198,1.15,1.078,0.838,0.79,0.695]; // hodinový profil z říjnového vzorku (průměr = 1)   // dřívější profil (index, průměr 1), hra používá EV_HOUR
// Události (první posádka u události, primární výjezdy) za hodinu v průměrný den daného typu: reálná data ZZS JčK, leden 2026 (zima) a červenec 2026 (léto),
// zvlášť pracovní den (wd) a víkend (we): ranní špička 7–10 h je v pracovní den výrazně vyšší (23 procent proti 19 procentům denního objemu). Mezi zimou a létem se prolíná (viz _gap).
// Podle oblasti se tvar profilu neliší (České Budějovice jako ostatní), proto jeden profil pro celý kraj. Součet za den: zima ~197, léto ~223 událostí.
const EV_HOUR = { winter: { wd: [5.7, 4.19, 3.05, 2.37, 3.37, 4.88, 5.15, 8.94, 13.54, 13.68, 13.54, 12.17, 11.58, 9.94, 10.53, 10.58, 9.39, 10.67, 9.39, 9.12, 7.57, 7.34, 6.02, 5.74], we: [5.26, 3.84, 5.04, 4.17, 3.73, 4.06, 3.51, 7.02, 8.66, 12.61, 11.73, 11.62, 11.73, 9.43, 11.19, 9.43, 12.83, 9.87, 8.66, 9.76, 8.44, 6.91, 7.68, 5.7] }, summer: { wd: [5.06, 4.27, 3.36, 2.36, 3.53, 4.06, 6.02, 9.9, 12.34, 12.95, 13.26, 13.7, 12.52, 11.25, 11.12, 11.43, 10.77, 11.78, 13.04, 11.91, 11.38, 9.29, 8.9, 6.11], we: [8.29, 5.08, 6.19, 3.59, 4.33, 3.59, 6.93, 6.07, 10.15, 11.89, 12.01, 12.38, 11.14, 12.63, 12.26, 14.11, 13.74, 11.76, 11.39, 11.89, 12.26, 11.76, 10.15, 6.81] } };
const EXTMSG = typeof ZOS_EXTMSG !== 'undefined' ? ZOS_EXTMSG : require('./messages.js');
const WX = typeof ZOS_WX !== 'undefined' ? ZOS_WX : require('./weather.js');
const BUSY = ['call', 'enroute', 'onscene', 'transport', 'handover'];
const DEPT = { okresni: 'Urgentní příjem', iktove: 'Iktové centrum', trauma: 'Traumacentrum', pci: 'Kardiocentrum – katetrizační sál', psych: 'Psychiatrické oddělení', popaleniny: 'Popáleninové centrum' };
const DEPTN = { up: 'Urgentní příjem', chir: 'Chirurgická ambulance', ikt: 'Iktové centrum', kcc: 'KCC – komplexní cerebrovaskulární centrum', aro: 'ARO', det: 'Dětské oddělení', gyn: 'Gynekologicko-porodnické oddělení', orl: 'ORL', trauma: 'Traumacentrum', pci: 'Kardiocentrum – katetrizační sál', psy: 'Psychiatrické oddělení' };
// doba u ZZ (příjezd → odjezd od zařízení) podle říjnového vzorku: kvantily 0/10/25/50/75/90/100 %
// pracoviště ve 4. pádě pro hlášení „jedeme do Tábora na chirurgickou ambulanci“
const DEPT_ACC = { 'Urgentní příjem': 'na urgentní příjem', 'Chirurgická ambulance': 'na chirurgickou ambulanci', 'Iktové centrum': 'na iktové centrum', 'KCC – komplexní cerebrovaskulární centrum': 'na KCC', 'ARO': 'na ARO', 'Dětské oddělení': 'na dětské oddělení', 'Gynekologicko-porodnické oddělení': 'na gynekologicko-porodnické oddělení', 'ORL': 'na ORL', 'Traumacentrum': 'na traumacentrum', 'Kardiocentrum – katetrizační sál': 'na kardiocentrum', 'Psychiatrické oddělení': 'na psychiatrii', 'Popáleninové centrum': 'na popáleninové centrum' };
// velký kruhový objezd v ČB (Okružní × silnice č. 3, u průmyslové zóny) – posádky jedoucí přes něj se ohlásí znovu
const KRUHAC = { lat: 48.9987, lon: 14.4958 };
const HO_Q = [[0, 240], [0.1, 304], [0.25, 430], [0.5, 605], [0.75, 891], [0.9, 1333], [1, 1900]];
const FIRST = ['Jan', 'Petr', 'Pavel', 'Tomáš', 'Martin', 'Jiří', 'Karel', 'Lukáš', 'Michal', 'David', 'Marie', 'Jana', 'Eva', 'Hana', 'Anna', 'Lenka', 'Petra', 'Lucie', 'Alena', 'Zuzana'];
const LAST = ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Marek', 'Pospíšil', 'Hájek', 'Král', 'Jelínek', 'Růžička', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman'];
const MU_NB = [
  { id: 'VY', name: 'ZZS Kraje Vysočina', region: 'VY' },
  { id: 'PL', name: 'ZZS Plzeňského kraje', region: 'PL' },
  { id: 'SC', name: 'ZZS Středočeského kraje', region: 'SC' },
  { id: 'lzs-jihlava', name: 'LZS Jihlava', air: true, ids: ['lzs-jihlava'] },
  { id: 'lzs-praha', name: 'LZS Praha', air: true, ids: ['lzs-praha'] },
  { id: 'lzs-plzen', name: 'LZS Plzeň', air: true, ids: ['lzs-plzen'] },
  { id: 'lzs-linz', name: 'LZS Linz', air: true, ids: ['lzs-linz'] },
  { id: 'lzs-krems', name: 'LZS Krems', air: true, ids: ['lzs-krems'] },
  { id: 'lzs-straubing', name: 'LZS Straubing', air: true, ids: ['lzs-straubing'] },
];
const MU_HOSP = ['h-cb', 'h-ta', 'h-jh', 'h-pi', 'h-st', 'h-pt', 'h-ck'];
const MU_COL = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
// železnice (site/rail.json): úseky s kumulativní délkou pro rovnoměrný výběr bodu na trati
let RAIL_IDX = null;
function railIndex() {
  if (RAIL_IDX) return RAIL_IDX;
  const segs = []; let tot = 0;
  for (const l of (typeof ZOS_RAIL !== 'undefined' && ZOS_RAIL && ZOS_RAIL.lines) || []) for (let i = 1; i < l.length; i++) {
    const a = l[i - 1], b = l[i], len = hav(a[0] / 1e5, a[1] / 1e5, b[0] / 1e5, b[1] / 1e5);
    if (len > 0) { tot += len; segs.push({ a, b, end: tot }); }
  }
  return (RAIL_IDX = { segs, tot });
}
const MU_BURN = ['h-fnkv', 'h-brno', 'h-ostrava'];
const MU_DXK = {
  T: { 1: ['Polytrauma', 'Kraniotrauma, GCS pod 12', 'Poranění hrudníku, nestabilní hrudní stěna', 'Fraktura pánve', 'Perforující poranění břicha', 'Traumatická amputace končetiny'], 2: ['Fraktura dlouhé kosti', 'Kontuze hrudníku', 'Střední kraniotrauma', 'Poranění páteře bez neurologie', 'Rozsáhlá tržná rána'], 3: ['Lehká kontuze', 'Tržná rána', 'Distorze', 'Akutní stresová reakce', 'Drobné povrchové poranění'], 4: ['Exitus na místě'] },
  P: { 1: ['Rozsáhlé popáleniny II.–III. stupně', 'Popáleniny nad 30 % povrchu těla'], 2: ['Popáleniny obličeje a rukou', 'Popáleniny II. stupně'], 3: ['Lehké popáleniny', 'Popálení ruky'], 4: ['Exitus na místě'] },
  'P+T': { 1: ['Popáleniny s polytraumatem', 'Popáleniny a poranění hrudníku', 'Popáleniny a fraktura pánve'], 2: ['Popáleniny a fraktura končetiny', 'Popáleniny a kontuze'], 3: ['Lehké popáleniny a tržná rána'], 4: ['Exitus na místě'] },
  I: { 1: ['Těžké inhalační trauma, respirační selhání', 'Inhalace kouře, porucha vědomí'], 2: ['Inhalační trauma', 'Zakouření, dušnost'], 3: ['Lehké zakouření', 'Podráždění dýchacích cest'], 4: ['Exitus na místě'] },
  N: { 1: ['Těžká intoxikace, porucha vědomí', 'Kolaps, zástava oběhu'], 2: ['Intoxikace', 'Dehydratace, kolaps'], 3: ['Zvracení a průjem', 'Nevolnost, bolest hlavy', 'Úpal, slabost'], 4: ['Exitus na místě'] },
};

if (typeof module !== 'undefined') module.exports = { R_EARTH, hav, roadKm, speedFor, travelSec, heliSec, civilTwilight, DRIVE, LIGHT_MODES, driveSec, clamp01, TOD, EV_HOUR, EXTMSG, WX, BUSY, DEPT, DEPTN, DEPT_ACC, KRUHAC, HO_Q, FIRST, LAST, MU_NB, MU_HOSP, MU_COL, RAIL_IDX, railIndex, MU_BURN, MU_DXK };
