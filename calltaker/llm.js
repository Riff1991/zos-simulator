// Minimální klient Anthropic Messages API (bez závislostí). Klíč jen z prostředí, nikdy do repa.
const URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages';
async function ask({ system, messages, model, maxTokens = 300, temperature = 1 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Chybí ANTHROPIC_API_KEY (viz calltaker/README.md).');
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: model || process.env.CALLTAKER_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, temperature, system, messages }),
  });
  if (!r.ok) throw new Error('API ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
}
module.exports = { ask };
