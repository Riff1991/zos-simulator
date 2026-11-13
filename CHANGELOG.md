# Changelog – ZOS simulátor

Hra/simulátor práce primárního dispečera ZOS ZZS Jihočeského kraje. Nejde o nástroj pro ostrý provoz. Osoby, kontakty a události jsou generované.

Formát: nejnovější verze nahoře. Každá verze má balíček pro Mac v sekci **Releases** na GitHubu (`zos-simulator-mac-vX.Y.Z.zip`).

Číslování od v0.15.0: `hlavní.menší.oprava` (0.15.1 = drobná oprava, 1.0.0 = oficiální vydání). Testovací verze z větve `dev` (…`-dev`) běží na https://riff1991.github.io/zos-simulator/dev/.

---

## v0.15.0 – rozpracováno (testovací verze)

### Nové
- Nové číslování verzí (hlavní.menší.oprava) a testovací web …/zos-simulator/dev/ s vlastní uloženou směnou.
- **Volací čísla posádek podle dispečerského systému:** ČB 1xx, TA 2xx, JH 3xx, PT 4xx, ČK 5xx, ST 6xx, PI 7xx (např. JH RV 319, JH 1 RZP 313, Dačice RV 309). Oblasti v panelu posádek seřazené jako na ZOS.
- **Číslo posádky u ikony na mapě** (při přiblížení i název, vozy na základně od bližšího přiblížení).
- **Nemocnice podle oblasti posádky:** RZP vyslaná mimo svůj okres veze pacienta do nemocnice své oblasti (pokud má potřebné pracoviště), aby se vracela domů.
- **LIBERO na 7 základnách** (ČB, JH, PT, Vimperk, ST, Písek, Tábor), jen přes den a ne každý den. **Nastavení LIBERA** na úvodní obrazovce: pravděpodobnost obsazení (výchozí 75 %) a u každého Náhodně / Vždy / Nikdy; volba se pamatuje. Během hry lze obsazení změnit v panelu posádky LIBERO.

### Opravy
- **Vstřícná jízda:** posádka vyslaná tlačítkem „Vyslat“ jela místo setkání na adresu události. Nově se obě posádky potkají na trase v místě, kam dorazí přibližně současně (časově na půli cesty), předání trvá 2–5 min a pak každá pokračuje.
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
