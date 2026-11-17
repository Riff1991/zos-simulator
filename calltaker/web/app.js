(function () {
  const $ = id => document.getElementById(id);
  const P = window.CT_PROMPTS, CHK = window.CT_CHECK, CASES = window.CT_CASES;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  let cur = null, msgs = [], transcript = [], busy = false, ended = false, mode = 'voice', vc = null;

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const key = () => $('key').value.trim();
  const model = () => $('model').value.trim();
  function status(t, bad) { $('status').textContent = t || ''; $('status').className = bad ? 'bad' : ''; }

  async function oa(path, body) {
    const r = await fetch('https://api.openai.com/v1' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key() }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return j;
  }
  async function chat(system, history, opts) {
    const body = Object.assign({ model: model(), messages: [{ role: 'system', content: system }].concat(history), max_completion_tokens: 1500 }, opts || {});
    const j = await oa('/chat/completions', body);
    return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
  }

  async function loadModels() {
    if (!key()) { status('Nejdřív vlož API klíč.', true); return; }
    status('Načítám modely…');
    try {
      const j = await oa('/models');
      const ids = j.data.map(m => m.id).filter(id => /^(gpt-|o\d|chatgpt)/.test(id) && !/realtime|audio|tts|transcribe|image|embedding|search|moderation|codex|instruct|preview|dall|whisper|\d{4}-\d{2}-\d{2}$/.test(id)).sort();
      const pref = ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-5'];
      const best = pref.find(p => ids.includes(p)) || ids[0] || '';
      $('modelList').innerHTML = ids.map(i => '<option value="' + esc(i) + '">').join('');
      if (!$('model').value) $('model').value = best;
      status('Modelů: ' + ids.length + (best ? '. Vybrán ' + best + ' (lze změnit).' : '.'));
      return true;
    } catch (e) { status('Klíč nebo síť: ' + e.message, true); }
  }

  function newCall() {
    if (!key() || !model()) { status('Vlož klíč a vyber model (tlačítko Načíst modely).', true); return; }
    if ($('remember').checked) { store.set('ct_key', key()); store.set('ct_model', model()); } else store.del('ct_key');
    stopVoice();
    cur = CASES[Math.floor(Math.random() * CASES.length)];
    msgs = []; transcript = []; ended = false;
    $('log').innerHTML = ''; $('form').hidden = true; $('result').hidden = true; $('call').hidden = false; $('setup').open = false;
    $('ani').textContent = cur.view.volajici.telefon + ' · ' + cur.view.volajici.linka + ' · hovor č. ' + cur.view.seed;
    mode = document.querySelector('input[name=mode]:checked').value;
    $('textrow').hidden = mode === 'voice'; $('vctl').hidden = mode !== 'voice'; $('live').textContent = ''; $('mute').textContent = 'Ztlumit mikrofon';
    $('say').disabled = mode === 'voice'; $('send').disabled = mode === 'voice'; $('end').disabled = false; $('say').value = '';
    bubble('sys', 'Příchozí hovor. Zvedni linku a pozdrav (např. „Zdravotnická záchranná služba, co se stalo?“).');
    status('');
    if (mode === 'voice') startVoice(); else $('say').focus();
  }
  function bubble(who, text) {
    const d = document.createElement('div'); d.className = 'b ' + who; d.textContent = text; $('log').appendChild(d); d.scrollIntoView({ block: 'end' });
  }
  async function send() {
    const t = $('say').value.trim(); if (!t || busy || ended) return;
    $('say').value = ''; bubble('me', t); transcript.push({ role: 'calltaker', text: t }); msgs.push({ role: 'user', content: t });
    busy = true; $('send').disabled = true; status('Volající odpovídá…');
    try {
      const rep = await chat(P.callerSystem(cur.view), msgs);
      msgs.push({ role: 'assistant', content: rep });
      const end = /\[KONEC\]/.test(rep), shown = rep.replace(/\[KONEC\]/g, '').trim();
      transcript.push({ role: 'volajici', text: shown }); bubble('them', shown); status('');
      if (end) endCall();
    } catch (e) { status('Chyba API: ' + e.message, true); msgs.pop(); transcript.pop(); }
    busy = false; $('send').disabled = ended; if (!ended) $('say').focus();
  }
  async function endCall() {
    if (ended) return;
    ended = true; $('say').disabled = true; $('send').disabled = true; $('end').disabled = true;
    if (mode === 'voice') { status('Ukončuji hovor…'); await closeVoice(); }
    $('form').hidden = false; $('form').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- hlas: OpenAI GPT-Live přes WebRTC ----------
  const isFemale = v => /á$/.test(String(v.volajici.jmeno).trim().split(/\s+/).pop());
  function waitIce(pc) {
    return new Promise((resolve, reject) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const t = setTimeout(() => { pc.removeEventListener('icegatheringstatechange', on); reject(new Error('Vypršel čas při zjišťování sítě (ICE).')); }, 10000);
      function on() { if (pc.iceGatheringState !== 'complete') return; clearTimeout(t); pc.removeEventListener('icegatheringstatechange', on); resolve(); }
      pc.addEventListener('icegatheringstatechange', on);
    });
  }
  // telefonní linka: pásmo 320–3300 Hz, jemné zkreslení, komprese a tichý šum
  function phoneChain(c, stream) {
    const AC = window.AudioContext || window.webkitAudioContext, ctx = c.ctx = new AC(); ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320; hp.Q.value = 0.8;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300; lp.Q.value = 0.9;
    const ws = ctx.createWaveShaper(), n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.8); }
    ws.curve = curve;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -28; comp.ratio.value = 6;
    const out = ctx.createGain(); out.gain.value = 1.3;
    src.connect(hp); hp.connect(lp); lp.connect(ws); ws.connect(comp); comp.connect(out); out.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1500; nf.Q.value = 0.4;
    const ng = ctx.createGain(); ng.gain.value = 0.012;
    ns.connect(nf); nf.connect(ng); ng.connect(ctx.destination); ns.start();
  }
  function attachAudio(c, ev) {
    const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
    c.audio = new Audio(); c.audio.srcObject = stream;
    if ($('filt').checked) { c.audio.muted = true; phoneChain(c, stream); }   // element musí hrát (ztlumený), aby proud šel do Web Audio
    c.audio.play().catch(() => status('Klikni kamkoli na stránku, aby se přehrál zvuk.', true));
  }
  function addDelta(c, role, cls, text) {
    if (c.curRole !== role) { c.curRole = role; c.curTr = { role, text: '' }; transcript.push(c.curTr); c.curEl = document.createElement('div'); c.curEl.className = 'b ' + cls; $('log').appendChild(c.curEl); }
    c.curTr.text += text; c.curEl.textContent = c.curTr.text; c.curEl.scrollIntoView({ block: 'end' });
  }
  function onVoiceEvent(c, raw) {
    let ev; try { ev = JSON.parse(raw); } catch (e) { return; }
    switch (ev.type) {
      case 'session.started': c.ready = true; c.id = ev.session && ev.session.id; $('live').textContent = '● spojeno'; status('Hovor spojen. Zvedni linku a pozdrav.'); break;
      case 'session.input_transcript.delta': addDelta(c, 'calltaker', 'me', ev.delta || ''); break;
      case 'session.output_transcript.delta': addDelta(c, 'volajici', 'them', ev.delta || ''); break;
      case 'session.usage.updated': if (ev.usage && ev.usage.seconds != null) c.usage = ev.usage.seconds; break;
      case 'session.closed': c.closed = true; if (ev.usage && ev.usage.seconds != null) c.usage = ev.usage.seconds; if (c.onClosed) c.onClosed(); break;
      case 'error': status('Chyba hlasového API: ' + ((ev.error && ev.error.message) || ev.message || raw.slice(0, 200)), true); break;
      default: if (window.console) console.debug('live event', ev.type);
    }
  }
  async function startVoice() {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) { status('Prohlížeč nepodporuje mikrofon/WebRTC (zkus Chrome nebo Edge).', true); return; }
    status('Připojuji hovor…');
    const v = cur.view, voice = (isFemale(v) ? $('vF').value : $('vM').value).trim() || 'marin';
    const c = vc = { ready: false, closed: false, usage: 0 };
    try {
      c.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (vc !== c) { c.mic.getTracks().forEach(t => t.stop()); return; }
      c.pc = new RTCPeerConnection();
      c.pc.addEventListener('track', ev => attachAudio(c, ev));
      c.mic.getAudioTracks().forEach(t => c.pc.addTrack(t, c.mic));
      c.dc = c.pc.createDataChannel('oai-events');
      c.dc.addEventListener('message', ev => onVoiceEvent(c, ev.data));
      c.dc.addEventListener('close', () => { if (!c.closed && !ended && vc === c) status('Spojení se přerušilo.', true); });
      await c.pc.setLocalDescription(await c.pc.createOffer());
      await waitIce(c.pc);
      const mk = name => oa('/live/sessions', { session: { model: 'gpt-live-1', instructions: P.callerSystem(v, true), audio: { output: { voice: name } } }, transport: { type: 'webrtc', sdp: c.pc.localDescription.sdp } });
      let res;
      try { res = await mk(voice); } catch (e) {
        if (/voice/i.test(e.message) && voice !== 'marin') { status('Hlas „' + voice + '“ nelze použít, zkouším marin…'); res = await mk('marin'); } else throw e;
      }
      await c.pc.setRemoteDescription({ type: 'answer', sdp: res.transport.sdp });
    } catch (e) { status('Hlas se nepodařilo spojit: ' + e.message, true); stopVoice(c); }
  }
  function stopVoice(c) {
    c = c || vc; if (!c) return;
    try { c.mic && c.mic.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
    try { c.dc && c.dc.close(); } catch (e) { /* ignore */ }
    try { c.pc && c.pc.close(); } catch (e) { /* ignore */ }
    try { if (c.audio) c.audio.srcObject = null; } catch (e) { /* ignore */ }
    try { c.ctx && c.ctx.close(); } catch (e) { /* ignore */ }
    if (vc === c) vc = null;
  }
  function closeVoice() {
    const c = vc; if (!c) return Promise.resolve();
    return new Promise(res => {
      const fin = () => { const u = c.usage; stopVoice(c); $('live').textContent = ''; if (u) status('Hovor trval ' + Math.round(u) + ' s, hlas ≈ ' + (u / 60 * 0.05).toFixed(3) + ' $.'); else status(''); res(); };
      if (!c.ready || c.closed || !c.dc || c.dc.readyState !== 'open') return fin();
      c.onClosed = fin; setTimeout(fin, 6000);
      try { c.dc.send(JSON.stringify({ type: 'session.close' })); } catch (e) { fin(); }
    });
  }
  async function judgeCall() {
    const form = { adresa: $('fAdr').value.trim(), n: $('fN').value, indikace: $('fInd').value.trim(), poznamka: $('fNote').value.trim() };
    const rules = CHK.checkForm(form, cur.key);
    $('result').hidden = false; $('result').innerHTML = '<p>Vyhodnocuji…</p>';
    const txt = transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
    const user = 'LIST FAKTŮ:\n' + JSON.stringify(cur.view, null, 1) + '\n\nKEY:\n' + JSON.stringify(cur.key, null, 1) + '\n\nFORMULÁŘ OD CALLTAKERA:\n' + JSON.stringify(form) + '\n\nPŘEPIS:\n' + txt;
    let soudce = null;
    try {
      const out = await chat(P.judgeSystem(), [{ role: 'user', content: user }], { response_format: { type: 'json_object' } });
      const m = out.match(/\{[\s\S]*\}/); soudce = JSON.parse(m ? m[0] : out);
    } catch (e) { soudce = { chyba: e.message }; }
    render(rules, soudce, form);
  }
  const yn = v => (v === true ? '✔' : v === false ? '✘' : esc(v));
  function render(r, s, form) {
    const k = cur.key, c = s && s.calltaker, v = s && s.realismus_volajiciho;
    let h = '<h3>Kontrola pravidly</h3><ul><li>Ulice ' + yn(r.ulice) + ' · číslo ' + yn(r.cislo) + ' · obec ' + yn(r.obec) + '</li><li>Naléhavost: zadáno ' + esc(r.zadano || '–') + ', správně <b>' + esc(r.spravne) + '</b> ' + yn(r.naléhavost) + '</li></ul>';
    h += '<h3>Správná odpověď</h3><p>' + esc(k.adresa) + ' · ' + esc(k.klasifikace) + ' · ' + esc(k.priznaky) + ' · pacient ' + esc(k.vek) + ' let' + (k.dynamicka ? ' · dynamická indikace' : '') + (k.lekar ? ' · lékař' : '') + '</p>';
    if (c) h += '<h3>Soudce: calltaker</h3><ul>' + Object.keys(c).filter(x => x !== 'komentar').map(x => '<li>' + esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' ')) + ': ' + (Array.isArray(c[x]) ? esc(c[x].join('; ') || '–') : yn(c[x])) + '</li>').join('') + '</ul><p>' + esc(c.komentar || '') + '</p>';
    if (v) h += '<h3>Soudce: realismus volajícího</h3><ul>' + Object.keys(v).filter(x => x !== 'komentar').map(x => '<li>' + esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' ')) + ': ' + (Array.isArray(v[x]) ? esc(v[x].join('; ') || '–') : yn(v[x])) + '</li>').join('') + '</ul><p>' + esc(v.komentar || '') + '</p>';
    if (s && s.chyba) h += '<p class="bad">Soudce selhal: ' + esc(s.chyba) + '</p>';
    h += '<h3>Tvoje hodnocení realismu (1–5)</h3><p><select id="myScore"><option>–</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select> <input id="myNote" placeholder="Co bylo nereálné?" style="width:60%"></p>';
    h += '<p><button id="dl">Stáhnout hovor (JSON)</button> <button id="again" class="pri">Další hovor</button></p>';
    $('result').innerHTML = h;
    $('again').onclick = newCall;
    $('dl').onclick = () => {
      const data = { seed: cur.view.seed, view: cur.view, key: cur.key, transcript, form, rules: r, soudce: s, mojeHodnoceni: { skore: $('myScore').value, poznamka: $('myNote').value }, model: model() };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = 'hovor-' + cur.view.seed + '.json'; a.click();
    };
  }

  $('mute').onclick = () => { if (!vc || !vc.mic) return; const t = vc.mic.getAudioTracks()[0]; if (!t) return; t.enabled = !t.enabled; $('mute').textContent = t.enabled ? 'Ztlumit mikrofon' : 'Zapnout mikrofon'; };
  for (const r of document.querySelectorAll('input[name=mode]')) r.onchange = () => { $('voiceOpts').hidden = document.querySelector('input[name=mode]:checked').value !== 'voice'; };
  window.addEventListener('beforeunload', () => stopVoice());
  $('load').onclick = loadModels; $('start').onclick = newCall; $('send').onclick = send; $('end').onclick = endCall; $('judge').onclick = judgeCall;
  $('say').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const k = store.get('ct_key'); if (k) { $('key').value = k; $('remember').checked = true; $('model').value = store.get('ct_model') || ''; }
})();
