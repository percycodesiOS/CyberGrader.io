// Run: node game/tests/mynecraft.test.mjs
// Uses the exact Three.js version pinned by the game; no browser or real saves are touched.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
const html=await fs.readFile(new URL('../mynecraft.html',import.meta.url),'utf8');
const threeURL=JSON.parse(html.match(/<script type="importmap">\s*([\s\S]*?)<\/script>/)[1]).imports.three;
const cache=path.join(os.tmpdir(),'mynecraft-three-0.160.0.mjs');
try{await fs.access(cache);}catch{const res=await fetch(threeURL);assert(res.ok);await fs.writeFile(cache,await res.text());}
const Three=await import(pathToFileURL(cache));
const events={};
class Element{
 constructor(){this.style={};this.children=[];this.dataset={};this.events={};this.classList={add(){},remove(){}};this.textContent='';}
 appendChild(e){this.children.push(e);} append(...es){this.children.push(...es);}
 addEventListener(k,f){(this.events[k]??=[]).push(f);} setAttribute(k,v){this[k]=v;}
 getContext(){return new Proxy({measureText:t=>({width:t.length*15})},{get:(o,k)=>o[k]??(()=>{})});}
}
const elements=Object.fromEntries(['start','enter','mode','modeHelp','status','info'].map(k=>[k,new Element()]));
const document={body:new Element(),createElement:()=>new Element(),getElementById:id=>elements[id]??=new Element(),addEventListener(k,f){(events[k]??=[]).push(f);},exitPointerLock(){}};
class Renderer{constructor(){this.domElement=new Element();this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}
let saved=JSON.stringify({edits:{'25,20,25':'snow'},player:{x:1,y:18,z:12,sel:8}}),reloaded=false;
const context=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer,TextureLoader:class {load(){return new Three.Texture();}}},document,window:{},navigator:{maxTouchPoints:0},innerWidth:1280,innerHeight:800,devicePixelRatio:1,
 performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame(){},console,
 addEventListener(k,f){(events[k]??=[]).push(f);},localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v,removeItem:()=>{saved=null;}},location:{reload(){reloaded=true;}},confirm:()=>true});
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace("import * as THREE from 'three';",'');
const instrumented=script+`\n globalThis.api={WORLD,instMeshes,buildMeshes,player,camera,npcs,animals,hotbar,resetBtn,modeSelect,startGame,doPlace,doBreak,castVoxel,persistSave,tick,isSolid,isExposed,
 get time(){return dayTime;},get health(){return health;},get mode(){return gameMode;},get inventory(){return inventory;},get selected(){return selected;},
 select(i){selected=i;},pause(){started=false;},modeTo(v){gameMode=v;},get keys(){return BLOCK_KEYS;},getBlock,setBlock,campusActors,sirD,macek,kay,ellie,percy,walkingPath,campusBounds,insideBounds,updateCampus,entranceDoors,moveHorizontal,canStandAt,
 setTime(t){dayTime=t;}};`;
vm.runInContext(instrumented,context);
const a=context.api;
assert.equal(a.getBlock(25,20,25),'snow','legacy edits survive');
assert.equal(a.selected,8,'selection survives');
assert(a.getBlock(64,0,64),'larger world reaches edge');
assert.equal(a.getBlock(0,0,0),'water');assert.equal(a.isSolid(0,0,0),false);
assert.equal(a.getBlock(34,16,-19),'snow','white school roof');assert.equal(a.getBlock(46,6,23),undefined,'school entrance open');
assert.equal(a.getBlock(25,16,-28),'snow','expanded north-west wing');
assert.equal(a.getBlock(41,16,18),'glass','wider glass gallery');
const terrainTriangles=Object.values(a.instMeshes).reduce((n,m)=>n+m.count*m.geometry.index.count/3,0);
assert(terrainTriangles<150000,'exposed-face renderer keeps enlarged world below 150k terrain triangles');
// An isolated block must keep every outward-facing quad after the mesh rewrite.
a.setBlock(80,30,80,'blue');a.buildMeshes();
const planes=[];
for(const mesh of Object.values(a.instMeshes))if(mesh.userData.blockKey==='blue')for(let i=0;i<mesh.count;i++){
 const matrix=new Three.Matrix4();mesh.getMatrixAt(i,matrix);const pos=new Three.Vector3().setFromMatrixPosition(matrix);
 if(pos.x>=80&&pos.x<=81&&pos.y>=30&&pos.y<=31&&pos.z>=80&&pos.z<=81){
  const normal=new Three.Vector3(0,0,1).transformDirection(matrix);
  assert(normal.dot(pos.clone().sub(new Three.Vector3(80.5,30.5,80.5)))>.49,'face points outward');planes.push(pos);
 }
}
assert.equal(planes.length,6,'all six isolated faces remain visible');a.setBlock(80,30,80,null);
assert.equal(a.hotbar.children.length,14);
const event={preventDefault(){}};
a.startGame();
// Aim at a high isolated stone target; place and break every material through the actual raycast.
for(const [i,k] of a.keys.entries()){
 a.player.pos.set(20.5,20.5,20.5);a.camera.position.copy(a.player.pos);a.camera.quaternion.identity();
 a.setBlock(20,20,16,'stone');a.setBlock(20,20,17,null);a.select(i);
 assert.equal(a.castVoxel().z,16);
 a.doPlace();assert.equal(a.getBlock(20,20,17),k,`${k} places`);
 a.doBreak();assert.equal(a.getBlock(20,20,17),undefined,`${k} breaks`);
}
// The touch/click slots select snow, glowstone, glass and water, not just keys 1-9.
for(let i=8;i<14;i++){a.hotbar.children[i].events.click[0]();assert.equal(a.selected,i);}
a.modeTo('survival');a.select(8);a.doPlace();assert.equal(a.getBlock(20,20,17),undefined,'no free survival blocks');
a.setBlock(20,20,17,'snow');a.doBreak();assert.equal(a.inventory.snow,1);a.doPlace();assert.equal(a.inventory.snow,0);assert.equal(a.getBlock(20,20,17),'snow');
for(const f of events.keydown) f({...event,code:'KeyF'});assert.equal(a.player.flying,false,'no flight in survival');
a.modeTo('creative');for(const f of events.keydown)f({...event,code:'KeyF'});assert.equal(a.player.flying,true);
const positions=a.npcs.map(n=>n.pos.clone());
for(let i=0;i<200;i++)for(const n of a.npcs)n.update(.05,a.player.pos);
assert(a.npcs.some((n,i)=>n.pos.distanceTo(positions[i])>.1),'NPCs walk');
const animalPositions=a.animals.map(n=>n.pos.clone());
for(let i=0;i<200;i++)for(const n of a.animals)n.update(.05);
assert(a.animals.some((n,i)=>n.pos.distanceTo(animalPositions[i])>.1),'animals walk');
// The upper floor is reachable on foot from outside, through the main entrance and stairs.
const stairs=a.walkingPath({x:46.5,y:5,z:26.5},{x:47,y:11,z:16},a.campusBounds);
assert(stairs.length>0,'route through main door to upper floor');assert(stairs.some(p=>p.y===11),'second-floor route');
assert(a.walkingPath({x:47.5,y:11,z:16.5},{x:45,y:5,z:26},a.campusBounds).length>0,'route down stairs');
// Grounded players step up the real staircase without having to fly.
a.player.pos.set(41.5,6.7001,2.7);a.player.onGround=true;a.player.flying=false;a.moveHorizontal('z',.2);
assert(a.player.pos.y>7.6,'player can climb first stair');
a.setTime(.2);
let highestSirD=0;
for(let i=0;i<500;i++){a.updateCampus(.2);highestSirD=Math.max(highestSirD,a.sirD.pos.y);for(const actor of [a.sirD,a.kay])assert(a.insideBounds(actor.pos.x,actor.pos.z,a.campusBounds),'campus boundary');}
assert(highestSirD>=10.9,'Sir D patrols upstairs');
for(let i=0;i<420;i++){a.setTime(.43+i*.2/1200);a.updateCampus(.2);}
assert(a.sirD.pos.distanceTo(a.macek.pos)<3.1,'sunset rendezvous');
assert(Math.abs(a.sirD.pos.z-26.5)<1,'meeting at entrance');
assert(a.ellie.pos.distanceTo(a.macek.pos)<4,'Ellie follows MaCEk');
assert(a.percy.pos.distanceTo(a.macek.pos)<4,'Percy follows MaCEk');
assert(a.kay.pos.distanceTo(a.sirD.pos)<4,'KaY follows Sir D');
assert.equal(a.campusActors.map(n=>n.name).join(','),'Sir D,MaCEk,KaY,Ellie,Percy');
a.player.pos.set(46.5,6.7,24);a.updateCampus(.2);assert(Math.abs(a.entranceDoors[0].rotation.y)>.1,'main doors open nearby');
a.setTime(.12);
let before=a.time;a.tick(50);assert(Math.abs(a.time-before-.05/1200)<1e-9,'20 minute cycle');
a.pause();before=a.time;const pos=a.player.pos.clone();a.tick(100);assert.equal(a.time,before);assert.equal(a.player.pos.distanceTo(pos),0,'paused movement');
a.player.pos.set(46.5,32.25,31.5);a.player.yaw=.42;a.player.pitch=-.2;a.player.flying=true;a.select(8);
a.persistSave();assert.equal(JSON.parse(saved).edits['25,20,25'],'snow');
const resumeContext=vm.createContext({...context,api:undefined});vm.runInContext(instrumented,resumeContext);
assert.equal(resumeContext.api.player.pos.y,32.25);assert.equal(resumeContext.api.player.pos.x,46.5);assert.equal(resumeContext.api.player.pos.z,31.5);
assert.equal(resumeContext.api.player.yaw,.42);assert.equal(resumeContext.api.player.pitch,-.2);assert.equal(resumeContext.api.player.flying,true);assert.equal(resumeContext.api.selected,8);

a.resetBtn.events.click[0]();assert(reloaded);assert.equal(saved,null);a.persistSave();assert.equal(saved,null,'exit handler cannot resurrect reset world');
console.log('PASS: legacy saves, 14 block placements, hotbar, survival inventory/flight, NPCs, animals, lake, school entrance, 20-minute clock, pause, exact save/resume position and flight, reset, two-floor navigation, stairs, campus boundaries, sunset meeting, companion following and doors.');
