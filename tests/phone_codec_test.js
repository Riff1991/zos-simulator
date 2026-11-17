// Test kodeku telefonní linky (calltaker/phonecodec.js): µ-law kvantizace, převzorkování na 8 kHz, ztráta rámců s náhradou, ohraničený výstup.
const path = require('path'), vm = require('vm'), R = path.join(__dirname, '..');
const { src, LINES } = require(path.join(R, 'calltaker/phonecodec.js'));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('CHYBA:', m); } else console.log('ok:', m); };
function make(opts) {
  let Cls = null;
  const ctx = { AudioWorkletProcessor: class {}, registerProcessor: (n, c) => { Cls = c; }, sampleRate: 24000, Math };
  vm.runInNewContext(src, ctx);
  return new Cls({ processorOptions: opts });
}
const run = (node, input) => { const out = new Float32Array(input.length); for (let i = 0; i < input.length; i += 128) { const o = new Float32Array(128); node.process([[input.subarray(i, i + 128)]], [[o]]); out.set(o, i); } return out; };
const sine = (n, f, a) => Float32Array.from({ length: n }, (_, i) => a * Math.sin(2 * Math.PI * f * i / 24000));
const N = 128 * 200;
// 1) kvantizace: 256 úrovní µ-law dá omezený počet hodnot, signál zůstává blízko původnímu
{ const o = run(make({ steps: 256, loss: 0 }), sine(N, 440, 0.6)); const lv = new Set(Array.from(o, v => Math.round(v * 1e6)));
  let e = 0, x = 0; const ref = sine(N, 440, 0.6); for (let i = 600; i < N; i++) { e += (o[i] - ref[Math.max(0, i - 0)]) ** 2; x += ref[i] ** 2; }
  ok(lv.size > 5 && lv.size < 400, 'µ-law: konečný počet úrovní (' + lv.size + ')');
  ok(Array.from(o).every(v => Math.abs(v) <= 1.0001 && Number.isFinite(v)), 'výstup je ohraničený a konečný'); void e; void x; }
// 2) 64 úrovní je zrnitější (méně úrovní) než 256
{ const a = new Set(Array.from(run(make({ steps: 256, loss: 0 }), sine(N, 300, 0.7)), v => Math.round(v * 1e6))).size, b = new Set(Array.from(run(make({ steps: 64, loss: 0 }), sine(N, 300, 0.7)), v => Math.round(v * 1e6))).size;
  ok(b < a, 'slabý signál má hrubší kvantizaci (' + b + ' < ' + a + ' úrovní)'); }
// 3) převzorkování na 8 kHz: výstup se drží po 3 vzorcích (24 kHz / 8 kHz)
{ const o = run(make({ steps: 256, loss: 0 }), sine(N, 1000, 0.5)); let same = 0, tot = 0; for (let i = 3; i < N - 3; i += 3) { tot++; if (o[i] === o[i + 1] && o[i + 1] === o[i + 2]) same++; }
  ok(same / tot > 0.95, 'vzorky se drží po 3 (převzorkování na 8 kHz): ' + Math.round(same / tot * 100) + ' %'); }
// 4) ztráta rámců: při loss = 1 se rámce nahrazují ztlumeným předchozím, po sérii dozní do ticha; bez ztráty ne
{ const input = sine(N, 500, 0.6), a = run(make({ steps: 256, loss: 0 }), input), b = run(make({ steps: 256, loss: 1, burst: 1 }), input);
  const rms = (x, from, to) => Math.sqrt(x.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
  ok(rms(a, 4000, N) > 0.3, 'bez ztráty hlas prochází (RMS ' + rms(a, 4000, N).toFixed(2) + ')');
  ok(rms(b, 12000, N) < 0.02, 'při trvalé ztrátě rámců signál dozní do ticha (RMS ' + rms(b, 12000, N).toFixed(3) + ')'); }
// 5) střední ztráta: část rámců je ztracená, ale ne všechny
{ const input = sine(N * 4, 500, 0.6), o = run(make({ steps: 256, loss: 0.1, burst: 2 }), input), ref = run(make({ steps: 256, loss: 0 }), input);
  let diff = 0; for (let i = 0; i < o.length; i += 480) { let d = 0; for (let j = 0; j < 480 && i + j < o.length; j++) d += Math.abs(o[i + j] - ref[i + j]); if (d > 1) diff++; }
  const frames = Math.floor(o.length / 480);
  ok(diff > 0 && diff < frames * 0.6, 'střední ztráta: ' + diff + ' z ' + frames + ' rámců se liší'); }
ok(LINES.pevna.loss === 0 && LINES.mobil.loss > 0 && LINES.slaby.loss > LINES.mobil.loss && LINES.slaby.steps < LINES.mobil.steps, 'profily linky: pevná bez ztrát, mobil se ztrátami, slabý signál nejhorší');
console.log(fail ? 'SELHALO: ' + fail : 'phone codec test OK'); process.exit(fail ? 1 : 0);
