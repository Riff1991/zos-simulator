# ZOS simulátor: audit, plán vylepšení a nasazení online

Stav k 13. 11. 2026. Podkladem je verze z Codexu s opravou mapy z Claude. Audit obsahu proběhl nad 6 vygenerovanými směnami (600 výzev, seedy 11–16, denní i noční).

---

## 1. Audit obsahu: co je teď špatně

| # | Problém | Rozsah v auditu | Příklad | Návrh opravy |
|---|---|---|---|---|
| 1 | **Ženské jméno + mužské příjmení** u oznamovatele i členů posádek | 587 z 600 výzev obsahuje aspoň jedno takové jméno | „Petra Kučera“, „Alena Růžička“, „Lucie Svoboda“ | Generátor osob s pohlavím a párovými tvary příjmení (viz 2.1) |
| 2 | **Jméno pacienta v tisku výzvy** ignoruje pohlaví a ženský tvar tvoří přilepením „ová“ | každý tisk | „Černýová“, „Svobodaová“, „Sedláčekov á“, „Nováková Petr“ | stejný generátor, jméno pacienta ukládat do stavu případu |
| 3 | **Malá zásoba jmen** (20 × 20) | 299 různých oznamovatelů na 600 výzev | stejní lidé volají opakovaně | ~120 příjmení podle četnosti v ČR, ~80 křestních jmen podle ročníku a pohlaví |
| 4 | **Domov pro seniory příliš často a u mladých** | 19 % všech výzev; 61 pacientů pod 60 let v DpS | „32 let, muž, domov pro seniory, pokoj“ | místo volit podle věku a indikace (DpS jen 70+, s výjimkami) |
| 5 | **Malé děti na nevhodných místech** | 4 | 0–3leté dítě „provozovna“, „škola, učebna“ | místo podle věku (0–5: domov, školka, ulice s rodičem) |
| 6 | **„DYNAMICKÁ INDIKACE“ zůstane po eskalaci na N1** | 65 výzev ve směnách bez vysílání | N1 Dušnost „…, DYNAMICKÁ INDIKACE“ | při eskalaci upravit upřesnění (odebrat DYN, přidat „zhoršení stavu“) |
| 7 | **Dynamická N2 bez štítku DYNAMICKÁ INDIKACE** | 3 | Psychiatrické stavy „:Suicidální pokus závažný…“ | sjednotit příznak a stav `dyn` |
| 8 | **Protichůdné nebo zdvojené příznaky** | 1 | „_Dušnost, nemůže mluvit, _Dušnost, schopen říci pouze slovo“ | v katalogu příznaků definovat vzájemně vylučující se skupiny |
| 9 | **20 % míst bez diakritiky** („rodinny dum“) | záměr Codexu (napodobuje rychlé psaní calltakera) | – | ověřit u Vojty, jestli se to tak v realitě děje; jinak snížit na ~5 % |
| 10 | **Objem** ~100 výzev za 12 h | – | reálně ~122 výjezdů / 12 h (říjen) | zvednout základní intenzitu o ~20 % |
| 11 | **Věk v tisku výzvy** jako „NN let“ | každý tisk | v reálných datech calltaker píše většinou ročník (4 číslice) | 80 % ročník, 20 % „NN let“ |
| 12 | **Telefon** vždy `+420 999 …` | 100 % | v reálném systému bez +420 (např. „0723…“) | ponechat fiktivní rozsah 999 (v ČR nepřidělen), ale ve formátu systému: `0999 xxx xxx` |

Opraveno už dnes v Claude: klik na výzvu nepřesouval mapu (chybějící funkce `syncSelectionToMain`), mapa na mobilu měla nulovou výšku, nefungovaly ikony základen a LZS, zobrazovalo se „zbývá 704 h“. Nový test `tests/browser_smoke.py`.

Rozložení naléhavostí podle původní N sedí na realitu: N1 4 %, N2 33 %, N3 61 %, N4 2 % (realita 3 / 30 / 64 / 3 %). Medián věku 57 let, 9 % dětí.

---

## 2. Plán vylepšení (podle priority)

> **Stav 13. 11. večer:** P1 (2.1–2.4) je hotové včetně reálných míst z OSM, z P3 číslování oblastí a názvy skupin, z P4 ESLint a audit obsahu v testech. Viz `outputs/HANDOFF-CLAUDE.md`.

### P1: Věrohodnost obsahu (rychle, velký dojem)

**2.1 Generátor osob** (`src/people.js`):
- Pohlaví → křestní jméno podle **ročníku** (u 85leté „Marie, Jaroslava, Božena“, u 30leté „Tereza, Kristýna“), příjmení z párového seznamu: Novák/Nováková, Černý/Černá, Sedláček/Sedláčková, Němec/Němcová, Veselý/Veselá, Král/Králová…
- **Oznamovatel s vazbou na pacienta:** pacient sám, manžel/ka (stejné příjmení), syn/dcera, soused, personál DpS / školy / provozovny, kolemjdoucí, PČR, HZS, operátor 112. Vazba se objeví v poznámce: „volá dcera“.
- Jméno pacienta, oznamovatel i telefon se uloží do stavu případu (tisk, detail a rádio budou shodné).
- Členové posádek se generují jednou za směnu, ve tvaru „NOVÁKOVÁ J.“ jako v reálném tisku.

**2.2 Kontextový generátor místa:** pravděpodobnosti míst podle věkové skupiny × indikace × denní doby (provozovna jen ve všední den 6–18 h, škola jen 7:30–15 h ve školním roce, DpS převážně 75+, DN na silnici, popáleniny dětí doma).

**2.3 Konzistence upřesnění:** pravidla v katalogu příznaků (vylučující se dvojice, povinný štítek DYN u dynamické N2, při eskalaci přepsat). K tomu automatický „lint“ v testech: stejný audit jako tento, aby každá nová verze prošla bez chyb.

**2.4 Čísla podle reality:** intenzita +20 %, ranní špička 7–10 h, čtvrtek/pátek silnější, věk jako ročník.

### P2: Hratelnost

- **Tutoriál / první směna s nápovědou:** krátké provedení „vyber výzvu → Navrhnout posádku → přetáhni → sleduj“. Teď hráč bez vysvětlení nechápe skóre.
- **Obtížnosti a scénáře:** klidná noc, čtvrteční ráno, léto na Lipně (víc turistů, DN, tonutí), MU, výpadek základny. Scénář = seed + nastavení, sdílitelný odkazem (`#scenar-lipno`).
- **„Směna dne“:** stejný seed pro všechny hráče daný den. Bez serveru se dá porovnat jen sdílením výsledku, s backendem i žebříček (P5).
- **Vyhodnocení s reálnou referencí:** „tvůj medián dojezdu 9,1 min, reálná ZZS JčK 8,2 min, do 20 min: ty 91 %, realita 94,5 %“, k tomu přehled chyb (pozdě vyslaná N1, zbytečný lékař na N3, neodvolaná posádka).
- **Pauza / zpomalení při nové N1** (volitelné), aby si hráč na mobilu všiml.

### P3: Realismus provozu (podle reálných dat, potřebuje potvrzení od Vojty)

- Číslování oblastí podle systému: 1 ČB, 2 JH, 3 PI, 4 PT, 5 ST, 6 TA, 7 ČK, 11 LZS; názvy výjezdových skupin podle reality (`TA_RZP2`, `CB VLTAVA RZP`, `RV1`).
- Typ posádky RLP / flexRLP, LZS jen ve dne, odvolání letu.
- Sekundáry, vstřícná jízda, převoz z/do vrtulníku, technická jízda (část už je hotová).
- Nemocnice: kapacity, „stop příjmu“, avízo (frontline).
- Doprava: v noci rychlejší jízda, ve špičce ve městech pomalejší; v zimě sníh (volitelné).

### P4: Technický dluh

- **Rozdělit `ui.js` (1000 řádků) a `engine.js` (1500 řádků)** do modulů (případy, posádky, LZS, MU, skóre, mapa, rádio). Stále bez bundleru, přes `build.py`.
- **ESLint s pravidlem `no-undef`** by chybu `syncSelectionToMain` zachytil okamžitě. Přidat do testů.
- **CI na GitHubu (GitHub Actions):** `node tests/test.js` + `browser_smoke.py` + audit obsahu při každém pushi. Codex nebude moct odevzdat rozbitou verzi.
- **Service worker / PWA:** instalace na plochu mobilu, offline hraní, cache dlaždic (rychlejší druhé spuštění).
- Verze hry v patičce (např. `v0.13 · 2026-11-13`) a tlačítko „nahlásit chybu“, které zkopíruje seed, čas a verzi.

### P5: Komunita (až po spuštění)

- Žebříček „směna dne“: potřebuje malý backend (Cloudflare Workers + D1, zdarma v rozumném rozsahu). Proti podvodům pomůže deterministický engine: server přehraje záznam akcí se stejným seedem a skóre ověří.
- Sdílení výsledku obrázkem nebo odkazem.

---

## 3. Nasazení online

### 3.1 Doména

Návrhy (dostupnost jsem neověřoval, zkontroluj ve WHOIS na nic.cz nebo u registrátora):

| Doména | Poznámka |
|---|---|
| **zossimulator.cz** | tvůj návrh, krátké a jasné |
| dispecersimulator.cz / simulator-dispecera.cz | srozumitelné i laikům |
| hra155.cz / dispecink155.cz | 155 zná každý, dobré pro PR |
| zachrankasimulator.cz | lidové, dobře hledatelné |

**Doporučení:** nepoužívat v doméně „zzs“, „jck“ ani název kraje, aby web nepůsobil jako oficiální stránka ZZS JčK. Hodí se registrovat i variantu s pomlčkou a přesměrovat ji. Doména .cz stojí obvykle několik stovek Kč ročně, liší se podle registrátora. Pozor na akční cenu prvního roku, prodloužení bývá dražší.

### 3.2 Kde hostovat: srovnání

Hra je **čistě statický web** (~42 MB, 41 souborů, největší soubor 2,9 MB). Server ani databáze nejsou potřeba.

| Varianta | Cena | Plusy | Mínusy |
|---|---|---|---|
| **Cloudflare Pages** (doporučuji) | zdarma | bezplatný plán nemá žádný limit přenosu dat; globální CDN; nasazení z GitHubu při každém pushi; zdarma HTTPS a vlastní doména | limity 20 000 souborů na nasazení, 25 MiB na soubor. Hra je hluboko pod nimi |
| GitHub Pages | zdarma | jednoduché, přímo z repozitáře | publikovaný web nesmí být větší než 1 GB a má měkký limit přenosu 100 GB měsíčně; při ~10 MB na první návštěvu to dává zhruba 10 000 hráčů měsíčně |
| Home Assistant doma | jen elektřina | máš ho, plná kontrola | upload domácí linky, výpadky, údržba, bezpečnost (viz 3.3) |

### 3.3 Home Assistant: jde to, ale s rozmyslem

Nejbezpečnější cesta je **Cloudflare Tunnel** (add-on Cloudflared). Doma neotevíráš žádné porty a HTTPS řeší Cloudflare. Add-on umí kromě HA vystavit i další lokální službu na vlastní doménu. V konfiguraci se do pole „Additional Hosts“ přidá hostname a service: http://<IP>:<port>.

Postup:
1. Doménu převeď DNS na Cloudflare (zdarma, změna nameserverů u registrátora).
2. Na HA spusť **samostatný jednoduchý webový server** jen se složkou `site/` (add-on s nginx nebo kontejner na jiném stroji v síti). **Nevystavuj samotné HA:** složka `/config/www` → `/local/` jde přes HA a tunel by vystavil i přihlášení do HA.
3. V Cloudflared add-onu: `additional_hosts: - hostname: zossimulator.cz, service: http://192.168.x.x:8080`.
4. V Cloudflare zapni cache pro statické soubory, aby domácí linku zatěžovala jen první návštěva.

**Moje doporučení:** produkci dát na Cloudflare Pages (zdarma, bez starostí, funguje i při výpadku doma) a HA použít jako **testovací verzi** (např. `test.zossimulator.cz`), kam Codex nebo ty nahrajete rozpracovanou verzi pro kolegy.

### 3.4 Co je k nasazení potřeba (checklist)

1. Účet GitHub, repozitář projektu (může zůstat soukromý; Cloudflare Pages umí i soukromé repozitáře).
2. Účet Cloudflare, nový projekt Pages napojený na repozitář; build příkaz `python3 build.py`, výstupní složka `site`.
3. Doména, nameservery převedené na Cloudflare, vlastní doména připojená k projektu Pages.
4. Soubor `site/_headers`: dlouhá cache pro `t/*`, `graph.wasm`, `lib/*`; krátká pro `index.html`.
5. Stránka **O hře / licence:** neoficiální projekt, kontakt, © přispěvatelé OpenStreetMap (ODbL), MapLibre (BSD-3), fonty Noto (OFL).
6. Analytika volitelně a jen bez cookies (např. Cloudflare Web Analytics), aby nebyla potřeba cookie lišta.
7. CI (P4), aby se na web nedostala rozbitá verze.

### 3.5 Než to dáš veřejně: organizační a právní body (důležité)

- **Souhlas zaměstnavatele.** Hra je o ZOS ZZS JčK, používá reálnou síť základen a jsi zástupce tiskového mluvčího. Doporučuji předem získat souhlas vedení a ověřit soulad s interní směrnicí o komunikaci s veřejností. Pro PR a nábor to může být i oficiální přínos.
- **Data z interních zdrojů.** Kalibrace podle říjnového exportu a katalog `src/symptoms.json` vychází z reálných výzev. Formulace příznaků jsou z rozhodovacího protokolu calltakerů. Osobní údaje v tom nejsou, ale jde o interní know-how. **Před veřejným spuštěním to nechat schválit**, nebo pro veřejnou verzi katalog nahradit obecnějšími formulacemi.
- **Neoficiálnost.** Žádná loga ZZS ani dodavatelů softwaru, v patičce „Neoficiální fanouškovský projekt, nejde o oficiální produkt ZZS JčK“ (pokud vedení neřekne jinak). Název hry zvážit bez „JčK“ v titulku.
- **Žádné osobní údaje:** generátor je syntetický. Při přidávání nových podkladů dál platí, že se přebírá jen struktura.

---

## 4. Doporučené pořadí

1. P1 (generátor osob, místa, konzistence, audit v testech).
2. P4 minimum: ESLint `no-undef` + CI.
3. Souhlas zaměstnavatele a rozhodnutí o katalogu příznaků.
4. Doména + Cloudflare Pages + stránka O hře → veřejná beta pro kolegy.
5. P2 tutoriál a vyhodnocení s reálnou referencí → veřejné spuštění.
6. P3 a P5 podle zpětné vazby.
