# Kalibrace podle reálných výjezdů – analytické skripty

Skripty, ze kterých vznikly tabulky v `src/data.js` (`indCal`, `whereCal`, `placeModel`, `obecMul`, `EV_HOUR`, `ageChildQ`, `rvSceneQ`) a měření hry proti realitě.
**Surová data (exporty „Seznam výjezdů“ .xls) se nikdy necommitují**; `work/` je v `.gitignore`.

Příprava (z kořene repa; `pip install pandas xlrd`):
```bash
mkdir -p work/stat
python3 -I tools/kalibrace/load.py leden.xls cervenec.xls     # → work/stat/all2.pkl
```
Export: Statistické zpracování výjezdů → Seznam záznamů o výjezdu → Excel, podmínky: Čas výzvy mezi (měsíc), Zahrnout do statistik = proběhl, Typ výjezdu = primár.
Sloupce (v pořadí nabídky): Číslo výzvy, Naléhavost, Asistovaná pomoc, Indikace ZOS, Charakter ZOS, Poznámka ZOS, Místo zásahu - popis, Marný výjezd, Zahrnout do statistik, Typ výjezdu,
Komplikace výjezdu, Odmítnutí převzetí v ZZ, Výjezd do zařízení sociální péče, Zneužití ZZS, Výjezd koronera, všech 10 časů, Pohlaví, Věk, Volací znak, Typ posádky, Typ vozidla, RV, Výjezdová skupina,
Stanoviště, Středisko, Oblast, Kraj, Okres, Obec, Směrování, Zařízení, Oddělení, NACA, Indikace, Nejzávažnější stav, Typ zranění, Stav vědomí, Způsob ukončení, Přeshraniční a Mezikrajská spolupráce,
LZS sloupce, KPR proběhla, Výsledek KPR, Příznaky události, Výjezd první posádky u události, Kód dopr. výk., Km.

Analýzy (spouštět z `work/stat`, např. `cd work/stat && python3 -I ../../tools/kalibrace/mkcal.py`):
- `mkcal.py` – kalibrace po indikacích → `cal.json` (váhy, N, dynamická, lékař, věk, pohlaví, čas na místě, převoz).
- `dow.py` – profil po hodinách (pracovní den / víkend, zima / léto) → `dowhour.json`.
- `geo3.py` – násobky obcí (reálný podíl událostí / podíl adres) → `obecmul.json` (po změně `site/addr.json` spustit znovu!).
- `plc3.py`, `plc4.py` – model popisu místa a poznámky ZOS (segmenty, soukromí: fráze s četností < 4 a vlastní jména se vyřazují) → `placemodel.js`.
Měření hry (z kořene repa, `node tools/kalibrace/<soubor>.js`): `vol.js` (objem), `where.js` a `towns.js` (typ místa, obce), `timing.js` (časy fází s botem).

Poznámka: `plc3.py`/`mkcal.py` čtou `all2.pkl`; texty z `Poznámka ZOS` obsahují volný text calltakerů – před přenesením do `data.js` vždy ručně projít (jména, adresy).
