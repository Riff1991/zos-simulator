# Pokyny pro AI agenty

Projekt: webový simulátor práce primárního dispečera ZOS ZZS Jihočeského kraje. Je to hra, ne nástroj pro ostrý provoz. Vlastník projektu je také doménový expert. Komunikuj česky a stručně.

## Zásady projektu

- Do repozitáře nepatří skutečné osobní údaje, pacientská data, e-maily ani výpisy z dispečinku. Používej jen strukturu polí a fiktivní údaje.
- Nepoužívej loga ani názvy reálného dispečerského softwaru.
- Pravidla v `src/data.js → indications` jsou ukázková. Neměň medicínská ani dispečerská pravidla bez rozhodnutí uživatele.
- Simulace musí zůstat deterministická pro daný seed a stav `sim.s` musí být čistý JSON kvůli ukládání a obnově.
- Mapová data OpenStreetMap vyžadují viditelnou atribuci „© přispěvatelé OpenStreetMap“.

## Kontext a rozhodování

- Začni kontrolou kořene repozitáře, větve, `git status` a posledního commitu. Řiď se `docs/AI-WORKFLOW.md`.
- Čti jen kontext potřebný pro úkol. `README.md`, `docs/HANDOFF.md` a `docs/OTAZKY.md` nejsou povinná četba při každé drobné opravě; otevři relevantní části, když úkol závisí na architektuře či doménovém rozhodnutí.
- Neopakuj otázky, na které už uživatel odpověděl. Ptej se jen tehdy, když nevyřešené rozhodnutí mění chování simulace nebo výsledek není bezpečné odhadnout.
- Jeden chat věnuj jednomu ucelenému úkolu. Související drobné opravy můžeš spojit; nesouvisející funkce řeš odděleně. Stav předávej stručným zápisem, ne kopírováním celé historie chatu.
- Zachovej cizí a rozpracované změny. Nepřepisuj, nemaž ani neslučuj cizí worktree nebo větev, dokud neověříš její stav a určení.

## Verze, změny a nasazení

- Zdrojový kód je v `src/`; `site/` obsahuje nasaditelný výstup. Po změnách zdrojů spusť `python3 build.py` a zahrň odpovídající vygenerované soubory.
- Každou hráčem viditelnou změnu popiš stručně v `CHANGELOG.md`. Verzi zvyšuj jen jako součást připraveného vydání, ne u každého lokálního pokusu.
- Commit uloží změnu do Gitu; push ji odešle na GitHub; nasazení webu probíhá automaticky přes GitHub Actions po úspěšných kontrolách. Změna `VERSION` na `main` může navíc spustit balíček a GitHub Release. Tyto kroky nejsou totéž.
- `main` je ostrý web, `dev` je testovací web (`/dev/`). Aktuální pracovní postup a stav jednotlivých kopií jsou v `docs/AI-WORKFLOW.md`; nejdřív ověř Git, nespoléhej na verzi z chatu nebo ze souboru v jiné kopii.
- Bez výslovného pokynu uživatele necommituj, nepushuj, neměň `VERSION`, nevydávej a nenasazuj.

## Kontroly

Spusť kontroly odpovídající rozsahu změny. Před odevzdáním změn v enginu nebo obsahu:

```sh
npm run lint
node tests/test.js
node tests/content_audit.js
python3 build.py
```

U změn UI/mapy přidej `python3 tests/browser_smoke.py` nad lokálním serverem (`python3 -m http.server -d site 8765`). Pokud kontrolu nelze spustit, uveď to; nevydávej ji za úspěšnou.
