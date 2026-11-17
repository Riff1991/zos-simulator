const { ask } = require('./llm.js');
const { analyzaSystem } = require('./prompts.js');
const { strip, checkForm } = require('./check.js');
async function analyza({ view, key, transcript, form }) {
  const txt = transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
  const user = `LIST FAKTŮ:\n${JSON.stringify(view, null, 1)}\n\nKEY:\n${JSON.stringify(key, null, 1)}\n\nFORMULÁŘ OD CALLTAKERA:\n${JSON.stringify(form)}\n\nPŘEPIS:\n${txt}`;
  const out = await ask({ system: analyzaSystem(), messages: [{ role: 'user', content: user }], maxTokens: 1200, temperature: 0, model: process.env.CALLTAKER_ANALYZA_MODEL });
  const m = out.match(/\{[\s\S]*\}/);
  let analyza = null; try { analyza = JSON.parse(m ? m[0] : out); } catch (e) { analyza = { chyba: 'neplatný JSON', raw: out }; }
  return { pravidla: checkForm(form, key), analyza };
}
module.exports = { analyza, checkForm, strip };
