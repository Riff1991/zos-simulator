// Datové zprávy od složek IZS: HZS (KOPIS, linka 150/112), PČR (OS KŘP, linka 158), eCall přes TCTV 112.
// Texty se skládají z mnoha částí podle typu události a fáze zásahu; engine hlídá, aby se neopakovaly.
// Vše je smyšlené, jednotky a obce se odvozují od místa události.
const ZOS_EXTMSG = (function () {
  const HZS_ST = ['České Budějovice', 'Tábor', 'Písek', 'Strakonice', 'Jindřichův Hradec', 'Prachatice', 'Český Krumlov', 'Dačice', 'Milevsko', 'Třeboň', 'Týn nad Vltavou', 'Trhové Sviny', 'Vimperk', 'Blatná', 'Kaplice', 'Soběslav', 'Vodňany', 'Volary'];
  const SRC = { hzs: ['DZ HZS · KOPIS JčK', 'DZ 150 · KOPIS HZS', 'KOPIS HZS JčK'], pcr: ['DZ PČR · OS KŘP JčK', 'DZ 158 · OS PČR', 'OS KŘP JčK'], ecall: ['eCall · TCTV 112'], tctv: ['DZ 112 · TCTV JčK', 'TCTV 112'] };
  const COLORS = ['bílá', 'černá', 'stříbrná', 'šedá', 'modrá', 'červená', 'zelená', 'tmavě modrá', 'vínová', 'béžová', 'žlutá', 'oranžová'];
  const CARS = ['OA', 'OA', 'OA', 'OA', 'dodávka', 'SUV', 'OA kombi', 'pick-up', 'OA s přívěsem'];
  const HEAVY = ['nákladní vozidlo', 'kamion s návěsem', 'traktor s vlekem', 'autobus', 'cisterna', 'sklápěč', 'zemědělský stroj'];
  const TWO = ['motocykl', 'skútr', 'cyklista', 'elektrokoloběžka', 'moped', 'čtyřkolka'];
  const DIRS = ['na', 've směru na', 'směr'];
  const pickF = (r, a) => a[Math.floor(r() * a.length)];
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const maybe = (r, p, s) => (r() < p ? s : '');
  const join = parts => parts.filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
  const cap = s => s ? s[0].toLocaleUpperCase('cs-CZ') + s.slice(1) : s;

  function nearestSt(ctx) { // nejbližší stanice HZS podle názvu obce (zjednodušeně), jinak náhodná okolní
    if (HZS_ST.includes(ctx.town)) return ctx.town;
    return ctx.hzsNear || pickF(ctx.r, HZS_ST);
  }
  function units(ctx, heavy) {
    const r = ctx.r, st = nearestSt(ctx), u = [];
    const tech = heavy ? pickF(r, ['CAS 20 + RZA', 'CAS 30 + VYA', 'CAS 20, RZA', 'CAS 30, CAS 20, RZA', 'RZA + CAS 20']) : pickF(r, ['CAS 20', 'CAS 30', 'CAS 20 + VEA', 'RZA', 'CAS 20 + DA']);
    u.push(`HZS PS ${st} (${tech})`);
    if (r() < 0.6 && ctx.town && ctx.town !== st) u.push(`JSDH ${ctx.town}${maybe(r, 0.5, ' (' + pickF(r, ['CAS 20', 'DA-L1Z', 'CAS 32', 'DA']) + ')')}`);
    if (heavy && r() < 0.3) u.push(`HZS PS ${pickF(r, HZS_ST.filter(x => x !== st))} – ${pickF(r, ['VYA', 'AZ 30', 'TA', 'jeřáb', 'VEA'])}`);
    return u.join(', ');
  }
  function patrol(ctx, traffic) {
    const r = ctx.r, t = ctx.town || 'obce';
    if (traffic && r() < 0.55) return pickF(r, [`hlídka DI ${ctx.okres || t}`, `dopravní inspektorát ${ctx.okres || t}`, `hlídka DI`]);
    return pickF(r, [`hlídka OOP ${t}`, `hlídka OOP ${t}`, `hlídka PMJ`, `hlídka OOP ${t} a PMJ`, `motohlídka`, ctx.big ? `MP ${t}` : `hlídka OOP ${t}`]);
  }
  const eta = r => `${pickF(r, ['ETA', 'dojezd', 'předpokládaný příjezd'])} ${ri(r, 3, 15)} min`;

  // ---------- dopravní nehoda ----------
  function dn(ctx) {
    const r = ctx.r, heavy = r() < 0.18, two = !heavy && r() < 0.2;
    const car = () => `${pickF(r, CARS)} (barva ${pickF(r, COLORS)})`;
    const v1 = car(), v2 = heavy ? pickF(r, HEAVY) : two ? pickF(r, TWO) : car();
    const single = r() < 0.38;
    const what = single ? `${v1} – ${pickF(r, ['mimo vozovku', 'v příkopu', 'na střeše v poli', 'náraz do stromu', 'náraz do sloupu', 'na boku v protisměru', 'v potoce', 'náraz do svodidel', 'sjetí ze srázu', 'náraz do zídky', 'přes zábradlí mostu', 'náraz do zastávky'])}`
      : pickF(r, [`střet 2 vozidel: ${v1} × ${v2}`, `čelní střet: ${v1} × ${v2}`, `boční střet: ${v1} × ${v2}`, `srážka na křižovatce: ${v1} × ${v2}`, `náraz zezadu: ${v1} × ${v2}`, `řetězová nehoda ${ri(r, 3, 5)} vozidel`, `${v2} × ${v1}, ${pickF(r, ['střet při předjíždění', 'střet v zatáčce', 'nedání přednosti'])}`]);
    const where = pickF(r, [ctx.addr, `${ctx.addr}, ${pickF(r, DIRS)} ${ctx.dirTown || ctx.town}`, `${ctx.addr}, km ${ri(r, 2, 48)}`]);
    const out = [];
    const trapped = ctx.trapped;
    const persons = ctx.patientCount > 1 ? `${ctx.patientCount} zranění` : pickF(r, ['1 zraněný', 'zraněná 1 osoba', 'počet zraněných neznámý', 'zatím 1 zraněný, další se ověřují', 'osoby se pohybují kolem vozidel', 'řidič ve vozidle', 'svědci hlásí zraněnou osobu']);
    // 1. první zpráva (HZS nebo PČR)
    const first = r() < (trapped || heavy ? 0.7 : 0.45) ? 'hzs' : 'pcr';
    if (first === 'hzs') out.push({ src: 'hzs', dt: ri(r, 25, 110), text: join([`DN ${pickF(r, ['se zraněním', 'osobních vozidel', 'se zraněním osob', ''])}`.trim() + ` – ${where}`, what, persons, trapped ? pickF(r, ['osoba zaklíněná ve vozidle', 'řidič zaklíněný, nutné vyproštění', 'uvězněná osoba na místě spolujezdce', 'zaklíněné dolní končetiny řidiče']) : maybe(r, 0.5, pickF(r, ['únik provozních kapalin', 'vozidlo kouří z motorového prostoru', 'vozidla blokují oba pruhy', 'trosky na vozovce', 'airbagy aktivovány'])), `vysláno: ${units(ctx, trapped || heavy)}`]) });
    else out.push({ src: 'pcr', dt: ri(r, 25, 110), text: join([`DN – ${where}`, what, persons, `${patrol(ctx, true)} ${pickF(r, ['vyslána', 'na cestě', 'jede na místo', 'vyslána, ' + eta(r)])}`, maybe(r, 0.4, pickF(r, ['viník z místa ujel', 'svědci na místě', 'provoz stojí', 'tvoří se kolona', 'oznamovatel u vozidla'])), maybe(r, 0.35, 'HZS vyrozuměn')]) });
    // 2. upřesnění počtu / situace
    if (ctx.patientCount > 1) out.push({ src: r() < 0.5 ? 'hzs' : 'pcr', dt: ri(r, 120, 260), patientCount: ctx.patientCount, text: join([pickF(r, ['upřesnění', 'doplnění', 'situace na místě']) + `: ${ctx.patientCount} zraněných`, pickF(r, [`z toho ${ri(r, 1, Math.max(1, ctx.patientCount - 1))} vážně`, 'jedna osoba nekomunikuje', 'dítě ve vozidle', 'jedna osoba ležící u vozovky', 'zranění v obou vozidlech', 'dva zranění chodí po místě']), maybe(r, 0.4, pickF(r, ['požadavek na další posádky ZZS', 'zvažte LZS', 'svolejte další prostředky']))]) });
    else if (ctx.extraPerson) out.push({ src: 'pcr', dt: ri(r, 120, 260), patientCount: 2, text: join([`${patrol(ctx, true)} na místě`, pickF(r, ['ve druhém vozidle další zraněná osoba', 'nalezen druhý účastník mimo vozovku', 'spolujezdec udává bolest hrudníku', 'další zraněný – cyklista u krajnice']), 'celkem 2 zranění']) });
    else out.push({ src: first === 'hzs' ? 'pcr' : 'hzs', dt: ri(r, 120, 280), text: first === 'hzs'
      ? join([`${patrol(ctx, true)} ${pickF(r, ['na místě', 'dorazila', 'na místě od ' + ctx.clock(ri(r, 3, 8))])}`, pickF(r, ['řídí dopravu', 'uzavírá úsek', 'kyvadlový provoz', 'objízdná trasa přes obec', 'jeden pruh průjezdný', 'komunikace neprůjezdná, ZZS příjezd od ' + (ctx.dirTown || 'obce')]), maybe(r, 0.4, pickF(r, ['dechová zkouška u řidiče pozitivní', 'řidič bez řidičského oprávnění', 'dechová zkouška negativní', 'účastníci mimo vozidla', 'zjišťuje se totožnost']))])
      : join([`${units(ctx, trapped || heavy).split(',')[0]} ${pickF(r, ['na místě', 'příjezd na místo', 'na místě – průzkum'])}`, pickF(r, ['protipožární opatření', 'odpojení akumulátoru', 'zajištění vozidla proti pohybu', 'zasypávání provozních kapalin sorbentem', 'osvětlení místa', 'stabilizace vozidla']), maybe(r, 0.5, pickF(r, ['všechny osoby mimo vozidla', 'osoby vyprošťovat není třeba', 'řidič sedí ve vozidle, při vědomí', 'zraněný ošetřován svědky']))]) });
    // 3. vyproštění / ukončení
    if (trapped) out.push({ src: 'hzs', dt: ri(r, 300, 620), text: pickF(r, [
      `${pickF(r, ['zahájeno', 'probíhá'])} vyproštění ${pickF(r, ['hydraulickým nářadím', 'odstřižením střechy', 'otevřením dveří řidiče', 'roztažením karoserie'])}, ${pickF(r, ['odhad', 'předpoklad'])} ${ri(r, 8, 25)} min`,
      `vyproštění ${pickF(r, ['ukončeno', 'dokončeno'])}, osoba ${pickF(r, ['předána ZZS', 'na páteřní desce u vozidla', 'předána posádce ZZS'])}`,
      `zaklíněná osoba – ${pickF(r, ['přístup k pacientovi zleva', 'přístup zadními dveřmi', 'osoba při vědomí, komunikuje', 'osoba nekomunikuje'])}, vyproštění pokračuje`]) });
    else if (r() < 0.6) out.push({ src: r() < 0.5 ? 'pcr' : 'hzs', dt: ri(r, 360, 900), text: pickF(r, [
      `${pickF(r, ['odtah', 'vyproštění vozidla'])} objednán, ${pickF(r, ['komunikace uzavřena', 'provoz řízen', 'úsek průjezdný jedním pruhem'])} ${maybe(r, 0.5, 'do odvezení pacienta')}`.trim(),
      `${pickF(r, ['místo zajištěno', 'jednotka ukončuje činnost', 'úklid vozovky'])}, ${pickF(r, ['ZZS průjezd zajištěn', 'kolona v obou směrech', 'objížďka přes ' + (ctx.dirTown || 'obec')])}`,
      `šetření na místě, ${pickF(r, ['dokumentace DN', 'výslech svědků', 'měření místa', 'čeká se na výjezdovou skupinu'])}`]) });
    return out;
  }

  // ---------- eCall ----------
  function ecall(ctx, medical) {
    const r = ctx.r, out = [], auto = !medical && r() < 0.7;
    const veh = `${pickF(r, ['M1 osobní', 'M1 osobní', 'N1 dodávka', 'M1 osobní (SUV)'])}, ${pickF(r, ['benzín', 'nafta', 'hybrid', 'elektro', 'LPG'])}`;
    const pax = medical ? ri(r, 1, 3) : ri(r, 1, 4);
    const voice = medical ? pickF(r, ['řidič hlásí, že spolujezdec zkolaboval', 'řidička udává, že manžel nereaguje', 'spolujezdec hlásí křeče u řidiče, vozidlo stojí na krajnici', 'řidič udává bolest na hrudi, stojí na odpočívadle', 'volající hlásí silnou dušnost dítěte ve voze'])
      : pickF(r, ['bez odezvy', 'bez odezvy, slyšet sténání', 'řidič komunikuje, udává bolest krku', 'řidička plače, nedokáže popsat situaci', 'hovor přerušen', 'spolujezdec hlásí krvácení řidiče', 'řidič zmatený, neví kde je', 'hlasové spojení nenavázáno']);
    out.push({ src: 'ecall', dt: ri(r, 15, 60), text: join([`${auto ? 'Automatický' : 'Manuální'} eCall – ${ctx.addr}`, `vozidlo ${veh}`, `${pax} ${pax === 1 ? 'osoba' : 'osoby'} (pásy)`, `poloha GPS ±${pickF(r, [5, 10, 15, 25, 40, 80])} m`, `směr jízdy ${pickF(r, ['S', 'J', 'V', 'Z', 'SV', 'JZ', 'SZ', 'JV'])}`, `hlas: ${voice}`]) });
    if (!medical) out.push({ src: r() < 0.6 ? 'hzs' : 'pcr', dt: ri(r, 100, 240), text: join([pickF(r, ['k eCall', 'eCall – upřesnění', 'navazující hlášení k eCall']), pickF(r, ['další oznamovatel potvrzuje nehodu', 'vozidlo na střeše mimo vozovku', 'vozidlo v lese cca 20 m od silnice', 'vozidlo stojí v protisměru', 'svědek u vozidla, řidič při vědomí', 'oznamovatel neví, zda je ve voze další osoba']), r() < 0.5 ? `vysláno: ${units(ctx, false)}` : `${patrol(ctx, true)} vyslána`]) });
    else if (r() < 0.6) out.push({ src: 'tctv', dt: ri(r, 80, 200), text: join(['eCall – zpětné volání', pickF(r, ['stav beze změny', 'pacient se probírá', 'vozidlo stojí na ' + pickF(r, ['odpočívadle', 'krajnici', 'parkovišti u benzinky']), 'volající bude u vozidla s výstražnými světly', 'kolemjedoucí zastavil a pomáhá'])]) });
    return out;
  }

  // ---------- technická pomoc – otevření bytu / domu ----------
  function otevreni(ctx) {
    const r = ctx.r, out = [];
    const why = pickF(r, ['osoba za dveřmi nereaguje', 'senior nebere telefon několik dní', 'soused slyší volání o pomoc', 'pádem se nemůže zvednout, dveře zamčené', 'zápach z bytu, osoba nevychází', 'rodina se nemůže dovolat, klíče nemá', 'pečovatelka se nedostane dovnitř', 'pes v bytě štěká, nájemník nevychází', 'dítě samo v bytě, matka zkolabovala']);
    out.push({ src: 'hzs', dt: ri(r, 20, 90), text: join([`TP – otevření ${ctx.where === 'rd' ? 'RD' : 'bytu'} – ${ctx.addr}${ctx.floor ? ', ' + ctx.floor : ''}`, why, `${units(ctx, false)}, ${eta(r)}`, maybe(r, 0.5, 'PČR vyrozuměna')]) });
    if (r() < 0.6) out.push({ src: 'pcr', dt: ri(r, 120, 300), text: join([`${patrol(ctx)} ${pickF(r, ['na místě', 'dorazila', 'u dveří'])}`, pickF(r, ['čeká na HZS', 'osoba za dveřmi sténá', 'přes okno vidět ležící osobu', 'kontaktuje příbuzné', 'byt v 1. patře, okno pootevřené', 'soused má náhradní klíč – nepasuje'])]) });
    out.push({ src: 'hzs', dt: ri(r, 300, 660), text: pickF(r, [
      `dveře otevřeny ${pickF(r, ['planžetou', 'přes balkon', 'odvrtáním vložky', 'oknem z žebříku', 'násilně'])}, osoba ${pickF(r, ['leží v předsíni, při vědomí', 'na zemi v koupelně, komunikuje', 'nereaguje, dýchá', 'zmatená, podchlazená', 'sedí na zemi, nemůže vstát'])}`,
      `vstup do ${ctx.where === 'rd' ? 'domu' : 'bytu'} zajištěn, osoba ${pickF(r, ['předána ZZS', 'u ní jednotka', 'při vědomí, poraněná hlava', 'leží u postele'])}`,
      `otevřeno, ${pickF(r, ['osoba ležící, dýchá', 'senior po pádu, bolest kyčle', 'osoba bez reakce na oslovení', 'osoba při vědomí, dehydrovaná'])}; ${pickF(r, ['byt předán PČR', 'jednotka zůstává do příjezdu ZZS', 'zajištění bytu po odjezdu'])}`]) });
    return out;
  }

  // ---------- požár ----------
  function pozar(ctx) {
    const r = ctx.r, out = [];
    const obj = pickF(r, ['bytu', 'kuchyně v bytě', 'RD', 'podkroví RD', 'garáže', 'kůlny u RD', 'sklepa bytového domu', 'chaty', 'dílny', 'osobního vozidla', 'komína', 'kotelny', 'stodoly', 'skladové haly', 'popelnic u domu']);
    out.push({ src: 'hzs', dt: ri(r, 20, 80), text: join([`Požár ${obj} – ${ctx.addr}`, pickF(r, ['silné zakouření', 'plameny z okna', 'hustý dým ze střechy', 'kouř na chodbě domu', 'oznamovatel hasí sám', 'ohořelá osoba venku']), pickF(r, ['I. stupeň poplachu', 'II. stupeň poplachu', 'zvláštní stupeň poplachu', 'I. SP']), `vysláno: ${units(ctx, true)}`]) });
    out.push({ src: 'hzs', dt: ri(r, 180, 420), text: join([`${pickF(r, ['jednotka na místě', 'průzkum ukončen', 'VZ hlásí'])}`, pickF(r, ['jedna osoba s popáleninami rukou předána ZZS', 'evakuace domu, osoba nadýchaná zplodin', 'osoba vyvedena ze zakouřeného bytu', 'majitel popálený při hašení', 'dvě osoby nadýchané kouře', 'senior vynesen z bytu, kašle']), pickF(r, ['požár lokalizován', 'probíhá hašení', 'odvětrání prostor', 'měření CO', 'dohašování'])]) });
    if (r() < 0.5) out.push({ src: r() < 0.5 ? 'hzs' : 'pcr', dt: ri(r, 480, 900), text: pickF(r, ['požár zlikvidován, příčina se šetří', 'PČR zajišťuje místo, vyšetřovatel na cestě', 'byt neobyvatelný, sociální odbor vyrozuměn', 'koncentrace CO v normě, obyvatelé se vracejí', 'jednotka HZS ukončuje zásah']) });
    return out;
  }

  // ---------- psychiatrie / suicidium ----------
  function psych(ctx) {
    const r = ctx.r, out = [], who = ctx.sex === 'Ž' ? 'žena' : 'muž';
    const beh = pickF(r, [`${who} vyhrožuje sebevraždou`, `${who} stojí na mostě, hrozí skokem`, `${who} se zavřel v bytě, vyhrožuje podřezáním`, `${who} agresivní, ničí vybavení bytu`, `${who} zmatený, bloudí po silnici`, `${who} slyší hlasy, ohrožuje rodinu`, `${who} pod vlivem, napadá kolemjdoucí`, `${who} na střeše domu`, `${who} s nožem, sebepoškozování`, `${who} po požití léků, píše rozlučkové SMS`, `${who} v rozrušení, odmítá pomoc`, `${who} nahý venku, nekomunikuje`]);
    out.push({ src: 'pcr', dt: ri(r, 20, 90), text: join([`${ctx.addr}`, beh, `${patrol(ctx)} ${pickF(r, ['vyslána', 'na cestě', 'na místě', 'vyslána, ' + eta(r)])}`, maybe(r, 0.5, pickF(r, ['oznamuje rodina', 'oznamuje soused', 'oznamovatel sám', 'oznámení z KIC', 'oznamuje kamarád z jiného kraje']))]) });
    // zabarikádovaná osoba v bytě/domě → zásahová jednotka PČR z Českého Krumlova (simulovaný čas dojezdu)
    const barricade = /zavřel se v bytě|odmítá otevřít/.test(beh);
    if (barricade) {
      const near = ctx.okres === 'Český Krumlov' || ctx.town === 'Český Krumlov';
      const etaMin = near ? ri(r, 12, 25) : ri(r, 30, 65);
      out.push({ src: 'pcr', dt: ri(r, 160, 360), text: join([`hlídka na místě, ${pickF(r, ['osoba se zabarikádovala', 'osoba se zabarikádovala v bytě, nekomunikuje', 'osoba za zavřenými dveřmi, odmítá otevřít'])}`, `vyžádána zásahová jednotka PČR (Český Krumlov), ${pickF(r, ['ETA', 'dojezd', 'předpokládaný příjezd'])} ${etaMin} min`, pickF(r, ['ZZS čekat u vozidla PČR', 'přístup zatím nezajištěn – vyčkejte', 'ZZS prozatím nevstupovat'])]) });
      out.push({ src: 'pcr', dt: etaMin * 60 + ri(r, 60, 240), text: pickF(r, ['zásahová jednotka PČR na místě, přebírá zajištění', 'zásahová jednotka PČR na místě, probíhá vstup do objektu']) });
      out.push({ src: 'pcr', dt: etaMin * 60 + ri(r, 420, 900), text: pickF(r, ['osoba zajištěna, místo bezpečné, posádka může k pacientovi', 'objekt zajištěn, osoba omezena, ZZS může k pacientovi']) });
      return out;
    }
    const calm = r() < 0.5;
    const first = calm ? pickF(r, ['osobu zajistila', 'na místě, osoba zklidněná', 'použila hmaty a chvaty, osoba omezena']) : 'na místě, udržuje verbální kontakt';
    // vyjednavač dává smysl jen u osoby, která ještě není zajištěná
    const tail = calm ? pickF(r, ['žádá vyšetření ZZS', 'k převozu na psychiatrii', 'možný převoz na PZS', 'drobná řezná poranění předloktí']) : pickF(r, ['žádá vyšetření ZZS', 'možný převoz na PZS', 'vyjednavač na cestě']);
    out.push({ src: 'pcr', dt: ri(r, 160, 420), text: pickF(r, [
      `hlídka ${first}${maybe(r, 0.5, ', ' + tail)}`,
      `${pickF(r, ['osoba', who])} ${pickF(r, ['zadržena', 'se nechala odvést z mostu', 'otevřela dveře, kooperuje', 'utekla do lesa, pátrání'])}, ${pickF(r, ['ZZS čekat u vozidla PČR', 'přístup bezpečný', 'přístup zatím nezajištěn – vyčkejte', 'hlídka zůstává do příjezdu ZZS'])}`]) });
    if (r() < 0.35) out.push({ src: 'pcr', dt: ri(r, 420, 800), text: pickF(r, ['místo bezpečné, posádka může k pacientovi', 'osoba eskortována k ZZS', 'hlídka doprovodí převoz', 'zbraň/nůž zajištěn']) });
    return out;
  }

  // ---------- napadení / trauma na veřejnosti ----------
  function napadeni(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'pcr', dt: ri(r, 20, 90), text: join([`Napadení – ${ctx.addr}`, pickF(r, ['rvačka více osob', 'muž udeřen lahví do hlavy', 'pobodání, útočník utekl', 'napadení v baru', 'napadení na zastávce', 'domácí násilí, žena zraněná', 'napadení cyklisty řidičem', 'potyčka před diskotékou', 'senior okraden a sražen na zem']), `${patrol(ctx)} ${pickF(r, ['vyslána', 'na cestě', 'na místě'])}`, maybe(r, 0.5, pickF(r, ['útočník na místě', 'útočník utekl směr centrum', 'pachatel zadržen', 'popis pachatele se zjišťuje']))]) });
    out.push({ src: 'pcr', dt: ri(r, 150, 400), text: pickF(r, [
      `hlídka na místě, ${pickF(r, ['místo zajištěno', 'útočník zadržen', 'zraněný krvácí z hlavy', 'zraněný při vědomí, opilý', 'více zraněných – upřesní'])}`,
      `${pickF(r, ['pachatel zajištěn', 'pátrání po pachateli', 'svědci vyslechnuti'])}, ZZS ${pickF(r, ['bezpečný přístup', 'čekat na pokyn hlídky', 'najet ke vchodu'])}`]) });
    return out;
  }

  // ---------- osoba ležící / intoxikace ----------
  function intox(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: r() < 0.75 ? 'pcr' : 'tctv', dt: ri(r, 20, 100), text: join([`${ctx.addr}`, pickF(r, ['osoba ležící na chodníku', 'muž leží u zastávky, nereaguje', 'osoba silně opilá, nemůže stát', 'žena leží na lavičce, zvrací', 'mladiství po požití alkoholu', 'osoba v autě, nereaguje na klepání', 'muž spadl ze schodů, opilý', 'osoba pod vlivem drog, zmatená']), `${patrol(ctx)} ${pickF(r, ['vyslána', 'u osoby', 'na cestě'])}`]) });
    if (r() < 0.7) out.push({ src: 'pcr', dt: ri(r, 140, 380), text: pickF(r, [
      `hlídka u osoby, ${pickF(r, ['dýchá, nereaguje', 'reaguje na bolest', 'zvrací', 'krvácí z obličeje', 'agresivní, vulgární'])}${maybe(r, 0.5, ', dechová zkouška ' + (ri(r, 15, 38) / 10).toFixed(1) + ' ‰')}`,
      `osoba ${pickF(r, ['ztotožněna', 'bez dokladů', 'známá z dřívějška'])}, ${pickF(r, ['k vyšetření před PZS', 'ZZS k posouzení stavu', 'hlídka zůstává'])}`]) });
    return out;
  }

  function obeseni(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'pcr', dt: ri(r, 15, 70), text: join([`${ctx.addr}`, pickF(r, ['nalezena oběšená osoba', 'osoba visí v garáži', 'oběšení na půdě', 'osoba oběšená v lese', 'rodina sundala osobu z oprátky']), `${patrol(ctx)} ${pickF(r, ['vyslána', 'na cestě, ' + eta(r)])}`]) });
    out.push({ src: 'pcr', dt: ri(r, 120, 320), text: pickF(r, ['hlídka na místě, osoba sundána, zahájena KPR', 'hlídka na místě, osoba studená, ztuhlá', 'hlídka provádí KPR, AED připojen', 'osoba sundána, dýchá chrčivě', 'místo zajištěno, kriminální služba vyrozuměna']) });
    return out;
  }

  function tonuti(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 15, 70), text: join([`Tonutí – ${ctx.addr}`, pickF(r, ['osoba zmizela pod hladinou', 'dítě vytaženo z bazénu', 'plavec v bezvědomí na hladině', 'rybář spadl z loďky', 'osoba v řece u jezu', 'koupající se nevyplaval']), `vysláno: ${units(ctx, false)}${maybe(r, 0.5, ', ' + pickF(r, ['potápěči', 'člun', 'vodní záchranná služba']))}`]) });
    out.push({ src: 'hzs', dt: ri(r, 160, 400), text: pickF(r, ['osoba vytažena svědky, probíhá KPR', 'jednotka na místě, pátrání pod hladinou', 'osoba vytažena, dýchá, podchlazená', 'člun na vodě, osoba nalezena', 'svědci zahájili KPR na břehu']) });
    return out;
  }

  function zachrana(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 25, 100), text: join([`Záchrana osoby – ${ctx.addr}`, pickF(r, ['pád ze skály', 'turista se zraněnou nohou, nemůže jít', 'pád ze stromu při kácení', 'cyklista ve strži', 'houbař zabloudil, zranění', 'pád z posedu', 'osoba zavalena kmenem']), `${units(ctx, false)}${maybe(r, 0.5, ' + lezecká skupina')}`, maybe(r, 0.5, 'navigace podle aplikace Záchranka')]) });
    out.push({ src: 'hzs', dt: ri(r, 240, 600), text: pickF(r, ['jednotka u pacienta, transport na nosítkách k cestě', 'nalezen, přístup pro sanitku jen k závoře', 'transport k cestě cca 400 m, odhad 15 min', 'pacient vyproštěn, předávací bod u rozcestí', 'terén nepřístupný – zvažte LZS']) });
    return out;
  }

  function asistPcr(ctx) {
    const r = ctx.r;
    return [{ src: 'pcr', dt: ri(r, 20, 90), text: join([`${ctx.addr}`, pickF(r, ['zadržená osoba udává bolest na hrudi', 'osoba po zákroku hlídky, krvácí z obočí', 'řidič při silniční kontrole zkolaboval', 'osoba v cele, křeče', 'nalezen bezdomovec, podchlazený', 'žádost o asistenci při převozu osoby', 'nalezen senior bloudící v noci']), `${patrol(ctx)} ${pickF(r, ['u osoby', 'na místě', 'čeká u vozidla'])}`]) }];
  }

  const KINDS = { dn, ecall: c => ecall(c, false), ecallMed: c => ecall(c, true), otevreni, pozar, psych, napadeni, intox, obeseni, tonuti, zachrana, asistPcr };
  // který typ zpráv a s jakou pravděpodobností patří k indikaci
  function kindFor(ind, where, r) {
    const out = (k, p) => (r() < p ? k : null);
    switch (ind) {
      case 'dn_poly': return r() < 0.3 ? ['ecall', 'dn'] : ['dn'];
      case 'dn_lehke': return r() < 0.75 ? (r() < 0.22 ? ['ecall'] : ['dn']) : null;
      case 'asist': { const x = r(); return x < 0.5 ? ['otevreni'] : x < 0.65 ? ['pozar'] : x < 0.82 ? ['asistPcr'] : where === 'silnice' ? ['ecall'] : ['otevreni']; }
      case 'popal': return out(['pozar'], 0.55);
      case 'psych': return out(['psych'], 0.45);
      case 'obeseni': return out(['obeseni'], 0.75);
      case 'tonuti': return out(['tonuti'], 0.8);
      case 'intox': return ['ulice', 'verejne', 'silnice'].includes(where) ? out(['intox'], 0.4) : null;
      case 'trauma': return where === 'priroda' ? out(['zachrana'], 0.4) : ['ulice', 'verejne'].includes(where) ? out(['napadeni'], 0.2) : null;
      case 'porucha': case 'kreceU': case 'hrudnik': case 'dusnost': return where === 'silnice' ? out(['ecallMed'], 0.5) : ['ulice', 'verejne'].includes(where) ? out(['intox'], 0.08) : null;
      default: return null;
    }
  }
  const SRC_CALL = { dn: 'Linka 112', ecall: '112 – eCall', ecallMed: '112 – eCall', otevreni: 'Linka 150 – DZ HZS', pozar: 'Linka 150 – DZ HZS', tonuti: 'Linka 150 – DZ HZS', zachrana: 'Linka 150 – DZ HZS', psych: 'Linka 158 – DZ PČR', napadeni: 'Linka 158 – DZ PČR', intox: 'Linka 158 – DZ PČR', obeseni: 'Linka 158 – DZ PČR', asistPcr: 'Linka 158 – DZ PČR' };
  return { KINDS, SRC, SRC_CALL, kindFor, pick: pickF };
})();

if (typeof module !== 'undefined') module.exports = ZOS_EXTMSG;
