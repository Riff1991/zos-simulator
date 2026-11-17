# Formát souboru pavouka (`spider.json`, formát `zos-spider/1`)

Skutečný pavouk se do režimu calltaker vkládá souborem `spider.json` v kořeni webu (vedle `index.html`). Pokud soubor existuje a je platný, nahradí datový pavouk (náhradu řízenou daty z exportů výjezdů). Změna kódu není potřeba. Soubor se načte při spuštění směny calltakera, při chybě se ukáže hláška a běží datový pavouk.

## Struktura

```json
{
  "format": "zos-spider/1",
  "start": "uvod",
  "nodes": {
    "uvod": {
      "title": "Co se stalo?",
      "tiles": [
        { "id": "dn", "label": "Dopravní nehoda", "hint": "auto, motorka, chodec", "group": "Úraz", "next": "dn_vedomi" },
        { "id": "dusnost", "label": "Dušnost", "next": "dusnost_veta" }
      ]
    },
    "dn_vedomi": {
      "title": "Je pacient při vědomí?",
      "tiles": [
        { "id": "ano", "label": "Při vědomí", "priznak": ["při vědomí"], "next": "vysl_dn_n2" },
        { "id": "ne", "label": "Bezvědomí", "priznak": ["bezvědomí"], "next": "vysl_dn_n1" }
      ]
    },
    "vysl_dn_n1": { "result": { "klasif": "Dopravní nehoda", "n": 1, "dyn": false, "priznaky": ["Dopravní nehoda"], "confidence": 1 } },
    "vysl_dn_n2": { "result": { "klasif": "Dopravní nehoda", "n": 2, "dyn": true, "priznaky": ["Dopravní nehoda"], "nDist": { "1": 0.1, "2": 0.7, "3": 0.2 } } }
  }
}
```

- `start` je id uzlu, kterým pavouk začíná. Každý uzel je buď **otázka** (`tiles`), nebo **výsledek** (`result`).
- Dlaždice: `id` (jedinečné v uzlu), `label` (text), `hint` (nepovinný popisek), `group` (nepovinný nadpis skupiny dlaždic), `weight` (nepovinné řazení), `next` (id dalšího uzlu), `priznak` (nepovinné: příznak nebo pole příznaků, které se k výsledku přidá při volbě této dlaždice).
- Výsledek: `klasif` (název indikace, shodný s klasifikací v datech výjezdů, např. `Dopravní nehoda`), `n` (1 až 3), `dyn` (dynamická indikace), `priznaky` (pole názvů příznaků; s prefixem skupiny jako v `src/symptoms.json`, ať se dobře porovnávají), `nDist` (nepovinné rozložení `{1,2,3}`), `confidence` (nepovinná jistota 0 až 1).
- Po kliknutí na dlaždici se hned zobrazí další uzel. Drobečková navigace, Zpět a Znovu fungují stejně jako u datového pavouka. Výsledek lze v okně ručně přepsat (N, dynamická).

## Napojení

- Modul: `calltaker/spider.js` (`createFromTree(strom)` vrací stejné rozhraní jako `create(data)`: `page(odpovědi)`, `result(odpovědi)`, `indikace()`).
- Ukázkový soubor pro test: `tests/spider_sample.json`. Test: `node tests/spider_test.js`.
