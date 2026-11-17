(function () {
  const $ = id => document.getElementById(id);
  const P = window.CT_PROMPTS, CHK = window.CT_CHECK, CASES = window.CT_CASES;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  let cur = null, msgs = [], transcript = [], busy = false, ended = false;

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const key = () => $('key').value.trim();
  const model = () => $('model').value.trim();
  function status(t, bad) { $('status').textContent = t || ''; $('status').className = bad ? 'bad' : ''; }

  async function oa(path, body) {
    const r = await fetch('https://api.openai.com/v1' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key() }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
    return j;
  }
  async function chat(system, history, opts) {
    const body = Object.assign({ model: model(), messages: [{ role: 'system', content: system }].concat(history), max_completion_tokens: 1500 }, opts || {});
    const j = await oa('/chat/completions', body);
    return ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
  }

  async function loadModels() {
    if (!key()) { status('Nejdřív vlož API klíč.', true); return; }
    status('Načítám modely…');
    try {
      const j = await oa('/models');
      const ids = j.data.map(m => m.id).filter(id => /^(gpt-|o\d|chatgpt)/.test(id) && !/realtime|audio|tts|transcribe|image|embedding|search|moderation|codex|instruct|preview|dall|whisper|\d{4}-\d{2}-\d{2}$/.test(id)).sort();
      const pref = ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-5'];
      const best = pref.find(p => ids.includes(p)) || ids[0] || '';
      $('modelList').innerHTML = ids.map(i => '<option value="' + esc(i) + '">').join('');
      if (!$('model').value) $('model').value = best;
      status('Modelů: ' + ids.length + (best ? '. Vybrán ' + best + ' (lze změnit).' : '.'));
      return true;
    } catch (e) { status('Klíč nebo síť: ' + e.message, true); }
  }

  function newCall() {
    if (!key() || !model()) { status('Vlož klíč a vyber model (tlačítko Načíst modely).', true); return; }
    if ($('remember').checked) { store.set('ct_key', key()); store.set('ct_model', model()); } else store.del('ct_key');
    cur = CASES[Math.floor(Math.random() * CASES.length)];
    msgs = []; transcript = []; ended = false;
    $('log').innerHTML = ''; $('form').hidden = true; $('result').hidden = true; $('call').hidden = false; $('setup').open = false;
    $('ani').textContent = cur.view.volajici.telefon + ' · ' + cur.view.volajici.linka + ' · hovor č. ' + cur.view.seed;
    $('say').disabled = false; $('send').disabled = false; $('end').disabled = false; $('say').value = ''; $('say').focus();
    bubble('sys', 'Příchozí hovor. Zvedni linku a pozdrav (např. „Zdravotnická záchranná služba, co se stalo?“).');
    status('');
  }
  function bubble(who, text) {
    const d = document.createElement('div'); d.className = 'b ' + who; d.textContent = text; $('log').appendChild(d); d.scrollIntoView({ block: 'end' });
  }
  async function send() {
    const t = $('say').value.trim(); if (!t || busy || ended) return;
    $('say').value = ''; bubble('me', t); transcript.push({ role: 'calltaker', text: t }); msgs.push({ role: 'user', content: t });
    busy = true; $('send').disabled = true; status('Volající odpovídá…');
    try {
      const rep = await chat(P.callerSystem(cur.view), msgs);
      msgs.push({ role: 'assistant', content: rep });
      const end = /\[KONEC\]/.test(rep), shown = rep.replace(/\[KONEC\]/g, '').trim();
      transcript.push({ role: 'volajici', text: shown }); bubble('them', shown); status('');
      if (end) endCall();
    } catch (e) { status('Chyba API: ' + e.message, true); msgs.pop(); transcript.pop(); }
    busy = false; $('send').disabled = ended; if (!ended) $('say').focus();
  }
  function endCall() {
    ended = true; $('say').disabled = true; $('send').disabled = true; $('end').disabled = true;
    $('form').hidden = false; $('form').scrollIntoView({ behavior: 'smooth' });
  }
  async function judgeCall() {
    const form = { adresa: $('fAdr').value.trim(), n: $('fN').value, indikace: $('fInd').value.trim(), poznamka: $('fNote').value.trim() };
    const rules = CHK.checkForm(form, cur.key);
    $('result').hidden = false; $('result').innerHTML = '<p>Vyhodnocuji…</p>';
    const txt = transcript.map(t => (t.role === 'calltaker' ? 'CALLTAKER: ' : 'VOLAJÍCÍ: ') + t.text).join('\n');
    const user = 'LIST FAKTŮ:\n' + JSON.stringify(cur.view, null, 1) + '\n\nKEY:\n' + JSON.stringify(cur.key, null, 1) + '\n\nFORMULÁŘ OD CALLTAKERA:\n' + JSON.stringify(form) + '\n\nPŘEPIS:\n' + txt;
    let soudce = null;
    try {
      const out = await chat(P.judgeSystem(), [{ role: 'user', content: user }], { response_format: { type: 'json_object' } });
      const m = out.match(/\{[\s\S]*\}/); soudce = JSON.parse(m ? m[0] : out);
    } catch (e) { soudce = { chyba: e.message }; }
    render(rules, soudce, form);
  }
  const yn = v => (v === true ? '✔' : v === false ? '✘' : esc(v));
  function render(r, s, form) {
    const k = cur.key, c = s && s.calltaker, v = s && s.realismus_volajiciho;
    let h = '<h3>Kontrola pravidly</h3><ul><li>Ulice ' + yn(r.ulice) + ' · číslo ' + yn(r.cislo) + ' · obec ' + yn(r.obec) + '</li><li>Naléhavost: zadáno ' + esc(r.zadano || '–') + ', správně <b>' + esc(r.spravne) + '</b> ' + yn(r.naléhavost) + '</li></ul>';
    h += '<h3>Správná odpověď</h3><p>' + esc(k.adresa) + ' · ' + esc(k.klasifikace) + ' · ' + esc(k.priznaky) + ' · pacient ' + esc(k.vek) + ' let' + (k.dynamicka ? ' · dynamická indikace' : '') + (k.lekar ? ' · lékař' : '') + '</p>';
    if (c) h += '<h3>Soudce: calltaker</h3><ul>' + Object.keys(c).filter(x => x !== 'komentar').map(x => '<li>' + esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' ')) + ': ' + (Array.isArray(c[x]) ? esc(c[x].join('; ') || '–') : yn(c[x])) + '</li>').join('') + '</ul><p>' + esc(c.komentar || '') + '</p>';
    if (v) h += '<h3>Soudce: realismus volajícího</h3><ul>' + Object.keys(v).filter(x => x !== 'komentar').map(x => '<li>' + esc(x.replace(/_0_5$/, ' (0–5)').replace(/_/g, ' ')) + ': ' + (Array.isArray(v[x]) ? esc(v[x].join('; ') || '–') : yn(v[x])) + '</li>').join('') + '</ul><p>' + esc(v.komentar || '') + '</p>';
    if (s && s.chyba) h += '<p class="bad">Soudce selhal: ' + esc(s.chyba) + '</p>';
    h += '<h3>Tvoje hodnocení realismu (1–5)</h3><p><select id="myScore"><option>–</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select> <input id="myNote" placeholder="Co bylo nereálné?" style="width:60%"></p>';
    h += '<p><button id="dl">Stáhnout hovor (JSON)</button> <button id="again" class="pri">Další hovor</button></p>';
    $('result').innerHTML = h;
    $('again').onclick = newCall;
    $('dl').onclick = () => {
      const data = { seed: cur.view.seed, view: cur.view, key: cur.key, transcript, form, rules: r, soudce: s, mojeHodnoceni: { skore: $('myScore').value, poznamka: $('myNote').value }, model: model() };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = 'hovor-' + cur.view.seed + '.json'; a.click();
    };
  }

  $('load').onclick = loadModels; $('start').onclick = newCall; $('send').onclick = send; $('end').onclick = endCall; $('judge').onclick = judgeCall;
  $('say').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const k = store.get('ct_key'); if (k) { $('key').value = k; $('remember').checked = true; $('model').value = store.get('ct_model') || ''; }
})();
