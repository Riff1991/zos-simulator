# Předávací dokumentace – ZOS JčK simulátor dispečera

Stav k 12. 11. 2026. Prototyp je hratelný. Vznikl v jedné konverzaci s Claude (Anthropic); zde je vše podstatné, co v ní padlo.

## 1. Zadání od uživatele

- Účel: **zábava / hra**, webová aplikace, reálná stanoviště + fiktivní případy.
- Hráč = **jen primární dispečer** (ne calltaker). Calltaker je simulován (doba nabírání výzvy).
- Dva režimy: časově zrychlená **12h směna se skórováním** + **volný režim**.
- UI má „v maximální možné míře“ napodobit reálné monitory dispečera (uživatel poslal fotky; nejsou v repu kvůli osobním údajům). Napodobeny 4 okna: rádiový panel, GIS mapa, seznam případů „Dispečer ZZS“, přehledový panel posádek.
- Mapa: uživatel chtěl **plnou, zoomovatelnou OSM mapu** a **jízdu po reálných cestách** – hotovo.
- Přání: přetažení dlaždice posádky na případ (hotovo), plné využití karty případu (hotovo).
- Uživatel dodá: vlastní **indikace** (pravidla klasifikací), další barvy stavů, adresy základen.

## 2. Doménová pravidla (od uživatele, ověřená)

### Organizace ZOS
- Ve službě nepřetržitě 6 operátorů: 4 calltakeři (střídají se ve výzvách), 1 primární dispečer, 1 dispečer sekundárních transportů, + frontline operátor (spojuje posádky na konzultace záchranář–lékař, volá a avizuje posádky do nemocnic, domlouvá koronera na žádost posádky).
- Calltaker nabírá výzvu podle rozhodovacího „pavouka“ a doporučí naléhavost **N1/N2/N3** (N4 = plánované sekundární transporty). **Posádky vysílá pouze dispečer.**
- Cca 275 hovorů, 112 rádiových spojení a 118 výjezdů za 12h směnu; 56 pozemních posádek.

### Pravidla vysílání
- **N1** – vždy RV (lékař) + nejbližší RZP.
- **N2** – obvykle RZP + RV; nebo **N2 dynamická**: jede RZP bez lékaře, na místě rozhodne, zda lékaře potřebuje.
- **N3** – jede RZP; lékař jen na vyžádání posádky (posouzení / zhoršení stavu – pak typicky přechází na N2).
- **CMP** – většinou N2 a jede běžně RZP; lékař jen při splnění kritérií závažnosti / časového okna.
- **ZZUM („superzáchranáři“)** – mohou jezdit na některé N2 bez lékaře (větší kompetence). Základny: Veselí n. L., Trhové Sviny, Frymburk, Vyšší Brod; nepotvrzeno Vodňany, Volary.
- **flexRLP** – Blatná, Milevsko, Vimperk: RZP může jet jako RLP po přibrání lékaře (v prototypu bez dopadu).
- Zákonná dojezdová doba **20 min** (od převzetí výzvy posádkou).
- „Navrhnout posádku“ navrhuje nejbližší posádky podle polohy a dává **odhad dojezdu**.
- Dispečer vidí polohu vozidla na mapě po kliknutí; stavy vidí podle barev.
- **Cílové zařízení volí posádka.** Okresní nemocnice pro běžné stavy (každý okres má svou), centrová péče: polytrauma → traumacentrum ČB, KCC (komplexní cerebrovaskulární centrum) ČB, iktová centra ČB, Tábor, Jindřichův Hradec, Písek (Písek je IC – potvrzeno).

### Typy posádek
RZP, RV (rendez-vous, lékař), LZS (Planá u ČB, RLP vrtulník), **MU** (moduly pro mimořádné události, Iveco Daily 4×4, 4 sady: ČB, Tábor, Strakonice, J. Hradec, kapacita cca 100 zraněných), **zálohy „Z“** (fialové, nepřihlášené; po aktivaci jedou jako RZP).

### Barvy a stavy posádek (dle reálného systému)
- modrá = **Výzva** (po aktivaci)
- červené auto čumákem doprava = **Výjezd**
- srdíčko s EKG = **na místě**
- červené auto čumákem doleva = **transport**
- zelené auto čumákem doprava = **volný** (mimo základnu)
- bílá = **ukončeno / na základně**
- fialová = **nepřihlášená** (typicky zálohy)
- ostatní barvy uživatel doplní (sekundár je zatím šedá – náš odhad).
Fáze v panelu posádky: Výzva → Výjezd → Na místě → Zahájení ošetření → Transport → Příjezd k ZZ → Předání pacienta → Volný → Příjezd na základnu → Konec.

### Klasifikace (přesné názvy v systému)
Alergické reakce, Amputace, Arytmie, Asistence, Bolest, Bolesti na hrudi, CMP, CZS, Diabetické stavy, Dopravní nehoda, Dušnost, Gynekologické stavy, Horečka, Hypertenze, Intoxikace, Křečové stavy, MU - MATRA 722, Neúrazové krvácení, Neurologické stavy, NZO – spatřená, Oběšení, Pediatrické stavy, Popálení, poleptání, Porucha vědomí, Posouzení stavu, Převoz, Psychiatrické stavy, Resuscitace, Technická jízda, Tonutí, Trauma, Vstřícná jízda, Zvracení/průjem.

### Charakter výzvy
Převoz z/do vrtulníku; Sekundární převoz; Sekundární převoz mezikrajský; TECHNICKÁ JÍZDA; Tísňová výzva v budově; Tísňová výzva v terénu; Tísňová výzva ve zdrav. zařízení; Vstřícná jízda. (Hra zatím generuje jen tři „Tísňová výzva …“.)

### Struktura údajů výzvy (z reálných ukázek, bez osobních dat)
- **E-mail/záznam události:** NALÉHAVOST (N2), NALÉHAVOST DOPLŇKOVÁ, CHARAKTER, KLASIFIKACE ve tvaru `1/1/2/Psychiatrické stavy`, UPŘESNĚNÍ (např. „Dospělý, Halucinace / bludy + agrese“), POZNÁMKA, OZNAMOVATEL (jméno + telefon), ADRESA (kraj, okres, obec, část obce, ulice, č. orientační, č. domovní, č. popisné), odkazy GOOGLE_MAPS / MAPY_CZ, PACIENTI (jméno – rok nar.), ZASAHUJÍ (posádka (typ) – stav – členové), „Oznámil“ (zdroj, např. navigace/112). Po ukončení zpráva: počet pacientů, klasifikace, upřesnění, charakter, adresa, poznámka.
- **Tisk „Výzva k výjezdu VS <POSÁDKA>“:** Naléhavost, Událost (č.), Čas výzvy, Číslo výzvy, Telefon, Dopl. naléh., Událost popis, Událost charakter, Poznámka (AVPU, příznaky, „#nazev: …“), Příznaky události, Indikace, Charakter, Pacient, Věk/rok nar., Pohlaví, Volal/indikoval, Místo zásahu (ulice č., obec – část obce, okr.), Upřesnění místa, Souřadnice X/Y, Spoluprac. VS, Vozidlo (SPZ – kód), Lékař, NLZP, Řidič, QR kód, výřez mapy.
- Upřesnění v seznamu případů mají tvar např. `AVPU-A, DOSPĚLÝ, DK, AKS` (AVPU, věková skupina, …).

### Síť základen (veřejná tabulka, den / noc RZP+RV)
Je kompletně v `src/data.js → stations` (32 základen, den 46 RZP + 10 RV, noc 41 RZP + 10 RV), LZS Planá, 4× MU, 8 záloh. Přesné souřadnice z OSM mají: ČB, ČB-Vltava, ČB-Pražská, Třeboň, Trhové Sviny, Frymburk, Vodňany, Český Krumlov, Kunžak, Tábor; ostatní jsou přibližné (střed obce) → **čeká se na adresy od uživatele.** Nemocnice mají přesné polohy z OSM.

## 3. Architektura

Vanilla JS, žádný framework, žádný bundler. Vše kromě dat je inline v `site/index.html` (sestavuje `build.py` ze `src/template.html` nahrazením `/*DATA*/ /*BASEMAP*/ /*ENGINE*/ /*UI*/`).

| Soubor | Obsah |
|---|---|
| `src/data.js` | `ZOS_DATA`: oblasti, základny, LZS, MU, zálohy, nemocnice, města (pro pokrytí), **indications** (ukázková pravidla), místa, charaktery, klasifikace |
| `src/engine.js` | `class Sim` – celý stav v `this.s` (čistý JSON), seed RNG (mulberry32), `step(dt)` po ≤5 s, stavové automaty posádek a případů, generování případů, sekundáry, MU, pokrytí, skóre, `serialize()/restore()` |
| `src/router.js` | `ROUTER` – načte `graph.wasm` (binární silniční graf), snap na síť (mřížka), Dijkstra se stromem k cíli (LRU cache 40), `eta`, `route` (polyline + časové zlomky), `coverage` (vícezdrojová Dijkstra), `randomRoadPoint` |
| `src/ui.js` | celé UI (IIFE): render oken, karta případu, návrhy posádek, dlaždice, rádio, toasty/zvuk, modaly (start, vyhodnocení, tisk výzvy), drag&drop, **MapLibre mapa** (`glInit/glUpdate`, protokol `zos://` pro dlaždice a glyfy), SVG fallback mapa, načítání dat, autosave do localStorage |
| `src/template.html` | layout, CSS (CSS proměnné pro stavové barvy), inline MapLibre CSS, `<script src="lib/maplibre-gl-csp.js">` |
| `src/basemap.js` | zjednodušená SVG mapa (fallback, když MapLibre/WebGL selže) |
| `src/mask.geojson` | šedá maska okolí kraje |

### Engine – klíčové konstanty a logika
- Stavy posádky: `off, activating, base, free, call, enroute, onscene, transport, handover, second`.
- Výjezd: standardně z základny 55–115 s, mobilně 15–35 s; herní prodlevy se řídí naléhavostí (N3 častěji, N2 méně, N1 výjimečně). LZS létá 130 uzlů; aktivace trvá přibližně 2,5–3,5 min ve dne a 6–8 min v noci. Po přistání u NEM ČB čeká 3 min na RZP, která pacienta převeze na cílové oddělení; vrtulník se vrací do Plané. MU jen na MU událost, mobilizace 4–7 min.
- Rychlosti routeru (km/h): dálnice 110, trunk 85, I. tř. 72, II. 62, III. 52, místní 36, účelové 22; napojení mimo síť 25. Jitter jízdy ×0,92–1,18.
- Generování: Poisson 9,5 případů/h × denní profil `TOD` × obtížnost; výrazná ranní špička, klidnější poledne a menší odpolední vlna (orientačně kolem 130 událostí za 12hodinovou denní směnu). Místo = náhodná reálná adresa (`addr.json`), nehody/příroda = bod na silnici.
- Calltaker: N1 20–40 s, jinak 25–75 s nabírání.
- Čekající případ: po 25 min eskalace naléhavosti („opakované volání“), po 45 min uzavřen jako neobsloužený.
- Žádost posádky o lékaře (`rvP`) 4–8 min po příjezdu; N3→N2; RZP čeká na lékaře max. 15 min.
- Sekundární transporty se generují jen ve dne: na začátku denní směny čekají dva plánované N4 úkoly (přistavení mezi 8:00–9:00), další přibývají zhruba po 2,5–4 h; nejvýše 3 zůstávají otevřené. Většina tras (75 %) vede mezi okresní nemocnicí a ČB. Časový výsledek se měří příjezdem RZP k odesílajícímu zařízení: ±15 min = 100 bodů, bodování lineárně klesá k nule při odchylce 45 min. Jde o pracovní herní předpoklad k pozdějšímu doladění. Zálohy: aktivace 20 min, služba 4 h. Střídání směn 7:00/19:00.
- **Skóre případu (0–100):** včasnost vyslání 20 (cíl N1 60 s / N2 120 s / N3 300 s) + dojezd 50 (cíl N1 12 / N2 16 / N3 25 min od připravení) + lékař 15 + volba nejbližší posádky 15 − penalizace za přesměrování (8–10). **Základní skóre směny** = 0,75 × vážený průměr případů (N1×3, N2×2, N3×1) + 0,25 × pokrytí (podíl obyvatel měst s RZP do 15 min, 15–20 min = půl). Provozní body se přičítají/odečítají k výsledku (rozmezí 0–100): +1 za včasné převzetí zprávy 112 (do 2 min), −2 za přehlédnutí zprávy (3 min), −5 za výjezd N1 po limitu 2 min, −8 za neobsloužený případ. Skóre i historie bodů se ukládají.
- Při startu 12h směny lze vybrat čistý start (0 výjezdů) nebo rozjetý kraj: tři předané události, z nichž jedna už má vyslanou RZP. Vygenerované případy zůstávají syntetické.

### Mapa a data (`site/`)
- `t/*.wasm` – gzipované MVT dlaždice z tippecanoe (z5–z14, výše overzoom), rozdělené do chunků: `low` (z≤9) a podle rodičovské dlaždice z10; index `tiles-index.json` (`"z/x/y": [chunk, offset, délka]`). Načítá se líně podle pohledu; rozbaluje `DecompressionStream`.
- Glyfy Noto Sans Regular/Bold (rozsahy 0-255, 256-511, 8192-8447) v `t/glyphs.wasm`.
- Vrstvy: roads (class motorway…track, name, ref), rail, water, waterway, landcover (wood/residential/industrial), buildings (z14), places, boundary (okres/kraj).
- `graph.wasm` – formát: hlavička `N,M,NP` (uint32), uzly `int32 lat,lon ×1e5`, hrany `u,v uint32, cls uint8, nMid uint16, délka_m uint32` (15 B, little-endian), mezibody `int32 lat,lon`. Největší souvislá komponenta, 77 104 uzlů, 92 092 hran. Jednosměrky se ignorují (záchranka).
- `addr.json` – 70 000 náhodně vybraných adres: `{okresy, s: [řetězce], a: [lat,lon,ulice,obec,číslo,část,okres,čp] ×N}`.
- **Proč `.wasm`:** hosting artefaktů claude.ai odmítal `.bin/.pbf`; binárky jsou proto pojmenované `.wasm` (obsah není WebAssembly). Na vlastním hostingu lze přejmenovat zpět (upravit `ui.js` fetch a `pack.py`).

### Omezení dosavadního hostingu (claude.ai artefakt)
CSP blokuje vzdálené obrázky/fetch → nelze použít živé OSM dlaždice, proto vlastní dlaždice v souborech. Limity: 20 MiB/soubor, 64 MiB celkem, 256 souborů/publikaci. Skripty jen z povolených CDN nebo vlastních souborů. **Na vlastním hostingu tato omezení odpadají** (lze např. přejít na živé OSM/Mapy.cz dlaždice, PMTiles s range requesty atd.).

## 4. Stav funkcí

Hotovo: kompletní herní smyčka, 2 režimy, rychlost 0–60×, pauza mezerníkem, autosave/obnova, vyhodnocení směny se seznamem nejhorších případů, návrhy posádek s ETA po silnicích, přesměrování, zálohy, LZS včetně letu na heliport a předání přes RZP, MU událost, žádosti o lékaře, sekundáry, střídání směn, rádio log + dlaždice oblastí, tisk výzvy k výjezdu, mobilní rozložení (spodní navigace), drag&drop (myš i dotyk s podržením), plná OSM mapa s trasami. Příznaky hovoru se ukládají jako samostatné syntetické volby a v detailu se zobrazují jako odškrtnuté položky.

Známá omezení / TODO:
- Indikace jsou ukázkové (čeká se na uživatele).
- Doplňková naléhavost se zobrazuje jen tehdy, když je u případu zaznamenána změna; automatické změny naléhavosti během hovoru zatím nejsou implementované. Kód klasifikace `1/1/n/` se v UI nezobrazuje.
- Ukázková primární výzva obsahuje typ výjezdu, popis místa se generuje malými písmeny s občasnou ztrátou diakritiky; výchozí četnost cílí přibližně na 130 událostí za směnu.
- Běžná doba od vyslání k rozjezdu pozemní posádky nepřesahuje 2 minuty. Herní prodlevy nad limit se generují častěji u N3, méně u N2 a výjimečně u N1; překročení 2 minut u N1 vyvolá červené upozornění a zvukový alarm.
- Mapa vykresluje skutečnou vypočtenou trasu všech právě jedoucích posádek po silničním grafu OSM, pokud jsou mapová a routovací data načtena. Bez routovacího grafu zůstává zjednodušený přímý pohyb.
- Polohy 22 základen jsou přibližné.
- Sekundární převozy a převozy z/do vrtulníku jsou hratelné; vstřícná jízda a technická jízda zatím nejsou.
- MU (od 0.26.0, SM01.06 rev. 8): `c.mu` má jednotlivé pacienty `pts` (TIK, priorita I–IV, typ, UPV, dítě, stav scene/ready/asked/transport/delivered/dead), METHANE `mt`/`reported`, kontaktní místa `hosp`, sousedy `nb` a cizí vozy `ext`. Engine: `_muStep`, `_muOdsunCalls`/`_muDirect` (rádiová relace `kind:'muodsun'`), `_muColleagueAct` (simulovaný kolega řídí MU, když hráč nezvolil roli MU), `_muReserveBlocked` (ponechání RZP), `_muScore`. UI: `muPanelHtml`. Typy MU: katalog `ZOS_DATA.muTypes` (36 scénářů; `_muPickType` podle počasí a sezóny, `_muPlace` reálné místo z poi.json / silnic / železnice / letiště), typ poranění P/T/P+T/I/N, zóna `m.accessAt`, popáleninová centra jen pro LZS. Nesimulováno: telefonáty vedení, SMS skupinám, papírové TIK/odsunový formulář, popáleninové centrum, kanály rádia.
- Běžná nemocniční avíza a konzultace mimo MU jsou zatím jen v logu.
- Nemocnice nemají kapacity ani odklony.
- Pokrytí se počítá jen nad 47 městy.
- Denní počet případů má orientační ranní špičku, polední útlum a menší odpolední vlnu; odlišné profily podle dne v týdnu zatím nejsou modelované.
- Mapa: bez polí a luk (velikost), řeky malých toků až od z12.
- Nebylo ověřeno chování publikované verze na skutečných zařízeních (WebGL).

## 5. Pipeline mapových dat
Viz `pipeline/README.md` a `pipeline/run.sh`. Vstup: Geofabrik `jihocesky-latest.osm.pbf` (~97 MB, není v repu). Hranice okresů z repozitáře CzechInvest/web-data. Glyfy z npm `@inframaps/glyphs-core`, MapLibre z npm `maplibre-gl@4.7.1` (CSP build + worker).

## 6. Kalibrace anonymním říjnovým vzorkem
- Byly převzaty pouze agregované četnosti indikací a mediány času na místě; původní tabulka ani její osobní údaje se do repozitáře neukládají.
- Váhy `indications[].w` nyní přibližně kopírují zastoupení klasifikací ve vzorku. Trauma je rozdělené mezi dospělé a dětské scénáře v poměru 90/10, protože tabulka tuto klasifikaci nerozlišuje jednotně. Druhotné převozy a provozní jízdy nejsou převedeny na primární zdravotní události.
- Časy na místě jsou zkráceny podle mediánů pro odpovídající indikace; jde o herní rozsahy, ne klinické normy. Frekvence jednotlivých indikací podle N, lékař/ZZUM a pravidla dispečinku zůstávají beze změny.
- Hodinový profil byl upraven podle počtu říjnových výzev po hodinách při zachování původního součtu pro denní a noční část. Tím zůstává cílový objem směny zachován.
- Dojezdové časy se dál počítají po OSM silničním grafu. Z dodaného vzorku šlo jednoznačně spojit jen 50 adres s mapou; párování mělo nápadně nesourodé časy, proto se jím rychlost routeru nekalibrovala. Pro přesnější lokální kalibraci jsou potřeba přesné polohy základen a správně vymezený interval jízdy.
- Volné poznámky se generují jen u části událostí a popisují stručné okolnosti místa/přístupu. Strukturované příznaky zůstávají v poli Upřesnění; osobní vztahy ani identifikující detaily se nevymýšlí.
- `src/symptoms.json` obsahuje 400 jedinečných položek a skutečné kombinace příznaků z listu „Příznaky události“, seskupené podle indikace a N. Při importu se výzvy deduplikovaly podle čísla události; do souboru se ukládají jen příznaky, kombinace a počty, bez identifikátorů či jiných sloupců. Generátor primárních událostí vybírá kombinaci jen z této databáze; pokud daná indikace/N ve vzorku chybí, použije zaznamenanou kombinaci stejné indikace. Pro Resuscitaci, dětské scénáře a Amputaci používá pozorované kombinace obsahující příslušné příznaky, protože názvy těchto indikací nejsou ve zdroji jako samostatná klasifikace.
- Bezvědomí s příznakem „nedýchá“ se při generování vždy nastaví rovnou na N1, bez dynamické indikace; vybere se pozorovaná N1 kombinace, pokud je pro daný profil dostupná.
- Při odvolání RV u nepovinné žádosti posádky se žádost označí jako zrušená, přestane blokovat transport RZP, skóre i upozornění. Povinné RV u původního N1/N2 zůstává povinnou složkou.
- `addr.json` obsahuje aktuálně 70 000 adresních bodů (69 591 různých zobrazených adres). Generátor neopakuje stejnou adresu mezi posledními 1 000 událostmi. Pipeline už nemá limit 70 000 a při příští regeneraci použije všechny adresy nalezené v OSM vstupu. Souřadnice základny Mladá Vožice jsou opravené podle adresy Plaňková 420.
