# Calltaker – textový spike (krok 1)

Ty jsi calltaker, AI hraje volajícího. Případ (adresa, pacient, příznaky, vztah volajícího) vyrábí generátor simulátoru; AI volající z něj zná jen to, co by znal člověk v dané situaci. Po hovoru vyplníš formulář (adresa, naléhavost) a dostaneš kontrolu pravidly a hodnocení soudce (calltaker + realismus volajícího).

Všechna data jsou generovaná. Do repa nepatří klíče ani skutečné přepisy hovorů (`calltaker/out/` je v `.gitignore`).

## Webová stránka (doporučeno, bez instalace)

Otevři soubor `calltaker/web/index.html` v prohlížeči (dvojklik, funguje na Windows, Macu i v telefonu). Vlož svůj **API klíč OpenAI** (platform.openai.com → API keys; ChatGPT předplatné API nezahrnuje), klikni „Načíst modely“, vyber model a „Nový hovor“. Klíč jde jen z prohlížeče na api.openai.com. Po hovoru vyplníš formulář, dostaneš hodnocení a můžeš stáhnout JSON s hovorem.

**Hlasový režim (výchozí):** OpenAI **GPT-Live** (`gpt-live-1`, `POST /v1/live/sessions`, WebRTC). Mluvíš do mikrofonu (nejlépe sluchátka s mikrofonem), volající odpovídá hlasem přes telefonní filtr (pásmo 320–3300 Hz, zkreslení, šum linky; lze vypnout). Přepis obou stran se skládá z `session.input_transcript.delta` a `session.output_transcript.delta`. Cena hlasu 0,05 $ za minutu. Čeština a český hlas nejsou v dokumentaci výslovně uvedené, je to potřeba vyzkoušet; hlas volajícího se volí podle pohlaví (výchozí `marin` / `cedar`, lze přepsat). Režim „Jen text“ zůstává pro srovnání.

**Nahrávka (WAV):** po ukončení hovoru se ve formuláři objeví „Stáhnout WAV“. Stereo 24 kHz, 16 bit: levý kanál calltaker (mikrofon), pravý volající tak, jak ho slyšíš (po telefonním filtru). Zhruba 6 MB na minutu. Nahrává se jen lokálně v prohlížeči; vypnout jde zaškrtávátkem v nastavení.

Přegenerování: `node calltaker/build_cases.js 200 && node calltaker/build_web.js` (případy z generátoru → `web/cases.js` → samostatný `web/index.html`).

## Příkazová řádka (Anthropic)

Alternativa pro vývoj (Node 18+, klíč Anthropic):

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
