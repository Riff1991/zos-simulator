# Otevřené otázky pro uživatele (pokládat formou ankety)

Agent: pokládej po blocích, každou otázku s možnostmi A/B/C/D + „Jiné: …“. Odpovědi zapiš dolů do sekce **Odpovědi** a teprve pak implementuj.

## Blok 1 – Priority a směr
1. Co je teď nejdůležitější? A) zapracovat tvoje indikace a pravidla vysílání, B) věrnější vzhled podle monitorů, C) nové herní prvky (sekundáry, avíza, konzultace), D) nasazení a sdílení (hosting, mobil).
2. Kde má hra běžet? A) dál jako artefakt na claude.ai, B) vlastní statický hosting (GitHub Pages / Netlify / Vercel), C) jen lokálně, D) intranet ZZS.
3. Mapa: A) ponechat vlastní vložené OSM dlaždice, B) na vlastním hostingu přejít na živé dlaždice OSM, C) Mapy.cz (vyžaduje API klíč), D) jiný podklad.
4. Hlavní zařízení pro hraní? A) počítač (více monitorů), B) počítač i mobil rovnocenně, C) hlavně mobil, D) tablet.
5. Pro koho je hra? A) jen pro tebe, B) kolegové na ZOS / ZZS, C) veřejnost (PR, nábor), D) výuka studentů/záchranářů.

## Blok 2 – Indikace a naléhavost
6. Jak dodáš indikace? A) tabulka (Excel/CSV) se sloupci klasifikace / upřesnění / N / lékař ano-ne / ZZUM, B) volný text, který agent převede, C) fotky dokumentů (bez osobních údajů), D) dodám postupně po klasifikacích.
7. Co znamenají čísla v kódu klasifikace `1/1/2/…`? A) poslední číslo = naléhavost, B) jiný význam (popiš), C) nevím, nechat jako dekoraci, D) nezobrazovat.
8. Jaké hodnoty má „Naléhavost doplňková“? (vypiš; A) nepoužívat ve hře)
9. Má hra simulovat i chybné doporučení calltakera (podhodnocená/nadhodnocená N), které má dispečer odhalit? A) ano, B) ne, C) jen v těžší obtížnosti.
10. CMP: jaká kritéria má lékař splnit (závažnost, časové okno)? Popiš, nebo A) zatím zjednodušeně.

## Blok 3 – Posádky a základny
11. Adresy (nebo souřadnice) základen, které nemají přesnou polohu: Horní Planá, Vyšší Brod, Kaplice, Týn n. Vlt., ČB-Planá, Jindřichův Hradec, Dačice, Suchdol n. Luž., Prachatice, Vimperk, Volary, Vacov, Lhenice, Strakonice, Blatná, Písek, Milevsko, Čimelice, Soběslav, Mladá Vožice, Opařany, Veselí n. Luž.
12. ZZUM: potvrdit Vodňany a Volary? A) obě ano, B) jen Vodňany, C) jen Volary, D) ani jedna.
13. Zbývající barvy stavů v reálném systému (předání v ZZ, sekundár, porucha, mimo provoz, oběd…)? Popiš.
14. flexRLP (Blatná, Milevsko, Vimperk): jak má fungovat ve hře? A) dispečer může RZP „povýšit“ na RLP s časovou penalizací, B) ignorovat, C) jiné.
15. LZS: A) jen den (východ–západ slunce), B) 24 h, C) noc s omezením / delší mobilizací, D) i počasí ovlivňuje.
16. Reálné schéma rádiových volacích znaků / kódů vozidel – chceš ho napodobit (fiktivně, ale ve stejném formátu)? A) ano (popiš formát), B) nechat současné.

## Blok 4 – Herní mechaniky
17. Má hráč řešit i sekundární převozy (N4, plánované)? A) ano jako druhý dispečer, B) ne, jen vyřazují posádky, C) volitelně.
18. Frontline úkoly (avízo do nemocnice, konzultace, koroner): A) přidat jako úkoly s časem, B) jen jako rádiové hlášky, C) ne.
19. Nemocnice: přidat kapacity / „stop příjmu“ a odklony? A) ano, B) ne.
20. Skórování: jsou váhy rozumné (vyslání 20, dojezd 50, lékař 15, volba posádky 15, pokrytí 25 % celku)? A) ano, B) víc důrazu na dojezd, C) víc na pokrytí, D) jiné.
21. Frekvence MU (hromadné neštěstí) ve směně: A) zřídka (~40 % směn), B) vždy jedna, C) volitelné v nastavení, D) nikdy automaticky.
22. Chceš scénáře (předpřipravené náročné směny, výuka)? A) ano, B) později, C) ne.
23. Vytížení: reálně ~118 výjezdů / 12 h; hra generuje ~110 případů za směnu při „Běžné“. A) OK, B) víc, C) méně.

## Blok 5 – Vzhled a ovládání
24. Má UI věrněji kopírovat reálné okno (barvy, písmo, rozložení na 4 monitory)? A) ano, pošlu další fotky (bez osobních údajů), B) současné stačí.
25. Klávesové zkratky dispečera? A) ano (popiš, jaké se reálně používají), B) ne.
26. Zvuky (příchod N1, rádio)? A) ano, B) ne, C) volitelné.

## Odpovědi
### Blok 1 – Priority a směr
1. A – zapracovat indikace a pravidla vysílání.
2. B – vlastní statický hosting; GitHub účet bude jiný, než který Codex zná.
3. C – Mapy.cz.
4. A + B – počítač (více monitorů) i mobil rovnocenně.
5. A + B – pro uživatele i kolegy na ZOS / ZZS.

### Blok 2 – Indikace a naléhavost
6. B – uživatel dodá indikace jako volný text, agent je převede.
7. D – kód klasifikace nezobrazovat.
8. Doplňková naléhavost značí pouze změnu naléhavosti (snížení nebo zvýšení) v průběhu hovoru.
9. C – chybné doporučení calltakera jen v těžší obtížnosti.
10. Lékaře u CMP vyslat při AVPU-V, AVPU-U nebo jiných závažných okolnostech.

### Blok 3 – Posádky a základny
11. A – uživatel dodá adresy základen v textu.
12. Vodňany i Volary jsou ZZUM základny; ZZUM směna je na jednotlivých ZZUM základnách dostupná přibližně v 70 % směn, jinak standardní režim.
13. D – zatím ponechat současné barvy stavů.
14. flexRLP: přes den může být na celou směnu dostupný lékař „libero“ (např. BLATNA_LIBERO); dispečer jej přetažením na RZP spojí a vytvoří RLP. Zadaná doba aktivace: cca 6–8 minut.
15. D – počasí ovlivňuje LZS; mobilizace LZS cca 6–8 minut.

### Blok 4 – Herní mechaniky
16. ZOS má volací znak ZCB101; ostatní posádky mají formát ZCBXXX jako nyní (fiktivní čísla).
17. A – hráč řeší sekundární převozy; oba druhy dispečinku obsluhuje jeden dispečer.
18. B – frontline činnosti jen jako textové hlášky.
19. B – nemocniční kapacity a odklony nepřidávat.
20. A – ponechat současné váhy skórování.
21. C – výskyt MU volitelně v nastavení.
22. B – scénáře později.
23. B – zvýšit na přibližně 130 případů za směnu.
24. A – UI přiblížit reálným oknům; uživatel pošle další ukázky bez osobních údajů.
25. C – navrhnout běžné herní klávesové zkratky.
26. A – zvuky zapnout.

### Doplňující specifikace od uživatele
- Naléhavost používá stupně N1–N4; N4 souvisí s plánovanými sekundárními převozy.
- Pole „Upřesnění“ obsahuje výčet příznaků a okolností, které calltaker zaklikává v rozhodovacím pavouku; algoritmus z těchto voleb stanoví naléhavost. Nejde o volně generovaný text.
- Typ výjezdu má být primární nebo sekundární; jeden dispečer obsluhuje obojí.
- „Charakter“ výzvy označuje druh místa/situace, např. „Tísňová výzva v terénu“, „Tísňová výzva v budově“ nebo „Tísňová výzva ve zdrav. zařízení“; není to primární/sekundární typ výjezdu.
- Popis místa zásahu má být volný/dynamický, převážně malými písmeny a někdy bez diakritiky.
- Poznámka ZOS má působit jako fiktivní záznam podle struktury a stylu dodaných e-mailových příkladů; osobní údaje ani konkrétní texty se nepřebírají.
- Místo zásahu se generuje dynamicky z mapových/geografických údajů, s vyšší pravděpodobností v hustěji osídlených místech, ne výběrem z konečného seznamu šablon míst.
- Tato specifikace zatím neurčuje medicínská/dispečerská pravidla jednotlivých klasifikací.
- E-mailový export je užitečný pro návrh položek „Upřesnění“, ale kvůli neúplným polím a výběru zpráv tiskového mluvčího není reprezentativním podkladem pro četnost vyslání lékaře ani pro automatická pravidla.

### Mimořádná událost – herní mechanika
- Hráč zůstává výhradně v roli dispečera ZOS; nehraje posádku a neorganizuje zóny ani činnosti na místě.
- Při vyhlášení MU si hráč může zvolit, zda bude řídit běžný provoz, nebo skupinu pro MU. Druhý dispečer řízený simulací obsluhuje druhou část provozu.
- Pro hru je důležitý tok informací z místa, od složek IZS a od zdravotnických zařízení, včetně průběžných situačních hlášení a potvrzení jejich převzetí.
- Během vyhlášené MU se mají promítnout do dispečinku pravidla uvedená v dodané SM01.06: upravené vysílání N1–N3, odklad N4 a běžných sekundárních převozů s výjimkou vitálních, a zachování části kapacity pro běžný provoz.
- Mapa zón a přidělování rolí zasahujícím na místě nejsou součástí hry.
- Dodaná SM01.06 je revize 4 ze dne 14. 2. 2020; aktuální traumatologický plán není k dispozici, proto hra nepředstírá přesné aktivační stupně.
- Prototyp vychází z dodaných STČ 09/IZS (2016), STČ 04/IZS (2016) a STČ 08/IZS (2009): podezření z 112, potvrzení rozsahem hlášení první posádky, generované METHANE informace, požadavky na posily, ověření příjmu nemocnic a zvláštní větev letecké nehody.
- Prahová logika MU je pouze herní aproximace: více než 15 zraněných nebo generovaný odhad nejméně 5 skupin. Počty, kapacity a situační hlášení jsou smyšlené.

### Spojový řád – rádiová komunikace (odpovědi z 14. 11. 2026)
- Statusy (výjezd, na místě, odjezd do ZZ, předání, volná) hlásí posádka **jen terminálem**, rádiem ne.
- Rádiem posádka volá ZOS kvůli: cíli transportu, žádosti o lékaře / LZS, exitu nebo ponechání na místě, vstřícné jízdě.
- Volací znak se vyslovuje „zecebé“ + číslo („zecebé tři sta třináct“). ZOS odpovídá „Zecebé 101 rozumí“.
- Vstřícnou jízdu předává ZOS druhé posádce **výzvou na terminál**, ne rádiem.
- Cíl transportu hlásí posádka rádiem **vždy**.
- Avízo do nemocnice dělá ZOS jen u centrové péče (traumacentrum, iktová centra, KCC). Posádka řekne např. „směřujeme KCC České Budějovice, dojezd x minut“, ZOS: „101 rozumí, nahlásíme“.
- U polytraumat se hlásí: pohlaví, věk, důvod trauma triage (Věstník), spontánně ventilující / UPV, čas dojezdu či doletu. Přes ZOS se avizuje i transport na ARO, vždy s dojezdem zaokrouhleným na 5 min.
- Směrování na koronární jednotku se hlásí („jedeme s pacientem na kardioJIP Nemocnice České Budějovice“) a posádka se ozve znovu „na kruháči“ (velký kruhový objezd v ČB) s dojezdem např. 7 min; ZOS znovu nahlásí. Stejně u KCC.
- Koronera shání ZOS.
- Vyslovuje se spíš „zecébé“. Začátek relace: „Zecébé 101, zde zecébé 313, příjem.“ → „Zecébé 101 na příjmu.“ je v pořádku.
- ZOS volá posádku rádiem sám při odvolání / přesměrování a s výsledkem koronera.
- Cíl transportu hlásí posádka při odjezdu z místa.
- Druhé hlášení před příjezdem: jen ČB – KCC, kardioJIP, traumabox, ARO ČB, dětské ČB. „Na kruháči“ jen když jedou přes něj (velký kruhový objezd u průmyslové zóny, u Toyoty dole). Na urgent ČB se nehlásí nikdy.
- Hlášení cíle transportu (vzor): „ZCB216, pacienta máme naloženého / na palubě / ve voze a jedeme urgentní příjem / chirurgie / interna Tábor, dojedeme sami / je schopen překladu.“ (žargon: cíl v 1. pádě)
- Když je na místě RZP i RV, volá vždy RV a ohlásí oba vozy: „ZCB 101, zde ZCB 319 a 315.“
- RV hlásí např.: „ZCB219, pacienta převáží posádka 313 na urgent do Jindřichova Hradce a my se vracíme zpátky na základnu / my jsme volní“, nebo „jedeme společně urgent Jindřichův Hradec (a my jsme odvolatelní)“.
- Ponechání na místě: RZP „ZCB313, po konzultaci pacient ponechán na místě a my se vracíme zpátky na základnu“; RV „pacienta jsme ponechali na místě a obě posádky se vracíme zpátky na základnu“.
- „Dojedeme sami / je schopen překladu“ jen z periferie (kde dává vstřícná smysl).
- Exitus: „na místě exitus, prosím zjistěte nám dostupnost koronera“ / „na místě exitus, prosíme zjistit koronera“ (ne „KPR neúspěšná“).
- Žádost o lékaře striktně: „ZCB313, žádáme lékaře na místo, zhoršení stavu / posouzení stavu.“
- Odpověď ZOS na žádost: „rozumí, za vámi RV Třeboň“ (název posádky).
- Výsledek koronera sděluje ZOS telefonicky (informace do terminálu): „koroner Dr. …“; pokud není, RV musí zůstat na místě (případně odjede jinam a pak se má na prohlídku vrátit).
- Na koronera na místě čeká policie / rodina, posádky odjíždějí.
- Odvolání od ZOS: „vraťte se na základnu, výjezd zrušen / volající zrušil výjezd“.
- LZS (Kryštof 13): zkouška spojení vždy v 8:00 a 20:00 – „ZCB 101, zde Kryštof 1 3“ → „ZCB 101 na příjmu“ → „ZCB 101, Kryštof 1 3 na Matře slyší za 5, jsme bez omezení / na konzultaci / zatím neletoví, kdyžtak se ozveme“.
- LZS po vzletu (asi minutu): „ZCB 101, Kryštof 1 3 po vzletu, na místě přistání za xx minut“ → „ZCB 101 rozumí, na místě za xx minut“. Totéž zahlásí posádkám jedoucím k případu: „ZCB xxx a ZCB xxx, Kryštof 13 přistává za xx minut“.
- LZS při transportu: „směřujeme ARO Nemocnice ČB, přílet na heliport za xx minut“; pacienta avizuje ve formátu trauma triage jen při triage pozitivitě.
- Předpoplach během nabírání: terminálem / tlačítkem, bez rádia.
- Doplnění informací během jízdy (zbraň, PB na místě, pacient se probral) volá ZOS rádiem.
- Sekundární převozy (N4): jen terminál.
- LIBERO se hlásí pod znakem RZP (lékař je ve voze).
- Více zraněných (i pod prahem MU): první posádka hlásí METHANE.
- Doplnění od ZOS (vzor): „ZCB313, ZCB101, pacient se probírá, měníme naléhavost na N2“ nebo „…na místě resuscitace, za vámi RV Jindřichův Hradec“.
- Když volá ZOS: „ZCB313, ZCB101“ → „ZCB313 na příjmu“ → zpráva ZOS → posádka potvrdí („313 rozumí“).
- Trauma triage u polytraumat: zjednodušeně (např. „triage pozitivní – mechanismus“).
- Avízo do centra: hráč odpovídá „nahlásíme“, bez bodů.
- Rádio je poloduplex: nikdy víc relací najednou, další posádka počká na ukončení relace.
- Konzultace ponechání na místě: lékař RV oblasti přes ZOS telefonem – stačí zpráva do terminálu (jako doteď).
- Špatná adresa / nenalezený pacient se hlásí rádiem.
- Žádosti o součinnost rádiem: „žádáme na místo hasiče na transport“, „žádáme na místo policii pro určení totožnosti“, „žádáme na místo policii, agresivní pacient“.
- „Na adrese nikdo / nemůžeme najít“ → ZOS: „rozumí, voláme na místo“.
- Žádost o hasiče / policii → ZOS: „ZCB101 rozumí, posíláme hasiče / policii”.

### Výcvik – scénářový tutoriál (14. 11. 2026, zadání uživatele)
- Výcvik má být edukativní a projít bod po bodu všechny herní mechaniky; nesmí se čekat na náhodné výjezdy.
- Rozhodnutí: výcvik je řada lekcí. Každá lekce sama vloží předem připravený případ (pevné místo, příznaky, osud pacienta, součinnost), náhodné případy, sekundáry, MU i počasí jsou ve výcviku vypnuté.
- Lekce: 1 Základy (výběr, RZP + RV, sledování, rádio, upozornění) · 2 Vstřícná jízda · 3 Exitus a koroner (koroner k dispozici i nedostupný) · 4 LZS (konzultace s pilotem, technická součinnost HZS, předání z heliportu) · 5 RV doprovod (po KPR, odvolatelný doprovod) · 6 Sekundární převoz (termín ±15 min) · 7 Součinnost PČR a HZS · 8 Pokrytí a volba posádky · 9 MU · 10 Bizarní finále.
- Bizarní finále: „probuzená NZO“ (N1 → N2 po cestě) současně s polytraumatem bez volného RV. Řešení: doplňková N2 uvolní lékaře, RV se přesměruje na polytrauma bez penalizace, k tomu LZS, METHANE, PČR a HZS.
- Lekce lze spustit i samostatně z nabídky Výcvik; každá si připraví vlastní situaci.
- Technicky: engine dostal skriptované vložení případu (pevná poloha, příznaky, `fate`, `script`) a přepínače pro pevný výsledek náhodných voleb (koroner, vstřícná, doprovod RV, žádost o PČR/HZS, pilot LZS). Běžná hra se nemění.

### Changelog formát (14. 11. 2026)
- Changelog na úvodní stránce zobrazuje poslední 3 verze.
- Místo seznamu odrážek (`<ul><li>`) se nyní zobrazuje u každé verze jeden odstavec (3–4 věty) shrnutí hlavních změn.
- Datový formát: `ZOS_CHANGELOG` obsahuje objekty s polem `”p”` (odstavec) místo `”l”` (seznam).
- Cíl: zjednodušit a zkompaktovat zobrazení cambgov na úvodní stránce, zpřehlednit informace o novinkách.
