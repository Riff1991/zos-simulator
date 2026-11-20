// Poloha v hovoru: kde je pacient, odkud volající telefonuje, co o místě skutečně ví, odkud to ví a kam se má dostat posádka.
// Volající nedostane „adresu“, ale fakta s pravidlem odhalení: co řekne sám hned, co až na dotaz na dané téma (a čím to zjistí: podívá se na číslo domu,
// přečte ceduli, otevře mapu v mobilu, otevře zprávu, zeptá se kolegy – jen když tam kolega je) a co neví vůbec. Fakta jsou podložená daty projektu
// (adresní body, POI, silniční síť); chybí-li vrstva (řeky, turistické značky, rozcestníky, vjezdy), nic z ní se nevymýšlí.
// Otázka calltakera volajícímu nic nevkládá: co není ve faktech, neví a nepotvrdí. Stejný člověk si co zjistil (opakovaný hovor, zpětné volání) pamatuje.
// build(rnd, x) → { lokace (do view, čistá data + text pro prompt), kotvy (do key: pravda pro ověření na mapě) }; zjisti(lokace, tema) je pravidlový „volající“ pro testy.
// Deterministické z rnd(); nevyhazuje výjimky (při chybě vrací null a hovor jde po staru).
const nrm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const modul = (id, soubor) => (typeof window !== 'undefined' && window[id]) || (typeof require === 'function' ? (() => { try { return require(soubor); } catch (e) { return null; } })() : null);
const relOf = rel => { rel = String(rel || ''); return { self: /pacient sám/.test(rel), pro: /PČR|HZS|operátor|lékař|sestra|ošetřovatel|pečovatelka|personál|učitel|vedoucí|kolega|kolegyně|školník/i.test(rel), kolega: /kolega|kolegyně|personál|sestra|ošetřovatel|pečovatelka|vedoucí|učitel|školník/i.test(rel), rodina: /manžel|matka|otec|dcera|syn/.test(rel), svedek: /kolemjdoucí|svědek|svědkyně/.test(rel), soused: /soused/.test(rel) }; };
const km1 = m => (m < 800 ? 'pár set metrů' : m < 1500 ? 'asi kilometr' : 'asi ' + (m < 10000 ? Math.round(m / 100) / 10 : Math.round(m / 1000)).toString().replace('.', ',') + ' km');
const KAT_LABEL = { obchod: 'u obchodu', cerpadlo: 'u čerpací stanice', zastavka: 'na zastávce nebo u nádraží', restaurace: 'u hospody nebo restaurace', skola: 'u školy', ubytovani: 'u ubytování', sport: 'na sportovišti', verejna_budova: 'u veřejné budovy' };
const GRP_LABEL = { prov: 'u provozovny', verejne: 'na veřejném místě', domov: 'u domova pro seniory', ordinace: 'u ordinace nebo zdravotního střediska', skola: 'u školy', sport: 'na sportovišti', ubytovani: 'u ubytování' };

// rozdělení adresy případu: ulice, číslo, obec (vesnice bez ulic: jen číslo popisné)
function rozbor(addr, obec) {
  const first = String(addr || '').replace(/\([^)]*\)/g, ' ').split(',')[0].trim();
  const m = first.match(/(?:č\.?\s*p\.?\s*)?(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*$/), num = m ? m[1] : '';
  let ulice = first.replace(m ? m[0] : '', ' ').replace(/(^|\s)čp\.?(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim();
  if (nrm(ulice) === nrm(obec) || !ulice) ulice = '';
  return { ulice, cislo: num };
}
const druhAdresy = a => { a = String(a || ''); return /okolí obce/i.test(a) || !/\d/.test(a) ? 'silnice' : /\(/.test(a) ? 'poi' : 'dum'; };

// rozhodnutí, zda volající telefonuje odjinud než od pacienta (rodina volá za příbuzného na jiné adrese); potřeba už při volbě persony (okolí volajícího je jeho domov)
function jinde(rnd, c, kind) {
  const r = relOf(c.oznRel);
  if (kind && kind !== 'vyjezd') return false;
  if (!r.rodina || r.self || r.pro || !['byt', 'rd'].includes(c.where) || c.n === 1 || druhAdresy(c.addr) !== 'dum') return false;
  return rnd() < 0.12;
}

function build(rnd, x) {
  try {
    const O = modul('CT_OKOLI', './okoli.js'); if (!O) return null;
    const c = x.c, per = x.persona || {}, r = relOf(c.oznRel), kind = x.kind || 'vyjezd', zna = !!x.znaJiz;   // znaJiz: opakovaný hovor nebo zpětné volání téhož člověka
    const druh = druhAdresy(c.addr), ar = rozbor(c.addr, c.town), lvl = per.znalostAdresy || 3, ok = x.okoli || null, zena = !!x.zena;
    const L = { scenar: 'adresa', pacient: { kde: '' }, volajici: { stejneMisto: true, kde: 'jsi na místě u pacienta' }, zacatek: [], dotaz: [], nevi: [], ceka: null, znaJiz: zna };
    const K = { pacient: { lat: c.lat, lon: c.lon }, volajici: { lat: c.lat, lon: c.lon }, vodidla: [] };
    const zac = (tema, fakt, data) => L.zacatek.push({ tema, fakt, data: data || null });
    const slysenoM = m => (m < 800 ? 500 : m < 1500 ? 1000 : m < 10000 ? Math.round(m / 100) * 100 : Math.round(m / 1000) * 1000);   // co hráč v odpovědi slyší („pár set metrů“, „asi kilometr“, „asi 3,4 km“): přesněji než to nezná
    const ciste = k => { if (!k) return null; const o = {}; for (const i of Object.keys(k)) { if (['lat', 'lon', 'tol', 'stejnojmennych', 'odCestyM'].includes(i)) continue; let v = k[i]; if (typeof v === 'number') { if (k.typ === 'odstup' && i === 'vzdalenostM') v = Math.round(v / 5) * 5; else if (i === 'vzdalenostM') v = slysenoM(v); else if (i === 'km') v = slysenoM(v * 1000) / 1000; else if (i === 'minut') v = v < 55 ? v : Math.round(v / 30) * 30; } o[i] = v; } return o; };   // co hráč smí z odpovědi použít, ve stejné přesnosti, jakou slyší (pravda s polohou zůstává v key)
    const HLEDANI = /podíváš|přečteš|otevřeš|rozhlédneš|zeptáš/;   // údaj, který volající musí nejdřív zjistit; jen takový se při opakovaném hovoru přenáší, když opravdu zazněl
    const klicZ = k => { if (!k) return []; const a = []; if (k.typ === 'adresa') { if (ar.ulice) a.push(ar.ulice); if (ar.cislo) a.push(ar.cislo); } else if (k.typ === 'adresaPoi') { const q = rozbor(k.hodnota, ''); if (q.ulice) a.push(q.ulice); if (q.cislo) a.push(q.cislo); } else if (k.typ === 'cislo' || k.typ === 'ulice' || k.typ === 'obec') a.push(k.hodnota); else if (k.typ === 'poi' || k.typ === 'odbocka' || k.typ === 'vychozi') a.push(k.nazev); else if (k.typ === 'trasa') a.push(k.posledniObec); return a.filter(Boolean).map(String); };   // co musí v řeči volajícího zaznít, aby se údaj považoval za řečený
    const dot = (tema, fakt, zpusob, kotva, klic) => { const id = tema === 'odbocka' && kotva ? 'odbocka:' + kotva.nazev : tema; L.dotaz.push({ id, tema, fakt, zpusob: zpusob || null, hledani: HLEDANI.test(zpusob || ''), klic: klic || klicZ(kotva), data: ciste(kotva) }); if (kotva) K.vodidla.push(Object.assign({ tema }, kotva)); };
    const poiE = druh === 'poi' ? O.poiPodleAdresy(c.addr) : null;

    if (kind === 'dup') {   // jiný svědek téže události: vidí to zdálky z jiného místa, o pacientovi ví málo
      const ang = rnd() * Math.PI * 2, d = 90 + rnd() * 110, la = c.lat + d * Math.cos(ang) / 111320, lo = c.lon + d * Math.sin(ang) / (111320 * Math.cos(c.lat * Math.PI / 180));
      L.scenar = 'dup'; L.volajici = { stejneMisto: false, kde: 'stojíš asi ' + Math.round(d / 10) * 10 + ' metrů od místa a díváš se odtamtud' }; K.volajici = { lat: la, lon: lo };
      const sm = O.smerSlovy(O.bearing(la, lo, c.lat, c.lon));
      L.pacient.kde = 'asi ' + Math.round(d / 10) * 10 + ' metrů od tebe, ' + sm + ' odsud';
      zac('misto', 'jsi v obci nebo u silnice poblíž ' + (ok && ok.poloha && ok.poloha.nejblizsiObec ? ok.poloha.nejblizsiObec.nazev : c.town) + ' (podle toho, co znáš)', { obec: ok && ok.poloha && ok.poloha.nejblizsiObec ? ok.poloha.nejblizsiObec.nazev : c.town });
      dot('kde_pacient', 'je asi ' + Math.round(d / 10) * 10 + ' metrů od tebe, ' + sm + ' odsud; přesněji to z místa, kde stojíš, neřekneš', null);
      L.nevi.push('přesnou adresu, číslo domu a to, co je u pacienta (nejsi u něj)');
      K.vodidla.push({ tema: 'kde_pacient', typ: 'odstup', lat: la, lon: lo, vzdalenostM: Math.round(d), smerOdVolajiciho: sm });
    } else if (x.jinde) {   // rodina volá za příbuzného odjinud: pacient je na jiné adrese než telefon
      const j = x.jinde; L.scenar = 'jinde';
      L.volajici = { stejneMisto: false, kde: 'jsi doma (' + j.adresa + ') a nejsi u pacienta; jeho stav znáš jen z telefonu nebo z toho, co ti řekl(a)', domov: j.obec }; K.volajici = { lat: j.lat, lon: j.lon };
      L.pacient.kde = c.addr;
      zac('misto', 'voláš kvůli příbuznému, který je jinde než ty, v obci ' + c.town, { obec: c.town });
      dot('adresa', c.addr + ' (adresu příbuzného znáš, je to jeho domov)', null, { typ: 'adresa', hodnota: c.addr, lat: c.lat, lon: c.lon, tol: 60 });
      dot('ulice', ar.ulice || 'ulice nemá, jen číslo popisné ' + ar.cislo, null, { typ: 'ulice', hodnota: ar.ulice, obec: c.town, lat: c.lat, lon: c.lon, tol: 250 });
      dot('cislo_domu', ar.cislo, null, { typ: 'cislo', hodnota: ar.cislo, lat: c.lat, lon: c.lon, tol: 60 });
      dot('kde_pacient', 'je u sebe doma v obci ' + c.town + ' (přesnou adresu řekneš na dotaz na adresu)', null);
      dot('kde_volajici', 'jsi doma, ' + j.adresa + ' (' + km1(j.km * 1000) + ' od pacienta)', null, { typ: 'volajici', lat: j.lat, lon: j.lon, tol: 60 });
      L.nevi.push('jak pacient právě vypadá, jestli dýchá a co přesně dělá (nevidíš ho); můžeš říct jen, co ti řekl(a) při telefonování', 'jestli je u něj teď někdo další');
      L.ceka = null;
    } else if (druh === 'poi' && poiE) {   // případ je u pojmenovaného místa z mapy: obchod, zastávka, škola, provozovna, ubytování…
      const OK = modul('CT_OKOLNOSTI', './okolnosti.js'), kat = (OK && OK.katJmeno(poiE.n)) || null, lab = KAT_LABEL[kat] || GRP_LABEL[poiE.grp] || 'u veřejného místa';
      const stejne = O.poiStejneJmeno(poiE, 12), zam = r.pro || (c.where === 'prov' && rnd() < 0.5), dist = O.hav(c.lat, c.lon, poiE.la, poiE.lo) * 1000;
      L.scenar = 'podnik';
      L.pacient.kde = lab + ' „' + poiE.n + '“ (' + poiE.adr + ')' + (dist <= 15 ? ', přímo u něj' : ', asi ' + Math.round(dist / 5) * 5 + ' m od něj');
      zac('misto', 'jsi ' + lab + ' v obci ' + c.town, { obec: c.town, druhMista: lab });
      if (zam) zac('nazev', 'název místa: ' + poiE.n + ' (znáš ho z práce)', { nazev: poiE.n, obec: c.town });
      const kaz = { typ: 'poi', nazev: poiE.n, ulice: rozbor(poiE.adr, poiE.obec).ulice, obec: poiE.obec, lat: poiE.la, lon: poiE.lo, tol: 120, stejnojmennych: stejne.length };
      if (!zam) dot('nazev', poiE.n, 'podíváš se na nápis nebo štít a přečteš ho', kaz);
      dot('ulice', (rozbor(poiE.adr, poiE.obec).ulice || 'bez ulice, jen číslo popisné') + ' ' + rozbor(poiE.adr, poiE.obec).cislo, zam ? 'ulice si nevybavíš zpaměti; podíváš se na dokument nebo zeptáš kolegy, jen pokud tam kolega je' + (r.kolega ? '' : '; jinak řekneš, že nevíš') : 'přečteš ji z cedule s názvem ulice nebo z čísla na budově', { typ: 'adresaPoi', hodnota: poiE.adr, lat: poiE.la, lon: poiE.lo, tol: 120 });
      dot('kde_pacient', dist <= 15 ? 'pacient je hned u budovy' : 'pacient je asi ' + Math.round(dist / 5) * 5 + ' metrů od něj', null, { typ: 'odstup', lat: c.lat, lon: c.lon, vzdalenostM: Math.round(dist) });
      if (stejne.length) L.nevi.push('že existuje další místo stejného jména jinde; pokud se calltaker ptá, jestli jde o jinou pobočku, řekni jen, co čteš z cedule (ulice)');
      if (!zam) L.nevi.push('číslo popisné nebo adresu zpaměti (jen z cedule)');
    } else if (druh === 'silnice' && ok && (ok.typ === 'silnice')) {   // silnice: poslední obec, směr, odbočky; poctivé „nevím“, když trasu neznáš
      const t = ok.trasa, p = ok.poloha, nej = p.nejblizsiObec, hl = p.hlasenaObec;
      L.scenar = 'silnice'; L.pacient.kde = (ok.silniceKde || 'u silnice') + (p.vObci ? ', v obci ' + p.vObci : ', mimo zástavbu') + (nej ? ', ' + km1(nej.vzdalenostKm * 1000) + ' ' + nej.smerOdObce + ' od obce ' + nej.nazev : '');
      const mn = t && t.znamySmer ? t.minuli.filter(i => i.typ === 'obec') : [];
      if (t && t.znamySmer && ok.jede) {
        const posl = ok.jede.posledni ? { nazev: ok.jede.posledni.nazev, vzdalenostM: ok.jede.posledni.vzdalenostM } : (mn.length ? mn[mn.length - 1] : null);
        zac('misto', 'jedeš po silnici' + (posl ? ', naposledy jsi projel(a) obec ' + posl.nazev : '') + (ok.jede.kam ? ' směrem na ' + ok.jede.kam : ''), { posledniObec: posl ? posl.nazev : null, kam: ok.jede.kam, odkud: ok.jede.odkud, vzdalenostM: posl ? posl.vzdalenostM : null });
        if (posl) dot('posledni_obec', posl.nazev + ' (' + km1(posl.vzdalenostM) + ' zpátky)', 'víš to z cesty', { typ: 'trasa', odkud: ok.jede.odkud, kam: ok.jede.kam, posledniObec: posl.nazev, vzdalenostM: posl.vzdalenostM });
        dot('smer', 'jedeš' + (ok.jede.kam ? ' směrem na ' + ok.jede.kam : ' po této silnici, cíl v tomto úseku neumíš pojmenovat') + (ok.jede.odkud ? ', naposledy jsi projel(a) obec ' + ok.jede.odkud : ''), 'víš to z cesty', { typ: 'trasa', odkud: ok.jede.odkud, kam: ok.jede.kam, posledniObec: posl ? posl.nazev : null, vzdalenostM: posl ? posl.vzdalenostM : null });
        for (const i of t.minuli.filter(i => i.typ === 'odbocka')) dot('odbocka', i.vsiml ? 'odbočku ' + i.strana + ' na ' + i.nazev + ' jsi projel(a) před ' + km1(i.vzdalenostM) + ' a všiml(a) sis jí' : 'odbočky na ' + i.nazev + ' sis nevšiml(a), nevíš o ní', null, i.vsiml ? { typ: 'odbocka', nazev: i.nazev, strana: i.strana, vzdalenostM: i.vzdalenostM } : null);
        const pr = t.pred.filter(i => i.typ === 'obec'); if (pr.length) dot('dal', pr.map(i => i.nazev + ' (' + km1(i.vzdalenostM) + ' dál)').join(', ') + ' (jedeš tam; přibližně)', null, null, pr.map(i => i.nazev));
        L.nevi.push('název nebo číslo silnice', 'odbočky, kterých sis nevšiml(a), a odbočky před sebou', 'jestli jsi mohl(a) minout i další odbočky než ty uvedené');
      } else {
        zac('misto', 'jsi u silnice poblíž ' + (nej ? nej.nazev : c.town), { obec: nej ? nej.nazev : c.town });
        L.nevi.push('odkud jsi jel(a), kterým směrem a jaké odbočky jsi minul(a)', 'název nebo číslo silnice');
      }
      const mapa = [nej && 'nejbližší obec ' + nej.nazev + ' (ty jsi od ní asi ' + km1(nej.vzdalenostKm * 1000).replace(/^asi /, '') + ' ' + nej.smerOdObce + ', tedy obec je od tebe na opačné straně)', ok.silnice && 'třída silnice: ' + ok.silnice].filter(Boolean).join('; ');
      dot('mapa', mapa, 'otevřeš mapu v mobilu a podíváš se na modrou tečku (chvíli to trvá)', { typ: 'obec', hodnota: nej ? nej.nazev : c.town, km: nej ? nej.vzdalenostKm : null, smer: nej ? nej.smerOdObce : null, lat: c.lat, lon: c.lon, tol: 2500 });
      dot('okoli', [].concat(ok.uMista, ok.poblizu).map(i => i.nazev + ' (' + i.kategorie + ', asi ' + i.vzdalenostM + ' m)').join('; ') || 'nic konkrétního nevidíš ani nevíš', 'rozhlédneš se; neřekneš nic nad rámec toho, co tu stojí, a s nejistotou', null, [].concat(ok.uMista, ok.poblizu).map(i => i.nazev));
      if (nej) K.vodidla.push({ tema: 'obec', typ: 'obec', hodnota: nej.nazev, lat: c.lat, lon: c.lon, tol: 2500 });
    } else if (druh === 'silnice' && ok && ok.typ === 'teren') {   // terén: odkud vyšli, jak dlouho šli, zůstali na cestě; jen to, k čemu máme podklad
      const P = { lat: c.lat, lon: c.lon }, nej = ok.poloha.nejblizsiObec, poi = O.poiVychozi(c.lat, c.lon, 6)[0] || null, obce = O.obceBlizko(c.lat, c.lon, 12, 8);
      const kand = obce.slice(0, 6), vyb = (poi && rnd() < 0.4) ? { n: poi.n, la: poi.la, lo: poi.lo, poi: true } : null;
      let start = vyb, len = null;
      if (start) len = O.cestaDelka({ la: start.la, lo: start.lo }, P);
      if (!len) { start = null; for (const s of kand) { const d = O.cestaDelka(s, P); if (d && d < 14000) { start = { n: s.n, la: s.la, lo: s.lo }; len = d; break; } } }
      const min = len ? Math.max(5, Math.round(len / 1000 / 3.8 * 60 / 5) * 5) : null;
      L.scenar = 'teren'; L.pacient.kde = (ok.silniceKde || 'v terénu') + ', mimo zástavbu' + (nej ? ', ' + km1(nej.vzdalenostKm * 1000) + ' ' + nej.smerOdObce + ' od obce ' + nej.nazev : '');
      if (start) {
        zac('misto', (r.self ? 'jsi' : 'jste') + ' v terénu mimo zástavbu a ' + (r.self ? 'vyšel(a) jsi' : 'vyšli jste') + ' od ' + (start.poi ? 'místa „' + start.n + '“' : 'obce ' + start.n), { vychozi: start.n });
        dot('vychozi', (start.poi ? '„' + start.n + '“' : start.n) + ' (odtud ' + (r.self ? 'jsi vyšel(a)' : 'jste vyšli') + ')', 'víš to, je to začátek cesty', { typ: 'vychozi', nazev: start.n, lat: start.la, lon: start.lo, vzdalenostM: len, tol: 600 });
        dot('cas', (r.self ? 'jdeš už ' : 'jdete už ') + (min < 55 ? 'asi ' + min + ' minut' : 'asi ' + (Math.round(min / 30) / 2).toString().replace('.', ',') + ' hodiny') + ' (odhad, hodinky neřešíš)', 'odhadneš', { typ: 'cas', minut: min, vzdalenostM: len });
      } else { zac('misto', 'jste v terénu mimo zástavbu', {}); L.nevi.push('odkud jste vyšli a jak dlouho jdete'); }
      dot('cesta', (r.self ? 'jsi ' : 'jste ') + (ok.silniceKde || 'u cesty') + ' (podle hlášeného místa); jak daleko od cesty pacient přesně leží a jestli z ní sešel(a), nevíš', null, { typ: 'cesta' });
      dot('mapa', nej ? 'nejbližší obec ' + nej.nazev + ' (ty jsi od ní asi ' + km1(nej.vzdalenostKm * 1000).replace(/^asi /, '') + ' ' + nej.smerOdObce + ', tedy obec je od tebe na opačné straně)' : 'nic konkrétního', 'otevřeš mapu v mobilu (chvíli to trvá, signál bývá slabý)', { typ: 'obec', hodnota: nej ? nej.nazev : c.town, km: nej ? nej.vzdalenostKm : null, smer: nej ? nej.smerOdObce : null, lat: c.lat, lon: c.lon, tol: 3000 });
      L.nevi.push('jak daleko od cesty pacient přesně leží a jestli z ní sešel(a); neodhaduj to ani nevymýšlej metry', 'název lesa, cesty, značky nebo rozcestníku (nic z toho nevíš)', 'kam přesně jste mířili dál než k obecnému cíli procházky');
      if (nej) K.vodidla.push({ tema: 'obec', typ: 'obec', hodnota: nej.nazev, lat: c.lat, lon: c.lon, tol: 3000 });
    } else {   // dům s adresou: panelák, rodinný dům, ulice
      L.scenar = 'adresa'; L.pacient.kde = c.addr;
      const navsteva = lvl <= 2 && !r.rodina && !r.pro && !r.self && ['byt', 'rd'].includes(c.where) && rnd() < 0.25;
      const adr = { typ: 'adresa', hodnota: c.addr, lat: c.lat, lon: c.lon, tol: druh === 'dum' ? 60 : 250 };
      if (druh === 'silnice') { zac('misto', 'jsi poblíž obce ' + c.town, { obec: c.town }); dot('adresa', c.addr, null, adr); }
      else if (navsteva) {   // návštěva: adresu má ve zprávě
        L.scenar = 'navsteva'; zac('misto', 'jsi na návštěvě v obci ' + c.town + ', adresu zpaměti nevíš', { obec: c.town });
        dot('adresa', c.addr, 'otevřeš zprávu s adresou (chvíli ji hledáš)', adr); dot('ulice', ar.ulice || 'bez ulice, jen číslo popisné', 've zprávě', { typ: 'ulice', hodnota: ar.ulice, obec: c.town, lat: c.lat, lon: c.lon, tol: 250 }); dot('cislo_domu', ar.cislo, 've zprávě nebo na domě', { typ: 'cislo', hodnota: ar.cislo, lat: c.lat, lon: c.lon, tol: 60 });
        L.nevi.push('adresu zpaměti');
      } else if (lvl >= 3) {
        zac('misto', 'jsi v obci ' + c.town, { obec: c.town }); dot('adresa', c.addr, 'znáš ji zpaměti', adr); dot('ulice', ar.ulice || 'bez ulice, jen číslo popisné', null, { typ: 'ulice', hodnota: ar.ulice, obec: c.town, lat: c.lat, lon: c.lon, tol: 250 }); dot('cislo_domu', ar.cislo, null, { typ: 'cislo', hodnota: ar.cislo, lat: c.lat, lon: c.lon, tol: 60 });
      } else if (lvl === 2) {
        zac('misto', 'jsi v obci ' + c.town + (ar.ulice ? ', v ulici ' + ar.ulice : ''), { obec: c.town, ulice: ar.ulice }); dot('adresa', c.addr, 'číslo domu zjistíš, až se podíváš na dům nebo na schránku', adr); dot('cislo_domu', ar.cislo, 'podíváš se na dům nebo na schránku', { typ: 'cislo', hodnota: ar.cislo, lat: c.lat, lon: c.lon, tol: 60 });
        if (ar.ulice) dot('ulice', ar.ulice, null, { typ: 'ulice', hodnota: ar.ulice, obec: c.town, lat: c.lat, lon: c.lon, tol: 250 });
      } else {   // neví adresu, ale kolem je cedule s ulicí a čísla domů
        zac('misto', 'jsi v obci ' + c.town + ', přesnou adresu neznáš', { obec: c.town });
        dot('ulice', ar.ulice || 'bez ulice, jen číslo popisné', 'přečteš ji z cedule s názvem ulice (musíš se rozhlédnout)', { typ: 'ulice', hodnota: ar.ulice, obec: c.town, lat: c.lat, lon: c.lon, tol: 250 });
        dot('cislo_domu', ar.cislo, 'podíváš se na nejbližší dům s číslem (chvíli to trvá)', { typ: 'cislo', hodnota: ar.cislo, lat: c.lat, lon: c.lon, tol: 60 });
        L.nevi.push('adresu zpaměti');
      }
      if (c.where === 'byt') { const m = String(c.place || '').match(/(\d)\s*\.?\s*(p\b|pat|\.p)/i) || (/přízemí/i.test(c.place || '') ? ['0'] : null); if (m) dot('patro', /přízemí/i.test(c.place || '') ? 'přízemí' : m[1] + '. patro', 'víš to', { typ: 'patro' }); else L.nevi.push('v kterém patře přesně'); }
      if (ok && ok.typ === 'mesto' && (ok.uMista.length || ok.poblizu.length)) dot('okoli', [].concat(ok.uMista, ok.poblizu).map(i => i.nazev + ' (' + i.kategorie + ', asi ' + i.vzdalenostM + ' m)').join('; '), 'rozhlédneš se; neřekneš nic nad rámec toho, a s nejistotou', null, [].concat(ok.uMista, ok.poblizu).map(i => i.nazev));
      if (!r.self && !r.pro && druh === 'dum' && (/před domem|venku|počká|čeká|mávat/i.test(c.place || '') || rnd() < 0.2)) L.ceka = c.where === 'byt' ? 'počkáš před domem u vchodu a posádku navedeš' : 'počkáš před domem a posádku navedeš';
    }
    if (zna) { const zj = new Set(x.zjisteno || []); for (const d of L.dotaz) if (!d.hledani || zj.has(d.id)) { d.zpusob = 'už to víš z dřívějšího hovoru (věděl(a) jsi to nebo jsi to tehdy zjistil(a)); nic nehledáš'; d.hledani = false; d.zname = true; } }   // přenáší se jen to, co volající původně věděl nebo při předchozím hovoru skutečně řekl; co hledat musel a nezaznělo, musí zase hledat
    L.text = text(L, zena);
    return { lokace: L, kotvy: K };
  } catch (e) { return null; }
}

function text(L, zena) {
  const o = [];
  o.push('MÍSTO A TVOJE ZNALOST (pevná pravda hovoru: odpovídej podle ní vždy stejně, ať se calltaker zeptá jakkoli; má přednost před jiným pokynem k adrese):');
  o.push('- Pacient je: ' + L.pacient.kde + '.');
  o.push('- Ty: ' + L.volajici.kde + '.');
  o.push('- Na začátku sám(a) řekneš jen: ' + (L.zacatek.length ? L.zacatek.slice(0, 2).map(z => z.fakt).join('; ') : 'že potřebuješ pomoc') + '.' + (L.znaJiz ? ' (Je to další hovor téhož člověka: u údajů označených „už víš“ nic nehledáš; co jsi tehdy nehledal(a) ani neřekl(a), musíš zase zjistit způsobem v závorce.)' : ''));
  if (L.dotaz.length) o.push('- Další údaje řekneš až když se calltaker zeptá na dané téma (způsob, jak to zjistíš, je v závorce; kde je způsob, odpovíš teprve po něm, a to třeba až v další větě):\n' + L.dotaz.map(d => '  • ' + d.tema.replace('_', ' ') + ': ' + d.fakt + (d.zpusob ? ' (' + d.zpusob + ')' : '')).join('\n'));
  if (L.nevi.length) o.push('- Nevíš: ' + L.nevi.join('; ') + '.');
  if (L.ceka) o.push('- ' + L.ceka.charAt(0).toUpperCase() + L.ceka.slice(1) + ' (nabídneš to, až když se ptají, kde posádku uvítáš, nebo když je to přirozené).');
  o.push('PRAVIDLA POLOHY: říkej vždy jen jednu věc po druhé, podle otázky; nevysypávej všechny údaje. Kolegu se zeptáš jen když je výše uvedeno, že tam je. Údaj, který jsi řekl(a), už neměň ani při jiném znění otázky. Calltakerova otázka ti nic nevkládá do paměti: když se zeptá na obchod, obec, odbočku, budovu nebo cokoli, co tu není, nepotvrzuj to ani nepřebírej; řekni, že nevíš, nevidíš to nebo že to tu není. Nevymýšlej nic nad rámec uvedeného (vchody, haly, značky, řeky ani rozcestníky nezná nikdo, kdo je nemá v bloku). Čeho se zeptá a ty to nevíš, řekneš poctivě „nevím“ nebo jen to, co víš (třeba jen úsek cesty).');
  return o.join('\n');
}

// pravidlový „volající“ pro testy: vrací, co se hráč touto otázkou dozví (téma), nebo že volající neví
function zjisti(L, tema) {
  if (!L) return { stav: 'nevi', fakt: null };
  const z = L.zacatek.find(i => i.tema === tema); if (z) return { stav: 'hned', fakt: z.fakt };
  const d = L.dotaz.find(i => i.tema === tema); if (d) return { stav: 'dotaz', fakt: d.fakt, zpusob: d.zpusob };
  return { stav: 'nevi', fakt: null };
}
// co volající v přepisu skutečně řekl: id údajů (z L.dotaz), jejichž klíče (ulice, číslo, název, obec…) v jeho větách zazněly; údaje bez klíče se nepočítají
function zjistenoZPrepisu(L, text) {
  if (!L) return [];
  const t = nrm(text), out = [];
  for (const d of L.dotaz || []) {
    const kl = d.klic || []; if (!kl.length) continue;
    const ok = kl.every(k => { const n = nrm(k); return /^\d/.test(n) ? new RegExp('(^|[^0-9])' + n.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '([^0-9]|$)').test(t) : t.includes(n); });
    if (ok && !out.includes(d.id)) out.push(d.id);
  }
  return out;
}
const api = { build, jinde, zjisti, zjistenoZPrepisu, rozbor, druhAdresy, relOf, text };
if (typeof module !== 'undefined') module.exports = api; else window.CT_LOKACE = api;
