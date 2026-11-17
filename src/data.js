// ZOS simulátor – data (síť základen vychází z veřejné tabulky ZZS JčK, listopad 2026).
// Souřadnice jsou přibližné. Případy, jména a adresy jsou vymyšlené.

const ZOS_DATA = {
  oblasti: [
    // pořadí oblastí v panelu posádek (ČB, JH, TA nahoře) a číslování jako na ZOS (radio = první číslice volacího čísla; LZS 0013)
    { id: 'ČB', name: 'České Budějovice', radio: 1 },
    { id: 'JH', name: 'Jindřichův Hradec', radio: 3 },
    { id: 'TA', name: 'Tábor', radio: 2 },
    { id: 'ČK', name: 'Český Krumlov', radio: 5 },
    { id: 'PT', name: 'Prachatice', radio: 4 },
    { id: 'ST', name: 'Strakonice', radio: 6 },
    { id: 'PI', name: 'Písek', radio: 7 },
  ],

  // day / night = { rzp, rv }. zzum = superzáchranáři (zzumConfirmed false = nepotvrzeno).
  // flexRlp = RZP, které může jet jako RLP po přibrání lékaře (v prototypu bez dopadu).
  stations: [
    { id: 'cb', oblast: 'ČB', name: 'České Budějovice', short: 'ČB', lat: 48.96638, lon: 14.47035, day: { rzp: 3, rv: 2 }, night: { rzp: 3, rv: 2 } },
    { id: 'cbpr', oblast: 'ČB', name: 'ČB – Pražská', short: 'ČB Pražská', lat: 48.99902, lon: 14.48112, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'cbpl', oblast: 'ČB', name: 'ČB – Planá', short: 'ČB Planá', lat: 48.94395, lon: 14.44425, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'cbvl', oblast: 'ČB', name: 'ČB – Vltava', short: 'ČB Vltava', lat: 48.99162, lon: 14.45038, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'kaplice', oblast: 'ČB', name: 'Kaplice', short: 'Kaplice', lat: 48.7396, lon: 14.4953, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'tyn', oblast: 'ČB', name: 'Týn nad Vltavou', short: 'Týn n. V.', lat: 49.2222, lon: 14.4217, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'tsviny', oblast: 'ČB', name: 'Trhové Sviny', short: 'T. Sviny', lat: 48.8385, lon: 14.63607, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true },

    { id: 'ck', oblast: 'ČK', name: 'Český Krumlov', short: 'ČK', lat: 48.81123, lon: 14.32487, day: { rzp: 2, rv: 1 }, night: { rzp: 2, rv: 1 } },
    { id: 'hplana', oblast: 'ČK', name: 'Horní Planá', short: 'H. Planá', lat: 48.7686, lon: 14.0319, day: { rzp: 1, rv: 0 }, night: { rzp: 0, rv: 0 } },
    { id: 'vbrod', oblast: 'ČK', name: 'Vyšší Brod', short: 'V. Brod', lat: 48.62, lon: 14.3086, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true },
    { id: 'frymburk', oblast: 'ČK', name: 'Frymburk', short: 'Frymburk', lat: 48.66557, lon: 14.16538, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true },

    { id: 'jh', oblast: 'JH', name: 'Jindřichův Hradec', short: 'JH', lat: 49.14007825722378, lon: 15.005211411223875, day: { rzp: 3, rv: 1 }, night: { rzp: 2, rv: 1 } },
    { id: 'kunzak', oblast: 'JH', name: 'Kunžak', short: 'Kunžak', lat: 49.11736, lon: 15.1895, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'dacice', oblast: 'JH', name: 'Dačice', short: 'Dačice', lat: 49.0817, lon: 15.4358, day: { rzp: 1, rv: 1 }, night: { rzp: 1, rv: 1 } },
    { id: 'trebon', oblast: 'JH', name: 'Třeboň', short: 'Třeboň', lat: 49.00496, lon: 14.7614, day: { rzp: 2, rv: 1 }, night: { rzp: 1, rv: 1 } },
    { id: 'suchdol', oblast: 'JH', name: 'Suchdol nad Lužnicí', short: 'Suchdol', lat: 48.8892, lon: 14.8978, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },

    { id: 'pt', oblast: 'PT', name: 'Prachatice', short: 'PT', lat: 49.0128, lon: 13.997, day: { rzp: 2, rv: 1 }, night: { rzp: 2, rv: 1 } },
    { id: 'vimperk', oblast: 'PT', name: 'Vimperk', short: 'Vimperk', lat: 49.0561, lon: 13.7708, day: { rzp: 2, rv: 0 }, night: { rzp: 2, rv: 0 }, flexRlp: true },
    { id: 'volary', oblast: 'PT', name: 'Volary', short: 'Volary', lat: 48.9094, lon: 13.8947, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true, zzumConfirmed: false },
    { id: 'vacov', oblast: 'PT', name: 'Vacov', short: 'Vacov', lat: 49.1467, lon: 13.6797, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'lhenice', oblast: 'PT', name: 'Lhenice', short: 'Lhenice', lat: 49.0042, lon: 14.1665, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },

    { id: 'st', oblast: 'ST', name: 'Strakonice', short: 'ST', lat: 49.2614, lon: 13.9022, day: { rzp: 3, rv: 1 }, night: { rzp: 2, rv: 1 } },
    { id: 'blatna', oblast: 'ST', name: 'Blatná', short: 'Blatná', lat: 49.4247, lon: 13.8844, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, flexRlp: true },
    { id: 'vodnany', oblast: 'ST', name: 'Vodňany', short: 'Vodňany', lat: 49.14646, lon: 14.1767, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true, zzumConfirmed: false },

    { id: 'pi', oblast: 'PI', name: 'Písek', short: 'PI', lat: 49.3088, lon: 14.1475, day: { rzp: 3, rv: 1 }, night: { rzp: 2, rv: 1 } },
    { id: 'milevsko', oblast: 'PI', name: 'Milevsko', short: 'Milevsko', lat: 49.4506, lon: 14.3606, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, flexRlp: true },
    { id: 'cimelice', oblast: 'PI', name: 'Čimelice', short: 'Čimelice', lat: 49.465, lon: 14.0319, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },

    { id: 'ta', oblast: 'TA', name: 'Tábor', short: 'TA', lat: 49.40632, lon: 14.69382, day: { rzp: 3, rv: 1 }, night: { rzp: 3, rv: 1 } },
    { id: 'sobeslav', oblast: 'TA', name: 'Soběslav', short: 'Soběslav', lat: 49.2594, lon: 14.7194, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'mvozice', oblast: 'TA', name: 'Mladá Vožice', short: 'M. Vožice', address: 'Plaňková 420', lat: 49.5321, lon: 14.80855, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'oparany', oblast: 'TA', name: 'Opařany', short: 'Opařany', lat: 49.4361, lon: 14.4958, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 } },
    { id: 'veseli', oblast: 'TA', name: 'Veselí nad Lužnicí', short: 'Veselí', lat: 49.1853, lon: 14.6931, day: { rzp: 1, rv: 0 }, night: { rzp: 1, rv: 0 }, zzum: true },
  ],

  lzs: {
    id: 'lzs', name: 'LZS Planá', short: 'LZS', oblast: 'ČB', lat: 48.9441617, lon: 14.4448708,
    // Konstanty z kalkulátoru časové úspory LZS (dispečerský web): rychlost, vzlet ve dne / v noci, předání pacienta a zpoždění nemocnic.
    // Den a noc podle občanského úsvitu a soumraku u základny. Prahy indikace letu: úspora ≥ 15 min „Ano“, ≥ 10 min „Možná“.
    speedKmh: 215, takeoffDay: 180, takeoffNight: 600, handoverSec: 600, savedMinimal: 10, savedOptimal: 15,
    hospitalDelaySec: { 'h-cb': 480, 'h-jh': 180, 'h-pi': 360, 'h-ta': 360 },
    activationDay: [180, 180], activationNight: [600, 600],
    // LKCC, aktuálně publikovaný heliport u NEM ČB; souřadnice z VFR příručky AIM.
    heliport: { name: 'Heliport NEM ČB (LKCC)', lat: 48.962036, lon: 14.462650 },
  },
  // Modelované žádosti o výpomoc; letištní/heliportové souřadnice jsou veřejné orientační body.
  lzsSupport: [
    { id: 'lzs-jihlava', name: 'LZS Jihlava (výpomoc)', code: 'KR12', oblast: 'JH', region: 'VY', lat: 49.39853, lon: 15.56794, dayOnly: true, activationDay: [150, 210] },
    { id: 'lzs-praha', name: 'LZS Praha (výpomoc)', code: 'KR01', oblast: 'ČB', region: 'SC', lat: 50.1008, lon: 14.26, activationDay: [150, 210], activationNight: [360, 480] },
    { id: 'lzs-plzen', name: 'LZS Plzeň (výpomoc)', code: 'KR07', oblast: 'ST', region: 'PL', lat: 49.6753, lon: 13.2744, activationDay: [150, 210], activationNight: [360, 480] },
    // zahraniční LZS (Rakousko, Bavorsko): modelované orientační základny, volací znaky fiktivní
    { id: 'lzs-linz', name: 'LZS Linz (Horní Rakousko)', code: 'KR90', oblast: 'ČB', region: 'HR', foreign: true, lat: 48.2332, lon: 14.1875, activationDay: [240, 360], activationNight: [420, 600] },
    { id: 'lzs-krems', name: 'LZS Krems (Dolní Rakousko)', code: 'KR91', oblast: 'JH', region: 'DR', foreign: true, lat: 48.4086, lon: 15.6139, dayOnly: true, activationDay: [240, 360] },
    { id: 'lzs-straubing', name: 'LZS Straubing (Bavorsko)', code: 'KR92', oblast: 'ST', region: 'BY', foreign: true, lat: 48.8997, lon: 12.5517, activationDay: [240, 360], activationNight: [420, 600] },
  ],
  // Sousední kraje a země (mezikrajská spolupráce). Rakousko a Bavorsko: jen LZS, pozemní pomoc ze zahraničí se prakticky nepoužívá.
  neighbors: {
    VY: { name: 'Kraj Vysočina', short: 'Vysočina', sign: 'ZOS Vysočina' }, PL: { name: 'Plzeňský kraj', short: 'Plzeňský', sign: 'ZOS Plzeň' },
    SC: { name: 'Středočeský kraj', short: 'Středočeský', sign: 'ZOS Střední Čechy' }, BY: { name: 'Bavorsko', short: 'Bavorsko', sign: 'ZOS Bavorsko', foreign: true },
    HR: { name: 'Horní Rakousko', short: 'Horní Rakousko', sign: 'ZOS Horní Rakousko', foreign: true }, DR: { name: 'Dolní Rakousko', short: 'Dolní Rakousko', sign: 'ZOS Dolní Rakousko', foreign: true },
  },
  // Pozemní posádky sousedních krajů na základnách u hranice (jen české kraje; Rakousko a Bavorsko jen LZS).
  // Polohy základen podle veřejné mapy obcí se základnou ZZS (zachrannasluzba.cz); volací znaky jsou fiktivní.
  nbGround: [
    { id: 'nb-vy-tel', name: 'VY Telč RZP', code: '8101', region: 'VY', lat: 49.1832, lon: 15.4543 },
    { id: 'nb-vy-jem', name: 'VY Jemnice RZP', code: '8102', region: 'VY', lat: 49.0190, lon: 15.5699 },
    { id: 'nb-vy-poc', name: 'VY Počátky RZP', code: '8103', region: 'VY', lat: 49.2602, lon: 15.2402 },
    { id: 'nb-vy-pac', name: 'VY Pacov RZP', code: '8104', region: 'VY', lat: 49.4708, lon: 15.0017 },
    { id: 'nb-vy-kam', name: 'VY Kamenice n. L. RZP', code: '8105', region: 'VY', lat: 49.3029, lon: 15.0750 },
    { id: 'nb-pl-sus', name: 'PL Sušice RZP', code: '8201', region: 'PL', lat: 49.2317, lon: 13.5204 },
    { id: 'nb-pl-hor', name: 'PL Horažďovice RZP', code: '8202', region: 'PL', lat: 49.3207, lon: 13.7010 },
    { id: 'nb-pl-nep', name: 'PL Nepomuk RZP', code: '8203', region: 'PL', lat: 49.4862, lon: 13.5823 },
    { id: 'nb-sc-bre', name: 'SČ Březnice RZP', code: '8301', region: 'SC', lat: 49.5576, lon: 13.9506 },
    { id: 'nb-sc-vot', name: 'SČ Votice RZP', code: '8302', region: 'SC', lat: 49.6401, lon: 14.6381 },
    { id: 'nb-sc-kra', name: 'SČ Krásná Hora RZP', code: '8303', region: 'SC', lat: 49.6046, lon: 14.2774 },
    { id: 'nb-sc-sed', name: 'SČ Sedlčany RZP', code: '8304', region: 'SC', lat: 49.6606, lon: 14.4266 },
  ],

  // Sady MU (vozidla pro řešení následků mimořádných událostí), dislokace ČB, Tábor, Strakonice, J. Hradec.
  mu: [
    { id: 'mu-cb', no: 810, name: 'MU ČB', oblast: 'ČB', stationId: 'cb' },
    { id: 'mu-ta', no: 820, name: 'MU Tábor', oblast: 'TA', stationId: 'ta' },
    { id: 'mu-st', no: 840, name: 'MU Strakonice', oblast: 'ST', stationId: 'st' },
    { id: 'mu-jh', no: 830, name: 'MU J. Hradec', oblast: 'JH', stationId: 'jh' },
  ],

  // Záložní vozy (fialové, nepřihlášené). Po aktivaci dispečerem jedou jako RZP.

  // Názvy výjezdových skupin a volací čísla (rzpNo/rvNo) podle dispečerského systému ZZS JčK.
  crewNames: {
    cb: { rzp: ['RZP1', 'RZP2', 'RZP3'], rv: ['RV1', 'RV2'], rzpNo: [127, 135, 126], rvNo: [149, 139] }, cbpr: { rzp: ['CB PRAŽSKÁ RZP'], rzpNo: [118] }, cbpl: { rzp: ['CB PLANÁ RZP'], rzpNo: [114] }, cbvl: { rzp: ['CB VLTAVA RZP'], rzpNo: [123] },
    kaplice: { rzp: ['KAPLICE_RZP'], rzpNo: [117] }, tyn: { rzp: ['TYN N. VLT.'], rzpNo: [121] }, tsviny: { rzp: ['T. SVINY'], rzpNo: [115] },
    ck: { rzp: ['CK_RZP1', 'CK_RZP2'], rv: ['CK_RV'], rzpNo: [518, 513], rvNo: [529] }, hplana: { rzp: ['H. PLANÁ RZP'], rzpNo: [134] }, vbrod: { rzp: ['V. BROD_RZP'], rzpNo: [514] }, frymburk: { rzp: ['FRYMBURK'], rzpNo: [517] },
    jh: { rzp: ['JH_RZP1', 'JH_RZP2', 'JH_RZP3'], rv: ['JH_RV'], rzpNo: [313, 312, 314], rvNo: [319] }, kunzak: { rzp: ['KUNZAK_RZP'], rzpNo: [318] }, dacice: { rzp: ['DACICE'], rv: ['DACICE_RV'], rzpNo: [311], rvNo: [309] },
    trebon: { rzp: ['TREBON', 'TREBON 2'], rv: ['TREBON_RV'], rzpNo: [322, 321], rvNo: [329] }, suchdol: { rzp: ['SUCHDOL'], rzpNo: [320] },
    pt: { rzp: ['PT_RZP1', 'PT_RZP2'], rv: ['PT_RV'], rzpNo: [411, 412], rvNo: [429] }, vimperk: { rzp: ['VIMPERK', 'VIMPERK 2'], rzpNo: [421, 422] }, volary: { rzp: ['VOLARY_RZP'], rzpNo: [415] }, vacov: { rzp: ['VACOV_RZP'], rzpNo: [417] }, lhenice: { rzp: ['LHENICE'], rzpNo: [413] },
    st: { rzp: ['ST_RZP1', 'ST_RZP2', 'ST_RZP3'], rv: ['ST_RV'], rzpNo: [614, 613, 611], rvNo: [629] }, blatna: { rzp: ['BLATNA'], rzpNo: [616] }, vodnany: { rzp: ['VODNANY'], rzpNo: [618] },
    pi: { rzp: ['PISEK_RZP1', 'PISEK_RZP2', 'PISEK_RZP3'], rv: ['PISEK_RV'], rzpNo: [713, 715, 711], rvNo: [719] }, milevsko: { rzp: ['MILEVSKO'], rzpNo: [716] }, cimelice: { rzp: ['CIMELICE_RZP'], rzpNo: [718] },
    ta: { rzp: ['TA_RZP1', 'TA_RZP2', 'TA_RZP3'], rv: ['TA_RV'], rzpNo: [218, 215, 214], rvNo: [219] }, sobeslav: { rzp: ['SOBESLAV'], rzpNo: [224] }, mvozice: { rzp: ['VOZICE_RZP'], rzpNo: [220] }, oparany: { rzp: ['OPARANY_RZP'], rzpNo: [212] }, veseli: { rzp: ['VESELI'], rzpNo: [225] },
  },
  // Adresa cloudflare Workeru s hlasem Azure (viz cloudflare/README.md); prázdné = jen offline Piper. Hráč ji může přepsat v Nastavení.
  ttsUrl: 'https://zos-tts.zos-vojtech.workers.dev',
  // First respondeři (FR): jednotky, které mohou dorazit k pacientovi dřív než ZZS a převzít TANR od svědků.
  // Typy: HZS (profesionální), JPO2/JPO3 (obecní/dobrovolní), JPO4 (závodní), PCR (hlídka), VZS (vodní záchranná služba), HS (horská služba). Souřadnice dodal uživatel.
  frTypes: {
    HZS: { label: 'HZS', turnout: [60, 120] }, JPO2: { label: 'JPO II', turnout: [120, 240] }, JPO3: { label: 'JPO III', turnout: [240, 420] }, JPO4: { label: 'JPO IV', turnout: [90, 150] },
    PCR: { label: 'Policie ČR', turnout: [60, 180] }, VZS: { label: 'VZS', turnout: [180, 360] }, HS: { label: 'Horská služba', turnout: [240, 480] },
  },
  fr: [
    { id: 'fr-hzs-blatna', type: 'HZS', name: 'HZS Blatná', lat: 49.423886, lon: 13.887475 },
    { id: 'fr-hzs-ceske-budejovice', type: 'HZS', name: 'HZS České Budějovice', lat: 48.987497, lon: 14.472983 },
    { id: 'fr-hzs-cesky-krumlov', type: 'HZS', name: 'HZS Český Krumlov', lat: 48.824814, lon: 14.336519 },
    { id: 'fr-hzs-dacice', type: 'HZS', name: 'HZS Dačice', lat: 49.08835, lon: 15.428025 },
    { id: 'fr-hzs-jindrichuv-hradec', type: 'HZS', name: 'HZS Jindřichův Hradec', lat: 49.150447, lon: 15.0129 },
    { id: 'fr-hzs-frymburk', type: 'HZS', name: 'HZS Frymburk', lat: 48.665911, lon: 14.165133 },
    { id: 'fr-hzs-kaplice', type: 'HZS', name: 'HZS Kaplice', lat: 48.738272, lon: 14.490967 },
    { id: 'fr-hzs-kremze', type: 'HZS', name: 'HZS Křemže', lat: 48.906403, lon: 14.305278 },
    { id: 'fr-hzs-milevsko', type: 'HZS', name: 'HZS Milevsko', lat: 49.444533, lon: 14.364033 },
    { id: 'fr-hzs-pisek', type: 'HZS', name: 'HZS Písek', lat: 49.319856, lon: 14.160994 },
    { id: 'fr-hzs-prachatice', type: 'HZS', name: 'HZS Prachatice', lat: 49.0215, lon: 13.993667 },
    { id: 'fr-hzs-sobeslav', type: 'HZS', name: 'HZS Soběslav', lat: 49.262939, lon: 14.722622 },
    { id: 'fr-hzs-strakonice', type: 'HZS', name: 'HZS Strakonice', lat: 49.252983, lon: 13.919367 },
    { id: 'fr-hzs-suche-vrbne', type: 'HZS', name: 'HZS Suché Vrbné', lat: 48.970828, lon: 14.505342 },
    { id: 'fr-hzs-tabor', type: 'HZS', name: 'HZS Tábor', lat: 49.406283, lon: 14.693811 },
    { id: 'fr-hzs-trhove-sviny', type: 'HZS', name: 'HZS Trhové Sviny', lat: 48.8428, lon: 14.639842 },
    { id: 'fr-hzs-trebon', type: 'HZS', name: 'HZS Třeboň', lat: 49.008919, lon: 14.782464 },
    { id: 'fr-hzs-tyn-nad-vltavou', type: 'HZS', name: 'HZS Týn nad Vltavou', lat: 49.227539, lon: 14.406575 },
    { id: 'fr-hzs-vimperk', type: 'HZS', name: 'HZS Vimperk', lat: 49.054281, lon: 13.796053 },
    { id: 'fr-hzs-vodnany', type: 'HZS', name: 'HZS Vodňany', lat: 49.148564, lon: 14.179014 },
    { id: 'fr-jpo-ii-ceske-velenice', type: 'JPO2', name: 'JPO II České Velenice', lat: 48.7705, lon: 14.9614 },
    { id: 'fr-jpo-ii-mirovice', type: 'JPO2', name: 'JPO II Mirovice', lat: 49.517734, lon: 14.039447 },
    { id: 'fr-jpo-ii-suchdol-nad-luznici', type: 'JPO2', name: 'JPO II Suchdol nad Lužnicí', lat: 48.89622, lon: 14.88115 },
    { id: 'fr-jpo-ii-velesin', type: 'JPO2', name: 'JPO II Velešín', lat: 48.830758, lon: 14.458195 },
    { id: 'fr-jpo-iii-bechyne', type: 'JPO3', name: 'JPO III Bechyně', lat: 49.297828, lon: 14.466403 },
    { id: 'fr-jpo-iii-cerna-v-posumavi', type: 'JPO3', name: 'JPO III Černá v Pošumaví', lat: 48.737344, lon: 14.112255 },
    { id: 'fr-jpo-iii-dolni-bukovsko', type: 'JPO3', name: 'JPO III Dolní Bukovsko', lat: 49.168409, lon: 14.583712 },
    { id: 'fr-jpo-iii-nova-bystrice', type: 'JPO3', name: 'JPO III Nová Bystřice', lat: 49.018918, lon: 15.107096 },
    { id: 'fr-jpo-iii-horni-plana', type: 'JPO3', name: 'JPO III Horní Planá', lat: 48.76491858870301, lon: 14.03128295285233 },
    { id: 'fr-jpo-iii-horice-na-sumave', type: 'JPO3', name: 'JPO III Hořice na Šumavě', lat: 48.765852, lon: 14.176655 },
    { id: 'fr-jpo-iii-jistebnice', type: 'JPO3', name: 'JPO III Jistebnice', lat: 49.485528, lon: 14.530331 },
    { id: 'fr-jpo-iii-kardasova-recice', type: 'JPO3', name: 'JPO III Kardašova Řečice', lat: 49.180594, lon: 14.850203 },
    { id: 'fr-jpo-iii-malonty', type: 'JPO3', name: 'JPO III Malonty', lat: 48.685938481072505, lon: 14.579959974083454 },
    { id: 'fr-jpo-iii-mlada-vozice', type: 'JPO3', name: 'JPO III Mladá Vožice', lat: 49.531864, lon: 14.805819 },
    { id: 'fr-jpo-iii-nova-pec', type: 'JPO3', name: 'JPO III Nová Pec', lat: 48.7893478, lon: 13.9468353 },
    { id: 'fr-jpo-iii-nova-vcelnice', type: 'JPO3', name: 'JPO III Nová Včelnice', lat: 49.239971, lon: 15.067883 },
    { id: 'fr-jpo-iii-netolice', type: 'JPO3', name: 'JPO III Netolice', lat: 49.05108, lon: 14.19727 },
    { id: 'fr-jpo-iii-nove-hrady', type: 'JPO3', name: 'JPO III Nové Hrady', lat: 48.789324, lon: 14.777429 },
    { id: 'fr-jpo-iii-slavonice', type: 'JPO3', name: 'JPO III Slavonice', lat: 48.996886, lon: 15.354867 },
    { id: 'fr-jpo-iii-volary', type: 'JPO3', name: 'JPO III Volary', lat: 48.912286, lon: 13.894565 },
    { id: 'fr-jpo-iii-zliv', type: 'JPO3', name: 'JPO III Zliv', lat: 49.070306, lon: 14.370856 },
    { id: 'fr-jpo-iv-je-temelin', type: 'JPO4', name: 'JPO IV JE Temelín', lat: 49.1804511, lon: 14.3851681 },
    { id: 'fr-policie-cr-cimelice', type: 'PCR', name: 'Policie ČR Čimelice', lat: 49.462615, lon: 14.068909 },
    { id: 'fr-policie-cr-hluboka-nad-vltavou', type: 'PCR', name: 'Policie ČR Hluboká nad Vltavou', lat: 49.053387, lon: 14.432267 },
    { id: 'fr-policie-cr-horni-vltavice', type: 'PCR', name: 'Policie ČR Horní Vltavice', lat: 48.956902, lon: 13.758373 },
    { id: 'fr-policie-cr-lipno-nad-vltavou', type: 'PCR', name: 'Policie ČR Lipno nad Vltavou', lat: 48.636041, lon: 14.198883 },
    { id: 'fr-policie-cr-lisov', type: 'PCR', name: 'Policie ČR Lišov', lat: 49.015511, lon: 14.607986 },
    { id: 'fr-policie-cr-protivin', type: 'PCR', name: 'Policie ČR Protivín', lat: 49.202675, lon: 14.215544 },
    { id: 'fr-policie-cr-radomysl', type: 'PCR', name: 'Policie ČR Radomyšl', lat: 49.317507, lon: 13.932554 },
    { id: 'fr-policie-cr-veseli-nad-luznici', type: 'PCR', name: 'Policie ČR Veselí nad Lužnicí', lat: 49.186748, lon: 14.698454 },
    { id: 'fr-policie-cr-volyne', type: 'PCR', name: 'Policie ČR Volyně', lat: 49.164867, lon: 13.88282 },
    { id: 'fr-policie-cr-zvikovske-podhradi', type: 'PCR', name: 'Policie ČR Zvíkovské Podhradí', lat: 49.428627, lon: 14.199694 },
    { id: 'fr-vzs-dolni-vltavice', type: 'VZS', name: 'VZS Dolní Vltavice', lat: 48.697395546118216, lon: 14.075189440152455 },
    { id: 'fr-vzs-modrin', type: 'VZS', name: 'VZS Modřín', lat: 48.63889691553721, lon: 14.209769090120071 },
    { id: 'fr-vzs-orlik', type: 'VZS', name: 'VZS Orlík', lat: 49.51846119057117, lon: 14.184114735614859 },
    { id: 'fr-horska-sluzba-kramolin', type: 'HS', name: 'Horská služba Kramolín', lat: 48.652881, lon: 14.231375 },
    { id: 'fr-horska-sluzba-kubova-hut', type: 'HS', name: 'Horská služba Kubova Huť', lat: 48.980964, lon: 13.769958 },
    { id: 'fr-horska-sluzba-kvilda', type: 'HS', name: 'Horská služba Kvilda', lat: 49.015836, lon: 13.579603 },
    { id: 'fr-horska-sluzba-nova-pec', type: 'HS', name: 'Horská služba Nová Pec', lat: 48.778281, lon: 13.929492 },
    { id: 'fr-horska-sluzba-zadov', type: 'HS', name: 'Horská služba Zadov', lat: 49.066786, lon: 13.629931 },
  ],
  // LIBERO: volný lékař na základně, jen přes den a ne vždy. Lze ho přidat do RZP téže základny → dočasně RLP.
  libero: [
    { id: 'lib-cb', name: 'CB LIBERO', oblast: 'ČB', stationId: 'cb', no: 176 },
    { id: 'lib-jh', name: 'JH LIBERO', oblast: 'JH', stationId: 'jh' },
    { id: 'lib-pt', name: 'PT LIBERO', oblast: 'PT', stationId: 'pt' },
    { id: 'lib-vi', name: 'VI LIBERO', oblast: 'PT', stationId: 'vimperk', no: 440 },
    { id: 'lib-st', name: 'ST LIBERO', oblast: 'ST', stationId: 'st', no: 658 },
    { id: 'lib-pi', name: 'PI LIBERO', oblast: 'PI', stationId: 'pi', no: 755 },
    { id: 'lib-ta', name: 'TA LIBERO', oblast: 'TA', stationId: 'ta' },
  ],
  // Plán směn podle dne v týdnu: posádky (stanice + typ) mimo provoz celý směnový den (7:00–7:00)
  weeklyOff: [{ st: 'dacice', type: 'RV', days: ['po', 'út'] }],
  liberoPresence: 0.75,   // výchozí pravděpodobnost, že je LIBERO daný den obsazené (nastavitelné na úvodní obrazovce)
  reserves: [
    { id: 'z-cb1', name: 'CB_Z 1', oblast: 'ČB', stationId: 'cb' },
    { id: 'z-cb2', name: 'CB_Z 2', oblast: 'ČB', stationId: 'cb' },
    { id: 'z-ck', name: 'CK_Z', oblast: 'ČK', stationId: 'ck' },
    { id: 'z-jh', name: 'JH_Z', oblast: 'JH', stationId: 'jh' },
    { id: 'z-pt', name: 'PT_Z', oblast: 'PT', stationId: 'pt' },
    { id: 'z-st', name: 'ST_Z', oblast: 'ST', stationId: 'st' },
    { id: 'z-pi', name: 'PISEK_Z', oblast: 'PI', stationId: 'pi' },
    { id: 'z-ta', name: 'TA_Z', oblast: 'TA', stationId: 'ta' },
  ],

  // types: okresni = běžný příjem, iktove = iktové centrum (v ČB komplexní cerebrovaskulární centrum – KCC),
  // trauma = traumacentrum, pci = kardiocentrum (katetrizační sál), psych = psychiatrie (Jihlava).
  // depts = pracoviště, kam se v dané nemocnici předává: up urgentní příjem, chir chirurgická ambulance, ikt iktové centrum,
  // kcc komplexní cerebrovaskulární centrum, aro ARO, det dětské oddělení, gyn gynekologicko-porodnické, orl ORL,
  // trauma traumacentrum, pci kardiocentrum, psy psychiatrie. ext = mimo kraj (silniční síť končí na hranici kraje).
  // 2. pád názvu obce (oblasti) pro rádiové hlášení: „naproti z Jindřichova Hradce“
  oblastGen: { 'ČB': 'Českých Budějovic', 'ČK': 'Českého Krumlova', 'JH': 'Jindřichova Hradce', 'PT': 'Prachatic', 'ST': 'Strakonic', 'PI': 'Písku', 'TA': 'Tábora' },
  hospitals: [
    { id: 'h-cb', gen: 'Českých Budějovic', oblast: 'ČB', name: 'Nemocnice České Budějovice', short: 'NEM ČB', lat: 48.95927, lon: 14.46654, types: ['okresni', 'iktove', 'trauma', 'pci'], depts: ['up', 'kcc', 'trauma', 'pci', 'aro', 'det', 'gyn', 'orl', 'psy'] },
    { id: 'h-ta', gen: 'Tábora', oblast: 'TA', name: 'Nemocnice Tábor', short: 'NEM Tábor', lat: 49.41681, lon: 14.6528, types: ['okresni', 'iktove'], depts: ['up', 'chir', 'ikt', 'aro', 'det', 'gyn', 'orl'] },
    { id: 'h-jh', gen: 'Jindřichova Hradce', oblast: 'JH', name: 'Nemocnice Jindřichův Hradec', short: 'NEM JH', lat: 49.13975, lon: 15.00476, types: ['okresni', 'iktove'], depts: ['up', 'ikt', 'aro', 'det', 'gyn'] },
    { id: 'h-pi', gen: 'Písku', oblast: 'PI', name: 'Nemocnice Písek', short: 'NEM Písek', lat: 49.30223, lon: 14.15689, types: ['okresni', 'iktove'], depts: ['up', 'chir', 'ikt', 'aro', 'det', 'gyn', 'orl'] },
    { id: 'h-st', gen: 'Strakonic', oblast: 'ST', name: 'Nemocnice Strakonice', short: 'NEM Strakonice', lat: 49.26606, lon: 13.90708, types: ['okresni'], depts: ['up', 'chir', 'aro', 'det', 'gyn', 'orl'] },
    { id: 'h-pt', gen: 'Prachatic', oblast: 'PT', name: 'Nemocnice Prachatice', short: 'NEM Prachatice', lat: 49.00679, lon: 14.01167, types: ['okresni'], depts: ['up', 'chir', 'aro', 'det', 'gyn'] },
    { id: 'h-ck', gen: 'Českého Krumlova', oblast: 'ČK', name: 'Nemocnice Český Krumlov', short: 'NEM ČK', lat: 48.81202, lon: 14.32541, types: ['okresni'], depts: ['up', 'chir', 'aro', 'det', 'gyn'] },
    { id: 'h-ji', gen: 'Jihlavy', name: 'Nemocnice Jihlava', short: 'NEM Jihlava', lat: 49.3961, lon: 15.579, ext: true, types: ['pci', 'psych'], depts: ['up', 'pci', 'psy'] },
    { id: 'h-fnkv', gen: 'Prahy', name: 'Fakultní nemocnice Královské Vinohrady', short: 'FNKV Praha', lat: 50.074618, lon: 14.482014, heliport: true, burn: true, far: true, types: ['popaleniny'] },
    { id: 'h-brno', gen: 'Brna', name: 'Fakultní nemocnice Brno (Bohunice) – popáleninové centrum', short: 'FN Brno', lat: 49.1768, lon: 16.5733, burn: true, far: true, types: ['popaleniny'] },
    { id: 'h-ostrava', gen: 'Ostravy', name: 'Fakultní nemocnice Ostrava (Poruba) – popáleninové centrum', short: 'FN Ostrava', lat: 49.8296, lon: 18.1578, burn: true, far: true, types: ['popaleniny'] },
  ],

  // Katalog MU (SM01.06, 5.1). w = váha; m = měsíce, h = hodiny [od, do); need = podmínka počasí (thunder, fog, ice, snow, hot);
  // place: road {cls}, poi {cat, re}, rail, airport, addr; cas = počet postižených; ch = podíl dětí; col = váhy priorit I–IV;
  // kd = váhy typu poranění (T trauma, P popálenina, P+T, I inhalační trauma, N neúrazové); hz = zóna [min s, max s, text]; sc = scéna
  muTypes: [
    // ---- doprava ----
    { id: 'd3-mlha', sy: ['<Dopravní nehoda', 'Osobní automobil', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Hromadná nehoda na D3 v mlze', w: 5, need: 'fog', place: { k: 'road', cls: [0], lab: 'dálnice D3' }, cas: [14, 34], ch: 0.08, col: [18, 32, 42, 8], kd: { T: 1 }, call: 'Hromadná srážka více vozidel na dálnici D3, špatná viditelnost, mnoho zraněných.', hzText: 'dálnice uzavřena, hrozí další nárazy v mlze', sc: 'vozidla na dálnici' },
    { id: 'd3-led', sy: ['<Dopravní nehoda', 'Osobní automobil', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Hromadná nehoda na náledí', w: 4, need: 'ice', place: { k: 'road', cls: [0, 1, 2], lab: 'silnice' }, cas: [12, 28], ch: 0.08, col: [18, 32, 42, 8], kd: { T: 1 }, call: 'Hromadná nehoda na náledí, několik vozidel ve srážce, více zraněných.', sc: 'vozidla na ledovce' },
    { id: 'd3-kamion', sy: ['<Dopravní nehoda', 'Nákladní automobil', 'Osobní automobil', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Kamion do kolony na dálnici', w: 6, place: { k: 'road', cls: [0], lab: 'dálnice D3' }, cas: [10, 24], ch: 0.1, col: [22, 30, 40, 8], kd: { T: 0.85, 'P+T': 0.15 }, call: 'Nákladní auto narazilo do stojící kolony na dálnici, několik osobních aut zdemolovaných.', hz: [480, 900, 'hrozí požár vozidel, HZS zajišťuje místo'], sc: 'kolona na dálnici' },
    { id: 'bus-zajezd', sy: ['<Nehoda autobusu', 'Autobus', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Nehoda zájezdového autobusu', w: 7, place: { k: 'road', cls: [1, 2, 3], lab: 'silnice' }, cas: [20, 48], ch: 0.1, col: [15, 30, 45, 10], kd: { T: 1 }, call: 'Havaroval autobus s cestujícími, vozidlo na boku, mnoho zraněných uvnitř.', hz: [480, 900, 'autobus na boku, nestabilní, HZS vyprošťuje'], sc: 'autobus' },
    { id: 'bus-skolni', sy: ['<Nehoda autobusu', 'Autobus', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Nehoda školního autobusu', w: 5, need: 'school', h: [6, 17], place: { k: 'road', cls: [2, 3, 4], lab: 'silnice' }, cas: [14, 34], ch: 0.85, col: [12, 28, 52, 8], kd: { T: 1 }, call: 'Nehoda autobusu se školními dětmi, děti zraněné, mnoho volajících rodičů.', hz: [480, 900, 'autobus mimo vozovku, HZS zajišťuje'], sc: 'školní autobus' },
    { id: 'bus-linka', sy: ['<Nehoda autobusu', 'Autobus', 'Nákladní automobil', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Linkový autobus a nákladní auto', w: 6, place: { k: 'road', cls: [1, 2, 3], lab: 'silnice' }, cas: [12, 28], ch: 0.1, col: [15, 30, 45, 10], kd: { T: 1 }, call: 'Srážka linkového autobusu s nákladním autem, více zraněných cestujících.', sc: 'linkový autobus' },
    { id: 'vlak-prejezd', sy: ['<Nehoda vlaku', 'Vlak', 'Autobus', '+ HZS', '+ PČR'], g: 'doprava', l: 'Srážka vlaku s autobusem na přejezdu', w: 4, place: { k: 'rail', cross: true, lab: 'železniční přejezd' }, cas: [12, 36], ch: 0.1, col: [20, 30, 40, 10], kd: { T: 1 }, call: 'Na železničním přejezdu se srazil vlak s autobusem, mnoho zraněných.', hz: [480, 900, 'trať musí být vypnuta, Drážní HZS'], sc: 'vlak na přejezdu' },
    { id: 'vlak-nehoda', sy: ['<Nehoda vlaku', 'Vlak', '+ HZS', '+ PČR'], g: 'doprava', l: 'Nehoda osobních vlaků na trati', w: 3, place: { k: 'rail', lab: 'železniční trať' }, cas: [24, 60], ch: 0.1, col: [15, 30, 45, 10], kd: { T: 0.9, 'P+T': 0.1 }, call: 'Srážka osobních vlaků, vykolejení vozů, velký počet zraněných cestujících.', hz: [480, 900, 'trať vypnuta a ověřena, Drážní HZS'], sc: 'osobní vlaky' },
    { id: 'dn-retez', sy: ['<Dopravní nehoda', 'Osobní automobil', 'Dopravní nehoda s vyproštěním osob', '+ HZS', '+ PČR'], g: 'doprava', l: 'Hromadná nehoda aut na silnici I. třídy', w: 8, place: { k: 'road', cls: [1, 2], lab: 'silnice I. třídy' }, cas: [10, 22], ch: 0.1, col: [18, 32, 42, 8], kd: { T: 1 }, call: 'Řetězová nehoda několika vozidel, více zraněných.', sc: 'vozidla' },
    { id: 'minibus', sy: ['<Dopravní nehoda', 'Autobus', '+ HZS', '+ PČR'], g: 'doprava', l: 'Nehoda minibusu s dětmi z výletu', w: 3, place: { k: 'road', cls: [2, 3], lab: 'silnice' }, cas: [10, 20], ch: 0.7, col: [12, 28, 52, 8], kd: { T: 1 }, call: 'Havaroval minibus s dětmi, několik zraněných, děti křičí.', sc: 'minibus' },
    // ---- budovy a požáry ----
    { id: 'pozar-hotel', sy: ['<Požár', '+ HZS'], g: 'budovy', l: 'Požár hotelu / penzionu', w: 6, place: { k: 'poi', cat: 'ubytovani', re: 'hotel|penzion|resort|hostel|zámek' }, cas: [10, 40], ch: 0.1, col: [15, 30, 45, 10], kd: { I: 0.6, P: 0.15, 'P+T': 0.1, T: 0.15 }, call: 'Požár hotelu, hosté na oknech, kouř v budově, zranění při evakuaci.', hz: [480, 900, 'budova v plamenech, HZS provádí záchranu osob'], sc: 'hotel', house: true },
    { id: 'pozar-domov', sy: ['<Požár', '+ HZS'], g: 'budovy', l: 'Požár domova seniorů', w: 4, place: { k: 'poi', cat: 'domov', re: '' }, cas: [12, 35], ch: 0, col: [20, 35, 38, 7], kd: { I: 0.7, P: 0.1, T: 0.2 }, call: 'Požár v domově pro seniory, klienti se zakouřením, evakuace imobilních.', hz: [480, 900, 'budova zakouřena, HZS vynáší ležící klienty'], sc: 'domov seniorů', house: true },
    { id: 'pozar-skola', sy: ['<Požár', '<Výbuch', '+ HZS', '+ PČR'], g: 'budovy', l: 'Požár / výbuch ve škole', w: 3, need: 'school', h: [7, 16], place: { k: 'poi', cat: 'skola', re: 'základní|gymn|střední|škola' }, cas: [10, 40], ch: 0.85, col: [10, 25, 55, 10], kd: { I: 0.5, T: 0.3, P: 0.1, 'P+T': 0.1 }, call: 'Požár a výbuch ve škole, děti v kouři, evakuace, zranění.', hz: [480, 900, 'škola zakouřena, HZS evakuuje'], sc: 'škola', house: true },
    { id: 'vybuch-plyn', sy: ['<Výbuch', '<Požár', '+ HZS', '+ PČR'], g: 'budovy', l: 'Výbuch plynu v bytovém domě', w: 5, place: { k: 'addr', lab: 'bytový dům' }, cas: [8, 28], ch: 0.15, col: [20, 30, 42, 8], kd: { T: 0.55, 'P+T': 0.2, P: 0.1, I: 0.15 }, call: 'Výbuch plynu v bytovém domě, zřícená část domu, lidé pod troskami.', hz: [480, 900, 'hrozí zřícení, HZS zajišťuje statiku, vyprošťování'], sc: 'bytový dům', house: true },
    { id: 'vybuch-zavod', sy: ['<Výbuch', '<Požár', '+ HZS', '+ PČR'], g: 'budovy', l: 'Výbuch ve výrobním závodě', w: 5, place: { k: 'poi', cat: 'prov', re: 'pila|pivovar|farma|výroba|závod|továrna|čistírna|autoservis|hobby|sklad|elektrárna(?!.*jaderná)', not: 'jaderná' }, cas: [8, 30], ch: 0, col: [20, 30, 42, 8], kd: { 'P+T': 0.4, T: 0.3, P: 0.25, I: 0.05 }, call: 'Výbuch a požár ve výrobním provozu, zaměstnanci zranění, černý kouř.', hz: [480, 900, 'hrozí další exploze, HZS zajišťuje provoz'], sc: 'výrobní provoz', house: true },
    { id: 'zriceni-strecha', sy: ['+ HZS'], g: 'budovy', l: 'Zřícení střechy haly pod sněhem', w: 4, m: [12, 1, 2, 3], need: 'snow', place: { k: 'poi', cat: 'sport', re: 'hala|stadion|aquapark|areál' }, cas: [10, 40], ch: 0.2, col: [18, 30, 44, 8], kd: { T: 1 }, call: 'Zřítila se střecha haly, uvnitř lidé zavaleni troskami.', hz: [480, 900, 'konstrukce nestabilní, HZS zajišťuje statiku'], sc: 'hala', house: true },
    { id: 'zriceni-sklad', sy: ['+ HZS'], g: 'budovy', l: 'Zřícení konstrukce supermarketu', w: 2, place: { k: 'poi', cat: 'prov', re: 'billa|lidl|albert|tesco|kaufland|penny|supermarket' }, cas: [8, 25], ch: 0.1, col: [18, 30, 44, 8], kd: { T: 1 }, call: 'Zřícení části konstrukce obchodního centra, zavalení zákazníci.', hz: [480, 900, 'konstrukce nestabilní, HZS statika'], sc: 'obchodní centrum', house: true },
    { id: 'pozar-ubytovna', sy: ['<Požár', '+ HZS'], g: 'budovy', l: 'Požár ubytovny', w: 3, place: { k: 'poi', cat: 'ubytovani', re: 'ubytovn|hostel|penzion' }, cas: [8, 25], ch: 0.1, col: [18, 32, 42, 8], kd: { I: 0.65, P: 0.15, T: 0.2 }, call: 'Požár ubytovny, obyvatelé zakouření, skáčou z oken.', hz: [480, 900, 'budova v plamenech, HZS záchrana osob'], sc: 'ubytovna', house: true },
    // ---- hromadné akce ----
    { id: 'blesk-tabor', sy: [], g: 'akce', l: 'Zásah bleskem na dětském táboře', w: 6, m: [6, 7, 8, 9], need: 'thunder', place: { k: 'poi', cat: 'ubytovani', re: 'tábor|kemp|camp|chata|rekrea' }, cas: [8, 22], ch: 0.9, col: [14, 26, 52, 8], kd: { T: 0.5, P: 0.25, 'P+T': 0.25 }, call: 'Při bouřce udeřil blesk na dětském táboře, děti v bezvědomí, jedno nedýchá.', sc: 'dětský tábor' },
    { id: 'blesk-akce', sy: [], g: 'akce', l: 'Zásah bleskem na větší akci', w: 5, m: [5, 6, 7, 8, 9], need: 'thunder', h: [11, 23], place: [{ k: 'poi', cat: 'sport', re: 'areál|koupališt|stadion|aquapark|fotbal|sportovní hala', not: 'dětsk|rákosn' }, { k: 'poi', cat: 'ubytovani', re: 'kemp|camp|rekrea|tábor' }, { k: 'poi', cat: 'verejne', re: 'zámek|hrad|pivovar|kulturní|sokol' }], cas: [8, 28], ch: 0.3, col: [14, 26, 52, 8], kd: { T: 0.5, P: 0.25, 'P+T': 0.25 }, call: 'Při bouřce udeřil blesk mezi diváky na akci, více lidí leží, někteří nedýchají.', sc: 'akce pod širým nebem' },
    { id: 'bourka-stan', sy: ['+ HZS'], g: 'akce', l: 'Zřícení stanu / pódia při bouřce', w: 4, m: [5, 6, 7, 8, 9], need: 'thunder', h: [11, 24], place: [{ k: 'poi', cat: 'sport', re: 'areál|koupališt|stadion|aquapark|fotbal|sportovní hala', not: 'dětsk|rákosn' }, { k: 'poi', cat: 'ubytovani', re: 'kemp|camp|rekrea|tábor' }, { k: 'poi', cat: 'verejne', re: 'zámek|hrad|pivovar|kulturní|sokol' }], cas: [12, 45], ch: 0.15, col: [14, 28, 50, 8], kd: { T: 1 }, call: 'Silný vítr a bouřka strhly stan na akci, pod ním lidé, mnoho zraněných.', sc: 'akce se stanem' },
    { id: 'tabor-noro', sy: [')Opakované zvracení', ')Opakovaný průjem'], g: 'akce', l: 'Dětský tábor – zvracení a průjem', w: 7, m: [6, 7, 8], place: { k: 'poi', cat: 'ubytovani', re: 'tábor|kemp|camp|chata|rekrea' }, cas: [18, 60], ch: 0.95, col: [1, 14, 82, 3], kd: { N: 1 }, call: 'Dětský tábor: desítky dětí zvrací a mají průjem, horečky, vedoucí volají o pomoc.', hz: null, sc: 'dětský tábor' },
    { id: 'tlacenice', sy: [], g: 'akce', l: 'Tlačenice na stadionu / koncertě', w: 3, h: [14, 24], place: [{ k: 'poi', cat: 'sport', re: 'stadion|hala|areál|aquapark|sportovní' }, { k: 'poi', cat: 'verejne', re: 'kulturní|sál|sokol|kino|divadlo' }], cas: [16, 60], ch: 0.2, col: [8, 22, 62, 8], kd: { T: 1 }, call: 'Panika a tlačenice na akci, lidé ušlapaní u východu, mnoho zraněných.', sc: 'akce s velkým počtem lidí' },
    { id: 'kolaps-vedro', sy: ['$Po kolapsu'], g: 'akce', l: 'Kolaps davu při vedru', w: 3, m: [6, 7, 8], need: 'hot', h: [11, 20], place: [{ k: 'poi', cat: 'sport', re: 'areál|koupališt|stadion|aquapark|fotbal|sportovní hala', not: 'dětsk|rákosn' }, { k: 'poi', cat: 'ubytovani', re: 'kemp|camp|rekrea|tábor' }], cas: [16, 50], ch: 0.2, col: [4, 20, 72, 4], kd: { N: 1 }, call: 'Velké vedro na akci, desítky lidí kolabují, dehydratace, úpal.', sc: 'akce pod širým nebem' },
    { id: 'otrava-svatba', sy: ['Potraviny', ')Opakované zvracení'], g: 'akce', l: 'Hromadná otrava jídlem na akci', w: 4, place: { k: 'poi', cat: 'verejne', re: 'kulturní|sál|sokol|hostinec|restaurace|kino|divadlo' }, cas: [16, 50], ch: 0.1, col: [3, 17, 76, 4], kd: { N: 1 }, call: 'Po společném jídle na akci zvrací a kolabuje několik desítek lidí.', sc: 'společenská akce' },
    // ---- nebezpečné látky ----
    { id: 'chlor-bazen', sy: ['<Únik nebezpečných látek (CBRNE)', '<Intoxikace', '+ HZS'], g: 'latky', l: 'Únik chloru v bazénu / koupališti', w: 4, place: { k: 'poi', cat: 'sport', re: 'bazén|koupališt|aquapark|plav' }, cas: [15, 50], ch: 0.4, col: [10, 25, 58, 7], kd: { I: 0.6, N: 0.4 }, call: 'Únik chloru v areálu bazénu, lidé se dusí a kašlou, evakuace.', hz: [480, 900, 'plyn v prostoru, HZS měří a zajišťuje, vstup jen v ochraně'], sc: 'bazén' },
    { id: 'cisterna', sy: ['<Únik nebezpečných látek (CBRNE)', '<Dopravní nehoda', 'Nákladní automobil', '+ HZS', '+ PČR'], g: 'latky', l: 'Cisterna s chemikálií na silnici', w: 3, place: { k: 'road', cls: [0, 1, 2], lab: 'silnice' }, cas: [6, 20], ch: 0.05, col: [18, 30, 44, 8], kd: { I: 0.5, T: 0.3, P: 0.2 }, call: 'Převrácená cisterna s neznámou látkou, únik, několik zasažených osob.', hz: [480, 900, 'neznámá látka, HZS identifikuje, vstup jen v ochraně'], sc: 'cisterna' },
    { id: 'amoniak', sy: ['<Únik nebezpečných látek (CBRNE)', '<Intoxikace', '+ HZS'], g: 'latky', l: 'Únik čpavku z chlazení', w: 3, place: { k: 'poi', cat: 'prov', re: 'pivovar|čistírna|řeznictví|farma|sklad|výroba' }, cas: [8, 30], ch: 0, col: [18, 30, 44, 8], kd: { I: 0.7, P: 0.15, N: 0.15 }, call: 'Únik čpavku z chladicího zařízení, zaměstnanci se dusí, silný zápach.', hz: [480, 900, 'čpavek v prostoru, HZS provádí detekci, vstup v ochraně'], sc: 'výrobní provoz', house: true },
    { id: 'skola-plyn', sy: ['<Únik nebezpečných látek (CBRNE)', '<Intoxikace', '+ HZS'], g: 'latky', l: 'Únik plynu / dráždivé látky ve škole', w: 3, need: 'school', h: [7, 15], place: { k: 'poi', cat: 'skola', re: 'základní|gymn|střední|škola|mateřsk' }, cas: [15, 45], ch: 0.95, col: [3, 17, 74, 6], kd: { I: 0.5, N: 0.5 }, call: 'Ve škole se děti dusí a zvrací po úniku neznámého plynu, evakuace.', hz: [480, 900, 'zdroj neznámý, HZS měří, vstup v ochraně'], sc: 'škola', house: true },
    { id: 'co-chata', sy: ['<Intoxikace', 'Oxid uhelnatý', '+ HZS'], g: 'latky', l: 'Otrava CO v ubytování', w: 4, m: [10, 11, 12, 1, 2, 3, 4], place: { k: 'poi', cat: 'ubytovani', re: 'penzion|chata|hotel|rekrea|ubytovn' }, cas: [8, 22], ch: 0.3, col: [14, 30, 50, 6], kd: { N: 0.8, I: 0.2 }, call: 'Několik hostů se v ubytování ráno nebudí nebo zvrací, silné bolesti hlavy, podezření na CO.', hz: [480, 900, 'budova se větrá, HZS měří CO'], sc: 'ubytování', house: true },
    // ---- útok ----
    { id: 'amok-skola', sy: ['<!!! AKTIVNÍ STŘELEC !!! DODRŽUJ BEZPEČNOST', '´Střelné poranění', '+ PČR'], g: 'utok', l: 'Útok ozbrojeného útočníka ve škole', w: 1.2, need: 'school', h: [7, 16], place: { k: 'poi', cat: 'skola', re: 'základní|gymn|střední|škola' }, cas: [8, 24], ch: 0.7, col: [30, 28, 24, 18], kd: { T: 1 }, call: 'Střelba ve škole, útočník v budově, zranění a mrtví, PČR zasahuje.', hz: [480, 900, 'ozbrojený útočník, PČR zajišťuje budovu, sanita čeká v bezpečné zóně'], sc: 'škola', house: true },
    { id: 'amok-obchod', sy: ['<!!! AKTIVNÍ STŘELEC !!! DODRŽUJ BEZPEČNOST', '´Střelné poranění', '+ PČR'], g: 'utok', l: 'Útok v nákupním centru', w: 1.2, place: { k: 'poi', cat: 'prov', re: 'billa|lidl|albert|tesco|kaufland|penny|supermarket' }, cas: [6, 18], ch: 0.1, col: [30, 28, 26, 16], kd: { T: 1 }, call: 'Střelba v obchodním centru, útočník na místě, zranění zákazníci.', hz: [480, 900, 'ozbrojený útočník, PČR zajišťuje'], sc: 'obchodní centrum', house: true },
    { id: 'amok-akce', sy: ['<!!! AKTIVNÍ STŘELEC !!! DODRŽUJ BEZPEČNOST', '´Střelné poranění', '+ PČR'], g: 'utok', l: 'Útok na veřejné akci', w: 1, h: [12, 24], place: { k: 'poi', cat: 'verejne', re: 'kulturní|sál|sokol|hostinec|restaurace|kino|divadlo|hrad|zámek|kostel' }, cas: [6, 22], ch: 0.1, col: [28, 28, 28, 16], kd: { T: 1 }, call: 'Střelba na akci, panika, zranění a mrtví, útočník v okolí.', hz: [480, 900, 'útočník, PČR zajišťuje'], sc: 'veřejná akce' },
    { id: 'bomba', sy: ['<Výbuch', '+ HZS', '+ PČR'], g: 'utok', l: 'Výbuch nástražného systému', w: 0.8, place: { k: 'poi', cat: 'verejne', re: 'nádraží|kulturní|kino|divadlo|radnice|úřad|zámek' }, cas: [10, 35], ch: 0.1, col: [28, 28, 32, 12], kd: { 'P+T': 0.4, T: 0.45, P: 0.1, I: 0.05 }, call: 'Silný výbuch ve veřejné budově, zranění lidé, kouř, podezření na nástražný systém.', hz: [480, 900, 'možný druhý nástražný systém, pyrotechnik PČR, sanita čeká v bezpečné zóně'], sc: 'budova', house: true },
    // ---- letecké ----
    { id: 'letadlo-male', sy: ['<Nehoda letadla', '+ HZS'], g: 'letadlo', l: 'Havárie malého letadla', w: 3, place: { k: 'airport' }, cas: [4, 10], ch: 0.1, col: [30, 30, 30, 10], kd: { T: 0.5, 'P+T': 0.35, P: 0.15 }, call: 'Havárie malého letadla u letiště, požár, počet osob na palubě se ověřuje.', hz: [480, 900, 'únik paliva, požár, HZS hasí'], sc: 'malé letadlo', air: true },
    { id: 'letadlo-dopravni', sy: ['<Nehoda letadla', '+ HZS'], g: 'letadlo', l: 'Havárie dopravního letadla', w: 1.2, place: { k: 'airport' }, cas: [25, 60], ch: 0.12, col: [18, 28, 40, 14], kd: { 'P+T': 0.4, T: 0.35, P: 0.15, I: 0.1 }, call: 'Havárie dopravního letadla při přistání, požár, velký počet osob na palubě.', hz: [480, 900, 'únik paliva, požár, HZS letištní hasiči, bezpečná zóna'], sc: 'dopravní letadlo', air: true },
  ],
  railTowns: ['České Budějovice', 'Tábor', 'Veselí nad Lužnicí', 'Planá nad Lužnicí', 'Soběslav', 'Strakonice', 'Písek', 'Český Krumlov', 'Jindřichův Hradec', 'Kaplice', 'Trhové Sviny', 'Protivín', 'Sezimovo Ústí', 'Blatná', 'Volary'],
  airport: { name: 'letiště České Budějovice (Planá)', lat: 48.9467, lon: 14.4275 },

  // Města pro generování případů a výpočet pokrytí. w = přibližná velikost v tisících obyvatel.
  towns: [
    { n: 'České Budějovice', lat: 48.975, lon: 14.474, w: 94 },
    { n: 'Tábor', lat: 49.414, lon: 14.658, w: 34 },
    { n: 'Písek', lat: 49.309, lon: 14.148, w: 30 },
    { n: 'Strakonice', lat: 49.261, lon: 13.902, w: 23 },
    { n: 'Jindřichův Hradec', lat: 49.144, lon: 15.003, w: 21 },
    { n: 'Český Krumlov', lat: 48.813, lon: 14.318, w: 13 },
    { n: 'Prachatice', lat: 49.013, lon: 13.997, w: 11 },
    { n: 'Třeboň', lat: 49.004, lon: 14.771, w: 8 },
    { n: 'Týn nad Vltavou', lat: 49.222, lon: 14.422, w: 8 },
    { n: 'Milevsko', lat: 49.451, lon: 14.361, w: 8 },
    { n: 'Dačice', lat: 49.082, lon: 15.436, w: 7.5 },
    { n: 'Vimperk', lat: 49.056, lon: 13.771, w: 7.5 },
    { n: 'Sezimovo Ústí', lat: 49.384, lon: 14.687, w: 7.5 },
    { n: 'Soběslav', lat: 49.259, lon: 14.719, w: 7 },
    { n: 'Vodňany', lat: 49.148, lon: 14.171, w: 7 },
    { n: 'Kaplice', lat: 48.74, lon: 14.495, w: 7 },
    { n: 'Veselí nad Lužnicí', lat: 49.185, lon: 14.693, w: 7 },
    { n: 'Blatná', lat: 49.425, lon: 13.884, w: 6.5 },
    { n: 'Trhové Sviny', lat: 48.842, lon: 14.639, w: 5 },
    { n: 'Bechyně', lat: 49.296, lon: 14.469, w: 5 },
    { n: 'Hluboká nad Vltavou', lat: 49.053, lon: 14.434, w: 5 },
    { n: 'Protivín', lat: 49.198, lon: 14.22, w: 4.8 },
    { n: 'Planá nad Lužnicí', lat: 49.35, lon: 14.714, w: 4 },
    { n: 'Volary', lat: 48.909, lon: 13.895, w: 3.7 },
    { n: 'Volyně', lat: 49.16, lon: 13.882, w: 3.7 },
    { n: 'Borovany', lat: 48.898, lon: 14.641, w: 3.7 },
    { n: 'Zliv', lat: 49.069, lon: 14.36, w: 3.5 },
    { n: 'Lišov', lat: 49.024, lon: 14.609, w: 3.2 },
    { n: 'Nová Bystřice', lat: 49.015, lon: 15.105, w: 3.2 },
    { n: 'Nové Hrady', lat: 48.791, lon: 14.785, w: 3 },
    { n: 'Netolice', lat: 49.044, lon: 14.2, w: 2.7 },
    { n: 'Kunžak', lat: 49.121, lon: 15.206, w: 2.7 },
    { n: 'Mladá Vožice', lat: 49.644, lon: 14.824, w: 2.7 },
    { n: 'Lomnice nad Lužnicí', lat: 49.082, lon: 14.713, w: 2.6 },
    { n: 'Slavonice', lat: 49.0, lon: 15.352, w: 2.5 },
    { n: 'Vyšší Brod', lat: 48.62, lon: 14.309, w: 2.5 },
    { n: 'Chýnov', lat: 49.41, lon: 14.817, w: 2.5 },
    { n: 'Horní Planá', lat: 48.769, lon: 14.032, w: 2.2 },
    { n: 'Suchdol nad Lužnicí', lat: 48.889, lon: 14.898, w: 2.3 },
    { n: 'Kardašova Řečice', lat: 49.192, lon: 14.855, w: 2 },
    { n: 'Lhenice', lat: 49.004, lon: 14.167, w: 2 },
    { n: 'Čimelice', lat: 49.465, lon: 14.032, w: 1.7 },
    { n: 'Bavorov', lat: 49.107, lon: 14.046, w: 1.7 },
    { n: 'Opařany', lat: 49.436, lon: 14.496, w: 1.5 },
    { n: 'Vacov', lat: 49.147, lon: 13.68, w: 1.3 },
    { n: 'Frymburk', lat: 48.653, lon: 14.164, w: 1.2 },
    { n: 'Lipno nad Vltavou', lat: 48.636, lon: 14.229, w: 0.8 },
  ],

  // Klasifikace přesně podle názvů v systému. Příznaky čerpá engine výhradně ze src/symptoms.json.
  // n = váhy naléhavosti, dyn = podíl dynamických N2 (RZP bez lékaře, lékař na vyžádání),
  // rvP = orientační pravděpodobnost žádosti o lékaře při události, kalibrovaná podle vzorku výjezdů;
  // jde o herní baseline, nikoli pevné pravidlo. zzum = N2 zvládne ZZUM bez lékaře,
  // n a dyn jsou orientačně kalibrovány z anonymního souhrnu dodaných výjezdů; N2 dynamika je zde odhad podle vyslané RZP bez RV.
  // Neidentifikované skupiny se do odhadu dyn nezapočítávají. Jde o simulaci, ne o závazný triážní algoritmus.
  // trans = pravděpodobnost transportu, hosp = typ cíle (nebo [[typ, pravděpodobnost], ...]),
  // scene = doba u pacienta v minutách (RZP), w = váha výskytu, where = typy míst.
  // Četnosti a délky pobytu jsou nastavené podle anonymních agregátů říjnového vzorku.
  // Parametry n, dyn, rvP a klinické scénáře zůstávají herním odhadem, ne pravidlem JčK.
  indications: [
    { id: 'resus', klasif: 'Resuscitace', symptomKey: '__resuscitace__', n: { 1: 1 }, rvP: 1, trans: 0.4, hosp: 'okresni', scene: [20, 38], w: 0.5, where: ['rd', 'byt', 'ulice', 'domov'], age: [0, 90] },
    { id: 'nzo', klasif: 'NZO – spatřená', n: { 1: 1 }, rvP: 1, trans: 0.55, hosp: 'okresni', scene: [22, 38], w: 4, where: ['ulice', 'prov', 'rd', 'priroda'], age: [30, 85] },
    { id: 'porucha', klasif: 'Porucha vědomí', n: { 1: 0.2, 2: 0.425, 3: 0.375 }, dyn: 0.53, rvP: 0.29, trans: 0.85, hosp: 'okresni', scene: [12, 28], w: 713, where: ['rd', 'byt', 'ulice', 'domov'], age: [25, 90] },
    { id: 'dusnost', klasif: 'Dušnost', n: { 1: 0.053, 2: 0.749, 3: 0.198 }, dyn: 0.63, rvP: 0.24, trans: 0.92, hosp: 'okresni', scene: [11, 26], w: 714, where: ['rd', 'byt', 'domov', 'ulice'], age: [30, 90] },
    { id: 'hrudnik', klasif: 'Bolesti na hrudi', n: { 2: 0.789, 3: 0.211 }, dyn: 0.55, rvP: 0.27, trans: 0.95, hosp: [['pci', 0.3], ['okresni', 0.7]], scene: [12, 28], w: 440, where: ['rd', 'byt', 'prov', 'ulice'], age: [40, 88] },
    { id: 'cmp', klasif: 'CMP', n: { 2: 0.88, 3: 0.12 }, dyn: 0.96, rvP: 0.03, zzum: true, trans: 0.97, hosp: 'iktove', scene: [13, 29], w: 185, where: ['rd', 'byt', 'ulice', 'domov'], age: [55, 92] },
    { id: 'kreceU', klasif: 'Křečové stavy', n: { 2: 0.763, 3: 0.237 }, dyn: 0.48, rvP: 0.34, trans: 0.7, hosp: 'okresni', scene: [11, 25], w: 131, where: ['rd', 'byt', 'ulice', 'prov'], age: [15, 80] },
    { id: 'pedi', klasif: 'Pediatrické stavy', symptomKey: '__pediatric__', n: { 1: 0.1, 2: 0.6, 3: 0.3 }, dyn: 0.5, rvP: 0.35, trans: 0.92, hosp: 'okresni', scene: [11, 25], w: 1, where: ['rd', 'byt', 'skola'], age: [0, 14], child: true },
    { id: 'alerg', klasif: 'Alergické reakce', n: { 2: 0.462, 3: 0.538 }, dyn: 0.6, rvP: 0.15, trans: 0.75, hosp: 'okresni', scene: [10, 25], w: 75, where: ['rd', 'byt', 'priroda', 'prov'], age: [5, 80] },
    { id: 'diab', klasif: 'Diabetické stavy', n: { 2: 0.5, 3: 0.5 }, dyn: 0.8, rvP: 0.01, zzum: true, trans: 0.55, hosp: 'okresni', scene: [13, 31], w: 44, where: ['rd', 'byt', 'domov'], age: [20, 85] },
    { id: 'aryt', klasif: 'Arytmie', n: { 1: 0.032, 2: 0.413, 3: 0.556 }, dyn: 0.5, rvP: 0.21, trans: 0.85, hosp: 'okresni', scene: [11, 27], w: 131, where: ['rd', 'byt', 'ulice'], age: [40, 90] },
    { id: 'hypert', klasif: 'Hypertenze', n: { 2: 0.25, 3: 0.75 }, dyn: 0.7, rvP: 0.02, trans: 0.7, hosp: 'okresni', scene: [11, 27], w: 137, where: ['rd', 'byt', 'domov'], age: [50, 90] },
    { id: 'intox', klasif: 'Intoxikace', n: { 2: 0.295, 3: 0.705 }, dyn: 0.64, rvP: 0.15, trans: 0.8, hosp: 'okresni', scene: [9, 25], w: 150, where: ['ulice', 'byt', 'prov', 'rd'], age: [16, 70] },
    { id: 'krvac', klasif: 'Neúrazové krvácení', n: { 2: 0.188, 3: 0.812 }, dyn: 0.5, rvP: 0.10, trans: 0.9, hosp: 'okresni', scene: [10, 26], w: 176, where: ['rd', 'byt', 'domov'], age: [30, 90] },
    { id: 'neuro', klasif: 'Neurologické stavy', n: { 2: 0.028, 3: 0.972 }, dyn: 0.7, rvP: 0.03, trans: 0.75, hosp: 'okresni', scene: [11, 26], w: 310, where: ['rd', 'byt', 'ulice'], age: [30, 90] },
    { id: 'psych', klasif: 'Psychiatrické stavy', n: { 2: 0.354, 3: 0.646 }, dyn: 0.49, rvP: 0.12, trans: 0.6, hosp: 'okresni', scene: [8, 29], w: 295, where: ['byt', 'rd', 'ulice'], age: [18, 70] },
    { id: 'horecka', klasif: 'Horečka', n: { 3: 1 }, rvP: 0.01, trans: 0.5, hosp: 'okresni', scene: [9, 23], w: 98, where: ['rd', 'byt'], age: [1, 85] },
    { id: 'zvraceni', klasif: 'Zvracení/průjem', n: { 3: 1 }, rvP: 0.01, trans: 0.65, hosp: 'okresni', scene: [9, 22], w: 215, where: ['rd', 'byt', 'domov'], age: [20, 90] },
    { id: 'bolest', klasif: 'Bolest', n: { 2: 0.032, 3: 0.968 }, dyn: 0.58, rvP: 0.02, trans: 0.85, hosp: 'okresni', scene: [8, 21], w: 913, where: ['rd', 'byt', 'domov', 'ulice'], age: [20, 92] },
    { id: 'gyn', klasif: 'Gynekologické stavy', n: { 1: 0.136, 2: 0.318, 3: 0.545 }, dyn: 0.4, rvP: 0.09, trans: 1, hosp: 'okresni', scene: [4, 15], w: 58, where: ['rd', 'byt'], age: [18, 42], sex: 'Ž' },
    { id: 'dn_poly', klasif: 'Dopravní nehoda', n: { 1: 1 }, rvP: 1, trans: 1, hosp: 'trauma', scene: [13, 36], w: 10, where: ['silnice'], age: [0, 90] },
    { id: 'dn_lehke', klasif: 'Dopravní nehoda', n: { 2: 0.603, 3: 0.397 }, dyn: 0.53, rvP: 0.19, trans: 0.85, hosp: 'okresni', scene: [10, 27], w: 267, where: ['silnice', 'ulice'], age: [0, 90] },
    { id: 'trauma', klasif: 'Trauma', symptomKey: '__adult_trauma__', n: { 1: 0.022, 2: 0.103, 3: 0.875 }, dyn: 0.56, rvP: 0.04, trans: 0.9, hosp: 'okresni', scene: [8, 20], w: 1109, where: ['rd', 'byt', 'domov', 'ulice', 'prov'], age: [25, 92] },
    { id: 'trauma_dite', klasif: 'Trauma', symptomKey: '__pediatric_trauma__', n: { 2: 0.35, 3: 0.65 }, dyn: 0.6, rvP: 0.04, trans: 0.9, hosp: 'okresni', scene: [8, 20], w: 123, where: ['ulice', 'rd', 'skola'], age: [1, 15], child: true },
    { id: 'popal', klasif: 'Popálení, poleptání', n: { 2: 0.6, 3: 0.4 }, dyn: 0.37, rvP: 0.2, trans: 0.9, hosp: 'okresni', scene: [13, 30], w: 26, where: ['rd', 'byt', 'prov'], age: [2, 70] },
    { id: 'tonuti', klasif: 'Tonutí', n: { 1: 1 }, rvP: 1, trans: 1, hosp: 'okresni', scene: [18, 32], w: 1, where: ['priroda', 'prov'], age: [3, 65] },
    { id: 'obeseni', klasif: 'Oběšení', n: { 1: 1 }, rvP: 1, trans: 0.5, hosp: 'okresni', scene: [14, 28], w: 5, where: ['rd', 'byt', 'priroda'], age: [18, 70] },
    { id: 'amput', klasif: 'Amputace', symptomKey: '__amputace__', n: { 1: 0.4, 2: 0.6 }, rvP: 0.7, dyn: 0.2, trans: 1, hosp: 'trauma', scene: [12, 28], w: 1, where: ['prov', 'rd'], age: [0, 90] },
    { id: 'asist', klasif: 'Asistence', n: { 3: 1 }, rvP: 0.11, trans: 0.7, hosp: 'okresni', scene: [8, 25], w: 51, where: ['byt', 'silnice', 'prov'], age: [30, 92] },
    { id: 'czs', klasif: 'CZS', n: { 3: 1 }, rvP: 0.02, trans: 0.9, hosp: 'okresni', scene: [12, 27], w: 230, where: ['rd', 'byt', 'domov'], age: [50, 92] },
  ],

  where: {
    rd: { txt: ['RD', 'RD, vstup ze dvora', 'RD, přízemí'], ch: 0 },
    byt: { txt: ['Bytový dům, 2. patro', 'Bytový dům, 3. patro, bez výtahu', 'Bytový dům, přízemí'], ch: 0 },
    domov: { txt: ['Domov pro seniory', 'Domov pro seniory, 1. patro'], ch: 0 },
    prov: { txt: ['Provozovna, vstup z ulice', 'Provozovna, zadní vchod', 'Pracoviště, výrobní hala'], ch: 0 },
    skola: { txt: ['Škola, učebna', 'Školní hřiště'], ch: 0 },
    ulice: { txt: ['Ulice, před domem', 'Chodník u zastávky', 'Veřejné prostranství'], ch: 1 },
    silnice: { txt: ['Silnice, osobní vozidlo', 'Silnice, vozidlo mimo vozovku', 'Silnice, omezený průjezd'], ch: 1 },
    priroda: { txt: ['Lesní cesta, přístup pěšky', 'Příroda, mimo zástavbu', 'Turistická trasa, přístup z cesty'], ch: 1 },
    ordinace: { txt: ['Ordinace, čekárna', 'Ordinace praktického lékaře'], ch: 2 },
    verejne: { txt: ['Veřejná budova, vstup z ulice', 'Nádraží / zastávka, nástupiště', 'Restaurace nebo obchod, vstup z ulice', 'Před budovou, pacient na lavičce', 'Veřejné prostranství před objektem'], ch: 0 },
    sport: { txt: ['Sportoviště, pacient na hřišti', 'Sportovní hala, vstup z parkoviště', 'Bazén / koupaliště, u vody', 'Fitness, recepce'], ch: 1 },
    ubytovani: { txt: ['Ubytování, recepce', 'Hotel, pokoj v patře', 'Penzion, vstup z dvora', 'Kemp, pacient u karavanu'], ch: 0 },
    zz: { txt: ['Zdravotnické zařízení, ambulance', 'Zdravotnické zařízení, lůžkové oddělení'], ch: 2 },
  },

  // Popis místa: krátké obecné fráze ve stylu dispečerského zápisu (žádné texty z ostrých dat).
  // none = podíl případů bez popisu, a = základ, b = volitelný doplněk (bp = jeho pravděpodobnost).
  place: {
    rd: { none: 0.42, bp: 0.28,
      a: ['RD', 'RD', 'RD', 'RD', 'RD, přízemí', 'RD, patro', 'RD, 1. patro', 'přízemí', '1. patro', 'patro', 'podkroví', 'novostavba', 'řadovka', 'chalupa', 'statek', 'dvojdomek', 'krajní dům', 'za domem', 'na zahradě', 'na dvoře', 've dvoře', 'v garáži', 'v dílně', 've stodole', 'vejminek', 'zadní trakt', 'u vrat', 'na terase', 'bod', 'dům na konci obce', 'dům u hlavní silnice'],
      b: ['bude čekat u vrat', 'bude čekat před domem', 'branka otevřená', 'vrata otevřená', 'pes zavřený', 'pes na dvoře', 'vchod z boku', 'vchod zezadu', 'vchod ze dvora', 'zvonek nefunguje', 'dveře odemčené', 'klíč má sousedka', 'úzký vjezd', 'strmé schody', 'příjezd po polní cestě', 'u domu se staví', 'svítí před domem', 'zamává'] },
    byt: { none: 0.3, bp: 0.38,
      a: ['bytovka', 'panelák', 'bytový dům', 'činžák', 'DPS', 'ubytovna', 'garsonka'],
      b: ['výtah', 'bez výtahu', 'výtah nejede', 'zvonek na jméno', 'zvonek nefunguje', 'vchod ze dvora', 'vchod z boku', 'zadní vchod', 'prostřední vchod', 'poslední vchod', 'vchod A', 'vchod B', 'bude čekat u vchodu', 'dveře odemčené', 'klíče u sousedky', 'otevře soused', 'nad obchodem', 'pavlač', 'byt vlevo', 'byt vpravo'] },
    domov: { none: 0.3, bp: 0.4,
      a: ['DPS', 'domov seniorů', '1. patro', '2. patro', '3. patro', 'přízemí', 'oddělení B', 'pavilon A', 'pavilon C', 'zahrada areálu'],
      b: ['sestra čeká u vchodu', 'vstup přes recepci', 'hlavní vchod', 'boční vchod', 'výtah', 'personál u pacienta', 'personál dovede'] },
    prov: { none: 0.3, bp: 0.35,
      a: ['hala', 'výrobní hala', 'sklad', 'dílna', 'kancelář', 'kancelář v patře', 'šatna', 'rampa', 'dvůr areálu', 'vrátnice', 'prodejna', 'za pultem', 'zázemí prodejny', 'kuchyň provozovny', 'pila', 'kravín', 'lakovna', 'expedice', 'parkoviště firmy', 'stavba', 'lešení', 'u linky'],
      b: ['čeká na vrátnici', 'vrátný navede', 'kolega u brány', 'vjezd hlavní bránou', 'zadní vjezd', 'vstup z rampy', 'mistr čeká venku', 'u pacienta kolegové'] },
    skola: { none: 0.3, bp: 0.35,
      a: ['ZŠ', 'MŠ', 'tělocvična', 'učebna', 'učebna v patře', 'sborovna', 'ředitelna', 'jídelna', 'školní hřiště', 'chodba', 'šatny', 'družina', 'dílny', 'internát'],
      b: ['učitelka čeká u vchodu', 'školník navede', 'hlavní vchod', 'vchod od hřiště', 'boční vchod'] },
    ulice: { none: 0.32, bp: 0.25,
      a: ['venku', 'před domem', 'na chodníku', 'u zastávky', 'na zastávce', 'na lavičce', 'u obchodu', 'před hospodou', 'u kostela', 'na návsi', 'na náměstí', 'u pošty', 'v parku', 'na parkovišti', 'u přechodu', 'u křižovatky', 'pod mostem', 'u potoka', 'u hřbitova', 'před poštou', 'u kontejnerů', 'na cyklostezce', 'u rybníka', 'u garáží', 'u hřiště'],
      b: ['svědek u pacienta', 'zamává', 'kolemjdoucí čeká', 'naproti obchodu', 'směr centrum', 'u bílého auta', 'hlídka MP na místě'] },
    silnice: { none: 0.3, bp: 0.35,
      a: ['za obcí', 'před obcí', 'v zatáčce', 'na rovince', 'u odbočky', 'u křižovatky', 'u přejezdu', 'na mostě', 'u lesa', 'u benzinky', 'v obci', 'u odpočívadla', 'sjezd z hlavní', 'v kopci', 'pod kopcem'],
      b: ['auto v příkopu', 'auto mimo vozovku', 'auto na střeše', 'provoz stojí', 'silnice průjezdná jedním pruhem', 'svědek na místě', 'výstražný trojúhelník', 'hlídka na místě'] },
    priroda: { none: 0.22, bp: 0.4,
      a: ['les', 'lesní cesta', 'polní cesta', 'louka', 'pole', 'u rybníka', 'u řeky', 'u potoka', 'na hrázi', 'turistická trasa', 'cyklostezka', 'u rozcestníku', 'u posedu', 'paseka', 'chatová oblast', 'chata', 'u přehrady', 'lom', 'sjezdovka', 'u rozhledny', 'zahrádkářská kolonie', 'tábořiště'],
      b: ['bod', 'přístup jen pěšky', 'cca 300 m od silnice', 'cca 1 km od parkoviště', 'vyjde naproti k silnici', 'zamává u cesty', 'poloha z aplikace Záchranka', 'závora', 'sjízdné jen terénním vozem'] },
    ordinace: { none: 0.25, bp: 0.3,
      a: ['ordinace', 'ordinace PL', 'čekárna', 'zdravotní středisko', 'ambulance', 'zubní ordinace', 'ordinace v 1. patře', 'poliklinika', 'LSPP', 'rehabilitace'],
      b: ['lékař u pacienta', 'sestra čeká u vchodu', 'výtah', 'vchod ze dvora', 'zpráva připravena'] },
    zz: { none: 0.3, bp: 0.2, a: ['ambulance', 'lůžkové oddělení', 'LDN', 'příjem', 'chirurgická ambulance', 'interní ambulance'], b: ['sestra předá dokumentaci', 'personál u pacienta'] },
    verejne: { none: 0.25, bp: 0.3,
      a: ['nádraží', 'nástupiště', 'čekárna', 'zastávka', 'restaurace', 'hospoda', 'u výčepu', 'kavárna', 'obchod', 'u pokladen', 'prodejna', 'úřad', 'chodba úřadu', 'pošta', 'knihovna', 'kostel', 'hřbitov', 'sál', 'kulturní dům', 'kino', 'benzinka', 'parkoviště', 'před budovou', 'toalety', 'lékárna', 'banka', 'tržnice'],
      b: ['obsluha u pacienta', 'personál navede', 'svědek čeká venku', 'hlavní vchod', 'zadní vchod', 'u vchodu', 'ochranka na místě'] },
    sport: { none: 0.25, bp: 0.3,
      a: ['hřiště', 'fotbalové hřiště', 'kabiny', 'tělocvična', 'sportovní hala', 'zimák', 'u ledu', 'bazén', 'u bazénu', 'koupaliště', 'kurty', 'posilovna', 'šatny', 'tribuna', 'dětské hřiště', 'skatepark', 'střelnice', 'u vleku'],
      b: ['správce navede', 'trenér u pacienta', 'plavčík u pacienta', 'vjezd na plochu možný', 'vchod od parkoviště', 'probíhá zápas'] },
    ubytovani: { none: 0.25, bp: 0.35,
      a: ['hotel', 'pokoj', 'pokoj v patře', 'recepce', 'penzion', 'apartmán', 'kemp', 'chatka', 'u karavanu', 'stan', 'restaurace hotelu', 'ubytovna', 'wellness', 'chata', 'chalupa'],
      b: ['recepce navede', 'čeká na recepci', 'správce u brány', 'výtah', 'bez výtahu', 'vchod ze dvora', 'číslo chatky sdělí na místě'] },
  },

  // Charakter výzvy. Do hry zatím vstupují první tři. Ostatní jsou připravené pro další režimy.
  charaktery: [
    'Tísňová výzva v budově',
    'Tísňová výzva v terénu',
    'Tísňová výzva ve zdrav. zařízení',
  ],
  charakteryJine: [
    'Převoz z/do vrtulníku',
    'Sekundární převoz',
    'Sekundární převoz mezikrajský',
    'TECHNICKÁ JÍZDA',
    'Vstřícná jízda',
  ],
  klasifikaceVsechny: [
    'Alergické reakce', 'Amputace', 'Arytmie', 'Asistence', 'Bolest', 'Bolesti na hrudi', 'CMP', 'CZS',
    'Diabetické stavy', 'Dopravní nehoda', 'Dušnost', 'Gynekologické stavy', 'Horečka', 'Hypertenze',
    'Intoxikace', 'Křečové stavy', 'MU - MATRA 722', 'Neúrazové krvácení', 'Neurologické stavy',
    'NZO – spatřená', 'Oběšení', 'Pediatrické stavy', 'Popálení, poleptání', 'Porucha vědomí',
    'Převoz', 'Psychiatrické stavy', 'Resuscitace', 'Technická jízda', 'Tonutí',
    'Trauma', 'Vstřícná jízda', 'Zvracení/průjem',
  ],

  streets: ['Nádražní', 'Školní', 'Zahradní', 'Lipová', 'Polní', 'Sídliště', 'Husova', 'Komenského', 'Jiráskova', 'Pražská', 'Na Výsluní', 'Dlouhá', 'Příčná', 'Mírová', 'Okružní', 'Větrná'],
};

// Kalibrace indikací podle reálných výjezdů ZZS JčK (leden + červenec 2026, primární výjezdy; viz docs/OTAZKY.md).
// w = váha (podíl událostí ‰), n = podíl naléhavosti, dyn = podíl DYNAMICKÉ INDIKACE mezi N2 (jen N2, u CMP prakticky nikdy),
// rvInit = pravděpodobnost lékaře hned u N2 bez dynamické, rvPd = lékař později u dynamické N2, rvP = lékař později u N3,
// ageQ = kvantily věku dospělých [p5, p25, p50, p75, p95], pF = podíl žen, sceneQ = čas na místě [p10, p50, p90] v minutách, trans = podíl převozu.
ZOS_DATA.indCal = {
  porucha: { w: 92.47, n: { '1': 0.115, '2': 0.309, '3': 0.575 }, dyn: 0.231, rvInit: 1, rvPd: 0.12, rvP: 0.046, ageQ: [23, 50, 70, 80, 90], pF: 0.532, sceneQ: [8.7, 19.7, 37.3], trans: 0.79 },
  dusnost: { w: 83.95, n: { '1': 0.058, '2': 0.625, '3': 0.317 }, dyn: 0.615, rvInit: 1, rvPd: 0.077, rvP: 0.006, ageQ: [36.1, 66, 75, 83, 91], pF: 0.499, sceneQ: [9.4, 19.5, 33.3], trans: 0.95 },
  hrudnik: { w: 53.68, n: { '1': 0.003, '2': 0.72, '3': 0.277 }, dyn: 0.532, rvInit: 1, rvPd: 0.052, rvP: 0.016, ageQ: [31, 51, 68, 78, 87.7], pF: 0.457, sceneQ: [11.7, 20.1, 33.1], trans: 0.95 },
  cmp: { w: 31.22, n: { '1': 0.005, '2': 0.903, '3': 0.092 }, dyn: 0.003, rvInit: 0.1, ageQ: [42, 67, 76, 82, 89.9], pF: 0.492, sceneQ: [12.2, 20.7, 32.1], trans: 0.97, rvPd: 0.09 },
  kreceU: { w: 16.81, n: { '2': 0.777, '3': 0.223 }, dyn: 0.256, rvInit: 1, rvPd: 0.077, ageQ: [19, 29.5, 42, 53, 80], pF: 0.448, sceneQ: [10.2, 16.7, 30.8], trans: 0.91 },
  alerg: { w: 31.14, n: { '1': 0.031, '2': 0.537, '3': 0.432 }, dyn: 0.614, rvInit: 1, rvPd: 0.074, rvP: 0.024, ageQ: [19, 34.8, 49, 63, 78], pF: 0.544, sceneQ: [8.5, 15.8, 31.7], trans: 0.8 },
  diab: { w: 5.73 },
  aryt: { w: 16.81, n: { '1': 0.005, '2': 0.341, '3': 0.654 }, dyn: 0.181, rvInit: 1, rvP: 0.015, ageQ: [26.1, 50, 68, 77, 86], pF: 0.559, sceneQ: [9.3, 16.9, 29.1], trans: 0.96, rvPd: 0.09 },
  hypert: { w: 24.45, n: { '2': 0.01, '3': 0.99 }, rvP: 0.013, ageQ: [46, 65, 77, 82, 89.7], pF: 0.697, sceneQ: [8.2, 17.1, 31.6], trans: 0.92 },
  intox: { w: 19.28, n: { '1': 0.004, '2': 0.236, '3': 0.76 }, dyn: 0.316, rvP: 0.07, ageQ: [18, 24, 38, 51, 74], pF: 0.439, sceneQ: [6.4, 14.3, 30.7], trans: 0.85, rvPd: 0.09 },
  krvac: { w: 30.35, n: { '1': 0.005, '2': 0.089, '3': 0.906 }, rvP: 0.009, ageQ: [26.9, 56, 75, 83, 91], pF: 0.436, sceneQ: [6.6, 14.5, 26.5], trans: 0.94 },
  neuro: { w: 50.34, n: { '1': 0.003, '2': 0.006, '3': 0.991 }, rvP: 0.008, ageQ: [33, 57, 72, 81, 89], pF: 0.584, sceneQ: [8.9, 18.5, 30.5], trans: 0.93 },
  psych: { w: 35.36, n: { '2': 0.169, '3': 0.831 }, dyn: 0.467, rvInit: 1, rvP: 0.103, ageQ: [19, 31, 44, 59.5, 82.9], pF: 0.442, sceneQ: [5.7, 16, 37.7], trans: 0.82, rvPd: 0.09 },
  horecka: { w: 19.51, n: { '2': 0.024, '3': 0.976 }, rvP: 0.017, ageQ: [30.4, 60, 73, 80, 90], pF: 0.434, sceneQ: [7.9, 15.5, 28.4], trans: 0.95 },
  zvraceni: { w: 44.84, n: { '2': 0.005, '3': 0.995 }, rvP: 0.002, ageQ: [22, 37, 66, 80, 91], pF: 0.627, sceneQ: [6.3, 14.4, 26.4], trans: 0.97 },
  bolest: { w: 144.8, n: { '1': 0.001, '2': 0.025, '3': 0.975 }, dyn: 0.733, rvP: 0.009, ageQ: [25, 48, 67, 79, 89], pF: 0.508, sceneQ: [5.8, 13.9, 27], trans: 0.95, rvPd: 0.09 },
  gyn: { w: 6.61, pF: 0.99 },
  dn_lehke: { w: 24.9, n: { '2': 0.279, '3': 0.721 }, dyn: 0.287, rvInit: 1, rvP: 0.013, ageQ: [19, 30, 44, 59, 78], pF: 0.375, sceneQ: [7.1, 16.7, 36.4], trans: 0.89, rvPd: 0.09 },
  dn_poly: { w: 0.6 },
  trauma: { w: 190.97, n: { '1': 0.005, '2': 0.063, '3': 0.932 }, dyn: 0.317, rvInit: 1, rvPd: 0.078, rvP: 0.016, ageQ: [22, 45, 67, 81, 91], pF: 0.471, sceneQ: [5.6, 13.6, 28.4], trans: 0.96 },
  trauma_dite: { w: 21.22 },
  popal: { w: 2.95 },
  asist: { w: 9.08, rvP: 0.047 },
  czs: { w: 41.9, n: { '1': 0.002, '2': 0.027, '3': 0.971 }, rvP: 0.024, ageQ: [46, 68, 77, 83, 90.1], pF: 0.459, sceneQ: [9.9, 18.7, 32.5], trans: 0.92 },
  tonuti: { w: 0.56 },
  obeseni: { w: 0.16 },
  nzo: { w: 0.32 },
  resus: { w: 0.08 },
  amput: { w: 0.05 },
  pedi: { w: 0.2 },
};
ZOS_DATA.ageChildQ = [0, 4, 10, 15, 17];   // kvantily věku dětí (<18 let) [p5, p25, p50, p75, p95]
ZOS_DATA.rvSceneQ = { N1: [9.7, 27.1, 54], N2: [8, 18.5, 34.2], N3: [5.1, 21.1, 47.8] };   // čas lékařské posádky na místě [p10, p50, p90] podle naléhavosti (min)
// Kalibrace typu místa (násobky vah v _pickWhere): rozložení podle reálných událostí (RD ~34 %, byt ~33 %, domov ~4 %, terén ~17 %, zdravotnické zařízení ~2 %).
ZOS_DATA.whereCal = { rd: 1.08, byt: 1.23, domov: 0.28, ulice: 1.15, silnice: 3.45, priroda: 12.8, prov: 0.53, skola: 8, ordinace: 0.14 };
// Model volného textu „popis místa“ a „poznámka ZOS“ ze skutečných zápisů calltakerů (za „#nazev:“ v poznámce ZOS; leden + červenec 2026).
// Zápis se skládá ze segmentů: O = typ objektu (RD, BOD, DPS…), F = patro, S = složky/lékař, X = volná fráze (příznak, okolnost), I = název indikace.
// pat = vzory segmentů a jejich četnost podle třídy místa, X: [fráze, četnost, {indikace: četnost}, L (poloha) | N (poznámka)], # = číslo.
// Povrchové tvary (velká/malá písmena, (ne)diakritika) jsou převzaty tak, jak se v datech vyskytují; fráze s četností < 4 a vlastní jména jsou vyřazeny.
ZOS_DATA.placeModel = {model:{rd:{pat:[["O",2029],["O X",657],["O X X",239],["O X X X",76],["S O",59],["O S",32],["S X O",19],["O X X X X",19],["S O X",18],["S O X X",14],["O X S",13],["O S X",12],["X O",11],["O I",8],["X O X",8],["O X I",7],["O I X",7],["S X O X",6]],O:[["RD",2619],["rd",531],["chalupa",46],["řadovka",40],["statek",28],["dvojdomek",10],["novostavba",6],["Chalupa",6],["Rd",4],["Statek",4]],F:[["#.p.",5]],S:[["+ libero",8,"G"],["PČR na místě",7,"P"],["LIBERO",4,"G"]],X:[["vertigo",29,{"Dušnost":4,Hypertenze:6,CZS:3,"Porucha vědomí":3,"Bolesti na hrudi":2,Bolest:5,Trauma:2},"N"],["zvrací",20,{CZS:3,"Neurologické stavy":7,"Dušnost":2,Bolest:4},"N"],["slabost",16,{CZS:8,"Neurologické stavy":3,"Horečka":2},"N"],["nauzea",16,{Bolest:3,"Neurologické stavy":3,Trauma:2,Hypertenze:3},"N"],["imobilní",15,{"Neúrazové krvácení":2,Bolest:6,CZS:2},"N"],["zhoršení stavu",13,{"Porucha vědomí":2,CMP:2},"N"],["PMK",12,{"Horečka":3,Bolest:5,"Neúrazové krvácení":3},"N"],["ležící",11,{"Neúrazové krvácení":2,CZS:2,"Dušnost":2},"N"],["třes",10,{Hypertenze:3},"N"],["epistaxe",9,{"Neúrazové krvácení":7},"N"],["diabetik",9,{"Horečka":2,"Zvracení/průjem":2,CZS:2,Bolest:2},"N"],["zmatený",9,{Trauma:3,CMP:2,"Horečka":2},"N"],["teplota",9,{"Neurologické stavy":4,CZS:2,Bolest:2},"N"],["zvracela",9,{"Neurologické stavy":3},"N"],["kašel",8,{"Dušnost":4},"N"],["zhoršení",8,{"Dušnost":2},"N"],["ředěná",8,{"Neúrazové krvácení":4,Trauma:3},"N"],["onkol.pac.",7,{Bolest:2},"N"],["bolest hlavy",7,{"Neurologické stavy":3,Hypertenze:4},"N"],["slabost DK",7,{CZS:2,CMP:2,"Neurologické stavy":3},"N"],["včera pád",7,{Trauma:2,Bolest:3},"N"],["hypotenze",7,{CZS:4},"N"],["zmatenost",7,{CMP:2,Trauma:2},"N"],["otoky DK",7,{CZS:2,"Dušnost":3},"N"],["hematurie",6,{"Horečka":2,Bolest:3},"N"],["+ zvrací",6,{},"N"],["po kolapsu",6,{Trauma:2,"Zvracení/průjem":2},"N"],["nejí",6,{CZS:3},"N"],["dm na inzul",6,{Trauma:2},"N"],["demence",6,{CZS:3},"N"],["+ horečka",5,{"Dušnost":2},"N"],["anurie",5,{Bolest:2},"N"],["po pádu",5,{"Porucha vědomí":2},"N"],["onkologický",5,{},"N"],["na ATB",5,{},"N"],["bledý",5,{Bolest:2},"N"],["zvracel",5,{Bolest:3},"N"],["TK #",5,{Hypertenze:4},"N"],["kardiak",5,{"Neurologické stavy":3,CZS:2},"N"],["zimnice",5,{Bolest:2,"Zvracení/průjem":2},"N"],["do jazyka",5,{"Alergické reakce":5},"N"],["zvracení",4,{},"N"],["průjem",4,{Bolest:3},"N"],["chřipka",4,{"Dušnost":2},"N"],["zmatená",4,{},"N"],["bolest břicha",4,{},"N"],["onko pacient",4,{},"N"],["opocený",4,{},"N"],["+nauzea",4,{"Neurologické stavy":2},"N"],["pád ze schodů",4,{Trauma:4},"N"],["nepije",4,{CZS:2},"N"],["rozrušená",4,{},"N"]]},jine:{pat:[["X",1342],["X X",652],["I",337],["X X X",221],["S",186],["S X",121],["X S",50],["X X X X",47],["S X X",40],["S X X X",19],["X X X X X",16],["S I",13],["X X S",12],["O",11],["X I",10],["X S X",10],["O X",8],["S X X X X",7],["S S",6]],O:[["ZŠ",17]],F:[],S:[["PČR na místě",20,"P"],["OO PČR",15,"P"],["na místě PČR",14,"P"],["+ LIBERO",11,"G"],["+ libero",9,"G"],["+libero",7,"G"],["stanice HS",7,"G"],["MěP na místě",7,"P"],["+PČR",5,"P"],["na stanici HS",5,"G"],["na místě policie",4,"P"],["na služebně PČR",4,"P"],["služebna PČR",4,"P"],["na místě MěP",4,"P"]],X:[["vertigo",23,{"Bolesti na hrudi":2,Hypertenze:6,Bolest:4,"Porucha vědomí":4,"Dušnost":3},"N"],["průjem",23,{"Zvracení/průjem":20,"Porucha vědomí":2},"N"],["před domem",22,{Bolest:5,"Porucha vědomí":4,Trauma:5,"Psychiatrické stavy":2},"L"],["zhoršení stavu",21,{"Vstřícná jízda":7,"Dušnost":4,"Křečové stavy":2,CZS:2},"N"],["Zvracení",19,{"Zvracení/průjem":19},"N"],["zvracení",12,{"Bolesti na hrudi":2,"Dušnost":3},"N"],["samota",11,{CMP:2,Trauma:6},"N"],["#.p slabost",10,{"Neurologické stavy":4,"Zvracení/průjem":4},"N"],["nausea",10,{Bolest:2,CZS:3,Hypertenze:2},"N"],["zvrací",10,{"Neurologické stavy":4,"Porucha vědomí":2},"N"],["zmatený",9,{"Horečka":2,CZS:3},"N"],["RD slabost",9,{"Horečka":2,CZS:2,Bolest:2,"Porucha vědomí":2},"N"],["prekolaps",9,{Trauma:3,Bolest:2},"N"],["recepce",8,{"Neúrazové krvácení":2},"L"],["po kolapsu",8,{Trauma:3,"Porucha vědomí":3},"N"],["počká venku",8,{Trauma:2,Bolest:2},"L"],["třes",8,{Hypertenze:2},"N"],["RD vertigo",8,{Bolest:2,Hypertenze:3,"Dušnost":2},"N"],["alkohol",7,{"Porucha vědomí":4,"Psychiatrické stavy":3},"N"],["lázně",7,{Trauma:5},"L"],["teplota",7,{Bolest:2},"N"],["zmatená",6,{},"N"],["budou čekat venku",6,{Trauma:3},"L"],["epistaxe",6,{"Neúrazové krvácení":5},"N"],["zhoršení",6,{"Dušnost":3,Bolest:2},"N"],["nauzea",6,{Hypertenze:2,"Neurologické stavy":2},"N"],["azylový dům",6,{"Psychiatrické stavy":2},"L"],["zimní stadion",6,{Trauma:6},"L"],["restaurace",6,{Trauma:4},"L"],["hypotenze",6,{"Neurologické stavy":2},"N"],["nepije",6,{CZS:4},"N"],["TK #",6,{Hypertenze:5},"N"],["hospoda",6,{"Porucha vědomí":2},"L"],["bolest břicha",5,{"Neúrazové krvácení":2},"N"],["bude čekat venku",5,{},"L"],["otoky DK",5,{CZS:2},"N"],["+ teplota",5,{"Bolesti na hrudi":2,Bolest:2},"N"],["kašel",5,{"Dušnost":2},"N"],["výchovný ústav",5,{"Psychiatrické stavy":2,Trauma:2},"N"],["hematurie",5,{CZS:2,"Neúrazové krvácení":3},"N"],["vrátnice",5,{"Porucha vědomí":2},"L"],["onkol.pac.",5,{Bolest:2},"N"],["vazební věznice",5,{},"N"],["slabost",5,{"Neurologické stavy":2},"N"],["počká dole",4,{},"L"],["bércové vředy",4,{Bolest:4},"N"],["RD zvrací",4,{},"N"],["řadový RD",4,{},"N"],["kardiak",4,{},"N"],["na vrátnici navedou",4,{"Porucha vědomí":3},"L"],["na recepci navedou",4,{},"L"],["pocit dušnosti",4,{CZS:3},"N"],["zvracela",4,{Bolest:2},"N"],["čekají venku",4,{Trauma:2},"L"],["počkají venku",4,{},"L"],["zmatenost",4,{"Dušnost":2},"N"],["SENEVIDA",4,{},"N"],["chráněné bydlení",4,{CZS:2},"N"],["+ alkohol",4,{"Porucha vědomí":2},"N"],["imobilní",4,{Trauma:2},"N"],["budou čekat na vrátnici",4,{},"L"],["+ zvracení",4,{},"N"],["nejí",4,{CZS:2},"N"],["stavení",4,{},"N"],["čeká venku",4,{},"L"]]},bod:{pat:[["X",509],["O X",374],["O X X",233],["X X",222],["O",192],["X X X",79],["O X X X",63],["O S",59],["S",57],["X S",56],["O X S",48],["S X",40],["O S X",23],["O X X X X",20],["X S X",17],["X X S",16],["X X X X",16],["O X S X",12],["X X X X X",11],["I",10],["S X X",9],["X X X S",8],["O X X S",8],["S O X",8],["O S X X",6]],O:[["BOD",976],["bod",81],["RD",15],["rd",9],["kemp",9]],F:[],S:[["PČR na místě",49,"P"],["MěP na místě",45,"P"],["na místě MěP",27,"P"],["na místě PČR",27,"P"],["na místě policie",8,"P"],["+MěP",7,"P"],["policie na místě",6,"P"],["HS na místě",5,"G"],["+ libero",5,"G"],["+LIBERO",4,"G"],["pčr na místě",4,"P"]],X:[["před domem",35,{Trauma:15,"Psychiatrické stavy":4,Intoxikace:4,"Porucha vědomí":4,Bolest:2},"L"],["po kolapsu",16,{Trauma:14},"N"],["alkohol",13,{"Porucha vědomí":3,"Psychiatrické stavy":2},"N"],["ebrieta",13,{Trauma:4,"Psychiatrické stavy":2,"Porucha vědomí":4},"N"],["# OA",13,{"Dopravní nehoda":12},"N"],["# osoby",10,{"Dopravní nehoda":9},"N"],["na zahradě",10,{Trauma:4,"Alergické reakce":3},"L"],["na ulici",10,{"Psychiatrické stavy":2,Trauma:2},"L"],["# osoba",9,{"Dopravní nehoda":9},"N"],["DN # OA",9,{"Dopravní nehoda":9},"N"],["v autě",8,{Trauma:2,"Porucha vědomí":2,Bolest:2},"L"],["# zraněný",8,{"Dopravní nehoda":8},"N"],["#x OA",8,{"Dopravní nehoda":8},"N"],["letní tábor",8,{"Dušnost":2,Trauma:4},"L"],["budou mávat",7,{"Porucha vědomí":2},"L"],["zhoršení stavu",7,{"Porucha vědomí":3,"Dopravní nehoda":2},"N"],["venku",6,{},"L"],["bezdomovec",6,{Trauma:3},"L"],["vertigo",6,{"Porucha vědomí":3},"N"],["# oa",6,{"Dopravní nehoda":6},"N"],["BOD před domem",6,{Trauma:3},"L"],["vodáci",6,{Trauma:3,"Alergické reakce":2},"N"],["vlakové nádraží",5,{Trauma:3},"L"],["autobusová zastávka",5,{},"L"],["venku před domem",5,{Trauma:2},"L"],["# zraněná osoba",4,{"Dopravní nehoda":4},"N"],["# x OA",4,{"Dopravní nehoda":3},"N"],["posouzení",4,{"Porucha vědomí":3},"N"],["zastávka MHD",4,{},"L"],["+ alkohol",4,{"Porucha vědomí":2},"N"],["# osoba zraněná",4,{"Dopravní nehoda":4},"N"],["DN",4,{"Dopravní nehoda":3},"N"],["epistaxe",4,{"Neúrazové krvácení":3},"N"],["dětský tábor",4,{},"L"],["nauzea",4,{Bolest:2},"N"],["fotbalové hřiště",4,{Trauma:3},"L"]]},byt:{pat:[["F",1440],["F X",657],["F X X",233],["X F",153],["O X",96],["X F X",72],["F X X X",66],["O F",59],["O X X",45],["OF",41],["O F X",33],["F S",32],["S F",32],["O X X X",28],["F X X X X",25],["O",22],["S X F",19],["X F X X",16],["O O",16],["F X S",12],["S F X",12],["OF X X",12],["OF X",12],["O F X X",12],["O S",11],["X X F",11],["O X S",10],["O X X X X",9],["X X F X",7],["O O X",7]],O:[["BOD",271],["bytovka",162],["Bytovka",25],["panelák",17],["RD",13],["chata",12],["panel",7],["bod",6]],F:[["#.p.",838],["#.p",706],["#p",470],["#.patro",348],["přízemí",296],["#p.",144],["# patro",136],["příz.",51],["#. patro",31],["Přízemí",16],["zvýšené přízemí",11],["zv. přízemí",9],["#.P",7],["#. p",6]],S:[["PČR na místě",14,"P"],["+ libero",11,"G"],["na místě PČR",10,"P"],["na místě policie",4,"P"],["na místě pečovatelka",4,"G"]],X:[["vertigo",27,{"Dušnost":2,Hypertenze:7,Trauma:4,Arytmie:2,CZS:6},"N"],["zhoršení stavu",21,{"Dušnost":7,"Vstřícná jízda":2,CMP:3},"N"],["nauzea",18,{"Neurologické stavy":7,"Bolesti na hrudi":2,Hypertenze:2,Bolest:3},"N"],["Senevida",17,{Trauma:9,"Neúrazové krvácení":2,"Dušnost":3},"N"],["zvrací",13,{Bolest:3,"Neurologické stavy":4,CZS:3},"N"],["zvracení",11,{"Vstřícná jízda":2,Bolest:3},"N"],["imobilní",11,{CZS:2,"Zvracení/průjem":2,Trauma:2},"N"],["byt č.#",11,{Bolest:3,Trauma:2},"L"],["onkol.pac.",11,{"Dušnost":4,Bolest:4},"N"],["po kolapsu",11,{CMP:2,Trauma:5},"N"],["třes",9,{CZS:4},"N"],["kašel",9,{"Dušnost":4,CZS:3},"N"],["epistaxe",9,{"Neúrazové krvácení":8},"N"],["průjem",9,{CZS:2,Bolest:2},"N"],["teplota",9,{Bolest:2,"Neurologické stavy":2,CZS:2},"N"],["hypotenze",9,{"Porucha vědomí":5,CZS:2},"N"],["#.porod",8,{"Gynekologické stavy":8},"N"],["otoky DK",8,{"Dušnost":4,CZS:3},"N"],["slabost",8,{Arytmie:2,CZS:3},"N"],["nevolnost",7,{},"N"],["slabost DK",7,{CZS:2,"Neurologické stavy":3},"N"],["samota",7,{Bolest:2},"N"],["bolest hlavy",7,{Hypertenze:2,"Horečka":2},"N"],["diabetik",6,{"Zvracení/průjem":2},"N"],["tachykardie",6,{"Dušnost":2,Arytmie:4},"N"],["TK #",6,{Hypertenze:4},"N"],["byt č. #",6,{Bolest:2},"L"],["hematurie",6,{"Neúrazové krvácení":3},"N"],["anurie",6,{Bolest:5},"N"],["+ zvrací",6,{Bolest:4},"N"],["PMK",6,{Bolest:2,"Neúrazové krvácení":2,CZS:2},"N"],["senevida",6,{"Neúrazové krvácení":2,Trauma:4},"N"],["+ vertigo",5,{Hypertenze:2},"N"],["kardiak",5,{},"N"],["DM na inz.",5,{"Diabetické stavy":3},"N"],["+vertigo",5,{},"N"],["+ zvracení",5,{Bolest:2},"N"],["zvracela",5,{},"N"],["ředěná",5,{"Neúrazové krvácení":3},"N"],["po pádu",5,{},"N"],["alkohol",5,{"Psychiatrické stavy":2},"N"],["nausea",5,{Bolest:2,"Neurologické stavy":2},"N"],["+zvracení",5,{},"N"],["nejí",5,{CZS:3},"N"],["neprůchodný PMK",4,{Bolest:3},"N"],["peč.dům",4,{},"N"],["prekolaps",4,{},"N"],["+ bol. břicha",4,{"Neúrazové krvácení":3},"N"],["schizofrenik",4,{"Psychiatrické stavy":3},"N"],["zmatená",4,{Trauma:2},"N"],["+nauzea",4,{},"N"],["otok DK",4,{CZS:2,Bolest:2},"N"],["peč. dům",4,{},"N"],["byt číslo #",4,{"Neurologické stavy":2},"L"],["Senior dům",4,{Trauma:2},"N"],["vchod B",4,{},"L"],["ředěný",4,{Trauma:2,"Neúrazové krvácení":2},"N"],["pokoj #",4,{Bolest:2},"L"],["cizinec",4,{},"N"],["pád z postele",4,{Trauma:4},"N"],["ležící",4,{},"N"],["celková slabost",4,{CZS:2},"N"],["zmatenost",4,{},"N"],["CHOPN",4,{},"N"],["CA plic",4,{"Dušnost":2},"N"],["nepije",4,{CZS:2},"N"],["+ bolest břicha",4,{},"N"]]},domov:{pat:[["O F",160],["OF",99],["O F X",61],["O X",45],["OF X",26],["O F X X",18],["O",15],["O X X",15],["O X F",13],["OF X X",10],["O F X X X",7]],O:[["DPS",219],["DD",200],["DS",75],["dd",28]],F:[["#.p.",113],["#.p",97],["#p",66],["přízemí",57],["#.patro",46],["# patro",28],["#p.",17],["příz.",7]],S:[],X:[["byt č.#",6,{CZS:2,"Dušnost":3},"L"],["B#",5,{Trauma:2},"N"],["byt #",4,{},"N"],["pokoj #",4,{Bolest:3},"L"],["č. dveří #",4,{Bolest:2},"L"],["nová budova",4,{Trauma:2},"L"]]},ubyt:{pat:[["O",55],["O X",35],["O F",10],["O X X",7],["O F X",6],["OF",6]],O:[["ubytovna",81],["chata",36],["penzion",14],["Ubytovna",10],["Chata",10]],F:[["přízemí",11],["#.p",8],["#.p.",7],["#p",5],["#.patro",4]],S:[],X:[]},zz:{pat:[["X",109],["X X",63],["X X X",21],["X F",19],["F X",16],["X F X",15],["X X X X",8]],O:[["DD",5]],F:[["#.p",21],["přízemí",17],["#.p.",10],["#p",10],["#.patro",6],["# patro",4]],S:[],X:[["PK",6,{Arytmie:2},"N"],["hypotenze",5,{},"N"],["poliklinika",5,{"Bolesti na hrudi":2},"L"],["LDN",5,{},"N"],["AIM",4,{"Převoz":3},"N"],["dojde",4,{"Převoz":4},"L"],["PZS ad PSO",4,{"Převoz":4},"N"]]},_glob:{X:[["vertigo",85,{"Dušnost":9,Hypertenze:19,CZS:9,"Porucha vědomí":10,"Bolesti na hrudi":4,Bolest:9,Trauma:6,Arytmie:2},"N"],["zhoršení stavu",62,{"Porucha vědomí":5,CMP:5,"Vstřícná jízda":9,"Dušnost":11,"Křečové stavy":2,CZS:2,"Dopravní nehoda":2},"N"],["před domem",57,{Bolest:7,"Porucha vědomí":8,Trauma:20,"Psychiatrické stavy":6,Intoxikace:4},"L"],["nauzea",44,{Bolest:8,"Neurologické stavy":12,Trauma:2,Hypertenze:7,"Bolesti na hrudi":2},"N"],["zvrací",43,{CZS:6,"Neurologické stavy":15,"Dušnost":2,Bolest:7,"Porucha vědomí":2},"N"],["po kolapsu",41,{Trauma:24,"Zvracení/průjem":2,"Porucha vědomí":3,CMP:2},"N"],["průjem",36,{Bolest:5,"Zvracení/průjem":20,"Porucha vědomí":2,CZS:2},"N"],["imobilní",30,{"Neúrazové krvácení":2,Bolest:6,CZS:4,Trauma:4,"Zvracení/průjem":2},"N"],["slabost",29,{CZS:11,"Neurologické stavy":5,"Horečka":2,Arytmie:2},"N"],["epistaxe",28,{"Neúrazové krvácení":23},"N"],["třes",27,{Hypertenze:5,CZS:4},"N"],["zvracení",27,{"Bolesti na hrudi":2,"Dušnost":3,"Vstřícná jízda":2,Bolest:3},"N"],["teplota",25,{"Neurologické stavy":6,CZS:4,Bolest:6},"N"],["alkohol",25,{"Porucha vědomí":7,"Psychiatrické stavy":7},"N"],["onkol.pac.",23,{Bolest:8,"Dušnost":4},"N"],["kašel",22,{"Dušnost":10,CZS:3},"N"],["hypotenze",22,{CZS:6,"Neurologické stavy":2,"Porucha vědomí":5},"N"],["otoky DK",20,{CZS:7,"Dušnost":7},"N"],["Zvracení",19,{"Zvracení/průjem":19},"N"],["PMK",18,{"Horečka":3,Bolest:7,"Neúrazové krvácení":5,CZS:2},"N"],["zmatený",18,{Trauma:3,CMP:2,"Horečka":4,CZS:3},"N"],["zvracela",18,{"Neurologické stavy":3,Bolest:2},"N"],["samota",18,{CMP:2,Trauma:6,Bolest:2},"N"],["hematurie",17,{"Horečka":2,Bolest:3,CZS:2,"Neúrazové krvácení":6},"N"],["TK #",17,{Hypertenze:13},"N"],["Senevida",17,{Trauma:9,"Neúrazové krvácení":2,"Dušnost":3},"N"],["ležící",15,{"Neúrazové krvácení":2,CZS:2,"Dušnost":2},"N"],["diabetik",15,{"Horečka":2,"Zvracení/průjem":4,CZS:2,Bolest:2},"N"],["zmatenost",15,{CMP:2,Trauma:2,"Dušnost":2},"N"],["nejí",15,{CZS:8},"N"],["nausea",15,{Bolest:4,CZS:3,Hypertenze:2,"Neurologické stavy":2},"N"],["zhoršení",14,{"Dušnost":5,Bolest:2},"N"],["bolest hlavy",14,{"Neurologické stavy":3,Hypertenze:6,"Horečka":2},"N"],["slabost DK",14,{CZS:4,CMP:2,"Neurologické stavy":6},"N"],["kardiak",14,{"Neurologické stavy":3,CZS:2},"N"],["zmatená",14,{Trauma:2},"N"],["nepije",14,{CZS:8},"N"],["ředěná",13,{"Neúrazové krvácení":7,Trauma:3},"N"],["prekolaps",13,{Trauma:3,Bolest:2},"N"],["ebrieta",13,{Trauma:4,"Psychiatrické stavy":2,"Porucha vědomí":4},"N"],["# OA",13,{"Dopravní nehoda":12},"N"],["+ zvrací",12,{Bolest:4},"N"],["anurie",11,{Bolest:7},"N"],["byt č.#",11,{Bolest:3,Trauma:2},"L"],["po pádu",10,{"Porucha vědomí":2},"N"],["#.p slabost",10,{"Neurologické stavy":4,"Zvracení/průjem":4},"N"],["# osoby",10,{"Dopravní nehoda":9},"N"],["na zahradě",10,{Trauma:4,"Alergické reakce":3},"L"],["na ulici",10,{"Psychiatrické stavy":2,Trauma:2},"L"],["bolest břicha",9,{"Neúrazové krvácení":2},"N"],["RD slabost",9,{"Horečka":2,CZS:2,Bolest:2,"Porucha vědomí":2},"N"],["+ zvracení",9,{Bolest:2},"N"],["# osoba",9,{"Dopravní nehoda":9},"N"],["DN # OA",9,{"Dopravní nehoda":9},"N"],["+nauzea",8,{"Neurologické stavy":2},"N"],["recepce",8,{"Neúrazové krvácení":2},"L"],["počká venku",8,{Trauma:2,Bolest:2},"L"],["RD vertigo",8,{Bolest:2,Hypertenze:3,"Dušnost":2},"N"],["+ alkohol",8,{"Porucha vědomí":4},"N"],["#.porod",8,{"Gynekologické stavy":8},"N"],["v autě",8,{Trauma:2,"Porucha vědomí":2,Bolest:2},"L"],["# zraněný",8,{"Dopravní nehoda":8},"N"],["#x OA",8,{"Dopravní nehoda":8},"N"],["letní tábor",8,{"Dušnost":2,Trauma:4},"L"],["včera pád",7,{Trauma:2,Bolest:3},"N"],["lázně",7,{Trauma:5},"L"],["nevolnost",7,{},"N"],["budou mávat",7,{"Porucha vědomí":2},"L"],["dm na inzul",6,{Trauma:2},"N"],["demence",6,{CZS:3},"N"],["budou čekat venku",6,{Trauma:3},"L"],["azylový dům",6,{"Psychiatrické stavy":2},"L"],["zimní stadion",6,{Trauma:6},"L"],["restaurace",6,{Trauma:4},"L"],["hospoda",6,{"Porucha vědomí":2},"L"],["tachykardie",6,{"Dušnost":2,Arytmie:4},"N"],["byt č. #",6,{Bolest:2},"L"],["senevida",6,{"Neúrazové krvácení":2,Trauma:4},"N"],["venku",6,{},"L"],["bezdomovec",6,{Trauma:3},"L"],["# oa",6,{"Dopravní nehoda":6},"N"],["BOD před domem",6,{Trauma:3},"L"],["vodáci",6,{Trauma:3,"Alergické reakce":2},"N"],["+ horečka",5,{"Dušnost":2},"N"],["onkologický",5,{},"N"],["na ATB",5,{},"N"],["bledý",5,{Bolest:2},"N"],["zvracel",5,{Bolest:3},"N"],["zimnice",5,{Bolest:2,"Zvracení/průjem":2},"N"],["do jazyka",5,{"Alergické reakce":5},"N"],["bude čekat venku",5,{},"L"],["+ teplota",5,{"Bolesti na hrudi":2,Bolest:2},"N"],["výchovný ústav",5,{"Psychiatrické stavy":2,Trauma:2},"N"],["vrátnice",5,{"Porucha vědomí":2},"L"],["vazební věznice",5,{},"N"],["+ vertigo",5,{Hypertenze:2},"N"],["DM na inz.",5,{"Diabetické stavy":3},"N"],["+vertigo",5,{},"N"],["+zvracení",5,{},"N"],["vlakové nádraží",5,{Trauma:3},"L"],["autobusová zastávka",5,{},"L"],["venku před domem",5,{Trauma:2},"L"],["chřipka",4,{"Dušnost":2},"N"],["onko pacient",4,{},"N"],["opocený",4,{},"N"],["pád ze schodů",4,{Trauma:4},"N"],["rozrušená",4,{},"N"],["počká dole",4,{},"L"],["bércové vředy",4,{Bolest:4},"N"],["RD zvrací",4,{},"N"],["řadový RD",4,{},"N"],["na vrátnici navedou",4,{"Porucha vědomí":3},"L"],["na recepci navedou",4,{},"L"],["pocit dušnosti",4,{CZS:3},"N"],["čekají venku",4,{Trauma:2},"L"],["počkají venku",4,{},"L"],["SENEVIDA",4,{},"N"],["chráněné bydlení",4,{CZS:2},"N"],["budou čekat na vrátnici",4,{},"L"],["stavení",4,{},"N"],["čeká venku",4,{},"L"],["neprůchodný PMK",4,{Bolest:3},"N"],["peč.dům",4,{},"N"],["+ bol. břicha",4,{"Neúrazové krvácení":3},"N"],["schizofrenik",4,{"Psychiatrické stavy":3},"N"],["otok DK",4,{CZS:2,Bolest:2},"N"],["peč. dům",4,{},"N"],["byt číslo #",4,{"Neurologické stavy":2},"L"],["Senior dům",4,{Trauma:2},"N"],["vchod B",4,{},"L"],["ředěný",4,{Trauma:2,"Neúrazové krvácení":2},"N"],["pokoj #",4,{Bolest:2},"L"],["cizinec",4,{},"N"],["pád z postele",4,{Trauma:4},"N"],["celková slabost",4,{CZS:2},"N"],["CHOPN",4,{},"N"],["CA plic",4,{"Dušnost":2},"N"],["+ bolest břicha",4,{},"N"],["# zraněná osoba",4,{"Dopravní nehoda":4},"N"],["# x OA",4,{"Dopravní nehoda":3},"N"]]}},floors:{"1":0.31,"2":0.247,"3":0.169,"4":0.11,"5":0.051,"6":0.047,"7":0.032,"8":0.025,"9":0.004,"10":0.002,"11":0.002,"12":0.001},sep:[[", ",0.431],[",",0.31],["/",0.149],["/ ",0.034],[" /",0.018],[" / ",0.017],[" ,",0.01],[" , ",0.01]]};
// třída zápisu podle typu místa (podíl, že calltaker typ zapíše, jinak jen volný text = „jine“)
ZOS_DATA.tailMix = {
  rd: [['rd', 0.72], ['jine', 0.28]], byt: [['byt', 0.78], ['jine', 0.22]], domov: [['domov', 0.9], ['jine', 0.1]], ubytovani: [['ubyt', 0.7], ['jine', 0.3]],
  ulice: [['bod', 1]], silnice: [['bod', 1]], priroda: [['bod', 1]], sport: [['bod', 1]], ordinace: [['zz', 1]], zz: [['zz', 1]],
  prov: [['jine', 1]], skola: [['jine', 1]], verejne: [['jine', 1]],
};
// Hustota událostí podle obce: násobek váhy adresy (reálný podíl událostí / podíl adresních bodů; ČB ×2,9, Písek ×2,2, Strakonice ×2,5, Milevsko ×1,6, menší obce ~×0,7).
// Násobky jsou omezeny na 6 (po rozšíření adres z celého pbf už cap potřebuje jen málo obcí). Ostatní obce: obecMulOther.
ZOS_DATA.obecMul = {"České Budějovice": 2.88, "Tábor": 1.35, "Písek": 2.24, "Strakonice": 2.53, "Jindřichův Hradec": 1.41, "Český Krumlov": 1.58, "Třeboň": 1.72, "Vimperk": 2.1, "Soběslav": 1.35, "Milevsko": 1.58, "Prachatice": 1.57, "Veselí nad Lužnicí": 1.61, "Dačice": 1.28, "Týn nad Vltavou": 1.11, "Vodňany": 1.1, "Kaplice": 1.23, "Sezimovo Ústí": 0.69, "Dobrá Voda u Českých Budějovic": 2.43, "Bechyně": 1.13, "Blatná": 1.05, "Větřní": 2.73, "Lipno nad Vltavou": 1.79, "Trhové Sviny": 0.84, "Hluboká nad Vltavou": 0.86, "Protivín": 0.97, "Volary": 1.93, "Planá nad Lužnicí": 0.76, "Suchdol nad Lužnicí": 1.0, "Nová Bystřice": 0.86, "České Velenice": 2.1, "Lišov": 0.73, "Borovany": 0.73, "Horní Planá": 0.86, "Velešín": 1.42, "Chlum u Třeboně": 1.33, "Netolice": 1.21, "Vyšší Brod": 1.4, "Volyně": 1.06, "Stachy": 1.6, "Chelčice": 6, "Frymburk": 0.71, "Vacov": 1.0, "Kunžak": 0.81, "Rudolfov": 0.92, "Nové Hrady": 0.94, "Dolní Dvořiště": 1.77, "Zliv": 0.78, "Opařany": 1.12, "Kamenný Újezd": 0.57, "Horní Stropnice": 0.88, "Mladá Vožice": 0.59, "Nová Včelnice": 1.15, "Křemže": 0.48, "Zdíkov": 0.78, "Ledenice": 0.64, "Slavonice": 0.75, "Zlatá Koruna": 1.97, "Boršov nad Vltavou": 0.68, "Loučovice": 1.61, "Studená": 0.62, "Chýnov": 0.65, "Jistebnice": 0.59, "Benešov nad Černou": 0.72, "Kardašova Řečice": 0.59, "Bernartice": 0.7, "Litvínovice": 0.56, "Včelná": 0.69, "Kovářov": 0.54, "Čimelice": 1.13, "Malonty": 0.95, "Drhovle": 1.44, "Dříteň": 0.74, "Černá v Pošumaví": 0.57, "Lhenice": 0.6, "Kájov": 0.67, "Rožmberk nad Vltavou": 1.83, "Jílovice": 0.7, "Srubec": 0.4, "Mirovice": 0.77, "Libníč": 1.97, "Strážný": 2.55, "Bavorov": 0.5, "Čkyně": 0.69, "Lomnice nad Lužnicí": 0.56, "Olešnice": 0.83, "Chvalšiny": 0.95, "Homole": 0.56, "Borek": 0.85, "Chotoviny": 0.4, "Strmilov": 0.41, "Hrdějovice": 0.61, "Všemyslice": 0.62, "Stráž nad Nežárkou": 0.64, "Husinec": 0.73, "Dubné": 0.56, "Ratibořské Hory": 0.78, "Brloh": 0.62, "Bělčice": 0.57, "Římov": 0.42, "Staré Hodějovice": 0.58, "Podolí I": 1.08, "Košice": 0.71, "Malšice": 0.34, "Holubov": 0.46, "Dolní Bukovsko": 0.42, "Temelín": 0.74, "Vlachovo Březí": 0.39, "Mirotice": 0.49, "Dolní Třebonín": 0.64, "Novosedly nad Nežárkou": 0.67, "Roudná": 0.78, "Borová Lada": 1.38, "Sedlice": 0.43, "Rapšach": 1.03, "Sepekov": 0.47, "Stádlec": 0.65, "Předotice": 0.83, "Ševětín": 0.55, "Borotín": 0.61, "Albrechtice nad Vltavou": 0.35, "Osek": 0.75, "Vrábče": 0.6, "Besednice": 0.66, "Katovice": 0.51, "Želeč": 0.72, "Roudné": 0.41, "Nová Ves": 0.41, "Hosín": 0.66, "Budislav": 1.17, "Volenice": 0.87, "Záblatí": 0.83, "Čížkrajice": 1.66, "Český Rudolec": 0.45, "Ktiš": 1.08, "Stříbřec": 0.72, "Blažejov": 0.44, "Lnáře": 0.72, "Nová Pec": 0.63, "Zálezly": 1.33, "Radomyšl": 0.41, "Člunek": 0.77, "Klenovice": 0.58, "Jarošov nad Nežárkou": 0.45, "Sudoměřice u Bechyně": 0.46, "Pištín": 0.74, "Staňkov": 0.93, "Chrášťany": 0.49, "Hlavatce": 0.63, "Strunkovice nad Blanicí": 0.39, "Písečné": 0.72, "Rakovice": 1.62, "Záhoří": 0.48, "Staré Město pod Landštejnem": 0.78, "Dobev": 0.41, "Hořice na Šumavě": 0.64, "Nadějkov": 0.52, "Dolní Hořice": 0.44, "Střítež": 1.38, "Plav": 0.96, "Ostrovec": 0.69, "Rožmitál na Šumavě": 1.07, "Střelské Hoštice": 0.53, "Rodvínov": 0.7, "Záboří": 0.65, "Nová Ves u Mladé Vožice": 1.32, "Dražice": 0.38, "Mirkovice": 0.88, "Ločenice": 0.55, "Dešná": 0.7, "Tučapy": 0.46, "Dubičné": 1.07, "Střížovice": 0.61, "Bošice": 1.03, "Stožec": 0.87, "Přídolí": 0.68, "Hrejkovice": 0.76, "Kostelec nad Vltavou": 0.62, "Sedlec": 0.76, "Čejetice": 0.42, "Majdalena": 0.9, "Číměř": 0.4, "Dub": 0.92, "Chyšky": 0.32, "Lásenice": 0.56, "Hůry": 0.66, "Dívčice": 0.53, "Lenora": 0.65, "Kluky": 0.62, "Bujanov": 0.78, "Chroboly": 0.57, "Štěpánovice": 0.45, "Horní Dvořiště": 1.31, "Hamr": 0.72, "Volfířov": 0.4, "Oslov": 0.61, "Jivno": 0.44, "Adamov": 0.46, "Čížová": 0.24, "Popelín": 0.57, "Malenice": 0.43, "Deštná": 0.42, "Staré Hobzí": 0.52, "Cizkrajov": 0.63, "Dráchov": 0.87, "Žimutice": 0.43, "Radošovice": 0.4, "Bohdalovice": 0.93, "Smilovy Hory": 0.51, "Zvíkovské Podhradí": 1.39, "Doubravice": 0.63, "Šumavské Hoštice": 0.92, "Budíškovice": 0.59, "Ražice": 0.75, "Zhoř": 0.97, "Nová Ves nad Lužnicí": 0.8, "Přešťovice": 0.6, "Malovice": 0.47, "Přední Výtoň": 0.62, "Olešník": 0.49, "Štěkeň": 0.4, "Žár": 0.71, "Řepice": 0.78, "Lipí": 0.58, "Kestřany": 0.28, "Králova Lhota": 0.94, "Jankov": 0.8, "Plavsko": 0.51, "Planá": 1.16, "Řípec": 0.75, "Choustník": 0.49, "Frahelž": 1.53, "Smetanova Lhota": 0.67, "Třebohostice": 0.98, "Nebahovy": 0.48, "Svatý Jan nad Malší": 0.43, "Bezdědovice": 0.84, "Jinín": 1.5, "Soběnov": 0.65, "Rovná": 1.22, "Strážkovice": 0.33, "Vráto": 0.68, "Horní Vltavice": 0.99, "Zbytiny": 0.78, "Jetětice": 0.43, "Úsilné": 0.69, "Šebířov": 0.47, "Pohorská Ves": 1.13, "Zvíkov": 0.92, "Nová Ves u Chýnova": 1.06, "Putim": 0.4};
ZOS_DATA.obecMulOther = 0.42;
ZOS_DATA.obecMulMax = 6;
// Kalibrace jízdy a prodlevy výjezdu na reálných výjezdech (leden + červenec 2026, ~12 800 prvních posádek; tools/kalibrace/rebuild_rychlosti.md).
// driveCal: doba jízdy = (a + b·min(t,sk) + b2·max(0,t−sk)) × násobek základny × hodinový faktor, t = čas routeru; parametry [a, b, b2, σ] (σ = lognormální rozptyl); RZP zvlášť pro N2 a N3, RV pro N2/N3, N1 = N2 × c1.
ZOS_DATA.driveCal = {"rzp":{"N2":[100.335,1.031,0.9,0.164],"N3":[107.209,1.112,0.6,0.141]},"rv":[105.429,1.015,0.6,0.163],"c1":{"rzp":0.957,"rv":0.918},"baseMul":{"blatna":1.07,"dacice":1.11,"frymburk":1.06,"hplana":0.88,"jh":0.92,"kaplice":1.29,"kunzak":1.03,"lhenice":1.04,"milevsko":1.03,"mvozice":1.12,"oparany":0.7,"cbpl":1.12,"pt":1.06,"cbpr":1.02,"pi":0.96,"sobeslav":1.0,"st":0.97,"suchdol":0.93,"tsviny":1.12,"ta":1.04,"tyn":1.4,"trebon":1.08,"vacov":0.78,"veseli":1.03,"vimperk":1.13,"cbvl":0.88,"vodnany":1.15,"volary":0.92,"vbrod":1.21,"cb":1.09,"ck":1.15,"cimelice":1.07},"hour":[1.1,1.1,1.1,1.1,1.1,1.1,1.04,1.04,1.04,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],"sk":900};
// turnCal: prodleva výzva → výjezd, kvantily po 5 % (0–100 %): base = posádka na základně (denní hodnoty, v noci × night), road = posádka už v autě; pRoad = reálný podíl těch v autě.
ZOS_DATA.turnCal = {"base":{"RZP_N1":[40,45,51,55,60,64,70,72,77,82,87,91,93,99,104,112,117,127,135,166,300],"RZP_N2":[40,54,64,71,77,83,87,92,96,100,104,108,112,118,123,129,136,145,158,178,300],"RZP_N3":[40,56,67,75,81,86,91,96,101,105,110,115,120,125,130,137,144,153,165,186,300],"RLP_N1":[43,60,72,79,85,88,93,96,99,101,106,108,116,120,127,133,139,146,165,202,300],"RLP_N2":[39,67,79,89,96,101,106,111,116,120,126,131,138,144,152,160,171,186,206,234,300],"RLP_N3":[41,61,73,80,88,93,98,101,106,113,118,123,129,137,143,151,163,180,214,300,300]},"road":{"RZP":[8,12,14,15,16,17,18,20,21,22,24,25,27,29,30,32,34,37,40,42,44],"RLP":[8,12,15,16,17,19,19,20,21,22,23,25,25,27,30,32,35,37,38,41,44]},"night":{"RZP":1.13,"RLP":1.148},"pRoad":{"RZP":0.149,"RLP":0.092}};
for (const x of ZOS_DATA.indications) {
  const c = ZOS_DATA.indCal[x.id];
  if (!c) continue;
  Object.assign(x, c);
  if (c.sceneQ) x.scene = [c.sceneQ[0], c.sceneQ[2]];
}

if (typeof module !== "undefined") module.exports = ZOS_DATA;
