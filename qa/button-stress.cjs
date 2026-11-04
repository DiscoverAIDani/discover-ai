'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');
const start=html.indexOf('class DiscoverConversation {'),end=html.indexOf('\nconst engine=',start);
const Game=new Function(html.slice(start,end)+'\nreturn DiscoverConversation;')();
const roots=['🌱 Everyday life','✈️ Travel','📚 Learn something','🎨 Create something','🔧 Help me solve a problem',"💡 I'm not sure"];
const failures=[],empty=[],loops=[],labels=new Set(),stages=new Set();let edges=0,completed=0;
function walk(game,choices,trail,depth){
  if(depth<=0||game.s.done)return;
  for(const label of choices){
    const g=new Game();g.s=structuredClone(game.s);const route=[...trail,label];edges++;labels.add(label);
    try{
      if(typeof label!=='string'||!label.trim())throw Error('Blank or invalid button label');
      const r=g.process(label);if(!r?.response?.say)throw Error('Missing reply');
      if(!Number.isFinite(r.score)||r.score<0||r.score>100)throw Error('Invalid score');
      if(/undefined|\[object Object\]|\bNaN\b/.test(r.response.say))throw Error('Broken response: '+r.response.say);
      if(!Array.isArray(r.response.choices))throw Error('Invalid choices');
      stages.add(g.s.stage);
      if(g.s.done){completed++;if(g.process(label)!==null)throw Error('Accepted input after finish');continue;}
      if(!r.response.choices.length)empty.push({route,say:r.response.say});
      if(g.s.aiResponses.length>1&&g.s.aiResponses.at(-1)===g.s.aiResponses.at(-2))loops.push({route,say:r.response.say});
      walk(g,r.response.choices,route,depth-1);
    }catch(e){failures.push({route,error:e.message});}
  }
}
walk(new Game(),roots,[],6);
const rootEmpty=empty.length;
if(rootEmpty)failures.push({error:'Starting-button paths lost all suggestions before completion',count:rootEmpty});
// Smoke-test every literal quick-response label, including rare safety paths,
// from a fresh game and each category. Generated labels are covered by walk().
const literalLabels=new Set();
for(const array of html.matchAll(/choices:\s*\[([^\]\n]*)\]/g)){
  for(const token of array[1].matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)){
    literalLabels.add(new Function('return '+token[0])());
  }
}
walk(new Game(),[...literalLabels],[],1);
for(const root of roots){const g=new Game();g.process(root);walk(g,[...literalLabels],[root],1);}
// Capture every existing regression conversation, then exercise its offered buttons.
let regression=fs.readFileSync(path.join(__dirname,'game-stress.cjs'),'utf8');
const seeds=[];
regression=regression.replace('function check(name,steps,must,not,state){','function check(name,steps,must,not,state){ seeds.push(steps);');
vm.runInNewContext(regression,{require,__dirname,console:{log(){},error(){}},process:{},seeds});
for(const seed of seeds){const g=new Game();let r;for(const text of seed){r=g.process(text);if(g.s.done)break;}if(!g.s.done&&r)walk(g,r.response.choices,seed,2);}
const report={edges,literalLabels:literalLabels.size,uniqueLabels:labels.size,stages:[...stages],completed,rootEmpty,failures,empty,loops};
if(process.env.BUTTON_REPORT)fs.writeFileSync(process.env.BUTTON_REPORT,JSON.stringify(report,null,2));
console.log(JSON.stringify({edges,literalLabels:literalLabels.size,uniqueLabels:labels.size,stages:stages.size,completed,rootEmpty,failures:failures.length}));
for(const f of failures.slice(0,10))console.error(JSON.stringify(f));
if(failures.length)process.exitCode=1;
