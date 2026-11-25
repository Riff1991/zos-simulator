"""Scénář režimu calltaker v prohlížeči (Playwright): atrapa WebRTC a falešné API OpenAI, bez skutečného hlasu.
Spuštění: python -m http.server -d site 8766 & python tests/ct_browser.py   (ZOS_URL, SHOTS = složka pro snímky)
Zvonění → zvednutí → AML kruh → klik na mapu → pavouk → formulář → odeslání → bot → ukončení → výsledek. Bez chyb v konzoli."""
import os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('ZOS_URL', 'http://localhost:8766/index.html')
SHOTS = os.environ.get('SHOTS', '')
args = ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream']
fails = []

def check(cond, msg):
    print(('OK   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

STUB = """
(() => {
  navigator.mediaDevices.getUserMedia = async () => { const c = new AudioContext(); return c.createMediaStreamDestination().stream; };
  window.RTCPeerConnection = class { constructor() { this.iceGatheringState = 'complete'; this.localDescription = { sdp: 'x' }; this.l = {}; }
    addEventListener() {} removeEventListener() {} addTrack() {} close() {}
    createDataChannel() { const me = this; this.dc = { readyState: 'open', addEventListener(t, f) { me.l[t] = f; }, send() {}, close() {} }; return this.dc; }
    async createOffer() { return { type: 'offer', sdp: 'x' }; } async setLocalDescription() {}
    async setRemoteDescription() { setTimeout(() => { const m = this.l.message; if (!m) return; m({ data: JSON.stringify({ type: 'session.started', session: { id: 's' } }) });
      m({ data: JSON.stringify({ type: 'session.input_transcript.delta', delta: 'Zdravotnická záchranná služba, co se stalo?' }) }); m({ data: JSON.stringify({ type: 'session.output_transcript.delta', delta: 'Prosím vás, pošlete sanitku!' }) }); }, 200); } };
  const of = window.fetch; window.fetch = (u, o) => /api\\.openai\\.com\\/v1\\/live\\/sessions/.test(String(u)) ? Promise.resolve(new Response(JSON.stringify({ transport: { sdp: 'a' } }), { status: 200, headers: { 'content-type': 'application/json' } })) : of(u, o);
})();
"""

def run(p, w, h, tag):
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts' not in m.text else None)
    pg.add_init_script(STUB)
    pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(3500)
    shot = lambda n: SHOTS and pg.screenshot(path=os.path.join(SHOTS, f'{tag}-{n}.png'))
    check(pg.query_selector('[data-act=ct-menu]') is not None, f'{tag}: menu úvodní obrazovky má volbu Calltaker')
    pg.click('[data-act=ct-menu]'); pg.wait_for_timeout(300); shot('menu')
    pg.fill('#ctm-key', 'sk-test'); pg.check('input[name=ctm-flow][value=training]'); pg.fill('#ctm-gapMin', '1'); pg.uncheck('#ctm-rec')
    pg.click('[data-act=ct-start]'); pg.wait_for_timeout(1500)
    check(pg.evaluate("document.body.classList.contains('ct-mode')"), f'{tag}: režim calltaker zapnut')
    vis = lambda sel: pg.evaluate("(s)=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'}", sel)
    if w >= 1100:
        check(vis('#w-intake') and vis('#w-map') and not vis('#w-cases') and not vis('#w-crews') and not vis('#w-detail'), f'{tag}: okna Nabírání a Mapa, bez dispečerských oken')
    if w < 1100:
        pg.click('#nav [data-view=spider]'); pg.wait_for_timeout(400)
        check(pg.query_selector('#ct-spider .sp-tile') is not None, f'{tag}: pavouk jde otevřít i před prvním hovorem (dlaždice)')
        pg.click('#nav [data-view=intake]')
    else:
        pg.evaluate("document.querySelector('[data-act=ct-spider-open]').click()"); pg.wait_for_timeout(400)
        check(pg.query_selector('#ct-spider .sp-tile') is not None and pg.evaluate("getComputedStyle(document.getElementById('w-spider')).display") != 'none', f'{tag}: pavouk jde otevřít tlačítkem i před prvním hovorem')
        pg.evaluate("document.querySelector('[data-act=ct-spider-close]').click()")
    for i in range(60):
        pg.evaluate('window.__zos.step(30)')
        if pg.evaluate("window.__zos.sim.s.calls.some(c=>c.state==='ringing')"): break
    pg.evaluate("(()=>{const c=window.__zos.sim.s.calls.find(x=>x.state==='ringing');if(c){c.kind='vyjezd';c.scn=null;}})()")
    pg.wait_for_timeout(500)
    check(pg.query_selector('[data-act=ct-pickup]') is not None, f'{tag}: telefon zvoní, tlačítko Zvednout'); shot('ring')
    if w < 1100: pg.click('#nav [data-view=intake]')
    pg.click('[data-act=ct-pickup]'); pg.wait_for_timeout(1200)
    pg.evaluate("window.__zos.sim.s.liveCalls.gap = 100000; window.__zos.sim.s.ev.nextSpawn = window.__zos.sim.s.t + 100000")
    check('V hovoru' in pg.inner_text('#ct-phone'), f'{tag}: v hovoru')
    check('spojen' in pg.inner_text('#ct-phone'), f'{tag}: hlasové spojení (atrapa) hlásí spojeno')
    check('pošlete sanitku' in pg.evaluate("document.getElementById('ct-tr').textContent"), f'{tag}: přepis hovoru se plní')
    pg.evaluate('window.__zos.step(1)'); pg.wait_for_timeout(400)
    aml1 = pg.evaluate("document.getElementById('ct-aml').textContent"); f = pg.evaluate('(()=>{const s=window.__zos.sim,c=s.s.calls.find(x=>x.state==="taken");return s.callFacts(c.seed).aml})()')
    check(('Buňka' in aml1) if f['typ'] == 'mobil' else ('poloha' in aml1), f'{tag}: AML po zvednutí ({f["typ"]}): ' + aml1[:70])
    pg.evaluate('window.__zos.step(45)'); pg.wait_for_timeout(500)
    aml2 = pg.evaluate("document.getElementById('ct-aml').textContent")
    check(len(f['phases']) < 2 or 'AML' in aml2, f'{tag}: zpřesnění AML přišlo: ' + aml2[:60])
    if f['typ'] == 'mobil':
        n = pg.evaluate("(window.__zosMap&&window.__zosMap.getSource('ct-circles')._data.features||[]).length")
        check(n >= 1, f'{tag}: kruhy AML na mapě ({n})')
        pg.click('[data-act=ct-use-aml]'); pg.wait_for_timeout(300)
        check(pg.input_value('#ctf-adresa') != '' and 'střed AML' in pg.evaluate("document.getElementById('ct-ptinfo').textContent"), f'{tag}: Použít střed AML nastaví bod a předvyplní adresu: ' + pg.input_value('#ctf-adresa'))
    if w < 1100: pg.click('#nav [data-view=map]'); pg.wait_for_timeout(700)
    box = pg.evaluate("(()=>{const r=document.querySelector('#w-map canvas.maplibregl-canvas').getBoundingClientRect();return [r.left+70,r.top+r.height/2+20]})()")
    pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(500)
    pinfo = pg.evaluate("document.getElementById('ct-ptinfo').textContent")
    check('bod z mapy' in pinfo, f'{tag}: klik na mapu vybere bod: ' + pinfo[:90])
    shot('map')
    if w < 1100: pg.click('#nav [data-view=intake]')
    pg.click('[data-act=ct-n1]'); pg.wait_for_timeout(500)
    info = pg.evaluate("document.getElementById('ct-sendinfo').textContent")
    check('Předpoplach odeslán' in info, f'{tag}: N1 okamžitě odešle případ jen z polohy: ' + info[:60])
    check(pg.evaluate("(()=>{const c=window.__zos.sim.s.cases.find(x=>x.call);return !!c&&c.n===1&&c.call.predpoplach})()"), f'{tag}: případ vznikl jako N1 předpoplach')
    pg.click('[data-act=ct-spider-open]'); pg.wait_for_timeout(400); shot('spider')
    steps = 0
    while steps < 30 and pg.query_selector('#ct-spider .sp-tile:not(.alt)') is not None and pg.query_selector('[data-act=ct-sp-use]') is None:
        pg.click('#ct-spider .sp-tile:not(.alt)'); steps += 1
        if steps >= 4 and pg.query_selector('[data-act=ct-sp-done]'): pg.click('[data-act=ct-sp-done]'); steps += 1
    check(pg.query_selector('[data-act=ct-sp-use]') is not None, f'{tag}: pavouk došel na výsledek po {steps} klicích'); shot('spider-result')
    pg.click('[data-act=ct-sp-use]'); pg.wait_for_timeout(300)
    if w < 1100: pg.click('#nav [data-view=intake]')
    check('N' in pg.evaluate("document.getElementById('ct-cls').textContent"), f'{tag}: klasifikace z pavouka v nabírání: ' + pg.evaluate("document.getElementById('ct-cls').textContent")[:60])
    pg.fill('#ctf-vJmeno', 'Jan'); pg.fill('#ctf-vPrijmeni', 'Novák'); pg.fill('#ctf-pVek', '72'); pg.fill('#ctf-popis', 'Pád ze schodů'); pg.fill('#ctf-upresneni', '2. patro')
    shot('form')
    pg.click('[data-act=ct-send]'); pg.wait_for_timeout(500)
    check('aktualizován' in pg.evaluate("document.getElementById('ct-sendinfo').textContent"), f'{tag}: po předpoplachu jde případ doplnit a aktualizovat: ' + pg.evaluate("document.getElementById('ct-sendinfo').textContent")[:60])
    pg.evaluate('window.__zos.step(240)'); pg.wait_for_timeout(300)
    c = pg.evaluate("(()=>{const c=window.__zos.sim.s.cases.find(x=>x.call);return c?{n:c.call.typedN,asg:c.asg.length,form:!!c.call.form.vJmeno,chk:!!c.call.check}:null})()")
    check(c and c['asg'] > 0 and c['form'] and c['chk'], f'{tag}: bot vyslal posádku, engine má formulář a kontrolu: {c}')
    pg.click('[data-act=ct-tanr]'); pg.wait_for_timeout(400)
    check('TANR běží' in pg.inner_text('#ct-phone'), f'{tag}: předání do TANR (hlas zavřen)')
    for i in range(60):
        pg.evaluate('window.__zos.step(60)'); pg.wait_for_timeout(120)
        if pg.query_selector('[data-act=ct-finish]') is not None: break
    check(pg.evaluate("document.querySelectorAll('.live-alert').length===0 && document.getElementById('alerts-live').innerHTML===''"), f'{tag}: v režimu calltaker nejsou červené lišty')
    check(pg.query_selector('[data-act=ct-finish]') is not None and 'Hovor ukončen' in pg.inner_text('#ct-phone'), f'{tag}: TANR skončil příjezdem posádky, hovor předán')
    pg.click('[data-act=ct-tab][data-t=mine]'); pg.wait_for_timeout(1100)
    txt = pg.evaluate("document.getElementById('ct-pane-mine').textContent")
    check('vyslána' in txt or 'na místě' in txt, f'{tag}: Moje případy ukazují stav z bota'); shot('mine')
    pg.click('[data-act=ct-tab][data-t=intake]')
    check('Hovor ukončen' in pg.inner_text('#ct-phone') and pg.query_selector('[data-act=ct-finish]') is not None, f'{tag}: po ukončení zůstává nabírání (dovyplnění)')
    pg.fill('#ctf-poznamka', 'doplněno po hovoru'); pg.click('[data-act=ct-send]'); pg.wait_for_timeout(300)
    check('aktualizován' in pg.evaluate("document.getElementById('ct-sendinfo').textContent"), f'{tag}: případ jde po zavěšení aktualizovat')
    check('doplněno po hovoru' in pg.evaluate("window.__zos.sim.s.cases.find(x=>x.call).poznamka"), f'{tag}: doplněná poznámka je u dispečera')
    pg.click('[data-act=ct-finish]'); pg.wait_for_timeout(500)
    if os.environ.get('DEBUG'): print('ERRS', errs, pg.evaluate("document.getElementById('ct-phone').innerText"))
    check(pg.query_selector('#modal.on') is None and pg.query_selector('[data-act=ct-rozbor]') is not None, f'{tag}: po dokončení se rozbor neukazuje sám, jen tlačítko Rozbor hovoru')
    pg.click('[data-act=ct-rozbor]'); pg.wait_for_timeout(500)
    check('Kontrola klasifikace' in pg.evaluate("document.getElementById('modal').textContent") and 'Body za hovor' in pg.evaluate("document.getElementById('modal').textContent") and pg.query_selector('#modal svg.ct-mini') is not None, f'{tag}: rozbor na vyžádání: kontrola, body, mini mapa'); shot('result')
    check('oudce' not in pg.evaluate("document.body.innerText"), f'{tag}: v rozhraní není slovo soudce')
    pg.click('#modal [data-act=close]'); pg.wait_for_timeout(300)
    pg.click('[data-act=ct-prehled]'); pg.wait_for_timeout(300)
    check('Přehled směny' in pg.evaluate("document.getElementById('modal').textContent"), f'{tag}: přehled směny na vyžádání'); pg.click('#modal [data-act=close]')
    check(not errs, f'{tag}: bez chyb v konzoli ' + '; '.join(errs)[:400])
    b.close()

def run_manual(p):
    # bot vypnutý a dispečerská okna zapnutá: případy se obsluhují ručně
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(3500)
    pg.click('[data-act=ct-menu]'); pg.uncheck('#ctm-bot'); pg.check('#ctm-disp'); pg.click('[data-act=ct-start]'); pg.wait_for_timeout(1500)
    vis = lambda sel: pg.evaluate("(s)=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'}", sel)
    check(vis('#w-cases') and vis('#w-crews') and vis('#w-intake') and vis('#w-map'), 'ručně: dispečerská okna jsou zapnutá')
    check(pg.evaluate('window.__zos.sim.s.liveCalls.bot') is False, 'ručně: bot dispečer je vypnutý')
    pg.screenshot(path=os.path.join(SHOTS, 'rucne.png')) if SHOTS else None
    check(not errs, 'ručně: bez chyb ' + '; '.join(errs)[:200]); b.close()

GEM_STUB = """
(() => {
  navigator.mediaDevices.getUserMedia = async () => { const c = new AudioContext(); return c.createMediaStreamDestination().stream; };
  // OpenAI odmítne klíč → hovor se má spojit přes zálohu Gemini
  const of = window.fetch; window.fetch = (u, o) => /api\\.openai\\.com\\/v1\\/live\\/sessions/.test(String(u)) ? Promise.resolve(new Response(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), { status: 401, headers: { 'content-type': 'application/json' } })) : of(u, o);
  const G = window.__gem = { setups: [], urls: [], audio: 0, socks: [] }, RealWS = window.WebSocket;
  const pcm = () => { const a = new Int16Array(4800); for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 8) * 8000; let s = ''; const u = new Uint8Array(a.buffer); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  window.WebSocket = class {
    constructor(u) { if (!/generativelanguage/.test(u)) return new RealWS(u); this.readyState = 0; G.urls.push(u); G.socks.push(this); setTimeout(() => { this.readyState = 1; if (this.onopen) this.onopen(); }, 30); }
    _rx(o) { if (this.readyState === 1 && this.onmessage) this.onmessage({ data: new TextEncoder().encode(JSON.stringify(o)).buffer }); }
    send(d) {
      const m = JSON.parse(d);
      if (m.setup) { G.setups.push(m.setup); this._rx({ setupComplete: {} }); if (!m.setup.sessionResumption.handle) setTimeout(() => {
        this._rx({ serverContent: { inputTranscription: { text: 'Záchranka, co se stalo?' } } });
        this._rx({ serverContent: { outputTranscription: { text: 'Prosím vás, pošlete sanitku!' }, modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: pcm() } }] } } });
        this._rx({ sessionResumptionUpdate: { resumable: true, newHandle: 'h1' } });
      }, 150); }
      else if (m.realtimeInput && m.realtimeInput.audio) G.audio++;
    }
    close(code) { if (this.readyState === 3) return; this.readyState = 3; setTimeout(() => { if (this.onclose) this.onclose({ code: code || 1000, reason: '' }); }, 0); }
  };
  window.WebSocket.OPEN = 1;
})();
"""

def run_gemini(p):
    # OpenAI nejde (401) → záloha Gemini Live (atrapa WebSocketu): spojení, přepis, zvuk z mikrofonu, obnova spojení po goAway, zavěšení
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts' not in m.text else None)
    pg.add_init_script(GEM_STUB)
    pg.goto(URL, wait_until='domcontentloaded'); pg.wait_for_timeout(3500)
    pg.click('[data-act=ct-menu]'); pg.wait_for_timeout(300)
    pg.fill('#ctm-key', 'sk-test'); pg.fill('#ctm-gkey', 'AIzaTest'); pg.check('input[name=ctm-flow][value=training]'); pg.fill('#ctm-gapMin', '1'); pg.uncheck('#ctm-rec')
    pg.click('[data-act=ct-start]'); pg.wait_for_timeout(1500)
    for i in range(60):
        pg.evaluate('window.__zos.step(30)')
        if pg.evaluate("window.__zos.sim.s.calls.some(c=>c.state==='ringing')"): break
    pg.evaluate("(()=>{const c=window.__zos.sim.s.calls.find(x=>x.state==='ringing');if(c){c.kind='vyjezd';c.scn=null;}})()")
    pg.wait_for_timeout(500); pg.click('[data-act=ct-pickup]'); pg.wait_for_timeout(1800)
    pg.evaluate("window.__zos.sim.s.liveCalls.gap = 100000; window.__zos.sim.s.ev.nextSpawn = window.__zos.sim.s.t + 100000")
    ph = pg.inner_text('#ct-phone'); g = pg.evaluate('window.__gem')
    check('(Gemini)' in ph, 'gemini: po odmítnutí OpenAI spojeno přes Gemini: ' + ph[:120].replace('\n', ' '))
    check(len(g['setups']) == 1 and g['setups'][0]['model'] == 'models/gemini-3.8-live' and 'AIzaTest' in g['urls'][0], 'gemini: setup s modelem a klíčem')
    vn = g['setups'][0]['generationConfig']['speechConfig']['voiceConfig']['prebuiltVoiceConfig']['voiceName'] if g['setups'] else ''
    check(vn in ('Kore', 'Charon', 'Leda', 'Puck', 'Gacrux', 'Algenib'), 'gemini: hlas podle volajícího: ' + vn)
    check('pošlete sanitku' in pg.evaluate("document.getElementById('ct-tr').textContent"), 'gemini: přepis volajícího se plní')
    check(g['audio'] > 5, f"gemini: mikrofon se posílá jako PCM ({g['audio']} bloků)")
    pg.evaluate("window.__gem.socks[0]._rx({ goAway: { timeLeft: '10s' } })"); pg.wait_for_timeout(600)
    g = pg.evaluate('window.__gem')
    check(len(g['setups']) == 2 and g['setups'][1]['sessionResumption'].get('handle') == 'h1', 'gemini: po goAway nové spojení s obnovou relace')
    check(pg.evaluate('window.__gem.socks[0].readyState') == 3 and pg.evaluate('window.__gem.socks[1].readyState') == 1, 'gemini: staré spojení zavřeno, nové otevřené')
    check('přerušilo' not in pg.inner_text('#ct-phone'), 'gemini: obnova spojení hovor nepřeruší')
    a0 = g['audio']; pg.wait_for_timeout(400)
    check(pg.evaluate('window.__gem.audio') > a0, 'gemini: mikrofon jde dál novým spojením')
    pg.click('[data-act=ct-hangup]'); pg.wait_for_timeout(800)
    check(pg.evaluate('window.__gem.socks.every(s=>s.readyState===3)'), 'gemini: po zavěšení jsou spojení zavřená')
    check(not errs, 'gemini: bez chyb v konzoli ' + '; '.join(errs)[:400])
    b.close()

with sync_playwright() as p:
    if os.environ.get('ONLY') == 'gemini': run_gemini(p)
    else: run(p, 1440, 900, 'desktop'); run(p, 390, 800, 'mobil'); run_manual(p); run_gemini(p)
print('SELHALO: ' + str(len(fails)) if fails else 'ct_browser OK'); sys.exit(1 if fails else 0)
