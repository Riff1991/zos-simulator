# Zadání: režim calltaker jako součást plného UI zos-simulatoru (+ pavouk a okno nabírání)

Zadání od vlastníka (MUDr. Vojtěch Míra, 17. 11. 2026), upřesněno téhož dne. Navazuje na `docs/PREDANI_CALLTAKER.md`. Komunikace česky, stručně. Pravidla repa: `CLAUDE.md`, `AGENTS.md`.

## Cíl
**Režim calltaker má být plnohodnotnou součástí hlavní aplikace zos-simulator**, ne samostatná stránka. Má vypadat a chovat se jako zbytek UI (okna, motivy, rozložení, nastavení, mobilní navigace). Hráč si na úvodní obrazovce zvolí režim **Calltaker**: zvoní telefony (hovory z databáze případů, kterou simulátor už má), hráč hovor zvedne, mluví s AI volajícím, vyplní okno nabírání výzvy, klasifikuje pomocí **pavouka** a odešle dispečerovi. Dispečer je zatím **bot**; ostatní okna simulátoru (případy, panel případu, posádky, mapa, rádio) běží vedle a ukazují, co bot s případem dělá. Do budoucna místo bota sedí kamarád na jiném zařízení, proto má jít bota **vypnout** a obsluhovat případy ručně ve stejném UI (platí i pro vlastní zkoušení).

## Co chce uživatel (jeho slovy, upraveno)
1. Calltaker režim **integrovat do zos-simulatoru** a **zdokonalit**, aby vypadal jako součást plného UI.
2. **Pavouk** (rozhodovací strom pro klasifikaci výzvy) vymyslet **podle toho, jak jsou označené výjezdy v excelu** (`src/symptoms.json`, `ZOS_DATA.indications`). Skutečný pavouk přijde později, tohle je náhrada řízená daty.
3. Pavouk je **samostatné okno** s **dlaždicemi s textem** (stavy pacienta). Postupné klikání: nejdřív **indikace**, potom základní věci (**vědomí, dýchání**, věk), potom další upřesnění. **Po každém kliknutí další stránka** s dalšími volbami.
4. **Výsledek** = kompletní klasifikace: **indikace, naléhavost (N1–N3) včetně dynamické indikace, příznaky**.
5. Při nabírání výzvy **okno pro zadávání údajů**: jméno, příjmení, adresa a další věci potřebné k nabrání výzvy.
6. Později (mimo rozsah): kamarád jako živý dispečer přes server.

## Co už existuje (nezačínej od nuly)
- Engine `src/sim-calltaker.js`: `callFacts(seed)`, `addCallCase`/`updateCallCase`, `enableLiveCalls`, `_ringCall`, `pickupCall`, `sendCall`, `hangupCall`, `botTick`, hledání adresy (`_ctGeocode`), následky špatné adresy. Test `tests/calltaker_test.js`.
- Samostatná stránka `calltaker/web/` (`template.html`, `app.js`, výstup `index.html`, `site/calltaker/index.html`): zvonění, hlas OpenAI GPT-Live přes WebRTC (`startVoice`, `phoneFilter`, `lineNoise`, záznam do WAV `setupRec`/`toWav`), formulář, přehled případů, soudce po hovoru. Moduly `calltaker/prompts.js`, `personas.js`, `check.js` jsou UMD (`window.CT_*`). **Tento kód se přenese do hlavní aplikace** (a samostatná stránka zůstane jako záloha, dokud integrace nefunguje; pak ji lze přesměrovat na hlavní aplikaci).
- Hlavní UI: `src/ui-*.js` (jedna IIFE skládaná v `build.py` z `UI_PARTS`), `src/template.html` (okna `<section class="win" id="w-…">`: `w-cases`, `w-detail`, `w-rcom`, `w-map`, `w-radio`, `w-crews`), rozložení a plovoucí okna v `src/ui-layout.js` (`LAYOUT_PRESETS`, `layoutKey`, `.win.floating`, tlačítko `.pin-btn`), úvodní obrazovka a nastavení v `src/ui-modal.js` (`homeModal`, `settingsModal`), příklad speciálního režimu: MU (`muModeOn`, `applyMuMode`, `body.mu-mode`, vlastní layout `mu`). Hlavní aplikace už načítá `ZOS_ADDR`, `ZOS_POI`, `ZOS_RAIL`, `ROUTER`.

## Co dělat (pořadí = priorita)
### M1: integrace režimu do hlavní aplikace
- Přidat na úvodní obrazovku volbu **Calltaker** (hlasový trenažér) a její nastavení (hovory: realistický tok / trénink s intervalem; rychlost mezi hovory; bot dispečer zapnout/vypnout; hlas, filtr, nahrávka; OpenAI klíč a modely uložit v nastavení aplikace, klíč jen v prohlížeči). Nastavení jako ostatní v `settingsModal` / nové směně.
- Z `calltaker/web/app.js` vyčlenit hlasovou část (WebRTC GPT-Live, telefonní filtr a šum, nahrávka WAV, přepis) do samostatného souboru jako `src/voice.js` (např. `src/live-voice.js`, globální objekt) a UI část do nového `src/ui-calltaker.js` (přidat do `UI_PARTS` a lintu). `calltaker/prompts.js`, `personas.js`, `check.js` (a nový `spider.js`) zahrnout do buildu hlavní aplikace.
- Nový **herní režim** v enginu spojený s `enableLiveCalls` (bez zásahu do běžné směny; vše za podmínkou `s.liveCalls`). Uložení a obnova směny (`sim.s` zůstává čistý JSON; stav hovoru a hlasu se neukládá).
- **Rozložení „calltaker“** (nový preset v `LAYOUT_PRESETS`, `layoutKey`) s okny ve stylu UI: **Telefon** (zvonění, ANI, přepis hovoru, Zvednout/Ukončit, ztlumit), **Nabírání výzvy**, **Pavouk** (plovoucí okno), vedle stávající okna **případy, panel případu, posádky, mapa, rádio** (jedou z bota). Respektovat motivy (světlý/tmavý), velikost písma, mobilní spodní navigaci, `.win`/`.floating`/`.pin-btn`.
- Panel případu a seznam případů zobrazují **zadané** údaje (ne pravdu). Bota jde přepínat; při vypnutém botu hráč obsluhuje případy ručně běžným UI.
- Po hovoru **modální okno výsledku** (kontrola klasifikace, následky v simulaci, hodnocení soudce, stažení WAV a JSON) ve stylu `modal(...)`.

### M2: pavouk (modul `calltaker/spider.js`, UMD, deterministický, bez DOM) a jeho okno
Zjištění o datech: `src/symptoms.json` má `symptomCatalog` (537 názvů příznaků, mnohé s prefixem znaku, který značí skupinu indikace: `°` neúrazové krvácení, `§` křeče, `*` bolest, `^` intoxikace, `(` horečka, `_` hrudník/dušnost, `$` porucha vědomí, `)` zvracení, `!` CMP/neuro, `#` stavy a výkony jako Nosítka/PŽK/Monitor, `+` doprovodné; přesný význam zjisti z dat) a `symptomProfiles` (36 klíčů, hlavně klasifikace; klíč → `N1`/`N2`/`N3`/`N4` → `[[id příznaků], počet]` = skutečné kombinace a četnosti z exportů leden a červenec 2026). Společné příznaky: `Dospělý`/`Dítě`; vědomí `při vědomí`/`reaguje na oslovení`/`reaguje na bolest`/`bezvědomí` (+ `AVPU-A/V/P/U` s prefixem skupiny); dýchání `dýchá`/`nedýchá`/`Gasping`; `DYNAMICKÁ INDIKACE` (příznak, ne pole); `TANR`, `TANR nelze`. `ZOS_DATA.indications` má 30 položek (`id`, `klasif`, `symptomKey`, `n` váhy, `dyn`, `w`); klasifikace s více indikacemi (Dopravní nehoda, Trauma) sloučit podle `klasif`. Řetězec příznaků případu `c.up` je názvy spojené `, `. Bezvědomí + „nedýchá" je vždy N1 bez dynamiky (pravidlo generátoru).

Algoritmus:
1. **Stránka indikace:** dlaždice podle `klasif` (řazení podle četnosti), s krátkým popiskem.
2. **Základ:** věk (Dospělý/Dítě), vědomí (A/V/P/U), dýchání. Nabízet jen možnosti, které se v datech pro zvolenou indikaci vyskytují; stránku přeskočit, nemá-li smysl.
3. **Upřesnění:** z kombinací konzistentních s dosavadními volbami příznaky seřazené podle vážené četnosti; stránka = nejvýše ~12 dlaždic + „žádné z uvedených / hotovo". Skupiny dlaždic pojmenovat podle prefixů (lokalizace, doprovodné příznaky, rizika/výkony). Pokračovat, dokud existují rozlišující příznaky nebo uživatel nezvolí hotovo.
4. **Výsledek:** indikace, příznaky (volby + doplnění nejlepší pozorovanou kombinací), **navržené N** (nejpravděpodobnější podle vážených počtů, zobrazit rozdělení a jistotu), **dynamická indikace** (podle výskytu `DYNAMICKÁ INDIKACE` v konzistentních kombinacích, zobrazit pravděpodobnost). N a dynamiku lze ručně přepsat. Tlačítka Zpět, Znovu, drobečková navigace.
Okno: dlaždice s textem ve stylu UI, velké na telefonu; „Použít do výzvy" předvyplní okno nabírání.

### M3: okno nabírání výzvy a engine
- Okno: volající (jméno, příjmení, telefon předvyplněný z ANI, vztah), pacient (jméno, příjmení, rok narození nebo věk, pohlaví), místo (adresa ulice č. + obec, část obce, upřesnění: patro/vchod/označení), událost (popis, poznámka), klasifikace z pavouka (jen čtení). Odeslat dispečerovi / Aktualizovat případ (hovor po odeslání pokračuje, jako dnes).
- Engine: rozšířit `form` v `addCallCase`/`updateCallCase`/`sendCall` o jména, věk či rok, pohlaví, telefon, vztah, upřesnění místa, `klasif`, `priznaky`, `n`, `dyn`. Bot a UI vidí zadané; mechanika (potřeba lékaře apod.) dál z pravdy. Uložit zadané vs. skutečné do `c.call` a spočítat **kontrolu klasifikace**: shoda klasifikace, N, dynamiky, překryv příznaků (Jaccard), věk (tolerance), jména (bez diakritiky). Determinismus pro seed a čistý JSON zachovat. Lékařská a dispečerská pravidla v `src/data.js` neměnit.

### M4: vzhled a použitelnost
Jednotný vzhled s UI (CSS proměnné a třídy z `template.html`, bez cizího stylu), světlý/tmavý motiv, telefon i počítač, klávesové zkratky kde je v UI zvykem (např. zvednout), srozumitelné stavy (zvoní, v hovoru, odesláno, ukončeno), tutoriální nápověda k režimu.

## Pravidla (důležité, nesmí se rozbít stabilní simulátor)
- Běžná směna, výcvik a MU musí fungovat beze změny: všechny nové větve v enginu za `s.liveCalls`, UI za volbou režimu. `tests/test.js`, `tests/tutorial.js`, `tests/content_audit.js` a `python3 tests/browser_smoke.py` musí zůstat zelené.
- Hráč vidí změnu ⇒ záznam v `CHANGELOG.md` (nová sekce `## v0.32.0 – rozpracováno`, Nové / Interní) a `VERSION` na `0.32.0-dev` (verze s `-` se nevydávají, ZIP ani tag nevznikne).
- Před každou změnou, kterou je třeba rozhodnout, zapiš do `docs/OTAZKY.md` (nový blok „Calltaker v hlavní aplikaci, pavouk a nabírání") **před** implementací.
- Žádná reálná data ani osobní údaje; vše generované.
- Pracuj jen v `C:\ZOS simulator\zos-calltaker`. Nesahej na nedokončené změny v původní složce `C:\ZOS simulator\zos-simulator`.

## Testy a kontroly
- Nový `tests/spider_test.js` (zařadit do `npm test`): z každé pozorované kombinace jde dojít klikáním na výsledek se správnou indikací; navržené N odpovídá většině konzistentních kombinací; „nedýchá" vede na N1; stránky mají nejvýše ~12 dlaždic; deterministické.
- Rozšířit `tests/calltaker_test.js` (nová pole formuláře, kontrola klasifikace).
- Před commitem: `npx eslint 'src/*.js' calltaker work/ui.bundle.js --ignore-pattern src/sw.js --ignore-pattern 'src/ui-*.js'` (pozor, `ui-*` je v lintu přes `work/ui.bundle.js`), `node tests/calltaker_test.js`, `node tests/spider_test.js`, `node tests/content_audit.js`, `python3 build.py`; hlavní `node tests/test.js` a `node tests/tutorial.js` na pozadí do souboru (trvá několik minut; sleduj `EXIT`). Prohlížeč: lokální server nad `site/` a `python3 tests/browser_smoke.py`, plus vlastní Playwright scénář režimu calltaker s atrapou WebRTC a falešným API (zazvonění → zvednutí → pavouk → formulář → odeslání → bot; bez chyb v konzoli; snímky telefon a počítač).

## Autonomní práce
- Pracuj **samostatně, bez dotazů**, dokud není hotovo, nebo dokud nedojde limit. Rozhodnutí řeš rozumným výchozím řešením a zapiš do `docs/OTAZKY.md`.
- **Commituj malé kroky a pushuj na větev `claude/brave-bell-k9qkuy`**, kdykoli je krok zelený. **Nepushuj na `main`**, netvoř tagy ani vydání (jen na pokyn uživatele).
- Průběžně aktualizuj „Stav práce" v `docs/PREDANI_CALLTAKER.md`; **před limitem** ulož stav (commit, push, zápis).

## Hotovo, když
1. Režim Calltaker jde zvolit v hlavní aplikaci a vypadá jako součást UI (okna, motivy, mobil).
2. Pavouk (`calltaker/spider.js` + test) a jeho okno fungují; výsledek předvyplní okno nabírání; okno nabírání má všechna pole.
3. Engine přijme nová pole, spočítá kontrolu klasifikace; po hovoru se zobrazí výsledek.
4. Bot dispečer jde vypnout; při vypnutí lze případy obsluhovat ručně v UI.
5. Všechny kontroly zelené (včetně stabilního simulátoru), changelog a verze `0.32.0-dev`, vše na větvi, dokumentace aktualizovaná.
6. Shrnutí v češtině: co je hotové, co ne, co dodat (skutečný pavouk), jak vyzkoušet.

## Mimo rozsah
Živý test hlasu (udělá uživatel), kamarád jako dispečer přes server, vydání na `main`.
