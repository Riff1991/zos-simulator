# AI pracovní stav

Inventura: 2026-11-18 před začleněním v0.37.2. Místní i vzdálený `main` jsou na `487f903` (v0.37.1). GitHub Pages běh `44376406583` publikoval v0.37.1 na hlavní i `/dev/` web. Po dokončení v0.37.2 znovu ověř běhy Actions a živý `version.json`; tento záznam je jen předávací snímek.

## Místní pracovní kopie

- `C:\ZOS simulator\zos-simulator`: `main` odpovídá `origin/main` na `487f903`; pracovní strom obsahuje místní úpravy projektových instrukcí a AI workflow, které jsou zkopírovány do calltaker větve pro začlenění.
- Původní necommitnutá změna v `src/engine.js` a `tests/test.js` přidávala povinný převoz žijících pacientů N1 a dětí N1–N2. Stejná logika i regresní test už existují v aktuálním `main`; její původní diff zůstává bezpečně zachovaný v `git stash` s popisem `codex-safety-before-main-fast-forward-2026-11-18`.
- `C:\ZOS simulator\zos-calltaker`: větev `claude/brave-bell-k9qkuy` na `5da7261` obsahuje calltaker vzhled, AML zoom, neutrální POI, PČR/HZS bez postihu a testy. Draft PR #1 míří na `main`; v této pracovní kopii se dokončuje v0.37.2, přenosné lintování a CI pro PR včetně `npm test`. Po buildu a lokálních kontrolách změny pushnout, PR začlenit a ověřit CI, release a Pages.
- `C:\ZOS simulator\zos-kalibrace`: větev `claude/realisticke-vyzvy` na `f51b87f` (`v0.31.0`), 8 commitů před `origin/claude/realisticke-vyzvy`, pracovní strom čistý.
- `.claude/worktrees/keen-hertz-337295`: čistá kopie na `487f903`.
- `.claude/worktrees/pensive-noyce-90ed02`: čistá kopie na `f51b87f`.

## Před každým úklidem

Nejdřív znovu ověř `git worktree list`, stav a rozdíly všech kopií. Zachovej necommitnuté změny; tento přehled aktualizuj po dokončení, sloučení nebo vědomém opuštění práce.
