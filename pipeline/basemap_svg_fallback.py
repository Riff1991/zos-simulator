import json,time
from shapely.geometry import shape, Point, box
from shapely.ops import unary_union
from shapely.prepared import prep
t0=time.time()
c='cinv/'
X=lambda lon:(lon-13.55)/1.95*1000
Y=lambda lat:(49.78-lat)/1.28*1000
okr=json.load(open(c+'geometry/okresy.geojson'))['features']
want={'České Budějovice','Český Krumlov','Jindřichův Hradec','Písek','Prachatice','Strakonice','Tábor'}
mine=[(f['properties']['Nazev'],shape(f['geometry'])) for f in okr if f['properties']['Nazev'] in want]
kraj=unary_union([g for _,g in mine])
bb=box(13.3,48.45,15.8,49.9)
near=kraj.buffer(0.12).simplify(0.01)
pnear=prep(near); minx,miny,maxx,maxy=near.bounds
def pr(g): return f'{X(g[0]):.1f},{Y(g[1]):.1f}'
def pathpoly(geom,tol):
    geom=geom.simplify(tol,preserve_topology=True)
    ps=[geom] if geom.geom_type=='Polygon' else [g for g in getattr(geom,'geoms',[]) if g.geom_type=='Polygon']
    o=[]
    for p in ps:
        for r in [p.exterior]+list(p.interiors): o.append('M'+'L'.join(pr(q) for q in r.coords)+'Z')
    return ''.join(o)
def lines(geom):
    return [geom] if geom.geom_type=='LineString' else [g for g in getattr(geom,'geoms',[]) if g.geom_type=='LineString']
def pathlines(geom,tol):
    return ''.join('M'+'L'.join(pr(q) for q in l.simplify(tol).coords) for l in lines(geom) if l.length>0)
def load(f,classes):
    out=[]
    for ft in json.load(open(c+f))['features']:
        p=ft['properties']
        if p.get('fclass') not in classes: continue
        co=ft['geometry']['coordinates']
        xs=[q[0] for q in co]; ys=[q[1] for q in co]
        if max(xs)<minx or min(xs)>maxx or max(ys)<miny or min(ys)>maxy: continue
        g=shape(ft['geometry'])
        if not pnear.intersects(g): continue
        out.append((p,g))
    return out
res={}
res['kraj']=pathpoly(kraj.buffer(0.0004),0.0012)
res['okresy']={n:pathpoly(g,0.0012) for n,g in mine}
res['okoli']=pathpoly(unary_union([shape(f['geometry']) for f in okr if f['properties']['Nazev'] not in want and shape(f['geometry']).intersects(bb)]),0.002)
orpf=json.load(open(c+'geometry/orp.geojson'))['features']
orp=[(f['properties']['Nazev'],shape(f['geometry'])) for f in orpf]
sel=[(n,g) for n,g in orp if g.intersects(kraj) and g.intersection(kraj).area>g.area*0.5]
res['orp']=pathlines(unary_union([g.boundary for n,g in sel]),0.0015)
res['orpNames']=[[n,round(X(g.representative_point().x),1),round(Y(g.representative_point().y),1)] for n,g in sel]
res['okresNames']=[[n,round(X(g.representative_point().x),1),round(Y(g.representative_point().y),1)] for n,g in mine]
print('admin',time.time()-t0,flush=True)
mot=load('doprava/highway.geojson',{'motorway','motorway_link'})
pri=load('doprava/primary.geojson',{'primary','primary_link'})
sec=load('doprava/secondary.geojson',{'secondary','secondary_link'})
print('roads loaded',len(mot),len(pri),len(sec),time.time()-t0,flush=True)
res['dalnice']=''.join(pathlines(g,0.0003) for p,g in mot)
res['silnice1']=''.join(pathlines(g,0.0004) for p,g in pri)
res['silnice2']=''.join(pathlines(g,0.0006) for p,g in sec)
def labels(items):
    by={}
    for p,g in items:
        ref=p.get('ref')
        if not ref: continue
        by.setdefault(ref.split(';')[0],[]).append(g)
    out=[]
    for ref,gs in by.items():
        ls=[l for g in gs for l in lines(g.intersection(kraj)) ]
        ls=[l for l in ls if l.length>0]
        if not ls: continue
        ls.sort(key=lambda l:-l.length)
        tot=sum(l.length for l in ls)
        n=1+(tot>0.5)+(tot>1.2)
        for i in range(min(n,len(ls))):
            m=ls[i].interpolate(0.5,normalized=True); out.append([ref,round(X(m.x),1),round(Y(m.y),1)])
    return out
res['refs1']=labels(pri)+labels(mot)
res['refs2']=labels(sec)
rail=load('doprava/rail.geojson',{'rail'})
res['rail']=''.join(pathlines(g,0.0006) for p,g in rail)
print('rail',len(rail),time.time()-t0,flush=True)
lk=[shape(f['geometry']).intersection(bb) for f in json.load(open('ne_10m_lakes_europe.geojson'))['features']]
res['jezera']=pathpoly(unary_union([g for g in lk if not g.is_empty]),0.0006)
rv=[shape(f['geometry']).intersection(bb) for f in json.load(open('ne_10m_rivers_europe.geojson'))['features']]
res['reky']=''.join(pathlines(g,0.0006) for g in rv if not g.is_empty)
kb=kraj.buffer(0.05)
res['sidla']=[[f['properties']['name'],round(X(f['geometry']['coordinates'][0]),1),round(Y(f['geometry']['coordinates'][1]),1),f['properties'].get('pop_max',0)] for f in json.load(open('pp.geojson'))['features'] if kb.contains(Point(*f['geometry']['coordinates']))]
for k,v in res.items(): print(k,len(json.dumps(v,ensure_ascii=False)))
json.dump(res,open('basemap2.json','w'),ensure_ascii=False,separators=(',',':'))
print('done',time.time()-t0)
