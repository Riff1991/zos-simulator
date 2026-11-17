import pandas as pd, json, numpy as np, sys
g=pd.read_pickle('real_pairs2.pkl'); G=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'game_out.json',encoding='utf8'))
rows=[]
for (b,o,n),r in g.iterrows():
    k=f'{b}|{o}|{n}'
    if k in G: rows.append((b,o,n,int(r['n']),r['p25'],r['med'],r['p75'],G[k][1],G[k][2],G[k][3]))
t=pd.DataFrame(rows,columns=['základna','obec','N','n','r25','rmed','r75','g25','gmed','g75'])
t['d']=t['gmed']-t['rmed']; w=t['n']
print('párů',len(t),'| medián rozdílu hra−realita %d s (N2 %d, N3 %d) | vážený průměr %d s | |rozdíl|<60 s v %d %% párů, <90 s v %d %%'%(t['d'].median(),t[t['N']=='N2']['d'].median(),t[t['N']=='N3']['d'].median(),np.average(t['d'],weights=w),(t['d'].abs()<60).mean()*100,(t['d'].abs()<90).mean()*100))
print('šířka IQR: realita %d s, hra %d s (medián přes páry)'%((t['r75']-t['r25']).median(),(t['g75']-t['g25']).median()))
m=lambda s:f'{int(s//60)}:{int(s%60):02d}'
sel=pd.concat([t[t['N']=='N3'].head(8),t[t['N']=='N2'].head(4)])
for _,r in sel.iterrows(): print(f'{r["základna"][:18]:19}{r["obec"][:20]:21}{r["N"]} n={r["n"]:4} realita {m(r["r25"])}–{m(r["rmed"])}–{m(r["r75"])}  hra {m(r["g25"])}–{m(r["gmed"])}–{m(r["g75"])}  {int(r["d"]):+d} s')
