// UI – Nastavení, vzhled a ikony (části se v build.py skládají v tomto pořadí do jednoho skriptu).
const D = ZOS_DATA;
const $ = id => document.getElementById(id);
const symptomsOf = c => (Array.isArray(c.sympShown) ? c.sympShown : Array.isArray(c.symptoms) && c.symptoms.length ? c.symptoms : String(c.up || '').split(',')).map(x => String(x).trim()).filter(Boolean);
const clarificationOf = c => [symptomsOf(c).join(', '), c.poznamka && `Poznámka: ${c.poznamka}`].filter(Boolean).join('; ') || '–';
const missingInitialDispatch = c => (c.initialDispatchRequired || []).filter(type => !(c.initialDispatchSent || []).includes(type));
const isVstricnaRadioMessage = text => /vstřícn|vstricn/i.test(String(text || ''));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const SPEEDS = [0, 1, 5, 10, 20, 30, 60];
const OPT_KEY = 'zos_jck_opts_v1';
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(window._opt || {})); } catch (_) {} }
let legendOpen = false, alertsExpanded = false;   // legenda posádek je výchozí sbalená; rozbalení upozornění nad mapou
try { legendOpen = localStorage.getItem('zos_legend_open') === '1'; } catch (e) {}
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

const toolState = {};
const paSel = {};   // předpoplach: vybrané posádky podle případu (id → pole id posádek); výchozí je nejbližší RZP a RV
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
const HELI_BODY = '<path d="M6 4h45" stroke="#202a31" stroke-width="2.200" stroke-linecap="round"/><path d="M29 4v5.500" stroke="#202a31" stroke-width="2.400"/><path d="M9.500 13.500 5 5.500h4l5 8z" fill="#f5c400" stroke="#202a31" stroke-width="1.500" stroke-linejoin="round"/><path d="M22 14.500 11 14v4.500l11 1.800z" fill="#f5c400" stroke="#202a31" stroke-width="1.600" stroke-linejoin="round"/><circle cx="7.500" cy="17" r="4.600" fill="#f5c400" stroke="#202a31" stroke-width="1.600"/><circle cx="7.500" cy="17" r="1.500" fill="#202a31"/><path d="M21 13.500c2.500-3.200 9-4.600 15-3.400 7 1.400 13 5.400 14.600 11 .6 2.800-1.400 5.400-4.800 5.400H27c-5.200 0-8.200-5.600-6-13z" fill="#f5c400" stroke="#202a31" stroke-width="1.800" stroke-linejoin="round"/><path d="M39 12.800c4.800.7 8.800 3.800 10.300 8H39z" fill="#cfe9f7" stroke="#202a31" stroke-width="1.100" stroke-linejoin="round"/><path d="M30.500 13.800h6.600v5.600h-6.600z" fill="#cfe9f7" stroke="#202a31" stroke-width="1.100" stroke-linejoin="round"/><path d="M25.400 17.700h2.200v2.200h2.200v2.200h-2.200v2.200h-2.200v-2.200h-2.200v-2.200h2.200z" fill="#d9342b"/><path d="M28 27.500V31m13-3.500V31M23 32h27" fill="none" stroke="#202a31" stroke-width="1.800" stroke-linecap="round"/><path d="M50 32q3 0 4-3" fill="none" stroke="#202a31" stroke-width="1.800" stroke-linecap="round"/>';
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
