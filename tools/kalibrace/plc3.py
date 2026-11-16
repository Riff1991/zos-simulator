import pandas as pd, re, collections, json, pickle
d=pd.read_pickle('all2.pkl'); ev=d[d['Výjezd první posádky u události']=='Ano'].copy().reset_index(drop=True)
ev['tl']=ev['Poznámka ZOS'].astype(str).apply(lambda t:t.split('#nazev:',1)[1].strip() if '#nazev:' in t else '')
indl={i.lower() for i in set(ev['Indikace ZOS'].dropna())|set(ev['Indikace'].dropna())}
OBJw=r'(?:rd|rodinný dům|rodinny dum|bod|bytovka|bytový dům|byt|dd|dps|ds|chalupa|chata|ubytovna|řadovka|statek|dvojdomek|penzion|zš|škola|kemp|hotel|dům|dum|domek|panelák|panelak|novostavba|panel)'
FLOORw=r'(?:\d+\s?\.?\s?(?:p|patro)\.?|přízemí|přízemi|příz\.?|prizemi|zv\.? ?přízemí|zvýšené přízemí|suterén)'
O=re.compile(r'^'+OBJw+r'$',re.I); F=re.compile(r'^'+FLOORw+r'$',re.I); OF=re.compile(r'^('+OBJw+r')\s+('+FLOORw+')$',re.I)
SVC=re.compile(r'pčr|hzs|policie|hasič|rzp|\brv\b|libero|koroner|naproti|vstříc|měp|\bhs\b|proti|za posádkou|na místě',re.I)
LOC=re.compile(r'domem|ulic|zahrad|dvor|dvoř|venku|zastávk|nádraží|budov|vchod|vrátnic|recepc|pokoj|byt č|dveří|restaurac|hospod|stadion|hřišt|kemp|tábor|ubytovn|azylov|domov|lázn|chatov|heliport|poliklinik|autě|panel|novostavb|vozíčk|dole|čeká|počká|mávat|dojde|čekají|čekat',re.I)
BAD=re.compile(r'emausy|albert|aurora|g centrum|spolí|podolí|^test$|ukrajin|^#$|^\.$|heliport|^iphone|dr\.|mudr|ing\.|\bpan\b|\bpaní\b',re.I)
SEP=re.compile(r'(\s*[,/;]\s*)')
def parse(t):
    parts=SEP.split(t); segs=[parts[i].strip() for i in range(0,len(parts),2)]; seps=[parts[i] for i in range(1,len(parts),2)]
    return segs,seps
def kind(s):
    if O.match(s): return 'O'
    if F.match(s): return 'F'
    if OF.match(s): return 'OF'
    if s.lower() in indl: return 'I'
    if SVC.search(s): return 'S'
    return 'X'
def cls(ch,segs,kinds):
    if ch=='Tísňová výzva ve zdrav. zařízení': return 'zz'
    if ch=='Tísňová výzva v terénu': return 'bod'
    first=' '.join(s for s,k in zip(segs,kinds) if k in('O','OF'))[:30].lower()
    if re.search(r'^(rd|rodinn|dům|dum|domek|řadovka|dvojdomek|statek|novostavba|chalupa)',first): return 'rd'
    if re.search(r'^(dd|dps|ds)\b',first): return 'domov'
    if re.search(r'^(ubytovna|penzion|hotel|kemp|chata)',first): return 'ubyt'
    if re.search(r'^(bytovka|bod|byt|panel)',first) or 'F' in kinds or 'OF' in kinds: return 'byt'
    return 'jine'
norm=lambda s:re.sub(r'\d+','#',s)
C=collections.defaultdict(lambda:{'pat':collections.Counter(),'O':collections.Counter(),'F':collections.Counter(),'S':collections.Counter(),'X':collections.Counter(),'Xi':collections.defaultdict(collections.Counter),'n':0})
sep1=collections.Counter(); floors=collections.Counter()
for _,r in ev.iterrows():
    segs,seps=parse(r['tl']); segs=[s for s in segs if s]
    if not segs: continue
    kinds=[kind(s) for s in segs]; c=cls(r['Charakter ZOS'],segs,kinds); m=C[c]; m['n']+=1
    # OF rozložit na O + F
    sk=[]; 
    for s,k in zip(segs,kinds):
        if k=='OF':
            mm=OF.match(s); sk+= [(mm.group(1),'O'),(mm.group(2),'F')]
        else: sk.append((s,k))
    # vzor jako posloupnost druhů (OF = O F slité do 'OF' jen pokud byly v jednom segmentu)
    pat=tuple(('OF' if k=='OF' else k) for k in kinds[:5]); m['pat'][pat]+=1
    for s,k in sk:
        if k=='O': m['O'][s]+=1
        elif k=='F':
            m['F'][norm(s)]+=1
            for g in re.findall(r'\d+',s): floors[int(g)]+=1
        elif k=='S': m['S'][norm(s)]+=1
        elif k=='X': m['X'][norm(s)]+=1; m['Xi'][norm(s)][r['Indikace ZOS']]+=1
    if len(seps)>=1: sep1[seps[0]]+=1
model={}
tot=0
for c,m in C.items():
    pats=[(' '.join(p),v) for p,v in m['pat'].most_common(30) if v>=6]
    # privacy: jen povrchové tvary s četností >= 4
    O_=[(k,v) for k,v in m['O'].most_common(40) if v>=4]
    F_=[(k,v) for k,v in m['F'].most_common(40) if v>=4]
    S_=[(k,v) for k,v in m['S'].most_common(60) if v>=4 and not BAD.search(k)]
    X_=[]
    for k,v in m['X'].most_common(400):
        if v<4 or BAD.search(k) or len(k)>40: continue
        by={ind:cnt for ind,cnt in m['Xi'][k].items() if cnt>=2}
        X_.append([k,v,by,'L' if LOC.search(k) else 'N'])
    model[c]={'n':m['n'],'pat':pats,'O':O_,'F':F_,'S':S_,'X':X_[:90]}
    print(c,m['n'],'vzorů',len(pats),'O',len(O_),'F',len(F_),'S',len(S_),'X',len(model[c]['X']))
fl=sum(floors.values()); fd={k:round(v/fl,3) for k,v in sorted(floors.items()) if k<=12}
sc=sum(sep1.values()); sp=[(k,round(v/sc,3)) for k,v in sep1.most_common(8)]
print('\npatra:',fd); print('první oddělovač:',sp)
json.dump({'model':model,'floors':fd,'sep':sp},open('placemodel.json','w'),ensure_ascii=False)
import os; print('velikost JSON:',os.path.getsize('placemodel.json'),'B')
