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
        else:
            pg.click('[data-view=map]'); pg.wait_for_timeout(500)
            check(pg.evaluate("document.getElementById('mapwrap').clientHeight") > 200, 'mobil: mapa má výšku')
        check(not errs, f'{w}px: žádné JS chyby {errs[:3]}')
        pg.close()
    b.close()
sys.exit(1 if fails else 0)
