# Zadání: pavouk a okno nabírání výzvy pro režim calltaker

Zadání od vlastníka (MUDr. Vojtěch Míra, 17. 11. 2026). Navazuje na `docs/PREDANI_CALLTAKER.md`. Komunikace česky, stručně. Pravidla repa: `CLAUDE.md`, `AGENTS.md`.

## Co chce uživatel (jeho slovy, upraveno)
1. **Pavouk** (rozhodovací strom pro klasifikaci výzvy) vymyslet **podle toho, jak jsou označené výjezdy v excelu** (v repu je to `src/symptoms.json` a `ZOS_DATA.indications`). Skutečný pavouk dodá později, tohle je náhrada řízená daty.
2. **Samostatné okno** s **dlaždicemi s textem** (stavy pacienta). Postupné klikání: nejdřív **indikace**, potom základní věci (**vědomí, dýchání**, věk), potom další upřesnění. **Po každém kliknutí další stránka** s dalšími volbami.
3. **Výsledek** = kompletní klasifikace: **indikace, naléhavost (N1–N3) včetně dynamické indikace, příznaky**.
4. Při nabírání výzvy **okno pro zadávání údajů**: jméno, příjmení, adresa a další věci potřebné k nabrání výzvy.
5. Budoucí cíl (zatím mimo rozsah): kamarád na jiném zařízení jako živý dispečer; zapojení celého režimu do hlavní aplikace simulátoru.

## Zjištění o datech (ověřeno)
- `src/symptoms.json`: `symptomCatalog` (537 názvů příznaků, mnohé s prefixem znaku, který značí skupinu indikace, např. `°` neúrazové krvácení, `§` křeče, `*` bolest, `^` intoxikace, `(` horečka, `_` hrudník/dušnost, `$` porucha vědomí, `)` zvracení, `!` CMP/neuro, `#` stavy a výkony jako Nosítka/PŽK/Monitor, `+` doprovodné; přesný význam zjisti z dat) a `symptomProfiles` (36 klíčů, hlavně klasifikace; klíč → `N1`/`N2`/`N3`/`N4` → seznam `[[id příznaků], počet]` = skutečné kombinace a jejich četnost z exportů leden a červenec 2026).
- Společné příznaky napříč: `Dospělý` / `Dítě`; vědomí `při vědomí`, `reaguje na oslovení`, `reaguje na bolest`, `bezvědomí` (+ `AVPU-A/V/P/U` s prefixem skupiny); dýchání `dýchá` / `nedýchá` / `Gasping`; `DYNAMICKÁ INDIKACE` (je to příznak, ne samostatné pole); `TANR`, `TANR nelze`.
- `ZOS_DATA.indications` (30 položek: `id`, `klasif`, `symptomKey`, `n` váhy, `dyn` pravděpodobnost, `w`, …). Některé klasifikace mají víc indikací (Dopravní nehoda: `dn_poly`/`dn_lehke`; Trauma: `trauma`/`trauma_dite`); pro dlaždice je spojit podle `klasif`.
- Řetězec příznaků případu (`c.up`) je názvy příznaků spojené `, `. Hovor má skrytou pravdu `callFacts(seed).key` (`priznaky`, `naléhavost`, `dynamicka`, `klasifikace`).
- Bezvědomí s „nedýchá" je vždy N1 bez dynamiky (pravidlo generátoru, `HANDOFF.md`).

## Navržený algoritmus pavouka (modul `calltaker/spider.js`, UMD, deterministický, bez DOM)
Vstup: `ZOS_DATA`, `ZOS_SYMPTOMS`. Stav: volby dosud. Výstup: aktuální stránka (nadpis, dlaždice) a nakonec výsledek.
1. **Stránka indikace:** dlaždice podle `klasif` (řazení podle četnosti `w`), s krátkým popiskem.
2. **Základ:** věk (Dospělý/Dítě), vědomí (A/V/P/U), dýchání (dýchá / nedýchá / gasping). Nabízet jen možnosti, které se pro zvolenou indikaci v datech vyskytují; stránku přeskočit, nemá-li smysl.
3. **Upřesnění:** z kombinací konzistentních s dosavadními volbami vzít příznaky seřazené podle četnosti (vážené počtem); stránka = nejvýše ~12 dlaždic + „žádné z uvedených / hotovo". Skupiny dlaždic pojmenovat podle prefixů (lokalizace, doprovodné příznaky, rizika/výkony). Pokračovat, dokud existují příznaky, které kombinace rozlišují, nebo uživatel nezvolí hotovo.
4. **Výsledek:** indikace (`klasif`), seznam příznaků (volby + doplnění nejlepší pozorovanou kombinací), **navržené N** = nejpravděpodobnější podle vážených počtů konzistentních kombinací (zobrazit rozdělení a míru jistoty), **dynamická indikace** ano/ne podle výskytu `DYNAMICKÁ INDIKACE` v konzistentních kombinacích (zobrazit pravděpodobnost). Calltaker může N a dynamiku ručně přepsat.
5. Tlačítko Zpět (o stránku), Znovu, drobečková navigace zvolených stavů.

## UI
- **Samostatné okno pavouka** (plovoucí panel na počítači, celoobrazovkový překryv na telefonu) s mřížkou velkých dlaždic s textem, drobečkovou navigací, Zpět/Znovu a stránkou výsledku s tlačítkem „Použít do výzvy".
- **Okno nabírání výzvy** (formulář): volající (jméno, příjmení, telefon předvyplněný z čísla volajícího, vztah k pacientovi), pacient (jméno, příjmení, rok narození nebo věk, pohlaví), místo (adresa ulice č. + obec, část obce, upřesnění místa: patro/vchod/označení), událost (popis, poznámka). Klasifikace z pavouka se zobrazí (jen čtení, s možností otevřít pavouka znovu). Tlačítka Odeslat dispečerovi / Aktualizovat případ jako dnes. Žádné reálné údaje.
- Stránka `calltaker/web/` (`template.html`, `app.js`); sestavení `python3 build.py` (spustí `node calltaker/build_web.js` a zkopíruje do `site/calltaker/`).

## Engine (`src/sim-calltaker.js`)
- Rozšířit `form` v `addCallCase`/`updateCallCase`/`sendCall` o: jméno a příjmení volajícího a pacienta, věk nebo rok, pohlaví, telefon, vztah, upřesnění místa, `klasif`, `priznaky` (pole), `n`, `dyn`. Dispečer (bot) vidí zadané; mechanika (potřeba lékaře apod.) dál z pravdy.
- Uložit do `c.call` zadané vs. skutečné a spočítat **kontrolu klasifikace**: shoda klasifikace, N, dynamiky, překryv příznaků (Jaccard), shoda věku (tolerance), jména (bez diakritiky). Zobrazit v panelu výsledku hovoru vedle následků.
- Determinismus pro seed a čistý JSON v `sim.s` zachovat. Lékařská a dispečerská pravidla v `src/data.js` neměnit.

## Testy (povinné)
- Nový `tests/spider_test.js` (zařadit do `npm test`): z každé pozorované kombinace jde dojít klikáním na výsledek se správnou indikací; navržené N odpovídá většině konzistentních kombinací; „nedýchá" vede na N1; stránky mají nejvýše ~12 dlaždic; algoritmus je deterministický.
- Rozšířit `tests/calltaker_test.js` (nová pole formuláře, kontrola klasifikace).
- Před každým commitem: `npx eslint 'src/*.js' calltaker work/ui.bundle.js --ignore-pattern src/sw.js --ignore-pattern 'src/ui-*.js'`, `node tests/calltaker_test.js`, `node tests/spider_test.js`, `node tests/content_audit.js`, `python3 build.py`; hlavní `node tests/test.js` (trvá několik minut, spouštět na pozadí do souboru a kontrolovat `EXIT`).
- Prohlížečová kontrola (Playwright, atrapa WebRTC a falešné API, jak to dělala cloudová relace): zazvonění → zvednutí → pavouk → formulář → odeslání → bot; bez chyb v konzoli; snímek obrazovky telefonu a počítače.

## Pravidla práce (autonomně)
- Pracuj **samostatně, bez dotazů**, dokud není hotovo, nebo dokud nedojde limit. Rozhodnutí, která by se jinak ptala, vyřeš rozumným výchozím řešením a zapiš do `docs/OTAZKY.md` (nové blok „Pavouk a okno nabírání", **před** implementací).
- **Commituj malé kroky a pushuj na větev `claude/brave-bell-k9qkuy`**, kdykoli je krok zelený. **Nepushuj na `main`**, netvoř tagy ani vydání (to jen na pokyn uživatele).
- Nesahej na nedokončené změny v původní složce `C:\ZOS simulator\zos-simulator` (`src/engine.js`, `tests/test.js`). Pracuj jen v `C:\ZOS simulator\zos-calltaker`.
- Žádná reálná data ani osobní údaje; vše generované.
- Pravidelně aktualizuj sekci „Stav práce" v `docs/PREDANI_CALLTAKER.md` (hotovo, rozdělané, další krok), ať může kdokoli navázat. **Před dosažením limitu** ulož stav: commit, push a zápis do PREDANI.

## Hotovo, když
1. `calltaker/spider.js` + `tests/spider_test.js` zelené.
2. Okno pavouka (dlaždice, stránky, drobečky, Zpět, výsledek s N a dynamikou a příznaky) a okno nabírání výzvy fungují v `calltaker/web/` i `site/calltaker/`, na telefonu i počítači.
3. Výsledek pavouka předvyplní formulář; engine přijme nová pole a spočítá kontrolu klasifikace; zobrazí se po hovoru.
4. Všechny kontroly zelené, vše pushnuto na větev, dokumentace aktualizovaná.
5. Na konci stručné shrnutí v češtině: co je hotové, co ne, co dodat (reálný pavouk), jak vyzkoušet.

## Mimo rozsah (neřešit)
Živý test hlasu (to dělá uživatel), kamarád jako dispečer přes server, zapojení do hlavní aplikace (jen pokud zbude čas a až po splnění všeho výše, a bez zásahu do stabilního simulátoru).
