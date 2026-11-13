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
# service worker + version.json (PWA: offline a aktualizace)
import hashlib, json as _json
pre = ['./index.html', './manifest.webmanifest', './lib/maplibre-gl-csp.js', './lib/maplibre-gl-csp-worker.js', './graph.wasm', './addr.json',
       './poi.json', './tiles-index.json', './t/low.wasm', './t/glyphs.wasm', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png']
pre = [p for p in pre if os.path.exists('site/' + p[2:])]
h = hashlib.sha256()
for p in pre: h.update(open('site/' + p[2:], 'rb').read())
build = h.hexdigest()[:10]
sw = rd('src/sw.js').replace('__VERSION__', ver).replace('__BUILD__', build).replace('__PRECACHE__', _json.dumps(pre)).replace("'zos-tiles-v1'", "'zos-tiles-" + hashlib.sha256(open('site/tiles-index.json', 'rb').read()).hexdigest()[:8] + "'")
open('site/sw.js', 'w', encoding='utf8').write(sw)
_json.dump({'version': ver, 'build': build}, open('site/version.json', 'w'))
print('site/sw.js', ver, build)
