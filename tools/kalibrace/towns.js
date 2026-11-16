const R=require('path').resolve(__dirname,'..','..')+'/';
global.ZOS_DATA=require(R+'src/data.js');global.ZOS_PEOPLE=require(R+'src/people.js');global.ZOS_SYMPTOMS=require(R+'src/symptoms.json');global.ROUTER=require(R+'src/router.js');
const fs=require('fs');{const b=fs.readFileSync(R+'site/graph.wasm');ROUTER.init(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));}
global.ZOS_POI=JSON.parse(fs.readFileSync(R+'site/poi.json','utf8'));global.ZOS_RAIL=JSON.parse(fs.readFileSync(R+'site/rail.json','utf8'));global.ZOS_ADDR=JSON.parse(fs.readFileSync(R+'site/addr.json','utf8'));
const {Sim}=require(R+'src/engine.js');
const sim=new Sim({seed:41,mode:'free'}); sim.s.ev.nextSpawn=sim.s.ev.nextSecond=999999; sim.s.ev.nextMU=null;
const N=Number(process.argv[2]||6000); const t={},ok={};
for(let i=0;i<N;i++){ const c=sim._spawn(); t[c.town]=(t[c.town]||0)+1; ok[c.okres||'?']=(ok[c.okres||'?']||0)+1; }
const top=Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,22).map(([k,v])=>`${k} ${(v/N*100).toFixed(1)}`);
console.log('OBCE (%):',top.join(' | ')); console.log('počet obcí',Object.keys(t).length);
console.log('OKRESY (%):',Object.entries(ok).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/N*100).toFixed(1)}`).join(' | '));
const top5=Object.values(t).sort((a,b)=>b-a); console.log('top5 %',(top5.slice(0,5).reduce((a,b)=>a+b,0)/N*100).toFixed(0),'top20 %',(top5.slice(0,20).reduce((a,b)=>a+b,0)/N*100).toFixed(0));
