"""Přestavba src/symptoms.json z anonymizovaných přehledů výjezdů (xls se do repozitáře NEUKLÁDAJÍ).

Použití: python3 pipeline/symptoms_build.py work/priznaky.xls [work/vyjezdy.xls ...]
Z každého souboru se berou jen sloupce Naléhavost, Indikace ZOS a Příznaky události.
Hlavní diagnóza (zadává ji posádka na místě) se ignoruje. Zachová se pořadí katalogu,
takže existující indexy (včetně speciálních profilů __pediatric__ apod.) zůstanou platné.
Do profilů jdou jen kombinace, které se vyskytly aspoň MIN_COUNT×, a jen příznaky
vyskytující se aspoň MIN_TOKEN× (odfiltruje případné ojedinělé zápisy).
"""
import sys, json, re, collections
import pandas as pd

MIN_TOKEN, MIN_COUNT = 3, 2
SRC = 'src/symptoms.json'

def split_tokens(v):
    raw = [t.strip() for t in str(v).split(',')]
    out = []
    for t in raw:
        if not t: continue
        if out and (out[-1].count('(') > out[-1].count(')') or (re.search(r'\d$', out[-1]) and re.match(r'^\d', t))):
            out[-1] = out[-1] + (',' if re.match(r'^\d', t) else ', ') + t
        else:
            out.append(t)
    return out

def load(path):
    head = pd.read_excel(path, header=None, nrows=12)
    hdr = next(i for i in range(12) if 'Naléhavost' in [str(x).strip() for x in head.iloc[i].tolist()])
    d = pd.read_excel(path, header=hdr)
    d.columns = [str(c).strip() for c in d.columns]
    return d[['Naléhavost', 'Indikace ZOS', 'Příznaky události']].dropna()

def main(paths):
    js = json.load(open(SRC, encoding='utf8'))
    catalog = js['symptomCatalog']; idx = {s: i for i, s in enumerate(catalog)}
    rows = pd.concat([load(p) for p in paths])
    toks = collections.Counter()
    parsed = []
    for n, ind, v in rows.itertuples(index=False):
        t = split_tokens(v); parsed.append((str(n).strip(), str(ind).strip(), t)); toks.update(t)
    keep = {t for t, c in toks.items() if c >= MIN_TOKEN}
    combos = collections.defaultdict(collections.Counter)
    for n, ind, t in parsed:
        t = [x for x in t if x in keep]
        if not t or n not in ('N1', 'N2', 'N3', 'N4'): continue
        combos[(ind, n)][tuple(t)] += 1
    added = 0
    for t in keep:
        if t not in idx: idx[t] = len(catalog); catalog.append(t); added += 1
    prof = js['symptomProfiles']
    for (ind, n), cnt in combos.items():
        lst = [[[idx[x] for x in combo], c] for combo, c in cnt.most_common() if c >= MIN_COUNT]
        if not lst: lst = [[[idx[x] for x in combo], c] for combo, c in cnt.most_common(30)]
        prof.setdefault(ind, {})[n] = lst
    json.dump(js, open(SRC, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(f'řádků {len(rows)}, příznaků v katalogu {len(catalog)} (+{added}), indikací {len({k[0] for k in combos})},'
          f' profilů {sum(len(v) for x in prof.values() for v in x.values())}')

if __name__ == '__main__':
    main(sys.argv[1:])
