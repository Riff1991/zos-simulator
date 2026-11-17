# Přesné sady cihliček podle skutečných screenů (pořadí, kódy a barvy), s textem z excelu a příznaky z katalogu.
# klasifikace → barva (n1 červená, n2 modrá, n2di růžová/magenta, n3 zelená) → [(kód, regex řádku v excelu pro plné znění, [příznaky z katalogu])]
SCREEN = {
    'Křečové stavy': {
        'n2': [('KŘEČE_FEBRILNÍ', r'Febrilní', ['Křeče febrilní']), ('KŘEČE_NEZNÁMÉ', r'neznámého původu', ['Křeče bez známého původu']), ('KŘEČE_V_GRAVIDI', r'těhotenství', ['Křeče v souvislosti s graviditou']),
               ('PO_KŘ_NEPROBÍRÁ', r'neprobírá', []), ('OPAK_KŘEČ_STAV', r'Opakovaný křečový stav', ['Opakovaný křečový stav'])],
        'n2di': [('KŘEČE_EPILEPTIK', r'epileptik', ['Epileptik'])],
        'n3': [('AVPU-A', None, ['AVPU-A']), ('AVPU-V', None, ['AVPU-V']), ('PO_KŘ_PROBÍRÁ', r'Probírá', ['Po křečích']), ('PO_KŘ_EPILEPTI', r'Stav po epileptickém', ['Po epileptickém záchvatu']), ('TETANIE', r'tetanie', [])],
    },
    'Arytmie': {
        'n1': [('AS_<_30_MIN', r'TF < 30', []), ('AS_>_200_MIN', r'TF < 30', []), ('ICD_VÝBOJ_OPAK', r'Opakovaný výboj', ['Opakovaný ICD výboj (kardioverter)'])],
        'n2': [('AS_150-200_MIN', r'150', []), ('AS_30-45_MIN', r'30-45', []), ('DUŠ_POUZE_VĚTU', r'klidovou dušností', ['Dušnost']), ('ICD_VÝBOJ_JEDEN', r'Izolovaný výboj', ['ICD výboj (kardioverter)']), ('NÁHL_PALP_ZÁVAŽ', r'Náhle nově', [])],
        'n3': [('AS_NEPRAV_VNÍMA', r'nepravidelně', []), ('BEZ_ZÁVAŽ_PŘÍZN', r'bez dalších', []), ('PALPIT_NEZÁVAŽN', r'Bušení srdce', [])],
    },
    'Dušnost': {
        'n1': [('DUŠ_POUZE_SLOVO', r'nemůže vůbec mluvit', ['Dušnost kritická']), ('DUŠ_NEMŮŽ_MLUVI', r'nemůže vůbec mluvit', ['Dušnost kritická']), ('SpO2_<74%', r'74', [])],
        'n2': [('DUŠ_POUZE_VĚTU', r'pouze větu', ['Dušnost']), ('SpO2_75-81%', r'75', []), ('LARYNGITIDA', r'LARYNGITID', [])],
        'n2di': [('DUŠ_UDRŽÍ_KONVE', r'udrží konverzaci', ['Dušnost']), ('SpO2_82-93%', r'82', []), ('DUŠ_VOL_3.RUKA', r'3.ruky', ['Dušnost z volání z 3.ruky'])],
        'n3': [('DUŠ_NĚKOL_HODIN', r'několik hodin', ['Dušnost trvající několik hodin']), ('DUŠ_POCITO/JINÁ', r'Subjektivní', ['Dušnost pocitová']), ('HYPERVENTICE', r'Hyperventilace', [])],
    },
    'Trauma': {
        'n1': [('AMPUTACE_KONČET', r'amputace', []), ('AVPU-U_NEDÝCHÁ', r'AVPU-U nedýchá', ['AVPU-U', 'nedýchá']), ('DUŠ_NEMŮŽ_MLUVI', r'nemůže vůbec mluvit', ['Dušnost kritická']), ('DUŠ_POUZE_SLOVO', r'nemůže vůbec mluvit', ['Dušnost kritická']),
               ('MAS_KRVÁ_NEZAST', r'Masivní', ['Masivní krvácení nezastavitelné']), ('POPÁL_ROZS/HLUB', r'popáleniny', ['Popálení/poleptání rozsáhlé/hluboké'])],
        'n2': [('AVPU-U_DÝCHÁ', r'AVPU-U dýchá', ['AVPU-U', 'dýchá']), ('DÍTĚ_SUSP_ANALG', r'Dítě', []), ('DUŠ_POUZE_VĚTU', r'pouze větu', ['Dušnost']), ('PÁD_DÍTĚ_>3xVÝŠ', r'trojnásobek', []), ('PÁD_Z_VÝŠE_>6M', r'Pád z výšky', []),
               ('PARÉZ/BRNĚ_KONČ', r'Paréza', ['Paréza/brnění končetin']), ('PERFO_DUTIN_POR', r'Perforační', []), ('POK_KRVÁ_NEZAST', r'Pokračující', ['Pokračující krvácení většího rozsahu nezastavitelné']),
               ('PŘEJETÍ_VOZIDLE', r'Přejetí', []), ('ZAVAL_TĚŽ_PŘED', r'Zavalení', []), ('ZLOM_2_DL_KOST', r'2 a více dlouhých', ['Zlomenina 2 dlouhých kostí (femur, humerus, tibie)']), ('ZLOM_OTEVŘ_KOST', r'Otevřená zlomenina', ['Otevřená zlomenina'])],
        'n2di': [('AVPU-P', r'AVPU-P', ['AVPU-P']), ('POÚRAZ_ZMATENOS', r'zmatenost', ['Poúrazová zmatenost']), ('ZÁVA_KRV_Z_KONČ', r'Závažné krvácení', ['Závažné krvácení z končetin'])],
        'n3': [('AMPUTACE_PRSTŮ', r'prstů', []), ('AVPU-A', None, ['AVPU-A']), ('AVPU-V', None, ['AVPU-V']), ('BEZ_ZÁVAŽ_PŘÍZN', r'Bez závažné', []), ('BOLEST_HRUDNÍKU', r'Tupé trauma', ['Bolest hrudníku']),
               ('KOMOCE_MOZKU', r'Komoční', ['Komoční syndrom']), ('KRČEK_STEH_KOST', r'zlomenina', []), ('LUXACE_KLOUBU', r'vykloubení', []), ('NEZÁV_KRV_Z_KON', r'Ošetřitelné', ['Nezávažné krvácení z končetin']),
               ('OTEVŘENÉ_RÁNY', r'Otevřené rány', ['Otevřené rány']), ('PÁD_Z_VÝŠE_<6M', r'Pád', []), ('PSYCHICKÝ_OTŘES', r'psychický otřes', ['Psychický otřes']), ('ZLOM_ZAVŘENÁ', r'Zavřená', ['Zavřená zlomenina'])],
    },
    'Dopravní nehoda': {
        'n1': [('AMPUTACE_KONČET', r'amputace', []), ('AVPU-U_NEDÝCHÁ', r'AVPU-U nedýchá', ['AVPU-U', 'nedýchá']), ('DUŠ_NEMŮŽ_MLUVI', r'nemůže vůbec mluvit', ['Dušnost kritická']), ('DUŠ_POUZE_SLOVO', r'nemůže vůbec mluvit', ['Dušnost kritická']),
               ('MAS_KRVÁ_NEZAST', r'Masivní', ['Masivní krvácení nezastavitelné']), ('POPÁL_ROZS/HLUB', r'popáleniny', ['Popálení/poleptání rozsáhlé/hluboké'])],
        'n2': [('AVPU-U_DÝCHÁ', r'AVPU-U dýchá', ['AVPU-U', 'dýchá']), ('ČEL_NÁR_VYS_RYC', r'Čelní náraz', []), ('DÍTĚ_SUSP_ANALG', r'Dítě', []), ('DUŠ_POUZE_VĚTU', r'pouze větu', ['Dušnost']), ('KATAPULT_Z_VOZI', r'Katapultáž', []),
               ('PARÉZ/BRNĚ_KONČ', r'Paréza', ['Paréza/brnění končetin']), ('PERFO_DUTIN_POR', r'Perforační', []), ('POK_KRVÁ_NEZAST', r'Pokračující', ['Pokračující krvácení většího rozsahu nezastavitelné']),
               ('PŘEJETÍ_VOZIDLE', r'Přejetí', []), ('SRAŽENÍ_VOZIDLE', r'Sražení', []), ('ZAKLÍNĚNÍ_VE_VO', r'Zaklínění', []), ('ZAVAL_TĚŽ_PŘED', r'Zavalení', []),
               ('ZLOM_2_DL_KOST', r'2 a více dlouhých', ['Zlomenina 2 dlouhých kostí (femur, humerus, tibie)']), ('ZLOM_OTEVŘ_KOST', r'Otevřená zlomenina', ['Otevřená zlomenina'])],
        'n2di': [('AVPU-P', r'AVPU-P', ['AVPU-P']), ('POÚRAZ_ZMATENOS', r'zmatenost', ['Poúrazová zmatenost']), ('ROTACE_PŘES_STŘ', r'Rotace', []), ('ZÁVA_KRV_Z_KONČ', r'Závažné krvácení', ['Závažné krvácení z končetin'])],
        'n3': [('AMPUTACE_PRSTŮ', r'prstů', []), ('AVPU-A', None, ['AVPU-A']), ('AVPU-V', None, ['AVPU-V']), ('BEZ_ZÁVAŽ_PŘÍZN', r'Bez závažné|bez viditelného', []), ('BOLEST_HRUDNÍKU', r'Tupé trauma', ['Bolest hrudníku']),
               ('KOMOCE_MOZKU', r'Komoční', ['Komoční syndrom']), ('NEZÁV_KRV_Z_KON', r'Ošetřitelné', ['Nezávažné krvácení z končetin']), ('OTEVŘENÉ_RÁNY', r'Otevřené rány', ['Otevřené rány']),
               ('PSYCHICKÝ_OTŘES', r'psychický otřes', ['Psychický otřes']), ('ZLOM_ZAVŘENÁ', r'Zavřená', ['Zavřená zlomenina'])],
    },
}
# šedé cihly podle screenů; True = seznam je ve screenu úplný (nepřidávat odvozené z textu), False = seznam ve screenu pokračuje
GRAY_SCREEN = {
    'Křečové stavy': (['DIABETIK', 'EPILEPTIK'], True),
    'Arytmie': (['HYPERTONIK', 'KARDIAK'], True),
    'Dušnost': (['ASPIRACE', 'ASTMATIK', 'DIABETIK', 'HYPERTONIK', 'CHOPN', 'KARDIAK', 'DDOT'], True),
    'Trauma': (['ALKOHOL', 'BÉREC', 'BODNÉ_PORANĚNÍ', 'BŘICHO', 'CIZÍ_TĚLESO', 'CYKLISTA', 'DK', 'ELEKTR_PROUD', 'HK', 'HLAVA'], False),
    'Dopravní nehoda': (['ALKOHOL', 'BÉREC', 'BŘICHO', 'BUS', 'CYKLISTA', 'DK', 'HK', 'HLAVA', 'HRUDNÍK', 'CHODEC'], False),
}
