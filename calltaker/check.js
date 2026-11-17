// Deterministická kontrola formuláře proti klíči (Node i prohlížeč).
const strip = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
// deterministická kontrola formuláře proti klíči (adresa, obec, N)
function checkForm(form, key) {
  const adr = strip(String(key.adresa).split(',')[0]), num = (adr.match(/\d+(?:\/\d+)?/) || [''])[0], street = adr.replace(/\d+(?:\/\d+)?/g, '').trim();
  const f = strip(form.adresa);
  return {
    ulice: street ? f.includes(street) : true,
    cislo: num ? f.split(' ').some(t => t === num || t.split('/')[0] === num.split('/')[0]) : true,
    obec: strip(form.adresa + ' ' + (form.obec || '')).includes(strip(key.obec)),
    naléhavost: String(form.n).toUpperCase().replace(/^(\d)$/, 'N$1') === key.naléhavost,
    spravne: key.naléhavost, zadano: form.n,
  };
}
if (typeof module !== 'undefined') module.exports = { strip, checkForm }; else window.CT_CHECK = { strip, checkForm };
