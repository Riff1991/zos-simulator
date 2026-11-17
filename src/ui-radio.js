// UI – Rádio, výcvik, hlas, upozornění (části se v build.py skládají v tomto pořadí do jednoho skriptu).
// ---------- rádio ----------
function renderRadio() {
  const active = sim.s.crews.filter(k => k.hospitalRun && ['transport', 'handover', 'return'].includes(k.hospitalRun.phase) && (k.type === 'RZP' || k.type === 'RV'));
  active.sort((a, b) => a.hospitalRun.availableAt - b.hospitalRun.availableAt);
  setHTML($('transport-board'), active.length ? active.map(k => {
    const run = k.hospitalRun, remaining = Math.max(0, run.availableAt - sim.s.t);
    const esc_ = !!run.escort;
    const phase = run.phase === 'transport' ? (esc_ ? 'Doprovod do nemocnice' : 'Na cestě do nemocnice') : run.phase === 'handover' ? 'Předání pacienta' : 'Po předání, vrací se na základnu';
    const detail = run.phase === 'transport' ? `Příjem za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : run.phase === 'handover' ? `Konec předání za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : 'volná';
    const availability = remaining <= 0 ? 'Volná nyní' : run.phase === 'transport' ? `Volná přibližně za ${Math.ceil(remaining / 60)} min` : `Volná za ${Math.ceil(remaining / 60)} min`;
    return `<div class="transport-row ${run.phase}"><b>${esc(k.name)}</b><span>${esc(run.hospitalName)}</span><span>${phase} · ${detail}</span><span class="transport-time">${availability}</span></div>`;
  }).join('') : '<div class="transport-empty">Žádná posádka právě nejede do nemocnice ani se nevrací po předání.</div>');
  const L = sim.s.log, out = [], nowMs = performance.now(), feedById = new Map(radioFeed.map(x => [x.id, x]));
  for (let i = L.length - 1; i >= 0 && out.length < 90; i--) { const e = L[i]; if (e.kind === 'crew' && (feedById.has(e.id) ? !(feedById.get(e.id).shownAt != null && feedById.get(e.id).shownAt <= nowMs) : (logDueAt.get(e.id) || 0) > nowMs)) continue; const kind = e.kind === 'deadline' ? 'alert' : e.kind, vj = isVstricnaRadioMessage(e.txt); out.push(`<div class="k-${kind}${vj ? ' k-vstricna' : ''} ${e.cid ? 'click' : ''}" ${e.cid ? `data-case="${e.cid}"` : ''}><time>${e.clock}</time><span>${esc(e.txt)}</span></div>`); }
  setHTML($('log'), out.join(''));
}



// ---------- výcvik: první směna s návodem ----------
let tut = null;
const TUT = ZOS_TUTORIAL.lessons.flatMap((L, li) => L.steps.map((st, i) => Object.assign({}, st, { lesson: L.title, li, nL: ZOS_TUTORIAL.lessons.length, setup: i === 0 ? L.setup : null, lastOfLesson: i === L.steps.length - 1 })));
const tutArg = () => [sim, tut.T, { sel }];
const tutText = st => typeof st.t === 'function' ? st.t(sim, tut.T) : st.t;
function startTutorial() {
  window._opt = Object.assign({}, window._opt || {}, { mode: 'shift', hour: 9, diff: 0.6, secondaryEnabled: 'false', muEnabled: 'false', muProbability: 0, startState: 'clean', libero: 'auto' });
  settings.radioInteractive = true; saveSettings();
  newGame(true);
  sim.startScripted('clear');
  tut = { i: 0, shown: null, T: {} };
  tutEnter(); speed = 0;
  tutRender();
}
function tutEnter() {
  const st = TUT[tut.i];
  if (st.setup) { tut.T = {}; st.setup(sim, tut.T); }
  if (st.enter) st.enter(sim, tut.T);
}
function tutEnd() { tut = null; const el = $('tut'); if (el) el.remove(); document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); if (sim && !speed) speed = savedSpeed || 1; }
function tutNext(manual) {
  if (!tut) return;
  const st = TUT[tut.i];
  if (st && manual && tut.i === TUT.length - 1) { tutEnd(); speed = 0; toast('Výcvik dokončen. Směnu spustíš z menu.', ''); homeModal(); return; }
  tut.i++;
  while (TUT[tut.i]) { tutEnter(); if (TUT[tut.i].skipIf && TUT[tut.i].skipIf(...tutArg())) tut.i++; else break; }
  if (!TUT[tut.i]) { tutEnd(); return; }
  const nx = TUT[tut.i];
  if (nx.pause) speed = 0; else speed = nx.fast || Math.max(speed, 1);
  tutRender();
}
function tutRender() {
  if (!tut) return;
  const st = TUT[tut.i]; if (!st) return tutEnd();
  let el = $('tut');
  if (!el) { el = document.createElement('div'); el.id = 'tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  const txt = tutText(st), key = tut.i + '|' + txt;
  if (tut.shown !== key) {
    tut.shown = key;
    const lastStep = tut.i === TUT.length - 1;
    el.innerHTML = `<div class="tut-step">Lekce ${st.li + 1}/${st.nL} · ${esc(st.lesson)} · krok ${tut.i + 1}/${TUT.length}</div><p>${esc(txt)}</p><div class="tut-btns">${st.next ? `<button class="btn pri" data-act="tut-next">${lastStep ? 'Dokončit' : st.lastOfLesson ? 'Další lekce' : 'Dál'}</button>` : '<span class="tut-wait">čekám na tvůj krok…</span>'}${st.next ? '' : '<button class="btn" data-act="tut-next">Přeskočit krok</button>'}<button class="btn" data-act="tut-skip">Ukončit návod</button></div>`;
  }
  document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
  const hl = typeof st.hl === 'function' ? st.hl(sim, tut.T) : st.hl;
  if (hl) { const t = document.querySelector(hl); if (t) t.classList.add('tut-hl'); }
}
function tutTick() {
  if (!tut || !sim) return;
  const st = TUT[tut.i];
  if (st && st.done && st.done(...tutArg())) { tutNext(false); return; }
  if (st && !st.pause && !st.next && speed === 0 && !modalOpen) speed = st.fast || 1;
  tutRender();
}
// ---------- rádio: hlas a interaktivní relace ----------
function voiceStatusText() {
  if (typeof ZOS_VOICE === 'undefined') return '';
  const v = ZOS_VOICE.status();
  if (!settings.voice) return 'jen tóny vysílačky';
  if (v.cloud === 'on' && v.state === 'ready') return 'připraveno (cloud – Vlasta a Antonín)';
  if (v.cloud === 'down') return 'cloud nedostupný, používám offline hlas (Piper)';
  return v.state === 'ready' ? 'připraveno' : v.state === 'loading' ? `stahuji hlas ${Math.round(v.progress * 100)} % (jednorázově ~80 MB)` : v.state === 'error' ? 'hlas nelze načíst: ' + v.err : '';
}
function applyVoice() {
  if (typeof ZOS_VOICE === 'undefined' || satellitePanel) return;
  ZOS_VOICE.unlock(); ZOS_VOICE.setVolume((settings.volume || 0) / 100 * 1.1); ZOS_VOICE.setTempo(settings.voiceTempo);
  ZOS_VOICE.setCloud(settings.voiceEngine === 'cloud' ? (settings.ttsUrl || D.ttsUrl || '') : '');
  ZOS_VOICE.enable(!!settings.voice && !!settings.sound);
}
if (typeof ZOS_VOICE !== 'undefined') ZOS_VOICE.onChange(() => { const el = $('voice-status'); if (el) el.textContent = voiceStatusText(); if (sim) renderRadioLive(); });
function voiceSay0(text, key, isCall, id) {
  if (!settings.sound || typeof ZOS_VOICE === 'undefined') return;
  const st = ZOS_VOICE.status().state;
  if (settings.voice && (st === 'ready' || st === 'loading')) ZOS_VOICE.say(text, key, id);
  else if (isCall) ZOS_VOICE.chirp(false);
}
// posádka, která právě vysílá, bliká v přehledu posádek
const talkCodes = new Set();
function setTalking(key, on) {
  const k = String(key); if (on) talkCodes.add(k); else talkCodes.delete(k);
  document.querySelectorAll(`#crews .tile[data-code="${k}"]`).forEach(el => el.classList.toggle('talking', on));
}
if (typeof ZOS_VOICE !== 'undefined') ZOS_VOICE.onSpeak((key, on, id) => {
  if (on !== 'drop' && key !== 'zos') setTalking(key, on);
  if ((on === true || on === 'drop') && id != null) { const it = radioFeed.find(x => x.id === id); if (it && it.shownAt == null) it.shownAt = performance.now(); }   // řádek se ukáže, když ho hlas začne říkat
});
function voiceSay(text, key, isCall, id) {
  const st = typeof ZOS_VOICE !== 'undefined' ? ZOS_VOICE.status().state : 'off', real = settings.sound && settings.voice && (st === 'ready' || st === 'loading');
  if (!real && key !== 'zos' && settings.sound !== undefined) { setTalking(key, true); setTimeout(() => setTalking(key, false), Math.min(9000, 1200 + String(text).length * 65)); }
  voiceSay0(text, key, isCall, id);
}
// rozpoznání rádiové hlášky podle textu: kdo mluví (ZOS / posádka), hlas a mluvený text; null = není to rádiový hovor
function radioParse(txt) {
  let m;
  if ((m = /^ZCB101, zde (?:ZCB(\d+)|Kryštof (\d+))/.exec(txt))) return { who: 'crew', key: m[1] || 'K' + m[2], text: txt, call: true };
  if ((m = /^ZCB101, zde (ZOS [^,]+)/.exec(txt))) return { who: 'crew', key: 'nb-' + m[1], text: txt, call: true };
  if (/^ZCB\d+, (?:zde )?ZCB101\b/.test(txt)) return { who: 'zos', key: 'zos', text: txt, call: /^ZCB\d+, zde ZCB101\b|^ZCB\d+, ZCB101\.$/.test(txt) };
  if (/^ZCB101: /.test(txt)) return { who: 'zos', key: 'zos', text: txt.replace(/^ZCB101: /, '') };
  if (/^ZCB101\b/.test(txt)) return { who: 'zos', key: 'zos', text: txt };
  if ((m = /^(?:ZCB(\d+)|Kryštof (\d+))(?: a \d+)?: (.*)$/.exec(txt))) return { who: 'crew', key: m[1] || 'K' + m[2], text: m[3] };
  if ((m = /^(ZOS [^:]+): (.*)$/.exec(txt))) return { who: 'crew', key: 'nb-' + m[1], text: m[2] };
  if ((m = /^ZCB(\d+) (?:rozumí|na příjmu)/.exec(txt))) return { who: 'crew', key: m[1], text: txt };
  return null;
}
function radioSpeak(txt, id) {
  const r = radioParse(txt);
  if (r) return voiceSay(r.text, r.key, !!r.call, id);
}
// zda se hlášky skutečně přehrají hlasem (pak se v panelu ukážou ve chvíli, kdy je hlas začne říkat)
function voiceWillSpeak() {
  if (satellitePanel || !settings.sound || !settings.voice || typeof ZOS_VOICE === 'undefined') return false;
  const st = ZOS_VOICE.status().state; return st === 'ready' || st === 'loading';
}
const radioOpen = () => (sim && sim.s.radioQ || []).filter(e => e.state === 'calling' || e.state === 'open' || e.state === 'zos');
const radioPending = () => sim && sim.s.radioMode === 'interactive' && radioOpen().some(e => e.state !== 'zos');
const radioSlowActive = () => !!(settings.radioSlow && radioPending());
const rqPrefetched = new Set();
const RC_DELAY = 3500, rcSeen = new Map();
// živý přepis hovoru: řádky se objevují ve chvíli, kdy je hlas řekne (skutečný čas, nezávisle na rychlosti hry); po konci zůstane RC_HOLD ms
const RC_HOLD = 6000, RC_CHAIN = 12000;
function feedChain(crid) {
  const L = radioFeed.filter(x => x.crid === crid); if (!L.length) return [];
  const out = [L[L.length - 1]];
  for (let i = L.length - 2; i >= 0; i--) { if (out[0].t0 - L[i].t0 <= RC_CHAIN) out.unshift(L[i]); else break; }
  return out;
}
const signOf = code => (/^K/i.test(String(code || '')) ? 'Kryštof ' + String(code).replace(/\D/g, '') : 'ZCB' + (code || ''));
function transcriptHtml(chain, now, max) {
  const shown = chain.filter(x => x.shownAt != null && x.shownAt <= now).slice(-(max || 4));   // panel má pevnou výšku: jen poslední řádky
  if (!shown.length) return '';
  const code = (sim.crewOf(chain[0].crid) || {}).code;
  return `<div class="rc-chat">${shown.map((x, i) => `<div class="rc-bub ${x.who}${i === shown.length - 1 && now - x.due < 3500 ? ' now' : ''}"><span class="rc-who">${x.who === 'zos' ? 'ZCB101 · ZOS' : esc(code ? signOf(code) : (chain[0].txt.match(/^ZCB101, zde ([^,]+),/) || [0, 'soused'])[1]) + ' · ' + (code ? 'posádka' : 'operační středisko')}</span>${esc(x.text)}</div>`).join('')}</div>`;
}
// nejnovější hovor, který se ještě vysílá nebo před chvílí skončil (pro automatický režim a po odpovědi dispečera)
function liveSession(now) {
  const heard = radioFeed.filter(x => x.shownAt != null && x.shownAt <= now); if (!heard.length) return null;
  const last = heard.reduce((b, x) => (x.shownAt >= b.shownAt ? x : b), heard[0]), chain = feedChain(last.crid), pending = chain.some(x => x.shownAt == null || x.shownAt > now);
  if (!pending && now - last.shownAt > RC_HOLD) return null;
  const lab = (/^ZCB101, zde ([^,]+),/.exec((chain.find(x => x.who === 'crew') || {}).txt || '') || [])[1] || '';
  return { crid: last.crid, cid: last.cid, chain, label: lab };
}
function renderRadioLive() {
  const box = $('radio-live'); if (!box || !sim) return;
  const list = radioOpen().slice(-4), now = performance.now();
  for (const x of radioFeed) if (x.shownAt == null && now - x.t0 > 15000) x.shownAt = now;   // pojistka, kdyby hlas zamrzl
  const auto = !list.length ? liveSession(now) : null;
  const win = $('w-rcom'); if (win) win.classList.toggle('live', list.length > 0 || !!auto);
  for (const e of list) if (!rqPrefetched.has(e.id) && typeof ZOS_VOICE !== 'undefined' && settings.voice) { rqPrefetched.add(e.id); ZOS_VOICE.prefetch(e.msg, e.code); for (const o of e.opts || []) if (o.say) ZOS_VOICE.prefetch(o.say, 'zos'); }
  const cs = id => id ? sim.caseOf(id) : null;
  if (auto) {
    const k = sim.crewOf(auto.crid), c = auto.cid ? sim.caseOf(auto.cid) : null, tag = c && c.status !== 'intake' ? `<span class="rc-case" data-case="${c.id}">${esc(c.num)} · N${c.n}</span>` : '';
    setHTML(box, `<div class="radio-call session"><div class="rc-head"><span class="rc-ico" aria-hidden="true">📻</span><b>${esc(k ? signOf(k.code) : auto.label)}</b><span class="rc-name">${esc(k ? k.name : '')}</span>${tag}</div>${transcriptHtml(auto.chain, now)}</div>`);
    return;
  }
  setHTML(box, !list.length ? '<div class="rc-idle">Frekvence volná · žádná posádka nevolá.</div>' : list.map(e => {
    const c = cs(e.caseId), tag = c ? `<span class="rc-case" data-case="${c.id}">${esc(c.num)} · N${c.n}</span>` : '';
    const sign = e.sign || (/^K/.test(String(e.callCodes || '')) ? 'Kryštof ' + String(e.callCodes).slice(1) : 'ZCB' + (e.callCodes || e.code));
    if (e.state === 'zos') return `<div class="radio-call zos"><span class="rc-ico" aria-hidden="true">📻</span><b>→ ZCB${esc(e.code)}</b><span class="rc-msg">Informuj posádku: ${esc(e.msg)}</span>${tag}<button class="btn pri" data-act="rq-zos" data-rq="${e.id}">Volat posádku</button></div>`;
    if (e.state === 'calling') return `<div class="radio-call calling${e.kind === 'rv' ? ' rv' : ''}"><span class="rc-ico" aria-hidden="true">📻</span><b>${esc(sign)}</b><span class="rc-name">${esc(e.name)} volá${e.tries > 1 ? ` (${e.tries}. volání)` : ''}</span>${tag}<button class="btn pri" data-act="rq-answer" data-rq="${e.id}" title="Klávesa P">Na příjmu</button></div>`;
    if (!rcSeen.has(e.id)) { rcSeen.set(e.id, now); setTimeout(() => { if (sim) renderRadioLive(); }, RC_DELAY + 80); }
    const heard = now - rcSeen.get(e.id) >= RC_DELAY, red = e.kind === 'rv' ? ' rv' : '', flag = e.kind === 'rv' ? '<span class="rc-red">ŽÁDOST O LÉKAŘE</span>' : '';
    if (!heard) return `<div class="radio-call open${red}"><span class="rc-ico" aria-hidden="true">📻</span><b>${esc(sign)}</b><span class="rc-hearing">${esc(e.name)} hlásí…</span>${tag}</div>`;
    const tr = transcriptHtml(feedChain(e.crewId), now, 2);
    return `<div class="radio-call open${red}"><div class="rc-head"><span class="rc-ico" aria-hidden="true">📻</span><b>${esc(sign)}</b>${flag}${tr ? '' : `<span class="rc-msg">${esc(e.msg)}</span>`}${tag}</div>${tr}<span class="rc-opts">${(e.opts || []).map((o, i) => [o, i]).sort((x, y) => e.kind === 'muodsun' ? x[1] - y[1] : ((x[1] * 7 + e.id.length * 3 + Number(e.id.slice(2))) % 5) - ((y[1] * 7 + e.id.length * 3 + Number(e.id.slice(2))) % 5)).map(([o]) => `<button class="btn" data-act="rq-reply" data-rq="${e.id}" data-k="${esc(o.k)}">${esc(o.label)}</button>`).join('')}</span></div>`;
  }).join(''));
}
// ---------- upozornění ----------
function toast(txt, kind) {
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = txt;
  $('toasts').appendChild(t); setTimeout(() => t.remove(), 6500);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}
function beep(f, delay = 0, length = 0.12) {
  if (!settings.sound || !settings.volume) return;
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; g.gain.value = 0.085 * settings.volume / 100; o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + delay); o.stop(audio.currentTime + delay + length); } catch (e) {}
}
function newCallTone() { beep(620, 0, 0.16); beep(790, 0.2, 0.16); beep(1040, 0.4, 0.24); }
function alarmBeep() { beep(1040); setTimeout(() => beep(780), 170); setTimeout(() => beep(1040), 340); }
function vstricnaTone() { beep(740, 0, 0.12); beep(988, 0.15, 0.12); beep(1318, 0.3, 0.2); }
const logDueAt = new Map(); let radioLastAt = 0;
const radioFeed = [];   // rádiové hlášky s časem vyslovení (skutečný čas); zdroj živého přepisu v panelu Rádio
function pollLog() {
  if (typeof ctQuiet === 'function' && ctQuiet()) { for (const e of sim.s.log) if (e.id > seenLog) seenLog = e.id; return; }
  let vstricnaIncoming = false;
  for (const e of sim.s.log) {
    if (e.id <= seenLog) continue;
    seenLog = e.id;
    if (e.kind === 'crew') {
      const now = performance.now(), rp = radioParse(e.txt);
      if (rp) {
        // hlas: řádek se ukáže, až ho hlas začne říkat; bez hlasu se řádky ukazují postupně podle délky věty
        const item = { id: e.id, who: rp.who, key: rp.key, txt: e.txt, text: rp.who === 'zos' ? e.txt.replace(/^ZCB101: /, '').replace(/^ZCB\d+, ZCB101: /, '') : rp.text, crid: e.crid, cid: e.cid, t0: now, shownAt: null };
        if (!voiceWillSpeak()) { const at = Math.max(now + 150, radioLastAt + 600 + Math.min(2600, item.text.length * 30)); radioLastAt = at; item.shownAt = at; }
        radioFeed.push(item); if (radioFeed.length > 80) radioFeed.shift();
        if (!satellitePanel) radioSpeak(e.txt, e.id);
      } else logDueAt.set(e.id, now + 200);
      if (logDueAt.size > 400) logDueAt.delete(logDueAt.keys().next().value);
    }
    if (isVstricnaRadioMessage(e.txt)) {
      vstricnaIncoming = true;
      if (e.kind === 'alert' || e.kind === 'req' || e.kind === 'deadline' || e.kind === 'warn') toast(e.txt, 'alert');
      continue;
    }
    const newCall = e.kind === 'case' && e.txt.startsWith('Nový případ ');
    if (newCall) { toast(e.txt, /: N1\b/.test(e.txt) ? 'alert' : ''); newCallTone(); if (settings.autoPauseN1 && /: N1\b/.test(e.txt) && speed > 0) { speed = 0; toast('Pauza: nová N1. Pokračuj mezerníkem nebo rychlostí nahoře.', 'alert'); } }
    else if (e.kind === 'req' || e.kind === 'alert' || e.kind === 'deadline' || e.kind === 'warn' || (e.kind === 'case' && /: N1/.test(e.txt))) { toast(e.txt, e.kind === 'case' || e.kind === 'deadline' || e.kind === 'req' ? 'alert' : e.kind); if (e.kind === 'deadline') alarmBeep(); else if (!(e.kind === 'warn' && /opožděný výjezd/.test(e.txt))) beep(e.kind === 'req' ? 660 : 880); }
  }
  if (vstricnaIncoming) vstricnaTone();
}
