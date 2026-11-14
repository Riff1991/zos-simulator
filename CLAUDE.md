# Pokyny pro Claude Code v tomto repozitáři

Před prací si přečti, v tomto pořadí:
1. `AGENTS.md` – tvrdá pravidla projektu (data, verze, vydání, kontroly).
2. `docs/HANDOFF.md` – architektura a doménová rozhodnutí.
3. `docs/OTAZKY.md` – otevřené otázky a odpovědi uživatele (vlastníka projektu).
4. Poslední sekci `CHANGELOG.md`, abys věděl, co je aktuálně ve hře.

## Jak spolupracovat

- Komunikuj **česky** a stručně. Uživatel často čte z mobilu.
- Nové věci nejdřív zapiš do `docs/OTAZKY.md`, až potom implementuj.
- Práce probíhá na větvi `dev` (verze `X.Y.Z-dev`). **Na `main` se nic nemerguje ani nepushuje bez výslovného schválení uživatelem.**
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
