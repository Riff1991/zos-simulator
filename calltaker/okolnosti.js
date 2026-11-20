// Okolnosti hovoru volajícího: kombinovatelný systém MÍSTO × AKUSTIKA × PROJEV × (volitelně) POČASÍ Z DAT.
// Nejde o seznam hotových vět. Z místa se vybere podmístnost („kde přesně stojí“), k ní podmínky slyšitelnosti
// (včetně velmi častého „nic zvláštního“) a nakonec způsob, jakým se okolnost projeví: většinou vůbec nijak,
// jindy jen v pozadí, krátce v hlase nebo v jedné přeslechnuté otázce. Počasí se použije jen tehdy, když je v datech hovoru
// (obj. wx z hry), volající je venku a je ho slyšet; i tehdy jen zřídka.
// build(rnd, x) → čistý datový objekt { misto, zvuk, projev, cas, pocasi, text }. Deterministické z rnd().
const nrm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
function wpick(rnd, items, wf) {
  const w = items.map(wf), tot = w.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) return null;
  let r = rnd() * tot; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const noc = h => h != null && (h >= 22 || h < 5);
const casDne = h => (h == null ? null : noc(h) ? 'noc' : h < 9 ? 'rano' : h < 17 ? 'den' : 'vecer');

// kategorie místa podle názvu provozovny (jen z toho, co je v datech: název v závorce u adresy z poi.json)
function katJmeno(s) {
  s = nrm(s);
  if (/skol|skolk|gymn|uciliste/.test(s)) return 'skola';
  if (/nadrazi|zastavk|autobus/.test(s)) return 'zastavka';
  if (/benz|cerpac|omv|shell|eurooil|\bmol\b|\btank|\blpg\b|orlen|flaga/.test(s)) return 'cerpadlo';
  if (/restaur|hospod|hostinec|pivnic|\bbar\b|bistro|kavarn|cukrarn|pizz|vinarn|krcm|hostinsk/.test(s)) return 'restaurace';
  if (/coop|albert|penny|billa|lidl|tesco|potravin|vecerk|market|prodejn|obchod|drogeri|trafik|pekarn|reznict|samoobsl|norma|\bdm\b/.test(s)) return 'obchod';
  if (/hotel|penzion|ubytov|kemp|apartm|chata|chaty/.test(s)) return 'ubytovani';
  if (/bazen|koupalist|sportovn|hrist|stadion|telocvic|fitness|wellness|tenis|lyzar|sjezdov|hala\b/.test(s)) return 'sport';
  if (/urad|radnic|posta\b|knihovn|muzeum|zamek|hrad\b|kostel|kaple/.test(s)) return 'verejna_budova';
  return null;
}

const VENKU = new Set(['pred_domem', 'zahrada', 'dvur', 'ulice', 'silnice', 'zastavka', 'cerpadlo', 'odlehle']);

// ---------- AKUSTIKA: id → varianty popisu (co se v telefonu dá slyšet). Žádná televize, rádio, hudba, zvířata ani další osoby domácnosti. ----------
const AK = {
  ticho: { zvuk: false, v: ['je ticho, slyšet je jen tvůj dech a hlas', 'klid, jen občas něco zaskřípe v domě', 'žádný zvláštní hluk, obyčejné ticho', 'ticho, žádné rušení', 'klidné prostředí bez nápadných zvuků'] },
  bezny: { zvuk: false, v: ['běžné okolní zvuky, nic nápadného', 'obvyklý tichý ruch, který nijak nevadí', 'žádné rušivé zvuky, běžný provoz okolí', 'okolí je normální, nic zvláštního se neděje'] },
  noc: { zvuk: false, v: ['je noc, kolem je ticho a mluvíš tišeji, aby ses nepletl(a) do ticha', 'noční klid, mluvíš ztlumeně', 'celé okolí spí, slyšet je jen ty'] },
  doprava: { zvuk: true, hluk: 1, v: ['občas kolem projede auto', 'z dálky je slyšet silnice, auta jezdí v zástupu', 'kolem jezdí kamiony a je to slyšet', 'z ulice jde stálé vzdálené hučení aut', 'projede autobus a na chvíli je hlučněji', 'občas za sebou slyšíš brzdění a rozjezd aut'] },
  vzdalene_hlasy: { zvuk: true, hluk: 1, lide: true, v: ['kdesi v dálce se baví lidé, nic nerozumíš', 'za zdí nebo dveřmi jsou slyšet tlumené hlasy', 'někde vzadu zazní hovor, který s tebou nesouvisí', 'v dálce se občas ozve zavolání nebo smích'] },
  ruch_lidi: { zvuk: true, hluk: 2, lide: true, v: ['okolo jsou lidé a hlasitě se baví', 'je tu rušno, hlasy se překrývají', 'kolem proudí lidé, je slyšet kroky a hovory', 'v pozadí je ruch, jaký bývá na frekventovaném místě'] },
  ozvena: { zvuk: true, hluk: 1, v: ['hlas se v prostoru odráží, je slyšet ozvěnu', 'místnost nebo chodba zní prázdně a hlas se rozléhá', 'prostor je holý a každé slovo ti zní dvakrát'] },
  pristroje: { zvuk: true, hluk: 1, v: ['v pozadí slabě pípají a hučí přístroje', 'hučí klimatizace a občas někde pípne monitor', 'slyšíš tichý chod přístrojů a občas kroky na chodbě'] },
  stroje: { zvuk: true, hluk: 2, v: ['v dálce běží stroje a trochu musíš zvyšovat hlas', 'občas zaskřípe nebo třískne kov', 'kolem hučí motory a je třeba mluvit hlasitěji', 'někde pracuje nářadí a hluk se střídá s klidem'] },
  deti: { zvuk: true, hluk: 2, lide: true, v: ['okolo je hluk dětí a pobíhání', 'je slyšet křik z chodby a dupot', 'z dálky se ozývá dětský křik a zvonění'] },
  priroda: { zvuk: false, v: ['je klid, slyšet jsou jen ptáci a šumění stromů', 'okolí je tiché, někde daleko zahučí motor traktoru nebo auta', 'je tu ticho přírody, nic neruší', 'zvuk tlumí les a hlas se v otevřeném prostoru ztrácí'] },
  voda: { zvuk: true, hluk: 1, lide: true, v: ['u vody šplouchá a občas zazní výkřik', 'zní to jako u bazénu, voda a odrážející se hlasy'] },
  motor: { zvuk: true, hluk: 1, v: ['tiše běží motor auta', 'v autě něco tiká a hučí motor', 'okno je lehce otevřené a zvenku jde šum cesty'] },
  okno: { zvuk: true, hluk: 1, v: ['okno je otevřené a zvenku jde šum ulice', 'zvenku je trochu slyšet okolní provoz'] },
  slabe_slyseni: { zvuk: true, hluk: 2, tel: true, v: ['telefon se slyší hůř: hlas občas lehce zadrhne', 'signál je slabší a občas na chvilku zní hlas tiše', 'telefon je na hlasitém odposlechu a hlas zní vzdáleně', 'telefon držíš nešikovně a mikrofon bere hlas tišeji', 'linka občas zašumí'] },
  vetsi_prostor: { zvuk: true, hluk: 1, v: ['velký otevřený prostor, hlas se rozplývá', 'prostor je rozlehlý a zvuk se v něm ztrácí'] },
};

// ---------- MÍSTA: kde přesně (podmístnost) + které podmínky slyšitelnosti k nim patří (váha). Pole kde: t = text, self:false = jen když pacient není volající, pro = jen profesionál, v:[min,max] = věk volajícího. ----------
const MISTA = {
  byt: {
    kde: [
      { t: 'jsi v bytě, v místnosti, kde je pacient' }, { t: 'jsi v bytě, v sousední místnosti a chodíš k pacientovi', self: false }, { t: 'jsi v předsíni bytu u dveří' }, { t: 'jsi v kuchyni bytu' },
      { t: 'jsi v bytě a telefon máš u ucha, chodíš po bytě', self: false }, { t: 'jsi doma, v obýváku' }, { t: 'jsi v ložnici' }, { t: 'jsi na balkoně nebo u okna a snažíš se mít lepší signál', v: [14, 90] },
    ],
    ak: [['ticho', 5], ['bezny', 4], ['noc', 0, 'noc'], ['okno', 1.2], ['vzdalene_hlasy', 1.4], ['doprava', 0.7], ['slabe_slyseni', 1], ['ozvena', 0.2]],
  },
  chodba: {
    kde: [{ t: 'stojíš na společné chodbě domu před bytem' }, { t: 'jsi na schodišti bytového domu' }, { t: 'jsi ve vchodu domu a čekáš, až posádku někdo pustí dovnitř', self: false }, { t: 'jsi v domě u výtahu' }],
    ak: [['ozvena', 4], ['ticho', 3], ['bezny', 2], ['vzdalene_hlasy', 2], ['slabe_slyseni', 1.5], ['noc', 0, 'noc']],
  },
  dum: {
    kde: [
      { t: 'jsi v domě, v místnosti, kde je pacient' }, { t: 'jsi v domě, v předsíni' }, { t: 'jsi doma v kuchyni' }, { t: 'jsi doma v obýváku' }, { t: 'jsi v patře domu a chodíš k pacientovi', self: false },
      { t: 'jsi v ložnici' }, { t: 'jsi v domě u vchodových dveří' },
    ],
    ak: [['ticho', 6], ['bezny', 4], ['noc', 0, 'noc'], ['okno', 0.8], ['vzdalene_hlasy', 0.6], ['slabe_slyseni', 1], ['ozvena', 0.4], ['doprava', 0.5]],
  },
  zahrada: {
    kde: [{ t: 'jsi na zahradě u domu' }, { t: 'jsi na zahradě a telefon máš těsně u ucha', v: [10, 95] }, { t: 'jsi na terase nebo na zahradě u domu' }, { t: 'jsi na dvorku' }],
    ak: [['bezny', 4], ['priroda', 3], ['doprava', 1.2], ['vzdalene_hlasy', 0.6], ['slabe_slyseni', 1], ['ticho', 2]],
  },
  dvur: {
    kde: [{ t: 'jsi na dvoře u domu' }, { t: 'jsi před garáží nebo stodolou' }, { t: 'jsi na dvoře, kam sis vyšel(a), abys byl(a) lépe slyšet' }],
    ak: [['bezny', 4], ['priroda', 2], ['stroje', 0.5], ['doprava', 1], ['slabe_slyseni', 1], ['ticho', 2]],
  },
  pred_domem: {
    kde: [{ t: 'jsi před domem, venku', self: false }, { t: 'jsi před vchodem a vyhlížíš posádku', self: false }, { t: 'jsi venku u domu, protože tam máš lepší signál' }, { t: 'jsi před domem u silnice a čekáš, až někdo přijede', self: false }, { t: 'jsi venku, kousek od domu' }],
    ak: [['bezny', 4], ['doprava', 2.5], ['vzdalene_hlasy', 1], ['ticho', 2], ['slabe_slyseni', 1.2], ['priroda', 0.7], ['noc', 0, 'noc']],
  },
  ulice: {
    kde: [{ t: 'jsi na ulici u chodníku' }, { t: 'jsi na chodníku před domem' }, { t: 'jsi na ulici, kousek od místa, kde pacient je', self: false }, { t: 'jsi na ulici a stojíš u pacienta', self: false }, { t: 'jsi na veřejném prostranství v obci' }],
    ak: [['bezny', 4], ['doprava', 3], ['ruch_lidi', 1.2], ['vzdalene_hlasy', 1.6], ['ticho', 1.5], ['slabe_slyseni', 1.2], ['noc', 0, 'noc']],
  },
  silnice: {
    kde: [{ t: 'jsi u silnice, na krajnici' }, { t: 'jsi na místě u silnice a držíš si odstup od provozu' }, { t: 'stojíš na kraji silnice u cesty' }, { t: 'jsi u silnice a snažíš se mít signál' }],
    ak: [['doprava', 5], ['bezny', 2.5], ['ticho', 1], ['vzdalene_hlasy', 0.4], ['slabe_slyseni', 2], ['vetsi_prostor', 1], ['noc', 0, 'noc']],
  },
  auto: {
    kde: [{ t: 'sedíš v autě' }, { t: 'sedíš v autě zaparkovaném u cesty' }, { t: 'jsi ve vozidle a telefon máš na hlasitém odposlechu' }],
    ak: [['motor', 3], ['bezny', 3], ['ticho', 2], ['doprava', 2], ['slabe_slyseni', 2.2]],
  },
  zastavka: {
    kde: [{ t: 'jsi na zastávce nebo nádraží' }, { t: 'jsi na nástupišti' }, { t: 'jsi u zastávky u silnice' }],
    ak: [['doprava', 3], ['ruch_lidi', 2.5], ['bezny', 2], ['vzdalene_hlasy', 1.5], ['vetsi_prostor', 1], ['slabe_slyseni', 1], ['noc', 0, 'noc']],
  },
  obchod: {
    kde: [{ t: 'jsi v obchodě nebo prodejně' }, { t: 'jsi před obchodem u vchodu' }, { t: 'jsi v obchodě v uličce mezi regály' }, { t: 'jsi v provozovně za pultem', v: [18, 70] }],
    ak: [['ruch_lidi', 2.5], ['bezny', 4], ['vzdalene_hlasy', 2], ['ticho', 1.5], ['ozvena', 0.7], ['slabe_slyseni', 1]],
  },
  restaurace: {
    kde: [{ t: 'jsi v restauraci nebo hospodě' }, { t: 'jsi před hospodou venku' }, { t: 'jsi v restauraci, odešel(odešla) jsi kousek stranou' }, { t: 'jsi v provozovně u baru' }],
    ak: [['ruch_lidi', 4], ['vzdalene_hlasy', 2], ['bezny', 2], ['ticho', 0.6], ['doprava', 0.6], ['slabe_slyseni', 0.8]],
  },
  cerpadlo: {
    kde: [{ t: 'jsi u čerpací stanice' }, { t: 'jsi na parkovišti u benzínky' }, { t: 'jsi na odpočívadle u silnice' }],
    ak: [['doprava', 4], ['bezny', 3], ['vzdalene_hlasy', 0.8], ['slabe_slyseni', 1]],
  },
  provozovna: {
    kde: [{ t: 'jsi v provozovně nebo prodejně' }, { t: 'jsi před provozovnou u vchodu' }, { t: 'jsi na parkovišti u provozovny' }, { t: 'jsi uvnitř u pultu' }, { t: 'jsi v zázemí provozovny' }],
    ak: [['bezny', 4], ['ruch_lidi', 1.5], ['vzdalene_hlasy', 1.5], ['ticho', 1.5], ['doprava', 1.3], ['stroje', 0.6], ['ozvena', 0.7], ['slabe_slyseni', 1]],
  },
  prace: {
    kde: [{ t: 'jsi v práci, v kanceláři' }, { t: 'jsi v práci v dílně nebo hale' }, { t: 'jsi na pracovišti ve skladu' }, { t: 'jsi na pracovišti na chodbě' }, { t: 'jsi v provozu, kde pracuješ' }],
    ak: [['bezny', 4], ['stroje', 2], ['ticho', 2], ['vzdalene_hlasy', 2], ['ozvena', 1], ['slabe_slyseni', 1]],
  },
  skola: {
    kde: [{ t: 'jsi ve škole v kabinetu nebo ředitelně' }, { t: 'jsi ve škole na chodbě' }, { t: 'jsi ve školní třídě' }, { t: 'jsi na školním hřišti nebo dvoře' }],
    ak: [['bezny', 3], ['ticho', 3], ['deti', 2.5], ['ozvena', 1.5], ['vzdalene_hlasy', 1.2], ['slabe_slyseni', 0.8]],
  },
  sport: {
    kde: [{ t: 'jsi ve sportovní hale nebo tělocvičně' }, { t: 'jsi na hřišti nebo sportovišti' }, { t: 'jsi v recepci sportoviště nebo fitka' }, { t: 'jsi u bazénu nebo koupaliště' }],
    ak: [['bezny', 3], ['ozvena', 2], ['ruch_lidi', 1.5], ['vetsi_prostor', 1.5], ['voda', 1], ['vzdalene_hlasy', 1.2], ['ticho', 1]],
  },
  ubytovani: {
    kde: [{ t: 'jsi v hotelu nebo penzionu na recepci' }, { t: 'jsi na pokoji hotelu nebo penzionu' }, { t: 'jsi na chodbě ubytování' }, { t: 'jsi před ubytováním venku' }],
    ak: [['bezny', 4], ['ticho', 3], ['ozvena', 1.2], ['vzdalene_hlasy', 1.5], ['doprava', 0.8], ['slabe_slyseni', 1], ['noc', 0, 'noc']],
  },
  zarizeni: {
    kde: [{ t: 'jsi v zařízení u pacienta na pokoji' }, { t: 'jsi na sesterně' , pro: true }, { t: 'jsi na chodbě zařízení' }, { t: 'jsi ve společenské místnosti zařízení' }, { t: 'jsi v ambulanci nebo ordinaci' }, { t: 'jsi u pacienta v pokoji, dveře jsou přivřené' }],
    ak: [['ticho', 3], ['bezny', 3], ['pristroje', 2], ['ozvena', 1.4], ['vzdalene_hlasy', 2.2], ['noc', 0, 'noc'], ['slabe_slyseni', 0.7]],
  },
  verejna_budova: {
    kde: [{ t: 'jsi ve veřejné budově ve vstupní hale' }, { t: 'jsi před budovou před vchodem' }, { t: 'jsi na chodbě úřadu nebo instituce' }],
    ak: [['ozvena', 3], ['bezny', 3], ['vzdalene_hlasy', 2], ['ruch_lidi', 1], ['ticho', 1.5], ['slabe_slyseni', 1]],
  },
  odlehle: {
    kde: [{ t: 'jsi v lese nebo v poli, daleko od zástavby' }, { t: 'jsi na polní nebo lesní cestě' }, { t: 'jsi na turistické trase' }, { t: 'jsi v terénu mimo obec' }, { t: 'jsi u rybníka nebo na louce' }],
    ak: [['priroda', 5], ['ticho', 2], ['bezny', 2], ['slabe_slyseni', 3], ['vetsi_prostor', 1.5]],
  },
};

// ---------- PROJEV: jak se akustická okolnost promítne do hovoru (výchozí = nijak) ----------
const PROJEV = {
  nic: { w: 54, pokyn: 'Okolí nijak nekomentuješ a nezmiňuješ; calltaker by o něm vůbec nemusel vědět.' },
  pozadi: { w: 20, pokyn: 'Zvuk jen přirozeně zní v pozadí; nepopisuješ ho ani nezmiňuješ (v textovém hovoru nic nepíšeš).' },
  hlas: { w: 10, pokyn: 'Okolí ti jednou krátce změní hlas (na chvíli ztišíš nebo zvýšíš hlas, odmlčíš se, popojdeš dál od zdroje); bez komentáře nebo jedním slovem.' },
  prepslech: { w: 7, pokyn: 'Jednou přeslechneš slovo nebo otázku kvůli okolí a necháš si ji zopakovat; potom už zase normálně.' },
  zminka: { w: 6, pokyn: 'Okolí zmíníš nanejvýš jednou, jen když to z hovoru přirozeně vyplyne (třeba „slyšíte mě?“ nebo „kde přesně jste?“), vlastními slovy; nikdy ne jako úvodní věta a nikdy jako naučená fráze.' },
  presun: { w: 4, pokyn: 'V průběhu hovoru se kousek přesuneš (blíž k pacientovi, ven nebo na klidnější místo) a hlas se na chvíli změní; neříkej to, jen to uslyšíš.' },
};
const TYP_PRESUN_OK = new Set(['byt', 'dum', 'chodba', 'prace', 'obchod', 'restaurace', 'skola', 'zarizeni', 'ubytovani', 'verejna_budova', 'sport']);

// ---------- POČASÍ: jen z dat hovoru (wx = { wind [kt], gust [kt], precip [mm/h], snow, temp [°C] }); jinak vůbec ----------
function pocasiFor(rnd, x, mistoId) {
  const w = x.wx; if (!w || !VENKU.has(mistoId)) return null;
  const cand = [], wind = Math.max(+w.wind || 0, (+w.gust || 0) * 0.7);
  if (wind >= 18) cand.push({ id: 'vitr', pokyn: wind >= 26 ? 'Je silný vítr a šumí do mikrofonu; občas ti vítr „spolkne“ slovo. Zmíníš ho jen když ti nerozumějí nebo se zeptají, ne jako úvod.' : 'Vítr trochu šumí do mikrofonu. Nezmiňuješ ho, pokud se nezeptají nebo ti není rozumět.' });
  if ((+w.snow || 0) >= 0.3) cand.push({ id: 'snih', pokyn: 'Sněží. Slyšet je to jen v tom, že jsi venku a hlas máš mírně chvějivý zimou; nezmiňuješ to, pokud se nezeptají.' });
  else if ((+w.precip || 0) >= 0.8) cand.push({ id: 'dest', pokyn: 'Prší a kapky šumí; mluvíš o něco hlasitěji. Zmíníš to jen když ti nerozumějí nebo se zeptají, ne jako úvod.' });
  if ((+w.temp || 0) <= -8) cand.push({ id: 'mraz', pokyn: 'Je velký mráz, mluvíš lehce přerývaně a občas ti drkotají zuby. Nezmiňuješ to, pokud se nezeptají.' });
  if (!cand.length || rnd() > 0.22) return null;   // i při vhodném počasí se prosadí jen zřídka (a jako zvuk, ne jako věta)
  return pick(rnd, cand);
}

// podmístnost a prostředí z dat případu; vrací id místa
function urciMisto(rnd, x) {
  const place = nrm(x.place), where = x.where, kat = katJmeno(x.addr) || x.poiKat || null;   // název provozovny má přednost, jinak skupina POI (sport, ubytovani, skola, prov, verejne)
  if (/v aute|\bauto\b|ve vozidle/.test(place)) return 'auto';
  if (where === 'silnice') return 'silnice';   // popis místa z generátoru u silnice a terénu bývá šum („na zahradě“, „před domem“): neberou se
  if (where === 'priroda') return 'odlehle';
  if (/zahrad/.test(place)) return 'zahrada';
  const katMap = { skola: 'skola', sport: 'sport', ubytovani: 'ubytovani', zastavka: 'zastavka', cerpadlo: 'cerpadlo', restaurace: 'restaurace', obchod: 'obchod', verejna_budova: 'verejna_budova', prov: 'provozovna', verejne: 'ulice' };
  if (where === 'ulice' && kat && katMap[kat]) return katMap[kat];
  if (where === 'prov') return kat && katMap[kat] ? katMap[kat] : 'prace';
  if (/pred domem|venku|na ulici|pocka|ceka|mavat|u silnice/.test(place) && ['rd', 'byt', 'ulice', 'domov'].includes(where)) return 'pred_domem';
  if (where === 'byt') return !x.self && x.vek < 80 && rnd() < 0.16 ? 'chodba' : 'byt';
  if (where === 'rd') { const r = rnd(); return r < 0.08 ? 'zahrada' : r < 0.14 ? 'dvur' : 'dum'; }
  if (['domov', 'ordinace', 'zz'].includes(where)) return 'zarizeni';
  if (where === 'skola') return 'skola';
  if (where === 'ulice') return kat && katMap[kat] ? katMap[kat] : 'ulice';
  return 'byt';
}

function build(rnd, x) {
  x = x || {};
  const hodina = Number.isFinite(x.hour) ? x.hour : null, cas = casDne(hodina);
  const id = urciMisto(rnd, x), M = MISTA[id] || MISTA.byt;
  const vekOk = k => !k.v || (x.vek >= k.v[0] && x.vek <= k.v[1]);
  let kdeList = M.kde.filter(k => vekOk(k) && (x.self ? k.self !== false : true) && (x.pro ? true : !k.pro) && (!x.jinde || !/pacient/.test(k.t)));   // volající odjinud je doma, ne u pacienta
  if (!kdeList.length) kdeList = M.kde.filter(k => !k.pro);
  const kde = pick(rnd, kdeList).t;
  // akustika: váhy podle místa; noční klid jen v noci a uvnitř; velké hluky se u rozrušených lidí nezdůrazňují
  const ak = wpick(rnd, M.ak, a => (a[2] === 'noc' ? (noc(hodina) && !VENKU.has(id) ? 5 : 0) : (noc(hodina) && ['ruch_lidi', 'deti', 'stroje'].includes(a[0]) ? a[1] * 0.1 : a[1])));
  const aid = ak ? ak[0] : 'bezny', A = AK[aid];
  const pocasi = pocasiFor(rnd, x, id);
  const zvuk = { id: aid, popis: pick(rnd, A.v) };
  // projev: bez slyšitelného zvuku se nic neprojeví; u silně rozrušených a u profesionálů je okolí v hovoru méně vidět
  const klidne = !A.zvuk && !pocasi;
  let projev;
  if (klidne) projev = 'nic';
  else if (pocasi) projev = 'pozadi';
  else {
    const stres = Number.isFinite(x.stres) ? x.stres : 1;
    projev = wpick(rnd, Object.keys(PROJEV), k => {
      let w = PROJEV[k].w;
      if (k === 'prepslech' && !(A.hluk >= 2 || A.tel)) w = 0;
      if (k === 'prepslech' && x.sluch > 0) w *= 0.5;
      if (k === 'presun' && (!TYP_PRESUN_OK.has(id) || x.self)) w = 0;
      if (k === 'zminka') w *= stres >= 3 ? 0.3 : x.pro ? 0.4 : ['svedek_nezna', 'turista', 'senior_technofob'].includes(x.typ) ? 1.6 : 1;
      if (k === 'hlas' && !(A.hluk >= 1)) w *= 0.4;
      if (k === 'nic') w *= stres >= 3 ? 1.4 : 1;
      return w;
    });
  }
  const pj = pocasi ? { id: 'pocasi', pokyn: pocasi.pokyn } : { id: projev, pokyn: PROJEV[projev].pokyn };
  const rad = ['Kde jsi: ' + kde + '.', 'Zvuky kolem: ' + zvuk.popis + '.', 'Jak se to projeví: ' + pj.pokyn];
  if (!x.wx) rad.push('O počasí nic nevíš: nezmiňuješ vítr, déšť, zimu ani horko.');
  rad.push('Okolí bereš jako samozřejmost: nepopisuješ ho, dokud to nevyplyne z hovoru. Nevymýšlej další hluky, osoby ani zvířata.');
  return { misto: { id, kde }, zvuk, projev: { id: pj.id, pokyn: pj.pokyn }, cas, pocasi: pocasi ? { id: pocasi.id } : null, text: rad.join(' ') };
}
const api = { build, urciMisto, katJmeno, MISTA, AK, PROJEV, pocasiFor, VENKU };
if (typeof module !== 'undefined') module.exports = api; else window.CT_OKOLNOSTI = api;
