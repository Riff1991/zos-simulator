#!/usr/bin/env python3
"""Převod skutečného klasifikačního systému ZOS (xlsx s „cihličkami“) do src/cihly.json.

Použití:  python tools/build_cihly.py "cesta/A_1 Klasifikační systém.xlsx" [src/cihly.json]

List = skupina (STAV, DĚJ, OSTATNÍ). Žlutá buňka ve sloupci A = dlaždice indikace (např. DUŠNOST).
Cihla = sloučená buňka ve sloupci D (naléhavost): řádky textu ze sloupce B, klasifikace (C), naléhavost (D), posádka (E).
Barva cihly se čte z výplně buňky D: červená N1, modrá N2 (RLP), růžová N2 (DI = dynamická indikace), zelená N3, fialová/šedá N4.
Soubor obsahuje jen text klasifikace (žádná osobní data). Bez závislostí mimo standardní knihovnu.
"""
import json, re, sys, unicodedata, zipfile, xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
Q = lambda t: '{%s}%s' % (NS['m'], t)


def col_row(ref):
    m = re.match(r'([A-Z]+)(\d+)$', ref)
    return m.group(1), int(m.group(2))


def load(path):
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter(Q('t'))) for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    st = ET.fromstring(z.read('xl/styles.xml'))
    fills = []
    for f in st.find('m:fills', NS):
        pf = f.find('m:patternFill', NS)
        fg = pf.find('m:fgColor', NS) if pf is not None else None
        fills.append('' if fg is None else (fg.get('rgb') or 'theme%s/%s' % (fg.get('theme'), (fg.get('tint') or '')[:5])))
    xfs = [int(x.get('fillId', 0)) for x in st.find('m:cellXfs', NS)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    names = [s.get('name') for s in wb.find('m:sheets', NS)]
    sheets = []
    for i, nm in enumerate(names, 1):
        root = ET.fromstring(z.read('xl/worksheets/sheet%d.xml' % i))
        cells, merges = {}, []
        for c in root.iter(Q('c')):
            v = c.find('m:v', NS)
            col, row = col_row(c.get('r'))
            fill = fills[xfs[int(c.get('s', 0))]]
            val = None
            if v is not None:
                val = ss[int(v.text)] if c.get('t') == 's' else v.text
            cells[(col, row)] = (val, fill)
        for mc in root.iter(Q('mergeCell')):
            a, b = mc.get('ref').split(':')
            (c1, r1), (c2, r2) = col_row(a), col_row(b)
            merges.append((c1, r1, c2, r2))
        sheets.append((nm, cells, merges))
    return sheets


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def clean(s):
    return re.sub(r'\s+', ' ', (s or '').replace('\xa0', ' ')).strip()


def join_lines(lines):
    """Zalomené fragmenty (malé písmeno nebo „(“ na začátku) se spojí, samostatná kritéria zůstanou zvlášť."""
    out = []
    for ln in lines:
        ln = clean(ln)
        if not ln:
            continue
        cont = out and (ln[0].islower() or (ln[0] == '(' and not ln.upper().startswith('(NEBO')))
        if cont:
            out[-1] += ' ' + ln
        else:
            out.append(ln)
    return out


def pretty(s):
    """VELKÁ PÍSMENA z tabulky → čitelný název (zkratky zůstávají)."""
    s = clean(s)
    fixed = {'ZVR/PRŮ': 'Zvracení / průjem', 'ZVRACENÍ/ PRŮJEM': 'Zvracení / průjem', 'BB': 'Babybox', 'BABYBOX': 'Babybox', 'VNN': 'Vysoce nebezpečná nákaza (VNN)',
             'JINÉ': 'Jiné', 'VSTŘ. JÍZDA': 'Vstřícná jízda', 'MU - MATRA 722': 'MU – MATRA 722', 'NZO - spatřená': 'NZO – spatřená', 'SEKUNDÁRNÍ PŘEVOZ': 'Sekundární převoz'}
    if s in fixed:
        return fixed[s]
    keep = {'CMP', 'CZS', 'NZO', 'MU', 'MATRA', 'ZOS', 'VNN', 'PČR'}
    if s.upper() == s:
        w = [x if x in keep else x.lower() for x in re.split(r'(\s+|,)', s)]
        r = ''.join(w)
        return r[:1].upper() + r[1:]
    return s


def fill_kind(fill, n, crew):
    if fill == 'FFFF0000':
        return 'n1'
    if fill == 'FFF73BB8' or crew == 'DI':
        return 'n2di'
    if fill == 'FF0070C0':
        return 'n2'
    if fill == 'FF00B050':
        return 'n3'
    return 'n4'



STOP = set('a i nebo je se s v z na do po bez ze že pro při který která které jako u o k ve od ale být byl byla tj'.split())
WORDS = {'objektivizovaná': 'OBJ', 'objektivizovaný': 'OBJ', 'objektiviz.': 'OBJ', 'dušnost': 'DUŠ', 'dušnosti': 'DUŠ', 'zjištění': '', 'pacient': 'PAC', 'pacienta': 'PAC',
         'krvácení': 'KRV', 'nezastavitelné': 'NEZAST', 'masivní': 'MAS', 'závažné': 'ZÁVAŽ', 'závažný': 'ZÁVAŽ', 'rozsáhlé': 'ROZS', 'popáleniny': 'POPÁL', 'zlomenina': 'ZLOM',
         'otevřená': 'OTEVŘ', 'otevřené': 'OTEVŘ', 'poranění': 'PORAN', 'perforační': 'PERFO', 'končetin': 'KONČ', 'končetiny': 'KONČ', 'vozidlem': 'VOZ', 'vozidla': 'VOZ',
         'porucha': 'PORUCHA', 'poruchy': 'PORUCHY', 'vědomí': 'VĚDOMÍ', 'bolest': 'BOLEST', 'bolesti': 'BOLEST', 'schopen': 'SCHOPEN', 'říci': '', 'pouze': 'POUZE', 'nemůže': 'NEMŮŽE',
         'vůbec': '', 'mluvit': 'MLUVIT', 'trvající': 'TRVAJÍCÍ', 'hodin': 'HOD', 'hodiny': 'HOD', 'několik': 'NĚKOL', 'minut': 'MIN', 'minuty': 'MIN', 'nezávažného': 'NEZÁVAŽ',
         'bez': 'BEZ', 'známek': 'ZNÁMEK'}


def abbr(t):
    """Krátký kód cihly ve stylu obrazovky (VELKÁ_PÍSMENA_S_PODTRŽÍTKY). Skutečné názvy lze později přepsat ručně."""
    t = re.sub(r'^\(?\s*NEBO\s*:?\s*\)?\s*', '', t, flags=re.I)
    t = re.sub(r'^zji[sš]t\w+\s+', '', t, flags=re.I)  # „Zjištěná SpO2 …“ → „SpO2 …“
    m = re.match(r'SpO2\s*(pod|nad)?\s*(\d+)(?:\s*-\s*(\d+))?\s*%', t, flags=re.I)
    if m:
        return 'SpO2_' + ('<' if (m.group(1) or '').lower() == 'pod' else '>' if (m.group(1) or '').lower() == 'nad' else '') + m.group(2) + ('-' + m.group(3) if m.group(3) else '') + '%'
    out = []
    for w in re.findall(r'\S+', t):
        w = w.strip('.,;:()')
        lw = w.lower()
        if not lw or lw in STOP or lw in ('-', '=', '–', '/'):
            continue
        w2 = WORDS.get(lw, w.upper())
        if not w2:
            continue
        if out and len('_'.join(out + [w2])) > 21:
            break
        out.append(w2)
        if len('_'.join(out)) >= 15:
            break
    return ('_'.join(out) or 'KRITÉRIUM')[:24]


# vzory textu kritéria → příznak ze skutečného katalogu (src/symptoms.json); cihlička bez shody se zapíše jen jako #štítek do poznámky
SYMPAT = [
    (r'AVPU-A', 'AVPU-A'), (r'AVPU-V', 'AVPU-V'), (r'AVPU-P', 'AVPU-P'), (r'AVPU-U', 'AVPU-U'),
    (r'při vědomí', 'při vědomí'), (r'reaguje na bolest', 'reaguje na bolest'), (r'poúrazov\w* zmatenost', 'Poúrazová zmatenost'),
    (r'komoční syndrom', 'Komoční syndrom'), (r'psychick\w* otřes', 'Psychický otřes'),
    (r'otevřen\w* zlomenin', 'Otevřená zlomenina'), (r'zavřen\w* zlomenin', 'Zavřená zlomenina'), (r'zlomenina 2 a více dlouhých', 'Zlomenina 2 dlouhých kostí (femur, humerus, tibie)'),
    (r'otevřen\w* rán', 'Otevřené rány'),
    (r'závažn\w* krvácení z končetin', 'Závažné krvácení z končetin'), (r'nezávažn\w* krvácení z končetin|ošetřiteln\w* poranění', 'Nezávažné krvácení z končetin'),
    (r'masivn\w* nezastavitelné krvácení', 'Masivní krvácení nezastavitelné'), (r'pokračující nezastavitelné krvácení', 'Pokračující krvácení většího rozsahu nezastavitelné'),
    (r'paréz|brnění končetin', 'Paréza/brnění končetin'),
    (r'dušnost', 'Dušnost'), (r'bolest hrudníku', 'Bolest hrudníku'),
    (r'epileptik', 'Epileptik'), (r'diabetik', 'Diabetik'), (r'alkohol', 'Alkohol'),
    (r'křeče febrilní|febrilní křeče', 'Křeče febrilní'), (r'křeče v těhotenství|křeče v gravid', 'Křeče v souvislosti s graviditou'),
    (r'\bnedýchá\b', 'nedýchá'), (r'\bdýchá\b', 'dýchá'), (r'gasping', 'Gasping'),
    (r'prekolaps|předkolaps', 'Prekolaps'), (r'po kolapsu|stav po kolapsu', 'Po kolapsu'), (r'opakovan\w* kolabuje', 'Opakovaný kolaps'),
    (r'výboj', 'ICD výboj (kardioverter)'),
]


def load_catalog():
    import os
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'symptoms.json')
    cat = json.load(open(p, encoding='utf-8'))['symptomCatalog']
    names = {}
    for x in cat:
        n = re.sub(r'^[^A-Za-zÀ-ž0-9]+', '', x).strip()
        names.setdefault(n.lower(), n)
    return names


CATALOG = load_catalog()


def symptoms_of(text):
    """Příznaky z katalogu, které text kritéria obsahuje (v pořadí výskytu, bez duplicit)."""
    found = []
    for rx, name in SYMPAT:
        m = re.search(rx, text, flags=0 if rx.startswith('AVPU') else re.I)
        real = CATALOG.get(name.lower())
        if m and real and real not in [f[1] for f in found]:
            found.append((m.start(), real))
    return [n for _, n in sorted(found)]


# Cihlička na obrazovce = jeden příznak z katalogu; znak před názvem v katalogu říká, ke které klasifikaci patří
# (§ křeče, - arytmie, _ hrudník a dušnost, ° krvácení, ! CMP, $ porucha vědomí, : psychika …). Barva = blok excelu, jehož text příznak popisuje; bez shody = šedá.
GROUPS = {
    'Arytmie': '-', 'Bolest': '*', 'Bolesti na hrudi': '_', 'CMP': '!', 'CZS': '[', 'Gynekologické stavy': '\\', 'Horečka': '(', 'Hypertenze': '/', 'Intoxikace': '^',
    'Neúrazové krvácení': '°', 'Oběšení': '>', 'Popálení, poleptání': ']', 'Porucha vědomí': '$', 'Psychiatrické stavy': ':', 'Tonutí': '¨', 'Zvracení / průjem': ')',
    'NZO – spatřená': '@', 'Neurologické stavy': '+!',
}
NAMEFILTER = {'Diabetické stavy': r'glyk|diabet', 'Alergické reakce': r'alerg|anafyl|otok|kopřiv|výsyp'}
ABBR = [('dušnost', 'DUŠ'), ('krvácení', 'KRVÁC'), ('nezastavitelné', 'NEZAST'), ('opakovaný', 'OPAK'), ('opakovaná', 'OPAK'), ('závažné', 'ZÁVAŽ'), ('závažný', 'ZÁVAŽ'), ('příznaky', 'PŘÍZN'), ('bez', 'BEZ'),
        ('ověřená', 'OVĚŘ'), ('ověřená', 'OVĚŘ'), ('trvající', 'TRVAJ'), ('několik', 'NĚKOL'), ('hodin', 'HOD'), ('končetiny', 'KONČ'), ('končetin', 'KONČ'), ('v souvislosti s', 'S'), ('onemocnění', 'ONEMOC')]


SYN = [('akce srdeční', 'TF'), ('tepů/min', 'min'), ('příznaků', 'projevů'), ('příznaky', 'projevy'), ('graviditou', 'těhotenství'), ('graviditě', 'těhotenství'), ('onemocnění', 'nemoc'),
       ('větší', 'většího'), ('kolabující', 'kolaps'), ('alterující', 'alterace')]


def _syn(text):
    t = text
    for a, b in SYN:
        t = re.sub(a, a + ' ' + b, t, flags=re.I)
    return t


def _stems(text):
    import unicodedata
    t = unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode()
    return {w[:5] for w in re.findall(r'[a-z0-9]{3,}', t)}


def _code(name):
    n = name
    for a, b in ABBR:
        n = re.sub(r'\b' + a + r'\b', b, n, flags=re.I)
    c = re.sub(r'[^\wÀ-ž<>%/.-]+', '_', n.strip()).strip('_').upper()
    return c if len(c) <= 22 else c[:22].rstrip('_')


def catalog_chips(bricks):
    """Cihličky klasifikací bez screenu z příznaků katalogu (skupina podle znaku), barva podle shody s textem bloků excelu."""
    import os
    raw = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'symptoms.json'), encoding='utf-8'))['symptomCatalog']
    out = {}
    for klasif in sorted({b['klasif'] for b in bricks}):
        if klasif in GROUPS:
            names = []
            for x in raw:
                if x[:1] in GROUPS[klasif]:
                    n = re.sub(r'^[^A-Za-zÀ-ž0-9]+', '', x).strip()
                    if n not in names:
                        names.append(n)
        elif klasif in NAMEFILTER:
            names = []
            for x in raw:
                n = re.sub(r'^[^A-Za-zÀ-ž0-9]+', '', x).strip()
                if re.search(NAMEFILTER[klasif], n, re.I) and n not in names:
                    names.append(n)
        else:
            continue
        bs = [b for b in bricks if b['klasif'] == klasif]
        texts = [(b, ' '.join(b['lines'])) for b in bs]
        chips = {b['id']: [] for b in bs}
        gray = []
        for n in names:
            if re.match(r'AVPU-', n) and not any(n in t for _, t in texts) and not (n in ('AVPU-A', 'AVPU-V') and sum(1 for z in names if z.startswith('AVPU-')) == 2):
                continue   # AVPU jen když ho kritéria zmiňují, nebo skupina nabízí právě A a V (jako u křečí)
            st = _stems(_syn(n)) - {'bez', 'jina', 'jine'}
            best, bscore, bline = None, 0.0, ''
            for b, t in texts:
                ts = _stems(t)
                if st and len(st & _stems(_syn(t))) / len(st) > bscore:
                    bscore, best = len(st & _stems(_syn(t))) / len(st), b
            if best is not None and bscore >= 0.5:
                line = max(best['lines'], key=lambda l: len(st & _stems(_syn(l))))
                chips[best['id']].append({'c': _code(n), 't': line, 's': [n]})
            else:
                gray.append(_code(n))
        out[klasif] = (chips, gray)
    return out


GRAY_FORCE = r'hypertonik|kardiak|diabetik|astmatik|epileptik|chopn|alkohol|aspirace|oxygenoterapie|volání z (3\.|třetí) ?ruky|^pčr$|^hzs$|osobní auto|nákladní|autobus|motocykl|cyklist|chodec'


def profile_chips(bricks):
    """Cihličky z výjezdů (leden a červenec 2026, src/symptoms.json): slovník = příznaky, které se u klasifikace skutečně zaklikávají (podíl v kombinacích),
    barva = blok excelu klasifikace, jehož text příznak popisuje; bez shody podle toho, při jaké naléhavosti se v datech příznak nejčastěji vyskytuje; jinak šedá."""
    import os, unicodedata
    S = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'symptoms.json'), encoding='utf-8'))
    cat, prof = S['symptomCatalog'], S['symptomProfiles']
    nrm = lambda x: re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', x.lower()).encode('ascii', 'ignore').decode()).strip()
    keys = {nrm(k): k for k in prof}
    strip_ = lambda x: re.sub(r'^[^A-Za-zÀ-ž0-9]+', '', x).strip()
    skip = {'dospělý', 'dítě', 'dynamická indikace', 'gasping', 'tanr', 'tanr nelze', 'nedýchá', 'dýchá', 'při vědomí', 'reaguje na bolest', 'reaguje na oslovení', 'bezvědomí'}
    out = {}
    for klasif in sorted({b['klasif'] for b in bricks}):
        pk = keys.get(nrm(klasif)) or keys.get(nrm(klasif.replace('–', '-')))
        if not pk:
            continue
        W = 0.0
        tot, byN, dyn = {}, {}, {}
        for nn in ('N1', 'N2', 'N3'):
            for ids, cnt in prof[pk].get(nn, []):
                names = [strip_(cat[i]) for i in ids]
                isdyn = any(n.lower() == 'dynamická indikace' for n in names)
                W += cnt
                for n in set(names):
                    if n.lower() in skip or cat[ids[names.index(n)]][:1] == '#':
                        continue
                    tot[n] = tot.get(n, 0) + cnt
                    byN.setdefault(n, {'N1': 0, 'N2': 0, 'N3': 0})[nn] += cnt
                    if isdyn and nn == 'N2':
                        dyn[n] = dyn.get(n, 0) + cnt
        bs = [b for b in bricks if b['klasif'] == klasif]
        texts = [(b, ' '.join(b['lines'])) for b in bs]
        names = [n for n, c in sorted(tot.items(), key=lambda x: -x[1]) if c / W >= 0.012][:30] if W else []
        grp = [strip_(x) for x in cat if GROUPS.get(klasif) and x[:1] in GROUPS[klasif] and strip_(x).lower() not in skip]   # celá skupina klasifikace v katalogu (i vzácné příznaky)
        names = list(dict.fromkeys(names + grp))[:40]
        chips = {b['id']: [] for b in bs}
        gray = []
        for n in names:
            if re.match(r'AVPU-', n) and not any(n in t for _, t in texts):
                continue
            st = _stems(_syn(n)) - {'bez', 'jina', 'jine'}
            best, bscore = None, 0.0
            for b, t in texts:
                sc = len(st & _stems(_syn(t))) / len(st) if st else 0
                if sc > bscore:
                    bscore, best = sc, b
            kind = None
            if re.search(GRAY_FORCE, n, re.I) and not (best is not None and bscore >= 0.8):
                tgt = None
            elif best is not None and bscore >= 0.5:
                tgt = best
            elif tot.get(n, 0) / (W or 1) < 0.03:
                tgt = None
            else:
                d = byN.get(n) or {'N1': 0, 'N2': 0, 'N3': 0}; t3 = sum(d.values()) or 1
                dom = max(d, key=d.get)
                if sum(d.values()) and d[dom] / t3 >= 0.75:
                    want = {'N1': 'n1', 'N2': 'n2di' if dyn.get(n, 0) / (d['N2'] or 1) > 0.5 else 'n2', 'N3': 'n3'}[dom]
                    tgt = next((b for b in bs if b['kind'] == want), None)
                else:
                    tgt = None
            if tgt is None:
                gray.append(_code(n))
                continue
            line = max(tgt['lines'], key=lambda l: len(st & _stems(_syn(l))))
            chips[tgt['id']].append({'c': _code(n), 't': line, 's': [n]})
        # kódy jsou v rámci klasifikace jedinečné
        seen = {}
        def uniq(c):
            seen[c] = seen.get(c, 0) + 1
            return c if seen[c] == 1 else c[:20] + '_' + str(seen[c])
        for lst in chips.values():
            for ch in lst:
                ch['c'] = uniq(ch['c'])
        gray = [uniq(g) for g in gray]
        out[klasif] = (chips, gray)
    return out


def apply_screens(bricks):
    """Klasifikace, které máme ze screenů skutečné obrazovky, dostanou přesně jejich sadu cihliček (kódy, barvy, pořadí); text je z excelu."""
    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from screens_cihly import SCREEN
    for klasif, kinds in SCREEN.items():
        bs = [b for b in bricks if b['klasif'] == klasif]
        if not bs:
            print('chybí klasifikace', klasif)
            continue
        for b in bs:
            b['chips'] = []
        for kind, items in kinds.items():
            tgt = next((b for b in bs if b['kind'] == kind), None)
            if tgt is None:
                print('chybí cihla', klasif, kind)
                continue
            for code, rx, syms in items:
                line = next((l for l in tgt['lines'] if rx and re.search(rx, l, re.I)), None) or ' '.join(tgt['lines'])
                tgt['chips'].append({'c': code, 't': line, 's': [CATALOG[x.lower()] for x in syms if x.lower() in CATALOG]})


def add_chips(bricks):
    """Každé kritérium (řádek) cihly je jedna cihlička; kódy jsou v rámci klasifikace jedinečné."""
    seen = {}
    for b in bricks:
        chips = []
        for l in b['lines']:
            if l.rstrip().endswith(':') or l == 'Bez doplňujícího popisu v tabulce':
                continue
            parts = [x.strip(' ,.') for x in re.split(r'\s*;\s*|\s*,?\s*\bnebo\b\s*:?\s*', l, flags=re.I)]
            for part in [x for x in parts if len(x) > 3] or [l]:
                code = abbr(part)
                k = (b['klasif'], code)
                seen[k] = seen.get(k, 0) + 1
                if seen[k] > 1:
                    code = code[:21] + '_' + str(seen[k])
                avpu = re.findall(r'AVPU-[AVPU]', part)
                if len(avpu) > 1:   # „AVPU-V, AVPU-A“ jsou dvě cihličky, ne jedna
                    for tok in avpu:
                        chips.append({'c': tok, 't': part[:1].upper() + part[1:], 's': [CATALOG.get(tok.lower(), tok)]})
                    continue
                chips.append({'c': code, 't': part[:1].upper() + part[1:], 's': symptoms_of(part)})
        if not chips:
            code = (b['klasif'].upper().replace(' ', '_') + '_N' + str(b['n']) + '_' + (b['crew'] or '').replace(', ', '_').replace('/', '_'))[:24]
            chips.append({'c': code, 't': ' '.join(b['lines']), 's': []})
        b['chips'] = chips


def build(path):
    sheets = load(path)
    GR = {'dej': 'Děj, mechanismus', 'stav': 'Stav pacienta', 'ostatni': 'Ostatní (převoz, jízdy, asistence)'}
    sheet_key = {'STAV': 'stav', 'DĚJ': 'dej', 'OSTATNÍ': 'ostatni'}
    tiles, bricks, order = [], [], []
    for nm, cells, merges in sheets:
        key = sheet_key.get(nm, sheet_key.get(nm.upper()))
        if key is None:
            # názvy mohou být v jiném kódování – pořadí listů STAV, DĚJ, OSTATNÍ
            key = ['stav', 'dej', 'ostatni'][[s[0] for s in sheets].index(nm)]
        mrange = {}
        for (c1, r1, c2, r2) in merges:
            for r in range(r1, r2 + 1):
                for c in range(ord(c1), ord(c2) + 1):
                    mrange[(chr(c), r)] = (c1, r1, c2, r2)

        def val(col, row):
            tl = mrange.get((col, row))
            if tl:
                return cells.get((tl[0], tl[1]), (None, ''))[0]
            return cells.get((col, row), (None, ''))[0]

        maxr = max(r for (_, r) in cells)
        # hlavičky a dlaždice
        gray = None
        tile_rows = []   # (první řádek, název, šedá hlavička)
        for r in range(1, maxr + 1):
            v, f = cells.get(('A', r), (None, ''))
            if v and f.startswith('theme0/-0.24') and r > 4:
                gray = clean(v)
            elif v and f == 'FFFFFF00' and r > 4 and clean(v) not in ('Popis',):
                tile_rows.append((r, clean(v), gray))
        # sloučené žluté A buňky bez textu (např. ASISTENCE) použijí šedou hlavičku
        for (c1, r1, c2, r2) in merges:
            if c1 == 'A' and c2 == 'A' and r2 > r1 and not cells.get(('A', r1), (None, ''))[0] and r1 > 4 and any(('D', r) in cells and cells[('D', r)][0] for r in range(r1, r2 + 1)):
                g = None
                for r in range(r1, 0, -1):
                    v, f = cells.get(('A', r), (None, ''))
                    if v and f.startswith('theme0/-0.24'):
                        g = clean(v)
                        break
                tile_rows.append((r1, g or '', g))
        tile_rows.sort()
        # počet dlaždic pod jednou šedou hlavičkou
        by_gray = {}
        for _, t, g in tile_rows:
            by_gray.setdefault(g, []).append(t)

        def tile_for(row):
            cur = None
            for r, t, g in tile_rows:
                if r <= row:
                    cur = (t, g)
            return cur

        for r, t, g in tile_rows:
            label = pretty(t)
            tid = key + ':' + slug(label)
            skup = pretty(g) if g and len(by_gray.get(g, [])) > 1 else GR[key]
            if not any(x['id'] == tid for x in tiles):
                tiles.append({'id': tid, 'label': label, 'sheet': key, 'skupina': skup, 'poznamky': []})
        tid_of = lambda t: key + ':' + slug(pretty(t))
        # cihly = hodnoty ve sloupci D (řádky 1–4 jsou hlavička)
        for r in range(5, maxr + 1):
            if ('D', r) not in cells or not cells[('D', r)][0]:
                continue
            tl = mrange.get(('D', r))
            if tl and tl[1] != r:
                continue
            r2 = tl[3] if tl else r
            raw = clean(cells[('D', r)][0])
            m = re.match(r'N\s*([1-4])\s*(.*)$', raw)
            if not m:
                continue
            n, extra = int(m.group(1)), m.group(2)
            crew = clean(val('E', r)) or ''
            kl = clean(val('C', r)) or ''
            lines = []
            for rr in range(r, r2 + 1):
                if mrange.get(('B', rr)) and mrange[('B', rr)][2] == 'E':
                    continue
                v = cells.get(('B', rr), (None, ''))[0]
                if v:
                    lines.append(v)
            tt = tile_for(r)
            if not tt:
                continue
            kind = fill_kind(cells[('D', r)][1], n, crew)
            bricks.append({'id': 'c%03d' % (len(bricks) + 1), 'tile': tid_of(tt[0]), 'klasif': pretty(kl) if kl else pretty(tt[0]), 'n': n, 'cmp': 'CMP' in extra.upper(),
                           'dyn': crew == 'DI', 'crew': crew, 'kind': kind, 'lines': join_lines(lines) or ['Bez doplňujícího popisu v tabulce']})
        # poznámky přes celý řádek (B:E sloučené, bez D)
        for (c1, r1, c2, r2) in merges:
            if c1 == 'B' and c2 == 'E' and r1 == r2 and r1 > 4:
                v = clean(cells.get(('B', r1), (None, ''))[0])
                tt = tile_for(r1)
                if v and tt and not (('D', r1) in cells and cells[('D', r1)][0]):
                    for t in tiles:
                        if t['id'] == tid_of(tt[0]) and v not in t['poznamky']:
                            t['poznamky'].append(v)
        # list OSTATNÍ: indikace lékařského doprovodu u sekundárního převozu
        if key == 'ostatni':
            items, notes = [], []
            for r in range(20, 40):
                a = clean(cells.get(('A', r), (None, ''))[0])
                b = clean(cells.get(('B', r), (None, ''))[0])
                if a == 'RLP' and b:
                    items.append(b)
                elif b and r > 32:
                    notes.append(b)
            if items:
                for t in tiles:
                    if t['id'].startswith('ostatni:') and 'prevoz' in t['id']:
                        t['doprovod'] = {'titul': 'Indikace lékařského doprovodu – posádka RLP či RV+RZP', 'polozky': items, 'poznamky': join_lines(notes)}
    add_chips(bricks)
    gen = profile_chips(bricks)
    gen = {k: v for k, v in gen.items() if any(v[0].values())}   # klasifikace bez použitelných příznaků (Převoz, Technická jízda) zůstanou s cihličkami z textu excelu
    for b in bricks:
        g = gen.get(b['klasif'])
        if g is not None:
            b['chips'] = g[0].get(b['id'], [])
    apply_screens(bricks)
    for t in tiles:
        t['bricks'] = [b['id'] for b in bricks if b['tile'] == t['id']]
        if not t['poznamky']:
            del t['poznamky']
    tiles = [t for t in tiles if t['bricks']]
    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from screens_cihly import GRAY_SCREEN
    gray = {k: {'list': v[0], 'full': v[1]} for k, v in GRAY_SCREEN.items()}
    for k, (_, gl) in gen.items():
        if k not in gray:
            gray[k] = {'list': gl, 'full': True}
    return {'format': 'zos-cihly/1', 'gray': gray, 'skupiny': [{'id': k, 'label': v} for k, v in GR.items()][::-1] if False else [{'id': 'stav', 'label': GR['stav']}, {'id': 'dej', 'label': GR['dej']}, {'id': 'ostatni', 'label': GR['ostatni']}], 'tiles': tiles, 'bricks': bricks}


if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'src/cihly.json'
    d = build(src)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print('dlaždic:', len(d['tiles']), 'cihel:', len(d['bricks']), '->', out)
