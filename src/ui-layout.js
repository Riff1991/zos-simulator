// UI – Rozložení panelů (části se v build.py skládají v tomto pořadí do jednoho skriptu).
// ---------- rozložení panelů (stolní zobrazení): dělicí lišty, plovoucí okna, předvolby; zvlášť pro běžný provoz a MU ----------
const LAYOUT_KEY = 'zos_layout_v2';
const LAYOUT_WIN = { cases: 'w-cases', detail: 'w-detail', rcom: 'w-rcom', map: 'w-map', radio: 'w-radio', crews: 'w-crews', intake: 'w-intake', spider: 'w-spider' };
const LAYOUT_NAMES = { cases: 'Případy', detail: 'Panel případu', rcom: 'Rádio', map: 'Mapa', radio: 'Přehled transportů', crews: 'Posádky', intake: 'Nabírání', spider: 'Pavouk' };
// sloupce v %, v každém sloupci zásobník panelů [id, výška v %]
const LAYOUT_PRESETS = {
  normal: {
    default: { cols: [41, 29.5, 29.5], stacks: [[['cases', 31], ['detail', 40], ['rcom', 29]], [['map', 37], ['radio', 63]], [['crews', 100]]] },
    widemap: { cols: [24, 52, 24], stacks: [[['cases', 34], ['detail', 40], ['rcom', 26]], [['map', 62], ['radio', 38]], [['crews', 100]]] },
    biglist: { cols: [52, 20, 28], stacks: [[['cases', 40], ['detail', 40], ['rcom', 20]], [['map', 40], ['radio', 60]], [['crews', 100]]] },
  },
  mu: {
    default: { cols: [41, 33, 26], stacks: [[['detail', 76], ['cases', 24]], [['map', 46], ['rcom', 26], ['radio', 28]], [['crews', 100]]] },
    widemap: { cols: [30, 46, 24], stacks: [[['detail', 70], ['cases', 30]], [['map', 58], ['rcom', 22], ['radio', 20]], [['crews', 100]]] },
    biglist: { cols: [50, 24, 26], stacks: [[['detail', 66], ['cases', 34]], [['map', 40], ['rcom', 30], ['radio', 30]], [['crews', 100]]] },
  },
  // calltaker: Nabírání a Mapa; Pavouk plovoucí; dispečerská okna (třetí sloupec) jen na požádání
  ct: {
    default: { cols: [62, 22, 16], stacks: [[['intake', 100]], [['map', 100]], [['cases', 20], ['detail', 20], ['rcom', 15], ['radio', 20], ['crews', 20], ['spider', 5]]] },
    widemap: { cols: [30, 48, 22], stacks: [[['intake', 100]], [['map', 100]], [['cases', 20], ['detail', 20], ['rcom', 15], ['radio', 20], ['crews', 20], ['spider', 5]]] },
  },
};
const layoutFloatsFor = key => (key === 'ct' ? { spider: { x: Math.max(20, innerWidth - 440), y: 96, w: 420, h: Math.max(320, Math.min(600, innerHeight - 130)) } } : {});
let layoutStore = { normal: null, mu: null, ct: null }, layoutZ = 60, layoutSplits = [];
try { layoutStore = Object.assign(layoutStore, JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}')); } catch (_) {}
const layoutKey = () => (ctModeOn() ? 'ct' : muModeOn() ? 'mu' : 'normal');
const layoutClone = o => JSON.parse(JSON.stringify(o));
const layoutHidden = id => (id === 'map' && mainPanelHidden.map) || (id === 'radio' && mainPanelHidden.radio) || (ctModeOn() && ((id === 'spider' && document.body.classList.contains('ct-spider-off')) || (!document.body.classList.contains('ct-disp') && ['cases', 'detail', 'rcom', 'radio', 'crews'].includes(id))));
const layoutDesktop = () => !satellitePanel && matchMedia('(min-width: 1100px)').matches && !document.body.classList.contains('map-fullscreen');
function layoutGet(key) {
  let L = layoutStore[key];
  const ok = L && Array.isArray(L.cols) && L.cols.length === 3 && Array.isArray(L.stacks) && L.stacks.length === 3 && new Set(L.stacks.flat().map(x => x[0])).size === new Set(LAYOUT_PRESETS[key].default.stacks.flat().map(x => x[0])).size;
  if (!ok) L = layoutStore[key] = Object.assign(layoutClone(LAYOUT_PRESETS[key].default), { floats: layoutFloatsFor(key) });
  if (!L.floats) L.floats = {};
  return L;
}
function layoutSave() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutStore)); } catch (_) {} }
function layoutVisible(L) {
  const stacks = L.stacks.map(st => st.filter(([id]) => !L.floats[id] && !layoutHidden(id)));
  return { stacks, vis: stacks.map((s, i) => (s.length ? i : -1)).filter(i => i >= 0) };
}
function layoutClear() {
  const main = document.querySelector('main'); if (!main) return;
  main.classList.remove('lay');
  for (const p of ['gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas']) main.style[p] = '';
  for (const id of Object.values(LAYOUT_WIN)) { const el = $(id); if (!el) continue; el.classList.remove('floating'); for (const p of ['gridColumn', 'gridRow', 'height', 'left', 'top', 'width', 'zIndex']) el.style[p] = ''; }
  for (const s of layoutSplits) s.remove();
  layoutSplits = [];
}
function layoutApply(full) {
  const main = document.querySelector('main'); if (!main) return;
  if (!layoutDesktop()) { layoutClear(); return; }
  const L = layoutGet(layoutKey()), { stacks, vis } = layoutVisible(L);
  main.classList.add('lay');
  const tot = vis.reduce((a, i) => a + L.cols[i], 0) || 1;
  main.style.gridTemplateColumns = vis.map(i => `minmax(0, ${(L.cols[i] / tot * 100).toFixed(2)}fr)`).join(' ') || 'minmax(0, 1fr)';
  main.style.gridTemplateRows = 'repeat(100, minmax(0, 1fr))'; main.style.gridTemplateAreas = 'none';
  vis.forEach((ci, pos) => {
    const st = stacks[ci], sum = st.reduce((a, x) => a + x[1], 0) || 1; let acc = 0;
    st.forEach(([id, h], k) => {
      const a = Math.round(acc / sum * 100), b = k === st.length - 1 ? 100 : Math.round((acc + h) / sum * 100); acc += h;
      const el = $(LAYOUT_WIN[id]); if (!el) return;
      el.classList.remove('floating'); for (const p of ['left', 'top', 'width', 'zIndex']) el.style[p] = '';
      el.style.gridColumn = String(pos + 1); el.style.gridRow = `${a + 1} / ${Math.max(a + 2, b + 1)}`; el.style.height = 'auto';
    });
  });
  for (const [id, wid] of Object.entries(LAYOUT_WIN)) {
    const el = $(wid); if (!el) continue;
    const r = L.floats[id], pin = el.querySelector('.pin-btn');
    if (pin) { pin.textContent = r ? '⤓' : '⧉'; pin.title = r ? 'Připnout zpět do rozložení' : 'Odepnout do plovoucího okna'; }
    if (!r || layoutHidden(id)) continue;
    const w = Math.min(Math.max(280, r.w), innerWidth - 16), h = Math.min(Math.max(160, r.h), innerHeight - 16);
    el.classList.add('floating'); el.style.gridColumn = ''; el.style.gridRow = '';
    el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.left = Math.max(0, Math.min(r.x, innerWidth - w)) + 'px'; el.style.top = Math.max(0, Math.min(r.y, innerHeight - 60)) + 'px';
    if (!el.style.zIndex) el.style.zIndex = String(layoutZ);
  }
  if (full) layoutBuildSplits();
  layoutPlaceSplits();
  if (typeof GL !== 'undefined' && GL) setTimeout(() => GL.resize(), 40);
}
function layoutBuildSplits() {
  const main = document.querySelector('main'); if (!main) return;
  for (const s of layoutSplits) s.remove();
  layoutSplits = [];
  const L = layoutGet(layoutKey()), { stacks, vis } = layoutVisible(L);
  const mk = (kind, info) => { const d = document.createElement('div'); d.className = 'split ' + kind; d._info = info; d._kind = kind; d.title = 'Tažením změníš velikost panelů'; d.addEventListener('pointerdown', layoutSplitDown); main.appendChild(d); layoutSplits.push(d); };
  vis.forEach((ci, pos) => {
    if (pos < vis.length - 1) mk('v', { ci, next: vis[pos + 1] });
    const st = stacks[ci]; for (let k = 0; k < st.length - 1; k++) mk('h', { ci, a: st[k][0], b: st[k + 1][0] });
  });
}
function layoutPlaceSplits() {
  const main = document.querySelector('main'); if (!main || !layoutSplits.length) return;
  const mr = main.getBoundingClientRect(), L = layoutGet(layoutKey()), { stacks } = layoutVisible(L);
  for (const d of layoutSplits) {
    const i = d._info;
    if (d._kind === 'v') {
      let right = 0; for (const [id] of stacks[i.ci]) { const el = $(LAYOUT_WIN[id]); if (el) right = Math.max(right, el.getBoundingClientRect().right); }
      d.style.left = (right - mr.left + 3 - 5) + 'px'; d.style.top = '0px'; d.style.height = main.clientHeight + 'px';
    } else {
      const ea = $(LAYOUT_WIN[i.a]); if (!ea) continue; const r = ea.getBoundingClientRect();
      d.style.left = (r.left - mr.left) + 'px'; d.style.width = r.width + 'px'; d.style.top = (r.bottom - mr.top + 3 - 5) + 'px';
    }
  }
}
function layoutSplitDown(ev) {
  ev.preventDefault();
  const d = ev.currentTarget, info = d._info, L = layoutGet(layoutKey()), main = document.querySelector('main');
  const { stacks, vis } = layoutVisible(L), tot = vis.reduce((a, i) => a + L.cols[i], 0);
  const find = id => L.stacks[info.ci].find(x => x[0] === id);
  const start = { x: ev.clientX, y: ev.clientY, a: d._kind === 'v' ? L.cols[info.ci] : find(info.a)[1], b: d._kind === 'v' ? L.cols[info.next] : find(info.b)[1] };
  const sum = d._kind === 'v' ? tot : stacks[info.ci].reduce((a, x) => a + x[1], 0);
  d.setPointerCapture(ev.pointerId); d.classList.add('drag');
  const move = e => {
    const dv = d._kind === 'v' ? (e.clientX - start.x) / main.clientWidth * sum : (e.clientY - start.y) / main.clientHeight * sum;
    const min = sum * 0.07; let a = start.a + dv, b = start.b - dv;
    if (a < min) { b -= min - a; a = min; } if (b < min) { a -= min - b; b = min; }
    if (d._kind === 'v') { L.cols[info.ci] = a; L.cols[info.next] = b; } else { find(info.a)[1] = a; find(info.b)[1] = b; }
    layoutApply(false);
  };
  const up = () => { d.classList.remove('drag'); d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); layoutSave(); layoutPlaceSplits(); };
  d.addEventListener('pointermove', move); d.addEventListener('pointerup', up);
}
function layoutToggleFloat(id) {
  const L = layoutGet(layoutKey()), el = $(LAYOUT_WIN[id]); if (!el) return;
  if (L.floats[id]) delete L.floats[id];
  else { const r = el.getBoundingClientRect(); L.floats[id] = { x: Math.round(r.left + 24), y: Math.round(r.top + 24), w: Math.max(320, Math.round(r.width)), h: Math.max(220, Math.round(r.height)) }; layoutZ++; el.style.zIndex = String(layoutZ); }
  layoutSave(); layoutApply(true);
}
function layoutPreset(name) {
  const key = layoutKey();
  layoutStore[key] = Object.assign(layoutClone(LAYOUT_PRESETS[key][name] || LAYOUT_PRESETS[key].default), { floats: layoutFloatsFor(key) });
  layoutSave(); layoutApply(true);
}
function layoutDockAll() { const L = layoutGet(layoutKey()); L.floats = {}; layoutSave(); layoutApply(true); }
function layoutMenu(btn) {
  const old = $('layout-menu'); if (old) { old.remove(); return; }
  const key = layoutKey(), L = layoutGet(key), m = document.createElement('div'); m.id = 'layout-menu';
  const floating = Object.keys(L.floats);
  m.innerHTML = `<b>Rozložení · ${key === 'mu' ? 'režim MU' : key === 'ct' ? 'režim calltaker' : 'běžný provoz'}</b><button class="btn" data-act="layout-preset" data-preset="default">Výchozí</button><button class="btn" data-act="layout-preset" data-preset="widemap">Široká mapa</button><button class="btn" data-act="layout-preset" data-preset="biglist">Velký seznam a detail</button>${floating.length ? `<button class="btn" data-act="layout-dock-all">Připnout zpět okna (${floating.length})</button>` : ''}<small>Velikost panelů měníš tažením lišt mezi nimi. Tlačítko ⧉ v záhlaví odepne panel do plovoucího okna (tažením za záhlaví, velikost za pravý dolní roh).</small>`;
  const r = btn.getBoundingClientRect(); m.style.left = Math.max(6, Math.min(r.left, innerWidth - 280)) + 'px'; m.style.top = (r.bottom + 4) + 'px';
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', function close(e) { if (!m.contains(e.target) || e.target.closest('[data-act]')) { m.remove(); document.removeEventListener('click', close); } }), 0);
}
function layoutInitWindows() {
  for (const [id, wid] of Object.entries(LAYOUT_WIN)) {
    const el = $(wid), h2 = el && el.querySelector('h2'); if (!el || !h2) continue;
    const pin = document.createElement('button'); pin.className = 'pin-btn'; pin.dataset.act = 'float-toggle'; pin.dataset.win = id; pin.textContent = '⧉'; pin.title = 'Odepnout do plovoucího okna'; h2.appendChild(pin);
    const rz = document.createElement('i'); rz.className = 'rz'; el.appendChild(rz);
    el.addEventListener('pointerdown', () => { if (el.classList.contains('floating')) { layoutZ++; el.style.zIndex = String(layoutZ); } }, true);
    h2.addEventListener('pointerdown', ev => {
      if (!el.classList.contains('floating') || ev.target.closest('button,input,select,a')) return;
      ev.preventDefault(); const L = layoutGet(layoutKey()), r = L.floats[id]; if (!r) return;
      const sx = ev.clientX, sy = ev.clientY, ox = r.x, oy = r.y; h2.setPointerCapture(ev.pointerId);
      const move = e => { r.x = ox + e.clientX - sx; r.y = oy + e.clientY - sy; el.style.left = Math.max(0, Math.min(r.x, innerWidth - 120)) + 'px'; el.style.top = Math.max(0, Math.min(r.y, innerHeight - 40)) + 'px'; };
      const up = () => { h2.removeEventListener('pointermove', move); h2.removeEventListener('pointerup', up); layoutSave(); };
      h2.addEventListener('pointermove', move); h2.addEventListener('pointerup', up);
    });
    rz.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation(); const L = layoutGet(layoutKey()), r = L.floats[id]; if (!r) return;
      const sx = ev.clientX, sy = ev.clientY, ow = r.w, oh = r.h; rz.setPointerCapture(ev.pointerId);
      const move = e => { r.w = Math.max(280, ow + e.clientX - sx); r.h = Math.max(160, oh + e.clientY - sy); el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; };
      const up = () => { rz.removeEventListener('pointermove', move); rz.removeEventListener('pointerup', up); layoutSave(); if (typeof GL !== 'undefined' && GL) GL.resize(); };
      rz.addEventListener('pointermove', move); rz.addEventListener('pointerup', up);
    });
  }
  const main = document.querySelector('main');
  if (main && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => layoutPlaceSplits()).observe(main);
}
if (!satellitePanel) layoutInitWindows();
function applyMainPanelLayout() {
  const main = document.querySelector('main');
  const enabled = !satellitePanel && matchMedia('(min-width: 1100px)').matches;
  main.dataset.hideMap = enabled && mainPanelHidden.map ? '1' : '0';
  main.dataset.hideRadio = enabled && mainPanelHidden.radio ? '1' : '0';
  layoutApply(true);
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
    sim.step(dt * (ctModeOn() ? ctSpeed(speed) : radioSlowActive() ? Math.min(speed, 1) : speed));
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
