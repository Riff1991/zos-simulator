# AI práce, Git a vydání

Tento soubor drží praktický postup. `docs/AI-STATUS.md` je krátký průběžný přehled rozpracovaných kopií. Chat není zdroj pravdy pro stav souborů ani nasazení; vždy jej ověř v Gitu a GitHub Actions.

## Jeden úkol, jedna pracovní kopie

- Kanonický repozitář je `C:\ZOS simulator\zos-simulator`. Ostatní adresáře jsou worktree téhož Gitu, ne nezávislé projekty.
- Každá samostatná funkce nebo chyba má jeden jasný úkol a jednu určenou větev/worktree. Jednotlivé malé opravy spoj, pokud patří do stejného toku a lze je společně zkontrolovat. Nedělej novou konverzaci pro každý drobný commit; nový chat založ pro jiný cíl nebo když starý kontext přestal být užitečný.
- Před prací zkontroluj `git worktree list`, `git status --short --branch`, `git log -1` a porovnání s odpovídající `origin/*`. Nepracuj v zastaralé nebo špinavé kopii, dokud není jasné, komu změny patří.
- Claude Code a Codex mohou pracovat na stejném počítači, ale ne současně ve stejných souborech. Souběžná práce patří do oddělených worktree a větví. Před předáním napiš do `docs/AI-STATUS.md` větev, cestu, cíl, rozpracované soubory a co čeká dál. Po dokončení svůj řádek aktualizuj nebo odstraň.
- Změny v worktree se neslučují ručně kopírováním souborů. Zachovej je v jejich větvi a integruj přes Git až po kontrole rozdílů. Nikdy automaticky nemaž worktree ani větev s necommitnutými nebo nepushnutými změnami.

## Jednoduchý tok změny

1. Vyber aktuální základ z GitHubu a ověř, že místní kopie není pozadu. Pokud je pracovní strom špinavý, nejprve zjisti původ změn.
2. Udělej ucelenou opravu ve vyhrazeném worktree. Změny hráčem viditelného chování zaznamenej v `CHANGELOG.md`; buildni `site/` podle `AGENTS.md`.
3. Proveď relevantní kontroly a shrň uživateli, co změna dělá, kde je a co prošlo. Commit je vhodný po dokončené a ověřené jednotce práce.
4. `main` je ostrá větev. Projekt používá GitHub Pages: `main` míří na hlavní web a `dev` na testovací web `/dev/`. Výchozí postup je pracovat izolovaně a do `main` integrovat až hotovou a zkontrolovanou změnu. `dev` použij jen pokud je třeba uživateli ukázat testovací web nebo o to výslovně požádá.
5. Push na GitHub a nasazení jsou různé kroky: push spouští CI; Pages se nasadí po úspěšných kontrolách. Změna `VERSION` na `main` může spustit i vytvoření GitHub Release a balíčku pro Mac. Verzi proto neměň jen kvůli lokálnímu testu.
6. Commit, push, merge do `main`, změna verze a vydání prováděj jen v rozsahu, který uživatel výslovně zadal. Bez takového pokynu připrav a zkontroluj změny lokálně.

## Co se zapisuje kam

- Trvalá pravidla projektu: `AGENTS.md`.
- Podrobnosti simulace a již přijatá doménová rozhodnutí: `docs/HANDOFF.md` a `docs/OTAZKY.md`. Do otázek přidávej pouze skutečně nerozhodnuté věci, ne nové ankety pro celý starý seznam.
- Aktuální Git kopie a předání práce: `docs/AI-STATUS.md`.
- Průběh hráčem viditelných změn: `CHANGELOG.md`.
- Chaty obsahují jen aktuální úkol a stručné předání; nepřekopírovávej do nich celé handoffy ani staré konverzace.
