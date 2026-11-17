// Živý hlas pro režim calltaker: OpenAI GPT-Live přes WebRTC (volající), telefonní filtr a šum linky přes hlas, nahrávka WAV, přepis.
// Bez DOM: UI předává zpětná volání (onStatus, onTranscript, onReady, onClosed). Klíč OpenAI zůstává jen v prohlížeči.
const ZOS_LIVE = (function () {
  async function oa(key, path, body) {
    const r = await fetch('https://api.openai.com/v1' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return j;
  }
  // textový model (analyza, textový režim hovoru)
  async function chat(key, model, system, history, opts) {
    const j = await oa(key, '/chat/completions', Object.assign({ model, messages: [{ role: 'system', content: system }].concat(history), max_completion_tokens: 1500 }, opts || {}));
    return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
  }
  async function models(key) {
    const j = await oa(key, '/models');
    const ids = j.data.map(m => m.id).filter(id => /^(gpt-|o\d|chatgpt)/.test(id) && !/realtime|audio|tts|transcribe|image|embedding|search|moderation|codex|instruct|preview|dall|whisper|\d{4}-\d{2}-\d{2}$/.test(id)).sort();
    const pref = ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-5'];
    return { ids, best: pref.find(p => ids.includes(p)) || ids[0] || '' };
  }
  function waitIce(pc) {
    return new Promise((resolve, reject) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const t = setTimeout(() => { pc.removeEventListener('icegatheringstatechange', on); reject(new Error('Vypršel čas při zjišťování sítě (ICE).')); }, 10000);
      function on() { if (pc.iceGatheringState !== 'complete') return; clearTimeout(t); pc.removeEventListener('icegatheringstatechange', on); resolve(); }
      pc.addEventListener('icegatheringstatechange', on);
    });
  }
  // telefonní linka: pásmo 320–3300 Hz, jemné zkreslení, komprese; šum linky zvlášť
  function phoneFilter(ctx) {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320; hp.Q.value = 0.8;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300; lp.Q.value = 0.9;
    const ws = ctx.createWaveShaper(), n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.8); }
    ws.curve = curve;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -28; comp.ratio.value = 6;
    const out = ctx.createGain(); out.gain.value = 1.3;
    hp.connect(lp); lp.connect(ws); ws.connect(comp); comp.connect(out);
    return { input: hp, output: out };
  }
  // šum linky „přes hlas“: sílí podle hlasitosti řeči, v pauzách skoro zmizí, občas lupne
  function lineNoise(ctx, src, dest) {
    const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.003; ns.connect(ng); ng.connect(dest); ns.start();
    const data = new Float32Array(an.fftSize); let q = 1;
    function click() {
      const n = Math.floor(ctx.sampleRate * (0.002 + Math.random() * 0.004)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const sn = ctx.createBufferSource(); sn.buffer = b; const g = ctx.createGain(); g.gain.value = 0.1 + Math.random() * 0.2; sn.connect(g); g.connect(dest); sn.start();
    }
    const timer = setInterval(() => {
      if (ctx.state === 'closed') { clearInterval(timer); return; }
      an.getFloatTimeDomainData(data);
      let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (Math.random() < 0.03) q = 0.6 + Math.random() * 0.9;
      ng.gain.setTargetAtTime((0.003 + rms * 0.45) * q, ctx.currentTime, 0.04);
      if (rms > 0.02 && Math.random() < 0.05) click();
    }, 40);
  }
  function phoneLine(ctx, src) {
    const mixIn = ctx.createGain(), f = phoneFilter(ctx);
    src.connect(mixIn); lineNoise(ctx, src, mixIn); mixIn.connect(f.input);
    return f.output;
  }
  function toWav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, t) => { for (let i = 0; i < t.length; i++) data.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
    data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * ch * 2, true);
    const chans = []; for (let k = 0; k < ch; k++) chans.push(buf.getChannelData(k));
    let o = 44; for (let i = 0; i < n; i++) {
      let m = 0; for (let k = 0; k < ch; k++) m += chans[k][i]; m /= ch;   // oba kanály shodné
      for (let k = 0; k < ch; k++) { const v = Math.max(-1, Math.min(1, m)); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    }
    return new Blob([data], { type: 'audio/wav' });
  }
  // o: { key, model, voice, instructions, filter, record, onStatus(text, bad), onTranscript(role, delta), onReady(), onClosed(), onLost() }
  async function connect(o) {
    const st = (t, bad) => { if (o.onStatus) o.onStatus(t, bad); };
    if (!navigator.mediaDevices || !window.RTCPeerConnection) { st('Prohlížeč nepodporuje mikrofon/WebRTC (zkus Chrome nebo Edge).', true); return null; }
    st('Připojuji hovor…');
    const c = { ready: false, closed: false, usage: 0, stopped: false, rec: null, chunks: [] };
    const h = {
      get usage() { return c.usage; },
      get ready() { return c.ready; },
      mute() { const t = c.mic && c.mic.getAudioTracks()[0]; if (!t) return true; t.enabled = !t.enabled; return t.enabled; },
      stop() { stopAll(c); },
      close() { return closeAll(c, o, st); },
    };
    c.h = h;
    try {
      c.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (c.stopped) { c.mic.getTracks().forEach(t => t.stop()); return h; }
      const AC = window.AudioContext || window.webkitAudioContext; c.ctx = new AC({ sampleRate: 24000 }); c.ctx.resume();
      const msrc = c.ctx.createMediaStreamSource(c.mic);
      c.micTap = o.filter ? phoneLine(c.ctx, msrc) : msrc;
      if (o.record && window.MediaRecorder) {
        const ctx = c.ctx, merger = ctx.createChannelMerger(2), dst = ctx.createMediaStreamDestination(); merger.connect(dst);
        const mix = ctx.createGain(); mix.gain.value = 0.8; mix.connect(merger, 0, 0); mix.connect(merger, 0, 1);
        c.micTap.connect(mix); c.rx = ctx.createGain(); c.rx.connect(mix);
        const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t));
        c.rec = new MediaRecorder(dst.stream, mt ? { mimeType: mt } : undefined);
        c.rec.ondataavailable = e => { if (e.data && e.data.size) c.chunks.push(e.data); };
        c.rec.start(1000);
      }
      c.pc = new RTCPeerConnection();
      c.pc.addEventListener('track', ev => {
        const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
        c.audio = new Audio(); c.audio.srcObject = stream;
        if (o.filter) { c.audio.muted = true; const out = phoneLine(c.ctx, c.ctx.createMediaStreamSource(stream)); out.connect(c.ctx.destination); if (c.rx) out.connect(c.rx); }
        else if (c.rx) c.ctx.createMediaStreamSource(stream).connect(c.rx);
        c.audio.play().catch(() => st('Klikni kamkoli na stránku, aby se přehrál zvuk.', true));
      });
      c.mic.getAudioTracks().forEach(t => c.pc.addTrack(t, c.mic));   // volající vždy slyší čistý hlas
      c.dc = c.pc.createDataChannel('oai-events');
      c.dc.addEventListener('message', ev => onEvent(c, o, st, ev.data));
      c.dc.addEventListener('close', () => { if (!c.closed && !c.stopped && o.onLost) o.onLost(); });
      await c.pc.setLocalDescription(await c.pc.createOffer());
      await waitIce(c.pc);
      const mk = name => oa(o.key, '/live/sessions', { session: { model: o.model || 'gpt-live-1', instructions: o.instructions, audio: { output: { voice: name } } }, transport: { type: 'webrtc', sdp: c.pc.localDescription.sdp } });
      let res;
      const chain = [...new Set((o.voices && o.voices.length ? o.voices : [o.voice]).concat(['marin']).filter(Boolean))];
      for (let i = 0; i < chain.length && !res; i++) {
        try { res = await mk(chain[i]); } catch (e) {
          if (!/voice/i.test(e.message) || i === chain.length - 1) throw e;
          st('Hlas „' + chain[i] + '“ nelze použít, zkouším „' + chain[i + 1] + '“…');
        }
      }
      await c.pc.setRemoteDescription({ type: 'answer', sdp: res.transport.sdp });
    } catch (e) { st('Hlas se nepodařilo spojit: ' + e.message, true); stopAll(c); }
    return h;
  }
  function onEvent(c, o, st, raw) {
    let ev; try { ev = JSON.parse(raw); } catch (e) { return; }
    switch (ev.type) {
      case 'session.started': c.ready = true; if (o.onReady) o.onReady(); st('Hovor spojen.'); break;
      case 'session.input_transcript.delta': if (o.onTranscript) o.onTranscript('calltaker', ev.delta || ''); break;
      case 'session.output_transcript.delta': if (o.onTranscript) o.onTranscript('volajici', ev.delta || ''); break;
      case 'session.usage.updated': if (ev.usage && ev.usage.seconds != null) c.usage = ev.usage.seconds; break;
      case 'session.closed': c.closed = true; if (ev.usage && ev.usage.seconds != null) c.usage = ev.usage.seconds; if (c.onClosed) c.onClosed(); break;
      case 'error': st('Chyba hlasového API: ' + ((ev.error && ev.error.message) || ev.message || String(raw).slice(0, 200)), true); break;
      default: if (window.console) console.debug('live event', ev.type);
    }
  }
  function stopAll(c) {
    c.stopped = true;
    try { c.mic && c.mic.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
    try { c.dc && c.dc.close(); } catch (e) { /* ignore */ }
    try { c.pc && c.pc.close(); } catch (e) { /* ignore */ }
    try { if (c.audio) c.audio.srcObject = null; } catch (e) { /* ignore */ }
    try { c.ctx && c.ctx.close(); } catch (e) { /* ignore */ }
  }
  async function finishRec(c) {
    if (!c.rec || c.rec.state === 'inactive') return null;
    try {
      await new Promise(r => { c.rec.onstop = r; c.rec.stop(); });
      const buf = await c.ctx.decodeAudioData(await new Blob(c.chunks).arrayBuffer());
      return { blob: toWav(buf), sec: buf.duration };
    } catch (e) { return null; }
  }
  // korektní ukončení: session.close, dopsání nahrávky; vrací { usage, wav }
  function closeAll(c, o, st) {
    return new Promise(res => {
      let done = false;
      const fin = async () => { if (done) return; done = true; const wav = await finishRec(c); const u = c.usage; stopAll(c); st(u ? 'Hovor trval ' + Math.round(u) + ' s, hlas ≈ ' + (u / 60 * 0.05).toFixed(3) + ' $.' : ''); res({ usage: u, wav }); };
      if (!c.ready || c.closed || !c.dc || c.dc.readyState !== 'open') return fin();
      c.onClosed = fin; setTimeout(fin, 6000);
      try { c.dc.send(JSON.stringify({ type: 'session.close' })); } catch (e) { fin(); }
    });
  }
  return { connect, chat, models };
})();
