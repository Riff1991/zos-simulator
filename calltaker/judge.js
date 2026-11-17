const { ask } = require('./llm.js');
const { judgeSystem } = require('./prompts.js');
const strip = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
// deterministická kontrola formuláře proti klíči (adresa, obec, N)
function checkForm(form, key) {
  const adr = strip(String(key.adresa).split(',')[0]), num = (adr.match(/\d+(?:\/\d+)?/) || [''])[0], street = adr.replace(/\d+(?:\/\d+)?/g, '').trim();
  const f = strip(form.adresa);
  return {
    ulice: street ? f.includes(street) : true,
    cislo: num ? f.split(' ').some(t => t === num || t.split('/')[0] === num.split('/')[0]) : true,
    obec: strip(form.adresa + ' ' + (form.obec || '')).includes(strip(key.obec)),
    naléhavost: String(form.n).toUpperCase().replace(/^(\d)$/, 'N$1') === key.naléhavost,
    spravne: key.naléhavost, zadano: form.n,
  };
}
async function judge({ view, key, transcript, form }) {
  const txt = transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
  const user = `LIST FAKTŮ:\n${JSON.stringify(view, null, 1)}\n\nKEY:\n${JSON.stringify(key, null, 1)}\n\nFORMULÁŘ OD CALLTAKERA:\n${JSON.stringify(form)}\n\nPŘEPIS:\n${txt}`;
  const out = await ask({ system: judgeSystem(), messages: [{ role: 'user', content: user }], maxTokens: 1200, temperature: 0, model: process.env.CALLTAKER_JUDGE_MODEL });
  const m = out.match(/\{[\s\S]*\}/);
  let soudce = null; try { soudce = JSON.parse(m ? m[0] : out); } catch (e) { soudce = { chyba: 'neplatný JSON', raw: out }; }
  return { pravidla: checkForm(form, key), soudce };
}
module.exports = { judge, checkForm, strip };
