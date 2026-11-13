# Předání projektu ZOS simulátoru pro Clauda

Datum předání: 13. 11. 2026

## Rychlé instrukce pro pokračování

Jde o webovou **hru/simulátor role primárního dispečera ZOS ZZS Jihočeského kraje**, nikoli nástroj pro ostrý provoz. Pracuj v existujícím pracovním stromu a nejdřív načti `AGENTS.md`, `README.md`, `docs/HANDOFF.md` a `docs/OTAZKY.md`. Pracovní strom obsahuje rozsáhlé záměrné necommitnuté změny; **nic nevracej/resetem a nepřepisuj**. Komunikuj s Vojtou česky a stručně. Medicínská ani dispečerská pravidla neměň bez jeho potvrzení.

Poslední nahlášená chyba: kliknutí na výzvu v seznamu nepřesunulo mapu na její místo, ačkoli ruční tažení mapou fungovalo. V `src/ui.js` byla funkce `applyMapFocus()` změněna z animovaného `easeTo()` na okamžitý `jumpTo()`. Do `tests/test.js` přibyl test, který kontroluje zavolání kamery na souřadnice události. Sestavení a kompletní testovací sada prošly. Uživatelský prohlížeč ale nebyl interaktivně proklikán od začátku do konce; pokud Vojta potvrdí, že problém přetrvává, ověřit skutečné kliknutí v běžící verzi a zkontrolovat, zda testuje právě nově sestavený `site/index.html`.

## Projekt a architektura

- Vanilla JS bez frameworku; `build.py` skládá `src/template.html`, `src/data.js`, `src/engine.js`, `src/ui.js` a mapové podklady do `site/index.html`.
- `src/engine.js`: deterministická simulace se seedem, čistý JSON stav, serializace/obnova.
- `src/ui.js`: obrazovky, posádky, případy, mapa MapLibre, rádio, zvuky, samostatné panely a SVG fallback.
- `src/symptoms.json`: anonymizovaný agregační katalog reálných kombinací příznaků. Obsahuje pouze názvy/kombinace a počty; žádná osobní data.
- `site/`: samostatně nasaditelná aplikace včetně vlastních OSM dlaždic, silničního grafu a adres.
- OSM atribuce „© přispěvatelé OpenStreetMap“ musí zůstat viditelná.

Ověření:

```bash
node tests/test.js
python3 build.py
python3 -m http.server -d site 8765
```

Používej HTTP (`http://localhost:8765/index.html`), ne `file://`.

## Hlavní požadavky a pevná doménová pravidla

- Hráč je pouze primární dispečer. Nehraje jako posádka a neřídí organizaci zásahu na místě.
- Případy, osoby, jména, telefonní čísla, událostní čísla, SPZ a členové posádek jsou syntetické. Vzorky z Excelů/e-mailů slouží jen pro anonymní agregace a strukturu; nikdy nekopírovat osobní údaje ani doslovné záznamy.
- N1: RZP + RV. N2: podle typu případu standardně odpovídající sestava; dynamická N2 může jet bez RV. N3: RZP, RV pouze na vyžádání RZP kvůli zhoršení nebo posouzení stavu; samostatné posouzení není výjezd. Bezvědomí/nedýchá je rovnou N1, nikdy dynamická N3.
- Dvě žádosti RZP o RV: zhoršení stavu, posouzení stavu. Nepovinně vyslané RV lze odvolat; zrušené RV nesmí zablokovat další průběh. U jednoho pacienta může RV/RZP při transportu LZS uvolnit podle stavu; při více pacientech posádky zůstávají potřebné.
- Sekundáry jsou denní, plánované přibližně kolem 8–9 h, s tolerancí pro skóre; vznikají i další v průběhu směny. Uživatel je může vypnout při startu.
- LZS: 130 uzlů; aktivace podle dne/noci. Heliport v NEM ČB potřebuje převozní RZP vyslanou zvlášť, upozornění přichází 5 minut před přistáním. Zohlednit exitus/koronera. Popáleniny mohou podle stavu směřovat na FNKV, pokud LZS letí.
- LZS: stav počasí „bez omezení“, „na konzultaci“ nebo „neletovo“. Konzultace s pilotem je textová a má zpoždění/výsledek; noční provoz a hraniční podmínky vyžadují konzultaci. LZS z jiných krajů se vyžaduje před vysláním, s prodlevou a možností odmítnutí; Jihlava jen ve dne, Praha KR01, Plzeň KR07.
- MU je volitelná. Dispečer si může vybrat běžný provoz nebo MU, druhou roli obsluhuje simulovaný dispečer. Hráč přijímá situační hlášení a potvrzuje jejich převzetí; nezavádět mapu zón ani gameplay posádky. MU mechanika je herní aproximace bez aktuálního traumaplánu. Při MU se na běžný N3 neuplatňuje penalizace za pozdní výjezd, v MU se vysílá jen na N1/N2.
- Při MU může být nutný technický zásah LZS v nepřístupném terénu.
- Vstřícná jízda: v rádiu vždy textové avízo převozu a rozhodnutí, zda dává předání naproti smysl; volnou RZP lze přiřadit přetažením na případ. V rádiu má být zpráva výrazně odlišená a se zvláštním zvukem.
- Při kliknutí na výzvu se má mapa automaticky přesunout na místo. Musí zůstat možné mapu ručně táhnout a zoomovat kolečkem.

## Změny již zapracované (proti původnímu prototypu)

### Simulace a data
- Zpřesněna četnost a hodinový profil událostí podle anonymizovaného říjnového přehledu; denní ranní špička a zhruba 130 výzev/denní směna.
- Přidáno rozsáhlé generování různorodých syntetických příznaků z anonimovaných podkladů; používají se pouze příznaky z dodaného katalogu. Poznámky jsou méně šablonovité, mohou chybět a oddělují se od strukturovaného pole Upřesnění.
- Zvýšena různorodost adres, bez nedávného opakování; opraveno stanoviště Mladá Vožice na Plaňková 420.
- Opravené životní cykly žádostí o RV a LZS, přidělování/odvolání posádek, transportů více pacientů a pomocných převozů z heliportu.
- MU: možnost při startu zapnout a nastavit pravděpodobnost; průběžná variabilní hlášení 112/IZS, jejich potvrzování a skórování; simulace odhadů rozsahu a vývoje, posilových potřeb a kapacity nemocnic dle poskytnutých podkladů. Přesné prahy jsou herní, protože chybí aktuální traumaplán.
- LZS počasí, konzultace s pilotem, technický zásah a mezkrajská výpomoc se zpožděním/odmítnutím; FNKV větev u závažných popálenin.
- Skóre směny: čistý/rozjetý start, provozní body i penalizace, historie bodů ukládaná ve stavu.

### Rozhraní a ovládání
- Dispečerské panely lze odpojit do samostatných oken pro více monitorů; mapa/radio lze schovat v hlavním rozložení, okna lze přizpůsobit a mapu zvětšit na celou obrazovku.
- Vylepšena mobilní mapa a ovládání, stavové dlaždice posádek, ikona LZS a základny.
- Přidán přehled posádek jedoucích do nemocnice s očekávaným koncem/časem dostupnosti.
- Případ se při výběru zvýrazní a má přesunout mapu na místo zásahu.
- Hlášení 112 lze potvrdit kliknutím a každé zmizí samostatně; zvuky pro nové výzvy a vstřícné jízdy.
- Předpoplach posádek u N1; výraznější indikace čekajících výzev.

### Poslední zásah do mapy
- `src/ui.js`: `applyMapFocus()` nyní volá `GL.jumpTo({center:[lon,lat], zoom:...})` místo `easeTo`, které uživateli nefungovalo. Je zde i odložené zaostření při nenačtené mapě a při skrytém/odpojeném panelu.
- `tests/test.js`: test výběru případu a test, že MapLibre kamera dostane správné souřadnice.
- Důležité: každou změnu `src/` promítnout přes `python3 build.py` do `site/index.html` před testováním/balením.

## Stav pracovního stromu a soubory

Všechny následující změny jsou zatím v pracovním stromu, bez nového commitu. `git status` naposledy ukázal jeden počáteční commit `e6115eb Initial import of ZOS simulator prototype` a změněné/necommitnuté soubory: `README.md`, `build.py`, `docs/HANDOFF.md`, `docs/OTAZKY.md`, `pipeline/README.md`, `pipeline/addr.py`, `site/index.html`, `src/data.js`, `src/engine.js`, `src/template.html`, `src/ui.js`, `tests/test.js`; nové soubory `docs/RESEARCH_ZOS.md`, `src/symptoms.json` a `outputs/`.

Neprováděj reset/revert neznámých změn a nepředpokládej, že každá změna je součástí posledního mapového bugu. Před úpravami zkontroluj `git diff` a zachovej vše rozpracované.

## Testování naposledy

Úspěšně proběhlo:

- `node --check src/ui.js`
- `python3 build.py` – vygenerovalo `site/index.html` (cca 1,22 MB)
- `node tests/test.js` – determinismus, několik směn a regresní testy včetně nové map focus kontroly prošly.

Map focus test je unit-level; na reálném browseru po nejnovější opravě nebyl celý klikací postup automatizovaně ověřen. Uživatel by měl obnovit `localhost:8765`; pro skutečný manuální test začít směnu, počkat na výzvu, kliknout její kartu a ověřit, že se mapa přesune.

## Aktuální balíček pro Mac

Nejnovější ZIP pro kolegu je `outputs/zos-simulator-test-mac-2026-11-13-v12.zip` (obsahuje aktualizované `site/index.html`). Byl nahrán na Drive a sdílen jako čtenář s `vojtech.mira@gmail.com`:

[Google Drive – ZIP v12](https://drive.google.com/file/d/1qiGxhUTxwMx9eiFy0ViUUE_r8Jwvcv0Y/view?usp=drivesdk)

Drive integrace, kterou použil upload, byla přihlášená pod jiným účtem; oprávnění ke čtení bylo uděleno výše uvedené adrese. Změny v tomto ZIPu jsou balíčkem testovací hry, nikoli veřejně nasazenou webovou aplikací.

## Otevřené věci / opatrnost

- Neznámá konkrétní adresa některých základen je stále přibližná; čeká se na přesná data od Vojty.
- Indikace a medicínská/dispečerská pravidla zůstávají pracovní aproximací, kromě explicitně potvrzených pravidel. Před změnou se vždy doptat Vojty.
- Mapový přesun ověřit po obnovení stránky. Jestli oprava nepomůže, zkontrolovat skutečný klik-handler a MapLibre camera bounds / skrytí panelu, ne pouze znovu měnit drag-pan.
- Sdílení Drive je omezené na uvedený e-mail; uživatel tentokrát nežádal veřejný odkaz.
- Necommitováno ani neposláno na GitHub; uživatel dříve zmínil jiný GitHub účet, který Codex nezná.


## Oprava v Claude – 13. 11. 2026 odpoledne

Chyba „klik na výzvu nepřesune mapu“ byla ověřena v reálném prohlížeči (Playwright + Chrome, desktop 1440 px i mobil 390 px) a opravena. Příčiny:

1. **`syncSelectionToMain is not defined`** – funkce se volala při kliku na kartu výzvy, posádku i prvek mapy, ale nebyla nikde definována. Klik spadl na ReferenceError dřív, než došel k `focusOn()`. Doplněna do `src/ui.js` (v odpojeném okně posílá výběr do hlavního okna přes `panelChannel`, v hlavním okně nedělá nic).
2. **Mobil: okno mapy mělo nulovou výšku.** Pravidla `#w-map{grid-area:map}` (ID) přebíjela mobilní `.win{grid-area:x}`, mapa se vykreslila jako 250×0 px. V `src/template.html` mobilní media query nově nastavuje `grid-area:x` přímo všem oknům a sjednocuje mřížku i pro `main[data-hide-map][data-hide-radio]`.
3. **Ikony domku (základny) a vrtulníku se nikdy nenačetly** – `GL.loadImage(url, callback)` je API MapLibre 3; v MapLibre 4 vrací Promise a SVG stejně neumí dekódovat („The source image could not be decoded“). Nahrazeno vlastní funkcí `svgIcon()` (SVG → `<img>` → canvas → `addImage`).
4. „zbývá 704 h“ v hlavičce → opraveno na „zbývá 11:44 h“ (chyba z původního prototypu).
5. Tlačítka pro odpojení oken (`#multiwin`) jsou na mobilu skrytá.

Nový test **`tests/browser_smoke.py`** (Playwright): žádné JS chyby, klik na výzvu přesune mapu na desktopu i mobilu, tažení a zoom kolečkem, výška mapy na mobilu. Na původní verzi selže, na opravené projde. Unit testy v `tests/test.js` tento typ chyb nezachytí – po změnách UI vždy spustit i tento test:

```bash
python3 -m http.server -d site 8765 &
python3 tests/browser_smoke.py          # CHROME=/cesta/k/chrome volitelně
```

Postřehy k obsahu (neměněno, čeká na Vojtu): u generovaných výzev se objevují nesourodé kombinace, např. N3 „Porucha vědomí“ s příznakem „DYNAMICKÁ INDIKACE“, nebo 29letý muž v domově pro seniory.


## Claude – 13. 11. 2026 večer: obsah výzev, reálná data, opravy LZS

**Nové soubory:** `src/people.js` (generátor osob), `site/poi.json` (reálné domovy pro seniory, školy, ordinace, provozovny z OSM), `pipeline/symptoms_build.py`, `pipeline/poi_build.py`, `tests/content_audit.js`, `eslint.config.js`, `docs/PLAN_VYLEPSENI_A_NASAZENI.md`.

**Obsah výzev**
- Jména: párová příjmení (Novák/Nováková, Černý/Černá, Sedláček/Sedláčková…), ~100 příjmení podle četnosti, křestní jména podle ročníku a pohlaví. Pacient, oznamovatel i členové posádek mají konzistentní rod. Jméno pacienta je uložené v případu (`patientName`, tisk výzvy).
- Oznamovatel má vztah k pacientovi (pacient sám, manžel/ka, syn/dcera, matka/otec, soused/ka, ošetřovatel/ka domova, kolega/kolegyně, kolemjdoucí, PČR, HZS, 112). Vztah je v poznámce a v detailu. Tvary se řídí pohlavím volajícího. Kdo je v bezvědomí, sám nevolá.
- Místo se volí podle věku, indikace a denní doby (domov pro seniory jen 60+, hlavně 80+; škola jen děti ve školní době; provozovna jen v produktivním věku v pracovní době). U domovů, škol, ordinací a provozoven se v 90 % použije reálné místo z OSM s adresou a názvem.
- Příznaky: odstranění duplicit a protichůdných dvojic. Dynamická N2 = štítek „DYNAMICKÁ INDIKACE“ ze skutečných kombinací (příznaky a stav `dyn` jsou vždy v souladu). Při eskalaci „opakované volání“ se štítek odstraní a do poznámky se zapíše zhoršení stavu.
- Katalog příznaků přestavěn z anonymizovaných přehledů leden–květen 2026 (35 306 výjezdů) a říjen 2026 (7 318): 537 příznaků, 7 444 reálných kombinací (aspoň 2× výskyt). Hlavní diagnóza se ignoruje (zadává ji posádka na místě). Zdrojové xls nejsou v repozitáři. Ohledání („koroner nedostupný, TANR nelze“) se už nepřepisuje na N1.
- Objem +20 % (~118 výzev za 12h směnu, realita ~122). Věk v tisku je v 80 % ročník. Telefon je ve formátu `0999xxxxxx` (fiktivní rozsah).
- 20 % popisů míst zůstává bez diakritiky (Vojta potvrdil, že to odpovídá realitě).

**Posádky a oblasti:** číslování oblastí jako v systému (1 ČB, 2 JH, 3 PI, 4 PT, 5 ST, 6 TA, 7 ČK). Reálné názvy výjezdových skupin (`RZP1`, `RV1`, `CB VLTAVA RZP`, `TA_RZP2`, `PISEK_RV`, `TREBON 2`, `CB_Z 1`…), viz `ZOS_DATA.crewNames`.

**Opravené chyby z předchozí verze (odhalené novými daty):**
- RZP na místě odvezla pacienta po zemi, i když ho současně převzala LZS (pacient převážen dvakrát). Teď RZP čeká na rozhodnutí LZS a po odletu se uvolní.
- Případ N2 s LZS místo RV se nikdy neuzavřel (pravidlo „chybí RV“ nebralo LZS jako lékaře).
- Oddělení „undefined“ u popáleninového centra; text „čeká na heliportu NEM ČB“ u jiných heliportů.
- Test apnoe hledal kombinaci, která v reálných datech neexistuje; test si ji teď sestaví sám.

**Otevřené otázky pro Vojtu:** „LIBERO“ skupiny (TA LIBERO, VI LIBERO, CB LIBERO) – co to je a mají být ve hře? Jak má probíhat předání pacienta z LZS na FNKV (Praha) – heliport přímo v nemocnici, nebo převozní posádka? Teď jede převozní RZP z JčK až do Prahy.
