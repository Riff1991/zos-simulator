import pandas as pd, numpy as np, json
d=pd.read_pickle('all2.pkl')
d['dyn']=d['Poznámka ZOS'].astype(str).str.contains('DYNAMICK',case=False)
d['first']=d['Výjezd první posádky u události']=='Ano'
d['scene']=(d['Čas odjezdu']-d['Čas příjezdu']).dt.total_seconds()/60
d['hosp']=d['Čas příjezdu k zařízení'].notna()
ev=d[d['first']].copy(); later=d[(d['RV']=='Ano')&(~d['first'])]
SKIP={'Vstřícná jízda','Posouzení stavu','Převoz','Technická jízda','Jiné','MU - MATRA 722'}
# mapování id hry -> reálná indikace (a podíl, pokud se jedna reálná dělí na dvě herní)
MAP={'porucha':('Porucha vědomí',1),'dusnost':('Dušnost',1),'hrudnik':('Bolesti na hrudi',1),'cmp':('CMP',1),'kreceU':('Křečové stavy',1),
'alerg':('Alergické reakce',1),'diab':('Diabetické stavy',1),'aryt':('Arytmie',1),'hypert':('Hypertenze',1),'intox':('Intoxikace',1),'krvac':('Neúrazové krvácení',1),
'neuro':('Neurologické stavy',1),'psych':('Psychiatrické stavy',1),'horecka':('Horečka',1),'zvraceni':('Zvracení/průjem',1),'bolest':('Bolest',1),'gyn':('Gynekologické stavy',1),
'dn_lehke':('Dopravní nehoda',0.964),'dn_poly':('Dopravní nehoda',0.036),'trauma':('Trauma',0.9),'trauma_dite':('Trauma',0.1),'popal':('Popálení, poleptání',1),
'asist':('Asistence',1),'czs':('CZS',1),'tonuti':('Tonutí',1),'obeseni':('Oběšení',1),'nzo':('NZO – spatřená',1)}
kept=ev[~ev['Indikace ZOS'].isin(SKIP)]
tot=len(kept)
def qf(x,ps): return [round(float(np.quantile(x,p)),1) for p in ps]
adult=ev[ev['Věk']>=18]; kids=ev[(ev['Věk']<18)&ev['Věk'].notna()]
cal={}
for gid,(kl,share) in MAP.items():
    g=ev[ev['Indikace ZOS']==kl]; 
    if len(g)==0: continue
    c={}
    c['w']=round(len(g)/tot*share*1000,2)
    nn=len(g)
    pn={k:(g['Naléhavost']==k).mean() for k in ('N1','N2','N3')}
    if nn>=150: c['n']={k[1]:round(v,3) for k,v in pn.items() if v>0.0005}
    g2=g[g['Naléhavost']=='N2']
    if len(g2)>=40: c['dyn']=round(float(g2.dyn.mean()),3)
    # lékař: při N2 plné (ne-dynamické) – podíl, že se lékař vysílá hned (1. posádka s lékařem nebo následně RV), jinak později
    pl=g2[~g2.dyn]
    if len(pl)>=40:
        anyd=((d['RV']=='Ano')&(d['Indikace ZOS']==kl)&(d['Naléhavost']=='N2')&(~d.dyn)).sum()/len(pl)
        c['rvInit']=round(float(min(1,anyd)),2)
    dy=g2[g2.dyn]
    if len(dy)>=40:
        lat=((later['Indikace ZOS']==kl)&(later['Naléhavost']=='N2')&(later.dyn)).sum(); nf=(dy['RV']!='Ano').sum()
        c['rvPd']=round(float(min(1,lat/max(1,nf))),3)
    g3=g[g['Naléhavost']=='N3']
    if len(g3)>=100:
        lat=((later['Indikace ZOS']==kl)&(later['Naléhavost']=='N3')).sum(); nf=(g3['RV']!='Ano').sum()
        c['rvP']=round(float(min(1,lat/max(1,nf))),3)
    ad=g[g['Věk']>=18]['Věk']
    if len(ad)>=80: c['ageQ']=qf(ad,(.05,.25,.5,.75,.95))
    if g['Pohlaví'].notna().sum()>=80: c['pF']=round(float((g['Pohlaví']=='Žena').sum()/g['Pohlaví'].notna().sum()),3)
    sc=g[(g.scene>0)&(g.scene<240)].scene
    if len(sc)>=100: c['sceneQ']=qf(sc,(.1,.5,.9))
    zu=g[g['Způsob ukončení'].notna()&(g['Způsob ukončení']!='předán pozemní zách. službě')]['Způsob ukončení']
    TR={'předán na standardní lůžko','předán na intenzivní lůžko','předán do ambul. zařízení','předán LZS'}
    if len(zu)>=100: c['trans']=round(float(zu.isin(TR).mean()),2)
    cal[gid]=c
cal['_ageChildQ']=qf(kids['Věk'],(.05,.25,.5,.75,.95)); cal['_kidShare']=round(len(kids)/ev['Věk'].notna().sum(),3)
# RV čas na místě podle N
mn=d[(d.scene>0)&(d.scene<240)&(d['RV']=='Ano')&(d['Typ vozidla (auto/vrtulník)']=='pozemní')]
cal['_rvSceneQ']={n:qf(mn[mn['Naléhavost']==n].scene,(.1,.5,.9)) for n in ('N1','N2','N3')}
json.dump(cal,open('cal.json','w'),ensure_ascii=False,indent=0)
for k,v in cal.items(): print(k,json.dumps(v,ensure_ascii=False))
