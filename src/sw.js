// Service worker ZOS simulátoru: offline provoz + aktualizace při spuštění.
// Generuje build.py (doplní VERZI, otisk sestavení a seznam souborů). Neupravovat site/sw.js ručně.
const VERSION = '__VERSION__';
const BUILD = '__BUILD__';
const PFX = VERSION.includes('-dev') ? 'zosdev-' : 'zos-';   // testovací verze (/dev/) má vlastní cache
const CACHE = `${PFX}${VERSION}-${BUILD}`;
const TILE_CACHE = PFX + 'tiles-v1';
const TTS_CACHE = PFX + 'tts-v1';                 // hlas pro rádio (~80 MB) se stahuje jen při zapnutém hlasu a mezi verzemi se nemaže                // dlaždice se mezi verzemi nemění (podle obsahu v tiles-index)
const PRECACHE = __PRECACHE__;

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== TILE_CACHE && k !== TTS_CACHE && k.startsWith(PFX)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', ev => { if (ev.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith(new URL('./dev/', self.registration.scope).pathname)) return;   // testovací verze má vlastní service worker
  const isTile = /\/t\/[^/]+\.wasm$/.test(url.pathname);
  const isTts = /\/tts\/[^/]+$/.test(url.pathname) && !/worker\.js$/.test(url.pathname);
  ev.respondWith((async () => {
    const cache = await caches.open(isTile ? TILE_CACHE : isTts ? TTS_CACHE : CACHE);
    const hit = await cache.match(ev.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(ev.request);
      if (res.ok && (isTile || isTts || PRECACHE.some(p => url.pathname.endsWith(p.replace(/^\.\//, ''))))) cache.put(ev.request, res.clone());
      return res;
    } catch (err) {
      if (ev.request.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
