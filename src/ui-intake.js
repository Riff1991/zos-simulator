// UI – obrazovka „Náběr případu“ (calltaker): věrná kopie nabírací obrazovky ZOS.
// Cihličky = jednotlivá kritéria klasifikace (data src/cihly.json), jen se označují; vyšší barva doporučí N a typ posádky, nic nenastaví.
// Naléhavost a Požadavek na posádku se vždy zadávají ručně, jinak „Případ nelze založit“. Univerzální cihly a +PČR/+HZS jdou jen do poznámky.
// Spolupráce: výběr složky odešle datovou větu na její operační středisko (HJHC = HZS JčK, PJHC = Policie ČR JčK).
let ki = null;
const kInst = () => ki || (ki = CT_CIHLY.createIntake(ZOS_CIHLY, { klasifs: ctKlasifs() }));
const KI_POS = ['DI', 'KOR', 'LZS', 'RLP', 'RV', 'RZP'];
const KI_COOP = [['HJHC', 'HZS Jihočeského kraje', '0999 150 150'], ['PJHC', 'Policie ČR Jihočeský kraj', '0999 158 158'], ['ZVYS', 'ZZS Kraje Vysočina', '0999 155 555'], ['HS', 'Horská služba', '0999 210 210'], ['VZS', 'Vodní záchranná služba', '0999 220 220'], ['FR', 'First responder', '0999 230 230']];
const KI_LOK = ['Hlava', 'Krk', 'Hrudník', 'Břicho', 'Záda', 'Pánev', 'Horní končetina', 'Dolní končetina'];
const KI_ZPUSOB = ['telefonicky na 155', 'datová věta z NIS', 'Aplikace záchranka', 'datová věta z jiné složky', 'SMS od neslyšícího', 'telefonicky na jiné číslo', 'jiný', 'datová věta z TCTV 112'];   // číselník ze skutečného systému
const KI_COLS = ['Název územního prvku', 'Typ prvku', 'Kraj', 'Okres', 'Obec', 'Základní sídelní jednotka', 'Část obce', 'Ulice', 'Doplnění místa', 'POI'];
const kiNew = () => ({ klasif: '', sel: new Set(), n: 0, pos: { DI: 0, KOR: 0, LZS: 0, RLP: 0, RV: 0, RZP: 0 }, coop: new Set(), tab: 'coop', ptab: 'pac', sex: '', lok: new Set(), rows: [], rowSel: -1, log: [], mode: 'zakl' });
let kf = kiNew();
const kiTxt = s => esc(String(s == null ? '' : s));

function kiHtml() {
  const u = kInst(), opts = u.classifications().map(c => `<option value="${kiTxt(c.name)}">${kiTxt(c.name)}</option>`).join('');
  const chr = ZOS_DATA.charaktery.map(c => `<option>${kiTxt(c)}</option>`).join('');
  const sb = (t, extra) => `<button class="ki-b" type="button" ${extra || 'disabled'}>${t}</button>`;
  const pos = k => `<label class="ki-pos"><span>${k}</span><input type="number" id="ki-pos-${k}" min="0" max="9" value="0" data-k="${k}"></label>`;
  return `<div id="ct-pane-intake" class="ct-form ki">
  <div id="ct-idle" class="ct-note" style="padding:10px">Čekáš na hovor. Telefon zazvoní sám; čas mezi hovory běží zrychleně.<br><small>Zkratky: Alt+Z zvednout · Alt+1 urgentní výzva (N1) · Alt+O předat dispečerovi · Alt+P klasifikace · Alt+U ukončit · Alt+D dokončit · Alt+M ztlumit</small></div>
  <div id="ct-formwrap" hidden>
  <div id="ct-aml"></div>
  <div class="ki-top">
    <fieldset class="ki-g ki-vol"><legend>Volající</legend><div class="ki-vg">
      <label>Telefon</label><div class="ki-in"><input id="ctf-vTel" autocomplete="off">${sb('i')}${sb('Tel.')}${sb('SMS')}${sb('AML?', 'data-act="ct-use-aml" title="Použít střed polohy z telefonu (AML)"')}</div>
      <label class="ki-ck ki-c34"><input type="checkbox" id="ctf-hovor3"> Hovor z 3. ruky</label>
      <label>Volající</label><div class="ki-in"><input id="ctf-volajici" autocomplete="off" placeholder="jméno a příjmení"></div>
      <label>Telefon na místo:</label><div class="ki-in"><input id="ctf-telMisto" autocomplete="off">${sb('i')}${sb('Tel.')}${sb('SMS')}${sb('AML?')}</div>
      <label>Způsob ohlášení</label><div class="ki-in"><select id="ctf-zpusob" disabled title="Vyplňuje systém podle způsobu přijetí hovoru"><option value=""></option>${KI_ZPUSOB.map(z => `<option>${kiTxt(z)}</option>`).join('')}</select></div>
      <label>Kontakt na místo:</label><div class="ki-in"><input id="ctf-kontaktMisto" autocomplete="off"></div>
    </div></fieldset>
    <fieldset class="ki-g ki-side ki-portal"><legend>Mobile App Portál</legend><div class="ki-sc"><span class="ki-logo">✚</span>${sb('Portál')}${sb('Video přenos')}</div></fieldset>
    <fieldset class="ki-g ki-side ki-hist"><legend>Historie</legend><div class="ki-hg">${['✚', 'Tel.', 'Inc. adr.', 'Tel. adr.', 'Čís. poj.', 'Vše'].map(t => sb(t)).join('')}</div></fieldset>
    <fieldset class="ki-g ki-side ki-cas"><legend>Čas</legend><div class="ki-t"><span>Doba nabírání případu</span><b id="ki-tcall">00:00:00</b></div><div class="ki-t"><span>Aktuální čas:</span><b id="ki-tnow">--:--:--</b></div></fieldset>
  </div>
  <fieldset class="ki-g ki-adr"><legend>Adresa případu</legend>
    <div class="ki-tabbar"><span class="ki-tab on">Hlavní adresa případu (Primární) - Jihočeský</span></div>
    <div class="ki-adrbody">
      <div class="ki-modes">${['zakl:Základní', 'poi:POI', 'nis:NIS', 'sour:Souřadnice'].map(x => `<button class="ki-b ki-mode${x.startsWith('zakl') ? ' on' : ''}" type="button" ${x.startsWith('zakl') ? '' : 'disabled title="Terén a body zájmu se vybírají v mapě (klikni do mapy)."'}>${x.split(':')[1]}</button>`).join('')}<div class="ki-gap"></div>${sb('AML', 'data-act="ct-use-aml" title="Použít střed polohy z telefonu"')}${sb('i')}${sb('vše')}</div>
      <div class="ki-adrmain">
        <div class="ki-srch"><span class="ki-flag">🇨🇿 ▾</span><span class="ki-kraj">Kraj: Jihočeský</span><input id="ki-search" autocomplete="off" placeholder="hledej obec, ulici nebo číslo (např. tabor pra 15)"></div>
        <div class="ct-addr ki-fields"><div class="ac"><label>Obec / město<input id="ctf-obec" autocomplete="off" placeholder="začni psát název…"></label><div class="ct-sug" id="ct-sug-obec" hidden></div></div><div class="ac"><label>Ulice<input id="ctf-ulice" autocomplete="off" placeholder="začni psát ulici…"></label><div class="ct-sug" id="ct-sug-ulice" hidden></div></div><div class="ac sm"><label>Číslo popisné<input id="ctf-cp" autocomplete="off" placeholder="č. p."></label><div class="ct-sug" id="ct-sug-cp" hidden></div></div><button class="ki-b" type="button" data-act="ct-find" title="Najde bod podle obce, ulice a čísla a posune mapu">Najít na mapě</button></div><input id="ctf-adresa" type="hidden"><input id="ctf-cast" type="hidden">
        <div class="ki-tblw"><table class="ki-tbl"><thead><tr>${KI_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody id="ki-rows"></tbody></table></div>
      </div>
    </div>
    <div class="ki-pozn"><label>Pozn. místo</label><input id="ctf-upresneni" autocomplete="off"><button class="ki-b" type="button" data-act="ct-find" title="Najít na mapě">◎</button><label>Km:</label><input class="sm" disabled><label>Byt:</label><input id="ctf-byt" class="sm"><label>Patro:</label><input id="ctf-patro" class="sm"><label>Přesnost lokalizace:</label><select id="ki-presnost" disabled><option></option><option>Adresní bod</option><option>Bod z mapy</option><option>AML</option><option>Buňka</option><option>Ručně</option></select></div>
    <div id="ct-ptinfo" class="ct-note ki-ptinfo">Poloha zatím nezadána.</div>
  </fieldset>
  <div class="ki-mid">
    <fieldset class="ki-g ki-kl"><legend>Klasifikace případu</legend>
      <div class="ki-kl-in">
        <div class="ki-kl-l">
          <label>Klasifikace</label><div class="ki-rowx"><select id="ki-klasif"><option value=""></option>${opts}</select><button class="ki-b" type="button" data-act="ct-ki-vyber">Vyber</button></div>
          <label>Charakter</label><select id="ctf-charakter" class="ki-req"><option value=""></option>${chr}</select>
          <label>Co se stalo</label><textarea id="ctf-popis" class="ki-req" rows="3"></textarea>
          <details class="ki-int"><summary>Interní poznámka:</summary><textarea id="ctf-poznamka" rows="2"></textarea></details>
          <div class="ki-nal"><label>Naléhavost:</label><div class="ki-nb" id="ki-n">${[0, 1, 2, 3, 4].map(n => `<button type="button" class="ki-b${n === 0 ? ' on' : ''}" data-act="ct-ki-n" data-n="${n}">${n ? 'N' + n : 'NE'}</button>`).join('')}</div></div>
          <button class="ki-b ki-wide" type="button" data-act="ct-ki-mu">Mimořádná událost</button>
        </div>
        <fieldset class="ki-chipbox"><legend>Upřesnění klasifikace</legend><div id="ki-chips" class="ki-chips"></div><div id="ki-seltxt" class="ki-seltxt"></div></fieldset>
      </div>
    </fieldset>
    <div class="ki-right">
      <div class="ki-pac">
        <div class="ki-tabbar"><span class="ki-tab on" data-act="ct-ki-ptab" data-t="pac">Detail pacienta</span><span class="ki-tab" data-act="ct-ki-ptab" data-t="lok">Lokalizace zranění</span></div>
        <div id="ki-pp-pac" class="ki-pbody"><label>Příjmení:</label><input id="ctf-pPrijmeni" autocomplete="off"><label>Jméno:</label><input id="ctf-pJmeno" autocomplete="off"><label>Pozn. pacient</label><textarea id="ctf-pPozn" rows="3"></textarea>
          <div class="ki-sv"><fieldset class="ki-g"><legend>Pohlaví</legend><button class="ki-b" type="button" data-act="ct-ki-sex" data-s="muž">Muž</button><button class="ki-b" type="button" data-act="ct-ki-sex" data-s="žena">Žena</button></fieldset><fieldset class="ki-g"><legend>Věk/rok</legend><input id="ctf-pVek" autocomplete="off" placeholder="věk nebo rok narození"></fieldset></div></div>
        <div id="ki-pp-lok" class="ki-pbody" hidden>${KI_LOK.map(l => `<button class="ki-b ki-lok" type="button" data-act="ct-ki-lok" data-l="${l}">${l}</button>`).join('')}</div>
      </div>
      <fieldset class="ki-g ki-req2"><legend>Požadavek na posádku</legend><div class="ki-posg">${pos('DI')}${pos('KOR')}${pos('LZS')}${pos('RLP')}${pos('RV')}${pos('RZP')}</div>
        <div class="ki-cnt"><label>Předpokládaný počet pacientů</label><input type="number" id="ctf-pocet" min="1" max="40" value="1"></div>
        <div class="ki-cnt"><label>Ohrožených osob:</label><input type="number" id="ctf-ohrozeno" min="0" max="99"><label>Os. voz.:</label><input type="number" id="ctf-osVoz" min="0" max="99"></div>
        <div class="ki-cnt"><label class="ki-ck"><input type="checkbox" id="ctf-vyprosteni"> Nutnost vyproštění</label><label>Nákl. voz.:</label><input type="number" id="ctf-naklVoz" min="0" max="99"></div></fieldset>
    </div>
    <div class="ki-coop">
      <div class="ki-tabbar"><span class="ki-tab on" data-act="ct-ki-ctab" data-t="coop">Spolupráce</span><span class="ki-tab" data-act="ct-ki-ctab" data-t="nis">Zprávy NIS (0)</span><span class="ki-tab" data-act="ct-ki-ctab" data-t="zaz" id="ki-tzaz">Záznamy (0)</span></div>
      <div id="ki-cp-coop" class="ki-cbody"><div class="ki-cbtns">${KI_COOP.map(c => `<span class="ki-cg" data-k="${c[0]}"><button class="ki-b" type="button" data-act="ct-ki-coop" data-k="${c[0]}" title="${kiTxt(c[1])}">${c[0]}</button><button class="ki-b" type="button" data-act="ct-ki-coop" data-k="${c[0]}">+</button></span>`).join('')}<button class="ki-b" type="button" data-act="ct-ki-ostatni">Ostatní</button></div>
        <div id="ki-msg" class="ki-msg"></div>
        <table class="ki-tbl ki-ctbl"><thead><tr><th>Název</th><th>Dojezdová d…</th><th>Telefon</th></tr></thead><tbody id="ki-ctbl"></tbody></table></div>
      <div id="ki-cp-nis" class="ki-cbody" hidden><div class="ct-note" style="padding:8px">Žádné zprávy z NIS.</div></div>
      <div id="ki-cp-zaz" class="ki-cbody" hidden><div id="ki-log" class="ki-log"></div></div>
    </div>
  </div>
  <div id="ki-merge" class="ki-merge" hidden><label>Sloučit s případem (jiný volající k téže události)<select id="ctf-sluc"><option value="">– nový případ –</option></select></label></div>
  <div class="ki-bar">
    <button class="ki-gr" id="ct-sendbtn" type="button" data-act="ct-send">Předat dispečerovi</button><button class="ki-gr" type="button" data-act="ct-ki-izs">Předat složce IZS</button><button class="ki-gr" type="button" data-act="ct-ki-jiny">Předat jinému operátorovi</button><button class="ki-gr" id="ct-n1btn" type="button" data-act="ct-n1" title="Alt+1: adresa a N1, případ jde hned dispečerovi, zbytek doplníš">Urgentní výzva</button><button class="ki-bl" type="button" data-act="ct-ki-sek">Sekundár</button>
    <span class="ki-gap"></span><button class="ki-bl2" type="button" data-act="ct-ki-tisk">Tisk</button><button class="ki-bl2" type="button" data-act="ct-ki-tisk">Tisk pro sekundár</button><span class="ki-gap"></span>
    <button class="ki-bx" type="button" data-act="ct-ki-sluc">Sloučit</button><button class="ki-bx" type="button" data-act="ct-ki-end" data-why="Zlomyslné volání">Zlomyslný</button><button class="ki-bx" type="button" data-act="ct-ki-end" data-why="Informační hovor">Informační</button><button class="ki-bx" type="button" disabled>Storno</button><button class="ki-bx" type="button" data-act="ct-ki-end" data-why="Odmítnuto">Odmítnout</button>
  </div>
  <div id="ct-sendinfo" class="ct-note ki-info"></div>
  <details id="ct-trwrap"><summary class="ct-note">Přepis hovoru</summary><div id="ct-tr" class="ct-tr"></div><div id="ct-textrow" style="display:none;gap:6px"><input id="ct-say" placeholder="Co řekneš volajícímu…"><button class="btn" data-act="ct-say" style="margin:0">Poslat</button></div></details>
  </div></div><div id="ct-pane-mine" hidden style="padding:6px 8px"></div>`;
}

// ---------- cihličky ----------
function kiChipHtml(x, cls) { return `<button type="button" class="ki-chip ${cls}${kf.sel.has(x.id) ? ' sel' : ''}" data-act="ct-ki-chip" data-id="${kiTxt(x.id)}" data-tip="${kiTxt(x.d || x.t || x.c)}">${kiTxt(x.c)}</button>`; }
function kiRenderChips() {
  const e = $('ki-chips'); if (!e) return;
  const u = kInst(); let h = '';
  const KIND_CLS = { n1: 'c-red', n2: 'c-blue', n2di: 'c-mag', n3: 'c-green', n4: 'c-n4' };
  h += CT_CIHLY.UNIVERSAL.map(x => (x.cls === 'u-empty' ? `<span class="ki-chip u-empty">${x.c}</span>` : kiChipHtml(x, x.cls))).join('');
  if (kf.klasif) {
    const d = u.chipsFor(kf.klasif);
    for (const g of d.groups) h += g.chips.map(x => kiChipHtml(x, KIND_CLS[g.kind])).join('');
    h += d.gray.map((c, i) => kiChipHtml({ id: 'g:' + kf.klasif + ':' + c, c, t: c }, 'u-gray')).join('');
  }
  e.innerHTML = h;
  kiSelText();
}
function kiSelText() {
  const e = $('ki-seltxt'); if (!e) return; const u = kInst();
  e.innerHTML = [...kf.sel].map(id => { const x = u.chip(id); return x ? `<span class="ki-st ${x.kind}">${kiTxt(x.t)}</span>` : ''; }).join('');
}
const kiCodes = () => {
  const u = kInst(), out = [];
  for (const id of kf.sel) { if (id.startsWith('u:')) { const x = CT_CIHLY.UNIVERSAL[Number(id.slice(2))]; if (x && x.cls !== 'u-empty') out.push(x.c.replace(/^\+ /, '+')); } else if (id.startsWith('g:')) out.push(id.split(':').slice(2).join(':')); else { const x = u.chip(id); if (x) out.push(x.c); } }
  return out;
};
function kiToggleChip(id) {
  const x = id.startsWith('u:') ? CT_CIHLY.UNIVERSAL[Number(id.slice(2))] : null;
  if (kf.sel.has(id)) kf.sel.delete(id);
  else { if (x && x.grp) for (const o of CT_CIHLY.UNIVERSAL) if (o.grp === x.grp) kf.sel.delete(o.id); kf.sel.add(id); }
  kiRenderChips(); kiRecommend();
}
// doporučení: orámuje N a typ posádky podle nejvyšší označené barvy (nic nenastavuje)
function kiRecommend() {
  const r = kInst().evaluate([...kf.sel]);
  document.querySelectorAll('#ki-n .ki-b').forEach(b => b.classList.toggle('rec', !!r && Number(b.dataset.n) === r.n));
  const want = new Set(r ? r.crew : []); if (r && r.dyn) want.add('DI');
  for (const k of KI_POS) { const l = $('ki-pos-' + k); if (l && l.parentNode) l.parentNode.classList.toggle('rec', want.has(k)); }
}
const kiPosSum = () => KI_POS.reduce((a, k) => a + (Number(kf.pos[k]) || 0), 0);

// ---------- adresní tabulka ----------
function kiSearchRows(q) {
  const ix = ctAddrIndex(); if (!ix) return [];
  const toks = ctNk(q).split(' ').filter(Boolean); if (!toks.length) return [];
  const num = toks.filter(t => /[0-9]/.test(t)), words = toks.filter(t => !/[0-9]/.test(t)), hit = (nk, w) => nk.split(' ').some(x => x.startsWith(w));
  const rows = [], towns = [];
  if (words.length && !num.length) for (const t of ix.towns) if (words.every(w => hit(t.nk, w))) towns.push(t);
  towns.sort((a, b) => b.c - a.c).slice(0, 4).forEach(t => rows.push({ typ: 'Obec', name: t.n, obec: t.n, okres: t.okres, ulice: '', cp: '', cast: '' }));
  const st = [];
  for (const t of ix.towns) {
    const th = words.filter(w => hit(t.nk, w)), need = th.length ? words.filter(w => !th.includes(w)) : words;
    if (!need.length && !num.length) continue; if (!th.length && !need.length) continue;
    for (const s of t.streets.values()) if (s.n && need.every(w => hit(s.nk, w))) st.push({ t, s });
  }
  st.sort((a, b) => b.s.c - a.s.c);
  for (const { t, s } of st) {
    if (rows.length >= 12) break;
    if (num.length) { for (const nm of s.nums) if (ctNk(nm).startsWith(num[0]) && rows.length < 12) rows.push({ typ: 'Adresní bod', name: s.n + ' ' + nm, obec: t.n, okres: t.okres, ulice: s.n, cp: nm, cast: s.cast }); }
    else rows.push({ typ: 'Ulice', name: s.n, obec: t.n, okres: t.okres, ulice: s.n, cp: '', cast: s.cast });
  }
  return rows;
}
function kiRenderRows() {
  const e = $('ki-rows'); if (!e) return;
  e.innerHTML = kf.rows.map((r, i) => `<tr class="${i === kf.rowSel ? 'sel' : ''}" data-act="ct-ki-row" data-i="${i}"><td>${kiTxt(r.name)}</td><td>${kiTxt(r.typ)}</td><td>Jihočeský</td><td>${kiTxt(r.okres || '')}</td><td>${kiTxt(r.obec)}</td><td>${kiTxt(r.obec)}</td><td>${kiTxt(r.cast || '')}</td><td>${kiTxt(r.ulice)}</td><td></td><td></td></tr>`).join('') || '<tr class="empty"><td colspan="10"></td></tr>';
}
function kiPickRow(i) {
  const r = kf.rows[i]; if (!r) return;
  kf.rowSel = i; ctSetAddr({ obec: r.obec, ulice: r.ulice, cp: r.cp }); ct.addrAuto = false; ct.okoli = false;
  if (r.cast) ctSet('ctf-cast', r.cast);
  kiRenderRows(); if (r.typ === 'Adresní bod') ctFind(); else if (r.typ === 'Ulice') { const n = $('ctf-cp'); if (n) n.focus(); }
}
function kiPrecision() {
  const e = $('ki-presnost'); if (!e) return; const p = ct.pt;
  e.value = !p ? '' : p.src === 'AML' ? 'AML' : p.src === 'mapa' ? 'Bod z mapy' : 'Adresní bod';
}

// ---------- spolupráce ----------
function kiRenderCoop() {
  document.querySelectorAll('.ki-cg').forEach(g => g.classList.toggle('on', kf.coop.has(g.dataset.k)));
  const sel = KI_COOP.filter(c => kf.coop.has(c[0]));
  const m = $('ki-msg'); if (m) m.innerHTML = sel.length ? sel.map(c => `<div>Datová věta → ${kiTxt(c[1])}: událost, adresa a poznámka z nabírání bude odeslána při předání případu.</div>`).join('') : '<span class="ct-note">Složka se vybere kliknutím; datová věta jí odejde při předání případu.</span>';
  const t = $('ki-ctbl'); if (t) t.innerHTML = sel.map(c => `<tr><td>${kiTxt(c[1])}</td><td></td><td>${kiTxt(c[2])}</td></tr>`).join('');
  const l = $('ki-log'); if (l) l.innerHTML = kf.log.map(x => `<div>${kiTxt(x)}</div>`).join('') || '<div class="ct-note">Zatím žádné záznamy.</div>';
  const z = $('ki-tzaz'); if (z) z.textContent = 'Záznamy (' + kf.log.length + ')';
}
const kiLog = t => { kf.log.push(sim.clock() + ' ' + t); kiRenderCoop(); };

// ---------- čtení a plnění formuláře ----------
function kiNote() {
  const codes = kiCodes(), user = ctVal('ctf-poznamka'), lok = [...kf.lok].join(', ');
  return [codes.length ? '#' + codes.join(', ') : '', lok ? 'zranění: ' + lok : '', ctVal('ctf-pPozn') ? 'pacient: ' + ctVal('ctf-pPozn') : '', user].filter(Boolean).join(' | ');
}
function kiReadForm() {
  ctAddrSync();
  const p = ct.pt, v = ctVal('ctf-pVek'), num = Number(v), pc = Number(ctVal('ctf-pocet')), ch = id => { const e = $(id); return !!(e && e.checked); };
  const zdroj = p ? p.src : ctVal('ctf-adresa') ? 'adresa' : '', kl = kf.klasif ? kInst().classifications().find(x => x.name === kf.klasif) : null;
  const vol = ctVal('ctf-volajici').split(/\s+/).filter(Boolean), dyn = kf.pos.DI > 0 || [...kf.sel].some(id => id.startsWith('u:') && CT_CIHLY.UNIVERSAL[Number(id.slice(2))].c === 'DYNAMICKÁ_INDIK');
  const pozn = [ctVal('ctf-upresneni'), ctVal('ctf-byt') ? 'byt ' + ctVal('ctf-byt') : '', ctVal('ctf-patro') ? 'patro ' + ctVal('ctf-patro') : ''].filter(Boolean).join(', ');
  return {
    adresa: ctVal('ctf-adresa'), bod: p && p.src !== 'adresa' ? { lat: p.lat, lon: p.lon } : null, zdroj, cast: ctVal('ctf-cast'), upresneni: pozn,
    vJmeno: vol[0] || '', vPrijmeni: vol.slice(1).join(' '), vTelefon: ctVal('ctf-vTel'), vVztah: ch('ctf-hovor3') ? '3. ruka' : '', telMisto: ctVal('ctf-telMisto'), kontaktMisto: ctVal('ctf-kontaktMisto'), zpusob: ctVal('ctf-zpusob'),
    pJmeno: ctVal('ctf-pJmeno'), pPrijmeni: ctVal('ctf-pPrijmeni'), pPohlavi: kf.sex, pRok: num > 1900 ? num : '', pVek: v && num <= 130 ? num : '',
    cihla: true, klasif: kl ? kl.engine : '', klasifTabulka: kf.klasif, priznaky: [], cihly: [...kf.sel], n: kf.n >= 1 && kf.n <= 4 ? String(kf.n) : '', dyn: kf.n ? dyn : null, posadky: Object.assign({}, kf.pos),
    charakter: ctVal('ctf-charakter'), popis: ctVal('ctf-popis'), poznamka: kiNote(), spoluprace: [...kf.coop],
    agPcr: kf.coop.has('PJHC'), agHzs: kf.coop.has('HJHC'), nebezpeci: Number(ctVal('ctf-ohrozeno')) > 0, vyprosteni: ch('ctf-vyprosteni'), ohrozeno: ctVal('ctf-ohrozeno'), osVoz: ctVal('ctf-osVoz'), naklVoz: ctVal('ctf-naklVoz'),
    pocet: pc > 0 ? pc : '', slucitS: ctVal('ctf-sluc'),
  };
}
// co chybí k založení případu (jako ve skutečném systému)
function kiMissing(form, pre) {
  const out = [];
  if (!form.adresa && !form.bod) out.push('Adresa případu');
  if (pre) return out;
  if (!kf.klasif) out.push('Klasifikace');
  if (!kf.n) out.push('Naléhavost');
  if (!kiPosSum()) out.push('Požadavek na posádku');
  return out;
}
function kiMissingModal(list) {
  modal(`<div class="card home ct-form ct-card" style="max-width:420px"><h2 style="margin:0">Případ nelze založit</h2><p>Doplňte prosím následující informace:</p><ul style="margin:4px 0 8px;padding-left:20px">${list.map(x => `<li><b>${kiTxt(x)}</b></li>`).join('')}</ul><div class="foot"><button class="btn pri" data-act="close">OK</button></div></div>`);
}
function kiReset(f) {
  kf = kiNew();
  for (const id of ['volajici', 'telMisto', 'kontaktMisto', 'pPozn', 'byt', 'patro', 'ohrozeno', 'osVoz', 'naklVoz', 'charakter', 'zpusob']) ctSet('ctf-' + id, '');
  for (const id of ['hovor3', 'vyprosteni']) { const e = $('ctf-' + id); if (e) e.checked = false; }
  ctSet('ctf-pocet', '1'); ctSet('ctf-zpusob', 'telefonicky na 155'); ctSet('ki-klasif', ''); ctSet('ki-search', '');
  for (const k of KI_POS) ctSet('ki-pos-' + k, '0');
  document.querySelectorAll('#ki-n .ki-b').forEach(b => b.classList.toggle('on', b.dataset.n === '0'));
  document.querySelectorAll('.ki-lok,[data-act="ct-ki-sex"]').forEach(b => b.classList.remove('on'));
  kiPtab('pac'); kiCtab('coop'); kiRenderChips(); kiRecommend(); kiRenderRows(); kiRenderCoop(); kiPrecision();
  const mg = $('ki-merge'); if (mg) mg.hidden = true;
  void f;
}
function kiFill(fm) {
  const nm = [fm.vJmeno, fm.vPrijmeni].filter(Boolean).join(' '); if (nm) ctSet('ctf-volajici', nm);
  if (fm.telMisto) ctSet('ctf-telMisto', fm.telMisto); if (fm.kontaktMisto) ctSet('ctf-kontaktMisto', fm.kontaktMisto); if (fm.zpusob) ctSet('ctf-zpusob', fm.zpusob); if (fm.charakter) ctSet('ctf-charakter', fm.charakter);
  const k = fm.klasifTabulka; if (k) { kf.klasif = k; ctSet('ki-klasif', k); }
  for (const id of fm.cihly || []) kf.sel.add(id);
  kf.n = Number(fm.n) || 0; document.querySelectorAll('#ki-n .ki-b').forEach(b => b.classList.toggle('on', Number(b.dataset.n) === kf.n));
  if (fm.posadky) for (const q of KI_POS) { kf.pos[q] = Number(fm.posadky[q]) || 0; ctSet('ki-pos-' + q, String(kf.pos[q])); }
  for (const c of fm.spoluprace || []) kf.coop.add(c);
  if (fm.pPohlavi) { kf.sex = fm.pPohlavi; document.querySelectorAll('[data-act="ct-ki-sex"]').forEach(b => b.classList.toggle('on', b.dataset.s === kf.sex)); }
  kiRenderChips(); kiRecommend(); kiRenderCoop();
}

// ---------- záložky, časy, akce ----------
function kiPtab(t) { kf.ptab = t; $('ki-pp-pac').hidden = t !== 'pac'; $('ki-pp-lok').hidden = t !== 'lok'; document.querySelectorAll('[data-act="ct-ki-ptab"]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
function kiCtab(t) { kf.tab = t; for (const k of ['coop', 'nis', 'zaz']) { const e = $('ki-cp-' + k); if (e) e.hidden = k !== t; } document.querySelectorAll('[data-act="ct-ki-ctab"]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
const kiHMS = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function kiTick() {
  const a = $('ki-tcall'), b = $('ki-tnow'); if (!a || !ct.call) return;
  const v1 = kiHMS(sim.s.t - ct.call.pickedAt); if (a.textContent !== v1) a.textContent = v1;
  const v2 = sim.clock(); if (b.textContent !== v2) b.textContent = v2;
  const aml = document.querySelectorAll('[data-act="ct-use-aml"]'), has = ctAmlPhases().length > 0; aml.forEach(x => { x.disabled = !has; });
  kiPrecision();
}
function kiSend() {   // „Předat složce IZS“: vyžaduje vybranou složku a pak případ předá stejně jako dispečerovi
  if (![...kf.coop].length) { kiMissingModal(['Spolupráce: vyberte složku IZS']); return; }
  ctSend();
}
function kiEnd(why) {
  const call = ct.call; if (!call) return;
  if (call.caseId) { toast('Případ už je založen, nelze ho odmítnout.', 'warn'); return; }
  ctHangup().then(() => { toast(why + ': hovor ukončen bez založení případu.', ''); ctFinish(); });
}
function kiAct(a, el) {
  const d = el.dataset;
  switch (a) {
    case 'ct-ki-chip': kiToggleChip(d.id); break;
    case 'ct-ki-n': kf.n = Number(d.n); document.querySelectorAll('#ki-n .ki-b').forEach(b => b.classList.toggle('on', Number(b.dataset.n) === kf.n)); break;
    case 'ct-ki-vyber': { const s = $('ki-klasif'); s.focus(); try { s.showPicker(); } catch (_) { /* ignore */ } break; }
    case 'ct-ki-row': kiPickRow(Number(d.i)); break;
    case 'ct-ki-ptab': kiPtab(d.t); break;
    case 'ct-ki-ctab': kiCtab(d.t); break;
    case 'ct-ki-sex': kf.sex = kf.sex === d.s ? '' : d.s; document.querySelectorAll('[data-act="ct-ki-sex"]').forEach(b => b.classList.toggle('on', b.dataset.s === kf.sex)); break;
    case 'ct-ki-lok': if (kf.lok.has(d.l)) kf.lok.delete(d.l); else kf.lok.add(d.l); el.classList.toggle('on', kf.lok.has(d.l)); break;
    case 'ct-ki-coop': if (kf.coop.has(d.k)) kf.coop.delete(d.k); else { kf.coop.add(d.k); kiLog('vybrána složka ' + d.k); } kiRenderCoop(); break;
    case 'ct-ki-ostatni': toast('Další složky (Ostatní) nejsou v cvičení k dispozici.', ''); break;
    case 'ct-ki-izs': kiSend(); break;
    case 'ct-ki-jiny': toast('Předání jinému operátorovi není v cvičení k dispozici.', ''); break;
    case 'ct-ki-sek': toast('Sekundární převoz se z příjmu hovoru nezakládá.', ''); break;
    case 'ct-ki-tisk': toast('Tisk není v cvičení k dispozici.', ''); break;
    case 'ct-ki-mu': toast('Mimořádná událost: vyber klasifikaci „MU – MATRA 722“ nebo cihlu SUSP_MU.', ''); break;
    case 'ct-ki-sluc': { const m = $('ki-merge'); m.hidden = !m.hidden; break; }
    case 'ct-ki-end': kiEnd(d.why); break;
  }
}
// plné znění cihličky pod myší (okamžitě, ne až po prodlevě systémového tooltipu)
let kiTip = null;
function kiTipShow(ev) {
  const c = ev.target.closest && ev.target.closest('.ki-chip[data-tip]');
  if (!c || !c.dataset.tip) { if (kiTip) kiTip.hidden = true; return; }
  if (!kiTip) { kiTip = document.createElement('div'); kiTip.className = 'ki-tip'; document.body.appendChild(kiTip); }
  kiTip.textContent = c.dataset.tip; kiTip.hidden = false;
  const w = kiTip.offsetWidth, x = Math.min(ev.clientX + 12, innerWidth - w - 8);
  kiTip.style.left = Math.max(4, x) + 'px'; kiTip.style.top = Math.min(ev.clientY + 18, innerHeight - kiTip.offsetHeight - 6) + 'px';
}
document.addEventListener('mousemove', kiTipShow);
document.addEventListener('mouseleave', () => { if (kiTip) kiTip.hidden = true; });
document.addEventListener('click', () => { if (kiTip) kiTip.hidden = true; });
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !ctModeOn()) return;
  if (t.id === 'ki-klasif') { kf.klasif = t.value; for (const id of [...kf.sel]) if (!id.startsWith('u:')) kf.sel.delete(id); kiRenderChips(); kiRecommend(); }
  else if (t.id && t.id.startsWith('ki-pos-')) { kf.pos[t.dataset.k] = Math.max(0, Math.min(9, Number(t.value) || 0)); }
});
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !ctModeOn()) return;
  if (t.id === 'ki-search') { kf.rows = kiSearchRows(t.value); kf.rowSel = -1; kiRenderRows(); }
  else if (t.id && t.id.startsWith('ki-pos-')) { kf.pos[t.dataset.k] = Math.max(0, Math.min(9, Number(t.value) || 0)); }
});
