# Ověření polohy v hovoru calltakera

Generováno příkazem `node tests/calltaker_lokace_test.js --ukaz`. Pravidlový „volající“ odpovídá na volné české otázky jen z faktů, která by dostal jazykový model (`view.lokace`); „hráč“ z odpovědí hledá místo na herní mapě (adresní body, POI, silniční síť, kruh AML) a výsledek se porovná s pravdou (`key.lokace`). Ověřuje se tím, že fakta vedou k místu více cestami a nic nevkládá otázka. Neověřuje se jazykový model ani hlas.

**Co v datech chybí a proto se nevymýšlí:** řeky a břehy, turistické značky, rozcestníky, vjezdy a brány areálů, parkoviště. U terénu se místo hledá z výchozí obce nebo POI (rozhledna, tábořiště, ubytování), odhadu času a mapy v mobilu. Kde není podklad, volající poctivě neví.

```
===== ADRESA (seed 2, dcera, pravda: Sokolská 577, Ledenice) =====
AML (co vidí hráč): kruh 133 m
Volající sám začne: jsi v obci Ledenice

  -- cesta A --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi v obci Ledenice
  Hráč: Jaká je tam adresa?
  Volající [dotaz]: Sokolská 577, Ledenice  [znáš ji zpaměti]
  => hráč najde: adresa Sokolská 577, Ledenice, chyba 0 m → NAJDE SE

  -- cesta B --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi v obci Ledenice
  Hráč: Podívejte se na číslo domu.
  Volající [dotaz]: 577
  Hráč: A jak se jmenuje ta ulice?
  Volající [dotaz]: Sokolská
  => hráč najde: ulice + číslo + obec, chyba 0 m → NAJDE SE

===== NAVSTEVA (seed 1561, soused, pravda: Dukelská 697/72, České Budějovice) =====
AML (co vidí hráč): kruh 0 m
Volající sám začne: jsi na návštěvě v obci České Budějovice, adresu zpaměti nevíš

  -- cesta A --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi na návštěvě v obci České Budějovice, adresu zpaměti nevíš
  Hráč: Jaká je tam adresa?
  Volající [dotaz]: Dukelská 697/72, České Budějovice  [otevřeš zprávu s adresou (chvíli ji hledáš)]
  => hráč najde: adresa Dukelská 697/72, České Budějovice, chyba 0 m → NAJDE SE

  -- cesta B --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi na návštěvě v obci České Budějovice, adresu zpaměti nevíš
  Hráč: Jaká je tam ulice?
  Volající [dotaz]: Dukelská  [ve zprávě]
  Hráč: A jaké číslo domu?
  Volající [dotaz]: 697/72  [ve zprávě nebo na domě]
  => hráč najde: ulice + číslo + obec, chyba 0 m → NAJDE SE

===== JINDE (seed 1, manželka, pravda: Radvánov 58, Kovářov) =====
AML (co vidí hráč): kruh 50 m, střed je u TELEFONU VOLAJÍCÍHO, 20541 m od pacienta
Volající sám začne: voláš kvůli příbuznému, který je jinde než ty, v obci Kovářov

  -- cesta A --
  Hráč: Odkud voláte?
  Volající [dotaz]: jsi doma, Zahradní 272, Jistebnice (asi 21 km od pacienta)
  Hráč: Jaká je adresa pacienta?
  Volající [dotaz]: Radvánov 58, Kovářov (adresu příbuzného znáš, je to jeho domov)
  => hráč najde: adresa Radvánov 58, Kovářov, chyba 0 m → NAJDE SE

  -- cesta B --
  Hráč: Kde přesně je pacient?
  Volající [dotaz]: je u sebe doma v obci Kovářov (přesnou adresu řekneš na dotaz na adresu)
  Hráč: Jaká je tam ulice?
  Volající [dotaz]: Radvánov
  Hráč: A číslo domu?
  Volající [dotaz]: 58
  => hráč najde: ulice + číslo + obec, chyba 0 m → NAJDE SE

===== PODNIK (seed 7, svědkyně, pravda: Domoradická 124, Český Krumlov (Flaga LPG plyn)) =====
AML (co vidí hráč): kruh 39 m
Volající sám začne: jsi u čerpací stanice v obci Český Krumlov

  -- cesta A --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi u čerpací stanice v obci Český Krumlov
  Hráč: Jak se to místo jmenuje?
  Volající [dotaz]: Flaga LPG plyn  [podíváš se na nápis nebo štít a přečteš ho]
  Hráč: Na jaké ulici to je?
  Volající [dotaz]: Domoradická 124  [přečteš ji z cedule s názvem ulice nebo z čísla na budově]
  => hráč najde: POI „Flaga LPG plyn“ v Český Krumlov, chyba 5 m → NAJDE SE

  -- cesta B --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi u čerpací stanice v obci Český Krumlov
  Hráč: Jaká je tam adresa, přečtěte to z cedule.
  Volající [dotaz]: Domoradická 124  [přečteš ji z cedule s názvem ulice nebo z čísla na budově]
  => hráč najde: adresa podniku Domoradická 124, Český Krumlov, chyba 5 m → NAJDE SE

===== SILNICE (seed 74, kolemjdoucí, pravda: silnice II. třídy, okolí obce České Budějovice) =====
AML (co vidí hráč): kruh 1766 m
Volající sám začne: jedeš po silnici, naposledy jsi projel(a) obec Lišov směrem na Borek

  -- cesta A --
  Hráč: Kde přesně jste?
  Volající [hned]: jedeš po silnici, naposledy jsi projel(a) obec Lišov směrem na Borek
  Hráč: Kterým směrem jedete?
  Volající [dotaz]: jedeš směrem na Borek, naposledy jsi projel(a) obec Lišov  [víš to z cesty]
  Hráč: Kterou obcí jste naposledy projel?
  Volající [dotaz]: Lišov (asi kilometr zpátky)  [víš to z cesty]
  => hráč najde: trasa Lišov → Borek po 1044 m, chyba 7 m → NAJDE SE

  -- cesta B --
  Hráč: Kde přesně jste?
  Volající [hned]: jedeš po silnici, naposledy jsi projel(a) obec Lišov směrem na Borek
  Hráč: Otevřete mapu v mobilu, co vám ukazuje?
  Volající [dotaz]: nejbližší obec Lišov (asi kilometr západně); třída silnice: silnice II. třídy  [otevřeš mapu v mobilu a podíváš se na modrou tečku (chvíli to trvá)]
  Hráč: Co tam vidíte kolem?
  Volající [dotaz]: nic konkrétního nevidíš ani nevíš  [rozhlédneš se; neřekneš nic nad rámec toho, co tu stojí, a s nejistotou]
  => hráč najde: obec Lišov + 1 km západně, chyba 41 m → NAJDE SE

===== TEREN (seed 39, pacient sám, pravda: polní / lesní cesta, okolí obce Jindřichův Hradec) =====
AML (co vidí hráč): kruh 37 m
Volající sám začne: jsi v terénu mimo zástavbu a vyšel(a) jsi od obce Zahrádky

  -- cesta A --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi v terénu mimo zástavbu a vyšel(a) jsi od obce Zahrádky
  Hráč: Odkud jste vyšli?
  Volající [dotaz]: Zahrádky (odtud jsi vyšel(a))  [víš to, je to začátek cesty]
  Hráč: Jak dlouho už jdete?
  Volající [dotaz]: jdeš už asi 2 hodiny (odhad, hodinky neřešíš)  [odhadneš]
  => hráč najde: jen okolí „Zahrádky“ (úsek, ne bod), chyba 2512 m → JEN ÚSEK

  -- cesta B --
  Hráč: Kde přesně jste?
  Volající [hned]: jsi v terénu mimo zástavbu a vyšel(a) jsi od obce Zahrádky
  Hráč: Otevřete mapu v mobilu, co vám ukazuje?
  Volající [dotaz]: nejbližší obec Zahrádky (asi 2,5 km severně)  [otevřeš mapu v mobilu (chvíli to trvá, signál bývá slabý)]
  Hráč: Zůstali jste na cestě?
  Volající [dotaz]: zůstal(a) jsi na cestě, nesešel(a) jsi z ní
  => hráč najde: obec Zahrádky + 2.5 km severně, chyba 942 m → NAJDE SE

SOUHRN (40 případů na scénář; tolerance: dům 60 m, podnik 120 m, silnice 200 m, terén 1000 m; „BLÍZKO“ do trojnásobku):
  adresa    n=40 | cesta A {"NAJDE SE":39,"MIMO":1} medián chyby 0 m | cesta B {"NAJDE SE":37,"MIMO":1,"JEN ÚSEK":2} medián 0 m | aspoň jednou: {"NAJDE SE":39,"MIMO":1}
  navsteva  n=29 | cesta A {"NAJDE SE":29} medián chyby 0 m | cesta B {"NAJDE SE":29} medián 0 m | aspoň jednou: {"NAJDE SE":29}
  jinde     n=40 | cesta A {"NAJDE SE":40} medián chyby 0 m | cesta B {"NAJDE SE":40} medián 0 m | aspoň jednou: {"NAJDE SE":40}
  podnik    n=40 | cesta A {"NAJDE SE":39,"NEJEDNOZNAČNÉ":1} medián chyby 10 m | cesta B {"NAJDE SE":35,"BLÍZKO (hledání)":2,"NEJEDNOZNAČNÉ":1,"MIMO":2} medián 12 m | aspoň jednou: {"NAJDE SE":39,"NEJEDNOZNAČNÉ":1}
  silnice   n=40 | cesta A {"NAJDE SE":11,"JEN ÚSEK":27,"NIC":1,"MIMO":1} medián chyby 1484 m | cesta B {"NAJDE SE":17,"BLÍZKO (hledání)":17,"MIMO":6} medián 283 m | aspoň jednou: {"NAJDE SE":23,"BLÍZKO (hledání)":11,"JEN ÚSEK":5,"MIMO":1}
  teren     n=40 | cesta A {"JEN ÚSEK":40} medián chyby 1399 m | cesta B {"NAJDE SE":32,"MIMO":6,"BLÍZKO (hledání)":2} medián 221 m | aspoň jednou: {"NAJDE SE":32,"JEN ÚSEK":6,"BLÍZKO (hledání)":2}
ok: všechny scénáře polohy se vyskytují (adresa, návštěva, odjinud, podnik, silnice, terén)
ok: scénář adresa: místo se najde na mapě aspoň jednou cestou (98 %)
ok: scénář navsteva: místo se najde na mapě aspoň jednou cestou (100 %)
ok: scénář jinde: místo se najde na mapě aspoň jednou cestou (100 %)
ok: scénář podnik: místo se najde nebo je blízko (98 %), zbytek je poctivě „nejednoznačné“ u stejnojmenných poboček
ok: podnik: špatný bod bez varování nejvýš ve 7,5 % (stejná ulice v jiné části obce)
ok: silnice: aspoň úsek vždy, špatný bod (MIMO) jen výjimečně
ok: terén: aspoň úsek vždy (bez značek a rozcestníků se nic víc nevymýšlí)
ok: pasti (Lidl, špatná obec, špatná pobočka) volající nepotvrdí ani nepřevezme (90 hovorů × 3 otázky)
ok: AML (mobil) a adresa účastníka (pevná linka) odjinud volajícího leží u jeho telefonu, ne u pacienta (348/356)
ok: pravda pro posádku zůstává u pacienta, volající je označen jako jinde
ok: volající odjinud nepopisuje stav, který nevidí
ok: při opakovaném hovoru a zpětném volání už volající ví, co zjistil (48 případů)
ok: druhý svědek je jinde než pacient a ví o odstupu (24 případů)
VŠE V POŘÁDKU
```

## Průchod v prohlížeči (lokální `site/`, režim calltaker, textový hovor)

**Odpovídal testovací skript, ne jazykový model.** Klíč k OpenAI jsem neměl, takže odpověď na každou větu z textového pole vybral pravidlový „volající“ (stejná pravidla jako v `tests/calltaker_lokace_test.js`) z faktů hovoru. UI, přepis, zápis zjištěného, AML kruh na mapě a herní výpočet chyby polohy (`_ctLocate`) jsou skutečné. Připravil jsem jen seed hovoru (nastavení `seed` ringujícího hovoru) a odeslání formuláře u prvního hovoru jsem udělal voláním enginu (skutečný formulář vyžaduje klasifikaci v pavoukovi).

### Opakovaný hovor (seed 7, čerpací stanice „Flaga LPG plyn“, Český Krumlov)
První hovor: hráč se zeptal „Kde přesně jste?“ a „Na jaké ulici to je?“ (volající musel hledat: „Moment, podívám se… Domoradická 124“). Název místa se nezeptal. UI zapsalo do hovoru `zjisteno: ["ulice"]`. Opakovaný hovor (`opak`) zdědil přesně to:
- „Na jaké ulici to je?“ → odpověď hned, bez hledání (už věděl),
- „Jak se to místo jmenuje?“ → „Moment, podívám se… Flaga LPG plyn“ (musí hledat, nezaznělo),
- „Není tam vedle vás Lidl?“ → „To tu nevidím, to nevím.“ (nic se nevložilo do paměti).
Po tomto hovoru je v `zjisteno` i `nazev`.

### Nepřesná poloha (silnice, AML jen buňka ±1,8 km, volající nezná směr)
Hráč slyšel: „jsem u silnice poblíž Stožec“; na směr jízdy a poslední obec „nevím“; na „Jste u obce Bohušovice?“ „To tu nevidím“; po otevření mapy v mobilu „nejbližší obec Stožec, 5,5 km jihozápadně, místní komunikace“; kolem „nic konkrétního“. Na mapě viděl jen červený kruh buňky (±1,8 km u Haidmühle a Stožce). Podle toho mohl poslat posádku: na střed kruhu (herní chyba 1,4 km, tolerance 200 m, posádka by místo nenašla a hledala), nebo na bod „5,5 km jihozápadně od Stožce“ (chyba 4 km). Nejlepší je jet do kruhu a čekat na zpřesnění AML, které tady nedorazilo. Hra to tedy správně počítá jako špatně lokalizovaný případ.

### Co se při tom našlo
- Formulace „nejbližší obec X (asi 5,5 km jihozápadně)“ nebyla jednoznačná (kdo je kde). Opraveno na „ty jsi od ní asi 5,5 km jihozápadně“.
- Vzdálenosti k obci se měří od středu adresních bodů, ne od popisku obce na herní mapě; ten bývá o kilometr jinde. Hráč, který měří od popisku, se mýlí víc, než by chtěl.
- Směr se zaokrouhluje na 8 stran; při 5 km to je i přes 2 km příčně.
- Stávající generátor případů popisuje tuto polohu jako „okolí obce České Budějovice“, ačkoli leží u Stožce (`nearTown` v `src/sim-cases.js` váží města a bere i vzdálená). Do jádra jsem nesahal.
