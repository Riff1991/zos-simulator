# Předání: režim calltaker (hlasový trenažér s AI volajícím)

Stav k 17. 11. 2026, větev `claude/brave-bell-k9qkuy` (vychází z `main` v0.31.0, na `main` zatím nic nejde). Vlastník: MUDr. Vojtěch Míra. Komunikuj česky a stručně, čte často z mobilu. Řiď se `CLAUDE.md` a `AGENTS.md` (žádná reálná data, nic na `main` bez schválení, před commitem lint, testy, audit, build).

## Cíl
Druhá varianta hry: hráč je **calltaker**. Zazvoní telefon, zvedne ho, hlasem nabírá výzvu od AI volajícího, klasifikuje ji a **odešle dispečerovi** (hovor mezitím může pokračovat, např. telefonicky asistovaná resuscitace). Případ pak obsluhuje dispečer: zatím **bot**, později kolega živě. Cílová publikace: open-source demo + odborný článek (hlasový trenažér 112 v češtině je nezaplněná mezera; DispatchMAS a VicSim jsou jen textové).

## Rozhodnutí uživatele
- Hlas: OpenAI **GPT-Live** (`gpt-live-1`, `POST /v1/live/sessions`, WebRTC, 0,05 $/min). Čeština podle uživatele funguje dobře. Dokumentace: `https://developers.openai.com/api/docs/guides/live` (k adrese lze přidat `.md`), `live-conversations`, `live-prompting`, `voice-latency-cost`.
- Telefonní filtr (pásmo 320–3300 Hz, zkreslení, komprese): na hlas volajícího a v nahrávce na oba hlasy. **AI slyší vždy čistý mikrofon** (filtr na hlas, který slyší volající, uživatel výslovně nechce).
- Šum linky jde **přes hlas** (sílí s řečí, v pauzách skoro zmizí, občasné lupance), ne jako souvislé pozadí. Ladí se čísla v `lineNoise` v `calltaker/web/app.js`.
- Nahrávka WAV: stereo 24 kHz, oba hlasy smíchané do obou kanálů (ne levý/pravý).
- Hovory: přepínač **realistický tok** (zvoní asi čtvrtina, ostatní berou simulovaní kolegové) a **trénink** (jen moje hovory, interval v minutách). Mezi hovory se čas zrychluje (1×/5×/10×), při hovoru 1×.
- Dispečer: **zatím jen bot**; kolega živě až později (přenosový server, např. Cloudflare Worker s místností a kódem).
- Pavouk (rozhodovací strom pro příznaky a naléhavost) dodá uživatel časem jako algoritmus. Formulář se má napojit datově; dnes je to klasifikace s nápovědou a volný text.
- Stránka patří do `site/calltaker/` (stejný původ jako hra). Nasazení na `dev` nebo `main` jen se schválením.

## Architektura
- **Engine** `src/sim-calltaker.js` (část `Sim`, přimíchaná v `src/engine.js`, v `build.py` v `ENGINE_PARTS`):
  - `callFacts(seed)`: skrytá pravda (`key`) a to, co ví volající (`view`) z generátoru případů (`_spawn` v dočasné `Sim` se seedem) plus typ volajícího (`calltaker/personas.js`). Jediný zdroj pravdy; `calltaker/factsheet.js` ho jen volá.
  - `addCallCase(h)` / `updateCallCase(c, f)`: z formuláře vznikne případ (zadaná adresa a naléhavost, ne pravda). Adresa se hledá v `ZOS_ADDR` (`_ctGeocode`: exact/street/town; nezná-li ji, `call.unlocatable`). Špatná adresa (>250 m) = `c.addrMiss`; posádka dojede na zadané místo, nenajde pacienta, přejede (hook v `src/sim-loop.js`, stav `enroute`). Změna adresy po vyslání se jen zaloguje.
  - `enableLiveCalls`, `_liveSpawn`, `_ringCall`, `_callsTick` (zmeškaný hovor po 30 s), `pickupCall`, `sendCall` (poprvé vytvoří, dál aktualizuje), `hangupCall` (bez odeslání = trest), `botTick` (bot dispečer s reakční dobou; neznámá adresa +2–4 min).
  - Hook ve smyčce: `if (s.liveCalls)` v `_tick` (běžné hry se nedotkne).
- **Stránka** `calltaker/web/`: `template.html`, `app.js`, výstup `index.html` (samostatný soubor, engine a data vložené) sestavuje `node calltaker/build_web.js`; `python3 build.py` ho spouští a kopíruje do `site/calltaker/index.html`. Velká data (`graph.wasm`, `addr.json`, `poi.json`, `rail.json`) se načítají z `../` (nasazeno) nebo z `https://riff1991.github.io/zos-simulator/` (lokální soubor); lze přepsat `?data=URL` nebo polem v nastavení. Hlas: WebRTC přímo na `api.openai.com` s klíčem uživatele (jen v prohlížeči). Textové hodnocení po hovoru (soudce) běží přes Chat Completions s vybraným textovým modelem.
- `calltaker/cases.js` (předgenerovaných 200 případů) se používá jen pro „Rychlý hovor (bez směny)“; přegeneruje `node calltaker/build_cases.js`.
- Příkazová řádka (Anthropic, textová): `calltaker/chat.js`.

## Testy a ověření
- `tests/calltaker_test.js` (součást `npm test`): adresa, špatná adresa, naléhavost, zvonění, zvednutí, odeslání, aktualizace, bot, zmeškaný hovor, bez odeslání, nedohledatelná adresa.
- Stránka byla ověřena v Playwrightu **jen na atrapě WebRTC a falešném API** (skript v relaci, není v repu). Se skutečným GPT-Live, mikrofonem a nahráváním WAV to zatím nikdo neslyšel. První skutečný hovor je test.
- Lint: `npx eslint 'src/*.js' calltaker work/ui.bundle.js --ignore-pattern src/sw.js --ignore-pattern 'src/ui-*.js'`.
- Hlavní `node tests/test.js` trvá několik minut (spouštět na pozadí).

## Další kroky (podle priority)
1. **Ověřit na skutečném hovoru** (klíč OpenAI, sluchátka s mikrofonem, Chrome nebo Edge): spojení, kvalita češtiny a hlasů (`marin` ženy, `cedar` muži, `cedar` v GPT-Live neověřen, padá na `marin`), zpoždění, filtr a šum, WAV, přepis (`session.input_transcript.delta` / `session.output_transcript.delta`). Opravit, co se ukáže.
2. **Strukturovaný formulář podle pavouka**, až ho uživatel dodá (datový soubor: klasifikace, otázky, příznaky, naléhavost). Dnes se jen zaznamená.
3. **Následky podhodnocené naléhavosti** (lékař pozdě) a **změna adresy po vyslání** (přesměrování posádek).
4. **Skóre calltakera** (čas do odeslání, správnost adresy a N, vedení hovoru) sloučené s hodnocením soudce.
5. **Kolega jako živý dispečer** přes malý přenosový server; import případů do hlavní hry (`Sim.addCallCase` už existuje).
6. Ladění typů volajících a promptů podle skutečných hovorů; telefonicky asistovaná resuscitace (volající reaguje na pokyny).
7. Mapa a zoom na místo zásahu (dřívější nápad), až bude základ hotový.

## Poznámky
- Prostředí cloudové relace blokovalo `openai.com`; v jejím prostředí `zos-simulator` jsou povolené hosty `developers.openai.com`, `platform.openai.com`, `api.openai.com` (jen čtení dokumentace).
- Uživatel pracuje na Windows (složka `C:\ZOS simulator\zos-simulator`, druhá pracovní složka ze stejného repa `C:\ZOS simulator\zos-calltaker` na větvi `claude/brave-bell-k9qkuy` přes `git worktree`). V původní složce má nedokončené změny v `src/engine.js` a `tests/test.js`; nesahej na ně bez dotazu.
- Do `docs/OTAZKY.md` patří nová rozhodnutí před implementací.
