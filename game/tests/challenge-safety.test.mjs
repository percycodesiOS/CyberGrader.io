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
vm.runInContext("globalThis.challengeAPI={challenge,updateChallenge,refreshChallenge}",context);
const c=context.challengeAPI;

// Exercise actual block actions; creative and invalid actions never earn progress.
a.startGame();
a.player.pos.set(20.5,20.5,20.5);a.camera.position.copy(a.player.pos);a.camera.quaternion.identity();
a.setBlock(20,20,16,'stone');a.setBlock(20,20,17,'wood');a.doBreak();
assert.equal(c.challenge.wood,0);
a.modeTo('survival');a.select(a.keys.indexOf('wood'));
a.doPlace();assert.equal(c.challenge.placed,0,'empty inventory does not count');
for(let i=0;i<12;i++){a.setBlock(20,20,17,'wood');a.doBreak();a.doPlace();a.setBlock(20,20,17,null);}
assert.equal(c.challenge.wood,10);assert.equal(c.challenge.placed,12);
a.player.pos.set(54,6.7,-11);a.player.onGround=true;c.updateChallenge();assert(c.challenge.circ);
assert.match(elements.challengeProgress.textContent,/Challenge complete/);
a.persistSave();const complete=JSON.parse(saved);
const checked=a.readWorldBackup(a.worldBackupText());assert(checked.challenge.circ);assert.equal(checked.challenge.placed,12);
const legacy=JSON.parse(a.worldBackupText());delete legacy.state.challenge;
assert.deepEqual(JSON.parse(JSON.stringify(a.readWorldBackup(JSON.stringify(legacy)).challenge)),{wood:0,placed:0,circ:false});
for(const invalid of [{wood:-1,placed:0,circ:false},{wood:1,placed:13,circ:false},{wood:10,placed:12,circ:'yes'}]){
 const bad=JSON.parse(a.worldBackupText());bad.state.challenge=invalid;assert.throws(()=>a.readWorldBackup(JSON.stringify(bad)),/invalid challenge/);
}
a.modeTo('creative');assert(elements.challengeProgress.hidden);assert(c.challenge.circ,'mode switch preserves progress');
// Regression: the old camera forced a .9m gap and ended up inside a nearby wall.
a.setView('third');a.player.pos.set(10.5,7.5,11.3001);a.player.yaw=Math.PI;a.player.pitch=0;
a.camera.position.copy(a.player.pos);a.camera.rotation.set(0,Math.PI,0,'YXZ');
for(let y=6;y<=9;y++)a.setBlock(10,y,10,'stone');
a.updatePlayerAvatar(1/60);
assert(!a.isSolid(Math.floor(a.camera.position.x),Math.floor(a.camera.position.y),Math.floor(a.camera.position.z)));
assert(a.camera.position.z>=11.16,'camera and near plane remain ahead of the wall');
assert(!a.playerAvatar.group.visible,'close camera does not look through avatar head');
a.player.pos.set(10.5,30,18);a.camera.position.copy(a.player.pos);a.updatePlayerAvatar(1/60);assert(a.playerAvatar.group.visible);
// Both safe cancellation and storage failure preserve the complete challenge save.
a.persistSave();const beforeReset=saved;context.confirm=()=>false;a.resetBtn.events.click[0]();assert.equal(saved,beforeReset);
context.confirm=()=>true;const remove=context.localStorage.removeItem;context.localStorage.removeItem=()=>{throw Error('unavailable');};
a.resetBtn.events.click[0]();assert.equal(saved,beforeReset);context.localStorage.removeItem=remove;
a.resetBtn.events.click[0]();assert.equal(saved,null);a.persistSave();assert.equal(saved,null,'unload does not undo reset');
console.log('PASS: real challenge actions, creative exclusion, persistent progress, legacy and malformed backups, third-person wall clearance, reset safety.');

// A landing-page mode choice is consumed once; reload/import then honors the save.
for(const chosen of ['creative','survival']){
 const other=chosen==='creative'?'survival':'creative';
 let modeSave=JSON.stringify({...complete,mode:other});
 const loc={href:'https://example.test/game?mode='+chosen+'&demo=1#play',search:'?mode='+chosen+'&demo=1',reload(){}};
 const history={state:null,replaceState(state,title,url){loc.href=url;loc.search=new URL(url).search;}};
 const modeContext=vm.createContext({...context,URL,history,location:loc,localStorage:{getItem:()=>modeSave,setItem:(k,v)=>modeSave=v}});
 vm.runInContext(instrumented,modeContext);
 assert.equal(modeContext.api.mode,chosen);assert.equal(loc.search,'?demo=1');assert(loc.href.endsWith('#play'));
 modeContext.api.modeTo(other);
 const reloadContext=vm.createContext({...context,URL,history,location:loc,localStorage:{getItem:()=>modeSave,setItem:(k,v)=>modeSave=v}});
 vm.runInContext(instrumented,reloadContext);assert.equal(reloadContext.api.mode,other,'refresh keeps selected mode');
 const backup=JSON.parse(reloadContext.api.worldBackupText());backup.state.mode=chosen;
 reloadContext.confirm=()=>false;const before=modeSave;const beforeURL=loc.href;
 assert.equal(reloadContext.api.restoreWorldBackup(JSON.stringify(backup)),false);assert.equal(modeSave,before);assert.equal(loc.href,beforeURL);
 reloadContext.confirm=()=>true;reloadContext.api.restoreWorldBackup(JSON.stringify(backup));
 const importContext=vm.createContext({...context,URL,history,location:loc,localStorage:{getItem:()=>modeSave,setItem:(k,v)=>modeSave=v}});
 vm.runInContext(instrumented,importContext);assert.equal(importContext.api.mode,chosen,'import reload keeps backup mode');
}
console.log('PASS: both landing modes, preserved query/hash, selected mode on refresh, canceled import and imported mode on reload.');
