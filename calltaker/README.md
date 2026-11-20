# Calltaker – textový spike (krok 1)

Ty jsi calltaker, AI hraje volajícího. Případ (adresa, pacient, příznaky, vztah volajícího) vyrábí generátor simulátoru; AI volající z něj zná jen to, co by znal člověk v dané situaci. Po hovoru vyplníš formulář (adresa, naléhavost) a dostaneš kontrolu pravidly a hodnocení soudce (calltaker + realismus volajícího).

Všechna data jsou generovaná. Do repa nepatří klíče ani skutečné přepisy hovorů (`calltaker/out/` je v `.gitignore`).

## Webová stránka (doporučeno, bez instalace)

Otevři soubor `calltaker/web/index.html` v prohlížeči (dvojklik, funguje na Windows, Macu i v telefonu). Vlož svůj **API klíč OpenAI** (platform.openai.com → API keys; ChatGPT předplatné API nezahrnuje), klikni „Načíst modely“, vyber model a „Nový hovor“. Klíč jde jen z prohlížeče na api.openai.com. Po hovoru vyplníš formulář, dostaneš hodnocení a můžeš stáhnout JSON s hovorem.

**Hlasový režim (výchozí):** OpenAI **GPT-Live** (`gpt-live-1`, `POST /v1/live/sessions`, WebRTC). Mluvíš do mikrofonu (nejlépe sluchátka s mikrofonem), volající odpovídá hlasem přes telefonní filtr (pásmo 320–3300 Hz, zkreslení, šum linky; lze vypnout). Přepis obou stran se skládá z `session.input_transcript.delta` a `session.output_transcript.delta`. Cena hlasu 0,05 $ za minutu. Čeština a český hlas nejsou v dokumentaci výslovně uvedené, je to potřeba vyzkoušet; hlas volajícího se volí podle pohlaví (výchozí `marin` / `cedar`, lze přepsat). Režim „Jen text“ zůstává pro srovnání.

**Nahrávka (WAV):** po ukončení hovoru se ve formuláři objeví „Stáhnout WAV“. Stereo 24 kHz, 16 bit: oba hlasy (calltaker i volající) jsou smíchané dohromady a stejně v levém i pravém kanálu, oba po telefonním filtru (pokud je zapnutý). Zhruba 6 MB na minutu. Nahrává se jen lokálně v prohlížeči; vypnout jde zaškrtávátkem v nastavení.

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

Vyžaduje Node 18+. Volitelně `CALLTAKER_MODEL` (volající) a `CALLTAKER_ANALYZA_MODEL` (analýza hovoru).

Konec hovoru: napiš `/konec` nebo ho ukončí volající (`[KONEC]`). Přepis, formulář a hodnocení se uloží do `calltaker/out/`.

## Soubory

- `factsheet.js` – z `Sim._spawn()` vyrobí `view` (co ví volající) a `key` (správná odpověď).
- `personas.js` – typy volajících a ovladače stres / spolupráce / znalost adresy; skládá persona z níže uvedených modulů (vlastní deterministické proudy podle seedu, takže typ a stres u stávajících seedů zůstávají).
- `okolnosti.js` – okolnosti hovoru jako kombinovatelný systém MÍSTO × AKUSTIKA × PROJEV (+ počasí jen z dat hry): podmístnost („kde přesně stojí“), podmínky slyšitelnosti včetně častého „nic zvláštního“ a způsob projevu (většinou žádný, jindy jen pozadí, krátká změna hlasu, jedna přeslechnutá otázka). Vítr a déšť jen tehdy, když jsou v datech hovoru, volající je venku a je ho slyšet; i pak zřídka.
- `reci.js` – variabilita řeči: začátek hovoru, 1 až 3 tvary řeči (stručně, váhavě, opravuje se, přeslechne, odpovídá nepřímo…), výplňová slova podle věku, délka odpovědí, označení pacienta podle vztahu, projevy stresu a varianty pokynů k adrese, spolupráci a sluchu.
- `okoli.js` – orientace volajícího v místě z mapových dat (adresní body, silniční síť, POI): nejbližší a hlášená obec, trasa po silnici (obce na trase a odbočky v pořadí, vlevo/vpravo, směr jízdy, co si volající z cesty pamatuje) a orientační body („u místa“ = vidí, „poblíž“ = nejistě). Vrací `view.okoli` s pevnými fakty a hotovým textem pro prompt.
- `lokace.js` – poloha v hovoru: kde je pacient, odkud volající telefonuje, co o místě ví a odkud to ví. Scénáře: adresa (podle znalosti volajícího), návštěva (adresa ve zprávě), příbuzný volá odjinud (AML patří jeho telefonu), podnik z mapy (název, ulice, stejnojmenné pobočky), silnice (poslední obec a cíl po ověřené trase, minuté odbočky), terén (výchozí bod, čas, zůstali na cestě), druhý svědek zdálky. Každý údaj má pravidlo odhalení: řekne hned, nebo až na dotaz na téma a způsobem „podívá se, přečte ceduli, otevře mapu v mobilu, otevře zprávu“; co neví, neví. Pravda pro ověření je v `key.lokace`. `zjisti()` je pravidlový volající pro testy (`tests/calltaker_lokace_test.js`, přehled rozhovorů v `docs/OVERENI_LOKACE.md`).
- `prompts.js` – prompt volajícího a soudce; vkládá okolnosti, řeč a blok „Orientace v místě“ z persony a `view.okoli`.
- `llm.js` – klient API; `analyza.js` – kontrola formuláře pravidly + analýza hovoru.
- `chat.js` – příkazová řádka.

## Co se má ověřit (cíl spiku)

1. Působí volající jako skutečný člověk, nebo jako ochotný asistent?
2. Drží se listu faktů celý hovor (adresa, věk, stav)?
3. Jsou typy volajících dost různé a zábavné?
4. Souhlasí hodnocení soudce s úsudkem zkušeného calltakera?
