// Router nad kompletní silniční sítí OSM (graph.bin). Trasy, odhady jízdy a pokrytí.
const ROUTER = (function () {
  // km/h pro jízdu N2/N3 s VRZ (limit + 30: dálnice 150, mimo obec 120; na hůře sjízdných silnicích méně): dálnice, I. tř. (trunk), I. tř., II. tř., III. tř., místní, účelové
  const KPH = [150, 120, 109, 94, 79, 55, 33], CONN_KPH = 25;
  const KM_LAT = 111.19, KM_LON = 111.19 * Math.cos(49.1 * Math.PI / 180);
  const GC = 0.01;
  let N = 0, M = 0, nlat, nlon, eu, ev, ecls, elen, eptsOff, P, adjOff, adjE, grid, ready = false;
  const cache = new Map(), CACHE_MAX = 40;
  const km = (a, b, c, d) => { const x = (c - a) * KM_LAT, y = (d - b) * KM_LON; return Math.sqrt(x * x + y * y); };
  const spk = cls => 3.6 / KPH[cls]; // s/m
  // napojení bodu na síť: krátké úseky pomalu (vjezd, dvůr), dlouhé (cíl mimo kraj, např. Jihlava) jako běžná silnice s objížďkou
  const conn = dk => dk <= 1 ? dk / CONN_KPH * 3600 : (1 / CONN_KPH + (dk - 1) * 1.25 / 75) * 3600;

  function init(buf) {
    const dv = new DataView(buf); let o = 0;
    N = dv.getUint32(0, true); M = dv.getUint32(4, true); const NP = dv.getUint32(8, true); o = 12;
    nlat = new Float64Array(N); nlon = new Float64Array(N);
    for (let i = 0; i < N; i++) { nlat[i] = dv.getInt32(o, true) / 1e5; nlon[i] = dv.getInt32(o + 4, true) / 1e5; o += 8; }
    eu = new Uint32Array(M); ev = new Uint32Array(M); ecls = new Uint8Array(M); elen = new Float32Array(M); eptsOff = new Uint32Array(M + 1);
    const nm = new Uint16Array(M);
    for (let i = 0; i < M; i++) { eu[i] = dv.getUint32(o, true); ev[i] = dv.getUint32(o + 4, true); ecls[i] = dv.getUint8(o + 8); nm[i] = dv.getUint16(o + 9, true); elen[i] = dv.getUint32(o + 11, true); o += 15; }
    // body hran: u, mezibody, v
    let tot = 0; for (let i = 0; i < M; i++) { eptsOff[i] = tot; tot += nm[i] + 2; } eptsOff[M] = tot;
    P = new Float64Array(tot * 2);
    for (let i = 0; i < M; i++) {
      let k = eptsOff[i] * 2;
      P[k++] = nlat[eu[i]]; P[k++] = nlon[eu[i]];
      for (let j = 0; j < nm[i]; j++) { P[k++] = dv.getInt32(o, true) / 1e5; P[k++] = dv.getInt32(o + 4, true) / 1e5; o += 8; }
      P[k++] = nlat[ev[i]]; P[k++] = nlon[ev[i]];
    }
    const deg = new Uint32Array(N + 1);
    for (let i = 0; i < M; i++) { deg[eu[i]]++; deg[ev[i]]++; }
    adjOff = new Uint32Array(N + 1); for (let i = 0; i < N; i++) adjOff[i + 1] = adjOff[i] + deg[i];
    adjE = new Uint32Array(adjOff[N]); const fill = adjOff.slice(0, N);
    for (let i = 0; i < M; i++) { adjE[fill[eu[i]]++] = i; adjE[fill[ev[i]]++] = i; }
    grid = new Map();
    for (let i = 0; i < M; i++) for (let p = eptsOff[i]; p < eptsOff[i + 1]; p++) {
      const k = Math.floor(P[p * 2] / GC) * 100000 + Math.floor(P[p * 2 + 1] / GC);
      let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i, p - eptsOff[i]);
    }
    cache.clear(); ready = true;
  }
  // délka hrany od začátku k vrcholu vi (m), úměrně podle polohy
  function cumTo(e, vi) {
    const s = eptsOff[e], n = eptsOff[e + 1] - s; if (vi <= 0) return 0; if (vi >= n - 1) return elen[e];
    let a = 0, t = 0;
    for (let i = 1; i < n; i++) { const d = km(P[(s + i - 1) * 2], P[(s + i - 1) * 2 + 1], P[(s + i) * 2], P[(s + i) * 2 + 1]); t += d; if (i === vi) a = t; }
    return t > 0 ? a / t * elen[e] : 0;
  }
  function snap(lat, lon) {
    const ci = Math.floor(lat / GC), cj = Math.floor(lon / GC);
    let best = null, bd = 1e9;
    for (let r = 0; r < 25; r++) {
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
        if (r > 0 && Math.abs(i - ci) !== r && Math.abs(j - cj) !== r) continue;
        const a = grid.get(i * 100000 + j); if (!a) continue;
        for (let q = 0; q < a.length; q += 2) {
          const p = eptsOff[a[q]] + a[q + 1], d = km(lat, lon, P[p * 2], P[p * 2 + 1]);
          if (d < bd) { bd = d; best = { e: a[q], i: a[q + 1], d }; }
        }
      }
      if (best && bd < r * GC * KM_LON) break;
    }
    if (best) { best.c = cumTo(best.e, best.i); best.cls = ecls[best.e]; }
    return best;
  }
  function heapRun(dist, nxt, h, avoid) {
    while (h.n) {
      const [d, x] = h.pop(); if (d > dist[x]) continue;
      for (let q = adjOff[x]; q < adjOff[x + 1]; q++) {
        const e = adjE[q], y = eu[e] === x ? ev[e] : eu[e], nd = d + elen[e] * spk(ecls[e]) * (avoid && ecls[e] === 0 ? 6 : 1);
        if (nd < dist[y]) { dist[y] = nd; if (nxt) nxt[y] = e; h.push(nd, y); }
      }
    }
  }
  class Heap {
    constructor() { this.k = []; this.v = []; this.n = 0; }
    push(key, val) { const k = this.k, v = this.v; let i = this.n++; while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
    pop() {
      const k = this.k, v = this.v, tk = k[0], tv = v[0], n = --this.n, lk = k[n], lv = v[n];
      if (n > 0) { let i = 0; while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; }
      return [tk, tv];
    }
  }
  const seed = (sd, dist, h) => {
    const s = spk(sd.cls), tu = sd.c * s, tv = (elen[sd.e] - sd.c) * s;
    if (tu < dist[eu[sd.e]]) { dist[eu[sd.e]] = tu; h.push(tu, eu[sd.e]); }
    if (tv < dist[ev[sd.e]]) { dist[ev[sd.e]] = tv; h.push(tv, ev[sd.e]); }
  };
  // strom nejkratších cest k cíli
  function toTarget(sd, avoid) {
    const key = (avoid ? 'A' : '') + sd.e + ':' + sd.i;
    let r = cache.get(key);
    if (r) { cache.delete(key); cache.set(key, r); return r; }
    const dist = new Float64Array(N).fill(Infinity), nxt = new Int32Array(N).fill(-1), h = new Heap();
    seed(sd, dist, h); heapRun(dist, nxt, h, avoid);
    r = { dist, nxt, sd }; cache.set(key, r);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return r;
  }
  const atSnap = (so, dist) => {
    const s = spk(so.cls);
    return Math.min(so.c * s + dist[eu[so.e]], (elen[so.e] - so.c) * s + dist[ev[so.e]]);
  };
  function eta(a, b, c, d) {
    if (!ready) return null;
    const so = snap(a, b), sd = snap(c, d); if (!so || !sd) return null;
    let t = atSnap(so, toTarget(sd).dist);
    if (so.e === sd.e) t = Math.min(t, Math.abs(so.c - sd.c) * spk(so.cls));
    return isFinite(t) ? t + conn(so.d) + conn(sd.d) : null;
  }
  // avoid: dálnice (třída 0) penalizovaná – pro sjezd z dálnice bez otáčení
  function route(a, b, c, d, avoid) {
    if (!ready) return null;
    const so = snap(a, b), sd = snap(c, d); if (!so || !sd) return null;
    const rt = toTarget(sd, avoid), s = spk(so.cls);
    const viaU = so.c * s + rt.dist[eu[so.e]], viaV = (elen[so.e] - so.c) * s + rt.dist[ev[so.e]];
    const same = so.e === sd.e ? Math.abs(so.c - sd.c) * s : Infinity;
    if (!isFinite(Math.min(viaU, viaV, same))) return null;
    const pts = [a, b], tm = [0];
    const add = (la, lo, sec) => { pts.push(la, lo); tm.push(tm[tm.length - 1] + sec); };
    const edgeWalk = (e, i0, i1) => { // vrcholy hrany e z i0 do i1, čas úměrně délce
      const st = eptsOff[e], n = eptsOff[e + 1] - st, step = i1 > i0 ? 1 : -1, sp = spk(ecls[e]);
      let geo = 0; for (let i = 1; i < n; i++) geo += km(P[(st + i - 1) * 2], P[(st + i - 1) * 2 + 1], P[(st + i) * 2], P[(st + i) * 2 + 1]);
      const f = geo > 0 ? elen[e] / geo : 0;
      for (let i = i0 + step; step > 0 ? i <= i1 : i >= i1; i += step) {
        const j = i - step, dd = km(P[(st + j) * 2], P[(st + j) * 2 + 1], P[(st + i) * 2], P[(st + i) * 2 + 1]);
        add(P[(st + i) * 2], P[(st + i) * 2 + 1], dd * f * sp);
      }
    };
    const last = e => eptsOff[e + 1] - eptsOff[e] - 1;
    const sp0 = eptsOff[so.e] + so.i;
    add(P[sp0 * 2], P[sp0 * 2 + 1], conn(so.d));
    if (same <= Math.min(viaU, viaV)) edgeWalk(so.e, so.i, sd.i);
    else {
      let x;
      if (viaU <= viaV) { edgeWalk(so.e, so.i, 0); x = eu[so.e]; } else { edgeWalk(so.e, so.i, last(so.e)); x = ev[so.e]; }
      let g = 0;
      while (rt.nxt[x] >= 0 && g++ < 20000) {
        const e = rt.nxt[x];
        if (eu[e] === x) { edgeWalk(e, 0, last(e)); x = ev[e]; } else { edgeWalk(e, last(e), 0); x = eu[e]; }
      }
      if (eu[sd.e] === x) edgeWalk(sd.e, 0, sd.i); else edgeWalk(sd.e, last(sd.e), sd.i);
    }
    add(c, d, conn(sd.d));
    const tot = tm[tm.length - 1] || 1, Pp = [], F = [];
    for (let i = 0; i < tm.length; i++) {
      if (Pp.length && i < tm.length - 1 && (tm[i] - F[F.length - 1] * tot) < 1.5) continue;
      Pp.push(Math.round(pts[i * 2] * 1e5) / 1e5, Math.round(pts[i * 2 + 1] * 1e5) / 1e5); F.push(Math.round(tm[i] / tot * 1e5) / 1e5);
    }
    return { sec: tot, pts: Pp, frac: F };
  }
  // pokrytí: jedna vícezdrojová Dijkstra ze všech volných posádek → doba k cílovým bodům
  const tgtSnaps = new Map();
  function coverage(sources, targets) {
    if (!ready) return null;
    const dist = new Float64Array(N).fill(Infinity), h = new Heap();
    for (const [la, lo, add] of sources) {
      const so = snap(la, lo); if (!so) continue;
      const base = (add || 0) + conn(so.d), s = spk(so.cls);
      const tu = base + so.c * s, tv = base + (elen[so.e] - so.c) * s;
      if (tu < dist[eu[so.e]]) { dist[eu[so.e]] = tu; h.push(tu, eu[so.e]); }
      if (tv < dist[ev[so.e]]) { dist[ev[so.e]] = tv; h.push(tv, ev[so.e]); }
    }
    heapRun(dist, null, h);
    return targets.map(([la, lo]) => {
      const k = la + ',' + lo; let sd = tgtSnaps.get(k); if (!sd) tgtSnaps.set(k, sd = snap(la, lo));
      return sd ? atSnap(sd, dist) + conn(sd.d) : Infinity;
    });
  }
  // náhodný bod na silnici dané třídy (pro nehody)
  function randomRoadPoint(rnd, classes) {
    for (let g = 0; g < 200; g++) {
      const e = Math.floor(rnd() * M); if (!classes.includes(ecls[e])) continue;
      const st = eptsOff[e], n = eptsOff[e + 1] - st, i = Math.floor(rnd() * n);
      return { lat: P[(st + i) * 2], lon: P[(st + i) * 2 + 1], cls: ecls[e] };
    }
    // řídké třídy (dálnice): systematické hledání od náhodného místa
    const from = Math.floor(rnd() * M);
    for (let k = 0; k < M; k++) {
      const e = (from + k) % M; if (!classes.includes(ecls[e])) continue;
      const st = eptsOff[e], n = eptsOff[e + 1] - st, i = Math.floor(rnd() * n);
      return { lat: P[(st + i) * 2], lon: P[(st + i) * 2 + 1], cls: ecls[e] };
    }
    return null;
  }
  return { init, eta, route, coverage, snap, randomRoadPoint, get ready() { return ready; } };
})();
if (typeof module !== 'undefined') module.exports = ROUTER;
