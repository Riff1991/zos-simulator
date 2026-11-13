// ZOS simulátor – generátor fiktivních osob (pacient, oznamovatel, členové posádek).
// Všechny osoby jsou vymyšlené. Jména se skládají z běžných českých jmen a příjmení,
// ženské tvary příjmení jsou v párech (Novák → Nováková, Černý → Černá, Sedláček → Sedláčková).
// Všechny funkce berou rnd() simulace, aby zůstal zachován determinismus pro daný seed.

const ZOS_PEOPLE = (function () {
  // [mužský tvar, ženský tvar, relativní četnost]
  const SURNAMES = [
    ['Novák', 'Nováková', 30], ['Svoboda', 'Svobodová', 17], ['Novotný', 'Novotná', 17], ['Dvořák', 'Dvořáková', 16],
    ['Černý', 'Černá', 14], ['Procházka', 'Procházková', 13], ['Kučera', 'Kučerová', 13], ['Veselý', 'Veselá', 11],
    ['Horák', 'Horáková', 10], ['Němec', 'Němcová', 9], ['Pokorný', 'Pokorná', 9], ['Marek', 'Marková', 9],
    ['Pospíšil', 'Pospíšilová', 8], ['Hájek', 'Hájková', 8], ['Jelínek', 'Jelínková', 8], ['Král', 'Králová', 8],
    ['Růžička', 'Růžičková', 7], ['Beneš', 'Benešová', 7], ['Fiala', 'Fialová', 7], ['Sedláček', 'Sedláčková', 7],
    ['Doležal', 'Doležalová', 7], ['Zeman', 'Zemanová', 7], ['Kolář', 'Kolářová', 7], ['Navrátil', 'Navrátilová', 6],
    ['Čermák', 'Čermáková', 6], ['Vaněk', 'Vaňková', 6], ['Urban', 'Urbanová', 6], ['Blažek', 'Blažková', 6],
    ['Kříž', 'Křížová', 6], ['Kovář', 'Kovářová', 6], ['Kratochvíl', 'Kratochvílová', 5], ['Bartoš', 'Bartošová', 5],
    ['Vlček', 'Vlčková', 5], ['Polák', 'Poláková', 5], ['Kopecký', 'Kopecká', 5], ['Musil', 'Musilová', 5],
    ['Šimek', 'Šimková', 5], ['Konečný', 'Konečná', 5], ['Malý', 'Malá', 5], ['Holub', 'Holubová', 5],
    ['Čech', 'Čechová', 4], ['Štěpánek', 'Štěpánková', 4], ['Staněk', 'Staňková', 4], ['Kadlec', 'Kadlecová', 4],
    ['Dostál', 'Dostálová', 4], ['Soukup', 'Soukupová', 4], ['Šťastný', 'Šťastná', 4], ['Mareš', 'Marešová', 4],
    ['Moravec', 'Moravcová', 4], ['Sýkora', 'Sýkorová', 4], ['Tichý', 'Tichá', 4], ['Valenta', 'Valentová', 4],
    ['Vávra', 'Vávrová', 4], ['Matoušek', 'Matoušková', 4], ['Říha', 'Říhová', 4], ['Bláha', 'Bláhová', 4],
    ['Šebesta', 'Šebestová', 3], ['Ševčík', 'Ševčíková', 3], ['Hruška', 'Hrušková', 3], ['Mašek', 'Mašková', 3],
    ['Havlíček', 'Havlíčková', 3], ['Pešek', 'Pešková', 3], ['Hrubý', 'Hrubá', 3], ['Janda', 'Jandová', 3],
    ['Toman', 'Tomanová', 3], ['Hanzlík', 'Hanzlíková', 3], ['Brož', 'Brožová', 3], ['Kubát', 'Kubátová', 3],
    ['Vojtíšek', 'Vojtíšková', 3], ['Šindelář', 'Šindelářová', 3], ['Petrák', 'Petráková', 3], ['Dušek', 'Dušková', 3],
    ['Kubíček', 'Kubíčková', 3], ['Pavlík', 'Pavlíková', 3], ['Jirsa', 'Jirsová', 3], ['Hronek', 'Hronková', 3],
    // jihočeská příjmení
    ['Vondrášek', 'Vondrášková', 2], ['Kubička', 'Kubičková', 2], ['Šmejkal', 'Šmejkalová', 2], ['Hrdlička', 'Hrdličková', 2],
    ['Klíma', 'Klímová', 2], ['Pecha', 'Pechová', 2], ['Pich', 'Pichová', 2], ['Rybář', 'Rybářová', 2],
    ['Bednář', 'Bednářová', 2], ['Kotrba', 'Kotrbová', 2], ['Šustr', 'Šustrová', 2], ['Kalný', 'Kalná', 2],
    ['Lukeš', 'Lukešová', 2], ['Brabec', 'Brabcová', 2], ['Zíka', 'Zíková', 2], ['Hromádka', 'Hromádková', 2],
    ['Fencl', 'Fenclová', 2], ['Kašpar', 'Kašparová', 2], ['Vrba', 'Vrbová', 2], ['Mráz', 'Mrázová', 2],
  ];
  // křestní jména podle ročníku narození (přibližně podle oblíbenosti v dané době)
  const FIRST = {
    M: [
      [1900, 1949, ['Josef', 'Jan', 'Jaroslav', 'Václav', 'Karel', 'František', 'Miroslav', 'Jiří', 'Stanislav', 'Antonín', 'Vladimír', 'Zdeněk', 'Oldřich', 'Bohumil', 'Ladislav']],
      [1950, 1969, ['Jiří', 'Jan', 'Petr', 'Josef', 'Pavel', 'Jaroslav', 'Miroslav', 'Zdeněk', 'Václav', 'Milan', 'Vladimír', 'Karel', 'Ladislav', 'Stanislav', 'František']],
      [1970, 1989, ['Petr', 'Martin', 'Jan', 'Tomáš', 'Pavel', 'Jiří', 'Michal', 'Lukáš', 'David', 'Roman', 'Radek', 'Zdeněk', 'Marek', 'Daniel', 'Jaroslav']],
      [1990, 2009, ['Jakub', 'Jan', 'Tomáš', 'Lukáš', 'Ondřej', 'David', 'Martin', 'Michal', 'Adam', 'Filip', 'Vojtěch', 'Matěj', 'Daniel', 'Petr', 'Dominik']],
      [2010, 2030, ['Jakub', 'Jan', 'Tomáš', 'Adam', 'Matyáš', 'Vojtěch', 'Filip', 'Ondřej', 'Lukáš', 'Matěj', 'David', 'Šimon', 'Tobiáš', 'Antonín', 'Kryštof']],
    ],
    Ž: [
      [1900, 1949, ['Marie', 'Jana', 'Anna', 'Věra', 'Jaroslava', 'Zdeňka', 'Božena', 'Ludmila', 'Vlasta', 'Milada', 'Libuše', 'Helena', 'Jiřina', 'Hana', 'Eva']],
      [1950, 1969, ['Jana', 'Marie', 'Eva', 'Hana', 'Anna', 'Věra', 'Alena', 'Ivana', 'Jaroslava', 'Dana', 'Zdeňka', 'Jitka', 'Vlasta', 'Libuše', 'Milena']],
      [1970, 1989, ['Petra', 'Lenka', 'Martina', 'Jana', 'Hana', 'Kateřina', 'Michaela', 'Lucie', 'Andrea', 'Pavla', 'Veronika', 'Monika', 'Zuzana', 'Ivana', 'Markéta']],
      [1990, 2009, ['Tereza', 'Kateřina', 'Lucie', 'Veronika', 'Barbora', 'Kristýna', 'Michaela', 'Petra', 'Markéta', 'Nikola', 'Klára', 'Eliška', 'Adéla', 'Denisa', 'Anna']],
      [2010, 2030, ['Eliška', 'Tereza', 'Anna', 'Adéla', 'Natálie', 'Sofie', 'Karolína', 'Viktorie', 'Ema', 'Barbora', 'Kristýna', 'Rozálie', 'Julie', 'Klára', 'Amálie']],
    ],
  };
  const YEAR = 2026;
  const SUR_TOTAL = SURNAMES.reduce((s, x) => s + x[2], 0);

  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function surnamePair(rnd) {
    let r = rnd() * SUR_TOTAL;
    for (const s of SURNAMES) { r -= s[2]; if (r <= 0) return s; }
    return SURNAMES[0];
  }
  function firstName(rnd, sex, birthYear) {
    const band = FIRST[sex === 'M' ? 'M' : 'Ž'].find(b => birthYear >= b[0] && birthYear <= b[1]) || FIRST[sex === 'M' ? 'M' : 'Ž'][2];
    return pick(rnd, band[2]);
  }
  // osoba: { first, last, sex, birthYear, full: 'Jméno Příjmení', formal: 'PŘÍJMENÍ J.', reverse: 'Příjmení Jméno' }
  function person(rnd, sex, age, opts) {
    sex = sex === 'M' ? 'M' : 'Ž';
    const birthYear = YEAR - (age != null ? age : 20 + Math.floor(rnd() * 45));
    const pair = opts && opts.surnamePair ? opts.surnamePair : surnamePair(rnd);
    const last = sex === 'M' ? pair[0] : pair[1], first = firstName(rnd, sex, birthYear);
    return mk(first, last, sex, birthYear, pair);
  }
  function mk(first, last, sex, birthYear, pair) {
    return { first, last, sex, birthYear, pair, full: `${first} ${last}`, reverse: `${last} ${first}`, formal: `${last.toLocaleUpperCase('cs-CZ')} ${first[0]}.` };
  }
  function phone(rnd) {
    // Fiktivní rozsah 0999… (v ČR nepřidělen), ve formátu, jaký používá dispečerský systém.
    let s = '0999'; for (let i = 0; i < 6; i++) s += Math.floor(rnd() * 10); return s;
  }
  // Oznamovatel podle místa a stavu pacienta. ctx: { patient, age, sex, whKey, unconscious, roadAccident, child }
  function caller(rnd, ctx) {
    const p = ctx.patient, opts = [];
    const add = (w, rel, make) => { if (w > 0) opts.push([w, rel, make]); };
    const adultAge = () => 25 + Math.floor(rnd() * 35);
    const same = (sex, age) => person(rnd, sex, age, { surnamePair: p.pair });
    const other = (sex, age) => person(rnd, sex, age);
    const rs = () => (rnd() < 0.55 ? 'Ž' : 'M');
    const self = !ctx.unconscious && !ctx.child && ctx.age >= 15;
    switch (ctx.whKey) {
      case 'domov': add(8, 'personál domova', () => other(rnd() < 0.85 ? 'Ž' : 'M', adultAge())); add(1, 'sestra domova', () => other('Ž', adultAge())); break;
      case 'skola': add(6, ctx.child ? 'učitel/ka' : 'kolega/kolegyně', () => other(rs(), adultAge())); add(1, 'školník', () => other('M', 50)); break;
      case 'prov': add(5, 'kolega/kolegyně', () => other(rs(), adultAge())); add(2, 'vedoucí', () => other(rs(), 45)); if (self) add(1, 'pacient sám', () => p); break;
      case 'ordinace': case 'zz': add(6, 'lékař/ka', () => other(rs(), 45)); add(3, 'sestra', () => other('Ž', adultAge())); break;
      case 'ulice': case 'silnice': case 'priroda':
        add(5, 'kolemjdoucí', () => other(rs(), adultAge())); add(2, 'svědek', () => other(rs(), adultAge()));
        if (ctx.roadAccident) { add(2, 'PČR', () => other(rnd() < 0.8 ? 'M' : 'Ž', 35)); add(1, 'HZS', () => other('M', 35)); add(1, 'operátor 112', () => other(rs(), 35)); }
        if (self) add(2, 'pacient sám', () => p);
        break;
      default: { // rodinný dům, byt
        if (self) add(ctx.age < 70 ? 4 : 2, 'pacient sám', () => p);
        if (ctx.child) { add(7, p.sex && rnd() < 0.7 ? 'matka' : 'otec', null); }
        else {
          if (ctx.age >= 25) add(4, ctx.sex === 'M' ? 'manželka' : 'manžel', null);
          if (ctx.age >= 55) add(4, rnd() < 0.6 ? 'dcera' : 'syn', null);
          add(1.5, rnd() < 0.5 ? 'soused' : 'sousedka', null);
          if (ctx.age >= 75) add(1, 'pečovatelka', () => other('Ž', adultAge()));
        }
      }
    }
    if (!opts.length) add(1, 'kolemjdoucí', () => other(rs(), adultAge()));
    let tot = opts.reduce((s, o) => s + o[0], 0), r = rnd() * tot, ch = opts[0];
    for (const o of opts) { r -= o[0]; if (r <= 0) { ch = o; break; } }
    let rel = ch[1];
    let who;
    if (ch[2]) who = ch[2]();
    else if (rel === 'matka') who = same('Ž', Math.max(20, ctx.age + 24 + Math.floor(rnd() * 12)));
    else if (rel === 'otec') who = same('M', Math.max(22, ctx.age + 26 + Math.floor(rnd() * 12)));
    else if (rel === 'manželka') who = same('Ž', Math.max(20, ctx.age - 4 + Math.floor(rnd() * 6)));
    else if (rel === 'manžel') who = same('M', Math.max(20, ctx.age + Math.floor(rnd() * 6)));
    else if (rel === 'dcera') who = rnd() < 0.6 ? other('Ž', ctx.age - 28) : same('Ž', ctx.age - 28);
    else if (rel === 'syn') who = same('M', ctx.age - 28);
    else if (rel === 'soused') who = other('M', adultAge());
    else if (rel === 'sousedka') who = other('Ž', adultAge());
    else who = other(rs(), adultAge());
    // tvary podle pohlaví volajícího
    const g = (m, f) => (who.sex === 'M' ? m : f);
    if (rel === 'kolega/kolegyně') rel = g('kolega', 'kolegyně');
    else if (rel === 'učitel/ka') rel = g('učitel', 'učitelka');
    else if (rel === 'lékař/ka') rel = g('lékař', 'lékařka');
    else if (rel === 'vedoucí') rel = g('vedoucí', 'vedoucí');
    else if (rel === 'personál domova') rel = g('ošetřovatel domova', 'ošetřovatelka domova');
    else if (rel === 'kolemjdoucí') rel = g('kolemjdoucí', 'kolemjdoucí');
    else if (rel === 'svědek') rel = g('svědek', 'svědkyně');
    const label = rel === 'pacient sám' ? 'volá pacient sám' : rel === 'PČR' ? 'volá PČR' : rel === 'HZS' ? 'volá HZS' : rel === 'operátor 112' ? 'přepojeno z 112' : `volá ${rel}`;
    return { person: who, rel, label, phone: rel === 'pacient sám' && ctx.patientPhone ? ctx.patientPhone : phone(rnd) };
  }
  return { person, caller, phone, YEAR, SURNAMES };
})();
if (typeof module !== 'undefined') module.exports = ZOS_PEOPLE;
