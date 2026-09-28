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
let saved=JSON.stringify({edits:{'25,20,25':'snow'},player:{x:47.5,y:6.7,z:35.5,sel:8},campus:[{name:'MaCEk',x:47.5,y:5,z:29.5,patrolIndex:2},{name:'Mr Unicorn 🦄',x:46.5,y:5,z:14.5,patrolIndex:3},{name:'Cookie Monster',x:32.5,y:5,z:-11.5,patrolIndex:4}]}),reloaded=false;
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
assert.equal(a.eiler.name,'Mr. Eiler');assert.equal(a.campusActors.length,10);assert.equal(a.campusActors[9].name,'Cookie Man');assert.equal(a.campusActors[7].name,'Mr. B');
assert.equal(a.campusActors[9].patrolIndex,4,'the old custodian name restores his saved patrol progress');
assert.equal(a.canonicalCampusName('Cookie Monster'),'Cookie Man');
assert.equal(a.canonicalCampusName('MaCEk'),'Mr. Macek');
assert.equal(a.canonicalCampusName('Mr Unicorn 🦄'),'Mr. B');
let backup=JSON.parse(a.worldBackupText());
backup.state.campus[1].name='MaCEk';backup.state.campus[7].name='Mr Unicorn 🦄';backup.state.campus[9].name='Cookie Monster';
const restored=a.readWorldBackup(JSON.stringify(backup));
assert.equal(restored.campus[1].name,'Mr. Macek');assert.equal(restored.campus[7].name,'Mr. B');
assert.equal(restored.campus.length,10);assert.equal(restored.campus[9].name,'Cookie Man');assert.equal(a.getBlock(25,20,25),'snow');
// NPC and player use the exact same cached face, shirt and sleeves, including the collar details.
assert.equal(a.macek.head.material[4].map,a.playerAvatar.head.material[4].map);
assert.equal(a.macek.head.geometry.parameters.width,a.playerAvatar.head.geometry.parameters.width);
assert.equal(a.macek.head.material[4].map.colorSpace,Three.SRGBColorSpace);
for(const arm of Object.values(a.viewArms))assert.equal(arm.userData.hand.material[4].map,a.skinTex,'first-person hands keep skin when outfits change');
for(const slot of a.hotbar.children)assert.equal(slot.children.length,2,'textured block thumbnail survives separate quantity updates');
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
// Dogs follow the campus Mr. Macek. A distant or flying player does not take them away.
a.macek.pos.set(25.5,5,-20.5);a.macek.group.rotation.y=Math.PI;a.macek.yaw=Math.PI;
a.player.pos.set(110,36,70);a.player.yaw=0;a.player.flying=true;
const before=a.ellie.pos.clone();a.updateCompanions(.05);
assert(a.ellie.pos.distanceTo(before)<0.4,'one frame walks toward Mr. Macek instead of snapping there');
let maxStep=0;const samples=[[a.ellie,a.ellie.pos.x,a.ellie.pos.y,a.ellie.pos.z],[a.percy,a.percy.pos.x,a.percy.pos.y,a.percy.pos.z]];
for(let i=0;i<900;i++){
 a.updateCompanions(.05);
 for(const s of samples){maxStep=Math.max(maxStep,Math.hypot(s[0].pos.x-s[1],s[0].pos.y-s[2],s[0].pos.z-s[3]));s[1]=s[0].pos.x;s[2]=s[0].pos.y;s[3]=s[0].pos.z;}
}
assert(maxStep<1.2,'the trail stays on walked steps');
for(const dog of [a.ellie,a.percy]){
 assert(dog.invulnerable);
 assert(Math.hypot(dog.pos.x-a.macek.pos.x,dog.pos.z-a.macek.pos.z)<5,dog.name+' reaches the distant Mr. Macek');
 assert(Math.hypot(dog.pos.x-a.player.pos.x,dog.pos.z-a.player.pos.z)>40,dog.name+' ignores the player');
 assert.equal(a.walkFeet(Math.floor(dog.pos.x),Math.floor(dog.pos.z),dog.pos.y),dog.pos.y);
}
assert(Math.hypot(a.ellie.pos.x-a.percy.pos.x,a.ellie.pos.z-a.percy.pos.z)>1,'Ellie and Percy keep different trailing offsets');
assert(Math.hypot(a.companionAnchor.x-a.macek.pos.x,a.companionAnchor.z-a.macek.pos.z)<.01);
a.player.pos.set(70,35,50);
for(let i=0;i<80;i++)a.updateCompanions(.05);
assert(Math.abs(a.companionAnchor.y-a.macek.pos.y)<.01,'a flying player does not lift the anchor');
for(const dog of [a.ellie,a.percy])assert(dog.pos.y<8,'dogs stay on Mr. Macek\'s floor while the player is in the air');
a.macek.pos.set(47.5,11,16.5);a.macek.group.rotation.y=0;
for(let i=0;i<1200;i++)a.updateCompanions(.05);
for(const dog of [a.ellie,a.percy]){
 assert(Math.abs(dog.pos.y-a.macek.pos.y)<2,dog.name+' climbs to Mr. Macek');
 assert(Math.hypot(dog.pos.x-a.macek.pos.x,dog.pos.z-a.macek.pos.z)<6);
 assert.equal(a.getBlock(Math.floor(dog.pos.x),Math.round(dog.pos.y),Math.floor(dog.pos.z)),undefined);
}
console.log('PASS: old-name save migration, ten NPCs, shared portrait face and outfit details, one-arm inward laptop, entrance-only patrol and seated transitions, protected dogs that follow the Mr. Macek NPC.');
