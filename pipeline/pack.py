import sqlite3, gzip, json, os
c=sqlite3.connect('work/jc.mbtiles')
chunks={}; idx={}
for z,x,ytms,d in c.execute('select zoom_level,tile_column,tile_row,tile_data from tiles'):
    y=(1<<z)-1-ytms
    name='low' if z<10 else f'{x>>(z-10)}_{y>>(z-10)}'
    g=gzip.compress(d,9)
    b=chunks.setdefault(name,bytearray())
    idx[f'{z}/{x}/{y}']=[name,len(b),len(g)]
    b+=g
out='site/t'
for f in os.listdir(out): os.remove(os.path.join(out,f))
tot=0
for n,b in chunks.items():
    open(f'{out}/{n}.wasm','wb').write(b); tot+=len(b)
# glyphs
G=bytearray(); gidx={}
for font,dirn in [('Noto Sans Regular','noto-sans-regular'),('Noto Sans Bold','noto-sans-bold')]:
    for r in ['0-255','256-511','8192-8447']:
        d=open(f'work/glyphs/package/{dirn}/{r}.pbf','rb').read()
        gidx[f'{font}/{r}']=['glyphs',len(G),len(d)]; G+=d
open(f'{out}/glyphs.wasm','wb').write(G)
idx.update({'g:'+k:v for k,v in gidx.items()})
json.dump(idx,open('site/tiles-index.json','w'),separators=(',',':'))
print('chunks',len(chunks),'MB',tot/1e6,'max',max(len(b) for b in chunks.values())/1e6,'glyphs',len(G))
