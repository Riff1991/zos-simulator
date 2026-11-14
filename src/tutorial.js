// Výcvik: lekce s pevně připravenými případy (bez náhody). Krok: { t, hl, pause, next, fast, enter, done, skipIf }.
// t i hl mohou být funkce (sim, T); done(sim, T, ui) dostává ui = { sel }.
const ZOS_TUTORIAL = (() => {
  const town = n => ZOS_DATA.towns.find(x => x.n === n);
  const at = (n, dl, dn, addr) => { const w = town(n); return { lat: w.lat + dl, lon: w.lon + dn, addr, town: n, okres: null }; };
  const hasType = (sim, c, type) => !!c && c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === type; });
  const sel = (T, ui) => !!T.c && ui.sel.c === T.c.id;
  const ready = c => !!c && c.status !== 'intake';
  const ck = b => (b ? '✓' : '✗');
  const calling = (sim, c) => sim.s.radioQ.some(e => e.caseId === c.id && (e.state === 'calling' || e.state === 'open'));
  const base = { extKinds: null, intake: 8 };
  const P = (o, script) => Object.assign({}, base, o, { script: Object.assign({ noAbort: true }, script || {}) });

  const lessons = [
    { title: 'Základy', setup(sim, T) {
      T.c = sim.spawnScripted(P({ ind: 'dn_lehke', n: 2, dyn: false, symptoms: ['Čelní náraz při nízké rychlosti', 'Osobní automobil', 'Bolest krku', 'Dospělý'], age: 47, sex: 'M', where: 'silnice', at: at('Jindřichův Hradec', 0.012, 0.01, 'silnice II. třídy, okolí obce Jindřichův Hradec'), extKinds: ['dn'], patch: { trans: true } }, { escort: false }));
    }, steps: [
      { t: 'Vítej na ZOS ZZS JčK. Vlevo jsou výzvy, uprostřed mapa, vpravo posádky. Výcvik má 10 lekcí a vše je připravené předem, nemusíš čekat na náhodu. Hra je pozastavená, klikni Dál.', next: true, pause: true },
      { t: 'Operátor právě přijímá výzvu (záložka „Nabírá se“). Za pár vteřin se objeví v „Čekající“.', hl: '[data-tabcase=intake]', fast: 5, done: (sim, T) => ready(T.c) },
      { t: 'Dopravní nehoda, naléhavost N2. Klikni na výzvu v seznamu (N1 je nejnaléhavější).', hl: '#cases .case-card', pause: true, done: (s, T, ui) => sel(T, ui) },
      { t: 'N2 bez dynamické indikace potřebuje RZP i lékaře (RV). Přetáhni dlaždici nejbližší RZP na případ (nebo klikni Vyslat v nabídce) a pak i RV.', hl: '#detail', pause: true, done: (sim, T) => hasType(sim, T.c, 'RZP') && T.c.docAssigned },
      { t: 'Posádky jedou. Klik na dlaždici posádky vpravo ji sleduje na mapě. Stavy hlásí posádky terminálem, rádiem jen důležité věci. Počkej na hlášení HZS a PČR nahoře (červené pruhy) a na první rádiové volání: klikni Na příjmu (klávesa P) a vyber odpověď.', hl: '#radio-live', fast: 10, done: (sim, T) => sim.s.radioQ.some(e => e.state === 'done') || sim.s.radioMode !== 'interactive' },
      { t: 'Hotovo. Červené pruhy jsou datové zprávy složek a upozornění, klik otevře případ, ✕ je skryje. Body a rozbor uvidíš po směně, pravidla jsou v menu ☰ Pravidla. Další lekce: vstřícná jízda.', next: true, pause: true },
    ] },
    { title: 'Vstřícná jízda', setup(sim, T) {
      T.c = sim.spawnScripted(P({ ind: 'bolest', n: 3, dyn: false, symptoms: ['Bolest břicha', 'Dospělý'], age: 71, sex: 'Ž', where: 'rd', at: at('Dačice', 0.004, 0.004, 'Husova 12, Dačice'), patch: { trans: true } }, { vstricna: true }));
    }, steps: [
      { t: 'Posádky z periferie (Dačice, Suchdol, Vyšší Brod…) jedou do nemocnice dlouho. Je-li pacient schopen překladu, vyjede mu naproti RZP z oblasti nemocnice. Pravidlo: jen když jsou v té oblasti aspoň 2 volné RZP, jinak −3 b. Počkej na výzvu.', fast: 5, done: (s, T) => ready(T.c) },
      { t: 'N3 z Dačic. Otevři výzvu a vyšli nejbližší RZP (Dačice).', pause: true, done: (sim, T) => hasType(sim, T.c, 'RZP') },
      { t: 'Posádka ošetří pacienta a zavolá rádiem. Na příjmu, a když hlásí „je schopen překladu“, vyber „Naproti …“ (nebo přetáhni volnou RZP z oblasti JH na případ).', hl: '#radio-live', fast: 10, done: (s, T) => !!T.c.vstricna && ['dispatched', 'completed'].includes(T.c.vstricna.state) },
      { t: (sim, T) => `Správně. Volných RZP v oblasti nemocnice bylo ${T.c.vstricna ? T.c.vstricna.freeAtOffer : '?'}. Obě posádky se potkají na trase, předají pacienta a každá jede dál. Počkej na předání.`, fast: 30, done: (s, T) => !!T.c.vstricna && T.c.vstricna.state === 'completed' },
    ] },
    { title: 'Exitus a koroner', setup(sim, T) {
      T.c = sim.spawnScripted(P({ ind: 'resus', n: 1, symptoms: ['Nedýchá', 'AVPU-U', 'Dospělý'], age: 80, sex: 'M', where: 'byt', at: at('Vimperk', 0.004, 0.003, 'Steinbrenerova 21, Vimperk'), fate: 'signs' }, { coroner: 'available' }));
    }, steps: [
      { t: 'N1 v domě ve Vimperku: nedýchá. Počkej na výzvu a vyšli RZP i RV (N1 vždy s lékařem). RV je tady dál než RZP.', fast: 5, done: (s, T) => ready(T.c) },
      { t: 'Vyšli nejbližší RZP a RV.', pause: true, done: (sim, T) => hasType(sim, T.c, 'RZP') && T.c.docAssigned },
      { t: 'Posádka na místě zjistí jisté známky smrti a zavolá. Na příjmu a potvrď, že ZOS zjistí koronera.', hl: '#radio-live', fast: 10, done: (s, T) => !!T.c.exitus },
      { t: 'RV ještě jede zbytečně. Odvolej ho tlačítkem Odvolat v detailu případu (do 3 min od hlášení +1 b.).', hl: '#detail', pause: true, done: (sim, T) => !hasType(sim, T.c, 'RV') },
      { t: 'ZOS zjišťuje koronera (2–5 min). Počkej, až začne blikat dlaždice KORONER.', fast: 30, done: (s, T) => !!T.c.coroner && T.c.coroner.state === 'available' },
      { t: 'Koroner je k dispozici. Přetáhni dlaždici KORONER (vpravo, skupina Speciální) na případ. Do 10 min +1 b., do 15 min ho jinak vyšle kolega za −1.', hl: '.st-coroner', pause: true, done: (s, T) => !!T.c.coroner && T.c.coroner.state === 'sent' },
      { t: 'Druhá situace: neúspěšná resuscitace a koroner NENÍ k dispozici. Dál.', next: true, pause: true, enter(sim, T) {
        T.b = sim.spawnScripted(P({ ind: 'nzo', n: 1, symptoms: ['Nedýchá', 'AVPU-U', 'Dospělý'], age: 66, sex: 'M', where: 'ulice', at: at('Vimperk', -0.006, 0.004, 'Pivovarská 5, Vimperk'), fate: 'cpr-fail' }, { coroner: 'unavailable' }));
      } },
      { t: 'Vyšli RZP i RV a počkej na hlášení.', fast: 10, done: (sim, T) => ready(T.b) && hasType(sim, T.b, 'RZP') && T.b.docAssigned },
      { t: 'Čekám na výsledek resuscitace a zjištění koronera.', fast: 30, done: (s, T) => !!T.b.coroner && T.b.coroner.state === 'unavailable' },
      { t: 'Koroner není k dispozici: prohlídku zemřelého provede RV (zůstane na místě), RZP se vrací. RV lze odvolat, ale musí se vrátit; každá hodina čekání −1 b.', next: true, pause: true },
    ] },
    { title: 'LZS', setup(sim, T) {
      sim.setScriptedWeather('marginal');
      T.c = sim.spawnScripted(P({ ind: 'tonuti', n: 1, symptoms: ['Tonutí', 'Nedýchá', 'AVPU-U', 'Dospělý'], age: 34, sex: 'M', where: 'priroda', at: at('Lipno nad Vltavou', 0.01, 0.012, 'pláž u Lipna, okolí obce Lipno nad Vltavou'), fate: 'rosc', lzsTech: true }, { pilot: 'approve', escort: false }));
    }, steps: [
      { t: 'LZS Kryštof 13 (Planá) letí jen v dobrém počasí. Nahoře vidíš „LZS na konzultaci“: nejdřív se zeptej pilota. Neletové počasí = LZS poslat nejde. LZS nahrazuje RV, pokud RV nedojede do 15 min (+1 b.).', fast: 5, done: (s, T) => ready(T.c) },
      { t: 'Tonutí u Lipna, N1, RV je daleko. V detailu případu klikni „Konzultovat s pilotem“.', hl: '#detail', pause: true, done: (s, T) => !!T.c.lzsConsult },
      { t: 'Pilot rozhoduje (do minuty).', fast: 10, done: (s, T) => !!T.c.lzsConsult && T.c.lzsConsult.status === 'approved' },
      { t: 'Pilot let povolil. Vyšli LZS (Navrhnout posádku, sekce LZS, nebo přetáhni dlaždici Kryštof) a také RZP.', pause: true, done: (sim, T) => T.c.lzsActive && hasType(sim, T.c, 'RZP') },
      { t: 'Pláž je nepřístupný terén: v detailu klikni „Vyžádat technickou součinnost HZS“.', hl: '#detail', pause: true, skipIf: (s, T) => !T.c.lzsTechRequired, done: (s, T) => !!T.c.lzsTechRequested },
      { t: 'LZS letí, ošetří pacienta a poletí s ním na heliport u nemocnice. Čekej.', fast: 30, done: (s, T) => !!T.c.lzsPatientToHospital },
      { t: 'Na heliportu musí pacienta převzít pozemní RZP. V nabídce posádek vyšli „RZP – převoz z heliportu“. Bez ní LZS čeká a ztrácíš body (−2 za každých 5 min).', hl: '#detail', pause: true, done: (s, T) => !!T.c.lzsTransferCrewId },
      { t: 'Hotovo. LZS se vrátí na základnu.', next: true, pause: true },
    ] },
    { title: 'Doprovod RV', setup(sim, T) {
      sim.setScriptedWeather('clear');
      T.c = sim.spawnScripted(P({ ind: 'resus', n: 1, symptoms: ['Nedýchá', 'AVPU-U', 'Dospělý'], age: 58, sex: 'M', where: 'rd', at: at('Třeboň', 0.005, 0.004, 'Palackého 14, Třeboň'), fate: 'rosc' }, { escort: true }));
    }, steps: [
      { t: 'N1, pacient po resuscitaci. Počkej na výzvu a vyšli RZP i RV.', fast: 5, done: (s, T) => ready(T.c) },
      { t: 'Vyšli RZP a RV.', pause: true, done: (sim, T) => hasType(sim, T.c, 'RZP') && T.c.docAssigned },
      { t: 'Po KPR RV doprovází pacienta do nemocnice vždy a není odvolatelný. Čekej na hlášení „jedeme společně“.', fast: 20, done: (sim, T) => T.c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV' && k.caseRole === 'escort'; }) },
      { t: 'Teď druhý případ: dítě s křečemi. Dál.', next: true, pause: true, enter(sim, T) {
        T.b = sim.spawnScripted(P({ ind: 'pedi', n: 2, dyn: false, symptoms: ['Febrilní křeče', 'Dítě'], age: 3, sex: 'M', where: 'rd', at: at('Dačice', -0.004, -0.006, 'Zahradní 22, Dačice'), patch: { trans: true } }, { escort: true, escortFree: true }));
      } },
      { t: 'Vyšli RZP i RV (N2 s dítětem). Doprovod RV tu bude odvolatelný.', fast: 5, done: (sim, T) => ready(T.b) && hasType(sim, T.b, 'RZP') && T.b.docAssigned },
      { t: 'Čekej na hlášení „jsme odvolatelní“. Takový doprovod můžeš vyslat jinam.', fast: 20, done: (sim, T) => T.b.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV' && k.caseRole === 'escort' && k.escortFree; }) },
      { t: 'Vzniká nová N1 a odvolatelný RV je nejblíž. Až se výzva objeví, přetáhni dlaždici toho RV na nový případ.', pause: true, enter(sim, T) {
        T.d = sim.spawnScripted(P({ ind: 'aryt', n: 1, symptoms: ['Bezvědomí', 'Dýchá', 'AVPU-U', 'Dospělý'], age: 70, sex: 'M', where: 'rd', at: at('Dačice', 0.002, -0.008, 'Zámecká 3, Dačice'), patch: { trans: true } }, { escort: false }));
      }, done: (sim, T) => hasType(sim, T.d, 'RV') },
    ] },
    { title: 'Sekundární převoz', setup(sim, T) {
      T.c = sim.spawnScriptedSecondary(sim.s.t + 1800, { from: 'h-ta', to: 'h-cb' });
    }, steps: [
      { t: 'Plánovaný převoz N4 z Tábora do ČB, přistavení do 30 min (±15 min). Vyslat příliš brzy znamená blokovat posádku a pokrytí. Vyber RZP a pošli ji tak, aby dojela kolem termínu (ETA vidíš v nabídce, hra běží).', fast: 5, done: (sim, T) => hasType(sim, T.c, 'RZP') },
      { t: (s, T) => T.c.timeScore == null ? 'Posádka jede, čekej na přistavení.' : `Přistaveno ${Math.round(Math.abs(T.c.scheduleDelta) / 60)} min ${T.c.scheduleDelta < 0 ? 'před' : 'po'} termínu, ${T.c.timeScore}/100 b.`, fast: 30, done: (s, T) => T.c.status === 'closed' },
    ] },
    { title: 'Součinnost PČR a HZS', setup(sim, T) {
      T.c = sim.spawnScripted(P({ ind: 'psych', n: 2, dyn: true, symptoms: ['Agitovanost', 'Verbální agrese', 'Dospělý'], age: 34, sex: 'M', where: 'byt', at: at('Písek', 0.004, 0.003, 'Velké náměstí 5, Písek'), patch: { trans: true } }, { agency: { kind: 'pcr', why: 'agresivní pacient' } }));
      T.b = sim.spawnScripted(P({ ind: 'trauma', n: 3, dyn: false, symptoms: ['Pád ze schodů', 'Bolest zad', 'Dospělý'], age: 82, sex: 'Ž', where: 'byt', at: at('Strakonice', -0.004, 0.004, 'Mírová 9, Strakonice'), patch: { trans: true } }, { agency: { kind: 'hzs', why: 'na transport' } }));
    }, steps: [
      { t: 'Dva případy: agresivní pacient v Písku a pád v bytě ve Strakonicích. Vyšli RZP k oběma.', fast: 5, done: (sim, T) => hasType(sim, T.c, 'RZP') && hasType(sim, T.b, 'RZP') },
      { t: 'Posádky na místě požádají o součinnost (rádio a červený pruh). Čekej.', fast: 10, done: (s, T) => !!(T.c.agencies && T.c.agencies.pcr) && !!(T.b.agencies && T.b.agencies.hzs) },
      { t: 'V Písku žádají policii. Přetáhni dlaždici PČR (skupina Speciální) na ten případ. Do 6 min +1 b., pozdě −1.', hl: '.st-pcr', pause: true, done: (s, T) => !!T.c.agencies && ['sent', 'onscene'].includes(T.c.agencies.pcr.state) },
      { t: 'Ve Strakonicích žádají hasiče na transport. Přetáhni dlaždici HZS.', hl: '.st-hzs', pause: true, done: (s, T) => !!T.b.agencies && ['sent', 'onscene'].includes(T.b.agencies.hzs.state) },
    ] },
    { title: 'Pokrytí', setup(sim, T) {
      for (const k of sim.s.crews) if (k.oblast === 'ČK' && k.type === 'RZP' && k.st !== 'frymburk') k.state = 'off';
      T.free = sim._freeRzp('ČK');
      T.c = sim.spawnScripted(P({ ind: 'bolest', n: 3, dyn: false, symptoms: ['Bolest zad', 'Dospělý'], age: 60, sex: 'Ž', where: 'rd', at: at('Frymburk', 0.003, 0.003, 'Frymburk 118'), patch: { trans: true } }));
    }, steps: [
      { t: (sim) => `V oblasti Český Krumlov je teď volná jen jedna RZP (Frymburk). Nahoře sleduj Pokrytí (${sim.s.cov.last == null ? '–' : Math.round(sim.s.cov.last * 100)} %): podíl obyvatel, ke kterým se RZP dostane do 15 min. N3 z Frymburku: nejbližší RZP by oblast nechala bez volné posádky. Vzdálenější posádka z jiné oblasti je tady v pořádku, nebodujeme ztrátu volby. Vyšli RZP a sleduj čísla.`, fast: 5, done: (sim, T) => hasType(sim, T.c, 'RZP') },
      { t: (sim, T) => `Volných RZP v oblasti ČK: ${sim._freeRzp('ČK')} (před tím ${T.free}). Pokrytí kraje: ${sim.s.cov.last == null ? '–' : (sim.s.cov.last * 100).toFixed(1)} %. Posádka se po výjezdu vrátí a pokrytí se obnoví. Dobrý dispečer hlídá, aby žádná oblast nezůstala prázdná.`, next: true, pause: true },
    ] },
    { title: 'Mimořádná událost', setup(sim, T) {
      T.c = sim.spawnScriptedMU({ town: 'Písek', cas: 20, groupsRequired: 6, aircraft: false });
    }, steps: [
      { t: 'Hromadná nehoda u Písku: podezření na MU (mimořádnou událost). Počkej na výzvu, pak v detailu zvol roli „Řešit MU“; kolega (simulace) převezme běžný provoz.', fast: 5, done: (s, T) => ready(T.c) },
      { t: 'V detailu klikni „Řešit MU“ a pak „Požádat o modul MU“.', hl: '#detail', pause: true, done: (sim, T) => sim.s.muPlayerRole === 'mu' && T.c.mu.requestSent },
      { t: 'Vyšli první posádky: RZP a RV (N1). Od vyhlášení MU se N3 odkládají.', pause: true, done: (sim, T) => hasType(sim, T.c, 'RZP') && T.c.docAssigned },
      { t: 'Klikni „Vyžádat nemocniční součinnost“. První posádka brzy potvrdí rozsah.', hl: '#detail', pause: true, done: (s, T) => !!T.c.mu.hospitalInfoRequested },
      { t: 'Čekej, až první posádka potvrdí rozsah (METHANE).', fast: 10, done: (s, T) => T.c.mu.phase === 'declared' },
      { t: 'MU je potvrzena. Požádej o 2 další skupiny a posílej další RZP. Od 30. minuty pomáhají kraje Vysočina, Plzeňský, Středočeský, Jihomoravský a Dolní Rakousko, do ~2 h je MU hotová.', hl: '#detail', pause: true, done: (s, T) => T.c.mu.reinforcementRequests > 0 },
      { t: 'Posílej RZP, dokud je „zbývá ošetřit“ větší než 0. Hra běží zrychleně; kdykoli můžeš pokračovat tlačítkem Dál.', fast: 30, next: true, done: (s, T) => T.c.status === 'closed' },
    ] },
    { title: 'Bizarní finále', setup(sim, T) {
      T.x = sim.spawnScripted(P({ ind: 'nzo', n: 1, symptoms: ['Nedýchá', 'AVPU-U', 'Dospělý'], age: 52, sex: 'M', where: 'priroda', at: at('Třeboň', -0.008, 0.012, 'u rybníka Svět, okolí obce Třeboň'), fate: 'wakes', wakeIn: 140, lzsTech: false }, { escort: false }));
      T.y = sim.spawnScripted(P({ ind: 'dn_poly', n: 1, symptoms: ['Čelní náraz při vysoké rychlosti', 'Osobní automobil', 'Uvězněný', 'Více zraněných', 'Dospělý'], age: 41, sex: 'Ž', where: 'silnice', at: at('Veselí nad Lužnicí', 0.01, 0.02, 'dálnice D3, okolí obce Veselí nad Lužnicí'), patientCount: 2, extKinds: ['dn'] }, { escort: false }));
    }, steps: [
      { t: 'Závěrečná zkouška: za chvíli se sejde několik komplikací najednou. Návod jen radí, rozhoduješ ty. Počkej na výzvy.', fast: 5, done: (s, T) => ready(T.x) && ready(T.y) },
      { t: (sim, T) => `Dvě N1: zástava u rybníka u Třeboně a polytrauma na D3. Třeboňský RV je 5 min od zástavy, k D3 je každý RV 15+ min. Elegantní řešení: Třeboň RZP + RV k zástavě, k D3 LZS (lékař ze vzduchu) a RZP. Stav: zástava RZP ${ck(hasType(sim, T.x, 'RZP'))} RV ${ck(T.x.docAssigned)}, D3 RZP ${ck(hasType(sim, T.y, 'RZP'))} lékař ${ck(T.y.docAssigned)}.`, pause: true, done: (sim, T) => hasType(sim, T.x, 'RZP') && T.x.docAssigned && hasType(sim, T.y, 'RZP') && T.y.docAssigned },
      { t: 'Pacient u rybníka se po cestě probral: doplňková naléhavost N1 → N2, ZOS zavolal posádky. Počkej na to.', fast: 10, done: (s, T) => T.x.nDopl === 2 },
      { t: 'Posádka u D3 ohlásí METHANE a žádá další RZP a LZS. Odpověz rádiem a vyšli druhou RZP k D3. HZS píše, že probíhá vyproštění (červené pruhy).', hl: '#radio-live', fast: 10, done: (sim, T) => T.y.crews.filter(id => { const k = sim.crewOf(id); return k && k.type === 'RZP'; }).length >= 2 },
      { t: 'Třetí komplikace: chata u Lipna bez čísla popisného, pacient s bolestí na hrudi. Po objevení výzvy vyšli RZP.', pause: true, enter(sim, T) {
        T.z = sim.spawnScripted(P({ ind: 'hrudnik', n: 3, dyn: false, symptoms: ['Bolest na hrudi', 'Dospělý'], age: 63, sex: 'M', where: 'rd', at: at('Lipno nad Vltavou', 0.003, 0.004, 'chata bez čp., Lipno nad Vltavou'), patch: { trans: true } }, { notFound: true }));
      }, done: (sim, T) => ready(T.z) && hasType(sim, T.z, 'RZP') },
      { t: 'Posádka nemůže najít místo. Na příjmu a odpověz „Rozumí, voláme na místo“.', hl: '#radio-live', fast: 10, done: (sim, T) => T.z.notFoundUntil != null && !calling(sim, T.z) },
      { t: 'Zvládl jsi celý výcvik. Případy se dokončí samy; po směně uvidíš rozbor bodů. Hodně štěstí na ostré směně!', next: true, pause: true },
    ] },
  ];
  return { lessons };
})();
if (typeof module !== 'undefined') module.exports = { ZOS_TUTORIAL };
