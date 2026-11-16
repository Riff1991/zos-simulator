import pandas as pd, numpy as np, json
d=pd.read_pickle('all2.pkl'); ev=d[d['Výjezd první posádky u události']=='Ano'].copy()
ev['hod']=ev['Čas výzvy'].dt.hour; ev['dow']=ev['Čas výzvy'].dt.dayofweek; ev['datum']=ev['Čas výzvy'].dt.date
# denní faktory pro den v týdnu (průměr dvou měsíců, každý normalizovaný svým průměrem), zkrácené o 40 % ke 1
f=np.zeros(7); 
for m in ['2026-01','2026-07']:
    e=ev[ev.mesic==m]; per=e.groupby(['datum','dow']).size().reset_index(name='n'); g=per.groupby('dow').n.mean(); f+=(g/g.mean()).values/2
f=1+(f-1)*0.6; f=f/f.mean()
print('faktory po..ne:',f.round(3).tolist())
out={'dow':[round(x,3) for x in f]}
for season,m in [('winter','2026-01'),('summer','2026-07')]:
    e=ev[ev.mesic==m]; days=e.groupby('datum').dow.first()
    for key,mask in [('wd',days<5),('we',days>=5)]:
        dd=set(days[mask].index); x=e[e.datum.isin(dd)]
        h=(x.groupby('hod').size().reindex(range(24),fill_value=0)/max(1,len(dd)))
        # očistit o denní faktor: události za hodinu v „průměrném“ dni daného typu
        fm=np.mean([f[k] for k in days[mask].values])
        out.setdefault(season,{})[key]=[round(float(v/fm),2) for v in h.values]
        print(season,key,'dnů',len(dd),'událostí/den %.0f'%(h.sum()/fm))
json.dump(out,open('dowhour.json','w'))
print(json.dumps(out['winter']['wd']))
