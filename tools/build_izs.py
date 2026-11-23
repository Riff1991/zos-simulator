# Generuje ZOS_DATA.izs (hasičské a policejní stanice pro mapu) do src/data.js.
# Zdroj hasičů: příloha č. 8 (seznam JPO Jihočeského kraje 7/2025), polohy z adresního rejstříku (střed obce / části obce).
# Zdroj policie: adresář Policie ČR (obvodní oddělení a služebny JčK). Spuštění: python tools/build_izs.py <priloha.xlsx>
import sys, re, json, unicodedata, os, glob
import openpyxl
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
X = sys.argv[1] if len(sys.argv) > 1 else sorted(glob.glob(os.path.expanduser('~/Downloads/priloha-c.-8*')))[0]
A = json.load(open('site/addr.json', encoding='utf8'))
a, S = A['a'], A['s']
def norm(t):
    t = unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()
    t = re.sub(r'\bn\.\s*', 'nad ', t); t = re.sub(r'\bvlt\b\.?', 'vltavou', t); t = re.sub(r'\bluz\b\.?', 'luznici', t)
    return re.sub(r'[^a-z0-9 ]', ' ', t).split()
def key(t): return ' '.join(norm(t))
import statistics
cent, cast = {}, {}
for i in range(0, len(a), 8):
    la, lo = a[i] / 1e5, a[i + 1] / 1e5
    for d, k in ((cent, key(S[a[i + 3]])), (cast, key(S[a[i + 5]]))):
        if not k: continue
        d.setdefault(k, []).append((la, lo))
def med(v): return [round(statistics.median(x[0] for x in v), 5), round(statistics.median(x[1] for x in v), 5)]   # medián: střed zástavby, ne těžiště celé obce
FR = json.load(open(os.environ.get('FR_JSON', 'fr.json'), encoding='utf8')) if os.path.exists(os.environ.get('FR_JSON', 'fr.json')) else []
def known(name, typ):   # už známá poloha stanice z ZOS_DATA.fr (přesnější než střed obce)
    k = key(re.sub(r'^(HZS|JSDH|OOP|Policie ČR)\s+', '', name))
    for f in FR:
        if f['type'] in typ and key(re.sub(r'^(HZS|JPO \w+|Policie ČR|PČR)\s+', '', f['name'])) == k: return [f['lat'], f['lon']]
    return None
def where(name):
    k = key(name)
    for d in (cast, cent):
        if k in d: return med(d[k])
    k2 = re.sub(r' \d+( |$)', ' ', k).strip()
    if k2 in cent: return med(cent[k2])
    return None
def local(name):   # „České Budějovice 5 - Suché Vrbné“ → část obce
    p = re.split(r'\s+-\s+', str(name))
    for x in reversed(p):
        w = where(x)
        if w: return w
    return None
hz = []; miss = []
wb = openpyxl.load_workbook(X, read_only=True, data_only=True)
for ws in wb:
    m = re.search(r'JPO (I{1,3}|IV|V|VI)\b', ws.title.replace('�', ''))
    for r in ws.iter_rows(values_only=True):
        if not r or len(r) < 7 or not r[1] or not re.match(r'^\d{3}$', str(r[1])) or not re.match(r'^\d{3}$', str(r[2] or '')): continue
        kat = str(r[3]).strip(); nm = str(r[4] or '').strip()
        if kat.startswith('VI') or kat == 'IV' or not nm: continue   # podnikové jednotky a jednotky IV (železnice, podniky) ve hře nejedou
        w = known(nm, ('HZS',) if kat == 'I' else ('JPO2', 'JPO3', 'JPO4')) or local(nm)
        if not w: miss.append(nm); continue
        tech = [t.strip() for t in str(r[6] or '').split(',') if t.strip()]
        cls = []
        for t in tech:
            c = re.match(r'(CAS|AZ|DA|TA|AP|PPLA|PPS|RZA|ZA)\s*-?\s*(\d+)?', t)
            if c: cls.append((c.group(1) + (' ' + c.group(2) if c.group(2) and c.group(1) in ('CAS', 'AZ', 'AP') else '')).strip())
        hz.append({'id': str(r[1]) + str(r[2]), 'name': ('HZS ' if kat.startswith('I') and not kat.startswith('II') else 'JSDH ') + nm, 'kat': kat.split('/')[0], 'lat': w[0], 'lon': w[1], 'tech': cls[:6]})
POL = ['České Budějovice – město|České Budějovice', 'České Budějovice – Čtyři Dvory|Čtyři Dvory', 'České Budějovice – Suché Vrbné|Suché Vrbné', 'Boršov nad Vltavou', 'Hluboká nad Vltavou', 'Lišov', 'Trhové Sviny', 'Týn nad Vltavou', 'Ševětín',
       'Český Krumlov', 'Kaplice', 'Horní Planá', 'Větřní', 'Lipno nad Vltavou', 'Křemže', 'Vyšší Brod', 'Jindřichův Hradec', 'Třeboň', 'Dačice', 'Nová Bystřice', 'Suchdol nad Lužnicí', 'Studená', 'Slavonice', 'České Velenice', 'Chlum u Třeboně',
       'Písek', 'Milevsko', 'Zvíkovské Podhradí', 'Protivín', 'Čimelice', 'Prachatice', 'Vimperk', 'Volary', 'Netolice', 'Horní Vltavice', 'Strakonice', 'Blatná', 'Vodňany', 'Volyně', 'Radomyšl', 'Tábor', 'Sezimovo Ústí', 'Soběslav', 'Bechyně', 'Mladá Vožice', 'Veselí nad Lužnicí', 'Jistebnice', 'Chýnov']
pc = []
for p in POL:
    nm, g = (p.split('|') + [p])[:2] if '|' in p else (p, p)
    w = known(g, ('PCR',)) or where(g)
    if not w: miss.append('PČR ' + nm); continue
    pc.append({'name': 'OOP ' + nm if 'OOP' not in nm else nm, 'lat': w[0], 'lon': w[1]})
print('HZS/JSDH', len(hz), 'PČR', len(pc), 'nenalezeno', len(miss), miss[:40])
blk = '// <izs>\nZOS_DATA.izs = ' + json.dumps({'hzs': hz, 'pcr': pc}, ensure_ascii=False, separators=(',', ':')) + ';\n// </izs>\n'
s = open('src/data.js', encoding='utf8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
if '// <izs>' in s: s = re.sub(r'// <izs>.*?// </izs>\r?\n', lambda m: blk.replace('\n', nl), s, flags=re.S)
else: s = s.rstrip() + nl + blk.replace('\n', nl)
open('src/data.js', 'w', encoding='utf8', newline='').write(s)
