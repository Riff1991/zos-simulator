"""Reálná místa z OSM pro výzvy: domovy pro seniory, školy/školky, ordinace, provozovny → site/poi.json.
Použití: python3 pipeline/poi_build.py work/jihocesky.osm.pbf   (potřebuje site/addr.json pro doplnění adres)
"""
import sys, json, math, osmium
from collections import defaultdict

def kind(t):
    a, sf, h = t.get('amenity'), t.get('social_facility'), t.get('healthcare')
    if (a == 'social_facility' and sf in ('nursing_home', 'assisted_living', 'group_home')) or a == 'nursing_home' or sf == 'nursing_home': return 'domov'
    if a in ('school', 'kindergarten', 'college', 'university'): return 'skola'
    if a in ('doctors', 'clinic', 'dentist') or h in ('doctor', 'clinic', 'centre'): return 'ordinace'
    named = bool(t.get('name'))
    tour, lei = t.get('tourism'), t.get('leisure')
    if tour in ('hotel', 'hostel', 'guest_house', 'motel', 'camp_site', 'apartment', 'chalet', 'caravan_site') and named: return 'ubytovani'
    if lei in ('sports_centre', 'swimming_pool', 'stadium', 'fitness_centre', 'water_park', 'golf_course', 'ice_rink', 'playground', 'pitch', 'track') and (named or lei in ('sports_centre', 'swimming_pool', 'stadium', 'playground')): return 'sport'
    if named and (t.get('railway') in ('station', 'halt') or t.get('highway') == 'bus_stop' and False or a in ('bus_station', 'townhall', 'library', 'place_of_worship', 'post_office', 'fuel', 'restaurant', 'pub', 'cafe', 'fast_food', 'bank', 'community_centre', 'theatre', 'cinema', 'marketplace', 'pharmacy', 'police', 'fire_station', 'car_wash')
                  or tour in ('museum', 'attraction', 'viewpoint', 'zoo', 'theme_park', 'gallery') or t.get('landuse') == 'cemetery' or t.get('historic') in ('castle', 'monument', 'memorial')): return 'verejne'
    if named and (t.get('shop') or t.get('craft') or t.get('office') or t.get('man_made') == 'works' or t.get('landuse') in ('industrial', 'farmyard', 'quarry') or t.get('building') in ('industrial', 'warehouse', 'farm', 'commercial', 'retail', 'supermarket')): return 'prov'
    if t.get('landuse') == 'industrial' or t.get('building') in ('industrial', 'warehouse'): return 'prov'
    return None

class H(osmium.SimpleHandler):
    def __init__(s): super().__init__(); s.out = defaultdict(list)
    def put(s, t, lat, lon):
        k = kind(t)
        if not k or (k == 'prov' and not t.get('name') and False): return
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
import re
BIZ = re.compile(r'(hotel|penzion|restaurac|pivnice|hospoda|hostinec|kavárna|cukrárna|bufet|bistro|bar\b|pub\b|obchod|prodejna|potraviny|market|samoobsluha|lékárna|pošta|úřad|obecní|městský|škola|školka|nádraží|zastávka|kostel|kaple|hřbitov|zámek|hrad|muzeum|galerie|knihovna|kino|divadlo|sportovní|stadion|hřiště|koupaliště|bazén|areál|autoservis|servis|pila|farma|zemědělsk|družstvo|továrna|firma|sklad|truhlářství|pekárna|řeznictví|květinářství|drogerie|kadeřnictví|salon|studio|fitness|camp|kemp|chata|chalupa|apartmán|ubytování|dům|centrum|hasič|policie|benzin|čerpací|lidl|billa|kaufland|albert|penny|tesco|hypermarket|tabák|trafika|sklenářství|zámečnictví|autodíly|pneu|bank[ay]?\b)', re.I)
TITLE = re.compile(r'(MUDr|MVDr|JUDr|Ing\.|Mgr\.|Bc\.|PhDr|RNDr|DiS\.|\bpan\b|\bpaní\b)', re.I)
def personal(name):
    if TITLE.search(name): return True
    tk = name.split()
    if len(tk) == 2 and all(x[:1].isupper() and x.isalpha() for x in tk) and not BIZ.search(name): return True
    return False
out = {}
for k, items in h.out.items():
    lst = []
    for lat, lon, name, st, num, city in items:
        if name and personal(name): name = ''
        i, dist = nearest(lat, lon)
        if i is None or dist > 1500: continue   # mimo kraj nebo bez adresy v okolí
        if not (st and num): st, num, city = S[a[i + 2]], S[a[i + 4]], S[a[i + 3]]
        city = city or S[a[i + 3]]
        addr = f'{st} {num}, {city}' if st and st != city else f'{city} čp. {num}'
        lst.append([round(lat * 1e5), round(lon * 1e5), name, addr, city, a[i + 6]])
    out[k] = lst
json.dump({'okresy': A['okresy'], 'poi': out}, open('site/poi.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in out.items()})
