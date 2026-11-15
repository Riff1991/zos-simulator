# Changelog – ZOS simulátor

Hra/simulátor práce primárního dispečera ZOS ZZS Jihočeského kraje. Nejde o nástroj pro ostrý provoz. Osoby, kontakty a události jsou generované.

Formát: nejnovější verze nahoře. Každá verze má balíček pro Mac v sekci **Releases** na GitHubu (`zos-simulator-mac-vX.Y.Z.zip`).

Číslování od v0.15.0: `hlavní.menší.oprava` (0.15.1 = drobná oprava, 1.0.0 = oficiální vydání). Testovací verze z větve `dev` (…`-dev`) běží na https://riff1991.github.io/zos-simulator/dev/.

---

## v0.21.5 – 2026-11-15

> Míň zbytečného pípání: nekritické datovky se jen zapíšou do logu, pípají a vyskakují jen kritické (červené). Drobné varování „opožděný výjezd“ má jen toast bez pípnutí.

---

## v0.21.4 – 2026-11-15

> Na mapě je nová volitelná vrstva Pokrytí: kam se do limitu dostane nejbližší volná RZP. Přepínač je v liště nahoře v okně mapy, výchozí stav je vypnuto.

- Tři zobrazení: Izochrony (plynulé pásy s vrstevnicemi), Buňky (šestiúhelníky) a Bílá místa (jen díry mimo limit, šrafovaně a s popisky).
- Limit dojezdu 15 / 20 / 25 min, ukázka podílu území v limitu, nejhoršího místa a počtu slabých oblastí.
- Živé a reálné: dojezd po silniční síti z aktuálně volných RZP (režim N2), přepočítává se při změně dostupnosti vozů.

---

## v0.21.3 – 2026-11-15

> Datové zprávy od HZS a PČR jsou stručné a jen k věci: bezpečnost přístupu, počet zraněných, vyprošťování a nebezpečí. Kritické zprávy jsou červeně. Víc druhů událostí, datovka přichází před výzvou a složky jedou samy.

- Zprávy bez techniky jednotek (CAS, RZA…), bez odtahů, úklidu, dokumentace nehody, řízení dopravy, dechových zkoušek a ztotožňování.
- Popis nehody bez barev vozidel, jen typ (osobní vozidlo, dodávka, kamion, motocykl, cyklista…).
- eCall jen s polohou a hlasem volajícího, bez paliva, počtu osob, přesnosti GPS a směru.
- Červeně: bezpečnost přístupu, počet zraněných, vyprošťování, ohrožení života a nebezpečí (v horním upozornění i v panelu případu).
- Víc druhů událostí s datovkou: pád z výšky, pracovní úraz, KPR svědků, pokousání psem, domácí násilí, střet se zvěří, střet s vlakem, uvíznutí ve výtahu, otrava CO, únik plynu, pád cyklisty. Pestřejší následné zprávy.
- Případy s datovkou: nejdřív datovka „nabírá se: … (112/150/158)“, výzva přijde po 3–5 min, pak postupně podrobnosti. Složky PČR/HZS jedou rovnou samy.
- Výzvy s příznakem PČR/HZS bez datovky: červené upozornění „výzva vyžaduje policii/hasiče“, přiřadit dlaždici; po ~6 min trestný bod. Posádka kvůli tomu nečeká.
- Věkový filtr: žádný opilý ani agresivní kojenec (alkohol a drogy až od 12 let, agrese od 5 let).
- Kliknutí do volného místa pod seznamem případů sbalí všechny karty.
- Kliknutí na rozbalený výjezd v seznamu ho sbalí.
- První datovka „nabírá se: <indikace> – <upřesnění> – <adresa>“ ukazuje zdroj (KOPIS HZS / OS KŘP / TCTV 112 / eCall) a linku (112, 150, 158). Indikace zůstává nadřazená; zpráva o opilé osobě se už neobjeví u dušnosti, bolesti na hrudi, poruchy vědomí ani křečí.
- Vstřícná jízda přetažením: dlaždici periferní RZP s pacientem přetáhněte na dlaždici volné RZP z oblasti u nemocnice, nebo naopak. Informace „schopen překladu“ je v detailu výjezdu i v detailu posádky.
- Hlas: opravy výpadků zvuku. Fronta už nezahlcuje hlasový modul při rychlém běhu hry (syntéza se spouští až těsně před přehráním), zaseklé požadavky se po čase zahodí a hlasový modul se po opakovaném zaseknutí nebo pádu znovu spustí.
- Oprava: příznak „Otevírání bytu“ se u asistence mohl objevit dvakrát.

---

## v0.21.2 – 2026-11-15

> Rádio: na konci každé relace je ticho a pípnutí konce vysílání, takže se poslední slabika věty neztrácí. Zvuk vysílačky je realističtější (jemné digitální vrčení kodeku, míň drsné zkreslení, bez náhodných výpadků) a každá posádka mluví jiným mužským hlasem.

- Rádio: ticho a pípnutí na konci relace, odstup mezi relacemi, zrušené náhodné výpadky uprostřed vět.
- Hlasy: dispečer je hlubší a pomalejší mužský hlas, posádky jsou vyšší, každá s jinou výškou a tempem. ORL se čte jako slovo.
- Cloudový hlas (volitelný): Azure Speech zdarma, hlas Antonín (dispečer i posádky odlišené výškou a tempem), přes vlastní Cloudflare Worker (návod v cloudflare/README.md). Nastavení → Zdroj hlasu / Adresa cloudu. Když cloud selže, hra sama použije offline Piper.

---

## v0.21.1 – 2026-11-14

> Opraven systém majáků: posádky jedou k případu i s pacientem vždy na majáky (rychlost se liší podle naléhavosti N1–N3), bez majáků se vracejí. Režim N3 je návrat na majáky na pokyn dispečera; RV dál než 10 min od základny se vrací na majáky samo.

- Majáky: k případu (N1–N3) i při transportu vždy zapnuté, modrá tečka svítí. Dřív N3 jelo bez majáků.

---

## v0.21.0 – 2026-11-14

> Přibyli first respondeři (HZS, JPO, PČR, VZS, horská služba) se zelenými AED značkami na mapě a dlaždicí FR, která vyšle nejbližšího. Posádku lze poslat zpět v režimu N3 na majáky (modrá tečka na dlaždici) a změnit jí naléhavost jízdy. Rádio má vlastní okno vlevo dole: přepis a zápis do terminálu se objeví se zpožděním, mluvící posádka bliká a žádost o lékaře je červená a nevyšle posádku sama. Opravy: LIBERO jde odpřáhnout, RZP Planá je zpět v ČB, RZP nejede s pacientem, dokud RV nedojede, rádio už neusekává konce vět a odvolání výjezdu zní správně.

- FR: 60 jednotek (HZS, JPO II/III/IV, PČR, VZS, Horská služba) se zelenou AED značkou na mapě (vrstva FR). Dlaždice FR (skupina Speciální) přetažená na případ vyšle nejbližšího; v kartě případu lze vybrat ze tří nejbližších. Datová zpráva hlásí příjezd a převzetí TANR od svědků.
- Návrat v režimu N3: tlačítko v panelu posádky + rádiová relace („po předání se prosím vracejte v režimu N3“ → potvrzení → „ZCB101 díky, konec“). Modrá tečka na dlaždici svítí, když posádka jede na majáky. RV mimo pravidelně zajištěnou oblast (>10 min od základny) se vrací na majáky vždy.
- Naléhavost jízdy posádky lze změnit (N1–N3); rychlost a majáky podle naléhavosti.
- Rádio: nové okno vlevo dole pod panelem případu s dlaždicemi odpovědí. Přepis relace a zápis do terminálu se objeví s několikavteřinovým zpožděním. Žádost o lékaře je červená; odpověď „Za vámi RV…“ posádku automaticky nevyšle – vyšlete ji ručně, jinak ji po prodlení vyšle kolega (−1 b.). Červené upozornění se objeví až po odpovědi na rádiu.
- Mluvící posádka bliká v přehledu posádek.
- Příznak ZZUM (výjezd bez lékaře) u RZP ze ZZUM stanoviště, ne u N1.
- Opravy: LIBERO lze odpřáhnout od posádky na základně; RZP Planá zpět ve skupině České Budějovice; RZP s pacientem čeká na RV, který je na cestě; rádio už neusekává konce vět; odvolání výjezdu: „ZCBxxx, ZCB101 – ruším výjezd, vraťte se na základnu“; po zajištění osoby už nejede vyjednavač; zabarikádovaná osoba → zásahová jednotka PČR z Českého Krumlova se simulovaným dojezdem.

---

## v0.20.1 – 2026-11-14

> Hlasové rádiové relace nově říkají jedničku jako „jedna“, ne „jeden“. Volací znaky i čísla se čtou rádiově: „zecébé dvacet jedna“, „tři sta jedenáct“, „naléhavost en jedna“.

- Rádio: číslo končící jedničkou se vyslovuje „jedna“ (dříve „jeden“); všechna čísla v relacích se čtou slovy.

---

## v0.20.0 – 2026-11-14

> Výcvik má nově 10 lekcí s předem připravenými případy, takže se na nic nečeká a projdou se všechny hlavní mechaniky: vstřícná jízda, exitus a koroner, LZS, doprovod RV, sekundární převoz, součinnost PČR a HZS, pokrytí a mimořádná událost. Závěrečné bizarní finále spojí probuzenou zástavu, polytrauma bez blízkého lékaře a nenalezeného pacienta. Výcvik už nepřepisuje uloženou směnu a v úvodní obrazovce se changelog zobrazuje jako krátké odstavce.

- Výcvik: 10 lekcí (Základy, Vstřícná jízda, Exitus a koroner, LZS, Doprovod RV, Sekundární převoz, Součinnost PČR a HZS, Pokrytí, Mimořádná událost, Bizarní finále). Každá lekce vloží vlastní případ, náhodné případy jsou ve výcviku vypnuté, kroky lze přeskočit.
- Výcvik už nepřepisuje uloženou rozehranou směnu.
- Changelog na úvodní obrazovce: u každé z posledních 3 verzí jeden odstavec.

---

## v0.19.3 – 2026-11-14

> Posádka je po předání pacienta v přehledu transportů volná ihned, zpáteční jízda se už nepočítá. Místo odhadu „volná za 31 min“ se u předávající posádky ukáže „Volná nyní“. Přehled nově zobrazuje i doprovodné RV, které je po příjezdu do nemocnice volné hned, takže se v přehledu objeví jen do příjezdu.

- Přehled transportů: posádka po předání pacienta je volná ihned (zpáteční jízda se už nepočítá). Místo odhadu „volná za 31 min“ se u posádky, která právě předává, ukáže „Volná nyní“.
- Přehled transportů zobrazuje i doprovodné RV: po příjezdu do nemocnice je volné hned, a proto se v přehledu objeví jen do příjezdu.

---

## v0.19.2 – 2026-11-14

> Vyslaná LZS nově splní požadavek na lékaře u N1/N2 (RV lze poslat i tak) a po odvolání nebo návratu LZS lékař zase chybí. Při konzultaci počasí se může let po vzletu v několika procentech případů přerušit a dispečer musí zajistit jiného lékaře. Koroner se nejdřív zjišťuje, pak ho dispečer přetáhne na případ a včasné vyslání se bodově odměňuje. Panel posádek má skupinu Speciální (LZS, RZP Planá, KORONER, PČR, HZS, MU), za adresou je zkratka okresu a vracející se vůz jede po přidělení výzvy rovnou k ní.

- LZS nahrazuje RV: vyslaná LZS splní požadavek na lékaře u N1/N2 (RV lze poslat i tak, kdyby LZS nedoletěla). Když se LZS odvolá nebo vrátí, RV zase chybí.
- Počasí: když je LZS na konzultaci, může se po vzletu v několika procentech případů let přerušit („pro počasí let nelze dokončit, vracíme se na základnu“) a dispečer musí zajistit jiného lékaře.
- Koroner: ZOS nejdřív zjistí dostupnost; když je k dispozici, dlaždice KORONER bliká a dispečer ho na případ přetáhne. Jezdí fiktivně, bez omezení počtu výjezdů, dorazí třeba za několik hodin a případ se může uzavřít hned po odjezdu posádek. Nevyslaný do 15 min → vyšle kolega (−1), včas do 10 min +1.
- Za adresou výzvy zkratka okresu (CB, CK, JH, PT, ST, PI, TA).
- „Právě řešené“ řazené od nejnovějšího; u případu značky PČR, HZS a KORONER podobně jako posádky.
- Panel posádek: ve skupině Speciální LZS, vedle ní RZP Planá (základna u LZS, poloha posunuta k heliportu), pod tím KORONER, PČR a HZS a až pak moduly MU.
- Vůz, který se vrací na základnu, jede po přidělení výzvy rovnou k ní, bez zastavení. Na dálnici se neotáčí – pokračuje k nejbližšímu sjezdu, na silnicích I. a nižších tříd se otočí hned.

---

## v0.19.1 – 2026-11-14

> Přibyl Výcvik – první směna s návodem: klidná směna, ve které hra krok za krokem provede výběrem případu, vysláním RZP a RV, rádiem a upozorněními. Mimořádná událost je hotová do zhruba dvou hodin, protože od 30. minuty pomáhají posádky sousedních krajů a Dolního Rakouska. Během rádiové relace hra běží 1× a ukazatel rychlosti to zobrazuje. Opravy se týkají čekání LZS na heliportu, postihu za přehlédnutou datovou zprávu a hlášení „na kruháči“.

- Výcvik: nová položka v menu „Výcvik – první směna s návodem“. Klidná směna bez MU a sekundárů, hra provede krok za krokem (výběr případu, vyslání RZP a RV, sledování posádky, rádio, upozornění, dlaždice PČR/HZS).
- MU je hotová do ~2 h: od 30. minuty po potvrzení pomáhají posádky sousedních krajů (Vysočina, Plzeňský, Středočeský, Jihomoravský kraj, Dolní Rakousko), po 110 min převezmou zbylé pacienty. Pozastavení N3 během MU končí, jakmile na místě nezbývají pacienti.
- Během rádiové relace hra běží 1× a ukazatel rychlosti to ukazuje (nastavená rychlost je čárkovaně, vrátí se po relaci).
- Domov pro seniory: místo jen patro / oddělení, bez pokojů.
- Opravy: LZS na heliportu už nečeká na RZP donekonečna (po 25 min převezme pacienta personál nemocnice, −3 b. místo opakovaných srážek); přehlédnutá datová zpráva se netrestá; u centrové péče „Rozumí“ bez „nahlásíme“ není chyba; hlášení „na kruháči“ jen u posádek, které jedou přes kruháč Okružní × silnice č. 3.

---

## v0.19.0 – 2026-11-14

- Hlasové rádiové relace: posádky mluví česky přímo ve hře (vlastní syntéza, stejný zvuk na Macu, Windows i mobilu, funguje i offline). Zvuk digitální vysílačky: tón klíčování, úzké pásmo, komprese, šum a občasné výpadky; každá posádka má svůj hlas.
- Interaktivní rádio: posádka volá „ZCB101, zde ZCB…, příjem“, dispečer klikne Na příjmu (klávesa P), posádka předá zprávu a dispečer volí odpověď (vstřícná jízda, žádost o lékaře, exitus, doprovod…). Bez odezvy posádka volání opakuje a pak si poradí sama (−1 provozní bod).
- Dispečer ZCB101 má vlastní stálý hlas, každá posádka jiný. Tempo hlasu volitelné (Klidné / Normální / Rychlé / Velmi rychlé). Hlášení ve správné češtině: „jedeme do Jindřichova Hradce na urgentní příjem“, „naproti z Jindřichova Hradce posádka 312“.
- Spojový řád podle ZZS JčK: statusy jen terminálem; rádiem cíl transportu (vždy při odjezdu, žargon „jedeme urgentní příjem Tábor“), z periferie „dojedeme sami / je schopen překladu“, u centrové péče dojezd a avízo („rozumí, nahlásíme“), u polytraumatu pohlaví, věk, trauma triage a ventilace, v ČB druhé hlášení „na kruháči“.
- Je-li na místě RV, volá za oba vozy („zde ZCB 319 a 315“): doprovod („jedeme společně…, my jsme odvolatelní“), předání RZP, ponechání na místě. Exitus „prosím zjistěte nám dostupnost koronera“, výsledek koronera telefonicky do terminálu. Žádost o lékaře „zhoršení / posouzení stavu“ → odpověď „za vámi RV Třeboň“ rovnou vyšle zvolenou posádku.
- ZOS volá posádky sám: doplnění („pacient se probírá, měníme naléhavost na N2“) tlačítkem Volat posádku, odvolání („vraťte se na základnu, výjezd zrušen“).
- Kryštof 13: zkouška spojení v 8:00 a 20:00, hlášení po vzletu s časem přistání (ZOS předá posádkám), hlášení transportu na heliport.
- Nové situace z místa: nenalezený pacient („rozumí, voláme na místo“), žádost o policii / hasiče, METHANE u více zraněných.
- Dlaždice KORONER, PČR a HZS v panelu posádek: přetažením na případ (i do panelu vybraného případu) ZOS vyrozumí; žádost posádky bliká červeně, klik na upozornění otevře výjezd v seznamu i v detailu.
- Během relace se hra zpomalí nejvýš na 5×. V nastavení: rádio Odpovídám sám / Automaticky, hlas Zapnutý / Vypnutý (jen tóny), tlačítko Vyzkoušet. Hlas se jednorázově stáhne (~80 MB).

---

## v0.18.0 – 2026-11-14

- Doplňková naléhavost: pacient nabraný jako bezvědomí / nedýchá se cestou může probrat (N1 → N2). Když posádka u N3 hlásí zhoršení a žádá lékaře, případ přejde automaticky na doplňkovou N2 a přibude příznak typický pro indikaci.
- Datové zprávy od HZS (KOPIS), PČR (OS KŘP) a eCall: nehody, otevírání bytů, požáry, psychiatrie, napadení, oběšení, tonutí, záchrana v terénu, intoxikace na veřejnosti. Tisíce kombinací podle situace, ve směně se neopakují. Zdroj výzvy odpovídá složce (150, 158, eCall).
- Zrušen příznak „Transport pacienta“.
- Posádky na místě stojí na silnici vedle sebe u místa události, ne v symbolu události.
- Upřesnění místa bez místností (žádná kuchyně, obývák), stačí RD, patro apod.
- Doba předání v nemocnici podle říjnových výjezdů (medián ~10 min, u N1 delší).
- Cílová pracoviště podle nemocnic: urgentní příjem, chirurgická ambulance, iktové centrum, ARO, dětské, gynekologicko-porodnické, ORL; v JH chirurgičtí pacienti přes urgentní příjem. ČB jako KCC (komplexní cerebrovaskulární centrum), iktová centra JH, Písek, Tábor.
- Nová cílová nemocnice Jihlava: kardio nestabilní pacienti z Dačicka a odkud je blíž než do ČB, část suicidálních pacientů z Jindřichohradecka.
- Vstřícná jízda se nabízí jen u dlouhých přejezdů po pomalejších silnicích (ne Veselí, Soběslav → Tábor po dálnici).
- Seznam případů je kompaktní a řazený podle naléhavosti, podrobnosti po rozkliknutí.

---

## v0.17.1 – 2026-11-14

- Rychlosti vozidel podle směrnice Primární zásah pozemních prostředků a nové úpravy pravidel jízdy s VRZ: režim N1 bez limitu, N2, N3 a jízda s pacientem nejvýše o 30 km/h nad limit, N4 a návrat RZP bez VRZ v běžných limitech.
- Router počítá po třídách silnic rychlostmi jízdy s VRZ (dálnice 150 km/h, mimo obec 120, na horších silnicích méně), režimy N1/N2/N3/N4, pacient a návrat jsou odvozené od nich. Doby jízdy k události kalibrované na říjnovém vzorku výjezdů (čas výjezd → příjezd, přes 3 900 výjezdů).

---

## v0.17.0 – 2026-11-14

- Adresy a místa: 175 tisíc adres a 23 tisíc reálných míst z OSM (nádraží, úřady, obchody, sportoviště, ubytování…). Případy se neopakují na stejném místě ani blízko po sobě.
- Popis místa: široká sada krátkých dispečerských zápisů, často prázdný; konec věčného „rodinný dům, přístup hlavním vchodem“.
- Hodinový profil výjezdů a délka nabírání výzvy podle říjnového vzorku (špička 7–11 h, nabírání N1 zhruba 70–150 s). Záložka „Nabrané“ je nově „Nabírá se“.
- Spojový řád: posádky se hlásí „ZCB101, zde ZCB…, příjem“, ZOS potvrzuje.
- Vstřícná jízda: posádka ohlásí pacienta schopného překladu, dispečer vyšle RZP z cílové oblasti, nebo odpoví „dojíždějte sami“. Pravidlo: jen při aspoň 2 volných RZP v oblasti, jinak ztráta bodů.
- KPR a exitus: jisté známky smrti (KPR se nezahajuje, RV lze odvolat), neúspěšná KPR, častější exitus u starších. Koroner jako dlaždice u případu; když není, RV zůstává na prohlídku zemřelého, je odvolatelný a musí se vrátit.
- RV doprovází pacienta do nemocnice podle závažnosti (po KPR vždy), nebo nechá RZP jet samotnou; odvolatelný doprovod lze vyslat jinam.
- RZP může po konzultaci s lékařem ponechat pacienta na místě.
- Nové hodnocení: místo absolutního času dojezdu se hodnotí volba posádky (s ohledem na pokrytí oblasti). Bonusy za předpoplach, RV vyslané jako první, LZS místo RV, LIBERO a správnou vstřícnou jízdu. Stránka „Pravidla a hodnocení“ a přehled bodů po směně.
- Panel posádek: symbol sanitky pro RZP a vozu lékaře pro RV, směr vozu podle jízdy, stejné symboly na mapě. Klik na dlaždici sleduje vůz na mapě.
- LZS: přesná poloha základny Kryštof 13 a nový žlutý symbol vrtulníku.

---

## v0.16.0 – 2026-11-13

- Nová úvodní obrazovka: Pokračovat ve směně, Nová směna, Nastavení, Co je nového, kontrola aktualizace.
- Nastavení i ve hře (tlačítko ⚙ v záhlaví; hra se při otevření pozastaví): světlý/tmavý/automatický vzhled včetně mapy, velikost písma, zvuk a hlasitost, výchozí rychlost, pauza při nové N1.
- Obtížnost: volitelné nápovědy (★ u doporučené posádky a rada v detailu případu).
- Smazání uložené směny a návrat k výchozímu nastavení.

---

## v0.15.0 – 2026-11-13

### Nové
- Nové číslování verzí (hlavní.menší.oprava) a testovací web …/zos-simulator/dev/ s vlastní uloženou směnou.
- **Volací čísla posádek podle dispečerského systému:** ČB 1xx, TA 2xx, JH 3xx, PT 4xx, ČK 5xx, ST 6xx, PI 7xx (např. JH RV 319, JH 1 RZP 313, Dačice RV 309). V panelu posádek jsou nahoře pod sebou ČB, JH a TA.
- **Číslo posádky u ikony na mapě** (při přiblížení i název, vozy na základně od bližšího přiblížení).
- **Nemocnice podle oblasti posádky:** RZP vyslaná mimo svůj okres veze pacienta do nemocnice své oblasti (pokud má potřebné pracoviště), aby se vracela domů.
- **LIBERO na 7 základnách** (ČB, JH, PT, Vimperk, ST, Písek, Tábor), jen přes den a ne každý den. **Nastavení LIBERA** na úvodní obrazovce: pravděpodobnost obsazení (výchozí 75 %) a u každého Náhodně / Vždy / Nikdy; volba se pamatuje. Během hry lze obsazení změnit v panelu posádky LIBERO.

### Opravy
- **Vstřícná jízda:** posádka vyslaná tlačítkem „Vyslat“ jela místo setkání na adresu události. Nově se obě posádky potkají na trase v místě, kam dorazí přibližně současně (časově na půli cesty), předání trvá 2–5 min a pak každá pokračuje.
- Vstřícnou jízdu hlásí jen periferní posádky (≥ 20 min od cílové nemocnice, např. Suchdol, Dačice, Týn). Posádky u okresní nebo krajské nemocnice (ČB, Tábor a okolí) ji neřeší; zmizelo hlášení „schopen překladu, ale není potřeba“.
- Rychlejší jízda k události s výstražnými zařízeními (≈ o 15 % kratší dojezdy; promítá se i do ETA a pokrytí).
- Klik na událost už mapu nepřibližuje tolik (přehled okolí ~15 km).
- Větší písmo názvů oblastí v přehledovém panelu posádek.
- Vyslání posádky z panelu případu nepřepíná seznam z „Čekající“ na „Právě řešené“; případ se jen přesune.

## v14 – 2026-11-13

### Nové
- **Hra na webu a instalace jako aplikace** (Mac, Windows, Android, iPhone): https://riff1991.github.io/zos-simulator/ – v Chrome/Edge ikonou instalace v adresním řádku (nebo tlačítkem „Nainstalovat jako aplikaci“ na úvodní obrazovce), v Safari na Macu Soubor → Přidat do Docku, na iPhonu Sdílet → Přidat na plochu.
- **Automatické aktualizace:** při spuštění aplikace si sama zkontroluje novou verzi a nainstaluje ji. Když vyjde nová verze během hry, objeví se lišta „Aktualizovat“ (směna se uloží a po aktualizaci ji obnovíš).
- **Offline provoz:** po prvním spuštění funguje bez internetu (mapa v místech, která už jsi viděl/a).
- Ikona aplikace.

### Opravy
- Mac (ZIP): spouštěč používal pokaždé jiný port, takže se mezi spuštěními ztrácela uložená směna. Nově pevný port 8765.

## v13 – 2026-11-13

### Nové
- **LIBERO** (ČB, Tábor, Vimperk): volný lékař na základně, jen přes den a ne každý den. Dispečer ho přidá do RZP téže základny (tlačítko „+ LIBERO“ v návrhu posádek nebo v panelu posádky). Posádka je pak dočasně RLP a počítá se jako lékař u výzvy. Po návratu na základnu lékař vystoupí.
- **Předání na FNKV (Praha):** LZS přistane na heliportu FNKV, pacienta převezme posádka ZZS HMP. Posádka LZS ho doprovází na popáleninové centrum (vyložení, ~2 min jízda, předání, návrat na heliport, příprava k letu; celkem asi 20–30 min) a pak letí zpět. Převozní RZP z kraje se už neposílá.
- **Upozornění nahoře** (hlášení 112, žádost o lékaře): zmizí samo nejpozději po 40 s, nebo je lze zavřít křížkem ✕ bez otevírání případu. Zpráva zůstává v rádiovém logu.
- **Generátor osob:** jména se správným rodem (Novák/Nováková, Černý/Černá, Sedláček/Sedláčková), ~100 příjmení podle četnosti, křestní jména podle ročníku. Oznamovatel má vztah k pacientovi („volá dcera“, „volá ošetřovatelka domova“, „volá kolemjdoucí“, PČR, HZS, 112).
- **Reálná místa z OpenStreetMap:** domovy pro seniory, školy, ordinace a provozovny mají skutečnou adresu a název.
- **Místo podle věku a denní doby:** domov pro seniory jen u starších, škola u dětí ve školní době, provozovna v pracovní době.
- **Katalog příznaků z reálných dat:** 42 383 výjezdů (leden–květen a říjen 2026), 537 příznaků, 7 444 skutečných kombinací. Jen standardizované kódy, žádná osobní data.
- **Reálné názvy posádek a číslování oblastí** podle dispečerského systému: RZP1, RV1, CB VLTAVA RZP, TA_RZP2, PISEK_RV, TREBON 2, CB_Z 1…; oblasti 1 ČB, 2 JH, 3 PI, 4 PT, 5 ST, 6 TA, 7 ČK.
- Věk v tisku výzvy většinou jako ročník; telefon ve formátu systému (fiktivní rozsah 0999…).
- Číslo verze v hlavičce hry.

### Opravy
- Kliknutí na výzvu nepřesunulo mapu a hlášení 112 nešlo odkliknout: chybějící funkce `syncSelectionToMain` shodila obsluhu kliknutí.
- Na mobilu měla mapa nulovou výšku.
- Ikony základen a vrtulníku se nenačítaly (nekompatibilní API MapLibre 4).
- „zbývá 704 h“ v hlavičce místo zbývajícího času směny.
- RZP na místě vezla pacienta po zemi, i když ho současně převzala LZS (pacient převážen dvakrát).
- Případ, kde místo RV letěla LZS, se nikdy neuzavřel.
- „DYNAMICKÁ INDIKACE“ zůstávala u výzvy i po eskalaci na N1.
- Ohledání zemřelého („koroner nedostupný, TANR nelze“) se už nepřepisuje na N1.
- Instalátor pro Mac: při aktualizaci smaže starou verzi webu a nevytváří duplicitní zástupce na ploše.

### Pro vývoj
- Nové kontroly: `npm run lint` (ESLint), `tests/content_audit.js` (obsah výzev), `tests/browser_smoke.py` (proklik v prohlížeči), GitHub Actions.

## v12 – 2026-11-13
- Kliknutí na výzvu má přesunout mapu na místo zásahu (pokus o opravu přes `jumpTo`; plně opraveno až ve v13).

## v9 – 2026-11-13
- Opravena chyba v rozložení více monitorů, která zastavila JavaScript před otevřením úvodní nabídky.

## v8 – 2026-11-13
- Mapování rádiových kódů LZS: Planá KR13, Jihlava KR12, Praha KR01, Plzeň KR07 (aktualizuje se i v uložených směnách).

## v7 – 2026-11-13
- Otevření mapy nebo rádia bokem je skryje na hlavní obrazovce; tlačítky lze panel znovu zobrazit.
- Zbývající panely se přeskupí, aby využily hlavní monitor; rozložení se pamatuje v prohlížeči.

## v6 – 2026-11-13
- Mapu a rádio lze otevřít v samostatných oknech na druhém monitoru; sdílí stav simulace.
- Mapa na celou obrazovku; upravené mobilní rozložení mapy.
- Jediná, čitelnější ikona vrtulníku LZS v dlaždicích.

## Starší
- Prototyp (12. 11. 2026): síť základen ZZS JčK, simulace směny, návrh posádek, rádio, tisk výzvy, mapa OpenStreetMap s trasami po silnicích, reálné adresy.
