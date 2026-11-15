// ZOS simulátor – počasí. Skutečná historická data (Open-Meteo archiv, jeden bod pro kraj), záloha je simulace podle sezony a seedu.
// Hodinová pole se odvozují z veřejných veličin: viditelnost a základna oblačnosti nejsou v archivu, počítají se z teploty, rosného bodu,
// srážek a kódu počasí. Vyžaduje jen globální fetch a localStorage v prohlížeči; v Node jede simulace.
const ZOS_WX = (() => {
  const LAT = 48.97, LON = 14.47;   // České Budějovice (jeden bod pro celý kraj)
  const NH = 72;                    // 3 dny po hodinách od půlnoci zadaného data
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function dayOfYear(date) { const [Y, M, D] = date.split('-').map(Number); return Math.floor((Date.UTC(Y, M - 1, D) - Date.UTC(Y, 0, 0)) / 86400000); }
  function addDays(date, n) { const [Y, M, D] = date.split('-').map(Number); return new Date(Date.UTC(Y, M - 1, D + n)).toISOString().slice(0, 10); }
  // surová pole → hodinové záznamy s odvozenými hodnotami pro letový stav a dopad na hru
  function derive(raw) {
    const out = [], n = raw.temp.length;
    for (let i = 0; i < n; i++) {
      const temp = raw.temp[i], dew = Math.min(temp, raw.dew[i]), precip = raw.precip[i] || 0, snow = raw.snow[i] || 0, code = raw.code[i] || 0;
      const cloudLow = raw.cloudLow[i] == null ? 50 : raw.cloudLow[i], wind = raw.wind[i] || 0, gust = Math.max(wind, raw.gust[i] || wind), dir = raw.dir[i] || 0;
      const spread = Math.max(0, temp - dew), hour = i % 24;
      const fog = code === 45 || code === 48 || (spread < 0.6 && (hour < 9 || hour > 20) && wind < 6);
      const thunder = code === 95 || code === 96 || code === 99;
      const shower = (code >= 80 && code <= 86) || thunder;
      // základna oblačnosti: 125 m na každý stupeň rozdílu teploty a rosného bodu (≈ 410 ft)
      let base = cloudLow < 15 ? 6000 : clamp(spread * 410, 100, 6000);
      if (precip > 0.2) base = Math.min(base, 2500);
      if (fog) base = Math.min(base, 200);
      let vis = 12000;
      if (fog) vis = Math.min(vis, 300 + spread * 400);
      else if (spread < 1.5 && wind < 8) vis = Math.min(vis, 2500 + spread * 1000);
      if (precip >= 4) vis = Math.min(vis, 2500); else if (precip >= 1) vis = Math.min(vis, 5000); else if (precip > 0.1) vis = Math.min(vis, 8000);
      if (snow >= 1) vis = Math.min(vis, 1200); else if (snow >= 0.3) vis = Math.min(vis, 3000); else if (snow > 0) vis = Math.min(vis, 6000);
      const freezing = [56, 57, 66, 67].includes(code);
      const ice = freezing || (temp <= 1.5 && temp >= -8 && precip > 0.1 && snow === 0) || (temp <= 0 && temp >= -10 && base < 2500 && cloudLow > 60 && spread < 2);
      out.push({ temp: Math.round(temp * 10) / 10, dew, precip, snow, code, cloudLow, wind, gust, dir, vis: Math.round(vis), base: Math.round(base), fog, thunder, shower, ice });
    }
    return out;
  }
  // simulace podle sezony a seedu (offline záloha, deterministická)
  function simulate(date, seed) {
    const r = rng((seed >>> 0) ^ (dayOfYear(date) * 2654435761)), doy = dayOfYear(date);
    const raw = { temp: [], dew: [], precip: [], snow: [], code: [], cloudLow: [], wind: [], dir: [], gust: [] };
    const mean = 8.5 - 11 * Math.cos(2 * Math.PI * (doy - 20) / 365), air = (r() - 0.5) * 10;
    let wet = r() < 0.35 ? 1 : 0, windBase = 4 + r() * 10, dir = r() * 360, anom = 0;
    for (let i = 0; i < NH; i++) {
      const h = i % 24;
      anom = anom * 0.97 + (r() - 0.5) * 0.9;
      const temp = mean + air * 0.6 + 4 * Math.sin(2 * Math.PI * (h - 9) / 24) + anom;
      if (r() < (wet ? 0.12 : 0.05)) wet = wet ? 0 : 1;
      const spread = wet ? 0.4 + r() * 1.2 : 1.5 + r() * 5 + (h > 12 && h < 17 ? 2 : 0);
      const precip = wet ? (r() < 0.6 ? 0.1 + r() * 1.4 : 0) : 0;
      const cold = temp < 1;
      windBase = clamp(windBase + (r() - 0.5) * 1.6, 1, 28);
      dir = (dir + (r() - 0.5) * 14 + 360) % 360;
      const wind = Math.max(0, windBase * (0.8 + r() * 0.4));
      const code = precip > 0 ? (cold ? 71 : 61) : spread < 0.6 ? 45 : (r() < 0.015 && doy > 140 && doy < 260 && temp > 18 ? 95 : 3);
      raw.temp.push(temp); raw.dew.push(temp - spread); raw.precip.push(precip); raw.snow.push(cold ? precip * 0.8 : 0); raw.code.push(code);
      raw.cloudLow.push(wet ? 60 + r() * 40 : r() * 80); raw.wind.push(wind); raw.dir.push(dir); raw.gust.push(wind * (1.25 + r() * 0.5));
    }
    return derive(raw);
  }
  const num = a => a.map(x => (x == null ? null : Number(x)));
  async function fetchReal(date) {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${date}&end_date=${addDays(date, 2)}` +
      '&hourly=temperature_2m,dew_point_2m,precipitation,snowfall,weather_code,cloud_cover_low,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=Europe%2FPrague';
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), 9000) : null;
    try {
      const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      if (!res.ok) return null;
      const j = await res.json(), h = j && j.hourly;
      if (!h || !h.temperature_2m || h.temperature_2m.length < 24) return null;
      const raw = { temp: num(h.temperature_2m), dew: num(h.dew_point_2m), precip: num(h.precipitation), snow: num(h.snowfall), code: num(h.weather_code), cloudLow: num(h.cloud_cover_low), wind: num(h.wind_speed_10m), dir: num(h.wind_direction_10m), gust: num(h.wind_gusts_10m) };
      for (let i = 0; i < raw.temp.length; i++) if (raw.temp[i] == null || raw.dew[i] == null || raw.wind[i] == null) return null;
      // doplnit na 72 h opakováním posledního dne, kdyby archiv vrátil méně
      while (raw.temp.length < NH) for (const k of Object.keys(raw)) raw[k].push(raw[k][raw[k].length - 24]);
      return derive(raw);
    } catch (e) { return null; } finally { if (to) clearTimeout(to); }
  }
  // načte počasí pro datum: z cache, ze sítě, jinak simulace; vrací { src: 'real' | 'sim', hours }
  async function load(date, seed) {
    const key = 'zos-wx-' + date;
    try { const c = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (c) { const p = JSON.parse(c); if (p && p.hours && p.hours.length >= 24) return p; } } catch (e) { /* bez cache */ }
    const today = new Date().toISOString().slice(0, 10);
    if (typeof fetch !== 'undefined' && date < today) {
      const hours = await fetchReal(date);
      if (hours) { const res = { src: 'real', hours }; try { localStorage.setItem(key, JSON.stringify(res)); } catch (e) { /* plná cache */ } return res; }
    }
    return { src: 'sim', hours: simulate(date, seed || 1) };
  }
  // pozorování v čase h (hodiny od půlnoci data); spojité veličiny interpolované, kategorie z hodiny
  function at(hours, h) {
    const n = hours.length, f = ((h % n) + n) % n, i = Math.floor(f), j = (i + 1) % n, k = f - i, a = hours[i], b = hours[j];
    const mix = (x, y) => x + (y - x) * k;
    let d = b.dir - a.dir; if (d > 180) d -= 360; if (d < -180) d += 360;
    return Object.assign({}, a, { temp: Math.round(mix(a.temp, b.temp) * 10) / 10, wind: mix(a.wind, b.wind), gust: mix(a.gust, b.gust), dir: (a.dir + d * k + 360) % 360, vis: mix(a.vis, b.vis), base: mix(a.base, b.base) });
  }
  // letový stav LZS podle minim HEMS: den 1 500 m / 300 ft, noc s NVIS 3 000 m / 1 200 ft; vítr nad 35 kt je simulované omezení
  function lzs(o, night) {
    const vmin = night ? 3000 : 1500, bmin = night ? 1200 : 300, w = Math.max(o.wind, o.gust * 0.78), why = [];
    if (o.ice) why.push('námraza');
    if (o.thunder) why.push('bouřka');
    if (o.vis < vmin) why.push(`dohlednost ${Math.round(o.vis)} m`);
    if (o.base < bmin) why.push(`základna oblačnosti ${Math.round(o.base)} ft`);
    if (w > 35 || o.gust > 50) why.push(`vítr ${Math.round(w)} kt`);
    if (why.length) return { status: 'neletovo', why };
    if (w >= 25 || o.gust >= 40) why.push(`vítr ${Math.round(w)} kt, nárazy ${Math.round(o.gust)} kt`);
    if (o.vis < vmin * 1.5) why.push(`dohlednost těsně nad minimy (${Math.round(o.vis)} m)`);
    if (o.base < bmin * 1.6) why.push(`oblačnost těsně nad minimy (${Math.round(o.base)} ft)`);
    if (o.shower) why.push('přeháňky');
    if (o.fog) why.push('lokální mlha');
    return why.length ? { status: 'consult', why } : { status: 'clear', why: [] };
  }
  // zpomalení jízdy (násobek času): déšť 8 %, sníh 15 %, náledí 25 %, mlha 5 %; N1 s majáky ztrácí méně, N4 a návrat více
  function travelMul(o, mode) {
    let s = 0;
    if (o.ice || o.snow >= 1.5) s = 0.25; else if (o.snow >= 0.2 || (o.code >= 71 && o.code <= 77)) s = 0.15; else if (o.precip >= 0.3) s = 0.08; else if (o.fog) s = 0.05;
    if (o.gust >= 40) s = Math.max(s, 0.05);
    if (!s) return 1;
    s *= mode === 'N1' ? 0.5 : (mode === 'N4' || mode === 'RET') ? 1.25 : mode === 'RETL' ? 0.7 : 1;
    return 1 / (1 - Math.min(0.4, s));
  }
  // váhy indikací podle počasí (náledí, horko, mráz, bouřky)
  function caseMul(o, id) {
    let m = 1;
    const storm = o.thunder || o.gust >= 35;
    if (o.ice) { if (id === 'dn_poly' || id === 'dn_lehke') m *= 1.8; else if (id === 'trauma') m *= 1.4; else if (id === 'trauma_dite') m *= 1.1; }
    if (o.temp >= 30) { if (id === 'porucha') m *= 1.5; else if (id === 'dusnost') m *= 1.2; else if (id === 'hypert' || id === 'diab') m *= 1.15; else if (id === 'tonuti') m *= 5; }
    if (o.temp <= -5) { if (id === 'popal') m *= 1.8; else if (id === 'intox') m *= 1.4; else if (id === 'hrudnik' || id === 'dusnost') m *= 1.15; else if (id === 'trauma') m *= 1.1; }
    if (storm) { if (id === 'dn_poly') m *= 1.5; else if (id === 'dn_lehke') m *= 1.4; else if (id === 'trauma') m *= 1.3; else if (id === 'popal') m *= 1.3; }
    return m;
  }
  const DIRS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'], ARROWS = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  const dirName = deg => DIRS[Math.round(deg / 45) % 8], dirArrow = deg => ARROWS[Math.round(deg / 45) % 8];
  // text oblohy pro horní lištu
  function sky(o) {
    if (o.thunder) return { icon: '⛈', txt: 'bouřka' };
    if (o.fog) return { icon: '🌫', txt: 'mlha' };
    if (o.snow > 0 || (o.code >= 71 && o.code <= 77)) return { icon: '🌨', txt: 'sněžení' };
    if (o.ice) return { icon: '🧊', txt: 'mrznoucí srážky' };
    if (o.precip > 0.1) return { icon: '🌧', txt: o.precip >= 1 ? 'déšť' : 'mrholení' };
    if (o.cloudLow > 70) return { icon: '☁', txt: 'zataženo' };
    if (o.cloudLow > 30) return { icon: '⛅', txt: 'polojasno' };
    return { icon: '☀', txt: 'jasno' };
  }
  return { LAT, LON, NH, dayOfYear, addDays, derive, simulate, load, at, lzs, travelMul, caseMul, dirName, dirArrow, sky };
})();
if (typeof module !== 'undefined') module.exports = ZOS_WX;
