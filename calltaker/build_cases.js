// Předgeneruje případy pro webovou stránku: node calltaker/build_cases.js [počet]
const { makeCase } = require('./factsheet.js');
const n = Number(process.argv[2] || 200), out = [];
for (let seed = 1; seed <= n; seed++) out.push(makeCase(seed));
require('fs').writeFileSync(__dirname + '/web/cases.js', 'window.CT_CASES = ' + JSON.stringify(out) + ';\n');
console.log(out.length + ' případů, ' + (JSON.stringify(out).length / 1024).toFixed(0) + ' kB');
