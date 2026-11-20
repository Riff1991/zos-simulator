// Řeč volajícího: kombinovatelný systém ZAČÁTEK × TVARY ŘEČI × VÝPLŇ × DÉLKA × OZNAČENÍ PACIENTA × PROJEV STRESU × POKYNY K ADRESE A SLUCHU.
// Z každé skupiny se vybere jen málo prvků podle člověka a situace (ne všechno naráz), takže hovory nezačínají ani nepokračují stejně.
// Nejsou tu hotové věty k odříkání, jen povahy chování; slova si model volí sám. Fakta o pacientovi a případu tím nijak nevznikají ani nemizí.
// build(rnd, x) → čistý datový objekt { zacatek, tvary, vypln, delka, oznaceni, stresProjev, pokyny, text }. Deterministické z rnd().
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
function wpick(rnd, items, wf) {
  const w = items.map(wf), tot = w.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) return null;
  let r = rnd() * tot; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function sample(rnd, items, k, wf) {   // k různých prvků vážený výběr bez vracení
  const left = items.slice(), out = [];
  while (out.length < k && left.length) { const it = wpick(rnd, left, wf); if (!it) break; out.push(it); left.splice(left.indexOf(it), 1); }
  return out;
}
const T = (...ids) => new Set(ids);   // zkratka pro skupiny typů volajících
const PRO = T('profesional'), CHAOS = T('panika', 'plac', 'ustarany', 'rozcileny', 'agresivni', 'soc');
const SENIOR = x => x.vek >= 70;

// ---------- ZAČÁTEK: kterým způsobem hovor otevře (popis chování, ne věta) ----------
const ZACATEK = [
  { id: 'rovnou', w: 3, pokyn: 'Hned první větou řekneš, co se děje, bez zdvořilostních frází.', ne: x => PRO.has(x.typ) },
  { id: 'pozdrav_vec', w: 3, pokyn: 'Pozdravíš (jakkoli, klidně jen „dobrý“ nebo „haló“) a hned potom věc.' },
  { id: 'pozdrav_ticho', w: 1.4, pokyn: 'Pozdravíš a chvilku mlčíš nebo hledáš, jak začít; calltaker tě musí popostrčit.', kdy: x => ['vagni', 'senior_klidny', 'senior_vylekany', 'senior_technofob', 'teen', 'dite', 'soc', 'senior_zmateny'].includes(x.typ) || x.sp <= 1 },
  { id: 'prosba', w: 2, pokyn: 'Začneš naléhavou prosbou o pomoc nebo o rychlost a teprve na dotaz řekneš, o co jde.', kdy: x => CHAOS.has(x.typ) },
  { id: 'kdo', w: 2.2, pokyn: 'Začneš tím, kdo je pacient (podle vašeho vztahu) a že mu není dobře; podrobnosti až na dotaz.', kdy: x => !x.self && !x.svedek },
  { id: 'misto', w: 1.4, pokyn: 'Začneš tím, kde jste (tak, jak to znáš), a potom, co se stalo.', kdy: x => x.adresa >= 2 && !PRO.has(x.typ) },
  { id: 'jsem_tam', w: 1.2, pokyn: 'Nejdřív se přesvědčíš, že jsi se dovolal (např. jestli je tam záchranka), a potom řekneš, proč voláš.', kdy: x => x.vek >= 60 || x.typ === 'senior_technofob' || x.typ === 'dite' },
  { id: 'prerusit', w: 0.9, pokyn: 'Začneš větou v půli, jako by ses ještě chvíli bavil(a) s někým u pacienta, a teprve pak osloviš calltakera.', kdy: x => !x.self && x.stres <= 2 },
  { id: 'strucne', w: 2, pokyn: 'Řekneš jen dvě tři slova (to hlavní) a čekáš na otázky.', kdy: x => ['vecny', 'flegmatik', 'nespolupracujici', 'pacient_dusnost', 'mlady_spech', 'vagni'].includes(x.typ) || x.po === 0 },
  { id: 'profi', w: 6, pokyn: 'Hlásíš věcně a po pořádku: odkud voláš, kdo je pacient, co se stalo.', kdy: x => PRO.has(x.typ) },
  { id: 'stiznost', w: 2, pokyn: 'Začneš netrpělivě nebo se stížností (že už to trvá, že už měl někdo jet), pak věc.', kdy: x => ['rozcileny', 'agresivni', 'senior_domaha_se'].includes(x.typ) },
  { id: 'zvuk', w: 1.6, pokyn: 'Začneš sotva slyšitelně nebo útržkem (nadechnutí, „haló?“, odkašlání) a až potom jasně řekneš, co potřebuješ.', kdy: x => ['pacient_slaby', 'pacient_bolest', 'pacient_neuro', 'pacient_dusnost', 'senior_vylekany'].includes(x.typ) },
  { id: 'cizi', w: 5, pokyn: 'Začneš po svém (lámaně, s cizím slovem), ale jasně řekneš, že potřebuješ pomoc.', kdy: x => x.cizi },
];

// ---------- TVARY ŘEČI (vybírá se 1 až 2, u povídavých 3) ----------
const TVARY = [
  { id: 'strucne', w: 3, pokyn: 'odpovídáš jen na to, na co se ptají, často několika slovy', kdy: x => x.po <= 1 },
  { id: 'vahavy', w: 2, pokyn: 'váháš a odpovídáš nejistě („no… asi…“), když to nevíš přesně', kdy: x => ['vagni', 'senior_vylekany', 'teen', 'dite', 'senior_klidny', 'senior_technofob'].includes(x.typ) || x.sp <= 1 || x.stres === 1 },
  { id: 'vecny', w: 3, pokyn: 'mluvíš věcně a bez ozdob', kdy: x => x.stres <= 1 },
  { id: 'prerivany', w: 2.5, pokyn: 'nedokončuješ některé věty, přerušuješ se', kdy: x => x.stres >= 2 || x.typ === 'pacient_dusnost' || x.typ === 'pacient_bolest' },
  { id: 'opakuje', w: 1.6, pokyn: 'občas zopakuješ to hlavní, co jsi řekl(a) (např. aby to bylo slyšet)', kdy: x => x.stres >= 2 || SENIOR(x) },
  { id: 'opravuje', w: 2, pokyn: 'jednou za čas se opravíš uprostřed věty („tam… ne, vlastně…“), ale ve skutečnosti nikdy nezměníš fakta z listu', kdy: x => x.po >= 1 && x.typ !== 'dite' },
  { id: 'hleda', w: 1.8, pokyn: 'chvíli hledáš slova nebo to správné pojmenování (laicky, bez odborných výrazů)', kdy: x => SENIOR(x) || x.stres >= 3 || x.typ === 'pacient_neuro' || x.cizi },
  { id: 'preslechne', w: 1.2, pokyn: 'jednou nerozumíš otázce nebo ji jen zčásti zachytíš a necháš si ji říct znovu', kdy: x => x.sluch > 0 || x.stres >= 2 },
  { id: 'neprimo', w: 1.4, pokyn: 'občas odpovíš nepřímo (řekneš souvislost místo odpovědi) a calltaker se musí doptat', kdy: x => ['vagni', 'nespolupracujici', 'hovorny', 'senior_osamely', 'senior_zmateny', 'flegmatik'].includes(x.typ) },
  { id: 'otazkou', w: 1.1, pokyn: 'jednou odpovíš protiotázkou („jak to myslíte?“, „proč se ptáte?“), pak odpovíš', kdy: x => x.vek >= 16 && !PRO.has(x.typ) && x.sp <= 2 },
  { id: 'doplni', w: 1.8, pokyn: 'občas k odpovědi přidáš drobnou souvislost, o kterou nikdo nežádal (jen pokud neodporuje listu faktů)', kdy: x => x.po >= 2 },
  { id: 'cele', w: 2, pokyn: 'mluvíš v celých, srozumitelných větách', kdy: x => x.stres <= 1 && x.po >= 1 },
  { id: 'rychle', w: 1.4, pokyn: 'mluvíš rychle a slova se ti slévají', kdy: x => x.stres >= 2 && x.vek < 60 },
  { id: 'pomalu', w: 1.6, pokyn: 'mluvíš pomalu a s odmlkami', kdy: x => SENIOR(x) || x.typ === 'flegmatik' },
];

// ---------- VÝPLŇ podle věkového pásma: vybere se 0 až 3, ostatní časté výplně neužívej ----------
const VYPLN = {
  dite: ['no', 'a', 'tak', 'jé', 'hm', 'teda'],
  teen: ['no jako', 'prostě', 'tak', 'hele', 'jo', 'fakt', 'no nevím', 'vlastně'],
  mlady: ['no jako', 'prostě', 'tak', 'hele', 'jo', 'v pohodě', 'vlastně', 'okay'],
  stredni: ['no', 'tak', 'víte', 'jo', 'aha', 'prostě', 'vlastně', 'tedy', 'no jo'],
  starsi: ['no', 'tak', 'víte', 'prosím vás', 'aha', 'jo', 'no jo', 'vlastně', 'tedy'],
  senior1: ['no tak', 'jo', 'dyť', 'no jo', 'prosím vás', 'víte', 'tak', 'hm'],
  senior2: ['no tak', 'dyť', 'holenku', 'prosím vás', 'víte', 'jo', 'no jo', 'tak', 'hm'],
  senior3: ['no tak', 'dyť', 'holenku', 'jo', 'prosím vás', 'hm'],
};

// ---------- DÉLKA odpovědi podle povídavosti ----------
const DELKA = [
  ['většinou jen pár slov', 'krátce, často jen slovo, dvě', 'jedna krátká věta nebo její půlka'],
  ['jedna věta, občas dvě', 'krátce, ale úplnou větou', 'jedna věta; občas jen potvrzení'],
  ['jedna až tři věty podle toho, co je potřeba', 'středně dlouhé odpovědi, občas delší', 'dvě věty, někdy jen jedna'],
  ['když se rozpovídáš, i delší souvislé odpovědi, ale věcně nic nezkresluješ', 'delší odpovědi s odbočkami, které ale nic nemění na faktech', 'rozvláčně, s vedlejšími věcmi, ke kterým se calltaker musí vracet'],
];

// ---------- OZNAČENÍ PACIENTA podle vztahu ----------
function oznaceniFor(rnd, x) {
  const rel = String(x.rel || ''), m = x.pacient || {}, krestni = m.krestni || '', prijmeni = m.prijmeni || '', muz = m.pohlavi === 'muž', mlad = x.vek < 35;
  if (x.self) return null;
  const cele = (a) => a.filter(Boolean);
  let a;
  if (/manžel(ka)?$/.test(rel)) a = muz ? ['manžel', 'můj muž', krestni && 'křestním jménem (' + krestni + ')', 'on'] : ['manželka', 'moje žena', krestni && 'křestním jménem (' + krestni + ')', 'ona'];
  else if (/dcera|syn/.test(rel)) a = muz ? [mlad ? 'taťka' : 'táta', 'tatínek', 'otec', 'on'] : [mlad ? 'mamka' : 'máma', 'maminka', 'matka', 'ona'];
  else if (/matka|otec/.test(rel)) a = muz ? ['syn', 'náš kluk', krestni && 'křestním jménem (' + krestni + ')', 'on'] : ['dcera', 'naše holka', krestni && 'křestním jménem (' + krestni + ')', 'ona'];
  else if (/soused/.test(rel)) a = muz ? ['soused', prijmeni && 'pan ' + prijmeni, 'ten pán od vedle', 'on'] : ['sousedka', prijmeni && 'paní ' + prijmeni, 'ta paní od vedle', 'ona'];
  else if (/kolemjdoucí|svědek|svědkyně/.test(rel)) a = muz ? ['ten pán', 'ten člověk', 'ten muž', x.vek < 40 ? 'ten chlap' : 'ten pán'] : ['ta paní', 'ten člověk', 'ta žena', x.vek < 40 ? 'ta holka' : 'ta paní'];
  else if (/pečovatel|ošetřovatel|sestra|domova/.test(rel)) a = muz ? ['klient', prijmeni && 'pan ' + prijmeni, 'pacient'] : ['klientka', prijmeni && 'paní ' + prijmeni, 'pacientka'];
  else if (/lékař|PČR|HZS|vedoucí|učitel|kolega|kolegyně|školník|operátor/i.test(rel)) a = muz ? ['pacient', 'ten muž', 'postižený'] : ['pacientka', 'ta žena', 'postižená'];
  else a = muz ? ['on', 'ten pán', 'ten člověk'] : ['ona', 'ta paní', 'ten člověk'];
  a = cele(a);
  const k = Math.min(a.length, 2 + (rnd() < 0.4 ? 1 : 0)), sel = sample(rnd, a, k, () => 1);
  return sel.join(', ');
}

// ---------- PROJEVY STRESU (podle úrovně, vybere se 1 až 2; nezávislé na typu, doplňuje „styl“ archetypu) ----------
const STRES_PROJEV = [
  ['klidný vyrovnaný hlas', 'rozvážné tempo', 'bez emocí, spíš věcně', 'občas se nadechneš a pokračuješ'],
  ['trochu spěcháš', 'občas se nadechneš nebo si odkašleš', 'drobné povzdechnutí', 'obavu dáváš najevo spíš tichým hlasem než slovy'],
  ['rychlejší tempo, hlas občas stoupne', 'vynecháváš spojky a mluvíš v krátkých úsecích', 'občas se zeptáš, jestli už jedou', 'slyšitelně dýcháš', 'dvakrát se nadechneš, než odpovíš'],
  ['hlas se ti třese nebo láme', 'dýcháš rychle a slyšitelně', 'občas zopakuješ poslední slovo, které slyšíš', 'někdy se ti na chvíli zadrhne hlas a mlčíš', 'zakoktáš se u čísel a jmen'],
];
const STRES_TXT = [['klidný', 'v klidu', 'vyrovnaný'], ['mírně napjatý', 'trochu nervózní', 'ustaraný, ale ovládáš se'], ['výrazně vystresovaný', 'rozrušený', 'hodně nervózní'], ['v panice', 'zoufalý a rozklepaný', 'vystrašený až k slzám']];
const SPOL_TXT = [
  ['téměř nespolupracuješ', 'na většinu otázek neochotně mlčíš nebo odsekneš', 'odpovídáš jen když tě calltaker pevně vede'],
  ['spolupracuješ neochotně', 'odpovídáš s odstupem a bez chuti', 'dáš informaci, ale až na podruhé'],
  ['spolupracuješ, ale jsi rozrušený(á)', 'chceš pomoct, jen ti to nejde plynule', 'odpovídáš ochotně, ale občas se ztratíš'],
  ['spolupracuješ dobře', 'ochotně odpovídáš a řídíš se pokyny', 'odpovídáš jasně a hned'],
];
const SLUCH_TXT = [
  ['slyšíš dobře', 'slyšíš bez problémů'],
  ['slyšíš trochu hůř, občas požádáš o zopakování („cože?“)', 'občas ti unikne slovo a necháš si ho zopakovat'],
  ['slyšíš velmi špatně, často nerozumíš, ptáš se znovu a mluvíš nahlas', 'musíš se často doptávat a čísla si necháváš zopakovat'],
];
const ADR_TXT = {
  1: ['neví přesnou adresu; místo popisuje jen tím, co zná (podle bloku „Orientace v místě“, pokud je), a nic si nevymýšlí', 'neví, kde přesně je; ví jen, co vidí a co zná z bloku „Orientace v místě“; nehádá'],
  2: ['zná obec a ulici, číslo domu nevybaví nebo se splete a opraví se až na dotaz', 'zná obec a ulici; číslo domu chvíli hledá (dívá se na dům nebo schránku) a řekne ho až po chvíli', 'zná obec i ulici, číslo domu řekne až po doptání'],
  3: ['zná přesnou adresu a řekne ji, když se zeptají', 'zná adresu a po otázce ji řekne celou najednou', 'adresu řekne postupně: nejdřív obec a na další otázku ulici a číslo', 'zná adresu zpaměti a řekne ji rychle, takže ji calltaker případně nechá zopakovat', 'číslo domu řekne hned, obec až když se zeptají'],
};

function build(rnd, x) {
  x = x || {};
  const stres = Math.max(0, Math.min(3, x.stres | 0)), po = Math.max(0, Math.min(3, Number.isFinite(x.po) ? x.po : 1)), adresa = Math.max(1, Math.min(3, x.adresa | 0 || 3));
  const xx = Object.assign({ sp: 2, sluch: 0 }, x, { stres, po, adresa });
  const zacatek = wpick(rnd, ZACATEK.filter(z => (!z.kdy || z.kdy(xx)) && (!z.ne || !z.ne(xx))), z => z.w) || ZACATEK[0];
  const kTvary = x.typ === 'hovorny' || po === 3 ? 3 : po === 0 ? 1 : (rnd() < 0.55 ? 2 : 1);
  const tvary = sample(rnd, TVARY.filter(t => !t.kdy || t.kdy(xx)), kTvary, t => t.w);
  const vyplList = VYPLN[x.pasmo] || VYPLN.stredni, nVypl = rnd() < 0.2 ? 0 : 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.15 ? 1 : 0), vypln = sample(rnd, vyplList, nVypl, () => 1);
  const delka = pick(rnd, DELKA[po]);
  const oznaceni = oznaceniFor(rnd, xx);
  const stresProjev = sample(rnd, STRES_PROJEV[stres], rnd() < 0.5 ? 1 : 2, () => 1);
  const pokyny = { stres: pick(rnd, STRES_TXT[stres]), spoluprace: pick(rnd, SPOL_TXT[Math.max(0, Math.min(3, x.sp | 0))]), sluch: pick(rnd, SLUCH_TXT[Math.max(0, Math.min(2, x.sluch | 0))]), adresa: pick(rnd, ADR_TXT[adresa]) };
  const rad = [];
  rad.push('Začátek hovoru: ' + zacatek.pokyn + ' Formulaci vymysli sám/sama, nepoužívej naučené fráze a stejný slovosled jako v jiných hovorech.');
  rad.push('Způsob řeči (jen tohle, nic víc naráz): ' + tvary.map(t => t.pokyn).join('; ') + '.');
  rad.push('Délka odpovědí: ' + delka + '. Střídej ji podle otázky, nestav věty pořád stejně.');
  rad.push(vypln.length ? 'Výplňová slova smíš občas použít: ' + vypln.join(', ') + ' (ne v každé replice, žádná jiná častá výplň).' : 'Výplňová slova skoro nepoužíváš.');
  if (oznaceni) rad.push('Pacienta nazýváš např.: ' + oznaceni + '. Střídej to přirozeně, žádný tvar neopakuj v každé větě.');
  rad.push('Jak se projevuje stres: ' + stresProjev.join('; ') + '.');
  return { zacatek: { id: zacatek.id, pokyn: zacatek.pokyn }, tvary: tvary.map(t => ({ id: t.id, pokyn: t.pokyn })), vypln, delka, oznaceni, stresProjev, pokyny, text: rad.join(' ') };
}
const api = { build, ZACATEK, TVARY, VYPLN, DELKA, STRES_PROJEV, STRES_TXT, SPOL_TXT, SLUCH_TXT, ADR_TXT };
if (typeof module !== 'undefined') module.exports = api; else window.CT_RECI = api;
