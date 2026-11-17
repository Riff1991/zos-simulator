// Typy volajících a „ovladače“ chování. Vybírá se podle vztahu, místa a stavu pacienta.
// Každý ovladač má stupnici 0–3; promptem se překládá do chování.
const ARCH = [
  { id: 'vecny', w: 3, popis: 'věcný, klidný, odpovídá stručně a k věci' },
  { id: 'panika', w: 3, popis: 'vyděšený, mluví v útržcích, opakuje „pospěšte si“, často odbíhá od tématu' },
  { id: 'rozcileny', w: 2, popis: 'rozčilený a netrpělivý, ptá se proč tolik otázek a kdy už někdo přijede' },
  { id: 'vagni', w: 2, popis: 'nejistý a vágní, odpovídá „no… asi… nevím“, nesděluje podstatné samo od sebe' },
  { id: 'star', w: 1, popis: 'starší člověk, pomalejší, hůř slyší, občas se ptá „cože?“, mate čísla a časy' },
  { id: 'plac', w: 1, popis: 'v slzách, těžko se uklidňuje, odpovídá s odstupem' },
  { id: 'opily', w: 1, popis: 'podnapilý, zmatený, mluví nesouvisle, adresu zná jen přibližně' },
  { id: 'dite', w: 1, popis: 'dítě nebo dospívající, bojí se, říká jen to, co vidí, neví adresu přesně' },
  { id: 'cizinec', w: 1, popis: 'cizinec, česky mluví lámaně a jednoduše, adresu hláskuje špatně' },
  { id: 'nespolupracujici', w: 1, popis: 'odmítá odpovídat na část otázek („to vám nepovím“, „už jedou?“), zavěsí, když se ptá moc' },
];
function pickPersona(rnd, c) {
  const selfCall = /pacient sám/.test(c.oznRel);
  const pool = ARCH.filter(a => (a.id !== 'dite' || (selfCall && c.age < 16)) && (a.id !== 'star' || c.age >= 70));
  const tot = pool.reduce((s, a) => s + a.w, 0); let r = rnd() * tot, ch = pool[0];
  for (const a of pool) { r -= a.w; if (r <= 0) { ch = a; break; } }
  const roadish = ['ulice', 'silnice', 'priroda'].includes(c.where);
  const lvl = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const stres = ch.id === 'vecny' ? lvl(0, 1) : ch.id === 'panika' || ch.id === 'plac' ? 3 : lvl(1, 3);
  const spoluprace = ch.id === 'nespolupracujici' ? 1 : ch.id === 'rozcileny' ? 2 : ch.id === 'vagni' ? 2 : lvl(2, 3);
  // jak dobře zná adresu: 3 přesně, 2 obec a ulici bez čísla, 1 jen obec a orientační bod
  const adresa = roadish ? lvl(1, 2) : (ch.id === 'opily' || ch.id === 'dite' || ch.id === 'cizinec') ? lvl(1, 2) : lvl(2, 3);
  return { typ: ch.id, popis: ch.popis, stres, spoluprace, znalostAdresy: adresa };
}
if (typeof module !== 'undefined') module.exports = { pickPersona, ARCH }; else window.CT_PERSONAS = { pickPersona, ARCH };
