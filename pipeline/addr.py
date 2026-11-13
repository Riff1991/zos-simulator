import json, random
from shapely.geometry import shape, Point
from shapely.prepared import prep
okr=json.load(open('work/cinv/geometry/okresy.geojson'))['features']
want=['České Budějovice','Český Krumlov','Jindřichův Hradec','Písek','Prachatice','Strakonice','Tábor']
P=[(n,prep(shape(f['geometry']))) for n in want for f in okr if f['properties']['Nazev']==n]
rows=[json.loads(l) for l in open('work/out/addr.geojsonl')]
print('raw',len(rows))
seen=set(); out=[]
for lat,lon,st,pl,city,hn,cn,sn,sub in rows:
    if not city: continue
    num = hn or (f'{cn}/{sn}' if cn and sn else cn)
    if not num: continue
    k=(round(lat,4),round(lon,4),num)
    if k in seen: continue
    seen.add(k)
    pt=Point(lon,lat); ok=None
    for i,(n,p) in enumerate(P):
        if p.contains(pt): ok=i; break
    if ok is None: continue
    out.append((lat,lon,st or pl or '',city,num,sub or '',ok,1 if (cn and not st) else 0))
print('valid',len(out))
random.seed(7); random.shuffle(out)
S={}; 
def si(s): return S.setdefault(s,len(S))
A=[]
for lat,lon,st,city,num,sub,ok,cp in out:
    A+= [round(lat*1e5),round(lon*1e5),si(st),si(city),si(num),si(sub),ok,cp]
strings=[None]*len(S)
for s,i in S.items(): strings[i]=s
json.dump({'okresy':want,'s':strings,'a':A},open('site/addr.json','w'),ensure_ascii=False,separators=(',',':'))
import os; print('bytes',os.path.getsize('site/addr.json'),'strings',len(strings))
