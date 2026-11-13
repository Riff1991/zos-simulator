# Rešerše: ZOS, příjem výzvy a operační řízení

Stav rešerše: 12. 11. 2026. Dokument je podklad pro vývoj hry, ne provozní ani klinický předpis. Veřejné materiály jiných krajů a odborné články se nepřenášejí do místních pravidel ZZS JčK bez potvrzení doménovým expertem.

## Co je důležité pro návrh simulátoru

1. **Naléhavost a indikace jsou dvě odlišná rozhodnutí.** Naléhavost vyjadřuje stupeň rizika; indikace určuje vhodnou reakci a prostředky. Zákon vymezuje N1–N4 a pravidlo nejbližší dostupné skupiny u N1. Konkrétní klinické a provozní rozhodovací postupy patří do místního provozního řádu a pravidel experta.
2. **ZOS řeší celý tok, ne jen výběr auta.** Patří sem lokalizace, sběr a aktualizace informací, vyslání vhodné skupiny, instrukce volajícímu, komunikace s posádkami a nemocnicí, koordinace dalších složek a průběžná změna rozhodnutí.
3. **Pro hratelnost je užitečné oddělit fáze a časy.** Ve výzkumném popisu se rozlišuje přijetí hovoru, identifikace problému, stanovení priority, určení reakce, vyslání skupiny, instrukce a ukončení hovoru. Hráč v této hře zastává roli dispečera; calltaker je simulovaný.
4. **Kvalita nemá být jen rychlost.** Výzkum měří také správnost priority a volby prostředků, podtriáž a nadtriáž. Literatura upozorňuje, že důkazy pro přesnost dispatch protokolů jsou omezené a mezi systémy nejsou jednotná referenční kritéria.
5. **Místní rozdíly jsou zásadní.** Veřejné popisy ZZS Ústeckého kraje, Olomouckého kraje, Jihomoravského a Plzeňského kraje ukazují rozdílné role a technologie. Jsou inspirací pro obrazovky a herní události, nikoli náhradou pravidel JčK.

## Právní rámec v ČR

- Zákon č. 374/2011 Sb. vymezuje ZOS jako nepřetržité centrální pracoviště operačního řízení. Mezi úkoly řadí příjem a vyhodnocení tísňové komunikace, pokyny výjezdovým skupinám, instrukce první pomoci, spolupráci se složkami IZS, komunikaci s akutní lůžkovou péčí a koordinaci předávání pacientů.
- Vyhláška č. 240/2012 Sb., § 2, definuje čtyři stupně: N1 při selhání nebo bezprostředně hrozícím selhání základních životních funkcí či při MU s hromadným postižením; N2 při pravděpodobném hrozícím selhání; N3 pro stav vyžadující ZZS bez bezprostředního ohrožení selháním; N4 pro ostatní případy, kdy operátor rozhodne o vyslání. U N1 se přednostně vysílá nejbližší dostupná skupina a při první skupině RZP současně také RLP.
- Vyhláška, § 4, ponechává pracovní postupy v organizačně provozním řádu konkrétního ZOS. To je důležitý důvod, proč veřejné obecné zdroje nemohou určit lokální pravidla pro indikace, sestavu posádek ani průběh výjezdu v JčK.
- Zákonná dojezdová doba 20 minut se počítá od převzetí pokynu k výjezdu skupinou. Nejde o dobu od prvního zazvonění linky. Hra by proto měla mít oddělené časy hovoru / připravení / předání výzvy / jízdy.

## Materiály Ondřeje Fraňka a ZACHRANNASLUZBA.CZ

- [Moderní pohled na ZOS – obecný příjem tísňové výzvy](https://old.zachrannasluzba.cz/odborna/0304_prijem_tv_obec.htm): rozlišuje lokalizaci a kontakt, hlavní potíž, prioritu, určení týmu a instrukce. Zdůrazňuje zjišťování informací od laika, ne stanovení definitivní diagnózy; u závažných stavů jsou instrukce volajícímu součástí procesu.
- [Doporučený postup pro popis činnosti operačního střediska](https://zachrannasluzba.cz/wp-content/uploads/2019/03/Doporu%C4%8Den%C3%BD-postup-pro-popis-%C4%8Dinnosti-opera%C4%8Dn%C3%ADho-st%C5%99ediska-p%C5%99i-tvorb%C4%9B-v%C4%9Bdeck%C3%BDch-sd%C4%9Blen%C3%AD.pdf): užitečná terminologie časových uzlů pro log a skóre simulátoru (čas přijetí, identifikace problému, stanovení priority, odpovídající reakce, vyslání, instrukce, konec hovoru). Upozorňuje, že samotný interval zpracování neříká dost o kvalitě bez třídění a volby reakce.
- [Dimenzování operačního střediska](https://old.zachrannasluzba.cz/odborna/0310_dimenzovani_os.htm): starší model vytížení a kapacity. Využitelná je hlavně kvalitativní poznámka k nárazovým špičkám a tomu, že administrativní úkoly mohou při MU snížit funkční kapacitu. Staré číselné odhady nejsou bez novějších dat parametry pro JčK.
- [Manuál operátora ZOS](https://zachrannasluzba.cz/manual-operatora/): aktuální stránka popisuje rozsáhlou příručku k příjmu výzev, operačnímu řízení, MU, lidským faktorům, kvalitě, mapě a technologiím. Kniha není volně dostupná jako plný text; rešerše z ní nepředstírá obsah, který veřejná anotace neukazuje.
- [Operační řízení přednemocniční neodkladné péče](https://zachrannasluzba.cz/operacni-rizeni-ve-zdravotnictvi/): předchozí učebnice popisuje témata včetně práce s hovorem, operačního řízení, LZS a MU; na stránce je aktuálně uvedena jako dočasně nedostupná.
- [Rozpoznání úmrtí operátorem](https://zachrannasluzba.cz/rozpoznani-umrti-operatorem-je-pri-spravnem-postupu-spolehlive/) a další tematické články lze použít jako zdroj námětů pro různé typy příběhů. Klinické scénáře se však musí držet pravidel dodaných uživatelem a aktuálních metodik.
- [Franěk: nové vydání iktového pokynu](https://zachrannasluzba.cz/aktualita-nove-vydani-iktoveho-pokynu/) komentuje změnu metodiky CMP v roce 2026. Je to odborný komentář; autoritativní postup je samotný [Věstník MZD 2/2026](https://mzd.gov.cz/wp-content/uploads/2026/02/Vestnik-MZD_02-2026.pdf).
- [Franěk: změny v třídění závažných úrazů](https://zachrannasluzba.cz/male-velke-zmeny-v-trideni-zavaznych-urazu/) shrnuje Věstník MZD 18/2025. U traumatu se pravidla triáž-pozitivity mění; pro aktuální kritéria je primárním zdrojem [Věstník MZD 18/2025](https://mzd.gov.cz/wp-content/uploads/2025/10/Vestnik-MZD_18-2025.pdf), nikoli shrnující článek.

## Veřejné příklady z dalších ZZS

- [ZZS Ústeckého kraje – ZOS](https://www.zzsuk.cz/zdravotnicke-operacni-stredisko-zos/): popisuje sekvenční rozdělení calltakingu a operačního řízení, v němž dispečer může vyslat posádku už během hovoru calltakera. Zveřejňuje také napojení na mapu, radiostanice, nemocnice a další složky.
- [ZZS Olomouckého kraje – ZOS](https://www.zzsol.cz/nase-sluzby/operacni-stredisko): veřejně uvádí 4 operátory na směně rozdělené do rolí calltakerů a dispečerů, kontrolu a školení kvality a záložní režimy. Konkrétní počet lidí je místní údaj, ne obecný standard.
- [ZZS Jihomoravského kraje – KZOS](https://www.zzsjmk.cz/krajske-zdravotnicke-operacni-stredisko): popisuje práci s volajícím, telefonickou první pomoc, aktivaci AED a komunikaci s okolními kraji a složkami IZS.
- [ZZS Plzeňského kraje – funkce operačního systému](https://www.zzspk.cz/o-zachranne-sluzbe/operacni-stredisko/jak-funguje-operacni-stredisko.html): veřejný příklad GIS, vyhledávání nejbližších prostředků, posílání souřadnic a textu do vozidel, příjmu dat z 112, automatických statusů a záložního svolávání při MU.
- [ZZS Plzeňského kraje – informační systém](https://www.zzspk.cz/o-zachranne-sluzbe/operacni-stredisko/informacni-system.html): popisuje moduly provozního systému a automatické předání výzvy posádkám. Zdroj jmenuje konkrétní produkt; hra jej nesmí přebírat do názvů ani grafiky.
- [Výroční zpráva ZZS Ústeckého kraje 2024](https://www.zzsuk.cz/wp-content/uploads/2025/06/vyrocni-zprava-2024.pdf): podrobnější příklad rozdělení rolí calltaker/dispečer, vyslání během hovoru a koordinace s posádkami, nemocnicemi a IZS.

## Odborné důkazy k dispatch třídění

- [Bohm & Kurland, 2018 – systematický přehled přesnosti medicínského dispatchingu](https://pmc.ncbi.nlm.nih.gov/articles/PMC6230269/): zahrnul 18 studií napříč různými zeměmi a stavy (NZO, CMP, trauma, priorita). Autoři hodnotí celkovou kvalitu důkazů jako nízkou až velmi nízkou a upozorňují na chybějící společné standardy. Přehled vysvětluje citlivost, specificitu, pozitivní/negativní prediktivní hodnotu i pod-/nadtriáž.
- [Srovnání Medical Index a RETTS-A](https://pmc.ncbi.nlm.nih.gov/articles/PMC5747276/): ukazuje, že citlivost pro nejvyšší prioritu a míra pod-/nadtriáže se mohou mezi systémy lišit. Výsledky jsou závislé na konkrétním systému a populaci; nejsou přímým nastavením pro české N1–N4.
- [Česká zkušenost s telefonickou triáží dušnosti](https://urgentnimedicina.cz/casopisy/UM_2012_01.pdf): historická studie popisuje možnost rozlišovat rizikovější a méně rizikové hovory podle hlavní potíže; jde o konkrétní starší práci, nikoli univerzální algoritmus.

## Dopady pro herní návrh (bez změny klinických pravidel)

- Modelovat odděleně **charakter výzvy** (např. budova / terén / zdravotnické zařízení), **typ výjezdu** (primární / sekundární) a **naléhavost N1–N4**.
- Ukládat časy jednotlivých kroků, historii změn naléhavosti a důvod změny. U složitější obtížnosti lze simulovat nesoulad mezi prvním doporučením calltakera a pozdějšími informacemi; přesná četnost a mechanika vyžadují potvrzení uživatele.
- Rozlišit rychlost rozhodnutí, dojezd, vhodnost složení posádky a dopad na pokrytí. Nadtriáž/podtriáž může sloužit jako vzdělávací herní výsledek, ale nesmí být prezentována jako objektivní klinická validace.
- Zobrazovat nejbližší dostupné prostředky podle mapy a jejich skutečného stavu; zdroje více krajů potvrzují běžné použití GIS a automatického předání polohy, ale rozhodovací pravidla zůstávají lokální.
- Pro CMP, trauma a další konkrétní scénáře používat aktuální metodické zdroje jako kontext. Hratelné indikace, míru zapojení lékaře, ZZUM, LZS, nemocnici a výjimky stanoví uživatel jako doménový expert.
- U výzev vytvářet pouze syntetické osoby, telefony, identifikátory a poznámky. Z dodaných e-mailů přebírat strukturu/formát, ne reálné texty ani osobní údaje.

## Odkazy na právní a metodické zdroje

- [Zákon č. 374/2011 Sb. – e-Sbírka](https://e-sbirka.gov.cz/sb/2011/374)
- [Vyhláška č. 240/2012 Sb. – konsolidované znění](https://www.zakonyprolidi.cz/cs/2012-240)
- [Přehled legislativy ZZS na ZACHRANNASLUZBA.CZ](https://zachrannasluzba.cz/legislativa-o-zzs/)
- [Metodický pokyn MZ: first respondeři](https://mzd.gov.cz/metodicky-pokyn-pro-systematicke-vyuzivani-poskytovatelu-prvni-pomoci-na-vyzadani-first-responderu/)

