# AGENTS.md – pokyny pro AI agenta (Codex)

Projekt: **webový simulátor primárního dispečera ZOS ZZS Jihočeského kraje** (hra). Vlastník a doménový expert: MUDr. Vojtěch Míra (lékař ZZS JčK, zástupce tiskového mluvčího). Komunikuj **česky**, stručně. Uživatel často píše z mobilu.

## Co udělat jako první (povinné)

1. Přečti `README.md`, `docs/HANDOFF.md` (architektura, doménová pravidla, rozhodnutí) a `docs/OTAZKY.md`.
2. Než začneš cokoli měnit, **polož uživateli otevřené otázky z `docs/OTAZKY.md` formou ankety**:
   - po blocích (max. 4–5 otázek najednou), každá otázka s očíslovanými možnostmi A/B/C/D a vždy s možností „Jiné: …“,
   - nejdřív blok „Priority a směr“, pak doménové bloky,
   - odpovědi zapisuj do `docs/OTAZKY.md` (sekce Odpovědi) a teprve pak implementuj.
3. Ověř, že vše běží: `node tests/test.js` a `python3 build.py`, lokálně `python3 -m http.server -d site 8765` → http://localhost:8765.

## Tvrdá pravidla

- **Žádná reálná data pacientů ani osob.** Jména, telefony (fiktivní rozsah `0999…`), čísla událostí, SPZ, členové posádek jsou vždy generované. Uživatel v minulosti poslal ukázky s reálnými osobními údaji (e-maily z dispečinku, tisk výzvy) – do repozitáře se nesmí dostat nic z nich, přebírá se jen **struktura** polí.
- Žádná loga ani názvy reálného dispečerského software (dodavatelů). Rozhraní jen napodobuje rozložení.
- Volací čísla posádek odpovídají dispečerskému systému ZZS JčK (dodal uživatel; `crewNames.*.rzpNo/rvNo` v `src/data.js`). Pořadí oblastí ČB, ČK, JH, PT, ST, PI, TA.
- Reálné jsou jen veřejné údaje: síť základen a počty posádek (veřejná tabulka ZZS JčK), nemocnice, mapová data OSM (licence ODbL – atribuce „© přispěvatelé OpenStreetMap“ musí zůstat viditelná).
- Pravidla v `src/data.js → indications` jsou **ukázková**, dokud je uživatel nenahradí svými. Neměň medicínská/dispečerská pravidla bez potvrzení uživatele.
- Simulace musí zůstat deterministická pro daný seed (test to hlídá) a stav `sim.s` musí zůstat čistý JSON (ukládání/obnova).

## Verze, changelog a vydání (povinné při každé změně pro hráče)

- **Číslování** `hlavní.menší.oprava` (od v14 dál): `0.15.0` = nová várka změn, `0.15.1` = drobná oprava, `1.0.0` = oficiální vydání pro kolegy. Dřívější verze v1–v14 zůstávají, jak byly.
- **Větve:** ladí se na `dev` s verzí `X.Y.Z-dev` → testovací web https://riff1991.github.io/zos-simulator/dev/ (vlastní uložená směna i cache, nevydává se). Až uživatel schválí: merge do `main`, `VERSION` bez `-dev`, sekce v `CHANGELOG.md`.
- Každá změna, kterou hráč uvidí, má sekci v `CHANGELOG.md` (`## v0.15.0 – datum`, česky, stručně: Nové / Opravy).
- Push změny `VERSION` na `main` spustí `release.yml`: ZIP pro Mac, tag `vX.Y.Z` a GitHub Release s poznámkami z `CHANGELOG.md`. Verze s `-` se nevydávají. Tagy se ručně nepushují.
- `site/index.html` je v repozitáři – po změně `src/` vždy spustit `python3 build.py` (generuje i `site/sw.js` a `site/version.json`).
- Po úspěšných Kontrolách na `main` nebo `dev` nasadí `pages.yml` web: main → https://riff1991.github.io/zos-simulator/, dev → …/dev/

## Kontroly před odevzdáním (povinné)

1. `npm run lint` – ESLint `no-undef` (zachytí volání nedefinovaných funkcí).
2. `node tests/test.js` – engine, determinismus, regresní scénáře.
3. `node tests/content_audit.js` – obsah výzev: jména a rody, věk × místo, konzistence příznaků, četnosti N1–N3 a objem.
4. `python3 build.py` a `python3 tests/browser_smoke.py` nad lokálním serverem – klik, mapa, mobil, žádné JS chyby.

## Příkazy

- Test enginu (bot dispečer, 4 směny, invarianty, determinismus): `node tests/test.js`
- Sestavení: `python3 build.py` → `site/index.html` (vše inline kromě souborů v `site/`)
- Regenerace mapových dat z OSM: `bash pipeline/run.sh` (potřebuje `work/jihocesky.osm.pbf`, viz `pipeline/README.md`)
- Vizuální kontrola: Playwright/Chrome nad `http://localhost:8765/index.html` (file:// nefunguje kvůli fetch).

## Struktura

- `src/` – zdrojáky (data, engine, router, UI, šablona, SVG fallback mapa, maska kraje)
  - Engine: `engine-base.js` (pomocné funkce a konstanty), `engine.js` (třída `Sim`: konstruktor, RNG, čas, posádky, LIBERO, akce dispečera) a části `sim-radio.js`, `sim-neighbors.js`, `sim-cases.js`, `sim-mu.js`, `sim-loop.js`, `sim-score.js`. Části jsou třídy, jejichž metody `engine.js` přimíchá do `Sim`. Nová metoda patří do části podle tématu; sdílená konstanta do `engine-base.js` (a do jeho `module.exports`, ať ji vidí Node).
  - UI: `ui-core.js` (nastavení, ikony), `ui-panels.js`, `ui-map.js`, `ui-radio.js`, `ui-modal.js`, `ui-layout.js`, `ui-events.js`. `build.py` je ve jmenovaném pořadí složí do jedné IIFE (`work/ui.bundle.js` se používá k lintu). Při přidání souboru ho přidej do `UI_PARTS` / `ENGINE_PARTS` v `build.py`.
  - Řádky `if (typeof module …)` jsou jen pro Node a `build.py` je z prohlížečové verze odstraní (vždy celý jednořádkový příkaz).
- `site/` – nasaditelný výstup (statický web): index.html, lib/ (MapLibre), t/*.wasm (vektorové dlaždice), graph.wasm (silniční graf), addr.json (adresy), tiles-index.json
- `pipeline/` – Python skripty pro zpracování OSM
- `tests/` – Node test enginu
- `docs/` – předávací dokumentace a otevřené otázky
