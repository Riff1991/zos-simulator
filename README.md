# ZOS JčK – simulátor dispečera

Webová hra: hráč je **primární dispečer** zdravotnického operačního střediska ZZS Jihočeského kraje. Calltaker (simulovaný) nabírá výzvy, hráč vysílá posádky (RZP, RV, LZS, MU, zálohy), sleduje je na mapě a v rádiu a je hodnocen za včasnost, dojezd, správné nasazení lékaře, volbu nejbližší posádky a pokrytí území.

- Režimy: **směna 12 h** (časově zrychlená, čistý nebo rozjetý start, skóre a vyhodnocení) a **volný režim**.
- Reálná síť základen a počty posádek (den/noc), reálné nemocnice, **plná mapa OpenStreetMap** (vlastní vektorové dlaždice, MapLibre), posádky jezdí **po skutečných silnicích** (vlastní router), případy na **skutečných adresách** z OSM. Případy, osoby a telefony jsou vymyšlené.
- Rozhraní napodobuje monitory dispečera: seznam případů („Dispečer ZZS“), panel vybraného případu s návrhem posádek a ETA, přehledový panel posádek (dlaždice dle oblastí, barvy stavů), mapa, rádio, tisk „Výzva k výjezdu“. Dlaždici posádky lze přetáhnout na případ (vyslání / přesměrování).

## Hrát / nainstalovat (doporučeno)

**https://riff1991.github.io/zos-simulator/** – hra běží v prohlížeči a dá se nainstalovat jako aplikace. Aktualizuje se sama a funguje i offline.

- **Windows / Mac – Chrome nebo Edge:** ikona instalace v adresním řádku, nebo tlačítko „Nainstalovat jako aplikaci“ na úvodní obrazovce hry.
- **Mac – Safari:** Soubor → Přidat do Docku.
- **iPhone / iPad:** Safari → Sdílet → Přidat na plochu. **Android:** Chrome → Nainstalovat aplikaci.

## Stažení offline balíčku (Mac)

Nejnovější balíček pro Mac je v **[Releases](../../releases/latest)** (`zos-simulator-mac-vX.Y.Z.zip`). Návod je v `README-MAC.txt` v balíčku. Co je nového, najdeš v [CHANGELOG.md](CHANGELOG.md).

## Vydání nové verze

1. Změny v `src/`, pak `python3 build.py` (výstup `site/` je v repozitáři).
2. Ladí se na větvi `dev` (verze `X.Y.Z-dev`, testovací web …/zos-simulator/dev/).
3. Při vydání: merge do `main`, v `VERSION` číslo bez `-dev` (např. `0.15.0`), sekce v `CHANGELOG.md` (`## v0.15.0 – datum`).
4. Push na `main` → Kontroly, nasazení webu a automaticky tag `v0.15.0` + Release se ZIPem pro Mac.

Číslování: `hlavní.menší.oprava` – `0.15.1` drobná oprava, `0.16.0` další várka, `1.0.0` oficiální vydání.

Lokálně lze balíček sestavit `bash packaging/build_mac.sh` → `dist/`.

## Rychlý start

```bash
node tests/test.js                      # test simulace
python3 build.py                        # sestaví site/index.html ze src/
python3 -m http.server -d site 8765     # http://localhost:8765
```

Nasazení = nahrát obsah `site/` na libovolný statický hosting (nutné HTTP, ne file://). Do teď byla hra publikovaná jako artefakt na claude.ai – viz omezení v `docs/HANDOFF.md`.

Další informace: `docs/HANDOFF.md` (architektura, pravidla), `docs/OTAZKY.md` (co je potřeba upřesnit), `AGENTS.md` (pokyny pro AI agenta).

Mapová data © přispěvatelé OpenStreetMap (ODbL). MapLibre GL JS (BSD-3).
