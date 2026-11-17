// Telefonní linka pro hlas volajícího: kodek v AudioWorkletu a profily linky (pevná, mobil, slabý signál).
// Podle rešerše autentický „telefonní“ zvuk nevzniká jen ekvalizérem: rozhoduje převzorkování na 8 kHz (aliasing a zrnitost),
// kvantizace G.711 µ-law (8 bit), měkké ořezání špiček a u mobilu ztráta 20ms rámců s náhradou předchozím rámcem (PLC) a komfortní šum.
// Worklet běží v audio vlákně; zdroj se předává přes Blob (viz src/live-voice.js). Bez DOM, testovatelné v Nodu.
const LINES = {
  // hp/lp: pásmo (Hz); steps: počet úrovní kvantizátoru (256 = G.711); loss: pravděpodobnost ztráty rámce (20 ms); burst: nejdelší shluk ztracených rámců
  // hiss: základní šum, follow: sílení šumu podle hlasitosti řeči, drive: měkké ořezání, clicks: lupance, hum: brum 50 Hz, peak: zvýraznění 2 kHz (dB)
  pevna: { hp: 300, lp: 3400, steps: 256, loss: 0, burst: 1, hiss: 0.0025, follow: 0.3, drive: 1.5, clicks: 0.03, hum: 0.0006, peak: 3 },
  mobil: { hp: 220, lp: 3600, steps: 256, loss: 0.01, burst: 2, hiss: 0.004, follow: 0.4, drive: 1.6, clicks: 0.02, hum: 0, peak: 2 },
  slaby: { hp: 300, lp: 3000, steps: 64, loss: 0.05, burst: 3, hiss: 0.009, follow: 0.55, drive: 2.0, clicks: 0.06, hum: 0, peak: 1 },
};
function workletModule() {
  class PhoneCodec extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const p = (o && o.processorOptions) || {};
      this.k = Math.max(1, Math.round(sampleRate / 8000));   // dělitel vzorkování na 8 kHz (u 24 kHz přesně 3)
      this.steps = p.steps || 256; this.loss = p.loss || 0; this.burst = p.burst || 1; this.mu = 255;
      this.ph = 0; this.cur = 0; this.cnt = 0; this.lost = false; this.lossLeft = 0; this.lostN = 0;
      this.frame = new Float32Array(160); this.good = new Float32Array(160);   // 20 ms při 8 kHz
    }
    // G.711 µ-law: komprese, kvantizace, expanze
    q(x) {
      const s = x < 0 ? -1 : 1, a = Math.min(1, Math.abs(x)), y = Math.log(1 + this.mu * a) / Math.log(1 + this.mu), h = this.steps / 2, yq = Math.round(y * h) / h;
      return s * (Math.pow(1 + this.mu, yq) - 1) / this.mu;
    }
    process(inputs, outputs) {
      const out = outputs[0] && outputs[0][0]; if (!out) return true;
      const inp = inputs[0] && inputs[0][0];
      for (let i = 0; i < out.length; i++) {
        if (this.ph === 0) {   // nový vzorek 8 kHz: bere se jen každý k-tý (aliasing je záměr)
          if (this.cnt === 0) {   // začátek 20ms rámce: ztráta rámce (shluky)
            if (this.lossLeft === 0 && this.loss > 0 && Math.random() < this.loss) this.lossLeft = 1 + Math.floor(Math.random() * this.burst);
            this.lost = this.lossLeft > 0;
            if (this.lost) { this.lossLeft--; this.lostN++; } else this.lostN = 0;
          }
          const y = this.q(inp ? inp[i] : 0);
          this.frame[this.cnt] = y;
          this.cur = this.lost ? this.good[this.cnt] * Math.pow(0.6, this.lostN) : y;   // ztracený rámec: opakování posledního dobrého se ztlumením
          if (++this.cnt === 160) { this.cnt = 0; if (!this.lost) this.good.set(this.frame); }
        }
        out[i] = this.cur;   // podržení vzorku (zero-order hold)
        this.ph = (this.ph + 1) % this.k;
      }
      return true;
    }
  }
  registerProcessor('phone-codec', PhoneCodec);
}
const src = '(' + workletModule.toString() + ')();';
if (typeof module !== 'undefined') module.exports = { src, LINES }; else window.CT_PHONE = { src, LINES };
