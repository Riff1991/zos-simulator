// UI – Události, přetahování, PWA, načtení dat (části se v build.py skládají v tomto pořadí do jednoho skriptu).
// ---------- události ----------
function act(a, el) {
  const d = el.dataset;
  if (a.startsWith('ct-')) { ctAct(a, el); return; }
  switch (a) {
    case 'dismiss-alert':
      alertHidden.add(d.key);
      if (d.case && d.report) sim.acknowledge112(d.case, d.report);
      break;
    case 'install-app': if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; if (!sim) homeModal(); }); } break;
    case 'start': { const di = $('opt-date'); if (di && di.value) window._opt.date = di.value; const hi = $('opt-hour'); if (hi) window._opt.hour = Number(hi.value); saveOpts(); newGame(); break; }
    case 'tutorial': startTutorial(); break;
    case 'tut-next': tutNext(true); break;
    case 'tut-skip': tutEnd(); break;
    case 'test-voice': applyVoice(); if (typeof ZOS_VOICE !== 'undefined') ZOS_VOICE.demo(); break;
    case 'rq-zos': if (sim) { sim.radioZosCall(d.rq); pollLog(); render(); } break;
    case 'rq-answer': if (sim) { sim.radioAnswer(d.rq); pollLog(); render(); } break;
    case 'rq-reply': if (sim) { sim.radioReply(d.rq, d.k); pollLog(); render(); } break;
    case 'home': homeModal(); break;
    case 'newshift': window._opt = null; shiftModal(); break;
    case 'newshift-keep': shiftModal(); break;
    case 'settings': settingsModal(!!sim); break;
    case 'changelog': changelogModal(); break;
    case 'check-update': checkUpdate(el); break;
    case 'check-update-hdr': { el.disabled = true; el.title = 'Kontroluji…'; checkUpdate(null, m => { el.title = m; toast(m); }).finally(() => setTimeout(() => { el.disabled = false; el.title = 'Zkontrolovat aktualizaci'; }, 3000)); break; }
    case 'test-sound': beep(660); beep(880, 0.15); break;
    case 'reset-settings': settings = Object.assign({}, SET_DEF); saveSettings(); applyTheme(); settingsModal(window._setFromGame); break;
    case 'del-save': if (confirm('Opravdu smazat uloženou směnu?')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} homeModal(); } break;
    case 'open-map': openPanelWindow('map'); break;
    case 'open-radio': openPanelWindow('radio'); break;
    case 'toggle-map-main': toggleMainPanel('map'); break;
    case 'toggle-radio-main': toggleMainPanel('radio'); break;
    case 'fullscreen-map': toggleMapFullscreen(); break;
    case 'resume': resume(); break;
    case 'again': try { localStorage.removeItem(SAVE_KEY); } catch (e) {} shiftModal(); break;
    case 'close': closeModal(); break;
    case 'sug': sugOpen = !sugOpen; break;
    case 'assign': { const r = sim.assign(d.case, d.crew, d.role || undefined); if (!r.ok) toast(r.msg, 'warn'); else { sel.c = d.case; beep(520); } break; }
    case 'reassign': { const r = sim.reassign(d.crew, d.case); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'cancel': { const r = sim.cancelAssignment(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Posádka odvolána.', ''); break; }
    case 'vj-decline': { const r = sim.declineVstricna(d.case); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'rules': rulesModal(el && el.dataset.back); break;
    case 'prealert': { const r = sim.prealert(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Předpoplach: ' + r.crews.join(', ') + '. Posádky nevyjíždějí.', 'alert'); break; }
    case 'send-fr': { const r = sim.sendFr(d.case, d.fr); toast(r.msg, r.ok ? '' : 'warn'); break; }
    case 'zzum-flag': { const cs = sim.caseOf(d.case), r = sim.setZzumFlag(d.case, !(cs && cs.zzumFlag)); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'drive-n': { const r = sim.setDriveUrgency(d.crew, d.n); if (!r.ok) toast(r.msg, 'warn'); break; }
    case 'ret-n3': { const r = sim.requestReturnN3(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Návrat v režimu N3 nařízen.', ''); break; }
    case 'n2-dynamic': { const r = sim.convertN2Dynamic(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Výzva změněna na dynamickou.', ''); break; }
    case 'lzs-consult': { const r = sim.consultLzsPilot(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Čeká se na textové rozhodnutí pilota LZS.', 'alert'); break; }
    case 'lzs-tech': { const r = sim.requestLzsTechnicalAssist(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Technická součinnost HZS vyžádána.', 'alert'); break; }
    case 'float-toggle': layoutToggleFloat(d.win); break;
    case 'layout-menu': layoutMenu(document.querySelector('[data-act="layout-menu"]')); break;
    case 'layout-preset': layoutPreset(d.preset); break;
    case 'layout-dock-all': layoutDockAll(); break;
    case 'tool-toggle': { const k = d.case + ':' + d.tool; toolState[k] = !toolState[k]; render(); break; }
    case 'mu-role': { const r = sim.setMuDispatcher(d.role); if (!r.ok) toast(r.msg, 'warn'); else toast(d.role === 'mu' ? 'Přebíráš MU (401); kolega řeší běžný provoz.' : 'Přebíráš běžný provoz; kolega řeší MU.', ''); break; }
    case 'mu-avizo': { const r = sim.muAvizo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Avízo MU odesláno (SMS, kanál).', 'alert'); break; }
    case 'mu-request': { const r = sim.requestMuModule(d.case); if (!r.ok) toast(r.msg, 'warn'); else { sugOpen = true; toast('Vůz MU požádán; vyber ho v nabídce posádek (sekce MU).', 'alert'); } break; }
    case 'mu-reserves': { const r = sim.muCallReserves(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Zálohy svolány.', ''); break; }
    case 'mu-methane': { const r = sim.requestMuMethane(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Situační zpráva vyžádána.', ''); break; }
    case 'mu-hospitals': { const r = sim.muContactHospitals(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Kontaktní místa nemocnic informována.', ''); break; }
    case 'mu-nb': { const r = sim.muRequestNeighbor(d.case, d.nb); if (!r.ok) toast(r.msg, 'warn'); else toast('Žádost o pomoc odeslána.', ''); break; }
    case 'mu-spis': { const r = sim.muCallSpis(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Vedení SPIS voláno.', ''); break; }
    case 'mu-coroner': { const r = sim.muCallCoroner(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Koroner aktivován.', ''); break; }
    case 'mu-end': { const r = sim.confirmMuEnd(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('MU ukončena.', 'alert'); break; }
    case 'mu-landing': { const r = sim.requestMuLandingInfo(d.case); if (!r.ok) toast(r.msg, 'warn'); else toast('Ověření plochy předáno, čeká se na odpověď z místa.', ''); break; }
    case 'lzs-support': { const r = sim.requestLzsSupport(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else { toast(r.msg, ''); beep(660); } break; }
    case 'libero': { const r = sim.attachLibero(d.crew, d.lib || undefined); if (!r.ok) toast(r.msg, 'warn'); else toast(`${sim.crewOf(d.crew).name}: lékař LIBERO ve voze`, ''); break; }
    case 'unlibero': { const r = sim.removeLibero(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('LIBERO odpřaženo od posádky.', ''); break; }
    case 'assign-libero': {
      const a = sim.attachLibero(d.crew); if (!a.ok) { toast(a.msg, 'warn'); break; }
      const r = sim.assign(d.case, d.crew); if (!r.ok) toast(r.msg, 'warn'); else { sel.c = d.case; toast(`${sim.crewOf(d.crew).name} → ${sim.caseOf(d.case).num}`, ''); }
      break;
    }
    case 'resv': { const r = sim.activateReserve(d.crew); if (!r.ok) toast(r.msg, 'warn'); else toast('Záloha se aktivuje (cca 20 min).', ''); break; }
    case 'print': printModal(sim.crewOf(d.crew)); break;
    case 'focus': { const p = sim.pos(sim.crewOf(d.crew)); focusOn(p.lat, p.lon); break; }
    case 'zoomin': if (GL) GL.zoomIn(); else zoom(0.6); break;
    case 'zoomout': if (GL) GL.zoomOut(); else zoom(1.6); break;
    case 'zoomreset': if (GL) GL.fitBounds([[13.53, 48.55], [15.61, 49.63]], { padding: 10 }); else vb = { x: 30, y: 30, w: 970, h: 940 }; break;
  }
  render();
}

// přetahování dlaždic posádek na případ
let drag = null, suppressClick = false;
function dragStart() {
  if (!drag || drag.on) return; drag.on = true;
  const g = document.createElement('div'); g.id = 'ghost'; const k = sim.crewOf(drag.id);
  g.textContent = k ? k.name : ''; g.style.background = k ? COL[k.state] : '#fff'; g.style.color = k && (k.state === 'base' || k.state === 'free') ? '#111' : '#fff';
  document.body.appendChild(g); drag.ghost = g; moveGhost(drag.x, drag.y);
}
function moveGhost(x, y) { if (drag.ghost) { drag.ghost.style.left = x + 12 + 'px'; drag.ghost.style.top = y + 12 + 'px'; } }
function dropTarget(x, y) {
  const e = document.elementFromPoint(x, y);
  if (e && e.closest('[data-case]') && !e.closest('#modal')) return e.closest('[data-case]');
  if (e && e.closest('[data-drop-case]')) { const el = e.closest('[data-drop-case]'); return { dataset: { case: el.dataset.dropCase }, classList: el.classList }; }
  const ct = e && e.closest('.tile[data-crew]');
  if (ct && !ct.closest('#modal') && !/^x-/.test(ct.dataset.crew)) return { dataset: { crew: ct.dataset.crew }, classList: ct.classList };
  const id = glCaseAt(x, y); return id ? { dataset: { case: id }, classList: { add() {}, remove() {} } } : null;
}
// vstřícná jízda přetažením: periferní RZP s pacientem ↔ volná RZP z oblasti u nemocnice
function dropOnCrew(aId, bId) {
  const a = sim.crewOf(aId), b = sim.crewOf(bId); if (!a || !b || a.id === b.id) return;
  for (const [pri, hlp] of [[a, b], [b, a]]) {
    const cs = pri.caseId && sim.caseOf(pri.caseId);
    if (cs && cs.vstricna && cs.vstricna.state === 'offered' && cs.vstricna.primaryCrewId === pri.id) {
      const r = sim.assignVstricna(cs.id, hlp.id); sel.c = cs.id; sel.k = hlp.id;
      toast(r.ok ? `${hlp.name} → vstřícná jízda k ${pri.name}` : r.msg, r.ok ? '' : 'warn'); render(); return;
    }
  }
  toast('Posádky lze propojit jen při vstřícné jízdě: pacient musí být schopen překladu a periferní RZP ho veze.', 'warn');
}
document.addEventListener('pointerdown', ev => {
  const t = ev.target.closest('.tile[data-crew], .chip[data-crew]');
  if (!t || ev.button > 0 || t.closest('#modal') || t.closest('#rtiles')) return;
  drag = { id: t.dataset.crew, x: ev.clientX, y: ev.clientY, on: false, touch: ev.pointerType === 'touch', ghost: null, timer: null };
  if (drag.touch) drag.timer = setTimeout(() => { if (drag) dragStart(); }, 280);
});
document.addEventListener('pointermove', ev => {
  if (!drag) return;
  const dist = Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y);
  if (!drag.on) {
    if (drag.touch) { if (dist > 10) { clearTimeout(drag.timer); drag = null; } return; }
    if (dist > 6) dragStart(); else return;
  }
  moveGhost(ev.clientX, ev.clientY);
  document.querySelectorAll('.drop').forEach(e => e.classList.remove('drop'));
  const tg = dropTarget(ev.clientX, ev.clientY); if (tg) tg.classList.add('drop');
});
document.addEventListener('touchmove', ev => { if (drag && drag.on) ev.preventDefault(); }, { passive: false });
function dragEnd(ev, cancel) {
  if (!drag) return;
  clearTimeout(drag.timer);
  const d = drag; drag = null;
  if (!d.on) return;
  document.querySelectorAll('.drop').forEach(e => e.classList.remove('drop'));
  if (d.ghost) d.ghost.remove();
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 80);
  if (cancel) return;
  const tg = dropTarget(ev.clientX, ev.clientY); if (!tg) return;
  if (tg.dataset.crew && !tg.dataset.case && !tg.dataset.dropCase) { if (!/^x-/.test(d.id)) dropOnCrew(d.id, tg.dataset.crew); return; }
  if (/^x-/.test(d.id)) {
    const acs = sim.caseOf(tg.dataset.case || tg.dataset.dropCase); if (!acs) return;
    const r = sim.sendAgency(acs.id, d.id.slice(2)); sel.c = acs.id;
    toast(r.ok ? (r.msg || `${{ cor: 'Koroner', pcr: 'PČR', hzs: 'HZS', fr: 'FR' }[d.id.slice(2)]} → ${acs.num}`) : r.msg, r.ok ? '' : 'warn'); render(); return;
  }
  const k = sim.crewOf(d.id), cs = sim.caseOf(tg.dataset.case || tg.dataset.dropCase); if (!k || !cs) return;
  sel.k = k.id; sel.c = cs.id;
  if (k.ext && k.state === 'off') { const rr = sim.requestNeighbor(cs.id, k.id); toast(rr.msg, rr.ok ? '' : 'warn'); if (rr.ok) beep(660); render(); return; }
  let r;
  if (cs.vstricna && cs.vstricna.state === 'offered') r = sim.assignVstricna(cs.id, k.id);
  else if (sim.avail(k)) r = sim.assign(cs.id, k.id);
  else if (k.state === 'call' || k.state === 'enroute') r = sim.reassign(k.id, cs.id);
  else r = { ok: false, msg: k.name + ' je zaneprázdněná (' + sim.phase(k) + ').' };
  if (!r.ok) toast(r.msg, 'warn'); else toast(`${k.name} → ${cs.num}${k.type === 'RZP' && cs.vstricna && cs.vstricna.state === 'dispatched' ? ' · vstřícná jízda' : ''}`, '');
  render();
}
document.addEventListener('pointerup', ev => dragEnd(ev, false));
document.addEventListener('pointercancel', ev => dragEnd(ev, true));
document.addEventListener('input', ev => {
  if (ev.target && ev.target.id === 'case-search') { caseSearch = ev.target.value; renderCases(); }
  if (ev.target && ev.target.id === 'lib-probability') { window._opt.libero.presence = Number(ev.target.value); saveOpts(); const out = $('lib-prob-value'); if (out) out.textContent = `${ev.target.value} %`; }
  if (ev.target && ev.target.id === 'opt-mutype') { window._opt.muType = ev.target.value; saveOpts(); return; }
  if (ev.target && ev.target.id === 'opt-hour') { window._opt.hour = Number(ev.target.value); saveOpts(); return; }
  if (ev.target && ev.target.id === 'opt-date') { window._opt.date = ev.target.value; saveOpts(); return; }
  if (ev.target && ev.target.id === 'mu-probability') { window._opt.muProbability = Number(ev.target.value); saveOpts(); const out = $('mu-prob-value'); if (out) out.textContent = `${ev.target.value} %`; }
});
document.addEventListener('change', ev => {
  if (ev.target && ev.target.id === 'tts-url') { settings.ttsUrl = ev.target.value.trim(); saveSettings(); applyVoice(); const el = $('voice-status'); if (el) el.textContent = voiceStatusText(); }
});
document.addEventListener('click', ev => {
  if (suppressClick) { ev.preventDefault(); return; }
  const t = ev.target;
  const se = t.closest('[data-set]');
  if (se) { const k = se.dataset.set, v = se.dataset.val; settings[k] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v); saveSettings(); applyTheme(); if (k === 'speed' && sim) { speed = settings.speed; savedSpeed = speed; } if (['voice', 'sound', 'volume', 'voiceTempo', 'voiceEngine'].includes(k)) applyVoice(); if (k === 'radioInteractive' && sim) sim.setRadioMode(settings.radioInteractive ? 'interactive' : 'auto'); settingsModal(window._setFromGame); return; }
  const o = t.closest('[data-opt]'); if (o) { window._opt[o.dataset.opt] = o.dataset.val; shiftModal(); return; }
  const lm = t.closest('[data-libmode]'); if (lm) { window._opt.libero.modes[lm.dataset.libmode] = lm.dataset.val; window._libOpen = true; shiftModal(); return; }
  const ls = t.closest('[data-libset]'); if (ls) { const r = sim.setLiberoMode(ls.dataset.libset, ls.dataset.val); if (!r.ok) toast(r.msg, 'warn'); else { if (window._opt && window._opt.libero) { window._opt.libero.modes[ls.dataset.libset] = ls.dataset.val; saveOpts(); } render(); } return; }
  const sm = t.closest('summary'); if (sm && sm.parentElement && sm.parentElement.classList.contains('opt-details')) window._libOpen = !sm.parentElement.open;
  const a = t.closest('[data-act]'); if (a) { ev.preventDefault(); act(a.dataset.act, a); return; }
  const sp = t.closest('[data-speed]'); if (sp) { speed = Number(sp.dataset.speed); if (speed) savedSpeed = speed; render(); return; }
  const v = t.closest('[data-view]'); if (v) {
    view = v.dataset.view; render();
    if (GL) setTimeout(() => GL.resize(), 30);
    if (view === 'map' && pendingMapFocus) { const target = pendingMapFocus; pendingMapFocus = null; requestAnimationFrame(() => applyMapFocus(target)); }
    return;
  }
  const tc = t.closest('[data-tabcase]'); if (tc) { tabCase = tc.dataset.tabcase; render(); return; }
  const tr = t.closest('[data-tabradio]'); if (tr) { tabRadio = tr.dataset.tabradio; render(); return; }
  const ct = t.closest('[data-cov-type]'); if (ct) { settings.covType = ct.dataset.covType; saveSettings(); covStep(true); renderToolsOnce(); return; }
  const cl = t.closest('[data-cov-lim]'); if (cl) { settings.covLimit = Number(cl.dataset.covLim); saveSettings(); covStep(true); renderToolsOnce(); return; }
  const ly = t.closest('[data-layer]'); if (ly) {
    const k = ly.dataset.layer;
    if (k === 'cov' && !layers.cov && !(GL && glReady)) { toast('Vrstva pokrytí potřebuje plnou mapu (MapLibre).', 'warn'); return; }
    layers[k] = !layers[k]; renderToolsOnce(); glApplyLayers(); if (k === 'cov' && layers.cov) covStep(true); render(); return;
  }
  const ho = t.closest('[data-hosp]'); if (ho) { toast('Avízo předáno: ' + D.hospitals.find(h => h.id === ho.dataset.hosp).name, ''); return; }
  if (t.closest('#map')) return;
  // klik do volného místa pod případy sbalí všechny karty (žádný není rozkliknutý do detailu)
  if (t.closest('#cases') && !t.closest('[data-case]') && !t.closest('[data-crew]') && !t.closest('button') && !t.closest('input')) { if (sel.c) { sel.c = null; syncSelectionToMain(); render(); } return; }
  const ck = t.closest('[data-crew]'), cc = t.closest('[data-case]');
  if (ck && !t.closest('#modal')) {
    ev.preventDefault();
    if (/^x-/.test(ck.dataset.crew)) { toast('Přetáhni dlaždici na případ – ZOS vyrozumí ' + ({ 'x-cor': 'koronera', 'x-pcr': 'PČR', 'x-hzs': 'HZS', 'x-fr': 'nejbližšího first respondera' }[ck.dataset.crew]) + '.', ''); return; }
    sel.k = ck.dataset.crew;
    { const kk = sim.crewOf(sel.k); if (kk && kk.type === 'LZS' && sel.c) toolState[sel.c + ':lzs'] = true; }   // klik na dlaždici LZS rozbalí kalkulátor LZS
    if (t.closest('.tile')) { followK = followK === sel.k ? null : sel.k; followLast = 0; if (followK) { const fk = sim.crewOf(followK); toast(`Sleduji ${fk.name} na mapě (posunutím mapy nebo dalším klikem zrušíš).`, ''); } }
    syncSelectionToMain();
    if (ck.dataset.ptt) { const k = sim.crewOf(sel.k); toast(`${k.name}: spojení v pořádku, ${STLAB[k.state].toLowerCase()}.`, ''); }
    render(); return;
  }
  if (cc) {
    ev.preventDefault();
    if (t.closest('#cases') && sel.c === cc.dataset.case && !t.closest('[data-crew]') && !t.closest('button, a, input, summary, [data-act]')) { sel.c = null; syncSelectionToMain(); render(); return; }
    selectCaseFromElement(cc, t);
  }
});
$('btn-end').addEventListener('click', () => {
  if (!sim || sim.s.ended) return;
  const prev = speed; speed = 0;
  if (!confirm('Ukončit směnu a vyhodnotit ji podle dosavadního průběhu? Uložená směna se smaže.')) { speed = prev; lastT = performance.now(); return; }
  sim.finishShift(true); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} render(); endModal();
});
$('btn-pause-shift').addEventListener('click', () => {
  if (!sim || sim.s.ended) return;
  speed = 0; doSave(); homeModal();   // rozehraná směna zůstane uložená, v nabídce je Pokračovat
});
// mapa: výběr a posun
(function () {
  const svg = $('map'), wrap = $('mapwrap'); let mapDrag = null;
  wrap.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (ev.target.closest('#maptools,#covbar,.maplibregl-ctrl')) return;
    if (GL) return; // MapLibre potřebuje své vlastní mouse/touch události.
    if (!GL && svg.style.display === 'none') return;
    const m = !GL && ev.target.closest('[data-case],[data-crew]');
    mapDrag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, pid: ev.pointerId,
      mode: 'svg',
      hit: m ? { caseId: m.dataset.case || null, crewId: m.dataset.crew || null } : null, moved: false };
    try { wrap.setPointerCapture(ev.pointerId); } catch (_) {}
    ev.preventDefault();
  });
  const move = ev => {
    if (!mapDrag || mapDrag.pid !== ev.pointerId) return;
    const dx = ev.clientX - mapDrag.x, dy = ev.clientY - mapDrag.y;
    if (!mapDrag.moved && Math.hypot(dx, dy) > 4) mapDrag.moved = true;
    if (!mapDrag.moved) return;
    const r = svg.getBoundingClientRect(), kx = vb.w / r.width, ky = vb.h / r.height;
    vb.x = mapDrag.vx - dx * kx; vb.y = mapDrag.vy - dy * ky;
    renderMapSvg();
    ev.preventDefault();
  };
  const up = ev => {
    if (!mapDrag || mapDrag.pid !== ev.pointerId) return;
    const hit = mapDrag.hit, moved = mapDrag.moved; mapDrag = null;
    if (!moved && hit) {
      if (hit.caseId) sel.c = hit.caseId; else if (hit.crewId) sel.k = hit.crewId;
      syncSelectionToMain();
    }
    if (!moved) render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', () => { mapDrag = null; });
  svg.addEventListener('wheel', ev => { ev.preventDefault(); const p = svgPt(svg, ev); zoom(ev.deltaY > 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
})();
window.addEventListener('keydown', ev => {
  if (ev.key === ' ' && sim && !modalOpen && !/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || '')) { ev.preventDefault(); speed = speed ? 0 : savedSpeed; }
  if ((ev.key === 'p' || ev.key === 'P') && sim && !modalOpen && !/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || '')) { const e = radioOpen().find(x => x.state === 'calling'); if (e) { sim.radioAnswer(e.id); pollLog(); render(); } }
});
window.__zos = { get sim() { return sim; }, step: s => sim && sim.step(s), feed: () => radioFeed.slice() }; Object.defineProperty(window, '__zosMap', { get: () => GL });
setInterval(frame, 100);
// ---------- aplikace (PWA): instalace, offline provoz a aktualizace při spuštění ----------
let installPrompt = null, swWaiting = null;
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function appInstallHtml() {
  if (isStandalone() || location.protocol === 'file:') return '';
  if (installPrompt) return '<p style="margin:6px 0"><button class="btn" data-act="install-app">⬇ Nainstalovat jako aplikaci</button> <span style="font-size:12px;color:#5a6a7a">ikona v Docku / nabídce Start, funguje offline a sama se aktualizuje</span></p>';
  const ua = navigator.userAgent || '';
  const hint = /iPhone|iPad/.test(ua) ? 'Sdílet → Přidat na plochu' : /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua) ? 'v Safari: Soubor → Přidat do Docku' : 'ikonou instalace v adresním řádku prohlížeče';
  return `<p style="font-size:12px;color:#5a6a7a;margin:6px 0">Tip: hru lze nainstalovat jako aplikaci (${hint}).</p>`;
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (!sim && modalOpen && !window._opt) homeModal(); });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('Aplikace nainstalována. Příště ji spustíš ikonou.', ''); });
function showUpdateBar(worker) {
  swWaiting = worker;
  fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => { $('update-text').textContent = `Je připravena nová verze v${v.version}. Rozehraná směna se uloží.`; }).catch(() => {});
  $('update-bar').classList.add('on');
}
$('update-btn').addEventListener('click', () => {
  if (!swWaiting) return;
  try { if (sim && !sim.s.ended) doSave(); } catch (e) {}
  swWaiting.postMessage('skipWaiting');
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const onWaiting = w => {
      if (!navigator.serviceWorker.controller) return;            // první instalace – není co aktualizovat
      if (!sim) w.postMessage('skipWaiting');                       // při spuštění (ještě se nehraje) → rovnou nová verze
      else showUpdateBar(w);                                        // během hry → nabídnout tlačítko
    };
    if (reg.waiting) onWaiting(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') onWaiting(w); }); });
    reg.update().catch(() => {});
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => console.warn('service worker', e));
}

// načtení dat: dlaždice, silniční síť, adresy
let assetsState = 'načítám mapová data…';
Promise.all([
  fetch('tiles-index.json').then(r => r.json()).then(j => { TILEIDX = j; if (!satellitePanel || sim) glInit(); }).catch(e => console.warn('tiles', e)),
  fetch('graph.wasm').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => ROUTER.init(b)).catch(e => console.warn('graph', e)),
  fetch('poi.json').then(r => r.json()).then(j => { window.ZOS_POI = j; }).catch(e => console.warn('poi', e)),
  fetch('rail.json').then(r => r.json()).then(j => { window.ZOS_RAIL = j; }).catch(e => console.warn('rail', e)),
  fetch('addr.json').then(r => r.json()).then(j => { window.ZOS_ADDR = j; }).catch(e => console.warn('addr', e)),
]).then(() => { assetsState = ROUTER.ready ? 'mapa a silniční síť načteny' : 'mapová data se nenačetla, běží zjednodušená mapa'; if (!sim && !satellitePanel) homeModal(); });
if (!satellitePanel) { applyTheme(); homeModal(); }
