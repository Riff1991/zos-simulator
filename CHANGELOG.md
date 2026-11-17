# Changelog – ZOS simulátor

Hra/simulátor práce primárního dispečera ZOS ZZS Jihočeského kraje. Nejde o nástroj pro ostrý provoz. Osoby, kontakty a události jsou generované.

Formát: nejnovější verze nahoře. Každá verze má balíček pro Mac v sekci **Releases** na GitHubu (`zos-simulator-mac-vX.Y.Z.zip`).

Číslování od v0.15.0: `hlavní.menší.oprava` (0.15.1 = drobná oprava, 1.0.0 = oficiální vydání). Testovací verze z větve `dev` (…`-dev`) běží na https://riff1991.github.io/zos-simulator/dev/.

---

## v0.31.0 – 2026-11-16

> Rychlost posádek podle reálných výjezdů: od výzvy po „Na místě“.

### Nové
- **Prodleva výjezdu a jízda k případu jsou přestavěné podle dat** (leden a červenec 2026, ~12 800 výjezdů): zvlášť posádka na základně a v autě, RZP a RV, N1–N3, v noci pomaleji, vzdálenost podle trasy, rozdíly mezi základnami. Celý čas od vyslání po „Na místě“ sedí na realitu v mediánu na pár sekund (dřív byla hra u N3 rychlejší o skoro 2 minuty).
- **Posádka po příjezdu nečeká.** Pevná část jízdy (hledání adresy, rozjezd) se rozloží po trase, vozidlo jede až do okamžiku „Na místě“.
- **Odstraněno upozornění na pozdní výjezd u N2 a N3.** U N1 zůstává alarm po 2 minutách.

### Interní
- `ZOS_DATA.driveCal`, `ZOS_DATA.turnCal`, skripty v `tools/kalibrace/rychlost/`.

## v0.30.4 – 2026-11-16

> Stav posádky na místě.

### Opravy
- **Po dojezdu zůstává posádce stav „Na místě“**, pak „Transport“. „Zahájení ošetření“ se nehlásí, stejně jako ve skutečnosti.

## v0.30.3 – 2026-11-16

> Popis místa sedí na adresu.

### Opravy
- **Popis místa už neodporuje adrese.** Zařízení (zimní stadion, hospoda, vrátnice, stanice HS, DPS…) se u obyčejné adresy nepoužijí; u reálných míst z OSM jen když sedí jméno nebo druh místa.
- **Dům a bytový dům podle skutečné budovy z OSM.** „RD“ se objeví jen u domu, „byt“ jen u bytového domu a patro nepřesáhne počet podlaží budovy.
- `addr.json` má navíc typ budovy a počet podlaží (9,2 MB).

## v0.30.2 – 2026-11-16

> Vstřícná jízda se nabízí častěji a o překladu rozhoduje typ pacienta.

### Opravy
- **Vstřícná jízda se nenabízí jen tehdy, když je jízda do nemocnice z místa zásahu pod 15 min.** Dřív ji hra potlačovala i podle základny posádky a podle náhodného „krátká trasa“ (např. Suchdol).
- **Posádka „dojede sama“ jen u pacientů, které nejde překládat:** N1, nosítka, imobilní a nechodící, zlomeniny DKK, CMP, porucha vědomí, děti v N1–N2, hrudník a arytmie v N2 a další. Trauma HKK vzácně ano, chodící N3 ano.

## v0.30.1 – 2026-11-16

> Opravy převozu.

### Opravy
- **Žijící pacient s N1 se vždy převáží.** Posádka ho už nenechá na místě, ani když se probudí po oběšení nebo TANR. Totéž platí pro dítě v N1–N2.

## v0.30.0 – 2026-11-16

> Výzvy podle reálných dat (leden a červenec 2026) a mnohem úplnější databáze adres.

### Nové
- **Realističtější výzvy:** objem událostí podle hodiny, ročního období a typu dne (pracovní den / víkend); indikace, naléhavost, věk, pohlaví, lékař, čas na místě a převoz podle skutečných poměrů. Dynamická indikace jen u N2, u CMP ne. Popis místa a poznámka ZOS ve stylu skutečných zápisů.
- **Adresy:** 227 081 adres v 636 obcích (dřív 174 935 v 615). Obce bez značky `addr:city` se doplňují z hranic obcí, např. Milevsko 25 → 1 913 adres. `addr.json` má 8,3 MB.
- **Hustota výzev podle obcí** přepočítána z reálných výjezdů (ČB ×2,9, Písek ×2,2, Milevsko ×1,6).

### Interní
- `pipeline/addr_full.py` (adresy přímo z pbf), `tools/kalibrace/` (analytické skripty bez dat).

## v0.29.2 – 2026-11-16

> Týdenní plán směn (RV Dačice nejezdí v pondělí a úterý) a vnitřní úklid kódu bez změny chování hry.

### Nové
- **RV Dačice není v provozu v pondělí a v úterý**, ve dne ani v noci. Směnový den se počítá od 7:00 (pondělní směna trvá do úterý 7:00). Další pravidla podle dne v týdnu půjdou doplnit v `ZOS_DATA.weeklyOff`.

### Interní
- Zdrojový kód rozdělen na menší soubory (`sim-*.js`, `ui-*.js`), funkce hry se nemění.

## v0.29.1 – 2026-11-16

- Mezikrajská LZS: když vlastní LZS stojí kvůli neletovému počasí, jde požádat o LZS z jiného kraje (dřív hra psala „Vlastní LZS je dostupná“). Cizí LZS se neřídí naším počasím, ale v horším počasí je šance na souhlas nižší.
- Nové tlačítko ⟳ v horní liště: ruční kontrola a stažení nové verze.

## v0.29.0 – 2026-11-16

> MU po zkušební hře: tichý kolega, rychlá první vlna, skutečné posádky sousedních krajů a vlastní layout pro dispečera MU.

### Nové
- **Vlastní rozložení panelů (stolní zobrazení):** velikost panelů měníš tažením lišt mezi nimi (sloupce i řádky). Tlačítko ⧉ v záhlaví panelu ho odepne do plovoucího okna (táhneš za záhlaví, velikost za pravý dolní roh), ⤓ ho připne zpět. Menu **⊞ Rozložení** v hlavičce nabízí předvolby Výchozí, Široká mapa a Velký seznam a detail a připnutí všech oken zpět. Rozložení se pamatuje zvlášť pro běžný provoz a pro režim MU.
- **Layout dispečera MU:** po přepnutí na „Řešit MU (401)“ se obrazovka přeskládá (panel MU vlevo na celou výšku, mapa, rádio s odsunem, posádky; seznam případů a protokol menší). Po ukončení MU nebo přepnutí na běžný provoz se vrátí původní rozložení. Hlášení z MU už nezabírají červené lišty nahoře, jsou v panelu.
- **Pomoc jiných krajů jsou skutečné posádky:** Vysočina (5), Plzeň (3), Střední Čechy (4) a 6 LZS (Jihlava, Praha, Plzeň, Linz, Krems, Straubing) z jejich základen. Mají dlaždici i polohu na mapě, dojezd po silnicích a přicházejí vždy, když o ně požádáš. Vypuštěno: Jihomoravský kraj, pozemní Rakousko a Bavorsko, DRNR (nemají ve hře základny).
- **Režim Jen MU:** roli (MU, nebo běžný provoz) si zvolíš před startem.
- **Doporučená nemocnice** u relace odsunu je první tlačítko (★).
- **Hodnocení MU** zahrnuje rychlost odpovědi na relace odsunu a reakci na žádost o SPIS a koronera (jen to, co dispečer ovlivní).

### Opravy
- **Hráč běžného provozu už neslyší MU:** vedoucí odsunu nevolá v rádiu a hlášení z MU nepípají. Hlasitě zůstává jen vyhlášení a ukončení MU, zbytek jde do logu.
- **Kolega posílá první vlnu najednou** (RZP, 2× RV, LZS i modul MU hned po avízu), dřív po jedné s prodlevou a modul až ve 20. minutě.
- **Zóna** (útok, chemie, požár, výbuch, vlak, letadlo) zdržuje třídění jen 8–15 min místo 10–25.

## v0.28.1 – 2026-11-16

> Soulad místa a příznaků u MU a u dopravních nehod.

### Opravy
- **MU na železnici** se děje na skutečné trati, přejezd na skutečném přejezdu (tratě z mapových dat, nový soubor `rail.json`). Dřív šlo o náhodný bod u města.
- **Příznaky u MU odpovídají typu:** vlak = Nehoda vlaku, Vlak, HZS a PČR; požár = Požár, HZS; chemie = Únik nebezpečných látek; střelba jen u útoku; výbuch jen u výbuchů a bomby a tak dále. Dřív se k MU přimíchávalo „střelné poranění“ i u vlaku.
- **Havárie letadla** u dráhy letiště České Budějovice (podél její osy), ne na libovolném místě v okolí.
- **Popis místa u silnic a tratí** uvádí nejbližší skutečnou obec z adres (dřív se u vzdálených míst psalo České Budějovice).
- **Dopravní nehody a cyklisté** už nevznikají u zámku, v restauraci, v bytě ani v domově seniorů, jen na silnici nebo na ulici.
- **Čas letu LZS** do popáleninového centra se počítá vzdušnou čarou.

## v0.28.0 – 2026-11-16

> Režim „Jen MU“ s rozjetým krajem a kompaktní panel případu.

### Nové
- **Jen MU (cvičení):** v nové směně zvol režim „Jen MU“. Kraj je při startu rozjetý podle zvolené hodiny (posádky na výjezdech, v transportu, při předání i na návratu, odpovídající počet rozpracovaných událostí). MU začne za 4–8 min, typ je náhodný podle času a počasí, nebo ho vybereš. Obyčejný provoz běží dál. Cvičení končí ukončením MU a vyhodnocením (hodnocení MU, časy, METHANE, odsun, chyby).
- **Kompaktní panel případu:** u N2 a N3 jsou First respondeři a „LZS podle kalkulátoru“ sbalené do dvou řádkových tlačítek. LZS ukazuje nejlepší nemocnici a „Ano / Možná“. Rozbalíš je kliknutím, nebo kliknutím na dlaždici LZS. U N1 zůstává vše rozbalené. Detaily výjezdu už nesjíždějí dolů.

### Opravy
- **Rádio na mobilu překrývalo seznam případů** (chyba z 0.25.2, kvůli ní se nenasadily verze 0.25.2 a 0.27.0). Panel Rádio je na mobilu viditelný jen při živém hovoru a má výšku podle obsahu.

## v0.27.0 – 2026-11-16

> Katalog 36 typů MU na reálných místech: doprava, požáry, hromadné akce (blesk, tábor), nebezpečné látky, útok a letecká nehoda.

### Nové
- **36 typů MU místo dvou.** Doprava (D3 v mlze, kamion do kolony, zájezdový a školní autobus, vlak na přejezdu, nehoda vlaků), budovy (požár hotelu, domova seniorů, školy, výbuch plynu, výbuch v závodě, zřícení střechy při sněhu), hromadné akce (blesk na dětském táboře či akci při bouřce, zřícení stanu, dětský tábor se zvracením a průjmem, tlačenice, kolaps při vedru, otrava jídlem), nebezpečné látky (chlor v bazénu, cisterna, čpavek, plyn ve škole, CO v ubytování), útok (střelba ve škole, obchodě, na akci, bomba) a letecká nehoda u letiště ČB (malé i dopravní letadlo, 4–60 osob).
- **Reálná místa:** hotel, penzion, kemp nebo tábor, škola, kino a kulturní dům, supermarket, pivovar, bazén, stadion a domov seniorů z OSM, bod na dálnici D3 nebo silnici podle třídy, železniční trať a přejezd, letiště České Budějovice.
- **Počasí a sezóna:** blesk jen při bouřce, tábory v létě, školní autobus a škola ve školním roce, mlha a náledí na D3, zřícení střechy při sněhu, kolaps davu při vedru.
- **Skladba zraněných podle typu:** děti (tábor, škola), inhalace při požáru, popáleniny, neúrazová onemocnění. Typ poranění podle formuláře: P popálenina, T trauma, P+T, I inhalační trauma, N neúrazové. Polytrauma je diagnóza pro traumacentrum.
- **Popáleninová centra FNKV Praha, FN Brno a FN Ostrava** v nabídce odsunu jen pro LZS a jen u rozsáhlých popálenin; kapacity se zjišťují s ostatními kontaktními místy.
- **Nebezpečná zóna:** u útoku, výbuchu, chemie a požáru se do vyhlášení bezpečné zóny (10–25 min po příjezdu první posádky) netřídí ani neodsouvá.

### Opravy
- Nevyhlášená MU se přepisovala vždy na „Dopravní nehoda“; nově podle typu (intoxikace, popáleniny, trauma).
- Hledání bodu na dálnici a jiných řídkých třídách silnic občas selhalo.

## v0.26.0 – 2026-11-16

> MU podle nové směrnice SM01.06 (rev. 8): jednotliví pacienti, check-list 401, odsun rádiem a kolega, který MU opravdu řídí.

### Nové
- **MU podle SM01.06 rev. 8 (8. 1. 2026).** Vyhlásí ji calltaker při hovoru, nebo (SUSP MU) vedoucí první posádky na místě. Počet skupin se odvozuje z počtu zraněných, ne náhodně.
- **Panel MU v detailu případu** s klíčovými kroky check-listu 401: avízo MU, síly (vůz MU, zálohy), METHANE a aktualizace po ~30 min, kontaktní místa nemocnic (volné lůžka UPV / JIP / standard), sousední ZZS a LZS, SPIS na žádost vedoucího zdravotnické složky, koroner, potvrzení ukončení.
- **Jednotliví pacienti s TIK:** priorita I–IV, typ P/P+T/T, děti, UPV a pracovní diagnóza. Skutečný stav je skrytý, ZOS zná METHANE a ohlášené odsuny.
- **Odsun rádiem:** vedoucí odsunu volá (TIK, priorita, UPV, dospělý/dítě, vůz), ty vybíráš nemocnici podle kapacit. Penalizace za plnou nemocnici, polytrauma mimo traumacentrum a dlouhé čekání I. priority. RZP veze 1 pacienta (III. priorita 2), vůz MU až 4, LZS 1. Po předání se posádka vrací na místo, dokud tam jsou pacienti.
- **Sousední ZZS a LZS** přijíždějí na žádost (Vysočina, Plzeň, Střední Čechy, Jihomoravský, Notruf NÖ, Passau, LZS okolních ZZS, DRNR). Když nežádáš, nabídnou se po 30 min Vysočina a Plzeň.
- **Ponechání sil pro běžný provoz:** na základně s více RZP zůstává jedna, v ČB dvě. Během MU se N2 vysílá jen s RZP (lékař na vyžádání), N3 a sekundární převozy se odkládají.
- **Konec MU** určuje hlášení vedoucího zdravotnické složky a tvoje potvrzení (ne čas). Hodnocení MU: avízo, příjezd první posádky, METHANE a aktualizace, kvalita odsunu.
- Výcvik, lekce 9 (MU), je přepsaná podle nového postupu.

### Opravy
- **Kolega u MU přestal jednat po prvním kroku** (a vůbec, dokud sis nezvolil roli). Nově řídí MU průběžně s lidskou prodlevou (avízo, vyslání, METHANE, KM, sousedé, odsun, ukončení).
- Texty o rolích v MU byly opačné než skutečné chování.

## v0.25.2 – 2026-11-16

> Rádio s pevnou výškou a oprava otravy CO.

- Panel Rádio má pevnou výšku: při hovoru se už nemění velikost mapy ani ostatních oken. Zprávy jsou kompaktnější (jen poslední řádky, popisek mluvčího v řádku s textem, menší tlačítka odpovědí).
- Otrava CO vzniká jen u indikace Intoxikace (příznak Oxid uhelnatý místo jiné noxy), vždy v bytě nebo v domě. Nemíchá se s Horečkou ani jinými indikacemi. Dítě s CO je vždy N2 bez dynamiky, nikdy N3.
- Hlášení posádky o více postižených u CO už není „dopravní nehoda“ (CO: počet osob, objekt, HZS, další RZP a lékař); panel případu říká „osoby“ a „postižených“ místo „zranění“.
- METHANE se používá jen u potvrzené MU; hlas to čte „metan“. U běžných hromadných nehod hlášení bez METHANE.

---

## v0.25.1 – 2026-11-16

> Přehlednější panel posádek a nový vrtulník.

- Sekce v panelu posádek se jmenují „LZS a součinnost“, „Moduly MU“ a „Mezikrajská spolupráce“.
- Dlaždice mezikrajské spolupráce mají jemné odstíny podle kraje (Vysočina, Plzeňský, Středočeský, Bavorsko, Horní a Dolní Rakousko) a u LZS malý vrtulník vpravo; stavy (čeká, souhlasí, pomáhá, odmítla) zůstávají barevné.
- Nová žlutá obrysová ikona vrtulníku (rotor, ocasní vrtule, okno, kříž, ližiny) u LZS Planá, v mezikrajské spolupráci i na mapě; na mapě je větší a při letu doleva zrcadlená.
- Text v tutoriálu odpovídá novému názvu sekce.

---

## v0.25.0 – 2026-11-16

> Kalibrace rychlosti jízdy podle reálných výjezdů, Rádio synchronizované s hlasem a přehlednější dlaždice.

**Jízda a dojezdy**
- Pevná část doby jízdy (hledání adresy, průjezd obcí) se už nepřičítá k jízdě: vozidlo jede po trase plnou rychlostí a pevnou část „stojí“ u cíle. Rychlosti jsou realističtější a pořadí režimů sedí (N1 rychlejší než N2 a N3). Celkové dojezdy N1 a N2 zůstávají.
- N3: pevná část zkrácena ze 175 na 60 s (reálné N3 krátké trasy byly dřív o 3–4 min pomalejší).
- Náhodný rozptyl rychlosti zúžen z ±10 % na ±4 % a jen na jízdní část.
- Zpoždění výjezdu podle reálných dat: RZP 1–2 min (N1), 1–3 min (N2, N3), lékař (RV) 1–5 min; upozornění „nevyjela do 2 minut“ platí pro RV až od 5 minut.

**Rádio**
- Přepis hovoru se ukazuje ve chvíli, kdy ho hlas začne říkat (dřív se objevil s prodlevou nebo předčasně). Bez hlasu se řádky ukazují postupně hned po vzniku. Provozní zprávy se řídí stejně.

**Dlaždice**
- Dlaždice sousedních krajů jsou kompaktní a čitelné (plný název, stav na druhém řádku).
- Sekce Speciální: LZS Planá, HZS, PČR, koroner, FR. Nová sekce Mimořádná událost s moduly MU.

---

## v0.24.1 – 2026-11-16

> Základny sousedních krajů podle veřejné mapy a upřesněný rozsah zahraničí.

- Pozemní základny sousedů jsou jen skutečné obce u hranice (souřadnice a názvy podle veřejné mapy obcí se základnou ZZS): Vysočina Telč, Jemnice, Počátky, Pacov, Kamenice nad Lipou; Plzeňský kraj Sušice, Horažďovice, Nepomuk; Středočeský kraj Březnice, Votice, Krásná Hora nad Vltavou, Sedlčany.
- Bavorsko i Rakousko jen LZS; pozemní posádky ze zahraničí ve hře nejsou.
- Cizí pozemní posádku lze požádat do 50 km od její základny (dřív 70 km).

---

## v0.24.0 – 2026-11-16

> Mezikrajská a přeshraniční spolupráce, předělaný panel Rádio a řada oprav z minulých verzí (včetně opravy výslovnosti, která v 0.23.x nefungovala).

**Mezikrajská a přeshraniční spolupráce**
- Nová skupina dlaždic „Sousední kraje“: pozemní posádky z Vysočiny, Plzeňského a Středočeského kraje a z Bavorska u hranice (základny a volací znaky jsou orientační a fiktivní) a LZS z Jihlavy, Prahy, Plzně, Lince, Kremsu a Straubingu. Rakousko jen LZS. Základny sousedů jsou i na mapě.
- Naše žádost o pozemní posádku: přetažením dlaždice na případ. Jde jen když vlastní volná RZP není do 20 minut (nebo žádná volná); cizí posádky jen do 70 km, zahraniční v pásu do 30 km od základny. Operační středisko odpoví za 60–180 s (souhlas přibližně 70 %, jinak odmítnutí s důvodem a pauza u té základny). Po souhlasu se posádka vyšle z nabídky nebo opětovným přetažením, veze pacienta do naší nemocnice a vrací se domů.
- Naše žádost o LZS z jiného kraje: „Požádat a vyslat“ je jeden krok s odpovědí střediska; v nabídce je ETA a odhad délky nasazení. Dřív byly všechny externí LZS fialové a nefunkční.
- Žádosti sousedů o nás: 1–3× za směnu o RZP nebo RV a 0–2× o LZS Planá. Ozvou se jako relace v rádiu s volbami Vyslat (nabídka tří posádek s ETA), Odmítnout, Zjistím a ozvu se. Vyhovění se hodnotí podle zbylého pokrytí v oblasti, odmítnutí tam, kde šlo pomoci, a žádost bez odpovědi do 3–5 minut se ruší s −1 b. Planá po souhlasu odletí asi na hodinu a nelze ji odvolat.

**Rádio**
- Panel Rádio je živý chat se dvěma stranami (ZOS vlevo, posádka vpravo, čitelný text); řádky se ukazují přesně, když je hlas řekne, a po konci zůstanou 6 s.
- Všechny relace ZOS mají tvar „zde ZCB101, příjem“ → na příjmu → zpráva → potvrzení → díky, konec; opraven chybějící první řádek.
- „Je schopen překladu“ se v automatickém režimu nezodpovídá a po vypršení nic netrestá.

**Případy a datovky**
- Datovka podle příznaků: dopravní nehoda (chodec, motocyklista, cyklista, nákladní auto…) a odesílatel podle „+ HZS“ a „+ PČR“.
- Otrava CO přidá příznak Oxid uhelnatý a 2–4 osoby. Upřesnění „amputace prstů“ u N3 změní naléhavost na N2, doplní RV a oznámí to posádkám.

**Opravy**
- Slovník výslovnosti (urgentní, Prachatice, ARO) v 0.23.x nefungoval kvůli chybným regulárním výrazům; opraveno a hlídá to test.
- Karta ve „Nabírá se“ se plní postupně (v0.23.1) a zůstává ve verzi.

---

## v0.23.1 – 2026-11-15

> Oprava: karta ve „Nabírá se“ se plní postupně, ne prázdná.

- Běžná výzva na lince 155: ve „Nabírá se“ se postupně objeví adresa, indikace, příznaky po jednom a nakonec naléhavost, pacient a poznámka; poté případ spadne do Čekajících. Číslo události se ukáže až v Čekajících.
- N1 se pozná hned, jakmile je vidět adresa: záložka začne blikat („Nabírá se N1“) a dispečer může dát předpoplach vybrané posádce.
- Případ z 112, 150 nebo 158: nejdřív datové zprávy, potom stejné postupné plnění se štítkem „nabráno z: …“.

---

## v0.23.0 – 2026-11-15

> Počasí z historických dat, nové záložky Datové zprávy a Nabírá se, relace při vyslání vracející se posádky, rychlost vozidel a řada oprav.

**Nové**
- Počasí: skutečná historická data podle zvoleného data hry (jeden bod pro kraj, stažení při startu, uloženo do cache); bez sítě nebo u dnešního data se počasí simuluje. V nové směně lze zvolit datum a hodinu začátku. Horní lišta ukazuje datum a den v týdnu, teplotu a oblohu, vítr (km/h, uzly, směr) a stav LZS.
- LZS podle minim HEMS: den dohlednost 1 500 m a základna 300 ft, noc s NVIS 3 000 m a 1 200 ft; vítr 25–35 kt konzultace, nad 35 kt neletovo (simulované omezení); námraza a bouřka neletovo. Rychlost vrtulníku vůči zemi zohledňuje vítr.
- Počasí zpomaluje jízdu (déšť −8 %, sníh −15 %, náledí −25 %, mlha −5 %; N1 méně, N4 a návrat více) a mění váhy případů (náledí a bouřky víc nehod a pádů, horko víc kolapsů a tonutí, mráz víc podchlazení, požárů a otrav CO).
- Záložka „Datové zprávy“: první zpráva z 112, 150 nebo 158 („nabírá se: …“) bez naléhavosti, klasifikace, upřesnění a čísla události. Potom „Nabírá se“ (naše linka), pak Čekající. Datovka trvá 180–300 s, nabírání dalších 70–150 s.
- Nabírá se: karta ukazuje jen operátora a linku; při N1 záložka bliká a jmenuje se „Nabírá se N1“, v detailu je jen předpoplach.
- Rychlost posádky (po 5 s herního času) v panelu posádky a štítkem u vozu na mapě; LZS v km/h i uzlech.
- Relace při vyslání posádky, která se vrací na základnu: tlačítko „Volat posádku“, 5řádková relace a výjezd až po ní. V automatickém režimu se přepis ukáže v panelu Rádio a zmizí.
- Štítek First respondera (název jednotky) v seznamu výjezdů, v panelu případu i v uzavřených.

**Změny a opravy**
- Volající „pacient sám“ jen při AVPU-A; při AVPU-U/P/V a u křečí nevolá.
- Datovka odpovídá případu: cyklista jen s cyklistou venku, napadení jen s napadením, pokousání jen s pokousáním; text zpráv vychází ze symptomů. Otevření bytu jen u bytů a domů.
- PČR/HZS z výzvy: bez červené lišty a bez blikání, ve stavu „Doplnit: PČR“; vysílá se přetažením dlaždice. Požadavky od posádky z terénu zůstávají červené.
- Barvy posádek: červená v akci, zelená volná, šedá na základně; cíl je oranžový štítek.
- Hláška „je schopen překladu“ se v automatickém režimu sama nezodpovídá; po vypršení posádka dojede sama bez trestu.
- Výslovnost: slovník (urgentní, Prachatice → Prachaťice, ARO → ááro).

---

## v0.22.0 – 2026-11-15

> LZS se řídí podle kalkulátoru časové úspory: doporučení v detailu výjezdu a hodnocení rozhodnutí o LZS po směně.

- Detail výjezdu: blok „LZS podle kalkulátoru“ ukazuje pro NEM ČB, JH, Písek a Tábor čas pozemně, čas LZS se zpožděním nemocnice, úsporu a verdikt Ano (od 15 min) / Možná (od 10 min) / Ne. Před příjezdem posádky počítá H1/1, po příjezdu H1/2 se zbývajícím ošetřením.
- Konstanty z kalkulátoru platí i pro let ve hře: 215 km/h, vzlet 3 min ve dne a 10 min v noci, předání pacienta 10 min a zpoždění nemocnic (ČB 8, JH 3, Písek 6, Tábor 6 min).
- Den a noc pro LZS podle občanského úsvitu a soumraku u základny (v prohlížeči podle skutečného data), ne pevně 7 až 19 h.
- Souhrn po směně: LZS správně vyslaná, hraniční, zbytečná a zapomenutá (zapomenutá jen u N1 při letovém počasí a úspoře od 15 min).

---

## v0.21.6 – 2026-11-15

> Opravená poloha výjezdové základny Jindřichův Hradec.

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
