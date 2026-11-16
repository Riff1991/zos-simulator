import json, re
J=json.load(open('placemodel.json',encoding='utf8')); M=J['model']
BAD=re.compile(r'hvízdal|poznpac|jazyk cs|okál|bobelov|emausy|albert|aurora|g centrum|spolí|podolí|^test$|ukrajin|\brzp\b|za posádkou|koroner|naproti|dojezd za|pravý břeh|základně zzs|voláno posádkou|zrušeno volajícím|více info|jiné info|^ldt$',re.I)
out={}
for c,m in M.items():
    o={'pat':[[p,v] for p,v in m['pat']],'O':m['O'],'F':m['F']}
    S=[]
    for k,v in m['S']:
        if BAD.search(k): continue
        tag='P' if re.search(r'pčr|policie|měp|oo pčr|služebn',k,re.I) else 'G'
        S.append([k,v,tag])
    o['S']=S
    X=[]
    for k,v,by,loc in m['X']:
        if BAD.search(k): continue
        X.append([k,v,by,loc])
    o['X']=X
    out[c]=o
# globální pool klinických X (N) pro třídy s málo daty
glob={}
for c in ('rd','jine','byt','bod'):
    for k,v,by,loc in out[c]['X']:
        g=glob.setdefault(k,[k,0,{},loc]); g[1]+=v
        for i,n in by.items(): g[2][i]=g[2].get(i,0)+n
out['_glob']={'X':sorted(glob.values(),key=lambda x:-x[1])[:140]}
J2={'model':out,'floors':J['floors'],'sep':J['sep']}
def js(o):
    if isinstance(o,dict): return '{'+','.join(('%s:%s'%(k if re.match(r'^[A-Za-z_][A-Za-z_0-9]*$',str(k)) else json.dumps(k,ensure_ascii=False), js(v))) for k,v in o.items())+'}'
    if isinstance(o,list): return '['+','.join(js(x) for x in o)+']'
    if isinstance(o,float): return '%g'%o
    return json.dumps(o,ensure_ascii=False)
open('placemodel.js','w',encoding='utf8').write(js(J2))
import os; print('velikost:',os.path.getsize('placemodel.js'),'B')
print('S pool rd:',[x[0] for x in out['rd']['S']],' jine:',[x[0] for x in out['jine']['S']])
print('glob X počet',len(out['_glob']['X']))
