// Volající z menšin a cizinci: jména, přízvuk a pravděpodobnost podle místa (ne pevné pravidlo). Vše generované.
// foreignFor(rng, c, level) → { id, typ, popis, jmeno } nebo null; deterministické z rng.
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GROUPS = {
  ukrajinsky: { w: 3, typ: 'cizinec', popis: 'ukrajinsky mluvící osoba: lámaná čeština s ukrajinským přízvukem (měkké „l“, tvrdé „r“, „h“ místo „g“, zaměňuješ „i“ a „y“, špatně skloňuješ), hledáš slova, občas vložíš ukrajinské slovo („dobre“, „bud laska“, „djakuju“)',
    M: { f: ['Oleksandr', 'Andrij', 'Taras', 'Mykola', 'Volodymyr', 'Serhij', 'Dmytro', 'Ihor', 'Vasyl', 'Bohdan'], l: ['Kovalenko', 'Ševčenko', 'Bondarenko', 'Melnyk', 'Tkačenko', 'Savčenko', 'Kravčenko', 'Petrenko', 'Marčenko', 'Lysenko'] },
    F: { f: ['Olena', 'Oksana', 'Natalija', 'Tetjana', 'Iryna', 'Halyna', 'Svitlana', 'Kateryna', 'Ludmyla', 'Marija'], l: ['Kovalenko', 'Ševčenko', 'Bondarenko', 'Melnyk', 'Tkačenko', 'Savčenko', 'Kravčenko', 'Petrenko', 'Marčenko', 'Lysenko'] } },
  vietnamsky: { w: 1.2, typ: 'cizinec', popis: 'občan Vietnamu: čeština se zřetelným vietnamským přízvukem (tónová melodie, polykáš koncové souhlásky, „r“ říkáš jako „z“ nebo „l“, „ř“ nezvládáš), velmi krátké a jednoduché věty bez časování, často prosíš „ne rozumím, pomalu prosím“',
    M: { f: ['Hung', 'Minh', 'Tuan', 'Anh', 'Thanh', 'Nam', 'Duc', 'Quang', 'Long', 'Hai'], l: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Dang', 'Bui', 'Do', 'Ngo'] },
    F: { f: ['Lan', 'Mai', 'Huong', 'Linh', 'Hoa', 'Thuy', 'Trang', 'Ngoc', 'Hanh', 'Yen'], l: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Dang', 'Bui', 'Do', 'Ngo'] } },
  nemecky: { w: 1.5, typ: 'cizinec', popis: 'německý turista nebo řidič: lámaná čeština s německým přízvukem (tvrdé „ch“, „w“ jako „v“, „ř“ jako „rž“, koncové „d“ jako „t“, přízvuk na první slabice), doplňuješ německými slovy („bitte“, „ja“, „nein“, „Krankenwagen“), adresu hláskuješ',
    M: { f: ['Stefan', 'Thomas', 'Michael', 'Andreas', 'Klaus', 'Jürgen', 'Matthias', 'Uwe', 'Peter', 'Wolfgang'], l: ['Weber', 'Schneider', 'Fischer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Neumann'] },
    F: { f: ['Petra', 'Sabine', 'Monika', 'Ursula', 'Claudia', 'Birgit', 'Heike', 'Karin', 'Susanne', 'Andrea'], l: ['Weber', 'Schneider', 'Fischer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Neumann'] } },
  rakousky: { w: 0.6, typ: 'cizinec', popis: 'Rakušan nebo Rakušanka z pohraničí: lámaná čeština s rakouským přízvukem a nářečím (měkčí „ch“, „Servus“, „Grüß Gott“, „Rettung“, „bitte schön“), mluvíš pomalu, ptáš se, jestli někdo mluví německy, míchá německá slova, adresu hláskuješ',
    M: { f: ['Franz', 'Josef', 'Johann', 'Gerhard', 'Wolfgang', 'Herbert', 'Alois', 'Karl', 'Helmut', 'Manfred'], l: ['Gruber', 'Huber', 'Mayr', 'Steiner', 'Pichler', 'Bauer', 'Leitner', 'Moser', 'Wimmer', 'Hofer'] },
    F: { f: ['Maria', 'Anna', 'Elisabeth', 'Christine', 'Gertrude', 'Herta', 'Johanna', 'Theresia', 'Waltraud', 'Renate'], l: ['Gruber', 'Huber', 'Mayr', 'Steiner', 'Pichler', 'Bauer', 'Leitner', 'Moser', 'Wimmer', 'Hofer'] } },
  anglicky: { w: 1, typ: 'cizinec', popis: 'cizinec mluvící anglicky (britský nebo americký přízvuk): umíš jen pár českých slov („prosím“, „pomoc“, „dobrý den“), zbytek říkáš anglicky, pomalu a zřetelně, hláskuješ názvy, česká jména komolíš',
    M: { f: ['John', 'David', 'Mark', 'James', 'Michael', 'Robert', 'Steven', 'Paul', 'Chris', 'Daniel'], l: ['Smith', 'Taylor', 'Williams', 'Brown', 'Johnson', 'Miller', 'Davies', 'Wilson', 'Carter', 'Evans'] },
    F: { f: ['Emily', 'Sarah', 'Laura', 'Jessica', 'Hannah', 'Rachel', 'Olivia', 'Emma', 'Claire', 'Megan'], l: ['Smith', 'Taylor', 'Williams', 'Brown', 'Johnson', 'Miller', 'Davies', 'Wilson', 'Carter', 'Evans'] } },
  slovensky: { w: 2, typ: 'cizinec', popis: 'Slovák nebo Slovenka: mluvíš slovensky (slovenské „ľ“, „ä“, „ô“, „ďakujem“, „prosím vás“, „dobre“), česky rozumíš, drobné slovakismy, přízvuk na první slabice',
    M: { f: ['Peter', 'Ján', 'Martin', 'Marek', 'Juraj', 'Michal', 'Tomáš', 'Jozef', 'Ladislav', 'Roman'], l: ['Horváth', 'Kováč', 'Baláž', 'Varga', 'Tóth', 'Molnár', 'Nagy', 'Lukáč', 'Hudák', 'Šimko'] },
    F: { f: ['Jana', 'Zuzana', 'Mária', 'Eva', 'Katarína', 'Lucia', 'Monika', 'Martina', 'Ľubica', 'Silvia'], l: ['Horváthová', 'Kováčová', 'Balážová', 'Vargová', 'Tóthová', 'Molnárová', 'Nagyová', 'Lukáčová', 'Hudáková', 'Šimková'] } },
  polsky: { w: 1, typ: 'cizinec', popis: 'Polák nebo Polka (turista, řidič, dělník): čeština s polským přízvukem (přízvuk na předposlední slabice, tvrdé „ł“, „sz“ a „cz“ místo „š“ a „č“, nosové samohlásky), občas polské slovo („dziękuję“, „proszę“), některé české výrazy komolíš',
    M: { f: ['Piotr', 'Marek', 'Tomasz', 'Krzysztof', 'Andrzej', 'Paweł', 'Jan', 'Marcin', 'Łukasz', 'Jacek'], l: ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski'] },
    F: { f: ['Anna', 'Katarzyna', 'Agnieszka', 'Małgorzata', 'Barbara', 'Ewa', 'Joanna', 'Magdalena', 'Monika', 'Beata'], l: ['Kowalska', 'Nowak', 'Wiśniewska', 'Wójcik', 'Kamińska', 'Lewandowska', 'Zielińska', 'Szymańska', 'Woźniak', 'Dąbrowska'] } },
  romsky: { w: 1.3, typ: 'mensina', popis: 'příslušník nebo příslušnice romské komunity mluvící českým etnolektem: melodická emotivní intonace, rychlé tempo při stresu, oslovuješ „pane doktore“, „paní doktorko“, někdy zmíníš rodinu („moje teta“, „dědeček“), hovorové tvary („ňák“, „vono“); nejde o karikaturu, jen o přirozenou melodii řeči a rodinné zázemí',
    M: { f: ['Ladislav', 'Tibor', 'Zdeněk', 'Marian', 'Karel', 'Igor', 'Dušan', 'Milan', 'Roman', 'Rudolf'], l: ['Horváth', 'Lakatos', 'Gábor', 'Daniel', 'Kotlár', 'Oláh', 'Balog', 'Berki', 'Růžička', 'Giňa'] },
    F: { f: ['Marcela', 'Erika', 'Jolana', 'Gizela', 'Renata', 'Lucie', 'Aneta', 'Mária', 'Ilona', 'Vlasta'], l: ['Horváthová', 'Lakatosová', 'Gáborová', 'Danielová', 'Kotlárová', 'Oláhová', 'Balogová', 'Berkiová', 'Růžičková', 'Giňová'] } },
};
// města v pohraničí (Rakousko, Bavorsko) a turistické oblasti
const POHRANICI = ['kaplice', 'dolni dvoriste', 'vyssi brod', 'rozmberk', 'cesky krumlov', 'nove hrady', 'ceske velenice', 'slavonice', 'nova bystrice', 'horni plana', 'frymburk', 'lipno', 'volary', 'vimperk', 'trhove sviny', 'suchdol nad luznici', 'kvilda', 'borova lada', 'zelena hora', 'cerna v posumavi', 'hrdlorezy', 'cetviny', 'strmilov', 'dacice'];
function ctxMul(id, c) {
  const txt = norm([c.place, c.addr, c.town, c.where, c.poznamka].filter(Boolean).join(' ')), has = re => re.test(txt), m = {};
  const border = POHRANICI.some(t => txt.includes(t)), stavba = has(/stavb|ubytovn|delnick|hala|sklad|tovarn|fabrik|areal|kamion|parkovist|firma|vrata|zavod/) || c.where === 'prov';
  const vecerka = has(/vecerk|potravin|nonstop|market|bufet|stanek|trznic|obchod|kantyn|bistro|sber|asijsk/);
  const turist = has(/hotel|penzion|kemp|chata|turist|rozhled|lyzar|lipno|posumav|hrad|zamek|kemp|parking/);
  const silnice = c.where === 'silnice' || has(/silnic|dalnic|benzin|odpocivadl/);
  if (vecerka) m.vietnamsky = 8;
  if (stavba) { m.ukrajinsky = 4; m.slovensky = 2; m.polsky = 2; }
  if (border) { m.rakousky = 8; m.nemecky = 4; }
  if (turist) { m.nemecky = Math.max(m.nemecky || 1, 4); m.rakousky = Math.max(m.rakousky || 1, 3); m.anglicky = 3; }
  if (silnice) { m.polsky = Math.max(m.polsky || 1, 2); m.ukrajinsky = Math.max(m.ukrajinsky || 1, 2); m.slovensky = Math.max(m.slovensky || 1, 2); m.nemecky = Math.max(m.nemecky || 1, 2); }
  if (['byt', 'domov', 'rd'].includes(c.where) && id === 'romsky') return 1.5;
  return m[id] || 1;
}
// foreignFor(rng, c, level): rozhodne podle místa a role, zda volá cizinec či příslušník menšiny, a vygeneruje jméno
function foreignFor(rng, c, level) {
  const rel = String(c.oznRel || '');
  if (/pacient sám/.test(rel) && c.age < 16) return null;
  if (/PČR|HZS|operátor|lékař|sestra|ošetřovatel|pečovatelka|personál|učitel|vedoucí|kolega|kolegyně|školník/i.test(rel)) return null;
  let top = 1; for (const id of Object.keys(GROUPS)) top = Math.max(top, ctxMul(id, c));
  const lv = level === 'tezke' ? 2 : level === 'zacatecnik' ? 0.3 : 1;
  const p = Math.min(0.7, 0.035 * top * lv);
  if (rng() >= p) return null;
  const ids = Object.keys(GROUPS), wts = ids.map(id => GROUPS[id].w * ctxMul(id, c)), tot = wts.reduce((a, b) => a + b, 0);
  let r = rng() * tot, id = ids[0]; for (let i = 0; i < ids.length; i++) { r -= wts[i]; if (r <= 0) { id = ids[i]; break; } }
  const g = GROUPS[id], sex = c.oznSex === 'M' ? 'M' : c.oznSex === 'Ž' ? 'F' : (/á$/.test(String(c.ozn || '').trim().split(/\s+/).pop()) ? 'F' : 'M'), nm = g[sex];
  const pick = a => a[Math.floor(rng() * a.length)];
  return { id, typ: g.typ, popis: g.popis, jmeno: pick(nm.f) + ' ' + pick(nm.l) };
}
if (typeof module !== 'undefined') module.exports = { foreignFor, GROUPS, ctxMul }; else window.CT_CIZINCI = { foreignFor, GROUPS, ctxMul };
