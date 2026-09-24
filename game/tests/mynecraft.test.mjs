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
const instrumented=script+`\n globalThis.api={WORLD,instMeshes,buildMeshes,player,camera,npcs,animals,hotbar,resetBtn,modeSelect,startGame,doPlace,doBreak,castVoxel,persistSave,worldBackupText,readWorldBackup,restoreWorldBackup,tick,isSolid,isExposed,
 get time(){return dayTime;},get health(){return health;},get mode(){return gameMode;},get inventory(){return inventory;},get selected(){return selected;},
 select(i){selected=i;},pause(){started=false;},modeTo(v){modeSelect.value=v;for(const change of modeSelect.events.change)change();},get keys(){return BLOCK_KEYS;},getBlock,setBlock,campusActors,sirD,macek,kay,ellie,percy,walkingPath,campusBounds,insideBounds,updateCampus,entranceDoors,moveHorizontal,canStandAt,
 micco,campusAreas,believeBanner,floorLogo,campusDetails,cloudGroup,cloudMesh,clouds,updateClouds,spawnParticles,updateParticles,particles,shardMaterial,setMacekOutfit,patternedSleeve,updateBlockMeshes,faceSlots,faceDirections,faceVisible,travelTo,setGraphics,graphicsBtn,graphicsSelect,renderer,schoolLogo,CampusActor,createWalkingSearch,PATH_STEP_NODES,
 shields,unicorn,unicornPatrol,shieldsSeated,SHIELDS_CYCLE,SHIELDS_SIT,updateShields,schoolInteriorBounds,schoolFootprint,skinTex,
 eddie,eddieRoost,eddiePerch,eddieFacing,updateEddie,EDDIE_ROCK,EDDIE_ROOF,EDDIE_DUSK,EDDIE_DAWN,
 buses,updateBuses,busRouteDistance,busRoutePoint,busAtKerb,busStopDistances,BUS_ARRIVE,BUS_COUNT,BUS_STAGGER,BUS_DRIVE_IN,BUS_DWELL,BUS_DRIVE_OUT,BUS_VISIT,BUS_LOOP,busRouteLength,BUS_ROUTE,
 playerAvatar,viewArms,viewModel,macekBodies,macekClothes,outfitPolo,outfitBlack,identityStatus,worldClockEl,setView,refreshOutfitPreview,updatePlayerAvatar,viewSelect,viewBtn,groundSurface,inBusYard,
 bubble,showBubble,SHIELDS_LINES,heightAt,nearestWalkPoint,walkFeet,
 get view(){return view;},get macekOutfit(){return macekOutfit;},
 setTime(t){dayTime=t;}};`;
vm.runInContext(instrumented,context);
const a=context.api;
if(process.env.MYNE_BENCH==='1'){
 const costs={};for(const actor of a.campusActors){const go=actor.go.bind(actor);actor.go=(...args)=>{const start=performance.now();go(...args);const c=costs[actor.name]??={total:0,max:0,count:0};const elapsed=performance.now()-start;c.total+=elapsed;c.max=Math.max(c.max,elapsed);c.count++;};}
 const frames=[];for(let i=0;i<360;i++){const start=performance.now();a.updateCampus(1/60);frames.push(performance.now()-start);}
 frames.sort((a,b)=>a-b);console.log(JSON.stringify({actorCosts:costs,frameMedian:frames[180],frame95:frames[342],frameMax:frames[359]},null,2));process.exit(0);
}
assert.equal(a.getBlock(25,20,25),'snow','legacy edits survive');
assert.equal(a.selected,8,'selection survives');
assert(a.getBlock(64,0,64),'larger world reaches edge');
assert.equal(a.getBlock(0,0,0),'water');assert.equal(a.isSolid(0,0,0),false);
assert.equal(a.getBlock(34,16,-19),'snow','white school roof');assert.equal(a.getBlock(46,6,23),undefined,'school entrance open');
assert.equal(a.getBlock(25,16,-28),'snow','expanded north-west wing');
assert.equal(a.getBlock(41,16,18),'glass','wider glass gallery');
const terrainTriangles=Object.values(a.instMeshes).reduce((n,m)=>n+m.count*m.geometry.index.count/3,0);
assert(terrainTriangles<150000,'exposed-face renderer keeps enlarged world below 150k terrain triangles');
console.log('Campus terrain triangles:',terrainTriangles);
assert(a.getBlock(92,0,42),'terrain reaches rear basketball court');
assert.equal(a.getBlock(80,4,30),'stone','court has real collision ground');
assert.equal(a.getBlock(68,4,31),'brick','playground has a distinct surface');
assert.equal(a.getBlock(78,4,-10),'planks','outdoor classroom floor');
assert.equal(a.getBlock(34,12,22),'snow','school logo is mounted against white facade');
assert.equal(a.schoolLogo.position.z,23.015);
// Every block the monogram covers must be opaque white facade, so no part of it
// floats over a window or over open air.
{
 const logo=a.schoolLogo.geometry.parameters,lx=a.schoolLogo.position.x,ly=a.schoolLogo.position.y;
 for(let x=Math.floor(lx-logo.width/2);x<=Math.floor(lx+logo.width/2);x++)
  for(let y=Math.floor(ly-logo.height/2);y<=Math.floor(ly+logo.height/2);y++)
   assert.equal(a.getBlock(x,y,22),'snow',`logo backing at ${x},${y} is solid white facade`);
}
assert.equal(a.renderer.shadowMap.enabled,false,'smooth graphics is default');
assert.equal(a.renderer.pixelRatio,1,'smooth graphics caps resolution on high-density displays');
a.setGraphics('detailed');assert.equal(a.renderer.shadowMap.enabled,true);assert.equal(a.renderer.pixelRatio,1.5);
a.setGraphics('smooth');assert.equal(a.renderer.shadowMap.enabled,false);assert.equal(a.renderer.pixelRatio,1);
assert.equal(a.graphicsBtn.textContent,'Graphics: Smooth');
a.graphicsBtn.events.click[0]();
assert.equal(a.renderer.shadowMap.enabled,true,'in-game toggle enables detailed shadows');
assert.equal(a.graphicsSelect.value,'detailed','menu list follows the in-game toggle');
assert.equal(JSON.parse(saved).graphics,'detailed','graphics toggle is saved with the world');
a.graphicsSelect.value='smooth';a.graphicsSelect.events.change[0]();
assert.equal(a.graphicsBtn.textContent,'Graphics: Smooth','in-game toggle follows the menu list');
assert.equal(a.renderer.pixelRatio,1);
context.navigator.maxTouchPoints=5;a.setGraphics('detailed');
assert.equal(a.renderer.pixelRatio,1,'a tablet keeps pixel ratio 1 when shadows are on');
assert.equal(a.renderer.shadowMap.enabled,true);
context.navigator.maxTouchPoints=0;a.setGraphics('smooth');
assert.equal(a.getBlock(-55,2,0),'stone','highway west of campus');
// The hanging BELIEVE banner stays; the floor mat is now the school's own SV logo.
assert.equal(a.believeBanner.name,'BELIEVE entrance banner');
assert.equal(a.floorLogo.name,'SV floor logo');
assert.equal(a.floorLogo.rotation.x,-Math.PI/2,'floor logo lies flat on the lobby floor');
assert.equal(a.floorLogo.material.map,a.schoolLogo.material.map,'floor inlay reuses the loaded SV logo texture');
assert.equal(a.believeMat,undefined,'the duplicate BELIEVE floor mat is gone');
{ // Every block under the floor inlay is real walkable lobby floor, not open air.
  const logo=a.floorLogo.geometry.parameters,lx=a.floorLogo.position.x,lz=a.floorLogo.position.z;
  for(let x=Math.floor(lx-logo.width/2);x<=Math.floor(lx+logo.width/2);x++)
   for(let z=Math.floor(lz-logo.height/2);z<=Math.floor(lz+logo.height/2);z++)
    assert(a.isSolid(x,4,z),`floor under the SV inlay at ${x},${z} is solid`);
}
// The banner was cropped to "ELIEV" because the door jambs stood between the
// approach and its ends. Trace the real line of sight from a walking player's
// eye (floor y=5 plus 1.7 of player) to every corner: glass and water do not
// hide the sign, painted blocks and jambs do.
{
 const EYE=[46,6.7,31],banner=a.believeBanner,{width:bw,height:bh}=banner.geometry.parameters;
 const opaque=(x,y,z)=>{const b=a.getBlock(Math.floor(x),Math.floor(y),Math.floor(z));return !!b&&b!=='glass'&&b!=='water';};
 const sightClear=(to)=>{
  for(let i=1;i<=600;i++){const t=i/600;
   if(opaque(EYE[0]+(to[0]-EYE[0])*t,EYE[1]+(to[1]-EYE[1])*t,EYE[2]+(to[2]-EYE[2])*t))return false;}
  return true;
 };
 const top=banner.position.y+bh/2,bottom=banner.position.y-bh/2;
 assert(bottom>EYE[1],'banner hangs above a standing player, so it never blocks the walk in');
 assert(top<9,'banner stays under the y=9 canopy soffit instead of punching through it');
 assert(banner.position.z>25.55&&banner.position.z<26,'banner hangs clear of the swung-open glass leaves, still under the canopy');
 for(const x of [banner.position.x-bw/2,banner.position.x,banner.position.x+bw/2])
  for(const y of [bottom+.02,top-.02])
   assert(sightClear([x,y,banner.position.z]),`whole banner is visible from the approach at x ${x.toFixed(2)} y ${y.toFixed(2)}`);
 assert(!sightClear([46.5-2.95,8.65,21.5]),'the old spot behind the doors really was cropped by a jamb');
}
assert.equal(a.ellie.invulnerable,true);assert.equal(a.percy.invulnerable,true);
assert(a.percy.group.scale.x>a.ellie.group.scale.x,'dogs have distinct builds');
assert.equal(a.macek.armR.children[0].material[4].map,a.patternedSleeve,'patterned arm sleeve');
a.setMacekOutfit('black');assert.equal(a.macek.body.userData.outfit,'black');
assert.equal(a.readWorldBackup(a.worldBackupText()).macekOutfit,'black','outfit travels with world backup');
const oldBackup=JSON.parse(a.worldBackupText());delete oldBackup.state.macekOutfit;
assert.equal(a.readWorldBackup(JSON.stringify(oldBackup)).macekOutfit,'polo','old backups still load');
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
// Compare incremental edits against a fresh rebuild, including transparent neighbors
// and bucket growth. A block click must not rebuild or scan the world.
for(let i=0;i<90;i++){a.setBlock(-25+i%15,28+Math.floor(i/15),-20,'blue');a.updateBlockMeshes(-25+i%15,28+Math.floor(i/15),-20);}
for(const [x,y,z,type] of [[-24,29,-20,'glass'],[-25,29,-20,'water'],[-23,29,-20,null]]){a.setBlock(x,y,z,type);a.updateBlockMeshes(x,y,z);}
a.updateBlockMeshes(80,30,80);
a.setBlock(-40,40,-40,'glow');a.updateBlockMeshes(-40,40,-40);
let glowKey,glowMesh;
for(const [id,rec] of a.faceSlots)if(id.startsWith('-40,40,-40,')){glowKey=rec.bucketKey;glowMesh=a.instMeshes[glowKey];break;}
assert.equal(glowMesh.frustumCulled,true,'chunk meshes can be frustum-culled');
assert(glowMesh.boundingSphere.radius>16&&glowMesh.boundingSphere.radius<50,'chunk bounds cover the column without spanning the world');
const growthBlocks=Math.floor((glowMesh.instanceMatrix.count-glowMesh.count)/6)+1;
for(let i=0;i<growthBlocks;i++){
 const x=-62+(i%8)*2,z=-62+Math.floor(i/8)*2;
 a.setBlock(x,40,z,'glow');a.updateBlockMeshes(x,40,z);
}
assert.notEqual(a.instMeshes[glowKey],glowMesh,'isolated edits force capacity growth');
assert(a.instMeshes[glowKey].instanceMatrix.count>glowMesh.instanceMatrix.count,'grown bucket preserves spare capacity');
// Existing backups permit edits beyond the normal build height. Culling must
// still enclose those accepted blocks after import or incremental edits.
for(const y of [-90,120]){
 const backup=JSON.parse(a.worldBackupText());backup.state.edits[`-40,${y},-40`]='glow';
 assert.equal(a.readWorldBackup(JSON.stringify(backup)).edits[`-40,${y},-40`],'glow');
 a.setBlock(-40,y,-40,'glow');a.updateBlockMeshes(-40,y,-40);
 const rec=a.faceSlots.get(`-40,${y},-40,0`),sphere=a.instMeshes[rec.bucketKey].boundingSphere;
 for(const dx of [0,1])for(const dy of [0,1])for(const dz of [0,1])
  assert(sphere.containsPoint(new Three.Vector3(-40+dx,y+dy,-40+dz)),'chunk bounds contain accepted backup edits outside normal build height');
}
// Swap removal and growth must preserve actual instance transforms, not only IDs.
function assertFaceBuffers(){
 const occupied=new Set(),matrix=new Three.Matrix4(),position=new Three.Vector3(),normal=new Three.Vector3();
 for(const [id,{bucketKey,slot}] of a.faceSlots){
  const mesh=a.instMeshes[bucketKey],[x,y,z,face]=id.split(',').map(Number),[dx,dy,dz]=a.faceDirections[face];
  assert(slot>=0&&slot<mesh.count,'face slot is inside the active draw range');
  assert(!occupied.has(bucketKey+':'+slot),'active faces do not share a buffer slot');occupied.add(bucketKey+':'+slot);
  mesh.getMatrixAt(slot,matrix);position.setFromMatrixPosition(matrix);normal.set(0,0,1).transformDirection(matrix);
  assert(position.distanceTo(new Three.Vector3(x+.5+dx*.5,y+.5+dy*.5,z+.5+dz*.5))<1e-6,`face ${id} has the correct instance position`);
  assert(normal.dot(new Three.Vector3(dx,dy,dz))>.999999,`face ${id} points outward`);
 }
 assert.equal(Object.values(a.instMeshes).reduce((sum,mesh)=>sum+mesh.count,0),a.faceSlots.size,'no orphan faces remain in draw buffers');
}
assertFaceBuffers();
const incremental=[...a.faceSlots].map(([id,v])=>id+':'+v.bucketKey).sort();
a.buildMeshes();assert.deepEqual([...a.faceSlots].map(([id,v])=>id+':'+v.bucketKey).sort(),incremental,'incremental faces match complete rebuild');
const originalIterator=a.WORLD[Symbol.iterator];a.WORLD[Symbol.iterator]=()=>{throw new Error('Block edit attempted whole-world scan');};
const editTimes=[];for(let i=0;i<100;i++){const start=performance.now();a.setBlock(-24,29,-20,i%2?'snow':null);a.updateBlockMeshes(-24,29,-20);editTimes.push(performance.now()-start);}
a.WORLD[Symbol.iterator]=originalIterator;editTimes.sort((a,b)=>a-b);console.log('Incremental edit CPU median/p95 ms:',editTimes[50].toFixed(3),editTimes[95].toFixed(3));
assert.equal(a.hotbar.children.length,14);
const event={preventDefault(){}};
a.startGame();
const beforeTravel=a.player.pos.clone();
assert.match(a.travelTo(46,4,31),/inside/);assert.match(a.travelTo(999,20,0),/limits/);
assert.equal(a.player.pos.distanceTo(beforeTravel),0,'rejected coordinate travel preserves position');
assert.equal(a.travelTo(46.5,30,31.5),'');assert.equal(a.player.flying,true);
a.modeTo('survival');assert.equal(a.player.flying,false,'switching from coordinate travel to survival clears flight');
assert.match(a.travelTo(46,30,31),/Creative/);a.modeTo('creative');
// Aim at a high isolated stone target; place and break every material through the actual raycast.
a.WORLD[Symbol.iterator]=()=>{throw new Error('Player block action attempted whole-world scan');};
for(const [i,k] of a.keys.entries()){
 a.player.pos.set(20.5,20.5,20.5);a.camera.position.copy(a.player.pos);a.camera.quaternion.identity();
 a.setBlock(20,20,16,'stone');a.setBlock(20,20,17,null);a.select(i);
 assert.equal(a.castVoxel().z,16);
 a.doPlace();assert.equal(a.getBlock(20,20,17),k,`${k} places`);
 a.doBreak();assert.equal(a.getBlock(20,20,17),undefined,`${k} breaks`);
}
a.WORLD[Symbol.iterator]=originalIterator;
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
assert(a.walkingPath({x:46.5,y:5,z:26.5},{x:86,y:5,z:30},a.campusBounds).length>0,'walk from entrance to basketball court');
assert(a.walkingPath({x:46.5,y:5,z:26.5},{x:78,y:5,z:-9},a.campusBounds).length>0,'walk from entrance to outdoor classroom');
assert(a.walkingPath({x:65.5,y:5,z:24.5},{x:69,y:8,z:25},a.campusBounds).length>0,'playground steps reach tower deck');
// Removing the first stair makes upstairs unreachable. Actors must spread that
// search across frames and wait before retrying the same blocked destination.
const stairBlocks=[40,41,42].map(x=>[x,a.getBlock(x,5,3)]);
for(const [x] of stairBlocks)a.setBlock(x,5,3,null);
const routeActor=new a.CampusActor('Route test',46,5,26,'macek'),upstairs={x:47,y:11,z:16};
routeActor.go(1/60,upstairs);
const blockedSearch=routeActor.navigationSearch;
assert(blockedSearch&&!blockedSearch.done,'blocked route remains pending after one frame');
assert(blockedSearch.expanded<=a.PATH_STEP_NODES,'first frame respects the planning node budget');
const planningTimes=[];
for(let i=0;i<1000&&routeActor.navigationSearch;i++){
 const previous=blockedSearch.expanded,start=performance.now();routeActor.go(1/60,upstairs);planningTimes.push(performance.now()-start);
 assert(blockedSearch.expanded-previous<=a.PATH_STEP_NODES,'every frame respects the planning node budget');
}
assert.equal(routeActor.navigationSearch,null,'blocked search eventually finishes');
assert.equal(routeActor.route.length,0);assert.equal(routeActor.planFailures,1);
assert(routeActor.planTimer>=8,'failed route waits at least eight seconds before retrying');
for(let i=0;i<7*60;i++){routeActor.go(1/60,upstairs);assert.equal(routeActor.navigationSearch,null,'no busy retry during failed-route backoff');}
planningTimes.sort((a,b)=>a-b);console.log('Blocked-route slice CPU median/p95 ms:',planningTimes[Math.floor(planningTimes.length*.5)].toFixed(3),planningTimes[Math.floor(planningTimes.length*.95)].toFixed(3));
for(const [x,type] of stairBlocks)a.setBlock(x,5,3,type);
for(let i=0;i<600;i++)routeActor.go(1/60,upstairs);
assert(routeActor.route.length>0||routeActor.pos.y>5,'actor retries successfully once the staircase is repaired');
assert.equal(routeActor.planFailures,0,'successful route clears failed-route backoff');
// Grounded players step up the real staircase without having to fly.
a.player.pos.set(41.5,6.7001,2.7);a.player.onGround=true;a.player.flying=false;a.moveHorizontal('z',.2);
assert(a.player.pos.y>7.6,'player can climb first stair');
// A diagonal step into two blocks must leave the player outside both of them.
a.setBlock(10,20,10,'stone');a.setBlock(11,20,10,'stone');a.setBlock(10,20,11,'stone');
a.player.pos.set(10.9,21.8,10.9);a.player.flying=false;a.player.onGround=false;a.player.vel.set(.4,0,.4);
a.moveHorizontal('x',.4);a.moveHorizontal('z',.4);
assert(a.canStandAt(a.player.pos),'corner collision does not leave the player inside a block');
a.setBlock(10,20,10,null);a.setBlock(11,20,10,null);a.setBlock(10,20,11,null);
a.setTime(.2);
let highestSirD=0;
for(let i=0;i<500;i++){a.updateCampus(.2);highestSirD=Math.max(highestSirD,a.sirD.pos.y);for(const actor of [a.sirD,a.kay,a.shields,a.unicorn])assert(a.insideBounds(actor.pos.x,actor.pos.z,a.campusBounds),'campus boundary');}
assert(highestSirD>=10.9,'Sir D patrols upstairs');
{ // Keep the enlarged cast and bus route within the existing CPU frame budget.
 const frames=[];for(let i=0;i<600;i++){const start=performance.now();a.updateCampus(1/60);frames.push(performance.now()-start);}
 frames.sort((x,y)=>x-y);
 console.log('Campus frame CPU median/p95 ms:',frames[300].toFixed(3),frames[570].toFixed(3));
 assert(frames[570]<8,'campus simulation stays within its frame budget');
}
for(let i=0;i<420;i++){a.setTime(.43+i*.2/1200);a.updateCampus(.2);}
assert(a.sirD.pos.distanceTo(a.macek.pos)<3.1,'sunset rendezvous');
assert(Math.abs(a.sirD.pos.z-26.5)<1,'meeting at entrance');
assert(a.ellie.pos.distanceTo(a.macek.pos)<4,'Ellie follows MaCEk');
assert(a.percy.pos.distanceTo(a.macek.pos)<4,'Percy follows MaCEk');
assert(a.kay.pos.distanceTo(a.sirD.pos)<4,'KaY follows Sir D');
assert.equal(a.campusActors.map(n=>n.name).join(','),'Sir D,MaCEk,KaY,Ellie,Percy,Ms. Micco,Officer Shields,Mr Unicorn 🦄');
assert(a.insideBounds(a.micco.pos.x,a.micco.pos.z,a.campusBounds),'Ms. Micco stays on campus');
a.player.pos.set(46.5,6.7,24);a.updateCampus(.2);assert(Math.abs(a.entranceDoors[0].rotation.y)>.1,'main doors open nearby');
a.setTime(.12);
let before=a.time;a.tick(50);assert(Math.abs(a.time-before-.05/1200)<1e-9,'20 minute cycle');
assert.equal(a.renderer.renderCount,1,'active game draws a frame');
a.pause();before=a.time;const pos=a.player.pos.clone();a.tick(100);assert.equal(a.time,before);assert.equal(a.player.pos.distanceTo(pos),0,'paused movement');
const pausedActors=a.campusActors.map(actor=>actor.pos.clone());
a.tick(150);assert.equal(a.renderer.renderCount,1,'paused game submits no frames to the renderer');
assert(a.campusActors.every((actor,i)=>actor.pos.distanceTo(pausedActors[i])===0),'paused game stops campus actors');
a.startGame();a.tick(200);assert.equal(a.renderer.renderCount,2,'rendering resumes after leaving the menu');a.pause();
a.player.pos.set(46.5,32.25,31.5);a.player.yaw=.42;a.player.pitch=-.2;a.player.flying=true;a.select(8);
a.persistSave();assert.equal(JSON.parse(saved).edits['25,20,25'],'snow');
const resumeContext=vm.createContext({...context,api:undefined});vm.runInContext(instrumented,resumeContext);
assert.equal(resumeContext.api.player.pos.y,32.25);assert.equal(resumeContext.api.player.pos.x,46.5);assert.equal(resumeContext.api.player.pos.z,31.5);
assert.equal(resumeContext.api.player.yaw,.42);assert.equal(resumeContext.api.player.pitch,-.2);assert.equal(resumeContext.api.player.flying,true);assert.equal(resumeContext.api.selected,8);
assert.equal(resumeContext.api.macek.body.userData.outfit,'black','outfit survives reload');
// Landing-page mode links choose only a known mode and retain the existing world.
for(const [query,savedMode,expected] of [['survival','creative','survival'],['creative','survival','creative'],['unknown','survival','survival']]){
 const querySave=JSON.parse(saved);querySave.mode=savedMode;
 const queryContext=vm.createContext({...context,api:undefined,location:{...context.location,search:'?mode='+query},localStorage:{...context.localStorage,getItem:()=>JSON.stringify(querySave)}});
 vm.runInContext(instrumented,queryContext);
 assert.equal(queryContext.api.mode,expected,'validated mode link overrides the saved mode');
 assert.equal(queryContext.api.modeSelect.value,expected,'game menu reflects the requested mode');
 assert.equal(queryContext.api.getBlock(25,20,25),'snow','mode link preserves existing builds');
 if(expected==='survival')assert.equal(queryContext.api.player.flying,false,'survival link clears saved Creative flight');
}
// A saved position inside newly added facade blocks must recover without losing edits.
const overlappingSave=JSON.parse(saved);Object.assign(overlappingSave.player,{x:34.5,y:12.6,z:22.5,flying:false});
assert.equal(a.canStandAt(new Three.Vector3(34.5,12.6,22.5)),false,'recovery fixture starts inside the added facade');
const collisionContext=vm.createContext({...context,api:undefined,localStorage:{...context.localStorage,getItem:()=>JSON.stringify(overlappingSave)}});
vm.runInContext(instrumented,collisionContext);
const recovered=collisionContext.api;
assert(recovered.canStandAt(recovered.player.pos),'saved player recovers to an unoccupied position');
assert.equal(recovered.player.pos.x,34.5);assert.equal(recovered.player.pos.z,22.5);assert(recovered.player.pos.y>12.6);
assert.equal(recovered.player.flying,false,'recovery preserves the saved flight setting');
assert.equal(recovered.getBlock(25,20,25),'snow','collision recovery preserves saved builds');

// ===== the camera choice and outfit travel with the world =====
a.setView('third');a.setMacekOutfit('black');
assert.equal(a.readWorldBackup(a.worldBackupText()).view,'third','the view is written into a backup');
{
 const backup=JSON.parse(a.worldBackupText());delete backup.state.view;
 assert.equal(a.readWorldBackup(JSON.stringify(backup)).view,'first','backups made before play-as-MaCEk still load');
 const bad=JSON.parse(a.worldBackupText());bad.state.view='overhead';
 assert.throws(()=>a.readWorldBackup(JSON.stringify(bad)),/camera/,'a nonsense view is rejected, not silently used');
}
a.persistSave();
{
 const viewContext=vm.createContext({...context,api:undefined});vm.runInContext(instrumented,viewContext);
 assert.equal(viewContext.api.view,'third','the camera choice survives a reload');
 assert.equal(viewContext.api.playerAvatar.group.visible,true,'and the playable body is showing again');
 assert.equal(viewContext.api.macekOutfit,'black','so does the outfit');
 // Eddie is placed from the saved clock the instant the world loads, not from noon.
 const savedTime=JSON.parse(saved).dayTime;
 assert.equal(viewContext.api.eddie.position.y,viewContext.api.eddiePerch(viewContext.api.eddieRoost(savedTime),new Three.Vector3()).y,'Eddie loads onto the perch his saved hour calls for');
}
a.setView('first');

// Both outfit cards select the actual player and persist the same choice.
a.setMacekOutfit('polo');a.refreshOutfitPreview();
assert(a.outfitPolo.checked);assert(!a.outfitBlack.checked);
assert.match(a.identityStatus.textContent,/blue SV polo with one patterned SV sleeve/);
a.outfitBlack.checked=true;a.outfitBlack.events.change[0]();
assert.equal(a.playerAvatar.body.userData.outfit,'black');
assert.equal(JSON.parse(saved).macekOutfit,'black');
assert(!a.outfitPolo.checked);assert(a.outfitBlack.checked);
a.setGraphics('detailed');
const graphicsBackup=a.readWorldBackup(a.worldBackupText());
assert.equal(graphicsBackup.graphics,'detailed','portable backup restores graphics along with the outfit');
const legacyGraphics=JSON.parse(a.worldBackupText());delete legacyGraphics.state.graphics;
assert.equal(a.readWorldBackup(JSON.stringify(legacyGraphics)).graphics,'smooth','older backups default safely');
legacyGraphics.state.graphics='invalid';
assert.throws(()=>a.readWorldBackup(JSON.stringify(legacyGraphics)),/invalid graphics/);
assert.match(html,/src="\.\/assets\/macek-avatar-lanyard.png"/);
await fs.access(new URL('../assets/macek-avatar-black.png',import.meta.url));

// Portable backup safety: round trip, bad data, cancellation, storage failure, unload race.
const portable=a.worldBackupText(), decoded=a.readWorldBackup(portable);
assert.equal(decoded.player.x,a.player.pos.x);assert.equal(decoded.player.y,a.player.pos.y);
assert.equal(decoded.edits['25,20,25'],'snow');
const beforeImport=saved;
for(const invalid of ['not json','{}',portable.replace('"version":1','"version":9'),portable.replace('"snow"','"unknown block"')]){
 assert.throws(()=>a.restoreWorldBackup(invalid));assert.equal(saved,beforeImport);
}
context.confirm=()=>false;assert.equal(a.restoreWorldBackup(portable),false);assert.equal(saved,beforeImport);
context.confirm=()=>true;const write=context.localStorage.setItem;
context.localStorage.setItem=()=>{throw new Error('quota');};
assert.throws(()=>a.restoreWorldBackup(portable));assert.equal(saved,beforeImport);
assert.equal(JSON.parse(a.worldBackupText()).format,'mynecraft-world','download can rescue an in-memory world when storage fails');
context.localStorage.setItem=write;
assert.equal(a.restoreWorldBackup(portable),true);assert(reloaded);
const importedSave=saved;a.persistSave();assert.equal(saved,importedSave,'unload cannot overwrite imported world');
// End portable backup safety.

// Draw-call budget: every cloud puff and every break shard shares one object.
assert.equal(a.cloudGroup.children.length,1,'the whole sky is one cloud draw call');
assert.equal(a.cloudMesh.count,a.clouds.reduce((n,c)=>n+c.puffs.length,0),'every puff has an instance');
assert(a.cloudMesh.count>=42,'the sky keeps its full set of puffs');
{
 const before=new Three.Matrix4();a.cloudMesh.getMatrixAt(0,before);
 const version=a.cloudMesh.instanceMatrix.version;
 a.updateClouds(2);const after=new Three.Matrix4();a.cloudMesh.getMatrixAt(0,after);
 assert.notDeepEqual([...after.elements],[...before.elements],'clouds still drift');
 assert(a.cloudMesh.instanceMatrix.version>version,'drift is uploaded to the GPU');
 const scale=new Three.Vector3().setFromMatrixScale(after);
 assert(scale.x>1&&scale.z>1&&Math.abs(scale.y-1)<1e-6,'puffs keep their individual width and depth');
}
{
 const shards=a.particles.length;
 a.spawnParticles(20,20,20,'stone');a.spawnParticles(30,20,20,'stone');
 const spawned=a.particles.slice(shards);
 assert.equal(spawned.length,24,'two breaks spawn both shard bursts');
 assert(spawned.every(p=>p.mesh.material===spawned[0].mesh.material),'shards reuse one material per block colour');
 // Five seconds expires both these bursts and particles left by earlier block tests.
 a.updateParticles(5);assert.equal(a.particles.length,0,'all expired shards leave the scene');
 a.spawnParticles(20,20,20,'stone');
 assert.equal(a.particles[a.particles.length-1].mesh.material,spawned[0].mesh.material,'the cached shard material survives expiry');
 a.updateParticles(5);
}

// ===== rear bus yard, loop and sports field =====
assert.equal(a.inBusYard(52,-44),true);assert.equal(a.inBusYard(52,-20),false,'the yard starts north of the school');
assert.equal(a.heightAt(52,-44),a.heightAt(52,-20),'bus yard is flattened to the same pad height as the school');
for(const [x,z] of [[30,-58],[70,-40],[90,-37]])assert.equal(a.heightAt(x,z),3,`rear yard at ${x},${z} is level`);
assert.equal(a.getBlock(65,4,-44),'stone','the loop lane is paved where buses drive');
assert.equal(a.getBlock(52,4,-39),'stone','kerb lane on the school side of the loop');
assert.equal(a.getBlock(52,4,-44),'grass','the loop keeps a grass island');
assert.equal(a.getBlock(65,4,20),'stone','rear service drive still runs past the playground');
assert.equal(a.getBlock(65,4,50),'stone','service drive reaches the south campus edge');
assert.equal(a.getBlock(52,4,-56),'grass','sports field north of the loop');
assert.equal(a.getBlock(46,4,50),'stone','the parents’ circle at the front is untouched');
assert.equal(a.getBlock(68,4,31),'brick','the playground surface survives the widened drive');
// The bus loop and the parent circle must never share tarmac. The parent circle is
// the ellipse centred on (46,40); no point of the bus route may come near it.
for(const p of a.BUS_ROUTE)
 assert(Math.hypot((p.x-46)/12.8,(p.z-40)/9.7)>1.35,`bus route point ${p.x.toFixed(1)},${p.z.toFixed(1)} stays clear of the parent circle`);
// Every metre of the route is real road, so no bus ever drives across the grass.
for(let d=0;d<=a.busRouteLength;d+=.5){
 const p=a.busRoutePoint(d,{});
 assert.equal(a.getBlock(Math.floor(p.x),4,Math.floor(p.z)),'stone',`route at ${d.toFixed(1)}m is paved`);
}

// ===== bus schedule: 3:00 PM, queue, depart, and a clock that wraps =====
assert.equal(a.BUS_ARRIVE,(15-6)/24,'buses are due when the HUD clock reads 3:00 PM');
assert.equal(a.buses.length,a.BUS_COUNT);
for(let i=0;i<a.BUS_COUNT;i++){
 const start=a.BUS_ARRIVE+i*a.BUS_STAGGER;
 assert.equal(a.busRouteDistance(start-.0001,i),-1,'a bus is parked off campus before its slot');
 assert.equal(a.busRouteDistance(start,i),0,'it enters at the start of the route');
 assert.equal(a.busRouteDistance(start+a.BUS_DRIVE_IN,i),a.busStopDistances[i],'it reaches its own kerb slot');
 assert.equal(a.busAtKerb(start+a.BUS_DRIVE_IN+a.BUS_DWELL/2,i),true,'it waits at the kerb');
 assert.equal(a.busRouteDistance(start+a.BUS_VISIT,i),a.busRouteLength,'it leaves by the far end of the route');
 assert.equal(a.busRouteDistance(start+a.BUS_VISIT+.0001,i),-1,'and is gone again afterwards');
 // The clock wraps at midnight; a bus keyed to any hour must wrap with it.
 for(const offset of [-2,-1,1,3])
  assert.equal(a.busRouteDistance(start+a.BUS_DRIVE_IN+offset,i),a.busStopDistances[i],'the schedule repeats every day');
}
{ // A bus due just before midnight still runs across the wrap without a gap.
 const wrapped=t=>((t%1)+1)%1;
 for(const probe of [.999,.9995,0,.0005])
  assert.equal(a.busRouteDistance(wrapped(a.BUS_ARRIVE+probe-.999+a.BUS_DRIVE_IN),0)>=0,true,'no dead spot around the day boundary');
}
{ // Queueing: at the kerb the three buses sit in arrival order, a bus length apart.
 const when=a.BUS_ARRIVE+(a.BUS_COUNT-1)*a.BUS_STAGGER+a.BUS_DRIVE_IN+a.BUS_DWELL/2;
 const spots=[];
 for(let i=0;i<a.BUS_COUNT;i++){assert.equal(a.busAtKerb(when,i),true,'all three are queued together');spots.push(a.busRoutePoint(a.busRouteDistance(when,i),{}));}
 for(let i=1;i<spots.length;i++){
  assert(a.busStopDistances[i-1]>a.busStopDistances[i],'the first bus in pulls furthest round the loop');
  assert(Math.hypot(spots[i].x-spots[i-1].x,spots[i].z-spots[i-1].z)>7.5,'queued buses do not overlap');
  assert(spots[i].z>-42&&spots[i].z<-37,'the queue lines the kerb on the school side');
 }
}
// The loop drive is one lane, so the last arrival must clear it before the first
// bus starts back: otherwise two buses would meet head on.
assert(a.BUS_DRIVE_IN+(a.BUS_COUNT-1)*a.BUS_STAGGER<a.BUS_DRIVE_IN+a.BUS_DWELL,'arrivals finish before the first departure');
{ // A whole simulated day must produce exactly one visit per bus and never spawn.
 const sceneChildren=a.buses[0].parent.children.length,busParts=a.buses.map(b=>b.children.length);
 const arrivals=new Array(a.BUS_COUNT).fill(0);let wasActive=new Array(a.BUS_COUNT).fill(false);
 for(let step=0;step<2400;step++){
  const t=step/2400;a.updateBuses(t);
  for(let i=0;i<a.BUS_COUNT;i++){
   const active=a.buses[i].visible;
   if(active&&!wasActive[i])arrivals[i]++;
   wasActive[i]=active;
   if(active)assert(a.buses[i].position.y===5&&Number.isFinite(a.buses[i].rotation.y),'an active bus sits on the road');
  }
 }
 assert.deepEqual(arrivals,new Array(a.BUS_COUNT).fill(1),'each bus arrives exactly once a day');
 assert.equal(a.buses.length,a.BUS_COUNT,'a day of driving spawns no extra buses');
 assert.equal(a.buses[0].parent.children.length,sceneChildren,'and adds nothing to the scene');
 assert.deepEqual(a.buses.map(b=>b.children.length),busParts,'bus bodies are built once and reused');
}

// ===== Eddie: rock by day, roof by night, back at dawn =====
assert.equal(a.eddieRoost(.25),0,'midday Eddie is on his rock');
assert.equal(a.eddieRoost(.75),1,'midnight Eddie is on the roof');
assert.equal(a.eddieRoost(a.EDDIE_DUSK),0,'he is still down at the moment of sunset');
assert.equal(a.eddieRoost(1),a.eddieRoost(0),'the roost function wraps with the day');
assert.equal(a.eddieRoost(-.25),a.eddieRoost(.75),'and handles a clock read from before zero');
assert.equal(a.eddieRoost(2.25),0,'and any number of days later');
{ // Monotonic climb at dusk, monotonic return at dawn, bounded the whole time.
 let last=0;
 for(let i=0;i<=40;i++){const v=a.eddieRoost(a.EDDIE_DUSK+i/40*.04);assert(v>=last-1e-12&&v<=1,'dusk climb rises smoothly');last=v;}
 last=1;
 for(let i=0;i<=40;i++){const v=a.eddieRoost(a.EDDIE_DAWN+i/40*.04);assert(v<=last+1e-12&&v>=0,'dawn return falls smoothly');last=v;}
}
{ // Both perches are real surfaces and no point of the flight passes through one.
 const at=(b)=>a.eddiePerch(b,new Three.Vector3());
 const rock=at(0),roof=at(1);
 assert.deepEqual([rock.x,rock.y,rock.z],[a.EDDIE_ROCK.x,a.EDDIE_ROCK.y,a.EDDIE_ROCK.z]);
 assert.deepEqual([roof.x,roof.y,roof.z],[a.EDDIE_ROOF.x,a.EDDIE_ROOF.y,a.EDDIE_ROOF.z]);
 assert(a.isSolid(Math.floor(rock.x),Math.floor(rock.y)-1,Math.floor(rock.z)),'the day rock is solid under him');
 assert.equal(a.getBlock(Math.floor(roof.x),Math.floor(roof.y)-1,Math.floor(roof.z)),'snow','the night roost is the white roof');
 let low=Infinity,high=-Infinity;
 for(let i=0;i<=400;i++){
  const p=at(i/400);low=Math.min(low,p.y);high=Math.max(high,p.y);
  assert(!a.isSolid(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z)),`flight step ${i} stays out of the building`);
  assert(p.x>=Math.min(rock.x,roof.x)-1e-9&&p.x<=Math.max(rock.x,roof.x)+1e-9,'flight stays bounded in x');
  assert(p.z>=Math.min(roof.z,rock.z)-1e-9&&p.z<=Math.max(roof.z,rock.z)+1e-9,'flight stays bounded in z');
 }
 assert.equal(low,rock.y);assert(high<=20.0000001,'he never climbs past the cruise height');
 assert(a.eddiePerch(-5,new Three.Vector3()).y===rock.y&&a.eddiePerch(9,new Three.Vector3()).y===roof.y,'out-of-range blends clamp to a perch');
}
assert.equal(a.eddieFacing(.25),Math.PI/4);assert.equal(a.eddieFacing(.52),Math.PI,'he faces the school on the way up');
{ // Eddie settles onto each perch and allocates nothing while he flies.
 a.setTime(.75);for(let i=0;i<900;i++)a.updateEddie(1/60);
 assert(a.eddie.position.distanceTo(new Three.Vector3(a.EDDIE_ROOF.x,a.EDDIE_ROOF.y,a.EDDIE_ROOF.z))<.05,'night finds Eddie on the roof');
 a.setTime(.25);for(let i=0;i<900;i++)a.updateEddie(1/60);
 assert(a.eddie.position.distanceTo(new Three.Vector3(a.EDDIE_ROCK.x,a.EDDIE_ROCK.y,a.EDDIE_ROCK.z))<.05,'daylight brings him back to the rock');
}

// ===== no per-frame allocation in the new campus work =====
{
 const watched=['BoxGeometry','PlaneGeometry','SphereGeometry','TorusGeometry','CanvasTexture','Texture','Mesh','InstancedMesh','Sprite','MeshLambertMaterial','MeshBasicMaterial','SpriteMaterial','Group'];
 const originals={},counts={};
 for(const name of watched){
  originals[name]=context.THREE[name];counts[name]=0;
  context.THREE[name]=new Proxy(originals[name],{construct(target,args){counts[name]++;return Reflect.construct(target,args);}});
 }
 a.setTime(.505); // mid-flight for Eddie, so the busiest path is the one measured
 for(let i=0;i<600;i++){a.updateEddie(1/60);a.updateBuses(.378+i*1e-5);a.updatePlayerAvatar(1/60);a.updateShields(1/60,a.player.pos);}
 for(const name of watched)context.THREE[name]=originals[name];
 const total=Object.values(counts).reduce((n,v)=>n+v,0);
 assert.equal(total,0,`600 frames of Eddie, buses, the player body and Officer Shields allocate no Three.js objects (${JSON.stringify(counts)})`);
}

// ===== Officer Shields at the front door =====
assert.equal(a.shields.name,'Officer Shields');
assert(Math.hypot(a.shields.pos.x-46.5,a.shields.pos.z-24)<7,'Shields is posted at the front door');
assert(a.schoolFootprint(Math.floor(a.shields.pos.x),Math.floor(a.shields.pos.z)),'his desk is inside the entrance, not out on the drive');
assert.equal(a.shields.route.length,0);
{ // He holds his post: no route, no wandering, whatever the clock says.
 const post=a.shields.pos.clone();
 for(const t of [.1,.35,.5,.8]){a.setTime(t);for(let i=0;i<200;i++)a.updateCampus(.2);}
 assert.equal(a.shields.pos.distanceTo(post),0,'Officer Shields never leaves the desk');
 assert.equal(a.shields.navigationSearch,null,'and never plans a route, so he cannot path into a wall');
}
// Seated and standing alternate on a fixed cycle and wrap cleanly in both directions.
assert.equal(a.shieldsSeated(0),true);assert.equal(a.shieldsSeated(a.SHIELDS_SIT-.01),true);
assert.equal(a.shieldsSeated(a.SHIELDS_SIT+.01),false);assert.equal(a.shieldsSeated(a.SHIELDS_CYCLE-.01),false);
assert.equal(a.shieldsSeated(a.SHIELDS_CYCLE+1),true,'the cycle repeats');
assert.equal(a.shieldsSeated(-1),false,'and reads correctly before zero');
{ // The pose really changes: seated drops him onto the stool with his legs forward.
 a.player.pos.set(46.5,6.7,60); // far away, so pose is measured without greetings
 for(let i=0;i<200;i++)a.updateShields(a.SHIELDS_CYCLE/200,a.player.pos); // settle a full cycle
 let seatedY=null,standY=null,seatedLeg=0,standLeg=0;
 for(let i=0;i<600;i++){
  a.updateShields(.1,a.player.pos);
  if(a.shields.poseBlend>.97){seatedY=a.shields.group.position.y;seatedLeg=a.shields.legL.rotation.x;}
  if(a.shields.poseBlend<.03){standY=a.shields.group.position.y;standLeg=a.shields.legL.rotation.x;}
 }
 assert(seatedY!==null&&standY!==null,'both poses occur within a few cycles');
 assert(standY-seatedY>.2,'sitting lowers him onto the stool');
 assert(Math.abs(seatedLeg+Math.PI/2)<.05&&Math.abs(standLeg)<.05,'seated legs come forward, standing legs do not');
}
{ // He welcomes an arriving player once, does not repeat while they stand there,
  // and greets again only after they have left and the cooldown has run out.
 a.bubble.textContent='';
 a.player.pos.set(49,5,22);
 a.updateShields(.05,a.player.pos);
 const first=a.bubble.textContent;
 assert(a.SHIELDS_LINES.includes(first),'he welcomes a player who walks up');
 a.bubble.textContent='';
 for(let i=0;i<400;i++)a.updateShields(.05,a.player.pos);
 assert.equal(a.bubble.textContent,'','standing at the desk does not make him repeat himself');
 a.player.pos.set(46.5,6.7,45);            // walk well away
 for(let i=0;i<40;i++)a.updateShields(.8,a.player.pos);   // and let the cooldown expire
 a.player.pos.set(49,5,22);
 a.updateShields(.05,a.player.pos);
 assert(a.SHIELDS_LINES.includes(a.bubble.textContent),'coming back later earns a fresh welcome');
 assert.notEqual(a.bubble.textContent,first,'and it is not the same line twice running');
}

// ===== Mr. Unicorn walks the hallways only =====
assert.equal(a.unicorn.name,'Mr Unicorn 🦄');
assert.equal(a.unicorn.bounds,a.schoolInteriorBounds);
assert.equal(a.schoolInteriorBounds.filter,a.schoolFootprint,'his bounds are filtered by the building footprint');
assert.equal(a.insideBounds(46,26,a.schoolInteriorBounds),false,'the entrance walkway is outside his world');
assert.equal(a.insideBounds(86,31,a.schoolInteriorBounds),false,'so is the basketball court');
assert(a.unicorn.laptop&&a.unicorn.group.children.includes(a.unicorn.laptop),'he carries an open laptop');
assert(a.unicorn.laptop.children.length>=3,'the laptop has a deck and a raised lid');
// Every patrol stop is interior floor, and the route between each pair stays inside.
for(const [x,y,z] of a.unicornPatrol){
 assert(a.schoolFootprint(x,z),`patrol stop ${x},${z} is inside the building`);
 assert.equal(a.walkFeet(x,z,y),y,`patrol stop ${x},${z} is standable floor`);
}
for(let i=0;i<a.unicornPatrol.length;i++){
 const from=a.unicornPatrol[i],to=a.unicornPatrol[(i+1)%a.unicornPatrol.length];
 const route=a.walkingPath({x:from[0],y:from[1],z:from[2]},{x:to[0],y:to[1],z:to[2]},a.schoolInteriorBounds);
 assert(route.length>0,`there is an indoor route from ${from} to ${to}`);
 for(const step of route)assert(a.schoolFootprint(step.x,step.z),`route node ${step.x},${step.z} stays indoors`);
}
{ // Walking for several in-game minutes never takes him outside, and both hands
  // stay on the laptop instead of swinging.
 for(let i=0;i<4000;i++){
  a.unicorn.patrol(1/30,a.unicornPatrol);
  assert(a.schoolFootprint(Math.floor(a.unicorn.pos.x),Math.floor(a.unicorn.pos.z)),'Mr. Unicorn stays inside the school');
  assert.equal(a.unicorn.armL.rotation.x,a.unicorn.armLock);
  assert.equal(a.unicorn.armR.rotation.x,a.unicorn.armLock);
 }
 assert(a.unicorn.patrolIndex>0||a.unicorn.route.length>0,'he actually works his way round the route');
}

// ===== MaCEk's outfits dress every MaCEk body =====
assert(a.macekBodies.length>=3,'the NPC, the playable avatar and the first-person sleeves are all registered');
a.setMacekOutfit('polo');
assert.equal(a.macek.body.material[0].map,a.macekClothes.polo,'blue SV polo');
assert.equal(a.macek.armR.children[0].material[4].map,a.patternedSleeve,'one patterned SV sleeve');
assert.equal(a.macek.armL.children[0].material[4].map,a.skinTex,'and the other arm is bare');
assert.equal(a.playerAvatar.armR.children[0].material[4].map,a.patternedSleeve,'the playable body wears the same sleeve');
assert.equal(a.viewArms.armR.material[4].map,a.patternedSleeve,'so do the first-person hands');
assert.equal(a.viewArms.armL.material[4].map,a.skinTex);
a.setMacekOutfit('black');
for(const parts of a.macekBodies){
 assert.equal(parts.armL.material[4].map,a.patternedSleeve,'the black SV shirt patterns both sleeves');
 assert.equal(parts.armR.material[4].map,a.patternedSleeve);
 if(parts.body)assert.equal(parts.body.material[0].map,a.macekClothes.black);
}
assert.equal(a.playerAvatar.body.userData.outfit,'black','the playable body records the outfit too');

// ===== playing as MaCEk =====
a.setView('third');
assert.equal(a.playerAvatar.group.visible,true,'third person shows MaCEk');
assert.equal(a.viewModel.visible,false);
assert.equal(a.viewSelect.value,'third','the menu list follows the view');
assert.equal(a.viewBtn.textContent,'View: 3rd','so does the in-game button');
a.setView('first');
assert.equal(a.playerAvatar.group.visible,false);assert.equal(a.viewModel.visible,true,'first person still shows his sleeves');
{ // The avatar tracks the player and faces the way the player is looking.
 a.player.pos.set(46.5,8.7,31.5);a.player.yaw=0;a.player.vel.set(0,0,0);
 a.updatePlayerAvatar(1/60);
 assert.equal(a.playerAvatar.group.position.x,46.5);
 assert.equal(a.playerAvatar.group.position.z,31.5);
 assert(Math.abs(a.playerAvatar.group.position.y-(8.7-a.player.height))<1e-9,'the body stands on the ground, not at eye height');
 assert.equal(a.playerAvatar.group.rotation.y,Math.PI,'at yaw 0 the block model faces the way the player walks');
 a.player.yaw=1.2;a.updatePlayerAvatar(1/60);
 assert(Math.abs(a.playerAvatar.group.rotation.y-(1.2+Math.PI))<1e-9);
 // Limbs swing only when the player is actually moving.
 a.player.vel.set(0,0,0);for(let i=0;i<120;i++)a.updatePlayerAvatar(1/60);
 assert(Math.abs(a.playerAvatar.legL.rotation.x)<.02,'a standing MaCEk keeps his legs still');
 a.player.vel.set(5,0,0);let widest=0;
 for(let i=0;i<120;i++){a.updatePlayerAvatar(1/60);widest=Math.max(widest,Math.abs(a.playerAvatar.legL.rotation.x));}
 assert(widest>.4,'a walking MaCEk strides');
}
{ // The third-person camera sits behind the player and never inside a block.
 a.setView('third');a.player.pos.set(46.5,8.7,31.5);a.player.yaw=0;a.player.pitch=0;
 a.camera.quaternion.setFromEuler(new Three.Euler(0,0,0,'YXZ'));
 a.updatePlayerAvatar(1/60);
 assert(a.camera.position.z>31.5,'the camera pulls back behind MaCEk');
 assert(a.camera.position.distanceTo(a.player.pos)<=4.3);
 assert(!a.isSolid(Math.floor(a.camera.position.x),Math.floor(a.camera.position.y),Math.floor(a.camera.position.z)),'and stays out of the walls');
 a.player.pos.set(46.5,6.7,22.5); // tight against the lobby wall
 a.updatePlayerAvatar(1/60);
 assert(!a.isSolid(Math.floor(a.camera.position.x),Math.floor(a.camera.position.y),Math.floor(a.camera.position.z)),'indoors it tucks in instead of clipping through');
 a.setView('first');
}
assert.match(a.worldClockEl.textContent,/World clock: .+School buses reach the rear loop at 3:00 PM/);

a.resetBtn.events.click[0]();assert(reloaded);assert.equal(saved,null);a.persistSave();assert.equal(saved,null,'exit handler cannot resurrect reset world');
console.log('PASS: Officer Shields (post, seated/standing cycle, one welcome per visit), Mr. Unicorn (indoor-only routes, laptop), MaCEk outfits on every body, play-as-MaCEk first/third person, Eddie rock-to-roof with day wrapping, SV floor logo, rear bus yard + 3 PM bus loop with no duplicate spawning, zero per-frame allocation, incremental face buffers/growth, no world scans on block actions, graphics modes, coordinate travel, paused rendering, safe/exact save restoration, legacy saves, 14 block placements, hotbar, survival inventory/flight, NPCs, animals, lake, school entrance, 20-minute clock, reset, two-floor navigation, stairs, campus boundaries, sunset meeting, companion following and doors.');
