# Hranice okresů a kraje + maska okolí kraje (src/mask.geojson). Zdroj: work/cinv (github.com/CzechInvest/web-data)
import json
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
okr=json.load(open('work/cinv/geometry/okresy.geojson'))['features']
want={'České Budějovice','Český Krumlov','Jindřichův Hradec','Písek','Prachatice','Strakonice','Tábor'}
mine=[(f['properties']['Nazev'],shape(f['geometry'])) for f in okr if f['properties']['Nazev'] in want]
kraj=unary_union([g for _,g in mine])
with open('work/out/boundary.geojsonl','w') as f:
    for n,g in mine:
        f.write(json.dumps({'type':'Feature','properties':{'kind':'okres','name':n},'geometry':mapping(g.boundary.simplify(0.0002))},ensure_ascii=False)+'\n')
    f.write(json.dumps({'type':'Feature','properties':{'kind':'kraj'},'geometry':mapping(kraj.boundary.simplify(0.0002))})+'\n')
mask=box(12.0,47.8,16.5,50.5).difference(kraj.buffer(0.0003)).simplify(0.0003)
json.dump({'type':'Feature','properties':{},'geometry':mapping(mask)},open('src/mask.geojson','w'))
