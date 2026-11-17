// UI – Horní lišta, případy, panel MU, posádky (části se v build.py skládají v tomto pořadí do jednoho skriptu).
// ---------- horní lišta ----------
function renderTop() {
  const s = sim.s, sm = sim.summary();
  $('clock').textContent = sim.clock();
  const effSpeed = radioSlowActive() ? Math.min(speed, 1) : speed;
  setHTML($('speeds'), SPEEDS.map(v => `<button data-speed="${v}" class="${v === effSpeed ? 'on' : ''}${v === speed && effSpeed !== speed ? ' set' : ''}" title="${v === speed && effSpeed !== speed ? 'Nastavená rychlost – během rádiové relace hra běží 1×' : ''}">${v === 0 ? '⏸' : v + '×'}</button>`).join(''));
  const waiting = s.cases.filter(c => c.status === 'waiting' || (c.status === 'active' && missingInitialDispatch(c).length)).length;
  const rem = Math.max(0, s.shiftLen - s.t);
  const left = s.mode === 'shift' ? ` · zbývá ${Math.floor(rem / 3600)}:${pad(Math.floor(rem % 3600 / 60))} h` : ' · volný režim';
  const wx = sim._lzsWeatherStatus(), wxText = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  const wo = sim.wxObs(), wl = sim.wxLzs();
  const wxHtml = wo ? (() => {
    const sk = ZOS_WX.sky(wo), kt = Math.round(wo.wind), kmh = Math.round(wo.wind * 1.852), src = s.weather.src === 'real' ? 'skutečné historické počasí' : 'simulované počasí (data nejsou k dispozici)';
    return `<span title="Datum hry">${esc(sim.dateInfo().label)}</span><span title="${esc(sk.txt + ' · ' + src + ' · dohlednost ' + Math.round(wo.vis) + ' m, základna oblačnosti ' + Math.round(wo.base) + ' ft')}">${sk.icon} <b>${wo.temp.toFixed(1).replace('.', ',')} °C</b>${s.weather.src === 'real' ? '' : ' <small>sim.</small>'}</span><span title="Vítr (odkud vane), nárazy ${Math.round(wo.gust)} kt">${ZOS_WX.dirArrow(wo.dir)} ${ZOS_WX.dirName(wo.dir)} <b>${kmh} km/h</b> · ${kt} kt</span>`;
  })() : '';
  setHTML($('kpi'), wxHtml + `<span>Skóre <b>${sm.total.toFixed(1)}</b> <small title="Průběžné body za správné a opomenuté úkony">(${sm.opsPoints > 0 ? '+' : ''}${sm.opsPoints} provozních b.)</small></span><span>Pokrytí <b>${sm.covNow == null ? '–' : Math.round(sm.covNow) + ' %'}</b></span><span class="${waiting ? 'warn' : ''}">Čekající <b>${waiting}</b></span><span title="${esc(wl && wl.why.length ? wl.why.join(', ') : 'bez omezení')}">LZS <b>${wxText}</b></span><span>${left.replace(/^ · /, '')}</span>`);
  if (!satellitePanel) {
    $('toggle-map-main').textContent = mainPanelHidden.map ? 'Zobrazit mapu zde' : 'Skrýt mapu zde';
    $('toggle-radio-main').textContent = mainPanelHidden.radio ? 'Zobrazit přehled zde' : 'Skrýt přehled zde';
  }
  $('btn-end').style.display = s.mode === 'free' ? '' : 'none';
  const nb = $('nav'); setHTML(nb, (ctModeOn() ? ctNavItems() : [['cases', 'Případy'], ['detail', 'Případ'], ['crews', 'Posádky'], ['map', 'Mapa'], ['radio', 'Transporty']]).map(([k, l]) =>
    `<button data-view="${k}" class="${view === k ? 'on' : ''}">${l}${k === 'cases' && waiting ? `<span class="badge">${waiting}</span>` : ''}</button>`).join(''));
  document.querySelectorAll('.win').forEach(w => w.classList.toggle('active', w.id === 'w-' + view));
  if (typeof ctModeOn === 'function' && ctModeOn()) setHTML($('alerts-live'), ''); else { renderLiveAlerts(); renderRadioLive(); }
  tutTick();
}
// Upozornění nahoře: hlášení 112 zmizí samo nejpozději po 40 s (reálného času) nebo po kliknutí na ✕.
// Zpráva zůstává v rádiovém logu a případ lze otevřít i odtud.
const ALERT_TTL_MS = 40000, alertSeen = new Map(), alertHidden = new Set();
function renderLiveAlerts() {
  const now = performance.now();
  const visible = key => { if (alertHidden.has(key)) return false; if (!alertSeen.has(key)) alertSeen.set(key, now); return now - alertSeen.get(key) < ALERT_TTL_MS; };
  const rvOnRadio = c => (sim.s.radioQ || []).some(e => e.caseId === c.id && e.kind === 'rv' && (e.state === 'calling' || e.state === 'open'));
  const requests = sim.s.cases.filter(c => c.status !== 'closed' && c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && !alertHidden.has('rv:' + c.id) && !rvOnRadio(c) && (c.rvAckAt == null || sim.s.t - c.rvAckAt > 60));
  const agencyReq = sim.s.cases.filter(c => c.status !== 'closed' && c.agencies).flatMap(c => ['pcr', 'hzs'].filter(k => c.agencies[k] && c.agencies[k].state === 'requested' && !c.agencies[k].fromCall && !alertHidden.has(`ag:${c.id}:${k}`)).map(k => ({ c, k })));
  const reports = sim.s.cases.filter(c => !c.mu).flatMap(c => (c.radioReports || []).filter(r => r.received && !r.acknowledged && visible(c.id + ':' + r.id)).map(r => ({ c, r }))).slice(-4);
  const x = (key, extra) => `<span class="alert-x" role="button" aria-label="Zavřít upozornění" title="Zavřít" data-act="dismiss-alert" data-key="${esc(key)}"${extra || ''}>✕</span>`;
  const requestHtml = requests.map(c => {
    const crew = c.crews.map(id => sim.crewOf(id)).find(k => k && k.type === 'RZP');
    return `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ ${esc((c.rvReq.kind || 'zhoršení stavu').toLocaleUpperCase('cs-CZ'))} · ${esc(c.num)} · N${c.n}${crew ? ' · ' + esc(crew.name) : ''} · ${esc(c.klasif)} — klikni pro otevření</span>${x('rv:' + c.id)}</div>`;
  });
  const reportHtml = reports.map(({ c, r }) => `<div class="live-alert report-alert${r.red ? ' red' : ''}" role="button" tabindex="0" data-case="${c.id}" data-report="${esc(r.id)}"><span class="alert-txt">☎ ${esc(r.source || 'Linka 112')} · ${esc(c.num)}: ${esc(r.text)} — klikni pro otevření</span>${x(c.id + ':' + r.id, ` data-case="${c.id}" data-report="${esc(r.id)}"`)}</div>`);
  const corReq = sim.s.cases.filter(c => c.status !== 'closed' && c.coroner && c.coroner.state === 'available' && !alertHidden.has(`cor:${c.id}`));
  const corHtml = corReq.map(c => `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ KORONER K DISPOZICI · ${esc(c.num)} — klikni a přetáhni dlaždici KORONER na případ</span>${x(`cor:${c.id}`)}</div>`);
  const agencyHtml = agencyReq.map(({ c, k }) => `<div class="live-alert" role="button" tabindex="0" data-case="${c.id}"><span class="alert-txt">⚠ ${c.agencies[k].fromCall ? 'VÝZVA VYŽADUJE' : 'POSÁDKA ŽÁDÁ'} ${k === 'pcr' ? 'POLICII' : 'HASIČE'} · ${esc(c.num)} · ${esc(c.agencies[k].why || '')} — klikni a přetáhni dlaždici ${k === 'pcr' ? 'PČR' : 'HZS'} na případ</span>${x(`ag:${c.id}:${k}`)}</div>`);
  setHTML($('alerts-live'), requestHtml.concat(corHtml, agencyHtml, reportHtml).join(''));
}

// ---------- případy ----------
// rychlost posádky pro panel a štítek u vozu (LZS i v uzlech)
function crewSpeedText(k) {
  const v = sim.speedKmh(k);
  return k.type === 'LZS' ? `${v} km/h · ${Math.round(v / 1.852)} kt` : `${v} km/h`;
}
function chipHTML(k) {
  const col = COL[k.state], dark = k.state !== 'base' && k.state !== 'free';
  const ph = sim.phase(k);
  return `${k.dest ? `<span class="chip dest" data-crew="${k.id}" title="Cílové zařízení">${esc(k.dest.name)}</span>` : ''}<span class="chip" data-crew="${k.id}" style="background:${col};color:${dark ? '#fff' : '#111'}">${k.type === 'LZS' ? helicopter() : ''}${esc(k.name)} · ${esc(ph)}</span>`;
}
function lzsSupportHtml(c) {
  if (sim._ownLzsFlyable()) return '';
  const t = sim.s.t;
  const rows = D.lzsSupport.map(item => {
    const k = sim.crewOf(item.id), nightBlocked = item.dayOnly && !sim._isLzsDay();
    const asked = !!(k && k.nbAsk && k.nbAsk.state === 'asked' && k.nbAsk.caseId === c.id);
    const declined = !!(k && k.nbBusyUntil && t < k.nbBusyUntil), busy = !k || k.state !== 'off' || k.supportRequested;
    const eta = k ? sim.etaFor(k, c.lat, c.lon) : 0, stay = k ? Math.round((2 * heliSec(k.home.lat, k.home.lon, c.lat, c.lon) + 1200) / 60) : 0;
    const status = nightBlocked ? 'mimo denní službu' : asked ? 'čeká na odpověď…' : k && k.supportRequested ? (k.supportRequestedFor === c.id ? 'vyslána' : 'jinde') : declined ? 'odmítla' : item.foreign ? 'zahraniční' : 'k dispozici';
    const button = `<button class="btn${asked || busy || declined || nightBlocked ? '' : ' pri'}" data-act="lzs-support" data-case="${c.id}" data-crew="${item.id}" ${nightBlocked || asked || busy || declined ? 'disabled' : ''}>Požádat a vyslat</button>`;
    return `<div class="row"><span class="chip">${esc(item.name)}</span><span>${status}</span><span class="eta">ETA ${Math.round(eta / 60)} min · v kraji asi ${stay} min</span>${button}</div>`;
  }).join('');
  return `<div class="sug"><h4>Mezikrajská výpomoc LZS <small>(vlastní vrtulník je nedostupný nebo neletí; středisko odpoví za 1–3 min)</small></h4>${rows}</div>`;
}
// ---------- panel MU (SM01.06): check-list 401 jen s klíčovými kroky ----------
function muPanelHtml(c) {
  const m = c.mu, role = sim.s.muPlayerRole, mine = role === 'mu', t = sim.s.t, decl = m.phase === 'declared';
  const NB = Sim.MU_NB, HOSP = D.hospitals.filter(x => (m.hosp || {})[x.id]);
  const ago = at => at == null ? '' : `před ${Math.max(0, Math.round((t - at) / 60))} min`;
  const act = (a, label, cls, extra) => mine ? `<button class="btn ${cls || ''}" data-act="${a}" data-case="${c.id}"${extra || ''}>${label}</button>` : '';
  const row = (ok, name, body) => `<div style="margin:5px 0"><span style="display:inline-block;width:1.3em">${ok ? '✔' : '○'}</span><b>${name}</b> ${body}</div>`;
  const col = { 1: '#d9342b', 2: '#e0b400', 3: '#2f9e44', 4: '#222' }, COL = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  let h = `<div class="multi-patient mu-panel"><b>${decl ? 'MU S HPO VYHLÁŠENA' : 'Podezření na MU (SUSP MU)'}${m.aircraft ? ' · letecká nehoda' : ''}</b><br>`;
  h += role ? (mine ? 'Řešíš MU (401); běžný provoz řeší simulovaný kolega.' : 'Řešíš běžný provoz; MU (401) řídí simulovaný kolega.') : 'Dokud nevybereš roli, MU řídí simulovaný kolega.';
  h += `<div style="margin:6px 0"><button class="btn ${mine ? 'pri' : ''}" data-act="mu-role" data-role="mu">Řešit MU (401)</button><button class="btn ${role === 'normal' ? 'pri' : ''}" data-act="mu-role" data-role="normal">Řešit běžný provoz</button></div>`;
  if (!decl) return h + `<small>O vyhlášení rozhodne vedoucí první posádky na místě. Do té doby vyšli RZP a RV; po vyhlášení se aktivuje check-list.</small></div>`;
  const cnt = ty => c.crews.filter(id => { const k = sim.crewOf(id); return k && k.type === ty && k.caseId === c.id; }).length;
  const nExt = c.crews.filter(id => { const k = sim.crewOf(id); return k && k.ext && k.caseId === c.id; }).length;
  h += row(m.avizoAt != null, 'Avízo MU', m.avizoAt != null ? `odesláno ${sim.clockAt(m.avizoAt)}` : act('mu-avizo', 'Odeslat avízo MU', 'pri'));
  h += row(cnt('RZP') >= 2 && cnt('RV') >= 1, 'Síly', `RZP ${cnt('RZP')}, RV ${cnt('RV')}, LZS ${cnt('LZS')}, vůz MU ${cnt('MU')}${nExt ? `, cizí kraje ${nExt}` : ''}<br><small>Na základnách s víc RZP zůstává jedna pro běžný provoz (v ČB dvě).</small><br>${m.requestSent ? '' : act('mu-request', 'Vyslat vůz MU')}${m.reserveCalled ? '' : act('mu-reserves', 'Svolat zálohy')}`);
  const r = m.reported, mt = m.mt || {};
  const late = mt.n > 0 && t - mt.lastAt > 1800;
  h += row(!!r && !late, 'METHANE', (r ? `<span${late ? ' style="color:#d9342b"' : ''}>${sim.clockAt(r.at)} (${ago(r.at)}): I ${r.I} · II ${r.II} · III ${r.III} · IV ${r.IV} · UPV ${r.upv} · děti ${r.deti} · odvezeno ${r.transported} · zemřelo ${r.dead}<br>typ: ${['P', 'P+T', 'T', 'I', 'N'].map(k => k + ' ' + ((r.types || {})[k] || 0)).join(' · ')}${r.burn ? ' · popálení: ano' : ''}</span>` : (m.sceneAt == null ? 'zatím není nikdo na místě' : 'zatím nepodáno (do 5–10 min po příjezdu vyžádej)')) + (mt.pendingAt != null ? ' <small>– připravuje se</small>' : '') + '<br>' + act('mu-methane', r ? 'Vyžádat aktualizaci' : 'Vyžádat METHANE'));
  const hs = HOSP.map(x => { const st = m.hosp[x.id]; return st.state === 'known' ? `<div style="display:flex;gap:10px"><span style="min-width:116px">${esc(x.short)}</span><span>UPV ${st.rep.upv} · JIP ${st.rep.jip} · std ${st.rep.std} <small>${ago(st.repAt)}</small></span></div>` : st.state === 'asked' ? `<div style="display:flex;gap:10px"><span style="min-width:116px">${esc(x.short)}</span><span><small>čeká na odpověď KM</small></span></div>` : ''; }).join('');
  h += row(m.hospContacted, 'Nemocnice (KM)', `${hs || 'KM zatím neinformována'}${act('mu-hospitals', m.hospContacted ? 'Aktualizovat kapacity' : 'Informovat KM a zjistit kapacity')}`);
  h += row(Object.keys(m.nb || {}).length > 0, 'Sousedé a LZS', NB.map(nb => { const q = m.nb[nb.id]; return q ? `<small>${esc(nb.name)}: ${q.state === 'asked' ? 'čeká na odpověď' : q.state === 'sent' ? 'vysílá ' + q.n : 'nemá volnou posádku'}</small>` : act('mu-nb', esc(nb.name), '', ` data-nb="${nb.id}"`); }).filter(Boolean).join(mine ? '' : '<br>'));
  if (m.spis && m.spis.req) h += row(m.spis.called, 'SPIS', m.spis.called ? 'voláno' : act('mu-spis', 'Volat vedení SPIS'));
  if (m.coroner && m.coroner.known) h += row(!!m.coroner.state, 'Koroner', m.coroner.state ? (m.coroner.state === 'arrived' ? 'na místě' : 'aktivován') : act('mu-coroner', 'Aktivovat koronera'));
  if (m.aircraft && !m.landingCheckRequested) h += row(false, 'Plocha LZS', act('mu-landing', 'Ověřit plochu pro LZS'));
  const known = (m.pts || []).filter(p => ['asked', 'transport', 'delivered', 'dead'].includes(p.st) && (p.st !== 'dead' || (m.reported && m.reported.dead > 0)));
  const ST = { asked: 'čeká na směrování', transport: 'transport', delivered: 'předán', dead: 'zemřel' };
  h += row(false, 'Odsun', `ohlášeno ${known.length}, odvezeno ${(m.pts || []).filter(p => ['transport', 'delivered'].includes(p.st)).length}. <small>Vedoucí odsunu volá v panelu Rádio, vyber nemocnici podle kapacit. Typ: P popálenina, T trauma, I inhalační trauma, N neúrazové.</small>`);
  if (known.length) h += `<table style="font-size:12px;width:100%;margin:2px 0 6px"><tr><th align=left>TIK</th><th align=left>Priorita</th><th align=left>Typ</th><th align=left>UPV</th><th align=left>Děti</th><th align=left>Stav</th><th align=left>Cíl</th></tr>${known.slice(-30).map(p => `<tr><td>${p.n}</td><td><span style="display:inline-block;min-width:1.8em;text-align:center;border-radius:3px;background:${col[p.color]};color:${p.color === 2 ? '#000' : '#fff'}">${COL[p.color]}</span></td><td>${p.kind}</td><td>${p.upv ? 'ano' : 'ne'}</td><td>${p.child ? 'ano' : ''}</td><td>${ST[p.st]}</td><td>${p.hid ? esc((D.hospitals.find(x => x.id === p.hid) || {}).short) : ''}</td></tr>`).join('')}</table>`;
  h += row(!!m.ended, 'Ukončení', m.ended ? 'MU ukončena' : m.endReady ? act('mu-end', 'Potvrdit ukončení MU', 'pri') : '<small>čeká na hlášení vedoucího zdravotnické složky (všichni odvezeni, koroner přijel)</small>');
  return h + '</div>';
}
const dzOf = c => (c.radioReports || []).find(r => r.id === 'dz-in');
// slovo pro více postižených: otrava CO = osoby, jinak zranění
const victimWord = c => (/oxid uhelnat/i.test(c.up || '') ? [(c.patientCount || 0) < 5 ? 'osoby' : 'osob', 'postižených'] : ['zranění', 'zraněných']);
// postupné plnění karty při nabírání na naší lince: adresa → indikace → příznaky po jednom → N, pacient, oznamovatel, poznámka
function intakeView(c) {
  const t = sim.s.t, t0 = c.dzUntil != null ? c.dzUntil : c.createdAt;
  const p = Math.max(0, Math.min(1, (t - t0) / Math.max(1, c.readyAt - t0)));
  const syms = symptomsOf(c).map(x => String(x).replace(/^[^0-9A-Za-zÀ-ž]+/, ''));
  const addr = p >= 0.12, klasif = p >= 0.35, nSyms = p < 0.45 ? 0 : Math.min(syms.length, Math.ceil(syms.length * Math.min(1, (p - 0.45) / 0.45)));
  const tail = p >= 0.92;
  const src = c.dzUntil != null ? `nabráno z: ${c.src}` : c.src;
  return { p, addr, klasif, syms: syms.slice(0, nSyms), tail, n1: c.n === 1 && addr, src };
}
function renderCases() {
  const s = sim.s;
  const by = st => s.cases.filter(c => c.status === st);
  const pendingDispatch = c => c.status === 'active' && missingInitialDispatch(c).length > 0;
  const dz = by('intake').filter(c => c.phase === 'dz' && dzOf(c) && dzOf(c).received), intake = by('intake').filter(c => c.phase !== 'dz'), closed = by('closed');
  const act = by('active').filter(c => !pendingDispatch(c)), wait = s.cases.filter(c => c.status === 'waiting' || pendingDispatch(c));
  const intakeN1 = intake.some(c => intakeView(c).n1);
  const tabs = [['waiting', 'Čekající', wait.length], ['active', 'Právě řešené', act.length], ['intake', intakeN1 ? 'Nabírá se N1' : 'Nabírá se', intake.length], ['closed', 'Uzavřené', closed.length], ['dz', 'Datové zprávy', dz.length]];
  setHTML($('tabs-cases'), tabs.map(([k, l, n]) => {
    const classes = [tabCase === k ? 'on' : '', (k === 'waiting' && wait.length > 0 && tabCase !== 'waiting') || (k === 'intake' && intakeN1 && tabCase !== 'intake') ? 'waiting-alert' : ''].filter(Boolean).join(' ');
    return `<button data-tabcase="${k}" class="${classes}">${l}<span class="cnt">${n}</span></button>`;
  }).join(''));
  let rows = ({ waiting: wait, active: act, intake, closed, dz })[tabCase].slice();
  if (tabCase === 'waiting') rows.sort((a, b) => a.n - b.n || a.readyAt - b.readyAt);
  else if (tabCase === 'closed') rows.sort((a, b) => b.closedAt - a.closedAt), rows = rows.slice(0, 60);
  else if (tabCase === 'active') rows.sort((a, b) => b.createdAt - a.createdAt);
  else rows.sort((a, b) => a.n - b.n || a.createdAt - b.createdAt);
  const query = caseSearch.trim().toLocaleLowerCase('cs-CZ');
  if (query) rows = rows.filter(c => c.status === 'intake' ? [c.op, c.src, c.phase === 'dz' && dzOf(c) ? dzOf(c).text : ''].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ').includes(query) : [c.num, c.addr, c.town, c.okres, c.klasif, c.charakter, c.typ, c.up, c.place, c.poznamka, c.src, c.op, c.ozn, c.phone, c.desc, c.dest, c.targetHospitalId, clarificationOf(c)].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ').includes(query));
  if (!rows.length) { setHTML($('cases'), `<div class="empty">${query ? 'Hledání neodpovídá žádnému případu.' : tabCase === 'waiting' ? 'Žádný případ nečeká na vyslání posádky.' : 'Nic k zobrazení.'}</div>`); return; }
  const body = rows.map(c => {
    const intk = c.status === 'intake';
    // fáze 1: jen datová zpráva; fáze 2: jen operátor a linka (nic dalšího o případu dispečer ještě nezná)
    if (intk && tabCase === 'dz') { const r = dzOf(c); return `<article class="case-card dz-row ${sel.c === c.id ? 'sel' : ''}" data-case="${c.id}" tabindex="0"><div class="case-top"><span class="case-priority dz">DZ</span><div class="case-address"><strong>${esc(r.text)}</strong><small>${esc(r.source || '')} · ${esc(sim.clockAt(r.receivedAt != null ? r.receivedAt : c.createdAt))}</small></div></div></article>`; }
    if (intk) {
      const v = intakeView(c), nTag = v.tail || v.n1 ? `N${c.n}` : '…', patient = c.patientName || c.desc || '';
      return `<article class="case-card is-intake n${v.tail || v.n1 ? c.n : 3} ${sel.c === c.id ? 'sel' : ''}" data-case="${c.id}" tabindex="0">
      <div class="case-top"><span class="case-priority">${nTag}</span><div class="case-address"><strong>${v.addr ? esc(c.addr) + ` <span class="okr">${esc(okrAbbr(c))}</span>` : esc(c.op) + ' nabírá výzvu'}</strong><small>${v.addr ? esc(c.town || '') + (c.okres ? ' · okres ' + esc(c.okres) : '') : esc(v.src)}</small></div><span class="case-status">Výzva se připravuje</span></div>
      <div class="case-main"><div class="case-class"><b>${v.klasif ? esc(c.klasif) : ''}</b></div><div class="case-up">${v.klasif ? `<span class="field-label">Upřesnění</span>${esc(v.syms.join(', ') || '…')}` : ''}</div><div class="case-meta">${esc(c.op)} nabírá výzvu · ${esc(v.src)}</div></div>
      ${v.tail ? `<div class="case-bottom"><span class="case-patient">${esc(patient)}</span><span class="case-scene">${esc(c.poznamka || '')}</span></div>` : ''}
    </article>`;
    }
    const rvPending = c.rvReq && !c.rvReq.cancelled && c.rvReq.satT == null && !c.docAssigned && c.status !== 'closed';
    const missing = missingInitialDispatch(c);
    const agMissing = ['pcr', 'hzs'].filter(k => c.agencies && c.agencies[k] && c.agencies[k].state === 'requested' && c.agencies[k].fromCall).map(k => k === 'pcr' ? 'PČR' : 'HZS');
    const status = tabCase === 'closed'
      ? (c.unserved ? 'Neobslouženo' : c.typ === 'sekundární' ? 'Dokončeno' : `Uzavřeno · ${Math.round(c.score ? c.score.total : 0)} b.`)
      : c.examPending && c.status === 'waiting' ? 'Prohlídka zemřelého – vyšli RV'
        : c.exitus ? (c.coroner && c.coroner.state === 'available' ? 'Exitus · vyšli koronera' : c.coroner && c.coroner.state === 'sent' ? 'Exitus · koroner jede' : 'Exitus')
        : c.status === 'waiting' ? (missing.length && c.asg && c.asg.length ? `Čeká na: ${missing.join(' + ')}` : 'Čeká na vyslání')
        : (missing.length || agMissing.length) ? `Doplnit: ${missing.concat(agMissing).join(' + ')}`
        : intk ? `${c.op} nabírá výzvu`
          : rvPending ? `RZP žádá RV: ${c.rvReq.kind || 'posouzení stavu'}` : 'Řeší se';
    const crewLine = c.crews.map(id => sim.crewOf(id)).filter(Boolean).map(chipHTML).join('') + (c.frs || []).map(f => `<span class="chip fr">${esc(f.name)}</span>`).join('');
    const patient = (c.patientCount || 1) > 1 ? `${c.patientCount} ${victimWord(c)[0]}` : c.age != null ? `${Number(c.age) < 18 ? 'Dítě' : c.sex === 'Ž' ? 'Žena' : 'Muž'}, ${c.age} let` : c.desc;
    const detail = c.typ === 'sekundární'
      ? `Převoz: ${(D.hospitals.find(h => h.id === c.originHospitalId) || {}).short || '?'} → ${(D.hospitals.find(h => h.id === c.targetHospitalId) || {}).short || '?'}`
      : [c.place && `Místo: ${c.place}`, c.poznamka && `Poznámka ZOS: ${c.poznamka}`].filter(Boolean).join(' · ');
    const vj = c.vstricna && c.vstricna.state === 'offered' ? `Vstřícná jízda: přetáhni volnou RZP z oblasti ${c.vstricna.areaName} na tento případ` : '';
    const meta = intk
      ? `${c.op} nabírá výzvu · ${c.src}`
      : `Událost ${c.num} · ${sim.clockAt(c.createdAt)} · ${esc(c.src)} · volající ${esc(c.ozn)} · ${esc(c.phone)}`;
    const nTag = `N${c.n}${c.nDopl ? '<small>DOPL</small>' : c.dyn ? '<small>DYN</small>' : ''}`;
    if (sel.c !== c.id) {
      const who = [c.patientName || patient, c.klasif, c.ageText || (c.age != null ? c.age + ' let' : '')].filter(Boolean).join(', ');
      const what = [c.place, c.poznamka].filter(Boolean).join(' · ');
      const chips = c.crews.map(id => sim.crewOf(id)).filter(Boolean).map(k => `${k.dest ? `<span class="cchip dest" data-crew="${k.id}">${esc(k.dest.name)}</span>` : ''}<span class="cchip" data-crew="${k.id}" style="background:${COL[k.state]};color:${k.state !== 'base' && k.state !== 'free' ? '#fff' : '#111'}">${esc(k.name)}</span>`).join('') + agencyChips(c);
      return `<article class="case-card case-row n${c.n} ${rvPending ? 'rv-pending' : ''} ${intk ? 'is-intake' : ''}" data-case="${c.id}" tabindex="0" aria-label="N${c.n}, ${esc(c.klasif)}, ${esc(c.addr)}">
      <span class="case-priority">${nTag}</span><b class="cr-addr"><span class="cr-at">${esc(c.town && !String(c.addr).includes(c.town) ? c.town + ', ' : '')}${esc(c.addr)}</span><span class="okr">${esc(okrAbbr(c))}</span></b>
      <span class="cr-cls">${esc(c.klasif)}</span><span class="cr-up">${esc(symptomsOf(c).map(x => String(x).replace(/^[^0-9A-Za-zÀ-ž]+/, '')).slice(0, 5).join(', '))}</span><span class="cr-what">${esc(what)}</span><span class="cr-time">${esc(sim.clockAt(c.createdAt))}${c.status === 'waiting' || missing.length ? ` <b class="case-age" data-since="${c.waitSince}"></b>` : ''}</span>
      <span class="cr-who">${esc(who)}</span><span class="cr-crews">${chips || `<span class="wait">${esc(status)}</span>`}${chips && (rvPending || missing.length || agMissing.length) ? `<span class="wait urgent">${esc(status)}</span>` : ''}</span>
    </article>`;
    }
    return `<article class="case-card n${c.n} ${sel.c === c.id ? 'sel' : ''} ${rvPending ? 'rv-pending' : ''} ${intk ? 'is-intake' : ''}" data-case="${c.id}" tabindex="0" aria-label="N${c.n}, ${esc(c.klasif)}, ${esc(c.addr)}">
      <div class="case-top"><span class="case-priority">${nTag}</span>
        <div class="case-address"><strong>${esc(c.addr)} <span class="okr">${esc(okrAbbr(c))}</span></strong><small>${esc(c.town || '')}${c.okres ? ` · okres ${esc(c.okres)}` : ''} · ${esc(c.typ || 'primární')}</small></div>
        <span class="case-status ${rvPending || missing.length || agMissing.length ? 'urgent' : ''}">${esc(status)}${c.status === 'waiting' || missing.length ? ` <b class="case-age" data-since="${c.waitSince}"></b>` : ''}</span>
      </div>
      <div class="case-main"><div class="case-class"><b>${esc(c.klasif)}</b><small>${esc(c.charakter || '')}</small></div>
        <div class="case-up"><span class="field-label">Upřesnění</span>${esc(symptomsOf(c).join(', ') || '–')}</div>
        <div class="case-meta">${meta}</div>
      </div>
      <div class="case-bottom"><span class="case-patient">${esc(patient || 'Pacient neuveden')}</span><span class="case-scene">${esc(vj || detail || 'Bez doplňující poznámky')}</span>
        <span class="case-crews">${crewLine || `<span class="wait">${c.status === 'closed' ? (c.unserved ? 'Bez posádky' : 'Posádky uvolněny') : intk ? 'Výzva se připravuje' : 'Čeká na přidělení posádky'}</span>`}</span>
        ${tabCase === 'closed' && c.dest ? `<span class="case-destination">Cíl: ${esc(c.dest)}</span>` : ''}
      </div>
    </article>`;
  }).join('');
  setHTML($('cases'), `<div class="case-list">${body}</div>`);
  patchWait();
}
function patchWait() {
  const t = sim.s.t;
  document.querySelectorAll('#cases [data-since]').forEach(el => { const w = t - Number(el.dataset.since); el.textContent = `· ${mmss(w)}`; el.classList.toggle('late', w > 300); });
}

function nameFor(k) { const p = k.split(' '); return p[1].toUpperCase() + ' ' + p[0][0] + '.'; }
function renderDetail() {
  const c = sel.c && sim.caseOf(sel.c);
  const dp = $('detail'); if (dp) { if (c) dp.dataset.dropCase = c.id; else delete dp.dataset.dropCase; }
  if (!c) { setHTML($('detail'), '<div class="empty">Vyber případ v seznamu nebo na mapě.</div>'); return; }
  if (muModeOn() && c.mu && c.status !== 'intake') {
    // dispečer MU vidí jen to podstatné: popis, panel MU a hlášení z místa
    const reps = (c.radioReports || []).filter(r => r.received).slice(-6).reverse();
    setHTML($('detail'), `<div class="panel dgrid"><div class="dc1"><h3>${esc(c.num)} · MU – ${esc(c.mu.label)}</h3><div style="margin:2px 0 6px;color:#5a6a7a">${esc(c.addr)}${c.patientCount > 1 ? ' · ' + c.patientCount + ' postižených (podle posledního hlášení)' : ''}</div>${muPanelHtml(c)}${reps.length ? `<div class="report-panel"><b>Hlášení z místa</b><ul>${reps.map(r => `<li${r.red ? ' class="red"' : ''}><time>${esc(sim.clockAt(r.receivedAt))}</time> <b>${esc(r.source || '')}:</b> ${esc(r.text)}${r.fields ? `<ul>${Object.entries(r.fields).filter(([, v]) => v).map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul></div>` : ''}</div></div>`);
    return;
  }
  const intk = c.status === 'intake';
  if (intk) {
    const prealerted = (c.prealertCrewIds || []).map(id => sim.crewOf(id)).filter(Boolean);
    const iv = c.phase === 'dz' ? null : intakeView(c);
    const prealert = c.n === 1 && c.phase !== 'dz' && iv.addr
      ? `<div class="prealert-panel"><p>Probíhá nabírání N1. Posádkám můžeš dát předpoplach ještě před dokončením výzvy. Posádky zatím nevyjíždějí.</p>${prealerted.length
        ? `<b>Předpoplach přijat: ${prealerted.map(k => esc(k.name)).join(', ')}</b>`
        : `<button class="btn red" data-act="prealert" data-case="${c.id}">Předpoplach posádkám</button>`}</div>`
      : '';
    const dr = dzOf(c);
    const what = c.phase === 'dz' ? `<p><b>Datová zpráva</b><br>${dr ? `${esc(dr.source || '')}: ${esc(dr.text)}` : ''}</p><p>Událost se zatím předává na naši linku.</p>` : `<p>${esc(c.op)} nabírá výzvu · ${esc(iv.src)}</p><dl>${iv.addr ? `<dt>Adresa</dt><dd>${esc(c.addr)}<br><small>${esc(c.town || '')}${c.okres ? ' · okres ' + esc(c.okres) : ''}</small></dd>` : ''}${iv.klasif ? `<dt>Klasifikace</dt><dd>${esc(c.klasif)}</dd>` : ''}${iv.syms.length ? `<dt>Upřesnění</dt><dd>${esc(iv.syms.join(', '))}</dd>` : ''}${iv.tail ? `<dt>Naléhavost</dt><dd>N${c.n}</dd><dt>Pacient</dt><dd>${esc(c.patientName || c.desc || '')}</dd>${c.poznamka ? `<dt>Poznámka</dt><dd>${esc(c.poznamka)}</dd>` : ''}` : ''}</dl><p>Calltaker ještě nabírá výzvu…</p>`;
    const earlyReports = (c.radioReports || []).filter(r => r.received && r.id !== 'dz-in').map(r => `<li><time>${esc(sim.clockAt(r.receivedAt))}</time> ${esc(r.source || 'Linka 112')}: ${esc(r.text)}</li>`).join('');
    const reportsHtml = earlyReports ? `<div class="report-panel"><b>Průběžné zprávy linky 112</b><ul>${earlyReports}</ul></div>` : '';
    setHTML($('detail'), `<div class="panel dgrid"><div class="dc1"><h3>${c.phase === 'dz' ? 'Datová zpráva' : 'Nabírá se výzva'}</h3>` + what + prealert + reportsHtml + '</div></div>'); return;
  }
  const missingTypes = missingInitialDispatch(c);
  const st = missingTypes.length ? `čeká na ${missingTypes.join(' + ')}` : { waiting: 'čeká na vyslání', active: 'řeší se', closed: 'uzavřen', intake: 'nabírá se' }[c.status];
  const secDelta = c.scheduleDelta == null ? 'zatím nepřistaveno' : `${Math.round(Math.abs(c.scheduleDelta) / 60)} min ${c.scheduleDelta < 0 ? 'před termínem' : 'po termínu'}`;
  let h = `<div class="panel dgrid"><div class="dc1"><h3>${esc(c.num)} · <span class="pill" style="background:${c.n === 1 ? '#f7c9c5' : c.n === 2 ? '#fbdcb5' : c.n === 4 ? '#d8e4ec' : '#f7ecb8'}">N${c.n}${c.dyn ? ' dyn.' : ''}</span> <span class="pill" style="background:#e1e8ee">${st}</span></h3>`;
  if (c.n === 2 && !c.dyn && c.rvNeed && c.status !== 'closed' && !c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV'; })) h += `<button class="btn" data-act="n2-dynamic" data-case="${c.id}">Změnit výzvu na dynamickou</button>`;
  if (c.n >= 2 && c.status !== 'closed' && c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RZP' && k.zzum && k.caseId === c.id; })) h += `<button class="btn${c.zzumFlag ? ' pri' : ''}" data-act="zzum-flag" data-case="${c.id}" title="ZZUM – výjezd bez lékaře">${c.zzumFlag ? '✓ ZZUM – bez lékaře (zrušit)' : 'Příznak ZZUM – výjezd bez lékaře'}</button>`;
  let frBlock = '', lzsBlock = '', lzsHint = '';
  const frApplies = c.typ !== 'sekundární' && c.status !== 'closed' && !c.exitus;
  if (frApplies) {
    const sent = (c.frs || []).map(a => `<li>${esc(a.name)} – ${a.state === 'onscene' ? 'na místě' : 'na cestě, dojezd ' + Math.max(1, Math.round((a.arriveAt - sim.s.t) / 60)) + ' min'}</li>`).join('');
    const sug = sim.frSuggest(c.id, 3).map(x => `<button class="btn" data-act="send-fr" data-case="${c.id}" data-fr="${x.frId}" title="${esc(x.label)}">${esc(x.name)} · ${Math.max(1, Math.round(x.eta / 60))} min</button>`).join('');
    frBlock = `<div class="multi-patient"><b>First respondeři</b>${sent ? `<ul style="margin:2px 0 4px 16px;padding:0">${sent}</ul>` : ' <span style="color:#5a6a7a">nikdo nevyslán</span>'}<div class="opts">${sug || ''}</div></div>`;
  }
  const wx = sim._lzsWeatherStatus(), wxLabel = wx === 'clear' ? 'bez omezení' : wx === 'consult' ? 'na konzultaci' : 'neletovo';
  lzsBlock = `<div class="multi-patient"><b>LZS · ${wxLabel}</b>${wx === 'consult' ? `<br>${c.lzsConsult?.status === 'pending' ? 'Čeká se na rozhodnutí pilota.' : c.lzsConsult?.status === 'approved' ? 'Pilot let povolil.' : c.lzsConsult?.status === 'declined' ? 'Pilot let nedoporučil.' : `<button class="btn" data-act="lzs-consult" data-case="${c.id}">Konzultovat s pilotem</button>`}` : ''}</div>`;
  lzsBlock += lzsAdviceHtml(c);
  if (c.typ !== 'sekundární' && !c.mu && c.status !== 'closed') { const adv = sim.lzsAdvice(c.id), top = adv && adv.rows.find(r => r.level === 'ano') || adv && adv.rows.find(r => r.level === 'mozna'); if (top) lzsHint = ` · ${top.name.replace(/^NEM /, '')} ${top.saving > 0 ? '+' : ''}${top.saving} min ${top.level === 'ano' ? 'Ano' : 'Možná'}`; }
  if (c.n === 1) h += frBlock + lzsBlock;
  else {
    const fo = !!toolState[c.id + ':fr'], lo = !!toolState[c.id + ':lzs'], hot = wx === 'consult' && !c.lzsConsult;
    const nFr = (c.frs || []).length, tgl = (k, open, label, extra) => `<button class="btn" data-act="tool-toggle" data-case="${c.id}" data-tool="${k}" style="padding:2px 8px;font-size:12px;${extra || ''}">${open ? '▾' : '▸'} ${label}</button>`;
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${frApplies ? tgl('fr', fo, nFr ? `FR · ${nFr} vysláno` : 'First respondeři') : ''}${tgl('lzs', lo, `LZS · ${wxLabel}${lzsHint}`, hot ? 'border-color:#d98c00;color:#a35f00' : lzsHint && /Ano/.test(lzsHint) ? 'border-color:#2f9e44;color:#1f7a34' : '')}</div>`;
    if (fo && frBlock) h += frBlock;
    if (lo) h += lzsBlock;
  }
  if (c.lzsActive && c.lzsTechRequired) h += `<div class="multi-patient"><b>Technická součinnost LZS · nepřístupný terén</b><br>${c.lzsTechDone ? 'Přístup k pacientovi je zajištěn.' : c.lzsTechRequested ? 'HZS zajišťuje přístup.' : `<button class="btn" data-act="lzs-tech" data-case="${c.id}">Vyžádat technickou součinnost HZS</button>`}</div>`;
  if (c.mu) h += muPanelHtml(c);
  h += `<dl><dt>Typ výjezdu</dt><dd>${esc(c.typ || 'primární')}</dd>
<dt>Naléhavost</dt><dd>N${c.n}${c.dyn ? ' (dynamická)' : ''}</dd>
${c.doplnkova ? `<dt>Doplňková naléhavost</dt><dd>${esc(c.doplnkova)}</dd>` : ''}
<dt>Charakter</dt><dd>${esc(c.charakter)}</dd>
${c.typ === 'sekundární' ? `<dt>Převoz</dt><dd>${esc((D.hospitals.find(h => h.id === c.originHospitalId) || {}).short || '?')} → ${esc((D.hospitals.find(h => h.id === c.targetHospitalId) || {}).short || '?')}</dd>` : ''}
${c.lzsActive ? `<dt>LZS / heliport</dt><dd>${esc(c.lzsState || 'vrtulník vyslán')} · ${esc(c.lzsTargetHospitalId === 'h-fnkv' ? 'FNKV Praha heliport' : ZOS_DATA.lzs.heliport.name)}</dd>` : ''}
${c.typ === 'sekundární' ? `<dt>Plánované přistavení</dt><dd>${Number.isFinite(c.scheduledAt) ? sim.clockAt(c.scheduledAt) + ' (tolerance ±15 min)' : 'čas nezadán'}</dd><dt>Časový výsledek</dt><dd>${esc(secDelta)}${c.timeScore == null ? '' : ` · ${c.timeScore}/100 b.`}</dd>` : ''}
<dt>Klasifikace</dt><dd>${esc(c.klasif)}</dd>
<dt>Upřesnění</dt><dd>${esc(clarificationOf(c))}</dd>
<dt>Oznamovatel</dt><dd>${esc(c.ozn)}${c.oznRel ? ` <span style="font-weight:400;color:#5a6a7a">(${esc(c.oznRel.replace(/^volá /, ''))})</span>` : ''} · ${esc(c.phone)}</dd>
<dt>Adresa</dt><dd>${esc(c.addr)} <span class="okr">${esc(okrAbbr(c))}</span><br><span style="font-weight:400;color:#5a6a7a">Jihočeský kraj, okres ${esc(okresOf(c))}, obec ${esc(c.town)}<br>${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}</span></dd>
<dt>Popis místa</dt><dd>${esc(c.place)}</dd>
<dt>Pacienti</dt><dd>${c.mu ? (c.mu.reported ? c.mu.reported.total + ' postižených (hlášeno vedoucím zdravotnické složky)' : 'rozsah se ověřuje') : (c.patientCount || 1) > 1 ? `${c.patientCount} ${victimWord(c)[0]} (zbývá ošetřit ${c.patientsRemaining})` : esc(c.desc)}</dd>
${transferInfo(c) ? `<dt>Překlad pacienta</dt><dd>${esc(transferInfo(c))}</dd>` : ''}
<dt>Oznámil</dt><dd>${esc(c.src)} · nabíral ${esc(c.op)}</dd></dl>`;
  const reports = (c.radioReports || []).filter(r => r.received);
  if (reports.length) h += `<div class="report-panel"><b>${c.mu ? 'Situační hlášení' : 'Průběžná hlášení'}</b><ul>${reports.map(r => `<li${r.red ? ' class="red"' : ''}><time>${esc(sim.clockAt(r.receivedAt))}</time> <b>${esc(r.source || (c.mu ? 'Situační hlášení' : 'Linka 112'))}:</b> ${esc(r.text)}${r.fields ? `<ul>${Object.entries(r.fields).filter(([,v]) => v).map(([k,v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>${c.status === 'waiting' || c.status === 'active' ? '<button class="btn pri" data-act="sug">Reagovat – otevřít nabídku posádek</button>' : ''}</div>`;
  if ((c.patientCount || 1) > 1 && c.status !== 'closed') h += `<p class="multi-patient">Více ${victimWord(c)[1]}: ${c.patientsRemaining} pacientů čeká na ošetření. Podle situace vyšlete další RZP.</p>`;
  if (c.vstricna && c.vstricna.state === 'offered') {
    const candidates = sim.s.crews.filter(k => k.type === 'RZP' && k.oblast === c.vstricna.area && sim.avail(k) && !k.res)
      .map(k => ({ k, eta: sim.etaFor(k, c.vstricna.meet ? c.vstricna.meet.lat : c.lat, c.vstricna.meet ? c.vstricna.meet.lon : c.lon) }))
      .sort((a, b) => a.eta - b.eta).slice(0, 4);
    const freeAll = sim.s.crews.filter(k => k.type === 'RZP' && k.oblast === c.vstricna.area && sim.avail(k) && !k.res).length;
    h += `<div class="vstricna-panel"><b>Vstřícná jízda z oblasti ${esc(c.vstricna.areaName)}</b><p>Posádka hlásí pacienta schopného překladu. Pravidlo: vstřícnou vysílej, jen když jsou v oblasti volné aspoň 2 RZP (teď ${freeAll}). Jinak odpověz „dojíždějte sami“.</p>${candidates.length ? `<small>Volné RZP: ${candidates.map(x => `${esc(x.k.name)} (${Math.round(x.eta / 60)} min)`).join(' · ')} – přetáhni na případ</small>` : '<small>Volná místní RZP není k dispozici.</small>'}<div style="margin-top:5px"><button class="btn" data-act="vj-decline" data-case="${c.id}">Dojíždějte sami</button></div></div>`;
  }
  h += deathInfo(c);
  if (c.rvReq && !c.rvReq.cancelled && !c.docAssigned) h += `<p style="color:#b84a00;font-weight:600">Posádka na místě žádá RV: ${esc(c.rvReq.kind || 'zhoršení stavu')}.</p>`;
  const crews = c.crews.map(id => sim.crewOf(id));
  h += `<div style="margin-top:6px"><b>Zasahují:</b> ${crews.length ? crews.map(k => {
    const canCancel = k.state === 'call' || k.state === 'enroute' || (sim.avail(k) && k.caseId === c.id) || (k.type === 'LZS' && (k.state === 'onscene' || (k.state === 'transport' && k.lzsLeg === 'to-scene')));
    return `<span class="assigned-crew">${chipHTML(k)}${canCancel ? `<button class="btn red" data-act="cancel" data-case="${c.id}" data-crew="${k.id}">${k.type === 'LZS' ? 'Odvolat LZS' : 'Odvolat'}</button>` : ''}</span>`;
  }).join('') : (c.frs || []).length ? '' : '<span style="color:#5a6a7a">nikdo</span>'}${(c.frs || []).map(f => `<span class="assigned-crew"><span class="chip fr">${esc(f.name)}</span></span>`).join('')}</div>`;
  if (c.status === 'closed' && c.typ === 'sekundární') h += `<p>Body za dodržení času: <b>${c.score ? c.score.total : 0}/100</b></p>`;
  else if (c.status === 'closed' && c.score) h += `<p>Skóre případu: <b>${Math.round(c.score.total)}</b> (včas ${c.score.delay.toFixed(0)}/20 · příjezd ${c.score.arrive.toFixed(0)}/50 · lékař ${c.score.rv.toFixed(0)}/15 · volba ${c.score.eff.toFixed(0)}/15${c.score.pen ? ' · přesměrování −' + c.score.pen : ''})</p>`;
  h += '</div><div class="dc2">';
  if (c.status === 'waiting' || c.status === 'active') {
    h += `<div><button class="btn pri" data-act="sug">Navrhnout posádku ${sugOpen ? '▴' : '▾'}</button></div>`;
    if (settings.hints) {
      const mt = c.exitus ? [] : missingInitialDispatch(c);
      const best = (kind, role) => { const l = sim.suggest(c.id, kind, role).slice(0, 1)[0]; const k = l && sim.crewOf(l.crewId); return k ? `${esc(k.name)} (${Math.round(l.eta / 60)} min)` : ''; };
      const parts = [];
      if (mt.length) parts.push(`Chybí vyslat: <b>${mt.join(' + ')}</b>.`);
      else if (!c.crews.length) parts.push(`N${c.n}: ${c.n <= 2 ? 'vyšli nejbližší volnou posádku, u N1 hned.' : 'vyšli nejbližší volnou RZP.'}`);
      const r = best('RZP'); if (r && !c.crews.length) parts.push(`Nejrychlejší RZP: <b>${r}</b>.`);
      if (c.n === 1 && !c.crews.some(id => { const k = sim.crewOf(id); return k && k.type === 'RV'; })) { const v = best('RV'); if (v) parts.push(`Zvaž RV: <b>${v}</b>.`); }
      if (parts.length) h += `<div class="hint">💡 ${parts.join(' ')}</div>`;
    }
    if (sugOpen) {
      const sect = (title, kind, n, role) => {
        const list = sim.suggest(c.id, kind, role).slice(0, n);
        if (!list.length) return `<div class="sug"><h4>${title}</h4><div class="row" style="color:#5a6a7a">Nikdo volný.</div></div>`;
        return `<div class="sug"><h4>${title}</h4>${list.map((x, i) => {
          const k = sim.crewOf(x.crewId), rec = settings.hints && i === 0;
          return `<div class="row${rec ? ' rec' : ''}">${rec ? '<span class="recstar" title="Doporučeno">★</span>' : ''}<span class="chip" data-crew="${k.id}" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(k.name)}</span><span>${esc(STLAB[k.state])}</span><span class="km">${x.km.toFixed(0)} km</span><span class="eta">${Math.round(x.eta / 60)} min</span><button class="btn pri" data-act="assign" data-case="${c.id}" data-crew="${k.id}" data-role="${role || ''}">Vyslat</button>${!role && k.type === 'RZP' && k.state === 'base' && sim.liberoFor(k) ? `<button class="btn" title="Přidat lékaře LIBERO ze základny – dočasně RLP" data-act="assign-libero" data-case="${c.id}" data-crew="${k.id}">+ LIBERO</button>` : ''}</div>`;
        }).join('')}</div>`;
      };
      if (c.typ === 'sekundární') h += sect('RZP', 'RZP', 6);
      else if (c.lzsActive) {
        if (c.lzsPatientToHospital && !c.exitus && !c.coronerRequested) h += sect(`RZP – převoz z heliportu ${c.lzsTargetHospitalId === 'h-fnkv' ? 'FNKV Praha' : 'NEM ČB'}`, 'RZP', 6, 'heli-transfer');
        else h += sect('RZP – místo události', 'RZP', 6);
        h += sect('RV (lékař) – místo události', 'RV', 4);
      }
      else h += sect('RZP', 'RZP', 6) + sect('RV (lékař)', 'RV', 4) + sect('LZS', 'LZS', 1) + lzsSupportHtml(c) + (c.mu ? sect('MU – modul hromadného neštěstí', 'MU', 2) : '');
    }
  }
  setHTML($('detail'), h + '</div></div>');
}

// ---------- posádky ----------
// značky součinnosti u případu (jako posádky)
function agencyChips(c) {
  const out = [], A = c.agencies || {};
  for (const f of c.frs || []) out.push(`<span class="cchip ag-fr" title="First responder${f.state === 'onscene' ? ' – na místě' : ' – na cestě'}">${esc(f.name)}</span>`);
  if (c.coroner && (c.coroner.state === 'sent' || c.coroner.state === 'available')) out.push(`<span class="cchip ag-cor">${c.coroner.state === 'sent' ? 'KORONER' : 'KORONER dostupný'}</span>`);
  for (const [k, nm, cl] of [['pcr', 'PČR', 'ag-pcr'], ['hzs', 'HZS', 'ag-hzs']]) if (A[k] && A[k].state !== 'requested') out.push(`<span class="cchip ${cl}">${nm}${A[k].state === 'onscene' ? ' na místě' : ''}</span>`); else if (A[k]) out.push(`<span class="cchip ${cl}${A[k].fromCall ? '' : ' ask'}">${nm}?</span>`);
  return out.join('');
}
// dlaždice součinnosti: koroner, PČR, HZS – přetažením na případ je ZOS vyrozumí
function agencyTiles() {
  const open = sim.s.cases.filter(c => c.status !== 'closed');
  const cor = open.filter(c => c.coroner && c.coroner.state === 'sent').map(c => c.num), corAsk = open.some(c => c.coroner && c.coroner.state === 'available');
  const by = k => open.filter(c => c.agencies && c.agencies[k] && (c.agencies[k].state === 'sent' || c.agencies[k].state === 'onscene')).map(c => c.num);
  const req = k => open.some(c => c.agencies && c.agencies[k] && c.agencies[k].state === 'requested' && !c.agencies[k].fromCall);
  const tile = (id, cls, name, list, icon, ask) => `<button class="tile ${cls}${ask ? ' agency-ask' : ''}" data-crew="${id}" title="${esc(name)} – přetáhni na případ"><span class="tn">${name}</span><i>${list.length ? esc(list.join(', ')) : 'volné'}</i>${icon}</button>`;
  const frBy = open.filter(c => (c.frs || []).length).map(c => c.num);
  return tile('x-hzs', 'st-hzs', 'HZS', by('hzs'), ico('base', 'HZS'), req('hzs')) + tile('x-pcr', 'st-pcr', 'PČR', by('pcr'), ico('base', 'PCR'), req('pcr')) + tile('x-cor', 'st-coroner', 'KORONER', cor, ico('base', 'COR'), corAsk) + tile('x-fr', 'st-fr', 'FR', frBy, ico('base', 'FR'), false);
}
function deathInfo(c) {
  if (!c.exitus) return '';
  const cor = c.coroner || {}, ex = c.exam;
  const t = cor.state === 'pending' ? 'ZOS zjišťuje koronera' : cor.state === 'available' ? 'koroner k dispozici – přetáhni dlaždici KORONER na případ' : cor.state === 'sent' ? `koroner vyslán, dorazí asi za ${Math.max(1, Math.round((cor.arriveAt - sim.s.t) / 1800) / 2)} h` : ex && ex.done ? 'prohlídka zemřelého provedena' : ex && ex.crewId ? 'RV provádí prohlídku zemřelého (lze odvolat, pak se musí vrátit)' : 'koroner není – na prohlídku zemřelého vyšli RV';
  return `<p class="death-panel"><b>Exitus</b> · ${t}${cor.state === 'sent' ? ' <span class="chip cor">KORONER</span>' : ''}</p>`;
}
// dlaždice cizí posádky: přetažením na případ se žádá o pomoc (po souhlasu se vyšle)
function extTile(k) {
  const nb = D.neighbors[k.region] || { short: '' }, t = sim.s.t, a = k.nbAsk;
  const st = k.state !== 'off' ? (k.state === 'base' && k.supportRequested ? 'ready' : 'busy') : a && a.state === 'asked' ? 'asked' : k.nbBusyUntil && t < k.nbBusyUntil ? 'declined' : 'free';
  const full = { free: 'volná k žádosti', asked: 'čeká na odpověď', ready: 'souhlasí', busy: sim.phase(k), declined: 'odmítla' }[st];
  const lab = { free: 'volná', asked: 'čeká…', ready: 'souhlasí – vyšli', busy: sim.phase(k).replace(/^Pomoc sousedovi: /, 'pomáhá: '), declined: 'odmítla' }[st];
  const name = k.name.replace(/ \(.*\)$/, '').replace(/ (RZP|RTW)$/, '');
  return `<button class="tile ty-${k.type} nb nb-${st} rg-${k.region}${k.type === 'LZS' ? ' nblzs' : ''}${k.foreign ? ' foreign' : ''}${sel.k === k.id ? ' sel' : ''}" data-code="${esc(k.code)}" data-crew="${k.id}" title="${esc(k.name + ' · ' + nb.short + ' · ' + full + ' – přetáhni na případ = žádost o pomoc')}"><span class="tn">${esc(name)}</span><i>${esc(lab)}</i>${k.type === 'LZS' ? helicopter() : ''}</button>`;
}
function renderCrews() {
  const s = sim.s;
  const groups = D.oblasti.map(o => ({ title: o.name, crews: s.crews.filter(k => k.oblast === o.id && k.type !== 'LZS' && k.type !== 'MU') }));
  groups.push({ title: 'LZS a součinnost', crews: s.crews.filter(k => k.type === 'LZS' && !k.ext) });
  groups.push({ title: 'Moduly MU', crews: s.crews.filter(k => k.type === 'MU') });
  groups.push({ title: 'Mezikrajská spolupráce', crews: s.crews.filter(k => k.ext) });
  const rank = k => (k.id === 'lzs' ? -3 : k.type === 'LZS' ? -2.5 : k.type === 'MU' ? 5 : k.type === 'RZP' && !k.res ? 0 : k.type === 'RV' ? 1 : k.type === 'LIB' ? 1.5 : k.type === 'RZP' ? 2 : 3);
  let h = '';
  for (const g of groups) {
    g.crews.sort((a, b) => rank(a) - rank(b));
    const free = g.crews.filter(k => sim.avail(k)).length, on = g.crews.filter(k => k.state !== 'off').length;
    const spec = g.title === 'LZS a součinnost';
    h += `<div class="oblast">${esc(g.title)} <span>${g.title === 'Mezikrajská spolupráce' ? `${g.crews.length} základen · přetáhni na případ = žádost o pomoc` : `volných ${free} / ve službě ${on}`}</span></div><div class="grid${g.title === 'Mezikrajská spolupráce' ? ' nbgrid' : ''}">` +
      g.crews.map(k => {
        if (k.ext) return extTile(k);
        const pre = spec && k.type === 'MU' && !g._ag ? (g._ag = true, agencyTiles()) : '';
        const prealert = s.cases.some(c => c.status === 'intake' && c.n === 1 && (c.prealertCrewIds || []).includes(k.id));
        const soft = k.caseRole === 'exam' ? 'exam' : k.caseRole === 'escort' ? 'escort' : '';
        return pre + `<button data-code="${esc(k.code)}" class="tile ty-${k.type} st-${k.state} ${talkCodes.has(String(k.code)) ? 'talking' : ''} ${soft ? 'soft-' + soft : ''} ${followK === k.id ? 'follow' : ''} ${sel.k === k.id ? 'sel' : ''} ${prealert ? 'prealerted' : ''}" data-crew="${k.id}" title="${esc(k.name + ' · ' + sim.phase(k) + (prealert ? ' · PŘEDPOPLACH' : '') + ' · ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}" aria-label="${esc(k.name + ', ' + sim.phase(k) + (prealert ? ', předpoplach' : '') + ', ' + (k.callsCompleted || 0) + ' dokončených výjezdů')}"><span class="tn">${esc(k.name)}</span><i>${esc(k.code)}${k.type === 'RV' ? ' RV' : k.type === 'LZS' ? ' LZS' : k.res ? ' Z' : ''} · ${k.callsCompleted || 0} výj.</i>${ico(k.state, k.type)}${sim.isLights(k) ? '<span class="siren-dot" title="jede na majáky"></span>' : ''}${prealert ? '<span class="prealert-badge">PA</span>' : ''}</button>`;
      }).join('') + (spec && !g._ag ? agencyTiles() : '') + '</div>';
  }
  setHTML($('crews'), h);
  setHTML($('legend'), [['call', 'výzva'], ['enroute', 'výjezd'], ['onscene', 'na místě'], ['transport', 'transport'], ['free', 'volná'], ['base', 'na základně'], ['off', 'nepřihlášená'], ['second', 'sekundár']].map(([k, l]) => `<span class="legend-item"><i class="legend-icon st-${k}">${ico(k)}</i>${l}</span>`).join('') + `<span class="legend-item"><i class="legend-icon st-base">${ico('base', 'RZP')}</i>RZP</span><span class="legend-item"><i class="legend-icon st-base ty-RV">${ico('base', 'RV')}</i>RV</span><span>· vůz míří doprava = jede k události, doleva = veze pacienta / vrací se · klik = sledovat na mapě · dlaždici lze přetáhnout na případ</span>`);
  const k = sel.k && sim.crewOf(sel.k);
  if (!k) { setHTML($('crewpanel'), '<span style="color:#5a6a7a">Vyber posádku. Panel vybrané posádky.</span>'); return; }
  const cs = k.caseId && sim.caseOf(k.caseId), selCase = sel.c && sim.caseOf(sel.c);
  let p = `<h3>${esc(k.name)} <span class="pill" style="background:${COL[k.state]};color:${k.state === 'base' || k.state === 'free' ? '#111' : '#fff'}">${esc(sim.phase(k))}</span></h3>
<dl><dt>Rádio</dt><dd>${esc(k.code)} · ${k.type === 'RV' ? 'RV (lékař)' : k.type === 'LZS' ? 'RLP vrtulník' : k.type === 'MU' ? 'MU modul' : k.type === 'LIB' ? 'LIBERO – lékař bez vozu, jen přes den' : k.res ? 'RZP záloha' : k.rlp ? 'RZP + lékař LIBERO (dočasně RLP)' : 'RZP'}${k.zzum ? ' · ZZUM' : ''}</dd>
<dt>Členové</dt><dd>${esc(k.members.join(', '))}</dd>
<dt>Rychlost</dt><dd>${esc(crewSpeedText(k))}</dd>
<dt>Uskutečněné výjezdy</dt><dd>${k.callsCompleted || 0}</dd>
${cs ? `<dt>Případ</dt><dd><a href="#" data-case="${cs.id}">${esc(cs.num)} ${esc(cs.klasif)}</a></dd>` : ''}${cs && transferInfo(cs) ? `<dt>Překlad pacienta</dt><dd>${esc(transferInfo(cs))}</dd>` : ''}${k.dest ? `<dt>Cíl</dt><dd>${esc(k.dest.name)}</dd>` : ''}</dl>`;
  if (k.type === 'RZP' && (k.state === 'base' || k.state === 'call') && sim.liberoFor(k)) p += `<button class="btn pri" data-act="libero" data-crew="${k.id}">+ LIBERO (dočasně RLP)</button>`;
  if (k.type === 'RZP' && k.liberoId) p += `<button class="btn" data-act="unlibero" data-crew="${k.id}">− LIBERO (odpřadit lékaře)</button>`;
  if (k.type === 'LIB' && k.withCrew) p += `<button class="btn" data-act="unlibero" data-crew="${k.withCrew}">Odpřadit od ${esc((sim.crewOf(k.withCrew) || {}).name || 'RZP')}</button>`;
  if (k.type === 'LIB') { const m = (sim.s.libero && sim.s.libero.modes[k.id]) || 'random'; p += `<div class="opts" style="margin:4px 0">Obsazení: ${[['on', 'Obsazeno'], ['off', 'Neobsazeno'], ['random', 'Náhodně']].map(([v, l]) => `<button data-libset="${k.id}" data-val="${v}" class="${m === v ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
  if (k.type === 'LIB' && k.state === 'base') for (const r of sim.s.crews.filter(x => x.type === 'RZP' && x.st === k.st && !x.rlp && (x.state === 'base' || x.state === 'call'))) p += `<button class="btn" data-act="libero" data-crew="${r.id}" data-lib="${k.id}">Do vozu ${esc(r.name)}</button>`;
  if (k.type === 'LIB' && k.state === 'off') p += '<p style="color:#5a6a7a;margin:4px 0">LIBERO dnes není ve službě (jen přes den a ne vždy).</p>';
  if (!['LZS', 'MU', 'LIB'].includes(k.type) && !['off', 'base', 'second', 'activating', 'attached'].includes(k.state)) {
    const dn = k.driveN || (cs ? Math.min(3, cs.n || 3) : 3);
    if (['call', 'enroute'].includes(k.state)) p += `<div class="opts" style="margin:4px 0">Naléhavost jízdy: ${[1, 2, 3].map(n => `<button data-act="drive-n" data-crew="${k.id}" data-n="${n}" class="${dn === n ? 'on' : ''}">N${n}</button>`).join('')} <span style="color:#5a6a7a">${sim.isLights(k) ? '● majáky' : 'bez majáků'}</span></div>`;
    const n3 = k.retN3 || k.retLights;
    p += `<button class="btn${n3 ? '' : ' pri'}" data-act="ret-n3" data-crew="${k.id}" title="Po předání se vracet na majáky (rychleji)">${n3 ? '● Návrat v režimu N3 (majáky)' : 'Vracet se v režimu N3 (majáky)'}</button>`;
  }
  if (k.res && k.state === 'off') p += `<button class="btn pri" data-act="resv" data-crew="${k.id}">Aktivovat zálohu</button>`;
  if (sim.avail(k) && selCase && (selCase.status === 'waiting' || selCase.status === 'active') && !(k.type === 'MU' && !selCase.mu)) p += `<button class="btn pri" data-act="assign" data-case="${selCase.id}" data-crew="${k.id}">Vyslat k ${esc(selCase.num)}</button>`;
  if ((k.state === 'call' || k.state === 'enroute') && selCase && selCase.id !== k.caseId && selCase.status !== 'closed') p += `<button class="btn red" data-act="reassign" data-case="${selCase.id}" data-crew="${k.id}">Přesměrovat na ${esc(selCase.num)}</button>`;
  if (cs) p += `<button class="btn" data-act="print" data-crew="${k.id}">Výzva k výjezdu</button>`;
  p += `<button class="btn" data-act="focus" data-crew="${k.id}">Na mapě</button>`;
  setHTML($('crewpanel'), p);
}
