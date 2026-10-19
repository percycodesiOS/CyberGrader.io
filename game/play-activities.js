/* Optional play activities. No DOM, input listeners, storage or timers: the host
 * owns controls and save lifecycle. The same update path serves keys and touch. */
(function (root) {
  'use strict';
  const LIMIT = 48;
  const CAMPUS = { x: 86, y: 5, z: 31.5, ends: [22, 41] };
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const kinds = ['horse', 'cat', 'dog', 'cow', 'sheep', 'fish'];
  const worlds = ['campus', 'hardcore'];
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const point = value => record(value) && finite(value.x) && Math.abs(value.x) <= 512 && finite(value.y) && value.y >= -64 && value.y <= 80 && finite(value.z) && Math.abs(value.z) <= 512;
  // Validate before the host replaces a world. No coercion and no partial import.
  function validateSerialized(data) {
    return record(data) && data.version === 1 && record(data.score) && worlds.every(world => Number.isInteger(data.score[world]) && data.score[world] >= 0 && data.score[world] <= 999999) && record(data.cars) && Object.keys(data.cars).every(world => worlds.includes(world) && point(data.cars[world]) && finite(data.cars[world].yaw) && Math.abs(data.cars[world].yaw) <= 1000000) && Array.isArray(data.animals) && data.animals.length <= LIMIT && data.animals.every(p => point(p) && kinds.includes(p.kind) && worlds.includes(p.world));
  }
  function create(api) {
    const { THREE, scene, player, getBlock, isSolid, groundSurface } = api;
    const active = () => !api.isActive || api.isActive();
    const worldKey = () => api.isHardcore && api.isHardcore() ? 'hardcore' : 'campus';
    const report = text => api.reportStatus && api.reportStatus(text);
    const changed = () => api.onChange && api.onChange();
    const inBounds = (x, z) => finite(x) && finite(z) && (api.inBounds ? api.inBounds(x, z) : Math.abs(x) <= 96 && Math.abs(z) <= 96);
    const group = new THREE.Group(); group.name = 'MYnecraft play activities'; scene.add(group);
    const materials = new Map();
    const material = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color })); return materials.get(color); };
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const box = (parent, w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(boxGeometry, material(color)); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const villageCourt = new THREE.Group(); group.add(villageCourt);
    // Keep the new village court separate from the school's existing marked court.
    box(villageCourt, 14, .035, 23, 0x59788a, 0, .02, 0);
    for (const x of [-6.5, 6.5]) box(villageCourt, .08, .02, 22, 0xf6efd9, x, .05, 0);
    for (const z of [-11, 0, 11]) box(villageCourt, 13, .02, .08, 0xf6efd9, 0, .05, z);
    const hoopGeometry = new THREE.TorusGeometry(.43, .055, 5, 12);
    for (const z of [-10.2, 10.2]) {
      box(villageCourt, .15, 4, .15, 0x334351, 0, 2, z);
      box(villageCourt, 2.2, 1.35, .15, 0xf2f0e8, 0, 3.6, z);
      const hoop = new THREE.Mesh(hoopGeometry, material(0xd97531)); hoop.rotation.x = Math.PI / 2; hoop.position.set(0, 3.15, z + (z < 0 ? .7 : -.7)); villageCourt.add(hoop);
    }
    const carGroup = new THREE.Group(); carGroup.name = 'Driveable school car'; group.add(carGroup);
    box(carGroup, 1.35, .55, 2.4, 0x2e8dce, 0, .65, 0);
    box(carGroup, 1.18, .65, 1.15, 0x91d6f4, 0, 1.22, .03);
    box(carGroup, 1.22, .12, 1.22, 0x1d5d91, 0, 1.59, .03);
    for (const x of [-.7, .7]) for (const z of [-.78, .78]) box(carGroup, .2, .5, .5, 0x25313e, x, .33, z);
    for (const x of [-.46, .46]) { box(carGroup, .3, .14, .06, 0xffefaa, x, .73, -1.23); box(carGroup, .3, .14, .06, 0xc95046, x, .73, 1.23); }
    const ballGeometry = new THREE.SphereGeometry(.28, 12, 8);
    const ballMesh = new THREE.Mesh(ballGeometry, material(0xe6832b)); ballMesh.name = 'Playable basketball'; group.add(ballMesh);
    // Dark seams give the basketball a familiar silhouette at low resolution.
    for (const rotation of [0, Math.PI / 2]) { const seam = new THREE.Mesh(new THREE.TorusGeometry(.282, .013, 4, 20), material(0x593622)); seam.rotation.y = rotation; ballMesh.add(seam); }
    const ball = { pos: new THREE.Vector3(), velocity: new THREE.Vector3(), held: false, flight: false, scored: false };
    const car = { pos: new THREE.Vector3(), yaw: 0, speed: 0, driving: false };
    const entities = [];
    let currentWorld = null, court = CAMPUS, score = { campus: 0, hardcore: 0 }, carPositions = {}, defaultsSpawned = new Set();

    function landFits(x, y, z, radius = .35, height = 1.6) {
      if (!inBounds(x - radius, z - radius) || !inBounds(x + radius, z + radius)) return false;
      for (const dx of [-radius, 0, radius]) for (const dz of [-radius, 0, radius]) {
        if (Math.abs(groundSurface(x + dx, z + dz) - y) > .35) return false;
        if (getBlock(Math.floor(x + dx), Math.floor(y), Math.floor(z + dz)) === 'water') return false;
        for (let yy = Math.floor(y + .05); yy <= Math.floor(y + height); yy++) if (isSolid(Math.floor(x + dx), yy, Math.floor(z + dz))) return false;
      }
      return true;
    }
    function fishFits(x, y, z) {
      if (!inBounds(x, z)) return false;
      for (const dx of [-.22, .22]) for (const dy of [-.12, .12]) for (const dz of [-.22, .22]) if (getBlock(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz)) !== 'water') return false;
      return true;
    }
    function animalMesh(kind) {
      const mesh = new THREE.Group(), legs = [], fish = kind === 'fish', cat = kind === 'cat', horse = kind === 'horse';
      const coat = fish ? 0xf0a03e : cat ? 0xdca66d : horse ? 0x92623d : kind === 'sheep' ? 0xeee8d7 : kind === 'dog' ? 0xc9a274 : 0x79513a;
      if (fish) {
        box(mesh, .32, .25, .58, coat, 0, 0, 0); box(mesh, .4, .3, .1, 0xd9732e, 0, 0, -.34);
        for (const x of [-.17, .17]) box(mesh, .025, .05, .05, 0x202530, x, .04, .18);
      } else {
        const s = cat ? .55 : horse ? 1.12 : .8;
        box(mesh, .8 * s, .65 * s, 1.2 * s, coat, 0, .95 * s, 0);
        box(mesh, .48 * s, (horse ? .85 : .55) * s, .55 * s, coat, 0, (horse ? 1.4 : 1.12) * s, .64 * s);
        for (const x of [-.26, .26]) for (const z of [-.4, .4]) legs.push(box(mesh, .16 * s, .65 * s, .16 * s, coat, x * s, .33 * s, z * s));
        for (const x of [-.18, .18]) { box(mesh, .12 * s, .23 * s, .13 * s, coat, x * s, (horse ? 1.93 : 1.5) * s, .7 * s); box(mesh, .08 * s, .09 * s, .08 * s, 0x22242a, x * s, (horse ? 1.6 : 1.24) * s, .94 * s); }
        box(mesh, .12 * s, .46 * s, .12 * s, horse ? 0x403229 : coat, 0, .85 * s, -.68 * s);
        if (horse) box(mesh, .15, .66, .4, 0x403229, 0, 1.6, .43);
        if (kind === 'cow') box(mesh, .65, .25, .35, 0x342b28, 0, .86, -.2);
      }
      return { mesh, legs };
    }
    function addAnimal(kind, pos, world, placed) {
      const visuals = animalMesh(kind), entity = { kind, world, placed, pos: new THREE.Vector3(pos.x, pos.y, pos.z), home: new THREE.Vector3(pos.x, pos.y, pos.z), heading: Math.random() * Math.PI * 2, timer: 0, phase: 0, ...visuals };
      entity.mesh.name = 'Activity animal: ' + kind; entity.mesh.position.copy(entity.pos); entity.mesh.visible = world === currentWorld && (kind !== 'fish' || fishFits(pos.x, pos.y, pos.z)); group.add(entity.mesh); entities.push(entity); return entity;
    }
    function spawnAnimal(kind, pos) {
      kind = String(kind).toLowerCase();
      if (!active() || !kinds.includes(kind) || !pos || !finite(pos.x) || !finite(pos.z)) return false;
      if (entities.filter(e => e.placed).length >= LIMIT) { report('Your world has room for 48 placed animals.'); return false; }
      if (api.isUnlocked && !api.isUnlocked(kind)) { report(kind === 'fish' ? 'Build your first pond or fish tank to unlock fish.' : 'Complete a Hardcore goal to unlock this animal.'); return false; }
      const y = kind === 'fish' ? pos.y : groundSurface(pos.x, pos.z);
      if (!finite(y) || (kind === 'fish' ? !fishFits(pos.x, y, pos.z) : !landFits(pos.x, y, pos.z, kind === 'horse' ? .48 : .25, kind === 'horse' ? 2.2 : 1.4))) { report(kind === 'fish' ? 'Fish need water all around them. Place them inside your pond or tank.' : 'Choose clear, flat ground for your animal.'); return false; }
      addAnimal(kind, { x: pos.x, y, z: pos.z }, currentWorld, true); changed(); return true;
    }
    function resetBall() { ball.pos.set(court.x, court.y + .29, court.z); ball.velocity.set(0, 0, 0); ball.held = ball.flight = ball.scored = false; ballMesh.position.copy(ball.pos); }
    function setWorld() {
      const next = worldKey(); if (next === currentWorld) return;
      if (currentWorld) carPositions[currentWorld] = { x: car.pos.x, y: car.pos.y, z: car.pos.z, yaw: car.yaw };
      currentWorld = next; car.driving = false; car.speed = 0;
      const villageY = groundSurface(-29, 30);
      court = next === 'campus' ? CAMPUS : { x: -29, y: villageY, z: 30, ends: [20.5, 39.5] };
      villageCourt.position.set(-29, villageY, 30); villageCourt.visible = next === 'hardcore';
      const saved = carPositions[next], initial = next === 'campus' ? { x: 30, z: 60 } : { x: 5, z: 24 };
      car.pos.set(saved ? saved.x : initial.x, groundSurface(saved ? saved.x : initial.x, saved ? saved.z : initial.z), saved ? saved.z : initial.z); car.yaw = saved ? saved.yaw : 0;
      carGroup.position.copy(car.pos); carGroup.rotation.y = car.yaw;
      resetBall();
      if (!defaultsSpawned.has(next)) {
        const seeds = next === 'campus' ? [['horse', -19, 17], ['cat', 15, 13]] : [['horse', -12, 14], ['cat', -9, 15], ['cow', -11, 18], ['sheep', -8, 18], ['dog', -6, 17]];
        for (const [kind, x, z] of seeds) {
          let spot=null;
          for(let r=0;r<=10&&!spot;r++)for(let dx=-r;dx<=r&&!spot;dx++)for(let dz=-r;dz<=r&&!spot;dz++){
            if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
            const xx=Math.floor(x+dx)+.5,zz=Math.floor(z+dz)+.5,y=groundSurface(xx,zz);
            if(landFits(xx,y,zz,kind==='horse'?.48:.3,kind==='horse'?2.2:1.4))spot={x:xx,y,z:zz};
          }
          if(spot)addAnimal(kind,spot,next,false);
        }
        defaultsSpawned.add(next);
      }
      for (const entity of entities) entity.mesh.visible = entity.world === next && (entity.kind !== 'fish' || fishFits(entity.pos.x, entity.pos.y, entity.pos.z));
    }
    function exitCar() {
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2.5], [0, -2.5], [3, 3], [-3, -3]]) {
        const x = car.pos.x + dx, z = car.pos.z + dz, y = groundSurface(x, z);
        if (landFits(x, y, z, player.radius || .3, player.height || 1.7)) { car.driving = false; car.speed = 0; player.pos.set(x, y + (player.height || 1.7) + .05, z); player.vel.set(0, 0, 0); report('Parked! You are safely beside the car.'); changed(); return true; }
      }
      report('No clear place to exit here. Drive to open ground first.'); return true;
    }
    function shoot() {
      ball.held = false; ball.flight = true; ball.scored = false;
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      ball.velocity.set(fx * 8, 7.5, fz * 8);
      let target = null, best = Infinity;
      for (const z of court.ends) {
        const dx = court.x - ball.pos.x, dz = z - ball.pos.z, d = Math.hypot(dx, dz);
        // Friendly aim assist still requires facing a hoop from shooting range.
        if (d > 1.2 && d < 15 && (dx * fx + dz * fz) / d > .95 && d < best) { target = { x: court.x, y: court.y + 3.15, z }; best = d; }
      }
      if (target) { const t = clamp(best / 7, 1.15, 2); ball.velocity.set((target.x - ball.pos.x) / t, (target.y - ball.pos.y + 6 * t * t) / t, (target.z - ball.pos.z) / t); }
      report('Shot! Face a hoop from the court to line up your next basket.'); return true;
    }
    function interact() {
      if (!active()) return false; setWorld();
      if (car.driving) return exitCar();
      if (ball.held) return shoot();
      if (distance(player.pos, car.pos) < 3 && Math.abs(player.pos.y - car.pos.y) < 4) { car.driving = true; car.speed = 0; player.flying = false; player.vel.set(0, 0, 0); player.yaw = car.yaw; report('Drive slowly with forward/back and left/right. Use Interact again to park and get out.'); return true; }
      if (distance(player.pos, ball.pos) < 2.5 && Math.abs(player.pos.y - ball.pos.y) < 3 && !ball.flight) { ball.held = true; report('You have the ball! Face either hoop and use Interact to shoot.'); return true; }
      return false;
    }
    function getPrompt() {
      if (car.driving) return 'Park / get out';
      if (ball.held) return 'Shoot basketball';
      if (distance(player.pos, car.pos) < 3 && Math.abs(player.pos.y - car.pos.y) < 4) return 'Drive car';
      if (!ball.flight && distance(player.pos, ball.pos) < 2.5 && Math.abs(player.pos.y - ball.pos.y) < 3) return 'Pick up basketball';
      return '';
    }
    function updateCar(dt, controls) {
      if (!car.driving) return;
      const forward = clamp(Number(controls.forward) || 0, -1, 1), turn = clamp(Number(controls.turn) || 0, -1, 1);
      car.speed += (forward * (forward > 0 ? 5 : 2.5) - car.speed) * Math.min(1, dt * 5);
      if (Math.abs(car.speed) < .01) car.speed = 0;
      car.yaw -= turn * dt * 1.5 * Math.min(1, Math.abs(car.speed) / 2) * (car.speed < 0 ? -1 : 1);
      const steps = Math.max(1, Math.ceil(Math.abs(car.speed * dt) / .15));
      for (let i = 0; i < steps; i++) {
        const x = car.pos.x - Math.sin(car.yaw) * car.speed * dt / steps, z = car.pos.z - Math.cos(car.yaw) * car.speed * dt / steps, y = groundSurface(x, z);
        // A conservative enclosing footprint prevents rotating through walls too.
        if (Math.abs(y - car.pos.y) <= .35 && landFits(x, y, z, 1.35, 1.7)) car.pos.set(x, y, z); else { car.speed = 0; break; }
      }
      player.pos.set(car.pos.x, car.pos.y + 2, car.pos.z); player.yaw = car.yaw; player.vel.set(0, 0, 0); player.onGround = true;
      carGroup.position.copy(car.pos); carGroup.rotation.y = car.yaw;
    }
    function updateBall(dt) {
      if (ball.held) ball.pos.set(player.pos.x - Math.sin(player.yaw) * .7, player.pos.y - .45, player.pos.z - Math.cos(player.yaw) * .7);
      else if (ball.flight) {
        const oldY = ball.pos.y, oldX = ball.pos.x, oldZ = ball.pos.z;
        ball.pos.x += ball.velocity.x * dt; ball.pos.z += ball.velocity.z * dt; ball.pos.y += ball.velocity.y * dt - 6 * dt * dt; ball.velocity.y -= 12 * dt;
        const rimY = court.y + 3.15;
        if (!ball.scored && oldY > rimY && ball.pos.y <= rimY && ball.velocity.y < 0) {
          const t = (oldY - rimY) / (oldY - ball.pos.y), x = oldX + (ball.pos.x - oldX) * t, z = oldZ + (ball.pos.z - oldZ) * t;
          if (court.ends.some(end => Math.hypot(x - court.x, z - end) < .43)) { ball.scored = true; score[currentWorld]++; report('Basket! Your score: ' + score[currentWorld] + '.'); if (api.onScore) api.onScore(score[currentWorld]); changed(); }
        }
        if (!inBounds(ball.pos.x, ball.pos.z) || distance(ball.pos, { x: court.x, z: court.z }) > 32 || ball.pos.y < -30) { resetBall(); return; }
        const floor = groundSurface(ball.pos.x, ball.pos.z) + .29;
        if (isSolid(Math.floor(ball.pos.x), Math.floor(ball.pos.y), Math.floor(ball.pos.z)) && ball.pos.y > floor + .1) { ball.velocity.x *= -.3; ball.velocity.z *= -.3; ball.pos.x = oldX; ball.pos.z = oldZ; }
        if (ball.pos.y <= floor && ball.velocity.y < 0) { ball.pos.y = floor; ball.velocity.y *= -.42; ball.velocity.x *= .62; ball.velocity.z *= .62; if (Math.abs(ball.velocity.y) < 1.2) { ball.flight = false; ball.velocity.set(0, 0, 0); } }
      }
      ballMesh.position.copy(ball.pos); if (ball.flight) ballMesh.rotation.x += dt * 4;
    }
    function updateAnimals(dt) {
      for (const entity of entities) {
        if (entity.world !== currentWorld) continue;
        const fish = entity.kind === 'fish';
        // Removing a tank's water hides its fish until that water is restored.
        entity.mesh.visible = !fish || fishFits(entity.pos.x, entity.pos.y, entity.pos.z);
        if (!entity.mesh.visible) continue;
        entity.timer -= dt; entity.phase += dt * 5;
        if (entity.timer <= 0) { entity.heading = Math.random() * Math.PI * 2; entity.timer = 1 + Math.random() * 4; }
        const speed = fish ? .5 : entity.kind === 'horse' ? .8 : .5, x = entity.pos.x + Math.sin(entity.heading) * dt * speed, z = entity.pos.z + Math.cos(entity.heading) * dt * speed;
        const y = fish ? entity.pos.y : groundSurface(x, z);
        const allowed = fish ? fishFits(x, y, z) : Math.abs(y - entity.pos.y) <= .35 && distance({ x, z }, entity.home) < 9 && landFits(x, y, z, entity.kind === 'horse' ? .48 : .25, entity.kind === 'horse' ? 2.2 : 1.4);
        if (allowed) entity.pos.set(x, y, z); else { entity.heading += Math.PI * .7; entity.timer = .5; }
        for (let i = 0; i < entity.legs.length; i++) entity.legs[i].rotation.x = allowed ? Math.sin(entity.phase + (i % 2) * Math.PI) * .28 : 0;
        entity.mesh.position.copy(entity.pos); entity.mesh.rotation.y = entity.heading;
      }
    }
    function update(dt, controls = {}) { setWorld(); if (!active() || !finite(dt) || dt <= 0) return; dt = Math.min(dt, .05); updateCar(dt, controls); updateBall(dt); updateAnimals(dt); }
    function serialize() {
      carPositions[currentWorld] = { x: car.pos.x, y: car.pos.y, z: car.pos.z, yaw: car.yaw };
      return { version: 1, score: { ...score }, cars: JSON.parse(JSON.stringify(carPositions)), animals: entities.filter(e => e.placed).map(e => ({ kind: e.kind, world: e.world, x: e.pos.x, y: e.pos.y, z: e.pos.z })) };
    }
    function restore(data) {
      // Missing optional activities data is a valid legacy save, and must clear
      // animals from the previously open world rather than leak them into it.
      if (data == null) data = { version: 1, score: { campus: 0, hardcore: 0 }, cars: {}, animals: [] };
      if (!validateSerialized(data)) return false;
      for (let i = entities.length - 1; i >= 0; i--) if (entities[i].placed) { group.remove(entities[i].mesh); entities.splice(i, 1); }
      carPositions = {};
      for (const world of worlds) { score[world] = data.score[world]; const p = data.cars[world]; if (p && inBounds(p.x, p.z)) carPositions[world] = { x: p.x, y: p.y, z: p.z, yaw: p.yaw }; }
      for (const p of data.animals) if (inBounds(p.x, p.z)) addAnimal(p.kind, p, p.world, true);
      const saved = carPositions[currentWorld], initial = currentWorld === 'campus' ? { x: 30, z: 60, yaw: 0 } : { x: 5, z: 24, yaw: 0 };
      const position = saved && landFits(saved.x, groundSurface(saved.x, saved.z), saved.z, 1.35, 1.7) ? saved : initial;
      car.pos.set(position.x, groundSurface(position.x, position.z), position.z); car.yaw = position.yaw; carGroup.position.copy(car.pos); carGroup.rotation.y = car.yaw;
      car.driving = false; car.speed = 0;
      resetBall(); return true;
    }
    function dispose() { scene.remove(group); const geometries = new Set(); group.traverse(node => { if (node.geometry) geometries.add(node.geometry); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }
    setWorld();
    return { update, interact, getPrompt, isDriving: () => car.driving, spawnAnimal, serialize, restore, setWorld, dispose };
  }
  root.MYNE_ACTIVITIES = Object.freeze({ create, validateSerialized });
})(globalThis);
