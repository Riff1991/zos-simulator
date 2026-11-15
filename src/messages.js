// Datové zprávy od složek IZS: HZS (KOPIS, linka 150/112), PČR (OS KŘP, linka 158), eCall přes TCTV 112.
// Texty se skládají z mnoha částí podle typu události a fáze zásahu; engine hlídá, aby se neopakovaly.
// Vše je smyšlené, jednotky a obce se odvozují od místa události.
const ZOS_EXTMSG = (function () {
  const SRC = { hzs: ['DZ HZS · KOPIS JčK', 'DZ 150 · KOPIS HZS', 'KOPIS HZS JčK'], pcr: ['DZ PČR · OS KŘP JčK', 'DZ 158 · OS PČR', 'OS KŘP JčK'], ecall: ['eCall · TCTV 112'], tctv: ['DZ 112 · TCTV JčK', 'TCTV 112'] };
  const CARS = ['osobní vozidlo', 'osobní vozidlo', 'osobní vozidlo', 'osobní vozidlo', 'dodávka', 'SUV', 'osobní vozidlo (kombi)', 'pick-up', 'osobní vozidlo s přívěsem'];
  const HEAVY = ['nákladní vozidlo', 'kamion s návěsem', 'traktor s vlekem', 'autobus', 'cisterna', 'sklápěč', 'zemědělský stroj'];
  const TWO = ['motocykl', 'skútr', 'cyklista', 'elektrokoloběžka', 'moped', 'čtyřkolka'];
  const DIRS = ['na', 've směru na', 'směr'];
  const pickF = (r, a) => a[Math.floor(r() * a.length)];
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const maybe = (r, p, s) => (r() < p ? s : '');
  const join = parts => parts.filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
  const cap = s => s ? s[0].toLocaleUpperCase('cs-CZ') + s.slice(1) : s;


  // ---------- dopravní nehoda ----------
  function dn(ctx) {
    const r = ctx.r, sym = String(ctx.sym || ''), has = (...k) => k.some(x => sym.includes(x));
    // druh nehody vychází z příznaků výzvy (chodec, motocyklista, cyklista, nákladní automobil…)
    const noHeavy = has('OSOBNÍ AUTOMOBIL', 'CHODEC', 'MOTOCYKLISTA', 'CYKLISTA', 'KOLOBĚŽKA', 'ROTACE');
    const heavy = has('NÁKLADNÍ') || (!noHeavy && r() < 0.18), two = !heavy && !noHeavy && r() < 0.2;
    const car = () => pickF(r, CARS);
    const v1 = car(), v2 = heavy ? pickF(r, HEAVY) : two ? pickF(r, TWO) : car();
    const single = r() < 0.38;
    const whatRand = single ? `${v1} – ${pickF(r, ['mimo vozovku', 'v příkopu', 'na střeše v poli', 'náraz do stromu', 'náraz do sloupu', 'na boku v protisměru', 'v potoce', 'náraz do svodidel', 'sjetí ze srázu', 'náraz do zídky', 'přes zábradlí mostu', 'náraz do zastávky'])}`
      : pickF(r, [`střet 2 vozidel: ${v1} × ${v2}`, `čelní střet: ${v1} × ${v2}`, `boční střet: ${v1} × ${v2}`, `srážka na křižovatce: ${v1} × ${v2}`, `náraz zezadu: ${v1} × ${v2}`, `řetězová nehoda ${ri(r, 3, 5)} vozidel`, `${v2} × ${v1}, ${pickF(r, ['střet při předjíždění', 'střet v zatáčce', 'nedání přednosti'])}`]);
    let custom = '';
    if (has('CHODEC')) custom = pickF(r, [`sražený chodec: ${v1}`, `chodec sražen vozidlem (${v1})`, `střet vozidla s chodcem: ${v1}`]) + (has('PŘEJETÍ') ? ', přejetí' : '') + (has('SRAŽENÍ VOZIDLEM NAD') ? ', vyšší rychlost' : '');
    else if (has('MOTOCYKLISTA')) custom = pickF(r, [`střet: motocykl × ${v1}`, 'motocykl – pád na vozovce', `${v1} × motocykl`]);
    else if (has('CYKLISTA')) custom = `střet cyklisty s vozidlem: ${v1}`;
    else if (has('KOLOBĚŽKA')) custom = `střet elektrokoloběžky s vozidlem: ${v1}`;
    else if (has('VLAK')) custom = 'střet vozidla s vlakem na přejezdu';
    else if (has('ROTACE VOZIDLA')) custom = `${v1} na střeše mimo vozovku`;
    else if (has('KATAPULTÁŽ')) custom = `${v1} – osoba vymrštěna z vozidla`;
    else if (has('NÁKLADNÍ')) custom = pickF(r, [`střet: ${v2} × ${v1}`, `${v2} – střet s osobním vozidlem`]);
    const what = custom || whatRand;
    const where = pickF(r, [ctx.addr, `${ctx.addr}, ${pickF(r, DIRS)} ${ctx.dirTown || ctx.town}`, `${ctx.addr}, km ${ri(r, 2, 48)}`]);
    const out = [];
    const trapped = ctx.trapped;
    const persons = ctx.patientCount > 1 ? `${ctx.patientCount} zranění` : pickF(r, ['1 zraněný', 'zraněná 1 osoba', 'počet zraněných neznámý', 'zatím 1 zraněný, další se ověřují', 'osoby se pohybují kolem vozidel', 'řidič ve vozidle', 'svědci hlásí zraněnou osobu']);
    // 1. první zpráva (HZS nebo PČR)
    const wantH = has('+ HZS'), wantP = has('+ PČR');   // odesílatel první zprávy podle příznaků výzvy
    const first = wantH && !wantP ? 'hzs' : wantP && !wantH ? 'pcr' : r() < (trapped || heavy ? 0.7 : 0.45) ? 'hzs' : 'pcr';
    const hazard = trapped ? pickF(r, ['osoba zaklíněná ve vozidle', 'řidič zaklíněný, nutné vyproštění', 'uvězněná osoba na místě spolujezdce', 'zaklíněné dolní končetiny řidiče']) : maybe(r, 0.5, pickF(r, ['únik provozních kapalin', 'vozidlo kouří z motorového prostoru', 'vozidla blokují oba pruhy', 'airbagy aktivovány']));
    if (first === 'hzs') out.push({ src: 'hzs', dt: ri(r, 25, 110), text: join([`DN – ${where}`, what, persons, hazard]) });
    else out.push({ src: 'pcr', dt: ri(r, 25, 110), text: join([`DN – ${where}`, what, persons, maybe(r, 0.35, 'oznamovatel u vozidla')]) });
    // 2. upřesnění počtu / situace
    if (ctx.patientCount > 1) out.push({ src: r() < 0.5 ? 'hzs' : 'pcr', dt: ri(r, 120, 260), patientCount: ctx.patientCount, text: join([pickF(r, ['upřesnění', 'doplnění', 'situace na místě']) + `: ${ctx.patientCount} zraněných`, pickF(r, [`z toho ${ri(r, 1, Math.max(1, ctx.patientCount - 1))} vážně`, 'jedna osoba nekomunikuje', 'dítě ve vozidle', 'jedna osoba ležící u vozovky', 'zranění v obou vozidlech', 'dva zranění chodí po místě']), maybe(r, 0.4, pickF(r, ['požadavek na další posádky ZZS', 'zvažte LZS', 'svolejte další prostředky']))]) });
    else if (ctx.extraPerson) out.push({ src: 'pcr', dt: ri(r, 120, 260), patientCount: 2, text: join([pickF(r, ['ve druhém vozidle další zraněná osoba', 'nalezen druhý účastník mimo vozovku', 'spolujezdec udává bolest hrudníku', 'další zraněný – cyklista u krajnice']), 'celkem 2 zranění']) });
    else out.push({ src: first === 'hzs' ? 'pcr' : 'hzs', dt: ri(r, 120, 280), text: first === 'hzs'
      ? join([pickF(r, ['místo zajištěno, přístup bezpečný', 'ZZS příjezd od ' + (ctx.dirTown || 'obce') + ', přístup bezpečný', 'vyčkejte u vozidla PČR, přístup zatím nezajištěn', 'komunikace průjezdná jedním pruhem, ZZS může k pacientům']), maybe(r, 0.4, pickF(r, ['účastníci mimo vozidla', 'řidič při vědomí, komunikuje']))])
      : join([pickF(r, ['protipožární opatření provedena, přístup bezpečný', 'vozidlo zajištěno, ZZS může k pacientům', 'únik provozních kapalin, do zajištění nevstupovat k vozidlu', 'vozidlo nestabilní, vyčkejte na zajištění']), maybe(r, 0.5, pickF(r, ['všechny osoby mimo vozidla', 'osoby vyprošťovat není třeba', 'řidič sedí ve vozidle, při vědomí', 'zraněný ošetřován svědky']))]) });
    // 3. vyproštění
    if (trapped) out.push({ src: 'hzs', dt: ri(r, 300, 620), text: pickF(r, [
      `${pickF(r, ['zahájeno', 'probíhá'])} vyproštění, ${pickF(r, ['odhad', 'předpoklad'])} ${ri(r, 8, 25)} min`,
      `vyproštění ${pickF(r, ['ukončeno', 'dokončeno'])}, osoba ${pickF(r, ['předána ZZS', 'na páteřní desce u vozidla', 'předána posádce ZZS'])}`,
      `zaklíněná osoba – ${pickF(r, ['přístup k pacientovi zleva', 'přístup zadními dveřmi', 'osoba při vědomí, komunikuje', 'osoba nekomunikuje'])}, vyproštění pokračuje`]) });
    return out;
  }

  // ---------- eCall ----------
  function ecall(ctx, medical) {
    const r = ctx.r, out = [], auto = !medical && r() < 0.7;
    const voice = medical ? pickF(r, ['řidič hlásí, že spolujezdec zkolaboval', 'řidička udává, že manžel nereaguje', 'spolujezdec hlásí křeče u řidiče, vozidlo stojí na krajnici', 'řidič udává bolest na hrudi, stojí na odpočívadle', 'volající hlásí silnou dušnost dítěte ve voze'])
      : pickF(r, ['bez odezvy', 'bez odezvy, slyšet sténání', 'řidič komunikuje, udává bolest krku', 'řidička plače, nedokáže popsat situaci', 'hovor přerušen', 'spolujezdec hlásí krvácení řidiče', 'řidič zmatený, neví kde je', 'hlasové spojení nenavázáno']);
    out.push({ src: 'ecall', dt: ri(r, 15, 60), text: join([`${auto ? 'Automatický' : 'Manuální'} eCall – ${ctx.addr}`, `hlas: ${voice}`]) });
    if (!medical) out.push({ src: r() < 0.6 ? 'hzs' : 'pcr', dt: ri(r, 100, 240), text: join([pickF(r, ['k eCall', 'eCall – upřesnění', 'navazující hlášení k eCall']), pickF(r, ['další oznamovatel potvrzuje nehodu', 'vozidlo na střeše mimo vozovku', 'vozidlo v lese cca 20 m od silnice', 'vozidlo stojí v protisměru', 'svědek u vozidla, řidič při vědomí', 'oznamovatel neví, zda je ve voze další osoba'])]) });
    else if (r() < 0.6) out.push({ src: 'tctv', dt: ri(r, 80, 200), text: join(['eCall – zpětné volání', pickF(r, ['stav beze změny', 'pacient se probírá', 'vozidlo stojí na ' + pickF(r, ['odpočívadle', 'krajnici', 'parkovišti u benzinky']), 'volající bude u vozidla s výstražnými světly', 'kolemjedoucí zastavil a pomáhá'])]) });
    return out;
  }

  // ---------- technická pomoc – otevření bytu / domu ----------
  function otevreni(ctx) {
    const r = ctx.r, out = [];
    const why = pickF(r, ['osoba za dveřmi nereaguje', 'senior nebere telefon několik dní', 'soused slyší volání o pomoc', 'pádem se nemůže zvednout, dveře zamčené', 'zápach z bytu, osoba nevychází', 'rodina se nemůže dovolat, klíče nemá', 'pečovatelka se nedostane dovnitř', 'dítě samo v bytě, matka zkolabovala']);
    out.push({ src: 'hzs', dt: ri(r, 20, 90), text: join([`TP – otevření ${ctx.where === 'rd' ? 'RD' : 'bytu'} – ${ctx.addr}${ctx.floor ? ', ' + ctx.floor : ''}`, why]) });
    if (r() < 0.6) out.push({ src: 'pcr', dt: ri(r, 120, 300), text: pickF(r, ['osoba za dveřmi sténá', 'přes okno vidět ležící osobu', 'osoba za dveřmi nereaguje na oslovení', 'z bytu zápach, osoba nereaguje']) });
    out.push({ src: 'hzs', dt: ri(r, 300, 660), text: pickF(r, [
      `dveře otevřeny, osoba ${pickF(r, ['leží v předsíni, při vědomí', 'na zemi v koupelně, komunikuje', 'nereaguje, dýchá', 'zmatená, podchlazená', 'sedí na zemi, nemůže vstát'])}`,
      `vstup do ${ctx.where === 'rd' ? 'domu' : 'bytu'} zajištěn, osoba ${pickF(r, ['předána ZZS', 'při vědomí, poraněná hlava', 'leží u postele'])}`,
      `otevřeno, ${pickF(r, ['osoba ležící, dýchá', 'senior po pádu, bolest kyčle', 'osoba bez reakce na oslovení', 'osoba při vědomí, dehydrovaná'])}`]) });
    return out;
  }

  // ---------- požár ----------
  function pozar(ctx) {
    const r = ctx.r, out = [];
    const obj = pickF(r, ['bytu', 'kuchyně v bytě', 'RD', 'podkroví RD', 'garáže', 'kůlny u RD', 'sklepa bytového domu', 'chaty', 'dílny', 'osobního vozidla', 'komína', 'kotelny', 'stodoly', 'skladové haly', 'popelnic u domu']);
    out.push({ src: 'hzs', dt: ri(r, 20, 80), text: join([`Požár ${obj} – ${ctx.addr}`, pickF(r, ['silné zakouření', 'plameny z okna', 'hustý dým ze střechy', 'kouř na chodbě domu', 'oznamovatel hasí sám', 'ohořelá osoba venku'])]) });
    out.push({ src: 'hzs', dt: ri(r, 180, 420), text: join([pickF(r, ['jedna osoba s popáleninami rukou předána ZZS', 'evakuace domu, osoba nadýchaná zplodin', 'osoba vyvedena ze zakouřeného bytu', 'majitel popálený při hašení', 'dvě osoby nadýchané kouře', 'senior vynesen z bytu, kašle']), pickF(r, ['požár lokalizován', 'probíhá hašení', 'dohašování', 'přístup k pacientům bezpečný'])]) });
    if (r() < 0.4) out.push({ src: 'hzs', dt: ri(r, 480, 900), text: pickF(r, ['koncentrace CO v normě, obyvatelé se vracejí', 'požár zlikvidován, přístup bezpečný']) });
    return out;
  }

  // ---------- psychiatrie / suicidium ----------
  function psych(ctx) {
    const r = ctx.r, out = [], who = ctx.sex === 'Ž' ? 'žena' : 'muž';
    const beh = pickF(r, [`${who} vyhrožuje sebevraždou`, `${who} stojí na mostě, hrozí skokem`, `${who} se zavřel v bytě, vyhrožuje podřezáním`, `${who} agresivní, ničí vybavení bytu`, `${who} zmatený, bloudí po silnici`, `${who} slyší hlasy, ohrožuje rodinu`, `${who} pod vlivem, napadá kolemjdoucí`, `${who} na střeše domu`, `${who} s nožem, sebepoškozování`, `${who} po požití léků, píše rozlučkové SMS`, `${who} v rozrušení, odmítá pomoc`, `${who} nahý venku, nekomunikuje`]);
    out.push({ src: 'pcr', dt: ri(r, 20, 90), text: join([`${ctx.addr}`, beh, maybe(r, 0.5, pickF(r, ['oznamuje rodina', 'oznamuje soused', 'oznamovatel sám', 'oznámení z KIC']))]) });
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
    out.push({ src: 'pcr', dt: ri(r, 20, 90), text: join([`Napadení – ${ctx.addr}`, pickF(r, ['rvačka více osob', 'muž udeřen lahví do hlavy', 'pobodání', 'napadení v baru', 'napadení na zastávce', 'domácí násilí, žena zraněná', 'napadení cyklisty řidičem', 'potyčka před diskotékou', 'senior okraden a sražen na zem']), maybe(r, 0.6, pickF(r, ['útočník na místě', 'útočník utekl směr centrum', 'pachatel zadržen']))]) });
    out.push({ src: 'pcr', dt: ri(r, 150, 400), text: pickF(r, [
      `hlídka na místě, ${pickF(r, ['místo zajištěno', 'útočník zadržen', 'zraněný krvácí z hlavy', 'zraněný při vědomí, opilý', 'více zraněných – upřesní'])}`,
      `${pickF(r, ['pachatel zajištěn', 'pátrání po pachateli'])}, ZZS ${pickF(r, ['bezpečný přístup', 'čekat na pokyn hlídky', 'najet ke vchodu'])}`]) });
    return out;
  }

  // ---------- osoba ležící / intoxikace ----------
  function intox(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: r() < 0.75 ? 'pcr' : 'tctv', dt: ri(r, 20, 100), text: join([`${ctx.addr}`, pickF(r, ['osoba ležící na chodníku', 'muž leží u zastávky, nereaguje', 'osoba silně opilá, nemůže stát', 'žena leží na lavičce, zvrací', 'mladiství po požití alkoholu', 'osoba v autě, nereaguje na klepání', 'muž spadl ze schodů, opilý', 'osoba pod vlivem drog, zmatená']), ]) });
    if (r() < 0.7) out.push({ src: 'pcr', dt: ri(r, 140, 380), text: pickF(r, [
      `hlídka u osoby, ${pickF(r, ['dýchá, nereaguje', 'reaguje na bolest', 'zvrací', 'krvácí z obličeje', 'agresivní, vulgární'])}`,
      `${pickF(r, ['ZZS k posouzení stavu', 'přístup k osobě bezpečný', 'osoba agresivní, vyčkejte u vozidla PČR'])}`]) });
    return out;
  }

  function obeseni(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'pcr', dt: ri(r, 15, 70), text: join([`${ctx.addr}`, pickF(r, ['nalezena oběšená osoba', 'osoba visí v garáži', 'oběšení na půdě', 'osoba oběšená v lese', 'rodina sundala osobu z oprátky']), ]) });
    out.push({ src: 'pcr', dt: ri(r, 120, 320), text: pickF(r, ['hlídka na místě, osoba sundána, zahájena KPR', 'hlídka na místě, osoba studená, ztuhlá', 'hlídka provádí KPR, AED připojen', 'osoba sundána, dýchá chrčivě', 'místo zajištěno, kriminální služba vyrozuměna']) });
    return out;
  }

  function tonuti(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 15, 70), text: join([`Tonutí – ${ctx.addr}`, pickF(r, ['osoba zmizela pod hladinou', 'dítě vytaženo z bazénu', 'plavec v bezvědomí na hladině', 'rybář spadl z loďky', 'osoba v řece u jezu', 'koupající se nevyplaval'])]) });
    out.push({ src: 'hzs', dt: ri(r, 160, 400), text: pickF(r, ['osoba vytažena svědky, probíhá KPR', 'jednotka na místě, pátrání pod hladinou', 'osoba vytažena, dýchá, podchlazená', 'člun na vodě, osoba nalezena', 'svědci zahájili KPR na břehu']) });
    return out;
  }

  function zachrana(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 25, 100), text: join([`Záchrana osoby – ${ctx.addr}`, pickF(r, ['pád ze skály', 'turista se zraněnou nohou, nemůže jít', 'pád ze stromu při kácení', 'cyklista ve strži', 'houbař zabloudil, zranění', 'pád z posedu', 'osoba zavalena kmenem']), maybe(r, 0.5, 'navigace podle aplikace Záchranka')]) });
    out.push({ src: 'hzs', dt: ri(r, 240, 600), text: pickF(r, ['jednotka u pacienta, transport na nosítkách k cestě', 'nalezen, přístup pro sanitku jen k závoře', 'transport k cestě cca 400 m, odhad 15 min', 'pacient vyproštěn, předávací bod u rozcestí', 'terén nepřístupný – zvažte LZS']) });
    return out;
  }

  function asistPcr(ctx) {
    const r = ctx.r;
    return [{ src: 'pcr', dt: ri(r, 20, 90), text: join([`${ctx.addr}`, pickF(r, ['zadržená osoba udává bolest na hrudi', 'osoba po zákroku hlídky, krvácí z obočí', 'řidič při silniční kontrole zkolaboval', 'osoba v cele, křeče', 'nalezen bezdomovec, podchlazený', 'žádost o asistenci při převozu osoby', 'nalezen senior bloudící v noci'])]) }];
  }

  // ---------- pád z výšky ----------
  function padVyska(ctx) {
    const r = ctx.r, out = [];
    const odkud = pickF(r, ['ze střechy', 'z lešení', 'z žebříku', 'ze stromu při prořezávce', 'z okna v patře', 'ze stohu', 'z ložné plochy nákladního vozidla', 'ze zdi při opravě']);
    out.push({ src: r() < 0.55 ? 'tctv' : 'hzs', dt: ri(r, 25, 90), text: join([`Pád ${odkud} – ${ctx.addr}`, pickF(r, ['výška asi 2 m', 'výška asi 3 m', 'výška asi 5 m', 'výška přes 6 m']), pickF(r, ['osoba při vědomí, bolest zad', 'osoba nereaguje, dýchá', 'osoba nehybná, krvácí z hlavy', 'osoba nemůže hýbat nohama', 'osoba leží, komunikuje'])]) });
    out.push({ src: r() < 0.5 ? 'hzs' : 'pcr', dt: ri(r, 150, 330), text: pickF(r, ['podezření na poranění páteře, osoba nesmí hýbat', 'zraněný ošetřován kolegy, přístup bezpečný', 'osoba dýchá, krvácí z ucha', 'přístup k pacientovi po žebříku, zajištěno', 'osoba leží na zádech, bolest pánve']) });
    return out;
  }

  // ---------- pracovní úraz ----------
  function pracUraz(ctx) {
    const r = ctx.r, out = [];
    ctx.trappedWork = r() < 0.2;
    out.push({ src: r() < 0.6 ? 'tctv' : 'pcr', dt: ri(r, 25, 90), text: join([`Pracovní úraz – ${ctx.addr}`, pickF(r, ['pila', 'lis', 'vysokozdvižný vozík', 'soustruh', 'řetězová pila', 'zemědělský stroj', 'pás dopravníku']), ctx.trappedWork ? pickF(r, ['ruka zaklíněná ve stroji, nutné vyproštění', 'noha zaklíněná pod strojem', 'zavalení břemenem, osoba zaklíněná']) : pickF(r, (ctx.n && ctx.n > 2 ? [] : ['amputace prstů']).concat(['rozsáhlé řezné poranění ruky', 'poranění oka', 'popálení horkým olejem', 'zasažení elektrickým proudem', 'zavalení břemenem, osoba vyprostěna kolegy']))]) });
    out.push({ src: 'hzs', dt: ri(r, 140, 340), text: ctx.trappedWork ? pickF(r, ['stroj vypnut, zahájeno vyproštění, odhad ' + ri(r, 10, 30) + ' min', 'vyproštění probíhá, osoba při vědomí']) : pickF(r, ['stroj vypnut, přístup bezpečný', 'kolegové zastavili krvácení, přístup bezpečný', 'osoba při vědomí, komunikuje', (ctx.n && ctx.n > 2 ? 'osoba při vědomí, komunikuje' : 'amputát zajištěn ve sterilním obalu')]) });
    // po nabrání jako N3 přijde upřesnění: amputace prstů → vždy změna naléhavosti na N2 (dynamickou nebo plnou), posádce se oznámí rádiem
    if (ctx.n === 3 && !ctx.trappedWork && r() < 0.5) out.push({ src: r() < 0.5 ? 'tctv' : 'hzs', dt: ri(r, 170, 330), upgrade: { n: 2, symptom: '´Amputace prstů' }, red: true, text: join([`Pracovní úraz – ${ctx.addr}`, 'upřesnění: amputace prstů, amputát zajištěn', 'masivní krvácení zastaveno tlakovým obvazem']) });
    return out;
  }

  // ---------- osoba bez známek života, KPR svědků ----------
  function kprSvedci(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: r() < 0.6 ? 'tctv' : 'pcr', dt: ri(r, 15, 70), text: join([`${ctx.addr}`, pickF(r, ['osoba bez známek života', 'muž se zhroutil, nedýchá', 'žena na zemi, nereaguje, nedýchá', 'osoba kolabovala a nereaguje']), pickF(r, ['svědci zahájili KPR', 'KPR zatím nikdo nezačal, oznamovatel instruován', 'AED na místě', 'telefonická instruktáž KPR probíhá'])]) });
    out.push({ src: r() < 0.5 ? 'pcr' : 'hzs', dt: ri(r, 140, 340), text: pickF(r, ['KPR probíhá, AED připojen', 'KPR probíhá, výboj nedoporučen', 'laická KPR trvá, AED dodán na místo', 'osoba pořád bez reakce, KPR bez přerušení']) });
    return out;
  }

  // ---------- pokousání psem ----------
  function pokousani(ctx) {
    const r = ctx.r, out = [];
    const volny = r() < 0.35;
    out.push({ src: r() < 0.6 ? 'pcr' : 'tctv', dt: ri(r, 20, 90), text: join([`Pokousání psem – ${ctx.addr}`, pickF(r, ['rány na paži', 'rány na noze', 'poranění obličeje', 'pokousán do stehna', 'dítě pokousáno do hlavy']), volny ? pickF(r, ['pes stále volně, agresivní', 'pes utekl, není zajištěn']) : pickF(r, ['pes zajištěn majitelem', 'pes zavřen v domě', 'majitel na místě'])]) });
    out.push({ src: 'pcr', dt: ri(r, 130, 330), text: volny ? pickF(r, ['pes stále volně, vyčkejte u vozidla PČR', 'pes zajištěn, přístup bezpečný']) : pickF(r, ['přístup bezpečný', 'krvácení z rány zastaveno svědky']) });
    return out;
  }

  // ---------- domácí násilí ----------
  function domNasili(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'pcr', dt: ri(r, 20, 90), text: join([`Domácí násilí – ${ctx.addr}`, pickF(r, ['žena zraněná v obličeji', 'muž zraněn nožem', 'žena po napadení, krvácí z hlavy', 'zraněná osoba leží na zemi', 'zraněné dítě v bytě']), pickF(r, ['agresor v bytě, agresivní', 'agresor odešel', 'agresor pod vlivem alkoholu, na místě', 'agresor zadržen'])]) });
    out.push({ src: 'pcr', dt: ri(r, 140, 360), text: pickF(r, ['agresor zadržen, přístup bezpečný', 'agresor stále v bytě, ZZS vyčkejte u vozidla PČR', 'místo zajištěno, ZZS může k pacientovi', 'agresor omezen, zraněná osoba při vědomí']) });
    return out;
  }

  // ---------- střet se zvěří ----------
  function zver(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: r() < 0.5 ? 'pcr' : 'tctv', dt: ri(r, 25, 100), text: join([`Střet se zvěří – ${ctx.addr}`, pickF(r, CARS), pickF(r, ['řidič při vědomí, bolest krku', 'řidič zraněný, krvácí z čela', 'řidič bez zranění, vozidlo nepojízdné', 'spolujezdec zraněn']), maybe(r, 0.5, pickF(r, ['zvíře na vozovce', 'zvíře uhynulo', 'zvíře utekla do lesa']))]) });
    if (r() < 0.6) out.push({ src: 'pcr', dt: ri(r, 120, 300), text: pickF(r, ['řidič sedí ve vozidle, komunikuje', 'vozidlo mimo vozovku, přístup bezpečný', 'řidič vystoupil, drží se za krk']) });
    return out;
  }

  // ---------- střet s vlakem ----------
  function vlak(ctx) {
    const r = ctx.r, out = [];
    const co = pickF(r, ['osobním vozidlem', 'osobou', 'traktorem', 'dodávkou']);
    out.push({ src: r() < 0.5 ? 'hzs' : 'pcr', dt: ri(r, 20, 80), text: join([`Střet vlaku s ${co} – železniční přejezd, ${ctx.addr}`, 'železniční doprava zastavena', pickF(r, ['osoba zaklíněná ve vozidle', 'více zraněných', 'osoba pod vlakem, nemluví', 'zraněný strojvedoucí'])]) });
    out.push({ src: 'hzs', dt: ri(r, 130, 320), text: pickF(r, ['napájení trakce vypnuto, přístup bezpečný', 'trakce pod napětím, do kolejiště nevstupovat', 'zajištěno, ZZS může k pacientům', 'vyproštění zahájeno, odhad ' + ri(r, 12, 30) + ' min']) });
    return out;
  }

  // ---------- uvíznutí ve výtahu ----------
  function vytah(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 20, 80), text: join([`Uvíznutí ve výtahu – ${ctx.addr}`, pickF(r, ['osoba udává bolest na hrudi', 'osoba má dušnost', 'osoba zkolabovala', 'těhotná žena, bolesti', 'senior, nevolnost, nekomunikuje dobře'])]) });
    out.push({ src: 'hzs', dt: ri(r, 150, 360), text: pickF(r, ['výtah zablokován mezi patry, osoba při vědomí', 'dveře otevřeny, osoba předána ZZS', 'osoba nereaguje, probíhá otevření kabiny', 'kabina otevřena, přístup k pacientovi volný']) });
    return out;
  }

  // ---------- otrava CO ----------
  function co(ctx) {
    const r = ctx.r, out = [], n = ctx.patientCount || 1, sym = String(ctx.sym || '');
    const unc = /AVPU-U|BEZVĚDOM/.test(sym);
    const who = n > 1 ? pickF(r, [`${n} osoby s nevolností a bolestí hlavy`, `rodina zvrací, bolest hlavy (${n} osob)`, `detektor CO houká, ${n} osoby slabé`].concat(unc ? [`${n} osob, jedna bezvědomá v koupelně`] : []))
      : pickF(r, ['osoba s nevolností a bolestí hlavy, detektor CO houká'].concat(unc ? ['osoba bezvědomá v koupelně'] : []));
    out.push({ src: r() < 0.5 ? 'hzs' : 'tctv', dt: ri(r, 20, 90), patientCount: n > 1 ? n : undefined, text: join([`Podezření na otravu CO – ${ctx.addr}`, who, maybe(r, 0.5, pickF(r, ['plynový kotel v provozu', 'topení na tuhá paliva', 'karma v koupelně']))]) });
    out.push({ src: 'hzs', dt: ri(r, 150, 360), text: pickF(r, ['objekt odvětrán, měření CO v normě, přístup bezpečný', 'koncentrace CO stále vysoká, ZZS nevstupovat do objektu', 'osoby vyvedeny ven, ZZS může k pacientům']) });
    return out;
  }

  // ---------- únik plynu / výbuch ----------
  function plyn(ctx) {
    const r = ctx.r, out = [];
    out.push({ src: 'hzs', dt: ri(r, 20, 80), text: join([`${pickF(r, ['Výbuch plynu', 'Únik plynu a požár', 'Exploze v domě'])} – ${ctx.addr}`, pickF(r, ['popálená osoba venku', 'osoba zavalená troskami', 'dvě osoby popálené', 'osoba s poraněním hlavy'])]) });
    out.push({ src: 'hzs', dt: ri(r, 150, 360), text: pickF(r, ['hrozí další výbuch, do prostoru nevstupovat', 'přívod plynu uzavřen, přístup bezpečný', 'osoby vyneseny, ZZS může k pacientům', 'dohašování, přístup bezpečný']) });
    return out;
  }

  // ---------- pád cyklisty ----------
  function cyklista(ctx) {
    const r = ctx.r, out = [], sym = String(ctx.sym || ''), has = re => re.test(sym);
    const pool = ['pád z kola'];
    if (has(/HLAV|KOMOČ/)) pool.push('bez přilby, bolest hlavy', 's přilbou, bolest hlavy');
    if (has(/RAMENO|PAŽE|HORNÍ KONČ|LOKET|PŘEDLOKTÍ/)) pool.push('s přilbou, bolest ramene');
    if (has(/STEHNO|PÁNEV|KRČEK|DOLNÍ KONČ|KOLENO|KOTNÍK|BÉREC/)) pool.push('bolest kyčle, nemůže vstát');
    if (has(/OBLIČEJ|NOS|OTEVŘENÉ RÁNY|KRVÁC/)) pool.push('krvácí z obličeje');
    if (has(/SRAŽENÍ|PŘEJETÍ/)) pool.push('sražen autem, osoba leží');
    out.push({ src: r() < 0.5 ? 'tctv' : 'pcr', dt: ri(r, 20, 90), text: join([`Pád cyklisty – ${ctx.addr}`, pickF(r, pool), has(/SRAŽENÍ|PŘEJETÍ/) ? maybe(r, 0.4, pickF(r, ['řidič odjel', 'řidič na místě'])) : '']) });
    const calm = ['osoba při vědomí, komunikuje'], down = ['osoba leží, nehýbe končetinou'];
    if (r() < 0.5) out.push({ src: 'pcr', dt: ri(r, 130, 320), text: pickF(r, (has(/AVPU-[UPV]|PARÉZ|BEZVĚDOM/) ? down : calm).concat(['místo zajištěno, přístup bezpečný'])) });
    return out;
  }

  // neutrální doplňky (nic o bezpečnosti ani stavu pacienta), které zvyšují pestrost následných zpráv
  const DET = ['oznamovatel zůstává na místě', 'oznamovatel čeká u vchodu', 'u pacienta jsou svědci', 'u pacienta příbuzný', 'příjezd po zpevněné komunikaci', 'místo označeno výstražným trojúhelníkem', 'okolo se shromáždili lidé', 'navádět bude volající', 'silný déšť', 'špatná viditelnost', 'veřejné osvětlení nefunguje', 'místo hůře dohledatelné, čeká navádějící osoba', 'vstup hlavní bránou', 'vjezd z boční ulice', 'parkování u místa omezené', 'pacient udává bolest', 'oznamovatel ve stresu', 'volající komunikuje s dispečinkem', 'kolem dokola neosvětlený terén', 'sníh na vozovce'];
  const W = f => c => { const it = f(c); it.forEach((x, i) => { if (i > 0 && c.r() < 0.55) x.text += ', ' + pickF(c.r, DET); }); return it; };
  const KINDS = { dn, ecall: c => ecall(c, false), ecallMed: c => ecall(c, true), otevreni, pozar, psych, napadeni, intox, obeseni, tonuti, zachrana, asistPcr,
    padVyska: W(padVyska), pracUraz: W(pracUraz), kprSvedci: W(kprSvedci), pokousani: W(pokousani), domNasili: W(domNasili), zver: W(zver), vlak: W(vlak), vytah: W(vytah), co: W(co), plyn: W(plyn), cyklista: W(cyklista) };
  // který typ zpráv a s jakou pravděpodobností patří k indikaci
  function kindFor(ind, where, r, sym) {
    sym = String(sym || '').toLocaleUpperCase('cs-CZ');
    const has = re => re.test(sym);
    const out = (k, p) => (r() < p ? k : null);
    const street = ['ulice', 'verejne'].includes(where);
    const mix = arr => { const x = r(); let acc = 0; for (const [k, p] of arr) { acc += p; if (x < acc) return k; } return null; };
    switch (ind) {
      case 'dn_poly': return where === 'silnice' && r() < 0.05 ? ['vlak'] : r() < 0.3 ? ['ecall', 'dn'] : ['dn'];
      case 'dn_lehke': {
        const x = r();
        if (where === 'silnice' && x < 0.1) return ['zver'];
        if (where === 'ulice' && has(/CYKLIST|KOLOBĚŽ/) && x < 0.5) return ['cyklista'];
        return x < 0.8 ? (r() < 0.22 ? ['ecall'] : ['dn']) : null;
      }
      case 'asist': { // otevření bytu jen tam, kde je byt/dům; na silnici eCall nebo asistence PČR
        const x = r(), home = ['byt', 'rd', 'domov', 'prov'].includes(where);
        if (where === 'silnice') return x < 0.6 ? ['ecall'] : ['asistPcr'];
        return x < 0.5 ? (home ? ['otevreni'] : ['asistPcr']) : x < 0.65 ? ['pozar'] : x < 0.82 ? ['asistPcr'] : (home ? ['otevreni'] : ['asistPcr']);
      }
      case 'popal': return mix([[['pozar'], 0.5], [['plyn'], 0.06]]);
      case 'psych': return mix([[['psych'], 0.42], [['domNasili'], ['byt', 'rd'].includes(where) ? 0.08 : 0]]);
      case 'obeseni': return out(['obeseni'], 0.75);
      case 'tonuti': return out(['tonuti'], 0.8);
      case 'intox': return ['ulice', 'verejne', 'silnice'].includes(where) ? out(['intox'], 0.4) : null;
      case 'resus': case 'nzo': return street || where === 'prov' ? out(['kprSvedci'], 0.4) : out(['kprSvedci'], 0.08);
      case 'amput': return ['prov', 'rd'].includes(where) ? out(['pracUraz'], 0.85) : null;
      case 'trauma':
        if (where === 'priroda') return out(['zachrana'], 0.4);
        // druh datovky musí odpovídat symptomům případu (cyklista jen s cyklistou venku, napadení jen s napadením…)
        if (street) return mix([[['napadeni'], has(/NAPADENÍ(?! ZVÍŘETEM)|BODNÉ|STŘELNÉ/) ? 0.5 : 0], [['cyklista'], where === 'ulice' && has(/CYKLIST|KOLOBĚŽ/) ? 0.5 : 0], [['pokousani'], has(/NAPADENÍ ZVÍŘETEM/) ? 0.5 : 0]]);
        if (where === 'prov') return mix([[['pracUraz'], has(/ZAVALENÍ|ELEKTRICK|AMPUTAC|OTEVŘEN|ZLOMENIN/) ? 0.3 : 0], [['padVyska'], has(/PÁD Z VÝŠE/) ? 0.4 : 0]]);
        if (where === 'rd') return mix([[['padVyska'], has(/PÁD Z VÝŠE/) ? 0.4 : 0], [['domNasili'], has(/NAPADENÍ(?! ZVÍŘETEM)/) ? 0.4 : 0], [['pokousani'], has(/NAPADENÍ ZVÍŘETEM/) ? 0.4 : 0]]);
        if (where === 'byt') return out(['domNasili'], has(/NAPADENÍ(?! ZVÍŘETEM)/) ? 0.4 : 0);
        return null;
      case 'porucha': case 'dusnost': case 'kreceU': case 'hrudnik':
        if (where === 'silnice') return out(['ecallMed'], 0.5);
        if (['byt', 'prov'].includes(where)) return mix([[['vytah'], 0.02], [['co'], ind === 'dusnost' || ind === 'porucha' ? 0.025 : 0]]);
        return null;
      case 'neuro': case 'zvraceni': case 'bolest': case 'horecka': return ['byt', 'rd'].includes(where) ? out(['co'], 0.015) : null;
      default: return null;
    }
  }
  const SRC_CALL = { dn: 'Linka 112', ecall: '112 – eCall', ecallMed: '112 – eCall', otevreni: 'Linka 150 – DZ HZS', pozar: 'Linka 150 – DZ HZS', tonuti: 'Linka 150 – DZ HZS', zachrana: 'Linka 150 – DZ HZS', psych: 'Linka 158 – DZ PČR', napadeni: 'Linka 158 – DZ PČR', intox: 'Linka 158 – DZ PČR', obeseni: 'Linka 158 – DZ PČR', asistPcr: 'Linka 158 – DZ PČR',
    padVyska: 'Linka 112', pracUraz: 'Linka 112', kprSvedci: 'Linka 112', pokousani: 'Linka 158 – DZ PČR', domNasili: 'Linka 158 – DZ PČR', zver: 'Linka 112', vlak: 'Linka 150 – DZ HZS', vytah: 'Linka 150 – DZ HZS', co: 'Linka 150 – DZ HZS', plyn: 'Linka 150 – DZ HZS', cyklista: 'Linka 112' };
  // první datovka: co se právě nabírá
  const LABEL = { dn: 'dopravní nehoda', ecall: 'eCall – dopravní nehoda', ecallMed: 'eCall – zdravotní potíže řidiče', otevreni: 'technická pomoc – otevření bytu', pozar: 'požár', psych: 'psychiatrický pacient', napadeni: 'napadení', intox: 'osoba ležící na veřejnosti', obeseni: 'oběšení', tonuti: 'tonutí', zachrana: 'záchrana osoby v terénu', asistPcr: 'asistence u zásahu PČR',
    padVyska: 'pád z výšky', pracUraz: 'pracovní úraz', kprSvedci: 'osoba bez známek života', pokousani: 'pokousání psem', domNasili: 'domácí násilí', zver: 'střet se zvěří', vlak: 'střet s vlakem', vytah: 'uvíznutí ve výtahu', co: 'podezření na otravu CO', plyn: 'únik plynu / výbuch', cyklista: 'pád cyklisty' };
  const intakeText = (kind, addr, klasif) => {
    let sub = LABEL[kind] || '';
    const kl = String(klasif || '').toLocaleLowerCase('cs-CZ');
    if (kl && sub.toLocaleLowerCase('cs-CZ').includes(kl)) sub = sub.replace(new RegExp(kl, 'i'), '').replace(/^[\s–]+|[\s–]+$/g, '');
    return `nabírá se: ${[klasif, sub].filter(Boolean).join(' – ') || 'událost'} – ${addr}`;
  };
  // zdroj první datovky: KOPIS HZS (linka 150) / OS KŘP PČR (linka 158) / TCTV 112 (linka 112) / eCall
  function intakeSource(kind, r) {
    const s = SRC_CALL[kind] || 'Linka 112';
    const [src, line] = /eCall/.test(s) ? ['ecall', '112'] : /150/.test(s) ? ['hzs', '150'] : /158/.test(s) ? ['pcr', '158'] : ['tctv', '112'];
    return `${pickF(r, SRC[src])} · linka ${line}`;
  }
  // které složky u datovky přijedou samy (pravděpodobnosti podle druhu události)
  const AG_RULES = {
    dn: c => ({ pcr: String(c.sym || '').includes('+ PČR') ? 1 : 0.85, hzs: c.trapped || String(c.sym || '').includes('+ HZS') ? 0.95 : 0.2 }), ecall: () => ({ pcr: 0.5, hzs: 0.3 }), otevreni: () => ({ hzs: 1, pcr: 0.5 }), pozar: () => ({ hzs: 1, pcr: 0.35 }),
    psych: () => ({ pcr: 1 }), napadeni: () => ({ pcr: 1 }), intox: () => ({ pcr: 1 }), obeseni: () => ({ pcr: 1 }), tonuti: () => ({ hzs: 1, pcr: 0.4 }), zachrana: () => ({ hzs: 1 }), asistPcr: () => ({ pcr: 1 }),
    padVyska: () => ({ hzs: 0.3, pcr: 0.3 }), pracUraz: c => ({ pcr: 0.5, hzs: c.trappedWork ? 1 : 0 }), kprSvedci: () => ({ pcr: 0.55 }), pokousani: () => ({ pcr: 0.55 }), domNasili: () => ({ pcr: 1 }),
    zver: () => ({ pcr: 0.5 }), vlak: () => ({ pcr: 1, hzs: 0.8 }), vytah: () => ({ hzs: 1 }), co: () => ({ hzs: 1 }), plyn: () => ({ hzs: 1, pcr: 0.7 }), cyklista: () => ({ pcr: 0.15 }),
  };
  function agenciesFor(kinds, ctx) {
    const ag = {};
    for (const k of kinds) { const rule = AG_RULES[k]; if (!rule) continue; for (const [a, p] of Object.entries(rule(ctx))) if (p > 0 && ctx.r() < p) ag[a] = true; }
    return ag;
  }

  // červeně se zobrazují jen zprávy kritické pro ZOS: bezpečnost přístupu, počet zraněných, vyprošťování, ohrožení života a nebezpečí
  const RED_RE = /bezpečn|nezajištěn|vyčkejte|nevstupovat|zbraň|nůž|útočník|zabarikád|zásahová jednotka|zraněn|zranění|vyprošt|zaklíněn|uvězn|KPR|bez reakce|nereaguje|nekomunikuje|ztuhl|studená|požár|plamen|kouř|dým|zakouř|únik|nadýchan|popálen|oběšen|LZS|tonutí|pod hladinou|bezvědom|sebevražd|podřez|skokem|sebepošk|krvácí|AED|otrav|výbuch|exploze|napětím|agresor|agresivní|zavalen|amputac|pes stále volně/i;
  const isRed = (text, patientCount) => !!patientCount || RED_RE.test(String(text || ''));
  return { KINDS, SRC, SRC_CALL, kindFor, pick: pickF, isRed, intakeText, intakeSource, agenciesFor };
})();

if (typeof module !== 'undefined') module.exports = ZOS_EXTMSG;
