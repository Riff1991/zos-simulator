const R=require('path').resolve(__dirname,'..','..')+'/';
global.ZOS_DATA=require(R+'src/data.js');global.ZOS_PEOPLE=require(R+'src/people.js');global.ZOS_SYMPTOMS=require(R+'src/symptoms.json');global.ROUTER=require(R+'src/router.js');
const fs=require('fs');{const b=fs.readFileSync(R+'site/graph.wasm');ROUTER.init(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));}
global.ZOS_POI=JSON.parse(fs.readFileSync(R+'site/poi.json','utf8'));global.ZOS_RAIL=JSON.parse(fs.readFileSync(R+'site/rail.json','utf8'));global.ZOS_ADDR=JSON.parse(fs.readFileSync(R+'site/addr.json','utf8'));
const {Sim}=require(R+'src/engine.js');
const out=[];
for (const [season,doy] of [['zima',15],['léto',196]]) for (const sh of [7,19]) { let tot=0,n=0;
  for (let seed=1;seed<=6;seed++){ const sim=new Sim({seed:seed*7+sh,mode:'shift',startHour:sh}); sim.s.dayOfYear=doy;
    let c=0; const seen=new Set();
    // jen generátor: krokuj čas a počítej vzniklé případy (bez dispečera)
    for(let i=0;i<4320;i++){ sim.step(10); } // 12 h
    tot+=sim.s.cases.filter(x=>!x.mu&&x.typ==='primární').length; n++; }
  out.push(`${season} ${sh===7?'den 7–19':'noc 19–7'}: průměr ${ (tot/n).toFixed(0) } případů / 12 h`); }
console.log(out.join('\n'));
