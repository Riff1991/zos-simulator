# Vytáhne železniční tratě z vektorových dlaždic hry (site/t/*.wasm, vrstva "rail") do site/rail.json.
# Výstup: {"lines": [[[lat*1e5, lon*1e5], ...], ...]} – polylinie tratí v kraji, zjednodušené na body po ~150 m.
# Použití: python pipeline/extract_rail.py   (potřebuje: pip install mapbox-vector-tile)
import gzip, json, math, os
import mapbox_vector_tile as mvt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')
ZOOM = 12
ix = json.load(open(os.path.join(SITE, 'tiles-index.json')))
cache = {}

def chunk(name):
    if name not in cache:
        cache[name] = open(os.path.join(SITE, 't', name + '.wasm'), 'rb').read()
    return cache[name]

def tile2lon(x, z): return x / 2 ** z * 360 - 180
def tile2lat(y, z):
    n = math.pi - 2 * math.pi * y / 2 ** z
    return math.degrees(math.atan(math.sinh(n)))

def hav(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742000 * math.asin(math.sqrt(x))

lines = []
for key, (ck, off, ln) in ix.items():
    if not key[0].isdigit(): continue
    z, x, y = map(int, key.split('/'))
    if z != ZOOM: continue
    raw = chunk(ck)[off:off + ln]
    try: raw = gzip.decompress(raw)
    except OSError: pass
    t = mvt.decode(raw)
    layer = t.get('rail')
    if not layer: continue
    ext = layer.get('extent', 4096)
    for f in layer['features']:
        g = f['geometry']
        parts = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []
        for part in parts:
            pts = []
            for px, py in part:
                # y v MVT roste dolů od severního okraje dlaždice
                lon = tile2lon(x + px / ext, z)
                lat = tile2lat(y + py / ext, z)
                pts.append((lat, lon))
            lines.append(pts)

def simplify(pts, step=150):
    out = [pts[0]]
    for p in pts[1:-1]:
        if hav(out[-1][0], out[-1][1], p[0], p[1]) >= step: out.append(p)
    out.append(pts[-1])
    return out

res = [[[round(a * 1e5), round(b * 1e5)] for a, b in simplify(pl)] for pl in lines if len(pl) >= 2]
json.dump({'lines': res}, open(os.path.join(SITE, 'rail.json'), 'w'), separators=(',', ':'))
print('polylinií', len(res), 'bodů', sum(len(l) for l in res))
