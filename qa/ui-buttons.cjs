'use strict';
// Exercise the page's real callbacks with a minimal DOM. This does not emulate
// browser layout or native microphone permission dialogs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');
const ids=new Map();
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.listeners={};this.value='';this.disabled=false;this.textContent='';this.classList={add(){},remove(){}};}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  set innerHTML(v){for(const c of this.children)c.remove();this.children=[];this.markup=v;}get innerHTML(){return this.markup||'';}
  appendChild(c){c.parent=this;this.children.push(c);return c;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);if(this.id)ids.delete(this.id);for(const c of this.children)c.remove();}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]||null;}
  addEventListener(k,f){(this.listeners[k]||=[]).push(f);}
  querySelector(q){if(q==='button'){let b=this.children.find(x=>x.tagName==='button');if(!b&&this.innerHTML.includes('<button'))b=this.appendChild(new Element('button'));return b;}return null;}
  focus(){document.activeElement=this;}
  click(){if(this.disabled)return;const e={preventDefault(){},stopPropagation(){}};this.onclick?.(e);for(const f of this.listeners.click||[])f(e);}
}
for(const m of html.matchAll(/\bid="([^"]+)"/g)){const e=new Element();e.id=m[1];}
const document={getElementById:id=>ids.get(id)||null,createElement:tag=>new Element(tag)};
const errors=[],window={isSecureContext:true};
const context={document,window,navigator:{userAgent:'QA desktop',platform:'QA',vendor:'',maxTouchPoints:0},location:{protocol:'https:'},console:{log(){},error:e=>errors.push(String(e))},setTimeout:()=>0,clearTimeout(){}};
vm.runInNewContext(html.slice(html.indexOf('class DiscoverConversation {'),html.lastIndexOf('</script>')),context);
const api=window.__discoverGame,get=id=>ids.get(id);let checks=0;
function check(f){f();checks++;}
const roots=get('choices').children.map(x=>x.textContent);
for(const root of roots){
  api.resetUI();get('choices').children.find(x=>x.textContent===root).click();
  let count=0;
  while(!api.engine.s.done&&count++<6){const b=get('choices').children[0];assert(b,'No quick response on '+root);const prior=api.engine.s.userTurns.length;b.click();check(()=>assert.equal(api.engine.s.userTurns.length,prior+1));}
  check(()=>assert(api.engine.s.done));
  check(()=>assert.equal(get('choices').children[0].textContent,'🏆 See my results'));
  const before=api.engine.s.turns;get('send').click();check(()=>assert.equal(api.engine.s.turns,before));
  get('choices').children[0].click();check(()=>assert.equal(get('results').style.display,'block'));
  get('startNew').click();check(()=>{assert.equal(api.engine.s.score,0);assert.equal(api.engine.s.userTurns.length,0);assert.equal(get('choices').children.length,6);assert(!get('input').disabled);});
}
// Every example button must fill the box without sending, then submit normally.
for(const root of [null,...roots])for(let i=0;i<4;i++){
  api.resetUI();if(root)get('choices').children.find(x=>x.textContent===root).click();
  const before=api.engine.s.userTurns.length;get('hint').click();
  const wrap=get('examples');check(()=>assert.equal(wrap.children.length,4));
  wrap.children[i].querySelector('button').click();
  check(()=>{assert(get('input').value.trim());assert.equal(api.engine.s.userTurns.length,before);});
  get('send').click();check(()=>assert.equal(api.engine.s.userTurns.length,before+1));
  get('hint').click();check(()=>assert.equal(get('examples'),undefined));
}
check(()=>assert.equal(errors.length,0,errors.join('\n')));
console.log('Page button callback checks: '+checks+'/'+checks+' passed');
