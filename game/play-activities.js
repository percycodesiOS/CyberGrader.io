/* Optional play activities. No DOM, input listeners, storage or timers: the host
 * owns controls and save lifecycle. The same update path serves keys and touch. */
(function (root) {
  'use strict';
  const LIMIT = 48;
  const FISH_GROWTH_SECONDS = 120;
  // Rapid PLACE taps used to stack dozens of animals on one block.
  const PLACE_COOLDOWN = .35, ANIMAL_GAP = .9, STUCK_SECONDS = 3;
  const CONFETTI_PIECES = 96, CONFETTI_SECONDS = 3.4;
  const SIT_DROP = .55;
  const CAMPUS = { x: 86, y: 5, z: 31.5, ends: [22, 41] };
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const kinds = ['horse', 'cat', 'dog', 'cow', 'sheep', 'fish'];
  const worlds = ['campus', 'hardcore'];
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const point = value => record(value) && finite(value.x) && Math.abs(value.x) <= 512 && finite(value.y) && value.y >= -64 && value.y <= 80 && finite(value.z) && Math.abs(value.z) <= 512;
  // Validate before the host replaces a world. No coercion and no partial import.
  function validateSerialized(data) {
    return record(data) && data.version === 1 && record(data.score) && worlds.every(world => Number.isInteger(data.score[world]) && data.score[world] >= 0 && data.score[world] <= 999999) && (data.catches === undefined || (record(data.catches) && worlds.every(world => Number.isInteger(data.catches[world]) && data.catches[world] >= 0 && data.catches[world] <= 999999))) && record(data.cars) && Object.keys(data.cars).every(world => worlds.includes(world) && point(data.cars[world]) && finite(data.cars[world].yaw) && Math.abs(data.cars[world].yaw) <= 1000000) && Array.isArray(data.animals) && data.animals.length <= LIMIT && data.animals.every(p => point(p) && kinds.includes(p.kind) && worlds.includes(p.world) && (p.age === undefined || (p.kind === 'fish' && finite(p.age) && p.age >= 0 && p.age <= FISH_GROWTH_SECONDS)));
  }
  function create(api) {
    const { THREE, scene, player, getBlock, isSolid, groundSurface } = api;
    const active = () => !api.isActive || api.isActive();
    const worldKey = () => api.isHardcore && api.isHardcore() ? 'hardcore' : 'campus';
    const report = text => api.reportStatus && api.reportStatus(text);
    const changed = () => api.onChange && api.onChange();
    const random = () => { const r = api.random ? Number(api.random()) : Math.random(); return finite(r) ? clamp(r, 0, .999999) : .5; };
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
    const ball = { pos: new THREE.Vector3(), velocity: new THREE.Vector3(), held: false, flight: false, scored: false, shot: false };
    const car = { pos: new THREE.Vector3(), yaw: 0, speed: 0, driving: false };
    const entities = [];
    const confetti = new THREE.Group(); confetti.name = 'Basket confetti'; group.add(confetti);
    const confettiColors = [0xf5c843, 0x4bb8ef, 0xeb637c, 0x62cc8a, 0xb07be8, 0xffffff];
    const confettiPieces = Array.from({ length: CONFETTI_PIECES }, (_, i) => {
      const mesh = box(confetti, .24, .045, .17, confettiColors[i % confettiColors.length], 0, 0, 0);
      return { mesh, velocity: new THREE.Vector3() };
    });
    confetti.visible = false;
    // A held cup of tea. It sits just below the camera, like the fishing rod.
    const teaCup = new THREE.Group(); teaCup.name = 'Cup of tea'; group.add(teaCup); teaCup.visible = false;
    // A bright blue mug with a white rim and handle, so it never reads as a stone block.
    box(teaCup, .2, .2, .2, 0x5fb4e8, 0, 0, 0); box(teaCup, .21, .03, .21, 0xffffff, 0, .09, 0); box(teaCup, .17, .02, .17, 0xa0602e, 0, .1, 0);
    box(teaCup, .05, .12, .04, 0xffffff, .125, .01, 0); box(teaCup, .3, .025, .3, 0xffffff, 0, -.11, 0);
    const steam = Array.from({ length: 3 }, (_, i) => box(teaCup, .05, .05, .05, 0xffffff, (i - 1) * .04, .18 + i * .06, 0));
    const tea = { held: false, sitting: false, elapsed: 0 };
    const rod = new THREE.Group(); rod.name = 'Fishing rod'; group.add(rod); rod.visible = false;
    box(rod, .06, .06, 1.7, 0x9b6c3e, .3, 0, -.75);
    box(rod, .1, .14, .18, 0x354d59, .3, -.03, -.15);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xf8f3df });
    const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const fishingLine = new THREE.Line(lineGeometry, lineMaterial); fishingLine.visible = false; group.add(fishingLine);
    const bobber = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 4), material(0xf4ce4a)); bobber.visible = false; group.add(bobber);
    const fishingTip = new THREE.Vector3();
    let currentWorld = null, court = CAMPUS, score = { campus: 0, hardcore: 0 }, catches = { campus: 0, hardcore: 0 }, carPositions = {}, defaultsSpawned = new Set();
    let confettiLife = 0, rodSelected = false, cast = null, playTime = 0, lastPlacedAt = -Infinity;

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
    // The car's real footprint, turned with it. Its wheels roll over one-block
    // curbs and steps; anything that reaches the cabin, or water, stops it.
    function carFits(x, y, z, yaw) {
      const s = Math.sin(yaw), c = Math.cos(yaw);
      for (const lx of [-.62, 0, .62]) for (const lz of [-1.18, 0, 1.18]) {
        const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
        if (!inBounds(px, pz)) return false;
        if (getBlock(Math.floor(px), Math.floor(y - .5), Math.floor(pz)) === 'water' || getBlock(Math.floor(px), Math.floor(y), Math.floor(pz)) === 'water') return false;
        for (let yy = Math.floor(y + 1.05); yy <= Math.floor(y + 1.65); yy++) if (isSolid(Math.floor(px), yy, Math.floor(pz))) return false;
      }
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
      const visuals = animalMesh(kind), entity = { kind, world, placed, age: kind === 'fish' ? pos.age || 0 : 0, pos: new THREE.Vector3(pos.x, pos.y, pos.z), home: new THREE.Vector3(pos.x, pos.y, pos.z), heading: Math.random() * Math.PI * 2, timer: 0, phase: 0, ...visuals };
      if (kind === 'fish') entity.mesh.scale.setScalar(.55 + .45 * entity.age / FISH_GROWTH_SECONDS);
      entity.mesh.name = 'Activity animal: ' + kind; entity.mesh.position.copy(entity.pos); entity.mesh.visible = world === currentWorld && (kind !== 'fish' || fishFits(pos.x, pos.y, pos.z)); group.add(entity.mesh); entities.push(entity); return entity;
    }
    function spawnAnimal(kind, pos) {
      kind = String(kind).toLowerCase();
      if (!active() || !kinds.includes(kind) || !pos || !finite(pos.x) || !finite(pos.z)) return false;
      if (playTime - lastPlacedAt < PLACE_COOLDOWN) return false;
      if (entities.filter(e => e.placed).length >= LIMIT) { report('Your world has room for 48 placed animals. Aim at one and use Interact to put it away.'); return false; }
      if (api.isUnlocked && !api.isUnlocked(kind)) { report(kind === 'fish' ? 'Build your first pond or fish tank to unlock fish.' : 'Complete a Hardcore goal to unlock this animal.'); return false; }
      const y = kind === 'fish' ? pos.y : groundSurface(pos.x, pos.z);
      if (!finite(y) || (kind === 'fish' ? !fishFits(pos.x, y, pos.z) : !landFits(pos.x, y, pos.z, kind === 'horse' ? .48 : .25, kind === 'horse' ? 2.2 : 1.4))) { report(kind === 'fish' ? 'Fish need water all around them. Place them inside your pond or tank.' : 'Choose clear, flat ground for your animal.'); return false; }
      if (entities.some(e => e.world === currentWorld && (e.kind === 'fish') === (kind === 'fish') && distance(e.pos, pos) < ANIMAL_GAP && Math.abs(e.pos.y - y) < 2)) { report('An animal is already standing there. Pick a different spot.'); return false; }
      lastPlacedAt = playTime;
      addAnimal(kind, { x: pos.x, y, z: pos.z }, currentWorld, true); changed(); return true;
    }
    // Only animals the player placed can be put away; the world's own animals stay.
    function aimedAnimal(origin, dir, reach = 4) {
      let best = null, bestT = reach;
      for (const e of entities) {
        if (!e.placed || e.world !== currentWorld || !e.mesh.visible) continue;
        const r = e.kind === 'horse' ? .9 : e.kind === 'fish' ? .4 : .65, cy = e.kind === 'fish' ? e.pos.y : e.pos.y + (e.kind === 'horse' ? 1.1 : .7);
        const ox = e.pos.x - origin.x, oy = cy - origin.y, oz = e.pos.z - origin.z, t = ox * dir.x + oy * dir.y + oz * dir.z;
        if (t < 0 || t > bestT) continue;
        const miss = Math.hypot(ox - dir.x * t, oy - dir.y * t, oz - dir.z * t);
        if (miss <= r) { best = e; bestT = t; }
      }
      return best;
    }
    function facingAnimal() {
      const cp = Math.cos(player.pitch || 0);
      return aimedAnimal(player.pos, { x: -Math.sin(player.yaw) * cp, y: Math.sin(player.pitch || 0), z: -Math.cos(player.yaw) * cp }) ||
        aimedAnimal(player.pos, { x: -Math.sin(player.yaw), y: -.45, z: -Math.cos(player.yaw) }, 3);
    }
    function removeEntity(e) {
      if (cast && cast.target === e) cast = null;
      group.remove(e.mesh); entities.splice(entities.indexOf(e), 1);
    }
    function putAway(e) {
      if (!e) return false;
      removeEntity(e); report('The ' + e.kind + ' went home for a nap. Choose it again in Inventory any time.'); changed(); return true;
    }
    function putAwayAimed(origin, dir) { return active() && putAway(aimedAnimal(origin, dir)); }
    function putAwayAll() {
      let count = 0;
      for (let i = entities.length - 1; i >= 0; i--) if (entities[i].placed && entities[i].world === currentWorld) { removeEntity(entities[i]); count++; }
      if (count) changed();
      report(count ? (count === 1 ? 'Your animal went home for a nap.' : 'All ' + count + ' of your animals went home for a nap.') : 'You have no placed animals in this world.');
      return count;
    }
    const placedCount = () => entities.filter(e => e.placed && e.world === currentWorld).length;
    function resetBall() { ball.pos.set(court.x, court.y + .29, court.z); ball.velocity.set(0, 0, 0); ball.held = ball.flight = ball.scored = false; ballMesh.position.copy(ball.pos); }
    function setWorld() {
      const next = worldKey(); if (next === currentWorld) return;
      if (currentWorld) carPositions[currentWorld] = { x: car.pos.x, y: car.pos.y, z: car.pos.z, yaw: car.yaw };
      currentWorld = next; car.driving = false; car.speed = 0;
      unequipRod(); unequipTea(); confettiLife = 0; confetti.visible = false;
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
    // Chance of a basket: close, straight shots usually go in; long or crooked
    // shots can miss. Even the farthest aimed shot keeps a fair chance.
    function basketChance(d, aim) { return clamp(.97 - Math.max(0, d - 4) * .045 - (1 - aim) * 6, .4, .97); }
    function shoot() {
      ball.held = false; ball.flight = true; ball.scored = false; ball.shot = true;
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      ball.velocity.set(fx * 8, 7.5, fz * 8);
      let target = null, best = Infinity, aim = 0;
      for (const z of court.ends) {
        const dx = court.x - ball.pos.x, dz = z - ball.pos.z, d = Math.hypot(dx, dz), facing = (dx * fx + dz * fz) / d;
        // Friendly aim assist still requires facing a hoop from shooting range.
        if (d > 1.2 && d < 15 && facing > .95 && d < best) { target = { x: court.x, y: court.y + 3.15, z }; best = d; aim = facing; }
      }
      if (target) {
        if (random() >= basketChance(best, aim)) {
          // A miss lands just beside the rim, never through it.
          const side = random() < .5 ? -1 : 1, off = .62 + random() * .3, sx = -fz * side, sz = fx * side;
          target.x += sx * off; target.z += sz * off - fz * .15;
        }
        const t = clamp(best / 7, 1.15, 2); ball.velocity.set((target.x - ball.pos.x) / t, (target.y - ball.pos.y + 6 * t * t) / t, (target.z - ball.pos.z) / t);
        report('Shot!');
      } else report('Shot! Face a hoop from the court to line up your next basket.');
      return true;
    }
    const nearCar = () => distance(player.pos, car.pos) < 3 && Math.abs(player.pos.y - car.pos.y) < 4;
    const nearBall = () => !ball.flight && distance(player.pos, ball.pos) < 2.5 && Math.abs(player.pos.y - ball.pos.y) < 3;
    function interact() {
      if (!active()) return false; setWorld();
      if (car.driving) return exitCar();
      if (ball.held) return shoot();
      if (tea.held) return toggleSit();
      if (rodSelected) return castRod();
      if (nearCar()) { car.driving = true; car.speed = 0; player.flying = false; player.vel.set(0, 0, 0); player.yaw = car.yaw; report('Driving! Forward and back to go, left and right to steer. Small curbs are fine. Use Interact again to park and get out.'); return true; }
      if (nearBall()) { ball.held = true; report('You have the ball! Face either hoop and use Interact to shoot.'); return true; }
      return putAway(facingAnimal());
    }
    function getPrompt() {
      if (car.driving) return 'Park / get out';
      if (ball.held) return 'Shoot basketball';
      if (tea.held) return tea.sitting ? 'Stand up' : 'Sit and drink tea';
      if (rodSelected) return cast ? 'Fishing…' : 'Cast fishing rod';
      if (nearCar()) return 'Drive car';
      if (nearBall()) return 'Pick up basketball';
      const animal = facingAnimal();
      return animal ? 'Put away ' + animal.kind : '';
    }
    function equipRod() {
      if (!active() || car.driving || ball.held) return false;
      if (api.isUnlocked && !api.isUnlocked('fish')) { report('Build a pond to unlock fish and the fishing rod.'); return false; }
      unequipTea(); rodSelected = true; report('Fishing rod ready! Face a grown fish in your pond, then use Interact.'); return true;
    }
    const feet = () => player.pos.y - (player.height || 1.7);
    function equipTea() {
      if (!active() || car.driving || ball.held) return false;
      unequipRod(); tea.held = true; tea.sitting = false;
      report('Cup of tea ready! Find a cozy spot, like a roof, and use Interact to sit down.'); return true;
    }
    function standUp(message) {
      if (!tea.sitting) return;
      tea.sitting = false; player.pos.y += SIT_DROP; player.vel.set(0, 0, 0);
      if (message) report(message);
    }
    function unequipTea() { standUp(); tea.held = false; teaCup.visible = false; }
    function toggleSit() {
      if (tea.sitting) { standUp('You stand up, warm and cozy. Use Interact to sit again.'); return true; }
      if (player.flying) { report('Land first, then use Interact to sit down with your tea.'); return true; }
      if (player.onGround === false || Math.abs(player.vel.y || 0) > .5) { report('Stand still on solid ground, then sit down.'); return true; }
      // Check the roof while still standing: the seated view is lower than the feet.
      const roof = api.isOnRoof ? api.isOnRoof() : false;
      tea.sitting = true; tea.elapsed = 0; player.vel.set(0, 0, 0); player.pos.y -= SIT_DROP;
      report(roof ? 'You sit on the roof with a warm cup of tea. What a view! Move to stand up.' : 'You sit down with a warm cup of tea. Move to stand up.');
      return true;
    }
    function updateTea(dt, controls) {
      teaCup.visible = tea.held;
      if (!tea.held) return;
      if (tea.sitting && (Number(controls.forward) || Number(controls.turn))) standUp('You stand up, warm and cozy. Use Interact to sit again.');
      if (tea.sitting) { player.vel.set(0, 0, 0); tea.elapsed += dt; }
      // Lift the cup for a sip every few seconds while sitting.
      const cycle = tea.elapsed % 5, sip = tea.sitting && cycle > 3.6 ? Math.sin((cycle - 3.6) / 1.4 * Math.PI) : 0;
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
      teaCup.position.set(player.pos.x + fx * (.7 - sip * .25) + rx * .2, player.pos.y - .46 + sip * .3, player.pos.z + fz * (.7 - sip * .25) + rz * .2);
      teaCup.rotation.set(sip * .5, player.yaw, 0);
      // Steam puffs are 5 cm cubes; they shrink as they rise (never scale to a full block).
      for (let i = 0; i < steam.length; i++) { const t = (tea.elapsed * .6 + i / steam.length) % 1; steam[i].position.y = .14 + t * .3; steam[i].scale.setScalar(.05 * (1 - t * .6)); steam[i].visible = !api.reducedMotion?.() || i === 0; }
    }
    function unequipRod() { rodSelected = false; cast = null; rod.visible = fishingLine.visible = bobber.visible = false; }
    function clearLineTo(entity) {
      const steps = Math.max(1, Math.ceil(player.pos.distanceTo(entity.pos) * 4));
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = player.pos.x + (entity.pos.x - player.pos.x) * t, y = player.pos.y + (entity.pos.y - player.pos.y) * t, z = player.pos.z + (entity.pos.z - player.pos.z) * t;
        if (isSolid(Math.floor(x), Math.floor(y), Math.floor(z))) return false;
      }
      return true;
    }
    function castRod() {
      if (cast) { report('Keep the line in the pond…'); return true; }
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      const nearby = entities.filter(e => e.world === currentWorld && e.kind === 'fish' && fishFits(e.pos.x, e.pos.y, e.pos.z) && distance(player.pos, e.pos) <= 5.5 && Math.abs(player.pos.y - e.pos.y) <= 4 && clearLineTo(e) && ((e.pos.x - player.pos.x) * fx + (e.pos.z - player.pos.z) * fz) / Math.max(.01, distance(player.pos, e.pos)) > .65).sort((a, b) => distance(player.pos, a.pos) - distance(player.pos, b.pos));
      const target = nearby.find(e => e.age >= FISH_GROWTH_SECONDS);
      if (!target) { report(nearby.length ? 'Your fish are still growing. Give them two minutes of active play in water.' : 'Face a nearby fish in your pond, with a clear view of the water.'); return true; }
      cast = { target, elapsed: 0 }; report('Line in! Keep close to your pond for a bite.'); return true;
    }
    function updateFishing(dt) {
      rod.visible = rodSelected;
      if (!rodSelected) return;
      rod.position.set(player.pos.x, player.pos.y - .6, player.pos.z); rod.rotation.y = player.yaw;
      if (cast && (!fishFits(cast.target.pos.x, cast.target.pos.y, cast.target.pos.z) || distance(player.pos, cast.target.pos) > 6 || !clearLineTo(cast.target))) { cast = null; report('Line retrieved. Stay near the water and keep a clear view.'); }
      if (cast) {
        cast.elapsed += dt;
        if (cast.elapsed >= 2) {
          const fish = cast.target; group.remove(fish.mesh); entities.splice(entities.indexOf(fish), 1); catches[currentWorld] = Math.min(999999, catches[currentWorld] + 1); cast = null;
          report('Caught a grown fish! Total caught in this world: ' + catches[currentWorld] + '. Add more fish from Inventory.'); changed();
        }
      }
      fishingLine.visible = bobber.visible = !!cast;
      if (cast) {
        rod.updateWorldMatrix(true, false);
        const tip = rod.localToWorld(fishingTip.set(.3, 0, -1.6)), p = cast.target.pos, coords = lineGeometry.attributes.position.array;
        coords[0] = tip.x; coords[1] = tip.y; coords[2] = tip.z; coords[3] = p.x; coords[4] = Math.floor(p.y) + 1.04; coords[5] = p.z;
        lineGeometry.attributes.position.needsUpdate = true; lineGeometry.computeBoundingSphere();
        bobber.position.set(p.x, Math.floor(p.y) + 1.04, p.z);
      }
    }
    // A big, bounded burst: three rings of different speeds shoot up and out.
    function celebrateBasket(x, y, z) {
      confetti.position.set(x, y, z); confetti.visible = true; confettiLife = CONFETTI_SECONDS;
      for (let i = 0; i < confettiPieces.length; i++) {
        const p = confettiPieces[i], ring = i % 3, angle = i * Math.PI * 2 / confettiPieces.length * 3 + ring * .7, out = 2.2 + ring * 1.3 + (i % 5) * .25;
        p.mesh.position.set(0, 0, 0); p.mesh.rotation.set(0, angle, 0); p.velocity.set(Math.sin(angle) * out, 3.6 + ring * 1.4 + (i % 7) * .3, Math.cos(angle) * out);
        if (api.reducedMotion?.()) p.mesh.position.set(Math.sin(angle) * (1 + ring * .6), .4 + (i % 6) * .25, Math.cos(angle) * (1 + ring * .6));
      }
    }
    function updateConfetti(dt) {
      if (confettiLife <= 0) return;
      confettiLife -= dt; confetti.visible = confettiLife > 0;
      if (api.reducedMotion?.()) return;
      // Air drag lets the pieces flutter down instead of dropping like stones.
      for (const p of confettiPieces) { p.velocity.x *= 1 - dt * .9; p.velocity.z *= 1 - dt * .9; p.velocity.y = Math.max(-1.6, p.velocity.y - dt * 5); p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.rotation.x += dt * 4; p.mesh.rotation.z += dt * 5; }
    }
    function updateCar(dt, controls) {
      if (!car.driving) return;
      const forward = clamp(Number(controls.forward) || 0, -1, 1), turn = clamp(Number(controls.turn) || 0, -1, 1);
      car.speed += (forward * (forward > 0 ? 5 : 2.5) - car.speed) * Math.min(1, dt * 5);
      if (Math.abs(car.speed) < .01) car.speed = 0;
      const yaw = car.yaw - turn * dt * 1.5 * Math.min(1, Math.abs(car.speed) / 2) * (car.speed < 0 ? -1 : 1);
      // Steering is checked with the turned footprint, so it never swings through a wall.
      if (yaw !== car.yaw && carFits(car.pos.x, car.pos.y, car.pos.z, yaw)) car.yaw = yaw;
      const steps = Math.max(1, Math.ceil(Math.abs(car.speed * dt) / .15));
      for (let i = 0; i < steps; i++) {
        const x = car.pos.x - Math.sin(car.yaw) * car.speed * dt / steps, z = car.pos.z - Math.cos(car.yaw) * car.speed * dt / steps, y = groundSurface(x, z);
        if (finite(y) && Math.abs(y - car.pos.y) <= 1.05 && carFits(x, y, z, car.yaw)) car.pos.set(x, y, z); else { car.speed = 0; break; }
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
          if (court.ends.some(end => Math.hypot(x - court.x, z - end) < .43)) { ball.scored = true; score[currentWorld] = Math.min(999999, score[currentWorld] + 1); celebrateBasket(x, rimY, z); report('Basket! Your score: ' + score[currentWorld] + '.'); if (api.onScore) api.onScore(score[currentWorld]); changed(); }
        }
        if (!inBounds(ball.pos.x, ball.pos.z) || distance(ball.pos, { x: court.x, z: court.z }) > 32 || ball.pos.y < -30) { resetBall(); return; }
        const floor = groundSurface(ball.pos.x, ball.pos.z) + .29;
        if (isSolid(Math.floor(ball.pos.x), Math.floor(ball.pos.y), Math.floor(ball.pos.z)) && ball.pos.y > floor + .1) { ball.velocity.x *= -.3; ball.velocity.z *= -.3; ball.pos.x = oldX; ball.pos.z = oldZ; }
        if (ball.pos.y <= floor && ball.velocity.y < 0) {
          ball.pos.y = floor; ball.velocity.y *= -.42; ball.velocity.x *= .62; ball.velocity.z *= .62;
          if (Math.abs(ball.velocity.y) < 1.2) {
            ball.flight = false; ball.velocity.set(0, 0, 0);
            if (ball.shot && !ball.scored) report('So close! Pick up the ball and try again. Shots from closer in go in more often.');
            ball.shot = false;
          }
        }
      }
      ballMesh.position.copy(ball.pos); if (ball.flight) ballMesh.rotation.x += dt * 4;
    }
    // Prefer open ground at the animal's own level, away from where it got stuck;
    // climbing on top of the blocks is only the last resort.
    function openSpotNear(kind, x, z, level, maxRadius = 8) {
      const r0 = kind === 'horse' ? .48 : .3, h = kind === 'horse' ? 2.2 : 1.4;
      for (const sameLevel of [true, false]) for (let r = sameLevel ? 1 : 0; r <= maxRadius; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (r && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const xx = Math.floor(x + dx) + .5, zz = Math.floor(z + dz) + .5, y = groundSurface(xx, zz);
        if (finite(y) && (!sameLevel || Math.abs(y - level) <= 1.05) && landFits(xx, y, zz, r0, h)) return { x: xx, y, z: zz };
      }
      return null;
    }
    // Is there a neighbouring block, at about the same level, that this animal fits on?
    function roomToWalk(entity) {
      const r0 = entity.kind === 'horse' ? .48 : .25, h = entity.kind === 'horse' ? 2.2 : 1.4, cx = Math.floor(entity.pos.x), cz = Math.floor(entity.pos.z);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const xx = cx + dx + .5, zz = cz + dz + .5, y = groundSurface(xx, zz);
        if (finite(y) && Math.abs(y - entity.pos.y) <= .35 && distance({ x: xx, z: zz }, entity.home) < 9 && landFits(xx, y, zz, r0, h)) return true;
      }
      return false;
    }
    function unstick(entity) {
      entity.stuck = 0;
      const spot = openSpotNear(entity.kind, entity.pos.x, entity.pos.z, entity.pos.y);
      if (!spot) return false;
      entity.pos.set(spot.x, spot.y, spot.z); entity.home.copy(entity.pos); entity.heading = random() * Math.PI * 2; entity.timer = 1;
      if (entity.placed) changed();
      return true;
    }
    function updateAnimals(dt) {
      for (const entity of entities) {
        if (entity.world !== currentWorld) continue;
        const fish = entity.kind === 'fish';
        // Removing a tank's water hides its fish until that water is restored.
        entity.mesh.visible = !fish || fishFits(entity.pos.x, entity.pos.y, entity.pos.z);
        if (!entity.mesh.visible) continue;
        if (fish && entity.age < FISH_GROWTH_SECONDS) {
          const oldAge = entity.age; entity.age = Math.min(FISH_GROWTH_SECONDS, entity.age + dt); entity.mesh.scale.setScalar(.55 + .45 * entity.age / FISH_GROWTH_SECONDS);
          if (Math.floor(oldAge / 10) !== Math.floor(entity.age / 10)) changed();
        }
        entity.timer -= dt; entity.phase += dt * 5;
        if (entity.timer <= 0) { entity.heading = Math.random() * Math.PI * 2; entity.timer = 1 + Math.random() * 4; }
        const speed = fish ? .5 : entity.kind === 'horse' ? .8 : .5, x = entity.pos.x + Math.sin(entity.heading) * dt * speed, z = entity.pos.z + Math.cos(entity.heading) * dt * speed;
        const y = fish ? entity.pos.y : groundSurface(x, z);
        const allowed = fish ? fishFits(x, y, z) : Math.abs(y - entity.pos.y) <= .35 && distance({ x, z }, entity.home) < 9 && landFits(x, y, z, entity.kind === 'horse' ? .48 : .25, entity.kind === 'horse' ? 2.2 : 1.4);
        if (allowed) { entity.pos.set(x, y, z); entity.stuck = Math.max(0, (entity.stuck || 0) - dt * 2); }
        else {
          entity.heading += Math.PI * .7; entity.timer = .5; entity.stuck = (entity.stuck || 0) + dt;
          // Boxed in by new blocks, on a ledge or far from home: hop to the nearest open spot.
          if (!fish && entity.stuck > STUCK_SECONDS) { unstick(entity); entity.boxed = 0; }
        }
        // Walled into a single block, an animal can still shuffle a little, which keeps
        // resetting the count above. Once a second, check it has a neighbouring block to go to.
        if (!fish && (entity.roomCheck = (entity.roomCheck || 0) - dt) <= 0) {
          entity.roomCheck = 1;
          entity.boxed = roomToWalk(entity) ? 0 : (entity.boxed || 0) + 1;
          if (entity.boxed > STUCK_SECONDS) { unstick(entity); entity.boxed = 0; }
        }
        for (let i = 0; i < entity.legs.length; i++) entity.legs[i].rotation.x = allowed ? Math.sin(entity.phase + (i % 2) * Math.PI) * .28 : 0;
        entity.mesh.position.copy(entity.pos); entity.mesh.rotation.y = entity.heading;
      }
    }
    function update(dt, controls = {}) { setWorld(); if (!active() || !finite(dt) || dt <= 0) return; dt = Math.min(dt, .05); playTime += dt; updateCar(dt, controls); updateConfetti(dt); updateBall(dt); updateAnimals(dt); updateFishing(dt); updateTea(dt, controls); }
    function serialize() {
      carPositions[currentWorld] = { x: car.pos.x, y: car.pos.y, z: car.pos.z, yaw: car.yaw };
      return { version: 1, score: { ...score }, catches: { ...catches }, cars: JSON.parse(JSON.stringify(carPositions)), animals: entities.filter(e => e.placed).map(e => ({ kind: e.kind, world: e.world, x: e.pos.x, y: e.pos.y, z: e.pos.z, ...(e.kind === 'fish' ? { age: e.age } : {}) })) };
    }
    function restore(data) {
      // Missing optional activities data is a valid legacy save, and must clear
      // animals from the previously open world rather than leak them into it.
      if (data == null) data = { version: 1, score: { campus: 0, hardcore: 0 }, cars: {}, animals: [] };
      if (!validateSerialized(data)) return false;
      for (let i = entities.length - 1; i >= 0; i--) if (entities[i].placed) { group.remove(entities[i].mesh); entities.splice(i, 1); }
      carPositions = {};
      for (const world of worlds) { score[world] = data.score[world]; catches[world] = data.catches?.[world] || 0; const p = data.cars[world]; if (p && inBounds(p.x, p.z)) carPositions[world] = { x: p.x, y: p.y, z: p.z, yaw: p.yaw }; }
      for (const p of data.animals) if (inBounds(p.x, p.z)) addAnimal(p.kind, p, p.world, true);
      const saved = carPositions[currentWorld], initial = currentWorld === 'campus' ? { x: 30, z: 60, yaw: 0 } : { x: 5, z: 24, yaw: 0 };
      const position = saved && landFits(saved.x, groundSurface(saved.x, saved.z), saved.z, 1.35, 1.7) ? saved : initial;
      car.pos.set(position.x, groundSurface(position.x, position.z), position.z); car.yaw = position.yaw; carGroup.position.copy(car.pos); carGroup.rotation.y = car.yaw;
      car.driving = false; car.speed = 0;
      unequipRod(); unequipTea(); confettiLife = 0; confetti.visible = false; resetBall(); return true;
    }
    function dispose() { scene.remove(group); const geometries = new Set(); group.traverse(node => { if (node.geometry) geometries.add(node.geometry); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); lineMaterial.dispose(); }
    setWorld();
    return { update, interact, getPrompt, isDriving: () => car.driving, equipRod, unequipRod, isFishing: () => rodSelected, equipTea, unequipTea, hasTea: () => tea.held, isSitting: () => tea.sitting,
      spawnAnimal, putAwayAimed, putAwayAll, placedCount, serialize, restore, setWorld, dispose,
      // Where the car and ball are now, so the menu's "Things to try" can stand the player beside them.
      spot: name => { setWorld(); return name === 'car' ? { x: car.pos.x, y: car.pos.y, z: car.pos.z, yaw: car.yaw } : name === 'ball' ? { x: ball.pos.x, y: ball.pos.y, z: ball.pos.z } : null; } };
  }
  root.MYNE_ACTIVITIES = Object.freeze({ create, validateSerialized });
})(globalThis);
