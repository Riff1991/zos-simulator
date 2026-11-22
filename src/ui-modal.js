// UI – Modální okna a hra (start, konec, vyhodnocení) (části se v build.py skládají v tomto pořadí do jednoho skriptu).
// ---------- modal ----------
function modal(html) { $('modal').innerHTML = html; $('modal').classList.add('on'); modalOpen = true; }
function closeModal() { $('modal').classList.remove('on'); modalOpen = false; lastT = performance.now(); }

function homeModal() {
  let saved = null; try { saved = localStorage.getItem(SAVE_KEY); } catch (e) {}
  let when = '';
  try { if (saved) { const r = Sim.restore(saved); when = ' · ' + r.clockAt(r.s.t); } } catch (e) { when = ''; }
  const upd = `<button class="btn" data-act="check-update">Zkontrolovat aktualizaci</button>`;
  const inst = installPrompt ? ' <button class="btn" data-act="install-app">Nainstalovat aplikaci</button>' : '';
  modal(`<div class="card home"><svg class="home-bg" viewBox="0 0 1000 660" aria-hidden="true"><path d="${typeof ZOS_OUTLINE === 'string' ? ZOS_OUTLINE : ''}"/></svg>
    <h1>ZOS ZZS JčK</h1><p class="sub">Simulátor primárního dispečera · Jihočeský kraj</p>
    <svg class="ecg" viewBox="0 0 300 28" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="#d6453d" stroke-width="1.6" points="0,15 60,15 70,15 76,5 82,24 88,9 94,15 150,15 160,15 166,5 172,24 178,9 184,15 240,15 250,15 256,5 262,24 268,9 274,15 300,15"/></svg>
    <div class="menu">
      ${saved ? `<button class="mbtn pri" data-act="resume">▶ Pokračovat ve směně<small>Uložená rozehraná směna${esc(when)}</small></button>` : ''}
      <button class="mbtn${saved ? '' : ' pri'}" data-act="newshift">＋ Nová směna<small>Obtížnost, LIBERO, nastavení směny</small></button>
      <button class="mbtn" data-act="ct-menu">☎ Calltaker – příjem hovorů<small>Telefon, AML, mapa, pavouk, nabírání; volající je AI (hlas)</small></button>
      <button class="mbtn" data-act="tutorial">🎓 Výcvik – 10 lekcí s návodem<small>Připravené případy, všechny mechaniky krok za krokem</small></button>
      <div class="mrow"><button class="mbtn" data-act="settings">⚙ Nastavení<small>Vzhled, zvuk, hra</small></button><button class="mbtn" data-act="rules">☰ Pravidla<small>Co se hodnotí</small></button><button class="mbtn" data-act="changelog">✦ Co je nového<small>Verze ${esc(ZOS_VERSION)}</small></button></div>
    </div>
    <div class="foot"><span>v${esc(ZOS_VERSION)}</span>${upd}${inst}<span>Mapa © přispěvatelé OpenStreetMap · fiktivní případy</span></div></div>`);
}
function settingsModal(fromGame) {
  const seg = (key, opts) => opts.map(([v, l]) => `<button class="btn${String(settings[key]) === String(v) ? ' pri' : ''}" data-set="${key}" data-val="${v}">${l}</button>`).join(' ');
  modal(`<div class="card home" style="max-width:520px"><h2 style="margin:0 0 8px">Nastavení</h2>
    <div class="setrow"><b>Vzhled</b><span>${seg('theme', [['auto', 'Auto'], ['light', 'Světlý'], ['dark', 'Tmavý']])}</span></div>
    <div class="setrow"><b>Velikost písma</b><span>${seg('font', [[0.92, 'Menší'], [1, 'Normální'], [1.12, 'Větší'], [1.25, 'Velké']])}</span></div>
    <div class="setrow"><b>Zvuk</b><span>${seg('sound', [[true, 'Zapnutý'], [false, 'Vypnutý']])} <button class="btn" data-act="test-sound">Vyzkoušet</button></span></div>
    <div class="setrow"><b>Hlasitost</b><span>${seg('volume', [[30, 'Tichá'], [60, 'Střední'], [100, 'Hlasitá']])}</span></div>
    <div class="setrow"><b>Rádio</b><span>${seg('radioInteractive', [[true, 'Odpovídám sám'], [false, 'Automaticky']])}</span></div>
    <div class="setrow"><b>Hlas posádek</b><span>${seg('voice', [[true, 'Zapnutý'], [false, 'Vypnutý']])} <button class="btn" data-act="test-voice">Vyzkoušet</button> <small id="voice-status">${esc(voiceStatusText())}</small></span></div>
    <div class="setrow"><b>Zdroj hlasu</b><span>${seg('voiceEngine', [['cloud', 'Cloud (Azure)'], ['piper', 'Offline (Piper)']])}</span></div>
    <div class="setrow"><b>Adresa cloudu</b><span><input id="tts-url" type="url" placeholder="${esc(D.ttsUrl || 'https://….workers.dev')}" value="${esc(settings.ttsUrl || '')}" style="width:100%;min-width:200px"></span></div>
    <div class="setrow"><b>Tempo hlasu</b><span>${seg('voiceTempo', [[0.85, 'Klidné'], [0.75, 'Normální'], [0.66, 'Rychlé'], [0.58, 'Velmi rychlé']])}</span></div>
    <div class="setrow"><b>Zpomalit hru při relaci</b><span>${seg('radioSlow', [[true, 'Ano (1×)'], [false, 'Ne']])}</span></div>
    <div class="setrow"><b>Výchozí rychlost</b><span>${seg('speed', [[1, '1×'], [2, '2×'], [5, '5×'], [10, '10×']])}</span></div>
    <div class="setrow"><b>Pauza při nové N1</b><span>${seg('autoPauseN1', [[true, 'Ano'], [false, 'Ne']])}</span></div>
    <div class="setrow"><b>Nápověda (obtížnost)</b><span>${seg('hints', [[false, 'Realistická'], [true, 'S nápovědami']])}</span></div>
    <div class="foot" style="margin-top:14px"><button class="btn" data-act="rules" data-back="${fromGame ? 'game' : ''}">Pravidla a hodnocení</button><button class="btn" data-act="reset-settings">Výchozí nastavení</button><button class="btn" data-act="del-save">Smazat uloženou směnu</button><button class="btn pri" data-act="${fromGame ? 'close' : 'home'}">${fromGame ? 'Zavřít' : '‹ Zpět'}</button></div></div>`);
  window._setFromGame = !!fromGame;
}
function changelogModal() {
  const L = typeof ZOS_CHANGELOG !== 'undefined' ? ZOS_CHANGELOG : [];
  modal(`<div class="card home" style="max-width:560px;max-height:80vh;overflow:auto"><h2 style="margin:0 0 8px">Co je nového</h2>${L.map(x => `<h3 style="margin:10px 0 3px;font-size:14px">${esc(x.h)}</h3><p style="margin:0 0 6px;font-size:12.5px;line-height:1.45">${esc(x.p)}</p>`).join('')}
    <div class="foot" style="margin-top:12px"><button class="btn pri" data-act="home">‹ Zpět</button></div></div>`);
}
async function checkUpdate(btn, cb) {
  const set = t => { if (btn) btn.textContent = t; if (cb) cb(t); };
  set('Kontroluji…');
  try {
    const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' }); const j = await r.json();
    if (j.version && j.version !== ZOS_VERSION) {
      set('Nová verze ' + j.version + ' – aktualizuji…');
      try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) { await reg.update(); if (reg.waiting) reg.waiting.postMessage('skipWaiting'); else setTimeout(() => location.reload(), 1500); } else location.reload(); } catch (e) { location.reload(); }
    } else set('Máš nejnovější verzi ✓');
  } catch (e) { set('Kontrola se nepovedla (offline?)'); }
}
const RULES = [
  ['Případ (0–100 b., váha N1 3×, N2 2×, N3 1×)', [
    '20 b. rychlost vyslání po nabrání výzvy (cíl N1 do 60 s, N2 do 120 s, N3 do 5 min).',
    '25 b. volba posádky: plný počet za nejrychlejší dostupnou RZP. Vzdálenější posádka body nebere, pokud by nejbližší nechala svou oblast bez volné RZP.',
    '25 b. skutečný čas příjezdu od převzetí výzvy: plné body do reálného mediánu (asi 9 min), k nule klesá plynule u reálného p90 (asi 19 min u N1 a N2, 18 min u N3). Počítá se i dojezd, který hráč neovlivní, proto je 100 b. za případ velmi těžké.',
    '15 b. lékař: RV (nebo LZS, LIBERO) tam, kde je potřeba, a včas; zbytečně vyslaný lékař body ubírá.',
    '15 b. efektivita: posádka nejede zbytečně daleko.',
    'Přesměrování posádky z naléhavějšího případu: −8 až −10 b. u původního případu.']],
  ['Celkové skóre', ['75 % vážený průměr případů + 25 % pokrytí území (podíl obyvatel s volnou RZP do 15 min), k tomu provozní body níže.']],
  ['Provozní body – plus', [
    '+1 předpoplach při nabírání N1 a následné vyslání předem upozorněné posádky.',
    '+1 RV vyslané k N1/N2 jako první, RZP až po něm.',
    '+1 LZS místo RV, když je lékař v oblasti na výjezdu.',
    '+1 využití LIBERO jako lékaře tam, kde je lékař potřeba.',
    '+1 vstřícná jízda vyslaná při aspoň 2 volných RZP v cílové oblasti.',
    '+1 včasné odvolání RV (do 3 min) po hlášení „jisté známky smrti, KPR nezahajujeme“.',
    '+1 včas převzatá zpráva linky 112.']],
  ['Provozní body – minus', [
    '−3 vstřícná jízda vyslaná, když v cílové oblasti nejsou volné aspoň 2 RZP (ve dne i v noci; RV a LIBERO se nepočítají).',
    '−1 neodvolaná posádka po hlášení exitu.',
    '−1 za každou hodinu čekající prohlídky zemřelého, −3 pokud do konce směny neproběhne.',
    '−2 přehlédnutá zpráva linky 112, −2 LZS čekající na heliportu bez RZP (za každých 5 min).',
    '−5 opožděný výjezd N1, −8 neobsloužený případ.']],
  ['Postupy', [
    'Vstřícná jízda: periferní posádka ohlásí pacienta schopného překladu. Odpověz vysláním RZP z cílové oblasti („naproti z … posádka …“), nebo „dojíždějte sami“.',
    'Exitus: je-li koroner k dispozici (ZOS to zjišťuje pár minut), posádky se vrací. Není-li, RV zůstává na prohlídku zemřelého; lze ho odvolat, ale musí se během služby vrátit.',
    'Doprovod: po KPR RV vždy doprovází RZP do nemocnice, u N1 většinou, u N2 hlavně děti. Odvolatelný doprovod můžeš vyslat jinam.',
    'Pacient ponechán na místě: RZP po konzultaci s lékařem ohlásí ponechání a vrací se.',
    'Režimy jízdy: k události podle naléhavosti (N1 bez rychlostního limitu, N2 a N3 nejvýše +30 km/h), s pacientem v režimu N2 nebo N3 podle stavu, návrat RZP bez pacienta v režimu N4 bez majáků.']],
];
function rulesModal(back) {
  modal(`<div class="card home" style="max-width:620px;max-height:86vh;overflow:auto"><h2 style="margin:0 0 8px">Pravidla a hodnocení</h2>${RULES.map(([h, l]) => `<h3 style="margin:10px 0 3px;font-size:14px">${h}</h3><ul style="margin:0;padding-left:18px;font-size:12.5px">${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
    <div class="foot" style="margin-top:12px"><button class="btn pri" data-act="${back === 'game' ? 'close' : back === 'shift' ? 'newshift-keep' : 'home'}">${back === 'game' ? 'Zavřít' : '‹ Zpět'}</button></div></div>`);
}
function shiftModal() {
  let saved = null; try { saved = localStorage.getItem(SAVE_KEY); } catch (e) {}
  let stored = {}; try { stored = JSON.parse(localStorage.getItem(OPT_KEY) || '{}') || {}; } catch (_) {}
  const o = window._opt = Object.assign({ mode: 'shift', hour: 7, diff: 1, secondaryEnabled: 'true', startState: 'clean', muEnabled: 'true', muProbability: 10, muRole: 'mu' }, stored, window._opt || {});
  o.libero = Sim.liberoSettings(o.libero);
  saveOpts();
  const lib = o.libero, libMode = (id, m, label) => `<button data-libmode="${id}" data-val="${m}" class="${lib.modes[id] === m ? 'on' : ''}">${label}</button>`;
  const liberoHtml = `<details class="opt-details"${window._libOpen ? ' open' : ''}><summary><b>LIBERO</b> <span style="color:#5a6a7a;font-size:12px">volný lékař přes den · ${(D.libero || []).filter(l => lib.modes[l.id] !== 'off').length}/${(D.libero || []).length} povoleno · obsazení ${lib.presence} %</span></summary>
<label style="display:block;margin:6px 0 2px">Pravděpodobnost, že je LIBERO daný den obsazené (u „Náhodně“): <b id="lib-prob-value">${lib.presence} %</b></label><input id="lib-probability" type="range" min="0" max="100" step="5" value="${lib.presence}" style="width:min(380px,90%)">
<table class="lib-opts">${(D.libero || []).map(l => `<tr><td>${esc(l.name)}</td><td class="opts">${libMode(l.id, 'random', 'Náhodně')}${libMode(l.id, 'on', 'Vždy')}${libMode(l.id, 'off', 'Nikdy')}</td></tr>`).join('')}</table>
<p style="font-size:12px;margin:4px 0">Během hry lze obsazení změnit v panelu posádky LIBERO.</p></details>`;
  const b = (grp, val, label) => `<button data-opt="${grp}" data-val="${val}" class="${String(o[grp]) === String(val) ? 'on' : ''}">${label}</button>`;
  modal(`<div class="card"><h1>Dispečerský simulátor ZOS JčK</h1>
<p>Jsi primární dispečer zdravotnického operačního střediska. Calltaker nabírá výzvy, ty vysíláš posádky. Základny a skladba posádek odpovídají veřejným údajům, případy, jména a adresy jsou vymyšlené.</p>
<b>Režim</b><div class="opts">${b('mode', 'shift', 'Směna 12 h (se skórem)')}${b('mode', 'free', 'Volný režim')}${b('mode', 'mu', 'Jen MU (cvičení)')}</div>
<b>Směna</b><div class="opts">${b('hour', 7, 'Denní 7–19')}${b('hour', 19, 'Noční 19–7')}</div>
<b>Datum a hodina začátku</b><div class="opts"><input type="date" id="opt-date" value="${esc(o.date || new Date().toISOString().slice(0, 10))}" max="${new Date().toISOString().slice(0, 10)}"> <select id="opt-hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${Number(o.hour) === h ? ' selected' : ''}>${h}:00</option>`).join('')}</select></div>
<p style="font-size:12px;margin:2px 0;color:#5a6a7a">Počasí se stáhne podle data (historická data; u dnešního a budoucího data nebo bez sítě se simuluje).</p>
${o.mode === 'mu' ? `<p style="font-size:12px;margin:4px 0;color:#5a6a7a">Kraj je rozjetý podle zvoleného času (posádky na výjezdech, v transportu, při předání i na návratu). MU začne za pár minut a cvičení končí jejím ukončením s vyhodnocením.</p><b>Tvoje role</b><div class="opts">${b('muRole', 'mu', 'Řídím MU (401)')}${b('muRole', 'normal', 'Řídím běžný provoz')}</div><b>Typ MU</b><div class="opts"><select id="opt-mutype"><option value="">Náhodný podle času a počasí</option>${ZOS_DATA.muTypes.map(t => `<option value="${t.id}"${o.muType === t.id ? ' selected' : ''}>${esc(t.l)}</option>`).join('')}</select></div>` : ''}${o.mode === 'shift' ? `<b>Počáteční stav kraje</b><div class="opts">${b('startState', 'clean', 'Načisto · 0 výjezdů')}${b('startState', 'running', 'Rozjetý kraj · rozpracované události')}</div>` : ''}
<b>Vytížení</b><div class="opts">${b('diff', 0.85, 'Klidné')}${b('diff', 1, 'Běžné')}${b('diff', 1.25, 'Nálož')}</div>
<b>Sekundární převozy</b><div class="opts">${b('secondaryEnabled', 'true', 'Zapnuté')}${b('secondaryEnabled', 'false', 'Vypnuté')}</div>
${o.mode === 'mu' ? '' : `<b>Mimořádná událost (MU)</b><div class="opts">${b('muEnabled', 'true', 'Povoleno')}${b('muEnabled', 'false', 'Vypnuto')}</div>
<label style="display:block;margin:8px 0 2px">Pravděpodobnost MU během směny: <b id="mu-prob-value">${Number(o.muProbability)} %</b></label><input id="mu-probability" type="range" min="0" max="100" step="5" value="${Number(o.muProbability)}" style="width:min(380px,90%)" ${o.muEnabled === 'false' ? 'disabled' : ''}>`}
${liberoHtml}
<p style="font-size:12px">Tip: čekající případy jsou v seznamu vlevo. Klikni na případ, otevři „Navrhnout posádku“ a vyšli nejbližší. N1 vždy s lékařem (RV). N3 jede RZP, lékař jen na vyžádání posádky. Doporučené rychlosti 5× až 30×.</p>
<p style="font-size:12px;color:#5a6a7a">Stav: ${assetsState}</p>${appInstallHtml()}<button class="btn pri" data-act="start" style="font-size:15px;padding:7px 18px">Začít směnu</button> <button class="btn" data-act="rules" data-back="shift">Pravidla a hodnocení</button> <button class="btn" data-act="home">‹ Zpět</button></div>`);
}
const HIST_KEY = 'zos_jck_hist_v1' + (/\/dev\//.test(location.pathname) ? '_dev' : '');   // historie vyhodnocených směn (testovací verze zvlášť)
function histLoad() { try { const a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function histSave(entry) {
  const a = histLoad().filter(h => h.seed !== entry.seed); a.push(entry);
  const keep = a.slice(-20); try { localStorage.setItem(HIST_KEY, JSON.stringify(keep)); } catch (e) {}
  return keep;
}
// Srovnání s předchozími směnami: posledních 5 (nejnovější nahoře), trend proti průměru předchozích a osobní rekord.
function histHtml(hist, seed) {
  const last = hist.slice(-5).reverse(); if (last.length < 1) return '';
  const cur = hist.find(h => h.seed === seed), prev = hist.filter(h => h.seed !== seed);
  const best = hist.reduce((b, h) => h.total > b ? h.total : b, -1), avgPrev = prev.length ? prev.slice(-5).reduce((a, h) => a + h.total, 0) / Math.min(5, prev.length) : null;
  const d = cur && avgPrev != null ? cur.total - avgPrev : null;
  const trend = d == null ? '' : d >= 1 ? `<span style="color:#2e8b57">▲ +${d.toFixed(1)}</span> proti průměru předchozích` : d <= -1 ? `<span style="color:#c0392b">▼ ${d.toFixed(1)}</span> proti průměru předchozích` : '≈ jako obvykle';
  const f = x => x == null ? '–' : x.toFixed(1), dt = at => { const t = new Date(at); return `${t.getDate()}. ${t.getMonth() + 1}. ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };
  const rows = last.map(h => `<tr${h.seed === seed ? ' style="font-weight:bold"' : ''}><td style="padding:2px 12px 2px 0">${dt(h.at)}${h.seed === seed ? ' <small>(tato)</small>' : ''}</td><td style="padding-right:12px">${f(h.total)}</td><td style="padding-right:12px">${f(h.base)}</td><td style="padding-right:12px">${f(h.ops)}</td><td>${h.closed}</td></tr>`).join('');
  return `<p style="margin:12px 0 2px"><b>Předchozí směny</b> <small style="color:#5a6a7a">${trend}${cur && cur.total >= best && hist.length > 1 ? ' · <b>nový osobní rekord</b>' : ` · rekord ${f(best)}`}</small></p>
<table style="margin:4px 0"><tr style="color:#5a6a7a;font-size:12px"><td style="padding-right:12px">Kdy</td><td style="padding-right:12px">Skóre</td><td style="padding-right:12px">Základ</td><td style="padding-right:12px">Provozní</td><td>Případů</td></tr>${rows}</table>`;
}
function fmtMS(sec) { if (sec == null || !isFinite(sec)) return '–'; sec = Math.round(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
// Důvody ztráty bodů u případu slovy s čísly (dvě největší ztráty).
function caseLossText(c) {
  if (c.unserved) return 'neobslouženo, žádná posádka nedojela';
  if (c.mu) return 'mimořádná událost, viz hodnocení MU';
  const sc = c.score, tgtD = { 1: 60, 2: 120, 3: 300 }[c.nOrig], T = { 1: 720, 2: 960, 3: 1500 }[c.nOrig], L = [];
  const dl = 20 - sc.delay; if (dl >= 1) L.push([dl, `vyslání za ${fmtMS(c.asg && c.asg.length ? c.asg[0].t - c.readyAt : null)} (cíl ${fmtMS(tgtD)})`]);
  const c01 = x => Math.max(0, Math.min(1, x));
  const [aLo, aHi] = ZOS_DATA.scoreAbs[c.nOrig] || [520, 1100], wait = c.firstArrive != null ? c.firstArrive - c.readyAt : null, absLoss = wait == null ? (c.pick ? 25 : 50) : (c.pick ? 25 : 50) * (1 - c01(1 - (wait - aLo) / (aHi - aLo)));
  if (c.pick && !c.pick.justified) { const over = Math.max(0, c.pick.chosen - c.pick.best - (c.nOrig === 3 ? 480 : 120)), rl = 25 * c01(over / (T * 0.6)); if (rl >= 1) L.push([rl, `vzdálenější posádka (dojezd ${fmtMS(c.pick.chosen)} místo ${fmtMS(c.pick.best)})`]); }
  if (absLoss >= 1) L.push([absLoss, `příjezd za ${fmtMS(wait)} (reálný medián ${fmtMS(aLo)})`]);
  const rl = 15 - sc.rv; if (rl >= 1) L.push([rl, c.docAssigned ? 'lékař vyslán pozdě' : 'lékař nevyslán']);
  const el = 15 - sc.eff; if (el >= 1) L.push([el, 'nebyla vybrána nejbližší posádka']);
  if (sc.pen >= 1) L.push([sc.pen, 'přesměrování posádky']);
  L.sort((a, b) => b[0] - a[0]);
  return L.length ? L.slice(0, 2).map(x => `−${Math.round(x[0])} b. ${x[1]}`).join(' · ') : 'bez větší ztráty';
}
// Z čeho se skládá hodnocení: složky případů (vážené N1×3, N2×2, N3×1), pokrytí a časy podle naléhavosti.
function endBreakdownHtml(sm) {
  const k = sm.comp; if (!k) return '';
  const row = (label, v, max, hint, neg) => {
    const p = max ? Math.max(0, Math.min(100, (neg ? 100 - v / max * 100 : v / max * 100))) : 0, col = p >= 85 ? '#2e8b57' : p >= 60 ? '#d9a521' : '#c0392b';
    return `<tr><td style="padding:3px 12px 3px 0">${label}<br><small style="color:#5a6a7a">${hint}</small></td><td style="width:150px"><div style="background:rgba(128,140,150,.28);height:8px;border-radius:4px"><i style="display:block;height:8px;border-radius:4px;width:${p.toFixed(0)}%;background:${col}"></i></div></td><td style="padding-left:10px;white-space:nowrap"><b>${neg ? '−' : ''}${v.toFixed(1)}</b> / ${max}</td></tr>`;
  };
  const tgt = { 1: [60, ZOS_DATA.scoreAbs[1][0]], 2: [120, ZOS_DATA.scoreAbs[2][0]], 3: [300, ZOS_DATA.scoreAbs[3][0]] };
  const nrows = [1, 2, 3].map(n => {
    const b = k.byN[n]; if (!b || !b.n) return '';
    return `<tr><td style="padding:2px 12px 2px 0"><b>N${n}</b> <small style="color:#5a6a7a">(${b.n})</small></td><td style="padding-right:12px">vyslání <b>${fmtMS(b.dispN ? b.disp / b.dispN : null)}</b> <small style="color:#5a6a7a">cíl ${fmtMS(tgt[n][0])}</small></td><td>příjezd na místo <b>${fmtMS(b.arrN ? b.arr / b.arrN : null)}</b> <small style="color:#5a6a7a">cíl ${fmtMS(tgt[n][1])}</small></td></tr>`;
  }).join('');
  return `<p style="margin:10px 0 2px"><b>Z čeho se hodnocení skládá</b> <small style="color:#5a6a7a">(průměr případů: N1 počítá 3×, N2 2×, N3 1×)</small></p>
<table style="margin:4px 0;width:100%">${row('Včasnost vyslání', k.delay, 20, 'jak rychle po převzetí jsi poslal posádku')}${row('Volba posádky a dojezd', k.arrive, 50, 'polovina za volbu nejrychlejší posádky, polovina za skutečný čas příjezdu proti reálnému mediánu')}${row('Lékař', k.rv, 15, 'RV nebo LZS vyslán tam, kde měl být, a včas')}${row('Efektivita volby', k.eff, 15, 'podíl dojezdu nejbližší a zvolené posádky')}${row('Pokrytí území', sm.coverage, 100, 'podíl obyvatel měst, ke kterým dojede volná RZP do 15 min')}${k.pen >= 0.5 ? row('Přesměrování (ztráta)', k.pen, 10, 'za přehození posádky na jiný případ', true) : ''}</table>
<p style="margin:6px 0;color:#5a6a7a;font-size:12px">Základ = 75 % hodnocení případů + 25 % pokrytí. K tomu se přičítají a odečítají provozní body (níže).</p>
${nrows ? `<p style="margin:10px 0 2px"><b>Časy podle naléhavosti</b> <small style="color:#5a6a7a">(průměr od převzetí výzvy)</small></p><table style="margin:4px 0">${nrows}</table>` : ''}`;
}
function endModal() {
  const sm = sim.summary(), s = sim.s;
  const worst = s.cases.filter(c => c.status === 'closed' && c.score && c.typ !== 'sekundární').sort((a, b) => a.score.total - b.score.total).slice(0, 10);
  const why = c => caseLossText(c);
  const ms0 = sim.s.muOnly ? sim.muSummary() : null, ht = ms0 && !ms0.downgraded && ms0.score ? ms0.score.total : sm.total;   // v cvičení MU je hlavní číslo hodnocení MU
  const rank = ht >= 92 ? 'Dispečer na jedničku' : ht >= 80 ? 'Spolehlivý dispečer' : ht >= 65 ? 'Slušný praktikant' : ht >= 45 ? 'Ještě potrénuj' : 'Katastrofa na lince';
  const histOk = !sim.s.muOnly && !s.scripted && s.mode === 'shift' && sm.closed >= 5;
  let hist = histLoad();
  if (histOk && !hist.some(h => h.seed === s.seed)) hist = histSave({ seed: s.seed, at: Date.now(), total: ht, base: sm.baseTotal, ops: sm.opsPoints, cov: sm.coverage, closed: sm.closed, d: sm.comp ? sm.comp.delay : null, a: sm.comp ? sm.comp.arrive : null, r: sm.comp ? sm.comp.rv : null, e: sm.comp ? sm.comp.eff : null });
  const m = (l, v) => `<tr><td style="padding:2px 14px 2px 0;color:#5a6a7a">${l}</td><td><b>${v}</b></td></tr>`;
  const mus = sim.s.muOnly ? sim.muSummary() : null;
  const muHtml = !mus ? '' : mus.downgraded ? `<p><b>MU se nevyhlásila:</b> ${esc(mus.label)}, ${esc(mus.addr)}. Událost pokračovala jako běžná.</p>` : (() => {
    const mn = s => s == null ? '–' : Math.round(s / 60) + ' min', sc = mus.score || {};
    return `<div style="margin:8px 0;padding:8px;border:1px solid #c8d4de;border-radius:6px"><b>MU: ${esc(mus.label)}</b><br><small>${esc(mus.addr)}</small>
<table style="margin:6px 0;width:auto">${m('Hodnocení MU', sc.total == null ? '–' : sc.total.toFixed(0) + ' / 100')}${m('Postižených', mus.cas + ' (I: ' + mus.by[1] + ', II: ' + mus.by[2] + ', III: ' + mus.by[3] + ', IV: ' + mus.by[4] + ')')}${m('Odvezeno / zemřelo', mus.delivered + ' / ' + mus.dead)}${m('Od hovoru do ukončení', mn(mus.endedAt - mus.readyAt))}${m('První posádka na místě', mn(mus.firstArrive))}${m('Avízo MU po vyhlášení', mus.avizo == null ? 'neodesláno' : mn(mus.avizo))}${m('Situační zprávy METHANE', mus.updates)}${m('Žádosti o sousední ZZS', mus.neighbours)}${m('Chyby při odsunu', mus.mistakes)}</table>
<small>Složky hodnocení: avízo ${(sc.delay || 0).toFixed(0)}/20 · příjezd ${(sc.arrive || 0).toFixed(0)}/40 · METHANE ${(sc.rv || 0).toFixed(0)}/15 · odsun ${(sc.eff || 0).toFixed(0)}/25</small>
${mus.ops.length ? `<details><summary>Body a chyby u MU (${mus.ops.length})</summary><ul>${mus.ops.map(x => `<li>${sim.clockAt(x.t)} · ${x.delta > 0 ? '+' : ''}${x.delta} b. · ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}</div>`;
  })();
  modal(`<div class="card"><h1>${mus ? 'Vyhodnocení cvičení MU' : 'Vyhodnocení'}</h1><div class="big">${ht.toFixed(1)} <span style="font-size:15px;font-family:var(--sans)">/ 100 · ${rank}</span></div>
<div class="bar"><i style="width:${Math.min(100, ht)}%"></i></div>${ms0 && !ms0.downgraded ? '<p style="margin:4px 0;color:#5a6a7a;font-size:12px">Níže: detail MU a běžný provoz během cvičení.</p>' : ''}${muHtml}
${endBreakdownHtml(sm)}
<table style="margin:10px 0;width:auto">${m('Průměrné hodnocení případů', sm.caseAvg.toFixed(1))}${m('Pokrytí území', sm.coverage.toFixed(0) + ' %')}${m('Případů celkem', sm.cases)}${m('Neobslouženo', sm.unserved)}${m('N1 průměrně k pacientovi', sm.avgN1 == null ? '–' : (sm.avgN1 / 60).toFixed(1) + ' min')}${m('Příjezd do 20 min od vyslání', sm.legalPct == null ? '–' : sm.legalPct.toFixed(0) + ' %')}${m('Přesměrování posádek', sm.diversions)}${m('Dokončené sekundární převozy', sm.secondaryCompleted)}${m('Sekundární převozy v toleranci ±15 min', sm.secondaryOnTime)}${m('Průměr bodů za sekundární převoz', sm.secondaryAvg == null ? '–' : sm.secondaryAvg.toFixed(0) + ' / 100')}</table>
${sm.opsPoints || sm.opsLog.length ? `<p>Provozní body: <b>${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints}</b> · základní skóre ${sm.baseTotal.toFixed(1)}</p>${sm.opsLog.length ? `<details open><summary>Za co byly provozní body (${sm.opsLog.length})</summary><ul style="max-height:180px;overflow:auto">${sm.opsLog.slice().reverse().map(x => `<li>${sim.clockAt(x.t)} · ${x.delta > 0 ? '+' : ''}${x.delta} b. · ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}` : ''}
${lzsEndHtml(sm)}
${histOk ? histHtml(hist, s.seed) : ''}
${worst.length ? '<b>Kde ses nejvíc propadl</b> <small style="color:#5a6a7a">(10 nejhorších případů, záporné body = ztráta oproti maximu)</small><table style="margin-top:4px">' + worst.map(c => `<tr><td style="padding:2px 10px 2px 0;white-space:nowrap">${sim.clockAt(c.readyAt)}</td><td style="padding-right:10px">${c.num} N${c.nOrig}</td><td style="padding-right:10px">${esc(c.klasif)}</td><td style="padding-right:10px"><b>${Math.round(c.score.total)}</b></td><td><small>${why(c)}</small></td></tr>`).join('') + '</table>' : ''}
<p style="margin-top:12px"><button class="btn pri" data-act="again">Nová směna</button> <button class="btn" data-act="rules" data-back="game">Pravidla a hodnocení</button></p></div>`);
}
function printModal(k) {
  const c = k.caseId && sim.caseOf(k.caseId); if (!c) return;
  const n = parseInt(c.id.slice(1), 10), now = new Date();
  const doc = k.type === 'RV' || k.type === 'LZS';
  const ev = '13' + String(n * 53 + 7000).padStart(5, '0') + '001', vz = '8' + String(n * 71 + 10000).padStart(5, '0') + '001';
  const plate = '9Z' + (1 + n % 9) + ' ' + String(1000 + n * 37 % 9000);
  const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${clockAt(c.asg.length ? c.asg[c.asg.length - 1].t : c.readyAt)}`;
  const pac = c.mu ? '' : (c.patientName || '');
  modal(`<div class="card"><div class="print"><h3>Výzva k výjezdu VS ${esc(k.name.replace(/ /g, '_'))}</h3>
<div class="g"><div><label>Naléhavost</label><b>N${c.n}</b></div><div><label>Událost</label><b>${ev}</b></div><div><label>Čas výzvy</label><b>${date}</b></div><div><label>Číslo výzvy</label><b>${vz}</b></div><div><label>Telefon</label><b>${esc(c.phone)}</b></div><div><label>Dopl. naléh.</label><b>&nbsp;</b></div></div>
<div class="g"><div style="grid-column:span 2"><label>Událost popis</label><b>${esc(c.desc)}</b></div><div><label>Událost charakter</label><b>${esc(c.charakter)}</b></div></div>
<div class="g"><div style="grid-column:1/-1"><label>Upřesnění</label><b>${esc(clarificationOf(c))}</b></div></div>
<div class="g"><div><label>Indikace</label><b>${esc(c.klasif)}</b></div><div><label>Charakter</label><b>${esc(c.charakter)}</b></div></div>
<div class="g"><div><label>Pacient</label><b>${esc(pac)}</b></div><div><label>Věk / rok nar.</label><b>${c.mu ? '' : esc(c.ageText || c.age + ' let')}</b></div><div><label>Pohlaví</label><b>${c.mu ? '' : c.sex === 'M' ? 'Muž' : 'Žena'}</b></div></div>
<div class="g"><div style="grid-column:span 2"><label>Místo zásahu</label><b>${esc(c.addr)}<br>${esc(c.town)}, okr. ${esc(okresOf(c))}</b></div><div><label>Popis místa</label><b>${esc(c.place)}</b></div></div>
<div class="g"><div><label>Souřadnice X</label><b>${c.lat.toFixed(2)}</b></div><div><label>Souřadnice Y</label><b>${c.lon.toFixed(2)}</b></div></div>
<div class="g"><div><label>Vozidlo</label><b>${plate}</b></div><div><label>Lékař</label><b>${doc ? esc(nameFor(k.members[0])) : ''}</b></div><div><label>NLZP</label><b>${esc(nameFor(k.members[doc ? 1 : 0]))}</b></div><div><label>Řidič</label><b>${esc(nameFor(k.members[1]))}</b></div></div>
<div class="qr"></div></div><p style="margin-top:10px"><button class="btn" data-act="close">Zavřít</button></p></div>`);
}

// ---------- hra ----------
async function newGame(noWx) {
  const o = window._opt;
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
  const seed = (Math.random() * 1e9) | 0, date = o.date || new Date().toISOString().slice(0, 10);
  let weather = null;
  if (!noWx) { toast('Stahuji počasí pro ' + date + '…', ''); try { weather = await ZOS_WX.load(date, seed); } catch (e) { weather = null; } }
  sim = new Sim({ date, weather, mode: o.mode, startHour: Number(o.hour), diff: Number(o.diff), secondaryEnabled: o.secondaryEnabled !== 'false', muEnabled: o.mode === 'mu' ? true : o.muEnabled !== 'false', muProbability: Number(o.muProbability), muType: o.mode === 'mu' ? (o.muType || null) : null, muRole: o.mode === 'mu' ? (o.muRole || 'mu') : null, startState: o.startState, libero: o.libero, radio: settings.radioInteractive ? 'interactive' : 'auto', seed });
  applyVoice();
  afterLoad(); speed = settings.speed; savedSpeed = settings.speed;
  closeModal(); toast(o.mode === 'mu' ? 'Cvičení MU: kraj je rozjetý, MU začne za pár minut.' : o.mode === 'shift' && o.startState === 'running' ? 'Směna začala s rozpracovanými událostmi; jedna posádka už je na cestě.' : 'Směna začala. Čekající případy jsou vlevo.', '');
}
function afterLoad() { radioFeed.length = 0; sel = { c: null, k: null }; seenLog = sim.s.logId; tabCase = 'waiting'; caseSearch = ''; $('case-search').value = ''; vb = { x: 30, y: 30, w: 970, h: 940 }; renderToolsOnce(); render(); }
function doSave() { if (sim.s.scripted) return; try { localStorage.setItem(SAVE_KEY, sim.serialize()); } catch (e) {} }
function resume() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} applyVoice(); try { sim = Sim.restore(localStorage.getItem(SAVE_KEY)); afterLoad(); speed = settings.speed; savedSpeed = settings.speed; closeModal(); ctAfterLoad(); } catch (e) { homeModal(); } }
// layout pro dispečera MU: panel MU vlevo na výšku, mapa, rádio s odsunem, posádky; seznam případů a protokol menší
let muModeWas = false;
function muModeOn() { return !!(sim && sim.s.muPlayerRole === 'mu' && sim.s.cases.some(c => c.mu && c.status !== 'closed')); }
function applyMuMode() {
  const on = muModeOn();
  document.body.classList.toggle('mu-mode', on);
  if (on && !muModeWas) { const mc = sim.s.cases.find(c => c.mu && c.status !== 'closed'); if (mc) sel.c = mc.id; }
  const changed = on !== muModeWas; muModeWas = on;
  if (changed) layoutApply(true);
}
function render() {
  if (!sim) return;
  applyMuMode();
  ctSync();
  renderTop();
  if (ctModeOn() && !document.body.classList.contains('ct-disp')) { renderMap(); ctRender(); return; }
  renderCases(); renderDetail(); renderCrews(); renderMap(); renderRadio();
  if (ctModeOn()) ctRender();
}
function openPanelWindow(panel) {
  if (!panelChannel) { toast('Prohlížeč nepodporuje synchronizaci panelů.', 'warn'); return; }
  const url = new URL(location.href); url.searchParams.set('zosPanel', panel);
  const w = window.open(url.href, `zos-${panel}`, 'popup,width=1180,height=820');
  if (!w) toast('Prohlížeč zablokoval nové okno. Povol vyskakovací okna pro simulátor.', 'warn');
  else { panelWindows[panel] = w; w.focus(); mainPanelHidden[panel] = true; saveMainPanelLayout(); applyMainPanelLayout(); }
}
function saveMainPanelLayout() {
  try { localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(mainPanelHidden)); } catch (_) {}
}
