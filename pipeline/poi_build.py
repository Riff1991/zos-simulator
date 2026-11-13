"""Reálná místa z OSM pro výzvy: domovy pro seniory, školy/školky, ordinace, provozovny → site/poi.json.
Použití: python3 pipeline/poi_build.py work/jihocesky.osm.pbf   (potřebuje site/addr.json pro doplnění adres)
"""
import sys, json, math, osmium
from collections import defaultdict

def kind(t):
    a, sf, h = t.get('amenity'), t.get('social_facility'), t.get('healthcare')
    if (a == 'social_facility' and sf in ('nursing_home', 'assisted_living', 'group_home')) or a == 'nursing_home' or sf == 'nursing_home': return 'domov'
    if a in ('school', 'kindergarten'): return 'skola'
    if a in ('doctors', 'clinic') or h in ('doctor', 'clinic', 'centre'): return 'ordinace'
    if t.get('shop') in ('supermarket', 'mall', 'doityourself') or t.get('landuse') == 'industrial' or t.get('building') in ('industrial', 'warehouse'): return 'prov'
    return None

class H(osmium.SimpleHandler):
    def __init__(s): super().__init__(); s.out = defaultdict(list)
    def put(s, t, lat, lon):
        k = kind(t)
        if not k or (k == 'prov' and not t.get('name')): return
        s.out[k].append([lat, lon, t.get('name') or '', t.get('addr:street') or t.get('addr:place') or '', t.get('addr:housenumber') or t.get('addr:conscriptionnumber') or '', t.get('addr:city') or ''])
    def node(s, n): s.put(n.tags, n.location.lat, n.location.lon)
    def area(s, a):
        if not kind(a.tags): return
        try:
            r = next(iter(a.outer_rings())); pts = [(n.lat, n.lon) for n in r]
            s.put(a.tags, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        except Exception: pass

h = H(); h.apply_file(sys.argv[1], locations=True)
A = json.load(open('site/addr.json', encoding='utf8')); S, a = A['s'], A['a']
grid = defaultdict(list)
for i in range(0, len(a), 8): grid[(a[i] // 500, a[i + 1] // 500)].append(i)
def nearest(lat, lon):
    la, lo = round(lat * 1e5), round(lon * 1e5); best, bd = None, 1e18
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for i in grid.get((la // 500 + dx, lo // 500 + dy), []):
                d = (a[i] - la) ** 2 + ((a[i + 1] - lo) * 0.66) ** 2
                if d < bd: bd, best = d, i
    return best, math.sqrt(bd) / 1e5 * 111000 if best is not None else 1e9
out = {}
for k, items in h.out.items():
    lst = []
    for lat, lon, name, st, num, city in items:
        i, dist = nearest(lat, lon)
        if i is None or dist > 1500: continue   # mimo kraj nebo bez adresy v okolí
        if not (st and num): st, num, city = S[a[i + 2]], S[a[i + 4]], S[a[i + 3]]
        city = city or S[a[i + 3]]
        addr = f'{st} {num}, {city}' if st and st != city else f'{city} čp. {num}'
        lst.append([round(lat * 1e5), round(lon * 1e5), name, addr, city, a[i + 6]])
    out[k] = lst
json.dump({'okresy': A['okresy'], 'poi': out}, open('site/poi.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in out.items()})
