const R=require('path').resolve(__dirname,'..','..')+'/';
global.ZOS_DATA=require(R+'src/data.js');global.ZOS_PEOPLE=require(R+'src/people.js');global.ZOS_SYMPTOMS=require(R+'src/symptoms.json');global.ROUTER=require(R+'src/router.js');
const fs=require('fs');{const b=fs.readFileSync(R+'site/graph.wasm');ROUTER.init(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));}
global.ZOS_POI=JSON.parse(fs.readFileSync(R+'site/poi.json','utf8'));global.ZOS_RAIL=JSON.parse(fs.readFileSync(R+'site/rail.json','utf8'));global.ZOS_ADDR=JSON.parse(fs.readFileSync(R+'site/addr.json','utf8'));
const {Sim}=require(R+'src/engine.js');
function bot(sim){ const s=sim.s; for(const c of s.cases){ if(c.status==='waiting'){ if(c.mu||c.exitus) continue;
  const r=sim.suggest(c.id,'RZP')[0]; if(r) sim.assign(c.id,r.crewId);
  if(c.rvNeed){ const v=sim.suggest(c.id,'RV')[0]; if(v) sim.assign(c.id,v.crewId); } }
  if(c.status==='active'&&c.rvReq&&!c.rvReq.cancelled&&!c.rvReq.satT&&!c.docAssigned){ const v=sim.suggest(c.id,'RV')[0]; if(v) sim.assign(c.id,v.crewId); } } }
const seg={call:[],enroute:[],onscene:[],transport:[],handover:[]}; const segN={};
const nShifts=Number(process.argv[2]||4);
for(let k=0;k<nShifts;k++){ const sim=new Sim({seed:300+k,mode:'shift',startHour:k%2?19:7}); sim.s.dayOfYear=k<2?15:196;
  const prev={}; 
  while(!sim.s.ended){ sim.step(10); bot(sim);
    for(const c of sim.s.crews){ if(c.type!=='RZP'||c.ext) continue; const p=prev[c.id]; if(p&&p.state!==c.state&&seg[p.state]&&p.caseId){ const cs=sim.caseOf(p.caseId); const d=(sim.s.t-p.t)/60; const key=p.state+(cs?('|N'+cs.n):''); (segN[key]=segN[key]||[]).push(d); seg[p.state].push(d);} if(!p||p.state!==c.state) prev[c.id]={state:c.state,t:sim.s.t,caseId:c.caseId}; } }
}
const q=(a,p)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor((a.length-1)*p)]};
const f=a=>a.length?`n=${a.length} p10=${q(a,.1).toFixed(1)} p50=${q(a,.5).toFixed(1)} p90=${q(a,.9).toFixed(1)}`:'—';
for(const k of Object.keys(seg)) console.log(k.padEnd(10),f(seg[k]));
for(const n of ['N1','N2','N3']) console.log('onscene',n,f(segN['onscene|'+n]||[]),'| enroute',f(segN['enroute|'+n]||[]),'| call',f(segN['call|'+n]||[]));
