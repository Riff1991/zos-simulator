// UI – Režim calltaker: telefon, okno Nabírání (+ Moje případy), Pavouk, AML a výběr místa na mapě, výsledek hovoru (části se v build.py skládají do jedné IIFE).
// Hlas je v src/live-voice.js (ZOS_LIVE), pavouk v calltaker/spider.js (CT_SPIDER), engine v src/sim-calltaker.js (za s.liveCalls).
const CTS_KEY = 'zos_ct_settings_v1';
const CTS_DEF = { key: '', remember: true, textModel: '', vModel: 'gpt-live-1', vF: 'marin', vM: 'cedar', mode: 'voice', filt: true, rec: true, flow: 'realistic', gapMin: 3, fast: 5, bot: true, disp: false, crewsOnMap: false };
let cts = Object.assign({}, CTS_DEF);
try { cts = Object.assign(cts, JSON.parse(localStorage.getItem(CTS_KEY) || '{}')); } catch (_) {}
const ctSaveSettings = () => { try { localStorage.setItem(CTS_KEY, JSON.stringify(cts.remember ? cts : Object.assign({}, cts, { key: '' }))); } catch (_) {} };
const CT_STLAB = { base: 'Na základně', free: 'Volný', call: 'Výzva', enroute: 'Výjezd', onscene: 'Na místě', transport: 'Transport', handover: 'U ZZ', off: 'Nepřihlášena', activating: 'Aktivace', second: 'Sekundár', attached: 'Ve voze RZP' };
let ct = { was: false, call: null, facts: {}, tab: 'intake', ringId: null, ringCtx: null, ringT: null, voice: null, vstatus: '', vbad: false, muted: false, transcript: [], curRole: null, curEl: null, pt: null, addrAuto: false, cls: null, sp: { ans: [], n: null, dyn: null }, amlN: 0, hash: '', mapHash: '', built: false, lastCases: 0, spider: null, msgs: [], busy: false, wav: null, spiderOpen: false, phoneKey: '', layersSaved: null };

function ctModeOn() { return !!(sim && sim.s && sim.s.liveCalls); }
function ctSpeed(sp) { return sp > 0 && (ct.call || (sim && sim.s.calls.some(c => c.state === 'ringing'))) ? 1 : sp; }
function ctNavItems() { return [['intake', 'Nabírání'], ['map', 'Mapa'], ['spider', 'Pavouk']].concat(cts.disp ? [['cases', 'Případy'], ['detail', 'Případ'], ['crews', 'Posádky']] : []); }
const ctSpiderInst = () => ct.spider || (ct.spider = CT_SPIDER.create({ symptoms: ZOS_SYMPTOMS, indications: ZOS_DATA.indications }));
const ctFmtM = m => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m');
const ctMMSS = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const ctVal = id => { const e = $(id); return e ? e.value.trim() : ''; };
const ctSet = (id, v) => { const e = $(id); if (e) e.value = v == null ? '' : v; };

// ---------- vstup do režimu, nabídka, nastavení ----------
function ctMenu() {
  const c = cts, rb = (k, v, l) => `<label style="display:inline-flex;gap:4px;margin-right:12px;align-items:center"><input type="radio" name="ctm-${k}" value="${v}"${String(c[k]) === String(v) ? ' checked' : ''} style="width:auto"> ${l}</label>`;
  const cb = (k, l) => `<label style="display:flex;gap:6px;align-items:center;margin:3px 0"><input type="checkbox" id="ctm-${k}"${c[k] ? ' checked' : ''} style="width:auto"> ${l}</label>`;
  modal(`<div class="card home ct-form ct-card" style="max-width:600px"><h2 style="margin:0">☎ Calltaker – příjem hovorů</h2>
    <p class="ct-note">Ty jsi calltaker: zazvoní telefon, zvedneš ho a vyslechneš AI volajícího (hlas OpenAI GPT-Live). Vidíš polohu z AML, vybereš místo na mapě, klasifikuješ pavoukem a odešleš případ dispečerovi (zatím bot). Osoby, adresy a telefony jsou generované.</p>
    <fieldset><legend>Hovory</legend>
      <div>${rb('flow', 'realistic', 'Realistický tok (zvoní asi čtvrtina hovorů)')}${rb('flow', 'training', 'Trénink (jen moje hovory)')}</div>
      <div class="ct-g" style="margin-top:6px"><label>Interval mezi hovory v tréninku (min)<input id="ctm-gapMin" type="number" min="1" max="30" value="${c.gapMin}"></label>
      <label>Rychlost mezi hovory<select id="ctm-fast">${[1, 5, 10, 20].map(v => `<option value="${v}"${Number(c.fast) === v ? ' selected' : ''}>${v}×</option>`).join('')}</select></label></div>
      ${cb('bot', 'Bot dispečer vysílá posádky (vypni, chceš-li případy obsluhovat ručně)')}${cb('disp', 'Zobrazit dispečerská okna (případy, posádky, rádio)')}${cb('crewsOnMap', 'Posádky a případy na mapě')}</fieldset>
    <fieldset><legend>Hlas a AI (OpenAI)</legend>
      <label style="font-size:11px;color:var(--mut)">API klíč OpenAI (platform.openai.com → API keys; není to předplatné ChatGPT). Zůstává jen v tomto prohlížeči.<input id="ctm-key" type="password" autocomplete="off" placeholder="sk-…" value="${esc(c.key)}"></label>
      ${cb('remember', 'zapamatovat klíč v tomto prohlížeči (jen na svém zařízení)')}
      <div>${rb('mode', 'voice', 'Hlas (mikrofon + sluchátka)')}${rb('mode', 'text', 'Jen text')}</div>
      <div class="ct-g"><label>Hlasový model<input id="ctm-vModel" value="${esc(c.vModel)}"></label><label>Hlas: volající žena<input id="ctm-vF" value="${esc(c.vF)}"></label><label>Hlas: volající muž<input id="ctm-vM" value="${esc(c.vM)}"></label>
      <label>Textový model (soudce, textový režim)<input id="ctm-textModel" list="ctm-models" value="${esc(c.textModel)}"><datalist id="ctm-models"></datalist></label></div>
      <button class="btn" data-act="ct-models">Načíst modely</button> <span id="ctm-status" class="ct-note"></span>
      ${cb('filt', 'telefonní filtr a šum linky přes hlas (volající ve sluchátkách; v nahrávce oba hlasy)')}${cb('rec', 'nahrávat hovor (WAV ke stažení po hovoru)')}</fieldset>
    <div class="foot"><button class="btn" data-act="home">‹ Zpět</button><button class="btn pri" data-act="ct-start">▶ Spustit směnu calltakera</button></div></div>`);
}
function ctReadMenu() {
  const g = k => document.querySelector(`input[name=ctm-${k}]:checked`);
  for (const k of ['flow', 'mode']) if (g(k)) cts[k] = g(k).value;
  for (const k of ['bot', 'disp', 'crewsOnMap', 'remember', 'filt', 'rec']) if ($('ctm-' + k)) cts[k] = $('ctm-' + k).checked;
  for (const k of ['key', 'vModel', 'vF', 'vM', 'textModel']) if ($('ctm-' + k)) cts[k] = ctVal('ctm-' + k);
  cts.gapMin = Math.max(1, Number(ctVal('ctm-gapMin')) || 3); cts.fast = Number(ctVal('ctm-fast')) || 5;
  ctSaveSettings();
}
async function ctLoadModels() {
  ctReadMenu(); const st = $('ctm-status');
  if (!cts.key) { st.textContent = 'Nejdřív vlož API klíč.'; return; }
  st.textContent = 'Načítám modely…';
  try { const r = await ZOS_LIVE.models(cts.key); $('ctm-models').innerHTML = r.ids.map(i => `<option value="${esc(i)}">`).join(''); if (!ctVal('ctm-textModel')) ctSet('ctm-textModel', r.best); st.textContent = 'Modelů: ' + r.ids.length + (r.best ? '. Vybrán ' + r.best + '.' : '.'); } catch (e) { st.textContent = 'Klíč nebo síť: ' + e.message; }
}
function ctStart() {
  ctReadMenu();
  if (!window.ZOS_ADDR || !ROUTER.ready) { toast('Mapová data se ještě načítají, zkus to za chvíli.', 'warn'); return; }
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { /* zvuk není nutný */ }
  const seed = (Math.random() * 1e9) | 0, now = new Date();
  sim = new Sim({ date: now.toISOString().slice(0, 10), weather: null, mode: 'free', startHour: now.getHours(), seed, radio: 'auto', secondaryEnabled: false, muEnabled: false });
  sim.enableLiveCalls({ mode: cts.flow, gapSec: cts.gapMin * 60, bot: cts.bot });
  applyVoice(); afterLoad(); speed = Number(cts.fast); savedSpeed = speed; ctReset(); view = 'intake';
  closeModal(); toast('Směna calltakera začala. Čekej na zazvonění telefonu.', '');
}
function ctReset() {
  if (ct.voice) { try { ct.voice.stop(); } catch (e) { /* ignore */ } }
  ctStopRing();
  ct = Object.assign(ct, { was: false, call: null, facts: {}, tab: 'intake', ringId: null, voice: null, transcript: [], pt: null, cls: null, sp: { ans: [], n: null, dyn: null }, amlN: 0, hash: '', mapHash: '', built: false, phoneKey: '', msgs: [], wav: null });
  const b = $('ct-body'); if (b) b.innerHTML = '';
  document.body.classList.add('ct-spider-off');
}
function ctAfterLoad() { ctReset(); if (ctModeOn()) { for (const c of sim.s.calls) if (c.state === 'taken') c.state = 'done'; view = 'intake'; } }
// třídy na body, rozložení a vrstvy mapy podle režimu
function ctSync() {
  const on = ctModeOn(), cl = document.body.classList;
  cl.toggle('ct-mode', on); cl.toggle('ct-disp', on && !!cts.disp);
  if (on !== ct.was) {
    ct.was = on;
    if (on) { if (!['intake', 'map', 'spider', 'cases', 'detail', 'crews'].includes(view)) view = 'intake'; ct.layersSaved = { crews: layers.crews, cases: layers.cases }; }
    else if (ct.layersSaved) { layers.crews = ct.layersSaved.crews; layers.cases = ct.layersSaved.cases; ct.layersSaved = null; }
    layoutApply(true); if (GL) setTimeout(() => GL.resize(), 60);
  }
  if (on) {
    const want = !!(cts.crewsOnMap || cts.disp);
    if (layers.crews !== want || layers.cases !== want) { layers.crews = want; layers.cases = want; if (typeof renderToolsOnce === 'function') renderToolsOnce(); glApplyLayers(); }
  }
}

// ---------- zvonění ----------
function ctRingOnce() {
  const ctx = ct.ringCtx; if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const off of [0, 0.6]) for (const f of [425, 480]) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t0 + off); g.gain.linearRampToValueAtTime(0.07, t0 + off + 0.02); g.gain.setValueAtTime(0.07, t0 + off + 0.4); g.gain.linearRampToValueAtTime(0, t0 + off + 0.45);
    o.start(t0 + off); o.stop(t0 + off + 0.5);
  }
}
function ctStartRing() {
  ctStopRing();
  try { ct.ringCtx = ct.ringCtx || new (window.AudioContext || window.webkitAudioContext)(); ct.ringCtx.resume(); } catch (e) { return; }
  if (settings.sound !== false) { ctRingOnce(); ct.ringT = setInterval(ctRingOnce, 3000); }
}
function ctStopRing() { if (ct.ringT) { clearInterval(ct.ringT); ct.ringT = null; } }

// ---------- okno Nabírání: jednou postavený formulář ----------
function ctBuild() {
  if (ct.built) return; ct.built = true;
  const f = (id, l, ph, extra) => `<label>${l}<input id="${id}" autocomplete="off" placeholder="${ph || ''}"${extra || ''}></label>`;
  $('ct-tabs').innerHTML = '<button data-act="ct-tab" data-t="intake" class="on">Nabírání</button><button data-act="ct-tab" data-t="mine">Moje případy</button>';
  const kl = [...new Set(D.indications.map(x => x.klasif))].sort();
  $('ct-body').innerHTML = `<div id="ct-pane-intake" class="ct-form"><div id="ct-idle" class="ct-note" style="padding:10px">Čekáš na hovor. Telefon zazvoní sám; čas mezi hovory běží zrychleně.</div>
    <div id="ct-formwrap" hidden>
    <div id="ct-aml"></div>
    <fieldset><legend>Volající</legend><div class="ct-g">${f('ctf-vJmeno', 'Jméno')}${f('ctf-vPrijmeni', 'Příjmení')}${f('ctf-vTel', 'Telefon (ANI)')}${f('ctf-vVztah', 'Vztah k pacientovi', 'např. manžel, soused')}</div></fieldset>
    <fieldset><legend>Pacient</legend><div class="ct-g">${f('ctf-pJmeno', 'Jméno')}${f('ctf-pPrijmeni', 'Příjmení')}${f('ctf-pVek', 'Věk nebo rok narození', 'např. 72 nebo 1953')}<label>Pohlaví<select id="ctf-pPohlavi"><option value="">?</option><option>muž</option><option>žena</option></select></label></div></fieldset>
    <fieldset><legend>Místo události</legend>
      <div style="display:flex;gap:6px"><input id="ctf-adresa" autocomplete="off" placeholder="Ulice č., obec (nebo klikni do mapy)"><button class="btn" data-act="ct-find" style="margin:0;white-space:nowrap">Najít na mapě</button></div>
      <div class="ct-g" style="margin-top:6px">${f('ctf-cast', 'Část obce')}${f('ctf-upresneni', 'Upřesnění (patro, vchod, označení)')}</div>
      <div id="ct-ptinfo" class="ct-note" style="margin-top:4px">Poloha zatím nezadána.</div></fieldset>
    <fieldset><legend>Událost</legend><label style="display:flex;flex-direction:column;font-size:11px;color:var(--mut);gap:2px">Popis události<textarea id="ctf-popis" rows="2" placeholder="Co se stalo (vlastními slovy volajícího)"></textarea></label>
      <label style="display:flex;flex-direction:column;font-size:11px;color:var(--mut);gap:2px;margin-top:6px">Poznámka pro dispečera<textarea id="ctf-poznamka" rows="2"></textarea></label></fieldset>
    <fieldset><legend>Klasifikace z pavouka</legend><div id="ct-cls" class="ct-cls"></div><div style="margin-top:6px"><button class="btn" data-act="ct-spider-open" style="margin:0">Otevřít pavouka</button></div></fieldset>
    <div class="ct-send"><button class="btn pri" id="ct-sendbtn" data-act="ct-send">Odeslat dispečerovi</button><span id="ct-sendinfo" class="ct-note"></span></div>
    <details id="ct-trwrap"><summary class="ct-note">Přepis hovoru</summary><div id="ct-tr" class="ct-tr"></div><div id="ct-textrow" style="display:none;gap:6px"><input id="ct-say" placeholder="Co řekneš volajícímu…"><button class="btn" data-act="ct-say" style="margin:0">Poslat</button></div></details>
    </div></div><div id="ct-pane-mine" hidden style="padding:6px 8px"></div>`;
  void kl;
}
function ctPhoneHtml() {
  const s = sim.s, rg = s.calls.find(c => c.state === 'ringing'), call = ct.call;
  const btnMenu = '<button class="btn" data-act="ct-home" title="Nabídka" style="margin:0 0 0 auto">☰</button>';
  if (call) {
    const v = ct.facts[call.id] ? ct.facts[call.id].view.volajici : null, el = s.t - call.pickedAt, vs = ct.vstatus ? ` · <span style="color:${ct.vbad ? '#ff9b94' : '#9fd9b0'}">${esc(ct.vstatus)}</span>` : '';
    return { cls: 'call', html: `<div class="ph-st">V hovoru ${ctMMSS(el)}<small>${v ? esc(ctPhoneShown()) + ' · ' + esc(v.linka) : ''}${vs}</small></div>${ct.voice ? `<button class="btn" data-act="ct-mute">${ct.muted ? 'Zapnout mikrofon' : 'Ztlumit mikrofon'}</button>` : ''}<button class="btn red" data-act="ct-hangup">Ukončit hovor</button>${btnMenu}` };
  }
  if (rg) { const f = ct.facts[rg.id]; return { cls: 'ring', html: `<div class="ph-st">☎ ZVONÍ ${Math.max(0, Math.round(sim.s.liveCalls.ring - (s.t - rg.ringAt)))} s<small>${f ? esc(ctPhoneShown(f)) + ' · ' + esc(f.view.volajici.linka) : ''}</small></div><button class="btn pri" data-act="ct-pickup">☎ Zvednout</button>${btnMenu}` }; }
  const missed = s.calls.filter(c => c.state === 'missed').length;
  return { cls: '', html: `<div class="ph-st">Čekáš na hovor<small>${missed ? 'zmeškáno: ' + missed + ' · ' : ''}${sim.clock()} · ${s.liveCalls.mode === 'training' ? 'trénink' : 'realistický tok'}${s.liveCalls.bot ? '' : ' · bot dispečer vypnut'}</small></div><button class="btn" data-act="ct-disp-toggle">${cts.disp ? 'Skrýt dispečerská okna' : 'Dispečerská okna'}</button>${btnMenu}` };
}
function ctPhoneShown(f) { f = f || ct.facts[ct.call.id]; return f.aml && f.aml.typ === 'skryté' ? 'číslo skryto' : f.view.volajici.telefon; }

// ---------- hlavní kreslení (volá render() ~10× za sekundu; jen lehké změny) ----------
function ctRender() {
  if (!ctModeOn()) return;
  ctBuild();
  const s = sim.s, rg = s.calls.find(c => c.state === 'ringing');
  if (rg && ct.ringId !== rg.id) { ct.ringId = rg.id; ct.facts[rg.id] = sim.callFacts(rg.seed); ctStartRing(); toast('☎ Zvoní telefon', 'warn'); }
  else if (!rg && ct.ringId) { ctStopRing(); ct.ringId = null; }
  const ph = ctPhoneHtml(), pe = $('ct-phone'), key = ph.cls + ph.html;
  if (key !== ct.phoneKey) { ct.phoneKey = key; pe.className = ph.cls; pe.innerHTML = ph.html; }
  const inCall = !!ct.call;
  $('ct-idle').hidden = inCall; $('ct-formwrap').hidden = !inCall;
  if (inCall) ctAmlTick();
  ctMapSync();
  if (ct.tab === 'mine' && performance.now() - ct.lastCases > 900) { ct.lastCases = performance.now(); ctCasesHtml(); }
}
function ctCrewEta(k) { return k.until != null && ['call', 'enroute'].includes(k.state) ? ' ~' + Math.max(0, Math.round((k.until - sim.s.t) / 60)) + ' min' : ''; }
function ctStage(c) { return c.status === 'closed' ? 'uzavřeno' : c.arrived ? 'na místě' : c.asg && c.asg.length ? 'vyslána posádka' : 'čeká na vyslání'; }
function ctCasesHtml() {
  const s = sim.s, mine = s.cases.filter(c => c.call).slice().reverse();
  const yn = v => (v === true ? '✔' : v === false ? '✘' : '–');
  let h = mine.length ? '<table class="ct-t"><tr><th>Případ</th><th>Zadání</th><th>Stav</th><th>Posádky</th></tr>' + mine.map(c => {
    const cr = (c.crews || []).map(id => s.crews.find(k => k.id === id)).filter(Boolean).map(k => esc(k.name) + ': ' + (CT_STLAB[k.state] || k.state) + ctCrewEta(k)).join('<br>') || '–';
    const ck = c.call.check, det = c.status === 'closed' && ck ? `<br><small>Kontrola: klasifikace ${yn(ck.klasif.ok)}, N ${yn(ck.n.ok)} (zadáno ${ck.n.typed}, správně ${ck.n.truth}), příznaky ${Math.round(ck.priznaky.jaccard * 100)} %, poloha ${ck.bodM} m od pravdy</small>` : '';
    return `<tr><td>${esc(c.num)}<br><small>${sim.clockAt(c.createdAt)}</small></td><td>${esc(c.addr)}<br><small>N${c.n} · ${esc(c.klasif)}${c.call.miss ? ' · <b>poloha nesedí</b>' : c.call.searchDelay ? ' · poloha vedle' : ''}</small>${det}</td><td>${ctStage(c)}</td><td>${cr}</td></tr>`;
  }).join('') + '</table>' : '<p class="ct-note">Zatím žádný tvůj případ.</p>';
  const other = s.cases.filter(c => !c.call && c.status !== 'closed').length;
  if (other) h += `<p class="ct-note">Případy od kolegů právě v řešení: ${other}</p>`;
  $('ct-pane-mine').innerHTML = h;
}

// ---------- AML ----------
function ctAmlPhases() {
  const f = ct.call && ct.facts[ct.call.id]; if (!f) return [];
  const el = sim.s.t - ct.call.pickedAt;
  return f.aml.phases.filter(p => p.atSec <= el);
}
const ctAmlLabel = p => (p.zdroj === 'buňka' ? 'Buňka' : 'AML ' + p.zdroj) + ' ±' + ctFmtM(p.radiusM);
function ctAmlTick() {
  const f = ct.facts[ct.call.id], ph = ctAmlPhases(), box = $('ct-aml');
  if (ph.length > ct.amlN) {
    const p = ph[ph.length - 1]; ct.amlN = ph.length;
    toast(p.zdroj === 'buňka' ? 'Poloha z buňky: ±' + ctFmtM(p.radiusM) : 'Přišlo zpřesnění: ' + ctAmlLabel(p), '');
    ctFitCircle(p);
  }
  const last = ph[ph.length - 1];
  const html = f.aml.typ !== 'mobil' ? `<div class="ct-aml">${f.aml.typ === 'pevná' ? 'Pevná linka – poloha z telefonu není k dispozici (zjisti adresu od volajícího).' : 'Číslo je skryto – poloha z telefonu není k dispozici.'}</div>`
    : !last ? '<div class="ct-aml">Zjišťuji polohu telefonu…</div>'
      : `<div class="ct-aml${last.zdroj !== 'buňka' && last.radiusM <= 150 ? ' g' : ''}"><b>${esc(ctAmlLabel(last))}</b>${ph.length > 1 ? ' · zpřesněno (starší kruh šedě)' : last.zdroj === 'buňka' && f.aml.phases.length > 1 ? ' · čeká se na zpřesnění z telefonu' : ' · zpřesnění z telefonu nedorazilo'}<br><button class="btn" data-act="ct-use-aml" style="margin:4px 0 0">Použít střed AML</button> <span class="ct-note">Poloha z telefonu může být nepřesná – ověř ji s volajícím.</span></div>`;
  if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
}
function ctCircle(lat, lon, rM, n) {
  const co = [], dl = rM / 111320, dn = rM / (111320 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= (n || 48); i++) { const a = i / (n || 48) * 2 * Math.PI; co.push([lon + dn * Math.sin(a), lat + dl * Math.cos(a)]); }
  return co;
}
function ctFitCircle(p) {
  if (!GL || !glReady) return;
  const dl = p.radiusM / 111320, dn = p.radiusM / (111320 * Math.cos(p.lat * Math.PI / 180));
  try { GL.fitBounds([[p.lon - dn, p.lat - dl], [p.lon + dn, p.lat + dl]], { padding: 50, maxZoom: 17.5, duration: 700 }); } catch (e) { /* ignore */ }
}
function ctUseAml() {
  const ph = ctAmlPhases(), p = ph[ph.length - 1]; if (!p) return;
  ctSetPoint(p.lat, p.lon, 'AML');
}

// ---------- mapa: výběr bodu, kruhy ----------
function ctGlInit() {
  const empty = { type: 'FeatureCollection', features: [] };
  for (const s of ['ct-circles', 'ct-labels', 'ct-pt']) GL.addSource(s, { type: 'geojson', data: empty });
  GL.addLayer({ id: 'ct-fill', type: 'fill', source: 'ct-circles', paint: { 'fill-color': ['get', 'col'], 'fill-opacity': ['get', 'op'] } });
  GL.addLayer({ id: 'ct-line', type: 'line', source: 'ct-circles', paint: { 'line-color': ['get', 'col'], 'line-width': 2, 'line-opacity': ['get', 'lop'] } });
  GL.addLayer({ id: 'ct-lab', type: 'symbol', source: 'ct-labels', layout: { 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-anchor': 'top', 'text-offset': [0, 0.6] }, paint: { 'text-color': ['get', 'col'], 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
  GL.addLayer({ id: 'ct-pt', type: 'circle', source: 'ct-pt', paint: { 'circle-radius': 9, 'circle-color': '#2f7de1', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
  GL.addLayer({ id: 'ct-pt-l', type: 'symbol', source: 'ct-pt', layout: { 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': true }, paint: { 'text-color': '#143e75', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
}
function ctMapSync() {
  if (!GL || !glReady || !GL.getSource('ct-circles')) return;
  const ph = ct.call ? ctAmlPhases() : [], pt = ct.call ? ct.pt : null, h = JSON.stringify([ph.length, pt && [pt.lat, pt.lon, pt.src]]);
  if (h === ct.mapHash) return; ct.mapHash = h;
  const feats = [], labs = [];
  ph.forEach((p, i) => {
    const cur = i === ph.length - 1, col = !cur ? '#7d8791' : p.zdroj === 'buňka' ? '#d9342b' : p.radiusM <= 40 ? '#1c8a45' : '#e08a10';
    feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ctCircle(p.lat, p.lon, p.radiusM)] }, properties: { col, op: cur ? 0.14 : 0.04, lop: cur ? 1 : 0.6 } });
    if (cur) labs.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { lab: ctAmlLabel(p), col } });
  });
  GL.getSource('ct-circles').setData({ type: 'FeatureCollection', features: feats });
  GL.getSource('ct-labels').setData({ type: 'FeatureCollection', features: labs });
  GL.getSource('ct-pt').setData({ type: 'FeatureCollection', features: pt ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] }, properties: { lab: pt.src === 'AML' ? 'střed AML' : pt.src === 'adresa' ? 'adresa' : 'vybraný bod' } }] : [] });
}
// nejbližší adresní bod z ZOS_ADDR do 100 m, jinak „okolí obce X“
function ctAddrAt(lat, lon) {
  const A = window.ZOS_ADDR; if (!A) return { text: '', dM: Infinity, near: false };
  const a = A.a, S = A.s, k = Math.cos(lat * Math.PI / 180); let best = -1, bd = Infinity;
  for (let i = 0; i < a.length; i += 8) { const dy = (a[i] / 1e5 - lat), dx = (a[i + 1] / 1e5 - lon) * k, d = dy * dy + dx * dx; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return { text: '', dM: Infinity, near: false };
  const dM = Math.sqrt(bd) * 111320, city = S[a[best + 3]], st = S[a[best + 2]], num = S[a[best + 4]];
  if (dM <= 100) return { text: (st && st !== city ? st + ' ' + num : 'čp. ' + num) + ', ' + city, dM, near: true };
  return { text: 'okolí obce ' + city, dM, near: false };
}
function ctSetPoint(lat, lon, src, noFocus) {
  ct.pt = { lat, lon, src }; ct.mapHash = '';
  if (src !== 'adresa') {
    const r = ctAddrAt(lat, lon);
    if (r.text && (src !== 'AML' || !ctVal('ctf-adresa') || ct.addrAuto)) { ctSet('ctf-adresa', r.text); ct.addrAuto = true; }
    ct.ptInfo = r.near ? `Nejbližší adresní bod ${Math.round(r.dM)} m.` : `Adresní bod do 100 m nenalezen (nejbližší ${r.dM > 5000 ? '>5 km' : ctFmtM(r.dM)}).`;
  } else ct.ptInfo = 'Poloha podle adresy (kontroluje se podle textu).';
  ctPtInfo(); ctMapSync();
  if (!noFocus && GL && glReady && src === 'adresa') GL.easeTo({ center: [lon, lat], zoom: Math.max(GL.getZoom(), 16), duration: 600 });
}
function ctPtInfo() {
  const e = $('ct-ptinfo'); if (!e) return;
  const p = ct.pt, nm = { mapa: 'bod z mapy', AML: 'střed AML', adresa: 'adresa' };
  e.innerHTML = p ? `Zdroj polohy: <b>${nm[p.src]}</b> · ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}<br>${esc(ct.ptInfo || '')}` : 'Poloha zatím nezadána. Klikni do mapy nebo napiš adresu a stiskni „Najít na mapě“.';
}
function ctMapClick(e) {
  if (!ctModeOn() || !ct.call) return false;
  ctSetPoint(e.lngLat.lat, e.lngLat.lng, 'mapa', true); return true;
}
function ctFind() {
  const t = ctVal('ctf-adresa'); if (!t) return;
  ct.addrAuto = false;
  const g = sim._ctGeocode(t);
  if (!g.quality) { ct.ptInfo = 'Adresu se nepodařilo najít v databázi adres.'; ct.pt = null; ctPtInfo(); toast('Adresu se nepodařilo najít.', 'warn'); return; }
  ctSetPoint(g.lat, g.lon, 'adresa');
  ct.ptInfo = ({ exact: 'Adresa nalezena přesně.', street: 'Nalezena jen ulice (střed), upřesni číslo.', town: 'Nalezena jen obec (střed), upřesni adresu.' })[g.quality]; ctPtInfo();
}

// ---------- hovor: zvednutí, hlas, ukončení ----------
function ctFormReset(f) {
  for (const id of ['vJmeno', 'vPrijmeni', 'vTel', 'vVztah', 'pJmeno', 'pPrijmeni', 'pVek', 'adresa', 'cast', 'upresneni', 'popis', 'poznamka']) ctSet('ctf-' + id, '');
  ctSet('ctf-pPohlavi', ''); ctSet('ctf-vTel', f.aml.typ === 'skryté' ? '' : f.view.volajici.telefon);
  ct.pt = null; ct.cls = null; ct.sp = { ans: [], n: null, dyn: null }; ct.addrAuto = false; ct.ptInfo = ''; ct.amlN = 0; ct.mapHash = '';
  $('ct-sendbtn').textContent = 'Odeslat dispečerovi'; $('ct-sendinfo').textContent = ''; $('ct-tr').innerHTML = ''; ct.transcript = []; ct.curRole = null;
  ctPtInfo(); ctClsHtml(); ctSpiderRender();
}
function ctPickup() {
  const rg = sim.s.calls.find(c => c.state === 'ringing'); if (!rg || ct.call) return;
  const facts = ct.facts[rg.id] || sim.callFacts(rg.seed);
  if (!sim.pickupCall(rg.id)) return;
  ctStopRing(); ct.ringId = null; ct.facts[rg.id] = facts; ct.call = rg; ct.vstatus = ''; ct.vbad = false; ct.muted = false; ct.wav = null; ct.msgs = [];
  ctBuild(); ctFormReset(facts); ct.tab = 'intake'; ctTab('intake');
  document.body.classList.remove('ct-spider-off'); layoutApply(true);
  if (view !== 'intake' && !layoutDesktop()) view = 'intake';
  ctVoiceStart(facts);
  render();
}
const ctFemale = v => /á$/.test(String(v.volajici.jmeno).trim().split(/\s+/).pop());
async function ctVoiceStart(facts) {
  const P = window.CT_PROMPTS, v = facts.view, tr = $('ct-textrow');
  tr.style.display = cts.mode === 'text' ? 'flex' : 'none'; $('ct-trwrap').open = cts.mode === 'text';
  if (!cts.key) { ct.vstatus = 'bez klíče OpenAI – hovor bez hlasu (nastavení v menu Calltaker)'; ct.vbad = true; return; }
  if (cts.mode === 'text') { ct.vstatus = 'textový režim'; ctTrAdd('sys', 'Hovor spojen. Pozdrav a nabírej (píšeš do pole níže).'); return; }
  const call = ct.call, h = await ZOS_LIVE.connect({
    key: cts.key, model: cts.vModel, voice: (ctFemale(v) ? cts.vF : cts.vM) || 'marin', instructions: P.callerSystem(v, true), filter: cts.filt, record: cts.rec,
    onStatus: (t, bad) => { if (ct.call === call) { ct.vstatus = t; ct.vbad = !!bad; } },
    onReady: () => { if (ct.call === call) { ct.vstatus = '● spojeno'; ct.vbad = false; } },
    onTranscript: (role, d) => { if (ct.call === call) ctTrDelta(role, d); },
    onLost: () => { if (ct.call === call) { ct.vstatus = 'spojení se přerušilo'; ct.vbad = true; } },
  });
  if (ct.call === call) ct.voice = h; else if (h) h.stop();
}
function ctTrAdd(who, text) { const d = document.createElement('div'); d.className = who; d.textContent = text; $('ct-tr').appendChild(d); d.scrollIntoView({ block: 'end' }); return d; }
function ctTrDelta(role, text) {
  if (ct.curRole !== role) { ct.curRole = role; ct.curTr = { role, text: '' }; ct.transcript.push(ct.curTr); ct.curEl = ctTrAdd(role === 'calltaker' ? 'me' : 'them', ''); }
  ct.curTr.text += text; ct.curEl.textContent = ct.curTr.text;
}
async function ctSay() {
  const inp = $('ct-say'), t = inp.value.trim(); if (!t || ct.busy || !ct.call) return;
  const facts = ct.facts[ct.call.id]; inp.value = ''; ctTrAdd('me', t); ct.transcript.push({ role: 'calltaker', text: t }); ct.msgs.push({ role: 'user', content: t }); ct.busy = true;
  try {
    const rep = await ZOS_LIVE.chat(cts.key, cts.textModel, window.CT_PROMPTS.callerSystem(facts.view), ct.msgs);
    ct.msgs.push({ role: 'assistant', content: rep });
    const end = /\[KONEC\]/.test(rep), shown = rep.replace(/\[KONEC\]/g, '').trim();
    ct.transcript.push({ role: 'volajici', text: shown }); ctTrAdd('them', shown);
    if (end) { ct.busy = false; ctHangup(); return; }
  } catch (e) { ct.vstatus = 'Chyba API: ' + e.message; ct.vbad = true; ct.msgs.pop(); ct.transcript.pop(); }
  ct.busy = false;
}
function ctMute() { if (ct.voice) { ct.muted = !ct.voice.mute(); ct.phoneKey = ''; } }
async function ctHangup() {
  const call = ct.call; if (!call) return;
  const facts = ct.facts[call.id], form = ctReadForm(), voice = ct.voice, transcript = ct.transcript.slice();
  ct.call = null; ct.voice = null; ct.phoneKey = '';
  const hc = sim.hangupCall(call.id);
  let rec = { usage: 0, wav: null };
  if (voice) { ct.vstatus = 'Ukončuji hovor…'; try { rec = await voice.close(); } catch (e) { /* ignore */ } }
  document.body.classList.add('ct-spider-off'); layoutApply(true);
  ctResultModal({ call: hc || call, facts, form, transcript, wav: rec.wav, usage: rec.usage, cls: ct.cls });
  render();
}

// ---------- formulář ↔ engine ----------
function ctReadForm() {
  const p = ct.pt, cls = ct.cls, v = ctVal('ctf-pVek'), num = Number(v);
  const zdroj = p ? p.src : ctVal('ctf-adresa') ? 'adresa' : '';
  return {
    adresa: ctVal('ctf-adresa'), bod: p && p.src !== 'adresa' ? { lat: p.lat, lon: p.lon } : null, zdroj, cast: ctVal('ctf-cast'), upresneni: ctVal('ctf-upresneni'),
    vJmeno: ctVal('ctf-vJmeno'), vPrijmeni: ctVal('ctf-vPrijmeni'), vTelefon: ctVal('ctf-vTel'), vVztah: ctVal('ctf-vVztah'),
    pJmeno: ctVal('ctf-pJmeno'), pPrijmeni: ctVal('ctf-pPrijmeni'), pPohlavi: ctVal('ctf-pPohlavi'), pRok: num > 1900 ? num : '', pVek: v && num <= 130 ? num : '',
    klasif: cls ? cls.klasif : '', priznaky: cls ? cls.priznaky.slice() : [], n: cls ? String(cls.n) : '', dyn: cls ? cls.dyn : null, popis: ctVal('ctf-popis'), poznamka: ctVal('ctf-poznamka'),
  };
}
function ctSend() {
  const call = ct.call; if (!call) return;
  const form = ctReadForm(), info = $('ct-sendinfo');
  if (!form.adresa && !form.bod) { info.textContent = 'Zadej místo: adresu nebo bod na mapě.'; return; }
  if (!form.n) { info.textContent = 'Nejdřív klasifikuj pavoukem (naléhavost N1–N3).'; ctSpiderOpen(); return; }
  const first = !call.caseId, c = sim.sendCall(call.id, form);
  if (!c) { info.textContent = 'Odeslání se nepodařilo.'; return; }
  $('ct-sendbtn').textContent = 'Aktualizovat případ';
  info.textContent = (first ? 'Odesláno dispečerovi (' + c.num + ')' : 'Případ aktualizován') + ' v ' + sim.clock() + (cts.bot ? '' : ' – bot je vypnutý, obsluž případ v dispečerských oknech');
  toast(first ? 'Případ ' + c.num + ' odeslán dispečerovi.' : 'Případ ' + c.num + ' aktualizován.', '');
  if (!cts.bot && !cts.disp) { cts.disp = true; ctSaveSettings(); ctSync(); layoutApply(true); }
}
function ctClsHtml() {
  const e = $('ct-cls'); if (!e) return; const c = ct.cls;
  e.innerHTML = c ? `<b>${esc(c.klasif)}</b><span class="ct-n n${c.n}">N${c.n}</span>${c.dyn ? '<span class="ct-n" style="background:#8e5bd6">dynamická indikace</span>' : ''}<span class="ct-note">${esc(c.priznaky.map(CT_SPIDER.strip).slice(0, 8).join(', '))}${c.priznaky.length > 8 ? '…' : ''}</span>` : '<span class="ct-note">Zatím neklasifikováno – otevři pavouka.</span>';
}

// ---------- pavouk (okno) ----------
function ctSpiderOpen() {
  document.body.classList.remove('ct-spider-off'); layoutApply(true);
  if (!layoutDesktop()) { view = 'spider'; }
  ctSpiderRender(); render();
}
function ctSpiderRender() {
  const e = $('ct-spider'); if (!e) return;
  const sp = ctSpiderInst(), ans = ct.sp.ans, p = sp.page(ans);
  const crumbs = ans.length ? `<div class="sp-crumbs">${ans.map((a, i) => `<span role="button" data-act="ct-sp-crumb" data-i="${i}" style="cursor:pointer">${esc(a === '__skip' ? 'nevím' : a === '__none' ? 'žádné' : CT_SPIDER.strip(a))}</span>`).join('')}</div>` : '';
  let h = crumbs;
  if (p.step === 'vysledek') {
    const r = sp.result(ans), n = ct.sp.n || r.n, dyn = ct.sp.dyn == null ? r.dyn : ct.sp.dyn, pc = x => Math.round(x * 100);
    const col = { 1: 'var(--n1)', 2: 'var(--n2)', 3: '#e8c02a' };
    h += `<div class="sp-res"><div class="big">${esc(r.klasif)} <span class="ct-n n${n}">N${n}</span>${dyn ? '<span class="ct-n" style="background:#8e5bd6">dynamická indikace</span>' : ''}</div>
      <div class="ct-note">Navrženo N${r.n} (jistota ${pc(r.confidence)} %, ${r.combos} podobných kombinací v datech)${r.apneic ? ' – bezvědomí a nedýchá = vždy N1' : ''}</div>
      <div class="sp-bar" title="Rozložení N v datech">${[1, 2, 3].map(k => `<i style="width:${pc(r.nDist[k])}%;background:${col[k]}"></i>`).join('')}</div>
      <div class="ct-note">N1 ${pc(r.nDist[1])} % · N2 ${pc(r.nDist[2])} % · N3 ${pc(r.nDist[3])} %</div>
      <div class="sp-act" style="padding-left:0">${[1, 2, 3].map(k => `<button class="btn${n === k ? ' pri' : ''}" data-act="ct-sp-n" data-n="${k}">N${k}</button>`).join('')}
      <label style="display:inline-flex;gap:5px;align-items:center;font-size:12px"><input type="checkbox" ${dyn ? 'checked' : ''} id="ct-sp-dyn" style="width:auto"> dynamická indikace (${pc(r.pDyn)} % v datech)</label></div>
      <div class="sp-sym">${r.symptoms.map(s => `<span class="${r.picked.includes(s) ? '' : 'add'}" title="${r.picked.includes(s) ? 'zvoleno' : 'doplněno z dat'}">${esc(CT_SPIDER.strip(s))}</span>`).join('')}</div></div>
      <div class="sp-act"><button class="btn pri" data-act="ct-sp-use"${ct.call ? '' : ' disabled'}>Použít do výzvy</button><button class="btn" data-act="ct-sp-back">‹ Zpět</button><button class="btn" data-act="ct-sp-reset">Znovu</button></div>${ct.call ? '' : '<p class="ct-note" style="padding:0 12px">Bez hovoru se pavouk jen zkouší.</p>'}`;
  } else {
    h += `<div class="sp-title">${esc(p.title)}${p.step === 'upresneni' ? ' <small class="ct-note">klikni na to, co volající uvádí</small>' : ''}</div><div class="sp-tiles">`;
    let g = null;
    for (const t of p.tiles) {
      if (t.group && t.group !== g) { g = t.group; h += `<div class="sp-grp">${esc(g)}</div>`; }
      h += `<button class="sp-tile" data-act="ct-sp-tile" data-id="${esc(t.id)}">${esc(t.label)}${t.hint ? `<small>${esc(t.hint)}</small>` : ''}</button>`;
    }
    if (p.canSkip) h += `<button class="sp-tile alt" data-act="ct-sp-${p.step === 'upresneni' ? 'none' : 'skip'}">${p.step === 'upresneni' ? 'Žádné z uvedených' : 'Nevím / nezjištěno'}</button>`;
    if (p.canFinish) h += '<button class="sp-tile alt" data-act="ct-sp-done">Hotovo ▸ výsledek</button>';
    h += '</div><div class="sp-act">' + (p.canBack ? '<button class="btn" data-act="ct-sp-back">‹ Zpět</button><button class="btn" data-act="ct-sp-reset">Znovu</button>' : '') + '</div>';
  }
  e.innerHTML = h;
}
function ctSpAnswer(a) { ct.sp.ans.push(a); ct.sp.n = null; ct.sp.dyn = null; ctSpiderRender(); }
function ctSpUse() {
  const r = ctSpiderInst().result(ct.sp.ans); if (!r || !ct.call) return;
  const n = ct.sp.n || r.n, dyn = ct.sp.dyn == null ? r.dyn : ct.sp.dyn;
  ct.cls = { klasif: r.klasif, n, dyn, priznaky: r.symptoms.filter(s => !/DYNAMICKÁ INDIKACE/i.test(s)).concat(dyn ? ['DYNAMICKÁ INDIKACE'] : []), nSuggested: r.n };
  ctClsHtml(); toast('Klasifikace předána do nabírání: ' + r.klasif + ', N' + n, '');
  if (layoutDesktop()) { document.body.classList.add('ct-spider-off'); layoutApply(true); } else { view = 'intake'; }
  render();
}

// ---------- výsledek hovoru ----------
function ctMiniMap(truth, typed, aml) {
  const pts = [truth].concat(typed ? [typed] : []).concat(aml ? [aml] : []), W = 420, H = 240;
  const k = Math.cos(truth.lat * Math.PI / 180);
  let la0 = Math.min(...pts.map(p => p.lat)), la1 = Math.max(...pts.map(p => p.lat)), lo0 = Math.min(...pts.map(p => p.lon)), lo1 = Math.max(...pts.map(p => p.lon));
  const spanM = Math.max((la1 - la0) * 111320, (lo1 - lo0) * 111320 * k, 160) * 1.5, c = [(la0 + la1) / 2, (lo0 + lo1) / 2], sc = Math.min(W, H) / spanM;
  const X = p => W / 2 + (p.lon - c[1]) * 111320 * k * sc, Y = p => H / 2 - (p.lat - c[0]) * 111320 * sc;
  const tolR = (typed && typed.tol ? typed.tol : 60) * sc;
  let s = `<svg class="ct-mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zadaný a skutečný bod"><rect width="${W}" height="${H}" fill="none"/>`;
  s += `<circle cx="${X(truth)}" cy="${Y(truth)}" r="${tolR}" fill="rgba(28,138,69,.15)" stroke="#1c8a45" stroke-dasharray="4 3"/>`;
  if (typed) s += `<line x1="${X(truth)}" y1="${Y(truth)}" x2="${X(typed)}" y2="${Y(typed)}" stroke="#888" stroke-dasharray="3 3"/><circle cx="${X(typed)}" cy="${Y(typed)}" r="7" fill="#2f7de1" stroke="#fff" stroke-width="2"/><text x="${X(typed) + 10}" y="${Y(typed) + 4}" font-size="12" fill="currentColor">zadáno</text>`;
  if (aml) s += `<circle cx="${X(aml)}" cy="${Y(aml)}" r="${Math.max(4, aml.radiusM * sc)}" fill="rgba(224,138,16,.12)" stroke="#e08a10"/><text x="${X(aml) + 8}" y="${Y(aml) - 6}" font-size="11" fill="#e08a10">AML</text>`;
  s += `<circle cx="${X(truth)}" cy="${Y(truth)}" r="6" fill="#d9342b" stroke="#fff" stroke-width="2"/><text x="${X(truth) + 10}" y="${Y(truth) + 4}" font-size="12" font-weight="700" fill="#d9342b">skutečně</text>`;
  s += `<text x="8" y="${H - 8}" font-size="11" fill="currentColor">měřítko: ${Math.round(100 / sc)} m = 100 px · zelený kruh = tolerance ${typed && typed.tol ? typed.tol : 60} m</text></svg>`;
  return s;
}
function ctResultModal(rec) {
  const f = rec.facts, k = f.key, c = rec.call.caseId ? sim.caseOf(rec.call.caseId) : null, ck = c && c.call && c.call.check, cc = c && c.call;
  const yn = v => (v === true ? '✔' : v === false ? '✘' : '–'), row = (l, ok, a) => `<tr><td>${l}</td><td>${ok === undefined ? '' : yn(ok)}</td><td>${a}</td></tr>`;
  let tb = '';
  if (ck) {
    tb = row('Klasifikace', ck.klasif.ok, `zadáno ${esc(ck.klasif.typed || '–')}, správně <b>${esc(ck.klasif.truth)}</b>`) + row('Naléhavost', ck.n.ok, `zadáno N${ck.n.typed}, správně <b>N${ck.n.truth}</b>`) + row('Dynamická indikace', ck.dyn.ok, `zadáno ${ck.dyn.typed == null ? '–' : ck.dyn.typed ? 'ano' : 'ne'}, správně <b>${ck.dyn.truth ? 'ano' : 'ne'}</b>`)
      + row('Příznaky', ck.priznaky.jaccard >= 0.5, `shoda ${Math.round(ck.priznaky.jaccard * 100)} % (${ck.priznaky.typed} zadáno, ${ck.priznaky.truth} skutečných)`) + row('Věk pacienta', ck.vek.ok, `zadáno ${ck.vek.typed == null ? '–' : ck.vek.typed}, správně <b>${ck.vek.truth}</b>`)
      + row('Jméno pacienta', ck.jmena.pacient, esc(k.pacient)) + row('Jméno volajícího', ck.jmena.volajici, esc(f.view.volajici.jmeno))
      + row('Poloha', cc.miss ? false : ck.bodM <= ck.tol, `${ck.bodM} m od pravdy (tolerance ${ck.tol} m), zdroj ${esc(ck.zdroj)}${ck.aml ? ', použit AML' : ''}`);
  }
  const cons = !c ? '<p class="ct-note bad">Hovor byl ukončen bez odeslání případu dispečerovi (−20 b.).</p>' : `<ul style="margin:4px 0;padding-left:18px;font-size:12.5px"><li>${cc.miss ? `<b>Poloha mimo toleranci o ${cc.errM} m: posádka jela na zadané místo, nenašla pacienta a hledala.</b>` : cc.searchDelay ? `Bod vedle o ${cc.errM} m: posádka pacienta chvíli hledala (+${cc.searchDelay} s).` : cc.unlocatable ? 'Adresu se nepodařilo najít, dispečer ji dohledával.' : 'Poloha sedí, posádka jela správně.'}</li><li>Naléhavost ${cc.typedN === cc.truthN ? 'sedí' : `zadána N${cc.typedN}, skutečně N${cc.truthN}`}${cc.conflict ? ' · adresa a bod z mapy se rozcházely, přednost měl bod' : ''}</li><li>Doplnění po odeslání: ${cc.updates}×${cc.sec != null ? ', hovor ' + cc.sec + ' s' : ''}</li></ul>`;
  const typedPt = c ? (cc.bod ? { lat: cc.bod.lat, lon: cc.bod.lon, tol: cc.tol } : (() => { const g = sim._ctGeocode(cc.typed); return g.quality ? { lat: g.lat, lon: g.lon, tol: cc.tol } : null; })()) : null;
  const ph = f.aml.phases, aml = ph.length > 1 ? ph[ph.length - 1] : null;
  window._ctRes = rec;
  modal(`<div class="card home ct-form ct-card" style="max-width:640px"><h2 style="margin:0">Hovor ukončen</h2><div class="ct-note">${esc(f.view.volajici.jmeno)} · ${esc(k.klasifikace)}, N${String(k['naléhavost']).replace('N', '')} · ${esc(k.adresa)}</div>
    ${tb ? `<h3 style="margin:6px 0 2px;font-size:13px">Kontrola klasifikace</h3><table class="ct-t">${tb}</table>` : ''}
    <h3 style="margin:8px 0 2px;font-size:13px">Následky v simulaci</h3>${cons}
    <h3 style="margin:8px 0 2px;font-size:13px">Zadaný a skutečný bod</h3>${ctMiniMap({ lat: k.lat, lon: k.lon }, typedPt, aml)}
    <div id="ct-judge" style="margin-top:8px"></div>
    <div class="foot" style="margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="ct-judge"${cts.key && cts.textModel ? '' : ' disabled title="Potřebuje klíč a textový model v menu Calltaker"'}>Vyhodnotit soudcem (AI)</button><button class="btn" data-act="ct-dl-json">Stáhnout hovor (JSON)</button>${rec.wav ? '<button class="btn" data-act="ct-dl-wav">Stáhnout nahrávku (WAV)</button>' : ''}<button class="btn pri" data-act="close">Pokračovat ve směně</button></div></div>`);
}
async function ctJudge() {
  const rec = window._ctRes, out = $('ct-judge'); if (!rec) return;
  out.innerHTML = '<p class="ct-note">Vyhodnocuji…</p>';
  const P = window.CT_PROMPTS, f = rec.facts, txt = rec.transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
  const user = 'LIST FAKTŮ:\n' + JSON.stringify(f.view, null, 1) + '\n\nKEY:\n' + JSON.stringify(f.key, null, 1) + '\n\nFORMULÁŘ OD CALLTAKERA:\n' + JSON.stringify(rec.form) + '\n\nPŘEPIS:\n' + txt;
  let s;
  try { const o = await ZOS_LIVE.chat(cts.key, cts.textModel, P.judgeSystem(), [{ role: 'user', content: user }], { response_format: { type: 'json_object' } }); const m = o.match(/\{[\s\S]*\}/); s = JSON.parse(m ? m[0] : o); } catch (e) { s = { chyba: e.message }; }
  rec.judge = s;
  const list = o => '<ul style="margin:2px 0;padding-left:18px">' + Object.keys(o).filter(x => x !== 'komentar').map(x => `<li>${esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' '))}: ${Array.isArray(o[x]) ? esc(o[x].join('; ') || '–') : o[x] === true ? '✔' : o[x] === false ? '✘' : esc(o[x])}</li>`).join('') + '</ul>';
  out.innerHTML = s.chyba ? `<p class="ct-note bad">Soudce selhal: ${esc(s.chyba)}</p>` : (s.calltaker ? `<h3 style="font-size:13px;margin:4px 0">Soudce: calltaker</h3>${list(s.calltaker)}<p class="ct-note">${esc(s.calltaker.komentar || '')}</p>` : '') + (s.realismus_volajiciho ? `<h3 style="font-size:13px;margin:4px 0">Soudce: realismus volajícího</h3>${list(s.realismus_volajiciho)}<p class="ct-note">${esc(s.realismus_volajiciho.komentar || '')}</p>` : '');
}
function ctDownload(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }

// ---------- akce ----------
function ctTab(t) {
  ct.tab = t;
  for (const b of document.querySelectorAll('#ct-tabs button')) b.classList.toggle('on', b.dataset.t === t);
  $('ct-pane-intake').hidden = t !== 'intake'; $('ct-pane-mine').hidden = t !== 'mine';
  if (t === 'mine') { ct.lastCases = 0; ctCasesHtml(); }
}
function ctAct(a, el) {
  const d = el.dataset;
  switch (a) {
    case 'ct-menu': ctMenu(); break;
    case 'ct-models': ctLoadModels(); break;
    case 'ct-start': ctStart(); break;
    case 'ct-home': homeModal(); break;
    case 'ct-pickup': ctPickup(); break;
    case 'ct-hangup': ctHangup(); break;
    case 'ct-mute': ctMute(); break;
    case 'ct-tab': ctTab(d.t); break;
    case 'ct-send': ctSend(); break;
    case 'ct-say': ctSay(); break;
    case 'ct-use-aml': ctUseAml(); break;
    case 'ct-find': ctFind(); break;
    case 'ct-spider-open': ctSpiderOpen(); break;
    case 'ct-spider-close': document.body.classList.add('ct-spider-off'); layoutApply(true); break;
    case 'ct-disp-toggle': cts.disp = !cts.disp; ctSaveSettings(); ctSync(); layoutApply(true); ct.phoneKey = ''; break;
    case 'ct-sp-tile': ctSpAnswer(d.id); break;
    case 'ct-sp-skip': ctSpAnswer('__skip'); break;
    case 'ct-sp-none': ctSpAnswer('__none'); break;
    case 'ct-sp-done': ctSpAnswer('__done'); break;
    case 'ct-sp-back': ct.sp.ans.pop(); ct.sp.n = null; ct.sp.dyn = null; ctSpiderRender(); break;
    case 'ct-sp-reset': ct.sp = { ans: [], n: null, dyn: null }; ctSpiderRender(); break;
    case 'ct-sp-crumb': ct.sp.ans = ct.sp.ans.slice(0, Number(d.i) + 1); ct.sp.n = null; ct.sp.dyn = null; ctSpiderRender(); break;
    case 'ct-sp-n': ct.sp.n = Number(d.n); ctSpiderRender(); break;
    case 'ct-sp-use': ctSpUse(); break;
    case 'ct-judge': ctJudge(); break;
    case 'ct-dl-json': { const r = window._ctRes; if (r) ctDownload(new Blob([JSON.stringify({ seed: r.facts.view.seed, view: r.facts.view, key: r.facts.key, aml: r.facts.aml, transcript: r.transcript, form: r.form, soudce: r.judge || null, kontrola: (r.call.caseId && sim.caseOf(r.call.caseId) && sim.caseOf(r.call.caseId).call) ? sim.caseOf(r.call.caseId).call.check : null }, null, 1)], { type: 'application/json' }), 'hovor-' + r.facts.view.seed + '.json'); break; }
    case 'ct-dl-wav': { const r = window._ctRes; if (r && r.wav) ctDownload(r.wav.blob, 'hovor-' + r.facts.view.seed + '.wav'); break; }
  }
}
document.addEventListener('change', ev => { const t = ev.target; if (t && t.id === 'ct-sp-dyn') { ct.sp.dyn = t.checked; ctSpiderRender(); } });
document.addEventListener('input', ev => { const t = ev.target; if (t && t.id === 'ctf-adresa') ct.addrAuto = false; });
document.addEventListener('keydown', ev => { const t = ev.target; if (ev.key === 'Enter' && t) { if (t.id === 'ctf-adresa') { ev.preventDefault(); ctFind(); } else if (t.id === 'ct-say') { ev.preventDefault(); ctSay(); } } });
window.addEventListener('beforeunload', () => { if (ct.voice) ct.voice.stop(); });
