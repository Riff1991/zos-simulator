import pandas as pd, numpy as np, json, collections
A=json.load(open('../../site/addr.json',encoding='utf8'))
a=A['a']; S=A['s']; n=len(a)//8
cnt=collections.Counter(S[a[i*8+3]] for i in range(n))
tot=sum(cnt.values()); print('adresních bodů',tot,'obcí',len(cnt))
d=pd.read_pickle('all2.pkl'); ev=d[d['Výjezd první posádky u události']=='Ano']
ev=ev[ev['Obec'].notna()]
rc=ev['Obec'].value_counts(); N=len(ev)
print('reálných obcí',len(rc),'; událostí',N)
top=rc[rc>=8]
miss=[o for o in top.index if o not in cnt]
print('obcí s ≥8 událostmi:',len(top),'; nenalezeno v adresách:',miss[:15],len(miss))
rows=[]
for o,c in top.items():
    if o in cnt: rows.append((o,c/N,cnt[o]/tot,(c/N)/(cnt[o]/tot)))
rows.sort(key=lambda x:-x[1])
print('\nTOP 20: obec, reálný podíl %, podíl adres %, násobek')
for o,r,aa,m in rows[:20]: print(f'  {o:28} {r*100:5.2f} {aa*100:5.2f}  ×{m:.2f}')
rl=sum(r for _,r,_,_ in rows); al=sum(aa for _,_,aa,_ in rows)
mo=(1-rl)/(1-al); print(f'\nvyjmenované obce: reálně {rl*100:.1f} % událostí, {al*100:.1f} % adres; násobek ostatních ×{mo:.2f}')
ms=[m for _,_,_,m in rows]; print('násobky: medián %.2f, p10 %.2f, p90 %.2f, max %.1f'%(np.median(ms),np.quantile(ms,.1),np.quantile(ms,.9),max(ms)))
mul={o:round(min(6,m),2) for o,_,_,m in rows}
json.dump({'mul':mul,'other':round(mo,3)},open('obecmul.json','w',encoding='utf8'),ensure_ascii=False)
print('počet položek',len(mul))
