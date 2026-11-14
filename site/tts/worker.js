// Hlasová syntéza pro rádiové relace (běží ve Web Workeru, nezávisle na systému).
// Piper (hlas cs_CZ jirka medium) přes onnxruntime-web, fonémy přes espeak-ng (piper-phonemize, WASM).
// build.py kopíruje tento soubor do site/tts/worker.js. Všechny soubory jsou lokálně v site/tts/.
/* global importScripts, createPiperPhonemize, ort, postMessage, self */
importScripts('piper_phonemize.js', 'ort.wasm.min.js');
const MODEL = 'cs_CZ-jirka-medium.onnx';
let ready = null, mod = null, sess = null, cfg = null, sink = null;

async function fetchProgress(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  const total = Number(res.headers.get('content-length')) || 63201294;
  if (!res.body || !res.body.getReader) return new Uint8Array(await res.arrayBuffer());
  const rd = res.body.getReader(), parts = []; let got = 0, last = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (got - last > 1.5e6) { last = got; postMessage({ type: 'progress', loaded: got, total }); }
  }
  const out = new Uint8Array(got); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  postMessage({ type: 'progress', loaded: got, total });
  return out;
}
async function init() {
  cfg = await (await fetch(MODEL + '.json')).json();
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = './';
  mod = await createPiperPhonemize({ print: d => { if (sink) sink(d); }, printErr: () => {}, locateFile: u => u.split('/').pop(), noInitialRun: true });
  const buf = await fetchProgress(MODEL);
  sess = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
  postMessage({ type: 'ready', sampleRate: cfg.audio.sample_rate });
}
function phonemes(text) {
  let out = null; sink = d => { out = d; };
  mod.callMain(['-l', cfg.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
  sink = null;
  if (!out) throw new Error('fonémy se nepodařilo vytvořit');
  return JSON.parse(out).phoneme_ids;
}
self.onmessage = async ev => {
  const m = ev.data || {};
  try {
    if (!ready) ready = init();
    await ready;
    if (m.type === 'init') return;
    const ids = phonemes(String(m.text || '').slice(0, 600));
    const inf = cfg.inference;
    const feeds = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([m.ns != null ? m.ns : inf.noise_scale, m.ls != null ? m.ls : inf.length_scale, m.nw != null ? m.nw : inf.noise_w]), [3]),
    };
    const r = await sess.run(feeds);
    const pcm = new Float32Array(r.output.data);
    postMessage({ type: 'audio', id: m.id, pcm, sampleRate: cfg.audio.sample_rate }, [pcm.buffer]);
  } catch (err) {
    ready = ready && sess ? ready : null;
    postMessage({ type: 'error', id: m.id, error: String(err && err.message || err) });
  }
};
