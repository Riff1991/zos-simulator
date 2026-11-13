import osmium, json, sys, time
from osmium.geom import GeoJSONFactory
gf=GeoJSONFactory()
t0=time.time()
O={k:open(f'work/out/{k}.geojsonl','w') for k in ['roads','rail','water','waterway','landcover','buildings','places','addr']}
ROAD={'motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','unclassified','residential','living_street','service','track','pedestrian'}
GRAPH=[]  # (cls, nodes ids list, coords)
def cls(h):
    h=h.replace('_link','')
    return {'motorway':'motorway','trunk':'trunk','primary':'primary','secondary':'secondary','tertiary':'tertiary','unclassified':'minor','residential':'minor','living_street':'minor','pedestrian':'minor','service':'service','track':'track'}[h]
def w(k,geom,props,tip=None):
    f={'type':'Feature','geometry':json.loads(geom),'properties':props}
    if tip: f['tippecanoe']=tip
    O[k].write(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
nodes_out=[]
class H(osmium.SimpleHandler):
    def node(self,n):
        t=n.tags
        if 'place' in t and t.get('name') and t['place'] in ('city','town','village','hamlet','suburb','isolated_dwelling','neighbourhood'):
            p=t['place']; pop=int(''.join(ch for ch in t.get('population','0') if ch.isdigit()) or 0)
            rank={'city':1,'town':2,'suburb':3,'village':3,'hamlet':4,'neighbourhood':5,'isolated_dwelling':5}[p]
            w('places',gf.create_point(n),{'name':t['name'],'place':p,'rank':rank,'pop':pop})
        if 'addr:housenumber' in t or 'addr:conscriptionnumber' in t:
            self.addr(t,n.location.lat,n.location.lon)
    def addr(self,t,lat,lon):
        O['addr'].write(json.dumps([round(lat,6),round(lon,6),t.get('addr:street') or '',t.get('addr:place') or '',t.get('addr:city') or '',t.get('addr:housenumber') or '',t.get('addr:conscriptionnumber') or '',t.get('addr:streetnumber') or '',t.get('addr:suburb') or ''],ensure_ascii=False)+'\n')
    def way(self,wy):
        t=wy.tags
        h=t.get('highway')
        try:
            if h in ROAD:
                c=cls(h)
                if h=='service' and t.get('service') in ('parking_aisle','driveway','drive-through'): return
                g=gf.create_linestring(wy)
                p={'class':c}
                if t.get('name'): p['name']=t['name']
                if t.get('ref'): p['ref']=t['ref']
                if h.endswith('_link'): p['link']=1
                if t.get('bridge')=='yes': p['bridge']=1
                if t.get('tunnel')=='yes': p['tunnel']=1
                minz={'motorway':5,'trunk':5,'primary':6,'secondary':8,'tertiary':9,'minor':11,'service':13,'track':13}[c]
                w('roads',g,p,{'minzoom':minz})
                if c!='track' or True:
                    if c not in ('track',) and h!='pedestrian':
                        acc=t.get('access'); mv=t.get('motor_vehicle')
                        if acc in ('no','private') and c in ('service',): return
                        ow=t.get('oneway')
                        GRAPH.append((c,[nd.ref for nd in wy.nodes],[(round(nd.lon,6),round(nd.lat,6)) for nd in wy.nodes], 1 if ow in ('yes','1') or h in ('motorway',) or t.get('junction')=='roundabout' else (-1 if ow=='-1' else 0)))
            elif t.get('railway') in ('rail','narrow_gauge') and t.get('service') is None:
                w('rail',gf.create_linestring(wy),{'class':t['railway']},{'minzoom':8})
            elif t.get('waterway') in ('river','stream','canal'):
                p={'class':t['waterway']}
                if t.get('name'): p['name']=t['name']
                w('waterway',gf.create_linestring(wy),p,{'minzoom':8 if t['waterway']=='river' else 12})
        except Exception as e:
            pass
    def area(self,a):
        t=a.tags
        try:
            if 'building' in t:
                g=gf.create_multipolygon(a); w('buildings',g,{},{'minzoom':14})
                if 'addr:housenumber' in t or 'addr:conscriptionnumber' in t:
                    import json as J
                    co=J.loads(g)['coordinates'][0][0]
                    lat=sum(c[1] for c in co)/len(co); lon=sum(c[0] for c in co)/len(co)
                    self.addr(t,lat,lon)
                return
            if t.get('natural')=='water' or t.get('waterway')=='riverbank' or t.get('landuse') in ('reservoir','basin'):
                p={}
                if t.get('name'): p['name']=t['name']
                w('water',gf.create_multipolygon(a),p,{'minzoom':6})
                return
            lu=t.get('landuse'); nat=t.get('natural')
            c=None
            if lu=='forest' or nat=='wood': c='wood'
            elif lu in ('residential',): c='residential'
            elif lu in ('industrial','commercial','retail'): c='industrial'
            elif lu in ('meadow','grass') or nat in ('grassland','heath'): c='grass'
            elif lu in ('farmland',): c='farmland'
            if c: w('landcover',gf.create_multipolygon(a),{'class':c},{'minzoom':6 if c=='wood' else 9})
        except Exception:
            pass
H().apply_file('work/jihocesky.osm.pbf',locations=True)
for f in O.values(): f.close()
print('features done',time.time()-t0,'graph ways',len(GRAPH),flush=True)
import pickle; pickle.dump(GRAPH,open('work/out/graph.pkl','wb'))
