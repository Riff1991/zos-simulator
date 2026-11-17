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

### Rádio – živý přepis (15. 11. 2026, anketa)
- Panel Rádio ukazuje hovor jako chat se dvěma stranami (ZOS vlevo zeleně, posádka vpravo modře, světlý text). Řádky se objevují přesně ve chvíli, kdy je hlas řekne (skutečný čas, nezávisle na rychlosti hry); po posledním řádku zůstane 6 s a zmizí. V interaktivním režimu je přepis nad tlačítky odpovědí. LZS se podepisuje „Kryštof 13“.
- Zdrojem je fronta `radioFeed` z `pollLog` (ne log, který se ořezává), rozpoznání řádků sdílí hlas i panel (`radioParse`).

### Další úpravy (15. 11. 2026, anketa)
- Otrava CO: datovka „podezření na otravu CO“ přidá případu příznak Oxid uhelnatý a počet osob 2–4; indikace se nemění (dítě AVPU-U zůstává N2 bez dynamiky). Text datovky odpovídá počtu osob a stavu.
- Relace ZOS → posádka mají vždy tvar: „ZCBxxx, zde ZCB101, příjem“ → „na příjmu“ → zpráva → potvrzení → „díky, konec“.
- Upřesnění z datovky může zvýšit naléhavost: po nabrání jako N3 přijde „amputace prstů“ → vždy N2 (60 % dynamická, 40 % plná), přidá se příznak a požadavek na RV (vyslání zvolí dispečer), posádky dostanou relaci „zvyšujeme naléhavost na N2…, posíláme lékaře“.
- Datovka dopravní nehody vychází z příznaků případu (chodec, motocyklista, cyklista, nákladní automobil, rotace…); příznaky „+ HZS“ a „+ PČR“ určují odesílatele první zprávy a přítomnost složky.

### Mezikrajská a přeshraniční spolupráce (15. 11. 2026, anketa – zadání, zatím neimplementováno)
Podklad: smlouvy JčK o spolupráci s Krajem Vysočina (28. 5. 2013), Středočeským krajem (15. 8. 2013) a Plzeňským krajem (27. 10. 2015); ujednání o přeshraniční spolupráci s Dolním a Horním Rakouskem a Bavorskem (pohraniční území, vzájemná pomoc, když vlastní služba nestihne včas, jen oprávněné organizace; Rakousko: Notruf NÖ a Červený kříž). Zdroj: bakalářská práce ZZS JčK (kap. 6), rámcová smlouva ČR–Rakousko.
- Toky: (1) naše žádost o LZS z jiného kraje (stávající, vylepšit), (2) naše žádost o pozemní posádku z jiného kraje, (3) žádost jiného kraje o naši pozemní posádku, (4) žádost jiného kraje o naši LZS (Planá).
- Sousedé: Vysočina, Plzeňský, Středočeský kraj, Rakousko a Bavorsko (příhraniční pás, pozemní posádky i LZS). Konkrétní posádky na základnách u hranice (seznam základen navrhne Claude ke schválení; volací znaky fiktivní).
- Naše žádost o pozemní posádku: až když vlastní volná posádka není do 20 min (nebo žádná volná); vysílá se přetažením dlaždice „Sousední kraje“ na případ. Odpověď operačního střediska po 60–180 s herního času: souhlas 70 %, jinak odmítnutí s důvodem (nemáme volnou / vlastní výjezd / posádka na převozu); po odmítnutí lze zkusit jiného souseda. Cizí posádka vozí pacienta do naší nemocnice podle indikace a pak se vrací na svou základnu.
- Žádosti souseda o naši pozemní posádku: 1–3× za směnu; ozve se jako relace v panelu Rádio s volbami Vyhovět / Odmítnout / Zjistím; dispečer vybírá konkrétní posádku z nabídky s ETA; bodování podle zbytku pokrytí (vyhovět s jinou volnou RZP v oblasti +1, oblast zůstane bez RZP −1; odmítnutí bez trestu, když je oblast prázdná, −1 když mohla pomoci); bez odpovědi do 3–5 min automaticky odmítnuto a −1 b.
- Žádosti souseda o Planou: 0–2× za směnu; po souhlasu je Planá pryd a nelze ji odvolat.
- Naše žádost o LZS: odpověď střediska s prodlevou a možným odmítnutím, přidat zahraniční LZS, sloučit Požádat a Vyslat, ukázat ETA včetně aktivace a délky nasazení. Dnešní blok z nabídky posádek se mění: všechny externí LZS jsou fialové („nepřihlášená“) a vypadají nefunkčně.
- UI: dlaždice „Sousední kraje“ v přehledu posádek (stav volná / vyslaná / mimo), základny sousedů a jedoucí cizí posádky na mapě jinou barvou.
- Kroky: 1) naše žádosti o pomoc (pozemní i LZS, dlaždice, mapa, odpověď střediska), 2) žádosti sousedů o nás (hovor, nabídka, bodování, Planá pryč), 3) zahraničí (rakouské a bavorské základny, zahraniční LZS).
- Upřesnění (15. 11. 2026): u Rakouska jen LZS, pozemní pomoc se prakticky nepoužívá (žádné rakouské pozemní základny). Bavorsko zatím beze změny (příhraniční pás pozemní i LZS), čeká na potvrzení.

- Základny sousedů (16. 11. 2026): upraveno podle veřejné mapy obcí se základnou ZZS (zachrannasluzba.cz, souřadnice a názvy obcí): Vysočina Telč, Jemnice, Počátky, Pacov, Kamenice nad Lipou; Plzeňský Sušice, Horažďovice, Nepomuk; Středočeský Březnice, Votice, Krásná Hora nad Vltavou, Sedlčany. Bavorsko jen LZS. Limit vzdálenosti cizí pozemní posádky 50 km. Seznam FR se nemění.

### MU podle SM01.06 rev. 8 (8. 1. 2026) – rozhodnutí z 16. 11. 2026 (verze 0.26.0)
- Podklad: směrnice SM01.06 rev. 8 + příloha 2 (check-listy ZOS 401/403/405, odsunový formulář, METHANE, kontaktní místa). Nahrazuje starší rev. 4 a dřívější aproximaci.
- Hráč si role volí jako dřív (MU = 401 / běžný provoz = 402). Simulovaný kolega řídí tu druhou část **průběžně** s lidskou prodlevou (dřív po prvním kroku přestal). Dokud hráč roli nezvolí, MU řídí kolega.
- Hráč klikne jen klíčové kroky z check-listu 401: avízo MU, vyslání sil (ponechání RZP pro běžný provoz: 1× na základně s více RZP, v ČB 2×), modul MU, METHANE a aktualizace po ~30 min, kontaktní místa nemocnic a kapacity (403), sousední ZZS / LZS / DRNR, SPIS na žádost VZS, koroner při úmrtí, odsun pacientů, potvrzení konce.
- Pacienti jsou jednotliví (TIK, barva I–IV, typ P/P+T/T/I, dítě, UPV, pracovní diagnóza). Skutečný stav je skrytý; ZOS zná METHANE počty a ohlášené odsuny. Počet skupin se odvozuje z počtu zraněných (ne náhodně).
- Odsun: vedoucí odsunu volá rádiem (TIK, barva, UPV, dospělý/dítě, vůz), hráč vybírá nemocnici podle kapacit z kontaktních míst. RV nevozí (jsou vedoucí lékař/třídění). RZP 1 pacient (I/II) nebo 2 (III), vůz MU až 4 (III), LZS 1 (I). Transportní posádka se po předání vrací na místo, dokud tam jsou pacienti.
- Konec MU je dán hlášením vedoucího zdravotnické složky (všichni odvezeni nebo mrtví, koroner přijel) a potvrzením ZOS, ne časem. Sousední kraje přijíždějí na žádost (obojí: hráč může žádat dřív, jinak se po 30 min nabídnou Vysočina a Plzeňsko).
- Během MU: N1 jako dosud, N2 jen RZP (dynamická indikace), N3 se odkládá, sekundární převozy se odkládají.
- Nesimulováno (jen log/automaticky): telefonáty vedení a tiskové mluvčí, SMS skupinám, personální posily lékařů/NLZP (zjednodušeno na aktivaci záloh), papírové TIK a odsunový formulář, popáleninové centrum, kanály rádia jen jako text.

### Katalog MU – rozhodnutí z 16. 11. 2026 (verze 0.27.0)
- MU se losuje z katalogu ~35 scénářů (`ZOS_DATA.muTypes`) v 5 skupinách: doprava, budovy a požáry, hromadné akce (včetně blesku na táboře či akci při bouřce a hromadných onemocnění na táboře), nebezpečné látky, útok (AMOK, bomba). Letecká nehoda u letiště ČB 4–60 osob (malé dopravní letadlo i sportovní).
- Místo je vždy reálné: objekt z OSM (hotel, tábor/kemp, škola, kino/kulturní dům, supermarket, pivovar, pila, stadion, koupaliště, aquapark, domov seniorů), bod na silnici podle třídy (D3 / I. / II. tř.), železniční stanice či přejezd, letiště ČB. Typ určuje rozsah a skladbu zraněných (děti, popáleniny, inhalace, intoxikace).
- Počasí a sezóna: blesk jen při bouřce, tábory v létě, školní autobus ve školní době, mlha/náledí na dálnici, zřícení střechy při sněhu, kolaps davu při vedru.
- Typ poranění podle formuláře: P = popálenina, T = trauma, P+T, I = inhalační trauma; navíc N = neúrazové (intoxikace, onemocnění). Polytrauma je diagnóza (kritéria pro traumacentrum), ne typ poranění.
- Popáleniny: rozsáhlé popáleniny I. priority patří do popáleninového centra (FNKV Praha, FN Brno, FN Ostrava), letecky; centra jsou v nabídce odsunu jen pro LZS.
- Útok a nebezpečné látky mají zónu: do vyhlášení bezpečné zóny (PČR/HZS, 10–25 min) se na místě netřídí ani neodsouvá.

### Režim „Jen MU“ a kompaktní panel případu – rozhodnutí z 16. 11. 2026 (verze 0.28.0)
- Nový režim spuštění **Jen MU (cvičení)**: datum a hodina podle výběru (počasí reálné), kraj je před startem „zahřátý“ ~100 min simulovaného provozu s automatickým dispečerem, takže posádky jsou v různých fázích (na cestě, na místě, transport, předání, návrat) a běží skutečný počet rozpracovaných výjezdů pro danou denní dobu. MU začne 4–8 min po startu (typ náhodný podle času a počasí, nebo vybraný). Obyčejný provoz běží dál. Cvičení končí ukončením MU a vyhodnocením (hodnocení MU: časy, METHANE, odsun, chyby).
- Panel vybraného případu: First respondeři a „LZS podle kalkulátoru“ jsou u N2/N3 sbalené do dvou řádkových tlačítek s krátkým shrnutím (u LZS nejlepší nemocnice a „Ano/Možná“). Rozbalí se kliknutím, nebo kliknutím na dlaždici LZS. U N1 zůstává vše rozbalené jako dosud.

### Rozsáhlá anketa k MU po testovací hře – rozhodnutí z 16. 11. 2026 (verze 0.29.0)
- Kolega při MU (hráč řeší běžný provoz, nebo roli nezvolil): skoro nic nehlásí. Hlas, pípání a toasty jen při vyhlášení a ukončení MU; zbytek jde tiše do logu. Odsun za kolegu probíhá bez rádiové relace (vedoucí odsunu v rádiu nezní).
- První vlna sil kolega vysílá najednou (RZP podle odhadu skupin, 2× RV, LZS, modul MU), ne po jedné s prodlevou.
- Režim Jen MU: roli (řídím MU / řídím běžný provoz) si hráč volí před startem.
- N3 zůstávají během MU odložené do konce MU (beze změny).
- Pomoc jiných krajů = skutečné posádky ze základen ve hře: Vysočina 5, Plzeň 3, Střední Čechy 4 a 6 LZS po jednom (Jihlava, Praha, Plzeň, Linz, Krems, Straubing). Při MU vždy souhlas a bez limitu vzdálenosti. Vypuštěno: Jihomoravský kraj, pozemní Rakousko a Bavorsko, DRNR (nemají ve hře základny).
- Mapa: bez dalších prvků. Cizí posádky jsou vidět jako dlaždice a na mapě jako ostatní cizí posádky.
- Odsun: rádiová relace jako dosud, doporučená nemocnice je první tlačítko (★).
- Zóna (útok, chemie, požár, výbuch, vlak, letadlo): zpoždění třídění 8–15 min po příjezdu.
- Hodnocení MU: jen složky, které dispečer ovlivní (chyby při odsunu, rychlost odpovědi na relace odsunu, reakce na žádost SPIS a koronera); dopad na běžný provoz a využití LZS se nehodnotí.
- Layout: při přepnutí na „Řešit MU (401)“ se obrazovka přeskládá (panel MU vlevo na výšku, mapa, rádio, posádky; seznam případů a protokol menší), při přepnutí zpět nebo po ukončení MU se vrátí. Hlášení MU se nezobrazují jako červené banery nahoře (jsou v panelu).
- Vlastní rozložení (16. 11. 2026): dělicí lišty mezi panely, plovoucí okna uvnitř stránky (odepnout/připnout), předvolby Výchozí, Široká mapa, Velký seznam a detail; ukládá se zvlášť pro běžný provoz a MU (`zos_layout_v2`). Jen stolní zobrazení, mobil beze změny. Okna na druhý monitor zůstávají jen pro mapu a přehled transportů.

### Várka po v0.29.1 – rozhodnutí z 16. 11. 2026
- **Plán směn podle dne v týdnu (zatím jen jedno pravidlo):** RV Dačice není v pondělí a v úterý ani ve dne, ani v noci. Směnový den začíná v 7:00 (pondělní směna = po 7:00 až út 7:00, úterní = út 7:00 až st 7:00). Data v `ZOS_DATA.weeklyOff`, aby šla pravidla přidávat dalšími řádky.
- **Žádosti sousedních krajů o naše posádky** (krok 2 ze zadání „Mezikrajská spolupráce“): implementovat dle zadání výše (Vyhovět / Odmítnout / Zjistím, bodování podle zbylého pokrytí, Planá po souhlasu pryč).
- **Zjednodušení kódu:** ano, vše zjednodušit. Mobilní rozložení není priorita (nelze dobře ovládat).
- Nyní ne: hodnocení s reálnou referencí, chybné doporučení calltakera, klávesové zkratky, sdílení / směna dne.
- Uživatel nabídl poslat seznam směrnic a reálná statistická data (tisíce výjezdů, ne desítky tisíc), formát si určí Claude.
- **Zjednodušení kódu (hotovo, bez změny funkcí):** `engine.js` (3 586 ř.) rozdělen na `engine-base.js`, `engine.js` a `sim-*.js` (mixin); `ui.js` (2 100 ř.) na `ui-*.js`. Lint běží nad všemi `src/*.js` a nad sestaveným UI, testy čtou všechny části UI. Mobilní rozložení zůstává beze změn (není priorita, nemazáno).

### Kalibrace podle reálných výjezdů (16. 11. 2026, export Seznam výjezdů: leden a červenec 2026, primární výjezdy)
Podklad: 7 334 + 8 262 výjezdů posádek (surová data se nekopírují do repozitáře, jen souhrnné tabulky). Řádek = výjezd jedné posádky; události = řádky „první posádka u události“ (leden 197/den, červenec 223/den).
- **Objem:** střed (Běžné) = reálný počet událostí: ve dne (7–19) ~132 (zima) až ~143 (léto), v noci ~66 až ~80, hodinový profil a roční doba podle dat. Klidné a Nálož = procentní odchylky od středu podle rozptylu skutečných dnů (rozhodl Claude). Tím se přepisuje dřívější „~130 případů za směnu“.
- **Poznámka ZOS a popis místa:** co nejvěrněji podle reality: formát „příznaky, věková skupina, složky - #nazev: stručný kód“, s (ne)diakritikou a velikostí písmen jako ve skutečnosti, bez vymýšlení nových variant mimo ty, které se v datech vyskytují. Příznak DYNAMICKÁ INDIKACE se chová podle dat.
- **Časy, rychlosti, naléhavost, podíl lékaře podle indikace, typ místa a věk:** upravit podle dat (rozhodnutí: ano). Úpravy pravidel v `data.js` jsou tímto schváleny.
- Změny zůstávají na větvi `claude/realisticke-vyzvy`; do `main` až po schválení.

### Výsledek kalibrace (16. 11. 2026, větev `claude/realisticke-vyzvy`)
- **Podklad a oprava:** podíly N jsou na úrovni **událostí** (řádky „první posádka u události“): N1 2,0 %, N2 22,6 %, N3 75,1 %. Dřívější odhad „3,6 / 29 / 67“ byl po výjezdech a pro hru neplatí. Hra po úpravě: N1 ~2,3 %, N2 ~24 %, N3 ~74 %.
- **Objem (Běžné):** `EV_HOUR` (události za hodinu, zima a léto, prolíná se podle dne v roce). Za 12 h ~132 / 66 (zima, den / noc) a ~144 / 82 (léto). Klidné ×0,85, Nálož ×1,25 (skutečná denní směrodatná odchylka ~11 %, 90. percentil denní směny +8 až +12 %, noční +26 až +32 %).
- **Indikace** (`ZOS_DATA.indCal`): váhy, N, `dyn`, `rvInit`, `rvPd`, `rvP`, kvantily věku, podíl žen, čas na místě `sceneQ`, podíl převozu. **DYNAMICKÁ INDIKACE:** jen u N2 (39,5 % z N2), u CMP nikdy (CMP N2 mají lékaře jen ~10 %). Sada příznaků se vybírá podle toho, zda se dynamická vylosovala. Dynamická N2: lékař hned jen výjimečně, později 5 až 30 % podle indikace.
- **Typ místa** (`whereCal`): RD ~33 %, byt ~31 %, terén ~16 %, domov ~4 %, zdravotnické zařízení ~2 % (dřív domov 12 %, zdravotnická zařízení žádná).
- **Popis místa a poznámka ZOS** (`placeModel`, `tailMix`, `_tail`): skládá se ze segmentů převzatých ze skutečných zápisů (RD, BOD, patra, příznaky jako „vertigo“, „zvrací“…), s původní velikostí písmen a diakritikou (diakritika se nestrhává, ve skutečnosti je zachována). Popis místa = polohové segmenty, poznámka ZOS = zbytek. Vztah volajícího zůstává jen u oznamovatele. Fráze s četností pod 4 a vlastní jména jsou vyřazeny.
- **Časy:** prodleva výjezdu (RZP N1 / N2 / N3 medián 79 / 100 / 106 s), čas na místě (lognormálně podle indikace a N), transport (`P2`/`P3` pevná část 50 s), lékař na místě podle N. Změřeno ve hře proti skutečnosti: prodleva medián 2,0 (1,8), jízda 6,5 (6,8), na místě N2 / N3 18,3 / 14,7 (19,6 / 14,9), transport 12,7 (12,0), v zařízení 10,5 (9,9) minut.
- **Zbývá:** podíl dětí (hra 6 %, skutečnost 8 %), sekundární převozy (nebyly v exportu), odpovědi sousedních krajů (pořadí podle plánu: žádosti sousedů).

### Hustota výjezdů podle míst a dne v týdnu (16. 11. 2026)
- **Ranní špička podle oblasti:** domněnka, že je výraznější v Budějovicích, se v datech nepotvrdila. Podíl událostí v 7–10 h je v ČB 23,6 %, v ostatních okresních městech 22,5 %, jinde 23,6 % (interval ±2 %); profily po hodinách se napříč oblastmi neliší. Jediný rozdíl je v noci: ČB a okresní města mají 0–5 h o ~3 b. vyšší podíl (13 % proti 10,6 %), což je v mezích šumu. Proto zůstává jeden profil pro celý kraj.
- **Pracovní den proti víkendu:** ranní špička 7–10 h je v pracovní den výrazně vyšší (23 % proti 19 % denního objemu). `EV_HOUR` má zvlášť profil pro pracovní den a víkend; den v týdnu se bere z data hry. Faktory podle jednotlivých dnů v týdnu vyšly po zprůměrování dvou měsíců téměř ploché, nepoužívají se.
- **Obce:** skutečný podíl událostí ve městech je mnohem vyšší než podíl adres (České Budějovice 17,0 % událostí při 6,1 % adres). Adresy ve hře se losovaly rovnoměrně, proto měly ČB jen 7,2 %. Nově se přijímají podle násobku obce (`obecMul`, strop 6). Po úpravě: ČB 15,8 %, Tábor 4,9, Písek 4,7, J. Hradec 3,7, Strakonice 3,6, pět největších měst 33 % (skutečnost 34 %).
- **Známé omezení dat:** v `site/addr.json` chybí nebo je velmi málo adres u některých obcí (Milevsko 25 adresních bodů, Bernartice, Zálezly, Bošice, Hrejkovice ž.). U nich hra podhodnocuje počet výjezdů (okres Písek 8,3 % proti skutečným 11,0 %). Vyřeší až úprava mapového pipeline (`pipeline/`).
- **CMP:** N2 bez dynamické indikace jede RZP sama, lékař jen výjimečně (~10 %); příkaz „Změnit výzvu na dynamickou“ se u ní už nenabízí (nabízí se jen u N2, kde se lékař vysílá hned).

### Rozšíření databáze adres (16. 11. 2026, zadání uživatele: adres násobně víc po celém kraji)
- **Příčina nízkého počtu (hypotéza, ověří se na datech):** `pipeline/addr.py` zahazuje všechny adresní body bez `addr:city` (`if not city: continue`) a vyžaduje polygon okresu z externího repozitáře. Část obcí tak má jen desítky adres (Milevsko 25, Bernartice, Zálezly, Bošice 0), ačkoli v OSM adresní body jsou.
- **Plán:** stáhnout Geofabrik extrakt Jihočeského kraje (`download.geofabrik.de`), znovu vytáhnout adresy (`addr_extract.py`), chybějící obec doplnit podle hranic obcí / nejbližšího sídla z OSM, přidat adresy z budov bez `addr:*` jen pokud to data umožní, deduplikovat a regenerovat `site/addr.json` (limit velikosti hostingu hlídat, viz HANDOFF). Po změně přepočítat `obecMul` (násobky obcí se odvozují z podílu adres).
- Síť prostředí je omezená; je potřeba povolit host `download.geofabrik.de` (jen stažení dat, bez klíčů).

### Vstřícná jízda: kdy se nabízí a kdo se překládá (16. 11. 2026, zadání uživatele)
- **Problém:** posádky (např. Suchdol) často hlásily „krátká trasa, překlad není potřeba“ nebo „dojedeme sami“, i když dávala vstřícná smysl. O smyslu vstřícné má rozhodovat dispečer, ne hra.
- **Pravidlo „nejde nabídnout“:** jen když je jízda z místa zásahu do nemocnice **pod 15 min** (nebo je nemocnice mimo kraj). Dřív platilo i „z domovské základny pod 17 min“ a „z místa pod 20 min“ a ještě trasa nad 12 min; to odpadá.
- **Pravidlo „posádka dojede sama“ (překlad není možný):** už ne náhodou podle N, ale podle pacienta (`_transferable` v `sim-loop.js`). Nepřekládá se: N1, resuscitace/NZO, tonutí, oběšení, popáleniny, amputace, DN, CMP, porucha vědomí, bolesti na hrudi a arytmie v N2, děti v N1–N2, gyn. (porod), pacienti na nosítkách, imobilní/ležící/nechodící, zlomeniny DKK, páteř. Vzácně ano (~25 %): trauma HKK. Ostatní N3 ano (chodící), N2 podle situace (~45 %).

### Popis místa musí sedět na adresu (16. 11. 2026, zadání uživatele, varianta B)
- **Problém:** popis místa a poznámka ZOS se losovaly z modelu skutečných zápisů nezávisle na adrese (např. „zimní stadion, budou čekat venku“ u Lesní 1148 ve Srubci, „stanice HS“). Má to platit oběma směry: text výzvy musí odpovídat bodu/adrese a naopak.
- **Zařízení** (stadion, hospoda, restaurace, lázně, vrátnice, recepce, azylový dům, stanice HS/služebna, věznice, ústav, tábor, nádraží, škola, ordinace, DPS/DD, hotel/penzion/ubytovna…) se u obyčejné adresy **nikdy** nepoužijí. U reálného místa z OSM (`poi.json`) jen když sedí jméno nebo druh místa (např. „DPS“ jen u „Dům s pečovatelskou službou“, „DD“ jen u domova pro seniory; u místa bez jména nic).
- **Typ budovy a patra z OSM:** `addr_full.py` přiřadí každé adrese budovu (polygon) a její `building` a `building:levels`; `addr.json` má nové pole `b` (kód budovy, podlaží), stejné pořadí jako `a`. Kódy: 1 dům, 2 obytná budova, 3 bytový dům, 4 jiná, 0 neznámá. Místo „rd“ se losuje jen u domu (nebo obytné budovy do 2 podlaží), „byt“ jen u bytového domu (nebo obytné budovy s ≥ 2 podlažími). Patro v popisu nepřesáhne počet podlaží − 1; „panelák“ jen od 5 podlaží. Adresa bez vhodné budovy se použije až když žádná jiná není.
- **Pokrytí dat:** 89 % adres má budovu, 62 % počet podlaží.

### Stavy posádky na místě (16. 11. 2026, zadání uživatele)
- Skutečná posádka po dojezdu hlásí jen „na místě“, potom „transport“. Stav „Zahájení ošetření“ (dřív po 2 min na místě) se v panelu posádky už nezobrazuje; ošetření se nehlásí.

### Přestavba rychlosti jízdy podle reálných dat (16. 11. 2026, zadání uživatele)
- **Zadání:** od přetažení dlaždice (pager) po „na místě“ co nejreálnější plošně (podle N, vzdálenosti, typu posádky…), posádka po příjezdu nečeká (nejvýš ~10 s), bez upozornění na pozdní výjezd u N2 a N3.
- **Prodleva výzva → výjezd:** kvantilové tabulky z reálných dat (`ZOS_DATA.turnCal`), zvlášť posádka na základně a v autě, RZP a RV, N1–N3, v noci pomalejší (RZP ×1,13, RV ×1,15). Upozornění „opožděný výjezd“ u N2 a N3 odstraněno; u N1 zůstává alarm (2 min).
- **Doba jízdy k případu:** `(a + b·min(t,900) + b2·max(0,t−900)) × základna × hodina` (`ZOS_DATA.driveCal`), t = čas routeru; RZP N2 100 s + 1,03·t, RZP N3 107 s + 1,11·t, RV 105 s + 1,02·t, N1 = N2 × 0,96 (RZP) / 0,92 (RV), lognormální rozptyl σ ≈ 0,14–0,16, hodinový faktor (0–5 h ×1,10, 6–8 h ×1,04), násobky základen (Opařany ×0,70 … Týn n. Vlt. ×1,39). Dlouhé trasy (nad 15 min) jsou rychlejší než router (×0,6–0,9).
- **Bez čekání u cíle:** pevná část se rozloží po trase (pomalejší rozjezd a dojezd), vozidlo jede až do okamžiku „na místě“ (`mv.dw = 0`).
- **Ověření:** celý čas vyslání → „Na místě“ po 57 dvojicích základna–obec (≥ 20 případů): medián rozdílu hra − realita +5 s (dřív −89 s, N3 −106 s), 80 % dvojic do ±60 s, 94 % do ±90 s. Šířka mezikvartilového rozpětí 130 s proti 117 s v datech.
- **Neověřeno / otevřené:** transport do nemocnice a návrat na základnu mají zatím staré konstanty; posádka už jedoucí v autě (`fromBase = false`) bere stejnou pevnou část (data to nerozlišují); skóre pokrytí používá starý vzorec `driveSec`.
