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
// ---------- nastavení (vzhled, písmo, zvuk, hra) ----------
const SET_KEY = 'zos_jck_settings_v1';
const SET_DEF = { theme: 'auto', font: 1, sound: true, volume: 60, speed: 5, autoPauseN1: false, hints: false, voice: !(window.innerWidth < 760), voiceTempo: 0.75, voiceEngine: 'cloud', ttsUrl: '', covType: 'iso', covLimit: 20, radioInteractive: true, radioSlow: true };
let settings = Object.assign({}, SET_DEF);
try { settings = Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (_) {}
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (_) {} }
const isDark = () => settings.theme === 'dark' || (settings.theme === 'auto' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
function applyTheme() {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.setProperty('--fz', String(settings.font));
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0d131a' : '#18242f';
  applyMapTheme();
}
if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', () => { if (settings.theme === 'auto') applyTheme(); }); }
// tmavá mapa: barvy základní mapy se převedou (obrácená světlost), přepíná se bez znovunačtení stylu
function colorParts(c) {
  let m;
  if (typeof c !== 'string') return null;
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(c))) {
    let h = m[1]; if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  if ((m = /^rgba?\(([^)]+)\)$/i.exec(c))) { const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  return null;
}
function remapColor(c, mode) {
  const q = colorParts(c); if (!q) return c;
  const r = q.r / 255, g = q.g / 255, b = q.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, sat = 0, l = (mx + mn) / 2;
  if (d) { sat = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  l = mode === 'road' ? 0.24 + l * 0.2 : mode === 'casing' ? 0.07 : mode === 'text' ? 0.64 + (1 - l) * 0.3 : 0.09 + (1 - l) * 0.64;
  sat *= mode === 'text' ? 0.7 : 0.75;
  const f = (n) => { const k = (n + h * 12) % 12, a = sat * Math.min(l, 1 - l); return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); };
  return `rgba(${f(0)},${f(8)},${f(4)},${q.a.toFixed(2)})`;
}
function remapValue(v, mode) { return typeof v === 'string' ? remapColor(v, mode) : Array.isArray(v) ? v.map(x => remapValue(x, mode)) : v; }
function darkenStyle(st) {
  const out = Object.assign({}, st);
  out.layers = st.layers.map(L => {
    if (!L.paint) return L;
    const isRoad = L.type === 'line' && /^(road|rail|bridge|tunnel)/.test(L.id), casing = isRoad && /-case$/.test(L.id);
    const paint = {};
    for (const [k, v] of Object.entries(L.paint)) {
      const isCol = /color$/.test(k);
      paint[k] = isCol ? remapValue(v, casing ? 'casing' : isRoad && k === 'line-color' ? 'road' : /^text/.test(k) && k === 'text-color' ? 'text' : 'inv') : v;
    }
    return Object.assign({}, L, { paint });
  });
  return out;
}
let mapThemeApplied = null; const overlayLight = {};
function applyMapTheme() {
  if (!GL || !glReady) return;
  const dark = isDark(); if (mapThemeApplied === dark) return; mapThemeApplied = dark;
  const base = glStyle(), st = dark ? darkenStyle(base) : base;
  for (const L of st.layers) {
    if (!GL.getLayer(L.id)) continue;
    for (const [k, v] of Object.entries(L.paint || {})) { try { GL.setPaintProperty(L.id, k, v); } catch (_) {} }
  }
  for (const id of ['stations-l', 'hosp-l', 'heliport-l', 'crews-l', 'crews-base-l', 'cases-l']) {
    if (!GL.getLayer(id)) continue;
    const o = overlayLight[id] || (overlayLight[id] = { tc: GL.getPaintProperty(id, 'text-color'), hc: GL.getPaintProperty(id, 'text-halo-color') });
    GL.setPaintProperty(id, 'text-color', dark ? remapColor(o.tc, 'text') : o.tc);
    GL.setPaintProperty(id, 'text-halo-color', dark ? 'rgba(14,26,36,0.92)' : o.hc);
  }
}
const COL = { base: '#9aa5b1', free: '#3cb54a', call: '#2f7de1', enroute: '#d9372c', onscene: '#d9372c', transport: '#d9372c', handover: '#d9372c', off: '#8e5bd6', activating: '#b79af0', second: '#7b8794', attached: '#169c8f' };
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
let layers = { base: true, hosp: true, crews: true, cases: true, fr: true, cov: false };
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
const OKR = { 'České Budějovice': 'CB', 'Český Krumlov': 'CK', 'Jindřichův Hradec': 'JH', 'Prachatice': 'PT', 'Strakonice': 'ST', 'Písek': 'PI', 'Tábor': 'TA' };
const okrAbbr = c => OKR[c.okres] || OKR[okresOf(c)] || '';
function okresOf(c) {
  if (okresCache[c.id]) return okresCache[c.id];
  let best = null, bd = 1e9;
  for (const s of D.stations) { const d = (s.lat - c.lat) ** 2 + ((s.lon - c.lon) * 0.66) ** 2; if (d < bd) { bd = d; best = s; } }
  return okresCache[c.id] = D.oblasti.find(o => o.id === best.oblast).name;
}

// ---------- ikony ----------
const flip = (dir, w, body) => dir < 0 ? `<g transform="translate(${w},0) scale(-1,1)">${body}</g>` : body;
// sanitka (RZP): skříňový vůz, jede ve směru dir (1 = doprava, -1 = doleva)
function ambBody(fill) {
  return `<path d="M2 20V6.5C2 5.1 3.1 4 4.5 4H22v16z" fill="${fill}" stroke="#202a31" stroke-width="1.3" stroke-linejoin="round"/><path d="M22 8h6.2l5 5.6c.5.6.8 1.3.8 2.1V20H22z" fill="${fill}" stroke="#202a31" stroke-width="1.3" stroke-linejoin="round"/><path d="M24 9.8h3.6l3.4 4H24z" fill="#cfe9f7" stroke="#202a31" stroke-width=".7"/><path d="M2 14.2h20" stroke="#d9342b" stroke-width="2"/><path d="M11.2 6.2h2.6v2.4h2.4v2.6h-2.4v2.4h-2.6v-2.4H8.8V8.6h2.4z" fill="#d9342b"/><rect x="17" y="2" width="4.4" height="2.1" rx=".8" fill="#2f7de1" stroke="#202a31" stroke-width=".7"/><circle cx="9" cy="20.2" r="2.9" fill="#202a31"/><circle cx="9" cy="20.2" r="1.1" fill="#cfd6dc"/><circle cx="27.5" cy="20.2" r="2.9" fill="#202a31"/><circle cx="27.5" cy="20.2" r="1.1" fill="#cfd6dc"/>`;
}
// RV: osobní vůz lékaře s majákem a písmenem L
function rvBody(fill) {
  return `<path d="M2.5 19v-5l3.2-.9L10 7.6c.5-.7 1.3-1.1 2.1-1.100h9.800c.9 0 1.7.4 2.2 1.100l4.3 5.5 3.6.9c.9.2 1.5 1 1.5 1.900V19z" fill="${fill}" stroke="#202a31" stroke-width="1.3" stroke-linejoin="round"/><path d="M11.6 8.300h4.700v4.500H8.300zM18.1 8.300h3.900l3.5 4.500h-7.400z" fill="#cfe9f7" stroke="#202a31" stroke-width=".7"/><rect x="14.5" y="3.7" width="5" height="2.3" rx=".9" fill="#2f7de1" stroke="#202a31" stroke-width=".7"/><path d="M3 15.800h30" stroke="#f2c200" stroke-width="1.9"/><circle cx="10" cy="19.2" r="2.9" fill="#202a31"/><circle cx="10" cy="19.2" r="1.1" fill="#cfd6dc"/><circle cx="26.5" cy="19.2" r="2.9" fill="#202a31"/><circle cx="26.5" cy="19.2" r="1.1" fill="#cfd6dc"/>`;
}
function car(dir, fill, type) {
  const rv = type === 'RV' || type === 'LIB';
  return `<svg class="ic ${rv ? 'ic-rv' : 'ic-amb'}" viewBox="0 0 36 24" aria-hidden="true">${flip(dir, 36, rv ? rvBody(fill) : ambBody(fill))}</svg>`;
}
const HELI_BODY = '<path d="M8 6h48" stroke="#202a31" stroke-width="2.2" stroke-linecap="round"/><path d="M32 6v5" stroke="#202a31" stroke-width="2.2"/><path d="M15 17 4.5 13.5 3 9.5" fill="none" stroke="#202a31" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 17 4.5 13.5 3 9.5" fill="none" stroke="#f5c400" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 11h13c9 0 15 4.5 16.5 11 .5 2.6-1.3 5-4 5H22c-6 0-9.5-3.5-9.5-8s3.5-8 9.5-8z" fill="#f5c400" stroke="#202a31" stroke-width="1.8" stroke-linejoin="round"/><path d="M37 13.200c5.5.3 9.5 3 11.3 7.300H37z" fill="#cfe9f7" stroke="#202a31" stroke-width="1"/><path d="M13.5 21.500h20" stroke="#d9342b" stroke-width="2.2"/><path d="M24.8 13.200h2.400v2.200h2.200v2.400h-2.200V20h-2.400v-2.200h-2.200v-2.400h2.200z" fill="#d9342b"/><path d="M24 27v4m18-4v4M17 32h31" fill="none" stroke="#202a31" stroke-width="2" stroke-linecap="round"/><circle cx="3" cy="9.5" r="3.6" fill="none" stroke="#202a31" stroke-width="1.2"/>';
function helicopter() {
  return `<svg class="ic heli-icon" viewBox="0 0 60 35" aria-hidden="true">${HELI_BODY}</svg>`;
}
function ico(state, type) {
  if (type === 'LZS') return helicopter();
  if (type === 'PCR') return `<svg class="ic" viewBox="0 0 36 24" aria-hidden="true"><path d="M18 3l11 4v6c0 5-4.5 8-11 9-6.5-1-11-4-11-9V7z" fill="#1d4f9c" stroke="#fff" stroke-width="1.2"/><text x="18" y="16" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">PČR</text></svg>`;
  if (type === 'HZS') return `<svg class="ic" viewBox="0 0 36 24" aria-hidden="true"><path d="M18 2c3 4 7 6 7 12a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3 1-5 1-8z" fill="#e2463b" stroke="#fff" stroke-width="1.1"/></svg>`;
  if (type === 'FR') return `<svg class="ic" viewBox="0 0 36 24" aria-hidden="true"><rect x="9" y="1.500" width="18" height="21" rx="3" fill="#1a9b4b" stroke="#fff" stroke-width="1.4"/><path d="M18 19.500C18 19.500 11.500 15.200 11.500 11 11.500 8.800 13.200 7.500 14.900 7.500 16.200 7.500 17.300 8.200 18 9.300 18.700 8.200 19.800 7.500 21.100 7.500 22.800 7.500 24.500 8.800 24.500 11 24.500 15.200 18 19.500 18 19.500Z" fill="#fff"/><path d="M18.800 8.800 15.800 12.400H17.700L17 16.200 20.400 11.800H18.400Z" fill="#1a9b4b"/></svg>`;
  if (type === 'COR') return `<svg class="ic" viewBox="0 0 36 24" aria-hidden="true"><circle cx="18" cy="12" r="9" fill="#fff" stroke="#202a31" stroke-width="1.3"/><path d="M18 6.500v11M13.5 10h9" stroke="#202a31" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  switch (state) {
    case 'call': return car(1, '#fff', type);
    case 'enroute': return car(1, '#e2463b', type);
    case 'transport': case 'handover': return car(-1, '#f0962e', type);
    case 'onscene': return `<svg class="ic heart-ecg" viewBox="0 0 32 24" aria-hidden="true"><path d="M16 21S3 13.5 3 7.8C3 2.3 10.1 1 16 7c5.9-6 13-4.7 13 0.8C29 13.5 16 21 16 21Z" fill="#d9342b" stroke="#8c1715" stroke-width="1.2"/><path d="M5 11h5l2.1-4.2 3.2 9 2.3-5H20l1.3-2.4 1.3 2.6H27" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case 'free': return car(-1, '#bff0c6', type);
    case 'base': return car(1, '#fff', type);
    case 'second': return car(1, '#d6dde3', type);
    default: return car(1, '#eee5ff', type);
  }
}
const STLAB = { base: 'Na základně', free: 'Volný', call: 'Výzva', enroute: 'Výjezd', onscene: 'Na místě', transport: 'Transport', handover: 'U ZZ', off: 'Nepřihlášena', activating: 'Aktivace', second: 'Sekundár', attached: 'Ve voze RZP' };

// ---------- horní lišta ----------
function renderTop() {
  const s = sim.s, sm = sim.summary();
  $('clock').textContent = sim.clock();
  const effSpeed = radioSlowActive() ? Math.min(speed, 1) : speed;
  setHTML($('speeds'), SPEEDS.map(v => `<button data-speed="${v}" class="${v === effSpeed ? 'on' : ''}${v === speed && effSpeed !== speed ? ' set' : ''}" title="${v === speed && effSpeed !== speed ? 'Nastavená rychlost – během rádiové relace hra běží 1×' : ''}">${v === 0 ? '⏸' : v + '×'}</button>`).join(''));
  const waiting = s.cases.filter(c => c.status === 'waiting' || (c.status === 'active' && missingInitialDispatch(c).length)).length;
  const rem = Math.max(0, s.shiftLen - s.t);
  const left = s.mode === 'shift' ? ` · zbývá ${Math.floor(rem / 3600)}:${pad(Math.floor(rem % 3600 / 60))} h` : ' · volný režim';
  const wx = sim._lzsWeatherStatus(), wxText = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  const wo = sim.wxObs(), wl = sim.wxLzs();
  const wxHtml = wo ? (() => {
    const sk = ZOS_WX.sky(wo), kt = Math.round(wo.wind), kmh = Math.round(wo.wind * 1.852), src = s.weather.src === 'real' ? 'skutečné historické počasí' : 'simulované počasí (data nejsou k dispozici)';
    return `<span title="Datum hry">${esc(sim.dateInfo().label)}</span><span title="${esc(sk.txt + ' · ' + src + ' · dohlednost ' + Math.round(wo.vis) + ' m, základna oblačnosti ' + Math.round(wo.base) + ' ft')}">${sk.icon} <b>${wo.temp.toFixed(1).replace('.', ',')} °C</b>${s.weather.src === 'real' ? '' : ' <small>sim.</small>'}</span><span title="Vítr (odkud vane), nárazy ${Math.round(wo.gust)} kt">${ZOS_WX.dirArrow(wo.dir)} ${ZOS_WX.dirName(wo.dir)} <b>${kmh} km/h</b> · ${kt} kt</span>`;
  })() : '';
  setHTML($('kpi'), wxHtml + `<span>Skóre <b>${sm.total.toFixed(1)}</b> <small title="Průběžné body za správné a opomenuté úkony">(${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints} provozních b.)</small></span><span>Pokrytí <b>${sm.covNow == null ? '–' : Math.round(sm.covNow) + ' %'}</b></span><span class="${waiting ? 'warn' : ''}">Čekající <b>${waiting}</b></span><span title="${esc(wl && wl.why.length ? wl.why.join(', ') : 'bez omezení')}">LZS <b>${wxText}</b></span><span>${left.replace(/^ · /, '')}</span>`);
  if (!satellitePanel) {
    $('toggle-map-main').textContent = mainPanelHidden.map ? 'Zobrazit mapu zde' : 'Skrýt mapu zde';
    $('toggle-radio-main').textContent = mainPanelHidden.radio ? 'Zobrazit přehled zde' : 'Skrýt přehled zde';
  }
  $('btn-end').style.display = s.mode === 'free' ? '' : 'none';
  const nb = $('nav'); setHTML(nb, [['cases', 'Případy'], ['detail', 'Případ'], ['crews', 'Posádky'], ['map', 'Mapa'], ['radio', 'Transporty']].map(([k, l]) =>
    `<button data-view="${k}" class="${view === k ? 'on' : ''}">${l}${k === 'cases' && waiting ? `<span class="badge">${waiting}</span>` : ''}</button>`).join(''));
  document.querySelectorAll('.win').forEach(w => w.classList.toggle('active', w.id === 'w-' + view));
  renderLiveAlerts();
  renderRadioLive();
  tutTick();
}
// Upozornění nahoře: hlášení 112 zmizí samo nejpozději po 40 s (reálného času) nebo po kliknutí na ✕.
// Zpráva zůstává v rádiovém logu a případ lze otevřít i odtud.
const ALERT_TTL_MS = 40000, alertSeen = new Map(), alertHidden = new Set();
function renderLiveAlerts() {
  const now = performance.now();
  const visible = key => { if (alertHidden.has(key)) return false; if (!alertSeen.has(key)) alertSeen.set(key, now); return now - alertSeen.get(key) < ALERT_TTL_MS; };
  const rvOnRadio = c => (sim.s.radioQ || []).some(e => e.caseId === c.id && e.kind === 'rv' && (e.state === 'calling' || e.state === 'open'));
  const requests = sim.s.cases.filter(c => c.status !== 'closed' && c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && !alertHidden.has('rv:' + c.id) && !rvOnRadio(c) && (c.rvAckAt == null || sim.s.t - c.rvAckAt > 60));
  const agencyReq = sim.s.cases.filter(c => c.status !== 'closed' && c.agencies).flatMap(c => ['pcr', 'hzs'].filter(k => c.agencies[k] && c.agencies[k].state === 'requested' && !c.agencies[k].fromCall && !alertHidden.has(`ag:${c.id}:${k}`)).map(k => ({ c, k })));
  const reports = sim.s.cases.flatMap(c => (c.radioReports || []).filter(r => r.received && !r.acknowledged && visible(c.id + ':' + r.id)).map(r => ({ c, r }))).slice(-4);
  const x = (key, extra) => `<span class="alert-x" role="button" aria-label="Zavřít upozornění" title="Zavřít" data-act="dismiss-alert" data-key="${esc(key)}"${extra || ''}>✕</span>`;
  const requestHtml = requests.map(c => {
    const crew = c.crews.map(id => sim.crewOf(id)).find(k => k && k.type === 'RZP');
    return `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ ${esc((c.rvReq.kind || 'zhoršení stavu').toLocaleUpperCase('cs-CZ'))} · ${esc(c.num)} · N${c.n}${crew ? ' · ' + esc(crew.name) : ''} · ${esc(c.klasif)} — klikni pro otevření</span>${x('rv:' + c.id)}</div>`;
  });
  const reportHtml = reports.map(({ c, r }) => `<div class="live-alert report-alert${r.red ? ' red' : ''}" role="button" tabindex="0" data-case="${c.id}" data-report="${esc(r.id)}"><span class="alert-txt">☎ ${esc(r.source || 'Linka 112')} · ${esc(c.num)}: ${esc(r.text)} — klikni pro otevření</span>${x(c.id + ':' + r.id, ` data-case="${c.id}" data-report="${esc(r.id)}"`)}</div>`);
  const corReq = sim.s.cases.filter(c => c.status !== 'closed' && c.coroner && c.coroner.state === 'available' && !alertHidden.has(`cor:${c.id}`));
  const corHtml = corReq.map(c => `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ KORONER K DISPOZICI · ${esc(c.num)} — klikni a přetáhni dlaždici KORONER na případ</span>${x(`cor:${c.id}`)}</div>`);
  const agencyHtml = agencyReq.map(({ c, k }) => `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ ${c.agencies[k].fromCall ? 'VÝZVA VYŽADUJE' : 'POSÁDKA ŽÁDÁ'} ${k === 'pcr' ? 'POLICII' : 'HASIČE'} · ${esc(c.num)} · ${esc(c.agencies[k].why || '')} — klikni a přetáhni dlaždici ${k === 'pcr' ? 'PČR' : 'HZS'} na případ</span>${x(`ag:${c.id}:${k}`)}</div>`);
  setHTML($('alerts-live'), requestHtml.concat(corHtml, agencyHtml, reportHtml).join(''));
}

// ---------- případy ----------
// rychlost posádky pro panel a štítek u vozu (LZS i v uzlech)
function crewSpeedText(k) {
  const v = sim.speedKmh(k);
  return k.type === 'LZS' ? `${v} km/h · ${Math.round(v / 1.852)} kt` : `${v} km/h`;
}
function chipHTML(k) {
  const col = COL[k.state], dark = k.state !== 'base' && k.state !== 'free';
  const ph = sim.phase(k);
  return `${k.dest ? `<span class="chip dest" data-crew="${k.id}" title="Cílové zařízení">${esc(k.dest.name)}</span>` : ''}<span class="chip" data-crew="${k.id}" style="background:${col};color:${dark ? '#fff' : '#111'}">${k.type === 'LZS' ? helicopter() : ''}${esc(k.name)} · ${esc(ph)}</span>`;
}
function lzsSupportHtml(c) {
  const own = sim.crewOf('lzs');
  if (sim.avail(own)) return '';
  const t = sim.s.t;
  const rows = D.lzsSupport.map(item => {
    const k = sim.crewOf(item.id), nightBlocked = item.dayOnly && !sim._isLzsDay();
    const asked = !!(k && k.nbAsk && k.nbAsk.state === 'asked' && k.nbAsk.caseId === c.id);
    const declined = !!(k && k.nbBusyUntil && t < k.nbBusyUntil), busy = !k || k.state !== 'off' || k.supportRequested;
    const eta = k ? sim.etaFor(k, c.lat, c.lon) : 0, stay = k ? Math.round((2 * heliSec(k.home.lat, k.home.lon, c.lat, c.lon) + 1200) / 60) : 0;
    const status = nightBlocked ? 'mimo denní službu' : asked ? 'čeká na odpověď…' : k && k.supportRequested ? (k.supportRequestedFor === c.id ? 'vyslána' : 'jinde') : declined ? 'odmítla' : item.foreign ? 'zahraniční' : 'k dispozici';
    const button = `<button class="btn${asked || busy || declined || nightBlocked ? '' : ' pri'}" data-act="lzs-support" data-case="${c.id}" data-crew="${item.id}" ${nightBlocked || asked || busy || declined ? 'disabled' : ''}>Požádat a vyslat</button>`;
    return `<div class="row"><span class="chip">${esc(item.name)}</span><span>${status}</span><span class="eta">ETA ${Math.round(eta / 60)} min · v kraji asi ${stay} min</span>${button}</div>`;
  }).join('');
  return `<div class="sug"><h4>Mezikrajská výpomoc LZS <small>(vlastní vrtulník je nedostupný; středisko odpoví za 1–3 min)</small></h4>${rows}</div>`;
}
const dzOf = c => (c.radioReports || []).find(r => r.id === 'dz-in');
// postupné plnění karty při nabírání na naší lince: adresa → indikace → příznaky po jednom → N, pacient, oznamovatel, poznámka
function intakeView(c) {
  const t = sim.s.t, t0 = c.dzUntil != null ? c.dzUntil : c.createdAt;
  const p = Math.max(0, Math.min(1, (t - t0) / Math.max(1, c.readyAt - t0)));
  const syms = symptomsOf(c).map(x => String(x).replace(/^[^0-9A-Za-zÀ-ž]+/, ''));
  const addr = p >= 0.12, klasif = p >= 0.35, nSyms = p < 0.45 ? 0 : Math.min(syms.length, Math.ceil(syms.length * Math.min(1, (p - 0.45) / 0.45)));
  const tail = p >= 0.92;
  const src = c.dzUntil != null ? `nabráno z: ${c.src}` : c.src;
  return { p, addr, klasif, syms: syms.slice(0, nSyms), tail, n1: c.n === 1 && addr, src };
}
function renderCases() {
  const s = sim.s;
  const by = st => s.cases.filter(c => c.status === st);
  const pendingDispatch = c => c.status === 'active' && missingInitialDispatch(c).length > 0;
  const dz = by('intake').filter(c => c.phase === 'dz' && dzOf(c) && dzOf(c).received), intake = by('intake').filter(c => c.phase !== 'dz'), closed = by('closed');
  const act = by('active').filter(c => !pendingDispatch(c)), wait = s.cases.filter(c => c.status === 'waiting' || pendingDispatch(c));
  const intakeN1 = intake.some(c => intakeView(c).n1);
  const tabs = [['waiting', 'Čekající', wait.length], ['active', 'Právě řešené', act.length], ['intake', intakeN1 ? 'Nabírá se N1' : 'Nabírá se', intake.length], ['closed', 'Uzavřené', closed.length], ['dz', 'Datové zprávy', dz.length]];
  setHTML($('tabs-cases'), tabs.map(([k, l, n]) => {
    const classes = [tabCase === k ? 'on' : '', (k === 'waiting' && wait.length > 0 && tabCase !== 'waiting') || (k === 'intake' && intakeN1 && tabCase !== 'intake') ? 'waiting-alert' : ''].filter(Boolean).join(' ');
    return `<button data-tabcase="${k}" class="${classes}">${l}<span class="cnt">${n}</span></button>`;
  }).join(''));
  let rows = ({ waiting: wait, active: act, intake, closed, dz })[tabCase].slice();
  if (tabCase === 'waiting') rows.sort((a, b) => a.n - b.n || a.readyAt - b.readyAt);
  else if (tabCase === 'closed') rows.sort((a, b) => b.closedAt - a.closedAt), rows = rows.slice(0, 60);
  else if (tabCase === 'active') rows.sort((a, b) => b.createdAt - a.createdAt);
  else rows.sort((a, b) => a.n - b.n || a.createdAt - b.createdAt);
  const query = caseSearch.trim().toLocaleLowerCase('cs-CZ');
  if (query) rows = rows.filter(c => c.status === 'intake' ? [c.op, c.src, c.phase === 'dz' && dzOf(c) ? dzOf(c).text : ''].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ').includes(query) : [c.num, c.addr, c.town, c.okres, c.klasif, c.charakter, c.typ, c.up, c.place, c.poznamka, c.src, c.op, c.ozn, c.phone, c.desc, c.dest, c.targetHospitalId, clarificationOf(c)].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ').includes(query));
  if (!rows.length) { setHTML($('cases'), `<div class="empty">${query ? 'Hledání neodpovídá žádnému případu.' : tabCase === 'waiting' ? 'Žádný případ nečeká na vyslání posádky.' : 'Nic k zobrazení.'}</div>`); return; }
  const body = rows.map(c => {
    const intk = c.status === 'intake';
    // fáze 1: jen datová zpráva; fáze 2: jen operátor a linka (nic dalšího o případu dispečer ještě nezná)
    if (intk && tabCase === 'dz') { const r = dzOf(c); return `<article class="case-card dz-row ${sel.c === c.id ? 'sel' : ''}" data-case="${c.id}" tabindex="0"><div class="case-top"><span class="case-priority dz">DZ</span><div class="case-address"><strong>${esc(r.text)}</strong><small>${esc(r.source || '')} · ${esc(sim.clockAt(r.receivedAt != null ? r.receivedAt : c.createdAt))}</small></div></div></article>`; }
    if (intk) {
      const v = intakeView(c), nTag = v.tail || v.n1 ? `N${c.n}` : '…', patient = c.patientName || c.desc || '';
      return `<article class="case-card is-intake n${v.tail || v.n1 ? c.n : 3} ${sel.c === c.id ? 'sel' : ''}" data-case="${c.id}" tabindex="0">
      <div class="case-top"><span class="case-priority">${nTag}</span><div class="case-address"><strong>${v.addr ? esc(c.addr) + ` <span class="okr">${esc(okrAbbr(c))}</span>` : esc(c.op) + ' nabírá výzvu'}</strong><small>${v.addr ? esc(c.town || '') + (c.okres ? ' · okres ' + esc(c.okres) : '') : esc(v.src)}</small></div><span class="case-status">Výzva se připravuje</span></div>
      <div class="case-main"><div class="case-class"><b>${v.klasif ? esc(c.klasif) : ''}</b></div><div class="case-up">${v.klasif ? `<span class="field-label">Upřesnění</span>${esc(v.syms.join(', ') || '…')}` : ''}</div><div class="case-meta">${esc(c.op)} nabírá výzvu · ${esc(v.src)}</div></div>
      ${v.tail ? `<div class="case-bottom"><span class="case-patient">${esc(patient)}</span><span class="case-scene">${esc(c.poznamka || '')}</span></div>` : ''}
    </article>`;
    }
    const rvPending = c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && c.status !== 'closed';
    const missing = missingInitialDispatch(c);
    const agMissing = ['pcr', 'hzs'].filter(k => c.agencies && c.agencies[k] && c.agencies[k].state === 'requested' && c.agencies[k].fromCall).map(k => k === 'pcr' ? 'PČR' : 'HZS');
    const status = tabCase === 'closed'
      ? (c.unserved ? 'Neobslouženo' : c.typ === 'sekundární' ? 'Dokončeno' : `Uzavřeno · ${Math.round(c.score ? c.score.total : 0)} b.`)
      : c.examPending && c.status === 'waiting' ? 'Prohlídka zemřelého – vyšli RV'
        : c.exitus ? (c.coroner && c.coroner.state === 'available' ? 'Exitus · vyšli koronera' : c.coroner && c.coroner.state === 'sent' ? 'Exitus · koroner jede' : 'Exitus')
        : c.status === 'waiting' ? 'Čeká na vyslání'
        : (missing.length || agMissing.length) ? `Doplnit: ${missing.concat(agMissing).join(' + ')}`
        : intk ? `${c.op} nabírá výzvu`
          : rvPending ? `RZP žádá RV: ${c.rvReq.kind || 'posouzení stavu'}` : 'Řeší se';
    const crewLine = c.crews.map(id => sim.crewOf(id)).filter(Boolean).map(chipHTML).join('') + (c.frs || []).map(f => `<span class="chip fr">${esc(f.name)}</span>`).join('');
    const patient = (c.patientCount || 1) > 1 ? `${c.patientCount} zranění` : c.age != null ? `${Number(c.age) < 18 ? 'Dítě' : c.sex === 'Ž' ? 'Žena' : 'Muž'}, ${c.age} let` : c.desc;
    const detail = c.typ === 'sekundární'
      ? `Převoz: ${(D.hospitals.find(h => h.id === c.originHospitalId) || {}).short || '?'} → ${(D.hospitals.find(h => h.id === c.targetHospitalId) || {}).short || '?'}`
      : [c.place && `Místo: ${c.place}`, c.poznamka && `Poznámka ZOS: ${c.poznamka}`].filter(Boolean).join(' · ');
    const vj = c.vstricna && c.vstricna.state === 'offered' ? `Vstřícná jízda: přetáhni volnou RZP z oblasti ${c.vstricna.areaName} na tento případ` : '';
    const meta = intk
      ? `${c.op} nabírá výzvu · ${c.src}`
      : `Událost ${c.num} · ${sim.clockAt(c.createdAt)} · ${esc(c.src)} · volající ${esc(c.ozn)} · ${esc(c.phone)}`;
    const nTag = `N${c.n}${c.nDopl ? '<small>DOPL</small>' : c.dyn ? '<small>DYN</small>' : ''}`;
    if (sel.c !== c.id) {
      const who = [c.patientName || patient, c.klasif, c.ageText || (c.age != null ? c.age + ' let' : '')].filter(Boolean).join(', ');
      const what = [c.place, c.poznamka].filter(Boolean).join(' · ');
      const chips = c.crews.map(id => sim.crewOf(id)).filter(Boolean).map(k => `${k.dest ? `<span class="cchip dest" data-crew="${k.id}">${esc(k.dest.name)}</span>` : ''}<span class="cchip" data-crew="${k.id}" style="background:${COL[k.state]};color:${k.state !== 'base' && k.state !== 'free' ? '#fff' : '#111'}">${esc(k.name)}</span>`).join('') + agencyChips(c);
      return `<article class="case-card case-row n${c.n} ${rvPending ? 'rv-pending' : ''} ${intk ? 'is-intake' : ''}" data-case="${c.id}" tabindex="0" aria-label="N${c.n}, ${esc(c.klasif)}, ${esc(c.addr)}">
      <span class="case-priority">${nTag}</span><b class="cr-addr"><span class="cr-at">${esc(c.town && !String(c.addr).includes(c.town) ? c.town + ', ' : '')}${esc(c.addr)}</span><span class="okr">${esc(okrAbbr(c))}</span></b>
      <span class="cr-cls">${esc(c.klasif)}</span><span class="cr-up">${esc(symptomsOf(c).map(x => String(x).replace(/^[^0-9A-Za-zÀ-ž]+/, '')).slice(0, 5).join(', '))}</span><span class="cr-what">${esc(what)}</span><span class="cr-time">${esc(sim.clockAt(c.createdAt))}${c.status === 'waiting' || missing.length ? ` <b class="case-age" data-since="${c.waitSince}"></b>` : ''}</span>
      <span class="cr-who">${esc(who)}</span><span class="cr-crews">${chips || `<span class="wait">${esc(status)}</span>`}${chips && (rvPending || missing.length || agMissing.length) ? `<span class="wait urgent">${esc(status)}</span>` : ''}</span>
    </article>`;
    }
    return `<article class="case-card n${c.n} ${sel.c === c.id ? 'sel' : ''} ${rvPending ? 'rv-pending' : ''} ${intk ? 'is-intake' : ''}" data-case="${c.id}" tabindex="0" aria-label="N${c.n}, ${esc(c.klasif)}, ${esc(c.addr)}">
      <div class="case-top"><span class="case-priority">${nTag}</span>
        <div class="case-address"><strong>${esc(c.addr)} <span class="okr">${esc(okrAbbr(c))}</span></strong><small>${esc(c.town || '')}${c.okres ? ` · okres ${esc(c.okres)}` : ''} · ${esc(c.typ || 'primární')}</small></div>
        <span class="case-status ${rvPending || missing.length || agMissing.length ? 'urgent' : ''}">${esc(status)}${c.status === 'waiting' || missing.length ? ` <b class="case-age" data-since="${c.waitSince}"></b>` : ''}</span>
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
  const dp = $('detail'); if (dp) { if (c) dp.dataset.dropCase = c.id; else delete dp.dataset.dropCase; }
  if (!c) { setHTML($('detail'), '<div class="empty">Vyber případ v seznamu nebo na mapě.</div>'); return; }
  const intk = c.status === 'intake';
  if (intk) {
    const prealerted = (c.prealertCrewIds || []).map(id => sim.crewOf(id)).filter(Boolean);
    const iv = c.phase === 'dz' ? null : intakeView(c);
    const prealert = c.n === 1 && c.phase !== 'dz' && iv.addr
      ? `<div class="prealert-panel"><p>Probíhá nabírání N1. Posádkám můžeš dát předpoplach ještě před dokončením výzvy. Posádky zatím nevyjíždějí.</p>${prealerted.length
        ? `<b>Předpoplach přijat: ${prealerted.map(k => esc(k.name)).join(', ')}</b>`
        : `<button class="btn red" data-act="prealert" data-case="${c.id}">Předpoplach posádkám</button>`}</div>`
      : '';
    const dr = dzOf(c);
    const what = c.phase === 'dz' ? `<p><b>Datová zpráva</b><br>${dr ? `${esc(dr.source || '')}: ${esc(dr.text)}` : ''}</p><p>Událost se zatím předává na naši linku.</p>` : `<p>${esc(c.op)} nabírá výzvu · ${esc(iv.src)}</p><dl>${iv.addr ? `<dt>Adresa</dt><dd>${esc(c.addr)}<br><small>${esc(c.town || '')}${c.okres ? ' · okres ' + esc(c.okres) : ''}</small></dd>` : ''}${iv.klasif ? `<dt>Klasifikace</dt><dd>${esc(c.klasif)}</dd>` : ''}${iv.syms.length ? `<dt>Upřesnění</dt><dd>${esc(iv.syms.join(', '))}</dd>` : ''}${iv.tail ? `<dt>Naléhavost</dt><dd>N${c.n}</dd><dt>Pacient</dt><dd>${esc(c.patientName || c.desc || '')}</dd>${c.poznamka ? `<dt>Poznámka</dt><dd>${esc(c.poznamka)}</dd>` : ''}` : ''}</dl><p>Calltaker ještě nabírá výzvu…</p>`;
    const earlyReports = (c.radioReports || []).filter(r => r.received && r.id !== 'dz-in').map(r => `<li><time>${esc(sim.clockAt(r.receivedAt))}</time> ${esc(r.source || 'Linka 112')}: ${esc(r.text)}</li>`).join('');
    const reportsHtml = earlyReports ? `<div class="report-panel"><b>Průběžné zprávy linky 112</b><ul>${earlyReports}</ul></div>` : '';
    setHTML($('detail'), `<div class="panel dgrid"><div class="dc1"><h3>${c.phase === 'dz' ? 'Datová zpráva' : 'Nabírá se výzva'}</h3>` + what + prealert + reportsHtml + '</div></div>'); return;
  }
  const missingTypes = missingInitialDispatch(c);
  const st = missingTypes.length ? `čeká na ${missingTypes.join(' + ')}` : { waiting: 'čeká na vyslání', active: 'řeší se', closed: 'uzavřen', intake: 'nabírá se' }[c.status];
  const secDelta = c.scheduleDelta == null ? 'zatím nepřistaveno' : `${Math.round(Math.abs(c.scheduleDelta) / 60)} min ${c.scheduleDelta < 0 ? 'před termínem' : 'po termínu'}`;
  let h = `<div class="panel dgrid"><div class="dc1"><h3>${esc(c.num)} · <span class="pill" style="background:${c.n === 1 ? '#f7c9c5' : c.n === 2 ? '#fbdcb5' : c.n === 4 ? '#d8e4ec' : '#f7ecb8'}">N${c.n}${c.dyn ? ' dyn.' : ''}</span> <span class="pill" style="background:#e1e8ee">${st}</span></h3>`;
  if (c.n === 2 && !c.dyn && c.status !== 'closed' && !c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV'; })) h += `<button class="btn" data-act="n2-dynamic" data-case="${c.id}">Změnit výzvu na dynamickou</button>`;
  if (c.n >= 2 && c.status !== 'closed' && c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RZP' && k.zzum && k.caseId === c.id; })) h += `<button class="btn${c.zzumFlag ? ' pri' : ''}" data-act="zzum-flag" data-case="${c.id}" title="ZZUM – výjezd bez lékaře">${c.zzumFlag ? '✓ ZZUM – bez lékaře (zrušit)' : 'Příznak ZZUM – výjezd bez lékaře'}</button>`;
  if (c.typ !== 'sekundární' && c.status !== 'closed' && !c.exitus) {
    const sent = (c.frs || []).map(a => `<li>${esc(a.name)} – ${a.state === 'onscene' ? 'na místě' : 'na cestě, dojezd ' + Math.max(1, Math.round((a.arriveAt - sim.s.t) / 60)) + ' min'}</li>`).join('');
    const sug = sim.frSuggest(c.id, 3).map(x => `<button class="btn" data-act="send-fr" data-case="${c.id}" data-fr="${x.frId}" title="${esc(x.label)}">${esc(x.name)} · ${Math.max(1, Math.round(x.eta / 60))} min</button>`).join('');
    h += `<div class="multi-patient"><b>First respondeři</b>${sent ? `<ul style="margin:2px 0 4px 16px;padding:0">${sent}</ul>` : ' <span style="color:#5a6a7a">nikdo nevyslán</span>'}<div class="opts">${sug || ''}</div></div>`;
  }
  const wx = sim._lzsWeatherStatus(), wxLabel = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  h += `<div class="multi-patient"><b>LZS · ${wxLabel}</b>${wx === 'consult' ? `<br>${c.lzsConsult?.status === 'pending' ? 'Čeká se na rozhodnutí pilota.' : c.lzsConsult?.status === 'approved' ? 'Pilot let povolil.' : c.lzsConsult?.status === 'declined' ? 'Pilot let nedoporučil.' : `<button class="btn" data-act="lzs-consult" data-case="${c.id}">Konzultovat s pilotem</button>`}` : ''}</div>`;
  h += lzsAdviceHtml(c);
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
<dt>Adresa</dt><dd>${esc(c.addr)} <span class="okr">${esc(okrAbbr(c))}</span><br><span style="font-weight:400;color:#5a6a7a">Jihočeský kraj, okres ${esc(okresOf(c))}, obec ${esc(c.town)}<br>${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}</span></dd>
<dt>Popis místa</dt><dd>${esc(c.place)}</dd>
<dt>Pacienti</dt><dd>${c.mu ? c.mu.cas + ' zraněných (zbývá ošetřit ' + c.mu.left + ')' : (c.patientCount || 1) > 1 ? `${c.patientCount} zranění (zbývá ošetřit ${c.patientsRemaining})` : esc(c.desc)}</dd>
${transferInfo(c) ? `<dt>Překlad pacienta</dt><dd>${esc(transferInfo(c))}</dd>` : ''}
<dt>Oznámil</dt><dd>${esc(c.src)} · nabíral ${esc(c.op)}</dd></dl>`;
  const reports = (c.radioReports || []).filter(r => r.received);
  if (reports.length) h += `<div class="report-panel"><b>${c.mu ? 'Situační hlášení' : 'Průběžná hlášení'}</b><ul>${reports.map(r => `<li${r.red ? ' class="red"' : ''}><time>${esc(sim.clockAt(r.receivedAt))}</time> <b>${esc(r.source || (c.mu ? 'Situační hlášení' : 'Linka 112'))}:</b> ${esc(r.text)}${r.fields ? `<ul>${Object.entries(r.fields).filter(([,v]) => v).map(([k,v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>${c.status === 'waiting' || c.status === 'active' ? '<button class="btn pri" data-act="sug">Reagovat – otevřít nabídku posádek</button>' : ''}</div>`;
  if (c.mu && c.mu.hospitalInfoReceived) {
    const caps = c.mu.hospitalCapacities || [];
    h += `<div class="report-panel"><b>Nemocniční příjem (simulovaný)</b>${caps.map(cap => { const hp = D.hospitals.find(x => x.id === cap.hospitalId); return hp ? `<div class="row"><span>${esc(hp.short)}</span><span>${esc(cap.state)} · ${cap.remaining} míst v herním modelu</span><button class="btn" data-act="mu-hospital" data-case="${c.id}" data-hospital="${hp.id}" ${cap.state === 'dočasně nepřijímá' ? 'disabled' : ''}>Směrovat</button></div>` : ''; }).join('')}</div>`;
  }
  if ((c.patientCount || 1) > 1 && c.status !== 'closed') h += `<p class="multi-patient">Více zraněných: ${c.patientsRemaining} pacientů čeká na ošetření. Podle situace vyšlete další RZP.</p>`;
  if (c.vstricna && c.vstricna.state === 'offered') {
    const candidates = sim.s.crews.filter(k => k.type === 'RZP' && k.oblast === c.vstricna.area && sim.avail(k) && !k.res)
      .map(k => ({ k, eta: sim.etaFor(k, c.vstricna.meet ? c.vstricna.meet.lat : c.lat, c.vstricna.meet ? c.vstricna.meet.lon : c.lon) }))
      .sort((a, b) => a.eta - b.eta).slice(0, 4);
    const freeAll = sim.s.crews.filter(k => k.type === 'RZP' && k.oblast === c.vstricna.area && sim.avail(k) && !k.res).length;
    h += `<div class="vstricna-panel"><b>Vstřícná jízda z oblasti ${esc(c.vstricna.areaName)}</b><p>Posádka hlásí pacienta schopného překladu. Pravidlo: vstřícnou vysílej, jen když jsou v oblasti volné aspoň 2 RZP (teď ${freeAll}). Jinak odpověz „dojíždějte sami“.</p>${candidates.length ? `<small>Volné RZP: ${candidates.map(x => `${esc(x.k.name)} (${Math.round(x.eta / 60)} min)`).join(' · ')} – přetáhni na případ</small>` : '<small>Volná místní RZP není k dispozici.</small>'}<div style="margin-top:5px"><button class="btn" data-act="vj-decline" data-case="${c.id}">Dojíždějte sami</button></div></div>`;
  }
  h += deathInfo(c);
  if (c.rvReq && !c.rvReq.cancelled && !c.docAssigned) h += `<p style="color:#b84a00;font-weight:600">Posádka na místě žádá RV: ${esc(c.rvReq.kind || 'zhoršení stavu')}.</p>`;
  const crews = c.crews.map(id => sim.crewOf(id));
  h += `<div style="margin-top:6px"><b>Zasahují:</b> ${crews.length ? crews.map(k => {
    const canCancel = k.state === 'call' || k.state === 'enroute' || (sim.avail(k) && k.caseId === c.id) || (k.type === 'LZS' && (k.state === 'onscene' || (k.state === 'transport' && k.lzsLeg === 'to-scene')));
    return `<span class="assigned-crew">${chipHTML(k)}${canCancel ? `<button class="btn red" data-act="cancel" data-case="${c.id}" data-crew="${k.id}">${k.type === 'LZS' ? 'Odvolat LZS' : 'Odvolat'}</button>` : ''}</span>`;
  }).join('') : (c.frs || []).length ? '' : '<span style="color:#5a6a7a">nikdo</span>'}${(c.frs || []).map(f => `<span class="assigned-crew"><span class="chip fr">${esc(f.name)}</span></span>`).join('')}</div>`;
  if (c.status === 'closed' && c.typ === 'sekundární') h += `<p>Body za dodržení času: <b>${c.score ? c.score.total : 0}/100</b></p>`;
  else if (c.status === 'closed' && c.score) h += `<p>Skóre případu: <b>${Math.round(c.score.total)}</b> (včas ${c.score.delay.toFixed(0)}/20 · příjezd ${c.score.arrive.toFixed(0)}/50 · lékař ${c.score.rv.toFixed(0)}/15 · volba ${c.score.eff.toFixed(0)}/15${c.score.pen ? ' · přesměrování −' + c.score.pen : ''})</p>`;
  h += '</div><div class="dc2">';
  if (c.status === 'waiting' || c.status === 'active') {
    h += `<div><button class="btn pri" data-act="sug">Navrhnout posádku ${sugOpen ? '▴' : '▾'}</button></div>`;
    if (settings.hints) {
      const mt = c.exitus ? [] : missingInitialDispatch(c);
      const best = (kind, role) => { const l = sim.suggest(c.id, kind, role).slice(0, 1)[0]; const k = l && sim.crewOf(l.crewId); return k ? `${esc(k.name)} (${Math.round(l.eta / 60)} min)` : ''; };
      const parts = [];
      if (mt.length) parts.push(`Chybí vyslat: <b>${mt.join(' + ')}</b>.`);
      else if (!c.crews.length) parts.push(`N${c.n}: ${c.n <= 2 ? 'vyšli nejbližší volnou posádku, u N1 hned.' : 'vyšli nejbližší volnou RZP.'}`);
      const r = best('RZP'); if (r && !c.crews.length) parts.push(`Nejrychlejší RZP: <b>${r}</b>.`);
      if (c.n === 1 && !c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV'; })) { const v = best('RV'); if (v) parts.push(`Zvaž RV: <b>${v}</b>.`); }
      if (parts.length) h += `<div class="hint">💡 ${parts.join(' ')}</div>`;
    }
    if (sugOpen) {
      const sect = (title, kind, n, role) => {
        const list = sim.suggest(c.id, kind, role).slice(0, n);
        if (!list.length) return `<div class="sug"><h4>${title}</h4><div class="row" style="color:#5a6a7a">Nikdo volný.</div></div>`;
        return `<div class="sug"><h4>${title}</h4>${list.map((x, i) => {
          const k = sim.crewOf(x.crewId), rec = settings.hints && i === 0;
          return `<div class="row${rec ? ' rec' : ''}">${rec ? '<span class="recstar" title="Doporučeno">★</span>' : ''}<span class="chip" data-crew="${k.id}" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(k.name)}</span><span>${esc(STLAB[k.state])}</span><span class="km">${x.km.toFixed(0)} km</span><span class="eta">${Math.round(x.eta / 60)} min</span><button class="btn pri" data-act="assign" data-case="${c.id}" data-crew="${k.id}" data-role="${role || ''}">Vyslat</button>${!role && k.type === 'RZP' && k.state === 'base' && sim.liberoFor(k) ? `<button class="btn" title="Přidat lékaře LIBERO ze základny – dočasně RLP" data-act="assign-libero" data-case="${c.id}" data-crew="${k.id}">+ LIBERO</button>` : ''}</div>`;
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
// značky součinnosti u případu (jako posádky)
function agencyChips(c) {
  const out = [], A = c.agencies || {};
  for (const f of c.frs || []) out.push(`<span class="cchip ag-fr" title="First responder${f.state === 'onscene' ? ' – na místě' : ' – na cestě'}">${esc(f.name)}</span>`);
  if (c.coroner && (c.coroner.state === 'sent' || c.coroner.state === 'available')) out.push(`<span class="cchip ag-cor">${c.coroner.state === 'sent' ? 'KORONER' : 'KORONER dostupný'}</span>`);
  for (const [k, nm, cl] of [['pcr', 'PČR', 'ag-pcr'], ['hzs', 'HZS', 'ag-hzs']]) if (A[k] && A[k].state !== 'requested') out.push(`<span class="cchip ${cl}">${nm}${A[k].state === 'onscene' ? ' na místě' : ''}</span>`); else if (A[k]) out.push(`<span class="cchip ${cl}${A[k].fromCall ? '' : ' ask'}">${nm}?</span>`);
  return out.join('');
}
// dlaždice součinnosti: koroner, PČR, HZS – přetažením na případ je ZOS vyrozumí
function agencyTiles() {
  const open = sim.s.cases.filter(c => c.status !== 'closed');
  const cor = open.filter(c => c.coroner && c.coroner.state === 'sent').map(c => c.num), corAsk = open.some(c => c.coroner && c.coroner.state === 'available');
  const by = k => open.filter(c => c.agencies && c.agencies[k] && (c.agencies[k].state === 'sent' || c.agencies[k].state === 'onscene')).map(c => c.num);
  const req = k => open.some(c => c.agencies && c.agencies[k] && c.agencies[k].state === 'requested' && !c.agencies[k].fromCall);
  const tile = (id, cls, name, list, icon, ask) => `<button class="tile ${cls}${ask ? ' agency-ask' : ''}" data-crew="${id}" title="${esc(name)} – přetáhni na případ"><span class="tn">${name}</span><i>${list.length ? esc(list.join(', ')) : 'volné'}</i>${icon}</button>`;
  const frBy = open.filter(c => (c.frs || []).length).map(c => c.num);
  return tile('x-cor', 'st-coroner', 'KORONER', cor, ico('base', 'COR'), corAsk) + tile('x-fr', 'st-fr', 'FR', frBy, ico('base', 'FR'), false) + tile('x-pcr', 'st-pcr', 'PČR', by('pcr'), ico('base', 'PCR'), req('pcr')) + tile('x-hzs', 'st-hzs', 'HZS', by('hzs'), ico('base', 'HZS'), req('hzs'));
}
function deathInfo(c) {
  if (!c.exitus) return '';
  const cor = c.coroner || {}, ex = c.exam;
  const t = cor.state === 'pending' ? 'ZOS zjišťuje koronera' : cor.state === 'available' ? 'koroner k dispozici – přetáhni dlaždici KORONER na případ' : cor.state === 'sent' ? `koroner vyslán, dorazí asi za ${Math.max(1, Math.round((cor.arriveAt - sim.s.t) / 1800) / 2)} h` : ex && ex.done ? 'prohlídka zemřelého provedena' : ex && ex.crewId ? 'RV provádí prohlídku zemřelého (lze odvolat, pak se musí vrátit)' : 'koroner není – na prohlídku zemřelého vyšli RV';
  return `<p class="death-panel"><b>Exitus</b> · ${t}${cor.state === 'sent' ? ' <span class="chip cor">KORONER</span>' : ''}</p>`;
}
// dlaždice cizí posádky: přetažením na případ se žádá o pomoc (po souhlasu se vyšle)
function extTile(k) {
  const nb = D.neighbors[k.region] || { short: '' }, t = sim.s.t, a = k.nbAsk;
  const st = k.state !== 'off' ? (k.state === 'base' && k.supportRequested ? 'ready' : 'busy') : a && a.state === 'asked' ? 'asked' : k.nbBusyUntil && t < k.nbBusyUntil ? 'declined' : 'free';
  const lab = { free: 'volná k žádosti', asked: 'čeká na odpověď', ready: 'souhlasí', busy: sim.phase(k), declined: 'odmítla' }[st];
  return `<button class="tile ty-${k.type} nb nb-${st}${k.foreign ? ' foreign' : ''}${sel.k === k.id ? ' sel' : ''}" data-code="${esc(k.code)}" data-crew="${k.id}" title="${esc(k.name + ' · ' + nb.short + ' · ' + lab + ' – přetáhni na případ = žádost o pomoc')}"><span class="tn">${esc(k.name)}</span><i>${esc(nb.short)} · ${esc(lab)}</i>${ico(k.state === 'off' ? 'base' : k.state, k.type)}</button>`;
}
function renderCrews() {
  const s = sim.s;
  const groups = D.oblasti.map(o => ({ title: o.name, crews: s.crews.filter(k => k.oblast === o.id && k.type !== 'LZS' && k.type !== 'MU') }));
  groups.push({ title: 'Speciální (LZS, součinnost, MU)', crews: s.crews.filter(k => (k.type === 'LZS' || k.type === 'MU') && !k.ext) });
  groups.push({ title: 'Sousední kraje (pomoc na žádost)', crews: s.crews.filter(k => k.ext) });
  const rank = k => (k.id === 'lzs' ? -3 : k.type === 'LZS' ? -2.5 : k.type === 'MU' ? 5 : k.type === 'RZP' && !k.res ? 0 : k.type === 'RV' ? 1 : k.type === 'LIB' ? 1.5 : k.type === 'RZP' ? 2 : 3);
  let h = '';
  for (const g of groups) {
    g.crews.sort((a, b) => rank(a) - rank(b));
    const free = g.crews.filter(k => sim.avail(k)).length, on = g.crews.filter(k => k.state !== 'off').length;
    const spec = g.title.startsWith('Speciální');
    h += `<div class="oblast">${esc(g.title)} <span>${g.title.startsWith('Sousední') ? `${g.crews.length} základen · přetáhni na případ = žádost o pomoc` : `volných ${free} / ve službě ${on}`}</span></div><div class="grid">` +
      g.crews.map(k => {
        if (k.ext) return extTile(k);
        const pre = spec && k.type === 'MU' && !g._ag ? (g._ag = true, agencyTiles()) : '';
        const prealert = s.cases.some(c => c.status === 'intake' && c.n === 1 && (c.prealertCrewIds || []).includes(k.id));
        const soft = k.caseRole === 'exam' ? 'exam' : k.caseRole === 'escort' ? 'escort' : '';
        return pre + `<button data-code="${esc(k.code)}" class="tile ty-${k.type} st-${k.state} ${talkCodes.has(String(k.code)) ? 'talking' : ''} ${soft ? 'soft-' + soft : ''} ${followK === k.id ? 'follow' : ''} ${sel.k === k.id ? 'sel' : ''} ${prealert ? 'prealerted' : ''}" data-crew="${k.id}" title="${esc(k.name + ' · ' + sim.phase(k) + (prealert ? ' · PŘEDPOPLACH' : '') + ' · ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}" aria-label="${esc(k.name + ', ' + sim.phase(k) + (prealert ? ', předpoplach' : '') + ', ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}"><span class="tn">${esc(k.name)}</span><i>${esc(k.code)}${k.type === 'RV' ? ' RV' : k.type === 'LZS' ? ' LZS' : k.res ? ' Z' : ''} · ${k.callsCompleted || 0} výj.</i>${ico(k.state, k.type)}${sim.isLights(k) ? '<span class="siren-dot" title="jede na majáky"></span>' : ''}${prealert ? '<span class="prealert-badge">PA</span>' : ''}</button>`;
      }).join('') + (spec && !g._ag ? agencyTiles() : '') + '</div>';
  }
  setHTML($('crews'), h);
  setHTML($('legend'), [['call', 'výzva'], ['enroute', 'výjezd'], ['onscene', 'na místě'], ['transport', 'transport'], ['free', 'volná'], ['base', 'na základně'], ['off', 'nepřihlášená'], ['second', 'sekundár']].map(([k, l]) => `<span class="legend-item"><i class="legend-icon st-${k}">${ico(k)}</i>${l}</span>`).join('') + `<span class="legend-item"><i class="legend-icon st-base">${ico('base', 'RZP')}</i>RZP</span><span class="legend-item"><i class="legend-icon st-base ty-RV">${ico('base', 'RV')}</i>RV</span><span>· vůz míří doprava = jede k události, doleva = veze pacienta / vrací se · klik = sledovat na mapě · dlaždici lze přetáhnout na případ</span>`);
  const k = sel.k && sim.crewOf(sel.k);
  if (!k) { setHTML($('crewpanel'), '<span style="color:#5a6a7a">Vyber posádku. Panel vybrané posádky.</span>'); return; }
  const cs = k.caseId && sim.caseOf(k.caseId), selCase = sel.c && sim.caseOf(sel.c);
  let p = `<h3>${esc(k.name)} <span class="pill" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(sim.phase(k))}</span></h3>
<dl><dt>Rádio</dt><dd>${esc(k.code)} · ${k.type === 'RV' ? 'RV (lékař)' : k.type === 'LZS' ? 'RLP vrtulník' : k.type === 'MU' ? 'MU modul' : k.type === 'LIB' ? 'LIBERO – lékař bez vozu, jen přes den' : k.res ? 'RZP záloha' : k.rlp ? 'RZP + lékař LIBERO (dočasně RLP)' : 'RZP'}${k.zzum ? ' · ZZUM' : ''}</dd>
<dt>Členové</dt><dd>${esc(k.members.join(', '))}</dd>
<dt>Rychlost</dt><dd>${esc(crewSpeedText(k))}</dd>
<dt>Uskutečněné výjezdy</dt><dd>${k.callsCompleted || 0}</dd>
${cs ? `<dt>Případ</dt><dd><a href="#" data-case="${cs.id}">${esc(cs.num)} ${esc(cs.klasif)}</a></dd>` : ''}${cs && transferInfo(cs) ? `<dt>Překlad pacienta</dt><dd>${esc(transferInfo(cs))}</dd>` : ''}${k.dest ? `<dt>Cíl</dt><dd>${esc(k.dest.name)}</dd>` : ''}</dl>`;
  if (k.type === 'RZP' && (k.state === 'base' || k.state === 'call') && sim.liberoFor(k)) p += `<button class="btn pri" data-act="libero" data-crew="${k.id}">+ LIBERO (dočasně RLP)</button>`;
  if (k.type === 'RZP' && k.liberoId) p += `<button class="btn" data-act="unlibero" data-crew="${k.id}">− LIBERO (odpřadit lékaře)</button>`;
  if (k.type === 'LIB' && k.withCrew) p += `<button class="btn" data-act="unlibero" data-crew="${k.withCrew}">Odpřadit od ${esc((sim.crewOf(k.withCrew) || {}).name || 'RZP')}</button>`;
  if (k.type === 'LIB') { const m = (sim.s.libero && sim.s.libero.modes[k.id]) || 'random'; p += `<div class="opts" style="margin:4px 0">Obsazení: ${[['on', 'Obsazeno'], ['off', 'Neobsazeno'], ['random', 'Náhodně']].map(([v, l]) => `<button data-libset="${k.id}" data-val="${v}" class="${m === v ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
  if (k.type === 'LIB' && k.state === 'base') for (const r of sim.s.crews.filter(x => x.type === 'RZP' && x.st === k.st && !x.rlp && (x.state === 'base' || x.state === 'call'))) p += `<button class="btn" data-act="libero" data-crew="${r.id}" data-lib="${k.id}">Do vozu ${esc(r.name)}</button>`;
  if (k.type === 'LIB' && k.state === 'off') p += '<p style="color:#5a6a7a;margin:4px 0">LIBERO dnes není ve službě (jen přes den a ne vždy).</p>';
  if (!['LZS', 'MU', 'LIB'].includes(k.type) && !['off', 'base', 'second', 'activating', 'attached'].includes(k.state)) {
    const dn = k.driveN || (cs ? Math.min(3, cs.n || 3) : 3);
    if (['call', 'enroute'].includes(k.state)) p += `<div class="opts" style="margin:4px 0">Naléhavost jízdy: ${[1, 2, 3].map(n => `<button data-act="drive-n" data-crew="${k.id}" data-n="${n}" class="${dn === n ? 'on' : ''}">N${n}</button>`).join('')} <span style="color:#5a6a7a">${sim.isLights(k) ? '● majáky' : 'bez majáků'}</span></div>`;
    const n3 = k.retN3 || k.retLights;
    p += `<button class="btn${n3 ? '' : ' pri'}" data-act="ret-n3" data-crew="${k.id}" title="Po předání se vracet na majáky (rychleji)">${n3 ? '● Návrat v režimu N3 (majáky)' : 'Vracet se v režimu N3 (majáky)'}</button>`;
  }
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
// ---------- vrstva pokrytí: kam se do limitu dostane nejbližší volná RZP (živě, po silniční síti) ----------
const COV_TYPES = [['iso', 'Izochrony'], ['hex', 'Buňky'], ['gap', 'Bílá místa']];
const COV_STOPS = [[4, [25, 195, 165]], [10, [79, 210, 138]], [14, [182, 220, 76]], [17, [241, 210, 60]], [20, [245, 154, 47]], [24, [229, 72, 62]], [30, [163, 23, 63]]];
const COV = { geom: null, targets: null, nx: 0, ny: 0, w: 1500, h: 0, last: 0, sig: '', stat: null, gaps: [], on: false };
function covCol(t) {
  if (t <= COV_STOPS[0][0]) return COV_STOPS[0][1];
  for (let i = 1; i < COV_STOPS.length; i++) {
    if (t <= COV_STOPS[i][0]) { const a = COV_STOPS[i - 1], b = COV_STOPS[i], f = (t - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(k => Math.round(a[1][k] + (b[1][k] - a[1][k]) * f)); }
  }
  return COV_STOPS[COV_STOPS.length - 1][1];
}
const covRgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const covMerc = la => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
const covLat = m => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) * 180 / Math.PI;
function covInRing(ring, x, y) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function covGeom() {
  if (COV.geom) return COV.geom;
  const mp = (GLMASK.features ? GLMASK.features[0] : GLMASK).geometry.coordinates;
  const hole = mp[0][1], encl = mp.slice(1).map(p => p[0]);
  let w = 1e9, e = -1e9, s = 1e9, n = -1e9;
  for (const [lo, la] of hole) { w = Math.min(w, lo); e = Math.max(e, lo); s = Math.min(s, la); n = Math.max(n, la); }
  const yT = covMerc(n), yB = covMerc(s);
  COV.h = Math.round(COV.w * (yT - yB) / ((e - w) * Math.PI / 180));
  return (COV.geom = { hole, encl, w, e, s, n, yT, yB });
}
function covGrid() {
  if (COV.targets) return;
  const g = covGeom(), NX = 110, NY = Math.round(NX * ((g.n - g.s) * 111) / ((g.e - g.w) * 72.8));
  COV.nx = NX; COV.ny = NY; COV.targets = []; COV.inside = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const lo = g.w + (g.e - g.w) * (i + 0.5) / NX, la = covLat(g.yT - (g.yT - g.yB) * (j + 0.5) / NY);
    COV.targets.push([la, lo]);
    COV.inside.push(covInRing(g.hole, lo, la) && !g.encl.some(r => covInRing(r, lo, la)));
  }
}
function covPx(lo, la) { const g = COV.geom; return [(lo - g.w) / (g.e - g.w) * COV.w, (g.yT - covMerc(la)) / (g.yT - g.yB) * COV.h]; }
function covPath() {
  const g = COV.geom, p = new Path2D();
  for (const ring of [g.hole].concat(g.encl)) { ring.forEach(([lo, la], i) => { const [x, y] = covPx(lo, la); if (i) p.lineTo(x, y); else p.moveTo(x, y); }); p.closePath(); }
  return p;
}
function covGaps(T, lim) {
  const NX = COV.nx, NY = COV.ny, seen = new Uint8Array(NX * NY), out = [];
  const bad = k => COV.inside[k] && T[k] > lim;
  for (let k0 = 0; k0 < NX * NY; k0++) {
    if (seen[k0] || !bad(k0)) continue;
    const st = [k0], comp = []; seen[k0] = 1;
    while (st.length) {
      const k = st.pop(); comp.push(k);
      const i = k % NX, j = (k - i) / NX;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) continue; const kk = jj * NX + ii; if (!seen[kk] && bad(kk)) { seen[kk] = 1; st.push(kk); } }
    }
    if (comp.length < 6) continue;
    let sx = 0, sy = 0, mx = 0, wk = comp[0];
    for (const k of comp) { sx += COV.targets[k][1]; sy += COV.targets[k][0]; if (T[k] > mx) { mx = T[k]; wk = k; } }
    const cx = sx / comp.length, cy = sy / comp.length;
    let place = '', bd = 1e9;
    for (const tw of D.towns) { const dx = (cx - tw.lon) * 72.8, dy = (cy - tw.lat) * 111, d = dx * dx + dy * dy; if (d < bd) { bd = d; place = tw.n; } }
    out.push({ n: comp.length, lon: COV.targets[wk][1], lat: COV.targets[wk][0], max: mx, place });
  }
  return out.sort((a, b) => b.n - a.n);
}
function covDraw(T, type, lim) {
  const W = COV.w, H = COV.h, NX = COV.nx, NY = COV.ny, cw = W / NX, ch = H / NY;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), clip = covPath();
  const field = fn => {
    const o = document.createElement('canvas'); o.width = NX; o.height = NY;
    const oc = o.getContext('2d'), im = oc.createImageData(NX, NY);
    for (let k = 0; k < NX * NY; k++) { const p = fn(T[k], COV.inside[k]); im.data[k * 4] = p[0]; im.data[k * 4 + 1] = p[1]; im.data[k * 4 + 2] = p[2]; im.data[k * 4 + 3] = p[3]; }
    oc.putImageData(im, 0, 0); return o;
  };
  const contour = (L, w, style) => {
    c.beginPath();
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = T[j * NX + i], b = T[j * NX + i + 1], cc = T[(j + 1) * NX + i + 1], d = T[(j + 1) * NX + i];
      const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = (i + 0.5) * cw, y = (j + 0.5) * ch, lp = (p, q) => (L - p) / (q - p);
      const tp = [x + lp(a, b) * cw, y], rt = [x + cw, y + lp(b, cc) * ch], bt = [x + lp(d, cc) * cw, y + ch], lf = [x, y + lp(a, d) * ch];
      const seg = (p, q) => { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); };
      switch (idx) {
        case 1: case 14: seg(lf, bt); break; case 2: case 13: seg(bt, rt); break; case 3: case 12: seg(lf, rt); break;
        case 4: case 11: seg(tp, rt); break; case 5: seg(tp, lf); seg(bt, rt); break; case 6: case 9: seg(tp, bt); break;
        case 7: case 8: seg(tp, lf); break; case 10: seg(tp, rt); seg(lf, bt); break;
      }
    }
    c.lineWidth = w; c.strokeStyle = style; c.stroke();
  };
  c.save(); c.clip(clip, 'evenodd');
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if (type === 'iso') {
    c.globalAlpha = 0.8; c.drawImage(field((t, ins) => { if (!ins) return [0, 0, 0, 0]; const k = covCol(t); return [k[0], k[1], k[2], t > lim ? 175 : 150]; }), 0, 0, W, H); c.globalAlpha = 1;
    for (const L of [8, 12, 16]) if (L < lim) contour(L, 1.5, 'rgba(255,255,255,.3)');
    contour(lim, 3.5, 'rgba(255,255,255,.95)');
  } else if (type === 'hex') {
    const R = 24, hw = Math.sqrt(3) * R, dy = 1.5 * R; let row = 0;
    for (let y = R * 0.5; y < H + R; y += dy, row++) for (let x = (row % 2 ? hw / 2 : 0); x < W + hw; x += hw) {
      if (!c.isPointInPath(clip, x, y, 'evenodd')) continue;
      const ix = Math.min(NX - 1, Math.max(0, Math.floor(x / cw))), iy = Math.min(NY - 1, Math.max(0, Math.floor(y / ch))), t = T[iy * NX + ix], k = covCol(t);
      c.beginPath();
      for (let q = 0; q < 6; q++) { const a = Math.PI / 180 * (60 * q - 30), px = x + (R - 2.4) * Math.cos(a), py = y + (R - 2.4) * Math.sin(a); if (q) c.lineTo(px, py); else c.moveTo(px, py); }
      c.closePath(); c.fillStyle = covRgb(k, t > lim ? 0.92 : 0.8); c.fill();
      if (t > lim) { c.strokeStyle = 'rgba(255,235,230,.8)'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(x - R * 0.35, y + R * 0.35); c.lineTo(x + R * 0.35, y - R * 0.35); c.stroke(); }
    }
  } else {
    c.drawImage(field((t, ins) => (ins && t <= lim ? [25, 195, 165, 46] : [0, 0, 0, 0])), 0, 0, W, H);
    contour(lim, 2.5, 'rgba(60,220,190,.7)'); contour(lim * 0.6, 1.5, 'rgba(60,220,190,.3)');
    const gap = field((t, ins) => (ins && t > lim ? [255, 255, 255, Math.min(255, 150 + (t - lim) * 14)] : [0, 0, 0, 0]));
    const hc = document.createElement('canvas'); hc.width = W; hc.height = H; const hx = hc.getContext('2d');
    hx.fillStyle = 'rgba(229,72,62,.42)'; hx.fillRect(0, 0, W, H); hx.strokeStyle = 'rgba(255,170,160,.85)'; hx.lineWidth = 3;
    for (let d = -H; d < W; d += 14) { hx.beginPath(); hx.moveTo(d, H); hx.lineTo(d + H, 0); hx.stroke(); }
    hx.globalCompositeOperation = 'destination-in'; hx.imageSmoothingEnabled = true; hx.drawImage(gap, 0, 0, W, H);
    c.drawImage(hc, 0, 0);
  }
  c.restore();
  return cv.toDataURL('image/png');
}
function covBarHTML() {
  if (!layers.cov) return '';
  const seg = COV_TYPES.map(([k, l]) => `<button data-cov-type="${k}" class="${settings.covType === k ? 'on' : ''}">${l}</button>`).join('');
  const lim = [15, 20, 25].map(m => `<button data-cov-lim="${m}" class="${settings.covLimit === m ? 'on' : ''}">${m} min</button>`).join('');
  const sw = (c, t) => `<i class="sw" style="background:${c}"></i>${t}`;
  const leg = settings.covType === 'gap'
    ? sw('rgba(25,195,165,.6)', 'v dosahu') + sw('repeating-linear-gradient(45deg,#e5483e 0 2px,transparent 2px 4px)', 'mimo limit')
    : [[6, 'do 8'], [12, '12'], [15, '15'], [18, '18'], [22, '22'], [27, '27+']].map(([t, l]) => sw(`rgb(${covCol(t).join(',')})`, l)).join('') + ' min';
  const st = COV.stat ? `<span class="covstat">v limitu <b>${COV.stat.pct} %</b> · nejhorší místo <b>${COV.stat.worst} min</b> · slabých oblastí <b>${COV.stat.gaps}</b> · volných RZP <b>${COV.stat.src}</b></span>` : '<span class="covstat">počítám…</span>';
  return `${seg}<span class="covsep"></span>${lim}<span class="covsep"></span>${leg}<br>${st}`;
}
function covStep(force) {
  if (!layers.cov || !GL || !glReady || !sim || !ROUTER.ready) return;
  const now = performance.now();
  const crews = sim.s.crews.filter(k => k.type === 'RZP' && sim.avail(k));
  const sig = settings.covType + '|' + settings.covLimit + '|' + crews.map(k => { const p = sim.pos(k); return k.id + ':' + p.lat.toFixed(2) + ':' + p.lon.toFixed(2); }).join(',');
  if (!force && (sig === COV.sig || now - COV.last < 3000)) return;
  COV.last = now; COV.sig = sig;
  try {
    covGrid();
    const lim = settings.covLimit || 20, T = sim.coverageSecs(COV.targets).map(s => Math.min(90, s / 60));
    const url = covDraw(T, settings.covType || 'iso', lim);
    const g = COV.geom, src = GL.getSource('cov');
    if (src) src.updateImage({ url, coordinates: [[g.w, g.n], [g.e, g.n], [g.e, g.s], [g.w, g.s]] });
    let tot = 0, ok = 0, worst = 0;
    for (let k = 0; k < T.length; k++) if (COV.inside[k]) { tot++; if (T[k] <= lim) ok++; if (T[k] > worst) worst = T[k]; }
    COV.gaps = covGaps(T, lim);
    COV.stat = { pct: tot ? Math.round(ok / tot * 100) : 100, worst: Math.round(worst), gaps: COV.gaps.length, src: crews.length };
    const gs = GL.getSource('covgaps');
    if (gs) gs.setData({ type: 'FeatureCollection', features: settings.covType === 'gap' ? COV.gaps.slice(0, 6).map(b => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lon, b.lat] }, properties: { lab: `${b.place} · ${Math.round(b.max)} min` } })) : [] });
    setHTML($('covbar'), covBarHTML());
  } catch (err) { console.warn('pokrytí', err); }
}
function renderToolsOnce() {
  setHTML($('covbar'), covBarHTML());
  setHTML($('maptools'), [['base', 'Základny'], ['hosp', 'Nemocnice'], ['fr', 'FR'], ['crews', 'Vozidla'], ['cases', 'Případy'], ['cov', 'Pokrytí']].map(([k, l]) => `<button data-layer="${k}" class="${layers[k] ? '' : 'off'}">${l}</button>`).join('') + '<button data-act="zoomin">＋</button><button data-act="zoomout">－</button><button data-act="zoomreset">⌂</button>');
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
  if (target && !target.keepFollow) followK = null;
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
const VSTATE = { base: 'base', free: 'free', call: 'call', enroute: 'red', onscene: 'red', transport: 'tr', handover: 'tr', second: 'sec', activating: 'base' };
const VFILL = { base: '#ffffff', free: '#8fe29b', call: '#7db4f5', red: '#e2463b', tr: '#f0962e', sec: '#b9c2ca' };
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
    GL = new maplibregl.Map({ container: el, style: isDark() ? darkenStyle(glStyle()) : glStyle(), bounds: [[13.53, 48.55], [15.61, 49.63]], fitBoundsOptions: { padding: 10 }, maxZoom: 18.5, minZoom: 6, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, touchPitch: false });
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
      for (const s of ['routes', 'stations', 'hosp', 'heliport', 'fr', 'nb', 'cases', 'crews']) GL.addSource(s, { type: 'geojson', data: empty });
      GL.addSource('selroute', { type: 'geojson', data: empty });
      { const cg = covGeom(); GL.addSource('cov', { type: 'image', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', coordinates: [[cg.w, cg.n], [cg.e, cg.n], [cg.e, cg.s], [cg.w, cg.s]] }); GL.addSource('covgaps', { type: 'geojson', data: empty }); }
      GL.addLayer({ id: 'routes', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'col'], 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 3, 14, 6], 'line-opacity': 0.85 } });
      GL.addLayer({ id: 'cov', type: 'raster', source: 'cov', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, 'routes');
      GL.addLayer({ id: 'cov-gaps', type: 'symbol', source: 'covgaps', layout: { 'visibility': 'none', 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-anchor': 'bottom', 'text-offset': [0, -0.6], 'text-padding': 4 }, paint: { 'text-color': '#ffe3df', 'text-halo-color': '#7d1d17', 'text-halo-width': 2 } });
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
      const aedSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="1.500" y="1.500" width="25" height="25" rx="4.500" fill="#1a9b4b" stroke="#fff" stroke-width="2"/><path d="M14 23C14 23 5 17 5 11 5 8 7.400 6.200 9.800 6.200 11.600 6.200 13.200 7.200 14 8.800 14.800 7.200 16.400 6.200 18.200 6.200 20.600 6.200 23 8 23 11 23 17 14 23 14 23Z" fill="#fff"/><path d="M15.400 9 11 15H13.600L12.600 20 17 13.600H14.400Z" fill="#1a9b4b"/></svg>';
      svgIcon('zos-aed', aedSvg, 28, 28, () => {
        if (GL.getLayer('fr-aed')) return;
        GL.addLayer({ id: 'fr-aed', type: 'symbol', source: 'fr', layout: { 'icon-image': 'zos-aed', 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.36, 13, 0.62], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.fr ? 'visible' : 'none' } }, 'crews-base');
        GL.addLayer({ id: 'fr-l', type: 'symbol', source: 'fr', minzoom: 10.5, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'visibility': layers.fr ? 'visible' : 'none' }, paint: { 'text-color': '#0e6b35', 'text-halo-color': '#fff', 'text-halo-width': 1.2 } }, 'crews-base');
      });
      GL.getSource('fr').setData({ type: 'FeatureCollection', features: (D.fr || []).map(f => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, f.lat] }, properties: { name: f.name } })) });
      // základny sousedních krajů a zahraničí (pomoc na žádost)
      GL.getSource('nb').setData({ type: 'FeatureCollection', features: (D.nbGround || []).concat(D.lzsSupport || []).map(g => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [g.lon, g.lat] }, properties: { name: g.name, foreign: !!g.foreign } })) });
      GL.addLayer({ id: 'nb', type: 'circle', source: 'nb', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.5, 13, 6], 'circle-color': ['case', ['get', 'foreign'], '#d9e4f2', '#e6eef7'], 'circle-stroke-color': '#1f6fd0', 'circle-stroke-width': 1.8, 'circle-opacity': 0.9 } }, 'crews-base');
      GL.addLayer({ id: 'nb-l', type: 'symbol', source: 'nb', minzoom: 8.5, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#1f4f8f', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } }, 'crews-base');
      // průhledný kruh drží klikací plochu a zvýraznění výběru; samotné vozidlo je symbol (sanitka / RV)
      GL.addLayer({ id: 'crews', type: 'circle', source: 'crews', filter: ['all', ['!=', ['get', 'type'], 'LZS'], ['any', ['!', ['in', ['get', 'state'], ['literal', ['base', 'second']]]], ['get', 'sel']]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 9, 14, 15], 'circle-color': '#ffd23f', 'circle-opacity': ['case', ['get', 'sel'], 0.55, 0.01], 'circle-stroke-color': '#111', 'circle-stroke-width': ['case', ['get', 'sel'], 1.5, 0] } });
      {
        let left = 0; const done = () => { if (--left > 0 || GL.getLayer('crews-ico')) return;
          GL.addLayer({ id: 'crews-ico', type: 'symbol', source: 'crews', filter: ['all', ['!=', ['get', 'type'], 'LZS'], ['!=', ['get', 'type'], 'MU'], ['any', ['!', ['in', ['get', 'state'], ['literal', ['base', 'second']]]], ['get', 'sel']]], layout: { 'icon-image': ['get', 'ico'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 11, 0.72, 14, 0.95], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.crews ? 'visible' : 'none' } }, GL.getLayer('crews-base-l') ? 'crews-base-l' : undefined); };
        for (const ty of ['amb', 'rv']) for (const [st, fill] of Object.entries(VFILL)) for (const dr of ['r', 'l']) { left++; svgIcon(`zv-${ty}-${st}-${dr}`, `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="24" viewBox="0 0 36 24">${flip(dr === 'l' ? -1 : 1, 36, ty === 'rv' ? rvBody(fill) : ambBody(fill))}</svg>`, 36, 24, done); }
      }
      GL.addLayer({ id: 'crews-mu', type: 'circle', source: 'crews', filter: ['==', ['get', 'type'], 'MU'], paint: { 'circle-radius': 7, 'circle-color': ST_COL, 'circle-stroke-color': '#111', 'circle-stroke-width': 1.4 } });
      const heliSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="35" viewBox="0 0 60 35">${HELI_BODY}</svg>`;
      svgIcon('zos-heli', heliSvg, 60, 35, () => {
        if (GL.getLayer('crews-heli')) return;
        GL.addLayer({ id: 'crews-heli', type: 'symbol', source: 'crews', filter: ['==', ['get', 'type'], 'LZS'], layout: { 'icon-image': 'zos-heli', 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.38, 13, 0.68], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.crews ? 'visible' : 'none' }, paint: { 'icon-opacity': 1 } }, GL.getLayer('cases') ? 'cases' : undefined);
      });
      GL.addLayer({ id: 'crews-base-l', type: 'symbol', source: 'crews', minzoom: 10.5, filter: ['all', ['in', ['get', 'state'], ['literal', ['base', 'second']]], ['!', ['get', 'sel']], ['!=', ['get', 'type'], 'LIB']], layout: { 'text-field': ['get', 'code'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0.7, -0.7], 'text-anchor': 'bottom-left', 'text-optional': true }, paint: { 'text-color': '#33475a', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
      GL.addLayer({ id: 'crews-l', type: 'symbol', source: 'crews', minzoom: 7.5, filter: ['any', ['!', ['in', ['get', 'state'], ['literal', ['base', 'second']]]], ['get', 'sel']], layout: { 'text-field': ['concat', ['step', ['zoom'], ['get', 'code'], 12, ['concat', ['get', 'code'], ' ', ['get', 'name']]], ['get', 'spd']], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 12], 'text-offset': [0.8, -0.8], 'text-anchor': 'bottom-left', 'text-optional': true }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.8 } });
      GL.addLayer({ id: 'cases', type: 'circle', source: 'cases', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 9, 14, 13], 'circle-color': ['match', ['get', 'n'], 1, '#d9342b', 2, '#ee8a1b', 4, '#7892a6', '#e8c02a'], 'circle-stroke-color': ['case', ['get', 'sel'], '#111', ['get', 'rvReq'], '#d9342b', '#fff'], 'circle-stroke-width': ['case', ['get', 'sel'], 3.5, ['get', 'rvReq'], 4, 1.6], 'circle-opacity': ['case', ['any', ['get', 'wait'], ['get', 'rvReq']], ['get', 'blink'], 1] } });
      GL.addLayer({ id: 'cases-t', type: 'symbol', source: 'cases', layout: { 'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#111' } });
      GL.addLayer({ id: 'cases-l', type: 'symbol', source: 'cases', minzoom: 11, layout: { 'text-field': ['get', 'num'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.6], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } });
      const st = { type: 'FeatureCollection', features: D.stations.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name } })) };
      GL.getSource('stations').setData(st);
      GL.getSource('hosp').setData({ type: 'FeatureCollection', features: D.hospitals.map(h => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.lon, h.lat] }, properties: { name: h.short } })) });
      GL.getSource('heliport').setData({ type: 'FeatureCollection', features: [D.lzs.heliport, ...D.hospitals.filter(h => h.heliport)].map(h => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.lon, h.lat] }, properties: { name: h.name } })) });
      const pick = e => {
        const f = GL.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['cases', 'crews', 'crews-base'].concat(GL.getLayer('crews-ico') ? ['crews-ico'] : []) });
        if (!f.length) return;
        const c = f.find(x => x.layer.id === 'cases');
        if (c) sel.c = c.properties.id; else sel.k = f[0].properties.id;
        syncSelectionToMain();
        render();
      };
      GL.on('click', pick);
      for (const l of ['cases', 'crews', 'crews-base']) { GL.on('mouseenter', l, () => GL.getCanvas().style.cursor = 'pointer'); GL.on('mouseleave', l, () => GL.getCanvas().style.cursor = ''); }
      GL.on('dragstart', () => { followK = null; }); glReady = true; mapThemeApplied = null; applyMapTheme(); glApplyLayers(); glUpdate(true);
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
  vis(['stations', 'stations-l', 'stations-house', 'nb', 'nb-l'], layers.base); vis(['hosp', 'hosp-t', 'hosp-l', 'heliport', 'heliport-l'], layers.hosp);
  vis(['cov', 'cov-gaps'], layers.cov); vis(['fr-aed', 'fr-l'], layers.fr); vis(['crews', 'crews-base', 'crews-ico', 'crews-mu', 'crews-heli', 'crews-l', 'crews-base-l'], layers.crews); vis(['cases', 'cases-t', 'cases-l'], layers.cases);
}
function glRoute(kk, col) {
  const m = kk.mv; if (!m) return null;
  const p = sim.pos(kk), f = Math.max(0, Math.min(1, (sim.s.t - m.t0) / Math.max(1, m.t1 - m.t0)));
  const co = [[p.lon, p.lat]];
  if (m.path) { for (let i = 0; i < m.frac.length; i++) if (m.frac[i] > f) co.push([m.path[i * 2 + 1], m.path[i * 2]]); }
  else co.push([m.b[1], m.b[0]]);
  return co.length > 1 ? { type: 'Feature', geometry: { type: 'LineString', coordinates: co }, properties: { col } } : null;
}
let followK = null, followLast = 0;
function followStep() {
  if (!followK || !GL || !glReady || !sim) return;
  const k = sim.crewOf(followK); if (!k || k.state === 'off') { followK = null; return; }
  const now = performance.now(); if (now - followLast < 900) return; followLast = now;
  const p = sim.pos(k), c = GL.getCenter();
  if (Math.abs(c.lat - p.lat) < 0.0004 && Math.abs(c.lng - p.lon) < 0.0006) return;
  GL.easeTo({ center: [p.lon, p.lat], zoom: Math.max(GL.getZoom(), 11.5), duration: 800, essential: true });
}
function glUpdate(force) {
  if (!glReady) return;
  followStep();
  const now = performance.now(); if (!force && now - glLast < 250) return; glLast = now;
  covStep();
  const blink = Math.floor(now / 500) % 2 ? 1 : 0.45;
  const cases = [], crews = [], routes = [];
  for (const cs of sim.s.cases) {
    if (cs.status === 'closed' || cs.status === 'intake') continue;
    cases.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [cs.lon, cs.lat] }, properties: { id: cs.id, n: cs.n, lab: cs.mu ? 'MU' : String(cs.n), num: cs.num, sel: sel.c === cs.id, wait: cs.status === 'waiting', rvReq: !!(cs.rvReq && !cs.rvReq.cancelled && cs.rvReq.satT == null && !cs.docAssigned), blink } });
  }
  for (const k of sim.s.crews) {
    if (k.state === 'off' || k.type === 'LIB') continue;
    const p = sim.pos(k);
    crews.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: k.id, name: k.name, code: k.code, state: k.state, type: k.type, sel: sel.k === k.id, spd: sel.k === k.id ? ' · ' + crewSpeedText(k) : '', ico: `zv-${k.type === 'RV' ? 'rv' : 'amb'}-${VSTATE[k.state] || 'red'}-${k.mv ? (k.mv.b[1] >= p.lon ? 'r' : 'l') : 'r'}` } });
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
  if (layers.fr) for (const f of D.fr || []) { const x = X(f.lon), y = Y(f.lat), r = 4.2 * sc; h += `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="1.5" fill="#1a9b4b" stroke="#fff" stroke-width="1"><title>${esc(f.name)}</title></rect>`; }
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
    if (isSel || zoomed) h += `<text x="${x + 7 * sc}" y="${y - 5 * sc}" font-size="${9 * sc}" fill="#111" stroke="#fff" stroke-width="${2.5 * sc}" paint-order="stroke">${esc(kk.name)}${isSel ? ' · ' + esc(crewSpeedText(kk)) : ''}</text>`;
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
function lzsAdviceHtml(c) {
  if (c.typ === 'sekundární' || c.mu || c.status === 'closed') return '';
  const adv = sim.lzsAdvice(c.id); if (!adv || !adv.rows.length) return '';
  const lab = { ano: 'Ano', mozna: 'Možná', ne: 'Ne' };
  const rows = adv.rows.map(r => `<div class="lzs-row lz-${r.level}"><b>${esc(r.name)}</b><b>${r.saving > 0 ? '+' : ''}${r.saving} min · ${lab[r.level]}</b><small>pozemně ${r.groundMin} min · LZS ${r.lzsMin}${r.delayMin ? ' + ' + r.delayMin : ''} min</small></div>`).join('');
  const head = adv.mode === 'h12' ? `H1/2, ošetření ještě asi ${adv.treat} min` : 'H1/1';
  return `<div class="multi-patient"><b>LZS podle kalkulátoru · ${head} · vzlet ${adv.takeoffMin} min (${adv.day ? 'den' : 'noc'})</b><div class="lzs-adv">${rows}</div><small style="color:#5a6a7a">Úspora = pozemně − (LZS + zpoždění nemocnice). Ano od 15 min, možná od 10 min.</small></div>`;
}
function lzsEndHtml(sm) {
  const z = sm.lzs; if (!z || !(z.sentOk + z.sentMaybe + z.sentWasted + z.missed)) return '';
  const r = (l, v) => `<tr><td style="padding:2px 14px 2px 0;color:#5a6a7a">${l}</td><td><b>${v}</b></td></tr>`;
  const log = (z.log || []).map(e => `<li>${esc(e.num)} · ${esc(e.txt)}</li>`).join('');
  return `<div style="margin:8px 0"><b>LZS podle kalkulátoru</b><table style="margin:4px 0;width:auto">${r('Správně vyslaná (úspora od 15 min)', z.sentOk)}${r('Hraniční (10 až 14 min)', z.sentMaybe)}${r('Zbytečně vyslaná (pod 10 min)', z.sentWasted)}${r('Zapomenutá (N1, letové počasí, úspora od 15 min)', z.missed)}</table>${log ? `<ul style="margin:2px 0 0 16px;padding:0">${log}</ul>` : ''}</div>`;
}
function transferInfo(cs) {
  const v = cs && cs.vstricna; if (!v || cs.typ === 'sekundární') return '';
  const area = v.areaName || '';
  switch (v.state) {
    case 'offered': return `schopen překladu – vstřícná jízda možná: přetáhni volnou RZP z oblasti ${area} na periferní posádku (nebo naopak)`;
    case 'self-unavailable': return 'schopen překladu, ale v oblasti není volná RZP – posádka dojede sama';
    case 'dispatched': { const h = sim.crewOf(v.helperCrewId); return `schopen překladu – vstřícná jízda jede${h ? ' (' + h.name + ')' : ''}`; }
    case 'declined': return 'schopen překladu, vstřícná jízda odmítnuta – posádka dojede sama';
    case 'expired': return 'vstřícná jízda vypršela – posádka dojede sama';
    case 'not-suitable': return 'není schopen překladu – posádka dojede sama';
    case 'not-needed': return 'překlad není potřeba (krátká trasa)';
    default: return '';
  }
}
function selectCaseFromElement(caseElement, clickedElement) {
  sel.c = caseElement.dataset.case; syncSelectionToMain();
  const cs = sim.caseOf(sel.c); if (!cs) return;
  const alert = clickedElement.closest('.report-alert');
  sim.acknowledge112(cs.id, alert ? alert.dataset.report : undefined);
  const openDetail = !!(clickedElement.closest('.live-alert') || clickedElement.closest('#log') || clickedElement.closest('.radio-call'));
  if (clickedElement.closest('.live-alert') || clickedElement.closest('.radio-call')) {
    tabCase = cs.status === 'intake' ? (cs.phase === 'dz' ? 'dz' : 'intake') : cs.status === 'closed' ? 'closed' : (cs.status === 'waiting' || missingInitialDispatch(cs).length) ? 'waiting' : 'active';
    caseSearch = ''; const si = $('case-search'); if (si) si.value = '';
    setTimeout(() => { const el = document.querySelector(`#cases [data-case="${cs.id}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
  }
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
    const esc_ = !!run.escort;
    const phase = run.phase === 'transport' ? (esc_ ? 'Doprovod do nemocnice' : 'Na cestě do nemocnice') : run.phase === 'handover' ? 'Předání pacienta' : 'Po předání, vrací se na základnu';
    const detail = run.phase === 'transport' ? `Příjem za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : run.phase === 'handover' ? `Konec předání za ${Math.ceil(Math.max(0, k.until - sim.s.t) / 60)} min` : 'volná';
    const availability = remaining <= 0 ? 'Volná nyní' : run.phase === 'transport' ? `Volná přibližně za ${Math.ceil(remaining / 60)} min` : `Volná za ${Math.ceil(remaining / 60)} min`;
    return `<div class="transport-row ${run.phase}"><b>${esc(k.name)}</b><span>${esc(run.hospitalName)}</span><span>${phase} · ${detail}</span><span class="transport-time">${availability}</span></div>`;
  }).join('') : '<div class="transport-empty">Žádná posádka právě nejede do nemocnice ani se nevrací po předání.</div>');
  const L = sim.s.log, out = [], nowMs = performance.now();
  for (let i = L.length - 1; i >= 0 && out.length < 90; i--) { const e = L[i]; if (e.kind === 'crew' && (logDueAt.get(e.id) || 0) > nowMs) continue; const kind = e.kind === 'deadline' ? 'alert' : e.kind, vj = isVstricnaRadioMessage(e.txt); out.push(`<div class="k-${kind}${vj ? ' k-vstricna' : ''} ${e.cid ? 'click' : ''}" ${e.cid ? `data-case="${e.cid}"` : ''}><time>${e.clock}</time><span>${esc(e.txt)}</span></div>`); }
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
function voiceSay0(text, key, isCall) {
  if (!settings.sound || typeof ZOS_VOICE === 'undefined') return;
  const st = ZOS_VOICE.status().state;
  if (settings.voice && (st === 'ready' || st === 'loading')) ZOS_VOICE.say(text, key);
  else if (isCall) ZOS_VOICE.chirp(false);
}
// posádka, která právě vysílá, bliká v přehledu posádek
const talkCodes = new Set();
function setTalking(key, on) {
  const k = String(key); if (on) talkCodes.add(k); else talkCodes.delete(k);
  document.querySelectorAll(`#crews .tile[data-code="${k}"]`).forEach(el => el.classList.toggle('talking', on));
}
if (typeof ZOS_VOICE !== 'undefined') ZOS_VOICE.onSpeak((key, on) => { if (key !== 'zos') setTalking(key, on); });
function voiceSay(text, key, isCall) {
  const st = typeof ZOS_VOICE !== 'undefined' ? ZOS_VOICE.status().state : 'off', real = settings.sound && settings.voice && (st === 'ready' || st === 'loading');
  if (!real && key !== 'zos' && settings.sound !== undefined) { setTalking(key, true); setTimeout(() => setTalking(key, false), Math.min(9000, 1200 + String(text).length * 65)); }
  voiceSay0(text, key, isCall);
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
function radioSpeak(txt) {
  const r = radioParse(txt);
  if (r) return voiceSay(r.text, r.key, !!r.call);
}
const radioOpen = () => (sim && sim.s.radioQ || []).filter(e => e.state === 'calling' || e.state === 'open' || e.state === 'zos');
const radioPending = () => sim && sim.s.radioMode === 'interactive' && radioOpen().some(e => e.state !== 'zos');
const radioSlowActive = () => !!(settings.radioSlow && radioPending());
const rqPrefetched = new Set();
const RC_DELAY = 3500, rcSeen = new Map();
// živý přepis hovoru: řádky se objevují ve chvíli, kdy je hlas řekne (skutečný čas, nezávisle na rychlosti hry); po konci zůstane RC_HOLD ms
const RC_HOLD = 6000, RC_CHAIN = 12000;
function feedChain(crid) {
  const L = radioFeed.filter(x => x.crid === crid && x.due != null); if (!L.length) return [];
  const out = [L[L.length - 1]];
  for (let i = L.length - 2; i >= 0; i--) { if (out[0].due - L[i].due <= RC_CHAIN) out.unshift(L[i]); else break; }
  return out;
}
const signOf = code => (/^K/i.test(String(code || '')) ? 'Kryštof ' + String(code).replace(/\D/g, '') : 'ZCB' + (code || ''));
function transcriptHtml(chain, now) {
  const shown = chain.filter(x => x.due <= now);
  if (!shown.length) return '';
  const code = (sim.crewOf(chain[0].crid) || {}).code;
  return `<div class="rc-chat">${shown.map((x, i) => `<div class="rc-bub ${x.who}${i === shown.length - 1 && now - x.due < 3500 ? ' now' : ''}"><span class="rc-who">${x.who === 'zos' ? 'ZCB101 · ZOS' : esc(code ? signOf(code) : (chain[0].txt.match(/^ZCB101, zde ([^,]+),/) || [0, 'soused'])[1]) + ' · ' + (code ? 'posádka' : 'operační středisko')}</span>${esc(x.text)}</div>`).join('')}</div>`;
}
// nejnovější hovor, který se ještě vysílá nebo před chvílí skončil (pro automatický režim a po odpovědi dispečera)
function liveSession(now) {
  const heard = radioFeed.filter(x => x.due != null && x.due <= now); if (!heard.length) return null;
  const last = heard[heard.length - 1], chain = feedChain(last.crid), pending = chain.some(x => x.due > now);
  if (!pending && now - last.due > RC_HOLD) return null;
  const lab = (/^ZCB101, zde ([^,]+),/.exec((chain.find(x => x.who === 'crew') || {}).txt || '') || [])[1] || '';
  return { crid: last.crid, cid: last.cid, chain, label: lab };
}
function renderRadioLive() {
  const box = $('radio-live'); if (!box || !sim) return;
  const list = radioOpen().slice(-4), now = performance.now();
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
    const tr = transcriptHtml(feedChain(e.crewId), now);
    return `<div class="radio-call open${red}"><div class="rc-head"><span class="rc-ico" aria-hidden="true">📻</span><b>${esc(sign)}</b>${flag}${tr ? '' : `<span class="rc-msg">${esc(e.msg)}</span>`}${tag}</div>${tr}<span class="rc-opts">${(e.opts || []).map((o, i) => [o, i]).sort((x, y) => ((x[1] * 7 + e.id.length * 3 + Number(e.id.slice(2))) % 5) - ((y[1] * 7 + e.id.length * 3 + Number(e.id.slice(2))) % 5)).map(([o]) => `<button class="btn" data-act="rq-reply" data-rq="${e.id}" data-k="${esc(o.k)}">${esc(o.label)}</button>`).join('')}</span></div>`;
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
const logDueAt = new Map(); let logLastDue = 0;
const radioFeed = [];   // rádiové hlášky s časem vyslovení (skutečný čas); zdroj živého přepisu v panelu Rádio
function pollLog() {
  let vstricnaIncoming = false;
  for (const e of sim.s.log) {
    if (e.id <= seenLog) continue;
    seenLog = e.id;
    if (e.kind === 'crew') { const now = performance.now(), due = Math.max(now + 4000, logLastDue + 2300); logLastDue = due; logDueAt.set(e.id, due); if (logDueAt.size > 400) logDueAt.delete(logDueAt.keys().next().value); setTimeout(() => { if (sim) renderRadio(); }, due - now + 60); }
    if (e.kind === 'crew') { const rp = radioParse(e.txt); if (rp) { radioFeed.push({ id: e.id, due: logDueAt.get(e.id), who: rp.who, key: rp.key, txt: e.txt, text: rp.who === 'zos' ? e.txt.replace(/^ZCB101: /, '').replace(/^ZCB\d+, ZCB101: /, '') : rp.text, crid: e.crid, cid: e.cid }); if (radioFeed.length > 80) radioFeed.shift(); } }
    if (e.kind === 'crew' && !satellitePanel) radioSpeak(e.txt);
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
async function checkUpdate(btn) {
  const set = t => { if (btn) btn.textContent = t; };
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
    '50 b. volba posádky: plný počet za nejrychlejší dostupnou RZP. Vzdálenější posádka body nebere, pokud by nejbližší nechala svou oblast bez volné RZP. Absolutní dojezdový čas se netrestá.',
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
<b>Datum a hodina začátku</b><div class="opts"><input type="date" id="opt-date" value="${esc(o.date || new Date().toISOString().slice(0, 10))}" max="${new Date().toISOString().slice(0, 10)}"> <select id="opt-hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${Number(o.hour) === h ? ' selected' : ''}>${h}:00</option>`).join('')}</select></div>
<p style="font-size:12px;margin:2px 0;color:#5a6a7a">Počasí se stáhne podle data (historická data; u dnešního a budoucího data nebo bez sítě se simuluje).</p>
${o.mode === 'shift' ? `<b>Počáteční stav kraje</b><div class="opts">${b('startState', 'clean', 'Načisto · 0 výjezdů')}${b('startState', 'running', 'Rozjetý kraj · rozpracované události')}</div>` : ''}
<b>Vytížení</b><div class="opts">${b('diff', 0.8, 'Klidné')}${b('diff', 1, 'Běžné')}${b('diff', 1.4, 'Nálož')}</div>
<b>Sekundární převozy</b><div class="opts">${b('secondaryEnabled', 'true', 'Zapnuté')}${b('secondaryEnabled', 'false', 'Vypnuté')}</div>
<b>Mimořádná událost (MU)</b><div class="opts">${b('muEnabled', 'true', 'Povoleno')}${b('muEnabled', 'false', 'Vypnuto')}</div>
<label style="display:block;margin:8px 0 2px">Pravděpodobnost MU během směny: <b id="mu-prob-value">${Number(o.muProbability)} %</b></label><input id="mu-probability" type="range" min="0" max="100" step="5" value="${Number(o.muProbability)}" style="width:min(380px,90%)" ${o.muEnabled === 'false' ? 'disabled' : ''}>
${liberoHtml}
<p style="font-size:12px">Tip: čekající případy jsou v seznamu vlevo. Klikni na případ, otevři „Navrhnout posádku“ a vyšli nejbližší. N1 vždy s lékařem (RV). N3 jede RZP, lékař jen na vyžádání posádky. Doporučené rychlosti 5× až 30×.</p>
<p style="font-size:12px;color:#5a6a7a">Stav: ${assetsState}</p>${appInstallHtml()}<button class="btn pri" data-act="start" style="font-size:15px;padding:7px 18px">Začít směnu</button> <button class="btn" data-act="rules" data-back="shift">Pravidla a hodnocení</button> <button class="btn" data-act="home">‹ Zpět</button></div>`);
}
function endModal() {
  const sm = sim.summary(), s = sim.s;
  const worst = s.cases.filter(c => c.status === 'closed' && c.score).sort((a, b) => a.score.total - b.score.total).slice(0, 5);
  const why = c => { const sc = c.score, L = [['pozdní vyslání', 20 - sc.delay], ['volba vzdálenější posádky', 50 - sc.arrive], ['lékař', 15 - sc.rv], ['volba posádky', 15 - sc.eff], ['přesměrování', sc.pen]].sort((a, b) => b[1] - a[1]); return c.unserved ? 'neobslouženo' : L[0][0]; };
  const rank = sm.total >= 92 ? 'Dispečer na jedničku' : sm.total >= 80 ? 'Spolehlivý dispečer' : sm.total >= 65 ? 'Slušný praktikant' : sm.total >= 45 ? 'Ještě potrénuj' : 'Katastrofa na lince';
  const m = (l, v) => `<tr><td style="padding:2px 14px 2px 0;color:#5a6a7a">${l}</td><td><b>${v}</b></td></tr>`;
  modal(`<div class="card"><h1>Vyhodnocení</h1><div class="big">${sm.total.toFixed(1)} <span style="font-size:15px;font-family:var(--sans)">/ 100 · ${rank}</span></div>
<div class="bar"><i style="width:${Math.min(100, sm.total)}%"></i></div>
<table style="margin:10px 0;width:auto">${m('Průměrné hodnocení případů', sm.caseAvg.toFixed(1))}${m('Pokrytí území', sm.coverage.toFixed(0) + ' %')}${m('Případů celkem', sm.cases)}${m('Neobslouženo', sm.unserved)}${m('N1 průměrně k pacientovi', sm.avgN1 == null ? '–' : (sm.avgN1 / 60).toFixed(1) + ' min')}${m('Příjezd do 20 min od vyslání', sm.legalPct == null ? '–' : sm.legalPct.toFixed(0) + ' %')}${m('Přesměrování posádek', sm.diversions)}${m('Dokončené sekundární převozy', sm.secondaryCompleted)}${m('Sekundární převozy v toleranci ±15 min', sm.secondaryOnTime)}${m('Průměr bodů za sekundární převoz', sm.secondaryAvg == null ? '–' : sm.secondaryAvg.toFixed(0) + ' / 100')}</table>
${sm.opsPoints || sm.opsLog.length ? `<p>Provozní body: <b>${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints}</b> · základní skóre ${sm.baseTotal.toFixed(1)}</p>${sm.opsLog.length ? `<details open><summary>Za co byly provozní body (${sm.opsLog.length})</summary><ul style="max-height:180px;overflow:auto">${sm.opsLog.slice().reverse().map(x => `<li>${sim.clockAt(x.t)} · ${x.delta > 0 ? '+' : ''}${x.delta} b. · ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}` : ''}
${lzsEndHtml(sm)}
${worst.length ? '<b>Nejhorší případy</b><table style="margin-top:4px">' + worst.map(c => `<tr><td style="padding:2px 10px 2px 0">${c.num} N${c.nOrig}</td><td style="padding-right:10px">${esc(c.klasif)}</td><td><b>${Math.round(c.score.total)}</b> · ${why(c)}</td></tr>`).join('') + '</table>' : ''}
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
  sim = new Sim({ date, weather, mode: o.mode, startHour: Number(o.hour), diff: Number(o.diff), secondaryEnabled: o.secondaryEnabled !== 'false', muEnabled: o.muEnabled !== 'false', muProbability: Number(o.muProbability), startState: o.startState, libero: o.libero, radio: settings.radioInteractive ? 'interactive' : 'auto', seed });
  applyVoice();
  afterLoad(); speed = settings.speed; savedSpeed = settings.speed;
  closeModal(); toast(o.mode === 'shift' && o.startState === 'running' ? 'Směna začala s rozpracovanými událostmi; jedna posádka už je na cestě.' : 'Směna začala. Čekající případy jsou vlevo.', '');
}
function afterLoad() { radioFeed.length = 0; sel = { c: null, k: null }; seenLog = sim.s.logId; tabCase = 'waiting'; caseSearch = ''; $('case-search').value = ''; vb = { x: 30, y: 30, w: 970, h: 940 }; renderToolsOnce(); render(); }
function doSave() { if (sim.s.scripted) return; try { localStorage.setItem(SAVE_KEY, sim.serialize()); } catch (e) {} }
function resume() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} applyVoice(); try { sim = Sim.restore(localStorage.getItem(SAVE_KEY)); afterLoad(); speed = settings.speed; savedSpeed = settings.speed; closeModal(); } catch (e) { homeModal(); } }
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
    sim.step(dt * (radioSlowActive() ? Math.min(speed, 1) : speed));
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
    case 'install-app': if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; if (!sim) homeModal(); }); } break;
    case 'start': { const di = $('opt-date'); if (di && di.value) window._opt.date = di.value; const hi = $('opt-hour'); if (hi) window._opt.hour = Number(hi.value); saveOpts(); newGame(); break; }
    case 'tutorial': startTutorial(); break;
    case 'tut-next': tutNext(true); break;
    case 'tut-skip': tutEnd(); break;
    case 'test-voice': applyVoice(); if (typeof ZOS_VOICE !== 'undefined') ZOS_VOICE.demo(); break;
    case 'rq-zos': if (sim) { sim.radioZosCall(d.rq); pollLog(); render(); } break;
    case 'rq-answer': if (sim) { sim.radioAnswer(d.rq); pollLog(); render(); } break;
    case 'rq-reply': if (sim) { sim.radioReply(d.rq, d.k); pollLog(); render(); } break;
    case 'home': homeModal(); break;
    case 'newshift': window._opt = null; shiftModal(); break;
    case 'newshift-keep': shiftModal(); break;
    case 'settings': settingsModal(!!sim); break;
    case 'changelog': changelogModal(); break;
    case 'check-update': checkUpdate(el); break;
    case 'test-sound': beep(660); beep(880, 0.15); break;
    case 'reset-settings': settings = Object.assign({}, SET_DEF); saveSettings(); applyTheme(); settingsModal(window._setFromGame); break;
    case 'del-save': if (confirm('Opravdu smazat uloženou směnu?')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} homeModal(); } break;
    case 'open-map': openPanelWindow('map'); break;
    case 'open-radio': openPanelWindow('radio'); break;
    case 'toggle-map-main': toggleMainPanel('map'); break;
    case 'toggle-radio-main': toggleMainPanel('radio'); break;
    case 'fullscreen-map': toggleMapFullscreen(); break;
    case 'resume': resume(); break;
    case 'again': try { localStorage.removeItem(SAVE_KEY); } catch (e) {} shiftModal(); break;
    case 'close': closeModal(); break;
    case 'sug': sugOpen = !sugOpen; break;
    case 'assign': { const r = sim.assign(d.case, d.crew, d.role || undefined); if (!r.ok) toast(r.msg, 'warn'); else { sel.c = d.case; beep(520); } break; }
    case 'reassign': { const r = sim.reassign(d.crew, d.case); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'cancel': { const r = sim.cancelAssignment(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Posádka odvolána.', ''); break; }
    case 'vj-decline': { const r = sim.declineVstricna(d.case); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'rules': rulesModal(el && el.dataset.back); break;
    case 'prealert': { const r = sim.prealert(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Předpoplach: ' + r.crews.join(', ') + '. Posádky nevyjíždějí.', 'alert'); break; }
    case 'send-fr': { const r = sim.sendFr(d.case, d.fr); toast(r.msg, r.ok ? '' : 'warn'); break; }
    case 'zzum-flag': { const cs = sim.caseOf(d.case), r = sim.setZzumFlag(d.case, !(cs && cs.zzumFlag)); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'drive-n': { const r = sim.setDriveUrgency(d.crew, d.n); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'ret-n3': { const r = sim.requestReturnN3(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Návrat v režimu N3 nařízen.', ''); break; }
    case 'n2-dynamic': { const r = sim.convertN2Dynamic(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Výzva změněna na dynamickou.', ''); break; }
    case 'lzs-consult': { const r = sim.consultLzsPilot(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Čeká se na textové rozhodnutí pilota LZS.', 'alert'); break; }
    case 'lzs-tech': { const r = sim.requestLzsTechnicalAssist(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Technická součinnost HZS vyžádána.', 'alert'); break; }
    case 'mu-role': { const r = sim.setMuDispatcher(d.role); if (!r.ok) toast(r.msg, 'warn'); else toast(d.role === 'mu' ? 'Přebíráš běžný provoz; kolega řeší MU.' : 'Přebíráš MU; kolega řeší běžný provoz.', ''); break; }
    case 'mu-request': { const r = sim.requestMuModule(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Požadavek na modul MU předán do dispečinku.', 'alert'); break; }
    case 'mu-hospitals': { const r = sim.requestMuHospitalInfo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Vyžádána informace o kapacitách nemocnic.', ''); break; }
    case 'mu-reinforce': { const r = sim.requestMuReinforcement(d.case, d.count); if (!r.ok) toast(r.msg, 'warn'); else { sugOpen = true; toast('Požadavek na posily předán; můžeš vybrat volné posádky RZP.', 'alert'); } break; }
    case 'mu-hospital': { const r = sim.chooseMuHospital(d.case, d.hospital); if (!r.ok) toast(r.msg, 'warn'); else toast('Další transporty budou směrovány podle zvolené nemocnice.', ''); break; }
    case 'mu-landing': { const r = sim.requestMuLandingInfo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Ověření plochy předáno, čeká se na odpověď z místa.', ''); break; }
    case 'lzs-support': { const r = sim.requestLzsSupport(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else { toast(r.msg, ''); beep(660); } break; }
    case 'libero': { const r = sim.attachLibero(d.crew, d.lib || undefined); if (!r.ok) toast(r.msg, 'warn'); else toast(`${sim.crewOf(d.crew).name}: lékař LIBERO ve voze`, ''); break; }
    case 'unlibero': { const r = sim.removeLibero(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('LIBERO odpřaženo od posádky.', ''); break; }
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
  if (e && e.closest('[data-drop-case]')) { const el = e.closest('[data-drop-case]'); return { dataset: { case: el.dataset.dropCase }, classList: el.classList }; }
  const ct = e && e.closest('.tile[data-crew]');
  if (ct && !ct.closest('#modal') && !/^x-/.test(ct.dataset.crew)) return { dataset: { crew: ct.dataset.crew }, classList: ct.classList };
  const id = glCaseAt(x, y); return id ? { dataset: { case: id }, classList: { add() {}, remove() {} } } : null;
}
// vstřícná jízda přetažením: periferní RZP s pacientem ↔ volná RZP z oblasti u nemocnice
function dropOnCrew(aId, bId) {
  const a = sim.crewOf(aId), b = sim.crewOf(bId); if (!a || !b || a.id === b.id) return;
  for (const [pri, hlp] of [[a, b], [b, a]]) {
    const cs = pri.caseId && sim.caseOf(pri.caseId);
    if (cs && cs.vstricna && cs.vstricna.state === 'offered' && cs.vstricna.primaryCrewId === pri.id) {
      const r = sim.assignVstricna(cs.id, hlp.id); sel.c = cs.id; sel.k = hlp.id;
      toast(r.ok ? `${hlp.name} → vstřícná jízda k ${pri.name}` : r.msg, r.ok ? '' : 'warn'); render(); return;
    }
  }
  toast('Posádky lze propojit jen při vstřícné jízdě: pacient musí být schopen překladu a periferní RZP ho veze.', 'warn');
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
  if (tg.dataset.crew && !tg.dataset.case && !tg.dataset.dropCase) { if (!/^x-/.test(d.id)) dropOnCrew(d.id, tg.dataset.crew); return; }
  if (/^x-/.test(d.id)) {
    const acs = sim.caseOf(tg.dataset.case || tg.dataset.dropCase); if (!acs) return;
    const r = sim.sendAgency(acs.id, d.id.slice(2)); sel.c = acs.id;
    toast(r.ok ? (r.msg || `${{ cor: 'Koroner', pcr: 'PČR', hzs: 'HZS', fr: 'FR' }[d.id.slice(2)]} → ${acs.num}`) : r.msg, r.ok ? '' : 'warn'); render(); return;
  }
  const k = sim.crewOf(d.id), cs = sim.caseOf(tg.dataset.case || tg.dataset.dropCase); if (!k || !cs) return;
  sel.k = k.id; sel.c = cs.id;
  if (k.ext && k.state === 'off') { const rr = sim.requestNeighbor(cs.id, k.id); toast(rr.msg, rr.ok ? '' : 'warn'); if (rr.ok) beep(660); render(); return; }
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
  if (ev.target && ev.target.id === 'opt-hour') { window._opt.hour = Number(ev.target.value); saveOpts(); return; }
  if (ev.target && ev.target.id === 'opt-date') { window._opt.date = ev.target.value; saveOpts(); return; }
  if (ev.target && ev.target.id === 'mu-probability') { window._opt.muProbability = Number(ev.target.value); saveOpts(); const out = $('mu-prob-value'); if (out) out.textContent = `${ev.target.value} %`; }
});
document.addEventListener('change', ev => {
  if (ev.target && ev.target.id === 'tts-url') { settings.ttsUrl = ev.target.value.trim(); saveSettings(); applyVoice(); const el = $('voice-status'); if (el) el.textContent = voiceStatusText(); }
});
document.addEventListener('click', ev => {
  if (suppressClick) { ev.preventDefault(); return; }
  const t = ev.target;
  const se = t.closest('[data-set]');
  if (se) { const k = se.dataset.set, v = se.dataset.val; settings[k] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v); saveSettings(); applyTheme(); if (k === 'speed' && sim) { speed = settings.speed; savedSpeed = speed; } if (['voice', 'sound', 'volume', 'voiceTempo', 'voiceEngine'].includes(k)) applyVoice(); if (k === 'radioInteractive' && sim) sim.setRadioMode(settings.radioInteractive ? 'interactive' : 'auto'); settingsModal(window._setFromGame); return; }
  const o = t.closest('[data-opt]'); if (o) { window._opt[o.dataset.opt] = o.dataset.val; shiftModal(); return; }
  const lm = t.closest('[data-libmode]'); if (lm) { window._opt.libero.modes[lm.dataset.libmode] = lm.dataset.val; window._libOpen = true; shiftModal(); return; }
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
  const ct = t.closest('[data-cov-type]'); if (ct) { settings.covType = ct.dataset.covType; saveSettings(); covStep(true); renderToolsOnce(); return; }
  const cl = t.closest('[data-cov-lim]'); if (cl) { settings.covLimit = Number(cl.dataset.covLim); saveSettings(); covStep(true); renderToolsOnce(); return; }
  const ly = t.closest('[data-layer]'); if (ly) {
    const k = ly.dataset.layer;
    if (k === 'cov' && !layers.cov && !(GL && glReady)) { toast('Vrstva pokrytí potřebuje plnou mapu (MapLibre).', 'warn'); return; }
    layers[k] = !layers[k]; renderToolsOnce(); glApplyLayers(); if (k === 'cov' && layers.cov) covStep(true); render(); return;
  }
  const ho = t.closest('[data-hosp]'); if (ho) { toast('Avízo předáno: ' + D.hospitals.find(h => h.id === ho.dataset.hosp).name, ''); return; }
  if (t.closest('#map')) return;
  // klik do volného místa pod případy sbalí všechny karty (žádný není rozkliknutý do detailu)
  if (t.closest('#cases') && !t.closest('[data-case]') && !t.closest('[data-crew]') && !t.closest('button') && !t.closest('input')) { if (sel.c) { sel.c = null; syncSelectionToMain(); render(); } return; }
  const ck = t.closest('[data-crew]'), cc = t.closest('[data-case]');
  if (ck && !t.closest('#modal')) {
    ev.preventDefault();
    if (/^x-/.test(ck.dataset.crew)) { toast('Přetáhni dlaždici na případ – ZOS vyrozumí ' + ({ 'x-cor': 'koronera', 'x-pcr': 'PČR', 'x-hzs': 'HZS', 'x-fr': 'nejbližšího first respondera' }[ck.dataset.crew]) + '.', ''); return; }
    sel.k = ck.dataset.crew;
    if (t.closest('.tile')) { followK = followK === sel.k ? null : sel.k; followLast = 0; if (followK) { const fk = sim.crewOf(followK); toast(`Sleduji ${fk.name} na mapě (posunutím mapy nebo dalším klikem zrušíš).`, ''); } }
    syncSelectionToMain();
    if (ck.dataset.ptt) { const k = sim.crewOf(sel.k); toast(`${k.name}: spojení v pořádku, ${STLAB[k.state].toLowerCase()}.`, ''); }
    render(); return;
  }
  if (cc) {
    ev.preventDefault();
    if (t.closest('#cases') && sel.c === cc.dataset.case && !t.closest('[data-crew]') && !t.closest('button, a, input, summary, [data-act]')) { sel.c = null; syncSelectionToMain(); render(); return; }
    selectCaseFromElement(cc, t);
  }
});
$('btn-end').addEventListener('click', () => { if (sim) { sim.s.ended = true; speed = 0; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} endModal(); } });
// mapa: výběr a posun
(function () {
  const svg = $('map'), wrap = $('mapwrap'); let mapDrag = null;
  wrap.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (ev.target.closest('#maptools,#covbar,.maplibregl-ctrl')) return;
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
window.addEventListener('keydown', ev => {
  if (ev.key === ' ' && sim && !modalOpen) { ev.preventDefault(); speed = speed ? 0 : savedSpeed; }
  if ((ev.key === 'p' || ev.key === 'P') && sim && !modalOpen && !/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || '')) { const e = radioOpen().find(x => x.state === 'calling'); if (e) { sim.radioAnswer(e.id); pollLog(); render(); } }
});
window.__zos = { get sim() { return sim; }, step: s => sim && sim.step(s), feed: () => radioFeed.slice() }; Object.defineProperty(window, '__zosMap', { get: () => GL });
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
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (!sim && modalOpen && !window._opt) homeModal(); });
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
]).then(() => { assetsState = ROUTER.ready ? 'mapa a silniční síť načteny' : 'mapová data se nenačetla, běží zjednodušená mapa'; if (!sim && !satellitePanel) homeModal(); });
if (!satellitePanel) { applyTheme(); homeModal(); }
})();
