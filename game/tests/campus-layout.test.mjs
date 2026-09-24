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
class Renderer{constructor(){this.domElement=new Element();this.shadowMap={};this.renderCount=0;}setPixelRatio(value){this.pixelRatio=value;}setSize(){}render(){this.renderCount++;}}
let saved=JSON.stringify({edits:{'25,20,25':'snow'},player:{x:1,y:18,z:12,sel:8}}),reloaded=false;
const context=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer,TextureLoader:class {load(){return new Three.Texture();}}},document,window:{},navigator:{maxTouchPoints:0},innerWidth:1280,innerHeight:800,devicePixelRatio:2,
 performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame(){},console,URLSearchParams,
 addEventListener(k,f){(events[k]??=[]).push(f);},localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v,removeItem:()=>{saved=null;}},location:{reload(){reloaded=true;}},confirm:()=>true});
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace("import * as THREE from 'three';",'');

const instrumented=script+`\n globalThis.api={WORLD,instMeshes,player,getBlock,setBlock,isSolid,schoolFootprint,CIRC_ROOM,SCHOOL_STAIRS,SCHOOL_RAMP,rampCells,FLAGPOLE,bollardPositions,bollards,americanFlag,schoolWayfinding,walkingPath,walkFeet,moveHorizontal,collideAxis,canStandAt,campusBounds,schoolInteriorBounds,circTables,cafeteriaTables,unicornPatrol,schoolLogo};`;
vm.runInContext(instrumented,context);
const a=context.api;
const entrance={x:46.5,y:5,z:26.5};
const route=(from,to,label,bounds=a.campusBounds)=>{
 const result=a.walkingPath(from,to,bounds);assert(result.length>0,label+' is reachable');
 for(const p of result){assert.equal(a.walkFeet(p.x,p.z,p.y),p.y,label+' has solid walkable floor');assert(a.canStandAt(new Three.Vector3(p.x+.5,p.y+1.7001,p.z+.5)),label+' has player-width headroom');}
 return result;
};
const walkPlayer=(from,steps,label)=>{
 a.player.pos.set(from.x,from.y+1.7001,from.z);a.player.onGround=true;a.player.flying=false;a.player.vel.set(0,0,0);
 for(const p of steps){
  const tx=p.x+.5,tz=p.z+.5;
  for(let frame=0;frame<100&&(Math.abs(a.player.pos.x-tx)>.001||Math.abs(a.player.pos.z-tz)>.001||Math.abs(a.player.pos.y-p.y-1.7001)>.02);frame++){
   a.moveHorizontal('x',Math.max(-.12,Math.min(.12,tx-a.player.pos.x)));
   a.moveHorizontal('z',Math.max(-.12,Math.min(.12,tz-a.player.pos.z)));
   a.collideAxis('y',-.15);
  }
  assert(Math.abs(a.player.pos.x-tx)<.01&&Math.abs(a.player.pos.z-tz)<.01,label+' walks cell '+p.x+','+p.z);
  assert(Math.abs(a.player.pos.y-p.y-1.7001)<.03,label+' reaches each elevation');
  assert(a.canStandAt(a.player.pos),label+' remains clear of blocks');
 }
};
const upper={x:47.5,y:11,z:16.5};
route(entrance,upper,'upper floor');route(upper,entrance,'ground floor');
route(entrance,{x:54,y:5,z:-11},'CIRC centre');
route(entrance,{x:46,y:5,z:-5},'cafeteria');
route(entrance,{x:25,y:5,z:-24},'ECES wing');
route(entrance,{x:57,y:5,z:-24},'ECMS wing');
route(entrance,{x:a.FLAGPOLE.x+2,y:5,z:a.FLAGPOLE.z},'flagpole approach');
route(entrance,{x:78,y:5,z:-10},'outdoor classroom');
// Each independent ascent must work with the other one disabled.
const stairs=[];
for(let x=a.SCHOOL_STAIRS.x0;x<=a.SCHOOL_STAIRS.x1;x++)for(let z=5;z<=10;z++)for(let y=5;y<=14;y++){
 stairs.push([x,y,z,a.getBlock(x,y,z)]);a.setBlock(x,y,z,null);
}
walkPlayer(entrance,route(entrance,upper,'curved rising walkway without the straight stairs'),'curved walkway');
for(const [x,y,z,v]of stairs)a.setBlock(x,y,z,v);
const ramps=[];
for(const {x,z}of a.rampCells)for(let y=5;y<=14;y++){ramps.push([x,y,z,a.getBlock(x,y,z)]);a.setBlock(x,y,z,null);}
walkPlayer(entrance,route(entrance,upper,'right staircase without the curved walkway'),'right stair');
for(const [x,y,z,v]of ramps)a.setBlock(x,y,z,v);
// Exercise the real player collision/auto-step at the bottom of the right stair.
a.player.pos.set(54.5,6.7001,11.35);a.player.onGround=true;a.player.flying=false;
a.moveHorizontal('z',-.2);assert(a.player.pos.y>7.6,'player steps onto the right staircase');assert(a.canStandAt(a.player.pos));
for(const {x,z}of a.bollardPositions){
 assert(a.isSolid(Math.floor(x),4,Math.floor(z)),'bollard rests on real pavement');
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)assert(!a.schoolFootprint(Math.floor(x+dx),Math.floor(z+dz)),'bollard plus one-cell clearance stays outside the school');
 assert(Math.abs(x-46.5)>3,'bollard leaves the main approach clear');
}
assert.equal(a.americanFlag.name,'American flag at the front approach');
assert(!a.schoolFootprint(a.FLAGPOLE.x,a.FLAGPOLE.z),'flagpole stays outdoors');
assert(a.schoolWayfinding.find(l=>l.name.startsWith('ECES')).position.x<a.schoolWayfinding.find(l=>l.name.startsWith('ECMS')).position.x,'ECES left and ECMS right from the front');
assert(a.schoolWayfinding.some(l=>l.name==='Kindergarten · Floor 2'&&l.position.y>11));
assert(a.schoolWayfinding.some(l=>l.name==='CIRC'&&l.position.y<10));
for(const [x,y,z] of a.unicornPatrol)assert.equal(a.walkFeet(x,z,y),y,`Mr B patrol ${x},${z} retains clear floor`);
for(let x=47;x<=54;x++)for(let z=17;z<=22;z++)assert(a.canStandAt(new Three.Vector3(x+.5,6.7001,z+.5)),`front lobby remains clear at ${x},${z}`);
const triangles=Object.values(a.instMeshes).reduce((n,m)=>n+m.count*m.geometry.index.count/3,0);assert(triangles<150000,'campus remains within terrain triangle budget');
console.log(`PASS campus layout: independent stairs and circular walkway, full collision clearance, CIRC/cafeteria/wings/flag/outdoor routes, exterior bollards, wayfinding, NPC stops. Terrain triangles: ${triangles}`);
