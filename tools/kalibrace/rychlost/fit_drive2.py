import pandas as pd, numpy as np, json
from scipy.optimize import minimize
from scipy.stats import norm
x=pd.read_pickle('fit_drive.pkl'); S=json.load(open('secs_out.json',encoding='utf8'))
x=x[x['Typ posádky'].isin(['RZP','RLP'])].copy(); x['key']=x['Stanoviště']+'|'+x['Obec']; x=x[x['key'].isin(S)]
x['h']=x['Čas výzvy'].dt.hour
HF={h:(1.10 if h<6 else 1.04 if h<9 else 1.0) for h in range(24)}   # noční / ranní faktor z dat (0–5 h +10 %, 6–8 h +4 %)
x['hf']=x['h'].map(HF)
Z=norm.ppf((np.arange(25)+.5)/25); Q=[.1,.25,.5,.75,.9]; SK=900
def D(secs,p,mul,sg):
    a,b,b2=p; s=np.array(secs)[:,None]
    base=a+b*np.minimum(s,SK)+b2*np.maximum(0,s-SK)
    return np.maximum(25,base*mul)*np.exp(sg*Z[None,:]-sg*sg/2)
def loss(v,groups,bm):
    a,b,b2,sg=v
    if not(0.3<b<1.6 and 0.6<b2<1.6 and 0.05<sg<0.8 and -60<a<500): return 1e9
    L=W=0
    for key,g,base in groups:
        mul=bm.get(base,1.0)*g['hf'].mean(); sq=np.quantile(D(S[key],(a,b,b2),mul,sg).ravel(),Q); rq=g['drive'].quantile(Q).values; w=np.sqrt(len(g))
        L+=w*np.sum((np.log(sq)-np.log(rq))**2); W+=w
    return L/W
def groups_of(df,minn):
    return [(k,g,g['Stanoviště'].iloc[0]) for k,g in df.groupby('key') if len(g)>=minn]
bm={}; params={}
sel={'RZP_N2':(x['Typ posádky']=='RZP')&(x['Naléhavost']=='N2'),'RZP_N3':(x['Typ posádky']=='RZP')&(x['Naléhavost']=='N3'),'RLP_N23':(x['Typ posádky']=='RLP')&x['Naléhavost'].isin(['N2','N3'])}
for it in range(3):
    for name,m in sel.items():
        gr=groups_of(x[m],8); best=None
        for a0 in [80,150]:
            r=minimize(loss,[a0,0.95,0.9,0.25],args=(gr,bm),method='Nelder-Mead',options={'xatol':.3,'fatol':1e-6,'maxiter':600})
            if best is None or r.fun<best.fun: best=r
        params[name]=best.x.tolist(); print(it,name,len(gr),'a=%.0f b=%.3f b2=%.3f σ=%.3f loss=%.4f'%(*best.x,best.fun))
    # základnové násobky z reziduí (zkrácené)
    x['pred']=0.0
    for name,m in sel.items():
        a,b,b2,sg=params[name]
        x.loc[m,'pred']=[(a+b*min(np.median(S[k]),SK)+b2*max(0,np.median(S[k])-SK)) for k in x.loc[m,'key']]
    z=x[x['pred']>0].copy(); z['lr']=np.log(z['drive']/(z['pred']*z['hf']))
    t=z.groupby('Stanoviště')['lr'].agg(['median','size'])
    bm={k:float(np.exp(r['median']*r['size']/(r['size']+40))) for k,r in t.iterrows() if r['size']>=30}
print({k:round(v,2) for k,v in sorted(bm.items(),key=lambda kv:kv[1])})
# N1: násobek proti N2 (pro RZP a RLP)
c1={}
for typ in ['RZP','RLP']:
    y=x[(x['Typ posádky']==typ)&(x['Naléhavost']=='N1')]; n2=params['RZP_N2'] if typ=='RZP' else params['RLP_N23']
    lr=[np.log(r['drive']/((n2[0]+n2[1]*min(np.median(S[r['key']]),SK)+n2[2]*max(0,np.median(S[r['key']])-SK))*bm.get(r['Stanoviště'],1)*r['hf'])) for _,r in y.iterrows()]
    c1[typ]=float(np.exp(np.median(lr))); print('N1',typ,len(y),'násobek proti N2: %.3f'%c1[typ])
json.dump({'params':params,'baseMul':bm,'hf':HF,'c1':c1,'SK':SK},open('drive_params2.json','w'),ensure_ascii=False)
