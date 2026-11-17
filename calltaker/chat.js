#!/usr/bin/env node
// Textový trenažér: ty = calltaker, AI = volající. Použití:
//   node calltaker/chat.js [seed] [--dry]      (--dry jen vypíše prompt volajícího, bez API)
const readline = require('readline'), fs = require('fs'), path = require('path');
const { makeCase } = require('./factsheet.js');
const { callerSystem } = require('./prompts.js');
const { ask } = require('./llm.js');
const { judge } = require('./judge.js');
const args = process.argv.slice(2), dry = args.includes('--dry');
const seed = Number(args.find(a => /^\d+$/.test(a)) || Math.floor(Math.random() * 1e6));
const { view, key } = makeCase(seed);
const system = callerSystem(view);
if (dry) { console.log(system + '\n\n--- KEY ---\n' + JSON.stringify(key, null, 1)); process.exit(0); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// fronta řádků: funguje i při vstupu z roury (readline.question po EOF padá)
const lines = [], waiters = []; let closed = false;
rl.on('line', l => { if (waiters.length) waiters.shift()(l); else lines.push(l); });
rl.on('close', () => { closed = true; while (waiters.length) waiters.shift()(''); });
const q = t => { process.stdout.write(t); return lines.length ? Promise.resolve(lines.shift()) : closed ? Promise.resolve('') : new Promise(r => waiters.push(r)); };
const transcript = [], msgs = [];
(async () => {
  console.log(`\nHovor č. ${seed}. Volající zvedl telefon, ty zvedáš linku 155. Pozdrav a veď hovor (/konec = ukončit a vyplnit formulář).\n`);
  for (;;) {
    const line = (await q('calltaker> ')).trim();
    if (line === '/konec' || (!line && closed)) break;
    if (!line) continue;
    transcript.push({ role: 'calltaker', text: line }); msgs.push({ role: 'user', content: line });
    let reply;
    try { reply = await ask({ system, messages: msgs, maxTokens: 250 }); } catch (e) { console.error(e.message); process.exit(1); }
    msgs.push({ role: 'assistant', content: reply });
    const end = /\[KONEC\]/.test(reply), shown = reply.replace(/\[KONEC\]/g, '').trim();
    transcript.push({ role: 'volajici', text: shown });
    console.log('volající> ' + shown + '\n');
    if (end) break;
  }
  console.log('\n--- Formulář (jako v dispečerském systému) ---');
  const form = { adresa: await q('Adresa (ulice č., obec): '), n: await q('Naléhavost (1/2/3): '), poznamka: await q('Poznámka: ') };
  rl.close();
  let result = null;
  try { result = await judge({ view, key, transcript, form }); } catch (e) { console.error('Hodnocení selhalo: ' + e.message); }
  const dir = path.join(__dirname, 'out'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `hovor-${seed}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ seed, view, key, transcript, form, result }, null, 1));
  if (result) { console.log('\n--- Kontrola pravidly ---\n' + JSON.stringify(result.pravidla, null, 1) + '\n\n--- Soudce ---\n' + JSON.stringify(result.soudce, null, 1)); }
  console.log('\nUloženo: ' + file);
})();
