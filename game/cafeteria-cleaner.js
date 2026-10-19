/* Original procedural campus character. No photos, personal data, timers,
 * storage or event listeners. The host owns active game time and pause state. */
(function (root) {
  'use strict';
  const START_MINUTE=14*60, END_MINUTE=15*60, FLOOR=5, RADIUS=.9, HEIGHT=2.45, SPEED=.9;
  const minutes=time=>Number.isFinite(time)?((((time%1)+1)%1)*1440+360)%1440:0;
  const onDuty=time=>{const minute=minutes(time)+1e-7;return minute>=START_MINUTE&&minute<END_MINUTE;};
  function create(api){
    const {THREE,scene,getBlock,walkFeet,bounds}=api;
    const group=new THREE.Group();group.name='Cafeteria custodian';group.visible=false;
    group.userData.appearance='Black hair, glasses, goatee, black shirt, blue jeans, gray ride-on floor scrubber';
    const materials=new Map(),geometries=new Set(),boxGeometry=new THREE.BoxGeometry(1,1,1);geometries.add(boxGeometry);
    const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);};
    const box=(name,w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(boxGeometry,mat(color));mesh.name=name;mesh.scale.set(w,h,d);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
    const gray=0x858f95,dark=0x252b30,black=0x202225,denim=0x355c84,skin=0xd9a781;
    box('Gray scrubber chassis',1.0,.54,1.28,gray,0,.6,0);
    box('Gray front water tank',.86,.52,.52,0xa4adb1,0,.95,.35);
    box('Scrubber lower skirt',1.03,.16,1.32,0x525d65,0,.29,0);
    box('Rear floor squeegee',1.1,.08,.12,dark,0,.12,-.68);
    box('Driver seat',.57,.15,.49,dark,0,1.05,-.3);
    box('Seat back',.58,.52,.13,dark,0,1.35,-.53);
    const wheels=[],brushes=[];
    const wheelGeometry=new THREE.CylinderGeometry(.25,.25,.13,12);geometries.add(wheelGeometry);
    for(const x of [-.51,.51])for(const z of [-.42,.42]){
      const wheel=new THREE.Mesh(wheelGeometry,mat(dark));wheel.name='Scrubber wheel';wheel.rotation.z=Math.PI/2;wheel.position.set(x,.25,z);group.add(wheel);wheels.push(wheel);
    }
    const brushGeometry=new THREE.CylinderGeometry(.27,.27,.08,12);geometries.add(brushGeometry);
    for(const x of [-.24,.24]){const brush=new THREE.Mesh(brushGeometry,mat(0x39766c));brush.name='Rotating floor brush';brush.position.set(x,.08,.48);group.add(brush);brushes.push(brush);}
    box('Black shirt',.57,.66,.36,black,0,1.58,-.21);
    box('Blue jeans waist',.49,.24,.34,denim,0,1.14,-.22);
    for(const x of [-.16,.16]){
      box('Blue jeans thigh',.2,.19,.48,denim,x,1.09,.04);
      box('Blue jeans leg',.18,.43,.18,denim,x,.81,.24);
      box('Work shoe',.22,.14,.34,black,x,.56,.33);
      const sleeve=box('Black sleeve',.19,.35,.21,black,x*2,1.57,-.12);sleeve.rotation.x=-.5;
      const arm=box('Forearm at steering wheel',.14,.33,.16,skin,x*1.9,1.38,.1);arm.rotation.x=-.7;
      box('Hand on steering wheel',.15,.12,.16,skin,x*1.2,1.28,.25);
    }
    box('Face',.44,.48,.43,skin,0,2.11,-.18);
    box('Black hair',.46,.14,.45,black,0,2.33,-.18);
    box('Hair at back',.45,.35,.08,black,0,2.15,-.41);
    for(const x of [-.11,.11]){
      box('Glasses frame',.19,.105,.035,black,x,2.16,.047);
      box('Glasses lens',.135,.065,.012,0xb1cbd2,x,2.16,.068);
      box('Eye',.025,.025,.013,black,x,2.16,.078);
    }
    box('Glasses bridge',.055,.025,.04,black,0,2.17,.05);
    box('Nose',.065,.09,.065,skin,0,2.075,.057);
    box('Goatee',.16,.16,.025,black,0,1.97,.047);
    box('Moustache',.19,.035,.03,black,0,2.03,.054);
    box('Steering column',.055,.45,.055,dark,0,1.15,.33).rotation.x=-.3;
    const steeringGeometry=new THREE.TorusGeometry(.18,.025,5,12);geometries.add(steeringGeometry);
    const steering=new THREE.Mesh(steeringGeometry,mat(dark));steering.name='Steering wheel';steering.rotation.x=-Math.PI/3;steering.position.set(0,1.34,.27);group.add(steering);
    scene.add(group);
    // These rectangles include the visible table tops and stools, whose meshes
    // extend farther than their underlying collision blocks.
    const tables=(api.tables||[]).map(([x,z])=>({minX:x-.76,maxX:x+2.06,minZ:z-.88,maxZ:z+1.78}));
    const touches=(x,z,rect)=>Math.hypot(Math.max(rect.minX-x,0,x-rect.maxX),Math.max(rect.minZ-z,0,z-rect.maxZ))<RADIUS;
    function fits(x,z){
      if(x-RADIUS<bounds.minX||x+RADIUS>bounds.maxX+1||z-RADIUS<bounds.minZ||z+RADIUS>bounds.maxZ+1)return false;
      if(tables.some(rect=>touches(x,z,rect)))return false;
      for(let xx=Math.floor(x-RADIUS);xx<=Math.floor(x+RADIUS);xx++)for(let zz=Math.floor(z-RADIUS);zz<=Math.floor(z+RADIUS);zz++){
        if(!touches(x,z,{minX:xx,maxX:xx+1,minZ:zz,maxZ:zz+1}))continue;
        if(walkFeet(xx,zz,FLOOR)!==FLOOR)return false;
        for(let yy=FLOOR;yy<Math.ceil(FLOOR+HEIGHT);yy++)if(getBlock(xx,yy,zz))return false;
      }
      return true;
    }
    const lineFits=(a,b)=>{
      const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.15));
      for(let i=1;i<=steps;i++)if(!fits(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
      return true;
    };
    let route=[],length=0,distance=0,lastMinute=null,phase='off-duty',blocked=false;
    const sample={x:0,z:0,yaw:0},next={x:0,z:0,yaw:0};
    function buildRoute(){
      const cells=new Map();
      for(let z=bounds.minZ;z<=bounds.maxZ;z++)for(let x=bounds.minX;x<=bounds.maxX;x++)if(fits(x+.5,z+.5))cells.set(x+','+z,{x:x+.5,z:z+.5,cx:x,cz:z});
      const candidates=[...cells.values()].sort((a,b)=>Math.hypot(a.x-46.5,a.z+4.5)-Math.hypot(b.x-46.5,b.z+4.5));
      if(!candidates.length){route=[];length=0;return;}
      // A closed, deterministic sweep through connected safe aisle cells. Every
      // turn clears the scrubber's full radius, not just the driver's feet.
      const seen=new Set(),points=[];
      function visit(cell){
        seen.add(cell.cx+','+cell.cz);points.push(cell);
        for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]]){
          const key=(cell.cx+dx)+','+(cell.cz+dz),neighbor=cells.get(key);
          if(neighbor&&!seen.has(key)&&lineFits(cell,neighbor)){visit(neighbor);points.push(cell);}
        }
      }
      visit(candidates[0]);length=0;
      route=points.map((p,i)=>{if(i)length+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);return{x:p.x,z:p.z,d:length};});
    }
    function at(distance,out){
      if(!route.length)return false;
      const d=length?((distance%length)+length)%length:0;
      let i=1;while(i<route.length-1&&route[i].d<d)i++;
      const a=route[i-1]||route[0],b=route[i]||a,t=(d-a.d)/((b.d-a.d)||1);
      out.x=a.x+(b.x-a.x)*t;out.z=a.z+(b.z-a.z)*t;out.yaw=Math.atan2(b.x-a.x,b.z-a.z);return true;
    }
    function sync(time){
      lastMinute=minutes(time);blocked=false;
      if(!onDuty(time)){phase='off-duty';group.visible=false;return;}
      buildRoute();distance=Math.max(0,(lastMinute-START_MINUTE)/1.2*SPEED);
      group.visible=at(distance,sample)&&fits(sample.x,sample.z);phase=group.visible?'cleaning':'blocked';
      if(group.visible){group.position.set(sample.x,FLOOR,sample.z);group.rotation.y=sample.yaw;}
    }
    function update(dt,time){
      if(api.isActive&&!api.isActive())return;
      if(!Number.isFinite(dt)||dt<0||!Number.isFinite(time))return;
      const minute=minutes(time);
      if(!onDuty(time)){phase='off-duty';group.visible=false;lastMinute=minute;return;}
      if(lastMinute===null||phase==='off-duty'||minute<lastMinute||Math.abs(minute-lastMinute-dt*1.2)>.5){sync(time);return;}
      lastMinute=minute;
      if(!route.length){sync(time);return;}
      if(!fits(group.position.x,group.position.z)){group.visible=false;phase='blocked';blocked=true;return;}
      group.visible=true;blocked=false;
      // Follow every short portion of the route so even a large frame cannot
      // tunnel through a new student-placed block or across a turn.
      let remaining=Math.min(dt,1)*SPEED,moved=0;
      while(remaining>1e-8){
        const step=Math.min(.08,remaining);at(distance+step,next);
        if(!lineFits(group.position,next)){blocked=true;break;}
        distance+=step;remaining-=step;moved+=step;
        group.position.set(next.x,FLOOR,next.z);group.rotation.y=next.yaw;
      }
      phase=blocked?'blocked':'cleaning';
      for(const wheel of wheels)wheel.rotation.x+=moved/.25;
      for(const brush of brushes)brush.rotation.y+=moved*8;
    }
    function dispose(){scene.remove(group);for(const geometry of geometries)geometry.dispose();for(const material of materials.values())material.dispose();}
    sync(Number.isFinite(api.initialTime)?api.initialTime:0);
    return {group,update,sync,fits,dispose,get route(){return route;},get phase(){return phase;},get blocked(){return blocked;},radius:RADIUS};
  }
  root.MYNE_CAFETERIA_CLEANER=Object.freeze({create,onDuty,minutes,startMinute:START_MINUTE,endMinute:END_MINUTE});
})(globalThis);
