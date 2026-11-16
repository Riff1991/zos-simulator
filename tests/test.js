global.ZOS_DATA = require('../src/data.js');
global.ZOS_PEOPLE = require('../src/people.js');
global.ZOS_SYMPTOMS = require('../src/symptoms.json');
global.ROUTER = require('../src/router.js');
{ const b = require('fs').readFileSync(__dirname + '/../site/graph.wasm'); ROUTER.init(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
global.ZOS_POI = JSON.parse(require('fs').readFileSync(__dirname + '/../site/poi.json', 'utf8'));
global.ZOS_ADDR = JSON.parse(require('fs').readFileSync(__dirname + '/../site/addr.json', 'utf8'));
const { Sim } = require('../src/engine.js');

function bot(sim) {
  const s = sim.s;
  for (const c of s.cases) {
    if (c.status === 'waiting') {
      if (c.mu) {
        const m = sim.suggest(c.id, 'MU')[0]; if (m && !c.crews.length) sim.assign(c.id, m.crewId);
        const r = sim.suggest(c.id, 'RZP').slice(0, 2); r.forEach(x => sim.assign(c.id, x.crewId));
        const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
        const l = sim.suggest(c.id, 'LZS')[0]; if (l) sim.assign(c.id, l.crewId);
        continue;
      }
      if (c.exitus) { if (c.examPending) { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); } continue; }
      const r = sim.suggest(c.id, 'RZP')[0];
      if (r) sim.assign(c.id, r.crewId);
      if (c.rvNeed) { const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId); }
    }
    if ((c.status === 'active') && c.mu && c.mu.left > 0) {
      const r = sim.suggest(c.id, 'RZP')[0]; if (r && c.crews.length < 8) sim.assign(c.id, r.crewId);
    }
    if (c.coroner && c.coroner.state === 'available') sim.sendAgency(c.id, 'cor');
    if (c.status === 'active' && c.rvReq && !c.rvReq.cancelled && !c.rvReq.satT && !c.docAssigned) {
      const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
    }
    if (c.status === 'active' && c.rvNeed && !c.docAssigned) {
      const v = sim.suggest(c.id, 'RV')[0]; if (v) sim.assign(c.id, v.crewId);
    }
  }
}
function invariants(sim) {
  const s = sim.s;
  for (const c of s.crews) {
    const p = sim.pos(c);
    if (!isFinite(p.lat) || !isFinite(p.lon)) throw new Error('NaN pos ' + c.id);
    if (['call', 'enroute', 'onscene', 'transport', 'handover'].includes(c.state)) {
      const cs = sim.caseOf(c.caseId);
      if (!cs) throw new Error('crew without case ' + c.id + ' ' + c.state);
      if (cs.status === 'closed') throw new Error('crew on closed case ' + c.id);
      if (!cs.crews.includes(c.id)) throw new Error('case lacks crew ' + c.id);
    } else if (c.caseId) throw new Error('idle crew has case ' + c.id + c.state);
  }
  for (const cs of s.cases) {
    const busy = s.crews.filter(c => c.caseId === cs.id);
    if (cs.status === 'closed' && busy.length) throw new Error('closed case with crews');
    if (cs.status === 'waiting' && busy.length) throw new Error('waiting case with crews ' + cs.num);
  }
}
for (const seed of [1, 2, 3, 42]) {
  const sim = new Sim({ seed, mode: 'shift', startHour: seed % 2 ? 7 : 19 });
  let n = 0;
  while (!sim.s.ended) {
    sim.step(10); bot(sim); invariants(sim);
    if (++n === 2000 && seed === 1) { const j = sim.serialize(); const r = Sim.restore(j); if (r.serialize() !== j) throw new Error('restore mismatch'); }
  }
  const sm = sim.summary();
  const open = sim.s.cases.filter(c => c.status !== 'closed').length;
  console.log('seed', seed, 'cases', sm.cases, 'closed', sm.closed, 'unserved', sm.unserved, 'open', open,
    'score', sm.total.toFixed(1), 'cov', sm.coverage.toFixed(0), 'N1 avg min', sm.avgN1 && (sm.avgN1 / 60).toFixed(1),
    'legal%', sm.legalPct && sm.legalPct.toFixed(0), 'mu', sim.s.cases.some(c => c.mu));
}
// determinism
const a = new Sim({ seed: 7 }), b = new Sim({ seed: 7 });
a.step(3000); b.step(3000);
console.log('deterministic', a.serialize() === b.serialize());
const morningSchedule = new Sim({ seed: 23, mode: 'shift', startHour: 7 });
morningSchedule.s.ev.nextSpawn = 999999; morningSchedule.s.ev.nextMU = null; morningSchedule.step(5);
const morningJobs = morningSchedule.s.cases.filter(c => c.typ === 'sekundární');
if (morningJobs.length !== 2 || morningJobs.some(c => c.scheduledAt < 3600 || c.scheduledAt > 7200)) throw new Error('morning N4 schedule failed');
const nightSchedule = new Sim({ seed: 24, mode: 'shift', startHour: 19 });
nightSchedule.s.ev.nextSpawn = 999999; nightSchedule.s.ev.nextMU = null; nightSchedule.step(5);
if (nightSchedule.s.cases.some(c => c.typ === 'sekundární')) throw new Error('night shift generated N4 transfer');
console.log('day-only morning N4 schedule true');
// N4 secondary transfers are dispatcher-controlled and complete through the transport lifecycle.
const secondarySim = new Sim({ seed: 99, mode: 'free' });
secondarySim.s.ev.nextSpawn = secondarySim.s.ev.nextSecond = 999999;
secondarySim.s.ev.nextMU = null;
const primaryOpen = secondarySim._spawn();
primaryOpen.status = 'waiting'; primaryOpen.n = primaryOpen.nOrig = 3;
primaryOpen.readyAt = secondarySim.s.t; primaryOpen.waitSince = secondarySim.s.t; primaryOpen.escAt = 999999;
const secondary = secondarySim._spawnSecondary();
if (!(secondarySim.summary().total > 0)) throw new Error('N4 transfer corrupted primary shift scoring');
const secondaryRzp = secondarySim.suggest(secondary.id, 'RZP')[0];
if (!secondaryRzp || !secondarySim.assign(secondary.id, secondaryRzp.crewId).ok) throw new Error('N4 transfer assignment failed');
secondarySim.step(6 * 3600);
if (secondary.status !== 'closed' || !secondary.score || !isFinite(secondary.score.total)) throw new Error('N4 transfer lifecycle failed');
console.log('secondary transfer lifecycle true');
// N1 departure alarm fires once when turnout exceeds two minutes.
const alarmSim = new Sim({ seed: 101, mode: 'free' });
alarmSim.s.ev.nextSpawn = alarmSim.s.ev.nextSecond = 999999; alarmSim.s.ev.nextMU = null;
const alarmCase = alarmSim._spawn(); alarmCase.n = alarmCase.nOrig = 1; alarmCase.status = 'waiting'; alarmCase.readyAt = alarmSim.s.t;
const alarmRzp = alarmSim.s.crews.find(c => c.type === 'RZP' && alarmSim.avail(c));
alarmSim._turnout = () => 130;
if (!alarmSim.assign(alarmCase.id, alarmRzp.id).ok) throw new Error('N1 alarm setup failed');
alarmSim.step(125);
if (alarmSim.s.log.filter(e => e.kind === 'deadline').length !== 1) throw new Error('N1 deadline alarm missing or repeated');
console.log('N1 departure alarm true');
// A field request for a doctor stays pending until an RV is assigned.
const rvRequestSim = new Sim({ seed: 102, mode: 'free' });
rvRequestSim.s.ev.nextSpawn = rvRequestSim.s.ev.nextSecond = 999999; rvRequestSim.s.ev.nextMU = null;
const rvCase = rvRequestSim._spawn(); rvCase.status = 'waiting'; rvCase.readyAt = rvRequestSim.s.t; rvCase.rvReqAt = 1;
rvCase.rvAfterRzp = false;
rvRequestSim.step(5);
if (!rvCase.rvReq || rvCase.rvReq.satT != null) throw new Error('doctor request did not remain visibly pending');
const rv = rvRequestSim.suggest(rvCase.id, 'RV')[0];
if (!rv || !rvRequestSim.assign(rvCase.id, rv.crewId).ok || rvCase.rvReq.satT == null) throw new Error('doctor request did not clear on RV assignment');
console.log('field doctor request lifecycle true');
if (ZOS_DATA.indications.some(ind => ind.klasif === 'Posouzení stavu') || ZOS_DATA.klasifikaceVsechny.includes('Posouzení stavu')) throw new Error('standalone assessment call must not be generated');
const assessmentSim = new Sim({ seed: 106, mode: 'free' });
assessmentSim.s.ev.nextSpawn = assessmentSim.s.ev.nextSecond = 999999; assessmentSim.s.ev.nextMU = null;
const assessmentCase = assessmentSim._spawn(); assessmentCase.status = 'waiting'; assessmentCase.readyAt = assessmentSim.s.t;
assessmentCase.rvNeed = false; assessmentCase.rvLater = true; assessmentCase.rvReqKind = 'posouzení stavu';
const assessmentRzp = assessmentSim.suggest(assessmentCase.id, 'RZP')[0];
if (!assessmentRzp || !assessmentSim.assign(assessmentCase.id, assessmentRzp.crewId).ok) throw new Error('assessment RZP dispatch failed');
for (let i = 0; i < 600 && !assessmentCase.rvReq; i++) assessmentSim.step(30);
if (!assessmentCase.rvReq || assessmentCase.rvReq.kind !== 'posouzení stavu' || !assessmentSim.suggest(assessmentCase.id, 'RV').length) throw new Error('RZP did not request RV assessment after arrival');
console.log('assessment is only an RZP field request true');
// Morning demand peaks above the midday trough under the same seeded Poisson draw.
const rhythm = new Sim({ seed: 103, mode: 'free', startHour: 8 });
rhythm.rnd = () => 0.5;
const morningGap = rhythm._gap(); rhythm.s.startHour = 13;
const middayGap = rhythm._gap();
if (!(morningGap < middayGap)) throw new Error('morning call-volume peak missing');
console.log('morning call-volume peak true');
const symptomCase = rhythm._spawn();
if (!Array.isArray(symptomCase.symptoms) || symptomCase.symptoms.join(', ') !== symptomCase.up) throw new Error('call symptoms are not stored as selected items');
const symptomCatalog = new Set(ZOS_SYMPTOMS.symptomCatalog);
if (symptomCase.symptoms.some(x => !symptomCatalog.has(x))) throw new Error('generated symptom is not in the source symptom database');
if (ZOS_SYMPTOMS.symptomCatalog.includes('TĚŽKÁ DUŠNOST') || ZOS_SYMPTOMS.symptomCatalog.includes('NEREAGUJE ADEKVÁTNĚ')) throw new Error('unverified sample symptom remains in the source database');
for (const ind of ZOS_DATA.indications) {
  const profiles = ZOS_SYMPTOMS.symptomProfiles[ind.symptomKey || ind.klasif];
  if (!profiles || !Object.values(profiles).some(x => x.length)) throw new Error(`missing symptom profile for ${ind.id}`);
  for (const n of Object.keys(ind.n)) {
    const terms = rhythm._symptomSet(ind.symptomKey || ind.klasif, Number(n));
    if (!terms.length || terms.some(x => !symptomCatalog.has(x))) throw new Error(`invalid source symptoms for ${ind.id} / N${n}`);
  }
}
if (rhythm._symptomSet('MU - MATRA 722', 1).some(x => !symptomCatalog.has(x))) throw new Error('MU symptoms are not from the source database');
if (!Array.isArray(Sim.restore(rhythm.serialize()).caseOf(symptomCase.id).symptoms)) throw new Error('symptom selections did not survive save/restore');
console.log('structured call symptoms true');
// Apneic unresponsiveness is always immediate N1 and never a dynamic indication.
const apneaSim = new Sim({ seed: 108, mode: 'free' });
apneaSim.s.ev.nextSpawn = apneaSim.s.ev.nextSecond = 999999; apneaSim.s.ev.nextMU = null;
const poruchaInd = ZOS_DATA.indications.find(x => x.id === 'porucha');
const originalWpick = apneaSim.wpick.bind(apneaSim);
apneaSim.wpick = (values, weight) => {
  if (values === ZOS_DATA.indications) return poruchaInd;
  if (values.length === 3 && values.every(x => typeof x === 'number')) return 3;
  if (values.length && Array.isArray(values[0]) && Array.isArray(values[0][0])) {
    const apneicDynamic = values.find(x => {
      const text = x[0].map(i => ZOS_SYMPTOMS.symptomCatalog[i]).join(' ').toLocaleUpperCase('cs-CZ');
      return text.includes('NEDÝCHÁ') && text.includes('AVPU-U') && text.includes('DYNAMICKÁ INDIKACE');
    });
    if (apneicDynamic) return apneicDynamic;
    // reálná data takovou kombinaci u N3 nemají – sestavit ji uměle z katalogu
    const cat = ZOS_SYMPTOMS.symptomCatalog, ix = s => cat.indexOf(s);
    const synth = ['$AVPU-U', 'bezvědomí', 'nedýchá', 'Dospělý', 'DYNAMICKÁ INDIKACE'].map(ix);
    if (synth.every(i => i >= 0) && values.some(x => x[0].some(i => cat[i] && cat[i].startsWith('$')))) return [synth, 1];
  }
  return originalWpick(values, weight);
};
const apneaCase = apneaSim._spawn();
if (apneaCase.n !== 1 || apneaCase.dyn || !apneaCase.rvNeed || !apneaCase.symptoms.some(x => x.toLocaleUpperCase('cs-CZ').includes('NEDÝCHÁ')) || apneaCase.symptoms.some(x => x.toLocaleUpperCase('cs-CZ').includes('DYNAMICKÁ INDIKACE'))) throw new Error('apneic unresponsiveness was not corrected to direct non-dynamic N1');
console.log('apneic unresponsiveness forced to direct N1 true');
// Recent generated addresses are not repeated, and Mladá Vožice uses the supplied real station.
const addressSim = new Sim({ seed: 109, mode: 'free' });
const recentAddressSet = new Set();
for (let i = 0; i < 1000; i++) {
  const location = addressSim._randomAddress(ZOS_ADDR);
  if (recentAddressSet.has(location.address)) throw new Error('an address repeated inside the recent-address window');
  recentAddressSet.add(location.address);
}
const mvozice = ZOS_DATA.stations.find(x => x.id === 'mvozice');
if (!mvozice || mvozice.address !== 'Plaňková 420' || Math.abs(mvozice.lat - 49.5321) > 1e-5 || Math.abs(mvozice.lon - 14.80855) > 1e-5) throw new Error('Mladá Vožice station location is incorrect');
console.log('address variety and Mladá Vožice base location true');
// Cancelling an optional RV request releases RZP to transport the patient.
const cancelRvSim = new Sim({ seed: 110, mode: 'free' });
cancelRvSim.s.ev.nextSpawn = cancelRvSim.s.ev.nextSecond = 999999; cancelRvSim.s.ev.nextMU = null;
const cancelRvCase = cancelRvSim._spawn();
cancelRvCase.status = 'waiting'; cancelRvCase.readyAt = cancelRvSim.s.t; cancelRvCase.n = cancelRvCase.nOrig = 3;
cancelRvCase.rvNeed = false; cancelRvCase.rvLater = false; cancelRvCase.rvReqAt = null;
cancelRvCase.rvReq = { t: cancelRvSim.s.t, satT: null, kind: 'posouzení stavu', cancelled: false };
cancelRvCase.initialDispatchRequired = ['RZP']; cancelRvCase.initialDispatchSent = [];
const cancelRzp = cancelRvSim.suggest(cancelRvCase.id, 'RZP')[0];
const cancelRv = cancelRvSim.suggest(cancelRvCase.id, 'RV')[0];
if (!cancelRzp || !cancelRv || !cancelRvSim.assign(cancelRvCase.id, cancelRzp.crewId).ok || !cancelRvSim.assign(cancelRvCase.id, cancelRv.crewId).ok) throw new Error('RV cancellation setup failed');
const cancelRzpCrew = cancelRvSim.crewOf(cancelRzp.crewId);
cancelRzpCrew.state = 'onscene'; cancelRzpCrew.until = cancelRvSim.s.t; cancelRzpCrew.arrivedAt = cancelRvSim.s.t;
cancelRvCase.arrived = true; cancelRvCase.trans = true; cancelRvCase.scene = [1, 1];
if (!cancelRvSim.cancelAssignment(cancelRvCase.id, cancelRv.crewId).ok) throw new Error('RV cancellation failed');
cancelRvSim.step(5);
if (!cancelRvCase.rvReq.cancelled || cancelRzpCrew.state !== 'transport') throw new Error('cancelled RV request continued to block RZP transport');
console.log('cancelled field RV request no longer blocks RZP transport true');
// When one patient is transported by RZP, an assigned RV returns from scene or en route.
const rvTransportSim = new Sim({ seed: 111, mode: 'free' });
rvTransportSim.s.ev.nextSpawn = rvTransportSim.s.ev.nextSecond = 999999; rvTransportSim.s.ev.nextMU = null;
const rvTransportCase = rvTransportSim._spawn(); rvTransportCase.status = 'active'; rvTransportCase.patientCount = 1; rvTransportCase.pocet = 1; rvTransportCase.trans = true;
const transportRzp = rvTransportSim.suggest(rvTransportCase.id, 'RZP')[0], transportRv = rvTransportSim.suggest(rvTransportCase.id, 'RV')[0];
if (!transportRzp || !transportRv || !rvTransportSim.assign(rvTransportCase.id, transportRzp.crewId).ok || !rvTransportSim.assign(rvTransportCase.id, transportRv.crewId).ok) throw new Error('single-patient RV transport setup failed');
const transportRzpCrew = rvTransportSim.crewOf(transportRzp.crewId), transportRvCrew = rvTransportSim.crewOf(transportRv.crewId);
transportRzpCrew.state = transportRvCrew.state = 'onscene'; transportRzpCrew.until = transportRvCrew.until = rvTransportSim.s.t; transportRzpCrew.arrivedAt = transportRvCrew.arrivedAt = rvTransportSim.s.t;
rvTransportSim._startTransport(transportRzpCrew, rvTransportCase);
if (transportRvCrew.caseId || transportRvCrew.state !== 'free') throw new Error('RV remained attached at scene after single-patient RZP transport');
const multiCase = rvTransportSim._spawn(); multiCase.status = 'active'; multiCase.patientCount = 2; multiCase.pocet = 2; multiCase.trans = true;
const multiRzp = rvTransportSim.suggest(multiCase.id, 'RZP')[0], multiRv = rvTransportSim.suggest(multiCase.id, 'RV')[0];
if (!multiRzp || !multiRv || !rvTransportSim.assign(multiCase.id, multiRzp.crewId).ok || !rvTransportSim.assign(multiCase.id, multiRv.crewId).ok) throw new Error('multi-patient RV setup failed');
const multiRzpCrew = rvTransportSim.crewOf(multiRzp.crewId), multiRvCrew = rvTransportSim.crewOf(multiRv.crewId); multiRzpCrew.state = 'onscene'; multiRzpCrew.until = rvTransportSim.s.t;
rvTransportSim._startTransport(multiRzpCrew, multiCase);
if (multiRvCrew.caseId !== multiCase.id) throw new Error('RV was released from multi-patient event');
console.log('single-patient RV release and multi-patient retention true');
// LZS receives a penalty after the planned handover plus a five-minute grace period.
const lzsWaitSim = new Sim({ seed: 112, mode: 'free' }); lzsWaitSim.s.ev.nextSpawn = lzsWaitSim.s.ev.nextSecond = 999999; lzsWaitSim.s.ev.nextMU = null;
const lzsWaitCase = lzsWaitSim._spawn(); lzsWaitCase.status = 'active'; lzsWaitCase.lzsLandedAt = 0; lzsWaitCase.lzsTransferCrewArrived = null; lzsWaitCase.lzsWaitPenaltyCount = 0;
const waitingLzs = lzsWaitSim.crewOf('lzs'); waitingLzs.caseId = lzsWaitCase.id; waitingLzs.caseRole = null; waitingLzs.state = 'handover'; waitingLzs.lzsLeg = 'handover'; waitingLzs.until = 0; waitingLzs.hoStart = 0; lzsWaitCase.crews.push(waitingLzs.id);
lzsWaitSim.s.t = 480; lzsWaitSim._crewStep(waitingLzs);
if (lzsWaitSim.summary().opsPoints !== -2) throw new Error('long LZS heliport wait penalty did not apply after grace period');
lzsWaitSim.s.t = 780; lzsWaitSim._crewStep(waitingLzs);
if (lzsWaitSim.summary().opsPoints !== -4) throw new Error('LZS heliport wait penalty did not repeat after five minutes');
console.log('LZS heliport waiting penalties true');
const heliAlertSim = new Sim({ seed: 118, mode: 'free' });
heliAlertSim.s.ev.nextSpawn = heliAlertSim.s.ev.nextSecond = 999999; heliAlertSim.s.ev.nextMU = null;
const heliAlertCase = heliAlertSim._spawn(); heliAlertCase.status = 'active'; heliAlertCase.lzsHeliportAlerted = false;
const alertLzs = heliAlertSim.crewOf('lzs'); alertLzs.caseId = heliAlertCase.id; alertLzs.state = 'transport'; alertLzs.lzsLeg = 'to-heliport'; alertLzs.until = 1000; heliAlertCase.crews.push(alertLzs.id);
heliAlertSim.s.t = 699; heliAlertSim._crewStep(alertLzs);
if (heliAlertCase.lzsHeliportAlerted) throw new Error('LZS heliport alert fired before five-minute threshold');
heliAlertSim.s.t = 700; heliAlertSim._crewStep(alertLzs);
if (!heliAlertCase.lzsHeliportAlerted || !heliAlertSim.s.log.some(e => e.txt.includes('přistání za 5 min'))) throw new Error('LZS heliport alert did not fire five minutes before landing');
console.log('LZS heliport alert at five minutes true');
// A distant, suitable single-patient transport can be handed over to a local RZP en route.
const vjSim = new Sim({ seed: 113, mode: 'free', startHour: 10, muEnabled: false });
vjSim.s.ev.nextSpawn = vjSim.s.ev.nextSecond = vjSim.s.ev.nextMU = 999999;
const vjCase = vjSim._spawn(); vjCase.status = 'active'; vjCase.n = 3; vjCase.dyn = true; vjCase.klasif = 'Bolest'; vjCase.trans = true; vjCase.patientCount = 1; vjCase.pocet = 1;
vjCase.lat = ZOS_DATA.stations.find(x => x.id === 'dacice').lat; vjCase.lon = ZOS_DATA.stations.find(x => x.id === 'dacice').lon; vjCase.hospType = 'okresni'; vjCase.targetHospitalId = 'h-jh';
const vjPrimary = vjSim.crewOf('dacice-r0'), vjHelper = vjSim.crewOf('jh-r0');
if (!vjPrimary || !vjHelper || !vjSim.avail(vjPrimary) || !vjSim.avail(vjHelper)) throw new Error('Vstřícná jízda test setup did not have local crews');
vjPrimary.caseId = vjCase.id; vjPrimary.state = 'onscene'; vjCase.crews.push(vjPrimary.id);
vjSim.rnd = () => 0;
vjSim._startTransport(vjPrimary, vjCase);
if (!vjCase.vstricna || vjCase.vstricna.state !== 'offered') throw new Error('suitable distant transport did not offer Vstřícná jízda');
const vjDispatch = vjSim.assignVstricna(vjCase.id, vjHelper.id);
if (!vjDispatch.ok || vjPrimary.caseRole !== 'vstricna-primary' || vjHelper.caseRole !== 'vstricna-support') throw new Error('Vstřícná jízda dispatch did not route both crews to rendezvous');
for (let i = 0; i < 1200 && vjCase.vstricna.state !== 'completed'; i++) vjSim.step(30);
if (vjCase.vstricna.state !== 'completed' || vjPrimary.caseId || vjHelper.state !== 'transport' || vjHelper.caseRole !== 'vstricna-destination') throw new Error('Vstřícná jízda did not transfer the patient and release the originating crew');
console.log('Vstřícná jízda rendezvous, handover and destination transport true');
// Běžné „Vyslat“ RZP z cílové oblasti musí spustit vstřícnou jízdu (ne jízdu na místo události);
// posádky se potkají přibližně současně a předání trvá nejvýš 5 min.
{
  const sim = new Sim({ seed: 113, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = sim.s.ev.nextMU = 999999;
  const cs = sim._spawn(); cs.status = 'active'; cs.n = 3; cs.dyn = true; cs.klasif = 'Bolest'; cs.trans = true; cs.patientCount = 1; cs.pocet = 1;
  const dc = ZOS_DATA.stations.find(x => x.id === 'dacice'); cs.lat = dc.lat; cs.lon = dc.lon; cs.hospType = 'okresni'; cs.targetHospitalId = 'h-jh';
  const pr = sim.crewOf('dacice-r0'), he = sim.crewOf('jh-r0');
  pr.caseId = cs.id; pr.state = 'onscene'; cs.crews.push(pr.id);
  const rnd = sim.rnd; sim.rnd = () => 0; sim._startTransport(pr, cs); sim.rnd = rnd;
  sim.step(60);
  const r = sim.assign(cs.id, he.id);
  if (!r.ok || he.caseRole !== 'vstricna-support' || pr.caseRole !== 'vstricna-primary') throw new Error('plain assign did not start Vstřícná jízda');
  let tP = null, tH = null, tDone = null;
  for (let i = 0; i < 2000 && cs.vstricna.state !== 'completed'; i++) {
    sim.step(10);
    if (tP == null && pr.state === 'onscene') tP = sim.s.t;
    if (tH == null && he.state === 'onscene') tH = sim.s.t;
  }
  tDone = sim.s.t;
  if (cs.vstricna.state !== 'completed') throw new Error('Vstřícná jízda after plain assign never completed');
  const wait = Math.abs(tP - tH), ho = tDone - Math.max(tP, tH);
  if (wait > 8 * 60) throw new Error('Vstřícná jízda crews met with too large time gap: ' + Math.round(wait / 60) + ' min');
  if (ho > 5 * 60 + 20 || ho < 100) throw new Error('Vstřícná jízda handover duration out of range: ' + ho + ' s');
  console.log('Vstřícná jízda via plain assign, balanced meet (gap ' + Math.round(wait / 60) + ' min), handover ' + Math.round(ho / 60) + ' min true');
}
// Posádka mimo svou oblast veze pacienta do nemocnice své oblasti (pokud má potřebné pracoviště).
{
  const sim = new Sim({ seed: 120, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = sim.s.ev.nextMU = 999999;
  const cs = sim._spawn(); cs.status = 'active'; cs.n = 3; cs.trans = true; cs.patientCount = 1; cs.pocet = 1; cs.hospType = 'okresni'; cs.targetHospitalId = null;
  const pi = ZOS_DATA.hospitals.find(h => h.id === 'h-pi'); cs.lat = pi.lat + 0.02; cs.lon = pi.lon;
  const k = sim.crewOf('cb-r0'); k.caseId = cs.id; k.state = 'onscene'; k.lat = cs.lat; k.lon = cs.lon; cs.crews.push(k.id);
  sim._startTransport(k, cs);
  if (!k.dest || k.dest.hid !== 'h-cb') throw new Error('ČB crew in Písek district did not return to NEM ČB: ' + (k.dest && k.dest.hid));
  const k2 = sim.crewOf('pi-r0'); const cs2 = sim._spawn(); cs2.status = 'active'; cs2.trans = true; cs2.patientCount = 1; cs2.hospType = 'okresni'; cs2.targetHospitalId = null; cs2.lat = cs.lat; cs2.lon = cs.lon;
  k2.caseId = cs2.id; k2.state = 'onscene'; k2.lat = cs.lat; k2.lon = cs.lon; cs2.crews.push(k2.id);
  sim._startTransport(k2, cs2);
  if (!k2.dest || k2.dest.hid !== 'h-pi') throw new Error('Písek crew did not go to NEM Písek');
  console.log('crew transports to own-district hospital true');
}
// LIBERO: nastavení obsazení (vždy / nikdy / náhodně) a změna během hry
{
  const on = new Sim({ seed: 5, startHour: 7, libero: { presence: 0, modes: { 'lib-jh': 'on', 'lib-cb': 'off' } } });
  const st = id => on.crewOf(id).state;
  if (st('lib-jh') !== 'base' || st('lib-cb') !== 'off' || st('lib-pi') !== 'off') throw new Error('LIBERO settings not applied at start');
  on.setLiberoMode('lib-pi', 'on'); if (st('lib-pi') !== 'base') throw new Error('LIBERO in-game enable failed');
  on.setLiberoMode('lib-jh', 'off'); if (st('lib-jh') !== 'off') throw new Error('LIBERO in-game disable failed');
  const all = new Sim({ seed: 6, startHour: 7, libero: { presence: 100 } });
  if (ZOS_DATA.libero.some(l => all.crewOf(l.id).state !== 'base')) throw new Error('LIBERO presence 100 % not all present');
  const night = new Sim({ seed: 7, startHour: 19, libero: { presence: 100 } });
  if (ZOS_DATA.libero.some(l => night.crewOf(l.id).state !== 'off')) throw new Error('LIBERO must not be on duty at night');
  console.log('LIBERO settings (7 stations, always/never/random, in-game change) true');
}
// Volací čísla podle oblastí (JH 3xx, TA 2xx …)
{
  const sim = new Sim({ seed: 1 });
  const c = id => sim.crewOf(id).code;
  if (c('jh-v0') !== '319' || c('jh-r0') !== '313' || c('ta-v0') !== '219' || c('cb-r0') !== '127' || c('dacice-v0') !== '309') throw new Error('crew radio numbers do not match dispatch numbering');
  console.log('crew radio numbers by area true');
}
const muDisabled = new Sim({ seed: 114, mode: 'shift', muEnabled: false, muProbability: 100 });
const muZero = new Sim({ seed: 115, mode: 'shift', muEnabled: true, muProbability: 0 });
const muCertain = new Sim({ seed: 116, mode: 'shift', muEnabled: true, muProbability: 100 });
if (muDisabled.s.ev.nextMU != null || muZero.s.ev.nextMU != null || !(muCertain.s.ev.nextMU > 0)) throw new Error('MU enable/probability settings were not applied');
console.log('MU startup toggle and shift probability true');
// LZS activation, aerial route, heliport handoff, RZP hospital transfer, and return.
const airSim = new Sim({ seed: 104, mode: 'free', startHour: 10 });
airSim.s.ev.nextSpawn = airSim.s.ev.nextSecond = 999999; airSim.s.ev.nextMU = null;
const airCase = airSim._spawn(); airCase.status = 'waiting'; airCase.readyAt = airSim.s.t;
airCase.n = airCase.nOrig = 1; airCase.lat = 48.970; airCase.lon = 14.480; airCase.hospType = 'trauma';
const lzs = airSim.crewOf('lzs');
if (!airSim.assign(airCase.id, lzs.id).ok) throw new Error('LZS dispatch failed');
const sceneRzp = airSim.suggest(airCase.id, 'RZP')[0];
const sceneRv = airSim.suggest(airCase.id, 'RV')[0];
if (!sceneRzp || !airSim.assign(airCase.id, sceneRzp.crewId).ok) throw new Error('LZS scene RZP dispatch failed');
if (!sceneRv || !airSim.assign(airCase.id, sceneRv.crewId).ok) throw new Error('LZS scene RV dispatch failed');
if (airSim.suggest(airCase.id, 'RZP', 'heli-transfer').length) throw new Error('heliport transfer offered before LZS patient flight');
for (let i = 0; i < 600 && !airCase.lzsPatientToHospital; i++) airSim.step(30);
if (!airCase.lzsPatientToHospital) throw new Error('LZS patient flight did not start');
const airRzp = airSim.suggest(airCase.id, 'RZP', 'heli-transfer')[0];
if (!airRzp || !airSim.assign(airCase.id, airRzp.crewId, 'heli-transfer').ok) throw new Error('LZS transfer RZP dispatch failed');
for (let i = 0; i < 600 && airCase.status !== 'closed'; i++) airSim.step(30);
if (airCase.status !== 'closed' || !airCase.lzsTransferred || !airCase.transported || !airCase.dest.includes('Traumacentrum')) throw new Error('LZS patient transfer lifecycle failed');
if (airSim.crewOf(airRzp.crewId).caseId || lzs.caseId || !['base', 'free'].includes(lzs.state)) throw new Error('LZS or RZP did not clear the case or LZS failed to return');
const airRzpCrew = airSim.crewOf(airRzp.crewId);
if (!airRzpCrew.hospitalRun || airRzpCrew.hospitalRun.phase !== 'return' || airRzpCrew.hospitalRun.availableAt > airSim.s.t) throw new Error('hospital transport board should show the crew as free right after handover');
console.log('LZS heliport transfer lifecycle true');
const burnSim = new Sim({ seed: 107, mode: 'free', startHour: 10 });
burnSim.s.ev.nextSpawn = burnSim.s.ev.nextSecond = 999999; burnSim.s.ev.nextMU = null;
const burnCase = burnSim._spawn(); burnCase.status = 'waiting'; burnCase.readyAt = burnSim.s.t; burnCase.burnCenterCandidate = true;
if (!burnSim.assign(burnCase.id, burnSim.crewOf('lzs').id).ok) throw new Error('burn LZS dispatch failed');
const burnRzp = burnSim.suggest(burnCase.id, 'RZP')[0];
if (!burnRzp || !burnSim.assign(burnCase.id, burnRzp.crewId).ok) throw new Error('burn scene RZP dispatch failed');
for (let i = 0; i < 600 && !burnCase.lzsPatientToHospital; i++) burnSim.step(30);
if (!burnCase.lzsPatientToHospital || burnCase.lzsTargetHospitalId !== 'h-fnkv') throw new Error('severe burn did not route LZS to FNKV');
// FNKV: předání zajistí ZZS HMP, převozní RZP z kraje se nenabízí ani neposílá
if (burnSim.suggest(burnCase.id, 'RZP', 'heli-transfer').length) throw new Error('FNKV must not offer a JčK transfer RZP');
const burnLzs = burnSim.crewOf('lzs');
let burnLanded = null, burnBack = null;
for (let i = 0; i < 900 && burnCase.status !== 'closed'; i++) {
  burnSim.step(30);
  if (burnLanded == null && burnCase.lzsLandedAt != null) burnLanded = burnCase.lzsLandedAt;
  if (burnBack == null && burnCase.lzsTransferred) burnBack = burnSim.s.t;
}
if (burnCase.status !== 'closed' || !burnCase.dest.includes('FNKV Praha') || !burnCase.dest.includes('Popáleninové centrum')) throw new Error('burn patient was not handed over at FNKV');
const burnHandoverMin = (burnBack - burnLanded) / 60;
if (burnHandoverMin < 18 || burnHandoverMin > 32) throw new Error('FNKV handover duration out of range: ' + burnHandoverMin);
if (burnCase.crews.some(id => burnSim.crewOf(id).type === 'RZP' && burnSim.crewOf(id).caseRole === 'heli-transfer')) throw new Error('unexpected heli-transfer RZP at FNKV');
console.log('severe burn LZS route to FNKV true');
// Shift start can be clean or inherit a small active workload; operational points are persistent.
const cleanStart = new Sim({ seed: 201, mode: 'shift', startState: 'clean' });
const runningStart = new Sim({ seed: 201, mode: 'shift', startState: 'running' });
if (cleanStart.s.cases.length !== 0) throw new Error('clean shift must start with zero cases');
if (runningStart.s.cases.length !== 3 || !runningStart.s.cases.some(c => c.crews.length)) throw new Error('running shift must start with three cases and a dispatched crew');
runningStart._opsScore(2, 'test bonus'); runningStart._opsScore(-3, 'test penalty');
const scoreRestore = Sim.restore(runningStart.serialize());
if (scoreRestore.summary().opsPoints !== -1 || scoreRestore.summary().opsLog.length !== 2) throw new Error('operational score did not survive save/restore');
console.log('clean/running shift starts and operational score persistence true');
const reportScore = new Sim({ seed: 202, mode: 'free' });
reportScore.s.ev.nextSpawn = reportScore.s.ev.nextSecond = reportScore.s.ev.nextMU = 999999;
const reportCase = reportScore._spawn(); reportCase.status = 'waiting'; reportCase.readyAt = 0;
reportCase.radioReports = [
  { id: 'test-112', at: 0, received: true, receivedAt: 0, acknowledged: false, scoreApplied: false, text: 'syntetická zkouška' },
  { id: 'test-112-2', at: 0, received: true, receivedAt: 0, acknowledged: false, scoreApplied: false, text: 'druhá syntetická zkouška' },
];
reportScore.s.t = 60; reportScore.acknowledge112(reportCase.id, 'test-112');
if (reportScore.summary().opsPoints !== 1 || !reportCase.radioReports[0].acknowledged || reportCase.radioReports[1].acknowledged) throw new Error('individual timely 112 acknowledgement did not dismiss only the clicked alert');
console.log('timely 112 acknowledgement score true');
// idle (no dispatcher) should score badly
const idle = new Sim({ seed: 5 }); idle.step(12 * 3600);
console.log('idle score', idle.summary().total.toFixed(1), 'unserved', idle.summary().unserved);
// Selecting a case from the list must reveal the map first and pass its coordinates to focusOn.
{
  const fs = require('fs'), vm = require('vm');
  const ui = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8');
  const fn = ui.match(/function selectCaseFromElement\(caseElement, clickedElement\) \{[\s\S]*?\n\}/);
  if (!fn) throw new Error('case selection handler not found');
  const selected = { id: 'case-test', lat: 49.2, lon: 14.4 };
  let focus = null, renders = 0, acknowledged = null;
  const ctx = {
    sel: { c: null }, view: 'cases',
    sim: { caseOf: id => id === selected.id ? selected : null, acknowledge112: (...args) => { acknowledged = args; } },
    syncSelectionToMain() {}, render() { renders++; }, focusOn(lat, lon) { focus = [lat, lon]; },
  };
  vm.runInNewContext(fn[0] + `\nselectCaseFromElement({dataset:{case:'case-test'}},{closest:()=>null});`, ctx);
  if (ctx.view !== 'map' || !focus || focus[0] !== selected.lat || focus[1] !== selected.lon || renders !== 1) throw new Error('case list click did not switch to and focus the map');
}
console.log('case selection focuses map true');
// Case focus must issue a real MapLibre camera update, not only select the case.
{
  const fs = require('fs'), vm = require('vm');
  const ui = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8');
  const fn = ui.match(/function applyMapFocus\(target, attempt = 0\) \{[\s\S]*?\n\}/);
  if (!fn) throw new Error('map focus handler not found');
  let camera = null;
  const ctx = {
    GL: { stop() {}, resize() {}, getZoom: () => 8, jumpTo: value => { camera = value; } },
    glReady: true,
    document: { getElementById: () => ({ clientWidth: 800, clientHeight: 500 }) },
    requestAnimationFrame() {}, console,
  };
  vm.runInNewContext(fn[0] + '\napplyMapFocus({lat:49.2,lon:14.4});', ctx);
  if (!camera || camera.center[0] !== 14.4 || camera.center[1] !== 49.2 || camera.zoom < 10.5 || camera.zoom > 12.5) throw new Error('case click did not move map camera to event coordinates');
}
console.log('case click moves map camera true');
{
  const fs = require('fs'), vm = require('vm');
  const ui = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8');
  const fn = ui.match(/function pollLog\(\) \{[\s\S]*?\n\}/);
  if (!fn) throw new Error('radio polling function not found');
  let toneCount = 0;
  const ctx = {
    sim: { s: { log: [
      { id: 1, kind: 'crew', txt: 'Žádáme o vstřícnou jízdu.' },
      { id: 2, kind: 'crew', txt: 'Vstřícná jízda přijata.' },
    ] } }, seenLog: 0,
    isVstricnaRadioMessage: text => /vstřícn|vstricn/i.test(String(text || '')),
    vstricnaTone() { toneCount++; }, toast() {}, newCallTone() {}, alarmBeep() {}, beep() {}, satellitePanel: null, radioSpeak() {}, radioParse: () => null, radioFeed: [], voiceWillSpeak: () => false, radioLastAt: 0,
    performance: { now: () => Date.now() }, setTimeout() {}, renderRadio() {}, logDueAt: new Map(), logLastDue: 0,
  };
  vm.runInNewContext(fn[0] + '\npollLog(); pollLog();', ctx);
  if (toneCount !== 1 || ctx.seenLog !== 2) throw new Error('vstřícná jízda radio tone repeated or was missed');
}
console.log('vstřícná jízda radio highlight tone fires once true');
// LIBERO: lékař ze základny nastoupí do RZP → dočasně RLP, po návratu na základnu vystoupí
{
  const ls = new Sim({ seed: 303, mode: 'free', startHour: 9 });
  ls.s.ev.nextSpawn = ls.s.ev.nextSecond = 999999; ls.s.ev.nextMU = null;
  const lib = ls.crewOf('lib-ta'); lib.liberoPresent = true; if (lib.state === 'off') { lib.state = 'base'; }
  const rzp = ls.s.crews.find(k => k.st === 'ta' && k.type === 'RZP' && !k.res && k.state === 'base');
  const cs = ls._spawn(); cs.status = 'waiting'; cs.readyAt = ls.s.t; cs.n = 2; cs.dyn = false; cs.rvNeed = true; cs.initialDispatchRequired = ['RZP', 'RV']; cs.initialDispatchSent = [];
  cs.lat = 49.40; cs.lon = 14.68; cs.trans = false;
  if (!ls.attachLibero(rzp.id).ok) throw new Error('LIBERO attach failed');
  if (!rzp.rlp || lib.state !== 'attached' || !rzp.name.includes('LIBERO')) throw new Error('LIBERO not attached to RZP');
  if (!ls.assign(cs.id, rzp.id).ok) throw new Error('LIBERO RZP dispatch failed');
  if (!cs.docAssigned || !cs.initialDispatchSent.includes('RV')) throw new Error('LIBERO RZP not counted as doctor dispatch');
  for (let i = 0; i < 400 && cs.status !== 'closed'; i++) ls.step(30);
  if (cs.status !== 'closed' || !cs.docArrived) throw new Error('LIBERO case did not close with doctor on scene');
  for (let i = 0; i < 200 && rzp.state !== 'base'; i++) ls.step(30);
  if (rzp.rlp || lib.state !== 'base' || rzp.name.includes('LIBERO')) throw new Error('LIBERO did not leave the vehicle at base');
  const night = new Sim({ seed: 304, mode: 'free', startHour: 21 });
  if (night.s.crews.filter(k => k.libero).some(k => k.state !== 'off')) throw new Error('LIBERO must be off at night');
  console.log('LIBERO day doctor attach / dispatch / detach true');
}

// ---- 0.17: exitus, koroner, prohlídka zemřelého, doprovod, vstřícná „dojíždějte sami“
{
  const run = (fate, coroner) => {
    const sim = new Sim({ seed: 11, mode: 'shift', startHour: 7 });
    let cs = null, recalled = false, back = false;
    for (let i = 0; i < 3000 && !(cs && cs.status === 'closed'); i++) {
      if (!cs) {
        cs = sim.s.cases.find(c => c.status === 'waiting' && !c.mu && c.typ !== 'sekundární' && (c.patientCount || 1) === 1);
        if (cs) { cs.fate = fate; cs.n = 1; cs.rvNeed = true; cs.trans = fate === 'rosc'; cs.initialDispatchRequired = ['RZP', 'RV']; }
      }
      if (cs && cs.coroner && cs.coroner.state === 'pending') {            // vynucení výsledku zjišťování koronera
        cs.coroner.state = coroner; cs.coroner.until = sim.s.t + 600;
        if (coroner === 'unavailable') cs.exam = { needed: true, done: false, remaining: 1500, since: sim.s.t, lastPen: sim.s.t };
      }
      if (cs && cs.exam && cs.exam.crewId && !recalled) { recalled = true; const id = cs.exam.crewId; if (!sim.cancelAssignment(cs.id, id).ok) throw new Error('exam RV not recallable'); }
      else if (cs && recalled && cs.exam && cs.exam.crewId) back = true;
      bot(sim); sim.step(10); invariants(sim);
    }
    return { sim, cs, recalled, back, log: sim.s.log.filter(e => e.cid === cs.id).map(e => e.txt).join('\n') };
  };
  let r = run('signs', 'available');
  if (r.cs.status !== 'closed' || !/jisté známky smrti, exitus/.test(r.log) || !/ZCB101 na příjmu/.test(r.log)) throw new Error('signs-of-death flow failed');
  r = run('cpr-fail', 'unavailable');
  if (r.cs.status !== 'closed' || !r.recalled || !r.back || !r.cs.exam.done || !/na místě exitus/.test(r.log) || !/prohlídka zemřelého ukončena/.test(r.log)) throw new Error('exam / recall flow failed: ' + JSON.stringify({ st: r.cs.status, rec: r.recalled, back: r.back }));
  r = run('rosc', 'available');
  if (r.cs.status !== 'closed' || !/jedeme společně/.test(r.log) || r.cs.exitus) throw new Error('ROSC escort flow failed');
  console.log('exitus / koroner / prohlídka / doprovod true');

  const sim = new Sim({ seed: 21, mode: 'shift', startHour: 7 });
  sim.step(1200);
  const ints = sim.s.cases.filter(c => c.typ !== 'sekundární' && !c.mu && c.intake).map(c => c.intake);
  if (!ints.length || Math.min(...ints) < 70 || Math.max(...ints) > 200) throw new Error('intake duration out of range');
  const cs = sim.s.cases.find(c => c.status === 'waiting');
  const primary = sim.crewOf(sim.suggest(cs.id, 'RZP')[0].crewId);
  cs.vstricna = { state: 'offered', primaryCrewId: primary.id, area: 'JH', areaName: 'JH', expiresAt: sim.s.t + 600 };
  if (!sim.declineVstricna(cs.id).ok || cs.vstricna.state !== 'declined' || !sim.s.log.some(e => /dojíždějte sami/.test(e.txt))) throw new Error('declineVstricna failed');
  console.log('vstřícná: dojíždějte sami / délka nabírání true');
}
// 0.18: doplňková naléhavost, cílová pracoviště, Jihlava, datové zprávy, parkování u místa
{
  const sim = new Sim({ seed: 181, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  let wake = null, texts = [], tp = 0;
  for (let i = 0; i < 2500; i++) { const c = sim._spawn(); if (!wake && c.fate === 'wakes') wake = c; for (const r of c.radioReports || []) texts.push(r.text); if (/transport pacienta/i.test(c.up)) tp++; }
  if (tp) throw new Error('příznak Transport pacienta se stále generuje');
  if (texts.length < 200 || new Set(texts.filter(x => !/^nabírá se/.test(x))).size / texts.filter(x => !/^nabírá se/.test(x)).length < 0.92) throw new Error('datové zprávy IZS se opakují');
  if (!wake) throw new Error('chybí případ, kdy se pacient probírá');
  wake.status = 'active'; sim.s.cases.push(wake); sim.s.t = wake.wakeAt + 1; sim._caseStep(wake);
  if (wake.n !== 2 || wake.nDopl !== 2) throw new Error('probírající se pacient nesnížil naléhavost na doplňkovou N2');
  const ta = ZOS_DATA.hospitals.find(h => h.id === 'h-ta'), cb = ZOS_DATA.hospitals.find(h => h.id === 'h-cb');
  if (sim._deptFor(ta, { ind: 'gyn', up: '' }, 'okresni') !== 'Gynekologicko-porodnické oddělení') throw new Error('gyn pracoviště');
  if (sim._deptFor(ta, { ind: 'trauma', up: '' }, 'okresni') !== 'Chirurgická ambulance') throw new Error('chirurgická ambulance Tábor');
  if (sim._deptFor(ZOS_DATA.hospitals.find(h => h.id === 'h-jh'), { ind: 'trauma', up: '' }, 'okresni') !== 'Urgentní příjem') throw new Error('JH chirurgie přes urgent');
  if (!/KCC/.test(sim._deptFor(cb, { ind: 'cmp', up: '' }, 'iktove'))) throw new Error('ČB jako KCC');
  // kardio z Dačic → Jihlava
  const cs = sim._spawn(); cs.status = 'active'; cs.n = 2; cs.trans = true; cs.patientCount = cs.pocet = 1; cs.hospType = 'pci'; cs.targetHospitalId = null; cs.ind = 'hrudnik';
  const dc = ZOS_DATA.stations.find(x => x.id === 'dacice'); cs.lat = dc.lat; cs.lon = dc.lon; sim.s.cases.push(cs);
  const k = sim.crewOf('dacice-r0'); k.caseId = cs.id; k.state = 'onscene'; k.lat = dc.lat; k.lon = dc.lon; cs.crews.push(k.id);
  sim._startTransport(k, cs);
  if (!/Jihlava/.test(k.dest.name)) throw new Error('kardio z Dačic nejede do Jihlavy: ' + k.dest.name);
  const ho = []; for (let i = 0; i < 400; i++) ho.push(sim._handoverSec({ n: 3 })); ho.sort((a, b) => a - b);
  if (Math.abs(ho[200] - 605) > 90) throw new Error('medián předání neodpovídá říjnu');
  console.log('0.18 doplňková / pracoviště / Jihlava / DZ / předání true');
}
// interaktivní rádio: bez odpovědí se relace samy uzavřou (posádka si poradí), s odpovědí proběhne akce
{
  const sim = new Sim({ seed: 190, mode: 'shift', startHour: 8, muEnabled: false, radio: 'interactive' });
  for (let i = 0; i < 4 * 120; i++) { bot(sim); sim.step(30); }
  const q = sim.s.radioQ;
  if (!q.length) throw new Error('interaktivní rádio nevytvořilo žádnou relaci');
  if (q.some(e => (e.state === 'calling' || e.state === 'open') && sim.s.t - e.t > 400)) throw new Error('rádiová relace zůstala viset');
  const cs = sim.s.cases.find(c => c.status !== 'closed') || sim._spawn();
  const k = sim.s.crews.find(x => x.type === 'RZP');
  sim._radio(k, cs, 'zkušební relace.', 'zjišťujeme koronera');
  const e = q[q.length - 1];
  if (e.state !== 'calling' || !sim.radioAnswer(e.id).ok || e.state !== 'open') throw new Error('na příjmu nefunguje');
  const before = sim.s.ops ? sim.s.ops.points : 0;
  sim.radioReply(e.id, 'bad');
  if (e.state !== 'done' || !sim.s.log.slice(-3).some(x => x.txt.includes('vracejte se'))) throw new Error('odpověď na relaci nefunguje');
  console.log('interaktivní rádio: relace, opakování, odpovědi true', q.length, 'relací');
}
// spojový řád: PČR/HZS dlaždice, ZOS volá posádku, zkouška spojení LZS, kdo volá
{
  const sim = new Sim({ seed: 201, mode: 'free', startHour: 7, muEnabled: false, radio: 'interactive' });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  const cs = sim._spawn(); cs.status = 'active'; sim.s.cases.push(cs);
  const k = sim.s.crews.find(x => x.type === 'RZP' && sim.avail(x)); k.caseId = cs.id; k.state = 'onscene'; cs.crews.push(k.id);
  sim._requestAgency(k, cs, 'pcr', 'agresivní pacient');
  if (!cs.agencies.pcr || cs.agencies.pcr.state !== 'requested' || !sim._agencyHold(cs)) throw new Error('žádost o PČR');
  const e = sim.s.radioQ[sim.s.radioQ.length - 1];
  sim.radioAnswer(e.id); sim.radioReply(e.id, 'send');
  if (cs.agencies.pcr.state !== 'sent' || !sim.s.log.some(x => /posíláme policii/.test(x.txt))) throw new Error('PČR přes rádio');
  if (!sim.sendAgency(cs.id, 'hzs').ok || cs.agencies.hzs.state !== 'sent') throw new Error('HZS dlaždicí');
  sim.s.t = cs.agencies.hzs.arriveAt + 1; sim._agencyStep(cs);
  if (cs.agencies.hzs.state !== 'onscene') throw new Error('HZS na místě');
  sim._zosCall(k, cs, 'pacient se probírá, měníme naléhavost na N2.');
  const z = sim.s.radioQ[sim.s.radioQ.length - 1];
  if (z.state !== 'zos' || !sim.radioZosCall(z.id).ok || !sim.s.log.some(x => x.txt === `ZCB${k.code} na příjmu.`)) throw new Error('ZOS volá posádku');
  const s2 = new Sim({ seed: 202, mode: 'free', startHour: 8, muEnabled: false, radio: 'auto' });
  s2.step(30);
  if (!s2.s.log.some(x => /Kryštof 13: na Matře slyší za 5/.test(x.txt))) throw new Error('zkouška spojení LZS v 8:00');
  console.log('spojový řád: PČR/HZS, ZOS volá, LZS zkouška spojení true');
}
// LZS místo RV, LZS se pro počasí vrací, přesměrování vozu za jízdy bez zastavení
{
  const sim = new Sim({ seed: 211, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  const cs = sim._spawn(); cs.status = 'waiting'; cs.n = 1; cs.rvNeed = true; cs.initialDispatchRequired = ['RZP', 'RV']; cs.initialDispatchSent = []; sim.s.cases.push(cs);
  const lz = sim.crewOf('lzs'); sim._lzsWeatherStatus = () => 'clear';
  const r = sim.assign(cs.id, lz.id);
  if (!r.ok || !cs.initialDispatchSent.includes('RV')) throw new Error('LZS nenahrazuje RV v povinném výjezdu: ' + (r.msg || ''));
  sim.step(lz.until - sim.s.t + 1);
  lz.abortCase = cs.id; lz.abortAt = sim.s.t; sim._lzsRadio();
  if (lz.caseId === cs.id || cs.initialDispatchSent.includes('RV')) throw new Error('LZS se po přerušení letu nevrátila / RV dál chybí');
  const hav = (a, b, c, d) => Math.hypot((a - c) * 111, (b - d) * 73);
  // vůz vracející se na základnu jede k nové výzvě rovnou
  const k = sim.s.crews.find(x => x.type === 'RZP' && sim.avail(x));
  const cs2 = sim._spawn(); cs2.status = 'waiting'; sim.s.cases.push(cs2);
  const far = ZOS_DATA.stations.find(st => hav(st.lat, st.lon, k.home.lat, k.home.lon) > 25);
  k.lat = far.lat; k.lon = far.lon; k.state = 'free'; sim._go(k, k.home.lat, k.home.lon, 'RET'); k.until = k.mv.t1;
  sim.step(120); const p1 = sim.pos(k);
  sim.assign(cs2.id, k.id); const p2 = sim.pos(k); sim.step(6); const p3 = sim.pos(k);
  if (k.turn > 20) throw new Error('vůz na cestě má zbytečně dlouhý výjezd');
  if (hav(p1.lat, p1.lon, p2.lat, p2.lon) > 0.01 || hav(p2.lat, p2.lon, p3.lat, p3.lon) < 0.01) throw new Error('vůz po přesměrování zastavil');
  console.log('LZS místo RV / počasí / přesměrování za jízdy true');
}
// koroner: nejdřív zjištění, pak se rozsvítí a dispečer ho vyšle (fiktivně, bez omezení počtu)
{
  const sim = new Sim({ seed: 221, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  const mk = () => { const c = sim._spawn(); c.status = 'active'; c.exitus = true; c.arrived = true; c.coroner = { state: 'pending', answerAt: sim.s.t }; sim.s.cases.push(c); return c; };
  const a = mk(), b = mk();
  if (sim.sendAgency(a.id, 'cor').ok) throw new Error('koronera nejde vyslat před zjištěním');
  sim._isDay = () => true; const rnd = sim.rnd; sim.rnd = () => 0.1; sim._deathCaseStep(a); sim._deathCaseStep(b); sim.rnd = rnd;
  if (a.coroner.state !== 'available' || a.status === 'closed') throw new Error('dostupný koroner nesmí případ hned uzavřít');
  if (!sim.sendAgency(a.id, 'cor').ok || !sim.sendAgency(b.id, 'cor').ok) throw new Error('koroner na více případů');
  sim._deathCaseStep(a);
  if (a.status !== 'closed' || a.coroner.state !== 'sent') throw new Error('po vyslání koronera se případ neuzavřel');
  console.log('koroner: zjištění → dostupný → vyslání → uzavření true');
}

// ---- 0.21: FR, ZZUM příznak, návrat v režimu N3, odpřažení LIBERO, RV čeká, zapomenuté vyslání lékaře
{
  const sim = new Sim({ seed: 303, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  const mkCase = (n) => { const c = sim._spawn(); c.status = 'waiting'; c.n = n; c.typ = 'primární'; sim.s.cases.push(c); return c; };
  // FR: vyslání nejbližšího, dojezd, datová zpráva o převzetí TANR
  const c = mkCase(1);
  const sug = sim.frSuggest(c.id, 3);
  if (!sug.length || sug[0].eta > sug[1].eta + 1e-6 && sug[0].pref > sug[1].pref) throw new Error('FR návrh není seřazený');
  const r = sim.sendFr(c.id);
  if (!r.ok || !c.frs || c.frs[0].state !== 'enroute') throw new Error('FR se nevyslal');
  if (sim.frSuggest(c.id, 80).some(x => x.frId === c.frs[0].id)) throw new Error('vyslaný FR se nesmí nabízet znovu');
  for (let i = 0; i < 400 && c.frs[0].state !== 'onscene'; i++) sim.step(10);
  if (c.frs[0].state !== 'onscene') throw new Error('FR nedojel');
  if (!c.radioReports.some(x => /TANR od svědků/.test(x.text))) throw new Error('chybí datová zpráva o převzetí TANR');
  JSON.parse(JSON.stringify(sim.s));
  // režim N3 při návrat: majáky + rychlejší než standard
  const k = sim.s.crews.find(x => x.type === 'RZP' && x.state === 'base');
  const home = { lat: k.lat, lon: k.lon };
  const free = { lat: home.lat + 0.12, lon: home.lon + 0.12 };
  k.lat = free.lat; k.lon = free.lon; k.state = 'free';
  const slow = sim._goHome(k); if (sim.isLights(k)) throw new Error('standardní návrat nesmí mít majáky');
  const fast = (k.retN3 = true, sim._goHome(k));
  if (!(fast < slow * 0.95) || !k.mv || k.mv.mode !== 'RETL') throw new Error('návrat v režimu N3 není rychlejší');
  k.state = 'free'; if (!sim.isLights(k)) throw new Error('majáky se nezobrazují');
  k.state = 'base'; k.mv = null;
  // ZZUM příznak
  const z = sim.s.crews.find(x => x.type === 'RZP' && x.zzum);
  const c2 = mkCase(2); c2.rvNeed = true; c2.crews.push(z.id); z.caseId = c2.id;
  if (!sim.setZzumFlag(c2.id, true).ok || c2.rvNeed) throw new Error('ZZUM příznak nezrušil povinný lékař');
  const c1 = mkCase(1); c1.crews.push(z.id);
  if (sim.setZzumFlag(c1.id, true).ok) throw new Error('ZZUM příznak nesmí jít u N1');
  const nz = sim.s.crews.find(x => x.type === 'RZP' && !x.zzum && x.state === 'base'); const c3 = mkCase(2); c3.crews.push(nz.id); nz.caseId = c3.id;
  if (sim.setZzumFlag(c3.id, true).ok) throw new Error('ZZUM příznak jen u ZZUM stanovišť');
  // odpřažení LIBERO od posádky na základně
  sim._isDay = () => true;
  const lib = sim.s.crews.find(x => x.libero); lib.state = 'base'; lib.liberoPresent = true;
  const rz = sim.s.crews.find(x => x.type === 'RZP' && x.st === lib.st && x.state === 'base');
  if (rz && sim.attachLibero(rz.id, lib.id).ok) {
    if (!sim.removeLibero(rz.id).ok || rz.rlp || lib.state !== 'base') throw new Error('LIBERO se neodpřáhlo');
  }
  console.log('FR, ZZUM příznak, návrat v režimu N3, odpřažení LIBERO true');
}
// datovky: nejdřív „nabírá se“, složky přiřazené rovnou, vyžadované složky u výzev bez datovky, věkový filtr
{
  const sim = new Sim({ seed: 733, mode: 'free', startHour: 10, muEnabled: false });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  let withDz = 0, autoAg = 0, need = null;
  for (let i = 0; i < 1500; i++) {
    const c = sim._spawn();
    const U = c.up.toUpperCase();
    if (c.age < 12 && /ALKOHOL|DROGY/.test(U)) throw new Error('alkohol/drogy u dítěte do 12 let: ' + c.up);
    if (c.age < 5 && /AGRES/.test(U)) throw new Error('agresivní dítě do 5 let: ' + c.up);
    const rr = c.radioReports || [];
    if (rr.length) {
      withDz++;
      if (rr[0].id !== 'dz-in' || !/^nabírá se: /.test(rr[0].text)) throw new Error('první datovka musí být „nabírá se“');
      if (rr[0].at >= c.readyAt || c.readyAt - c.createdAt < 250 || c.readyAt - c.createdAt > 450 || c.dzUntil - c.createdAt < 180 || c.dzUntil - c.createdAt > 300) throw new Error('datovka má trvat 3–5 min a nabírání dalších 70–150 s');
      if (c.agencies && Object.values(c.agencies).some(a => a.auto)) autoAg++;
    } else if (c.agNeed && !need) need = c;
  }
  if (!withDz || !autoAg) throw new Error('chybí případy s datovkou nebo automaticky přiřazenou složkou');
  if (!need) throw new Error('chybí výzva s příznakem PČR/HZS bez datovky');
  // dokud se případ nabírá, složku nevyžadujeme; po převzetí výzvy ano
  if (need.agencies) throw new Error('složka se nesmí vyžadovat během nabírání');
  need.readyAt = sim.s.t; sim.s.cases.push(need); sim._caseStep(need);
  const k = need.agNeed === null && Object.keys(need.agencies || {})[0];
  if (!k || need.agencies[k].state !== 'requested' || !need.agencies[k].fromCall) throw new Error('výzva s příznakem má vyžadovat složku');
  if (sim._agencyHold(need)) throw new Error('vyžadovaná složka nesmí zdržet posádku');
  sim.s.t += 400; sim._agencyStep(need);
  if (!need.agencies[k].penal) throw new Error('nepřiřazená složka se má po 6 min trestat');
  console.log('datovky: nabírá se → výzva za 3–5 min, složky, věkový filtr true');
}
// vrstva pokrytí: dojezd nejbližší volné RZP po silnicích (živě podle dostupnosti vozů)
{
  const sim = new Sim({ seed: 91, mode: 'free', startHour: 10, muEnabled: false });
  const cb = ZOS_DATA.towns.find(t => t.n === 'České Budějovice');
  const near = sim.coverageSecs([[cb.lat, cb.lon]])[0];
  if (!(near > 0 && near < 15 * 60)) throw new Error('pokrytí: v ČB má být dojezd pod 15 min, je ' + near);
  for (const c of sim.s.crews) if (c.type === 'RZP') { c.state = 'off'; }
  if (sim.coverageSecs([[cb.lat, cb.lon]])[0] !== Infinity) throw new Error('pokrytí: bez volných RZP má být nekonečno');
  console.log('vrstva pokrytí: dojezd z volných RZP true');
}
// kalkulátor časové úspory LZS: občanský úsvit/soumrak, vzorce H1/1 a H1/2, hodnocení po směně
{
  const { civilTwilight } = require('../src/engine.js');
  const tw = civilTwilight('2026-11-15', 48.944468, 14.445144);
  if (Math.abs(tw.dawn - 6.6) > 0.05 || Math.abs(tw.dusk - 16.93) > 0.05) throw new Error('občanský svit nesedí s kalkulátorem: ' + tw.dawn + ' / ' + tw.dusk);
  const sim = new Sim({ seed: 17, mode: 'free', startHour: 10, muEnabled: false, date: '2026-11-15' });
  sim.s.ev.nextSpawn = sim.s.ev.nextSecond = 999999; sim.s.ev.nextMU = null;
  if (!sim._isLzsDay()) throw new Error('v 10 h má být pro LZS den');
  sim.s.startHour = 2; if (sim._isLzsDay()) throw new Error('ve 2 h má být pro LZS noc');
  sim.s.startHour = 10;
  const c = sim._spawn({ ind: 'trauma', n: 1, where: 'ulice' });
  c.status = 'waiting'; sim.s.cases.push(c);
  const adv = sim.lzsAdvice(c.id);
  if (!adv || adv.mode !== 'h11' || adv.rows.length !== 4) throw new Error('lzsAdvice: čekám H1/1 a 4 nemocnice');
  for (const r of adv.rows) {
    if (r.saving !== r.groundMin - (r.lzsMin + r.delayMin)) throw new Error('úspora musí být pozemně − (LZS + zpoždění)');
    if (r.level !== (r.saving >= 15 ? 'ano' : r.saving >= 10 ? 'mozna' : 'ne')) throw new Error('prahy indikace letu 15 / 10 min');
  }
  const delays = Object.fromEntries(adv.rows.map(r => [r.id, r.delayMin]));
  if (delays['h-cb'] !== 8 || delays['h-jh'] !== 3 || delays['h-pi'] !== 6 || delays['h-ta'] !== 6) throw new Error('zpoždění nemocnic z kalkulátoru');
  // H1/2: čas LZS nesmí být kratší než zbývající ošetření a vzlet je v noci delší
  const day12 = sim._lzsRows(c, 'h12', 30), dayTakeoff = adv.takeoffMin;
  if (day12.some(r => r.lzsMin < 30)) throw new Error('H1/2: LZS nejdřív po ošetření');
  sim.s.startHour = 2; const nightAdv = sim.lzsAdvice(c.id); sim.s.startHour = 10;
  if (!(nightAdv.takeoffMin === 10 && dayTakeoff === 3)) throw new Error('vzlet 3 min ve dne, 10 min v noci');
  // hodnocení po směně
  const rzp = sim.suggest(c.id, 'RZP')[0]; sim.assign(c.id, rzp.crewId);
  c.arrived = true; c.wxAtCall = 'clear'; c.nOrig = 1; c.lzsActive = false;
  sim._lzsEval(c);
  if (!c.lzsEval || !['zapomenute', null].includes(c.lzsEval.kind)) throw new Error('lzsEval: neočekávaný druh');
  if (!sim.summary().lzs) throw new Error('summary má obsahovat LZS hodnocení');
  console.log('kalkulátor LZS: svit, H1/1 a H1/2, prahy, zpoždění, hodnocení true');
}

// ---------- počasí, relace, rychlost, auto rádio ----------
{
  const WXM = require('../src/weather.js');
  // pravidla LZS: den/noc minima, vítr 25–35 kt konzultace, nad 35 kt neletovo
  const base = { temp: 10, wind: 8, gust: 12, dir: 270, vis: 10000, base: 3000, precip: 0, snow: 0, code: 3, fog: false, thunder: false, shower: false, ice: false, cloudLow: 40 };
  const st = (o, night) => WXM.lzs(Object.assign({}, base, o), night).status;
  if (st({}, false) !== 'clear') throw new Error('LZS: dobré počasí má být letové');
  if (st({ wind: 28 }, false) !== 'consult') throw new Error('LZS: vítr 28 kt = konzultace');
  if (st({ wind: 38 }, false) !== 'neletovo') throw new Error('LZS: vítr nad 35 kt = neletovo');
  if (st({ vis: 1200 }, false) !== 'neletovo' || st({ vis: 2500 }, true) !== 'neletovo') throw new Error('LZS: minima viditelnosti den 1500 / noc 3000');
  if (st({ base: 250 }, false) !== 'neletovo' || st({ base: 1000 }, true) !== 'neletovo') throw new Error('LZS: minima základny den 300 / noc 1200 ft');
  if (st({ ice: true }, false) !== 'neletovo' || st({ thunder: true }, false) !== 'neletovo') throw new Error('LZS: námraza a bouřka = neletovo');
  if (st({ vis: 2000 }, false) !== 'consult') throw new Error('LZS: těsně nad minimy = konzultace');
  if (!(WXM.travelMul(Object.assign({}, base, { ice: true }), 'N2') > WXM.travelMul(Object.assign({}, base, { precip: 1 }), 'N2'))) throw new Error('náledí zpomaluje víc než déšť');
  if (!(WXM.travelMul(Object.assign({}, base, { ice: true }), 'N1') < WXM.travelMul(Object.assign({}, base, { ice: true }), 'N4'))) throw new Error('N1 ztrácí méně než N4');
  if (WXM.caseMul(Object.assign({}, base, { ice: true }), 'dn_lehke') <= 1 || WXM.caseMul(Object.assign({}, base, { temp: 33 }), 'porucha') <= 1) throw new Error('náledí a horko zvyšují váhy případů');
  // simulace: deterministická, 72 h
  const a = WXM.simulate('2026-01-10', 5), b = WXM.simulate('2026-01-10', 5);
  if (a.length !== 72 || JSON.stringify(a) !== JSON.stringify(b)) throw new Error('simulace počasí musí být deterministická (72 h)');
  if (!(a.every(h => Number.isFinite(h.temp) && h.vis > 0 && h.base > 0))) throw new Error('simulované počasí má neplatné hodnoty');
  // engine s počasím: horní lišta, status, rychlost
  const sim = new Sim({ seed: 11, mode: 'shift', startHour: 9, date: '2026-01-10', weather: { src: 'sim', hours: a } });
  sim.step(600);
  const o = sim.wxObs();
  if (!o || !['clear', 'consult', 'neletovo'].includes(sim._lzsWeatherStatus())) throw new Error('engine: počasí nebo stav LZS');
  if (sim.dateInfo().label.split(' ')[0] !== 'so') throw new Error('10. 1. 2026 je sobota: ' + sim.dateInfo().label);
  JSON.parse(sim.serialize());
  // rychlost: stojící 0, jedoucí > 0
  const k = sim.s.crews.find(x => x.type === 'RZP' && x.state === 'base'); if (!k || sim.speedKmh(k) !== 0) throw new Error('stojící posádka 0 km/h');
  // relace při vyslání vracející se posádky
  const sm = new Sim({ seed: 3, mode: 'shift', startHour: 9, radio: 'interactive' });
  sm.s.ev.nextSpawn = 1e9;
  const c1 = sm._spawn({ ind: 'trauma', n: 3, where: 'ulice', intake: 0 }); c1.status = 'waiting';
  const rz = sm.s.crews.find(x => x.type === 'RZP' && x.state === 'base');
  rz.state = 'free'; rz.lat = rz.home.lat + 0.1; rz.lon = rz.home.lon; sm._go(rz, rz.home.lat, rz.home.lon, 'RET');
  if (!sm.assign(c1.id, rz.id).ok) throw new Error('assign relace');
  if (!rz.relayHold) throw new Error('vracející se posádka čeká na relaci');
  sm.step(60); if (rz.state !== 'call') throw new Error('bez relace posádka nevyjíždí');
  const e = sm.s.radioQ.find(x => x.kind === 'dispatch' && x.crewId === rz.id); if (!e) throw new Error('relace čeká na tlačítko Volat posádku');
  const nlog = sm.s.log.length; sm.radioZosCall(e.id);
  if (rz.relayHold) throw new Error('po relaci se posádka uvolní');
  if (sm.s.log.slice(nlog).filter(x => x.kind === 'crew').length < 5) throw new Error('relace má 5 řádků');
  sm.step(200); if (rz.state !== 'enroute') throw new Error('po relaci posádka vyjede');
  // auto režim: přepis relace se uloží pro panel Rádio
  const sa = new Sim({ seed: 3, mode: 'shift', startHour: 9, radio: 'auto' });
  sa.s.ev.nextSpawn = 1e9;
  const c2 = sa._spawn({ ind: 'trauma', n: 3, where: 'ulice', intake: 0 }); c2.status = 'waiting';
  const r2 = sa.s.crews.find(x => x.type === 'RZP' && x.state === 'base');
  r2.state = 'free'; r2.lat = r2.home.lat + 0.1; r2.lon = r2.home.lon; sa._go(r2, r2.home.lat, r2.home.lon, 'RET');
  sa.assign(c2.id, r2.id);
  if (!(sa.s.autoRadio && sa.s.autoRadio.length && sa.s.autoRadio[0].lines.length === 5)) throw new Error('auto rádio: přepis relace pro panel');
  console.log('počasí, relace při vyslání, rychlost, auto rádio true');
}

// ---------- výslovnost a rozpoznání rádiových hlášek (hlídá i rozbité regulární výrazy) ----------
{
  const vm = require('vm'), fs = require('fs');
  const ctx = { window: {}, performance: { now: () => 0 }, setTimeout, clearTimeout, console, navigator: {}, localStorage: { getItem() { return null; } } };
  vm.runInNewContext(fs.readFileSync(__dirname + '/../src/voice.js', 'utf8') + ';this.V=ZOS_VOICE;', ctx);
  const sp = t => ctx.V.speakable(t);
  if (!/Prachaťice/.test(sp('Nemocnice Prachatice'))) throw new Error('výslovnost: Prachatice → Prachaťice');
  if (!/Prachaťic\b/.test(sp('do Prachatic'))) throw new Error('výslovnost: Prachatic → Prachaťic');
  if (!/úrgentní/i.test(sp('Urgentní příjem'))) throw new Error('výslovnost: urgentní');
  if (!/ááro/.test(sp('jedeme na ARO'))) throw new Error('výslovnost: ARO → ááro');
  for (const f of ['src/ui.js', 'src/voice.js', 'src/messages.js', 'src/engine.js', 'src/weather.js']) {
    const s = fs.readFileSync(__dirname + '/../' + f, 'utf8');
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) throw new Error('řídicí znak ve zdroji (rozbitý regulární výraz): ' + f);
  }
  const ui = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8');
  const parse = new Function(ui.match(/function radioParse\(txt\) \{[\s\S]*?\n\}/)[0] + ';return radioParse;')();
  const exp = [['ZCB101, zde ZCB713, příjem.', 'crew'], ['ZCB713 na příjmu.', 'crew'], ['ZCB713, zde ZCB101, příjem.', 'zos'], ['ZCB713, ZCB101: poprosím ukončete se.', 'zos'],
    ['ZCB713: jsme ukončení, můžete posílat.', 'crew'], ['ZCB101 díky, konec.', 'zos'], ['ZCB101: rozumím.', 'zos'], ['ZCB101, zde ZOS Vysočina, příjem.', 'crew'], ['ZOS Vysočina: žádáme o RZP.', 'crew']];
  for (const [t, who] of exp) { const r = parse(t); if (!r || r.who !== who) throw new Error('radioParse: ' + t + ' → ' + JSON.stringify(r)); }
  if (parse('RZP1 (127): výzva k případu P1001') !== null) throw new Error('radioParse: ne každý log je rádio');
  console.log('výslovnost, rozpoznání rádiových hlášek, žádné řídicí znaky true');
}

// ---------- CO, DN podle příznaků, změna naléhavosti po upřesnění, tvar relace ZOS ----------
{
  const EX = require('../src/messages.js');
  const mk = seed => { const s = new Sim({ seed, mode: 'shift', startHour: 9, radio: 'interactive' }); s.s.ev.nextSpawn = 1e9; return s; };
  // CO: případ dostane příznak Oxid uhelnatý a víc osob
  const s1 = mk(21), co = s1._spawn({ ind: 'intox', where: 'byt', extKinds: ['co'], intake: 0 });
  if (!/oxid uhelnat/i.test(co.up) || co.patientCount < 2 || co.patientCount > 4) throw new Error('CO: příznak Oxid uhelnatý a 2–4 osoby: ' + co.up + ' / ' + co.patientCount);
  if (!/CO/.test(co.radioReports[0].text)) throw new Error('CO: datovka');
  // DN: chodec sražený vozidlem, + HZS → první datovka od HZS a text o chodci
  const s2 = mk(22), dn = s2._spawn({ ind: 'dn_lehke', where: 'silnice', extKinds: ['dn'], symptoms: ['Dospělý', '´Chodec', '´Osobní automobil', '´Sražení vozidlem nad 35km/h', '+ HZS'], intake: 0 });
  const dr = dn.radioReports.filter(r => r.id !== 'dz-in');
  if (!dr.length || !/chod(ec|c)/i.test(dr[0].text)) throw new Error('DN: datovka má odpovídat příznaku Chodec: ' + (dr[0] && dr[0].text));
  if (!/KOPIS|HZS/.test(dr[0].source)) throw new Error('DN: příznak + HZS → první datovka od HZS: ' + dr[0].source);
  // pracovní úraz N3: někdy přijde upřesnění s amputací (upgrade)
  let up = 0; for (let i = 1; i <= 60; i++) { let k = i * 7919 + 13; const rr = () => { k = (k * 16807) % 2147483647; return k / 2147483647; }; const items = EX.KINDS.pracUraz({ r: rr, sym: '', addr: 'Test 1', n: 3, patientCount: 1 }); if (items.some(x => x.upgrade && x.upgrade.n === 2)) up++; }
  if (!up) throw new Error('pracovní úraz N3: očekávám upřesnění s amputací');
  // změna naléhavosti: N3 → N2, doplní se RV, posádka dostane relaci
  const s3 = mk(23), c3 = s3._spawn({ ind: 'trauma', n: 3, where: 'prov', intake: 0 }); c3.status = 'waiting';
  const rz = s3.suggest(c3.id, 'RZP')[0]; s3.assign(c3.id, rz.crewId); s3.step(300);
  const before = s3.s.log.length; s3._upgradeCase(c3, { n: 2, symptom: '´Amputace prstů' });
  if (c3.n !== 2 || !c3.up.includes('Amputace prstů') || !c3.initialDispatchRequired.includes('RV')) throw new Error('upgrade: N2, příznak a požadavek RV');
  if (!s3.s.radioQ.some(e => e.kind === 'zos' && /naléhavost na N2/.test(e.msg))) throw new Error('upgrade: posádka má dostat relaci o změně naléhavosti');
  // tvar relace ZOS: 5 řádků, první „zde ZCB101, příjem“
  const s4 = mk(24), k4 = s4.s.crews.find(x => x.type === 'RZP'), n4 = s4.s.log.length; s4._zosSay(k4, null, 'test', 'ok');
  const lines = s4.s.log.slice(n4).filter(x => x.kind === 'crew').map(x => x.txt);
  if (lines.length !== 5 || !/zde ZCB101, příjem/.test(lines[0]) || !/díky, konec/.test(lines[4])) throw new Error('relace ZOS má mít 5 řádků: ' + JSON.stringify(lines));
  console.log('CO, DN podle příznaků, změna naléhavosti po upřesnění, tvar relace true');
}

// ---------- mezikrajská spolupráce ----------
{
  const mk = (seed, radio) => { const s = new Sim({ seed, mode: 'shift', startHour: 9, radio: radio || 'interactive' }); s.s.ev.nextSpawn = 1e9; s.s.ev.nbPlan = []; return s; };
  // naše žádost o pozemní posádku: odemčeno až při dojezdu nad 20 min / žádná volná; odpověď po 60–180 s
  let accepted = null, declined = 0;
  for (let seed = 1; seed <= 40 && !accepted; seed++) {
    const sim = mk(seed), cs = sim._spawn({ ind: 'trauma', n: 3, where: 'ulice', intake: 0, at: { lat: 49.261, lon: 13.904, addr: 'Test 1, Strakonice', town: 'Strakonice' } }); cs.status = 'waiting';
    const nbc = sim.crewOf('nb-pl-sus');
    const early = sim.requestNeighbor(cs.id, nbc.id);
    if (early.ok) throw new Error('pomoc z jiného kraje nesmí jít, když je vlastní volná RZP do 20 min');
    for (const k of sim.s.crews) if (!k.ext && k.type === 'RZP') k.state = 'off';
    const r = sim.requestNeighbor(cs.id, nbc.id);
    if (!r.ok) throw new Error('žádost o cizí posádku: ' + r.msg);
    if (sim.requestNeighbor(cs.id, nbc.id).ok) throw new Error('duplicitní žádost');
    sim.step(200);
    if (nbc.nbAsk && nbc.nbAsk.state === 'accepted') accepted = { sim, cs, nbc }; else declined++;
  }
  if (!accepted) throw new Error('žádost: za 40 seedů žádný souhlas');
  { const { sim, cs, nbc } = accepted;
    if (nbc.state !== 'base' || nbc.supportRequestedFor !== cs.id) throw new Error('po souhlasu čeká cizí posádka na vyslání');
    if (!sim.suggest(cs.id, 'RZP').some(x => x.crewId === nbc.id)) throw new Error('souhlasící cizí posádka je v nabídce');
    if (!sim.assign(cs.id, nbc.id).ok) throw new Error('vyslání cizí posádky');
    const other = sim._spawn({ ind: 'trauma', n: 3, where: 'ulice', intake: 0 }); other.status = 'waiting';
    if (sim.suggest(other.id, 'RZP').some(x => x.crewId === nbc.id)) throw new Error('cizí posádka nesmí být v nabídce k jinému případu');
  }
  // žádost souseda o naši posádku: hovor, nabídka, body, vysláno pryč; bez odpovědi −1
  { const sim = mk(5, 'auto'); sim._nbSpawn('ground');
    const rq = sim.s.nbq[0], e = sim.s.radioQ.find(x => x.kind === 'nbreq');
    if (!rq || !e || !e.opts.some(o => o.act === 'nb-send') || !e.opts.some(o => o.act === 'nb-decline') || !e.sign) throw new Error('žádost souseda: hovor s nabídkou');
    const pts = sim.s.agg.opsPoints, send = e.opts.find(o => o.act === 'nb-send');
    sim.radioAnswer(e.id); sim.radioReply(e.id, send.k);
    const k = sim.crewOf(send.crewId);
    if (k.state !== 'second' || !k.nbMission || rq.state !== 'accepted') throw new Error('vyhovění: posádka pryč na pomoc');
    if (sim.s.agg.opsPoints === pts) throw new Error('vyhovění se hodnotí');
    sim.step(k.nbMission.until - sim.s.t + 10); if (k.state === 'second') throw new Error('posádka se po pomoci vrací');
  }
  { const sim = mk(6, 'auto'); sim._nbSpawn('ground'); const pts = sim.s.agg.opsPoints; sim.step(400);
    if (sim.s.nbq[0].state !== 'timeout' || sim.s.agg.opsPoints !== pts - 1) throw new Error('bez odpovědi: −1 b. a zrušeno'); }
  { const sim = mk(7, 'auto'); sim._nbSpawn('lzs'); const rq = sim.s.nbq[0];
    if (rq) { const e = sim.s.radioQ.find(x => x.kind === 'nbreq'); sim.radioAnswer(e.id); sim.radioReply(e.id, e.opts.find(o => o.act === 'nb-send').k);
      if (sim.crewOf('lzs').state !== 'second') throw new Error('Planá po souhlasu pryč'); if (sim.avail(sim.crewOf('lzs'))) throw new Error('Planá pryč není dostupná'); } }
  // naše žádost o LZS jinde: sloučená žádost a vyslání
  { let ok = false;
    for (let seed = 1; seed <= 30 && !ok; seed++) {
      const sim = mk(seed), cs = sim._spawn({ ind: 'trauma', n: 1, where: 'ulice', intake: 0 }); cs.status = 'waiting';
      sim.crewOf('lzs').state = 'off'; sim.crewOf('lzs').fixed = false;
      const r = sim.requestNeighbor(cs.id, 'lzs-praha'); if (!r.ok) continue;
      sim.step(200);
      const k = sim.crewOf('lzs-praha');
      if (k.nbAsk && k.nbAsk.state === 'accepted') { if (k.caseId !== cs.id) throw new Error('souhlas LZS = rovnou vysláno'); ok = true; }
    }
    if (!ok) throw new Error('žádost o LZS: žádný souhlas'); }
  console.log('mezikrajská spolupráce: žádosti, odpovědi, žádosti sousedů, Planá true');
}

// ---------- model jízdy: pevná část stojí u cíle, pořadí režimů, zpoždění výjezdu ----------
{
  const sim = new Sim({ seed: 31, mode: 'shift', startHour: 9, radio: 'auto' }); sim.s.ev.nextSpawn = 1e9; sim.s.ev.nbPlan = [];
  const c = sim.s.crews.find(x => x.type === 'RZP' && x.id.startsWith('jh'));
  const dest = { lat: c.lat + 0.12, lon: c.lon + 0.1 };
  const avg = mode => { let m = 0, n = 0; for (let i = 0; i < 40; i++) { sim._go(c, dest.lat, dest.lon, mode); m += c.mv.t1 - c.mv.dw - c.mv.t0; n++; } return m / n; };
  const m1 = avg('N1'), m2 = avg('N2'), m3 = avg('N3');
  if (!(m1 < m2 && m2 < m3)) throw new Error(`jízdní doba N1 < N2 < N3 (${m1.toFixed(0)}, ${m2.toFixed(0)}, ${m3.toFixed(0)})`);
  sim._go(c, dest.lat, dest.lon, 'N2');
  const mv = c.mv, t0 = sim.s.t;
  if (!(mv.dw > 60)) throw new Error('N2 má mít pevnou část u cíle');
  const pe = sim.pos(c, mv.t1 - mv.dw + 2), d = require('../src/engine.js').hav(pe.lat, pe.lon, dest.lat, dest.lon);
  if (d > 0.05) throw new Error('po jízdní části je vozidlo u cíle: ' + d.toFixed(2) + ' km');
  sim.s.t = mv.t1 - mv.dw / 2; if (sim.speedKmh(c) !== 0) throw new Error('při hledání adresy vozidlo stojí (0 km/h)');
  sim.s.t = t0 + (mv.t1 - mv.dw - t0) / 2; if (sim.speedKmh(c) < 40) throw new Error('za jízdy je rychlost nad 40 km/h: ' + sim.speedKmh(c));
  sim.s.t = t0;
  // zpoždění výjezdu: RZP 55–260 s, lékař (RV) delší
  let sr = 0, sv = 0, rv = sim.s.crews.find(x => x.type === 'RV' && x.state !== 'off') || sim.s.crews.find(x => x.type === 'RV'); rv.state = 'base'; c.state = 'base';
  for (let i = 0; i < 300; i++) { sr += sim._turnout(c, 2); sv += sim._turnout(rv, 2); }
  if (!(sr / 300 > 100 && sr / 300 < 170 && sv / 300 > sr / 300)) throw new Error(`zpoždění výjezdu: RZP ${(sr / 300).toFixed(0)} s, RV ${(sv / 300).toFixed(0)} s`);
  console.log('model jízdy: pevná část u cíle, pořadí režimů, zpoždění výjezdu true');
}

// ---------- otrava CO: hlášení posádky o více postižených není dopravní nehoda ----------
{
  const sim = new Sim({ seed: 41, mode: 'shift', startHour: 9, radio: 'auto' }); sim.s.ev.nextSpawn = 1e9; sim.s.ev.nbPlan = [];
  const cs = sim._spawn({ ind: 'intox', where: 'rd', extKinds: ['co'], intake: 0 }); cs.status = 'waiting';
  const k = sim.suggest(cs.id, 'RZP')[0]; sim.assign(cs.id, k.crewId);
  const n0 = sim.s.log.length;
  for (let i = 0; i < 200 && !cs.methane; i++) sim.step(10);
  if (!cs.methane) throw new Error('CO: posádka má po příjezdu hlásit více postižených');
  const lines = sim.s.log.slice(n0).map(x => x.txt).join(' | ');
  if (/METHANE|dopravní nehoda/.test(lines.slice(lines.indexOf('otravu CO')))) throw new Error('hlášení CO nesmí být dopravní nehoda: ' + lines.slice(0, 200));
  if (!/otravu CO/.test(lines)) throw new Error('hlášení má říkat otrava CO: ' + lines.slice(0, 200));
  console.log('otrava CO: hlášení více postižených true');
}

// ---------- CO se nemíchá s jinými indikacemi, dítě s CO není N3, CO jen v budově, METHANE jen u MU ----------
{
  let withCo = 0, childCo = 0;
  for (let seed = 1; seed <= 25; seed++) {
    const sim = new Sim({ seed, mode: 'shift', startHour: 9, radio: 'auto' }); sim.s.ev.nextSpawn = 1e9; sim.s.ev.nbPlan = [];
    for (let i = 0; i < 80; i++) {
      const c = sim._spawn({});
      const hasCo = /oxid uhelnat/i.test(c.up) || (c.radioReports || []).some(r => /otravu CO/.test(r.text));
      if (!hasCo) continue;
      withCo++;
      if (c.ind !== 'intox') throw new Error('CO se nesmí míchat s indikací ' + c.ind + ': ' + c.up);
      if (!['byt', 'rd', 'prov', 'domov', 'skola'].includes(c.where)) throw new Error('CO jen v budově, ne ' + c.where);
      if (/dítě/i.test(c.up)) { childCo++; if (c.n > 2 || c.dyn) throw new Error('dítě s CO nesmí být N3 ani dynamická: N' + c.n + ' ' + c.up); }
      for (const r of c.radioReports || []) if (/METHANE/.test(r.text)) throw new Error('METHANE jen u MU: ' + r.text);
    }
  }
  if (withCo < 3) throw new Error('v náhodných případech chybí CO (' + withCo + ')');
  console.log('CO jen u Intoxikace, dítě s CO max N2, CO v budově, METHANE jen u MU true', withCo, 'případů CO,', childCo, 'dětí');
}
