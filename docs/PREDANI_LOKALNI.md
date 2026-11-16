# Předání práce z cloudové relace do lokální relace (16. 11. 2026)

Cloudová relace „Vylepšení zos-simulator“ běžela bez přístupu k tvému počítači a bez internetu mimo balíčky. Tady je přesný stav, ať lokální relace naváže.

## Větve a verze
- `main` = **v0.29.2** (vydáno z cloudu: týdenní plán směn „RV Dačice po–út mimo provoz“ + rozdělení `engine.js` na `engine-base.js`, `engine.js`, `sim-*.js` a `ui.js` na `ui-*.js`; viz `AGENTS.md` → Struktura).
- `claude/realisticke-vyzvy` (pushnuto, **neslito do `main`**, bez záznamu v `CHANGELOG.md`): kalibrace výzev podle reálných dat (leden + červenec 2026), hustota podle obcí, profil pracovní den / víkend, CMP bez dynamické, skript `pipeline/addr_full.py` (**zatím nevyzkoušený**), `tools/kalibrace/`, dokumentace v `docs/OTAZKY.md` (sekce „Kalibrace podle reálných výjezdů“, „Výsledek kalibrace“, „Hustota výjezdů…“, „Rozšíření databáze adres“).
- **Pozor, kolize verzí:** lokální relace „MU“ čekala na „pushni“ pro vydání **v0.29.2** (oprava „N1 se vždy převáží“, neodevzdáno). Verze 0.29.2 už je z cloudu vydaná. Před pushem si udělej `git pull --rebase origin main`, vyřeš konflikty (`CHANGELOG.md`, `VERSION`, `src/*`, `site/*`) a vydej jako **0.29.3** (nebo spolu s kalibrací jako 0.30.0). `site/index.html` po sloučení vždy znovu `python3 build.py`.

## Co je hotové na větvi `claude/realisticke-vyzvy`
1. Objem událostí podle hodiny, ročního období a typu dne (`EV_HOUR`); Klidné ×0,85 / Běžné ×1 / Nálož ×1,25.
2. Indikace (`ZOS_DATA.indCal`): váhy, N, dynamická indikace jen u N2 (u CMP ne), lékař, věk (kvantily), pohlaví, čas na místě (lognormálně), převoz. CMP N2 jede RZP sama.
3. Typ místa (`whereCal`), popis místa + poznámka ZOS ze skutečných segmentů (`placeModel`, `tailMix`, `_tail`), hustota podle obcí (`obecMul`, `_randomAddress1`), prodlevy výjezdu, čas na místě, transport.
4. Testy a audit upraveny (`tests/test.js` blok „Kalibrace…“, `tests/content_audit.js` cíle), všechno prošlo.

## Co zbývá (v tomto pořadí navrhuju)
1. **Rozšířit adresy** (zadání: násobně víc po celém kraji). Příčina nízkého počtu: `pipeline/addr.py` zahazuje adresní body bez `addr:city` a vyžaduje externí polygony okresů. Postup na lokálním počítači (má internet, stačí soubor `jihocesky-latest.osm.pbf` ~94 MB z Geofabriku):
   ```bash
   mkdir -p work && cp /cesta/jihocesky-latest.osm.pbf work/jihocesky.osm.pbf
   pip install osmium shapely
   python3 pipeline/addr_full.py work/jihocesky.osm.pbf     # → site/addr.json, work/out/addr_report.txt
   ```
   Pak: porovnat počty (dnes 174 935 adres, 615 obcí; Milevsko 25, Bernartice/Zálezly/Bošice/Hrejkovice 0), zkontrolovat velikost `site/addr.json` (dnes 6,3 MB; limit hostingu viz `docs/HANDOFF.md`), **přepočítat `ZOS_DATA.obecMul`** (`tools/kalibrace/geo3.py`, potřebuje exporty výjezdů; bez nich nechat, násobky platí jen přibližně) a spustit kontroly. `addr_full.py` je psaný naslepo: ověřit, že funguje `area()` pro hranice (admin_level 7 a 8) a že okres vychází správně; případně opravit.
2. **Žádosti sousedních krajů o naše posádky** (zadání v `docs/OTAZKY.md` → „Mezikrajská a přeshraniční spolupráce“, krok 2).
3. Vydání kalibrace: sloučit větev do `main`, záznam `## v0.30.0 – datum` v `CHANGELOG.md`, `VERSION`, `python3 build.py`, push (až na pokyn „pushni do ostré“).
4. Drobnosti: podíl dětí (hra 6 %, skutečnost 8,4 %), sekundární převozy (v exportu nebyly), `Zpoždění výjezdu` – s reálnou prodlevou překročí 2 min asi čtvrtina výjezdů (častější upozornění).

## Pravidla a zvyklosti
- `CLAUDE.md` a `AGENTS.md` platí (česky, stručně, nejdřív zápis do `docs/OTAZKY.md`, před commitem `npm run lint`, `node tests/test.js` (~4 min), `node tests/content_audit.js`, `python3 build.py`, push na `main` jen se souhlasem).
- Testy závisí na seedech: změna pořadí losování může rozbít scénářové testy. Pevné scénáře: `_spawn({ ind, n, dyn, script: { escort: false } })`, datum nastavit v `new Sim({ date })`.
- **Žádná surová data** (exporty, texty z poznámek) do repozitáře. Surové exporty zůstaly jen v dočasné složce cloudové relace; na lokálním počítači je máš jako `.xls` (`tools/kalibrace/README.md` popisuje načtení).
- Stop hooky v cloudové relaci hlásily „nepushnuté commity“ jako falešný poplach (mělký klon nevytváří lokální odkaz); v lokální relaci se nevyskytnou.
