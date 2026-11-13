# Zjednodušení landcover (bez farmland a grass) kvůli velikosti dlaždic
import json
from shapely.geometry import shape, mapping
with open('work/out/landcover3.geojsonl','w') as o:
    for l in open('work/out/landcover.geojsonl'):
        f=json.loads(l)
        if f['properties']['class'] in ('grass','farmland'): continue
        g=shape(f['geometry'])
        if g.area<2e-7: continue
        g=g.simplify(0.00004,preserve_topology=True)
        if g.is_empty: continue
        f['geometry']=mapping(g); o.write(json.dumps(f,separators=(',',':'))+'\n')
