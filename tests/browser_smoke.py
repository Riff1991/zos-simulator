"""Kouřový test v reálném prohlížeči (Playwright + Chrome).

Spuštění: python3 -m http.server -d site 8765 & python3 tests/browser_smoke.py
Proměnné: ZOS_URL (výchozí http://localhost:8765/index.html), CHROME (cesta k Chrome, nepovinné).
Ověřuje: žádné JS chyby, klik na kartu výzvy přesune mapu (desktop i mobil),
mapu lze táhnout a zoomovat kolečkem. Unit testy v tests/test.js tyto chyby nezachytí.
"""
import os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('ZOS_URL', 'http://localhost:8765/index.html')
args = ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
fails = []

def check(cond, msg):
    print(('OK   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    kw = {'args': args}
    if os.environ.get('CHROME'): kw['executable_path'] = os.environ['CHROME']
    b = p.chromium.launch(**kw)
    for w, h in [(1440, 900), (390, 800)]:
        pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(3000)
        pg.click('[data-act=newshift]'); pg.click('[data-act=start]'); pg.evaluate('window.__zos.step(900)'); pg.wait_for_timeout(1500)
        check(pg.evaluate('!!window.__zosMap'), f'{w}px: MapLibre mapa existuje')
        ids = [e.get_attribute('data-case') for e in pg.query_selector_all('article.case-card')][:3]
        check(len(ids) > 0, f'{w}px: v seznamu jsou výzvy')
        for cid in ids:
            pg.locator(f'article.case-card[data-case="{cid}"]').first.click(); pg.wait_for_timeout(900)
            if w < 1100 and not pg.is_visible('#mapwrap'):
                pg.click('[data-view=map]'); pg.wait_for_timeout(700)
            tgt = pg.evaluate(f"(()=>{{const c=window.__zos.sim.caseOf('{cid}');return [c.lon,c.lat]}})()")
            cen = pg.evaluate('window.__zosMap.getCenter().toArray()')
            check(abs(tgt[0] - cen[0]) < 0.01 and abs(tgt[1] - cen[1]) < 0.01, f'{w}px: klik na {cid} přesune mapu')
            if w < 1100: pg.click('[data-view=cases]'); pg.wait_for_timeout(300)
        if w >= 1100:
            box = pg.query_selector('#mapwrap').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            before = pg.evaluate('window.__zosMap.getCenter().toArray()')
            pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 120, cy + 60, steps=10); pg.mouse.up(); pg.wait_for_timeout(500)
            check(before != pg.evaluate('window.__zosMap.getCenter().toArray()'), 'mapu lze táhnout myší')
            z0 = pg.evaluate('window.__zosMap.getZoom()'); pg.mouse.wheel(0, -400); pg.wait_for_timeout(800)
            check(pg.evaluate('window.__zosMap.getZoom()') > z0, 'kolečko myši zoomuje')
            # rozložení panelů: dělicí lišty, odepnutí do plovoucího okna, předvolby, samostatně pro MU
            check(pg.evaluate("document.querySelector('main').classList.contains('lay')"), 'rozložení: engine běží')
            nspl = pg.evaluate("document.querySelectorAll('.split').length"); check(nspl >= 4, f'rozložení: dělicí lišty ({nspl})')
            cw0 = pg.evaluate("document.querySelector('#w-cases').getBoundingClientRect().width")
            sb = pg.query_selector('.split.v').bounding_box(); sx, sy = sb['x'] + sb['width'] / 2, sb['y'] + 200
            pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.move(sx - 160, sy, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
            cw1 = pg.evaluate("document.querySelector('#w-cases').getBoundingClientRect().width")
            check(cw0 - cw1 > 100, f'rozložení: tažením lišty se zúžil seznam ({cw0:.0f} -> {cw1:.0f} px)')
            check(pg.evaluate("!!JSON.parse(localStorage.getItem('zos_layout_v2') || '{}').normal"), 'rozložení: uloženo pro běžný provoz')
            pg.click('#w-detail .pin-btn'); pg.wait_for_timeout(300)
            check(pg.evaluate("(() => { const e = document.querySelector('#w-detail'); return e.classList.contains('floating') && getComputedStyle(e).position === 'fixed'; })()"), 'rozložení: panel případu odepnut do plovoucího okna')
            hb = pg.query_selector('#w-detail > h2').bounding_box(); pg.mouse.move(hb['x'] + 40, hb['y'] + 8); pg.mouse.down(); pg.mouse.move(hb['x'] + 140, hb['y'] + 90, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            nb = pg.query_selector('#w-detail > h2').bounding_box(); check(abs(nb['x'] - hb['x'] - 100) < 8 and abs(nb['y'] - hb['y'] - 82) < 8, 'rozložení: plovoucí okno jde přesunout za záhlaví')
            pg.click('#w-detail .pin-btn'); pg.wait_for_timeout(300)
            check(pg.evaluate("!document.querySelector('#w-detail').classList.contains('floating')"), 'rozložení: panel připnut zpět')
            pg.click('[data-act=layout-menu]'); pg.click('[data-act=layout-preset][data-preset=widemap]'); pg.wait_for_timeout(400)
            mw = pg.evaluate("document.querySelector('#w-map').getBoundingClientRect().width"); crw = pg.evaluate("document.querySelector('#w-crews').getBoundingClientRect().width")
            check(mw > crw * 1.6, f'rozložení: předvolba Široká mapa (mapa {mw:.0f} px, posádky {crw:.0f} px)')
            pg.click('[data-act=layout-menu]'); pg.click('[data-act=layout-preset][data-preset=default]'); pg.wait_for_timeout(300)
            cols_n = pg.evaluate("document.querySelector('main').style.gridTemplateColumns")
            # režim dispečera MU: po přepnutí role se přeskládá obrazovka (panel MU vlevo na výšku) a po ukončení zpět
            pg.evaluate("(() => { const z = window.__zos, sim = z.sim; sim.s.ev.nextMU = null; const c = sim.spawnScriptedMU({ type: 'dn-retez', direct: true }); sim.s.muPlayerRole = 'mu'; z.step(60); })()"); pg.wait_for_timeout(2500)
            check(pg.evaluate("document.body.classList.contains('mu-mode')"), 'MU: zapnul se režim dispečera MU')
            dh = pg.evaluate("document.querySelector('#w-detail').getBoundingClientRect().height"); ch = pg.evaluate("document.querySelector('#w-cases').getBoundingClientRect().height")
            check(dh > 450 and dh > ch * 1.8, f'MU: panel MU je vlevo vysoký ({dh:.0f} px proti seznamu {ch:.0f} px)')
            check(pg.evaluate("!!document.querySelector('#detail .mu-panel')"), 'MU: v detailu je panel MU')
            cols_m = pg.evaluate("document.querySelector('main').style.gridTemplateColumns"); check(cols_m != cols_n, 'rozložení: režim MU má vlastní rozložení sloupců')
            pg.evaluate("window.__zos.sim.s.muPlayerRole = 'normal'"); pg.wait_for_timeout(2500)
            check(not pg.evaluate("document.body.classList.contains('mu-mode')"), 'MU: po přepnutí na běžný provoz se layout vrátí')
        else:
            pg.click('[data-view=map]'); pg.wait_for_timeout(500)
            check(pg.evaluate("document.getElementById('mapwrap').clientHeight") > 200, 'mobil: mapa má výšku')
        check(not errs, f'{w}px: žádné JS chyby {errs[:3]}')
        pg.close()
    b.close()
sys.exit(1 if fails else 0)
