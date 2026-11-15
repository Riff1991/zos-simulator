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

### Várka požadavků z 14. 11. 2026 (v0.21)
**Návrat a naléhavost**
- Návrat z případu je standardně bez majáků. Dispečer může posádce nařídit **režim N3 (návrat na VRZ / s majáky)** – rychlejší dle modelu rychlosti. Nastavuje se v panelu přehledových posádek po kliknutí na vůz ve spodním panelu. Rádiem: „po předání se prosím vracejte v režimu N3“ → posádka potvrdí → ZOS „ZCB101 díky, konec“.
- Na dlaždici vozu malá modrá tečka svítí, když posádka jede na majáky (k případu i zpět v N3).
- RV se vrací na VRZ vždy; je-li mimo pravidelně zabezpečovanou oblast (cca >10 min od základny), vrací se v režimu N3 až na základnu.
- Rychlost posádky podle naléhavosti; dispečer může naléhavost posádky změnit.
**Opravy**
- Nejde odpřiřadit libero od posádky.
- Když mluví posádka, bliká v panelu posádek ikonka konkrétního vozu.
- RZP Planá přesunout zpět do přehledu posádek České Budějovice.
- Pokud si posádka dodatečně po příjezdu vyžádá RV, RZP **nesmí odjet s pacientem**, dokud RV nedojede (případně se potkají po cestě, má-li to smysl). RV se nesmí uvolnit dřív, než dojede.
- Posádky při rádiové komunikaci ukončují slova v půlce (hlavně na konci věty) – dohrát relaci celou.
- Odvolání výjezdu rádiem: „ZCBxxx, ZCB101“ → „ZCBxxx na příjmu“ → „ruším výjezd, vraťte se na základnu“ (ne „volající odvolal“).
- „OS KŘP JčK: hlídka osobu zajistila, vyjednavač na cestě“ nedává smysl – po zajištění osoby vyjednavač není potřeba.
- Zabarikádování v domě/bytě: na místo vyjíždí zásahová jednotka z Českého Krumlova (simulovaný čas dojezdu).
**First respondeři (FR)**
- Nový typ zdroje: HZS, JPO II/III/IV, PČR, VZS, Horská služba (seznam souřadnic od uživatele). Na mapě malé zelené AED symboly. V panelu posádek malá samostatná skupina „FR“. Vyslání ručně i automaticky nejbližšího; v datové zprávě vidět „na místě, přebírají TANR od svědků“. Typ FR se ve hře rozlišuje.
**ZZUM**
- Příznak ZZUM = výjezd bez lékaře, volitelně jen u ZZUM stanovišť.
**Rádiové okno**
- Nové menší okno vlevo dole pod panelem vybraného případu, dlaždice odpovědí. Zpráva o zhoršení/posouzení stavu (žádost o lékaře) červená; pokud ji dispečer nevyřídí, doplní se prodleva. Stisk dlaždice automaticky **nepřiřazuje** posádku. Zpráva do terminálu a přepis v rádiovém okně se objeví až s několikavteřinovým zpožděním, ne ihned po odpovědi na příjmu.

### Rozhodnutí k várce v0.21 (14. 11. 2026)
- (UPŘESNĚNO) K případu i při transportu jedou posádky vždy na majáky, rychlost podle naléhavosti N1–N3; návrat je bez majáků, „režim N3“ = návrat na majáky na pokyn dispečera; RV mimo zabezpečenou oblast (>10 min) se vrací na majáky automaticky. Dřívější text: K případu jedou na majáky naléhavosti N1/N2 (a transport P2), N3/N4 bez majáků; dispečer může naléhavost jízdy posádky změnit (přepočte se zbývající trasa). Návrat je standardně bez majáků; režim N3 ho zrychlí. Modrá tečka na dlaždici = jede na majáky.
- Žádost posádky o lékaře: odpověď tlačítkem rádio „Za vámi RV …“ nic nevysílá. Když dispečer do 3 min nevyšle lékaře, vyšle ho kolega s −1 b. Červené upozornění nahoře až minutu po odpovědi na rádiu.
- RZP čeká s pacientem na lékaře (RV/LZS), pokud je vyslán a jede; limit 15 min platí jen tehdy, když lékař vyslán není. „Potkání po cestě“ zatím není implementováno.
- FR: nejbližší podle silniční trasy + doba na výjezd podle typu (HZS ~1–2 min, JPO III ~4–7 min, VZS/HS ~3–8 min); VZS přednost u tonutí, horská služba v terénu. FR je v dlaždicích jediná dlaždice „FR“ ve skupině Speciální, ne 60 dlaždic. FR neboduje.
- ZZUM příznak lze zapnout, jen když je k případu vyslána RZP ze ZZUM stanoviště; u N1 ne (lékař povinný).
- Zásahová jednotka PČR z Českého Krumlova: modelována jen jako datové zprávy OS KŘP s dojezdem 12–25 min (okres ČK) / 30–65 min (jinde).
- Rádio: přepis relace se v okně ukáže po 3,5 s, řádky terminálu po 4 s a dalších ~2,3 s za sebou (skutečný čas).

### Datové zprávy – zeštíhlení (15. 11. 2026, anketa)
- Styl: jen podstatné pro ZOS. Bezpečnost přístupu, počet zraněných, vyprošťování, ohrožení života a nebezpečí. Žádné složení jednotek (CAS, RZA, JSDH…), žádné ETA „kdo jede“.
- Vyřazeno: odtah a úklid vozovky, dokumentace nehody, měření místa, výslech svědků; řízení dopravy, objízdné trasy, dechové zkoušky, ztotožnění osob.
- Popis nehody ponechán, ale bez barev: jen typ (osobní vozidlo, dodávka, nákladní vozidlo, kamion, autobus, motocykl, skútr, cyklista…) a druh střetu.
- eCall: jen poloha, hlas volajícího a případné upřesnění; bez paliva, počtu osob s pásy, přesnosti GPS a směru jízdy.
- Červeně: bezpečnost přístupu (včetně „bezpečno, ZZS může“), počet zraněných, vyprošťování, ohrožení života a nebezpečí (KPR, požár/kouř/únik, zbraň/útočník, LZS). Ostatní zprávy normálně.

### Datové zprávy, složky a výzvy (15. 11. 2026, anketa)
- Výzvy mají víc odpovídat datovkám: rozšířit repertoár druhů událostí podle indikací v databázi (pád z výšky, pracovní úraz, KPR svědků, pokousání, domácí násilí, střet se zvěří, vlak, výtah, CO, plyn, cyklista + víc variant stávajících). Počet případů s datovkou jen mírně roste, jde o realistické typy (DN, požáry, tonutí, oběšení, napadení, psychiatrie, asistence, úrazy v terénu, otevírání bytu, veřejná místa). Zbytek zůstává jen z linky 155.
- Pořadí u případu s datovkou: nejdřív datovka „nabírá se: <druh> – <adresa>“ (linka 112 / 150 / 158), náš výjezd (výzva) přijde po 3–5 min od začátku nabírání, potom postupně podrobnosti.
- Složky: u případů, které přijdou datovkou z 112/150/158, je složka (PČR a/nebo HZS) přiřazena rovnou. U ostatních výzev s příznakem PČR/HZS (např. „+ PČR“, „Asistence u zásahu HZS“, „Na žádost PČR“) složku vyžadujeme: červené upozornění s dlaždicí jako u lékaře, po ~6 min trestný bod. Posádka kvůli tomu nečeká.
- Nesmysly: filtr podle věku. Alkohol a drogy až od 12 let, agresivita až od 5 let (žádné agresivní nebo opilé dítě 0 let). Intoxikace alkoholem je možná od 12 let.
- UI: kliknutí do volného místa pod seznamem případů sbalí všechny karty (žádný případ není rozkliknutý do detailu).

### Indikace, vstřícná jízda, hlas (15. 11. 2026)
- Indikace (Intoxikace, Bolesti na hrudi, Dušnost, Dopravní nehoda…) zůstává u případu vždy stejná a nadřazená; datovka může měnit jen popis. Zpráva „nabírá se“ začíná indikací a ukazuje zdroj (KOPIS HZS / OS KŘP / TCTV 112 / eCall) a linku.
- Vstřícná jízda: dlaždici periferní RZP lze přetáhnout na dlaždici volné RZP z oblasti u nemocnice a naopak. Informace o schopnosti překladu je v detailu výjezdu i posádky.
- Druhý klik na rozbalený výjezd v seznamu ho sbalí.
- Výpadky zvuku: příčinou bylo zahlcení nebo zaseknutí hlasového modulu při rychlém běhu hry. Opraveno frontou s předsyntézou jedné věty, časovými limity a restartem modulu.

### Vrstva pokrytí na mapě (15. 11. 2026)
- Heatmapa pokrytí je volitelná vrstva přímo v mapě, přepínač „Pokrytí“ v liště nahoře v okně mapy, výchozí stav vypnuto.
- Typ zobrazení volí hráč: Izochrony (plynulé pásy s vrstevnicemi), Buňky (šestiúhelníková mřížka), Bílá místa (jen díry mimo limit šrafovaně s popisky). Limit dojezdu 15 / 20 / 25 min (výchozí 20).
- Data jsou živá a reálná: dojezd po silniční síti (ROUTER.coverage) z aktuálně volných RZP, režim jízdy N2, počítá se znovu při změně dostupnosti vozů (nejvýš co pár vteřin). Mimo plnou mapu (SVG záloha) vrstva není.
- Stat řádek: podíl území v limitu, nejhorší místo, počet slabých oblastí.

### Pípání (15. 11. 2026)
- Pípnutí a toast jen u věcí, které něco znamenají: nový případ, kritická (červená) datovka, žádost posádky, trestné body a termíny. Nekritické datovky (včetně „nabírá se“) jen v logu a v horním pruhu hlášení, bez pípnutí. Drobné „opožděný výjezd“ jen toast bez zvuku.

### Kalkulátor časové úspory LZS (15. 11. 2026)
Zdroj: dispečerský web „Výpočet úspory LZS“ (vlastní zdrojový kód od uživatele). Do hry se přebírá jen logika a konstanty, žádná osobní data ani klíče z webu.
- Konstanty z kalkulátoru platí i pro LZS ve hře: rychlost 215 km/h (vzdušnou čarou), vzlet 3 min ve dne a 10 min v noci, předání pacienta 10 min, zpoždění nemocnic (ČB 8, JH 3, Písek 6, Tábor 6 min). Den a noc podle občanského úsvitu a soumraku u základny LZS (datum je skutečné v prohlížeči).
- Vzorec: úspora = čas pozemně − (čas LZS + zpoždění nemocnice). H1/1 (LZS od začátku): čas LZS = let z místa do nemocnice. H1/2 (posádka už na místě): čas LZS = max(vzlet + let základna→místo + 10 min předání; zbývající ošetření) + let místo→nemocnice, čas pozemně navíc obsahuje zbývající ošetření. Indikace letu: úspora ≥ 15 min „Ano“, 10–14 „Možná“, jinak „Ne“.
- Čas pozemně se ve hře počítá z routeru (reálné silnice, transport s VRZ), ne z databáze průměrů jako na webu.
- Ve hře: doporučení v bloku LZS v detailu výjezdu (tabulka čtyř nemocnic, H1/1 nebo H1/2 podle toho, jestli už je na místě posádka). Po směně v souhrnu hodnocení rozhodnutí o LZS: správně vyslaná, hraniční, zbytečná a zapomenutá (zapomenutá jen u N1 při letovém počasí).

### Várka v0.23.0 – sebrané bugy a nápady (15. 11. 2026, anketa)
- Volající „pacient sám“ jen při AVPU-A (nebo bez AVPU); při AVPU-U/P/V a u křečí nevolá pacient sám.
- Datové zprávy: nová záložka „Datové zprávy“ (vedle Uzavřené) pro první zprávu z 112/158/150 („nabírá se: …“) bez N, klasifikace, upřesnění, poznámky a čísla. Pak „Nabírá se“ (naše linka, 70–150 s), pak Čekající. Případy bez datovky začínají rovnou v „Nabírá se“. Časování: datovka 180–300 s + nabírání 70–150 s.
- Nabírá se: karta ukazuje jen operátora a linku; při nabírání N1 záložka bliká a jmenuje se „Nabírá se N1“, v detailu zůstane jen předpoplach. Řádek N1 má značku „N1“.
- Datovka musí odpovídat případu (cyklista jen s pádem venku, napadení jen s násilím, pokousání jen s pokousáním, text ze symptomů).
- PČR/HZS z výzvy: bez červené lišty a bez blikání, ve stavu „Doplnit: PČR“, případ zůstává v Právě řešené, vysílá se přetažením dlaždice. Červená lišta zůstává u požadavků od posádky.
- Barvy posádek: červená = v akci (výjezd, na místě, transport, předávání), zelená = volná, šedá = ukončená na základně; cíl = oranžový štítek „nemocnice, oddělení“ (Právě řešené a panel případu).
- Rádio v auto režimu: v panelu se ukáže přepis probíhající relace (obě strany), pak zmizí; hlas stejně. Hláška „je schopen překladu“ se v auto režimu nezodpovídá sama (čeká na dispečera); po vypršení vstřícné posádka dojede sama.
- Výslovnost: slovník (urgentní, Prachatice → Prachaťice, ARO → áro).
- Rychlost posádky: počítá se z posunu za 5 s herního času, ukáže se v panelu posádky a štítkem u vozu na mapě; stojí = 0 km/h; LZS v km/h i uzlech.
- FR: štítek s názvem jednotky (odlišná barva) v Právě řešené, panelu případu a Uzavřené.
- Relace při vyslání posádky, která se vrací na základnu (nebo předává): ZCB101 → příjem → „ukončete se, mám pro vás další výjezd, obec, klasifikace N“ → „jsme ukončení“ → díky, konec. Spouští tlačítko „Volat posádku“, výjezd začíná až po relaci. Posádka na základně bez relace.
- Počasí: skutečná historická data (Open-Meteo archiv, 1 bod pro kraj, stažení celého dne při startu, cache), záloha simulace; datum a hodina při startu; horní lišta s datem, dnem, teplotou, větrem (km/h, kt, směr) a stavem LZS; LZS podle dohlednosti, základny oblačnosti, větru (25–35 kt konzultace, nad 35 kt neletovo), námrazy a bouřek, den/noc NVIS; mírné zpomalení jízdy (déšť −8 %, sníh −15 %, náledí −25 %, mlha −5 %); vliv na druhy případů (náledí, horko, mráz, bouřky). Plán směn podle dne v týdnu (např. Dačice bez RV Po a Út) je samostatný krok.
