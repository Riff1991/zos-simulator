// Sestaví jeden samostatný soubor calltaker/web/index.html (dá se otevřít dvojklikem).
const fs = require('fs'), path = require('path'), W = path.join(__dirname, 'web');
const rd = f => fs.readFileSync(f, 'utf8').replace(/<\/script/gi, '<\\/script');
let h = fs.readFileSync(path.join(W, 'template.html'), 'utf8');
for (const [k, f] of [['ENGINE', path.join(__dirname, '..', 'work', 'engine.bundle.js')], ['PERSONAS', path.join(__dirname, 'personas.js')], ['CHECK', path.join(__dirname, 'check.js')], ['PROMPTS', path.join(__dirname, 'prompts.js')], ['CASES', path.join(W, 'cases.js')], ['APP', path.join(W, 'app.js')]]) h = h.replace('/*' + k + '*/', () => (k === 'PERSONAS' ? ['okolnosti', 'reci', 'okoli', 'lokace'].map(n => '(function(){' + rd(path.join(__dirname, n + '.js')) + '\n})();').join('') + '(function(){' + rd(f) + '\n})();(function(){' + rd(path.join(__dirname, 'cizinci.js')) + '\n})();' : rd(f)));
fs.writeFileSync(path.join(W, 'index.html'), h);
console.log('web/index.html ' + (h.length / 1024).toFixed(0) + ' kB');
