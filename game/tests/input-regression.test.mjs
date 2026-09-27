// Run: node game/tests/input-regression.test.mjs
// Device class, pointer-lock gestures, and legacy Auto migration. One world boot.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';

const html=await fs.readFile(new URL('../mynecraft.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('../start-menu.css',import.meta.url),'utf8');
assert.match(html,/Press Esc to release the mouse/);
assert.match(html,/body\.touch-device #mouseHint \{ display: none/);
assert.doesNotMatch(css,/bottom:\s*max\(300px/);
assert.match(css,/#challengeProgress[\s\S]*top:\s*148px/);

const threeURL=JSON.parse(html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/)[1]).imports.three;
const cache=path.join(os.tmpdir(),'mynecraft-three-0.160.0.mjs');
try{await fs.access(cache);}catch{const res=await fetch(threeURL);assert(res.ok);await fs.writeFile(cache,await res.text());}
const Three=await import(pathToFileURL(cache));

const events={};
const locks=[];
const exits=[];
const lockWaiters=[];
const mediaListeners=[];
let now=10000;
const env={coarse:false,hover:true};
class Element{
 constructor(){this.style={};this.children=[];this.dataset={};this.events={};this.classList={add(){},remove(){}};this.textContent='';this.value='';this.getBoundingClientRect=()=>({left:0,top:0,width:132,height:132,right:132,bottom:132});}
 appendChild(e){this.children.push(e);} append(...es){this.children.push(...es);}
 addEventListener(k,f){(this.events[k]??=[]).push(f);} setAttribute(k,v){this[k]=v;}
 getContext(){return new Proxy({measureText:t=>({width:t.length*15})},{get:(o,k)=>o[k]??(()=>{})});}
 requestPointerLock(){const waiter={};const promise=new Promise(resolve=>{waiter.resolve=resolve;});locks.push(promise);lockWaiters.push(waiter);return promise;}
}
const elements=Object.fromEntries(['start','enter','mode','modeHelp','status','info','controlsLayout'].map(k=>[k,new Element()]));
const navigator={maxTouchPoints:0,platform:'Win32',userAgent:'Windows'};
const document={
 body:new Element(),pointerLockElement:null,hidden:false,
 createElement:()=>new Element(),getElementById:id=>elements[id]??=new Element(),
 addEventListener(k,f){(events[k]??=[]).push(f);},
 exitPointerLock(){exits.push(now);this.pointerLockElement=null;}
};
function queryMatches(query){
 return (query.includes('pointer: coarse')&&env.coarse)||(query.includes('hover: none')&&!env.hover)||(query.includes('pointer: fine')&&!env.coarse)||(query.includes('hover: hover')&&env.hover);
}
let saved=JSON.stringify({controls:'desktop',graphics:'detailed',mode:'creative',edits:{},player:{x:1,y:18,z:12,sel:0,flying:false,yaw:0,pitch:0}});
const context=vm.createContext({
 THREE:{...Three,WebGLRenderer:class{constructor(){this.domElement=new Element();this.shadowMap={};}setPixelRatio(v){this.pixelRatio=v;}setSize(){}render(){}},TextureLoader:class{load(){return new Three.Texture();}}},
 document,window:{matchMedia(query){return {matches:queryMatches(query),addEventListener(type,fn){if(type==='change')mediaListeners.push(fn);},removeEventListener(){}};}},
 navigator,innerWidth:1440,innerHeight:900,devicePixelRatio:2,
 performance:{now:()=>now},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame(){},console,URLSearchParams,
 addEventListener(k,f){(events[k]??=[]).push(f);},
 localStorage:{getItem:()=>saved,setItem:(k,v)=>{saved=v;},removeItem(){saved=null;}},
 location:{reload(){},href:'http://127.0.0.1/game/mynecraft.html'},history:{replaceState(){},state:null},confirm:()=>true
});
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace("import * as THREE from 'three';",'');
const instrumented=script+`\n globalThis.api={
 startGame,releaseInput,setControlsLayout,readWorldBackup,worldBackupText,environmentWantsTouch,touchLayoutOn,menuBtn,renderer,lookLayer,stick,btnJump,
 modeSelect,setGraphics,
 get lookActive(){return lookActive;},get started(){return started;},get inputEpoch(){return inputEpoch;},get controls(){return controlsLayout;},
 get movement(){return keys;},get graphics(){return graphics;},
 modeTo(v){modeSelect.value=v;for(const change of modeSelect.events.change||[])change();}
};`;
vm.runInContext(instrumented,context);
const a=context.api;
const mouse=()=>({type:'click',button:0,pointerType:'mouse'});
const touch=()=>({type:'click',button:0,pointerType:'touch',sourceCapabilities:{firesTouchEvents:true}});
function apply(next){
 Object.assign(env,next);
 navigator.maxTouchPoints=next.touch??navigator.maxTouchPoints;
 navigator.platform=next.platform??navigator.platform;
 navigator.userAgent=next.ua??navigator.userAgent;
 if(next.width)context.innerWidth=next.width;
 if(next.height)context.innerHeight=next.height;
 a.setControlsLayout('auto');
}
function stop(){if(a.started)for(const fn of events.keydown)fn({code:'Escape',preventDefault(){}});}
function locksAfter(fn){const before=locks.length;fn();return locks.length-before;}

const booted=JSON.parse(saved);
assert.equal(booted.controls,'auto','a saved Desktop choice is migrated to Auto');
assert.equal(booted.graphics,'detailed','graphics stays detailed through that migration');
assert.equal(a.graphics,'detailed');
assert.equal(a.renderer.shadowMap.enabled,true);
assert.equal(a.controls,'auto');
assert.equal(locks.length,0,'booting does not capture the mouse');
assert.equal(a.touchUI?.style.display??document.getElementById('touchUI').style.display,'none');

const desktop={coarse:false,hover:true,touch:0,platform:'Win32',ua:'Windows',width:390,height:844};
const phone={coarse:true,hover:false,touch:5,platform:'iPhone',ua:'iPhone',width:390,height:844};
const ipad={coarse:false,hover:true,touch:5,platform:'MacIntel',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',width:1024,height:768};
const laptop={coarse:false,hover:true,touch:10,platform:'Win32',ua:'Windows touch laptop',width:1440,height:900};

for(const mode of ['creative','survival']){
 a.modeTo(mode);
 apply(desktop);
 assert.equal(a.environmentWantsTouch(),false,`${mode} narrow window with a mouse stays desktop`);
 assert.equal(document.getElementById('touchUI').style.display,'none');
 stop();
 assert.equal(locksAfter(()=>a.startGame()),0,`${mode} startGame alone does not capture the mouse`);
 assert.equal(locksAfter(()=>elements.enter.events.click[0](mouse())),1,`${mode} Play click captures the mouse`);
 assert.equal(locksAfter(()=>a.renderer.domElement.events.click[0](mouse())),1,`${mode} canvas click captures the mouse`);
 now+=800;
 assert.equal(locksAfter(()=>a.renderer.domElement.events.click[0](touch())),0,`${mode} a touch click never captures the mouse`);

 apply(phone);
 assert.equal(a.environmentWantsTouch(),true);
 assert.equal(document.getElementById('touchUI').style.display,'block');
 assert.equal(locksAfter(()=>elements.enter.events.click[0](mouse())),0,`${mode} phone Play never captures the mouse`);
 assert.equal(locksAfter(()=>a.renderer.domElement.events.click[0](mouse())),0,`${mode} phone canvas never captures the mouse`);
 assert.equal(locksAfter(()=>a.lookLayer.events.touchstart[0]({changedTouches:[{identifier:4,clientX:20,clientY:20}],preventDefault(){}})),0,`${mode} phone look drag never captures the mouse`);

 apply(ipad);
 assert.equal(a.environmentWantsTouch(),true,`${mode} iPad desktop-mode Safari uses touch controls`);
 assert.equal(locksAfter(()=>elements.enter.events.click[0](mouse())),0,`${mode} iPad never captures the mouse`);
 assert.equal(locksAfter(()=>a.renderer.domElement.events.click[0](mouse())),0);

 apply(laptop);
 assert.equal(a.environmentWantsTouch(),false,`${mode} touch laptop keeps keyboard and mouse`);
 assert.equal(document.getElementById('touchUI').style.display,'none');
 stop();
 assert.equal(locksAfter(()=>elements.enter.events.click[0](mouse())),1,`${mode} touch laptop Play can capture the mouse`);
}

apply(desktop);
a.modeTo('creative');
stop();
elements.enter.events.click[0](mouse());
a.renderer.domElement.events.mousedown[0]({type:'mousedown',button:0,pointerType:'mouse'});
assert.equal(a.lookActive,true,'drag-look is the fallback while the cursor is free');
for(const fn of events.mouseup)fn();
assert.equal(a.lookActive,false);
apply(phone);
a.renderer.domElement.events.mousedown[0]({type:'mousedown',button:0,pointerType:'mouse'});
assert.equal(a.lookActive,false,'touch layout does not arm mouse drag-look');

apply(desktop);
a.startGame();
a.movement.KeyW=true;a.movement.Space=true;
document.pointerLockElement=a.renderer.domElement;
const exitsBeforeBlur=exits.length;
for(const fn of events.blur)fn();
assert.equal(a.movement.KeyW,false);
assert.equal(a.movement.Space,false);
assert.equal(a.lookActive,false,'blur clears mouse drag');
assert.equal(a.started,false,'blur pauses even before a pointerlockchange event');
assert(exits.length>exitsBeforeBlur,'blur releases pointer lock');
assert.equal(locks.length>0,true);
const locksAtBlur=locks.length;
for(const fn of events.pointerlockchange)fn();
assert.equal(locks.length,locksAtBlur,'losing the lock does not capture the mouse again');

a.startGame();
a.movement.KeyA=true;
a.renderer.domElement.events.mousedown[0]({type:'mousedown',button:0,pointerType:'mouse'});
document.hidden=true;
document.pointerLockElement=a.renderer.domElement;
const exitsBeforeHide=exits.length;
for(const fn of events.visibilitychange)fn();
assert.equal(a.movement.KeyA,false);
assert.equal(a.lookActive,false,'hiding the page clears mouse drag');
assert.equal(a.started,false,'hiding the page pauses even without a lock-loss event');
assert(exits.length>exitsBeforeHide,'hiding the page releases pointer lock');
document.hidden=false;

a.startGame();
a.movement.KeyD=true;
document.pointerLockElement=a.renderer.domElement;
const exitsBeforeDevice=exits.length;
apply(phone);
assert.equal(a.movement.KeyD,false,'a device change drops held keys');
assert(exits.length>exitsBeforeDevice,'a device change releases pointer lock');
assert.equal(document.getElementById('touchUI').style.display,'block');
a.movement.KeyW=true;
for(const fn of mediaListeners)fn();
assert.equal(a.movement.KeyW,false,'a media-query change drops held keys');

apply(desktop);
a.startGame();
a.lookLayer.events.touchstart[0]({changedTouches:[{identifier:9,clientX:30,clientY:40}],preventDefault(){}});
a.stick.events.touchstart[0]({changedTouches:[{identifier:3,clientX:10,clientY:10}],preventDefault(){}});
a.btnJump.events.touchstart[0]({preventDefault(){}});
assert.equal(a.movement.Space,true);
for(const fn of events.blur)fn();
assert.equal(a.movement.Space,false,'blur releases touch buttons');
assert.equal(a.movement.KeyW,false,'blur releases the stick');

apply(laptop);
stop();
const beforeLate=locks.length;
elements.enter.events.click[0](mouse());
assert.equal(locks.length,beforeLate+1);
for(const fn of events.keydown)fn({code:'Escape',preventDefault(){}});
assert.equal(a.started,false);
const exitsBeforeLate=exits.length;
lockWaiters.at(-1).resolve();
await locks.at(-1).then(()=>{},()=>{});
await Promise.resolve();
assert(exits.length>exitsBeforeLate,'a lock that arrives after pause is released immediately');
assert.equal(locks.length,beforeLate+1,'that late lock does not request another');

stop();
elements.enter.events.click[0](mouse());
for(const fn of events.keydown)fn({code:'Escape',preventDefault(){}});
document.pointerLockElement=a.renderer.domElement;
const exitsBeforeEvent=exits.length;
const locksBeforeEvent=locks.length;
for(const fn of events.pointerlockchange)fn();
assert(exits.length>exitsBeforeEvent,'a lock that lands after pause exits from pointerlockchange');
assert.equal(locks.length,locksBeforeEvent);
assert.equal(document.pointerLockElement,null);

// Losing focus can happen before the browser grants a requested lock. Older
// implementations return void, so there may be no Promise callback to reject
// that late lock. Pausing must not depend on an existing lock-loss event.
const originalRequestPointerLock=a.renderer.domElement.requestPointerLock;
for(const resultKind of ['promise','void'])for(const interruption of ['blur','hidden']){
 apply(desktop);stop();document.hidden=false;document.pointerLockElement=null;
 let requests=0;
 a.renderer.domElement.requestPointerLock=function(){
  requests++;
  if(resultKind==='promise')return originalRequestPointerLock.call(this);
 };
 elements.enter.events.click[0](mouse());
 a.renderer.domElement.events.mousedown[0]({type:'mousedown',button:0,pointerType:'mouse'});
 a.movement.KeyW=true;a.movement.Space=true;
 if(interruption==='hidden'){document.hidden=true;for(const fn of events.visibilitychange)fn();}
 else for(const fn of events.blur)fn();
 assert.equal(a.started,false,`${resultKind} pending lock: ${interruption} pauses without a held lock`);
 assert.equal(a.lookActive,false);
 assert.equal(a.movement.KeyW,false);assert.equal(a.movement.Space,false);
 document.hidden=false; // Returning to a visible page does not resume play.
 document.pointerLockElement=a.renderer.domElement;
 for(const fn of events.pointerlockchange)fn();
 if(resultKind==='promise'){
  lockWaiters.at(-1).resolve();await locks.at(-1);await Promise.resolve();
 }
 assert.equal(document.pointerLockElement,null,`${resultKind} late lock after ${interruption} is released`);
 assert.equal(a.started,false,'late completion never resumes the game');
 assert.equal(requests,1,'an interruption does not reacquire the mouse');
}
a.renderer.domElement.requestPointerLock=originalRequestPointerLock;

apply(desktop);
a.startGame();
a.movement.KeyS=true;
document.pointerLockElement=a.renderer.domElement;
a.menuBtn.events.click[0]();
assert.equal(a.started,false);
assert.equal(a.movement.KeyS,false,'Menu clears held keys');
assert.equal(document.pointerLockElement,null,'Menu releases pointer lock');

for(const mode of ['creative','survival']){
 const backup=JSON.parse(a.worldBackupText());
 backup.state.mode=mode;
 backup.state.graphics=mode==='creative'?'smooth':'detailed';
 backup.state.controls='touch';
 let loaded=a.readWorldBackup(JSON.stringify(backup));
 assert.equal(loaded.controls,'auto',`${mode} touch import becomes Auto`);
 assert.equal(loaded.graphics,backup.state.graphics,`${mode} graphics stays with the touch import`);
 backup.state.controls='desktop';
 loaded=a.readWorldBackup(JSON.stringify(backup));
 assert.equal(loaded.controls,'auto',`${mode} desktop import becomes Auto`);
 assert.equal(loaded.graphics,backup.state.graphics);
}
assert.equal(JSON.parse(saved).controls,'auto');
assert.equal(a.graphics,'detailed');

console.log('PASS: input regression (desktop, phone, iPad, touch laptop, legacy Auto migration, both modes).');
