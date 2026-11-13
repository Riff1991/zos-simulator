(function () {
'use strict';
const D = ZOS_DATA;
const $ = id => document.getElementById(id);
const symptomsOf = c => (Array.isArray(c.symptoms) && c.symptoms.length ? c.symptoms : String(c.up || '').split(',')).map(x => String(x).trim()).filter(Boolean);
const clarificationOf = c => [symptomsOf(c).join(', '), c.poznamka && `Poznámka: ${c.poznamka}`].filter(Boolean).join('; ') || '–';
const missingInitialDispatch = c => (c.initialDispatchRequired || []).filter(type => !(c.initialDispatchSent || []).includes(type));
const isVstricnaRadioMessage = text => /vstřícn|vstricn/i.test(String(text || ''));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const SPEEDS = [0, 1, 5, 10, 20, 30, 60];
const OPT_KEY = 'zos_jck_opts_v1';
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(window._opt || {})); } catch (_) {} }
const SAVE_KEY = 'zos_jck_save_v1' + (/\/dev\//.test(location.pathname) ? '_dev' : '');   // testovací verze ukládá zvlášť
const COL = { base: '#f3f5f7', free: '#3cb54a', call: '#2f7de1', enroute: '#d9372c', onscene: '#d9372c', transport: '#d9372c', handover: '#d9372c', off: '#8e5bd6', activating: '#b79af0', second: '#7b8794', attached: '#169c8f' };
const X = lon => (lon - 13.55) / 1.95 * 1000, Y = lat => (49.78 - lat) / 1.28 * 1000;

let sim = null, speed = 0, savedSpeed = 5, sel = { c: null, k: null };
const requestedPanel = new URLSearchParams(location.search).get('zosPanel');
const satellitePanel = ['map', 'radio'].includes(requestedPanel) ? requestedPanel : null;
const panelChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('zos-panel-sync-v1') : null;
let panelSyncAt = 0, panelSnapshot = '', panelSelection = '';
const PANEL_LAYOUT_KEY = 'zos_panel_layout_v1';
let mainPanelHidden = { map: false, radio: false };
const panelWindows = { map: null, radio: null };
try { mainPanelHidden = Object.assign(mainPanelHidden, JSON.parse(localStorage.getItem(PANEL_LAYOUT_KEY) || '{}')); } catch (_) {}
if (satellitePanel) document.body.dataset.panel = satellitePanel;
let tabCase = 'waiting', tabRadio = 'ČB', view = 'cases', caseSearch = '';
let layers = { base: true, hosp: true, crews: true, cases: true };
let vb = { x: 30, y: 30, w: 970, h: 940 };
let lastT = performance.now(), seenLog = 0, saveAt = 0, modalOpen = false, audio = null, sugOpen = true;
const okresCache = {};

function setHTML(el, h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }
function pad(n) { return String(n).padStart(2, '0'); }
function clockAt(t) {
  const sec = Math.floor((sim.s.startHour * 3600 + t) % 86400);
  return pad(Math.floor(sec / 3600)) + ':' + pad(Math.floor(sec % 3600 / 60)) + ':' + pad(sec % 60);
}
function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
function okresOf(c) {
  if (okresCache[c.id]) return okresCache[c.id];
  let best = null, bd = 1e9;
  for (const s of D.stations) { const d = (s.lat - c.lat) ** 2 + ((s.lon - c.lon) * 0.66) ** 2; if (d < bd) { bd = d; best = s; } }
  return okresCache[c.id] = D.oblasti.find(o => o.id === best.oblast).name;
}

// ---------- ikony ----------
function car(dir, fill) {
  const body = `<path d="M2 13V8.5h3.2L9 3h10l4 5.5h3V13z" fill="${fill}" stroke="#202a31" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 4.3h4v4H7.2zM15.2 4.3h3l3 4h-6z" fill="#e8f4fc" stroke="#202a31" stroke-width=".65"/><path d="M11.8 5.1v2.4m-1.2-1.2H13" stroke="#d9342b" stroke-width=".9"/><circle cx="8" cy="13" r="2" fill="#202a31"/><circle cx="21" cy="13" r="2" fill="#202a31"/>`;
  return `<svg class="ic" viewBox="0 0 28 16" aria-hidden="true">${dir < 0 ? `<g transform="translate(28,0) scale(-1,1)">${body}</g>` : body}</svg>`;
}
function helicopter(fill = '#d9342b') {
  return `<svg class="ic heli-icon" viewBox="0 0 64 40" aria-hidden="true"><path d="M12 20 4 14l1-2 11 5h4c2-6 8-10 17-10h9c7 0 12 4 14 11l2 2v4H15c-2 0-3-1-3-4Z" fill="${fill}" stroke="#202a31" stroke-width="2" stroke-linejoin="round"/><path d="M47 8h-8v9h18c-2-6-5-9-10-9Z" fill="#bfe5f4" stroke="#202a31" stroke-width="1.5" stroke-linejoin="round"/><path d="M31 7V4m-17 0h39M33 4v3M24 24v5m20-5v5m-24 0h29" fill="none" stroke="#202a31" stroke-width="2" stroke-linecap="round"/><path d="M10 13 7 9m-1 3-3-1" fill="none" stroke="#202a31" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}
function ico(state, type) {
  if (type === 'LZS') return helicopter(state === 'free' || state === 'base' ? '#d8ffe0' : '#fff');
  switch (state) {
    case 'call': return car(1, '#fff');
    case 'enroute': return car(1, '#d9342b');
    case 'transport': case 'handover': return car(-1, '#d9342b');
    case 'onscene': return `<svg class="ic heart-ecg" viewBox="0 0 32 24" aria-hidden="true"><path d="M16 21S3 13.5 3 7.8C3 2.3 10.1 1 16 7c5.9-6 13-4.7 13 0.8C29 13.5 16 21 16 21Z" fill="#d9342b" stroke="#8c1715" stroke-width="1.2"/><path d="M5 11h5l2.1-4.2 3.2 9 2.3-5H20l1.3-2.4 1.3 2.6H27" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case 'free': return car(1, '#d8ffe0');
    case 'base': return car(1, '#fff');
    case 'second': return car(1, '#d6dde3');
    case 'activating': return car(1, '#eee5ff');
    default: return car(1, '#eee5ff');
  }
}
const STLAB = { base: 'Na základně', free: 'Volný', call: 'Výzva', enroute: 'Výjezd', onscene: 'Na místě', transport: 'Transport', handover: 'U ZZ', off: 'Nepřihlášena', activating: 'Aktivace', second: 'Sekundár', attached: 'Ve voze RZP' };

// ---------- horní lišta ----------
function renderTop() {
  const s = sim.s, sm = sim.summary();
  $('clock').textContent = sim.clock();
  setHTML($('speeds'), SPEEDS.map(v => `<button data-speed="${v}" class="${v === speed ? 'on' : ''}">${v === 0 ? '⏸' : v + '×'}</button>`).join(''));
  const waiting = s.cases.filter(c => c.status === 'waiting' || (c.status === 'active' && missingInitialDispatch(c).length)).length;
  const rem = Math.max(0, s.shiftLen - s.t);
  const left = s.mode === 'shift' ? ` · zbývá ${Math.floor(rem / 3600)}:${pad(Math.floor(rem % 3600 / 60))} h` : ' · volný režim';
  const wx = sim._lzsWeatherStatus(), wxText = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  setHTML($('kpi'), `<span>Skóre <b>${sm.total.toFixed(1)}</b> <small title="Průběžné body za správné a opomenuté úkony">(${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints} provozních b.)</small></span><span>Pokrytí <b>${sm.covNow == null ? '–' : Math.round(sm.covNow) + ' %'}</b></span><span class="${waiting ? 'warn' : ''}">Čekající <b>${waiting}</b></span><span>LZS <b>${wxText}</b></span><span>${left.replace(/^ · /, '')}</span>`);
  if (!satellitePanel) {
    $('toggle-map-main').textContent = mainPanelHidden.map ? 'Zobrazit mapu zde' : 'Skrýt mapu zde';
    $('toggle-radio-main').textContent = mainPanelHidden.radio ? 'Zobrazit přehled zde' : 'Skrýt přehled zde';
  }
  $('btn-end').style.display = s.mode === 'free' ? '' : 'none';
  const nb = $('nav'); setHTML(nb, [['cases', 'Případy'], ['detail', 'Případ'], ['crews', 'Posádky'], ['map', 'Mapa'], ['radio', 'Transporty']].map(([k, l]) =>
    `<button data-view="${k}" class="${view === k ? 'on' : ''}">${l}${k === 'cases' && waiting ? `<span class="badge">${waiting}</span>` : ''}</button>`).join(''));
  document.querySelectorAll('.win').forEach(w => w.classList.toggle('active', w.id === 'w-' + view));
  renderLiveAlerts();
}
// Upozornění nahoře: hlášení 112 zmizí samo nejpozději po 40 s (reálného času) nebo po kliknutí na ✕.
// Zpráva zůstává v rádiovém logu a případ lze otevřít i odtud.
const ALERT_TTL_MS = 40000, alertSeen = new Map(), alertHidden = new Set();
function renderLiveAlerts() {
  const now = performance.now();
  const visible = key => { if (alertHidden.has(key)) return false; if (!alertSeen.has(key)) alertSeen.set(key, now); return now - alertSeen.get(key) < ALERT_TTL_MS; };
  const requests = sim.s.cases.filter(c => c.status !== 'closed' && c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && !alertHidden.has('rv:' + c.id));
  const reports = sim.s.cases.flatMap(c => (c.radioReports || []).filter(r => r.received && !r.acknowledged && visible(c.id + ':' + r.id)).map(r => ({ c, r }))).slice(-4);
  const x = (key, extra) => `<span class="alert-x" role="button" aria-label="Zavřít upozornění" title="Zavřít" data-act="dismiss-alert" data-key="${esc(key)}"${extra || ''}>✕</span>`;
  const requestHtml = requests.map(c => {
    const crew = c.crews.map(id => sim.crewOf(id)).find(k => k && k.type === 'RZP');
    return `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ ${esc((c.rvReq.kind || 'zhoršení stavu').toLocaleUpperCase('cs-CZ'))} · ${esc(c.num)} · N${c.n}${crew ? ' · ' + esc(crew.name) : ''} · ${esc(c.klasif)} — klikni pro otevření</span>${x('rv:' + c.id)}</div>`;
  });
  const reportHtml = reports.map(({ c, r }) => `<div class="live-alert report-alert" role="button" tabindex="0" data-case="${c.id}" data-report="${esc(r.id)}"><span class="alert-txt">☎ Linka 112 · ${esc(c.num)}: ${esc(r.text)} — klikni pro otevření</span>${x(c.id + ':' + r.id, ` data-case="${c.id}" data-report="${esc(r.id)}"`)}</div>`);
  setHTML($('alerts-live'), requestHtml.concat(reportHtml).join(''));
}

// ---------- případy ----------
function chipHTML(k) {
  const col = COL[k.state], dark = k.state !== 'base' && k.state !== 'free';
  const ph = sim.phase(k);
  return `<span class="chip" data-crew="${k.id}" style="background:${col};color:${dark ? '#fff' : '#111'}">${k.type === 'LZS' ? helicopter(dark ? '#fff' : '#d9342b') : ''}${esc(k.name)} · ${esc(ph)}${k.dest ? ' → ' + esc(k.dest.name) : ''}</span>`;
}
function lzsSupportHtml(c) {
  const own = sim.crewOf('lzs');
  if (sim.avail(own)) return '';
  const rows = D.lzsSupport.map(item => {
    const k = sim.crewOf(item.id), nightBlocked = item.dayOnly && !sim._isDay();
    const requested = k && k.supportRequested && k.supportRequestedFor === c.id && sim.avail(k);
    const eta = k ? sim.etaFor(k, c.lat, c.lon) : 0;
    const button = requested
      ? `<button class="btn pri" data-act="assign" data-case="${c.id}" data-crew="${k.id}">Vyslat</button>`
      : `<button class="btn" data-act="lzs-support" data-case="${c.id}" data-crew="${item.id}" ${nightBlocked || !k || k.state !== 'off' || k.supportRequested ? 'disabled' : ''}>${nightBlocked ? 'Jen den' : k && k.supportRequested ? 'Jinde požádána' : 'Požádat'}</button>`;
    const status = nightBlocked ? 'mimo denní službu' : requested ? 'souhlasí' : k && k.supportRequested ? `požádána k ${esc(k.supportRequestedFor || 'jinému případu')}` : k && k.state !== 'off' ? 'nedostupná' : 'bez žádosti';
    return `<div class="row"><span class="chip">${esc(item.name)}</span><span>${status}</span><span class="eta">${Math.round(eta / 60)} min</span>${button}</div>`;
  }).join('');
  return `<div class="sug"><h4>Mezikrajská výpomoc LZS <small>(vlastní vrtulník je nedostupný)</small></h4>${rows}</div>`;
}
function renderCases() {
  const s = sim.s;
  const by = st => s.cases.filter(c => c.status === st);
  const pendingDispatch = c => c.status === 'active' && missingInitialDispatch(c).length > 0;
  const act = by('active').filter(c => !pendingDispatch(c)), wait = s.cases.filter(c => c.status === 'waiting' || pendingDispatch(c)), intake = by('intake'), closed = by('closed');
  const tabs = [['waiting', 'Čekající', wait.length], ['active', 'Právě řešené', act.length], ['intake', 'Nabrané', intake.length], ['closed', 'Uzavřené', closed.length]];
  setHTML($('tabs-cases'), tabs.map(([k, l, n]) => {
    const classes = [tabCase === k ? 'on' : '', k === 'waiting' && wait.length > 0 && tabCase !== 'waiting' ? 'waiting-alert' : ''].filter(Boolean).join(' ');
    return `<button data-tabcase="${k}" class="${classes}">${l}<span class="cnt">${n}</span></button>`;
  }).join(''));
  let rows = ({ waiting: wait, active: act, intake, closed })[tabCase].slice();
  if (tabCase === 'waiting') rows.sort((a, b) => a.n - b.n || a.readyAt - b.readyAt);
  else if (tabCase === 'closed') rows.sort((a, b) => b.closedAt - a.closedAt), rows = rows.slice(0, 60);
  else rows.sort((a, b) => b.createdAt - a.createdAt);
  const query = caseSearch.trim().toLocaleLowerCase('cs-CZ');
  if (query) rows = rows.filter(c => [c.num, c.addr, c.town, c.okres, c.klasif, c.charakter, c.typ, c.up, c.place, c.poznamka, c.src, c.op, c.ozn, c.phone, c.desc, c.dest, c.targetHospitalId, clarificationOf(c)].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ').includes(query));
  if (!rows.length) { setHTML($('cases'), `<div class="empty">${query ? 'Hledání neodpovídá žádnému případu.' : tabCase === 'waiting' ? 'Žádný případ nečeká na vyslání posádky.' : 'Nic k zobrazení.'}</div>`); return; }
  const body = rows.map(c => {
    const intk = c.status === 'intake';
    const rvPending = c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && c.status !== 'closed';
    const missing = missingInitialDispatch(c);
    const status = tabCase === 'closed'
      ? (c.unserved ? 'Neobslouženo' : c.typ === 'sekundární' ? 'Dokončeno' : `Uzavřeno · ${Math.round(c.score ? c.score.total : 0)} b.`)
      : c.status === 'waiting' ? 'Čeká na vyslání'
        : missing.length ? `Doplnit: ${missing.join(' + ')}`
        : intk ? `${c.op} nabírá výzvu`
          : rvPending ? `RZP žádá RV: ${c.rvReq.kind || 'posouzení stavu'}` : 'Řeší se';
    const crewLine = c.crews.map(id => sim.crewOf(id)).filter(Boolean).map(chipHTML).join('');
    const patient = (c.patientCount || 1) > 1 ? `${c.patientCount} zranění` : c.age != null ? `${Number(c.age) < 18 ? 'Dítě' : c.sex === 'Ž' ? 'Žena' : 'Muž'}, ${c.age} let` : c.desc;
    const detail = c.typ === 'sekundární'
      ? `Převoz: ${(D.hospitals.find(h => h.id === c.originHospitalId) || {}).short || '?'} → ${(D.hospitals.find(h => h.id === c.targetHospitalId) || {}).short || '?'}`
      : [c.place && `Místo: ${c.place}`, c.poznamka && `Poznámka ZOS: ${c.poznamka}`].filter(Boolean).join(' · ');
    const vj = c.vstricna && c.vstricna.state === 'offered' ? `Vstřícná jízda: přetáhni volnou RZP z oblasti ${c.vstricna.areaName} na tento případ` : '';
    const meta = intk
      ? `${c.op} nabírá výzvu · ${c.src}`
      : `Událost ${c.num} · ${sim.clockAt(c.createdAt)} · ${esc(c.src)} · volající ${esc(c.ozn)} · ${esc(c.phone)}`;
    return `<article class="case-card n${c.n} ${sel.c === c.id ? 'sel' : ''} ${rvPending ? 'rv-pending' : ''} ${intk ? 'is-intake' : ''}" data-case="${c.id}" tabindex="0" aria-label="N${c.n}, ${esc(c.klasif)}, ${esc(c.addr)}">
      <div class="case-top"><span class="case-priority">N${c.n}${c.dyn ? '<small>DYN</small>' : ''}</span>
        <div class="case-address"><strong>${esc(c.addr)}</strong><small>${esc(c.town || '')}${c.okres ? ` · okres ${esc(c.okres)}` : ''} · ${esc(c.typ || 'primární')}</small></div>
        <span class="case-status ${rvPending || missing.length ? 'urgent' : ''}">${esc(status)}${c.status === 'waiting' || missing.length ? ` <b class="case-age" data-since="${c.waitSince}"></b>` : ''}</span>
      </div>
      <div class="case-main"><div class="case-class"><b>${esc(c.klasif)}</b><small>${esc(c.charakter || '')}</small></div>
        <div class="case-up"><span class="field-label">Upřesnění</span>${esc(symptomsOf(c).join(', ') || '–')}</div>
        <div class="case-meta">${meta}</div>
      </div>
      <div class="case-bottom"><span class="case-patient">${esc(patient || 'Pacient neuveden')}</span><span class="case-scene">${esc(vj || detail || 'Bez doplňující poznámky')}</span>
        <span class="case-crews">${crewLine || `<span class="wait">${c.status === 'closed' ? (c.unserved ? 'Bez posádky' : 'Posádky uvolněny') : intk ? 'Výzva se připravuje' : 'Čeká na přidělení posádky'}</span>`}</span>
        ${tabCase === 'closed' && c.dest ? `<span class="case-destination">Cíl: ${esc(c.dest)}</span>` : ''}
      </div>
    </article>`;
  }).join('');
  setHTML($('cases'), `<div class="case-list">${body}</div>`);
  patchWait();
}
function patchWait() {
  const t = sim.s.t;
  document.querySelectorAll('#cases [data-since]').forEach(el => { const w = t - Number(el.dataset.since); el.textContent = `· ${mmss(w)}`; el.classList.toggle('late', w > 300); });
}

function nameFor(k) { const p = k.split(' '); return p[1].toUpperCase() + ' ' + p[0][0] + '.'; }
function renderDetail() {
  const c = sel.c && sim.caseOf(sel.c);
  if (!c) { setHTML($('detail'), '<div class="empty">Vyber případ v seznamu nebo na mapě.</div>'); return; }
  const intk = c.status === 'intake';
  const missingTypes = missingInitialDispatch(c);
  const st = missingTypes.length ? `čeká na ${missingTypes.join(' + ')}` : { waiting: 'čeká na vyslání', active: 'řeší se', closed: 'uzavřen', intake: 'nabírá se' }[c.status];
  const secDelta = c.scheduleDelta == null ? 'zatím nepřistaveno' : `${Math.round(Math.abs(c.scheduleDelta) / 60)} min ${c.scheduleDelta < 0 ? 'před termínem' : 'po termínu'}`;
  let h = `<div class="panel dgrid"><div class="dc1"><h3>${esc(c.num)} · <span class="pill" style="background:${c.n === 1 ? '#f7c9c5' : c.n === 2 ? '#fbdcb5' : c.n === 4 ? '#d8e4ec' : '#f7ecb8'}">N${c.n}${c.dyn ? ' dyn.' : ''}</span> <span class="pill" style="background:#e1e8ee">${st}</span></h3>`;
  if (c.n === 2 && !c.dyn && c.status !== 'closed' && !c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV'; })) h += `<button class="btn" data-act="n2-dynamic" data-case="${c.id}">Změnit výzvu na dynamickou</button>`;
  const wx = sim._lzsWeatherStatus(), wxLabel = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  h += `<div class="multi-patient"><b>LZS · ${wxLabel}</b>${wx === 'consult' ? `<br>${c.lzsConsult?.status === 'pending' ? 'Čeká se na rozhodnutí pilota.' : c.lzsConsult?.status === 'approved' ? 'Pilot let povolil.' : c.lzsConsult?.status === 'declined' ? 'Pilot let nedoporučil.' : `<button class="btn" data-act="lzs-consult" data-case="${c.id}">Konzultovat s pilotem</button>`}` : ''}</div>`;
  if (c.lzsActive && c.lzsTechRequired) h += `<div class="multi-patient"><b>Technická součinnost LZS · nepřístupný terén</b><br>${c.lzsTechDone ? 'Přístup k pacientovi je zajištěn.' : c.lzsTechRequested ? 'HZS zajišťuje přístup.' : `<button class="btn" data-act="lzs-tech" data-case="${c.id}">Vyžádat technickou součinnost HZS</button>`}</div>`;
  if (c.mu) {
    const role = sim.s.muPlayerRole;
    h += `<div class="multi-patient"><b>${c.mu.phase === 'declared' ? 'MU POTVRZENA' : 'Podezření na MU'} · ${c.mu.cas} osob · odhad ${c.mu.groupsRequired} skupin${c.mu.aircraft ? ' · letecká nehoda' : ''}</b><br>${role ? (role === 'mu' ? 'Ty řešíš MU, simulovaný kolega běžný provoz.' : 'Ty řešíš běžný provoz, simulovaný kolega MU.') : 'Zvol, kterou část dispečinku převezmeš.'}<div style="margin-top:6px"><button class="btn ${role === 'mu' ? 'pri' : ''}" data-act="mu-role" data-role="mu">Řešit MU</button><button class="btn ${role === 'normal' ? 'pri' : ''}" data-act="mu-role" data-role="normal">Řešit běžný provoz</button></div><small>Počty i dostupnost nemocnic jsou herní odhady; stupně traumatologického plánu nejsou modelovány.</small></div>`;
    if (role !== 'normal') {
      if (!c.mu.requestSent) h += `<button class="btn" data-act="mu-request" data-case="${c.id}">Požádat o modul MU</button>`;
      if (c.mu.phase === 'declared') h += `<button class="btn" data-act="mu-reinforce" data-case="${c.id}" data-count="2">Požádat o 2 další skupiny</button>`;
      if (!c.mu.hospitalInfoRequested) h += `<button class="btn" data-act="mu-hospitals" data-case="${c.id}">Vyžádat nemocniční součinnost</button>`;
      if (c.mu.aircraft && !c.mu.landingCheckRequested) h += `<button class="btn" data-act="mu-landing" data-case="${c.id}">Ověřit plochu pro LZS</button>`;
    }
  }
  if (intk) {
    const prealerted = (c.prealertCrewIds || []).map(id => sim.crewOf(id)).filter(Boolean);
    const prealert = c.n === 1
      ? `<div class="prealert-panel"><p>U N1 můžeš posádkám dát předpoplach ještě před dokončením výzvy. Posádky zatím nevyjíždějí.</p>${prealerted.length
        ? `<b>Předpoplach přijat: ${prealerted.map(k => esc(k.name)).join(', ')}</b>`
        : `<button class="btn red" data-act="prealert" data-case="${c.id}">Předpoplach posádkám</button>`}</div>`
      : '';
    const earlyReports = (c.radioReports || []).filter(r => r.received).map(r => `<li><time>${esc(sim.clockAt(r.receivedAt))}</time> ${esc(r.source || 'Linka 112')}: ${esc(r.text)}</li>`).join('');
    const reportsHtml = earlyReports ? `<div class="report-panel"><b>Průběžné zprávy linky 112</b><ul>${earlyReports}</ul></div>` : '';
    setHTML($('detail'), h + '<p>Calltaker ještě nabírá výzvu…</p>' + prealert + reportsHtml + '</div></div>'); return;
  }
  h += `<dl><dt>Typ výjezdu</dt><dd>${esc(c.typ || 'primární')}</dd>
<dt>Naléhavost</dt><dd>N${c.n}${c.dyn ? ' (dynamická)' : ''}</dd>
${c.doplnkova ? `<dt>Doplňková naléhavost</dt><dd>${esc(c.doplnkova)}</dd>` : ''}
<dt>Charakter</dt><dd>${esc(c.charakter)}</dd>
${c.typ === 'sekundární' ? `<dt>Převoz</dt><dd>${esc((D.hospitals.find(h => h.id === c.originHospitalId) || {}).short || '?')} → ${esc((D.hospitals.find(h => h.id === c.targetHospitalId) || {}).short || '?')}</dd>` : ''}
${c.lzsActive ? `<dt>LZS / heliport</dt><dd>${esc(c.lzsState || 'vrtulník vyslán')} · ${esc(c.lzsTargetHospitalId === 'h-fnkv' ? 'FNKV Praha heliport' : ZOS_DATA.lzs.heliport.name)}</dd>` : ''}
${c.typ === 'sekundární' ? `<dt>Plánované přistavení</dt><dd>${Number.isFinite(c.scheduledAt) ? sim.clockAt(c.scheduledAt) + ' (tolerance ±15 min)' : 'čas nezadán'}</dd><dt>Časový výsledek</dt><dd>${esc(secDelta)}${c.timeScore == null ? '' : ` · ${c.timeScore}/100 b.`}</dd>` : ''}
<dt>Klasifikace</dt><dd>${esc(c.klasif)}</dd>
<dt>Upřesnění</dt><dd>${esc(clarificationOf(c))}</dd>
<dt>Oznamovatel</dt><dd>${esc(c.ozn)}${c.oznRel ? ` <span style="font-weight:400;color:#5a6a7a">(${esc(c.oznRel.replace(/^volá /, ''))})</span>` : ''} · ${esc(c.phone)}</dd>
<dt>Adresa</dt><dd>${esc(c.addr)}<br><span style="font-weight:400;color:#5a6a7a">Jihočeský kraj, okres ${esc(okresOf(c))}, obec ${esc(c.town)}<br>${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}</span></dd>
<dt>Popis místa</dt><dd>${esc(c.place)}</dd>
<dt>Pacienti</dt><dd>${c.mu ? c.mu.cas + ' zraněných (zbývá ošetřit ' + c.mu.left + ')' : (c.patientCount || 1) > 1 ? `${c.patientCount} zranění (zbývá ošetřit ${c.patientsRemaining})` : esc(c.desc)}</dd>
<dt>Oznámil</dt><dd>${esc(c.src)} · nabíral ${esc(c.op)}</dd></dl>`;
  const reports = (c.radioReports || []).filter(r => r.received);
  if (reports.length) h += `<div class="report-panel"><b>${c.mu ? 'Situační hlášení' : 'Průběžná hlášení'}</b><ul>${reports.map(r => `<li><time>${esc(sim.clockAt(r.receivedAt))}</time> <b>${esc(r.source || (c.mu ? 'Situační hlášení' : 'Linka 112'))}:</b> ${esc(r.text)}${r.fields ? `<ul>${Object.entries(r.fields).filter(([,v]) => v).map(([k,v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>${c.status === 'waiting' || c.status === 'active' ? '<button class="btn pri" data-act="sug">Reagovat – otevřít nabídku posádek</button>' : ''}</div>`;
  if (c.mu && c.mu.hospitalInfoReceived) {
    const caps = c.mu.hospitalCapacities || [];
    h += `<div class="report-panel"><b>Nemocniční příjem (simulovaný)</b>${caps.map(cap => { const hp = D.hospitals.find(x => x.id === cap.hospitalId); return hp ? `<div class="row"><span>${esc(hp.short)}</span><span>${esc(cap.state)} · ${cap.remaining} míst v herním modelu</span><button class="btn" data-act="mu-hospital" data-case="${c.id}" data-hospital="${hp.id}" ${cap.state === 'dočasně nepřijímá' ? 'disabled' : ''}>Směrovat</button></div>` : ''; }).join('')}</div>`;
  }
  if ((c.patientCount || 1) > 1 && c.status !== 'closed') h += `<p class="multi-patient">Více zraněných: ${c.patientsRemaining} pacientů čeká na ošetření. Podle situace vyšlete další RZP.</p>`;
  if (c.vstricna && c.vstricna.state === 'offered') {
    const candidates = sim.s.crews.filter(k => k.type === 'RZP' && k.oblast === c.vstricna.area && sim.avail(k) && !k.res)
      .map(k => ({ k, eta: sim.etaFor(k, c.vstricna.meet ? c.vstricna.meet.lat : c.lat, c.vstricna.meet ? c.vstricna.meet.lon : c.lon) }))
      .sort((a, b) => a.eta - b.eta).slice(0, 4);
    h += `<div class="vstricna-panel"><b>Vstřícná jízda do ${esc(c.vstricna.areaName)}</b><p>Pacient je vhodný k překladu. Přetáhni volnou RZP z cílové oblasti na kartu tohoto případu; posádky se setkají na trase.</p>${candidates.length ? `<small>Volné posádky: ${candidates.map(x => `${esc(x.k.name)} (${Math.round(x.eta / 60)} min)`).join(' · ')}</small>` : '<small>Volná místní RZP už není k dispozici.</small>'}</div>`;
  }
  if (c.rvReq && !c.rvReq.cancelled && !c.docAssigned) h += `<p style="color:#b84a00;font-weight:600">Posádka na místě žádá RV: ${esc(c.rvReq.kind || 'zhoršení stavu')}.</p>`;
  const crews = c.crews.map(id => sim.crewOf(id));
  h += `<div style="margin-top:6px"><b>Zasahují:</b> ${crews.length ? crews.map(k => {
    const canCancel = k.state === 'call' || k.state === 'enroute' || (k.type === 'LZS' && (k.state === 'onscene' || (k.state === 'transport' && k.lzsLeg === 'to-scene')));
    return `<span class="assigned-crew">${chipHTML(k)}${canCancel ? `<button class="btn red" data-act="cancel" data-case="${c.id}" data-crew="${k.id}">${k.type === 'LZS' ? 'Odvolat LZS' : 'Odvolat'}</button>` : ''}</span>`;
  }).join('') : '<span style="color:#5a6a7a">nikdo</span>'}</div>`;
  if (c.status === 'closed' && c.typ === 'sekundární') h += `<p>Body za dodržení času: <b>${c.score ? c.score.total : 0}/100</b></p>`;
  else if (c.status === 'closed' && c.score) h += `<p>Skóre případu: <b>${Math.round(c.score.total)}</b> (včas ${c.score.delay.toFixed(0)}/20 · příjezd ${c.score.arrive.toFixed(0)}/50 · lékař ${c.score.rv.toFixed(0)}/15 · volba ${c.score.eff.toFixed(0)}/15${c.score.pen ? ' · přesměrování −' + c.score.pen : ''})</p>`;
  h += '</div><div class="dc2">';
  if (c.status === 'waiting' || c.status === 'active') {
    h += `<div><button class="btn pri" data-act="sug">Navrhnout posádku ${sugOpen ? '▴' : '▾'}</button></div>`;
    if (sugOpen) {
      const sect = (title, kind, n, role) => {
        const list = sim.suggest(c.id, kind, role).slice(0, n);
        if (!list.length) return `<div class="sug"><h4>${title}</h4><div class="row" style="color:#5a6a7a">Nikdo volný.</div></div>`;
        return `<div class="sug"><h4>${title}</h4>${list.map(x => {
          const k = sim.crewOf(x.crewId);
          return `<div class="row"><span class="chip" data-crew="${k.id}" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(k.name)}</span><span>${esc(STLAB[k.state])}</span><span class="km">${x.km.toFixed(0)} km</span><span class="eta">${Math.round(x.eta / 60)} min</span><button class="btn pri" data-act="assign" data-case="${c.id}" data-crew="${k.id}" data-role="${role || ''}">Vyslat</button>${!role && k.type === 'RZP' && k.state === 'base' && sim.liberoFor(k) ? `<button class="btn" title="Přidat lékaře LIBERO ze základny – dočasně RLP" data-act="assign-libero" data-case="${c.id}" data-crew="${k.id}">+ LIBERO</button>` : ''}</div>`;
        }).join('')}</div>`;
      };
      if (c.typ === 'sekundární') h += sect('RZP', 'RZP', 6);
      else if (c.lzsActive) {
        if (c.lzsPatientToHospital && !c.exitus && !c.coronerRequested) h += sect(`RZP – převoz z heliportu ${c.lzsTargetHospitalId === 'h-fnkv' ? 'FNKV Praha' : 'NEM ČB'}`, 'RZP', 6, 'heli-transfer');
        else h += sect('RZP – místo události', 'RZP', 6);
        h += sect('RV (lékař) – místo události', 'RV', 4);
      }
      else h += sect('RZP', 'RZP', 6) + sect('RV (lékař)', 'RV', 4) + sect('LZS', 'LZS', 1) + lzsSupportHtml(c) + (c.mu ? sect('MU – modul hromadného neštěstí', 'MU', 2) : '');
    }
  }
  setHTML($('detail'), h + '</div></div>');
}

// ---------- posádky ----------
function renderCrews() {
  const s = sim.s;
  const groups = D.oblasti.map(o => ({ title: o.name, crews: s.crews.filter(k => k.oblast === o.id && k.type !== 'LZS' && k.type !== 'MU') }));
  groups.push({ title: 'Speciální (LZS, MU)', crews: s.crews.filter(k => k.type === 'LZS' || k.type === 'MU') });
  const rank = k => (k.type === 'RZP' && !k.res ? 0 : k.type === 'RV' ? 1 : k.type === 'LIB' ? 1.5 : k.type === 'RZP' ? 2 : 3);
  let h = '';
  for (const g of groups) {
    g.crews.sort((a, b) => rank(a) - rank(b));
    const free = g.crews.filter(k => sim.avail(k)).length, on = g.crews.filter(k => k.state !== 'off').length;
    h += `<div class="oblast">${esc(g.title)} <span>volných ${free} / ve službě ${on}</span></div><div class="grid">` +
      g.crews.map(k => {
        const prealert = s.cases.some(c => c.status === 'intake' && c.n === 1 && (c.prealertCrewIds || []).includes(k.id));
        return `<button class="tile st-${k.state} ${sel.k === k.id ? 'sel' : ''} ${prealert ? 'prealerted' : ''}" data-crew="${k.id}" title="${esc(k.name + ' · ' + sim.phase(k) + (prealert ? ' · PŘEDPOPLACH' : '') + ' · ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}" aria-label="${esc(k.name + ', ' + sim.phase(k) + (prealert ? ', předpoplach' : '') + ', ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}"><span class="tn">${esc(k.name)}</span><i>${esc(k.code)}${k.type === 'RV' ? ' RV' : k.type === 'LZS' ? ' LZS' : k.res ? ' Z' : ''} · ${k.callsCompleted || 0} výj.</i>${ico(k.state, k.type)}${prealert ? '<span class="prealert-badge">PA</span>' : ''}</button>`;
      }).join('') + '</div>';
  }
  setHTML($('crews'), h);
  setHTML($('legend'), [['call', 'výzva'], ['enroute', 'výjezd'], ['onscene', 'na místě'], ['transport', 'transport'], ['free', 'volná'], ['base', 'na základně'], ['off', 'nepřihlášená'], ['second', 'sekundár']].map(([k, l]) => `<span class="legend-item"><i class="legend-icon st-${k}">${ico(k)}</i>${l}</span>`).join('') + '<span>· dlaždici lze přetáhnout na případ</span>');
  const k = sel.k && sim.crewOf(sel.k);
  if (!k) { setHTML($('crewpanel'), '<span style="color:#5a6a7a">Vyber posádku. Panel vybrané posádky.</span>'); return; }
  const cs = k.caseId && sim.caseOf(k.caseId), selCase = sel.c && sim.caseOf(sel.c);
  let p = `<h3>${esc(k.name)} <span class="pill" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(sim.phase(k))}</span></h3>
<dl><dt>Rádio</dt><dd>${esc(k.code)} · ${k.type === 'RV' ? 'RV (lékař)' : k.type === 'LZS' ? 'RLP vrtulník' : k.type === 'MU' ? 'MU modul' : k.type === 'LIB' ? 'LIBERO – lékař bez vozu, jen přes den' : k.res ? 'RZP záloha' : k.rlp ? 'RZP + lékař LIBERO (dočasně RLP)' : 'RZP'}${k.zzum ? ' · ZZUM' : ''}</dd>
<dt>Členové</dt><dd>${esc(k.members.join(', '))}</dd>
<dt>Uskutečněné výjezdy</dt><dd>${k.callsCompleted || 0}</dd>
${cs ? `<dt>Případ</dt><dd><a href="#" data-case="${cs.id}">${esc(cs.num)} ${esc(cs.klasif)}</a></dd>` : ''}${k.dest ? `<dt>Cíl</dt><dd>${esc(k.dest.name)}</dd>` : ''}</dl>`;
  if (k.type === 'RZP' && (k.state === 'base' || k.state === 'call') && sim.liberoFor(k)) p += `<button class="btn pri" data-act="libero" data-crew="${k.id}">+ LIBERO (dočasně RLP)</button>`;
  if (k.type === 'LIB') { const m = (sim.s.libero && sim.s.libero.modes[k.id]) || 'random'; p += `<div class="opts" style="margin:4px 0">Obsazení: ${[['on', 'Obsazeno'], ['off', 'Neobsazeno'], ['random', 'Náhodně']].map(([v, l]) => `<button data-libset="${k.id}" data-val="${v}" class="${m === v ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
  if (k.type === 'LIB' && k.state === 'base') for (const r of sim.s.crews.filter(x => x.type === 'RZP' && x.st === k.st && !x.rlp && (x.state === 'base' || x.state === 'call'))) p += `<button class="btn" data-act="libero" data-crew="${r.id}" data-lib="${k.id}">Do vozu ${esc(r.name)}</button>`;
  if (k.type === 'LIB' && k.state === 'off') p += '<p style="color:#5a6a7a;margin:4px 0">LIBERO dnes není ve službě (jen přes den a ne vždy).</p>';
  if (k.res && k.state === 'off') p += `<button class="btn pri" data-act="resv" data-crew="${k.id}">Aktivovat zálohu</button>`;
  if (sim.avail(k) && selCase && (selCase.status === 'waiting' || selCase.status === 'active') && !(k.type === 'MU' && !selCase.mu)) p += `<button class="btn pri" data-act="assign" data-case="${selCase.id}" data-crew="${k.id}">Vyslat k ${esc(selCase.num)}</button>`;
  if ((k.state === 'call' || k.state === 'enroute') && selCase && selCase.id !== k.caseId && selCase.status !== 'closed') p += `<button class="btn red" data-act="reassign" data-case="${selCase.id}" data-crew="${k.id}">Přesměrovat na ${esc(selCase.num)}</button>`;
  if (cs) p += `<button class="btn" data-act="print" data-crew="${k.id}">Výzva k výjezdu</button>`;
  p += `<button class="btn" data-act="focus" data-crew="${k.id}">Na mapě</button>`;
  setHTML($('crewpanel'), p);
}

// ---------- mapa ----------
const KRAJ = [[49.70, 14.40], [49.68, 14.80], [49.60, 15.05], [49.35, 15.25], [49.15, 15.50], [48.95, 15.35], [48.78, 15.05], [48.72, 14.80], [48.62, 14.55], [48.60, 14.30], [48.62, 14.0], [48.75, 13.82], [48.88, 13.70], [49.05, 13.55], [49.20, 13.65], [49.40, 13.80], [49.58, 14.0], [49.70, 14.15]];
const VLT = [[48.64, 14.23], [48.78, 14.33], [48.97, 14.47], [49.06, 14.43], [49.22, 14.42], [49.35, 14.39], [49.55, 14.15]];
function renderToolsOnce() {
  setHTML($('maptools'), [['base', 'Základny'], ['hosp', 'Nemocnice'], ['crews', 'Vozidla'], ['cases', 'Případy']].map(([k, l]) => `<button data-layer="${k}" class="${layers[k] ? '' : 'off'}">${l}</button>`).join('') + '<button data-act="zoomin">＋</button><button data-act="zoomout">－</button><button data-act="zoomreset">⌂</button>');
}

const BASE_HTML = (() => {
  const B = BASEMAP, ns = 'vector-effect="non-scaling-stroke"', ln = (d, c, w, extra) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" ${ns} ${extra || ''}/>`;
  return `<path d="${B.okoli}" fill="#dfe3dc" stroke="#b7beb3" stroke-width="1" ${ns}/><path d="${B.kraj}" fill="#f1f4ec"/>` +
    `<g class="z1">${ln(B.orp, '#bcc6b2', 0.8, 'stroke-dasharray="1.5 3"')}</g>` +
    Object.values(B.okresy).map(d => ln(d, '#9fab95', 1, 'stroke-dasharray="5 3"')).join('') +
    `<path d="${B.jezera}" fill="#a9cfe8" stroke="#8fbad6" stroke-width="0.6" ${ns}/>` + ln(B.reky, '#8fc0e0', 1.4) +
    `<g class="z1">${ln(B.rail, '#7c8288', 1, 'stroke-dasharray="6 3"')}${ln(B.silnice2, '#ece0b4', 1.1)}</g>` +
    ln(B.silnice1, '#c79c3e', 3) + ln(B.silnice1, '#f7d98a', 1.8) + ln(B.dalnice, '#b05a1a', 4) + ln(B.dalnice, '#f29a4a', 2.4) +
    ln(B.kraj, '#5f705a', 1.8);
})();
$('map').innerHTML = '<g id="base">' + BASE_HTML + '</g><g id="dyn"></g>';
const clampF = x => Math.max(0, Math.min(1, x));
// ---------- mapa MapLibre nad vloženými dlaždicemi OSM ----------
let GL = null, glReady = false, glLast = 0, TILEIDX = null, pendingMapFocus = null;
const chunkCache = new Map();
function applyMapFocus(target, attempt = 0) {
  if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lon)) return;
  if (!GL || !glReady) { pendingMapFocus = target; return; }
  const wrap = document.getElementById('mapwrap');
  if (!wrap || !wrap.clientWidth || !wrap.clientHeight) {
    if (attempt < 30) requestAnimationFrame(() => applyMapFocus(target, attempt + 1));
    else pendingMapFocus = target;
    return;
  }
  try {
    GL.stop(); GL.resize();
    // Při výběru výzvy musí být změna středu spolehlivá i během běžného
    // překreslování panelu. Animované easeTo se v některých stavech MapLibre
    // zrušilo dřív, než změnilo kameru; dispečer potřebuje okamžitý přesun.
    GL.jumpTo({ center: [target.lon, target.lat], zoom: GL.getZoom() < 10 ? 11 : Math.min(GL.getZoom(), 12.5) });
  } catch (err) {
    console.warn('map focus', err);
    try { GL.jumpTo({ center: [target.lon, target.lat], zoom: GL.getZoom() < 10 ? 11 : Math.min(GL.getZoom(), 12.5) }); } catch (_) {}
  }
}
function chunk(name) {
  let p = chunkCache.get(name);
  if (!p) { p = fetch('t/' + name + '.wasm').then(r => { if (!r.ok) throw new Error('chunk ' + name); return r.arrayBuffer(); }); chunkCache.set(name, p); p.catch(() => chunkCache.delete(name)); }
  return p;
}
async function gunzip(buf) {
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(s).arrayBuffer();
}
const ST_COL = ['match', ['get', 'state'], 'base', '#f3f5f7', 'free', '#3cb54a', 'call', '#2f7de1', 'off', '#8e5bd6', 'activating', '#b79af0', 'second', '#7b8794', '#d9372c'];
function glStyle() {
  const W = (a) => ['interpolate', ['exponential', 1.6], ['zoom'], ...a];
  const road = (id, classes, color, casing, w, minz, extra) => [
    { id: id + '-case', type: 'line', source: 'osm', 'source-layer': 'roads', minzoom: minz, filter: ['all', ['in', ['get', 'class'], ['literal', classes]], ['!', ['has', 'tunnel']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': casing, 'line-width': W(w.map((v, i) => i % 2 ? v * 1.35 + 0.6 : v)) } },
    { id: id, type: 'line', source: 'osm', 'source-layer': 'roads', minzoom: minz, filter: ['in', ['get', 'class'], ['literal', classes]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: Object.assign({ 'line-color': color, 'line-width': W(w) }, extra || {}) },
  ];
  const txt = (id, filter, size, minz, font, color) => ({ id, type: 'symbol', source: 'osm', 'source-layer': 'places', minzoom: minz, filter, layout: { 'text-field': ['get', 'name'], 'text-font': [font], 'text-size': size, 'text-padding': 4, 'symbol-sort-key': ['get', 'rank'] }, paint: { 'text-color': color, 'text-halo-color': 'rgba(255,255,255,.92)', 'text-halo-width': 1.6 } });
  return {
    version: 8,
    glyphs: 'zos://g/{fontstack}/{range}',
    sources: {
      osm: { type: 'vector', tiles: ['zos://t/{z}/{x}/{y}'], minzoom: 5, maxzoom: 14, bounds: [13.4, 48.5, 15.65, 49.75], attribution: '© přispěvatelé OpenStreetMap' },
      mask: { type: 'geojson', data: GLMASK },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#f2efe9' } },
      { id: 'lc-wood', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': '#c8dfb8' } },
      { id: 'lc-res', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'residential'], paint: { 'fill-color': '#e2ddd6' } },
      { id: 'lc-ind', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'industrial'], paint: { 'fill-color': '#e6d8de' } },
      { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': '#aad3df' } },
      { id: 'waterway', type: 'line', source: 'osm', 'source-layer': 'waterway', paint: { 'line-color': '#aad3df', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'class'], 'river', 1, 0.3], 14, ['match', ['get', 'class'], 'river', 4, 1.5]] } },
      { id: 'buildings', type: 'fill', source: 'osm', 'source-layer': 'buildings', minzoom: 14, paint: { 'fill-color': '#d9d0c9', 'fill-outline-color': '#c4b8ae' } },
      { id: 'rail', type: 'line', source: 'osm', 'source-layer': 'rail', paint: { 'line-color': '#8a8a8a', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 2], 'line-dasharray': [3, 2] } },
      { id: 'track', type: 'line', source: 'osm', 'source-layer': 'roads', minzoom: 13, filter: ['==', ['get', 'class'], 'track'], paint: { 'line-color': '#a87c2a', 'line-width': 1, 'line-dasharray': [2, 1.5] } },
      ...road('r-service', ['service'], '#ffffff', '#c4c0bb', [13, 0.8, 16, 4, 18, 9], 13),
      ...road('r-minor', ['minor'], '#ffffff', '#bfbab3', [11, 0.6, 14, 3, 18, 16], 11),
      ...road('r-tert', ['tertiary'], '#ffffff', '#a8a39d', [8, 0.5, 12, 2.2, 14, 5, 18, 20], 8),
      ...road('r-sec', ['secondary'], '#f7fabf', '#a5a87a', [8, 0.8, 12, 3, 14, 6.5, 18, 22], 8),
      ...road('r-prim', ['primary'], '#fcd6a4', '#b08d55', [6, 0.9, 10, 2.4, 14, 7.5, 18, 24], 6),
      ...road('r-trunk', ['trunk'], '#f9b29c', '#c06a51', [5, 1, 10, 2.8, 14, 8, 18, 26], 5),
      ...road('r-mw', ['motorway'], '#e892a2', '#c0435b', [5, 1.2, 10, 3.2, 14, 9, 18, 28], 5),
      { id: 'bnd-okres', type: 'line', source: 'osm', 'source-layer': 'boundary', filter: ['==', ['get', 'kind'], 'okres'], paint: { 'line-color': '#9a7aa0', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 12, 2], 'line-dasharray': [4, 2] } },
      { id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#b8bcc0', 'fill-opacity': 0.45 } },
      { id: 'bnd-kraj', type: 'line', source: 'osm', 'source-layer': 'boundary', filter: ['==', ['get', 'kind'], 'kraj'], paint: { 'line-color': '#7b4d84', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.6, 12, 3.5] } },
      { id: 'road-name', type: 'symbol', source: 'osm', 'source-layer': 'roads', minzoom: 13, filter: ['has', 'name'], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 13], 'symbol-spacing': 300 }, paint: { 'text-color': '#444', 'text-halo-color': '#fff', 'text-halo-width': 1.4 } },
      { id: 'road-ref', type: 'symbol', source: 'osm', 'source-layer': 'roads', minzoom: 8, filter: ['all', ['has', 'ref'], ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]]], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'ref'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'symbol-spacing': 450, 'text-rotation-alignment': 'viewport', 'text-padding': 6 }, paint: { 'text-color': '#fff', 'text-halo-color': ['match', ['get', 'class'], 'motorway', '#c0435b', 'trunk', '#c0435b', '#2e5aa8'], 'text-halo-width': 3 } },
      txt('pl-iso', ['in', ['get', 'place'], ['literal', ['isolated_dwelling', 'neighbourhood']]], 10, 14, 'Noto Sans Regular', '#555'),
      txt('pl-ham', ['in', ['get', 'place'], ['literal', ['hamlet', 'suburb']]], 11, 12, 'Noto Sans Regular', '#444'),
      txt('pl-vil', ['==', ['get', 'place'], 'village'], ['interpolate', ['linear'], ['zoom'], 10, 10.5, 14, 13], 10, 'Noto Sans Regular', '#333'),
      txt('pl-town', ['==', ['get', 'place'], 'town'], ['interpolate', ['linear'], ['zoom'], 7, 11, 13, 16], 7, 'Noto Sans Bold', '#222'),
      txt('pl-city', ['==', ['get', 'place'], 'city'], ['interpolate', ['linear'], ['zoom'], 5, 13, 13, 20], 5, 'Noto Sans Bold', '#111'),
    ],
  };
}
function glInit() {
  if (GL || typeof maplibregl === 'undefined' || !TILEIDX) return;
  try {
    maplibregl.setWorkerUrl(new URL('lib/maplibre-gl-csp-worker.js', location.href).href);
    maplibregl.addProtocol('zos', async (params) => {
      const u = params.url.slice(6);
      if (u.startsWith('t/')) {
        const ent = TILEIDX[u.slice(2)]; if (!ent) return { data: new ArrayBuffer(0) };
        const buf = await chunk(ent[0]);
        return { data: await gunzip(buf.slice(ent[1], ent[1] + ent[2])) };
      }
      if (u.startsWith('g/')) {
        const [, fs, rg] = u.split('/'), font = decodeURIComponent(fs).split(',')[0].trim();
        const ent = TILEIDX['g:' + font + '/' + rg.replace('.pbf', '')]; if (!ent) return { data: new ArrayBuffer(0) };
        const buf = await chunk(ent[0]);
        return { data: buf.slice(ent[1], ent[1] + ent[2]) };
      }
      return { data: new ArrayBuffer(0) };
    });
    document.getElementById('map').style.display = 'none';
    const el = document.createElement('div'); el.id = 'gl'; el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    const mapWrap = document.getElementById('mapwrap'); mapWrap.prepend(el);
    GL = new maplibregl.Map({ container: el, style: glStyle(), bounds: [[13.53, 48.55], [15.61, 49.63]], fitBoundsOptions: { padding: 10 }, maxZoom: 18.5, minZoom: 6, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, touchPitch: false });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (GL) requestAnimationFrame(() => GL.resize()); }).observe(mapWrap);
    // MapLibre obsluhuje vlastní tažení; společný pointer handler níže je jen
    // pro SVG fallback (pointer capture na wrapperu by blokoval drag MapLibre).
    GL.dragPan.enable();
    GL.scrollZoom.enable();
    GL.touchZoomRotate.disableRotation();
    GL.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    GL.on('error', e => { if (window.console) console.warn('map', e && e.error && e.error.message); });
    GL.on('load', () => {
      const empty = { type: 'FeatureCollection', features: [] };
      for (const s of ['routes', 'stations', 'hosp', 'heliport', 'cases', 'crews']) GL.addSource(s, { type: 'geojson', data: empty });
      GL.addSource('selroute', { type: 'geojson', data: empty });
      GL.addLayer({ id: 'routes', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'col'], 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 3, 14, 6], 'line-opacity': 0.85 } });
      GL.addLayer({ id: 'stations', type: 'circle', source: 'stations', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4.5, 13, 7], 'circle-color': '#fffdf4', 'circle-stroke-color': '#263b4a', 'circle-stroke-width': 1.6 } });
      GL.addLayer({ id: 'stations-l', type: 'symbol', source: 'stations', minzoom: 10, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#2d4153', 'text-halo-color': '#fff', 'text-halo-width': 1.4 } });
      GL.addLayer({ id: 'hosp', type: 'circle', source: 'hosp', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 6, 13, 10], 'circle-color': '#fff', 'circle-stroke-color': '#c0281f', 'circle-stroke-width': 2 } });
      GL.addLayer({ id: 'hosp-t', type: 'symbol', source: 'hosp', layout: { 'text-field': 'H', 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 8, 13, 13], 'text-allow-overlap': true }, paint: { 'text-color': '#c0281f' } });
      GL.addLayer({ id: 'hosp-l', type: 'symbol', source: 'hosp', minzoom: 9, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.3], 'text-anchor': 'top' }, paint: { 'text-color': '#8a1c14', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      GL.addLayer({ id: 'heliport', type: 'circle', source: 'heliport', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 13, 9], 'circle-color': '#f4cf46', 'circle-stroke-color': '#263746', 'circle-stroke-width': 2 } });
      GL.addLayer({ id: 'heliport-l', type: 'symbol', source: 'heliport', minzoom: 9, layout: { 'text-field': 'H', 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.2], 'text-anchor': 'top' }, paint: { 'text-color': '#263746', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      GL.addLayer({ id: 'crews-base', type: 'circle', source: 'crews', minzoom: 10, filter: ['in', ['get', 'state'], ['literal', ['base', 'second']]], paint: { 'circle-radius': 6, 'circle-color': ST_COL, 'circle-stroke-color': ['case', ['get', 'sel'], '#ffd23f', '#111'], 'circle-stroke-width': ['case', ['get', 'sel'], 3, 1.2] } });
      const svgIcon = (name, svg, w, h, done) => {
        const img = new Image(), pr = 2;
        img.onload = () => {
          try {
            const c = document.createElement('canvas'); c.width = w * pr; c.height = h * pr;
            const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height);
            if (!GL.hasImage(name)) GL.addImage(name, ctx.getImageData(0, 0, c.width, c.height), { pixelRatio: pr });
            done();
          } catch (err) { console.warn('icon ' + name, err); }
        };
        img.onerror = () => console.warn('icon ' + name + ' failed');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      };
      const houseSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 14 16 3l13 11h-3v14H6V14Z" fill="#fffdf4" stroke="#263b4a" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 28V18h6v10" fill="#b8c8d3" stroke="#263b4a" stroke-width="1.5"/><path d="M4 14 16 4l12 10" fill="none" stroke="#d9342b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      svgIcon('zos-house', houseSvg, 32, 32, () => {
        if (GL.getLayer('stations-house')) return;
        GL.addLayer({ id: 'stations-house', type: 'symbol', source: 'stations', layout: { 'icon-image': 'zos-house', 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.48, 13, 0.78], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.base ? 'visible' : 'none' }, paint: { 'icon-opacity': 1 } }, 'crews-base');
      });
      GL.addLayer({ id: 'crews', type: 'circle', source: 'crews', filter: ['any', ['!', ['in', ['get', 'state'], ['literal', ['base', 'second']]]], ['get', 'sel']], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, ['case', ['get', 'sel'], 9, 6], 14, ['case', ['get', 'sel'], 12, 9]], 'circle-color': ST_COL, 'circle-stroke-color': ['case', ['get', 'sel'], '#ffd23f', '#111'], 'circle-stroke-width': ['case', ['get', 'sel'], 3, 1.4] } });
      GL.addLayer({ id: 'crews-t', type: 'symbol', source: 'crews', filter: ['==', ['get', 'type'], 'RV'], layout: { 'text-field': 'L', 'text-font': ['Noto Sans Bold'], 'text-size': 9, 'text-allow-overlap': true }, paint: { 'text-color': ['match', ['get', 'state'], ['base', 'free'], '#111', '#fff'] } });
      const heliSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="32" viewBox="0 0 32 22"><path d="M6 10h14a5 5 0 0 1 5 5v1H9a5 5 0 0 1-5-5v-1h2Zm14 0 3-5h2l-2 5M13 16v3m-5 0h10m2-12h8M15 5h6M20 5v2" fill="#d9342b" stroke="#202a31" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="16" r="1.1" fill="#fff"/><circle cx="21" cy="16" r="1.1" fill="#fff"/></svg>';
      svgIcon('zos-heli', heliSvg, 48, 32, () => {
        if (GL.getLayer('crews-heli')) return;
        GL.addLayer({ id: 'crews-heli', type: 'symbol', source: 'crews', filter: ['==', ['get', 'type'], 'LZS'], layout: { 'icon-image': 'zos-heli', 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.38, 13, 0.68], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.crews ? 'visible' : 'none' }, paint: { 'icon-opacity': 1 } }, GL.getLayer('cases') ? 'cases' : undefined);
      });
      GL.addLayer({ id: 'crews-base-l', type: 'symbol', source: 'crews', minzoom: 10.5, filter: ['all', ['in', ['get', 'state'], ['literal', ['base', 'second']]], ['!', ['get', 'sel']], ['!=', ['get', 'type'], 'LIB']], layout: { 'text-field': ['get', 'code'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0.7, -0.7], 'text-anchor': 'bottom-left', 'text-optional': true }, paint: { 'text-color': '#33475a', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
      GL.addLayer({ id: 'crews-l', type: 'symbol', source: 'crews', minzoom: 7.5, filter: ['any', ['!', ['in', ['get', 'state'], ['literal', ['base', 'second']]]], ['get', 'sel']], layout: { 'text-field': ['step', ['zoom'], ['get', 'code'], 12, ['concat', ['get', 'code'], ' ', ['get', 'name']]], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 12], 'text-offset': [0.8, -0.8], 'text-anchor': 'bottom-left', 'text-optional': true }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.8 } });
      GL.addLayer({ id: 'cases', type: 'circle', source: 'cases', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 9, 14, 13], 'circle-color': ['match', ['get', 'n'], 1, '#d9342b', 2, '#ee8a1b', 4, '#7892a6', '#e8c02a'], 'circle-stroke-color': ['case', ['get', 'sel'], '#111', ['get', 'rvReq'], '#d9342b', '#fff'], 'circle-stroke-width': ['case', ['get', 'sel'], 3.5, ['get', 'rvReq'], 4, 1.6], 'circle-opacity': ['case', ['any', ['get', 'wait'], ['get', 'rvReq']], ['get', 'blink'], 1] } });
      GL.addLayer({ id: 'cases-t', type: 'symbol', source: 'cases', layout: { 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#111' } });
      GL.addLayer({ id: 'cases-l', type: 'symbol', source: 'cases', minzoom: 11, layout: { 'text-field': ['get', 'num'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.6], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
      const st = { type: 'FeatureCollection', features: D.stations.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name } })) };
      GL.getSource('stations').setData(st);
      GL.getSource('hosp').setData({ type: 'FeatureCollection', features: D.hospitals.map(h => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.lon, h.lat] }, properties: { name: h.short } })) });
      GL.getSource('heliport').setData({ type: 'FeatureCollection', features: [D.lzs.heliport, ...D.hospitals.filter(h => h.heliport)].map(h => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.lon, h.lat] }, properties: { name: h.name } })) });
      const pick = e => {
        const f = GL.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['cases', 'crews', 'crews-base'] });
        if (!f.length) return;
        const c = f.find(x => x.layer.id === 'cases');
        if (c) sel.c = c.properties.id; else sel.k = f[0].properties.id;
        syncSelectionToMain();
        render();
      };
      GL.on('click', pick);
      for (const l of ['cases', 'crews', 'crews-base']) { GL.on('mouseenter', l, () => GL.getCanvas().style.cursor = 'pointer'); GL.on('mouseleave', l, () => GL.getCanvas().style.cursor = ''); }
      glReady = true; glApplyLayers(); glUpdate(true);
      if (pendingMapFocus) {
        const target = pendingMapFocus; pendingMapFocus = null;
        applyMapFocus(target);
      }
    });
  } catch (err) { console.warn('MapLibre init failed', err); GL = null; document.getElementById('map').style.display = ''; }
}
function glApplyLayers() {
  if (!glReady) return;
  const vis = (ids, on) => ids.forEach(id => GL.getLayer(id) && GL.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
  vis(['stations', 'stations-l', 'stations-house'], layers.base); vis(['hosp', 'hosp-t', 'hosp-l', 'heliport', 'heliport-l'], layers.hosp);
  vis(['crews', 'crews-base', 'crews-t', 'crews-heli', 'crews-l', 'crews-base-l'], layers.crews); vis(['cases', 'cases-t', 'cases-l'], layers.cases);
}
function glRoute(kk, col) {
  const m = kk.mv; if (!m) return null;
  const p = sim.pos(kk), f = Math.max(0, Math.min(1, (sim.s.t - m.t0) / Math.max(1, m.t1 - m.t0)));
  const co = [[p.lon, p.lat]];
  if (m.path) { for (let i = 0; i < m.frac.length; i++) if (m.frac[i] > f) co.push([m.path[i * 2 + 1], m.path[i * 2]]); }
  else co.push([m.b[1], m.b[0]]);
  return co.length > 1 ? { type: 'Feature', geometry: { type: 'LineString', coordinates: co }, properties: { col } } : null;
}
function glUpdate(force) {
  if (!glReady) return;
  const now = performance.now(); if (!force && now - glLast < 250) return; glLast = now;
  const blink = Math.floor(now / 500) % 2 ? 1 : 0.45;
  const cases = [], crews = [], routes = [];
  for (const cs of sim.s.cases) {
    if (cs.status === 'closed' || cs.status === 'intake') continue;
    cases.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [cs.lon, cs.lat] }, properties: { id: cs.id, n: cs.n, lab: cs.mu ? 'MU' : String(cs.n), num: cs.num, sel: sel.c === cs.id, wait: cs.status === 'waiting', rvReq: !!(cs.rvReq && !cs.rvReq.cancelled && cs.rvReq.satT == null && !cs.docAssigned), blink } });
  }
  for (const k of sim.s.crews) {
    if (k.state === 'off' || k.type === 'LIB') continue;
    const p = sim.pos(k);
    crews.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: k.id, name: k.name, code: k.code, state: k.state, type: k.type, sel: sel.k === k.id } });
  }
  const c = sel.c && sim.caseOf(sel.c), k = sel.k && sim.crewOf(sel.k);
  const selectedCrews = new Set(c ? c.crews : []);
  for (const crew of sim.s.crews) if (crew.mv) {
    const col = selectedCrews.has(crew.id) ? '#2f7de1' : crew.id === sel.k ? '#d9372c' : crew.state === 'free' ? '#3b9b49' : crew.state === 'transport' ? '#e28a22' : '#bb3b32';
    const r = glRoute(crew, col); if (r) routes.push(r);
  }
  GL.getSource('cases').setData({ type: 'FeatureCollection', features: cases });
  GL.getSource('crews').setData({ type: 'FeatureCollection', features: crews });
  GL.getSource('routes').setData({ type: 'FeatureCollection', features: routes });
}
function glCaseAt(x, y) {
  if (!glReady) return null;
  const r = GL.getCanvas().getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const px = x - r.left, py = y - r.top;
  const f = GL.queryRenderedFeatures([[px - 10, py - 10], [px + 10, py + 10]], { layers: ['cases'] });
  return f.length ? f[0].properties.id : null;
}

function renderMap() { if (GL) { glUpdate(); return; } renderMapSvg(); }
function renderMapSvg() {
  const svg = $('map');
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const sc = Math.max(0.3, vb.w / 1000), zoomed = vb.w < 420;
  svg.dataset.z = vb.w > 700 ? 0 : vb.w > 300 ? 1 : 2;
  const inV = (x, y) => x > vb.x - 20 && x < vb.x + vb.w + 20 && y > vb.y - 20 && y < vb.y + vb.h + 20;
  let h = '';
  if (vb.w > 450) { for (const n of BASEMAP.okresNames) h += `<text x="${n[1]}" y="${n[2]}" text-anchor="middle" font-size="${14 * sc}" letter-spacing="${3 * sc}" fill="#8b9885" opacity=".8" font-weight="600">${esc(n[0]).toUpperCase()}</text>`; }
  else for (const n of BASEMAP.orpNames) if (inV(n[1], n[2])) h += `<text x="${n[1]}" y="${n[2]}" text-anchor="middle" font-size="${10 * sc}" letter-spacing="${1.5 * sc}" fill="#8b9885" opacity=".85" font-weight="600">${esc(n[0]).toUpperCase()}</text>`;
  const shield = (r, stroke, fs) => { const w = (r[0].length * 4.3 + 5) * fs; return `<g><rect x="${r[1] - w / 2}" y="${r[2] - 4.5 * fs}" width="${w}" height="${9 * fs}" rx="${2 * fs}" fill="#fff" stroke="${stroke}" stroke-width="${1 * fs}"/><text x="${r[1]}" y="${r[2] + 3 * fs}" text-anchor="middle" font-size="${7.5 * fs}" font-weight="600" fill="#333">${esc(r[0])}</text></g>`; };
  if (vb.w <= 700) for (const r of BASEMAP.refs1) if (inV(r[1], r[2])) h += shield(r, /^D/.test(r[0]) ? '#d9732b' : '#c9902a', sc);
  if (vb.w <= 300) for (const r of BASEMAP.refs2) if (inV(r[1], r[2])) h += shield(r, '#9aa0a6', sc);
  if (vb.w <= 300) for (const s of BASEMAP.sidla) if (inV(s[1], s[2]) && !D.towns.some(t => t.n === s[0])) h += `<circle cx="${s[1]}" cy="${s[2]}" r="${1.8 * sc}" fill="#8a948a"/><text x="${s[1] + 4 * sc}" y="${s[2] - 3 * sc}" font-size="${8 * sc}" fill="#56635a" stroke="#f1f4ec" stroke-width="${2.5 * sc}" paint-order="stroke">${esc(s[0])}</text>`;
  for (const tw of D.towns) if (tw.w >= 7 || zoomed) h += `<circle cx="${X(tw.lon)}" cy="${Y(tw.lat)}" r="${(tw.w >= 20 ? 3 : 2) * sc}" fill="#8a948a"/><text x="${X(tw.lon) + 4 * sc}" y="${Y(tw.lat) - 3 * sc}" font-size="${(tw.w >= 20 ? 11 : 9) * sc}" fill="#56635a" stroke="#f1f4ec" stroke-width="${2.5 * sc}" paint-order="stroke">${esc(tw.n)}</text>`;
  if (layers.base) for (const st of D.stations) {
    const x = X(st.lon), y = Y(st.lat), z = sc;
    h += `<circle cx="${x}" cy="${y}" r="${5.5 * z}" fill="#fffdf4" stroke="#263b4a" stroke-width="${1.3 * z}"/><path d="M${x - 3.8 * z} ${y - .2 * z}L${x} ${y - 3.5 * z}L${x + 3.8 * z} ${y - .2 * z}V${y + 3.3 * z}H${x - 3.8 * z}Z" fill="#fffdf4" stroke="#263b4a" stroke-width="${1.1 * z}" stroke-linejoin="round"/><path d="M${x - 3.8 * z} ${y - .2 * z}L${x} ${y - 3.5 * z}L${x + 3.8 * z} ${y - .2 * z}" fill="none" stroke="#d9342b" stroke-width="${1.4 * z}" stroke-linecap="round" stroke-linejoin="round"/><rect x="${x - .8 * z}" y="${y + 1 * z}" width="${1.6 * z}" height="${2.3 * z}" fill="#b8c8d3" stroke="#263b4a" stroke-width="${.5 * z}"/>` + (zoomed || ['cb', 'ta', 'jh', 'st', 'pi', 'pt', 'ck'].includes(st.id) ? `<text x="${x + 7 * sc}" y="${y + 3 * sc}" font-size="${10 * sc}" fill="#33475a">${esc(st.short)}</text>` : '');
  }
  if (layers.hosp) for (const hp of D.hospitals) { const x = X(hp.lon), y = Y(hp.lat), r = 5.5 * sc; h += `<g><rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="#fff" stroke="#c0281f" stroke-width="${1.5 * sc}"/><path d="M${x - r * .6} ${y}h${r * 1.2}M${x} ${y - r * .6}v${r * 1.2}" stroke="#c0281f" stroke-width="${2 * sc}"/></g>` + (zoomed ? `<text x="${x + 8 * sc}" y="${y - 6 * sc}" font-size="${9 * sc}" fill="#8a1c14">${esc(hp.short)}</text>` : ''); }
  if (layers.hosp) { for (const hp of [D.lzs.heliport, ...D.hospitals.filter(h => h.heliport)]) { const x = X(hp.lon), y = Y(hp.lat), r = 5.5 * sc; h += `<circle cx="${x}" cy="${y}" r="${r}" fill="#f4cf46" stroke="#263746" stroke-width="${1.5 * sc}"/><text x="${x}" y="${y + 3 * sc}" text-anchor="middle" font-size="${8 * sc}" font-weight="700" fill="#263746">H</text>` + (zoomed ? `<text x="${x + 8 * sc}" y="${y - 6 * sc}" font-size="${9 * sc}" fill="#263746">${hp.id === 'h-fnkv' ? 'LKPY' : 'LKCC'}</text>` : ''); } }
  const routeOf = (kk, col, w) => {
    const m = kk.mv, cs0 = kk.caseId && sim.caseOf(kk.caseId), p = sim.pos(kk);
    if (m && m.path && m.path.length > 3) {
      const f = clampF((sim.s.t - m.t0) / Math.max(1, m.t1 - m.t0)); let pts = `${X(p.lon).toFixed(1)},${Y(p.lat).toFixed(1)} `;
      for (let i = 0; i < m.frac.length; i++) if (m.frac[i] > f) pts += `${X(m.path[i * 2 + 1]).toFixed(1)},${Y(m.path[i * 2]).toFixed(1)} `;
      return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".9"/>`;
    }
    if (cs0 && (kk.state === 'call' || kk.state === 'enroute')) return `<line x1="${X(p.lon)}" y1="${Y(p.lat)}" x2="${X(cs0.lon)}" y2="${Y(cs0.lat)}" stroke="${col}" stroke-width="${w}" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>`;
    return '';
  };
  const k = sel.k && sim.crewOf(sel.k), c = sel.c && sim.caseOf(sel.c);
  const selectedCrews = new Set(c ? c.crews : []);
  for (const crew of sim.s.crews) if (crew.mv) {
    const col = selectedCrews.has(crew.id) ? '#2f7de1' : crew.id === sel.k ? '#d9372c' : crew.state === 'free' ? '#3b9b49' : crew.state === 'transport' ? '#e28a22' : '#bb3b32';
    h += routeOf(crew, col, crew.id === sel.k || selectedCrews.has(crew.id) ? 3.5 : 2.2);
  }
  if (layers.cases) for (const cs of sim.s.cases) {
    if (cs.status === 'closed' || cs.status === 'intake') continue;
    const x = X(cs.lon), y = Y(cs.lat), col = cs.n === 1 ? '#d9342b' : cs.n === 2 ? '#ee8a1b' : cs.n === 4 ? '#7892a6' : '#e8c02a', r = 8 * sc;
    const rvPending = cs.rvReq && !cs.rvReq.cancelled && cs.rvReq.satT == null && !cs.docAssigned;
    h += `<g class="mk ${cs.status === 'waiting' || rvPending ? 'pulse' : ''}" data-case="${cs.id}">${rvPending ? `<circle cx="${x}" cy="${y}" r="${r + 8 * sc}" fill="none" stroke="#d9342b" stroke-width="${3 * sc}"/>` : ''}${sel.c === cs.id ? `<circle cx="${x}" cy="${y}" r="${r + 5 * sc}" fill="none" stroke="#111" stroke-width="${2 * sc}"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${rvPending ? '#d9342b' : '#111'}" stroke-width="${rvPending ? 3 * sc : 1.2 * sc}"/><text x="${x}" y="${y + 3.5 * sc}" text-anchor="middle" font-size="${10 * sc}" font-weight="700" fill="#111">${cs.mu ? 'MU' : cs.n}</text></g>`;
  }
  if (layers.crews) for (const kk of sim.s.crews) {
    if (kk.state === 'off') continue;
    const p = sim.pos(kk), x = X(p.lon), y = Y(p.lat), r = 4.5 * sc, isSel = sel.k === kk.id;
    if ((kk.state === 'base' || kk.state === 'second') && !isSel && !zoomed) continue;
    h += `<g class="mk" data-crew="${kk.id}"><circle cx="${x}" cy="${y}" r="${isSel ? r * 1.7 : r}" fill="${COL[kk.state]}" stroke="${isSel ? '#ffd23f' : '#111'}" stroke-width="${(isSel ? 2.5 : 1.2) * sc}"/>${kk.type === 'LZS' ? `<path d="M${x - 3.5 * sc} ${y}h5a2.4 2.4 0 0 1 2.4 2.4v.5h-5a2.4 2.4 0 0 1-2.4-2.4V${y}m5 0 1.8-2.8h1l-1.1 2.8m-4 2.4v1.5m-2 0h4m.5-3.8h5" fill="${kk.state === 'base' || kk.state === 'free' ? '#d9342b' : '#fff'}" stroke="#202a31" stroke-width="${.55 * sc}" stroke-linecap="round"/>` : kk.type === 'RV' ? `<text x="${x}" y="${y + 2.8 * sc}" text-anchor="middle" font-size="${7 * sc}" font-weight="700" fill="${kk.state === 'base' || kk.state === 'free' ? '#111' : '#fff'}">L</text>` : ''}</g>`;
    if (isSel || zoomed) h += `<text x="${x + 7 * sc}" y="${y - 5 * sc}" font-size="${9 * sc}" fill="#111" stroke="#fff" stroke-width="${2.5 * sc}" paint-order="stroke">${esc(kk.name)}</text>`;
  }
  setHTML($('dyn'), h);
}
function svgPt(svg, ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
function zoom(f, cx, cy) {
  const nw = Math.min(1100, Math.max(60, vb.w * f)), r = nw / vb.w;
  cx = cx == null ? vb.x + vb.w / 2 : cx; cy = cy == null ? vb.y + vb.h / 2 : cy;
  vb = { x: cx - (cx - vb.x) * r, y: cy - (cy - vb.y) * r, w: nw, h: vb.h * r };
}
function focusOn(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (!satellitePanel && mainPanelHidden.map && panelWindows.map && !panelWindows.map.closed) {
    if (panelChannel) panelChannel.postMessage({ type: 'focus-map', lat, lon });
    return;
  }
  if (!satellitePanel && mainPanelHidden.map) { mainPanelHidden.map = false; saveMainPanelLayout(); applyMainPanelLayout(); }
  view = 'map';
  if (!satellitePanel) render();
  const fly = () => {
    if (GL) applyMapFocus({ lat, lon });
    else if ($('map').style.display !== 'none') {
      vb = { x: X(lon) - 90, y: Y(lat) - 90 * vb.h / vb.w, w: 180, h: 180 * vb.h / vb.w };
      renderMapSvg();
    } else pendingMapFocus = { lat, lon };
  };
  requestAnimationFrame(() => requestAnimationFrame(fly));
}
function selectCaseFromElement(caseElement, clickedElement) {
  sel.c = caseElement.dataset.case; syncSelectionToMain();
  const cs = sim.caseOf(sel.c); if (!cs) return;
  const alert = clickedElement.closest('.report-alert');
  sim.acknowledge112(cs.id, alert ? alert.dataset.report : undefined);
  const openDetail = !!(clickedElement.closest('.live-alert') || clickedElement.closest('#log'));
  view = openDetail ? 'detail' : 'map'; render();
  focusOn(cs.lat, cs.lon);
  if (openDetail) { view = 'detail'; render(); }
}

// ---------- rádio ----------
function renderRadio() {
  const active = sim.s.crews.filter(k => k.hospitalRun && ['transport', 'handover', 'return'].includes(k.hospitalRun.phase) && (k.type === 'RZP' || k.type === 'RV'));
  active.sort((a, b) => a.hospitalRun.availableAt - b.hospitalRun.availableAt);
  setHTML($('transport-board'), active.length ? active.map(k => {
    const run = k.hospitalRun, remaining = Math.max(0, run.availableAt - sim.s.t);
    const phase = run.phase === 'transport' ? 'Na cestě do nemocnice' : run.phase === 'handover' ? 'Předání pacienta' : 'Návrat na základnu';
    const detail = run.phase === 'transport' ? `Příjem za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : run.phase === 'handover' ? `Konec předání za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : 'Po předání';
    const availability = run.phase === 'transport' ? `Volná přibližně za ${Math.ceil(remaining / 60)} min` : `Volná za ${Math.ceil(remaining / 60)} min`;
    return `<div class="transport-row ${run.phase}"><b>${esc(k.name)}</b><span>${esc(run.hospitalName)}</span><span>${phase} · ${detail}</span><span class="transport-time">${availability}</span></div>`;
  }).join('') : '<div class="transport-empty">Žádná posádka právě nejede do nemocnice ani se nevrací po předání.</div>');
  const L = sim.s.log, out = [];
  for (let i = L.length - 1; i >= 0 && out.length < 90; i--) { const e = L[i], kind = e.kind === 'deadline' ? 'alert' : e.kind, vj = isVstricnaRadioMessage(e.txt); out.push(`<div class="k-${kind}${vj ? ' k-vstricna' : ''} ${e.cid ? 'click' : ''}" ${e.cid ? `data-case="${e.cid}"` : ''}><time>${e.clock}</time><span>${esc(e.txt)}</span></div>`); }
  setHTML($('log'), out.join(''));
}

// ---------- upozornění ----------
function toast(txt, kind) {
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = txt;
  $('toasts').appendChild(t); setTimeout(() => t.remove(), 6500);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}
function beep(f, delay = 0, length = 0.12) {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; g.gain.value = 0.05; o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + delay); o.stop(audio.currentTime + delay + length); } catch (e) {}
}
function newCallTone() { beep(620, 0, 0.16); beep(790, 0.2, 0.16); beep(1040, 0.4, 0.24); }
function alarmBeep() { beep(1040); setTimeout(() => beep(780), 170); setTimeout(() => beep(1040), 340); }
function vstricnaTone() { beep(740, 0, 0.12); beep(988, 0.15, 0.12); beep(1318, 0.3, 0.2); }
function pollLog() {
  let vstricnaIncoming = false;
  for (const e of sim.s.log) {
    if (e.id <= seenLog) continue;
    seenLog = e.id;
    if (isVstricnaRadioMessage(e.txt)) {
      vstricnaIncoming = true;
      if (e.kind === 'alert' || e.kind === 'req' || e.kind === 'deadline' || e.kind === 'warn') toast(e.txt, 'alert');
      continue;
    }
    const newCall = e.kind === 'case' && e.txt.startsWith('Nový případ ');
    if (newCall) { toast(e.txt, /: N1\b/.test(e.txt) ? 'alert' : ''); newCallTone(); }
    else if (e.kind === 'req' || e.kind === 'alert' || e.kind === 'deadline' || e.kind === 'warn' || (e.kind === 'case' && /: N1/.test(e.txt))) { toast(e.txt, e.kind === 'case' || e.kind === 'deadline' || e.kind === 'req' ? 'alert' : e.kind); if (e.kind === 'deadline') alarmBeep(); else beep(e.kind === 'req' ? 660 : 880); }
  }
  if (vstricnaIncoming) vstricnaTone();
}

// ---------- modal ----------
function modal(html) { $('modal').innerHTML = html; $('modal').classList.add('on'); modalOpen = true; }
function closeModal() { $('modal').classList.remove('on'); modalOpen = false; lastT = performance.now(); }
function startModal() {
  let saved = null; try { saved = localStorage.getItem(SAVE_KEY); } catch (e) {}
  let stored = {}; try { stored = JSON.parse(localStorage.getItem(OPT_KEY) || '{}') || {}; } catch (_) {}
  const o = window._opt = Object.assign({ mode: 'shift', hour: 7, diff: 1, secondaryEnabled: 'true', startState: 'clean', muEnabled: 'true', muProbability: 10 }, stored, window._opt || {});
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
<b>Režim</b><div class="opts">${b('mode', 'shift', 'Směna 12 h (se skórem)')}${b('mode', 'free', 'Volný režim')}</div>
<b>Směna</b><div class="opts">${b('hour', 7, 'Denní 7–19')}${b('hour', 19, 'Noční 19–7')}</div>
${o.mode === 'shift' ? `<b>Počáteční stav kraje</b><div class="opts">${b('startState', 'clean', 'Načisto · 0 výjezdů')}${b('startState', 'running', 'Rozjetý kraj · rozpracované události')}</div>` : ''}
<b>Vytížení</b><div class="opts">${b('diff', 0.8, 'Klidné')}${b('diff', 1, 'Běžné')}${b('diff', 1.4, 'Nálož')}</div>
<b>Sekundární převozy</b><div class="opts">${b('secondaryEnabled', 'true', 'Zapnuté')}${b('secondaryEnabled', 'false', 'Vypnuté')}</div>
<b>Mimořádná událost (MU)</b><div class="opts">${b('muEnabled', 'true', 'Povoleno')}${b('muEnabled', 'false', 'Vypnuto')}</div>
<label style="display:block;margin:8px 0 2px">Pravděpodobnost MU během směny: <b id="mu-prob-value">${Number(o.muProbability)} %</b></label><input id="mu-probability" type="range" min="0" max="100" step="5" value="${Number(o.muProbability)}" style="width:min(380px,90%)" ${o.muEnabled === 'false' ? 'disabled' : ''}>
${liberoHtml}
<p style="font-size:12px">Tip: čekající případy jsou v seznamu vlevo. Klikni na případ, otevři „Navrhnout posádku“ a vyšli nejbližší. N1 vždy s lékařem (RV). N3 jede RZP, lékař jen na vyžádání posádky. Doporučené rychlosti 5× až 30×.</p>
<p style="font-size:12px;color:#5a6a7a">Stav: ${assetsState}</p>${appInstallHtml()}<button class="btn pri" data-act="start" style="font-size:15px;padding:7px 18px">Začít směnu</button>${saved ? ' <button class="btn" data-act="resume">Pokračovat v uložené</button>' : ''}</div>`);
}
function endModal() {
  const sm = sim.summary(), s = sim.s;
  const worst = s.cases.filter(c => c.status === 'closed' && c.score).sort((a, b) => a.score.total - b.score.total).slice(0, 5);
  const why = c => { const sc = c.score, L = [['pozdní vyslání', 20 - sc.delay], ['dlouhý příjezd', 50 - sc.arrive], ['lékař', 15 - sc.rv], ['volba posádky', 15 - sc.eff], ['přesměrování', sc.pen]].sort((a, b) => b[1] - a[1]); return c.unserved ? 'neobslouženo' : L[0][0]; };
  const rank = sm.total >= 92 ? 'Dispečer na jedničku' : sm.total >= 80 ? 'Spolehlivý dispečer' : sm.total >= 65 ? 'Slušný praktikant' : sm.total >= 45 ? 'Ještě potrénuj' : 'Katastrofa na lince';
  const m = (l, v) => `<tr><td style="padding:2px 14px 2px 0;color:#5a6a7a">${l}</td><td><b>${v}</b></td></tr>`;
  modal(`<div class="card"><h1>Vyhodnocení</h1><div class="big">${sm.total.toFixed(1)} <span style="font-size:15px;font-family:var(--sans)">/ 100 · ${rank}</span></div>
<div class="bar"><i style="width:${Math.min(100, sm.total)}%"></i></div>
<table style="margin:10px 0;width:auto">${m('Průměrné hodnocení případů', sm.caseAvg.toFixed(1))}${m('Pokrytí území', sm.coverage.toFixed(0) + ' %')}${m('Případů celkem', sm.cases)}${m('Neobslouženo', sm.unserved)}${m('N1 průměrně k pacientovi', sm.avgN1 == null ? '–' : (sm.avgN1 / 60).toFixed(1) + ' min')}${m('Příjezd do 20 min od vyslání', sm.legalPct == null ? '–' : sm.legalPct.toFixed(0) + ' %')}${m('Přesměrování posádek', sm.diversions)}${m('Dokončené sekundární převozy', sm.secondaryCompleted)}${m('Sekundární převozy v toleranci ±15 min', sm.secondaryOnTime)}${m('Průměr bodů za sekundární převoz', sm.secondaryAvg == null ? '–' : sm.secondaryAvg.toFixed(0) + ' / 100')}</table>
${sm.opsPoints || sm.opsLog.length ? `<p>Provozní body: <b>${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints}</b> · základní skóre ${sm.baseTotal.toFixed(1)}</p>${sm.opsLog.length ? `<details><summary>Průběh bodování</summary><ul>${sm.opsLog.slice(-8).reverse().map(x => `<li>${x.delta > 0 ? '+' : ''}${x.delta} b. · ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}` : ''}
${worst.length ? '<b>Nejhorší případy</b><table style="margin-top:4px">' + worst.map(c => `<tr><td style="padding:2px 10px 2px 0">${c.num} N${c.nOrig}</td><td style="padding-right:10px">${esc(c.klasif)}</td><td><b>${Math.round(c.score.total)}</b> · ${why(c)}</td></tr>`).join('') + '</table>' : ''}
<p style="margin-top:12px"><button class="btn pri" data-act="again">Nová směna</button></p></div>`);
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
function newGame() {
  const o = window._opt;
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
  sim = new Sim({ mode: o.mode, startHour: Number(o.hour), diff: Number(o.diff), secondaryEnabled: o.secondaryEnabled !== 'false', muEnabled: o.muEnabled !== 'false', muProbability: Number(o.muProbability), startState: o.startState, libero: o.libero, seed: (Math.random() * 1e9) | 0 });
  afterLoad(); speed = 5; savedSpeed = 5;
  closeModal(); toast(o.mode === 'shift' && o.startState === 'running' ? 'Směna začala s rozpracovanými událostmi; jedna posádka už je na cestě.' : 'Směna začala. Čekající případy jsou vlevo.', '');
}
function afterLoad() { sel = { c: null, k: null }; seenLog = sim.s.logId; tabCase = 'waiting'; caseSearch = ''; $('case-search').value = ''; vb = { x: 30, y: 30, w: 970, h: 940 }; renderToolsOnce(); render(); }
function doSave() { try { localStorage.setItem(SAVE_KEY, sim.serialize()); } catch (e) {} }
function resume() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} try { sim = Sim.restore(localStorage.getItem(SAVE_KEY)); afterLoad(); speed = 5; closeModal(); } catch (e) { startModal(); } }
function render() {
  if (!sim) return;
  renderTop(); renderCases(); renderDetail(); renderCrews(); renderMap(); renderRadio();
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
function applyMainPanelLayout() {
  const main = document.querySelector('main');
  const enabled = !satellitePanel && matchMedia('(min-width: 1100px)').matches;
  main.dataset.hideMap = enabled && mainPanelHidden.map ? '1' : '0';
  main.dataset.hideRadio = enabled && mainPanelHidden.radio ? '1' : '0';
}
function toggleMainPanel(panel) {
  mainPanelHidden[panel] = !mainPanelHidden[panel];
  saveMainPanelLayout(); applyMainPanelLayout();
}
applyMainPanelLayout();
window.addEventListener('resize', applyMainPanelLayout);
function toggleMapFullscreen() {
  const mapWin = $('w-map');
  if (document.fullscreenElement === mapWin || document.body.classList.contains('map-fullscreen')) {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    document.body.classList.remove('map-fullscreen');
    $('map-full-btn').textContent = '⛶ Celá obrazovka';
  } else if (mapWin.requestFullscreen) {
    mapWin.requestFullscreen().catch(() => { document.body.classList.add('map-fullscreen'); $('map-full-btn').textContent = 'Zmenšit'; });
  } else {
    document.body.classList.add('map-fullscreen');
    $('map-full-btn').textContent = 'Zmenšit';
  }
  setTimeout(() => { if (GL) GL.resize(); }, 80);
}
document.addEventListener('fullscreenchange', () => {
  $('map-full-btn').textContent = document.fullscreenElement === $('w-map') ? 'Zmenšit' : '⛶ Celá obrazovka';
  setTimeout(() => { if (GL) GL.resize(); }, 80);
});
// Odpojené okno (satelitní panel) posílá výběr do hlavního okna; hlavní okno výběr rozesílá samo stavem.
function syncSelectionToMain() {
  if (satellitePanel && panelChannel) {
    try { panelChannel.postMessage({ type: 'select', caseId: sel.c || null, crewId: sel.k || null }); } catch (err) { console.warn('panel select', err); }
  }
}
if (panelChannel) panelChannel.onmessage = ev => {
  const m = ev.data || {};
  if (satellitePanel === 'map' && m.type === 'focus-map') {
    focusOn(m.lat, m.lon);
  } else if (satellitePanel && m.type === 'state' && m.state) {
    try {
      sim = Sim.restore(m.state); speed = 0;
      sel = m.selection || { c: null, k: null };
      if (TILEIDX && !GL) glInit();
      render();
    } catch (err) { console.warn('panel sync', err); }
  } else if (!satellitePanel && m.type === 'select') {
    if (m.caseId) sel.c = m.caseId;
    if (m.crewId) sel.k = m.crewId;
    render();
  }
};
function frame() {
  const now = performance.now(); let dt = Math.min(1, (now - lastT) / 1000); lastT = now;
  if (!sim) return;
  if (!satellitePanel) for (const panel of ['map', 'radio']) {
    if (mainPanelHidden[panel] && panelWindows[panel] && panelWindows[panel].closed) {
      panelWindows[panel] = null; mainPanelHidden[panel] = false;
      saveMainPanelLayout(); applyMainPanelLayout();
    }
  }
  if (!modalOpen && speed > 0 && !sim.s.ended) {
    sim.step(dt * speed);
    pollLog();
    if (sim.s.ended) { speed = 0; render(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} endModal(); return; }
    if (now - saveAt > 15000) { saveAt = now; doSave(); }
  }
  if (!satellitePanel && panelChannel && now - panelSyncAt > 400) {
    panelSyncAt = now;
    const state = sim.serialize();
    const selection = JSON.stringify(sel);
    if (state !== panelSnapshot || selection !== panelSelection) {
      panelSnapshot = state; panelSelection = selection;
      panelChannel.postMessage({ type: 'state', state, selection: sel });
    }
  }
  render();
}

// ---------- události ----------
function act(a, el) {
  const d = el.dataset;
  switch (a) {
    case 'dismiss-alert':
      alertHidden.add(d.key);
      if (d.case && d.report) sim.acknowledge112(d.case, d.report);
      break;
    case 'install-app': if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; if (!sim) startModal(); }); } break;
    case 'start': newGame(); break;
    case 'open-map': openPanelWindow('map'); break;
    case 'open-radio': openPanelWindow('radio'); break;
    case 'toggle-map-main': toggleMainPanel('map'); break;
    case 'toggle-radio-main': toggleMainPanel('radio'); break;
    case 'fullscreen-map': toggleMapFullscreen(); break;
    case 'resume': resume(); break;
    case 'again': try { localStorage.removeItem(SAVE_KEY); } catch (e) {} startModal(); break;
    case 'close': closeModal(); break;
    case 'sug': sugOpen = !sugOpen; break;
    case 'assign': { const r = sim.assign(d.case, d.crew, d.role || undefined); if (!r.ok) toast(r.msg, 'warn'); else { sel.c = d.case; beep(520); } break; }
    case 'reassign': { const r = sim.reassign(d.crew, d.case); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'cancel': { const r = sim.cancelAssignment(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Posádka odvolána.', ''); break; }
    case 'prealert': { const r = sim.prealert(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Předpoplach: ' + r.crews.join(', ') + '. Posádky nevyjíždějí.', 'alert'); break; }
    case 'n2-dynamic': { const r = sim.convertN2Dynamic(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Výzva změněna na dynamickou.', ''); break; }
    case 'lzs-consult': { const r = sim.consultLzsPilot(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Čeká se na textové rozhodnutí pilota LZS.', 'alert'); break; }
    case 'lzs-tech': { const r = sim.requestLzsTechnicalAssist(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Technická součinnost HZS vyžádána.', 'alert'); break; }
    case 'mu-role': { const r = sim.setMuDispatcher(d.role); if (!r.ok) toast(r.msg, 'warn'); else toast(d.role === 'mu' ? 'Přebíráš běžný provoz; kolega řeší MU.' : 'Přebíráš MU; kolega řeší běžný provoz.', ''); break; }
    case 'mu-request': { const r = sim.requestMuModule(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Požadavek na modul MU předán do dispečinku.', 'alert'); break; }
    case 'mu-hospitals': { const r = sim.requestMuHospitalInfo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Vyžádána informace o kapacitách nemocnic.', ''); break; }
    case 'mu-reinforce': { const r = sim.requestMuReinforcement(d.case, d.count); if (!r.ok) toast(r.msg, 'warn'); else { sugOpen = true; toast('Požadavek na posily předán; můžeš vybrat volné posádky RZP.', 'alert'); } break; }
    case 'mu-hospital': { const r = sim.chooseMuHospital(d.case, d.hospital); if (!r.ok) toast(r.msg, 'warn'); else toast('Další transporty budou směrovány podle zvolené nemocnice.', ''); break; }
    case 'mu-landing': { const r = sim.requestMuLandingInfo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Ověření plochy předáno, čeká se na odpověď z místa.', ''); break; }
    case 'lzs-support': { const r = sim.requestLzsSupport(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else { toast('Mezikrajská LZS je k dispozici. Zkontroluj ETA a potvrď vyslání.', ''); beep(660); } break; }
    case 'libero': { const r = sim.attachLibero(d.crew, d.lib || undefined); if (!r.ok) toast(r.msg, 'warn'); else toast(`${sim.crewOf(d.crew).name}: lékař LIBERO ve voze`, ''); break; }
    case 'assign-libero': {
      const a = sim.attachLibero(d.crew); if (!a.ok) { toast(a.msg, 'warn'); break; }
      const r = sim.assign(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else { sel.c = d.case; toast(`${sim.crewOf(d.crew).name} → ${sim.caseOf(d.case).num}`, ''); }
      break;
    }
    case 'resv': { const r = sim.activateReserve(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Záloha se aktivuje (cca 20 min).', ''); break; }
    case 'print': printModal(sim.crewOf(d.crew)); break;
    case 'focus': { const p = sim.pos(sim.crewOf(d.crew)); focusOn(p.lat, p.lon); break; }
    case 'zoomin': if (GL) GL.zoomIn(); else zoom(0.6); break;
    case 'zoomout': if (GL) GL.zoomOut(); else zoom(1.6); break;
    case 'zoomreset': if (GL) GL.fitBounds([[13.53, 48.55], [15.61, 49.63]], { padding: 10 }); else vb = { x: 30, y: 30, w: 970, h: 940 }; break;
  }
  render();
}

// přetahování dlaždic posádek na případ
let drag = null, suppressClick = false;
function dragStart() {
  if (!drag || drag.on) return; drag.on = true;
  const g = document.createElement('div'); g.id = 'ghost'; const k = sim.crewOf(drag.id);
  g.textContent = k ? k.name : ''; g.style.background = k ? COL[k.state] : '#fff'; g.style.color = k && (k.state === 'base' || k.state === 'free') ? '#111' : '#fff';
  document.body.appendChild(g); drag.ghost = g; moveGhost(drag.x, drag.y);
}
function moveGhost(x, y) { if (drag.ghost) { drag.ghost.style.left = x + 12 + 'px'; drag.ghost.style.top = y + 12 + 'px'; } }
function dropTarget(x, y) {
  const e = document.elementFromPoint(x, y);
  if (e && e.closest('[data-case]') && !e.closest('#modal')) return e.closest('[data-case]');
  const id = glCaseAt(x, y); return id ? { dataset: { case: id }, classList: { add() {}, remove() {} } } : null;
}
document.addEventListener('pointerdown', ev => {
  const t = ev.target.closest('.tile[data-crew], .chip[data-crew]');
  if (!t || ev.button > 0 || t.closest('#modal') || t.closest('#rtiles')) return;
  drag = { id: t.dataset.crew, x: ev.clientX, y: ev.clientY, on: false, touch: ev.pointerType === 'touch', ghost: null, timer: null };
  if (drag.touch) drag.timer = setTimeout(() => { if (drag) dragStart(); }, 280);
});
document.addEventListener('pointermove', ev => {
  if (!drag) return;
  const dist = Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y);
  if (!drag.on) {
    if (drag.touch) { if (dist > 10) { clearTimeout(drag.timer); drag = null; } return; }
    if (dist > 6) dragStart(); else return;
  }
  moveGhost(ev.clientX, ev.clientY);
  document.querySelectorAll('.drop').forEach(e => e.classList.remove('drop'));
  const tg = dropTarget(ev.clientX, ev.clientY); if (tg) tg.classList.add('drop');
});
document.addEventListener('touchmove', ev => { if (drag && drag.on) ev.preventDefault(); }, { passive: false });
function dragEnd(ev, cancel) {
  if (!drag) return;
  clearTimeout(drag.timer);
  const d = drag; drag = null;
  if (!d.on) return;
  document.querySelectorAll('.drop').forEach(e => e.classList.remove('drop'));
  if (d.ghost) d.ghost.remove();
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 80);
  if (cancel) return;
  const tg = dropTarget(ev.clientX, ev.clientY); if (!tg) return;
  const k = sim.crewOf(d.id), cs = sim.caseOf(tg.dataset.case); if (!k || !cs) return;
  sel.k = k.id; sel.c = cs.id;
  let r;
  if (cs.vstricna && cs.vstricna.state === 'offered') r = sim.assignVstricna(cs.id, k.id);
  else if (sim.avail(k)) r = sim.assign(cs.id, k.id);
  else if (k.state === 'call' || k.state === 'enroute') r = sim.reassign(k.id, cs.id);
  else r = { ok: false, msg: k.name + ' je zaneprázdněná (' + sim.phase(k) + ').' };
  if (!r.ok) toast(r.msg, 'warn'); else toast(`${k.name} → ${cs.num}${k.type === 'RZP' && cs.vstricna && cs.vstricna.state === 'dispatched' ? ' · vstřícná jízda' : ''}`, '');
  render();
}
document.addEventListener('pointerup', ev => dragEnd(ev, false));
document.addEventListener('pointercancel', ev => dragEnd(ev, true));
document.addEventListener('input', ev => {
  if (ev.target && ev.target.id === 'case-search') { caseSearch = ev.target.value; renderCases(); }
  if (ev.target && ev.target.id === 'lib-probability') { window._opt.libero.presence = Number(ev.target.value); saveOpts(); const out = $('lib-prob-value'); if (out) out.textContent = `${ev.target.value} %`; }
  if (ev.target && ev.target.id === 'mu-probability') { window._opt.muProbability = Number(ev.target.value); saveOpts(); const out = $('mu-prob-value'); if (out) out.textContent = `${ev.target.value} %`; }
});
document.addEventListener('click', ev => {
  if (suppressClick) { ev.preventDefault(); return; }
  const t = ev.target;
  const o = t.closest('[data-opt]'); if (o) { window._opt[o.dataset.opt] = o.dataset.val; startModal(); return; }
  const lm = t.closest('[data-libmode]'); if (lm) { window._opt.libero.modes[lm.dataset.libmode] = lm.dataset.val; window._libOpen = true; startModal(); return; }
  const ls = t.closest('[data-libset]'); if (ls) { const r = sim.setLiberoMode(ls.dataset.libset, ls.dataset.val); if (!r.ok) toast(r.msg, 'warn'); else { if (window._opt && window._opt.libero) { window._opt.libero.modes[ls.dataset.libset] = ls.dataset.val; saveOpts(); } render(); } return; }
  const sm = t.closest('summary'); if (sm && sm.parentElement && sm.parentElement.classList.contains('opt-details')) window._libOpen = !sm.parentElement.open;
  const a = t.closest('[data-act]'); if (a) { ev.preventDefault(); act(a.dataset.act, a); return; }
  const sp = t.closest('[data-speed]'); if (sp) { speed = Number(sp.dataset.speed); if (speed) savedSpeed = speed; render(); return; }
  const v = t.closest('[data-view]'); if (v) {
    view = v.dataset.view; render();
    if (GL) setTimeout(() => GL.resize(), 30);
    if (view === 'map' && pendingMapFocus) { const target = pendingMapFocus; pendingMapFocus = null; requestAnimationFrame(() => applyMapFocus(target)); }
    return;
  }
  const tc = t.closest('[data-tabcase]'); if (tc) { tabCase = tc.dataset.tabcase; render(); return; }
  const tr = t.closest('[data-tabradio]'); if (tr) { tabRadio = tr.dataset.tabradio; render(); return; }
  const ly = t.closest('[data-layer]'); if (ly) { layers[ly.dataset.layer] = !layers[ly.dataset.layer]; renderToolsOnce(); glApplyLayers(); render(); return; }
  const ho = t.closest('[data-hosp]'); if (ho) { toast('Avízo předáno: ' + D.hospitals.find(h => h.id === ho.dataset.hosp).name, ''); return; }
  if (t.closest('#map')) return;
  const ck = t.closest('[data-crew]'), cc = t.closest('[data-case]');
  if (ck && !t.closest('#modal')) {
    ev.preventDefault(); sel.k = ck.dataset.crew;
    syncSelectionToMain();
    if (ck.dataset.ptt) { const k = sim.crewOf(sel.k); toast(`${k.name}: spojení v pořádku, ${STLAB[k.state].toLowerCase()}.`, ''); }
    render(); return;
  }
  if (cc) {
    ev.preventDefault(); selectCaseFromElement(cc, t);
  }
});
$('btn-end').addEventListener('click', () => { if (sim) { sim.s.ended = true; speed = 0; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} endModal(); } });
// mapa: výběr a posun
(function () {
  const svg = $('map'), wrap = $('mapwrap'); let mapDrag = null;
  wrap.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (ev.target.closest('#maptools,.maplibregl-ctrl')) return;
    if (GL) return; // MapLibre potřebuje své vlastní mouse/touch události.
    if (!GL && svg.style.display === 'none') return;
    const m = !GL && ev.target.closest('[data-case],[data-crew]');
    mapDrag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, pid: ev.pointerId,
      mode: 'svg',
      hit: m ? { caseId: m.dataset.case || null, crewId: m.dataset.crew || null } : null, moved: false };
    try { wrap.setPointerCapture(ev.pointerId); } catch (_) {}
    ev.preventDefault();
  });
  const move = ev => {
    if (!mapDrag || mapDrag.pid !== ev.pointerId) return;
    const dx = ev.clientX - mapDrag.x, dy = ev.clientY - mapDrag.y;
    if (!mapDrag.moved && Math.hypot(dx, dy) > 4) mapDrag.moved = true;
    if (!mapDrag.moved) return;
    const r = svg.getBoundingClientRect(), kx = vb.w / r.width, ky = vb.h / r.height;
    vb.x = mapDrag.vx - dx * kx; vb.y = mapDrag.vy - dy * ky;
    renderMapSvg();
    ev.preventDefault();
  };
  const up = ev => {
    if (!mapDrag || mapDrag.pid !== ev.pointerId) return;
    const hit = mapDrag.hit, moved = mapDrag.moved; mapDrag = null;
    if (!moved && hit) {
      if (hit.caseId) sel.c = hit.caseId; else if (hit.crewId) sel.k = hit.crewId;
      syncSelectionToMain();
    }
    if (!moved) render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', () => { mapDrag = null; });
  svg.addEventListener('wheel', ev => { ev.preventDefault(); const p = svgPt(svg, ev); zoom(ev.deltaY > 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
})();
window.addEventListener('keydown', ev => { if (ev.key === ' ' && sim && !modalOpen) { ev.preventDefault(); speed = speed ? 0 : savedSpeed; } });
window.__zos = { get sim() { return sim; }, step: s => sim && sim.step(s) }; Object.defineProperty(window, '__zosMap', { get: () => GL });
setInterval(frame, 100);
// ---------- aplikace (PWA): instalace, offline provoz a aktualizace při spuštění ----------
let installPrompt = null, swWaiting = null;
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function appInstallHtml() {
  if (isStandalone() || location.protocol === 'file:') return '';
  if (installPrompt) return '<p style="margin:6px 0"><button class="btn" data-act="install-app">⬇ Nainstalovat jako aplikaci</button> <span style="font-size:12px;color:#5a6a7a">ikona v Docku / nabídce Start, funguje offline a sama se aktualizuje</span></p>';
  const ua = navigator.userAgent || '';
  const hint = /iPhone|iPad/.test(ua) ? 'Sdílet → Přidat na plochu' : /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua) ? 'v Safari: Soubor → Přidat do Docku' : 'ikonou instalace v adresním řádku prohlížeče';
  return `<p style="font-size:12px;color:#5a6a7a;margin:6px 0">Tip: hru lze nainstalovat jako aplikaci (${hint}).</p>`;
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (!sim && modalOpen) startModal(); });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('Aplikace nainstalována. Příště ji spustíš ikonou.', ''); });
function showUpdateBar(worker) {
  swWaiting = worker;
  fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => { $('update-text').textContent = `Je připravena nová verze v${v.version}. Rozehraná směna se uloží.`; }).catch(() => {});
  $('update-bar').classList.add('on');
}
$('update-btn').addEventListener('click', () => {
  if (!swWaiting) return;
  try { if (sim && !sim.s.ended) doSave(); } catch (e) {}
  swWaiting.postMessage('skipWaiting');
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const onWaiting = w => {
      if (!navigator.serviceWorker.controller) return;            // první instalace – není co aktualizovat
      if (!sim) w.postMessage('skipWaiting');                       // při spuštění (ještě se nehraje) → rovnou nová verze
      else showUpdateBar(w);                                        // během hry → nabídnout tlačítko
    };
    if (reg.waiting) onWaiting(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') onWaiting(w); }); });
    reg.update().catch(() => {});
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => console.warn('service worker', e));
}

// načtení dat: dlaždice, silniční síť, adresy
let assetsState = 'načítám mapová data…';
Promise.all([
  fetch('tiles-index.json').then(r => r.json()).then(j => { TILEIDX = j; if (!satellitePanel || sim) glInit(); }).catch(e => console.warn('tiles', e)),
  fetch('graph.wasm').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => ROUTER.init(b)).catch(e => console.warn('graph', e)),
  fetch('poi.json').then(r => r.json()).then(j => { window.ZOS_POI = j; }).catch(e => console.warn('poi', e)),
  fetch('addr.json').then(r => r.json()).then(j => { window.ZOS_ADDR = j; }).catch(e => console.warn('addr', e)),
]).then(() => { assetsState = ROUTER.ready ? 'mapa a silniční síť načteny' : 'mapová data se nenačetla, běží zjednodušená mapa'; if (!sim && !satellitePanel) startModal(); });
if (!satellitePanel) startModal();
})();
