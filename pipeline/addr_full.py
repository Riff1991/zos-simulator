"""Úplná databáze adres z OSM pro jihočeské okresy → site/addr.json (stejný formát jako dřív).

Rozdíl proti addr_extract.py + addr.py: adresní body bez `addr:city` se nezahazují, obec se doplní z hranic obcí (admin_level 8),
případně z nejbližšího sídla (place), okres z hranic okresů (admin_level 5). Všechno se čte přímo z pbf, bez externích dat.

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
bld = []   # budovy: (kód, patra, geometrie); kód 1 dům, 2 obytná budova (residential), 3 bytový dům, 4 jiná (občanská, obchod, škola…)
B_HOUSE = {'house', 'detached', 'semidetached_house', 'bungalow', 'farm', 'cabin', 'terrace'}
B_APT = {'apartments', 'dormitory'}
B_OTHER = {'yes', 'civic', 'commercial', 'retail', 'school', 'kindergarten', 'hospital', 'public', 'industrial', 'hotel', 'office', 'church', 'chapel', 'supermarket', 'train_station', 'transportation', 'warehouse', 'sports_hall', 'university', 'government'}


def bcode(b):
    return 1 if b in B_HOUSE else 3 if b in B_APT else 2 if b == 'residential' else 4 if b in B_OTHER else 0


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
            if t.get('boundary') == 'administrative' and t.get('admin_level') in ('5', '8') and t.get('name'):
                g = shapely.wkb.loads(wkb.create_multipolygon(a), hex=True)
                (obce if t['admin_level'] == '8' else okresy).append((t['name'], g))
                return
            b = t.get('building')
            if b and bcode(b):
                lv = t.get('building:levels', '')
                bld.append((bcode(b), int(lv) if lv.isdigit() and 0 < int(lv) < 60 else 0, shapely.wkb.loads(wkb.create_multipolygon(a), hex=True)))
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
    assert ok_geo, 'v datech nejsou hranice okresů (admin_level 5)'
    ok_tree = STRtree([g for _, g in ok_geo])
    ob_tree = STRtree([g for _, g in obce]) if obce else None
    pl_tree = STRtree([Point(lon, lat) for _, lat, lon in places])
    bl_tree = STRtree([g for _, _, g in bld]) if bld else None
    print('budov', len(bld))
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
        bc, bl = 0, 0
        if bl_tree is not None:
            hit = bl_tree.query(pt, predicate='within')
            if len(hit):
                bc, bl = bld[int(hit[0])][0], bld[int(hit[0])][1]
        out.append((lat, lon, st or pl or '', city, num, sub or '', okres, 1 if (cn and not st) else 0, bc, bl))
    print('platných', len(out), '(bez addr:city', miss_city, '; obec z hranic', via_poly, ', ze sídla', via_place, ')')
    import random
    random.seed(7); random.shuffle(out)
    S = {}
    si = lambda s: S.setdefault(s, len(S))
    A, Bd = [], []
    for lat, lon, st, city, num, sub, ok, cp, bc, bl in out:
        A += [round(lat * 1e5), round(lon * 1e5), si(st), si(city), si(num), si(sub), ok, cp]
        Bd += [bc, bl]   # stejné pořadí jako A: kód budovy (0 neznámá) a počet nadzemních pater (0 neznámý)
    strings = [None] * len(S)
    for s, i in S.items(): strings[i] = s
    json.dump({'okresy': WANT, 's': strings, 'a': A, 'b': Bd}, open('site/addr.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('site/addr.json', os.path.getsize('site/addr.json'), 'B, strings', len(strings))
    os.makedirs('work/out', exist_ok=True)
    print('budova u adresy:', collections.Counter(x[8] for x in out), '; s patry', sum(1 for x in out if x[9]))
    cnt = collections.Counter(x[3] for x in out)
    open('work/out/addr_report.txt', 'w', encoding='utf8').write('\n'.join(f'{c}\t{n}' for c, n in cnt.most_common()))


if __name__ == '__main__':
    main(sys.argv[1])
