// Minimální kontrola: nedefinované proměnné/funkce (zachytila by např. chybějící syncSelectionToMain).
const shared = {
  ZOS_DATA: 'readonly', ZOS_PEOPLE: 'readonly', ZOS_SYMPTOMS: 'readonly', ZOS_ADDR: 'readonly', ZOS_POI: 'readonly', ZOS_RAIL: 'readonly', ZOS_EXTMSG: 'readonly', ZOS_WX: 'readonly', ZOS_VOICE: 'readonly', ZOS_LIVE: 'readonly', CT_SPIDER: 'readonly', CT_CIHLY: 'readonly', ZOS_CIHLY: 'readonly', ZOS_TUTORIAL: 'readonly', Worker: 'readonly', WebAssembly: 'readonly', BigInt64Array: 'readonly', BigInt: 'readonly',
  ROUTER: 'readonly', Sim: 'readonly', BASEMAP: 'readonly', GLMASK: 'readonly', maplibregl: 'readonly',
  hav: 'readonly', ZOS_VERSION: 'readonly', ZOS_CHANGELOG: 'readonly', ZOS_OUTLINE: 'readonly', travelSec: 'readonly', heliSec: 'readonly', FIRST: 'readonly', LAST: 'readonly',
};
const browser = ['window', 'document', 'location', 'navigator', 'localStorage', 'sessionStorage', 'performance', 'requestAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'console', 'URL', 'Blob', 'Response', 'DecompressionStream', 'Image',
  'matchMedia', 'getComputedStyle', 'BroadcastChannel', 'AbortController', 'Path2D', 'AudioContext', 'innerWidth', 'innerHeight', 'Event', 'CustomEvent', 'HTMLElement', 'screen', 'open', 'alert', 'confirm', 'URLSearchParams', 'ResizeObserver', 'OfflineAudioContext', 'Audio', 'MediaStream', 'RTCPeerConnection', 'MediaRecorder']
  .reduce((o, k) => (o[k] = 'readonly', o), {});
const node = { module: 'writable', require: 'readonly', process: 'readonly', __dirname: 'readonly', global: 'writable', console: 'readonly', Buffer: 'readonly' };
module.exports = [
  { files: ['src/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...shared, ...browser, ...node } },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'off' } },
];
