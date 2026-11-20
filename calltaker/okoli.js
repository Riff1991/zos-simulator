// Orientace volajícího v místě: strukturované místní vodítko z mapových dat projektu (adresní body, silniční síť, POI).
// Pro hovory z venku (silnice, terén, veřejné místo bez jisté adresy) složí z polohy případu:
//  - nejbližší obce a jejich směr, zda je místo v obci,
//  - u silnice trasu: dvě strany silnice, obce „na trase“ a odbočky v pořadí od místa (strana vlevo/vpravo podle směru jízdy),
//  - směr jízdy volajícího a to, co si z cesty pamatuje (odbočku mohl minout bez povšimnutí; to je pevně dané seedem),
//  - orientační body z POI: „u místa“ (do ~45 m, volající je vidí) a „poblíž“ (na mapě, ale odsud nemusí být vidět).
// Model dostane jen tato fakta; co v nich není, neví. Blízkost bodu na mapě není viditelnost, proto se vidí jen to, co je u místa.
// okoliFor(rnd, c, o) → čistý datový objekt nebo null; deterministické z rnd(), nevyhazuje výjimky.
const KM_LAT = 111.32;
const rad = Math.PI / 180;
const hav = (la1, lo1, la2, lo2) => { const x = (lo2 - lo1) * Math.cos((la1 + la2) / 2 * rad), y = la2 - la1; return Math.sqrt(x * x + y * y) * KM_LAT; };   // km, ploché přiblížení stačí na desítky km
const bearing = (la1, lo1, la2, lo2) => { const x = (lo2 - lo1) * Math.cos((la1 + la2) / 2 * rad), y = la2 - la1; return (Math.atan2(x, y) / rad + 360) % 360; };
const SMER8 = ['severně', 'severovýchodně', 'východně', 'jihovýchodně', 'jižně', 'jihozápadně', 'západně', 'severozápadně'];
const smerSlovy = b => SMER8[Math.round(b / 45) % 8];
const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const TRIDA = ['dálnice', 'silnice I. třídy', 'silnice I. třídy', 'silnice II. třídy', 'silnice III. třídy', 'místní komunikace', 'polní nebo lesní cesta'];
const TRIDA_KDE = ['u dálnice', 'u silnice I. třídy', 'u silnice I. třídy', 'u silnice II. třídy', 'u silnice III. třídy', 'na místní komunikaci', 'na polní nebo lesní cestě'];
const nrm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- index obcí z adresních bodů (stejnojmenné obce se dělí podle vzdálenosti) a mřížka adres ----------
let SET = null, ADRGRID = null, POIX = null;
function obceIndex() {
  if (SET) return SET;
  SET = { list: [], grid: new Map() };
  const A = typeof ZOS_ADDR !== 'undefined' ? ZOS_ADDR : null; if (!A || !A.a) return SET;
  const a = A.a, byName = new Map();
  for (let i = 0; i < a.length; i += 8) {
    const la = a[i] / 1e5, lo = a[i + 1] / 1e5, ci = a[i + 3];
    let arr = byName.get(ci); if (!arr) byName.set(ci, arr = []);
    let best = null, bd = 3.5;
    for (const e of arr) { const d = hav(la, lo, e.la, e.lo); if (d < bd) { bd = d; best = e; } }
    if (!best) arr.push({ n: A.s[ci], la, lo, cnt: 1 }); else { best.la += (la - best.la) / (best.cnt + 1); best.lo += (lo - best.lo) / (best.cnt + 1); best.cnt++; }
  }
  for (const arr of byName.values()) for (const e of arr) if (e.n) { SET.list.push(e); const k = Math.floor(e.la / 0.05) + ',' + Math.floor(e.lo / 0.05); let g = SET.grid.get(k); if (!g) SET.grid.set(k, g = []); g.push(e); }
  return SET;
}
function obceBlizko(la, lo, km, minCnt) {
  const S = obceIndex(), r = Math.ceil(km / 5) + 1, ci = Math.floor(la / 0.05), cj = Math.floor(lo / 0.05), out = [];
  for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r * 2; j <= cj + r * 2; j++) {
    const g = S.grid.get(i + ',' + j); if (!g) continue;
    for (const e of g) { if (e.cnt < minCnt) continue; const d = hav(la, lo, e.la, e.lo); if (d <= km) out.push({ n: e.n, la: e.la, lo: e.lo, cnt: e.cnt, km: d }); }
  }
  return out.sort((x, y) => x.km - y.km);
}
function adresyGrid() {
  if (ADRGRID) return ADRGRID;
  ADRGRID = new Map();
  const A = typeof ZOS_ADDR !== 'undefined' ? ZOS_ADDR : null; if (!A || !A.a) return ADRGRID;
  const a = A.a;
  for (let i = 0; i < a.length; i += 8) { const k = Math.floor(a[i] / 200) + ',' + Math.floor(a[i + 1] / 300); let g = ADRGRID.get(k); if (!g) ADRGRID.set(k, g = []); g.push(i); }
  return ADRGRID;
}
// nejbližší adresní bod (m) a obec; slouží k určení „jsem v obci“
function vObci(la, lo) {
  const G = adresyGrid(), A = ZOS_ADDR, a = A.a; let bd = 1e9, bc = '';
  const ci = Math.floor(la * 1e5 / 200), cj = Math.floor(lo * 1e5 / 300);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const g = G.get(i + ',' + j); if (!g) continue; for (const k of g) { const d = hav(la, lo, a[k] / 1e5, a[k + 1] / 1e5) * 1000; if (d < bd) { bd = d; bc = A.s[a[k + 3]]; } } }
  return { m: Math.round(bd), obec: bc };
}

// ---------- orientační body z POI: jen pojmenované a jen takové, které se dá rozumně popsat ----------
function poiKat(name, grp) {
  const s = nrm(name); if (!s) return null;
  if (grp === 'skola' || /skol/.test(s)) return 'škola';
  if (/obecni urad|mestsky urad|radnice|urad /.test(s)) return 'úřad nebo radnice';
  if (/kostel|kaple|(^|\s)sv\. /.test(s)) return 'kostel nebo kaple';
  if (/hrbitov/.test(s)) return 'hřbitov';
  if (/hasic|hasicsk/.test(s)) return 'hasičská zbrojnice';
  if (/benz|cerpac|omv|shell|eurooil|\bmol\b|\btank/.test(s)) return 'čerpací stanice';
  if (/nadrazi|zastavk|autobus/.test(s)) return 'zastávka nebo nádraží';
  if (/coop|albert|penny|billa|lidl|tesco|potravin|vecerk|market|samoobsl|norma\b|obchod|prodejn/.test(s)) return 'obchod';
  if (/restaur|hospod|hostinec|pivnic|bistro|krcm|hostinsk/.test(s)) return 'hostinec nebo restaurace';
  if (grp === 'sport') return 'sportoviště';
  if (grp === 'ubytovani' || /hotel|penzion|ubytov|kemp/.test(s)) return 'ubytování';
  return null;
}
function poiIndex() {
  if (POIX) return POIX;
  POIX = { grid: new Map() };
  const P = typeof ZOS_POI !== 'undefined' ? ZOS_POI : null; if (!P || !P.poi) return POIX;
  for (const grp of Object.keys(P.poi)) for (const p of P.poi[grp]) {
    const name = String(p[2] || '').replace(/ /g, ' ').trim(); if (!name) continue;
    const kat = poiKat(name, grp); if (!kat) continue;
    const e = { la: p[0] / 1e5, lo: p[1] / 1e5, n: name, kat, obec: p[4] }, k = Math.floor(e.la / 0.005) + ',' + Math.floor(e.lo / 0.008);
    let g = POIX.grid.get(k); if (!g) POIX.grid.set(k, g = []); g.push(e);
  }
  return POIX;
}
function poiBlizko(la, lo, m) {
  const X = poiIndex(), out = [], seen = new Set();
  const ci = Math.floor(la / 0.005), cj = Math.floor(lo / 0.008), r = Math.ceil(m / 450) + 1;
  for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) { const g = X.grid.get(i + ',' + j); if (!g) continue; for (const e of g) { const d = hav(la, lo, e.la, e.lo) * 1000; if (d <= m) { const key = e.n + '|' + e.kat; if (seen.has(key)) continue; seen.add(key); out.push({ n: e.n, kat: e.kat, m: Math.round(d), la: e.la, lo: e.lo }); } } }
  return out.sort((a, b) => a.m - b.m);
}

// ---------- geometrie cest (rovinné souřadnice v metrech od bodu P) ----------
const mkXY = (la0, lo0) => (la, lo) => [(lo - lo0) * 111320 * Math.cos(la0 * rad), (la - la0) * 111320];
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return Math.sqrt(x * x + y * y);
}
const polyDist = (p, pl) => { let m = 1e9; for (let i = 1; i < pl.length; i++) { const d = segDist(p, pl[i - 1], pl[i]); if (d < m) m = d; } return m; };
function cestaOd(P, s, XY) {   // trasa z místa P do obce s: body v metrech, kumulativní délka
  if (typeof ROUTER === 'undefined' || !ROUTER.ready) return null;
  const r = ROUTER.route(s.la, s.lo, P.lat, P.lon); if (!r || !r.pts || r.pts.length < 4) return null;
  const pts = []; for (let i = r.pts.length - 2; i >= 0; i -= 2) pts.push(XY(r.pts[i], r.pts[i + 1]));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { s, pts, cum, len: cum[cum.length - 1] };
}
function bearingAt(c, m) {
  let i = 1; while (i < c.pts.length - 1 && c.cum[i] < m) i++;
  return (Math.atan2(c.pts[i][0] - c.pts[0][0], c.pts[i][1] - c.pts[0][1]) / rad + 360) % 360;
}
const km1 = m => (m < 800 ? 'pár set metrů' : m < 1500 ? 'asi kilometr' : 'asi ' + (m < 10000 ? Math.round(m / 100) / 10 : Math.round(m / 1000)).toString().replace('.', ',') + ' km');
const velikost = cnt => (cnt > 4000 ? 'velké město' : cnt > 1200 ? 'město' : cnt > 300 ? 'větší obec' : 'obec');

// klastr směrů z místa P: trasy k obcím se sdruží podle počátečního směru (typicky dvě strany silnice)
function sestavTrasu(P, XY, kandidati, rnd, opt) {
  const cesty = kandidati.map(s => cestaOd(P, s, XY)).filter(c => c && c.len > 150 && c.len < 45000);
  if (!cesty.length) return null;
  const cl = [];
  for (const c of cesty.slice().sort((a, b) => a.len - b.len)) { c.b = bearingAt(c, 300); const k = cl.find(x => angDiff(x.b, c.b) < 50); if (k) k.items.push(c); else cl.push({ b: c.b, items: [c] }); }
  const A = cl[0], B = cl.slice(1).find(x => angDiff(x.b, A.b) >= 100) || null;
  const spine = k => k.items.filter(c => c.len < 25000).sort((a, b) => b.len - a.len)[0] || k.items[0];
  const polozky = k => {
    const sp = spine(k), out = [];
    for (const c of k.items) {
      if (c === sp) { out.push({ typ: 'obec', n: c.s.n, cnt: c.s.cnt, pos: Math.round(c.len), cil: true }); continue; }
      let dv = -1; for (let i = 1; i < c.pts.length; i++) if (polyDist(c.pts[i], sp.pts) > 90) { dv = i; break; }
      if (dv < 0) { out.push({ typ: 'obec', n: c.s.n, cnt: c.s.cnt, pos: Math.round(c.len) }); continue; }
      const dd = c.cum[dv - 1], vetev = c.len - dd;
      if (vetev <= 450) { out.push({ typ: 'obec', n: c.s.n, cnt: c.s.cnt, pos: Math.round(dd) }); continue; }
      if (vetev > 9000 || c.s.cnt < 12 || dd < 120) continue;
      let hi = 1; while (hi < sp.pts.length - 1 && sp.cum[hi] < dd) hi++;
      const h = [sp.pts[hi][0] - sp.pts[hi - 1][0], sp.pts[hi][1] - sp.pts[hi - 1][1]], bi = Math.min(c.pts.length - 1, dv + 2), b = [c.pts[bi][0] - c.pts[dv - 1][0], c.pts[bi][1] - c.pts[dv - 1][1]];
      const cross = h[0] * b[1] - h[1] * b[0], vlevo = cross > 0;
      out.push({ typ: 'odbocka', n: c.s.n, cnt: c.s.cnt, pos: Math.round(dd), vetevM: Math.round(vetev), strana: vlevo ? 'vlevo' : 'vpravo' });   // strana při pohledu od místa ven; při jízdě k místu je opačná
    }
    const seen = new Set();
    const srt = out.filter(x => { const key = x.n + x.typ; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => a.pos - b.pos), res = [];
    // odbočky ze stejné křižovatky (do 60 m na stejnou stranu) jsou jedna odbočka; značka ukazuje největší obec a nejbližší další
    for (const x of srt) {
      const prev = res[res.length - 1];
      if (x.typ === 'odbocka' && prev && prev.typ === 'odbocka' && prev.strana === x.strana && x.pos - prev.pos <= 60) prev.clen.push(x); else res.push(x.typ === 'odbocka' ? Object.assign({}, x, { clen: [x] }) : x);
    }
    for (const x of res) if (x.clen) {
      const big = x.clen.slice().sort((a, b) => b.cnt - a.cnt)[0], near = x.clen.slice().sort((a, b) => a.vetevM - b.vetevM)[0];
      x.n = big.n; x.cnt = big.cnt; x.vetevM = near.vetevM; delete x.clen;
    }
    return res;
  };
  return { A: { b: A.b, polozky: polozky(A) }, B: B ? { b: B.b, polozky: polozky(B) } : null };
}

// ---------- hlavní funkce ----------
function okoliFor(rnd, c, o) {
  try {
    o = o || {}; c = c || {};
    const where = c.where, lat = Number(c.lat), lon = Number(c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const venku = where === 'silnice' || where === 'priroda' || (where === 'ulice' && (o.znalostAdresy < 3 || ['svedek_nezna', 'turista', 'dite'].includes(o.typ)));
    if (!venku) return null;
    if (!obceIndex().list.length) return null;
    const P = { lat, lon }, XY = mkXY(lat, lon), zena = !!o.zena;
    const g = (m, z) => (zena ? z : m);
    const near = obceBlizko(lat, lon, 20, 8), vo = vObci(lat, lon);
    const poisAll = poiBlizko(lat, lon, 400);
    const uMista = o.dup ? [] : poisAll.filter(p => p.m <= 45).slice(0, 3).map(p => ({ nazev: p.n, kategorie: p.kat, vzdalenostM: p.m, vidi: null }));
    const poblizu = poisAll.filter(p => p.m > 45).slice(0, 3).map(p => ({ nazev: p.n, kategorie: p.kat, vzdalenostM: p.m, vidi: null }));
    const nej = near[0] || null;
    // obec, ke které se místo vztahuje v hlášení („okolí obce X“): nemusí být nejbližší, ale je to pravda případu
    const hl = c.town ? obceBlizko(lat, lon, 60, 1).find(e => e.n === c.town) : null;
    const poloha = { hlasenaObec: hl ? { nazev: hl.n, vzdalenostKm: Math.round(hl.km * 10) / 10, smerOdObce: smerSlovy(bearing(hl.la, hl.lo, lat, lon)) } : null, vObci: vo.m <= 120 ? vo.obec : null, nejblizsiObec: nej ? { nazev: nej.n, vzdalenostKm: Math.round(nej.km * 10) / 10, smerOdObce: smerSlovy(bearing(nej.la, nej.lo, lat, lon)), druh: velikost(nej.cnt) } : null };
    const out = { typ: where === 'silnice' ? 'silnice' : where === 'priroda' ? 'teren' : 'mesto', poloha, uMista, poblizu, trasa: null, jede: null, odPacienta: o.dup ? 'vidíš to zdálky, asi 100 až 200 metrů od místa' : null };
    if (where === 'silnice' || where === 'priroda') {
      const sn = typeof ROUTER !== 'undefined' && ROUTER.ready ? ROUTER.snap(lat, lon) : null;
      out.silnice = sn ? TRIDA[sn.cls] || 'silnice' : 'silnice'; out.silniceKde = sn ? TRIDA_KDE[sn.cls] || 'u silnice' : 'u silnice';
      const poz = (c.place || '') + ' ' + (c.oznRel || '');
      const vozidlo = /v autě/i.test(poz) || (where === 'silnice' && (/pacient sám/.test(c.oznRel || '') || rnd() < 0.7)) || (where === 'priroda' && false);
      out.vozidlo = !!vozidlo;
      if (where === 'silnice' || (sn && sn.cls <= 5)) {
        const jmena = new Set(), kand = [];
        if (poloha.vObci) jmena.add(poloha.vObci);   // obec, ve které stojí, není ani odbočka, ani obec na trase
        for (const s of near.filter(s => s.km < 18).slice(0, 16).concat(obceBlizko(lat, lon, 28, 1500).filter(s => s.km > 8).slice(0, 3))) if (!jmena.has(s.n) && !near.some(e => e !== s && e.n === s.n && e.km < s.km)) { jmena.add(s.n); kand.push(s); }
        const T = sestavTrasu(P, XY, kand, rnd, o);
        if (T && T.A.polozky.length + (T.B ? T.B.polozky.length : 0) > 0) {
          const smer = rnd() < 0.5 ? 'A' : 'B';   // A = jede směrem k první straně silnice, B = opačně (když druhá strana neexistuje, je tam slepý konec)
          const znamy = vozidlo && rnd() < 0.9 && !o.dup && !(o.typ === 'turista' && rnd() < 0.3);
          const pred = smer === 'A' ? T.A : T.B, za = smer === 'A' ? T.B : T.A;
          const smerKam = pred ? pred.polozky.filter(x => x.typ === 'obec') : [], smerOdkud = za ? za.polozky.filter(x => x.typ === 'obec') : [];
          const mk = (x, minuti) => {
            const r = { typ: x.typ, nazev: x.n, vzdalenostM: x.pos };
            if (x.typ === 'odbocka') { r.strana = minuti ? (x.strana === 'vlevo' ? 'vpravo' : 'vlevo') : x.strana; r.vzdalenostOdbockyKm = Math.round(x.vetevM / 100) / 10; }
            if (minuti && x.typ === 'odbocka') r.vsiml = rnd() < (x.pos < 1500 ? 0.7 : 0.5);
            return r;
          };
          out.trasa = {
            znamySmer: !!znamy && !!smer,
            pred: znamy && smer ? (pred ? (() => { const ob = pred.polozky.filter(x => x.typ === 'obec'); return ob.slice(0, 2).concat(ob.filter(x => x.cil && ob.indexOf(x) >= 2)); })().map(x => mk(x, false)) : []) : [],
            minuli: znamy && smer && za ? za.polozky.slice(0, 4).map(x => mk(x, true)).reverse() : [],
          };
          if (znamy && smer) {
            // dvojice „poslední obec → cíl“ se bere jen tehdy, když nejkratší trasa mezi nimi opravdu vede přes místo (jinak by si hráč trasu spočítal jinudy)
            const sidl = new Map(kand.map(e => [e.n, e])), minule = smerOdkud.slice(0, 3), cile = smerKam.slice().sort((a, b) => (a.pos >= 1500 ? 0 : 1) - (b.pos >= 1500 ? 0 : 1) || a.pos - b.pos).slice(0, 4);
            let par = null;
            for (const xo of minule) { for (const k of cile) { const a = sidl.get(xo.n), b = sidl.get(k.n); if (!a || !b) continue; const rt = ROUTER.route(a.la, a.lo, b.la, b.lo); if (!rt) continue; let best = 1e9, along = 0, cum = 0; for (let q = 2; q < rt.pts.length; q += 2) { const seg = hav(rt.pts[q - 2], rt.pts[q - 1], rt.pts[q], rt.pts[q + 1]) * 1000; cum += seg; const dd = hav(rt.pts[q], rt.pts[q + 1], lat, lon) * 1000; if (dd < best) { best = dd; along = cum; } } if (best <= 120) { par = { x: xo, k, along: Math.round(along) }; break; } } if (par) break; }
            out.jede = { odkud: par ? par.x.n : (smerOdkud[0] || {}).n || null, kam: par ? par.k.n : null, posledni: par ? { nazev: par.x.n, vzdalenostM: par.along } : (smerOdkud[0] ? { nazev: smerOdkud[0].n, vzdalenostM: smerOdkud[0].pos } : null), overeno: !!par,
              smerKam: pred ? smerSlovy(pred.b) : null };
            // odbočky se pamatují jen od poslední projeté obce (úsek ověřený trasou); dál zpátky už volající nic neví
            if (out.jede.posledni) out.trasa.minuli = out.trasa.minuli.filter(x => x.typ === 'obec' || x.vzdalenostM <= out.jede.posledni.vzdalenostM + 50);
          }
        }
      }
    }
    out.text = textOkoli(out, zena, o);
    return out;
  } catch (e) { return null; }
}

function textOkoli(o, zena, opt) {
  const g = (m, z) => (zena ? z : m), L = [];
  L.push('ORIENTACE V MÍSTĚ (pevná pravda tohoto hovoru: odpovídej podle ní vždy stejně, ať se calltaker zeptá jakkoli; co tu není, nevíš):');
  const p = o.poloha;
  const kde = o.typ === 'silnice' || o.typ === 'teren' ? (o.silniceKde || 'u silnice') : 'na veřejném místě';
  L.push('- Poloha: jsi ' + kde + (p.vObci ? ', v obci ' + p.vObci : ', mimo zástavbu') + (p.nejblizsiObec && p.nejblizsiObec.nazev !== p.vObci ? '; nejbližší obec, kterou znáš: ' + p.nejblizsiObec.nazev + ' (' + p.nejblizsiObec.druh + ', ' + km1(p.nejblizsiObec.vzdalenostKm * 1000) + ' ' + p.nejblizsiObec.smerOdObce + ' odsud)' : '') + '. Pacient je u tebe' + (o.odPacienta ? '' : '') + '.');
  if (p.hlasenaObec && p.hlasenaObec.nazev !== p.vObci && (!p.nejblizsiObec || p.hlasenaObec.nazev !== p.nejblizsiObec.nazev)) L.push('- Obec, ke které se místo vztahuje: ' + p.hlasenaObec.nazev + ' (' + km1(p.hlasenaObec.vzdalenostKm * 1000) + ' ' + p.hlasenaObec.smerOdObce + ' odsud); i ta je pravdivý údaj, použij ji nebo nejbližší obec výše podle toho, co ti dřív dojde.');
  if (o.odPacienta) L.push('- Odstup: ' + o.odPacienta + '.');
  if (o.typ === 'silnice') {
    if (o.trasa && o.trasa.znamySmer) {
      if (o.jede) L.push('- Cesta: ' + (o.vozidlo ? g('jel jsi', 'jela jsi') + ' autem' : 'jdeš') + (o.jede.odkud ? ' od obce ' + o.jede.odkud : '') + (o.jede.kam ? ' směrem na ' + o.jede.kam : '') + (o.jede.smerKam ? ' (zhruba ' + o.jede.smerKam + ')' : '') + '. Název silnice ani její číslo neznáš, jen její třídu.');
      const mn = o.trasa.minuli, pr = o.trasa.pred;
      if (mn.length) L.push('- Co jsi ' + g('minul', 'minula') + ' (od nejvzdálenějšího k místu): ' + mn.map(x => x.typ === 'obec' ? 'obec ' + x.nazev + ' (' + km1(x.vzdalenostM) + ' zpátky)' : 'odbočka ' + x.strana + ' na ' + x.nazev + ' (' + km1(x.vzdalenostM) + ' zpátky; ' + (x.vsiml ? g('všiml sis jí', 'všimla sis jí') : g('nevšiml sis jí a o ní nevíš', 'nevšimla sis jí a o ní nevíš')) + ')').join('; ') + '.');
      if (pr.length) L.push('- Kam to vede dál (jedeš tam, takže cíl znáš; pořadí a vzdálenosti jen přibližně, o odbočkách před sebou nevíš nic): ' + pr.map(x => x.typ === 'obec' ? 'obec ' + x.nazev + ' (' + km1(x.vzdalenostM) + ' dál)' : 'odbočka ' + x.strana + ' na ' + x.nazev + ' (' + km1(x.vzdalenostM) + ' dál)').join('; ') + '.');
    } else {
      L.push('- Cesta: ' + (o.vozidlo ? 'nevíš přesně, odkud jsi přijel(a) a kudy; směr jízdy nedokážeš spolehlivě říct' : 'nejsi tu na cestě autem, odkud ses sem dostal(a) nevíš říct') + '. Žádné odbočky ani obce na trase si nevybavíš; řekni „nevím“ nebo jen to, co jsi ' + g('viděl', 'viděla') + ' na tabuli s názvem obce, pokud je to výše uvedená nejbližší obec.');
    }
  }
  if (o.typ === 'teren') L.push('- Cesta: do těchto míst ses dostal(a) pěšky nebo po cestě; směr, odkud jsi přišel(a), neumíš popsat podle obcí. Neznáš číslo ani název cesty.');
  if (o.uMista.length) L.push('- Hned u místa na mapě (do asi 45 m; blízkost neznamená, že to odsud vidíš, a nevíš jistě, jestli to vidíš; řekni jen „tuším, že tam je…“ a jen na dotaz): ' + o.uMista.map(x => x.nazev + ' (' + x.kategorie + ', asi ' + x.vzdalenostM + ' m)').join('; ') + '.');
  if (o.poblizu.length) L.push('- Poblíž je na mapě (nevíš, jestli to odsud vidíš ani jestli to tam skutečně je; jen nejistě „tuším tam je…“): ' + o.poblizu.map(x => x.nazev + ' (' + x.kategorie + ', asi ' + x.vzdalenostM + ' m)').join('; ') + '.');
  if (!o.uMista.length && !o.poblizu.length) L.push('- Orientační body: žádné konkrétní nevíš (nevidíš tu cedule, obchody ani jiné budovy, které bys pojmenoval/a).');
  L.push('- Úplnost: seznam odboček je neúplný, mohly tam být i jiné, o kterých nevíš; nikdy netvrď, že tam žádná jiná nebyla. Strana (vlevo/vpravo) je ve směru tvé jízdy; u odbočky, které sis nevšiml(a), nevíš nic.');
  L.push('PRAVIDLA ORIENTACE: nevymýšlej žádnou další obec, odbočku, cedulu, budovu ani značku. Nic neříkej s větší jistotou, než je uvedeno. Vzdálenosti říkej zaokrouhleně a nejistě („tak dva kilometry“), nikdy na metry. Pokud se ptají na něco, co tu není, odpověz přirozeně nejistě („to nevím“, „toho jsem si nevšiml“). Nehádej proto, abys pomohl(a).');
  return L.join('\n');
}
// skupina POI (verejne, sport, ubytovani, prov, skola, domov, ordinace) podle adresy ve tvaru „ulice čp, obec (název)“, jak ji vyrábí generátor případů
let POIGRP = null;
function poiSkupina(addr) {
  if (!POIGRP) {
    POIGRP = new Map();
    const P = typeof ZOS_POI !== 'undefined' ? ZOS_POI : null;
    if (P && P.poi) for (const grp of Object.keys(P.poi)) for (const p of P.poi[grp]) if (p[2]) POIGRP.set(p[3] + ' (' + String(p[2]).replace(/ /g, ' ') + ')', grp);
  }
  return POIGRP.get(String(addr || '')) || null;
}
// všechna pojmenovaná POI podle adresy a podle jména (stejnojmenné pobočky se rozlišují ulicí, jak je vidět na cedulích a v mapě)
let POIVSE = null;
function poiVse() {
  if (POIVSE) return POIVSE;
  POIVSE = { byAddr: new Map(), byName: new Map() };
  const P = typeof ZOS_POI !== 'undefined' ? ZOS_POI : null; if (!P || !P.poi) return POIVSE;
  for (const grp of Object.keys(P.poi)) for (const p of P.poi[grp]) {
    const n = String(p[2] || '').replace(/\u00a0/g, ' ').trim(); if (!n) continue;
    const e = { grp, la: p[0] / 1e5, lo: p[1] / 1e5, n, adr: p[3], obec: p[4] };
    POIVSE.byAddr.set(p[3] + ' (' + n + ')', e);
    const k = nrm(n); let l = POIVSE.byName.get(k); if (!l) POIVSE.byName.set(k, l = []); l.push(e);
  }
  return POIVSE;
}
const poiPodleAdresy = addr => poiVse().byAddr.get(String(addr || '')) || null;
const poiStejneJmeno = (e, km) => (poiVse().byName.get(nrm(e.n)) || []).filter(x => x !== e && hav(e.la, e.lo, x.la, x.lo) <= km);
const poiPodleJmena = n => poiVse().byName.get(nrm(n)) || [];
// pojmenovaná POI v okruhu, která dávají smysl jako výchozí bod pěší trasy (rozhledna, tábořiště, ubytování, turistická základna, zastávka)
function poiVychozi(la, lo, km) {
  const out = [], V = poiVse();
  for (const [k, l] of V.byName) if (/rozhledn|tabori|kemp|turist|zakladna|chata|penzion|hotel|ubytov|zastavk|nadrazi/.test(k)) for (const e of l) { const d = hav(la, lo, e.la, e.lo); if (d <= km) out.push(Object.assign({ km: d }, e)); }
  return out.sort((a, b) => a.km - b.km);
}
// délka cesty po silniční síti z obce nebo bodu s do místa P (m) a vzdálenost místa od nejbližší silnice (m)
function cestaDelka(s, P) { try { const c = cestaOd(P, s, mkXY(P.lat, P.lon)); return c ? Math.round(c.len) : null; } catch (e) { return null; } }
function odSilnice(la, lo) { try { const sn = typeof ROUTER !== 'undefined' && ROUTER.ready ? ROUTER.snap(la, lo) : null; return sn ? Math.round(sn.d * 1000) : null; } catch (e) { return null; } }
// náhodná adresa v kruhu minKm–maxKm od bodu (pro volajícího, který telefonuje odjinud)
function nahodnaAdresa(rnd, la, lo, minKm, maxKm) {
  const A = typeof ZOS_ADDR !== 'undefined' ? ZOS_ADDR : null; if (!A || !A.a) return null;
  const a = A.a, n = a.length / 8;
  for (let t = 0; t < 600; t++) {
    const i = Math.floor(rnd() * n) * 8, d = hav(la, lo, a[i] / 1e5, a[i + 1] / 1e5);
    if (d < minKm || d > maxKm || !A.s[a[i + 3]]) continue;
    const st = A.s[a[i + 2]], city = A.s[a[i + 3]], num = A.s[a[i + 4]];
    return { lat: a[i] / 1e5, lon: a[i + 1] / 1e5, obec: city, adresa: (st && st !== city ? st + ' ' + num : 'čp. ' + num) + ', ' + city, km: Math.round(d * 10) / 10 };
  }
  return null;
}
const api = { okoliFor, textOkoli, poiKat, obceBlizko, vObci, poiBlizko, poiSkupina, poiPodleAdresy, poiStejneJmeno, poiPodleJmena, poiVychozi, cestaDelka, odSilnice, nahodnaAdresa, hav, bearing, smerSlovy, TRIDA };
if (typeof module !== 'undefined') module.exports = api; else window.CT_OKOLI = api;
