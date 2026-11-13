import pickle, struct, math, json
from collections import defaultdict
G=pickle.load(open('work/out/graph.pkl','rb'))
CLS={'motorway':0,'trunk':1,'primary':2,'secondary':3,'tertiary':4,'minor':5,'service':6}
use=defaultdict(int)
for c,ids,co,ow in G:
    for i in ids: use[i]+=1
    use[ids[0]]+=1; use[ids[-1]]+=1
coord={}
for c,ids,co,ow in G:
    for i,p in zip(ids,co): coord[i]=p
edges=[]
for c,ids,co,ow in G:
    k=CLS[c]; s=0
    for j in range(1,len(ids)):
        if use[ids[j]]>=2 or j==len(ids)-1:
            seg=ids[s:j+1]
            if len(seg)>=2 and not (len(seg)==2 and seg[0]==seg[1]): edges.append((seg[0],seg[-1],k,seg))
            s=j
# largest component
par={}
def f(x):
    r=x
    while par.get(r,r)!=r: r=par[r]
    while par.get(x,x)!=r: par[x],x=r,par[x]
    return r
for a,b,_,_ in edges:
    ra,rb=f(a),f(b)
    if ra!=rb: par[ra]=rb
cnt=defaultdict(int)
for a,b,_,_ in edges: cnt[f(a)]+=1
main=max(cnt,key=cnt.get)
edges=[e for e in edges if f(e[0])==main]
nid={}
for a,b,_,_ in edges:
    for x in (a,b): nid.setdefault(x,len(nid))
# douglas-peucker on intermediate points
def dp(pts,eps):
    if len(pts)<3: return pts
    (x1,y1),(x2,y2)=pts[0],pts[-1]
    dx,dy=x2-x1,y2-y1; L=math.hypot(dx,dy) or 1e-12
    md,mi=0,0
    for i in range(1,len(pts)-1):
        x,y=pts[i]; d=abs(dy*(x-x1)-dx*(y-y1))/L
        if d>md: md,mi=d,i
    if md>eps: return dp(pts[:mi+1],eps)[:-1]+dp(pts[mi:],eps)
    return [pts[0],pts[-1]]
N=len(nid)
nodes=[None]*N
for x,i in nid.items(): nodes[i]=coord[x]
buf_e=bytearray(); buf_p=bytearray()
npts=0
for a,b,k,seg in edges:
    pts=[ (coord[x][0]*0.66, coord[x][1]) for x in seg]
    simp=dp(pts,0.00004)
    mids=[(round(x/0.66*1e5),round(y*1e5)) for x,y in simp[1:-1]]
    # length in meters of full geometry
    L=0
    for j in range(1,len(seg)):
        (x1,y1),(x2,y2)=coord[seg[j-1]],coord[seg[j]]
        L+=math.hypot((x2-x1)*72800,(y2-y1)*111190)
    buf_e+=struct.pack('<IIBHI',nid[a],nid[b],k,len(mids),min(int(L),2**32-1))
    for m in mids: buf_p+=struct.pack('<ii',m[1],m[0])  # lat,lon
    npts+=len(mids)
hdr=struct.pack('<III',N,len(edges),npts)
nb=bytearray()
for lon,lat in nodes: nb+=struct.pack('<ii',round(lat*1e5),round(lon*1e5))
open('site/graph.wasm','wb').write(hdr+nb+buf_e+buf_p)
print('nodes',N,'edges',len(edges),'pts',npts,'bytes',len(hdr+nb+buf_e+buf_p))
