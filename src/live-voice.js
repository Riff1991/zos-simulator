// Živý hlas pro režim calltaker: OpenAI GPT-Live přes WebRTC (volající), záloha Gemini Live přes WebSocket, telefonní filtr a šum linky přes hlas, nahrávka WAV, přepis.
// Bez DOM: UI předává zpětná volání (onStatus, onTranscript, onReady, onClosed). Klíče OpenAI i Gemini zůstávají jen v prohlížeči.
const ZOS_LIVE = (function () {
  // klíč Gemini (AIza…) jde na endpoint Googlu kompatibilní s OpenAI, ostatní na api.openai.com
  async function oa(key, path, body) {
    const base = /^AIza/.test(String(key || '').trim()) ? 'https://generativelanguage.googleapis.com/v1beta/openai' : 'https://api.openai.com/v1';
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return j;
  }
  // textový model (analyza, textový režim hovoru)
  async function chat(key, model, system, history, opts) {
    const gem = /^AIza/.test(String(key || '').trim());
    const body = Object.assign({ model, messages: [{ role: 'system', content: system }].concat(history) }, gem ? { max_tokens: 1500 } : { max_completion_tokens: 1500 }, opts || {});
    if (gem) delete body.response_format;   // JSON se z odpovědi vybírá i tak
    const j = await oa(key, '/chat/completions', body);
    return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
  }
  async function models(key) {
    if (/^AIza/.test(String(key || '').trim())) {
      const g = await oa(key, '/models');
      const ids = [...new Set(g.data.map(m => String(m.id).replace(/^models\//, '')))].filter(id => /^gemini-/.test(id) && !/live|audio|tts|transcribe|translate|image|embedding|robotics|computer/.test(id)).sort();
      const pref = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];
      return { ids, best: pref.find(p => ids.includes(p)) || ids.find(i => /flash-lite/.test(i)) || ids[0] || '' };
    }
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
  // telefonní linka podle způsobu přenosu (profily pevná / mobil / slabý signál v calltaker/phonecodec.js):
  // pásmo (strmé, 4. řád) → zvýraznění kolem 2 kHz → měkké ořezání → kodek v AudioWorkletu (převzorkování 8 kHz, µ-law, ztráta rámců) → jemná komprese; šum linky zvlášť
  async function loadCodec(ctx) {
    try {
      if (!ctx.audioWorklet || !window.CT_PHONE) return false;
      const url = URL.createObjectURL(new Blob([window.CT_PHONE.src], { type: 'application/javascript' }));
      try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
      return true;
    } catch (e) { return false; }
  }
  const lineProfile = name => (window.CT_PHONE && window.CT_PHONE.LINES[name]) || { hp: 320, lp: 3300, steps: 256, loss: 0, burst: 1, hiss: 0.003, follow: 0.45, drive: 1.8, clicks: 0.05, hum: 0, peak: 2 };
  function phoneFilter(ctx, prof, codec) {
    const bq = (type, f, q, g) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.707; if (g != null) b.gain.value = g; return b; };
    const nodes = [bq('highpass', prof.hp), bq('highpass', prof.hp), bq('lowpass', prof.lp), bq('lowpass', prof.lp), bq('peaking', 2000, 0.9, prof.peak)];
    const ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n), norm = Math.tanh(prof.drive);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * prof.drive) / norm; }
    ws.curve = curve; nodes.push(ws);
    if (codec) { try { nodes.push(new window.AudioWorkletNode(ctx, 'phone-codec', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { steps: prof.steps, loss: prof.loss, burst: prof.burst } })); } catch (e) { /* kodek není k dispozici, zůstane filtr */ } }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -26; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.12; nodes.push(comp);
    const out = ctx.createGain(); out.gain.value = 1.0; nodes.push(out);
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return { input: nodes[0], output: out };
  }
  // růžový šum (Paul Kellet): přirozenější než bílý, bez pronikavého syčení
  function pinkBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    return buf;
  }
  // šum linky „přes hlas“: komfortní šum sílí podle hlasitosti řeči a v pauzách slábne, občas lupne; pevná linka má slabý brum 50 Hz
  function lineNoise(ctx, src, dest, prof) {
    const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const ns = ctx.createBufferSource(); ns.buffer = pinkBuffer(ctx, 3); ns.loop = true;
    const ng = ctx.createGain(); ng.gain.value = prof.hiss; ns.connect(ng); ng.connect(dest); ns.start();
    if (prof.hum) { const o = ctx.createOscillator(); o.frequency.value = 50; const g = ctx.createGain(); g.gain.value = prof.hum; o.connect(g); g.connect(dest); o.start(); }
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
      ng.gain.setTargetAtTime((prof.hiss + rms * prof.follow) * q, ctx.currentTime, 0.04);
      if (rms > 0.02 && Math.random() < prof.clicks) click();
    }, 40);
  }
  function phoneLine(ctx, src, prof, codec) {
    const mixIn = ctx.createGain(), f = phoneFilter(ctx, prof, codec);
    src.connect(mixIn); lineNoise(ctx, src, mixIn, prof); mixIn.connect(f.input);
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
  // o: { key, model, voice, instructions, filter, line ('pevna' | 'mobil' | 'slaby'), record, onStatus(text, bad), onTranscript(role, delta), onReady(), onClosed(), onLost() }
  async function connect(o) {
    const st = (t, bad) => { if (o.onStatus) o.onStatus(t, bad); };
    if (!navigator.mediaDevices || !window.RTCPeerConnection) { st('Prohlížeč nepodporuje mikrofon/WebRTC (zkus Chrome nebo Edge).', true); return null; }
    st('Připojuji hovor…');
    const c = { ready: false, closed: false, usage: 0, stopped: false, rec: null, chunks: [] };
    const t0 = performance.now(); c.diag = {}; c.mark = k => { if (c.diag[k] == null) c.diag[k] = Math.round(performance.now() - t0) / 1000; };
    const h = {
      get usage() { return c.usage; },
      get ready() { return c.ready; },
      get failed() { return !!c.failed; },
      get error() { return c.err || ''; },
      provider: 'openai',
      mute() { const t = c.mic && c.mic.getAudioTracks()[0]; if (!t) return true; t.enabled = !t.enabled; return t.enabled; },
      stop() { stopAll(c); },
      close() { return closeAll(c, o, st); },
    };
    c.h = h;
    try {
      if (!(await setupAudio(c, o))) return h;
      c.pc = new RTCPeerConnection();
      c.pc.addEventListener('iceconnectionstatechange', () => { if (/connected|completed/.test(c.pc.iceConnectionState)) c.mark('connected'); });
      c.pc.addEventListener('track', ev => {
        const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
        c.audio = new Audio(); c.audio.srcObject = stream;
        const rsrc = c.ctx.createMediaStreamSource(stream);
        // zvuk volajícího musí dorazit hned: živý prvek s hlasitostí 0 (ne „muted“, Chrome u ztlumeného prvku může proud do Web Audio pustit se zpožděním)
        if (o.filter) { c.audio.volume = 0; const out = phoneLine(c.ctx, rsrc, c.prof, c.codec); out.connect(c.ctx.destination); if (c.rx) out.connect(c.rx); }
        else if (c.rx) rsrc.connect(c.rx);
        watchRx(c, rsrc, st);
        c.audio.play().catch(() => st('Klikni kamkoli na stránku, aby se přehrál zvuk.', true));
      });
      c.mic.getAudioTracks().forEach(t => c.pc.addTrack(t, c.mic));   // volající vždy slyší čistý hlas
      c.dc = c.pc.createDataChannel('oai-events');
      c.dc.addEventListener('message', ev => onEvent(c, o, st, ev.data));
      c.dc.addEventListener('close', () => { if (!c.closed && !c.stopped && o.onLost) o.onLost(); });
      await c.pc.setLocalDescription(await c.pc.createOffer());
      await waitIce(c.pc); c.mark('ice');
      const mk = name => oa(o.key, '/live/sessions', { session: { model: o.model || 'gpt-live-1', instructions: o.instructions, audio: { output: { voice: name } } }, transport: { type: 'webrtc', sdp: c.pc.localDescription.sdp } });
      let res;
      const chain = [...new Set((o.voices && o.voices.length ? o.voices : [o.voice]).concat(['marin']).filter(Boolean))];
      for (let i = 0; i < chain.length && !res; i++) {
        try { res = await mk(chain[i]); } catch (e) {
          if (!/voice/i.test(e.message) || i === chain.length - 1) throw e;
          st('Hlas „' + chain[i] + '“ nelze použít, zkouším „' + chain[i + 1] + '“…');
        }
      }
      c.mark('api'); await c.pc.setRemoteDescription({ type: 'answer', sdp: res.transport.sdp });
    } catch (e) { c.failed = true; c.err = e.message; st('Hlas se nepodařilo spojit: ' + e.message, true); stopAll(c); }
    return h;
  }
  // mikrofon, AudioContext 24 kHz, telefonní linka na mikrofon (jen pro nahrávku) a nahrávání; false = hovor mezitím ukončen
  async function setupAudio(c, o) {
    c.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    c.mark('mic');
    if (c.stopped) { c.mic.getTracks().forEach(t => t.stop()); return false; }
    const AC = window.AudioContext || window.webkitAudioContext; c.ctx = new AC({ sampleRate: 24000 }); try { await c.ctx.resume(); } catch (e) { /* zkusí se znovu při přehrání */ }
    c.mark('ctx');
    c.msrc = c.ctx.createMediaStreamSource(c.mic);
    c.prof = lineProfile(o.line); c.codec = o.filter ? await loadCodec(c.ctx) : false; c.mark('codec');
    c.micTap = o.filter ? phoneLine(c.ctx, c.msrc, c.prof, c.codec) : c.msrc;
    if (o.record && window.MediaRecorder) {
      const ctx = c.ctx, merger = ctx.createChannelMerger(2), dst = ctx.createMediaStreamDestination(); merger.connect(dst);
      const mix = ctx.createGain(); mix.gain.value = 0.8; mix.connect(merger, 0, 0); mix.connect(merger, 0, 1);
      c.micTap.connect(mix); c.rx = ctx.createGain(); c.rx.connect(mix);
      const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t));
      c.rec = new MediaRecorder(dst.stream, mt ? { mimeType: mt } : undefined);
      c.rec.ondataavailable = e => { if (e.data && e.data.size) c.chunks.push(e.data); };
      c.rec.start(1000);
    }
    return !c.stopped;
  }

  // ---------- Gemini Live (záloha za OpenAI): WebSocket, mikrofon jako PCM 16 kHz, odpověď PCM 24 kHz ----------
  // Klíč (AIza…) jde jen z prohlížeče přímo na generativelanguage.googleapis.com. Spojení se asi po 10 min obnovuje (goAway + sessionResumption).
  const GWS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=';
  const CAP_SRC = "class ZosCap extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('zos-cap',ZosCap);";
  const isGemKey = k => /^AIza/.test(String(k || '').trim());
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return window.btoa(s); }
  function unb64(str) { const bin = window.atob(str), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function gemSetup(o, voice, handle) {
    return {
      model: 'models/' + String(o.model || 'gemini-3.8-live').replace(/^models\//, ''),
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      systemInstruction: { parts: [{ text: 'Mluvíš výhradně česky (pokud pokyny níže neurčují jiný jazyk nebo přízvuk).\n\n' + o.instructions }] },
      inputAudioTranscription: {}, outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: handle ? { handle } : {},
    };
  }
  // mikrofon (čistý, bez telefonního filtru) → dolní propust → AudioWorklet → převzorkování na 16 kHz → 40ms bloky do WebSocketu
  async function gemCapture(c) {
    const url = URL.createObjectURL(new Blob([CAP_SRC], { type: 'application/javascript' }));
    try { await c.ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const lp = c.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200;
    c.cap = new window.AudioWorkletNode(c.ctx, 'zos-cap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const mute = c.ctx.createGain(); mute.gain.value = 0;
    c.msrc.connect(lp); lp.connect(c.cap); c.cap.connect(mute); mute.connect(c.ctx.destination);
    const OUT = 640, N = Math.round(OUT * c.ctx.sampleRate / 16000);
    let acc = new Float32Array(N * 4), len = 0;
    c.cap.port.onmessage = e => {
      if (c.stopped) return;
      const d = e.data; if (len + d.length > acc.length) { const a = new Float32Array((len + d.length) * 2); a.set(acc.subarray(0, len)); acc = a; }
      acc.set(d, len); len += d.length;
      while (len >= N) {
        const pcm = new Int16Array(OUT);
        for (let j = 0; j < OUT; j++) { const p = j * N / OUT, i = Math.floor(p), f = p - i, s = acc[i] * (1 - f) + acc[Math.min(i + 1, N - 1)] * f, v = Math.max(-1, Math.min(1, s)); pcm[j] = v < 0 ? v * 0x8000 : v * 0x7fff; }
        acc.copyWithin(0, N, len); len -= N;
        const ws = c.ws;
        if (c.ready && ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } })); } catch (err) { /* spojení se právě obnovuje */ } }
      }
    };
  }
  function gemPlay(c, data, mime) {
    const m = /rate=(\d+)/.exec(mime || ''), rate = m ? Number(m[1]) : 24000;
    const u = unb64(data), n = u.length >> 1; if (!n) return;
    const dv = new DataView(u.buffer), buf = c.ctx.createBuffer(1, n, rate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = dv.getInt16(i * 2, true) / 32768;
    const s = c.ctx.createBufferSource(); s.buffer = buf; s.connect(c.rxIn);
    const t = Math.max(c.ctx.currentTime + 0.04, c.nextT || 0); s.start(t); c.nextT = t + buf.duration;
    c.srcs.add(s); s.onended = () => c.srcs.delete(s);
  }
  function gemFlush(c) { for (const s of c.srcs) { try { s.stop(); } catch (e) { /* už skončil */ } } c.srcs.clear(); c.nextT = 0; }
  function gemMsg(c, o, st, m) {
    const sc = m.serverContent;
    if (sc) {
      if (sc.interrupted) gemFlush(c);   // calltaker skočil do řeči: volající ztichne
      const parts = (sc.modelTurn && sc.modelTurn.parts) || [];
      for (const p of parts) if (p.inlineData && p.inlineData.data && /audio/.test(p.inlineData.mimeType || 'audio')) gemPlay(c, p.inlineData.data, p.inlineData.mimeType);
      if (sc.inputTranscription && sc.inputTranscription.text && o.onTranscript) o.onTranscript('calltaker', sc.inputTranscription.text);
      if (sc.outputTranscription && sc.outputTranscription.text) { c.mark('text'); if (o.onTranscript) o.onTranscript('volajici', sc.outputTranscription.text); }
    }
    if (m.sessionResumptionUpdate && m.sessionResumptionUpdate.resumable && m.sessionResumptionUpdate.newHandle) c.handle = m.sessionResumptionUpdate.newHandle;
    if (m.goAway) gemReconnect(c, o, st);   // server brzy spojení ukončí: předem se otevře nové a hovor pokračuje
  }
  // jedno WebSocket spojení; slib se splní po setupComplete, jinak skončí chybou (s důvodem od serveru)
  function gemSocket(c, o, st, voice, handle) {
    return new Promise((resolve, reject) => {
      let ok = false, ws;
      try { ws = new window.WebSocket(GWS + encodeURIComponent(String(o.key).trim())); } catch (e) { reject(e); return; }
      ws.binaryType = 'arraybuffer';
      const t = setTimeout(() => { if (ok) return; try { ws.close(); } catch (e) { /* ignore */ } reject(new Error('Vypršel čas spojení s Gemini.')); }, 15000);
      ws.onopen = () => { try { ws.send(JSON.stringify({ setup: gemSetup(o, voice, handle) })); } catch (e) { /* zavře se */ } };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : new window.TextDecoder().decode(ev.data)); } catch (e) { return; }
        if (m.setupComplete && !ok) { ok = true; clearTimeout(t); resolve(ws); return; }
        gemMsg(c, o, st, m);
      };
      ws.onclose = ev => {
        clearTimeout(t);
        if (!ok) { reject(new Error(ev.reason || ('spojení odmítnuto (kód ' + ev.code + ')'))); return; }
        if (ws !== c.ws || c.stopped || c.closing || c.reconn) return;
        if (c.handle) { gemReconnect(c, o, st); return; }
        c.closed = true; st('Spojení s Gemini skončilo' + (ev.reason ? ': ' + ev.reason : '.'), true); if (o.onLost) o.onLost();
      };
      ws.onerror = () => { /* následuje onclose s důvodem */ };
    });
  }
  function gemReconnect(c, o, st) {
    if (c.reconn || c.stopped || c.closing || !c.handle) return;
    c.reconn = true;
    gemSocket(c, o, st, c.voice, c.handle).then(ws => {
      const old = c.ws; c.ws = ws; c.reconn = false; c.retries = 0;
      if (c.stopped || c.closing) { try { ws.close(1000); } catch (e) { /* ignore */ } }
      try { if (old) old.close(1000); } catch (e) { /* ignore */ }
    }).catch(e => {
      c.reconn = false;
      if (c.stopped || c.closing) return;
      if (++c.retries < 3) { setTimeout(() => gemReconnect(c, o, st), 600); return; }
      c.closed = true; st('Spojení s Gemini se nepodařilo obnovit: ' + e.message, true); if (o.onLost) o.onLost();
    });
  }
  // stejné rozhraní jako connect(): o.key je klíč Gemini (AIza…), o.model např. gemini-3.8-live, o.voices hlasy Gemini (Kore, Charon…)
  async function connectGemini(o) {
    const st = (t, bad) => { if (o.onStatus) o.onStatus(t, bad); };
    if (!navigator.mediaDevices || !window.WebSocket || !window.AudioWorkletNode) { st('Prohlížeč nepodporuje mikrofon nebo AudioWorklet (zkus Chrome nebo Edge).', true); return null; }
    st('Připojuji hovor (Gemini)…');
    const c = { gem: true, ready: false, closed: false, usage: 0, stopped: false, rec: null, chunks: [], srcs: new Set(), nextT: 0, handle: null, retries: 0 };
    const t0 = performance.now(); c.diag = {}; c.mark = k => { if (c.diag[k] == null) c.diag[k] = Math.round(performance.now() - t0) / 1000; };
    const h = {
      get usage() { return c.tReady ? ((c.tEnd || performance.now()) - c.tReady) / 1000 : 0; },
      get ready() { return c.ready; },
      get failed() { return !!c.failed; },
      get error() { return c.err || ''; },
      provider: 'gemini',
      mute() { const t = c.mic && c.mic.getAudioTracks()[0]; if (!t) return true; t.enabled = !t.enabled; return t.enabled; },
      stop() { stopAll(c); },
      close() { return closeAll(c, o, st); },
    };
    c.h = h;
    try {
      if (!(await setupAudio(c, o))) return h;
      c.rxIn = c.ctx.createGain();
      if (o.filter) { const out = phoneLine(c.ctx, c.rxIn, c.prof, c.codec); out.connect(c.ctx.destination); if (c.rx) out.connect(c.rx); }
      else { c.rxIn.connect(c.ctx.destination); if (c.rx) c.rxIn.connect(c.rx); }
      watchRx(c, c.rxIn, st);
      await gemCapture(c);
      const chain = [...new Set((o.voices && o.voices.length ? o.voices : [o.voice]).concat(['Kore']).filter(Boolean))];
      for (let i = 0; i < chain.length && !c.ws; i++) {
        try { c.ws = await gemSocket(c, o, st, chain[i], null); c.voice = chain[i]; } catch (e) {
          if (c.stopped) return h;
          if (!/voice|speaker/i.test(e.message) || i === chain.length - 1) throw e;
          st('Hlas „' + chain[i] + '“ nelze použít, zkouším „' + chain[i + 1] + '“…');
        }
      }
      if (c.stopped) { try { c.ws.close(1000); } catch (e) { /* ignore */ } return h; }
      c.mark('connected'); c.mark('api'); c.mark('session');
      c.ready = true; c.tReady = performance.now();
      if (o.onReady) o.onReady(c.diag); st('Hovor spojen (Gemini).');
    } catch (e) { c.failed = true; c.err = e.message; st('Hlas Gemini se nepodařilo spojit: ' + e.message, true); stopAll(c); }
    return h;
  }
  // měření: kdy dorazí první slyšitelný zvuk volajícího do Web Audio (c.diag.zvuk) a kdy přišel první text jeho odpovědi (c.diag.text);
  // při rozdílu víc než 1,5 s se to ukáže ve stavu a v konzoli, aby bylo vidět, jestli zdržuje model, nebo přehrávání
  function watchRx(c, src, st) {
    const an = c.ctx.createAnalyser(); an.fftSize = 512; src.connect(an); const buf = new Float32Array(an.fftSize);
    const timer = setInterval(() => {
      if (c.stopped || c.ctx.state === 'closed') { clearInterval(timer); return; }
      if (c.ctx.state === 'suspended') c.ctx.resume().catch(() => {});
      an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
      if (m > 0.01) {
        c.mark('zvuk'); clearInterval(timer);
        if (c.diag.text != null && c.diag.zvuk - c.diag.text > 1.5) { const d = (c.diag.zvuk - c.diag.text).toFixed(1); if (window.console) console.warn('zvuk volajícího dorazil o ' + d + ' s později než text'); st('Zvuk volajícího dorazil o ' + d.replace('.', ',') + ' s později než jeho text.', true); }
      }
    }, 50);
  }
  function onEvent(c, o, st, raw) {
    let ev; try { ev = JSON.parse(raw); } catch (e) { return; }
    switch (ev.type) {
      case 'session.started': c.ready = true; c.mark('session'); if (o.onReady) o.onReady(c.diag); st('Hovor spojen.'); break;
      case 'session.input_transcript.delta': if (o.onTranscript) o.onTranscript('calltaker', ev.delta || ''); break;
      case 'session.output_transcript.delta': c.mark('text'); if (o.onTranscript) o.onTranscript('volajici', ev.delta || ''); break;
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
    try { if (c.cap) { c.cap.port.onmessage = null; c.cap.disconnect(); } } catch (e) { /* ignore */ }
    try { if (c.srcs) gemFlush(c); } catch (e) { /* ignore */ }
    try { if (c.ws && c.ws.readyState <= 1) c.ws.close(1000); } catch (e) { /* ignore */ }
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
      const fin = async () => {
        if (done) return; done = true;
        if (c.gem) { c.closing = true; c.tEnd = c.tEnd || performance.now(); c.usage = c.h.usage; }
        const wav = await finishRec(c); const u = c.usage; stopAll(c);
        st(u ? 'Hovor trval ' + Math.round(u) + ' s' + (c.gem ? ' (Gemini).' : ', hlas ≈ ' + (u / 60 * 0.05).toFixed(3) + ' $.') : ''); res({ usage: u, wav, provider: c.gem ? 'gemini' : 'openai' });
      };
      if (c.gem || !c.ready || c.closed || !c.dc || c.dc.readyState !== 'open') return fin();
      c.onClosed = fin; setTimeout(fin, 6000);
      try { c.dc.send(JSON.stringify({ type: 'session.close' })); } catch (e) { fin(); }
    });
  }
  return { connect, connectGemini, isGemKey, chat, models, phoneLine, loadCodec, lineProfile };   // linka je vystavená i pro zkoušku řetězce bez mikrofonu
})();
