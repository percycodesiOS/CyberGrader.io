// Run: node game/tests/character-review.test.mjs
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
let saved=JSON.stringify({edits:{'25,20,25':'snow'},player:{x:47.5,y:6.7,z:35.5,sel:8},campus:[{name:'MaCEk',x:47.5,y:5,z:29.5,patrolIndex:2},{name:'Mr Unicorn 🦄',x:46.5,y:5,z:14.5,patrolIndex:3}]}),reloaded=false;
const context=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer,TextureLoader:class {load(){return new Three.Texture();}}},document,window:{},navigator:{maxTouchPoints:0},innerWidth:1280,innerHeight:800,devicePixelRatio:2,
 performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame(){},console,URLSearchParams,
 addEventListener(k,f){(events[k]??=[]).push(f);},localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v,removeItem:()=>{saved=null;}},location:{reload(){reloaded=true;}},confirm:()=>true});
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace("import * as THREE from 'three';",'');
const instrumented=script+`\n globalThis.api={WORLD,instMeshes,buildMeshes,player,camera,npcs,animals,hotbar,resetBtn,modeSelect,startGame,doPlace,doBreak,castVoxel,persistSave,worldBackupText,readWorldBackup,restoreWorldBackup,tick,isSolid,isExposed,
 get time(){return dayTime;},get health(){return health;},get mode(){return gameMode;},get inventory(){return inventory;},get selected(){return selected;},
 select(i){selected=i;},pause(){started=false;},modeTo(v){modeSelect.value=v;for(const change of modeSelect.events.change)change();},get keys(){return BLOCK_KEYS;},getBlock,setBlock,campusActors,sirD,macek,kay,ellie,percy,walkingPath,campusBounds,insideBounds,updateCampus,entranceDoors,moveHorizontal,canStandAt,
 micco,campusAreas,believeBanner,floorLogo,campusDetails,cloudGroup,cloudMesh,clouds,updateClouds,spawnParticles,updateParticles,particles,shardMaterial,setMacekOutfit,patternedSleeve,updateBlockMeshes,faceSlots,faceDirections,faceVisible,travelTo,setGraphics,graphicsBtn,graphicsSelect,renderer,schoolLogo,CampusActor,createWalkingSearch,PATH_STEP_NODES,
 shields,unicorn,unicornPatrol,shieldsSeated,SHIELDS_CYCLE,SHIELDS_SIT,updateShields,schoolInteriorBounds,schoolFootprint,skinTex,
 eddie,eddieRoost,eddiePerch,eddieFacing,updateEddie,EDDIE_ROCK,EDDIE_ROOF,EDDIE_DUSK,EDDIE_DAWN,
 buses,updateBuses,busRouteDistance,busRoutePoint,busAtKerb,busStopDistances,BUS_ARRIVE,BUS_COUNT,BUS_STAGGER,BUS_DRIVE_IN,BUS_DWELL,BUS_DRIVE_OUT,BUS_VISIT,BUS_LOOP,busRouteLength,BUS_ROUTE,
 playerAvatar,viewArms,viewModel,macekBodies,macekClothes,outfitPolo,outfitBlack,identityStatus,worldClockEl,setView,refreshOutfitPreview,updatePlayerAvatar,viewSelect,viewBtn,groundSurface,inBusYard,
 bubble,showBubble,SHIELDS_LINES,heightAt,nearestWalkPoint,walkFeet,
 eiler,eilerPatrol,entranceStaffBounds,canonicalCampusName,updateCompanions,companionAnchor,saveState,worldBounds,get view(){return view;},get macekOutfit(){return macekOutfit;},
 setTime(t){dayTime=t;}};`;
vm.runInContext(instrumented,context);
const a=context.api;

// Legacy labels are migration aliases; saves and all visible identities use the new names.
assert.equal(a.macek.name,'Mr. Macek');assert.equal(a.macek.patrolIndex,2);
assert.equal(a.unicorn.name,'Mr. B');assert.equal(a.unicorn.patrolIndex,3);
assert.equal(a.eiler.name,'Mr. Eiler');assert.equal(a.campusActors.length,9);
assert.equal(a.canonicalCampusName('MaCEk'),'Mr. Macek');
assert.equal(a.canonicalCampusName('Mr Unicorn 🦄'),'Mr. B');
let backup=JSON.parse(a.worldBackupText());
backup.state.campus[1].name='MaCEk';backup.state.campus[7].name='Mr Unicorn 🦄';
const restored=a.readWorldBackup(JSON.stringify(backup));
assert.equal(restored.campus[1].name,'Mr. Macek');assert.equal(restored.campus[7].name,'Mr. B');
assert.equal(restored.campus.length,9);assert.equal(a.getBlock(25,20,25),'snow');
// NPC and player use the exact same cached face, shirt and sleeves, including the collar details.
assert.equal(a.macek.head.material[4].map,a.playerAvatar.head.material[4].map);
assert.equal(a.macek.head.geometry.parameters.width,a.playerAvatar.head.geometry.parameters.width);
assert.equal(a.macek.group.userData.portrait,'Gators lanyard');
for(const look of ['polo','black']){
 a.setMacekOutfit(look);
 for(const character of [a.macek,a.playerAvatar]){
  assert.equal(character.body.material[4].map,a.macekClothes[look]);
  assert.equal(character.armR.children[0].material[4].map,a.patternedSleeve);
  assert.equal(character.armL.children[0].material[4].map,look==='black'?a.patternedSleeve:a.skinTex);
  assert(character.poloCollars.every(c=>c.visible===(look==='polo')));
  assert(character.shoulderCaps.every(c=>c.material[4].map===a.macekClothes[look]));
 }
}
assert.equal(a.unicorn.laptop.rotation.y,Math.PI,'laptop screen is turned back toward wearer');
assert.equal(a.unicorn.laptop.userData.carryArm,'armL');
assert.equal(a.unicorn.armLockL,-1.32);assert.equal(a.unicorn.armLockR,undefined);
let freeArmMoved=false;
for(let i=0;i<120;i++){a.unicorn.patrol(.05,a.unicornPatrol);assert.equal(a.unicorn.armL.rotation.x,-1.32);freeArmMoved ||= Math.abs(a.unicorn.armR.rotation.x)>.1;}
assert(freeArmMoved,'free arm swings while carrying the laptop with one arm');
// Entrance staff can walk but can never plan a route beyond their compact entrance post.
let maxShieldsDistance=0,sawSeated=false,sawStanding=false;
for(let i=0;i<2600;i++){
 a.updateShields(.05,a.player.pos);a.eiler.patrol(.05,a.eilerPatrol);
 maxShieldsDistance=Math.max(maxShieldsDistance,Math.hypot(a.shields.pos.x-50.5,a.shields.pos.z-20.5));
 sawSeated ||= a.shields.poseBlend>.97;sawStanding ||= a.shields.poseBlend<.03;
 for(const actor of [a.shields,a.eiler]){
  assert(a.insideBounds(actor.pos.x,actor.pos.z,a.entranceStaffBounds),actor.name+' stays near entrance');
  assert(a.schoolFootprint(Math.floor(actor.pos.x),Math.floor(actor.pos.z)));
  assert.equal(a.walkFeet(Math.floor(actor.pos.x),Math.floor(actor.pos.z),actor.pos.y),5);
 }
}
assert(maxShieldsDistance>1.5,'Officer Shields actually takes a short walk');
assert(maxShieldsDistance<6,'patrol stays near the front desk');assert(sawSeated&&sawStanding);
// Dogs follow the player rather than the distant campus NPC. They wait safely when he flies.
a.macek.pos.set(25.5,5,-20.5);a.player.pos.set(47.5,6.7,35.5);a.player.yaw=0;
for(let i=0;i<1000;i++)a.updateCompanions(.05);
for(const dog of [a.ellie,a.percy]){
 assert(dog.invulnerable);assert(Math.hypot(dog.pos.x-a.player.pos.x,dog.pos.z-a.player.pos.z)<4);
 assert(dog.pos.distanceTo(a.macek.pos)>30,'dog follows player, not the roaming namesake');
 assert.equal(a.walkFeet(Math.floor(dog.pos.x),Math.floor(dog.pos.z),dog.pos.y),dog.pos.y);
}
const safeAnchor={...a.companionAnchor};a.player.pos.set(70,35,50);
for(let i=0;i<300;i++)a.updateCompanions(.05);
assert.equal(a.companionAnchor.x,safeAnchor.x);assert.equal(a.companionAnchor.y,safeAnchor.y);
for(const dog of [a.ellie,a.percy])assert(dog.pos.y<8,'dogs never rise toward flying player');
a.player.pos.set(46.5,6.7,30.5);for(let i=0;i<400;i++)a.updateCompanions(.05);
for(const dog of [a.ellie,a.percy])assert(Math.hypot(dog.pos.x-a.player.pos.x,dog.pos.z-a.player.pos.z)<4,'dogs resume following at landing');
console.log('PASS: old-name save migration, nine NPCs, shared portrait face and outfit details, one-arm inward laptop, entrance-only patrol and seated transitions, protected player-following dogs and safe flight waiting.');
