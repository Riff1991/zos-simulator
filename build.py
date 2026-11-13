# Sestaví site/index.html ze src/ (vše inline kromě MapLibre a datových souborů v site/).
import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(p, encoding='utf8').read()
strip = lambda s: re.sub(r'\nif \(typeof module.*?\n', '\n', s)
d = strip(rd('src/data.js')) + strip(rd('src/people.js'))
symptoms = 'const ZOS_SYMPTOMS = ' + rd('src/symptoms.json').strip() + ';\n'
e = strip(rd('src/engine.js'))
m = strip(rd('src/basemap.js') + rd('src/router.js') + 'const GLMASK=' + rd('src/mask.geojson') + ';\n')
u = rd('src/ui.js')
t = rd('src/template.html')
ver = open('VERSION', encoding='utf8').read().strip() if os.path.exists('VERSION') else 'dev'
t = t.replace('ZOS JčK · DISPEČER', 'ZOS JčK · DISPEČER · v' + ver, 1)
t = t.replace('/*DATA*/', d).replace('/*SYMPTOMS*/', symptoms).replace('/*BASEMAP*/', m).replace('/*ENGINE*/', e).replace('/*UI*/', u)
open('site/index.html', 'w', encoding='utf8').write(t)
print('site/index.html', len(t))
