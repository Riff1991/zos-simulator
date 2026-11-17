// Typy volajících a „ovladače“ chování. Vybírá se podle věku volajícího, vztahu, místa a stavu pacienta.
// Výstup (persona) je čistý JSON: typ, popis, styl hlasu, stres 0–3, spolupráce 0–3, znalost adresy 1–3, povídavost 0–3, sluch 0–2,
// věkové pásmo, popis hlasu podle věku a pohlaví, slovník, prostředí, jazyk (cizinci). Deterministické z rnd().
const BANDS = [
  { id: 'dite', max: 12, nazev: 'dítě' }, { id: 'teen', max: 17, nazev: 'dospívající' }, { id: 'mlady', max: 29, nazev: 'mladý dospělý' },
  { id: 'stredni', max: 49, nazev: 'dospělý středního věku' }, { id: 'starsi', max: 64, nazev: 'starší dospělý' },
  { id: 'senior1', max: 74, nazev: 'mladší senior' }, { id: 'senior2', max: 84, nazev: 'senior' }, { id: 'senior3', max: 200, nazev: 'velmi starý člověk' },
];
const bandOf = age => BANDS.find(b => age <= b.max) || BANDS[3];
// jak má hlas znít podle věkového pásma a pohlaví (pokyn pro hlasový model)
const HLAS = {
  dite: { Ž: 'vysoký tenký dívčí hlas, rychle a přerývaně, nedokončené věty, jednoduchá slova, nadechuješ se a popotahuješ', M: 'vysoký chlapecký hlas, rychle a přerývaně, nedokončené věty, jednoduchá slova, popotahuješ' },
  teen: { Ž: 'světlý mladý hlas, rychlé tempo, nejistota, občas se hlas zlomí nebo ztiší; občas slang („fakt“, „jako“)', M: 'mladý, občas se lámající hlas, rychlé tempo, nejistota; občas slang („vole“ jen v šoku, „fakt“, „jako“)' },
  mlady: { Ž: 'mladý energický ženský hlas, rychlejší tempo, moderní hovorová čeština', M: 'mladý energický mužský hlas, rychlejší tempo, moderní hovorová čeština, krátké věty' },
  stredni: { Ž: 'zralý ženský hlas, běžné tempo', M: 'zralý mužský hlas, běžné tempo, hlubší' },
  starsi: { Ž: 'o něco hlubší, mírně chraplavý ženský hlas, klidnější tempo, občas odkašlání', M: 'hlubší, mírně chraplavý mužský hlas, klidnější tempo, občas odkašlání' },
  senior1: { Ž: 'starší paní: trochu vyšší a slabší hlas, pomalejší tempo, slyšitelné nadechování, občas zakašleš nebo se odmlčíš a hledáš slovo', M: 'starší pán: chraplavý, hlubší a unavený hlas, pomalejší tempo, slyšitelné nadechování, občas zakašleš, odkašlání před odpovědí' },
  senior2: { Ž: 'stará paní: vyšší, slabší a lehce chvějící se hlas, pomalé tempo, delší pauzy a hledání slov, slyšitelné nadechování uprostřed vět, mluvíš téměř šeptavě a občas se zadýcháš; zubní protéza dělá lehké šeptání v „s“ a „š“', M: 'starý pán: chraplavý, slabý a chvějící se hlas, pomalé tempo, delší pauzy a hledání slov, slyšitelné dýchání a odkašlávání, občas zadýchaně; mluvíš pomalu a monotónně' },
  senior3: { Ž: 'velmi stará paní: velmi slabý, zlomený a třesoucí se hlas, velmi pomalé tempo, dlouhé pauzy, krátké věty, časté nadechování, občas ztratíš nit a opakuješ věty', M: 'velmi starý pán: velmi slabý, chraplavý a zlomený hlas, velmi pomalé tempo, dlouhé pauzy, krátké věty, časté nadechování a odkašlávání, občas ztratíš nit a opakuješ věty' },
};
// slovník a oslovení podle pásma (hovorová jihočeská čeština, u starších i lehce nářeční)
const SLOVNIK = {
  dite: 'jednoduchá dětská slova („maminka“, „pán“, „leží a nehýbe se“), neznáš odborné výrazy ani adresu, voláš „pane“, „paní“',
  teen: 'hovorově, krátké věty, občas slang; oslovuješ „dobrý den“, ale rychle přejdeš na „jo“, „no“, „jako“; odborné výrazy neznáš',
  mlady: 'moderní hovorová čeština, krátké věty, občas anglicismus („sorry“, „okay“), rychle jdeš k věci',
  stredni: 'běžná hovorová čeština, věcně',
  starsi: 'klidná hovorová čeština, občas „prosím vás“',
  senior1: 'zdvořile, trochu archaicky („prosím vás“, „pane“, „jo“ místo „ano“), laické pojmy („cukr“, „tlak“, „mrtvice“, „srdíčko“); lehce nářečně, např. „voni“, „vobchod“, „dyť“, „néé“',
  senior2: 'velmi zdvořile a pomalu („pane doktore“, „holenku“, „prosím vás hezky“), laické pojmy, lehce nářečně („voni“, „dyť“, „vopravdu“, „néé“), čísla a časy zaměňuješ, ptáš se „cože?“',
  senior3: 'jednoduché zdvořilé věty („prosím vás“, „pane“), nářečně („voni“, „dyť“), pletou se ti časy, dny i jména, občas se ptáš „co jste řekl?“',
};
const PROSTREDI = {
  doma: ['doma je ticho', 'doma je zapnutá televize a musíš ji ztlumit', 'doma štěká pes', 'v pozadí křičí děti', 'v pozadí hraje rádio', 'telefon máš na hlasitý odposlech a hlas zní vzdáleně'],
  venku: ['venku hučí auta, špatně se slyší', 'venku fouká silný vítr', 'prší a je hluk, mluvíš hlasitěji', 'okolo stojí lidé a mluví přes sebe'],
  prace: ['jsi v práci a hučí stroje', 'jsi v kanceláři a okolo je ticho', 'okolo je hluk a lidé volají přes sebe'],
  skola: ['okolo je hluk dětí na chodbě', 'jsi v ředitelně, ticho'],
  zarizeni: ['jsi na pokoji, okolo je ticho', 'na chodbě je rušno, lidé se baví'],
};
const JAZYKY = [
  { id: 'ukrajinsky', popis: 'ukrajinsky mluvící osoba: lámaná čeština s ukrajinským přízvukem, jednoduchá slova, občas ukrajinské slovo', w: 3 },
  { id: 'slovensky', popis: 'Slovák: mluvíš slovensky se slovenskými slovy, rozumíš česky', w: 2 },
  { id: 'vietnamsky', popis: 'občan Vietnamu: lámaná čeština, velmi jednoduchá slova, ptáš se na zopakování', w: 1 },
  { id: 'nemecky', popis: 'německý turista: lámaná čeština, doplňuješ německými slovy, adresu hláskuješ', w: 2 },
  { id: 'anglicky', popis: 'cizinec, který umí jen pár českých slov a zbytek říká anglicky; mluvíš pomalu a jednoduše', w: 1 },
  { id: 'polsky', popis: 'Polák: čeština s polským přízvukem, občas polské slovo', w: 1 },
];
// archetypy: when(x) rozhoduje o výskytu; s = rozsah stresu, sp = rozsah spolupráce, po = povídavost, su = sluch (0 dobrý, 2 velmi špatný)
const ARCH = [
  { id: 'vecny', w: 3, s: [0, 1], sp: [2, 3], po: [1, 2], popis: 'věcný, klidný, odpovídá stručně a k věci', styl: 'klidně, normálním tempem' },
  { id: 'panika', w: 3, s: [3, 3], sp: [1, 2], po: [2, 3], when: x => !x.pro, popis: 'vyděšený, mluví v útržcích, opakuje „pospěšte si“, často odbíhá od tématu', styl: 'rychle, zadýchaně, hlas se ti třese, v útržcích' },
  { id: 'rozcileny', w: 2, s: [2, 3], sp: [1, 2], po: [2, 3], when: x => !x.pro, popis: 'rozčilený a netrpělivý, ptá se proč tolik otázek a kdy už někdo přijede', styl: 'zvýšeným hlasem, ostře a netrpělivě' },
  { id: 'vagni', w: 2, s: [1, 2], sp: [2, 2], po: [0, 1], popis: 'nejistý a vágní, odpovídá „no… asi… nevím“, nesděluje podstatné samo od sebe', styl: 'váhavě, s pauzami a „no…“, tišeji' },
  { id: 'plac', w: 1, s: [3, 3], sp: [1, 2], po: [1, 2], when: x => !x.pro, popis: 'v slzách, těžko se uklidňuje, odpovídá s odstupem', styl: 'přerývaně, vzlykavě, dusíš pláč' },
  { id: 'opily', w: 1, s: [1, 2], sp: [1, 2], po: [2, 3], when: x => !x.pro && x.vek >= 18 && x.vek < 75 && ['domov', 'rd', 'byt', 'ulice', 'prov'].includes(x.where), popis: 'podnapilý, zmatený, mluví nesouvisle, adresu zná jen přibližně', styl: 'rozmazaně, pomalu, zadrháváš se' },
  { id: 'nespolupracujici', w: 1, s: [1, 3], sp: [0, 1], po: [0, 1], when: x => x.vek >= 16, popis: 'odmítá odpovídat na část otázek („to vám nepovím“, „už jedou?“), zavěsí, když se ptá moc', styl: 'odmítavě a podrážděně' },
  { id: 'hovorny', w: 2, s: [0, 2], sp: [2, 3], po: [3, 3], when: x => x.vek >= 30 && !x.pro, popis: 'povídavý, odbíhá k vedlejším věcem (co kdo dělal včera, kdo je kdo v rodině), calltaker ho musí vracet k věci', styl: 'plynule a ukecaně, bez pauz, odbočky' },
  { id: 'flegmatik', w: 1, s: [0, 0], sp: [2, 3], po: [0, 1], when: x => x.vek >= 25, popis: 'podivně klidný, bere to s nadhledem, bagatelizuje vážnost', styl: 'ploše a pomalu, bez emocí' },
  { id: 'ustarany', w: 2, s: [2, 3], sp: [2, 3], po: [2, 3], when: x => x.rodina, popis: 'ustaraný blízký člověk, ptá se „bude v pořádku?“, vyptává se na vše, bojí se', styl: 'napjatě a starostlivě, hlas se chvěje' },
  { id: 'soc', w: 2, s: [3, 3], sp: [1, 2], po: [0, 1], when: x => x.tezky, popis: 'v šoku, ztuhlý, odpovídá se zpožděním, opakuje poslední slova calltakera', styl: 'plochým, zadrhávajícím hlasem, dlouhé pauzy' },
  { id: 'svedek_nezna', w: 3, s: [1, 3], sp: [2, 3], po: [1, 2], when: x => x.venku && x.svedek, popis: 'náhodný svědek, nezná místo, popisuje okolí (cedule, kostel, pole, benzínka) a neví číslo domu ani obec jistě', styl: 'zadýchaně, rozhlíží se, odpovídá „počkejte, kouknu“' },
  { id: 'turista', w: 1, s: [1, 2], sp: [2, 3], po: [1, 2], when: x => x.venku && x.svedek && x.vek < 70, popis: 'turista, neorientuje se, čte údaje z mapy v mobilu nebo z tabule a plete pořadí názvů', styl: 'rozhlíží se, nejistě čte názvy' },
  { id: 'cizinec', w: 1.5, s: [1, 3], sp: [2, 3], po: [1, 2], when: x => x.vek >= 14 && !x.pro, popis: 'cizinec, česky mluví lámaně a jednoduše, adresu hláskuje špatně', styl: 'lámanou češtinou s cizím přízvukem, jednoduchými slovy', cizi: true },
  { id: 'profesional', w: 5, s: [0, 1], sp: [3, 3], po: [0, 1], when: x => x.pro, popis: 'profesionál (zdravotník, policista, hasič, personál zařízení): stručný, používá odborné pojmy a ví přesné údaje, odpovídá na jednu otázku jednou větou', styl: 'rychle, věcně, odborně a stručně' },
  { id: 'dite', w: 6, s: [2, 3], sp: [2, 3], po: [1, 2], when: x => x.vek < 13, popis: 'dítě, bojí se, říká jen to, co vidí, neví adresu přesně a nerozumí odborným otázkám', styl: 'vysokým dětským hlasem, vystrašeně, jednoduchými slovy' },
  { id: 'teen', w: 4, s: [1, 3], sp: [2, 3], po: [1, 2], when: x => x.vek >= 13 && x.vek <= 19, popis: 'dospívající, nejistý, bojí se zodpovědnosti, mluví rychle, adresu zná jen přibližně, hned se ptá, jestli se někdo zlobí', styl: 'rychle a nejistě, občas se hlas zlomí' },
  { id: 'mlady_spech', w: 1.5, s: [1, 2], sp: [2, 3], po: [1, 1], when: x => x.vek >= 20 && x.vek <= 35 && !x.pro, popis: 'mladý a rychlý, spěchá, krátce odpovídá, občas anglicismus, chce hned vědět, co má dělat', styl: 'rychle a úsečně' },
  { id: 'pacient_dusnost', w: 6, s: [2, 3], sp: [2, 3], po: [0, 0], when: x => x.self && x.dusnost, popis: 'pacient sám, nemůže se nadechnout: mluví po jednom či dvou slovech, nadechuje se uprostřed vět, nedokáže odpovídat dlouze', styl: 'po slovech, mezi nimi slyšitelně lapáš po dechu' },
  { id: 'pacient_slaby', w: 3, s: [1, 3], sp: [2, 3], po: [0, 1], when: x => x.self && x.vek >= 45, popis: 'pacient sám, cítí se strašně slabý, mluví slabě, tiše, občas se odmlčí', styl: 'slabě, pomalu, tiše' },
  { id: 'pacient_bolest', w: 3, s: [2, 3], sp: [2, 3], po: [0, 1], when: x => x.self && !x.dusnost, popis: 'pacient sám v silné bolesti, steny mezi větami, odpovídá krátce', styl: 'se steny a přerývaným dechem' },
  { id: 'pacient_neuro', w: 4, s: [2, 3], sp: [2, 3], po: [0, 1], when: x => x.self && x.neuro, popis: 'pacient sám s poruchou řeči: slova jsou zkomolená, pomalá a nezřetelná, hledá slova, vynechává slabiky', styl: 'nezřetelně, rozmazaně, pomalu, zkomolená slova' },
  { id: 'senior_klidny', w: 3, s: [0, 1], sp: [2, 3], po: [1, 2], when: x => x.vek >= 65, popis: 'klidný senior, mluví pomalu a zdvořile, odpovídá přesně, ale pomalu, k adrese potřebuje chvíli přemýšlet', styl: 'pomalu a zdvořile, stařeckým hlasem' },
  { id: 'senior_nahluchly', w: 3, s: [1, 2], sp: [2, 3], po: [1, 2], su: [1, 2], when: x => x.vek >= 70, popis: 'nedoslýchavý senior: často se ptá „cože?“, „jak?“, nerozumí otázkám napoprvé, mluví nahlas, čísla a názvy slyší špatně', styl: 'nahlas, pomalu, často „cože?“' },
  { id: 'senior_zmateny', w: 2, s: [2, 3], sp: [1, 2], po: [1, 2], when: x => x.vek >= 72, popis: 'zmatený senior: plete si čas, den i jména, neví přesně, kde je ani co se stalo, odbíhá', styl: 'zmateně, pomalu, s odbočkami' },
  { id: 'senior_osamely', w: 2, s: [0, 2], sp: [2, 3], po: [3, 3], when: x => x.vek >= 70, popis: 'osamělý senior, rád si povídá, vypráví o rodině a nemocech a odbíhá k příběhům, calltaker ho musí vracet k věci', styl: 'vlídně, rozvláčně a pomalu' },
  { id: 'senior_pecujici', w: 4, s: [2, 3], sp: [2, 3], po: [1, 2], when: x => x.vek >= 65 && x.partner, popis: 'senior pečující o nemocného partnera: je sám rozrušený, hůř se mu stojí, bojí se, že partnera ztratí, nevidí na čísla', styl: 'třesoucím se, unaveným hlasem, přerývaně' },
  { id: 'senior_technofob', w: 2, s: [1, 2], sp: [2, 3], po: [1, 2], when: x => x.vek >= 70, popis: 'senior, který neumí zacházet s telefonem: neví, jak ztlumit či zesílit, ptá se, jestli ho slyšíte, hledá brýle a čísla, nerozumí, kdy má mluvit', styl: 'pomalu, nejistě, často „slyšíte mě?“' },
  { id: 'senior_domaha_se', w: 1.5, s: [2, 3], sp: [1, 2], po: [2, 3], when: x => x.vek >= 65, popis: 'senior, který se dožaduje „pana doktora“, stěžuje si, že minule dlouho čekal, a nechce odpovídat na „zbytečné“ otázky', styl: 'rozčileně, ale slabým hlasem' },
  { id: 'senior_vylekany', w: 2, s: [2, 3], sp: [2, 3], po: [0, 1], when: x => x.vek >= 65, popis: 'vylekaný senior, mluví tiše a roztřeseně, krátce, bojí se, že obtěžuje', styl: 'tiše a roztřeseně' },
  { id: 'dospely_rodic_seniora', w: 3, s: [2, 3], sp: [2, 3], po: [2, 3], when: x => x.vek >= 45 && x.vek < 70 && x.dospelyDite, popis: 'dospělé dítě volající za rodiče: unavené, ustaraně vyptávající, pracuje a volá na dálku, nezná přesný stav rodiče', styl: 'ustaraně a spěšně' },
];
function pickPersona(rnd, c) {
  const rel = String(c.oznRel || ''), self = /pacient sám/.test(rel), vek = Number.isFinite(c.oznAge) ? c.oznAge : (self ? c.age : 40);
  const sex = c.oznSex === 'M' ? 'M' : c.oznSex === 'Ž' ? 'Ž' : (/á$/.test(String(c.ozn || '').trim().split(/\s+/).pop()) ? 'Ž' : 'M');
  const up = String(c.up || ''), where = c.where;
  const x = {
    vek, where, self, sex,
    pro: /PČR|HZS|operátor|lékař|sestra|ošetřovatel|pečovatelka|personál|učitel|vedoucí|kolega|kolegyně|školník/i.test(rel),
    rodina: /manžel|manželka|matka|otec|dcera|syn|pečovatelka/.test(rel),
    partner: /manžel|manželka/.test(rel),
    dospelyDite: /dcera|syn/.test(rel),
    venku: ['ulice', 'silnice', 'priroda'].includes(where),
    svedek: /kolemjdoucí|svědek|svědkyně/.test(rel),
    tezky: c.n === 1 || /nedýchá|bezvědomí|nehoda|zavalen|oběšen|tonutí/i.test(up + ' ' + (c.klasif || '')),
    dusnost: /dušnost|nemůže mluvit|říci pouze|nedostatek vzduchu/i.test(up),
    neuro: /řeč|CMP|afázie|dysartrie|asymetrie obličeje|pokles koutku/i.test(up),
  };
  const pool = ARCH.filter(a => !a.when || a.when(x));
  const tot = pool.reduce((s, a) => s + a.w, 0); let r = rnd() * tot, ch = pool[0];
  for (const a of pool) { r -= a.w; if (r <= 0) { ch = a; break; } }
  const lvl = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const adresa = x.venku ? lvl(1, 2) : ['opily', 'dite', 'cizinec', 'teen', 'turista', 'svedek_nezna', 'senior_zmateny'].includes(ch.id) ? lvl(1, 2) : lvl(2, 3);
  const band = bandOf(vek);
  const jaz = ch.cizi ? (() => { let t = rnd() * JAZYKY.reduce((s, j) => s + j.w, 0); for (const j of JAZYKY) { t -= j.w; if (t <= 0) return j; } return JAZYKY[0]; })() : null;
  return {
    typ: ch.id, popis: ch.popis, styl: ch.styl, stres: lvl(ch.s[0], ch.s[1]), spoluprace: lvl(ch.sp[0], ch.sp[1]), znalostAdresy: adresa,
    povidavost: lvl(ch.po[0], ch.po[1]), sluch: ch.su ? lvl(ch.su[0], ch.su[1]) : 0,
    vekVolajiciho: vek, pasmo: band.id, pasmoNazev: band.nazev, pohlaviVolajiciho: sex === 'M' ? 'muž' : 'žena',
    hlas: HLAS[band.id][sex], slovnik: SLOVNIK[band.id], prostredi: (list => list[lvl(0, list.length - 1)])(PROSTREDI[x.venku ? 'venku' : where === 'prov' ? 'prace' : where === 'skola' ? 'skola' : ['domov', 'ordinace', 'zz'].includes(where) ? 'zarizeni' : 'doma']), jazyk: jaz ? jaz.popis : '',
  };
}
if (typeof module !== 'undefined') module.exports = { pickPersona, ARCH, BANDS, bandOf, HLAS, JAZYKY }; else window.CT_PERSONAS = { pickPersona, ARCH, BANDS, bandOf, HLAS, JAZYKY };
