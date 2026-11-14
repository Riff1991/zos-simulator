# Pokyny pro Claude Code v tomto repozitáři

Před prací si přečti, v tomto pořadí:
1. `AGENTS.md` – tvrdá pravidla projektu (data, verze, vydání, kontroly).
2. `docs/HANDOFF.md` – architektura a doménová rozhodnutí.
3. `docs/OTAZKY.md` – otevřené otázky a odpovědi uživatele (vlastníka projektu).
4. Poslední sekci `CHANGELOG.md`, abys věděl, co je aktuálně ve hře.

## Jak spolupracovat

- Komunikuj **česky** a stručně. Uživatel často čte z mobilu.
- Nové věci nejdřív zapiš do `docs/OTAZKY.md`, až potom implementuj.
- Uživatel rozhodl, že se pushuje rovnou do `main` (bez větve `dev`). Změny a vydání se pushují přímo na `main`, jakmile je uživatel schválí.
- Každá změna, kterou hráč uvidí, dostane záznam v `CHANGELOG.md`.
- Nikdy necommituj reálná data z xls, osobní údaje ani e-maily z dispečinku (viz `AGENTS.md`).
- Medicínská a dispečerská pravidla v `src/data.js` neměň bez potvrzení uživatele.

## Před každým commitem spusť

```
npm run lint
node tests/test.js
node tests/content_audit.js
python3 build.py
```

Pokud je potřeba prohlížeč, spusť lokální server (`python3 -m http.server -d site 8765`) a `python3 tests/browser_smoke.py`.

## Ostré vydání (jen na pokyn uživatele)

Až uživatel řekne „pushni do ostré“, a jen tehdy: merge `dev` do `main`, `VERSION` bez `-dev`, sekce v `CHANGELOG.md`, push na `main`. Tagy ručně nepushuj.

## Způsob práce

- Před změnou najdi relevantní kód (grep) a změň co nejméně.
- Před úpravou napiš plán ve 2–3 větách.
- Když zadání není jednoznačné, zeptej se jednou, s konkrétními volbami.
- Po změně ukaž konkrétní výstup, ne jen „je to hotové“.
- Neposílej na `main` nic, co uživatel neviděl a neschválil.
- Průběžně nekomentuj každý krok.
- Rozhodnutí o formátu nebo chování zapiš do `docs/OTAZKY.md`.
