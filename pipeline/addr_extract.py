"""Jen adresy z OSM (uzly + budovy) → work/out/addr.geojsonl, ve stejném formátu jako extract.py.
Použití: python3 pipeline/addr_extract.py work/jihocesky.osm.pbf   (pak python3 pipeline/addr.py)
"""
import sys, json, osmium
out = open('work/out/addr.geojsonl', 'w')
def put(t, lat, lon):
    out.write(json.dumps([round(lat, 6), round(lon, 6), t.get('addr:street') or '', t.get('addr:place') or '', t.get('addr:city') or '',
        t.get('addr:housenumber') or '', t.get('addr:conscriptionnumber') or '', t.get('addr:streetnumber') or '', t.get('addr:suburb') or ''], ensure_ascii=False) + '\n')
def has(t): return 'addr:housenumber' in t or 'addr:conscriptionnumber' in t
class H(osmium.SimpleHandler):
    def node(s, n):
        if has(n.tags): put(n.tags, n.location.lat, n.location.lon)
    def area(s, a):
        if not has(a.tags): return
        try:
            r = next(iter(a.outer_rings())); pts = [(n.lat, n.lon) for n in r]
            put(a.tags, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        except Exception: pass
H().apply_file(sys.argv[1], locations=True)
out.close()
