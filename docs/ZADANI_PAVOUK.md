# Zadání: režim calltaker jako součást plného UI zos-simulatoru (AML, mapa, pavouk, nabírání)

Zadání od vlastníka (MUDr. Vojtěch Míra, 17. 11. 2026), poslední upřesnění téhož dne přepisuje všechna předchozí. Navazuje na `docs/PREDANI_CALLTAKER.md`. Komunikace česky, stručně. Pravidla repa: `CLAUDE.md`, `AGENTS.md`.

## Cíl
**Režim calltaker je plnohodnotná součást hlavní aplikace zos-simulator**, volitelná z **menu úvodní obrazovky**, a vypadá jako zbytek UI (okna, motivy, rozložení, nastavení, mobilní navigace). Hráč je calltaker: zazvoní telefon, zvedne ho, mluví s AI volajícím (hlas OpenAI GPT-Live), při nabírání vidí **polohu volajícího z AML** (kruh s přibližnou polohou), vybírá nebo ověřuje místo **na mapě**, klasifikuje **pavoukem**, vyplní **okno nabírání** a odešle dispečerovi. Dispečer je zatím **bot**. Do budoucna místo bota sedí kamarád na jiném zařízení, proto jde bota **vypnout** (pak se případy obsluhují ručně běžnými dispečerskými okny).

## Rozložení calltakera (jen tohle, nic víc ve výchozím stavu)
1. **Okno Nabírání** s **kompaktním telefonním pruhem** nahoře (zvoní, číslo a linka z ANI, čas hovoru, Zvednout / Ukončit, ztlumit mikrofon, stav hlasového spojení) a **záložkami**:
   - **Nabírání**: formulář (viz níže) + sbalitelný **přepis hovoru**,
   - **Moje případy**: seznam případů, které calltaker nabral a poslal dispečerovi (čas, adresa, klasifikace, N, stav: čeká / vyslána / na místě / uzavřeno, posádky a ETA z bota; po uzavření kontrola klasifikace a následky).
2. **Okno Pavouk** (plovoucí, otevírané při nabírání).
3. **Okno Mapa** (pohyblivá: posun a zoom; viz AML a výběr místa).
Žádná další dispečerská okna (případy, panel případu, posádky, rádio) ve výchozím stavu; volitelný přepínač „Zobrazit dispečerská okna“ (pro vypnutého bota a ladění). Okna přes existující systém rozložení (`LAYOUT_PRESETS` nový preset `calltaker`, `layoutKey`, `.win`, `.win.floating`, `.pin-btn`), na telefonu přes spodní navigaci jako ostatní okna.

## AML (Advanced Mobile Location)
Při nabírání zapnout, kde to jde. Cíl: nejdřív se objeví **aspoň kruh s přibližnou polohou**, později přesnější.
- **Dostupnost** (výchozí): u mobilních hovorů asi 75 %; pevná linka, skryté číslo a hovory bez lokace nemají AML (u pevné linky lze nabídnout adresu účastníka jako volitelné rozšíření). Konkrétní čísla zapiš do `docs/OTAZKY.md`.
- **Fáze** (sekundy od zvednutí): (1) **buňka (sektor)** ihned, poloměr asi 600–3500 m (město menší, venkov větší); (2) po asi 8–40 s **AML** s přesností podle zdroje: Wi-Fi 20–90 m, GNSS 5–40 m venku (uvnitř budovy hůř, 20–150 m); v ~10 % případů AML nedorazí a zůstane jen buňka. Nový menší kruh nahradí předchozí (starý šedě).
- **Střed kruhu** = pravda + náhodný posun tak, aby pravda byla uvnitř kruhu (~95 %); v ~5 % je pravda mimo (špatný fix), calltaker to má poznat z hovoru.
- Deterministické ze seedu v `callFacts` (nové pole `aml`: seznam fází `{atSec, radiusM, lat, lon, zdroj}`), čistý JSON.
- UI: kruhy na mapě (barva podle přesnosti, popisek „AML GNSS ±12 m“, „Buňka ±1,8 km“), upozornění v okně Nabírání při příchodu nové polohy, tlačítko **Použít střed AML** (nastaví bod místa). Skutečnou polohu (pravdu) hráč nikdy nevidí.

## Mapa a výběr místa
- Využít stávající MapLibre mapu hlavní aplikace (vlastní dlaždice, `glInit` apod.); v režimu calltaker bez posádek a případů (volitelný přepínač „posádky na mapě“, výchozí vypnuto).
- **Klik na mapu vybere bod** (značka). Z bodu se **předvyplní adresa**: nejbližší adresní bod z `ZOS_ADDR` (do ~100 m), jinak „okolí obce X“ / nejbližší silnice z routeru. Adresu lze ručně upravit; zadání adresy textem naopak najde bod (`_ctGeocode`) a posune mapu. Bod i text se posílají.
- **Tolerance proti originálnímu vylosovanému výjezdu** (výchozí, lze ladit a zapsat do OTAZKY): standardní adresa (dům) 60 m, bod z POI 120 m, silnice/terén 200 m. Do tolerance = správně. Mezi tolerancí a 3× tolerancí = malé zdržení (hledání pacienta, úměrně vzdálenosti, např. 60–150 s). Nad 3× tolerancí = chybná poloha s plnými následky (posádka jede na zadaný bod, nenajde pacienta, hledá a přejede; stávající mechanismus `addrMiss` v `src/sim-loop.js`).
- Je-li zadán bod z mapy, má při rozporu s textem adresy přednost bod; v okně Nabírání zobrazit zdroj polohy (mapa / adresa / AML).
- Po hovoru v okně výsledku ukázat **zadaný bod a skutečnou polohu** na mini mapě (aby se hráč učil).

## Pavouk (modul `calltaker/spider.js`, UMD, deterministický, bez DOM) a jeho okno
Pavouk se vymyslí **podle toho, jak jsou označené výjezdy v excelu** (skutečný pavouk dodá uživatel později; tohle je náhrada řízená daty). Samostatné okno s **dlaždicemi s textem** (stavy pacienta). Postupné klikání: nejdřív **indikace**, potom **vědomí, dýchání**, věk, potom další upřesnění; **po každém kliknutí další stránka**. **Výsledek** = indikace, **naléhavost N1–N3 včetně dynamické indikace**, příznaky.

Zjištění o datech: `src/symptoms.json` má `symptomCatalog` (537 názvů příznaků, mnohé s prefixem znaku, který značí skupinu indikace: `°` neúrazové krvácení, `§` křeče, `*` bolest, `^` intoxikace, `(` horečka, `_` hrudník/dušnost, `$` porucha vědomí, `)` zvracení, `!` CMP/neuro, `#` stavy a výkony jako Nosítka/PŽK/Monitor, `+` doprovodné; přesný význam zjisti z dat) a `symptomProfiles` (36 klíčů, hlavně klasifikace; klíč → `N1`/`N2`/`N3`/`N4` → `[[id příznaků], počet]` = skutečné kombinace a četnosti z exportů leden a červenec 2026). Společné příznaky: `Dospělý`/`Dítě`; vědomí `při vědomí`/`reaguje na oslovení`/`reaguje na bolest`/`bezvědomí` (+ `AVPU-A/V/P/U` s prefixem skupiny); dýchání `dýchá`/`nedýchá`/`Gasping`; `DYNAMICKÁ INDIKACE` (příznak, ne pole); `TANR`, `TANR nelze`. `ZOS_DATA.indications` má 30 položek (`id`, `klasif`, `symptomKey`, `n` váhy, `dyn`, `w`); klasifikace s více indikacemi (Dopravní nehoda, Trauma) sloučit podle `klasif`. Řetězec příznaků případu `c.up` je názvy spojené `, `. Bezvědomí + „nedýchá“ je vždy N1 bez dynamiky (pravidlo generátoru).

Algoritmus:
1. **Stránka indikace:** dlaždice podle `klasif` (řazení podle četnosti), s krátkým popiskem.
2. **Základ:** věk (Dospělý/Dítě), vědomí (A/V/P/U), dýchání. Nabízet jen možnosti, které se v datech pro zvolenou indikaci vyskytují; stránku přeskočit, nemá-li smysl.
3. **Upřesnění:** z kombinací konzistentních s dosavadními volbami příznaky seřazené podle vážené četnosti; stránka = nejvýše ~12 dlaždic + „žádné z uvedených / hotovo“. Skupiny pojmenovat podle prefixů (lokalizace, doprovodné příznaky, rizika/výkony). Pokračovat, dokud existují rozlišující příznaky nebo uživatel nezvolí hotovo.
4. **Výsledek:** indikace, příznaky (volby + doplnění nejlepší pozorovanou kombinací), **navržené N** (nejpravděpodobnější podle vážených počtů, zobrazit rozdělení a jistotu), **dynamická indikace** (podle výskytu `DYNAMICKÁ INDIKACE` v konzistentních kombinacích, zobrazit pravděpodobnost). N a dynamiku lze ručně přepsat. Tlačítka Zpět, Znovu, drobečková navigace; „Použít do výzvy“ předvyplní okno nabírání.
Dlaždice velké a čitelné na telefonu.

## Okno nabírání výzvy (záložka Nabírání)
Pole: **volající** (jméno, příjmení, telefon předvyplněný z ANI, vztah k pacientovi), **pacient** (jméno, příjmení, rok narození nebo věk, pohlaví), **místo** (adresa ulice č. + obec, část obce, upřesnění: patro/vchod/označení; zdroj polohy; bod z mapy), **událost** (popis, poznámka), **klasifikace z pavouka** (jen čtení, s tlačítkem otevřít pavouka). Tlačítka **Odeslat dispečerovi** a **Aktualizovat případ**; po odeslání hovor pokračuje (např. telefonicky asistovaná resuscitace), ukončuje se samostatně.

## Engine (`src/sim-calltaker.js`)
- `callFacts(seed)`: přidat `aml` (viz výše). Nové chování jen za `s.liveCalls`; běžné hry se nedotýkat.
- `addCallCase`/`updateCallCase`/`sendCall`: `form` rozšířit o jména a příjmení volajícího i pacienta, věk či rok, pohlaví, telefon, vztah, upřesnění místa, `lat`/`lon` z mapy, zdroj polohy, `klasif`, `priznaky` (pole), `n`, `dyn`. Tolerance a následky polohy podle výše. Bot a UI vidí zadané; mechanika (potřeba lékaře apod.) dál z pravdy.
- Uložit zadané vs. skutečné do `c.call` a spočítat **kontrolu klasifikace**: shoda klasifikace, N, dynamiky, překryv příznaků (Jaccard), věk (tolerance), jména (bez diakritiky), vzdálenost zadaného bodu od pravdy a to, zda byl použit AML. Determinismus pro seed a čistý JSON `sim.s` zachovat. Lékařská a dispečerská pravidla v `src/data.js` neměnit.

## Integrace do hlavní aplikace
- Menu úvodní obrazovky (`homeModal`/nová směna v `src/ui-modal.js`): volba **Calltaker** a jeho nastavení (hovory: realistický tok / trénink s intervalem; rychlost mezi hovory; bot zapnout/vypnout; hlas, filtr, nahrávka; OpenAI klíč a modely uložit v nastavení aplikace, klíč jen v prohlížeči).
- Z `calltaker/web/app.js` vyčlenit **hlasovou část** (WebRTC GPT-Live, telefonní filtr a šum přes hlas, nahrávka WAV, přepis) do `src/live-voice.js` (globální objekt jako `src/voice.js`) a **UI část** do nového `src/ui-calltaker.js` (přidat do `UI_PARTS` v `build.py` a do lintu). `calltaker/prompts.js`, `personas.js`, `check.js`, `spider.js` zahrnout do buildu hlavní aplikace. Samostatná stránka `calltaker/web/` zůstane jako záloha, dokud integrace nefunguje, poté ji lze přesměrovat na hlavní aplikaci.
- Herní režim v enginu spojený s `enableLiveCalls`; uložení a obnova směny (`sim.s` čistý JSON; stav hovoru a hlasu se neukládá). Hlavní aplikace už načítá `ZOS_ADDR`, `ZOS_POI`, `ZOS_RAIL`, `ROUTER`.
- Po hovoru **modální okno výsledku** ve stylu `modal(...)`: kontrola klasifikace, následky v simulaci, mini mapa zadaného a skutečného bodu, hodnocení soudce, stažení WAV a JSON.
- Vzhled sjednotit s UI (CSS proměnné a třídy z `src/template.html`, bez cizího stylu), světlý/tmavý motiv, telefon i počítač, srozumitelné stavy (zvoní, v hovoru, odesláno, ukončeno), krátká nápověda k režimu.

## Co už existuje (nezačínej od nuly)
- Engine `src/sim-calltaker.js` (zvonění, zvednutí, odeslání/aktualizace, bot, hledání adresy `_ctGeocode`, následky špatné adresy) + `tests/calltaker_test.js`.
- Samostatná stránka `calltaker/web/` (`template.html`, `app.js`, `index.html`, `site/calltaker/index.html`): hlas, filtr, šum, WAV, formulář, přehled případů, soudce.
- Hlavní UI: `src/ui-*.js` (jedna IIFE skládaná v `build.py` z `UI_PARTS`), `src/template.html` (okna `w-cases`, `w-detail`, `w-rcom`, `w-map`, `w-radio`, `w-crews`), rozložení v `src/ui-layout.js`, úvodní obrazovka a nastavení v `src/ui-modal.js`, příklad speciálního režimu: MU (`muModeOn`, `applyMuMode`, `body.mu-mode`, layout `mu`).

## Pravidla (stabilní simulátor se nesmí rozbít)
- Běžná směna, výcvik a MU beze změny: nové větve v enginu za `s.liveCalls`, UI za volbou režimu. `tests/test.js`, `tests/tutorial.js`, `tests/content_audit.js` a `python3 tests/browser_smoke.py` zůstanou zelené.
- Hráč vidí změnu ⇒ záznam v `CHANGELOG.md` (sekce `## v0.32.0 – rozpracováno`, Nové / Interní) a `VERSION` `0.32.0-dev` (verze s `-` se nevydávají).
- Rozhodnutí zapisuj do `docs/OTAZKY.md` (blok „Calltaker v hlavní aplikaci, AML, mapa, pavouk“) **před** implementací.
- Žádná reálná data ani osobní údaje; vše generované.
- Pracuj jen v `C:\ZOS simulator\zos-calltaker`. Nesahej na nedokončené změny v původní složce `C:\ZOS simulator\zos-simulator`.

## Testy a kontroly
- Nový `tests/spider_test.js` (v `npm test`): z každé pozorované kombinace jde klikáním dojít na výsledek se správnou indikací; navržené N odpovídá většině konzistentních kombinací; „nedýchá“ vede na N1; stránky mají nejvýše ~12 dlaždic; deterministické.
- Rozšířit `tests/calltaker_test.js`: AML (dostupnost, fáze, deterministické, pravda v kruhu ~95 %), bod z mapy a tolerance (v toleranci / malé zdržení / plná chyba), nová pole formuláře, kontrola klasifikace.
- Před commitem: `npx eslint 'src/*.js' calltaker work/ui.bundle.js --ignore-pattern src/sw.js --ignore-pattern 'src/ui-*.js'`, `node tests/calltaker_test.js`, `node tests/spider_test.js`, `node tests/content_audit.js`, `python3 build.py`; hlavní `node tests/test.js` a `node tests/tutorial.js` na pozadí do souboru (několik minut; sleduj `EXIT`). Prohlížeč: lokální server nad `site/`, `python3 tests/browser_smoke.py` a vlastní Playwright scénář (atrapa WebRTC, falešné API, zvonění → zvednutí → AML kruh → klik na mapu → pavouk → formulář → odeslání → bot; bez chyb v konzoli; snímky telefon a počítač).

## Autonomní práce
- Pracuj **samostatně, bez dotazů**, dokud není hotovo, nebo dokud nedojde limit. Rozhodnutí řeš rozumným výchozím řešením a zapiš do OTAZKY.
- **Commituj malé kroky a pushuj na větev `claude/brave-bell-k9qkuy`**, kdykoli je krok zelený. **Nepushuj na `main`**, netvoř tagy ani vydání (jen na pokyn uživatele).
- Pořadí práce: (1) integrace režimu do menu a rozložení + přenos hlasu a hovorů, (2) mapa s výběrem bodu a tolerance, (3) AML, (4) pavouk, (5) okno nabírání a záložka Moje případy, (6) výsledek hovoru, vzhled, testy, dokumentace.
- Průběžně aktualizuj „Stav práce“ v `docs/PREDANI_CALLTAKER.md`; **před limitem** ulož stav (commit, push, zápis).

## Hotovo, když
1. Calltaker jde zvolit v menu hlavní aplikace, má jen okna Nabírání (se záložkou Moje případy), Pavouk a Mapa, a vypadá jako součást UI (motivy, mobil).
2. AML kruhy se objevují s různou přesností a postupným zpřesněním; klik na mapu vybere bod s předvyplněnou adresou; tolerance proti pravdě a následky fungují.
3. Pavouk (modul + test + okno) vrací indikaci, N včetně dynamické a příznaky a předvyplní nabírání; okno nabírání má všechna pole.
4. Engine přijme nová pole a spočítá kontrolu klasifikace; po hovoru okno výsledku s mini mapou.
5. Bota jde vypnout a případy obsluhovat ručně (přepínač dispečerských oken).
6. Všechny kontroly zelené včetně stabilního simulátoru, changelog a `0.32.0-dev`, vše na větvi, dokumentace aktualizovaná.
7. Shrnutí v češtině: co je hotové, co ne, co dodat (skutečný pavouk), jak vyzkoušet.

## Mimo rozsah
Živý test hlasu (udělá uživatel), kamarád jako dispečer přes server, vydání na `main`, napojení na skutečné AML a skutečná data.
