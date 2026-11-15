// Cloudflare Worker: proxy k Azure Speech (hlasy cs-CZ-VlastaNeural / cs-CZ-AntoninNeural) pro hru ZOS simulátor.
// Klíč zůstává v tajných proměnných Workeru (AZURE_KEY, AZURE_REGION), do prohlížeče se nikdy nedostane.
// Hotové věty se ukládají do cache Cloudflare, takže se stejná věta nikdy nesyntetizuje dvakrát (šetří měsíční limit F0).
// Návod: cloudflare/README.md

const VOICES = ['cs-CZ-VlastaNeural', 'cs-CZ-AntoninNeural'];
const DEFAULT_ORIGINS = 'https://riff1991.github.io,http://localhost:8765,http://127.0.0.1:8765';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(s => s.trim());
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (url.pathname !== '/tts' || request.method !== 'GET') return new Response('ZOS TTS proxy', { status: 404, headers: cors });
    // žádosti z cizích webů nepřijímáme (chrání limit zdarma)
    if (origin && !allowed.includes(origin)) return new Response('forbidden', { status: 403, headers: cors });

    const text = (url.searchParams.get('text') || '').trim();
    const voice = url.searchParams.get('voice') || VOICES[0];
    const rate = Math.max(-20, Math.min(70, parseInt(url.searchParams.get('rate') || '0', 10) || 0));
    if (!text || text.length > 300) return new Response('bad text', { status: 400, headers: cors });
    if (!VOICES.includes(voice)) return new Response('bad voice', { status: 400, headers: cors });

    // cache: klíč je jen text + hlas + tempo (bez Origin)
    const cacheKey = new Request(`https://zos-tts.cache/${voice}/${rate}/${encodeURIComponent(text)}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return new Response(hit.body, { headers: { ...Object.fromEntries(hit.headers), ...cors, 'X-Cache': 'HIT' } });

    const ssml = `<speak version="1.0" xml:lang="cs-CZ"><voice name="${voice}"><prosody rate="${rate >= 0 ? '+' : ''}${rate}%">${esc(text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'zos-simulator-tts',
      },
      body: ssml,
    });
    // 429 = vyčerpán měsíční limit F0 (nic se neúčtuje); hra přepne na offline hlas
    if (!res.ok) return new Response('upstream ' + res.status, { status: res.status === 429 ? 429 : 502, headers: cors });
    const audio = await res.arrayBuffer();
    const out = new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    ctx.waitUntil(cache.put(cacheKey, out.clone()));
    return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', ...cors, 'X-Cache': 'MISS' } });
  },
};
