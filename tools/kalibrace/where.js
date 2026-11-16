const R=require('path').resolve(__dirname,'..','..')+'/';
global.ZOS_DATA=require(R+'src/data.js');global.ZOS_PEOPLE=require(R+'src/people.js');global.ZOS_SYMPTOMS=require(R+'src/symptoms.json');global.ROUTER=require(R+'src/router.js');
const fs=require('fs');{const b=fs.readFileSync(R+'site/graph.wasm');ROUTER.init(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));}
global.ZOS_POI=JSON.parse(fs.readFileSync(R+'site/poi.json','utf8'));global.ZOS_RAIL=JSON.parse(fs.readFileSync(R+'site/rail.json','utf8'));global.ZOS_ADDR=JSON.parse(fs.readFileSync(R+'site/addr.json','utf8'));
const {Sim}=require(R+'src/engine.js');
const sim=new Sim({seed:5,mode:'free'}); sim.s.ev.nextSpawn=sim.s.ev.nextSecond=999999; sim.s.ev.nextMU=null;
const N=Number(process.argv[2]||4000); const wh={},ch={},nn={},age=[],trans=[],dyn=[]; let rv=0;
for(let i=0;i<N;i++){ const c=sim._spawn(); wh[c.where]=(wh[c.where]||0)+1; ch[c.charakter]=(ch[c.charakter]||0)+1; nn['N'+c.n]=(nn['N'+c.n]||0)+1; age.push(c.age); if(c.rvNeed) rv++; if(c.dyn) dyn.push(1); }
const pct=o=>Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,+(v/N*100).toFixed(1)]));
console.log('where %',JSON.stringify(pct(wh)));console.log('charakter %',JSON.stringify(pct(ch)));console.log('N %',JSON.stringify(pct(nn)));
age.sort((a,b)=>a-b);console.log('věk medián',age[N>>1],'p10',age[Math.floor(N*.1)],'p90',age[Math.floor(N*.9)],'děti(<18) %',(100*age.filter(a=>a<18).length/N).toFixed(1));
console.log('rvNeed %',(100*rv/N).toFixed(1),'dyn z N2 %',(100*dyn.length/(nn.N2||1)).toFixed(1));
// podle indikace
const by={}; 
const sim2=new Sim({seed:9,mode:'free'}); sim2.s.ev.nextSpawn=sim2.s.ev.nextSecond=999999; sim2.s.ev.nextMU=null;
for(let i=0;i<N;i++){ const c=sim2._spawn(); const b=by[c.ind]||(by[c.ind]={n:0,n2:0,dyn:0,n1:0}); b.n++; if(c.n===2)b.n2++; if(c.n===1)b.n1++; if(c.dyn)b.dyn++; }
const rows=Object.entries(by).sort((a,b)=>b[1].n2-a[1].n2).slice(0,12).map(([k,b])=>`${k}: ${(100*b.n/N).toFixed(1)}% událostí, N2 ${(100*b.n2/N).toFixed(1)}%, dyn z N2 ${(100*b.dyn/Math.max(1,b.n2)).toFixed(0)}%`);
console.log(rows.join('\n'));
const sx={Ž:0,M:0}; const sim3=new Sim({seed:3,mode:'free'}); sim3.s.ev.nextSpawn=sim3.s.ev.nextSecond=999999; sim3.s.ev.nextMU=null;
let a95=0; for(let i=0;i<N;i++){ const c=sim3._spawn(); sx[c.sex]++; if(c.age>=95)a95++; }
console.log('pohlaví Ž %',(100*sx['Ž']/N).toFixed(1),' věk ≥95 %',(100*a95/N).toFixed(2));
