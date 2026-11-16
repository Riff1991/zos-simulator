"""Načte exporty „Seznam výjezdů“ (.xls, jeden řádek = výjezd jedné posádky) a uloží work/stat/all2.pkl (časy rozparsované, mesic = měsíc z podmínek).
Použití z kořene repa:  mkdir -p work/stat && python3 -I tools/kalibrace/load.py leden.xls cervenec.xls
Vyžaduje: pip install pandas xlrd. Surová data se NIKDY necommitují (work/ je v .gitignore)."""
import sys, re, os, pandas as pd
out = []
for f in sys.argv[1:]:
    raw = pd.read_excel(f, engine='xlrd', dtype=str)
    hdr = next(i for i in range(15) if 'Naléhavost' in [str(v) for v in raw.iloc[i].tolist()])
    cond = ' '.join(str(raw.iloc[i, 0]) for i in range(1, hdr))
    m = re.search(r"mezi '(\d\d)\.(\d\d)\.(\d{4})", cond)
    df = raw.iloc[hdr + 1:].copy(); df.columns = [str(c) for c in raw.iloc[hdr].tolist()]
    df['mesic'] = f'{m.group(3)}-{m.group(2)}' if m else os.path.basename(f)
    out.append(df.reset_index(drop=True))
d = pd.concat(out, ignore_index=True)
for c in ['Čas volání', 'Čas výzvy', 'Čas výjezdu', 'Čas příjezdu', 'Čas odjezdu', 'Čas příjezdu k zařízení', 'Čas předání', 'Čas odjezdu od zařízení', 'Čas návratu', 'Čas ukončení']:
    d[c] = pd.to_datetime(d[c], format='%d.%m.%Y %H:%M:%S', errors='coerce')
d['Km'] = pd.to_numeric(d['Km'], errors='coerce'); d['Věk'] = pd.to_numeric(d['Věk'], errors='coerce')
os.makedirs('work/stat', exist_ok=True); d.to_pickle('work/stat/all2.pkl')
print(len(d), 'výjezdů,', d['mesic'].value_counts().to_dict())
