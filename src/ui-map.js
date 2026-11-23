// UI – Mapa, vrstva pokrytí, MapLibre (části se v build.py skládají v tomto pořadí do jednoho skriptu).
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
      for (const s of ['routes', 'stations', 'hosp', 'heliport', 'fr', 'nb', 'cases', 'crews', 'izs']) GL.addSource(s, { type: 'geojson', data: empty });
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
      // PČR (modrý) a HZS (červený) trojúhelník: stejný tvar, jen jiná barva; po najetí se ukáže hlídka / CAS apod.
      {
        const triSvg = c => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="26" viewBox="0 0 22 26"><path d="M11 2 L20 23 L2 23 Z" fill="${c}" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>`;
        svgIcon('zos-izs-hzs', triSvg('#ff9a9a'), 22, 26, () => svgIcon('zos-izs-pcr', triSvg('#8fd0ff'), 22, 26, () => {
          if (GL.getLayer('izs')) return;
          GL.addLayer({ id: 'izs', type: 'symbol', source: 'izs', layout: { 'icon-image': ['get', 'ico'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 13, 0.9], 'icon-rotate': ['get', 'hd'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.crews ? 'visible' : 'none' } }, 'cases');
          const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
          GL.on('mousemove', 'izs', e => { const p = e.features[0].properties; GL.getCanvas().style.cursor = 'pointer'; pop.setLngLat(e.lngLat).setHTML(`<b>${esc(p.label)}</b><br>${esc(p.who)} · ${esc(p.num)}`).addTo(GL); });
          GL.on('mouseleave', 'izs', () => { pop.remove(); GL.getCanvas().style.cursor = ''; });
        }));
      }
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
      // vrtulník na mapě: větší obrysová ikona, při letu doleva zrcadlená
      const heliSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="35" viewBox="0 0 60 35">${HELI_BODY}</svg>`;
      const heliSvgL = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="35" viewBox="0 0 60 35"><g transform="translate(60 0) scale(-1 1)">${HELI_BODY}</g></svg>`;
      svgIcon('zos-heli-l', heliSvgL, 60, 35, () => {
        svgIcon('zos-heli', heliSvg, 60, 35, () => {
          if (GL.getLayer('crews-heli')) return;
          GL.addLayer({ id: 'crews-heli', type: 'symbol', source: 'crews', filter: ['==', ['get', 'type'], 'LZS'], layout: { 'icon-image': ['get', 'hico'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.62, 13, 1.05], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': layers.crews ? 'visible' : 'none' }, paint: { 'icon-opacity': 1 } }, GL.getLayer('cases') ? 'cases' : undefined);
        });
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
        if (ctMapClick(e)) return;
        const f = GL.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['cases', 'crews', 'crews-base'].concat(GL.getLayer('crews-ico') ? ['crews-ico'] : []) });
        if (!f.length) return;
        const c = f.find(x => x.layer.id === 'cases');
        if (c) sel.c = c.properties.id; else sel.k = f[0].properties.id;
        syncSelectionToMain();
        render();
      };
      ctGlInit();
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
  vis(['cov', 'cov-gaps'], layers.cov); vis(['fr-aed', 'fr-l'], layers.fr); vis(['crews', 'crews-base', 'crews-ico', 'crews-mu', 'crews-heli', 'crews-l', 'crews-base-l', 'izs'], layers.crews); vis(['cases', 'cases-t', 'cases-l'], layers.cases);
}
function glRoute(kk, col) {
  const m = kk.mv; if (!m) return null;
  const p = sim.pos(kk), f = Math.max(0, Math.min(1, (sim.s.t - m.t0) / Math.max(1, m.t1 - (m.dw || 0) - m.t0)));
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
    crews.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: k.id, name: k.name, code: k.code, state: k.state, type: k.type, sel: sel.k === k.id, spd: sel.k === k.id ? ' · ' + crewSpeedText(k) : '', hico: k.mv && k.mv.b[1] < p.lon ? 'zos-heli-l' : 'zos-heli', ico: `zv-${k.type === 'RV' ? 'rv' : 'amb'}-${VSTATE[k.state] || 'red'}-${k.mv ? (k.mv.b[1] >= p.lon ? 'r' : 'l') : 'r'}` } });
  }
  const c = sel.c && sim.caseOf(sel.c), k = sel.k && sim.crewOf(sel.k);
  const selectedCrews = new Set(c ? c.crews : []);
  for (const crew of sim.s.crews) if (crew.mv) {
    const col = selectedCrews.has(crew.id) ? '#2f7de1' : crew.id === sel.k ? '#d9372c' : crew.state === 'free' ? '#3b9b49' : crew.state === 'transport' ? '#e28a22' : '#bb3b32';
    const r = glRoute(crew, col); if (r) routes.push(r);
  }
  GL.getSource('cases').setData({ type: 'FeatureCollection', features: cases });
  GL.getSource('crews').setData({ type: 'FeatureCollection', features: crews });
  if (GL.getSource('izs')) GL.getSource('izs').setData({ type: 'FeatureCollection', features: sim.izsVisible(sim.s.t).map(v => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [v.lon, v.lat] }, properties: { ico: v.u.kind === 'pcr' ? 'zos-izs-pcr' : 'zos-izs-hzs', hd: Math.round(v.hd), label: v.u.label, who: v.u.who, num: v.cs.num } })) });
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

// heliport pod ukazatelem (pro přetažení RZP na heliport)
function glHeliAt(x, y) {
  if (!glReady) return null;
  const r = GL.getCanvas().getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const px = x - r.left, py = y - r.top;
  const f = GL.queryRenderedFeatures([[px - 12, py - 12], [px + 12, py + 12]], { layers: ['heliport'] });
  if (!f.length) return null;
  const c = f[0].geometry.coordinates; return { lat: c[1], lon: c[0] };
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
      const f = clampF((sim.s.t - m.t0) / Math.max(1, m.t1 - (m.dw || 0) - m.t0)); let pts = `${X(p.lon).toFixed(1)},${Y(p.lat).toFixed(1)} `;
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
  if (layers.crews) for (const v of sim.izsVisible(sim.s.t)) {   // PČR (modrý) / HZS (červený) trojúhelník, po najetí popis
    const x = X(v.lon), y = Y(v.lat), r = 5.5 * sc;
    h += `<path d="M${x} ${y - r}L${x + r * 0.85} ${y + r * 0.8}H${x - r * 0.85}Z" fill="${v.u.kind === 'pcr' ? '#8fd0ff' : '#ff9a9a'}" stroke="#000" stroke-width="${1.3 * sc}" stroke-linejoin="round" transform="rotate(${Math.round(v.hd)} ${x} ${y})"><title>${esc(v.u.label)} · ${esc(v.u.who)} · ${esc(v.cs.num)}</title></path>`;
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
