# Calltaker – textový spike (krok 1)

Ty jsi calltaker, AI hraje volajícího. Případ (adresa, pacient, příznaky, vztah volajícího) vyrábí generátor simulátoru; AI volající z něj zná jen to, co by znal člověk v dané situaci. Po hovoru vyplníš formulář (adresa, naléhavost) a dostaneš kontrolu pravidly a hodnocení soudce (calltaker + realismus volajícího).

Všechna data jsou generovaná. Do repa nepatří klíče ani skutečné přepisy hovorů (`calltaker/out/` je v `.gitignore`).

## Spuštění

```bash
export ANTHROPIC_API_KEY=...        # klíč nikdy necommitovat ani nepsat do chatu
node calltaker/chat.js              # náhodný případ
node calltaker/chat.js 42           # stejný případ znovu (seed)
node calltaker/chat.js 42 --dry     # jen vypíše prompt volajícího a správnou odpověď, bez API
node calltaker/factsheet.js 42      # jen list faktů
```

Vyžaduje Node 18+. Volitelně `CALLTAKER_MODEL` (volající) a `CALLTAKER_JUDGE_MODEL` (soudce).

Konec hovoru: napiš `/konec` nebo ho ukončí volající (`[KONEC]`). Přepis, formulář a hodnocení se uloží do `calltaker/out/`.

## Soubory

- `factsheet.js` – z `Sim._spawn()` vyrobí `view` (co ví volající) a `key` (správná odpověď).
- `personas.js` – 10 typů volajících a ovladače stres / spolupráce / znalost adresy.
- `prompts.js` – prompt volajícího a soudce.
- `llm.js` – klient API; `judge.js` – kontrola formuláře pravidly + soudce.
- `chat.js` – příkazová řádka.

## Co se má ověřit (cíl spiku)

1. Působí volající jako skutečný člověk, nebo jako ochotný asistent?
2. Drží se listu faktů celý hovor (adresa, věk, stav)?
3. Jsou typy volajících dost různé a zábavné?
4. Souhlasí hodnocení soudce s úsudkem zkušeného calltakera?
