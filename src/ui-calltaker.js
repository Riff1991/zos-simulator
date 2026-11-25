// UI – Režim calltaker: telefon, okno Nabírání (+ Moje případy), Pavouk, AML a výběr místa na mapě, výsledek hovoru (části se v build.py skládají do jedné IIFE).
// Hlas je v src/live-voice.js (ZOS_LIVE), pavouk v calltaker/spider.js (CT_SPIDER), engine v src/sim-calltaker.js (za s.liveCalls).
const CTS_KEY = 'zos_ct_settings_v1';
const CTS_DEF = { when: 'now', date: '', hour: 7, wx: true, key: '', remember: true, textModel: '', vModel: 'gpt-live-1', vF: 'marin', vM: 'cedar', vFy: 'coral', vMy: 'ash', vFs: 'sage', vMs: 'echo', prov: 'openai', gkey: '', gModel: 'gemini-3.8-live', gTextModel: '', gF: 'Kore', gM: 'Charon', gFy: 'Leda', gMy: 'Puck', gFs: 'Gacrux', gMs: 'Algenib', voiceAge: true, level: 'bezne', mode: 'voice', filt: true, rec: true, flow: 'realistic', gapMin: 3, fast: 10, bot: true, disp: false, crewsOnMap: false };
let cts = Object.assign({}, CTS_DEF);
try { cts = Object.assign(cts, JSON.parse(localStorage.getItem(CTS_KEY) || '{}')); } catch (_) {}
const ctSaveSettings = () => { try { localStorage.setItem(CTS_KEY, JSON.stringify(cts.remember ? cts : Object.assign({}, cts, { key: '', gkey: '' }))); } catch (_) {} };
// hlas a text: zvolený hlavní poskytovatel, druhý je záloha (jen když má klíč); klíče zůstávají jen v prohlížeči
const ctHasAi = () => !!(cts.key || cts.gkey);
const ctProvs = () => (cts.prov === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini']).filter(p => (p === 'gemini' ? cts.gkey : cts.key));
const ctProvName = p => (p === 'gemini' ? 'Gemini' : 'OpenAI');
// textový model (analýza hovoru, textový režim) u hlavního poskytovatele; když není vybraný, zvolí se sám
async function ctText() {
  const p = ctProvs()[0], gem = p === 'gemini', mk = gem ? 'gTextModel' : 'textModel', key = gem ? cts.gkey : cts.key;
  if (key && !cts[mk]) { try { const r = await ZOS_LIVE.models(key, gem); cts[mk] = r.best || ''; ctSaveSettings(); } catch (e) { /* chyba se ukáže při volání */ } }
  return { key, gem, model: cts[mk] };
}
// ---------- první spuštění: klíč Gemini ve třech krocích a zkouška jedním tlačítkem ----------
let ctGemBad = false, ctGemSeq = 0, ctGemTimer = null, ctNoVoiceOk = false;
const ctGemInput = c => `<input id="ctm-gkey" type="password" autocomplete="off" spellcheck="false" placeholder="sem vlož klíč (Ctrl+V)" value="${esc(c.gkey)}">`;
const ctGemTestRow = () => '<div class="ctm-gt"><button class="btn pri" type="button" data-act="ct-gem-test">Ověřit klíč a mikrofon</button><span id="ctm-gstatus" class="ctm-gst" role="status"></span></div>';
const ctGuide = c => `<fieldset class="ctm-guide" id="ctm-guide"><legend>🎙 Aby volající mluvil (zdarma, asi 2 minuty, jen poprvé)</legend>
  <div class="ctm-step"><b>1</b><div><a class="btn pri" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Získat klíč zdarma ↗</a><small>Otevře se Google AI Studio. Přihlas se svým Google účtem, odsouhlas podmínky a klikni na <b>Create API key</b> (Vytvořit klíč API).</small></div></div>
  <div class="ctm-step"><b>2</b><div><small>Klíč zkopíruj (ikona kopírování vedle klíče), vrať se sem a vlož ho:</small>${ctGemInput(c)}</div></div>
  <div class="ctm-step"><b>3</b><div>${ctGemTestRow()}<small>Prohlížeč se zeptá na mikrofon: klikni <b>Povolit</b>. Nejlépe se sluchátky, v Chrome nebo Edge.</small></div></div>
  <p class="ct-note">Klíč je jen tvůj, zůstane v tomto prohlížeči a nikomu ho neposílej. Musí ti být aspoň 18 let. Hovory zpracovává Google, proto do nich neříkej skutečné osobní údaje.</p></fieldset>`;
async function ctGemTest() {
  const inp = $('ctm-gkey'), st = $('ctm-gstatus'); if (!inp || !st) return;
  clearTimeout(ctGemTimer); inp.value = inp.value.replace(/[\s"']/g, '');
  const seq = ++ctGemSeq; st.className = 'ctm-gst'; st.textContent = '⏳ Ověřuji… Když se prohlížeč zeptá na mikrofon, klikni Povolit.';
  const r = await ZOS_LIVE.testGemini(inp.value, ctVal('ctm-gModel') || cts.gModel);
  if (seq !== ctGemSeq || !st.isConnected) return;
  ctGemBad = !r.ok; st.className = 'ctm-gst ' + (r.ok ? 'ok' : 'bad'); st.textContent = (r.ok ? '✔ ' : '✖ ') + r.msg;
  if (r.ok) { ctReadMenu(); ctNoVoiceOk = false; const w = $('ctm-novoice'); if (w) w.hidden = true; const b = document.querySelector('[data-act=ct-start]'); if (b) b.textContent = '▶ Spustit směnu calltakera'; }
}
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || t.id !== 'ctm-gkey') return;
  clearTimeout(ctGemTimer); ctGemSeq++; ctGemBad = false; const st = $('ctm-gstatus'); if (st) st.textContent = '';
  if (t.value.trim().length >= 30) ctGemTimer = setTimeout(ctGemTest, 700);   // po vložení se ověří samo
});
const CT_STLAB = { base: 'Na základně', free: 'Volný', call: 'Výzva', enroute: 'Výjezd', onscene: 'Na místě', transport: 'Transport', handover: 'U ZZ', off: 'Nepřihlášena', activating: 'Aktivace', second: 'Sekundár', attached: 'Ve voze RZP' };
let ct = { spiderDrawn: false, was: false, call: null, facts: {}, tab: 'intake', ringId: null, ringCtx: null, ringT: null, voice: null, vstatus: '', vbad: false, muted: false, transcript: [], curRole: null, curEl: null, pt: null, addrAuto: false, cls: null, sp: { ans: [], n: null, dyn: null }, amlN: 0, tanr: null, dropAt: null, kindNote: '', lastRes: null, wavs: [], usage: 0, hash: '', mapHash: '', built: false, lastCases: 0, spider: null, msgs: [], busy: false, wav: null, spiderOpen: false, phoneKey: '', layersSaved: null };

// calltaker bez dispečerských oken neslyší vysílačky a nevidí červené lišty, toasty ani blikání čekajících
function ctQuiet() { return !!(ctModeOn() && !cts.disp); }
function ctModeOn() { return !!(sim && sim.s && sim.s.liveCalls); }
function ctSpeed(sp) {
  if (ct.tanr && ct.call && !ct.voice && !ct.ended) return sp > 0 ? Math.max(sp, 10) : 0;   // TANR běží, čas se zrychlí
  if (sp > 0 && (ct.call || (sim && sim.s.calls.some(c => c.state === 'ringing')))) return 1;
  return sp > 0 && sim && sim.s.liveCalls && sim.s.liveCalls.mode !== 'training' ? Math.max(sp, 10) : sp;   // mezi hovory se čeká zrychleně
}
function ctNavItems() { return [['intake', 'Nabírání'], ['map', 'Mapa'], ['spider', 'Pavouk']].concat(cts.disp ? [['cases', 'Případy'], ['detail', 'Případ'], ['crews', 'Posádky']] : []); }
const ctKlasifs = () => [...new Set(ZOS_DATA.indications.map(i => i.klasif))];
// výchozí pavouk: skutečné cihličky z klasifikačního systému (src/cihly.json); soubor spider.json ho může nahradit vlastním stromem
const ctSpiderInst = () => ct.spider || (ct.spider = CT_CIHLY.create(ZOS_CIHLY, { klasifs: ctKlasifs() }));
// skutečný pavouk ze souboru spider.json (formát zos-spider/1) nahradí datový, pokud je vedle aplikace
function ctSpiderLoad() {
  fetch('spider.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (!j) return; try { ct.spider = CT_SPIDER.createFromTree(j); ct.sp = { ans: [], n: null, dyn: null }; ctSpiderRender(); toast('Načten vlastní pavouk ze souboru spider.json.', ''); } catch (e) { toast('spider.json: ' + e.message, 'warn'); } }).catch(() => {});
}
const ctFmtM = m => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m');
const ctMMSS = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const ctVal = id => { const e = $(id); return e ? e.value.trim() : ''; };
const ctSet = (id, v) => { const e = $(id); if (e) e.value = v == null ? '' : v; };

// ---------- vstup do režimu, nabídka, nastavení ----------
const ctToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ctDateCz = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? Number(m[3]) + '. ' + Number(m[2]) + '. ' + m[1] : s; };
// kdy směna začíná: „teď“, nebo zvolené datum a hodina (jako u dispečera; počasí se stáhne podle data)
function ctWhen() {
  if (cts.when === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(String(cts.date || ''))) return { date: cts.date, hour: Math.min(23, Math.max(0, Number(cts.hour) || 0)), custom: true };
  const d = new Date(); return { date: ctToday(), hour: d.getHours(), custom: false };
}
function ctMenu() {
  const c = cts, today = ctToday(), rb = (k, v, l) => `<label class="ctm-o"><input type="radio" name="ctm-${k}" value="${v}"${String(c[k]) === String(v) ? ' checked' : ''}> ${l}</label>`;
  const cb = (k, l) => `<label class="ctm-o"><input type="checkbox" id="ctm-${k}"${c[k] ? ' checked' : ''}> ${l}</label>`;
  const hrs = Array.from({ length: 24 }, (_, h) => `<option value="${h}"${Number(c.hour) === h ? ' selected' : ''}>${h}:00</option>`).join('');
  const pre = [['Ranní špička', 8], ['Poledne', 12], ['Odpoledne', 15], ['Večer', 19], ['Noc', 2]].map(x => `<button class="btn" type="button" data-act="ct-when-preset" data-h="${x[1]}" style="margin:0">${x[0]} ${x[1]}:00</button>`).join(' ');
  const first = !c.key && !c.gkey; ctNoVoiceOk = false; ctGemBad = false; ctGemSeq++;
  modal(`<div class="card home ct-form ct-card ctm" style="max-width:660px"><h2 style="margin:0">☎ Calltaker – příjem hovorů</h2>
    <p class="ct-note">Zvedneš telefon, vyslechneš AI volajícího, zadáš adresu, klasifikaci, naléhavost a posádku a předáš případ dispečerovi. Osoby, adresy a telefony jsou generované.</p>
    <div id="ctm-novoice" class="ctm-gst bad" role="alert" hidden></div>
    ${first ? ctGuide(c) : ''}
    <fieldset><legend>1 · Kdy směna začíná</legend>
      <div>${rb('when', 'now', 'Teď (aktuální datum a hodina)')}${rb('when', 'custom', 'Zvolit datum a hodinu')}</div>
      <div class="ct-g" id="ctm-whenrow"><label>Datum<input type="date" id="ctm-date" value="${kiTxt(c.date || today)}" max="${today}"></label><label>Hodina začátku<select id="ctm-hour">${hrs}</select></label></div>
      <div id="ctm-pre" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${pre}</div>
      ${cb('wx', 'Stáhnout skutečné počasí podle data (u dnešního data nebo bez sítě se simuluje)')}
      <div class="ct-note" id="ctm-whensum"></div></fieldset>
    <fieldset><legend>2 · Hovory</legend>
      <div class="ctm-r"><b>Úroveň</b>${rb('level', 'zacatecnik', 'začátečník')}${rb('level', 'bezne', 'běžné')}${rb('level', 'tezke', 'těžké (paniky, cizinci, agresivní, ztráta spojení)')}</div>
      <div class="ctm-r"><b>Tok hovorů</b>${rb('flow', 'realistic', 'realistický (zvoní asi čtvrtina hovorů)')}${rb('flow', 'training', 'trénink (jen moje hovory)')}</div>
      <div class="ct-g" style="margin-top:6px"><label>Interval mezi hovory v tréninku (min)<input id="ctm-gapMin" type="number" min="1" max="30" value="${c.gapMin}"></label>
      <label>Rychlost mezi hovory<select id="ctm-fast">${[1, 5, 10, 20].map(v => `<option value="${v}"${Number(c.fast) === v ? ' selected' : ''}>${v}×</option>`).join('')}</select></label></div></fieldset>
    <fieldset><legend>3 · Dispečer a mapa</legend>
      ${cb('bot', 'Bot dispečer vysílá posádky (vypni, chceš-li případy obsluhovat ručně)')}${cb('disp', 'Zobrazit dispečerská okna (případy, posádky, rádio)')}${cb('crewsOnMap', 'Posádky a případy na mapě')}</fieldset>
    <details class="ctm-ai"><summary><b>4 · Hlas a AI – pokročilé</b> <span class="ct-note">${c.key && c.gkey ? 'oba klíče zadány' : c.key ? 'klíč OpenAI zadán' : c.gkey ? 'klíč Gemini zadán' : 'volitelné: klíč OpenAI, hlasy, modely'}</span></summary><fieldset style="margin-top:6px"><legend>Spojení</legend>
      <label style="font-size:11px;color:var(--mut)">API klíč OpenAI (platform.openai.com → API keys; není to předplatné ChatGPT). Zůstává jen v tomto prohlížeči.<input id="ctm-key" type="password" autocomplete="off" placeholder="sk-…" value="${esc(c.key)}"></label>
      ${first ? '' : `<label style="font-size:11px;color:var(--mut)">API klíč Gemini (zdarma na <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>)${ctGemInput(c)}</label>${ctGemTestRow()}`}
      ${cb('remember', 'zapamatovat klíče v tomto prohlížeči (jen na svém zařízení)')}
      <div class="ctm-r"><b>Hlavní</b>${rb('prov', 'openai', 'OpenAI (záloha Gemini)')}${rb('prov', 'gemini', 'Gemini (záloha OpenAI)')}</div>
      <div class="ctm-r">${rb('mode', 'voice', 'Hlas (mikrofon + sluchátka)')}${rb('mode', 'text', 'Jen text')}</div>
      <div class="ct-g"><label>Hlasový model<input id="ctm-vModel" value="${esc(c.vModel)}"></label><label>Hlas: volající žena<input id="ctm-vF" value="${esc(c.vF)}"></label><label>Hlas: volající muž<input id="ctm-vM" value="${esc(c.vM)}"></label>
      <label>Hlas: mladá žena / dítě<input id="ctm-vFy" value="${esc(c.vFy)}"></label><label>Hlas: mladý muž / chlapec<input id="ctm-vMy" value="${esc(c.vMy)}"></label><label>Hlas: seniorka<input id="ctm-vFs" value="${esc(c.vFs)}"></label><label>Hlas: senior<input id="ctm-vMs" value="${esc(c.vMs)}"></label>
      <label>Textový model (analýza hovoru, textový režim)<input id="ctm-textModel" list="ctm-models" value="${esc(c.textModel)}"><datalist id="ctm-models"></datalist></label></div>
      <details style="margin:6px 0"><summary class="ct-note">Gemini: model a hlasy</summary><div class="ct-g"><label>Hlasový model Gemini<input id="ctm-gModel" value="${esc(c.gModel)}"></label><label>Hlas: volající žena<input id="ctm-gF" value="${esc(c.gF)}"></label><label>Hlas: volající muž<input id="ctm-gM" value="${esc(c.gM)}"></label>
      <label>Hlas: mladá žena / dítě<input id="ctm-gFy" value="${esc(c.gFy)}"></label><label>Hlas: mladý muž / chlapec<input id="ctm-gMy" value="${esc(c.gMy)}"></label><label>Hlas: seniorka<input id="ctm-gFs" value="${esc(c.gFs)}"></label><label>Hlas: senior<input id="ctm-gMs" value="${esc(c.gMs)}"></label>
      <label>Textový model Gemini<input id="ctm-gTextModel" list="ctm-gmodels" value="${esc(c.gTextModel)}"><datalist id="ctm-gmodels"></datalist></label></div></details>
      <button class="btn" data-act="ct-models">Načíst modely</button> <span id="ctm-status" class="ct-note"></span>
      ${cb('voiceAge', 'volit hlas podle věku volajícího (senioři, mladí; nedostupný hlas se nahradí jiným)')}${cb('filt', 'telefonní filtr a šum linky přes hlas')}${cb('rec', 'nahrávat hovor (WAV ke stažení po hovoru)')}</fieldset></details>
    <div class="foot"><button class="btn" data-act="home">‹ Zpět</button><button class="btn pri" data-act="ct-start">▶ Spustit směnu calltakera</button></div></div>`);
  ctMenuSync();
}
// podle zvolených hodnot zapne či vypne pole a ukáže shrnutí začátku
function ctMenuSync() {
  const sum = $('ctm-whensum'); if (!sum) return;
  const g = k => { const e = document.querySelector('input[name=ctm-' + k + ']:checked'); return e ? e.value : ''; };
  const custom = g('when') === 'custom', d = ctVal('ctm-date') || ctToday(), h = Number(ctVal('ctm-hour')) || 0, now = new Date();
  const gap = $('ctm-gapMin'); if (gap) gap.disabled = g('flow') !== 'training';
  sum.textContent = 'Začátek směny: ' + (custom ? ctDateCz(d) + ' v ' + h + ':00' : 'teď (' + ctDateCz(ctToday()) + ' v ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ')');
}
// úprava data nebo hodiny sama přepne na „Zvolit datum a hodinu“
const ctWhenCustom = () => { const r = document.querySelector('input[name=ctm-when][value=custom]'); if (r) r.checked = true; };
document.addEventListener('change', ev => { const t = ev.target; if (t && (t.id === 'ctm-date' || t.id === 'ctm-hour')) ctWhenCustom(); if (t && t.closest && t.closest('.ctm')) ctMenuSync(); });
document.addEventListener('input', ev => { const t = ev.target; if (t && t.id === 'ctm-date') { ctWhenCustom(); ctMenuSync(); } });
function ctReadMenu() {
  const g = k => document.querySelector(`input[name=ctm-${k}]:checked`);
  for (const k of ['flow', 'mode', 'level', 'when', 'prov']) if (g(k)) cts[k] = g(k).value;
  cts.date = ctVal('ctm-date') || ''; cts.hour = Math.min(23, Math.max(0, Number(ctVal('ctm-hour')) || 0));
  for (const k of ['bot', 'disp', 'crewsOnMap', 'remember', 'filt', 'rec', 'voiceAge', 'wx']) if ($('ctm-' + k)) cts[k] = $('ctm-' + k).checked;
  for (const k of ['key', 'vModel', 'vF', 'vM', 'vFy', 'vMy', 'vFs', 'vMs', 'textModel', 'gkey', 'gModel', 'gF', 'gM', 'gFy', 'gMy', 'gFs', 'gMs', 'gTextModel']) if ($('ctm-' + k)) cts[k] = ctVal('ctm-' + k);
  cts.gapMin = Math.max(1, Number(ctVal('ctm-gapMin')) || 3); cts.fast = Number(ctVal('ctm-fast')) || 5;
  ctSaveSettings();
}
async function ctLoadModels() {
  ctReadMenu(); const st = $('ctm-status');
  if (!ctHasAi()) { st.textContent = 'Nejdřív vlož API klíč.'; return; }
  st.textContent = 'Načítám modely…'; const out = [];
  for (const [key, list, field, name, gem] of [[cts.key, 'ctm-models', 'ctm-textModel', 'OpenAI', false], [cts.gkey, 'ctm-gmodels', 'ctm-gTextModel', 'Gemini', true]]) {
    if (!key) continue;
    try { const r = await ZOS_LIVE.models(key, gem); $(list).innerHTML = r.ids.map(i => `<option value="${esc(i)}">`).join(''); if (!ctVal(field)) ctSet(field, r.best); out.push(name + ': ' + r.ids.length + (r.best ? ', vybrán ' + r.best : '')); } catch (e) { out.push(name + ': klíč nebo síť – ' + e.message); }
  }
  st.textContent = out.join(' · ');
  ctReadMenu();
}
async function ctStart() {
  ctReadMenu();
  // bez fungujícího klíče se napoprvé nespustí: hráč se dozví, že volající nebude mluvit
  if (cts.mode === 'voice' && (!ctHasAi() || (ctGemBad && !cts.key)) && !ctNoVoiceOk) {
    ctNoVoiceOk = true; const w = $('ctm-novoice'), b = document.querySelector('[data-act=ct-start]');
    if (w) { w.hidden = false; w.textContent = '✖ Volající zatím nebude mluvit, chybí fungující klíč. ' + ($('ctm-guide') ? 'Udělej tři kroky níže' : 'Zkontroluj klíč v části 4') + ', nebo klikni znovu a spusť bez hlasu.'; w.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    if (b) b.textContent = '▶ Spustit i bez hlasu';
    return;
  }
  if (!window.ZOS_ADDR || !ROUTER.ready) { toast('Mapová data se ještě načítají, zkus to za chvíli.', 'warn'); return; }
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { /* zvuk není nutný */ }
  const seed = (Math.random() * 1e9) | 0, w = ctWhen();
  let weather = null;
  if (cts.wx) { toast('Stahuji počasí pro ' + ctDateCz(w.date) + '…', ''); try { weather = await ZOS_WX.load(w.date, seed); } catch (e) { weather = null; } }
  sim = new Sim({ date: w.date, weather, mode: 'free', startHour: w.hour, seed, radio: 'auto', secondaryEnabled: false, muEnabled: false });
  sim.enableLiveCalls({ mode: cts.flow, gapSec: cts.gapMin * 60, bot: cts.bot, level: cts.level });
  applyVoice(); afterLoad(); ctSpiderLoad(); speed = Number(cts.fast); savedSpeed = speed; ctReset(); view = 'intake';
  closeModal(); toast('Směna calltakera začala. Čekej na zazvonění telefonu.', '');
}
function ctReset() {
  if (ct.voice) { try { ct.voice.stop(); } catch (e) { /* ignore */ } }
  ctStopRing();
  ct = Object.assign(ct, { tanr: null, dropAt: null, kindNote: '', lastRes: null, recs: [], wavs: [], usage: 0, was: false, call: null, facts: {}, tab: 'intake', ringId: null, voice: null, transcript: [], pt: null, cls: null, sp: { ans: [], n: null, dyn: null }, amlN: 0, fitPend: null, poiKey: '', hash: '', mapHash: '', built: false, phoneKey: '', msgs: [], wav: null });
  const b = $('ct-body'); if (b) b.innerHTML = '';
  document.body.classList.add('ct-spider-off'); document.body.classList.remove('ct-call-focus');
}
function ctAfterLoad() { ctReset(); if (ctModeOn()) { for (const c of sim.s.calls) if (c.state === 'taken' || c.state === 'wrap') c.state = 'done'; view = 'intake'; } }
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
  const ck = (id, l) => `<label style="flex-direction:row;display:flex;gap:5px;align-items:center;color:var(--ink);font-size:12.5px"><input type="checkbox" id="${id}" style="width:auto"> ${l}</label>`;
  $('ct-tabs').innerHTML = '<button data-act="ct-tab" data-t="intake" class="on">Náběr případu</button><button data-act="ct-tab" data-t="mine">Moje případy</button>';
  $('ct-body').innerHTML = kiHtml();
}
function ctPhoneHtml() {
  const s = sim.s, rg = s.calls.find(c => c.state === 'ringing'), call = ct.call;
  const btnMenu = '<button class="btn" data-act="ct-home" title="Nabídka" style="margin:0 0 0 auto">☰</button>';
  if (call && rg && rg.id === call.id) { const f = ct.facts[rg.id]; return { cls: 'ring', html: `<div class="ph-st">☎ VOLAJÍCÍ ZAVOLAL ZPĚT <span class="dy">${Math.max(0, Math.round(s.liveCalls.ring - (s.t - rg.ringAt)))} s</span><small>${f ? esc(ctPhoneShown(f)) : ''}</small></div><button class="btn pri" data-act="ct-pickup">☎ Zvednout</button>${!call && ct.lastRes ? '<button class="btn" data-act="ct-rozbor">Rozbor hovoru</button>' : ''}${btnMenu}` }; }
  if (call && call.state === 'dropped') return { cls: 'call', html: `<div class="ph-st">Spojení přerušeno<small>čekej, volající se pokusí zavolat zpět</small></div>${btnMenu}` };
  if (call && ct.ended) {
    return { cls: 'call', html: `<div class="ph-st">Hovor ukončen<small>Dovyplň formulář a odešli nebo aktualizuj případ, pak klikni Dokončit${call.caseId ? '' : ' (případ zatím není odeslán!)'}</small></div><button class="btn pri" data-act="ct-finish">Dokončit hovor</button>${btnMenu}` };
  }
  if (call && ct.tanr) {
    const c = call.caseId ? sim.caseOf(call.caseId) : null, etas = c ? (c.crews || []).map(id => sim.crewOf(id)).filter(k => k && k.until != null && ['call', 'enroute'].includes(k.state)).map(k => k.until - s.t) : [];
    const eta = etas.length ? Math.max(0, Math.round(Math.min(...etas) / 60)) + ' min' : '–', min = Math.round((s.t - ct.tanr.since) / 60), nx = Math.max(0, Math.round(ct.tanr.nextCheck - s.t));
    return { cls: 'call', html: `<div class="ph-st">TANR běží <span class="dy">${min} min</span><small>posádka dojede za ~<span class="dy">${eta}</span> · ${ct.voice ? 'kontrolní hovor' : 'další kontrola za <span class="dy">' + nx + ' s</span>'}${ct.vstatus ? ' · ' + esc(ct.vstatus) : ''}</small></div>${ct.voice ? '<button class="btn" data-act="ct-tanr-endcheck">Ukončit kontrolu</button>' : '<button class="btn" data-act="ct-tanr-check">Kontrola teď</button>'}<button class="btn red" data-act="ct-hangup">Ukončit hovor</button>${btnMenu}` };
  }
  if (call && !ct.vready && !ct.ended) {
    const el = s.t - call.pickedAt;
    return { cls: 'ring', html: `<div class="ph-st">⏳ Spojuji hlas… <span class="dy">${ctMMSS(el)}</span><small>počkej na pípnutí, než začneš mluvit${ct.vstatus ? ' · ' + esc(ct.vstatus) : ''}</small></div><button class="btn red" data-act="ct-hangup">Ukončit hovor</button>${btnMenu}` };
  }
  if (call) {
    const v = ct.facts[call.id] ? ct.facts[call.id].view.volajici : null, el = s.t - call.pickedAt, vs = ct.vstatus ? ` · <span style="color:${ct.vbad ? '#ff9b94' : '#9fd9b0'}">${esc(ct.vstatus)}</span>` : '';
    const tanr = call.caseId && (call.kind || 'vyjezd') === 'vyjezd' ? '<button class="btn" data-act="ct-tanr" title="Po pokynech zavřeš hlas (bez nákladů), čas se zrychlí a v pevných bodech jsou kontrolní hovory">Předat do TANR</button>' : '';
    return { cls: 'call', html: `<div class="ph-st">V hovoru <span class="dy">${ctMMSS(el)}</span><small>${v ? esc(ctPhoneShown()) + ' · ' + esc(v.linka) : ''}${vs}</small></div>${ct.voice ? `<button class="btn" data-act="ct-mute">${ct.muted ? 'Zapnout mikrofon' : 'Ztlumit mikrofon'}</button>` : ''}${tanr}<button class="btn red" data-act="ct-hangup">Ukončit hovor</button>${btnMenu}` };
  }
  if (rg) { const f = ct.facts[rg.id]; return { cls: 'ring', html: `<div class="ph-st">☎ ZVONÍ <span class="dy">${Math.max(0, Math.round(s.liveCalls.ring - (s.t - rg.ringAt)))} s</span><small>${f ? esc(ctPhoneShown(f)) + ' · ' + esc(f.view.volajici.linka) : ''}</small></div><button class="btn pri" data-act="ct-pickup">☎ Zvednout</button>${!call && ct.lastRes ? '<button class="btn" data-act="ct-rozbor">Rozbor hovoru</button>' : ''}${btnMenu}` }; }
  const missed = s.calls.filter(c => c.state === 'missed').length, lv = { zacatecnik: 'začátečník', bezne: 'běžné', tezke: 'těžké' }[s.liveCalls.level] || '';
  return { cls: '', html: `<div class="ph-st">Čekáš na hovor<small>${missed ? 'zmeškáno: ' + missed + ' · ' : ''}<span class="dy">${sim.clock()}</span> · ${s.liveCalls.mode === 'training' ? 'trénink' : 'realistický tok'} · ${lv}${s.liveCalls.bot ? '' : ' · bot dispečer vypnut'}</small></div>${ct.lastRes ? '<button class="btn" data-act="ct-rozbor">Rozbor hovoru</button>' : ''}<button class="btn" data-act="ct-spider-open">Pavouk</button><button class="btn" data-act="ct-prehled">Přehled směny</button><button class="btn" data-act="ct-disp-toggle">${cts.disp ? 'Skrýt dispečerská okna' : 'Dispečerská okna'}</button>${btnMenu}` };
}
function ctPhoneShown(f) { f = f || ct.facts[ct.call.id]; return f.aml && f.aml.typ === 'skryté' ? 'číslo skryto' : f.view.volajici.telefon; }

// ---------- hlavní kreslení (volá render() ~10× za sekundu; jen lehké změny) ----------
function ctRender() {
  if (!ctModeOn()) return;
  ctBuild();
  if (!ct.spiderDrawn) { ct.spiderDrawn = true; ctSpiderRender(); }   // pavouk je použitelný i před prvním hovorem
  const s = sim.s, rg = s.calls.find(c => c.state === 'ringing');
  const callFocus = !!rg || !!ct.call, wasFocused = document.body.classList.contains('ct-call-focus');
  if (callFocus !== wasFocused) { document.body.classList.toggle('ct-call-focus', callFocus); layoutApply(true); }
  if (rg && ct.ringId !== rg.id) { ct.ringId = rg.id; ct.facts[rg.id] = sim.callFacts(rg.seed, rg); ctStartRing(); setTimeout(() => { if (!ct.call) ctFitRegion(); }, 90); toast(rg.cb ? '☎ Volající zavolal zpět' : '☎ Zvoní telefon', 'warn'); }
  else if (!rg && ct.ringId) { ctStopRing(); ct.ringId = null; }
  const ph = ctPhoneHtml(), pe = $('ct-phone'), DY = /<span class="dy">([^<]*)<\/span>/g, key = ph.cls + ph.html.replace(DY, '<span class="dy"></span>');
  if (key !== ct.phoneKey) { ct.phoneKey = key; pe.className = ph.cls; pe.innerHTML = ph.html; }   // celá lišta se překreslí jen při změně stavu
  else { const vals = [...ph.html.matchAll(DY)].map(m => m[1]), els = pe.querySelectorAll('.dy'); els.forEach((e, i) => { if (vals[i] != null && e.innerHTML !== vals[i]) e.innerHTML = vals[i]; }); }   // běžící čas jen přepíše text, tlačítka zůstanou na místě
  const inCall = !!ct.call;
  $('ct-idle').hidden = inCall; $('ct-formwrap').hidden = !inCall;
  if (inCall) {
    ctAmlTick(); kiTick();
    if (!ct.ended && ct.call.state === 'taken') {
      if (ct.dropAt != null && s.t >= ct.dropAt) ctDrop();
      if (ct.tanr) ctTanrTick();
    }
  }
  if (ct.fitPend && GL && glReady) { const fp = ct.fitPend; if (fp === 'region') ctFitRegion(); else ctFitCircle(fp); }   // odložené přiblížení (mapa se dočetla až po zazvonění / AML)
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
  if (ct.recs && ct.recs.length) h += '<h3 style="margin:10px 0 4px;font-size:13px">Vyhodnocené hovory</h3><table class="ct-t"><tr><th>Hovor</th><th>Zadáno</th><th>Body</th><th></th></tr>' + ct.recs.map((r, i) => { const cs = r.call && r.call.caseId ? sim.caseOf(r.call.caseId) : null, sk = cs && cs.call && cs.call.skore; return `<tr><td>${sim.clockAt(r.call.pickedAt)}<br><small>${esc(r.facts.view.volajici.jmeno)}</small></td><td>${esc((r.form && r.form.klasifTabulka) || '–')}${cs ? ' · N' + cs.n : ' · bez případu'}</td><td>${sk ? sk.total + ' / ' + sk.max : '–'}</td><td><button class="btn" data-act="ct-rozbor-i" data-i="${i}" style="margin:0">Analýza</button></td></tr>`; }).reverse().join('') + '</table>';
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
  const last = ph[ph.length - 1], ab = f.aml.abonent;
  const note = ct.kindNote ? `<div class="ct-aml">${esc(ct.kindNote)}</div>` : '';
  const html = note + (f.aml.typ !== 'mobil' ? `<div class="ct-aml">${f.aml.typ === 'pevná' ? 'Pevná linka – poloha z telefonu není k dispozici (zjisti adresu od volajícího).' + (ab ? `<br>Adresa účastníka: <b>${esc(ab.adresa)}</b> <button class="btn" data-act="ct-use-abonent" style="margin:4px 0 0">Použít adresu účastníka</button> <span class="ct-note">Účastník nemusí být na místě události.</span>` : '') : 'Číslo je skryto – poloha z telefonu není k dispozici.'}</div>`
    : !last ? '<div class="ct-aml">Zjišťuji polohu telefonu…</div>'
      : `<div class="ct-aml${last.zdroj !== 'buňka' && last.radiusM <= 150 ? ' g' : ''}"><b>${esc(ctAmlLabel(last))}</b>${ph.length > 1 ? ' · zpřesněno (starší kruh šedě)' : last.zdroj === 'buňka' && f.aml.phases.length > 1 ? ' · čeká se na zpřesnění z telefonu' : ' · zpřesnění z telefonu nedorazilo'}<br><button class="btn" data-act="ct-use-aml" style="margin:4px 0 0">Použít střed AML</button> <span class="ct-note">Poloha z telefonu může být nepřesná – ověř ji s volajícím.</span></div>`);
  if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
}
function ctCircle(lat, lon, rM, n) {
  const co = [], dl = rM / 111320, dn = rM / (111320 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= (n || 48); i++) { const a = i / (n || 48) * 2 * Math.PI; co.push([lon + dn * Math.sin(a), lat + dl * Math.cos(a)]); }
  return co;
}
function ctFitCircle(p) {
  if (!GL || !glReady) { ct.fitPend = p; return; }   // mapa ještě není připravená: přiblížení se provede, jakmile bude
  ct.fitPend = null;
  const dl = p.radiusM / 111320, dn = p.radiusM / (111320 * Math.cos(p.lat * Math.PI / 180));
  try { GL.fitBounds([[p.lon - dn, p.lat - dl], [p.lon + dn, p.lat + dl]], { padding: 50, maxZoom: 17.5, duration: 700 }); } catch (e) { /* ignore */ }
}
function ctFitRegion() {
  if (!GL || !glReady) { ct.fitPend = 'region'; return; }
  ct.fitPend = null;
  try { GL.fitBounds([[13.53, 48.55], [15.61, 49.63]], { padding: 24, duration: 550 }); } catch (e) { /* ignore */ }
}
function ctUseAml() {
  const ph = ctAmlPhases(), p = ph[ph.length - 1]; if (!p) return;
  ctSetPoint(p.lat, p.lon, 'AML');
}

// ---------- mapa: výběr bodu, kruhy ----------
// ---------- orientační body (poi.json) v okolí AML: neutrální kontext, žádné zvýraznění skutečné polohy ----------
// Vybírá se jen podle vzdálenosti od středu AML a podle kategorie; skutečný případ se nikdy nezohledňuje.
// tier 1 = kostely/kaple, školy, pojmenované obchody a provozovny; tier 2 = ostatní pojmenované veřejné body, ordinace, domovy, ubytování; tier 3 = sportoviště
const CT_POI_CHURCH = /kostel|kaple|chrám|klášter|modlitebn|synagog/i;
let CT_POI_IDX = null;
function ctPoiIndex() {
  const P = window.ZOS_POI && window.ZOS_POI.poi; if (!P) return null;
  if (CT_POI_IDX) return CT_POI_IDX;
  const out = [], add = (p, tier, kind, name) => { if (name) out.push({ lat: p[0] / 1e5, lon: p[1] / 1e5, tier, kind, name }); };
  for (const p of P.verejne || []) { const n = p[2] || ''; if (CT_POI_CHURCH.test(n)) add(p, 1, 'kostel', n); else if (n) add(p, 2, 'misto', n); }
  for (const p of P.skola || []) add(p, 1, 'skola', p[2] || 'Škola');
  for (const p of P.prov || []) add(p, 1, 'obchod', p[2]);
  for (const p of P.ordinace || []) add(p, 2, 'zdravi', p[2] || 'Ordinace');
  for (const p of P.domov || []) add(p, 2, 'zdravi', p[2] || 'Domov');
  for (const p of P.ubytovani || []) add(p, 2, 'ubytovani', p[2]);
  for (const p of P.sport || []) add(p, 3, 'sport', p[2]);
  return (CT_POI_IDX = out);
}
function ctPoiFeatures(c) {
  const idx = ctPoiIndex(); if (!idx || !c) return [];
  const R = Math.min(3500, Math.max(700, c.radiusM * 1.7)), dl = R / 111320, dn = R / (111320 * Math.cos(c.lat * Math.PI / 180)), k = Math.cos(c.lat * Math.PI / 180), cap = [0, 220, 150, 90], by = [[], [], [], []];
  for (const p of idx) {
    if (Math.abs(p.lat - c.lat) > dl || Math.abs(p.lon - c.lon) > dn) continue;
    const d = Math.hypot((p.lat - c.lat) * 111320, (p.lon - c.lon) * 111320 * k);
    if (d <= R) by[p.tier].push({ p, d });
  }
  const feats = [];
  for (let t = 1; t <= 3; t++) for (const { p } of by[t].sort((a, b) => a.d - b.d).slice(0, cap[t])) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { tier: p.tier, kind: p.kind, lab: p.name } });
  return feats;
}
function ctGlInit() {
  const empty = { type: 'FeatureCollection', features: [] };
  for (const s of ['ct-poi', 'ct-circles', 'ct-labels', 'ct-pt']) GL.addSource(s, { type: 'geojson', data: empty });
  // orientační body pod kruhy AML; menší důležitost = až při větším přiblížení, štítky se mezi sebou samy odsunou (bez překryvů)
  const kc = ['match', ['get', 'kind'], 'kostel', '#8a7aa8', 'skola', '#5d9a78', 'obchod', '#c0924d', 'zdravi', '#c06a76', 'ubytovani', '#5f92b5', '#8793a0'];
  for (const [t, mz, lz] of [[1, 12.5, 14], [2, 14.5, 15.5], [3, 15.5, 16.5]]) {
    GL.addLayer({ id: 'ct-poi-c' + t, type: 'circle', source: 'ct-poi', minzoom: mz, filter: ['==', ['get', 'tier'], t], paint: { 'circle-radius': t === 1 ? 4 : 3, 'circle-color': kc, 'circle-opacity': 0.85, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
    GL.addLayer({ id: 'ct-poi-l' + t, type: 'symbol', source: 'ct-poi', minzoom: lz, filter: ['==', ['get', 'tier'], t], layout: { 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.6], 'text-max-width': 8, 'symbol-sort-key': t }, paint: { 'text-color': '#2f3d4b', 'text-halo-color': 'rgba(255,255,255,.92)', 'text-halo-width': 1.4 } });
  }
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
  const lp = ph[ph.length - 1], pk = (lp ? lp.lat + ',' + lp.lon + ',' + lp.radiusM : '-') + ':' + (window.ZOS_POI ? 1 : 0);   // orientační body se přepočítají jen při nové fázi AML (střed = poslední AML, ne případ)
  if (pk !== ct.poiKey) { ct.poiKey = pk; GL.getSource('ct-poi').setData({ type: 'FeatureCollection', features: ctPoiFeatures(ph[ph.length - 1]) }); }
  GL.getSource('ct-pt').setData({ type: 'FeatureCollection', features: pt ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] }, properties: { lab: pt.src === 'AML' ? 'střed AML' : pt.src === 'adresa' ? 'adresa' : 'vybraný bod' } }] : [] });
}
// nejbližší adresní bod z ZOS_ADDR do 100 m, jinak „okolí obce X“
function ctAddrAt(lat, lon) {
  const A = window.ZOS_ADDR; if (!A) return { text: '', dM: Infinity, near: false };
  const a = A.a, S = A.s, k = Math.cos(lat * Math.PI / 180); let best = -1, bd = Infinity;
  for (let i = 0; i < a.length; i += 8) { const dy = (a[i] / 1e5 - lat), dx = (a[i + 1] / 1e5 - lon) * k, d = dy * dy + dx * dx; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return { text: '', dM: Infinity, near: false };
  const dM = Math.sqrt(bd) * 111320, city = S[a[best + 3]], st = S[a[best + 2]], num = S[a[best + 4]];
  const street = st && st !== city ? st : '';
  if (dM <= 100) return { text: (street ? st + ' ' + num : 'čp. ' + num) + ', ' + city, city, street, num, dM, near: true };
  return { text: 'okolí obce ' + city, city, street: '', num: '', dM, near: false };
}
function ctSetPoint(lat, lon, src, noFocus) {
  ct.pt = { lat, lon, src }; ct.mapHash = '';
  if (src !== 'adresa') {
    const r = ctAddrAt(lat, lon);
    if (r.text && (src !== 'AML' || !ctVal('ctf-adresa') || ct.addrAuto)) { ctSetAddr(r.near ? { obec: r.city, ulice: r.street, cp: r.num } : { obec: r.city, okoli: true }); ct.addrAuto = true; }
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
  ctAddrSync(); const t = ctVal('ctf-adresa'); if (!t) return;
  ct.addrAuto = false;
  const ph = ctAmlPhases(), last = ph[ph.length - 1], g = sim._ctGeocode(t, last ? { lat: last.lat, lon: last.lon } : null);   // stejnojmenné obce se rozliší podle AML
  if (!g.quality) { ct.ptInfo = 'Adresu se nepodařilo najít v databázi adres.'; ct.pt = null; ctPtInfo(); toast('Adresu se nepodařilo najít.', 'warn'); return; }
  ctSetPoint(g.lat, g.lon, 'adresa');
  ct.ptInfo = ({ exact: 'Adresa nalezena přesně.', street: 'Nalezena jen ulice (střed), upřesni číslo.', town: 'Nalezena jen obec (střed), upřesni adresu.' })[g.quality]; ctPtInfo();
}

// ---------- hovor: zvednutí, hlas, ukončení ----------
function ctFormReset(f) {
  for (const id of ['vJmeno', 'vPrijmeni', 'vTel', 'vVztah', 'pJmeno', 'pPrijmeni', 'pVek', 'adresa', 'obec', 'ulice', 'cp', 'cast', 'upresneni', 'popis', 'poznamka', 'pocet']) ctSet('ctf-' + id, '');
  ctSet('ctf-pPohlavi', ''); ctSet('ctf-vTel', f.aml.typ === 'skryté' ? '' : f.view.volajici.telefon);
  for (const id of ['agPcr', 'agHzs', 'nebezpeci']) { const e = $('ctf-' + id); if (e) e.checked = false; }
  const sel = $('ctf-sluc'); if (sel) sel.innerHTML = '<option value="">– nový případ –</option>' + sim.s.cases.filter(c => c.call && c.status !== 'closed').map(c => `<option value="${c.id}">${esc(c.num)} · ${esc(c.addr)} · ${esc(c.klasif)}</option>`).join('');
  ct.pt = null; ct.cls = null; ct.sp = { ans: [], n: null, dyn: null }; ct.addrAuto = false; ct.ptInfo = ''; ct.amlN = 0; ct.mapHash = ''; ct.kindNote = ''; ct.tanr = null; ct.dropAt = null;
  $('ct-sendbtn').textContent = 'Předat dispečerovi'; $('ct-sendinfo').textContent = ''; $('ct-tr').innerHTML = ''; ct.transcript = []; ct.curRole = null;
  kiReset(f); ctPtInfo(); ctClsHtml();
}
// naplní formulář z dříve odeslaného případu (opakovaný hovor)
function ctFillForm(fm) {
  const m = { vJmeno: 'vJmeno', vPrijmeni: 'vPrijmeni', vTelefon: 'vTel', vVztah: 'vVztah', pJmeno: 'pJmeno', pPrijmeni: 'pPrijmeni', pPohlavi: 'pPohlavi', adresa: 'adresa', cast: 'cast', upresneni: 'upresneni', popis: 'popis', poznamka: 'poznamka', pocet: 'pocet' };
  for (const k of Object.keys(m)) if (fm[k] != null && fm[k] !== '') ctSet('ctf-' + m[k], fm[k]);
  if (fm.adresa) ctAddrFromText(fm.adresa);
  if (fm.pVek !== '' && fm.pVek != null) ctSet('ctf-pVek', fm.pVek); else if (fm.pRok) ctSet('ctf-pVek', fm.pRok);
  for (const id of ['agPcr', 'agHzs', 'nebezpeci']) { const e = $('ctf-' + id); if (e) e.checked = !!fm[id]; }
  if (fm.bod) ct.pt = { lat: fm.bod.lat, lon: fm.bod.lon, src: fm.zdroj || 'mapa' };
  if (fm.klasif) ct.cls = { klasif: fm.klasif, n: Number(fm.n) || 2, dyn: !!fm.dyn, priznaky: (fm.priznaky || []).slice() };
  kiFill(fm); ctPtInfo(); ctClsHtml();
}
function ctPickup() {
  const rg = sim.s.calls.find(c => c.state === 'ringing'); if (!rg) return;
  const resume = !!(ct.call && ct.call.id === rg.id);
  if (ct.call && !resume) return;
  const facts = sim.pickupCall(rg.id); if (!facts) return;
  ctStopRing(); ct.ringId = null; ct.facts[rg.id] = facts; ct.call = rg; ct.ended = false; ct.vstatus = ''; ct.vbad = false; ct.muted = false;
  if (!resume) {
    ct.wavs = []; ct.msgs = []; ct.tanr = null; ct.dropAt = null;
    ctBuild(); ctFormReset(facts); ct.tab = 'intake'; ctTab('intake');
    if (rg.kind === 'opak' && rg.caseId) {
      const c0 = sim.caseOf(rg.caseId);
      if (c0 && c0.call && c0.call.form) { ctFillForm(c0.call.form); $('ct-sendbtn').textContent = 'Aktualizovat případ'; ct.kindNote = `Opakovaný hovor: telefon už je veden u případu ${c0.num}.`; }
    }
    if (sim.s.liveCalls.level === 'tezke' && rg.kind !== 'bez' && Math.random() < 0.35) ct.dropAt = sim.s.t + 45 + Math.random() * 75;
  }
  layoutApply(true);
  if (view !== 'intake' && !layoutDesktop()) view = 'intake';
  ctVoiceStart(facts, resume ? { resume: true } : {});
  render();
}
// co volající skutečně řekl, se zapíše do hovoru: při opakovaném hovoru a zpětném volání ví jen to a to, co věděl hned (calltaker/lokace.js)
function ctZapisZjisteno(call) {
  try {
    const facts = call && ct.facts[call.id], L = facts && facts.view && facts.view.lokace, LK = window.CT_LOKACE;
    if (!L || !LK) return;
    sim.zaznamenejZjisteno(call.id, LK.zjistenoZPrepisu(L, ct.transcript.filter(t => t.role !== 'calltaker').map(t => t.text).join(' ')));
  } catch (e) { /* záznam je jen doplněk */ }
}
function ctDrop() {
  const call = ct.call; if (!call || call.state !== 'taken') return;
  ctZapisZjisteno(call);
  ct.dropAt = null;
  const v = ct.voice; ct.voice = null; if (v) { v.close().then(r => { if (r && r.wav) (ct.wavs = ct.wavs || []).push(r.wav); }).catch(() => {}); }
  sim.dropCall(call.id); ct.vstatus = ''; ct.phoneKey = '';
  toast('Spojení se přerušilo. Volající se pokusí zavolat zpět.', 'warn');
}
// shrnutí dosavadního hovoru pro návrat po přerušení a pro kontrolní hovory
function ctTrSummary() { return ct.transcript.slice(-14).map(t => (t.role === 'calltaker' ? 'Calltaker: ' : 'Ty: ') + t.text).join('\n').slice(-1800) || '(zatím nic)'; }
function ctVoiceChain(facts, gem) {
  const v = facts.view, f = facts.view.volajici.pohlavi ? facts.view.volajici.pohlavi === 'žena' : ctFemale(v), band = (v.persona && v.persona.pasmo) || 'stredni', g = k => cts[(gem ? 'g' : 'v') + k];
  const base = f ? g('F') : g('M');
  if (!cts.voiceAge) return [base];
  const aged = ['dite', 'teen', 'mlady'].includes(band) ? (f ? g('Fy') : g('My')) : ['senior1', 'senior2', 'senior3'].includes(band) ? (f ? g('Fs') : g('Ms')) : base;
  return [aged, base];
}
const ctFemale = v => /á$/.test(String(v.volajici.jmeno).trim().split(/\s+/).pop());
// krátké dvojité pípnutí: hlas je spojen, můžeš mluvit
function ctReadyBeep() {
  if (settings.sound === false) return;
  try {
    const ctx = ct.ringCtx = ct.ringCtx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume();
    const t = ctx.currentTime;
    for (const off of [0, 0.16]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1000; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001, t + off); g.gain.linearRampToValueAtTime(0.09, t + off + 0.01); g.gain.setValueAtTime(0.09, t + off + 0.09); g.gain.linearRampToValueAtTime(0, t + off + 0.11); o.start(t + off); o.stop(t + off + 0.12); }
  } catch (e) { /* zvuk není nutný */ }
}
// druh linky podle hovoru: pevná linka, mobil, u těžké úrovně (a občas i jinak) slabý signál
const ctLineOf = f => (f && f.aml && f.aml.typ === 'pevná' ? 'pevna' : Math.random() < (sim.s.liveCalls.level === 'tezke' ? 0.4 : 0.08) ? 'slaby' : 'mobil');
async function ctVoiceStart(facts, opts) {
  opts = opts || {};
  ct.vready = !!opts.tanr || !ctHasAi() || cts.mode === 'text'; ct.vdiag = null; ct.phoneKey = '';   // do spojení hlasu se čeká („Spojuji hlas“)
  const P = window.CT_PROMPTS, v = facts.view, tr = $('ct-textrow');
  tr.style.display = cts.mode === 'text' ? 'flex' : 'none'; $('ct-trwrap').hidden = cts.mode !== 'text'; if (!opts.resume && !opts.tanr) $('ct-trwrap').open = cts.mode === 'text';
  if (!ctHasAi()) { ct.vstatus = 'bez klíče OpenAI ani Gemini – hovor bez hlasu (nastavení v menu Calltaker)'; ct.vbad = true; return; }
  if (cts.mode === 'text') { ct.vstatus = 'textový režim'; if (!opts.tanr) ctTrAdd('sys', opts.resume ? 'Spojení obnoveno.' : 'Hovor spojen. Pozdrav a nabírej (píšeš do pole níže).'); return; }
  let instr = P.callerSystem(v, true);
  if (opts.resume) instr += '\n\nPOKRAČOVÁNÍ HOVORU\n- Spojení se přerušilo a voláš zpět. Dosavadní hovor:\n' + ctTrSummary() + '\n- Navaž na to, nezačínej od začátku.';
  if (opts.tanr) {
    const st = ['pořád dělá masáž a bolí ho ruce', 'pacient pořád nereaguje a nedýchá', 'asi se mu zlepšila barva, ale pořád nereaguje', 'pochybuješ, jestli masáž děláš dobře', 'jsi unavený a ptáš se, jestli můžeš na chvilku přestat', 'něco se změnilo: pacient teď slabě dýchá'][Math.floor(Math.random() * 6)];
    instr += `\n\nKONTROLNÍ HOVOR (TANR)\n- Od posledních pokynů uplynulo ${opts.tanr.min} minut a calltaker ti volá zpět zkontrolovat stav. Aktuální stav: ${st}. Stručně to řekneš a ptáš se, kdy už dojedou.\n- Dosavadní hovor:\n${ctTrSummary()}`;
  }
  // hlavní poskytovatel, a když se nespojí, záloha (OpenAI ↔ Gemini)
  const call = ct.call, provs = ctProvs(), line = ctLineOf(facts); let h = null;
  for (let i = 0; i < provs.length; i++) {
    const p = provs[i], gem = p === 'gemini', last = i === provs.length - 1;
    if (ct.call !== call || ct.ended) break;
    if (i > 0) { ct.vstatus = ctProvName(provs[i - 1]) + ' nejde (' + ((h && h.error) || 'chyba') + '), zkouším ' + ctProvName(p) + '…'; ct.vbad = false; ct.vready = !!opts.tanr; ct.phoneKey = ''; }
    h = await ZOS_LIVE[gem ? 'connectGemini' : 'connect']({
      key: gem ? cts.gkey : cts.key, model: gem ? cts.gModel : cts.vModel, voices: ctVoiceChain(facts, gem), instructions: instr, filter: cts.filt, line, record: cts.rec,
      onStatus: (t, bad) => { if (ct.call !== call) return; ct.vstatus = t; ct.phoneKey = ''; if (bad && !last && !(h && h.ready)) return; ct.vbad = !!bad; if (bad) ct.vready = true; },
      onReady: d => { if (ct.call === call) { ct.vready = true; call.talkAt = sim.s.t; ct.vdiag = d || null; ct.vstatus = '● spojeno za ' + (d && d.session != null ? String(d.session).replace('.', ',') + ' s' : '') + (gem ? ' (Gemini)' : ''); ct.vbad = false; ct.phoneKey = ''; ctReadyBeep(); } },
      onTranscript: (role, d) => { if (ct.call === call) ctTrDelta(role, d); },
      onLost: () => { if (ct.call === call) { ct.vstatus = 'spojení se přerušilo'; ct.vbad = true; ct.vready = true; ct.phoneKey = ''; } },
    });
    if (h && !h.failed) break;
  }
  if (ct.call === call && !ct.ended) ct.voice = h; else if (h) h.stop();
}
// ---------- TANR: předání s kontrolními hovory ----------
function ctTanrStart() {
  const call = ct.call; if (!call || !call.caseId || ct.tanr || ct.ended) return;
  const v = ct.voice; ct.voice = null;
  if (v) v.close().then(r => { if (r && r.wav) (ct.wavs = ct.wavs || []).push(r.wav); }).catch(() => {});
  ct.tanr = { since: sim.s.t, nextCheck: sim.s.t + 180, checkUntil: 0 }; ct.vstatus = 'hlas zavřen'; ct.phoneKey = '';
  ctTrAdd('sys', 'TANR: volající pokračuje podle pokynů, hlas je zavřený.');
  toast('TANR běží, čas se zrychlí. Kontrola za 3 minuty hry.', '');
}
function ctTanrCheck() {
  const call = ct.call; if (!call || !ct.tanr || ct.voice || ct.ended) return;
  const facts = ct.facts[call.id], min = Math.max(1, Math.round((sim.s.t - ct.tanr.since) / 60));
  ct.tanr.nextCheck = sim.s.t + 180; ct.tanr.checkUntil = performance.now() + 50000; ct.vstatus = 'kontrolní hovor…'; ct.phoneKey = '';
  ctTrAdd('sys', `Kontrolní hovor po ${min} min.`);
  ctVoiceStart(facts, { tanr: { min } });
  if (cts.mode === 'text' || !ctHasAi()) ct.tanr.checkUntil = 0;
}
function ctTanrEndCheck() {
  const v = ct.voice; ct.voice = null; ct.vstatus = 'hlas zavřen'; ct.phoneKey = '';
  if (v) v.close().then(r => { if (r && r.wav) (ct.wavs = ct.wavs || []).push(r.wav); }).catch(() => {});
}
function ctTanrTick() {
  const call = ct.call, c = call.caseId ? sim.caseOf(call.caseId) : null;
  if (c && (c.arrived || c.status === 'closed')) { ct.tanr = null; toast('Posádka dorazila k pacientovi, hovor předán.', ''); ctHangup(); return; }
  if (ct.voice && ct.tanr.checkUntil && performance.now() > ct.tanr.checkUntil) ctTanrEndCheck();
  if (!ct.voice && sim.s.t >= ct.tanr.nextCheck && !ct.tanr.busy) ctTanrCheck();
}
function ctTrAdd(who, text) { const d = document.createElement('div'); d.className = who; d.textContent = text; $('ct-tr').appendChild(d); d.scrollIntoView({ block: 'end' }); return d; }
function ctTrDelta(role, text) {
  if (ct.curRole !== role) { ct.curRole = role; ct.curTr = { role, text: '' }; ct.transcript.push(ct.curTr); ct.curEl = ctTrAdd(role === 'calltaker' ? 'me' : 'them', ''); }
  ct.curTr.text += text; ct.curEl.textContent = ct.curTr.text;
}
async function ctSay() {
  const inp = $('ct-say'), t = inp.value.trim(); if (!t || ct.busy || !ct.call || ct.ended) return;
  const facts = ct.facts[ct.call.id]; inp.value = ''; ctTrAdd('me', t); ct.transcript.push({ role: 'calltaker', text: t }); ct.msgs.push({ role: 'user', content: t }); ct.busy = true;
  try {
    const tx = await ctText(), rep = await ZOS_LIVE.chat(tx.key, tx.model, window.CT_PROMPTS.callerSystem(facts.view), ct.msgs, null, tx.gem);
    ct.msgs.push({ role: 'assistant', content: rep });
    const end = /\[KONEC\]/.test(rep), shown = rep.replace(/\[KONEC\]/g, '').trim();
    ct.transcript.push({ role: 'volajici', text: shown }); ctTrAdd('them', shown);
    if (end) { ct.busy = false; ctHangup(); return; }
  } catch (e) { ct.vstatus = 'Chyba API: ' + e.message; ct.vbad = true; ct.msgs.pop(); ct.transcript.pop(); }
  ct.busy = false;
}
function ctMute() { if (ct.voice && !ct.ended) { ct.muted = !ct.voice.mute(); ct.phoneKey = ''; } }
async function ctHangup() {
  const call = ct.call; if (!call || ct.ended) return;
  const voice = ct.voice; ct.voice = null; ct.ended = true; ct.tanr = null; ct.dropAt = null; ct.phoneKey = '';
  if (call.state === 'dropped') { sim.s.calls.forEach(x => { if (x.id === call.id) { x.state = 'taken'; } }); }
  ctZapisZjisteno(call);
  sim.endCall(call.id);
  ct.vstatus = ''; $('ct-textrow').style.display = 'none';
  $('ct-sendinfo').textContent = call.caseId ? 'Hovor ukončen. Případ můžeš ještě doplnit a znovu odeslat (Aktualizovat případ).' : 'Hovor ukončen. Případ ještě odešli dispečerovi.';
  if (voice) { try { const r = await voice.close(); ct.usage = (ct.usage || 0) + (r.usage || 0); if (r.wav) (ct.wavs = ct.wavs || []).push(r.wav); } catch (e) { /* ignore */ } }
  render();
}
function ctFinish() {
  const call = ct.call; if (!call) return;
  const facts = ct.facts[call.id], form = ctReadForm(), transcript = ct.transcript.slice();
  ctZapisZjisteno(call);
  if (!ct.ended) { ct.ended = true; sim.endCall(call.id); }
  const hc = sim.finishCall(call.id);
  const rec = { call: hc || call, facts, form, transcript, wavs: (ct.wavs || []).slice(), usage: ct.usage || 0, cls: ct.cls };
  ct.call = null; ct.ended = false; ct.phoneKey = ''; ct.wavs = []; ct.usage = 0; ct.tanr = null;
  ct.lastRes = rec; window._ctRes = rec; (ct.recs || (ct.recs = [])).push(rec);
  document.body.classList.add('ct-spider-off'); layoutApply(true);
  toast('Hovor dokončen. Rozbor najdeš v telefonním pruhu (tlačítko Rozbor hovoru).', '');
  render();
}

// ---------- formulář ↔ engine ----------
function ctReadForm() { return kiReadForm(); }
function ctReadFormOld() {
  ctAddrSync();
  const p = ct.pt, cls = ct.cls, v = ctVal('ctf-pVek'), num = Number(v), ch = id => { const e = $(id); return !!(e && e.checked); };
  const zdroj = p ? p.src : ctVal('ctf-adresa') ? 'adresa' : '', pc = Number(ctVal('ctf-pocet'));
  return {
    adresa: ctVal('ctf-adresa'), bod: p && p.src !== 'adresa' ? { lat: p.lat, lon: p.lon } : null, zdroj, cast: ctVal('ctf-cast'), upresneni: ctVal('ctf-upresneni'),
    vJmeno: ctVal('ctf-vJmeno'), vPrijmeni: ctVal('ctf-vPrijmeni'), vTelefon: ctVal('ctf-vTel'), vVztah: ctVal('ctf-vVztah'),
    pJmeno: ctVal('ctf-pJmeno'), pPrijmeni: ctVal('ctf-pPrijmeni'), pPohlavi: ctVal('ctf-pPohlavi'), pRok: num > 1900 ? num : '', pVek: v && num <= 130 ? num : '',
    cihla: !!(cls && cls.cihla), klasif: cls ? cls.klasif : '', priznaky: cls ? cls.priznaky.slice() : [], n: cls ? String(cls.n) : '', dyn: cls ? cls.dyn : null, popis: ctVal('ctf-popis'), poznamka: ctVal('ctf-poznamka'),
    agPcr: ch('ctf-agPcr'), agHzs: ch('ctf-agHzs'), nebezpeci: ch('ctf-nebezpeci'), pocet: pc > 0 ? pc : '', slucitS: ctVal('ctf-sluc'),
  };
}
function ctSend(pre) {
  const call = ct.call; if (!call) return;
  const form = ctReadForm(), info = $('ct-sendinfo');
  const miss = kiMissing(form, pre); if (miss.length) { kiMissingModal(miss); return; }
  if (pre) { form.n = '1'; form.predpoplach = true; }
  else if (form.n === '4') { info.textContent = 'N4 (plánované převozy, technické jízdy) se z příjmu hovoru neodesílá.'; toast('N4 se z příjmu hovoru neodesílá.', 'warn'); return; }
  const first = !call.caseId, c = sim.sendCall(call.id, form);
  if (!c) { info.textContent = 'Odeslání se nepodařilo.'; return; }
  if (c.noDispatch) { info.textContent = 'Dispečer: z hovoru nevzniká případ, výjezd není indikován.'; toast('Dispečer nevidí důvod k výjezdu.', 'warn'); return; }
  $('ct-sendbtn').textContent = 'Aktualizovat případ';
  if (form.slucitS && call.merged) { info.textContent = 'Hovor sloučen s případem ' + c.num + '.'; toast('Hovor sloučen s případem ' + c.num + '.', ''); return; }
  info.textContent = (first ? (pre ? 'Předpoplach odeslán (' + c.num + '): doplň údaje a pošli aktualizaci' : 'Předáno dispečerovi (' + c.num + ')') : 'Případ aktualizován') + ' v ' + sim.clock() + (cts.bot ? '' : ' – bot je vypnutý, obsluž případ v dispečerských oknech');
  toast(first ? (pre ? 'N1 předpoplach ' + c.num + ' odeslán.' : 'Případ ' + c.num + ' odeslán dispečerovi.') : 'Případ ' + c.num + ' aktualizován.', '');
  if (!cts.bot && !cts.disp) { cts.disp = true; ctSaveSettings(); ctSync(); layoutApply(true); }
}
function ctUseAbonent() {
  const f = ct.call && ct.facts[ct.call.id], ab = f && f.aml.abonent; if (!ab) return;
  ctAddrFromText(ab.adresa); ct.addrAuto = false; ctFind();
}
// rozbor hovoru na vyžádání (okno výsledku)
function ctRozbor() { if (ct.lastRes) ctResultModal(ct.lastRes); }
function ctPrehled() {
  const s = sim.s, calls = s.calls.filter(c => ['done', 'wrap', 'taken'].includes(c.state)), mine = s.cases.filter(c => c.call), pct = (a, b) => (b ? Math.round(a / b * 100) + ' %' : '–');
  const sec = calls.filter(c => c.sentAt != null && c.pickedAt != null).map(c => c.sentAt - c.pickedAt), avg = sec.length ? Math.round(sec.reduce((a, b) => a + b, 0) / sec.length) : null;
  const ck = mine.map(c => c.call.check).filter(Boolean), sk = mine.map(c => c.call.skore).filter(Boolean);
  const nOk = ck.filter(x => x.n.ok).length, kOk = ck.filter(x => x.klasif.ok).length, pOk = mine.filter(c => !c.call.miss && !c.call.searchDelay).length;
  const under = mine.filter(c => c.call.typedN > c.call.truthN).length, over = mine.filter(c => c.call.typedN < c.call.truthN).length;
  const miss = s.calls.filter(c => c.state === 'missed').length, bez = calls.filter(c => c.kind === 'bez'), bezOk = bez.filter(c => !c.wrongSend).length, dup = calls.filter(c => c.kind === 'dup'), dupOk = dup.filter(c => c.merged).length;
  const agMiss = mine.filter(c => (c.agLate || []).length).length, rvLate = mine.filter(c => c.rvLater && !c.rvNeed && c.call.truth.rvNeed).length;
  const avgSc = sk.length ? Math.round(sk.reduce((a, x) => a + x.total, 0) / sk.length) : null;
  const row = (l, v) => `<tr><td>${l}</td><td><b>${v}</b></td></tr>`;
  modal(`<div class="card home ct-form ct-card" style="max-width:560px"><h2 style="margin:0">Přehled směny</h2><div class="ct-note">${sim.clock()} · úroveň ${{ zacatecnik: 'začátečník', bezne: 'běžné', tezke: 'těžké' }[s.liveCalls.level]}</div>
    <table class="ct-t">${row('Odeslané případy', mine.length)}${row('Zmeškané hovory', miss)}${row('Průměrný čas do odeslání', avg == null ? '–' : avg + ' s')}${row('Průměrné body za hovor', avgSc == null ? '–' : avgSc + ' z 100')}
    ${row('Správná naléhavost', pct(nOk, ck.length))}${row('Správná klasifikace', pct(kOk, ck.length))}${row('Poloha do tolerance', pct(pOk, mine.length))}
    ${row('Podhodnocená N / nadhodnocená N', under + ' / ' + over)}${row('Chybějící PČR/HZS v hovoru', agMiss)}${row('Lékař vyžádán až na místě', rvLate)}
    ${row('Hovory bez výjezdu správně vyřízené', bez.length ? bezOk + ' z ' + bez.length : '–')}${row('Duplicitní hovory sloučené', dup.length ? dupOk + ' z ' + dup.length : '–')}</table>
    <div class="foot"><button class="btn pri" data-act="close">Zavřít</button></div></div>`);
}
function ctClsHtml() {
  const e = $('ct-cls'); if (!e) return; const c = ct.cls;
  e.innerHTML = c ? `<b>${esc(c.klasif)}</b><span class="ct-n n${c.n}">N${c.n}</span>${c.dyn ? '<span class="ct-n" style="background:#e0369f">dynamická indikace</span>' : ''}${c.cihla ? `<span class="ct-note">posádka: <b>${esc(c.crew || '–')}</b></span><span class="ct-note">${esc((c.lines || []).join(' · ').slice(0, 160))}</span>` : `<span class="ct-note">${esc(c.priznaky.map(CT_SPIDER.strip).slice(0, 8).join(', '))}${c.priznaky.length > 8 ? '…' : ''}</span>`}` : '<span class="ct-note">Zatím neklasifikováno – otevři pavouka.</span>';
}

// ---------- pavouk (okno) ----------
function ctSpiderOpen() {   // klasifikace je přímo v obrazovce Náběr případu
  if (!layoutDesktop()) { view = 'intake'; render(); }
  const e = $('ki-klasif'); if (e) e.focus();
}
function ctSpiderRender() {
  const e = $('ct-spider'); if (!e) return;
  const sp = ctSpiderInst(), ans = ct.sp.ans, p = sp.page(ans);
  if (sp.cihly) { e.innerHTML = ctCihlyHtml(sp, ans, p); return; }
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
  if (r.cihla) {
    if (r.planovane) { toast('N4 (plánované převozy, technické jízdy) se z příjmu hovoru neodesílá.', 'warn'); return; }
    ct.cls = { klasif: r.klasif, n: r.n, dyn: r.dyn, priznaky: [], cihla: true, crew: r.crew, kind: r.kind, cmp: r.cmp, lines: r.lines, nSuggested: r.n };
    ctClsHtml(); toast('Klasifikace předána do nabírání: ' + r.klasif + ', N' + r.n + (r.dyn ? ' (dynamická indikace)' : ''), '');
    if (layoutDesktop()) { document.body.classList.add('ct-spider-off'); layoutApply(true); } else { view = 'intake'; }
    render(); return;
  }
  const n = ct.sp.n || r.n, dyn = ct.sp.dyn == null ? r.dyn : ct.sp.dyn;
  ct.cls = { klasif: r.klasif, n, dyn, priznaky: r.symptoms.filter(s => !/DYNAMICKÁ INDIKACE/i.test(s)).concat(dyn ? ['DYNAMICKÁ INDIKACE'] : []), nSuggested: r.n };
  for (const [k, id] of [['PČR', 'ctf-agPcr'], ['HZS', 'ctf-agHzs']]) { const e = $(id); if (e && ct.cls.priznaky.some(x => new RegExp(k, 'i').test(x))) e.checked = true; }
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
      + (ck.priznaky.cihla ? '' : row('Příznaky', ck.priznaky.jaccard >= 0.5, `shoda ${Math.round(ck.priznaky.jaccard * 100)} % (${ck.priznaky.typed} zadáno, ${ck.priznaky.truth} skutečných)`)) + row('Věk pacienta', ck.vek.ok, `zadáno ${ck.vek.typed == null ? '–' : ck.vek.typed}, správně <b>${ck.vek.truth}</b>`)
      + row('Jméno pacienta', ck.jmena.pacient, esc(k.pacient)) + row('Jméno volajícího', ck.jmena.volajici, esc(f.view.volajici.jmeno))
      + row('Poloha', cc.miss ? false : ck.bodM <= ck.tol, `${ck.bodM} m od pravdy (tolerance ${ck.tol} m), zdroj ${esc(ck.zdroj)}${ck.aml ? ', použit AML' : ''}`);
  }
  const cons = !c ? '<p class="ct-note bad">Hovor byl ukončen bez odeslání případu dispečerovi (−20 b.).</p>' : `<ul style="margin:4px 0;padding-left:18px;font-size:12.5px"><li>${cc.miss ? `<b>Poloha mimo toleranci o ${cc.errM} m: posádka jela na zadané místo, nenašla pacienta a hledala.</b>` : cc.searchDelay ? `Bod vedle o ${cc.errM} m: posádka pacienta chvíli hledala (+${cc.searchDelay} s).` : cc.unlocatable ? 'Adresu se nepodařilo najít, dispečer ji dohledával.' : 'Poloha sedí, posádka jela správně.'}</li><li>Naléhavost ${cc.typedN === cc.truthN ? 'sedí' : `zadána N${cc.typedN}, skutečně N${cc.truthN}`}${cc.conflict ? ' · adresa a bod z mapy se rozcházely, přednost měl bod' : ''}</li><li>Doplnění po odeslání: ${cc.updates}×${cc.sec != null ? ', hovor ' + cc.sec + ' s' : ''}</li></ul>`;
  const typedPt = c ? (cc.bod ? { lat: cc.bod.lat, lon: cc.bod.lon, tol: cc.tol } : (() => { const g = sim._ctGeocode(cc.typed, { lat: k.lat, lon: k.lon }); return g.quality ? { lat: g.lat, lon: g.lon, tol: cc.tol } : null; })()) : null;
  const ph = f.aml.phases, aml = ph.length > 1 ? ph[ph.length - 1] : null;
  window._ctRes = rec;
  const sk = cc && cc.skore, kindTxt = (rec.call.kind || 'vyjezd') === 'bez' ? `<p class="ct-note"><b>Hovor nevyžadoval výjezd</b> (${esc(k.spravne || '')}). ${rec.call.wrongSend ? 'Případ byl zbytečně odeslán.' : 'Správně nevysláno.'}</p>`
    : rec.call.kind === 'dup' ? `<p class="ct-note"><b>Další volající k téže události.</b> ${rec.call.merged ? 'Správně sloučeno s případem.' : 'Nebyl sloučen, vznikl duplicitní případ.'}</p>`
      : rec.call.kind === 'opak' ? '<p class="ct-note"><b>Opakovaný hovor</b> k již odeslanému případu.</p>' : '';
  const scoreHtml = sk ? `<h3 style="margin:8px 0 2px;font-size:13px">Body za hovor: ${sk.total} z ${sk.max}</h3><table class="ct-t"><tr><td>Čas do odeslání (${sk.sec} s, cíl ${sk.lim} s)</td><td>${sk.cas} / 20</td></tr><tr><td>Naléhavost</td><td>${sk.n} / 20</td></tr><tr><td>Klasifikace</td><td>${sk.kl} / 15</td></tr><tr><td>Příznaky</td><td>${sk.pr} / 15</td></tr><tr><td>Poloha</td><td>${sk.pol} / 15</td></tr><tr><td>Věk, dynamická, PČR/HZS</td><td>${sk.vek + sk.dyn + sk.ag} / 15</td></tr></table><p class="ct-note">Kompletnost dotazů, instrukce a empatie hodnotí Analýza hovoru (AI).</p>` : '';
  const wavBtns = (rec.wavs || []).map((w, i) => `<button class="btn" data-act="ct-dl-wav" data-i="${i}">Nahrávka WAV${rec.wavs.length > 1 ? ' ' + (i + 1) : ''}</button>`).join('');
  modal(`<div class="card home ct-form ct-card" style="max-width:640px"><h2 style="margin:0">Rozbor hovoru</h2><div class="ct-note">${esc(f.view.volajici.jmeno)} · ${esc(k.klasifikace)}, N${String(k['naléhavost']).replace('N', '')} · ${esc(k.adresa)}</div>
    ${kindTxt}${scoreHtml}
    ${tb ? `<h3 style="margin:6px 0 2px;font-size:13px">Kontrola klasifikace</h3><table class="ct-t">${tb}</table>` : ''}
    <h3 style="margin:8px 0 2px;font-size:13px">Následky v simulaci</h3>${cons}
    <h3 style="margin:8px 0 2px;font-size:13px">Zadaný a skutečný bod</h3>${ctMiniMap({ lat: k.lat, lon: k.lon }, typedPt, aml)}
    <div id="ct-analyza" style="margin-top:8px"></div>
    <div class="foot" style="margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="ct-analyza"${ctHasAi() ? '' : ' disabled title="Potřebuje klíč OpenAI nebo Gemini v menu Calltaker"'}>Analýza hovoru (AI)</button><button class="btn" data-act="ct-dl-json">Stáhnout hovor (JSON)</button>${wavBtns}<button class="btn pri" data-act="close">Zavřít</button></div></div>`);
}
async function ctAnalyza() {
  const rec = window._ctRes, out = $('ct-analyza'); if (!rec) return;
  out.innerHTML = '<p class="ct-note">Vyhodnocuji…</p>';
  const tx = await ctText();   // textový model se zvolí sám, když není vybraný
  const P = window.CT_PROMPTS, f = rec.facts, txt = rec.transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
  const user = 'LIST FAKTŮ:\n' + JSON.stringify(f.view, null, 1) + '\n\nKEY:\n' + JSON.stringify(f.key, null, 1) + '\n\nFORMULÁŘ OD CALLTAKERA:\n' + JSON.stringify(rec.form) + '\n\nPŘEPIS:\n' + txt;
  let s;
  try { const o = await ZOS_LIVE.chat(tx.key, tx.model, P.analyzaSystem(), [{ role: 'user', content: user }], { response_format: { type: 'json_object' } }, tx.gem); const m = o.match(/\{[\s\S]*\}/); s = JSON.parse(m ? m[0] : o); } catch (e) { s = { chyba: e.message }; }
  rec.analyza = s;
  const list = o => '<ul style="margin:2px 0;padding-left:18px">' + Object.keys(o).filter(x => x !== 'komentar').map(x => `<li>${esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' '))}: ${Array.isArray(o[x]) ? esc(o[x].join('; ') || '–') : o[x] === true ? '✔' : o[x] === false ? '✘' : esc(o[x])}</li>`).join('') + '</ul>';
  out.innerHTML = s.chyba ? `<p class="ct-note bad">Analýza selhala: ${esc(s.chyba)}</p>` : (s.calltaker ? `<h3 style="font-size:13px;margin:4px 0">Analýza: calltaker</h3>${list(s.calltaker)}<p class="ct-note">${esc(s.calltaker.komentar || '')}</p>` : '') + (s.realismus_volajiciho ? `<h3 style="font-size:13px;margin:4px 0">Analýza: realismus volajícího</h3>${list(s.realismus_volajiciho)}<p class="ct-note">${esc(s.realismus_volajiciho.komentar || '')}</p>` : '');
}
function ctDownload(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }

// ---------- adresa: obec, ulice, číslo popisné s našeptávačem ----------
const CT_ADDR_F = ['ctf-obec', 'ctf-ulice', 'ctf-cp'];
const ctNk = x => String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
let ctAx = null;
// index z ZOS_ADDR: obec → ulice → čísla (staví se líně při prvním psaní)
function ctAddrIndex() {
  if (ctAx) return ctAx; const A = window.ZOS_ADDR; if (!A || !window.CT_ADDR) return null;
  return (ctAx = window.CT_ADDR.build(A));
}
function ctAddrSync() {
  const o = ctVal('ctf-obec'), u = ctVal('ctf-ulice'), n = ctVal('ctf-cp');
  const left = u ? u + (n ? ' ' + n : '') : n ? (/^ev/i.test(n) ? n : 'čp. ' + n) : '';
  ctSet('ctf-adresa', ct.okoli && !u && !n && o ? 'okolí obce ' + o : [left, o].filter(Boolean).join(', '));
}
function ctSetAddr(p) { ctSet('ctf-obec', p.obec || ''); ctSet('ctf-ulice', p.ulice || ''); ctSet('ctf-cp', p.cp || ''); ct.okoli = !!p.okoli; ctAddrSync(); }
// „Ulice 12, Obec“ / „čp. 12, Obec“ / „okolí obce Obec“ → tři pole
function ctAddrFromText(t) {
  t = String(t || '').trim(); const ok = t.match(/^okolí obce\s+(.+)$/i); if (ok) { ctSetAddr({ obec: ok[1].trim(), okoli: true }); return; }
  const parts = t.split(',').map(x => x.trim()).filter(Boolean), city = parts.length > 1 ? parts[parts.length - 1] : '', left = parts[0] || '';
  const cp = left.match(/^č\.?\s*p\.?\s*(\S+)$/i), m = left.match(/^(.*?)\s*(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)$/);
  if (!city) { ctSetAddr({ obec: left }); return; }
  ctSetAddr(cp ? { obec: city, cp: cp[1] } : m ? { obec: city, ulice: m[1].replace(/\s*č\.?\s*p\.?$/i, '').trim(), cp: m[2] } : { obec: city, ulice: left });
}
function ctSugList(field) {
  const ix = ctAddrIndex(); if (!ix) return [];
  const q = ctNk(ctVal('ctf-' + field)), town = ix.byNk.get(ctNk(ctVal('ctf-obec')));
  const rank = nk => (nk.startsWith(q) ? 0 : nk.split(' ').some(w => w.startsWith(q)) ? 1 : nk.includes(q) ? 2 : -1);
  const out = [];
  if (field === 'obec') {
    if (q) for (const t of ix.towns) { const r = rank(t.nk); if (r >= 0) out.push({ r, c: t.c, label: t.n, sub: t.okresNames && t.okresNames.length ? 'okres ' + t.okresNames.join(' / ') : '', v: t.n }); }
  } else if (field === 'ulice') {
    for (const t of town ? [town] : q.length >= 2 ? ix.towns : []) for (const st of t.streets.values()) {
      if (!st.n) continue; const r = q ? rank(st.nk) : 0; if (r >= 0) out.push({ r, c: st.c, label: st.n, sub: town ? '' : t.n, v: st.n, town: t.n });
    }
  } else if (town) {
    const un = ctNk(ctVal('ctf-ulice')), st = un ? [...town.streets.values()].find(x => x.nk === un) : town.streets.get('');
    // číslo se nabízí podle začátku celého čísla, kterékoli jeho části nebo opačného pořadí (70/401 ↔ 401/70)
    const numOk = nm => { if (!q) return true; const n = ctNk(nm), parts = n.split('/'); return n.startsWith(q) || parts.some(x => x.startsWith(q)) || parts.slice().reverse().join('/').startsWith(q); };
    if (st) for (const nm of st.nums) { if (numOk(nm)) out.push({ r: 0, c: 0, label: nm, v: nm }); }
    out.sort((x, y) => (parseInt(x.label, 10) || 0) - (parseInt(y.label, 10) || 0) || x.label.localeCompare(y.label, 'cs'));
    return out;
  }
  return out.sort((x, y) => x.r - y.r || y.c - x.c || x.label.localeCompare(y.label, 'cs'));
}
function ctSugMark() { const box = ct.sug && $('ct-sug-' + ct.sug.f); if (box) [...box.children].forEach((e, i) => e.classList.toggle('on', i === ct.sug.i)); }
function ctSugShow(field) {
  ctSugHide(); const box = $('ct-sug-' + field); if (!box) return;
  const list = ctSugList(field).slice(0, 8);
  ct.sug = { f: field, items: list, i: -1 };
  box.innerHTML = list.map((x, i) => `<div class="ct-si" data-act="ct-sug" data-f="${field}" data-i="${i}">${esc(x.label)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div>`).join('');
  box.hidden = !list.length;
}
function ctSugHide() { for (const f of ['obec', 'ulice', 'cp']) { const b = $('ct-sug-' + f); if (b) b.hidden = true; } ct.sug = null; }
function ctSugPick(field, i) {
  const x = ct.sug && ct.sug.f === field ? ct.sug.items[i] : null; if (!x) return;
  ctSet('ctf-' + field, x.v); if (field === 'ulice' && x.town) ctSet('ctf-obec', x.town);
  ct.addrAuto = false; ct.okoli = false; ctSugHide(); ctAddrSync();
  if (field === 'cp') { ctFind(); return; }
  const nx = $(field === 'obec' ? 'ctf-ulice' : 'ctf-cp'); if (nx) nx.focus();
}

// ---------- pavouk z cihliček ----------
const ctCrumb = (sp, a) => { const t = sp.T.get(a), b = sp.B.get(a); return t ? t.label : b ? b.klasif + ' N' + b.n : String(a); };
function ctBrickHtml(t, big) {
  const tag = (t.cmp ? ' CMP' : '') + (t.dyn ? ' · DI' : '');
  return `<span class="sp-bhead"><b class="sp-nb">N${t.n}${tag}</b><span class="sp-crew">${esc(t.crew || '')}</span><span class="sp-bk">${esc(t.label)}</span></span><span class="sp-lines">${t.lines.map(l => `<span>${esc(l)}</span>`).join('')}</span>`;
}
function ctCihlyHtml(sp, ans, p) {
  const crumbs = ans.length ? `<div class="sp-crumbs">${ans.map((a, i) => `<span role="button" data-act="ct-sp-crumb" data-i="${i}" style="cursor:pointer">${esc(ctCrumb(sp, a))}</span>`).join('')}</div>` : '';
  const leg = '<div class="sp-leg">' + ['n1', 'n2', 'n2di', 'n3', 'n4'].map(k => `<span class="sp-kind ${k}"><i class="sp-dot"></i>${esc(sp.KIND_LAB[k])}</span>`).join('') + '</div>';
  const back = '<div class="sp-act"><button class="btn" data-act="ct-sp-back">‹ Zpět</button><button class="btn" data-act="ct-sp-reset">Znovu</button></div>';
  let h = crumbs;
  if (p.step === 'indikace') {
    h += `<div class="sp-title">${esc(p.title)} <small class="ct-note">vyber stav nebo děj, potom cihlu podle toho, co volající říká</small></div>${leg}<div class="sp-tiles">`;
    let sh = null, g = null;
    for (const t of p.tiles) {
      if (t.sheet !== sh) { sh = t.sheet; g = null; h += `<div class="sp-sheet">${esc(t.sheetLabel)}</div>`; }
      if (t.group !== t.sheetLabel && t.group !== g) { g = t.group; h += `<div class="sp-grp">${esc(g)}</div>`; }
      h += `<button class="sp-tile" data-act="ct-sp-tile" data-id="${esc(t.id)}">${esc(t.label)}<span class="sp-dots">${t.kinds.map(k => `<span class="sp-kind ${k}"><i class="sp-dot"></i></span>`).join('')}</span></button>`;
    }
    return h + '</div>';
  }
  if (p.step === 'cihly') {
    h += `<div class="sp-title">${esc(p.title)} <small class="ct-note">klikni na cihlu, která odpovídá hovoru</small></div>${leg}`;
    for (const x of p.poznamky || []) h += `<div class="ct-note" style="padding:0 12px 4px">ⓘ ${esc(x)}</div>`;
    h += '<div class="sp-bricks">' + p.tiles.map(t => `<button class="sp-brick ${t.kind}" data-act="ct-sp-tile" data-id="${esc(t.id)}">${ctBrickHtml(t)}</button>`).join('') + '</div>';
    if (p.doprovod) h += `<details class="sp-dopr"><summary>${esc(p.doprovod.titul)}</summary><ul>${p.doprovod.polozky.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${p.doprovod.poznamky.map(x => `<p class="ct-note">${esc(x)}</p>`).join('')}</details>`;
    return h + back;
  }
  const r = sp.result(ans);
  h += `<div class="sp-res"><div class="sp-brick big ${r.kind}">${ctBrickHtml({ n: r.n, cmp: r.cmp, dyn: r.dyn, crew: r.crew, label: r.klasifExcel, lines: r.lines })}</div>
    <div class="ct-note" style="margin-top:6px">${r.dyn ? 'Dynamická indikace: jede RZP bez lékaře, na místě rozhodne o lékaři.' : r.n === 1 ? 'N1: vždy lékař a nejbližší RZP.' : ''}${r.planovane ? ' N4 se z příjmu hovoru neodesílá.' : ''}</div></div>
    <div class="sp-act"><button class="btn pri" data-act="ct-sp-use"${ct.call && !r.planovane ? '' : ' disabled'}>Použít do výzvy</button><button class="btn" data-act="ct-sp-back">‹ Zpět</button><button class="btn" data-act="ct-sp-reset">Znovu</button></div>${ct.call ? '' : '<p class="ct-note" style="padding:0 12px">Bez hovoru se pavouk jen prohlíží; do výzvy ho jde použít za hovoru.</p>'}`;
  return h;
}

// ---------- akce ----------
function ctTab(t) {
  ct.tab = t;
  for (const b of document.querySelectorAll('#ct-tabs button')) b.classList.toggle('on', b.dataset.t === t);
  $('ct-pane-intake').hidden = t !== 'intake'; $('ct-pane-mine').hidden = t !== 'mine';
  if (t === 'mine') { ct.lastCases = 0; ctCasesHtml(); }
}
function ctAct(a, el) {
  if (a.startsWith('ct-ki-')) { kiAct(a, el); return; }
  const d = el.dataset;
  switch (a) {
    case 'ct-menu': ctMenu(); break;
    case 'ct-models': ctLoadModels(); break;
    case 'ct-gem-test': ctGemTest(); break;
    case 'ct-start': ctStart(); break;
    case 'ct-when-preset': ctWhenCustom(); ctSet('ctm-hour', d.h); ctMenuSync(); break;
    case 'ct-home': homeModal(); break;
    case 'ct-pickup': ctPickup(); break;
    case 'ct-hangup': ctHangup(); break;
    case 'ct-tanr': ctTanrStart(); break;
    case 'ct-tanr-check': ctTanrCheck(); break;
    case 'ct-tanr-endcheck': ctTanrEndCheck(); break;
    case 'ct-n1': ctSend(true); break;
    case 'ct-use-abonent': ctUseAbonent(); break;
    case 'ct-rozbor': ctRozbor(); break;
    case 'ct-rozbor-i': { const r = (ct.recs || [])[Number(d.i)]; if (r) ctResultModal(r); break; }
    case 'ct-prehled': ctPrehled(); break;
    case 'ct-finish': ctFinish(); break;
    case 'ct-mute': ctMute(); break;
    case 'ct-tab': ctTab(d.t); break;
    case 'ct-send': ctSend(); break;
    case 'ct-say': ctSay(); break;
    case 'ct-use-aml': ctUseAml(); break;
    case 'ct-find': ctFind(); break;
    case 'ct-sug': ctSugPick(d.f, Number(d.i)); break;
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
    case 'ct-analyza': ctAnalyza(); break;
    case 'ct-dl-json': { const r = window._ctRes; if (r) ctDownload(new Blob([JSON.stringify({ seed: r.facts.view.seed, view: r.facts.view, key: r.facts.key, aml: r.facts.aml, transcript: r.transcript, form: r.form, analyza: r.analyza || null, kontrola: (r.call.caseId && sim.caseOf(r.call.caseId) && sim.caseOf(r.call.caseId).call) ? sim.caseOf(r.call.caseId).call.check : null }, null, 1)], { type: 'application/json' }), 'hovor-' + r.facts.view.seed + '.json'); break; }
    case 'ct-dl-wav': { const r = window._ctRes, i = Number(d.i || 0); if (r && r.wavs && r.wavs[i]) ctDownload(r.wavs[i].blob, 'hovor-' + r.facts.view.seed + (r.wavs.length > 1 ? '-' + (i + 1) : '') + '.wav'); break; }
  }
}
document.addEventListener('change', ev => { const t = ev.target; if (t && t.id === 'ct-sp-dyn') { ct.sp.dyn = t.checked; ctSpiderRender(); } });
document.addEventListener('input', ev => { const t = ev.target; if (t && CT_ADDR_F.includes(t.id)) { ct.addrAuto = false; ct.okoli = false; ctAddrSync(); ctSugShow(t.id.slice(4)); } });
document.addEventListener('focusin', ev => { const t = ev.target; if (t && CT_ADDR_F.includes(t.id) && ctModeOn()) ctSugShow(t.id.slice(4)); });
document.addEventListener('focusout', ev => { const t = ev.target; if (t && CT_ADDR_F.includes(t.id)) setTimeout(() => { if (!document.activeElement || !CT_ADDR_F.includes(document.activeElement.id)) ctSugHide(); }, 180); });
document.addEventListener('mousedown', ev => { if (ev.target.closest && ev.target.closest('.ct-sug')) ev.preventDefault(); });
document.addEventListener('keydown', ev => {
  const t = ev.target, sg = ct.sug;
  if (t && CT_ADDR_F.includes(t.id) && sg && sg.f === t.id.slice(4) && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) { ev.preventDefault(); sg.i = (sg.i + (ev.key === 'ArrowDown' ? 1 : -1) + sg.items.length) % sg.items.length; ctSugMark(); }
  else if (t && CT_ADDR_F.includes(t.id) && ev.key === 'Escape') ctSugHide();
});
document.addEventListener('keydown', ev => { const t = ev.target; if (ev.key === 'Enter' && t) { if (CT_ADDR_F.includes(t.id)) { ev.preventDefault(); const sg = ct.sug; if (sg && sg.f === t.id.slice(4) && sg.i >= 0) ctSugPick(sg.f, sg.i); else if (sg && sg.f === t.id.slice(4) && sg.items.length === 1) ctSugPick(sg.f, 0); else { ctSugHide(); ctFind(); } } else if (t.id === 'ct-say') { ev.preventDefault(); ctSay(); } } });
document.addEventListener('keydown', ev => {
  if (!ctModeOn() || !ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const m = { KeyZ: 'ct-pickup', Digit1: 'ct-n1', KeyO: 'ct-send', KeyP: 'ct-spider-open', KeyU: 'ct-hangup', KeyD: 'ct-finish', KeyM: 'ct-mute' }[ev.code];
  if (!m) return;
  ev.preventDefault(); if (modalOpen && m !== 'ct-pickup') return; ctAct(m, { dataset: {} });
});
window.addEventListener('beforeunload', () => { if (ct.voice) ct.voice.stop(); });
