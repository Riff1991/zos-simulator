// Hlas rádiových relací: syntéza (Piper ve Web Workeru, site/tts/) + zvuk digitální vysílačky (Web Audio).
// Nezávislé na systémových hlasech – stejně zní na Macu, Windows, Linuxu i mobilu.
const ZOS_VOICE = (function () {
  let worker = null, state = 'off', progress = 0, err = '', ctx = null, master = null, volume = 0.6, tempo = 0.75;
  let reqSeq = 0; const pending = new Map(), cache = new Map(), queue = [];
  let playing = false, listeners = [];
  const emit = () => { for (const f of listeners) { try { f(status()); } catch (e) { /* ignore */ } } };
  function status() { return { state, progress, err }; }
  function onChange(f) { listeners.push(f); }
  function audioCtx() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function unlock() { try { audioCtx(); } catch (e) { /* ignore */ } }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume; }
  function enable(on) {
    if (!on) { state = worker ? 'paused' : 'off'; emit(); return; }
    if (worker && (state === 'ready' || state === 'loading')) return;
    if (worker && state === 'paused') { state = 'ready'; emit(); return; }
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') { state = 'error'; err = 'Prohlížeč nepodporuje WebAssembly/Worker.'; emit(); return; }
    state = 'loading'; progress = 0; emit();
    try {
      worker = new Worker('tts/worker.js');
      worker.onmessage = ev => {
        const m = ev.data || {};
        if (m.type === 'progress') { progress = m.total ? m.loaded / m.total : 0; emit(); return; }
        if (m.type === 'ready') { state = 'ready'; progress = 1; emit(); for (const t of ['ZCB101 na příjmu.', 'ZCB101 rozumí.']) synth(t, 'zos'); return; }
        const p = pending.get(m.id); if (!p) return; pending.delete(m.id);
        if (m.type === 'audio') p.resolve({ pcm: m.pcm, sr: m.sampleRate }); else { p.resolve(null); if (m.error) { err = m.error; } }
      };
      worker.onerror = e => { state = 'error'; err = (e && e.message) || 'chyba načtení hlasu'; emit(); for (const p of pending.values()) p.resolve(null); pending.clear(); };
      worker.postMessage({ type: 'init' });
    } catch (e) { state = 'error'; err = String(e && e.message || e); emit(); }
  }
  // hlas posádky podle volacího znaku (stálý pro danou posádku), dispečer = „zos“
  // tempo = délka řeči vůči výchozí (menší = rychlejší); výšku hlasu mění rychlost přehrávání, délka se dorovná syntézou
  function voiceOf(key) {
    if (key === 'zos') { const rate = 1.16; return { rate, ls: tempo * rate, ns: 0.5, nw: 0.6, zos: true }; }
    let h = 2166136261; for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const r = i => ((h >>> (i * 5)) & 31) / 31;
    const rate = 0.86 + r(0) * 0.18; // posádky hlouběji než dispečer, každá jinak
    return { rate, ls: tempo * rate * (0.94 + r(1) * 0.12), ns: 0.55 + r(2) * 0.25, nw: 0.6 + r(3) * 0.3, zos: false };
  }
  function setTempo(t) { tempo = Math.max(0.55, Math.min(1.2, Number(t) || 0.75)); }
  // text pro čtení: volací znaky, zkratky, nemocnice
  const ABBR = { RZP: 'er zet pé', RV: 'er vé', RLP: 'er el pé', LZS: 'el zet es', KPR: 'ká pé er', ARO: 'áro', ORL: 'ó er el', KCC: 'ká cé cé', PČR: 'policie', HZS: 'hasiči', ZZ: 'zdravotnické zařízení', DN: 'dopravní nehoda', RD: 'rodinný dům', NEM: 'nemocnice', ZOS: 'zet ó es', LIBERO: 'libero', TANR: 'tanr', DPS: 'dé pé es', LSPP: 'pohotovost', CB: 'Budějovice', ČB: 'Budějovice', JH: 'Jindřichův Hradec', TA: 'Tábor', PT: 'Prachatice', ST: 'Strakonice', CK: 'Krumlov', ČK: 'Krumlov', PI: 'Písek' };
  function speakable(text) {
    let t = String(text || '').replace(/\s*\(\d+\. volání\)/g, '').replace(/[()]/g, ', ');
    t = t.replace(/\bZCB\s?101\b/g, 'zet cé bé sto jedna').replace(/\bZCB\s?(\d+)/g, 'zet cé bé $1');
    t = t.replace(/\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]{2,})_?(RZP|RV|Z|LIBERO)\s?(\d*)\b/g, (m, a, b, n) => `${ABBR[a] || a.toLocaleLowerCase('cs-CZ')} ${ABBR[b] || (b === 'Z' ? 'záloha' : b)}${n ? ' ' + n : ''}`);
    t = t.replace(/_/g, ' ');
    t = t.replace(/\b[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]{2,}\b/g, w => ABBR[w] || (w.length > 4 ? w.toLocaleLowerCase('cs-CZ') : w));
    t = t.replace(/\bN([1-4])\b/g, (m, d) => 'en ' + ['jedna', 'dva', 'tři', 'čtyři'][d - 1]);
    return t.replace(/\s+/g, ' ').trim();
  }
  function synth(text, key) {
    const v = voiceOf(key), tx = speakable(text), ck = key + '|' + tempo + '|' + tx;
    if (cache.has(ck)) return cache.get(ck);
    if (!worker || state !== 'ready') return Promise.resolve(null);
    const id = ++reqSeq;
    const pr = new Promise(resolve => { pending.set(id, { resolve }); });
    worker.postMessage({ type: 'say', id, text: tx, ls: v.ls, ns: v.ns, nw: v.nw });
    cache.set(ck, pr); if (cache.size > 60) cache.delete(cache.keys().next().value);
    return pr;
  }
  // zvuk digitální vysílačky: tón klíčování, pásmo 300–3400 Hz, komprese, kvantizace, šum, občasné výpadky
  function shaperCurve(drive, bits) {
    const n = 2048, c = new Float32Array(n), q = Math.pow(2, bits - 1);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; const y = Math.tanh(drive * x) / Math.tanh(drive); c[i] = Math.round(y * q) / q; }
    return c;
  }
  async function render(pcm, sr, v) {
    const SR = 16000, rate = v.rate, lead = 0.2, tail = 0.16, dur = pcm.length / sr / rate;
    const len = Math.ceil((lead + dur + tail) * SR);
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OAC(1, len, SR);
    const buf = oc.createBuffer(1, pcm.length, sr); buf.getChannelData(0).set(pcm);
    const src = oc.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = v.zos ? 420 : 340; hp.Q.value = 0.8;
    const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.zos ? 3400 : 3000; lp.Q.value = 0.9;
    const pk = oc.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = v.zos ? 2400 : 1500; pk.Q.value = 1.1; pk.gain.value = v.zos ? 4 : 6;
    const pre = oc.createGain(); pre.gain.value = v.zos ? 1.4 : 2.0;
    const sh = oc.createWaveShaper(); sh.curve = shaperCurve(v.zos ? 1.6 : 2.6, v.zos ? 9 : 7);
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -26; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
    const out = oc.createGain(); out.gain.value = 0.9;
    src.connect(hp); hp.connect(lp); lp.connect(pk); pk.connect(pre); pre.connect(sh); sh.connect(comp); comp.connect(out); out.connect(oc.destination);
    // výpadky digitálního přenosu (jen posádky)
    if (!v.zos) {
      const drops = Math.random() < 0.55 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 0;
      for (let i = 0; i < drops; i++) { const at = lead + 0.3 + Math.random() * Math.max(0.1, dur - 0.6), d = 0.04 + Math.random() * 0.07; out.gain.setValueAtTime(0.9, at); out.gain.setValueAtTime(0.05, at + 0.005); out.gain.setValueAtTime(0.9, at + d); }
    }
    // šum v pozadí po dobu klíčování
    const nb = oc.createBuffer(1, len, SR), nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    const ns = oc.createBufferSource(); ns.buffer = nb;
    const nf = oc.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1700; nf.Q.value = 0.6;
    const ng = oc.createGain(); ng.gain.value = v.zos ? 0.004 : 0.012;
    ng.gain.setValueAtTime(v.zos ? 0.004 : 0.012, 0); ng.gain.setValueAtTime(0.05, lead + dur + 0.02); ng.gain.setValueAtTime(0, lead + dur + tail - 0.02);
    ns.connect(nf); nf.connect(ng); ng.connect(oc.destination); ns.start(0);
    // tón klíčování (krátké dvojpípnutí na začátku)
    const tone = (f, a, b, g) => { const o = oc.createOscillator(), gg = oc.createGain(); o.type = 'sine'; o.frequency.value = f; gg.gain.setValueAtTime(0, a); gg.gain.linearRampToValueAtTime(g, a + 0.005); gg.gain.setValueAtTime(g, b - 0.005); gg.gain.linearRampToValueAtTime(0, b); o.connect(gg); gg.connect(oc.destination); o.start(a); o.stop(b + 0.01); };
    tone(1240, 0.02, 0.07, v.zos ? 0.05 : 0.08); tone(1640, 0.09, 0.14, v.zos ? 0.05 : 0.08);
    src.start(lead);
    return oc.startRendering();
  }
  function chirpOnly(zos) {
    const c = audioCtx(); if (!c) return Promise.resolve();
    const t0 = c.currentTime + 0.02;
    for (const [f, a, b] of [[1240, 0, 0.05], [1640, 0.07, 0.12]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(zos ? 0.05 : 0.09, t0 + a); g.gain.setValueAtTime(0, t0 + b); o.connect(g); g.connect(master); o.start(t0 + a); o.stop(t0 + b + 0.01); }
    return new Promise(r => setTimeout(r, 260));
  }
  // fronta relací – poloduplex, jedna relace za druhou
  function say(text, key) {
    if (!text) return;
    if (queue.length > 6) queue.splice(0, queue.length - 4);
    queue.push({ text, key, p: state === 'ready' ? synth(text, key) : null, at: performance.now() });
    pump();
  }
  async function pump() {
    if (playing) return; playing = true;
    try {
      while (queue.length) {
        const it = queue.shift();
        if (performance.now() - it.at > 45000) continue;
        const c = audioCtx(); if (!c) break;
        const v = voiceOf(it.key);
        const res = it.p ? await it.p : null;
        if (!res || !res.pcm || !res.pcm.length) { await chirpOnly(v.zos); continue; }
        let ab;
        try { ab = await render(res.pcm, res.sr, v); } catch (e) { await chirpOnly(v.zos); continue; }
        await new Promise(resolve => { const s = c.createBufferSource(); s.buffer = ab; s.connect(master); s.onended = resolve; s.start(); setTimeout(resolve, ab.duration * 1000 + 800); });
        await new Promise(r => setTimeout(r, 180));
      }
    } finally { playing = false; }
  }
  // celá ukázková relace do jednoho záznamu (16 kHz) – pro tlačítko Vyzkoušet a export
  async function renderExchange(lines) {
    const out = [];
    for (const [text, key] of lines) {
      const res = await synth(text, key); if (!res) continue;
      const ab = await render(res.pcm, res.sr, voiceOf(key));
      out.push(ab.getChannelData(0), new Float32Array(Math.round(ab.sampleRate * 0.25)));
    }
    const n = out.reduce((a, x) => a + x.length, 0), all = new Float32Array(n); let o = 0;
    for (const x of out) { all.set(x, o); o += x.length; }
    return all;
  }
  const DEMO = [['ZCB101, zde ZCB313, příjem.', '313'], ['ZCB101 na příjmu.', 'zos'], ['ZCB313: pacienta máme ve voze, jedeme do Jindřichova Hradce na urgentní příjem, pacient je schopen překladu.', '313'], ['ZCB101 rozumí, naproti z Jindřichova Hradce posádka 312.', 'zos'], ['ZCB313 rozumí, naproti 312 z Jindřichova Hradce.', '313']];
  function demo() { for (const [t, k] of DEMO) say(t.replace(/^ZCB\d+: /, ''), k); }
  function prefetch(text, key) { if (state === 'ready') synth(text, key); }
  function busy() { return playing || queue.length > 0; }
  return { enable, unlock, setVolume, setTempo, say, prefetch, status, onChange, speakable, busy, chirp: zos => chirpOnly(!!zos), demo, renderExchange, DEMO };
})();
