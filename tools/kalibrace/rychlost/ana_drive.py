import pandas as pd, numpy as np, json
d=pd.read_pickle('all2.pkl'); P=json.load(open('pairs_out.json',encoding='utf8'))
x=d[(d['Výjezd první posádky u události']=='Ano')&(d['Typ vozidla (auto/vrtulník)']=='pozemní')&d['Marný výjezd'].isna()].copy()
x['key']=x['Stanoviště']+'|'+x['Obec']; x=x[x['key'].isin(P)]
x['rt']=x['key'].map(lambda k:P[k][0]); x['rkm']=x['key'].map(lambda k:P[k][1])
x['drive']=(x['Čas příjezdu']-x['Čas výjezdu']).dt.total_seconds(); x['turn']=(x['Čas výjezdu']-x['Čas výzvy']).dt.total_seconds()
x=x[(x['drive']>20)&(x['drive']<5400)&x['Naléhavost'].isin(['N1','N2','N3'])]
print(len(x),'případů')
DR={'N1':(100,.92),'N2':(125,.97),'N3':(60,1.05)}
x['model']=[s*DR[n][1]+DR[n][0]*min(1,s/150) for s,n in zip(x['rt'],x['Naléhavost'])]
bins=[0,120,240,360,540,720,960,1320,1800,9999]; lab=['<2','2-4','4-6','6-9','9-12','12-16','16-22','22-30','30+']
x['bin']=pd.cut(x['rt'],bins,labels=lab)
for n in ['N1','N2','N3']:
    y=x[x['Naléhavost']==n]; print('\n',n,len(y))
    g=y.groupby('bin',observed=True).agg(n=('drive','size'),router=('rt','median'),real=('drive','median'),p25=('drive',lambda s:s.quantile(.25)),p75=('drive',lambda s:s.quantile(.75)),model=('model','median'))
    g['real/router']=(g['real']/g['router']).round(2); print(g.round(2).to_string())
for n in ['N1','N2','N3']:
    y=x[(x['Naléhavost']==n)&(x['rt']>60)]
    A=np.vstack([np.ones(len(y)),y['rt']]).T; w=np.ones(len(y))
    for _ in range(60):
        c=np.linalg.lstsq(A*w[:,None],y['drive'].values*w,rcond=None)[0]; r=np.abs(y['drive'].values-A@c); w=1/np.sqrt(np.maximum(r,5))
    print(n,'robustní fit: skutečnost = %.0f s + %.2f × router (n=%d)'%(c[0],c[1],len(y)))
print('\nprodleva medián',x.groupby('Naléhavost')['turn'].median().to_dict())
print('Km:',x['Km'].astype(float).describe().round(1).to_dict())
x.to_pickle('cal_drive.pkl')
