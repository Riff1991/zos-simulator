"""Úplná databáze adres z OSM pro jihočeské okresy → site/addr.json (stejný formát jako dřív).

Rozdíl proti addr_extract.py + addr.py: adresní body bez `addr:city` se nezahazují, obec se doplní z hranic obcí (admin_level 8),
případně z nejbližšího sídla (place), okres z hranic okresů (admin_level 7). Všechno se čte přímo z pbf, bez externích dat.

Použití: python3 pipeline/addr_full.py work/jihocesky.osm.pbf        (vyžaduje: pip install osmium shapely)
Výstup: site/addr.json, work/out/addr_report.txt (počty podle obcí).
"""
import sys, json, os, collections
import osmium, shapely.wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

WANT = ['České Budějovice', 'Český Krumlov', 'Jindřichův Hradec', 'Písek', 'Prachatice', 'Strakonice', 'Tábor']
wkb = osmium.geom.WKBFactory()
rows, places, obce, okresy = [], [], [], []   # obce/okresy: (název, geometrie)


def has_addr(t):
    return 'addr:housenumber' in t or 'addr:conscriptionnumber' in t


def put(t, lat, lon):
    rows.append((round(lat, 6), round(lon, 6), t.get('addr:street') or '', t.get('addr:place') or '', t.get('addr:city') or '',
                 t.get('addr:housenumber') or '', t.get('addr:conscriptionnumber') or '', t.get('addr:streetnumber') or '', t.get('addr:suburb') or ''))


class H(osmium.SimpleHandler):
    def node(self, n):
        t = n.tags
        if has_addr(t): put(t, n.location.lat, n.location.lon)
        if t.get('place') in ('city', 'town', 'village', 'hamlet', 'isolated_dwelling', 'suburb') and t.get('name'):
            places.append((t['name'], n.location.lat, n.location.lon))

    def area(self, a):
        t = a.tags
        try:
            if t.get('boundary') == 'administrative' and t.get('admin_level') in ('7', '8') and t.get('name'):
                g = shapely.wkb.loads(wkb.create_multipolygon(a), hex=True)
                (obce if t['admin_level'] == '8' else okresy).append((t['name'], g))
                return
            if has_addr(t):
                g = shapely.wkb.loads(wkb.create_multipolygon(a), hex=True).centroid
                put(t, g.y, g.x)
        except Exception:
            pass


def main(path):
    H().apply_file(path, locations=True)
    print('adresních značek', len(rows), 'sídel', len(places), 'obcí', len(obce), 'okresů', len(okresy))
    ok_geo = []
    for name, g in okresy:
        n = name.replace('okres ', '').strip()
        if n in WANT: ok_geo.append((WANT.index(n), g))
    assert ok_geo, 'v datech nejsou hranice okresů (admin_level 7)'
    ok_tree = STRtree([g for _, g in ok_geo])
    ob_tree = STRtree([g for _, g in obce]) if obce else None
    pl_tree = STRtree([Point(lon, lat) for _, lat, lon in places])
    seen, out, miss_city, via_poly, via_place = set(), [], 0, 0, 0
    for lat, lon, st, pl, city, hn, cn, sn, sub in rows:
        num = hn or (f'{cn}/{sn}' if cn and sn else cn)
        if not num: continue
        k = (round(lat, 5), round(lon, 5), num)
        if k in seen: continue
        seen.add(k)
        pt = Point(lon, lat)
        oi = next((i for i in ok_tree.query(pt, predicate='within')), None)
        if oi is None: continue
        okres = ok_geo[oi][0]
        if not city:
            miss_city += 1
            if ob_tree is not None:
                hit = ob_tree.query(pt, predicate='within')
                if len(hit): city = obce[int(hit[0])][0]; via_poly += 1
            if not city:
                j = int(pl_tree.nearest(pt))
                if j is not None and Point(places[j][2], places[j][1]).distance(pt) < 0.03:   # ~3 km
                    city = places[j][0]; via_place += 1
            if not city: continue
        out.append((lat, lon, st or pl or '', city, num, sub or '', okres, 1 if (cn and not st) else 0))
    print('platných', len(out), '(bez addr:city', miss_city, '; obec z hranic', via_poly, ', ze sídla', via_place, ')')
    import random
    random.seed(7); random.shuffle(out)
    S = {}
    si = lambda s: S.setdefault(s, len(S))
    A = []
    for lat, lon, st, city, num, sub, ok, cp in out:
        A += [round(lat * 1e5), round(lon * 1e5), si(st), si(city), si(num), si(sub), ok, cp]
    strings = [None] * len(S)
    for s, i in S.items(): strings[i] = s
    json.dump({'okresy': WANT, 's': strings, 'a': A}, open('site/addr.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print('site/addr.json', os.path.getsize('site/addr.json'), 'B, strings', len(strings))
    os.makedirs('work/out', exist_ok=True)
    cnt = collections.Counter(c for _, _, _, c, _, _, _, _ in out)
    open('work/out/addr_report.txt', 'w', encoding='utf8').write('\n'.join(f'{c}\t{n}' for c, n in cnt.most_common()))


if __name__ == '__main__':
    main(sys.argv[1])
